/**
 * modules/maintenance/nursery-activity.js — Modul Rekam Pemeliharaan Pembibitan.
 * 
 * 1. Landing Page (#/nursery-activity):
 *    - Menampilkan menu kartu Rekam Aktivitas Harian dan Rekam Aktivitas Mandoran.
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

import { navigate, getParams } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { todayISO, todayDDMMYYYY, esc } from '../../core/utils.js';
import { isTransactionLockedForMantri } from '../verification/mantri-confirmation-service.js';
import { attendanceRepository } from '../../db/repositories.js';
import { assertAttendanceGateOrThrow } from '../../core/attendance-gate-service.js';
import { getCfnaByCode, getCfnaByName, getCfnaActivityMappings, getActiveCfnaMaster, getAllCfnaMaster, MAPPING_STATUS, CFNA_STATUS } from '../../data/cfna-master.js';
import {
  normalizeDateStr,
  renderCalendarHeaderButton,
  renderDateFilterBannerHtml,
  renderDatePickerModalHtml,
  attachDatePickerModalEvents
} from '../../components/date-filter-modal.js';

let selectedActivityDate = todayDDMMYYYY();

export function setSelectedActivityDate(dateStr) {
  selectedActivityDate = normalizeDateStr(dateStr) || todayDDMMYYYY();
}

export function getSelectedActivityDate() {
  return selectedActivityDate;
}
import {
  getWorkersForUserContext,
  getWorkerById,
  isWorkerInScope,
  isWorkerActive
} from '../../data/worker-master.js';
import { applyTransactionActor, resolveTransactionActor } from '../../core/transaction-actor.js';
import { getCurrentUserContext, resolveUserContext, ROLES, SCOPE_TYPES, normalizeRole } from '../../core/user-context.js';
import {
  BLOCK_MASTER,
  BLOCK_STATUS,
  getAllBlocks,
  getActiveBlocks,
  getBlockById,
  getBlockByCode,
  getBlocksByEstate,
  getBlocksByDivision,
  resolveBlock
} from '../../data/block-master.js';
import { getOpenPrograms, getProgramById } from '../../data/program-master.js';
import { getWorkAllocationByCode, WORK_ALLOCATION_MASTER } from '../../data/work-allocation-master.js';

export function getMaintenanceActivities() {
  return getActiveCfnaMaster().map(c => ({
    kode: c.code,
    nama: c.name,
    id: c.id
  }));
}

export const MASTER_AKTIVITAS = getMaintenanceActivities();

/**
 * @deprecated MASTER_PROGRAM_PEMBIBITAN digantikan oleh getOpenPrograms({ estateId }) dari program-master.js
 */
export const MASTER_PROGRAM_PEMBIBITAN = Object.freeze([
  'PRG/NUR/01/2026',
  'PRG/NUR/02/2027',
  'PRG/NUR/03/2028',
  'PRG/NUR/08/2029'
]);

/**
 * @deprecated MASTER_LOKASI_BLOK sudah dinonaktifkan dari production logic. Gunakan js/data/block-master.js.
 */
export const MASTER_LOKASI_BLOK = Object.freeze([]);

/**
 * Mengambil daftar Block aktif untuk modul Nursery Activity berdasarkan User Context.
 * Mengutamakan Division scope jika tersedia, lalu Estate scope, atau seluruh Active Blocks.
 * @param {Object} [userContext] - User context (default: getCurrentUserContext())
 * @returns {Array<Object>} List of active block objects from Block Master
 */
export function getBlocksForNurseryActivity(userContext = null) {
  if (userContext === null) {
    return getActiveBlocks();
  }
  const ctx = resolveUserContext(userContext);
  
  if (ctx?.scopeType === SCOPE_TYPES.ESTATE && ctx.estateId) {
    const estBlocks = getBlocksByEstate(ctx.estateId);
    if (estBlocks && estBlocks.length > 0) {
      return estBlocks.filter(b => b.status === BLOCK_STATUS.ACTIVE);
    }
  }

  if (ctx?.divisionId && ctx.divisionId !== 'DIV-ALL' && ctx.divisionId !== 'DIV-APM' && ctx.scopeType !== SCOPE_TYPES.ESTATE) {
    const divBlocks = getBlocksByDivision(ctx.divisionId);
    if (divBlocks && divBlocks.length > 0) {
      return divBlocks.filter(b => b.status === BLOCK_STATUS.ACTIVE);
    }
  }

  if (ctx?.estateId) {
    const estBlocks = getBlocksByEstate(ctx.estateId);
    if (estBlocks && estBlocks.length > 0) {
      return estBlocks.filter(b => b.status === BLOCK_STATUS.ACTIVE);
    }
  }

  return getActiveBlocks();
}

/**
 * Normalisasi dan resolusi informasi lokasi blok dari transaksi (legacy atau baru).
 * @param {Object|string} lokasiBlok
 * @returns {Object|null}
 */
export function resolveLokasiBlok(lokasiBlok) {
  if (!lokasiBlok) return null;

  // Jika sudah memiliki blockId, resolve dari Block Master
  if (typeof lokasiBlok === 'object' && lokasiBlok.blockId) {
    const master = getBlockById(lokasiBlok.blockId);
    if (master) {
      const totalArea = Math.round(((master.maturedArea || 0) + (master.immatureArea || 0)) * 100) / 100;
      return {
        blockId: master.id,
        blockCode: master.blockCode,
        blockName: master.blockName,
        divisionCode: master.divisionCode,
        divisionName: master.divisionName,
        estateCode: master.estateCode,
        estateName: master.estateName,
        cloneName: master.cloneName,
        maturedArea: master.maturedArea,
        immatureArea: master.immatureArea,
        luas: totalArea || master.maturedArea,
        luasHa: totalArea || master.maturedArea,
        blok: master.blockName,
        isLegacy: false
      };
    }
    return { ...lokasiBlok, isLegacy: false };
  }

  // Jika string atau object legacy (mis. { blok: 'Block 031/04', luas: 39.68 })
  const rawString = typeof lokasiBlok === 'string' ? lokasiBlok : (lokasiBlok.blok || lokasiBlok.blockCode || lokasiBlok.name || '');
  const matchedMaster = resolveBlock(rawString);
  if (matchedMaster) {
    const totalArea = Math.round(((matchedMaster.maturedArea || 0) + (matchedMaster.immatureArea || 0)) * 100) / 100;
    return {
      blockId: matchedMaster.id,
      blockCode: matchedMaster.blockCode,
      blockName: matchedMaster.blockName,
      divisionCode: matchedMaster.divisionCode,
      divisionName: matchedMaster.divisionName,
      estateCode: matchedMaster.estateCode,
      estateName: matchedMaster.estateName,
      cloneName: matchedMaster.cloneName,
      maturedArea: matchedMaster.maturedArea,
      immatureArea: matchedMaster.immatureArea,
      luas: totalArea || matchedMaster.maturedArea,
      luasHa: totalArea || matchedMaster.maturedArea,
      blok: matchedMaster.blockName,
      isLegacy: false
    };
  }

  // Fallback data legacy yang tidak terpetakan di master aktif
  return {
    blockId: null,
    blockCode: rawString || '-',
    blockName: rawString || '-',
    divisionCode: typeof lokasiBlok === 'object' ? (lokasiBlok.divisionCode || null) : null,
    divisionName: typeof lokasiBlok === 'object' ? (lokasiBlok.divisionName || null) : null,
    estateCode: typeof lokasiBlok === 'object' ? (lokasiBlok.estateCode || null) : null,
    estateName: typeof lokasiBlok === 'object' ? (lokasiBlok.estateName || null) : null,
    cloneName: typeof lokasiBlok === 'object' ? (lokasiBlok.cloneName || null) : null,
    luas: typeof lokasiBlok === 'object' ? (lokasiBlok.luas || 0) : 0,
    luasHa: typeof lokasiBlok === 'object' ? (lokasiBlok.luas || 0) : 0,
    blok: rawString || '-',
    isLegacy: true
  };
}


/**
 * Mengambil daftar CFNA yang terkonfirmasi (CONFIRMED) dan aktif untuk aktivitas tertentu.
 * @param {Object|string} activity
 * @returns {Array<Object>}
 */
export function getConfirmedCfnaForActivity(activity) {
  if (!activity) return [];
  const code = typeof activity === 'string' ? activity : (activity.kode || activity.code || '');
  const actName = (typeof activity === 'string' ? activity : (activity.nama || activity.name || '')).trim().toLowerCase();
  
  // 1. Direct code lookup
  if (code && /^[0-9A-Za-z]+$/.test(code)) {
    const direct = getCfnaByCode(code);
    if (direct && direct.status === CFNA_STATUS.ACTIVE) {
      return [direct];
    }
  }

  let targetType = null;
  if (actName.includes('penyiraman')) {
    targetType = 'PENYIRAMAN';
  } else if (actName.includes('seleksi')) {
    targetType = 'SELEKSI_BIBIT';
  } else if (actName.includes('pemupukan')) {
    targetType = 'PEMUPUKAN';
  } else if (actName.includes('gulma')) {
    targetType = 'PENGENDALIAN_GULMA';
  } else if (actName.includes('hama') || actName.includes('penyakit')) {
    targetType = 'PENGENDALIAN_HAMA_PENYAKIT';
  }

  if (!targetType) return [];

  const mappings = getCfnaActivityMappings();
  const confirmedMappings = mappings.filter(
    (m) => m.targetActivityType === targetType && m.mappingStatus === MAPPING_STATUS.CONFIRMED
  );

  const results = [];
  for (const map of confirmedMappings) {
    const master = getCfnaByCode(map.cfnaCode);
    if (master && master.status === CFNA_STATUS.ACTIVE) {
      results.push(master);
    }
  }

  return results;
}

/**
 * Memeriksa apakah suatu transaksi dimiliki oleh user context tertentu (Primary Key: createdByUserId).
 * @param {Object} record - Transaction record
 * @param {Object} [userContext] - User context (default: getCurrentUserContext())
 * @returns {boolean}
 */
export function isTransactionOwnedByUser(record, userContext = null) {
  if (!record || typeof record !== 'object') return false;
  
  const ctx = userContext ? resolveUserContext(userContext) : getCurrentUserContext();
  const actor = resolveTransactionActor(record);

  // Legacy record tanpa explicit creator snapshot tidak dianggap dimiliki
  if (actor.isLegacy || !record.createdByUserId) {
    return false;
  }

  // Set ID valid untuk user saat ini
  const validUserIds = new Set([
    ctx.id,
    ctx.code,
    ctx.userId,
    ctx.loginCode
  ].filter(Boolean));

  // Identitas pembuat transaksi
  const recordCreatorIds = [
    record.createdByUserId,
    record.createdByLoginCode,
    actor.userId,
    actor.loginCode
  ].filter(Boolean);

  const isOwner = recordCreatorIds.some(id => validUserIds.has(id));
  if (!isOwner) return false;

  // Secondary safety check: Estate mismatch
  if (record.createdByEstateId && ctx.estateId && record.createdByEstateId !== ctx.estateId) {
    return false;
  }

  return true;
}

/**
 * Memeriksa apakah suatu transaksi berhak dilihat oleh user context tertentu berdasarkan kepemilikan dan scope role.
 * @param {Object} record - Transaction record
 * @param {Object} [userContext] - User context (default: getCurrentUserContext())
 * @returns {boolean}
 */
export function isTransactionVisibleToUser(record, userContext = null) {
  if (!record || typeof record !== 'object') return false;
  
  const ctx = userContext ? resolveUserContext(userContext) : getCurrentUserContext();
  const normalizedRole = normalizeRole(ctx.role || ctx.rawRole);

  // Role operasional / input lapangan (MANTRI_TANAMAN, ASISTEN_BIBITAN, ASISTEN):
  // Default adalah personal ownership (hanya transaksi milik sendiri)
  if (
    normalizedRole === ROLES.MANTRI_TANAMAN ||
    normalizedRole === ROLES.ASISTEN_BIBITAN ||
    normalizedRole === ROLES.ASISTEN
  ) {
    return isTransactionOwnedByUser(record, ctx);
  }

  // Role pengawas / manajerial (PENGURUS, ASKEP, KTU):
  // Scope Estate: melihat transaksi dalam satu Estate mereka
  if (
    normalizedRole === ROLES.PENGURUS ||
    normalizedRole === ROLES.ASKEP ||
    normalizedRole === ROLES.KTU
  ) {
    const actor = resolveTransactionActor(record);
    if (!actor.isLegacy && actor.estateId && ctx.estateId) {
      return actor.estateId === ctx.estateId;
    }
    return false;
  }

  return isTransactionOwnedByUser(record, ctx);
}

/**
 * Mengambil daftar transaksi pemeliharaan yang berhak dilihat oleh user saat ini.
 * @param {Array<Object>} records - Raw list of records
 * @param {Object} [userContext] - Opsional, default getCurrentUserContext()
 * @returns {Array<Object>} Filtered visible records
 */
export function getVisibleMaintenanceRecords(records, userContext = null) {
  if (!Array.isArray(records)) return [];
  const ctx = userContext ? resolveUserContext(userContext) : getCurrentUserContext();
  return records.filter((rec) => isTransactionVisibleToUser(rec, ctx));
}

/**
 * Mencari transaksi pemeliharaan berdasarkan query teks dengan isolasi hak akses data.
 * @param {Array<Object>} records - Raw list of records
 * @param {string} query - Query pencarian
 * @param {Object} [userContext] - User context
 * @returns {Array<Object>} Filtered and matched records
 */
export function filterMaintenanceRecordsByQuery(records, query, userContext = null) {
  const visible = getVisibleMaintenanceRecords(records, userContext);
  if (!query || typeof query !== 'string' || !query.trim()) {
    return visible;
  }
  const q = query.trim().toLowerCase();
  return visible.filter((r) => {
    const doc = (r.docNo || '').toLowerCase();
    const aktName = (r.aktivitas?.nama || '').toLowerCase();
    const aktCode = (r.aktivitas?.kode || '').toLowerCase();
    const cfnaName = (r.allocationName || '').toLowerCase();
    const cfnaCode = (r.allocationCode || '').toLowerCase();
    const prog = (r.program || '').toLowerCase();
    const blok = (r.lokasiBlok?.blok || r.lokasiBlok?.blockName || r.lokasiBlok?.blockCode || '').toLowerCase();
    const clone = (r.lokasiBlok?.cloneName || '').toLowerCase();
    return (
      doc.includes(q) ||
      aktName.includes(q) ||
      aktCode.includes(q) ||
      cfnaName.includes(q) ||
      cfnaCode.includes(q) ||
      prog.includes(q) ||
      blok.includes(q) ||
      clone.includes(q)
    );
  });
}

/**
 * Mengambil satu record transaksi pemeliharaan secara aman dengan validasi izin akses/detail.
 * @param {string} idOrDocNo - ID atau No Dokumen transaksi
 * @param {Object} [userContext] - User context
 * @returns {Object|null} Record transaksi jika berhak, atau null jika ditolak/tidak ditemukan
 */
export function getMaintenanceRecordById(idOrDocNo, userContext = null) {
  if (!idOrDocNo) return null;
  const ctx = userContext ? resolveUserContext(userContext) : getCurrentUserContext();
  const allRecords = storage.get('nursery_activity_records', []);
  const record = allRecords.find((r) => r.id === idOrDocNo || r.docNo === idOrDocNo);
  if (!record) return null;

  if (isTransactionVisibleToUser(record, ctx)) {
    return record;
  }
  return null;
}

/**
 * Menghapus record transaksi pemeliharaan dengan validasi kepemilikan.
 * @param {string} idOrDocNo - ID atau No Dokumen transaksi
 * @param {Object} [userContext] - User context
 * @returns {boolean} True jika berhasil dihapus, false jika gagal/tidak berhak
 */
export function deleteMaintenanceRecord(idOrDocNo, userContext = null) {
  if (!idOrDocNo) return false;
  const ctx = userContext ? resolveUserContext(userContext) : getCurrentUserContext();
  const allRecords = storage.get('nursery_activity_records', []);
  const targetIdx = allRecords.findIndex((r) => r.id === idOrDocNo || r.docNo === idOrDocNo);
  if (targetIdx === -1) return false;

  const targetRecord = allRecords[targetIdx];
  if (!isTransactionOwnedByUser(targetRecord, ctx)) {
    return false;
  }

  if (isTransactionLockedForMantri(targetRecord) || targetRecord.mandoranConsolidationId) {
    return false;
  }

  allRecords.splice(targetIdx, 1);
  storage.set('nursery_activity_records', allRecords);
  return true;
}

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

  const userCtx = getCurrentUserContext();
  const allRecords = storage.get('nursery_activity_records', []);
  const records = getVisibleMaintenanceRecords(allRecords, userCtx);

  const todayStr = todayDDMMYYYY();
  const isFiltered = selectedActivityDate !== todayStr;

  const filteredRecords = records.filter(rec => {
    const recDate = normalizeDateStr(rec.createdAt || rec.tanggal || rec.date || rec.activityDate);
    return recDate === selectedActivityDate;
  });

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
        <div style="display: flex; align-items: center; gap: 8px; margin-right: -4px;">
          <button id="btn-refresh" type="button" aria-label="Segarkan" style="background: none; border: none; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          ${renderCalendarHeaderButton(selectedActivityDate, isFiltered, 'btn-calendar-activity')}
        </div>
      </header>

      <!-- CONTENT -->
      <main style="flex: 1; padding: 16px; overflow-y: auto;">
        
        <!-- MENU KARTU REKAM AKTIVITAS -->
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
              Rekam Aktivitas<br>Harian
            </span>
          </button>

          <button id="card-rekam-aktivitas-mandoran" type="button" class="beranda-menu-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; width: 96px; height: 115px; padding: 8px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03); cursor: pointer; text-align: center; box-sizing: border-box; transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative;">
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
              Rekam Aktivitas<br>Mandoran
            </span>
          </button>

        </div>

        <!-- FILTER INDICATOR BANNER IF NOT TODAY -->
        ${renderDateFilterBannerHtml(selectedActivityDate, isFiltered, 'btn-reset-date-activity')}

        <!-- RINGKASAN DATA TRANSAKSI PEMELIHARAAN -->
        <div style="padding: 12px 0 16px 0;">
          <div style="margin-bottom: 12px;">
            <h2 style="font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0;">
              Ringkasan Data Transaksi (${filteredRecords.length})
            </h2>
          </div>

          ${filteredRecords.length > 0 ? filteredRecords.map((rec, idx) => {
            const actor = resolveTransactionActor(rec);
            const displayDocNo = rec.activityEntryMode === 'MANDORAN'
              ? (rec.workGroupRoleCode || rec.docNo || `ACT/NUR/2026/0${idx + 1}`)
              : (rec.docNo || `ACT/NUR/2026/0${idx + 1}`);
            return `
            <div style="border: 1px solid #D9D9D9; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #FFFFFF; position: relative;">
              
              <!-- HEADER BARIS 1: NO DOKUMEN & BADGE -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.95rem; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${esc(displayDocNo)}
                  </div>
                  <div style="font-size: 0.8rem; color: #999999; margin-top: 4px;">
                    ${formatDateDDMMYYYY(rec.createdAt || new Date().toISOString())}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0; position: relative;">
                  ${rec.activityEntryMode === 'MANDORAN' ? '' : `
                    <span style="background: #E8F5E9; color: #116834; font-size: 0.7rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; white-space: nowrap; border: 1px solid #116834; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
                      ${rec.aktivitas?.nama || 'Pemeliharaan'}
                    </span>
                  `}
                  ${(() => {
                    const isLocked = isTransactionLockedForMantri(rec) || !!rec.mandoranConsolidationId;
                    if (!isLocked) {
                      return `
                        <button class="btn-card-menu-activity" data-index="${idx}" style="background: none; border: none; padding: 4px; margin-right: -4px; cursor: pointer; color: #111;">
                          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                          </svg>
                        </button>
                        <div class="card-popover-activity" id="popover-activity-${idx}" style="display: none; position: absolute; top: 28px; right: 0; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); width: 120px; z-index: 20; flex-direction: column; overflow: hidden;">
                          <button class="btn-popover-activity-hapus" data-index="${idx}" data-id="${esc(rec.id || '')}" data-doc="${esc(displayDocNo)}" style="padding: 12px 16px; text-align: left; background: #FFFFFF; border: none; font-size: 0.88rem; font-weight: 600; color: #DC2626; cursor: pointer;">
                            Hapus
                          </button>
                        </div>
                      `;
                    } else {
                      return `
                        <span style="font-size: 0.65rem; font-weight: 700; color: #64748B; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 7px; border-radius: 4px;">
                          ${rec.status === 'DISETUJUI' || rec.verificationStatus === 'TERVERIFIKASI' ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                        </span>
                      `;
                    }
                  })()}
                </div>
              </div>

              <!-- DIVIDER -->
              <hr style="border: none; border-top: 1px solid #EFEFEF; margin: 12px 0;" />

              <!-- IDENTITAS PROGRAM -->
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; gap: 10px;">
                <span style="font-size: 0.80rem; color: #64748B; flex-shrink: 0;">
                  Program Pembibitan
                </span>
                <span style="font-weight: 700; font-size: 0.88rem; color: #111111; min-width: 0; text-align: right; overflow-wrap: anywhere;">
                  ${esc(rec.program || 'Nursery Program 2023')}
                </span>
              </div>

              <!-- ACCORDION CONTENT DETAIL -->
              <div class="card-details-content" style="display: none; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Kode Aktivitas</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #116834; text-align: right;">${rec.aktivitas?.kode || '-'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">${rec.activityEntryMode === 'MANDORAN' ? 'Alokasi Kerja Mandoran' : 'Alokasi CFNA'}</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right;">
                    ${rec.allocationCode ? `${esc(rec.allocationCode)} - ${esc(rec.allocationName || '-')}` : 'Tidak ada alokasi'}
                  </span>
                </div>
                ${rec.lokasiBlok && rec.lokasiBlok.blok ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Lokasi Blok</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right;">${rec.lokasiBlok.blok} (${rec.lokasiBlok.luas || '-'} HA)</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Jumlah Pekerja</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right;">${rec.pekerja?.length || 0} Orang</span>
                </div>
                ${actor && actor.name ? `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                    <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Dicatat Oleh</span>
                    <span style="font-size: 0.85rem; font-weight: 600; color: #475569; text-align: right;">${actor.name} (${actor.position})</span>
                  </div>
                ` : ''}
                ${(rec.pekerja && rec.pekerja.length > 0) ? `
                  <div style="margin-top: 4px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
                    ${rec.activityEntryMode === 'MANDORAN' ? `
                      <div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; padding: 0 0 5px; border-bottom: 1px solid #E2E8F0; font-size: 0.76rem; font-weight: 800; color: #475569;">
                        <span>Pekerja</span><span style="text-align: right;">Hasil</span>
                      </div>
                      <div style="display: flex; flex-direction: column;">
                        ${rec.pekerja.map((w, workerIdx) => `
                          <div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; column-gap: 12px; padding: 6px 0; ${workerIdx < rec.pekerja.length - 1 ? 'border-bottom: 1px solid #F1F5F9;' : ''}">
                            <span style="min-width: 0; overflow-wrap: anywhere; font-size: 0.80rem; line-height: 1.35; font-weight: 600; color: #1E293B;">${esc(w.code || w.workerCode || '')}-${esc(w.name || w.workerName || '')}</span>
                            <span style="white-space: nowrap; text-align: right; font-size: 0.80rem; line-height: 1.35; font-weight: 700; color: #116834;">${Number(w.inputHasil || 0).toLocaleString('id-ID')} ${esc(rec.uomCode || rec.uom || '')}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <div style="font-size: 0.78rem; font-weight: 700; color: #64748B; margin-bottom: 4px;">Pekerja:</div>
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        ${rec.pekerja.map(w => `
                          <div style="font-size: 0.82rem; line-height: 1.35; font-weight: 600; color: #1E293B; overflow-wrap: anywhere;">
                            ${esc(w.code || w.workerCode || '')}-${esc(w.name || w.workerName || '')}
                          </div>
                        `).join('')}
                      </div>
                    `}
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
          `;}).join('') : renderEmptyStateCard({
            title: `Belum ada Dokumen Pemeliharaan pada ${isFiltered ? selectedActivityDate : 'hari ini'}`,
            description: 'Pilih menu Rekam Aktivitas Harian atau Mandoran untuk memulai pencatatan'
          })}

        </div>

        <!-- MODAL DATE PICKER -->
        ${renderDatePickerModalHtml({
          modalId: 'modal-activity-date-picker',
          inputId: 'input-activity-filter-date',
          activeDate: selectedActivityDate,
          title: 'Pilih Tanggal Pemeliharaan'
        })}

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

  // Attach Date Picker Events
  attachDatePickerModalEvents({
    app,
    modalId: 'modal-activity-date-picker',
    btnCalendarId: 'btn-calendar-activity',
    inputId: 'input-activity-filter-date',
    resetBtnId: 'btn-reset-date-activity',
    emptyResetBtnId: 'btn-empty-reset-activity',
    getActiveDate: () => selectedActivityDate,
    onDateSelected: (newDate) => {
      selectedActivityDate = newDate;
      renderNurseryActivityLanding();
    },
    onResetToday: () => {
      selectedActivityDate = todayDDMMYYYY();
      renderNurseryActivityLanding();
    }
  });

  // Card Navigation
  const cardMenus = app.querySelectorAll('#card-rekam-aktivitas, #card-rekam-aktivitas-mandoran');
  cardMenus.forEach((cardMenu) => {
    cardMenu.addEventListener('mouseenter', () => {
      cardMenu.style.transform = 'translateY(-2px)';
      cardMenu.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
    });
    cardMenu.addEventListener('mouseleave', () => {
      cardMenu.style.transform = 'translateY(0)';
      cardMenu.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
    });
    cardMenu.addEventListener('click', () => {
      if (cardMenu.id === 'card-rekam-aktivitas-mandoran') {
        navigate('/nursery-activity/mandoran');
      } else {
        navigate('/nursery-activity/form');
      }
    });
  });

  // Modal Dialog Hapus
  const deleteOverlay = app.querySelector('#modal-delete-activity-overlay');
  const deleteDialog = app.querySelector('#dialog-delete-activity');
  const deleteMsg = app.querySelector('#dialog-delete-activity-msg');
  const btnCancelDelete = app.querySelector('#btn-cancel-delete-act');
  const btnConfirmDelete = app.querySelector('#btn-confirm-delete-act');
  let pendingDeleteDocNo = null;
  let pendingDeleteId = null;

  const closeDeleteDialog = () => {
    if (deleteOverlay) deleteOverlay.style.display = 'none';
    if (deleteDialog) deleteDialog.style.display = 'none';
    pendingDeleteDocNo = null;
    pendingDeleteId = null;
  };

  btnCancelDelete?.addEventListener('click', closeDeleteDialog);
  deleteOverlay?.addEventListener('click', closeDeleteDialog);

  btnConfirmDelete?.addEventListener('click', () => {
    const targetIdOrDoc = pendingDeleteId || pendingDeleteDocNo;
    const allRecords = storage.get('nursery_activity_records', []);
    const target = allRecords.find((r) => r.id === targetIdOrDoc || r.docNo === targetIdOrDoc);
    if (target && isTransactionLockedForMantri(target)) {
      toast('Transaksi terkunci karena sedang/sudah diverifikasi.', 'warning');
      closeDeleteDialog();
      return;
    }
    const success = deleteMaintenanceRecord(targetIdOrDoc, userCtx);
    if (success) {
      toast('Dokumen aktivitas berhasil dihapus.', 'info');
    } else {
      toast('Anda tidak memiliki hak untuk menghapus dokumen ini atau transaksi terkunci.', 'error');
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

        pendingDeleteDocNo = e.currentTarget.dataset.doc;
        pendingDeleteId = e.currentTarget.dataset.id;

        if (deleteMsg) {
          deleteMsg.textContent = `Apakah Anda yakin ingin menghapus data dokumen "${pendingDeleteDocNo}"? Data yang dihapus tidak dapat dipulihkan kembali.`;
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
// 1B. DAFTAR ALOKASI MANDORAN
// ==========================================
export function renderNurseryActivityMandoranList() {
  const app = document.getElementById('app');
  if (!app) return;

  const mandoranItems = WORK_ALLOCATION_MASTER.filter(item =>
    item.allocationCode && item.allocationName && item.workGroupRoleCode && item.workGroupRoleName
  );

  app.innerHTML = `
    <div class="page nursery-activity-landing-page" style="position: relative; display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden;">
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <button id="btn-back-mandoran-list" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style="font-size: 1.08rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">Rekam Aktivitas Mandoran</h1>
      </header>
      <main style="flex: 1; overflow-y: auto; padding: 18px 16px 24px;">
        <h2 style="font-size: 0.98rem; font-weight: 700; color: #111827; margin: 0 0 12px;">Pilih Daftar Mandoran:</h2>
        <div style="position: relative; margin-bottom: 12px;">
          <input id="search-mandoran-allocation" type="search" placeholder="Cari kode atau nama alokasi mandoran..." aria-label="Cari daftar mandoran" style="width: 100%; height: 42px; box-sizing: border-box; padding: 0 40px 0 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; color: #1F2937; font-size: 0.84rem; outline: none;">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#64748B" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;">
            <circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16" y2="16"></line>
          </svg>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${mandoranItems.length ? mandoranItems.map(item => `
            <button type="button" class="mandoran-allocation-item" data-allocation-code="${esc(item.allocationCode)}" data-search="${esc(`${item.allocationCode} ${item.allocationName} ${item.workGroupRoleCode} ${item.workGroupRoleName}`.toLowerCase())}" style="width: 100%; text-align: left; padding: 12px 14px; background: #FFFFFF; border: 1px solid #D9E2EC; border-radius: 9px; cursor: pointer; box-shadow: 0 1px 2px rgba(15,23,42,0.04);">
              <span style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.88rem; font-weight: 700; color: #116834;">
                <span>${esc(item.allocationCode)} - ${esc(item.allocationName)}</span>
                <span aria-hidden="true" style="font-size: 1.15rem; flex-shrink: 0;">›</span>
              </span>
              <span style="display: block; margin-top: 5px; font-size: 0.77rem; color: #64748B;">${esc(item.workGroupRoleCode)}</span>
            </button>
          `).join('') : renderEmptyStateCard({
            title: 'Daftar Mandoran belum tersedia',
            description: 'Master alokasi kerja belum memiliki Allocation Code dan Work Group Role yang lengkap.'
          })}
          ${mandoranItems.length ? `<div id="empty-search-mandoran" style="display: none; padding: 18px 14px; text-align: center; color: #64748B; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 9px; font-size: 0.82rem;">Tidak ada alokasi mandoran yang cocok dengan pencarian.</div>` : ''}
        </div>
      </main>
    </div>
  `;

  app.querySelector('#btn-back-mandoran-list')?.addEventListener('click', () => navigate('/nursery-activity'));
  const searchInput = app.querySelector('#search-mandoran-allocation');
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    app.querySelectorAll('.mandoran-allocation-item').forEach(button => {
      const isMatch = !query || button.dataset.search.includes(query);
      button.style.display = isMatch ? 'block' : 'none';
      if (isMatch) visibleCount += 1;
    });
    const emptySearch = app.querySelector('#empty-search-mandoran');
    if (emptySearch) emptySearch.style.display = visibleCount === 0 ? 'block' : 'none';
  });
  app.querySelectorAll('.mandoran-allocation-item').forEach(button => {
    button.addEventListener('click', () => {
      const code = button.dataset.allocationCode;
      navigate(`/nursery-activity/form?mode=mandoran&allocationCode=${encodeURIComponent(code)}`);
    });
  });
}

// ==========================================
// 2. FORM PAGE (#/nursery-activity/form)
// ==========================================
export async function renderNurseryActivityForm({ params = getParams() } = {}) {
  const app = document.getElementById('app');
  if (!app) return;

  const isMandoranMode = params.mode === 'mandoran';
  const selectedWorkAllocation = isMandoranMode ? getWorkAllocationByCode(params.allocationCode) : null;
  if (isMandoranMode && (!selectedWorkAllocation?.workGroupRoleCode || !selectedWorkAllocation?.workGroupRoleName)) {
    toast('Alokasi mandoran tidak ditemukan atau data Work Group Role belum lengkap.', 'error');
    navigate('/nursery-activity/mandoran', { replace: true });
    return;
  }

  const userCtx = getCurrentUserContext();
  const activeWorkers = await attendanceRepository.getWorkersWithDatangAttendance(userCtx, todayISO());
  const hasPresentWorkers = activeWorkers.length > 0;
  const openPrograms = getOpenPrograms({ estateId: userCtx?.estateId });

  const availableAktivitas = getActiveCfnaMaster();
  let selectedAktivitasCode = availableAktivitas[0]?.code || '122171';
  const initialProgram = openPrograms[0] || null;
  let selectedProgramId = initialProgram ? initialProgram.id : null;
  let selectedProgramCode = initialProgram ? initialProgram.code : null;
  const workerSelectionState = {};
  const workerResultState = {};
  const removedWorkerIds = new Set();
  activeWorkers.forEach((w) => {
    workerSelectionState[w.id] = false;
    workerResultState[w.id] = '';
  });

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
            ${isMandoranMode ? 'Pencatatan Hasil Mandoran' : 'Pencatatan Hasil'}
          </h1>
        </div>
      </header>

      <!-- CONTENT BODY (SCROLLABLE) -->
      <main style="flex: 1; overflow-y: auto; padding: 14px 16px 24px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- CARD 1: AKTIVITAS HARIAN / ALOKASI MANDORAN -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          ${isMandoranMode ? `
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #374151; margin-bottom: 7px;">Alokasi Kerja Mandoran</label>
            <div style="padding: 11px 12px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px;">
              <div style="font-size: 0.88rem; font-weight: 700; color: #116834;">${esc(selectedWorkAllocation.allocationCode)} - ${esc(selectedWorkAllocation.allocationName)}</div>
              <div style="font-size: 0.76rem; color: #64748B; margin-top: 4px;">${esc(selectedWorkAllocation.workGroupRoleCode)} · ${esc(selectedWorkAllocation.workGroupRoleName)}</div>
            </div>
          ` : `
            <label for="select-aktivitas" style="display: block; font-size: 0.78rem; font-weight: 700; color: ${hasPresentWorkers ? '#374151' : '#94A3B8'}; margin-bottom: 5px;">Aktivitas Pembibitan</label>
            <div style="position: relative;">
              <select id="select-aktivitas" ${hasPresentWorkers ? '' : 'disabled aria-disabled="true"'} style="width: 100%; height: 42px; padding: 0 32px 0 12px; background: ${hasPresentWorkers ? '#FFFFFF' : '#F1F5F9'}; border: 1px solid ${hasPresentWorkers ? '#CBD5E1' : '#E2E8F0'}; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: ${hasPresentWorkers ? '#1F2937' : '#94A3B8'}; appearance: none; outline: none; cursor: ${hasPresentWorkers ? 'pointer' : 'not-allowed'}; opacity: ${hasPresentWorkers ? '1' : '0.75'};">
                ${availableAktivitas.map((c) => `<option value="${c.code}" ${c.code === selectedAktivitasCode ? 'selected' : ''}>${c.code} - ${c.name}</option>`).join('')}
              </select>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="${hasPresentWorkers ? '#64748B' : '#94A3B8'}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          `}
        </div>

        <!-- CARD 2: NAMA PROGRAM PEMBIBITAN -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <label style="display: block; font-size: 0.78rem; font-weight: 700; color: ${hasPresentWorkers ? '#374151' : '#94A3B8'}; margin-bottom: 5px;">
            Nama Program Pembibitan
          </label>
          <div id="btn-open-program-sheet" role="button" tabindex="${hasPresentWorkers ? '0' : '-1'}" aria-disabled="${!hasPresentWorkers}" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid ${hasPresentWorkers ? '#CBD5E1' : '#E2E8F0'}; border-radius: 6px; padding: 0 12px; height: 42px; background: ${hasPresentWorkers ? '#FFFFFF' : '#F1F5F9'}; cursor: ${hasPresentWorkers ? 'pointer' : 'not-allowed'}; opacity: ${hasPresentWorkers ? '1' : '0.75'}; transition: border-color 0.15s ease;">
            <span id="label-selected-program" style="font-size: 0.88rem; font-weight: 700; color: ${hasPresentWorkers ? '#111827' : '#94A3B8'};">${selectedProgramCode || 'Belum ada Program Terbuka'}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="${hasPresentWorkers ? '#64748B' : '#94A3B8'}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- CARD 3: PEKERJA HADIR PRESENSI -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div id="worker-list-heading" style="font-size: 0.78rem; font-weight: 700; color: #374151; margin-bottom: 10px;">
            Pekerja Hadir Presensi (${activeWorkers.length})
          </div>

          <div id="worker-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${activeWorkers.length === 0 ? `
              <div style="text-align: center; padding: 18px 14px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px;">
                <div style="width: 42px; height: 42px; border-radius: 50%; background: #FEF3C7; color: #D97706; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <strong style="display: block; font-size: 0.88rem; color: #1E293B; margin-bottom: 4px;">
                  Belum Ada Pekerja yang Melakukan Presensi Hari Ini
                </strong>
                <p style="font-size: 0.78rem; color: #64748B; margin: 0 0 14px 0; line-height: 1.45;">
                  Pekerja harus melakukan presensi terlebih dahulu pada modul Presensi sebelum dapat dialokasikan pada aktivitas pemeliharaan pembibitan.
                </p>
                <button id="btn-goto-attendance" type="button" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7.5" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  Buka Modul Presensi
                </button>
              </div>
            ` : activeWorkers.map((worker) => {
              const isChecked = !!workerSelectionState[worker.id];
              return `
                <div class="worker-item-card" data-id="${worker.id}" data-worker-name="${esc(worker.name)}" style="display: grid; grid-template-columns: minmax(0, 1fr) 112px; align-items: center; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; gap: 7px 8px; touch-action: pan-y; user-select: none;">
                  <div style="grid-column: 1; grid-row: 1; min-width: 0;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${worker.name}
                    </div>
                    <div style="font-size: 0.72rem; color: #64748B; margin-top: 1px;">
                      ${worker.code} • ${worker.position || 'Pekerja Bibitan'}
                    </div>
                  </div>
                  <div style="grid-column: 2; grid-row: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 7px; min-width: 0;">
                    <button class="worker-btn-toggle" type="button" data-worker-id="${worker.id}" aria-pressed="${isChecked}" style="position: relative; width: 44px; height: 24px; background: ${isChecked ? '#116834' : '#CBD5E1'}; border-radius: 14px; border: none; padding: 2px; cursor: pointer; transition: background 0.2s ease; display: inline-flex; align-items: center; flex-shrink: 0;">
                      <span style="display: block; width: 20px; height: 20px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform: ${isChecked ? 'translateX(20px)' : 'translateX(0)'};"></span>
                    </button>
                  </div>
                  ${isMandoranMode ? `
                    <label for="worker-result-${esc(worker.id)}" class="worker-result-label" style="display: ${isChecked ? 'block' : 'none'}; grid-column: 1; grid-row: 2; align-self: center; font-size: 0.78rem; font-weight: 700; color: #374151;">Input Hasil</label>
                    <input id="worker-result-${esc(worker.id)}" class="worker-result-input" data-worker-id="${esc(worker.id)}" type="number" inputmode="decimal" min="0" step="any" value="${esc(workerResultState[worker.id])}" aria-label="Input hasil ${esc(worker.name)}" placeholder="0" style="display: ${isChecked ? 'block' : 'none'}; grid-column: 2; grid-row: 2; width: 100%; height: 36px; box-sizing: border-box; padding: 0 8px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; color: #0F172A; font-size: 0.86rem; font-weight: 700; text-align: right; outline: none;">
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- TOMBOL SIMPAN -->
        <div style="margin-top: 4px;">
          <button id="btn-simpan-hasil" type="button" ${hasPresentWorkers ? '' : 'disabled aria-disabled="true"'} style="width: 100%; height: 46px; background: ${hasPresentWorkers ? '#116834' : '#94A3B8'}; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.90rem; font-weight: 700; cursor: ${hasPresentWorkers ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center; box-shadow: ${hasPresentWorkers ? '0 2px 4px rgba(17,104,52,0.2)' : 'none'}; opacity: ${hasPresentWorkers ? '1' : '0.75'};">
            Simpan
          </button>
        </div>

      </main>

      <!-- KONFIRMASI HAPUS PEKERJA DARI FORM -->
      <div id="worker-delete-overlay" style="display: none; position: absolute; inset: 0; background: rgba(15,23,42,0.48); z-index: 110; backdrop-filter: blur(1px);"></div>
      <div id="worker-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="worker-delete-title" style="display: none; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: calc(100% - 40px); max-width: 340px; box-sizing: border-box; padding: 18px 16px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 12px 30px rgba(15,23,42,0.22); z-index: 111;">
        <h3 id="worker-delete-title" style="font-size: 1rem; font-weight: 800; color: #111827; margin: 0 0 7px;">Hapus pekerja?</h3>
        <p id="worker-delete-message" style="font-size: 0.84rem; line-height: 1.45; color: #475569; margin: 0 0 18px;"></p>
        <div style="display: flex; gap: 9px;">
          <button id="btn-cancel-worker-delete" type="button" style="flex: 1; height: 42px; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 7px; font-size: 0.86rem; font-weight: 700; cursor: pointer;">Kembali</button>
          <button id="btn-confirm-worker-delete" type="button" style="flex: 1; height: 42px; background: #DC2626; color: #FFFFFF; border: 1px solid #DC2626; border-radius: 7px; font-size: 0.86rem; font-weight: 700; cursor: pointer;">Hapus</button>
        </div>
      </div>
      <div id="inactive-workers-overlay" style="display: none; position: absolute; inset: 0; background: rgba(15,23,42,0.48); z-index: 112; backdrop-filter: blur(1px);"></div>
      <div id="inactive-workers-dialog" role="alertdialog" aria-modal="true" aria-labelledby="inactive-workers-title" style="display: none; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: calc(100% - 40px); max-width: 340px; box-sizing: border-box; padding: 18px 16px 16px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 12px 30px rgba(15,23,42,0.22); z-index: 113;">
        <h3 id="inactive-workers-title" style="font-size: 1rem; font-weight: 800; color: #111827; margin: 0 0 7px;">Daftar pekerja belum sesuai</h3>
        <p id="inactive-workers-message" style="font-size: 0.84rem; line-height: 1.45; color: #475569; margin: 0 0 18px;"></p>
        <button id="btn-close-inactive-workers-dialog" type="button" style="width: 100%; height: 42px; background: #116834; color: #FFFFFF; border: 1px solid #116834; border-radius: 7px; font-size: 0.86rem; font-weight: 700; cursor: pointer;">Mengerti</button>
      </div>

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
          ${openPrograms.length > 0 ? openPrograms.map((prog, idx) => `
            <div class="item-program-row" data-id="${prog.id}" data-code="${prog.code}" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: ${(selectedProgramId === prog.id || selectedProgramCode === prog.code) ? '#E8F5E9' : '#FFFFFF'}; border-bottom: ${idx === openPrograms.length - 1 ? 'none' : '1px solid #E5E7EB'}; cursor: pointer;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 0.95rem; color: #111111; font-weight: ${(selectedProgramId === prog.id || selectedProgramCode === prog.code) ? '700' : '500'};">${prog.code}</span>
                <span style="font-size: 0.76rem; color: #64748B;">${prog.name}</span>
              </div>
              <span style="font-size: 0.95rem; color: #116834; font-weight: 700;">Pilih</span>
            </div>
          `).join('') : `
            <div style="padding: 20px; text-align: center; color: #64748B; font-size: 0.85rem;">Tidak ada Program Pembibitan OPEN pada unit kerja ini.</div>
          `}
        </div>
      </div>

    </div>
  `;

  // Event Listener: Back Button -> navigasi kembali ke Landing Page Pemeliharaan
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate(isMandoranMode ? '/nursery-activity/mandoran' : '/nursery-activity');
  });

  // Event Listener: Buka Modul Presensi (saat empty state)
  app.querySelector('#btn-goto-attendance')?.addEventListener('click', () => {
    navigate('/attendance');
  });

  // Event Listener: Toggle Pekerja
  if (hasPresentWorkers) {
    app.querySelectorAll('.worker-btn-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const workerId = btn.dataset.workerId;
        const currentVal = !workerSelectionState[workerId];
        workerSelectionState[workerId] = currentVal;
        btn.setAttribute('aria-pressed', currentVal ? 'true' : 'false');
        btn.style.background = currentVal ? '#116834' : '#CBD5E1';
        const slider = btn.querySelector('span');
        if (slider) slider.style.transform = currentVal ? 'translateX(20px)' : 'translateX(0)';
        const card = btn.closest('.worker-item-card');
        const label = card?.querySelector('.worker-result-label');
        const input = card?.querySelector('.worker-result-input');
        if (label) label.style.display = currentVal ? 'block' : 'none';
        if (input) input.style.display = currentVal ? 'block' : 'none';
      });
    });

    app.querySelectorAll('.worker-result-input').forEach(input => {
      input.addEventListener('input', () => {
        workerResultState[input.dataset.workerId] = input.value;
      });
    });

    let pendingWorkerRemoval = null;
    const workerDeleteOverlay = app.querySelector('#worker-delete-overlay');
    const workerDeleteDialog = app.querySelector('#worker-delete-dialog');
    const workerDeleteMessage = app.querySelector('#worker-delete-message');
    const openWorkerDeleteDialog = (workerId, workerName) => {
      pendingWorkerRemoval = { workerId, workerName };
      if (workerDeleteMessage) workerDeleteMessage.textContent = `Hapus ${workerName} dari daftar pekerja aktivitas ini?`;
      if (workerDeleteOverlay) workerDeleteOverlay.style.display = 'block';
      if (workerDeleteDialog) workerDeleteDialog.style.display = 'block';
    };
    const closeWorkerDeleteDialog = () => {
      if (pendingWorkerRemoval) {
        const swipedCard = [...app.querySelectorAll('.worker-item-card')].find(card => String(card.dataset.id) === String(pendingWorkerRemoval.workerId));
        if (swipedCard) {
          swipedCard.style.transition = 'transform 0.18s ease';
          swipedCard.style.transform = 'translateX(0)';
        }
      }
      pendingWorkerRemoval = null;
      if (workerDeleteOverlay) workerDeleteOverlay.style.display = 'none';
      if (workerDeleteDialog) workerDeleteDialog.style.display = 'none';
    };

    app.querySelectorAll('.worker-item-card').forEach(card => {
      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let horizontalSwipe = false;

      card.addEventListener('pointerdown', event => {
        if (event.target.closest('button, input, select, textarea')) return;
        startX = event.clientX;
        startY = event.clientY;
        currentX = 0;
        horizontalSwipe = false;
        card.style.transition = 'none';
        card.setPointerCapture?.(event.pointerId);
      });

      card.addEventListener('pointermove', event => {
        if (!card.hasPointerCapture?.(event.pointerId)) return;
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (!horizontalSwipe && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
          horizontalSwipe = true;
        }
        if (!horizontalSwipe) return;
        currentX = Math.max(-96, Math.min(0, deltaX));
        card.style.transform = `translateX(${currentX}px)`;
      });

      const finishSwipe = () => {
        card.style.transition = 'transform 0.18s ease';
        if (currentX <= -72) {
          card.style.transform = 'translateX(-72px)';
          openWorkerDeleteDialog(card.dataset.id, card.dataset.workerName || 'pekerja ini');
        } else {
          card.style.transform = 'translateX(0)';
        }
        currentX = 0;
        horizontalSwipe = false;
      };

      card.addEventListener('pointerup', finishSwipe);
      card.addEventListener('pointercancel', () => {
        card.style.transition = 'transform 0.18s ease';
        card.style.transform = 'translateX(0)';
        currentX = 0;
        horizontalSwipe = false;
      });
    });

    workerDeleteOverlay?.addEventListener('click', closeWorkerDeleteDialog);
    app.querySelector('#btn-cancel-worker-delete')?.addEventListener('click', closeWorkerDeleteDialog);
    app.querySelector('#btn-confirm-worker-delete')?.addEventListener('click', () => {
      if (!pendingWorkerRemoval) return;
      const { workerId } = pendingWorkerRemoval;
      const workerCard = [...app.querySelectorAll('.worker-item-card')].find(card => String(card.dataset.id) === String(workerId));
      if (workerCard) workerCard.remove();
      workerSelectionState[workerId] = false;
      removedWorkerIds.add(String(workerId));

      const remainingCount = Math.max(0, activeWorkers.length - removedWorkerIds.size);
      const heading = app.querySelector('#worker-list-heading');
      if (heading) heading.textContent = `Pekerja Hadir Presensi (${remainingCount})`;
      if (remainingCount === 0) {
        const workerList = app.querySelector('#worker-list');
        if (workerList) workerList.innerHTML = '<div style="padding: 14px; text-align: center; color: #64748B; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 7px; font-size: 0.82rem;">Belum ada pekerja untuk aktivitas ini.</div>';
        const saveButton = app.querySelector('#btn-simpan-hasil');
        if (saveButton) {
          saveButton.disabled = true;
          saveButton.setAttribute('aria-disabled', 'true');
          saveButton.style.background = '#94A3B8';
          saveButton.style.cursor = 'not-allowed';
          saveButton.style.opacity = '0.75';
          saveButton.style.boxShadow = 'none';
        }
      }
      closeWorkerDeleteDialog();
    });
  }

  const inactiveWorkersOverlay = app.querySelector('#inactive-workers-overlay');
  const inactiveWorkersDialog = app.querySelector('#inactive-workers-dialog');
  const closeInactiveWorkersDialog = () => {
    if (inactiveWorkersOverlay) inactiveWorkersOverlay.style.display = 'none';
    if (inactiveWorkersDialog) inactiveWorkersDialog.style.display = 'none';
  };
  inactiveWorkersOverlay?.addEventListener('click', closeInactiveWorkersDialog);
  app.querySelector('#btn-close-inactive-workers-dialog')?.addEventListener('click', closeInactiveWorkersDialog);

  // Bottom Sheet Program Pembibitan
  const btnOpenProgram = app.querySelector('#btn-open-program-sheet');
  const modalProgramOverlay = app.querySelector('#modal-program-overlay');
  const sheetProgram = app.querySelector('#sheet-program');
  const btnCloseSheetProgram = app.querySelector('#btn-close-sheet-program');
  const labelSelectedProgram = app.querySelector('#label-selected-program');

  const openProgramSheet = () => {
    if (!hasPresentWorkers) return;
    if (modalProgramOverlay) modalProgramOverlay.style.display = 'block';
    if (sheetProgram) sheetProgram.style.display = 'flex';
  };

  const closeProgramSheet = () => {
    if (modalProgramOverlay) modalProgramOverlay.style.display = 'none';
    if (sheetProgram) sheetProgram.style.display = 'none';
  };

  if (hasPresentWorkers) {
    btnOpenProgram?.addEventListener('click', openProgramSheet);
  }
  btnCloseSheetProgram?.addEventListener('click', closeProgramSheet);
  modalProgramOverlay?.addEventListener('click', closeProgramSheet);

  app.querySelectorAll('.item-program-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      const code = row.dataset.code;
      if (code) {
        selectedProgramId = id;
        selectedProgramCode = code;
        if (labelSelectedProgram) labelSelectedProgram.textContent = selectedProgramCode;
        
        // Perbarui highlight baris
        app.querySelectorAll('.item-program-row').forEach(r => {
          const isCurr = r.dataset.id === selectedProgramId || r.dataset.code === selectedProgramCode;
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
    try {
      assertAttendanceGateOrThrow();
    } catch (err) {
      toast(err.message || 'Presensi harian diperlukan sebelum membuat transaksi.', 'error');
      return;
    }

    // Safety Guard: Block submit jika belum ada pekerja yang presensi
    if (!hasPresentWorkers || activeWorkers.length === 0) {
      toast('Belum ada pekerja yang melakukan presensi hari ini.', 'error');
      return;
    }

    if (isMandoranMode) {
      const unselectedWorkers = activeWorkers.filter(worker =>
        !removedWorkerIds.has(String(worker.id)) && !workerSelectionState[worker.id]
      );
      if (unselectedWorkers.length > 0) {
        const names = unselectedWorkers.map(worker => worker.name).join(', ');
        const message = app.querySelector('#inactive-workers-message');
        if (message) {
          message.textContent = `Pekerja berikut belum diaktifkan untuk mandoran ini: ${names}. Swipe kartu ke kiri dan hapus pekerja yang tidak bekerja, lalu pilih semua pekerja yang tersisa.`;
        }
        if (inactiveWorkersOverlay) inactiveWorkersOverlay.style.display = 'block';
        if (inactiveWorkersDialog) inactiveWorkersDialog.style.display = 'block';
        return;
      }
    }

    let selectedAkt;
    let allocationCode;
    let allocationName;
    if (isMandoranMode) {
      selectedAkt = {
        kode: selectedWorkAllocation.allocationCode,
        nama: selectedWorkAllocation.allocationName,
        id: `WORK-ALLOCATION-${selectedWorkAllocation.allocationCode}`
      };
      allocationCode = selectedWorkAllocation.allocationCode;
      allocationName = selectedWorkAllocation.allocationName;
    } else {
      const selectAktivitasEl = app.querySelector('#select-aktivitas');
      const chosenCode = selectAktivitasEl?.value?.trim() || availableAktivitas[0]?.code;
      const cfnaRecord = getCfnaByCode(chosenCode);

      if (!cfnaRecord || cfnaRecord.status !== CFNA_STATUS.ACTIVE) {
        toast('Aktivitas pembibitan yang dipilih tidak valid dalam master data.', 'error');
        return;
      }

      selectedAkt = { kode: cfnaRecord.code, nama: cfnaRecord.name, id: cfnaRecord.id };
      allocationCode = cfnaRecord.code;
      allocationName = cfnaRecord.name;
    }
    
    const chosenProg = (selectedProgramId ? getProgramById(selectedProgramId) : null) || openPrograms.find(p => p.code === selectedProgramCode) || null;
    const finalProgId = chosenProg ? chosenProg.id : selectedProgramId;
    const finalProgCode = chosenProg ? chosenProg.code : selectedProgramCode;

    const selectedWorkersList = activeWorkers.filter(w => workerSelectionState[w.id] && !removedWorkerIds.has(String(w.id)));

    // Validasi Submit: Minimal 1 pekerja harus dipilih
    if (selectedWorkersList.length === 0) {
      toast('Pilih minimal 1 pekerja pelaksana aktivitas.', 'error');
      return;
    }

    if (isMandoranMode) {
      for (const worker of selectedWorkersList) {
        const rawResult = String(workerResultState[worker.id] ?? '').trim();
        const resultValue = Number(rawResult);
        if (!rawResult || !Number.isFinite(resultValue) || resultValue <= 0) {
          toast(`Input Hasil untuk ${worker.name} wajib diisi dan harus lebih dari 0.`, 'error');
          app.querySelector(`#worker-result-${CSS.escape(String(worker.id))}`)?.focus();
          return;
        }
      }
    }

    // Validasi & Ambil Canonical Worker Data
    const canonicalWorkers = [];
    for (const w of selectedWorkersList) {
      const canonical = getWorkerById(w.id);
      if (!canonical) {
        toast(`Pekerja ID ${w.id} tidak ditemukan dalam master data.`, 'error');
        return;
      }
      if (!isWorkerActive(canonical.id)) {
        toast(`Pekerja ${canonical.name} tidak berstatus aktif.`, 'error');
        return;
      }
      if (userCtx?.estateId && !isWorkerInScope(canonical.id, userCtx.estateId, userCtx.divisionId)) {
        toast(`Pekerja ${canonical.name} berada di luar cakupan Estate/Divisi pengguna.`, 'error');
        return;
      }
      canonicalWorkers.push({
        id: canonical.id,
        workerId: canonical.id,
        name: canonical.name,
        workerName: canonical.name,
        code: canonical.code,
        workerCode: canonical.code,
        position: canonical.position || 'Pekerja Bibitan',
        role: canonical.position || 'Pekerja Bibitan',
        ...(isMandoranMode ? { inputHasil: Number(workerResultState[w.id]) } : {})
      });
    }

    const existingRecords = storage.get('nursery_activity_records', []);
    const docNo = `ACT/NUR/2026/0${existingRecords.length + 1}`;

    let record = {
      id: `ACT-${Date.now()}`,
      docNo,
      aktivitas: selectedAkt,
      programId: finalProgId,
      programCode: finalProgCode,
      program: finalProgCode || 'Nursery Program 2026',
      estateId: userCtx?.estateId || null,
      divisionId: userCtx?.divisionId || null,
      lokasiBlok: null,
      pekerja: canonicalWorkers,
      allocationCode,
      allocationName,
      activityEntryMode: isMandoranMode ? 'MANDORAN' : 'HARIAN',
      ...(isMandoranMode ? {
        workGroupRoleCode: selectedWorkAllocation.workGroupRoleCode,
        workGroupRoleName: selectedWorkAllocation.workGroupRoleName,
        taskRate: selectedWorkAllocation.taskRate,
        taskQuantity: selectedWorkAllocation.taskQuantity,
        overTaskRate: selectedWorkAllocation.overTaskRate,
        taskItemName: selectedWorkAllocation.taskItemName,
        uom: selectedWorkAllocation.uom,
        uomCode: selectedWorkAllocation.uomCode,
        isMaterial: selectedWorkAllocation.isMaterial
      } : {}),
      createdAt: new Date().toISOString()
    };

    // Apply immutable actor snapshot via Phase 8B transaction actor engine
    record = applyTransactionActor(record, 'CREATE', userCtx);

    existingRecords.push(record);
    storage.set('nursery_activity_records', existingRecords);

    toast(`Pencatatan hasil "${selectedAkt.nama}" (${docNo}) berhasil disimpan!`, 'success');
    navigate('/nursery-activity');
  });
}


