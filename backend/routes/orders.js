const express = require('express');
const { body, param } = require('express-validator');
const { pool } = require('../db/mysql');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { paginate, pageResponse } = require('../utils/serializers');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const router = express.Router();
router.use(authenticate);
const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

async function toOrderResponse(order) {
  const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  const [payments] = await pool.execute('SELECT provider, amount, status, created_at FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', [order.id]);
  const payment = payments[0] || null;
  return {
    id: order.id,
    shippingName: order.shipping_name,
    shippingAddress: order.shipping_address,
    shippingPhone: order.shipping_phone,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: payment?.provider || null,
    paymentAmount: payment ? Number(payment.amount) : Number(order.final_amount ?? order.total_amount),
    paymentRecordStatus: payment?.status || null,
    totalAmount: Number(order.final_amount ?? order.total_amount),
    items: items.map((item) => ({ id: item.id, productId: item.product_id, productName: item.product_name, priceAtPurchase: Number(item.price_at_purchase), quantity: item.quantity })),
    createdAt: order.created_at,
  };
}

router.post('/checkout', [
  body('shippingName').trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingAddress').trim().notEmpty().withMessage('Shipping address is required'),
  body('shippingPhone').trim().notEmpty().withMessage('Shipping phone is required'),
  body('paymentMethod').optional().isIn(['COD', 'MOCK_ONLINE']).withMessage('Choose COD or mock online payment'),
], handleValidation, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [cartItems] = await connection.execute(`SELECT ci.quantity, p.id AS product_id, p.name, p.price, p.stock FROM cart ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = ? AND p.active = 1 FOR UPDATE`, [req.user.id]);
    if (!cartItems.length) throw new BadRequestError('Your cart is empty');
    const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const paymentMethod = req.body.paymentMethod || 'COD';
    const paymentStatus = paymentMethod === 'MOCK_ONLINE' ? 'PAID' : 'PENDING';
    const [orderResult] = await connection.execute(`INSERT INTO orders (user_id, shipping_name, shipping_address, shipping_phone, status, payment_status, total_amount, final_amount) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`, [req.user.id, req.body.shippingName, req.body.shippingAddress, req.body.shippingPhone, paymentStatus, total, total]);
    for (const item of cartItems) {
      const [stockResult] = await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ? AND active = 1 AND stock >= ?', [item.quantity, item.product_id, item.quantity]);
      if (!stockResult.affectedRows) throw new BadRequestError(`Only ${item.stock} units of "${item.name}" are in stock`);
      await connection.execute('INSERT INTO order_items (order_id, product_id, product_name, price_at_purchase, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)', [orderResult.insertId, item.product_id, item.name, item.price, item.quantity, Number(item.price) * item.quantity]);
    }
    await connection.execute('INSERT INTO payments (order_id, provider, provider_payment_id, amount, status) VALUES (?, ?, ?, ?, ?)', [orderResult.insertId, paymentMethod, paymentMethod === 'MOCK_ONLINE' ? `mock_${orderResult.insertId}_${Date.now()}` : null, total, paymentStatus === 'PAID' ? 'SUCCEEDED' : 'PENDING']);
    await connection.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    await connection.commit();
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [orderResult.insertId]);
    res.status(201).json(await toOrderResponse(orders[0]));
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally { connection.release(); }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, size, offset } = paginate(req.query);
    const [countRows] = await pool.execute('SELECT COUNT(*) AS count FROM orders WHERE user_id = ?', [req.user.id]);
    const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.user.id, size, offset]);
    res.json(pageResponse(await Promise.all(rows.map(toOrderResponse)), page, size, Number(countRows[0].count)));
  } catch (err) { next(err); }
});

router.get('/:id', [param('id').isInt()], handleValidation, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const order = rows[0];
    if (!order) throw new NotFoundError(`Order not found: ${req.params.id}`);
    if (order.user_id !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ status: 403, message: 'You do not have permission to view this order' });
    res.json(await toOrderResponse(order));
  } catch (err) { next(err); }
});

const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);
adminRouter.get('/', async (req, res, next) => {
  try {
    const { page, size, offset } = paginate(req.query);
    const [countRows] = await pool.query('SELECT COUNT(*) AS count FROM orders');
    const [rows] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?', [size, offset]);
    res.json(pageResponse(await Promise.all(rows.map(toOrderResponse)), page, size, Number(countRows[0].count)));
  } catch (err) { next(err); }
});
adminRouter.patch('/:id/status', [param('id').isInt(), body('status').isIn(VALID_STATUSES).withMessage('Invalid status value')], handleValidation, async (req, res, next) => {
  try {
    const [result] = await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    if (!result.affectedRows) throw new NotFoundError(`Order not found: ${req.params.id}`);
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(await toOrderResponse(rows[0]));
  } catch (err) { next(err); }
});

module.exports = { router, adminRouter };
