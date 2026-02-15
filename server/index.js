import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import customerRoutes from './routes/customers.js';
import appointmentRoutes from './routes/appointments.js';
import serviceRoutes from './routes/services.js';
import invoiceRoutes from './routes/invoices.js';
import inventoryRoutes from './routes/inventory.js';
import staffRoutes from './routes/staff.js';
import payrollRoutes from './routes/payroll.js';
import reportRoutes from './routes/reports.js';
import expenseRoutes from './routes/expenses.js';
import { seedAdmin } from './scripts/seed.js';
import { testConnection } from './config/db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ name: 'Luxe Look DMS API', status: 'running', health: '/api/health' });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Luxe Look DMS API',
    version: '1.0',
    endpoints: ['/api/health', '/api/auth', '/api/dashboard', '/api/customers', '/api/appointments', '/api/services', '/api/invoices', '/api/inventory', '/api/staff', '/api/payroll', '/api/reports', '/api/expenses'],
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/expenses', expenseRoutes);

const healthHandler = async (req, res) => {
  try {
    const { ok, database } = await testConnection();
    res.json({ ok, database });
  } catch (e) {
    const errMsg = e.message || e.code || e.errno || String(e);
    res.status(500).json({ ok: false, error: errMsg, code: e.code });
  }
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

(async () => {
  try {
    await testConnection();
  } catch {
    // DB connection failed; app may still start for health check
  }
  try {
    await seedAdmin();
  } catch {
    // Seed skipped (DB may not exist yet)
  }
  app.listen(PORT);
})();
