/* =========================================================
   LabLedger — Reports view (staff only)
   ========================================================= */

function renderReports() {
  if (!isStaff()) return;

  const totalUnits     = EQUIPMENT.reduce((s, e) => s + e.qty_total,      0);
  const availableUnits = EQUIPMENT.reduce((s, e) => s + e.qty_available,   0);
  const borrowedUnits  = EQUIPMENT.reduce((s, e) => s + e.qty_borrowed,    0);
  const damagedUnits   = EQUIPMENT.reduce((s, e) => s + e.qty_damaged,     0);
  const maintUnits     = EQUIPMENT.reduce((s, e) => s + e.qty_maintenance, 0);

  const byCategory = CATEGORIES.map(c => ({
    name:  c.name,
    count: EQUIPMENT.filter(e => e.category_id === c.id).length,
    units: EQUIPMENT.filter(e => e.category_id === c.id).reduce((s, e) => s + e.qty_total, 0),
  }));

  const borrowedNow    = BORROWS.filter(b => b.status === 'borrowed');
  const damagedItems   = EQUIPMENT.filter(e => e.qty_damaged > 0);
  const lowStock       = CONSUMABLES.filter(c => c.stock <= c.reorder_level);
  const dueMaintenance = MAINTENANCE.filter(m => m.status !== 'completed');

  $('#reportsWrap').innerHTML = `
    <div class="report-block">
      <h4>Equipment units by state</h4>
      <div class="ledger-wrap"><table class="ledger"><thead><tr><th>State</th><th>Units</th></tr></thead><tbody>
        <tr><td><span class="stamp available">Available</span></td><td class="mono">${availableUnits}</td></tr>
        <tr><td><span class="stamp borrowed">Borrowed</span></td><td class="mono">${borrowedUnits}</td></tr>
        <tr><td><span class="stamp damaged">Damaged</span></td><td class="mono">${damagedUnits}</td></tr>
        <tr><td><span class="stamp maintenance">Maintenance</span></td><td class="mono">${maintUnits}</td></tr>
        <tr><td><strong>Total</strong></td><td class="mono"><strong>${totalUnits}</strong></td></tr>
      </tbody></table></div>
    </div>

    <div class="report-block">
      <h4>Equipment by category</h4>
      <div class="ledger-wrap"><table class="ledger"><thead><tr><th>Category</th><th>Item types</th><th>Total units</th></tr></thead><tbody>
        ${byCategory.map(c => `<tr><td>${esc(c.name)}</td><td class="mono">${c.count}</td><td class="mono">${c.units}</td></tr>`).join('') || '<tr><td colspan="3">No categories yet.</td></tr>'}
      </tbody></table></div>
    </div>

    <div class="report-block">
      <h4>Currently borrowed (${borrowedNow.length})</h4>
      <div class="ledger-wrap"><table class="ledger"><thead><tr><th>Equipment</th><th>Qty</th><th>Borrower</th><th>Issued</th><th>Expected return</th><th>Status</th></tr></thead><tbody>
        ${borrowedNow.map(b => `<tr><td>${esc(eqById(b.equipment_id)?.name || '—')}</td><td class="mono">${b.qty}</td><td>${esc(b.borrower_name)}</td><td>${fmtDate(b.date_issued)}</td><td>${fmtDate(b.expected_return)}</td><td><span class="stamp ${borrowDisplayStatus(b)}">${titleCase(borrowDisplayStatus(b))}</span></td></tr>`).join('') || '<tr><td colspan="6">Nothing currently borrowed.</td></tr>'}
      </tbody></table></div>
    </div>

    <div class="report-block">
      <h4>Equipment with damaged units (${damagedItems.length})</h4>
      <div class="ledger-wrap"><table class="ledger"><thead><tr><th>Equipment</th><th>Code</th><th>Damaged units</th><th>Location</th></tr></thead><tbody>
        ${damagedItems.map(e => `<tr><td>${esc(e.name)}</td><td class="mono">${esc(e.code || '')}</td><td class="mono">${e.qty_damaged}</td><td>${esc(e.location || '')}</td></tr>`).join('') || '<tr><td colspan="4">No damaged units on record.</td></tr>'}
      </tbody></table></div>
    </div>

    <div class="report-block">
      <h4>Low-stock consumables (${lowStock.length})</h4>
      <div class="ledger-wrap"><table class="ledger"><thead><tr><th>Consumable</th><th>Stock</th><th>Reorder level</th><th>Location</th></tr></thead><tbody>
        ${lowStock.map(c => `<tr><td>${esc(c.name)}</td><td class="mono">${c.stock} ${esc(c.unit)}</td><td class="mono">${c.reorder_level}</td><td>${esc(c.location || '')}</td></tr>`).join('') || '<tr><td colspan="4">All consumables are above reorder level.</td></tr>'}
      </tbody></table></div>
    </div>

    <div class="report-block">
      <h4>Equipment due for / under maintenance (${dueMaintenance.length})</h4>
      <div class="ledger-wrap"><table class="ledger"><thead><tr><th>Equipment</th><th>Qty</th><th>Issue</th><th>Status</th><th>Scheduled</th></tr></thead><tbody>
        ${dueMaintenance.map(m => `<tr><td>${esc(eqById(m.equipment_id)?.name || '—')}</td><td class="mono">${m.qty}</td><td>${esc(m.issue || '')}</td><td><span class="stamp ${m.status}">${titleCase(m.status)}</span></td><td>${fmtDate(m.scheduled_date)}</td></tr>`).join('') || '<tr><td colspan="5">No open maintenance items.</td></tr>'}
      </tbody></table></div>
    </div>
  `;
}
