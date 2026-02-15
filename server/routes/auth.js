import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'luxe_look_jwt_secret';

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { email, password } = req.body;
      const [rows] = await pool.query(
        'SELECT id, email, password_hash, role, full_name FROM users WHERE email = ? AND is_active = 1',
        [email]
      );
      if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      const [staffRows] = await pool.query('SELECT id FROM staff WHERE user_id = ?', [user.id]);
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
          staffId: staffRows[0]?.id,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Server error' });
    }
  }
);

router.post(
  '/register',
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
      const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
        [email, hash, role, fullName, phone || null]
      );
      const userId = result.insertId;
      if (role === 'staff') {
        await pool.query(
          'INSERT INTO staff (user_id, monthly_salary, commission_type, commission_value, join_date) VALUES (?, ?, ?, ?, ?)',
          [userId, monthlySalary || 0, commissionType || 'percentage', commissionValue || 0, new Date()]
        );
      }
      res.status(201).json({ id: userId, email, role, fullName });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/profile', authMiddleware, body('fullName').trim().notEmpty(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { fullName } = req.body;
    await pool.query('UPDATE users SET full_name = ? WHERE id = ?', [fullName, req.userId]);
    res.json({ fullName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
