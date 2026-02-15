import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Badge } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import { format } from 'date-fns';

const COLORS = ['#c9a962', '#e8d5a3', '#8b7355', '#4ade80', '#7dd3fc'];

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [serviceTrend, setServiceTrend] = useState([]);
  const [topStaff, setTopStaff] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const [o, w, s, t, att] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/weekly-revenue'),
          api.get('/dashboard/monthly-service-trend'),
          api.get('/dashboard/top-staff'),
          api.get('/attendance', { params: { date: today } }).catch(() => ({ data: [] })),
        ]);
        setOverview(o.data);
        setWeekly(w.data);
        setServiceTrend(s.data);
        setTopStaff(t.data);
        setTodayAttendance(Array.isArray(att.data) ? att.data : []);
      } catch (e) {
        console.error('Dashboard API error:', e.response?.data || e.message);
        setOverview({ todayAppointments: 0, completedToday: 0, cancelledToday: 0, todayRevenue: 0, monthlyRevenue: 0, lowStockAlerts: [], staffPresentToday: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" className="text-warning" />
      </div>
    );
  }

  const kpis = [
    { label: "Today's Appointments", value: overview?.todayAppointments ?? 0, icon: '📅' },
    { label: 'Completed Today', value: overview?.completedToday ?? 0, icon: '✅' },
    { label: 'Cancelled Today', value: overview?.cancelledToday ?? 0, icon: '❌' },
    { label: "Today's Revenue", value: `PKR ${Number(overview?.todayRevenue ?? 0).toLocaleString()}`, icon: '💰' },
    { label: 'Monthly Revenue', value: `PKR ${Number(overview?.monthlyRevenue ?? 0).toLocaleString()}`, icon: '📊' },
    { label: 'Staff Present', value: overview?.staffPresentToday ?? 0, icon: '👥' },
  ];

  const weekData = weekly.map((d) => ({ ...d, label: format(new Date(d.date), 'EEE') }));

  return (
    <>
      <h1 className="h4 mb-4 text-luxe-gold">Dashboard</h1>

      <Row className="g-3 mb-4">
        {kpis.map((k) => (
          <Col xs={6} md={4} lg={2} key={k.label}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex flex-column justify-content-center py-3">
                <span className="fs-4 mb-1">{k.icon}</span>
                <div className="text-luxe-muted small">{k.label}</div>
                <div className="fw-bold fs-5">{k.value}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {overview?.lowStockAlerts?.length > 0 && (
        <Card className="mb-4 border-warning">
          <Card.Header className="d-flex align-items-center gap-2">
            <span>⚠️</span> Low Stock Alerts
          </Card.Header>
          <Card.Body className="py-2">
            <div className="d-flex flex-wrap gap-2">
              {overview.lowStockAlerts.map((p) => (
                <Badge key={p.id} bg="warning" text="dark">{p.name} ({p.current_stock} left)</Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      <Row className="g-4">
        <Col lg={8}>
          <Card>
            <Card.Header>Weekly Revenue</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weekData}>
                  <XAxis dataKey="label" stroke="#8a8580" />
                  <YAxis stroke="#8a8580" tickFormatter={(v) => `PKR ${v}`} />
                  <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2d2d3a' }} formatter={(v) => [`PKR ${v}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#c9a962" strokeWidth={2} dot={{ fill: '#c9a962' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>Top Performing Staff</Card.Header>
            <Card.Body>
              {topStaff.length === 0 ? (
                <p className="text-muted small mb-0">No data yet</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {topStaff.map((s, i) => (
                    <li key={s.id} className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                      <span className="text-luxe-gold fw-bold">{i + 1}.</span>
                      <span>{s.full_name}</span>
                      <span className="text-luxe-gold">PKR {Number(s.revenue).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
          <Card>
            <Card.Header>Today&apos;s Attendance</Card.Header>
            <Card.Body>
              {todayAttendance.length === 0 ? (
                <p className="text-muted small mb-0">No attendance recorded for today</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {todayAttendance.map((a) => (
                    <li key={a.staff_id} className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
                      <span>{a.full_name}</span>
                      <Badge bg={a.status === 'present' ? 'success' : a.status === 'absent' ? 'danger' : a.status === 'leave' ? 'warning' : 'info'} text={a.status === 'leave' ? 'dark' : undefined}>
                        {a.status ? a.status.replace('_', ' ') : '—'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>Monthly Service Trend</Card.Header>
            <Card.Body>
              {serviceTrend.length === 0 ? (
                <p className="text-muted small mb-0">No service data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={serviceTrend} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" stroke="#8a8580" />
                    <YAxis type="category" dataKey="name" stroke="#8a8580" width={70} />
                    <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2d2d3a' }} />
                    <Bar dataKey="count" fill="#c9a962" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
