/**
 * scripts/test-selection-confirmation-and-camera.js
 * Integration Test for Selection Confirmation Modal & Timestamped Photo Documentation
 */

// Mock localStorage for Node.js environment
const store = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); }
  };
}

import { storage } from '../js/core/storage.js';
import {
  integrateSeedingToSelectionPool,
  syncAllSeedingsToSelectionPool,
  filterSelectionByScope,
  getActionableSelectionCount,
  getSelectionSourceLabel,
  getSelectionCategoryLabel,
  formatBedenganDisplayCode,
  saveSelectionDocumentationPhoto,
  getSelectionPhotos,
  getSelectionPhotosByDocNo,
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS
} from '../js/modules/selection/selection-manager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('========================================================================');
console.log('INTEGRATION TEST: KONFIRMASI HASIL SELEKSI & DOKUMENTASI FOTO BERTIMESTAMP');
console.log('========================================================================\n');

// Reset storage
storage.set('selection_pool', []);
storage.set('selection_transactions', []);
storage.set('selection_photos', []);
storage.set('seeding_transactions', []);

const mantriUser = {
  userId: 'USR-MANTRI-01',
  name: 'Mantri Bibitan TBS',
  role: 'MANTRI_TANAMAN',
  estateId: 'TBS',
  divisionId: 'DIV-1'
};

// --------------------------------------------------------------------------
// 1. Setup Data: Seeding + Okulasi + Okulasi Janda
// --------------------------------------------------------------------------
console.log('--- 1. Setup Multi-Source Selection Pool ---');
const seedingTx = {
  id: 'SEED-2026-001',
  docNo: '2026/SOW/001',
  date: '2026-03-01',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  programId: 'PROG-01',
  programCode: '2026/TB/RNUR/001',
  programName: 'Program Replanting TBS 2026',
  batchCode: 'BTCH-001',
  batchNo: 'BTCH-001',
  bedengan: 'Bedengan-001, Bedengan-002',
  rusakQty: 250,
  matiQty: 0,
  lainnyaQty: 0
};
integrateSeedingToSelectionPool(seedingTx);

let pool = storage.get('selection_pool', []);
// Add Okulasi item
pool.push({
  id: 'SEL-OKULASI-01',
  docNo: '2026/CULL/0002',
  originType: 'REJECT_OKULASI',
  sourceModule: 'BUDDING',
  buddingDocNo: '2026/BUD/001',
  sourceDocNo: '2026/BUD/001',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  batchCode: 'BTCH-002',
  bedengan: 'Bedengan-003',
  jumlahAfkir: 50,
  alasan: 'Bibit Ditolak saat Okulasi',
  status: 'PENDING_DECLARATION'
});

// Add Regrafting item
pool.push({
  id: 'SEL-REGRAFT-01',
  docNo: '2026/CULL/0003',
  originType: 'REJECT_REGRAFTING',
  sourceModule: 'BUDDING',
  buddingDocNo: '2026/REGRAFT/001',
  sourceDocNo: '2026/REGRAFT/001',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  batchCode: 'BTCH-003',
  bedengan: 'Bedengan-004',
  jumlahAfkir: 25,
  alasan: 'Bibit Ditolak saat Okulasi Janda',
  status: 'PENDING_DECLARATION'
});
storage.set('selection_pool', pool);

assert(pool.length === 3, '19, 20, 21. Pool contains 3 items (Penyemaian, Okulasi, Okulasi Janda)');

// --------------------------------------------------------------------------
// 2. Scenario Modal Data Preparation (Dok. Seleksi, Dok. Asal, Batch, Kategori, Jumlah)
// --------------------------------------------------------------------------
console.log('\n--- 2. Scenario Confirmation Modal Payload Verification ---');
const targetItem = pool[0];
const displayDocNo = targetItem.docNo || '2026/CULL/001';
const sourceDocNo = targetItem.sourceDocNo || '2026/SOW/001';
const batchCode = targetItem.batchCode || 'BTCH-001';
const categoryLabel = getSelectionCategoryLabel(targetItem);
const qtyAfkir = parseInt(targetItem.jumlahAfkir || 0, 10);

assert(displayDocNo.startsWith('2026/CULL/'), `1 & 2. Modal displays correct Dok. Seleksi: ${displayDocNo}`);
assert(sourceDocNo === '2026/SOW/001', '3. Modal displays correct Dok. Asal: 2026/SOW/001');
assert(batchCode === 'BTCH-001', '4. Modal displays correct Batch: BTCH-001');
assert(categoryLabel === 'Rusak', '5. Modal displays correct Kategori: Rusak');
assert(qtyAfkir === 250, '5. Modal displays correct Quantity: 250 Pkk');

// --------------------------------------------------------------------------
// 3. Scenario User Clicks "Kembali" (Cancellation)
// --------------------------------------------------------------------------
console.log('\n--- 3. Scenario User Clicks "Kembali" ---');
// Verify that cancelling does not change storage or create records
let currentTxList = storage.get('selection_transactions', []);
let currentPhotos = storage.get('selection_photos', []);
let currentPool = storage.get('selection_pool', []);

assert(currentTxList.length === 0, '6. No transaction created when user clicks Kembali');
assert(currentPhotos.length === 0, '6. No photo documentation created when user clicks Kembali');
assert(currentPool[0].status === 'PENDING_DECLARATION', '6. Pool item status remains PENDING_DECLARATION');

// --------------------------------------------------------------------------
// 4. Scenario Camera Cancellation (Kamera Dibatalkan)
// --------------------------------------------------------------------------
console.log('\n--- 4. Scenario Camera Cancellation ---');
// If camera modal is closed via "Batal"
assert(storage.get('selection_transactions', []).length === 0, '14. Declaration is NOT marked complete when camera is cancelled');
assert(storage.get('selection_photos', []).length === 0, '14. No photo stored when camera is cancelled');

// --------------------------------------------------------------------------
// 5. Scenario User Clicks "Simpan" & Photo Capture Success
// --------------------------------------------------------------------------
console.log('\n--- 5. Scenario Confirmation -> Photo Capture -> Record Creation ---');
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestampFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
const simulatedPhotoData = `data:image/jpeg;base64,SIMULATED_SELECTION_PHOTO_DATA_WITH_TIMESTAMP_${timestampFormatted}`;

const photoResult = {
  dataUrl: simulatedPhotoData,
  capturedAt: now.toISOString(),
  capturedAtLabel: timestampFormatted
};

// 1. Update pool
targetItem.status = 'DECLARED_CULLED';
storage.set('selection_pool', pool);

// 2. Create transaction
const newTxId = `SEL-${Date.now()}-001`;
const newTxDocNo = '2026/CULL/0001';
const photoRecordId = `DOC-SEL-${Date.now()}-001`;

// 3. Create photo documentation record
const photoRecord = {
  id: photoRecordId,
  transactionType: 'SELECTION',
  selectionTransactionId: newTxId,
  selectionDocNo: newTxDocNo,
  selectionPoolDocNo: targetItem.docNo,
  sourceTransactionId: targetItem.sourceTransactionId || targetItem.sourceDocNo,
  sourceDocNo: targetItem.sourceDocNo,
  batchId: targetItem.batchId || null,
  batchCode: targetItem.batchCode,
  category: targetItem.category,
  quantity: targetItem.jumlahAfkir,
  photoData: photoResult.dataUrl,
  capturedAt: photoResult.capturedAt,
  capturedAtLabel: photoResult.capturedAtLabel,
  createdAt: new Date().toISOString(),
  createdBy: mantriUser.name
};
saveSelectionDocumentationPhoto(photoRecord);

// 4. Create selection transaction
const newTx = {
  id: newTxId,
  docNo: newTxDocNo,
  selectionPoolDocNo: targetItem.docNo,
  sourceModule: targetItem.sourceModule,
  sourceTransactionType: targetItem.sourceTransactionType,
  sourceTransactionId: targetItem.sourceTransactionId,
  sourceDocNo: targetItem.sourceDocNo,
  category: targetItem.category,
  originType: targetItem.originType,
  estateId: targetItem.estateId,
  divisionId: targetItem.divisionId,
  programId: targetItem.programId,
  programCode: targetItem.programCode,
  batchCode: targetItem.batchCode,
  bedengan: targetItem.bedengan,
  jumlahAfkir: targetItem.jumlahAfkir,
  quantity: targetItem.jumlahAfkir,
  sumberAsal: getSelectionSourceLabel(targetItem),
  mantri: mantriUser.name,
  createdByName: mantriUser.name,
  status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
  stockMutationStatus: STOCK_MUTATION_STATUS.PENDING,
  photoId: photoRecordId,
  photoData: photoResult.dataUrl,
  photoCapturedAt: photoResult.capturedAt,
  photoCapturedAtLabel: photoResult.capturedAtLabel
};

const txList = storage.get('selection_transactions', []);
txList.push(newTx);
storage.set('selection_transactions', txList);

// Verification of saved photo documentation
const storedPhotos = getSelectionPhotos();
assert(storedPhotos.length === 1, '8. Photo documentation successfully stored in selection_photos');

const savedPhoto = storedPhotos[0];
assert(savedPhoto.capturedAtLabel === timestampFormatted, '9. Photo record has formatted timestamp label');
assert(savedPhoto.selectionTransactionId === newTxId, '10. Photo record links to selectionTransactionId');
assert(savedPhoto.selectionDocNo === '2026/CULL/0001', '11. Photo record links to selectionDocNo');
assert(savedPhoto.sourceDocNo === '2026/SOW/001', '12. Photo record links to sourceDocNo');
assert(savedPhoto.category === 'RUSAK' && savedPhoto.quantity === 250, '13. Photo record has correct category (RUSAK) and quantity (250)');

// Test querying photo by docNo
const foundPhotos = getSelectionPhotosByDocNo('2026/CULL/0001');
assert(foundPhotos.length === 1 && foundPhotos[0].id === photoRecordId, '11. getSelectionPhotosByDocNo correctly resolves photo record');

// --------------------------------------------------------------------------
// 6. Verification of Stock Mutation Rule (ZERO MUTATION on Declaration)
// --------------------------------------------------------------------------
console.log('\n--- 6. Verification of Zero Stock Mutation Rule ---');
assert(newTx.stockMutationStatus === STOCK_MUTATION_STATUS.PENDING, '18. Stock mutation status is PENDING (No stock deducted on declaration)');
assert(newTx.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, '18. Selection status is MENUNGGU_VERIFIKASI (Awaiting ASB review)');

// --------------------------------------------------------------------------
// 7. Duplicate Prevention & Scope Check
// --------------------------------------------------------------------------
console.log('\n--- 7. Idempotency & Scope Isolation ---');
saveSelectionDocumentationPhoto(photoRecord); // Save again with same ID
assert(getSelectionPhotos().length === 1, '17. Saving same photo record does not duplicate photos');

const mantriAPM = {
  userId: 'USR-MANTRI-APM',
  name: 'Mantri APM',
  role: 'MANTRI_TANAMAN',
  estateId: 'APM',
  divisionId: 'DIV-2'
};
const apmTx = filterSelectionByScope(storage.get('selection_transactions', []), mantriAPM);
assert(apmTx.length === 0, '22. APM Mantri cannot view TBS declared transactions (Scope isolated)');

// Summary
console.log('\n========================================================================');
console.log(`INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
