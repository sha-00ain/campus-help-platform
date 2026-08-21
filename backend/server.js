// ===================================================
// MAIN SERVER FILE
// This starts the whole backend
// ===================================================
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bloodRoutes = require('./routes/bloodRoutes');
const itemRoutes = require('./routes/itemRoutes');
const commentRoutes = require('./routes/commentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());              // allow frontend to call this backend
app.use(express.json({ limit: '10mb' }));      // allow reading JSON from request body (10mb to allow images)

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/blood', bloodRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', adminRoutes);

// simple test route
app.get('/', (req, res) => {
    res.send('Campus Help Platform API is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
