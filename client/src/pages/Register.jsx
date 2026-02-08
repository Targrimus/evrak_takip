import { useState, useContext } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { name, email, password } = formData;
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);

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
      const userData = { name, email, password };
      await register(userData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="text-center auth-title">Aramıza Katıl</h2>
      {error && <Alert variant="danger" className="text-center border-0 bg-danger bg-opacity-10 text-danger">{error}</Alert>}
      <Form onSubmit={onSubmit}>
        <Form.Group className="mb-4" controlId="name">
          <Form.Label className="text-muted small fw-bold text-uppercase">İsim Soyisim</Form.Label>
          <Form.Control
            type="text"
            placeholder="Adınız Soyadınız"
            name="name"
            value={name}
            onChange={onChange}
            required
            className="custom-input"
          />
        </Form.Group>

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
            {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Kayıt Ol'}
          </Button>
        </div>
         <div className="text-center auth-footer">
            Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
        </div>
      </Form>
    </div>
  );
};

export default Register;
