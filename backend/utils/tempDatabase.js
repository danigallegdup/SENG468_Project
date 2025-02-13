// utils/tempDatabase.js

const walletTransactions = [
    {
        _id: "wtx001",
        userId: "user123",
        amount: 500,
        type: "deposit",
        timeStamp: new Date().toISOString()
    },
    {
        _id: "wtx002",
        userId: "user123",
        amount: 200,
        type: "withdrawal",
        timeStamp: new Date().toISOString()
    }
];

const stockTransactions = [
    {
        _id: "stx001",
        userId: "user123",
        stockId: "AAPL",
        isBuy: true,
        orderType: "MARKET",
        stockPrice: 150,
        quantity: 10,
        orderStatus: "COMPLETED",
        timeStamp: new Date().toISOString()
    },
    {
        _id: "stx002",
        userId: "user123",
        stockId: "TSLA",
        isBuy: false,
        orderType: "LIMIT",
        stockPrice: 900,
        quantity: 5,
        orderStatus: "PENDING",
        timeStamp: new Date().toISOString()
    }
];

// Functions to interact with temporary storage
const getWalletTransactions = (userId) => {
    return walletTransactions.filter(tx => tx.userId === userId).sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));
};

const getStockTransactions = (userId) => {
    return stockTransactions.filter(tx => tx.userId === userId).sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));
};

module.exports = { getWalletTransactions, getStockTransactions };
