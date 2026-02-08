import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { ArrowUpShort } from 'react-bootstrap-icons';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  const isGidenRoute = location.pathname.startsWith('/giden-evrak');

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <div className={`scroll-to-top ${isVisible ? 'visible' : ''}`}>
      <Button 
        variant="primary" 
        onClick={scrollToTop}
        className={`rounded-circle shadow-lg d-flex align-items-center justify-content-center p-0 ${isGidenRoute ? 'giden-btn' : ''}`}
        style={{ width: '45px', height: '45px', border: 'none' }}
      >
        <ArrowUpShort size={30} />
      </Button>
    </div>
  );
};

export default ScrollToTop;
