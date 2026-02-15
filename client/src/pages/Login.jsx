import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'linear-gradient(180deg, #0f0f14 0%, #1a1a24 100%)' }}>
      <Container className="mw-420">
        <div className="text-center mb-4">
          <span className="display-4">✨</span>
          <h1 className="h3 mt-2 text-luxe-gold">Luxe Look</h1>
          <p className="text-luxe-muted small">Dashboard Management System</p>
        </div>
        <Card className="border-0 shadow-lg">
          <Card.Body className="p-4 p-md-5">
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="admin@luxelook.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>
              <Button type="submit" className="btn-luxe w-100 py-2" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Form>
            <p className="text-center text-muted small mt-3 mb-0">
              Default: admin@luxelook.com / admin123
            </p>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
