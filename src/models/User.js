const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  bankCode: {
    type: String,
    required: [true, 'Bank code is required'],
    enum: ['ALPHA', 'BETA']
  },
  bpiHandle: {
    type: String,
    required: [true, 'BPI handle is required'],
    unique: true,
    lowercase: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  privateKey: {
    type: String,
    required: true,
    select: false
  },
  isKYCVerified: {
    type: Boolean,
    default: false
  },
  balance: {
    type: Number,
    default: 10000
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
