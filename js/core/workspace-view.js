/**
 * core/workspace-view.js — Workspace View Mode Manager (TASK-UI-WORKSPACE-FOCUS-01)
 * Mengelola mode tampilan:
 * - "split" (Default): Frame HP & Web Workspace berdampingan.
 * - "hp": Web panel disembunyikan, Frame HP centered secara proporsional.
 * - "web": HP panel disembunyikan, Web panel 100% full workspace.
 * 
 * Sifat: Zero reload, Zero route mutation, Zero session pollution, Isolated user preference.
 */

import { session } from './session.js';
import { getCurrent } from './router.js';

let currentMode = 'split';

/** Mendapatkan key storage unik per user */
function getUserModeStorageKey() {
  try {
    const user = session?.getUser?.();
    const userId = user?.id || user?.username || user?.code || 'default';
    return `sigma_workspace_view_mode_${userId}`;
  } catch (_) {
    return 'sigma_workspace_view_mode_default';
  }
}

/** Membaca mode tersimpan */
export function getSavedWorkspaceMode() {
  try {
    const key = getUserModeStorageKey();
    const saved = localStorage.getItem(key);
    if (saved && ['split', 'hp', 'web'].includes(saved)) {
      return saved;
    }
  } catch (_) {}
  return 'split';
}

/** Mengambil mode aktif saat ini */
export function getWorkspaceViewMode() {
  return currentMode;
}

/** Mengatur mode tampilan workspace */
export function setWorkspaceViewMode(mode, savePreference = true) {
  if (!['split', 'hp', 'web'].includes(mode)) {
    mode = 'split';
  }

  currentMode = mode;

  // 1. Simpan preferensi jika diizinkan
  if (savePreference) {
    try {
      const key = getUserModeStorageKey();
      localStorage.setItem(key, mode);
    } catch (_) {}
  }

  // 2. Update class layout pada DOM
  const layout = document.getElementById('workspace-layout');
  if (layout) {
    layout.classList.remove('mode-split', 'mode-hp', 'mode-web');
    layout.classList.add(`mode-${mode}`);
  }

  // 3. Update tombol switcher aktif
  const switcher = document.getElementById('workspace-mode-switcher');
  if (switcher) {
    const buttons = switcher.querySelectorAll('.mode-switch-btn');
    buttons.forEach((btn) => {
      const btnMode = btn.getAttribute('data-mode');
      const isActive = btnMode === mode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  // 4. Trigger event kustom untuk komponen yang perlu merespons (misal resize chart jika ada)
  try {
    window.dispatchEvent(new CustomEvent('workspace-view-mode-change', { detail: { mode } }));
  } catch (_) {}

  return currentMode;
}

/** Sinkronisasi label halaman aktif di Global Workspace Header */
export function updateWorkspaceActivePageLabel() {
  const labelEl = document.getElementById('workspace-active-page-label');
  if (!labelEl) return;

  const current = getCurrent();
  const route = (current.route || '/login').split('?')[0];

  const PAGE_MAP = {
    '/': 'Login Akun',
    '/login': 'Login Akun',
    '/splash': 'Splash Screen',
    '/sync': 'Sinkronisasi Data',
    '/home': 'Beranda Operasional',
    '/attendance': 'Presensi Harian',
    '/attendance/supervisor': 'Presensi Mandor / Supervisor',
    '/attendance/supervisor/result': 'Hasil Presensi Mandor',
    '/attendance/workers': 'Presensi Pekerja Roster',
    '/attendance/summary': 'Rekap Presensi Harian',
    '/reception': 'Penerimaan Benih & Material',
    '/reception/kebun-sepupu': 'Penerimaan Kebun Sepupu',
    '/reception/benih': 'Penerimaan Benih Kelatak',
    '/reception/benih/sir': 'Input Dokumen SIR',
    '/reception/benih/camera': 'Foto Bukti Penerimaan',
    '/reception/summary': 'Ringkasan Penerimaan',
    '/seeding': 'Penyemaian Benih',
    '/seeding/scan': 'Pindai Bedengan Semai',
    '/seeding/form': 'Form Penyemaian',
    '/budding': 'Okulasi Bibit',
    '/budding/grafting': 'Okulasi Standar',
    '/budding/grafting/scan': 'Pindai Batang Bawah',
    '/budding/grafting/form': 'Form Okulasi',
    '/budding/regrafting': 'Okulasi Ulang (Regrafting)',
    '/inspection': 'Pemeriksaan Hasil Okulasi',
    '/inspection/scan': 'Pindai Okulasi',
    '/inspection/form': 'Form Pemeriksaan',
    '/selection': 'Penyeleksian & Transplanting',
    '/history': 'Riwayat Bibitan',
    '/transactions': 'Katalog Transaksi',
    '/material': 'Material & Logistik',
    '/nursery-activity': 'Pemeliharaan Bibitan',
    '/nursery-activity/form': 'Form Pemeliharaan',
    '/request': 'Pengeluaran Bibit',
    '/request/kebun-sepupu': 'Pengeluaran Kebun Sepupu',
    '/request/kebun-sepupu/form': 'Form Permintaan Bibit',
    '/request/kebun-sendiri': 'Pengeluaran Kebun Sendiri',
    '/request/kebun-sendiri/form': 'Form Permintaan Sendiri',
    '/dispatch': 'Surat Jalan / Dispatch',
    '/dispatch/report': 'Laporan Pengeluaran',
    '/entres': 'Kebun Entres',
    '/entres/menunas': 'Menunas Kebun Entres',
    '/entres/menunas/form': 'Form Menunas',
    '/entres/topping': 'Topping Kebun Entres',
    '/entres/topping/form': 'Form Topping',
    '/master/bedengan': 'Master Bedengan',
    '/master/batch': 'Master Batch',
    '/destruction': 'Pemusnahan Bibit (Culling)',
    '/selection/culling': 'Pemusnahan Bibit',
    '/consolidation': 'Konsolidasi Bibitan',
    '/verification': 'Verifikasi Lapangan',
    '/profile': 'Profil Pengguna'
  };

  labelEl.textContent = PAGE_MAP[route] || 'Operasional Nursery';
}

/** Inisialisasi Mode Switcher & Global Header */
export function initWorkspaceViewMode() {
  const initialMode = getSavedWorkspaceMode();
  setWorkspaceViewMode(initialMode, false);
  updateWorkspaceActivePageLabel();

  // Attach click listener ke tombol mode switcher
  const switcher = document.getElementById('workspace-mode-switcher');
  if (switcher) {
    const buttons = switcher.querySelectorAll('.mode-switch-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = btn.getAttribute('data-mode');
        if (mode) {
          setWorkspaceViewMode(mode, true);
        }
      });
    });
  }

  // Dengarkan route change untuk sinkronisasi label header
  window.addEventListener('hashchange', () => {
    updateWorkspaceActivePageLabel();
  });
}
