/* LabLedger — Reports view, staff only (port of js/views/reports.js) */
import React from 'react';
import { borrowDisplayStatus, fmtDate, titleCase } from '../api';
import { useApp } from '../store';
import { Stamp } from '../components';

export default function ReportsView() {
  const { equipment, categories, borrows, consumables, maintenance, eqById } =
    useApp();

  const num = (v) => Number(v) || 0;
  const totalUnits = equipment.reduce((s, e) => s + num(e.qty_total), 0);
  const availableUnits = equipment.reduce(
    (s, e) => s + num(e.qty_available),
    0
  );
  const borrowedUnits = equipment.reduce((s, e) => s + num(e.qty_borrowed), 0);
  const damagedUnits = equipment.reduce((s, e) => s + num(e.qty_damaged), 0);
  const maintUnits = equipment.reduce(
    (s, e) => s + num(e.qty_maintenance),
    0
  );

  const byCategory = categories.map((c) => ({
    name: c.name,
    count: equipment.filter((e) => e.category_id === c.id).length,
    units: equipment
      .filter((e) => e.category_id === c.id)
      .reduce((s, e) => s + num(e.qty_total), 0),
  }));

  const borrowedNow = borrows.filter((b) => b.status === 'borrowed');
  const damagedItems = equipment.filter((e) => num(e.qty_damaged) > 0);
  const lowStock = consumables.filter((c) => c.stock <= c.reorder_level);
  const dueMaintenance = maintenance.filter((m) => m.status !== 'completed');

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Insights</span>
          <h2>Inventory Reports</h2>
        </div>
        <button className="btn secondary" onClick={() => window.print()}>
          Print / export view
        </button>
      </div>

      <div className="report-block">
        <h4>Equipment units by state</h4>
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>State</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Stamp value="available" />
                </td>
                <td className="mono">{availableUnits}</td>
              </tr>
              <tr>
                <td>
                  <Stamp value="borrowed" />
                </td>
                <td className="mono">{borrowedUnits}</td>
              </tr>
              <tr>
                <td>
                  <Stamp value="damaged" />
                </td>
                <td className="mono">{damagedUnits}</td>
              </tr>
              <tr>
                <td>
                  <Stamp value="maintenance" />
                </td>
                <td className="mono">{maintUnits}</td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="mono">
                  <strong>{totalUnits}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-block">
        <h4>Equipment by category</h4>
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item types</th>
                <th>Total units</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.length === 0 ? (
                <tr>
                  <td colSpan="3">No categories yet.</td>
                </tr>
              ) : (
                byCategory.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td className="mono">{c.count}</td>
                    <td className="mono">{c.units}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-block">
        <h4>Currently borrowed ({borrowedNow.length})</h4>
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Qty</th>
                <th>Borrower</th>
                <th>Issued</th>
                <th>Expected return</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {borrowedNow.length === 0 ? (
                <tr>
                  <td colSpan="6">Nothing currently borrowed.</td>
                </tr>
              ) : (
                borrowedNow.map((b) => (
                  <tr key={b.id}>
                    <td>{(eqById(b.equipment_id) || {}).name || '—'}</td>
                    <td className="mono">{b.qty}</td>
                    <td>{b.borrower_name}</td>
                    <td>{fmtDate(b.date_issued)}</td>
                    <td>{fmtDate(b.expected_return)}</td>
                    <td>
                      <Stamp
                        value={borrowDisplayStatus(b)}
                        label={titleCase(borrowDisplayStatus(b))}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-block">
        <h4>Equipment with damaged units ({damagedItems.length})</h4>
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Code</th>
                <th>Damaged units</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {damagedItems.length === 0 ? (
                <tr>
                  <td colSpan="4">No damaged units on record.</td>
                </tr>
              ) : (
                damagedItems.map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td className="mono">{e.code || ''}</td>
                    <td className="mono">{e.qty_damaged}</td>
                    <td>{e.location || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-block">
        <h4>Low-stock consumables ({lowStock.length})</h4>
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Consumable</th>
                <th>Stock</th>
                <th>Reorder level</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    All consumables are above reorder level.
                  </td>
                </tr>
              ) : (
                lowStock.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="mono">
                      {c.stock} {c.unit}
                    </td>
                    <td className="mono">{c.reorder_level}</td>
                    <td>{c.location || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="report-block">
        <h4>Equipment due for / under maintenance ({dueMaintenance.length})</h4>
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Qty</th>
                <th>Issue</th>
                <th>Status</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {dueMaintenance.length === 0 ? (
                <tr>
                  <td colSpan="5">No open maintenance items.</td>
                </tr>
              ) : (
                dueMaintenance.map((m) => (
                  <tr key={m.id}>
                    <td>{(eqById(m.equipment_id) || {}).name || '—'}</td>
                    <td className="mono">{m.qty}</td>
                    <td>{m.issue || ''}</td>
                    <td>
                      <Stamp value={m.status} label={titleCase(m.status)} />
                    </td>
                    <td>{fmtDate(m.scheduled_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
