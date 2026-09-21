/**
 * test-notification-penyeleksian-alignment.js
 * Integration test suite for TASK: NOTIFICATION-PENYELEKSIAN-ALIGNMENT
 * Covering TEST 01 through TEST 12.
 */

// Setup Mock Environment for Node.js
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

import { storage } from './js/core/storage.js';
import {
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS,
  hasActionableSelection,
  filterSelectionByScope,
  findExistingSelectionTransaction
} from './js/modules/selection/selection-manager.js';

const results = [];

function assert(id, desc, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`[${status}] ${id}: ${desc} ${detail ? '-> ' + detail : ''}`);
  if (!condition) {
    console.error(`  FAIL DETAIL: ${detail}`);
  }
}

console.log('============================================================');
console.log('INTEGRATION TEST: NOTIFICATION-PENYELEKSIAN-ALIGNMENT');
console.log('============================================================\n');

const mockMantriUser = {
  userId: 'USR-MANTRI-01',
  code: 'USR-MANTRI-01',
  name: 'Mantri Test',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
};

// Helper to simulate Module Penyeleksian actionable pool count (from selection-landing.js)
function getModuleActionablePoolCount(currentUser) {
  const rawSelectionPool = storage.get('selection_pool', []);
  const scopedPool = filterSelectionByScope(rawSelectionPool, currentUser).filter(item => {
    const existing = findExistingSelectionTransaction(item);
    if (!existing) {
      return item.status !== 'DECLARED_CULLED' && item.status !== SELECTION_STATUS.DISETUJUI && item.status !== SELECTION_STATUS.MENUNGGU_VERIFIKASI;
    }
    if (existing.status === SELECTION_STATUS.DIKEMBALIKAN || item.status === SELECTION_STATUS.DIKEMBALIKAN) {
      return true;
    }
    return false;
  });
  return scopedPool.length;
}

// Reset clean state
function resetCleanState() {
  globalThis.localStorage.clear();
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set('selection_pool', []);
  storage.set('selection_transactions', []);
}

// ============================================================
// TEST 01: REJECT_DEDERAN actionable -> hasActionableSelection = true
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-DED-001',
  originType: 'REJECT_DEDERAN',
  sourceModule: 'DEDERAN',
  bedenganCode: 'BED-001',
  jumlahAfkir: 50,
  status: 'PENDING_DECLARATION',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res01 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 01',
  'REJECT_DEDERAN actionable: hasActionableSelection returns true',
  res01 === true,
  `hasActionableSelection: ${res01}`
);

// ============================================================
// TEST 02: REJECT_PENYEMAIAN actionable -> hasActionableSelection = true
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-SEED-001',
  originType: 'REJECT_PENYEMAIAN',
  sourceModule: 'PENYEMAIAN',
  category: 'RUSAK',
  jumlahAfkir: 20,
  status: 'PENDING_DECLARATION',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res02 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 02',
  'REJECT_PENYEMAIAN actionable: hasActionableSelection returns true',
  res02 === true,
  `hasActionableSelection: ${res02}`
);

// ============================================================
// TEST 03: REJECT_OKULASI actionable -> true
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-OKU-001',
  originType: 'REJECT_OKULASI',
  sourceModule: 'OKULASI',
  jumlahAfkir: 30,
  status: 'PENDING_DECLARATION',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res03 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 03',
  'REJECT_OKULASI actionable: hasActionableSelection returns true',
  res03 === true,
  `hasActionableSelection: ${res03}`
);

// ============================================================
// TEST 04: REJECT_PEMERIKSAAN actionable -> true
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-INSP-001',
  originType: 'REJECT_PEMERIKSAAN',
  sourceModule: 'PEMERIKSAAN',
  jumlahAfkir: 15,
  status: 'PENDING_DECLARATION',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res04 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 04',
  'REJECT_PEMERIKSAAN actionable: hasActionableSelection returns true',
  res04 === true,
  `hasActionableSelection: ${res04}`
);

// ============================================================
// TEST 05: REJECT_REGRAFTING actionable -> true
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-REG-001',
  originType: 'REJECT_REGRAFTING',
  sourceModule: 'REGRAFTING',
  jumlahAfkir: 10,
  status: 'PENDING_DECLARATION',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res05 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 05',
  'REJECT_REGRAFTING actionable: hasActionableSelection returns true',
  res05 === true,
  `hasActionableSelection: ${res05}`
);

// ============================================================
// TEST 06: DIKEMBALIKAN -> true (Mantri needs to re-declare)
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-RET-001',
  docNo: '2026/CULL/001',
  originType: 'REJECT_DEDERAN',
  jumlahAfkir: 25,
  status: SELECTION_STATUS.DIKEMBALIKAN,
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);
storage.set('selection_transactions', [{
  id: 'TX-CULL-001',
  docNo: '2026/CULL/001',
  sourceDocNo: 'POOL-RET-001',
  status: SELECTION_STATUS.DIKEMBALIKAN,
  returnReason: 'Foto tidak jelas',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res06 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 06',
  'Status DIKEMBALIKAN: hasActionableSelection returns true (needs re-declaration)',
  res06 === true,
  `hasActionableSelection: ${res06}`
);

// ============================================================
// TEST 07: DISETUJUI -> false (Item already approved by Asisten)
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-APP-001',
  docNo: '2026/CULL/002',
  originType: 'REJECT_DEDERAN',
  jumlahAfkir: 25,
  status: SELECTION_STATUS.DISETUJUI,
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);
storage.set('selection_transactions', [{
  id: 'TX-CULL-002',
  docNo: '2026/CULL/002',
  sourceDocNo: 'POOL-APP-001',
  status: SELECTION_STATUS.DISETUJUI,
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res07 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 07',
  'Status DISETUJUI: hasActionableSelection returns false',
  res07 === false,
  `hasActionableSelection: ${res07}`
);

// ============================================================
// TEST 08: MENUNGGU_VERIFIKASI -> false (Waiting for Asisten, not actionable for Mantri)
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-SUB-001',
  docNo: '2026/CULL/003',
  originType: 'REJECT_OKULASI',
  jumlahAfkir: 40,
  status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);
storage.set('selection_transactions', [{
  id: 'TX-CULL-003',
  docNo: '2026/CULL/003',
  sourceDocNo: 'POOL-SUB-001',
  status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res08 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 08',
  'Status MENUNGGU_VERIFIKASI: hasActionableSelection returns false for Mantri',
  res08 === false,
  `hasActionableSelection: ${res08}`
);

// ============================================================
// TEST 09: DECLARED_CULLED -> false
// ============================================================
resetCleanState();
storage.set('selection_pool', [{
  id: 'POOL-DEC-001',
  docNo: '2026/CULL/004',
  originType: 'REJECT_PEMERIKSAAN',
  jumlahAfkir: 15,
  status: 'DECLARED_CULLED',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const res09 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 09',
  'Status DECLARED_CULLED: hasActionableSelection returns false',
  res09 === false,
  `hasActionableSelection: ${res09}`
);

// ============================================================
// TEST 10: Dua item "Perlu Deklarasi" (BED-001 & BED-002)
// ============================================================
resetCleanState();
storage.set('selection_pool', [
  {
    id: 'POOL-DED-001',
    docNo: '2026/CULL/001',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    bedenganCode: 'BED-001',
    dederanTxDocNo: '2026/DED/001',
    jumlahAfkir: 1000,
    status: 'PENDING_DECLARATION',
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  },
  {
    id: 'POOL-DED-002',
    docNo: '2026/CULL/002',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    bedenganCode: 'BED-002',
    dederanTxDocNo: '2026/DED/002',
    jumlahAfkir: 2000,
    status: 'PENDING_DECLARATION',
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  }
]);

const moduleCount10 = getModuleActionablePoolCount(mockMantriUser);
const berandaNotif10 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 10',
  'Dua item "Perlu Deklarasi": module count = 2 AND Beranda red dot = ON',
  moduleCount10 === 2 && berandaNotif10 === true,
  `Module Count: ${moduleCount10}, Beranda hasActionableSelection: ${berandaNotif10}`
);

// ============================================================
// TEST 11: Tidak ada actionable item
// ============================================================
resetCleanState();
const moduleCount11 = getModuleActionablePoolCount(mockMantriUser);
const berandaNotif11 = hasActionableSelection(mockMantriUser);
assert(
  'TEST 11',
  'Tidak ada actionable item: module count = 0 AND Beranda red dot = OFF',
  moduleCount11 === 0 && berandaNotif11 === false,
  `Module Count: ${moduleCount11}, Beranda hasActionableSelection: ${berandaNotif11}`
);

// ============================================================
// TEST 12: Consistency Test (Condition pada Beranda === condition pada Modul Penyeleksian)
// ============================================================
// Test across multiple permutations
const permutations = [
  { name: 'Empty state', pool: [], txs: [] },
  { name: 'Dederan Pending', pool: [{ id: '1', originType: 'REJECT_DEDERAN', status: 'PENDING' }], txs: [] },
  { name: 'Penyemaian Pending', pool: [{ id: '2', originType: 'REJECT_PENYEMAIAN', status: 'PENDING' }], txs: [] },
  { name: 'Okulasi Submitted', pool: [{ id: '3', docNo: 'C3', originType: 'REJECT_OKULASI', status: SELECTION_STATUS.MENUNGGU_VERIFIKASI }], txs: [{ id: 'T3', docNo: 'C3', sourceDocNo: '3', status: SELECTION_STATUS.MENUNGGU_VERIFIKASI }] },
  { name: 'Pemeriksaan Returned', pool: [{ id: '4', docNo: 'C4', originType: 'REJECT_PEMERIKSAAN', status: SELECTION_STATUS.DIKEMBALIKAN }], txs: [{ id: 'T4', docNo: 'C4', sourceDocNo: '4', status: SELECTION_STATUS.DIKEMBALIKAN }] },
  { name: 'Regrafting Approved', pool: [{ id: '5', docNo: 'C5', originType: 'REJECT_REGRAFTING', status: SELECTION_STATUS.DISETUJUI }], txs: [{ id: 'T5', docNo: 'C5', sourceDocNo: '5', status: SELECTION_STATUS.DISETUJUI }] }
];

let allPermutationsConsistent = true;
for (const p of permutations) {
  resetCleanState();
  storage.set('selection_pool', p.pool);
  storage.set('selection_transactions', p.txs);

  const modActionable = getModuleActionablePoolCount(mockMantriUser) > 0;
  const berandaActionable = hasActionableSelection(mockMantriUser);

  if (modActionable !== berandaActionable) {
    allPermutationsConsistent = false;
    console.error(`  Permutation Mismatch on '${p.name}': Module=${modActionable}, Beranda=${berandaActionable}`);
  }
}

assert(
  'TEST 12',
  'Consistency Test: Beranda boolean perfectly tracks Modul Penyeleksian actionable presence',
  allPermutationsConsistent === true,
  `All Permutations Consistent: ${allPermutationsConsistent}`
);

console.log('\n============================================================');
console.log('TEST SUMMARY');
console.log('============================================================');
const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
console.log(`TOTAL TESTS: ${results.length}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log(`OVERALL RESULT: ${failCount === 0 ? 'PASS' : 'FAIL'}`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
