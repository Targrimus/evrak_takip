import axios from 'axios';

const API_URL = '/api/auth/';

// Register user
const register = async (userData) => {
  const response = await axios.post(API_URL + 'register', userData);
  return response.data;
};

// Login user
const login = async (userData) => {
  const response = await axios.post(API_URL + 'login', userData);
  return response.data;
};

// Logout user
const logout = async () => {
    await axios.get(API_URL + 'logout');
};

// Get current user
const getCurrentUser = async () => {
    const response = await axios.get(API_URL + 'me');
    return response.data;
}

const authService = {
  register,
  login,
  logout,
  getCurrentUser
};

export default authService;
