// routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const walletController = require('../controllers/walletController');

router.get('/getWalletTransactions', authMiddleware, walletController.getWalletTransactions);

router.get('/getWalletBalance', authMiddleware, walletController.getWalletBalance);

router.post('/addMoneyToWallet', authMiddleware, walletController.addMoneyToWallet);

module.exports = router;
