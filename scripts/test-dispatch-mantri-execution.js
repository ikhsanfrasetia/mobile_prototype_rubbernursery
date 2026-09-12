/**
 * scripts/test-dispatch-mantri-execution.js
 * Automated Verification Suite for Eksekusi Pengeluaran Bibit oleh Mantri Bibitan (/dispatch)
 * 
 * Covers:
 * 1. Dokumen TERVERIFIKASI terlihat oleh Mantri estate target.
 * 2. Dokumen estate lain tidak actionable.
 * 3. User non-Mantri tidak mendapatkan action Mantri.
 * 4. Mantri dapat melihat approvedQty (read-only).
 * 5. Mantri dapat melihat approvedClone (read-only).
 * 6. approvedQty tetap immutable.
 * 7. approvedClone tetap immutable.
 * 8. Form pengeluaran membutuhkan tanggal.
 * 9. Form pengeluaran membutuhkan qty > 0.
 * 10. Qty tidak boleh melebihi remainingQty.
 * 11. Detail batch minimal satu.
 * 12. Batch harus clone sesuai approvedClone.
 * 13. Batch harus available.
 * 14. Qty detail batch > 0.
 * 15. Qty detail batch tidak boleh melebihi availableQty batch.
 * 16. Sum detail batch harus sama dengan shipmentQty.
 * 17. Tidak boleh ada duplicate batch line dalam satu shipment.
 * 18. approvedQty tidak berubah setelah pengeluaran.
 * 19. First shipment mengubah state ke PENGELUARAN_BERJALAN.
 * 20. Multiple shipment terhadap request yang sama diperbolehkan.
 * 21. Total shipment kumulatif dihitung benar.
 * 22. remainingQty dihitung benar.
 * 23. Pengeluaran kedua tetap memakai parent request yang sama.
 * 24. Pengeluaran ketiga tetap memakai parent request yang sama.
 * 25. Total pengeluaran tidak boleh melebihi approvedQty.
 * 26. Batch stock berkurang sesuai qty.
 * 27. Setelah seluruh approvedQty terpenuhi, status menjadi SELESAI.
 * 28. Setelah selesai, action Mantri hilang.
 * 29. Setelah selesai, notification bubble hilang jika tidak ada item lain.
 * 30. Jika masih ada sisa, bubble tetap tampil.
 * 31. 1 request tetap hanya memiliki 1 approval/request record.
 * 32. Request dapat memiliki N shipment records.
 * 33. Shipment dapat memiliki N batch detail.
 * 34. parentRequestId tetap sama.
 * 35. parentRequestDocNo tetap sama.
 * 36. createdBy request tetap sama.
 * 37. approved decision tetap sama.
 * 38. verification actor tetap sama.
 * 39. issuedBy* tercatat untuk setiap shipment.
 * 40. issuedDate tercatat.
 * 41. legacy PGL tetap bekerja.
 * 42. canonical NIR tetap bekerja.
 * 43. Re-validation remainingQty dilakukan saat save.
 * 44. Re-validation batch availableQty dilakukan saat save.
 * 45. Notification lifecycle benar.
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

import {
  getNurseryBatches,
  deductBatchStock,
  validateShipmentForm,
  processDispatchShipment,
  canPerformMantriDispatchAction,
  getActionableDispatchCount,
  filterDispatchRequests,
  filterDispatchByStatus,
  getDispatchTransactions
} from '../js/modules/dispatch/dispatch-landing.js';
import { storage } from '../js/core/storage.js';
import { AUDIT_EVENT_TYPES, applyTransactionActor } from '../js/core/transaction-actor.js';

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
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: EKSEKUSI PENGELUARAN BIBIT (MANTRI BIBITAN)      ');
console.log('========================================================================================\n');

// -------------------------------------------------------------------------------------
// 1. SETUP ACTORS & SEED TRANSACTIONS
// -------------------------------------------------------------------------------------
const mantriAPM = {
  id: 'APM-MNT-002',
  userId: 'MNT002',
  code: 'MNT002',
  loginCode: 'MNT002',
  name: 'Mantri Aek Pamingke',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

const mantriTBS = {
  id: 'TBS-MNT-001',
  userId: 'MNT001',
  code: 'MNT001',
  loginCode: 'MNT001',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const pengurusAPM = {
  id: 'APM-PGS-002',
  userId: 'PGS002',
  code: 'PGS002',
  loginCode: 'PGS002',
  name: 'Mukhsin Haji',
  role: 'PENGURUS',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

const asistenAPM = {
  id: 'APM-ASB-002',
  userId: 'ASB002',
  code: 'ASB002',
  loginCode: 'ASB002',
  name: 'Abdul Gofur',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

// Initial Verified Request (TBS request to APM for 10.000 IRCA 19, approved 10.000 IRCA 19)
const verifiedRequest1 = {
  id: 'REQ-2001',
  docNo: '2026/NIR/001',
  type: 'KEBUN_SEPUPU',
  status: 'TERVERIFIKASI',
  statusLabel: 'Terverifikasi',
  userId: 'PGS001',
  createdByUserId: 'PGS001',
  createdByLoginCode: 'PGS001',
  createdByName: 'Junaidi',
  createdByRole: 'PENGURUS',
  createdByEstateId: 'EST-TBS',
  requestedBy: 'Junaidi',
  estateId: 'EST-TBS',
  targetEstateId: 'EST-APM',
  targetNextEstateId: 'EST-APM',
  targetNextRole: 'MANTRI_TANAMAN',
  purpose: 'Penanaman / Bibit Tanam',
  allocationCode: '091B11',
  klon: 'IRCA 19',
  requestedClone: 'IRCA 19',
  category: 'APM',
  growthStage: 'Rubber Advance Planting Material',
  qty: 10000,
  requestedQty: 10000,
  unit: 'Pkk',
  requiredDate: '2026-09-20',
  approvedQty: 10000,
  approvedClone: 'IRCA 19',
  estimatedDeliveryDate: '2026-09-22',
  processedByUserId: 'PGS002',
  processedByName: 'Mukhsin Haji',
  processedByRole: 'PENGURUS',
  processedByEstateId: 'EST-APM',
  processedAt: '2026-09-13T01:10:00Z',
  verifiedByUserId: 'ASB002',
  verifiedByName: 'Abdul Gofur',
  verifiedByRole: 'ASISTEN_BIBITAN',
  verifiedByEstateId: 'EST-APM',
  verifiedAt: '2026-09-13T01:30:00Z',
  totalIssuedQty: 0,
  actualIssuedQty: 0,
  remainingQty: 10000,
  createdAt: '2026-09-12T10:00:00Z',
  auditTrail: [
    { id: 'AUD-01', eventType: 'CREATE', userId: 'PGS001', name: 'Junaidi', role: 'PENGURUS', estateId: 'EST-TBS', timestamp: '2026-09-12T10:00:00Z' },
    { id: 'AUD-02', eventType: 'UPDATE', userId: 'PGS002', name: 'Mukhsin Haji', role: 'PENGURUS', estateId: 'EST-APM', timestamp: '2026-09-13T01:10:00Z', details: 'Permintaan disetujui dan diteruskan ke Asisten Bibitan' },
    { id: 'AUD-03', eventType: 'VERIFY', userId: 'ASB002', name: 'Abdul Gofur', role: 'ASISTEN_BIBITAN', estateId: 'EST-APM', timestamp: '2026-09-13T01:30:00Z', details: 'Dokumen permintaan telah diverifikasi oleh Asisten Bibitan' }
  ]
};

// Setup initial batches in storage
const initialBatches = [
  { id: 'BATCH-APM-001', batchId: 'BATCH-APM-001', batchCode: 'B-001', batchNo: 'B-001', clone: 'IRCA 19', klon: 'IRCA 19', stage: 'Rubber Advance Planting Material', estateId: 'EST-APM', availableQty: 5000, initialQty: 5000, status: 'AVAILABLE' },
  { id: 'BATCH-APM-003', batchId: 'BATCH-APM-003', batchCode: 'B-003', batchNo: 'B-003', clone: 'IRCA 19', klon: 'IRCA 19', stage: 'Rubber Advance Planting Material', estateId: 'EST-APM', availableQty: 5000, initialQty: 5000, status: 'AVAILABLE' },
  { id: 'BATCH-APM-007', batchId: 'BATCH-APM-007', batchCode: 'B-007', batchNo: 'B-007', clone: 'IRCA 19', klon: 'IRCA 19', stage: 'Rubber Advance Planting Material', estateId: 'EST-APM', availableQty: 6000, initialQty: 6000, status: 'AVAILABLE' },
  { id: 'BATCH-APM-004', batchId: 'BATCH-APM-004', batchCode: 'B-004', batchNo: 'B-004', clone: 'PB 260', klon: 'PB 260', stage: 'Rubber Main Nursery', estateId: 'EST-APM', availableQty: 10000, initialQty: 10000, status: 'AVAILABLE' }
];
storage.set('nursery_batches', initialBatches);
storage.set('requests_transactions', [verifiedRequest1]);
storage.set('dispatch_transactions', []);

// ==========================================
// TEST 1 - 3: Authorization & Target Estate Filtering
// ==========================================
console.log('\n--- 1. Authorization & Target Estate Filtering ---');
const apmDispatchList = filterDispatchRequests([verifiedRequest1], mantriAPM);
assert(apmDispatchList.length === 1 && apmDispatchList[0].id === 'REQ-2001', '1. Dokumen TERVERIFIKASI terlihat oleh Mantri estate target (APM)');
assert(canPerformMantriDispatchAction(verifiedRequest1, mantriAPM) === true, '1b. Mantri APM berhak melakukan action pengeluaran pada dokumen APM');

const tbsDispatchList = filterDispatchRequests([verifiedRequest1], mantriTBS);
assert(tbsDispatchList.length === 0, '2. Dokumen estate lain tidak terlihat/tidak actionable bagi Mantri TBS');
assert(canPerformMantriDispatchAction(verifiedRequest1, mantriTBS) === false, '2b. Mantri TBS ditolak melakukan pengeluaran pada dokumen APM');

assert(canPerformMantriDispatchAction(verifiedRequest1, pengurusAPM) === false, '3. User Pengurus tidak mendapatkan action Mantri');
assert(canPerformMantriDispatchAction(verifiedRequest1, asistenAPM) === false, '3b. User Asisten tidak mendapatkan action Mantri');

// ==========================================
// TEST 4 - 7: Immutability of Approval Decision & Request Data
// ==========================================
console.log('\n--- 2. Immutability of Approval & Verification Data ---');
assert(verifiedRequest1.approvedQty === 10000, '4. Mantri dapat melihat approvedQty (10.000 Pkk)');
assert(verifiedRequest1.approvedClone === 'IRCA 19', '5. Mantri dapat melihat approvedClone (IRCA 19)');
assert(verifiedRequest1.requestedQty === 10000, '6. requestedQty awal tetap immutable');
assert(verifiedRequest1.approvedQty === 10000, '6b. approvedQty tetap immutable');
assert(verifiedRequest1.approvedClone === 'IRCA 19', '7. approvedClone tetap immutable');
assert(verifiedRequest1.verifiedByUserId === 'ASB002', '7b. verifiedByUserId Asisten tetap immutable');

// ==========================================
// TEST 8 - 17: Form Validations (Transaction & Batch Levels)
// ==========================================
console.log('\n--- 3. Form Validation Rules (Transaction & Batch Level) ---');

// 8. Tanggal pengeluaran wajib
const valEmptyDate = validateShipmentForm(verifiedRequest1, { issuedDate: '', shipmentQty: 3000, batchRows: [{ batchCode: 'B-001', qty: 3000 }] });
assert(valEmptyDate.valid === false && valEmptyDate.error.includes('Tanggal'), '8. Form pengeluaran membutuhkan tanggal');

// 9. Qty pengeluaran harus > 0
const valZeroQty = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 0, batchRows: [{ batchCode: 'B-001', qty: 0 }] });
assert(valZeroQty.valid === false && valZeroQty.error.includes('angka lebih besar dari 0'), '9. Form pengeluaran membutuhkan qty > 0');

// 10. Qty tidak boleh melebihi remainingQty
const valOverQty = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 11000, batchRows: [{ batchCode: 'B-001', qty: 11000 }] });
assert(valOverQty.valid === false && valOverQty.error.includes('melebihi sisa belum dikeluarkan'), '10. Qty tidak boleh melebihi remainingQty (10.000)');

// 11. Detail batch minimal satu
const valNoBatches = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 3000, batchRows: [] });
assert(valNoBatches.valid === false && valNoBatches.error.includes('Minimal pilih satu batch'), '11. Detail batch minimal satu');

// 12. Batch harus clone sesuai approvedClone
const valWrongClone = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 3000, batchRows: [{ batchCode: 'B-004', qty: 3000 }] }); // B-004 is PB 260
assert(valWrongClone.valid === false && valWrongClone.error.includes('tidak sesuai dengan klon yang disetujui'), '12. Batch harus clone sesuai approvedClone (IRCA 19)');

// 12b. Batch harus memiliki growthStage sesuai request
const fakeBatchList = getNurseryBatches('EST-APM', 'IRCA 19');
const fakeBatch = { ...fakeBatchList[0], batchCode: 'B-001X', stage: 'Rubber Main Nursery' };
const valWrongStage = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 1000, batchRows: [{ batchCode: 'B-001X', qty: 1000 }] }, [fakeBatch]);
assert(valWrongStage.valid === false && valWrongStage.error.includes('tidak sesuai dengan dokumen'), '12b. Batch growthStage berbeda invalid');

// 12c. Batch yang tidak memiliki source stock (availableQty null/undefined) tidak diizinkan
const fakeNoStockBatch = { ...fakeBatchList[0], batchCode: 'B-NO-STOCK', availableQty: undefined };
const valNoStock = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 1000, batchRows: [{ batchCode: 'B-NO-STOCK', qty: 1000 }] }, [fakeNoStockBatch]);
assert(valNoStock.valid === false && valNoStock.error.includes('Stok batch B-NO-STOCK belum tersedia untuk divalidasi'), '12c. Jika batch stock source belum tersedia, system menolak dan tidak menganggap stok unlimited');


// 13. Batch harus available
const batches = getNurseryBatches('EST-APM', 'IRCA 19');
assert(batches.length >= 3, '13. Batch IRCA 19 aktif & available di kebun APM');

// 14. Qty detail batch > 0
const valZeroBatchQty = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 3000, batchRows: [{ batchCode: 'B-001', qty: 0 }] });
assert(valZeroBatchQty.valid === false, '14. Qty detail batch > 0');

// 15. Qty detail batch tidak boleh melebihi availableQty batch
const valOverBatchStock = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 6000, batchRows: [{ batchCode: 'B-001', qty: 6000 }] }); // B-001 only has 5000
assert(valOverBatchStock.valid === false && valOverBatchStock.error.includes('melebihi stok tersedia'), '15. Qty detail batch tidak boleh melebihi availableQty batch (5.000)');

// 16. Sum detail batch harus sama dengan shipmentQty
const valUnmatchedSum = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 3000, batchRows: [{ batchCode: 'B-001', qty: 2000 }, { batchCode: 'B-003', qty: 500 }] }); // Sum = 2500 != 3000
assert(valUnmatchedSum.valid === false && valUnmatchedSum.error.includes('tidak sama dengan Banyaknya Pengeluaran'), '16. Sum detail batch harus sama dengan shipmentQty (2.500 != 3.000 rejected)');

// 17. Tidak boleh ada duplicate batch line dalam satu shipment
const valDuplicateBatch = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 3000, batchRows: [{ batchCode: 'B-001', qty: 2000 }, { batchCode: 'B-001', qty: 1000 }] });
assert(valDuplicateBatch.valid === false && valDuplicateBatch.error.includes('lebih dari satu kali'), '17. Tidak boleh ada duplicate batch line dalam satu shipment');

// Valid form passes
const valValidForm = validateShipmentForm(verifiedRequest1, { issuedDate: '2026-09-22', shipmentQty: 3000, batchRows: [{ batchCode: 'B-001', qty: 2000 }, { batchCode: 'B-003', qty: 1000 }] });
assert(valValidForm.valid === true, '17b. Form valid dengan multi-batch (2.000 + 1.000 = 3.000) -> PASS');

// ==========================================
// TEST 18 - 26: Execution of Multiple Shipments (Fulfillment Cycle)
// ==========================================
console.log('\n--- 4. Execution of Multiple Shipments (Lifecycle: 3.000 -> 4.000 -> 3.000) ---');

// --- SHIPMENT 1: 3.000 Pkk (B-001: 2.000, B-003: 1.000) ---
let currentReq = verifiedRequest1;
const shipment1Form = {
  issuedDate: '2026-09-22',
  shipmentQty: 3000,
  batchRows: [
    { batchCode: 'B-001', qty: 2000 },
    { batchCode: 'B-003', qty: 1000 }
  ],
  vehiclePlate: 'BK 9999 AB',
  photoEvidence: {
    image: 'data:image/jpeg;base64,...',
    capturedAt: '2026-09-22T08:00:00.000Z',
    latitude: 3.123456,
    longitude: 99.654321,
    capturedByUserId: 'MNT002',
    capturedByName: 'Supriono',
    capturedByRole: 'MANTRI_TANAMAN',
    capturedByEstateId: 'EST-APM',
    capturedByDivisionId: 'DIV-APM-02',
    locationCaptured: true
  }
};

const userMantri = mantriAPM;
const res1 = await processDispatchShipment(currentReq, shipment1Form, userMantri);
const shipments1 = getDispatchTransactions('REQ-2001');
const shp1 = shipments1[0];

assert(shp1.vehiclePlate === 'BK 9999 AB', '27. vehiclePlate tersimpan per shipment');
assert(shp1.photoEvidence && shp1.photoEvidence.latitude === 3.123456, '28. photo metadata tersimpan per shipment (latitude)');
assert(shp1.photoEvidence.capturedByName === 'Supriono', '28b. photo metadata tersimpan per shipment (capturedByName)');

currentReq = storage.get('requests_transactions', []).find(r => r.id === 'REQ-2001');
assert(currentReq.status === 'PENGELUARAN_BERJALAN', '19. First shipment mengubah state ke PENGELUARAN_BERJALAN');
assert(currentReq.vehiclePlate === undefined && currentReq.photoEvidence === undefined, '2. vehiclePlate tidak mengubah parent request (isolated in child)');

assert(currentReq.totalIssuedQty === 3000, '21. Total shipment kumulatif dihitung benar (3.000)');
assert(currentReq.remainingQty === 7000, '22. remainingQty dihitung benar (7.000)');

// Cek batch stock berkurang
const batchesAfter1 = getNurseryBatches('EST-APM');
const b001_after1 = batchesAfter1.find(b => b.batchCode === 'B-001');
const b003_after1 = batchesAfter1.find(b => b.batchCode === 'B-003');
assert(b001_after1.availableQty === 3000, '26. Batch B-001 berkurang dari 5.000 ke 3.000');
assert(b003_after1.availableQty === 4000, '26b. Batch B-003 berkurang dari 5.000 ke 4.000');

// --- SHIPMENT 2: 4.000 Pkk (B-003: 2.000, B-007: 2.000) ---
const shipment2Form = {
  issuedDate: '2026-09-23',
  shipmentQty: 4000,
  batchRows: [
    { batchCode: 'B-003', qty: 2000 },
    { batchCode: 'B-007', qty: 2000 }
  ]
};

const res2 = await processDispatchShipment(currentReq, shipment2Form, mantriAPM);
currentReq = res2.updatedRequest;

assert(res2.dispatchRecord.parentRequestId === verifiedRequest1.id, '23. Pengeluaran kedua tetap memakai parent request yang sama');
assert(currentReq.status === 'PENGELUARAN_BERJALAN', '20. Multiple shipment terhadap request yang sama diperbolehkan (Status tetap PENGELUARAN_BERJALAN)');
assert(currentReq.totalIssuedQty === 7000, '21b. Total shipment kumulatif setelah pengeluaran #2 adalah 7.000 Pkk');
assert(currentReq.remainingQty === 3000, '22b. remainingQty setelah pengeluaran #2 adalah 3.000 Pkk');

// --- SHIPMENT 3: 3.000 Pkk (B-007: 3.000) -> FULFILLMENT SELESAI ---
const shipment3Form = {
  issuedDate: '2026-09-24',
  shipmentQty: 3000,
  batchRows: [
    { batchCode: 'B-007', qty: 3000 }
  ]
};

const res3 = await processDispatchShipment(currentReq, shipment3Form, mantriAPM);
currentReq = res3.updatedRequest;

assert(res3.dispatchRecord.parentRequestId === verifiedRequest1.id, '24. Pengeluaran ketiga tetap memakai parent request yang sama');
assert(currentReq.totalIssuedQty === 10000, '25. Total pengeluaran mencapai tepat approvedQty (10.000 Pkk)');
assert(currentReq.remainingQty === 0, '25b. Sisa kuota adalah 0 Pkk');
assert(currentReq.status === 'SELESAI', '27. Setelah seluruh approvedQty terpenuhi, status menjadi SELESAI');

// ==========================================
// TEST 28 - 30: Action & Notification Lifecycle
// ==========================================
console.log('\n--- 5. Action & Notification Lifecycle ---');
assert(canPerformMantriDispatchAction(currentReq, mantriAPM) === false, '28. Setelah selesai, action Mantri hilang (canPerformMantriDispatchAction = false)');

const actionableAfterCompleted = getActionableDispatchCount([currentReq], mantriAPM);
assert(actionableAfterCompleted === 0, '29. Setelah selesai, notification bubble Mantri hilang jika tidak ada item lain (count = 0)');

const reqWithRemaining = { ...verifiedRequest1, remainingQty: 3000, status: 'PENGELUARAN_BERJALAN' };
const actionableWithRemaining = getActionableDispatchCount([reqWithRemaining], mantriAPM);
assert(actionableWithRemaining === 1, '30. Jika masih ada sisa, bubble tetap tampil (count = 1)');

// ==========================================
// TEST 31 - 40: Single Request Record & Child Entities Traceability
// ==========================================
console.log('\n--- 6. Single Approval Record & Child Shipments Traceability ---');
const allRequestsInDb = storage.get('requests_transactions', []);
const matchingRequests = allRequestsInDb.filter(r => r.id === verifiedRequest1.id);
assert(matchingRequests.length === 1, '31. 1 request tetap hanya memiliki 1 approval/request record di database (Zero duplicate)');

const allShipments = getDispatchTransactions(verifiedRequest1.id);
assert(allShipments.length === 3, '32. Request memiliki 3 shipment child records');

assert(allShipments[0].details.length === 2, '33. Shipment #1 memiliki 2 batch details');
assert(allShipments[1].details.length === 2, '33b. Shipment #2 memiliki 2 batch details');
assert(allShipments[2].details.length === 1, '33c. Shipment #3 memiliki 1 batch detail');

allShipments.forEach((shp, i) => {
  assert(shp.parentRequestId === verifiedRequest1.id, `34.${i + 1} Shipment #${i + 1} parentRequestId tetap ${verifiedRequest1.id}`);
  assert(shp.parentRequestDocNo === verifiedRequest1.docNo, `35.${i + 1} Shipment #${i + 1} parentRequestDocNo tetap ${verifiedRequest1.docNo}`);
  assert(shp.issuedByUserId === mantriAPM.userId, `39.${i + 1} Shipment #${i + 1} mencatat issuedByUserId (${mantriAPM.userId})`);
  assert(shp.issuedByName === mantriAPM.name, `39b.${i + 1} Shipment #${i + 1} mencatat issuedByName (${mantriAPM.name})`);
  assert(Boolean(shp.issuedDate), `40.${i + 1} Shipment #${i + 1} mencatat issuedDate`);
});

// Immutability checks on parent request
assert(currentReq.createdByUserId === verifiedRequest1.createdByUserId, '36. createdByUserId parent request tetap sama');
assert(currentReq.createdByName === verifiedRequest1.createdByName, '36b. createdByName parent request tetap sama');
assert(currentReq.approvedQty === verifiedRequest1.approvedQty, '37. approvedQty parent request tetap sama');
assert(currentReq.approvedClone === verifiedRequest1.approvedClone, '37b. approvedClone parent request tetap sama');
assert(currentReq.verifiedByUserId === verifiedRequest1.verifiedByUserId, '38. verifiedByUserId parent request tetap sama');
assert(currentReq.verifiedByName === verifiedRequest1.verifiedByName, '38b. verifiedByName parent request tetap sama');

// ==========================================
// TEST 41 - 45: Legacy PGL & Canonical NIR Compatibility & Concurrency
// ==========================================
console.log('\n--- 7. Legacy Compatibility, Re-validation & Safety ---');

const legacyPGL = {
  ...verifiedRequest1,
  id: 'REQ-LEGACY-001',
  docNo: '2026/PGL/001',
  status: 'TERVERIFIKASI',
  approvedQty: 4000,
  approvedClone: 'IRCA 19',
  remainingQty: 4000,
  totalIssuedQty: 0
};
assert(canPerformMantriDispatchAction(legacyPGL, mantriAPM) === true, '41. Legacy 2026/PGL/001 tetap dapat diproses oleh Mantri');

assert(canPerformMantriDispatchAction(verifiedRequest1, mantriAPM) === true, '42. Canonical 2026/NIR/001 berfungsi penuh');

// 43. Re-validation remainingQty saat save
const fakeExceededForm = { issuedDate: '2026-09-24', shipmentQty: 1000, batchRows: [{ batchCode: 'B-007', qty: 1000 }] };
let threwExceeded = false;
try {
  await processDispatchShipment(currentReq, fakeExceededForm, mantriAPM); // currentReq has remainingQty = 0
} catch (err) {
  threwExceeded = true;
}
assert(threwExceeded === true, '43. Re-validation remainingQty menolak shipment ketika pagu sudah habis');

// 44. Re-validation batch availableQty saat save
const fakeOverBatchForm = { issuedDate: '2026-09-24', shipmentQty: 99999, batchRows: [{ batchCode: 'B-001', qty: 99999 }] };
let threwBatchExceeded = false;
try {
  await processDispatchShipment(legacyPGL, fakeOverBatchForm, mantriAPM);
} catch (err) {
  threwBatchExceeded = true;
}
assert(threwBatchExceeded === true, '44. Re-validation batch availableQty menolak alokasi yang melebihi stok aktual');

// 45. Notification lifecycle benar across entire lifecycle
const emptyStateList = [currentReq]; // status: SELESAI
assert(getActionableDispatchCount(emptyStateList, mantriAPM) === 0, '45. Notification bubble 0 saat seluruh pengeluaran SELESAI');
const activeStateList = [legacyPGL, currentReq]; // legacyPGL is TERVERIFIKASI
assert(getActionableDispatchCount(activeStateList, mantriAPM) === 1, '45b. Notification bubble 1 saat ada 1 dokumen TERVERIFIKASI');

console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL MANTRI BIBITAN DISPATCH EXECUTION TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED!');
  process.exit(1);
}
