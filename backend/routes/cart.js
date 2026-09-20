const express = require('express');
const { body, param, query } = require('express-validator');

const { pool } = require('../db/mysql');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const router = express.Router();
router.use(authenticate);

async function buildCartResponse(userId) {
  const [rows] = await pool.execute(
      `SELECT ci.id, ci.quantity, p.id AS product_id, p.name AS product_name,
              p.image_url, p.price, p.stock AS available_stock
       FROM cart ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ? AND p.active = 1
       ORDER BY ci.id ASC`
    , [userId]);

  let total = 0;
  const items = rows.map((r) => {
    const subtotal = r.price * r.quantity;
    total += subtotal;
    return {
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      imageUrl: r.image_url,
      price: r.price,
      quantity: r.quantity,
      subtotal,
      availableStock: r.available_stock,
    };
  });

  return { items, total, itemCount: items.length };
}

router.get('/', async (req, res, next) => {
  try { res.json(await buildCartResponse(req.user.id)); } catch (err) { next(err); }
});

router.post(
  '/items',
  [
    body('productId').isInt().withMessage('Product id is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { productId, quantity } = req.body;
      const [productRows] = await pool.execute('SELECT * FROM products WHERE id = ? AND active = 1', [productId]);
      const product = productRows[0];
      if (!product) throw new NotFoundError(`Product not found: ${productId}`);

      const [existingRows] = await pool.execute('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
      const existing = existingRows[0];

      const desiredQuantity = quantity + (existing ? existing.quantity : 0);
      if (desiredQuantity > product.stock) {
        throw new BadRequestError(`Only ${product.stock} units of "${product.name}" are in stock`);
      }

      if (existing) {
        await pool.execute('UPDATE cart SET quantity = ? WHERE id = ?', [desiredQuantity, existing.id]);
      } else {
        await pool.execute('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, productId, quantity]);
      }

      res.json(await buildCartResponse(req.user.id));
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/items/:itemId',
  [param('itemId').isInt(), query('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')],
  handleValidation,
  async (req, res, next) => {
    try {
      const [itemRows] = await pool.execute('SELECT * FROM cart WHERE id = ? AND user_id = ?', [req.params.itemId, req.user.id]);
      const item = itemRows[0];
      if (!item) throw new NotFoundError(`Cart item not found: ${req.params.itemId}`);

      const [productRows] = await pool.execute('SELECT * FROM products WHERE id = ? AND active = 1', [item.product_id]);
      const product = productRows[0];
      if (!product) throw new NotFoundError('Product is no longer available');
      const quantity = parseInt(req.query.quantity, 10);
      if (quantity > product.stock) {
        throw new BadRequestError(`Only ${product.stock} units available`);
      }

      await pool.execute('UPDATE cart SET quantity = ? WHERE id = ?', [quantity, item.id]);
      res.json(await buildCartResponse(req.user.id));
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/items/:itemId', [param('itemId').isInt()], handleValidation, async (req, res, next) => {
  try {
    const [result] = await pool.execute('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.itemId, req.user.id]);
    if (!result.affectedRows) throw new NotFoundError(`Cart item not found: ${req.params.itemId}`);
    res.json(await buildCartResponse(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    res.json(await buildCartResponse(req.user.id));
  } catch (err) { next(err); }
});

module.exports = router;
