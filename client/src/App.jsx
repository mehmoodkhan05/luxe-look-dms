import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Appointments from './pages/Appointments';
import Services from './pages/Services';
import Invoices from './pages/Invoices';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import Payroll from './pages/Payroll';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex align-items-center justify-content-center min-vh-100"><div className="spinner-border text-warning" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<PrivateRoute roles={['admin', 'receptionist', 'staff']}><Customers /></PrivateRoute>} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="services" element={<PrivateRoute roles={['admin', 'staff']}><Services /></PrivateRoute>} />
        <Route path="invoices" element={<PrivateRoute roles={['admin', 'receptionist', 'staff']}><Invoices /></PrivateRoute>} />
        <Route path="inventory" element={<PrivateRoute roles={['admin', 'staff']}><Inventory /></PrivateRoute>} />
        <Route path="staff" element={<PrivateRoute roles={['admin']}><Staff /></PrivateRoute>} />
        <Route path="payroll" element={<PrivateRoute roles={['admin']}><Payroll /></PrivateRoute>} />
        <Route path="attendance" element={<PrivateRoute roles={['admin']}><Attendance /></PrivateRoute>} />
        <Route path="reports" element={<PrivateRoute roles={['admin', 'receptionist']}><Reports /></PrivateRoute>} />
        <Route path="admin" element={<PrivateRoute roles={['admin', 'receptionist', 'staff']}><Admin /></PrivateRoute>} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
