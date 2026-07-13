const { ethers } = require('ethers');
const config = require('./env');
const logger = require('../utils/logger');

const BPIRegistryABI = require('../../artifacts/BPIRegistry.json');
const BPITokenABI = require('../../artifacts/BPIToken.json');
const BPIPaymentsABI = require('../../artifacts/BPIPayments.json');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contracts = {};
  }

  async initializeBlockchain() {
    try {
      this.provider = new ethers.JsonRpcProvider(config.SEPOLIA_RPC_URL);
      if (config.PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);
        logger.info(`🔗 Wallet connected: ${this.wallet.address}`);
      }
      await this.initializeContracts();
      
      logger.info('⛓️  Blockchain service initialized successfully');
    } catch (error) {
      logger.error(`Blockchain initialization error: ${error.message}`);
      throw error;
    }
  }

  async initializeContracts() {
    const { CONTRACT_ADDRESSES } = config;
    
    if (CONTRACT_ADDRESSES.BPI_REGISTRY) {
      this.contracts.registry = new ethers.Contract(
        CONTRACT_ADDRESSES.BPI_REGISTRY,
        BPIRegistryABI.abi,
        this.wallet || this.provider
      );
    }

    if (CONTRACT_ADDRESSES.BPI_TOKEN) {
      this.contracts.token = new ethers.Contract(
        CONTRACT_ADDRESSES.BPI_TOKEN,
        BPITokenABI.abi,
        this.wallet || this.provider
      );
    }

    if (CONTRACT_ADDRESSES.BPI_PAYMENTS) {
      this.contracts.payments = new ethers.Contract(
        CONTRACT_ADDRESSES.BPI_PAYMENTS,
        BPIPaymentsABI.abi,
        this.wallet || this.provider
      );
    }
  }

  getContract(name) {
    return this.contracts[name];
  }

  getProvider() {
    return this.provider;
  }

  getWallet() {
    return this.wallet;
  }
}

const blockchainService = new BlockchainService();

module.exports = {
  initializeBlockchain: () => blockchainService.initializeBlockchain(),
  getBlockchainService: () => blockchainService
};
