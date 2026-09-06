console.log('App starting...');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
console.log('Env loaded');

const app = express();
console.log('Express app initialized');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', (req, res, next) => {
    if (!process.env.FILE_ACCESS_TOKEN || req.headers['x-file-access-token'] !== process.env.FILE_ACCESS_TOKEN) {
        return res.status(403).json({ error: 'Credential access is restricted.' });
    }
    next();
}, express.static(path.join(__dirname, '../uploads')));

// Explicitly map the static directory to the 'public' folder
app.use(express.static(path.join(__dirname, '../public')));

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const requestRoutes = require('./routes/requests'); // <--- 1. IMPORT IT HERE

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestRoutes); // <--- 2. REGISTER IT HERE

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});