// ============================================
// authRoutes.js - Secure Authentication
// backend/routes/authRoutes.js
// ============================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// JWT Secret (move to .env in production!)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// ============================================
// REGISTER ADMIN (Run this once to create admin)
// ============================================
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username,
      password: hashedPassword,
      role: role || "admin" // admin, cashier, viewer
    });

    await user.save();

    res.status(201).json({ 
      message: "User registered successfully",
      username: user.username,
      role: user.role
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOGIN - Returns JWT Token
// ============================================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: "24h" } // Token expires in 24 hours
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
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
// VERIFY TOKEN - Check if user is logged in
// ============================================
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
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
    res.status(401).json({ error: "Invalid token" });
  }
});

// ============================================
// CHANGE PASSWORD
// ============================================
router.post("/change-password", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { oldPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;