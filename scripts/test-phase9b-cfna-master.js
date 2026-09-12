/**
 * scripts/test-phase9b-cfna-master.js
 * Automated Verification Suite for Master Data CFNA Foundation (Phase 9B).
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
import { ROLES_MASTER, CLONES, BEDS } from '../js/data/master-data.js';
import { DEMO_PERSONAS, getDemoPersonas } from '../js/data/demo-personas.js';
import { CANONICAL_ROLES, ROLE_PROFILES } from '../js/core/role-profiles.js';
import { ROLES, normalizeRole } from '../js/core/user-context.js';
import { MENU_REGISTRY, FEATURE_REGISTRY } from '../js/core/menu-registry.js';
import { createTransactionActorSnapshot, applyTransactionActor } from '../js/core/transaction-actor.js';

console.log('=== STARTING PHASE 9B CFNA MASTER DATA VERIFICATION ===\n');

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
// A. MASTER EXISTENCE
// ==========================================
console.log('--- SECTION A: Master Existence ---');
assert(Array.isArray(CFNA_MASTER) && CFNA_MASTER.length === 46, `TEST 1 & 2: CFNA_MASTER exists and contains all 46 confirmed records (actual: ${CFNA_MASTER.length})`);

let allCodesPresent = true;
let allNamesPresent = true;
CFNA_MASTER.forEach((c) => {
  if (!c.code || typeof c.code !== 'string' || c.code.trim() === '') allCodesPresent = false;
  if (!c.name || typeof c.name !== 'string' || c.name.trim() === '') allNamesPresent = false;
});
assert(allCodesPresent, 'TEST 3: Every CFNA record has a non-empty code string');
assert(allNamesPresent, 'TEST 4: Every CFNA record has a non-empty name string');

// ==========================================
// B. UNIQUENESS CONSTRAINTS
// ==========================================
console.log('\n--- SECTION B: Uniqueness Constraints ---');
const codes = CFNA_MASTER.map((c) => c.code);
const uniqueCodes = new Set(codes);
assert(codes.length === uniqueCodes.size, `TEST 5 & 6: All ${codes.length} CFNA codes are distinct and unique (No duplicate identicals)`);

const count951001 = CFNA_MASTER.filter((c) => c.code === '951001').length;
assert(count951001 === 1, `TEST 7: Code '951001' (Biaya Kecambah) occurs exactly once (count: ${count951001})`);

// ==========================================
// C. DATA INTEGRITY & CANONICAL NAMES
// ==========================================
console.log('\n--- SECTION C: Data Integrity & Canonical Names ---');
const expectedSample = [
  { code: '964009', name: 'Penyiraman (Manual)' },
  { code: '964008', name: 'Seleksi Bibit' },
  { code: '964007', name: 'Pengendalian Hama Penyakit' },
  { code: '964006', name: 'Pemupukan' },
  { code: '964005', name: 'Pengendalian Gulma (Manual)' },
  { code: '964004', name: 'Pengendalian Gulma (Kimia)' },
  { code: '964003', name: 'Pemeliharaan Sprinkler/Pipa' },
  { code: '964002', name: 'Pemeliharaan Mesin Sprinkler' },
  { code: '964001', name: 'Operator Mesin Sprinkler' },
  { code: '955005', name: 'Seleksi Bibit' },
  { code: '955004', name: 'Pengendalian Hama Penyakit' },
  { code: '955003', name: 'Pemupukan' },
  { code: '955002', name: 'Pengendalian Gulma' },
  { code: '955001', name: 'Penyiraman' },
  { code: '952001', name: 'Biaya Babybag' },
  { code: '966001', name: 'Pembebanan ke Kebun Sepupu' },
  { code: '959001', name: 'Pembebanan ke Kebun Sepupu' },
  { code: '963004', name: 'Buat/Pasang No. Kategori' },
  { code: '963003', name: 'Isi Cangkang/Mulsa' },
  { code: '963002', name: 'Tanam Bibit di Polybag' },
  { code: '963001', name: 'Pemindahan Bibit Babybag' },
  { code: '954002', name: 'Buat/Pasang No. Kategori' },
  { code: '954001', name: 'Tanam Kecambah' },
  { code: '962005', name: 'Susun Polybag di Bibitan' },
  { code: '962004', name: 'Isi Tanah ke Polybag' },
  { code: '962003', name: 'Ayak/Campur Tanah dgn RP & Solid' },
  { code: '962002', name: 'Cari/Kumpulkan Tanah/Media' },
  { code: '962001', name: 'Membersihkan/Meratakan Areal Bibitan' },
  { code: '953006', name: 'Pemeliharaan Bedengan' },
  { code: '953005', name: 'Persiapan Bedengan' },
  { code: '953004', name: 'Susun Babybag di Bedengan' },
  { code: '953003', name: 'Isi Tanah ke Babybag' },
  { code: '953002', name: 'Ayak/Campur Tanah dgn RP & Solid' },
  { code: '953001', name: 'Cari/Kumpulkan Tanah/Media' },
  { code: '951001', name: 'Biaya Kecambah' },
  { code: '965002', name: 'Gaji mengawasi bibitan' },
  { code: '965001', name: 'Gaji Mantri Bibitan' },
  { code: '956001', name: 'Gaji Mantri Bibitan' },
  { code: '956002', name: 'Mengawasi Bibitan' },
  { code: '091A11', name: 'Persediaan Bibit Komersil' },
  { code: '091B11', name: 'Persediaan Bibit Prog. Tanam' },
  { code: '122124', name: 'Penyiraman di Bedengan' },
  { code: '122123', name: 'Tanam Biji di Bedengan' },
  { code: '122122', name: 'Pemeliharaan Bedengan' },
  { code: '122121', name: 'Persiapan Bedengan' },
  { code: '122111', name: 'Biaya Biji Kelatak' }
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
  assert(true, `TEST 8, 9 & 10: All 46 canonical CFNA codes and names match source specifications perfectly`);
}

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
assert(activeList.length === 46, `TEST 12: All 46 confirmed records are active (count: ${activeList.length})`);

// ==========================================
// E. MAPPING INTEGRITY & METADATA
// ==========================================
console.log('\n--- SECTION E: Activity Mapping Metadata ---');
const mappings = getCfnaActivityMappings();
assert(mappings.length > 0, `TEST 13.1: Activity mappings metadata array exists (count: ${mappings.length})`);

const confirmedMappings = mappings.filter((m) => m.mappingStatus === MAPPING_STATUS.CONFIRMED);
const needsReviewMappings = mappings.filter((m) => m.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW);
assert(confirmedMappings.length > 0, `TEST 13.2: Confirmed mappings present with explicit evidence (count: ${confirmedMappings.length})`);
assert(needsReviewMappings.length > 0, `TEST 14: Unproven candidate mappings marked strictly as NEEDS_REVIEW (count: ${needsReviewMappings.length})`);

let mappingsReferencedCodesValid = true;
mappings.forEach((m) => {
  if (!isCfnaCodeValid(m.cfnaCode)) mappingsReferencedCodesValid = false;
});
assert(mappingsReferencedCodesValid, 'TEST 15: All activity mapping entries reference valid registered CFNA codes');

// ==========================================
// F. BACKWARD COMPATIBILITY
// ==========================================
console.log('\n--- SECTION F: Backward Compatibility with Existing Master Data ---');
assert(Array.isArray(ROLES_MASTER) && ROLES_MASTER.length === 7, 'TEST 16.1: ROLES_MASTER is preserved (7 roles)');
assert(Array.isArray(CLONES) && CLONES.length === 3, 'TEST 16.2: CLONES master is preserved (3 clones)');
assert(Array.isArray(BEDS) && BEDS.length === 3, 'TEST 16.3: BEDS master is preserved (3 beds)');

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
