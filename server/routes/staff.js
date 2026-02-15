import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT st.*, u.full_name, u.email, u.phone, u.role, u.is_active
       FROM staff st
       JOIN users u ON u.id = st.user_id
       ORDER BY u.full_name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT st.*, u.full_name, u.email, u.phone, u.role, u.is_active
       FROM staff st JOIN users u ON u.id = st.user_id WHERE st.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  requireRole('admin'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().notEmpty(),
  body('role').isIn(['admin', 'receptionist', 'staff']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { email, password, fullName, role, phone, monthlySalary, commissionType, commissionValue } = req.body;
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length) return res.status(400).json({ error: 'Email already registered' });
      const hash = await bcrypt.hash(password, 10);
      const [userResult] = await pool.query(
        'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
        [email, hash, role, fullName, phone || null]
      );
      const userId = userResult.insertId;
      let staffId = null;
      // Staff and receptionist both get a staff row so they appear in attendance and staff list
      if (role === 'staff' || role === 'receptionist') {
        const [stResult] = await pool.query(
          'INSERT INTO staff (user_id, monthly_salary, commission_type, commission_value, join_date) VALUES (?, ?, ?, ?, ?)',
          [userId, role === 'staff' ? (monthlySalary || 0) : 0, role === 'staff' ? (commissionType || 'percentage') : 'percentage', role === 'staff' ? (commissionValue || 0) : 0, new Date()]
        );
        staffId = stResult.insertId;
      }
      res.status(201).json({ id: userId, staffId, email, role, fullName });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const staffId = req.params.id;
    const { fullName, phone, role, password, monthlySalary, commissionType, commissionValue, is_active } = req.body;
    const [st] = await pool.query('SELECT user_id FROM staff WHERE id = ?', [staffId]);
    if (!st.length) return res.status(404).json({ error: 'Staff not found' });
    const userId = st[0].user_id;
    if (fullName !== undefined) await pool.query('UPDATE users SET full_name = ? WHERE id = ?', [fullName, userId]);
    if (phone !== undefined) await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
    if (role !== undefined) {
      if (!['admin', 'receptionist', 'staff'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
      await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }
    if (is_active !== undefined) await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, userId]);
    if (password && String(password).length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    }
    const supdates = [];
    const sparams = [];
    if (monthlySalary !== undefined) { supdates.push('monthly_salary = ?'); sparams.push(monthlySalary); }
    if (commissionType !== undefined) { supdates.push('commission_type = ?'); sparams.push(commissionType); }
    if (commissionValue !== undefined) { supdates.push('commission_value = ?'); sparams.push(commissionValue); }
    if (supdates.length) {
      sparams.push(staffId);
      await pool.query(`UPDATE staff SET ${supdates.join(', ')} WHERE id = ?`, sparams);
    }
    res.json({ id: staffId, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
