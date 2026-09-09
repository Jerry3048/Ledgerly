/* =========================================================
   LabLedger — Users & Access view (admin only)
   ========================================================= */

function initUserView() {
  $('#addUserBtn').addEventListener('click', () => openUserForm());
}

function renderUsers() {
  if (!isAdmin()) {
    $('#userTableWrap').innerHTML = emptyState('Restricted', 'Only administrators can manage users and access.');
    return;
  }

  const roleLabel = { admin: 'Administrator', officer: 'Lab Officer', lecturer: 'Lecturer', student: 'Student' };

  $('#userTableWrap').innerHTML = `
    <table class="ledger">
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th></th></tr></thead>
      <tbody>
        ${USERS.map(u => `<tr>
          <td class="cell-name">${esc(u.name)}</td>
          <td class="mono">${esc(u.username)}</td>
          <td><span class="stamp ${u.role}">${roleLabel[u.role]}</span></td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit-us="${u.id}">Edit</button>
            <button class="icon-btn danger" data-del-us="${u.id}">Delete</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  $$('[data-edit-us]').forEach(b => b.addEventListener('click', () => openUserForm(b.dataset.editUs)));
  $$('[data-del-us]').forEach(b => b.addEventListener('click', async () => {
    if (Number(b.dataset.delUs) === ME.id) {
      toast("You can't delete the account you're signed in with.");
      return;
    }
    if (!confirm('Delete this user account?')) return;
    try {
      await api('/users/' + b.dataset.delUs, { method: 'DELETE' });
      USERS = await api('/users');
      renderUsers(); toast('User removed.');
    } catch (err) { toast(err.message); }
  }));
}

function openUserForm(id) {
  const rec = id ? USERS.find(u => u.id === Number(id)) : null;
  const body = `
    <div class="form-grid">
      <div class="field full"><label>Full name</label><input id="f-name" value="${esc(rec?.name)}" required></div>
      <div class="field"><label>Username</label><input id="f-username" value="${esc(rec?.username)}" required></div>
      <!-- Bug fix #6: changed type from "text" to "password" so the value is masked as typed -->
      <div class="field"><label>Password</label><input id="f-password" type="password" placeholder="${rec ? 'Leave blank to keep current' : 'Minimum 6 characters'}"></div>
      <div class="field full"><label>Role</label>
        <select id="f-role">
          <option value="student"  ${rec?.role === 'student'  ? 'selected' : ''}>Student</option>
          <option value="lecturer" ${rec?.role === 'lecturer' ? 'selected' : ''}>Lecturer</option>
          <option value="officer"  ${rec?.role === 'officer'  ? 'selected' : ''}>Laboratory Officer</option>
          <option value="admin"    ${rec?.role === 'admin'    ? 'selected' : ''}>Administrator</option>
        </select>
      </div>
    </div>`;

  openModal(rec ? 'Edit user' : 'Add user', body, [
    { label: 'Cancel', variant: 'secondary', onClick: closeModal },
    {
      label: rec ? 'Save changes' : 'Add user',
      onClick: async () => {
        const name     = $('#f-name').value.trim();
        const username = $('#f-username').value.trim();
        if (!name || !username) { setFormError('Name and username are required.'); return; }
        const password = $('#f-password').value.trim();
        if (!rec && !password) { setFormError('Password is required for a new account.'); return; }
        const data = { name, username, role: $('#f-role').value };
        if (password) data.password = password;
        try {
          if (rec) await api('/users/' + rec.id, { method: 'PUT', body: data });
          else     await api('/users',             { method: 'POST', body: data });
          USERS = await api('/users');
          closeModal(); renderUsers(); toast('User saved.');
        } catch (err) { setFormError(err.message); }
      },
    },
  ]);
}
