/* =========================================================
   LabLedger — /api/equipment routes
   (quantity-aware — never flips a whole item type)
   ========================================================= */
const router = require('express').Router();
const db     = require('../db');
const { equipment } = require('../db/schema');
const { eq, asc } = require('drizzle-orm');
const { requireAuth, requireStaff, requireAdmin } = require('../middleware/auth');

function withAvailability(e) {
  return { ...e, qty_available: e.qty_total - e.qty_borrowed - e.qty_damaged - e.qty_maintenance };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(equipment).orderBy(asc(equipment.name));
    res.json(rows.map(withAvailability));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name?.trim()) return res.status(400).json({ error: 'Equipment name is required.' });
    const [inserted] = await db.insert(equipment).values({
      name:           b.name.trim(),
      category_id:    b.category_id  || null,
      code:           b.code         || null,
      serial:         b.serial       || null,
      model:          b.model        || null,
      supplier:       b.supplier     || null,
      purchase_date:  b.purchase_date|| null,
      location:       b.location     || null,
      condition_note: b.condition_note|| null,
      notes:          b.notes        || null,
      qty_total:      Number(b.qty_total) || 0,
      qty_borrowed:   0,
      qty_damaged:    0,
      qty_maintenance:0,
    }).returning();
    res.json(withAvailability(inserted));
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const [existing] = await db.select().from(equipment).where(eq(equipment.id, Number(req.params.id)));
    if (!existing) return res.status(404).json({ error: 'Equipment not found.' });

    const b        = req.body || {};
    const newTotal = Number(b.qty_total ?? existing.qty_total);
    const committed = existing.qty_borrowed + existing.qty_damaged + existing.qty_maintenance;
    if (newTotal < committed) {
      return res.status(400).json({ error: `Total quantity can't be less than the ${committed} unit(s) currently borrowed, damaged, or under maintenance.` });
    }

    await db.update(equipment).set({
      name:           b.name?.trim()        || existing.name,
      category_id:    b.category_id         ?? existing.category_id,
      code:           b.code                ?? existing.code,
      serial:         b.serial              ?? existing.serial,
      model:          b.model               ?? existing.model,
      supplier:       b.supplier            ?? existing.supplier,
      purchase_date:  b.purchase_date       ?? existing.purchase_date,
      location:       b.location            ?? existing.location,
      condition_note: b.condition_note      ?? existing.condition_note,
      notes:          b.notes               ?? existing.notes,
      qty_total:      newTotal,
    }).where(eq(equipment.id, Number(req.params.id)));

    const [updated] = await db.select().from(equipment).where(eq(equipment.id, Number(req.params.id)));
    res.json(withAvailability(updated));
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await db.delete(equipment).where(eq(equipment.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Bulk import — accepts JSON rows parsed from a CSV file on the client.
// Body: { items: [{ name, category, category_id, code, serial, model,
//   supplier, purchase_date, location, condition_note, notes, qty_total }] }
// Missing categories are created automatically. Returns per-row errors.
router.post('/bulk', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const { categories } = require('../db/schema');
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No rows to import. Upload a CSV with at least one data row.' });
    }
    if (items.length > 1000) {
      return res.status(400).json({ error: 'Too many rows (max 1000 per import). Split the file and try again.' });
    }
    const catCache = new Map();
    const resolveCategory = async (nameOrId) => {
      if (nameOrId == null || String(nameOrId).trim() === '') return null;
      const asId = Number(nameOrId);
      if (Number.isInteger(asId) && asId > 0 && String(nameOrId).trim() === String(asId)) return asId;
      const name = String(nameOrId).trim();
      if (catCache.has(name.toLowerCase())) return catCache.get(name.toLowerCase());
      let [found] = await db.select().from(categories).where(eq(categories.name, name));
      if (!found) {
        try {
          [found] = await db.insert(categories).values({ name }).returning();
        } catch (e) {
          // Race: another request created it — re-read.
          [found] = await db.select().from(categories).where(eq(categories.name, name));
        }
      }
      const id = found ? found.id : null;
      catCache.set(name.toLowerCase(), id);
      return id;
    };

    let imported = 0;
    const errors = [];
    for (let i = 0; i < items.length; i++) {
      const b = items[i] || {};
      const rowNum = i + 2; // +1 header, +1 for 1-based
      try {
        if (!b.name?.toString().trim()) throw new Error('name is required');
        const qty = b.qty_total == null || b.qty_total === '' ? 0 : Number(b.qty_total);
        if (!Number.isFinite(qty) || qty < 0) throw new Error('qty_total must be 0 or more');
        const category_id = b.category_id != null && b.category_id !== ''
          ? await resolveCategory(b.category_id)
          : await resolveCategory(b.category);
        await db.insert(equipment).values({
          name:           b.name.toString().trim(),
          category_id,
          code:           b.code?.toString().trim() || null,
          serial:         b.serial?.toString().trim() || null,
          model:          b.model?.toString().trim() || null,
          supplier:       b.supplier?.toString().trim() || null,
          purchase_date:  b.purchase_date?.toString().trim() || null,
          location:       b.location?.toString().trim() || null,
          condition_note: b.condition_note?.toString().trim() || null,
          notes:          b.notes?.toString().trim() || null,
          qty_total:      Math.floor(qty),
          qty_borrowed:   0,
          qty_damaged:    0,
          qty_maintenance: 0,
        });
        imported++;
      } catch (e) {
        errors.push({ row: rowNum, error: e.message || 'Invalid row.' });
      }
    }
    res.json({ imported, failed: errors.length, errors: errors.slice(0, 50) });
  } catch (err) { next(err); }
});

module.exports = router;
