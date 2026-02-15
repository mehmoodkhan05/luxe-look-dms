import { useState, useEffect } from 'react';
import { Card, Form, Tab, Tabs, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { sidebarColor, navbarColor, setSidebarColor, setNavbarColor, resetSidebarColor, resetNavbarColor } = useTheme();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);

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
        <Tab eventKey="appearance" title="Appearance">
          <Card>
            <Card.Body>
              <h6 className="mb-3">Sidebar & Navbar Colors</h6>
              <Form.Text className="d-block mb-3 text-muted">RGB values (170–255) for light colors</Form.Text>

              <Form.Group className="mb-3">
                <Form.Label>Sidebar color</Form.Label>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <Form.Control
                    type="number"
                    min={170}
                    max={255}
                    placeholder="R"
                    value={sidebarColor.r}
                    onChange={(e) => setSidebarColor({ ...sidebarColor, r: Math.min(255, Math.max(170, +e.target.value || 170)) })}
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={170}
                    max={255}
                    placeholder="G"
                    value={sidebarColor.g}
                    onChange={(e) => setSidebarColor({ ...sidebarColor, g: Math.min(255, Math.max(170, +e.target.value || 170)) })}
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={170}
                    max={255}
                    placeholder="B"
                    value={sidebarColor.b}
                    onChange={(e) => setSidebarColor({ ...sidebarColor, b: Math.min(255, Math.max(170, +e.target.value || 170)) })}
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
                  />
                  <Button variant="outline-secondary" size="sm" onClick={resetSidebarColor}>Reset</Button>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Navbar color</Form.Label>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <Form.Control
                    type="number"
                    min={170}
                    max={255}
                    placeholder="R"
                    value={navbarColor.r}
                    onChange={(e) => setNavbarColor({ ...navbarColor, r: Math.min(255, Math.max(170, +e.target.value || 170)) })}
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={170}
                    max={255}
                    placeholder="G"
                    value={navbarColor.g}
                    onChange={(e) => setNavbarColor({ ...navbarColor, g: Math.min(255, Math.max(170, +e.target.value || 170)) })}
                    style={{ width: '70px' }}
                  />
                  <Form.Control
                    type="number"
                    min={170}
                    max={255}
                    placeholder="B"
                    value={navbarColor.b}
                    onChange={(e) => setNavbarColor({ ...navbarColor, b: Math.min(255, Math.max(170, +e.target.value || 170)) })}
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
                  />
                  <Button variant="outline-secondary" size="sm" onClick={resetNavbarColor}>Reset</Button>
                </div>
              </Form.Group>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </>
  );
}
