const express = require('express');
const { sendMoney } = require('../controllers/bankController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/send', sendMoney);

module.exports = router;
