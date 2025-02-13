# SENG468_Project

End-to-end development of a scalable day trading system for SENG 468

## Important links

- [Logbook](https://docs.google.com/document/d/1xYXMoz9LNA_vwVlQsgifg6b646PLg4U8BO-y8zszh6I/edit?usp=sharing) : Next one due January 27th

- [Reports](https://docs.google.com/document/d/14vhKMh3iT3FeVTXIK1BBEGvfbifLjwMe0yo4wCOuHrA/edit?usp=sharing) : Next one due January 31st 5%

- [Test Run 1 Single User](./Documents/Project_Overview1.pdfDocuments\Project_Overview1.pdf) due Febuary 15th 10%
  
- [Project Overview](./Documents/Project_Overview1.pdfDocuments\Project_Overview1.pdf) for Reference

# File Structure
## Backend
/backend: Root backend directory of the Day Trading App.
/backend/config: Contains configuration files for MongoDB database, Redis Caching, and RabbitMQ messaging.
/backend/consumers: Contains asychronous RabbitMQ consumers for processing orders.
/backend/models: Contains MongoDB schemas for storing users, stocks, orders, and transactions.
/backend/routes: Contains Express route files for API endpoints.
/backend/services: Contains services for processing ordes, handling transactions, and matching stocks.