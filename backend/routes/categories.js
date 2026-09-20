const express = require('express');
const { pool } = require('../db/mysql');
const { toCategoryResponse } = require('../utils/serializers');

const router = express.Router();
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows.map(toCategoryResponse));
  } catch (err) { next(err); }
});
module.exports = router;
