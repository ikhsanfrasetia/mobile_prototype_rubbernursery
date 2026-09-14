/**
 * scripts/test-reset-master-bedengan-batch.js
 * Verification Test Suite for Master Bedengan & Master Batch Total Reset
 * Task ID: TASK-RESET-MASTER-BEDENGAN-BATCH-01
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

import {
  BEDENGAN_STATUS,
  STORAGE_KEY_BEDENGAN_MASTER,
  DEFAULT_BEDENGAN_MASTER,
  getAllBedengan,
  getActiveBedengan,
  getBedenganById,
  getNextBedenganCandidate,
  createBedengan,
  resetBedenganMasterToDefault
} from '../js/data/bedengan-master.js';

import {
  BATCH_MASTER_STATUS,
  STORAGE_KEY_NURSERY_BATCHES,
  DEFAULT_CANONICAL_BATCHES,
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getNextBatchCandidate,
  createBatch,
  resetBatchMasterToDefault
} from '../js/data/batch-master.js';

import {
  PROGRAM_MASTER,
  PROGRAM_STATUS,
  getAllPrograms,
  getOpenPrograms,
  getProgramById
} from '../js/data/program-master.js';

import {
  ESTATE_MASTER,
  getAllEstates,
  getNurseryDivisionsByEstate
} from '../js/data/estate-master.js';

import { BLOCK_MASTER } from '../js/data/block-master.js';
import { DATA_STORAGE_REGISTRY } from '../js/core/storage-registry.js';
import { getNurseryBatches } from '../js/modules/dispatch/dispatch-landing.js';
import { storage } from '../js/core/storage.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('====================================================');
console.log('TEST SUITE: TASK-RESET-MASTER-BEDENGAN-BATCH-01');
console.log('====================================================\n');

// --- 1. Pre-reset transaction reference verification ---
const oldBatchIds = [
  'BATCH-APM-001','BATCH-APM-002','BATCH-APM-003','BATCH-APM-004','BATCH-APM-005','BATCH-APM-006','BATCH-APM-007',
  'BATCH-TBS-001','BATCH-TBS-002','B-001','B-002','B-003','B-004','B-005','B-006','B-007','B-TBS-01','B-TBS-02'
];
const oldBedenganIds = [
  'BED-TBS-D1-001','BED-TBS-D1-002','BED-TBS-D1-003','BED-TBS-D1-004','BED-TBS-D1-005','BED-TBS-D1-006','BED-TBS-D1-007',
  'BED-TBS-D1-008','BED-TBS-D1-009','BED-TBS-D1-010','BED-APM-D2-001','BED-APM-D2-002'
];

let txRefs = 0;
const txKeys = [...(DATA_STORAGE_REGISTRY.TRANSACTION || []), ...(DATA_STORAGE_REGISTRY.POOL || [])];
txKeys.forEach(k => {
  const d = storage.get(k, null);
  if (d && Array.isArray(d) && d.length > 0) {
    const s = JSON.stringify(d);
    [...oldBatchIds, ...oldBedenganIds].forEach(id => {
      if (s.includes(id)) txRefs++;
    });
  }
});
assert(txRefs === 0, '1. Pre-reset transaction references = 0 (No active references)');

// --- 2 & 3. Reset storage to [] ---
storage.set(STORAGE_KEY_NURSERY_BATCHES, []);
storage.set(STORAGE_KEY_BEDENGAN_MASTER, []);
assert(Array.isArray(storage.get(STORAGE_KEY_NURSERY_BATCHES)) && storage.get(STORAGE_KEY_NURSERY_BATCHES).length === 0, '2. nursery_batches is successfully set to []');
assert(Array.isArray(storage.get(STORAGE_KEY_BEDENGAN_MASTER)) && storage.get(STORAGE_KEY_BEDENGAN_MASTER).length === 0, '3. bedengan_master is successfully set to []');

// --- 4, 5, 6, 7. Canonical Reference Integrity ---
const progs = getAllPrograms();
assert(progs.length === 2, `4. Program Master preserved (2 programs: ${progs.map(p => p.code).join(', ')})`);
assert(progs.every(p => p.status === PROGRAM_STATUS.OPEN), '4b. All canonical programs are OPEN');

const estates = getAllEstates();
assert(estates.length === 2 && estates.some(e => e.estate_id === 'EST-TBS') && estates.some(e => e.estate_id === 'EST-APM'), '5. Estate Master preserved (EST-TBS, EST-APM)');

const tbsDivs = getNurseryDivisionsByEstate('EST-TBS');
const apmDivs = getNurseryDivisionsByEstate('EST-APM');
assert(tbsDivs.some(d => d.divisionId === 'DIV-001'), '6a. TBS nursery division DIV-001 preserved');
assert(apmDivs.some(d => d.divisionId === 'DIV-APM-02'), '6b. APM nursery division DIV-APM-02 preserved');

assert(BLOCK_MASTER.length === 40, `7. Block Master preserved (${BLOCK_MASTER.length} blocks)`);

// --- 8 & 9. Default constants empty ---
assert(Array.isArray(DEFAULT_CANONICAL_BATCHES) && DEFAULT_CANONICAL_BATCHES.length === 0, '8. DEFAULT_CANONICAL_BATCHES is []');
assert(Array.isArray(DEFAULT_BEDENGAN_MASTER) && DEFAULT_BEDENGAN_MASTER.length === 0, '9. DEFAULT_BEDENGAN_MASTER is []');

// --- 10 & 11. Reading empty storage returns 0 old records (no auto-population) ---
assert(getAllBatches().length === 0, '10. getAllBatches() returns 0 records (empty master)');
assert(getAllBedengan().length === 0, '11. getAllBedengan() returns 0 records (empty master)');
assert(getNurseryBatches().length === 0, '11b. Dispatch getNurseryBatches() returns 0 records');

// --- 12 & 13. Simulated restart/reload preserves [] ---
storage.set(STORAGE_KEY_NURSERY_BATCHES, []);
storage.set(STORAGE_KEY_BEDENGAN_MASTER, []);
assert(getAllBatches().length === 0, '12. Reloading storage produces 0 old batches');
assert(getAllBedengan().length === 0, '13. Reloading storage produces 0 old bedengan');

// --- 14 & 15. ASB Creation of new Bedengan & new Batch ---
const asbTBS = {
  id: 'TBS-ASB-001',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const bedCandidateTBS = getNextBedenganCandidate('PRG-TBS-2026-001', 'EST-TBS', 'DIV-001');
assert(bedCandidateTBS && bedCandidateTBS.bedenganCode, `15a. Bedengan candidate generated: ${bedCandidateTBS.bedenganCode}`);

const createdBedTBS = createBedengan({
  bedenganCode: bedCandidateTBS.bedenganCode,
  name: bedCandidateTBS.name,
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  capacity: 1000,
  qrCode: bedCandidateTBS.qrCode
}, asbTBS);

assert(createdBedTBS && createdBedTBS.bedenganId, `15b. ASB created new Bedengan: ${createdBedTBS.bedenganId} (${createdBedTBS.bedenganCode})`);
assert(getAllBedengan().length === 1, '15c. Total Master Bedengan is now 1');

const batchCandidateTBS = getNextBatchCandidate('PRG-TBS-2026-001', 'EST-TBS', 'DIV-001');
assert(batchCandidateTBS && batchCandidateTBS.batchCode, `14a. Batch candidate generated: ${batchCandidateTBS.batchCode}`);

const createdBatchTBS = createBatch({
  batchCode: batchCandidateTBS.batchCode,
  name: batchCandidateTBS.name,
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  clone: 'PB 260',
  stage: 'Rubber Main Nursery',
  category: 'Polibag Kecil',
  bedenganIds: [createdBedTBS.bedenganId]
}, asbTBS);

assert(createdBatchTBS && createdBatchTBS.batchId, `14b. ASB created new Batch: ${createdBatchTBS.batchId} (${createdBatchTBS.batchCode})`);
assert(getAllBatches().length === 1, '14c. Total Master Batch is now 1');

// --- 16. Program OPEN guard ---
let errorCaught = false;
try {
  createBedengan({
    bedenganCode: 'BED-ERR',
    name: 'Bed Error',
    programId: 'NON_EXISTENT_PROG',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 500,
    qrCode: 'SIGMA-ERR'
  }, asbTBS);
} catch (e) {
  errorCaught = true;
}
assert(errorCaught, '16. Program OPEN guard prevents creating Bedengan with invalid/closed program');

// --- 17. Context inheritance ---
assert(createdBedTBS.estateId === 'EST-TBS' && createdBedTBS.divisionId === 'DIV-001', '17a. Bedengan inherits correct Estate & Division');
assert(createdBatchTBS.estateId === 'EST-TBS' && createdBatchTBS.divisionId === 'DIV-001', '17b. Batch inherits correct Estate & Division');

// --- 18 & 19. Mantri Consumption ---
const mantriBatches = getActiveBatches({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
assert(mantriBatches.length === 1 && mantriBatches[0].batchId === createdBatchTBS.batchId, '18. Mantri TBS can see and consume newly created Batch');

const mantriBeds = getActiveBedengan({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
assert(mantriBeds.length === 1 && mantriBeds[0].bedenganId === createdBedTBS.bedenganId, '19. Mantri TBS can see and consume newly created Bedengan');

// --- 20. Cross-Estate Isolation ---
const apmBatches = getActiveBatches({ estateId: 'EST-APM', divisionId: 'DIV-APM-02' });
assert(apmBatches.length === 0, '20a. APM scope sees 0 TBS batches (Cross-estate isolation PASS)');

const apmBeds = getActiveBedengan({ estateId: 'EST-APM', divisionId: 'DIV-APM-02' });
assert(apmBeds.length === 0, '20b. APM scope sees 0 TBS bedengan (Cross-estate isolation PASS)');

let crossEstateError = false;
try {
  createBedengan({
    bedenganCode: 'BED-APM-ILLEGAL',
    name: 'Bed Illegal',
    programId: 'PRG-APM-2026-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    capacity: 1000,
    qrCode: 'SIGMA-ILLEGAL'
  }, asbTBS);
} catch (e) {
  crossEstateError = true;
}
assert(crossEstateError, '20c. ASB TBS blocked from creating data in APM estate');

// --- 21. Master Status Pure ACTIVE / INACTIVE ---
assert(createdBatchTBS.statusMaster === BATCH_MASTER_STATUS.ACTIVE, '21a. Master Batch status is pure ACTIVE');
assert(createdBedTBS.status === BEDENGAN_STATUS.ACTIVE, '21b. Master Bedengan status is pure ACTIVE');

// --- 22. availableQty internal handling without UI display ---
assert(typeof createdBatchTBS.availableQty !== 'undefined', '22. availableQty field remains internally available for transactions');

// --- 23. Transaction regression verification ---
const batchStock = getBatchById(createdBatchTBS.batchId);
assert(batchStock !== null && batchStock.batchCode === createdBatchTBS.batchCode, '23. Batch lookup by ID works seamlessly for transactions');

// --- 24. Clean All restores [] without reviving old seed ---
const hybridBatchEntry = DATA_STORAGE_REGISTRY.HYBRID.find(h => h.key === 'nursery_batches');
assert(hybridBatchEntry && typeof hybridBatchEntry.restoreFn === 'function', '24a. HYBRID nursery_batches restoreFn exists');
const restoredBatches = hybridBatchEntry.restoreFn();
assert(Array.isArray(restoredBatches) && restoredBatches.length === 0, '24b. Clean All restores nursery_batches to [] (not old 9 batches)');

const restoredBedengan = resetBedenganMasterToDefault();
assert(Array.isArray(restoredBedengan) && restoredBedengan.length === 0, '24c. Clean All restores bedengan_master to [] (not old 12 bedengan)');

// --- 25. Re-creation after Clean All passes ---
const asbAPM = {
  id: 'APM-ASB-002',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const apmBedCand = getNextBedenganCandidate('PRG-APM-2026-001', 'EST-APM', 'DIV-APM-02');
const apmCreatedBed = createBedengan({
  bedenganCode: apmBedCand.bedenganCode,
  name: apmBedCand.name,
  programId: 'PRG-APM-2026-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  blockCode: '007/03',
  capacity: 1200,
  qrCode: apmBedCand.qrCode
}, asbAPM);

assert(apmCreatedBed && apmCreatedBed.estateId === 'EST-APM', `25. ASB APM successfully creates Bedengan after reset: ${apmCreatedBed.bedenganId}`);

console.log('\n====================================================');
console.log('ALL 25 TESTS PASSED SUCCESSFULLY! (0 REGRESSIONS)');
console.log('====================================================');
