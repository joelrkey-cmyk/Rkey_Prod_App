import axios from "./axiosConfig";

const apiService = {
  // Direct Axios wrappers (returning the full response object)
  get: (path, config) => axios.get(path, config),
  post: (path, data, config) => axios.post(path, data, config),
  put: (path, data, config) => axios.put(path, data, config),
  delete: (path, config) => axios.delete(path, config),

  // request helper (returning direct data)
  request: async (path, options = {}) => {
    const res = await axios({ url: path, ...options });
    return res.data;
  },

  // Global settings
  getSettings: async () => {
    const res = await axios.get("/global-settings");
    return res.data;
  },
  updateSettings: async (formData) => {
    const res = await axios.put("/global-settings", formData);
    return res.data;
  },

  // Technical notes
  getTechnicalNotes: async () => {
    const res = await axios.get("/technical-notes");
    return res.data;
  },
  createTechnicalNote: async (data) => {
    const res = await axios.post("/technical-notes", data);
    return res.data;
  },
  deleteTechnicalNote: async (key) => {
    const res = await axios.delete(`/technical-notes/${key}`);
    return res.data;
  },
  updateTechnicalNote: async (key, data) => {
    const res = await axios.put(`/technical-notes/${key}`, data);
    return res.data;
  },
  reorderTechnicalNotes: async (reorderData) => {
    const res = await axios.put("/technical-notes/reorganize", reorderData);
    return res.data;
  },

  // Material options
  getMaterialOptions: async () => {
    const res = await axios.get("/material-options");
    return res.data;
  },
  createMaterialOption: async (data) => {
    const res = await axios.post("/material-options", data);
    return res.data;
  },
  deleteMaterialOption: async (id) => {
    const res = await axios.delete(`/material-options/${id}`);
    return res.data;
  },
  updateMaterialOption: async (id, data) => {
    const res = await axios.put(`/material-options/${id}`, data);
    return res.data;
  },
  reorderMaterialOptions: async (reorderData) => {
    const res = await axios.put("/material-options/reorder", reorderData);
    return res.data;
  },

  // Contract PDF notes
  getContractPdfNotes: async () => {
    const res = await axios.get("/contract-pdf-notes");
    return res.data;
  },
  createContractPdfNote: async (formData) => {
    const res = await axios.post("/contract-pdf-notes", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  deleteContractPdfNote: async (id) => {
    const res = await axios.delete(`/contract-pdf-notes/${id}`);
    return res.data;
  },
  reorderContractPdfNotes: async (reorderData) => {
    const res = await axios.post("/contract-pdf-notes/reorder", reorderData);
    return res.data;
  },

  // CGV Templates
  getCgvTemplates: async () => {
    const res = await axios.get("/cgv-templates");
    return res.data;
  },
  updateCgvTemplates: async (data) => {
    const res = await axios.put("/cgv-templates", { templates: data });
    return res.data;
  },

  // Compile Contract Guide
  compileContractGuide: async (data) => {
    const res = await axios.post("/contracts2/compile-guide", data);
    return res.data;
  },

  // Sticky/Home notes
  getHomeNotes: async () => {
    const res = await axios.get("/home-notes");
    return res.data;
  },
  createHomeNote: async (data) => {
    const res = await axios.post("/home-notes", data);
    return res.data;
  },
  deleteHomeNote: async (id) => {
    const res = await axios.delete(`/home-notes/${id}`);
    return res.data;
  },
  updateHomeNote: async (id, data) => {
    const res = await axios.put(`/home-notes/${id}`, data);
    return res.data;
  },

  // Devis Page upload
  uploadDevisPage: async (formData) => {
    const res = await axios.post("/devis2/pages/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export default apiService;
