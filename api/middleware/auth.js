// ============================================
// AUTH MIDDLEWARE - Protect Routes
// backend/middleware/auth.js
// ============================================

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not set in environment variables");
  process.exit(1);
}

// ============================================
// AUTHENTICATE - Verify JWT Token
// ============================================
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required. No token provided." 
      });
    }
    
    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required. Invalid token format." 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: "Token expired. Please login again." 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: "Invalid token. Please login again." 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      error: "Authentication failed." 
    });
  }
}

// ============================================
// AUTHORIZE - Check User Role
// ============================================
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required." 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
}

// ============================================
// OPTIONAL AUTH - Don't fail if no token
// ============================================
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role
        };
      }
    }
  } catch (error) {
    // Silently fail - auth is optional
  }
  
  next();
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};