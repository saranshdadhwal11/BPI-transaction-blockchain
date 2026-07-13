const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

class JWTService {
  constructor() {
    this.accessTokenExpiry = config.JWT_ACCESS_EXPIRE || '15m';
    this.refreshTokenExpiry = config.JWT_REFRESH_EXPIRE || '7d';
    this.rememberMeExpiry = config.JWT_REMEMBER_EXPIRE || '30d';
    this.algorithm = config.JWT_ALGORITHM || 'HS256';
    this.issuer = config.JWT_ISSUER || 'bpi-platform';
    this.audience = config.JWT_AUDIENCE || 'bpi-users';
  }

  generateAccessToken(payload, options = {}) {
    const tokenPayload = {
      ...payload,
      type: 'access',
      jti: crypto.randomUUID(),
    };

    const tokenOptions = {
      expiresIn: options.rememberMe ? this.rememberMeExpiry : this.accessTokenExpiry,
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience,
      
    };

    return jwt.sign(tokenPayload, config.JWT_SECRET, tokenOptions);
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(payload, options = {}) {
    const tokenPayload = {
      userId: payload.userId || payload.id,
      type: 'refresh',
      jti: crypto.randomUUID(),
    };

    const tokenOptions = {
      expiresIn: this.refreshTokenExpiry,
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience,
      
    };

    return jwt.sign(tokenPayload, config.JWT_SECRET, tokenOptions);
  }

  generateTokenPair(payload, options = {}) {
    const accessToken = this.generateAccessToken(payload, options);
    const refreshToken = this.generateRefreshToken(payload, options);

    return {
      accessToken,
      refreshToken,
      expiresIn: options.rememberMe ? this.rememberMeExpiry : this.accessTokenExpiry
    };
  }

  verifyToken(token, options = {}) {
    try {
      const verifyOptions = {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
        
      };

      const decoded = jwt.verify(token, config.JWT_SECRET, verifyOptions);
      if (!decoded.jti) {
        throw new Error('Token missing JTI claim');
      }

      return {
        valid: true,
        decoded,
        expired: false
      };
    } catch (error) {
      logger.warn(`JWT verification failed: ${error.message}`);
      
      return {
        valid: false,
        decoded: null,
        expired: error.name === 'TokenExpiredError',
        error: error.message
      };
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error(`JWT decode failed: ${error.message}`);
      return null;
    }
  }

  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    if (decoded && decoded.payload.exp) {
      return new Date(decoded.payload.exp * 1000);
    }
    return null;
  }

  isTokenNearExpiry(token, bufferMinutes = 5) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    
    const now = new Date();
    const bufferTime = bufferMinutes * 60 * 1000;
    return (expiration.getTime() - now.getTime()) < bufferTime;
  }

  async refreshAccessToken(refreshToken, userPayload) {
    const verification = this.verifyToken(refreshToken);
    
    if (!verification.valid) {
      throw new Error('Invalid refresh token');
    }

    if (verification.decoded.type !== 'refresh') {
      throw new Error('Token is not a refresh token');
    }
    return this.generateAccessToken(userPayload);
  }
}

module.exports = new JWTService();


