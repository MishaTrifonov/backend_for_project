require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require("path");
const { spawn } = require('child_process');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    log('INFO', `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
console.log('Connecting to MongoDB at', mongoUri);
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

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

// Date formatting function
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Server state tracking
const serverState = {
  startedAt: formatDate(new Date()),
  pid: process.pid,
  logs: [],
  errors: [],
  maxLogs: 1000,
  maxErrors: 100
};

// Custom logging function
function log(level, message, ...args) {
  const timestamp = formatDate(new Date());
  const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : message;
  const logMessage = `[${timestamp}] [${level}] ${fullMessage}`;
  
  // Console output using original methods
  if (level === 'ERROR') {
    originalError(logMessage);
  } else if (level === 'WARN') {
    originalWarn(logMessage);
  } else {
    originalLog(logMessage);
  }
  
  // Store in memory
  serverState.logs.push({ ts: timestamp, level, message: fullMessage });
  if (serverState.logs.length > serverState.maxLogs) {
    serverState.logs.shift();
  }
  
  // Track errors separately
  if (level === 'ERROR' || level === 'WARN') {
    serverState.errors.push({ ts: timestamp, level, message: fullMessage });
    if (serverState.errors.length > serverState.maxErrors) {
      serverState.errors.shift();
    }
  }
}

// Store original console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Override console methods to capture all output
console.log = function(...args) {
  log('INFO', ...args);
};

console.error = function(...args) {
  log('ERROR', ...args);
};

console.warn = function(...args) {
  log('WARN', ...args);
};


// Register/Create User Route
app.post("/api/register", async (req, res) => {
  try {
    console.log("Registration attempt");

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(req.body.password, saltRounds);

    const newUser = new User({
      ...req.body,
      passwordHash,

    });

    await newUser.save();
    console.log("User created successfully");

    return res.status(201).json({
      success: true,
      message: "User created successfully"
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message
    });
  }
});

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
      createdAt: user.createdAt,
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
  res.json({ status: 'ok', timestamp: formatDate(new Date()) });
});

app.get("/control", (req, res) => {
  res.sendFile(path.join(__dirname, "control.html"));
});

// Control API endpoints
app.get('/control/status', (req, res) => {
  const uptime = (Date.now() - new Date(serverState.startedAt).getTime()) / 1000;
  res.json({
    pid: serverState.pid,
    uptime: uptime,
    startedAt: serverState.startedAt,
    mongoConnected: mongoose.connection.readyState === 1
  });
});

app.get('/control/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 500;
  const recentLogs = serverState.logs.slice(-limit);
  const logsText = recentLogs.map(l => `[${l.ts}] [${l.level}] ${l.message}`).join('\n');
  res.json({ logs: logsText, count: recentLogs.length });
});

app.get('/control/errors', (req, res) => {
  res.json({ errors: serverState.errors });
});

app.post('/control/stop', (req, res) => {
  console.log('Stop command received, shutting down server...');
  res.json({ success: true, message: 'Server shutting down' });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

app.post('/control/restart', (req, res) => {
  console.log('Restart command received, restarting server...');
  res.json({ success: true, message: 'Server restarting' });
  
  setTimeout(() => {
    const args = process.argv.slice(1);
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd(),
      env: process.env
    });
    
    child.unref();
    console.log('New process spawned, shutting down current process...');
    process.exit(0);
  }, 1000);
});

app.post('/control/clearlogs', (req, res) => {
  console.log('Clear logs command received');
  serverState.logs = [];
  serverState.errors = [];
  console.log('Logs and errors cleared');
  res.json({ success: true, message: 'Logs cleared successfully' });
});

// Start server when run directly
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log(`Control panel available at http://localhost:${port}/control`);
  });
}

module.exports = app;