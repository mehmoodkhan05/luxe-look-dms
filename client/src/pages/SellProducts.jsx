import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';

export default function SellProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canSell = user?.role === 'admin' || user?.role === 'staff';
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellModal, setSellModal] = useState(null);
  const [sellForm, setSellForm] = useState({ customerId: '', quantity: '', unit_price: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const { totalPages } = useTablePagination(list.length);

  const load = () => api.get('/inventory').then((r) => setList(r.data));

  useEffect(() => {
    Promise.all([load(), api.get('/customers').then((r) => setCustomers(r.data))]).finally(() => setLoading(false));
  }, []);

  const openSell = (p) => {
    setSellModal(p);
    setSellForm({ customerId: '', quantity: '', unit_price: '', notes: '' });
  };

  const submitSell = async () => {
    if (!sellForm.customerId) {
      toast.error('Select customer');
      return;
    }
    if (!sellForm.quantity || Number(sellForm.quantity) <= 0) {
      toast.error('Enter quantity');
      return;
    }
    const unitPrice = Number(sellForm.unit_price);
    if (!sellForm.unit_price || isNaN(unitPrice) || unitPrice < 0) {
      toast.error('Enter unit price');
      return;
    }
    const qty = Number(sellForm.quantity);
    if (qty > sellModal.current_stock) {
      toast.error(`Not enough stock. Available: ${sellModal.current_stock} ${sellModal.unit}`);
      return;
    }
    setSaving(true);
    try {
      const invoicePayload = {
        customerId: Number(sellForm.customerId),
        items: [{ productId: sellModal.id, productName: sellModal.name, quantity: qty, unit_price: unitPrice }],
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      };
      const invRes = await api.post('/invoices', invoicePayload);
      await api.post(`/inventory/${sellModal.id}/stock`, {
        type: 'usage',
        quantity: qty,
        notes: sellForm.notes?.trim() ? `Sale: ${invRes.data.invoice_number} - ${sellForm.notes}` : `Sale: ${invRes.data.invoice_number}`,
      });
      toast.success('Sale recorded. Invoice created.');
      setSellModal(null);
      load();
      navigate('/invoices', { state: { viewInvoiceId: invRes.data.id } });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 page-header-flex">
        <h1 className="h4 text-luxe-gold mb-0">Sell products</h1>
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
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Stock</th>
                    <th>Unit</th>
                    {canSell && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginate(list, page).map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.sku || '—'}</td>
                      <td>{p.current_stock}</td>
                      <td>{p.unit}</td>
                      {canSell && (
                        <td>
                          <Button
                            variant="outline-luxe"
                            size="sm"
                            onClick={() => openSell(p)}
                            disabled={p.current_stock <= 0}
                            title="Sell"
                          >
                            <i className="fas fa-cart-plus me-1" />
                            Sell
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
          {!loading && list.length === 0 && <p className="text-muted text-center py-4 mb-0">No products. Add products first.</p>}
        </Card.Body>
      </Card>

      <Modal show={!!sellModal} onHide={() => setSellModal(null)} centered backdrop="static" fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>Sell – {sellModal?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sellModal && (
            <p className="text-muted small mb-3">
              Available: {sellModal.current_stock} {sellModal.unit}
            </p>
          )}
          <Form.Group className="mb-2">
            <Form.Label>Customer <span className="text-danger">*</span></Form.Label>
            <Form.Select
              value={sellForm.customerId}
              onChange={(e) => setSellForm((f) => ({ ...f, customerId: e.target.value }))}
              required
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={sellModal?.current_stock}
              value={sellForm.quantity}
              onChange={(e) => setSellForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Unit price <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="number"
              min={0}
              step="0.01"
              value={sellForm.unit_price}
              onChange={(e) => setSellForm((f) => ({ ...f, unit_price: e.target.value }))}
              placeholder="0.00"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Notes (optional)</Form.Label>
            <Form.Control
              value={sellForm.notes}
              onChange={(e) => setSellForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. order notes"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSellModal(null)}>Cancel</Button>
          <Button className="btn-luxe" onClick={submitSell} disabled={saving}>
            {saving ? 'Saving…' : 'Record sale'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
