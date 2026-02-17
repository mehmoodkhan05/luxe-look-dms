import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Container, Navbar, Nav, Offcanvas, Button, Collapse } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logoImage from '../assets/logobg.jpg';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['admin', 'receptionist', 'staff'] },
  { to: '/customers', label: 'Customers', icon: '👤', roles: ['admin', 'receptionist', 'staff'] },
  { to: '/appointments', label: 'Appointments', icon: '📅', roles: ['admin', 'receptionist', 'staff'] },
  { to: '/services', label: 'Services', icon: '✂️', roles: ['admin', 'staff'] },
  { to: '/invoices', label: 'Invoices', icon: '🧾', roles: ['admin', 'receptionist', 'staff'] },
  { to: '/inventory', label: 'Inventory', icon: '📦', roles: ['admin', 'staff'] },
  {
    label: 'HR',
    icon: '🏢',
    roles: ['admin'],
    children: [
      { to: '/staff', label: 'Staff', icon: '👥' },
      { to: '/payroll', label: 'Payroll', icon: '💰' },
    ],
  },
  { to: '/attendance', label: 'Attendance', icon: '📋', roles: ['admin'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['admin', 'receptionist'] },
  { to: '/admin', label: 'Expenses', icon: '💸', roles: ['admin', 'receptionist', 'staff'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
  const navigate = useNavigate();
  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  useEffect(() => {
    if (location.pathname === '/staff' || location.pathname === '/payroll') setHrOpen(true);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    'd-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none sidebar-link' + (isActive ? ' active' : '');

  return (
    <div className="layout-wrapper">
      {/* Top navbar */}
      <Navbar expand="md" className="luxe-navbar border-bottom border-secondary">
        <Container fluid className="px-3 px-md-4">
          <Navbar.Brand as={NavLink} to="/" className="navbar-brand-luxe d-flex align-items-center gap-2 fw-bold">
            <img src={logoImage} alt="Luxe Look Parlour" className="luxe-logo-nav" decoding="async" fetchpriority="high" />
            <span className="d-none d-sm-inline text-luxe-gold">Luxe Look</span>
          </Navbar.Brand>
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <Button
              variant="link"
              className="p-1 text-luxe-muted theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>
            <span className="text-luxe-muted small d-none d-md-inline">{user?.fullName}</span>
            <span className="badge bg-secondary text-capitalize">{user?.role}</span>
            <Navbar.Toggle aria-controls="offcanvasNav" onClick={() => setShowMenu(true)} className="d-md-none" />
          </div>
        </Container>
      </Navbar>

      <div className="layout-body">
        {/* Sidebar - visible on md and up */}
        <aside className="sidebar d-none d-md-flex flex-column">
          <Nav className="flex-column gap-2 p-2 flex-grow-1">
            {filteredNav.map((item) =>
              item.children ? (
                <div key={item.label} className="sidebar-collapse-wrapper">
                  <button
                    type="button"
                    className={`sidebar-collapse-trigger d-flex align-items-center gap-2 px-3 py-2 rounded-3 w-100 text-start border-0 ${hrOpen ? 'open' : ''}`}
                    onClick={() => setHrOpen((o) => !o)}
                    aria-expanded={hrOpen}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    <i className="fas fa-chevron-right sidebar-collapse-caret ms-auto" aria-hidden />
                  </button>
                  <Collapse in={hrOpen}>
                    <div className="sidebar-collapse-content">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            'd-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none sidebar-link sidebar-sublink' + (isActive ? ' active' : '')
                          }
                        >
                          <span className="sidebar-icon">{child.icon}</span>
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </Collapse>
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={navLinkClass}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              )
            )}
          </Nav>
          <div className="sidebar-bottom p-2 border-top border-secondary">
            <NavLink to="/settings" className={navLinkClass}>
              <i className="fas fa-gear sidebar-icon" />
              <span>Settings</span>
            </NavLink>
            <button
              type="button"
              className="sidebar-logout d-flex align-items-center gap-2 px-3 py-2 rounded-3 w-100 text-start border-0"
              onClick={handleLogout}
            >
              <i className="fas fa-right-from-bracket sidebar-icon" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile menu */}
        <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} placement="start" className="luxe-offcanvas">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title className="text-luxe-gold">Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-0 d-flex flex-column">
            <Nav className="flex-column gap-2 flex-grow-1 p-2">
              {filteredNav.map((item) =>
                item.children ? (
                  <div key={item.label} className="sidebar-collapse-wrapper">
                    <button
                      type="button"
                      className={`sidebar-collapse-trigger d-flex align-items-center gap-2 px-3 py-2 rounded-3 w-100 text-start border-0 ${hrOpen ? 'open' : ''}`}
                      onClick={() => setHrOpen((o) => !o)}
                      aria-expanded={hrOpen}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      <i className="fas fa-chevron-right sidebar-collapse-caret ms-auto" aria-hidden />
                    </button>
                    <Collapse in={hrOpen}>
                      <div className="sidebar-collapse-content">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              'd-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none sidebar-link sidebar-sublink' + (isActive ? ' active' : '')
                            }
                            onClick={() => setShowMenu(false)}
                          >
                            <span>{child.icon}</span>
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </Collapse>
                  </div>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={navLinkClass}
                    onClick={() => setShowMenu(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                )
              )}
            </Nav>
            <div className="sidebar-bottom p-2 border-top border-secondary">
              <NavLink to="/settings" className={navLinkClass} onClick={() => setShowMenu(false)}>
                <i className="fas fa-gear me-2" />
                <span>Settings</span>
              </NavLink>
              <button
                type="button"
                className="sidebar-logout d-flex align-items-center gap-2 px-3 py-2 rounded-3 w-100 text-start border-0"
                onClick={() => { setShowMenu(false); handleLogout(); }}
              >
                <i className="fas fa-right-from-bracket me-2" />
                <span>Logout</span>
              </button>
            </div>
          </Offcanvas.Body>
        </Offcanvas>

        <main className="layout-main py-3 py-md-4">
          <Container fluid className="px-3 px-md-4">
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}
