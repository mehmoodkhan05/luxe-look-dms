import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = Router();
router.use(authMiddleware);

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_categories WHERE is_active = 1 ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const categoryId = req.query.categoryId;
    let sql = 'SELECT s.*, c.name as category_name FROM services s JOIN service_categories c ON c.id = s.category_id WHERE s.is_active = 1';
    const params = [];
    if (categoryId) {
      sql += ' AND s.category_id = ?';
      params.push(categoryId);
    }
    sql += ' ORDER BY c.name, s.name';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT s.*, c.name as category_name FROM services s JOIN service_categories c ON c.id = s.category_id WHERE s.id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', requireRole('admin'), body('name').trim().notEmpty(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const [result] = await pool.query('INSERT INTO service_categories (name) VALUES (?)', [req.body.name]);
    res.status(201).json({ id: result.insertId, name: req.body.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  requireRole('admin'),
  body('name').trim().notEmpty(),
  body('categoryId').isInt(),
  body('price').isFloat({ min: 0 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { name, categoryId, duration_minutes, price, commission_percentage, commission_fixed } = req.body;
      const [result] = await pool.query(
        `INSERT INTO services (category_id, name, duration_minutes, price, commission_percentage, commission_fixed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [categoryId, name, duration_minutes || 60, price, commission_percentage || 0, commission_fixed || 0]
      );
      res.status(201).json({ id: result.insertId, name, categoryId, price });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, categoryId, duration_minutes, price, commission_percentage, commission_fixed, is_active } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(categoryId); }
    if (duration_minutes !== undefined) { updates.push('duration_minutes = ?'); params.push(duration_minutes); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (commission_percentage !== undefined) { updates.push('commission_percentage = ?'); params.push(commission_percentage); }
    if (commission_fixed !== undefined) { updates.push('commission_fixed = ?'); params.push(commission_fixed); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ id: req.params.id, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE services SET is_active = 0 WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' });
    res.json({ id: req.params.id, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
