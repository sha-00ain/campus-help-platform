// ===================================================
// Admin Authentication Middleware
// Checks the token belongs to the admin (role === 'admin')
// ===================================================
const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No admin token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired admin session.' });
        }
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access only.' });
        }
        req.admin = decoded;
        next();
    });
}

module.exports = verifyAdmin;
