// public/js/auth-guard.js - FIXED FOR COOKIE-BASED AUTH

(async function checkAuth() {
  // Determine API base URL dynamically
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'
    : window.location.origin + '/api';
  
  const token = localStorage.getItem('authToken');
  
  console.log("🔐 Checking authentication...");
  console.log("🔐 API Base:", API_BASE);
  console.log("🔐 Token in localStorage:", token ? "EXISTS" : "NONE");
  
  const currentPage = window.location.pathname;
  const isLoginPage = currentPage.includes('index.html') || currentPage === '/';
  
  // If no token and not on login page, redirect
  if (!token && !isLoginPage) {
    console.log("❌ No token found, redirecting to login");
    window.location.href = '../index.html';
    return;
  }
  
  // If on login page with token, verify it first
  if (token && isLoginPage) {
    try {
      console.log("🔍 Verifying token on login page...");
      
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'GET',
        credentials: 'include', // ✅ IMPORTANT: Include cookies
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log("✅ Already logged in, redirecting to dashboard");
        window.location.href = 'pages/welcome.html';
        return;
      } else {
        // Token invalid, clear it
        console.log("❌ Token invalid, clearing...");
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
      }
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
    }
    return;
  }
  
  // If we have a token and NOT on login page, verify it
  if (token && !isLoginPage) {
    try {
      console.log("🔍 Verifying token...");
      
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'GET',
        credentials: 'include', // ✅ IMPORTANT: Include cookies
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("📡 Verify response status:", response.status);
      
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      
      const data = await response.json();
      console.log("✅ Token verified:", data);
      
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
      
      // Redirect to login
      console.log("🔄 Redirecting to login...");
      window.location.href = '../index.html';
    }
  }
})();

// ============================================
// GLOBAL LOGOUT FUNCTION
// ============================================
window.logout = async function() {
  console.log("🚪 Global logout function called");
  
  if (confirm('Are you sure you want to logout?')) {
    console.log("👋 Logging out...");
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8000/api'
      : window.location.origin + '/api';
    
    try {
      // Call logout endpoint to clear cookie
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    
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