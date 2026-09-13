/**
 * scripts/test-receipt-ksp-foundation.js
 * Automated Test Suite: Fondasi Data & Status Penerimaan Bibit Kebun Sepupu (PENERIMAAN-02)
 * 
 * Verifikasi 14 Requirement Kunci:
 * 1. Dispatch selesai membuat receipt.
 * 2. Receipt mendapatkan status MENUNGGU_PENERIMAAN_PENGURUS.
 * 3. Parent request tidak langsung SELESAI.
 * 4. Multiple dispatch menghasilkan multiple receipt (1 Dispatch = 1 Receipt).
 * 5. Receipt tetap terhubung ke parentRequestId.
 * 6. Receipt tetap terhubung ke dispatchId & dispatchDocNo.
 * 7. accepted + rejected > shipped ditolak oleh validator.
 * 8. allocation > accepted ditolak oleh validator.
 * 9. allocation != accepted ditolak oleh validator.
 * 10. source batch tidak dapat digunakan sebagai new batch.
 * 11. jalur LAPANGAN dapat menggunakan block allocation valid dari canonical block-master.
 * 12. jalur BIBITAN tidak menggunakan block allocation (ditolak jika disediakan).
 * 13. Actor dan timestamp tercatat di setiap mutasi/receipt.
 * 14. Numbering generator unik format RCP-YYYY-NNN.
 */

// Mock localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
}

import { storage } from '../js/core/storage.js';
import {
  RECEIPT_KSP_STATUS,
  RECEIPT_KSP_STATUS_LABELS,
  JALUR_PENERIMAAN,
  PHOTO_SOURCE,
  RECEIPT_KSP_STORAGE_KEY
} from '../js/core/receipt-ksp-constants.js';
import {
  validateReceiptQuantities,
  validateBlockAllocations,
  validateBatchSourceAndNew,
  validatePhotoEvidence,
  validateReceiptCompletePayload
} from '../js/core/receipt-ksp-validator.js';
import {
  generateReceiptDocNo,
  getReceiptKspTransactions,
  getReceiptKspById,
  getReceiptKspByDispatchId,
  createReceiptFromDispatch,
  updateReceiptKsp
} from '../js/core/receipt-ksp-manager.js';
import { processDispatchShipment } from '../js/modules/dispatch/dispatch-landing.js';
import { AUDIT_EVENT_TYPES } from '../js/core/transaction-actor.js';
import { BLOCK_MASTER } from '../js/data/block-master.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: PENERIMAAN BIBIT KEBUN SEPUPU (FONDASI DATA)      ');
console.log('========================================================================================\n');

// Bersihkan storage sebelum test
if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.clear) {
  globalThis.localStorage.clear();
}

// Mock Actors
const pengurusKebunAsal = {
  id: 'USR-TBS-001',
  userId: 'PGR-TBS',
  name: 'Ir. Budi Santoso',
  role: 'PENGURUS',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-TBS-01'
};

const mantriKebunAsal = {
  id: 'USR-TBS-MNT',
  userId: 'MNT-TBS',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-TBS-01'
};

const pengurusKebunTujuan = {
  id: 'USR-APM-001',
  userId: 'PGR-APM',
  name: 'Ir. Hendra Gunawan',
  role: 'PENGURUS',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01'
};

// =====================================================================================
// SECTION 1: DISPATCH HANDOFF TO RECEIPT & LIFECYCLE SEPARATION
// =====================================================================================
console.log('--- 1. Dispatch Handoff to Receipt Creation & Lifecycle ---');

// Setup mock parent request (Estate APM minta ke Kebun TBS)
const mockRequest = {
  id: 'REQ-KSP-TEST-001',
  docNo: '2026/NIR/KSP-001',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-APM', // Kebun Pemohon (Target Destination)
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01',
  targetEstateId: 'EST-TBS', // Kebun Sumber Bibit (TBS)
  targetEstateName: 'Tanah Besih',
  targetDivisionId: 'DIV-TBS-01',
  requestedClone: 'IRCA 19',
  approvedClone: 'IRCA 19',
  requestedQty: 5000,
  approvedQty: 5000,
  totalIssuedQty: 0,
  remainingQty: 5000,
  growthStage: 'Rubber Advance Planting Material',
  status: 'TERVERIFIKASI'
};

storage.set('requests_transactions', [mockRequest]);
storage.set('nursery_batches', [
  { id: 'BATCH-TBS-01', batchId: 'BATCH-TBS-01', batchCode: 'B-TBS-01', batchNo: 'B-TBS-01', clone: 'IRCA 19', klon: 'IRCA 19', stage: 'Rubber Advance Planting Material', estateId: 'EST-TBS', availableQty: 10000, initialQty: 10000, status: 'AVAILABLE' }
]);

// Test 1: Dispatch Pertama (Partial 2.000 Pkk)
const shipment1Form = {
  issuedDate: '2026-09-15',
  vehiclePlate: 'BK 8899 AB',
  shipmentQty: 2000,
  batchRows: [
    { batchCode: 'B-TBS-01', qty: 2000 }
  ]
};

const dispatchResult1 = await processDispatchShipment(mockRequest, shipment1Form, mantriKebunAsal);

assert(dispatchResult1.dispatchRecord !== null, '1. Dispatch #1 berhasil dibuat');
assert(dispatchResult1.receiptRecord !== null, '1b. Dispatch selesai otomatis membuat Receipt #1');
assert(dispatchResult1.receiptRecord.receiptDocNo.startsWith('RCP-2026-'), '1c. Nomor Receipt terstandarisasi RCP-2026-NNN');
assert(dispatchResult1.receiptRecord.status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS, '2. Receipt #1 mendapatkan status MENUNGGU_PENERIMAAN_PENGURUS');
assert(dispatchResult1.updatedRequest.status === 'PENGELUARAN_BERJALAN', '3a. Parent request partial pengeluaran tidak menjadi SELESAI (status: PENGELUARAN_BERJALAN)');
assert(dispatchResult1.updatedRequest.remainingQty === 3000, '3b. Remaining qty berkurang ke 3.000 Pkk');

// Test 2: Dispatch Kedua (Sisa 3.000 Pkk)
const shipment2Form = {
  issuedDate: '2026-09-16',
  vehiclePlate: 'BK 7766 CD',
  shipmentQty: 3000,
  batchRows: [
    { batchCode: 'B-TBS-01', qty: 3000 }
  ]
};

const dispatchResult2 = await processDispatchShipment(dispatchResult1.updatedRequest, shipment2Form, mantriKebunAsal);

assert(dispatchResult2.dispatchRecord !== null, '4a. Dispatch #2 berhasil dibuat');
assert(dispatchResult2.receiptRecord !== null, '4b. Multiple dispatch menghasilkan multiple receipt (Receipt #2 dibuat)');
assert(dispatchResult2.receiptRecord.receiptDocNo !== dispatchResult1.receiptRecord.receiptDocNo, '4c. Receipt #1 dan Receipt #2 memiliki docNo unik');
assert(dispatchResult2.receiptRecord.parentRequestId === mockRequest.id, '5. Receipt #2 tetap terhubung ke parentRequestId');
assert(dispatchResult2.receiptRecord.dispatchId === dispatchResult2.dispatchRecord.id, '6a. Receipt #2 tetap terhubung ke dispatchId #2');
assert(dispatchResult2.receiptRecord.dispatchDocNo === dispatchResult2.dispatchRecord.docNo, '6b. Receipt #2 tetap terhubung ke dispatchDocNo #2');

// Test 3: Lifecycle Isolation Parent Request
assert(dispatchResult2.isCompleted === true, '3c. Kuota pengeluaran Mantri sudah terpenuhi (remainingQty === 0)');
assert(dispatchResult2.updatedRequest.status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS, '3d. Parent request setelah dispatch selesai TIDAK langsung SELESAI, tapi masuk ke MENUNGGU_PENERIMAAN_PENGURUS');
assert(dispatchResult2.updatedRequest.targetNextRole === 'PENGURUS', '3e. Target next role parent request adalah PENGURUS');
assert(dispatchResult2.updatedRequest.targetNextEstateId === mockRequest.estateId, '3f. Target next estate parent request adalah Kebun Pemohon (EST-APM)');

// Cek Storage
const allReceipts = getReceiptKspTransactions();
assert(allReceipts.length === 2, '4d. Total tepat 2 Dokumen Penerimaan tersimpan di storage receipt_ksp_transactions');
assert(allReceipts[0].totalShippedQty === 2000, '4e. Shipped Qty Receipt #1 tepat 2.000 Pkk');
assert(allReceipts[1].totalShippedQty === 3000, '4f. Shipped Qty Receipt #2 tepat 3.000 Pkk');
assert(allReceipts[0].vehiclePlate === 'BK 8899 AB', '4g. Vehicle plate tersimpan di Receipt #1');
assert(allReceipts[1].vehiclePlate === 'BK 7766 CD', '4h. Vehicle plate tersimpan di Receipt #2');

// =====================================================================================
// SECTION 2: VALIDATOR QUANTITIES (ACCEPTED + REJECTED <= SHIPPED)
// =====================================================================================
console.log('\n--- 2. Quantity Validation (accepted + rejected <= shipped) ---');

// Test 7: accepted + rejected > shipped ditolak
const vQty1 = validateReceiptQuantities(1000, 900, 200); // 1100 > 1000
assert(vQty1.valid === false && vQty1.error.includes('melebihi'), '7a. accepted (900) + rejected (200) > shipped (1000) ditolak');

const vQty2 = validateReceiptQuantities(1000, 1001, 0); // 1001 > 1000
assert(vQty2.valid === false, '7b. accepted > shipped ditolak');

const vQty3 = validateReceiptQuantities(1000, 0, 1001); // 1001 > 1000
assert(vQty3.valid === false, '7c. rejected > shipped ditolak');

const vQty4 = validateReceiptQuantities(1000, 950, 50); // 1000 === 1000 (Tepat)
assert(vQty4.valid === true, '7d. accepted (950) + rejected (50) === shipped (1000) valid (tanpa selisih)');

const vQty5 = validateReceiptQuantities(1000, 900, 50); // 950 < 1000 (Ada selisih hilang di jalan 50)
assert(vQty5.valid === true && vQty5.hasDiscrepancy === true && vQty5.discrepancyQty === 50, '7e. accepted (900) + rejected (50) < shipped (1000) valid dengan discrepancy 50');

const vQtyNeg = validateReceiptQuantities(1000, -10, 50);
assert(vQtyNeg.valid === false, '7f. Quantity negatif ditolak');

// =====================================================================================
// SECTION 3: BLOCK ALLOCATION VALIDATOR (LAPANGAN VS BIBITAN)
// =====================================================================================
console.log('\n--- 3. Block Allocation Validation (LAPANGAN vs BIBITAN) ---');

// Dapatkan block valid dari block-master.js
const validBlockAPM = BLOCK_MASTER.find(b => (b.estateCode === 'EST-APM' || b.estateId === 'EST-APM') && (b.status === 'ACTIVE' || !b.status)) || BLOCK_MASTER[0];
const otherBlockAPM = BLOCK_MASTER.find(b => (b.estateCode === 'EST-APM' || b.estateId === 'EST-APM') && b.id !== validBlockAPM.id) || BLOCK_MASTER[1];

// Test 8: allocation > accepted ditolak
const vAlloc1 = validateBlockAllocations(1000, [
  { blockId: validBlockAPM.id, allocatedQty: 1200 }
], JALUR_PENERIMAAN.LAPANGAN);
assert(vAlloc1.valid === false && vAlloc1.error.includes('tidak sama'), '8. allocation (1200) > accepted (1000) ditolak');

// Test 9: allocation != accepted ditolak (kurang alokasi)
const vAlloc2 = validateBlockAllocations(1000, [
  { blockId: validBlockAPM.id, allocatedQty: 800 }
], JALUR_PENERIMAAN.LAPANGAN);
assert(vAlloc2.valid === false, '9a. allocation (800) < accepted (1000) ditolak (harus dialokasikan penuh)');

// Test 9b: allocation == accepted valid
const vAlloc3 = validateBlockAllocations(1000, [
  { blockId: validBlockAPM.id, allocatedQty: 600 },
  { blockId: otherBlockAPM.id, allocatedQty: 400 }
], JALUR_PENERIMAAN.LAPANGAN);
assert(vAlloc3.valid === true, '9b. sum allocation (600 + 400) === accepted (1000) valid untuk LAPANGAN');

// Test 10: Fake Block ID ditolak
const vAllocFake = validateBlockAllocations(1000, [
  { blockId: 'BLOCK-FIKTIF-999', allocatedQty: 1000 }
], JALUR_PENERIMAAN.LAPANGAN);
assert(vAllocFake.valid === false && vAllocFake.error.includes('Master Blok'), '9c. Block fiktif yang tidak ada di block-master ditolak');

// Test 11: jalur LAPANGAN dapat menggunakan block allocation
assert(vAlloc3.valid === true && vAlloc3.allocations.length === 2, '11. Jalur LAPANGAN berhasil memetakan block allocation');

// Test 12: jalur BIBITAN tidak menggunakan block allocation
const vAllocBibitan1 = validateBlockAllocations(1000, [], JALUR_PENERIMAAN.BIBITAN);
assert(vAllocBibitan1.valid === true, '12a. Jalur BIBITAN valid tanpa block allocation');

const vAllocBibitan2 = validateBlockAllocations(1000, [
  { blockId: validBlockAPM.id, allocatedQty: 1000 }
], JALUR_PENERIMAAN.BIBITAN);
assert(vAllocBibitan2.valid === false && vAllocBibitan2.error.includes('Jalur BIBITAN tidak menggunakan alokasi blok'), '12b. Jalur BIBITAN ditolak jika menyertakan block allocation');

// =====================================================================================
// SECTION 4: BATCH SOURCE & NEW BATCH VALIDATION (BIBITAN)
// =====================================================================================
console.log('\n--- 4. Batch Source & New Batch Isolation ---');

const existingBatchesMock = [
  { batchCode: 'B-TBS-01', id: 'BATCH-TBS-01' },
  { batchCode: 'B-APM-001', id: 'BATCH-APM-001' }
];

// Test 10: source batch tidak dapat digunakan sebagai new batch
const vBatch1 = validateBatchSourceAndNew('B-TBS-01', 'B-TBS-01', JALUR_PENERIMAAN.BIBITAN, existingBatchesMock);
assert(vBatch1.valid === false && vBatch1.error.includes('sama dengan batch sumber'), '10a. new batch code sama dengan source batch code ditolak');

// New batch collision with existing local batch
const vBatch2 = validateBatchSourceAndNew('B-TBS-01', 'B-APM-001', JALUR_PENERIMAAN.BIBITAN, existingBatchesMock);
assert(vBatch2.valid === false && vBatch2.error.includes('sudah digunakan'), '10b. new batch code bentrok dengan batch yang sudah ada ditolak');

// Valid new batch for BIBITAN
const vBatch3 = validateBatchSourceAndNew('B-TBS-01', 'B-APM-NEW-01', JALUR_PENERIMAAN.BIBITAN, existingBatchesMock);
assert(vBatch3.valid === true, '10c. new batch code unik dan valid untuk jalur BIBITAN');

// Valid for LAPANGAN (tidak butuh new batch)
const vBatchLapangan = validateBatchSourceAndNew('B-TBS-01', null, JALUR_PENERIMAAN.LAPANGAN, existingBatchesMock);
assert(vBatchLapangan.valid === true, '10d. Jalur LAPANGAN tidak memerlukan new batch code');

// =====================================================================================
// SECTION 5: PHOTO EVIDENCE VALIDATOR
// =====================================================================================
console.log('\n--- 5. Photo Evidence Validation ---');

const invalidPhotoSource = {
  dataUrl: 'data:image/jpeg;base64,samplephoto123',
  source: 'GALLERY', // Invalid
  capturedAt: new Date().toISOString(),
  capturedByUserId: 'USR-APM-001'
};
const vPhoto1 = validatePhotoEvidence(invalidPhotoSource);
assert(vPhoto1.valid === false && vPhoto1.error.includes('CAMERA'), '5a. Bukti foto dengan source GALLERY ditolak (wajib CAMERA)');

const validPhotoCamera = {
  dataUrl: 'data:image/jpeg;base64,samplephoto123',
  source: PHOTO_SOURCE.CAMERA,
  capturedAt: new Date().toISOString(),
  capturedByUserId: 'USR-APM-001',
  capturedByName: 'Ir. Hendra Gunawan',
  capturedByRole: 'PENGURUS',
  latitude: null, // GPS optional
  longitude: null
};
const vPhoto2 = validatePhotoEvidence(validPhotoCamera);
assert(vPhoto2.valid === true, '5b. Bukti foto dari CAMERA dengan GPS optional valid');

// =====================================================================================
// SECTION 6: ACTOR & AUDIT TRAIL RECORDING
// =====================================================================================
console.log('\n--- 6. Actor and Audit Trail Integrity ---');

const rcp1 = allReceipts[0];
assert(rcp1.createdByUserId !== null, '13a. createdByUserId tercatat di Receipt #1');
assert(rcp1.createdByName !== null, '13b. createdByName tercatat di Receipt #1');
assert(rcp1.createdByRole !== null, '13c. createdByRole tercatat di Receipt #1');
assert(rcp1.createdAt !== null, '13d. createdAt tercatat di Receipt #1');
assert(Array.isArray(rcp1.auditTrail) && rcp1.auditTrail.length > 0, '13e. auditTrail tercatat di Receipt #1');

// Update Receipt oleh Pengurus Kebun Penerima (Action APPROVE)
const updatedRcp = updateReceiptKsp(
  rcp1.id,
  {
    status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
    targetNextRole: 'ASISTEN_KEPALA',
    targetNextDivisionId: null
  },
  AUDIT_EVENT_TYPES.APPROVE,
  'Pengurus menyetujui penerimaan awal dan meneruskan ke Askep',
  pengurusKebunTujuan
);

assert(updatedRcp.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA, '13f. Transisi status ke MENUNGGU_VERIFIKASI_ASISTEN_KEPALA berhasil');
assert(updatedRcp.approvedByUserId === pengurusKebunTujuan.userId, '13g. approvedByUserId tercatat sesuai actor pengurus tujuan');
assert(updatedRcp.approvedByName === pengurusKebunTujuan.name, '13h. approvedByName tercatat');
assert(updatedRcp.auditTrail.length >= 2, '13i. History audit trail terakumulasi dengan benar');

// =====================================================================================
// SUMMARY
// =====================================================================================
console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL RECEIPT KSP FOUNDATION TESTS PASSED!\n');
} else {
  console.error('❌ SOME RECEIPT KSP FOUNDATION TESTS FAILED!\n');
  process.exit(1);
}
