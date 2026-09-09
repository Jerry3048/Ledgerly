/* =========================================================
   LabLedger — login screen + self-registration (React port
   of the login markup in index.html + initLogin in js/main.js)
   ========================================================= */
import React, { useState } from 'react';
import { api } from './api';
import { useApp } from './store';
import { Modal } from './components';

function RegisterModal({ onClose }) {
  const { toast } = useApp();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await api('/auth/register', {
        method: 'POST',
        body: { name: name.trim(), username: username.trim(), password, role },
      });
      onClose();
      toast('Account created. You can now sign in.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title="Create Student / Lecturer Account"
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Register
          </button>
        </>
      }
    >
      <p className="cell-sub" style={{ marginBottom: 14 }}>
        Self-registration is available for Students and Lecturers only.
        Administrator and Lab Officer accounts are created by an existing
        administrator from Users &amp; Access.
      </p>
      <div className="form-grid">
        <div className="field full">
          <label>Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label>I am a…</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
          </select>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

export default function Login() {
  const { setMe, loadAll } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { user } = await api('/auth/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      });
      setMe(user);
      await loadAll(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="hole"></span>
          <h1>Lab Overall Ledger</h1>
        </div>
        <p className="login-sub">
          Equipment &amp; consumable inventory, borrowing and maintenance
          register.
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <p className="login-error">{error}</p>
          <button type="submit" className="btn-primary">
            Sign in to register
          </button>
          <button
            type="button"
            className="btn secondary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => setShowRegister(true)}
          >
            Create Student / Lecturer Account
          </button>
        </form>

            <div className="login-demo">
          <strong>Demo credentials</strong>
          <br />
          Administrator — admin / admin123
          <br />
          Lab Officer — officer / officer123
          <br />
          <em>
            Staff (Admin/Officer) accounts can only be created by an
            administrator from Users &amp; Access — self-registration is
            limited to Student/Lecturer.
          </em>
        </div>

      </div>
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </div>
  );
}
