/* =========================================================
   LabLedger — Consumables view
   ========================================================= */

function initConsumableView() {
  $('#addConsumableBtn').addEventListener('click', () => openConsumableForm());
  $('#consumableSearch').addEventListener('input', renderConsumables);
  $('#consumableStockFilter').addEventListener('change', renderConsumables);
}

function renderConsumables() {
  const q       = ($('#consumableSearch').value || '').toLowerCase();
  const lowOnly = $('#consumableStockFilter').value === 'low';

  const rows = CONSUMABLES.filter(c => {
    const matchQ   = !q || [c.name, c.category, c.location].some(v => (v || '').toLowerCase().includes(q));
    const matchLow = !lowOnly || c.stock <= c.reorder_level;
    return matchQ && matchLow;
  });

  if (!rows.length) {
    $('#consumableTableWrap').innerHTML = emptyState('No consumables found', 'Add a consumable or adjust your filters.');
    return;
  }

  $('#consumableTableWrap').innerHTML = `
    <table class="ledger">
      <thead><tr><th>Consumable</th><th>Category</th><th>Stock</th><th>Reorder level</th><th>Location</th><th>Status</th>${isStaff() ? '<th></th>' : ''}</tr></thead>
      <tbody>
        ${rows.map(c => {
          const low = c.stock <= c.reorder_level;
          return `<tr>
            <td class="cell-name">${esc(c.name)}</td>
            <td>${esc(c.category || '—')}</td>
            <td class="mono">${c.stock} ${esc(c.unit)}</td>
            <td class="mono">${c.reorder_level}</td>
            <td>${esc(c.location || '—')}</td>
            <td><span class="stamp ${low ? 'damaged' : 'available'}">${low ? 'Low stock' : 'OK'}</span></td>
            ${isStaff() ? `<td><div class="row-actions">
              <button class="icon-btn" data-edit-cs="${c.id}">Edit</button>
              <button class="icon-btn danger" data-del-cs="${c.id}">Delete</button>
            </div></td>` : ''}
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  $$('[data-edit-cs]').forEach(b => b.addEventListener('click', () => openConsumableForm(b.dataset.editCs)));
  $$('[data-del-cs]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this consumable record?')) return;
    try {
      await api('/consumables/' + b.dataset.delCs, { method: 'DELETE' });
      CONSUMABLES = await api('/consumables');
      renderConsumables(); renderDashboard(); toast('Consumable deleted.');
    } catch (err) { toast(err.message); }
  }));
}

function openConsumableForm(id) {
  const rec = id ? CONSUMABLES.find(c => c.id === Number(id)) : null;
  const body = `
    <div class="form-grid">
      <div class="field full"><label>Consumable name</label><input id="f-name" value="${esc(rec?.name)}" required></div>
      <div class="field"><label>Category</label><input id="f-cat" value="${esc(rec?.category)}" placeholder="e.g. Reagent, PPE, Glassware"></div>
      <div class="field"><label>Unit</label><input id="f-unit" value="${esc(rec?.unit ?? 'unit')}"></div>
      <div class="field"><label>Current stock</label><input id="f-stock" type="number" min="0" value="${rec?.stock ?? 0}"></div>
      <div class="field"><label>Reorder level</label><input id="f-reorder" type="number" min="0" value="${rec?.reorder_level ?? 0}"></div>
      <div class="field full"><label>Location</label><input id="f-location" value="${esc(rec?.location)}"></div>
    </div>`;

  openModal(rec ? 'Edit consumable' : 'Add consumable', body, [
    { label: 'Cancel', variant: 'secondary', onClick: closeModal },
    {
      label: rec ? 'Save changes' : 'Add consumable',
      onClick: async () => {
        const name = $('#f-name').value.trim();
        if (!name) { setFormError('Consumable name is required.'); return; }
        const data = {
          name,
          category:      $('#f-cat').value.trim(),
          unit:          $('#f-unit').value.trim() || 'unit',
          stock:         Number($('#f-stock').value)  || 0,
          reorder_level: Number($('#f-reorder').value) || 0,
          location:      $('#f-location').value.trim(),
        };
        try {
          if (rec) await api('/consumables/' + rec.id, { method: 'PUT', body: data });
          else     await api('/consumables',             { method: 'POST', body: data });
          CONSUMABLES = await api('/consumables');
          closeModal(); renderConsumables(); renderDashboard(); toast('Consumable saved.');
        } catch (err) { setFormError(err.message); }
      },
    },
  ]);
}
