// routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const { getWalletTransactions } = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');

// Wallet Transactions Route
router.get('/getWalletTransactions', authMiddleware, getWalletTransactions);

module.exports = router;
