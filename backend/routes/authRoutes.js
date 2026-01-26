// ============================================
// authRoutes.js - FIXED FOR VERCEL CORS
// backend/routes/authRoutes.js
// ============================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// JWT Secret (MUST be set in Vercel env)
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// REGISTER USER (Admin / Cashier / Viewer)
// ============================================
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      password: hashedPassword,
      role: role || "admin"
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOGIN - FIXED COOKIE SETTINGS FOR VERCEL
// ============================================
router.post("/login", async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.username);
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ✅ FIXED COOKIE SETTINGS FOR VERCEL
    const cookieOptions = {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction, // Only secure in production
      path: '/'
    };

    console.log('🍪 Setting cookie with options:', cookieOptions);
    res.cookie("token", token, cookieOptions);

    console.log('✅ Login successful:', user.username);
    
    res.json({
      success: true,
      message: "Login successful",
      user: {
        username: user.username,
        role: user.role
      },
      token: token // Also send token in response for backup
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VERIFY LOGIN (READ TOKEN FROM COOKIE)
// ============================================
router.get("/verify", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ============================================
// CHANGE PASSWORD (AUTH REQUIRED)
// ============================================
router.post("/change-password", async (req, res) => {
  try {
    const token = req.cookies.token;
    const { oldPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOGOUT - CLEAR COOKIE
// ============================================
router.post("/logout", (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/'
  };
  
  res.clearCookie("token", cookieOptions);

  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;