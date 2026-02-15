import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET list: all staff with their attendance for a date (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'Query date (YYYY-MM-DD) required' });
    const [rows] = await pool.query(
      `SELECT st.id AS staff_id, u.full_name, a.id AS attendance_id, a.status, a.notes,
              a.half_day_from, a.half_day_to
       FROM staff st
       JOIN users u ON u.id = st.user_id
       LEFT JOIN attendance a ON a.staff_id = st.id AND a.date = ?
       ORDER BY u.full_name`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT upsert: mark attendance for one staff on one date (admin only)
router.put('/', requireRole('admin'), async (req, res) => {
  try {
    const { staff_id, date, status, notes, half_day_from, half_day_to } = req.body;
    if (!staff_id || !date) return res.status(400).json({ error: 'staff_id and date required' });
    const allowed = ['present', 'absent', 'leave', 'half_day'];
    const s = allowed.includes(status) ? status : 'present';
    const fromTime = s === 'half_day' && half_day_from ? half_day_from : null;
    const toTime = s === 'half_day' && half_day_to ? half_day_to : null;
    await pool.query(
      `INSERT INTO attendance (staff_id, date, status, notes, half_day_from, half_day_to)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes),
         half_day_from = VALUES(half_day_from), half_day_to = VALUES(half_day_to)`,
      [staff_id, date, s, notes || null, fromTime, toTime]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
