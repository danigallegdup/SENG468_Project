# Transaction Services Container
note: Need to fix expects the .env file to be on the same directory as 


## Basic Test

curl.exe http://localhost:5000
🚀 Transaction Service is running...

curl.exe http://localhost:5000/api/walletTransactions
{"success":true,"message":"No wallet transactions available.","data":[]}

curl.exe http://localhost:5000/api/stockTransactions
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
