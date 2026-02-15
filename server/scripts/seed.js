import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

export async function seedAdmin() {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = 'admin@luxelook.com' LIMIT 1"
  );
  if (rows.length > 0) return;
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
    ['admin@luxelook.com', hash, 'admin', 'System Admin']
  );
}

export async function seedCategories() {
  const [existing] = await pool.query('SELECT id FROM service_categories LIMIT 1');
  if (existing.length > 0) return;
  await pool.query(
    `INSERT INTO service_categories (name) VALUES ('Hair'), ('Skin'), ('Nails'), ('Makeup'), ('Spa')`
  );
}
