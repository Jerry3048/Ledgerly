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

module.exports = router;
