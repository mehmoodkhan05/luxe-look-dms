import { useState, useEffect } from 'react';
import { Card, Form, Tab, Tabs, Button, Table, Modal, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import TablePagination, { paginate, useTablePagination } from '../components/TablePagination';

export default function Settings() {
  const { user, updateUser, isAdmin } = useAuth();
  const { sidebarColor, navbarColor, setSidebarColor, setNavbarColor, resetSidebarColor, resetNavbarColor } = useTheme();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);

  const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => {
    const h = Math.max(0, Math.min(255, Math.round(Number(x) || 0)).toString(16));
    return h.length === 1 ? '0' + h : h;
  }).join('');
  const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
  };

  const [sidebarInput, setSidebarInput] = useState({ r: String(sidebarColor.r), g: String(sidebarColor.g), b: String(sidebarColor.b) });
  const [navbarInput, setNavbarInput] = useState({ r: String(navbarColor.r), g: String(navbarColor.g), b: String(navbarColor.b) });
  useEffect(() => {
    setSidebarInput({ r: String(sidebarColor.r), g: String(sidebarColor.g), b: String(sidebarColor.b) });
  }, [sidebarColor.r, sidebarColor.g, sidebarColor.b]);
  useEffect(() => {
    setNavbarInput({ r: String(navbarColor.r), g: String(navbarColor.g), b: String(navbarColor.b) });
  }, [navbarColor.r, navbarColor.g, navbarColor.b]);

  const clamp = (v) => Math.min(255, Math.max(0, parseInt(String(v), 10) || 0));
  const handleSidebarChannel = (channel, raw) => {
    setSidebarInput((prev) => ({ ...prev, [channel]: raw }));
    const num = parseInt(raw, 10);
    if (raw !== '' && !Number.isNaN(num)) setSidebarColor({ ...sidebarColor, [channel]: clamp(raw) });
  };
  const handleSidebarBlur = (channel) => {
    const val = clamp(sidebarInput[channel]);
    setSidebarInput((prev) => ({ ...prev, [channel]: String(val) }));
    setSidebarColor({ ...sidebarColor, [channel]: val });
  };
  const handleNavbarChannel = (channel, raw) => {
    setNavbarInput((prev) => ({ ...prev, [channel]: raw }));
    const num = parseInt(raw, 10);
    if (raw !== '' && !Number.isNaN(num)) setNavbarColor({ ...navbarColor, [channel]: clamp(raw) });
  };
  const handleNavbarBlur = (channel) => {
    const val = clamp(navbarInput[channel]);
    setNavbarInput((prev) => ({ ...prev, [channel]: String(val) }));
    setNavbarColor({ ...navbarColor, [channel]: val });
  };

  useEffect(() => {
    setFullName(user?.fullName || '');
  }, [user?.fullName]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/profile', { fullName: fullName.trim() });
      updateUser({ fullName: fullName.trim() });
      toast.success('Name updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffPage, setStaffPage] = useState(1);
  const { totalPages: staffTotalPages } = useTablePagination(staffList.length);
  const [staffModal, setStaffModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    fullName: '', phone: '', role: 'staff', is_active: true,
    monthlySalary: 0, commissionType: 'percentage', commissionValue: 0, password: '',
  });
  const [staffSaving, setStaffSaving] = useState(false);

  const loadStaff = () => {
    setStaffLoading(true);
    return api.get('/staff').then((r) => setStaffList(r.data)).finally(() => setStaffLoading(false));
  };

  useEffect(() => {
    if (isAdmin) loadStaff();
  }, [isAdmin]);

  const openStaffView = (s) => {
    setViewingStaff(s);
    setViewModal(true);
  };

  const openStaffEdit = (s) => {
    setEditingStaff(s);
    setStaffForm({
      fullName: s.full_name,
      phone: s.phone || '',
      role: s.role || 'staff',
      is_active: s.is_active !== 0,
      monthlySalary: s.monthly_salary ?? 0,
      commissionType: s.commission_type || 'percentage',
      commissionValue: s.commission_value ?? 0,
      password: '',
    });
    setStaffModal(true);
  };

  const handleStaffSave = async (e) => {
    e.preventDefault();
    if (!staffForm.fullName?.trim()) {
      toast.error('Full name is required');
      return;
    }
    setStaffSaving(true);
    try {
      await api.put(`/staff/${editingStaff.id}`, {
        fullName: staffForm.fullName.trim(),
        phone: staffForm.phone || null,
        role: staffForm.role,
        is_active: staffForm.is_active,
        monthlySalary: Number(staffForm.monthlySalary) || 0,
        commissionType: staffForm.commissionType,
        commissionValue: Number(staffForm.commissionValue) || 0,
        ...(staffForm.password ? { password: staffForm.password } : {}),
      });
      toast.success('Staff account updated');
      setStaffModal(false);
      setEditingStaff(null);
      loadStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setStaffSaving(false);
    }
  };

  return (
    <>
      <h1 className="h4 text-luxe-gold mb-4">Settings</h1>

      <Tabs defaultActiveKey="account" className="mb-3">
        <Tab eventKey="account" title="Account">
          <Card>
            <Card.Body>
              <Form onSubmit={handleSaveName}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control value={user?.email || ''} readOnly disabled className="bg-secondary bg-opacity-25" />
                  <Form.Text className="text-muted">Email cannot be changed</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Control value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''} readOnly disabled className="bg-secondary bg-opacity-25" />
                </Form.Group>
                <Button type="submit" className="btn-luxe" disabled={saving}>
                  <i className="fas fa-check me-1" />{saving ? 'Saving…' : 'Save'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        {isAdmin && (
          <Tab eventKey="staff-accounts" title="Staff Accounts">
            <Card>
              <Card.Body>
                {staffLoading ? (
                  <div className="text-center py-4"><Spinner className="text-warning" /></div>
                ) : (
                  <>
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginate(staffList, staffPage).map((s) => (
                          <tr key={s.id}>
                            <td>{s.full_name}</td>
                            <td>{s.email}</td>
                            <td>{s.phone || '—'}</td>
                            <td><Badge bg="secondary">{s.role}</Badge></td>
                            <td><Badge bg={s.is_active ? 'success' : 'danger'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                            <td className="text-nowrap">
                              <Button variant="outline-primary" size="sm" className="me-1 fw-semibold" style={{ borderRadius: '10px' }} onClick={() => openStaffView(s)} title="View">
                                <i className="fas fa-eye" />
                              </Button>
                              <Button variant="outline-luxe" size="sm" onClick={() => openStaffEdit(s)} title="Edit">
                                <i className="fas fa-pen" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <TablePagination currentPage={staffPage} totalPages={staffTotalPages} onPageChange={setStaffPage} />
                  </>
                )}
                {!staffLoading && staffList.length === 0 && (
                  <p className="text-muted text-center py-4 mb-0">No staff accounts. Add staff from the Staff page.</p>
                )}
              </Card.Body>
            </Card>
          </Tab>
        )}
        <Tab eventKey="appearance" title="Appearance">
          <Card>
            <Card.Body>
              <h6 className="mb-3">Sidebar & Navbar Colors</h6>
              <Form.Text className="d-block mb-3 text-muted">RGB values (0–255). Use the color bar to pick any color, or enter numbers.</Form.Text>

              <Form.Group className="mb-3">
                <Form.Label>Sidebar color</Form.Label>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <input
                    type="color"
                    aria-label="Sidebar color picker"
                    value={rgbToHex(sidebarColor.r, sidebarColor.g, sidebarColor.b)}
                    onChange={(e) => {
                      const rgb = hexToRgb(e.target.value);
                      if (rgb) setSidebarColor(rgb);
                    }}
                    className="settings-color-picker"
                    style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--luxe-border)', cursor: 'pointer' }}
                  />
                  <Form.Control
                    type="number"
                    min={0}
                    max={255}
                    placeholder="R"
                    value={sidebarInput.r}
                    onChange={(e) => handleSidebarChannel('r', e.target.value)}
                    onBlur={() => handleSidebarBlur('r')}
                    onInput={(e) => handleSidebarChannel('r', e.target.value)}
                    inputMode="numeric"
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={0}
                    max={255}
                    placeholder="G"
                    value={sidebarInput.g}
                    onChange={(e) => handleSidebarChannel('g', e.target.value)}
                    onBlur={() => handleSidebarBlur('g')}
                    onInput={(e) => handleSidebarChannel('g', e.target.value)}
                    inputMode="numeric"
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={0}
                    max={255}
                    placeholder="B"
                    value={sidebarInput.b}
                    onChange={(e) => handleSidebarChannel('b', e.target.value)}
                    onBlur={() => handleSidebarBlur('b')}
                    onInput={(e) => handleSidebarChannel('b', e.target.value)}
                    inputMode="numeric"
                    style={{ width: '70px' }}
                  />
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: `rgb(${sidebarColor.r}, ${sidebarColor.g}, ${sidebarColor.b})`,
                      border: '1px solid var(--luxe-border)',
                    }}
                    aria-hidden
                  />
                  <Button variant="outline-secondary" size="sm" onClick={resetSidebarColor}>Reset</Button>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Navbar color</Form.Label>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <input
                    type="color"
                    aria-label="Navbar color picker"
                    value={rgbToHex(navbarColor.r, navbarColor.g, navbarColor.b)}
                    onChange={(e) => {
                      const rgb = hexToRgb(e.target.value);
                      if (rgb) setNavbarColor(rgb);
                    }}
                    className="settings-color-picker"
                    style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--luxe-border)', cursor: 'pointer' }}
                  />
                  <Form.Control
                    type="number"
                    min={0}
                    max={255}
                    placeholder="R"
                    value={navbarInput.r}
                    onChange={(e) => handleNavbarChannel('r', e.target.value)}
                    onBlur={() => handleNavbarBlur('r')}
                    onInput={(e) => handleNavbarChannel('r', e.target.value)}
                    inputMode="numeric"
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={0}
                    max={255}
                    placeholder="G"
                    value={navbarInput.g}
                    onChange={(e) => handleNavbarChannel('g', e.target.value)}
                    onBlur={() => handleNavbarBlur('g')}
                    onInput={(e) => handleNavbarChannel('g', e.target.value)}
                    inputMode="numeric"
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={0}
                    max={255}
                    placeholder="B"
                    value={navbarInput.b}
                    onChange={(e) => handleNavbarChannel('b', e.target.value)}
                    onBlur={() => handleNavbarBlur('b')}
                    onInput={(e) => handleNavbarChannel('b', e.target.value)}
                    inputMode="numeric"
                    style={{ width: '70px' }}
                  />
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: `rgb(${navbarColor.r}, ${navbarColor.g}, ${navbarColor.b})`,
                      border: '1px solid var(--luxe-border)',
                    }}
                    aria-hidden
                  />
                  <Button variant="outline-secondary" size="sm" onClick={resetNavbarColor}>Reset</Button>
                </div>
              </Form.Group>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={viewModal} onHide={() => { setViewModal(false); setViewingStaff(null); }} centered fullscreen="sm-down">
        <Modal.Header closeButton><Modal.Title>Staff Details</Modal.Title></Modal.Header>
        <Modal.Body>
          {viewingStaff && (
            <dl className="mb-0 row">
              <dt className="col-sm-4 text-muted">Name</dt>
              <dd className="col-sm-8">{viewingStaff.full_name}</dd>
              <dt className="col-sm-4 text-muted">Email</dt>
              <dd className="col-sm-8">{viewingStaff.email}</dd>
              <dt className="col-sm-4 text-muted">Phone</dt>
              <dd className="col-sm-8">{viewingStaff.phone || '—'}</dd>
              <dt className="col-sm-4 text-muted">Role</dt>
              <dd className="col-sm-8"><Badge bg="secondary">{viewingStaff.role}</Badge></dd>
              <dt className="col-sm-4 text-muted">Status</dt>
              <dd className="col-sm-8"><Badge bg={viewingStaff.is_active ? 'success' : 'danger'}>{viewingStaff.is_active ? 'Active' : 'Inactive'}</Badge></dd>
              <dt className="col-sm-4 text-muted">Monthly Salary</dt>
              <dd className="col-sm-8">{viewingStaff.monthly_salary != null ? `PKR ${Number(viewingStaff.monthly_salary).toLocaleString()}` : '—'}</dd>
              <dt className="col-sm-4 text-muted">Commission</dt>
              <dd className="col-sm-8">
                {viewingStaff.commission_type === 'percentage'
                  ? `${viewingStaff.commission_value}%`
                  : viewingStaff.commission_type === 'fixed'
                    ? `PKR ${viewingStaff.commission_value} per service`
                    : '—'}
              </dd>
            </dl>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setViewModal(false); setViewingStaff(null); }}>Close</Button>
          <Button className="btn-luxe" onClick={() => { setViewModal(false); openStaffEdit(viewingStaff); setViewingStaff(null); }}>
            <i className="fas fa-pen me-1" />Edit
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={staffModal} onHide={() => { setStaffModal(false); setEditingStaff(null); }} centered backdrop="static" fullscreen="sm-down">
        <Modal.Header closeButton><Modal.Title>Edit Staff Account</Modal.Title></Modal.Header>
        <Form onSubmit={handleStaffSave}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Full Name</Form.Label>
              <Form.Control value={staffForm.fullName} onChange={(e) => setStaffForm((f) => ({ ...f, fullName: e.target.value }))} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control value={editingStaff?.email || ''} readOnly disabled className="bg-secondary bg-opacity-25" />
              <Form.Text className="text-muted">Email cannot be changed</Form.Text>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Phone</Form.Label>
              <Form.Control value={staffForm.phone} onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Role</Form.Label>
              <Form.Select value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="staff">Staff</option>
                <option value="receptionist">Receptionist</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Monthly Salary (PKR)</Form.Label>
              <Form.Control type="number" min={0} value={staffForm.monthlySalary} onChange={(e) => setStaffForm((f) => ({ ...f, monthlySalary: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Commission Type</Form.Label>
              <Form.Select value={staffForm.commissionType} onChange={(e) => setStaffForm((f) => ({ ...f, commissionType: e.target.value }))}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed per service</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>{staffForm.commissionType === 'percentage' ? 'Commission %' : 'Commission (PKR) per service'}</Form.Label>
              <Form.Control type="number" min={0} step={0.01} value={staffForm.commissionValue} onChange={(e) => setStaffForm((f) => ({ ...f, commissionValue: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>New Password (optional)</Form.Label>
              <Form.Control type="password" value={staffForm.password} onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" minLength={6} />
              <Form.Text className="text-muted">Min 6 characters</Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Check type="switch" id="staff_active" label="Active" checked={staffForm.is_active} onChange={(e) => setStaffForm((f) => ({ ...f, is_active: e.target.checked }))} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setStaffModal(false); setEditingStaff(null); }}>Cancel</Button>
            <Button type="submit" className="btn-luxe" disabled={staffSaving}>{staffSaving ? 'Saving…' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
