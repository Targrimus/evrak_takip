import { createContext, useState, useEffect } from 'react';
import authService from '../features/auth/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  const checkUserLoggedIn = async () => {
    try {
      const res = await authService.getCurrentUser();
      setUser(res.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserLoggedIn();
  }, []);

  // Login
  const login = async (userData) => {
    const res = await authService.login(userData);
    await checkUserLoggedIn();
    return res;
  };

  // Register
  const register = async (userData) => {
    const res = await authService.register(userData);
    await checkUserLoggedIn();
    return res;
  };

  // Logout
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
