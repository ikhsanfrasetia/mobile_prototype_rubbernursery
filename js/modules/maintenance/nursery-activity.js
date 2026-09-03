/**
 * modules/maintenance/nursery-activity.js — Modul Rekam Pemeliharaan Pembibitan.
 * 
 * 1. Landing Page (#/nursery-activity):
 *    - Menampilkan 1 menu kartu: "Rekam Aktivitas Bibitan" (96px x 115px, konsisten dengan Okulasi / Kebun Entres)
 *    - Ringkasan Data Transaksi konsisten dengan modul lainnya (Penyemaian, Okulasi, Entres)
 * 
 * 2. Form Page (#/nursery-activity/form):
 *    - Layar "Pencatatan Hasil" sesuai spesifikasi:
 *      * HEADER: Tombol kembali, Judul: Pencatatan Hasil
 *      * AKTIVITAS: Dropdown 22 Aktivitas + Target Aktivitas
 *      * NAMA PROGRAM PEMBIBITAN: Dropdown Program
 *      * LOKASI BLOK: Tabel Blok, Luas(HA), Jumlah Pokok
 *      * INPUT MANUAL: Toggle Input Manual
 *      * PEKERJA: List 7 pekerja + Toggle
 *      * TOMBOL: Simpan (hijau)
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';

export const MASTER_AKTIVITAS = [
  { kode: '122193', nama: 'Treatment & Pengemasan' },
  { kode: '122192', nama: 'Bongkar Bibit & Potong Serong' },
  { kode: '122191', nama: 'Topping' },
  { kode: '122177', nama: 'Perawatan Entrys' },
  { kode: '122176', nama: 'Seleksi Bibit' },
  { kode: '122175', nama: 'Pengendalian Hama Penyakit' },
  { kode: '122174', nama: 'Pemupukan' },
  { kode: '122173', nama: 'Pengendalian Gulma' },
  { kode: '122172', nama: 'Penyisipan' },
  { kode: '122171', nama: 'Penyiraman' },
  { kode: '122183', nama: 'Buka Perban & Pemeriksaan Okulasi' },
  { kode: '122182', nama: 'Okulasi' },
  { kode: '122181', nama: 'Panen Entrys' },
  { kode: '122162', nama: 'Tanam Entrys Baru' },
  { kode: '122161', nama: 'Tanam Kelatak di Polybag' },
  { kode: '122160', nama: 'Pembebanan Biaya dari Bedengan' },
  { kode: '122141', nama: 'Biaya Polybag' },
  { kode: '122124', nama: 'Penyiraman di Bedengan' },
  { kode: '122123', nama: 'Tanam Biji di Bedengan' },
  { kode: '122122', nama: 'Pemeliharaan Bedengan' },
  { kode: '122121', nama: 'Persiapan Bedengan' },
  { kode: '122111', nama: 'Biaya Biji Kelatak' }
];

export const MASTER_PROGRAM_PEMBIBITAN = [
  'PRG/NUR/01/2026',
  'PRG/NUR/02/2027',
  'PRG/NUR/03/2028',
  'PRG/NUR/08/2029'
];

export const MASTER_LOKASI_BLOK = [
  { blok: 'Block 031/04', luas: 39.68 },
  { blok: 'Block 036G/19', luas: 0.45 },
  { blok: 'Block 033/07', luas: 8.8 },
  { blok: 'Block 026/20', luas: 2.35 },
  { blok: 'Block 008/01', luas: 29 },
  { blok: 'Block 016D/13', luas: 1.94 },
  { blok: 'Block 036N/19', luas: 0.45 },
  { blok: 'Block 036U/19', luas: 0.23 },
  { blok: 'Block 013/14', luas: 38.05 },
  { blok: 'Block 016C/13', luas: 1.94 }
];

export const MASTER_PEKERJA_LIST = [
  { id: 'PK-01', name: 'Fadilah Yusuf Purba', code: '1405739', role: 'Pekerja Bibitan' },
  { id: 'PK-02', name: 'Adek Apria Syahputra', code: '1405739', role: 'Pekerja Bibitan' },
  { id: 'PK-03', name: 'Bidara Iswanda', code: '1405739', role: 'Pekerja Bibitan' },
  { id: 'PK-04', name: 'Tugiman', code: '1405739', role: 'Pekerja Bibitan' },
  { id: 'PK-05', name: 'Budi Santoso', code: '1405810', role: 'Pekerja Bibitan' },
  { id: 'PK-06', name: 'Andi Wijaya', code: '1405811', role: 'Pekerja Bibitan' },
  { id: 'PK-07', name: 'Joko Prasetyo', code: '1405812', role: 'Pekerja Bibitan' }
];

function formatDateDDMMYYYY(val) {
  if (!val) return '-';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.substring(0, 10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
}

// ==========================================
// 1. LANDING PAGE (#/nursery-activity)
// ==========================================
export function renderNurseryActivityLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const records = storage.get('nursery_activity_records', []);

  app.innerHTML = `
    <div class="page nursery-activity-landing-page" style="position: relative; display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.12rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">
            Rekam Pemeliharaan
          </h1>
        </div>
        <button id="btn-refresh" type="button" aria-label="Segarkan" style="background: none; border: none; cursor: pointer; padding: 6px; margin-right: -4px; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </header>

      <!-- CONTENT -->
      <main style="flex: 1; padding: 16px; overflow-y: auto;">
        
        <!-- MENU KARTU REKAM AKTIVITAS BIBITAN (96px x 115px) -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          
          <button id="card-rekam-aktivitas" type="button" class="beranda-menu-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; width: 96px; height: 115px; padding: 8px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03); cursor: pointer; text-align: center; box-sizing: border-box; transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative;">
            <div style="width: 44px; height: 44px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="#116834" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="8" y="6" width="32" height="36" rx="4" fill="#E8F5E9"></rect>
                <line x1="16" y1="16" x2="32" y2="16"></line>
                <line x1="16" y1="24" x2="32" y2="24"></line>
                <line x1="16" y1="32" x2="26" y2="32"></line>
                <polyline points="28 32 31 35 37 29" stroke="#116834" stroke-width="2.5"></polyline>
              </svg>
            </div>
            <span style="font-size: 0.72rem; font-weight: 700; color: #116834; line-height: 1.2; text-align: center;">
              Rekam Aktivitas<br>Bibitan
            </span>
          </button>

        </div>

        <!-- RINGKASAN DATA TRANSAKSI PEMELIHARAAN -->
        <div style="padding: 24px 0 16px 0;">
          <h2 style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 16px 0;">
            Ringkasan Data Transaksi (${records.length})
          </h2>

          ${records.length > 0 ? records.map((rec, idx) => `
            <div style="border: 1px solid #D9D9D9; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #FFFFFF; position: relative;">
              
              <!-- HEADER BARIS 1: NO DOKUMEN & BADGE -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.95rem; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${rec.docNo || `ACT/NUR/2026/0${idx + 1}`}
                  </div>
                  <div style="font-size: 0.8rem; color: #999999; margin-top: 4px;">
                    ${formatDateDDMMYYYY(rec.createdAt || new Date().toISOString())}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0; position: relative;">
                  <span style="background: #E8F5E9; color: #116834; font-size: 0.7rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; white-space: nowrap; border: 1px solid #116834; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
                    ${rec.aktivitas?.nama || 'Pemeliharaan'}
                  </span>
                  <button class="btn-card-menu-activity" data-index="${idx}" style="background: none; border: none; padding: 4px; margin-right: -4px; cursor: pointer; color: #111;">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                  <div class="card-popover-activity" id="popover-activity-${idx}" style="display: none; position: absolute; top: 28px; right: 0; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); width: 120px; z-index: 20; flex-direction: column; overflow: hidden;">
                    <button class="btn-popover-activity-hapus" data-index="${idx}" data-doc="${rec.docNo || `ACT/NUR/2026/0${idx + 1}`}" style="padding: 12px 16px; text-align: left; background: #FFFFFF; border: none; font-size: 0.88rem; font-weight: 600; color: #D32F2F; cursor: pointer;">
                      Hapus
                    </button>
                  </div>
                </div>
              </div>

              <!-- DIVIDER -->
              <hr style="border: none; border-top: 1px solid #EFEFEF; margin: 12px 0;" />

              <!-- IDENTITAS PROGRAM -->
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; gap: 8px;">
                <span style="font-weight: 700; font-size: 0.95rem; color: #111111; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${rec.program || 'Nursery Program 2023'}
                </span>
              </div>

              <!-- ACCORDION CONTENT DETAIL -->
              <div class="card-details-content" style="display: none; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Kode Aktivitas</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #116834; text-align: right;">${rec.aktivitas?.kode || '-'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Lokasi Blok</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right;">${rec.lokasiBlok?.blok || '-'} (${rec.lokasiBlok?.luas || '-'} HA)</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Jumlah Pekerja</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right;">${rec.pekerja?.length || 0} Orang</span>
                </div>
                ${(rec.pekerja && rec.pekerja.length > 0) ? `
                  <div style="margin-top: 4px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
                    <div style="font-size: 0.78rem; font-weight: 700; color: #64748B; margin-bottom: 4px;">Pekerja:</div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      ${rec.pekerja.map(w => `
                        <div style="font-size: 0.84rem; font-weight: 600; color: #1E293B;">
                          ${w.code}-${w.name}
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- FOOTER ACTION ROW -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <div class="btn-expand-card" style="font-size: 0.8rem; color: #116834; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <span class="expand-text">Tampilkan Detail</span>
                  <svg class="expand-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; color: #116834; font-weight: 700; font-size: 0.85rem;">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Tersimpan
                </div>
              </div>

            </div>
          `).join('') : `
            <!-- EMPTY STATE -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 0;">
              <div style="margin-bottom: 16px;">
                <svg viewBox="0 0 24 24" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill="#111111"/>
                  <path d="M16 13H13V16H11V13H8V11H11V8H13V11H16V13Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <h2 style="font-size: 1.1rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 8px 0; line-height: 1.4;">
                Belum ada Dokumen<br>Pemeliharaan hari ini
              </h2>
              <p style="font-size: 0.95rem; color: #999999; text-align: center; margin: 0; line-height: 1.4;">
                Pilih menu Rekam Aktivitas Bibitan<br>untuk memulai pencatatan
              </p>
            </div>
          `}

        </div>

        <!-- MODAL DIALOG KONFIRMASI HAPUS DATA -->
        <div id="modal-delete-activity-overlay" style="display: none; position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 1000; backdrop-filter: blur(2px);"></div>
        
        <div id="dialog-delete-activity" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; padding: 20px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1001; text-align: center; box-sizing: border-box;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.05rem; font-weight: 800; color: #111111; margin: 0 0 6px 0;">Hapus Dokumen?</h3>
          <p id="dialog-delete-activity-msg" style="font-size: 0.80rem; color: #666666; margin: 0 0 18px 0; line-height: 1.45;">
            Apakah Anda yakin ingin menghapus data hasil aktivitas ini? Data yang dihapus tidak dapat dikembalikan.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-delete-act" type="button" style="flex: 1; height: 40px; background: #F3F4F6; color: #374151; border: none; border-radius: 8px; font-size: 0.84rem; font-weight: 700; cursor: pointer;">
              Batal
            </button>
            <button id="btn-confirm-delete-act" type="button" style="flex: 1; height: 40px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.84rem; font-weight: 700; cursor: pointer;">
              Ya, Hapus
            </button>
          </div>
        </div>

      </main>
    </div>
  `;

  // Event Listeners: Back & Refresh
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/home');
  });

  app.querySelector('#btn-refresh')?.addEventListener('click', () => {
    renderNurseryActivityLanding();
  });

  // Card Navigation
  const cardMenu = app.querySelector('#card-rekam-aktivitas');
  if (cardMenu) {
    cardMenu.addEventListener('mouseenter', () => {
      cardMenu.style.transform = 'translateY(-2px)';
      cardMenu.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
    });
    cardMenu.addEventListener('mouseleave', () => {
      cardMenu.style.transform = 'translateY(0)';
      cardMenu.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
    });
    cardMenu.addEventListener('click', () => {
      navigate('/nursery-activity/form');
    });
  }

  // Modal Dialog Hapus
  const deleteOverlay = app.querySelector('#modal-delete-activity-overlay');
  const deleteDialog = app.querySelector('#dialog-delete-activity');
  const deleteMsg = app.querySelector('#dialog-delete-activity-msg');
  const btnCancelDelete = app.querySelector('#btn-cancel-delete-act');
  const btnConfirmDelete = app.querySelector('#btn-confirm-delete-act');
  let pendingDeleteIdx = null;

  const closeDeleteDialog = () => {
    if (deleteOverlay) deleteOverlay.style.display = 'none';
    if (deleteDialog) deleteDialog.style.display = 'none';
    pendingDeleteIdx = null;
  };

  btnCancelDelete?.addEventListener('click', closeDeleteDialog);
  deleteOverlay?.addEventListener('click', closeDeleteDialog);

  btnConfirmDelete?.addEventListener('click', () => {
    if (pendingDeleteIdx !== null) {
      const currentList = storage.get('nursery_activity_records', []);
      currentList.splice(pendingDeleteIdx, 1);
      storage.set('nursery_activity_records', currentList);
      toast('Dokumen aktivitas berhasil dihapus.', 'info');
    }
    closeDeleteDialog();
    renderNurseryActivityLanding();
  });

  // Popovers
  const btnCardMenus = app.querySelectorAll('.btn-card-menu-activity');
  const cardPopovers = app.querySelectorAll('.card-popover-activity');

  if (btnCardMenus.length > 0) {
    btnCardMenus.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = e.currentTarget.dataset.index;
        const popover = app.querySelector(`#popover-activity-${idx}`);
        cardPopovers.forEach(p => {
          if (p !== popover) p.style.display = 'none';
        });
        if (popover) {
          popover.style.display = popover.style.display === 'flex' ? 'none' : 'flex';
        }
      });
    });

    document.addEventListener('click', () => {
      cardPopovers.forEach(p => p.style.display = 'none');
    });

    app.querySelectorAll('.btn-popover-activity-hapus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cardPopovers.forEach(p => p.style.display = 'none');

        pendingDeleteIdx = parseInt(e.currentTarget.dataset.index, 10);
        const docNo = e.currentTarget.dataset.doc;

        if (deleteMsg) {
          deleteMsg.textContent = `Apakah Anda yakin ingin menghapus data dokumen "${docNo}"? Data yang dihapus tidak dapat dipulihkan kembali.`;
        }
        if (deleteOverlay) deleteOverlay.style.display = 'block';
        if (deleteDialog) deleteDialog.style.display = 'block';
      });
    });
  }

  // Accordion Expand / Collapse
  app.querySelectorAll('.btn-expand-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('div[style*="border: 1px solid #D9D9D9"]');
      if (!card) return;
      const content = card.querySelector('.card-details-content');
      const text = btn.querySelector('.expand-text');
      const icon = btn.querySelector('.expand-icon');
      
      if (content) {
        if (content.style.display === 'none' || !content.style.display) {
          content.style.display = 'flex';
          if (icon) icon.style.transform = 'rotate(180deg)';
          if (text) text.textContent = 'Sembunyikan Detail';
        } else {
          content.style.display = 'none';
          if (icon) icon.style.transform = 'rotate(0deg)';
          if (text) text.textContent = 'Tampilkan Detail';
        }
      }
    });
  });
}

// ==========================================
// 2. FORM PAGE (#/nursery-activity/form)
// ==========================================
export function renderNurseryActivityForm() {
  const app = document.getElementById('app');
  if (!app) return;

  let selectedAktivitasIndex = 0;
  let selectedProgram = MASTER_PROGRAM_PEMBIBITAN[0];
  let selectedBlokIndex = 0;
  let isInputManual = false;
  const workerSelectionState = {};
  MASTER_PEKERJA_LIST.forEach((w) => {
    workerSelectionState[w.id] = false;
  });

  const currentAktivitas = MASTER_AKTIVITAS[selectedAktivitasIndex];
  const currentBlok = MASTER_LOKASI_BLOK[selectedBlokIndex];

  app.innerHTML = `
    <div class="page nursery-activity-page" style="position: relative; display: flex; flex-direction: column; height: 100%; background: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 6px; letter-spacing: -0.01em;">
            Pencatatan Hasil
          </h1>
        </div>
      </header>

      <!-- CONTENT BODY (SCROLLABLE) -->
      <main style="flex: 1; overflow-y: auto; padding: 14px 16px 24px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- CARD 1: AKTIVITAS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <label for="select-aktivitas" style="display: block; font-size: 0.78rem; font-weight: 700; color: #374151; margin-bottom: 5px;">
            Aktivitas
          </label>
          <div style="position: relative;">
            <select id="select-aktivitas" style="width: 100%; height: 42px; padding: 0 32px 0 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #1F2937; appearance: none; outline: none; cursor: pointer;">
              ${MASTER_AKTIVITAS.map((akt, i) => `
                <option value="${i}" ${i === selectedAktivitasIndex ? 'selected' : ''}>
                  ${akt.kode} - ${akt.nama}
                </option>
              `).join('')}
            </select>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- CARD 2: NAMA PROGRAM PEMBIBITAN -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #374151; margin-bottom: 5px;">
            Nama Program Pembibitan
          </label>
          <div id="btn-open-program-sheet" role="button" tabindex="0" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 12px; height: 42px; background: #FFFFFF; cursor: pointer; transition: border-color 0.15s ease;">
            <span id="label-selected-program" style="font-size: 0.88rem; font-weight: 700; color: #111827;">${selectedProgram}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- CARD 3: LOKASI BLOK (DROPDOWNLIST) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <label for="select-blok" style="display: block; font-size: 0.78rem; font-weight: 700; color: #374151; margin-bottom: 5px;">
            Lokasi Blok
          </label>
          <div style="position: relative;">
            <select id="select-blok" style="width: 100%; height: 42px; padding: 0 32px 0 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #1F2937; appearance: none; outline: none; cursor: pointer;">
              ${MASTER_LOKASI_BLOK.map((b, i) => `
                <option value="${i}" ${i === selectedBlokIndex ? 'selected' : ''}>
                  ${b.blok}
                </option>
              `).join('')}
            </select>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- CARD 4: PEKERJA (LIST PEKERJA DENGAN TOGGLE DI SISI KANAN) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="font-size: 0.78rem; font-weight: 700; color: #374151; margin-bottom: 10px;">
            Pekerja Aktif (${MASTER_PEKERJA_LIST.length})
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${MASTER_PEKERJA_LIST.map((worker) => {
              const isChecked = !!workerSelectionState[worker.id];
              return `
                <div class="worker-item-card" data-id="${worker.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; gap: 8px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${worker.name}
                    </div>
                    <div style="font-size: 0.72rem; color: #64748B; margin-top: 1px;">
                      ${worker.code} • ${worker.role}
                    </div>
                  </div>
                  <button class="worker-btn-toggle" type="button" data-worker-id="${worker.id}" aria-pressed="${isChecked}" style="position: relative; width: 44px; height: 24px; background: ${isChecked ? '#116834' : '#CBD5E1'}; border-radius: 14px; border: none; padding: 2px; cursor: pointer; transition: background 0.2s ease; display: inline-flex; align-items: center; flex-shrink: 0;">
                    <span style="display: block; width: 20px; height: 20px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform: ${isChecked ? 'translateX(20px)' : 'translateX(0)'};"></span>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- TOMBOL SIMPAN -->
        <div style="margin-top: 4px;">
          <button id="btn-simpan-hasil" type="button" style="width: 100%; height: 46px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.90rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
            Simpan
          </button>
        </div>

      </main>

      <!-- OVERLAY MODAL PROGRAM -->
      <div id="modal-program-overlay" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; backdrop-filter: blur(1px);"></div>

      <!-- BOTTOM SHEET PROGRAM PEMBIBITAN (PERSIS SCREENSHOT REFERENSI) -->
      <div id="sheet-program" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; width: 100%; box-sizing: border-box; background: #FFFFFF; border-radius: 16px 16px 0 0; padding: 20px 16px 24px; z-index: 101; flex-direction: column; box-shadow: 0 -4px 16px rgba(0,0,0,0.15);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-size: 1.02rem; font-weight: 800; color: #111111; margin: 0;">Pilih Program Pembibitan</h3>
          <button id="btn-close-sheet-program" type="button" style="background: none; border: none; padding: 4px; cursor: pointer; color: #64748B;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div id="list-program-container" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 8px; overflow: hidden; background: #FFFFFF;">
          ${MASTER_PROGRAM_PEMBIBITAN.map((prog, idx) => `
            <div class="item-program-row" data-code="${prog}" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: ${selectedProgram === prog ? '#E8F5E9' : '#FFFFFF'}; border-bottom: ${idx === MASTER_PROGRAM_PEMBIBITAN.length - 1 ? 'none' : '1px solid #E5E7EB'}; cursor: pointer;">
              <span style="font-size: 0.95rem; color: #111111; font-weight: ${selectedProgram === prog ? '700' : '500'};">${prog}</span>
              <span style="font-size: 0.95rem; color: #116834; font-weight: 700;">Pilih</span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // Event Listener: Back Button -> navigasi kembali ke Landing Page Pemeliharaan
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/nursery-activity');
  });

  // Event Listener: Dropdown Lokasi Blok Change
  const selectBlok = app.querySelector('#select-blok');
  const displayLuasBlok = app.querySelector('#display-luas-blok');
  selectBlok?.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value);
    const blk = MASTER_LOKASI_BLOK[idx] || MASTER_LOKASI_BLOK[0];
    if (displayLuasBlok) {
      displayLuasBlok.textContent = `${blk.luas} HA`;
    }
  });

  // Event Listener: Toggle Pekerja
  app.querySelectorAll('.worker-btn-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const workerId = btn.dataset.workerId;
      const currentVal = !workerSelectionState[workerId];
      workerSelectionState[workerId] = currentVal;

      btn.setAttribute('aria-pressed', currentVal ? 'true' : 'false');
      btn.style.background = currentVal ? '#116834' : '#CBD5E1';
      const slider = btn.querySelector('span');
      if (slider) {
        slider.style.transform = currentVal ? 'translateX(20px)' : 'translateX(0)';
      }
    });
  });

  // Bottom Sheet Program Pembibitan
  const btnOpenProgram = app.querySelector('#btn-open-program-sheet');
  const modalProgramOverlay = app.querySelector('#modal-program-overlay');
  const sheetProgram = app.querySelector('#sheet-program');
  const btnCloseSheetProgram = app.querySelector('#btn-close-sheet-program');
  const labelSelectedProgram = app.querySelector('#label-selected-program');

  const openProgramSheet = () => {
    if (modalProgramOverlay) modalProgramOverlay.style.display = 'block';
    if (sheetProgram) sheetProgram.style.display = 'flex';
  };

  const closeProgramSheet = () => {
    if (modalProgramOverlay) modalProgramOverlay.style.display = 'none';
    if (sheetProgram) sheetProgram.style.display = 'none';
  };

  btnOpenProgram?.addEventListener('click', openProgramSheet);
  btnCloseSheetProgram?.addEventListener('click', closeProgramSheet);
  modalProgramOverlay?.addEventListener('click', closeProgramSheet);

  app.querySelectorAll('.item-program-row').forEach(row => {
    row.addEventListener('click', () => {
      const code = row.dataset.code;
      if (code) {
        selectedProgram = code;
        if (labelSelectedProgram) labelSelectedProgram.textContent = selectedProgram;
        
        // Perbarui highlight baris
        app.querySelectorAll('.item-program-row').forEach(r => {
          const isCurr = r.dataset.code === selectedProgram;
          r.style.background = isCurr ? '#E8F5E9' : '#FFFFFF';
          const spanText = r.querySelector('span:first-child');
          if (spanText) spanText.style.fontWeight = isCurr ? '700' : '500';
        });
      }
      closeProgramSheet();
    });
  });

  // Event Listener: Tombol Simpan
  app.querySelector('#btn-simpan-hasil')?.addEventListener('click', () => {
    const selectAktivitasEl = app.querySelector('#select-aktivitas');
    const selectBlokEl = app.querySelector('#select-blok');
    const aktIdx = parseInt(selectAktivitasEl?.value || '0');
    const selectedAkt = MASTER_AKTIVITAS[aktIdx] || MASTER_AKTIVITAS[0];
    const selectedProg = selectedProgram || MASTER_PROGRAM_PEMBIBITAN[0];
    const blkIdx = parseInt(selectBlokEl?.value || '0');
    const selectedBlok = MASTER_LOKASI_BLOK[blkIdx] || MASTER_LOKASI_BLOK[0];
    const selectedWorkers = MASTER_PEKERJA_LIST.filter(w => workerSelectionState[w.id]);

    const existingRecords = storage.get('nursery_activity_records', []);
    const docNo = `ACT/NUR/2026/0${existingRecords.length + 1}`;

    const record = {
      id: `ACT-${Date.now()}`,
      docNo,
      aktivitas: selectedAkt,
      program: selectedProg,
      lokasiBlok: selectedBlok,
      pekerja: selectedWorkers,
      createdAt: new Date().toISOString()
    };

    existingRecords.push(record);
    storage.set('nursery_activity_records', existingRecords);

    toast(`Pencatatan hasil "${selectedAkt.nama}" (${docNo}) berhasil disimpan!`, 'success');
    navigate('/nursery-activity');
  });
}
