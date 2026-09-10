/* LabLedger — Equipment view (port of js/views/equipment.js) */
import React, { useState } from 'react';
import { api } from '../api';
import { useApp } from '../store';
import { EmptyState, Modal, Stamp } from '../components';
import CsvImportModal from '../CsvImport';
import { downloadCSV, toCSV, EQUIPMENT_TEMPLATE_COLS } from '../csv';

function nextEquipCode(equipment) {
  return 'EQ-' + String(equipment.length + 1).padStart(4, '0');
}

function EquipmentModal({ rec, onClose, onSaved }) {
  const { categories, equipment } = useApp();
  const [name, setName] = useState(rec?.name || '');
  const [cat, setCat] = useState(rec?.category_id ?? categories[0]?.id ?? '');
  const [code, setCode] = useState(rec?.code ?? nextEquipCode(equipment));
  const [serial, setSerial] = useState(rec?.serial || '');
  const [model, setModel] = useState(rec?.model || '');
  const [qty, setQty] = useState(rec?.qty_total ?? 1);
  const [supplier, setSupplier] = useState(rec?.supplier || '');
  const [purchase, setPurchase] = useState(rec?.purchase_date || '');
  const [location, setLocation] = useState(rec?.location || '');
  const [condition, setCondition] = useState(rec?.condition_note ?? 'Good');
  const [notes, setNotes] = useState(rec?.notes || '');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      setError('Equipment name is required.');
      return;
    }
    const data = {
      name: name.trim(),
      category_id: Number(cat) || null,
      code: code.trim(),
      serial: serial.trim(),
      model: model.trim(),
      qty_total: Number(qty) || 0,
      supplier: supplier.trim(),
      purchase_date: purchase,
      location: location.trim(),
      condition_note: condition.trim(),
      notes: notes.trim(),
    };
    try {
      if (rec) await api('/equipment/' + rec.id, { method: 'PUT', body: data });
      else await api('/equipment', { method: 'POST', body: data });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      title={rec ? 'Edit equipment' : 'Register equipment'}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            {rec ? 'Save changes' : 'Register equipment'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label>Equipment name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Equipment code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="field">
          <label>Serial number</label>
          <input value={serial} onChange={(e) => setSerial(e.target.value)} />
        </div>
        <div className="field">
          <label>Model number</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="field">
          <label>Total quantity</label>
          <input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Supplier</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
        <div className="field">
          <label>Purchase date</label>
          <input
            type="date"
            value={purchase || ''}
            onChange={(e) => setPurchase(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="field">
          <label>General condition</label>
          <input value={condition} onChange={(e) => setCondition(e.target.value)} />
        </div>
        {rec && (
          <div className="field full">
            <p className="cell-sub">
              Currently: {rec.qty_borrowed} borrowed, {rec.qty_damaged}{' '}
              damaged, {rec.qty_maintenance} in maintenance. These are only
              changed via Borrow &amp; Return and Maintenance actions, not
              here.
            </p>
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

function CategoryManager({ onClose }) {
  const { categories, reload, toast } = useApp();
  const [name, setName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api('/categories', { method: 'POST', body: { name: name.trim() } });
      await reload(['categories']);
      setName('');
      toast('Category added.');
    } catch (err) {
      toast(err.message);
    }
  };

  const del = async (id) => {
    try {
      await api('/categories/' + id, { method: 'DELETE' });
      await reload(['categories']);
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <Modal
      title="Manage equipment categories"
      onClose={onClose}
      footer={
        <button className="btn" onClick={onClose}>
          Done
        </button>
      }
    >
      <div>
        {categories.length === 0 ? (
          <p className="alert-empty">No categories yet.</p>
        ) : (
          categories.map((c) => (
            <div className="alert-row" key={c.id}>
              <span>{c.name}</span>
              <button
                className="icon-btn danger small"
                style={{ marginLeft: 'auto' }}
                onClick={() => del(c.id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      <div className="field full" style={{ marginTop: 14 }}>
        <label>New category name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chemical Reagents"
          />
          <button className="btn small" type="button" onClick={add}>
            Add
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function EquipmentView({ onRequest }) {
  const {
    equipment,
    categories,
    catName,
    isStaff,
    isAdmin,
    isRequester,
    reload,
    toast,
  } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [avail, setAvail] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [showCats, setShowCats] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const rows = equipment.filter((e) => {
    const matchQ =
      !q ||
      [e.name, e.code, e.serial, e.model].some((v) =>
        (v || '').toLowerCase().includes(q.toLowerCase())
      );
    const matchCat = !cat || e.category_id === Number(cat);
    const matchAvail =
      !avail ||
      (avail === 'available' ? e.qty_available > 0 : e.qty_available === 0);
    return matchQ && matchCat && matchAvail;
  });

  const saved = async () => {
    await reload(['equipment']);
    setEditing(undefined);
    toast('Equipment saved.');
  };

  const del = async (id) => {
    if (
      !window.confirm('Delete this equipment record? This cannot be undone.')
    )
      return;
    try {
      await api('/equipment/' + id, { method: 'DELETE' });
      await reload(['equipment']);
      toast('Equipment record deleted.');
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Register</span>
          <h2>Equipment</h2>
        </div>
        {isStaff && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn secondary" onClick={() => setShowImport(true)}>
              Import CSV
            </button>
            <button
              className="btn secondary"
              onClick={() =>
                downloadCSV(
                  'equipment-export.csv',
                  toCSV(
                    rows.map((e) => ({
                      name: e.name || '',
                      category: catName(e.category_id) === '—' ? '' : catName(e.category_id),
                      code: e.code || '',
                      serial: e.serial || '',
                      model: e.model || '',
                      supplier: e.supplier || '',
                      purchase_date: e.purchase_date || '',
                      location: e.location || '',
                      condition_note: e.condition_note || '',
                      notes: e.notes || '',
                      qty_total: e.qty_total ?? 0,
                    })),
                    EQUIPMENT_TEMPLATE_COLS
                  )
                )
              }
            >
              Export CSV
            </button>
            <button className="btn" onClick={() => setEditing(null)}>
              + Register equipment
            </button>
          </div>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name, code, serial…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={avail} onChange={(e) => setAvail(e.target.value)}>
          <option value="">All availability</option>
          <option value="available">Has units available</option>
          <option value="none">None currently available</option>
        </select>
        <div className="spacer"></div>
        {isStaff && (
          <button
            className="btn secondary small"
            onClick={() => setShowCats(true)}
          >
            Manage categories
          </button>
        )}
      </div>

      <div className="ledger-wrap">
        {rows.length === 0 ? (
          <EmptyState
            title="No equipment found"
            sub="Register equipment or adjust your filters."
          />
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Category</th>
                <th>Total</th>
                <th>Breakdown</th>
                <th>Location</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="cell-name">{e.name}</span>
                    <span className="cell-sub">
                      {e.code || ''}
                      {e.serial ? ' · S/N ' + e.serial : ''}
                    </span>
                  </td>
                  <td>{catName(e.category_id)}</td>
                  <td className="mono">{e.qty_total}</td>
                  <td>
                    <Stamp value="available" label={e.qty_available + ' available'} />
                    {e.qty_borrowed > 0 && (
                      <span className="qty-breakdown">
                        {e.qty_borrowed} borrowed
                      </span>
                    )}
                    {e.qty_damaged > 0 && (
                      <span className="qty-breakdown">
                        {e.qty_damaged} damaged
                      </span>
                    )}
                    {e.qty_maintenance > 0 && (
                      <span className="qty-breakdown">
                        {e.qty_maintenance} in maintenance
                      </span>
                    )}
                  </td>
                  <td>{e.location || '—'}</td>
                  <td>
                    <div className="row-actions">
                      {isStaff && (
                        <button
                          className="icon-btn"
                          onClick={() => setEditing(e)}
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="icon-btn danger"
                          onClick={() => del(e.id)}
                        >
                          Delete
                        </button>
                      )}
                      {isRequester && e.qty_available > 0 && (
                        <button
                          className="icon-btn"
                          onClick={() => onRequest(e.id)}
                        >
                          Request
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== undefined && (
        <EquipmentModal
          rec={editing}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}
      {showCats && <CategoryManager onClose={() => setShowCats(false)} />}
      {showImport && (
        <CsvImportModal
          title="Import equipment from CSV"
          endpoint="/equipment/bulk"
          templateCols={EQUIPMENT_TEMPLATE_COLS}
          templateFilename="equipment-template.csv"
          sampleRow={{
            name: 'Binocular Microscope',
            category: 'Optical Instruments',
            code: 'EQ-0001',
            serial: 'SN-MC-2201',
            model: 'Olympus CX23',
            supplier: 'ScienceMart Ltd',
            purchase_date: '2023-09-12',
            location: 'Lab A — Bench 3',
            condition_note: 'Good',
            notes: '',
            qty_total: '8',
          }}
          onClose={() => setShowImport(false)}
          onDone={async () => {
            await reload(['equipment', 'categories']);
            toast('Equipment import finished.');
          }}
        />
      )}
    </>
  );
}
