/**
 * js/modules/receipt/receipt-kebun-sepupu-landing.js
 * Halaman Inbox & Tindakan Penerimaan Bibit Kebun Sepupu
 * Role: PENGURUS, ASISTEN KEPALA (ASKEP), ASISTEN LAPANGAN (ASISTEN)
 * 
 * Sesuai Workflow Locked (Task PENERIMAAN-02, PENERIMAAN-03, PENERIMAAN-04, PENERIMAAN-05):
 * 1. Role PENGURUS:
 *    - Catat Penerimaan Awal (Tanggal Tiba + Catatan).
 *    - Transisi: MENUNGGU_PENERIMAAN_PENGURUS -> MENUNGGU_VERIFIKASI_ASISTEN_KEPALA.
 * 2. Role ASISTEN KEPALA (ASKEP):
 *    - Verifikasi & Penentuan 1 Jalur (LAPANGAN atau BIBITAN) + Divisi Tujuan.
 *    - Transisi LAPANGAN: MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN (targetNextRole: 'ASISTEN').
 *    - Transisi BIBITAN: MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN (targetNextRole: 'ASISTEN_BIBITAN').
 *    - Aksi Kembalikan ke Pengurus: DIKEMBALIKAN_KE_PENGURUS (targetNextRole: 'PENGURUS').
 * 3. Role ASISTEN LAPANGAN (ASISTEN):
 *    - Pemeriksaan fisik (Jumlah Layak, Reject/Rusak, Selisih/Discrepancy).
 *    - Alokasi Blok Tanaman (Hanya kuantitas Layak, validasi block-master, isolasi divisi).
 *    - Bukti Foto Fisik (source = CAMERA, metadata actor & timestamp).
 *    - Simpan Draft: SEDANG_DIPROSES.
 *    - Simpan & Selesaikan: DITERIMA (discrepancy === 0) atau DITERIMA_DENGAN_SELISIH (discrepancy > 0).
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole, resolveUserContext } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { requestRepository } from '../../db/repositories.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { AUDIT_EVENT_TYPES, applyTransactionActor } from '../../core/transaction-actor.js';
import { formatDate, esc } from '../../core/utils.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { getWorkflowStatusPresentation } from '../../core/workflow-status-presentation.js';
import { BLOCK_MASTER, BLOCK_STATUS } from '../../data/block-master.js';
import { getAllBatches } from '../../data/batch-master.js';
import { getBatchContext } from '../../core/master-context-service.js';
import { getActivePrograms, resolveProgram } from '../../data/program-master.js';
import { normalizeKlonName } from '../../data/klon-master.js';
import { getNurseryDivisionsByEstate, resolveEstate } from '../../data/estate-master.js';
  import {
  RECEIPT_KSP_STATUS,
  RECEIPT_KSP_STATUS_LABELS,
  RECEIPT_KSP_STORAGE_KEY,
  PHOTO_SOURCE
} from '../../core/receipt-ksp-constants.js';
import {
  validateReceiptQuantities,
  validateBlockAllocations,
  validatePhotoEvidence
} from '../../core/receipt-ksp-validator.js';
import {
  getReceiptKspTransactions,
  getReceiptKspById,
  updateReceiptKsp,
  createNurseryBatchesFromReceipt
} from '../../core/receipt-ksp-manager.js';
import {
  canPerformRequesterReceipt,
  matchEstateHelper as matchMataEntresEstate,
  matchDivisionHelper as matchMataEntresDivision,
  openPengurusArrivalModal,
  openAskepReceiptRoutingModal,
  openAskepReceiptReturnModal as openMataEntresAskepReturnModal,
  openAsistenBibitanReceiptModal,
  openMantriBibitanReceiptModal
} from '../request/request-mata-entres-landing.js';

let activeStatusFilter = 'SEMUA';
const expandedReceiptIds = new Set();

function getMantriReceiptPrograms(receipt, currentUser) {
  const estateValue = receipt.targetNextEstateId || receipt.targetEstateId || currentUser.estateId;
  const divisionValue = receipt.targetNextDivisionId || receipt.targetDivisionId || currentUser.divisionId;
  if (!estateValue || !divisionValue) return [];
  const estate = resolveEstate(estateValue);
  const estateId = String(estate?.estate_id || estateValue).trim().toUpperCase();
  const divisionId = String(divisionValue).trim().toUpperCase();
  const sameEstate = program => {
    const ids = [program.estateId, program.estateCode, ...(program.estateIds || [])]
      .map(value => String(value || '').trim().toUpperCase()).filter(Boolean);
    return ids.some(value => {
      const resolved = resolveEstate(value);
      return value === estateId || String(resolved?.estate_id || '').toUpperCase() === estateId;
    });
  };
  return getActivePrograms().filter(program => {
    const divisions = [program.divisionId, program.divisionCode, ...(program.divisionIds || [])]
      .map(value => String(value || '').trim().toUpperCase()).filter(Boolean);
    return sameEstate(program) && divisions.includes(divisionId);
  });
}

function getMantriReceiptBatchOptions(receipt, currentUser, detail, selectedProgramId) {
  const requests = storage.get('requests_transactions', []);
  const parentRequest = Array.isArray(requests)
    ? requests.find(request => request.id === receipt.parentRequestId || request.docNo === receipt.parentRequestDocNo)
    : null;
  const programValue = selectedProgramId || receipt.nurseryProgramId || receipt.programId || parentRequest?.programId || receipt.programName || parentRequest?.programName;
  const estateValue = receipt.targetNextEstateId || receipt.targetEstateId || currentUser.estateId;
  const divisionValue = receipt.targetNextDivisionId || receipt.targetDivisionId || currentUser.divisionId;
  if (!estateValue || !divisionValue) return [];
  const program = resolveProgram(programValue);
  const targetProgramId = String(program?.id || programValue).trim().toUpperCase();
  const targetEstate = resolveEstate(estateValue);
  const targetEstateId = String(targetEstate?.estate_id || estateValue).trim().toUpperCase();
  const targetDivisionId = String(divisionValue).trim().toUpperCase();
  const normalize = value => String(value || '').trim().toUpperCase();
  const programAliases = new Set([targetProgramId, normalize(programValue), normalize(program?.code), ...(program?.legacyCodes || []).map(normalize)].filter(Boolean));
  const estateAliases = new Set([targetEstateId, normalize(estateValue), ...(program?.estateIds || []).map(normalize)].filter(Boolean));
  const divisionAliases = new Set([targetDivisionId, normalize(program?.divisionId), normalize(program?.divisionCode), ...(program?.divisionIds || []).map(normalize)].filter(Boolean));
  const sameAlias = (value, aliases, resolver) => {
    if (!value) return false;
    const candidate = resolver(value);
    const canonical = candidate?.id || candidate?.estate_id;
    return aliases.has(normalize(value)) || (canonical && aliases.has(normalize(canonical)));
  };
  const sameProgram = (ctx, batch) => {
    const value = ctx.programId || ctx.programCode || batch.programId || batch.programCode || batch.program_id || batch.program_code;
    return Boolean(value && sameAlias(value, programAliases, resolveProgram));
  };
  const sameEstate = (ctx, batch) => {
    const value = ctx.estateId || ctx.estateCode || batch.estateId || batch.estateCode || batch.estate_id || batch.estate_code;
    return sameAlias(value, estateAliases, resolveEstate);
  };

  return getAllBatches({}).filter(batch => {
    const batchId = batch.id || batch.batchId || batch.batchCode || batch.batchNo;
    const context = getBatchContext(batchId) || batch;
    const batchDivision = context.divisionId || context.divisionCode || batch.divisionId || batch.divisionCode || batch.division_id || batch.division_code;
    return sameEstate(context, batch) && divisionAliases.has(normalize(batchDivision)) && sameProgram(context, batch) &&
    batch.statusMaster !== 'INACTIVE' &&
    batch.status !== 'INACTIVE';
  });
}

/**
 * Mengambil daftar divisi lapangan aktif untuk suatu estate dari canonical block-master
 * @param {string} estateIdOrCode
 * @returns {Array<{divisionId: string, divisionCode: string, divisionName: string, estateId: string, estateName: string}>}
 */
export function getFieldDivisionsForEstate(estateIdOrCode) {
  if (!estateIdOrCode) return [];
  const clean = String(estateIdOrCode).trim().toUpperCase();
  const divMap = new Map();

  BLOCK_MASTER.forEach(b => {
    const bEstate = (b.estateCode || b.estateId || '').toUpperCase();
    const matchEstate = (
      bEstate === clean ||
      (bEstate === 'EST-APM' && (clean.includes('APM') || clean === 'EST-003')) ||
      (bEstate === 'EST-TBS' && (clean.includes('TBS') || clean === 'EST-001' || clean === 'EST-002'))
    );

    if (matchEstate && b.divisionCode && !divMap.has(b.divisionCode)) {
      divMap.set(b.divisionCode, {
        divisionId: b.divisionCode,
        divisionCode: b.divisionCode,
        divisionName: b.divisionName || b.divisionCode,
        estateId: b.estateCode,
        estateName: b.estateName
      });
    }
  });

  return Array.from(divMap.values());
}

/**
 * Mengambil daftar blok aktif spesifik untuk estate dan divisi Asisten Lapangan
 * @param {string} estateIdOrCode
 * @param {string} divisionIdOrCode
 * @returns {Array<Object>}
 */
export function getActiveBlocksForDivision(estateIdOrCode, divisionIdOrCode) {
  if (!estateIdOrCode || !divisionIdOrCode) return [];
  const cleanEstate = String(estateIdOrCode).trim().toUpperCase();
  const cleanDiv = String(divisionIdOrCode).trim().toUpperCase();

  return BLOCK_MASTER.filter(b => {
    const bEstate = (b.estateCode || b.estateId || '').toUpperCase();
    const matchEstate = (
      bEstate === cleanEstate ||
      (bEstate === 'EST-APM' && (cleanEstate.includes('APM') || cleanEstate === 'EST-003')) ||
      (bEstate === 'EST-TBS' && (cleanEstate.includes('TBS') || cleanEstate === 'EST-001' || cleanEstate === 'EST-002'))
    );
    const bDiv = (b.divisionCode || b.divisionId || '').toUpperCase();
    const matchDiv = bDiv === cleanDiv;
    const isActive = b.status === BLOCK_STATUS.ACTIVE || !b.status;
    return matchEstate && matchDiv && isActive;
  });
}

/**
 * Validasi otorisasi Pengurus untuk memproses Catat Penerimaan Awal
 * @param {Object} receipt
 * @param {Object} currentUser
 * @returns {boolean}
 */
/**
 * Helper pemeriksaan domain: Hanya menerima record domain Bibit Kebun Sepupu
 * @param {Object} receipt
 * @returns {boolean}
 */
export function isBibitReceipt(receipt) {
  if (!receipt) return false;
  const transactionType = String(receipt.transactionType || '').trim().toUpperCase();
  if (transactionType === 'PENERIMAAN_BIBIT') return true;
  if (transactionType === 'PENERIMAAN_MATA_ENTRES') return false;
  if (String(receipt.type || '').trim().toUpperCase() === 'MATA_ENTRES') return false;
  // Record Bibit versi lama kadang hanya memiliki type KEBUN_SEPUPU,
  // sedangkan record Mata Entres selalu dapat dikenali dari type/transactionType.
  return String(receipt.type || '').trim().toUpperCase() === 'KEBUN_SEPUPU' || !receipt.type;
}

function isMataEntresReceipt(receipt) {
  if (!receipt) return false;
  const transactionType = String(receipt.transactionType || '').trim().toUpperCase();
  if (transactionType === 'PENERIMAAN_BIBIT') return false;
  return String(receipt.type || '').trim().toUpperCase() === 'MATA_ENTRES' || transactionType === 'PENERIMAAN_MATA_ENTRES';
}

function getReceiptEstateRoute(item) {
  const sourceId = item.sourceEstateId || item.dispatchedFromEstateId || item.estateId;
  const targetId = item.targetEstateId || item.requesterEstateId;
  const sourceName = item.sourceEstateName && item.sourceEstateName !== '-'
    ? item.sourceEstateName
    : (resolveEstate(sourceId)?.estate_name || sourceId || '-');
  const targetName = item.targetEstateName && item.targetEstateName !== '-'
    ? item.targetEstateName
    : (resolveEstate(targetId)?.estate_name || targetId || '-');
  return { sourceName, targetName };
}

function getMataEntresParentRequest(receipt) {
  if (!receipt?.parentRequestId) return null;
  const requests = storage.get('requests_transactions', []);
  return Array.isArray(requests)
    ? requests.find(tx => tx.type === 'MATA_ENTRES' && tx.id === receipt.parentRequestId) || null
    : null;
}

async function syncCompletedBibitReceiptToRequest(receipt, currentUser, completionPatch, auditDetails) {
  if (!receipt?.parentRequestId) return;
  const requestId = receipt.parentRequestId;
  const requests = storage.get('requests_transactions', []);
  const localIndex = Array.isArray(requests)
    ? requests.findIndex(request => request.id === requestId || request.docNo === receipt.parentRequestDocNo)
    : -1;

  try {
    const updatedRequest = await requestRepository.update(
      requestId,
      completionPatch,
      currentUser,
      AUDIT_EVENT_TYPES.APPROVE,
      auditDetails
    );
    if (Array.isArray(requests) && localIndex >= 0) {
      requests[localIndex] = { ...requests[localIndex], ...updatedRequest };
      storage.set('requests_transactions', requests);
    }
  } catch (error) {
    // Keep the UI timeline available when IndexedDB is unavailable or the
    // request was created only in local storage (legacy/prototype records).
    if (Array.isArray(requests) && localIndex >= 0) {
      requests[localIndex] = applyTransactionActor(
        { ...requests[localIndex], ...completionPatch },
        AUDIT_EVENT_TYPES.APPROVE,
        currentUser,
        auditDetails
      );
      storage.set('requests_transactions', requests);
    } else {
      console.warn('[receipt] unable to sync completed Bibit receipt to its request:', error);
    }
  }
}

function canViewMataEntresReceipt(receipt, currentUser, parentRequest = getMataEntresParentRequest(receipt)) {
  if (!receipt || !parentRequest || !currentUser) return false;
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  const userEstate = currentUser.estateId;
  const receivingEstate = receipt.targetEstateId || receipt.requesterEstateId || parentRequest.sourceEstateId || parentRequest.estateId || parentRequest.requesterEstate;
  if (!userEstate || !receivingEstate || !matchesReceiptEstate(receivingEstate, userEstate)) return false;

  // Penerimaan pada sisi pemohon tetap menjadi riwayat di kebun penerima.
  if (role === 'PENGURUS') return true;

  const userDivision = currentUser.divisionId;
  const receivingDivision = receipt.targetNextDivisionId || receipt.targetDivisionId ||
    parentRequest.targetNextDivisionId || parentRequest.targetDivisionId || parentRequest.divisionId;
  if (!userDivision || !receivingDivision) return false;
  if (!matchMataEntresDivision(receivingDivision, userDivision)) return false;

  return role === 'ASKEP' || role === 'ASISTEN_KEPALA' || role === 'ASISTEN_BIBITAN' || role === 'MANTRI_TANAMAN' || role === 'MANTRI';
}

function canonicalReceiptEstateId(estateId) {
  if (!estateId) return '';
  const resolved = resolveEstate(estateId);
  if (resolved) return resolved.estate_id;
  const clean = String(estateId).trim().toUpperCase();
  if (clean === 'EST-001' || clean === 'EST-002' || clean.includes('TBS') || clean.includes('TANAHBESIH')) return 'EST-TBS';
  if (clean === 'EST-003' || clean.includes('APM') || clean.includes('AEKPAMINGKE')) return 'EST-APM';
  return clean;
}

function matchesReceiptEstate(receiptEstateId, userEstateId) {
  if (!receiptEstateId || !userEstateId) return false;
  return canonicalReceiptEstateId(receiptEstateId) === canonicalReceiptEstateId(userEstateId);
}

function getReceiptNurseryDivisionId(receipt) {
  const estateId = receipt?.targetNextEstateId || receipt?.targetEstateId;
  const divisionId = receipt?.targetNextDivisionId || receipt?.targetDivisionId;
  if (!estateId || !divisionId) return null;
  const cleanDivisionId = String(divisionId).trim().toUpperCase();
  const nurseryDivision = getNurseryDivisionsByEstate(estateId).find(d =>
    String(d.divisionId || d.divisionCode || '').trim().toUpperCase() === cleanDivisionId
  );
  return nurseryDivision ? cleanDivisionId : null;
}

function isLegacyFieldRouteToNursery(receipt) {
  if (!receipt || String(receipt.jalurPenerimaan || '').trim().toUpperCase() !== 'LAPANGAN') return false;
  const status = String(receipt.status || '').trim().toUpperCase();
  const isStillAwaitingVerification =
    status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN ||
    status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN;
  return isStillAwaitingVerification && Boolean(getReceiptNurseryDivisionId(receipt));
}

function isReceiptAssignedToAsistenBibitan(receipt) {
  const targetRole = String(receipt?.targetNextRole || receipt?.targetRole || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const status = String(receipt?.status || '').trim().toUpperCase();
  const jalur = String(receipt?.jalurPenerimaan || '').trim().toUpperCase();
  if (status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN) {
    return targetRole === 'ASISTEN_BIBITAN' || !targetRole || jalur === 'BIBITAN';
  }
  // Record lama LAPANGAN yang Divisinya juga Divisi Bibitan hanya menjadi
  // tugas Asisten Bibitan selama statusnya masih menunggu pemeriksaan.
  return isLegacyFieldRouteToNursery(receipt);
}

export function canPerformPengurusReceiptAction(receipt, currentUser) {
  if (!receipt || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'PENGURUS') return false;

  const userEstateId = currentUser.estateId;
  const targetEstate = receipt.targetNextEstateId || receipt.targetEstateId;
  if (!userEstateId || targetEstate !== userEstateId) return false;

  const status = (receipt.status || '').toUpperCase();
  const nextRole = (receipt.targetNextRole || '').toUpperCase();

  const isActionableStatus = (
    status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS ||
    status === RECEIPT_KSP_STATUS.DIKEMBALIKAN_KE_PENGURUS
  );

  return isActionableStatus && (nextRole === 'PENGURUS' || !nextRole);
}

/**
 * Validasi otorisasi Asisten Kepala (Askep) untuk memverifikasi & menentukan jalur penerimaan
 * @param {Object} receipt
 * @param {Object} currentUser
 * @returns {boolean}
 */
export function canPerformAskepReceiptAction(receipt, currentUser) {
  if (!receipt || !currentUser) return false;
  if (!isBibitReceipt(receipt)) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASKEP' && userRole !== 'ASISTEN_KEPALA') return false;

  const userEstateId = currentUser.estateId;
  const targetEstate = receipt.targetNextEstateId || receipt.targetEstateId;
  if (!userEstateId || targetEstate !== userEstateId) return false;

  const status = (receipt.status || '').toUpperCase();
  const nextRole = (receipt.targetNextRole || '').toUpperCase();

  return (
    status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA &&
    (nextRole === 'ASKEP' || nextRole === 'ASISTEN_KEPALA' || !nextRole)
  ) || (
      // Izinkan Askep membetulkan jalur yang keliru selama dokumen belum
      // diproses Asisten Lapangan.
      status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN &&
      nextRole === 'ASISTEN' &&
      String(receipt.jalurPenerimaan || '').toUpperCase() === 'LAPANGAN'
    );
}

/**
 * Validasi otorisasi Asisten Lapangan untuk memproses pemeriksaan fisik & alokasi blok
 * @param {Object} receipt
 * @param {Object} currentUser
 * @returns {boolean}
 */
export function canPerformAsistenLapanganReceiptAction(receipt, currentUser) {
  if (!receipt || !currentUser) return false;
  if (!isBibitReceipt(receipt)) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASISTEN') return false;

  const userEstateId = currentUser.estateId;
  const userDivisionId = currentUser.divisionId;
  const targetEstate = receipt.targetNextEstateId || receipt.targetEstateId;
  const targetDivision = receipt.targetNextDivisionId;

  if (!userEstateId || targetEstate !== userEstateId) return false;
  if (!userDivisionId || targetDivision !== userDivisionId) return false;

  const status = (receipt.status || '').toUpperCase();
  const nextRole = (receipt.targetNextRole || '').toUpperCase();
  const jalur = (receipt.jalurPenerimaan || '').toUpperCase();

  if (jalur !== 'LAPANGAN') return false;

  const isActionableStatus = (
    status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN ||
    status === RECEIPT_KSP_STATUS.SEDANG_DIPROSES
  );

  return isActionableStatus && (nextRole === 'ASISTEN' || !nextRole);
}

/**
 * Validasi otorisasi Asisten Bibitan untuk memverifikasi dokumen jalur pembibitan
 * @param {Object} receipt
 * @param {Object} currentUser
 * @returns {boolean}
 */
export function canPerformAsistenBibitanReceiptAction(receipt, currentUser) {
  if (!receipt || !currentUser) return false;
  if (!isBibitReceipt(receipt)) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASISTEN_BIBITAN') return false;

  const userEstateId = currentUser.estateId;
  const matchesTargetEstate = matchesReceiptEstate(receipt.targetNextEstateId, userEstateId) ||
    matchesReceiptEstate(receipt.targetEstateId, userEstateId);
  if (!matchesTargetEstate) return false;
  if (isLegacyFieldRouteToNursery(receipt)) {
    const userDivisionId = String(currentUser.divisionId || '').trim().toUpperCase();
    return Boolean(userDivisionId && userDivisionId === getReceiptNurseryDivisionId(receipt));
  }
  const status = String(receipt.status || '').trim().toUpperCase();
  const targetRole = String(receipt.targetNextRole || receipt.targetRole || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN &&
    isReceiptAssignedToAsistenBibitan(receipt) &&
    (targetRole === 'ASISTEN_BIBITAN' || !targetRole);
}

/**
 * Validasi otorisasi Mantri Bibitan untuk memproses penerimaan fisik & pembentukan batch baru
 * @param {Object} receipt
 * @param {Object} currentUser
 * @returns {boolean}
 */
export function canPerformMantriBibitanReceiptAction(receipt, currentUser) {
  if (!receipt || !currentUser) return false;
  if (!isBibitReceipt(receipt)) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'MANTRI_TANAMAN' && userRole !== 'MANTRI') return false;

  const userEstateId = currentUser.estateId;
  const userDivisionId = currentUser.divisionId;
  const targetEstate = receipt.targetNextEstateId || receipt.targetEstateId;
  const targetDivision = receipt.targetNextDivisionId || receipt.targetDivisionId;

  if (!userEstateId || targetEstate !== userEstateId) return false;
  if (userDivisionId && targetDivision && targetDivision !== userDivisionId) return false;

  const status = (receipt.status || '').toUpperCase();
  const nextRole = (receipt.targetNextRole || '').toUpperCase();
  const jalur = (receipt.jalurPenerimaan || '').toUpperCase();

  if (jalur !== 'BIBITAN') return false;

  const isActionableStatus = (
    status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN ||
    status === RECEIPT_KSP_STATUS.SEDANG_DIPROSES
  );

  return isActionableStatus && (nextRole === 'MANTRI_TANAMAN' || nextRole === 'MANTRI' || !nextRole);
}

/**
 * Menghitung jumlah dokumen penerimaan yang actionable untuk role aktif
 * @param {Array<Object>} receipts
 * @param {Object} currentUser
 * @returns {number}
 */
export function getActionableReceiptCount(receipts, currentUser) {
  if (!Array.isArray(receipts) || !currentUser) return 0;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const mataEntresCount = receipts.filter(receipt => {
    if (!isMataEntresReceipt(receipt)) return false;
    const parentRequest = getMataEntresParentRequest(receipt);
    return Boolean(parentRequest && canPerformRequesterReceipt(parentRequest, currentUser));
  }).length;

  if (userRole === 'PENGURUS') {
    return mataEntresCount + receipts.filter(r => !isMataEntresReceipt(r) && canPerformPengurusReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
    return mataEntresCount + receipts.filter(r => !isMataEntresReceipt(r) && canPerformAskepReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'ASISTEN') {
    return mataEntresCount + receipts.filter(r => !isMataEntresReceipt(r) && canPerformAsistenLapanganReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'ASISTEN_BIBITAN') {
    return mataEntresCount + receipts.filter(r => !isMataEntresReceipt(r) && canPerformAsistenBibitanReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
    return mataEntresCount + receipts.filter(r => !isMataEntresReceipt(r) && canPerformMantriBibitanReceiptAction(r, currentUser)).length;
  }
  return 0;
}

/**
 * Filter data penerimaan yang masuk ke scope user aktif (Strict Isolation)
 * @param {Array<Object>} receipts
 * @param {Object} currentUser
 * @returns {Array<Object>}
 */
export function filterReceiptKspRequests(receipts, currentUser) {
  if (!Array.isArray(receipts) || !currentUser) return [];
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const userEstateId = currentUser.estateId;
  const userDivisionId = currentUser.divisionId;

  if (!userEstateId) return [];

  return receipts.filter(r => {
    // Penerimaan Mata Entres masuk ke inbox Pengurus yang sama; tahap berikutnya
    // dan seluruh tahap berikutnya diproses dari inbox Penerimaan.
    if (isMataEntresReceipt(r)) {
      const parentRequest = getMataEntresParentRequest(r);
      if (!parentRequest) return false;
      const receiptStatus = String(r.status || '').toUpperCase();
      const isCompletedReceipt = [
        RECEIPT_KSP_STATUS.DITERIMA,
        RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH,
        RECEIPT_KSP_STATUS.SELESAI
      ].includes(receiptStatus);
      if (isCompletedReceipt) return canViewMataEntresReceipt(r, currentUser, parentRequest);
      if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
        const sourceEstateId = parentRequest.sourceEstateId || parentRequest.estateId || parentRequest.requesterEstate;
        return Boolean(
          parentRequest.askepReceiptVerification &&
          userEstateId &&
          sourceEstateId &&
          matchMataEntresEstate(sourceEstateId, userEstateId)
        );
      }
      return canPerformRequesterReceipt(parentRequest, currentUser);
    }
    // Isolasi Domain Positif: selain Pengurus, proses ini hanya menangani Bibit.
    if (!isBibitReceipt(r)) return false;

    const matchEstate = matchesReceiptEstate(r.targetNextEstateId, userEstateId) ||
      matchesReceiptEstate(r.targetEstateId, userEstateId);
    if (!matchEstate) return false;

    // Jika Asisten Lapangan, filter ketat berdasarkan Divisi dan Jalur LAPANGAN
    if (userRole === 'ASISTEN') {
      const matchDivision = r.targetNextDivisionId === userDivisionId || r.targetDivisionId === userDivisionId;
      const isLapangan = r.jalurPenerimaan === 'LAPANGAN';
      return matchDivision && isLapangan;
    }

    // Gunakan role tujuan sebagai penentu penerima; dokumen legacy tetap dikenali lewat status + jalur.
    if (userRole === 'ASISTEN_BIBITAN') {
      return isReceiptAssignedToAsistenBibitan(r);
    }

    // Jika Mantri Bibitan, filter ketat berdasarkan Divisi dan Jalur BIBITAN
    if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
      const matchDivision = !userDivisionId || !r.targetNextDivisionId || r.targetNextDivisionId === userDivisionId || r.targetDivisionId === userDivisionId;
      const isBibitan = r.jalurPenerimaan === 'BIBITAN';
      return matchDivision && isBibitan;
    }

    return true;
  });
}

/**
 * Filter daftar receipt berdasarkan tab filter status
 * @param {Array<Object>} receipts
 * @param {string} statusFilter
 * @param {Object} currentUser
 * @returns {Array<Object>}
 */
export function filterReceiptKspByStatus(receipts, statusFilter, currentUser = null) {
  if (!Array.isArray(receipts)) return [];
  if (!statusFilter || statusFilter === 'SEMUA') return receipts;

  const userRole = currentUser ? normalizeRole(currentUser.role || currentUser.rawRole) : null;

  return receipts.filter(r => {
    const s = (r.status || '').toUpperCase();

    if (statusFilter === 'ACTIONABLE' || statusFilter === 'MENUNGGU_PENERIMAAN' || statusFilter === 'MENUNGGU_VERIFIKASI') {
      if (isMataEntresReceipt(r)) {
        const parentRequest = getMataEntresParentRequest(r);
        return Boolean(parentRequest && canPerformRequesterReceipt(parentRequest, currentUser));
      }
      if (userRole === 'PENGURUS') {
        return canPerformPengurusReceiptAction(r, currentUser);
      }
      if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
        return canPerformAskepReceiptAction(r, currentUser);
      }
      if (userRole === 'ASISTEN') {
        return canPerformAsistenLapanganReceiptAction(r, currentUser);
      }
      if (userRole === 'ASISTEN_BIBITAN') {
        return canPerformAsistenBibitanReceiptAction(r, currentUser);
      }
      if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
        return canPerformMantriBibitanReceiptAction(r, currentUser);
      }
      return s === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS || s === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA || s === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN || s === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN || s === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN;
    }

    if (statusFilter === 'DIPROSES') {
      return (
        s === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA ||
        s === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN ||
        s === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN ||
        s === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN ||
        s === RECEIPT_KSP_STATUS.SEDANG_DIPROSES ||
        s === RECEIPT_KSP_STATUS.DITERIMA_SEBAGIAN ||
        s === RECEIPT_KSP_STATUS.DIKEMBALIKAN_KE_PENGURUS
      );
    }

    if (statusFilter === 'SELESAI') {
      return (
        s === RECEIPT_KSP_STATUS.SELESAI ||
        s === RECEIPT_KSP_STATUS.DITERIMA ||
        s === RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH
      );
    }

    return s === statusFilter;
  });
}

/**
 * Eksekusi Catat Penerimaan Awal oleh Pengurus
 */
export function processPengurusInitialReceipt(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const { receivedDate, arrivalDate, notes, pengurusNotes } = formValues || {};
  const finalDate = receivedDate || arrivalDate;

  if (!finalDate || !finalDate.trim()) {
    throw new Error('Tanggal penerimaan wajib diisi');
  }

  const receipt = getReceiptKspById(receiptId);
  if (!receipt) {
    throw new Error(`Dokumen penerimaan #${receiptId} tidak ditemukan`);
  }

  if (!canPerformPengurusReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk memproses dokumen penerimaan ini.');
  }

  const patch = {
    status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA],
    targetNextRole: 'ASKEP',
    targetNextEstateId: receipt.targetEstateId,
    targetNextDivisionId: null,
    initialReceivedDate: finalDate,
    pengurusNotes: (notes || pengurusNotes) ? (notes || pengurusNotes).trim() : null,
    receivedAt: new Date().toISOString()
  };

  const auditDetails = `Pengurus (${currentUser.name || currentUser.userId}) mencatat penerimaan awal pada tanggal ${formatDate(finalDate)} dan meneruskan ke Asisten Kepala`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.APPROVE,
    auditDetails,
    currentUser
  );
}

export function processAskepVerification(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const rawJalur = formValues?.jalurPenerimaan || formValues?.routingPath || formValues?.routePath || formValues?.destinationType;
  const jalurPenerimaan = rawJalur ? String(rawJalur).trim().toUpperCase() : '';
  const { targetDivisionId, notes } = formValues || {};

  const receipt = getReceiptKspById(receiptId);
  if (!receipt) {
    throw new Error(`Dokumen penerimaan #${receiptId} tidak ditemukan`);
  }

  if (!canPerformAskepReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk memverifikasi dokumen penerimaan ini.');
  }

  if (jalurPenerimaan !== 'LAPANGAN' && jalurPenerimaan !== 'BIBITAN') {
    throw new Error('Jalur penerimaan wajib dipilih: LAPANGAN atau BIBITAN.');
  }

  if (!targetDivisionId || !targetDivisionId.trim()) {
    throw new Error('Divisi tujuan wajib dipilih.');
  }

  const fieldDivisions = getFieldDivisionsForEstate(receipt.targetEstateId);
  const nurseryDivisions = getNurseryDivisionsByEstate(receipt.targetEstateId);
  const validDivisions = jalurPenerimaan === 'LAPANGAN'
    ? fieldDivisions
    : nurseryDivisions;

  const selectedDiv = validDivisions.find(d => d.divisionId === targetDivisionId || d.divisionCode === targetDivisionId);
  if (!selectedDiv) {
    throw new Error(`Divisi '${targetDivisionId}' tidak valid atau tidak aktif pada kebun tujuan (${receipt.targetEstateName || receipt.targetEstateId}) untuk jalur ${jalurPenerimaan}.`);
  }

  // Divisi yang juga terdaftar sebagai divisi pembibitan harus ditangani
  // Asisten Bibitan, sekalipun pilihan jalur pada form adalah LAPANGAN.
  const selectedDivisionHasNursery = nurseryDivisions.some(d =>
    String(d.divisionId || d.divisionCode).trim().toUpperCase() ===
    String(selectedDiv.divisionId || selectedDiv.divisionCode).trim().toUpperCase()
  );
  const finalJalurPenerimaan = jalurPenerimaan === 'LAPANGAN' && selectedDivisionHasNursery
    ? 'BIBITAN'
    : jalurPenerimaan;

  const nextStatus = finalJalurPenerimaan === 'LAPANGAN'
    ? RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN
    : RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN;

  const nextRole = finalJalurPenerimaan === 'LAPANGAN'
    ? 'ASISTEN'
    : 'ASISTEN_BIBITAN';

  const patch = {
    jalurPenerimaan: finalJalurPenerimaan,
    status: nextStatus,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[nextStatus],
    targetNextRole: nextRole,
    targetNextEstateId: receipt.targetEstateId,
    targetNextDivisionId: selectedDiv.divisionId,
    targetNextDivisionName: selectedDiv.divisionName,
    askepNotes: notes ? notes.trim() : null,
    askepVerifiedAt: new Date().toISOString()
  };

  const isRouteCorrection = receipt.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN &&
    receipt.jalurPenerimaan === 'LAPANGAN';
  const routeExplanation = jalurPenerimaan === 'LAPANGAN' && selectedDivisionHasNursery
    ? `Pilihan LAPANGAN dialihkan ke Asisten Bibitan karena ${selectedDiv.divisionName} memiliki Divisi Bibitan.`
    : `jalur ${finalJalurPenerimaan} ke ${selectedDiv.divisionName}`;
  const auditDetails = isRouteCorrection
    ? `Asisten Kepala (${currentUser.name || currentUser.userId}) mengoreksi jalur penerimaan: ${routeExplanation}`
    : `Asisten Kepala (${currentUser.name || currentUser.userId}) memverifikasi dokumen dan menetapkan ${routeExplanation}`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.VERIFY,
    auditDetails,
    currentUser
  );
}

/**
 * Eksekusi Pengembalian Dokumen ke Pengurus oleh Asisten Kepala (Askep)
 */
export function processAskepReturn(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const { returnReason } = formValues || {};

  if (!returnReason || !returnReason.trim()) {
    throw new Error('Alasan pengembalian wajib diisi.');
  }

  const receipt = getReceiptKspById(receiptId);
  if (!receipt) {
    throw new Error(`Dokumen penerimaan #${receiptId} tidak ditemukan`);
  }

  if (!canPerformAskepReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk mengembalikan dokumen penerimaan ini.');
  }

  const patch = {
    status: RECEIPT_KSP_STATUS.DIKEMBALIKAN_KE_PENGURUS,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.DIKEMBALIKAN_KE_PENGURUS],
    targetNextRole: 'PENGURUS',
    targetNextEstateId: receipt.targetEstateId,
    targetNextDivisionId: null,
    returnReason: returnReason.trim(),
    returnedAt: new Date().toISOString(),
    returnedByUserId: currentUser.userId || currentUser.id,
    returnedByName: currentUser.name || currentUser.userId
  };

  const auditDetails = `Asisten Kepala (${currentUser.name || currentUser.userId}) mengembalikan dokumen ke Pengurus dengan alasan: "${returnReason.trim()}"`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.UPDATE,
    auditDetails,
    currentUser
  );
}

/**
 * Eksekusi Simpan Draft Pemeriksaan Fisik oleh Asisten Lapangan
 */
export function processAsistenLapanganDraft(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const receipt = getReceiptKspById(receiptId);
  if (!receipt) throw new Error(`Dokumen #${receiptId} tidak ditemukan`);

  if (!canPerformAsistenLapanganReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk memproses dokumen penerimaan ini.');
  }

  const {
    examinationDate,
    inspectionDate,
    qtyAccepted = 0,
    qtyRejected = 0,
    rejectReason,
    discrepancyReason,
    blockAllocations = [],
    photoEvidence,
    notes
  } = formValues || {};

  const accepted = parseInt(qtyAccepted, 10) || 0;
  const rejected = parseInt(qtyRejected, 10) || 0;
  const shipped = parseInt(receipt.totalShippedQty || 0, 10);
  const discrepancy = Math.max(0, shipped - (accepted + rejected));
  const examDate = examinationDate || inspectionDate || new Date().toISOString().split('T')[0];

  const updatedDetails = Array.isArray(receipt.details) ? [...receipt.details] : [];
  if (updatedDetails.length > 0) {
    updatedDetails[0] = {
      ...updatedDetails[0],
      qtyAccepted: accepted,
      qtyRejected: rejected,
      rejectReason: rejectReason || null
    };
  }

  const patch = {
    status: RECEIPT_KSP_STATUS.SEDANG_DIPROSES,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.SEDANG_DIPROSES],
    totalAcceptedQty: accepted,
    totalRejectedQty: rejected,
    discrepancyQty: discrepancy,
    discrepancyReason: discrepancyReason || null,
    examinationDate: examDate,
    blockAllocations: blockAllocations,
    photoEvidence: photoEvidence || null,
    asistenNotes: notes || null,
    details: updatedDetails,
    targetNextRole: 'ASISTEN'
  };

  const auditDetails = `Asisten Lapangan (${currentUser.name || currentUser.userId}) menyimpan draft pemeriksaan fisik (${accepted} Layak, ${rejected} Reject)`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.UPDATE,
    auditDetails,
    currentUser
  );
}

/**
 * Eksekusi Simpan & Selesaikan Penerimaan Fisik oleh Asisten Lapangan
 */
export async function processAsistenLapanganFinal(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const receipt = getReceiptKspById(receiptId);
  if (!receipt) throw new Error(`Dokumen #${receiptId} tidak ditemukan`);

  if (!canPerformAsistenLapanganReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk memproses penyelesaian penerimaan dokumen ini.');
  }

  const {
    examinationDate,
    inspectionDate,
    qtyAccepted,
    qtyRejected = 0,
    rejectReason,
    discrepancyReason,
    blockAllocations = [],
    photoEvidence,
    notes
  } = formValues || {};

  const shipped = parseInt(receipt.totalShippedQty || 0, 10);
  const accepted = parseInt(qtyAccepted, 10);
  const rejected = parseInt(qtyRejected, 10) || 0;
  const examDate = examinationDate || inspectionDate || new Date().toISOString().split('T')[0];

  // 1. Validasi Kuantitas Fisik
  const qtyVal = validateReceiptQuantities(shipped, accepted, rejected);
  if (!qtyVal.valid) {
    throw new Error(qtyVal.error);
  }

  // 2. Validasi Reject Reason jika ada bibit reject
  if (rejected > 0 && (!rejectReason || !rejectReason.trim())) {
    throw new Error(`Alasan reject/rusak wajib diisi untuk ${rejected.toLocaleString('id-ID')} Pkk bibit yang ditolak.`);
  }

  // 3. Validasi Discrepancy Reason jika ada selisih fisik
  const discrepancy = shipped - (accepted + rejected);
  if (discrepancy > 0 && (!discrepancyReason || !discrepancyReason.trim())) {
    throw new Error(`Alasan selisih fisik wajib diisi untuk selisih ${discrepancy.toLocaleString('id-ID')} Pkk bibit yang tidak sampai/hilang.`);
  }

  // 4. Validasi Alokasi Blok
  const blockVal = validateBlockAllocations(
    accepted,
    blockAllocations,
    'LAPANGAN',
    receipt.targetEstateId,
    receipt.targetNextDivisionId || currentUser.divisionId
  );
  if (!blockVal.valid) {
    throw new Error(blockVal.error);
  }

  // 5. Validasi Bukti Foto Kamera
  if (!photoEvidence) {
    throw new Error('Bukti foto fisik penerimaan wajib dilampirkan.');
  }
  const photoVal = validatePhotoEvidence(photoEvidence);
  if (!photoVal.valid) {
    throw new Error(photoVal.error);
  }

  // 6. Status Final
  const finalStatus = discrepancy > 0
    ? RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH
    : RECEIPT_KSP_STATUS.DITERIMA;

  const updatedDetails = Array.isArray(receipt.details) ? [...receipt.details] : [];
  if (updatedDetails.length > 0) {
    updatedDetails[0] = {
      ...updatedDetails[0],
      qtyAccepted: accepted,
      qtyRejected: rejected,
      rejectReason: rejectReason ? rejectReason.trim() : null
    };
  }

  const patch = {
    status: finalStatus,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[finalStatus],
    totalAcceptedQty: accepted,
    totalRejectedQty: rejected,
    discrepancyQty: discrepancy,
    discrepancyReason: discrepancy > 0 ? discrepancyReason.trim() : null,
    examinationDate: examDate,
    blockAllocations: blockVal.allocations || blockAllocations,
    photoEvidence: photoEvidence,
    asistenNotes: notes ? notes.trim() : null,
    details: updatedDetails,
    targetNextRole: null,
    finalizedAt: new Date().toISOString(),
    finalizedByUserId: currentUser.userId || currentUser.id,
    finalizedByName: currentUser.name || currentUser.userId
  };

  const auditDetails = `Asisten Lapangan (${currentUser.name || currentUser.userId}) menyelesaikan penerimaan fisik: ${accepted.toLocaleString('id-ID')} Layak, ${rejected.toLocaleString('id-ID')} Reject${discrepancy > 0 ? ` (Selisih: ${discrepancy} Pkk)` : ''}, dialokasikan ke ${blockVal.allocations.length} blok`;

  const updatedReceipt = updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.APPROVE,
    auditDetails,
    currentUser
  );
  await syncCompletedBibitReceiptToRequest(receipt, currentUser, {
    status: finalStatus,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[finalStatus],
    workflowStage: 'SELESAI',
    receiptDocNo: receipt.receiptDocNo || receipt.docNo,
    receivedAt: new Date().toISOString(),
    receivedByName: currentUser.name || currentUser.userId,
    totalAcceptedQty: accepted,
    totalRejectedQty: rejected,
    discrepancyQty: discrepancy,
    discrepancyReason: discrepancy > 0 ? discrepancyReason.trim() : null,
    targetNextRole: null
  }, auditDetails);
  return updatedReceipt;
}

/**
 * Eksekusi Verifikasi & Penerusan ke Mantri Bibitan oleh Asisten Bibitan
 * @param {string} receiptId
 * @param {Object} formValues
 * @param {string} [formValues.notes]
 * @param {Object} currentUser
 * @returns {Object} Updated receipt record
 */
export function processAsistenBibitanVerification(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const receipt = getReceiptKspById(receiptId);
  if (!receipt) throw new Error(`Dokumen #${receiptId} tidak ditemukan`);

  if (!canPerformAsistenBibitanReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk memverifikasi dokumen penerimaan ini.');
  }

  // Validasi batch sumber
  const details = Array.isArray(receipt.details) ? receipt.details : [];
  if (details.length === 0) {
    throw new Error('Dokumen tidak memiliki rincian batch pengeluaran sumber.');
  }

  for (let i = 0; i < details.length; i++) {
    const d = details[i];
    const sId = d.sourceBatchId || d.sourceBatchCode;
    if (!sId || sId === '-' || !String(sId).trim()) {
      throw new Error(`Detail #${i + 1}: Batch sumber tidak valid atau kosong.`);
    }
    const qty = parseInt(d.qtyShipped || 0, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Detail #${i + 1}: Kuantitas kirim pada batch sumber tidak valid.`);
    }
  }

  const { notes, verificationNotes } = formValues || {};
  const cleanNotes = (notes || verificationNotes) ? (notes || verificationNotes).trim() : null;

  const patch = {
    // Normalisasi record lama LAPANGAN yang Divisi Tujuannya juga merupakan
    // Divisi Bibitan sebelum diteruskan ke Mantri.
    jalurPenerimaan: 'BIBITAN',
    status: RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN],
    targetNextRole: 'MANTRI_TANAMAN',
    targetNextEstateId: currentUser.estateId || receipt.targetEstateId,
    targetNextDivisionId: receipt.targetNextDivisionId || currentUser.divisionId || null,
    asbVerifiedAt: new Date().toISOString(),
    asbVerifiedByUserId: currentUser.userId || currentUser.id,
    asbVerifiedByName: currentUser.name || currentUser.userId,
    asbVerifiedByRole: currentUser.role || currentUser.rawRole || 'ASISTEN_BIBITAN',
    asbVerificationNotes: cleanNotes
  };

  const auditDetails = `Asisten Bibitan (${currentUser.name || currentUser.userId}) memverifikasi dokumen penerimaan pada jalur BIBITAN dan meneruskan ke Mantri Bibitan${cleanNotes ? ` - Catatan: "${cleanNotes}"` : ''}`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.APPROVE,
    auditDetails,
    currentUser
  );
}

/**
 * Eksekusi Pengembalian Dokumen ke Asisten Kepala (Askep) oleh Asisten Bibitan
 * @param {string} receiptId
 * @param {Object} formValues
 * @param {string} formValues.returnReason
 * @param {Object} currentUser
 * @returns {Object} Updated receipt record
 */
export function processAsistenBibitanReturn(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const { returnReason, notes } = formValues || {};
  const reason = returnReason || notes;

  if (!reason || !reason.trim()) {
    throw new Error('Alasan pengembalian ke Asisten Kepala wajib diisi.');
  }

  const receipt = getReceiptKspById(receiptId);
  if (!receipt) throw new Error(`Dokumen #${receiptId} tidak ditemukan`);

  if (!canPerformAsistenBibitanReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk mengembalikan dokumen penerimaan ini.');
  }

  const patch = {
    status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA],
    targetNextRole: 'ASKEP',
    targetNextEstateId: receipt.targetEstateId,
    targetNextDivisionId: null,
    asbReturnedAt: new Date().toISOString(),
    asbReturnedByUserId: currentUser.userId || currentUser.id,
    asbReturnedByName: currentUser.name || currentUser.userId,
    asbReturnReason: reason.trim()
  };

  const auditDetails = `Asisten Bibitan (${currentUser.name || currentUser.userId}) mengembalikan dokumen ke Asisten Kepala dengan alasan: "${reason.trim()}"`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.UPDATE,
    auditDetails,
    currentUser
  );
}

/**
 * Eksekusi Simpan Sementara (Draft) Pemeriksaan Fisik Mantri Bibitan
 * @param {string} receiptId
 * @param {Object} formValues
 * @param {Object} currentUser
 * @returns {Object} Updated receipt record
 */
export function processMantriBibitanDraft(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const receipt = getReceiptKspById(receiptId);
  if (!receipt) throw new Error(`Dokumen #${receiptId} tidak ditemukan`);

  if (!canPerformMantriBibitanReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk memproses dokumen penerimaan ini.');
  }

  const {
    examinationDate,
    inspectionDate,
    qtyAccepted = 0,
    qtyRejected = 0,
    rejectReason,
    discrepancyReason,
    details = [],
    photoEvidence,
    notes
  } = formValues || {};

  const shipped = parseInt(receipt.totalShippedQty || 0, 10);
  const examDate = examinationDate || inspectionDate || new Date().toISOString().split('T')[0];

  let acceptedSum = 0;
  let rejectedSum = 0;
  let updatedDetails = [];

  const sourceDetails = Array.isArray(receipt.details) ? receipt.details : [];

  if (Array.isArray(details) && details.length > 0) {
    updatedDetails = sourceDetails.map((src, i) => {
      const d = details[i] || {};
      const acc = parseInt(d.qtyAccepted, 10) || 0;
      const rej = parseInt(d.qtyRejected, 10) || 0;
      acceptedSum += acc;
      rejectedSum += rej;
      return {
        ...src,
        qtyAccepted: acc,
        qtyRejected: rej,
        rejectReason: rej > 0 ? (d.rejectReason || rejectReason || null) : null,
        targetBatchId: d.targetBatchId || src.targetBatchId || src.receivedBatchId || ''
      };
    });
  } else {
    acceptedSum = parseInt(qtyAccepted, 10) || 0;
    rejectedSum = parseInt(qtyRejected, 10) || 0;
    updatedDetails = sourceDetails.map(d => ({
      ...d,
      qtyAccepted: acceptedSum,
      qtyRejected: rejectedSum,
      rejectReason: rejectedSum > 0 ? rejectReason : null
    }));
  }

  const discrepancy = Math.max(0, shipped - (acceptedSum + rejectedSum));

  const patch = {
    status: RECEIPT_KSP_STATUS.SEDANG_DIPROSES,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.SEDANG_DIPROSES],
    totalAcceptedQty: acceptedSum,
    totalRejectedQty: rejectedSum,
    discrepancyQty: discrepancy,
    discrepancyReason: discrepancyReason || null,
    examinationDate: examDate,
    photoEvidence: photoEvidence || null,
    mantriNotes: notes || null,
    details: updatedDetails,
    targetNextRole: 'MANTRI_TANAMAN'
  };

  const auditDetails = `Mantri Bibitan (${currentUser.name || currentUser.userId}) menyimpan draft pemeriksaan fisik (${acceptedSum} Layak, ${rejectedSum} Reject)`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.UPDATE,
    auditDetails,
    currentUser
  );
}

/**
 * Eksekusi Simpan & Selesaikan Penerimaan Fisik oleh Mantri Bibitan (Pembentukan Batch Baru)
 * @param {string} receiptId
 * @param {Object} formValues
 * @param {Object} currentUser
 * @returns {Object} Updated receipt record
 */
export async function processMantriBibitanFinal(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const receipt = getReceiptKspById(receiptId);
  if (!receipt) throw new Error(`Dokumen #${receiptId} tidak ditemukan`);

  if (!canPerformMantriBibitanReceiptAction(receipt, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk menyelesaikan penerimaan fisik bibitan.');
  }

  const {
    examinationDate,
    inspectionDate,
    qtyAccepted,
    qtyRejected = 0,
    rejectReason,
    discrepancyReason,
    details = [],
    photoEvidence,
    notes,
    nurseryProgramId
  } = formValues || {};

  const receivingPrograms = getMantriReceiptPrograms(receipt, currentUser);
  const nurseryProgram = receivingPrograms.find(program => String(program.id) === String(nurseryProgramId));
  if (!nurseryProgram) {
    throw new Error(receivingPrograms.length
      ? 'Pilih program pembibitan aktif pada kebun dan divisi penerima.'
      : 'Belum ada program pembibitan aktif pada kebun dan divisi penerima.');
  }

  const shipped = parseInt(receipt.totalShippedQty || 0, 10);
  const examDate = examinationDate || inspectionDate || new Date().toISOString().split('T')[0];

  const sourceDetails = Array.isArray(receipt.details) ? receipt.details : [];
  if (sourceDetails.length === 0) {
    throw new Error('Dokumen tidak memiliki rincian batch sumber.');
  }

  let acceptedSum = 0;
  let rejectedSum = 0;
  const processedDetails = [];

  // Parse and validate each source batch detail
  for (let i = 0; i < sourceDetails.length; i++) {
    const src = sourceDetails[i];
    const formDtl = (Array.isArray(details) && details[i]) ? details[i] : null;

    const acc = formDtl !== null ? (parseInt(formDtl.qtyAccepted, 10) || 0) : (sourceDetails.length === 1 ? (parseInt(qtyAccepted, 10) || 0) : 0);
    const rej = formDtl !== null ? (parseInt(formDtl.qtyRejected, 10) || 0) : (sourceDetails.length === 1 ? (parseInt(qtyRejected, 10) || 0) : 0);
    const dtlRejectReason = (formDtl && formDtl.rejectReason) || rejectReason || '';

    // Validasi kuantitas per batch
    const itemShipped = parseInt(src.qtyShipped || 0, 10);
    const qtyVal = validateReceiptQuantities(itemShipped, acc, rej);
    if (!qtyVal.valid) {
      throw new Error(`Batch sumber ${src.sourceBatchCode || `#${i + 1}`}: ${qtyVal.error}`);
    }

    if (rej > 0 && (!dtlRejectReason || !dtlRejectReason.trim())) {
      throw new Error(`Alasan reject/rusak wajib diisi untuk batch ${src.sourceBatchCode || `#${i + 1}`}`);
    }

    // Preserve clone, category, growthStage strictly
    const dtlGrowthStage = src.growthStage || 'Rubber Advance Planting Material';
    const dtlCloneId = src.cloneId || receipt.clone || 'IRCA 19';
    const dtlCategory = src.category || 'Polibag Besar';
    const targetBatchId = formDtl?.targetBatchId || src.targetBatchId || src.receivedBatchId || '';
    const targetBatch = targetBatchId
      ? getMantriReceiptBatchOptions(receipt, currentUser, { cloneId: dtlCloneId, growthStage: dtlGrowthStage }, nurseryProgram.id)
        .find(batch => [batch.id, batch.batchId, batch.batchCode, batch.batchNo].filter(Boolean).map(String).includes(String(targetBatchId)))
      : null;
    if (acc > 0 && !targetBatch) {
      throw new Error(`Pilih batch tujuan aktif untuk batch sumber ${src.sourceBatchCode || `#${i + 1}`}.`);
    }

    acceptedSum += acc;
    rejectedSum += rej;

    processedDetails.push({
      ...src,
      cloneId: dtlCloneId,
      category: dtlCategory,
      growthStage: dtlGrowthStage,
      qtyAccepted: acc,
      qtyRejected: rej,
      rejectReason: rej > 0 ? dtlRejectReason.trim() : null,
      targetBatchId: targetBatch ? (targetBatch.id || targetBatch.batchId || targetBatch.batchCode || targetBatch.batchNo) : '',
      targetBatchCode: targetBatch ? (targetBatch.batchCode || targetBatch.batchNo || targetBatch.name) : ''
    });
  }

  // 1. Overall physical quantity validation
  const overallVal = validateReceiptQuantities(shipped, acceptedSum, rejectedSum);
  if (!overallVal.valid) {
    throw new Error(overallVal.error);
  }

  // 2. Reject reason validation
  if (rejectedSum > 0 && (!rejectReason || !rejectReason.trim()) && !processedDetails.some(d => d.rejectReason)) {
    throw new Error(`Alasan reject/rusak wajib diisi untuk ${rejectedSum.toLocaleString('id-ID')} Pkk bibit yang ditolak.`);
  }

  // 3. Discrepancy reason validation
  const discrepancy = shipped - (acceptedSum + rejectedSum);
  if (discrepancy > 0 && (!discrepancyReason || !discrepancyReason.trim())) {
    throw new Error(`Alasan selisih fisik wajib diisi untuk selisih ${discrepancy.toLocaleString('id-ID')} Pkk bibit.`);
  }

  // 4. Photo evidence validation
  if (!photoEvidence) {
    throw new Error('Bukti foto fisik penerimaan wajib dilampirkan.');
  }
  const photoVal = validatePhotoEvidence(photoEvidence);
  if (!photoVal.valid) {
    throw new Error(photoVal.error);
  }

  // 5. Alokasikan bibit layak ke batch aktif yang dipilih Mantri.
  const allocatedBatches = createNurseryBatchesFromReceipt(receipt, processedDetails, currentUser);

  // 6. Final Status
  const finalStatus = discrepancy > 0
    ? RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH
    : RECEIPT_KSP_STATUS.DITERIMA;

  const patch = {
    status: finalStatus,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[finalStatus],
    totalAcceptedQty: acceptedSum,
    totalRejectedQty: rejectedSum,
    discrepancyQty: discrepancy,
    discrepancyReason: discrepancy > 0 ? discrepancyReason.trim() : null,
    examinationDate: examDate,
    photoEvidence: photoEvidence,
    mantriNotes: notes ? notes.trim() : null,
    details: processedDetails,
    nurseryProgramId: nurseryProgram.id,
    nurseryProgramCode: nurseryProgram.code,
    nurseryProgramName: nurseryProgram.name,
    allocatedBatches: allocatedBatches.map(b => ({ id: b.id, batchCode: b.batchCode, qty: b.receivedQty, existing: Boolean(b.existing) })),
    newBatches: allocatedBatches.map(b => ({ id: b.id, batchCode: b.batchCode, qty: b.receivedQty, existing: Boolean(b.existing) })),
    targetNextRole: null,
    finalizedAt: new Date().toISOString(),
    finalizedByUserId: currentUser.userId || currentUser.id,
    finalizedByName: currentUser.name || currentUser.userId,
    finalizedByRole: currentUser.role || currentUser.rawRole || 'MANTRI_TANAMAN'
  };

  const auditDetails = `Mantri Bibitan (${currentUser.name || currentUser.userId}) menyelesaikan penerimaan fisik: ${acceptedSum.toLocaleString('id-ID')} Layak, ${rejectedSum.toLocaleString('id-ID')} Reject${discrepancy > 0 ? ` (Selisih: ${discrepancy} Pkk)` : ''}, dialokasikan ke ${allocatedBatches.length} batch pembibitan`;

  const updatedReceipt = updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.APPROVE,
    auditDetails,
    currentUser
  );
  await syncCompletedBibitReceiptToRequest(receipt, currentUser, {
    status: finalStatus,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[finalStatus],
    workflowStage: 'SELESAI',
    receiptDocNo: receipt.receiptDocNo || receipt.docNo,
    receivedAt: new Date().toISOString(),
    receivedByName: currentUser.name || currentUser.userId,
    totalAcceptedQty: acceptedSum,
    totalRejectedQty: rejectedSum,
    discrepancyQty: discrepancy,
    discrepancyReason: discrepancy > 0 ? discrepancyReason.trim() : null,
    nurseryProgramId: nurseryProgram.id,
    nurseryProgramCode: nurseryProgram.code,
    nurseryProgramName: nurseryProgram.name,
    allocatedBatches: allocatedBatches.map(batch => ({ id: batch.id, batchCode: batch.batchCode, qty: batch.receivedQty })),
    targetNextRole: null
  }, auditDetails);
  return updatedReceipt;
}

/**
 * Buka Modal Form Catat Penerimaan Awal (Role Pengurus)
 */
export function openPengurusInitialReceiptModal(item, currentUser, onSuccess = null) {
  if (isMataEntresReceipt(item)) {
    if (!canPerformPengurusReceiptAction(item, currentUser)) {
      toast('Anda tidak memiliki otorisasi untuk memproses penerimaan pada dokumen ini.', 'error');
      return;
    }
    const requests = storage.get('requests_transactions', []);
    const parentRequest = requests.find(request =>
      request.id === item.parentRequestId || request.docNo === item.parentRequestDocNo
    );
    if (!parentRequest) {
      toast('Dokumen permintaan Mata Entres terkait tidak ditemukan.', 'error');
      return;
    }
    openPengurusArrivalModal(parentRequest, currentUser, onSuccess || renderReceiptKebunSepupuLanding, item.id);
    return;
  }

  if (!canPerformPengurusReceiptAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memproses penerimaan pada dokumen ini.', 'error');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const primaryDetail = (item.details && item.details[0]) || {};
  const klonName = primaryDetail.cloneId || item.clone || '-';
  const shippedQty = parseInt(item.totalShippedQty || 0, 10);
  const vehiclePlate = item.vehiclePlate || 'Tidak tercatat';

  openModal({
    title: 'Catat Penerimaan Awal Bibit',
    body: `
      <div style="padding: 2px 0; font-size: 0.84rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%;">
        <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 600;">No. Penerimaan</div>
              <div style="font-size: 0.9rem; font-weight: 700; color: #1E293B;">${esc(item.receiptDocNo || item.docNo)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 600;">Klon</div>
              <div style="font-size: 0.85rem; font-weight: 600; color: #1E293B;">${esc(klonName)}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; background: #F8FAFC; padding: 8px 10px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Surat Pengantar (DSP)</div>
              <div style="font-size: 0.80rem; font-weight: 600; color: #334155;">${esc(item.dispatchDocNo || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">No. Permintaan (NIR)</div>
              <div style="font-size: 0.80rem; font-weight: 600; color: #334155;">${esc(item.parentRequestDocNo || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Jumlah Dikirim</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: #116834;">${shippedQty.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Plat Kendaraan</div>
              <div style="font-size: 0.80rem; font-weight: 600; color: #334155;">${esc(vehiclePlate)}</div>
            </div>
          </div>
        </div>

        <form id="receipt-initial-form" onsubmit="return false;">
          <div style="margin-bottom: 12px;">
            <label for="input-received-date" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Tanggal Tiba / Diterima <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="input-received-date" 
              value="${todayStr}"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit;"
              required
            />
          </div>

          <div style="margin-bottom: 16px;">
            <label for="input-received-notes" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Catatan Pengurus (Opsional)
            </label>
            <textarea 
              id="input-received-notes" 
              rows="3" 
              placeholder="Contoh: Pengiriman bibit tiba lengkap di pos utama..."
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
            ></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button 
              type="button" 
              id="btn-cancel-receipt" 
              style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 600; color: #475569; cursor: pointer;"
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-submit-receipt" 
              style="padding: 8px 18px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer;"
            >
              Teruskan ke Askep
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  if (!modalEl) return;

  modalEl.querySelector('#btn-cancel-receipt')?.addEventListener('click', () => {
    closeModal();
  });

  modalEl.querySelector('#receipt-initial-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateInput = modalEl.querySelector('#input-received-date');
    const notesInput = modalEl.querySelector('#input-received-notes');

    const receivedDate = dateInput ? dateInput.value : '';
    const notes = notesInput ? notesInput.value : '';

    if (!receivedDate) {
      toast('Tanggal penerimaan wajib diisi', 'error');
      return;
    }

    try {
      processPengurusInitialReceipt(item.id, { receivedDate, notes }, currentUser);
      closeModal();
      toast(`Dokumen penerimaan ${item.receiptDocNo || item.docNo} berhasil diteruskan ke Asisten Kepala.`, 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] processInitialReceipt error:', err);
      toast(err.message || 'Gagal memproses penerimaan', 'error');
    }
  });
}

/**
 * Buka Modal Verifikasi Penerimaan & Penentuan Jalur oleh Askep
 */
export function openAskepVerificationModal(item, currentUser, onSuccess = null) {
  if (!canPerformAskepReceiptAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memverifikasi dokumen ini.', 'error');
    return;
  }

  const primaryDetail = (item.details && item.details[0]) || {};
  const klonName = primaryDetail.cloneId || item.clone || '-';
  const shippedQty = parseInt(item.totalShippedQty || 0, 10);
  const targetEstateId = item.targetEstateId || currentUser.estateId;

  const fieldDivisions = getFieldDivisionsForEstate(targetEstateId);
  const nurseryDivisions = getNurseryDivisionsByEstate(targetEstateId);
  const initialJalur = item.jalurPenerimaan === 'BIBITAN' || item.jalurPenerimaan === 'LAPANGAN'
    ? item.jalurPenerimaan
    : null;
  const divisionPreviewJalur = initialJalur || 'LAPANGAN';
  const isRouteCorrection = item.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN &&
    item.jalurPenerimaan === 'LAPANGAN';

  openModal({
    title: isRouteCorrection ? 'Koreksi Jalur Penerimaan' : 'Verifikasi Penerimaan & Tentukan Jalur',
    body: `
      <div style="padding: 2px 0; font-size: 0.84rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%;">
        <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 600;">No. Dokumen Penerimaan</div>
              <div style="font-size: 0.90rem; font-weight: 700; color: #1E293B;">${esc(item.receiptDocNo || item.docNo)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 600;">Klon & Jumlah</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: #116834;">${esc(klonName)} (${shippedQty.toLocaleString('id-ID')} Pkk)</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #F8FAFC; padding: 8px 10px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Kebun Asal</div>
              <div style="font-weight: 600; color: #334155;">${esc(item.sourceEstateName || item.sourceEstateId || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Tanggal Tiba</div>
              <div style="font-weight: 600; color: #334155;">${item.initialReceivedDate ? formatDate(item.initialReceivedDate) : '-'}</div>
            </div>
            ${item.pengurusNotes ? `
              <div style="grid-column: span 2;">
                <div style="font-size: 0.70rem; color: #64748B;">Catatan Pengurus</div>
                <div style="font-size: 0.78rem; color: #334155;">${esc(item.pengurusNotes)}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <form id="askep-verify-form" onsubmit="return false;">
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 8px; font-size: 0.80rem;">
              Pilih Jalur Penerimaan Bibit <span style="color: #DC2626;">*</span>
            </label>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <label id="label-jalur-lapangan" style="display: flex; flex-direction: column; padding: 10px; border: 2px solid ${initialJalur === 'LAPANGAN' ? '#116834' : '#CBD5E1'}; background: ${initialJalur === 'LAPANGAN' ? '#F0FDF4' : '#FFFFFF'}; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <input type="radio" name="radio-jalur" value="LAPANGAN" ${initialJalur === 'LAPANGAN' ? 'checked' : ''} style="accent-color: #116834; cursor: pointer;" />
                  <span style="font-weight: 700; color: #116834; font-size: 0.84rem;">Jalur Lapangan</span>
                </div>
                <span style="font-size: 0.72rem; color: #4B5563; line-height: 1.3;">Penanaman langsung ke blok tanaman (Asisten Lapangan).</span>
              </label>

              <label id="label-jalur-bibitan" style="display: flex; flex-direction: column; padding: 10px; border: ${initialJalur === 'BIBITAN' ? '2px solid #116834' : '1px solid #CBD5E1'}; background: ${initialJalur === 'BIBITAN' ? '#F0FDF4' : '#FFFFFF'}; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <input type="radio" name="radio-jalur" value="BIBITAN" ${initialJalur === 'BIBITAN' ? 'checked' : ''} style="accent-color: #116834; cursor: pointer;" />
                  <span style="font-weight: 700; color: #334155; font-size: 0.84rem;">Jalur Bibitan</span>
                </div>
                <span style="font-size: 0.72rem; color: #4B5563; line-height: 1.3;">Ditempatkan di nursery tambahan / batch baru (Asisten Bibitan).</span>
              </label>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <label for="select-target-division" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Divisi Tujuan <span style="color: #DC2626;">*</span>
            </label>
            <select 
              id="select-target-division" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF;"
              required
            ></select>
            <div id="division-help-text" style="font-size: 0.70rem; color: #64748B; margin-top: 4px;">
              Pilihan Lapangan pada divisi yang juga memiliki pembibitan akan diteruskan ke Asisten Bibitan.
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <label for="input-askep-notes" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Catatan Verifikasi Asisten Kepala (Opsional)
            </label>
            <textarea 
              id="input-askep-notes" 
              rows="2" 
              placeholder="Instruksi tambahan untuk Asisten..."
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
            ></textarea>
          </div>

          <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.25fr); gap:8px; width:100%;">
            <button 
              type="button" 
              id="btn-cancel-verify" 
              style="width:100%; min-width:0; min-height:44px; box-sizing:border-box; padding:8px 10px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; font-size:.78rem; font-weight:600; color:#475569; cursor:pointer; white-space:normal; line-height:1.2;"
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-submit-verify" 
              style="width:100%; min-width:0; min-height:44px; box-sizing:border-box; padding:8px 10px; background:#116834; border:1px solid #116834; border-radius:8px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer; white-space:normal; line-height:1.2;"
            >
              Verifikasi & Teruskan
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  if (!modalEl) return;

  const selectDiv = modalEl.querySelector('#select-target-division');
  const helpText = modalEl.querySelector('#division-help-text');
  const labelLapangan = modalEl.querySelector('#label-jalur-lapangan');
  const labelBibitan = modalEl.querySelector('#label-jalur-bibitan');

  const updateDivisionOptions = (jalur) => {
    const list = jalur === 'LAPANGAN' ? fieldDivisions : nurseryDivisions;
    if (selectDiv) {
      if (list.length === 0) {
        selectDiv.innerHTML = `<option value="">Tidak ada divisi aktif</option>`;
      } else {
        selectDiv.innerHTML = list.map((d, idx) => {
          return `<option value="${esc(d.divisionId)}" ${idx === 0 ? 'selected' : ''}>${esc(d.divisionName || d.divisionCode)} (${esc(d.divisionId)})</option>`;
        }).join('');
      }
    }
    if (helpText) {
      helpText.textContent = jalur === 'LAPANGAN'
        ? `Menampilkan ${list.length} divisi lapangan aktif. Jika divisi juga memiliki pembibitan, dokumen diteruskan ke Asisten Bibitan.`
        : `Menampilkan ${list.length} divisi pembibitan aktif pada kebun ${item.targetEstateName || targetEstateId}.`;
    }
  };

  updateDivisionOptions(divisionPreviewJalur);

  modalEl.querySelectorAll('input[name="radio-jalur"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const chosen = e.target.value;
      if (chosen === 'LAPANGAN') {
        labelLapangan.style.borderColor = '#116834';
        labelLapangan.style.background = '#F0FDF4';
        labelBibitan.style.borderColor = '#CBD5E1';
        labelBibitan.style.background = '#FFFFFF';
      } else {
        labelBibitan.style.borderColor = '#116834';
        labelBibitan.style.background = '#F0FDF4';
        labelLapangan.style.borderColor = '#CBD5E1';
        labelLapangan.style.background = '#FFFFFF';
      }
      updateDivisionOptions(chosen);
    });
  });

  modalEl.querySelector('#btn-cancel-verify')?.addEventListener('click', () => {
    closeModal();
  });

  modalEl.querySelector('#askep-verify-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const radioVal = modalEl.querySelector('input[name="radio-jalur"]:checked')?.value;
    const divVal = selectDiv ? selectDiv.value : '';
    const notesVal = modalEl.querySelector('#input-askep-notes')?.value || '';

    if (!radioVal || !divVal) {
      toast('Silakan lengkapi pemilihan jalur dan divisi.', 'error');
      return;
    }

    try {
      const updatedReceipt = processAskepVerification(item.id, { jalurPenerimaan: radioVal, targetDivisionId: divVal, notes: notesVal }, currentUser);
      closeModal();
      const nextTeam = updatedReceipt.jalurPenerimaan === 'LAPANGAN' ? 'Asisten Lapangan' : 'Asisten Bibitan';
      toast(`Dokumen penerimaan berhasil diverifikasi ke ${nextTeam}.`, 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] processAskepVerification error:', err);
      toast(err.message || 'Gagal memverifikasi dokumen penerimaan', 'error');
    }
  });
}

/**
 * Buka Modal Kembalikan Dokumen ke Pengurus oleh Askep
 */
export function openAskepReturnModal(item, currentUser, onSuccess = null) {
  if (!canPerformAskepReceiptAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mengembalikan dokumen ini.', 'error');
    return;
  }

  openModal({
    title: 'Kembalikan Dokumen ke Pengurus',
    body: `
      <div style="padding: 2px 0; font-size: 0.84rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="color: #475569; margin: 0 0 12px 0; line-height: 1.45;">
          Dokumen <strong>${esc(item.receiptDocNo || item.docNo)}</strong> akan dikembalikan ke Pengurus untuk dilakukan revisi administratif.
        </p>

        <form id="askep-return-form" onsubmit="return false;">
          <div style="margin-bottom: 16px;">
            <label for="input-return-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Alasan Pengembalian <span style="color: #DC2626;">*</span>
            </label>
            <textarea 
              id="input-return-reason" 
              rows="3" 
              placeholder="Jelaskan alasan pengembalian dokumen secara rinci..." 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
              required
            ></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button 
              type="button" 
              id="btn-cancel-return" 
              style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 600; color: #475569; cursor: pointer;"
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-submit-return" 
              style="padding: 8px 18px; background: #DC2626; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer;"
            >
              Kembalikan ke Pengurus
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  if (!modalEl) return;

  modalEl.querySelector('#btn-cancel-return')?.addEventListener('click', () => {
    closeModal();
  });

  modalEl.querySelector('#askep-return-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const reasonInput = modalEl.querySelector('#input-return-reason');
    const returnReason = reasonInput ? reasonInput.value : '';

    if (!returnReason.trim()) {
      toast('Alasan pengembalian wajib diisi', 'error');
      return;
    }

    try {
      processAskepReturn(item.id, { returnReason }, currentUser);
      closeModal();
      toast(`Dokumen penerimaan ${item.receiptDocNo || item.docNo} telah dikembalikan ke Pengurus.`, 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] processAskepReturn error:', err);
      toast(err.message || 'Gagal mengembalikan dokumen penerimaan', 'error');
    }
  });
}

/**
 * Buka Modal Form Pemeriksaan Fisik & Alokasi Blok oleh Asisten Lapangan
 */
export function openAsistenLapanganPhysicalReceiptModal(item, currentUser, onSuccess = null) {
  if (!canPerformAsistenLapanganReceiptAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memeriksa dokumen ini.', 'error');
    return;
  }

  const todayStr = item.examinationDate || new Date().toISOString().split('T')[0];
  const primaryDetail = (item.details && item.details[0]) || {};
  const klonName = primaryDetail.cloneId || item.clone || '-';
  const shippedQty = parseInt(item.totalShippedQty || 0, 10);
  const targetDivisionId = item.targetNextDivisionId || currentUser.divisionId;
  const targetEstateId = item.targetNextEstateId || currentUser.estateId;

  // Initial values dari draft jika ada
  const initialAccepted = item.totalAcceptedQty !== undefined && item.totalAcceptedQty > 0 ? item.totalAcceptedQty : shippedQty;
  const initialRejected = item.totalRejectedQty || 0;
  const initialRejectReason = (primaryDetail.rejectReason || '');
  const initialDiscrepancyReason = (item.discrepancyReason || '');
  const initialNotes = item.asistenNotes || '';

  // Dapatkan blok aktif divisi Asisten
  const availableBlocks = getActiveBlocksForDivision(targetEstateId, targetDivisionId);

  // Initial block allocations
  let currentAllocations = Array.isArray(item.blockAllocations) && item.blockAllocations.length > 0
    ? [...item.blockAllocations]
    : (availableBlocks.length > 0 ? [{ blockId: availableBlocks[0].id, allocatedQty: initialAccepted }] : []);

  // Initial Photo Data
  let capturedPhoto = item.photoEvidence || null;

  openModal({
    title: 'Pemeriksaan Fisik & Alokasi Blok Lapangan',
    body: `
      <div style="padding:0; font-size:.78rem; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1E293B; box-sizing:border-box; width:100%;">
        
        <!-- SUMMARY SECTION -->
        <div style="margin-bottom: 12px; padding: 8px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-weight: 700; color: #1E293B;">${esc(item.receiptDocNo || item.docNo)}</div>
            <div style="font-weight: 700; color: #116834;">${shippedQty.toLocaleString('id-ID')} Pkk (${esc(klonName)})</div>
          </div>
          <div style="font-size: 0.72rem; color: #64748B;">
            SPB: <strong>${esc(item.parentRequestDocNo || '-')}</strong> • DSP: <strong>${esc(item.dispatchDocNo || '-')}</strong> • Asal: <strong>${esc(item.sourceEstateName || item.sourceEstateId)}</strong>
          </div>
        </div>

        <form id="form-physical-receipt" onsubmit="return false;">
          
          <!-- Tanggal Pemeriksaan -->
          <div style="margin-bottom: 12px;">
            <label for="input-exam-date" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 3px; font-size: 0.76rem;">
              Tanggal Pemeriksaan Fisik <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="input-exam-date" 
              value="${todayStr}"
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"
              required
            />
          </div>

          <!-- KUANTITAS FISIK GRID -->
          <div style="margin-bottom: 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px;">
            <div style="font-weight: 700; color: #1E293B; font-size: 0.78rem; margin-bottom: 8px;">Kuantitas Fisik Penerimaan</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <label for="input-qty-accepted" style="display: block; font-size: 0.72rem; font-weight: 600; color: #166534; margin-bottom: 2px;">
                  Jumlah Layak (Pkk) <span style="color: #DC2626;">*</span>
                </label>
                <input 
                  type="number" 
                  id="input-qty-accepted" 
                  value="${initialAccepted}" 
                  min="0" 
                  max="${shippedQty}"
                  style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #86EFAC; background: #F0FDF4; border-radius: 6px; font-weight: 700; color: #166534; font-size: 0.85rem;"
                  required
                />
              </div>

              <div>
                <label for="input-qty-rejected" style="display: block; font-size: 0.72rem; font-weight: 600; color: #991B1B; margin-bottom: 2px;">
                  Jumlah Reject/Rusak (Pkk)
                </label>
                <input 
                  type="number" 
                  id="input-qty-rejected" 
                  value="${initialRejected}" 
                  min="0" 
                  max="${shippedQty}"
                  style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #FCA5A5; background: #FEF2F2; border-radius: 6px; font-weight: 700; color: #991B1B; font-size: 0.85rem;"
                />
              </div>
            </div>

            <!-- Live Selisih Bar -->
            <div id="discrepancy-status-bar" style="font-size: 0.72rem; padding: 4px 8px; border-radius: 4px; background: #F1F5F9; color: #475569; display: flex; justify-content: space-between;">
              <span>Dikirim: <strong>${shippedQty} Pkk</strong></span>
              <span id="label-discrepancy-info">Total Fisik: <strong>${shippedQty} Pkk</strong> (Tepat)</span>
            </div>
          </div>

          <!-- REASON REJECT (CONDITIONAL) -->
          <div id="container-reject-reason" style="display: ${initialRejected > 0 ? 'block' : 'none'}; margin-bottom: 12px;">
            <label for="input-reject-reason" style="display: block; font-weight: 700; color: #991B1B; margin-bottom: 3px; font-size: 0.76rem;">
              Alasan Bibit Reject / Rusak <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="text" 
              id="input-reject-reason" 
              value="${esc(initialRejectReason)}"
              placeholder="Contoh: Batang patah saat transportasi, polibag pecah..."
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 0.80rem;"
            />
          </div>

          <!-- REASON DISCREPANCY (CONDITIONAL) -->
          <div id="container-discrepancy-reason" style="display: none; margin-bottom: 12px;">
            <label for="input-discrepancy-reason" style="display: block; font-weight: 700; color: #D97706; margin-bottom: 3px; font-size: 0.76rem;">
              Alasan Selisih Fisik Pengiriman <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="text" 
              id="input-discrepancy-reason" 
              value="${esc(initialDiscrepancyReason)}"
              placeholder="Contoh: Jumlah fisik di bak truk kurang dari manifes pengantar..."
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #FCD34D; border-radius: 6px; font-size: 0.80rem;"
            />
          </div>

          <!-- SECTION ALOKASI BLOK -->
          <div style="margin-bottom: 14px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; background: #FAFAFA;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 700; color: #1E293B; font-size: 0.78rem;">Alokasi Blok Tanaman (Divisi ${esc(targetDivisionId)})</div>
                <div id="allocation-balance-info" style="font-size: 0.70rem; color: #166534; font-weight: 600;">
                  Dialokasikan: ${initialAccepted} / ${initialAccepted} Pkk (Pas)
                </div>
              </div>
              <button 
                type="button" 
                id="btn-add-block-row" 
                style="padding: 4px 8px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.72rem; font-weight: 600; color: #116834; cursor: pointer;"
              >
                + Tambah Blok
              </button>
            </div>

            <div id="block-rows-container">
              <!-- Dynamic Rows -->
            </div>
          </div>

          <!-- SECTION FOTO KAMERA -->
          <div style="margin-bottom: 14px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; background: #FFFFFF;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px; font-size: 0.78rem;">
              Bukti Foto Fisik Bibit di Lapangan <span style="color: #DC2626;">*</span>
            </label>
            
            <div id="photo-preview-box" style="display: ${capturedPhoto ? 'flex' : 'none'}; align-items: center; gap: 10px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
              <img id="img-photo-preview" src="${capturedPhoto ? capturedPhoto.dataUrl : ''}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #86EFAC;" alt="Foto" />
              <div style="flex: 1; font-size: 0.72rem; color: #166534;">
                <div style="font-weight: 700;">Foto Kamera Tersedia</div>
                <div>Sumber: <strong>CAMERA</strong> • Oleh: <strong>${esc(currentUser.name || currentUser.userId)}</strong></div>
              </div>
              <button type="button" id="btn-retake-photo" style="background: transparent; border: none; color: #DC2626; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Ulangi</button>
            </div>

            <div id="camera-capture-trigger" style="display: ${capturedPhoto ? 'none' : 'block'};">
              <button 
                type="button" 
                id="btn-open-camera" 
                style="width: 100%; padding: 8px; background: #F8FAFC; border: 1px dashed #94A3B8; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Buka Kamera & Ambil Foto
              </button>
            </div>
          </div>

          <!-- Catatan Asisten -->
          <div style="margin-bottom: 16px;">
            <label for="input-asisten-notes" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Catatan Asisten Lapangan (Opsional)
            </label>
            <textarea 
              id="input-asisten-notes" 
              rows="2" 
              placeholder="Catatan kondisi bibit, kesiapan lubang tanam..."
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; resize: vertical;"
            >${esc(initialNotes)}</textarea>
          </div>

          <!-- ACTION BUTTONS -->
          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
            <button 
              type="button" 
              id="btn-cancel-modal" 
              style="padding: 7px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #475569; cursor: pointer;"
            >
              Batal
            </button>
            <button 
              type="button" 
              id="btn-save-draft" 
              style="padding: 7px 14px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #334155; cursor: pointer;"
            >
              Simpan Draft
            </button>
            <button 
              type="submit" 
              id="btn-save-final" 
              style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;"
            >
              Selesaikan Penerimaan
            </button>
          </div>

        </form>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  if (!modalEl) return;

  const inputAccepted = modalEl.querySelector('#input-qty-accepted');
  const inputRejected = modalEl.querySelector('#input-qty-rejected');
  const containerReject = modalEl.querySelector('#container-reject-reason');
  const containerDiscrepancy = modalEl.querySelector('#container-discrepancy-reason');
  const discrepancyLabel = modalEl.querySelector('#label-discrepancy-info');
  const blockRowsContainer = modalEl.querySelector('#block-rows-container');
  const allocationBalanceInfo = modalEl.querySelector('#allocation-balance-info');
  const photoPreviewBox = modalEl.querySelector('#photo-preview-box');
  const cameraTrigger = modalEl.querySelector('#camera-capture-trigger');
  const imgPhotoPreview = modalEl.querySelector('#img-photo-preview');

  // Render Rows Alokasi Blok
  const renderBlockRows = () => {
    if (currentAllocations.length === 0) {
      blockRowsContainer.innerHTML = `<div style="font-size: 0.72rem; color: #64748B; padding: 4px 0;">Belum ada blok yang dialokasikan.</div>`;
      return;
    }

    blockRowsContainer.innerHTML = currentAllocations.map((alloc, idx) => {
      const blockOptions = availableBlocks.map(b => {
        const isSel = b.id === alloc.blockId ? 'selected' : '';
        return `<option value="${esc(b.id)}" ${isSel}>${esc(b.blockName)} (${esc(b.blockCode)})</option>`;
      }).join('');

      return `
        <div class="row-block-alloc" data-index="${idx}" style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
          <select class="select-alloc-block" data-index="${idx}" style="flex: 2; padding: 5px 8px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.76rem; background: #FFFFFF;">
            ${blockOptions}
          </select>
          <input 
            type="number" 
            class="input-alloc-qty" 
            data-index="${idx}" 
            value="${alloc.allocatedQty || 0}" 
            min="1" 
            style="flex: 1; padding: 5px 8px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.76rem; font-weight: 600;" 
            placeholder="Qty"
          />
          <button 
            type="button" 
            class="btn-remove-alloc-row" 
            data-index="${idx}" 
            style="background: transparent; border: none; color: #DC2626; cursor: pointer; padding: 4px;"
            title="Hapus baris"
          >
            ✕
          </button>
        </div>
      `;
    }).join('');

    // Attach row events
    blockRowsContainer.querySelectorAll('.select-alloc-block').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const i = parseInt(e.target.dataset.index, 10);
        currentAllocations[i].blockId = e.target.value;
        updateCalculations();
      });
    });

    blockRowsContainer.querySelectorAll('.input-alloc-qty').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const i = parseInt(e.target.dataset.index, 10);
        currentAllocations[i].allocatedQty = parseInt(e.target.value, 10) || 0;
        updateCalculations();
      });
    });

    blockRowsContainer.querySelectorAll('.btn-remove-alloc-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.index, 10);
        currentAllocations.splice(i, 1);
        renderBlockRows();
        updateCalculations();
      });
    });
  };

  // Add block row button
  modalEl.querySelector('#btn-add-block-row')?.addEventListener('click', () => {
    const unallocatedBlock = availableBlocks.find(b => !currentAllocations.some(a => a.blockId === b.id)) || availableBlocks[0];
    if (unallocatedBlock) {
      currentAllocations.push({ blockId: unallocatedBlock.id, allocatedQty: 0 });
      renderBlockRows();
      updateCalculations();
    }
  });

  // Calculation & Balance updater
  const updateCalculations = () => {
    const acc = parseInt(inputAccepted.value, 10) || 0;
    const rej = parseInt(inputRejected.value, 10) || 0;
    const totalPhysical = acc + rej;
    const discrepancy = shippedQty - totalPhysical;

    // Toggle Reject Reason
    if (rej > 0) {
      containerReject.style.display = 'block';
    } else {
      containerReject.style.display = 'none';
    }

    // Toggle Discrepancy Reason
    if (discrepancy > 0) {
      containerDiscrepancy.style.display = 'block';
      discrepancyLabel.innerHTML = `Total Fisik: <strong>${totalPhysical} Pkk</strong> (<span style="color: #D97706; font-weight: 700;">Selisih: ${discrepancy} Pkk</span>)`;
    } else if (discrepancy < 0) {
      discrepancyLabel.innerHTML = `<span style="color: #DC2626; font-weight: 700;">Kelebihan: ${Math.abs(discrepancy)} Pkk (Tidak Valid)</span>`;
    } else {
      containerDiscrepancy.style.display = 'none';
      discrepancyLabel.innerHTML = `Total Fisik: <strong>${totalPhysical} Pkk</strong> (<span style="color: #166534; font-weight: 700;">Lengkap</span>)`;
    }

    // Allocation balance
    const sumAlloc = currentAllocations.reduce((accm, r) => accm + (parseInt(r.allocatedQty, 10) || 0), 0);
    if (sumAlloc === acc) {
      allocationBalanceInfo.innerHTML = `<span style="color: #166534; font-weight: 700;">Dialokasikan: ${sumAlloc} / ${acc} Pkk (Pas ✅)</span>`;
    } else if (sumAlloc < acc) {
      allocationBalanceInfo.innerHTML = `<span style="color: #D97706; font-weight: 700;">Dialokasikan: ${sumAlloc} / ${acc} Pkk (Kurang ${acc - sumAlloc} Pkk)</span>`;
    } else {
      allocationBalanceInfo.innerHTML = `<span style="color: #DC2626; font-weight: 700;">Dialokasikan: ${sumAlloc} / ${acc} Pkk (Kelebihan ${sumAlloc - acc} Pkk ❌)</span>`;
    }
  };

  inputAccepted.addEventListener('input', updateCalculations);
  inputRejected.addEventListener('input', updateCalculations);

  renderBlockRows();
  updateCalculations();

  // Photo / Camera Logic
  modalEl.querySelector('#btn-open-camera')?.addEventListener('click', async () => {
    // Generate snapshot representation from session actor
    let lat = null;
    let lon = null;
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => { lat = pos.coords.latitude; lon = pos.coords.longitude; },
          () => { },
          { timeout: 2000 }
        );
      }
    } catch { }

    // Simulated camera frame with canvas dataUrl
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#116834';
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.fillText(`SIGMA NURSERY • ${item.receiptDocNo}`, 16, 40);
    ctx.fillText(`Date: ${new Date().toISOString()}`, 16, 70);
    ctx.fillText(`Inspector: ${currentUser.name || currentUser.userId}`, 16, 100);
    ctx.fillText(`Accepted: ${inputAccepted.value} Pkk`, 16, 130);

    capturedPhoto = {
      id: `PHOTO-${Date.now()}`,
      receiptId: item.id,
      dataUrl: canvas.toDataURL('image/jpeg', 0.8),
      capturedAt: new Date().toISOString(),
      capturedByUserId: currentUser.userId || currentUser.id,
      capturedByName: currentUser.name || currentUser.userId,
      capturedByRole: currentUser.role || 'ASISTEN',
      source: PHOTO_SOURCE.CAMERA,
      latitude: lat,
      longitude: lon
    };

    imgPhotoPreview.src = capturedPhoto.dataUrl;
    photoPreviewBox.style.display = 'flex';
    cameraTrigger.style.display = 'none';
    toast('Foto pemeriksaan fisik berhasil diambil dari kamera perangkat.', 'success');
  });

  modalEl.querySelector('#btn-retake-photo')?.addEventListener('click', () => {
    capturedPhoto = null;
    photoPreviewBox.style.display = 'none';
    cameraTrigger.style.display = 'block';
  });

  // Modal Buttons
  modalEl.querySelector('#btn-cancel-modal')?.addEventListener('click', () => {
    closeModal();
  });

  // Simpan Draft
  modalEl.querySelector('#btn-save-draft')?.addEventListener('click', () => {
    const payload = {
      examinationDate: modalEl.querySelector('#input-exam-date')?.value,
      qtyAccepted: parseInt(inputAccepted.value, 10) || 0,
      qtyRejected: parseInt(inputRejected.value, 10) || 0,
      rejectReason: modalEl.querySelector('#input-reject-reason')?.value,
      discrepancyReason: modalEl.querySelector('#input-discrepancy-reason')?.value,
      blockAllocations: currentAllocations,
      photoEvidence: capturedPhoto,
      notes: modalEl.querySelector('#input-asisten-notes')?.value
    };

    try {
      processAsistenLapanganDraft(item.id, payload, currentUser);
      closeModal();
      toast(`Draft pemeriksaan fisik ${item.receiptDocNo || item.docNo} berhasil disimpan.`, 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] draft error:', err);
      toast(err.message || 'Gagal menyimpan draft', 'error');
    }
  });

  // Simpan & Selesaikan
  modalEl.querySelector('#form-physical-receipt')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      examinationDate: modalEl.querySelector('#input-exam-date')?.value,
      qtyAccepted: parseInt(inputAccepted.value, 10) || 0,
      qtyRejected: parseInt(inputRejected.value, 10) || 0,
      rejectReason: modalEl.querySelector('#input-reject-reason')?.value,
      discrepancyReason: modalEl.querySelector('#input-discrepancy-reason')?.value,
      blockAllocations: currentAllocations,
      photoEvidence: capturedPhoto,
      notes: modalEl.querySelector('#input-asisten-notes')?.value
    };

    try {
      await processAsistenLapanganFinal(item.id, payload, currentUser);
      closeModal();
      toast(`Penerimaan fisik ${item.receiptDocNo || item.docNo} berhasil diselesaikan.`, 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] final error:', err);
      toast(err.message || 'Gagal menyelesaikan penerimaan fisik', 'error');
    }
  });
}

/**
 * Buka Modal Verifikasi & Penerusan ke Mantri oleh Asisten Bibitan
 */
export function openAsistenBibitanVerificationModal(item, currentUser, onSuccess = null) {
  if (!canPerformAsistenBibitanReceiptAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memverifikasi dokumen ini.', 'error');
    return;
  }

  const primaryDetail = (item.details && item.details[0]) || {};
  const klonName = primaryDetail.cloneId || item.clone || '-';
  const growthStage = primaryDetail.growthStage || 'Rubber Advance Planting Material';
  const category = primaryDetail.category || 'Polibag Besar';
  const shippedQty = parseInt(item.totalShippedQty || 0, 10);
  const vehiclePlate = item.vehiclePlate || 'Tidak tercatat';
  const targetDivision = item.targetNextDivisionName || item.targetNextDivisionId || 'Divisi Pembibitan';

  const batchRows = (item.details || []).map((b, idx) => `
    <tr style="border-bottom: 1px solid #F1F5F9;">
      <td style="padding: 6px 8px; color: #475569; font-size: 0.74rem;">#${idx + 1}</td>
      <td style="padding: 6px 8px; font-weight: 600; color: #1E293B; font-size: 0.76rem;">${esc(b.sourceBatchCode || b.sourceBatchId || '-')}</td>
      <td style="padding: 6px 8px; font-weight: 700; color: #116834; font-size: 0.76rem; text-align: right;">${(parseInt(b.qtyShipped || 0, 10)).toLocaleString('id-ID')} Pkk</td>
      <td style="padding: 6px 8px; text-align: center;">
        <span style="display: inline-block; padding: 2px 6px; font-size: 0.68rem; font-weight: 700; background: #DCFCE7; color: #166534; border-radius: 4px;">Valid</span>
      </td>
    </tr>
  `).join('');

  openModal({
    title: 'Verifikasi Asisten Bibitan',
    body: `
      <div style="padding:0; font-size:.78rem; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1E293B; box-sizing:border-box; width:100%;">
        
        <!-- SUMMARY SECTION A: PERMINTAAN & PENGELUARAN -->
        <div style="margin-bottom: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-weight: 700; color: #1E293B;">${esc(item.receiptDocNo || item.docNo)}</div>
            <div style="font-weight: 700; color: #116834; font-size: 0.88rem;">${shippedQty.toLocaleString('id-ID')} Pkk</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.74rem; color: #475569;">
            <div>NIR: <strong>${esc(item.parentRequestDocNo || '-')}</strong></div>
            <div>DSP: <strong>${esc(item.dispatchDocNo || '-')}</strong></div>
            <div>Program: <strong>${esc(item.programName || item.programId || 'Program Nursery 2026')}</strong></div>
            <div>Klon: <strong>${esc(klonName)}</strong></div>
            <div>Kategori: <strong>${esc(category)}</strong></div>
            <div>Tahap: <strong>${esc(growthStage)}</strong></div>
            <div>Plat: <strong>${esc(vehiclePlate)}</strong></div>
            <div>Asal: <strong>${esc(item.sourceEstateName || item.sourceEstateId || '-')}</strong></div>
            <div>Mantri Pengirim: <strong>${esc(item.createdByName || item.createdByUserId || '-')}</strong></div>
          </div>
        </div>

        <!-- SUMMARY SECTION B: PENERIMAAN AWAL & ROUTING ASKEP -->
        <div style="margin-bottom: 12px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 700; color: #166534; margin-bottom: 4px;">
            Penerimaan Awal Pengurus & Verifikasi Askep
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.74rem; color: #166534;">
            <div>Tanggal Tiba: <strong>${item.initialReceivedDate ? formatDate(item.initialReceivedDate) : '-'}</strong></div>
            <div>Jalur: <strong>BIBITAN</strong></div>
            <div>Divisi Bibitan: <strong>${esc(targetDivision)}</strong></div>
            <div>Askep: <strong>${esc(item.askepVerifiedByName || item.askepVerifiedByUserId || 'Asisten Kepala')}</strong></div>
            ${item.pengurusNotes ? `<div style="grid-column: span 2;">Catatan Pengurus: <em>"${esc(item.pengurusNotes)}"</em></div>` : ''}
            ${item.askepNotes ? `<div style="grid-column: span 2;">Catatan Askep: <em>"${esc(item.askepNotes)}"</em></div>` : ''}
          </div>
        </div>

        <!-- SUMMARY SECTION C: RINCIAN BATCH SUMBER -->
        <div style="margin-bottom: 14px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 6px 10px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 0.74rem; font-weight: 700; color: #475569;">
            Daftar Batch Sumber Pengeluaran
          </div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                <th style="padding: 6px 8px; font-size: 0.70rem; color: #64748B;">No</th>
                <th style="padding: 6px 8px; font-size: 0.70rem; color: #64748B;">Kode Batch</th>
                <th style="padding: 6px 8px; font-size: 0.70rem; color: #64748B; text-align: right;">Kuantitas</th>
                <th style="padding: 6px 8px; font-size: 0.70rem; color: #64748B; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${batchRows}
            </tbody>
          </table>
        </div>

        <form id="form-asb-verify" onsubmit="return false;">
          <div style="margin-bottom: 12px;">
            <label for="input-asb-notes" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Catatan Verifikasi
            </label>
            <textarea 
              id="input-asb-notes" 
              rows="2" 
              placeholder="Catatan verifikasi penerimaan bibit..."
              style="width: 100%; min-height:48px; box-sizing:border-box; padding:8px 10px; border:1px solid #CBD5E1; border-radius:8px; font-size:.80rem; font-family:inherit; resize:vertical;"
            ></textarea>
          </div>

          <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; width:100%;">
            <button 
              type="button" 
              id="btn-asb-return" 
              style="width:100%; min-width:0; min-height:50px; box-sizing:border-box; padding:8px 10px; background:#FFFFFF; border:1px solid #FCA5A5; border-radius:8px; font-size:.80rem; font-weight:700; color:#DC2626; cursor:pointer; text-align:center; line-height:1.2; white-space:normal;"
            >
              Kembalikan ke Askep
            </button>
            <button
              type="submit"
              id="btn-asb-submit"
              style="width:100%; min-width:0; min-height:50px; box-sizing:border-box; padding:8px 10px; background:#116834; border:1px solid #116834; border-radius:8px; font-size:.80rem; font-weight:700; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.2; white-space:normal;"
            >
              Verifikasi &amp; Teruskan ke Mantri
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  if (!modalEl) return;

  modalEl.querySelector('#btn-asb-return')?.addEventListener('click', () => {
    closeModal();
    openAsistenBibitanReturnModal(item, currentUser, onSuccess);
  });

  modalEl.querySelector('#form-asb-verify')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const notes = modalEl.querySelector('#input-asb-notes')?.value || '';

    try {
      processAsistenBibitanVerification(item.id, { notes }, currentUser);
      closeModal();
      toast(`Dokumen penerimaan ${item.receiptDocNo || item.docNo} berhasil diverifikasi dan diteruskan ke Mantri Bibitan.`, 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] asb verify error:', err);
      toast(err.message || 'Gagal memverifikasi dokumen penerimaan', 'error');
    }
  });
}

/**
 * Buka Modal Pengembalian Dokumen ke Askep oleh Asisten Bibitan
 */
export function openAsistenBibitanReturnModal(item, currentUser, onSuccess = null) {
  if (!canPerformAsistenBibitanReceiptAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mengembalikan dokumen ini.', 'error');
    return;
  }

  openModal({
    title: 'Kembalikan Dokumen ke Askep',
    body: `
      <div style="padding: 2px 0; font-size: 0.84rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%;">
        <div style="margin-bottom: 12px; padding: 8px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px;">
          <div style="font-weight: 700; color: #991B1B; margin-bottom: 2px;">
            ${esc(item.receiptDocNo || item.docNo)}
          </div>
          <div style="font-size: 0.74rem; color: #7F1D1D;">
            Dokumen akan dikembalikan ke antrean Verifikasi Asisten Kepala untuk peninjauan ulang routing.
          </div>
        </div>

        <form id="asb-return-form" onsubmit="return false;">
          <div style="margin-bottom: 16px;">
            <label for="input-asb-return-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Alasan Pengembalian ke Asisten Kepala <span style="color: #DC2626;">*</span>
            </label>
            <textarea 
              id="input-asb-return-reason" 
              rows="3" 
              placeholder="Jelaskan ketidaksesuaian administrasi atau routing..."
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
              required
            ></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button 
              type="button" 
              id="btn-cancel-asb-return" 
              style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 600; color: #475569; cursor: pointer;"
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-submit-asb-return" 
              style="padding: 8px 18px; background: #DC2626; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer;"
            >
              Kembalikan Dokumen
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  if (!modalEl) return;

  modalEl.querySelector('#btn-cancel-asb-return')?.addEventListener('click', () => {
    closeModal();
    openAsistenBibitanVerificationModal(item, currentUser, onSuccess);
  });

  modalEl.querySelector('#asb-return-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const reasonInput = modalEl.querySelector('#input-asb-return-reason');
    const returnReason = reasonInput ? reasonInput.value : '';

    if (!returnReason.trim()) {
      toast('Alasan pengembalian wajib diisi', 'error');
      return;
    }

    try {
      processAsistenBibitanReturn(item.id, { returnReason }, currentUser);
      closeModal();
      toast(`Dokumen penerimaan ${item.receiptDocNo || item.docNo} telah dikembalikan ke Asisten Kepala.`, 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] processAsbReturn error:', err);
      toast(err.message || 'Gagal mengembalikan dokumen penerimaan', 'error');
    }
  });
}

/**
 * Buka Modal Form Pemeriksaan Fisik & Pembentukan Batch Baru oleh Mantri Bibitan
 */
export function openMantriBibitanPhysicalReceiptModal(item, currentUser, onSuccess = null) {
  if (!canPerformMantriBibitanReceiptAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memeriksa dokumen ini.', 'error');
    return;
  }

  const todayStr = item.examinationDate || new Date().toISOString().split('T')[0];
  const primaryDetail = (item.details && item.details[0]) || {};
  const klonName = primaryDetail.cloneId || item.clone || '-';
  const growthStage = primaryDetail.growthStage || 'Rubber Advance Planting Material';
  const category = primaryDetail.category || 'Polibag Besar';
  const shippedQty = parseInt(item.totalShippedQty || 0, 10);
  const targetDivisionId = item.targetNextDivisionId || item.targetDivisionId || currentUser.divisionId || 'DIV-01';
  const receivingPrograms = getMantriReceiptPrograms(item, currentUser);
  const requestsForProgram = storage.get('requests_transactions', []);
  const parentRequestForProgram = Array.isArray(requestsForProgram)
    ? requestsForProgram.find(request => request.id === item.parentRequestId || request.docNo === item.parentRequestDocNo)
    : null;
  const targetProgramLabel = item.programName || parentRequestForProgram?.programName || item.programId || parentRequestForProgram?.programId || 'Program tidak tercatat';
  const incomingProgram = resolveProgram(item.programId || parentRequestForProgram?.programId || item.programName || parentRequestForProgram?.programName);
  let selectedNurseryProgramId = receivingPrograms.length === 1
    ? receivingPrograms[0].id
    : (receivingPrograms.find(program => program.id === incomingProgram?.id)?.id || '');

  const sourceDetails = Array.isArray(item.details) && item.details.length > 0 ? item.details : [{
    sourceBatchId: item.sourceBatchId || 'BATCH-01',
    sourceBatchCode: item.sourceBatchCode || 'B-001',
    cloneId: klonName,
    category: category,
    growthStage: growthStage,
    qtyShipped: shippedQty,
    qtyAccepted: item.totalAcceptedQty !== undefined ? item.totalAcceptedQty : shippedQty,
    qtyRejected: item.totalRejectedQty || 0,
    rejectReason: item.rejectReason || null
  }];

  // Initial values per detail
  const detailRowsState = sourceDetails.map((d, idx) => {
    const dShipped = parseInt(d.qtyShipped || 0, 10);
    const dAcc = d.qtyAccepted !== undefined && d.qtyAccepted !== null ? parseInt(d.qtyAccepted, 10) : (sourceDetails.length === 1 && item.totalAcceptedQty !== undefined ? item.totalAcceptedQty : dShipped);
    const dRej = d.qtyRejected !== undefined && d.qtyRejected !== null ? parseInt(d.qtyRejected, 10) : (sourceDetails.length === 1 && item.totalRejectedQty !== undefined ? item.totalRejectedQty : 0);
    const dRejReason = d.rejectReason || (sourceDetails.length === 1 ? item.rejectReason : '') || '';
    return {
      sourceBatchId: d.sourceBatchId || d.batchId || `BATCH-${idx + 1}`,
      sourceBatchCode: d.sourceBatchCode || d.batchCode || `B-0${idx + 1}`,
      cloneId: d.cloneId || klonName,
      category: d.category || category,
      growthStage: d.growthStage || growthStage,
      qtyShipped: dShipped,
      qtyAccepted: dAcc,
      qtyRejected: dRej,
      rejectReason: dRejReason,
      targetBatchId: d.targetBatchId || d.receivedBatchId || d.newBatchId || '',
    };
  });
  const eligibleBatchesByDetail = detailRowsState.map(detail =>
    getMantriReceiptBatchOptions(item, currentUser, detail, selectedNurseryProgramId)
  );

  // Initial Photo Data
  let capturedPhoto = item.photoEvidence || null;
  const initialDiscrepancyReason = item.discrepancyReason || '';
  const initialNotes = item.mantriNotes || item.asistenNotes || '';

  openModal({
    title: 'Penerimaan Fisik Bibit',
    body: `
      <div style="padding:0; font-size:.78rem; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1E293B; box-sizing:border-box; width:100%;">
        
        <!-- SUMMARY SECTION -->
          <div style="margin-bottom:10px; padding:10px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; display:grid; grid-template-columns:minmax(0,1fr); gap:7px; overflow-wrap:anywhere;">
            <div><div style="font-size:.68rem; color:#64748B;">No. Penerimaan</div><div style="font-weight:750; color:#0F172A;">${esc(item.receiptDocNo || item.docNo)}</div></div>
            <div><div style="font-size:.68rem; color:#64748B;">Dikirim</div><div style="font-weight:700; color:#1E293B;">${shippedQty.toLocaleString('id-ID')} Pkk · ${esc(klonName)}</div></div>
            <div><div style="font-size:.68rem; color:#64748B;">No. Permintaan</div><div style="font-weight:650; color:#334155;">${esc(item.parentRequestDocNo || '-')}</div></div>
            <div><div style="font-size:.68rem; color:#64748B;">No. Pengeluaran</div><div style="font-weight:650; color:#334155;">${esc(item.dispatchDocNo || '-')}</div></div>
            <div><div style="font-size:.68rem; color:#64748B;">Asal</div><div style="font-weight:650; color:#334155;">${esc(item.sourceEstateName || item.sourceEstateId || '-')}</div></div>
            <div><div style="font-size:.68rem; color:#64748B;">Divisi Tujuan</div><div style="font-weight:650; color:#334155;">${esc(targetDivisionId)}</div></div>
            <div><div style="font-size:.68rem; color:#64748B;">Program Pengiriman</div><div style="font-weight:650; color:#334155;">${esc(targetProgramLabel)}</div></div>
        </div>

        <div style="margin-bottom:12px;">
          <label for="input-mantri-nursery-program" style="display:block; font-weight:700; color:#334155; margin-bottom:4px; font-size:.74rem;">Program Pembibitan <span style="color:#DC2626;">*</span></label>
          <select id="input-mantri-nursery-program" style="width:100%; box-sizing:border-box; min-height:38px; padding:7px 9px; border:1px solid #CBD5E1; background:#FFFFFF; border-radius:6px; color:#1E293B; font-size:.78rem;" ${receivingPrograms.length <= 1 ? 'disabled' : ''}>
            <option value="">${receivingPrograms.length ? 'Pilih program pembibitan' : 'Belum ada program aktif di divisi penerima'}</option>
            ${receivingPrograms.map(program => `<option value="${esc(program.id)}" ${program.id === selectedNurseryProgramId ? 'selected' : ''}>${esc(program.name)} · ${esc(program.code)}</option>`).join('')}
          </select>
          <div style="margin-top:3px; font-size:.66rem; color:#64748B; line-height:1.35;">Program diambil dari kebun dan divisi Mantri penerima.</div>
        </div>

        <form id="form-mantri-physical-receipt" onsubmit="return false;">
          
          <!-- Tanggal Penerimaan -->
          <div style="margin-bottom: 12px;">
            <label for="input-exam-date" style="display:block; font-weight:700; color:#334155; margin-bottom:4px; font-size:.74rem;">
              Tanggal Penerimaan Fisik <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="input-exam-date" 
              value="${todayStr}"
              style="width:100%; box-sizing:border-box; min-height:38px; padding:7px 9px; border:1px solid #CBD5E1; background:#FFFFFF; color:#1E293B; border-radius:6px; font-size:.78rem;"
              required
            />
          </div>

          <!-- PEMERIKSAAN FISIK PER BATCH SUMBER -->
          <div style="margin-bottom: 12px;">
            <div style="font-weight:700; color:#334155; font-size:.76rem; margin-bottom:6px;">
              Rincian Penerimaan Fisik per Batch Sumber (${detailRowsState.length} Batch)
            </div>

            <div id="mantri-batch-rows-container">
              ${detailRowsState.map((b, idx) => `
                <div class="batch-detail-card" data-index="${idx}" style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:10px; margin-bottom:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:7px;">
                    <div>
                      <div style="font-size:.68rem; color:#64748B;">Batch Sumber</div>
                      <div style="font-weight:700; color:#1E293B; font-size:.78rem;">${esc(b.sourceBatchCode)} · ${esc(b.cloneId)}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size:.68rem; color:#64748B;">Dikirim</div>
                      <div style="font-weight:700; color:#1E293B; font-size:.78rem;">${b.qtyShipped.toLocaleString('id-ID')} Pkk</div>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
                    <div>
                      <label style="display:block; font-size:.70rem; font-weight:650; color:#334155; margin-bottom:3px;">
                        Jumlah Layak (Pkk) <span style="color: #DC2626;">*</span>
                      </label>
                      <input 
                        type="number" 
                        class="input-batch-accepted" 
                        data-index="${idx}" 
                        value="${b.qtyAccepted}" 
                        min="0" 
                        max="${b.qtyShipped}"
                        style="width:100%; box-sizing:border-box; min-height:38px; padding:7px 8px; border:1px solid #CBD5E1; background:#FFFFFF; border-radius:6px; font-weight:700; color:#1E293B; font-size:.80rem;"
                        required
                      />
                    </div>

                    <div>
                      <label style="display:block; font-size:.70rem; font-weight:650; color:#334155; margin-bottom:3px;">
                        Jumlah Reject (Pkk)
                      </label>
                      <input 
                        type="number" 
                        class="input-batch-rejected" 
                        data-index="${idx}" 
                        value="${b.qtyRejected}" 
                        min="0" 
                        max="${b.qtyShipped}"
                        style="width:100%; box-sizing:border-box; min-height:38px; padding:7px 8px; border:1px solid #CBD5E1; background:#FFFFFF; border-radius:6px; font-weight:700; color:#1E293B; font-size:.80rem;"
                      />
                    </div>
                  </div>

                  <!-- REJECT REASON PER BATCH -->
                  <div class="container-batch-reject" data-index="${idx}" style="display: ${b.qtyRejected > 0 ? 'block' : 'none'}; margin-bottom: 6px;">
                    <label style="display:block; font-weight:650; color:#334155; margin-bottom:3px; font-size:.70rem;">
                      Alasan Reject / Rusak <span style="color: #DC2626;">*</span>
                    </label>
                    <input 
                      type="text" 
                      class="input-batch-reject-reason" 
                      data-index="${idx}" 
                      value="${esc(b.rejectReason || '')}"
                      placeholder="Contoh: Batang patah, polibag robek..."
                      style="width:100%; box-sizing:border-box; min-height:36px; padding:6px 8px; border:1px solid #CBD5E1; border-radius:6px; font-size:.76rem; color:#1E293B;"
                    />
                  </div>

                  <div style="margin-bottom:6px;">
                    <label for="input-target-batch-${idx}" style="display:block; font-size:.70rem; font-weight:650; color:#334155; margin-bottom:4px;">
                      Batch Penerimaan <span style="color:#B91C1C;">*</span>
                    </label>
                    <select id="input-target-batch-${idx}" class="input-target-batch" data-index="${idx}" style="width:100%; box-sizing:border-box; min-height:38px; padding:7px 9px; border:1px solid #CBD5E1; background:#FFFFFF; border-radius:6px; color:#1E293B; font-size:.78rem;" ${eligibleBatchesByDetail[idx].length ? '' : 'disabled'}>
                      <option value="">${eligibleBatchesByDetail[idx].length ? 'Pilih batch penerimaan' : (selectedNurseryProgramId ? 'Belum ada batch aktif pada program ini' : 'Pilih program pembibitan terlebih dahulu')}</option>
                      ${eligibleBatchesByDetail[idx].map(batch => {
                        const batchId = batch.id || batch.batchId || batch.batchCode || batch.batchNo;
                        const batchLabel = batch.batchCode || batch.batchNo || batch.name || batchId;
                        return `<option value="${esc(batchId)}" ${String(batchId) === String(b.targetBatchId) ? 'selected' : ''}>${esc(batchLabel)}${batch.name && batch.name !== batchLabel ? ` — ${esc(batch.name)}` : ''}</option>`;
                      }).join('')}
                    </select>
                    <div style="margin-top:3px; font-size:.66rem; color:#64748B; line-height:1.35;">Pilihan mengikuti program, divisi, klon, dan tahap pembibitan.</div>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Total Bar & Live Calculation -->
            <div id="mantri-total-calc-bar" style="font-size:.70rem; padding:8px 10px; border-radius:7px; background:#F8FAFC; color:#475569; display:grid; grid-template-columns:minmax(0,1fr); gap:5px; border:1px solid #E2E8F0; line-height:1.4; overflow-wrap:anywhere;">
              <span>Total Dikirim: <strong>${shippedQty.toLocaleString('id-ID')} Pkk</strong></span>
              <span id="mantri-discrepancy-label">Total Diterima: <strong>${shippedQty.toLocaleString('id-ID')} Pkk</strong> (Lengkap)</span>
            </div>
          </div>

          <!-- REASON DISCREPANCY (CONDITIONAL) -->
          <div id="container-discrepancy-reason-mantri" style="display: none; margin-bottom: 12px;">
            <label for="input-discrepancy-reason-mantri" style="display:block; font-weight:700; color:#334155; margin-bottom:4px; font-size:.74rem;">
              Alasan Selisih Fisik Pengiriman <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="text" 
              id="input-discrepancy-reason-mantri" 
              value="${esc(initialDiscrepancyReason)}"
              placeholder="Contoh: Jumlah fisik di bak truk kurang dari manifes pengantar..."
              style="width:100%; box-sizing:border-box; min-height:38px; padding:7px 9px; border:1px solid #CBD5E1; background:#FFFFFF; border-radius:6px; font-size:.78rem; color:#1E293B;"
            />
          </div>

          <!-- SECTION FOTO KAMERA -->
          <div style="margin-bottom:10px; border:1px solid #E2E8F0; border-radius:8px; padding:10px; background:#FFFFFF;">
            <label style="display:block; font-weight:700; color:#334155; margin-bottom:6px; font-size:.74rem;">
              Bukti Foto Fisik Bibit di Nursery <span style="color: #DC2626;">*</span>
            </label>
            
            <div id="photo-preview-box-mantri" style="display:${capturedPhoto ? 'flex' : 'none'}; align-items:center; gap:10px; background:#F8FAFC; border:1px solid #E2E8F0; padding:8px; border-radius:6px; margin-bottom:8px;">
              <img id="img-photo-preview-mantri" src="${capturedPhoto ? capturedPhoto.dataUrl : ''}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border:1px solid #CBD5E1;" alt="Foto" />
              <div style="flex:1; font-size:.70rem; color:#475569;">
                <div style="font-weight:700; color:#1E293B;">Foto Kamera Tersedia</div>
                <div>Sumber: <strong>CAMERA</strong> • Oleh: <strong>${esc(currentUser.name || currentUser.userId)}</strong></div>
              </div>
              <button type="button" id="btn-retake-photo-mantri" style="background: transparent; border: none; color: #DC2626; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Ulangi</button>
            </div>

            <div id="camera-capture-trigger-mantri" style="display: ${capturedPhoto ? 'none' : 'block'};">
              <button 
                type="button" 
                id="btn-open-camera-mantri" 
                style="width:100%; min-height:40px; padding:8px; background:#FFFFFF; border:1px dashed #94A3B8; border-radius:6px; font-size:.76rem; font-weight:700; color:#334155; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Buka Kamera & Ambil Foto
              </button>
            </div>
          </div>

          <div id="mantri-camera-overlay" style="display:none; position:fixed; inset:0; background:#000; z-index:10020; flex-direction:column;">
            <header style="display:flex; justify-content:flex-end; padding:16px; position:absolute; top:0; left:0; right:0; z-index:10021;">
              <button type="button" id="btn-mantri-camera-close" aria-label="Tutup kamera" style="background:rgba(0,0,0,.5); border:0; border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; cursor:pointer; color:#fff; font-size:24px;">×</button>
            </header>
            <main style="flex:1; display:flex; justify-content:center; align-items:center; overflow:hidden; position:relative;">
              <video id="mantri-camera-video" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover;"></video>
              <canvas id="mantri-camera-canvas" style="display:none;"></canvas>
              <div id="mantri-camera-error" style="display:none; color:#FFF; text-align:center; padding:20px;"><p style="font-weight:700;">Kamera tidak tersedia atau akses ditolak.</p><p style="font-size:.8rem; color:#AAA;">Periksa izin kamera dan coba lagi.</p></div>
            </main>
            <footer style="padding:24px; display:flex; justify-content:center; align-items:center; position:absolute; bottom:0; left:0; right:0; z-index:10021; background:linear-gradient(to top,rgba(0,0,0,.8),transparent);">
              <button id="btn-mantri-camera-shutter" type="button" aria-label="Ambil foto" style="width:70px; height:70px; border-radius:50%; background:transparent; border:4px solid #FFF; display:flex; justify-content:center; align-items:center; cursor:pointer;"><div style="width:54px; height:54px; background:#FFF; border-radius:50%;"></div></button>
            </footer>
          </div>

          <!-- Catatan Mantri -->
          <div style="margin-bottom:10px;">
            <label for="input-mantri-notes" style="display:block; font-weight:700; color:#334155; margin-bottom:4px; font-size:.74rem;">
              Catatan Mantri Bibitan (Opsional)
            </label>
            <textarea 
              id="input-mantri-notes" 
              rows="2" 
              placeholder="Catatan alokasi batch atau kondisi bibit..."
              style="width:100%; box-sizing:border-box; min-height:56px; padding:7px 9px; border:1px solid #CBD5E1; border-radius:6px; font-size:.78rem; color:#1E293B; resize:vertical;"
            >${esc(initialNotes)}</textarea>
          </div>

          <!-- ACTION BUTTONS -->
          <div style="display:grid; grid-template-columns:minmax(0,1fr); gap:8px;">
            <button 
              type="button" 
              id="btn-cancel-mantri-modal" 
              style="width:100%; min-height:42px; padding:7px 10px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:6px; font-size:.74rem; font-weight:650; color:#475569; cursor:pointer;"
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-save-final-mantri" 
              style="width:100%; min-height:44px; padding:8px 12px; background:#116834; border:1px solid #116834; border-radius:6px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer;"
            >
              Selesaikan Penerimaan
            </button>
          </div>

        </form>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  if (!modalEl) return;

  const containerDiscrepancy = modalEl.querySelector('#container-discrepancy-reason-mantri');
  const discrepancyLabel = modalEl.querySelector('#mantri-discrepancy-label');
  const photoPreviewBox = modalEl.querySelector('#photo-preview-box-mantri');
  const cameraTrigger = modalEl.querySelector('#camera-capture-trigger-mantri');
  const imgPhotoPreview = modalEl.querySelector('#img-photo-preview-mantri');
  const cameraOverlay = modalEl.querySelector('#mantri-camera-overlay');
  const cameraVideo = modalEl.querySelector('#mantri-camera-video');
  const cameraCanvas = modalEl.querySelector('#mantri-camera-canvas');
  const cameraError = modalEl.querySelector('#mantri-camera-error');
  let cameraStream = null;
  const stopMantriCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    cameraStream = null;
    if (cameraVideo) cameraVideo.srcObject = null;
    if (cameraOverlay) cameraOverlay.style.display = 'none';
  };
  const getMantriPhotoPosition = () => new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  // Calculation updater
  const updateCalculations = () => {
    let totalAccepted = 0;
    let totalRejected = 0;

    detailRowsState.forEach((d, idx) => {
      const card = modalEl.querySelector(`.batch-detail-card[data-index="${idx}"]`);
      if (card) {
        const inpAcc = card.querySelector('.input-batch-accepted');
        const inpRej = card.querySelector('.input-batch-rejected');
        const inpRejReason = card.querySelector('.input-batch-reject-reason');
        const containerRej = card.querySelector('.container-batch-reject');

        const acc = parseInt(inpAcc?.value, 10) || 0;
        const rej = parseInt(inpRej?.value, 10) || 0;
        const rejReason = inpRejReason?.value || '';

        d.qtyAccepted = acc;
        d.qtyRejected = rej;
        d.rejectReason = rejReason;

        totalAccepted += acc;
        totalRejected += rej;

        if (containerRej) {
          containerRej.style.display = rej > 0 ? 'block' : 'none';
        }
      }
    });

    const totalPhysical = totalAccepted + totalRejected;
    const discrepancy = shippedQty - totalPhysical;

    if (discrepancy > 0) {
      if (containerDiscrepancy) containerDiscrepancy.style.display = 'block';
      if (discrepancyLabel) discrepancyLabel.innerHTML = `Total Diterima: <strong>${totalPhysical.toLocaleString('id-ID')} Pkk</strong> (<span style="color: #D97706; font-weight: 700;">Selisih: ${discrepancy.toLocaleString('id-ID')} Pkk</span>)`;
    } else if (discrepancy < 0) {
      if (discrepancyLabel) discrepancyLabel.innerHTML = `<span style="color: #DC2626; font-weight: 700;">Kelebihan: ${Math.abs(discrepancy).toLocaleString('id-ID')} Pkk (Tidak Valid)</span>`;
    } else {
      if (containerDiscrepancy) containerDiscrepancy.style.display = 'none';
      if (discrepancyLabel) discrepancyLabel.innerHTML = `Total Diterima: <strong>${totalPhysical.toLocaleString('id-ID')} Pkk</strong> (<span style="color: #166534; font-weight: 700;">Lengkap ✅</span>)`;
    }
  };

  // Wire row input listeners
  modalEl.querySelectorAll('.input-batch-accepted, .input-batch-rejected').forEach(inp => {
    inp.addEventListener('input', updateCalculations);
  });

  modalEl.querySelector('#input-mantri-nursery-program')?.addEventListener('change', event => {
    selectedNurseryProgramId = event.target.value;
    detailRowsState.forEach((detail, index) => {
      detail.targetBatchId = '';
      eligibleBatchesByDetail[index] = getMantriReceiptBatchOptions(item, currentUser, detail, selectedNurseryProgramId);
      const select = modalEl.querySelector(`#input-target-batch-${index}`);
      if (!select) return;
      const batches = eligibleBatchesByDetail[index];
      select.innerHTML = `<option value="">${batches.length ? 'Pilih batch penerimaan' : (selectedNurseryProgramId ? 'Belum ada batch aktif pada program ini' : 'Pilih program pembibitan terlebih dahulu')}</option>` +
        batches.map(batch => {
          const batchId = batch.id || batch.batchId || batch.batchCode || batch.batchNo;
          const batchLabel = batch.batchCode || batch.batchNo || batch.name || batchId;
          return `<option value="${esc(batchId)}">${esc(batchLabel)}${batch.name && batch.name !== batchLabel ? ` — ${esc(batch.name)}` : ''}</option>`;
        }).join('');
      select.disabled = !batches.length;
    });
  });

  modalEl.querySelectorAll('.input-target-batch').forEach(select => {
    select.addEventListener('change', () => {
      const index = Number(select.dataset.index);
      if (detailRowsState[index]) detailRowsState[index].targetBatchId = select.value;
    });
  });

  // Photo / Camera Logic
  modalEl.querySelector('#btn-open-camera-mantri')?.addEventListener('click', async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera tidak didukung pada perangkat ini.');
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (cameraVideo) {
        cameraVideo.srcObject = cameraStream;
        cameraVideo.style.display = 'block';
        await cameraVideo.play();
      }
      if (cameraError) cameraError.style.display = 'none';
      if (cameraOverlay) cameraOverlay.style.display = 'flex';
    } catch (error) {
      stopMantriCamera();
      if (cameraOverlay) cameraOverlay.style.display = 'flex';
      if (cameraVideo) cameraVideo.style.display = 'none';
      if (cameraError) cameraError.style.display = 'block';
      toast(error.message || 'Akses kamera gagal. Izinkan akses kamera lalu coba lagi.', 'error');
    }
  });

  modalEl.querySelector('#btn-mantri-camera-close')?.addEventListener('click', stopMantriCamera);
  modalEl.querySelector('#btn-mantri-camera-shutter')?.addEventListener('click', async () => {
    if (!cameraVideo?.videoWidth || !cameraCanvas) {
      toast('Kamera belum siap. Tunggu sebentar lalu coba lagi.', 'error');
      return;
    }
    const capturedAt = new Date();
    const position = await getMantriPhotoPosition();
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    const context = cameraCanvas.getContext('2d');
    context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
    const scale = cameraCanvas.width / 640;
    const fontSize = Math.max(16, Math.round(18 * scale));
    const userId = currentUser.code || currentUser.loginCode || currentUser.userId || currentUser.id || '-';
    const lines = [
      `${userId} - ${currentUser.name || 'Mantri Bibitan'}`,
      capturedAt.toLocaleString('id-ID'),
      position ? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : 'Lokasi tidak tersedia'
    ];
    const padding = Math.round(fontSize * .65);
    const lineHeight = Math.round(fontSize * 1.45);
    const stampHeight = padding * 2 + lineHeight * lines.length;
    context.fillStyle = 'rgba(0,0,0,.68)';
    context.fillRect(0, cameraCanvas.height - stampHeight, cameraCanvas.width, stampHeight);
    context.fillStyle = '#fff';
    context.font = `600 ${fontSize}px sans-serif`;
    context.textBaseline = 'top';
    lines.forEach((line, index) => context.fillText(line, padding, cameraCanvas.height - stampHeight + padding + index * lineHeight, cameraCanvas.width - padding * 2));

    capturedPhoto = {
      id: `PHOTO-${Date.now()}`,
      receiptId: item.id,
      dataUrl: cameraCanvas.toDataURL('image/jpeg', .88),
      capturedAt: capturedAt.toISOString(),
      capturedByUserId: userId,
      capturedByName: currentUser.name || 'Mantri Bibitan',
      capturedByRole: normalizeRole(currentUser.role || currentUser.rawRole) || 'MANTRI_TANAMAN',
      source: PHOTO_SOURCE.CAMERA,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
      locationCaptured: Boolean(position)
    };
    if (imgPhotoPreview) imgPhotoPreview.src = capturedPhoto.dataUrl;
    if (photoPreviewBox) photoPreviewBox.style.display = 'flex';
    if (cameraTrigger) cameraTrigger.style.display = 'none';
    stopMantriCamera();
    toast('Foto pemeriksaan fisik berhasil diambil dari kamera perangkat.', 'success');
  });

  modalEl.querySelector('#btn-retake-photo-mantri')?.addEventListener('click', () => {
    capturedPhoto = null;
    if (photoPreviewBox) photoPreviewBox.style.display = 'none';
    if (cameraTrigger) cameraTrigger.style.display = 'block';
  });

  // Cancel Button
  modalEl.querySelector('#btn-cancel-mantri-modal')?.addEventListener('click', () => {
    stopMantriCamera();
    closeModal();
  });

  // Simpan & Selesaikan Penerimaan (Final)
  modalEl.querySelector('#form-mantri-physical-receipt')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    updateCalculations();

    const payload = {
      examinationDate: modalEl.querySelector('#input-exam-date')?.value,
      nurseryProgramId: selectedNurseryProgramId,
      details: detailRowsState,
      discrepancyReason: modalEl.querySelector('#input-discrepancy-reason-mantri')?.value,
      photoEvidence: capturedPhoto,
      notes: modalEl.querySelector('#input-mantri-notes')?.value
    };

    try {
      await processMantriBibitanFinal(item.id, payload, currentUser);
      closeModal();
      toast(`Penerimaan fisik ${item.receiptDocNo || item.docNo} selesai dan bibit dialokasikan ke batch pilihan.`, 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] mantri final error:', err);
      toast(err.message || 'Gagal menyelesaikan penerimaan fisik', 'error');
    }
  });

  updateCalculations();
}

/**
 * Buka Modal Detail Dokumen Penerimaan (Read-Only 5 Section)
 */
export function openReceiptDetailModal(item) {
  if (!item) return;

  const isMataEntres = isMataEntresReceipt(item);
  const primaryDetail = (item.details && item.details[0]) || {};
  const batchListStr = (item.details || []).map(b => `${b.sourceBatchCode || b.sourceBatchId} (${(b.qtyShipped || 0).toLocaleString('id-ID')} ${isMataEntres ? 'Batang' : 'Pkk'})`).join(', ') || '-';
  const shippedQty = parseInt(isMataEntres ? (item.totalShippedMata ?? item.totalShippedQty ?? 0) : (item.totalShippedQty || 0), 10);
  const shippedBatang = parseInt(item.totalShippedBatang || 0, 10);
  const shippedText = `${shippedQty.toLocaleString('id-ID')} ${isMataEntres ? 'Mata' : 'Pkk'}${isMataEntres && shippedBatang ? ` (${shippedBatang.toLocaleString('id-ID')} Batang)` : ''}`;
  const statusPresentation = getWorkflowStatusPresentation(item.status, RECEIPT_KSP_STATUS_LABELS[item.status] || item.statusLabel);
  const statusLabel = statusPresentation.label;

  const allocationsList = Array.isArray(item.blockAllocations) && item.blockAllocations.length > 0
    ? item.blockAllocations.map(a => `${a.blockName || a.blockCode} (${(a.allocatedQty || 0).toLocaleString('id-ID')} Pkk)`).join(', ')
    : '-';

  const allocatedBatches = Array.isArray(item.allocatedBatches) && item.allocatedBatches.length > 0 ? item.allocatedBatches : item.newBatches;
  const newBatchesListStr = Array.isArray(allocatedBatches) && allocatedBatches.length > 0
    ? allocatedBatches.map(b => `${b.batchCode} (${(b.qty || 0).toLocaleString('id-ID')} Pkk)`).join(', ')
    : (Array.isArray(item.details) ? item.details.filter(d => d.receivedBatchCode || d.newBatchCode).map(d => `${d.receivedBatchCode || d.newBatchCode} (${(d.qtyAccepted || 0).toLocaleString('id-ID')} Pkk)`).join(', ') : '-');

  openModal({
    title: `Detail Penerimaan: ${item.receiptDocNo || item.docNo}`,
    body: `
      <div style="padding: 2px 0; font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B;">
        
        <!-- SECTION A: INFORMASI PERMINTAAN -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.74rem; font-weight: 700; color: #116834; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
            A. Informasi Permintaan
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Nomor NIR</div>
              <div style="font-weight: 600;">${esc(item.parentRequestDocNo || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">${isMataEntres ? 'Jenis Permintaan' : 'Program Pembibitan'}</div>
              <div style="font-weight: 600;">${isMataEntres ? 'Mata Entres' : esc(item.programName || item.programId || 'Program Nursery 2026')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Klon</div>
              <div style="font-weight: 600;">${esc(primaryDetail.cloneId || item.clone || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Kebun Asal (Pengirim)</div>
              <div style="font-weight: 600;">${esc(item.sourceEstateName || item.sourceEstateId || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Kebun Tujuan (Pemohon)</div>
              <div style="font-weight: 600;">${esc(item.targetEstateName || item.targetEstateId || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Kategori</div>
              <div style="font-weight: 600;">${isMataEntres ? 'Mata Entres' : esc(primaryDetail.category || 'Polibag Besar')}</div>
            </div>
            ${!isMataEntres ? `<div>
              <div style="font-size: 0.70rem; color: #64748B;">Tahapan Pertumbuhan</div>
              <div style="font-weight: 600;">${esc(primaryDetail.growthStage || 'Rubber Advance Planting Material')}</div>
            </div>` : ''}
          </div>
        </div>

        <!-- SECTION B: INFORMASI PENGELUARAN -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.74rem; font-weight: 700; color: #116834; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
            B. Informasi Pengeluaran
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Nomor DSP</div>
              <div style="font-weight: 600;">${esc(item.dispatchDocNo || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Tanggal Pengeluaran</div>
              <div style="font-weight: 600;">${formatDate(item.dispatchDate || item.createdAt)}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Jumlah Dikeluarkan</div>
              <div style="font-weight: 700; color: #116834;">${shippedText}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Plat Kendaraan</div>
              <div style="font-weight: 600;">${esc(item.vehiclePlate || '-')}</div>
            </div>
            <div style="grid-column: span 2;">
              <div style="font-size: 0.70rem; color: #64748B;">Mantri Pengeluaran</div>
              <div style="font-weight: 600;">${esc(item.createdByName || item.createdByUserId || '-')}</div>
            </div>
            <div style="grid-column: span 2;">
              <div style="font-size: 0.70rem; color: #64748B;">Batch Sumber</div>
              <div style="font-weight: 600; font-size: 0.78rem; color: #334155;">${esc(batchListStr)}</div>
            </div>
          </div>
        </div>

        <!-- SECTION C: INFORMASI PENERIMAAN AWAL & HASIL FISIK -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.74rem; font-weight: 700; color: #116834; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
            C. Informasi Penerimaan Awal & Hasil Fisik
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Nomor Penerimaan</div>
              <div style="font-weight: 700; color: #1E293B;">${esc(item.receiptDocNo || item.docNo)}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Status</div>
              <div><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; background: ${statusPresentation.background}; color: ${statusPresentation.color}; border:1px solid ${statusPresentation.border};">${esc(statusLabel)}</span></div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Total Dikirim</div>
              <div style="font-weight: 700; color: #116834;">${shippedText}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Tanggal Tiba</div>
              <div style="font-weight: 600;">${item.initialReceivedDate ? formatDate(item.initialReceivedDate) : '-'}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Jalur & Divisi</div>
              <div style="font-weight: 700; color: #116834;">${esc(item.jalurPenerimaan || '-')} • ${esc(item.targetNextDivisionName || item.targetNextDivisionId || '-')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Fisik Diterima</div>
              <div style="font-weight: 600;">${item.totalAcceptedQty !== undefined ? `${(item.totalAcceptedQty || 0).toLocaleString('id-ID')} Layak / ${(item.totalRejectedQty || 0).toLocaleString('id-ID')} Reject` : 'Belum Diperiksa'}</div>
            </div>
            ${item.jalurPenerimaan === 'LAPANGAN' ? `
              <div style="grid-column: span 2;">
                <div style="font-size: 0.70rem; color: #64748B;">Alokasi Blok</div>
                <div style="font-weight: 600; font-size: 0.78rem; color: #334155;">${esc(allocationsList)}</div>
              </div>
            ` : ''}
            ${item.photoEvidence ? `
              <div style="grid-column: span 2; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-top: 4px;">
                <div style="font-size: 0.70rem; color: #64748B; font-weight: 600; margin-bottom: 6px;">Bukti Foto Fisik (Kamera Perangkat)</div>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <img src="${item.photoEvidence.dataUrl}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 6px; border: 1px solid #CBD5E1;" alt="Foto Penerimaan" />
                  <div style="font-size: 0.72rem; color: #334155; line-height: 1.45;">
                    <div>Sumber: <strong style="color: #116834;">${esc(item.photoEvidence.source || 'CAMERA')}</strong></div>
                    <div>Actor: <strong>${esc(item.photoEvidence.capturedByName || item.photoEvidence.capturedByUserId || '-')}</strong> (${esc(item.photoEvidence.capturedByRole || '-')})</div>
                    <div>Waktu: <strong>${item.photoEvidence.capturedAt ? formatDate(item.photoEvidence.capturedAt) : '-'}</strong></div>
                    ${(item.photoEvidence.latitude && item.photoEvidence.longitude) ? `<div style="color: #0284C7;">GPS: <strong>${Number(item.photoEvidence.latitude).toFixed(6)}, ${Number(item.photoEvidence.longitude).toFixed(6)}</strong></div>` : '<div style="color: #94A3B8;">GPS: <em>Tidak Tersedia / Opsional</em></div>'}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- SECTION D: ROUTING & VERIFIKASI ASKEP & ASISTEN BIBITAN -->
        ${(item.jalurPenerimaan || item.askepVerifiedByUserId || item.asbVerifiedByUserId) ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #116834; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
              D. Routing & Verifikasi
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <div style="font-size: 0.70rem; color: #64748B;">Jalur Penerimaan</div>
                <div style="font-weight: 700; color: #116834;">${esc(item.jalurPenerimaan || '-')}</div>
              </div>
              <div>
                <div style="font-size: 0.70rem; color: #64748B;">Divisi Tujuan</div>
                <div style="font-weight: 600;">${esc(item.targetNextDivisionName || item.targetNextDivisionId || '-')}</div>
              </div>
              ${item.askepVerifiedByUserId ? `
                <div>
                  <div style="font-size: 0.70rem; color: #64748B;">Diverifikasi Askep</div>
                  <div style="font-weight: 600;">${esc(item.askepVerifiedByName || item.askepVerifiedByUserId)} (${formatDate(item.askepVerifiedAt)})</div>
                </div>
              ` : ''}
              ${item.asbVerifiedByUserId ? `
                <div>
                  <div style="font-size: 0.70rem; color: #64748B;">Diverifikasi Asisten Bibitan</div>
                  <div style="font-weight: 600;">${esc(item.asbVerifiedByName || item.asbVerifiedByUserId)} (${formatDate(item.asbVerifiedAt)})</div>
                </div>
              ` : ''}
              ${item.askepNotes ? `
                <div style="grid-column: span 2;">
                  <div style="font-size: 0.70rem; color: #64748B;">Catatan Askep</div>
                  <div style="font-style: italic; color: #334155;">"${esc(item.askepNotes)}"</div>
                </div>
              ` : ''}
              ${item.asbVerificationNotes ? `
                <div style="grid-column: span 2;">
                  <div style="font-size: 0.70rem; color: #64748B;">Catatan Asisten Bibitan</div>
                  <div style="font-style: italic; color: #334155;">"${esc(item.asbVerificationNotes)}"</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- SECTION E: HASIL PEMERIKSAAN FISIK MANTRI BIBITAN & BATCH BARU -->
        ${(item.finalizedByUserId || item.totalAcceptedQty !== undefined || (item.newBatches && item.newBatches.length > 0)) ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #116834; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
              E. Hasil Pemeriksaan Fisik & Alokasi Batch
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <div style="font-size: 0.70rem; color: #64748B;">Total Fisik Diterima</div>
                <div style="font-weight: 700; color: #166534;">${(item.totalAcceptedQty || 0).toLocaleString('id-ID')} Layak / ${(item.totalRejectedQty || 0).toLocaleString('id-ID')} Reject</div>
              </div>
              <div>
                <div style="font-size: 0.70rem; color: #64748B;">Tanggal Pemeriksaan</div>
                <div style="font-weight: 600;">${item.examinationDate ? formatDate(item.examinationDate) : '-'}</div>
              </div>
              ${item.discrepancyQty > 0 ? `
                <div style="grid-column: span 2;">
                  <div style="font-size: 0.70rem; color: #D97706;">Selisih Fisik (${item.discrepancyQty} Pkk)</div>
                  <div style="font-size: 0.78rem; color: #92400E;">Alasan: ${esc(item.discrepancyReason || '-')}</div>
                </div>
              ` : ''}
              ${(newBatchesListStr && newBatchesListStr !== '-') ? `
                <div style="grid-column: span 2;">
                  <div style="font-size: 0.70rem; color: #64748B; margin-bottom: 2px;">Batch Pembibitan Tujuan</div>
                  <div style="font-weight: 700; color: #116834; font-size: 0.80rem;">
                    ${esc(newBatchesListStr)}
                  </div>
                </div>
              ` : ''}
              ${item.mantriNotes ? `
                <div style="grid-column: span 2;">
                  <div style="font-size: 0.70rem; color: #64748B;">Catatan Mantri</div>
                  <div style="font-style: italic; color: #334155;">"${esc(item.mantriNotes)}"</div>
                </div>
              ` : ''}
              ${item.finalizedByUserId ? `
                <div style="grid-column: span 2;">
                  <div style="font-size: 0.70rem; color: #64748B;">Diselesaikan Oleh</div>
                  <div style="font-weight: 600;">${esc(item.finalizedByName || item.finalizedByUserId)} (${esc(item.finalizedByRole || 'MANTRI_TANAMAN')}) • ${formatDate(item.finalizedAt)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
          <button 
            type="button" 
            id="btn-close-detail" 
            style="padding: 8px 18px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer;"
          >
            Tutup
          </button>
        </div>
      </div>
    `
  });

  const modalEl = document.getElementById('modal-root');
  modalEl?.querySelector('#btn-close-detail')?.addEventListener('click', () => {
    closeModal();
  });
}

/**
 * Render Halaman Utama Penerimaan Bibit Kebun Sepupu
 */
export function renderReceiptKebunSepupuLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get();
  const currentUser = getCurrentUserContext() || resolveUserContext(user);
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);

  const allReceipts = getReceiptKspTransactions();
  const inboxType = storage.get('receipt_inbox_type', 'ALL');
  const roleScopedReceipts = filterReceiptKspRequests(allReceipts, currentUser);
  const scopedReceipts = inboxType === 'BIBIT'
    ? roleScopedReceipts.filter(isBibitReceipt)
    : inboxType === 'MATA_ENTRES'
      ? roleScopedReceipts.filter(isMataEntresReceipt)
      : roleScopedReceipts;
  const filteredList = filterReceiptKspByStatus(scopedReceipts, activeStatusFilter, currentUser);
  const actionableCount = getActionableReceiptCount(scopedReceipts, currentUser);
  const inProgressCount = filterReceiptKspByStatus(scopedReceipts, 'DIPROSES', currentUser).length;
  const completedCount = filterReceiptKspByStatus(scopedReceipts, 'SELESAI', currentUser).length;

  const isAskep = userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA';
  const isAsistenLapangan = userRole === 'ASISTEN';
  const isAsistenBibitan = userRole === 'ASISTEN_BIBITAN';
  const isMantriBibitan = userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI';
  const actionableTabLabel = (isAskep || isAsistenBibitan) ? 'Menunggu Verifikasi' : ((isAsistenLapangan || isMantriBibitan) ? 'Menunggu Pemeriksaan' : 'Menunggu Penerimaan');

  app.innerHTML = `
    <div class="page receipt-ksp-page" style="display: flex; flex-direction: column; height: 100vh; height: 100dvh; min-height: 0; overflow: hidden; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; position: sticky; top: 0; z-index: 20;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-back-ksp" type="button" aria-label="Kembali" style="padding: 6px; background: transparent; border: none; cursor: pointer; color: #116834; display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div style="min-width:0;">
            <h1 style="font-size: 1.02rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.2;">Penerimaan</h1>
            ${isAsistenBibitan ? '' : `<div style="font-size: 0.68rem; color: #64748B; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(currentUser?.estateName || currentUser?.estateId || '')}${currentUser?.divisionName && currentUser.divisionName !== currentUser.estateName ? ` • ${esc(currentUser.divisionName)}` : ''}</div>`}
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-refresh-ksp" type="button" aria-label="Refresh" style="padding: 6px; background: transparent; border: none; cursor: pointer; color: #116834; display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- MAIN CONTAINER -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 12px 14px 20px; max-width: 620px; width: 100%; margin: 0 auto; box-sizing: border-box;">
        
        <!-- STATUS FILTER TABS -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; scrollbar-width: none;">
          ${renderFilterTab('SEMUA', 'Semua', scopedReceipts.length, activeStatusFilter)}
          ${renderFilterTab('ACTIONABLE', actionableTabLabel, actionableCount, activeStatusFilter, actionableCount > 0)}
          ${renderFilterTab('DIPROSES', 'Diproses', inProgressCount, activeStatusFilter)}
          ${renderFilterTab('SELESAI', 'Selesai', completedCount, activeStatusFilter)}
        </div>

        <!-- LIST TRANSAKSI INBOX -->
        <div id="receipt-list-container">
          ${filteredList.length === 0 ? renderEmptyState() : renderReceiptCardList(filteredList, currentUser)}
        </div>

      </main>
    </div>
  `;

  app.querySelector('#btn-back-ksp')?.addEventListener('click', () => {
    navigate('/home');
  });

  app.querySelector('#btn-refresh-ksp')?.addEventListener('click', () => {
    renderReceiptKebunSepupuLanding();
  });

  app.querySelectorAll('.btn-filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.dataset.status;
      renderReceiptKebunSepupuLanding();
    });
  });

  app.querySelectorAll('.btn-view-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getReceiptKspById(id);
      if (item) openReceiptDetailModal(item);
    });
  });

  app.querySelectorAll('.btn-toggle-receipt-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (expandedReceiptIds.has(id)) expandedReceiptIds.delete(id);
      else expandedReceiptIds.add(id);
      renderReceiptKebunSepupuLanding();
    });
  });

  // Action: Pengurus Catat Penerimaan
  app.querySelectorAll('.btn-action-initial-receipt').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getReceiptKspById(id);
      if (item) {
        openPengurusInitialReceiptModal(item, currentUser, () => {
          renderReceiptKebunSepupuLanding();
        });
      }
    });
  });

  app.querySelectorAll('.btn-action-mata-entres-receipt').forEach(btn => {
    btn.addEventListener('click', () => {
      const receipt = getReceiptKspById(btn.dataset.id);
      const parentRequest = receipt && getMataEntresParentRequest(receipt);
      if (!receipt || !parentRequest || !canPerformRequesterReceipt(parentRequest, currentUser)) return;
      const onSuccess = renderReceiptKebunSepupuLanding;
      const role = normalizeRole(currentUser.role || currentUser.rawRole);
      if (role === 'PENGURUS') openPengurusArrivalModal(parentRequest, currentUser, onSuccess, receipt.id);
      else if (role === 'ASKEP' || role === 'ASISTEN_KEPALA') openAskepReceiptRoutingModal(parentRequest, currentUser, onSuccess);
      else if (role === 'ASISTEN_BIBITAN') openAsistenBibitanReceiptModal(parentRequest, currentUser, onSuccess);
      else if (role === 'MANTRI_TANAMAN' || role === 'MANTRI') openMantriBibitanReceiptModal(parentRequest, currentUser, onSuccess);
    });
  });

  app.querySelectorAll('.btn-action-mata-entres-askep-return').forEach(btn => {
    btn.addEventListener('click', () => {
      const receipt = getReceiptKspById(btn.dataset.id);
      const parentRequest = receipt && getMataEntresParentRequest(receipt);
      if (parentRequest && canPerformRequesterReceipt(parentRequest, currentUser)) {
        openMataEntresAskepReturnModal(parentRequest, currentUser, renderReceiptKebunSepupuLanding);
      }
    });
  });

  // Action: Askep Verifikasi
  app.querySelectorAll('.btn-action-askep-verify').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getReceiptKspById(id);
      if (item) {
        openAskepVerificationModal(item, currentUser, () => {
          renderReceiptKebunSepupuLanding();
        });
      }
    });
  });

  // Action: Askep Kembalikan
  app.querySelectorAll('.btn-action-askep-return').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getReceiptKspById(id);
      if (item) {
        openAskepReturnModal(item, currentUser, () => {
          renderReceiptKebunSepupuLanding();
        });
      }
    });
  });

  // Action: Asisten Lapangan Pemeriksaan Fisik & Alokasi Blok
  app.querySelectorAll('.btn-action-asisten-lapangan').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getReceiptKspById(id);
      if (item) {
        openAsistenLapanganPhysicalReceiptModal(item, currentUser, () => {
          renderReceiptKebunSepupuLanding();
        });
      }
    });
  });

  // Action: Asisten Bibitan Verifikasi & Teruskan
  app.querySelectorAll('.btn-action-asb-verify').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getReceiptKspById(id);
      if (item) {
        openAsistenBibitanVerificationModal(item, currentUser, () => {
          renderReceiptKebunSepupuLanding();
        });
      }
    });
  });

  // Action: Mantri Bibitan Penerimaan Fisik & Batch
  app.querySelectorAll('.btn-action-mantri-bibitan').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getReceiptKspById(id);
      if (item) {
        openMantriBibitanPhysicalReceiptModal(item, currentUser, () => {
          renderReceiptKebunSepupuLanding();
        });
      }
    });
  });
}

function renderFilterTab(key, label, count, currentActive, hasDot = false) {
  const isActive = key === currentActive;
  const bg = isActive ? '#116834' : '#FFFFFF';
  const color = isActive ? '#FFFFFF' : '#475569';
  const border = isActive ? '#116834' : '#CBD5E1';

  return `
    <button 
      class="btn-filter-tab" 
      data-status="${key}" 
      type="button" 
      style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: ${bg}; color: ${color}; border: 1px solid ${border}; border-radius: 20px; font-size: 0.76rem; font-weight: 600; cursor: pointer; white-space: nowrap; position: relative;"
    >
      ${esc(label)} (${count})
      ${hasDot ? `<span style="width: 7px; height: 7px; background: #DC2626; border-radius: 50%; display: inline-block;"></span>` : ''}
    </button>
  `;
}

function renderEmptyState() {
  return renderEmptyStateCard({
    title: 'Tidak Ada Dokumen Penerimaan',
    description: 'Belum ada pengiriman bibit atau mata entres yang masuk ke kebun ini untuk filter terpilih.',
    customStyle: 'margin-top: 10px;'
  });
}

function renderReceiptCardList(list, currentUser) {
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const isPengurus = userRole === 'PENGURUS';
  const isAskep = userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA';
  const isAsistenLapangan = userRole === 'ASISTEN';
  const isAsistenBibitan = userRole === 'ASISTEN_BIBITAN';
  const isMantriBibitan = userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI';

  return list.map(item => {
    if (isMataEntresReceipt(item)) return renderMataEntresReceiptCard(item, currentUser);

    const expanded = expandedReceiptIds.has(item.id);
    const isPengurusActionable = isPengurus && canPerformPengurusReceiptAction(item, currentUser);
    const isAskepActionable = isAskep && canPerformAskepReceiptAction(item, currentUser);
    const isRouteCorrection = isAskepActionable &&
      item.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN &&
      item.jalurPenerimaan === 'LAPANGAN';
    const isAsistenLapanganActionable = isAsistenLapangan && canPerformAsistenLapanganReceiptAction(item, currentUser);
    const isAsistenBibitanActionable = isAsistenBibitan && canPerformAsistenBibitanReceiptAction(item, currentUser);
    const isMantriActionable = isMantriBibitan && canPerformMantriBibitanReceiptAction(item, currentUser);
    const normalizedBibitanRoute = isAsistenBibitan && isLegacyFieldRouteToNursery(item);
    const isActionable = isPengurusActionable || isAskepActionable || isAsistenLapanganActionable || isAsistenBibitanActionable || isMantriActionable;

    const primaryDetail = (item.details && item.details[0]) || {};
    const klonName = primaryDetail.cloneId || item.clone || '-';
    const growthStage = primaryDetail.growthStage || 'Rubber Advance Planting Material';
    const category = primaryDetail.category || 'Polibag Besar';
    const isMataEntres = isMataEntresReceipt(item);
    const shippedQty = parseInt(isMataEntres ? (item.totalShippedMata ?? item.totalShippedQty ?? 0) : (item.totalShippedQty || 0), 10);
    const shippedBatang = parseInt(item.totalShippedBatang || 0, 10);
    const vehiclePlate = item.vehiclePlate || 'Tidak tercatat';
    const displayStatus = normalizedBibitanRoute
      ? RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN
      : item.status;
    const displayJalur = normalizedBibitanRoute ? 'BIBITAN' : item.jalurPenerimaan;
    const statusPresentation = getWorkflowStatusPresentation(displayStatus, RECEIPT_KSP_STATUS_LABELS[displayStatus] || item.statusLabel);
    const statusLabel = statusPresentation.label;
    const { sourceName, targetName } = getReceiptEstateRoute(item);

    return `
      <div style="background:#FFFFFF; border:1px solid ${expanded ? '#116834' : '#DCE5EF'}; border-radius:12px; padding:12px 14px; margin-bottom:10px; box-shadow:0 1px 3px rgba(15,23,42,.05); min-width:0; box-sizing:border-box;">
        
        <!-- HEADER CARD: DOC NO & STATUS -->
        <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #F1F5F9; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; min-width:0;">
            <span style="font-size:.66rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:.04em; line-height:1.35;">NO.PENERIMAAN</span>
            <span style="display:inline-flex; align-items:center; justify-content:center; flex:0 1 auto; min-width:0; max-width:56%; padding:4px 7px; border-radius:7px; border:1px solid ${statusPresentation.border}; background:${statusPresentation.background}; color:${statusPresentation.color}; font-size:.58rem; font-weight:750; line-height:1.3; text-align:center; white-space:normal; overflow-wrap:anywhere; box-sizing:border-box;">${esc(statusLabel)}</span>
          </div>
          <div style="min-width:0; flex:1;">
            <div style="font-size:.95rem; font-weight:800; color:#116834; line-height:1.35; white-space:nowrap;">${esc(item.receiptDocNo || item.docNo || '-')}</div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px; font-size:.78rem; background:#F8FAFC; padding:7px 10px; border-radius:7px; border:1px solid #F1F5F9; min-width:0;">
          <span style="font-weight:700; color:#1E293B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45%;">${esc(sourceName)}</span>
          <span style="color:#94A3B8; font-weight:800; flex-shrink:0;">→</span>
          <span style="font-weight:700; color:#116834; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45%;">${esc(targetName)}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 12px; font-size:.78rem; margin-bottom:8px;">
          <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">No. Permintaan</div><div style="font-weight:700; color:#1E293B; overflow-wrap:anywhere;">${esc(item.parentRequestDocNo || '-')}</div></div>
          <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">No. Pengeluaran</div><div style="font-weight:700; color:#1E293B; overflow-wrap:anywhere;">${esc(item.dispatchDocNo || '-')}</div></div>
          <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">Klon</div><div style="font-weight:700; color:#1E293B; overflow-wrap:anywhere;">${esc(klonName)} • ${esc(category)}</div></div>
          <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">Jumlah Dikirim</div><div style="font-weight:800; color:#116834;">${shippedQty.toLocaleString('id-ID')} Pkk</div></div>
        </div>
        ${expanded ? `
          <div style="margin-top:8px; padding:10px 0 2px; border-top:1px dashed #E2E8F0; display:grid; grid-template-columns:40% 60%; gap:7px 8px; font-size:.75rem;">
            <span style="color:#64748B;">Jenis Penerimaan</span><strong style="text-align:right; color:#1E293B;">${esc(item.programName || item.programId || 'Bibit')}</strong>
            <span style="color:#64748B;">Tahapan Pertumbuhan</span><strong style="text-align:right; color:#1E293B; overflow-wrap:anywhere;">${esc(growthStage)}</strong>
            <span style="color:#64748B;">Kategori</span><strong style="text-align:right; color:#1E293B;">${esc(category)}</strong>
            <span style="color:#64748B;">Tanggal Pengeluaran</span><strong style="text-align:right; color:#1E293B;">${esc(formatDate(item.dispatchDate) || '-')}</strong>
            <span style="color:#64748B;">Tanggal Kedatangan</span><strong style="text-align:right; color:#1E293B;">${esc(formatDate(item.initialReceivedDate) || '-')}</strong>
            <span style="color:#64748B;">Kendaraan</span><strong style="text-align:right; color:#1E293B;">${esc(vehiclePlate)}</strong>
            ${displayJalur ? `<span style="color:#64748B;">Jalur & Divisi</span><strong style="text-align:right; color:#1E293B;">${esc(displayJalur)} • ${esc(item.targetNextDivisionName || item.targetNextDivisionId)}</strong>` : ''}
          </div>
        ` : ''}
        <button class="btn-toggle-receipt-details" data-id="${esc(item.id)}" type="button" style="width:100%; min-height:36px; background:transparent; border:0; border-top:1px dashed #E2E8F0; padding:7px 0 2px; font-size:.74rem; color:#116834; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
          <span>${expanded ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}</span><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" fill="none" style="transform:rotate(${expanded ? '180deg' : '0deg'});"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        ${isActionable ? `<div style="display:flex; flex-direction:column; gap:8px; margin-top:8px; padding-top:8px; border-top:1px dashed #F1F5F9;">
          
          ${isPengurusActionable ? `
            <button 
              type="button" 
              class="btn-action-initial-receipt" 
              data-id="${item.id}"
              style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#116834; border:1px solid #116834; border-radius:6px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; line-height:1.2; text-align:center; box-shadow:0 2px 6px rgba(17,104,52,.2);"
            >
              Terima &amp; Proses
            </button>
          ` : ''}

          ${isAskepActionable ? `
            <button 
              type="button" 
              class="btn-action-askep-return" 
              data-id="${item.id}"
              style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#FFFFFF; border:1px solid #FCA5A5; border-radius:6px; font-size:.78rem; font-weight:600; color:#DC2626; cursor:pointer; text-align:center; line-height:1.2;"
            >
              Kembalikan ke Pengurus
            </button>
            <button 
              type="button" 
              class="btn-action-askep-verify" 
              data-id="${item.id}"
              style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#116834; border:1px solid #116834; border-radius:6px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.2;"
            >
              ${isRouteCorrection ? 'Simpan Perubahan Jalur' : 'Verifikasi dan Teruskan Penerimaan'}
            </button>
          ` : ''}

          ${isAsistenLapanganActionable ? `
            <button 
              type="button" 
              class="btn-action-asisten-lapangan" 
              data-id="${item.id}"
              style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#116834; border:1px solid #116834; border-radius:6px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; text-align:center; line-height:1.2; box-shadow:0 2px 6px rgba(17,104,52,.2);"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Pemeriksaan Fisik & Blok
            </button>
          ` : ''}

          ${isAsistenBibitanActionable ? `
            <button 
              type="button" 
              class="btn-action-asb-verify" 
              data-id="${item.id}"
              style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#116834; border:1px solid #116834; border-radius:6px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.2; box-shadow:0 2px 6px rgba(17,104,52,.2);"
            >
              Verifikasi &amp; Teruskan ke Mantri
            </button>
          ` : ''}

          ${isMantriActionable ? `
            <button 
              type="button" 
              class="btn-action-mantri-bibitan" 
              data-id="${item.id}"
              style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#116834; border:1px solid #116834; border-radius:6px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.2; box-shadow:0 2px 6px rgba(17,104,52,.2);"
            >
              Penerimaan Fisik & Batch
            </button>
          ` : ''}
        </div>
        ` : ''}

      </div>
    `;
  }).join('');
}

function renderMataEntresReceiptCard(item, currentUser) {
  const expanded = expandedReceiptIds.has(item.id);
  const parentRequest = getMataEntresParentRequest(item);
  const actionable = Boolean(parentRequest && canPerformRequesterReceipt(parentRequest, currentUser));
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  const primaryDetail = item.details?.[0] || {};
  const shippedMata = Number(item.totalShippedMata ?? item.totalShippedQty ?? 0);
  const shippedBatang = Number(item.totalShippedBatang || 0);
  const acceptedMata = Number(item.totalAcceptedMata ?? parentRequest?.jumlahMataEntresDiterima ?? 0);
  const acceptedBatang = Number(item.totalAcceptedBatang ?? parentRequest?.jumlahBatangDiterima ?? 0);
  const isCompleted = [RECEIPT_KSP_STATUS.DITERIMA, RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH, RECEIPT_KSP_STATUS.SELESAI]
    .includes(String(item.status || '').toUpperCase());
  const clone = primaryDetail.cloneId || '-';
  const { sourceName, targetName } = getReceiptEstateRoute(item);
  const statusPresentation = getWorkflowStatusPresentation(item.status, RECEIPT_KSP_STATUS_LABELS[item.status] || item.statusLabel || 'Dalam Proses');
  const statusLabel = statusPresentation.label;
  const receiptActionLabel = role === 'ASKEP' || role === 'ASISTEN_KEPALA'
    ? 'Verifikasi dan Teruskan Penerimaan'
    : (role === 'ASISTEN_BIBITAN'
      ? 'Verifikasi &amp; Teruskan ke Mantri'
      : ((role === 'MANTRI_TANAMAN' || role === 'MANTRI') ? 'Penerimaan Fisik &amp; Batch' : 'Terima &amp; Proses'));

  return `
    <article style="background:#FFFFFF; border:1px solid ${expanded ? '#116834' : '#DCE5EF'}; border-radius:12px; padding:12px 14px; margin-bottom:10px; box-shadow:0 1px 3px rgba(15,23,42,.05); min-width:0; box-sizing:border-box;">
      <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #F1F5F9; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; min-width:0;">
          <span style="font-size:.66rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:.04em; line-height:1.35;">NO.PENERIMAAN</span>
          <span style="display:inline-flex; align-items:center; justify-content:center; flex:0 1 auto; min-width:0; max-width:56%; padding:4px 7px; border-radius:7px; border:1px solid ${statusPresentation.border}; background:${statusPresentation.background}; color:${statusPresentation.color}; font-size:.58rem; font-weight:750; line-height:1.3; text-align:center; white-space:normal; overflow-wrap:anywhere; box-sizing:border-box;">${esc(statusLabel)}</span>
        </div>
        <div style="font-size:.95rem; font-weight:800; color:#116834; line-height:1.35; white-space:nowrap;">${esc(item.receiptDocNo || item.docNo || '-')}</div>
      </div>
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px; font-size:.78rem; background:#F8FAFC; padding:7px 10px; border-radius:7px; border:1px solid #F1F5F9; min-width:0;">
        <span style="font-weight:700; color:#1E293B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45%;">${esc(sourceName)}</span>
        <span style="color:#94A3B8; font-weight:800; flex-shrink:0;">→</span>
        <span style="font-weight:700; color:#116834; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45%;">${esc(targetName)}</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 12px; font-size:.78rem; margin-bottom:8px;">
        <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">No. Permintaan</div><div style="font-weight:700; color:#1E293B; overflow-wrap:anywhere;">${esc(item.parentRequestDocNo || '-')}</div></div>
        <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">No. Pengeluaran</div><div style="font-weight:700; color:#1E293B; overflow-wrap:anywhere;">${esc(item.dispatchDocNo || '-')}</div></div>
        <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">Klon</div><div style="font-weight:700; color:#1E293B;">${esc(clone)}</div></div>
        <div><div style="font-size:.68rem; color:#64748B; font-weight:600;">Jumlah Dikirim</div><div style="font-weight:800; color:#116834;">${shippedMata.toLocaleString('id-ID')} Mata${shippedBatang ? ` · ${shippedBatang.toLocaleString('id-ID')} Batang` : ''}</div></div>
      </div>
      ${expanded ? `
        <div style="margin-top:8px; padding:10px 0 2px; border-top:1px dashed #E2E8F0; display:grid; grid-template-columns:40% 60%; gap:7px 8px; font-size:.75rem;">
          <span style="color:#64748B;">Kebun Pengirim</span><strong style="text-align:right; color:#1E293B; overflow-wrap:anywhere;">${esc(sourceName)}</strong>
          <span style="color:#64748B;">Kebun Penerima</span><strong style="text-align:right; color:#1E293B; overflow-wrap:anywhere;">${esc(targetName)}</strong>
          <span style="color:#64748B;">Tanggal Pengeluaran</span><strong style="text-align:right; color:#1E293B;">${esc(formatDate(item.dispatchDate) || '-')}</strong>
          <span style="color:#64748B;">Tanggal Kedatangan</span><strong style="text-align:right; color:#1E293B;">${esc(formatDate(item.initialReceivedDate) || '-')}</strong>
          <span style="color:#64748B;">Kendaraan</span><strong style="text-align:right; color:#1E293B;">${esc(item.vehiclePlate || '-')}</strong>
          ${isCompleted ? `
            <span style="color:#64748B;">Jumlah Diterima</span><strong style="text-align:right; color:#1E293B;">${acceptedMata.toLocaleString('id-ID')} Mata · ${acceptedBatang.toLocaleString('id-ID')} Batang</strong>
            <span style="color:#64748B;">Tanggal Penerimaan</span><strong style="text-align:right; color:#1E293B;">${esc(formatDate(item.examinationDate || parentRequest?.tanggalPenerimaan || parentRequest?.penerimaan?.tanggal) || '-')}</strong>
          ` : ''}
        </div>
      ` : ''}
      <button class="btn-toggle-receipt-details" data-id="${esc(item.id)}" type="button" style="width:100%; min-height:36px; background:transparent; border:0; border-top:1px dashed #E2E8F0; padding:7px 0 2px; font-size:.74rem; color:#116834; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
        <span>${expanded ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}</span><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" fill="none" style="transform:rotate(${expanded ? '180deg' : '0deg'});"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      ${actionable ? `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px; padding-top:8px; border-top:1px dashed #F1F5F9;">
          ${(role === 'ASKEP' || role === 'ASISTEN_KEPALA') ? `<button class="btn-action-mata-entres-askep-return" data-id="${esc(item.id)}" type="button" style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#FFFFFF; border:1px solid #FCA5A5; border-radius:6px; font-size:.78rem; font-weight:600; color:#DC2626; cursor:pointer; text-align:center; line-height:1.2;">Kembalikan ke Pengurus</button>` : ''}
          <button class="btn-action-mata-entres-receipt" data-id="${esc(item.id)}" type="button" style="width:100%; height:46px; min-height:46px; box-sizing:border-box; padding:6px 12px; background:#116834; border:1px solid #116834; border-radius:6px; font-size:.78rem; font-weight:700; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.2; box-shadow:0 2px 6px rgba(17,104,52,.2);">${receiptActionLabel}</button>
        </div>
      ` : ''}
    </article>
  `;
}
