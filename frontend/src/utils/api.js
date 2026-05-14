// Simple fetch wrapper to automatically add Authorization headers
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api' + url, {
    ...options,
    headers,
  });

  return response;
};

export const API = {
  // Auth
  requestOtp: (payload) => apiFetch('/auth/request-otp', { method: 'POST', body: JSON.stringify(payload) }),
  requestResetOtp: (mobileNo) => apiFetch('/auth/request-otp', { method: 'POST', body: JSON.stringify({ mobileNo, purpose: 'reset' }) }),
  resetPassword: (payload) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  googleLogin: (idToken) => apiFetch('/auth/google-login', { method: 'POST', body: JSON.stringify({ idToken }) }),
  login: (credentials) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  verify: () => apiFetch('/auth/verify'),
  getProfile: () => apiFetch('/auth/profile'),
  updateProfile: (data) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  deleteAccount: () => apiFetch('/auth/delete-account', { method: 'DELETE' }),
  
  // Catalog (Read)
  getCatalog: () => apiFetch('/catalog'),
  getMaterials: (categoryId) => apiFetch(`/catalog/materials/${categoryId}`),
  getSizes: (materialId) => apiFetch(`/catalog/sizes/${materialId}`),
  getFittings: (materialId) => apiFetch(`/catalog/fittings/${materialId}`),
  
  // Catalog (Admin/Write)
  addCategory: (data) => apiFetch('/catalog/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => apiFetch(`/catalog/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => apiFetch(`/catalog/categories/${id}`, { method: 'DELETE' }),
  addMaterial: (data) => apiFetch('/catalog/materials', { method: 'POST', body: JSON.stringify(data) }),
  updateMaterial: (id, data) => apiFetch(`/catalog/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMaterial: (id) => apiFetch(`/catalog/materials/${id}`, { method: 'DELETE' }),
  addSize: (data) => apiFetch('/catalog/sizes', { method: 'POST', body: JSON.stringify(data) }),
  updateSize: (id, data) => apiFetch(`/catalog/sizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSize: (id) => apiFetch(`/catalog/sizes/${id}`, { method: 'DELETE' }),
  addFitting: (data) => apiFetch('/catalog/fittings', { method: 'POST', body: JSON.stringify(data) }),
  updateFitting: (id, data) => apiFetch(`/catalog/fittings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFitting: (id) => apiFetch(`/catalog/fittings/${id}`, { method: 'DELETE' }),
  updateCatalogPrice: (type, id, data) => apiFetch(`/catalog/prices/${type}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  clearCatalogAll: () => apiFetch('/catalog/clear-all', { method: 'POST' }),
  seedDefaultCatalog: () => apiFetch('/catalog/seed-default', { method: 'POST' }),

  // Bills
  getBills: (page = 1, limit = 20) => apiFetch(`/bills?page=${page}&limit=${limit}`),
  getBill: (id) => apiFetch(`/bills/${id}`),
  getNextInvoiceNo: () => apiFetch('/bills/next-invoice'),
  saveBill: (billData) => apiFetch('/bills', { method: 'POST', body: JSON.stringify(billData) }),
  updateBill: (id, billData) => apiFetch(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(billData) }),
  deleteBill: (id) => apiFetch(`/bills/${id}`, { method: 'DELETE' }),
  getPriceHistory: (productName) => apiFetch(`/bills/price-history/${encodeURIComponent(productName)}`),
  
  // Drafts
  getAllDrafts: () => apiFetch('/drafts'),
  getDraft: (draftId) => apiFetch(`/drafts/${draftId}`),
  saveDraft: (draftData) => apiFetch('/drafts', { method: 'POST', body: JSON.stringify(draftData) }),
  updateDraft: (draftId, draftData) => apiFetch(`/drafts/${draftId}`, { method: 'PUT', body: JSON.stringify(draftData) }),
  deleteDraft: (draftId) => apiFetch(`/drafts/${draftId}`, { method: 'DELETE' }),

  // Reports
  getReports: (filters) => {
    let query = '';
    if (filters) {
       const params = new URLSearchParams(filters);
       query = '?' + params.toString();
    }
    return apiFetch(`/reports${query}`);
  },

  // Customers
  searchCustomers: (query) => apiFetch(`/customers/search?q=${encodeURIComponent(query)}`),

  // WhatsApp
  sendInvoiceWhatsApp: (data) => apiFetch('/whatsapp/send-invoice', { method: 'POST', body: JSON.stringify(data) })
};
