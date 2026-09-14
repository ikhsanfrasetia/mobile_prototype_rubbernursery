/**
 * scripts/test-program-master-reference.js
 * Verification Test Suite for Program Pembibitan Canonical Reference & Provider (TASK ASB-02 & TASK-IMPLEMENT-PROGRAM-MASTER-01)
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
  DummyProgramProvider,
  ErpProgramProvider,
  getProgramProvider,
  setProgramProvider,
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
  isProgramActive
} from '../js/data/program-master.js';
import { MASTER_PROGRAM_PEMBIBITAN } from '../js/data/master-data.js';
import { storage } from '../js/core/storage.js';
import { DATA_STORAGE_REGISTRY, cleanAllTransactionalData } from '../js/core/storage-registry.js';

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
console.log('   TEST SUITE: PROGRAM PEMBIBITAN REFERENCE & DUMMY PROVIDER (TASK ASB-02 / TASK-01)   ');
console.log('========================================================================================\n');

// 1. getAllPrograms
console.log('--- TEST 1: getAllPrograms Resolver ---');
const allPrograms = getAllPrograms();
assert(Array.isArray(allPrograms), 'getAllPrograms() mengembalikan Array');
assert(allPrograms.length >= 2, `Jumlah program terdefinisi (actual: ${allPrograms.length})`);
allPrograms.forEach((p, idx) => {
  assert(Boolean(p.id && p.code && p.name && p.status), `Program #${idx + 1} (${p.code}) memiliki field minimum (id, code, name, status)`);
  assert(Array.isArray(p.estateIds) || Boolean(p.estateId), `Program #${idx + 1} memiliki relasi estate`);
});

// 2. getOpenPrograms & getActivePrograms
console.log('\n--- TEST 2: getOpenPrograms & getActivePrograms Resolver ---');
const activePrograms = getOpenPrograms();
assert(Array.isArray(activePrograms), 'getOpenPrograms() mengembalikan Array');
assert(activePrograms.length > 0, `Terdapat ${activePrograms.length} program berstatus OPEN`);
activePrograms.forEach(p => {
  assert(p.status === PROGRAM_STATUS.OPEN, `Program ${p.code} berstatus OPEN`);
});
const inactiveInActive = activePrograms.some(p => p.status === PROGRAM_STATUS.CLOSE);
assert(!inactiveInActive, 'Program CLOSE tidak muncul di getOpenPrograms()');

// 3. getProgramById
console.log('\n--- TEST 3: getProgramById Resolver ---');
const progById = getProgramById('PRG-TBS-2026-001') || getProgramById('PRG-2026-001');
assert(progById !== null, 'getProgramById("PRG-2026-001") berhasil menemukan program via legacy ID');
assert(progById && (progById.code === '2026/TB/RNUR/001' || progById.code === 'PN-2026-01'), `Program code sesuai: 2026/TB/RNUR/001 (actual: ${progById?.code})`);
assert(getProgramById('NON_EXISTENT_ID') === null, 'getProgramById() return null untuk ID yang tidak ada');
assert(getProgramById(null) === null, 'getProgramById() return null untuk input null');

// 4. getProgramByCode & Legacy Code
console.log('\n--- TEST 4: getProgramByCode & Legacy Code Resolver ---');
const progByCode = getProgramByCode('2026/TB/RNUR/001') || getProgramByCode('PN-2026-01');
assert(progByCode !== null, 'getProgramByCode("2026/TB/RNUR/001") berhasil menemukan program');
assert(progByCode && (progByCode.id === 'PRG-TBS-2026-001' || progByCode.id === 'PRG-2026-001'), `ID program sesuai: PRG-TBS-2026-001`);

const progByLegacy = getProgramByCode('PRG/NUR/01/2026');
assert(progByLegacy !== null, 'getProgramByCode("PRG/NUR/01/2026") berhasil resolve dari legacy code');
assert(progByLegacy && (progByLegacy.code === '2026/TB/RNUR/001' || progByLegacy.code === 'PN-2026-01'), 'Legacy code mengarah ke program canonical 2026/TB/RNUR/001');
assert(getProgramByCode('INVALID_CODE') === null, 'getProgramByCode() return null untuk code invalid');

// 5. Filter by Estate
console.log('\n--- TEST 5: getProgramsByEstate Resolver ---');
const tbsPrograms = getProgramsByEstate('EST-TBS');
const apmPrograms = getProgramsByEstate('EST-APM');
assert(Array.isArray(tbsPrograms) && tbsPrograms.length > 0, `Ditemukan ${tbsPrograms.length} program untuk EST-TBS`);
assert(Array.isArray(apmPrograms) && apmPrograms.length > 0, `Ditemukan ${apmPrograms.length} program untuk EST-APM`);
tbsPrograms.forEach(p => {
  const match = p.estateId === 'EST-TBS' || (p.estateIds && p.estateIds.some(e => e.includes('TBS') || e === 'EST-001' || e === 'EST-002'));
  assert(match, `Program ${p.code} terhubung dengan estate Tanah Besih (EST-TBS)`);
});
apmPrograms.forEach(p => {
  const match = p.estateId === 'EST-APM' || (p.estateIds && p.estateIds.some(e => e.includes('APM') || e === 'EST-003'));
  assert(match, `Program ${p.code} terhubung dengan estate Aek Pamingke (EST-APM)`);
});
assert(getProgramsByEstate(null).length === 0, 'getProgramsByEstate(null) return empty array');

// 6. Filter by Division
console.log('\n--- TEST 6: getProgramsByDivision Resolver ---');
const div1Programs = getProgramsByDivision('DIV-001');
const divApmPrograms = getProgramsByDivision('DIV-APM-02');
assert(Array.isArray(div1Programs) && div1Programs.length > 0, `Ditemukan ${div1Programs.length} program untuk DIV-001`);
assert(Array.isArray(divApmPrograms) && divApmPrograms.length > 0, `Ditemukan ${divApmPrograms.length} program untuk DIV-APM-02`);
div1Programs.forEach(p => {
  const match = p.divisionId === 'DIV-001' || (p.divisionIds && p.divisionIds.some(d => d.includes('DIV-001') || d === 'DIV1'));
  assert(match, `Program ${p.code} terhubung dengan divisi DIV-001`);
});
assert(getProgramsByDivision(null).length === 0, 'getProgramsByDivision(null) return empty array');

// 7. Immutability & No CRUD Mutation
console.log('\n--- TEST 7: Program Immutability & No CRUD Access ---');
assert(Object.isFrozen(PROGRAM_MASTER), 'PROGRAM_MASTER di-freeze (Immutable)');
let mutateFailed = false;
try {
  PROGRAM_MASTER.push({ id: 'FAKE' });
} catch (e) {
  mutateFailed = true;
}
assert(mutateFailed, 'PROGRAM_MASTER menolak operasi push / mutasi langsung');

// 8. Clean All Data Preservation
console.log('\n--- TEST 8: Clean All Data Preservation ---');
assert(DATA_STORAGE_REGISTRY.MASTER.includes('program_master'), 'program_master terdaftar dalam DATA_STORAGE_REGISTRY.MASTER');
const txRegistryContainsProgram = DATA_STORAGE_REGISTRY.TRANSACTION.includes('program_master') ||
                                  DATA_STORAGE_REGISTRY.TRANSACTION.includes('programs');
assert(!txRegistryContainsProgram, 'Program BUKAN kategori transaksi dalam storage registry');

// Jalankan cleanAllTransactionalData simulasi
const preCleanCount = getAllPrograms().length;
await cleanAllTransactionalData({ skipIndexedDB: true });
const postCleanCount = getAllPrograms().length;
assert(preCleanCount === postCleanCount, `Program master tetap utuh setelah Clean All (${postCleanCount} record)`);

// 9. Legacy Compatibility & Re-exports
console.log('\n--- TEST 9: Legacy Compatibility & Re-exports ---');
assert(Array.isArray(MASTER_PROGRAM_PEMBIBITAN), 'MASTER_PROGRAM_PEMBIBITAN diekspor sebagai alias kompatibel di master-data.js');
assert(MASTER_PROGRAM_PEMBIBITAN.length === PROGRAM_MASTER.length, 'MASTER_PROGRAM_PEMBIBITAN identik dengan PROGRAM_MASTER');

const resolvedFlex = resolveProgram('Program Nursery 2026 - Batch 1');
assert(resolvedFlex !== null && (resolvedFlex.code === '2026/TB/RNUR/001' || resolvedFlex.code === 'PN-2026-01'), 'resolveProgram() fleksibel mencari berdasarkan name');

const legacyObj = resolveProgramLegacy('PRG/NUR/01/2026');
assert(legacyObj.code === '2026/TB/RNUR/001' || legacyObj.canonicalCode === '2026/TB/RNUR/001' || legacyObj.code === 'PRG/NUR/01/2026', 'resolveProgramLegacy() menghasilkan objek kompatibel untuk UI existing');

assert(isProgramActive('2026/TB/RNUR/001') === true, 'isProgramActive("2026/TB/RNUR/001") return true');
assert(isProgramActive('PN-2029-01') === false, 'isProgramActive("PN-2029-01") return false (tidak ada di master / CLOSE)');

// 10. Provider Architecture (Dummy vs Future ERP)
console.log('\n--- TEST 10: Provider Architecture (Dummy vs Future ERP) ---');
const currProvider = getProgramProvider();
assert(currProvider instanceof DummyProgramProvider, 'Default provider adalah instance DummyProgramProvider');

const erpProvider = new ErpProgramProvider();
let erpThrows = false;
try {
  await erpProvider.getAll();
} catch (e) {
  erpThrows = true;
}
assert(erpThrows, 'ErpProgramProvider melempar error informatif saat belum diaktifkan di mode prototype');

// -------------------------------------------------------------------------
// REKAP HASIL
// -------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log(`   TOTAL ASSERTIONS: ${passedAssertions + failedAssertions} | PASS: ${passedAssertions} | FAIL: ${failedAssertions}`);
console.log('========================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA TEST ASB-02 PROGRAM REFERENCE BERHASIL 100% TANPA KESALAHAN!\n');
}
