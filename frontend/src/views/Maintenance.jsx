/* LabLedger — Maintenance view, staff only (port of js/views/maintenance.js) */
import React, { useState } from 'react';
import { api, fmtDate, titleCase, today } from '../api';
import { useApp } from '../store';
import { EmptyState, Modal, Stamp } from '../components';

function MaintenanceModal({ rec, onClose, onSaved }) {
  const { equipment, eqById } = useApp();
  const eq = rec ? eqById(rec.equipment_id) : null;
  const [eqId, setEqId] = useState(
    String(rec?.equipment_id || equipment[0]?.id || '')
  );
  const [qty, setQty] = useState(1);
  const [issue, setIssue] = useState(rec?.issue || '');
  const [reported, setReported] = useState(rec?.date_reported ?? today());
  const [status, setStatus] = useState(rec?.status || 'reported');
  const [scheduled, setScheduled] = useState(rec?.scheduled_date ?? '');
  const [completed, setCompleted] = useState(rec?.completed_date ?? '');
  const [tech, setTech] = useState(rec?.technician || '');
  const [cost, setCost] = useState(rec?.cost ?? '');
  const [stillDamaged, setStillDamaged] = useState(false);
  const [notes, setNotes] = useState(rec?.notes || '');
  const [error, setError] = useState('');

  const submit = async () => {
    const data = {
      equipment_id: Number(eqId),
      issue: issue.trim(),
      date_reported: reported,
      status,
      scheduled_date: scheduled,
      completed_date: completed,
      technician: tech.trim(),
      cost,
      notes: notes.trim(),
    };
    if (!rec) data.qty = Number(qty) || 1;
    else data.still_damaged = stillDamaged;
    try {
      if (rec) await api('/maintenance/' + rec.id, { method: 'PUT', body: data });
      else await api('/maintenance', { method: 'POST', body: data });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title={rec ? 'Update maintenance record' : 'Log maintenance issue'}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            {rec ? 'Save changes' : 'Log record'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label>Equipment</label>
          <select
            value={eqId}
            onChange={(e) => setEqId(e.target.value)}
            disabled={!!rec}
          >
            {equipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.code || ''}) — {e.qty_available} available
              </option>
            ))}
          </select>
        </div>
        {!rec ? (
          <div className="field">
            <label>Units to send for maintenance</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
        ) : (
          <div className="field full">
            <p className="cell-sub">
              {rec.qty} unit(s) of {eq?.name} on this record.
            </p>
          </div>
        )}
        <div className="field full">
          <label>Issue description</label>
          <textarea
            rows="2"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Date reported</label>
          <input
            type="date"
            value={reported}
            onChange={(e) => setReported(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['reported', 'scheduled', 'completed'].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Scheduled date</label>
          <input
            type="date"
            value={scheduled || ''}
            onChange={(e) => setScheduled(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Completed date</label>
          <input
            type="date"
            value={completed || ''}
            onChange={(e) => setCompleted(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Technician / vendor</label>
          <input value={tech} onChange={(e) => setTech(e.target.value)} />
        </div>
        <div className="field">
          <label>Cost (₦)</label>
          <input
            type="number"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        {rec && (
          <div className="field full">
            <label>
              <input
                type="checkbox"
                checked={stillDamaged}
                onChange={(e) => setStillDamaged(e.target.checked)}
                style={{
                  width: 'auto',
                  display: 'inline-block',
                  marginRight: 6,
                }}
              />
              Return these units as damaged (not fully fixed)
            </label>
          </div>
        )}
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

export default function MaintenanceView() {
  const { maintenance, eqById, reload, toast } = useApp();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(undefined);

  const rows = maintenance
    .filter((m) => {
      const eqName = (eqById(m.equipment_id) || {}).name || '';
      const matchQ =
        !q ||
        (eqName + ' ' + (m.technician || ''))
          .toLowerCase()
          .includes(q.toLowerCase());
      const matchStatus = !status || m.status === status;
      return matchQ && matchStatus;
    })
    .sort((a, b) =>
      (b.date_reported || '').localeCompare(a.date_reported || '')
    );

  const saved = async () => {
    await reload(['maintenance', 'equipment']);
    setEditing(undefined);
    toast('Maintenance record saved.');
  };

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Servicing</span>
          <h2>Maintenance &amp; Repair History</h2>
        </div>
        <button className="btn" onClick={() => setEditing(null)}>
          + Log maintenance
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search equipment or technician…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="reported">Reported</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="ledger-wrap">
        {rows.length === 0 ? (
          <EmptyState
            title="No maintenance records found"
            sub="Log a maintenance issue or adjust your filters."
          />
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Qty</th>
                <th>Issue</th>
                <th>Reported</th>
                <th>Scheduled</th>
                <th>Completed</th>
                <th>Technician</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="cell-name">
                    {(eqById(m.equipment_id) || {}).name || 'Unknown'}
                  </td>
                  <td className="mono">{m.qty}</td>
                  <td>{m.issue || ''}</td>
                  <td>{fmtDate(m.date_reported)}</td>
                  <td>{fmtDate(m.scheduled_date)}</td>
                  <td>{fmtDate(m.completed_date)}</td>
                  <td>{m.technician || '—'}</td>
                  <td>
                    <Stamp value={m.status} label={titleCase(m.status)} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        onClick={() => setEditing(m)}
                      >
                        Update
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== undefined && (
        <MaintenanceModal
          rec={editing}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}
    </>
  );
}
