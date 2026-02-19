import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, getStaffIdFromUserId } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function formatInvoiceNumber(id) {
  return 'INV-' + String(id).padStart(4, '0');
}

router.get('/', async (req, res) => {
  try {
    const { from, to, customerId, paymentStatus } = req.query;
    let sql = `
      SELECT i.*, c.full_name as customer_name, u.full_name as staff_name,
        (SELECT GROUP_CONCAT(COALESCE(ii.service_name, ii.product_name) SEPARATOR ', ')
         FROM invoice_items ii WHERE ii.invoice_id = i.id) as items_summary
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN staff st ON st.id = i.staff_id
      LEFT JOIN users u ON u.id = st.user_id
      WHERE 1=1
    `;
    const params = [];
    if (from) { sql += ' AND DATE(i.created_at) >= ?'; params.push(from); }
    if (to) { sql += ' AND DATE(i.created_at) <= ?'; params.push(to); }
    if (customerId) { sql += ' AND i.customer_id = ?'; params.push(customerId); }
    if (paymentStatus) { sql += ' AND i.payment_status = ?'; params.push(paymentStatus); }
    sql += ' ORDER BY i.created_at DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [inv] = await pool.query(
      `SELECT i.*, c.full_name as customer_name, c.phone, c.email, c.address, u.full_name as staff_name
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       LEFT JOIN staff st ON st.id = i.staff_id LEFT JOIN users u ON u.id = st.user_id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!inv.length) return res.status(404).json({ error: 'Not found' });
    const [items] = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [req.params.id]
    );
    res.json({ ...inv[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customerId, staffId, appointmentId, items, taxAmount, discount, paymentMethod, paymentStatus } = req.body;
    if (!customerId || !items || !items.length) {
      return res.status(400).json({ error: 'customerId and items required' });
    }
    const subtotal = items.reduce((sum, i) => sum + (i.unit_price * (i.quantity || 1)), 0);
    const total = subtotal + (taxAmount || 0) - (discount || 0);
    const tempInvNum = 'INV-TMP-' + Date.now();
    const [result] = await pool.query(
      `INSERT INTO invoices (invoice_number, appointment_id, customer_id, staff_id, subtotal, tax_amount, discount, total_amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tempInvNum, appointmentId || null, customerId, staffId || null, subtotal, taxAmount || 0, discount || 0, total, paymentMethod || 'cash', paymentStatus || 'paid']
    );
    const invoiceId = result.insertId;
    const invNum = formatInvoiceNumber(invoiceId);
    await pool.query('UPDATE invoices SET invoice_number = ? WHERE id = ?', [invNum, invoiceId]);
    for (const it of items) {
      const qty = it.quantity || 1;
      const totalItem = it.unit_price * qty;
      const isProduct = it.productId != null;
      if (isProduct) {
        await pool.query(
          'INSERT INTO invoice_items (invoice_id, service_id, service_name, product_id, product_name, quantity, unit_price, total) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)',
          [invoiceId, it.productId, it.productName || null, qty, it.unit_price, totalItem]
        );
      } else {
        await pool.query(
          'INSERT INTO invoice_items (invoice_id, service_id, service_name, product_id, product_name, quantity, unit_price, total) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)',
          [invoiceId, it.serviceId, it.serviceName || null, qty, it.unit_price, totalItem]
        );
      }
    }
    if (appointmentId) {
      await pool.query("UPDATE appointments SET status = 'completed' WHERE id = ?", [appointmentId]);
      const [apt] = await pool.query('SELECT customer_id FROM appointments WHERE id = ?', [appointmentId]);
      if (apt[0]) {
        await pool.query(
          'UPDATE customers SET visit_count = visit_count + 1, total_spending = total_spending + ? WHERE id = ?',
          [total, apt[0].customer_id]
        );
      }
    } else {
      await pool.query(
        'UPDATE customers SET total_spending = total_spending + ?, visit_count = visit_count + 1 WHERE id = ?',
        [total, customerId]
      );
    }
    res.status(201).json({ id: invoiceId, invoice_number: invNum, total_amount: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const updates = [];
    const params = [];
    if (paymentStatus !== undefined) { updates.push('payment_status = ?'); params.push(paymentStatus); }
    if (paymentMethod !== undefined) { updates.push('payment_method = ?'); params.push(paymentMethod); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ id: req.params.id, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
