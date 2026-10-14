import { storage } from '../js/core/storage.js';
import { findDownstreamDependency, guardDependency } from '../js/core/dependency-guard.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING TESTS: RETURNED DEDERAN DEPENDENCY & EDIT');
console.log('====================================================\n');

// Mock storage
const mockDb = {
  receipt_transactions: [],
  dederan_transactions: [],
  dederan_induk_documents: [],
  dederan_inspection_transactions: [],
  seeding_transactions: [],
  pre_grafting_selection_documents: [],
  selection_transactions: [],
  budding_transactions: [],
  inspection_transactions: [],
  selection_pool: []
};

storage.get = (key, fallback = null) => {
  return mockDb[key] !== undefined ? JSON.parse(JSON.stringify(mockDb[key])) : fallback;
};
storage.set = (key, val) => {
  mockDb[key] = JSON.parse(JSON.stringify(val));
};

// Scenario: Dederan 2026/DED/004 is DIKEMBALIKAN, with child CULL 2026/CULL/004 also DIKEMBALIKAN
const returnedDederTx = {
  id: 'DED-004',
  docNo: '2026/DED/004',
  jumlahDeder: 30000,
  status: 'DIKEMBALIKAN',
  verificationStatus: 'DIKEMBALIKAN',
  returnReason: 'Test Kembalikan'
};

const returnedCullTx = {
  id: 'CULL-004',
  docNo: '2026/CULL/004',
  dederanTxDocNo: '2026/DED/004',
  sourceDocNo: '2026/DED/004',
  status: 'DIKEMBALIKAN',
  verificationStatus: 'DIKEMBALIKAN',
  returnReason: 'Test Kembalikan'
};

const returnedInspTx = {
  id: 'INS-004',
  docNo: '2026/DED-INS/004',
  dederanTxDocNo: '2026/DED/004',
  status: 'DIKEMBALIKAN',
  verificationStatus: 'DIKEMBALIKAN',
  returnReason: 'Test Kembalikan'
};

mockDb.dederan_transactions.push(returnedDederTx);
mockDb.selection_transactions.push(returnedCullTx);
mockDb.dederan_inspection_transactions.push(returnedInspTx);

// Test 1: Deleting returned Dederan with child must still be protected
assert(guardDependency(returnedDederTx, 'Dederan (Germinasi)', 'Dihapus') === true, 'Deleting Dederan with downstream child is BLOCKED');

// Test 2: Editing returned Dederan with returned child must NOT be blocked
assert(guardDependency(returnedDederTx, 'Dederan (Germinasi)', 'Diedit') === false, 'Editing returned Dederan with returned child is ALLOWED (not blocked)');

// Test 3: findDownstreamDependency with isEditAction: true ignores DIKEMBALIKAN downstream
const depForEdit = findDownstreamDependency('2026/DED/004', null, null, { isEditAction: true });
assert(depForEdit === null, 'findDownstreamDependency returns null for edit action when children are in DIKEMBALIKAN status');

// Test 4: findDownstreamDependency with default / delete action still catches child
const depForDelete = findDownstreamDependency('2026/DED/004');
assert(depForDelete !== null, 'findDownstreamDependency detects child for delete action');
assert(depForDelete.docNo === '2026/DED-INS/004' || depForDelete.docNo === '2026/CULL/004', 'Identifies child doc');

console.log(`\n====================================================`);
console.log(`TEST SUITE FINISHED: ${passed} / ${total} ASSERTIONS PASSED`);
console.log(`====================================================`);
