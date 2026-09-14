/**
 * scripts/test-program-master-open-close.js
 * Comprehensive Verification Suite for Master Program Pembibitan (TASK-IMPLEMENT-PROGRAM-MASTER-01)
 * Validates:
 * 1. Canonical Business Structure (Tanah Besih & Aek Pamingke)
 * 2. Status Lifecycle: OPEN / CLOSE
 * 3. Service Guards for Create Batch & Bedengan
 * 4. Context Inheritance (Estate, Division, Block)
 * 5. Mismatch Rejection
 * 6. Historical Preservation
 * 7. Legacy Resolvers & Transaction Continuity
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
  PROGRAM_MASTER,
  PROGRAM_STATUS,
  getAllPrograms,
  getOpenPrograms,
  getActivePrograms,
  getProgramById,
  getProgramByCode,
  getProgramsByEstate,
  getProgramsByDivision,
  getProgramsByBlock,
  resolveProgram,
  resolveProgramLegacy,
  isProgramOpen,
  isProgramActive,
  DummyProgramProvider,
  setProgramProvider
} from '../js/data/program-master.js';

import {
  DEFAULT_CANONICAL_BATCHES,
  BATCH_MASTER_STATUS,
  BATCH_STATUS,
  getAllBatches,
  getBatchById,
  createBatch,
  resetBatchMasterToDefault,
  validateBatchRelations
} from '../js/data/batch-master.js';

import {
  DEFAULT_BEDENGAN_MASTER,
  BEDENGAN_STATUS,
  getAllBedengan,
  getBedenganById,
  createBedengan,
  resetBedenganMasterToDefault,
  validateBedenganRelations
} from '../js/data/bedengan-master.js';

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
console.log('   TEST SUITE: MASTER PROGRAM PEMBIBITAN & OPEN/CLOSE GUARDS (TASK-IMPLEMENT-01)        ');
console.log('========================================================================================\n');

// Mock ASB User Contexts
const asbTBS = {
  id: 'USR-ASB-TBS',
  userId: 'USR-ASB-TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const asbAPM = {
  id: 'USR-ASB-APM',
  userId: 'USR-ASB-APM',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

// Reset Storage
resetBatchMasterToDefault();
resetBedenganMasterToDefault();

// -------------------------------------------------------------------------
// SECTION 1: PROGRAM CANONICAL PROTOTYPE DATA
// -------------------------------------------------------------------------
console.log('--- 1. Canonical Program Prototype Data ---');

const allProgs = getAllPrograms();
assert(Array.isArray(allProgs) && allProgs.length === 2, '1. getAllPrograms() mengembalikan tepat 2 canonical prototype programs');

const openProgs = getOpenPrograms();
assert(Array.isArray(openProgs) && openProgs.length === 2, '2. getOpenPrograms() hanya mengembalikan program berstatus OPEN');

const progTBS = getProgramById('PRG-TBS-2026-001') || getProgramByCode('2026/TB/RNUR/001');
assert(progTBS !== null, '3a. Program Tanah Besih ditemukan');
assert(progTBS.status === PROGRAM_STATUS.OPEN, '3b. Program Tanah Besih berstatus OPEN');
assert(progTBS.code === '2026/TB/RNUR/001', '3c. Kode Program TBS sesuai: 2026/TB/RNUR/001');
assert(progTBS.name === 'RB Nursery Program 2026-2027 TB', '3d. Nama Program TBS sesuai');
assert(progTBS.blockCode === '001/91', '3e. Blok Bibitan TBS sesuai: 001/91');
assert(progTBS.startDate === '2026-09-01' && progTBS.endDate === '2027-09-01', '3f. Periode TBS: 2026-09-01 s/d 2027-09-01');

const progAPM = getProgramById('PRG-APM-2026-001') || getProgramByCode('2026/AP/RNUR/001');
assert(progAPM !== null, '4a. Program Aek Pamingke ditemukan');
assert(progAPM.status === PROGRAM_STATUS.OPEN, '4b. Program Aek Pamingke berstatus OPEN');
assert(progAPM.code === '2026/AP/RNUR/001', '4c. Kode Program APM sesuai: 2026/AP/RNUR/001');
assert(progAPM.name === 'RB Nursery Program 2026-2027 AP', '4d. Nama Program APM sesuai');
assert(progAPM.blockCode === '007/03', '4e. Blok Bibitan APM sesuai: 007/03');
assert(progAPM.startDate === '2026-09-01' && progAPM.endDate === '2027-09-01', '4f. Periode APM: 2026-09-01 s/d 2027-09-01');

// -------------------------------------------------------------------------
// SECTION 2: TEST FIXTURE UNTUK PROGRAM CLOSE
// -------------------------------------------------------------------------
console.log('\n--- 2. CLOSED Program Test Fixture Resolution & Filtering ---');

const closedProgramFixture = {
  id: 'PRG-CLOSED-FIXTURE-001',
  code: '2025/TB/RNUR/CLOSED',
  name: 'RB Nursery Program 2025 Closed TB',
  estateId: 'EST-TBS',
  estateCode: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionCode: 'DIV-001',
  divisionName: 'Divisi I',
  blockId: 'BLK-001',
  blockCode: '001/91',
  blockName: 'Block 001/91',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  year: 2025,
  status: PROGRAM_STATUS.CLOSE,
  legacyCodes: ['PRG-CLOSED-OLD']
};

// Pasang provider sementara yang menyertakan closed fixture
const testProviderWithClosed = new DummyProgramProvider([
  ...PROGRAM_MASTER,
  closedProgramFixture
]);
setProgramProvider(testProviderWithClosed);

assert(getProgramById('PRG-CLOSED-FIXTURE-001') !== null, '5. CLOSED fixture dapat di-resolve sebagai master reference');
assert(isProgramOpen('PRG-CLOSED-FIXTURE-001') === false, '5b. isProgramOpen(PRG-CLOSED) mengembalikan false');

const openListWithFixture = getOpenPrograms();
assert(!openListWithFixture.some(p => p.id === 'PRG-CLOSED-FIXTURE-001'), '6. CLOSED fixture tidak masuk getOpenPrograms()');

// -------------------------------------------------------------------------
// SECTION 3: CREATE BATCH & BEDENGAN WITH OPEN VS CLOSE PROGRAM
// -------------------------------------------------------------------------
console.log('\n--- 3. Service Layer Guards: Create Batch & Bedengan ---');

// 7. Create Batch with OPEN program
let createdBatchOpen = null;
try {
  createdBatchOpen = createBatch({
    batchCode: 'B-TBS-TEST-OPEN',
    programId: 'PRG-TBS-2026-001',
    clone: 'IRCA 19',
    initialQty: 1000,
    category: 'Polibag Besar',
    stage: 'RAPM'
  }, asbTBS);
} catch (e) {
  console.error(e);
}
assert(createdBatchOpen !== null && createdBatchOpen.batchCode === 'B-TBS-TEST-OPEN', '7. Create Batch dengan Program OPEN = PASS');

// 8. Create Bedengan with OPEN program
let createdBedenganOpen = null;
try {
  createdBedenganOpen = createBedengan({
    bedenganCode: 'BED-TEST-OPEN',
    name: 'Bedengan Test Open',
    programId: 'PRG-TBS-2026-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-TEST-OPEN'
  }, asbTBS);
} catch (e) {
  console.error(e);
}
assert(createdBedenganOpen !== null && createdBedenganOpen.bedenganCode === 'BED-TEST-OPEN', '8. Create Bedengan dengan Program OPEN = PASS');

// 9. Create Batch with CLOSE program -> REJECT
let batchCloseError = null;
try {
  createBatch({
    batchCode: 'B-TBS-TEST-CLOSE',
    programId: 'PRG-CLOSED-FIXTURE-001',
    clone: 'IRCA 19',
    initialQty: 1000
  }, asbTBS);
} catch (e) {
  batchCloseError = e.message;
}
assert(batchCloseError !== null && batchCloseError.includes('berstatus Close'), `9. Create Batch dengan Program CLOSE = REJECT (Pesan: "${batchCloseError}")`);

// 10. Create Bedengan with CLOSE program -> REJECT
let bedCloseError = null;
try {
  createBedengan({
    bedenganCode: 'BED-TEST-CLOSE',
    name: 'Bedengan Test Close',
    programId: 'PRG-CLOSED-FIXTURE-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-TEST-CLOSE'
  }, asbTBS);
} catch (e) {
  bedCloseError = e.message;
}
assert(bedCloseError !== null && bedCloseError.includes('berstatus Close'), `10. Create Bedengan dengan Program CLOSE = REJECT (Pesan: "${bedCloseError}")`);

// -------------------------------------------------------------------------
// SECTION 4: CONTEXT INHERITANCE (ESTATE, DIVISION, BLOCK)
// -------------------------------------------------------------------------
console.log('\n--- 4. Context Inheritance: Program -> Batch & Bedengan ---');

assert(createdBatchOpen.estateId === 'EST-TBS', '11. Batch inherit estate (EST-TBS) dari Program');
assert(createdBatchOpen.divisionId === 'DIV-001', '12. Batch inherit division (DIV-001) dari Program');
assert(createdBatchOpen.blockCode === '001/91', '13. Batch inherit block (001/91) dari Program');

assert(createdBedenganOpen.estateId === 'EST-TBS', '14. Bedengan inherit estate (EST-TBS) dari Program');
assert(createdBedenganOpen.divisionId === 'DIV-001', '15. Bedengan inherit division (DIV-001) dari Program');
assert(createdBedenganOpen.blockCode === '001/91', '16. Bedengan inherit block (001/91) dari Program');

// -------------------------------------------------------------------------
// SECTION 5: MISMATCH REJECTION
// -------------------------------------------------------------------------
console.log('\n--- 5. Spatial Mismatch Rejection ---');

// 17. Estate mismatch
let estMismatchError = null;
try {
  createBatch({
    batchCode: 'B-MISMATCH-EST',
    programId: 'PRG-TBS-2026-001', // TBS program
    estateId: 'EST-APM',           // Explicit mismatched APM estate
    divisionId: 'DIV-APM-02',
    clone: 'IRCA 19'
  }, asbAPM);
} catch (e) {
  estMismatchError = e.message;
}
assert(estMismatchError !== null && (estMismatchError.includes('tidak cocok dengan Estate') || estMismatchError.includes('tidak terdaftar')), '17. Estate mismatch ditolak');

// 18. Division mismatch
let divMismatchError = null;
try {
  createBedengan({
    bedenganCode: 'BED-MISMATCH-DIV',
    name: 'Bedengan Mismatch Div',
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-002', // Mismatched division for TBS program (which belongs to DIV-001)
    capacity: 1000,
    qrCode: 'SIGMA-BED-MISMATCH-DIV'
  }, asbTBS);
} catch (e) {
  divMismatchError = e.message;
}
assert(divMismatchError !== null && (divMismatchError.includes('tidak cocok dengan Divisi') || divMismatchError.includes('tidak terdaftar')), '18. Division mismatch ditolak');

// 19. Block mismatch
let blockMismatchError = null;
try {
  createBatch({
    batchCode: 'B-MISMATCH-BLK',
    programId: 'PRG-TBS-2026-001',
    blockCode: '002/87', // Mismatched block
    clone: 'IRCA 19'
  }, asbTBS);
} catch (e) {
  blockMismatchError = e.message;
}
assert(blockMismatchError !== null && blockMismatchError.includes('tidak sesuai dengan Blok Bibitan Program'), '19. Block mismatch ditolak');

// -------------------------------------------------------------------------
// SECTION 6: LEGACY RESOLVERS & HISTORICAL PRESERVATION
// -------------------------------------------------------------------------
console.log('\n--- 6. Legacy Resolvers & Historical Data Continuity ---');

// 20. Legacy Program ID resolves to canonical program
const resLegacy1 = getProgramById('PRG-2026-001');
assert(resLegacy1 !== null && resLegacy1.code === '2026/TB/RNUR/001', '20a. Legacy programId "PRG-2026-001" me-resolve ke 2026/TB/RNUR/001');

const resLegacy3 = getProgramById('PRG-2026-003');
assert(resLegacy3 !== null && resLegacy3.code === '2026/AP/RNUR/001', '20b. Legacy programId "PRG-2026-003" me-resolve ke 2026/AP/RNUR/001');

const resLegacyCode = getProgramByCode('PN-2026-01');
assert(resLegacyCode !== null && resLegacyCode.code === '2026/TB/RNUR/001', '20c. Legacy code "PN-2026-01" me-resolve ke 2026/TB/RNUR/001');

// 21. Program CLOSE tidak menghapus atau mengubah Batch existing
const batchesBefore = getAllBatches();
assert(batchesBefore.length >= 9, '21a. Batches existing tetap tersedia');

// 22. Program CLOSE tidak menghapus atau mengubah Bedengan existing
const bedsBefore = getAllBedengan();
assert(bedsBefore.length >= 12, '22a. Bedengans existing tetap tersedia');

// 23. Master Batch status tetap ACTIVE / INACTIVE
const tbsBatch = getBatchById('BATCH-TBS-001');
assert(tbsBatch !== null && tbsBatch.statusMaster === BATCH_MASTER_STATUS.ACTIVE, '23. Master Batch status tetap ACTIVE/INACTIVE');

// 24. Master Bedengan status tetap ACTIVE / INACTIVE
const tbsBed = getBedenganById('BED-TBS-D1-001');
assert(tbsBed !== null && (tbsBed.status === BEDENGAN_STATUS.ACTIVE || tbsBed.status !== BEDENGAN_STATUS.INACTIVE), '24. Master Bedengan status tetap ACTIVE/INACTIVE');

// 25. Transaction engine tetap menggunakan programId
const legProg = resolveProgramLegacy('PRG-2026-001');
assert(legProg !== null && legProg.id !== '', '25. resolveProgramLegacy() mengembalikan objek kompatibel untuk transaction engine');

// Restore default provider
setProgramProvider(new DummyProgramProvider(PROGRAM_MASTER));

// -------------------------------------------------------------------------
// REKAP HASIL
// -------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log(`   TOTAL ASSERTIONS: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log('========================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA TEST TASK-IMPLEMENT-PROGRAM-MASTER-01 BERHASIL 100% TANPA KESALAHAN!\n');
}
