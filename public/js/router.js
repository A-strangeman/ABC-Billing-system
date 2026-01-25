// ============================================
// ROUTER.JS - Simple Page Navigation
// ============================================

const Router = {
  // ============================================
  // ROUTES
  // ============================================
  routes: {
    '/': 'pages/welcome.html',
    '/welcome': 'pages/welcome.html',
    '/make-bill': 'pages/make-bill.html',
    '/billing': 'pages/billing.html',
    '/edit-bill': 'pages/edit-bill.html',
    '/reports': 'pages/reports.html'
  },

  // ============================================
  // NAVIGATE TO PAGE
  // ============================================
  navigate(path) {
    window.location.href = this.routes[path] || this.routes['/'];
  },

  // ============================================
  // GO TO BILLING PAGE WITH CATEGORY
  // ============================================
  goToBilling(category = null) {
    if (category) {
      sessionStorage.setItem('selectedCategory', category);
    }
    this.navigate('/billing');
  },

  // ============================================
  // GO TO EDIT BILL
  // ============================================
  goToEditBill(billId) {
    sessionStorage.setItem('editBillId', billId);
    this.navigate('/billing');
  },

  // ============================================
  // GET CURRENT PAGE
  // ============================================
  getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop().replace('.html', '') || 'welcome';
  },

  // ============================================
  // BACK TO WELCOME
  // ============================================
  goHome() {
    this.navigate('/welcome');
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Router;
}