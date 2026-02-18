import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import api from '../services/api';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Appointments() {
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const { totalPages } = useTablePagination(list.length);
  const [form, setForm] = useState({ customerId: '', staffId: '', serviceId: '', appointmentDate: '', startTime: '09:00', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/appointments', { params: { date: dateFilter } }).then((r) => setList(r.data));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/customers').then((r) => setCustomers(r.data)),
      api.get('/services').then((r) => setServices(r.data)),
      api.get('/staff').then((r) => setStaff(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
    load();
  }, [dateFilter]);

  const openAdd = () => {
    setForm({
      customerId: '',
      staffId: '',
      serviceId: '',
      appointmentDate: dateFilter,
      startTime: '09:00',
      notes: '',
    });
    setShow(true);
  };

  const save = async () => {
    if (!form.customerId || !form.serviceId || !form.appointmentDate || !form.startTime) {
      toast.error('Customer, service, date and time required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/appointments', {
        customerId: form.customerId,
        staffId: form.staffId || null,
        serviceId: form.serviceId,
        appointmentDate: form.appointmentDate,
        startTime: form.startTime,
        notes: form.notes,
      });
      toast.success('Appointment created');
      setShow(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      toast.success('Updated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const statusColor = (s) => ({ booked: 'secondary', confirmed: 'info', completed: 'success', cancelled: 'danger', no_show: 'dark' }[s] || 'secondary');

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 page-header-flex">
        <h1 className="h4 text-luxe-gold mb-0">Appointments</h1>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Form.Control
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto flex-grow-1 flex-md-grow-0"
          />
          <Button className="btn-luxe" onClick={openAdd} title="New appointment"><i className="fas fa-calendar-plus me-1" /><span className="d-none d-sm-inline">New Appointment</span></Button>
        </div>
      </div>

      <Card>
        <Card.Body>
          {loading && list.length === 0 ? (
            <div className="text-center py-4"><Spinner className="text-warning" /></div>
          ) : (
            <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginate(list, page).map((a) => (
                  <tr key={a.id}>
                    <td>{a.start_time?.slice(0, 5)}</td>
                    <td>{a.customer_name}</td>
                    <td>{a.service_name}</td>
                    <td>{a.staff_name || '—'}</td>
                    <td><Badge bg={statusColor(a.status)}>{a.status}</Badge></td>
                    <td>
                      {a.status === 'booked' || a.status === 'confirmed' ? (
                        <>
                          <Button variant="outline-success" size="sm" className="me-1" onClick={() => setStatus(a.id, 'completed')} title="Complete"><i className="fas fa-circle-check" /></Button>
                          <Button variant="outline-danger" size="sm" onClick={() => setStatus(a.id, 'cancelled')} title="Cancel"><i className="fas fa-circle-xmark" /></Button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && list.length === 0 && <p className="text-muted text-center py-4 mb-0">No appointments for this date</p>}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => setShow(false)} centered backdrop="static" fullscreen="sm-down">
        <Modal.Header closeButton><Modal.Title>New Appointment</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Customer</Form.Label>
            <Form.Select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} required>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} – {c.phone}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Service</Form.Label>
            <Form.Select value={form.serviceId} onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} required>
              <option value="">Select service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}{s.variant ? ` (${s.variant})` : ''} – PKR {s.price}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Staff</Form.Label>
            <Form.Select value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Date</Form.Label>
            <Form.Control type="date" value={form.appointmentDate} onChange={(e) => setForm((f) => ({ ...f, appointmentDate: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Start Time</Form.Label>
            <Form.Control type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Notes</Form.Label>
            <Form.Control as="textarea" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button className="btn-luxe" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
