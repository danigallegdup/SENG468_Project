// routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const walletController = require('../controllers/walletController');

// Existing route for wallet transactions
router.get('/getWalletTransactions', authMiddleware, walletController.getWalletTransactions);

// New route: Retrieve Wallet Balance
router.get('/getWalletBalance', authMiddleware, walletController.getWalletBalance);

// New route: Add Money to Wallet
router.post('/addMoneyToWallet', authMiddleware, walletController.addMoneyToWallet);

module.exports = router;
