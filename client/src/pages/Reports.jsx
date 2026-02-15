import { useState, useEffect } from 'react';
import { Card, Table, Form, Row, Col } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import { format } from 'date-fns';

export default function Reports() {
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [staffPerf, setStaffPerf] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [dailyPage, setDailyPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const dailyPayments = daily?.paymentBreakdown || [];
  const monthlyStaff = monthly?.staffPerformance || [];
  const { totalPages: dailyTotalPages } = useTablePagination(dailyPayments.length);
  const { totalPages: monthlyTotalPages } = useTablePagination(monthlyStaff.length);
  const { totalPages: staffTotalPages } = useTablePagination(staffPerf.length);

  useEffect(() => {
    api.get('/reports/daily', { params: { date } }).then((r) => setDaily(r.data));
  }, [date]);

  useEffect(() => {
    api.get('/reports/weekly').then((r) => setWeekly(r.data));
  }, []);

  useEffect(() => {
    api.get('/reports/monthly', { params: { monthYear } }).then((r) => setMonthly(r.data));
  }, [monthYear]);

  useEffect(() => {
    api.get('/reports/staff-performance').then((r) => setStaffPerf(r.data));
  }, []);

  useEffect(() => {
    setLoading(!daily || !monthly);
  }, [daily, monthly]);

  return (
    <>
      <h1 className="h4 text-luxe-gold mb-4">Reports</h1>

      <Row className="g-4">
        <Col md={6}>
          <Card>
            <Card.Header>Daily Report</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Date</Form.Label>
                <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Form.Group>
              {daily && (
                <>
                  <p className="mb-1"><strong>Appointments:</strong> {daily.totalAppointments}</p>
                  <p className="mb-1"><strong>Revenue:</strong> PKR {Number(daily.revenue).toLocaleString()}</p>
                  {dailyPayments.length > 0 && (
                    <>
                      <Table size="sm" className="mb-0 mt-2">
                        <thead><tr><th>Method</th><th>Amount</th></tr></thead>
                        <tbody>
                          {paginate(dailyPayments, dailyPage).map((b) => (
                            <tr key={b.payment_method}><td>{b.payment_method}</td><td>PKR {Number(b.total).toLocaleString()}</td></tr>
                          ))}
                        </tbody>
                      </Table>
                      <TablePagination currentPage={dailyPage} totalPages={dailyTotalPages} onPageChange={setDailyPage} />
                    </>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Weekly Revenue Trend</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weekly.map((d) => ({ ...d, label: format(new Date(d.date), 'EEE') }))}>
                  <XAxis dataKey="label" stroke="#8a8580" />
                  <YAxis stroke="#8a8580" tickFormatter={(v) => `PKR ${v}`} />
                  <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2d2d3a' }} formatter={(v) => [`PKR ${v}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#c9a962" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Monthly Summary</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Month</Form.Label>
                <Form.Control type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
              </Form.Group>
              {monthly && (
                <>
                  <p className="mb-2"><strong>Total Revenue:</strong> PKR {Number(monthly.totalRevenue).toLocaleString()}</p>
                  {monthlyStaff.length > 0 && (
                    <>
                      <Table size="sm">
                        <thead><tr><th>Staff</th><th>Revenue</th></tr></thead>
                        <tbody>
                          {paginate(monthlyStaff, monthlyPage).map((s) => (
                            <tr key={s.full_name}><td>{s.full_name}</td><td>PKR {Number(s.revenue).toLocaleString()}</td></tr>
                          ))}
                        </tbody>
                      </Table>
                      <TablePagination currentPage={monthlyPage} totalPages={monthlyTotalPages} onPageChange={setMonthlyPage} />
                    </>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Staff Performance (All Time)</Card.Header>
            <Card.Body>
              {staffPerf.length === 0 ? (
                <p className="text-muted small mb-0">No data</p>
              ) : (
                <>
                  <Table size="sm">
                    <thead>
                      <tr><th>Staff</th><th>Services</th><th>Revenue</th></tr>
                    </thead>
                    <tbody>
                      {paginate(staffPerf, staffPage).map((s) => (
                        <tr key={s.id}>
                          <td>{s.full_name}</td>
                          <td>{s.services_count}</td>
                          <td>PKR {Number(s.revenue).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <TablePagination currentPage={staffPage} totalPages={staffTotalPages} onPageChange={setStaffPage} />
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
