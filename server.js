const app = require('./src/app');
const { PORT } = require('./src/config/env');
const logger = require('./src/utils/logger');

const server = app.listen(PORT, () => {
  logger.info(`🚀 BPI Backend Server running on port ${PORT}`);
  
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
