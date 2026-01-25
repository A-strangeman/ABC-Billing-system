// ============================================
// createAdmin.js - Run this ONCE to create admin
// backend/createAdmin.js
// ============================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

// User Schema (copy from your models/index.js)
const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'cashier', 'viewer'],
    default: 'admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", UserSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists!");
      console.log("Username: admin");
      console.log("To reset password, delete the user from database first.");
      process.exit(0);
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt); // Change this password!

    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();

    console.log("✅ Admin user created successfully!");
    console.log("-----------------------------------");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("-----------------------------------");
    console.log("⚠️  IMPORTANT: Change this password after first login!");
    
    process.exit(0);

  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();