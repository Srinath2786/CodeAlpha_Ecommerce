require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and set a real value.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const { pool, initializeDatabase } = require('./db/mysql');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const reviewRoutes = require('./routes/reviews');
const { router: dashboardRoutes, adminRouter: adminDashboardRoutes } = require('./routes/dashboard');
const { router: orderRoutes, adminRouter: adminOrderRoutes } = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./utils/errors');

const app = express();
const PORT = process.env.PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5500';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Serve the plain HTML/CSS/JS frontend directly from Express too, so the whole
// app can run from a single `npm start` without a separate static server.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ status: 404, message: `No route for ${req.method} ${req.path}` });
});

app.use(errorHandler);

async function start() {
  try {
    await initializeDatabase();
    await require('./db/seed')();
    app.listen(PORT, () => console.log(`ShopWave backend running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Unable to connect to MySQL. Start MySQL in XAMPP and verify shopdb credentials.', err.message);
    process.exit(1);
  }
}

start();
