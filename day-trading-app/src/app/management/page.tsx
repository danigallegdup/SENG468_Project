"use client";

import React, { useState } from "react";
import { createStock, getStockPortfolio, addStockToUser } from "../../userManagementService/userManagement";

export default function StockManagement() {
  const [token, setToken] = useState("");
  const [stockName, setStockName] = useState("");
  const [stockId, setStockId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [portfolio, setPortfolio] = useState([]);
  const [message, setMessage] = useState("");

  const handleCreateStock = async () => {
    const response = await createStock(stockName, token);
    setMessage(response.success ? "Stock created! You can find the stock Id in the dev tools network tab." : response.data.error);
  };

  const handleGetPortfolio = async () => {
    const response = await getStockPortfolio(token);
    if (response.success) {
      setPortfolio(response.data.stocks);
    } else {
      setMessage(response.data.error);
    }
  };

  const handleAddStock = async () => {
    const response = await addStockToUser(stockId, parseInt(quantity, 10), token);
    setMessage(response.success ? "Stock added to portfolio!" : response.data.error);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Stock Management</h1>
      
      <div className="mb-4">
        <label>Token:</label>
        <input className="border p-2 ml-2" value={token} onChange={(e) => setToken(e.target.value)} />
      </div>

      <div className="mb-4">
        <label>Stock Name:</label>
        <input className="border p-2 ml-2" value={stockName} onChange={(e) => setStockName(e.target.value)} />
        <button className="ml-2 bg-blue-500 text-white p-2" onClick={handleCreateStock}>Create Stock</button>
      </div>

      <div className="mb-4">
        <label>Stock ID:</label>
        <input className="border p-2 ml-2" value={stockId} onChange={(e) => setStockId(e.target.value)} />
        <label className="ml-4">Quantity:</label>
        <input className="border p-2 ml-2" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <button className="ml-2 bg-green-500 text-white p-2" onClick={handleAddStock}>Add Stock</button>
      </div>

      <div className="mb-4">
        <button className="bg-gray-500 text-white p-2" onClick={handleGetPortfolio}>Get Portfolio</button>
      </div>

      {message && <p className="text-red-500">{message}</p>}

      <h2 className="text-lg font-bold mt-4">Portfolio</h2>
      <ul>
        {portfolio.map((stock, index) => (
          <li key={index}>{stock.stockId} - {stock.quantity}</li>
        ))}
      </ul>
    </div>
  );
}