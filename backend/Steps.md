# **Backend Preparation**

1. **MongoDB Setup**:
   - Ensure MongoDB Atlas is configured correctly.
   - Use the provided schema for collections:
     - `Users Collection`: For user details.
     - `Wallets Collection`: For balance and transactions.
     - `Stocks Collection`: For stock information.
     - `Orders Collection`: For buy/sell transactions.
     - `Transactions Collection`: For wallet-related activities.

2. **APIs to Implement**:
   Build the following endpoints using Express.js:
   - `/register`: For company and user registration.
   - `/login`: For authentication and generating JWT tokens.
   - `/createStock`: For companies to create stocks.
   - `/addStockToUser`: To allocate stocks to a company or user.
   - `/getStockPortfolio`: To view owned stocks and their quantities.
   - `/placeStockOrder`: To handle buy/sell operations (market and limit).
   - `/addMoneyToWallet`: To add funds to a wallet.
   - `/getWalletBalance`: To view wallet balance.
   - `/getStockTransactions`: To fetch transaction history.
   - `/getWalletTransactions`: To fetch wallet-related transactions.

   Use **JWT authentication** to secure endpoints.

3. **Redis Integration**:
   - Use Redis for caching frequently accessed data, such as stock prices and open orders, to reduce database load during the test.

4. **Matching Engine**:
   - Implement the Redis-based matching engine for buy/sell operations.
   - Use FIFO rules for fulfilling orders and handle partial matches.
   - Track the status of orders (`IN_PROGRESS`, `COMPLETED`, `PARTIALLY_COMPLETE`, `CANCELLED`).

5. **Circuit Breaker Implementation**:
   - Add Circuit Breaker logic to fail gracefully under pressure using libraries like **Resilience4j** or a custom solution in Node.js.

6. **Testing Framework**:
   - Use **Postman** or **JMeter** for API testing. Create test cases that align with the Single User Test scenarios.

---

## **Single User Test Setup**

1. **Environment Configuration**:

   - Use Docker to containerize services:
     - API Gateway
     - Auth Service
     - User Management Service
     - Transaction Service
     - Order Management Service
     - Matching Engine
   - Use Docker Compose to define service dependencies, including MongoDB and Redis.

2. **Sequential Test Flow**:
   Based on the provided **Single User Test** cases:
   - Start with user registration and authentication.
   - Add wallet balance and create stocks for a company.
   - Simulate buy/sell orders from different users.
   - Validate portfolio and transaction consistency.
   - Test error scenarios (e.g., insufficient balance, exceeding stock quantity).
   - Cancel partially completed transactions and validate results.

3. **Monitoring and Logs**:
   - Use **Datadog** or similar tools for real-time monitoring and logging.
   - Log requests and responses for every API call during the test.

---

### **Code Structure for Scalability**

Follow a modular microservices architecture:

1. **Auth Service**
   Handles JWT-based authentication.
2. **User Management Service**:
   Manages user profiles, wallets, and stock portfolios.
3. **Transaction Service**:
   Handles financial transactions and logs them.
4. **Order Management Service**:
   Processes buy/sell orders and communicates with the Matching Engine.
5. **Matching Engine**:
   Matches buy and sell orders using Redis.

---

### **Key Deliverables for Submission**

1. **Code**:
   - Ensure all services are implemented and containerized.
   - Include a Docker Compose file for easy deployment.
   - Provide a README file with setup instructions and sample API requests.

2. **Test Results**:
   - Include screenshots/logs of:
     - API responses for all test cases.
     - Circuit Breaker state transitions.
     - Successful and failed transactions.
   - Highlight system behavior during failure and recovery.

3. **Scalability Enhancements**:
   - Describe how caching, sharding, and load balancing are implemented.

4. **Documentation**:
   - Provide clear documentation for all services and APIs.
   - Include database schema and matching engine logic.

---

### **Next Steps**

1. Clone your backend repository and set up the development environment:

   ```bash
   git clone https://github.com/danigallegdup/SENG468_Project.git
   cd SENG468_Project
   git checkout back-end
   ```

2. Start implementing and testing the APIs and services. If you’d like, I can guide you through specific parts, like setting up Docker Compose or writing API logic.
