/* LabLedger — Users & Access view, admin only (port of js/views/users.js) */
import React, { useState } from 'react';
import { api } from '../api';
import { roleLabels, useApp } from '../store';
import { EmptyState, Modal } from '../components';

function UserModal({ rec, onClose, onSaved }) {
  const [name, setName] = useState(rec?.name || '');
  const [username, setUsername] = useState(rec?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(rec?.role || 'student');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !username.trim()) {
      setError('Name and username are required.');
      return;
    }
    if (!rec && !password.trim()) {
      setError('Password is required for a new account.');
      return;
    }
    const data = { name: name.trim(), username: username.trim(), role };
    if (password.trim()) data.password = password.trim();
    try {
      if (rec) await api('/users/' + rec.id, { method: 'PUT', body: data });
      else await api('/users', { method: 'POST', body: data });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title={rec ? 'Edit user' : 'Add user'}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            {rec ? 'Save changes' : 'Add user'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={rec ? 'Leave blank to keep current' : 'Minimum 6 characters'}
          />
        </div>
        <div className="field full">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="officer">Laboratory Officer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

export default function UsersView() {
  const { me, users, isAdmin, reload, toast } = useApp();
  const [editing, setEditing] = useState(undefined);

  if (!isAdmin) {
    return (
      <>
        <div className="topbar">
          <div>
            <span className="eyebrow">Access control</span>
            <h2>Users &amp; Access</h2>
          </div>
        </div>
        <div className="ledger-wrap">
          <EmptyState
            title="Restricted"
            sub="Only administrators can manage users and access."
          />
        </div>
      </>
    );
  }

  const saved = async () => {
    await reload(['users']);
    setEditing(undefined);
    toast('User saved.');
  };

  const del = async (u) => {
    if (Number(u.id) === me.id) {
      toast("You can't delete the account you're signed in with.");
      return;
    }
    if (!window.confirm('Delete this user account?')) return;
    try {
      await api('/users/' + u.id, { method: 'DELETE' });
      await reload(['users']);
      toast('User removed.');
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Access control</span>
          <h2>Users &amp; Access</h2>
        </div>
        <button className="btn" onClick={() => setEditing(null)}>
          + Add user
        </button>
      </div>
      <div className="ledger-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="cell-name">{u.name}</td>
                <td className="mono">{u.username}</td>
                <td>
                  <span className={'stamp ' + u.role}>{roleLabels[u.role]}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => setEditing(u)}>
                      Edit
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => del(u)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <UserModal
          rec={editing}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}
    </>
  );
}
