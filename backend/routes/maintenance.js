/* =========================================================
   LabLedger — /api/maintenance routes (staff only)
   Unit-scoped: takes N units out of service.
   ========================================================= */
const router = require('express').Router();
const db     = require('../db');
const { maintenance, equipment } = require('../db/schema');
const { eq, desc, sql } = require('drizzle-orm');
const { requireAuth, requireStaff } = require('../middleware/auth');

const today = () => new Date().toISOString().slice(0, 10);

router.get('/', requireAuth, requireStaff, async (req, res, next) => {
  try {
    res.json(await db.select().from(maintenance).orderBy(desc(maintenance.date_reported), desc(maintenance.id)));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const b   = req.body || {};
    const qty = Number(b.qty) || 1;
    const [equip] = await db.select().from(equipment).where(eq(equipment.id, Number(b.equipment_id)));
    if (!equip) return res.status(404).json({ error: 'Equipment not found.' });
    const available = equip.qty_total - equip.qty_borrowed - equip.qty_damaged - equip.qty_maintenance;
    if (qty > available) return res.status(400).json({ error: `Only ${available} unit(s) of "${equip.name}" are free to send for maintenance.` });

    const [inserted] = await db.insert(maintenance).values({
      equipment_id:    equip.id,
      qty,
      issue:           (b.issue || '').trim(),
      date_reported:   b.date_reported    || today(),
      status:          b.status           || 'reported',
      scheduled_date:  b.scheduled_date   || null,
      completed_date:  b.completed_date   || null,
      technician:      b.technician       || null,
      cost:            b.cost             || null,
      notes:           (b.notes || '').trim(),
    }).returning();

    await db.update(equipment).set({ qty_maintenance: sql`qty_maintenance + ${qty}` }).where(eq(equipment.id, equip.id));
    res.json(inserted);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const [rec] = await db.select().from(maintenance).where(eq(maintenance.id, Number(req.params.id)));
    if (!rec) return res.status(404).json({ error: 'Record not found.' });

    const b         = req.body || {};
    const newStatus = b.status || rec.status;

    // When maintenance completes, release those units back (or mark damaged if still broken).
    // qty is immutable after creation — only the original reserved amount is released.
    if (rec.status !== 'completed' && newStatus === 'completed') {
      if (b.still_damaged) {
        await db.update(equipment).set({
          qty_maintenance: sql`qty_maintenance - ${rec.qty}`,
          qty_damaged:     sql`qty_damaged     + ${rec.qty}`,
        }).where(eq(equipment.id, rec.equipment_id));
      } else {
        await db.update(equipment).set({
          qty_maintenance: sql`qty_maintenance - ${rec.qty}`,
        }).where(eq(equipment.id, rec.equipment_id));
      }
    }

    await db.update(maintenance).set({
      issue:          b.issue          ?? rec.issue,
      date_reported:  b.date_reported  ?? rec.date_reported,
      status:         newStatus,
      scheduled_date: b.scheduled_date ?? rec.scheduled_date,
      completed_date: b.completed_date ?? rec.completed_date,
      technician:     b.technician     ?? rec.technician,
      cost:           b.cost           ?? rec.cost,
      notes:          b.notes          ?? rec.notes,
    }).where(eq(maintenance.id, rec.id));

    const [updated] = await db.select().from(maintenance).where(eq(maintenance.id, rec.id));
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
