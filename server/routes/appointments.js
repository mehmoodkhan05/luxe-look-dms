import { Router } from 'express';
import pool from '../config/db.js';
import { authMiddleware, getStaffIdFromUserId } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  try {
    const { date, staffId, status } = req.query;
    let sql = `
      SELECT a.*, c.full_name as customer_name, c.phone as customer_phone,
             s.name as service_name, s.duration_minutes, s.price,
             u.full_name as staff_name
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      JOIN services s ON s.id = a.service_id
      LEFT JOIN staff st ON st.id = a.staff_id
      LEFT JOIN users u ON u.id = st.user_id
      WHERE 1=1
    `;
    const params = [];
    if (date) {
      sql += ' AND a.appointment_date = ?';
      params.push(date);
    }
    if (staffId) {
      sql += ' AND a.staff_id = ?';
      params.push(staffId);
    }
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (req.role === 'staff') {
      const staffIdFromUser = await getStaffIdFromUserId(req.userId);
      if (!staffIdFromUser) {
        return res.json([]);
      }
      sql += ' AND a.staff_id = ?';
      params.push(staffIdFromUser);
    }
    sql += ' ORDER BY a.appointment_date, a.start_time';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.full_name as customer_name, c.phone, c.email, s.name as service_name, s.duration_minutes, s.price,
       u.full_name as staff_name FROM appointments a
       JOIN customers c ON c.id = a.customer_id JOIN services s ON s.id = a.service_id
       LEFT JOIN staff st ON st.id = a.staff_id LEFT JOIN users u ON u.id = st.user_id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customerId, staffId, serviceId, appointmentDate, startTime, notes } = req.body;
    if (!customerId || !serviceId || !appointmentDate || !startTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const [svc] = await pool.query('SELECT duration_minutes FROM services WHERE id = ?', [serviceId]);
    const duration = (svc[0]?.duration_minutes) || 60;
    const [startH, startM] = startTime.toString().split(':').map(Number);
    const end = new Date(2000, 0, 1, startH, startM + duration, 0);
    const endTime = end.getHours().toString().padStart(2, '0') + ':' + end.getMinutes().toString().padStart(2, '0');

    const [result] = await pool.query(
      `INSERT INTO appointments (customer_id, staff_id, service_id, appointment_date, start_time, end_time, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, staffId || null, serviceId, appointmentDate, startTime, endTime, notes || null, req.userId]
    );
    res.status(201).json({ id: result.insertId, appointmentDate, startTime, endTime, status: 'booked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { customerId, staffId, serviceId, appointmentDate, startTime, status, notes } = req.body;
    const updates = [];
    const params = [];
    if (customerId !== undefined) { updates.push('customer_id = ?'); params.push(customerId); }
    if (staffId !== undefined) { updates.push('staff_id = ?'); params.push(staffId); }
    if (serviceId !== undefined) { updates.push('service_id = ?'); params.push(serviceId); }
    if (appointmentDate !== undefined) { updates.push('appointment_date = ?'); params.push(appointmentDate); }
    if (startTime !== undefined) { updates.push('start_time = ?'); params.push(startTime); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ id: req.params.id, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ id: req.params.id, status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
