const jwtService = require('../services/jwtService');
const User = require('../models/User');
const { ethers } = require('ethers');
const { formatBPIHandle, generateRandomString } = require('../utils/helpers');
const logger = require('../utils/logger');

exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const user = await User.findOne({ email, isActive: true }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    const userPayload = {
      id: user._id,
      email: user.email,
      bpiHandle: user.bpiHandle,
      bankCode: user.bankCode
    };
    const tokens = jwtService.generateTokenPair(userPayload, { rememberMe });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          bpiHandle: user.bpiHandle,
          bankCode: user.bankCode,
          balance: user.balance
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    const verification = jwtService.verifyToken(refreshToken);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    const user = await User.findById(verification.decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    const userPayload = {
      id: user._id,
      email: user.email,
      bpiHandle: user.bpiHandle,
      bankCode: user.bankCode
    };

    const accessToken = jwtService.generateAccessToken(userPayload);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        expiresIn: '15m'
      }
    });
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, bankCode } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    const wallet = ethers.Wallet.createRandom();
    const randomSuffix = generateRandomString(4);
    const bpiHandle = formatBPIHandle(`${name.replace(/\s+/g, '').toLowerCase()}${randomSuffix}`, bankCode);
    const existingHandle = await User.findOne({ bpiHandle });
    if (existingHandle) {
      return res.status(400).json({
        success: false,
        message: 'Generated BPI handle is not available'
      });
    }
    const user = await User.create({
      name,
      email,
      password,
      bpiHandle,
      bankCode,
      walletAddress: wallet.address,
      privateKey: wallet.privateKey,
      balance: 0
    });
    const userPayload = {
      id: user._id,
      email: user.email,
      bpiHandle: user.bpiHandle,
      bankCode: user.bankCode
    };
    const tokens = jwtService.generateTokenPair(userPayload);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          bpiHandle: user.bpiHandle,
          bankCode: user.bankCode,
          balance: user.balance
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          bpiHandle: user.bpiHandle,
          bankCode: user.bankCode,
          balance: user.balance
        }
      }
    });
  } catch (error) {
    logger.error(`Get me error: ${error.message}`);
    next(error);
  }
};
