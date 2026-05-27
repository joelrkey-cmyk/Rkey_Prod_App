import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Define core service and custom helpers
const apiService = {
  // Base request helper
  request: async (url, options = {}) => {
    const response = await api({ url, ...options });
    return response.data;
  },

  get: async (url, config = {}) => {
    const response = await api.get(url, config);
    return response.data;
  },

  post: async (url, data, config = {}) => {
    const response = await api.post(url, data, config);
    return response.data;
  },

  put: async (url, data, config = {}) => {
    const response = await api.put(url, data, config);
    return response.data;
  },

  delete: async (url, config = {}) => {
    const response = await api.delete(url, config);
    return response.data;
  },

  // Custom getters / setters
  getSettings: () => apiService.get('/settings'),
  updateSettings: (data) => apiService.put('/settings', data),

  getTechnicalNotes: () => apiService.get('/technical-notes'),
  createTechnicalNote: (data) => apiService.post('/technical-notes', data),
  deleteTechnicalNote: (key) => apiService.delete(`/technical-notes/${key}`),
  updateTechnicalNote: (key, data) => apiService.put(`/technical-notes/${key}`, data),
  reorderTechnicalNotes: (data) => apiService.post('/technical-notes/reorder', data),

  getMaterialOptions: () => apiService.get('/material-options'),
  createMaterialOption: (data) => apiService.post('/material-options', data),
  deleteMaterialOption: (id) => apiService.delete(`/material-options/${id}`),
  updateMaterialOption: (id, data) => apiService.put(`/material-options/${id}`, data),
  reorderMaterialOptions: (data) => apiService.post('/material-options/reorder', data),

  getContractPdfNotes: () => apiService.get('/contract-pdf-notes'),
  createContractPdfNote: (title, text) => apiService.post('/contract-pdf-notes', { title, text }),
  deleteContractPdfNote: (id) => apiService.delete(`/contract-pdf-notes/${id}`),
  reorderContractPdfNotes: (data) => apiService.post('/contract-pdf-notes/reorder', data),

  getCgvTemplates: () => apiService.get('/cgv-templates'),
  updateCgvTemplates: (data) => apiService.put('/cgv-templates', data),

  getHomeNotes: () => apiService.get('/home-notes'),
  createHomeNote: (data) => apiService.post('/home-notes', data),
  deleteHomeNote: (id) => apiService.delete(`/home-notes/${id}`),
  updateHomeNote: (id, data) => apiService.put(`/home-notes/${id}`, data),

  compileContractGuide: (data) => apiService.post('/contracts/compile-guide', data),
};

export default apiService;
