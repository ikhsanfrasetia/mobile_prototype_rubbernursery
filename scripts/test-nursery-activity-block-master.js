/**
 * scripts/test-nursery-activity-block-master.js
 * 
 * Test Suite: Nursery Activity + Block Master Integration
 * Memvalidasi migrasi modul pemeliharaan (nursery-activity.js) ke Block Master resmi (block-master.js).
 */

import {
  MASTER_AKTIVITAS,
  MASTER_PROGRAM_PEMBIBITAN,
  MASTER_LOKASI_BLOK,
  getBlocksForNurseryActivity,
  resolveLokasiBlok,
  getConfirmedCfnaForActivity,
  getVisibleMaintenanceRecords,
  filterMaintenanceRecordsByQuery
} from '../js/modules/maintenance/nursery-activity.js';

import {
  BLOCK_MASTER,
  BLOCK_STATUS,
  getAllBlocks,
  getActiveBlocks,
  getBlockById,
  getBlockByCode,
  getBlocksByEstate,
  getBlocksByDivision,
  resolveBlock
} from '../js/data/block-master.js';

import { KLON_MASTER, getActiveKlons, getKlonById } from '../js/data/klon-master.js';
import { storage } from '../js/core/storage.js';
import { applyTransactionActor } from '../js/core/transaction-actor.js';
import { getCurrentUserContext, resolveUserContext } from '../js/core/user-context.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== STARTING NURSERY ACTIVITY + BLOCK MASTER INTEGRATION TEST SUITE ===\n');

// --------------------------------------------------
// SECTION 1: MASTER LOAD & DEPRECATION OF MASTER_LOKASI_BLOK
// --------------------------------------------------
console.log('--- SECTION 1: Master Load & Legacy Array Deprecation ---');

assert(Array.isArray(BLOCK_MASTER) && BLOCK_MASTER.length === 40, 'TEST 1: Block Master loaded successfully with 40 canonical records');
assert(Array.isArray(MASTER_LOKASI_BLOK) && MASTER_LOKASI_BLOK.length === 0, 'TEST 2: MASTER_LOKASI_BLOK is deprecated/empty and not used in production logic');
assert(typeof getBlocksForNurseryActivity === 'function', 'TEST 3: getBlocksForNurseryActivity is exported as helper function');
assert(typeof resolveLokasiBlok === 'function', 'TEST 4: resolveLokasiBlok is exported as compatibility helper');

// --------------------------------------------------
// SECTION 2: CONTEXT-AWARE BLOCK SELECTION & DIVISION INTEGRATION
// --------------------------------------------------
console.log('\n--- SECTION 2: Context-Aware Block Selection & Division Integration ---');

// Case A: User in Division I Tanah Besih (DIV-001)
const userDiv1 = {
  id: 'USER-DIV1',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I',
  scopeType: 'DIVISION'
};
const blocksDiv1 = getBlocksForNurseryActivity(userDiv1);
assert(blocksDiv1.length === 10, `TEST 5: DIV-001 user receives exactly 10 blocks (got ${blocksDiv1.length})`);
assert(blocksDiv1.every(b => b.divisionCode === 'DIV-001' && b.estateCode === 'EST-TBS'), 'TEST 6: All DIV-001 blocks belong to DIV-001 & EST-TBS');

// Case B: User in Division II Aek Pamingke (DIV-APM-02)
const userApmDiv2 = {
  id: 'USER-APM2',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-02',
  divisionName: 'Divisi II',
  scopeType: 'DIVISION'
};
const blocksApmDiv2 = getBlocksForNurseryActivity(userApmDiv2);
assert(blocksApmDiv2.length === 10, `TEST 7: DIV-APM-02 user receives 10 blocks (got ${blocksApmDiv2.length})`);
assert(blocksApmDiv2.every(b => b.divisionCode === 'DIV-APM-02' && b.estateCode === 'EST-APM'), 'TEST 8: All DIV-APM-02 blocks belong to DIV-APM-02 & EST-APM');

// Case C: User in Estate Level (EST-TBS) without division (e.g. Pengurus/Askep)
const userEstate = {
  id: 'USER-EST1',
  role: 'PENGURUS',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  scopeType: 'ESTATE'
};
const blocksEstate = getBlocksForNurseryActivity(userEstate);
assert(blocksEstate.length === 20, `TEST 9: EST-TBS estate user receives 20 blocks across divisions (got ${blocksEstate.length})`);

// Case D: General context fallback
const generalBlocks = getBlocksForNurseryActivity(null);
assert(generalBlocks.length === 40, `TEST 10: General user without context receives all 40 active blocks (got ${generalBlocks.length})`);

// --------------------------------------------------
// SECTION 3: BLOCK IDENTITY (block_id vs block_code)
// --------------------------------------------------
console.log('\n--- SECTION 3: Block Identity Verification ---');

const sampleBlock = getBlockById('BLK-001');
assert(sampleBlock !== null, 'TEST 11: getBlockById returns canonical block BLK-001');
assert(sampleBlock.id === 'BLK-001', 'TEST 12: block_id is the primary unique identifier');
assert(sampleBlock.blockCode === '001/91', 'TEST 13: block_code is the display/business code');
assert(sampleBlock.divisionCode === 'DIV-001', 'TEST 14: Division code is present on Block Master');
assert(typeof sampleBlock.maturedArea === 'number' && typeof sampleBlock.immatureArea === 'number', 'TEST 15: Area measurements (HA) exist on master record');

// --------------------------------------------------
// SECTION 4: CLONE MASTER REFERENCE INTEGRATION
// --------------------------------------------------
console.log('\n--- SECTION 4: Clone Master Reference Validation ---');

const canonicalActiveClones = getActiveKlons().map(k => (k.canonicalName || k.name).toUpperCase());
const allBlockClones = [...new Set(BLOCK_MASTER.map(b => b.cloneName.toUpperCase()))];
const allClonesValid = allBlockClones.every(c => canonicalActiveClones.includes(c));

assert(allClonesValid, `TEST 16: All ${allBlockClones.length} unique clones used in Block Master exist in Clone Master`);
assert(sampleBlock.cloneName === 'PC 10', 'TEST 17: Sample block BLK-001 correctly references clone PC 10');

// --------------------------------------------------
// SECTION 5: NEW TRANSACTION RECORD CREATION WITH BLOCK MASTER
// --------------------------------------------------
console.log('\n--- SECTION 5: Transaction Record Structure with Block Master ---');

let testRecord = {
  id: `ACT-TEST-${Date.now()}`,
  docNo: 'ACT/NUR/2026/TEST-01',
  aktivitas: MASTER_AKTIVITAS[0],
  program: MASTER_PROGRAM_PEMBIBITAN[0],
  lokasiBlok: {
    blockId: sampleBlock.id,
    blockCode: sampleBlock.blockCode,
    blockName: sampleBlock.blockName,
    divisionCode: sampleBlock.divisionCode,
    divisionName: sampleBlock.divisionName,
    estateCode: sampleBlock.estateCode,
    estateName: sampleBlock.estateName,
    cloneName: sampleBlock.cloneName,
    maturedArea: sampleBlock.maturedArea,
    immatureArea: sampleBlock.immatureArea,
    luas: 40.0,
    luasHa: 40.0,
    blok: sampleBlock.blockName
  },
  pekerja: [],
  createdAt: new Date().toISOString()
};
testRecord = applyTransactionActor(testRecord, 'CREATE', userDiv1);

assert(testRecord.lokasiBlok.blockId === 'BLK-001', 'TEST 18: New transaction contains blockId');
assert(testRecord.lokasiBlok.blockCode === '001/91', 'TEST 19: New transaction contains blockCode');
assert(testRecord.lokasiBlok.divisionCode === 'DIV-001', 'TEST 20: New transaction contains divisionCode');
assert(testRecord.lokasiBlok.estateCode === 'EST-TBS', 'TEST 21: New transaction contains estateCode');
assert(testRecord.lokasiBlok.cloneName === 'PC 10', 'TEST 22: New transaction contains cloneName');
assert(testRecord.lokasiBlok.blok === 'Block 001/91', 'TEST 23: New transaction provides legacy fallback alias .blok');

// --------------------------------------------------
// SECTION 6: LEGACY RECORD COMPATIBILITY
// --------------------------------------------------
console.log('\n--- SECTION 6: Legacy Record Compatibility & Resolving ---');

// Legacy record from old MASTER_LOKASI_BLOK
let legacyRecord = {
  id: 'ACT-LEGACY-001',
  docNo: 'ACT/NUR/2026/01',
  aktivitas: MASTER_AKTIVITAS[9], // Penyiraman
  lokasiBlok: { blok: 'Block 031/04', luas: 39.68 },
  createdAt: '2026-01-15T08:00:00.000Z'
};
legacyRecord = applyTransactionActor(legacyRecord, 'CREATE', userDiv1);

const resolvedLegacy = resolveLokasiBlok(legacyRecord.lokasiBlok);
assert(resolvedLegacy !== null, 'TEST 24: resolveLokasiBlok resolves legacy object without throwing');
assert(resolvedLegacy.blok === 'Block 031/04', 'TEST 25: resolveLokasiBlok preserves legacy display string');
assert(resolvedLegacy.luas === 39.68, 'TEST 26: resolveLokasiBlok preserves legacy area');

const resolvedNew = resolveLokasiBlok(testRecord.lokasiBlok);
assert(resolvedNew.blockId === 'BLK-001', 'TEST 27: resolveLokasiBlok correctly handles canonical blockId');
assert(resolvedNew.divisionCode === 'DIV-001', 'TEST 28: resolveLokasiBlok attaches Division FK');

// --------------------------------------------------
// SECTION 7: QUERY FILTERING COMPATIBILITY
// --------------------------------------------------
console.log('\n--- SECTION 7: Query Filtering Compatibility ---');

const mixedRecords = [testRecord, legacyRecord];
const filterByBlockCode = filterMaintenanceRecordsByQuery(mixedRecords, '001/91', userDiv1);
assert(filterByBlockCode.length === 1 && filterByBlockCode[0].id === testRecord.id, 'TEST 29: Filter query matches canonical block code');

const filterByLegacyBlok = filterMaintenanceRecordsByQuery(mixedRecords, '031/04', userDiv1);
assert(filterByLegacyBlok.length === 1 && filterByLegacyBlok[0].id === legacyRecord.id, 'TEST 30: Filter query matches legacy block string');

const filterByClone = filterMaintenanceRecordsByQuery(mixedRecords, 'PC 10', userDiv1);
assert(filterByClone.length === 1 && filterByClone[0].id === testRecord.id, 'TEST 31: Filter query matches canonical clone name');

// --------------------------------------------------
// FINAL SUMMARY
// --------------------------------------------------
console.log('\n==================================================');
console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
}

export { passed, failed };
