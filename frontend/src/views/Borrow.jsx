/* LabLedger — Borrow & Return view (port of js/views/borrow.js) */
import React, { useEffect, useState } from 'react';
import { api, borrowDisplayStatus, fmtDate, titleCase, today } from '../api';
import { useApp } from '../store';
import { EmptyState, Modal, Stamp } from '../components';

function BorrowForm({ presetEquip, onClose, onSaved }) {
  const { me, equipment, isStaff } = useApp();
  const options = equipment.filter(
    (e) => e.qty_available > 0 || String(e.id) === String(presetEquip)
  );
  const [eq, setEq] = useState(
    presetEquip ? String(presetEquip) : String(options[0]?.id || '')
  );
  const [qty, setQty] = useState(1);
  const [expected, setExpected] = useState(today());
  const [borrower, setBorrower] = useState('');
  const [role, setRole] = useState('Student');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!options.length) return null;

  const submit = async () => {
    const data = {
      equipment_id: Number(eq),
      qty: Number(qty) || 1,
      expected_return: expected,
      notes: notes.trim(),
    };
    if (isStaff) {
      if (!borrower.trim()) {
        setError('Borrower name is required.');
        return;
      }
      data.borrower_name = borrower.trim();
      data.borrower_role = role;
    }
    try {
      await api('/borrows', { method: 'POST', body: data });
      onSaved(isStaff ? 'Borrow logged.' : 'Request submitted for approval.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title="New borrow request"
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Submit request
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label>Equipment</label>
          <select value={eq} onChange={(e) => setEq(e.target.value)}>
            {options.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.qty_available} available
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Quantity needed</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Expected return date</label>
          <input
            type="date"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </div>
        {isStaff ? (
          <>
            <div className="field">
              <label>Borrower name</label>
              <input
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                placeholder="Who is this for?"
              />
            </div>
            <div className="field">
              <label>Borrower type</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="Student">Student</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </>
        ) : (
          <div className="field full">
            <p className="cell-sub">
              Requesting as {me.name} (
              {me.role === 'lecturer' ? 'Lecturer' : 'Student'}).
            </p>
          </div>
        )}
        <div className="field full">
          <label>Notes / purpose</label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. CHM 302 practical, group 4"
          />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

function IssueModal({ rec, onClose, onSaved }) {
  const { eqById } = useApp();
  const eq = eqById(rec.equipment_id) || {};
  const [expected, setExpected] = useState(rec.expected_return || today());
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      await api('/borrows/' + rec.id + '/issue', {
        method: 'POST',
        body: { expected_return: expected },
      });
      onSaved('Issued to borrower.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title="Approve & issue"
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Approve &amp; issue
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <p className="cell-sub">
            Issuing {rec.qty} unit(s) of <strong>{eq.name}</strong> to{' '}
            {rec.borrower_name}. {eq.qty_available} unit(s) currently
            available.
          </p>
        </div>
        <div className="field full">
          <label>Expected return date</label>
          <input
            type="date"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

function ReturnModal({ rec, onClose, onSaved }) {
  const { eqById } = useApp();
  const [actual, setActual] = useState(today());
  const [condition, setCondition] = useState('Good — as issued');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      await api('/borrows/' + rec.id + '/return', {
        method: 'POST',
        body: {
          actual_return: actual,
          condition_on_return: condition,
          notes: notes.trim(),
        },
      });
      onSaved(
        condition === 'Good — as issued'
          ? 'Return recorded.'
          : 'Return recorded — ' +
              rec.qty +
              ' unit(s) flagged as damaged (rest of the stock unaffected).'
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title="Record return"
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Confirm return
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <p className="cell-sub">
            Returning {rec.qty} unit(s) of{' '}
            <strong>{(eqById(rec.equipment_id) || {}).name || ''}</strong>.
          </p>
        </div>
        <div className="field">
          <label>Actual return date</label>
          <input
            type="date"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Condition on return</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="Good — as issued">Good — as issued</option>
            <option value="Damaged">Damaged</option>
            <option value="Missing parts">Missing parts</option>
          </select>
        </div>
        <div className="field full">
          <label>Notes</label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

export default function BorrowView({ presetEquip, clearPreset }) {
  const { borrows, isStaff, eqById, reload, toast, equipment } = useApp();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [issuing, setIssuing] = useState(null);
  const [returning, setReturning] = useState(null);

  // Opened from Equipment → "Request": pre-open the form with equipment set.
  useEffect(() => {
    if (presetEquip) setShowForm(true);
  }, [presetEquip]);

  const closeForm = () => {
    setShowForm(false);
    if (clearPreset) clearPreset();
  };

  const refresh = async (msg) => {
    await reload(['borrows', 'equipment']);
    setShowForm(false);
    setIssuing(null);
    setReturning(null);
    if (clearPreset) clearPreset();
    if (msg) toast(msg);
  };

  const rows = borrows
    .filter((b) => {
      const eqName = (eqById(b.equipment_id) || {}).name || '';
      const matchQ =
        !q ||
        (eqName + ' ' + b.borrower_name)
          .toLowerCase()
          .includes(q.toLowerCase());
      const matchStatus = !status || borrowDisplayStatus(b) === status;
      return matchQ && matchStatus;
    })
    .sort(
      (a, b) =>
        (b.date_requested || '').localeCompare(a.date_requested || '') ||
        b.id - a.id
    );

  const reject = async (id) => {
    if (!window.confirm('Reject this borrow request?')) return;
    try {
      await api('/borrows/' + id + '/reject', { method: 'POST' });
      await refresh('Request rejected.');
    } catch (err) {
      toast(err.message);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Withdraw this pending request?')) return;
    try {
      await api('/borrows/' + id, { method: 'DELETE' });
      await refresh('Request withdrawn.');
    } catch (err) {
      toast(err.message);
    }
  };

  const newDisabled = equipment.every((e) => e.qty_available <= 0);
  const openNew = () => {
    if (newDisabled) {
      toast('No equipment currently has units available.');
      return;
    }
    setShowForm(true);
  };

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Circulation</span>
          <h2>{isStaff ? 'Borrow & Return' : 'My Borrow Requests'}</h2>
        </div>
        <button className="btn" onClick={openNew}>
          + New borrow request
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search borrower or equipment…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending approval</option>
          <option value="borrowed">Issued / borrowed</option>
          <option value="overdue">Overdue</option>
          <option value="returned">Returned</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="ledger-wrap">
        {rows.length === 0 ? (
          <EmptyState
            title="No borrow records found"
            sub={
              isStaff
                ? 'Adjust your filters, or wait for new requests.'
                : 'Request equipment from the Equipment tab or the button above.'
            }
          />
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Qty</th>
                {isStaff && <th>Borrower</th>}
                <th>Requested</th>
                <th>Expected return</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const ds = borrowDisplayStatus(b);
                return (
                  <tr key={b.id}>
                    <td className="cell-name">
                      {(eqById(b.equipment_id) || {}).name || 'Unknown'}
                    </td>
                    <td className="mono">{b.qty}</td>
                    {isStaff && (
                      <td>
                        {b.borrower_name}
                        <span className="cell-sub">{b.borrower_role}</span>
                      </td>
                    )}
                    <td>{fmtDate(b.date_requested)}</td>
                    <td>{fmtDate(b.expected_return)}</td>
                    <td>
                      <Stamp value={ds} label={titleCase(ds)} />
                    </td>
                    <td>
                      <div className="row-actions">
                        {isStaff && b.status === 'pending' && (
                          <>
                            <button
                              className="icon-btn"
                              onClick={() => setIssuing(b)}
                            >
                              Approve &amp; issue
                            </button>
                            <button
                              className="icon-btn danger"
                              onClick={() => reject(b.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isStaff && b.status === 'borrowed' && (
                          <button
                            className="icon-btn"
                            onClick={() => setReturning(b)}
                          >
                            Record return
                          </button>
                        )}
                        {!isStaff && b.status === 'pending' && (
                          <button
                            className="icon-btn danger"
                            onClick={() => cancel(b.id)}
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm &&
        (equipment.some(
          (e) =>
            e.qty_available > 0 || String(e.id) === String(presetEquip)
        ) ? (
          <BorrowForm
            presetEquip={presetEquip}
            onClose={closeForm}
            onSaved={refresh}
          />
        ) : null)}
      {issuing && (
        <IssueModal
          rec={issuing}
          onClose={() => setIssuing(null)}
          onSaved={refresh}
        />
      )}
      {returning && (
        <ReturnModal
          rec={returning}
          onClose={() => setReturning(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
