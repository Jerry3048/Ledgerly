/* =========================================================
   LabLedger — shared modal system
   ========================================================= */

/**
 * Open the shared modal dialog.
 * @param {string} title       - Modal heading text
 * @param {string} bodyHTML    - HTML string for the modal body
 * @param {Array}  footButtons - Array of { label, variant?, onClick } config objects
 */
function openModal(title, bodyHTML, footButtons) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  const foot = $('#modalFoot');
  foot.innerHTML = '';
  footButtons.forEach(cfg => {
    const b = document.createElement('button');
    b.textContent = cfg.label;
    b.className = 'btn' + (cfg.variant ? ' ' + cfg.variant : '');
    b.addEventListener('click', cfg.onClick);
    foot.appendChild(b);
  });
  $('#modalOverlay').classList.add('active');
}

function closeModal() {
  $('#modalOverlay').classList.remove('active');
}

/** Wire up the close button and backdrop click. Call once at startup. */
function initModal() {
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
}

/**
 * Set or update the inline error message inside the active modal.
 * Appends a <p class="form-error"> if one doesn't already exist.
 */
function setFormError(msg) {
  let el = $('#modalBody .form-error');
  if (!el) {
    el = document.createElement('p');
    el.className = 'form-error';
    $('#modalBody').appendChild(el);
  }
  el.textContent = msg;
}
