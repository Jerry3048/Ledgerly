/* =========================================================
   LabLedger — app shell: sidebar nav + view switching
   (React port of index.html app-shell + js/nav.js)
   ========================================================= */
import React, { useEffect, useState } from 'react';
import { api, isOverdue } from './api';
import { roleLabels, useApp } from './store';
import { BrandIcon } from './components';
import DashboardView from './views/Dashboard';
import EquipmentView from './views/Equipment';
import ConsumablesView from './views/Consumables';
import BorrowView from './views/Borrow';
import MaintenanceView from './views/Maintenance';
import ReportsView from './views/Reports';
import UsersView from './views/Users';

function NavItem({ id, view, setView, onNavigate, children, badge }) {
  return (
    <button
      className={'nav-item' + (view === id ? ' active' : '')}
      onClick={() => {
        setView(id);
        if (onNavigate) onNavigate();
      }}
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
  const [navOpen, setNavOpen] = useState(false);
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
    document.title = 'Legerly — ' + view;
  }, [view]);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setMe(null);
  };

  return (
    <div className="app-shell active">
      {/* Backdrop — click to slide the drawer back in */}
      {navOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={'sidebar' + (navOpen ? ' open' : '')}>
        <div className="sidebar-brand">
          <BrandIcon />
          <span className="brand-name">Legerly</span>
          {/* X button — only visible on small screens, slides drawer back in */}
          <button
            className="sidebar-close"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        <div className="nav-group-label">Overview</div>
        <NavItem
          id="dashboard"
          view={view}
          setView={setView}
          onNavigate={() => setNavOpen(false)}
        >
          Dashboard
        </NavItem>

        <div className="nav-group-label">Registers</div>
        <NavItem
          id="equipment"
          view={view}
          setView={setView}
          onNavigate={() => setNavOpen(false)}
        >
          Equipment
        </NavItem>
        <NavItem
          id="consumables"
          view={view}
          setView={setView}
          badge={lowStock}
          onNavigate={() => setNavOpen(false)}
        >
          Consumables
        </NavItem>
        <NavItem
          id="borrow"
          view={view}
          setView={setView}
          badge={overdue}
          onNavigate={() => setNavOpen(false)}
        >
          <span>{isStaff ? 'Borrow & Return' : 'My Borrow Requests'}</span>
        </NavItem>
        {isStaff && (
          <NavItem
            id="maintenance"
            view={view}
            setView={setView}
            onNavigate={() => setNavOpen(false)}
          >
            Maintenance
          </NavItem>
        )}

        {isStaff && (
          <>
            <div className="nav-group-label">Insights</div>
            <NavItem
              id="reports"
              view={view}
              setView={setView}
              onNavigate={() => setNavOpen(false)}
            >
              Reports
            </NavItem>
          </>
        )}
        {isAdmin && (
          <NavItem
            id="users"
            view={view}
            setView={setView}
            onNavigate={() => setNavOpen(false)}
          >
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
        {/* Hamburger bar — only visible on small screens.
            Click the icon to slide the sidebar out / back in. */}
        <div className="mobile-topbar">
          <button
            className="menu-btn"
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
          >
            <span className="menu-icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <span className="mobile-brand">
            <BrandIcon />
            Legerly
          </span>
        </div>
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
