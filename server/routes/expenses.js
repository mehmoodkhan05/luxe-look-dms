import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { from, to, category } = req.query;
    let sql = `
      SELECT e.*, u.full_name as added_by_name
      FROM daily_expenses e
      LEFT JOIN users u ON u.id = e.added_by
      WHERE 1=1
    `;
    const params = [];
    if (from) { sql += ' AND e.expense_date >= ?'; params.push(from); }
    if (to) { sql += ' AND e.expense_date <= ?'; params.push(to); }
    if (category) { sql += ' AND e.category = ?'; params.push(category); }
    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC LIMIT 500';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to date required' });
    }
    const [rows] = await pool.query(
      `SELECT expense_date as date, SUM(amount) as total
       FROM daily_expenses WHERE expense_date BETWEEN ? AND ?
       GROUP BY expense_date ORDER BY expense_date DESC`,
      [from, to]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { expense_date, category, amount, description, payment_method } = req.body;
    if (!expense_date || !category || amount == null || amount === '') {
      return res.status(400).json({ error: 'expense_date, category and amount required' });
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const [result] = await pool.query(
      `INSERT INTO daily_expenses (expense_date, category, amount, description, payment_method, added_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [expense_date, String(category).trim(), amt, description || null, payment_method || 'cash', req.userId]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { expense_date, category, amount, description, payment_method } = req.body;
    const updates = [];
    const params = [];
    if (expense_date !== undefined) { updates.push('expense_date = ?'); params.push(expense_date); }
    if (category !== undefined) { updates.push('category = ?'); params.push(String(category).trim()); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(Number(amount)); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
    if (payment_method !== undefined) { updates.push('payment_method = ?'); params.push(payment_method); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const [r] = await pool.query(`UPDATE daily_expenses SET ${updates.join(', ')} WHERE id = ?`, params);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ id: req.params.id, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM daily_expenses WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
