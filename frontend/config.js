/* =========================================================
   LabLedger — Frontend configuration
   ---------------------------------------------------------
   Optional override: set window.LAB_API_URL *before* this
   script loads to point at a split backend, e.g.:
     <script>window.LAB_API_URL = 'https://lab-overall-ledger.onrender.com';</script>

   Default: same-origin (window.location.origin) when served
   over http(s) — this avoids CORS entirely when Express
   serves frontend/ and the API from one service.

   Fallback (file:// previews): Render backend URL.

   Load order: this script MUST be loaded before js/api.js
   so that the constant is available when api.js executes.
   ========================================================= */

const API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && window.LAB_API_URL) return String(window.LAB_API_URL).replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location && /^https?:$/.test(window.location.protocol)) return window.location.origin;
  return 'https://lab-overall-ledger.onrender.com';
})();
