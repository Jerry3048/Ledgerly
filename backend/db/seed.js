/* =========================================================
   LabLedger — demo seed data (PostgreSQL / Drizzle)
   Run once after db:push: node db/seed.js
   ========================================================= */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt  = require('bcryptjs');
const db      = require('./index');
const { users, categories, equipment, consumables, borrows, maintenance } = require('./schema');
const { count } = require('drizzle-orm');

const hash  = (pw) => bcrypt.hashSync(pw, 10);
const today = () => new Date().toISOString().slice(0, 10);

async function seed() {
  // Only seed if the users table is empty
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (Number(n) > 0) {
    console.log('Database already seeded — skipping.');
    process.exit(0);
  }

  console.log('Seeding database...');

  /* ---------- users ---------- */
  await db.insert(users).values({ name: 'System Administrator',     username: 'admin',    password_hash: hash('admin123'),    role: 'admin'    });
  await db.insert(users).values({ name: 'Lab Officer — Bisi Fashola', username: 'officer', password_hash: hash('officer123'),  role: 'officer'  });
  const [lect] = await db.insert(users).values({ name: 'Dr. Adeyemi Okon', username: 'lecturer', password_hash: hash('lecturer123'), role: 'lecturer' }).returning();
  const [stud] = await db.insert(users).values({ name: 'Chidinma Eze',     username: 'student',  password_hash: hash('student123'),  role: 'student'  }).returning();

  /* ---------- categories ---------- */
  // Real lab categories matching lab-inventory-import.csv
  const catNames = ['Computer Systems', 'Power & Electrical', 'Embedded & Trainer Kits', 'Cables, Storage & Accessories', 'Input / Output & Peripherals', 'Test, Tools & Components', 'Furniture, Safety & Office'];
  const catRows  = await db.insert(categories).values(catNames.map(name => ({ name }))).returning();
  const catIds   = Object.fromEntries(catRows.map(c => [c.name, c.id]));

  /* ---------- equipment helper ---------- */
  const addEquip = async (name, cat, code, ser, model, supplier, pdate, loc, cond, notes, total, borrowed = 0, damaged = 0, maint = 0) => {
    const [row] = await db.insert(equipment).values({
      name, category_id: catIds[cat], code, serial: ser, model, supplier,
      purchase_date: pdate, location: loc, condition_note: cond, notes,
      qty_total: total, qty_borrowed: borrowed, qty_damaged: damaged, qty_maintenance: maint,
    }).returning();
    return row.id;
  };

  /* ---------- equipment: physical count, Sept 2026 ---------- */
  // 62 rows / 527 units. Active rows are fully available (none borrowed);
  // Faulty rows are quarantined as qty_damaged = qty_total (0 available).
  // Source: lab-inventory-import.csv (same order, same EQ-0001..EQ-0062 codes).
  await addEquip('Type C Charger',               'Power & Electrical',              'EQ-0001', null, null, null, null, 'Microprocessor Lab', 'Active', 'Physical verification: none borrowed; all present at count.', 5);
  await addEquip('Arduino Kit',                  'Embedded & Trainer Kits',         'EQ-0002', null, null, null, null, 'Microprocessor Lab', 'Active', '', 6);
  await addEquip('Breadboard',                   'Test, Tools & Components',        'EQ-0003', null, null, null, null, 'Microprocessor Lab', 'Active', '', 9);
  await addEquip('Multimeter',                   'Test, Tools & Components',        'EQ-0004', null, null, null, null, 'Microprocessor Lab', 'Active', '', 10);
  await addEquip('GA to HDMI Conerter',          'Cables, Storage & Accessories',   'EQ-0005', null, null, null, null, 'Microprocessor Lab', 'Active', '', 9);
  await addEquip('RFID Card',                    'Cables, Storage & Accessories',   'EQ-0006', null, null, null, null, 'Microprocessor Lab', 'Active', '', 10);
  await addEquip('Raspberry PI4 and 4 Casting',  'Embedded & Trainer Kits',         'EQ-0007', null, null, null, null, 'Microprocessor Lab', 'Active', '', 5);
  await addEquip('Card Reader',                  'Cables, Storage & Accessories',   'EQ-0008', null, null, null, null, 'Microprocessor Lab', 'Active', '', 5);
  await addEquip('Memory Cards',                 'Cables, Storage & Accessories',   'EQ-0009', null, null, null, null, 'Microprocessor Lab', 'Active', '', 5);
  await addEquip('HDMI Cables',                  'Cables, Storage & Accessories',   'EQ-0010', null, null, null, null, 'Microprocessor Lab', 'Active', '', 5);
  await addEquip('Resistor Kit Box',             'Test, Tools & Components',        'EQ-0011', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Sound Kit Box',                'Test, Tools & Components',        'EQ-0012', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Power Kit Box',                'Test, Tools & Components',        'EQ-0013', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Chips Kit Box',                'Embedded & Trainer Kits',         'EQ-0014', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Speaker Stand',                'Input / Output & Peripherals',    'EQ-0015', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Hardware tools Box',           'Test, Tools & Components',        'EQ-0016', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Boards Kit Box',               'Embedded & Trainer Kits',         'EQ-0017', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Damaged Printers',             'Input / Output & Peripherals',    'EQ-0018', null, null, null, null, 'Work Station',       'Faulty', 'Physical count: faulty - requires assessment.', 7, 0, 7);
  await addEquip('Suite Stand-Hanger',           'Furniture, Safety & Office',      'EQ-0019', null, null, null, null, 'Olaitan Office',     'Active', '', 1);
  await addEquip('All in One PC',                'Computer Systems',                'EQ-0020', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 30, 0, 30);
  await addEquip('UPS',                          'Power & Electrical',              'EQ-0021', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 6, 0, 6);
  await addEquip('CPU',                          'Computer Systems',                'EQ-0022', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 41, 0, 41);
  await addEquip('Keyboards',                    'Input / Output & Peripherals',    'EQ-0023', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 5, 0, 5);
  await addEquip('Stabilizer',                   'Power & Electrical',              'EQ-0024', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 3, 0, 3);
  await addEquip('ALTERA DE2 Board',             'Embedded & Trainer Kits',         'EQ-0025', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 10, 0, 10);
  await addEquip('HDMI Cables',                  'Cables, Storage & Accessories',   'EQ-0026', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 16, 0, 16);
  await addEquip('Mouse',                        'Input / Output & Peripherals',    'EQ-0027', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 9, 0, 9);
  await addEquip('Adapter',                      'Power & Electrical',              'EQ-0028', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 17, 0, 17);
  await addEquip('All in One PC',                'Computer Systems',                'EQ-0029', null, null, null, null, 'Microprocessor Lab', 'Active', '', 16);
  await addEquip('Desktop PC',                   'Computer Systems',                'EQ-0030', null, null, null, null, 'Microprocessor Lab', 'Active', '', 22);
  await addEquip('UPS',                          'Power & Electrical',              'EQ-0031', null, null, null, null, 'Microprocessor Lab', 'Active', '', 12);
  await addEquip('Stabilizer',                   'Power & Electrical',              'EQ-0032', null, null, null, null, 'Microprocessor Lab', 'Active', '', 16);
  await addEquip('Extension Box',                'Power & Electrical',              'EQ-0033', null, null, null, null, 'Microprocessor Lab', 'Active', '', 14);
  await addEquip('ALTERA DE2 Board',             'Embedded & Trainer Kits',         'EQ-0034', null, null, null, null, 'Microprocessor Lab', 'Active', '', 30);
  await addEquip('Microprocessor Trainer Kit',   'Embedded & Trainer Kits',         'EQ-0035', null, null, null, null, 'Microprocessor Lab', 'Active', '', 1);
  await addEquip('Logic Tutor',                  'Embedded & Trainer Kits',         'EQ-0036', null, null, null, null, 'Microprocessor Lab', 'Active', '', 3);
  await addEquip('Raspberry PI',                 'Embedded & Trainer Kits',         'EQ-0037', null, null, null, null, 'Microprocessor Lab', 'Active', '', 4);
  await addEquip('PI Casting',                   'Embedded & Trainer Kits',         'EQ-0038', null, null, null, null, 'Microprocessor Lab', 'Active', '', 5);
  await addEquip('All in One PC',                'Computer Systems',                'EQ-0039', null, null, null, null, 'Digital Lab',        'Active', '', 11);
  await addEquip('UPS',                          'Power & Electrical',              'EQ-0040', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 8, 0, 8);
  await addEquip('Stabilizer',                   'Power & Electrical',              'EQ-0041', null, null, null, null, 'Digital Lab',        'Active', '', 8);
  await addEquip('Extension Box',                'Power & Electrical',              'EQ-0042', null, null, null, null, 'Digital Lab',        'Active', '', 5);
  await addEquip('ALTERA DE2 Board',             'Embedded & Trainer Kits',         'EQ-0043', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 10, 0, 10);
  await addEquip('First Aid Kit',                'Furniture, Safety & Office',      'EQ-0044', null, null, null, null, 'Digital Lab',        'Active', '', 2);
  await addEquip('Mouse',                        'Input / Output & Peripherals',    'EQ-0045', null, null, null, null, 'Digital Lab',        'Active', '', 9);
  await addEquip('Printer Cables',               'Cables, Storage & Accessories',   'EQ-0046', null, null, null, null, 'Digital Lab',        'Active', '', 3);
  await addEquip('Keyboards',                    'Input / Output & Peripherals',    'EQ-0047', null, null, null, null, 'Digital Lab',        'Active', '', 11);
  await addEquip('Tables',                       'Furniture, Safety & Office',      'EQ-0048', null, null, null, null, 'Digital Lab',        'Active', '', 10);
  await addEquip('Chairs',                       'Furniture, Safety & Office',      'EQ-0049', null, null, null, null, 'Digital Lab',        'Active', '', 12);
  await addEquip('Wooden Stools',                'Furniture, Safety & Office',      'EQ-0050', null, null, null, null, 'Digital Lab',        'Active', '', 7);
  await addEquip('Fire Extinguisher',            'Furniture, Safety & Office',      'EQ-0051', null, null, null, null, 'Digital Lab',        'Active', '', 2);
  await addEquip('Standing AC',                  'Furniture, Safety & Office',      'EQ-0052', null, null, null, null, 'Digital Lab',        'Active', '', 1);
  await addEquip('White Board',                  'Input / Output & Peripherals',    'EQ-0053', null, null, null, null, 'Digital Lab',        'Active', '', 1);
  await addEquip('Network Cable',                'Cables, Storage & Accessories',   'EQ-0054', null, null, null, null, 'Microprocessor Lab', 'Faulty', 'Physical count: faulty - requires assessment.', 7, 0, 7);
  await addEquip('All in One PC',                'Computer Systems',                'EQ-0055', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 10, 0, 10);
  await addEquip('UPS',                          'Power & Electrical',              'EQ-0056', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 8, 0, 8);
  await addEquip('CPU',                          'Computer Systems',                'EQ-0057', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 24, 0, 24);
  await addEquip('Keyboards',                    'Input / Output & Peripherals',    'EQ-0058', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 12, 0, 12);
  await addEquip('Speaker',                      'Input / Output & Peripherals',    'EQ-0059', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 3, 0, 3);
  await addEquip('Projector',                    'Input / Output & Peripherals',    'EQ-0060', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 4, 0, 4);
  await addEquip('Monitors',                     'Computer Systems',                'EQ-0061', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 12, 0, 12);
  await addEquip('Chairs',                       'Furniture, Safety & Office',      'EQ-0062', null, null, null, null, 'Digital Lab',        'Faulty', 'Physical count: faulty - requires assessment.', 3, 0, 3);

  /* ---------- consumables ---------- */
  await db.insert(consumables).values([
    { name: 'Nitrile Gloves (box)',           category: 'PPE',     unit: 'box',   stock: 42, reorder_level: 15, location: 'Store Room'         },
    { name: 'Microscope Slides (pack of 50)', category: 'Glassware',unit: 'pack', stock:  6, reorder_level: 10, location: 'Lab A — Cabinet 4'   },
    { name: 'Ethanol 95% (litre)',            category: 'Reagent', unit: 'litre', stock: 18, reorder_level:  8, location: 'Chemical Store'      },
    { name: 'Litmus Paper (roll)',            category: 'Reagent', unit: 'roll',  stock:  3, reorder_level:  5, location: 'Store Room'          },
    { name: 'Test Tubes (dozen)',             category: 'Glassware',unit: 'dozen',stock: 25, reorder_level: 10, location: 'Lab A — Cabinet 3'   },
    { name: 'Distilled Water (litre)',        category: 'Reagent', unit: 'litre', stock: 30, reorder_level: 12, location: 'Chemical Store'      },
  ]);

  /* ---------- borrows: none — physical count confirms nothing is borrowed ---------- */

  /* ---------- maintenance: none seeded — Faulty stock is quarantined via qty_damaged ---------- */

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
