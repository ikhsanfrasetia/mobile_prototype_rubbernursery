/**
 * scripts/test-phase9d-transaction-isolation.js
 * 
 * Phase 9D — Transaction Data Isolation & Actor Ownership Test Suite
 */

// Mock localStorage for Node environment
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
}

import {
  isTransactionOwnedByUser,
  isTransactionVisibleToUser,
  getVisibleMaintenanceRecords,
  filterMaintenanceRecordsByQuery,
  getMaintenanceRecordById,
  deleteMaintenanceRecord,
  getConfirmedCfnaForActivity,
  MASTER_AKTIVITAS
} from '../js/modules/maintenance/nursery-activity.js';

import {
  applyTransactionActor,
  resolveTransactionActor,
  AUDIT_EVENT_TYPES
} from '../js/core/transaction-actor.js';

import {
  getDemoPersonaById
} from '../js/data/demo-personas.js';

import { storage } from '../js/core/storage.js';
import { ROLES, SCOPE_TYPES } from '../js/core/user-context.js';

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

console.log('=== STARTING PHASE 9D TRANSACTION DATA ISOLATION TEST SUITE ===\n');

// Personas
const wagiman = getDemoPersonaById('TBS-MNT-001'); // MANTRI_TANAMAN, Tanah Besih
const supriono = getDemoPersonaById('APM-MNT-002'); // MANTRI_TANAMAN, Aek Pamingke
const junaidi = getDemoPersonaById('TBS-PGS-001'); // PENGURUS, Tanah Besih
const mukhsin = getDemoPersonaById('APM-PGS-002'); // PENGURUS, Aek Pamingke

// Seed test transactions
const rawTxWagiman = applyTransactionActor({
  id: 'ACT-TEST-WAGIMAN-001',
  docNo: 'ACT/TBS/2026/001',
  aktivitas: { kode: '122171', nama: 'Penyiraman' },
  program: 'PRG/NUR/01/2026',
  lokasiBlok: { blok: 'Block 031/04', luas: 39.68 },
  pekerja: [],
  allocationCode: '964009',
  allocationName: 'Penyiraman (Manual)'
}, AUDIT_EVENT_TYPES.CREATE, wagiman);

const rawTxSupriono = applyTransactionActor({
  id: 'ACT-TEST-SUPRIONO-001',
  docNo: 'ACT/APM/2026/001',
  aktivitas: { kode: '122174', nama: 'Pemupukan' },
  program: 'PRG/NUR/02/2027',
  lokasiBlok: { blok: 'Block 036G/19', luas: 0.45 },
  pekerja: [],
  allocationCode: '964006',
  allocationName: 'Pemupukan'
}, AUDIT_EVENT_TYPES.CREATE, supriono);

const rawTxLegacy = {
  id: 'ACT-LEGACY-001',
  docNo: 'ACT/OLD/2025/999',
  aktivitas: { kode: '122171', nama: 'Penyiraman' },
  program: 'PRG/NUR/01/2025',
  lokasiBlok: { blok: 'Block 008/01', luas: 29 },
  pekerja: []
};

// Populate storage for detail and delete tests
storage.set('nursery_activity_records', [rawTxWagiman, rawTxSupriono, rawTxLegacy]);

// --------------------------------------------------
// SECTION A: OWNERSHIP MODEL
// --------------------------------------------------
console.log('--- SECTION A: Ownership Model ---');

assert(rawTxWagiman.createdByUserId !== undefined, 'TEST 1: Wagiman transaction has createdByUserId');
assert(rawTxSupriono.createdByUserId !== undefined, 'TEST 2: Supriono transaction has createdByUserId');
assert(isTransactionOwnedByUser(rawTxWagiman, wagiman) === true, 'TEST 3: isTransactionOwnedByUser returns true for Wagiman on Wagiman tx');
assert(isTransactionOwnedByUser(rawTxWagiman, supriono) === false, 'TEST 4: isTransactionOwnedByUser returns false for Supriono on Wagiman tx');
assert(isTransactionOwnedByUser(rawTxSupriono, supriono) === true, 'TEST 5: isTransactionOwnedByUser returns true for Supriono on Supriono tx');
assert(isTransactionOwnedByUser(rawTxSupriono, wagiman) === false, 'TEST 6: isTransactionOwnedByUser returns false for Wagiman on Supriono tx');

// --------------------------------------------------
// SECTION B: PERSONAL VISIBILITY ISOLATION
// --------------------------------------------------
console.log('\n--- SECTION B: Personal Visibility Isolation ---');

const dataset = [rawTxWagiman, rawTxSupriono, rawTxLegacy];
const wagimanVisible = getVisibleMaintenanceRecords(dataset, wagiman);
const suprionoVisible = getVisibleMaintenanceRecords(dataset, supriono);

assert(wagimanVisible.length === 1, 'TEST 7: Wagiman sees exactly 1 transaction in list');
assert(wagimanVisible[0].id === 'ACT-TEST-WAGIMAN-001', 'TEST 8: Wagiman sees only ACT-TEST-WAGIMAN-001');
assert(suprionoVisible.length === 1, 'TEST 9: Supriono sees exactly 1 transaction in list');
assert(suprionoVisible[0].id === 'ACT-TEST-SUPRIONO-001', 'TEST 10: Supriono sees only ACT-TEST-SUPRIONO-001');

// --------------------------------------------------
// SECTION C: SAME ROLE ISOLATION
// --------------------------------------------------
console.log('\n--- SECTION C: Same-Role Isolation ---');

assert(wagiman.role === supriono.role, 'TEST 11: Both users have identical role MANTRI_TANAMAN');
assert(wagimanVisible.some(tx => tx.id === 'ACT-TEST-SUPRIONO-001') === false, 'TEST 12: Same role does NOT leak Supriono data to Wagiman');
assert(suprionoVisible.some(tx => tx.id === 'ACT-TEST-WAGIMAN-001') === false, 'TEST 13: Same role does NOT leak Wagiman data to Supriono');

// --------------------------------------------------
// SECTION D: ESTATE ISOLATION & SUPERVISORY SCOPE
// --------------------------------------------------
console.log('\n--- SECTION D: Estate Isolation & Supervisory Scope ---');

assert(wagiman.estateId === 'EST-TBS' && supriono.estateId === 'EST-APM', 'TEST 14: Estates are distinct (EST-TBS vs EST-APM)');

const junaidiVisible = getVisibleMaintenanceRecords(dataset, junaidi);
assert(junaidiVisible.length === 1 && junaidiVisible[0].id === 'ACT-TEST-WAGIMAN-001', 'TEST 15: Pengurus Tanah Besih (Junaidi) sees only Tanah Besih records');

const mukhsinVisible = getVisibleMaintenanceRecords(dataset, mukhsin);
assert(mukhsinVisible.length === 1 && mukhsinVisible[0].id === 'ACT-TEST-SUPRIONO-001', 'TEST 16: Pengurus Aek Pamingke (Mukhsin) sees only Aek Pamingke records');

// --------------------------------------------------
// SECTION E: DETAIL TRANSACTION SECURITY
// --------------------------------------------------
console.log('\n--- SECTION E: Detail Transaction Security ---');

const wagimanGetsOwn = getMaintenanceRecordById('ACT-TEST-WAGIMAN-001', wagiman);
assert(wagimanGetsOwn !== null && wagimanGetsOwn.id === 'ACT-TEST-WAGIMAN-001', 'TEST 17: Wagiman can open own transaction detail');

const suprionoGetsWagiman = getMaintenanceRecordById('ACT-TEST-WAGIMAN-001', supriono);
assert(suprionoGetsWagiman === null, 'TEST 18: Supriono is DENIED (null) when attempting to open Wagiman transaction detail');

const wagimanGetsSupriono = getMaintenanceRecordById('ACT-TEST-SUPRIONO-001', wagiman);
assert(wagimanGetsSupriono === null, 'TEST 19: Wagiman is DENIED (null) when attempting to open Supriono transaction detail');

// --------------------------------------------------
// SECTION F: SEARCH & QUERY ISOLATION
// --------------------------------------------------
console.log('\n--- SECTION F: Search & Query Isolation ---');

const searchPenyiramanWagiman = filterMaintenanceRecordsByQuery(dataset, 'Penyiraman', wagiman);
assert(searchPenyiramanWagiman.length === 1 && searchPenyiramanWagiman[0].id === 'ACT-TEST-WAGIMAN-001', 'TEST 20: Wagiman searching "Penyiraman" returns Wagiman transaction');

const searchPenyiramanSupriono = filterMaintenanceRecordsByQuery(dataset, 'Penyiraman', supriono);
assert(searchPenyiramanSupriono.length === 0, 'TEST 21: Supriono searching "Penyiraman" returns 0 results (no Wagiman data leak in search)');

const searchDocWagimanBySupriono = filterMaintenanceRecordsByQuery(dataset, 'ACT/TBS/2026/001', supriono);
assert(searchDocWagimanBySupriono.length === 0, 'TEST 22: Searching by exact docNo of another user returns 0 results');

// --------------------------------------------------
// SECTION G: DELETE SECURITY
// --------------------------------------------------
console.log('\n--- SECTION G: Delete Security ---');

// Supriono tries to delete Wagiman's record
const suprionoDeleteWagiman = deleteMaintenanceRecord('ACT-TEST-WAGIMAN-001', supriono);
assert(suprionoDeleteWagiman === false, 'TEST 23: Unauthorized delete returns false');

const checkStillExists = storage.get('nursery_activity_records', []).find(r => r.id === 'ACT-TEST-WAGIMAN-001');
assert(checkStillExists !== undefined, 'TEST 24: Wagiman transaction remains intact after unauthorized delete attempt');

// Wagiman deletes own record
const wagimanDeleteOwn = deleteMaintenanceRecord('ACT-TEST-WAGIMAN-001', wagiman);
assert(wagimanDeleteOwn === true, 'TEST 25: Authorized delete returns true');

const checkDeleted = storage.get('nursery_activity_records', []).find(r => r.id === 'ACT-TEST-WAGIMAN-001');
assert(checkDeleted === undefined, 'TEST 26: Wagiman transaction successfully deleted from storage by owner');

// --------------------------------------------------
// SECTION H: LEGACY DATA COMPATIBILITY
// --------------------------------------------------
console.log('\n--- SECTION H: Legacy Data Compatibility ---');

assert(isTransactionOwnedByUser(rawTxLegacy, wagiman) === false, 'TEST 27: Legacy record is NOT claimed by Wagiman');
assert(isTransactionOwnedByUser(rawTxLegacy, supriono) === false, 'TEST 28: Legacy record is NOT claimed by Supriono');

const resolvedLegacy = resolveTransactionActor(rawTxLegacy);
assert(resolvedLegacy.isLegacy === true, 'TEST 29: resolveTransactionActor safely marks legacy record without crashing');
assert(rawTxLegacy.createdByUserId === undefined, 'TEST 30: Legacy record was NOT mutated or backfilled');

// --------------------------------------------------
// SECTION I: ACTOR IDENTITY & IMMUTABILITY
// --------------------------------------------------
console.log('\n--- SECTION I: Actor Identity & Immutability ---');

assert(rawTxSupriono.createdByName === 'Supriono', 'TEST 31: Creator name preserved in actor snapshot');
assert(rawTxSupriono.createdByRole === ROLES.MANTRI_TANAMAN, 'TEST 32: Canonical role preserved');
assert(rawTxSupriono.createdByEstateId === 'EST-APM', 'TEST 33: Estate ID EST-APM preserved');
assert(rawTxSupriono.createdByScopeType === SCOPE_TYPES.DIVISION, 'TEST 34: Scope type DIVISION preserved');

// --------------------------------------------------
// SECTION J: WORKFLOW & CFNA INTEGRATION PRESERVATION
// --------------------------------------------------
console.log('\n--- SECTION J: Workflow & CFNA Integration Preservation ---');

const confirmedCfna = getConfirmedCfnaForActivity(MASTER_AKTIVITAS.find(a => a.nama === 'Penyiraman'));
assert(confirmedCfna.length === 1 && confirmedCfna[0].code === '964009', 'TEST 35: CFNA activity filter continues to function properly');
assert(rawTxSupriono.allocationCode === '964006', 'TEST 36: CFNA allocationCode remains intact in transaction');
assert(rawTxSupriono.allocationName === 'Pemupukan', 'TEST 37: CFNA allocationName remains intact in transaction');

// --------------------------------------------------
// SECTION K: SUMMARY
// --------------------------------------------------
console.log('\n==================================================');
console.log(`TOTAL TESTS RUN: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('==================================================\n');

if (failed === 0) {
  console.log('🎉 ALL PHASE 9D TRANSACTION DATA ISOLATION TESTS PASSED!\n');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED IN PHASE 9D VERIFICATION!\n`);
  process.exit(1);
}
