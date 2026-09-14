/**
 * scripts/test-master-bedengan-batch-crud.js
 * Integration Test Suite for:
 * TASK-ENHANCE-MASTER-BEDENGAN-BATCH-CRUD-01
 * Enhancement Master Bedengan & Master Batch — Edit, Hapus, dan Standardisasi Format Kode/Nama
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
  BEDENGAN_STATUS,
  STORAGE_KEY_BEDENGAN_MASTER,
  DEFAULT_BEDENGAN_MASTER,
  getAllBedengan,
  getActiveBedengan,
  getBedenganById,
  getNextBedenganCandidate,
  createBedengan,
  updateBedengan,
  deleteBedengan,
  isBedenganUsedInTransactions,
  resetBedenganMasterToDefault
} from '../js/data/bedengan-master.js';

import {
  BATCH_MASTER_STATUS,
  BATCH_STATUS,
  STORAGE_KEY_NURSERY_BATCHES,
  DEFAULT_CANONICAL_BATCHES,
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getNextBatchCandidate,
  createBatch,
  updateBatch,
  deleteBatch,
  isBatchUsedInTransactions,
  resetBatchMasterToDefault
} from '../js/data/batch-master.js';

import {
  getAllPrograms,
  getOpenPrograms,
  getProgramById
} from '../js/data/program-master.js';

import {
  getAllEstates,
  getNurseryDivisionsByEstate
} from '../js/data/estate-master.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passed++;
  console.log(`✓ PASS: ${message}`);
}

console.log('========================================================================');
console.log('INTEGRATION TEST: TASK-ENHANCE-MASTER-BEDENGAN-BATCH-CRUD-01');
console.log('========================================================================\n');

// Mock User Contexts
const USER_ASB_TBS = {
  id: 'USR-ASB-TBS',
  userId: 'USR-ASB-TBS',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const USER_ASB_APM = {
  id: 'USR-ASB-APM',
  userId: 'USR-ASB-APM',
  name: 'Asisten Bibitan APM',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const USER_MANTRI_TBS = {
  id: 'USR-MNT-TBS',
  userId: 'USR-MNT-TBS',
  name: 'Mantri Bibitan TBS',
  role: 'MANTRI_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

// Clear master storage to start from baseline 0
storage.set(STORAGE_KEY_BEDENGAN_MASTER, []);
storage.set(STORAGE_KEY_NURSERY_BATCHES, []);
storage.set('seeding_transactions', []);
storage.set('receipt_ksp_transactions', []);

const TBS_PROGRAM_ID = '2026/TB/RNUR/001';
const APM_PROGRAM_ID = '2026/AP/RNUR/001';

console.log('--- BASELINE & PRE-CHECK ---');
assert(getAllBedengan().length === 0, '1. Baseline Master Bedengan = 0');
assert(getAllBatches().length === 0, '2. Baseline Master Batch = 0');

console.log('\n--- SCENARIO 1: MASTER BEDENGAN (CREATE, RELOAD, EDIT, DELETE UNUSED, RE-SEQUENCE) ---');
// 1.1 Candidate generation format check
const bedCand1 = getNextBedenganCandidate(TBS_PROGRAM_ID, 'EST-TBS', 'DIV-001');
assert(bedCand1.bedenganCode === 'BED-001', '1.1 Candidate Bedengan Code format is BED-001');
assert(bedCand1.name === 'Bedengan-001', '1.2 Candidate Bedengan Name format is Bedengan-001');
assert(bedCand1.qrCode === 'SIGMA-BED-001', '1.3 Candidate Bedengan QR is SIGMA-BED-001');

// 1.2 Create Bedengan
const createdBed1 = createBedengan({
  bedenganId: bedCand1.bedenganId,
  bedenganCode: bedCand1.bedenganCode,
  name: bedCand1.name,
  qrCode: bedCand1.qrCode,
  programId: TBS_PROGRAM_ID,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  capacity: 1000,
  status: BEDENGAN_STATUS.AVAILABLE
}, USER_ASB_TBS);

assert(createdBed1.bedenganCode === 'BED-001', '1.4 Bedengan created with code BED-001');
assert(createdBed1.name === 'Bedengan-001', '1.5 Bedengan created with name Bedengan-001');
assert(getAllBedengan().length === 1, '1.6 Master Bedengan count is now 1');

// 1.3 Persistence on reload
const reloadedBeds = getAllBedengan();
assert(reloadedBeds.length === 1 && reloadedBeds[0].bedenganCode === 'BED-001', '1.7 Bedengan record persists after reload');

// 1.4 Edit Bedengan (Code and Name remain immutable, capacity and status change)
const updatedBed1 = updateBedengan(createdBed1.bedenganId, {
  capacity: 1500,
  status: BEDENGAN_STATUS.AVAILABLE
}, USER_ASB_TBS);

assert(updatedBed1.bedenganId === createdBed1.bedenganId, '1.8 Internal ID immutable after edit');
assert(updatedBed1.bedenganCode === 'BED-001', '1.9 Code remains BED-001 after edit');
assert(updatedBed1.name === 'Bedengan-001', '1.10 Name remains Bedengan-001 after edit');
assert(updatedBed1.capacity === 1500, '1.11 Capacity successfully updated to 1500');

// 1.5 Delete Unused Bedengan (Hard Delete)
assert(!isBedenganUsedInTransactions(createdBed1.bedenganId, createdBed1.bedenganCode), '1.12 Bedengan has 0 transaction references');
const deleteResult1 = deleteBedengan(createdBed1.bedenganId, USER_ASB_TBS);
assert(deleteResult1.success === true && deleteResult1.softDeleted === false, '1.13 Unused Bedengan is permanently hard-deleted');
assert(getAllBedengan().length === 0, '1.14 Master Bedengan count is back to 0');

// 1.6 Next sequence generation remains safe and starts at 001 if empty
const bedCandAfterDelete = getNextBedenganCandidate(TBS_PROGRAM_ID, 'EST-TBS', 'DIV-001');
assert(bedCandAfterDelete.bedenganCode === 'BED-001', '1.15 Next sequence generates safe BED-001');

// Create BED-001 again
const bed1Again = createBedengan({
  bedenganId: bedCandAfterDelete.bedenganId,
  bedenganCode: bedCandAfterDelete.bedenganCode,
  name: bedCandAfterDelete.name,
  qrCode: bedCandAfterDelete.qrCode,
  programId: TBS_PROGRAM_ID,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  capacity: 1000,
  status: BEDENGAN_STATUS.AVAILABLE
}, USER_ASB_TBS);

// Create BED-002
const bedCand2 = getNextBedenganCandidate(TBS_PROGRAM_ID, 'EST-TBS', 'DIV-001');
assert(bedCand2.bedenganCode === 'BED-002', '1.16 Next candidate safely advances to BED-002');
assert(bedCand2.name === 'Bedengan-002', '1.17 Next candidate name is Bedengan-002');

const createdBed2 = createBedengan({
  bedenganId: bedCand2.bedenganId,
  bedenganCode: bedCand2.bedenganCode,
  name: bedCand2.name,
  qrCode: bedCand2.qrCode,
  programId: TBS_PROGRAM_ID,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  capacity: 1000,
  status: BEDENGAN_STATUS.AVAILABLE
}, USER_ASB_TBS);
assert(getAllBedengan().length === 2, '1.18 Master Bedengan now has 2 records (BED-001 & BED-002)');


console.log('\n--- SCENARIO 2: MASTER BATCH (CREATE, RELOAD, EDIT, DELETE UNUSED, RE-SEQUENCE) ---');
// 2.1 Candidate generation format check
const batchCand1 = getNextBatchCandidate(TBS_PROGRAM_ID, 'EST-TBS', 'DIV-001');
assert(batchCand1.batchCode === 'BTCH-001', '2.1 Candidate Batch Code format is BTCH-001');
assert(batchCand1.name === 'Batch-001', '2.2 Candidate Batch Name format is Batch-001');
assert(batchCand1.qrCode === 'SIGMA-BTCH-001', '2.3 Candidate Batch QR is SIGMA-BTCH-001');

// 2.2 Create Batch
const createdBatch1 = createBatch({
  batchId: batchCand1.batchId,
  batchCode: batchCand1.batchCode,
  name: batchCand1.name,
  qrCode: batchCand1.qrCode,
  programId: TBS_PROGRAM_ID,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  clone: 'IRCA 19',
  growthStage: 'Rubber Advance Planting Material',
  category: 'Polibag Besar',
  bedenganIds: [createdBed2.bedenganId],
  initialQty: 0,
  availableQty: 0,
  statusMaster: BATCH_MASTER_STATUS.ACTIVE,
  status: BATCH_STATUS.CREATED
}, USER_ASB_TBS);

assert(createdBatch1.batchCode === 'BTCH-001', '2.4 Batch created with code BTCH-001');
assert(createdBatch1.name === 'Batch-001', '2.5 Batch created with name Batch-001');
assert(getAllBatches().length === 1, '2.6 Master Batch count is now 1');

// 2.3 Persistence on reload
const reloadedBatches = getAllBatches();
assert(reloadedBatches.length === 1 && reloadedBatches[0].batchCode === 'BTCH-001', '2.7 Batch record persists after reload');

// 2.4 Edit Batch (Code and Name immutable, clone/stage/status change)
const updatedBatch1 = updateBatch(createdBatch1.id, {
  clone: 'PB 260',
  growthStage: 'Rubber Main Nursery',
  statusMaster: BATCH_MASTER_STATUS.ACTIVE
}, USER_ASB_TBS);

assert(updatedBatch1.id === createdBatch1.id, '2.8 Batch Internal ID is immutable');
assert(updatedBatch1.batchCode === 'BTCH-001', '2.9 Batch Code remains BTCH-001 after edit');
assert(updatedBatch1.name === 'Batch-001', '2.10 Batch Name remains Batch-001 after edit');
assert(updatedBatch1.clone === 'PB 260', '2.11 Clone successfully updated to PB 260');
assert(updatedBatch1.growthStage === 'Rubber Main Nursery', '2.12 Growth stage successfully updated');

// 2.5 Delete Unused Batch (Hard Delete)
assert(!isBatchUsedInTransactions(createdBatch1.id, createdBatch1.batchCode), '2.13 Batch has 0 transaction references');
const deleteBatchResult1 = deleteBatch(createdBatch1.id, USER_ASB_TBS);
assert(deleteBatchResult1.success === true && deleteBatchResult1.softDeleted === false, '2.14 Unused Batch is permanently hard-deleted');
assert(getAllBatches().length === 0, '2.15 Master Batch count is back to 0');

// 2.6 Next candidate generation advances safely
const batchCandAfterDelete = getNextBatchCandidate(TBS_PROGRAM_ID, 'EST-TBS', 'DIV-001');
assert(batchCandAfterDelete.batchCode === 'BTCH-001', '2.16 Next sequence generates safe BTCH-001');

// Re-create BTCH-001
const batch1Again = createBatch({
  batchId: batchCandAfterDelete.batchId,
  batchCode: batchCandAfterDelete.batchCode,
  name: batchCandAfterDelete.name,
  qrCode: batchCandAfterDelete.qrCode,
  programId: TBS_PROGRAM_ID,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  clone: 'IRCA 19',
  initialQty: 0,
  availableQty: 0,
  statusMaster: BATCH_MASTER_STATUS.ACTIVE,
  status: BATCH_STATUS.CREATED
}, USER_ASB_TBS);

// Create BTCH-002
const batchCand2 = getNextBatchCandidate(TBS_PROGRAM_ID, 'EST-TBS', 'DIV-001');
assert(batchCand2.batchCode === 'BTCH-002', '2.17 Next candidate safely advances to BTCH-002');
assert(batchCand2.name === 'Batch-002', '2.18 Next candidate name is Batch-002');

const createdBatch2 = createBatch({
  batchId: batchCand2.batchId,
  batchCode: batchCand2.batchCode,
  name: batchCand2.name,
  qrCode: batchCand2.qrCode,
  programId: TBS_PROGRAM_ID,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  clone: 'PB 260',
  initialQty: 0,
  availableQty: 0,
  statusMaster: BATCH_MASTER_STATUS.ACTIVE,
  status: BATCH_STATUS.CREATED
}, USER_ASB_TBS);
assert(getAllBatches().length === 2, '2.19 Master Batch now has 2 records (BTCH-001 & BTCH-002)');


console.log('\n--- SCENARIO 3: USED RECORD DELETE PROTECTION (SOFT DELETE & HISTORY INTEGRITY) ---');
// 3.1 Simulate Mantri Seeding Transaction referencing BED-001 & BTCH-001
const mockTransaction = [{
  id: 'TX-SEED-001',
  batchId: batch1Again.id,
  batchCode: batch1Again.batchCode,
  bedenganId: bed1Again.bedenganId,
  bedenganCode: bed1Again.bedenganCode,
  programId: TBS_PROGRAM_ID,
  totalSeeded: 500,
  createdAt: new Date().toISOString()
}];
storage.set('seeding_transactions', mockTransaction);

// Verify reference detection
assert(isBedenganUsedInTransactions(bed1Again.bedenganId, bed1Again.bedenganCode) === true, '3.1 isBedenganUsedInTransactions correctly returns true for BED-001');
assert(isBatchUsedInTransactions(batch1Again.id, batch1Again.batchCode) === true, '3.2 isBatchUsedInTransactions correctly returns true for BTCH-001');

// 3.2 Try deleting used Bedengan BED-001
const bedDeleteResult = deleteBedengan(bed1Again.bedenganId, USER_ASB_TBS);
assert(bedDeleteResult.success === true && bedDeleteResult.softDeleted === true, '3.3 Used Bedengan hard-delete is rejected; Soft-deleted to INACTIVE');

const checkBed1 = getBedenganById(bed1Again.bedenganId);
assert(checkBed1 !== null, '3.4 Bedengan record still exists in storage');
assert(checkBed1.status === BEDENGAN_STATUS.INACTIVE, '3.5 Bedengan status is INACTIVE (preserves transaction history)');

// 3.3 Try deleting used Batch BTCH-001
const batchDeleteResult = deleteBatch(batch1Again.id, USER_ASB_TBS);
assert(batchDeleteResult.success === true && batchDeleteResult.softDeleted === true, '3.6 Used Batch hard-delete is rejected; Soft-deleted to INACTIVE');

const checkBatch1 = getBatchById(batch1Again.id);
assert(checkBatch1 !== null, '3.7 Batch record still exists in storage');
assert(checkBatch1.statusMaster === BATCH_MASTER_STATUS.INACTIVE && checkBatch1.status === BATCH_STATUS.INACTIVE, '3.8 Batch statusMaster is INACTIVE (preserves transaction history)');

// 3.4 Transaction still resolves Bedengan & Batch correctly
assert(getBedenganById(mockTransaction[0].bedenganId).bedenganCode === 'BED-001', '3.9 Transaction query still resolves bedenganCode BED-001');
assert(getBatchById(mockTransaction[0].batchId).batchCode === 'BTCH-001', '3.10 Transaction query still resolves batchCode BTCH-001');


console.log('\n--- SCENARIO 4: CROSS-ESTATE ISOLATION & PERMISSION ---');
// 4.1 ASB APM creates Bedengan & Batch in APM Estate
const apmBedCand = getNextBedenganCandidate(APM_PROGRAM_ID, 'EST-APM', 'DIV-APM-02');
const apmBed = createBedengan({
  bedenganId: apmBedCand.bedenganId,
  bedenganCode: apmBedCand.bedenganCode,
  name: apmBedCand.name,
  qrCode: apmBedCand.qrCode,
  programId: APM_PROGRAM_ID,
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  capacity: 800,
  status: BEDENGAN_STATUS.AVAILABLE
}, USER_ASB_APM);

const apmBatchCand = getNextBatchCandidate(APM_PROGRAM_ID, 'EST-APM', 'DIV-APM-02');
const apmBatch = createBatch({
  batchId: apmBatchCand.batchId,
  batchCode: apmBatchCand.batchCode,
  name: apmBatchCand.name,
  qrCode: apmBatchCand.qrCode,
  programId: APM_PROGRAM_ID,
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  clone: 'RRIC 100',
  initialQty: 0,
  availableQty: 0,
  statusMaster: BATCH_MASTER_STATUS.ACTIVE,
  status: BATCH_STATUS.CREATED
}, USER_ASB_APM);

assert(apmBed.estateId === 'EST-APM', '4.1 APM Bedengan created in EST-APM');
assert(apmBatch.estateId === 'EST-APM', '4.2 APM Batch created in EST-APM');

// 4.2 Cross-Estate Mutation Guard: ASB TBS trying to edit/delete APM data is REJECTED
let tbsEditApmError = null;
try {
  updateBedengan(apmBed.bedenganId, { capacity: 2000 }, USER_ASB_TBS);
} catch (e) {
  tbsEditApmError = e.message;
}
assert(tbsEditApmError !== null && tbsEditApmError.includes('Akses ditolak'), '4.3 ASB TBS editing APM Bedengan is BLOCKED');

let tbsDeleteApmError = null;
try {
  deleteBatch(apmBatch.id, USER_ASB_TBS);
} catch (e) {
  tbsDeleteApmError = e.message;
}
assert(tbsDeleteApmError !== null && tbsDeleteApmError.includes('Akses ditolak'), '4.4 ASB TBS deleting APM Batch is BLOCKED');

// 4.3 Role Guard: Mantri trying to edit/delete master data is REJECTED
let mantriBedError = null;
try {
  deleteBedengan(createdBed2.bedenganId, USER_MANTRI_TBS);
} catch (e) {
  mantriBedError = e.message;
}
assert(mantriBedError !== null && mantriBedError.includes('Hanya role ASISTEN_BIBITAN'), '4.5 Mantri deleting Bedengan is BLOCKED');

let mantriBatchError = null;
try {
  deleteBatch(createdBatch2.id, USER_MANTRI_TBS);
} catch (e) {
  mantriBatchError = e.message;
}
assert(mantriBatchError !== null && mantriBatchError.includes('Hanya role ASISTEN_BIBITAN'), '4.6 Mantri deleting Batch is BLOCKED');

console.log('\n========================================================================');
console.log(`INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
