/* LabLedger — Consumables view (port of js/views/consumables.js) */
import React, { useState } from 'react';
import { api } from '../api';
import { useApp } from '../store';
import { EmptyState, Modal, Stamp } from '../components';

function ConsumableModal({ rec, onClose, onSaved }) {
  const [name, setName] = useState(rec?.name || '');
  const [category, setCategory] = useState(rec?.category || '');
  const [unit, setUnit] = useState(rec?.unit ?? 'unit');
  const [stock, setStock] = useState(rec?.stock ?? 0);
  const [reorder, setReorder] = useState(rec?.reorder_level ?? 0);
  const [location, setLocation] = useState(rec?.location || '');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      setError('Consumable name is required.');
      return;
    }
    const data = {
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim() || 'unit',
      stock: Number(stock) || 0,
      reorder_level: Number(reorder) || 0,
      location: location.trim(),
    };
    try {
      if (rec) await api('/consumables/' + rec.id, { method: 'PUT', body: data });
      else await api('/consumables', { method: 'POST', body: data });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title={rec ? 'Edit consumable' : 'Add consumable'}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            {rec ? 'Save changes' : 'Add consumable'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label>Consumable name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Reagent, PPE, Glassware"
          />
        </div>
        <div className="field">
          <label>Unit</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div className="field">
          <label>Current stock</label>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Reorder level</label>
          <input
            type="number"
            min="0"
            value={reorder}
            onChange={(e) => setReorder(e.target.value)}
          />
        </div>
        <div className="field full">
          <label>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}

export default function ConsumablesView() {
  const { consumables, isStaff, reload, toast } = useApp();
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(undefined); // undefined=closed, null=new, rec=edit

  const rows = consumables.filter((c) => {
    const matchQ =
      !q ||
      [c.name, c.category, c.location].some((v) =>
        (v || '').toLowerCase().includes(q.toLowerCase())
      );
    const matchLow = !lowOnly || c.stock <= c.reorder_level;
    return matchQ && matchLow;
  });

  const saved = async () => {
    await reload(['consumables']);
    setEditing(undefined);
    toast('Consumable saved.');
  };

  const del = async (id) => {
    if (!window.confirm('Delete this consumable record?')) return;
    try {
      await api('/consumables/' + id, { method: 'DELETE' });
      await reload(['consumables']);
      toast('Consumable deleted.');
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Register</span>
          <h2>Consumables &amp; Materials</h2>
        </div>
        {isStaff && (
          <button className="btn" onClick={() => setEditing(null)}>
            + Add consumable
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search consumables…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={lowOnly ? 'low' : ''}
          onChange={(e) => setLowOnly(e.target.value === 'low')}
        >
          <option value="">All stock levels</option>
          <option value="low">Low stock only</option>
        </select>
      </div>

      <div className="ledger-wrap">
        {rows.length === 0 ? (
          <EmptyState
            title="No consumables found"
            sub="Add a consumable or adjust your filters."
          />
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Consumable</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Reorder level</th>
                <th>Location</th>
                <th>Status</th>
                {isStaff && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const low = c.stock <= c.reorder_level;
                return (
                  <tr key={c.id}>
                    <td className="cell-name">{c.name}</td>
                    <td>{c.category || '—'}</td>
                    <td className="mono">
                      {c.stock} {c.unit}
                    </td>
                    <td className="mono">{c.reorder_level}</td>
                    <td>{c.location || '—'}</td>
                    <td>
                      <Stamp value={low ? 'damaged' : 'available'} label={low ? 'Low stock' : 'OK'} />
                    </td>
                    {isStaff && (
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => setEditing(c)}
                          >
                            Edit
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => del(c.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing !== undefined && (
        <ConsumableModal
          rec={editing}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}
    </>
  );
}
