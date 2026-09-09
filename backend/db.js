/*
  This file has been replaced by the db/ directory.

  db/schema.js   — Drizzle ORM table definitions (PostgreSQL)
  db/index.js    — pg.Pool + drizzle() connection instance
  db/seed.js     — demo data seed script (run: npm run db:seed)
  drizzle.config.js — Drizzle Kit configuration

   Migration workflow:
     1. Copy .env.example → .env and set DATABASE_URL
     2. npm run db:push    (creates tables in Postgres)
     3. npm run db:seed    (inserts demo data)
     4. npm run dev        (start the server)
*/

// Compatibility shim: this file shadows the db/ directory due to Node's
// require('./db') resolution (file wins over directory). Re-export the
// real Drizzle instance so require('../db') keeps working.
module.exports = require('./db/index.js');
