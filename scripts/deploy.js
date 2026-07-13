const { compileContracts } = require('./compile');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('🚀 Starting BPI Contract Deployment...\n');

  try {
    // Step 1: Compile contracts
    console.log('🔧 Compiling contracts...');
    await compileContracts();
    
    // Step 2: Check environment
    console.log('\n🔧 Checking environment...');
    
    if (!process.env.SEPOLIA_RPC_URL) {
      throw new Error('SEPOLIA_RPC_URL not found in .env file');
    }
    
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }
    
    console.log('✅ Environment variables found');
    
    // Step 3: Initialize provider and wallet
    console.log('\n📡 Connecting to Sepolia network...');
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`👤 Deployer address: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther('0.01')) {
      throw new Error('Insufficient balance. Need at least 0.01 ETH for deployment');
    }
    
    // Step 4: Load contract artifacts
    console.log('\n📄 Loading contract artifacts...');
    
    const artifactsDir = path.resolve(__dirname, '../artifacts');
    const BPITokenArtifact = JSON.parse(
      fs.readFileSync(path.join(artifactsDir, 'BPIToken.json'), 'utf8')
    );
    const BPIRegistryArtifact = JSON.parse(
      fs.readFileSync(path.join(artifactsDir, 'BPIRegistry.json'), 'utf8')
    );
    const BPIPaymentsArtifact = JSON.parse(
      fs.readFileSync(path.join(artifactsDir, 'BPIPayments.json'), 'utf8')
    );
    
    console.log('✅ Contract artifacts loaded');
    
    // Step 5: Deploy BPIToken
    console.log('\n📄 Deploying BPIToken...');
    const tokenFactory = new ethers.ContractFactory(
      BPITokenArtifact.abi,
      BPITokenArtifact.bytecode,
      wallet
    );
    
    const tokenContract = await tokenFactory.deploy(
      "BPI Test Token",
      "tINR", 
      wallet.address,
      ethers.parseUnits("100000000", 18), // 100M tokens
      { gasLimit: 3000000 }
    );
    
    await tokenContract.waitForDeployment();
    const tokenAddress = await tokenContract.getAddress();
    console.log(`✅ BPIToken deployed at: ${tokenAddress}`);
    
    // Step 6: Deploy BPIRegistry
    console.log('\n📄 Deploying BPIRegistry...');
    const registryFactory = new ethers.ContractFactory(
      BPIRegistryArtifact.abi,
      BPIRegistryArtifact.bytecode,
      wallet
    );
    
    const registryContract = await registryFactory.deploy(
      wallet.address,
      { gasLimit: 3000000 }
    );
    
    await registryContract.waitForDeployment();
    const registryAddress = await registryContract.getAddress();
    console.log(`✅ BPIRegistry deployed at: ${registryAddress}`);
    
    // Step 7: Deploy BPIPayments
    console.log('\n📄 Deploying BPIPayments...');
    const paymentsFactory = new ethers.ContractFactory(
      BPIPaymentsArtifact.abi,
      BPIPaymentsArtifact.bytecode,
      wallet
    );
    
    const paymentsContract = await paymentsFactory.deploy(
      tokenAddress,
      registryAddress,
      wallet.address,
      wallet.address, // Fee recipient
      { gasLimit: 4000000 }
    );
    
    await paymentsContract.waitForDeployment();
    const paymentsAddress = await paymentsContract.getAddress();
    console.log(`✅ BPIPayments deployed at: ${paymentsAddress}`);
    
    // Step 8: Setup demo banks
    console.log('\n🏦 Setting up demo banks...');
    
    const banks = [
      { code: 'ALPHA', name: 'DemoBank Alpha' },
      { code: 'BETA', name: 'DemoBank Beta' }
    ];
    
    for (const bank of banks) {
      console.log(`   Registering ${bank.name}...`);
      const tx = await registryContract.registerBank(
        bank.code,
        bank.name,
        wallet.address, // Treasury address
        { gasLimit: 200000 }
      );
      await tx.wait();
      console.log(`   ✅ ${bank.name} registered`);
    }
    
    // Step 9: Create demo users
    console.log('\n👥 Creating demo users...');
    
    const demoUsers = [];
    const users = [
      { handle: 'alice', bankCode: 'ALPHA' },
      { handle: 'bob', bankCode: 'BETA' }
    ];
    
    for (const user of users) {
      console.log(`   Creating ${user.handle}@${user.bankCode.toLowerCase()}...`);
      
      // Generate random wallet for demo user
      const userWallet = ethers.Wallet.createRandom();
      const initialBalance = ethers.parseUnits("10000", 18); // 10K tokens
      
      // Register handle
      const registerTx = await registryContract.registerHandle(
        user.handle,
        user.bankCode,
        userWallet.address,
        { gasLimit: 300000 }
      );
      await registerTx.wait();
      
      // Mint tokens
      const mintTx = await tokenContract.mint(
        userWallet.address,
        initialBalance,
        { gasLimit: 200000 }
      );
      await mintTx.wait();
      
      console.log(`   ✅ User created: ${user.handle}@${user.bankCode.toLowerCase()}`);
      console.log(`   📍 Address: ${userWallet.address}`);
      console.log(`   💰 Balance: 10,000 tINR`);
      
      demoUsers.push({
        handle: `${user.handle}@${user.bankCode.toLowerCase()}`,
        address: userWallet.address,
        privateKey: userWallet.privateKey
      });
    }
    
    // Step 10: Save deployment info
    console.log('\n💾 Saving deployment information...');
    
    const deploymentInfo = {
      network: 'sepolia',
      chainId: 11155111,
      deployedAt: new Date().toISOString(),
      deployer: wallet.address,
      contracts: {
        BPIToken: tokenAddress,
        BPIRegistry: registryAddress,
        BPIPayments: paymentsAddress
      },
      demoUsers: demoUsers
    };
    
    // Save deployment.json
    fs.writeFileSync(
      path.resolve(__dirname, '../deployment.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Create .env.deployment
    const envContent = `
# BPI Contract Addresses - Deployed ${deploymentInfo.deployedAt}
BPI_TOKEN_ADDRESS=${tokenAddress}
BPI_REGISTRY_ADDRESS=${registryAddress}
BPI_PAYMENTS_ADDRESS=${paymentsAddress}

# Demo Users (FOR TESTING ONLY)
DEMO_ALICE_ADDRESS=${demoUsers[0].address}
DEMO_ALICE_PRIVATE_KEY=${demoUsers[0].privateKey}
DEMO_BOB_ADDRESS=${demoUsers[1].address}
DEMO_BOB_PRIVATE_KEY=${demoUsers[1].privateKey}
`.trim();
    
    fs.writeFileSync(path.resolve(__dirname, '../.env.deployment'), envContent);
    
    console.log('✅ Deployment info saved');
    
    // Step 11: Verification
    console.log('\n🔍 Verifying deployment...');
    
    const tokenName = await tokenContract.name();
    const totalSupply = await tokenContract.totalSupply();
    const aliceBalance = await tokenContract.balanceOf(demoUsers[0].address);
    
    console.log(`   Token: ${tokenName} (${await tokenContract.symbol()})`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)}`);
    console.log(`   Alice Balance: ${ethers.formatUnits(aliceBalance, 18)} tINR`);
    
    console.log('\n🎉 Deployment Completed Successfully!');
    console.log('\n📋 Contract Addresses:');
    console.log(`   BPIToken: ${tokenAddress}`);
    console.log(`   BPIRegistry: ${registryAddress}`);
    console.log(`   BPIPayments: ${paymentsAddress}`);
    
    console.log('\n🔗 View on Etherscan:');
    console.log(`   https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log(`   https://sepolia.etherscan.io/address/${registryAddress}`);
    console.log(`   https://sepolia.etherscan.io/address/${paymentsAddress}`);
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Copy contract addresses to your main .env file');
    console.log('   2. Start your backend: npm run dev');
    console.log('   3. Test the API endpoints');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();
