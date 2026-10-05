/**
 * modules/attendance/attendance-summary.js — Ringkasan & Bukti Foto Presensi (Datang & Pulang).
 * Menampilkan ringkasan kehadiran lengkap harian (Datang, Pulang, Belum Pulang)
 * serta daftar transaksi individual lengkap dengan thumbnail bukti foto & modal preview foto.
 */

import { attendanceRepository, photoRepository } from '../../db/repositories.js';
import { storage } from '../../core/storage.js';
import { todayISO, esc, getAttendanceUniqueKey } from '../../core/utils.js';
import { navigate } from '../../core/router.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { session } from '../../core/session.js';
import { formatDisplayDate } from './attendance-landing.js';

/**
 * Resolusi aman foto bukti presensi (dari data URL langsung, photoId di photoRepository, atau null)
 * @param {Object} item Record presensi
 * @returns {Promise<string|null>}
 */
export async function resolveAttendancePhoto(item) {
  if (!item) return null;
  if (typeof item.photo === 'string' && item.photo.trim().length > 0) {
    return item.photo;
  }
  if (item.photoId) {
    try {
      const doc = await photoRepository.get(item.photoId);
      if (doc && doc.data && typeof doc.data === 'string' && doc.data.trim().length > 0) {
        return doc.data;
      }
    } catch (err) {
      console.warn('[attendance-summary] Gagal resolusi photoId:', item.photoId, err);
    }
  }
  if (item.id) {
    try {
      const photos = (await photoRepository.list()) || [];
      const matched = photos.find((p) => p.entityId === item.id || p.id === item.photoId);
      if (matched && matched.data) {
        return matched.data;
      }
    } catch (_) {}
  }
  return null;
}

export async function renderAttendanceSummary(contextOrDate = null) {
  const app = document.getElementById('app');
  if (!app) return;

  const userContext = getCurrentUserContext() || session.get() || {};
  let today = todayISO();
  let initialTab = 'ALL';

  // Parsing parameter tanggal & query tab
  if (typeof contextOrDate === 'string' && contextOrDate.trim().length >= 10) {
    today = contextOrDate.trim().slice(0, 10);
  } else if (contextOrDate && typeof contextOrDate === 'object') {
    if (typeof contextOrDate.date === 'string' && contextOrDate.date.trim().length >= 10) {
      today = contextOrDate.date.trim().slice(0, 10);
    } else if (contextOrDate.params?.date && typeof contextOrDate.params.date === 'string') {
      today = contextOrDate.params.date.trim().slice(0, 10);
    }

    const qType = contextOrDate.query?.get('type') || contextOrDate.params?.type;
    if (qType === 'DATANG' || qType === 'PULANG') {
      initialTab = qType;
    }
  }

  // Ambil dan gabungkan data presensi dari IndexedDB & LocalStorage dengan deduplikasi ketat
  let attendances = [];
  try {
    const dbList = (await attendanceRepository.list()) || [];
    const storageList = storage.get('attendance_transactions', []) || [];

    const map = new Map();
    dbList.forEach((it) => {
      if (it) {
        const k = getAttendanceUniqueKey(it) || it.id;
        map.set(k, it);
      }
    });
    storageList.forEach((it) => {
      if (it) {
        const k = getAttendanceUniqueKey(it) || it.id;
        if (!map.has(k)) map.set(k, it);
      }
    });
    attendances = Array.from(map.values());
  } catch (err) {
    console.warn('[attendance-summary] Gagal memuat data attendances:', err);
    attendances = [];
  }

  // Filter presensi hari ini untuk userContext yang sesuai
  const todayAtts = attendances.filter((a) => {
    if (!a) return false;
    const aDate = a.date || a.tanggal || (a.createdAt ? String(a.createdAt).slice(0, 10) : '');
    const isToday = aDate === today;
    if (!isToday) return false;

    if (userContext?.estateId && a.estateId && a.estateId !== userContext.estateId) return false;
    if (userContext?.divisionId && a.divisionId && a.divisionId !== userContext.divisionId) return false;

    return true;
  });

  // 1. Presensi Datang
  const datangList = todayAtts.filter((a) => (a.attendanceType || 'DATANG') === 'DATANG');
  const spvDatangRec = datangList.find((a) => a.type === 'SUPERVISOR');
  const spvDatangCount = spvDatangRec ? 1 : 0;

  const uniqueWrkDatang = new Map();
  datangList.filter((a) => a.type === 'WORKER').forEach((w) => {
    const k = String(w.workerId || w.workerCode || w.code || w.name || w.id).trim();
    if (k) uniqueWrkDatang.set(k, w);
  });
  const pekerjaDatangCount = uniqueWrkDatang.size;
  const totalDatang = spvDatangCount + pekerjaDatangCount;

  // 2. Presensi Pulang
  const pulangList = todayAtts.filter((a) => a.attendanceType === 'PULANG');
  const spvPulangRec = pulangList.find((a) => a.type === 'SUPERVISOR');
  const spvPulangCount = spvPulangRec ? 1 : 0;

  const uniqueWrkPulang = new Map();
  pulangList.filter((a) => a.type === 'WORKER').forEach((w) => {
    const k = String(w.workerId || w.workerCode || w.code || w.name || w.id).trim();
    if (k) uniqueWrkPulang.set(k, w);
  });
  const pekerjaPulangCount = uniqueWrkPulang.size;
  const totalPulang = spvPulangCount + pekerjaPulangCount;

  // 3. Belum Presensi Pulang
  const spvBelumPulang = (spvDatangRec && !spvPulangRec) ? 1 : 0;
  const pekerjaBelumPulang = Math.max(0, pekerjaDatangCount - pekerjaPulangCount);
  const totalBelumPulang = spvBelumPulang + pekerjaBelumPulang;

  // 4. Resolusi foto untuk seluruh transaksi hari ini secara aman
  const resolvedTxList = await Promise.all(
    todayAtts.map(async (item) => {
      const resolvedPhoto = await resolveAttendancePhoto(item);
      return {
        ...item,
        resolvedPhoto
      };
    })
  );

  let currentFilter = initialTab; // 'ALL' | 'DATANG' | 'PULANG'

  function renderView() {
    // Filter transaksi yang akan ditampilkan berdasarkan tab
    const filteredTx = resolvedTxList.filter((it) => {
      const itType = it.attendanceType || 'DATANG';
      if (currentFilter === 'DATANG') return itType === 'DATANG';
      if (currentFilter === 'PULANG') return itType === 'PULANG';
      return true; // 'ALL'
    });

    app.innerHTML = `
      <div class="page attendance-subpage" style="position: relative; display: flex; flex-direction: column; height: 100%; background: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden;">
        
        <!-- HEADER -->
        <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="sum-back" type="button" aria-label="Kembali ke Presensi" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <div style="display: flex; flex-direction: column;">
              <h1 style="font-size: 1.05rem; font-weight: 700; color: #111827; margin: 0; line-height: 1.2; letter-spacing: -0.01em;">
                Ringkasan Presensi
              </h1>
              <span style="font-size: 0.74rem; color: #64748B; font-weight: 500;">
                ${formatDisplayDate(today)}
              </span>
            </div>
          </div>
        </header>

        <!-- MAIN BODY -->
        <main class="subpage-body" style="flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Card Rekapitulasi Ringkasan -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0 0 10px 0;">
              Rekapitulasi Hari Ini
            </h2>
            <div style="display: flex; flex-direction: column; gap: 7px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.80rem; padding-bottom: 6px; border-bottom: 1px solid #F1F5F9;">
                <span style="color: #475569; font-weight: 500;">Presensi Datang</span>
                <div style="text-align: right;">
                  <span style="font-weight: 700; color: #0F172A; font-size: 0.86rem;">${totalDatang}</span>
                  <span style="color: #64748B; font-size: 0.72rem; margin-left: 4px;">(Spv: ${spvDatangCount}, Pkr: ${pekerjaDatangCount})</span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.80rem; padding-bottom: 6px; border-bottom: 1px solid #F1F5F9;">
                <span style="color: #475569; font-weight: 500;">Presensi Pulang</span>
                <div style="text-align: right;">
                  <span style="font-weight: 700; color: #0F172A; font-size: 0.86rem;">${totalPulang}</span>
                  <span style="color: #64748B; font-size: 0.72rem; margin-left: 4px;">(Spv: ${spvPulangCount}, Pkr: ${pekerjaPulangCount})</span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.80rem;">
                <span style="color: #475569; font-weight: 500;">Belum Presensi Pulang</span>
                <div style="text-align: right;">
                  <span style="font-weight: 700; color: ${totalBelumPulang > 0 ? '#B45309' : '#15803D'}; font-size: 0.86rem;">${totalBelumPulang}</span>
                  <span style="color: #64748B; font-size: 0.72rem; margin-left: 4px;">(Spv: ${spvBelumPulang}, Pkr: ${pekerjaBelumPulang})</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="summary-filter-tabs" style="display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; padding: 2px 0;">
            <button class="summary-tab-btn ${currentFilter === 'ALL' ? 'is-active' : ''}" id="tab-all" type="button">
              Semua (${resolvedTxList.length})
            </button>
            <button class="summary-tab-btn ${currentFilter === 'DATANG' ? 'is-active' : ''}" id="tab-datang" type="button">
              Presensi Datang (${datangList.length})
            </button>
            <button class="summary-tab-btn ${currentFilter === 'PULANG' ? 'is-active' : ''}" id="tab-pulang" type="button">
              Presensi Pulang (${pulangList.length})
            </button>
          </div>

          <!-- Section: Daftar Transaksi Presensi -->
          <div class="summary-tx-container">
            <div style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin-bottom: 8px;">
              Daftar Transaksi ${currentFilter === 'DATANG' ? 'Datang' : (currentFilter === 'PULANG' ? 'Pulang' : '')} (${filteredTx.length})
            </div>

            ${filteredTx.length === 0 ? `
              <div style="text-align: center; padding: 24px 16px; color: #64748B; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 10px;">
                <p style="margin: 0; font-size: 0.84rem;">Belum ada transaksi ${currentFilter === 'DATANG' ? 'Presensi Datang' : (currentFilter === 'PULANG' ? 'Presensi Pulang' : '')} untuk tanggal ini.</p>
              </div>
            ` : `
              <div class="summary-tx-list">
                ${filteredTx.map((item, idx) => {
                  const displayName = item.workerName || item.name || item.userName || 'Pekerja';
                  const displayCode = item.workerCode || item.code || item.nik || '-';
                  const displayRole = item.position || item.jabatan || (item.type === 'SUPERVISOR' ? 'Supervisor / Mantri Bibitan' : 'Pekerja Bibitan');
                  const rawTime = item.time || (item.capturedAt ? item.capturedAt.slice(11, 16) : '07:00');
                  const displayTime = rawTime.includes('WIB') ? rawTime : `${rawTime} WIB`;
                  const isDatang = (item.attendanceType || 'DATANG') === 'DATANG';
                  const displayMethod = item.method === 'REKAM_DATA_WAJAH' || item.photo ? 'Face ID / Rekam Wajah' : 'Manual';

                  return `
                    <div class="summary-tx-card" data-tx-index="${idx}">
                      <div class="summary-tx-left">
                        ${item.resolvedPhoto ? `
                          <div class="tx-photo-wrap" data-preview-idx="${idx}" role="button" tabindex="0" title="Buka foto ${esc(displayName)}" style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; flex-shrink: 0; background: #F8FAFC; cursor: pointer; position: relative;">
                            <img src="${item.resolvedPhoto}" class="tx-photo-thumbnail" alt="Bukti Foto ${esc(displayName)}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                          </div>
                        ` : `
                          <div class="tx-no-photo-badge" style="width: 50px; height: 50px; border-radius: 8px; font-size: 0.65rem; color: #94A3B8; background: #F8FAFC; border: 1px dashed #CBD5E1; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.1; padding: 2px; flex-shrink: 0; user-select: none;">
                            Foto tidak tersedia
                          </div>
                        `}
                        <div class="summary-tx-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
                          <div class="summary-tx-name" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">
                            ${esc(displayName)}
                          </div>
                          <div class="summary-tx-meta" style="font-size: 0.74rem; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${esc(displayCode)} • ${esc(displayRole)}
                          </div>
                          <div style="font-size: 0.74rem; font-weight: 600; color: #334155; margin-top: 1px;">
                            ${esc(displayTime)}
                          </div>
                          <div class="summary-tx-badges" style="display: flex; align-items: center; gap: 5px; margin-top: 4px; flex-wrap: wrap;">
                            <span class="att-type-badge ${isDatang ? 'badge-datang' : 'badge-pulang'}" style="font-size: 0.66rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; ${isDatang ? 'background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0;' : 'background: #DBEAFE; color: #1D4ED8; border: 1px solid #BFDBFE;'}">
                              ${isDatang ? 'DATANG' : 'PULANG'}
                            </span>
                            <span class="att-method-badge" style="font-size: 0.66rem; font-weight: 500; color: #475569; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 2px 6px; border-radius: 4px;">
                              ${esc(displayMethod)}
                            </span>
                            <span class="badge" style="font-size: 0.66rem; font-weight: 600; color: #166534; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 2px 6px; border-radius: 4px;">
                              ${esc(item.status || 'HADIR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </main>

        <!-- FOOTER (STRICTLY INSIDE MOBILE CONTAINER) -->
        <footer class="subpage-footer" style="flex-shrink: 0; background: #FFFFFF; padding: 12px 16px; border-top: 1px solid #E2E8F0; z-index: 10;">
          <button id="btn-back-landing" type="button" style="width: 100%; height: 42px; background: #FFFFFF; color: #116834; border: 1.5px solid #116834; border-radius: 8px; font-size: 0.86rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease;">
            Kembali ke Presensi
          </button>
        </footer>
      </div>

      <!-- Photo Preview Modal Target Container -->
      <div id="summary-photo-modal-root"></div>
    `;

    // Event Listeners
    app.querySelector('#sum-back')?.addEventListener('click', () => {
      navigate('/attendance');
    });

    app.querySelector('#btn-back-landing')?.addEventListener('click', () => {
      navigate('/attendance');
    });

    app.querySelector('#tab-all')?.addEventListener('click', () => {
      currentFilter = 'ALL';
      renderView();
    });

    app.querySelector('#tab-datang')?.addEventListener('click', () => {
      currentFilter = 'DATANG';
      renderView();
    });

    app.querySelector('#tab-pulang')?.addEventListener('click', () => {
      currentFilter = 'PULANG';
      renderView();
    });

    // Bind Photo Click Preview Modal
    app.querySelectorAll('[data-preview-idx]').forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(thumb.getAttribute('data-preview-idx'), 10);
        const targetItem = filteredTx[idx];
        if (targetItem && targetItem.resolvedPhoto) {
          openPhotoPreviewModal(targetItem);
        }
      });
    });
  }

  // Fungsi Pembuka Modal Preview Foto
  function openPhotoPreviewModal(item) {
    const modalRoot = document.getElementById('summary-photo-modal-root');
    if (!modalRoot) return;

    const displayName = item.workerName || item.name || item.userName || 'Pekerja';
    const displayCode = item.workerCode || item.code || item.nik || '-';
    const displayRole = item.position || item.jabatan || (item.type === 'SUPERVISOR' ? 'Supervisor / Mantri Bibitan' : 'Pekerja Bibitan');
    const isDatang = (item.attendanceType || 'DATANG') === 'DATANG';
    const rawTime = item.time || (item.capturedAt ? item.capturedAt.slice(11, 16) : '07:00');
    const displayTime = rawTime.includes('WIB') ? rawTime : `${rawTime} WIB`;
    const displayLoc = item.location || 'Tanah Besih - Divisi I';

    modalRoot.innerHTML = `
      <div class="photo-preview-overlay" id="photo-preview-overlay">
        <div class="photo-preview-dialog">
          <div class="photo-preview-header">
            <h3 class="photo-preview-title">Bukti Foto Presensi</h3>
            <button class="photo-preview-close-btn" id="btn-close-photo-modal" type="button" aria-label="Tutup">&times;</button>
          </div>
          <div class="photo-preview-img-wrap">
            <img src="${item.resolvedPhoto}" class="photo-preview-img" alt="Foto ${esc(displayName)}" />
          </div>
          <div class="photo-preview-meta">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 1rem; color: #0f172a;">${esc(displayName)}</strong>
              <span class="att-type-badge ${isDatang ? 'badge-datang' : 'badge-pulang'}">${isDatang ? 'DATANG' : 'PULANG'}</span>
            </div>
            <div><strong>NIK / Kode:</strong> ${esc(displayCode)}</div>
            <div><strong>Jabatan:</strong> ${esc(displayRole)}</div>
            <div><strong>Waktu:</strong> ${esc(displayTime)} • ${formatDisplayDate(item.date || item.tanggal || today)}</div>
            <div><strong>Lokasi:</strong> ${esc(displayLoc)}</div>
          </div>
        </div>
      </div>
    `;

    const closeBtn = modalRoot.querySelector('#btn-close-photo-modal');
    const overlay = modalRoot.querySelector('#photo-preview-overlay');

    const closeModal = () => {
      modalRoot.innerHTML = '';
    };

    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Render view pertama kali
  renderView();
}
