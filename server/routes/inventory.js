import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE current_stock <= reorder_level AND reorder_level > 0'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  requireRole('admin'),
  body('name').trim().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { name, sku, unit, current_stock, reorder_level, supplier_name, supplier_contact } = req.body;
      const [result] = await pool.query(
        `INSERT INTO products (name, sku, unit, current_stock, reorder_level, supplier_name, supplier_contact)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, sku || null, unit || 'pcs', current_stock || 0, reorder_level ?? 5, supplier_name || null, supplier_contact || null]
      );
      res.status(201).json({ id: result.insertId, name, current_stock: current_stock || 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, sku, unit, current_stock, reorder_level, supplier_name, supplier_contact } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (sku !== undefined) { updates.push('sku = ?'); params.push(sku); }
    if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
    if (current_stock !== undefined) { updates.push('current_stock = ?'); params.push(current_stock); }
    if (reorder_level !== undefined) { updates.push('reorder_level = ?'); params.push(reorder_level); }
    if (supplier_name !== undefined) { updates.push('supplier_name = ?'); params.push(supplier_name); }
    if (supplier_contact !== undefined) { updates.push('supplier_contact = ?'); params.push(supplier_contact); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ id: req.params.id, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/stock', requireRole('admin'), async (req, res) => {
  try {
    const { type, quantity, notes } = req.body;
    if (!['purchase', 'usage', 'adjustment'].includes(type) || !quantity) {
      return res.status(400).json({ error: 'type and quantity required' });
    }
    const [prod] = await pool.query('SELECT current_stock FROM products WHERE id = ?', [req.params.id]);
    if (!prod.length) return res.status(404).json({ error: 'Product not found' });
    let newStock = prod[0].current_stock;
    if (type === 'purchase' || type === 'adjustment') newStock += Number(quantity);
    else newStock -= Number(quantity);
    if (newStock < 0) return res.status(400).json({ error: 'Stock cannot go negative' });
    await pool.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, req.params.id]);
    await pool.query(
      'INSERT INTO stock_movements (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)',
      [req.params.id, type, quantity, notes || null]
    );
    res.json({ id: req.params.id, current_stock: newStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
