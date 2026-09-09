/* =========================================================
   LabLedger — shared presentational components (React ports
   of js/modal.js helpers + ledger CSS motifs: hole, stamp,
   empty-state, tag-card, alert-row).
   ========================================================= */
import React from 'react';

/** Shared modal shell — .modal-overlay/.modal/.modal-head/.modal-body/.modal-foot */
export function Modal({ title, onClose, children, footer }) {
  return (
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Empty ledger state (port of emptyState() in js/main.js). */
export function EmptyState({ title, sub }) {
  return (
    <div className="empty-state">
      <span className="hole"></span>
      <h4>{title}</h4>
      <p>{sub}</p>
    </div>
  );
}

/** Rubber-stamp status badge. */
export function Stamp({ value, label }) {
  return <span className={'stamp ' + value}>{label || value}</span>;
}

/** Hanging-tag stat card for the dashboard. */
export function TagCard({ value, label, cls }) {
  return (
    <div className={'tag-card ' + (cls || '')}>
      <span className="hole"></span>
      <div>
        <div className="tag-value">{value}</div>
        <span className="tag-label">{label}</span>
      </div>
    </div>
  );
}

/** Dashboard alert row with a coloured dot. */
export function AlertRow({ color, children }) {
  return (
    <div className="alert-row">
      <span className={'alert-dot ' + color}></span>
      <span>{children}</span>
    </div>
  );
}
