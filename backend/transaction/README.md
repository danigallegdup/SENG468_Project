# Transaction Services Container

curl.exe -X GET http://localhost:8080//authentication/


curl.exe -X POST http://localhost:8080/authentication/register \
     -H "Content-Type: application/json" \
     -d '{"user_name": "testuser", "password": "Test@123", "name": "Test User"}'



need to do:
1. Gateway
2. authentificatin through middleware

 curl.exe -X GET http://localhost:8080/transaction/ 

 curl.exe -X GET http://localhost:8080/transaction/walletTransactions

 curl.exe -X GET http://localhost:8080/transaction/stockTransactions

## Basic Test

curl.exe http://localhost:5000
🚀 Transaction Service is running...

curl.exe http://localhost:5000/walletTransactions
{"success":true,"message":"No wallet transactions available.","data":[]}

curl.exe http://localhost:5000/stockTransactions
{"success":true,"message":"No stock transactions available.","data":[]}
[]

## Transaction Services

transaction-service: directory

- /controllers :Handles business logic for requests
  - [stockController.js](./controllers/stockController.js)        :Manages stock operations
  - [walletController.js](./controllers/walletController.js)     :Manages wallet transactions
- /models :MongoDB schemas defining database structure
  - [StockTransaction.js](./models/StockTransaction.js):Schema for stock transactions
  - [WalletTransaction.js](./models/WalletTransaction.js):Schema for wallet transactions
- [index.js](./index.js): connects to database, imports models, calls controllers to fetch
