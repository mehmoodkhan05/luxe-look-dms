import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';

export default function Inventory() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', unit: 'pcs', current_stock: 0, reorder_level: 0, supplier_name: '', supplier_contact: '' });
  const [stockForm, setStockForm] = useState({ type: 'purchase', quantity: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const { totalPages } = useTablePagination(list.length);

  const load = () => api.get('/inventory').then((r) => setList(r.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setForm({ name: '', sku: '', unit: 'pcs', current_stock: 0, reorder_level: 0, supplier_name: '', supplier_contact: '' });
    setShow(true);
  };

  const openEdit = (p) => {
    setForm({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      unit: p.unit || 'pcs',
      current_stock: p.current_stock,
      reorder_level: p.reorder_level ?? 0,
      supplier_name: p.supplier_name || '',
      supplier_contact: p.supplier_contact || '',
    });
    setShow(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Product name required');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/inventory/${form.id}`, { name: form.name, sku: form.sku, unit: form.unit, current_stock: form.current_stock, reorder_level: form.reorder_level, supplier_name: form.supplier_name, supplier_contact: form.supplier_contact });
        toast.success('Updated');
      } else {
        await api.post('/inventory', form);
        toast.success('Product added');
      }
      setShow(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const openStock = (p) => {
    setStockModal(p);
    setStockForm({ type: 'purchase', quantity: '', notes: '' });
  };

  const submitStock = async () => {
    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) {
      toast.error('Enter quantity');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/inventory/${stockModal.id}/stock`, {
        type: stockForm.type,
        quantity: Number(stockForm.quantity),
        notes: stockForm.notes,
      });
      toast.success('Stock updated');
      setStockModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 page-header-flex">
        <h1 className="h4 text-luxe-gold mb-0">Add products</h1>
        {canEdit && (
          <Button className="btn-luxe" onClick={openAdd} title="Add product"><i className="fas fa-plus me-1" /><span className="d-none d-sm-inline">Add Product</span></Button>
        )}
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
                  <th>Reorder</th>
                  <th>Supplier</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {paginate(list, page).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku || '—'}</td>
                    <td>
                      <span className={p.current_stock <= p.reorder_level ? 'text-warning fw-bold' : ''}>
                        {p.current_stock} {p.unit}
                      </span>
                      {p.current_stock <= p.reorder_level && <Badge bg="warning" className="ms-1">Low</Badge>}
                    </td>
                    <td>{p.reorder_level}</td>
                    <td>{p.supplier_name || '—'}</td>
                    {canEdit && (
                      <td>
                        <Button variant="outline-luxe" size="sm" className="me-1" onClick={() => openEdit(p)} title="Edit"><i className="fas fa-pen" /></Button>
                        <Button variant="outline-info" size="sm" onClick={() => openStock(p)} title="Stock"><i className="fas fa-box" /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && list.length === 0 && <p className="text-muted text-center py-4 mb-0">No products. Add one.</p>}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => setShow(false)} centered backdrop="static" fullscreen="sm-down">
        <Modal.Header closeButton><Modal.Title>{form.id ? 'Edit Product' : 'Add Product'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>SKU</Form.Label>
            <Form.Control value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Unit</Form.Label>
            <Form.Control value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Current Stock</Form.Label>
            <Form.Control type="number" min={0} value={form.current_stock} onChange={(e) => setForm((f) => ({ ...f, current_stock: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Reorder Level</Form.Label>
            <Form.Control type="number" min={0} value={form.reorder_level} onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Supplier Name</Form.Label>
            <Form.Control value={form.supplier_name} onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Supplier Contact</Form.Label>
            <Form.Control value={form.supplier_contact} onChange={(e) => setForm((f) => ({ ...f, supplier_contact: e.target.value }))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button className="btn-luxe" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!stockModal} onHide={() => setStockModal(null)} centered backdrop="static" fullscreen="sm-down">
        <Modal.Header closeButton><Modal.Title>Stock – {stockModal?.name}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Type</Form.Label>
            <Form.Select value={stockForm.type} onChange={(e) => setStockForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="purchase">Purchase</option>
              <option value="usage">Usage</option>
              <option value="adjustment">Adjustment</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Quantity</Form.Label>
            <Form.Control type="number" min={1} value={stockForm.quantity} onChange={(e) => setStockForm((f) => ({ ...f, quantity: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Notes</Form.Label>
            <Form.Control value={stockForm.notes} onChange={(e) => setStockForm((f) => ({ ...f, notes: e.target.value }))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setStockModal(null)}>Cancel</Button>
          <Button className="btn-luxe" onClick={submitStock} disabled={saving}>{saving ? 'Saving…' : 'Update'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
