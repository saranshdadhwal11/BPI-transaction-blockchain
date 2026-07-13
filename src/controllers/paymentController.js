const { ethers } = require('ethers');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getBlockchainService } = require('../config/blockchain');
const logger = require('../utils/logger');

exports.sendPayment = async (req, res, next) => {
  try {
    const { recipientHandle, amount, memo = '' } = req.body;
    const senderUser = req.user;
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    const blockchainService = getBlockchainService();
    const tokenContract = blockchainService.getContract('token');

    if (!tokenContract) {
      return res.status(500).json({
        success: false,
        message: 'Blockchain service unavailable'
      });
    }

    const senderBalance = await tokenContract.balanceOf(senderUser.walletAddress);
    const senderBalanceFormatted = parseFloat(ethers.formatUnits(senderBalance, 18));

    if (amount > senderBalanceFormatted) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    const recipient = await User.findOne({ 
      bpiHandle: recipientHandle.toLowerCase(),
      isActive: true 
    });
    
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    const paymentsContract = blockchainService.getContract('payments');

    if (!paymentsContract) {
      return res.status(500).json({
        success: false,
        message: 'Blockchain service unavailable'
      });
    }
    const senderWallet = new ethers.Wallet(
      senderUser.privateKey,
      blockchainService.getProvider()
    );
    const senderTokenContract = tokenContract.connect(senderWallet);
    const amountInWei = ethers.parseUnits(amount.toString(), 18);
    const tx = await senderTokenContract.transfer(
      recipient.walletAddress,
      amountInWei
    );
    
    // Capture receipt with block information
    const receipt = await tx.wait();
    
    logger.info(`Transaction ${tx.hash} included in block ${receipt.blockNumber}`);

    await User.findByIdAndUpdate(senderUser.id, {
      $inc: { balance: -amount }
    });
    
    await User.findByIdAndUpdate(recipient._id, {
      $inc: { balance: amount }
    });
    const transaction = await Transaction.create({
      transactionHash: tx.hash,
      fromHandle: senderUser.bpiHandle,
      toHandle: recipient.bpiHandle,
      fromAddress: senderUser.walletAddress,
      toAddress: recipient.walletAddress,
      amount,
      memo: memo || null,
      status: 'completed',
      type: 'send',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.gasPrice.toString()
    });
    req.io.emit('paymentSent', {
      transactionId: transaction._id,
      from: senderUser.bpiHandle,
      to: recipient.bpiHandle,
      amount,
      hash: tx.hash
    });

    res.status(200).json({
      success: true,
      message: 'Payment sent successfully',
      data: {
        transaction: {
          id: transaction._id,
          hash: tx.hash,
          from: senderUser.bpiHandle,
          to: recipient.bpiHandle,
          amount,
          memo: memo || null,
          status: 'completed'
        }
      }
    });
  } catch (error) {
    logger.error(`Send payment error: ${error.message}`);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        success: false,
        message: 'Not enough native ETH in your wallet to pay for gas. On testnet (Sepolia), get free testnet ETH from a faucet and send it to your wallet address, then try again.'
      });
    }
    next(error);
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const user = req.user;
    const query = {
      $or: [
        { fromHandle: user.bpiHandle },
        { toHandle: user.bpiHandle }
      ]
    };

    if (type) query.type = type;
    if (status) query.status = status;
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    const transactionsWithDirection = transactions.map(tx => ({
      id: tx._id.toString(),
      hash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      createdAt: tx.createdAt,
      fromHandle: tx.fromHandle,
      toHandle: tx.toHandle,
      amount: tx.amount,
      status: tx.status,
      type: tx.type,
      expiresAt: tx.expiresAt,
      direction: tx.fromHandle === user.bpiHandle ? 'sent' : 'received'
    }));
    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions: transactionsWithDirection,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error(`Get transactions error: ${error.message}`);
    next(error);
  }
};

exports.requestPayment = async (req, res, next) => {
  try {
    const { fromHandle, amount, memo = '', expirationHours = 24 } = req.body;
    const requester = req.user;
    const fromUser = await User.findOne({
      bpiHandle: fromHandle.toLowerCase(),
      isActive: true
    });

    if (!fromUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);
    const request = await Transaction.create({
      transactionHash: `request-${Date.now()}-${Math.random()}`,
      fromHandle: fromUser.bpiHandle,
      toHandle: requester.bpiHandle,
      fromAddress: fromUser.walletAddress,
      toAddress: requester.walletAddress,
      amount,
      memo: memo || null,
      status: 'pending',
      type: 'request',
      expiresAt
    });
    req.io.emit('paymentRequested', {
      requestId: request._id,
      from: requester.bpiHandle,
      to: fromUser.bpiHandle,
      amount,
      memo,
      expiresAt
    });

    res.status(200).json({
      success: true,
      message: 'Payment request sent successfully',
      data: {
        request: {
          id: request._id,
          from: fromUser.bpiHandle,
          to: requester.bpiHandle,
          amount,
          memo: memo || null,
          status: 'pending',
          expiresAt
        }
      }
    });
  } catch (error) {
    logger.error(`Request payment error: ${error.message}`);
    next(error);
  }
};

exports.fulfillRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const user = req.user;
    const request = await Transaction.findOne({
      _id: requestId,
      fromHandle: user.bpiHandle,
      type: 'request',
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found or not pending'
      });
    }
    if (request.expiresAt && new Date() > request.expiresAt) {
      await Transaction.findByIdAndUpdate(requestId, { status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'Payment request has expired'
      });
    }
    const blockchainService = getBlockchainService();
    const tokenContract = blockchainService.getContract('token');

    if (!tokenContract) {
      return res.status(500).json({
        success: false,
        message: 'Blockchain service unavailable'
      });
    }

    const senderBalance = await tokenContract.balanceOf(user.walletAddress);
    const senderBalanceFormatted = parseFloat(ethers.formatUnits(senderBalance, 18));

    if (request.amount > senderBalanceFormatted) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    const recipient = await User.findOne({
      bpiHandle: request.toHandle,
      isActive: true
    });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    const senderWallet = new ethers.Wallet(
      user.privateKey,
      blockchainService.getProvider()
    );

    const senderTokenContract = tokenContract.connect(senderWallet);
    const amountInWei = ethers.parseUnits(request.amount.toString(), 18);

    const tx = await senderTokenContract.transfer(
      recipient.walletAddress,
      amountInWei
    );

    // Capture receipt with block information
    const receipt = await tx.wait();
    
    logger.info(`Transaction ${tx.hash} included in block ${receipt.blockNumber}`);

    await User.findByIdAndUpdate(user.id, {
      $inc: { balance: -request.amount }
    });

    await User.findByIdAndUpdate(recipient._id, {
      $inc: { balance: request.amount }
    });
    await Transaction.findByIdAndUpdate(requestId, {
      status: 'completed',
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.gasPrice.toString()
    });
    req.io.emit('paymentFulfilled', {
      requestId,
      from: user.bpiHandle,
      to: recipient.bpiHandle,
      amount: request.amount,
      hash: tx.hash
    });

    res.status(200).json({
      success: true,
      message: 'Payment request fulfilled successfully',
      data: {
        transaction: {
          id: requestId,
          hash: tx.hash,
          from: user.bpiHandle,
          to: recipient.bpiHandle,
          amount: request.amount,
          status: 'completed'
        }
      }
    });
  } catch (error) {
    logger.error(`Fulfill request error: ${error.message}`);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        success: false,
        message: 'Not enough native ETH in your wallet to pay for gas. On testnet (Sepolia), get free testnet ETH from a faucet and send it to your wallet address, then try again.'
      });
    }
    next(error);
  }
};

exports.declineRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const user = req.user;
    const request = await Transaction.findOneAndUpdate(
      {
        _id: requestId,
        fromHandle: user.bpiHandle,
        type: 'request',
        status: 'pending'
      },
      { status: 'declined' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found or not pending'
      });
    }
    req.io.emit('paymentDeclined', {
      requestId,
      from: user.bpiHandle,
      to: request.toHandle,
      amount: request.amount
    });

    res.status(200).json({
      success: true,
      message: 'Payment request declined successfully'
    });
  } catch (error) {
    logger.error(`Decline request error: ${error.message}`);
    next(error);
  }
};

exports.getBalance = async (req, res, next) => {
  try {
    const user = req.user;
    const blockchainService = getBlockchainService();
    const tokenContract = blockchainService.getContract('token');

    if (!tokenContract) {
      return res.status(500).json({
        success: false,
        message: 'Blockchain service unavailable'
      });
    }

    const blockchainBalance = await tokenContract.balanceOf(user.walletAddress);
    const balance = parseFloat(ethers.formatUnits(blockchainBalance, 18));

    res.status(200).json({
      success: true,
      data: {
        balance,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    logger.error(`Get balance error: ${error.message}`);
    next(error);
  }
};
/**
 * Verify transaction on blockchain
 * Returns block information, confirmations, and blockchain details
 */
exports.verifyTransaction = async (req, res, next) => {
  try {
    const { transactionHash } = req.params;
    const blockchainService = getBlockchainService();
    const provider = blockchainService.getProvider();

    if (!provider) {
      return res.status(500).json({
        success: false,
        message: 'Blockchain service unavailable'
      });
    }

    // Get transaction receipt from blockchain
    const receipt = await provider.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found on blockchain'
      });
    }

    // Get the transaction itself
    const transaction = await provider.getTransaction(transactionHash);
    
    // Get current block number to calculate confirmations
    const currentBlockNumber = await provider.getBlockNumber();
    const confirmations = currentBlockNumber - receipt.blockNumber;

    // Get block details
    const block = await provider.getBlock(receipt.blockNumber);

    // Database record
    const dbTransaction = await Transaction.findOne({ transactionHash });

    logger.info(`Transaction ${transactionHash} verified - Block: ${receipt.blockNumber}, Confirmations: ${confirmations}`);

    res.status(200).json({
      success: true,
      data: {
        // Blockchain verification
        blockchain: {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          confirmations,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: transaction.gasPrice.toString(),
          from: transaction.from,
          to: transaction.to,
          value: ethers.formatUnits(transaction.value, 18),
          status: receipt.status === 1 ? 'Success' : 'Failed',
          timestamp: block.timestamp,
          blockTimestamp: new Date(block.timestamp * 1000).toISOString()
        },
        // Database record
        database: dbTransaction ? {
          id: dbTransaction._id,
          fromHandle: dbTransaction.fromHandle,
          toHandle: dbTransaction.toHandle,
          amount: dbTransaction.amount,
          status: dbTransaction.status,
          type: dbTransaction.type,
          createdAt: dbTransaction.createdAt
        } : null,
        // Verification summary
        verification: {
          isConfirmed: confirmations > 0,
          confirmations,
          minConfirmationsRequired: 1,
          isFullyConfirmed: confirmations >= 12, // ~3 minutes on Ethereum
          explorerUrl: `https://sepolia.etherscan.io/tx/${transactionHash}`
        }
      }
    });
  } catch (error) {
    logger.error(`Verify transaction error: ${error.message}`);
    next(error);
  }
};