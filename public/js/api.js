// ============================================
// API.JS - COMPLETE VERSION with Reports
// ============================================

const API_BASE = "http://localhost:5000/api";

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

const API = {
  // ============================================
  // AUTHENTICATION
  // ============================================
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async verifyToken() {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async changePassword(oldPassword, newPassword) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // ============================================
  // CATALOG
  // ============================================
  async getCatalog() {
    const res = await fetch(`${API_BASE}/catalog`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getMaterialsByCategory(categoryId) {
    const res = await fetch(`${API_BASE}/catalog/materials/${categoryId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getSizesByMaterial(materialId) {
    const res = await fetch(`${API_BASE}/catalog/sizes/${materialId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getFittingsByMaterial(materialId) {
    const res = await fetch(`${API_BASE}/catalog/fittings/${materialId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ============================================
  // CATALOG MANAGEMENT
  // ============================================
  async addCategory(data) {
    const res = await fetch(`${API_BASE}/catalog/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async addMaterial(data) {
    const res = await fetch(`${API_BASE}/catalog/materials`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async addSize(data) {
    const res = await fetch(`${API_BASE}/catalog/sizes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async addFitting(data) {
    const res = await fetch(`${API_BASE}/catalog/fittings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE}/catalog/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteMaterial(id) {
    const res = await fetch(`${API_BASE}/catalog/materials/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteSize(id) {
    const res = await fetch(`${API_BASE}/catalog/sizes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteFitting(id) {
    const res = await fetch(`${API_BASE}/catalog/fittings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  // ============================================
  // BILLS
  // ============================================
  async getNextInvoiceNo() {
    const res = await fetch(`${API_BASE}/bills/next-invoice`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async saveBill(billData) {
    const res = await fetch(`${API_BASE}/bills`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(billData)
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async getAllBills(page = 1, limit = 20) {
    const res = await fetch(`${API_BASE}/bills?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getBillById(id) {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async updateBill(id, billData) {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(billData)
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async deleteBill(id) {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw error;
    }
    
    return await res.json();
  },

  async getPriceHistory(productName) {
    const encoded = encodeURIComponent(productName);
    const res = await fetch(`${API_BASE}/bills/price-history/${encoded}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ============================================
  // CUSTOMERS
  // ============================================
  async searchCustomers(query) {
    const res = await fetch(`${API_BASE}/customers/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async addCustomer(customerData) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(customerData)
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // ============================================
  // DRAFTS
  // ============================================
  async saveDraft(draftData) {
    if (draftData._id) {
      const id = draftData._id;
      delete draftData._id;
      
      const res = await fetch(`${API_BASE}/drafts/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(draftData)
      });
      
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    }
    
    const res = await fetch(`${API_BASE}/drafts`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(draftData)
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async getAllDrafts() {
    const res = await fetch(`${API_BASE}/drafts`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getDraftById(draftId) {
    const res = await fetch(`${API_BASE}/drafts/${draftId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async deleteDraft(draftId) {
    const res = await fetch(`${API_BASE}/drafts/${draftId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // ============================================
  // REPORTS API - OPTIMIZED ENDPOINTS
  // ============================================
  
  /**
   * Get aggregated report summary
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {Promise} Summary data with totals
   */
  async getReportSummary(dateFrom, dateTo) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    const res = await fetch(`${API_BASE}/reports/summary?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw await res.json();
    return res.json();
  },
  
  /**
   * Get revenue trend (daily aggregation)
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @returns {Promise} Array of {date, revenue, billCount}
   */
  async getRevenueTrend(dateFrom, dateTo) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    const res = await fetch(`${API_BASE}/reports/revenue-trend?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw await res.json();
    return res.json();
  },
  
  /**
   * Get top customers (pre-aggregated)
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @param {number} limit - Max customers to return
   * @returns {Promise} Array of customer stats
   */
  async getTopCustomers(dateFrom, dateTo, limit = 10) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    params.append('limit', limit);
    
    const res = await fetch(`${API_BASE}/reports/top-customers?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw await res.json();
    return res.json();
  },
  
  /**
   * Get top products (pre-aggregated)
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @param {number} limit - Max products to return
   * @returns {Promise} Array of product stats
   */
  async getTopProducts(dateFrom, dateTo, limit = 10) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    params.append('limit', limit);
    
    const res = await fetch(`${API_BASE}/reports/top-products?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw await res.json();
    return res.json();
  },
  
  /**
   * Get payment status breakdown
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @returns {Promise} {fullyPaid, partiallyPaid, unpaid}
   */
  async getPaymentStatus(dateFrom, dateTo) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    const res = await fetch(`${API_BASE}/reports/payment-status?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw await res.json();
    return res.json();
  },
  
  /**
   * Get recent bills (lean and paginated)
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @param {number} page - Page number
   * @param {number} limit - Bills per page
   * @returns {Promise} Array of bills
   */
  async getRecentBills(dateFrom, dateTo, page = 1, limit = 20) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    params.append('page', page);
    params.append('limit', limit);
    
    const res = await fetch(`${API_BASE}/reports/recent-bills?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw await res.json();
    return res.json();
  }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}