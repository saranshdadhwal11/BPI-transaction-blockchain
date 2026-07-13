const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { ethers } = require('ethers');
const mongoose = require('mongoose');
const User = require('../src/models/User');

const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/bpi-backend',
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY
};

const ETH_PER_USER = ethers.parseEther('0.005');

const handleArg = process.argv[2];

async function fundGas() {
  if (!config.PRIVATE_KEY || !config.SEPOLIA_RPC_URL) {
    console.error('Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(config.MONGODB_URI);
    const provider = new ethers.JsonRpcProvider(config.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Funding wallet: ${wallet.address}`);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH\n`);

    const query = { isActive: true };
    if (handleArg) {
      query.bpiHandle = handleArg.toLowerCase();
      console.log(`Funding single user: ${handleArg}\n`);
    }
    const users = await User.find(query).select('name email bpiHandle walletAddress');
    if (users.length === 0) {
      console.log(handleArg ? `No user found with handle: ${handleArg}` : 'No active users found.');
      process.exit(0);
    }

    const totalRequired = ETH_PER_USER * BigInt(users.length);
    if (balance < totalRequired) {
      console.error(`Insufficient balance. Need ${ethers.formatEther(totalRequired)} ETH for ${users.length} users.`);
      console.error('Fund the wallet from a Sepolia faucet: https://sepoliafaucet.com/ or https://www.alchemy.com/faucets/ethereum-sepolia');
      process.exit(1);
    }

    for (const user of users) {
      const tx = await wallet.sendTransaction({
        to: user.walletAddress,
        value: ETH_PER_USER
      });
      console.log(`Sent 0.005 ETH to ${user.bpiHandle} (${user.walletAddress}) - tx: ${tx.hash}`);
      await tx.wait();
    }

    console.log(`\nFunded ${users.length} user(s) with gas. They can now send token payments.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fundGas();
