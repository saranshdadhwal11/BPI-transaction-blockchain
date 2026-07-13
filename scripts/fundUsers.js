const path = require('path')
const mongoose = require('mongoose')
const { ethers } = require('ethers')

const User = require('../src/models/User')
const BPITokenArtifact = require('../artifacts/BPIToken.json')

require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

async function fundUsers() {
  try {
    console.log('💰 Funding user accounts (DB + on-chain)...\n')

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bpi-backend')
    console.log('✅ Connected to MongoDB')

    // Query ALL users (requirement). Optionally filter by handle.
    const query = {}
    const handleArg = process.argv[2]
    if (handleArg) {
      query.bpiHandle = handleArg.toLowerCase()
      console.log(` Funding single user: ${handleArg}`)
    }

    const users = await User.find(query).select('name bpiHandle walletAddress')
    console.log(`ℹ️ Found ${users.length} user(s) to fund`)

    if (users.length === 0) {
      console.log('Nothing to fund. Exiting.')
      process.exit(0)
    }

    // Mint token amount: UI balance uses tokenContract.balanceOf(walletAddress) with 18 decimals
    const amount = 10000
    const amountInWei = ethers.parseUnits(amount.toString(), 18)

    // Blockchain config (.env in this folder)
    const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
    const PRIVATE_KEY = process.env.PRIVATE_KEY
    const tokenAddress = process.env.BPI_TOKEN_ADDRESS

    if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
      throw new Error('Missing SEPOLIA_RPC_URL or PRIVATE_KEY in ../.env')
    }
    if (!tokenAddress) {
      throw new Error('Missing BPI_TOKEN_ADDRESS in ../.env')
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const token = new ethers.Contract(tokenAddress, BPITokenArtifact.abi, wallet)

    let mintedCount = 0
    for (const user of users) {
      // Mint on-chain for each user
      const tx = await token.mint(user.walletAddress, amountInWei)
      await tx.wait()

      mintedCount += 1
      console.log(`✅ Minted ${amount} to ${user.bpiHandle} (${user.walletAddress}) tx=${tx.hash}`)
    }

    // Also update DB balance field (some parts may use it)
    const updated = await User.updateMany(query, { $set: { balance: amount } })

    console.log(`\n✅ Minted for ${mintedCount}/${users.length} user(s)`) 
    console.log(`✅ Updated DB balance for matched=${updated.matchedCount} modified=${updated.modifiedCount}`)

    // Show current users (DB)
    const showUsers = await User.find(query).select('name bpiHandle balance')
    console.log('\n👥 Current Users (DB balance):')
    showUsers.forEach((user) => {
      console.log(`   ${user.name} (${user.bpiHandle}): ₹${user.balance.toLocaleString()}`)
    })

    console.log('\n🎉 Funding completed. UI balance uses on-chain balanceOf, so it should now show the minted amount.')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error funding users:', error)
    process.exit(1)
  }
}

fundUsers()

