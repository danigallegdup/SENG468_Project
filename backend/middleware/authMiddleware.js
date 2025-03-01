// middleware/authMiddleware.js
// Protects routes with authentication

console.log('Module paths:', module.paths);
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

module.exports = (req, res, next) => {
    const token = req.header('token');
    console.log("Token Received:", token); // ✅ Check if token is being sent

    if (!token) {
        return res.status(400).json({ success: false, message: 'Access Denied: No Token Provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded Token:", decoded); // ✅ Check if token is valid
        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT Verification Failed:", err);
        res.status(401).json({ success: false, message: 'Invalid Token' });
    }
};
