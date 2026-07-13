#!/usr/bin/env node

/**
 * Transaction Verification Testing Script
 * 
 * This script demonstrates how to verify transactions on the blockchain.
 * 
 * Usage:
 * node verify-transaction.js <transactionHash> <jwtToken>
 */

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node verify-transaction.js <transactionHash> <jwtToken>');
  console.log('');
  console.log('Example:');
  console.log('  node verify-transaction.js 0xabc123... eyJhbGciOiJIUzI1NiIs...');
  process.exit(1);
}

const [transactionHash, jwtToken] = args;
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Format block explorer URL
 */
function getExplorerUrl(hash) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

/**
 * Display transaction verification results
 */
async function verifyTransaction() {
  try {
    console.log('🔍 Verifying transaction on blockchain...\n');
    console.log(`   Hash: ${transactionHash}`);
    console.log(`   Network: Sepolia Testnet`);
    console.log('');

    // Call verification endpoint
    const response = await fetch(
      `${API_BASE_URL}/api/payment/verify/${transactionHash}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('❌ Verification failed:', data.message);
      process.exit(1);
    }

    const { blockchain, verification, database } = data.data;

    // Display blockchain info
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 BLOCKCHAIN INFORMATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Status:              ${blockchain.status === 'Success' ? '✅' : '❌'} ${blockchain.status}`);
    console.log(`Block Number:        ${blockchain.blockNumber}`);
    console.log(`Block Hash:          ${blockchain.blockHash.substring(0, 20)}...`);
    console.log(`Confirmations:       ${verification.confirmations}`);
    console.log(`Gas Used:            ${blockchain.gasUsed} wei`);
    console.log(`Gas Price:           ${blockchain.gasPrice} wei`);
    console.log(`From:                ${blockchain.from}`);
    console.log(`To:                  ${blockchain.to}`);
    console.log(`Value:               ${blockchain.value} tokens`);
    console.log(`Timestamp:           ${blockchain.blockTimestamp}`);
    console.log('');

    // Display verification status
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION STATUS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Is Confirmed:        ${verification.isConfirmed ? '✅ YES' : '❌ NO'}`);
    console.log(`Is Fully Confirmed:  ${verification.isFullyConfirmed ? '✅ YES (12+ blocks)' : '⏳ PENDING'}`);
    console.log(`Min Confirmations:   ${verification.minConfirmationsRequired}`);
    console.log(`Actual Confirmations: ${verification.confirmations}`);
    console.log('');

    // Display database info if available
    if (database) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('💾 DATABASE RECORD');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`From Handle:         ${database.fromHandle}`);
      console.log(`To Handle:           ${database.toHandle}`);
      console.log(`Amount:              ${database.amount}`);
      console.log(`Type:                ${database.type}`);
      console.log(`DB Status:           ${database.status}`);
      console.log(`Created:             ${database.createdAt}`);
      console.log('');
    }

    // Display explorer link
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔗 EXPLORER LINK');
    console.log('═══════════════════════════════════════════════════════');
    console.log(verification.explorerUrl);
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    if (verification.isFullyConfirmed) {
      console.log('✅ Transaction is PERMANENTLY CONFIRMED on the blockchain');
      console.log(`   Included in block: ${blockchain.blockNumber}`);
      console.log(`   With ${verification.confirmations} confirmations`);
    } else if (verification.isConfirmed) {
      console.log('⏳ Transaction is CONFIRMED but needs more confirmations');
      console.log(`   Included in block: ${blockchain.blockNumber}`);
      console.log(`   Current confirmations: ${verification.confirmations}/12`);
    } else {
      console.log('❌ Transaction is NOT YET CONFIRMED');
      console.log('   It may still be in the mempool or processing');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyTransaction();

/**
 * CONVENIENCE FUNCTIONS FOR TESTING
 * 
 * Copy these into your Node.js scripts or browser console to test:
 */

/**
 * Example 1: Verify from Node.js
 * 
 * const hash = '0xabc123...';
 * const token = 'eyJhbGc...';
 * 
 * fetch('http://localhost:5000/api/payment/verify/' + hash, {
 *   headers: { 'Authorization': 'Bearer ' + token }
 * })
 * .then(r => r.json())
 * .then(d => {
 *   console.log('Block:', d.data.blockchain.blockNumber);
 *   console.log('Confirmations:', d.data.verification.confirmations);
 *   console.log('Status:', d.data.blockchain.status);
 * });
 */

/**
 * Example 2: Get all transactions
 * 
 * const token = 'eyJhbGc...';
 * 
 * fetch('http://localhost:5000/api/payment/transactions', {
 *   headers: { 'Authorization': 'Bearer ' + token }
 * })
 * .then(r => r.json())
 * .then(d => {
 *   d.data.transactions.forEach(tx => {
 *     console.log(`${tx.id}: Block ${tx.blockNumber || 'PENDING'}`);
 *   });
 * });
 */

/**
 * Example 3: Monitor transaction
 * 
 * const hash = '0xabc123...';
 * const token = 'eyJhbGc...';
 * 
 * async function monitor() {
 *   let once = true;
 *   const interval = setInterval(async () => {
 *     const r = await fetch('http://localhost:5000/api/payment/verify/' + hash, {
 *       headers: { 'Authorization': 'Bearer ' + token }
 *     });
 *     const d = await r.json();
 *     
 *     if (once && d.data.blockchain) {
 *       console.log('✅ Transaction confirmed in block:', d.data.blockchain.blockNumber);
 *       once = false;
 *     }
 *     
 *     console.log('Confirmations:', d.data.verification.confirmations);
 *     
 *     if (d.data.verification.isFullyConfirmed) {
 *       console.log('🎉 Transaction fully confirmed!');
 *       clearInterval(interval);
 *     }
 *   }, 5000); // Check every 5 seconds
 * }
 * 
 * monitor();
 */
