/* =========================================================
   LabLedger — Vercel serverless entry point.
   Vercel invokes this function per request; it cannot run
   app.listen(). server.js exports the app and only listens
   when run directly (require.main === module).
   ========================================================= */
module.exports = require('../server.js');
