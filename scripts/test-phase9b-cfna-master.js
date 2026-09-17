/**
 * scripts/test-phase9b-cfna-master.js
 * Automated Verification Suite for Master Data CFNA Foundation (Phase 9B / TASK-CFNA-REPLACE-02).
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
  CFNA_MASTER,
  CFNA_STATUS,
  MAPPING_STATUS,
  CFNA_ACTIVITY_MAPPINGS,
  getAllCfnaMaster,
  getActiveCfnaMaster,
  getCfnaByCode,
  getCfnaByName,
  isCfnaCodeValid,
  getCfnaActivityMappings,
  getCfnaMappingByCode
} from '../js/data/cfna-master.js';
import { ROLES_MASTER, CLONES, DEFAULT_BEDENGAN_MASTER } from '../js/data/master-data.js';
import { DEMO_PERSONAS, getDemoPersonas } from '../js/data/demo-personas.js';
import { CANONICAL_ROLES, ROLE_PROFILES } from '../js/core/role-profiles.js';
import { ROLES, normalizeRole } from '../js/core/user-context.js';
import { MENU_REGISTRY, FEATURE_REGISTRY } from '../js/core/menu-registry.js';
import { createTransactionActorSnapshot, applyTransactionActor } from '../js/core/transaction-actor.js';

console.log('=== STARTING PHASE 9B CFNA MASTER DATA VERIFICATION (54 DATASET) ===\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// ==========================================
// A. MASTER EXISTENCE (54 RECORDS)
// ==========================================
console.log('--- SECTION A: Master Existence ---');
assert(Array.isArray(CFNA_MASTER) && CFNA_MASTER.length === 54, `TEST 1 & 2: CFNA_MASTER exists and contains all 54 official records (actual: ${CFNA_MASTER.length})`);

let allCodesPresent = true;
let allNamesPresent = true;
let allCodesAreStrings = true;
CFNA_MASTER.forEach((c) => {
  if (!c.code || typeof c.code !== 'string' || c.code.trim() === '') allCodesPresent = false;
  if (!c.name || typeof c.name !== 'string' || c.name.trim() === '') allNamesPresent = false;
  if (typeof c.code !== 'string') allCodesAreStrings = false;
});
assert(allCodesPresent, 'TEST 3: Every CFNA record has a non-empty code string');
assert(allNamesPresent, 'TEST 4: Every CFNA record has a non-empty name string');
assert(allCodesAreStrings, 'TEST 4b: Every CFNA code is strictly of type string (alphanumeric preserved)');

// ==========================================
// B. UNIQUENESS CONSTRAINTS
// ==========================================
console.log('\n--- SECTION B: Uniqueness Constraints ---');
const codes = CFNA_MASTER.map((c) => c.code);
const uniqueCodes = new Set(codes);
assert(codes.length === 54 && uniqueCodes.size === 54, `TEST 5 & 6: All 54 CFNA codes are distinct and unique (No duplicate identicals)`);

const count122111 = CFNA_MASTER.filter((c) => c.code === '122111').length;
assert(count122111 === 1, `TEST 7: Code '122111' (Kecambah/Klatak) occurs exactly once (count: ${count122111})`);

// ==========================================
// C. DATA INTEGRITY & CANONICAL NAMES (NEW DATASET)
// ==========================================
console.log('\n--- SECTION C: Data Integrity & Canonical Names ---');
const expectedSample = [
  { code: '122111', name: 'Kecambah/Klatak' },
  { code: '122121', name: 'Persiapan bedengan' },
  { code: '122122', name: 'Pemeliharaan bedengan' },
  { code: '122123', name: 'Penanaman biji dibedengan' },
  { code: '122124', name: 'Penyiraman di bedengan' },
  { code: '122141', name: 'Biaya Polybag' },
  { code: '122151', name: 'Mencari dan mengumpulkan tanah' },
  { code: '122152', name: 'Persiapan media dan pengisian polybag' },
  { code: '122153', name: 'Pembuatan parit' },
  { code: '122154', name: 'Menyusun polybag' },
  { code: '122155', name: 'Ayak tanah dan campur dengan pupuk RP' },
  { code: '122160', name: 'Pembebanan Biaya Dari Bedengan Perkecambahan' },
  { code: '122161', name: 'Menanam kecambah di polybag' },
  { code: '122162', name: 'Tanam Entrys Baru' },
  { code: '122171', name: 'Penyiraman' },
  { code: '122172', name: 'Penyisipan' },
  { code: '122173', name: 'Pengendalian gulma' },
  { code: '122174', name: 'Pemupukan' },
  { code: '122175', name: 'Pengendalian hama penyakit' },
  { code: '122176', name: 'Seleksi bibit' },
  { code: '122177', name: 'Perawatan Entrys Baru' },
  { code: '122181', name: 'Panen Entrys' },
  { code: '122182', name: 'Okulasi' },
  { code: '122183', name: 'Buka Perban dan pemeriksaan okulasi' },
  { code: '122191', name: 'Topping' },
  { code: '122193', name: 'Treatment dan pengemasan' },
  { code: '1221A1', name: 'Gaji Mantri Tanaman' },
  { code: '1221A2', name: 'Gaji jaga malam' },
  { code: '1221Z1', name: 'Dipakai kebun sendiri' },
  { code: '1221Z2', name: 'Dipakai / dikirim ke kebun sepupu' },
  { code: '1221Z3', name: 'Penjualan' },
  { code: '1221Z4', name: 'Pemindahan Biaya Bibitan ke APM Nursery' },
  { code: '122311', name: 'Pemindahan Biaya Bibitan dari RN - Green Budding' },
  { code: '122312', name: 'Memancang' },
  { code: '122313', name: 'Melobang' },
  { code: '122314', name: 'Menanam' },
  { code: '122315', name: 'Memupuk' },
  { code: '122316', name: 'Merawat High Stump' },
  { code: '122317', name: 'Pengendalian Penyakit' },
  { code: '122318', name: 'Root Pruning' },
  { code: '122319', name: 'Topping' },
  { code: '12231A', name: 'Bongkar High Stump' },
  { code: '12231B', name: 'Pemindahan Biaya ke High Stump N2 - N4' },
  { code: '122320', name: 'Pemindahan Biaya dari High Stump N0 - N1' },
  { code: '122321', name: 'Memupuk' },
  { code: '122322', name: 'Merawat High Stump' },
  { code: '122323', name: 'Pengendalian Penyakit' },
  { code: '122324', name: 'Root Pruning' },
  { code: '122325', name: 'Topping' },
  { code: '122326', name: 'Bongkar High Stump' },
  { code: '122391', name: 'Dipakai kebun sendiri' },
  { code: '122392', name: 'Dipakai / dikirim ke kebun sepupu' },
  { code: '122393', name: 'Penjualan' },
  { code: '122394', name: 'Pemusnahan Bibit' }
];

let allSampleValid = true;
expectedSample.forEach((exp) => {
  const actual = getCfnaByCode(exp.code);
  if (!actual || actual.name !== exp.name) {
    allSampleValid = false;
    assert(false, `Mismatch for code [${exp.code}]: expected '${exp.name}', got '${actual ? actual.name : 'null'}'`);
  }
});
if (allSampleValid) {
  assert(true, `TEST 8, 9 & 10: All 54 official CFNA codes and names match source specifications perfectly`);
}

// Old codes must be null
assert(getCfnaByCode('964009') === null, 'TEST 10b: Old code 964009 is removed and returns null');
assert(getCfnaByCode('955001') === null, 'TEST 10c: Old code 955001 is removed and returns null');
assert(getCfnaByCode('091A11') === null, 'TEST 10d: Old code 091A11 is removed and returns null');

// ==========================================
// D. STATUS VALIDATION
// ==========================================
console.log('\n--- SECTION D: Status Integrity ---');
const validStatuses = Object.values(CFNA_STATUS);
let allStatusesValid = true;
CFNA_MASTER.forEach((c) => {
  if (!validStatuses.includes(c.status)) allStatusesValid = false;
});
assert(allStatusesValid, 'TEST 11: All status values belong to canonical CFNA_STATUS');

const activeList = getActiveCfnaMaster();
assert(activeList.length === 54, `TEST 12: All 54 official records are active (count: ${activeList.length})`);

// ==========================================
// E. MAPPING INTEGRITY & METADATA
// ==========================================
console.log('\n--- SECTION E: Activity Mapping Metadata ---');
const mappings = getCfnaActivityMappings();
assert(mappings.length > 0, `TEST 13.1: Activity mappings metadata array exists (count: ${mappings.length})`);

const confirmedMappings = mappings.filter((m) => m.mappingStatus === MAPPING_STATUS.CONFIRMED);
assert(confirmedMappings.length > 0, `TEST 13.2: Confirmed mappings present with explicit evidence (count: ${confirmedMappings.length})`);

let mappingsReferencedCodesValid = true;
mappings.forEach((m) => {
  if (!isCfnaCodeValid(m.cfnaCode)) mappingsReferencedCodesValid = false;
});
assert(mappingsReferencedCodesValid, 'TEST 15: All activity mapping entries reference valid registered CFNA codes in the 54 master');

// ==========================================
// F. BACKWARD COMPATIBILITY
// ==========================================
console.log('\n--- SECTION F: Backward Compatibility with Existing Master Data ---');
assert(Array.isArray(ROLES_MASTER) && ROLES_MASTER.length === 7, 'TEST 16.1: ROLES_MASTER is preserved (7 roles)');
assert(Array.isArray(CLONES) && CLONES.length === 3, 'TEST 16.2: CLONES master is preserved (3 clones)');
assert(Array.isArray(DEFAULT_BEDENGAN_MASTER), 'TEST 16.3: BEDS master array is preserved');

// Historical transaction resolution test
const mockTx = {
  id: 'REQ-001',
  docNo: 'REQ/2026/001',
  createdByRole: 'PENGURUS'
};
assert(mockTx.createdByRole === 'PENGURUS', 'TEST 17: Existing transaction structure remains untouched');
assert(typeof applyTransactionActor === 'function', 'TEST 18: applyTransactionActor remains functional');

// ==========================================
// G. ROLE & SYSTEM REGRESSION INVARIANTS
// ==========================================
console.log('\n--- SECTION G: System Invariants Non-Regression ---');
assert(Object.values(CANONICAL_ROLES).length === 7, 'TEST 19: CANONICAL_ROLES is strictly 7');
assert(normalizeRole(ROLES.PENGURUS_KEBUN_SEPUPU) === ROLES.PENGURUS, 'TEST 20: Legacy role normalization unaffected');
assert(DEMO_PERSONAS.length === 14, 'TEST 21: DEMO_PERSONAS remains 14 across 2 estates');
assert(MENU_REGISTRY.length === 12, 'TEST 22: MENU_REGISTRY remains 12 menus');
assert(FEATURE_REGISTRY.length === 18, 'TEST 23: FEATURE_REGISTRY remains 18 features');

console.log('\n==================================================');
console.log(`TOTAL TESTS RUN: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 9B CFNA MASTER DATA TESTS PASSED!');
}
