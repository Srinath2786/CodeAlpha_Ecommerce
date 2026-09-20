const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../db/mysql');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

router.get('/product/:productId', async (req, res, next) => {
  try {
    const [reviews] = await pool.execute(`
      SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at, u.full_name AS user_name
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ? ORDER BY r.created_at DESC
    `, [req.params.productId]);
    const [summaryRows] = await pool.execute('SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS average FROM reviews WHERE product_id = ?', [req.params.productId]);
    const summary = summaryRows[0];
    res.json({ reviews, summary: { count: Number(summary.count), average: Number(Number(summary.average).toFixed(1)) } });
  } catch (err) { next(err); }
});

const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().isLength({ min: 3, max: 1000 }).withMessage('Review must be between 3 and 1000 characters'),
  handleValidation,
];

router.post('/product/:productId', authenticate, reviewValidation, async (req, res, next) => {
  try {
    const [products] = await pool.execute('SELECT id FROM products WHERE id = ? AND active = 1', [req.params.productId]);
    const product = products[0];
    if (!product) throw new NotFoundError('Product not found');
    const [purchasedRows] = await pool.execute(`
      SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status != 'CANCELLED' LIMIT 1
    `, [req.user.id, product.id]);
    if (!purchasedRows.length) return res.status(403).json({ message: 'You can review products you have purchased.' });
    await pool.execute(`
      INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)
    `, [req.user.id, product.id, req.body.rating, req.body.comment]);
    res.status(201).json({ message: 'Review saved' });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM reviews WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;