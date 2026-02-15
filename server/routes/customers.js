import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { body, query, validationResult } from 'express-validator';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const [rows] = await pool.query(
      `SELECT * FROM customers WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY full_name LIMIT 100`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    const [history] = await pool.query(
      `SELECT a.id, a.appointment_date, a.start_time, a.status, s.name as service_name
       FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.customer_id = ? ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ ...rows[0], visitHistory: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  body('fullName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { fullName, phone, email, address } = req.body;
      const [result] = await pool.query(
        'INSERT INTO customers (full_name, phone, email, address) VALUES (?, ?, ?, ?)',
        [fullName, phone, email || null, address || null]
      );
      res.status(201).json({ id: result.insertId, full_name: fullName, phone, email, address });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  '/:id',
  body('fullName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { fullName, phone, email, address } = req.body;
      await pool.query(
        'UPDATE customers SET full_name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
        [fullName, phone, email || null, address || null, req.params.id]
      );
      res.json({ id: req.params.id, full_name: fullName, phone, email, address });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
