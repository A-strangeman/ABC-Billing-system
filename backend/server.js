// backend/server.js - MODIFIED FOR VERCEL
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
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

// CORS - FIX FOR VERCEL
const allowedOrigins = [
  'https://abc-billing-system.vercel.app/', // ⚠️ REPLACE THIS
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(null, false); // Don't throw error, just block
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now, enable later
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(express.json());

// ============================================
// ROUTES
// ============================================
app.use("/api/catalog", require("./routes/catalogRoutes"));
app.use("/api/bills", require("./routes/billRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/drafts", require("./routes/draftRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reports", require("./routes/reportsRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    connected: isConnected
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "ABC Company Billing API",
    status: "running",
    endpoints: {
      catalog: "/api/catalog",
      bills: "/api/bills",
      customers: "/api/customers",
      drafts: "/api/drafts",
      auth: "/api/auth",
      reports: "/api/reports"
    }
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
    console.error("Serverless handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const cookieParser = require("cookie-parser");
app.use(cookieParser());

// For local development
if (require.main === module) {
  connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}