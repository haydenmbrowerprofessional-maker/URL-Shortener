require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { apiLimiter } = require('./middleware/rateLimiter');
const { redirect } = require('./controllers/urlController');
const authRoutes = require('./routes/auth');
const urlRoutes = require('./routes/urls');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); // needed for accurate IP behind proxies

// ── Rate limiting ────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);

// ── Public redirect (must be last) ───────────────────────────
app.get('/:shortCode', redirect);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: 'Something went wrong.' });
});

// ── Start server ─────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
