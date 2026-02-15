import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, InputGroup, Spinner } from 'react-bootstrap';
import api from '../services/api';
import toast from 'react-hot-toast';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';

export default function Customers() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { totalPages } = useTablePagination(list.length);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/customers', { params: { search } }).then((r) => setList(r.data));

  useEffect(() => {
    setPage(1);
    load().finally(() => setLoading(false));
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ fullName: '', phone: '', email: '', address: '' });
    setShow(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ fullName: c.full_name, phone: c.phone, email: c.email || '', address: c.address || '' });
    setShow(true);
  };

  const save = async () => {
    if (!form.fullName.trim() || !form.phone.trim()) {
      toast.error('Name and phone required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, { ...form, fullName: form.fullName });
        toast.success('Customer updated');
      } else {
        await api.post('/customers', { ...form, fullName: form.fullName });
        toast.success('Customer added');
      }
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
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h4 text-luxe-gold mb-0">Customers</h1>
        <Button className="btn-luxe" onClick={openAdd} title="Add customer"><i className="fas fa-user-plus me-1" /><span className="d-none d-sm-inline">Add Customer</span></Button>
      </div>

      <Card>
        <Card.Body>
          <InputGroup className="mb-3">
            <Form.Control
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          {loading ? (
            <div className="text-center py-4"><Spinner className="text-warning" /></div>
          ) : (
            <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Visits</th>
                  <th>Total Spent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginate(list, page).map((c) => (
                  <tr key={c.id}>
                    <td>{c.full_name}</td>
                    <td>{c.phone}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.visit_count}</td>
                    <td>PKR {Number(c.total_spending || 0).toLocaleString()}</td>
                    <td>
                      <Button variant="outline-luxe" size="sm" onClick={() => openEdit(c)} title="Edit"><i className="fas fa-pen" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
            </>
          )}
          {!loading && list.length === 0 && <p className="text-muted text-center py-3 mb-0">No customers found</p>}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => setShow(false)} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>{editing ? 'Edit Customer' : 'Add Customer'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Full Name</Form.Label>
            <Form.Control value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Phone</Form.Label>
            <Form.Control value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Address</Form.Label>
            <Form.Control as="textarea" rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)} title="Cancel"><i className="fas fa-xmark me-1" />Cancel</Button>
          <Button className="btn-luxe" onClick={save} disabled={saving} title="Save"><i className="fas fa-check me-1" />{saving ? 'Saving…' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
