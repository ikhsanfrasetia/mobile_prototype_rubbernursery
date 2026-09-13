/**
 * core/receipt-ksp-validator.js
 * Validator Reusable untuk Fondasi Transaksi Penerimaan Bibit Kebun Sepupu.
 * 
 * Aturan Validasi:
 * 1. Receipt Quantity: accepted + rejected <= shipped
 * 2. Block Allocation (Khusus Jalur LAPANGAN): Σ allocatedQty === totalAcceptedQty
 *    - Reject/Rusak TIDAK BOLEH dialokasikan ke blok.
 *    - Block harus valid & aktif dari block-master.js.
 * 3. Batch Rules:
 *    - Batch sumber harus valid dan terdaftar.
 *    - Jalur BIBITAN: newBatchId / newBatchCode wajib unik dan tidak boleh menimpa batch sumber.
 * 4. Jalur Rules:
 *    - Jalur LAPANGAN: mendukung alokasi blok.
 *    - Jalur BIBITAN: TIDAK menggunakan alokasi blok (dialokasikan ke batch bibitan baru).
 * 5. Photo Metadata:
 *    - source wajib "CAMERA", capturedAt otomatis, actor dari user context, GPS opsional.
 */

import { JALUR_PENERIMAAN, PHOTO_SOURCE } from './receipt-ksp-constants.js';
import { resolveBlock, isBlockActive } from '../data/block-master.js';

/**
 * Validasi Kuantitas Fisik Penerimaan vs Kuantitas Dikirim
 * @param {number} shippedQty - Total bibit dikirim dari pengeluaran
 * @param {number} acceptedQty - Total bibit kondisi layak/diterima
 * @param {number} rejectedQty - Total bibit kondisi rusak/reject
 * @returns {{ valid: boolean, error?: string, totalPhysical: number, discrepancyQty: number }}
 */
export function validateReceiptQuantities(shippedQty, acceptedQty, rejectedQty) {
  const shipped = parseInt(shippedQty, 10);
  const accepted = parseInt(acceptedQty, 10);
  const rejected = parseInt(rejectedQty, 10);

  if (isNaN(shipped) || shipped <= 0) {
    return { valid: false, error: 'Jumlah bibit yang dikirim harus berupa angka lebih besar dari 0' };
  }
  if (isNaN(accepted) || accepted < 0) {
    return { valid: false, error: 'Jumlah bibit layak harus berupa angka >= 0' };
  }
  if (isNaN(rejected) || rejected < 0) {
    return { valid: false, error: 'Jumlah bibit reject/rusak harus berupa angka >= 0' };
  }

  const totalPhysical = accepted + rejected;
  if (totalPhysical > shipped) {
    return {
      valid: false,
      error: `Total fisik penerimaan (${totalPhysical.toLocaleString('id-ID')} Pkk = ${accepted.toLocaleString('id-ID')} Layak + ${rejected.toLocaleString('id-ID')} Reject) melebihi jumlah yang dikirim (${shipped.toLocaleString('id-ID')} Pkk)`,
      totalPhysical,
      discrepancyQty: shipped - totalPhysical
    };
  }

  const discrepancyQty = shipped - totalPhysical; // Selisih fisik (jika ada barang hilang di jalan)
  return {
    valid: true,
    totalPhysical,
    discrepancyQty,
    hasDiscrepancy: discrepancyQty > 0
  };
}

/**
 * Validasi Alokasi Blok Distribusi (Jalur LAPANGAN vs BIBITAN)
 * @param {number} totalAcceptedQty - Total bibit layak yang harus dialokasikan
 * @param {Array<Object>} blockAllocations - Array alokasi blok
 * @param {string} jalurPenerimaan - 'LAPANGAN' | 'BIBITAN'
 * @param {string} [targetEstateId] - Validasi isolasi kebun (opsional)
 * @param {string} [targetDivisionId] - Validasi isolasi divisi (opsional)
 * @returns {{ valid: boolean, error?: string, totalAllocated: number, allocations?: Array<Object> }}
 */
export function validateBlockAllocations(arg1, arg2, arg3, arg4 = null, arg5 = null) {
  let totalAcceptedQty, blockAllocations, jalurPenerimaan, targetEstateId, targetDivisionId;

  if (Array.isArray(arg1)) {
    // Signature: (blockAllocations, totalAcceptedQty, [targetEstateId / jalur], [targetDivisionId])
    blockAllocations = arg1;
    totalAcceptedQty = arg2;
    if (typeof arg3 === 'string' && (arg3 === JALUR_PENERIMAAN.LAPANGAN || arg3 === JALUR_PENERIMAAN.BIBITAN)) {
      jalurPenerimaan = arg3;
      targetEstateId = arg4;
      targetDivisionId = arg5;
    } else {
      jalurPenerimaan = JALUR_PENERIMAAN.LAPANGAN;
      targetEstateId = arg3;
      targetDivisionId = arg4;
    }
  } else {
    // Canonical Signature: (totalAcceptedQty, blockAllocations, jalurPenerimaan, targetEstateId, targetDivisionId)
    totalAcceptedQty = arg1;
    blockAllocations = arg2;
    jalurPenerimaan = arg3 || JALUR_PENERIMAAN.LAPANGAN;
    targetEstateId = arg4;
    targetDivisionId = arg5;
  }

  if (jalurPenerimaan === JALUR_PENERIMAAN.BIBITAN) {
    if (Array.isArray(blockAllocations) && blockAllocations.length > 0) {
      const err = 'Jalur BIBITAN tidak menggunakan alokasi blok tanaman. Bibit dialokasikan ke batch pembibitan baru.';
      return {
        valid: false,
        isValid: false,
        error: err,
        errors: [err]
      };
    }
    return { valid: true, isValid: true, totalAllocated: 0, allocations: [], errors: [] };
  }

  if (jalurPenerimaan === JALUR_PENERIMAAN.LAPANGAN) {
    if (!Array.isArray(blockAllocations) || blockAllocations.length === 0) {
      const err = 'Jalur LAPANGAN wajib memiliki minimal 1 alokasi blok distribusi';
      return {
        valid: false,
        isValid: false,
        error: err,
        errors: [err]
      };
    }

    const accepted = parseInt(totalAcceptedQty, 10) || 0;
    let sumAllocated = 0;
    const usedBlockIds = new Set();
    const resolvedAllocations = [];

    for (let i = 0; i < blockAllocations.length; i++) {
      const alloc = blockAllocations[i];
      const bIdent = alloc.blockId || alloc.blockCode;
      if (!bIdent) {
        const err = `Alokasi #${i + 1}: Blok belum dipilih`;
        return { valid: false, isValid: false, error: err, errors: [err] };
      }

      const blockObj = resolveBlock(bIdent);
      if (!blockObj) {
        const err = `Alokasi #${i + 1}: Blok '${bIdent}' tidak terdaftar pada Master Blok`;
        return { valid: false, isValid: false, error: err, errors: [err] };
      }

      if (!isBlockActive(blockObj.id)) {
        const err = `Alokasi #${i + 1}: Blok '${blockObj.blockName}' tidak aktif / berstatus ${blockObj.status}`;
        return { valid: false, isValid: false, error: err, errors: [err] };
      }

      // Validasi scope Estate
      if (targetEstateId) {
        const cleanTargetEstate = String(targetEstateId).trim().toUpperCase();
        const bEstate = (blockObj.estateCode || blockObj.estateId || '').toUpperCase();
        const matchEstate = bEstate === cleanTargetEstate || (bEstate === 'EST-APM' && cleanTargetEstate.includes('APM')) || (bEstate === 'EST-TBS' && cleanTargetEstate.includes('TBS'));
        if (!matchEstate) {
          const err = `Alokasi #${i + 1}: Blok '${blockObj.blockName}' (${bEstate}) tidak berada pada kebun tujuan (${targetEstateId})`;
          return { valid: false, isValid: false, error: err, errors: [err] };
        }
      }

      // Validasi scope Divisi
      if (targetDivisionId) {
        const cleanTargetDiv = String(targetDivisionId).trim().toUpperCase();
        const bDiv = (blockObj.divisionCode || blockObj.divisionId || '').toUpperCase();
        if (bDiv !== cleanTargetDiv) {
          const err = `Alokasi #${i + 1}: Blok '${blockObj.blockName}' (${bDiv}) tidak berada pada divisi tujuan (${targetDivisionId})`;
          return { valid: false, isValid: false, error: err, errors: [err] };
        }
      }

      if (usedBlockIds.has(blockObj.id)) {
        const err = `Alokasi #${i + 1}: Blok '${blockObj.blockName}' dipilih lebih dari satu kali`;
        return { valid: false, isValid: false, error: err, errors: [err] };
      }
      usedBlockIds.add(blockObj.id);

      const qty = parseInt(alloc.allocatedQty, 10);
      if (isNaN(qty) || qty <= 0) {
        const err = `Alokasi #${i + 1} (${blockObj.blockName}): Jumlah alokasi harus berupa angka lebih besar dari 0`;
        return { valid: false, isValid: false, error: err, errors: [err] };
      }

      sumAllocated += qty;
      resolvedAllocations.push({
        ...alloc,
        blockId: blockObj.id,
        blockCode: blockObj.blockCode,
        blockName: blockObj.blockName,
        divisionId: blockObj.divisionCode,
        divisionName: blockObj.divisionName,
        estateId: blockObj.estateCode,
        estateName: blockObj.estateName,
        allocatedQty: qty
      });
    }

    if (sumAllocated !== accepted) {
      const err = `Total alokasi blok (${sumAllocated.toLocaleString('id-ID')} Pkk) tidak sama dengan Total Layak yang diterima (${accepted.toLocaleString('id-ID')} Pkk). Selisih: ${Math.abs(accepted - sumAllocated).toLocaleString('id-ID')} Pkk`;
      return {
        valid: false,
        isValid: false,
        error: err,
        errors: [err],
        totalAllocated: sumAllocated
      };
    }

    return { valid: true, isValid: true, totalAllocated: sumAllocated, allocations: resolvedAllocations, errors: [] };
  }

  return { valid: false, isValid: false, error: `Jalur penerimaan tidak valid: ${jalurPenerimaan}`, errors: [`Jalur penerimaan tidak valid: ${jalurPenerimaan}`] };
}

/**
 * Validasi Kuantitas Fisik Penerimaan Asisten Lapangan
 * @param {Object} params
 * @param {number} params.qtyShipped
 * @param {number} params.qtyAccepted
 * @param {number} params.qtyRejected
 * @param {string} [params.rejectReason]
 * @param {string} [params.discrepancyReason]
 * @returns {{ valid: boolean, isValid: boolean, error?: string, errors: Array<string>, totalPhysical: number, discrepancyQty: number, hasDiscrepancy: boolean }}
 */
export function validatePhysicalReceipt(params = {}) {
  const { qtyShipped, qtyAccepted, qtyRejected, rejectReason, discrepancyReason } = params;
  const qVal = validateReceiptQuantities(qtyShipped, qtyAccepted, qtyRejected);
  if (!qVal.valid) {
    return {
      valid: false,
      isValid: false,
      error: qVal.error,
      errors: [qVal.error],
      totalPhysical: qVal.totalPhysical || 0,
      discrepancyQty: qVal.discrepancyQty || 0,
      hasDiscrepancy: false
    };
  }

  const errors = [];
  const rejected = parseInt(qtyRejected, 10) || 0;
  if (rejected > 0 && (!rejectReason || !rejectReason.trim())) {
    errors.push('Alasan reject/rusak wajib diisi jika terdapat bibit reject/rusak');
  }

  if (qVal.discrepancyQty > 0 && (!discrepancyReason || !discrepancyReason.trim())) {
    errors.push('Alasan selisih/discrepancy wajib diisi jika terdapat selisih fisik dengan pengeluaran');
  }

  const isValid = errors.length === 0;
  return {
    valid: isValid,
    isValid,
    error: errors.length > 0 ? errors[0] : null,
    errors,
    totalPhysical: qVal.totalPhysical,
    discrepancyQty: qVal.discrepancyQty,
    hasDiscrepancy: qVal.discrepancyQty > 0
  };
}

/**
 * Validasi Batch Sumber vs Batch Penerimaan Baru (Jalur BIBITAN)
 * @param {string} sourceBatchCode - Kode batch sumber dari kebun asal
 * @param {string} newBatchCode - Kode batch baru yang akan dibuat di kebun penerima
 * @param {string} jalurPenerimaan - 'LAPANGAN' | 'BIBITAN'
 * @param {Array<Object>} existingBatches - Daftar batch existing di kebun tujuan
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBatchSourceAndNew(sourceBatchCode, newBatchCode, jalurPenerimaan, existingBatches = []) {
  if (!sourceBatchCode || !sourceBatchCode.trim()) {
    return { valid: false, error: 'Kode batch sumber pengeluaran wajib ada' };
  }

  if (jalurPenerimaan === JALUR_PENERIMAAN.BIBITAN) {
    if (!newBatchCode || !newBatchCode.trim()) {
      return { valid: false, error: 'Kode batch penerimaan baru wajib diisi untuk jalur BIBITAN' };
    }

    const cleanSource = sourceBatchCode.trim().toUpperCase();
    const cleanNew = newBatchCode.trim().toUpperCase();

    if (cleanNew === cleanSource) {
      return {
        valid: false,
        error: `Batch penerimaan baru (${newBatchCode}) tidak boleh menggunakan kode/ID yang sama dengan batch sumber (${sourceBatchCode}). Batch sumber tidak boleh ditimpa.`
      };
    }

    // Pastikan newBatchCode belum dipakai di estate/divisi tujuan
    const exists = existingBatches.some(b => {
      const bCode = (b.batchCode || b.batchNo || b.id || '').trim().toUpperCase();
      return bCode === cleanNew;
    });

    if (exists) {
      return {
        valid: false,
        error: `Kode batch '${newBatchCode}' sudah digunakan di kebun tujuan. Gunakan kode batch baru yang unik.`
      };
    }
  }

  return { valid: true };
}

/**
 * Validasi Metadata Bukti Foto
 * @param {Object} photo - Object metadata foto
 * @returns {{ valid: boolean, isValid: boolean, error?: string, errors: Array<string> }}
 */
export function validatePhotoEvidence(photo) {
  if (!photo) {
    const err = 'Bukti foto penerimaan fisik wajib dilampirkan';
    return { valid: false, isValid: false, error: err, errors: [err] };
  }

  if (!photo.dataUrl || typeof photo.dataUrl !== 'string' || !photo.dataUrl.startsWith('data:image/')) {
    const err = 'Data foto tidak valid atau kosong';
    return { valid: false, isValid: false, error: err, errors: [err] };
  }

  if (photo.source !== PHOTO_SOURCE.CAMERA) {
    const err = 'Sumber foto harus diambil langsung dari kamera perangkat (CAMERA)';
    return { valid: false, isValid: false, error: err, errors: [err] };
  }

  if (!photo.capturedAt) {
    const err = 'Timestamp pengambilan foto wajib tercatat';
    return { valid: false, isValid: false, error: err, errors: [err] };
  }

  if (!photo.capturedByUserId || !photo.capturedByName) {
    const err = 'Identitas actor pengambil foto wajib tercatat dari session aktif';
    return { valid: false, isValid: false, error: err, errors: [err] };
  }

  return { valid: true, isValid: true, error: null, errors: [] };
}

export const validateReceiptCameraEvidence = validatePhotoEvidence;

/**
 * Validasi Keseluruhan Payload Eksekusi Fisik Penerimaan
 * @param {Object} receiptRecord - Record dokumen penerimaan
 * @param {Object} payload - Data submit form penerimaan
 * @param {Array<Object>} existingBatches - Daftar batch existing di kebun tujuan
 * @returns {{ valid: boolean, error?: string, totalAccepted?: number, totalRejected?: number, discrepancyQty?: number }}
 */
export function validateReceiptCompletePayload(receiptRecord, payload, existingBatches = []) {
  if (!receiptRecord || !payload) {
    return { valid: false, error: 'Data receipt dan payload wajib disediakan' };
  }

  const { jalurPenerimaan, details, blockAllocations, photoEvidence } = payload;

  if (!jalurPenerimaan || (jalurPenerimaan !== JALUR_PENERIMAAN.LAPANGAN && jalurPenerimaan !== JALUR_PENERIMAAN.BIBITAN)) {
    return { valid: false, error: 'Jalur penerimaan wajib dipilih: LAPANGAN atau BIBITAN' };
  }

  // 1. Validasi foto
  const photoVal = validatePhotoEvidence(photoEvidence);
  if (!photoVal.valid) return photoVal;

  // 2. Validasi details
  if (!Array.isArray(details) || details.length === 0) {
    return { valid: false, error: 'Detail penerimaan batch minimal satu' };
  }

  let totalAccepted = 0;
  let totalRejected = 0;

  for (let i = 0; i < details.length; i++) {
    const d = details[i];
    const qtyVal = validateReceiptQuantities(d.qtyShipped, d.qtyAccepted, d.qtyRejected);
    if (!qtyVal.valid) {
      return { valid: false, error: `Detail #${i + 1} (${d.sourceBatchCode || 'Batch'}): ${qtyVal.error}` };
    }
    totalAccepted += (parseInt(d.qtyAccepted, 10) || 0);
    totalRejected += (parseInt(d.qtyRejected, 10) || 0);

    // Batch validation
    const batchVal = validateBatchSourceAndNew(d.sourceBatchCode, d.newBatchCode, jalurPenerimaan, existingBatches);
    if (!batchVal.valid) {
      return { valid: false, error: `Detail #${i + 1}: ${batchVal.error}` };
    }
  }

  // 3. Block validation
  const blockVal = validateBlockAllocations(totalAccepted, blockAllocations, jalurPenerimaan);
  if (!blockVal.valid) return blockVal;

  return {
    valid: true,
    totalAccepted,
    totalRejected,
    discrepancyQty: (receiptRecord.totalShippedQty || 0) - (totalAccepted + totalRejected)
  };
}

