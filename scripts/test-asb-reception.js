/**
 * scripts/test-asb-reception.js
 * Verification Test Suite for Penerimaan Bibit Asisten Bibitan (TASK ASB-06)
 */

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
  global.localStorage = globalThis.localStorage;
}

import { storage } from '../js/core/storage.js';
import {
  RECEIPT_KSP_STATUS,
  RECEIPT_KSP_STORAGE_KEY,
  PHOTO_SOURCE
} from '../js/core/receipt-ksp-constants.js';
import {
  getReceiptKspTransactions,
  getReceiptKspById,
  updateReceiptKsp,
  createNurseryBatchesFromReceipt,
  generateReceiptNewBatchCode
} from '../js/core/receipt-ksp-manager.js';
import {
  validateReceiptQuantities,
  validatePhotoEvidence
} from '../js/core/receipt-ksp-validator.js';
import {
  canPerformAsistenBibitanReceiptAction,
  canPerformMantriBibitanReceiptAction,
  canPerformAsistenLapanganReceiptAction,
  processAsistenBibitanVerification,
  processAsistenBibitanReturn,
  processMantriBibitanFinal
} from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';
import {
  getAllBatches,
  getBatchById,
  getBatchByCode,
  resetBatchMasterToDefault
} from '../js/data/batch-master.js';
import {
  getAllBedengan,
  getBedenganById,
  resetBedenganMasterToDefault
} from '../js/data/bedengan-master.js';
import { getActivePrograms, getProgramById } from '../js/data/program-master.js';
import { getAllEstates, getNurseryDivisionsByEstate, resolveNurseryDivision } from '../js/data/estate-master.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('================================================================================');
console.log('         TASK ASB-06: FINALISASI MODUL PENERIMAAN BIBIT ASISTEN BIBITAN         ');
console.log('================================================================================\n');

// Reset Masters & Storage
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set(RECEIPT_KSP_STORAGE_KEY, []);

const userAsbTBS = {
  userId: 'USR-ASB-TBS',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const userMantriTBS = {
  userId: 'USR-MNT-TBS',
  name: 'Mantri Bibitan TBS',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const userAsbAPM = {
  userId: 'USR-ASB-APM',
  name: 'Asisten Bibitan APM',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const userPengurus = {
  userId: 'USR-PNG-01',
  name: 'Pengurus Kebun',
  role: 'PENGURUS',
  estateId: 'EST-TBS'
};

// -----------------------------------------------------------------------------
// 1, 2 & 23: Receipt Scope, Status Transition & Scope Isolation
// -----------------------------------------------------------------------------
console.log('--- 1, 2 & 23. Receipt Scope, Status Transition & Scope Isolation ---');
const sampleReceipt1 = {
  id: 'RCP-2026-001',
  receiptDocNo: 'RCP-2026-001',
  docNo: 'RCP-2026-001',
  parentRequestId: 'REQ-2026-001',
  parentRequestDocNo: 'REQ-2026-001',
  dispatchId: 'DSP-2026-001',
  dispatchDocNo: 'DSP-2026-001',
  targetEstateId: 'EST-TBS',
  targetEstateName: 'Tanah Besih',
  targetNextEstateId: 'EST-TBS',
  targetNextDivisionId: 'DIV-001',
  targetNextDivisionName: 'Divisi I',
  targetNextRole: 'ASISTEN_BIBITAN',
  jalurPenerimaan: 'BIBITAN',
  status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN,
  totalShippedQty: 1000,
  clone: 'PB 260',
  programId: 'PRG-2026-001',
  programName: 'Program Nursery 2026 - Batch 1',
  details: [
    {
      sourceBatchId: 'BATCH-TBS-01',
      sourceBatchCode: 'B-TBS-01',
      cloneId: 'PB 260',
      category: 'Polibag Besar',
      growthStage: 'Rubber Advance Planting Material',
      qtyShipped: 1000
    }
  ]
};

storage.set(RECEIPT_KSP_STORAGE_KEY, [sampleReceipt1]);

// Check Scope
const canAsbTBS = canPerformAsistenBibitanReceiptAction(sampleReceipt1, userAsbTBS);
assert(canAsbTBS === true, '1. ASISTEN_BIBITAN TBS can perform action on matching estate/division receipt');

const canAsbAPM = canPerformAsistenBibitanReceiptAction(sampleReceipt1, userAsbAPM);
assert(canAsbAPM === false, '23. Scope Isolation: ASISTEN_BIBITAN APM blocked from TBS receipt');

const canPengurus = canPerformAsistenBibitanReceiptAction(sampleReceipt1, userPengurus);
assert(canPengurus === false, '23b. Scope Isolation: PENGURUS cannot perform ASB receipt action');

const canMantriAtAsbStage = canPerformMantriBibitanReceiptAction(sampleReceipt1, userMantriTBS);
assert(canMantriAtAsbStage === false, '23c. Scope Isolation: Mantri cannot act before ASB verification');

// Asb Verifies Receipt and forwards to Mantri
const verifiedReceipt = processAsistenBibitanVerification(
  sampleReceipt1.id,
  { notes: 'Bibit siap ditempatkan di Bedengan 001' },
  userAsbTBS
);
assert(verifiedReceipt.status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN, '2. Receipt status transitioned to MENUNGGU_PENERIMAAN_MANTRI_BIBITAN');
assert(verifiedReceipt.targetNextRole === 'MANTRI_TANAMAN', '2b. targetNextRole updated to MANTRI_TANAMAN');
assert(verifiedReceipt.asbVerifiedByUserId === userAsbTBS.userId, '2c. asbVerifiedByUserId properly tracked');

const canMantriNow = canPerformMantriBibitanReceiptAction(verifiedReceipt, userMantriTBS);
assert(canMantriNow === true, '2d. Mantri Bibitan authorized to act after ASB verification');

// -----------------------------------------------------------------------------
// 3, 4, 5 & 6: Quantity Validation & Reject Reason Check
// -----------------------------------------------------------------------------
console.log('\n--- 3, 4, 5 & 6. Quantity Validation & Reject Reason Check ---');
const valNegativeShipped = validateReceiptQuantities(0, 0, 0);
assert(valNegativeShipped.valid === false, '3. Shipment quantity must be > 0');

const valOverAccept = validateReceiptQuantities(1000, 1100, 0);
assert(valOverAccept.valid === false, '4. Accepted quantity cannot exceed shipped quantity');

const valOverReject = validateReceiptQuantities(1000, 500, 600);
assert(valOverReject.valid === false, '5. Accepted + Rejected cannot exceed shipped quantity');

const valValidQuantities = validateReceiptQuantities(1000, 950, 50);
assert(valValidQuantities.valid === true, '5b. Valid partition of accepted and rejected passes validation');

// -----------------------------------------------------------------------------
// 7, 8 & 9: Partial Receipt, Full Receipt & Discrepancy Handling
// -----------------------------------------------------------------------------
console.log('\n--- 7, 8 & 9. Partial Receipt, Full Receipt & Discrepancy Handling ---');
// Partial: 1000 shipped -> 900 accepted, 50 rejected, 50 missing (discrepancy)
const photoMock = {
  dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  source: PHOTO_SOURCE.CAMERA,
  capturedByUserId: userMantriTBS.userId,
  capturedByName: userMantriTBS.name,
  capturedByRole: userMantriTBS.role,
  capturedAt: new Date().toISOString(),
  latitude: 3.123456,
  longitude: 98.654321
};

const finalFormPartial = {
  examinationDate: '2026-09-13',
  details: [
    {
      sourceBatchId: 'BATCH-TBS-01',
      sourceBatchCode: 'B-TBS-01',
      cloneId: 'PB 260',
      category: 'Polibag Besar',
      growthStage: 'Rubber Advance Planting Material',
      qtyAccepted: 900,
      qtyRejected: 50,
      rejectReason: 'Polibag sobek saat pengangkutan'
    }
  ],
  rejectReason: 'Polibag sobek saat pengangkutan',
  discrepancyReason: '50 Pkk tidak terangkut dari lokasi asal',
  photoEvidence: photoMock,
  notes: 'Penataan bibit selesai'
};

const processedPartial = processMantriBibitanFinal(sampleReceipt1.id, finalFormPartial, userMantriTBS);
assert(processedPartial.status === RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH, '9. Receipt with discrepancy gets status DITERIMA_DENGAN_SELISIH');
assert(processedPartial.totalAcceptedQty === 900, '7. Partial receipt acceptedQty = 900');
assert(processedPartial.totalRejectedQty === 50, '6. Reject quantity = 50 with reason preserved');
assert(processedPartial.discrepancyQty === 50, '9b. Discrepancy quantity = 50 accurately computed');

// -----------------------------------------------------------------------------
// 10, 11, 12, 13, 14, 15, 16, 17: Batch Generation, Stock & Traceability
// -----------------------------------------------------------------------------
console.log('\n--- 10 - 17. Batch Creation, availableQty, Bedengan & Full Traceability ---');
const nurseryBatches = storage.get('nursery_batches', []);
assert(nurseryBatches.length > 0, '12. Batch canonical storage "nursery_batches" contains generated batch');

const createdBatch = nurseryBatches.find(b => b.sourceReceiptId === sampleReceipt1.id);
assert(createdBatch !== undefined, '10. New nursery batch successfully created from receipt');
assert(createdBatch.availableQty === 900, '11. Batch availableQty strictly equals acceptedQty (900)');
assert(createdBatch.currentQty === 900, '11b. Compatibility currentQty equals availableQty');
assert(createdBatch.sourceReceiptId === sampleReceipt1.id, '13. Batch preserves sourceReceiptId');
assert(createdBatch.sourceDispatchId === sampleReceipt1.dispatchId, '14. Batch preserves sourceDispatchId');
assert(createdBatch.sourceParentRequestId === sampleReceipt1.parentRequestId, '15. Batch preserves sourceParentRequestId');
assert(createdBatch.sourceBatchCode === 'B-TBS-01', '16. Source batch code traceability preserved');

// Zero Acceptance safety test: If accepted = 0, no AVAILABLE batch should be made
const zeroAcceptanceResult = createNurseryBatchesFromReceipt(
  { ...sampleReceipt1, id: 'RCP-ZERO-TEST' },
  [{ sourceBatchId: 'B-SRC', sourceBatchCode: 'B-SRC', qtyAccepted: 0, qtyRejected: 100 }],
  userMantriTBS
);
assert(zeroAcceptanceResult.length === 0, '10b. Zero acceptedQty produces no new available stock batch');

// -----------------------------------------------------------------------------
// 18 & 19: Program & Estate/Division Master Validation
// -----------------------------------------------------------------------------
console.log('\n--- 18 & 19. Program & Estate/Division Master Validation ---');
const program = getProgramById(sampleReceipt1.programId);
assert(program !== null && program.status === 'ACTIVE', '18. Program ID validated against canonical program-master');

const division = resolveNurseryDivision(sampleReceipt1.targetNextDivisionId, sampleReceipt1.targetEstateId);
assert(division !== null && division.estateId === sampleReceipt1.targetEstateId, '19. Division successfully validated against estate master');

// -----------------------------------------------------------------------------
// 20: Multiple Dispatch -> Multiple Receipt Compatibility
// -----------------------------------------------------------------------------
console.log('\n--- 20. Multiple Dispatch -> Multiple Receipt Handling ---');
// Simulating 2 dispatches on 1 parent request
const dispatch1Receipt = {
  id: 'RCP-DSP-01',
  parentRequestId: 'REQ-MULTI-01',
  dispatchId: 'DSP-MULTI-01',
  totalShippedQty: 500,
  targetEstateId: 'EST-TBS',
  targetNextDivisionId: 'DIV-001',
  clone: 'PB 260'
};
const dispatch2Receipt = {
  id: 'RCP-DSP-02',
  parentRequestId: 'REQ-MULTI-01',
  dispatchId: 'DSP-MULTI-02',
  totalShippedQty: 300,
  targetEstateId: 'EST-TBS',
  targetNextDivisionId: 'DIV-001',
  clone: 'PB 260'
};

const batchDsp1 = createNurseryBatchesFromReceipt(dispatch1Receipt, [{ qtyAccepted: 500, sourceBatchCode: 'B-01' }], userMantriTBS);
const batchDsp2 = createNurseryBatchesFromReceipt(dispatch2Receipt, [{ qtyAccepted: 300, sourceBatchCode: 'B-02' }], userMantriTBS);

assert(batchDsp1[0].sourceDispatchId === 'DSP-MULTI-01', '20. First dispatch receipt produces independent batch with DSP-01 traceability');
assert(batchDsp2[0].sourceDispatchId === 'DSP-MULTI-02', '20b. Second dispatch receipt produces independent batch with DSP-02 traceability');
assert(batchDsp1[0].batchCode !== batchDsp2[0].batchCode, '24. Duplicate batch prevention: Multiple receipts receive unique batch codes');

// -----------------------------------------------------------------------------
// 21: Camera Evidence & Security Validation
// -----------------------------------------------------------------------------
console.log('\n--- 21. Camera Evidence & Security Validation ---');
const validPhotoCheck = validatePhotoEvidence(photoMock);
assert(validPhotoCheck.valid === true, '21. Camera photo evidence with metadata passes validation');

const invalidGalleryPhoto = { ...photoMock, source: 'GALLERY' };
const galleryCheck = validatePhotoEvidence(invalidGalleryPhoto);
assert(galleryCheck.valid === false, '21b. Gallery photo upload strictly rejected by validator');

// -----------------------------------------------------------------------------
// 22 & 25: Clean All Compatibility & Regression
// -----------------------------------------------------------------------------
console.log('\n--- 22 & 25. Clean All Compatibility & Regression ---');
cleanAllTransactionalData();

const receiptsAfterClean = storage.get(RECEIPT_KSP_STORAGE_KEY, []);
assert(receiptsAfterClean.length === 0, '22. Clean All wipes all temporary receipt transactions');

const batchesAfterClean = getAllBatches();
assert(batchesAfterClean.length > 0, '22b. Clean All preserves baseline nursery_batches master data');

const bedenganAfterClean = getAllBedengan();
assert(bedenganAfterClean.length > 0, '22c. Clean All preserves bedengan_master data');

assert(getActivePrograms().length > 0, '25. Program master remains intact and accessible after clean');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${passedAssertions}`);
console.log(`TOTAL ASSERTIONS FAILED: ${failedAssertions}`);
console.log('================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
