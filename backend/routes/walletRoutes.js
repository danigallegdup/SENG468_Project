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

router.get('/getWalletTransactions', authMiddleware, walletController.getWalletTransactions);
router.get('/getWalletBalance', authMiddleware, walletController.getWalletBalance);
router.post('/addMoneyToWallet', authMiddleware, walletController.addMoneyToWallet);
router.post('/updateWallet', authMiddleware, walletController.updateWallet);

/**
 * 
 * @api {get} /getStockPortfolio all wallet transactions for a user
    router.get('/getStockPortfolio', authMiddleware, walletController.addMoneyToWallet);
 * 
 * 
 */


module.exports = router;
