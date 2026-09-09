/* =========================================================
   LabLedger — Equipment view
   Unit-aware: shows available / borrowed / damaged /
   maintenance breakdown instead of one whole-item status.
   ========================================================= */

function initEquipmentView() {
  $('#addEquipmentBtn').addEventListener('click', () => openEquipmentForm());
  $('#equipSearch').addEventListener('input', renderEquipment);
  $('#equipCategoryFilter').addEventListener('change', renderEquipment);
  $('#equipStatusFilter').addEventListener('change', renderEquipment);
  $('#manageCategoriesBtn').addEventListener('click', openCategoryManager);
}

function refreshCategoryFilterOptions() {
  const sel = $('#equipCategoryFilter');
  const current = sel.value;
  sel.innerHTML =
    '<option value="">All categories</option>' +
    CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  sel.value = current;
}

function renderEquipment() {
  refreshCategoryFilterOptions();
  const q     = ($('#equipSearch').value || '').toLowerCase();
  const cat   = $('#equipCategoryFilter').value;
  const avail = $('#equipStatusFilter').value;

  const rows = EQUIPMENT.filter(e => {
    const matchQ     = !q || [e.name, e.code, e.serial, e.model].some(v => (v || '').toLowerCase().includes(q));
    const matchCat   = !cat || e.category_id === Number(cat);
    const matchAvail = !avail || (avail === 'available' ? e.qty_available > 0 : e.qty_available === 0);
    return matchQ && matchCat && matchAvail;
  });

  if (!rows.length) {
    $('#equipmentTableWrap').innerHTML = emptyState('No equipment found', 'Register equipment or adjust your filters.');
    return;
  }

  $('#equipmentTableWrap').innerHTML = `
    <table class="ledger">
      <thead><tr>
        <th>Equipment</th><th>Category</th><th>Total</th><th>Breakdown</th><th>Location</th><th></th>
      </tr></thead>
      <tbody>
        ${rows.map(e => `
          <tr>
            <td><span class="cell-name">${esc(e.name)}</span><span class="cell-sub">${esc(e.code || '')}${e.serial ? ' · S/N ' + esc(e.serial) : ''}</span></td>
            <td>${esc(catName(e.category_id))}</td>
            <td class="mono">${e.qty_total}</td>
            <td>
              <span class="stamp available">${e.qty_available} available</span>
              ${e.qty_borrowed   ? `<span class="qty-breakdown">${e.qty_borrowed} borrowed</span>`     : ''}
              ${e.qty_damaged    ? `<span class="qty-breakdown">${e.qty_damaged} damaged</span>`       : ''}
              ${e.qty_maintenance? `<span class="qty-breakdown">${e.qty_maintenance} in maintenance</span>` : ''}
            </td>
            <td>${esc(e.location || '—')}</td>
            <td><div class="row-actions">
              ${isStaff()     ? `<button class="icon-btn" data-edit-eq="${e.id}">Edit</button>` : ''}
              ${isAdmin()     ? `<button class="icon-btn danger" data-del-eq="${e.id}">Delete</button>` : ''}
              ${isRequester() && e.qty_available > 0 ? `<button class="icon-btn" data-borrow-eq="${e.id}">Request</button>` : ''}
            </div></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  $$('[data-edit-eq]').forEach(b => b.addEventListener('click', () => openEquipmentForm(b.dataset.editEq)));
  $$('[data-del-eq]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this equipment record? This cannot be undone.')) return;
    try {
      await api('/equipment/' + b.dataset.delEq, { method: 'DELETE' });
      EQUIPMENT = await api('/equipment');
      renderEquipment(); renderDashboard(); toast('Equipment record deleted.');
    } catch (err) { toast(err.message); }
  }));
  $$('[data-borrow-eq]').forEach(b => b.addEventListener('click', () => openBorrowForm(b.dataset.borrowEq)));
}

/* ---------------- equipment form ---------------- */

function openEquipmentForm(id) {
  const rec = id ? eqById(id) : null;
  const body = `
    <div class="form-grid">
      <div class="field full"><label>Equipment name</label><input id="f-name" value="${esc(rec?.name)}" required></div>
      <div class="field"><label>Category</label>
        <select id="f-cat">${CATEGORIES.map(c => `<option value="${c.id}" ${rec?.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Equipment code</label><input id="f-code" value="${esc(rec?.code ?? nextEquipCode())}"></div>
      <div class="field"><label>Serial number</label><input id="f-serial" value="${esc(rec?.serial)}"></div>
      <div class="field"><label>Model number</label><input id="f-model" value="${esc(rec?.model)}"></div>
      <div class="field"><label>Total quantity</label><input id="f-qty" type="number" min="0" value="${rec?.qty_total ?? 1}"></div>
      <div class="field"><label>Supplier</label><input id="f-supplier" value="${esc(rec?.supplier)}"></div>
      <div class="field"><label>Purchase date</label><input id="f-purchase" type="date" value="${rec?.purchase_date ?? ''}"></div>
      <div class="field"><label>Location</label><input id="f-location" value="${esc(rec?.location)}"></div>
      <div class="field"><label>General condition</label><input id="f-condition" value="${esc(rec?.condition_note ?? 'Good')}"></div>
      ${rec ? `<div class="field full"><p class="cell-sub">Currently: ${rec.qty_borrowed} borrowed, ${rec.qty_damaged} damaged, ${rec.qty_maintenance} in maintenance. These are only changed via Borrow &amp; Return and Maintenance actions, not here.</p></div>` : ''}
      <div class="field full"><label>Notes</label><textarea id="f-notes" rows="2">${esc(rec?.notes)}</textarea></div>
    </div>`;

  openModal(rec ? 'Edit equipment' : 'Register equipment', body, [
    { label: 'Cancel', variant: 'secondary', onClick: closeModal },
    {
      label: rec ? 'Save changes' : 'Register equipment',
      onClick: async () => {
        const name = $('#f-name').value.trim();
        if (!name) { setFormError('Equipment name is required.'); return; }
        const data = {
          name,
          category_id:    Number($('#f-cat').value) || null,
          code:           $('#f-code').value.trim(),
          serial:         $('#f-serial').value.trim(),
          model:          $('#f-model').value.trim(),
          qty_total:      Number($('#f-qty').value) || 0,
          supplier:       $('#f-supplier').value.trim(),
          purchase_date:  $('#f-purchase').value,
          location:       $('#f-location').value.trim(),
          condition_note: $('#f-condition').value.trim(),
          notes:          $('#f-notes').value.trim(),
        };
        try {
          if (rec) await api('/equipment/' + rec.id, { method: 'PUT', body: data });
          else     await api('/equipment',            { method: 'POST', body: data });
          EQUIPMENT = await api('/equipment');
          closeModal(); renderEquipment(); renderDashboard(); toast('Equipment saved.');
        } catch (err) { setFormError(err.message); }
      },
    },
  ]);
}

/** Generate the next auto-incremented equipment code. */
function nextEquipCode() {
  const n = EQUIPMENT.length + 1;
  return 'EQ-' + String(n).padStart(4, '0');
}

/* ---------------- category manager ---------------- */

function openCategoryManager() {
  const body = `
    <div id="catList"></div>
    <div class="field full" style="margin-top:14px;">
      <label>New category name</label>
      <div style="display:flex; gap:8px;">
        <input id="f-newcat" placeholder="e.g. Chemical Reagents">
        <button class="btn small" id="addCatBtn" type="button">Add</button>
      </div>
    </div>`;

  openModal('Manage equipment categories', body, [{ label: 'Done', onClick: closeModal }]);

  const renderList = () => {
    $('#catList').innerHTML =
      CATEGORIES.map(c => `
        <div class="alert-row"><span>${esc(c.name)}</span>
          <button class="icon-btn danger small" style="margin-left:auto;" data-delcat="${c.id}">Remove</button>
        </div>`).join('') || '<p class="alert-empty">No categories yet.</p>';

    $$('[data-delcat]').forEach(b => b.addEventListener('click', async () => {
      try {
        await api('/categories/' + b.dataset.delcat, { method: 'DELETE' });
        CATEGORIES = await api('/categories');
        renderList(); refreshCategoryFilterOptions();
      } catch (err) { toast(err.message); }
    }));
  };

  renderList();

  $('#addCatBtn').addEventListener('click', async () => {
    const name = $('#f-newcat').value.trim();
    if (!name) return;
    try {
      await api('/categories', { method: 'POST', body: { name } });
      CATEGORIES = await api('/categories');
      $('#f-newcat').value = '';
      renderList(); refreshCategoryFilterOptions();
      toast('Category added.');
    } catch (err) { toast(err.message); }
  });
}
