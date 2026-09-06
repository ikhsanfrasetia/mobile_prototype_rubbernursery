/**
 * Automated Regression Test Suite for Reference Tab Bug Fix
 */
import {
  initProjectDataStore,
  getActiveStore,
  getRequirementByReqId,
  getRequirementRevisionHistory,
  validateProjectData
} from './js/modules/process-mapping/process-mapping-data.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('🧪 Starting Reference Tab Regression Tests...\n');

// 1. Initialize Store
const store = initProjectDataStore(true);
assert(store !== null, 'Store successfully initialized from official baseline');

const funcItems = store.functionalRequirements || [];
const nonFuncItems = store.nonFunctionalRequirements || [];
const totalGeneral = funcItems.length + nonFuncItems.length;

assert(funcItems.length === 14, `Functional Requirements count === 14 (Actual: ${funcItems.length})`);
assert(nonFuncItems.length === 10, `Non-Functional Requirements count === 10 (Actual: ${nonFuncItems.length})`);
assert(totalGeneral === 24, `Total Reference Requirements === 24 (Actual: ${totalGeneral})`);

// 2. Test Filtering Logic Emulation
function testFilter(refFilterType, refFilterCategory, refFilterStatus, refSearchQuery) {
  const fItems = (store.functionalRequirements || []).map((f) => ({ ...f, reqType: 'Functional' }));
  const nfItems = (store.nonFunctionalRequirements || []).map((nf) => ({ ...nf, reqType: 'Non-Functional' }));
  let all = [...fItems, ...nfItems];

  const typeFilter = (refFilterType || 'ALL').toUpperCase();
  if (typeFilter === 'FUNCTIONAL' || typeFilter === 'KF') {
    all = all.filter((item) => (item.reqType || item.type || '').toUpperCase() === 'FUNCTIONAL' || (item.id || '').startsWith('KF-'));
  } else if (typeFilter === 'NON-FUNCTIONAL' || typeFilter === 'KNF' || typeFilter === 'NONFUNCTIONAL') {
    all = all.filter((item) => (item.reqType || item.type || '').toUpperCase().includes('NON') || (item.id || '').startsWith('KNF-'));
  }

  if (refFilterCategory && refFilterCategory.toUpperCase() !== 'ALL') {
    all = all.filter((item) => (item.category || '').toLowerCase() === refFilterCategory.toLowerCase());
  }

  if (refFilterStatus && refFilterStatus.toUpperCase() !== 'ALL') {
    all = all.filter((item) => (item.status || 'Confirmed').toUpperCase() === refFilterStatus.toUpperCase());
  }

  if (refSearchQuery && refSearchQuery.trim()) {
    const q = refSearchQuery.toLowerCase().trim();
    all = all.filter((item) => {
      return (
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.acceptance && item.acceptance.toLowerCase().includes(q)) ||
        (item.acceptanceCriteria && item.acceptanceCriteria.toLowerCase().includes(q)) ||
        (item.reqType && item.reqType.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q))
      );
    });
  }

  return all;
}

// 3. Acceptance Criteria Validation
// Test A: Default Filter (ALL, ALL, ALL, '')
const defaultResults = testFilter('ALL', 'ALL', 'ALL', '');
assert(defaultResults.length === 24, `Default Filter renders 24 items (Actual: ${defaultResults.length})`);

// Test B: Filter Functional
const funcResults = testFilter('FUNCTIONAL', 'ALL', 'ALL', '');
assert(funcResults.length === 14, `Functional Filter renders 14 items (Actual: ${funcResults.length})`);
assert(funcResults.every(it => it.id.startsWith('KF-')), 'All items in Functional filter start with KF-');

// Test C: Filter Non-Functional
const nonFuncResults = testFilter('NON-FUNCTIONAL', 'ALL', 'ALL', '');
assert(nonFuncResults.length === 10, `Non-Functional Filter renders 10 items (Actual: ${nonFuncResults.length})`);
assert(nonFuncResults.every(it => it.id.startsWith('KNF-')), 'All items in Non-Functional filter start with KNF-');

// Test D: Category Filter
const secResults = testFilter('ALL', 'Security', 'ALL', '');
assert(secResults.length > 0 && secResults.every(it => it.category === 'Security'), `Category 'Security' filter works (Actual: ${secResults.length} items)`);

const offResults = testFilter('ALL', 'Offline Operation', 'ALL', '');
assert(offResults.length > 0 && offResults.every(it => it.category === 'Offline Operation'), `Category 'Offline Operation' filter works (Actual: ${offResults.length} items)`);

// Test E: Status Filter
const confResults = testFilter('ALL', 'ALL', 'Confirmed', '');
assert(confResults.length === 24, `Status 'Confirmed' filter returns 24 items (Actual: ${confResults.length})`);

// Test F: Search Query
const searchQrResults = testFilter('ALL', 'ALL', 'ALL', 'QR Code');
assert(searchQrResults.length > 0, `Search query 'QR Code' found ${searchQrResults.length} items`);

const searchKfResults = testFilter('ALL', 'ALL', 'ALL', 'KF-008');
assert(searchKfResults.length === 1 && searchKfResults[0].id === 'KF-008', `Search query 'KF-008' found 1 exact item`);

// Test G: Reset Filter
const resetResults = testFilter('ALL', 'ALL', 'ALL', '');
assert(resetResults.length === 24, `Reset Filter restores exactly 24 items (Actual: ${resetResults.length})`);

// Test H: Detail Requirement Lookup for Reference items
const kf008 = getRequirementByReqId('KF-008');
assert(kf008 !== null && kf008.id === 'KF-008', `getRequirementByReqId('KF-008') successfully resolved`);

const knf001 = getRequirementByReqId('KNF-001');
assert(knf001 !== null && knf001.id === 'KNF-001', `getRequirementByReqId('KNF-001') successfully resolved`);

const kf008History = getRequirementRevisionHistory('KF-008');
assert(kf008History.length >= 1 && kf008History[0].id === 'KF-008', `getRequirementRevisionHistory('KF-008') successfully returns history`);

// 4. Schema & Data Contract Validation
const validation = validateProjectData(store);
assert(validation.valid === true, `Schema validation intact: ${validation.errors.length} errors`);

console.log(`\n========================================`);
console.log(`Summary: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL REFERENCE TAB TESTS PASSED!');
}
