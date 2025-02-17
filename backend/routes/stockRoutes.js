// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const stockController = require('../controllers/stockController');
const stockManagementController = require('../controllers/stockManagementController');

router.use(authMiddleware);

router.get('/getStockTransactions', stockController.getStockTransactions);

router.post('/createStock', stockManagementController.createStock);

router.get('/getStockPortfolio', stockManagementController.getStockPortfolio);

router.post('/addStockToUser', stockManagementController.addStockToUser);

module.exports = router;
