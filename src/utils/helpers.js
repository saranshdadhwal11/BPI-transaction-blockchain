const crypto = require('crypto');
const { ethers } = require('ethers');

const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const hashString = (input) => {
  return crypto.createHash('sha256').update(input).digest('hex');
};

const isValidEthereumAddress = (address) => {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
};

const formatBPIHandle = (username, bankCode) => {
  return `${username.toLowerCase()}@${bankCode.toLowerCase()}`;
};

const parseBPIHandle = (handle) => {
  const parts = handle.split('@');
  if (parts.length !== 2) {
    throw new Error('Invalid BPI handle format');
  }

  return {
    username: parts[0],
    bankCode: parts[1].toUpperCase()
  };
};

const toWei = (amount) => {
  return ethers.parseUnits(amount.toString(), 18).toString();
};

const fromWei = (wei) => {
  return parseFloat(ethers.formatUnits(wei, 18));
};

const isValidTransactionHash = (hash) => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const formatCurrency = (amount, currency = '₹') => {
  return `${currency}${amount.toLocaleString('en-IN')}`;
};

const paginate = async (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const total = await query.model.countDocuments(query.getQuery());
  const results = await query.skip(skip).limit(limit);

  return {
    data: results,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  generateRandomString,
  hashString,
  isValidEthereumAddress,
  formatBPIHandle,
  parseBPIHandle,
  toWei,
  fromWei,
  isValidTransactionHash,
  sleep,
  formatCurrency,
  paginate,
  isValidEmail
};
