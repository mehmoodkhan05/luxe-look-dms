import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date || formatDate(new Date());
    const [appointments] = await pool.query(
      `SELECT COUNT(*) as total FROM appointments WHERE appointment_date = ?`,
      [date]
    );
    const [revenue] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE DATE(created_at) = ? AND payment_status = 'paid'`,
      [date]
    );
    const [paymentBreakdown] = await pool.query(
      `SELECT payment_method, SUM(total_amount) as total FROM invoices WHERE DATE(created_at) = ? AND payment_status = 'paid' GROUP BY payment_method`,
      [date]
    );
    res.json({
      date,
      totalAppointments: appointments[0].total,
      revenue: Number(revenue[0].total),
      paymentBreakdown: paymentBreakdown.map(r => ({ ...r, total: Number(r.total) })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/weekly', async (req, res) => {
  try {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const [rev] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE DATE(created_at) = ? AND payment_status = 'paid'`,
        [dateStr]
      );
      const [apt] = await pool.query(
        `SELECT COUNT(*) as c FROM appointments WHERE appointment_date = ? AND status = 'completed'`,
        [dateStr]
      );
      result.push({ date: dateStr, revenue: Number(rev[0].total), completedAppointments: apt[0].c });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const monthYear = req.query.monthYear || formatDate(new Date()).slice(0, 7);
    const start = monthYear + '-01';
    const end = monthYear + '-31';
    const [revenue] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE DATE(created_at) BETWEEN ? AND ? AND payment_status = 'paid'`,
      [start, end]
    );
    const [staffPerf] = await pool.query(
      `SELECT u.full_name, COUNT(i.id) as invoices_count, COALESCE(SUM(i.total_amount), 0) as revenue
       FROM staff st JOIN users u ON u.id = st.user_id
       LEFT JOIN invoices i ON i.staff_id = st.id AND i.payment_status = 'paid' AND DATE(i.created_at) BETWEEN ? AND ?
       GROUP BY st.id, u.full_name`,
      [start, end]
    );
    const [invUsage] = await pool.query(
      `SELECT type, SUM(quantity) as total FROM stock_movements WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY type`,
      [start, end]
    );
    res.json({
      monthYear,
      totalRevenue: Number(revenue[0].total),
      staffPerformance: staffPerf.map(r => ({ ...r, revenue: Number(r.revenue) })),
      inventoryUsage: invUsage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/staff-performance', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT st.id, u.full_name, COUNT(i.id) as services_count, COALESCE(SUM(i.total_amount), 0) as revenue
       FROM staff st JOIN users u ON u.id = st.user_id
       LEFT JOIN invoices i ON i.staff_id = st.id AND i.payment_status = 'paid'
       GROUP BY st.id, u.full_name ORDER BY revenue DESC`
    );
    res.json(rows.map(r => ({ ...r, revenue: Number(r.revenue) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
