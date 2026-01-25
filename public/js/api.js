// ============================================
// API.JS – VERCEL SAFE + NO AUTO LOGOUT
// ============================================

// Auto-detect API base
const API_BASE = (() => {
  if (window.location.hostname.includes("vercel.app")) {
    return `${window.location.origin}/api`;
  }
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000/api";
  }
  return "/api";
})();

console.log("🔗 API BASE:", API_BASE);

// ============================================
// AUTH HEADER HELPER
// ============================================
function getAuthHeaders() {
  const token = localStorage.getItem("authToken");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

// ============================================
// API OBJECT
// ============================================
const API = {

  // ---------- AUTH ----------
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw data;

    // 🔐 Save token
    if (data.token) {
      localStorage.setItem("authToken", data.token);
    }

    return data;
  },

  async verifyToken() {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      localStorage.removeItem("authToken");
      throw await res.json();
    }

    return res.json();
  },

  logout() {
    localStorage.removeItem("authToken");
  },

  async changePassword(oldPassword, newPassword) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // ---------- CATALOG ----------
  async getCatalog() {
    const res = await fetch(`${API_BASE}/catalog`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getMaterialsByCategory(id) {
    const res = await fetch(`${API_BASE}/catalog/materials/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getSizesByMaterial(id) {
    const res = await fetch(`${API_BASE}/catalog/sizes/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async getFittingsByMaterial(id) {
    const res = await fetch(`${API_BASE}/catalog/fittings/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ---------- BILLS ----------
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
    const res = await fetch(
      `${API_BASE}/bills?page=${page}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
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

    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  },

  // ---------- CUSTOMERS ----------
  async searchCustomers(query) {
    const res = await fetch(
      `${API_BASE}/customers/search?q=${encodeURIComponent(query)}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async addCustomer(data) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) throw result;
    return result;
  }
};

// ============================================
// EXPORT
// ============================================
if (typeof module !== "undefined") {
  module.exports = API;
}
