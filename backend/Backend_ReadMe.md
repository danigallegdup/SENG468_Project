# **Backend System Documentation**

## **Overview**

This backend system is built using **Node.js, Express, and MongoDB (via Mongoose ORM)**. The system is designed to handle **user authentication, wallet transactions, and stock transactions** while ensuring **scalability, modularity, and security**.

### **Current Status**

✅ **Bearbones API is up and running**  
❌ **Need to add data (database currently empty)**

---

## **How It Works**

### **1️⃣ Authentication & Authorization**

- Users register and log in to obtain a **JWT token**.
- The token is used in **authenticated requests** to access wallet and stock transactions.
- Token verification is done via `authMiddleware.js`.

### **2️⃣ Handling Transactions**

- The system provides **GET** routes for fetching **wallet transactions** and **stock transactions**.

- **Data storage:**
  - Temporary in-memory storage (`tempDatabase.js`) is used for testing.
  - Actual transactions will be stored in **MongoDB Atlas**.
- Transactions are **filtered per user** using their `userId`.

### **3️⃣ Why This Approach?**

✅ **Modular Design** - Each responsibility (routes, controllers, models, middleware) is separated for clarity and scalability.  
✅ **Security First** - JWT authentication ensures only authorized users can access sensitive data.  
✅ **Database Flexibility** - The system can run **without a database** (using `tempDatabase.js`) and switch to **MongoDB** seamlessly

---

## **File Structure & Descriptions**

```bash
backend/
├── config/                     # Configuration files
│   ├── db.js                   # MongoDB connection setup
│
├── controllers/                # Business logic for handling requests
│   ├── walletController.js      # Logic for wallet transactions
│   ├── stockController.js       # Logic for stock transactions
│
├── middleware/                  # Middleware for authentication
│   ├── authMiddleware.js        # JWT authentication middleware
│
├── models/                      # Mongoose schemas for MongoDB collections
│   ├── WalletTransaction.js     # Schema for wallet transactions
│   ├── StockTransaction.js      # Schema for stock transactions
│   ├── User.js                  # Schema for user authentication
│
├── routes/                      # Express routing definitions
│   ├── walletRoutes.js          # Routes for wallet transactions
│   ├── stockRoutes.js           # Routes for stock transactions
│   ├── authRoutes.js            # Routes for authentication
│
├── utils/                       # Utility functions
│   ├── tempDatabase.js          # Temporary in-memory transaction storage
│
├── .env                         # Environment variables (MongoDB URI, JWT Secret)
├── index.js                     # Main entry point, initializes the server
├── package.json                 # Dependencies and scripts
└── README.md                    # Project documentation
```

---

## **Key File Descriptions**

### **🔹 `index.js` (Main Server Entry Point)**

- Initializes the **Express server**.
- Connects to **MongoDB Atlas**.
- Loads routes (`walletRoutes`, `stockRoutes`, `authRoutes`).
- Uses middleware for **CORS, JSON parsing, and authentication**.

### **🔹 `config/db.js` (MongoDB Connection Setup)**

- Connects to **MongoDB Atlas** using the `MONGO_URI` from `.env`.
- Handles connection errors.

### **🔹 `middleware/authMiddleware.js` (JWT Authentication)**

- Extracts the **JWT token** from request headers.
- Verifies the token using `JWT_SECRET`.
- Attaches the authenticated user to the request object.

### **🔹 `controllers/walletController.js` & `stockController.js`**

- Fetch **user-specific transactions**.
- Sort results by **timestamp**.
- Log transaction retrieval for debugging.

### **🔹 `utils/tempDatabase.js` (Temporary In-Memory Storage)**

- Simulates a database using an **array of hardcoded transactions**
- Allows the system to **function without MongoDB**.

### **🔹 `routes/authRoutes.js` (User Authentication Routes)**

- **POST `/api/auth/login`** → User login (returns JWT token).
- **POST `/api/users`** → User registration.

### **🔹 `routes/walletRoutes.js` & `routes/stockRoutes.js`**

- **GET `/api/wallet/getWalletTransactions`** → Returns user’s wallet transactions.
- **GET `/api/stocks/getStockTransactions`** → Returns user’s stock transactions.

---

## **🔗 API Endpoints & Expected Responses**

### **1️⃣ Authentication API**

#### **🔹 Login (`POST /api/auth/login`)**

✅ **Request:**

```json
{
    "username": "testuser",
    "password": "password123"
}

```

✅ **Response:**

```json
{
    "success": true,
    "data": { "token": "your_jwt_token" }
}
```

### **2️⃣ Wallet Transactions API**

#### **🔹 Get Wallet Transactions (`GET /api/wallet/getWalletTransactions`)**

✅ **Response (If transactions exist):**

```json

{
    "success": true,
    "data": [
        {
            "_id": "wtx001",
            "userId": "user123",
            "amount": 500,
            "type": "deposit",
            "timeStamp": "2025-02-13T12:00:00.000Z"
        }
    ]
}
```

✅ **Response (If no transactions exist):**

```json

{
    "success": true,
    "message": "No transactions available.",
    "data": []
}
```

### **3️⃣ Stock Transactions API**

#### **🔹 Get Stock Transactions (`GET /api/stocks/getStockTransactions`)**

✅ **Response (If transactions exist):**

```json
{
    "success": true,
    "data": [
        {
            "_id": "stx001",
            "userId": "user123",
            "stockId": "AAPL",
            "isBuy": true,
            "orderType": "MARKET",
            "stockPrice": 150,
            "quantity": 10,
            "orderStatus": "COMPLETED",
            "timeStamp": "2025-02-13T12:00:00.000Z"
        }
    ]
}
```

---

## **Next Steps 🚀**

### **📌 What’s Working**

✅ API routes are correctly set up.  
✅ Authentication with JWT works.  
✅ Temporary data storage works independently.  

### **⚠️ What’s Missing**

❌ **Database is empty** → Need to insert test transactions in MongoDB.  
❌ **No POST routes to add transactions** → Need to implement adding transactions.

## Goal end of the day: get all test passing on the server
