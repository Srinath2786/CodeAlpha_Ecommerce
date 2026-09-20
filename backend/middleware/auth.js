const jwt = require('jsonwebtoken');
const { pool } = require('../db/mysql');

const JWT_SECRET = process.env.JWT_SECRET;

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ status: 401, message: 'Authentication required' });
  }

  const token = header.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.execute('SELECT id, full_name, email, phone, address, role FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) {
      return res.status(401).json({ status: 401, message: 'User no longer exists' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ status: 401, message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ status: 403, message: 'You do not have permission to perform this action' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
