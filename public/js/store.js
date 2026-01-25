// ============================================
// STORE.JS - In-Memory State + LocalStorage Caching
// ============================================

const Store = {
  // ============================================
  // CATALOG DATA (loaded once, cached)
  // ============================================
  catalog: {
    categories: [],
    materials: [],
    sizes: [],
    fittings: []
  },

  // ============================================
  // CURRENT BILL STATE
  // ============================================
  currentBill: {
    estimateNo: null,
    date: null,
    customer: {
      name: "",
      phone: ""
    },
    items: [],
    subTotal: 0,
    discountPercent: 0,
    discount: 0,
    total: 0,
    received: 0,
    balance: 0
  },

  // ============================================
  // UI STATE
  // ============================================
  ui: {
    selectedCategory: null,
    selectedMaterial: null,
    selectedSize: null,
    selectedFitting: null,
    activeRowIndex: null
  },

  // ============================================
  // LOAD CATALOG (with localStorage caching)
  // ============================================
  async loadCatalog(forceRefresh = false) {
    try {
      // If force refresh, skip cache
      if (!forceRefresh) {
        // Check localStorage cache first
        const cached = localStorage.getItem('catalog_data');
        const cacheTime = localStorage.getItem('catalog_time');
        
        // Use cache if less than 5 minutes old (300000 ms) - REDUCED from 1 hour
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < 300000) {
            this.catalog = JSON.parse(cached);
            console.log("✅ Catalog loaded from cache");
            return true;
          }
        }
      }
      
      // Cache expired or force refresh - fetch from server
      console.log("⏳ Loading catalog from server...");
      this.catalog = await API.getCatalog();
      
      // Save to localStorage
      localStorage.setItem('catalog_data', JSON.stringify(this.catalog));
      localStorage.setItem('catalog_time', Date.now().toString());
      
      console.log("✅ Catalog loaded and cached");
      return true;
    } catch (error) {
      console.error("❌ Failed to load catalog:", error);
      
      // Try to use old cache as fallback
      const cached = localStorage.getItem('catalog_data');
      if (cached) {
        this.catalog = JSON.parse(cached);
        console.log("⚠️ Using old cache as fallback");
        return true;
      }
      
      return false;
    }
  },

  // ============================================
  // REFRESH CATALOG (force reload from server)
  // ============================================
  async refreshCatalog() {
    console.log("🔄 Force refreshing catalog...");
    this.clearCache();
    return await this.loadCatalog(true);
  },

  // ============================================
  // CLEAR CACHE (force refresh)
  // ============================================
  clearCache() {
    localStorage.removeItem('catalog_data');
    localStorage.removeItem('catalog_time');
    console.log("🗑️ Cache cleared");
  },

  // ============================================
  // CHECK IF CACHE IS STALE
  // ============================================
  isCacheStale() {
    const cacheTime = localStorage.getItem('catalog_time');
    if (!cacheTime) return true;
    
    const age = Date.now() - parseInt(cacheTime);
    return age > 300000; // 5 minutes
  },

  // ============================================
  // GET MATERIALS BY CATEGORY
  // ============================================
  getMaterialsByCategory(categoryId) {
    return this.catalog.materials.filter(m => 
      m.categoryId === categoryId && m.active
    );
  },

  // ============================================
  // GET SIZES BY MATERIAL
  // ============================================
  getSizesByMaterial(materialId) {
    return this.catalog.sizes.filter(s => 
      s.materialId === materialId && s.active
    );
  },

  // ============================================
  // GET FITTINGS BY MATERIAL
  // ============================================
  getFittingsByMaterial(materialId) {
    return this.catalog.fittings.filter(f => 
      f.materialId === materialId && f.active
    );
  },

  // ============================================
  // SELECT CATEGORY
  // ============================================
  selectCategory(categoryId) {
    this.ui.selectedCategory = categoryId;
    this.ui.selectedMaterial = null;
    this.ui.selectedSize = null;
    this.ui.selectedFitting = null;
  },

  // ============================================
  // SELECT MATERIAL
  // ============================================
  selectMaterial(materialId) {
    this.ui.selectedMaterial = materialId;
    this.ui.selectedSize = null;
    this.ui.selectedFitting = null;
  },

  // ============================================
  // SELECT SIZE
  // ============================================
  selectSize(sizeId) {
    this.ui.selectedSize = sizeId;
  },

  // ============================================
  // SELECT FITTING
  // ============================================
  selectFitting(fittingId) {
    this.ui.selectedFitting = fittingId;
  },

  // ============================================
  // BUILD PRODUCT NAME
  // ============================================
  buildProductName() {
    const parts = [];
    
    if (this.ui.selectedMaterial) {
      const material = this.catalog.materials.find(m => 
        m._id === this.ui.selectedMaterial
      );
      if (material) parts.push(material.name);
    }
    
    if (this.ui.selectedSize) {
      const size = this.catalog.sizes.find(s => 
        s._id === this.ui.selectedSize
      );
      if (size) parts.push(size.value);
    }
    
    if (this.ui.selectedFitting) {
      const fitting = this.catalog.fittings.find(f => 
        f._id === this.ui.selectedFitting
      );
      if (fitting) parts.push(fitting.name);
    }
    
    return parts.join(" ");
  },

  // ============================================
  // ADD ITEM TO BILL
  // ============================================
  addItem(item) {
    this.currentBill.items.push({
      productName: item.productName || "",
      qty: item.qty || 1,
      unit: item.unit || "Pcs",
      price: item.price || 0,
      amount: (item.qty || 1) * (item.price || 0),
      isPly: item.isPly || false,
      height: item.height || null,
      width: item.width || null,
      pieces: item.pieces || null
    });
    this.calculateTotals();
  },

  // ============================================
  // UPDATE ITEM
  // ============================================
  updateItem(index, updates) {
    if (this.currentBill.items[index]) {
      Object.assign(this.currentBill.items[index], updates);
      
      // Recalculate amount
      const item = this.currentBill.items[index];
      item.amount = item.qty * item.price;
      
      this.calculateTotals();
    }
  },

  // ============================================
  // REMOVE ITEM
  // ============================================
  removeItem(index) {
    this.currentBill.items.splice(index, 1);
    this.calculateTotals();
  },

  // ============================================
  // CALCULATE TOTALS
  // ============================================
  calculateTotals() {
    // Sub total
    this.currentBill.subTotal = this.currentBill.items.reduce(
      (sum, item) => sum + item.amount, 0
    );
    
    // Discount (already set from input)
    const discount = this.currentBill.discount || 0;
    
    // Grand total
    this.currentBill.total = Math.max(
      this.currentBill.subTotal - discount, 0
    );
    
    // Balance
    this.currentBill.balance = Math.max(
      this.currentBill.total - (this.currentBill.received || 0), 0
    );
  },

  // ============================================
  // CALCULATE DISCOUNT FROM PERCENT
  // ============================================
  applyDiscountPercent(percent) {
    this.currentBill.discountPercent = percent;
    this.currentBill.discount = 
      (this.currentBill.subTotal * percent) / 100;
    this.calculateTotals();
  },

  // ============================================
  // CALCULATE PERCENT FROM DISCOUNT RS
  // ============================================
  applyDiscountRs(discountRs) {
    this.currentBill.discount = discountRs;
    this.currentBill.discountPercent = 
      this.currentBill.subTotal > 0 
        ? Math.round((discountRs / this.currentBill.subTotal) * 100)
        : 0;
    this.calculateTotals();
  },

  // ============================================
  // RESET BILL
  // ============================================
  resetBill() {
    this.currentBill = {
      estimateNo: null,
      date: new Date().toISOString().split("T")[0],
      customer: { name: "", phone: "" },
      items: [],
      subTotal: 0,
      discountPercent: 0,
      discount: 0,
      total: 0,
      received: 0,
      balance: 0
    };
    
    this.ui = {
      selectedCategory: null,
      selectedMaterial: null,
      selectedSize: null,
      selectedFitting: null,
      activeRowIndex: null
    };
  },

  // ============================================
  // LOAD BILL (for editing)
  // ============================================
  loadBill(billData) {
    this.currentBill = { ...billData };
    this.calculateTotals();
  }
};

// Initialize on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Store.loadCatalog();
  });
  
  // Auto-refresh catalog when page becomes visible (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Store.isCacheStale()) {
      console.log("🔄 Page visible and cache stale - auto-refreshing...");
      Store.refreshCatalog();
    }
  });
}