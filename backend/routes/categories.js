/* =========================================================
   LabLedger — /api/categories routes
   ========================================================= */
const router = require('express').Router();
const db     = require('../db');
const { categories, equipment } = require('../db/schema');
const { eq, asc, count } = require('drizzle-orm');
const { requireAuth, requireStaff } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const [inserted] = await db.insert(categories).values({ name }).returning();
    res.json(inserted);
  } catch (err) {
    // Unique constraint violation
    if (err.code === '23505') return res.status(409).json({ error: 'That category already exists.' });
    next(err);
  }
});

router.delete('/:id', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const [{ n }] = await db.select({ n: count() }).from(equipment).where(eq(equipment.category_id, Number(req.params.id)));
    if (Number(n) > 0) return res.status(409).json({ error: 'Cannot remove — category is in use by equipment.' });
    await db.delete(categories).where(eq(categories.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
