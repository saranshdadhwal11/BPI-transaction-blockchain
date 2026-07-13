const Joi = require('joi');
const logger = require('../utils/logger');

const schemas = {
  registration: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
    bankCode: Joi.string().valid('ALPHA', 'BETA').required().messages({
      'any.only': 'Bank code must be either ALPHA or BETA',
      'any.required': 'Bank code is required'
    }),
    preferredHandle: Joi.string().alphanum().min(3).max(20).optional().messages({
      'string.alphanum': 'Handle can only contain letters and numbers',
      'string.min': 'Handle must be at least 3 characters long',
      'string.max': 'Handle cannot exceed 20 characters',
      'any.required': 'Preferred handle is required'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  payment: Joi.object({
    recipientHandle: Joi.string().pattern(/^[a-z0-9]+@(alpha|beta)$/).required().messages({
      'string.pattern.base': 'Recipient handle must be in format: username@bank',
      'any.required': 'Recipient handle is required'
    }),
    amount: Joi.number().positive().max(1000000).required().messages({
      'number.positive': 'Amount must be greater than 0',
      'number.max': 'Amount cannot exceed 1,000,000',
      'any.required': 'Amount is required'
    }),
    memo: Joi.string().max(200).optional().messages({
      'string.max': 'Memo cannot exceed 200 characters'
    })
  }),

  paymentRequest: Joi.object({
    fromHandle: Joi.string().pattern(/^[a-z0-9]+@(alpha|beta)$/).required().messages({
      'string.pattern.base': 'From handle must be in format: username@bank',
      'any.required': 'From handle is required'
    }),
    amount: Joi.number().positive().max(1000000).required().messages({
      'number.positive': 'Amount must be greater than 0',
      'number.max': 'Amount cannot exceed 1,000,000',
      'any.required': 'Amount is required'
    }),
    memo: Joi.string().max(200).optional().messages({
      'string.max': 'Memo cannot exceed 200 characters'
    })
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.error(`Validation schema '${schemaName}' not found`);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn(`Validation failed for ${schemaName}:`, errors);
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

module.exports = {
  validateRegistration: validate('registration'),
  validateLogin: validate('login'),
  validatePayment: validate('payment'),
  validatePaymentRequest: validate('paymentRequest')
};

