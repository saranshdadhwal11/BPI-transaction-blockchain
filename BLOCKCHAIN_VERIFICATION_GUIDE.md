# Transaction Blockchain Verification Guide

## Overview
This guide explains how to verify that each transaction is creating a blockchain block in your BPI application.

## What Changed

### 1. **Enhanced Transaction Recording**
When a transaction is processed, the backend now captures:
- ✅ **blockNumber** - The block in which the transaction was included
- ✅ **gasUsed** - Gas consumed by the transaction
- ✅ **gasPrice** - Gas price paid
- ✅ **transactionHash** - Hash of the transaction

### 2. **New Verification Endpoint**
A new endpoint has been added to verify transaction details:

**Endpoint:** `GET /api/payment/verify/:transactionHash`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "blockchain": {
      "transactionHash": "0x123...",
      "blockNumber": 12345678,
      "blockHash": "0xabc...",
      "confirmations": 15,
      "gasUsed": "21000",
      "gasPrice": "20000000000",
      "from": "0x...",
      "to": "0x...",
      "value": "10",
      "status": "Success",
      "timestamp": 1234567890,
      "blockTimestamp": "2026-02-09T10:30:00.000Z"
    },
    "database": {
      "id": "xyz...",
      "fromHandle": "john@BANK1",
      "toHandle": "jane@BANK2",
      "amount": 10,
      "status": "completed",
      "type": "send",
      "createdAt": "2026-02-09T10:29:00.000Z"
    },
    "verification": {
      "isConfirmed": true,
      "confirmations": 15,
      "minConfirmationsRequired": 1,
      "isFullyConfirmed": true,
      "explorerUrl": "https://sepolia.etherscan.io/tx/0x123..."
    }
  }
}
```

## Methods to Verify Transactions

### Method 1: Check Database Block Number
The transaction list now includes the block number:

```bash
curl -X GET "http://localhost:5000/api/payment/transactions?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

Each transaction will show:
```json
{
  "id": "transaction-id",
  "hash": "0x123...",
  "blockNumber": 12345678,  // ← Block number the transaction is in
  "amount": 100,
  "status": "completed",
  ...
}
```

**What this means:**
- If `blockNumber` exists and is a number → ✅ Transaction is on blockchain
- If `blockNumber` is null → ⚠️ Transaction pending or not mined

### Method 2: Use Verification Endpoint
Get detailed blockchain verification:

```bash
curl -X GET "http://localhost:5000/api/payment/verify/0x123abc...def" \
  -H "Authorization: Bearer <token>"
```

**Key fields to check:**
- `blockchain.status` → "Success" means transaction executed successfully
- `blockchain.blockNumber` → Which block contains this transaction
- `verification.confirmations` → How many blocks have been mined since
- `verification.isFullyConfirmed` → True if 12+ confirmations (final confirmation)

### Method 3: Check Etherscan (Manual Verification)
Each transaction response includes an Etherscan explorer link:

```
https://sepolia.etherscan.io/tx/0xYOUR_TRANSACTION_HASH
```

Steps:
1. Copy the transaction hash from the response
2. Paste into the URL above
3. You'll see:
   - ✅ Block number where transaction is confirmed
   - ✅ Transaction status (Success/Failed)
   - ✅ Gas used
   - ✅ Full transaction details

### Method 4: Monitor Logs
The backend logs every successful transaction:

```
INFO: Transaction 0x123... included in block 12345678
```

Check logs (in `bpi-backend/logs/` or console) to confirm transactions are being mined.

## Understanding Confirmations

**Confirmation Levels:**

| Confirmations | Status | Meaning |
|---|---|---|
| 0 | ⏳ Pending | Transaction in mempool, not yet mined |
| 1-11 | ✅ Confirmed | Transaction in blockchain, but not final |
| 12+ | ✅✅ Final | Transaction is permanent, won't be reversed |

**For testing on Sepolia:**
- Usually takes 12-20 seconds per block
- After 1-2 minutes, you'll have 12+ confirmations = final

## Complete Verification Flow

1. **Send transaction** → Get `transactionHash`
2. **Check database** → Use `/transactions` to see if `blockNumber` is populated
3. **Verify on blockchain** → Call `/verify/:transactionHash` endpoint
4. **Check Etherscan** → Paste hash into https://sepolia.etherscan.io/tx/HASH
5. **Confirm status** → Should show "Success" and block number

## Example: Full Verification Process

```bash
# Step 1: Send payment (example response)
# Response includes: "hash": "0xabc123def456..."

# Step 2: Check transactions
curl -X GET "http://localhost:5000/api/payment/transactions" \
  -H "Authorization: Bearer <token>"

# Response shows:
# {
#   "hash": "0xabc123def456...",
#   "blockNumber": 12345678,
#   "status": "completed"
# }

# Step 3: Verify on-chain details
curl -X GET "http://localhost:5000/api/payment/verify/0xabc123def456..." \
  -H "Authorization: Bearer <token>"

# Response shows:
# {
#   "blockchain": {
#     "blockNumber": 12345678,
#     "confirmations": 25,
#     "status": "Success"
#   },
#   "verification": {
#     "isFullyConfirmed": true,
#     "explorerUrl": "https://sepolia.etherscan.io/tx/0xabc123def456..."
#   }
# }

# Step 4: Visit Etherscan
# https://sepolia.etherscan.io/tx/0xabc123def456...
# Shows complete confirmed transaction on block 12345678
```

## Troubleshooting

### "Transaction not found on blockchain"
- Wait 15-20 seconds (Sepolia block time)
- Check the transaction hash is correct
- Verify the wallet has enough ETH for gas

### blockNumber is null in database
- Transaction is still pending
- Either wait a few seconds or there may be a gas issue
- Check wallet balance for gas

### Status shows "Failed"
- Transaction was mined but execution reverted
- Check sender balance, allowances, or contract conditions
- Look at Etherscan "Error" tab for details

## API Integration Example

```javascript
// Frontend: Verify a transaction
async function verifyTransaction(hash) {
  const response = await fetch(`/api/payment/verify/${hash}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  if (data.data.verification.isFullyConfirmed) {
    console.log('✅ Transaction is permanently confirmed!');
    console.log(`Block: ${data.data.blockchain.blockNumber}`);
    console.log(`Confirmations: ${data.data.verification.confirmations}`);
  }
}
```

## Summary

✅ **Each transaction creates a blockchain block when:**
1. `blockNumber` is populated in database
2. `/verify` endpoint shows block number and confirmations > 0
3. Etherscan shows the transaction in a specific block

This proves the transaction is on the immutable blockchain ledger.
