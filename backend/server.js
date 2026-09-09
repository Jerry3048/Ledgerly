/* =========================================================
   LabLedger — Express entry point
   All business logic lives in routes/ and middleware/.
   ========================================================= */
require('dotenv').config(); // must be first — routes/db read process.env

const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');

const app = express();

/* ---------------- CORS ---------------- */
// ALLOWED_ORIGIN in .env controls which frontend origin(s) may call this API.
// Supports a comma-separated list of origins, e.g.:
//   ALLOWED_ORIGIN=http://localhost:3000,https://myapp.vercel.app
const _rawOrigins = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const ALLOWED_ORIGINS = _rawOrigins.split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, same-origin server calls)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    credentials: true, // allow the session cookie to be sent cross-origin
  })
);

/* ---------------- core middleware ---------------- */
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ---------------- session ---------------- */
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && process.env.NODE_ENV === 'production') {
  // Bug fix #5: loudly fail in production if the secret has not been set
  console.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start in production mode.');
  process.exit(1);
}
app.use(
  session({
    name: 'labledger.sid',
    secret: SESSION_SECRET || 'labledger-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Cross-origin deployments (frontend & backend on different domains) require
      // sameSite:'none' + secure:true so the browser will send the cookie.
      // In local dev (http) we fall back to 'lax' since 'none' requires HTTPS.
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

/* ---------------- API routes ---------------- */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/consumables', require('./routes/consumables'));
app.use('/api/borrows', require('./routes/borrows'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/users', require('./routes/users'));

/* ---------------- SPA fallback ---------------- */
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

/* ---------------- global error handler ---------------- */
// Catches errors thrown (or passed to next()) by async route handlers
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

/* ---------------- start ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LabLedger running at http://localhost:${PORT}`));
