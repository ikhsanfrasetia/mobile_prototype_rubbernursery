/**
 * scripts/test-selection-uniqueness-and-deduplication.js
 * Integration Test for Selection Document & Transaction Uniqueness / Idempotency
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
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS,
  declareSelectionItem,
  findExistingSelectionTransaction,
  integrateSeedingToSelectionPool,
  saveSelectionDocumentationPhoto,
  getSelectionPhotos,
  getSelectionPhotosByDocNo
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
console.log('INTEGRATION TEST: DOKUMEN SELEKSI & TRANSAKSI UNIQUENESS / IDEMPOTENCY');
console.log('========================================================================\n');

// Reset test environment storage
storage.set('seeding_transactions', []);
storage.set('selection_pool', []);
storage.set(SELECTION_STORAGE_KEY, []);
storage.set('selection_photos', []);

const mockUser = {
  name: 'Wagiman (Mantri Bibitan)',
  code: 'MAN-001',
  role: 'MANTRI_TANAMAN',
  estateId: 'TBS',
  divisionId: 'DIV-1'
};

// --------------------------------------------------------------------------
// SKENARIO 1: Satu source -> deklarasi satu kali
// --------------------------------------------------------------------------
console.log('--- SKENARIO 1: Satu Source -> Deklarasi Satu Kali ---');
const seedingTx1 = {
  id: 'SEED-TX-001',
  docNo: '2026/SOW/001',
  date: '2026-03-01',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  programId: 'PROG-01',
  programCode: '2026/TB/RNUR/001',
  programName: 'Program Replanting TBS 2026',
  batchCode: 'BTCH-001',
  batchNo: 'BTCH-001',
  bedengan: 'Bedengan-001',
  rusakQty: 250,
  matiQty: 0,
  lainnyaQty: 0
};
integrateSeedingToSelectionPool(seedingTx1);

let pool = storage.get('selection_pool', []);
assert(pool.length === 1, '1. Pool contains exactly 1 entry for 2026/SOW/001 RUSAK');
const poolItem1 = pool[0];
const initialDocNo = poolItem1.docNo;
assert(initialDocNo.startsWith('2026/CULL/'), `1. Initial Dok. Seleksi in pool is assigned: ${initialDocNo}`);

const photoPayload1 = {
  dataUrl: 'data:image/jpeg;base64,samplephoto1',
  capturedAt: '2026-09-15T00:30:00.000Z',
  capturedAtLabel: '15/09/2026 00:30:00'
};

const declResult1 = declareSelectionItem(poolItem1, photoPayload1, mockUser);
assert(declResult1.success === true, '1. Declaration executed successfully');
assert(declResult1.isNew === true, '1. First declaration marked as isNew: true');
assert(declResult1.transaction.docNo === initialDocNo, `1. Transaction docNo matches pool docNo: ${initialDocNo}`);

let txs = storage.get(SELECTION_STORAGE_KEY, []);
let photos = getSelectionPhotos();
assert(txs.length === 1, '1. Exactly 1 selection transaction created');
assert(photos.length === 1, '1. Exactly 1 photo documentation created');
assert(txs[0].stockMutationStatus === 'PENDING', '1. Stock mutation is PENDING (Zero mutation before ASB review)');

// --------------------------------------------------------------------------
// SKENARIO 2: Satu source -> Double Click
// --------------------------------------------------------------------------
console.log('\n--- SKENARIO 2: Satu Source -> Double Click ---');
// Simulate immediate double click on the same pool item
const declResult2 = declareSelectionItem(poolItem1, photoPayload1, mockUser);
assert(declResult2.success === true, '2. Second call on same source succeeded');
assert(declResult2.isNew === false, '2. Second call recognized as existing (isNew: false)');
assert(declResult2.transaction.docNo === initialDocNo, `2. Second call retained same Dok. Seleksi: ${initialDocNo}`);

txs = storage.get(SELECTION_STORAGE_KEY, []);
photos = getSelectionPhotos();
assert(txs.length === 1, '2. Still exactly 1 selection transaction (no duplicates from double click)');
assert(photos.length === 1, '2. Still exactly 1 photo documentation (no duplicates from double click)');

// --------------------------------------------------------------------------
// SKENARIO 3: Satu source -> Callback dokumentasi dipanggil dua kali
// --------------------------------------------------------------------------
console.log('\n--- SKENARIO 3: Satu Source -> Callback Dokumentasi Dipanggil Dua Kali ---');
const updatedPhotoPayload = {
  dataUrl: 'data:image/jpeg;base64,samplephoto_updated',
  capturedAt: '2026-09-15T00:31:00.000Z',
  capturedAtLabel: '15/09/2026 00:31:00'
};

const declResult3 = declareSelectionItem(poolItem1, updatedPhotoPayload, mockUser);
assert(declResult3.success === true, '3. Re-running declaration with updated photo callback succeeded');
assert(declResult3.isNew === false, '3. Re-run marked isNew: false');
assert(declResult3.transaction.docNo === initialDocNo, `3. Re-run retained identical Dok. Seleksi: ${initialDocNo}`);

txs = storage.get(SELECTION_STORAGE_KEY, []);
photos = getSelectionPhotos();
assert(txs.length === 1, '3. Total selection transactions remains 1');
assert(photos.length === 1, '3. Total selection photos remains 1 (updated in-place)');
assert(photos[0].photoData === 'data:image/jpeg;base64,samplephoto_updated', '3. Photo payload updated cleanly in-place');

// --------------------------------------------------------------------------
// SKENARIO 4: Satu source -> Refresh halaman -> Proses kembali
// --------------------------------------------------------------------------
console.log('\n--- SKENARIO 4: Satu Source -> Refresh Halaman -> Proses Kembali ---');
// Simulate refresh by reloading pool and finding existing item
const refreshedPool = storage.get('selection_pool', []);
const refreshedItem = refreshedPool.find(p => p.sourceDocNo === '2026/SOW/001' && p.category === 'RUSAK');
assert(refreshedItem !== undefined, '4. Item found in refreshed selection_pool');

const existingTx = findExistingSelectionTransaction(refreshedItem);
assert(existingTx !== null, '4. findExistingSelectionTransaction successfully identified existing transaction');
assert(existingTx.docNo === initialDocNo, `4. Existing transaction has Dok. Seleksi: ${initialDocNo}`);

const declResult4 = declareSelectionItem(refreshedItem, photoPayload1, mockUser);
assert(declResult4.transaction.docNo === initialDocNo, `4. Re-processing after refresh reused ${initialDocNo} (No 2026/CULL/005 generated)`);
txs = storage.get(SELECTION_STORAGE_KEY, []);
assert(txs.length === 1, '4. Still exactly 1 selection transaction after simulated refresh & retry');

// --------------------------------------------------------------------------
// SKENARIO 5: Source berbeda tetapi data lain sama (2026/SOW/001 vs 2026/SOW/003)
// --------------------------------------------------------------------------
console.log('\n--- SKENARIO 5: Source Berbeda (2026/SOW/001 vs 2026/SOW/003) ---');
const seedingTx2 = {
  id: 'SEED-TX-003',
  docNo: '2026/SOW/003',
  date: '2026-03-02',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  programId: 'PROG-01',
  programCode: '2026/TB/RNUR/001',
  programName: 'Program Replanting TBS 2026',
  batchCode: 'BTCH-001',
  batchNo: 'BTCH-001',
  bedengan: 'Bedengan-001',
  rusakQty: 120,
  matiQty: 0,
  lainnyaQty: 0
};
integrateSeedingToSelectionPool(seedingTx2);

pool = storage.get('selection_pool', []);
const poolItem2 = pool.find(p => p.sourceDocNo === '2026/SOW/003');
assert(poolItem2 !== undefined, '5. Pool entry created for 2026/SOW/003');
assert(poolItem2.docNo !== initialDocNo, `5. Different source receives different Dok. Seleksi: ${poolItem2.docNo} !== ${initialDocNo}`);

const declResult5 = declareSelectionItem(poolItem2, {
  dataUrl: 'data:image/jpeg;base64,samplephoto2',
  capturedAt: '2026-09-15T00:32:00.000Z',
  capturedAtLabel: '15/09/2026 00:32:00'
}, mockUser);

assert(declResult5.isNew === true, '5. New source declared as new transaction');
assert(declResult5.transaction.docNo === poolItem2.docNo, `5. Second transaction has distinct docNo: ${declResult5.transaction.docNo}`);

txs = storage.get(SELECTION_STORAGE_KEY, []);
assert(txs.length === 2, '5. Total selection transactions is now 2 (distinct sources)');

// --------------------------------------------------------------------------
// SKENARIO 6: Kategori berbeda dari source yang sama (RUSAK, MATI, LAINNYA)
// --------------------------------------------------------------------------
console.log('\n--- SKENARIO 6: Kategori Berbeda dari Source yang Sama ---');
const seedingTx3 = {
  id: 'SEED-TX-004',
  docNo: '2026/SOW/004',
  date: '2026-03-03',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  programId: 'PROG-01',
  programCode: '2026/TB/RNUR/001',
  programName: 'Program Replanting TBS 2026',
  batchCode: 'BTCH-002',
  batchNo: 'BTCH-002',
  bedengan: 'Bedengan-002',
  rusakQty: 100,
  matiQty: 40,
  lainnyaQty: 15
};
integrateSeedingToSelectionPool(seedingTx3);

pool = storage.get('selection_pool', []);
const sow4Items = pool.filter(p => p.sourceDocNo === '2026/SOW/004');
assert(sow4Items.length === 3, '6. Exactly 3 distinct entries created for SOW/004 (RUSAK, MATI, LAINNYA)');

const sow4Rusak = sow4Items.find(p => p.category === 'RUSAK');
const sow4Mati = sow4Items.find(p => p.category === 'MATI');
const sow4Lainnya = sow4Items.find(p => p.category === 'LAINNYA');

assert(sow4Rusak.docNo !== sow4Mati.docNo, '6. RUSAK and MATI have distinct Dok. Seleksi');
assert(sow4Mati.docNo !== sow4Lainnya.docNo, '6. MATI and LAINNYA have distinct Dok. Seleksi');

// Declare RUSAK
const declRusak = declareSelectionItem(sow4Rusak, photoPayload1, mockUser);
assert(declRusak.isNew === true, '6. RUSAK category declared as new transaction');

// Declare MATI
const declMati = declareSelectionItem(sow4Mati, photoPayload1, mockUser);
assert(declMati.isNew === true, '6. MATI category declared as separate new transaction');

// Re-declare RUSAK to test idempotency when other categories exist
const declRusakRetry = declareSelectionItem(sow4Rusak, photoPayload1, mockUser);
assert(declRusakRetry.isNew === false, '6. Re-declaring RUSAK did NOT create a duplicate');
assert(declRusakRetry.transaction.docNo === declRusak.transaction.docNo, '6. Re-declaring RUSAK reused exact same Dok. Seleksi');

txs = storage.get(SELECTION_STORAGE_KEY, []);
const sow4Txs = txs.filter(t => t.sourceDocNo === '2026/SOW/004');
assert(sow4Txs.length === 2, '6. Exactly 2 transactions recorded for declared categories (RUSAK & MATI)');

console.log('\n========================================================================');
console.log(`INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
