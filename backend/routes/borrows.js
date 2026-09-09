/* =========================================================
   LabLedger — /api/borrows routes
   Students/lecturers see their own requests only.
   Staff approve, issue, reject, and record returns.
   ========================================================= */
const router = require('express').Router();
const db     = require('../db');
const { borrows, equipment } = require('../db/schema');
const { eq, desc, and, sql } = require('drizzle-orm');
const { requireAuth, requireStaff, STAFF_ROLES } = require('../middleware/auth');

const today = () => new Date().toISOString().slice(0, 10);

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = STAFF_ROLES.includes(req.user.role)
      ? await db.select().from(borrows).orderBy(desc(borrows.date_requested), desc(borrows.id))
      : await db.select().from(borrows).where(eq(borrows.borrower_user_id, req.user.id)).orderBy(desc(borrows.date_requested), desc(borrows.id));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const b   = req.body || {};
    const qty = Number(b.qty) || 1;
    const [equip] = await db.select().from(equipment).where(eq(equipment.id, Number(b.equipment_id)));
    if (!equip) return res.status(404).json({ error: 'Equipment not found.' });

    const available = equip.qty_total - equip.qty_borrowed - equip.qty_damaged - equip.qty_maintenance;
    if (qty < 1)       return res.status(400).json({ error: 'Quantity must be at least 1.' });
    if (qty > available) return res.status(400).json({ error: `Only ${available} unit(s) of "${equip.name}" are currently available.` });

    const isStaff     = STAFF_ROLES.includes(req.user.role);
    const borrowerName = isStaff ? (b.borrower_name?.trim() || req.user.name) : req.user.name;
    const borrowerRole = isStaff ? (b.borrower_role || 'Student') : (req.user.role === 'lecturer' ? 'Lecturer' : 'Student');
    const borrowerUserId = isStaff && b.borrower_user_id ? b.borrower_user_id : req.user.id;

    const [inserted] = await db.insert(borrows).values({
      equipment_id:     equip.id,
      qty,
      borrower_user_id: borrowerUserId,
      borrower_name:    borrowerName,
      borrower_role:    borrowerRole,
      date_requested:   today(),
      date_issued:      null,
      expected_return:  b.expected_return || null,
      actual_return:    null,
      status:           'pending',
      condition_on_return: null,
      notes:            (b.notes || '').trim(),
    }).returning();
    res.json(inserted);
  } catch (err) { next(err); }
});

/* ---------- staff-only transitions ---------- */

router.post('/:id/issue', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const [bw] = await db.select().from(borrows).where(eq(borrows.id, Number(req.params.id)));
    if (!bw) return res.status(404).json({ error: 'Request not found.' });
    if (bw.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be issued.' });

    const [equip] = await db.select().from(equipment).where(eq(equipment.id, bw.equipment_id));
    const available = equip.qty_total - equip.qty_borrowed - equip.qty_damaged - equip.qty_maintenance;
    if (bw.qty > available) return res.status(400).json({ error: `Only ${available} unit(s) available now — cannot issue ${bw.qty}.` });

    await db.update(equipment).set({ qty_borrowed: sql`qty_borrowed + ${bw.qty}` }).where(eq(equipment.id, equip.id));
    await db.update(borrows).set({
      status:          'borrowed',
      date_issued:     today(),
      expected_return: bw.expected_return ?? req.body?.expected_return ?? null,
    }).where(eq(borrows.id, bw.id));

    const [updated] = await db.select().from(borrows).where(eq(borrows.id, bw.id));
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/reject', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const [bw] = await db.select().from(borrows).where(eq(borrows.id, Number(req.params.id)));
    if (!bw || bw.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be rejected.' });
    await db.update(borrows).set({ status: 'rejected', notes: req.body?.notes || bw.notes }).where(eq(borrows.id, bw.id));
    const [updated] = await db.select().from(borrows).where(eq(borrows.id, bw.id));
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/return', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const [bw] = await db.select().from(borrows).where(eq(borrows.id, Number(req.params.id)));
    if (!bw) return res.status(404).json({ error: 'Request not found.' });
    if (bw.status !== 'borrowed') return res.status(400).json({ error: 'Only issued/borrowed items can be returned.' });

    const condition = req.body?.condition_on_return || 'Good — as issued';

    // Only the returned units move — the rest of that equipment type is untouched.
    if (condition === 'Good — as issued') {
      await db.update(equipment).set({ qty_borrowed: sql`qty_borrowed - ${bw.qty}` }).where(eq(equipment.id, bw.equipment_id));
    } else {
      await db.update(equipment).set({
        qty_borrowed: sql`qty_borrowed - ${bw.qty}`,
        qty_damaged:  sql`qty_damaged  + ${bw.qty}`,
      }).where(eq(equipment.id, bw.equipment_id));
    }

    await db.update(borrows).set({
      status:              'returned',
      actual_return:       req.body?.actual_return || today(),
      condition_on_return: condition,
      notes:               req.body?.notes || bw.notes,
    }).where(eq(borrows.id, bw.id));

    const [updated] = await db.select().from(borrows).where(eq(borrows.id, bw.id));
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const [bw] = await db.select().from(borrows).where(eq(borrows.id, Number(req.params.id)));
    if (!bw) return res.status(404).json({ error: 'Request not found.' });
    const isOwner = bw.borrower_user_id === req.user.id;
    if (!STAFF_ROLES.includes(req.user.role) && !isOwner) return res.status(403).json({ error: 'Not your request.' });
    if (bw.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be cancelled/withdrawn.' });
    await db.delete(borrows).where(eq(borrows.id, bw.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
