import axios from 'axios';

const API_URL = '/api/gelen-evrak/';

// Create new gelen evrak
const createGelenEvrak = async (evrakData) => {
  const response = await axios.post(API_URL, evrakData);
  return response.data;
};

// Get user gelen evraklar
const getGelenEvraklar = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Get single gelen evrak
const getGelenEvrak = async (id) => {
  const response = await axios.get(API_URL + id);
  return response.data;
};

// Update gelen evrak
const updateGelenEvrak = async (id, evrakData) => {
  const response = await axios.put(API_URL + id, evrakData);
  return response.data;
};

// Delete gelen evrak
const deleteGelenEvrak = async (id) => {
  const response = await axios.delete(API_URL + id);
  return response.data;
};

// Add Note
const addNote = async (id, noteData) => {
    const response = await axios.post(API_URL + id + '/note', noteData);
    return response.data;
};

// Add Response File
const addResponseFile = async (id, formData) => {
    const response = await axios.post(API_URL + id + '/response-file', formData);
    return response.data;
};

// Manage Workflow (Approve/Reject)
const manageWorkflow = async (id, workflowData) => {
    const response = await axios.put(API_URL + id + '/workflow', workflowData);
    return response.data;
};

// Dispatch Response
const dispatchResponse = async (id, formData) => {
    const response = await axios.post(API_URL + id + '/dispatch', formData);
    return response.data;
};

const gelenEvrakService = {
  createGelenEvrak,
  getGelenEvraklar,
  getGelenEvrak,
  updateGelenEvrak,
  deleteGelenEvrak,
  addNote,
  addResponseFile,
  manageWorkflow,
  dispatchResponse,
  linkGidenEvrak: async (id, gidenEvrakId) => {
    const response = await axios.post(API_URL + id + '/link-giden', { gidenEvrakId });
    return response.data;
  },
  unlinkGidenEvrak: async (id, gidenId) => {
    const response = await axios.delete(API_URL + id + '/link-giden/' + gidenId);
    return response.data;
  }
};

export default gelenEvrakService;
