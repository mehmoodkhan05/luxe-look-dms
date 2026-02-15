import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, getStaffIdFromUserId } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

export function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

router.get('/overview', async (req, res) => {
  try {
    const today = formatDate(new Date());
    const startOfMonth = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    const [todayAppointments] = await pool.query(
      `SELECT COUNT(*) as total FROM appointments WHERE appointment_date = ?`,
      [today]
    );
    const [completedToday] = await pool.query(
      `SELECT COUNT(*) as total FROM appointments WHERE appointment_date = ? AND status = 'completed'`,
      [today]
    );
    const [cancelledToday] = await pool.query(
      `SELECT COUNT(*) as total FROM appointments WHERE appointment_date = ? AND status = 'cancelled'`,
      [today]
    );
    const [todayRevenue] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE DATE(created_at) = ? AND payment_status = 'paid'`,
      [today]
    );
    const [monthlyRevenue] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE DATE(created_at) >= ? AND payment_status = 'paid'`,
      [startOfMonth]
    );
    const [lowStock] = await pool.query(
      `SELECT id, name, current_stock, reorder_level FROM products WHERE current_stock <= reorder_level AND reorder_level > 0`
    );
    const [staffPresent] = await pool.query(
      `SELECT COUNT(DISTINCT a.staff_id) as total FROM attendance a
       JOIN staff s ON s.id = a.staff_id WHERE a.date = ? AND a.status = 'present'`,
      [today]
    );

    res.json({
      todayAppointments: todayAppointments[0].total,
      completedToday: completedToday[0].total,
      cancelledToday: cancelledToday[0].total,
      todayRevenue: Number(todayRevenue[0].total),
      monthlyRevenue: Number(monthlyRevenue[0].total),
      lowStockAlerts: lowStock,
      staffPresentToday: staffPresent[0].total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/weekly-revenue', async (req, res) => {
  try {
    const days = 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const [rows] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE DATE(created_at) = ? AND payment_status = 'paid'`,
        [dateStr]
      );
      result.push({ date: dateStr, revenue: Number(rows[0].total) });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly-service-trend', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.name, COUNT(ii.id) as count
       FROM invoice_items ii
       JOIN services s ON s.id = ii.service_id
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
       GROUP BY s.id, s.name ORDER BY count DESC LIMIT 8`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-staff', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT st.id, u.full_name, COUNT(i.id) as services_count, COALESCE(SUM(i.total_amount), 0) as revenue
       FROM staff st
       JOIN users u ON u.id = st.user_id
       LEFT JOIN invoices i ON i.staff_id = st.id AND i.payment_status = 'paid' AND i.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY st.id, u.full_name ORDER BY revenue DESC LIMIT 5`
    );
    res.json(rows.map(r => ({ ...r, revenue: Number(r.revenue) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
