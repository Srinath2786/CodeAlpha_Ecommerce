const express = require('express');
const { param } = require('express-validator');
const { pool } = require('../db/mysql');
const { toProductResponse, paginate, pageResponse } = require('../utils/serializers');
const { handleValidation } = require('../middleware/validate');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();
const SORTABLE_FIELDS = { price: 'p.price', name: 'p.name', createdAt: 'p.created_at' };

router.get('/', async (req, res, next) => {
  try {
    const { page, size, offset } = paginate(req.query);
    const conditions = ['p.active = 1'];
    const values = [];
    if (req.query.categoryId) { conditions.push('p.category_id = ?'); values.push(req.query.categoryId); }
    if (req.query.search) { conditions.push('(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?)'); const term = `%${String(req.query.search).toLowerCase()}%`; values.push(term, term); }
    if (req.query.minPrice !== undefined) { conditions.push('p.price >= ?'); values.push(Number(req.query.minPrice)); }
    if (req.query.maxPrice !== undefined) { conditions.push('p.price <= ?'); values.push(Number(req.query.maxPrice)); }
    if (req.query.inStock === 'true') conditions.push('p.stock > 0');
    const where = conditions.join(' AND ');
    const [countRows] = await pool.execute(`SELECT COUNT(*) AS count FROM products p WHERE ${where}`, values);
    const sort = SORTABLE_FIELDS[req.query.sortBy] || 'p.created_at';
    const direction = String(req.query.direction).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const [rows] = await pool.execute(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where} ORDER BY ${sort} ${direction} LIMIT ? OFFSET ?`, [...values, size, offset]);
    res.json(pageResponse(rows.map(toProductResponse), page, size, Number(countRows[0].count)));
  } catch (err) { next(err); }
});

router.get('/:id', [param('id').isInt(), handleValidation], async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ? AND p.active = 1', [req.params.id]);
    if (!rows.length) throw new NotFoundError(`Product not found: ${req.params.id}`);
    res.json(toProductResponse(rows[0]));
  } catch (err) { next(err); }
});

module.exports = router;
