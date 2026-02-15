import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import api from '../services/api';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';

export default function Staff() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', role: 'staff', phone: '',
    monthlySalary: 0, commissionType: 'percentage', commissionValue: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const { totalPages } = useTablePagination(list.length);

  const load = () => api.get('/staff').then((r) => setList(r.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      email: '', password: '', fullName: '', role: 'staff', phone: '',
      monthlySalary: 0, commissionType: 'percentage', commissionValue: 0,
      is_active: true,
    });
    setShow(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      fullName: s.full_name,
      email: s.email,
      phone: s.phone || '',
      monthlySalary: s.monthly_salary ?? 0,
      commissionType: s.commission_type || 'percentage',
      commissionValue: s.commission_value ?? 0,
      is_active: s.is_active !== 0,
    });
    setShow(true);
  };

  const save = async () => {
    if (editing) {
      if (!form.fullName?.trim()) {
        toast.error('Full name required');
        return;
      }
      setSaving(true);
      try {
        await api.put(`/staff/${editing.id}`, {
          fullName: form.fullName,
          phone: form.phone || null,
          monthlySalary: Number(form.monthlySalary) || 0,
          commissionType: form.commissionType,
          commissionValue: Number(form.commissionValue) || 0,
          is_active: form.is_active,
        });
        toast.success('Staff updated');
        setShow(false);
        setEditing(null);
        load();
      } catch (e) {
        toast.error(e.response?.data?.error || 'Failed');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!form.email || !form.fullName) {
      toast.error('Email and name required');
      return;
    }
    if (form.role === 'staff' && !form.password) {
      toast.error('Password required for new staff');
      return;
    }
    setSaving(true);
    try {
      await api.post('/staff', {
        email: form.email,
        password: form.password || 'changeme',
        fullName: form.fullName,
        role: form.role,
        phone: form.phone,
        monthlySalary: form.role === 'staff' ? Number(form.monthlySalary) : 0,
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue) || 0,
      });
      toast.success('Staff added');
      setShow(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 text-luxe-gold mb-0">Staff</h1>
        <Button className="btn-luxe" onClick={openAdd} title="Add staff"><i className="fas fa-user-plus me-1" /><span className="d-none d-sm-inline">Add Staff</span></Button>
      </div>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4"><Spinner className="text-warning" /></div>
          ) : (
            <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Salary</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginate(list, page).map((s) => (
                  <tr key={s.id}>
                    <td>{s.full_name}</td>
                    <td>{s.email}</td>
                    <td><Badge bg="secondary">{s.role}</Badge></td>
                    <td>{s.monthly_salary != null ? `PKR ${Number(s.monthly_salary).toLocaleString()}` : '—'}</td>
                    <td>{s.commission_type === 'percentage' ? `${s.commission_value}%` : s.commission_type === 'fixed' ? `PKR ${s.commission_value}` : '—'}</td>
                    <td><Badge bg={s.is_active ? 'success' : 'danger'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td>
                      <Button variant="outline-luxe" size="sm" onClick={() => openEdit(s)} title="Edit"><i className="fas fa-pen" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && list.length === 0 && <p className="text-muted text-center py-4 mb-0">No staff. Add one (or use Receptionist/Admin from backend).</p>}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => { setShow(false); setEditing(null); }} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>{editing ? 'Edit Staff' : 'Add Staff'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Full Name</Form.Label>
            <Form.Control value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              readOnly={!!editing}
              disabled={!!editing}
              title={editing ? 'Email cannot be changed' : undefined}
            />
          </Form.Group>
          {!editing && (
            <>
              <Form.Group className="mb-2">
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 chars" />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Role</Form.Label>
                <Form.Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="staff">Staff</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="admin">Admin</option>
                </Form.Select>
              </Form.Group>
            </>
          )}
          <Form.Group className="mb-2">
            <Form.Label>Phone</Form.Label>
            <Form.Control value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Monthly Salary (PKR)</Form.Label>
            <Form.Control type="number" min={0} value={form.monthlySalary} onChange={(e) => setForm((f) => ({ ...f, monthlySalary: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Commission Type</Form.Label>
            <Form.Select value={form.commissionType} onChange={(e) => setForm((f) => ({ ...f, commissionType: e.target.value }))}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed per service</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>{form.commissionType === 'percentage' ? 'Commission %' : 'Commission (PKR) per service'}</Form.Label>
            <Form.Control type="number" min={0} step={0.01} value={form.commissionValue} onChange={(e) => setForm((f) => ({ ...f, commissionValue: e.target.value }))} />
          </Form.Group>
          {editing && (
            <Form.Group>
              <Form.Check
                type="switch"
                id="is_active"
                label="Active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShow(false); setEditing(null); }} title="Cancel"><i className="fas fa-xmark me-1" />Cancel</Button>
          <Button className="btn-luxe" onClick={save} disabled={saving} title={editing ? 'Update' : 'Add'}><i className="fas fa-check me-1" />{saving ? 'Saving…' : editing ? 'Update' : 'Add'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
