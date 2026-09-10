/* =========================================================
   LabLedger — tiny CSV helpers (no dependencies).
   parseCSV(text) -> array of objects keyed by header row.
   toCSV(rows, columns) -> CSV string. downloadCSV for templates/exports.
   ========================================================= */

/** Split CSV text into rows of fields (handles quotes + commas + newlines). */
function splitRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      /* skip — handled with \n */
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/** Parse CSV text into [{...}] using the first row as headers. */
export function parseCSV(text) {
  // Strip BOM if the file was saved from Excel.
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const rows = splitRows(clean);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) =>
    String(h || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
  );
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? '').toString().trim();
    });
    return obj;
  });
}

function esc(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Build a CSV string from rows + ordered column keys. */
export function toCSV(rows, columns) {
  const head = columns.map(esc).join(',');
  const body = (rows || []).map((r) => columns.map((c) => esc(r[c])).join(','));
  return [head, ...body].join('\n');
}

/** Trigger a browser download of a CSV string. */
export function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const EQUIPMENT_TEMPLATE_COLS = [
  'name',
  'category',
  'code',
  'serial',
  'model',
  'supplier',
  'purchase_date',
  'location',
  'condition_note',
  'notes',
  'qty_total',
];

export const CONSUMABLE_TEMPLATE_COLS = [
  'name',
  'category',
  'unit',
  'stock',
  'reorder_level',
  'location',
];
