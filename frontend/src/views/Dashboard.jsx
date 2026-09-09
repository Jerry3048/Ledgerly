/* LabLedger — Dashboard view (port of js/views/dashboard.js) */
import React from 'react';
import { fmtDate, isOverdue, titleCase } from '../api';
import { useApp } from '../store';
import { AlertRow, TagCard } from '../components';

export default function DashboardView() {
  const { me, equipment, consumables, borrows, maintenance, isStaff, eqById } =
    useApp();

  const num = (v) => Number(v) || 0;
  const totalEquip = equipment.reduce((s, e) => s + num(e.qty_total), 0);
  const availableUnits = equipment.reduce(
    (s, e) => s + num(e.qty_available),
    0
  );
  const borrowedUnits = equipment.reduce(
    (s, e) => s + num(e.qty_borrowed),
    0
  );
  const damagedUnits = equipment.reduce((s, e) => s + num(e.qty_damaged), 0);
  const maintUnits = equipment.reduce(
    (s, e) => s + num(e.qty_maintenance),
    0
  );
  const lowStock = consumables.filter(
    (c) => c.stock <= c.reorder_level
  ).length;

  const myBorrows = isStaff
    ? borrows
    : borrows.filter((b) => b.borrower_user_id === me.id);
  const overdue = myBorrows.filter(isOverdue).length;
  const pending = myBorrows.filter((b) => b.status === 'pending').length;
  const borrowedByMe = myBorrows.filter(
    (b) => b.status === 'borrowed'
  ).length;

  const overdueRows = myBorrows.filter(isOverdue);
  const upcoming = myBorrows
    .filter((b) => b.status === 'borrowed' && !isOverdue(b))
    .sort((a, b) =>
      (a.expected_return || '').localeCompare(b.expected_return || '')
    )
    .slice(0, 5);

  const lowRows = consumables.filter((c) => c.stock <= c.reorder_level);
  const maintRows = isStaff
    ? maintenance.filter((m) => m.status !== 'completed')
    : [];

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Overview</span>
          <h2>Dashboard</h2>
        </div>
      </div>

      <div className="tag-grid">
        {isStaff ? (
          <>
            <TagCard value={totalEquip} label="Total equipment units" />
            <TagCard
              value={availableUnits}
              label="Units available now"
              cls="good"
            />
            <TagCard value={borrowedUnits} label="Units currently borrowed" />
            <TagCard
              value={damagedUnits}
              label="Damaged units"
              cls={damagedUnits ? 'bad' : ''}
            />
            <TagCard
              value={maintUnits}
              label="Units under maintenance"
              cls={maintUnits ? 'warn' : ''}
            />
            <TagCard
              value={lowStock}
              label="Low-stock consumables"
              cls={lowStock ? 'warn' : ''}
            />
            <TagCard
              value={overdue}
              label="Overdue returns"
              cls={overdue ? 'bad' : ''}
            />
          </>
        ) : (
          <>
            <TagCard
              value={pending}
              label="My pending requests"
              cls={pending ? 'warn' : ''}
            />
            <TagCard
              value={borrowedByMe}
              label="Currently borrowed by me"
              cls="good"
            />
            <TagCard
              value={overdue}
              label="My overdue returns"
              cls={overdue ? 'bad' : ''}
            />
            <TagCard value={availableUnits} label="Units available lab-wide" />
          </>
        )}
      </div>

      <div className="dash-columns">
        <div className="panel">
          <div className="panel-head">
            <h3>
              {isStaff
                ? 'Overdue & upcoming returns'
                : 'My requests due & overdue'}
            </h3>
          </div>
          <div className="panel-body">
            {overdueRows.length === 0 && upcoming.length === 0 ? (
              <p className="alert-empty">Nothing due or overdue.</p>
            ) : (
              <>
                {overdueRows.map((b) => (
                  <AlertRow key={'o' + b.id} color="red">
                    <strong>{(eqById(b.equipment_id) || {}).name || '—'}</strong>{' '}
                    — {b.borrower_name}, due {fmtDate(b.expected_return)}
                  </AlertRow>
                ))}
                {upcoming.map((b) => (
                  <AlertRow key={'u' + b.id} color="amber">
                    <strong>{(eqById(b.equipment_id) || {}).name || '—'}</strong>{' '}
                    — {b.borrower_name}, due {fmtDate(b.expected_return)}
                  </AlertRow>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3>Stock &amp; maintenance alerts</h3>
          </div>
          <div className="panel-body">
            {lowRows.length === 0 && maintRows.length === 0 ? (
              <p className="alert-empty">No stock or maintenance alerts.</p>
            ) : (
              <>
                {lowRows.map((c) => (
                  <AlertRow key={'c' + c.id} color="amber">
                    <strong>{c.name}</strong> — {c.stock} {c.unit}(s) left,
                    reorder at {c.reorder_level}
                  </AlertRow>
                ))}
                {maintRows.map((m) => (
                  <AlertRow key={'m' + m.id} color="red">
                    <strong>{(eqById(m.equipment_id) || {}).name || '—'}</strong>{' '}
                    — {m.qty} unit(s), {titleCase(m.status)}
                    {m.scheduled_date
                      ? ', scheduled ' + fmtDate(m.scheduled_date)
                      : ''}
                  </AlertRow>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
