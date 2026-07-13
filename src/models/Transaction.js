const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  fromHandle: {
    type: String,
    required: true
  },
  toHandle: {
    type: String,
    required: true
  },
  fromAddress: {
    type: String,
    required: true
  },
  toAddress: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  memoHash: {
    type: String,
    default: null
  },
  memo: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  blockNumber: {
    type: Number,
    default: null
  },
  gasUsed: {
    type: String,
    default: null
  },
  gasPrice: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['send', 'request', 'approve'],
    required: true
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

transactionSchema.index({ fromHandle: 1, createdAt: -1 });
transactionSchema.index({ toHandle: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
