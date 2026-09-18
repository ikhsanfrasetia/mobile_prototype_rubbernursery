/**
 * js/modules/request/request-mata-entres-landing.js
 * Halaman Landing & Workflow End-to-End Permintaan Mata Entres Kebun Sepupu
 * 
 * Flow Sisi Pengirim:
 * 1. Pengurus Pemohon -> Buat & Submit Permintaan (DIAJUKAN)
 * 2. Pengurus Pengirim -> Review & Setujui Kuota / Tolak (MENUNGGU_VERIFIKASI_ASISTEN_KEPALA / DITOLAK)
 * 3. Askep Pengirim -> Verifikasi & Pilih Divisi Bibitan Sumber (MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN / PERLU_REVISI_PENGURUS)
 * 4. Asisten Bibitan Pengirim -> Verifikasi Kesiapan Potong & Kemas (TERVERIFIKASI / PERLU_REVISI_ASISTEN_KEPALA)
 * 5. Mantri Bibitan Pengirim -> Pengeluaran Fisik (DIKELUARKAN / MENUNGGU_PENERIMAAN_PENGURUS + Auto Create Receipt)
 * 
 * Flow Sisi Pemohon (Khusus Jalur BIBITAN):
 * 6. Pengurus Pemohon -> Catat Kedatangan Awal (MENUNGGU_VERIFIKASI_ASISTEN_KEPALA)
 * 7. Askep Pemohon -> Verifikasi & Tentukan Divisi Bibitan Tujuan (MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN / DIKEMBALIKAN_KE_PENGURUS)
 * 8. Asisten Bibitan Pemohon -> Verifikasi Kesiapan Batang Bawah (MENUNGGU_PENERIMAAN_MANTRI_BIBITAN / PERLU_REVISI_ASISTEN_KEPALA)
 * 9. Mantri Bibitan Pemohon -> Pemeriksaan Fisik & Finalisasi (DITERIMA / DITERIMA_DENGAN_SELISIH)
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { requestRepository } from '../../db/repositories.js';
import { resolveTransactionActor, AUDIT_EVENT_TYPES } from '../../core/transaction-actor.js';
import { resolveEstate, getNurseryDivisionsByEstate, resolveNurseryDivision } from '../../data/estate-master.js';
import { getActiveKlons } from '../../data/klon-master.js';
import { formatDate, todayISO, nowISO, esc } from '../../core/utils.js';
import { createReceiptFromDispatch, getReceiptKspTransactions, updateReceiptKsp } from '../../core/receipt-ksp-manager.js';
import { RECEIPT_KSP_STATUS, RECEIPT_KSP_STATUS_LABELS } from '../../core/receipt-ksp-constants.js';

let activeTab = null; // 'MY_REQUESTS' | 'INCOMING_REQUESTS'
let activeStatusFilter = 'SEMUA'; // 'SEMUA' | 'DIAJUKAN' | 'DIPROSES' | 'SELESAI' | 'DITOLAK'
let expandedCardIndex = -1;

export const MATA_ENTRES_STATUS = {
  DIAJUKAN: 'DIAJUKAN',
  MENUNGGU_VERIFIKASI_ASISTEN_KEPALA: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
  MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  PERLU_REVISI_PENGURUS: 'PERLU_REVISI_PENGURUS',
  PERLU_REVISI_ASISTEN_KEPALA: 'PERLU_REVISI_ASISTEN_KEPALA',
  TERVERIFIKASI: 'TERVERIFIKASI',
  DIKELUARKAN: 'DIKELUARKAN',
  MENUNGGU_PENERIMAAN_PENGURUS: 'MENUNGGU_PENERIMAAN_PENGURUS',
  MENUNGGU_PENERIMAAN_MANTRI_BIBITAN: 'MENUNGGU_PENERIMAAN_MANTRI_BIBITAN',
  DIKEMBALIKAN_KE_PENGURUS: 'DIKEMBALIKAN_KE_PENGURUS',
  SEDANG_DIPROSES: 'SEDANG_DIPROSES',
  DITERIMA: 'DITERIMA',
  DITERIMA_DENGAN_SELISIH: 'DITERIMA_DENGAN_SELISIH',
  SELESAI: 'SELESAI',
  DITOLAK: 'DITOLAK'
};

export const MATA_ENTRES_STATUS_LABELS = {
  DIAJUKAN: 'Diajukan',
  MENUNGGU_VERIFIKASI_ASISTEN_KEPALA: 'Menunggu Verifikasi Askep',
  MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN: 'Menunggu Verifikasi Asisten Bibitan',
  PERLU_REVISI_PENGURUS: 'Perlu Revisi Pengurus',
  PERLU_REVISI_ASISTEN_KEPALA: 'Perlu Revisi Askep',
  TERVERIFIKASI: 'Siap Pengeluaran',
  DIKELUARKAN: 'Mata Entres Dikeluarkan',
  MENUNGGU_PENERIMAAN_PENGURUS: 'Menunggu Penerimaan Pengurus',
  MENUNGGU_PENERIMAAN_MANTRI_BIBITAN: 'Menunggu Penerimaan Mantri Bibitan',
  DIKEMBALIKAN_KE_PENGURUS: 'Dikembalikan ke Pengurus',
  SEDANG_DIPROSES: 'Sedang Diproses',
  DITERIMA: 'Diterima',
  DITERIMA_DENGAN_SELISIH: 'Diterima dengan Selisih',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak'
};

export const MATA_ENTRES_STATUS_BADGES = {
  DIAJUKAN: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  MENUNGGU_VERIFIKASI_ASISTEN_KEPALA: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  PERLU_REVISI_PENGURUS: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  PERLU_REVISI_ASISTEN_KEPALA: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  TERVERIFIKASI: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  DIKELUARKAN: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  MENUNGGU_PENERIMAAN_PENGURUS: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  MENUNGGU_PENERIMAAN_MANTRI_BIBITAN: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  DIKEMBALIKAN_KE_PENGURUS: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  SEDANG_DIPROSES: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  DITERIMA: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  DITERIMA_DENGAN_SELISIH: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  SELESAI: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  DITOLAK: { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' }
};

// ============================================================================
// HELPER PERMISSION & ROLE CHECKS (ESTATE & DIVISION ISOLATION)
// ============================================================================

export function matchEstateHelper(estA, estB) {
  if (!estA || !estB) return true;
  const resA = resolveEstate(estA);
  const resB = resolveEstate(estB);
  if (resA && resB) return resA.estate_id === resB.estate_id;
  const cleanA = String(estA).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const cleanB = String(estB).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

export function matchDivisionHelper(divA, divB) {
  if (!divA || !divB) return true;
  if (divA === divB) return true;
  const cleanA = String(divA).trim().toUpperCase();
  const cleanB = String(divB).trim().toUpperCase();
  if (cleanA === cleanB) return true;
  const numA = cleanA.replace(/\D/g, '');
  const numB = cleanB.replace(/\D/g, '');
  if (numA && numB && parseInt(numA, 10) === parseInt(numB, 10)) return true;
  return false;
}

// ----------------------------------------------------------------------------
// SISI PENGIRIM (SENDER SIDE GUARDS)
// ----------------------------------------------------------------------------

export function canPerformPengurusReceiverReview(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'PENGURUS') return false;

  const userEstate = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId || tx.targetEstate;
  if (!userEstate || !matchEstateHelper(targetEstate, userEstate)) return false;

  const sourceEstate = tx.sourceEstateId || tx.estateId || tx.requesterEstate;
  if (matchEstateHelper(sourceEstate, userEstate)) return false;

  const status = (tx.status || '').toUpperCase();
  return status === MATA_ENTRES_STATUS.DIAJUKAN || status === MATA_ENTRES_STATUS.PERLU_REVISI_PENGURUS;
}

export function canPerformAskepVerification(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASKEP' && userRole !== 'ASISTEN_KEPALA') return false;

  // Hanya jika sebelum dispatch (Sisi Pengirim)
  const isAfterDispatch = tx.jumlahBatangDikeluarkan !== null && tx.jumlahBatangDikeluarkan !== undefined;
  if (isAfterDispatch) return false;

  const userEstate = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId || tx.targetEstate;
  if (!userEstate || !matchEstateHelper(targetEstate, userEstate)) return false;

  const status = (tx.status || '').toUpperCase();
  return status === MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA || status === MATA_ENTRES_STATUS.PERLU_REVISI_ASISTEN_KEPALA;
}

export function canPerformAsistenBibitanVerification(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASISTEN_BIBITAN') return false;

  // Hanya jika sebelum dispatch (Sisi Pengirim)
  const isAfterDispatch = tx.jumlahBatangDikeluarkan !== null && tx.jumlahBatangDikeluarkan !== undefined;
  if (isAfterDispatch) return false;

  const userEstate = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId || tx.targetEstate;
  if (!userEstate || !matchEstateHelper(targetEstate, userEstate)) return false;

  const targetDiv = tx.targetNextDivisionId || tx.targetDivisionId;
  if (targetDiv && currentUser.divisionId && !matchDivisionHelper(targetDiv, currentUser.divisionId)) {
    return false;
  }

  const status = (tx.status || '').toUpperCase();
  return status === MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN;
}

export function canPerformMantriDispatch(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'MANTRI_TANAMAN' && userRole !== 'MANTRI') return false;

  const userEstate = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId || tx.targetEstate;
  if (!userEstate || !matchEstateHelper(targetEstate, userEstate)) return false;

  const targetDiv = tx.targetNextDivisionId || tx.targetDivisionId;
  if (targetDiv && currentUser.divisionId && !matchDivisionHelper(targetDiv, currentUser.divisionId)) {
    return false;
  }

  const status = (tx.status || '').toUpperCase();
  return status === MATA_ENTRES_STATUS.TERVERIFIKASI;
}

// ----------------------------------------------------------------------------
// SISI PEMOHON (RECEIVER SIDE GUARDS — KHUSUS JALUR BIBITAN)
// ----------------------------------------------------------------------------

export function canPerformPengurusArrival(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'PENGURUS') return false;

  const userEstate = currentUser.estateId;
  const sourceEstate = tx.sourceEstateId || tx.estateId || tx.requesterEstate;
  if (!userEstate || !matchEstateHelper(sourceEstate, userEstate)) return false;

  const status = (tx.status || '').toUpperCase();
  return (
    status === MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_PENGURUS ||
    status === MATA_ENTRES_STATUS.DIKELUARKAN ||
    status === MATA_ENTRES_STATUS.DIKEMBALIKAN_KE_PENGURUS
  );
}

export function canPerformAskepReceiptRouting(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASKEP' && userRole !== 'ASISTEN_KEPALA') return false;

  // Hanya jika setelah dispatch & setelah kedatangan dicatat (Sisi Pemohon)
  const isAfterDispatch = tx.jumlahBatangDikeluarkan !== null && tx.jumlahBatangDikeluarkan !== undefined;
  if (!isAfterDispatch) return false;

  const userEstate = currentUser.estateId;
  const sourceEstate = tx.sourceEstateId || tx.estateId || tx.requesterEstate;
  if (!userEstate || !matchEstateHelper(sourceEstate, userEstate)) return false;

  const status = (tx.status || '').toUpperCase();
  return status === MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA;
}

export function canPerformAsistenBibitanReceiptVerification(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASISTEN_BIBITAN') return false;

  // Hanya jika setelah dispatch & askep sudah routing (Sisi Pemohon)
  const isAfterDispatch = tx.jumlahBatangDikeluarkan !== null && tx.jumlahBatangDikeluarkan !== undefined;
  if (!isAfterDispatch) return false;

  const userEstate = currentUser.estateId;
  const sourceEstate = tx.sourceEstateId || tx.estateId || tx.requesterEstate;
  if (!userEstate || !matchEstateHelper(sourceEstate, userEstate)) return false;

  const targetDiv = tx.targetNextDivisionId || tx.targetDivisionId;
  if (targetDiv && currentUser.divisionId && !matchDivisionHelper(targetDiv, currentUser.divisionId)) {
    return false;
  }

  const status = (tx.status || '').toUpperCase();
  return status === MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN;
}

export function canPerformMantriBibitanFinalReceipt(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'MANTRI_TANAMAN' && userRole !== 'MANTRI') return false;

  // Sisi Pemohon
  const isAfterDispatch = tx.jumlahBatangDikeluarkan !== null && tx.jumlahBatangDikeluarkan !== undefined;
  if (!isAfterDispatch) return false;

  const userEstate = currentUser.estateId;
  const sourceEstate = tx.sourceEstateId || tx.estateId || tx.requesterEstate;
  if (!userEstate || !matchEstateHelper(sourceEstate, userEstate)) return false;

  const targetDiv = tx.targetNextDivisionId || tx.targetDivisionId;
  if (targetDiv && currentUser.divisionId && !matchDivisionHelper(targetDiv, currentUser.divisionId)) {
    return false;
  }

  const status = (tx.status || '').toUpperCase();
  return (
    status === MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN ||
    (status === MATA_ENTRES_STATUS.DIKELUARKAN && !tx.initialArrival)
  );
}

export function canPerformRequesterReceipt(tx, currentUser) {
  if (!tx || !currentUser || tx.type !== 'MATA_ENTRES') return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole === 'PENGURUS') return canPerformPengurusArrival(tx, currentUser);
  if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') return canPerformAskepReceiptRouting(tx, currentUser);
  if (userRole === 'ASISTEN_BIBITAN') return canPerformAsistenBibitanReceiptVerification(tx, currentUser);
  if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') return canPerformMantriBibitanFinalReceipt(tx, currentUser);
  return false;
}

// ============================================================================
// FILTERING & ACTIONABLE COUNTS
// ============================================================================

export function filterMyMataEntresRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;
  const userEstateId = currentUser.estateId;

  return requests.filter(tx => {
    if (tx.type !== 'MATA_ENTRES') return false;
    const isOwner = (
      (tx.userId && tx.userId === currentUserId) ||
      (tx.createdByUserId && tx.createdByUserId === currentUserId) ||
      (tx.estateId && matchEstateHelper(tx.estateId, userEstateId)) ||
      (tx.sourceEstateId && matchEstateHelper(tx.sourceEstateId, userEstateId)) ||
      (tx.requesterEstate && matchEstateHelper(tx.requesterEstate, userEstateId))
    );
    return isOwner;
  });
}

export function filterIncomingMataEntresRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const userEstateId = currentUser.estateId;

  return requests.filter(tx => {
    if (tx.type !== 'MATA_ENTRES') return false;
    const senderEstate = tx.targetEstateId || tx.targetEstate || tx.senderEstateId || (tx.pengeluaran?.capturedByEstateId) || tx.targetNextEstateId;
    const sourceEstate = tx.sourceEstateId || tx.estateId || tx.requesterEstate;

    const isTargetEstate = matchEstateHelper(senderEstate, userEstateId) && !matchEstateHelper(sourceEstate, userEstateId);
    if (!isTargetEstate) return false;

    if (userRole === 'ASISTEN_BIBITAN' || userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
      const senderDiv = tx.sourceDivisionId || tx.senderDivisionId || tx.approval?.divisionId || tx.pengeluaran?.divisionId || tx.pengeluaran?.capturedByDivisionId || tx.targetDivisionId || tx.targetNextDivisionId;
      if (senderDiv && currentUser.divisionId && !matchDivisionHelper(senderDiv, currentUser.divisionId)) {
        return false;
      }
    }

    return true;
  });
}

export function getActionableMataEntresCount(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return 0;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);

  let count = 0;
  requests.forEach(tx => {
    if (tx.type !== 'MATA_ENTRES') return;
    if (userRole === 'PENGURUS') {
      if (canPerformPengurusReceiverReview(tx, currentUser) || canPerformPengurusArrival(tx, currentUser)) count++;
    } else if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
      if (canPerformAskepVerification(tx, currentUser) || canPerformAskepReceiptRouting(tx, currentUser)) count++;
    } else if (userRole === 'ASISTEN_BIBITAN') {
      if (canPerformAsistenBibitanVerification(tx, currentUser) || canPerformAsistenBibitanReceiptVerification(tx, currentUser)) count++;
    } else if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
      if (canPerformMantriDispatch(tx, currentUser) || canPerformMantriBibitanFinalReceipt(tx, currentUser)) count++;
    }
  });

  return count;
}

export function getActionableMataEntresReceiptCount(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return 0;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);

  let count = 0;
  requests.forEach(tx => {
    if (tx.type !== 'MATA_ENTRES') return;
    if (userRole === 'PENGURUS') {
      if (canPerformPengurusArrival(tx, currentUser)) count++;
    } else if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
      if (canPerformAskepReceiptRouting(tx, currentUser)) count++;
    } else if (userRole === 'ASISTEN_BIBITAN') {
      if (canPerformAsistenBibitanReceiptVerification(tx, currentUser)) count++;
    } else if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
      if (canPerformMantriBibitanFinalReceipt(tx, currentUser)) count++;
    }
  });

  return count;
}

export function filterMataEntresByStatus(list, filter) {
  if (!Array.isArray(list)) return [];
  if (!filter || filter === 'SEMUA') return list;

  return list.filter(tx => {
    const s = (tx.status || '').toUpperCase();
    if (filter === 'DIAJUKAN') return s === MATA_ENTRES_STATUS.DIAJUKAN;
    if (filter === 'DIPROSES') {
      return (
        s === MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA ||
        s === MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN ||
        s === MATA_ENTRES_STATUS.PERLU_REVISI_PENGURUS ||
        s === MATA_ENTRES_STATUS.PERLU_REVISI_ASISTEN_KEPALA ||
        s === MATA_ENTRES_STATUS.TERVERIFIKASI ||
        s === MATA_ENTRES_STATUS.DIKELUARKAN ||
        s === MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_PENGURUS ||
        s === MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN ||
        s === MATA_ENTRES_STATUS.DIKEMBALIKAN_KE_PENGURUS ||
        s === MATA_ENTRES_STATUS.SEDANG_DIPROSES
      );
    }
    if (filter === 'SELESAI') {
      return s === MATA_ENTRES_STATUS.DITERIMA || s === MATA_ENTRES_STATUS.DITERIMA_DENGAN_SELISIH || s === MATA_ENTRES_STATUS.SELESAI;
    }
    if (filter === 'DITOLAK') return s === MATA_ENTRES_STATUS.DITOLAK;
    return s === filter;
  });
}

// ============================================================================
// WORKFLOW OPERATIONS & AUDIT TRAIL
// ============================================================================

export async function updateMataEntresRecord(id, patch, currentUser, actionType, details) {
  let updatedRecord = null;
  const localList = storage.get('requests_transactions', []);
  const idx = localList.findIndex(t => t.id === id || t.docNo === id);
  if (idx !== -1) {
    localList[idx] = { ...localList[idx], ...patch, updatedAt: nowISO() };
    storage.set('requests_transactions', localList);
    updatedRecord = localList[idx];
  }

  try {
    if (typeof indexedDB !== 'undefined') {
      const dbRes = await requestRepository.update(id, patch, currentUser, actionType, details);
      if (dbRes) updatedRecord = dbRes;
    }
  } catch (err) {
    // IndexedDB not available or in test environment, localStorage is already updated
  }
  return updatedRecord;
}

// 1. Pengurus Kebun Tujuan Review & Setujui
export async function processPengurusReview(txId, formValues, currentUser) {
  const { approvedBatang, approvedKlon, estimatedDeliveryDate, notes } = formValues;
  const calculatedMata = formValues.approvedMataEntres !== undefined && formValues.approvedMataEntres !== null
    ? Number(formValues.approvedMataEntres)
    : (Number(approvedBatang) * 2);

  const patch = {
    status: MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
    statusLabel: MATA_ENTRES_STATUS_LABELS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
    targetNextRole: 'ASKEP',
    approval: {
      approvedByUserId: currentUser.userId || currentUser.id,
      approvedByName: currentUser.name || 'Pengurus',
      approvedByRole: 'PENGURUS',
      approvedAt: nowISO(),
      approvedBatang: Number(approvedBatang),
      approvedMataEntres: calculatedMata,
      approvedKlon: approvedKlon,
      estimatedDeliveryDate: estimatedDeliveryDate,
      notes: notes || null
    }
  };
  const details = `Pengurus (${currentUser.name}) menyetujui kuota ${approvedBatang} batang dan meneruskan ke Askep.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.APPROVE, details);
}

// 1b. Pengurus Kebun Tujuan Tolak
export async function processPengurusReject(txId, reason, currentUser) {
  const patch = {
    status: MATA_ENTRES_STATUS.DITOLAK,
    statusLabel: MATA_ENTRES_STATUS_LABELS.DITOLAK,
    targetNextRole: null,
    rejection: {
      rejectedByUserId: currentUser.userId || currentUser.id,
      rejectedByName: currentUser.name || 'Pengurus',
      rejectedAt: nowISO(),
      reason: reason
    }
  };
  const details = `Pengurus (${currentUser.name}) menolak permintaan mata entres: ${reason}`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.REJECT, details);
}

// 2. Askep Pengirim Verifikasi & Pilih Divisi Bibitan Sumber
export async function processAskepVerification(txId, formValues, currentUser) {
  const { targetDivisionId, notes } = formValues;
  const patch = {
    status: MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN,
    statusLabel: MATA_ENTRES_STATUS_LABELS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN,
    targetNextRole: 'ASISTEN_BIBITAN',
    targetNextDivisionId: targetDivisionId,
    targetDivisionId: targetDivisionId,
    askepVerification: {
      verifiedByUserId: currentUser.userId || currentUser.id,
      verifiedByName: currentUser.name || 'Askep',
      verifiedAt: nowISO(),
      targetDivisionId: targetDivisionId,
      notes: notes || null
    }
  };
  const details = `Askep (${currentUser.name}) memverifikasi dan meneruskan ke Asisten Bibitan Divisi ${targetDivisionId}.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.VERIFY, details);
}

// 2b. Askep Pengirim Kembalikan ke Pengurus
export async function processAskepReturn(txId, reason, currentUser) {
  const patch = {
    status: MATA_ENTRES_STATUS.PERLU_REVISI_PENGURUS,
    statusLabel: MATA_ENTRES_STATUS_LABELS.PERLU_REVISI_PENGURUS,
    targetNextRole: 'PENGURUS',
    returnInfo: {
      returnedByUserId: currentUser.userId || currentUser.id,
      returnedByName: currentUser.name || 'Askep',
      returnedAt: nowISO(),
      reason: reason
    }
  };
  const details = `Askep (${currentUser.name}) mengembalikan dokumen ke Pengurus: ${reason}`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.UPDATE, details);
}

// 3. Asisten Bibitan Pengirim Verifikasi Kesiapan
export async function processAsistenBibitanVerification(txId, formValues, currentUser) {
  const { isCutReady, isPackReady, notes } = formValues;
  const patch = {
    status: MATA_ENTRES_STATUS.TERVERIFIKASI,
    statusLabel: MATA_ENTRES_STATUS_LABELS.TERVERIFIKASI,
    targetNextRole: 'MANTRI_TANAMAN',
    asbVerification: {
      verifiedByUserId: currentUser.userId || currentUser.id,
      verifiedByName: currentUser.name || 'Asisten Bibitan',
      verifiedAt: nowISO(),
      isCutReady: Boolean(isCutReady),
      isPackReady: Boolean(isPackReady),
      notes: notes || null
    }
  };
  const details = `Asisten Bibitan (${currentUser.name}) memverifikasi kesiapan mata entres untuk pengeluaran fisik oleh Mantri Bibitan.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.VERIFY, details);
}

// 3b. Asisten Bibitan Pengirim Kembalikan ke Askep
export async function processAsistenBibitanReturn(txId, reason, currentUser) {
  const patch = {
    status: MATA_ENTRES_STATUS.PERLU_REVISI_ASISTEN_KEPALA,
    statusLabel: MATA_ENTRES_STATUS_LABELS.PERLU_REVISI_ASISTEN_KEPALA,
    targetNextRole: 'ASKEP',
    returnInfo: {
      returnedByUserId: currentUser.userId || currentUser.id,
      returnedByName: currentUser.name || 'Asisten Bibitan',
      returnedAt: nowISO(),
      reason: reason
    }
  };
  const details = `Asisten Bibitan (${currentUser.name}) mengembalikan dokumen ke Askep: ${reason}`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.UPDATE, details);
}

// 4. Mantri Bibitan Pengirim Pengeluaran Fisik (Dispatch -> Auto Receipt Handoff)
export async function processMantriDispatch(txId, formValues, currentUser) {
  const { jumlahBatangDikeluarkan, jumlahMataEntresDikeluarkan, tanggalPengeluaran, vehiclePlate, photoEvidence, notes } = formValues;
  
  const allReqs = storage.get('requests_transactions', []);
  const parentReq = allReqs.find(t => t.id === txId || t.docNo === txId) || { id: txId, type: 'MATA_ENTRES' };

  // Simpan dispatch history (Cek idempoten: jika dispatch untuk parentRequestId ini sudah ada, gunakan yang ada)
  const dispatches = storage.get('dispatch_transactions', []);
  let dispatchRecord = dispatches.find(d => d.parentRequestId === parentReq.id && (d.type === 'MATA_ENTRES' || d.transactionType === 'PENGELUARAN_MATA_ENTRES'));

  if (!dispatchRecord) {
    const dispatchDocNo = `DSP-${Date.now().toString().slice(-6)}`;
    dispatchRecord = {
      id: `DSP-${Date.now()}`,
      docNo: dispatchDocNo,
      dispatchNo: dispatchDocNo,
      transactionType: 'PENGELUARAN_MATA_ENTRES',
      type: 'MATA_ENTRES',
      parentRequestId: parentReq.id,
      parentRequestDocNo: parentReq.docNo,
      estateId: currentUser.estateId,
      estateName: currentUser.estateName,
      divisionId: currentUser.divisionId || parentReq.targetNextDivisionId,
      jumlahBatangDikeluarkan: Number(jumlahBatangDikeluarkan),
      jumlahMataEntresDikeluarkan: Number(jumlahMataEntresDikeluarkan),
      issuedQty: Number(jumlahBatangDikeluarkan),
      vehiclePlate: vehiclePlate ? vehiclePlate.trim().toUpperCase() : null,
      photoEvidence: photoEvidence || null,
      issuedDate: tanggalPengeluaran || todayISO(),
      createdAt: nowISO(),
      details: [
        {
          batchId: `BATCH-ETRS-${parentReq.klon || 'KLON'}`,
          batchCode: `ETRS-${parentReq.klon || 'KLON'}`,
          klon: parentReq.klon || 'IRCA 19',
          qty: Number(jumlahBatangDikeluarkan),
          mataQty: Number(jumlahMataEntresDikeluarkan)
        }
      ]
    };
    dispatches.push(dispatchRecord);
    storage.set('dispatch_transactions', dispatches);
  }

  // Buat Dokumen Penerimaan (Receipt) Otomatis di Kebun Pemohon
  let createdReceipt = null;
  try {
    createdReceipt = createReceiptFromDispatch(dispatchRecord, parentReq, currentUser);
  } catch (err) {
    console.warn('[processMantriDispatch] Warning creating receipt:', err);
  }

  const patch = {
    status: MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_PENGURUS,
    statusLabel: MATA_ENTRES_STATUS_LABELS.MENUNGGU_PENERIMAAN_PENGURUS,
    targetNextRole: 'PENGURUS',
    targetNextEstateId: parentReq.sourceEstateId || parentReq.estateId,
    jumlahBatangDikeluarkan: Number(jumlahBatangDikeluarkan),
    jumlahMataEntresDikeluarkan: Number(jumlahMataEntresDikeluarkan),
    tanggalPengeluaran: tanggalPengeluaran || todayISO(),
    vehiclePlate: vehiclePlate ? vehiclePlate.trim().toUpperCase() : null,
    photoEvidence: photoEvidence || null,
    dispatchId: dispatchRecord.id,
    dispatchDocNo: dispatchRecord.docNo || dispatchRecord.dispatchNo,
    receiptId: createdReceipt?.id || null,
    receiptDocNo: createdReceipt?.receiptDocNo || createdReceipt?.docNo || null,
    pengeluaran: {
      dispatchedByUserId: currentUser.userId || currentUser.id,
      dispatchedByName: currentUser.name || 'Mantri Bibitan',
      dispatchedAt: nowISO(),
      jumlahBatang: Number(jumlahBatangDikeluarkan),
      jumlahMataEntres: Number(jumlahMataEntresDikeluarkan),
      tanggal: tanggalPengeluaran || todayISO(),
      vehiclePlate: vehiclePlate ? vehiclePlate.trim().toUpperCase() : null,
      photoEvidence: photoEvidence || null,
      notes: notes || null
    }
  };

  const details = `Mantri Bibitan (${currentUser.name}) mencatat pengeluaran fisik: ${jumlahBatangDikeluarkan} batang (${jumlahMataEntresDikeluarkan} mata entres)${vehiclePlate ? ` [Plat: ${vehiclePlate.toUpperCase()}]` : ''}. Dokumen penerimaan ${createdReceipt?.receiptDocNo || ''} otomatis dibuat di Kebun Pemohon.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.UPDATE, details);
}

// 5. Pengurus Pemohon: Catat Kedatangan Awal
export async function processPengurusArrival(txId, formValues, currentUser) {
  const { initialReceivedDate, notes } = formValues;
  const patch = {
    status: MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
    statusLabel: MATA_ENTRES_STATUS_LABELS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
    targetNextRole: 'ASKEP',
    targetNextEstateId: currentUser.estateId,
    initialArrival: {
      arrivedAt: nowISO(),
      receivedByUserId: currentUser.userId || currentUser.id,
      receivedByName: currentUser.name || 'Pengurus Pemohon',
      initialReceivedDate: initialReceivedDate || todayISO(),
      notes: notes || null
    }
  };

  // Sync child receipt jika ada
  const receipts = getReceiptKspTransactions();
  const childReceipt = receipts.find(r => r.parentRequestId === txId || r.dispatchDocNo === txId);
  if (childReceipt) {
    updateReceiptKsp(childReceipt.id, {
      status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
      statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA],
      targetNextRole: 'ASKEP',
      initialReceivedDate: initialReceivedDate || todayISO(),
      pengurusNotes: notes || null
    }, currentUser, AUDIT_EVENT_TYPES.UPDATE, `Pengurus Pemohon mencatat kedatangan awal mata entres.`);
  }

  const details = `Pengurus Pemohon (${currentUser.name}) mencatat kedatangan awal mata entres dan meneruskan ke Askep.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.UPDATE, details);
}

// 6. Askep Pemohon: Verifikasi & Tentukan Divisi Bibitan Tujuan Okulasi (Jalur BIBITAN)
export async function processAskepReceiptRouting(txId, formValues, currentUser) {
  const { targetNextDivisionId, notes } = formValues;
  const patch = {
    status: MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN,
    statusLabel: MATA_ENTRES_STATUS_LABELS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN,
    targetNextRole: 'ASISTEN_BIBITAN',
    targetNextDivisionId: targetNextDivisionId,
    askepReceiptVerification: {
      verifiedAt: nowISO(),
      verifiedByUserId: currentUser.userId || currentUser.id,
      verifiedByName: currentUser.name || 'Askep Pemohon',
      targetNextDivisionId: targetNextDivisionId,
      notes: notes || null
    }
  };

  const receipts = getReceiptKspTransactions();
  const childReceipt = receipts.find(r => r.parentRequestId === txId);
  if (childReceipt) {
    updateReceiptKsp(childReceipt.id, {
      status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN,
      statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN],
      targetNextRole: 'ASISTEN_BIBITAN',
      targetNextDivisionId: targetNextDivisionId,
      jalurPenerimaan: 'BIBITAN',
      askepNotes: notes || null
    }, currentUser, AUDIT_EVENT_TYPES.VERIFY, `Askep Pemohon memverifikasi kedatangan dan routing ke Divisi Bibitan ${targetNextDivisionId}.`);
  }

  const details = `Askep Pemohon (${currentUser.name}) memverifikasi penerimaan mata entres dan meneruskan ke Asisten Bibitan Divisi ${targetNextDivisionId}.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.VERIFY, details);
}

// 6b. Askep Pemohon: Kembalikan ke Pengurus
export async function processAskepReceiptReturn(txId, reason, currentUser) {
  const patch = {
    status: MATA_ENTRES_STATUS.DIKEMBALIKAN_KE_PENGURUS,
    statusLabel: MATA_ENTRES_STATUS_LABELS.DIKEMBALIKAN_KE_PENGURUS,
    targetNextRole: 'PENGURUS',
    askepReturnInfo: {
      returnedAt: nowISO(),
      returnedByUserId: currentUser.userId || currentUser.id,
      returnedByName: currentUser.name || 'Askep Pemohon',
      reason: reason
    }
  };

  const receipts = getReceiptKspTransactions();
  const childReceipt = receipts.find(r => r.parentRequestId === txId);
  if (childReceipt) {
    updateReceiptKsp(childReceipt.id, {
      status: RECEIPT_KSP_STATUS.DIKEMBALIKAN_KE_PENGURUS,
      statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.DIKEMBALIKAN_KE_PENGURUS],
      targetNextRole: 'PENGURUS',
      returnReason: reason
    }, currentUser, AUDIT_EVENT_TYPES.UPDATE, `Askep mengembalikan dokumen ke Pengurus.`);
  }

  const details = `Askep Pemohon (${currentUser.name}) mengembalikan dokumen ke Pengurus: ${reason}`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.UPDATE, details);
}

// 7. Asisten Bibitan Pemohon: Verifikasi Penerimaan Mata Entres
export async function processAsistenBibitanReceiptVerification(txId, formValues, currentUser) {
  const { notes } = formValues || {};
  const patch = {
    status: MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN,
    statusLabel: MATA_ENTRES_STATUS_LABELS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN,
    targetNextRole: 'MANTRI_TANAMAN',
    asbReceiptVerification: {
      verifiedAt: nowISO(),
      verifiedByUserId: currentUser.userId || currentUser.id,
      verifiedByName: currentUser.name || 'Asisten Bibitan Pemohon',
      notes: notes || null
    }
  };

  const receipts = getReceiptKspTransactions();
  const childReceipt = receipts.find(r => r.parentRequestId === txId);
  if (childReceipt) {
    updateReceiptKsp(childReceipt.id, {
      status: RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN,
      statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN],
      targetNextRole: 'MANTRI_TANAMAN',
      asbNotes: notes || null
    }, currentUser, AUDIT_EVENT_TYPES.VERIFY, `Asisten Bibitan memverifikasi penerimaan mata entres.`);
  }

  const details = `Asisten Bibitan Pemohon (${currentUser.name}) memverifikasi penerimaan mata entres dan meneruskan ke Mantri Bibitan.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.VERIFY, details);
}

// 7b. Asisten Bibitan Pemohon: Kembalikan ke Askep
export async function processAsistenBibitanReceiptReturn(txId, reason, currentUser) {
  const patch = {
    status: MATA_ENTRES_STATUS.PERLU_REVISI_ASISTEN_KEPALA,
    statusLabel: MATA_ENTRES_STATUS_LABELS.PERLU_REVISI_ASISTEN_KEPALA,
    targetNextRole: 'ASKEP',
    asbReceiptReturnInfo: {
      returnedAt: nowISO(),
      returnedByUserId: currentUser.userId || currentUser.id,
      returnedByName: currentUser.name || 'Asisten Bibitan Pemohon',
      reason: reason
    }
  };

  const receipts = getReceiptKspTransactions();
  const childReceipt = receipts.find(r => r.parentRequestId === txId);
  if (childReceipt) {
    updateReceiptKsp(childReceipt.id, {
      status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
      statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA],
      targetNextRole: 'ASKEP',
      returnReason: reason
    }, currentUser, AUDIT_EVENT_TYPES.UPDATE, `Asisten Bibitan mengembalikan dokumen ke Askep.`);
  }

  const details = `Asisten Bibitan Pemohon (${currentUser.name}) mengembalikan dokumen ke Askep: ${reason}`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.UPDATE, details);
}

// 8. Mantri Bibitan Pemohon: Pemeriksaan Fisik & Finalisasi Penerimaan
export async function processMantriBibitanFinalReceipt(txId, formValues, currentUser) {
  const {
    jumlahBatangDiterima,
    jumlahMataEntresDiterima,
    rejectBatang = 0,
    rejectMata = 0,
    rejectReason = null,
    discrepancyReason = null,
    tanggalPenerimaan,
    photoEvidence,
    notes
  } = formValues;

  const allReqs = storage.get('requests_transactions', []);
  const parentReq = allReqs.find(t => t.id === txId || t.docNo === txId) || {};
  const dspBatang = parentReq.jumlahBatangDikeluarkan || parentReq.jumlahBatang || 0;
  const dspMata = parentReq.jumlahMataEntresDikeluarkan || parentReq.jumlahMataEntres || 0;

  const hasSelisih = (
    Number(jumlahBatangDiterima) !== Number(dspBatang) ||
    Number(jumlahMataEntresDiterima) !== Number(dspMata) ||
    Number(rejectBatang) > 0 ||
    Number(rejectMata) > 0
  );

  const finalStatus = hasSelisih ? MATA_ENTRES_STATUS.DITERIMA_DENGAN_SELISIH : MATA_ENTRES_STATUS.DITERIMA;
  const finalStatusLabel = MATA_ENTRES_STATUS_LABELS[finalStatus];

  const patch = {
    status: finalStatus,
    statusLabel: finalStatusLabel,
    workflowStage: 'SELESAI',
    targetNextRole: null,
    jumlahBatangDiterima: Number(jumlahBatangDiterima),
    jumlahMataEntresDiterima: Number(jumlahMataEntresDiterima),
    rejectBatang: Number(rejectBatang),
    rejectMata: Number(rejectMata),
    rejectReason: rejectReason || null,
    discrepancyReason: discrepancyReason || null,
    tanggalPenerimaan: tanggalPenerimaan || todayISO(),
    receiptPhotoEvidence: photoEvidence || null,
    penerimaan: {
      receivedByUserId: currentUser.userId || currentUser.id,
      receivedByName: currentUser.name || 'Mantri Bibitan Pemohon',
      receivedAt: nowISO(),
      jumlahBatang: Number(jumlahBatangDiterima),
      jumlahMataEntres: Number(jumlahMataEntresDiterima),
      rejectBatang: Number(rejectBatang),
      rejectMata: Number(rejectMata),
      rejectReason: rejectReason || null,
      discrepancyReason: discrepancyReason || null,
      tanggal: tanggalPenerimaan || todayISO(),
      photoEvidence: photoEvidence || null,
      notes: notes || null
    }
  };

  const receipts = getReceiptKspTransactions();
  const childReceipt = receipts.find(r => r.parentRequestId === txId);
  if (childReceipt) {
    updateReceiptKsp(childReceipt.id, {
      status: hasSelisih ? RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH : RECEIPT_KSP_STATUS.DITERIMA,
      statusLabel: hasSelisih ? RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH] : RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.DITERIMA],
      totalAcceptedQty: Number(jumlahBatangDiterima),
      totalAcceptedBatang: Number(jumlahBatangDiterima),
      totalAcceptedMata: Number(jumlahMataEntresDiterima),
      totalRejectedQty: Number(rejectBatang),
      rejectReason: rejectReason || null,
      discrepancyReason: discrepancyReason || null,
      photoEvidence: photoEvidence || null,
      targetNextRole: null
    }, currentUser, AUDIT_EVENT_TYPES.APPROVE, `Mantri Bibitan menyelesaikan pemeriksaan fisik penerimaan mata entres.`);
  }

  const details = `Mantri Bibitan Pemohon (${currentUser.name}) menyelesaikan penerimaan fisik: ${jumlahBatangDiterima} batang (${jumlahMataEntresDiterima} mata entres). Status: ${finalStatusLabel}.`;
  return updateMataEntresRecord(txId, patch, currentUser, AUDIT_EVENT_TYPES.APPROVE, details);
}

// Fallback legacy direct receipt
export async function processRequesterReceipt(txId, formValues, currentUser) {
  return processMantriBibitanFinalReceipt(txId, formValues, currentUser);
}

// ============================================================================
// MODAL FORMS UI
// ============================================================================

// MODAL 1: Review Pengurus Pengirim
export function openPengurusReviewModal(tx, currentUser, onSuccess) {
  const defaultBatang = tx.jumlahBatang || 0;
  const activeKlons = getActiveKlons();
  const klonOptions = activeKlons.map(k => `
    <option value="${esc(k.canonicalName)}" ${k.canonicalName === tx.klon ? 'selected' : ''}>${esc(k.canonicalName)}</option>
  `).join('');

  openModal({
    title: 'Review Permintaan Mata Entres',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px;">
          <div style="font-size: 0.70rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 6px;">Data Permintaan Awal</div>
          <div style="display: grid; grid-template-columns: 45% 55%; gap: 6px; font-size: 0.78rem;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Kebun Pemohon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.sourceEstateName || tx.estateId)}</span>
            ${tx.allocationCode ? `
              <span style="color: #64748B;">Kode Alokasi:</span>
              <span style="font-weight: 700; color: #1E293B;">${esc(tx.allocationCode)}</span>
            ` : ''}
            <span style="color: #64748B;">Klon Diminta:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.klon)}</span>
            <span style="color: #64748B;">Permintaan Batang:</span>
            <span style="font-weight: 700; color: #1E293B;">${defaultBatang.toLocaleString('id-ID')} Batang</span>
            <span style="color: #64748B;">Tgl Dibutuhkan:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.requiredDate || '-')}</span>
            ${tx.catatan ? `
              <span style="color: #64748B;">Catatan Pemohon:</span>
              <span style="color: #334155; font-style: italic;">${esc(tx.catatan)}</span>
            ` : ''}
          </div>
        </div>

        <form id="form-pengurus-review" onsubmit="return false;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.02em; margin: 10px 0 8px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 4px;">
            Keputusan Alokasi Kuota
          </div>
          
          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Klon Disetujui <span style="color: #DC2626;">*</span></label>
            <select id="rev-approved-klon" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required>
              ${klonOptions}
            </select>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">
              Jlh Permintaan Disetujui (Batang) <span style="color: #DC2626;">*</span>
            </label>
            <input type="number" id="rev-approved-batang" value="${defaultBatang}" min="1" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 700;" required />
          </div>

          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Estimasi Tanggal Pengiriman <span style="color: #DC2626;">*</span></label>
            <input type="date" id="rev-delivery-date" value="${tx.requiredDate || todayISO()}" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Catatan Pengurus</label>
            <textarea id="rev-notes" rows="2" placeholder="Instruksi alokasi untuk Askep/Bibitan..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" id="btn-reject-request" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #DC2626; cursor: pointer;">
              Tolak Permintaan
            </button>
            <button type="submit" id="btn-approve-request" style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
              Setujui &amp; Teruskan
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-reject-request')?.addEventListener('click', () => {
    closeModal();
    openRejectReasonModal(tx, currentUser, onSuccess);
  });

  modalRoot?.querySelector('#form-pengurus-review')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const approvedKlon = modalRoot.querySelector('#rev-approved-klon')?.value;
    const approvedBatang = parseInt(modalRoot.querySelector('#rev-approved-batang')?.value, 10);
    const estimatedDeliveryDate = modalRoot.querySelector('#rev-delivery-date')?.value;
    const notes = modalRoot.querySelector('#rev-notes')?.value;

    if (!approvedKlon || isNaN(approvedBatang) || approvedBatang <= 0) {
      toast('Silakan isi jumlah batang disetujui yang valid.', 'error');
      return;
    }

    try {
      await processPengurusReview(tx.id, { approvedBatang, approvedKlon, estimatedDeliveryDate, notes }, currentUser);
      closeModal();
      toast('Permintaan Mata Entres disetujui dan diteruskan ke Asisten Kepala.', 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast(err.message || 'Gagal menyetujui permintaan', 'error');
    }
  });
}

// MODAL 1b: Tolak Permintaan
export function openRejectReasonModal(tx, currentUser, onSuccess) {
  openModal({
    title: 'Tolak Permintaan Mata Entres',
    body: `
      <div style="font-size: 0.84rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="color: #475569; margin: 0 0 10px 0;">Dokumen <strong>${esc(tx.docNo)}</strong> akan ditolak secara permanen.</p>
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">Alasan Penolakan <span style="color: #DC2626;">*</span></label>
          <textarea id="inp-reject-reason" rows="3" placeholder="Jelaskan alasan penolakan (misal: stok pohon entres belum cukup umur)..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; justify-content: flex-end; width: 100%;">
        <button type="button" id="btn-cancel-reject" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-weight: 600; color: #475569; cursor: pointer;">
          Batal
        </button>
        <button type="button" id="btn-confirm-reject" style="padding: 8px 16px; background: #DC2626; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
          Konfirmasi Tolak
        </button>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-cancel-reject')?.addEventListener('click', closeModal);
  modalRoot?.querySelector('#btn-confirm-reject')?.addEventListener('click', async () => {
    const reason = modalRoot.querySelector('#inp-reject-reason')?.value || '';
    if (!reason.trim()) {
      toast('Alasan penolakan wajib diisi', 'error');
      return;
    }
    try {
      await processPengurusReject(tx.id, reason, currentUser);
      closeModal();
      toast('Permintaan Mata Entres telah ditolak.', 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast('Gagal menolak permintaan: ' + err.message, 'error');
    }
  });
}

// MODAL 2: Askep Pengirim Verifikasi & Pilih Divisi Bibitan Sumber
export function openAskepVerificationModal(tx, currentUser, onSuccess) {
  const targetEstateId = tx.targetEstateId || currentUser.estateId;
  const nurseryDivs = getNurseryDivisionsByEstate(targetEstateId);
  const divOptions = nurseryDivs.map(d => `
    <option value="${esc(d.divisionId)}">${esc(d.divisionName || d.divisionId)}</option>
  `).join('');

  openModal({
    title: 'Verifikasi Askep & Pilih Divisi Bibitan Sumber',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 4px 6px; font-size: 0.76rem; line-height: 1.35;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Klon Disetujui:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.approval?.approvedKlon || tx.klon)}</span>
            <span style="color: #64748B;">Kuota Disetujui:</span>
            <span style="font-weight: 700; color: #116834;">${(tx.approval?.approvedBatang || tx.jumlahBatang || 0).toLocaleString('id-ID')} Batang / ${(tx.approval?.approvedMataEntres || tx.jumlahMataEntres || 0).toLocaleString('id-ID')} Mata</span>
            ${tx.approval?.notes ? `
              <span style="color: #64748B;">Catatan Pengurus:</span>
              <span style="color: #334155; font-style: italic;">${esc(tx.approval.notes)}</span>
            ` : ''}
          </div>
        </div>

        <form id="form-askep-verify" onsubmit="return false;">
          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Pilih Divisi Bibitan / Kebun Entres Sumber <span style="color: #DC2626;">*</span></label>
            <select id="askep-target-div" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required>
              ${divOptions || '<option value="DIV-01">Divisi Bibitan Utama</option>'}
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Instruksi untuk Asisten Bibitan</label>
            <textarea id="askep-notes" rows="2" placeholder="Instruksi jadwal pemotongan..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" id="btn-return-pengurus" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #DC2626; cursor: pointer;">
              Kembalikan ke Pengurus
            </button>
            <button type="submit" id="btn-submit-askep" style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
              Verifikasi &amp; Teruskan
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-return-pengurus')?.addEventListener('click', async () => {
    closeModal();
    openReturnToPengurusModal(tx, currentUser, onSuccess);
  });

  modalRoot?.querySelector('#form-askep-verify')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetDivisionId = modalRoot.querySelector('#askep-target-div')?.value;
    const notes = modalRoot.querySelector('#askep-notes')?.value;
    if (!targetDivisionId) {
      toast('Divisi Bibitan wajib dipilih', 'error');
      return;
    }
    try {
      await processAskepVerification(tx.id, { targetDivisionId, notes }, currentUser);
      closeModal();
      toast('Permintaan Mata Entres berhasil diverifikasi ke Asisten Bibitan.', 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast('Gagal memverifikasi: ' + err.message, 'error');
    }
  });
}

export function openReturnToPengurusModal(tx, currentUser, onSuccess) {
  openModal({
    title: 'Kembalikan Dokumen ke Pengurus',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <p style="color: #475569; margin: 0 0 8px 0; font-size: 0.78rem;">Jelaskan catatan revisi untuk Pengurus Kebun Tujuan:</p>
        <textarea id="inp-askep-return-reason" rows="3" placeholder="Contoh: Perlu penyesuaian kuota atau jadwal pengiriman..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;" required></textarea>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; justify-content: flex-end; width: 100%;">
        <button type="button" id="btn-cancel-return-pgs" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #475569;">Batal</button>
        <button type="button" id="btn-confirm-return-pgs" style="padding: 7px 16px; background: #DC2626; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF;">Kembalikan</button>
      </div>
    `
  });
  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-cancel-return-pgs')?.addEventListener('click', closeModal);
  modalRoot?.querySelector('#btn-confirm-return-pgs')?.addEventListener('click', async () => {
    const reason = modalRoot.querySelector('#inp-askep-return-reason')?.value || '';
    if (!reason.trim()) {
      toast('Alasan pengembalian wajib diisi', 'error');
      return;
    }
    try {
      await processAskepReturn(tx.id, reason, currentUser);
      closeModal();
      toast('Dokumen telah dikembalikan ke Pengurus untuk direvisi.', 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

// MODAL 3: Asisten Bibitan Pengirim Verifikasi Kesiapan & Teruskan ke Mantri
export function openAsistenBibitanVerificationModal(tx, currentUser, onSuccess) {
  const divObj = resolveNurseryDivision(tx.sourceDivisionId, tx.targetEstateId);
  const divisionName = divObj?.divisionName || tx.sourceDivisionId || 'Divisi Bibitan';

  openModal({
    title: 'Verifikasi Asisten Bibitan & Teruskan ke Mantri',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 4px 6px; font-size: 0.76rem; line-height: 1.35;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Klon Disetujui:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.approval?.approvedKlon || tx.klon)}</span>
            <span style="color: #64748B;">Kuota Disetujui:</span>
            <span style="font-weight: 700; color: #116834;">${(tx.approval?.approvedBatang || tx.jumlahBatang || 0).toLocaleString('id-ID')} Batang / ${(tx.approval?.approvedMataEntres || tx.jumlahMataEntres || 0).toLocaleString('id-ID')} Mata</span>
            <span style="color: #64748B;">Divisi Bibitan:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(divisionName)}</span>
            ${tx.askepVerification?.notes ? `
              <span style="color: #64748B;">Instruksi Askep:</span>
              <span style="color: #334155; font-style: italic;">${esc(tx.askepVerification.notes)}</span>
            ` : ''}
          </div>
        </div>

        <form id="form-asb-verify" onsubmit="return false;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Instruksi untuk Mantri Bibitan</label>
            <textarea id="asb-notes" rows="2" placeholder="Instruksi jadwal pemotongan & pengeluaran untuk Mantri..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" id="btn-return-askep" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #DC2626; cursor: pointer;">
              Kembalikan ke Askep
            </button>
            <button type="submit" id="btn-submit-asb" style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
              Verifikasi &amp; Teruskan
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-return-askep')?.addEventListener('click', async () => {
    closeModal();
    openReturnToAskepModal(tx, currentUser, onSuccess);
  });

  modalRoot?.querySelector('#form-asb-verify')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const notes = modalRoot.querySelector('#asb-notes')?.value;

    try {
      await processAsistenBibitanVerification(tx.id, { notes }, currentUser);
      closeModal();
      toast('Permintaan Mata Entres berhasil diverifikasi ke Mantri Bibitan untuk pengeluaran fisik.', 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast('Gagal memverifikasi: ' + err.message, 'error');
    }
  });
}

export function openReturnToAskepModal(tx, currentUser, onSuccess) {
  openModal({
    title: 'Kembalikan Dokumen ke Askep',
    body: `
      <div style="font-size: 0.84rem;">
        <p style="color: #475569; margin: 0 0 10px 0;">Jelaskan alasan pengembalian ke Asisten Kepala:</p>
        <textarea id="inp-asb-return-reason" rows="3" placeholder="Contoh: Stok klon ini belum siap potong dalam minggu ini..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required></textarea>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; justify-content: flex-end; width: 100%;">
        <button type="button" id="btn-cancel-return-askep" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-weight: 600;">Batal</button>
        <button type="button" id="btn-confirm-return-askep" style="padding: 8px 16px; background: #DC2626; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #FFFFFF;">Kembalikan</button>
      </div>
    `
  });
  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-cancel-return-askep')?.addEventListener('click', closeModal);
  modalRoot?.querySelector('#btn-confirm-return-askep')?.addEventListener('click', async () => {
    const reason = modalRoot.querySelector('#inp-asb-return-reason')?.value || '';
    if (!reason.trim()) {
      toast('Alasan pengembalian wajib diisi', 'error');
      return;
    }
    try {
      await processAsistenBibitanReturn(tx.id, reason, currentUser);
      closeModal();
      toast('Dokumen telah dikembalikan ke Askep.', 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

// MODAL 4: Mantri Bibitan Pengirim Pengeluaran Fisik (Dispatch Modal)
export function openMantriDispatchModal(tx, currentUser, onSuccess) {
  const targetBatang = tx.approval?.approvedBatang || tx.jumlahBatang || 0;
  const targetMata = tx.approval?.approvedMataEntres || tx.jumlahMataEntres || (targetBatang * 2);
  let currentPhotoMetadata = null;

  openModal({
    title: 'Catat Pengeluaran Mata Entres',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 4px 6px; font-size: 0.76rem; line-height: 1.35;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Kebun Peminta:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.sourceEstateName || tx.estateId)}</span>
            <span style="color: #64748B;">Jenis Klon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.approval?.approvedKlon || tx.klon)}</span>
            <span style="color: #64748B;">Target Kuota:</span>
            <span style="font-weight: 700; color: #116834;">${targetBatang.toLocaleString('id-ID')} Batang / ${targetMata.toLocaleString('id-ID')} Mata</span>
          </div>
        </div>

        <form id="form-mantri-dispatch" onsubmit="return false;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.02em; margin: 10px 0 8px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 4px;">
            Realisasi Pengeluaran Fisik
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div>
              <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">
                Batang Dikeluarkan <span style="color: #DC2626;">*</span>
              </label>
              <input type="number" id="dsp-batang" value="${targetBatang}" min="1" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 700;" required />
            </div>
            <div>
              <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">
                Mata Dikeluarkan <span style="color: #DC2626;">*</span>
              </label>
              <input type="number" id="dsp-mata" value="${targetMata}" min="1" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 700;" required />
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <label for="dsp-vehicle" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">
              Plat Kendaraan
            </label>
            <input 
              type="text" 
              id="dsp-vehicle" 
              placeholder="Contoh: BK 1234 XX"
              style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; text-transform: uppercase;"
            />
          </div>

          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">
              Tanggal Pengeluaran <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="text" 
              id="dsp-date" 
              value="${formatDate(todayISO()) || todayISO()}" 
              data-iso="${todayISO()}"
              readonly 
              style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; background: #F8FAFC; color: #334155; font-weight: 600; cursor: not-allowed;" 
            />
          </div>

          <!-- SECTION FOTO BUKTI PENGELUARAN (Harmonized with Modul Penyemaian) -->
          <div style="margin-bottom: 12px; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; background: #FFFFFF;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Foto Bukti Pengeluaran
            </label>
            <p style="font-size: 0.72rem; color: #64748B; margin: 0 0 10px 0; line-height: 1.35;">
              Ambil foto dokumentasi fisik mata entres saat pengeluaran. Ketuk thumbnail foto untuk memperbesar.
            </p>
            
            <div id="dsp-photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
              <div id="dsp-photo-preview-item" style="display: none; position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 1px 3px rgba(0,0,0,0.08); cursor: pointer;">
                <img id="dsp-photo-preview" src="" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" alt="Foto Pengeluaran" title="Klik untuk memperbesar foto" />
                <button type="button" id="btn-dsp-retake" title="Ambil Ulang Foto" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #FFFFFF; padding: 0;">
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="#FFFFFF" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            <div id="dsp-camera-trigger-box" style="display: block;">
              <button 
                type="button" 
                id="btn-dsp-open-camera" 
                style="width: 100%; padding: 10px; background: #F0FDF4; border: 1px dashed #16A34A; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #15803D; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Ambil Foto Kamera
              </button>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Catatan Pengeluaran</label>
            <textarea id="dsp-notes" rows="2" placeholder="Contoh: Kayu entres dipotong segar dan dikemas karung basah..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; box-sizing: border-box; margin-top: 14px;">
            <button type="button" id="btn-cancel-dispatch" style="width: 100%; padding: 9px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #475569; cursor: pointer; text-align: center; box-sizing: border-box;">
              Batal
            </button>
            <button type="submit" id="btn-submit-dispatch" style="width: 100%; padding: 9px 12px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer; text-align: center; box-sizing: border-box;">
              Simpan Pengeluaran
            </button>
          </div>
        </form>

        <!-- POPUP / LIGHTBOX PHOTO VIEWER -->
        <div id="modal-photo-viewer-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10005; backdrop-filter: blur(4px);"></div>
        <div id="modal-photo-viewer" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 92vw; max-height: 85vh; z-index: 10006; flex-direction: column; align-items: center; justify-content: center;">
          <button id="btn-close-photo-viewer" type="button" aria-label="Tutup" style="position: absolute; top: -44px; right: 0; background: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.5); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <img id="img-photo-viewer-target" src="" alt="Foto Bukti Pengeluaran" style="max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" />
        </div>

        <!-- CAMERA OVERLAY -->
        <div id="camera-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #000; z-index: 10000; flex-direction: column;">
          <header style="display: flex; justify-content: space-between; align-items: center; padding: 16px; position: absolute; top: 0; left: 0; right: 0; z-index: 10001;">
            <button id="btn-close-camera" type="button" style="background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ffffff" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>
          <main style="flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
            <video id="camera-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
            <canvas id="camera-canvas" style="display: none;"></canvas>
            <div id="camera-error" style="display: none; color: white; text-align: center; padding: 20px;">
              <p style="font-weight: 700; margin-bottom: 6px;">Kamera tidak tersedia atau akses ditolak.</p>
              <p style="font-size: 0.8rem; color: #aaa;">Ketuk tombol rana untuk foto simulasi.</p>
            </div>
          </main>
          <footer style="padding: 24px; display: flex; justify-content: center; align-items: center; position: absolute; bottom: 0; left: 0; right: 0; z-index: 10001; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
            <button id="btn-shutter" type="button" style="width: 70px; height: 70px; border-radius: 50%; background: transparent; border: 4px solid #ffffff; display: flex; justify-content: center; align-items: center; cursor: pointer;">
              <div style="width: 54px; height: 54px; background: #ffffff; border-radius: 50%;"></div>
            </button>
          </footer>
        </div>

      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  const cameraOverlay = modalRoot?.querySelector('#camera-overlay');
  const videoEl = modalRoot?.querySelector('#camera-video');
  const canvasEl = modalRoot?.querySelector('#camera-canvas');
  const errorEl = modalRoot?.querySelector('#camera-error');
  const btnCloseCamera = modalRoot?.querySelector('#btn-close-camera');
  const btnShutter = modalRoot?.querySelector('#btn-shutter');
  const btnOpenCam = modalRoot?.querySelector('#btn-dsp-open-camera');
  const btnRetake = modalRoot?.querySelector('#btn-dsp-retake');
  const triggerBox = modalRoot?.querySelector('#dsp-camera-trigger-box');
  const photoPreviewItem = modalRoot?.querySelector('#dsp-photo-preview-item');
  const photoPreview = modalRoot?.querySelector('#dsp-photo-preview');

  const photoViewerOverlay = modalRoot?.querySelector('#modal-photo-viewer-overlay');
  const photoViewerModal = modalRoot?.querySelector('#modal-photo-viewer');
  const photoViewerImg = modalRoot?.querySelector('#img-photo-viewer-target');
  const btnClosePhotoViewer = modalRoot?.querySelector('#btn-close-photo-viewer');

  function openPhotoViewer(src) {
    if (!photoViewerOverlay || !photoViewerModal || !photoViewerImg) return;
    photoViewerImg.src = src;
    photoViewerOverlay.style.display = 'block';
    photoViewerModal.style.display = 'flex';
  }

  function closePhotoViewer() {
    if (!photoViewerOverlay || !photoViewerModal) return;
    photoViewerOverlay.style.display = 'none';
    photoViewerModal.style.display = 'none';
  }

  photoPreview?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (photoPreview.src) openPhotoViewer(photoPreview.src);
  });

  photoViewerOverlay?.addEventListener('click', closePhotoViewer);
  btnClosePhotoViewer?.addEventListener('click', closePhotoViewer);

  let currentStream = null;
  let isCameraActive = false;

  async function openCamera() {
    if (!cameraOverlay) return;
    cameraOverlay.style.display = 'flex';
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoEl.srcObject = currentStream;
        await videoEl.play();
        isCameraActive = true;
        errorEl.style.display = 'none';
        videoEl.style.display = 'block';
      } else {
        throw new Error('Not supported');
      }
    } catch (e) {
      isCameraActive = false;
      errorEl.style.display = 'block';
      videoEl.style.display = 'none';
    }
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    if (cameraOverlay) {
      cameraOverlay.style.display = 'none';
    }
  }

  btnCloseCamera?.addEventListener('click', stopCamera);
  btnOpenCam?.addEventListener('click', openCamera);
  btnRetake?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCamera();
  });

  btnShutter?.addEventListener('click', () => {
    let dataUrl = '';
    const ts = new Date().toISOString();
    const displayTs = new Date().toLocaleString('id-ID');
    const roleStr = typeof normalizeRole === 'function' ? normalizeRole(currentUser.role || currentUser.rawRole) : (currentUser.role || 'MANTRI_TANAMAN');

    if (isCameraActive && videoEl && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0);
      
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, canvasEl.height - 40, canvasEl.width, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(`${currentUser.name || 'Mantri'} • ${displayTs}`, 10, canvasEl.height - 15);
      
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    } else {
      canvasEl.width = 400;
      canvasEl.height = 400;
      const ctx = canvasEl.getContext('2d');
      ctx.fillStyle = '#116834';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 360, 400, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px sans-serif';
      ctx.fillText(displayTs, 10, 385);
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BUKTI PENGELUARAN', 200, 190);
      ctx.font = '14px sans-serif';
      ctx.fillText(tx.docNo, 200, 220);
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    }

    currentPhotoMetadata = {
      image: dataUrl,
      capturedAt: ts,
      capturedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      capturedByName: currentUser.name || 'Mantri Bibitan',
      capturedByRole: roleStr,
      capturedByEstateId: currentUser.estateId,
      capturedByDivisionId: currentUser.divisionId
    };

    stopCamera();

    if (photoPreview) photoPreview.src = dataUrl;
    if (photoPreviewItem) photoPreviewItem.style.display = 'block';
    if (triggerBox) triggerBox.style.display = 'none';
  });

  modalRoot?.querySelector('#btn-cancel-dispatch')?.addEventListener('click', () => {
    stopCamera();
    closePhotoViewer();
    closeModal();
  });

  modalRoot?.querySelector('#form-mantri-dispatch')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = modalRoot.querySelector('button[type="submit"]');
    if (submitBtn?.disabled) return;

    const jumlahBatangDikeluarkan = parseInt(modalRoot.querySelector('#dsp-batang')?.value, 10);
    const jumlahMataEntresDikeluarkan = parseInt(modalRoot.querySelector('#dsp-mata')?.value, 10);
    const tanggalPengeluaran = modalRoot.querySelector('#dsp-date')?.dataset?.iso || modalRoot.querySelector('#dsp-date')?.value || todayISO();
    const vehiclePlate = modalRoot.querySelector('#dsp-vehicle')?.value || '';
    const notes = modalRoot.querySelector('#dsp-notes')?.value;

    if (isNaN(jumlahBatangDikeluarkan) || jumlahBatangDikeluarkan <= 0 || isNaN(jumlahMataEntresDikeluarkan) || jumlahMataEntresDikeluarkan <= 0) {
      toast('Jumlah batang dan mata dikeluarkan harus lebih dari 0', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      await processMantriDispatch(tx.id, {
        jumlahBatangDikeluarkan,
        jumlahMataEntresDikeluarkan,
        tanggalPengeluaran,
        vehiclePlate,
        photoEvidence: currentPhotoMetadata,
        notes
      }, currentUser);
      closeModal();
      toast(`Mata Entres ${tx.docNo} berhasil dikeluarkan dan diteruskan ke Kebun Pemohon.`, 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      toast('Gagal mencatat pengeluaran: ' + err.message, 'error');
    }
  });
}

// MODAL 5: Pengurus Pemohon Catat Kedatangan Awal
export function openPengurusArrivalModal(tx, currentUser, onSuccess) {
  const dspBatang = tx.jumlahBatangDikeluarkan || tx.jumlahBatang || 0;
  const dspMata = tx.jumlahMataEntresDikeluarkan || tx.jumlahMataEntres || (dspBatang * 2);

  openModal({
    title: 'Catat Kedatangan Mata Entres',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 4px 6px; font-size: 0.76rem; line-height: 1.35;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Kebun Pengirim:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.targetEstateName || tx.targetEstateId)}</span>
            <span style="color: #64748B;">Jenis Klon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.approval?.approvedKlon || tx.klon)}</span>
            <span style="color: #64748B;">Jlh Dikeluarkan:</span>
            <span style="font-weight: 700; color: #6D28D9;">${dspBatang.toLocaleString('id-ID')} Btg / ${dspMata.toLocaleString('id-ID')} Mata</span>
            ${tx.vehiclePlate || tx.pengeluaran?.vehiclePlate ? `
              <span style="color: #64748B;">Plat Kendaraan:</span>
              <span style="font-weight: 700; color: #1E293B;">${esc(tx.vehiclePlate || tx.pengeluaran?.vehiclePlate)}</span>
            ` : ''}
            <span style="color: #64748B;">Tgl Pengeluaran:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.tanggalPengeluaran || '-')}</span>
          </div>
        </div>

        <form id="form-pengurus-arrival" onsubmit="return false;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.02em; margin: 10px 0 8px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 4px;">
            Konfirmasi Kedatangan Awal
          </div>
          
          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Tanggal Tiba / Kedatangan <span style="color: #DC2626;">*</span></label>
            <input type="date" id="arr-date" value="${todayISO()}" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Catatan Pengurus</label>
            <textarea id="arr-notes" rows="2" placeholder="Catatan kondisi awal kedatangan..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" id="btn-cancel-arrival" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #475569; cursor: pointer;">
              Batal
            </button>
            <button type="submit" id="btn-submit-arrival" style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
              Terima &amp; Teruskan ke Askep
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-cancel-arrival')?.addEventListener('click', closeModal);
  modalRoot?.querySelector('#form-pengurus-arrival')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const initialReceivedDate = modalRoot.querySelector('#arr-date')?.value;
    const notes = modalRoot.querySelector('#arr-notes')?.value;

    try {
      await processPengurusArrival(tx.id, { initialReceivedDate, notes }, currentUser);
      closeModal();
      toast('Kedatangan mata entres berhasil dicatat dan diteruskan ke Askep.', 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast('Gagal mencatat kedatangan: ' + err.message, 'error');
    }
  });
}

// MODAL 6: Askep Pemohon Verifikasi & Tentukan Divisi Bibitan Tujuan (Jalur BIBITAN)
export function openAskepReceiptRoutingModal(tx, currentUser, onSuccess) {
  const requesterEstate = tx.sourceEstateId || currentUser.estateId;
  const nurseryDivs = getNurseryDivisionsByEstate(requesterEstate);
  const divOptions = nurseryDivs.map(d => `
    <option value="${esc(d.divisionId)}">${esc(d.divisionName || d.divisionId)}</option>
  `).join('');

  openModal({
    title: 'Verifikasi Askep & Penentuan Divisi Bibitan',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 4px 6px; font-size: 0.76rem; line-height: 1.35;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Klon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.approval?.approvedKlon || tx.klon)}</span>
            <span style="color: #64748B;">Jlh Dikirim:</span>
            <span style="font-weight: 700; color: #6D28D9;">${(tx.jumlahBatangDikeluarkan || 0).toLocaleString('id-ID')} Btg / ${(tx.jumlahMataEntresDikeluarkan || 0).toLocaleString('id-ID')} Mata</span>
            ${tx.initialArrival?.notes ? `
              <span style="color: #64748B;">Catatan Pengurus:</span>
              <span style="color: #334155; font-style: italic;">${esc(tx.initialArrival.notes)}</span>
            ` : ''}
          </div>
        </div>

        <form id="form-askep-receipt" onsubmit="return false;">
          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Divisi Bibitan Tujuan Okulasi <span style="color: #DC2626;">*</span></label>
            <select id="rcp-target-div" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required>
              ${divOptions || '<option value="DIV-01">Divisi Bibitan Utama</option>'}
            </select>
            <div style="font-size: 0.68rem; color: #64748B; margin-top: 3px;">*Penerimaan Mata Entres khusus diproses melalui Jalur BIBITAN.</div>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Instruksi untuk Asisten Bibitan</label>
            <textarea id="rcp-askep-notes" rows="2" placeholder="Instruksi alokasi okulasi / penyiapan batang bawah..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" id="btn-return-receipt-pgs" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #DC2626; cursor: pointer;">
              Kembalikan ke Pengurus
            </button>
            <button type="submit" id="btn-submit-askep-receipt" style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
              Verifikasi &amp; Teruskan ke Asisten Bibitan
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-return-receipt-pgs')?.addEventListener('click', () => {
    closeModal();
    openAskepReceiptReturnModal(tx, currentUser, onSuccess);
  });

  modalRoot?.querySelector('#form-askep-receipt')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetNextDivisionId = modalRoot.querySelector('#rcp-target-div')?.value;
    const notes = modalRoot.querySelector('#rcp-askep-notes')?.value;
    if (!targetNextDivisionId) {
      toast('Divisi Bibitan Tujuan wajib dipilih', 'error');
      return;
    }
    try {
      await processAskepReceiptRouting(tx.id, { targetNextDivisionId, notes }, currentUser);
      closeModal();
      toast('Penerimaan Mata Entres berhasil diverifikasi ke Asisten Bibitan.', 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast('Gagal memverifikasi: ' + err.message, 'error');
    }
  });
}

export function openAskepReceiptReturnModal(tx, currentUser, onSuccess) {
  openModal({
    title: 'Kembalikan Dokumen ke Pengurus',
    body: `
      <div style="font-size: 0.84rem;">
        <p style="color: #475569; margin: 0 0 10px 0;">Jelaskan alasan pengembalian ke Pengurus Pemohon:</p>
        <textarea id="inp-askep-rcp-return-reason" rows="3" placeholder="Contoh: Dokumen kedatangan perlu dikoreksi..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required></textarea>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; justify-content: flex-end; width: 100%;">
        <button type="button" id="btn-cancel-return-rcp-pgs" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-weight: 600;">Batal</button>
        <button type="button" id="btn-confirm-return-rcp-pgs" style="padding: 8px 16px; background: #DC2626; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #FFFFFF;">Kembalikan</button>
      </div>
    `
  });
  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-cancel-return-rcp-pgs')?.addEventListener('click', closeModal);
  modalRoot?.querySelector('#btn-confirm-return-rcp-pgs')?.addEventListener('click', async () => {
    const reason = modalRoot.querySelector('#inp-askep-rcp-return-reason')?.value || '';
    if (!reason.trim()) {
      toast('Alasan pengembalian wajib diisi', 'error');
      return;
    }
    try {
      await processAskepReceiptReturn(tx.id, reason, currentUser);
      closeModal();
      toast('Dokumen telah dikembalikan ke Pengurus.', 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

// MODAL 7: Asisten Bibitan Pemohon Verifikasi Penerimaan Mata Entres
export function openAsistenBibitanReceiptModal(tx, currentUser, onSuccess) {
  openModal({
    title: 'Verifikasi Asisten Bibitan',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 4px 6px; font-size: 0.76rem; line-height: 1.35;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Kebun Pengirim:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.targetEstateName || tx.targetEstateId)}</span>
            <span style="color: #64748B;">Kebun Pemohon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.sourceEstateName || tx.sourceEstateId)}</span>
            <span style="color: #64748B;">Jenis Klon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.approval?.approvedKlon || tx.klon)}</span>
            <span style="color: #64748B;">Jumlah Dikirim:</span>
            <span style="font-weight: 700; color: #6D28D9;">${(tx.jumlahBatangDikeluarkan || tx.jumlahBatang || 0).toLocaleString('id-ID')} Batang / ${(tx.jumlahMataEntresDikeluarkan || tx.jumlahMataEntres || ((tx.jumlahBatangDikeluarkan || tx.jumlahBatang || 0) * 2)).toLocaleString('id-ID')} Mata</span>
            ${tx.askepReceiptVerification?.notes ? `
              <span style="color: #64748B;">Catatan Askep:</span>
              <span style="color: #334155; font-style: italic;">${esc(tx.askepReceiptVerification.notes)}</span>
            ` : ''}
          </div>
        </div>

        <form id="form-asb-receipt" onsubmit="return false;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Catatan Verifikasi</label>
            <textarea id="asb-receipt-notes" rows="2" placeholder="Catatan verifikasi penerimaan mata entres..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" id="btn-return-receipt-askep" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: #DC2626; cursor: pointer;">
              Kembalikan ke Askep
            </button>
            <button type="submit" id="btn-submit-asb-receipt" style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
              Verifikasi &amp; Teruskan ke Mantri
            </button>
          </div>
        </form>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-return-receipt-askep')?.addEventListener('click', () => {
    closeModal();
    openAsistenBibitanReceiptReturnModal(tx, currentUser, onSuccess);
  });

  modalRoot?.querySelector('#form-asb-receipt')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = modalRoot.querySelector('#btn-submit-asb-receipt');
    if (submitBtn?.disabled) return;
    submitBtn.disabled = true;

    const notes = modalRoot.querySelector('#asb-receipt-notes')?.value;

    try {
      await processAsistenBibitanReceiptVerification(tx.id, { notes }, currentUser);
      closeModal();
      toast('Penerimaan mata entres berhasil diverifikasi dan diteruskan ke Mantri Bibitan.', 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      toast('Gagal memverifikasi: ' + err.message, 'error');
    }
  });
}

export function openAsistenBibitanReceiptReturnModal(tx, currentUser, onSuccess) {
  openModal({
    title: 'Kembalikan Dokumen ke Askep',
    body: `
      <div style="font-size: 0.84rem;">
        <p style="color: #475569; margin: 0 0 10px 0;">Jelaskan alasan pengembalian ke Askep Pemohon:</p>
        <textarea id="inp-asb-rcp-return-reason" rows="3" placeholder="Contoh: Batang bawah belum siap atau perlu revisi..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" required></textarea>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; justify-content: flex-end; width: 100%;">
        <button type="button" id="btn-cancel-return-rcp-askep" style="padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-weight: 600;">Batal</button>
        <button type="button" id="btn-confirm-return-rcp-askep" style="padding: 8px 16px; background: #DC2626; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #FFFFFF;">Kembalikan</button>
      </div>
    `
  });
  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-cancel-return-rcp-askep')?.addEventListener('click', closeModal);
  modalRoot?.querySelector('#btn-confirm-return-rcp-askep')?.addEventListener('click', async () => {
    const reason = modalRoot.querySelector('#inp-asb-rcp-return-reason')?.value || '';
    if (!reason.trim()) {
      toast('Alasan pengembalian wajib diisi', 'error');
      return;
    }
    try {
      await processAsistenBibitanReceiptReturn(tx.id, reason, currentUser);
      closeModal();
      toast('Dokumen telah dikembalikan ke Askep.', 'info');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

// MODAL 8: Mantri Bibitan Pemohon Finalisasi Penerimaan Fisik
export function openMantriBibitanReceiptModal(tx, currentUser, onSuccess) {
  const dspBatang = tx.jumlahBatangDikeluarkan || tx.jumlahBatang || 0;
  const dspMata = tx.jumlahMataEntresDikeluarkan || tx.jumlahMataEntres || (dspBatang * 2);
  let currentPhotoMetadata = null;

  openModal({
    title: 'Pemeriksaan Fisik & Finalisasi Penerimaan',
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 4px 6px; font-size: 0.76rem; line-height: 1.35;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Kebun Pengirim:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.targetEstateName || tx.targetEstateId)}</span>
            <span style="color: #64748B;">Jenis Klon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.approval?.approvedKlon || tx.klon)}</span>
            <span style="color: #64748B;">Jlh Dikeluarkan:</span>
            <span style="font-weight: 700; color: #6D28D9;">${dspBatang.toLocaleString('id-ID')} Btg / ${dspMata.toLocaleString('id-ID')} Mata</span>
            ${tx.vehiclePlate || tx.pengeluaran?.vehiclePlate ? `
              <span style="color: #64748B;">Plat Kendaraan:</span>
              <span style="font-weight: 700; color: #1E293B;">${esc(tx.vehiclePlate || tx.pengeluaran?.vehiclePlate)}</span>
            ` : ''}
          </div>
        </div>

        <form id="form-mantri-final-receipt" onsubmit="return false;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.02em; margin: 10px 0 8px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 4px;">
            Realisasi Fisik yang Diterima
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div>
              <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Batang Diterima <span style="color: #DC2626;">*</span>
              </label>
              <input type="number" id="rcp-batang" value="${dspBatang}" min="0" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 700;" required />
            </div>
            <div>
              <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Mata Diterima <span style="color: #DC2626;">*</span>
              </label>
              <input type="number" id="rcp-mata" value="${dspMata}" min="0" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 700;" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div>
              <label style="display: block; font-weight: 700; color: #64748B; margin-bottom: 4px; font-size: 0.74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Batang Reject
              </label>
              <input type="number" id="rcp-reject-batang" value="0" min="0" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" />
            </div>
            <div>
              <label style="display: block; font-weight: 700; color: #64748B; margin-bottom: 4px; font-size: 0.74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Mata Reject
              </label>
              <input type="number" id="rcp-reject-mata" value="0" min="0" style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" />
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">
              Tanggal Penerimaan <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="text" 
              id="rcp-date" 
              value="${formatDate(todayISO()) || todayISO()}" 
              data-iso="${todayISO()}"
              readonly 
              style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; background: #F8FAFC; color: #334155; font-weight: 600; cursor: not-allowed;" 
            />
          </div>

          <!-- SECTION FOTO BUKTI PENERIMAAN (Harmonized with Mantri Pengirim) -->
          <div style="margin-bottom: 12px; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; background: #FFFFFF;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Foto Bukti Penerimaan Fisik
            </label>
            <p style="font-size: 0.72rem; color: #64748B; margin: 0 0 10px 0; line-height: 1.35;">
              Ambil foto dokumentasi fisik mata entres saat penerimaan. Ketuk thumbnail foto untuk memperbesar.
            </p>
            
            <div id="rcp-photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
              <div id="rcp-photo-preview-item" style="display: none; position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 1px 3px rgba(0,0,0,0.08); cursor: pointer;">
                <img id="rcp-photo-preview" src="" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" alt="Foto Penerimaan" title="Klik untuk memperbesar foto" />
                <button type="button" id="btn-rcp-retake" title="Ambil Ulang Foto" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #FFFFFF; padding: 0;">
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="#FFFFFF" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            <div id="rcp-camera-trigger-box" style="display: block;">
              <button 
                type="button" 
                id="btn-rcp-open-camera" 
                style="width: 100%; padding: 10px; background: #F0FDF4; border: 1px dashed #16A34A; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #15803D; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Ambil Foto Kamera
              </button>
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.74rem;">Catatan Penerimaan</label>
            <textarea id="rcp-notes" rows="2" placeholder="Catatan kesegaran kayu entres saat diterima..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem;"></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; box-sizing: border-box; margin-top: 14px;">
            <button type="button" id="btn-cancel-final-receipt" style="width: 100%; padding: 9px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #475569; cursor: pointer; text-align: center; box-sizing: border-box;">
              Batal
            </button>
            <button type="submit" id="btn-submit-final-receipt" style="width: 100%; padding: 9px 12px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer; text-align: center; box-sizing: border-box;">
              Simpan &amp; Terima
            </button>
          </div>
        </form>

        <!-- POPUP / LIGHTBOX PHOTO VIEWER -->
        <div id="modal-rcp-photo-viewer-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10005; backdrop-filter: blur(4px);"></div>
        <div id="modal-rcp-photo-viewer" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 92vw; max-height: 85vh; z-index: 10006; flex-direction: column; align-items: center; justify-content: center;">
          <button id="btn-close-rcp-photo-viewer" type="button" aria-label="Tutup" style="position: absolute; top: -44px; right: 0; background: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.5); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <img id="img-rcp-photo-viewer-target" src="" alt="Foto Bukti Penerimaan" style="max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" />
        </div>

        <!-- CAMERA OVERLAY -->
        <div id="rcp-camera-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #000; z-index: 10000; flex-direction: column;">
          <header style="display: flex; justify-content: space-between; align-items: center; padding: 16px; position: absolute; top: 0; left: 0; right: 0; z-index: 10001;">
            <button id="btn-close-rcp-camera" type="button" style="background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ffffff" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>
          <main style="flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
            <video id="rcp-camera-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
            <canvas id="rcp-camera-canvas" style="display: none;"></canvas>
            <div id="rcp-camera-error" style="display: none; color: white; text-align: center; padding: 20px;">
              <p style="font-weight: 700; margin-bottom: 6px;">Kamera tidak tersedia atau akses ditolak.</p>
              <p style="font-size: 0.8rem; color: #aaa;">Ketuk tombol rana untuk foto simulasi.</p>
            </div>
          </main>
          <footer style="padding: 24px; display: flex; justify-content: center; align-items: center; position: absolute; bottom: 0; left: 0; right: 0; z-index: 10001; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
            <button id="btn-rcp-shutter" type="button" style="width: 70px; height: 70px; border-radius: 50%; background: transparent; border: 4px solid #ffffff; display: flex; justify-content: center; align-items: center; cursor: pointer;">
              <div style="width: 54px; height: 54px; background: #ffffff; border-radius: 50%;"></div>
            </button>
          </footer>
        </div>

      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  const cameraOverlay = modalRoot?.querySelector('#rcp-camera-overlay');
  const videoEl = modalRoot?.querySelector('#rcp-camera-video');
  const canvasEl = modalRoot?.querySelector('#rcp-camera-canvas');
  const errorEl = modalRoot?.querySelector('#rcp-camera-error');
  const btnCloseCamera = modalRoot?.querySelector('#btn-close-rcp-camera');
  const btnShutter = modalRoot?.querySelector('#btn-rcp-shutter');
  const btnOpenCam = modalRoot?.querySelector('#btn-rcp-open-camera');
  const btnRetake = modalRoot?.querySelector('#btn-rcp-retake');
  const triggerBox = modalRoot?.querySelector('#rcp-camera-trigger-box');
  const photoPreviewItem = modalRoot?.querySelector('#rcp-photo-preview-item');
  const photoPreview = modalRoot?.querySelector('#rcp-photo-preview');

  const photoViewerOverlay = modalRoot?.querySelector('#modal-rcp-photo-viewer-overlay');
  const photoViewerModal = modalRoot?.querySelector('#modal-rcp-photo-viewer');
  const photoViewerImg = modalRoot?.querySelector('#img-rcp-photo-viewer-target');
  const btnClosePhotoViewer = modalRoot?.querySelector('#btn-close-rcp-photo-viewer');

  function openPhotoViewer(src) {
    if (!photoViewerOverlay || !photoViewerModal || !photoViewerImg) return;
    photoViewerImg.src = src;
    photoViewerOverlay.style.display = 'block';
    photoViewerModal.style.display = 'flex';
  }

  function closePhotoViewer() {
    if (!photoViewerOverlay || !photoViewerModal) return;
    photoViewerOverlay.style.display = 'none';
    photoViewerModal.style.display = 'none';
  }

  photoPreview?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (photoPreview.src) openPhotoViewer(photoPreview.src);
  });

  photoViewerOverlay?.addEventListener('click', closePhotoViewer);
  btnClosePhotoViewer?.addEventListener('click', closePhotoViewer);

  let currentStream = null;
  let isCameraActive = false;

  async function openCamera() {
    if (!cameraOverlay) return;
    cameraOverlay.style.display = 'flex';
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoEl.srcObject = currentStream;
        await videoEl.play();
        isCameraActive = true;
        errorEl.style.display = 'none';
        videoEl.style.display = 'block';
      } else {
        throw new Error('Not supported');
      }
    } catch (e) {
      isCameraActive = false;
      errorEl.style.display = 'block';
      videoEl.style.display = 'none';
    }
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    if (cameraOverlay) {
      cameraOverlay.style.display = 'none';
    }
  }

  btnCloseCamera?.addEventListener('click', stopCamera);
  btnOpenCam?.addEventListener('click', openCamera);
  btnRetake?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCamera();
  });

  btnShutter?.addEventListener('click', () => {
    let dataUrl = '';
    const ts = new Date().toISOString();
    const displayTs = new Date().toLocaleString('id-ID');
    const roleStr = typeof normalizeRole === 'function' ? normalizeRole(currentUser.role || currentUser.rawRole) : (currentUser.role || 'MANTRI_TANAMAN');

    if (isCameraActive && videoEl && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0);
      
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, canvasEl.height - 40, canvasEl.width, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(`${currentUser.name || 'Mantri'} • ${displayTs}`, 10, canvasEl.height - 15);
      
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    } else {
      canvasEl.width = 400;
      canvasEl.height = 400;
      const ctx = canvasEl.getContext('2d');
      ctx.fillStyle = '#116834';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 360, 400, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px sans-serif';
      ctx.fillText(displayTs, 10, 385);
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BUKTI PENERIMAAN', 200, 190);
      ctx.font = '14px sans-serif';
      ctx.fillText(tx.docNo, 200, 220);
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    }

    currentPhotoMetadata = {
      image: dataUrl,
      capturedAt: ts,
      capturedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      capturedByName: currentUser.name || 'Mantri Bibitan',
      capturedByRole: roleStr,
      capturedByEstateId: currentUser.estateId,
      capturedByDivisionId: currentUser.divisionId
    };

    stopCamera();

    if (photoPreview) photoPreview.src = dataUrl;
    if (photoPreviewItem) photoPreviewItem.style.display = 'block';
    if (triggerBox) triggerBox.style.display = 'none';
  });

  modalRoot?.querySelector('#btn-cancel-final-receipt')?.addEventListener('click', () => {
    stopCamera();
    closePhotoViewer();
    closeModal();
  });

  modalRoot?.querySelector('#form-mantri-final-receipt')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = modalRoot.querySelector('#btn-submit-final-receipt');
    if (submitBtn?.disabled) return;

    const jumlahBatangDiterima = parseInt(modalRoot.querySelector('#rcp-batang')?.value, 10);
    const jumlahMataEntresDiterima = parseInt(modalRoot.querySelector('#rcp-mata')?.value, 10);
    const rejectBatang = parseInt(modalRoot.querySelector('#rcp-reject-batang')?.value || 0, 10);
    const rejectMata = parseInt(modalRoot.querySelector('#rcp-reject-mata')?.value || 0, 10);
    const tanggalPenerimaan = modalRoot.querySelector('#rcp-date')?.dataset?.iso || modalRoot.querySelector('#rcp-date')?.value || todayISO();
    const notes = modalRoot.querySelector('#rcp-notes')?.value;

    if (isNaN(jumlahBatangDiterima) || jumlahBatangDiterima < 0 || isNaN(jumlahMataEntresDiterima) || jumlahMataEntresDiterima < 0) {
      toast('Jumlah diterima harus berupa angka valid dan tidak boleh negatif', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      await processMantriBibitanFinalReceipt(tx.id, {
        jumlahBatangDiterima,
        jumlahMataEntresDiterima,
        rejectBatang,
        rejectMata,
        tanggalPenerimaan,
        photoEvidence: currentPhotoMetadata,
        notes
      }, currentUser);
      closeModal();
      toast(`Penerimaan Mata Entres ${tx.docNo} selesai dan diverifikasi fisik.`, 'success');
      if (typeof onSuccess === 'function') onSuccess();
      else renderRequestMataEntresLanding();
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      toast('Gagal menyelesaikan penerimaan: ' + err.message, 'error');
    }
  });
}

// MODAL DETAIL READ-ONLY
export function openMataEntresDetailModal(tx) {
  const photo = tx.photoEvidence || tx.pengeluaran?.photoEvidence;
  const vehicle = tx.vehiclePlate || tx.pengeluaran?.vehiclePlate;
  const receiptPhoto = tx.receiptPhotoEvidence || tx.penerimaan?.photoEvidence;

  openModal({
    title: `Detail Dokumen: ${esc(tx.docNo)}`,
    body: `
      <div style="font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <!-- SECTION 1: PERMINTAAN AWAL -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
          <div style="font-size: 0.72rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">1. Permintaan Awal (Pengurus Pemohon)</div>
          <div style="display: grid; grid-template-columns: 45% 55%; gap: 4px; font-size: 0.78rem;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo)}</span>
            <span style="color: #64748B;">Kebun Peminta:</span>
            <span style="font-weight: 600;">${esc(tx.sourceEstateName || tx.estateId)}</span>
            <span style="color: #64748B;">Kebun Tujuan:</span>
            <span style="font-weight: 600;">${esc(tx.targetEstateName || tx.targetEstateId)}</span>
            ${tx.allocationCode ? `
              <span style="color: #64748B;">Kode Alokasi:</span>
              <span style="font-weight: 700;">${esc(tx.allocationCode)}</span>
            ` : ''}
            <span style="color: #64748B;">Klon Diminta:</span>
            <span style="font-weight: 600;">${esc(tx.klon)}</span>
            <span style="color: #64748B;">Permintaan Batang:</span>
            <span style="font-weight: 700;">${(tx.jumlahBatang || 0).toLocaleString('id-ID')} Batang</span>
            <span style="color: #64748B;">Tgl Dibutuhkan:</span>
            <span>${esc(tx.requiredDate || '-')}</span>
          </div>
        </div>

        <!-- SECTION 2: PERSETUJUAN & PENGELUARAN -->
        ${tx.jumlahBatangDikeluarkan !== null && tx.jumlahBatangDikeluarkan !== undefined ? `
          <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #6D28D9; text-transform: uppercase; margin-bottom: 6px;">2. Realisasi Pengeluaran (Kebun Pengirim)</div>
            <div style="display: grid; grid-template-columns: 45% 55%; gap: 4px; font-size: 0.78rem;">
              <span style="color: #6B7280;">Batang Dikeluarkan:</span>
              <span style="font-weight: 700; color: #6D28D9;">${(tx.jumlahBatangDikeluarkan || 0).toLocaleString('id-ID')} Batang</span>
              <span style="color: #6B7280;">Mata Dikeluarkan:</span>
              <span style="font-weight: 700; color: #6D28D9;">${(tx.jumlahMataEntresDikeluarkan || 0).toLocaleString('id-ID')} Mata</span>
              ${vehicle ? `
                <span style="color: #6B7280;">Plat Kendaraan:</span>
                <span style="font-weight: 700; color: #1E293B;">${esc(vehicle)}</span>
              ` : ''}
              <span style="color: #6B7280;">Tgl Pengeluaran:</span>
              <span>${esc(tx.tanggalPengeluaran || '-')}</span>
            </div>
            ${photo && photo.image ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E9D5FF;">
                <div style="font-size: 0.70rem; font-weight: 700; color: #6D28D9; margin-bottom: 4px;">Foto Bukti Pengeluaran:</div>
                <img src="${photo.image}" style="max-width: 100%; max-height: 150px; border-radius: 6px; border: 1px solid #DDD6FE; object-fit: contain;" />
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- SECTION 3: PENERIMAAN FISIK -->
        ${tx.jumlahBatangDiterima !== null && tx.jumlahBatangDiterima !== undefined ? `
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #047857; text-transform: uppercase; margin-bottom: 6px;">3. Realisasi Penerimaan (Kebun Pemohon)</div>
            <div style="display: grid; grid-template-columns: 45% 55%; gap: 4px; font-size: 0.78rem;">
              <span style="color: #6B7280;">Batang Diterima:</span>
              <span style="font-weight: 700; color: #047857;">${(tx.jumlahBatangDiterima || 0).toLocaleString('id-ID')} Batang</span>
              <span style="color: #6B7280;">Mata Diterima:</span>
              <span style="font-weight: 700; color: #047857;">${(tx.jumlahMataEntresDiterima || 0).toLocaleString('id-ID')} Mata</span>
              ${tx.rejectBatang ? `
                <span style="color: #6B7280;">Batang Reject:</span>
                <span style="font-weight: 700; color: #DC2626;">${tx.rejectBatang} Batang</span>
              ` : ''}
              <span style="color: #6B7280;">Tgl Penerimaan:</span>
              <span>${esc(tx.tanggalPenerimaan || '-')}</span>
            </div>
            ${receiptPhoto && receiptPhoto.image ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #A7F3D0;">
                <div style="font-size: 0.70rem; font-weight: 700; color: #047857; margin-bottom: 4px;">Foto Bukti Penerimaan:</div>
                <img src="${receiptPhoto.image}" style="max-width: 100%; max-height: 150px; border-radius: 6px; border: 1px solid #A7F3D0; object-fit: contain;" />
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `,
    footer: `
      <div style="display: flex; justify-content: flex-end; width: 100%;">
        <button type="button" id="btn-close-detail" style="padding: 8px 18px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
          Tutup
        </button>
      </div>
    `
  });

  const modalRoot = document.getElementById('modal-root');
  modalRoot?.querySelector('#btn-close-detail')?.addEventListener('click', closeModal);
}

// ============================================================================
// MAIN LANDING PAGE RENDERER
// ============================================================================

export async function renderRequestMataEntresLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get();
  const currentUser = getCurrentUserContext() || user || { role: 'PENGURUS', estateId: 'EST-TBS' };
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);

  if (!activeTab) {
    if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA' || userRole === 'ASISTEN_BIBITAN' || userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
      activeTab = 'INCOMING_REQUESTS';
    } else {
      activeTab = 'MY_REQUESTS';
    }
  }

  let allRequests = [];
  try {
    allRequests = await requestRepository.list();
  } catch (err) {
    allRequests = storage.get('requests_transactions', []);
  }
  if (!Array.isArray(allRequests) || allRequests.length === 0) {
    allRequests = storage.get('requests_transactions', []);
  }

  const myRequests = filterMyMataEntresRequests(allRequests, currentUser);
  const incomingRequests = filterIncomingMataEntresRequests(allRequests, currentUser);

  const actionableIncomingCount = getActionableMataEntresCount(incomingRequests, currentUser);
  const actionableMyCount = myRequests.filter(tx => canPerformRequesterReceipt(tx, currentUser)).length;

  const currentDataset = activeTab === 'MY_REQUESTS' ? myRequests : incomingRequests;
  const filteredList = filterMataEntresByStatus(currentDataset, activeStatusFilter);

  // Status Filter Tabs
  const statusTabs = ['SEMUA', 'DIAJUKAN', 'DIPROSES', 'SELESAI', 'DITOLAK'];
  const statusFilterTabsHtml = statusTabs.map(st => {
    const isAct = activeStatusFilter === st;
    const label = st.charAt(0) + st.slice(1).toLowerCase();
    const count = filterMataEntresByStatus(currentDataset, st).length;
    return `
      <button 
        class="tab-filter-btn" 
        data-filter="${st}"
        style="padding: 6px 12px; border-radius: 20px; font-size: 0.74rem; font-weight: 700; border: none; cursor: pointer; white-space: nowrap; transition: all 0.15s ease; ${isAct ? 'background: #116834; color: #FFFFFF;' : 'background: #E2E8F0; color: #475569;'}"
      >
        ${label} (${count})
      </button>
    `;
  }).join('');

  // Cards Markup
  const cardsHtml = filteredList.length === 0 ? `
    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 16px; text-align: center; color: #64748B; margin-top: 10px;">
      <svg viewBox="0 0 24 24" width="36" height="36" stroke="#94A3B8" stroke-width="1.8" fill="none" style="margin-bottom: 8px;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <div style="font-weight: 700; font-size: 0.90rem; color: #334155; margin-bottom: 4px;">Tidak ada transaksi ditemukan</div>
      <div style="font-size: 0.75rem;">Belum ada dokumen Permintaan Mata Entres pada tab ini.</div>
    </div>
  ` : filteredList.map((tx, idx) => {
    const badge = MATA_ENTRES_STATUS_BADGES[tx.status] || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    const label = MATA_ENTRES_STATUS_LABELS[tx.status] || tx.status;
    const isExpanded = expandedCardIndex === idx;

    const sourceName = esc(tx.sourceEstateName || tx.estateId || 'Tanah Besih');
    const targetName = esc(tx.targetEstateName || tx.targetEstateId || 'Aek Pamingke');
    const qtyFormatted = (tx.jumlahBatang || 0).toLocaleString('id-ID');
    const formattedRequiredDate = formatDate(tx.requiredDate);
    const formattedRequestDate = formatDate(tx.requestDate || tx.tanggal || tx.createdAt);

    // Contextual Action Determination
    let actionBtnHtml = '';
    const btnActionStyle = 'padding: 6px 14px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.74rem; font-weight: 700; color: #FFFFFF; cursor: pointer; white-space: nowrap; box-shadow: 0 1px 2px rgba(17,104,52,0.15); transition: background 0.15s ease;';

    if (canPerformPengurusReceiverReview(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-review" data-id="${tx.id}" style="${btnActionStyle}">Review Permintaan</button>`;
    } else if (canPerformAskepVerification(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-askep" data-id="${tx.id}" style="${btnActionStyle}">Verifikasi Askep</button>`;
    } else if (canPerformAsistenBibitanVerification(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-asb" data-id="${tx.id}" style="${btnActionStyle}">Verifikasi Kesiapan</button>`;
    } else if (canPerformMantriDispatch(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-dispatch" data-id="${tx.id}" style="${btnActionStyle}">Catat Pengeluaran</button>`;
    } else if (canPerformPengurusArrival(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-arrival" data-id="${tx.id}" style="${btnActionStyle}">Terima &amp; Proses</button>`;
    } else if (canPerformAskepReceiptRouting(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-rcp-askep" data-id="${tx.id}" style="${btnActionStyle}">Proses Verifikasi</button>`;
    } else if (canPerformAsistenBibitanReceiptVerification(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-rcp-asb" data-id="${tx.id}" style="${btnActionStyle}">Verifikasi Bibitan</button>`;
    } else if (canPerformMantriBibitanFinalReceipt(tx, currentUser)) {
      actionBtnHtml = `<button class="btn-action-rcp-mantri" data-id="${tx.id}" style="${btnActionStyle}">Lanjut Penerimaan</button>`;
    }

    return `
      <div class="card-mata-entres" data-index="${idx}" style="background: #FFFFFF; border: 1px solid ${isExpanded ? '#116834' : '#E2E8F0'}; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: all 0.15s ease;">
        
        <!-- ROW 1: NO DOKUMEN & BADGE STATUS -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px;">
          <div style="font-size: 0.88rem; font-weight: 800; color: #116834; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${esc(tx.docNo)}
          </div>
          <span style="display: inline-block; font-size: 0.65rem; font-weight: 700; background: ${badge.bg}; color: ${badge.text}; border: 1px solid ${badge.border}; padding: 3px 8px; border-radius: 5px; text-transform: uppercase; flex-shrink: 0; white-space: nowrap;">
            ${label}
          </span>
        </div>

        <!-- ROW 2: KEBUN PEMOHON → KEBUN PENGIRIM -->
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 0.78rem;">
          <span style="font-weight: 700; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%;">${sourceName}</span>
          <span style="color: #94A3B8; font-weight: 700; flex-shrink: 0;">→</span>
          <span style="font-weight: 700; color: #116834; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%;">${targetName}</span>
        </div>

        <!-- ROW 3: KLON • KODE ALOKASI -->
        <div style="font-size: 0.75rem; color: #475569; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span style="font-weight: 700; color: #116834;">${esc(tx.klon || '-')}</span>
          ${tx.allocationCode ? `
            <span style="color: #CBD5E1;">•</span>
            <span style="font-weight: 600; color: #64748B;">Alokasi: <strong style="color: #334155;">${esc(tx.allocationCode)}</strong></span>
          ` : ''}
        </div>

        <!-- ROW 4: BANYAKNYA & TANGGAL -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: ${isExpanded ? '0' : '4px'};">
          <span style="font-weight: 800; color: #116834; font-size: 0.82rem;">${qtyFormatted} Btg</span>
          <span style="color: #64748B; font-size: 0.72rem;">Dibutuhkan: ${esc(formattedRequiredDate || '-')}</span>
        </div>

        <!-- EXPANDED DETAILS -->
        ${isExpanded ? `
          <div style="border-top: 1px dashed #E2E8F0; padding-top: 10px; margin-top: 8px; font-size: 0.75rem;">
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 6px; font-size: 0.75rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
              <span style="color: #64748B;">Tgl Pengajuan</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formattedRequestDate)}</span>

              ${tx.approval ? `
                <span style="color: #15803D; font-weight: 700;">Disetujui Pengurus</span>
                <span style="font-weight: 800; color: #15803D; text-align: right;">${(tx.approval.approvedBatang || 0).toLocaleString('id-ID')} Btg (${(tx.approval.approvedMataEntres || (tx.approval.approvedBatang * 2) || 0).toLocaleString('id-ID')} Mata)</span>
                
                ${tx.approval.approvedKlon ? `
                  <span style="color: #15803D; font-weight: 700;">Klon Disetujui</span>
                  <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(tx.approval.approvedKlon)}</span>
                ` : ''}

                ${tx.approval.estimatedDeliveryDate ? `
                  <span style="color: #15803D; font-weight: 700;">Estimasi Kirim</span>
                  <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(formatDate(tx.approval.estimatedDeliveryDate))}</span>
                ` : ''}
              ` : ''}

              ${tx.sourceDivisionId ? `
                <span style="color: #64748B;">Divisi Bibitan Sumber</span>
                <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(resolveNurseryDivision(tx.sourceDivisionId, tx.targetEstateId)?.divisionName || tx.sourceDivisionId)}</span>
              ` : ''}

              ${tx.targetDivisionId ? `
                <span style="color: #64748B;">Divisi Bibitan Tujuan</span>
                <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(resolveNurseryDivision(tx.targetDivisionId, tx.sourceEstateId)?.divisionName || tx.targetDivisionId)}</span>
              ` : ''}

              ${tx.jumlahBatangDikeluarkan !== null && tx.jumlahBatangDikeluarkan !== undefined ? `
                <span style="color: #6D28D9; font-weight: 700;">Realisasi Keluar</span>
                <span style="font-weight: 800; color: #6D28D9; text-align: right;">${tx.jumlahBatangDikeluarkan} Btg / ${tx.jumlahMataEntresDikeluarkan || (tx.jumlahBatangDikeluarkan * 2)} Mata</span>
                <span style="color: #6D28D9; font-weight: 700;">Tgl Pengeluaran</span>
                <span style="font-weight: 700; color: #6D28D9; text-align: right;">${esc(formatDate(tx.tanggalPengeluaran || '-'))}</span>
              ` : ''}

              ${tx.jumlahBatangDiterima !== null && tx.jumlahBatangDiterima !== undefined ? `
                <span style="color: #047857; font-weight: 700;">Realisasi Diterima</span>
                <span style="font-weight: 800; color: #047857; text-align: right;">${tx.jumlahBatangDiterima} Btg / ${tx.jumlahMataEntresDiterima || (tx.jumlahBatangDiterima * 2)} Mata</span>
                ${tx.rejectBatang ? `
                  <span style="color: #DC2626; font-weight: 700;">Afkir / Reject</span>
                  <span style="font-weight: 700; color: #DC2626; text-align: right;">${tx.rejectBatang} Btg</span>
                ` : ''}
                <span style="color: #047857; font-weight: 700;">Tgl Penerimaan</span>
                <span style="font-weight: 700; color: #047857; text-align: right;">${esc(formatDate(tx.tanggalPenerimaan || '-'))}</span>
              ` : ''}

              ${tx.catatan ? `
                <span style="color: #64748B;">Catatan</span>
                <span style="font-style: italic; color: #334155; text-align: right;">${esc(tx.catatan)}</span>
              ` : ''}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 4px;">
              <button class="btn-view-detail" data-id="${tx.id}" type="button" style="background: transparent; border: none; color: #116834; font-size: 0.74rem; font-weight: 700; cursor: pointer; padding: 4px 0;">
                Lihat Detail Lengkap ↗
              </button>
              <button class="btn-toggle-expand" data-index="${idx}" type="button" style="background: transparent; border: none; color: #64748B; font-size: 0.74rem; font-weight: 600; cursor: pointer; padding: 4px 6px;">
                Tutup Detail ▲
              </button>
            </div>
          </div>
        ` : ''}

        <!-- CARD FOOTER ACTIONS (when not expanded or action buttons present) -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: ${isExpanded ? '6px' : '8px'}; padding-top: 6px; border-top: 1px dashed #F1F5F9;">
          ${!isExpanded ? `
            <button class="btn-toggle-expand" data-index="${idx}" style="background: transparent; border: 1px solid #CBD5E1; color: #334155; font-size: 0.72rem; font-weight: 600; padding: 4px 10px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              Detail ▼
            </button>
          ` : '<div></div>'}
          <div style="display: flex; gap: 6px; align-items: center;">
            ${actionBtnHtml}
          </div>
        </div>

      </div>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page request-mata-entres-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; position: relative;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-back-landing" type="button" aria-label="Kembali" style="padding: 6px; background: transparent; border: none; cursor: pointer; color: #116834; display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0; letter-spacing: -0.01em;">Permintaan Mata Entres</h1>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="btn-sync-landing" type="button" aria-label="Refresh" style="padding: 6px; background: transparent; border: none; cursor: pointer; color: #116834; display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- MAIN BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 12px 16px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box;">
        
        <!-- DUAL TABS SELECTOR (Permintaan Saya vs Permintaan Masuk) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #F1F5F9; padding: 4px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #E2E8F0;">
          <button 
            id="tab-my-requests" 
            style="position: relative; padding: 8px 10px; border: none; border-radius: 6px; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease; ${activeTab === 'MY_REQUESTS' ? 'background: #FFFFFF; color: #116834; box-shadow: 0 1px 3px rgba(0,0,0,0.06);' : 'background: transparent; color: #64748B;'}"
          >
            Permintaan Saya (${myRequests.length})
            ${actionableMyCount > 0 ? `
              <span style="display: inline-block; width: 7px; height: 7px; background: #DC2626; border-radius: 50%; position: absolute; top: 6px; right: 8px;"></span>
            ` : ''}
          </button>
          <button 
            id="tab-incoming-requests" 
            style="position: relative; padding: 8px 10px; border: none; border-radius: 6px; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease; ${activeTab === 'INCOMING_REQUESTS' ? 'background: #FFFFFF; color: #116834; box-shadow: 0 1px 3px rgba(0,0,0,0.06);' : 'background: transparent; color: #64748B;'}"
          >
            Permintaan Masuk (${incomingRequests.length})
            ${actionableIncomingCount > 0 ? `
              <span style="display: inline-block; width: 7px; height: 7px; background: #DC2626; border-radius: 50%; position: absolute; top: 6px; right: 8px;"></span>
            ` : ''}
          </button>
        </div>

        <!-- STATUS FILTER PILLS -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; scrollbar-width: none;">
          ${statusFilterTabsHtml}
        </div>

        <!-- CARDS CONTAINER -->
        <div class="cards-list-container">
          ${cardsHtml}
        </div>

      </main>

      <!-- BOTTOM FOOTER ACTION: Buat Permintaan button untuk PENGURUS -->
      ${userRole === 'PENGURUS' ? `
        <div style="flex-shrink: 0; background: #FFFFFF; border-top: 1px solid #E2E8F0; padding: 10px 16px;">
          <button id="btn-create-spb" type="button" style="width: 100%; min-height: 44px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.88rem; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.15); display: flex; align-items: center; justify-content: center;">
            Buat Permintaan
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Attach Event Handlers
  app.querySelector('#btn-back-landing')?.addEventListener('click', () => {
    navigate('/request');
  });

  app.querySelector('#btn-sync-landing')?.addEventListener('click', () => {
    renderRequestMataEntresLanding();
    toast('Data diperbarui', 'info');
  });

  app.querySelector('#btn-create-spb')?.addEventListener('click', () => {
    navigate('/request/mata-entres/form');
  });

  app.querySelector('#tab-my-requests')?.addEventListener('click', () => {
    activeTab = 'MY_REQUESTS';
    expandedCardIndex = -1;
    renderRequestMataEntresLanding();
  });

  app.querySelector('#tab-incoming-requests')?.addEventListener('click', () => {
    activeTab = 'INCOMING_REQUESTS';
    expandedCardIndex = -1;
    renderRequestMataEntresLanding();
  });

  app.querySelectorAll('.tab-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.dataset.filter;
      renderRequestMataEntresLanding();
    });
  });

  app.querySelectorAll('.btn-toggle-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      expandedCardIndex = expandedCardIndex === idx ? -1 : idx;
      renderRequestMataEntresLanding();
    });
  });

  app.querySelectorAll('.btn-view-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openMataEntresDetailModal(tx);
    });
  });

  // Action Button Listeners
  app.querySelectorAll('.btn-action-review').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openPengurusReviewModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });

  app.querySelectorAll('.btn-action-askep').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openAskepVerificationModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });

  app.querySelectorAll('.btn-action-asb').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openAsistenBibitanVerificationModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });

  app.querySelectorAll('.btn-action-dispatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openMantriDispatchModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });

  app.querySelectorAll('.btn-action-arrival').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openPengurusArrivalModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });

  app.querySelectorAll('.btn-action-rcp-askep').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openAskepReceiptRoutingModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });

  app.querySelectorAll('.btn-action-rcp-asb').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openAsistenBibitanReceiptModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });

  app.querySelectorAll('.btn-action-rcp-mantri').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const tx = filteredList.find(t => t.id === id);
      if (tx) openMantriBibitanReceiptModal(tx, currentUser, renderRequestMataEntresLanding);
    });
  });
}
