/* =========================================================
   LabLedger — app shell: sidebar nav + view switching
   (React port of index.html app-shell + js/nav.js)
   ========================================================= */
import React, { useEffect, useState } from 'react';
import { api, isOverdue } from './api';
import { roleLabels, useApp } from './store';
import { BrandIcon, Modal, lockBodyScroll } from './components';
import DashboardView from './views/Dashboard';
import EquipmentView from './views/Equipment';
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

function ChangePasswordModal({ onClose }) {
  const { toast } = useApp();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = async () => {
    if (!currentPassword || !newPassword) {
      setError('Enter your current password and a new password.');
      return;
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setError('');
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      onClose();
      toast('Password changed.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title="Change password"
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Change password
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label>Current password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label>New password</label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Confirm new password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

export default function Shell() {
  const { me, setMe, isStaff, isAdmin, borrows } = useApp();
  const [view, setView] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  // Equipment "Request" button jumps to Borrow with the form pre-opened.
  const [borrowPreset, setBorrowPreset] = useState(null);

  const overdue = (
    isStaff ? borrows : borrows.filter((b) => b.borrower_user_id === me.id)
  ).filter(isOverdue).length;

  const requestEquipment = (id) => {
    setBorrowPreset(String(id));
    setView('borrow');
  };

  // Lock the page behind the sidebar drawer while it's slid out (mobile).
  useEffect(() => {
    if (!navOpen) return;
    return lockBodyScroll();
  }, [navOpen]);

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
          <button className="logout-btn" onClick={() => setShowChangePw(true)}>
            Change password
          </button>
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
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  );
}
