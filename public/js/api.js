// public/api.js - FIXED for Vercel
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://abc-billing-system.vercel.app/api';

console.log('🌐 API URL:', API_URL);

// Generic fetch wrapper
async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
  };
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  try {
    console.log(`📡 ${config.method || 'GET'} ${url}`);
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
}

// Export API methods
const API = {
  // Auth
  login: (credentials) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  
  verify: () => apiFetch('/auth/verify'),
  
  register: (userData) => apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  changePassword: (passwords) => apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(passwords)
  }),
  
  // Catalog
  getCatalog: () => apiFetch('/catalog'),
  
  getMaterials: (categoryId) => apiFetch(`/catalog/materials/${categoryId}`),
  
  getSizes: (materialId) => apiFetch(`/catalog/sizes/${materialId}`),
  
  getFittings: (materialId) => apiFetch(`/catalog/fittings/${materialId}`),
  
  // Add catalog items
  addCategory: (data) => apiFetch('/catalog/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  addMaterial: (data) => apiFetch('/catalog/materials', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  addSize: (data) => apiFetch('/catalog/sizes', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  addFitting: (data) => apiFetch('/catalog/fittings', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Delete catalog items
  deleteCategory: (id) => apiFetch(`/catalog/categories/${id}`, { method: 'DELETE' }),
  deleteMaterial: (id) => apiFetch(`/catalog/materials/${id}`, { method: 'DELETE' }),
  deleteSize: (id) => apiFetch(`/catalog/sizes/${id}`, { method: 'DELETE' }),
  deleteFitting: (id) => apiFetch(`/catalog/fittings/${id}`, { method: 'DELETE' }),
  
  // Bills
  getNextInvoiceNo: () => apiFetch('/bills/next-invoice'),
  
  saveBill: (billData) => apiFetch('/bills', {
    method: 'POST',
    body: JSON.stringify(billData)
  }),
  
  getBills: (page = 1, limit = 20) => apiFetch(`/bills?page=${page}&limit=${limit}`),
  
  getAllBills: (page = 1, limit = 20) => apiFetch(`/bills?page=${page}&limit=${limit}`), // ✅ ADD THIS
  
  getBill: (id) => apiFetch(`/bills/${id}`),
  
  getBillById: (id) => apiFetch(`/bills/${id}`),
  
  updateBill: (id, billData) => apiFetch(`/bills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(billData)
  }),
  
  deleteBill: (id) => apiFetch(`/bills/${id}`, { method: 'DELETE' }),
  
  getPriceHistory: (productName) => 
    apiFetch(`/bills/price-history/${encodeURIComponent(productName)}`),
  
  // Customers
  searchCustomers: (query) => apiFetch(`/customers/search?q=${encodeURIComponent(query)}`),
  
  getCustomers: () => apiFetch('/customers'),
  
  saveCustomer: (customerData) => apiFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  }),
  
  updateCustomer: (id, customerData) => apiFetch(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customerData)
  }),
  
  // Drafts
  saveDraft: (draftData) => apiFetch('/drafts', {
    method: 'POST',
    body: JSON.stringify(draftData)
  }),
  
  updateDraft: (draftId, draftData) => apiFetch(`/drafts/${draftId}`, {
    method: 'PUT',
    body: JSON.stringify(draftData)
  }),
  
  getDrafts: () => apiFetch('/drafts'),
  
  getAllDrafts: () => apiFetch('/drafts'), // ✅ ADD THIS
  
  getDraft: (draftId) => apiFetch(`/drafts/${draftId}`),
  
  getDraftById: (draftId) => apiFetch(`/drafts/${draftId}`),
  
  deleteDraft: (draftId) => apiFetch(`/drafts/${draftId}`, { method: 'DELETE' }),
  
  // Reports
  getReportSummary: (dateFrom, dateTo) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return apiFetch(`/reports/summary?${params}`);
  },
  
  getRevenueTrend: (dateFrom, dateTo) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return apiFetch(`/reports/revenue-trend?${params}`);
  },
  
  getTopCustomers: (dateFrom, dateTo, limit = 10) => {
    const params = new URLSearchParams({ limit });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return apiFetch(`/reports/top-customers?${params}`);
  },
  
  getTopProducts: (dateFrom, dateTo, limit = 10) => {
    const params = new URLSearchParams({ limit });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return apiFetch(`/reports/top-products?${params}`);
  },
  
  getPaymentStatus: (dateFrom, dateTo) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return apiFetch(`/reports/payment-status?${params}`);
  },
  
  getRecentBills: (dateFrom, dateTo, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page, limit });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return apiFetch(`/reports/recent-bills?${params}`);
  }
};

// Make it globally available as both API and api for compatibility
window.API = API;
window.api = API;

console.log('✅ API module loaded');