/**
 * modules/review/review-workspace.js — Prototype Review & Catatan Perbaikan Workspace.
 * Mengelola feedback, marker layer responsif (persentase relatif), filter, dan CRUD status.
 */

import { getCurrent } from '../../core/router.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc } from '../../core/utils.js';

const STORAGE_KEY = 'sigma_feedback_notes';

const INITIAL_NOTES = [
  {
    id: 'FB-001',
    number: 1,
    createdAt: '26/08/2026',
    author: 'Budi Santoso',
    creatorRole: 'Customer / User Field',
    page: '/login',
    pageTitle: 'Login',
    description: 'Logo PT SOCFINDO dan tombol masuk proporsinya sudah bagus.',
    status: 'Baru',
    marker: { x: 50.0, y: 19.5 }
  },
  {
    id: 'FB-002',
    number: 2,
    createdAt: '26/08/2026',
    author: 'Ahmad Rivai',
    creatorRole: 'Asisten Lapangan',
    page: '/sync',
    pageTitle: 'Sinkronisasi',
    description: 'Pilihan divisi kerja dan indikator centang sudah rapi.',
    status: 'Dalam Proses',
    marker: { x: 50.0, y: 18.0 }
  },
  {
    id: 'FB-003',
    number: 3,
    createdAt: '26/08/2026',
    author: 'Wagiman',
    creatorRole: 'Mandor Semprot',
    page: '/home',
    pageTitle: 'Beranda',
    description: 'Menu 3x3 Beranda mudah diakses dan teks tidak terpotong.',
    status: 'Selesai',
    marker: { x: 50.0, y: 22.0 }
  }
];

let notes = [];
let isReviewMode = false;
let isAllMarkersHidden = false;
let selectedNoteId = null;
let searchQuery = '';
let filterStatus = 'ALL';
let filterPage = 'ALL';

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      notes = JSON.parse(raw);
    } else {
      notes = [...INITIAL_NOTES];
      saveNotes();
    }
  } catch (err) {
    console.warn('[review] failed to load notes:', err);
    notes = [...INITIAL_NOTES];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.warn('[review] failed to save notes:', err);
  }
}

/** Inisialisasi Review Workspace */
export function initReviewWorkspace() {
  loadNotes();
  renderReviewPanel();
  setupMarkerLayer();
  updateMarkers();

  // Dengarkan perubahan hash route agar marker dan filter tersinkron
  window.addEventListener('hashchange', () => {
    updateMarkers();
  });
}

/** Setup layer marker di atas layar prototype */
function setupMarkerLayer() {
  const markerLayer = document.getElementById('marker-layer');
  if (!markerLayer) return;

  // Tangkap klik pada prototype untuk menaruh marker saat Review Mode aktif
  markerLayer.addEventListener('click', (e) => {
    if (!isReviewMode) return;

    const rect = markerLayer.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Hitung koordinat persentase relatif (0% - 100%) terhadap frame prototype
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    openAddFeedbackModal({ x: parseFloat(xPct.toFixed(1)), y: parseFloat(yPct.toFixed(1)) });
  });
}

/** Render marker pins pada layar prototype */
export function updateMarkers() {
  const markerLayer = document.getElementById('marker-layer');
  if (!markerLayer) return;

  const currentRoute = (getCurrent().route || '/login').split('?')[0];

  markerLayer.innerHTML = '';
  markerLayer.classList.toggle('is-review-mode', isReviewMode);

  if (isReviewMode) {
    const banner = document.createElement('div');
    banner.className = 'marker-pin-banner';
    banner.innerHTML = '📍 Klik pada layar untuk menaruh pin catatan';
    markerLayer.appendChild(banner);
  }

  // Jika semua marker disembunyikan, hentikan rendering pin
  if (isAllMarkersHidden) return;

  // Tampilkan marker yang sesuai halaman aktif (atau semua marker) dan tidak di-hide
  const visibleNotes = notes.filter(
    (n) => (!n.page || n.page === currentRoute || filterPage === n.page) && !n.hidden
  );

  visibleNotes.forEach((n) => {
    if (!n.marker || typeof n.marker.x !== 'number') return;

    const pin = document.createElement('div');
    const statusClass = n.status === 'Dalam Proses' ? 'status-proses' : n.status === 'Selesai' ? 'status-selesai' : 'status-baru';
    const isSelected = selectedNoteId === n.id;

    pin.className = `marker-pin ${statusClass} ${isSelected ? 'is-selected' : ''}`;
    pin.style.left = `${n.marker.x}%`;
    pin.style.top = `${n.marker.y}%`;
    pin.title = `#${String(n.number).padStart(2, '0')} - ${n.author}: ${n.description}`;

    pin.innerHTML = `
      <div class="marker-badge">#${n.number}</div>
      ${isSelected ? '<div class="marker-ripple"></div>' : ''}
    `;

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNote(n.id, true);
    });

    markerLayer.appendChild(pin);
  });
}

/** Highlight dan buka detail feedback */
function selectNote(noteId, openDetail = false) {
  selectedNoteId = noteId;
  updateMarkers();
  renderReviewPanel();

  const note = notes.find((n) => n.id === noteId);
  if (note && openDetail) {
    openFeedbackDetailModal(note);
  }
}

/** Render Panel Review (Desktop Table & Mobile Cards) */
export function renderReviewPanel() {
  const container = document.getElementById('review-panel-container');
  if (!container) return;

  // Filter notes
  const filtered = notes.filter((n) => {
    const matchSearch =
      !searchQuery ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.creatorRole && n.creatorRole.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(n.number).includes(searchQuery);

    const matchStatus = filterStatus === 'ALL' || n.status === filterStatus;
    const matchPage = filterPage === 'ALL' || n.page === filterPage;

    return matchSearch && matchStatus && matchPage;
  });

  const countBaru = notes.filter((n) => n.status === 'Baru').length;
  const countProses = notes.filter((n) => n.status === 'Dalam Proses').length;
  const countSelesai = notes.filter((n) => n.status === 'Selesai').length;

  const currentRoute = (getCurrent().route || '/login').split('?')[0];

  container.innerHTML = `
    <div class="review-panel-head">
      <div class="review-title-group">
        <h2>Catatan Perbaikan</h2>
        <p>Prototype Review & Quality Assurance Panel</p>
      </div>
      <div class="review-actions-group">
        <button class="btn-toggle-all-markers ${isAllMarkersHidden ? 'is-hidden-mode' : ''}" id="btn-toggle-all-markers" type="button" title="Sembunyikan / Tampilkan Semua Pin Marker">
          ${isAllMarkersHidden ? '🙈 Semua Pin: Tersembunyi' : '👁️ Semua Pin: Tampil'}
        </button>
        <button class="btn-toggle-review-mode ${isReviewMode ? 'is-active' : ''}" id="btn-toggle-review" type="button">
          ${isReviewMode ? '🔴 Matikan Mode Pin' : '📍 Mode Pin Marker'}
        </button>
        <button class="btn-add-feedback" id="btn-add-feedback" type="button">
          <span>+</span> Tambah Catatan
        </button>
      </div>
    </div>

    <div class="review-filter-bar">
      <div class="filter-search-wrap">
        <span class="filter-search-icon">🔍</span>
        <input class="filter-search-input" id="review-search" type="text" placeholder="Cari catatan / pembuat..." value="${esc(searchQuery)}" />
      </div>
      <select class="filter-select" id="review-filter-status">
        <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
        <option value="Baru" ${filterStatus === 'Baru' ? 'selected' : ''}>Status: Baru</option>
        <option value="Dalam Proses" ${filterStatus === 'Dalam Proses' ? 'selected' : ''}>Status: Dalam Proses</option>
        <option value="Selesai" ${filterStatus === 'Selesai' ? 'selected' : ''}>Status: Selesai</option>
      </select>
      <select class="filter-select" id="review-filter-page">
        <option value="ALL" ${filterPage === 'ALL' ? 'selected' : ''}>Semua Halaman</option>
        <option value="/login" ${filterPage === '/login' ? 'selected' : ''}>Halaman: Login</option>
        <option value="/splash" ${filterPage === '/splash' ? 'selected' : ''}>Halaman: Splash</option>
        <option value="/sync" ${filterPage === '/sync' ? 'selected' : ''}>Halaman: Sinkronisasi</option>
        <option value="/home" ${filterPage === '/home' ? 'selected' : ''}>Halaman: Beranda</option>
      </select>
    </div>

    <div class="review-stats-summary">
      <span>Total: <strong>${notes.length} Catatan</strong></span>
      <span class="stat-pill baru">Baru: ${countBaru}</span>
      <span class="stat-pill proses">Proses: ${countProses}</span>
      <span class="stat-pill selesai">Selesai: ${countSelesai}</span>
    </div>

    <!-- Desktop & Tablet Table (Horizontal scroll container) -->
    <div class="review-table-container">
      <table class="review-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Pembuat</th>
            <th>Halaman</th>
            <th>Deskripsi</th>
            <th>Status</th>
            <th>Dibuat Oleh</th>
            <th style="text-align:center;">Marker</th>
            <th style="text-align:center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${
            filtered.length === 0
              ? '<tr><td colspan="9" class="review-empty-state">Tidak ada catatan perbaikan yang cocok dengan filter.</td></tr>'
              : filtered
                  .map(
                    (n) => `
            <tr class="${selectedNoteId === n.id ? 'is-selected' : ''}" data-id="${n.id}">
              <td style="font-weight:800; color:#116834;">#${String(n.number).padStart(2, '0')}</td>
              <td style="white-space:nowrap;">${esc(n.createdAt)}</td>
              <td style="font-weight:700; color:#111;">${esc(n.author)}</td>
              <td><span class="badge" style="background:#f1f5f9; color:#334155; font-size:0.75rem;">${esc(n.pageTitle || n.page || '-')}</span></td>
              <td style="max-width:280px;">${esc(n.description)}</td>
              <td>
                <span class="table-status-badge ${
                  n.status === 'Dalam Proses' ? 'status-proses' : n.status === 'Selesai' ? 'status-selesai' : 'status-baru'
                }">${esc(n.status)}</span>
              </td>
              <td style="color:#64748b; font-size:0.82rem;">${esc(n.creatorRole || 'Customer')}</td>
              <td style="text-align:center;">
                <button class="btn-table-action btn-toggle-marker-visibility ${n.hidden ? 'is-hidden' : ''}" data-id="${n.id}" type="button" title="${n.hidden ? 'Tampilkan Pin Marker di Layar' : 'Sembunyikan Pin Marker dari Layar'}">
                  ${n.hidden ? '🙈 Sembunyi' : '👁️ Tampil'}
                </button>
              </td>
              <td style="text-align:center;">
                <div class="table-action-btns">
                  <button class="btn-table-action btn-view-pin" data-id="${n.id}" type="button" title="Lihat Pin">📍 Pin</button>
                  <button class="btn-table-action btn-edit-status" data-id="${n.id}" type="button" title="Ubah Status">✏️ Status</button>
                  <button class="btn-table-action delete btn-delete-note" data-id="${n.id}" type="button" title="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>

    <!-- Mobile Card List (< 768px) -->
    <div class="review-mobile-list">
      ${
        filtered.length === 0
          ? '<div class="review-empty-state">Tidak ada catatan perbaikan.</div>'
          : filtered
              .map(
                (n) => `
        <div class="feedback-card-item ${selectedNoteId === n.id ? 'is-selected' : ''}" data-id="${n.id}">
          <div class="feedback-card-head">
            <span class="feedback-card-no">#${String(n.number).padStart(2, '0')}</span>
            <span class="table-status-badge ${
              n.status === 'Dalam Proses' ? 'status-proses' : n.status === 'Selesai' ? 'status-selesai' : 'status-baru'
            }">${esc(n.status)}</span>
          </div>
          <div class="feedback-card-date">📅 ${esc(n.createdAt)} &bull; ${esc(n.pageTitle || n.page || '-')}</div>
          <div class="feedback-card-author">👤 ${esc(n.author)}</div>
          <div class="feedback-card-desc">${esc(n.description)}</div>
          <div class="feedback-card-footer">
            <span>Dibuat Oleh: <strong>${esc(n.creatorRole || 'Customer')}</strong></span>
            <div style="display:flex; align-items:center; gap:6px;">
              <button class="btn-table-action btn-toggle-marker-visibility ${n.hidden ? 'is-hidden' : ''}" data-id="${n.id}" type="button" title="${n.hidden ? 'Tampilkan Pin Marker' : 'Sembunyikan Pin Marker'}">
                ${n.hidden ? '🙈 Sembunyi' : '👁️ Tampil'}
              </button>
              <button class="btn-table-action btn-edit-status" data-id="${n.id}" type="button">Status</button>
            </div>
          </div>
        </div>
      `
              )
              .join('')
      }
    </div>
  `;

  // Attach Event Listeners
  const btnToggleAll = container.querySelector('#btn-toggle-all-markers');
  btnToggleAll?.addEventListener('click', () => {
    isAllMarkersHidden = !isAllMarkersHidden;
    toast(isAllMarkersHidden ? 'Semua pin marker disembunyikan' : 'Semua pin marker ditampilkan', 'info');
    updateMarkers();
    renderReviewPanel();
  });

  const btnToggle = container.querySelector('#btn-toggle-review');
  btnToggle?.addEventListener('click', () => {
    isReviewMode = !isReviewMode;
    toast(isReviewMode ? 'Mode Pin Aktif: Klik pada layar prototype untuk menaruh catatan' : 'Mode Pin Nonaktif', 'info');
    updateMarkers();
    renderReviewPanel();
  });

  const btnAdd = container.querySelector('#btn-add-feedback');
  btnAdd?.addEventListener('click', () => {
    openAddFeedbackModal();
  });

  const searchInput = container.querySelector('#review-search');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderReviewPanel();
  });

  const statusSelect = container.querySelector('#review-filter-status');
  statusSelect?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    renderReviewPanel();
    updateMarkers();
  });

  const pageSelect = container.querySelector('#review-filter-page');
  pageSelect?.addEventListener('change', (e) => {
    filterPage = e.target.value;
    renderReviewPanel();
    updateMarkers();
  });

  // Table row clicks
  container.querySelectorAll('.review-table tbody tr').forEach((tr) => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.btn-table-action')) return;
      const id = tr.dataset.id;
      if (id) selectNote(id, true);
    });
  });

  // Mobile card clicks
  container.querySelectorAll('.feedback-card-item').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-table-action')) return;
      const id = card.dataset.id;
      if (id) selectNote(id, true);
    });
  });

  // Toggle single marker visibility
  container.querySelectorAll('.btn-toggle-marker-visibility').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      note.hidden = !note.hidden;
      saveNotes();
      toast(`Pin #${note.number} ${note.hidden ? 'disembunyikan' : 'ditampilkan'} di layar`, 'info');
      updateMarkers();
      renderReviewPanel();
    });
  });

  // Pin button
  container.querySelectorAll('.btn-view-pin').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      selectNote(id, false);
      toast(`Pin #${notes.find((n) => n.id === id)?.number} ditandai pada layar`, 'info');
    });
  });

  // Status button
  container.querySelectorAll('.btn-edit-status').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const note = notes.find((n) => n.id === id);
      if (note) openChangeStatusModal(note);
    });
  });

  // Delete button
  container.querySelectorAll('.btn-delete-note').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const note = notes.find((n) => n.id === id);
      if (!note) return;

      openModal({
        title: `Hapus Catatan #${String(note.number).padStart(2, '0')}`,
        body: `<p>Apakah Anda yakin ingin menghapus catatan perbaikan dari <strong>${esc(note.author)}</strong>?</p>`,
        footer: `
          <button class="btn btn-ghost" data-del-cancel>Batal</button>
          <button class="btn btn-danger" data-del-confirm>Hapus Catatan</button>
        `
      });

      const root = document.getElementById('modal-root');
      root.querySelector('[data-del-cancel]')?.addEventListener('click', closeModal);
      root.querySelector('[data-del-confirm]')?.addEventListener('click', () => {
        notes = notes.filter((n) => n.id !== id);
        saveNotes();
        closeModal();
        toast('Catatan berhasil dihapus', 'info');
        renderReviewPanel();
        updateMarkers();
      });
    });
  });
}

/** Modal Tambah Catatan */
function openAddFeedbackModal(markerCoords = null) {
  const currentRoute = (getCurrent().route || '/login').split('?')[0];
  const pageName = currentRoute === '/login' ? 'Login' : currentRoute === '/splash' ? 'Splash' : currentRoute === '/sync' ? 'Sinkronisasi' : 'Beranda';

  const defaultCoords = markerCoords || { x: 50.0, y: 40.0 };

  openModal({
    title: 'Tambah Catatan Perbaikan',
    body: `
      <div class="feedback-form-row">
        <label class="feedback-form-label">Nama Pembuat</label>
        <input class="feedback-form-input" id="input-fb-author" type="text" placeholder="Masukkan nama Anda" value="Budi" />
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Peran / Kategori</label>
        <input class="feedback-form-input" id="input-fb-role" type="text" placeholder="Contoh: Customer, Asisten, QA" value="Customer / Tim Review" />
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Halaman Terkait</label>
        <select class="feedback-form-select" id="input-fb-page">
          <option value="/login" ${currentRoute === '/login' ? 'selected' : ''}>Login</option>
          <option value="/splash" ${currentRoute === '/splash' ? 'selected' : ''}>Splash</option>
          <option value="/sync" ${currentRoute === '/sync' ? 'selected' : ''}>Sinkronisasi</option>
          <option value="/home" ${currentRoute === '/home' ? 'selected' : ''}>Beranda</option>
        </select>
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Deskripsi Catatan / Perbaikan</label>
        <textarea class="feedback-form-textarea" id="input-fb-desc" placeholder="Tuliskan catatan perbaikan atau feedback secara detail..."></textarea>
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Koordinat Pin Marker</label>
        <div class="feedback-marker-coords">
          Posisi relatif: X: <strong>${defaultCoords.x}%</strong>, Y: <strong>${defaultCoords.y}%</strong>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-fb-cancel>Batal</button>
      <button class="btn btn-primary" data-fb-save>Simpan Catatan</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-fb-cancel]')?.addEventListener('click', closeModal);

  root.querySelector('[data-fb-save]')?.addEventListener('click', () => {
    const author = root.querySelector('#input-fb-author')?.value.trim() || 'Reviewer';
    const role = root.querySelector('#input-fb-role')?.value.trim() || 'Customer';
    const page = root.querySelector('#input-fb-page')?.value || currentRoute;
    const desc = root.querySelector('#input-fb-desc')?.value.trim();

    if (!desc) {
      toast('Deskripsi catatan wajib diisi', 'danger');
      root.querySelector('#input-fb-desc')?.focus();
      return;
    }

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const pageTitle = page === '/login' ? 'Login' : page === '/splash' ? 'Splash' : page === '/sync' ? 'Sinkronisasi' : 'Beranda';

    const newNote = {
      id: `FB-${Date.now()}`,
      number: notes.length + 1,
      createdAt: dateStr,
      author,
      creatorRole: role,
      page,
      pageTitle,
      description: desc,
      status: 'Baru',
      marker: defaultCoords
    };

    notes.unshift(newNote);
    saveNotes();
    closeModal();
    isReviewMode = false;
    toast('Catatan perbaikan berhasil disimpan!', 'success');
    renderReviewPanel();
    updateMarkers();
  });
}

/** Modal Detail Feedback */
function openFeedbackDetailModal(note) {
  openModal({
    title: `Detail Catatan #${String(note.number).padStart(2, '0')}`,
    body: `
      <div style="display:flex; flex-direction:column; gap:12px; font-size:0.92rem;">
        <div><strong>Halaman:</strong> ${esc(note.pageTitle || note.page)}</div>
        <div><strong>Tanggal:</strong> ${esc(note.createdAt)}</div>
        <div><strong>Pembuat:</strong> ${esc(note.author)} (${esc(note.creatorRole || 'Customer')})</div>
        <div><strong>Status:</strong> <span class="table-status-badge ${
          note.status === 'Dalam Proses' ? 'status-proses' : note.status === 'Selesai' ? 'status-selesai' : 'status-baru'
        }">${esc(note.status)}</span></div>
        <div><strong>Deskripsi:</strong></div>
        <div style="background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #e2e8f0; line-height:1.45;">
          ${esc(note.description)}
        </div>
        <div style="font-size:0.8rem; color:#64748b;">
          📍 Lokasi Pin Marker: (${note.marker?.x}%, ${note.marker?.y}%)
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-detail-close>Tutup</button>
      <button class="btn btn-outline" data-detail-edit-status>Ubah Status</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-detail-close]')?.addEventListener('click', closeModal);
  root.querySelector('[data-detail-edit-status]')?.addEventListener('click', () => {
    closeModal();
    openChangeStatusModal(note);
  });
}

/** Modal Ganti Status Feedback */
function openChangeStatusModal(note) {
  openModal({
    title: `Ubah Status Catatan #${String(note.number).padStart(2, '0')}`,
    body: `
      <div class="feedback-form-row">
        <label class="feedback-form-label">Pilih Status Baru</label>
        <select class="feedback-form-select" id="select-change-status">
          <option value="Baru" ${note.status === 'Baru' ? 'selected' : ''}>Baru</option>
          <option value="Dalam Proses" ${note.status === 'Dalam Proses' ? 'selected' : ''}>Dalam Proses</option>
          <option value="Selesai" ${note.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
        </select>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-status-cancel>Batal</button>
      <button class="btn btn-primary" data-status-save>Perbarui Status</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-status-cancel]')?.addEventListener('click', closeModal);

  root.querySelector('[data-status-save]')?.addEventListener('click', () => {
    const newStatus = root.querySelector('#select-change-status')?.value;
    if (newStatus) {
      note.status = newStatus;
      saveNotes();
      closeModal();
      toast(`Status catatan #${note.number} diperbarui menjadi ${newStatus}`, 'success');
      renderReviewPanel();
      updateMarkers();
    }
  });
}
