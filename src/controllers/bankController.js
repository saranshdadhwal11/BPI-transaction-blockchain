const logger = require('../utils/logger');

exports.sendMoney = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Bank money transfer not implemented yet'
    });
  } catch (error) {
    logger.error(`Bank send money error: ${error.message}`);
    next(error);
  }
};
