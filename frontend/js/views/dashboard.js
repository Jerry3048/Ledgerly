/* =========================================================
   LabLedger — Dashboard view
   ========================================================= */

function renderDashboard() {
  const totalEquip    = EQUIPMENT.reduce((s, e) => s + Number(e.qty_total), 0);
  const availableUnits = EQUIPMENT.reduce((s, e) => s + Number(e.qty_available), 0);
  const borrowedUnits = EQUIPMENT.reduce((s, e) => s + Number(e.qty_borrowed), 0);
  const damagedUnits  = EQUIPMENT.reduce((s, e) => s + Number(e.qty_damaged), 0);
  const maintUnits    = EQUIPMENT.reduce((s, e) => s + Number(e.qty_maintenance), 0);
  const lowStock      = CONSUMABLES.filter(c => c.stock <= c.reorder_level).length;

  const myBorrows = isStaff() ? BORROWS : BORROWS.filter(b => b.borrower_user_id === ME.id);
  const overdue   = myBorrows.filter(isOverdue).length;
  const pending   = myBorrows.filter(b => b.status === 'pending').length;

  if (isStaff()) {
    $('#statGrid').innerHTML = `
      ${tagCard(totalEquip,     'Total equipment units',          '')}
      ${tagCard(availableUnits, 'Units available now',            'good')}
      ${tagCard(borrowedUnits,  'Units currently borrowed',       '')}
      ${tagCard(damagedUnits,   'Damaged units',                  damagedUnits ? 'bad' : '')}
      ${tagCard(maintUnits,     'Units under maintenance',        maintUnits   ? 'warn' : '')}
      ${tagCard(lowStock,       'Low-stock consumables',          lowStock     ? 'warn' : '')}
      ${tagCard(overdue,        'Overdue returns',                overdue      ? 'bad'  : '')}
    `;
  } else {
    $('#statGrid').innerHTML = `
      ${tagCard(pending,   'My pending requests',        pending ? 'warn' : '')}
      ${tagCard(myBorrows.filter(b => b.status === 'borrowed').length, 'Currently borrowed by me', 'good')}
      ${tagCard(overdue,   'My overdue returns',         overdue ? 'bad'  : '')}
      ${tagCard(availableUnits, 'Units available lab-wide', '')}
    `;
  }

  $('#dashOverdueTitle').textContent = isStaff() ? 'Overdue & upcoming returns' : 'My requests due & overdue';

  const overdueRows = myBorrows
    .filter(isOverdue)
    .map(b => alertRow('red', `<strong>${esc(eqById(b.equipment_id)?.name || '—')}</strong> — ${esc(b.borrower_name)}, due ${fmtDate(b.expected_return)}`));

  const upcoming = myBorrows
    .filter(b => b.status === 'borrowed' && !isOverdue(b))
    .sort((a, b) => (a.expected_return || '').localeCompare(b.expected_return || ''))
    .slice(0, 5)
    .map(b => alertRow('amber', `<strong>${esc(eqById(b.equipment_id)?.name || '—')}</strong> — ${esc(b.borrower_name)}, due ${fmtDate(b.expected_return)}`));

  $('#dashOverdue').innerHTML =
    (overdueRows.join('') + upcoming.join('')) ||
    `<p class="alert-empty">Nothing due or overdue.</p>`;

  const lowRows = CONSUMABLES
    .filter(c => c.stock <= c.reorder_level)
    .map(c => alertRow('amber', `<strong>${esc(c.name)}</strong> — ${c.stock} ${esc(c.unit)}(s) left, reorder at ${c.reorder_level}`));

  const maintRows = isStaff()
    ? MAINTENANCE
        .filter(m => m.status !== 'completed')
        .map(m => alertRow('red', `<strong>${esc(eqById(m.equipment_id)?.name || '—')}</strong> — ${m.qty} unit(s), ${esc(titleCase(m.status))}${m.scheduled_date ? ', scheduled ' + fmtDate(m.scheduled_date) : ''}`))
    : [];

  $('#dashAlerts').innerHTML =
    (lowRows.join('') + maintRows.join('')) ||
    `<p class="alert-empty">No stock or maintenance alerts.</p>`;
}

/* ---------------- template helpers ---------------- */

function tagCard(value, label, cls) {
  return `<div class="tag-card ${cls}"><span class="hole"></span><div><div class="tag-value">${value}</div><span class="tag-label">${label}</span></div></div>`;
}

function alertRow(color, html) {
  return `<div class="alert-row"><span class="alert-dot ${color}"></span><span>${html}</span></div>`;
}
