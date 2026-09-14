/**
 * modules/auth/sync.js — Halaman Sinkronisasi (route /sync).
 * Flow: Login → Splash → Sinkronisasi.
 * 3 state: belum sinkron (A), proses sinkronisasi (B), berhasil (C).
 *
 * Integrasi Compact Dropdown Multiselect Scoped Division Resolver & Sync Engine (TASK-SYNC-FIX-03):
 * 1. UI Ringkas: Mengembalikan kontrol "Pilih Divisi Kerja" ke desain dropdown ringkas (collapsed by default).
 * 2. DEFAULT SELECTION: Divisi Role Aktif dari session otomatis terpilih saat halaman dibuka.
 * 3. PERSISTENCE MERGE: Selection tersimpan tidak menghilangkan divisi role aktif (active division merged).
 * 4. MULTISELECT LOGIC: Mendukung pemilihan multiple divisi saat dropdown dibuka.
 * 5. ZERO SESSION POLLUTION: Pilihan multiselect sync TIDAK BOLEH mengubah session.divisionId atau session.estateId.
 * 6. PENGURUS MULTI-ESTATE: Pengurus dapat memilih multiple divisi lintas kebun (grouped by estate saat dropdown dibuka).
 * 7. SCOPED ACCESS: Mantri/ASB/Askep hanya dapat memilih divisi di kebun aktifnya.
 */

import { session } from '../../core/session.js';
import { resolveUserContext } from '../../core/user-context.js';
import {
  resolveSyncScope,
  defaultSyncService,
  SyncPersistenceAdapter,
  SYNC_DATASET_CONFIG,
  SYNC_STATUS
} from '../../core/sync-engine.js';
import { setMeta, getMeta } from '../../db/indexeddb.js';
import { toast } from '../../components/toast.js';
import { openDrawer } from '../../components/drawer.js';
import { esc, pad } from '../../core/utils.js';
import { navigate } from '../../core/router.js';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatSyncTimestamp(d) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} WIB`;
}

export async function renderSync() {
  const app = document.getElementById('app');

  // 1. Ambil active user context (tanpa mutasi session)
  const rawUser = session.get();
  const user = resolveUserContext(rawUser);
  const userId = user.userId || user.id || 'USR-001';

  // 2. Ambil selection persisten sebelumnya (user-isolated)
  let savedSelection = SyncPersistenceAdapter.getSelection(userId);
  if (!savedSelection || savedSelection.length === 0) {
    try {
      if (typeof indexedDB !== 'undefined') {
        const lastSync = await getMeta('lastSync');
        if (lastSync && lastSync.userId === userId && Array.isArray(lastSync.divisionIds)) {
          savedSelection = lastSync.divisionIds;
        }
      }
    } catch {
      savedSelection = null;
    }
  }

  // 3. Resolve sync scope berbasis engine
  const scope = resolveSyncScope(user);

  // 4. Filter divisi operasional valid (tanpa aggregate placeholder DIV-APM)
  const availableDivisions = (scope.allowedDivisions || []).filter(
    (d) => d.id !== 'DIV-APM' && !d.name.includes('All Division')
  );

  // 5. Tentukan Default Division Role Aktif
  let activeRoleDivId = null;
  if (availableDivisions.some((d) => d.id === user.divisionId)) {
    activeRoleDivId = user.divisionId;
  } else {
    // Jika session.divisionId berupa aggregate seperti DIV-TBS-EST / DIV-APM-EST, cari divisi utama di kebun aktif
    const homeDiv = availableDivisions.find((d) => d.estateId === (user.estateId || scope.estateId));
    if (homeDiv) {
      activeRoleDivId = homeDiv.id;
    } else if (availableDivisions.length > 0) {
      activeRoleDivId = availableDivisions[0].id;
    }
  }

  // 6. State lokal: Set of selected division IDs (ZERO SESSION POLLUTION)
  // Aturan TASK-SYNC-FIX-03: Divisi role aktif SELALU ada di default selection & persisted selection di-merge
  const selectedDivisionIds = new Set();
  if (activeRoleDivId) {
    selectedDivisionIds.add(activeRoleDivId);
  }
  if (Array.isArray(savedSelection)) {
    savedSelection.forEach((id) => {
      if (availableDivisions.some((d) => d.id === id)) {
        selectedDivisionIds.add(id);
      }
    });
  }
  if (selectedDivisionIds.size === 0 && availableDivisions.length > 0) {
    selectedDivisionIds.add(availableDivisions[0].id);
  }

  // 7. Grouping divisi berdasarkan Estate
  const divisionsByEstate = new Map();
  availableDivisions.forEach((d) => {
    const estateName = d.estateName || (d.estateId === 'EST-APM' ? 'Aek Pamingke' : 'Tanah Besih');
    if (!divisionsByEstate.has(estateName)) {
      divisionsByEstate.set(estateName, []);
    }
    divisionsByEstate.get(estateName).push(d);
  });

  // Helper untuk mendapatkan teks label dropdown
  const getDropdownLabelText = () => {
    if (selectedDivisionIds.size === 1) {
      const selectedId = Array.from(selectedDivisionIds)[0];
      const div = availableDivisions.find((d) => d.id === selectedId);
      return div ? div.name : selectedId;
    }
    if (selectedDivisionIds.size > 1) {
      return `${selectedDivisionIds.size} Divisi Terpilih`;
    }
    return 'Pilih Divisi Kerja';
  };

  const renderDropdownMenuItems = () => {
    let html = '';
    for (const [estateName, divs] of divisionsByEstate.entries()) {
      if (scope.allowCrossEstate || divisionsByEstate.size > 1) {
        html += `<div class="sync-dropdown-estate-header">🏛️ ${esc(estateName)}</div>`;
      }
      for (const d of divs) {
        const isChecked = selectedDivisionIds.has(d.id);
        html += `
          <label class="sync-dropdown-item" for="sync-cb-${esc(d.id)}">
            <input
              type="checkbox"
              class="sync-dropdown-checkbox"
              id="sync-cb-${esc(d.id)}"
              name="sync-division-cb"
              value="${esc(d.id)}"
              ${isChecked ? 'checked' : ''}
            />
            <div class="sync-dropdown-item-text">
              <span class="sync-dropdown-item-name">${esc(d.name)}</span>
              <span class="sync-dropdown-item-sub">${esc(d.id)} · ${esc(estateName)}</span>
            </div>
          </label>
        `;
      }
    }
    return html;
  };

  app.innerHTML = `
    <div class="page sync-page">
      <header class="sync-header">
        <button class="sync-header-btn" id="sync-menu" type="button" aria-label="Menu">☰</button>
        <h1 class="sync-header-title">Sinkronisasi</h1>
        <button class="sync-header-more" id="sync-more" type="button">Selengkapnya</button>
      </header>

      <div class="sync-body">
        <section class="sync-section">
          <div class="sync-section-head">
            <span class="sync-section-title">Pilih Divisi Kerja</span>
            <button class="sync-help-btn" id="sync-help" type="button" aria-label="Bantuan">?</button>
          </div>

          <div class="sync-dropdown-wrap" id="sync-dropdown-wrap">
            <button
              type="button"
              class="field-control sync-dropdown-trigger"
              id="sync-dropdown-trigger"
              aria-haspopup="listbox"
              aria-expanded="false"
            >
              <span class="sync-dropdown-label" id="sync-dropdown-label">${esc(getDropdownLabelText())}</span>
              <span class="sync-dropdown-arrow" id="sync-dropdown-arrow">▼</span>
            </button>
            <div class="sync-dropdown-menu" id="sync-dropdown-menu" hidden>
              ${renderDropdownMenuItems()}
            </div>
          </div>
        </section>

        <section class="sync-section">
          <div class="sync-section-head">
            <span class="sync-section-title">Sinkronisasi Data</span>
          </div>
          <div class="sync-notice" id="sync-notice" hidden>
            <div class="sync-notice-title">✓ Sinkronisasi Berhasil</div>
            <div class="sync-notice-time" id="sync-notice-time"></div>
          </div>
          <div class="sync-list-card">
            <ul class="sync-list" id="sync-list"></ul>
          </div>
        </section>
      </div>

      <div class="sync-bottom">
        <button class="btn btn-primary btn-block" id="sync-now" type="button">Sinkronisasi</button>
        <button class="btn btn-outline btn-block" id="sync-home" type="button">Beranda</button>
      </div>
    </div>
  `;

  const dropdownWrapEl = app.querySelector('#sync-dropdown-wrap');
  const dropdownTriggerEl = app.querySelector('#sync-dropdown-trigger');
  const dropdownLabelEl = app.querySelector('#sync-dropdown-label');
  const dropdownArrowEl = app.querySelector('#sync-dropdown-arrow');
  const dropdownMenuEl = app.querySelector('#sync-dropdown-menu');
  const listEl = app.querySelector('#sync-list');
  const noticeEl = app.querySelector('#sync-notice');
  const noticeTimeEl = app.querySelector('#sync-notice-time');
  const nowBtn = app.querySelector('#sync-now');

  // Toggle Dropdown Menu (Open / Close)
  const toggleDropdown = (open) => {
    const isCurrentlyOpen = !dropdownMenuEl.hidden;
    const shouldOpen = typeof open === 'boolean' ? open : !isCurrentlyOpen;
    dropdownMenuEl.hidden = !shouldOpen;
    dropdownTriggerEl.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    dropdownArrowEl.textContent = shouldOpen ? '▲' : '▼';
  };

  dropdownTriggerEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Tutup dropdown jika user klik di luar dropdown wrap
  const handleOutsideClick = (e) => {
    if (dropdownWrapEl && !dropdownWrapEl.contains(e.target)) {
      toggleDropdown(false);
    }
  };
  document.addEventListener('click', handleOutsideClick);

  const updateSelectionState = () => {
    dropdownLabelEl.textContent = getDropdownLabelText();
    SyncPersistenceAdapter.saveSelection(userId, Array.from(selectedDivisionIds));
    nowBtn.disabled = selectedDivisionIds.size === 0 || phase === 'syncing';
  };

  // Event handler untuk setiap checkbox divisi di dalam dropdown
  const attachCheckboxListeners = () => {
    const checkboxes = app.querySelectorAll('input[name="sync-division-cb"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedDivisionIds.add(cb.value);
        } else {
          selectedDivisionIds.delete(cb.value);
        }
        updateSelectionState();
      });
    });
  };
  attachCheckboxListeners();

  let phase = 'idle'; // 'idle' | 'syncing' | 'done'
  const doneIds = new Set();
  const GLYPH = { warn: '!', pending: '○', ok: '✓' };

  const itemStatus = (key) => {
    if (phase === 'done') return 'ok';
    if (phase === 'syncing') return doneIds.has(key) ? 'ok' : 'pending';
    return 'warn';
  };

  const renderList = () => {
    listEl.innerHTML = SYNC_DATASET_CONFIG.map((ds) => {
      const s = itemStatus(ds.key);
      return `<li class="sync-item" data-id="${ds.key}">
        <span class="sync-item-name">${esc(ds.label)}</span>
        <span class="sync-status ${s}">${GLYPH[s]}</span>
      </li>`;
    }).join('');
  };

  const runSync = async () => {
    if (phase === 'syncing') return;

    if (selectedDivisionIds.size === 0) {
      toast('Pilih minimal 1 divisi kerja untuk sinkronisasi.', 'error');
      return;
    }

    const divisionIdsArray = Array.from(selectedDivisionIds);

    // Pastikan dropdown tertutup saat sync dimulai
    toggleDropdown(false);

    phase = 'syncing';
    doneIds.clear();
    noticeEl.hidden = true;
    nowBtn.disabled = true;
    renderList();

    try {
      const result = await defaultSyncService.syncAllDatasets(
        user,
        divisionIdsArray,
        (progress) => {
          doneIds.add(progress.datasetKey);
          renderList();
        }
      );

      phase = 'done';
      const syncedAt = result.syncedAt ? new Date(result.syncedAt) : new Date();
      noticeTimeEl.textContent = formatSyncTimestamp(syncedAt);
      noticeEl.hidden = false;
    } catch (err) {
      console.error('[sync] Eksekusi sinkronisasi gagal:', err);
      toast('Sinkronisasi gagal: ' + (err.message || 'Terjadi kesalahan.'), 'error');
      phase = 'idle';
    } finally {
      nowBtn.disabled = selectedDivisionIds.size === 0;
      renderList();
    }
  };

  app.querySelector('#sync-menu')?.addEventListener('click', openDrawer);
  app.querySelector('#sync-help')?.addEventListener('click', () => {
    toast(
      scope.allowCrossEstate
        ? 'Pilih satu atau lebih divisi kerja (termasuk lintas kebun) untuk disinkronkan.'
        : 'Pilih satu atau lebih divisi kerja dalam kebun aktif Anda untuk disinkronkan.',
      'info'
    );
  });
  app.querySelector('#sync-more')?.addEventListener('click', () => toast('Sinkronisasi data Sigma Nursery', 'info'));
  nowBtn?.addEventListener('click', runSync);
  app.querySelector('#sync-home')?.addEventListener('click', () => navigate('/home'));

  renderList();
}
