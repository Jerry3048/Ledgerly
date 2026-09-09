/* =========================================================
   LabLedger — Drizzle ORM schema (PostgreSQL)
   Column names use snake_case throughout so that query
   result objects have the same property names as the old
   SQLite rows — minimising changes in route / middleware code.
   ========================================================= */
const { pgTable, serial, text, integer } = require('drizzle-orm/pg-core');

/* -------------------- users -------------------- */
const users = pgTable('users', {
  id:            serial('id').primaryKey(),
  name:          text('name').notNull(),
  username:      text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  // role CHECK enforced at the application layer (routes/middleware)
  role:          text('role').notNull(),
  // stored as ISO text to match existing client expectations
  created_at:    text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

/* -------------------- categories -------------------- */
const categories = pgTable('categories', {
  id:   serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

/* -------------------- equipment -------------------- */
// qty_available = qty_total - qty_borrowed - qty_damaged - qty_maintenance
// (computed in application layer — not stored)
const equipment = pgTable('equipment', {
  id:             serial('id').primaryKey(),
  name:           text('name').notNull(),
  category_id:    integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  code:           text('code'),
  serial:         text('serial'),
  model:          text('model'),
  supplier:       text('supplier'),
  purchase_date:  text('purchase_date'),
  location:       text('location'),
  condition_note: text('condition_note'),
  notes:          text('notes'),
  qty_total:       integer('qty_total').notNull().default(0),
  qty_borrowed:    integer('qty_borrowed').notNull().default(0),
  qty_damaged:     integer('qty_damaged').notNull().default(0),
  qty_maintenance: integer('qty_maintenance').notNull().default(0),
});

/* -------------------- consumables -------------------- */
const consumables = pgTable('consumables', {
  id:            serial('id').primaryKey(),
  name:          text('name').notNull(),
  category:      text('category'),
  unit:          text('unit').notNull().default('unit'),
  stock:         integer('stock').notNull().default(0),
  reorder_level: integer('reorder_level').notNull().default(0),
  location:      text('location'),
});

/* -------------------- borrows -------------------- */
// status: 'pending' | 'borrowed' | 'returned' | 'rejected'  (enforced in app layer)
const borrows = pgTable('borrows', {
  id:                 serial('id').primaryKey(),
  equipment_id:       integer('equipment_id').notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  qty:                integer('qty').notNull().default(1),
  borrower_user_id:   integer('borrower_user_id').references(() => users.id, { onDelete: 'set null' }),
  borrower_name:      text('borrower_name').notNull(),
  borrower_role:      text('borrower_role').notNull(),
  date_requested:     text('date_requested').notNull(),
  date_issued:        text('date_issued'),
  expected_return:    text('expected_return'),
  actual_return:      text('actual_return'),
  status:             text('status').notNull().default('pending'),
  condition_on_return:text('condition_on_return'),
  notes:              text('notes'),
});

/* -------------------- maintenance -------------------- */
// status: 'reported' | 'scheduled' | 'completed'  (enforced in app layer)
const maintenance = pgTable('maintenance', {
  id:             serial('id').primaryKey(),
  equipment_id:   integer('equipment_id').notNull().references(() => equipment.id, { onDelete: 'cascade' }),
  qty:            integer('qty').notNull().default(1),
  issue:          text('issue'),
  date_reported:  text('date_reported'),
  status:         text('status').notNull().default('reported'),
  scheduled_date: text('scheduled_date'),
  completed_date: text('completed_date'),
  technician:     text('technician'),
  cost:           text('cost'),
  notes:          text('notes'),
});

module.exports = { users, categories, equipment, consumables, borrows, maintenance };
