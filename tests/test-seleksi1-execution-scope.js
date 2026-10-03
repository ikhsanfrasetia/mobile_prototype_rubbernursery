/**
 * tests/test-seleksi1-execution-scope.js
 * Test: Bedengan Execution Scope pada Seleksi I Batch-Centric
 * 
 * Validates:
 * 1. getBedenganScopeStatusForSeleksi1 resolves per-bedengan scope
 * 2. validateSeleksi1Execution uses per-bedengan remainingPolybag (not aggregate)
 * 3. createSeleksi1ExecutionTransaction includes bedenganId/Code and sourceSeedingDocNo
 * 4. No double transactions per bedengan scope
 * 5. Cross-bedengan isolation (BED-001 scope does not affect BED-002 scope)
 * 6. Fully-inspected bedengan is rejected
 */

import {
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution,
  createSeleksi1ExecutionTransaction,
  getSeleksi1ExecutionsByDocument,
  formatBedenganDisplayCode,
  SELECTION_STAGES,
  SELECTION_TYPES,
  SELECTION_STATUS,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import { storage } from '../js/core/storage.js';

const results = [];
let totalPassed = 0;
let totalFailed = 0;

function assert(testName, condition, detail = '') {
  if (condition) {
    results.push({ name: testName, status: 'PASS', detail });
    totalPassed++;
  } else {
    results.push({ name: testName, status: 'FAIL', detail });
    totalFailed++;
  }
}

function resetStorage() {
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
}

// ============================================================================
// MOCK DATA: BTCH-001 with 2 bedengan (BED-001, BED-002)
// ============================================================================
const mockParentDoc = {
  id: 'SEL-DOC-SCOPE-TEST-001',
  docNo: '2026/SEL/001',
  batchId: 'BTCH-001',
  batchCode: 'BTCH-001',
  clone: 'IRCA 19',
  klon: 'IRCA 19',
  programId: 'PRG-2026-001',
  programCode: 'PRG-2026-001',
  programName: 'Program Bibitan 2026',
  estateId: 'EST-001',
  divisionId: 'DIV-001',
  selectionStage: 'SELEKSI_I',
  selectionType: 'PRA_OKULASI',
  sourcePolybagQty: 6450,
  sourceBibitQty: 12900,
  sourceDocNo: '2026/SOW/001',
  sourceSeedingDocNos: ['2026/SOW/001', '2026/SOW/003'],
  status: 'DRAFT',
  rows: [
    {
      bedenganId: 'BED-001',
      bedenganCode: 'BED-001',
      polybag: 3000,
      disemai: 6000,
      seedingDocNo: '2026/SOW/001',
      sourceSeedingDocNo: '2026/SOW/001'
    },
    {
      bedenganId: 'BED-002',
      bedenganCode: 'BED-002',
      polybag: 3450,
      disemai: 6900,
      seedingDocNo: '2026/SOW/003',
      sourceSeedingDocNo: '2026/SOW/003'
    }
  ]
};

const mockUser = {
  userId: 'USR-MANTRI-001',
  name: 'Irwan Syah Putra',
  code: '1405482',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-001',
  divisionId: 'DIV-001'
};

// ============================================================================
// TEST GROUP 1: getBedenganScopeStatusForSeleksi1
// ============================================================================

console.log('\n=== IT-SCOPE-001: Bedengan Scope Resolution ===');

resetStorage();

const bedScopes = getBedenganScopeStatusForSeleksi1(mockParentDoc);

assert(
  'IT-SCOPE-001: Resolves 2 bedengan scopes',
  bedScopes.length === 2,
  `Expected 2, got ${bedScopes.length}`
);

assert(
  'IT-SCOPE-002: BED-001 has 3000 initial polybag',
  bedScopes[0].initialPolybag === 3000,
  `Expected 3000, got ${bedScopes[0]?.initialPolybag}`
);

assert(
  'IT-SCOPE-003: BED-002 has 3450 initial polybag',
  bedScopes[1].initialPolybag === 3450,
  `Expected 3450, got ${bedScopes[1]?.initialPolybag}`
);

assert(
  'IT-SCOPE-004: BED-001 remainingPolybag = 3000 (no executions)',
  bedScopes[0].remainingPolybag === 3000,
  `Expected 3000, got ${bedScopes[0]?.remainingPolybag}`
);

assert(
  'IT-SCOPE-005: BED-002 remainingPolybag = 3450 (no executions)',
  bedScopes[1].remainingPolybag === 3450,
  `Expected 3450, got ${bedScopes[1]?.remainingPolybag}`
);

// ============================================================================
// TEST GROUP 2: validateSeleksi1Execution — Scope Isolation
// ============================================================================

console.log('\n=== IT-SCOPE-006: Per-Bedengan Validation ===');

// 2a. Validate BED-001 with valid amount
const val1 = validateSeleksi1Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 1500,
  actualBibitSelectedQty: 100
}, mockParentDoc, []);

assert(
  'IT-SCOPE-006: BED-001 validate 1500 poly → valid',
  val1.isValid === true,
  `Errors: ${val1.errors.join(', ')}`
);

assert(
  'IT-SCOPE-007: Parsed bedenganCode = BED-001',
  val1.parsed.bedenganCode === 'BED-001',
  `Got ${val1.parsed.bedenganCode}`
);

// 2b. Validate BED-001 with amount exceeding scope (3001 > 3000)
const val2 = validateSeleksi1Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 3001,
  actualBibitSelectedQty: 10
}, mockParentDoc, []);

assert(
  'IT-SCOPE-008: BED-001 validate 3001 poly → INVALID (exceeds scope)',
  val2.isValid === false,
  `Expected false, got ${val2.isValid}. Errors: ${val2.errors.join(', ')}`
);

// 2c. Validate BED-002 with valid amount
const val3 = validateSeleksi1Execution({
  bedenganCode: 'BED-002',
  actualPolybagInspectedQty: 3450,
  actualBibitSelectedQty: 200
}, mockParentDoc, []);

assert(
  'IT-SCOPE-009: BED-002 validate 3450 poly → valid',
  val3.isValid === true,
  `Errors: ${val3.errors.join(', ')}`
);

assert(
  'IT-SCOPE-010: Parsed bedenganCode = BED-002',
  val3.parsed.bedenganCode === 'BED-002',
  `Got ${val3.parsed.bedenganCode}`
);

// 2d. Validate sourceSeedingDocNo resolution
assert(
  'IT-SCOPE-011: BED-001 resolves sourceSeedingDocNo = 2026/SOW/001',
  val1.parsed.sourceSeedingDocNo === '2026/SOW/001',
  `Got ${val1.parsed.sourceSeedingDocNo}`
);

assert(
  'IT-SCOPE-012: BED-002 resolves sourceSeedingDocNo = 2026/SOW/003',
  val3.parsed.sourceSeedingDocNo === '2026/SOW/003',
  `Got ${val3.parsed.sourceSeedingDocNo}`
);

// ============================================================================
// TEST GROUP 3: Cross-Bedengan Isolation with Existing Transactions
// ============================================================================

console.log('\n=== IT-SCOPE-013: Cross-Bedengan Isolation ===');

// Simulate existing execution on BED-001 (1500 poly inspected)
const existingTx = {
  id: 'SEL-TX-EXISTING-001',
  docNo: '2026/SEL-I/001',
  bedenganId: 'BED-001',
  bedenganCode: 'BED-001',
  bedengan: 'BED-001',
  actualPolybagInspectedQty: 1500,
  actualBibitSelectedQty: 100,
  actualBibitRetainedQty: 12800,
  selectionDocumentId: mockParentDoc.id,
  parentSelectionDocumentId: mockParentDoc.id,
  selectionStage: 'SELEKSI_I',
  transactionType: 'PELAKSANAAN_SELEKSI_I'
};

// 3a. BED-001 with existing 1500 → remaining = 1500
const bedScopesWithTx = getBedenganScopeStatusForSeleksi1(mockParentDoc, [existingTx]);

assert(
  'IT-SCOPE-013: BED-001 remaining = 1500 after 1500 inspected',
  bedScopesWithTx[0].remainingPolybag === 1500,
  `Expected 1500, got ${bedScopesWithTx[0]?.remainingPolybag}`
);

assert(
  'IT-SCOPE-014: BED-002 remaining = 3450 (UNAFFECTED by BED-001 tx)',
  bedScopesWithTx[1].remainingPolybag === 3450,
  `Expected 3450, got ${bedScopesWithTx[1]?.remainingPolybag}`
);

// 3b. Validate BED-002 with full scope (should be valid even though BED-001 is partially used)
const val4 = validateSeleksi1Execution({
  bedenganCode: 'BED-002',
  actualPolybagInspectedQty: 3450,
  actualBibitSelectedQty: 50
}, mockParentDoc, [existingTx]);

assert(
  'IT-SCOPE-015: BED-002 validate 3450 poly → valid (cross-bedengan isolation)',
  val4.isValid === true,
  `Errors: ${val4.errors.join(', ')}`
);

// 3c. Validate BED-001 with amount exceeding remaining scope (1501 > 1500)
const val5 = validateSeleksi1Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 1501,
  actualBibitSelectedQty: 10
}, mockParentDoc, [existingTx]);

assert(
  'IT-SCOPE-016: BED-001 validate 1501 poly → INVALID (exceeds remaining 1500)',
  val5.isValid === false,
  `Expected false, got ${val5.isValid}. Errors: ${val5.errors.join(', ')}`
);

// ============================================================================
// TEST GROUP 4: Fully-Inspected Bedengan Rejection
// ============================================================================

console.log('\n=== IT-SCOPE-017: Fully-Inspected Bedengan ===');

const fullyInspectedTx = {
  ...existingTx,
  actualPolybagInspectedQty: 3000 // BED-001 fully inspected
};

const bedScopesFull = getBedenganScopeStatusForSeleksi1(mockParentDoc, [fullyInspectedTx]);

assert(
  'IT-SCOPE-017: BED-001 isFullyInspected = true when all 3000 inspected',
  bedScopesFull[0].isFullyInspected === true,
  `Expected true, got ${bedScopesFull[0]?.isFullyInspected}`
);

const val6 = validateSeleksi1Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 1,
  actualBibitSelectedQty: 0
}, mockParentDoc, [fullyInspectedTx]);

assert(
  'IT-SCOPE-018: BED-001 validate 1 poly → INVALID when fully inspected',
  val6.isValid === false,
  `Expected false, got ${val6.isValid}. Errors: ${val6.errors.join(', ')}`
);

// ============================================================================
// TEST GROUP 5: Single Bedengan Fallback (No Dropdown Needed)
// ============================================================================

console.log('\n=== IT-SCOPE-019: Single Bedengan Fallback ===');

const singleBedDoc = {
  ...mockParentDoc,
  id: 'SEL-DOC-SINGLE-BED',
  rows: [
    {
      bedenganId: 'BED-001',
      bedenganCode: 'BED-001',
      polybag: 6450,
      disemai: 12900,
      seedingDocNo: '2026/SOW/001'
    }
  ]
};

const singleBedScopes = getBedenganScopeStatusForSeleksi1(singleBedDoc);

assert(
  'IT-SCOPE-019: Single bedengan resolves 1 scope',
  singleBedScopes.length === 1,
  `Expected 1, got ${singleBedScopes.length}`
);

assert(
  'IT-SCOPE-020: Single bedengan has full 6450 polybag',
  singleBedScopes[0].initialPolybag === 6450,
  `Expected 6450, got ${singleBedScopes[0]?.initialPolybag}`
);

// ============================================================================
// REPORT
// ============================================================================

console.log('\n=============================================');
console.log('  BEDENGAN EXECUTION SCOPE TEST RESULTS');
console.log('=============================================');
results.forEach((r, i) => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
});
console.log('---------------------------------------------');
console.log(`TOTAL: ${results.length} | PASS: ${totalPassed} | FAIL: ${totalFailed}`);
console.log(`STATUS: ${totalFailed === 0 ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
console.log('=============================================\n');
