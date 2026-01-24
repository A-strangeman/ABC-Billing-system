// ============================================
// API.JS - All Backend Communication
// ============================================

const API_BASE = "http://localhost:5000/api";

const API = {
  // ============================================
  // CATALOG
  // ============================================
  async getCatalog() {
    const res = await fetch(`${API_BASE}/catalog`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getMaterialsByCategory(categoryId) {
    const res = await fetch(`${API_BASE}/catalog/materials/${categoryId}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getSizesByMaterial(materialId) {
    const res = await fetch(`${API_BASE}/catalog/sizes/${materialId}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getFittingsByMaterial(materialId) {
    const res = await fetch(`${API_BASE}/catalog/fittings/${materialId}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ============================================
  // CATALOG MANAGEMENT (ADD/DELETE)
  // ============================================
  async addCategory(data) {
    const res = await fetch(`${API_BASE}/catalog/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async addMaterial(data) {
    const res = await fetch(`${API_BASE}/catalog/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async addSize(data) {
    const res = await fetch(`${API_BASE}/catalog/sizes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async addFitting(data) {
    const res = await fetch(`${API_BASE}/catalog/fittings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE}/catalog/categories/${id}`, {
      method: 'DELETE'
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteMaterial(id) {
    const res = await fetch(`${API_BASE}/catalog/materials/${id}`, {
      method: 'DELETE'
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteSize(id) {
    const res = await fetch(`${API_BASE}/catalog/sizes/${id}`, {
      method: 'DELETE'
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  async deleteFitting(id) {
    const res = await fetch(`${API_BASE}/catalog/fittings/${id}`, {
      method: 'DELETE'
    });
    
    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  },

  // ============================================
  // BILLS
  // ============================================
  async getNextInvoiceNo() {
    const res = await fetch(`${API_BASE}/bills/next-invoice`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async saveBill(billData) {
    const res = await fetch(`${API_BASE}/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billData)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw data;
    }
    
    return data;
  },

  async getAllBills(page = 1, limit = 20) {
    const res = await fetch(`${API_BASE}/bills?page=${page}&limit=${limit}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getBillById(id) {
    const res = await fetch(`${API_BASE}/bills/${id}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async updateBill(id, billData) {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billData)
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async deleteBill(id) {
    console.log("🗑️ Deleting bill:", id);
    
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: "DELETE"
    });
    
    if (!res.ok) {
      const error = await res.json();
      console.error("❌ Delete failed:", error);
      throw error;
    }
    
    const data = await res.json();
    console.log("✅ Delete successful:", data);
    return data;
  },

  async getPriceHistory(productName) {
    const encoded = encodeURIComponent(productName);
    const res = await fetch(`${API_BASE}/bills/price-history/${encoded}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ============================================
  // CUSTOMERS
  // ============================================
  async searchCustomers(query) {
    const res = await fetch(`${API_BASE}/customers/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async addCustomer(customerData) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    // If updating existing draft
    if (draftData._id) {
      const id = draftData._id;
      delete draftData._id;
      
      const res = await fetch(`${API_BASE}/drafts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData)
      });
      
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    }
    
    // Create new draft
    const res = await fetch(`${API_BASE}/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftData)
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  async getAllDrafts() {
    const res = await fetch(`${API_BASE}/drafts`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getDraftById(draftId) {
    const res = await fetch(`${API_BASE}/drafts/${draftId}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async deleteDraft(draftId) {
    const res = await fetch(`${API_BASE}/drafts/${draftId}`, {
      method: "DELETE"
    });
    
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}