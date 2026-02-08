import { useContext } from 'react';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isGidenRoute = location.pathname.startsWith('/giden-evrak');

  return (
    <Navbar className={`modern-navbar ${isGidenRoute ? 'giden-theme' : ''}`} variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">🚀 Evrak Takip Sistemi</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {user ? (
              <>
                <Nav.Link as={Link} to="/" className="fw-bold me-2">Gelen Evraklar</Nav.Link>
                <Nav.Link as={Link} to="/giden-evrak" className="fw-bold me-3">Giden Evraklar</Nav.Link>
                <div className="vr bg-light mx-2 d-none d-lg-block"></div>
                <Nav.Link disabled className="ps-lg-3">
                  <span className="fw-light">Hoşgeldin,</span> <strong>{user?.data?.name || user?.name}</strong>
                </Nav.Link>
                <Button 
                  variant="light" 
                  size="sm" 
                  onClick={onLogout}
                  className="ms-2 rounded-pill px-3 fw-bold text-primary"
                >
                  Çıkış Yap
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">Giriş Yap</Nav.Link>
                <Button 
                  as={Link} 
                  to="/register" 
                  variant="outline-light" 
                  size="sm" 
                  className="ms-2 rounded-pill px-3"
                >
                  Kayıt Ol
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
