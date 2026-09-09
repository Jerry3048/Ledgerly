/* =========================================================
   LabLedger — Borrow & Return view
   Requesters (students/lecturers) see and manage only their
   own requests. Staff see everything and can approve / issue /
   reject / record returns.
   ========================================================= */

function initBorrowView() {
  $('#addBorrowBtn').addEventListener('click', () => openBorrowForm());
  $('#borrowSearch').addEventListener('input', renderBorrow);
  $('#borrowStatusFilter').addEventListener('change', renderBorrow);
}

function renderBorrow() {
  const q      = ($('#borrowSearch').value || '').toLowerCase();
  const status = $('#borrowStatusFilter').value;

  const rows = BORROWS.filter(b => {
    const eqName    = eqById(b.equipment_id)?.name || '';
    const matchQ    = !q || (eqName + ' ' + b.borrower_name).toLowerCase().includes(q);
    const matchStatus = !status || borrowDisplayStatus(b) === status;
    return matchQ && matchStatus;
  }).sort((a, b) =>
    (b.date_requested || '').localeCompare(a.date_requested || '') || b.id - a.id
  );

  if (!rows.length) {
    $('#borrowTableWrap').innerHTML = emptyState(
      'No borrow records found',
      isStaff()
        ? 'Adjust your filters, or wait for new requests.'
        : 'Request equipment from the Equipment tab or the button above.'
    );
    return;
  }

  $('#borrowTableWrap').innerHTML = `
    <table class="ledger">
      <thead><tr>
        <th>Equipment</th><th>Qty</th>${isStaff() ? '<th>Borrower</th>' : ''}<th>Requested</th><th>Expected return</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>
        ${rows.map(b => {
          const ds = borrowDisplayStatus(b);
          return `<tr>
            <td class="cell-name">${esc(eqById(b.equipment_id)?.name || 'Unknown')}</td>
            <td class="mono">${b.qty}</td>
            ${isStaff() ? `<td>${esc(b.borrower_name)}<span class="cell-sub">${esc(b.borrower_role)}</span></td>` : ''}
            <td>${fmtDate(b.date_requested)}</td>
            <td>${fmtDate(b.expected_return)}</td>
            <td><span class="stamp ${ds}">${titleCase(ds)}</span></td>
            <td><div class="row-actions">
              ${isStaff() && b.status === 'pending'   ? `<button class="icon-btn" data-issue="${b.id}">Approve &amp; issue</button><button class="icon-btn danger" data-reject="${b.id}">Reject</button>` : ''}
              ${isStaff() && b.status === 'borrowed'  ? `<button class="icon-btn" data-return="${b.id}">Record return</button>` : ''}
              ${!isStaff() && b.status === 'pending'  ? `<button class="icon-btn danger" data-cancel="${b.id}">Withdraw</button>` : ''}
            </div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  $$('[data-issue]').forEach(b => b.addEventListener('click', () => openIssueForm(b.dataset.issue)));
  $$('[data-reject]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Reject this borrow request?')) return;
    try {
      await api(`/borrows/${b.dataset.reject}/reject`, { method: 'POST' });
      await refreshBorrowsAndEquipment();
      toast('Request rejected.');
    } catch (err) { toast(err.message); }
  }));
  $$('[data-return]').forEach(b => b.addEventListener('click', () => openReturnForm(b.dataset.return)));
  $$('[data-cancel]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Withdraw this pending request?')) return;
    try {
      await api('/borrows/' + b.dataset.cancel, { method: 'DELETE' });
      await refreshBorrowsAndEquipment();
      toast('Request withdrawn.');
    } catch (err) { toast(err.message); }
  }));
}

/** Re-fetch borrows and equipment, then re-render the affected views. */
async function refreshBorrowsAndEquipment() {
  BORROWS   = await api('/borrows');
  EQUIPMENT = await api('/equipment');
  renderBorrow(); renderEquipment(); renderDashboard(); refreshNavBadges();
}

/* ---------------- forms ---------------- */

function openBorrowForm(presetEquipmentId) {
  const eqOptions = EQUIPMENT.filter(e => e.qty_available > 0 || String(e.id) === String(presetEquipmentId));
  if (!eqOptions.length) { toast('No equipment currently has units available.'); return; }

  const staffFields = isStaff()
    ? `<div class="field"><label>Borrower name</label><input id="f-borrower" placeholder="Who is this for?"></div>
       <div class="field"><label>Borrower type</label>
         <select id="f-role"><option value="Student">Student</option><option value="Lecturer">Lecturer</option><option value="Staff">Staff</option></select>
       </div>`
    : `<div class="field full"><p class="cell-sub">Requesting as ${esc(ME.name)} (${ME.role === 'lecturer' ? 'Lecturer' : 'Student'}).</p></div>`;

  const body = `
    <div class="form-grid">
      <div class="field full"><label>Equipment</label>
        <select id="f-eq">${eqOptions.map(e => `<option value="${e.id}" ${String(e.id) === String(presetEquipmentId) ? 'selected' : ''}>${esc(e.name)} — ${e.qty_available} available</option>`).join('')}</select>
      </div>
      <div class="field"><label>Quantity needed</label><input id="f-qty" type="number" min="1" value="1"></div>
      <div class="field"><label>Expected return date</label><input id="f-expected" type="date" value="${today()}"></div>
      ${staffFields}
      <div class="field full"><label>Notes / purpose</label><textarea id="f-notes" rows="2" placeholder="e.g. CHM 302 practical, group 4"></textarea></div>
    </div>`;

  openModal('New borrow request', body, [
    { label: 'Cancel', variant: 'secondary', onClick: closeModal },
    {
      label: 'Submit request',
      onClick: async () => {
        const data = {
          equipment_id:    Number($('#f-eq').value),
          qty:             Number($('#f-qty').value) || 1,
          expected_return: $('#f-expected').value,
          notes:           $('#f-notes').value.trim(),
        };
        if (isStaff()) {
          const borrowerName = $('#f-borrower').value.trim();
          if (!borrowerName) { setFormError('Borrower name is required.'); return; }
          data.borrower_name = borrowerName;
          data.borrower_role = $('#f-role').value;
        }
        try {
          await api('/borrows', { method: 'POST', body: data });
          closeModal();
          await refreshBorrowsAndEquipment();
          toast(isStaff() ? 'Borrow logged.' : 'Request submitted for approval.');
        } catch (err) { setFormError(err.message); }
      },
    },
  ]);
}

function openIssueForm(id) {
  const rec = BORROWS.find(b => b.id === Number(id));
  const eq  = eqById(rec.equipment_id);
  const body = `
    <div class="form-grid">
      <div class="field full"><p class="cell-sub">Issuing ${rec.qty} unit(s) of <strong>${esc(eq.name)}</strong> to ${esc(rec.borrower_name)}. ${eq.qty_available} unit(s) currently available.</p></div>
      <div class="field full"><label>Expected return date</label><input id="f-expected" type="date" value="${rec.expected_return || today()}"></div>
    </div>`;

  openModal('Approve & issue', body, [
    { label: 'Cancel', variant: 'secondary', onClick: closeModal },
    {
      label: 'Approve & issue',
      onClick: async () => {
        try {
          await api(`/borrows/${id}/issue`, { method: 'POST', body: { expected_return: $('#f-expected').value } });
          closeModal();
          await refreshBorrowsAndEquipment();
          toast('Issued to borrower.');
        } catch (err) { setFormError(err.message); }
      },
    },
  ]);
}

function openReturnForm(id) {
  const rec  = BORROWS.find(b => b.id === Number(id));
  const body = `
    <div class="form-grid">
      <div class="field full"><p class="cell-sub">Returning ${rec.qty} unit(s) of <strong>${esc(eqById(rec.equipment_id)?.name || '')}</strong>.</p></div>
      <div class="field"><label>Actual return date</label><input id="f-return" type="date" value="${today()}"></div>
      <div class="field"><label>Condition on return</label>
        <select id="f-cond">
          <option value="Good — as issued">Good — as issued</option>
          <option value="Damaged">Damaged</option>
          <option value="Missing parts">Missing parts</option>
        </select>
      </div>
      <div class="field full"><label>Notes</label><textarea id="f-notes" rows="2"></textarea></div>
    </div>`;

  openModal('Record return', body, [
    { label: 'Cancel', variant: 'secondary', onClick: closeModal },
    {
      label: 'Confirm return',
      onClick: async () => {
        try {
          const condition = $('#f-cond').value;
          await api(`/borrows/${id}/return`, {
            method: 'POST',
            body: { actual_return: $('#f-return').value, condition_on_return: condition, notes: $('#f-notes').value.trim() },
          });
          closeModal();
          await refreshBorrowsAndEquipment();
          toast(
            condition === 'Good — as issued'
              ? 'Return recorded.'
              : `Return recorded — ${rec.qty} unit(s) flagged as damaged (rest of the stock unaffected).`
          );
        } catch (err) { setFormError(err.message); }
      },
    },
  ]);
}
