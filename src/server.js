'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const i18nRoutes = require('./routes/i18n');
const offlineRoutes = require('./routes/offline');
const { requireAuth } = require('./middleware/auth');
const { ensureDataDirs } = require('./utils/storage');
const { runMigration }   = require('./utils/migrate');

const app = express();
const PORT = process.env.PORT || 8000;
const SINGLE_USER_MODE = process.env.SINGLE_USER_MODE !== 'false';

// ── Boot: ensure data dirs & default admin ──────────────────────────────────
ensureDataDirs();
runMigration();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/i18n', i18nRoutes);          // public – no auth needed
app.use('/api/offline', requireAuth, offlineRoutes);  // must be before /api
app.use('/api', requireAuth, apiRoutes);
if (!SINGLE_USER_MODE) app.use('/admin', requireAuth, adminRoutes);

// ── SPA catch-all: serve index.html for all non-API routes ─────────────────
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Error handling ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ OpenFlashcards running on http://localhost:${PORT} (${SINGLE_USER_MODE ? 'single-user' : 'multi-user'})`);
});
