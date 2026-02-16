import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole, getStaffIdFromUserId } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { monthYear } = req.query;
    let sql = `
      SELECT p.*, u.full_name FROM payroll p
      JOIN staff st ON st.id = p.staff_id JOIN users u ON u.id = st.user_id
      WHERE 1=1
    `;
    const params = [];
    if (monthYear) { sql += ' AND p.month_year = ?'; params.push(monthYear); }
    sql += ' ORDER BY p.month_year DESC, u.full_name';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-commission', async (req, res) => {
  try {
    const staffId = await getStaffIdFromUserId(req.userId);
    if (!staffId) return res.json({ commissionEarned: 0, invoices: [] });
    const [rows] = await pool.query(
      `SELECT i.id, i.invoice_number, i.total_amount, i.created_at
       FROM invoices i
       LEFT JOIN appointments a ON a.id = i.appointment_id
       WHERE i.staff_id = ? AND i.payment_status = 'paid' AND (i.appointment_id IS NULL OR a.status != 'cancelled')
       AND i.created_at >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
       ORDER BY i.created_at DESC`,
      [staffId]
    );
    const [comm] = await pool.query(
      `SELECT st.commission_type, st.commission_value FROM staff st WHERE st.id = ?`,
      [staffId]
    );
    res.json({ invoices: rows, commissionConfig: comm[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calculate', requireRole('admin'), async (req, res) => {
  try {
    const { monthYear } = req.body;
    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ error: 'monthYear required (YYYY-MM)' });
    }
    const [staffList] = await pool.query('SELECT id, user_id, monthly_salary, commission_type, commission_value FROM staff');
    const [start, end] = [monthYear + '-01', monthYear + '-31'];
    for (const st of staffList) {
      const [inv] = await pool.query(
        `SELECT COALESCE(SUM(i.total_amount), 0) as total FROM invoices i
         LEFT JOIN appointments a ON a.id = i.appointment_id
         WHERE i.staff_id = ? AND i.payment_status = 'paid' AND DATE(i.created_at) BETWEEN ? AND ? AND (i.appointment_id IS NULL OR a.status != 'cancelled')`,
        [st.id, start, end]
      );
      const rev = Number(inv[0].total);
      let commission = 0;
      if (st.commission_type === 'percentage') commission = (rev * st.commission_value) / 100;
      else commission = 0; // fixed would need count of services
      const [count] = await pool.query(
        `SELECT COUNT(*) as c FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
         LEFT JOIN appointments a ON a.id = i.appointment_id
         WHERE i.staff_id = ? AND i.payment_status = 'paid' AND DATE(i.created_at) BETWEEN ? AND ? AND (i.appointment_id IS NULL OR a.status != 'cancelled')`,
        [st.id, start, end]
      );
      if (st.commission_type === 'fixed') commission = (count[0].c || 0) * st.commission_value;
      const net = Number(st.monthly_salary) + commission;
      await pool.query(
        `INSERT INTO payroll (staff_id, month_year, base_salary, commission_earned, deductions, net_payable, status)
         VALUES (?, ?, ?, ?, 0, ?, 'draft') ON DUPLICATE KEY UPDATE base_salary = VALUES(base_salary), commission_earned = VALUES(commission_earned), net_payable = VALUES(net_payable)`,
        [st.id, monthYear, st.monthly_salary, commission, net]
      );
    }
    res.json({ monthYear, message: 'Payroll calculated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'processed', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query('UPDATE payroll SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ id: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
