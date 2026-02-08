import { useState, useContext } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { email, password } = formData;
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const userData = { email, password };
      await login(userData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="text-center auth-title">Giriş Yap</h2>
      {error && <Alert variant="danger" className="text-center border-0 bg-danger bg-opacity-10 text-danger">{error}</Alert>}
      <Form onSubmit={onSubmit}>
        <Form.Group className="mb-4" controlId="email">
          <Form.Label className="text-muted small fw-bold text-uppercase">Email Adresi</Form.Label>
          <Form.Control
            type="email"
            placeholder="ornek@email.com"
            name="email"
            value={email}
            onChange={onChange}
            required
            className="custom-input"
          />
        </Form.Group>

        <Form.Group className="mb-4" controlId="password">
          <Form.Label className="text-muted small fw-bold text-uppercase">Şifre</Form.Label>
          <Form.Control
            type="password"
            placeholder="••••••••"
            name="password"
            value={password}
            onChange={onChange}
            required
            className="custom-input"
          />
        </Form.Group>

        <div className="d-grid gap-2">
          <Button variant="primary" type="submit" className="custom-btn" disabled={isLoading}>
            {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Giriş Yap'}
          </Button>
        </div>
        
        <div className="text-center auth-footer">
          Hesabınız yok mu? <Link to="/register">Hemen Kayıt Ol</Link>
        </div>
      </Form>
    </div>
  );
};

export default Login;
