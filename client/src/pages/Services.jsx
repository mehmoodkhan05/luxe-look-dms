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
  const [form, setForm] = useState({ name: '', categoryId: '', variant: '', duration_minutes: 0, price: '', commission_percentage: 0, commission_fixed: 0, discount_percentage: 0 });
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [categoryServices, setCategoryServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [isNewService, setIsNewService] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const load = () => {
    return Promise.all([
      api.get('/services/categories').then((r) => setCategories(r.data)),
      api.get('/services').then((r) => setServices(r.data)),
    ]);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [itemsPerPage]);

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

  const fetchCategoryServices = async (categoryId) => {
    if (!categoryId) {
      setCategoryServices([]);
      return;
    }
    try {
      const response = await api.get('/services', { params: { categoryId } });
      setCategoryServices(response.data);
    } catch (e) {
      console.error('Failed to fetch category services:', e);
      setCategoryServices([]);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setForm((f) => ({ ...f, categoryId, name: '', variant: '', duration_minutes: 0, price: '', commission_percentage: 0, commission_fixed: 0, discount_percentage: 0 }));
    setSelectedServiceId('');
    setIsNewService(true);
    fetchCategoryServices(categoryId);
  };

  const handleServiceSelect = (serviceId) => {
    if (serviceId === 'new') {
      setIsNewService(true);
      setSelectedServiceId('');
      setForm((f) => ({ ...f, name: '', variant: '', duration_minutes: 0, price: '', commission_percentage: 0, commission_fixed: 0, discount_percentage: 0 }));
    } else {
      setIsNewService(false);
      setSelectedServiceId(serviceId);
      const selectedService = categoryServices.find((s) => s.id === Number(serviceId));
      if (selectedService) {
        setForm({
          name: selectedService.name,
          categoryId: selectedService.category_id,
          variant: selectedService.variant || '',
          duration_minutes: selectedService.duration_minutes || 0,
          price: selectedService.price,
          commission_percentage: selectedService.commission_percentage || 0,
          commission_fixed: selectedService.commission_fixed || 0,
          discount_percentage: selectedService.discount_percentage || 0,
        });
      }
    }
  };

  const openAddService = () => {
    setEditing(null);
    setForm({ name: '', categoryId: '', variant: '', duration_minutes: 0, price: '', commission_percentage: 0, commission_fixed: 0, discount_percentage: 0 });
    setSelectedServiceId('');
    setIsNewService(true);
    setCategoryServices([]);
    setShowSvc(true);
  };

  const openEditService = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      categoryId: s.category_id,
      variant: s.variant || '',
      duration_minutes: s.duration_minutes || 0,
      price: s.price,
      commission_percentage: s.commission_percentage || 0,
      commission_fixed: s.commission_fixed || 0,
      discount_percentage: s.discount_percentage || 0,
    });
    setSelectedServiceId(s.id.toString());
    setIsNewService(false);
    fetchCategoryServices(s.category_id);
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
      if (editing || (!isNewService && selectedServiceId)) {
        const serviceId = editing?.id || selectedServiceId;
        await api.put(`/services/${serviceId}`, {
          name: form.name,
          categoryId: form.categoryId,
          variant: form.variant.trim() || null,
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
          commission_percentage: Number(form.commission_percentage),
          commission_fixed: Number(form.commission_fixed),
          discount_percentage: Number(form.discount_percentage),
        });
        toast.success('Service updated');
      } else {
        await api.post('/services', {
          name: form.name,
          categoryId: form.categoryId,
          variant: form.variant.trim() || null,
          duration_minutes: Number(form.duration_minutes),
          price: Number(form.price),
          commission_percentage: Number(form.commission_percentage),
          commission_fixed: Number(form.commission_fixed),
          discount_percentage: Number(form.discount_percentage),
        });
        toast.success('Service added');
      }
      setShowSvc(false);
      setSelectedServiceId('');
      setIsNewService(true);
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
              <div className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="Search services by name, category, or variant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-100"
                />
              </div>
              {(() => {
                // Filter services based on search query
                const filteredServices = services.filter((s) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    s.name?.toLowerCase().includes(query) ||
                    s.category_name?.toLowerCase().includes(query) ||
                    s.variant?.toLowerCase().includes(query)
                  );
                });

                // Sort services by category name (ascending), then by service name (ascending)
                const sortedServices = [...filteredServices].sort((a, b) => {
                  const categoryA = (a.category_name || '').toLowerCase();
                  const categoryB = (b.category_name || '').toLowerCase();
                  const categoryCompare = categoryA.localeCompare(categoryB);
                  if (categoryCompare !== 0) return categoryCompare;
                  const nameA = (a.name || '').toLowerCase();
                  const nameB = (b.name || '').toLowerCase();
                  return nameA.localeCompare(nameB);
                });

                const { totalPages } = useTablePagination(sortedServices.length, itemsPerPage);
                const paginatedServices = paginate(sortedServices, page, itemsPerPage);

                if (sortedServices.length === 0) {
                  return <p className="text-muted text-center py-4 mb-0">{searchQuery ? 'No services found matching your search.' : 'No services. Add a category and service.'}</p>;
                }

                return (
                  <>
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Category</th>
                          <th>Duration</th>
                          <th>Price</th>
                          <th>Discount</th>
                          {canEdit && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedServices.map((s) => (
                          <tr key={s.id}>
                            <td>
                              {s.name}
                              {s.variant && <span className="text-muted ms-2 small">({s.variant})</span>}
                            </td>
                            <td>{s.category_name}</td>
                            <td>{s.duration_minutes} min</td>
                            <td>PKR {Number(s.price).toLocaleString()}</td>
                            <td>{s.discount_percentage ? `${s.discount_percentage}%` : '—'}</td>
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
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Show:</span>
                        <Form.Select 
                          size="sm" 
                          value={itemsPerPage} 
                          onChange={(e) => setItemsPerPage(Number(e.target.value))}
                          style={{ width: 'auto' }}
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={sortedServices.length}>All</option>
                        </Form.Select>
                        <span className="text-muted small">entries</span>
                      </div>
                      {totalPages > 1 && (
                        <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          )}
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

      <Modal show={showSvc} onHide={() => { 
        setShowSvc(false); 
        setSelectedServiceId(''); 
        setIsNewService(true); 
        setCategoryServices([]);
        setEditing(null);
      }} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>{editing ? 'Edit Service' : 'Add Service'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Category</Form.Label>
            <Form.Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Service Name</Form.Label>
            <Form.Control 
              value={form.name} 
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} 
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Variant/Option <span className="text-muted small">(optional)</span></Form.Label>
            <Form.Control value={form.variant} onChange={(e) => setForm((f) => ({ ...f, variant: e.target.value }))} placeholder="Use this to add options/variants for the same service" />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Duration (minutes)</Form.Label>
            <Form.Control type="number" min={0} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Price (PKR)</Form.Label>
            <Form.Control type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Discount %</Form.Label>
            <Form.Control type="number" min={0} max={100} step={0.01} value={form.discount_percentage} onChange={(e) => setForm((f) => ({ ...f, discount_percentage: e.target.value }))} />
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
