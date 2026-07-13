const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  treasuryAddress: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registeredOnChain: {
    type: Boolean,
    default: false
  },
  totalUsers: {
    type: Number,
    default: 0
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bank', bankSchema);
