/* =========================================================
   LabLedger — Maintenance view (staff only)
   Unit-scoped: takes N units out of service, not the whole
   equipment type.
   ========================================================= */

function initMaintenanceView() {
  $('#addMaintenanceBtn').addEventListener('click', () => openMaintenanceForm());
  $('#maintenanceSearch').addEventListener('input', renderMaintenance);
  $('#maintenanceStatusFilter').addEventListener('change', renderMaintenance);
}

function renderMaintenance() {
  if (!isStaff()) return;
  const q      = ($('#maintenanceSearch').value || '').toLowerCase();
  const status = $('#maintenanceStatusFilter').value;

  const rows = MAINTENANCE.filter(m => {
    const eqName      = eqById(m.equipment_id)?.name || '';
    const matchQ      = !q || (eqName + ' ' + (m.technician || '')).toLowerCase().includes(q);
    const matchStatus = !status || m.status === status;
    return matchQ && matchStatus;
  }).sort((a, b) => (b.date_reported || '').localeCompare(a.date_reported || ''));

  if (!rows.length) {
    $('#maintenanceTableWrap').innerHTML = emptyState(
      'No maintenance records found',
      'Log a maintenance issue or adjust your filters.'
    );
    return;
  }

  $('#maintenanceTableWrap').innerHTML = `
    <table class="ledger">
      <thead><tr><th>Equipment</th><th>Qty</th><th>Issue</th><th>Reported</th><th>Scheduled</th><th>Completed</th><th>Technician</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows.map(m => `<tr>
          <td class="cell-name">${esc(eqById(m.equipment_id)?.name || 'Unknown')}</td>
          <td class="mono">${m.qty}</td>
          <td>${esc(m.issue || '')}</td>
          <td>${fmtDate(m.date_reported)}</td>
          <td>${fmtDate(m.scheduled_date)}</td>
          <td>${fmtDate(m.completed_date)}</td>
          <td>${esc(m.technician) || '—'}</td>
          <td><span class="stamp ${m.status}">${titleCase(m.status)}</span></td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit-mt="${m.id}">Update</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  $$('[data-edit-mt]').forEach(b => b.addEventListener('click', () => openMaintenanceForm(null, b.dataset.editMt)));
}

function openMaintenanceForm(newForEquipment, editId) {
  const rec = editId ? MAINTENANCE.find(m => m.id === Number(editId)) : null;
  const eq  = rec ? eqById(rec.equipment_id) : null;

  const body = `
    <div class="form-grid">
      <div class="field full"><label>Equipment</label>
        <select id="f-eq" ${rec ? 'disabled' : ''}>${EQUIPMENT.map(e =>
          `<option value="${e.id}" ${(rec?.equipment_id || newForEquipment) == e.id ? 'selected' : ''}>${esc(e.name)} (${esc(e.code || '')}) — ${e.qty_available} available</option>`
        ).join('')}</select>
      </div>
      ${!rec
        ? `<div class="field"><label>Units to send for maintenance</label><input id="f-qty" type="number" min="1" value="1"></div>`
        : `<div class="field full"><p class="cell-sub">${rec.qty} unit(s) of ${esc(eq?.name)} on this record.</p></div>`
      }
      <div class="field full"><label>Issue description</label><textarea id="f-issue" rows="2">${esc(rec?.issue)}</textarea></div>
      <div class="field"><label>Date reported</label><input id="f-reported" type="date" value="${rec?.date_reported ?? today()}"></div>
      <div class="field"><label>Status</label>
        <select id="f-status">${['reported', 'scheduled', 'completed'].map(s =>
          `<option value="${s}" ${rec?.status === s ? 'selected' : ''}>${titleCase(s)}</option>`
        ).join('')}</select>
      </div>
      <div class="field"><label>Scheduled date</label><input id="f-scheduled" type="date" value="${rec?.scheduled_date ?? ''}"></div>
      <div class="field"><label>Completed date</label><input id="f-completed" type="date" value="${rec?.completed_date ?? ''}"></div>
      <div class="field"><label>Technician / vendor</label><input id="f-tech" value="${esc(rec?.technician)}"></div>
      <div class="field"><label>Cost (₦)</label><input id="f-cost" type="number" min="0" value="${rec?.cost ?? ''}"></div>
      ${rec ? `<div class="field full"><label><input type="checkbox" id="f-stilldamaged" style="width:auto; display:inline-block; margin-right:6px;">Return these units as damaged (not fully fixed)</label></div>` : ''}
      <div class="field full"><label>Notes</label><textarea id="f-notes" rows="2">${esc(rec?.notes)}</textarea></div>
    </div>`;

  openModal(rec ? 'Update maintenance record' : 'Log maintenance issue', body, [
    { label: 'Cancel', variant: 'secondary', onClick: closeModal },
    {
      label: rec ? 'Save changes' : 'Log record',
      onClick: async () => {
        const data = {
          equipment_id:   Number($('#f-eq').value),
          issue:          $('#f-issue').value.trim(),
          date_reported:  $('#f-reported').value,
          status:         $('#f-status').value,
          scheduled_date: $('#f-scheduled').value,
          completed_date: $('#f-completed').value,
          technician:     $('#f-tech').value.trim(),
          cost:           $('#f-cost').value,
          notes:          $('#f-notes').value.trim(),
        };
        if (!rec) data.qty = Number($('#f-qty').value) || 1;
        else      data.still_damaged = $('#f-stilldamaged')?.checked || false;
        try {
          if (rec) await api('/maintenance/' + rec.id, { method: 'PUT', body: data });
          else     await api('/maintenance',             { method: 'POST', body: data });
          MAINTENANCE = await api('/maintenance');
          EQUIPMENT   = await api('/equipment');
          closeModal(); renderMaintenance(); renderEquipment(); renderDashboard();
          toast('Maintenance record saved.');
        } catch (err) { setFormError(err.message); }
      },
    },
  ]);
}
