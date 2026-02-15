import { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';
import toast from 'react-hot-toast';

export default function Services() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCat, setShowCat] = useState(false);
  const [showSvc, setShowSvc] = useState(false);
  const [editing, setEditing] = useState(null);
  const [catName, setCatName] = useState('');
  const [form, setForm] = useState({ name: '', categoryId: '', duration_minutes: 60, price: '', commission_percentage: 0, commission_fixed: 0 });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const { totalPages } = useTablePagination(services.length);

  const load = () => {
    return Promise.all([
      api.get('/services/categories').then((r) => setCategories(r.data)),
      api.get('/services').then((r) => setServices(r.data)),
    ]);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const addCategory = async () => {
    if (!catName.trim()) return;
    setSaving(true);
    try {
      await api.post('/services/categories', { name: catName.trim() });
      toast.success('Category added');
      setShowCat(false);
      setCatName('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const openAddService = () => {
    setEditing(null);
    setForm({ name: '', categoryId: categories[0]?.id || '', duration_minutes: 60, price: '', commission_percentage: 0, commission_fixed: 0 });
    setShowSvc(true);
  };

  const openEditService = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      categoryId: s.category_id,
      duration_minutes: s.duration_minutes || 60,
      price: s.price,
      commission_percentage: s.commission_percentage || 0,
      commission_fixed: s.commission_fixed || 0,
    });
    setShowSvc(true);
  };

  const openDeleteModal = (s) => {
    setServiceToDelete(s);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await api.delete(`/services/${serviceToDelete.id}`);
      toast.success('Service deleted');
      setShowDeleteModal(false);
      setServiceToDelete(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const saveService = async () => {
    if (!form.name.trim() || !form.categoryId || form.price === '') {
      toast.error('Name, category and price required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/services/${editing.id}`, {
          name: form.name,
          categoryId: form.categoryId,
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
          commission_percentage: Number(form.commission_percentage),
          commission_fixed: Number(form.commission_fixed),
        });
        toast.success('Service updated');
      } else {
        await api.post('/services', {
          name: form.name,
          categoryId: form.categoryId,
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
          commission_percentage: Number(form.commission_percentage),
          commission_fixed: Number(form.commission_fixed),
        });
        toast.success('Service added');
      }
      setShowSvc(false);
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
        <h1 className="h4 text-luxe-gold mb-0">Services</h1>
        {canEdit && (
          <div className="d-flex gap-2">
            <Button variant="outline-luxe" onClick={() => { setShowCat(true); setCatName(''); }} title="Add category"><i className="fas fa-folder-plus me-1" /><span className="d-none d-sm-inline">Add Category</span></Button>
            <Button className="btn-luxe" onClick={openAddService} title="Add service"><i className="fas fa-plus me-1" /><span className="d-none d-sm-inline">Add Service</span></Button>
          </div>
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
                  <th>Service</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Commission</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {paginate(services, page).map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.category_name}</td>
                    <td>{s.duration_minutes} min</td>
                    <td>PKR {Number(s.price).toLocaleString()}</td>
                    <td>{s.commission_percentage ? `${s.commission_percentage}%` : s.commission_fixed ? `PKR ${s.commission_fixed}` : '—'}</td>
                    {canEdit && (
                      <td>
                        <Button variant="outline-luxe" size="sm" className="me-1" onClick={() => openEditService(s)} title="Edit"><i className="fas fa-pen" /></Button>
                        <Button variant="outline-danger" size="sm" onClick={() => openDeleteModal(s)} title="Delete"><i className="fas fa-trash" /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
          {!loading && services.length === 0 && <p className="text-muted text-center py-4 mb-0">No services. Add a category and service.</p>}
        </Card.Body>
      </Card>

      <Modal show={showCat} onHide={() => setShowCat(false)} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>Add Category</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Control placeholder="Category name (e.g. Hair, Nails)" value={catName} onChange={(e) => setCatName(e.target.value)} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCat(false)}>Cancel</Button>
          <Button className="btn-luxe" onClick={addCategory} disabled={saving} title="Add"><i className="fas fa-plus me-1" />{saving ? 'Saving…' : 'Add'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSvc} onHide={() => setShowSvc(false)} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>{editing ? 'Edit Service' : 'Add Service'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Category</Form.Label>
            <Form.Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Service Name</Form.Label>
            <Form.Control value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Duration (minutes)</Form.Label>
            <Form.Control type="number" min={5} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Price (PKR)</Form.Label>
            <Form.Control type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Commission %</Form.Label>
            <Form.Control type="number" min={0} step={0.01} value={form.commission_percentage} onChange={(e) => setForm((f) => ({ ...f, commission_percentage: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Commission fixed (PKR)</Form.Label>
            <Form.Control type="number" min={0} value={form.commission_fixed} onChange={(e) => setForm((f) => ({ ...f, commission_fixed: e.target.value }))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSvc(false)}>Cancel</Button>
          <Button className="btn-luxe" onClick={saveService} disabled={saving} title="Save"><i className="fas fa-check me-1" />{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => { setShowDeleteModal(false); setServiceToDelete(null); }} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Delete Service</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete service &quot;{serviceToDelete?.name}&quot;? This will hide it from the list.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setServiceToDelete(null); }}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>
            <i className="fas fa-trash me-1" />Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
