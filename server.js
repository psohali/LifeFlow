import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './config/db.js';
import {
  requireAdminPage,
  requireDonorPage,
  requirePatientPage,
  verifySameOrigin,
} from './middleware/authMiddleware.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import requestRoutes from './routes/requestRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const sessionStore = new session.MemoryStore();

const httpsSession = session({
  name: 'lifeflow.sid',
  secret: SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge: 4 * 60 * 60 * 1000,
  },
});

const httpSession = session({
  name: 'lifeflow.sid',
  secret: SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000,
  },
});

app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return (isHttps ? httpsSession : httpSession)(req, res, next);
});

app.use('/api', verifySameOrigin);

// Protect role-specific dashboard HTML pages on the server
app.get('/donor-dashboard.html', requireDonorPage, (req, res) => {
  res.sendFile(path.join(publicDir, 'donor-dashboard.html'));
});

app.get('/patient-dashboard.html', requirePatientPage, (req, res) => {
  res.sendFile(path.join(publicDir, 'patient-dashboard.html'));
});

app.get('/admin-dashboard.html', requireAdminPage, (req, res) => {
  res.sendFile(path.join(publicDir, 'admin-dashboard.html'));
});

// Serve static frontend files
app.use(express.static(publicDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler for unknown API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`LifeFlow server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start LifeFlow server:', err);
    process.exit(1);
  }
}

startServer();
