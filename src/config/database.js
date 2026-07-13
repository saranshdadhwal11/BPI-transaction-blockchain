const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);

    logger.info(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    logger.warn('Server continuing without database. Auth and payment features will not work until MongoDB is connected.');
  }
};

mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error(`Mongoose connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected');
});

module.exports = connectDB;
