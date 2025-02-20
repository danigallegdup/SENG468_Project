# SENG468_Project

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

---

## Important links

- [Logbook](https://docs.google.com/document/d/1xYXMoz9LNA_vwVlQsgifg6b646PLg4U8BO-y8zszh6I/edit?usp=sharing) : Next one due January 27th

- [Reports](https://docs.google.com/document/d/14vhKMh3iT3FeVTXIK1BBEGvfbifLjwMe0yo4wCOuHrA/edit?usp=sharing) : Next one due January 31st 5%

- [Test Run 1 Single User](./Documents/Project_Overview1.pdf) due Febuary 15th 10%
  
- [Project Overview](./Documents/Project_Overview1.pdfDocuments\Project_Overview1.pdf) for Reference

# File Structure

## Backend
/backend: Root backend directory of the Day Trading App.
/backend/config: Contains configuration files for MongoDB database, Redis Caching, and RabbitMQ messaging.
/backend/consumers: Contains asychronous RabbitMQ consumers for processing orders.
/backend/models: Contains MongoDB schemas for storing users, stocks, orders, and transactions.
/backend/routes: Contains Express route files for API endpoints.
/backend/services: Contains services for processing ordes, handling transactions, and matching stocks.
