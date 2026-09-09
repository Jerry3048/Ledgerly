/* =========================================================
   LabLedger — shared DOM helpers & API fetch wrapper
   ========================================================= */

/* ---------------- DOM shortcuts ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------- formatting helpers ---------------- */
/** HTML-escape a value so it's safe to inject into innerHTML. */
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Format an ISO date string (YYYY-MM-DD) to "09 Sep 2026" style. */
const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Capitalise the first letter of a string. */
const titleCase = (s) => (s || '').charAt(0).toUpperCase() + (s || '').slice(1);

/** Return today's date as YYYY-MM-DD. */
const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- toast notification ---------------- */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- API fetch wrapper ---------------- */
/**
 * Thin wrapper around fetch() that:
 *  - Prepends API_BASE_URL + /api to all paths (base URL set in config.js)
 *  - Sets Content-Type: application/json
 *  - JSON-encodes the body automatically
 *  - Includes credentials so the session cookie is sent cross-origin
 *  - Throws on non-2xx responses with the server's error message
 */
async function api(path, opts = {}) {
  const res = await fetch(API_BASE_URL + '/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',                // required for cross-origin session cookies
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong. Please try again.');
  return data;
}
