const bcrypt = require('bcryptjs');
const { pool } = require('./mysql');

async function seed() {
  const [countRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (Number(countRows[0].count) > 0) return;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT INTO users (full_name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)', ['Admin User', 'admin@codealpha.dev', await bcrypt.hash('Admin@123', 10), '9000000001', 'CodeAlpha HQ', 'ADMIN']);
    await connection.execute('INSERT INTO users (full_name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)', ['Demo User', 'user@codealpha.dev', await bcrypt.hash('User@123', 10), '9000000002', '123 Demo Street, Chennai', 'USER']);
    const categories = [['Electronics', 'Gadgets and devices'], ['Fashion', 'Clothing and accessories'], ['Home & Kitchen', 'Everyday home essentials'], ['Books', 'Fiction and non-fiction']];
    const ids = {};
    for (const category of categories) { const [result] = await connection.execute('INSERT INTO categories (name, description) VALUES (?, ?)', category); ids[category[0]] = result.insertId; }
    const products = [
      ['Wireless Bluetooth Headphones', 'Over-ear headphones with active noise cancellation and 30-hour battery life.', 2499, 3499, 50, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', ids.Electronics],
      ['Smart Fitness Watch', 'Tracks heart rate, sleep, and steps. 7-day battery, water resistant.', 3999, 4999, 35, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', ids.Electronics],
      ['Portable Bluetooth Speaker', 'Compact speaker with deep bass and 12-hour playtime.', 1799, 2499, 60, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', ids.Electronics],
      ["Men's Cotton T-Shirt", 'Breathable regular-fit cotton t-shirt.', 499, 799, 120, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', ids.Fashion],
      ["Women's Denim Jacket", 'Classic fit denim jacket.', 1899, 2499, 40, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600', ids.Fashion],
      ['Non-Stick Cookware Set', '5-piece induction-compatible cookware set.', 2999, 3999, 25, 'https://images.unsplash.com/photo-1584990347449-a5d9f800a783?w=600', ids['Home & Kitchen']],
      ['Ceramic Coffee Mug Set', 'Set of 4 handcrafted ceramic mugs.', 799, 999, 80, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600', ids['Home & Kitchen']],
      ['The Pragmatic Programmer', 'A classic software development guide.', 1299, 1599, 30, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600', ids.Books],
      ['Atomic Habits', 'An easy way to build good habits.', 699, 899, 70, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600', ids.Books],
      ['4K Ultra HD Webcam', 'Autofocus webcam with built-in microphone.', 3499, 4499, 0, 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600', ids.Electronics],
    ];
    for (const product of products) await connection.execute('INSERT INTO products (name, description, price, original_price, stock, image_url, category_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', product);
    await connection.commit();
    console.log('MySQL seed data created.');
  } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
}
module.exports = seed;
