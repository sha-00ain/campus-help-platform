// ===================================================
// JWT Authentication Middleware
// Checks if the user sent a valid login token
// ===================================================
const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'No token provided. Please login.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = decoded; // contains user_id, email, role
        next();
    });
}

module.exports = verifyToken;
