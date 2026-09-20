const express = require('express');
const { pool } = require('../db/mysql');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { toProductResponse } = require('../utils/serializers');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const [userRows] = await pool.execute('SELECT id, full_name, email, phone, address, role, created_at FROM users WHERE id = ?', [req.user.id]);
    const [statsRows] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE user_id = ?) AS orders,
        (SELECT COUNT(*) FROM wishlist_items WHERE user_id = ?) AS wishlistItems,
        (SELECT COALESCE(SUM(quantity), 0) FROM cart WHERE user_id = ?) AS cartItems,
        (SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE user_id = ? AND status <> 'CANCELLED') AS totalSpent
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);
    const [recentOrders] = await pool.execute(`
      SELECT id, final_amount, status, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [req.user.id]);
    const [recommendationRows] = await pool.execute(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.active = 1
      ORDER BY p.created_at DESC
      LIMIT 4
    `);

    res.json({
      user: userRows[0],
      stats: {
        orders: Number(statsRows[0].orders),
        wishlistItems: Number(statsRows[0].wishlistItems),
        cartItems: Number(statsRows[0].cartItems),
        totalSpent: Number(statsRows[0].totalSpent),
      },
      recentOrders,
      recentlyViewed: [],
      recommendations: recommendationRows.map(toProductResponse),
    });
  } catch (err) { next(err); }
});

const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);

async function dashboardSummary() {
  const [statsRows] = await pool.execute(`
    SELECT
      (SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE status <> 'CANCELLED') AS revenue,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM users WHERE role = 'USER') AS users
  `);
  const [recentOrders] = await pool.execute(`
    SELECT o.id, o.final_amount, o.status, o.created_at, u.full_name
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT 5
  `);
  const [lowStock] = await pool.execute(`
    SELECT p.id, p.name, p.stock, p.price, p.image_url
    FROM products p
    WHERE p.active = 1 AND p.stock <= 5
    ORDER BY p.stock ASC, p.name ASC
    LIMIT 10
  `);
  return {
    stats: {
      revenue: Number(statsRows[0].revenue),
      orders: Number(statsRows[0].orders),
      users: Number(statsRows[0].users),
    },
    recentOrders,
    lowStock,
  };
}

adminRouter.get('/dashboard', async (req, res, next) => {
  try { res.json(await dashboardSummary()); } catch (err) { next(err); }
});

adminRouter.get('/analytics/sales', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT DATE(created_at) AS date, COALESCE(SUM(final_amount), 0) AS revenue, COUNT(*) AS orders
      FROM orders
      WHERE status <> 'CANCELLED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json(rows.map((row) => ({ date: row.date, revenue: Number(row.revenue), orders: Number(row.orders) })));
  } catch (err) { next(err); }
});

adminRouter.get('/analytics/orders', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY status');
    res.json(rows.map((row) => ({ status: row.status, count: Number(row.count) })));
  } catch (err) { next(err); }
});

adminRouter.get('/analytics/products', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT oi.product_id AS productId, oi.product_name AS productName, SUM(oi.quantity) AS unitsSold
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.status <> 'CANCELLED'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY unitsSold DESC
      LIMIT 10
    `);
    res.json(rows.map((row) => ({ ...row, unitsSold: Number(row.unitsSold) })));
  } catch (err) { next(err); }
});

adminRouter.get('/analytics/customers', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT u.id, u.full_name AS fullName, u.email, COUNT(o.id) AS orders, COALESCE(SUM(o.final_amount), 0) AS totalSpent
      FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status <> 'CANCELLED'
      WHERE u.role = 'USER'
      GROUP BY u.id, u.full_name, u.email
      ORDER BY totalSpent DESC
      LIMIT 20
    `);
    res.json(rows.map((row) => ({ ...row, orders: Number(row.orders), totalSpent: Number(row.totalSpent) })));
  } catch (err) { next(err); }
});

adminRouter.get('/low-stock', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, stock, price, image_url AS imageUrl FROM products WHERE active = 1 AND stock <= 5 ORDER BY stock ASC, name ASC LIMIT 50');
    res.json(rows.map((row) => ({ ...row, stock: Number(row.stock), price: Number(row.price) })));
  } catch (err) { next(err); }
});

module.exports = { router, adminRouter };