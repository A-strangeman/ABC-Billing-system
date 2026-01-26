// backend/server.js - FIXED FOR VERCEL
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

// ============================================
// VERCEL SERVERLESS FIX - Connect DB once
// ============================================
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    console.log("=> Using existing database connection");
    return;
  }
  
  try {
    await connectDB();
    isConnected = true;
    console.log("=> New database connection established");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

// ============================================
// MIDDLEWARE
// ============================================

// CORS - FIXED FOR VERCEL with Environment Variable
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',')
  : [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'https://abc-billing-system.vercel.app'
    ];

console.log('🔒 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.trim()))) {
      callback(null, true);
    } else {
      console.log('⚠️ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/catalog", require("./routes/catalogRoutes"));
app.use("/api/bills", require("./routes/billRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/drafts", require("./routes/draftRoutes"));
app.use("/api/reports", require("./routes/reportsRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    connected: isConnected,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "ABC Company Billing API",
    status: "running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      catalog: "/api/catalog",
      bills: "/api/bills",
      customers: "/api/customers",
      drafts: "/api/drafts",
      reports: "/api/reports",
      health: "/api/health"
    }
  });
});

// IMPORTANT: Root path handler for Vercel
app.get("/", (req, res) => {
  res.json({
    message: "ABC Company Billing API",
    status: "running",
    version: "1.0.0",
    note: "Add /api prefix to access endpoints",
    endpoints: {
      auth: "/api/auth",
      catalog: "/api/catalog",
      bills: "/api/bills",
      customers: "/api/customers",
      drafts: "/api/drafts",
      reports: "/api/reports",
      health: "/api/health"
    }
  });
});

// Catch-all for undefined API routes (must be AFTER all route definitions)
app.use((req, res, next) => {
  // Only handle unmatched routes
  if (req.path.startsWith('/api/')) {
    console.log('❌ 404 - API route not found:', req.path);
    return res.status(404).json({ 
      error: "API route not found",
      path: req.path,
      method: req.method,
      message: "Check the API endpoint and try again"
    });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  
  res.status(err.statusCode || 500).json({ 
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// VERCEL SERVERLESS HANDLER
// ============================================
module.exports = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    console.error("❌ Serverless handler error:", error);
    return res.status(500).json({ 
      error: "Database connection failed",
      message: error.message 
    });
  }
};

// ============================================
// LOCAL DEVELOPMENT SERVER
// ============================================
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log('✅ Server running on port', PORT);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
      console.log('📊 MongoDB:', process.env.MONGO_URI ? 'Connected' : 'Not configured');
    });
  }).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
}