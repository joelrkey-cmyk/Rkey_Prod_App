import axios from './axiosConfig';
class APIService {
  constructor() {
    this.baseURL = '/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    let requestData = options.data;
    if (options.body) {
      try {
        requestData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch (e) {
        requestData = options.body;
      }
    }

    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        data: requestData,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('API request failed:', error);
      if (error.response && error.response.data) {
        throw new Error(error.response.data.detail || 'Erreur API');
      }
      throw error;
    }
  }

  // Handle FormData separately
  async requestFormData(endpoint, formData, method = 'POST') {
    try {
      const response = await axios({
        url: `${this.baseURL}${endpoint}`,
        method,
        data: formData
      });
      return response.data;
    } catch (error) {
      console.error('API FormData request failed:', error);
      if (error.response && error.response.data) {
        throw new Error(error.response.data.detail || 'Erreur API');
      }
      throw error;
    }
  }

  // Generic HTTP methods
  async get(endpoint) {
    const data = await this.request(endpoint, { method: 'GET' });
    return { data };
  }

  async post(endpoint, body) {
    const data = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { data };
  }

  async put(endpoint, body) {
    const data = await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { data };
  }

  async delete(endpoint) {
    const data = await this.request(endpoint, { method: 'DELETE' });
    return { data };
  }

  // Settings endpoints
  async getSettings() {
    return await this.request('/settings');
  }

  async updateSettings(settingsData) {
    return await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // Utility endpoints
  async testEmail() {
    return await this.request('/test-email', {
      method: 'POST',
    });
  }

  // Technical Notes endpoints
  async getTechnicalNotes() {
    return await this.request('/technical-notes');
  }

  async getTechnicalNote(noteKey) {
    return await this.request(`/technical-notes/${encodeURIComponent(noteKey)}`);
  }

  async updateTechnicalNote(noteKey, noteData) {
    return await this.request(`/technical-notes/${encodeURIComponent(noteKey)}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  async createTechnicalNote(noteData) {
    return await this.request('/technical-notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  async deleteTechnicalNote(noteKey) {
    return await this.request(`/technical-notes/${encodeURIComponent(noteKey)}`, {
      method: 'DELETE',
    });
  }

  async reorderTechnicalNotes(notesOrder) {
    return await this.request('/technical-notes/reorganize', {
      method: 'PUT',
      body: JSON.stringify(notesOrder),
    });
  }

  // Material Options endpoints
  async getMaterialOptions() {
    return await this.request('/material-options');
  }

  async createMaterialOption(optionData) {
    return await this.request('/material-options', {
      method: 'POST',
      body: JSON.stringify(optionData),
    });
  }

  async updateMaterialOption(optionId, optionData) {
    return await this.request(`/material-options/${optionId}`, {
      method: 'PUT',
      body: JSON.stringify(optionData),
    });
  }

  async deleteMaterialOption(optionId) {
    return await this.request(`/material-options/${optionId}`, {
      method: 'DELETE',
    });
  }

  async reorderMaterialOptions(optionsOrder) {
    return await this.request('/material-options/reorder', {
      method: 'PUT',
      body: JSON.stringify(optionsOrder),
    });
  }

  // File Transfers
  async createFileTransfer({ title, note, expirationDays, files }) {
    const formData = new FormData();
    if (title) formData.append('title', title);
    if (note) formData.append('note', note);
    if (expirationDays) formData.append('expiration_days', expirationDays);
    files.forEach(file => formData.append('files', file));
    
    return await this.requestFormData('/file-transfers', formData);
  }

  // Document Library
  async addToDocumentLibrary({ publicTitle, internalNote, file }) {
    const formData = new FormData();
    formData.append('public_title', publicTitle);
    if (internalNote) formData.append('internal_note', internalNote);
    formData.append('file', file);

    return await this.requestFormData('/document-library', formData);
  }

  // Contract PDF Notes
  async getContractPdfNotes() {
    return await this.request('/contract-pdf-notes');
  }

  async createContractPdfNote(title, order, file) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('order', order);
    formData.append('file', file);

    return await this.requestFormData('/contract-pdf-notes', formData);
  }

  async updateContractPdfNote(id, data) {
    return await this.request(`/contract-pdf-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteContractPdfNote(id) {
    return await this.request(`/contract-pdf-notes/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderContractPdfNotes(notes) {
    return await this.request('/contract-pdf-notes/reorder', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async getCgvTemplates() {
    return await this.request('/cgv-templates');
  }

  async updateCgvTemplates(templates) {
    return await this.request('/cgv-templates', {
      method: 'PUT',
      body: JSON.stringify({ templates }),
    });
  }

  async compileContractGuide(data) {
    return await this.request('/contracts2/compile-guide', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Other missing methods from original APIService (keeping it clean but functional)
  async getFileTransfers() { return await this.request('/file-transfers'); }
  async getDeletedContracts() { return await this.request('/contracts2/trash'); }
  async getArchivedContracts() { return await this.request('/contracts2/archived'); }
  async updateContractStatus(id, status) { return await this.put(`/contracts2/${id}/status`, { status }); }
  async permanentlyDeleteContract(id) { return await this.delete(`/contracts2/${id}/permanent`); }
  
  async uploadDevisPage(formData) {
    return await this.requestFormData('/devis2/pages/upload', formData);
  }
}

export default new APIService();