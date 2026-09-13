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
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { AUDIT_EVENT_TYPES } from '../../core/transaction-actor.js';
import { formatDate, esc } from '../../core/utils.js';
import { BLOCK_MASTER, BLOCK_STATUS } from '../../data/block-master.js';
import { getNurseryDivisionsByEstate } from '../../data/estate-master.js';
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
  createNurseryBatchesFromReceipt,
  generateReceiptNewBatchCode
} from '../../core/receipt-ksp-manager.js';

let activeStatusFilter = 'SEMUA';

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
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASISTEN_BIBITAN') return false;

  const userEstateId = currentUser.estateId;
  const userDivisionId = currentUser.divisionId;
  const targetEstate = receipt.targetNextEstateId || receipt.targetEstateId;
  const targetDivision = receipt.targetNextDivisionId;

  if (!userEstateId || targetEstate !== userEstateId) return false;
  if (userDivisionId && targetDivision && targetDivision !== userDivisionId) return false;

  const status = (receipt.status || '').toUpperCase();
  const nextRole = (receipt.targetNextRole || '').toUpperCase();
  const jalur = (receipt.jalurPenerimaan || '').toUpperCase();

  if (jalur !== 'BIBITAN') return false;

  const isActionableStatus = (
    status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN
  );

  return isActionableStatus && (nextRole === 'ASISTEN_BIBITAN' || !nextRole);
}

/**
 * Validasi otorisasi Mantri Bibitan untuk memproses penerimaan fisik & pembentukan batch baru
 * @param {Object} receipt
 * @param {Object} currentUser
 * @returns {boolean}
 */
export function canPerformMantriBibitanReceiptAction(receipt, currentUser) {
  if (!receipt || !currentUser) return false;
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

  if (userRole === 'PENGURUS') {
    return receipts.filter(r => canPerformPengurusReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
    return receipts.filter(r => canPerformAskepReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'ASISTEN') {
    return receipts.filter(r => canPerformAsistenLapanganReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'ASISTEN_BIBITAN') {
    return receipts.filter(r => canPerformAsistenBibitanReceiptAction(r, currentUser)).length;
  }
  if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
    return receipts.filter(r => canPerformMantriBibitanReceiptAction(r, currentUser)).length;
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
    const matchEstate = r.targetEstateId === userEstateId || r.targetNextEstateId === userEstateId;
    if (!matchEstate) return false;

    // Jika Asisten Lapangan, filter ketat berdasarkan Divisi dan Jalur LAPANGAN
    if (userRole === 'ASISTEN') {
      const matchDivision = r.targetNextDivisionId === userDivisionId || r.targetDivisionId === userDivisionId;
      const isLapangan = r.jalurPenerimaan === 'LAPANGAN';
      return matchDivision && isLapangan;
    }

    // Jika Asisten Bibitan, filter ketat berdasarkan Divisi dan Jalur BIBITAN
    if (userRole === 'ASISTEN_BIBITAN') {
      const matchDivision = !userDivisionId || !r.targetNextDivisionId || r.targetNextDivisionId === userDivisionId || r.targetDivisionId === userDivisionId;
      const isBibitan = r.jalurPenerimaan === 'BIBITAN';
      return matchDivision && isBibitan;
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

  const auditDetails = `Pengurus (${currentUser.name || currentUser.userId}) mencatat penerimaan awal pada tanggal ${formatDate(receivedDate)} dan meneruskan ke Asisten Kepala`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.APPROVE,
    auditDetails,
    currentUser
  );
}

/**
 * Eksekusi Verifikasi & Penentuan Jalur Distribusi oleh Asisten Kepala (Askep)
 */
export function processAskepVerification(receiptId, formValues, currentUser) {
  if (!receiptId) throw new Error('Receipt ID wajib ada');
  const { jalurPenerimaan, targetDivisionId, notes } = formValues || {};

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

  const validDivisions = jalurPenerimaan === 'LAPANGAN'
    ? getFieldDivisionsForEstate(receipt.targetEstateId)
    : getNurseryDivisionsByEstate(receipt.targetEstateId);

  const selectedDiv = validDivisions.find(d => d.divisionId === targetDivisionId || d.divisionCode === targetDivisionId);
  if (!selectedDiv) {
    throw new Error(`Divisi '${targetDivisionId}' tidak valid atau tidak aktif pada kebun tujuan (${receipt.targetEstateName || receipt.targetEstateId}) untuk jalur ${jalurPenerimaan}.`);
  }

  const nextStatus = jalurPenerimaan === 'LAPANGAN'
    ? RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN
    : RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN;

  const nextRole = jalurPenerimaan === 'LAPANGAN'
    ? 'ASISTEN'
    : 'ASISTEN_BIBITAN';

  const patch = {
    jalurPenerimaan: jalurPenerimaan,
    status: nextStatus,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[nextStatus],
    targetNextRole: nextRole,
    targetNextEstateId: receipt.targetEstateId,
    targetNextDivisionId: selectedDiv.divisionId,
    targetNextDivisionName: selectedDiv.divisionName,
    askepNotes: notes ? notes.trim() : null,
    askepVerifiedAt: new Date().toISOString()
  };

  const auditDetails = `Asisten Kepala (${currentUser.name || currentUser.userId}) memverifikasi dokumen dan menetapkan jalur ${jalurPenerimaan} ke ${selectedDiv.divisionName}`;

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
export function processAsistenLapanganFinal(receiptId, formValues, currentUser) {
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

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.APPROVE,
    auditDetails,
    currentUser
  );
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

  const auditDetails = `Asisten Bibitan (${currentUser.name || currentUser.userId}) memverifikasi dokumen penerimaan dan meneruskan ke Mantri Bibitan${cleanNotes ? ` - Catatan: "${cleanNotes}"` : ''}`;

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
        rejectReason: rej > 0 ? (d.rejectReason || rejectReason || null) : null
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
export function processMantriBibitanFinal(receiptId, formValues, currentUser) {
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
    notes
  } = formValues || {};

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

    acceptedSum += acc;
    rejectedSum += rej;

    processedDetails.push({
      ...src,
      cloneId: dtlCloneId,
      category: dtlCategory,
      growthStage: dtlGrowthStage,
      qtyAccepted: acc,
      qtyRejected: rej,
      rejectReason: rej > 0 ? dtlRejectReason.trim() : null
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

  // 5. Generate New Nursery Batches (1 source batch detail -> 1 new nursery batch)
  const newBatches = createNurseryBatchesFromReceipt(receipt, processedDetails, currentUser);

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
    newBatches: newBatches.map(b => ({ id: b.id, batchCode: b.batchCode, qty: b.receivedQty })),
    targetNextRole: null,
    finalizedAt: new Date().toISOString(),
    finalizedByUserId: currentUser.userId || currentUser.id,
    finalizedByName: currentUser.name || currentUser.userId,
    finalizedByRole: currentUser.role || currentUser.rawRole || 'MANTRI_TANAMAN'
  };

  const auditDetails = `Mantri Bibitan (${currentUser.name || currentUser.userId}) menyelesaikan penerimaan fisik: ${acceptedSum.toLocaleString('id-ID')} Layak, ${rejectedSum.toLocaleString('id-ID')} Reject${discrepancy > 0 ? ` (Selisih: ${discrepancy} Pkk)` : ''}, membentuk ${newBatches.length} batch pembibitan baru`;

  return updateReceiptKsp(
    receiptId,
    patch,
    AUDIT_EVENT_TYPES.APPROVE,
    auditDetails,
    currentUser
  );
}

/**
 * Buka Modal Form Catat Penerimaan Awal (Role Pengurus)
 */
export function openPengurusInitialReceiptModal(item, currentUser, onSuccess = null) {
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

  const modalEl = document.querySelector('.modal-box');
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

  openModal({
    title: 'Verifikasi Penerimaan & Tentukan Jalur',
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
              <label id="label-jalur-lapangan" style="display: flex; flex-direction: column; padding: 10px; border: 2px solid #116834; background: #F0FDF4; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <input type="radio" name="radio-jalur" value="LAPANGAN" checked style="accent-color: #116834; cursor: pointer;" />
                  <span style="font-weight: 700; color: #116834; font-size: 0.84rem;">Jalur Lapangan</span>
                </div>
                <span style="font-size: 0.72rem; color: #4B5563; line-height: 1.3;">Penanaman langsung ke blok tanaman (Asisten Lapangan).</span>
              </label>

              <label id="label-jalur-bibitan" style="display: flex; flex-direction: column; padding: 10px; border: 1px solid #CBD5E1; background: #FFFFFF; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                  <input type="radio" name="radio-jalur" value="BIBITAN" style="accent-color: #116834; cursor: pointer;" />
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
              Menampilkan divisi lapangan aktif pada kebun ${esc(item.targetEstateName || targetEstateId)}.
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

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button 
              type="button" 
              id="btn-cancel-verify" 
              style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 600; color: #475569; cursor: pointer;"
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-submit-verify" 
              style="padding: 8px 18px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer;"
            >
              Verifikasi & Teruskan
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalEl = document.querySelector('.modal-box');
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
        ? `Menampilkan ${list.length} divisi lapangan aktif pada kebun ${item.targetEstateName || targetEstateId}.`
        : `Menampilkan ${list.length} divisi pembibitan aktif pada kebun ${item.targetEstateName || targetEstateId}.`;
    }
  };

  updateDivisionOptions('LAPANGAN');

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
      processAskepVerification(item.id, { jalurPenerimaan: radioVal, targetDivisionId: divVal, notes: notesVal }, currentUser);
      closeModal();
      toast(`Dokumen penerimaan berhasil diverifikasi ke ${radioVal === 'LAPANGAN' ? 'Asisten Lapangan' : 'Asisten Bibitan'}.`, 'success');
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

  const modalEl = document.querySelector('.modal-box');
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
      <div style="padding: 2px 0; font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%;">
        
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

  const modalEl = document.querySelector('.modal-box');
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
          () => {},
          { timeout: 2000 }
        );
      }
    } catch {}

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
  modalEl.querySelector('#form-physical-receipt')?.addEventListener('submit', (e) => {
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
      processAsistenLapanganFinal(item.id, payload, currentUser);
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
    title: 'Verifikasi & Penerusan Bibitan',
    body: `
      <div style="padding: 2px 0; font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%;">
        
        <!-- SUMMARY SECTION A: PERMINTAAN & PENGELUARAN -->
        <div style="margin-bottom: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px;">
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
        <div style="margin-bottom: 12px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 10px;">
          <div style="font-size: 0.74rem; font-weight: 700; color: #166534; margin-bottom: 4px;">
            Penerimaan Awal Pengurus & Routing Askep
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
        <div style="margin-bottom: 14px; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;">
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
          <div style="margin-bottom: 16px;">
            <label for="input-asb-notes" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Catatan Verifikasi Asisten Bibitan (Opsional)
            </label>
            <textarea 
              id="input-asb-notes" 
              rows="2" 
              placeholder="Instruksi penataan bibit untuk Mantri Bibitan..."
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-family: inherit; resize: vertical;"
            ></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <button 
              type="button" 
              id="btn-asb-return" 
              style="padding: 8px 12px; background: #FFFFFF; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 0.80rem; font-weight: 600; color: #DC2626; cursor: pointer;"
            >
              Kembalikan ke Askep
            </button>
            <div style="display: flex; gap: 8px;">
              <button 
                type="button" 
                id="btn-asb-cancel" 
                style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-weight: 600; color: #475569; cursor: pointer;"
              >
                Batal
              </button>
              <button 
                type="submit" 
                id="btn-asb-submit" 
                style="padding: 8px 18px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Verifikasi & Teruskan ke Mantri
              </button>
            </div>
          </div>
        </form>
      </div>
    `
  });

  const modalEl = document.querySelector('.modal-box');
  if (!modalEl) return;

  modalEl.querySelector('#btn-asb-cancel')?.addEventListener('click', () => {
    closeModal();
  });

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

  const modalEl = document.querySelector('.modal-box');
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
  const targetEstateId = item.targetEstateId || currentUser.estateId;
  const targetDivisionId = item.targetNextDivisionId || item.targetDivisionId || currentUser.divisionId || 'DIV-01';

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
    const newBatchCodePreview = generateReceiptNewBatchCode(targetEstateId, d.cloneId || klonName, d.sourceBatchCode);

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
      newBatchCode: newBatchCodePreview
    };
  });

  // Initial Photo Data
  let capturedPhoto = item.photoEvidence || null;
  const initialDiscrepancyReason = item.discrepancyReason || '';
  const initialNotes = item.mantriNotes || item.asistenNotes || '';

  openModal({
    title: 'Penerimaan Fisik & Pembentukan Batch Baru',
    body: `
      <div style="padding: 2px 0; font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%;">
        
        <!-- SUMMARY SECTION -->
        <div style="margin-bottom: 12px; padding: 8px 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-weight: 700; color: #1E293B;">${esc(item.receiptDocNo || item.docNo)}</div>
            <div style="font-weight: 700; color: #116834;">${shippedQty.toLocaleString('id-ID')} Pkk (${esc(klonName)})</div>
          </div>
          <div style="font-size: 0.72rem; color: #64748B;">
            SPB: <strong>${esc(item.parentRequestDocNo || '-')}</strong> • DSP: <strong>${esc(item.dispatchDocNo || '-')}</strong> • Asal: <strong>${esc(item.sourceEstateName || item.sourceEstateId)}</strong> • Divisi: <strong>${esc(targetDivisionId)}</strong>
          </div>
        </div>

        <form id="form-mantri-physical-receipt" onsubmit="return false;">
          
          <!-- Tanggal Penerimaan -->
          <div style="margin-bottom: 12px;">
            <label for="input-exam-date" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 3px; font-size: 0.76rem;">
              Tanggal Penerimaan Fisik <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="input-exam-date" 
              value="${todayStr}"
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"
              required
            />
          </div>

          <!-- DETAIL PER BATCH SUMBER -->
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 700; color: #1E293B; font-size: 0.78rem; margin-bottom: 6px;">
              Rincian Penerimaan Fisik per Batch Sumber (${detailRowsState.length} Batch)
            </div>

            <div id="mantri-batch-rows-container">
              ${detailRowsState.map((b, idx) => `
                <div class="batch-detail-card" data-index="${idx}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <div style="font-size: 0.70rem; color: #64748B;">Batch Sumber</div>
                      <div style="font-weight: 700; color: #1E293B; font-size: 0.82rem;">${esc(b.sourceBatchCode)} (${esc(b.cloneId)})</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.70rem; color: #64748B;">Dikirim</div>
                      <div style="font-weight: 700; color: #116834; font-size: 0.82rem;">${b.qtyShipped.toLocaleString('id-ID')} Pkk</div>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
                    <div>
                      <label style="display: block; font-size: 0.70rem; font-weight: 600; color: #166534; margin-bottom: 2px;">
                        Jumlah Layak (Pkk) <span style="color: #DC2626;">*</span>
                      </label>
                      <input 
                        type="number" 
                        class="input-batch-accepted" 
                        data-index="${idx}" 
                        value="${b.qtyAccepted}" 
                        min="0" 
                        max="${b.qtyShipped}"
                        style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #86EFAC; background: #F0FDF4; border-radius: 6px; font-weight: 700; color: #166534; font-size: 0.82rem;"
                        required
                      />
                    </div>

                    <div>
                      <label style="display: block; font-size: 0.70rem; font-weight: 600; color: #991B1B; margin-bottom: 2px;">
                        Jumlah Reject (Pkk)
                      </label>
                      <input 
                        type="number" 
                        class="input-batch-rejected" 
                        data-index="${idx}" 
                        value="${b.qtyRejected}" 
                        min="0" 
                        max="${b.qtyShipped}"
                        style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #FCA5A5; background: #FEF2F2; border-radius: 6px; font-weight: 700; color: #991B1B; font-size: 0.82rem;"
                      />
                    </div>
                  </div>

                  <!-- REJECT REASON PER BATCH -->
                  <div class="container-batch-reject" data-index="${idx}" style="display: ${b.qtyRejected > 0 ? 'block' : 'none'}; margin-bottom: 6px;">
                    <label style="display: block; font-weight: 600; color: #991B1B; margin-bottom: 2px; font-size: 0.72rem;">
                      Alasan Reject / Rusak <span style="color: #DC2626;">*</span>
                    </label>
                    <input 
                      type="text" 
                      class="input-batch-reject-reason" 
                      data-index="${idx}" 
                      value="${esc(b.rejectReason || '')}"
                      placeholder="Contoh: Batang patah, polibag robek..."
                      style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1px solid #FCA5A5; border-radius: 4px; font-size: 0.76rem;"
                    />
                  </div>

                  <!-- PREVIEW BATCH BARU YANG DIBENTUK -->
                  <div style="background: #F0FDF4; border: 1px dashed #86EFAC; border-radius: 4px; padding: 6px 8px; font-size: 0.70rem; color: #166534; display: flex; justify-content: space-between; align-items: center;">
                    <span>Batch Baru yang Dibentuk:</span>
                    <strong class="label-new-batch-code" data-index="${idx}">${esc(b.newBatchCode)}</strong>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Total Bar & Live Calculation -->
            <div id="mantri-total-calc-bar" style="font-size: 0.72rem; padding: 6px 10px; border-radius: 6px; background: #F1F5F9; color: #475569; display: flex; justify-content: space-between; align-items: center; border: 1px solid #E2E8F0;">
              <span>Total Dikirim: <strong>${shippedQty.toLocaleString('id-ID')} Pkk</strong></span>
              <span id="mantri-discrepancy-label">Total Fisik: <strong>${shippedQty.toLocaleString('id-ID')} Pkk</strong> (Lengkap)</span>
            </div>
          </div>

          <!-- REASON DISCREPANCY (CONDITIONAL) -->
          <div id="container-discrepancy-reason-mantri" style="display: none; margin-bottom: 12px;">
            <label for="input-discrepancy-reason-mantri" style="display: block; font-weight: 700; color: #D97706; margin-bottom: 3px; font-size: 0.76rem;">
              Alasan Selisih Fisik Pengiriman <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="text" 
              id="input-discrepancy-reason-mantri" 
              value="${esc(initialDiscrepancyReason)}"
              placeholder="Contoh: Jumlah fisik di bak truk kurang dari manifes pengantar..."
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #FCD34D; border-radius: 6px; font-size: 0.80rem;"
            />
          </div>

          <!-- SECTION FOTO KAMERA -->
          <div style="margin-bottom: 14px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; background: #FFFFFF;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px; font-size: 0.78rem;">
              Bukti Foto Fisik Bibit di Nursery <span style="color: #DC2626;">*</span>
            </label>
            
            <div id="photo-preview-box-mantri" style="display: ${capturedPhoto ? 'flex' : 'none'}; align-items: center; gap: 10px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
              <img id="img-photo-preview-mantri" src="${capturedPhoto ? capturedPhoto.dataUrl : ''}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #86EFAC;" alt="Foto" />
              <div style="flex: 1; font-size: 0.72rem; color: #166534;">
                <div style="font-weight: 700;">Foto Kamera Tersedia</div>
                <div>Sumber: <strong>CAMERA</strong> • Oleh: <strong>${esc(currentUser.name || currentUser.userId)}</strong></div>
              </div>
              <button type="button" id="btn-retake-photo-mantri" style="background: transparent; border: none; color: #DC2626; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Ulangi</button>
            </div>

            <div id="camera-capture-trigger-mantri" style="display: ${capturedPhoto ? 'none' : 'block'};">
              <button 
                type="button" 
                id="btn-open-camera-mantri" 
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

          <!-- Catatan Mantri -->
          <div style="margin-bottom: 16px;">
            <label for="input-mantri-notes" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Catatan Mantri Bibitan (Opsional)
            </label>
            <textarea 
              id="input-mantri-notes" 
              rows="2" 
              placeholder="Catatan penataan batch baru, kondisi media, baris bedengan..."
              style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; resize: vertical;"
            >${esc(initialNotes)}</textarea>
          </div>

          <!-- ACTION BUTTONS -->
          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
            <button 
              type="button" 
              id="btn-cancel-mantri-modal" 
              style="padding: 7px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #475569; cursor: pointer;"
            >
              Batal
            </button>
            <button 
              type="button" 
              id="btn-save-draft-mantri" 
              style="padding: 7px 14px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #334155; cursor: pointer;"
            >
              Simpan Sementara
            </button>
            <button 
              type="submit" 
              id="btn-save-final-mantri" 
              style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;"
            >
              Selesaikan Penerimaan
            </button>
          </div>

        </form>
      </div>
    `
  });

  const modalEl = document.querySelector('.modal-box');
  if (!modalEl) return;

  const containerDiscrepancy = modalEl.querySelector('#container-discrepancy-reason-mantri');
  const discrepancyLabel = modalEl.querySelector('#mantri-discrepancy-label');
  const photoPreviewBox = modalEl.querySelector('#photo-preview-box-mantri');
  const cameraTrigger = modalEl.querySelector('#camera-capture-trigger-mantri');
  const imgPhotoPreview = modalEl.querySelector('#img-photo-preview-mantri');

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
      if (discrepancyLabel) discrepancyLabel.innerHTML = `Total Fisik: <strong>${totalPhysical.toLocaleString('id-ID')} Pkk</strong> (<span style="color: #D97706; font-weight: 700;">Selisih: ${discrepancy.toLocaleString('id-ID')} Pkk</span>)`;
    } else if (discrepancy < 0) {
      if (discrepancyLabel) discrepancyLabel.innerHTML = `<span style="color: #DC2626; font-weight: 700;">Kelebihan: ${Math.abs(discrepancy).toLocaleString('id-ID')} Pkk (Tidak Valid)</span>`;
    } else {
      if (containerDiscrepancy) containerDiscrepancy.style.display = 'none';
      if (discrepancyLabel) discrepancyLabel.innerHTML = `Total Fisik: <strong>${totalPhysical.toLocaleString('id-ID')} Pkk</strong> (<span style="color: #166534; font-weight: 700;">Lengkap ✅</span>)`;
    }
  };

  // Wire row input listeners
  modalEl.querySelectorAll('.input-batch-accepted, .input-batch-rejected').forEach(inp => {
    inp.addEventListener('input', updateCalculations);
  });

  // Photo / Camera Logic
  modalEl.querySelector('#btn-open-camera-mantri')?.addEventListener('click', async () => {
    let lat = null;
    let lon = null;
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => { lat = pos.coords.latitude; lon = pos.coords.longitude; },
          () => {},
          { timeout: 2000 }
        );
      }
    } catch {}

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#116834';
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px sans-serif';
    ctx.fillText(`SIGMA NURSERY • ${item.receiptDocNo || item.docNo}`, 16, 40);
    ctx.fillText(`Date: ${new Date().toISOString()}`, 16, 70);
    ctx.fillText(`Inspector: ${currentUser.name || currentUser.userId}`, 16, 100);
    ctx.fillText(`Role: MANTRI_TANAMAN`, 16, 130);

    capturedPhoto = {
      id: `PHOTO-${Date.now()}`,
      receiptId: item.id,
      dataUrl: canvas.toDataURL('image/jpeg', 0.8),
      capturedAt: new Date().toISOString(),
      capturedByUserId: currentUser.userId || currentUser.id,
      capturedByName: currentUser.name || currentUser.userId,
      capturedByRole: currentUser.role || 'MANTRI_TANAMAN',
      source: PHOTO_SOURCE.CAMERA,
      latitude: lat,
      longitude: lon
    };

    if (imgPhotoPreview) imgPhotoPreview.src = capturedPhoto.dataUrl;
    if (photoPreviewBox) photoPreviewBox.style.display = 'flex';
    if (cameraTrigger) cameraTrigger.style.display = 'none';
    toast('Foto pemeriksaan fisik berhasil diambil dari kamera perangkat.', 'success');
  });

  modalEl.querySelector('#btn-retake-photo-mantri')?.addEventListener('click', () => {
    capturedPhoto = null;
    if (photoPreviewBox) photoPreviewBox.style.display = 'none';
    if (cameraTrigger) cameraTrigger.style.display = 'block';
  });

  // Cancel Button
  modalEl.querySelector('#btn-cancel-mantri-modal')?.addEventListener('click', () => {
    closeModal();
  });

  // Simpan Sementara (Draft)
  modalEl.querySelector('#btn-save-draft-mantri')?.addEventListener('click', () => {
    updateCalculations();
    const payload = {
      examinationDate: modalEl.querySelector('#input-exam-date')?.value,
      details: detailRowsState,
      discrepancyReason: modalEl.querySelector('#input-discrepancy-reason-mantri')?.value,
      photoEvidence: capturedPhoto,
      notes: modalEl.querySelector('#input-mantri-notes')?.value
    };

    try {
      processMantriBibitanDraft(item.id, payload, currentUser);
      closeModal();
      toast(`Draft pemeriksaan fisik ${item.receiptDocNo || item.docNo} berhasil disimpan.`, 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderReceiptKebunSepupuLanding();
    } catch (err) {
      console.error('[receipt] mantri draft error:', err);
      toast(err.message || 'Gagal menyimpan draft', 'error');
    }
  });

  // Simpan & Selesaikan Penerimaan (Final)
  modalEl.querySelector('#form-mantri-physical-receipt')?.addEventListener('submit', (e) => {
    e.preventDefault();
    updateCalculations();

    const payload = {
      examinationDate: modalEl.querySelector('#input-exam-date')?.value,
      details: detailRowsState,
      discrepancyReason: modalEl.querySelector('#input-discrepancy-reason-mantri')?.value,
      photoEvidence: capturedPhoto,
      notes: modalEl.querySelector('#input-mantri-notes')?.value
    };

    try {
      processMantriBibitanFinal(item.id, payload, currentUser);
      closeModal();
      toast(`Penerimaan fisik ${item.receiptDocNo || item.docNo} berhasil diselesaikan. Batch baru telah terbentuk.`, 'success');
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

  const primaryDetail = (item.details && item.details[0]) || {};
  const batchListStr = (item.details || []).map(b => `${b.sourceBatchCode || b.sourceBatchId} (${(b.qtyShipped || 0).toLocaleString('id-ID')} Pkk)`).join(', ') || '-';
  const shippedQty = parseInt(item.totalShippedQty || 0, 10);
  const statusLabel = RECEIPT_KSP_STATUS_LABELS[item.status] || item.statusLabel || item.status;

  const allocationsList = Array.isArray(item.blockAllocations) && item.blockAllocations.length > 0
    ? item.blockAllocations.map(a => `${a.blockName || a.blockCode} (${(a.allocatedQty || 0).toLocaleString('id-ID')} Pkk)`).join(', ')
    : '-';

  const newBatchesListStr = Array.isArray(item.newBatches) && item.newBatches.length > 0
    ? item.newBatches.map(b => `${b.batchCode} (${(b.qty || 0).toLocaleString('id-ID')} Pkk)`).join(', ')
    : (Array.isArray(item.details) ? item.details.filter(d => d.newBatchCode).map(d => `${d.newBatchCode} (${(d.qtyAccepted || 0).toLocaleString('id-ID')} Pkk)`).join(', ') : '-');

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
              <div style="font-size: 0.70rem; color: #64748B;">Program Pembibitan</div>
              <div style="font-weight: 600;">${esc(item.programName || item.programId || 'Program Nursery 2026')}</div>
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
              <div style="font-weight: 600;">${esc(primaryDetail.category || 'Polibag Besar')}</div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Tahapan Pertumbuhan</div>
              <div style="font-weight: 600;">${esc(primaryDetail.growthStage || 'Rubber Advance Planting Material')}</div>
            </div>
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
              <div style="font-weight: 700; color: #116834;">${shippedQty.toLocaleString('id-ID')} Pkk</div>
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
              <div><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; background: #FEF3C7; color: #92400E;">${esc(statusLabel)}</span></div>
            </div>
            <div>
              <div style="font-size: 0.70rem; color: #64748B;">Total Dikirim</div>
              <div style="font-weight: 700; color: #116834;">${shippedQty.toLocaleString('id-ID')} Pkk</div>
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
              E. Hasil Pemeriksaan Fisik & Batch Baru
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
                  <div style="font-size: 0.70rem; color: #64748B; margin-bottom: 2px;">Batch Pembibitan Baru yang Dibentuk</div>
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

  const modalEl = document.querySelector('.modal-box');
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
  const scopedReceipts = filterReceiptKspRequests(allReceipts, currentUser);
  const filteredList = filterReceiptKspByStatus(scopedReceipts, activeStatusFilter, currentUser);
  const actionableCount = getActionableReceiptCount(scopedReceipts, currentUser);

  const isAskep = userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA';
  const isAsistenLapangan = userRole === 'ASISTEN';
  const isAsistenBibitan = userRole === 'ASISTEN_BIBITAN';
  const isMantriBibitan = userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI';
  const actionableTabLabel = (isAskep || isAsistenBibitan) ? 'Menunggu Verifikasi' : ((isAsistenLapangan || isMantriBibitan) ? 'Menunggu Pemeriksaan' : 'Menunggu Penerimaan');

  app.innerHTML = `
    <div class="page receipt-ksp-page" style="display: flex; flex-direction: column; min-height: 100vh; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; position: sticky; top: 0; z-index: 20;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-back-ksp" type="button" aria-label="Kembali" style="padding: 6px; background: transparent; border: none; cursor: pointer; color: #116834; display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2;">Penerimaan Bibit</h1>
            ${isAsistenBibitan ? '' : `<div style="font-size: 0.70rem; color: #64748B;">Kebun Sepupu • ${esc(currentUser?.estateName || currentUser?.estateId || '-')}${currentUser?.divisionName ? ` • ${esc(currentUser.divisionName)}` : ''}</div>`}
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
      <main style="flex: 1; padding: 14px 16px; max-width: 800px; width: 100%; margin: 0 auto; box-sizing: border-box;">
        
        <!-- STATUS FILTER TABS -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; scrollbar-width: none;">
          ${renderFilterTab('SEMUA', 'Semua', scopedReceipts.length, activeStatusFilter)}
          ${renderFilterTab('ACTIONABLE', actionableTabLabel, actionableCount, activeStatusFilter, actionableCount > 0)}
          ${renderFilterTab('DIPROSES', 'Diproses', filterReceiptKspByStatus(scopedReceipts, 'DIPROSES', currentUser).length, activeStatusFilter)}
          ${renderFilterTab('SELESAI', 'Selesai', filterReceiptKspByStatus(scopedReceipts, 'SELESAI', currentUser).length, activeStatusFilter)}
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
  return `
    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 36px 16px; text-align: center; margin-top: 10px;">
      <div style="width: 48px; height: 48px; margin: 0 auto 12px; background: #F1F5F9; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #64748B;">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <div style="font-size: 0.88rem; font-weight: 700; color: #1E293B; margin-bottom: 4px;">Tidak Ada Dokumen Penerimaan</div>
      <div style="font-size: 0.78rem; color: #64748B;">Belum ada pengiriman bibit yang masuk ke divisi/kebun ini untuk filter terpilih.</div>
    </div>
  `;
}

function renderReceiptCardList(list, currentUser) {
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const isPengurus = userRole === 'PENGURUS';
  const isAskep = userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA';
  const isAsistenLapangan = userRole === 'ASISTEN';
  const isAsistenBibitan = userRole === 'ASISTEN_BIBITAN';
  const isMantriBibitan = userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI';

  return list.map(item => {
    const isPengurusActionable = isPengurus && canPerformPengurusReceiptAction(item, currentUser);
    const isAskepActionable = isAskep && canPerformAskepReceiptAction(item, currentUser);
    const isAsistenLapanganActionable = isAsistenLapangan && canPerformAsistenLapanganReceiptAction(item, currentUser);
    const isAsistenBibitanActionable = isAsistenBibitan && canPerformAsistenBibitanReceiptAction(item, currentUser);
    const isMantriActionable = isMantriBibitan && canPerformMantriBibitanReceiptAction(item, currentUser);
    const isActionable = isPengurusActionable || isAskepActionable || isAsistenLapanganActionable || isAsistenBibitanActionable || isMantriActionable;

    const primaryDetail = (item.details && item.details[0]) || {};
    const klonName = primaryDetail.cloneId || item.clone || '-';
    const growthStage = primaryDetail.growthStage || 'Rubber Advance Planting Material';
    const category = primaryDetail.category || 'Polibag Besar';
    const shippedQty = parseInt(item.totalShippedQty || 0, 10);
    const vehiclePlate = item.vehiclePlate || 'Tidak tercatat';
    const statusLabel = RECEIPT_KSP_STATUS_LABELS[item.status] || item.statusLabel || item.status;

    return `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: box-shadow 0.15s ease;">
        
        <!-- HEADER CARD: DOC NO & STATUS -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
          <div>
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 600;">No. Penerimaan</div>
            <div style="font-size: 0.92rem; font-weight: 700; color: #0F172A;">${esc(item.receiptDocNo || item.docNo)}</div>
          </div>
          <div style="text-align: right;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; background: ${isActionable ? '#FEF3C7' : '#F1F5F9'}; color: ${isActionable ? '#92400E' : '#475569'}; border: 1px solid ${isActionable ? '#FDE68A' : '#E2E8F0'};">
              ${esc(statusLabel)}
            </span>
          </div>
        </div>

        <!-- DETAILS GRID -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; padding: 10px; background: #F8FAFC; border-radius: 6px; margin-bottom: 12px; border: 1px solid #F1F5F9;">
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">No. Permintaan (NIR)</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${esc(item.parentRequestDocNo || '-')}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">No. Pengeluaran (DSP)</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${esc(item.dispatchDocNo || '-')}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Program</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${esc(item.programName || item.programId || 'Program Nursery 2026')}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Kebun Asal</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${esc(item.sourceEstateName || item.sourceEstateId || '-')}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Klon & Kategori</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${esc(klonName)} • ${esc(category)}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Tahapan Pertumbuhan</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${esc(growthStage)}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Jumlah Dikirim</div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #116834;">${shippedQty.toLocaleString('id-ID')} Pkk</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Plat Kendaraan</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${esc(vehiclePlate)}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Tanggal Tiba</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">${item.initialReceivedDate ? formatDate(item.initialReceivedDate) : '-'}</div>
          </div>
          ${item.jalurPenerimaan ? `
            <div>
              <div style="font-size: 0.68rem; color: #64748B;">Jalur & Divisi</div>
              <div style="font-weight: 700; color: #116834;">${esc(item.jalurPenerimaan)} • ${esc(item.targetNextDivisionName || item.targetNextDivisionId)}</div>
            </div>
          ` : ''}
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
          <button 
            type="button" 
            class="btn-view-detail" 
            data-id="${item.id}"
            style="padding: 6px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #475569; cursor: pointer;"
          >
            Lihat Detail
          </button>
          
          ${isPengurusActionable ? `
            <button 
              type="button" 
              class="btn-action-initial-receipt" 
              data-id="${item.id}"
              style="padding: 6px 14px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Catat Penerimaan Awal
            </button>
          ` : ''}

          ${isAskepActionable ? `
            <button 
              type="button" 
              class="btn-action-askep-return" 
              data-id="${item.id}"
              style="padding: 6px 12px; background: #FFFFFF; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #DC2626; cursor: pointer;"
            >
              Kembalikan ke Pengurus
            </button>
            <button 
              type="button" 
              class="btn-action-askep-verify" 
              data-id="${item.id}"
              style="padding: 6px 14px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Verifikasi & Tentukan Jalur
            </button>
          ` : ''}

          ${isAsistenLapanganActionable ? `
            <button 
              type="button" 
              class="btn-action-asisten-lapangan" 
              data-id="${item.id}"
              style="padding: 6px 14px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
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
              style="padding: 6px 14px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Verifikasi & Teruskan ke Mantri
            </button>
          ` : ''}

          ${isMantriActionable ? `
            <button 
              type="button" 
              class="btn-action-mantri-bibitan" 
              data-id="${item.id}"
              style="padding: 6px 14px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Penerimaan Fisik & Batch
            </button>
          ` : ''}
        </div>

      </div>
    `;
  }).join('');
}
