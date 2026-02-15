import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import api from '../services/api';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Invoices() {
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(null);
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const { totalPages } = useTablePagination(list.length);
  const detailItems = detail?.items || [];
  const { totalPages: detailTotalPages } = useTablePagination(detailItems.length);
  const [form, setForm] = useState({
    customerId: '', staffId: '', items: [{ serviceId: '', serviceName: '', unit_price: '', quantity: 1 }],
    taxAmount: 0, discount: 0, paymentMethod: 'cash', paymentStatus: 'paid',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/invoices', { params: { from, to } }).then((r) => setList(r.data));
  };

  useEffect(() => {
    Promise.all([
      api.get('/customers').then((r) => setCustomers(r.data)),
      api.get('/services').then((r) => setServices(r.data)),
      api.get('/staff').then((r) => setStaff(r.data)),
    ]).then(() => load()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
    if (customers.length) load();
  }, [from, to]);

  const openNew = () => {
    setForm({
      customerId: '',
      staffId: '',
      items: [{ serviceId: '', serviceName: '', unit_price: '', quantity: 1 }],
      taxAmount: 0,
      discount: 0,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
    });
    setShow(true);
  };

  const addLine = () => {
    setForm((f) => ({ ...f, items: [...f.items, { serviceId: '', serviceName: '', unit_price: '', quantity: 1 }] }));
  };

  const updateLine = (i, field, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };
      if (field === 'serviceId') {
        const svc = services.find((s) => s.id === Number(value));
        if (svc) items[i].serviceName = svc.name; items[i].unit_price = svc.price;
      }
      return { ...f, items };
    });
  };

  const removeLine = (i) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  };

  const save = async () => {
    if (!form.customerId || !form.items.length || form.items.every((it) => !it.serviceId)) {
      toast.error('Select customer and at least one service');
      return;
    }
    const items = form.items.filter((it) => it.serviceId && it.unit_price).map((it) => ({
      serviceId: it.serviceId,
      serviceName: it.serviceName,
      unit_price: Number(it.unit_price),
      quantity: Number(it.quantity) || 1,
    }));
    if (!items.length) {
      toast.error('Add at least one service with price');
      return;
    }
    setSaving(true);
    try {
      await api.post('/invoices', {
        customerId: form.customerId,
        staffId: form.staffId || null,
        items,
        taxAmount: Number(form.taxAmount) || 0,
        discount: Number(form.discount) || 0,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
      });
      toast.success('Invoice created');
      setShow(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const viewDetail = (id) => {
    setDetailPage(1);
    api.get(`/invoices/${id}`).then((r) => setDetail(r.data));
  };

  const subtotal = form.items.reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);
  const total = subtotal + (Number(form.taxAmount) || 0) - (Number(form.discount) || 0);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h1 className="h4 text-luxe-gold mb-0">Invoices</h1>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <Form.Control type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
          <Form.Control type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
          <Button className="btn-luxe" onClick={openNew} title="New invoice"><i className="fas fa-receipt me-1" /><span className="d-none d-sm-inline">New Invoice</span></Button>
        </div>
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
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginate(list, page).map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number}</td>
                    <td>{inv.created_at && format(new Date(inv.created_at), 'dd MMM yyyy')}</td>
                    <td>{inv.customer_name}</td>
                    <td>PKR {Number(inv.total_amount).toLocaleString()}</td>
                    <td><Badge bg={inv.payment_status === 'paid' ? 'success' : 'warning'}>{inv.payment_status}</Badge></td>
                    <td><Button variant="outline-luxe" size="sm" onClick={() => viewDetail(inv.id)} title="View"><i className="fas fa-eye" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && list.length === 0 && <p className="text-muted text-center py-4 mb-0">No invoices in range</p>}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg" backdrop="static">
        <Modal.Header closeButton><Modal.Title>New Invoice</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Customer</Form.Label>
            <Form.Select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}>
              <option value="">Select</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Staff (optional)</Form.Label>
            <Form.Select value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
              <option value="">—</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Form.Select>
          </Form.Group>
          <div className="mb-2 d-flex justify-content-between align-items-center">
            <Form.Label className="mb-0">Items</Form.Label>
            <Button variant="outline-luxe" size="sm" onClick={addLine} title="Add line"><i className="fas fa-plus" /></Button>
          </div>
          {form.items.map((it, i) => (
            <div key={i} className="d-flex gap-2 align-items-center mb-2">
              <Form.Select className="flex-grow-1" value={it.serviceId} onChange={(e) => updateLine(i, 'serviceId', e.target.value)}>
                <option value="">Service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} – PKR {s.price}</option>)}
              </Form.Select>
              <Form.Control type="number" min={0} step={0.01} placeholder="Price" style={{ maxWidth: '100px' }} value={it.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} />
              <Form.Control type="number" min={1} style={{ maxWidth: '70px' }} value={it.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
              <Button variant="outline-danger" size="sm" onClick={() => removeLine(i)} title="Remove line"><i className="fas fa-minus" /></Button>
            </div>
          ))}
          <div className="d-flex gap-2 mt-2">
            <Form.Group className="mb-0">
              <Form.Label className="small">Tax</Form.Label>
              <Form.Control type="number" min={0} step={0.01} value={form.taxAmount} onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label className="small">Discount</Form.Label>
              <Form.Control type="number" min={0} step={0.01} value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label className="small">Payment</Form.Label>
              <Form.Select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_payment">Mobile</option>
              </Form.Select>
            </Form.Group>
          </div>
          <p className="mt-2 mb-0 fw-bold">Total: PKR {total.toLocaleString()}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button className="btn-luxe" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Invoice'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!detail} onHide={() => { setDetail(null); setDetailPage(1); }} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>Invoice {detail?.invoice_number}</Modal.Title></Modal.Header>
        <Modal.Body>
          {detail && (
            <>
              <p className="mb-1"><strong>{detail.customer_name}</strong></p>
              <p className="text-muted small mb-2">{detail.phone} {detail.email}</p>
              <Table size="sm">
                <thead><tr><th>Service</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>
                  {paginate(detailItems, detailPage).map((it) => (
                    <tr key={it.id}><td>{it.service_name}</td><td>{it.quantity}</td><td>PKR {Number(it.total).toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </Table>
              <TablePagination currentPage={detailPage} totalPages={detailTotalPages} onPageChange={setDetailPage} />
              <p className="mb-0 fw-bold mt-2">Total: PKR {Number(detail.total_amount).toLocaleString()} ({detail.payment_status})</p>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
