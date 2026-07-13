const { getBlockchainService } = require('../config/blockchain');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const logger = require('../utils/logger');
const { fromWei } = require('../utils/helpers');
const notificationService = require('./notificationService');

class IndexerService {
  constructor() {
    this.isRunning = false;
    this.blockchainService = getBlockchainService();
    this.lastProcessedBlock = 0;
  }

  /**
   * Start the indexer service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Indexer service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting blockchain indexer service...');

    try {
      // Get current block number
      const provider = this.blockchainService.getProvider();
      const currentBlock = await provider.getBlockNumber();
      this.lastProcessedBlock = currentBlock;

      // Start listening for events
      this.setupEventListeners();
      
      // Start periodic sync
      this.startPeriodicSync();

      logger.info(`Indexer service started, current block: ${currentBlock}`);
    } catch (error) {
      logger.error(`Failed to start indexer service: ${error.message}`);
      this.isRunning = false;
    }
  }

  /**
   * Stop the indexer service
   */
  stop() {
    this.isRunning = false;
    logger.info('Indexer service stopped');
  }

  /**
   * Setup blockchain event listeners
   */
  setupEventListeners() {
    const tokenContract = this.blockchainService.getContract('token');
    const registryContract = this.blockchainService.getContract('registry');
    const paymentsContract = this.blockchainService.getContract('payments');

    if (tokenContract) {
      // Listen for Transfer events
      tokenContract.on('Transfer', this.handleTransferEvent.bind(this));
      logger.info('Token Transfer event listener setup');
    }

    if (registryContract) {
      // Listen for HandleRegistered events
      registryContract.on('HandleRegistered', this.handleHandleRegisteredEvent.bind(this));
      logger.info('Registry HandleRegistered event listener setup');
    }

    if (paymentsContract) {
      // Listen for PaymentSent events
      paymentsContract.on('PaymentSent', this.handlePaymentSentEvent.bind(this));
      logger.info('Payments PaymentSent event listener setup');
    }
  }

  /**
   * Handle Transfer events from token contract
   * @param {string} from - Sender address
   * @param {string} to - Recipient address
   * @param {BigNumber} value - Transfer amount
   * @param {object} event - Event object
   */
  async handleTransferEvent(from, to, value, event) {
    try {
      logger.info(`Transfer event detected: ${from} -> ${to}, Amount: ${fromWei(value.toString())}`);

      // Find corresponding transaction in database
      const transaction = await Transaction.findOne({
        transactionHash: event.transactionHash
      });

      if (transaction) {
        // Update transaction with blockchain data
        transaction.status = 'completed';
        transaction.blockNumber = event.blockNumber;
        transaction.gasUsed = event.gasUsed?.toString();
        await transaction.save();

        // Send notifications
        const fromUser = await User.findOne({ walletAddress: from });
        const toUser = await User.findOne({ walletAddress: to });

        if (fromUser) {
          await notificationService.sendTransactionConfirmation(transaction, fromUser, 'sent');
        }

        if (toUser) {
          await notificationService.sendTransactionConfirmation(transaction, toUser, 'received');
          await notificationService.sendPaymentNotification(transaction, toUser);
        }

        logger.info(`Transaction ${event.transactionHash} processed successfully`);
      }
    } catch (error) {
      logger.error(`Error handling Transfer event: ${error.message}`);
    }
  }

  /**
   * Handle HandleRegistered events from registry contract
   * @param {string} username - Username
   * @param {string} bankCode - Bank code
   * @param {string} walletAddress - Wallet address
   * @param {object} event - Event object
   */
  async handleHandleRegisteredEvent(username, bankCode, walletAddress, event) {
    try {
      const handle = `${username}@${bankCode.toLowerCase()}`;
      logger.info(`Handle registered event: ${handle} -> ${walletAddress}`);

      // Update user record with on-chain registration
      await User.findOneAndUpdate(
        { bpiHandle: handle },
        { 
          registeredOnChain: true,
          registrationTxHash: event.transactionHash
        }
      );

      logger.info(`Handle ${handle} registration processed`);
    } catch (error) {
      logger.error(`Error handling HandleRegistered event: ${error.message}`);
    }
  }

  /**
   * Handle PaymentSent events from payments contract
   * @param {string} from - Sender handle
   * @param {string} to - Recipient handle
   * @param {BigNumber} amount - Payment amount
   * @param {string} memo - Payment memo
   * @param {object} event - Event object
   */
  async handlePaymentSentEvent(from, to, amount, memo, event) {
    try {
      logger.info(`Payment sent event: ${from} -> ${to}, Amount: ${fromWei(amount.toString())}`);

      // Create or update transaction record
      await Transaction.findOneAndUpdate(
        { transactionHash: event.transactionHash },
        {
          fromHandle: from,
          toHandle: to,
          amount: fromWei(amount.toString()),
          memo: memo || null,
          status: 'completed',
          blockNumber: event.blockNumber,
          type: 'send'
        },
        { upsert: true, new: true }
      );

      logger.info(`Payment ${event.transactionHash} processed`);
    } catch (error) {
      logger.error(`Error handling PaymentSent event: ${error.message}`);
    }
  }

  /**
   * Start periodic sync to catch missed events
   */
  startPeriodicSync() {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.syncMissedEvents();
      } catch (error) {
        logger.error(`Periodic sync error: ${error.message}`);
      }
    }, 60000); // Sync every minute
  }

  /**
   * Sync missed events from blockchain
   */
  async syncMissedEvents() {
    try {
      const provider = this.blockchainService.getProvider();
      const currentBlock = await provider.getBlockNumber();
      
      if (currentBlock > this.lastProcessedBlock) {
        logger.info(`Syncing blocks ${this.lastProcessedBlock + 1} to ${currentBlock}`);
        
        // Query events for missed blocks
        const tokenContract = this.blockchainService.getContract('token');
        
        if (tokenContract) {
          const filter = tokenContract.filters.Transfer();
          const events = await tokenContract.queryFilter(
            filter,
            this.lastProcessedBlock + 1,
            currentBlock
          );

          for (const event of events) {
            await this.handleTransferEvent(
              event.args[0],
              event.args[1],
              event.args[2],
              event
            );
          }
        }

        this.lastProcessedBlock = currentBlock;
      }
    } catch (error) {
      logger.error(`Sync missed events error: ${error.message}`);
    }
  }

  /**
   * Get indexer status
   * @returns {object} Indexer status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastProcessedBlock: this.lastProcessedBlock,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new IndexerService();
