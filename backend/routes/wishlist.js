const express = require('express');
const { pool } = require('../db/mysql');
const { authenticate } = require('../middleware/auth');
const { toProductResponse } = require('../utils/serializers');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.*, c.name AS category_name
      FROM wishlist_items w
      JOIN products p ON p.id = w.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE w.user_id = ? AND p.active = 1
      ORDER BY w.created_at DESC
    `, [req.user.id]);
    res.json(rows.map(toProductResponse));
  } catch (err) { next(err); }
});

router.post('/:productId', async (req, res, next) => {
  try {
    const [products] = await pool.execute('SELECT id FROM products WHERE id = ? AND active = 1', [req.params.productId]);
    const product = products[0];
    if (!product) throw new NotFoundError('Product not found');
    await pool.execute('INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)', [req.user.id, product.id]);
    res.status(201).json({ message: 'Added to wishlist' });
  } catch (err) { next(err); }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;