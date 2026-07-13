require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/bpi-backend',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  CONTRACT_ADDRESSES: {
    BPI_REGISTRY: process.env.BPI_REGISTRY_ADDRESS || '',
    BPI_TOKEN: process.env.BPI_TOKEN_ADDRESS || '',
    BPI_PAYMENTS: process.env.BPI_PAYMENTS_ADDRESS || ''
  },
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://bpi-brown.vercel.app',
  FRONTEND_URLS: (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'https://bpi-brown.vercel.app,http://localhost:3000,http://127.0.0.1:3000')
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || ''
};
