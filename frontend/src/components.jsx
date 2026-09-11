/* =========================================================
   LabLedger — shared presentational components (React ports
   of js/modal.js helpers + ledger CSS motifs: hole, stamp,
   empty-state, tag-card, alert-row).
   ========================================================= */
import React, { useEffect } from 'react';

/** Brand mark for "Legerly" — ledger-book icon used next to the name. */
export function BrandIcon() {
  return (
    <span className="brand-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 3.5h11A2.5 2.5 0 0 1 18.5 6v13.5a.5.5 0 0 1-.8.4L15 17.6l-2.7 2.3a.5.5 0 0 1-.8-.4V6A2.5 2.5 0 0 0 9 3.5H5z" />
        <path d="M5 3.5v17a.5.5 0 0 0 .8.4L9 18.2l3.2 2.7a.5.5 0 0 0 .8-.4v-1" />
        <path d="M12.5 8h3M12.5 11h3" />
      </svg>
    </span>
  );
}

/** Shared modal shell — .modal-overlay/.modal/.modal-head/.modal-body/.modal-foot
 *  Locks background scroll while open (restored on close, nesting-safe)
 *  and closes on Escape. */
let openModals = 0;

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    // Lock background scroll — count nesting so stacked modals don't
    // re-enable scroll until the last one closes.
    openModals += 1;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) {
        document.body.style.overflow = prevBody;
        document.documentElement.style.overflow = prevHtml;
      }
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        // Keep wheel scrolling inside the overlay — don't leak to the page.
        e.stopPropagation();
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
