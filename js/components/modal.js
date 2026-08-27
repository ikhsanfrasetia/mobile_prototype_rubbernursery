/**
 * components/modal.js — modal & dialog konfirmasi.
 */

const MODAL_ROOT_ID = 'modal-root';

function root() {
  return document.getElementById(MODAL_ROOT_ID);
}

function renderModal({ title, body, footer }) {
  const r = root();
  if (!r) return;
  r.innerHTML = `
    <div class="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-title">${title || ''}</div>
          <button class="modal-close" data-modal-close aria-label="Tutup">×</button>
        </div>
        <div class="modal-body">${body || ''}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>
    </div>
  `;
}

export function closeModal() {
  const r = root();
  if (r) r.innerHTML = '';
}

export function openModal({ title, body, footer, onClose }) {
  renderModal({ title, body, footer });
  const r = root();
  const overlay = r?.querySelector('.modal-overlay');
  const closeBtn = r?.querySelector('[data-modal-close]');

  const close = () => {
    closeModal();
    if (onClose) onClose();
  };

  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

/**
 * Konfirmasi dialog (Promise<boolean>).
 * @param {object} opts { title, message, confirmText, cancelText, danger }
 */
export function confirmDialog({ title = 'Konfirmasi', message = '', confirmText = 'Ya', cancelText = 'Batal', danger = false }) {
  return new Promise((resolve) => {
    const r = root();
    if (!r) return resolve(false);

    renderModal({
      title,
      body: `<p style="color:#555;font-size:0.95rem">${message}</p>`,
      footer: `
        <button class="btn btn-ghost" data-confirm-cancel>${cancelText}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm-ok>${confirmText}</button>
      `
    });

    const overlay = r.querySelector('.modal-overlay');
    const closeBtn = r.querySelector('[data-modal-close]');
    const okBtn = r.querySelector('[data-confirm-ok]');
    const cancelBtn = r.querySelector('[data-confirm-cancel]');

    const done = (val) => {
      closeModal();
      resolve(val);
    };

    okBtn?.addEventListener('click', () => done(true));
    cancelBtn?.addEventListener('click', () => done(false));
    closeBtn?.addEventListener('click', () => done(false));
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) done(false);
    });
  });
}
