/* =========================================================
   LabLedger — Drizzle database connection
   Exports a single shared `db` instance used by all routes
   and middleware. The Pool is created once at startup.
   ========================================================= */
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('./schema');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set.\n' +
    'Copy backend/.env.example to backend/.env and fill in your connection string.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Allows self-signed certs on cloud providers (Neon, Supabase, Railway)
  ssl: process.env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

// Surface connection errors early so the process exits with a clear message
pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});

const db = drizzle(pool, { schema });

// Default export stays the Drizzle instance so existing
// require('../db') call sites keep working; pool is attached
// for session-store / tooling use: require('../db').pool
module.exports = db;
module.exports.db = db;
module.exports.pool = pool;
