const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const { createRateLimiter } = require('./middleware/rateLimit');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiters — blocks excess requests instantly, before touching Firestore
const globalLimiter = createRateLimiter({
  windowMs: 60000,
  max: 60,
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api', globalLimiter);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);

// Optional: Mount the problematic server.js if it contains unique routes
// app.use('/api/server', require('./server'));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
