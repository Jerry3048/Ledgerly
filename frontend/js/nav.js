/* =========================================================
   LabLedger — navigation & view switching
   ========================================================= */

/** Wire nav buttons to switchView. Call once at startup. */
function initNav() {
  $$('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

/**
 * Activate a named view and its nav item, then invoke the
 * matching render function.
 * @param {string} view - One of: dashboard | equipment | consumables | borrow | maintenance | reports | users
 */
function switchView(view) {
  $$('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  const renderers = {
    dashboard:   renderDashboard,
    equipment:   renderEquipment,
    consumables: renderConsumables,
    borrow:      renderBorrow,
    maintenance: renderMaintenance,
    reports:     renderReports,
    users:       renderUsers,
  };
  (renderers[view] || (() => {}))();
}

/** Render every view — called once after initial data load. */
function renderAll() {
  renderDashboard();
  renderEquipment();
  renderConsumables();
  renderBorrow();
  if (isStaff()) renderMaintenance();
  if (isStaff()) renderReports();
  if (isAdmin()) renderUsers();
  refreshNavBadges();
}

/** Update sidebar notification badges. */
function refreshNavBadges() {
  const low = CONSUMABLES.filter(c => c.stock <= c.reorder_level).length;
  const overdue = isStaff()
    ? BORROWS.filter(isOverdue).length
    : BORROWS.filter(b => b.borrower_user_id === ME.id && isOverdue(b)).length;

  const bLow = $('#badgeLowStock'), bOver = $('#badgeOverdue');
  bLow.style.display = low ? '' : 'none';
  bLow.textContent = low;
  bOver.style.display = overdue ? '' : 'none';
  bOver.textContent = overdue;
}
