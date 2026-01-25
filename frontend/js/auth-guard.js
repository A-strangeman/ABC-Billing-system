// ============================================
// auth-guard.js - Authentication Guard
// frontend/js/auth-guard.js
// ============================================

(async function checkAuth() {
  const API_BASE = "http://localhost:5000/api";
  const token = localStorage.getItem('authToken');
  
  console.log("🔐 Checking authentication...");
  
  // If no token and not on login page, redirect to login
  const currentPage = window.location.pathname;
  const isLoginPage = currentPage.includes('index.html') || currentPage === '/';
  
  if (!token && !isLoginPage) {
    console.log("❌ No token found, redirecting to login");
    window.location.href = '../index.html';
    return;
  }
  
  // If on login page with token, redirect to dashboard
  if (token && isLoginPage) {
    console.log("✅ Already logged in, redirecting to dashboard");
    window.location.href = 'pages/welcome.html';
    return;
  }
  
  // If we have a token, verify it
  if (token) {
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Invalid token');
      }
      
      const data = await response.json();
      
      // Store user info globally
      window.currentUser = {
        username: data.user.username,
        role: data.user.role
      };
      
      console.log('✅ Authenticated as:', window.currentUser.username);
      
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      
      // Clear invalid token
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      
      // Redirect to login if not already there
      if (!isLoginPage) {
        window.location.href = '../index.html';
      }
    }
  }
})();

// ============================================
// GLOBAL LOGOUT FUNCTION
// ============================================
window.logout = function() {
  console.log("🚪 Global logout function called");
  
  if (confirm('Are you sure you want to logout?')) {
    console.log("👋 Logging out...");
    
    // Clear all authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '../index.html';
  }
};

// ============================================
// HELPER: Check if user has specific role
// ============================================
window.hasRole = function(role) {
  if (!window.currentUser) return false;
  return window.currentUser.role === role;
};

// ============================================
// HELPER: Get current username
// ============================================
window.getCurrentUser = function() {
  return window.currentUser || null;
};