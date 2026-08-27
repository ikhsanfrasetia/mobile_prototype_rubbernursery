/**
 * modules/auth/sync.js — Halaman Sinkronisasi (route /sync).
 * Flow: Login → Splash → Sinkronisasi.
 * 3 state: belum sinkron (A), proses sinkronisasi (B), berhasil (C).
 * Divisi diambil dari master existing (divisions). Last sync disimpan di meta.
 */

import { session } from '../../core/session.js';
import { storage, KEYS } from '../../core/storage.js';
import { divisionRepository } from '../../db/repositories.js';
import { setMeta, getMeta } from '../../db/indexeddb.js';
import { toast } from '../../components/toast.js';
import { openDrawer } from '../../components/drawer.js';
import { esc, pad } from '../../core/utils.js';
import { navigate } from '../../core/router.js';

const SYNC_ITEMS = [
  { id: 'kebun', name: 'Kebun' },
  { id: 'divisi', name: 'Divisi' },
  { id: 'pekerja', name: 'Pekerja' },
  { id: 'kode-kehadiran', name: 'Kode Kehadiran' },
  { id: 'ketidakhadiran', name: 'Ketidakhadiran' },
  { id: 'jam-kerja', name: 'Jam Kerja' },
  { id: 'ganti-hari', name: 'Ganti Hari' },
  { id: 'aset', name: 'Aset' },
  { id: 'wajah', name: 'Wajah' },
  { id: 'cuti-pekerja', name: 'Cuti Pekerja' },
  { id: 'mangkir', name: 'Mangkir' },
  { id: 'material', name: 'Material' },
  { id: 'proyek', name: 'Proyek' },
  { id: 'program-pembibitan', name: 'Program Pembibitan' },
  { id: 'kebun-entres', name: 'Kebun Entres' },
  { id: 'batch', name: 'Batch' },
  { id: 'bedengan', name: 'Bedengan' }
];

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatSyncTimestamp(d) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} WIB`;
}

function saveSyncDivision(divisionId, divisionName) {
  const s = session.get();
  if (s) {
    storage.set(KEYS.SESSION, { ...s, divisionId, divisionName });
  }
}

export async function renderSync() {
  const app = document.getElementById('app');
  const divisions = await divisionRepository.list();

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
          <select class="field-control" id="sync-division">
            ${divisions.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}
          </select>
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

  const divisionSelect = app.querySelector('#sync-division');
  const listEl = app.querySelector('#sync-list');
  const noticeEl = app.querySelector('#sync-notice');
  const noticeTimeEl = app.querySelector('#sync-notice-time');
  const nowBtn = app.querySelector('#sync-now');

  // Preselect divisi: dari session, lalu lastSync, lalu opsi pertama.
  const me = session.get();
  let lastSync = null;
  try {
    lastSync = await getMeta('lastSync');
  } catch {
    lastSync = null;
  }
  const preferred = (me && me.divisionId) || (lastSync && lastSync.divisionId);
  if (preferred && divisions.some((d) => d.id === preferred)) {
    divisionSelect.value = preferred;
  }

  let phase = 'idle'; // 'idle' | 'syncing' | 'done'
  const doneIds = new Set();
  const GLYPH = { warn: '!', pending: '○', ok: '✓' };

  const itemStatus = (id) => {
    if (phase === 'done') return 'ok';
    if (phase === 'syncing') return doneIds.has(id) ? 'ok' : 'pending';
    return 'warn';
  };

  const render = () => {
    listEl.innerHTML = SYNC_ITEMS.map((it) => {
      const s = itemStatus(it.id);
      return `<li class="sync-item" data-id="${it.id}">
        <span class="sync-item-name">${esc(it.name)}</span>
        <span class="sync-status ${s}">${GLYPH[s]}</span>
      </li>`;
    }).join('');
  };

  const runSync = async () => {
    if (phase === 'syncing') return;
    const divisionId = divisionSelect.value;
    const div = divisions.find((d) => d.id === divisionId);
    saveSyncDivision(divisionId, div ? div.name : null);

    phase = 'syncing';
    doneIds.clear();
    noticeEl.hidden = true;
    nowBtn.disabled = true;
    render();

    for (const it of SYNC_ITEMS) {
      await new Promise((r) => setTimeout(r, 180));
      doneIds.add(it.id);
      render();
    }

    phase = 'done';
    const syncedAt = new Date();
    noticeTimeEl.textContent = formatSyncTimestamp(syncedAt);
    noticeEl.hidden = false;
    nowBtn.disabled = false;
    render();

    try {
      await setMeta('lastSync', { divisionId, syncedAt: syncedAt.toISOString(), status: 'done' });
    } catch (err) {
      console.error('[sync] simpan lastSync gagal:', err);
    }
  };

  divisionSelect.addEventListener('change', () => {
    const div = divisions.find((d) => d.id === divisionSelect.value);
    saveSyncDivision(divisionSelect.value, div ? div.name : null);
  });

  app.querySelector('#sync-menu').addEventListener('click', openDrawer);
  app.querySelector('#sync-help').addEventListener('click', () => toast('Pilih divisi kerja untuk sinkronisasi', 'info'));
  app.querySelector('#sync-more').addEventListener('click', () => toast('Sinkronisasi data Sigma Nursery', 'info'));
  nowBtn.addEventListener('click', runSync);
  app.querySelector('#sync-home').addEventListener('click', () => navigate('/home'));

  render();
}
