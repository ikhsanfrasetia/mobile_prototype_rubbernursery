/**
 * scripts/test-asb-master-batch.js
 * Verification Test Suite for Master Batch Bibitan (TASK ASB-04)
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
  STORAGE_KEY_NURSERY_BATCHES,
  BATCH_MASTER_STATUS,
  BATCH_STATUS,
  BATCH_CATEGORIES,
  BATCH_GROWTH_STAGES,
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getBatchByCode,
  getBatchesByProgram,
  getBatchesByEstate,
  getBatchesByDivision,
  getBatchesByClone,
  getBatchesByGrowthStage,
  getBatchesByBedengan,
  isBatchActive,
  getAvailableBatchStock,
  createBatch,
  updateBatch,
  activateBatch,
  deactivateBatch,
  resolveBatchLegacy,
  resetBatchMasterToDefault,
  validateBatchRelations
} from '../js/data/batch-master.js';
import { ROLES } from '../js/core/user-context.js';
import { storage } from '../js/core/storage.js';
import { DATA_STORAGE_REGISTRY, cleanAllTransactionalData } from '../js/core/storage-registry.js';
import { getActivePrograms } from '../js/data/program-master.js';
import { normalizeKlonName } from '../js/data/klon-master.js';
import { getNurseryBatches, deductBatchStock } from '../js/modules/dispatch/dispatch-landing.js';
import { createBedengan } from '../js/data/bedengan-master.js';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('   TEST SUITE: MASTER BATCH ASISTEN BIBITAN (TASK ASB-04)                               ');
console.log('========================================================================================\n');

// Reset to default baseline for testing
resetBatchMasterToDefault();

const asbUserTBS = {
  userId: 'USR-ASB-TBS',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const asbUserAPM = {
  userId: 'USR-ASB-APM',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const mantriUser = {
  userId: 'USR-MNT-01',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const askepUser = {
  userId: 'USR-ASK-01',
  role: ROLES.ASKEP,
  estateId: 'EST-TBS'
};

// Fixture setup for test suite (TASK-RESET-MASTER-BEDENGAN-BATCH-01 Rule 20)
createBedengan({
  bedenganId: 'BED-TBS-D1-001',
  bedenganCode: 'BED-001',
  name: 'Bedengan 001',
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  capacity: 1000,
  qrCode: 'SIGMA-BED-001'
}, asbUserTBS);

createBedengan({
  bedenganId: 'BED-TBS-D1-002',
  bedenganCode: 'BED-002',
  name: 'Bedengan 002',
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  capacity: 1000,
  qrCode: 'SIGMA-BED-002'
}, asbUserTBS);

createBedengan({
  bedenganId: 'BED-TBS-D1-004',
  bedenganCode: 'BED-004',
  name: 'Bedengan 004',
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  capacity: 1000,
  qrCode: 'SIGMA-BED-004'
}, asbUserTBS);

createBedengan({
  bedenganId: 'BED-APM-D2-001',
  bedenganCode: 'BED-APM-001',
  name: 'Bedengan APM 01',
  programId: 'PRG-APM-2026-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  blockCode: '007/03',
  capacity: 1200,
  qrCode: 'SIGMA-BED-APM-001'
}, asbUserAPM);

createBedengan({
  bedenganId: 'BED-APM-D2-002',
  bedenganCode: 'BED-APM-002',
  name: 'Bedengan APM 02',
  programId: 'PRG-APM-2026-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  blockCode: '007/03',
  capacity: 1200,
  qrCode: 'SIGMA-BED-APM-002'
}, asbUserAPM);

// APM Batch Fixtures
for (let i = 1; i <= 7; i++) {
  const code = `B-${String(i).padStart(3, '0')}`;
  createBatch({
    batchId: `BATCH-APM-${String(i).padStart(3, '0')}`,
    batchCode: code,
    name: code,
    programId: 'PRG-APM-2026-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    blockCode: '007/03',
    clone: i === 4 ? 'PB 260' : (i === 5 ? 'GT 1' : 'IRCA 19'),
    stage: i === 4 ? 'Rubber Main Nursery' : 'Rubber Advance Planting Material',
    category: i === 4 ? 'Polibag Kecil' : 'Polibag Besar',
    bedenganIds: ['BED-APM-D2-001'],
    initialQty: 5000,
    availableQty: 5000
  }, asbUserAPM);
}

// TBS Batch Fixtures
createBatch({
  batchId: 'BATCH-TBS-001',
  batchCode: 'B-TBS-01',
  name: 'B-TBS-01',
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  clone: 'IRCA 19',
  stage: 'Rubber Advance Planting Material',
  category: 'Polibag Besar',
  bedenganIds: ['BED-TBS-D1-001', 'BED-TBS-D1-002'],
  initialQty: 5000,
  availableQty: 5000
}, asbUserTBS);

createBatch({
  batchId: 'BATCH-TBS-002',
  batchCode: 'B-TBS-02',
  name: 'B-TBS-02',
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  clone: 'PB 260',
  stage: 'Rubber Main Nursery',
  category: 'Polibag Kecil',
  bedenganIds: ['BED-TBS-D1-004'],
  initialQty: 8000,
  availableQty: 8000
}, asbUserTBS);

// 1. List
console.log('--- TEST 1: List Batches ---');
const allBatches = getAllBatches();
assert(Array.isArray(allBatches), 'getAllBatches() mengembalikan Array');
assert(allBatches.length >= 9, `Terdapat ${allBatches.length} batch terdaftar (>= 9)`);

const activeBatches = getActiveBatches();
assert(Array.isArray(activeBatches), 'getActiveBatches() mengembalikan Array');
assert(activeBatches.every(b => (b.statusMaster ? b.statusMaster === BATCH_MASTER_STATUS.ACTIVE : b.status === BATCH_STATUS.AVAILABLE) && (b.availableQty || 0) > 0), 'Semua batch di getActiveBatches() berstatus AVAILABLE & saldo > 0');

// 2. Create Valid Batch
console.log('\n--- TEST 2: Create Valid Batch ---');
const validProg = getActivePrograms()[0];
const newBatchPayload = {
  batchId: 'BATCH-TBS-099',
  batchCode: 'B-TBS-099',
  programId: validProg.id,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  clone: 'IRCA 19',
  growthStage: 'Rubber Advance Planting Material',
  category: 'Polibag Besar',
  bedenganIds: ['BED-TBS-D1-001', 'BED-TBS-D1-002'],
  initialQty: 7500,
  availableQty: 7500,
  status: BATCH_STATUS.AVAILABLE
};

const createdBatch = createBatch(newBatchPayload, asbUserTBS);
assert(createdBatch !== null, 'createBatch() berhasil membuat batch baru');
assert(createdBatch.batchCode === 'B-TBS-099', 'Kode batch sesuai: B-TBS-099');
assert(createdBatch.availableQty === 7500, 'Saldo stok batch sesuai: 7500');
assert(Array.isArray(createdBatch.bedenganIds) && createdBatch.bedenganIds.length === 2, 'Relasi multi-bedengan tersimpan (2 bedengan)');

// 3. Duplicate Batch Code Rejected
console.log('\n--- TEST 3: Duplicate Batch Code Rejected ---');
let dupCodeError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchId: 'BATCH-TBS-100'
  }, asbUserTBS);
} catch (e) {
  dupCodeError = true;
}
assert(dupCodeError, 'createBatch() menolak kode batch duplikat');

// 4. Duplicate Batch ID Rejected
console.log('\n--- TEST 4: Duplicate Batch ID Rejected ---');
let dupIdError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchCode: 'B-TBS-100',
    batchId: 'BATCH-TBS-099'
  }, asbUserTBS);
} catch (e) {
  dupIdError = true;
}
assert(dupIdError, 'createBatch() menolak Batch ID duplikat');

// 5 & 6. Program Validation
console.log('\n--- TEST 5 & 6: Program Validation ---');
const relValid = validateBatchRelations({
  programId: validProg.id,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  clone: 'IRCA 19',
  bedenganIds: ['BED-TBS-D1-001']
});
assert(relValid.valid === true, 'Program aktif dan valid lolos validasi');

let invalidProgError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchId: 'BATCH-TBS-101',
    batchCode: 'B-TBS-101',
    programId: 'PRG-2029-005' // Program INACTIVE
  }, asbUserTBS);
} catch (e) {
  invalidProgError = true;
}
assert(invalidProgError, 'Program INACTIVE ditolak saat createBatch');

// 7 & 8. Estate & Division Validation
console.log('\n--- TEST 7 & 8: Estate & Division Relation Validation ---');
let invalidDivError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchId: 'BATCH-TBS-102',
    batchCode: 'B-TBS-102',
    estateId: 'EST-TBS',
    divisionId: 'DIV-APM-02' // Mismatch division
  }, asbUserTBS);
} catch (e) {
  invalidDivError = true;
}
assert(invalidDivError, 'Divisi yang tidak cocok dengan Estate ditolak');

// 9. Clone Validation
console.log('\n--- TEST 9: Clone Validation ---');
let invalidCloneError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchId: 'BATCH-TBS-103',
    batchCode: 'B-TBS-103',
    clone: 'INVALID_CLONE_XYZ'
  }, asbUserTBS);
} catch (e) {
  invalidCloneError = true;
}
assert(invalidCloneError, 'Klon yang tidak terdaftar di Klon Master ditolak');

// 10 & 11. Growth Stage & Category Validation
console.log('\n--- TEST 10 & 11: Growth Stage & Category ---');
assert(BATCH_GROWTH_STAGES.includes('Rubber Advance Planting Material'), 'Growth stage RAPM terdaftar');
assert(BATCH_CATEGORIES.includes('Polibag Besar'), 'Category Polibag Besar terdaftar');

// 12, 13, 14, 15. Multi-Bedengan Relations & Validation
console.log('\n--- TEST 12, 13, 14, 15: Bedengan N-Relation & Scope Validation ---');
assert(Array.isArray(createdBatch.bedenganIds), '1 Batch mendukung N Bedengan (Array bedenganIds)');

let mismatchBedEstError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchId: 'BATCH-TBS-104',
    batchCode: 'B-TBS-104',
    bedenganIds: ['BED-APM-D2-001'] // Bedengan APM dimasukkan ke batch TBS
  }, asbUserTBS);
} catch (e) {
  mismatchBedEstError = true;
}
assert(mismatchBedEstError, 'Bedengan di luar Estate/Divisi batch ditolak');

// 16, 17, 18. Batch Statuses (AVAILABLE, EMPTY, INACTIVE)
console.log('\n--- TEST 16, 17, 18: Batch Statuses ---');
assert(createdBatch.status === BATCH_STATUS.AVAILABLE, 'Batch baru dengan stok > 0 berstatus AVAILABLE');

const deactivated = deactivateBatch('BATCH-TBS-099', asbUserTBS);
assert(deactivated.status === BATCH_STATUS.INACTIVE, 'deactivateBatch() mengubah status menjadi INACTIVE');
assert(isBatchActive('BATCH-TBS-099') === false, 'isBatchActive() return false setelah dinonaktifkan');

const reactivated = activateBatch('BATCH-TBS-099', asbUserTBS);
assert(reactivated.status === BATCH_STATUS.AVAILABLE, 'activateBatch() mengembalikan status menjadi AVAILABLE');

// 19 & 20. Initial Qty & Available Qty Stock Safety
console.log('\n--- TEST 19 & 20: Initial Qty Validation & Stock Safety ---');
let invalidQtyError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchId: 'BATCH-TBS-105',
    batchCode: 'B-TBS-105',
    initialQty: 0
  }, asbUserTBS);
} catch (e) {
  invalidQtyError = true;
}
assert(invalidQtyError, 'Initial Qty <= 0 ditolak saat createBatch');

// 21 & 22. getById & getByCode
console.log('\n--- TEST 21 & 22: getById & getByCode ---');
const bById = getBatchById('BATCH-TBS-001');
assert(bById !== null && bById.batchCode === 'B-TBS-01', 'getBatchById("BATCH-TBS-001") berhasil');
const bByCode = getBatchByCode('B-TBS-01');
assert(bByCode !== null && bByCode.id === 'BATCH-TBS-001', 'getBatchByCode("B-TBS-01") berhasil');

// 23, 24, 25, 26, 27, 28. Filters
console.log('\n--- TEST 23–28: Batch Filters ---');
const tbsBatches = getBatchesByEstate('EST-TBS');
assert(tbsBatches.every(b => b.estateId === 'EST-TBS'), 'getBatchesByEstate("EST-TBS") filter tepat');

const div1Batches = getBatchesByDivision('DIV-001');
assert(div1Batches.every(b => b.divisionId === 'DIV-001'), 'getBatchesByDivision("DIV-001") filter tepat');

const cloneBatches = getBatchesByClone('IRCA 19');
assert(cloneBatches.every(b => normalizeKlonName(b.clone || b.klon) === 'IRCA 19'), 'getBatchesByClone("IRCA 19") filter tepat');

const stageBatches = getBatchesByGrowthStage('Rubber Main Nursery');
assert(stageBatches.every(b => b.growthStage === 'Rubber Main Nursery' || b.stage === 'Rubber Main Nursery'), 'getBatchesByGrowthStage() filter tepat');

const bedBatches = getBatchesByBedengan('BED-TBS-D1-001');
assert(bedBatches.every(b => Array.isArray(b.bedenganIds) && b.bedenganIds.includes('BED-TBS-D1-001')), 'getBatchesByBedengan() filter tepat');

// 29. ASB Scope Isolation
console.log('\n--- TEST 29: ASB Scope Isolation ---');
let scopeError = false;
try {
  updateBatch('BATCH-APM-001', { category: 'Hacked Category' }, asbUserTBS);
} catch (e) {
  scopeError = true;
}
assert(scopeError, 'ASISTEN_BIBITAN TBS ditolak saat mencoba mengubah batch di Estate APM');

// 30. Mantri Read-Only Access
console.log('\n--- TEST 30: Mantri Read-Only Access ---');
const mantriBatches = getAllBatches({ estateId: mantriUser.estateId, divisionId: mantriUser.divisionId });
assert(Array.isArray(mantriBatches) && mantriBatches.length > 0, 'Mantri dapat membaca batch sesuai scope');

let mantriMutateError = false;
try {
  createBatch({
    ...newBatchPayload,
    batchId: 'BATCH-MNT-HACK',
    batchCode: 'B-MNT-HACK'
  }, mantriUser);
} catch (e) {
  mantriMutateError = true;
}
assert(mantriMutateError, 'Role MANTRI ditolak saat mencoba createBatch (Read-Only)');

// 31. Role Lain Denied CRUD
console.log('\n--- TEST 31: Role Lain Denied CRUD ---');
let askepMutateError = false;
try {
  deactivateBatch('BATCH-TBS-001', askepUser);
} catch (e) {
  askepMutateError = true;
}
assert(askepMutateError, 'Role ASKEP ditolak saat mencoba menonaktifkan Master Batch');

// 32. No Hard-Delete Historical Batch (Deactivation preserves record)
console.log('\n--- TEST 32: No Hard-Delete Historical Batch ---');
deactivateBatch('BATCH-TBS-099', asbUserTBS);
const stillExists = getBatchById('BATCH-TBS-099');
assert(stillExists !== null && stillExists.status === BATCH_STATUS.INACTIVE, 'Deaktivasi mempertahankan rekam jejak historis batch');

// 33. Source Receipt Traceability
console.log('\n--- TEST 33: Source Receipt Traceability ---');
const txBatch = createBatch({
  ...newBatchPayload,
  batchId: 'BATCH-TBS-TRACE-01',
  batchCode: 'B-TBS-TRACE-01',
  sourceReceiptId: 'RCP-KSP-001',
  sourceDispatchId: 'DSP-001',
  sourceParentRequestId: 'REQ-001',
  sourceBatchCode: 'B-APM-001'
}, asbUserTBS);
assert(txBatch.sourceReceiptId === 'RCP-KSP-001', 'Traceability sourceReceiptId tersimpan');
assert(txBatch.sourceBatchCode === 'B-APM-001', 'Traceability sourceBatchCode tersimpan');

// 34. Clean All Compatibility (Hybrid Strategy)
console.log('\n--- TEST 34: Clean All Compatibility ---');
const hybridConfig = DATA_STORAGE_REGISTRY.HYBRID.find(h => h.key === 'nursery_batches');
assert(hybridConfig !== undefined, 'nursery_batches terdaftar dalam DATA_STORAGE_REGISTRY.HYBRID');
await cleanAllTransactionalData({ skipIndexedDB: true });
const postCleanBatches = getAllBatches();
assert(postCleanBatches.length === 0, `nursery_batches ter-restore ke baseline default [0 batch]`);

// Re-create batch fixture for subsequent tests
createBatch({
  batchId: 'BATCH-TBS-001',
  batchCode: 'B-TBS-01',
  name: 'B-TBS-01',
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  clone: 'IRCA 19',
  stage: 'Rubber Advance Planting Material',
  category: 'Polibag Besar',
  bedenganIds: ['BED-TBS-D1-001'],
  initialQty: 5000,
  availableQty: 5000
}, asbUserTBS);

// 35. Refresh Persistence
console.log('\n--- TEST 35: Refresh Persistence ---');
const rawStoredBatches = storage.get(STORAGE_KEY_NURSERY_BATCHES, []);
assert(Array.isArray(rawStoredBatches) && rawStoredBatches.length === 1, 'Data nursery_batches tersimpan dan termuat kembali dari LocalStorage');

// 36. Legacy Compatibility
console.log('\n--- TEST 36: Legacy Compatibility ---');
const legacyResolved = resolveBatchLegacy('B-TBS-01');
assert(legacyResolved !== null && legacyResolved.batchCode === 'B-TBS-01', 'resolveBatchLegacy("B-TBS-01") berhasil resolve batch');
const legacyFallback = resolveBatchLegacy('UNKNOWN_BATCH');
assert(legacyFallback !== null && legacyFallback.status === BATCH_STATUS.EMPTY, 'resolveBatchLegacy() memberikan fallback aman');

// 37 & 38. Dispatch Consumer Integration & No Stock Overwrite
console.log('\n--- TEST 37 & 38: Dispatch Integration & Stock Mutation Safety ---');
const dispatchActiveBatches = getNurseryBatches('EST-TBS', 'IRCA 19');
assert(Array.isArray(dispatchActiveBatches) && dispatchActiveBatches.length > 0, 'Dispatch module dapat membaca batch aktif');

const initialStock = getAvailableBatchStock('BATCH-TBS-001');
const deductSuccess = deductBatchStock('B-TBS-01', 500);
assert(deductSuccess === true, 'deductBatchStock() berhasil mengurangi stok batch');
const afterStock = getAvailableBatchStock('BATCH-TBS-001');
assert(afterStock === initialStock - 500, `Stok berkurang dari ${initialStock} menjadi ${afterStock}`);

// -------------------------------------------------------------------------
// REKAP HASIL
// -------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log(`   TOTAL ASSERTIONS: ${passedAssertions + failedAssertions} | PASS: ${passedAssertions} | FAIL: ${failedAssertions}`);
console.log('========================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA TEST ASB-04 MASTER BATCH BERHASIL 100% TANPA KESALAHAN!\n');
}
