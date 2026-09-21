/**
 * test-notification-penyeleksian-alignment.js
 * Integration test suite for TASK: FIX-BERANDA-PENYELEKSIAN-NOTIFICATION-LIFECYCLE
 * Validates Beranda lifecycle synchronization & notification alignment.
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
  findExistingSelectionTransaction,
  syncAllSeedingsToSelectionPool,
  syncAllSeedingsToPreGraftingSelectionDocuments
} from './js/modules/selection/selection-manager.js';

import {
  syncAllDederanRejectionsToSelectionPool
} from './js/modules/seeding/dederan-manager.js';

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
console.log('INTEGRATION TEST: FIX-BERANDA-PENYELEKSIAN-NOTIFICATION-LIFECYCLE');
console.log('============================================================\n');

const mockMantriUser = {
  userId: 'USR-MANTRI-01',
  code: 'USR-MANTRI-01',
  name: 'Mantri Test',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
};

// Helper simulating Beranda notification calculation lifecycle
function runBerandaLifecycle(currentUser) {
  try {
    syncAllSeedingsToSelectionPool();
    syncAllDederanRejectionsToSelectionPool();
    syncAllSeedingsToPreGraftingSelectionDocuments(currentUser);
  } catch (err) {
    console.warn('[beranda sync test error]', err);
  }
  return hasActionableSelection(currentUser);
}

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
  storage.set('dederan_transactions', []);
  storage.set('dederan_inspections', []);
  storage.set('seeding_transactions', []);
}

// ============================================================
// TEST 01: selection_pool kosong, dederan_inspections memiliki 2 reject -> Beranda lifecycle populates pool and returns true
// ============================================================
resetCleanState();
storage.set('dederan_transactions', [
  {
    id: 'DED-TX-001',
    docNo: '2026/DED/001',
    bedenganCode: 'BED-001',
    jumlahDeder: 1000,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  },
  {
    id: 'DED-TX-002',
    docNo: '2026/DED/002',
    bedenganCode: 'BED-002',
    jumlahDeder: 2000,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  }
]);
storage.set('dederan_inspections', [
  {
    id: 'INS-001',
    docNo: '2026/DED-INS/001',
    dederanTxDocNo: '2026/DED/001',
    bedenganCode: 'BED-001',
    jumlahNormal: 800,
    jumlahAfkir: 200,
    jumlahTidakBerhasil: 200,
    isComplete: true,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  },
  {
    id: 'INS-002',
    docNo: '2026/DED-INS/002',
    dederanTxDocNo: '2026/DED/002',
    bedenganCode: 'BED-002',
    jumlahNormal: 1700,
    jumlahAfkir: 300,
    jumlahTidakBerhasil: 300,
    isComplete: true,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  }
]);

// Initially selection_pool is empty
const initialPoolCount = storage.get('selection_pool', []).length;
// Run Beranda lifecycle
const hasPending01 = runBerandaLifecycle(mockMantriUser);
const finalPool = storage.get('selection_pool', []);

assert(
  'TEST 01',
  'selection_pool kosong, dederan_inspections memiliki 2 reject -> Beranda lifecycle populates pool and returns hasActionableSelection = true',
  initialPoolCount === 0 && finalPool.length === 2 && hasPending01 === true,
  `Initial Pool: ${initialPoolCount}, Final Pool: ${finalPool.length}, hasActionableSelection: ${hasPending01}`
);

// ============================================================
// TEST 02: Beranda dengan 2 reject Dederan -> hasPendingPenyeleksian = true
// ============================================================
const hasPending02 = runBerandaLifecycle(mockMantriUser);
assert(
  'TEST 02',
  'Beranda dengan 2 reject Dederan: hasPendingPenyeleksian = true',
  hasPending02 === true,
  `hasPendingPenyeleksian: ${hasPending02}`
);

// ============================================================
// TEST 03: Tidak ada reject actionable -> hasPendingPenyeleksian = false
// ============================================================
resetCleanState();
storage.set('dederan_transactions', [
  {
    id: 'DED-TX-003',
    docNo: '2026/DED/003',
    bedenganCode: 'BED-003',
    jumlahDeder: 500,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  }
]);
storage.set('dederan_inspections', [
  {
    id: 'INS-003',
    docNo: '2026/DED-INS/003',
    dederanTxDocNo: '2026/DED/003',
    bedenganCode: 'BED-003',
    jumlahNormal: 500,
    jumlahAfkir: 0,
    jumlahTidakBerhasil: 0,
    isComplete: true,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  }
]);

const hasPending03 = runBerandaLifecycle(mockMantriUser);
assert(
  'TEST 03',
  'Tidak ada reject actionable: hasPendingPenyeleksian = false',
  hasPending03 === false,
  `hasPendingPenyeleksian: ${hasPending03}`
);

// ============================================================
// TEST 04: Existing actionable REJECT_OKULASI -> tetap true
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

const hasPending04 = runBerandaLifecycle(mockMantriUser);
assert(
  'TEST 04',
  'Existing actionable REJECT_OKULASI: hasPendingPenyeleksian = true',
  hasPending04 === true,
  `hasPendingPenyeleksian: ${hasPending04}`
);

// ============================================================
// TEST 05: Existing DIKEMBALIKAN -> tetap true
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
  returnReason: 'Foto bukti afkir tidak jelas',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
}]);

const hasPending05 = runBerandaLifecycle(mockMantriUser);
assert(
  'TEST 05',
  'Existing DIKEMBALIKAN: hasPendingPenyeleksian = true (needs re-declaration)',
  hasPending05 === true,
  `hasPendingPenyeleksian: ${hasPending05}`
);

// ============================================================
// TEST 06: DISETUJUI / MENUNGGU_VERIFIKASI -> false untuk item tersebut
// ============================================================
resetCleanState();
storage.set('selection_pool', [
  {
    id: 'POOL-APP-001',
    docNo: '2026/CULL/002',
    originType: 'REJECT_DEDERAN',
    jumlahAfkir: 25,
    status: SELECTION_STATUS.DISETUJUI,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  },
  {
    id: 'POOL-SUB-001',
    docNo: '2026/CULL/003',
    originType: 'REJECT_OKULASI',
    jumlahAfkir: 40,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  },
  {
    id: 'POOL-DEC-001',
    docNo: '2026/CULL/004',
    originType: 'REJECT_PEMERIKSAAN',
    jumlahAfkir: 15,
    status: 'DECLARED_CULLED',
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  }
]);
storage.set('selection_transactions', [
  {
    id: 'TX-CULL-002',
    docNo: '2026/CULL/002',
    sourceDocNo: 'POOL-APP-001',
    status: SELECTION_STATUS.DISETUJUI,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  },
  {
    id: 'TX-CULL-003',
    docNo: '2026/CULL/003',
    sourceDocNo: 'POOL-SUB-001',
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    estateId: 'EST-TEST',
    divisionId: 'DIV-TEST'
  }
]);

const hasPending06 = runBerandaLifecycle(mockMantriUser);
assert(
  'TEST 06',
  'DISETUJUI / MENUNGGU_VERIFIKASI / DECLARED_CULLED: hasPendingPenyeleksian = false',
  hasPending06 === false,
  `hasPendingPenyeleksian: ${hasPending06}`
);

// ============================================================
// TEST 07: Consistency Test (Modul Penyeleksian memiliki actionable item -> Beranda red dot ON)
// ============================================================
const permutations = [
  { name: 'Empty state', pool: [], txs: [] },
  { name: 'Dederan Pending', pool: [{ id: '1', originType: 'REJECT_DEDERAN', status: 'PENDING' }], txs: [] },
  { name: 'Penyemaian Pending', pool: [{ id: '2', originType: 'REJECT_PENYEMAIAN', status: 'PENDING' }], txs: [] },
  { name: 'Okulasi Submitted', pool: [{ id: '3', docNo: 'C3', originType: 'REJECT_OKULASI', status: SELECTION_STATUS.MENUNGGU_VERIFIKASI }], txs: [{ id: 'T3', docNo: 'C3', sourceDocNo: '3', status: SELECTION_STATUS.MENUNGGU_VERIFIKASI }] },
  { name: 'Pemeriksaan Returned', pool: [{ id: '4', docNo: 'C4', originType: 'REJECT_PEMERIKSAAN', status: SELECTION_STATUS.DIKEMBALIKAN }], txs: [{ id: 'T4', docNo: 'C4', sourceDocNo: '4', status: SELECTION_STATUS.DIKEMBALIKAN }] },
  { name: 'Regrafting Approved', pool: [{ id: '5', docNo: 'C5', originType: 'REJECT_REGRAFTING', status: SELECTION_STATUS.DISETUJUI }], txs: [{ id: 'T5', docNo: 'C5', sourceDocNo: '5', status: SELECTION_STATUS.DISETUJUI }] },
  { name: 'Dederan 2 items actionable', pool: [{ id: 'd1', originType: 'REJECT_DEDERAN', status: 'PENDING_DECLARATION' }, { id: 'd2', originType: 'REJECT_DEDERAN', status: 'PENDING_DECLARATION' }], txs: [] }
];

let allPermutationsConsistent = true;
for (const p of permutations) {
  resetCleanState();
  storage.set('selection_pool', p.pool);
  storage.set('selection_transactions', p.txs);

  const modActionable = getModuleActionablePoolCount(mockMantriUser) > 0;
  const berandaActionable = runBerandaLifecycle(mockMantriUser);

  if (modActionable !== berandaActionable) {
    allPermutationsConsistent = false;
    console.error(`  Permutation Mismatch on '${p.name}': Module=${modActionable}, Beranda=${berandaActionable}`);
  }
}

assert(
  'TEST 07',
  'Consistency: Modul Penyeleksian actionable presence === Beranda red dot ON across all states',
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
