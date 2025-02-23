# Test Run 1 Submission

## How to Run the Project

```sh
docker-compose up --build
```

## How to Test

```sh
jmeter -n -t ./Sample_test_script.jmx -l results.log -e -o ./results/
```

## File Structure

backend :Root backend directory

- /config :Configuration and setup files
  - [clearDatabase.js](./backend/config/clearDatabase.js)      :Script to reset the database
  - [db.js](./backend/config/db.js)                            :MongoDB connection setup
  - [rabbitmq.js](./backend/config/rabbitmq.js)                :RabbitMQ messaging configuration
  - [redis.js](./backend/config/redis.js)                      :Redis caching configuration
- /consumers :RabbitMQ consumers for processing tasks
  - [orderConsumer.js](./backend/consumers/orderConsumer.js)    :Processes stock orders in the queue
- /controllers :Handles business logic for requests
  - [stockController.js](./backend/controllers/stockController.js)        :Manages stock operations
  - [stockManagementController.js](./backend/controllers/stockManagementController.js)        :Handles stock-related transactions
  - [walletController.js](./backend/controllers/walletController.js)     :Manages wallet transactions
- /middleware :Middleware for authentication and request validation
  - [authMiddleware.js](./backend/middleware/authMiddleware.js) :Protects routes with authentication
- /models :MongoDB schemas defining database structure
  - [Order.js](./backend/models/Order.js)                      :Schema for trade orders
  - [Stock.js](./backend/models/Stock.js)                      :Schema for stock details
  - [StockTransaction.js](./backend/models/StockTransaction.js):Schema for stock transactions
  - [User.js](./backend/models/User.js)                        :Schema for user accounts
  - [UserHeldStock.js](./backend/models/UserHeldStock.js)      :Schema for stocks held by users
  - [Wallet.js](./backend/models/Wallet.js)                    :Schema for user wallets
  - [WalletTransaction.js](./backend/models/WalletTransaction.js):Schema for wallet transactions
- /routes :Express route handlers for API endpoints
  - [authRoutes.js](./backend/routes/authRoutes.js)            :Routes for user authentication
  - [stockRoutes.js](./backend/routes/stockRoutes.js)          :Routes for retrieving stock data
  - [walletRoutes.js](./backend/routes/walletRoutes.js)        :Routes for wallet operations
- /services :Core business logic for stock trading
  - [matchingService.js](./backend/services/matchingService.js):Implements stock matching algorithm
  - [orderService.js](./backend/services/orderService.js)      :Processes trade orders

## API Overview Table

| Implementation Link | Method | Endpoint                  | Description                      | Team Member | Service               |
|---------------------|--------|---------------------------|----------------------------------|-------------|-----------------------|
| [authRoutes.js](backend/routes/authRoutes.js) | POST   | /register                 | Register a new user             | Tarek       | Auth Service          |
| [authRoutes.js](backend/routes/authRoutes.js) | POST   | /login                    | Log in a user                   | Ian         | Auth Service          |
| [walletRoutes.js](backend/routes/walletRoutes.js) | GET    | /getWalletBalance         | Retrieve wallet balance         | Tarek       | User Management       |
| [walletRoutes.js](backend/routes/walletRoutes.js) | GET    | /getStockPortfolio        | Retrieve stock portfolio        | Ian         | User Management       |
| [walletRoutes.js](backend/routes/walletRoutes.js) | GET    | /getWalletTransactions    | Retrieve wallet transactions    | Dani        | Transaction           |
| [walletRoutes.js](backend/routes/walletRoutes.js) | POST   | /addMoneyToWallet         | Add money to the wallet         | Tarek       | User Management       |
| [stockRoutes.js](backend/routes/stockRoutes.js) | GET    | /getStockPrices                | Retrieve stock prices           | Gabe        | Matching Engine       |
| [stockRoutes.js](backend/routes/stockRoutes.js) | GET    | /getStockTransactions     | Retrieve stock transactions     | Dani        | Transaction           |
| [stockRoutes.js](backend/routes/stockRoutes.js) | POST   | /placeStockOrder               | Place a stock order             | Lucas & Gabe | Order Service + Matching Engine |
| [stockRoutes.js](backend/routes/stockRoutes.js) | POST   | /cancelStockTransaction        | Cancel a stock transaction      | Lucas       | Order Service + Matching Engine |
| [stockRoutes.js](backend/routes/stockRoutes.js) | POST   | /createStock                   | Create a new stock              | Ian         | User Management       |
| [stockRoutes.js](backend/routes/stockRoutes.js) | POST   | /addStockToUser                | Assign stock to a user          | Ian         | User Management       |
