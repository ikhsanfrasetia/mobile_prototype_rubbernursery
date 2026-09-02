/**
 * modules/transactions/transaction-manager.js
 * Manajemen Katalog & Data Transaksi SIGMA Nursery dengan kapabilitas CRUD lengkap.
 * Mendukung 8 Modul Transaksi:
 * 1. Presensi (attendance)
 * 2. Penerimaan (receptions / receipt_transactions)
 * 3. Penyemaian (seedings / seeding_transactions)
 * 4. Okulasi Pokok (buddings / budding_transactions)
 * 5. Pemeriksaan Okulasi (inspections / inspection_transactions)
 * 6. Okulasi Janda (regraftings / regrafting_pool)
 * 7. Penyeleksian / Afkir (selections / selection_transactions)
 * 8. Antrean Sinkronisasi (syncQueue)
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, todayISO, uid } from '../../core/utils.js';
import { openDrawer } from '../../components/drawer.js';
import { toast } from '../../components/toast.js';
import {
  attendanceRepository,
  receptionRepository,
  seedingRepository,
  buddingRepository,
  inspectionRepository,
  selectionRepository,
  syncQueueRepository
} from '../../db/repositories.js';

// Konfigurasi 8 Modul Transaksi
const MODULE_CONFIGS = {
  attendance: {
    id: 'attendance',
    title: 'Presensi',
    subtitle: 'Kehadiran Mandor & Pekerja',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    storageKey: 'attendance_transactions',
    repo: attendanceRepository,
    qtyField: null,
    unit: 'Orang'
  },
  reception: {
    id: 'reception',
    title: 'Penerimaan',
    subtitle: 'Stok Masuk Benih & Bibit',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
    storageKey: 'receipt_transactions',
    repo: receptionRepository,
    qtyField: 'qty',
    unit: 'Pkk'
  },
  seeding: {
    id: 'seeding',
    title: 'Penyemaian',
    subtitle: 'Penanaman & Pembentukan Batch',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22v-9"></path><path d="M12 13c0-4.97-4.03-9-9-9 0 4.97 4.03 9 9 9z"></path><path d="M12 13c0-4.97 4.03-9 9-9 0 4.97-4.03 9-9 9z"></path></svg>`,
    storageKey: 'seeding_transactions',
    repo: seedingRepository,
    qtyField: 'totalDisemai',
    unit: 'Pkk'
  },
  budding: {
    id: 'budding',
    title: 'Okulasi Pokok',
    subtitle: 'Grafting Mata Tunas Unggul',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>`,
    storageKey: 'budding_transactions',
    repo: buddingRepository,
    qtyField: 'jumlah',
    unit: 'Pkk'
  },
  inspection: {
    id: 'inspection',
    title: 'Pemeriksaan',
    subtitle: 'Inspeksi & Evaluasi Keberhasilan',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    storageKey: 'inspection_transactions',
    repo: inspectionRepository,
    qtyField: 'totalDiperiksa',
    unit: 'Pkk'
  },
  regrafting: {
    id: 'regrafting',
    title: 'Okulasi Janda',
    subtitle: 'Regrafting Okulasi Gagal',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`,
    storageKey: 'regrafting_pool',
    repo: buddingRepository,
    qtyField: 'jumlah',
    unit: 'Pkk'
  },
  selection: {
    id: 'selection',
    title: 'Penyeleksian',
    subtitle: 'Afkir & Pengurangan Fisik Stok',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    storageKey: 'selection_transactions',
    repo: selectionRepository,
    qtyField: 'jumlahAfkir',
    unit: 'Pkk'
  },
  syncQueue: {
    id: 'syncQueue',
    title: 'Sinkronisasi',
    subtitle: 'Antrean Transaksi Offline ERP',
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`,
    storageKey: 'sync_queue',
    repo: syncQueueRepository,
    qtyField: null,
    unit: 'Item'
  }
};

let activeTab = 'reception';
let searchQuery = '';

export async function renderTransactionManager() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Wagiman', role: 'MANTRI_TANAMAN', position: 'Mandor Semprot' };

  // Ambil data untuk tab aktif
  const currentConfig = MODULE_CONFIGS[activeTab] || MODULE_CONFIGS.reception;
  let items = await loadModuleData(activeTab);

  // Filter pencarian
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    items = items.filter(item => {
      return JSON.stringify(item).toLowerCase().includes(q);
    });
  }

  // Hitung Metrik Ringkasan
  const totalCount = items.length;
  let totalVolume = 0;
  if (currentConfig.qtyField) {
    totalVolume = items.reduce((sum, it) => sum + (parseInt(it[currentConfig.qtyField] || it.qty || 0) || 0), 0);
  }

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      
      <!-- TOP APP HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #116834; color: #FFFFFF; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="btn-drawer-open" type="button" aria-label="Buka Menu" style="background: transparent; border: none; color: #FFFFFF; cursor: pointer; display: flex; align-items: center; padding: 4px;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div>
            <h1 style="font-size: 1.05rem; font-weight: 700; margin: 0; line-height: 1.2;">Katalog & Data Transaksi</h1>
            <div style="font-size: 0.72rem; opacity: 0.85;">Manajemen Lengkap CRUD (8 Modul)</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-seed-sample" title="Muat Data Sampel Transaksi" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); color: #FFFFFF; font-size: 0.75rem; font-weight: 600; padding: 5px 9px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>Demo Data</span>
          </button>
          <button id="btn-add-transaction" style="background: #FFFFFF; color: #116834; border: none; font-size: 0.75rem; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Tambah</span>
          </button>
        </div>
      </header>

      <!-- TAB MENU HORIZONTAL (8 MODUL) -->
      <nav style="display: flex; overflow-x: auto; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 8px; flex-shrink: 0; scrollbar-width: none;">
        ${Object.values(MODULE_CONFIGS).map(cfg => {
          const isActive = cfg.id === activeTab;
          return `
            <button class="nav-tab-btn" data-tab="${cfg.id}" style="display: flex; align-items: center; gap: 6px; padding: 11px 13px; font-size: 0.8rem; font-weight: ${isActive ? '700' : '500'}; color: ${isActive ? '#116834' : '#64748B'}; background: transparent; border: none; border-bottom: 2.5px solid ${isActive ? '#116834' : 'transparent'}; white-space: nowrap; cursor: pointer; transition: all 0.15s ease;">
              <span style="display: flex; align-items: center;">${cfg.icon}</span>
              <span>${cfg.title}</span>
            </button>
          `;
        }).join('')}
      </nav>

      <!-- SEARCH & METRIC BAR -->
      <div style="background: #FFFFFF; padding: 12px 16px; border-bottom: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="position: relative; flex: 1;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2" fill="none" style="position: absolute; left: 10px; top: 9px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input id="input-search" type="text" placeholder="Cari nomor dokumen, batch, klon, bedengan..." value="${escapeHtml(searchQuery)}" style="width: 100%; box-sizing: border-box; padding: 7px 10px 7px 32px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none; background: #F8FAFC;">
          </div>
          ${searchQuery ? `
            <button id="btn-clear-search" style="padding: 7px 10px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.75rem; color: #475569; cursor: pointer;">Reset</button>
          ` : ''}
        </div>

        <!-- Metric Pills -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <div style="display: inline-flex; align-items: center; gap: 6px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; color: #166534; font-weight: 600;">
            <span>Modul: ${currentConfig.title}</span>
          </div>
          <div style="display: inline-flex; align-items: center; gap: 6px; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; color: #1E40AF; font-weight: 600;">
            <span>Total: ${totalCount} Transaksi</span>
          </div>
          ${currentConfig.qtyField ? `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: #FEF3C7; border: 1px solid #FDE68A; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; color: #92400E; font-weight: 600;">
              <span>Volume: ${totalVolume.toLocaleString('id-ID')} ${currentConfig.unit}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- MAIN LIST CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 14px 16px;">
        ${items.length === 0 ? `
          <div style="text-align: center; padding: 48px 16px; background: #FFFFFF; border-radius: 10px; border: 1px dashed #CBD5E1;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; color: #64748B; margin-bottom: 12px;">
              ${currentConfig.icon}
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1E293B; margin: 0 0 6px;">Belum Ada Data Transaksi</h3>
            <p style="font-size: 0.8rem; color: #64748B; margin: 0 0 16px;">Belum ada catatan pada modul ${currentConfig.title}. Anda dapat menambah transaksi baru atau memuat sampel demo.</p>
            <div style="display: flex; justify-content: center; gap: 8px;">
              <button id="btn-empty-add" style="background: #116834; color: #FFFFFF; border: none; font-size: 0.8rem; font-weight: 600; padding: 7px 14px; border-radius: 6px; cursor: pointer;">
                + Tambah Transaksi
              </button>
              <button id="btn-empty-sample" style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; font-size: 0.8rem; font-weight: 600; padding: 7px 14px; border-radius: 6px; cursor: pointer;">
                Muat Sampel Data
              </button>
            </div>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${items.map((item, index) => renderTransactionCard(item, index, activeTab, currentConfig)).join('')}
          </div>
        `}
      </main>

      <!-- MODAL CONTAINER (Dinamis Form Tambah/Edit/Hapus) -->
      <div id="modal-container"></div>
    </div>
  `;

  // Attach Event Listeners
  attachEvents(items, currentConfig);
}

// Render Satu Kartu Transaksi
function renderTransactionCard(item, index, tab, config) {
  let docNo = item.docNo || item.nomorDokumen || item.id || `TX-${index + 1}`;
  let title = docNo;
  let subtitle = item.program || item.tahapan || config.subtitle;
  let date = item.tanggal || item.date || item.createdAt || todayISO();
  let badgeStatus = item.status || 'SUBMITTED';

  let statusBg = '#F1F5F9';
  let statusColor = '#475569';
  if (['APPROVED', 'VERIFIED', 'COMPLETED', 'HADIR', 'SYNCED'].includes(badgeStatus)) {
    statusBg = '#DCFCE7';
    statusColor = '#15803D';
  } else if (['SUBMITTED', 'UNDER_REVIEW', 'PROCESS', 'IN'].includes(badgeStatus)) {
    statusBg = '#EFF6FF';
    statusColor = '#1D4ED8';
  } else if (['DRAFT', 'PENDING', 'REGRAFTING'].includes(badgeStatus)) {
    statusBg = '#FEF3C7';
    statusColor = '#B45309';
  } else if (['FAILED', 'AFKIR', 'REJECTED', 'MATI'].includes(badgeStatus)) {
    statusBg = '#FEE2E2';
    statusColor = '#B91C1C';
  }

  // Tentukan ringkasan 3 atribut utama per tab
  let col1 = { label: 'Tanggal', val: date };
  let col2 = { label: 'Kategori / Klon', val: item.klon || item.jenis || '-' };
  let col3 = { label: 'Jumlah', val: '-' };

  if (tab === 'attendance') {
    title = item.name || item.userName || 'Pekerja';
    subtitle = item.position || item.role || item.type || 'Pekerja Bibitan';
    col1 = { label: 'Tipe', val: item.type || 'WORKER' };
    col2 = { label: 'Waktu', val: item.time || '-' };
    col3 = { label: 'Status', val: item.status || 'HADIR' };
  } else if (tab === 'reception') {
    col1 = { label: 'Sumber Asal', val: item.sumber || item.tipeAsal || 'Supplier' };
    col2 = { label: 'Klon', val: item.klon || '-' };
    col3 = { label: 'Stok Diterima', val: `${(parseInt(item.qty || 0)).toLocaleString('id-ID')} Pkk` };
  } else if (tab === 'seeding') {
    title = `${docNo} (${item.batchNo || 'Batch-01'})`;
    col1 = { label: 'Bedengan', val: item.bedengan || '-' };
    col2 = { label: 'Klon Rootstock', val: item.klonAwal || item.klon || '-' };
    col3 = { label: 'Bibit Disemai', val: `${(parseInt(item.totalDisemai || item.qty || 0)).toLocaleString('id-ID')} Pkk` };
  } else if (tab === 'budding') {
    title = `${docNo} (${item.batchNo || 'Batch-01'})`;
    col1 = { label: 'Mata Entres', val: item.klonEntres || '-' };
    col2 = { label: 'Rootstock', val: item.klonRootstock || '-' };
    col3 = { label: 'Diokulasi', val: `${(parseInt(item.jumlah || 0)).toLocaleString('id-ID')} Pkk` };
  } else if (tab === 'inspection') {
    title = `${docNo} (Ref: ${item.buddingDocNo || '-'})`;
    col1 = { label: 'Total Periksa', val: `${(parseInt(item.totalDiperiksa || 0)).toLocaleString('id-ID')} Pkk` };
    col2 = { label: 'Hasil Jadi', val: `${(parseInt(item.jumlahJadi || 0)).toLocaleString('id-ID')} Pkk (${item.persenJadi || 0}%)` };
    col3 = { label: 'Gagal / Mati', val: `${(parseInt(item.jumlahGagal || 0)).toLocaleString('id-ID')} Pkk` };
  } else if (tab === 'regrafting') {
    title = `${docNo} (${item.batchNo || 'Batch-01'})`;
    col1 = { label: 'Bedengan', val: item.bedengan || '-' };
    col2 = { label: 'Klon Entres', val: item.klonEntres || '-' };
    col3 = { label: 'Siap Regraft', val: `${(parseInt(item.jumlah || 0)).toLocaleString('id-ID')} Pkk` };
  } else if (tab === 'selection') {
    title = `${docNo} (${item.batchNo || '-'})`;
    col1 = { label: 'Alasan', val: item.alasan || 'Tidak Berhasil' };
    col2 = { label: 'Klon', val: item.klon || '-' };
    col3 = { label: 'Diafkir (-OUT)', val: `(${parseInt(item.jumlahAfkir || 0).toLocaleString('id-ID')}) Pkk` };
  } else if (tab === 'syncQueue') {
    title = `${item.id || `SYNC-${index + 1}`} (${item.entity || 'receptions'})`;
    col1 = { label: 'Aksi', val: item.action || 'CREATE' };
    col2 = { label: 'Ref Record', val: item.recordId || '-' };
    col3 = { label: 'Status Sync', val: item.status || 'PENDING' };
  }

  return `
    <div class="tx-card" style="background: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: transform 0.1s ease;">
      <!-- Header Row -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
        <div>
          <div style="font-size: 0.88rem; font-weight: 700; color: #0F172A; line-height: 1.3;">${escapeHtml(title)}</div>
          <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(subtitle)}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; font-size: 0.7rem; font-weight: 700; background: ${statusBg}; color: ${statusColor}; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
            ${escapeHtml(badgeStatus)}
          </span>
        </div>
      </div>

      <!-- Detail Grid (3 Kolom) -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; border: 1px solid #EDF2F7; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px;">
        <div>
          <div style="font-size: 0.68rem; color: #64748B; margin-bottom: 2px;">${col1.label}</div>
          <div style="font-size: 0.77rem; font-weight: 600; color: #1E293B; word-break: break-word;">${escapeHtml(String(col1.val))}</div>
        </div>
        <div>
          <div style="font-size: 0.68rem; color: #64748B; margin-bottom: 2px;">${col2.label}</div>
          <div style="font-size: 0.77rem; font-weight: 600; color: #1E293B; word-break: break-word;">${escapeHtml(String(col2.val))}</div>
        </div>
        <div>
          <div style="font-size: 0.68rem; color: #64748B; margin-bottom: 2px;">${col3.label}</div>
          <div style="font-size: 0.77rem; font-weight: 700; color: #116834; word-break: break-word;">${escapeHtml(String(col3.val))}</div>
        </div>
      </div>

      <!-- Action Buttons Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed #E2E8F0; padding-top: 8px;">
        <div style="font-size: 0.7rem; color: #94A3B8;">
          Ref #${index + 1} &bull; ${escapeHtml(date)}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button class="btn-action-view" data-index="${index}" title="Detail Transaksi" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; font-size: 0.72rem; font-weight: 600; padding: 4px 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Detail</span>
          </button>
          <button class="btn-action-edit" data-index="${index}" title="Edit Data" style="background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 0.72rem; font-weight: 600; padding: 4px 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            <span>Edit</span>
          </button>
          <button class="btn-action-delete" data-index="${index}" title="Hapus Data" style="background: #FEE2E2; border: 1px solid #FECACA; color: #DC2626; font-size: 0.72rem; font-weight: 600; padding: 4px 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Attach Event Listeners pada Halaman
function attachEvents(items, config) {
  // Drawer
  document.getElementById('btn-drawer-open')?.addEventListener('click', () => openDrawer());

  // Tabs Nav
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      searchQuery = '';
      renderTransactionManager();
    });
  });

  // Search
  const inputSearch = document.getElementById('input-search');
  inputSearch?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    // Debounce re-render
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(() => {
      renderTransactionManager();
    }, 250);
  });

  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    searchQuery = '';
    renderTransactionManager();
  });

  // Tombol Tambah Transaksi (Header & Empty state)
  const openAddModal = () => showEditModal(null, activeTab, config);
  document.getElementById('btn-add-transaction')?.addEventListener('click', openAddModal);
  document.getElementById('btn-empty-add')?.addEventListener('click', openAddModal);

  // Tombol Seed Sampel Data
  const seedSample = async () => {
    await injectDemoTransactions(activeTab);
    toast(`Berhasil memuat data sampel ${config.title}!`);
    renderTransactionManager();
  };
  document.getElementById('btn-seed-sample')?.addEventListener('click', seedSample);
  document.getElementById('btn-empty-sample')?.addEventListener('click', seedSample);

  // Aksi Kartu: Detail, Edit, Hapus
  document.querySelectorAll('.btn-action-view').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      showDetailModal(items[idx], idx, activeTab);
    });
  });

  document.querySelectorAll('.btn-action-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      showEditModal(items[idx], activeTab, config, idx);
    });
  });

  document.querySelectorAll('.btn-action-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      showDeleteConfirmation(items[idx], idx, activeTab, config);
    });
  });
}

// --------------------------------------------------------------------------
// MODAL FORMS: CREATE / EDIT / DETAIL / DELETE
// --------------------------------------------------------------------------

function showEditModal(item, tab, config, editIndex = null) {
  const isEdit = item !== null && editIndex !== null;
  const modalContainer = document.getElementById('modal-container');
  const user = session.get() || { name: 'Wagiman' };

  // Field nilai awal
  const docNo = item ? (item.docNo || item.nomorDokumen || item.id || '') : generateNewDocNo(tab);
  const program = item ? (item.program || 'Program Nursery 2026 - Batch 1') : 'Program Nursery 2026 - Batch 1';
  const tahapan = item ? (item.tahapan || 'Rubber Main Nursery') : 'Rubber Main Nursery';
  const batchNo = item ? (item.batchNo || 'Batch-01') : 'Batch-01';
  const bedengan = item ? (item.bedengan || 'Bedengan 01') : 'Bedengan 01';
  const klon = item ? (item.klon || item.klonRootstock || 'PB 260') : 'PB 260';
  const klonEntres = item ? (item.klonEntres || 'PB 260') : 'PB 260';
  const qty = item ? (item[config.qtyField] || item.qty || 1000) : 1000;
  const tanggal = item ? (item.tanggal || item.date || todayISO()) : todayISO();
  const status = item ? (item.status || 'SUBMITTED') : 'SUBMITTED';
  const notes = item ? (item.catatan || item.notes || '') : '';

  modalContainer.innerHTML = `
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;">
      <div style="background: #FFFFFF; border-radius: 12px; width: 100%; max-width: 480px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        
        <!-- Modal Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC;">
          <div>
            <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: #0F172A;">${isEdit ? 'Ubah Data Transaksi' : 'Tambah Transaksi Baru'}</h3>
            <div style="font-size: 0.75rem; color: #64748B;">Modul ${config.title}</div>
          </div>
          <button id="btn-modal-close" style="background: transparent; border: none; font-size: 1.2rem; color: #64748B; cursor: pointer; padding: 4px;">&times;</button>
        </div>

        <!-- Modal Form Body -->
        <form id="tx-form" style="padding: 16px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; font-size: 0.82rem;">
          
          <div>
            <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Dokumen / ID</label>
            <input type="text" name="docNo" value="${escapeHtml(docNo)}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Tanggal</label>
              <input type="text" name="tanggal" value="${escapeHtml(tanggal)}" placeholder="YYYY-MM-DD" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
            </div>
            <div>
              <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Status</label>
              <select name="status" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; background: #FFFFFF;">
                <option value="SUBMITTED" ${status === 'SUBMITTED' ? 'selected' : ''}>SUBMITTED</option>
                <option value="APPROVED" ${status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                <option value="VERIFIED" ${status === 'VERIFIED' ? 'selected' : ''}>VERIFIED</option>
                <option value="DRAFT" ${status === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
                <option value="HADIR" ${status === 'HADIR' ? 'selected' : ''}>HADIR</option>
              </select>
            </div>
          </div>

          ${renderDynamicFormFields(tab, item)}

          <div>
            <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Catatan Tambahan</label>
            <textarea name="notes" rows="2" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; resize: vertical;">${escapeHtml(notes)}</textarea>
          </div>

        </form>

        <!-- Modal Footer -->
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid #E2E8F0; background: #F8FAFC;">
          <button id="btn-modal-cancel" type="button" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #475569; font-size: 0.8rem; font-weight: 600; padding: 7px 14px; border-radius: 6px; cursor: pointer;">Batal</button>
          <button id="btn-modal-save" type="button" style="background: #116834; color: #FFFFFF; border: none; font-size: 0.8rem; font-weight: 600; padding: 7px 16px; border-radius: 6px; cursor: pointer;">Simpan Data</button>
        </div>

      </div>
    </div>
  `;

  // Modal events
  const closeModal = () => { modalContainer.innerHTML = ''; };
  document.getElementById('btn-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save')?.addEventListener('click', async () => {
    const form = document.getElementById('tx-form');
    if (!form) return;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // Normalisasi payload
    if (config.qtyField && payload[config.qtyField]) {
      payload[config.qtyField] = parseInt(payload[config.qtyField]) || 0;
    }

    try {
      await saveModuleRecord(tab, payload, editIndex, item);
      closeModal();
      toast(isEdit ? 'Data transaksi berhasil diperbarui!' : 'Transaksi baru berhasil ditambahkan!');
      renderTransactionManager();
    } catch (err) {
      console.error('[tx-manager] save error:', err);
      toast('Gagal menyimpan data transaksi!', 'error');
    }
  });
}

// Field Spesifik Form per Modul
function renderDynamicFormFields(tab, item) {
  if (tab === 'attendance') {
    return `
      <div>
        <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nama Pekerja / Mandor</label>
        <input type="text" name="name" value="${escapeHtml(item?.name || 'Fadilah Yusuf Purba')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jabatan / Posisi</label>
          <input type="text" name="position" value="${escapeHtml(item?.position || 'Pekerja Bibitan')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Waktu Presensi</label>
          <input type="text" name="time" value="${escapeHtml(item?.time || '07:15')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
    `;
  }

  if (tab === 'reception') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Tahapan Pertumbuhan</label>
          <select name="tahapan" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; background: #FFFFFF;">
            <option value="Rubber Main Nursery" ${item?.tahapan !== 'Rubber Advance Planting Material' ? 'selected' : ''}>Rubber Main Nursery (RMN)</option>
            <option value="Rubber Advance Planting Material" ${item?.tahapan === 'Rubber Advance Planting Material' ? 'selected' : ''}>Rubber Advance Planting Material (APM)</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Benih / Bibit</label>
          <input type="text" name="klon" value="${escapeHtml(item?.klon || 'PB 260')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Sumber Asal Bibit</label>
          <input type="text" name="sumber" value="${escapeHtml(item?.sumber || 'Supplier Bibit Jaya')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jumlah Diterima (Pkk)</label>
          <input type="number" name="qty" value="${escapeHtml(item?.qty || 5000)}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
    `;
  }

  if (tab === 'seeding') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input type="text" name="batchNo" value="${escapeHtml(item?.batchNo || 'Batch-01')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Bedengan</label>
          <input type="text" name="bedengan" value="${escapeHtml(item?.bedengan || 'Bedengan 01')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Rootstock</label>
          <input type="text" name="klonAwal" value="${escapeHtml(item?.klonAwal || item?.klon || 'GT 1')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Total Disemai (Pkk)</label>
          <input type="number" name="totalDisemai" value="${escapeHtml(item?.totalDisemai || item?.qty || 3000)}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
    `;
  }

  if (tab === 'budding' || tab === 'regrafting') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input type="text" name="batchNo" value="${escapeHtml(item?.batchNo || 'Batch-01')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Bedengan</label>
          <input type="text" name="bedengan" value="${escapeHtml(item?.bedengan || 'Bedengan 01')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Entres (Mata)</label>
          <input type="text" name="klonEntres" value="${escapeHtml(item?.klonEntres || 'PB 260')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Rootstock (Bawah)</label>
          <input type="text" name="klonRootstock" value="${escapeHtml(item?.klonRootstock || 'GT 1')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
      <div>
        <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jumlah Diokulasi (Pkk)</label>
        <input type="number" name="jumlah" value="${escapeHtml(item?.jumlah || 1500)}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
      </div>
    `;
  }

  if (tab === 'inspection') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Ref. Dokumen Okulasi</label>
          <input type="text" name="buddingDocNo" value="${escapeHtml(item?.buddingDocNo || 'OKL/2026/01')}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input type="text" name="batchNo" value="${escapeHtml(item?.batchNo || 'Batch-01')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Total Diperiksa (Pkk)</label>
          <input type="number" name="totalDiperiksa" value="${escapeHtml(item?.totalDiperiksa || 1500)}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Hasil Jadi (Sukses)</label>
          <input type="number" name="jumlahJadi" value="${escapeHtml(item?.jumlahJadi || 1350)}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Gagal / Mati (Pkk)</label>
          <input type="number" name="jumlahGagal" value="${escapeHtml(item?.jumlahGagal || 150)}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Alokasi Okulasi Janda</label>
          <input type="number" name="totalToRegrafting" value="${escapeHtml(item?.totalToRegrafting || 100)}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
    `;
  }

  if (tab === 'selection') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input type="text" name="batchNo" value="${escapeHtml(item?.batchNo || 'Batch-01')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Alasan Pengafkiran</label>
          <select name="alasan" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; background: #FFFFFF;">
            <option value="MATI" ${item?.alasan === 'MATI' ? 'selected' : ''}>MATI (Bibit Kering/Busuk)</option>
            <option value="ABNORMAL" ${item?.alasan === 'ABNORMAL' ? 'selected' : ''}>ABNORMAL (Pertumbuhan Lambat/Kerdil)</option>
            <option value="RUSAK" ${item?.alasan === 'RUSAK' ? 'selected' : ''}>RUSAK (Patah/Serangan Hama)</option>
          </select>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon</label>
          <input type="text" name="klon" value="${escapeHtml(item?.klon || 'PB 260')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jumlah Diafkir (Pkk)</label>
          <input type="number" name="jumlahAfkir" value="${escapeHtml(item?.jumlahAfkir || 50)}" required style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
        </div>
      </div>
    `;
  }

  if (tab === 'syncQueue') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Modul Entitas</label>
          <select name="entity" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; background: #FFFFFF;">
            <option value="receptions">receptions (Penerimaan)</option>
            <option value="seedings">seedings (Penyemaian)</option>
            <option value="buddings">buddings (Okulasi)</option>
            <option value="inspections">inspections (Pemeriksaan)</option>
            <option value="attendance">attendance (Presensi)</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Aksi Operasi</label>
          <select name="action" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; background: #FFFFFF;">
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>
      <div>
        <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Ref. Record ID</label>
        <input type="text" name="recordId" value="${escapeHtml(item?.recordId || 'RCV-001')}" style="width: 100%; box-sizing: border-box; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;">
      </div>
    `;
  }

  return '';
}

// Modal Detail Transaksi (Read-Only Viewer)
function showDetailModal(item, index, tab) {
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = `
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;">
      <div style="background: #FFFFFF; border-radius: 12px; width: 100%; max-width: 480px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC;">
          <div>
            <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: #0F172A;">Rincian Detail Transaksi</h3>
            <div style="font-size: 0.75rem; color: #64748B;">Indeks Record #${index + 1}</div>
          </div>
          <button id="btn-modal-close" style="background: transparent; border: none; font-size: 1.2rem; color: #64748B; cursor: pointer;">&times;</button>
        </div>

        <div style="padding: 16px 18px; overflow-y: auto; flex: 1;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            ${Object.entries(item).map(([k, v]) => {
              if (k === 'rawState' || k === 'photos' || k === 'photo') return '';
              const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
              return `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%; vertical-align: top;">${escapeHtml(k)}</td>
                  <td style="padding: 6px 0; color: #0F172A; word-break: break-word;">${escapeHtml(valStr)}</td>
                </tr>
              `;
            }).join('')}
          </table>
        </div>

        <div style="display: flex; justify-content: flex-end; padding: 12px 18px; border-top: 1px solid #E2E8F0; background: #F8FAFC;">
          <button id="btn-modal-close-bottom" style="background: #116834; color: #FFFFFF; border: none; font-size: 0.8rem; font-weight: 600; padding: 7px 16px; border-radius: 6px; cursor: pointer;">Tutup</button>
        </div>

      </div>
    </div>
  `;

  const close = () => { modalContainer.innerHTML = ''; };
  document.getElementById('btn-modal-close')?.addEventListener('click', close);
  document.getElementById('btn-modal-close-bottom')?.addEventListener('click', close);
}

// Modal Konfirmasi Hapus (Delete)
function showDeleteConfirmation(item, index, tab, config) {
  const modalContainer = document.getElementById('modal-container');
  const docTitle = item.docNo || item.name || item.id || `Item #${index + 1}`;

  modalContainer.innerHTML = `
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;">
      <div style="background: #FFFFFF; border-radius: 12px; width: 100%; max-width: 400px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center;">
        
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 50%; background: #FEE2E2; color: #DC2626; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>

        <h3 style="margin: 0 0 6px; font-size: 1.05rem; font-weight: 700; color: #1E293B;">Hapus Transaksi?</h3>
        <p style="margin: 0 0 18px; font-size: 0.82rem; color: #64748B;">
          Anda yakin ingin menghapus data <b>${escapeHtml(docTitle)}</b> dari modul ${config.title}? Aksi ini tidak dapat dibatalkan.
        </p>

        <div style="display: flex; gap: 8px; justify-content: center;">
          <button id="btn-cancel-del" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #475569; font-size: 0.82rem; font-weight: 600; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Batal</button>
          <button id="btn-confirm-del" style="background: #DC2626; color: #FFFFFF; border: none; font-size: 0.82rem; font-weight: 600; padding: 8px 18px; border-radius: 6px; cursor: pointer;">Ya, Hapus Data</button>
        </div>

      </div>
    </div>
  `;

  const close = () => { modalContainer.innerHTML = ''; };
  document.getElementById('btn-cancel-del')?.addEventListener('click', close);
  document.getElementById('btn-confirm-del')?.addEventListener('click', async () => {
    await deleteModuleRecord(tab, index, item);
    close();
    toast('Data transaksi berhasil dihapus!');
    renderTransactionManager();
  });
}

// --------------------------------------------------------------------------
// DATA PERSISTENCE ADAPTERS (STORAGE & INDEXEDDB DUAL SYNC)
// --------------------------------------------------------------------------

async function loadModuleData(tab) {
  const cfg = MODULE_CONFIGS[tab];
  if (!cfg) return [];

  // Khusus Regrafting (menggabungkan pool alokasi dan transaksi budding dengan type=REGRAFTING)
  if (tab === 'regrafting') {
    const pool = storage.get('regrafting_pool', []);
    const regraftTxs = storage.get('budding_transactions', []).filter(t => t.type === 'REGRAFTING');
    if (pool.length > 0) return pool;
    if (regraftTxs.length > 0) return regraftTxs;
    return [];
  }

  // Khusus Attendance (Prioritaskan IndexedDB repository)
  if (tab === 'attendance') {
    try {
      const dbList = await cfg.repo.list();
      if (dbList && dbList.length > 0) return dbList;
    } catch (e) {
      console.warn('[tx-manager] attendance DB fetch:', e);
    }
    return storage.get(cfg.storageKey, []);
  }

  // Modul lainnya: baca dari storage lokal
  const stored = storage.get(cfg.storageKey, []);
  if (stored && stored.length > 0) return stored;

  // Fallback ke repository IndexedDB bila storage kosong
  try {
    const repoList = await cfg.repo.list();
    if (repoList && repoList.length > 0) return repoList;
  } catch (err) {
    // repository fallback silent
  }

  return [];
}

async function saveModuleRecord(tab, payload, editIndex, originalItem) {
  const cfg = MODULE_CONFIGS[tab];
  const list = await loadModuleData(tab);

  const updatedRecord = {
    ...(originalItem || {}),
    ...payload,
    id: originalItem?.id || payload.id || uid(`${tab.toUpperCase().slice(0, 3)}-`),
    updatedAt: new Date().toISOString()
  };

  if (editIndex !== null && editIndex >= 0 && editIndex < list.length) {
    list[editIndex] = updatedRecord;
  } else {
    updatedRecord.createdAt = updatedRecord.createdAt || todayISO();
    list.unshift(updatedRecord);
  }

  // Simpan ke storage lokal
  storage.set(cfg.storageKey, list);

  // Simpan / update ke IndexedDB repository
  try {
    await cfg.repo.create(updatedRecord);
  } catch (err) {
    console.warn('[tx-manager] repo create/update:', err);
  }
}

async function deleteModuleRecord(tab, index, item) {
  const cfg = MODULE_CONFIGS[tab];
  const list = await loadModuleData(tab);

  if (index >= 0 && index < list.length) {
    list.splice(index, 1);
    storage.set(cfg.storageKey, list);
  }

  // Hapus dari IndexedDB jika ada ID
  if (item?.id) {
    try {
      await cfg.repo.remove(item.id);
    } catch (err) {
      console.warn('[tx-manager] repo remove error:', err);
    }
  }
}

// Injeksi Sampel Data Realistis untuk Keperluan Demo
async function injectDemoTransactions(tab) {
  const today = todayISO();
  const sampleData = {
    reception: [
      {
        id: 'RCV-001',
        docNo: 'RCV/2026/01',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        jenis: 'Benih / Biji Kelatak',
        tipeAsal: 'Pihak Ke-III',
        sumber: 'Supplier Bibit Jaya',
        sir: 'SIR-2026-0881',
        klon: 'PB 260',
        qty: 10000,
        batchNo: 'Batch-01',
        penerima: 'Wagiman',
        tanggal: today,
        status: 'APPROVED'
      },
      {
        id: 'RCV-002',
        docNo: 'RCV/2026/02',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Advance Planting Material',
        jenis: 'Bibit / Tanaman Muda',
        tipeAsal: 'Kebun Sendiri',
        sumber: 'Divisi I Kebun Induk',
        sir: 'SIR-2026-0895',
        klon: 'RRIM 600',
        qty: 2500,
        batchNo: 'Batch-APM-01',
        penerima: 'Wagiman',
        tanggal: today,
        status: 'APPROVED'
      }
    ],
    seeding: [
      {
        id: 'SEED-001',
        docNo: 'SEED/2026/01',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klonAwal: 'GT 1',
        totalPenerimaan: 10000,
        totalDisemai: 9500,
        totalPolybag: 9500,
        ditolak: 500,
        alasanDitolak: 'Biji Kempes / Pecah',
        mantri: 'Wagiman',
        date: today,
        status: 'COMPLETED'
      }
    ],
    budding: [
      {
        id: 'OKL-001',
        docNo: 'OKL/2026/01',
        type: 'GRAFTING',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klonRootstock: 'GT 1',
        klonEntres: 'PB 260',
        jumlah: 4500,
        jumlahDitolak: 50,
        mantri: 'Wagiman',
        tanggal: today,
        status: 'COMPLETED'
      }
    ],
    inspection: [
      {
        id: 'INSP-001',
        docNo: 'INSP/2026/01',
        buddingDocNo: 'OKL/2026/01',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klonEntres: 'PB 260',
        totalDiperiksa: 4500,
        jumlahJadi: 4100,
        jumlahGagal: 400,
        persenJadi: 91,
        totalToRegrafting: 300,
        totalToSelection: 100,
        inspector: 'Wagiman',
        tanggal: today,
        status: 'VERIFIED'
      }
    ],
    regrafting: [
      {
        id: 'REG-001',
        docNo: 'OKL/REG/2026/01',
        type: 'REGRAFTING',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klonRootstock: 'GT 1',
        klonEntres: 'PB 260',
        jumlah: 300,
        mantri: 'Wagiman',
        tanggal: today,
        status: 'SUBMITTED'
      }
    ],
    selection: [
      {
        id: 'CUL-001',
        docNo: 'DEC-CUL/2026/01',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klon: 'PB 260',
        jumlahAfkir: 100,
        alasan: 'MATI',
        mantri: 'Wagiman',
        tanggal: today,
        status: 'APPROVED'
      }
    ],
    attendance: [
      {
        id: 'ATT-001',
        name: 'Wagiman',
        position: 'Mandor Semprot',
        type: 'SUPERVISOR',
        time: '06:55',
        status: 'HADIR',
        date: today
      },
      {
        id: 'ATT-002',
        name: 'Fadilah Yusuf Purba',
        position: 'Pekerja Bibitan',
        type: 'WORKER',
        time: '07:05',
        status: 'HADIR',
        date: today
      }
    ],
    syncQueue: [
      {
        id: 'SYNC-001',
        entity: 'receptions',
        recordId: 'RCV/2026/01',
        action: 'CREATE',
        status: 'SYNCED',
        createdAt: today
      }
    ]
  };

  const sample = sampleData[tab] || [];
  if (sample.length > 0) {
    const cfg = MODULE_CONFIGS[tab];
    storage.set(cfg.storageKey, sample);
    for (const item of sample) {
      try { await cfg.repo.create(item); } catch (e) {}
    }
  }
}

function generateNewDocNo(tab) {
  const num = Math.floor(Math.random() * 899 + 100);
  switch (tab) {
    case 'reception': return `RCV/2026/${num}`;
    case 'seeding': return `SEED/2026/${num}`;
    case 'budding': return `OKL/2026/${num}`;
    case 'inspection': return `INSP/2026/${num}`;
    case 'regrafting': return `OKL/REG/2026/${num}`;
    case 'selection': return `DEC-CUL/2026/${num}`;
    case 'attendance': return `ATT-${num}`;
    case 'syncQueue': return `SYNC-${num}`;
    default: return `DOC/2026/${num}`;
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
