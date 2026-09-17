/**
 * js/modules/dispatch/dispatch-landing.js
 * Landing Page & Execution Module Pengeluaran Bibit (Role Mantri Bibitan, Pengurus, Asisten)
 * 
 * Prinsip:
 * 1 Dokumen Approval (Parent Request)
 *       ↓ 1 : N
 * N Transaksi Pengeluaran (Shipments)
 *       ↓ 1 : N
 * N Detail Batch Sumber
 * 
 * Sesuai Workflow Locked:
 * Pengurus Kebun Asal (DIAJUKAN)
 *       ↓
 * Pengurus Kebun Tujuan (Setujui & Teruskan -> MENUNGGU_VERIFIKASI_ASISTEN)
 *       ↓
 * Asisten Bibitan Kebun Tujuan (Verifikasi -> TERVERIFIKASI)
 *       ↓
 * Mantri Bibitan Kebun Tujuan (PENGELUARAN BIBIT -> MENUNGGU_PENGELUARAN_BIBIT / PENGELUARAN_BERJALAN -> SELESAI)
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { requestRepository, batchRepository } from '../../db/repositories.js';
import { resolveTransactionActor, applyTransactionActor, AUDIT_EVENT_TYPES } from '../../core/transaction-actor.js';
import { resolveEstate } from '../../data/estate-master.js';
import { resolveProgram } from '../../data/program-master.js';
import { getBatchContext } from '../../core/master-context-service.js';
import {
  deductBatchStock as deductInventoryStock,
  deductMultiBatchStock as deductMultiInventoryStock,
  getAvailableQty as getInventoryAvailableQty,
  INVENTORY_TX_TYPE
} from '../../core/batch-inventory-service.js';
import { formatDate, formatStandardDocNo, esc } from '../../core/utils.js';
import { createReceiptFromDispatch } from '../../core/receipt-ksp-manager.js';
import { RECEIPT_KSP_STATUS, RECEIPT_KSP_STATUS_LABELS } from '../../core/receipt-ksp-constants.js';

let activeStatusFilter = 'SEMUA'; // 'SEMUA' | 'TERVERIFIKASI' | 'PENGELUARAN_BERJALAN' | 'SELESAI'
let expandedCardIndex = -1;

/* SVG Icons sesuai visual baseline */
const ICONS = {
  reportDoc: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#116834" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  `,
  truck: `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#116834" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  `,
  sprout: `
    <svg viewBox="2 1.5 28 19" width="20" height="20" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `
};

import { DEFAULT_CANONICAL_BATCHES } from '../../data/batch-master.js';

/**
 * Default Seed Batches untuk Nursery (Canonical baseline)
 */
export const DEFAULT_NURSERY_BATCHES = DEFAULT_CANONICAL_BATCHES;

/**
 * Mengambil daftar batch nursery yang tersedia di storage / DB
 */
export function getNurseryBatches(estateId = null, clone = null, growthStage = null, divisionId = null, programId = null, bedenganId = null) {
  let batches = storage.get('nursery_batches', null);
  if (batches === null || !Array.isArray(batches)) {
    batches = [...DEFAULT_NURSERY_BATCHES];
    storage.set('nursery_batches', batches);
  }

  return batches.map(b => ({
    ...b,
    availableQty: getInventoryAvailableQty(b.id || b.batchId || b.batchCode || b.batchNo)
  })).filter(b => {
    const ctx = getBatchContext(b.id || b.batchId || b.batchCode || b.batchNo) || b;
    const isAvailable = (b.availableQty || 0) > 0 && b.status !== 'EMPTY' && b.status !== 'INACTIVE';
    const matchEstate = !estateId || (ctx.estateId || '').toUpperCase() === String(estateId).trim().toUpperCase();
    const matchDivision = !divisionId || (ctx.divisionId || '').toUpperCase() === String(divisionId).trim().toUpperCase();
    const matchProgram = !programId || ctx.programId === programId || (resolveProgram(programId)?.id === ctx.programId) || (b.programCode === programId) || (b.programId === programId);
    const matchBedengan = !bedenganId || (ctx.bedenganId || b.bedenganId || '').toUpperCase() === String(bedenganId).trim().toUpperCase() || (ctx.bedenganCode || b.bedenganCode || '').toUpperCase() === String(bedenganId).trim().toUpperCase();
    const batchClone = (b.clone || b.klon || '').trim().toUpperCase();
    const targetClone = (clone || '').trim().toUpperCase();
    const matchClone = !clone || batchClone === targetClone || (targetClone && batchClone.replace(/\s+/g, '') === targetClone.replace(/\s+/g, ''));
    const matchStage = !growthStage || b.stage === growthStage || b.growthStage === growthStage;
    return isAvailable && matchEstate && matchDivision && matchProgram && matchBedengan && matchClone && matchStage;
  });
}

/**
 * Mengurangi stok batch tunggal setelah pengeluaran (Delegasi ke Inventory Service)
 */
export function deductBatchStock(batchIdOrCode, qty) {
  const deductQty = parseInt(qty, 10);
  if (isNaN(deductQty) || deductQty <= 0) return false;

  try {
    deductInventoryStock(batchIdOrCode, deductQty, INVENTORY_TX_TYPE.DISPATCH, null, null, 'Pengeluaran bibit (Dispatch)');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Mengurangi stok multi-batch secara ATOMIK (Delegasi ke Inventory Service)
 */
export function deductMultiBatchStock(allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return { success: false, error: 'Daftar alokasi batch tidak boleh kosong.' };
  }

  const res = deductMultiInventoryStock(allocations, INVENTORY_TX_TYPE.DISPATCH, null, null);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  let batches = storage.get('nursery_batches', []);
  return { success: true, updatedBatches: batches };
}

/**
 * Mengambil seluruh transaksi pengeluaran (child records)
 */
export function getDispatchTransactions(parentRequestId = null) {
  const list = storage.get('dispatch_transactions', []);
  if (!parentRequestId) return list;
  return list.filter(d => d.parentRequestId === parentRequestId);
}

/**
 * Validasi otorisasi Mantri Bibitan untuk memproses pengeluaran dokumen
 * Otorisasi: Role (MANTRI_TANAMAN) + Estate + Division
 */
export function canPerformMantriDispatchAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'MANTRI_TANAMAN') return false;

  const isKebunSendiri = tx.type === 'KEBUN_SENDIRI' || tx.transactionType === 'KEBUN_SENDIRI';
  const userEstateId = currentUser.estateId;
  const targetEstate = isKebunSendiri ? (tx.requesterEstateId || tx.estateId) : (tx.targetNextEstateId || tx.targetEstateId);
  if (!userEstateId || targetEstate !== userEstateId) return false;

  // Routing validation: Estate + Division + Role
  const targetDivision = isKebunSendiri ? tx.fulfillmentDivisionId : (tx.targetNextDivisionId || tx.targetDivisionId);
  if (targetDivision && currentUser.divisionId && currentUser.divisionId !== targetDivision) {
    return false;
  }

  const status = (tx.status || '').toUpperCase();
  const isActionableStatus = (
    status === 'TERVERIFIKASI' ||
    status === 'MENUNGGU_PENGELUARAN_BIBIT' ||
    status === 'PENGELUARAN_BERJALAN'
  );
  if (!isActionableStatus) return false;

  const approvedQty = parseInt(tx.approvedQty || tx.requestedQty || 0, 10);
  const totalIssuedQty = parseInt(tx.totalIssuedQty || tx.actualIssuedQty || 0, 10);
  const remainingQty = tx.remainingQty !== undefined ? parseInt(tx.remainingQty, 10) : (approvedQty - totalIssuedQty);

  return remainingQty > 0;
}

/**
 * Menghitung jumlah dokumen permintaan yang actionable bagi Mantri aktif
 */
export function getActionableDispatchCount(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return 0;
  return requests.filter(tx => canPerformMantriDispatchAction(tx, currentUser)).length;
}

/**
 * Filter permohonan masuk ke kebun Mantri aktif untuk modul Pengeluaran
 */
export function filterDispatchRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const isMantri = userRole === 'MANTRI_TANAMAN';

  return requests.filter(tx => {
    const isKebunSendiri = tx.type === 'KEBUN_SENDIRI' || tx.transactionType === 'KEBUN_SENDIRI';
    const isRequestType = tx.type === 'KEBUN_SEPUPU' || isKebunSendiri || !tx.type;
    if (!isRequestType) return false;

    const userEstateId = currentUser.estateId;
    const targetEstate = isKebunSendiri ? (tx.requesterEstateId || tx.estateId) : (tx.targetNextEstateId || tx.targetEstateId);
    const isTarget = targetEstate === userEstateId;
    if (!isTarget) return false;

    // Jika Mantri, isolasi berdasarkan Divisi Target
    if (isMantri) {
      const targetDivision = isKebunSendiri ? tx.fulfillmentDivisionId : (tx.targetNextDivisionId || tx.targetDivisionId);
      if (targetDivision && currentUser.divisionId && currentUser.divisionId !== targetDivision) {
        return false;
      }
    }

    const status = (tx.status || '').toUpperCase();
    const isRelevant = (
      status === 'TERVERIFIKASI' ||
      status === 'MENUNGGU_PENGELUARAN_BIBIT' ||
      status === 'PENGELUARAN_BERJALAN' ||
      status === 'MENUNGGU_VERIFIKASI_PENGELUARAN' ||
      status === 'MENUNGGU_PENERIMAAN' ||
      status === 'MENUNGGU_PENERIMAAN_PENGURUS' ||
      status === 'SELESAI'
    );

    return isRelevant;
  });
}

/**
 * Filter berdasarkan status tab pengeluaran
 */
export function filterDispatchByStatus(requests, statusFilter) {
  if (!Array.isArray(requests)) return [];
  if (!statusFilter || statusFilter === 'SEMUA') return requests;

  return requests.filter(tx => {
    const s = (tx.status || '').toUpperCase();
    if (statusFilter === 'TERVERIFIKASI') {
      return s === 'TERVERIFIKASI' || s === 'MENUNGGU_PENGELUARAN_BIBIT';
    }
    if (statusFilter === 'PENGELUARAN_BERJALAN') {
      return s === 'PENGELUARAN_BERJALAN';
    }
    if (statusFilter === 'SELESAI') {
      return s === 'SELESAI' || s === 'APPROVED' || s === 'MENUNGGU_PENERIMAAN_PENGURUS';
    }
    return s === statusFilter;
  });
}

/**
 * Validasi form pengeluaran sebelum simpan (Transaction Level, Batch Level, Multi-user Check)
 */
export function validateShipmentForm(req, formValues, availableBatches = null) {
  const makeError = (err) => ({
    valid: false,
    isValid: false,
    error: err,
    errors: [err]
  });

  if (!req) return makeError('Dokumen approval tidak valid');

  const approvedQty = parseInt(req.approvedQty || req.requestedQty || 0, 10);
  const totalIssuedSoFar = parseInt(req.totalIssuedQty || req.actualIssuedQty || 0, 10);
  const currentRemaining = approvedQty - totalIssuedSoFar;

  if (currentRemaining <= 0) {
    return makeError('Seluruh kuota pengeluaran untuk dokumen ini sudah terpenuhi (Sisa 0 Pkk)');
  }

  const issuedDate = formValues.issuedDate || formValues.shipmentDate;
  const shipmentQty = formValues.shipmentQty;
  const batchRows = formValues.batchRows || formValues.batchDetails;

  // 1. Tanggal Pengeluaran
  if (!issuedDate || !issuedDate.trim()) {
    return makeError('Tanggal pengeluaran wajib diisi');
  }

  // 2. Banyaknya Pengeluaran (shipmentQty)
  const qty = parseInt(shipmentQty, 10);
  if (isNaN(qty) || qty <= 0) {
    return makeError('Banyaknya pengeluaran harus berupa angka lebih besar dari 0');
  }
  if (qty > currentRemaining) {
    return makeError(`Banyaknya pengeluaran (${qty.toLocaleString('id-ID')} Pkk) melebihi sisa belum dikeluarkan (${currentRemaining.toLocaleString('id-ID')} Pkk)`);
  }

  // 3. Detail Batch Sumber
  if (!Array.isArray(batchRows) || batchRows.length === 0) {
    return makeError('Minimal pilih satu batch sumber pengeluaran');
  }

  const allEstateBatches = getNurseryBatches(req.targetEstateId);
  const batchList = availableBatches || allEstateBatches;
  const selectedBatchCodes = new Set();
  let totalBatchQty = 0;

  for (let i = 0; i < batchRows.length; i++) {
    const row = batchRows[i];
    const bCode = (row.batchCode || row.batchId || row.batchNo || '').trim();
    if (!bCode) {
      return makeError(`Baris batch ke-${i + 1}: Silakan pilih batch sumber`);
    }

    if (selectedBatchCodes.has(bCode)) {
      return makeError(`Batch ${bCode} dipilih lebih dari satu kali dalam satu transaksi (duplikat). Konsolidasikan jumlahnya.`);
    }
    selectedBatchCodes.add(bCode);

    const bQty = parseInt(row.qty, 10);
    if (isNaN(bQty) || bQty <= 0) {
      return makeError(`Baris batch ke-${i + 1} (${bCode}): Jumlah pengeluaran harus > 0`);
    }

    const batchObj = batchList.find(b => b.id === bCode || b.batchId === bCode || b.batchCode === bCode || b.batchNo === bCode);
    if (!batchObj) {
      return makeError(`Batch ${bCode} tidak ditemukan atau tidak aktif`);
    }

    // Pastikan klon batch sesuai dengan approvedClone
    const batchClone = (batchObj.clone || batchObj.klon || '').trim().toUpperCase();
    const reqClone = (req.approvedClone || req.requestedClone || '').trim().toUpperCase();
    if (batchClone !== reqClone) {
      return makeError(`Klon pada batch ${bCode} (${batchObj.clone}) tidak sesuai dengan klon yang disetujui (${req.approvedClone})`);
    }

    if (batchObj.availableQty === undefined || batchObj.availableQty === null) {
      return makeError(`Stok batch ${bCode} belum tersedia untuk divalidasi. Validasi stok wajib.`);
    }

    const avail = parseInt(batchObj.availableQty || 0, 10);
    if (bQty > avail) {
      return makeError(`Jumlah pengeluaran batch ${bCode} (${bQty.toLocaleString('id-ID')} Pkk) melebihi stok tersedia (${avail.toLocaleString('id-ID')} Pkk)`);
    }

    const reqGrowthStage = (req.growthStage || '').trim().toUpperCase();
    const batchGrowthStage = (batchObj.stage || batchObj.growthStage || '').trim().toUpperCase();
    if (reqGrowthStage && batchGrowthStage && batchGrowthStage !== reqGrowthStage) {
      return makeError(`Tahap pertumbuhan batch ${bCode} (${batchObj.stage}) tidak sesuai dengan dokumen (${req.growthStage})`);
    }

    totalBatchQty += bQty;
  }

  // 4. Konsistensi Total
  if (totalBatchQty !== qty) {
    return makeError(`Total alokasi detail batch (${totalBatchQty.toLocaleString('id-ID')} Pkk) tidak sama dengan Banyaknya Pengeluaran (${qty.toLocaleString('id-ID')} Pkk)`);
  }

  return {
    valid: true,
    isValid: true,
    errors: [],
    shipmentQty: qty,
    totalBatchQty,
    remainingAfter: currentRemaining - qty
  };
}

/**
 * Eksekusi Simpan Transaksi Pengeluaran oleh Mantri Bibitan
 */
export async function processDispatchShipment(parentRequest, formValues, currentUser) {
  // Re-fetch request terbaru untuk multi-user safety
  const allRequests = storage.get('requests_transactions', []);
  const req = allRequests.find(r => r.id === parentRequest.id) || parentRequest;

  // Re-fetch batch stok terbaru
  const isKebunSendiri = req.type === 'KEBUN_SENDIRI' || req.transactionType === 'KEBUN_SENDIRI';
  const estateForBatches = isKebunSendiri ? (req.requesterEstateId || req.estateId) : req.targetEstateId;
  const availableBatches = getNurseryBatches(estateForBatches, req.approvedClone || req.requestedClone);

  // Validasi ketat
  const val = validateShipmentForm(req, formValues, availableBatches);
  if (!val.valid) {
    throw new Error(val.error);
  }

  const issuedDate = formValues.issuedDate || formValues.shipmentDate;
  const shipmentQty = parseInt(formValues.shipmentQty, 10);
  const batchRows = formValues.batchRows || formValues.batchDetails;
  const vehiclePlate = formValues.vehiclePlate || formValues.vehicleNo;
  const driverName = formValues.driverName || null;
  const remarks = formValues.remarks || null;
  const photoEvidence = formValues.photoEvidence || null;
  const existingShipments = getDispatchTransactions(req.id);
  const shipmentNo = existingShipments.length + 1;

  // 1. Kurangi stok setiap batch secara ATOMIK
  const allocations = batchRows.map(row => ({
    batchIdOrCode: (row.batchCode || row.batchId || row.batchNo || '').trim(),
    qty: parseInt(row.qty, 10)
  }));

  const multiDeductResult = deductMultiBatchStock(allocations);
  if (!multiDeductResult.success) {
    throw new Error(multiDeductResult.error || 'Gagal mengalokasikan stok batch.');
  }

  const batchDetails = [];
  for (const row of batchRows) {
    const bCode = (row.batchCode || row.batchId || row.batchNo || '').trim();
    const bQty = parseInt(row.qty, 10);
    const batchObj = availableBatches.find(b => b.id === bCode || b.batchId === bCode || b.batchCode === bCode || b.batchNo === bCode);

    batchDetails.push({
      batchId: batchObj ? (batchObj.batchId || batchObj.id) : bCode,
      batchCode: batchObj ? (batchObj.batchCode || batchObj.batchNo) : bCode,
      clone: batchObj ? (batchObj.clone || batchObj.klon) : (req.approvedClone || req.requestedClone),
      growthStage: batchObj ? (batchObj.growthStage || batchObj.stage) : (req.growthStage || 'Rubber Advance Planting Material'),
      category: batchObj ? batchObj.category : (req.category || 'Polibag Besar'),
      qty: bQty
    });
  }

  // 2. Buat record transaksi pengeluaran (Child Entity)
  const allDispatches = storage.get('dispatch_transactions', []);
  const dispatchDocNo = formatStandardDocNo(2026, 'DSP', allDispatches.length + 1);

  const dispatchId = `DSP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newDispatchRecord = applyTransactionActor(
    {
      id: dispatchId,
      dispatchId: dispatchId,
      docNo: dispatchDocNo,
      dispatchNo: dispatchDocNo,
      parentRequestId: req.id,
      parentRequestDocNo: req.docNo,
      transactionType: 'PENGELUARAN_BIBIT',
      estateId: currentUser.estateId,
      targetEstateId: req.estateId, // Kebun Asal Pemohon
      divisionId: currentUser.divisionId || req.targetDivisionId,
      targetDivisionId: req.targetDivisionId,
      targetDivisionName: req.targetDivisionName,
      issuedDate: issuedDate,
      issuedQty: shipmentQty,
      clone: req.approvedClone || req.requestedClone,
      issuedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      issuedByName: currentUser.name || 'Mantri Bibitan',
      issuedByRole: 'MANTRI_TANAMAN',
      issuedByEstateId: currentUser.estateId,
      vehiclePlate: vehiclePlate || null,
      photoEvidence: photoEvidence || null,
      details: batchDetails,
      batchDetails: batchDetails,
      batchAllocations: batchDetails,
      createdAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.CREATE,
    currentUser,
    `Pengeluaran bibit #${shipmentNo} sebanyak ${shipmentQty.toLocaleString('id-ID')} Pkk untuk SPB ${req.docNo}`
  );

  allDispatches.push(newDispatchRecord);
  storage.set('dispatch_transactions', allDispatches);

  // 3. Buat Dokumen Penerimaan otomatis untuk dispatch ini (1 Dispatch = 1 Receipt)
  let receiptRecord = null;
  try {
    receiptRecord = createReceiptFromDispatch(newDispatchRecord, req, currentUser);
  } catch (receiptErr) {
    console.warn('[dispatch] createReceiptFromDispatch warning:', receiptErr);
  }

  // 4. Update status dan akumulasi kuota pada Parent Request (Single Record)
  const approvedQty = parseInt(req.approvedQty || req.requestedQty || 0, 10);
  const totalIssuedQty = parseInt(req.totalIssuedQty || req.actualIssuedQty || 0, 10) + shipmentQty;
  const remainingQty = approvedQty - totalIssuedQty;
  const isCompleted = remainingQty === 0;

  let nextStatus;
  let nextStatusLabel;
  if (isKebunSendiri) {
    nextStatus = isCompleted ? 'MENUNGGU_VERIFIKASI_PENGELUARAN' : 'PENGELUARAN_BERJALAN';
    nextStatusLabel = isCompleted ? 'Menunggu Verifikasi Pengeluaran ASB' : 'Pengeluaran Berjalan';
  } else {
    nextStatus = isCompleted ? RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS : 'PENGELUARAN_BERJALAN';
    nextStatusLabel = isCompleted ? (RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS] || 'Menunggu Penerimaan Pengurus') : 'Pengeluaran Berjalan';
  }

  const batchSummaryStr = batchDetails.map(b => `${b.batchCode}: ${b.qty.toLocaleString('id-ID')} Pkk`).join(', ');
  const auditDetails = `Pengeluaran bibit #${shipmentNo} sebanyak ${shipmentQty.toLocaleString('id-ID')} Pkk (${batchSummaryStr}) telah diproses oleh Mantri Bibitan`;

  const updatedRequest = applyTransactionActor(
    {
      ...req,
      totalIssuedQty: totalIssuedQty,
      actualIssuedQty: totalIssuedQty,
      remainingQty: remainingQty,
      status: nextStatus,
      statusLabel: nextStatusLabel,
      targetDivisionId: isKebunSendiri ? null : req.targetDivisionId,
      targetDivisionName: isKebunSendiri ? null : req.targetDivisionName,
      lastIssuedAt: new Date().toISOString(),
      targetNextRole: isKebunSendiri ? (isCompleted ? 'ASISTEN_BIBITAN' : 'MANTRI_TANAMAN') : (isCompleted ? 'PENGURUS' : 'MANTRI_TANAMAN'),
      targetNextEstateId: isKebunSendiri ? null : (isCompleted ? req.estateId : currentUser.estateId),
      targetNextDivisionId: isKebunSendiri ? null : (isCompleted ? null : (req.targetDivisionId || currentUser.divisionId)),
      dispatchData: {
        dispatchDocNo: newDispatchRecord.dispatchDocNo,
        issuedQty: totalIssuedQty,
        issuedAt: new Date().toISOString(),
        batches: batchDetails
      }
    },
    AUDIT_EVENT_TYPES.UPDATE,
    currentUser,
    auditDetails
  );

  // Simpan ke storage & IndexedDB
  const reqIdx = allRequests.findIndex(r => r.id === req.id);
  if (reqIdx !== -1) {
    allRequests[reqIdx] = updatedRequest;
  } else {
    allRequests.push(updatedRequest);
  }
  storage.set('requests_transactions', allRequests);

  if (typeof indexedDB !== 'undefined') {
    try {
      await requestRepository.update(req.id, updatedRequest, currentUser, AUDIT_EVENT_TYPES.UPDATE, auditDetails);
    } catch (err) {
      console.warn('[dispatch] sync indexeddb warning:', err);
    }
  }

  return {
    dispatchRecord: newDispatchRecord,
    receiptRecord: receiptRecord,
    updatedRequest: updatedRequest,
    isCompleted: isCompleted,
    remainingQty: remainingQty
  };
}

/**
 * Buka Modal Form Proses Pengeluaran Bibit
 */
export function openDispatchModal(item, currentUser) {
  if (!canPerformMantriDispatchAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memproses pengeluaran pada dokumen ini.', 'error');
    return;
  }

  const docNo = item.docNo || '2026/NIR/001';
  const approvedClone = item.approvedClone || item.requestedClone || 'IRCA 19';
  const approvedQty = parseInt(item.approvedQty || item.requestedQty || 0, 10);
  const totalIssued = parseInt(item.totalIssuedQty || item.actualIssuedQty || 0, 10);
  const remainingQty = approvedQty - totalIssued;

  const todayStr = new Date().toISOString().split('T')[0];
  const requiredGrowthStage = item.growthStage;
  const isKebunSendiri = item.type === 'KEBUN_SENDIRI' || item.transactionType === 'KEBUN_SENDIRI';
  const estateForBatches = isKebunSendiri ? (item.requesterEstateId || item.estateId) : (item.targetEstateId || item.sourceEstateId || item.estateId);
  const nurseryDiv = item.nurseryDivisionId || null;
  const nurseryProg = item.nurseryProgramId || null;
  const nurseryBedengan = item.nurseryBedenganId || item.bedenganId || null;
  const availableBatches = getNurseryBatches(estateForBatches, approvedClone, requiredGrowthStage, nurseryDiv, nurseryProg, nurseryBedengan);

  const totalEligibleStock = availableBatches.reduce((sum, b) => sum + parseInt(b.availableQty || 0, 10), 0);
  const gapStock = Math.max(0, remainingQty - totalEligibleStock);
  const maxDispatchable = Math.min(remainingQty, totalEligibleStock);

  if (availableBatches.length === 0 || totalEligibleStock === 0) {
    toast(`Tidak ada stok batch yang memenuhi kriteria pengeluaran (Klon: ${approvedClone}, Tahap: ${requiredGrowthStage || '-'}).`, 'error');
    return;
  }

  const renderBatchOptionOptions = (selectedCode = '') => {
    return availableBatches.map(b => {
      const code = b.batchCode || b.batchNo;
      const isSel = code === selectedCode ? 'selected' : '';
      const bedenganInfo = b.bedenganCode || b.bedenganName || b.bedenganId ? ` • Bedengan: ${b.bedenganCode || b.bedenganName || b.bedenganId}` : '';
      return `<option value="${esc(code)}" ${isSel}>${esc(code)}${esc(bedenganInfo)} (Tersedia: ${(b.availableQty || 0).toLocaleString('id-ID')} Pkk)</option>`;
    }).join('');
  };

  openModal({
    title: 'Proses Pengeluaran Bibit',
    body: `
      <div style="padding: 2px 0; font-size: 0.84rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%; min-width: 0; max-width: 100%; overflow-wrap: anywhere;">
        
        <!-- SUMMARY KUOTA & SHORTAGE SECTION -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
            <div>
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 2px;">Dokumen Permintaan</div>
              <div style="font-size: 0.9rem; font-weight: 700; color: #1E293B;">${esc(docNo)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 2px;">Klon & Program</div>
              <div style="font-size: 0.85rem; font-weight: 600; color: #1E293B;">${esc(approvedClone)}${item.programName ? ` • ${esc(item.programName)}` : ''}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 10px; width: 100%; box-sizing: border-box; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
            <div>
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 2px;">Approved</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #1E293B;">${approvedQty.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 2px;">Issued</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #1E293B;">${totalIssued.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 2px;">Remaining</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #D97706;">${remainingQty.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 2px;">Eligible Stock</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #116834;">${totalEligibleStock.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 600; margin-bottom: 2px;">Gap</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: ${gapStock > 0 ? '#DC2626' : '#64748B'};">${gapStock.toLocaleString('id-ID')} Pkk</div>
            </div>
          </div>

          ${gapStock > 0 ? `
            <div style="margin-top: 8px; padding: 6px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.74rem; color: #991B1B;">
              ⚠️ <strong>Perhatian:</strong> Stok bibit yang tersedia (${totalEligibleStock.toLocaleString('id-ID')} Pkk) kurang dari sisa permintaan (${remainingQty.toLocaleString('id-ID')} Pkk). Pengeluaran saat ini dibatasi maksimal <strong>${maxDispatchable.toLocaleString('id-ID')} Pkk</strong>.
            </div>
          ` : ''}
        </div>

        <!-- FORM PENGELUARAN -->
        <form id="dispatch-form" onsubmit="return false;">
          
          <!-- Tanggal Pengeluaran -->
          <div style="margin-bottom: 12px;">
            <label for="input-dispatch-date" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Tanggal Pengeluaran <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="input-dispatch-date" 
              value="${todayStr}"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit;"
              required
            />
          </div>

          <!-- Plat Kendaraan -->
          <div style="margin-bottom: 12px;">
            <label for="input-dispatch-vehicle" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Plat Kendaraan
            </label>
            <input 
              type="text" 
              id="input-dispatch-vehicle" 
              placeholder="Cth: BK 1234 XX"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit;"
            />
          </div>

          <!-- Banyaknya Pengeluaran (Total Shipment) -->
          <div style="margin-bottom: 14px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 4px;">
              <label for="input-dispatch-qty" style="font-weight: 700; color: #1E293B; font-size: 0.78rem;">
                Banyaknya Pengeluaran (Pkk) <span style="color: #DC2626;">*</span>
              </label>
              <button id="btn-fill-remaining" type="button" style="background: none; border: none; color: #116834; font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 0;">
                Gunakan Sisa (${maxDispatchable.toLocaleString('id-ID')})
              </button>
            </div>
            <input 
              type="number" 
              id="input-dispatch-qty" 
              min="1" 
              max="${maxDispatchable}" 
              placeholder="Maksimal ${maxDispatchable.toLocaleString('id-ID')}"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.86rem; font-weight: 700; color: #111111; font-family: inherit;"
              required
            />
          </div>

          <!-- DETAIL BATCH SUMBER -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0; gap: 6px;">
              <label style="font-weight: 700; color: #1E293B; font-size: 0.8rem;">
                Detail Batch Sumber <span style="color: #DC2626;">*</span>
              </label>
              <button id="btn-add-batch-row" type="button" style="background: none; border: none; color: #116834; font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 0; display: flex; align-items: center; gap: 4px;">
                + Tambah Batch
              </button>
            </div>

            <div id="batch-rows-container" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Default Row 1 -->
              <div class="batch-row" style="display: flex; flex-direction: column; gap: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; box-sizing: border-box; width: 100%; min-width: 0;">
                <div>
                  <div style="font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 4px;">Batch Sumber</div>
                  <select class="batch-code-select" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.8rem; font-family: inherit; background: #FFFFFF;">
                    ${renderBatchOptionOptions(availableBatches[0]?.batchCode)}
                  </select>
                </div>
                <div style="display: flex; gap: 8px; width: 100%; align-items: flex-end; box-sizing: border-box;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 4px;">Jumlah</div>
                    <input 
                      type="number" 
                      class="batch-row-qty" 
                      placeholder="Pkk" 
                      min="1" 
                      style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.85rem; font-weight: 600; font-family: inherit;"
                    />
                  </div>
                  <button type="button" class="btn-remove-row" style="flex-shrink: 0; background: none; border: none; color: #DC2626; font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 8px 4px; display: none;">Hapus</button>
                </div>
              </div>
            </div>

            <!-- FOTO PENGELUARAN -->
            <div style="margin-bottom: 12px; margin-top: 12px; border-top: 1px dashed #E2E8F0; padding-top: 12px;">
              <label style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px; font-size: 0.78rem;">
                Foto Bukti Pengeluaran
              </label>
              <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 6px; padding: 12px; text-align: center;">
                <input type="file" id="input-dispatch-photo" accept="image/*" capture="environment" style="display: none;" />
                <button type="button" id="btn-take-photo" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #475569; padding: 6px 12px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                  📸 Ambil Foto
                </button>
                <div id="photo-preview-container" style="display: none; margin-top: 10px;">
                  <img id="dispatch-photo-preview" src="" style="max-width: 100%; max-height: 150px; border-radius: 4px; border: 1px solid #E2E8F0;" />
                  <div id="photo-metadata-display" style="font-size: 0.7rem; color: #64748B; text-align: left; margin-top: 6px; background: #FFFFFF; padding: 6px; border-radius: 4px; border: 1px solid #E2E8F0; word-break: break-word;">
                    <!-- Metadata will be injected here -->
                  </div>
                </div>
              </div>
            </div>

            <!-- LIVE ALLOCATION COUNTER -->
            <div id="batch-allocation-summary" style="margin-top: 12px; font-size: 0.8rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px; box-sizing: border-box; width: 100%; border-top: 1px dashed #E2E8F0; padding-top: 10px;">
              <span style="color: #475569; font-weight: 600;">Total Batch:</span>
              <span id="batch-sum-display" style="font-weight: 700; color: #1E293B;">0 / 0 Pkk</span>
            </div>
            <div id="batch-validation-msg" style="margin-top: 4px; font-size: 0.72rem; color: #DC2626; display: none;"></div>
          </div>

        </form>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%; box-sizing: border-box;">
        <button class="btn btn-ghost" id="btn-cancel-dispatch" type="button" style="flex: 1; min-width: 0; border: 1px solid #CBD5E1; color: #475569; font-weight: 600; box-sizing: border-box;">
          Batal
        </button>
        <button class="btn" id="btn-submit-dispatch" type="button" style="flex: 1; min-width: 0; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px; cursor: pointer; box-sizing: border-box; word-break: break-word; line-height: 1.2;">
          Simpan Pengeluaran
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  if (!root) return;

  const qtyInput = root.querySelector('#input-dispatch-qty');
  const dateInput = root.querySelector('#input-dispatch-date');
  const container = root.querySelector('#batch-rows-container');
  const batchSumDisplay = root.querySelector('#batch-sum-display');
  const valMsg = root.querySelector('#batch-validation-msg');
  const fillRemainingBtn = root.querySelector('#btn-fill-remaining');

  // Photo Logic
  let currentPhotoMetadata = null;
  const photoInput = root.querySelector('#input-dispatch-photo');
  const btnTakePhoto = root.querySelector('#btn-take-photo');
  const previewContainer = root.querySelector('#photo-preview-container');
  const photoPreview = root.querySelector('#dispatch-photo-preview');
  const metaDisplay = root.querySelector('#photo-metadata-display');

  btnTakePhoto?.addEventListener('click', () => {
    photoInput?.click();
  });

  photoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        photoPreview.src = ev.target.result;
        previewContainer.style.display = 'block';

        const ts = new Date().toISOString();
        const roleStr = typeof normalizeRole === 'function' ? normalizeRole(currentUser.role || currentUser.rawRole) : (currentUser.role || currentUser.rawRole || 'MANTRI_TANAMAN');

        currentPhotoMetadata = {
          image: ev.target.result,
          capturedAt: ts,
          capturedByUserId: currentUser.userId || currentUser.code || currentUser.id,
          capturedByName: currentUser.name || 'Mantri',
          capturedByRole: roleStr,
          capturedByEstateId: currentUser.estateId,
          capturedByDivisionId: currentUser.divisionId,
          latitude: null,
          longitude: null,
          locationCaptured: false
        };

        metaDisplay.innerHTML = `
          <div><strong>Nama:</strong> ${esc(currentPhotoMetadata.capturedByName)}</div>
          <div><strong>Waktu:</strong> ${esc(formatDate(ts))}</div>
          <div id="meta-location"><strong>Lokasi:</strong> Mendapatkan koordinat...</div>
        `;

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              currentPhotoMetadata.latitude = pos.coords.latitude;
              currentPhotoMetadata.longitude = pos.coords.longitude;
              currentPhotoMetadata.locationCaptured = true;
              const locDiv = root.querySelector('#meta-location');
              if (locDiv) locDiv.innerHTML = `<strong>Lokasi:</strong> ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
            },
            (err) => {
              const locDiv = root.querySelector('#meta-location');
              if (locDiv) locDiv.innerHTML = `<strong>Lokasi:</strong> Lokasi tidak tersedia`;
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        } else {
          const locDiv = root.querySelector('#meta-location');
          if (locDiv) locDiv.innerHTML = `<strong>Lokasi:</strong> Tidak didukung browser`;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Helper sync counters
  const updateCounters = () => {
    const targetShipment = parseInt(qtyInput?.value || 0, 10);
    const rowInputs = root.querySelectorAll('.batch-row-qty');
    let sum = 0;
    rowInputs.forEach(inp => {
      sum += parseInt(inp.value || 0, 10);
    });

    if (batchSumDisplay) {
      batchSumDisplay.textContent = `${sum.toLocaleString('id-ID')} / ${targetShipment.toLocaleString('id-ID')} Pkk`;
      if (sum > 0 && sum === targetShipment) {
        batchSumDisplay.style.color = '#116834';
        if (valMsg) valMsg.style.display = 'none';
      } else if (sum > 0 && sum !== targetShipment) {
        batchSumDisplay.style.color = '#DC2626';
        if (valMsg) {
          valMsg.style.display = 'block';
          valMsg.textContent = `Selisih alokasi: ${(targetShipment - sum).toLocaleString('id-ID')} Pkk`;
        }
      } else {
        batchSumDisplay.style.color = '#64748B';
        if (valMsg) valMsg.style.display = 'none';
      }
    }

    // Toggle remove buttons
    const rows = root.querySelectorAll('.batch-row');
    rows.forEach(r => {
      const rmBtn = r.querySelector('.btn-remove-row');
      if (rmBtn) rmBtn.style.display = rows.length > 1 ? 'block' : 'none';
    });
  };

  qtyInput?.addEventListener('input', updateCounters);

  fillRemainingBtn?.addEventListener('click', () => {
    if (qtyInput) {
      qtyInput.value = remainingQty;
      const firstRowQty = container?.querySelector('.batch-row-qty');
      if (firstRowQty && !firstRowQty.value) {
        const firstBatchCode = container?.querySelector('.batch-code-select')?.value;
        const bObj = availableBatches.find(b => (b.batchCode || b.batchNo) === firstBatchCode);
        const avail = bObj ? parseInt(bObj.availableQty || 0, 10) : remainingQty;
        firstRowQty.value = Math.min(remainingQty, avail);
      }
      updateCounters();
    }
  });

  // Event listener delegate for rows
  container?.addEventListener('input', (e) => {
    if (e.target.classList.contains('batch-row-qty')) {
      updateCounters();
    }
  });

  container?.addEventListener('change', (e) => {
    if (e.target.classList.contains('batch-code-select')) {
      updateCounters();
    }
  });

  container?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-row')) {
      e.target.closest('.batch-row')?.remove();
      updateCounters();
    }
  });

  // Add Batch Row
  root.querySelector('#btn-add-batch-row')?.addEventListener('click', () => {
    const existingSelected = Array.from(root.querySelectorAll('.batch-code-select')).map(s => s.value);
    const nextBatch = availableBatches.find(b => !existingSelected.includes(b.batchCode || b.batchNo)) || availableBatches[0];

    const rowDiv = document.createElement('div');
    rowDiv.className = 'batch-row';
    rowDiv.style.cssText = 'display: flex; flex-direction: column; gap: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; box-sizing: border-box; width: 100%; min-width: 0; margin-top: 8px;';
    rowDiv.innerHTML = `
      <div>
        <div style="font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 4px;">Batch Sumber</div>
        <select class="batch-code-select" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.8rem; font-family: inherit; background: #FFFFFF;">
          ${renderBatchOptionOptions(nextBatch ? (nextBatch.batchCode || nextBatch.batchNo) : '')}
        </select>
      </div>
      <div style="display: flex; gap: 8px; width: 100%; align-items: flex-end; box-sizing: border-box;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 4px;">Jumlah</div>
          <input 
            type="number" 
            class="batch-row-qty" 
            placeholder="Pkk" 
            min="1" 
            style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.85rem; font-weight: 600; font-family: inherit;"
          />
        </div>
        <button type="button" class="btn-remove-row" style="flex-shrink: 0; background: none; border: none; color: #DC2626; font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 8px 4px;">Hapus</button>
      </div>
    `;
    container?.appendChild(rowDiv);
    updateCounters();
  });

  // Cancel
  root.querySelector('#btn-cancel-dispatch')?.addEventListener('click', closeModal);

  // Submit
  root.querySelector('#btn-submit-dispatch')?.addEventListener('click', async () => {
    const issuedDate = dateInput?.value || todayStr;
    const shipmentQty = parseInt(qtyInput?.value || 0, 10);

    const batchRows = [];
    root.querySelectorAll('.batch-row').forEach(row => {
      const bCode = row.querySelector('.batch-code-select')?.value;
      const bQty = parseInt(row.querySelector('.batch-row-qty')?.value || 0, 10);
      if (bCode && bQty > 0) {
        batchRows.push({ batchCode: bCode, qty: bQty });
      }
    });

    const vehiclePlate = root.querySelector('#input-dispatch-vehicle')?.value || '';

    const formValues = {
      issuedDate,
      shipmentQty,
      batchRows,
      vehiclePlate,
      photoEvidence: currentPhotoMetadata
    };

    // Validasi
    const validation = validateShipmentForm(item, formValues, availableBatches);
    if (!validation.valid) {
      toast(validation.error, 'error');
      return;
    }

    try {
      const res = await processDispatchShipment(item, formValues, currentUser);
      toast(`Pengeluaran bibit sebanyak ${shipmentQty.toLocaleString('id-ID')} Pkk berhasil disimpan.`, 'success');
      closeModal();
      await renderDispatchLanding();
    } catch (err) {
      toast(err.message || 'Gagal menyimpan transaksi pengeluaran.', 'error');
    }
  });
}

/**
 * Buka Modal Detail Dokumen Permintaan & Riwayat Pengeluaran (Read-Only)
 */
export function openDispatchDetailModal(item) {
  const docNo = item.docNo || '2026/NIR/001';
  const sourceEstate = resolveEstate(item.estateId);
  const sourceEstateName = sourceEstate ? sourceEstate.estate_name : (item.estateId || '-');
  const targetEstate = resolveEstate(item.targetEstateId);
  const targetEstateName = targetEstate ? targetEstate.estate_name : (item.targetEstateId || '-');

  const approvedQty = parseInt(item.approvedQty || item.requestedQty || 0, 10);
  const totalIssued = parseInt(item.totalIssuedQty || item.actualIssuedQty || 0, 10);
  const remainingQty = approvedQty - totalIssued;
  const approvedClone = item.approvedClone || item.requestedClone || '-';

  const shipments = getDispatchTransactions(item.id);

  let shipmentsListHtml = '';
  if (shipments.length === 0) {
    shipmentsListHtml = `
      <div style="text-align: center; padding: 12px; color: #94A3B8; font-size: 0.78rem; background: #F8FAFC; border-radius: 6px;">
        Belum ada transaksi pengeluaran aktual yang tercatat.
      </div>
    `;
  } else {
    shipmentsListHtml = shipments.map((shp, idx) => {
      const batchListStr = (shp.details || []).map(b => `${b.batchCode} (${(b.qty || 0).toLocaleString('id-ID')} Pkk)`).join(', ');
      return `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; font-size: 0.78rem;">
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: #116834; margin-bottom: 3px;">
            <span>#${idx + 1} Dokumen: ${esc(shp.docNo || 'DSP')}</span>
            <span>${(shp.issuedQty || 0).toLocaleString('id-ID')} Pkk</span>
          </div>
          <div style="color: #64748B; font-size: 0.72rem; margin-bottom: 2px;">
            Tanggal: <strong>${esc(formatDate(shp.issuedDate || shp.createdAt))}</strong> | Mantri: <strong>${esc(shp.issuedByName || 'Mantri')}</strong>
          </div>
          <div style="color: #334155; font-size: 0.72rem;">
            Batch: ${esc(batchListStr || '-')}
          </div>
        </div>
      `;
    }).join('');
  }

  openModal({
    title: 'Detail Permintaan & Pengeluaran',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <!-- SECTION 1: PERMINTAAN AWAL -->
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 800; color: #116834; font-size: 0.80rem; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em;">
            1. Data Permintaan Awal
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 45% 55%; gap: 4px; font-size: 0.76rem;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(docNo)}</span>

            <span style="color: #64748B;">Pemohon:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(item.createdByName || item.requestedBy || 'Pengurus')}</span>

            <span style="color: #64748B;">Kebun Asal (Peminta):</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(sourceEstateName)}</span>

            <span style="color: #64748B;">Kebun Tujuan:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(targetEstateName)}</span>

            <span style="color: #64748B;">Kode Alokasi:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(item.allocationCode || '-')}</span>

            <span style="color: #64748B;">Klon Diminta:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedClone || item.klon || '-')}</span>

            <span style="color: #64748B;">Banyaknya Diminta:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${(item.requestedQty || item.qty || 0).toLocaleString('id-ID')} Pkk</span>

            <span style="color: #64748B;">Tanggal Dibutuhkan:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(formatDate(item.requiredDate || item.date))}</span>
          </div>
        </div>

        <!-- SECTION 2: KEPUTUSAN PENGURUS -->
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 800; color: #116834; font-size: 0.80rem; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em;">
            2. Keputusan Pengurus
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 45% 55%; gap: 4px; font-size: 0.76rem;">
            <span style="color: #64748B;">Banyaknya Disetujui:</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${approvedQty.toLocaleString('id-ID')} Pkk</span>

            <span style="color: #64748B;">Klon Disetujui:</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(approvedClone)}</span>

            <span style="color: #64748B;">Estimasi Pengiriman:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(formatDate(item.estimatedDeliveryDate || '-'))}</span>

            <span style="color: #64748B;">Pengurus Pemroses:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(item.processedByName || 'Pengurus')}</span>
          </div>
        </div>

        <!-- SECTION 3: VERIFIKASI ASISTEN -->
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 800; color: #116834; font-size: 0.80rem; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em;">
            3. Verifikasi Asisten Bibitan
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 45% 55%; gap: 4px; font-size: 0.76rem;">
            <span style="color: #64748B;">Nama Asisten:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(item.verifiedByName || 'Asisten Bibitan')}</span>

            <span style="color: #64748B;">Waktu Verifikasi:</span>
            <span style="font-weight: 600; color: #1E293B; text-align: right;">${esc(formatDate(item.verifiedAt || '-'))}</span>
          </div>
        </div>

        <!-- SECTION 4: RIWAYAT PENGELUARAN -->
        <div>
          <div style="font-weight: 800; color: #116834; font-size: 0.80rem; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em; display: flex; justify-content: space-between;">
            <span>4. Riwayat Transaksi Pengeluaran</span>
            <span style="font-size: 0.74rem; color: #64748B;">Sisa: ${remainingQty.toLocaleString('id-ID')} Pkk</span>
          </div>
          ${shipmentsListHtml}
        </div>

      </div>
    `,
    footer: `
      <div style="width: 100%;">
        <button class="btn btn-ghost" id="btn-close-detail" type="button" style="width: 100%; border: 1px solid #CBD5E1; color: #475569; font-weight: 700;">
          Tutup
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-close-detail')?.addEventListener('click', closeModal);
}

/**
 * Render Utama Halaman Pengeluaran Bibit
 */
export async function renderDispatchLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const userCtx = getCurrentUserContext();
  const sessionUser = session.get();
  const currentUser = userCtx || sessionUser || {
    id: 'MNT001',
    userId: 'MNT001',
    code: 'MNT001',
    name: 'Wagiman',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih'
  };

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

  // Filter permohonan masuk yang relevan untuk modul Pengeluaran
  const dispatchRequests = filterDispatchRequests(allRequests, currentUser);
  const filteredItems = filterDispatchByStatus(dispatchRequests, activeStatusFilter);
  const actionableCount = getActionableDispatchCount(dispatchRequests, currentUser);

  // Status Filter Counts
  const statusCounts = {
    SEMUA: dispatchRequests.length,
    TERVERIFIKASI: dispatchRequests.filter(t => (t.status || '').toUpperCase() === 'TERVERIFIKASI' || (t.status || '').toUpperCase() === 'MENUNGGU_PENGELUARAN_BIBIT').length,
    PENGELUARAN_BERJALAN: dispatchRequests.filter(t => (t.status || '').toUpperCase() === 'PENGELUARAN_BERJALAN').length,
    SELESAI: dispatchRequests.filter(t => (t.status || '').toUpperCase() === 'SELESAI').length
  };

  // Status Filter Pills Markup
  const filterPills = [
    { key: 'SEMUA', label: 'Semua' },
    { key: 'TERVERIFIKASI', label: 'Siap Keluar' },
    { key: 'PENGELUARAN_BERJALAN', label: 'Berjalan' },
    { key: 'SELESAI', label: 'Selesai' }
  ].map(pill => {
    const isSelected = activeStatusFilter === pill.key;
    const count = statusCounts[pill.key] || 0;
    return `
      <button 
        class="dispatch-filter-pill-btn" 
        data-status="${pill.key}"
        type="button" 
        style="padding: 4px 10px; font-size: 0.72rem; font-weight: ${isSelected ? '700' : '600'}; border-radius: 16px; border: 1px solid ${isSelected ? '#116834' : '#E2E8F0'}; background: ${isSelected ? '#116834' : '#FFFFFF'}; color: ${isSelected ? '#FFFFFF' : '#475569'}; white-space: nowrap; cursor: pointer; transition: all 0.15s ease; line-height: 1.3;"
      >
        ${pill.label} (${count})
      </button>
    `;
  }).join('');

  // Render Card Transaksi
  let cardsHtml = '';
  if (filteredItems.length === 0) {
    cardsHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #94A3B8;">
          ${ICONS.truck}
        </div>
        <div style="font-size: 0.90rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Tidak ada dokumen pengeluaran</div>
        <div style="font-size: 0.76rem; color: #64748B; max-width: 260px; line-height: 1.4;">
          ${activeStatusFilter === 'SEMUA' ? 'Belum ada dokumen permintaan bibit yang siap untuk diproses pengeluaran.' : 'Tidak ada dokumen dengan filter status ini.'}
        </div>
      </div>
    `;
  } else {
    cardsHtml = filteredItems.map((item, idx) => {
      const docNo = item.docNo || '2026/NIR/001';
      const sourceEstate = resolveEstate(item.estateId);
      const sourceEstateName = sourceEstate ? sourceEstate.estate_name : (item.estateId || 'Kebun Peminta');

      const approvedQty = parseInt(item.approvedQty || item.requestedQty || 0, 10);
      const totalIssued = parseInt(item.totalIssuedQty || item.actualIssuedQty || 0, 10);
      const remainingQty = approvedQty - totalIssued;
      const approvedClone = item.approvedClone || item.requestedClone || 'IRCA 19';

      const isActionable = canPerformMantriDispatchAction(item, currentUser);
      const isExpanded = expandedCardIndex === idx;

      // Status badge styling
      const statusRaw = (item.status || 'TERVERIFIKASI').toUpperCase();
      let badgeBg = '#FEF3C7';
      let badgeColor = '#92400E';
      let badgeBorder = '#FDE68A';
      let badgeText = 'Siap Keluar';

      if (statusRaw === 'PENGELUARAN_BERJALAN') {
        badgeBg = '#E0F2FE';
        badgeColor = '#0369A1';
        badgeBorder = '#BAE6FD';
        badgeText = 'Berjalan';
      } else if (statusRaw === 'SELESAI') {
        badgeBg = '#DCFCE7';
        badgeColor = '#166534';
        badgeBorder = '#BBF7D0';
        badgeText = 'Selesai';
      }

      // Action buttons
      let actionButtonsHtml = `
        <button class="btn-card-detail" data-idx="${idx}" type="button" style="padding: 6px 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; color: #475569; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
          Detail
        </button>
      `;

      if (isActionable) {
        actionButtonsHtml = `
          <div style="display: flex; gap: 6px; width: 100%;">
            <button class="btn-card-detail" data-idx="${idx}" type="button" style="flex: 1; padding: 7px 10px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; color: #475569; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
              Detail
            </button>
            <button class="btn-card-proses-dispatch" data-idx="${idx}" type="button" style="flex: 2; padding: 7px 12px; background: #116834; border: none; border-radius: 6px; color: #FFFFFF; font-size: 0.76rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <span>Proses Pengeluaran</span>
            </button>
          </div>
        `;
      }

      return `
        <div class="dispatch-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          
          <!-- TOP ROW: DOC NO + STATUS BADGE -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 800; color: #1E293B; font-size: 0.88rem; line-height: 1.2;">
                ${esc(docNo)}
              </div>
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">
                Tujuan: <strong>${esc(sourceEstateName)}</strong>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.68rem; font-weight: 800; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                ${badgeText}
              </span>
            </div>
          </div>

          <!-- SUMMARY KUOTA -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #475569; margin-bottom: 4px;">
              <span>Klon: <strong>${esc(approvedClone)}</strong></span>
              <span>Disetujui: <strong>${approvedQty.toLocaleString('id-ID')} Pkk</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #475569;">
              <span>Sudah Keluar: <strong style="color: #0369A1;">${totalIssued.toLocaleString('id-ID')} Pkk</strong></span>
              <span>Sisa: <strong style="color: ${remainingQty > 0 ? '#DC2626' : '#166534'};">${remainingQty.toLocaleString('id-ID')} Pkk</strong></span>
            </div>
          </div>

          <!-- ACTIONS -->
          <div style="display: flex; justify-content: flex-end; align-items: center;">
            ${actionButtonsHtml}
          </div>

        </div>
      `;
    }).join('');
  }

  app.innerHTML = `
    <div class="page dispatch-page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; min-height: 48px; padding: 6px 14px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 0.82rem; font-weight: 700; color: #111111; margin: 0; letter-spacing: -0.015em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;">
            Pengeluaran Bibit
          </h1>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <button id="btn-report-nav" type="button" aria-label="Laporan" style="padding: 6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;" title="Laporan Pengeluaran">
            ${ICONS.reportDoc}
          </button>
          <button id="btn-refresh" type="button" aria-label="Refresh" style="padding: 6px; margin-right: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg id="sync-icon-svg" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- FILTER STATUS PILLS -->
      <div style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 8px 14px; flex-shrink: 0; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <div style="display: flex; gap: 6px; width: max-content;">
          ${filterPills}
        </div>
      </div>

      <!-- CARDS BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 12px 14px; -webkit-overflow-scrolling: touch;">
        ${cardsHtml}
      </main>

    </div>
  `;

  // Event Listeners
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/home');
  });

  app.querySelector('#btn-report-nav')?.addEventListener('click', () => {
    navigate('/dispatch/report');
  });

  app.querySelector('#btn-refresh')?.addEventListener('click', () => {
    renderDispatchLanding();
  });

  // Filter Pills Click
  app.querySelectorAll('.dispatch-filter-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.dataset.status || 'SEMUA';
      renderDispatchLanding();
    });
  });

  // Card Detail Button Click
  app.querySelectorAll('.btn-card-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const item = filteredItems[idx];
      if (item) {
        openDispatchDetailModal(item);
      }
    });
  });

  // Card Proses Pengeluaran Click
  app.querySelectorAll('.btn-card-proses-dispatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const item = filteredItems[idx];
      if (item) {
        openDispatchModal(item, currentUser);
      }
    });
  });
}
