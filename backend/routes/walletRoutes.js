/**
 * 
 * @route   GET /getWalletBalance
 * @route   GET /getStockPortfolio
 * @route   GET /getWalletTransactions
 * @route   POST /addMoneyToWallet
 */


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

/**
 * 
 * @api {get} /getStockPortfolio all wallet transactions for a user
    router.get('/getStockPortfolio', authMiddleware, walletController.addMoneyToWallet);
 * 
 * 
 */


module.exports = router;
