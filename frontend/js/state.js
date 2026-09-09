/* =========================================================
   LabLedger — in-memory application state & role helpers
   All data is fetched from the server; nothing is persisted
   in localStorage or cookies (except the session cookie).
   ========================================================= */

/* ---------------- current user ---------------- */
let ME = null; // { id, name, username, role }

/* ---------------- data caches (populated by loadAll) ---------------- */
let CATEGORIES   = [];
let EQUIPMENT    = [];
let CONSUMABLES  = [];
let BORROWS      = [];
let MAINTENANCE  = [];
let USERS        = [];

/* ---------------- role helpers ---------------- */
const isStaff     = () => ME && (ME.role === 'admin' || ME.role === 'officer');
const isAdmin     = () => ME && ME.role === 'admin';
const isRequester = () => ME && (ME.role === 'lecturer' || ME.role === 'student');

/* ---------------- data lookup helpers ---------------- */
const eqById  = (id) => EQUIPMENT.find(e => e.id === Number(id));
const catById = (id) => CATEGORIES.find(c => c.id === Number(id));
const catName = (id) => (catById(id) || {}).name || '—';

/** True if a borrow record is currently overdue. */
const isOverdue = (b) => b.status === 'borrowed' && b.expected_return && b.expected_return < today();

/** Display status for a borrow record — adds 'overdue' as a virtual status. */
const borrowDisplayStatus = (b) => (isOverdue(b) ? 'overdue' : b.status);
