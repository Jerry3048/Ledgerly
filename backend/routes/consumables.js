/* =========================================================
   LabLedger — /api/consumables routes
   ========================================================= */
const router = require('express').Router();
const db     = require('../db');
const { consumables } = require('../db/schema');
const { eq, asc } = require('drizzle-orm');
const { requireAuth, requireStaff } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await db.select().from(consumables).orderBy(asc(consumables.name)));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name?.trim()) return res.status(400).json({ error: 'Consumable name is required.' });
    const [inserted] = await db.insert(consumables).values({
      name:          b.name.trim(),
      category:      b.category   || null,
      unit:          b.unit?.trim() || 'unit',
      stock:         Number(b.stock)         || 0,
      reorder_level: Number(b.reorder_level) || 0,
      location:      b.location   || null,
    }).returning();
    res.json(inserted);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireStaff, async (req, res, next) => {
  try {
    // Bug fix #2: 404 guard
    const [existing] = await db.select().from(consumables).where(eq(consumables.id, Number(req.params.id)));
    if (!existing) return res.status(404).json({ error: 'Consumable not found.' });

    const b = req.body || {};
    await db.update(consumables).set({
      name:          b.name?.trim()   || existing.name,
      category:      b.category       ?? existing.category,
      unit:          b.unit?.trim()   || existing.unit,
      stock:         Number(b.stock)         ?? existing.stock,
      reorder_level: Number(b.reorder_level) ?? existing.reorder_level,
      location:      b.location ?? existing.location,
    }).where(eq(consumables.id, Number(req.params.id)));

    const [updated] = await db.select().from(consumables).where(eq(consumables.id, Number(req.params.id)));
    res.json(updated);
  } catch (err) { next(err); }
});

// Bulk import — accepts JSON rows parsed from a CSV file on the client.
// Body: { items: [{ name, category, unit, stock, reorder_level, location }] }
router.post('/bulk', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No rows to import. Upload a CSV with at least one data row.' });
    }
    if (items.length > 1000) {
      return res.status(400).json({ error: 'Too many rows (max 1000 per import). Split the file and try again.' });
    }
    let imported = 0;
    const errors = [];
    for (let i = 0; i < items.length; i++) {
      const b = items[i] || {};
      const rowNum = i + 2;
      try {
        if (!b.name?.toString().trim()) throw new Error('name is required');
        const stock = b.stock == null || b.stock === '' ? 0 : Number(b.stock);
        const reorder = b.reorder_level == null || b.reorder_level === '' ? 0 : Number(b.reorder_level);
        if (!Number.isFinite(stock) || stock < 0) throw new Error('stock must be 0 or more');
        if (!Number.isFinite(reorder) || reorder < 0) throw new Error('reorder_level must be 0 or more');
        await db.insert(consumables).values({
          name:          b.name.toString().trim(),
          category:      b.category?.toString().trim() || null,
          unit:          b.unit?.toString().trim() || 'unit',
          stock:         Math.floor(stock),
          reorder_level: Math.floor(reorder),
          location:      b.location?.toString().trim() || null,
        });
        imported++;
      } catch (e) {
        errors.push({ row: rowNum, error: e.message || 'Invalid row.' });
      }
    }
    res.json({ imported, failed: errors.length, errors: errors.slice(0, 50) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireStaff, async (req, res, next) => {
  try {
    // Bug fix #3: 404 guard
    const [existing] = await db.select({ id: consumables.id }).from(consumables).where(eq(consumables.id, Number(req.params.id)));
    if (!existing) return res.status(404).json({ error: 'Consumable not found.' });
    await db.delete(consumables).where(eq(consumables.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
