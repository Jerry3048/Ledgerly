/* =========================================================
   LabLedger — API fetch wrapper + shared helpers (React)
   Same contract as the old js/api.js: JSON in/out, session
   cookie included, throws Error(server message) on non-2xx.
   ========================================================= */

const API_BASE_URL = (() => {
  // Build-time override for split deployments (Vercel FE → Render BE):
  //   VITE_API_URL=https://lab-overall-ledger.onrender.com
  const env =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL
      ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
      : '';
  if (env) return env;
  // Runtime override (kept for parity with the old config.js).
  if (typeof window !== 'undefined' && window.LAB_API_URL) {
    return String(window.LAB_API_URL).replace(/\/+$/, '');
  }
  // Same-origin when served over http(s) — zero CORS on single-service
  // deploys (Express serves dist/ + /api from one origin).
  if (
    typeof window !== 'undefined' &&
    window.location &&
    /^https?:$/.test(window.location.protocol)
  ) {
    return window.location.origin;
  }
  return 'https://lab-overall-ledger.onrender.com';
})();

export async function api(path, opts = {}) {
  const res = await fetch(API_BASE_URL + '/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // required for cross-origin session cookies
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }
  if (!res.ok)
    throw new Error(
      (data && data.error) || 'Something went wrong. Please try again.'
    );
  return data;
}

/** Return today's date as YYYY-MM-DD. */
export const today = () => new Date().toISOString().slice(0, 10);

/** Capitalise the first letter of a string. */
export const titleCase = (s) =>
  (s || '').charAt(0).toUpperCase() + (s || '').slice(1);

/** Format an ISO date string (YYYY-MM-DD) to "09 Sep 2026" style. */
export const fmtDate = (d) =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/** True if a borrow record is currently overdue. */
export const isOverdue = (b) =>
  b.status === 'borrowed' && b.expected_return && b.expected_return < today();

/** Display status for a borrow record — adds 'overdue' as a virtual status. */
export const borrowDisplayStatus = (b) => (isOverdue(b) ? 'overdue' : b.status);

export default API_BASE_URL;
