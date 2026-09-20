const express = require('express');
const { body, param } = require('express-validator');
const { pool } = require('../db/mysql');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { toProductResponse, toCategoryResponse } = require('../utils/serializers');
const { NotFoundError, ConflictError } = require('../utils/errors');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/customers', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT u.id, u.full_name AS fullName, u.email, u.created_at AS createdAt,
             COUNT(o.id) AS orders, COALESCE(SUM(CASE WHEN o.status <> 'CANCELLED' THEN o.final_amount ELSE 0 END), 0) AS totalSpent
      FROM users u LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'USER'
      GROUP BY u.id, u.full_name, u.email, u.created_at
      ORDER BY u.created_at DESC
    `);
    res.json(rows.map((row) => ({ ...row, orders: Number(row.orders), totalSpent: Number(row.totalSpent) })));
  } catch (err) { next(err); }
});

router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`SELECT c.*, COUNT(p.id) AS productCount FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.active = 1 GROUP BY c.id ORDER BY c.name`);
    res.json(rows.map((row) => ({ ...row, productCount: Number(row.productCount) })));
  } catch (err) { next(err); }
});

router.get('/coupons', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, code, discount_type AS discountType, discount_value AS discountValue, minimum_order_amount AS minimumOrderAmount, maximum_discount AS maximumDiscount, expires_at AS expiresAt, usage_limit AS usageLimit, used_count AS usedCount, active FROM coupons ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/coupons', [
  body('code').trim().isLength({ min: 3, max: 40 }).withMessage('Coupon code is required'),
  body('discountType').isIn(['PERCENTAGE', 'FIXED']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount must be zero or positive'),
  body('minimumOrderAmount').optional().isFloat({ min: 0 }),
  body('maximumDiscount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('usageLimit').optional({ nullable: true }).isInt({ min: 1 }),
], handleValidation, async (req, res, next) => {
  try {
    const code = req.body.code.toUpperCase();
    const [result] = await pool.execute(`INSERT INTO coupons (code, discount_type, discount_value, minimum_order_amount, maximum_discount, expires_at, usage_limit, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [code, req.body.discountType, req.body.discountValue, req.body.minimumOrderAmount || 0, req.body.maximumDiscount || null, req.body.expiresAt || null, req.body.usageLimit || null]);
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/coupons/:id', [param('id').isInt(), body('active').isBoolean()], handleValidation, async (req, res, next) => {
  try {
    const [result] = await pool.execute('UPDATE coupons SET active = ? WHERE id = ?', [req.body.active, req.params.id]);
    if (!result.affectedRows) throw new NotFoundError(`Coupon not found: ${req.params.id}`);
    res.json({ id: Number(req.params.id), active: Boolean(req.body.active) });
  } catch (err) { next(err); }
});

router.get('/reviews', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`SELECT r.id, r.rating, r.comment, r.created_at AS createdAt, u.full_name AS userName, p.name AS productName FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.delete('/reviews/:id', [param('id').isInt()], handleValidation, async (req, res, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw new NotFoundError(`Review not found: ${req.params.id}`);
    res.status(204).end();
  } catch (err) { next(err); }
});

async function fetchProduct(id) {
  const [rows] = await pool.execute('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?', [id]);
  return rows[0];
}

router.post('/products', [body('name').trim().notEmpty().withMessage('Product name is required'), body('price').isFloat({ min: 0 }).withMessage('Price must be zero or positive'), body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or positive')], handleValidation, async (req, res, next) => {
  try {
    const [result] = await pool.execute('INSERT INTO products (name, description, price, original_price, stock, image_url, category_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', [req.body.name, req.body.description || null, req.body.price, req.body.originalPrice || null, req.body.stock, req.body.imageUrl || null, req.body.categoryId || null]);
    res.status(201).json(toProductResponse(await fetchProduct(result.insertId)));
  } catch (err) { next(err); }
});

router.put('/products/:id', [param('id').isInt(), body('name').trim().notEmpty().withMessage('Product name is required'), body('price').isFloat({ min: 0 }).withMessage('Price must be zero or positive'), body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or positive')], handleValidation, async (req, res, next) => {
  try {
    if (!await fetchProduct(req.params.id)) throw new NotFoundError(`Product not found: ${req.params.id}`);
    await pool.execute('UPDATE products SET name = ?, description = ?, price = ?, original_price = ?, stock = ?, image_url = ?, category_id = ? WHERE id = ?', [req.body.name, req.body.description || null, req.body.price, req.body.originalPrice || null, req.body.stock, req.body.imageUrl || null, req.body.categoryId || null, req.params.id]);
    res.json(toProductResponse(await fetchProduct(req.params.id)));
  } catch (err) { next(err); }
});

router.patch('/products/:id/stock', [param('id').isInt(), body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or positive')], handleValidation, async (req, res, next) => {
  try {
    if (!await fetchProduct(req.params.id)) throw new NotFoundError(`Product not found: ${req.params.id}`);
    await pool.execute('UPDATE products SET stock = ? WHERE id = ?', [req.body.stock, req.params.id]);
    res.json(toProductResponse(await fetchProduct(req.params.id)));
  } catch (err) { next(err); }
});

router.delete('/products/:id', [param('id').isInt()], handleValidation, async (req, res, next) => {
  try {
    if (!await fetchProduct(req.params.id)) throw new NotFoundError(`Product not found: ${req.params.id}`);
    await pool.execute('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/categories', [body('name').trim().notEmpty().withMessage('Category name is required')], handleValidation, async (req, res, next) => {
  try {
    const [duplicates] = await pool.execute('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [req.body.name]);
    if (duplicates.length) throw new ConflictError(`Category "${req.body.name}" already exists`);
    const [result] = await pool.execute('INSERT INTO categories (name, description) VALUES (?, ?)', [req.body.name, req.body.description || null]);
    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(toCategoryResponse(rows[0]));
  } catch (err) { next(err); }
});

router.put('/categories/:id', [param('id').isInt(), body('name').trim().notEmpty().withMessage('Category name is required')], handleValidation, async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (!existing.length) throw new NotFoundError(`Category not found: ${req.params.id}`);
    await pool.execute('UPDATE categories SET name = ?, description = ? WHERE id = ?', [req.body.name, req.body.description || null, req.params.id]);
    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(toCategoryResponse(rows[0]));
  } catch (err) { next(err); }
});

router.delete('/categories/:id', [param('id').isInt()], handleValidation, async (req, res, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw new NotFoundError(`Category not found: ${req.params.id}`);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
