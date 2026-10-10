/**
 * js/modules/reports/returned-documents-report.js
 * Modul Laporan: Daftar Dokumen Dikembalikan
 * 
 * Fitur:
 * - Mempopulasi seluruh transaksi yang pernah dikembalikan oleh Asisten Bibitan (ASB)
 * - Memantau siklus progress: Menunggu Revisi Mantri, Sudah Diajukan Ulang, atau Telah Disetujui Ulang
 * - Menampilkan alasan pengembalian (returnReason), temuan audit, pelapor, dan timestamp
 * - Modal detail audit transaksi untuk keterlacakan lengkap
 */

import { storage } from '../../core/storage.js';
import { navigate } from '../../core/router.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import {
  getAllVerifications,
  findSourceRecord,
  VERIFICATION_10_MODULES,
  getVerificationDetailData,
  VERIFICATION_STATUS
} from '../verification/verification-manager.js';
import { renderAsbBottomNav, attachAsbBottomNavEvents } from '../../components/bottom-nav-asb.js';
import { toast } from '../../components/toast.js';

// State Filter
let currentStatusFilter = 'ALL'; // 'ALL' | 'MENUNGGU_REVISI' | 'SUDAH_DIAJUKAN' | 'TELAH_DISETUJUI'
let currentModuleFilter = 'ALL';
let searchQuery = '';
let selectedDetailDoc = null;

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimestamp(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins} WIB`;
}

/**
 * Mengambil seluruh dokumen yang pernah dikembalikan dalam scope pengguna
 */
export function getReturnedDocumentsData(userCtx) {
  const allVerifs = getAllVerifications();
  const returnedMap = new Map();

  allVerifs.forEach(v => {
    const isReturned = v.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN || Boolean(v.returnReason);
    if (!isReturned) return;

    if (userCtx?.estateId && v.estateId && v.estateId !== userCtx.estateId) return;
    if (userCtx?.divisionId && v.divisionId && v.divisionId !== userCtx.divisionId) return;

    const key = `${v.referenceType}:${v.referenceId}`;
    if (!returnedMap.has(key) || new Date(v.verifiedAt || v.createdAt || 0) > new Date(returnedMap.get(key).returnedAt || 0)) {
      returnedMap.set(key, {
        referenceType: v.referenceType,
        referenceId: v.referenceId,
        docNo: v.referenceDocNo || v.docNo || v.id || v.referenceId,
        returnReason: v.returnReason || v.notes || 'Perlu perbaikan data',
        findings: v.findings || [],
        returnedAt: v.verifiedAt || v.createdAt,
        returnedByName: v.verifiedByName || 'Asisten Bibitan',
        estateId: v.estateId,
        divisionId: v.divisionId
      });
    }
  });

  const result = [];
  returnedMap.forEach((retItem) => {
    const sourceRecord = findSourceRecord(retItem.referenceType, retItem.referenceId, userCtx);
    const mod = VERIFICATION_10_MODULES.find(m => m.id === retItem.referenceType || m.types.includes(retItem.referenceType));

    // Cek verifikasi terbaru
    const latestVerif = allVerifs
      .filter(v => v.referenceType === retItem.referenceType && String(v.referenceId) === String(retItem.referenceId))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

    let progressStatus = 'MENUNGGU_REVISI';

    if (latestVerif && (latestVerif.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI || latestVerif.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI)) {
      progressStatus = 'TELAH_DISETUJUI';
    } else if (sourceRecord) {
      const srcStatus = String(sourceRecord.status || sourceRecord.submissionStatus || '').toUpperCase();
      if (srcStatus === 'DIKEMBALIKAN' || srcStatus === 'REVISION') {
        progressStatus = 'MENUNGGU_REVISI';
      } else {
        progressStatus = 'SUDAH_DIAJUKAN';
      }
    }

    result.push({
      ...retItem,
      moduleLabel: mod ? mod.label : (retItem.referenceType || 'Operasional'),
      submittedByName: sourceRecord?.mantri || sourceRecord?.submittedByName || userCtx?.name || 'Mantri Bibitan',
      sourceRecord: sourceRecord || null,
      progressStatus
    });
  });

  return result.sort((a, b) => new Date(b.returnedAt || 0) - new Date(a.returnedAt || 0));
}

/**
 * Render Halaman Utama: Daftar Dokumen Dikembalikan
 */
export function renderReturnedDocumentsReport() {
  const app = document.getElementById('main-content') || document.getElementById('app');
  if (!app) return;

  const userCtx = getCurrentUserContext();
  const allReturned = getReturnedDocumentsData(userCtx);

  // Hitung jumlah per status progres
  const countAll = allReturned.length;
  const countPending = allReturned.filter(d => d.progressStatus === 'MENUNGGU_REVISI').length;
  const countSubmitted = allReturned.filter(d => d.progressStatus === 'SUDAH_DIAJUKAN').length;
  const countApproved = allReturned.filter(d => d.progressStatus === 'TELAH_DISETUJUI').length;

  // Filter Data
  const filteredList = allReturned.filter(item => {
    if (currentStatusFilter !== 'ALL' && item.progressStatus !== currentStatusFilter) return false;
    if (currentModuleFilter !== 'ALL' && item.moduleLabel !== currentModuleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDoc = String(item.docNo || '').toLowerCase().includes(q);
      const matchMantri = String(item.submittedByName || '').toLowerCase().includes(q);
      const matchReason = String(item.returnReason || '').toLowerCase().includes(q);
      if (!matchDoc && !matchMantri && !matchReason) return false;
    }
    return true;
  });

  // Unique modul list untuk dropdown
  const uniqueModules = Array.from(new Set(allReturned.map(d => d.moduleLabel)));

  app.innerHTML = `
    <div class="page returned-docs-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative; overflow: hidden; border-radius: inherit;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-back-to-reports" type="button" aria-label="Kembali" style="background: transparent; border: none; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0;">Daftar Dokumen Dikembalikan</h1>
        </div>
      </header>

      <!-- BODY SCROLLABLE -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- CARD FILTER STATUS PROGRES -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size: 0.76rem; font-weight: 700; color: #475569; margin-bottom: 8px;">
            Status Keterlacakan Dokumen:
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;">
            <button class="status-filter-btn" data-status="ALL" type="button"
              style="padding: 6px 12px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${currentStatusFilter === 'ALL' ? '#116834' : '#E2E8F0'}; background: ${currentStatusFilter === 'ALL' ? '#116834' : '#F8FAFC'}; color: ${currentStatusFilter === 'ALL' ? '#FFFFFF' : '#475569'};">
              Semua (${countAll})
            </button>
            <button class="status-filter-btn" data-status="MENUNGGU_REVISI" type="button"
              style="padding: 6px 12px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${currentStatusFilter === 'MENUNGGU_REVISI' ? '#DC2626' : '#E2E8F0'}; background: ${currentStatusFilter === 'MENUNGGU_REVISI' ? '#DC2626' : '#F8FAFC'}; color: ${currentStatusFilter === 'MENUNGGU_REVISI' ? '#FFFFFF' : '#475569'};">
              Menunggu Revisi (${countPending})
            </button>
            <button class="status-filter-btn" data-status="SUDAH_DIAJUKAN" type="button"
              style="padding: 6px 12px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${currentStatusFilter === 'SUDAH_DIAJUKAN' ? '#1D4ED8' : '#E2E8F0'}; background: ${currentStatusFilter === 'SUDAH_DIAJUKAN' ? '#1D4ED8' : '#F8FAFC'}; color: ${currentStatusFilter === 'SUDAH_DIAJUKAN' ? '#FFFFFF' : '#475569'};">
              Sudah Diajukan Ulang (${countSubmitted})
            </button>
            <button class="status-filter-btn" data-status="TELAH_DISETUJUI" type="button"
              style="padding: 6px 12px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${currentStatusFilter === 'TELAH_DISETUJUI' ? '#116834' : '#E2E8F0'}; background: ${currentStatusFilter === 'TELAH_DISETUJUI' ? '#116834' : '#F8FAFC'}; color: ${currentStatusFilter === 'TELAH_DISETUJUI' ? '#FFFFFF' : '#475569'};">
              Telah Disetujui (${countApproved})
            </button>
          </div>
        </div>

        <!-- SEARCH & MODUL FILTER -->
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1; position: relative;">
            <input type="text" id="ret-search-input" value="${esc(searchQuery)}" placeholder="Cari nomor dokumen / mantri..."
              style="width: 100%; height: 38px; padding: 0 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.78rem; background: #FFFFFF; box-sizing: border-box;" />
          </div>
          <select id="ret-module-select" style="height: 38px; padding: 0 8px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.76rem; background: #FFFFFF; color: #1E293B;">
            <option value="ALL">Semua Modul</option>
            ${uniqueModules.map(m => `
              <option value="${esc(m)}" ${currentModuleFilter === m ? 'selected' : ''}>${esc(m)}</option>
            `).join('')}
          </select>
        </div>

        <!-- LIST DOKUMEN DIKEMBALIKAN -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #475569;">
            Daftar Dokumen (${filteredList.length}):
          </div>

          ${filteredList.length === 0 ? `
            <div style="background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 32px 16px; text-align: center; color: #64748B;">
              <div style="display: flex; justify-content: center; margin-bottom: 8px;">
                <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1E293B" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
              </div>
              <div style="font-size: 0.88rem; font-weight: 700; color: #1E293B; margin-bottom: 4px;">Tidak Ada Dokumen Dikembalikan</div>
              <div style="font-size: 0.74rem;">Belum ada dokumen yang dikembalikan pada filter terpilih.</div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${filteredList.map((item) => {
                let badgeMarkup = '';
                if (item.progressStatus === 'MENUNGGU_REVISI') {
                  badgeMarkup = `
                    <span style="font-size: 0.68rem; font-weight: 700; background: #FEE2E2; color: #991B1B; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; white-space: nowrap;">
                      Menunggu Revisi
                    </span>
                  `;
                } else if (item.progressStatus === 'SUDAH_DIAJUKAN') {
                  badgeMarkup = `
                    <span style="font-size: 0.68rem; font-weight: 700; background: #DBEAFE; color: #1E40AF; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; white-space: nowrap;">
                      Sudah Diajukan Ulang
                    </span>
                  `;
                } else {
                  badgeMarkup = `
                    <span style="font-size: 0.68rem; font-weight: 700; background: #DEF7EC; color: #03543F; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; white-space: nowrap;">
                      Telah Disetujui
                    </span>
                  `;
                }

                return `
                  <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                      <span style="font-size: 0.88rem; font-weight: 800; color: #116834; word-break: break-all;">
                        ${esc(item.docNo)}
                      </span>
                      ${badgeMarkup}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #64748B;">
                      <span>${esc(item.moduleLabel)} &bull; ${esc(item.submittedByName)}</span>
                      <span style="font-size: 0.64rem;">${formatTimestamp(item.returnedAt)}</span>
                    </div>

                    <!-- BOX ALASAN PENGEMBALIAN -->
                    <div style="background: #FFFBEB; border-left: 3px solid #D97706; border-radius: 4px; padding: 6px 10px; margin-top: 4px;">
                      <div style="font-size: 0.66rem; font-weight: 700; color: #92400E; margin-bottom: 2px;">Alasan Pengembalian:</div>
                      <div style="font-size: 0.74rem; color: #78350F; line-height: 1.35;">${esc(item.returnReason)}</div>
                    </div>

                    <!-- ACTION BUTTON -->
                    <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
                      <button class="btn-view-ret-detail" data-doc-no="${esc(item.docNo)}" type="button"
                        style="background: transparent; border: 1px solid #CBD5E1; border-radius: 6px; padding: 4px 10px; font-size: 0.7rem; font-weight: 700; color: #475569; cursor: pointer;">
                        Lihat Rincian Data
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </main>

      <!-- DETAIL MODAL -->
      ${renderDetailModal(selectedDetailDoc, userCtx)}

      <!-- BOTTOM NAVIGATION -->
      ${renderAsbBottomNav('laporan')}

    </div>
  `;

  // Listener Kembali ke Laporan
  app.querySelector('#btn-back-to-reports')?.addEventListener('click', () => {
    navigate('/reports');
  });

  // Listener Filter Status
  app.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStatusFilter = btn.dataset.status;
      renderReturnedDocumentsReport();
    });
  });

  // Listener Search
  const searchInput = app.querySelector('#ret-search-input');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderReturnedDocumentsReport();
  });

  // Listener Dropdown Modul
  const moduleSelect = app.querySelector('#ret-module-select');
  moduleSelect?.addEventListener('change', (e) => {
    currentModuleFilter = e.target.value;
    renderReturnedDocumentsReport();
  });

  // Listener Lihat Detail
  app.querySelectorAll('.btn-view-ret-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const docNo = btn.dataset.docNo;
      selectedDetailDoc = allReturned.find(d => d.docNo === docNo) || null;
      renderReturnedDocumentsReport();
    });
  });

  // Listener Tutup Modal
  const closeModal = () => {
    selectedDetailDoc = null;
    renderReturnedDocumentsReport();
  };

  app.querySelectorAll('.btn-close-ret-modal').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  const overlayEl = app.querySelector('#modal-ret-overlay');
  overlayEl?.addEventListener('click', (e) => {
    if (e.target === overlayEl) {
      closeModal();
    }
  });

  attachAsbBottomNavEvents(app);
}

/**
 * Render Modal Rincian Dokumen Dikembalikan (Terkunci di dalam Frame HP)
 */
function renderDetailModal(docItem, userCtx) {
  if (!docItem) return '';

  const norm = docItem.sourceRecord
    ? getVerificationDetailData(docItem.sourceRecord, userCtx, docItem.referenceType)
    : { title: docItem.moduleLabel, fields: [] };

  const detailRows = (norm.fields || []).map(f => `
    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #F1F5F9; font-size: 0.74rem;">
      <span style="color: #64748B;">${esc(f.label)}</span>
      <strong style="color: ${f.highlight ? '#116834' : '#0F172A'}; text-align: right;">${f.value}</strong>
    </div>
  `).join('');

  return `
    <div id="modal-ret-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; backdrop-filter: blur(1.5px);">
      <div style="background: #FFFFFF; border-radius: 16px 16px 0 0; width: 100%; max-height: 82%; overflow-y: auto; padding: 18px 16px 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 -4px 16px rgba(0,0,0,0.18);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 10px;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #111827;">Rincian Dokumen Dikembalikan</div>
            <div style="font-size: 0.74rem; font-weight: 700; color: #116834; margin-top: 1px;">${esc(docItem.docNo)}</div>
          </div>
          <button class="btn-close-ret-modal" type="button" aria-label="Tutup" style="background: #F1F5F9; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 1rem; font-weight: bold;">
            &times;
          </button>
        </div>

        <!-- ALASAN RETURN BOX -->
        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.7rem; font-weight: 800; color: #92400E; margin-bottom: 2px;">Catatan Pengembalian Asisten:</div>
          <div style="font-size: 0.76rem; color: #78350F; line-height: 1.4;">${esc(docItem.returnReason)}</div>
          <div style="font-size: 0.65rem; color: #B45309; margin-top: 4px;">Oleh: ${esc(docItem.returnedByName)} &bull; ${formatTimestamp(docItem.returnedAt)}</div>
        </div>

        <!-- RINCIAN DATA -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #111827; margin-bottom: 6px; border-bottom: 1px solid #F1F5F9; padding-bottom: 4px;">
            Rincian Transaksi
          </div>
          ${detailRows || '<div style="font-size: 0.72rem; color: #94A3B8;">Tidak ada data rincian tambahan.</div>'}
        </div>

        <button class="btn-close-ret-modal" type="button" style="width: 100%; height: 42px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; margin-top: 4px;">
          Tutup
        </button>
      </div>
    </div>
  `;
}
