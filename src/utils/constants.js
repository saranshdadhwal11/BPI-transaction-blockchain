const BANK_CODES = {
  ALPHA: 'ALPHA',
  BETA: 'BETA'
};

const TRANSACTION_TYPES = {
  SEND: 'send',
  REQUEST: 'request',
  APPROVE: 'approve'
};

const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// User roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  BANK_ADMIN: 'bank_admin'
};

const RESPONSE_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden access',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  EMAIL_EXISTS: 'Email already exists',
  HANDLE_EXISTS: 'Handle already exists',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_HANDLE: 'Invalid BPI handle',
  PAYMENT_SUCCESS: 'Payment sent successfully',
  REQUEST_SUCCESS: 'Payment request sent successfully'
};

const NETWORKS = {
  SEPOLIA: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  GOERLI: {
    name: 'Goerli',
    chainId: 5,
    rpcUrl: 'https://goerli.infura.io/v3/',
    blockExplorer: 'https://goerli.etherscan.io'
  }
};

const GAS_LIMITS = {
  TRANSFER: 21000,
  CONTRACT_CALL: 100000,
  CONTRACT_DEPLOYMENT: 2000000
};

const RATE_LIMITS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000,
    max: 5
  },
  API: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  PAYMENT: {
    windowMs: 1 * 60 * 1000,
    max: 10
  }
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
};

const JWT_SETTINGS = {
  EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN: '30d'
};

const EMAIL_SETTINGS = {
  FROM_NAME: 'BPI Support',
  FROM_EMAIL: 'noreply@bpi.com'
};

const SOCKET_EVENTS = {
  PAYMENT_SENT: 'paymentSent',
  PAYMENT_RECEIVED: 'paymentReceived',
  PAYMENT_REQUESTED: 'paymentRequested',
  PAYMENT_APPROVED: 'paymentApproved',
  BALANCE_UPDATED: 'balanceUpdated',
  TRANSACTION_STATUS_UPDATED: 'transactionStatusUpdated'
};

module.exports = {
  BANK_CODES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  USER_ROLES,
  RESPONSE_MESSAGES,
  NETWORKS,
  GAS_LIMITS,
  RATE_LIMITS,
  PAGINATION,
  UPLOAD_LIMITS,
  JWT_SETTINGS,
  EMAIL_SETTINGS,
  SOCKET_EVENTS
};
