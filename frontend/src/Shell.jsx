/* =========================================================
   LabLedger — app shell: sidebar nav + view switching
   (React port of index.html app-shell + js/nav.js)
   ========================================================= */
import React, { useEffect, useState } from 'react';
import { api, isOverdue } from './api';
import { roleLabels, useApp } from './store';
import DashboardView from './views/Dashboard';
import EquipmentView from './views/Equipment';
import ConsumablesView from './views/Consumables';
import BorrowView from './views/Borrow';
import MaintenanceView from './views/Maintenance';
import ReportsView from './views/Reports';
import UsersView from './views/Users';

function NavItem({ id, view, setView, children, badge }) {
  return (
    <button
      className={'nav-item' + (view === id ? ' active' : '')}
      onClick={() => setView(id)}
    >
      <span className="tab-mark"></span>
      {children}
      {badge > 0 && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

export default function Shell() {
  const { me, setMe, isStaff, isAdmin, consumables, borrows } = useApp();
  const [view, setView] = useState('dashboard');
  // Equipment "Request" button jumps to Borrow with the form pre-opened.
  const [borrowPreset, setBorrowPreset] = useState(null);

  const lowStock = consumables.filter(
    (c) => c.stock <= c.reorder_level
  ).length;
  const overdue = (
    isStaff ? borrows : borrows.filter((b) => b.borrower_user_id === me.id)
  ).filter(isOverdue).length;

  const requestEquipment = (id) => {
    setBorrowPreset(String(id));
    setView('borrow');
  };

  // Keep document title in sync with the active view.
  useEffect(() => {
    document.title = 'Lab Overall Ledger — ' + view;
  }, [view]);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setMe(null);
  };

  return (
    <div className="app-shell active">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="hole"></span>
          <span>Lab Overall Ledger</span>
        </div>

        <div className="nav-group-label">Overview</div>
        <NavItem id="dashboard" view={view} setView={setView}>
          Dashboard
        </NavItem>

        <div className="nav-group-label">Registers</div>
        <NavItem id="equipment" view={view} setView={setView}>
          Equipment
        </NavItem>
        <NavItem id="consumables" view={view} setView={setView} badge={lowStock}>
          Consumables
        </NavItem>
        <NavItem id="borrow" view={view} setView={setView} badge={overdue}>
          <span>{isStaff ? 'Borrow & Return' : 'My Borrow Requests'}</span>
        </NavItem>
        {isStaff && (
          <NavItem id="maintenance" view={view} setView={setView}>
            Maintenance
          </NavItem>
        )}

        {isStaff && (
          <>
            <div className="nav-group-label">Insights</div>
            <NavItem id="reports" view={view} setView={setView}>
              Reports
            </NavItem>
          </>
        )}
        {isAdmin && (
          <NavItem id="users" view={view} setView={setView}>
            Users &amp; Access
          </NavItem>
        )}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span>{me.name}</span>
            <br />
            <span className="role-pill">{roleLabels[me.role] || me.role}</span>
          </div>
          <button className="logout-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className={'view' + (view === 'dashboard' ? ' active' : '')}>
          {view === 'dashboard' && <DashboardView />}
        </div>
        <div className={'view' + (view === 'equipment' ? ' active' : '')}>
          {view === 'equipment' && (
            <EquipmentView onRequest={requestEquipment} />
          )}
        </div>
        <div className={'view' + (view === 'consumables' ? ' active' : '')}>
          {view === 'consumables' && <ConsumablesView />}
        </div>
        <div className={'view' + (view === 'borrow' ? ' active' : '')}>
          {view === 'borrow' && (
            <BorrowView
              presetEquip={borrowPreset}
              clearPreset={() => setBorrowPreset(null)}
            />
          )}
        </div>
        {isStaff && (
          <div className={'view' + (view === 'maintenance' ? ' active' : '')}>
            {view === 'maintenance' && <MaintenanceView />}
          </div>
        )}
        {isStaff && (
          <div className={'view' + (view === 'reports' ? ' active' : '')}>
            {view === 'reports' && <ReportsView />}
          </div>
        )}
        {isAdmin && (
          <div className={'view' + (view === 'users' ? ' active' : '')}>
            {view === 'users' && <UsersView />}
          </div>
        )}
      </main>
    </div>
  );
}
