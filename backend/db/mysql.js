const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopdb',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
});

async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.mysql.sql'), 'utf8');
    for (const statement of schema.split(';').map((part) => part.replace(/--.*$/gm, '').trim()).filter(Boolean)) {
      await connection.query(statement);
    }
  } finally {
    connection.release();
  }
}

module.exports = { pool, initializeDatabase };