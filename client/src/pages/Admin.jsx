import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Form, Modal, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';

const EXPENSE_CATEGORIES = ['Utilities', 'Rent', 'Supplies', 'Salaries', 'Marketing', 'Maintenance', 'Other'];

export default function Admin() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const today = format(new Date(), 'yyyy-MM-dd');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    expense_date: today,
    category: 'Supplies',
    amount: '',
    description: '',
    payment_method: 'cash',
  });
  const [filters, setFilters] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: today,
    category: '',
  });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { from: filters.from, to: filters.to };
    if (filters.category) params.category = filters.category;
    return api.get('/expenses', { params }).then((r) => setList(r.data));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [filters.from, filters.to, filters.category]);

  const filteredList = list;
  const { totalPages } = useTablePagination(filteredList.length);

  const todayTotal = list
    .filter((e) => e.expense_date === today)
    .reduce((s, e) => s + Number(e.amount), 0);
  const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const weekTotal = list
    .filter((e) => e.expense_date >= weekStart)
    .reduce((s, e) => s + Number(e.amount), 0);
  const monthStart = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const monthTotal = list
    .filter((e) => e.expense_date >= monthStart)
    .reduce((s, e) => s + Number(e.amount), 0);

  const openAdd = () => {
    setEditing(null);
    setForm({
      expense_date: today,
      category: 'Supplies',
      amount: '',
      description: '',
      payment_method: 'cash',
    });
    setShow(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setForm({
      expense_date: e.expense_date,
      category: e.category,
      amount: e.amount,
      description: e.description || '',
      payment_method: e.payment_method || 'cash',
    });
    setShow(true);
  };

  const save = async () => {
    if (!form.expense_date || !form.category || form.amount === '' || form.amount == null) {
      toast.error('Date, category and amount required');
      return;
    }
    const amt = Number(form.amount);
    if (isNaN(amt) || amt < 0) {
      toast.error('Invalid amount');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, {
          expense_date: form.expense_date,
          category: form.category,
          amount: amt,
          description: form.description || null,
          payment_method: form.payment_method,
        });
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', {
          expense_date: form.expense_date,
          category: form.category,
          amount: amt,
          description: form.description || null,
          payment_method: form.payment_method,
        });
        toast.success('Expense added');
      }
      setShow(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h1 className="h4 text-luxe-gold mb-0">Expenses</h1>
        <Button className="btn-luxe" onClick={openAdd} title="Add expense">
          <i className="fas fa-plus me-1" />
          <span className="d-none d-sm-inline">Add Expense</span>
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={6} md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <span className="fs-5 mb-1">📅</span>
              <div className="text-luxe-muted small">Today</div>
              <div className="fw-bold fs-5 text-danger">PKR {todayTotal.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <span className="fs-5 mb-1">📆</span>
              <div className="text-luxe-muted small">Last 7 Days</div>
              <div className="fw-bold fs-5 text-warning">PKR {weekTotal.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <span className="fs-5 mb-1">📊</span>
              <div className="text-luxe-muted small">Last 30 Days</div>
              <div className="fw-bold fs-5 text-luxe-gold">PKR {monthTotal.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={3}>
              <Form.Control
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </Col>
            <Col md={3}>
              <Form.Control
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" onClick={() => { setLoading(true); load().finally(() => setLoading(false)); }} title="Refresh">
                <i className="fas fa-sync-alt" />
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-4"><Spinner className="text-warning" /></div>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Payment</th>
                    <th>Added by</th>
                    {canEdit && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginate(filteredList, page).map((e) => (
                    <tr key={e.id}>
                      <td>{format(new Date(e.expense_date), 'dd MMM yyyy')}</td>
                      <td>{e.category}</td>
                      <td className="fw-bold text-danger">PKR {Number(e.amount).toLocaleString()}</td>
                      <td className="text-truncate" style={{ maxWidth: 180 }}>{e.description || '—'}</td>
                      <td>{e.payment_method?.replace('_', ' ') || 'cash'}</td>
                      <td className="text-luxe-muted small">{e.added_by_name || '—'}</td>
                      {canEdit && (
                        <td>
                          <Button variant="outline-luxe" size="sm" className="me-1" onClick={() => openEdit(e)} title="Edit">
                            <i className="fas fa-pen" />
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => remove(e.id)} title="Delete">
                            <i className="fas fa-trash" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
              <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && filteredList.length === 0 && (
            <p className="text-muted text-center py-4 mb-0">No expenses. Add one above.</p>
          )}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => { setShow(false); setEditing(null); }} centered backdrop="static" fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Expense' : 'Add Expense'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Category</Form.Label>
            <Form.Select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Amount (PKR)</Form.Label>
            <Form.Control
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Description (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Payment Method</Form.Label>
            <Form.Select
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_payment">Mobile Payment</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShow(false); setEditing(null); }}>Cancel</Button>
          <Button className="btn-luxe" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
