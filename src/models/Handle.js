const mongoose = require('mongoose');

const handleSchema = new mongoose.Schema({
  handle: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[a-z0-9]+@(alpha|beta)$/
  },
  username: {
    type: String,
    required: true,
    lowercase: true
  },
  bankCode: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['ALPHA', 'BETA']
  },
  walletAddress: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  transactionHash: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

handleSchema.index({ handle: 1 });
handleSchema.index({ walletAddress: 1 });
handleSchema.index({ userId: 1 });
handleSchema.index({ bankCode: 1, username: 1 });

module.exports = mongoose.model('Handle', handleSchema);
