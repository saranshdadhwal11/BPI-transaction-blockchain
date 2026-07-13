const { ethers } = require('ethers');
const { getBlockchainService } = require('../config/blockchain');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const logger = require('../utils/logger');
const { toWei, fromWei } = require('../utils/helpers');

class BlockchainServiceClass {
  constructor() {
    this.blockchainService = getBlockchainService();
  }

  /**
   * Transfer tokens between addresses
   * @param {string} fromPrivateKey - Sender's private key
   * @param {string} toAddress - Recipient's address
   * @param {number} amount - Amount to transfer
   * @returns {object} Transaction result
   */
  async transferTokens(fromPrivateKey, toAddress, amount) {
    try {
      const provider = this.blockchainService.getProvider();
      const senderWallet = new ethers.Wallet(fromPrivateKey, provider);
      const tokenContract = this.blockchainService.getContract('token');
      
      if (!tokenContract) {
        throw new Error('Token contract not available');
      }

      // Connect contract with sender wallet
      const senderTokenContract = tokenContract.connect(senderWallet);
      
      // Convert amount to Wei
      const amountInWei = toWei(amount);
      
      // Execute transfer
      const tx = await senderTokenContract.transfer(toAddress, amountInWei);
      const receipt = await tx.wait();
      
      logger.info(`Token transfer successful: ${tx.hash}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice.toString()
      };
    } catch (error) {
      logger.error(`Token transfer failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get token balance for an address
   * @param {string} address - Wallet address
   * @returns {number} Token balance
   */
  async getTokenBalance(address) {
    try {
      const tokenContract = this.blockchainService.getContract('token');
      
      if (!tokenContract) {
        throw new Error('Token contract not available');
      }

      const balance = await tokenContract.balanceOf(address);
      return fromWei(balance.toString());
    } catch (error) {
      logger.error(`Failed to get token balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register handle on blockchain
   * @param {string} username - Username
   * @param {string} bankCode - Bank code
   * @param {string} walletAddress - Wallet address
   * @returns {object} Transaction result
   */
  async registerHandle(username, bankCode, walletAddress) {
    try {
      const registryContract = this.blockchainService.getContract('registry');
      const wallet = this.blockchainService.getWallet();
      
      if (!registryContract || !wallet) {
        throw new Error('Registry contract or wallet not available');
      }

      // Connect contract with wallet
      const connectedContract = registryContract.connect(wallet);
      
      // Register handle
      const tx = await connectedContract.registerHandle(
        username,
        bankCode,
        walletAddress
      );
      const receipt = await tx.wait();
      
      logger.info(`Handle registered on-chain: ${username}@${bankCode.toLowerCase()}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error(`Handle registration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve handle to wallet address
   * @param {string} handle - BPI handle
   * @returns {string} Wallet address
   */
  async resolveHandle(handle) {
    try {
      const registryContract = this.blockchainService.getContract('registry');
      
      if (!registryContract) {
        throw new Error('Registry contract not available');
      }

      const [username, bankCode] = handle.split('@');
      const address = await registryContract.resolveHandle(username, bankCode.toUpperCase());
      
      return address;
    } catch (error) {
      logger.error(`Handle resolution failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Mint tokens to an address (for testing)
   * @param {string} toAddress - Recipient address
   * @param {number} amount - Amount to mint
   * @returns {object} Transaction result
   */
  async mintTokens(toAddress, amount) {
    try {
      const tokenContract = this.blockchainService.getContract('token');
      const wallet = this.blockchainService.getWallet();
      
      if (!tokenContract || !wallet) {
        throw new Error('Token contract or wallet not available');
      }

      // Connect contract with wallet
      const connectedContract = tokenContract.connect(wallet);
      
      // Mint tokens
      const amountInWei = toWei(amount);
      const tx = await connectedContract.mint(toAddress, amountInWei);
      const receipt = await tx.wait();
      
      logger.info(`Tokens minted: ${amount} to ${toAddress}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error(`Token minting failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen for blockchain events
   */
  startEventListener() {
    try {
      const tokenContract = this.blockchainService.getContract('token');
      const paymentsContract = this.blockchainService.getContract('payments');
      
      if (tokenContract) {
        // Listen for Transfer events
        tokenContract.on('Transfer', async (from, to, value, event) => {
          logger.info(`Transfer event: ${from} -> ${to}, Amount: ${fromWei(value.toString())}`);
          
          // Update transaction status in database
          await this.updateTransactionStatus(event.transactionHash, 'completed');
        });
      }

      if (paymentsContract) {
        // Listen for Payment events
        paymentsContract.on('PaymentSent', async (from, to, amount, memo, event) => {
          logger.info(`Payment event: ${from} -> ${to}, Amount: ${fromWei(amount.toString())}`);
        });
      }

      logger.info('Blockchain event listeners started');
    } catch (error) {
      logger.error(`Failed to start event listeners: ${error.message}`);
    }
  }

  /**
   * Update transaction status in database
   * @param {string} transactionHash - Transaction hash
   * @param {string} status - New status
   */
  async updateTransactionStatus(transactionHash, status) {
    try {
      await Transaction.findOneAndUpdate(
        { transactionHash },
        { status },
        { new: true }
      );
      
      logger.info(`Transaction status updated: ${transactionHash} -> ${status}`);
    } catch (error) {
      logger.error(`Failed to update transaction status: ${error.message}`);
    }
  }
}

module.exports = new BlockchainServiceClass();
