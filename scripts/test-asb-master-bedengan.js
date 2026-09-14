/**
 * scripts/test-asb-master-bedengan.js
 * Verification Test Suite for Master Bedengan (TASK ASB-03)
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
  getBedenganByCode,
  getBedenganByQR,
  getBedenganByProgram,
  getBedenganByEstate,
  getBedenganByDivision,
  isBedenganActive,
  createBedengan,
  updateBedengan,
  activateBedengan,
  deactivateBedengan,
  resolveBedenganLegacy,
  resetBedenganMasterToDefault,
  validateBedenganRelations
} from '../js/data/bedengan-master.js';
import { ROLES } from '../js/core/user-context.js';
import { storage } from '../js/core/storage.js';
import { DATA_STORAGE_REGISTRY, cleanAllTransactionalData } from '../js/core/storage-registry.js';
import { getActivePrograms } from '../js/data/program-master.js';

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
console.log('   TEST SUITE: MASTER BEDENGAN ASISTEN BIBITAN (TASK ASB-03)                            ');
console.log('========================================================================================\n');

// Reset to baseline for clean test execution
resetBedenganMasterToDefault();

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
for (let i = 1; i <= 9; i++) {
  const code = `BED-${String(i).padStart(3, '0')}`;
  createBedengan({
    bedenganId: `BED-TBS-D1-${String(i).padStart(3, '0')}`,
    bedenganCode: code,
    name: `Bedengan ${String(i).padStart(3, '0')}`,
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockCode: '001/91',
    capacity: 1000,
    qrCode: `SIGMA-${code}`
  }, asbUserTBS);
}

const bed10 = createBedengan({
  bedenganId: 'BED-TBS-D1-010',
  bedenganCode: 'BED-010',
  name: 'Bedengan 010',
  programId: 'PRG-TBS-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockCode: '001/91',
  capacity: 1000,
  qrCode: 'SIGMA-BED-010'
}, asbUserTBS);
deactivateBedengan(bed10.bedenganId, asbUserTBS);

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

// 1. List
console.log('--- TEST 1: List Bedengan ---');
const allBeds = getAllBedengan();
assert(Array.isArray(allBeds), 'getAllBedengan() mengembalikan Array');
assert(allBeds.length >= 10, `Terdapat ${allBeds.length} bedengan terdaftar (>= 10)`);

const activeBeds = getActiveBedengan();
assert(Array.isArray(activeBeds), 'getActiveBedengan() mengembalikan Array');
assert(activeBeds.length < allBeds.length, 'getActiveBedengan() menyaring bedengan INACTIVE');
assert(!activeBeds.some(b => b.status === BEDENGAN_STATUS.INACTIVE), 'Tidak ada bedengan INACTIVE pada getActiveBedengan()');

// 2. Create Bedengan Valid
console.log('\n--- TEST 2: Create Bedengan Valid ---');
const validProg = getActivePrograms()[0];
const newBedPayload = {
  bedenganId: 'BED-TBS-D1-099',
  bedenganCode: 'BED-099',
  name: 'Bedengan Test 099',
  programId: validProg.id,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  capacity: 1500,
  qrCode: 'SIGMA-BED-099',
  status: BEDENGAN_STATUS.AVAILABLE
};

const createdBed = createBedengan(newBedPayload, asbUserTBS);
assert(createdBed !== null, 'createBedengan() berhasil membuat record baru');
assert(createdBed.bedenganCode === 'BED-099', 'Kode bedengan sesuai: BED-099');
assert(createdBed.capacity === 1500, 'Kapasitas bedengan sesuai: 1500');

// 3. Duplicate Code Rejected
console.log('\n--- TEST 3: Duplicate Code Rejected ---');
let dupCodeError = false;
try {
  createBedengan({
    ...newBedPayload,
    bedenganId: 'BED-TBS-D1-100',
    qrCode: 'SIGMA-BED-100'
  }, asbUserTBS);
} catch (e) {
  dupCodeError = true;
}
assert(dupCodeError, 'createBedengan() menolak kode bedengan duplikat');

// 4. Duplicate QR Rejected
console.log('\n--- TEST 4: Duplicate QR Rejected ---');
let dupQRError = false;
try {
  createBedengan({
    ...newBedPayload,
    bedenganId: 'BED-TBS-D1-101',
    bedenganCode: 'BED-101'
  }, asbUserTBS);
} catch (e) {
  dupQRError = true;
}
assert(dupQRError, 'createBedengan() menolak QR Code duplikat');

// 5 & 6. Program Validation
console.log('\n--- TEST 5 & 6: Program Validation ---');
const relCheckValid = validateBedenganRelations({
  programId: validProg.id,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
});
assert(relCheckValid.valid === true, 'Program aktif dan valid lolos validasi relasi');

let invalidProgError = false;
try {
  createBedengan({
    ...newBedPayload,
    bedenganId: 'BED-TBS-D1-102',
    bedenganCode: 'BED-102',
    qrCode: 'SIGMA-BED-102',
    programId: 'NON_EXISTENT_PROG'
  }, asbUserTBS);
} catch (e) {
  invalidProgError = true;
}
assert(invalidProgError, 'Program tidak valid ditolak saat createBedengan');

// 7, 8 & 9. Estate & Division Validation
console.log('\n--- TEST 7, 8 & 9: Estate & Division Relation Validation ---');
let mismatchEstDivError = false;
try {
  createBedengan({
    ...newBedPayload,
    bedenganId: 'BED-TBS-D1-103',
    bedenganCode: 'BED-103',
    qrCode: 'SIGMA-BED-103',
    estateId: 'EST-TBS',
    divisionId: 'DIV-APM-02' // Divisi Aek Pamingke di Estate Tanah Besih
  }, asbUserTBS);
} catch (e) {
  mismatchEstDivError = true;
}
assert(mismatchEstDivError, 'Divisi yang tidak sesuai dengan Estate ditolak');

// 10. Capacity Validation (> 0)
console.log('\n--- TEST 10: Capacity Validation (> 0) ---');
let invalidCapError = false;
try {
  createBedengan({
    ...newBedPayload,
    bedenganId: 'BED-TBS-D1-104',
    bedenganCode: 'BED-104',
    qrCode: 'SIGMA-BED-104',
    capacity: 0
  }, asbUserTBS);
} catch (e) {
  invalidCapError = true;
}
assert(invalidCapError, 'Kapasitas <= 0 ditolak saat createBedengan');

// 11. getById
console.log('\n--- TEST 11: getBedenganById ---');
const foundById = getBedenganById('BED-TBS-D1-001');
assert(foundById !== null && foundById.bedenganCode === 'BED-001', 'getBedenganById("BED-TBS-D1-001") berhasil menemukan bedengan');
assert(getBedenganById('FAKE_ID') === null, 'getBedenganById() return null untuk ID invalid');

// 12. getByCode
console.log('\n--- TEST 12: getBedenganByCode ---');
const foundByCode = getBedenganByCode('BED-001');
assert(foundByCode !== null && foundByCode.bedenganId === 'BED-TBS-D1-001', 'getBedenganByCode("BED-001") berhasil menemukan bedengan');
const foundByName = getBedenganByCode('Bedengan 001');
assert(foundByName !== null && foundByName.bedenganId === 'BED-TBS-D1-001', 'getBedenganByCode("Bedengan 001") fleksibel mencari by name');

// 13. getByQR
console.log('\n--- TEST 13: getBedenganByQR ---');
const foundByQR = getBedenganByQR('SIGMA-BED-001');
assert(foundByQR !== null && foundByQR.bedenganId === 'BED-TBS-D1-001', 'getBedenganByQR("SIGMA-BED-001") berhasil resolve bedengan');

// 14, 15 & 16. Filters
console.log('\n--- TEST 14, 15 & 16: Filters (Program, Estate, Division) ---');
const tbsBeds = getBedenganByEstate('EST-TBS');
assert(tbsBeds.every(b => b.estateId === 'EST-TBS'), 'getBedenganByEstate("EST-TBS") memfilter seluruh bedengan Tanah Besih');

const apmBeds = getBedenganByEstate('EST-APM');
assert(apmBeds.every(b => b.estateId === 'EST-APM'), 'getBedenganByEstate("EST-APM") memfilter seluruh bedengan Aek Pamingke');

const div1Beds = getBedenganByDivision('DIV-001');
assert(div1Beds.every(b => b.divisionId === 'DIV-001'), 'getBedenganByDivision("DIV-001") memfilter divisi');

const progBeds = getBedenganByProgram('PRG-2026-001');
assert(progBeds.every(b => b.programId === 'PRG-2026-001'), 'getBedenganByProgram() memfilter program');

// 17 & 18. Status & Deactivate
console.log('\n--- TEST 17 & 18: Status Active & Deactivate ---');
assert(isBedenganActive('BED-TBS-D1-001') === true, 'isBedenganActive("BED-TBS-D1-001") return true untuk AVAILABLE');
const deactivated = deactivateBedengan('BED-TBS-D1-099', asbUserTBS);
assert(deactivated.status === BEDENGAN_STATUS.INACTIVE, 'deactivateBedengan() mengubah status menjadi INACTIVE');
assert(isBedenganActive('BED-TBS-D1-099') === false, 'isBedenganActive() return false setelah dinonaktifkan');

// 19. Inactive tidak muncul di active list
console.log('\n--- TEST 19: Inactive Excluded from Active List ---');
const activeAfterDeact = getActiveBedengan();
assert(!activeAfterDeact.some(b => b.bedenganId === 'BED-TBS-D1-099'), 'Bedengan nonaktif tidak muncul dalam getActiveBedengan()');

// Re-activate
const reactivated = activateBedengan('BED-TBS-D1-099', asbUserTBS);
assert(reactivated.status === BEDENGAN_STATUS.AVAILABLE, 'activateBedengan() mengembalikan status menjadi AVAILABLE');

// 20. Role ASB Authorization
console.log('\n--- TEST 20: Role ASB Authorization ---');
const updated = updateBedengan('BED-TBS-D1-099', { name: 'Bedengan Updated Name' }, asbUserTBS);
assert(updated.name === 'Bedengan Updated Name', 'ASISTEN_BIBITAN berwenang mengupdate bedengan');

// 21. ASB Division & Estate Isolation
console.log('\n--- TEST 21: ASB Scope Isolation ---');
let scopeError = false;
try {
  // ASB TBS mencoba update bedengan di Estate APM
  updateBedengan('BED-APM-D2-001', { name: 'Hacked APM Bed' }, asbUserTBS);
} catch (e) {
  scopeError = true;
}
assert(scopeError, 'ASISTEN_BIBITAN ditolak saat mencoba mengubah bedengan di luar estate/divisi miliknya');

// 22. Mantri Read-Only Access
console.log('\n--- TEST 22: Mantri Read-Only Access ---');
const mantriActiveView = getActiveBedengan({ estateId: mantriUser.estateId, divisionId: mantriUser.divisionId });
assert(Array.isArray(mantriActiveView) && mantriActiveView.length > 0, 'Mantri dapat membaca daftar bedengan aktif sesuai scope');

let mantriMutateError = false;
try {
  createBedengan({
    bedenganId: 'BED-MNT-HACK',
    bedenganCode: 'BED-HACK',
    name: 'Bedengan Mantri Hack',
    programId: validProg.id,
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-HACK'
  }, mantriUser);
} catch (e) {
  mantriMutateError = true;
}
assert(mantriMutateError, 'Role MANTRI ditolak saat mencoba membuat Master Bedengan (Read-Only)');

// 23. Role Lain Denied
console.log('\n--- TEST 23: Role Lain Denied CRUD ---');
let askepMutateError = false;
try {
  deactivateBedengan('BED-TBS-D1-001', askepUser);
} catch (e) {
  askepMutateError = true;
}
assert(askepMutateError, 'Role ASKEP ditolak saat mencoba menonaktifkan Master Bedengan');

// 24. Clean All Data Preservation
console.log('\n--- TEST 24: Clean All Data Preservation ---');
assert(DATA_STORAGE_REGISTRY.MASTER.includes('bedengan_master'), 'bedengan_master terdaftar di DATA_STORAGE_REGISTRY.MASTER');
const preCleanBedsCount = getAllBedengan().length;
await cleanAllTransactionalData({ skipIndexedDB: true });
const postCleanBedsCount = getAllBedengan().length;
assert(preCleanBedsCount === postCleanBedsCount, `Master Bedengan tetap utuh setelah Clean All (${postCleanBedsCount} record)`);

// 25. Refresh Persistence
console.log('\n--- TEST 25: Refresh Persistence ---');
const rawStored = storage.get(STORAGE_KEY_BEDENGAN_MASTER, []);
assert(Array.isArray(rawStored) && rawStored.length === postCleanBedsCount, 'Data Master Bedengan tersimpan dan dapat dimuat kembali dari LocalStorage');

// 26. Seeding Dynamic Lookup
console.log('\n--- TEST 26: Seeding Dynamic Lookup ---');
const dynamicLookup = getBedenganByQR('SIGMA-BED-001');
assert(dynamicLookup !== null && dynamicLookup.name === 'Bedengan 001', 'Penyemaian dapat me-resolve bedengan dari QR canonical');

// 27. Legacy Compatibility
console.log('\n--- TEST 27: Legacy Compatibility ---');
const legacyResolved = resolveBedenganLegacy('Bedengan 001');
assert(legacyResolved !== null && legacyResolved.bedenganCode === 'BED-001', 'resolveBedenganLegacy("Bedengan 001") berhasil me-resolve data canonical');
const legacyFallback = resolveBedenganLegacy('UNKNOWN-BED');
assert(legacyFallback !== null && Boolean(legacyFallback.bedenganCode), 'resolveBedenganLegacy() memberikan objek fallback aman');

// -------------------------------------------------------------------------
// REKAP HASIL
// -------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log(`   TOTAL ASSERTIONS: ${passedAssertions + failedAssertions} | PASS: ${passedAssertions} | FAIL: ${failedAssertions}`);
console.log('========================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA TEST ASB-03 MASTER BEDENGAN BERHASIL 100% TANPA KESALAHAN!\n');
}
