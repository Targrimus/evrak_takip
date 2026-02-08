import axios from 'axios';

const API_URL = '/api/giden-evrak';

const getGidenEvraklar = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

const getGidenEvrak = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

const createGidenEvrak = async (data) => {
  const response = await axios.post(API_URL, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

const updateGidenEvrak = async (id, data) => {
  const response = await axios.put(`${API_URL}/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

const deleteGidenEvrak = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

const addNote = async (id, noteData) => {
  const response = await axios.post(`${API_URL}/${id}/note`, noteData);
  return response.data;
};

const gidenEvrakService = {
  getGidenEvraklar,
  getGidenEvrak,
  createGidenEvrak,
  updateGidenEvrak,
  deleteGidenEvrak,
  addNote
};

export default gidenEvrakService;
