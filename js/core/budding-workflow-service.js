import { storage } from './storage.js';
import { generateUniqueDocNo } from './utils.js';

const APPROVED_STATES = new Set(['DISETUJUI', 'TERVERIFIKASI', 'APPROVED', 'VERIFIED']);
const RETURNED_STATES = new Set(['DIKEMBALIKAN', 'REVISION']);
const CANCELLED_STATES = new Set(['BATAL', 'CANCELLED', 'VOID', 'DIBATALKAN', 'DITARIK', 'WITHDRAWN']);

function norm(value) {
  return String(value || '').trim().toUpperCase();
}

function hasApprovedState(record) {
  if (!record) return false;
  return APPROVED_STATES.has(norm(record.status)) || APPROVED_STATES.has(norm(record.verificationStatus));
}

function hasReturnedState(record) {
  if (!record) return false;
  return RETURNED_STATES.has(norm(record.status)) || RETURNED_STATES.has(norm(record.verificationStatus));
}

function isCancelled(record) {
  if (!record) return true;
  return CANCELLED_STATES.has(norm(record.status)) || CANCELLED_STATES.has(norm(record.verificationStatus));
}

function matchesReference(verification, record, referenceTypes) {
  if (!verification || !record) return false;
  const type = norm(verification.referenceType || verification.moduleType);
  if (referenceTypes?.length && !referenceTypes.map(norm).includes(type)) return false;
  const ids = new Set([record.id, record.docNo].filter(Boolean).map(String));
  return ids.has(String(verification.referenceId || '')) || ids.has(String(verification.referenceDocNo || ''));
}

/** Persetujuan eksplisit Asisten; isFinal saja tidak dianggap sebagai persetujuan. */
export function isBuddingWorkflowRecordApproved(record, referenceTypes = []) {
  if (!record || isCancelled(record) || hasReturnedState(record)) return false;
  const verifications = storage.get('verification_transactions', []);
  const latestVerification = Array.isArray(verifications)
    ? verifications.filter(v => matchesReference(v, record, referenceTypes))
      .sort((a, b) => new Date(b.updatedAt || b.verifiedAt || b.createdAt || 0) - new Date(a.updatedAt || a.verifiedAt || a.createdAt || 0))[0]
    : null;
  if (latestVerification) return hasApprovedState(latestVerification) && !hasReturnedState(latestVerification);
  return hasApprovedState(record);
}

export function isBuddingWorkflowRecordReturned(record) {
  if (!record) return false;
  const verifications = storage.get('verification_transactions', []);
  const latestVerification = Array.isArray(verifications)
    ? verifications.filter(v => matchesReference(v, record, []))
      .sort((a, b) => new Date(b.updatedAt || b.verifiedAt || b.createdAt || 0) - new Date(a.updatedAt || a.verifiedAt || a.createdAt || 0))[0]
    : null;
  return latestVerification ? hasReturnedState(latestVerification) : hasReturnedState(record);
}

function getDeclaredCullsForBudding(budding) {
  if (!budding?.docNo) return [];
  const transactions = storage.get('selection_transactions', []);
  if (!Array.isArray(transactions)) return [];
  const isRegrafting = norm(budding.type) === 'REGRAFTING';
  const expectedOrigins = isRegrafting ? new Set(['REJECT_REGRAFTING', 'REJECT_OKULASI']) : new Set(['REJECT_OKULASI']);
  return transactions.filter(tx => {
    if (!tx || isCancelled(tx)) return false;
    const origin = norm(tx.originType);
    const type = norm(tx.sourceTransactionType || tx.transactionType);
    const linkedDoc = String(tx.buddingDocNo || tx.sourceBuddingDocNo || tx.sourceTransactionId || tx.sourceDocNo || '');
    return expectedOrigins.has(origin) && linkedDoc === String(budding.docNo) &&
      (!type || type === (isRegrafting ? 'REGRAFTING' : 'GRAFTING'));
  });
}

function getDeclaredCullsForInspection(inspection) {
  if (!inspection?.docNo) return [];
  const transactions = storage.get('selection_transactions', []);
  if (!Array.isArray(transactions)) return [];
  return transactions.filter(tx => {
    if (!tx || isCancelled(tx)) return false;
    const linkedDoc = String(tx.inspectionDocNo || tx.sourceInspectionDocNo || '');
    return norm(tx.originType) === 'REJECT_PEMERIKSAAN' && linkedDoc === String(inspection.docNo);
  });
}

function sumApprovedCullQty(culls) {
  return culls.reduce((sum, tx) => {
    if (!isBuddingWorkflowRecordApproved(tx, ['PENYELEKSIAN', 'SELECTION'])) return sum;
    return sum + Number(tx.jumlahAfkir || tx.quantity || 0);
  }, 0);
}

/** Gate Grafting/Regrafting -> Pemeriksaan, termasuk persetujuan deklarasi afkir jika ada. */
export function getBuddingInspectionGate(budding) {
  const type = norm(budding?.type) === 'REGRAFTING' ? 'REGRAFTING' : 'GRAFTING';
  if (!budding || isCancelled(budding)) {
    return { allowed: false, reason: 'Transaksi Okulasi tidak aktif.' };
  }
  if (isBuddingWorkflowRecordReturned(budding)) {
    return { allowed: false, reason: 'Transaksi dikembalikan Asisten dan perlu diperbaiki.' };
  }
  if (!isBuddingWorkflowRecordApproved(budding, ['OKULASI', 'BUDDING'])) {
    return { allowed: false, reason: 'Menunggu persetujuan transaksi dari Asisten Bibitan.' };
  }

  const jumlahDitolak = Number(budding.jumlahDitolak || 0);
  if (jumlahDitolak > 0) {
    const culls = getDeclaredCullsForBudding(budding);
    const declaredQty = culls.reduce((sum, tx) => sum + Number(tx.jumlahAfkir || tx.quantity || 0), 0);
    const approvedQty = sumApprovedCullQty(culls);
    if (declaredQty !== jumlahDitolak) {
      return { allowed: false, reason: `Jumlah deklarasi afkir ${type} harus tepat ${jumlahDitolak} Pkk (saat ini ${declaredQty} Pkk).` };
    }
    if (approvedQty < jumlahDitolak) {
      return { allowed: false, reason: 'Menunggu persetujuan deklarasi afkir oleh Asisten Bibitan.' };
    }
  }

  return { allowed: true, reason: '' };
}

export function isBuddingWorkflowInspectionApproved(inspection) {
  return Boolean(inspection && !isCancelled(inspection) && !isBuddingWorkflowRecordReturned(inspection) &&
    isBuddingWorkflowRecordApproved(inspection, ['PEMERIKSAAN', 'INSPECTION']));
}

/**
 * Hasil Pemeriksaan membuka alokasi hilir hanya setelah persetujuan Asisten.
 * Upsert dibuat idempoten berdasarkan dokumen Pemeriksaan sumber.
 */
export function syncApprovedInspectionOutputs(inspection, approver = null) {
  if (!isBuddingWorkflowInspectionApproved(inspection)) return false;

  let changed = false;
  const inspectionDocNo = String(inspection.docNo || '').replace('/PRK/', '/INS/').replace('/INSP/', '/INS/');
  const buddingType = norm(inspection.buddingType) === 'REGRAFTING' ? 'REGRAFTING' : 'GRAFTING';
  const toRegraft = Number(inspection.totalToRegrafting || 0);
  const toSelection = Number(inspection.totalToSelection || 0);

  let regraftPool = storage.get('regrafting_pool', []);
  if (!Array.isArray(regraftPool)) regraftPool = [];
  const poolIdx = regraftPool.findIndex(p => String(p.inspectionDocNo || '') === inspectionDocNo);
  if (toRegraft > 0) {
    const existing = poolIdx >= 0 ? regraftPool[poolIdx] : null;
    const approvedBy = approver?.name || approver?.fullName || 'Asisten Bibitan';
    const candidate = {
      ...(existing || {}),
      id: existing?.id || `REG-POOL-${inspectionDocNo}`,
      docNo: existing?.docNo || generateUniqueDocNo('regrafting', regraftPool, 2026),
      inspectionDocNo,
      batchNo: inspection.batchNo || 'Batch',
      sourceBuddingDocNo: inspection.buddingDocNo || null,
      sourceDocNo: inspection.sourceDocNo || inspection.buddingDocNo || null,
      tanggal: inspection.tanggal || inspection.date || '',
      bedengan: inspection.bedengan || '',
      klonRootstock: inspection.klonRootstock || 'GT 1',
      klonAwal: inspection.klonEntres || 'PB 260',
      jumlah: toRegraft,
      approvedAllocationQty: toRegraft,
      sisaRegrafting: existing?.sisaRegrafting ?? toRegraft,
      allocationStatus: 'APPROVED',
      approvedByName: approvedBy,
      status: 'READY_TO_REGRAFT'
    };
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(candidate)) {
        regraftPool[poolIdx] = candidate;
        changed = true;
      }
    } else {
      regraftPool.push(candidate);
      changed = true;
    }
  } else if (poolIdx >= 0 && !regraftPool[poolIdx].consumedByRegraftingDocNo) {
    regraftPool.splice(poolIdx, 1);
    changed = true;
  }
  if (changed) storage.set('regrafting_pool', regraftPool);

  let selectionPool = storage.get('selection_pool', []);
  if (!Array.isArray(selectionPool)) selectionPool = [];
  const selectionIdx = selectionPool.findIndex(p =>
    p.originType === 'REJECT_PEMERIKSAAN' && String(p.inspectionDocNo || '').replace('/PRK/', '/INS/').replace('/INSP/', '/INS/') === inspectionDocNo
  );
  if (toSelection > 0) {
    const existing = selectionIdx >= 0 ? selectionPool[selectionIdx] : null;
    const candidate = {
      ...(existing || {}),
      id: existing?.id || `SEL-POOL-INS-${inspectionDocNo}`,
      docNo: existing?.docNo || null,
      originType: 'REJECT_PEMERIKSAAN',
      sourceModule: 'INSPECTION',
      sourceTransactionType: buddingType,
      selectionType: 'PASCA_OKULASI',
      selectionStage: 'SELEKSI_PASCA_OKULASI',
      inspectionDocNo,
      sourceInspectionDocNo: inspectionDocNo,
      sourceBuddingDocNo: inspection.buddingDocNo || null,
      sourceTransactionId: inspection.docNo,
      sourceDocNo: inspection.buddingDocNo || inspection.sourceDocNo || '',
      batchNo: inspection.batchNo || 'Batch',
      bedengan: inspection.bedengan || '',
      klon: inspection.klonEntres || '',
      klonRootstock: inspection.klonRootstock || '',
      jumlahAfkir: toSelection,
      alasan: `Mati / Gagal setelah ${buddingType === 'REGRAFTING' ? 'Okulasi Janda (Regrafting)' : 'Okulasi (Grafting)'}`,
      status: existing?.status || 'PENDING_DECLARATION',
      allocationStatus: 'APPROVED'
    };
    if (selectionIdx >= 0) selectionPool[selectionIdx] = candidate;
    else selectionPool.push(candidate);
    storage.set('selection_pool', selectionPool);
    changed = true;
  } else if (selectionIdx >= 0 && !selectionPool[selectionIdx].selectionTransactionId) {
    selectionPool.splice(selectionIdx, 1);
    storage.set('selection_pool', selectionPool);
    changed = true;
  }

  return changed;
}

export function canUseApprovedRegraftingPool(poolItem) {
  if (!poolItem?.inspectionDocNo || poolItem.allocationStatus === 'REVOKED') return false;
  const inspections = storage.get('inspection_transactions', []);
  const inspection = Array.isArray(inspections)
    ? inspections.find(item => String(item.docNo || '').replace('/PRK/', '/INS/').replace('/INSP/', '/INS/') === String(poolItem.inspectionDocNo).replace('/PRK/', '/INS/').replace('/INSP/', '/INS/'))
    : null;
  return isBuddingWorkflowInspectionApproved(inspection);
}

export function getInspectionSelectionGate(inspection) {
  if (!isBuddingWorkflowInspectionApproved(inspection)) {
    return { allowed: false, reason: 'Hasil Pemeriksaan belum disetujui Asisten Bibitan.' };
  }
  const expectedQty = Number(inspection.totalToSelection || 0);
  if (expectedQty <= 0) return { allowed: true, reason: '' };
  const culls = getDeclaredCullsForInspection(inspection);
  const declaredQty = culls.reduce((sum, tx) => sum + Number(tx.jumlahAfkir || tx.quantity || 0), 0);
  return declaredQty >= expectedQty
    ? { allowed: true, reason: '' }
    : { allowed: false, reason: `Deklarasi afkir Pasca-Okulasi belum lengkap (${declaredQty}/${expectedQty} Pkk).` };
}
