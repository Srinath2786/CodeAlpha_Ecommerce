const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { pool } = require('../db/mysql');
const { handleValidation } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { toUserResponse } = require('../utils/serializers');
const { ConflictError } = require('../utils/errors');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const issueToken = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

router.post('/register', [body('fullName').trim().notEmpty().withMessage('Full name is required'), body('email').trim().isEmail().withMessage('Email must be valid'), body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')], handleValidation, async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) throw new ConflictError('An account with this email already exists');
    const [result] = await pool.execute('INSERT INTO users (full_name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)', [req.body.fullName, email, await bcrypt.hash(req.body.password, 10), req.body.phone || null, req.body.address || null, 'USER']);
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ token: issueToken(rows[0]), user: toUserResponse(rows[0]) });
  } catch (err) { next(err); }
});

router.post('/login', [body('email').trim().isEmail().withMessage('Email must be valid'), body('password').notEmpty().withMessage('Password is required')], handleValidation, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [req.body.email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ status: 401, message: 'Invalid email or password' });
    res.json({ token: issueToken(user), user: toUserResponse(user) });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req, res) => res.json(toUserResponse(req.user)));
router.put('/me', authenticate, [body('fullName').trim().notEmpty().withMessage('Full name is required')], handleValidation, async (req, res, next) => {
  try {
    await pool.execute('UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?', [req.body.fullName, req.body.phone || null, req.body.address || null, req.user.id]);
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(toUserResponse(rows[0]));
  } catch (err) { next(err); }
});

module.exports = router;
