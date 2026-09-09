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
  const catNames = ['Optical Instruments', 'Measuring Instruments', 'Glassware', 'Electrical / Electronic', 'Safety & PPE'];
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

  /* ---------- equipment ---------- */
  const idMicroscope = await addEquip('Binocular Microscope',          'Optical Instruments',       'EQ-0001', 'SN-MC-2201', 'Olympus CX23',    'ScienceMart Ltd',  '2023-09-12', 'Lab A — Bench 3',      'Good',         '',                                               8);
                       await addEquip('Digital Centrifuge',            'Electrical / Electronic',   'EQ-0002', 'SN-CF-1187', 'Hettich EBA 200', 'MedLab Supplies',  '2022-03-04', 'Lab B — Shelf 1',      'Fair',         '',                                               2);
  const idBalance    = await addEquip('Analytical Balance',            'Measuring Instruments',     'EQ-0003', 'SN-BL-3390', 'Ohaus PA224',     'ScienceMart Ltd',  '2023-01-20', 'Lab A — Bench 1',      'Good',         '',                                               3, 1);
                       await addEquip('Digital Multimeter',            'Electrical / Electronic',   'EQ-0004', 'SN-MM-4471', 'Fluke 115',       'CircuitWorks',     '2024-02-15', 'Lab C — Cabinet 2',    'Good',         '',                                              12);
  const idIncubator  = await addEquip('Laboratory Incubator',          'Electrical / Electronic',   'EQ-0005', 'SN-IN-2050', 'Memmert IN30',    'MedLab Supplies',  '2021-11-02', 'Lab B — Corner Unit',  'Needs service','Thermostat drifting by ~2°C.',                   1, 0, 0, 1);
                       await addEquip('Bunsen Burner',                 'Glassware',                 'EQ-0006', 'SN-BB-0091', 'Standard',        'ScienceMart Ltd',  '2023-06-18', 'Lab A — Bench 2',      'Good',         '',                                              20);
  const idCylinder   = await addEquip('Measuring Cylinder Set (500ml)','Glassware',                 'EQ-0007', 'SN-MCY-0450','Borosilicate',    'GlassPro',         '2023-08-01', 'Lab A — Cabinet 4',    'Fair',         'One unit cracked during practical, returned damaged.',15, 0, 1);
                       await addEquip('pH Meter',                      'Measuring Instruments',     'EQ-0008', 'SN-PH-7720', 'Hanna HI98107',  'CircuitWorks',     '2024-05-10', 'Lab B — Bench 2',      'Good',         '',                                               4);
                       await addEquip('Safety Goggles (box of 10)',    'Safety & PPE',              'EQ-0009', 'SN-SG-0031', 'ClearView',       'SafeGuard Nigeria','2024-01-09', 'Lab A — Entrance Rack','Good',         '',                                               6);
                       await addEquip('Oscilloscope',                  'Electrical / Electronic',   'EQ-0010', 'SN-OS-8842', 'Rigol DS1054Z',   'CircuitWorks',     '2023-11-27', 'Lab C — Bench 1',      'Good',         '',                                               5);

  /* ---------- consumables ---------- */
  await db.insert(consumables).values([
    { name: 'Nitrile Gloves (box)',           category: 'PPE',     unit: 'box',   stock: 42, reorder_level: 15, location: 'Store Room'         },
    { name: 'Microscope Slides (pack of 50)', category: 'Glassware',unit: 'pack', stock:  6, reorder_level: 10, location: 'Lab A — Cabinet 4'   },
    { name: 'Ethanol 95% (litre)',            category: 'Reagent', unit: 'litre', stock: 18, reorder_level:  8, location: 'Chemical Store'      },
    { name: 'Litmus Paper (roll)',            category: 'Reagent', unit: 'roll',  stock:  3, reorder_level:  5, location: 'Store Room'          },
    { name: 'Test Tubes (dozen)',             category: 'Glassware',unit: 'dozen',stock: 25, reorder_level: 10, location: 'Lab A — Cabinet 3'   },
    { name: 'Distilled Water (litre)',        category: 'Reagent', unit: 'litre', stock: 30, reorder_level: 12, location: 'Chemical Store'      },
  ]);

  /* ---------- borrows ---------- */
  await db.insert(borrows).values([
    { equipment_id: idBalance,    qty: 1, borrower_user_id: lect.id, borrower_name: 'Dr. Adeyemi Okon', borrower_role: 'Lecturer', date_requested: '2026-07-06', date_issued: '2026-07-07', expected_return: '2026-07-14', actual_return: null,         status: 'borrowed', condition_on_return: null,      notes: 'CHM 302 practical.' },
    { equipment_id: idCylinder,   qty: 1, borrower_user_id: null,    borrower_name: 'Chidinma Eze',     borrower_role: 'Student',  date_requested: '2026-06-20', date_issued: '2026-06-21', expected_return: '2026-06-28', actual_return: '2026-06-30', status: 'returned', condition_on_return: 'Damaged', notes: 'One unit returned cracked.' },
    { equipment_id: idMicroscope, qty: 2, borrower_user_id: stud.id, borrower_name: 'Tunde Bakare',     borrower_role: 'Student',  date_requested: today(),      date_issued: null,          expected_return: null,          actual_return: null,         status: 'pending',  condition_on_return: null,      notes: 'Zoology practical, group 4.' },
  ]);

  /* ---------- maintenance ---------- */
  await db.insert(maintenance).values([
    { equipment_id: idIncubator, qty: 1, issue: 'Thermostat drifting, inconsistent temperature.',      date_reported: '2026-07-01', status: 'scheduled', scheduled_date: '2026-07-18', completed_date: null, technician: 'Kunle Technical Services', cost: null, notes: '' },
    { equipment_id: idCylinder,  qty: 1, issue: 'One cylinder cracked, needs replacement/disposal.',   date_reported: '2026-06-30', status: 'reported',  scheduled_date: null,         completed_date: null, technician: null,                       cost: null, notes: 'Awaiting replacement stock.' },
  ]);

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
