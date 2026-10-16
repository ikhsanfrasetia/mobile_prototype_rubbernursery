/**
 * js/modules/request/request-kebun-sepupu-landing.js
 * Halaman Pusat Permintaan Bibit Kebun Sepupu (Role Pengurus & Asisten Bibitan)
 * 
 * Fitur & Workflow:
 * 1. Tab Permintaan Saya (Strict Ownership Requester Identity)
 * 2. Tab Permintaan Masuk (Target Estate Inbox untuk Role Pengurus & Asisten Bibitan)
 * 3. Notification Bubble (Red Dot 🔴) untuk item actionable pending review / verifikasi
 * 4. Status Filters (Semua, Diajukan, Diproses, Selesai, Ditolak)
 * 5. Card List Informasi Transaksi (Compact + Expand/Collapse)
 * 6. Review & Koreksi oleh Pengurus Kebun Tujuan:
 *    - Modal Form Review Permintaan Bibit (Data Permintaan vs Keputusan Pengurus)
 *    - Koreksi approvedQty, approvedClone (Clone Master), estimatedDeliveryDate
 *    - Aksi [ Setujui & Teruskan ] -> Status: MENUNGGU_VERIFIKASI_ASISTEN
 *    - Aksi [ Tolak Permintaan ] -> Modal Alasan Wajib -> Status: DITOLAK
 * 7. Verifikasi & Pengembalian oleh Asisten Bibitan Kebun Tujuan:
 *    - Data hasil keputusan Pengurus READ-ONLY bagi Asisten
 *    - Aksi [ Verifikasi ] -> Modal Konfirmasi -> Status: TERVERIFIKASI (audit VERIFY)
 *    - Aksi [ Kembalikan ke Pengurus ] -> Modal Alasan Wajib -> Status: PERLU_REVISI_PENGURUS (audit UPDATE)
 *    - Target setelah return: Pengurus tujuan dapat merevisi dan meneruskan kembali
 * 8. Read-Only Transaction Detail View (via openModal)
 * 9. Navigation ke Form Pengajuan (/request/kebun-sepupu/form)
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { requestRepository } from '../../db/repositories.js';
import { resolveTransactionActor, applyTransactionActor, AUDIT_EVENT_TYPES } from '../../core/transaction-actor.js';
import { resolveEstate, getNurseryDivisionsByEstate, resolveNurseryDivision } from '../../data/estate-master.js';
import { getActiveKlons } from '../../data/klon-master.js';
import { getCfnaByCode } from '../../data/cfna-master.js';
import { formatDate, esc } from '../../core/utils.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { getWorkflowStatusPresentation } from '../../core/workflow-status-presentation.js';

export function formatAllocationDisplay(code) {
  if (!code || code === '-') return '-';
  const clean = String(code).trim();
  if (!clean || clean === '-') return '-';
  const cfna = getCfnaByCode(clean);
  if (cfna && cfna.name) {
    return `${clean} - ${cfna.name}`;
  }
  return `${clean} - -`;
}

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

let activeTab = null; // 'MY_REQUESTS' | 'INCOMING_REQUESTS'
let lastUserRoleId = null; // Track current user role to set default tab on initial role change
let activeStatusFilter = 'SEMUA'; // 'SEMUA' | 'DIAJUKAN' | 'DIPROSES' | 'SELESAI' | 'DITOLAK'
let expandedCardIndex = -1; // Track which card is expanded (-1 = none)

/**
 * Cek apakah user berwenang melakukan aksi receiver Pengurus (Pengurus Kebun Tujuan)
 */
export function canPerformReceiverAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'PENGURUS') return false;
  
  const userEstateId = currentUser.estateId;
  if (!userEstateId || tx.targetEstateId !== userEstateId) return false;
  
  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;
  const currentLoginCode = currentUser.loginCode || currentUser.code;
  
  const isCreator = (
    (tx.userId && tx.userId === currentUserId) ||
    (tx.createdByUserId && tx.createdByUserId === currentUserId) ||
    (currentLoginCode && tx.createdByLoginCode && tx.createdByLoginCode === currentLoginCode) ||
    (tx.estateId && tx.estateId === userEstateId)
  );
  if (isCreator) return false;

  return true;
}

/**
 * Cek apakah user berwenang melakukan aksi verifikasi/review Asisten Kepala (Kebun Tujuan)
 * Otorisasi: Role (ASKEP / ASISTEN_KEPALA) + Target Estate
 */
export function canPerformAskepAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASKEP' && userRole !== 'ASISTEN_KEPALA') return false;
  
  const userEstateId = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId;
  if (!userEstateId || targetEstate !== userEstateId) return false;

  const status = (tx.status || '').toUpperCase();
  if (status !== 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' && status !== 'PERLU_REVISI_ASISTEN_KEPALA') return false;

  return true;
}

/**
 * Cek apakah user berwenang melakukan aksi verifikasi Asisten Bibitan (Kebun Tujuan)
 * Otorisasi: Role ASISTEN_BIBITAN (EKSKLUSIF) + Target Estate + Target Division
 * 
 * CRITICAL FIX (PRE-UAT): Role ASISTEN (Asisten Lapangan) TIDAK LAGI
 * diizinkan melakukan Verify/Return pada status MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN.
 * Hanya ASISTEN_BIBITAN yang berwenang.
 */
export function canPerformAsistenAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  // STRICT: Hanya ASISTEN_BIBITAN. ASISTEN (Lapangan) TIDAK diizinkan.
  if (userRole !== 'ASISTEN_BIBITAN') return false;
  
  const userEstateId = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId;
  if (!userEstateId || targetEstate !== userEstateId) return false;

  // Routing validation: Estate + Division + Role
  const targetDivision = tx.targetNextDivisionId || tx.targetDivisionId;
  if (targetDivision && currentUser.divisionId && currentUser.divisionId !== targetDivision) {
    return false;
  }

  const status = (tx.status || '').toUpperCase();
  if (status !== 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' && status !== 'MENUNGGU_VERIFIKASI_ASISTEN') return false;

  return true;
}

/**
 * Hitung jumlah permintaan masuk yang membutuhkan aksi aktif role saat ini (Pengurus / Askep / Asisten)
 */
export function getActionableIncomingCount(incomingRequests, currentUser) {
  if (!Array.isArray(incomingRequests) || !currentUser) return 0;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);

  if (userRole === 'PENGURUS') {
    return incomingRequests.filter(tx => {
      const status = (tx.status || 'DIAJUKAN').toUpperCase();
      const isActionable = status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS';
      return isActionable && canPerformReceiverAction(tx, currentUser);
    }).length;
  }

  if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
    return incomingRequests.filter(tx => {
      return canPerformAskepAction(tx, currentUser);
    }).length;
  }

  // STRICT: Hanya ASISTEN_BIBITAN yang dihitung actionable count untuk verifikasi bibitan
  if (userRole === 'ASISTEN_BIBITAN') {
    return incomingRequests.filter(tx => {
      return canPerformAsistenAction(tx, currentUser);
    }).length;
  }

  return 0;
}

/**
 * Filter permohonan milik user aktif (Strict Ownership & Type Isolation KEBUN_SEPUPU)
 */
export function filterMyRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') return [];
  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;
  const currentLoginCode = currentUser.loginCode || currentUser.code;
  const currentUserIds = new Set([currentUser.userId, currentUser.id, currentUser.code].filter(Boolean).map(String));
  const verifiedBibitRequestIds = userRole === 'ASISTEN_BIBITAN'
    ? new Set(storage.get('receipt_ksp_transactions', []).filter(receipt => {
        const transactionType = String(receipt?.transactionType || '').trim().toUpperCase();
        const receiptType = String(receipt?.type || '').trim().toUpperCase();
        const isBibitReceipt = transactionType === 'PENERIMAAN_BIBIT' ||
          (transactionType !== 'PENERIMAAN_MATA_ENTRES' && receiptType === 'KEBUN_SEPUPU');
        return isBibitReceipt && receipt?.parentRequestId && currentUserIds.has(String(receipt.asbVerifiedByUserId || ''));
      }).map(receipt => String(receipt.parentRequestId)))
    : new Set();

  return requests.filter(tx => {
    // Isolasi tipe transaksi: Hanya KEBUN_SEPUPU yang ditampilkan pada Hub Permintaan Bibit Kebun Sepupu
    const isKebunSepupu = tx.type === 'KEBUN_SEPUPU' || (!tx.type && (tx.docNo || '').includes('/NIR/'));
    if (!isKebunSepupu) return false;

    const actor = resolveTransactionActor(tx);
    const isOwner = (
      (tx.userId && tx.userId === currentUserId) ||
      (tx.createdByUserId && tx.createdByUserId === currentUserId) ||
      (currentLoginCode && tx.createdByLoginCode && tx.createdByLoginCode === currentLoginCode) ||
      (actor && actor.userId === currentUserId)
    );
    const verifiedByCurrentAssistant = userRole === 'ASISTEN_BIBITAN' && verifiedBibitRequestIds.has(String(tx.id));
    return isOwner || verifiedByCurrentAssistant;
  });
}

/**
 * Filter permohonan masuk ke kebun aktif (Strict Role: PENGURUS, ASKEP & ASISTEN_BIBITAN & Target Estate + Division)
 * 
 * CRITICAL FIX (PRE-UAT): ASISTEN (Lapangan) tidak lagi termasuk dalam filter incoming.
 * Jika bisnis memutuskan Asisten Lapangan butuh read-only, tambahkan kembali
 * dengan filter division tanpa action buttons.
 */
export function filterIncomingRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'PENGURUS' && userRole !== 'ASKEP' && userRole !== 'ASISTEN_KEPALA' && userRole !== 'ASISTEN_BIBITAN') return [];

  return requests.filter(tx => {
    // Isolasi tipe transaksi: Hanya KEBUN_SEPUPU yang masuk ke Permintaan Masuk Kebun Sepupu
    const isRequestType = tx.type === 'KEBUN_SEPUPU' || (!tx.type && (tx.docNo || '').includes('/NIR/'));
    if (!isRequestType) return false;
    const targetEstate = tx.targetEstateId || tx.targetEstate || tx.senderEstateId || tx.targetNextEstateId;
    const sourceEstate = tx.estateId || tx.sourceEstateId || tx.requesterEstate;
    const isTargetEstate = matchEstateHelper(targetEstate, currentUser.estateId) && !matchEstateHelper(sourceEstate, currentUser.estateId);
    if (!isTargetEstate) return false;

    // Jika role adalah Asisten Bibitan, isolasi berdasarkan Divisi Target
    if (userRole === 'ASISTEN_BIBITAN') {
      const targetDivision = tx.targetDivisionId || tx.targetNextDivisionId;
      if (targetDivision && currentUser.divisionId && !matchDivisionHelper(targetDivision, currentUser.divisionId)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter permohonan berdasarkan status
 */
export function filterByStatus(requests, status) {
  if (!Array.isArray(requests)) return [];
  if (!status || status === 'SEMUA') return requests;
  if (status === 'DIPROSES') {
    return requests.filter(tx => {
      const s = (tx.status || '').toUpperCase();
      return s === 'DIPROSES' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' ||
             s === 'PERLU_REVISI_ASISTEN_KEPALA' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN' ||
             s === 'MENUNGGU_VERIFIKASI' ||
             s === 'PERLU_REVISI_PENGURUS' ||
             s === 'MENUNGGU_PENGELUARAN_BIBIT' ||
             s === 'PENGELUARAN_BERJALAN' ||
             s === 'MENUNGGU_PENERIMAAN_PENGURUS';
    });
  }
  if (status === 'SELESAI') {
    return requests.filter(tx => {
      const s = (tx.status || '').toUpperCase();
      return s === 'SELESAI' || s === 'TERVERIFIKASI' || s === 'APPROVED' || s === 'DITERIMA' || s === 'DITERIMA_DENGAN_SELISIH';
    });
  }
  return requests.filter(tx => (tx.status || 'DIAJUKAN').toUpperCase() === status.toUpperCase());
}

/**
 * Reconcile the requester-facing Bibit status with completed physical receipts.
 * Receipt completion is authoritative because older flows could persist the
 * receipt while leaving the linked request at MENUNGGU_PENERIMAAN.
 */
async function syncCompletedBibitReceipts(requests) {
  if (!Array.isArray(requests) || requests.length === 0) return requests || [];
  const receipts = storage.get('receipt_ksp_transactions', []);
  if (!Array.isArray(receipts) || receipts.length === 0) return requests;

  let reconciled = [...requests];
  let localRequests = storage.get('requests_transactions', []);
  if (!Array.isArray(localRequests)) localRequests = [];

  for (const receipt of receipts) {
    const transactionType = String(receipt?.transactionType || '').trim().toUpperCase();
    const receiptType = String(receipt?.type || '').trim().toUpperCase();
    const isBibitReceipt = transactionType === 'PENERIMAAN_BIBIT' ||
      (transactionType !== 'PENERIMAAN_MATA_ENTRES' && (receiptType === 'KEBUN_SEPUPU' || (!transactionType && !receiptType)));
    const finalStatus = String(receipt?.status || '').trim().toUpperCase();
    if (!isBibitReceipt || !['DITERIMA', 'DITERIMA_DENGAN_SELISIH'].includes(finalStatus)) continue;

    let requestIndex = reconciled.findIndex(request => request.id === receipt.parentRequestId);
    if (requestIndex < 0 && receipt.parentRequestDocNo) {
      requestIndex = reconciled.findIndex(request => request.docNo === receipt.parentRequestDocNo);
    }
    if (requestIndex < 0) continue;

    const request = reconciled[requestIndex];
    const receiptDocNo = receipt.receiptDocNo || receipt.docNo || '-';
    const auditMarker = `receipt-completion:${receipt.id || receiptDocNo}`;
    const hasCompletionAudit = Array.isArray(request.auditTrail) && request.auditTrail.some(event =>
      event?.sourceId === auditMarker || String(event?.details || '').includes(auditMarker)
    );
    const patch = {
      status: finalStatus,
      statusLabel: receipt.statusLabel || (finalStatus === 'DITERIMA_DENGAN_SELISIH' ? 'Diterima (Selisih)' : 'Diterima'),
      workflowStage: 'SELESAI',
      receiptDocNo,
      receivedAt: receipt.finalizedAt || receipt.receivedAt || request.receivedAt,
      receivedByName: receipt.finalizedByName || receipt.receivedByName || request.receivedByName,
      totalAcceptedQty: receipt.totalAcceptedQty ?? request.totalAcceptedQty,
      totalRejectedQty: receipt.totalRejectedQty ?? request.totalRejectedQty,
      discrepancyQty: receipt.discrepancyQty ?? request.discrepancyQty,
      discrepancyReason: receipt.discrepancyReason ?? request.discrepancyReason,
      targetNextRole: null
    };
    const needsStatusUpdate = request.status !== patch.status || request.statusLabel !== patch.statusLabel || request.workflowStage !== 'SELESAI';
    if (!needsStatusUpdate && hasCompletionAudit) continue;

    const receiptAudit = Array.isArray(receipt.auditTrail) ? receipt.auditTrail[receipt.auditTrail.length - 1] : null;
    const details = `${receiptAudit?.details || `Penerimaan Bibit ${receiptDocNo} telah selesai diproses Mantri Bibitan`} [${auditMarker}]`;
    const actor = {
      id: receipt.finalizedByUserId || receipt.receivedByUserId || 'MANTRI_BIBITAN',
      userId: receipt.finalizedByUserId || receipt.receivedByUserId || 'MANTRI_BIBITAN',
      name: receipt.finalizedByName || receipt.receivedByName || 'Mantri Bibitan',
      role: receipt.finalizedByRole || 'MANTRI_TANAMAN',
      rawRole: receipt.finalizedByRole || 'MANTRI_TANAMAN',
      position: 'Mantri Bibitan',
      estateId: receipt.targetEstateId || receipt.requesterEstateId,
      divisionId: receipt.targetNextDivisionId || receipt.targetDivisionId
    };

    let updated = { ...request, ...patch };
    if (!hasCompletionAudit) {
      try {
        updated = await requestRepository.update(request.id, patch, actor, AUDIT_EVENT_TYPES.APPROVE, details);
      } catch (error) {
        updated = applyTransactionActor(updated, AUDIT_EVENT_TYPES.APPROVE, actor, details);
        console.warn('[request] unable to persist completed receipt reconciliation:', error);
      }
    }

    reconciled[requestIndex] = updated;
    const localIndex = localRequests.findIndex(item => item.id === request.id || item.docNo === request.docNo);
    if (localIndex >= 0) localRequests[localIndex] = updated;
    else localRequests.push(updated);
  }

  storage.set('requests_transactions', localRequests);
  return reconciled;
}

/**
 * Update transaksi secara aman ke IndexedDB & fallback LocalStorage
 */
async function updateRequestTransaction(id, patch, actionType, details, currentUser) {
  let updatedRecord;
  try {
    updatedRecord = await requestRepository.update(id, patch, currentUser, actionType, details);
  } catch (err) {
    console.warn('requestRepository.update fallback to localStorage:', err);
    const list = storage.get('requests_transactions', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      const merged = { ...list[idx], ...patch, id };
      updatedRecord = applyTransactionActor(merged, actionType, currentUser, details);
      list[idx] = updatedRecord;
      storage.set('requests_transactions', list);
    }
  }

  // Sync LocalStorage list
  const localList = storage.get('requests_transactions', []);
  const idx = localList.findIndex(r => r.id === id);
  if (idx !== -1 && updatedRecord) {
    localList[idx] = { ...localList[idx], ...updatedRecord };
    storage.set('requests_transactions', localList);
  }

  return updatedRecord;
}

/**
 * Buka Form Modal Review & Koreksi Permintaan Bibit oleh Pengurus
 */
export function openReviewModal(item, currentUser) {
  if (!canPerformReceiverAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mereview permintaan ini.', 'error');
    return;
  }
  const currentStatus = (item.status || 'DIAJUKAN').toUpperCase();
  if (currentStatus !== 'DIAJUKAN' && currentStatus !== 'PERLU_REVISI_PENGURUS') {
    toast('Hanya permintaan berstatus DIAJUKAN atau PERLU REVISI yang dapat diproses Pengurus.', 'warning');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || 'Tanah Besih');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || 'Aek Pamingke');

  // Clone Master Dropdown Options
  const activeKlons = getActiveKlons();
  const selectedClone = item.approvedClone || item.requestedClone || item.klon || '';
  const cloneOptions = activeKlons.map(k => `
    <option value="${esc(k.canonicalName)}" ${k.canonicalName === selectedClone ? 'selected' : ''}>${esc(k.canonicalName)}</option>
  `).join('');

  // Callout banner jika permohonan dikembalikan
  const revisionBanner = (item.revisionReason || item.returnReason) ? `
    <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
      <div style="font-weight: 700; color: #991B1B; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 4px;">
        ⚠️ Catatan Pengembalian:
      </div>
      <div style="color: #BE123C; font-size: 0.80rem; font-weight: 600; line-height: 1.35;">
        "${esc(item.revisionReason || item.returnReason)}"
      </div>
      ${item.returnedByName ? `
        <div style="color: #94A3B8; font-size: 0.70rem; margin-top: 4px;">
          Oleh: ${esc(item.returnedByName)} (${formatDate(item.returnedAt)})
        </div>
      ` : ''}
    </div>
  ` : '';

  openModal({
    title: 'Review Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        ${revisionBanner}

        <!-- SECTION 1: DATA PERMINTAAN (Read-only) -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #475569; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            1. Data Permintaan Awal
          </div>
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 6px; align-items: start;">
            <span style="color: #64748B;">No. Dokumen</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(docNo)}</span>

            <span style="color: #64748B;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || '-')}</span>

            <span style="color: #64748B;">Kebun Asal</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(sourceName)}</span>

            <span style="color: #64748B;">Kebun Dituju</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(targetName)}</span>

            <span style="color: #64748B;">Kode Alokasi</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(formatAllocationDisplay(item.allocationCode))}</span>

            <span style="color: #64748B;">Klon Diminta</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedClone || item.klon || '-')}</span>

            <span style="color: #64748B;">Kategori</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.category || '-')}</span>

            <span style="color: #64748B;">Tahapan Pertumbuhan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>

            <span style="color: #64748B;">Banyaknya Diminta</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${(item.requestedQty || item.qty || 0).toLocaleString('id-ID')} Pkk</span>

            <span style="color: #64748B;">Tanggal Dibutuhkan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.requiredDate))}</span>
          </div>
        </div>

        <!-- SECTION 2: KEPUTUSAN PENGURUS (Editable) -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px;">
          <div style="font-weight: 700; color: #116834; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            2. Keputusan & Koreksi Pengurus
          </div>
          
          <!-- Field 1: Banyaknya Diproses -->
          <div style="margin-bottom: 10px;">
            <label for="review-approved-qty" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Banyaknya Diproses (Pkk) <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="number" 
              id="review-approved-qty" 
              min="0" 
              value="${item.approvedQty !== undefined ? item.approvedQty : (item.requestedQty || item.qty || 0)}" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit;"
            />
          </div>

          <!-- Field 2: Klon Diproses -->
          <div style="margin-bottom: 10px;">
            <label for="review-approved-clone" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Klon Diproses <span style="color: #DC2626;">*</span>
            </label>
            <select 
              id="review-approved-clone" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF;"
            >
              ${cloneOptions}
            </select>
          </div>

          <!-- Field 3: Estimasi Tanggal Dikirim -->
          <div style="margin-bottom: 4px;">
            <label for="review-delivery-date" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Estimasi Tanggal Dikirim <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="review-delivery-date" 
              value="${item.estimatedDeliveryDate || ''}" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit;"
            />
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; justify-content: flex-end; width: 100%;">
        <button class="btn" id="btn-review-reject" type="button" style="padding: 7px 14px; background: #FFFFFF; border: 1px solid #DC2626; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #DC2626; cursor: pointer;">
          Tolak Permintaan
        </button>
        <button class="btn" id="btn-review-approve-forward" type="button" style="padding: 7px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.78rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
          Setujui & Teruskan
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  
  // 1. Tombol Tolak -> Buka Modal Penolakan
  root?.querySelector('#btn-review-reject')?.addEventListener('click', () => {
    closeModal();
    handleRejectRequestModal(item, currentUser);
  });

  // 3. Tombol Setujui & Teruskan -> Menuju Asisten Kepala (tanpa penentuan divisi oleh Pengurus)
  root?.querySelector('#btn-review-approve-forward')?.addEventListener('click', async () => {
    const rawQty = root.querySelector('#review-approved-qty')?.value;
    if (rawQty === '' || rawQty === null || rawQty === undefined) {
      toast('Banyaknya bibit yang diproses wajib diisi.', 'error');
      root.querySelector('#review-approved-qty')?.focus();
      return;
    }
    const qtyNum = parseInt(rawQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      toast('Banyaknya bibit yang diproses harus berupa angka >= 0.', 'error');
      root.querySelector('#review-approved-qty')?.focus();
      return;
    }

    const selClone = root.querySelector('#review-approved-clone')?.value?.trim();
    if (!selClone) {
      toast('Klon yang diproses wajib dipilih.', 'error');
      root.querySelector('#review-approved-clone')?.focus();
      return;
    }

    const delDate = root.querySelector('#review-delivery-date')?.value?.trim();
    if (!delDate) {
      toast('Estimasi tanggal dikirim wajib diisi sebelum permohonan diteruskan.', 'error');
      root.querySelector('#review-delivery-date')?.focus();
      return;
    }

    const patch = {
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
      statusLabel: 'Menunggu Verifikasi Asisten Kepala',
      approvedQty: qtyNum,
      approvedClone: selClone,
      estimatedDeliveryDate: delDate,
      targetDivisionId: null,
      targetDivisionName: null,
      targetNextDivisionId: null,
      processedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      processedByName: currentUser.name || 'Pengurus',
      processedByRole: currentUser.role || 'PENGURUS',
      processedByEstateId: currentUser.estateId,
      processedAt: new Date().toISOString(),
      targetNextRole: 'ASKEP',
      targetNextEstateId: item.targetEstateId
    };

    const details = 'Permintaan disetujui dan diteruskan ke Asisten Kepala';
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, details, currentUser);
    
    toast('Permintaan disetujui dan diteruskan ke Asisten Kepala.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Review & Verifikasi oleh Asisten Kepala
 * Titik Pemilihan Divisi Bibitan & Penerusan ke Asisten Bibitan
 */
export function openAskepReviewModal(item, currentUser) {
  if (!canPerformAskepAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memproses verifikasi Asisten Kepala.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || 'Tanah Besih');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || 'Aek Pamingke');

  const approvedQtyFormatted = parseInt(item.approvedQty !== undefined ? item.approvedQty : (item.requestedQty || item.qty || 0), 10).toLocaleString('id-ID');
  const approvedCloneName = item.approvedClone || item.requestedClone || item.klon || '-';
  const deliveryDateFormatted = formatDate(item.estimatedDeliveryDate);

  // Nursery Division Options for Target Estate
  const nurseryDivisions = getNurseryDivisionsByEstate(item.targetEstateId);
  const currentSelectedDiv = item.targetDivisionId || (nurseryDivisions.length === 1 ? nurseryDivisions[0].divisionId : '');
  
  let divisionOptionsHtml = '';
  if (nurseryDivisions.length > 1) {
    divisionOptionsHtml += '<option value="">-- Pilih Divisi Bibitan --</option>';
  }
  divisionOptionsHtml += nurseryDivisions.map(d => `
    <option value="${esc(d.divisionId)}" ${d.divisionId === currentSelectedDiv ? 'selected' : ''}>${esc(d.divisionName || d.divisionId)}</option>
  `).join('');

  // Callout banner jika permohonan dikembalikan dari Asisten Bibitan
  const revisionBanner = (item.revisionReason || item.returnReason) ? `
    <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
      <div style="font-weight: 700; color: #991B1B; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 4px;">
        ⚠️ Catatan Pengembalian dari Asisten Bibitan:
      </div>
      <div style="color: #BE123C; font-size: 0.80rem; font-weight: 600; line-height: 1.35;">
        "${esc(item.revisionReason || item.returnReason)}"
      </div>
      ${item.returnedByName ? `
        <div style="color: #94A3B8; font-size: 0.70rem; margin-top: 4px;">
          Oleh: ${esc(item.returnedByName)} (${formatDate(item.returnedAt)})
        </div>
      ` : ''}
    </div>
  ` : '';

  openModal({
    title: 'Verifikasi Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        ${revisionBanner}

        <!-- SECTION 1: DATA PERMINTAAN (Read-only) -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #475569; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            1. Data Permintaan Awal
          </div>
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 6px; align-items: start;">
            <span style="color: #64748B;">No. Dokumen</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(docNo)}</span>

            <span style="color: #64748B;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || '-')}</span>

            <span style="color: #64748B;">Kebun Asal</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(sourceName)}</span>

            <span style="color: #64748B;">Kebun Dituju</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(targetName)}</span>

            <span style="color: #64748B;">Kode Alokasi</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(formatAllocationDisplay(item.allocationCode))}</span>

            <span style="color: #64748B;">Klon Diminta</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedClone || item.klon || '-')}</span>

            <span style="color: #64748B;">Kategori</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.category || '-')}</span>

            <span style="color: #64748B;">Tahapan Pertumbuhan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>

            <span style="color: #64748B;">Banyaknya Diminta</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${(item.requestedQty || item.qty || 0).toLocaleString('id-ID')} Pkk</span>

            <span style="color: #64748B;">Tanggal Dibutuhkan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.requiredDate))}</span>
          </div>
        </div>

        <!-- SECTION 2: HASIL KEPUTUSAN PENGURUS (Read-only) -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #116834; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            2. Hasil Keputusan Pengurus (Read-Only)
          </div>
          <div style="display: grid; grid-template-columns: 45% 55%; gap: 6px; font-size: 0.80rem;">
            <span style="color: #64748B;">Banyaknya Disetujui:</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${approvedQtyFormatted} Pkk</span>

            <span style="color: #64748B;">Klon Disetujui:</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(approvedCloneName)}</span>

            <span style="color: #64748B;">Estimasi Pengiriman:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(deliveryDateFormatted)}</span>

            <span style="color: #64748B;">Pengurus:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.processedByName || 'Pengurus')}</span>

            ${item.processedAt ? `
              <span style="color: #64748B;">Waktu Keputusan:</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.processedAt))}</span>
            ` : ''}
          </div>
        </div>

        <!-- SECTION 3: PENENTUAN DIVISI BIBITAN OLEH ASKEP -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px;">
          <div style="font-weight: 700; color: #116834; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            3. Penentuan Divisi Bibitan
          </div>
          <div style="margin-bottom: 4px;">
            <label for="askep-target-division" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Divisi Bibitan <span style="color: #DC2626;">*</span>
            </label>
            <select 
              id="askep-target-division" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF;"
            >
              ${divisionOptionsHtml}
            </select>
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div style="display: flex; gap: 8px; width: 100%;">
          <button class="btn btn-ghost" id="btn-askep-cancel" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600; padding: 8px;">
            Batal
          </button>
          <button class="btn" id="btn-askep-return" type="button" style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-weight: 700; border-radius: 8px; padding: 8px;">
            Kembalikan ke Pengurus
          </button>
        </div>
        <button class="btn" id="btn-askep-forward" type="button" style="width: 100%; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 10px; cursor: pointer;">
          Verifikasi & Teruskan
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  
  // 1. Tombol Batal
  root?.querySelector('#btn-askep-cancel')?.addEventListener('click', closeModal);

  // 2. Tombol Kembalikan ke Pengurus
  root?.querySelector('#btn-askep-return')?.addEventListener('click', () => {
    closeModal();
    openAskepReturnModal(item, currentUser);
  });

  // 3. Tombol Verifikasi & Teruskan
  root?.querySelector('#btn-askep-forward')?.addEventListener('click', async () => {
    const selDivisionId = root.querySelector('#askep-target-division')?.value?.trim();
    if (!selDivisionId) {
      toast('Divisi Bibitan wajib dipilih sebelum verifikasi diteruskan.', 'error');
      root.querySelector('#askep-target-division')?.focus();
      return;
    }

    // Validasi kepemilikan divisi terhadap targetEstateId
    const selDivision = resolveNurseryDivision(selDivisionId, item.targetEstateId) || nurseryDivisions.find(d => d.divisionId === selDivisionId);
    if (!selDivision || selDivision.estateId !== item.targetEstateId) {
      toast('Divisi Bibitan yang dipilih tidak valid untuk kebun tujuan ini.', 'error');
      root.querySelector('#askep-target-division')?.focus();
      return;
    }

    const patch = {
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
      statusLabel: 'Menunggu Verifikasi Asisten Bibitan',
      targetDivisionId: selDivision.divisionId,
      targetDivisionName: selDivision.divisionName,
      targetNextDivisionId: selDivision.divisionId,
      verifiedAskepByUserId: currentUser.userId || currentUser.id || currentUser.code,
      verifiedAskepByName: currentUser.name || 'Asisten Kepala',
      verifiedAskepByRole: currentUser.role || 'ASKEP',
      verifiedAskepByEstateId: currentUser.estateId,
      verifiedAskepAt: new Date().toISOString(),
      targetNextRole: 'ASISTEN_BIBITAN',
      targetNextEstateId: item.targetEstateId
    };

    const details = `Permintaan diverifikasi oleh Asisten Kepala dan diteruskan ke Asisten Bibitan (${selDivision.divisionName})`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.VERIFY, details, currentUser);
    
    toast('Permintaan diverifikasi dan diteruskan ke Asisten Bibitan.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Pengembalian oleh Asisten Kepala ke Pengurus (MENUNGGU_VERIFIKASI_ASISTEN_KEPALA -> PERLU_REVISI_PENGURUS)
 */
export function openAskepReturnModal(item, currentUser) {
  if (!canPerformAskepAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mengembalikan permintaan ini.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const targetEstate = resolveEstate(item.targetEstateId);
  const targetEstateName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || 'Pengurus');

  openModal({
    title: 'Kembalikan ke Pengurus',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #475569; margin-bottom: 12px; line-height: 1.4;">
          Anda akan mengembalikan permintaan bibit <strong>${esc(docNo)}</strong> ke Pengurus <strong>${esc(targetEstateName)}</strong> untuk direvisi.
        </p>
        <div style="margin-bottom: 8px;">
          <label for="askep-return-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px;">
            Alasan Pengembalian <span style="color: #DC2626;">*</span>
          </label>
          <textarea 
            id="askep-return-reason" 
            rows="3" 
            placeholder="Masukkan alasan pengembalian ke Pengurus (contoh: ketersediaan klon, alokasi volume, tanggal pengiriman, dsb)..." 
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
          ></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-askep-return" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Batal</button>
        <button class="btn" id="btn-confirm-askep-return" type="button" style="flex: 1; background: #DC2626; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">Kembalikan ke Pengurus</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-askep-return')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-askep-return')?.addEventListener('click', async () => {
    const textarea = root.querySelector('#askep-return-reason');
    const reason = (textarea?.value || '').trim();

    if (!reason) {
      toast('Alasan pengembalian wajib diisi.', 'error');
      textarea?.focus();
      return;
    }

    const patch = {
      status: 'PERLU_REVISI_PENGURUS',
      statusLabel: 'Perlu Revisi Pengurus',
      revisionReason: reason,
      returnReason: reason,
      returnedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      returnedByName: currentUser.name || 'Asisten Kepala',
      returnedByRole: currentUser.role || 'ASKEP',
      returnedByEstateId: currentUser.estateId,
      returnedAt: new Date().toISOString(),
      targetNextRole: 'PENGURUS',
      targetNextEstateId: item.targetEstateId
    };

    const details = `Dokumen dikembalikan oleh Asisten Kepala ke Pengurus untuk revisi: ${reason}`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, details, currentUser);
    
    toast('Dokumen telah dikembalikan ke Pengurus untuk revisi.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Tolak Permintaan oleh Pengurus (DIAJUKAN -> DITOLAK)
 */
export function handleRejectRequestModal(item, currentUser) {
  if (!canPerformReceiverAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk menolak permintaan ini.', 'error');
    return;
  }
  const currentStatus = (item.status || 'DIAJUKAN').toUpperCase();
  if (currentStatus !== 'DIAJUKAN' && currentStatus !== 'PERLU_REVISI_PENGURUS') {
    toast('Hanya permintaan berstatus DIAJUKAN atau PERLU REVISI yang dapat ditolak.', 'warning');
    return;
  }

  openModal({
    title: 'Tolak Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #475569; margin-bottom: 12px; line-height: 1.4;">
          Anda akan menolak permintaan bibit <strong>${esc(item.docNo || '2026/NIR/001')}</strong> dari <strong>${esc(resolveEstate(item.estateId)?.estate_name || item.estateId)}</strong>.
        </p>
        <div style="margin-bottom: 8px;">
          <label for="reject-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px;">
            Alasan Penolakan <span style="color: #DC2626;">*</span>
          </label>
          <textarea 
            id="reject-reason" 
            rows="3" 
            placeholder="Masukkan alasan penolakan..." 
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
          ></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-reject" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Batal</button>
        <button class="btn" id="btn-confirm-reject" type="button" style="flex: 1; background: #DC2626; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">Tolak Permintaan</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-reject')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-reject')?.addEventListener('click', async () => {
    const textarea = root.querySelector('#reject-reason');
    const reason = (textarea?.value || '').trim();

    if (!reason) {
      toast('Alasan penolakan wajib diisi.', 'error');
      textarea?.focus();
      return;
    }

    const patch = {
      status: 'DITOLAK',
      statusLabel: 'Ditolak',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
      receiverUserId: currentUser.userId || currentUser.id || currentUser.code,
      receiverName: currentUser.name || 'Pengurus',
      receiverRole: currentUser.role || 'PENGURUS',
      receiverEstateId: currentUser.estateId
    };

    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, reason, currentUser);
    toast('Permintaan telah ditolak.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Verifikasi oleh Asisten Bibitan (MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN -> TERVERIFIKASI)
 */
export function openVerifyModal(item, currentUser) {
  if (!canPerformAsistenAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memverifikasi permintaan ini.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const approvedQtyFormatted = parseInt(item.approvedQty !== undefined ? item.approvedQty : (item.requestedQty || item.qty || 0), 10).toLocaleString('id-ID');
  const approvedCloneName = item.approvedClone || item.requestedClone || item.klon || '-';
  const deliveryDateFormatted = formatDate(item.estimatedDeliveryDate);
  const divisionName = item.targetDivisionName || item.targetDivisionId || '-';

  openModal({
    title: 'Verifikasi Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #334155; margin-bottom: 12px; line-height: 1.45;">
          Pastikan data keputusan Pengurus dan verifikasi Asisten Kepala untuk dokumen <strong>${esc(docNo)}</strong> sudah sesuai:
        </p>

        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 45% 55%; gap: 6px; font-size: 0.80rem;">
            <span style="color: #64748B;">Banyaknya Disetujui:</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${approvedQtyFormatted} Pkk</span>

            <span style="color: #64748B;">Klon Disetujui:</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(approvedCloneName)}</span>

            <span style="color: #64748B;">Divisi Bibitan:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(divisionName)}</span>

            <span style="color: #64748B;">Estimasi Pengiriman:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(deliveryDateFormatted)}</span>

            <span style="color: #64748B;">Pengurus:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.processedByName || 'Pengurus')}</span>

            ${item.verifiedAskepByName ? `
              <span style="color: #64748B;">Asisten Kepala:</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.verifiedAskepByName)}</span>
            ` : ''}

            ${item.verifiedAskepAt ? `
              <span style="color: #64748B;">Verifikasi Askep:</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.verifiedAskepAt))}</span>
            ` : ''}
          </div>
        </div>

        <p style="color: #64748B; font-size: 0.78rem; margin: 0; line-height: 1.4;">
          Setelah diverifikasi, dokumen ini akan diteruskan ke tahap persiapan pengeluaran bibit oleh Mantri Bibitan (${esc(divisionName)}).
        </p>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-verify" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">
          Batal
        </button>
        <button class="btn" id="btn-confirm-verify" type="button" style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 10px; cursor: pointer;">
          Verifikasi & Teruskan
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-verify')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-verify')?.addEventListener('click', async () => {
    const patch = {
      status: 'TERVERIFIKASI',
      statusLabel: 'Terverifikasi',
      targetDivisionId: item.targetDivisionId,
      targetDivisionName: item.targetDivisionName,
      targetNextDivisionId: item.targetDivisionId,
      verifiedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      verifiedByName: currentUser.name || 'Asisten Bibitan',
      verifiedByRole: currentUser.role || 'ASISTEN_BIBITAN',
      verifiedByEstateId: currentUser.estateId,
      verifiedAt: new Date().toISOString(),
      targetNextRole: 'MANTRI_TANAMAN',
      targetNextEstateId: currentUser.estateId
    };

    const details = `Dokumen permintaan telah diverifikasi oleh Asisten Bibitan (${item.targetDivisionName || item.targetDivisionId || ''})`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.VERIFY, details, currentUser);
    
    toast('Dokumen permintaan telah diverifikasi.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Pengembalian oleh Asisten Bibitan (MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN -> PERLU_REVISI_ASISTEN_KEPALA)
 */
export function openReturnModal(item, currentUser) {
  if (!canPerformAsistenAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mengembalikan permintaan ini.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';

  openModal({
    title: 'Kembalikan ke Asisten Kepala',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #475569; margin-bottom: 12px; line-height: 1.4;">
          Anda akan mengembalikan permintaan bibit <strong>${esc(docNo)}</strong> ke Asisten Kepala untuk direvisi.
        </p>
        <div style="margin-bottom: 8px;">
          <label for="return-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px;">
            Alasan Pengembalian <span style="color: #DC2626;">*</span>
          </label>
          <textarea 
            id="return-reason" 
            rows="3" 
            placeholder="Masukkan alasan pengembalian ke Asisten Kepala (contoh: stok klon pada divisi kurang, jadwal pembibitan tidak sesuai, dsb)..." 
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
          ></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-return" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Batal</button>
        <button class="btn" id="btn-confirm-return" type="button" style="flex: 1; background: #DC2626; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">Kembalikan ke Asisten Kepala</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-return')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-return')?.addEventListener('click', async () => {
    const textarea = root.querySelector('#return-reason');
    const reason = (textarea?.value || '').trim();

    if (!reason) {
      toast('Alasan pengembalian wajib diisi.', 'error');
      textarea?.focus();
      return;
    }

    const patch = {
      status: 'PERLU_REVISI_ASISTEN_KEPALA',
      statusLabel: 'Perlu Revisi Asisten Kepala',
      revisionReason: reason,
      returnReason: reason,
      targetDivisionId: item.targetDivisionId,
      targetDivisionName: item.targetDivisionName,
      targetNextDivisionId: item.targetDivisionId,
      returnedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      returnedByName: currentUser.name || 'Asisten Bibitan',
      returnedByRole: currentUser.role || 'ASISTEN_BIBITAN',
      returnedByEstateId: currentUser.estateId,
      returnedAt: new Date().toISOString(),
      targetNextRole: 'ASKEP',
      targetNextEstateId: currentUser.estateId
    };

    const details = `Dokumen dikembalikan ke Asisten Kepala untuk revisi: ${reason}`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, details, currentUser);
    
    toast('Dokumen telah dikembalikan ke Asisten Kepala untuk revisi.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Render Utama Halaman Hub Permintaan Kebun Sepupu
 */
export async function renderRequestKebunSepupuLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const userCtx = getCurrentUserContext();
  const sessionUser = session.get();
  const currentUser = userCtx || sessionUser || {
    id: 'PGS001',
    userId: 'PGS001',
    code: 'PGS001',
    loginCode: 'PGS001',
    name: 'Junaidi',
    role: 'PENGURUS',
    position: 'Pengurus Kebun',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih'
  };
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole === 'MANTRI_TANAMAN' || userRole === 'MANTRI') {
    navigate('/dispatch');
    return;
  }

  // Muat transaksi dari IndexedDB / LocalStorage fallback
  let allRequests = [];
  try {
    allRequests = await requestRepository.list();
  } catch (err) {
    allRequests = storage.get('requests_transactions', []);
  }
  if (!allRequests || allRequests.length === 0) {
    allRequests = storage.get('requests_transactions', []);
  }
  allRequests = await syncCompletedBibitReceipts(allRequests);

  // Filter Data Berdasarkan Perspektif
  const myRequests = filterMyRequests(allRequests, currentUser);
  const incomingRequests = filterIncomingRequests(allRequests, currentUser);

  // Default activeTab ke INCOMING_REQUESTS untuk role peninjau/verifikator (Askep & Asisten Bibitan) hanya saat awal buka / ganti role
  const normalizedUserRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const currentActorKey = `${currentUser.userId || currentUser.id || ''}_${normalizedUserRole}`;
  if (lastUserRoleId !== currentActorKey || !activeTab) {
    lastUserRoleId = currentActorKey;
    if (normalizedUserRole === 'ASKEP' || normalizedUserRole === 'ASISTEN_KEPALA' || normalizedUserRole === 'ASISTEN_BIBITAN') {
      activeTab = 'INCOMING_REQUESTS';
    } else {
      activeTab = 'MY_REQUESTS';
    }
  }

  // Tab yang aktif
  const currentTabItems = activeTab === 'MY_REQUESTS' ? myRequests : incomingRequests;
  const filteredItems = filterByStatus(currentTabItems, activeStatusFilter);

  // Hitung jumlah actionable items untuk notifikasi bubble
  const actionableIncomingCount = getActionableIncomingCount(incomingRequests, currentUser);
  const hasActionableIncoming = actionableIncomingCount > 0;

  // Status Filter Counts
  const statusCounts = {
    SEMUA: currentTabItems.length,
    DIAJUKAN: currentTabItems.filter(t => (t.status || 'DIAJUKAN').toUpperCase() === 'DIAJUKAN').length,
    DIPROSES: currentTabItems.filter(t => {
      const s = (t.status || '').toUpperCase();
      return s === 'DIPROSES' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' ||
             s === 'PERLU_REVISI_ASISTEN_KEPALA' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN' ||
             s === 'MENUNGGU_VERIFIKASI' ||
             s === 'PERLU_REVISI_PENGURUS';
    }).length,
    SELESAI: currentTabItems.filter(t => {
      const s = (t.status || '').toUpperCase();
      return s === 'SELESAI' || s === 'TERVERIFIKASI' || s === 'APPROVED';
    }).length,
    DITOLAK: currentTabItems.filter(t => (t.status || '').toUpperCase() === 'DITOLAK').length
  };

  // Status Filter Pills Markup
  const filterPills = [
    { key: 'SEMUA', label: 'Semua' },
    { key: 'DIAJUKAN', label: 'Diajukan' },
    { key: 'DIPROSES', label: 'Diproses' },
    { key: 'SELESAI', label: 'Selesai' },
    { key: 'DITOLAK', label: 'Ditolak' }
  ].map(pill => {
    const isSelected = activeStatusFilter === pill.key;
    const count = statusCounts[pill.key] || 0;
    return `
      <button 
        class="filter-pill-btn" 
        data-status="${pill.key}"
        type="button" 
        style="display: inline-flex; align-items: center; justify-content: center; height: 32px; padding: 0 14px; font-size: 0.74rem; font-weight: ${isSelected ? '700' : '600'}; border-radius: 9999px; border: 1px solid ${isSelected ? '#116834' : '#E2E8F0'}; background: ${isSelected ? '#116834' : '#FFFFFF'}; color: ${isSelected ? '#FFFFFF' : '#475569'}; white-space: nowrap; cursor: pointer; box-shadow: ${isSelected ? '0 1px 3px rgba(17,104,52,0.2)' : 'none'}; transition: all 0.15s ease;"
      >
        ${pill.label} (${count})
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0; position: sticky; top: 0; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
          <button id="btn-back" type="button" aria-label="Kembali" style="min-width: 40px; min-height: 40px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #116834; border-radius: 8px; flex-shrink: 0; transition: background 0.15s ease;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1rem; font-weight: 700; color: #0F172A; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25; letter-spacing: -0.01em;">Permintaan Bibit Kebun Sepupu</h1>
        </div>
        <div style="display: flex; align-items: center; flex-shrink: 0;">
          <button id="btn-refresh" type="button" aria-label="Refresh" style="min-width: 40px; min-height: 40px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #116834; border-radius: 8px; flex-shrink: 0; transition: background 0.15s ease;">
            <svg id="sync-icon-svg" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- TABS NAV (Permintaan Saya vs Permintaan Masuk + Notif Bubble 🔴) -->
      <div style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; flex-shrink: 0;">
        <div style="display: flex; gap: 8px;">
          <button 
            id="tab-my-requests" 
            type="button" 
            style="flex: 1; min-height: 44px; padding: 10px 4px; background: transparent; border: none; border-bottom: 2px solid ${activeTab === 'MY_REQUESTS' ? '#116834' : 'transparent'}; color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}; font-weight: ${activeTab === 'MY_REQUESTS' ? '800' : '600'}; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s ease;"
          >
            <span>Permintaan Saya</span>
            <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; padding: 2px 7px; border-radius: 9999px; background: ${activeTab === 'MY_REQUESTS' ? '#E8F5E9' : '#F1F5F9'}; color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}; line-height: 1;">
              ${myRequests.length}
            </span>
          </button>
          
          <button 
            id="tab-incoming-requests" 
            type="button" 
            style="flex: 1; min-height: 44px; padding: 10px 4px; background: transparent; border: none; border-bottom: 2px solid ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : 'transparent'}; color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}; font-weight: ${activeTab === 'INCOMING_REQUESTS' ? '800' : '600'}; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s ease; position: relative;"
          >
            <span>Permintaan Masuk</span>
            ${hasActionableIncoming ? `<span class="notif-dot" style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #DC2626; margin-right: -2px;"></span>` : ''}
            <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; padding: 2px 7px; border-radius: 9999px; background: ${activeTab === 'INCOMING_REQUESTS' ? '#E8F5E9' : '#F1F5F9'}; color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}; line-height: 1;">
              ${incomingRequests.length}
            </span>
          </button>
        </div>
      </div>

      <!-- FILTER STATUS BAR -->
      <div style="background: #FAFAFA; padding: 10px 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; flex-shrink: 0; scrollbar-width: none;">
        <div style="display: flex; gap: 8px; align-items: center;">
          ${filterPills}
        </div>
      </div>

      <!-- MAIN CONTENT: LIST TRANSAKSI / EMPTY STATE -->
      <main style="flex: 1; overflow-y: auto; padding: 12px 16px 24px 16px;">
        ${filteredItems.length === 0 ? renderEmptyState(activeTab) : renderRequestCards(filteredItems, currentUser)}
      </main>

      <!-- FOOTER ACTION: Create button hanya untuk PENGURUS -->
      ${normalizedUserRole === 'PENGURUS' ? `
      <div style="flex-shrink: 0; background: #FFFFFF; border-top: 1px solid #E2E8F0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -2px 10px rgba(0,0,0,0.05);">
        <button id="btn-create-request" type="button" style="width: 100%; min-height: 46px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.88rem; border: none; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(17,104,52,0.2); transition: background 0.15s ease;">
          Buat Permintaan
        </button>
      </div>
      ` : ''}

    </div>
  `;

  // Attach Event Handlers
  attachLandingEvents(filteredItems, currentUser);
}

/**
 * Render visual Timeline & Audit Trail stepper (Harmonisasi dengan Kebun Sendiri)
 */
function renderTimelineStepper(item) {
  let auditItems = Array.isArray(item.auditTrail) ? [...item.auditTrail] : [];

  // Synthesize initial audit trail if empty but record has historical metadata
  if (auditItems.length === 0) {
    if (item.createdAt || item.date || item.requestedBy || item.createdByName) {
      auditItems.push({
        eventType: 'CREATE',
        name: item.requestedBy || item.createdByName || 'Pemohon',
        position: 'Pengurus Kebun',
        timestamp: item.createdAt || item.date,
        details: 'Permintaan Bibit Kebun Sepupu diajukan'
      });
    }
    if (item.processedByName) {
      auditItems.push({
        eventType: 'UPDATE',
        name: item.processedByName,
        position: 'Pengurus Kebun Tujuan',
        timestamp: item.updatedAt || item.processedAt || item.createdAt,
        details: 'Permintaan disetujui dan diteruskan ke Asisten Kepala'
      });
    }
    if (item.verifiedAskepByName) {
      auditItems.push({
        eventType: 'VERIFY',
        name: item.verifiedAskepByName,
        position: 'Asisten Kepala',
        timestamp: item.verifiedAskepAt || item.updatedAt,
        details: 'Permintaan diverifikasi oleh Asisten Kepala dan diteruskan ke Asisten Bibitan'
      });
    }
    if (item.returnedByName || item.revisionReason || item.returnReason) {
      auditItems.push({
        eventType: 'UPDATE',
        name: item.returnedByName || 'Verifikator',
        position: 'Pemeriksa',
        timestamp: item.returnedAt || item.updatedAt,
        details: (item.revisionReason || item.returnReason) ? `Dikembalikan untuk revisi: "${item.revisionReason || item.returnReason}"` : 'Dokumen dikembalikan untuk revisi'
      });
    }
    if (item.verifiedByName) {
      auditItems.push({
        eventType: 'VERIFY',
        name: item.verifiedByName,
        position: 'Asisten Bibitan',
        timestamp: item.verifiedAt || item.updatedAt,
        details: 'Permintaan diverifikasi oleh Asisten Bibitan'
      });
    }
    if (item.rejectionReason) {
      auditItems.push({
        eventType: 'UPDATE',
        name: item.rejectedByName || item.processedByName || 'Pengurus',
        position: 'Pengurus Kebun Tujuan',
        timestamp: item.rejectedAt || item.updatedAt,
        details: `Permintaan ditolak: "${item.rejectionReason}"`
      });
    }
  }

  // Penerimaan Kebun Sepupu mencatat tahap di kebun pemohon pada audit
  // dokumen penerimaan. Gabungkan tahap itu agar timeline permintaan setara
  // dengan Mata Entres, yang menampilkan alur sumber dan pemohon berurutan.
  const receiptTransactions = storage.get('receipt_ksp_transactions', []);
  const completedBibitReceipt = Array.isArray(receiptTransactions)
    ? receiptTransactions.find(receipt => {
        const transactionType = String(receipt?.transactionType || '').trim().toUpperCase();
        const receiptType = String(receipt?.type || '').trim().toUpperCase();
        const isBibitReceipt = transactionType === 'PENERIMAAN_BIBIT' ||
          (transactionType !== 'PENERIMAAN_MATA_ENTRES' && receiptType === 'KEBUN_SEPUPU');
        return isBibitReceipt &&
          (receipt.parentRequestId === item.id || receipt.parentRequestDocNo === item.docNo) &&
          ['DITERIMA', 'DITERIMA_DENGAN_SELISIH'].includes(String(receipt.status || '').toUpperCase());
      })
    : null;

  if (completedBibitReceipt) {
    const receiptAudit = Array.isArray(completedBibitReceipt.auditTrail) ? completedBibitReceipt.auditTrail : [];
    const receiptCompletionDetails = receiptAudit[receiptAudit.length - 1]?.details || '';
    // Buang event final hasil sinkronisasi lama karena event asli Mantri
    // Bibitan ada di audit penerimaan dan memiliki waktu/aktor yang tepat.
    auditItems = auditItems.filter(event => {
      const details = String(event?.details || '');
      return !details.includes(`receipt-completion:${completedBibitReceipt.id || completedBibitReceipt.receiptDocNo || completedBibitReceipt.docNo}`) &&
        !(receiptCompletionDetails && details === receiptCompletionDetails);
    });

    // Ubah pengeluaran bibit menjadi narasi yang sejajar dengan alur Mata
    // Entres: pengeluaran fisik, nomor penerimaan otomatis, dan sisa kuota.
    auditItems = auditItems.map(event => {
      const details = String(event?.details || '');
      const dispatchMatch = details.match(/^Pengeluaran bibit #(\d+) sebanyak ([\d.,]+) Pkk(?: \((.*)\))? telah diproses oleh Mantri Bibitan$/i);
      if (!dispatchMatch) return event;
      const remainingQty = Number(item.remainingQty ?? Math.max(0, Number(item.approvedQty || item.requestedQty || 0) - Number(item.totalIssuedQty || item.actualIssuedQty || 0)));
      const batchSummary = dispatchMatch[3] ? ` (${dispatchMatch[3]})` : '';
      return {
        ...event,
        details: `Mantri Bibitan (${event.name || event.actorName || 'Mantri Bibitan'}) mencatat pengeluaran fisik: ${dispatchMatch[2]} Pkk${batchSummary}. Dokumen penerimaan ${completedBibitReceipt.receiptDocNo || completedBibitReceipt.docNo || '-'} otomatis dibuat di Kebun Pemohon. Sisa kuota: ${remainingQty.toLocaleString('id-ID')}`
      };
    });

    // Audit receipt dimulai dari pembuatan otomatis; tahap itu sudah terwakili
    // oleh event pengeluaran di sisi kebun sumber. Ambil tahap setelahnya.
    auditItems.push(...receiptAudit.filter(event => String(event?.eventType || '').toUpperCase() !== 'CREATE'));
  }

  // Hilangkan event yang tercatat dua kali pada data lama, tanpa membuang
  // tahapan berbeda dari aktor yang sama.
  const seenAuditEvents = new Set();
  auditItems = auditItems.filter(event => {
    const details = String(event?.details || '').replace(/\s*\[receipt-completion:[^\]]+\]/g, '').trim();
    const actor = String(event?.userId || event?.actorId || event?.name || event?.actorName || '').trim().toLowerCase();
    const key = `${actor}|${String(event?.eventType || '').toUpperCase()}|${details.toLowerCase()}`;
    if (seenAuditEvents.has(key)) return false;
    seenAuditEvents.add(key);
    return true;
  });

  return `
    <!-- TIMELINE & AUDIT TRAIL -->
    <div style="margin-top: 12px; margin-bottom: 6px; padding-top: 10px; border-top: 1px dashed #E2E8F0;">
      <div style="font-weight: 700; font-size: 0.80rem; color: #0F172A; margin-bottom: 8px;">Status Progress Permintaan</div>
      ${auditItems.length === 0 ? `
        <div style="font-size: 0.74rem; color: #94A3B8; font-style: italic; padding: 4px 0;">
          Belum ada riwayat audit trail tersimpan.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0; padding-left: 2px;">
          ${auditItems.map((a, aIdx) => {
            const isLast = aIdx === auditItems.length - 1;
            const actorName = a.actorName || a.name || a.userName || a.createdByName || a.actorId || a.userId || item.requestedBy || 'User';
            const actorRole = a.position || a.actorRole || a.role || a.rawRole || '';
            const eventTime = a.timestamp || a.createdAt || a.date || item.createdAt || item.date;
            let eventDesc = a.note || a.details || a.description || a.event || a.eventType || 'Permintaan Bibit Diajukan';
            eventDesc = String(eventDesc).replace(/\s*\[receipt-completion:[^\]]+\]/g, '').trim();
            if (eventDesc === 'CREATE') eventDesc = 'Permintaan Bibit Kebun Sepupu diajukan';
            if (eventDesc === 'UPDATE') eventDesc = 'Pembaruan Dokumen';
            if (eventDesc === 'VERIFY') eventDesc = 'Verifikasi Dokumen';
            if (eventDesc === 'APPROVE') eventDesc = 'Persetujuan Dokumen';
            if (eventDesc === 'SUBMIT') eventDesc = 'Dokumen Berhasil Diajukan';

            return `
              <div style="display: flex; gap: 10px; position: relative;">
                <!-- Left indicator & line -->
                <div style="display: flex; flex-direction: column; align-items: center; width: 14px; flex-shrink: 0;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #116834; margin-top: 5px; flex-shrink: 0; border: 2px solid #DCFCE7;"></div>
                  ${!isLast ? `<div style="width: 2px; flex: 1; background: #CBD5E1; margin: 3px 0;"></div>` : ''}
                </div>
                <!-- Right content -->
                <div style="flex: 1; padding-bottom: ${isLast ? '4px' : '12px'}; min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.78rem; color: #0F172A; line-height: 1.3;">
                    <span>${esc(actorName)}</span>
                    ${actorRole ? `<span style="font-size: 0.70rem; font-weight: 600; color: #64748B; margin-left: 4px;">(${esc(actorRole)})</span>` : ''}
                  </div>
                  <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px; line-height: 1.3;">
                    <span style="font-weight: 600; color: #475569;">${esc(formatDate(eventTime))}</span>
                    <span style="margin: 0 4px; color: #94A3B8;">—</span>
                    <span style="color: #334155;">${esc(eventDesc)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * Render Kartu Permintaan
 */
function renderRequestCards(items, currentUser) {
  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${items.map((item, idx) => renderSingleCard(item, idx, currentUser)).join('')}
    </div>
  `;
}

/**
 * Render Satu Kartu Transaksi (Compact + Expand/Collapse + Workflow Actions)
 */
function renderSingleCard(item, index, currentUser) {
  const docNo = item.docNo || item.nomorDokumen || '-';
  const status = (item.status || 'DIAJUKAN').toUpperCase();
  const isExpanded = expandedCardIndex === index;
  
  // Resolve Nama Kebun
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || '-');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || '-');

  const statusPresentation = getWorkflowStatusPresentation(status, item.statusLabel);
  const badgeBg = statusPresentation.background;
  const badgeColor = statusPresentation.color;
  const badgeBorder = statusPresentation.border;
  const badgeText = statusPresentation.label;

  const formattedDate = formatDate(item.requiredDate || item.date || item.createdAt);
  const qtyFormatted = parseInt(item.qty || item.requestedQty || 0, 10).toLocaleString('id-ID');

  const isPengurusAuthorized = activeTab === 'INCOMING_REQUESTS' && canPerformReceiverAction(item, currentUser);
  const isAskepAuthorized = activeTab === 'INCOMING_REQUESTS' && canPerformAskepAction(item, currentUser);
  const isAsistenAuthorized = activeTab === 'INCOMING_REQUESTS' && canPerformAsistenAction(item, currentUser);

  // Action buttons
  let cardActionButtons = '';
  if (isPengurusAuthorized && (status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS')) {
    cardActionButtons = `
      <div style="display: flex; width:100%; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
        <button 
          class="btn-action-review" 
          data-index="${index}" 
          type="button" 
          style="width:100%; min-height:46px; background: #116834; color: #FFFFFF; border: none; font-size: 0.88rem; font-weight: 700; padding: 8px 12px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(17,104,52,0.2);"
        >
          Tinjau Permintaan
        </button>
      </div>
    `;
  } else if (isAskepAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' || status === 'PERLU_REVISI_ASISTEN_KEPALA')) {
    cardActionButtons = `
      <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
        <button 
          class="btn-card-askep-return" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; border:1px solid #DC2626; color:#DC2626; background:#FFFFFF; font-size:0.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Kembalikan ke Pengurus
        </button>
        <button 
          class="btn-card-askep-process" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; background:#116834; color:#FFFFFF; border:1px solid #116834; font-size:0.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Verifikasi & Teruskan
        </button>
      </div>
    `;
  } else if (isAsistenAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || status === 'MENUNGGU_VERIFIKASI_ASISTEN')) {
    cardActionButtons = `
      <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
        <button 
          class="btn-card-return" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; border:1px solid #DC2626; color:#DC2626; background:#FFFFFF; font-size:0.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Kembalikan ke Asisten Kepala
        </button>
        <button 
          class="btn-card-verify" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; background:#116834; color:#FFFFFF; border:1px solid #116834; font-size:0.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Verifikasi & Teruskan
        </button>
      </div>
    `;
  }

  // Expanded detail section
  const expandedSection = isExpanded ? `
    <!-- EXPANDED DETAIL -->
    <div class="card-expanded-detail" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
      <div style="display: grid; grid-template-columns: 40% 60%; gap: 4px; font-size: 0.75rem; padding: 0 2px;">
        <span style="color: #64748B;">Pemohon</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || '-')}</span>

        <span style="color: #64748B;">Tujuan Permintaan</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.purpose || '-')}</span>

        <span style="color: #64748B;">Kode Alokasi</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(formatAllocationDisplay(item.allocationCode))}</span>

        <span style="color: #64748B;">Tahapan Pertumbuhan</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>

        <span style="color: #64748B;">Tanggal Pengajuan</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.createdAt || item.date))}</span>

        ${item.approvedQty !== undefined ? `
          <span style="color: #116834; font-weight: 700;">Banyaknya Disetujui</span>
          <span style="font-weight: 800; color: #116834; text-align: right;">${parseInt(item.approvedQty, 10).toLocaleString('id-ID')} Pkk</span>
        ` : ''}

        ${item.approvedClone ? `
          <span style="color: #116834; font-weight: 700;">Klon Disetujui</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.approvedClone)}</span>
        ` : ''}

        ${item.targetDivisionName || item.targetDivisionId ? `
          <span style="color: #116834; font-weight: 700;">Divisi Bibitan</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.targetDivisionName || item.targetDivisionId)}</span>
        ` : ''}

        ${item.estimatedDeliveryDate ? `
          <span style="color: #116834; font-weight: 700;">Estimasi Kirim</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(formatDate(item.estimatedDeliveryDate))}</span>
        ` : ''}

        ${item.processedByName ? `
          <span style="color: #64748B;">Diproses Oleh</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.processedByName)}</span>
        ` : ''}

        ${item.verifiedAskepByName ? `
          <span style="color: #64748B;">Asisten Kepala</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.verifiedAskepByName)}</span>
        ` : ''}

        ${(item.revisionReason || item.returnReason) ? `
          <span style="color: #BE123C; font-weight: 700;">Catatan Revisi</span>
          <span style="font-weight: 700; color: #BE123C; text-align: right; overflow-wrap: anywhere;">${esc(item.revisionReason || item.returnReason)}</span>
        ` : ''}

        ${item.returnedByName ? `
          <span style="color: #64748B;">Dikembalikan Oleh</span>
          <span style="font-weight: 700; color: #BE123C; text-align: right;">${esc(item.returnedByName)}</span>
        ` : ''}

        ${item.verifiedByName ? `
          <span style="color: #15803D; font-weight: 700;">Diverifikasi Oleh</span>
          <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.verifiedByName)}</span>
        ` : ''}

        ${item.rejectionReason ? `
          <span style="color: #DC2626; font-weight: 700;">Alasan Penolakan</span>
          <span style="font-weight: 700; color: #DC2626; text-align: right; overflow-wrap: anywhere;">${esc(item.rejectionReason)}</span>
        ` : ''}
      </div>

      ${renderTimelineStepper(item)}

      ${cardActionButtons}

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 6px; border-top: 1px solid #F1F5F9;">
        <button class="btn-collapse-card" data-index="${index}" type="button" style="background: transparent; border: none; color: #64748B; font-size: 0.72rem; font-weight: 600; cursor: pointer; padding: 4px 8px;">
          Tutup Detail ▲
        </button>
      </div>
    </div>
  ` : '';

  // Unexpanded footer markup
  let unexpandedFooter = '';
  if (!isExpanded) {
    let actionGroupHtml = '';
    if (isPengurusAuthorized && (status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS')) {
      actionGroupHtml = `
        <button 
          class="btn-action-review" 
          data-index="${index}" 
          type="button" 
          style="width:100%; min-height:46px; padding:8px 12px; background:#116834; border:none; border-radius:10px; font-size:0.88rem; font-weight:700; color:#FFFFFF; cursor:pointer; box-shadow:0 2px 6px rgba(17,104,52,0.2); display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box;"
        >
          Tinjau Permintaan
        </button>
      `;
    } else if (isAskepAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' || status === 'PERLU_REVISI_ASISTEN_KEPALA')) {
      actionGroupHtml = `
        <button 
          class="btn-card-askep-return" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; border:1px solid #DC2626; color:#DC2626; background:#FFFFFF; font-size:.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Kembalikan
        </button>
        <button 
          class="btn-card-askep-process" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; background:#116834; color:#FFFFFF; border:1px solid #116834; font-size:.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Verifikasi
        </button>
      `;
    } else if (isAsistenAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || status === 'MENUNGGU_VERIFIKASI_ASISTEN')) {
      actionGroupHtml = `
        <button 
          class="btn-card-return" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; border:1px solid #DC2626; color:#DC2626; background:#FFFFFF; font-size:.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Kembalikan
        </button>
        <button 
          class="btn-card-verify" 
          data-index="${index}" 
          type="button" 
          style="flex:1; min-width:0; min-height:46px; background:#116834; color:#FFFFFF; border:1px solid #116834; font-size:.82rem; font-weight:700; padding:8px 10px; border-radius:9px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-align:center; line-height:1.25; box-sizing:border-box; white-space:normal;"
        >
          Verifikasi
        </button>
      `;
    }

    unexpandedFooter = `
      ${actionGroupHtml ? `<div class="action-footer" style="display: flex; gap: 6px; align-items: center; justify-content: space-between; border-top: 1px dashed #F1F5F9; padding-top: 8px; margin-top: 6px;">
        <div class="action-group" style="display:flex; flex:1; gap:8px; align-items:stretch;">
          ${actionGroupHtml}
        </div>
      </div>` : ''}
    `;
  }

  return `
    <div class="request-card" data-card-index="${index}" style="background: #FFFFFF; border: 1px solid ${isExpanded ? '#116834' : '#E2E8F0'}; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: border-color 0.15s ease;">
      
      <!-- ROW 1: NO DOKUMEN & BADGE STATUS -->
      <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #F1F5F9; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; min-width:0;">
          <div style="font-size:.68rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:.05em; line-height:1.2;">Dokumen Permintaan</div>
        <span style="font-size: 0.65rem; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 3px 8px; border-radius: 6px; text-transform: none; flex: 0 1 auto; min-width:0; max-width:58%; text-align:center; white-space:normal; overflow-wrap:anywhere; line-height: 1.25;">
          ${esc(badgeText)}
        </span>
        </div>
        <div style="font-size:.95rem; font-weight:800; color:#116834; line-height:1.35; overflow-wrap:anywhere; word-break:break-word;">${esc(docNo)}</div>
      </div>

      <!-- ROW 2: KEBUN ASAL → KEBUN DITUJU -->
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 0.78rem; background: #F8FAFC; padding: 6px 10px; border-radius: 6px; border: 1px solid #F1F5F9;">
        <span style="font-weight: 700; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%;">${esc(sourceName)}</span>
        <span style="color: #94A3B8; font-weight: 800; flex-shrink: 0;">→</span>
        <span style="font-weight: 700; color: #116834; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%;">${esc(targetName)}</span>
      </div>

      <!-- ROW 3: 2x2 Grid Informasi Permintaan -->
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; font-size: 0.78rem; margin-bottom: 8px;">
        <div style="min-width: 0;">
          <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 1px;">Pemohon:</div>
          <div style="font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(item.requestedBy || item.createdByName || '-')}</div>
        </div>
        <div style="min-width: 0;">
          <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 1px;">Klon Diminta:</div>
          <div style="font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(item.requestedClone || item.klon || '-')}</div>
        </div>
        <div style="min-width: 0;">
          <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 1px;">Banyaknya Diminta:</div>
          <div style="font-weight: 800; color: #116834; white-space: nowrap;">${qtyFormatted} Pkk</div>
        </div>
        <div style="min-width: 0;">
          <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 1px;">Tanggal Dibutuhkan:</div>
          <div style="font-weight: 600; color: #475569; white-space: nowrap;">${esc(formattedDate)}</div>
        </div>
      </div>

      <!-- Detail Expandable Area Toggle Button -->
      <button class="btn-toggle-expand btn-expand-card" data-index="${index}" type="button" style="width: 100%; min-height: 36px; background: transparent; border: none; border-top: 1px dashed #E2E8F0; padding: 6px 0 2px 0; font-size: 0.74rem; color: #116834; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: color 0.15s ease;">
        <span>${isExpanded ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}</span>
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" fill="none" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s ease;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      ${expandedSection}
      ${unexpandedFooter}

    </div>
  `;
}

/**
 * Render Tampilan Kosong (Empty State)
 */
function renderEmptyState(tab) {
  const isMyReq = tab === 'MY_REQUESTS';
  const title = isMyReq ? 'Belum Ada Permintaan' : 'Belum Ada Permintaan Masuk';
  const desc = isMyReq 
    ? 'Belum ada permintaan bibit kebun sepupu yang Anda buat.'
    : 'Belum ada permintaan bibit yang ditujukan ke kebun Anda.';

  return renderEmptyStateCard({
    title,
    description: desc,
    customStyle: 'margin-top: 8px;'
  });
}

/**
 * Modal Detail Transaksi (Read-Only Detail View + Conditional Actions)
 */
function showDetailModal(item, currentUser) {
  const docNo = item.docNo || item.nomorDokumen || '-';
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || '-');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || '-');
  const qtyFormatted = parseInt(item.qty || item.requestedQty || 0, 10).toLocaleString('id-ID');
  const status = (item.status || 'DIAJUKAN').toUpperCase();

  openModal({
    title: 'Detail Permintaan Bibit Kebun Sepupu',
    body: `
      <div style="padding: 4px 0;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; font-size: 0.82rem;">
          
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;">
            <span style="color: #64748B;">No. Dokumen</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${esc(docNo)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Status</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(status)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kebun Asal</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(sourceName)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kebun Dituju</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(targetName)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tujuan Permintaan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.purpose || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kode Alokasi</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(formatAllocationDisplay(item.allocationCode))}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Klon Diminta</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedClone || item.klon || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kategori</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.category || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tahapan Pertumbuhan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tanggal Dibutuhkan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.requiredDate))}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tanggal Pengajuan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.createdAt || item.date))}</span>
          </div>

          ${item.approvedQty !== undefined ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #BBF7D0;">
              <span style="color: #15803D; font-weight: 700;">Banyaknya Disetujui</span>
              <span style="font-weight: 800; color: #15803D; text-align: right;">${parseInt(item.approvedQty, 10).toLocaleString('id-ID')} Pkk</span>
            </div>
          ` : ''}

          ${item.approvedClone ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #15803D; font-weight: 700;">Klon Disetujui</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.approvedClone)}</span>
            </div>
          ` : ''}

          ${item.targetDivisionName || item.targetDivisionId ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #15803D; font-weight: 700;">Divisi Bibitan</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.targetDivisionName || item.targetDivisionId)}</span>
            </div>
          ` : ''}

          ${item.estimatedDeliveryDate ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #15803D; font-weight: 700;">Estimasi Kirim</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(formatDate(item.estimatedDeliveryDate))}</span>
            </div>
          ` : ''}

          ${item.processedByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #E2E8F0;">
              <span style="color: #64748B;">Diproses / Direview Oleh</span>
              <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.processedByName)}</span>
            </div>
          ` : ''}

          ${item.verifiedAskepByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #64748B;">Asisten Kepala</span>
              <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.verifiedAskepByName)}</span>
            </div>
          ` : ''}

          ${item.verifiedAskepAt ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #64748B;">Verifikasi Askep</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.verifiedAskepAt))}</span>
            </div>
          ` : ''}

          ${(item.revisionReason || item.returnReason) ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #FECDD3;">
              <span style="color: #BE123C; font-weight: 700;">Catatan Revisi</span>
              <span style="font-weight: 700; color: #991B1B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.revisionReason || item.returnReason)}</span>
            </div>
          ` : ''}

          ${item.returnedByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #64748B;">Dikembalikan Oleh</span>
              <span style="font-weight: 700; color: #BE123C; text-align: right;">${esc(item.returnedByName)}</span>
            </div>
          ` : ''}

          ${item.verifiedByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #BBF7D0;">
              <span style="color: #15803D; font-weight: 700;">Diverifikasi Oleh</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.verifiedByName)}</span>
            </div>
          ` : ''}

          ${item.rejectionReason ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #FECACA;">
              <span style="color: #B91C1C; font-weight: 700;">Alasan Penolakan</span>
              <span style="font-weight: 700; color: #991B1B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.rejectionReason)}</span>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: baseline; margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span style="color: #64748B; font-weight: 600;">Banyaknya Diminta</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: #116834; text-align: right;">${qtyFormatted} Pkk</span>
          </div>

          ${renderTimelineStepper(item)}

        </div>
      </div>
    `,
    footer: `
      <div style="width: 100%;">
        <button class="btn btn-ghost" id="btn-close-detail" style="width: 100%; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Tutup</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-close-detail')?.addEventListener('click', closeModal);
}

/**
 * Event Listeners untuk Halaman Hub
 */
function attachLandingEvents(items, currentUser) {
  const app = document.getElementById('app');
  if (!app) return;

  // Back Button -> /request
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/request');
  });

  // Refresh Button dengan animasi putar
  app.querySelector('#btn-refresh')?.addEventListener('click', () => {
    const icon = app.querySelector('#sync-icon-svg');
    if (icon) {
      icon.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        if (icon) icon.style.transform = 'rotate(0deg)';
      }, 600);
    }
    renderRequestKebunSepupuLanding();
  });

  // Action Button -> /request/kebun-sepupu/form
  const goToForm = () => navigate('/request/kebun-sepupu/form');
  app.querySelector('#btn-create-request')?.addEventListener('click', goToForm);
  app.querySelector('#btn-empty-create')?.addEventListener('click', goToForm);

  // Tab Switcher
  app.querySelector('#tab-my-requests')?.addEventListener('click', () => {
    if (activeTab !== 'MY_REQUESTS') {
      activeTab = 'MY_REQUESTS';
      activeStatusFilter = 'SEMUA';
      expandedCardIndex = -1;
      renderRequestKebunSepupuLanding();
    }
  });

  app.querySelector('#tab-incoming-requests')?.addEventListener('click', () => {
    if (activeTab !== 'INCOMING_REQUESTS') {
      activeTab = 'INCOMING_REQUESTS';
      activeStatusFilter = 'SEMUA';
      expandedCardIndex = -1;
      renderRequestKebunSepupuLanding();
    }
  });

  // Status Filter Pills
  app.querySelectorAll('.filter-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.getAttribute('data-status');
      if (activeStatusFilter !== status) {
        activeStatusFilter = status;
        expandedCardIndex = -1;
        renderRequestKebunSepupuLanding();
      }
    });
  });

  // Expand Card Buttons & Toggle Expand
  app.querySelectorAll('.btn-expand-card, .btn-toggle-expand').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      expandedCardIndex = expandedCardIndex === idx ? -1 : idx;
      renderRequestKebunSepupuLanding();
    });
  });

  // Collapse Card Buttons
  app.querySelectorAll('.btn-collapse-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      expandedCardIndex = -1;
      renderRequestKebunSepupuLanding();
    });
  });

  // Pengurus Card Action: Buka Form Modal Review Permintaan
  app.querySelectorAll('.btn-action-review, .btn-card-process').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openReviewModal(items[idx], currentUser);
      }
    });
  });

  // Pengurus Card Action: Tolak Permintaan
  app.querySelectorAll('.btn-card-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        handleRejectRequestModal(items[idx], currentUser);
      }
    });
  });

  // Askep Card Action: Buka Form Modal Review & Verifikasi Askep
  app.querySelectorAll('.btn-card-askep-process').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openAskepReviewModal(items[idx], currentUser);
      }
    });
  });

  // Askep Card Action: Kembalikan ke Pengurus
  app.querySelectorAll('.btn-card-askep-return').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openAskepReturnModal(items[idx], currentUser);
      }
    });
  });

  // Asisten Card Action: Verifikasi & Teruskan
  app.querySelectorAll('.btn-card-verify').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openVerifyModal(items[idx], currentUser);
      }
    });
  });

  // Asisten Card Action: Kembalikan ke Asisten Kepala
  app.querySelectorAll('.btn-card-return').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openReturnModal(items[idx], currentUser);
      }
    });
  });
}
