/* =========================================================
   LabLedger — application bootstrap
   Wires up all views, handles auth session check, and
   kicks off the app after DOM is ready.
   ========================================================= */

/* ---------------- shared empty-state template ---------------- */
function emptyState(title, sub) {
  return `<div class="empty-state"><span class="hole"></span><h4>${esc(title)}</h4><p>${esc(sub)}</p></div>`;
}

/* ---------------- data loader ---------------- */
async function loadAll() {
  const tasks = [
    api('/categories').then(d => (CATEGORIES = d)),
    api('/equipment').then(d  => (EQUIPMENT  = d)),
    api('/consumables').then(d => (CONSUMABLES = d)),
    api('/borrows').then(d    => (BORROWS    = d)),
  ];
  if (isStaff()) tasks.push(api('/maintenance').then(d => (MAINTENANCE = d)));
  if (isAdmin()) tasks.push(api('/users').then(d => (USERS = d)));
  await Promise.all(tasks);
}

/* ---------------- app entry after successful login ---------------- */
async function enterApp() {
  if (!ME) return;
  $('#loginScreen').style.display = 'none';
  $('#appShell').classList.add('active');
  $('#sidebarUserName').textContent = ME.name;
  const roleLabels = { admin: 'Administrator', officer: 'Lab Officer', lecturer: 'Lecturer', student: 'Student' };
  $('#sidebarUserRole').textContent = roleLabels[ME.role] || ME.role;

  // Role-based navigation visibility — access is also re-checked server-side for every request.
  $('#navUsers').style.display          = isAdmin() ? '' : 'none';
  $('#navReports').style.display        = isStaff() ? '' : 'none';
  $('#navMaintenance').style.display    = isStaff() ? '' : 'none';
  $('#insightsGroupLabel').style.display = isStaff() ? '' : 'none';
  $('#borrowNavLabel').textContent      = isStaff() ? 'Borrow & Return' : 'My Borrow Requests';
  $('#borrowViewTitle').textContent     = isStaff() ? 'Borrow & Return' : 'My Borrow Requests';
  $('#addEquipmentBtn').style.display   = isStaff() ? '' : 'none';
  $('#manageCategoriesBtn').style.display = isStaff() ? '' : 'none';
  $('#addConsumableBtn').style.display  = isStaff() ? '' : 'none';

  await loadAll();
  renderAll();
  switchView('dashboard');
}

/* ---------------- auth forms ---------------- */
function initLogin() {
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#username').value.trim();
    const password = $('#password').value;
    $('#loginError').textContent = '';
    try {
      const { user } = await api('/auth/login', { method: 'POST', body: { username, password } });
      ME = user;
      await enterApp();
    } catch (err) {
      $('#loginError').textContent = err.message;
    }
  });

  $('#registerBtn').addEventListener('click', () => {
    const body = `
      <p class="cell-sub" style="margin-bottom:14px;">Self-registration is available for Students and Lecturers only. Administrator and Lab Officer accounts are created by an existing administrator from Users &amp; Access.</p>
      <div class="form-grid">
        <div class="field full"><label>Full Name</label><input id="regName"></div>
        <div class="field"><label>Username</label><input id="regUsername"></div>
        <div class="field"><label>Password</label><input type="password" id="regPassword"></div>
        <div class="field"><label>I am a…</label>
          <select id="regRole">
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
          </select>
        </div>
      </div>
      <p class="form-error" id="regError"></p>
    `;
    openModal('Create Student / Lecturer Account', body, [
      { label: 'Cancel', variant: 'secondary', onClick: closeModal },
      {
        label: 'Register',
        onClick: async () => {
          const name     = $('#regName').value.trim();
          const username = $('#regUsername').value.trim();
          const password = $('#regPassword').value;
          const role     = $('#regRole').value;
          try {
            await api('/auth/register', { method: 'POST', body: { name, username, password, role } });
            closeModal();
            toast('Account created. You can now sign in.');
          } catch (err) {
            $('#regError').textContent = err.message;
          }
        },
      },
    ]);
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST' });
    location.reload();
  });
}

/* ---------------- DOMContentLoaded ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Wire up all subsystems
  initLogin();
  initNav();
  initModal();
  initEquipmentView();
  initConsumableView();
  initBorrowView();
  initMaintenanceView();
  initUserView();

  // Print button in reports
  $('#printReportBtn').addEventListener('click', () => window.print());

  // Restore session if the user is already signed in
  try {
    const { user } = await api('/auth/me');
    if (user) { ME = user; await enterApp(); }
  } catch (e) { /* not signed in, stay on login screen */ }
});
