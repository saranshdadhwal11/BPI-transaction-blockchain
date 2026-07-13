const express = require('express');
const {
  sendPayment,
  requestPayment,
  fulfillRequest,
  declineRequest,
  getTransactions,
  getBalance,
  verifyTransaction
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { validatePayment, validatePaymentRequest } = require('../middleware/validation');

const router = express.Router();

router.use(protect);

router.post('/send', validatePayment, sendPayment);
router.post('/request', validatePaymentRequest, requestPayment);
router.post('/request/:requestId/fulfill', fulfillRequest);
router.post('/request/:requestId/decline', declineRequest);
router.get('/transactions', getTransactions);
router.get('/balance', getBalance);
router.get('/verify/:transactionHash', verifyTransaction);

module.exports = router;
