/* =========================================================
   LabLedger — /api/auth routes
   ========================================================= */
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { users } = require('../db/schema');
const { eq }  = require('drizzle-orm');
const { REQUESTER_ROLES, publicUser, validatePassword, requireAuth } = require('../middleware/auth');

// Public self-registration — restricted to student / lecturer accounts only.
router.post('/register', async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body || {};
    if (!name?.trim() || !username?.trim() || !password) {
      return res.status(400).json({ error: 'Name, username and password are required.' });
    }
    if (!REQUESTER_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Self-registration is only available for Student or Lecturer accounts. Staff accounts are created by an administrator.' });
    }
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.username, username.trim()));
    if (exists) return res.status(409).json({ error: 'That username is already taken.' });

    const [inserted] = await db
      .insert(users)
      .values({ name: name.trim(), username: username.trim(), password_hash: bcrypt.hashSync(password, 10), role })
      .returning();
    res.json({ user: publicUser(inserted) });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const [user] = await db.select().from(users).where(eq(users.username, (username || '').trim()));
    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }
    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', async (req, res, next) => {
  try {
    if (!req.session.userId) return res.json({ user: null });
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

// Logged-in user changes their own password — requires current password.
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });
    if (bcrypt.compareSync(newPassword, user.password_hash)) {
      return res.status(400).json({ error: 'New password must be different from the current password.' });
    }

    await db.update(users)
      .set({ password_hash: bcrypt.hashSync(newPassword, 10) })
      .where(eq(users.id, user.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
