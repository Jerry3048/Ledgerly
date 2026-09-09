/* =========================================================
   LabLedger — /api/users routes (admin only)
   ========================================================= */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { users } = require('../db/schema');
const { eq, asc, and, ne } = require('drizzle-orm');
const { requireAuth, requireAdmin, ALL_ROLES, publicUser, validatePassword } = require('../middleware/auth');

// Return all users without password_hash
const SELECT_PUBLIC = {
  id:         users.id,
  name:       users.name,
  username:   users.username,
  role:       users.role,
  created_at: users.created_at,
};

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await db.select(SELECT_PUBLIC).from(users).orderBy(asc(users.role), asc(users.name)));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body || {};
    if (!name?.trim() || !username?.trim() || !password) return res.status(400).json({ error: 'Name, username and password are required.' });
    if (!ALL_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.username, username.trim()));
    if (exists) return res.status(409).json({ error: 'That username is already in use.' });

    const [inserted] = await db.insert(users).values({
      name: name.trim(), username: username.trim(),
      password_hash: bcrypt.hashSync(password, 10), role,
    }).returning();
    res.json(publicUser(inserted));
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [rec] = await db.select().from(users).where(eq(users.id, Number(req.params.id)));
    if (!rec) return res.status(404).json({ error: 'User not found.' });

    const { name, username, password, role } = req.body || {};

    if (username?.trim() && username.trim() !== rec.username) {
      const [clash] = await db.select({ id: users.id }).from(users).where(and(eq(users.username, username.trim()), ne(users.id, rec.id)));
      if (clash) return res.status(409).json({ error: 'That username is already in use.' });
    }
    if (role && !ALL_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    if (password?.trim()) {
      const pwError = validatePassword(password.trim());
      if (pwError) return res.status(400).json({ error: pwError });
    }

    const hash = password?.trim() ? bcrypt.hashSync(password.trim(), 10) : rec.password_hash;
    await db.update(users).set({
      name:          name?.trim()     || rec.name,
      username:      username?.trim() || rec.username,
      password_hash: hash,
      role:          role             || rec.role,
    }).where(eq(users.id, rec.id));

    const [updated] = await db.select(SELECT_PUBLIC).from(users).where(eq(users.id, rec.id));
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: "You can't delete the account you're signed in with." });
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, Number(req.params.id)));
    if (!existing) return res.status(404).json({ error: 'User not found.' });
    await db.delete(users).where(eq(users.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
