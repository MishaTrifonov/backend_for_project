require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
console.log('Connecting to MongoDB at', mongoUri);
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));
// mongoose
//   .connect(mongoUri)
//   .then(() => {
//     console.log("Connected to MongoDB");
//     // Access the native MongoDB Db instance
//     const db = mongoose.connection.db;
//     // Use native driver methods directly on the 'db' object
//     // For example, listing all collection names:
//     db.listCollections().toArray((err, collections) => {
//       if (err) {
//         console.error(err);
//         return;
//       }
//       console.log(
//         "Collections:",
//         collections.map((c) => c.name),
//       );
//     });
//     console.log("Finished listing collections");
//   })
//   .catch((err) => console.error("MongoDB connection error:", err));
// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String },
  passwordHash: { type: String, required: true },
  role: { type: Number, default: 2 },
  isActive: { type: Boolean, default: true },
  sessionCount: { type: Number, default: 0 },
  allowedScenarios: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
}, { collection: 'users' });

const User = mongoose.model('users', userSchema);

// Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    console.log("Login attempt for username:", username);

    if (!username || !password) {
      console.log("Missing username or password in request body:", req.body);
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Print current database and collection info
    const db = mongoose.connection.db;
    console.log("Connected to DB:", db.databaseName);
    // const collections = await db.listCollections().toArray();
    // console.log(
    //   "Collections in DB:",
    //   collections.map((c) => c.name),
    // );

    // Use Mongoose model for user lookup
    const user = await User.findOne({ username });
    console.log("User found for login:", user ? user.username : "none");
    if (user) {
      console.log("User document:", user);
    }

    if (!user) {
      console.log("No user found with username:", username);
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
    if (user.isActive === false) {
      console.log("Account disabled for user:", username);
      return res
        .status(403)
        .json({ success: false, message: "Account disabled" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("Password match result:", match);
    console.log("Password hash for comparison:", hash);

    if (!match) {
      console.log("Password mismatch for user:", username);
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    // Update session count and last login
    try {
      user.sessionCount = (user.sessionCount || 0) + 1;
      user.lastLogin = new Date();
      await user.save();
      console.log("Updated sessionCount and lastLogin for user:", username);
    } catch (e) {
      console.warn("Failed updating sessionCount:", e && e.message);
    }

    const userForClient = {
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.role,
      isActive: user.isActive,
      sessionCount: user.sessionCount || 0,
      allowedScenarios: user.allowedScenarios || [],
    };

    console.log("Login successful for user:", username);

    return res.json({
      success: true,
      message: "Login successful",
      user: userForClient,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server when run directly
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
}

module.exports = app;