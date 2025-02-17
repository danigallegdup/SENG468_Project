const API_URL = "http://localhost:5001"; // Ensure this matches the port in userManagement.js

export async function createStock(stockName, token) {
    const response = await fetch(`${API_URL}/createStock`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "token": token
        },
        body: JSON.stringify({ stockName })
    });
    return response.json();
}

export async function getStockPortfolio(token) {
    const response = await fetch(`${API_URL}/getStockPortfolio`, {
        method: "GET",
        headers: { "token": token }
    });
    return response.json();
}

export async function addStockToUser(stockId, quantity, token) {
    const response = await fetch(`${API_URL}/addStockToUser`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "token": token
        },
        body: JSON.stringify({ stockId, quantity })
    });
    return response.json();
}
