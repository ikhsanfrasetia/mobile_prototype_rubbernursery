/**
 * scripts/test-receipt-ksp-mantri-bibitan.js
 * Test Suite: TASK PENERIMAAN-07 — PENERIMAAN FISIK MANTRI BIBITAN & PEMBENTUKAN BATCH BARU
 * 
 * Pengujian Lengkap:
 * 1. Correct Role (MANTRI_TANAMAN).
 * 2. Correct Estate (Isolation Estate).
 * 3. Correct Division (Isolation Division).
 * 4. Correct Status (MENUNGGU_PENERIMAAN_MANTRI_BIBITAN).
 * 5. Correct Route (BIBITAN vs LAPANGAN).
 * 6. Kuantitas Fisik: accepted + rejected <= shipped.
 * 7. Reject Reason Mandatory jika ada reject.
 * 8. Discrepancy Reason Mandatory jika ada selisih.
 * 9. Source Batch valid terdaftar.
 * 10. New Batch Unique.
 * 11. New Batch != Source Batch (tidak menimpa source batch).
 * 12. GrowthStage Preserved (newBatch.growthStage === sourceBatch.growthStage).
 * 13. Clone Preserved (newBatch.cloneId === sourceBatch.cloneId).
 * 14. Category Preserved (newBatch.category === sourceBatch.category).
 * 15. Accepted Qty menjadi receivedQty & availableQty di nursery_batches.
 * 16. Rejected Qty tersimpan.
 * 17. Multiple Source Batches Traceability (1 source batch detail -> 1 new nursery batch).
 * 18. Photo Source is CAMERA.
 * 19. Photo Actor recorded dari active session.
 * 20. Simpan Sementara / Draft (status -> SEDANG_DIPROSES).
 * 21. Simpan & Selesaikan / Final (status -> DITERIMA / DITERIMA_DENGAN_SELISIH).
 * 22. DSP Dokumen & Kuantitas tidak termutasi (Immutability).
 * 23. Source Batch di kebun asal tidak berubah (Immutability).
 * 24. Request Lifecycle: Partial Dispatch tidak membuat parent request selesai prematur.
 * 25. Notification Lifecycle (Red Dot Mantri ON -> OFF).
 * 26. Role lain tidak dapat memproses penerimaan fisik Mantri Bibitan.
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
  global.localStorage = globalThis.localStorage;
}

import { storage } from '../js/core/storage.js';
import {
  RECEIPT_KSP_STATUS,
  PHOTO_SOURCE
} from '../js/core/receipt-ksp-constants.js';
import {
  createReceiptFromDispatch,
  getReceiptKspById,
  generateReceiptNewBatchCode
} from '../js/core/receipt-ksp-manager.js';
import {
  canPerformMantriBibitanReceiptAction,
  getActionableReceiptCount,
  filterReceiptKspRequests,
  filterReceiptKspByStatus,
  processPengurusInitialReceipt,
  processAskepVerification,
  processAsistenBibitanVerification,
  processMantriBibitanDraft,
  processMantriBibitanFinal
} from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFailed++;
  }
}

console.log('========================================================================================');
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: MANTRI BIBITAN (PENERIMAAN-07)                   ');
console.log('========================================================================================\n');

// 0. Mock Environment & Personas
if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.clear) {
  globalThis.localStorage.clear();
}

// Batches existing di Kebun Pengirim (EST-TBS) dan Penerima (EST-APM)
const initialNurseryBatches = [
  { id: 'BATCH-TBS-01', batchCode: 'B-TBS-01', clone: 'IRCA 19', category: 'Polibag Besar', stage: 'Rubber Advance Planting Material', estateId: 'EST-TBS', divisionId: 'DIV-01', availableQty: 10000, initialQty: 10000, status: 'AVAILABLE' },
  { id: 'BATCH-TBS-02', batchCode: 'B-TBS-02', clone: 'IRCA 19', category: 'Polibag Besar', stage: 'Rubber Advance Planting Material', estateId: 'EST-TBS', divisionId: 'DIV-01', availableQty: 8000, initialQty: 8000, status: 'AVAILABLE' },
  { id: 'BATCH-APM-01', batchCode: 'B-APM-01', clone: 'IRCA 19', category: 'Polibag Besar', stage: 'Rubber Advance Planting Material', estateId: 'EST-APM', divisionId: 'DIV-APM-02', availableQty: 5000, initialQty: 5000, status: 'AVAILABLE' }
];
storage.set('nursery_batches', JSON.parse(JSON.stringify(initialNurseryBatches)));

const userPengirim = { userId: 'USR-MTR-TBS', name: 'Budi (Mantri TBS)', role: 'MANTRI_TANAMAN', estateId: 'EST-TBS', divisionId: 'DIV-01' };
const userPengurusAPM = { userId: 'USR-MGR-APM', name: 'Pak Hartono', role: 'PENGURUS', estateId: 'EST-APM' };
const userAskepAPM = { userId: 'USR-ASK-APM', name: 'Askep Bambang', role: 'ASKEP', estateId: 'EST-APM' };
const userAsistenBibitanAPM = { userId: 'USR-ASB-APM', name: 'Asisten Hendra', role: 'ASISTEN_BIBITAN', estateId: 'EST-APM', divisionId: 'DIV-APM-02' };

// Persona Mantri Bibitan APM Divisi DIV-APM-02
const userMantriBibitanAPM = { userId: 'USR-MB-APM', name: 'Mantri Joko', role: 'MANTRI_TANAMAN', estateId: 'EST-APM', divisionId: 'DIV-APM-02' };
// Persona Mantri Bibitan Divisi Lain (DIV-APM-01)
const userMantriDivLain = { userId: 'USR-MB-APM-DIV1', name: 'Mantri Agus', role: 'MANTRI_TANAMAN', estateId: 'EST-APM', divisionId: 'DIV-APM-01' };
// Persona Mantri Kebun Lain (EST-TBS)
const userMantriKebunLain = { userId: 'USR-MB-TBS', name: 'Mantri Budi TBS', role: 'MANTRI_TANAMAN', estateId: 'EST-TBS', divisionId: 'DIV-01' };
// Persona Asisten Lapangan
const userAsistenLapAPM = { userId: 'USR-AST-APM', name: 'Asisten Lapangan', role: 'ASISTEN', estateId: 'EST-APM', divisionId: 'DIV-APM-01' };

console.log('--- 1. Inisialisasi Data & Workflow Permintaan Induk (Partial Dispatch) ---');

const parentRequest1 = {
  id: 'REQ-KSP-2026-001',
  docNo: 'NIR-2026-001',
  requestedClone: 'IRCA 19',
  approvedClone: 'IRCA 19',
  requestedQty: 5000,
  approvedQty: 5000,
  category: 'Polibag Besar',
  growthStage: 'Rubber Advance Planting Material',
  estateId: 'EST-APM',
  estateName: 'Kebun Aek Pamingke',
  divisionId: 'DIV-APM-02',
  targetEstateId: 'EST-APM',
  sourceEstateId: 'EST-TBS',
  status: 'PENGELUARAN_BERJALAN'
};

// Dispatch 1: 3.000 Pkk (Multiple Source Batches: B-TBS-01 = 2.000 Pkk, B-TBS-02 = 1.000 Pkk)
const dispatch1 = {
  id: 'DSP-2026-001',
  docNo: 'DSP-2026-001',
  estateId: 'EST-TBS',
  estateName: 'Kebun Tanah Besih',
  issuedQty: 3000,
  vehiclePlate: 'BK 8821 TP',
  issuedDate: '2026-09-20',
  details: [
    { id: 'DTL-01', batchId: 'BATCH-TBS-01', batchCode: 'B-TBS-01', clone: 'IRCA 19', qty: 2000 },
    { id: 'DTL-02', batchId: 'BATCH-TBS-02', batchCode: 'B-TBS-02', clone: 'IRCA 19', qty: 1000 }
  ]
};

// Dispatch 2: 2.000 Pkk (Partial Dispatch kedua)
const dispatch2 = {
  id: 'DSP-2026-002',
  docNo: 'DSP-2026-002',
  estateId: 'EST-TBS',
  estateName: 'Kebun Tanah Besih',
  issuedQty: 2000,
  vehiclePlate: 'BK 9933 KL',
  issuedDate: '2026-09-22',
  details: [
    { id: 'DTL-03', batchId: 'BATCH-TBS-01', batchCode: 'B-TBS-01', clone: 'IRCA 19', qty: 2000 }
  ]
};

// Buat Receipt R1 dan R2
const receipt1 = createReceiptFromDispatch(dispatch1, parentRequest1, userPengirim);
const receipt2 = createReceiptFromDispatch(dispatch2, parentRequest1, userPengirim);

assert(receipt1 && receipt1.totalShippedQty === 3000, '1a. Receipt R1 (3.000 Pkk) dibuat');
assert(receipt1.details.length === 2, '1b. R1 memiliki 2 source batch details');
assert(receipt2 && receipt2.totalShippedQty === 2000, '1c. Receipt R2 (2.000 Pkk) dibuat');

// Majukan R1 ke tahap Mantri Bibitan:
// 1. Pengurus catat tiba
processPengurusInitialReceipt(receipt1.id, { receivedDate: '2026-09-21', notes: 'Tiba lengkap di pos' }, userPengurusAPM);
// 2. Askep tentukan jalur BIBITAN ke DIV-APM-02
processAskepVerification(receipt1.id, { jalurPenerimaan: 'BIBITAN', targetDivisionId: 'DIV-APM-02', notes: 'Bibitan baru APM' }, userAskepAPM);
// 3. Asisten Bibitan verifikasi & teruskan
const r1ForMantri = processAsistenBibitanVerification(receipt1.id, { notes: 'Siap diterima fisik oleh Mantri' }, userAsistenBibitanAPM);

assert(r1ForMantri.status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN, '1d. Status R1 = MENUNGGU_PENERIMAAN_MANTRI_BIBITAN');
assert(r1ForMantri.targetNextRole === 'MANTRI_TANAMAN', '1e. targetNextRole = MANTRI_TANAMAN');
assert(r1ForMantri.jalurPenerimaan === 'BIBITAN', '1f. jalurPenerimaan = BIBITAN');

console.log('\n--- 2. Scope & Isolation Tests (Estate, Division & Role) ---');

// Test 1: Correct Role (MANTRI_TANAMAN)
assert(canPerformMantriBibitanReceiptAction(r1ForMantri, userMantriBibitanAPM) === true, '1. Mantri Bibitan APM berhak memproses receipt R1');

// Test 2: Correct Estate (Estate Isolation)
assert(canPerformMantriBibitanReceiptAction(r1ForMantri, userMantriKebunLain) === false, '2. Mantri Kebun Lain (EST-TBS) TIDAK DAPAT memproses receipt R1');
const scopedListTBS = filterReceiptKspRequests([r1ForMantri], userMantriKebunLain);
assert(scopedListTBS.length === 0, '2b. Mantri TBS tidak melihat receipt R1 di inboxnya');

// Test 3: Correct Division (Division Isolation)
assert(canPerformMantriBibitanReceiptAction(r1ForMantri, userMantriDivLain) === false, '3. Mantri Divisi Lain (DIV-APM-01) TIDAK DAPAT memproses receipt R1');

// Test 4: Jalur LAPANGAN Rejection
const rLap = { ...r1ForMantri, id: 'RCP-LAP-TEST', jalurPenerimaan: 'LAPANGAN', targetNextRole: 'ASISTEN' };
assert(canPerformMantriBibitanReceiptAction(rLap, userMantriBibitanAPM) === false, '4. Mantri Bibitan TIDAK DAPAT memproses jalur LAPANGAN');

// Test 5: Role Lain Rejection
assert(canPerformMantriBibitanReceiptAction(r1ForMantri, userPengurusAPM) === false, '5a. Pengurus tidak dapat melakukan aksi Mantri Bibitan');
assert(canPerformMantriBibitanReceiptAction(r1ForMantri, userAskepAPM) === false, '5b. Askep tidak dapat melakukan aksi Mantri Bibitan');
assert(canPerformMantriBibitanReceiptAction(r1ForMantri, userAsistenLapAPM) === false, '5c. Asisten Lapangan tidak dapat melakukan aksi Mantri Bibitan');

// Test 25: Notification Lifecycle (Red Dot ON)
const scopedListAPM = filterReceiptKspRequests(storage.get('receipt_ksp_transactions', []), userMantriBibitanAPM);
const actionableCount = getActionableReceiptCount(scopedListAPM, userMantriBibitanAPM);
assert(actionableCount === 1, '25a. Red Dot Mantri Bibitan ON (1 actionable receipt)');

console.log('\n--- 3. Validation Rules Tests (Kuantitas, Reject, Discrepancy & Photo) ---');

// Test 6: Over Quantity Rejected
let overQtyError = null;
try {
  processMantriBibitanFinal(r1ForMantri.id, {
    examinationDate: '2026-09-22',
    details: [
      { qtyAccepted: 2500, qtyRejected: 0 }, // shipped is 2000!
      { qtyAccepted: 1000, qtyRejected: 0 }
    ],
    photoEvidence: { source: PHOTO_SOURCE.CAMERA, dataUrl: 'data:image/jpeg;base64,mock', capturedAt: new Date().toISOString(), capturedByUserId: userMantriBibitanAPM.userId, capturedByName: userMantriBibitanAPM.name }
  }, userMantriBibitanAPM);
} catch (e) {
  overQtyError = e.message;
}
assert(overQtyError !== null, '6. Over quantity per batch berhasil ditolak');

// Test 7: Reject Reason Mandatory if Rejected > 0
let noRejectReasonError = null;
try {
  processMantriBibitanFinal(r1ForMantri.id, {
    examinationDate: '2026-09-22',
    details: [
      { qtyAccepted: 1900, qtyRejected: 100, rejectReason: '' }, // No reject reason!
      { qtyAccepted: 1000, qtyRejected: 0 }
    ],
    photoEvidence: { source: PHOTO_SOURCE.CAMERA, dataUrl: 'data:image/jpeg;base64,mock', capturedAt: new Date().toISOString(), capturedByUserId: userMantriBibitanAPM.userId, capturedByName: userMantriBibitanAPM.name }
  }, userMantriBibitanAPM);
} catch (e) {
  noRejectReasonError = e.message;
}
assert(noRejectReasonError !== null, '7. Ketiadaan reject reason saat ada reject berhasil ditolak');

// Test 8: Discrepancy Reason Mandatory if Discrepancy > 0
let noDiscrepancyReasonError = null;
try {
  processMantriBibitanFinal(r1ForMantri.id, {
    examinationDate: '2026-09-22',
    details: [
      { qtyAccepted: 1800, qtyRejected: 0 }, // 200 Pkk discrepancy!
      { qtyAccepted: 1000, qtyRejected: 0 }
    ],
    discrepancyReason: '', // Empty discrepancy reason!
    photoEvidence: { source: PHOTO_SOURCE.CAMERA, dataUrl: 'data:image/jpeg;base64,mock', capturedAt: new Date().toISOString(), capturedByUserId: userMantriBibitanAPM.userId, capturedByName: userMantriBibitanAPM.name }
  }, userMantriBibitanAPM);
} catch (e) {
  noDiscrepancyReasonError = e.message;
}
assert(noDiscrepancyReasonError !== null, '8. Ketiadaan discrepancy reason saat ada selisih fisik berhasil ditolak');

// Test 18 & 19: Photo Source CAMERA & Actor
let noPhotoError = null;
try {
  processMantriBibitanFinal(r1ForMantri.id, {
    examinationDate: '2026-09-22',
    details: [{ qtyAccepted: 2000, qtyRejected: 0 }, { qtyAccepted: 1000, qtyRejected: 0 }],
    photoEvidence: null
  }, userMantriBibitanAPM);
} catch (e) {
  noPhotoError = e.message;
}
assert(noPhotoError !== null, '18a. Ketiadaan foto fisik ditolak');

let nonCameraError = null;
try {
  processMantriBibitanFinal(r1ForMantri.id, {
    examinationDate: '2026-09-22',
    details: [{ qtyAccepted: 2000, qtyRejected: 0 }, { qtyAccepted: 1000, qtyRejected: 0 }],
    photoEvidence: { source: 'GALLERY', dataUrl: 'data:image/jpeg;base64,mock', capturedAt: new Date().toISOString(), capturedByUserId: userMantriBibitanAPM.userId, capturedByName: userMantriBibitanAPM.name }
  }, userMantriBibitanAPM);
} catch (e) {
  nonCameraError = e.message;
}
assert(nonCameraError !== null, '18b. Foto selain CAMERA (GALLERY) ditolak');

console.log('\n--- 4. Draft Workflow Test (SEDANG_DIPROSES) ---');

// Test 20: Draft works
const draftResult = processMantriBibitanDraft(r1ForMantri.id, {
  examinationDate: '2026-09-22',
  details: [
    { qtyAccepted: 1950, qtyRejected: 50, rejectReason: 'Polibag pecah' },
    { qtyAccepted: 980, qtyRejected: 20, rejectReason: 'Batang patah' }
  ],
  discrepancyReason: null,
  notes: 'Pemeriksaan fisik sedang berlangsung di bedengan 1'
}, userMantriBibitanAPM);

assert(draftResult.status === RECEIPT_KSP_STATUS.SEDANG_DIPROSES, '20a. Status draft menjadi SEDANG_DIPROSES');
assert(draftResult.totalAcceptedQty === 2930, '20b. Total Layak draft tercatat 2.930 Pkk');
assert(draftResult.totalRejectedQty === 70, '20c. Total Reject draft tercatat 70 Pkk');
assert(draftResult.targetNextRole === 'MANTRI_TANAMAN', '20d. targetNextRole tetap MANTRI_TANAMAN');

console.log('\n--- 5. Batch Generation & Final Completion Tests ---');

// Batch Generation Helper Test
const genCode1 = generateReceiptNewBatchCode('EST-APM', 'IRCA 19', 'B-TBS-01');
assert(genCode1.startsWith('B-IRCA19-APM-'), '10a. Format batch code baru sesuai spesifikasi');
assert(genCode1 !== 'B-TBS-01', '11a. Batch baru tidak sama dengan source batch B-TBS-01');

// Eksekusi Final Reception:
// Detail 1: Shipped 2.000 -> Accepted: 1.950, Rejected: 50 (Reason: Polibag pecah)
// Detail 2: Shipped 1.000 -> Accepted: 980, Rejected: 20 (Reason: Batang patah)
// Total Shipped: 3.000 -> Accepted: 2.930, Rejected: 70, Discrepancy: 0
const photoPayload = {
  id: 'PHOTO-001',
  source: PHOTO_SOURCE.CAMERA,
  dataUrl: 'data:image/jpeg;base64,mockValidPhotoDataUrl',
  capturedAt: '2026-09-22T10:30:00.000Z',
  capturedByUserId: userMantriBibitanAPM.userId,
  capturedByName: userMantriBibitanAPM.name,
  capturedByRole: userMantriBibitanAPM.role
};

const finalResult = processMantriBibitanFinal(r1ForMantri.id, {
  examinationDate: '2026-09-22',
  details: [
    { qtyAccepted: 1950, qtyRejected: 50, rejectReason: 'Polibag pecah saat bongkar' },
    { qtyAccepted: 980, qtyRejected: 20, rejectReason: 'Batang patah saat perjalanan' }
  ],
  photoEvidence: photoPayload,
  notes: 'Bibit telah ditata rapi di Bedengan A1 dan A2 Nursery APM'
}, userMantriBibitanAPM);

// Test 21: Status Final DITERIMA
assert(finalResult.status === RECEIPT_KSP_STATUS.DITERIMA, '21a. Status receipt final adalah DITERIMA');
assert(finalResult.targetNextRole === null, '21b. targetNextRole direset menjadi null setelah selesai');
assert(finalResult.finalizedByUserId === userMantriBibitanAPM.userId, '19. finalizedByUserId mencatat actor Mantri');
assert(finalResult.finalizedByRole === 'MANTRI_TANAMAN', '19b. finalizedByRole mencatat MANTRI_TANAMAN');

// Test 10 & 17: Multiple Batches Generation & Traceability
const allNurseryBatchesAfter = storage.get('nursery_batches', []);
const createdBatches = allNurseryBatchesAfter.filter(b => b.sourceReceiptId === r1ForMantri.id);

assert(createdBatches.length === 2, '17a. Terbentuk tepat 2 batch pembibitan baru (1 source batch detail -> 1 new nursery batch)');

const newBatch1 = createdBatches.find(b => b.sourceBatchCode === 'B-TBS-01');
const newBatch2 = createdBatches.find(b => b.sourceBatchCode === 'B-TBS-02');

assert(newBatch1 !== undefined, '17b. New Batch 1 terhubung ke source Batch B-TBS-01');
assert(newBatch2 !== undefined, '17c. New Batch 2 terhubung ke source Batch B-TBS-02');

// Test 10, 11: Batch uniqueness and non-overwriting
assert(newBatch1.batchCode !== newBatch2.batchCode, '10b. Kode batch baru 1 dan batch 2 unik dan tidak sama');
assert(newBatch1.batchCode !== 'B-TBS-01', '11b. New Batch 1 tidak menimpa kode source batch B-TBS-01');
assert(newBatch2.batchCode !== 'B-TBS-02', '11c. New Batch 2 tidak menimpa kode source batch B-TBS-02');

// Test 12, 13, 14: Preserved attributes
assert(newBatch1.growthStage === 'Rubber Advance Planting Material', '12. growthStage dipertahankan dari sumber');
assert(newBatch1.cloneId === 'IRCA 19', '13. cloneId dipertahankan dari sumber');
assert(newBatch1.category === 'Polibag Besar', '14. category dipertahankan dari sumber');

// Test 15, 16: Quantities and Stock
assert(newBatch1.receivedQty === 1950 && newBatch1.availableQty === 1950, '15a. Accepted Qty 1.950 menjadi receivedQty & availableQty New Batch 1');
assert(newBatch1.rejectedQty === 50, '16a. Rejected Qty 50 tersimpan pada New Batch 1');
assert(newBatch2.receivedQty === 980 && newBatch2.availableQty === 980, '15b. Accepted Qty 980 menjadi receivedQty & availableQty New Batch 2');
assert(newBatch2.rejectedQty === 20, '16b. Rejected Qty 20 tersimpan pada New Batch 2');

// Test 22, 23: Immutability DSP & Source Batches
const sourceBatchesTBS = allNurseryBatchesAfter.filter(b => b.estateId === 'EST-TBS');
const originalTBS01 = sourceBatchesTBS.find(b => b.batchCode === 'B-TBS-01');
assert(originalTBS01.availableQty === 10000, '23. Stok batch sumber di kebun asal TBS tetap utuh (tidak termutasi oleh penerimaan APM)');
assert(finalResult.dispatchDocNo === 'DSP-2026-001' && finalResult.totalShippedQty === 3000, '22. Nomor dokumen DSP dan total shipped qty tetap utuh');

// Test 24: Partial Dispatch Lifecycle
// Receipt R1 selesai, namun Receipt R2 (dari DSP-002) masih dalam antrean (belum selesai)
const r2Check = getReceiptKspById(receipt2.id);
assert(r2Check.status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS, '24a. Receipt R2 masih aktif/belum selesai');
assert(parentRequest1.status === 'PENGELUARAN_BERJALAN', '24b. Parent Request tidak prematur menjadi SELESAI saat partial dispatch');

// Test 25: Notification Lifecycle (Red Dot OFF after process)
const scopedListAfter = filterReceiptKspRequests(storage.get('receipt_ksp_transactions', []), userMantriBibitanAPM);
const actionableCountAfter = getActionableReceiptCount(scopedListAfter, userMantriBibitanAPM);
assert(actionableCountAfter === 0, '25b. Red Dot Mantri Bibitan OFF setelah R1 diselesaikan');

console.log('\n========================================================================================');
console.log(`   HASIL TEST SUITE MANTRI BIBITAN: ${totalPassed} PASSED, ${totalFailed} FAILED                 `);
console.log('========================================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
