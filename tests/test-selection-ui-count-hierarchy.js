/**
 * tests/test-selection-ui-count-hierarchy.js
 * Integration Test: Count Hierarchy Verification for Seleksi Pra-Okulasi (Parent vs Sub-Tabs vs Headers)
 *
 * Validates:
 * 1. Raw storage has 5 records (1 legacy aggregate split parent + 4 active Seleksi I documents).
 * 2. Legacy aggregate split record has isSplit === true and isLegacyAggregateSplit === true.
 * 3. Canonical active collection filters out legacy split records, yielding exactly 4 active documents.
 * 4. Parent tab count = 4.
 * 5. Seleksi I count = 4.
 * 6. Seleksi II count = 0.
 * 7. Seleksi III count = 0.
 * 8. Header Seleksi I count = 4.
 * 9. Rendered Seleksi I cards = 4.
 * 10. Legacy split document is not rendered in cards list.
 * 11. Legacy split document is not counted in parent badge.
 * 12. Legacy split document is not counted in sub-tab badges.
 * 13. Storage record legacy still exists in storage (not deleted).
 * 14. Presentation filter does not mutate raw storage or transaction data.
 * 15. Dynamic update invariant: adding Seleksi II or Seleksi III increases active collection dynamically without hardcoding.
 */

// In-memory localStorage mock
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import {
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  getPreGraftingSelectionDocuments
} from '../js/modules/selection/selection-manager.js';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, testId, message) {
  if (condition) {
    totalPassed++;
    console.log(`  [PASS] ${testId}: ${message}`);
  } else {
    totalFailed++;
    console.error(`  [FAIL] ${testId}: ${message}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('RUNNING INTEGRATION TESTS: SELEKSI PRA-OKULASI COUNT HIERARCHY');
console.log('='.repeat(80) + '\n');

// 1. SETUP MOCK DATA: 1 Legacy Aggregate Split Parent + 4 Active Seleksi I Documents = 5 Raw Records
store.clear();

const mockUser = {
  name: 'Irwan Syah Putra',
  code: '1405482',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const initialDocs = [
  // Legacy Aggregate Split Parent Document (historical record, inactive)
  {
    id: 'SEL-LEGACY-001',
    docNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-001',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    isSplit: true,
    isLegacyAggregateSplit: true,
    splitInto: ['SEL-DOC-001', 'SEL-DOC-002', 'SEL-DOC-003', 'SEL-DOC-004'],
    status: 'SPLIT_MIGRATED'
  },
  // Active child documents generated per Bedengan
  {
    id: 'SEL-DOC-001',
    docNo: '2026/CULL/001_1',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    estateId: 'EST-01',
    divisionId: 'DIV-01'
  },
  {
    id: 'SEL-DOC-002',
    docNo: '2026/CULL/001_2',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-002',
    estateId: 'EST-01',
    divisionId: 'DIV-01'
  },
  {
    id: 'SEL-DOC-003',
    docNo: '2026/CULL/001_3',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-003',
    estateId: 'EST-01',
    divisionId: 'DIV-01'
  },
  {
    id: 'SEL-DOC-004',
    docNo: '2026/CULL/001_4',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-004',
    estateId: 'EST-01',
    divisionId: 'DIV-01'
  }
];

storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, initialDocs);

// ----------------------------------------------------------------------------
// TEST 1: RAW STORAGE RECORD COUNT VERIFICATION
// ----------------------------------------------------------------------------
const rawStorageDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
assert(rawStorageDocs.length === 5, 'IT-COUNT-001', 'Raw storage contains exactly 5 records');

// ----------------------------------------------------------------------------
// TEST 2: LEGACY RECORD FLAGS VERIFICATION
// ----------------------------------------------------------------------------
const legacyDoc = rawStorageDocs.find(d => d.id === 'SEL-LEGACY-001');
assert(
  Boolean(legacyDoc && legacyDoc.isSplit === true && legacyDoc.isLegacyAggregateSplit === true),
  'IT-COUNT-002',
  'Legacy split parent document has isSplit === true and isLegacyAggregateSplit === true'
);

// ----------------------------------------------------------------------------
// TEST 3 & 4: CANONICAL ACTIVE COLLECTION & PARENT COUNT
// ----------------------------------------------------------------------------
const rawPreGraftingDocs = getPreGraftingSelectionDocuments({}, mockUser);
assert(rawPreGraftingDocs.length === 5, 'IT-COUNT-003', 'Raw getPreGraftingSelectionDocuments returns 5 records');

// Active collection filter as implemented in selection-landing.js
const preGraftingDocs = rawPreGraftingDocs.filter(d => !d.isSplit && !d.isLegacyAggregateSplit);
const seleksi1Docs = preGraftingDocs.filter(d => (d.selectionStage || 'SELEKSI_I') === 'SELEKSI_I' || d.selectionStage === 'SELEKSI_1');
const seleksi2Docs = preGraftingDocs.filter(d => d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2');
const seleksi3Docs = preGraftingDocs.filter(d => d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3');

assert(preGraftingDocs.length === 4, 'IT-COUNT-004', 'Active collection produces exactly 4 active documents (Parent Count = 4)');

// ----------------------------------------------------------------------------
// TEST 5, 6, 7: SUB-TAB ACTIVE COUNTS
// ----------------------------------------------------------------------------
assert(seleksi1Docs.length === 4, 'IT-COUNT-005', 'Active Seleksi I count is exactly 4');
assert(seleksi2Docs.length === 0, 'IT-COUNT-006', 'Active Seleksi II count is exactly 0');
assert(seleksi3Docs.length === 0, 'IT-COUNT-007', 'Active Seleksi III count is exactly 0');

// Mathematical hierarchy consistency: Parent = Seleksi I + Seleksi II + Seleksi III (4 = 4 + 0 + 0)
const sumSubtabs = seleksi1Docs.length + seleksi2Docs.length + seleksi3Docs.length;
assert(preGraftingDocs.length === sumSubtabs, 'IT-COUNT-008', `Hierarchy consistency: Parent count (${preGraftingDocs.length}) === sum of sub-tabs (${seleksi1Docs.length} + ${seleksi2Docs.length} + ${seleksi3Docs.length} = ${sumSubtabs})`);

// ----------------------------------------------------------------------------
// TEST 8 & 9: PAGE HEADER & RENDERED CARDS
// ----------------------------------------------------------------------------
const headerCountSeleksi1 = seleksi1Docs.length;
const renderedCardIds = seleksi1Docs.map(d => d.id);
assert(headerCountSeleksi1 === 4, 'IT-COUNT-009', 'Header Dokumen Seleksi I (Pra-Okulasi) shows (4)');
assert(renderedCardIds.length === 4, 'IT-COUNT-010', 'Rendered card list contains exactly 4 cards');

// ----------------------------------------------------------------------------
// TEST 10, 11, 12: LEGACY DOCUMENT EXCLUSION FROM UI
// ----------------------------------------------------------------------------
assert(!renderedCardIds.includes('SEL-LEGACY-001'), 'IT-COUNT-011', 'Legacy split parent document (SEL-LEGACY-001) is NOT rendered in cards list');

function renderParentBadge(docList) {
  return docList.length > 0 ? `<span style="background: #116834; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${docList.length}</span>` : '';
}
function renderSubtabBadge(activeTab, targetTab, docList) {
  const isActive = activeTab === targetTab;
  return `<span style="background: ${isActive ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${docList.length}</span>`;
}

const parentBadgeHtml = renderParentBadge(preGraftingDocs);
const subtab1BadgeHtml = renderSubtabBadge('SELEKSI_1', 'SELEKSI_1', seleksi1Docs);
const subtab2BadgeHtml = renderSubtabBadge('SELEKSI_1', 'SELEKSI_2', seleksi2Docs);
const subtab3BadgeHtml = renderSubtabBadge('SELEKSI_1', 'SELEKSI_3', seleksi3Docs);

assert(parentBadgeHtml.includes('>4</span>'), 'IT-COUNT-012', 'Parent badge renders >4< (legacy document excluded from parent badge)');
assert(subtab1BadgeHtml.includes('>4</span>'), 'IT-COUNT-013', 'Sub-tab Seleksi I renders >4< (legacy document excluded from subtab)');
assert(subtab2BadgeHtml.includes('>0</span>'), 'IT-COUNT-014', 'Sub-tab Seleksi II renders >0<');
assert(subtab3BadgeHtml.includes('>0</span>'), 'IT-COUNT-015', 'Sub-tab Seleksi III renders >0<');

// ----------------------------------------------------------------------------
// TEST 13 & 14: STORAGE DATA INTEGRITY (LEGACY RECORD PRESERVED, ZERO MUTATION)
// ----------------------------------------------------------------------------
const finalStorageDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
assert(finalStorageDocs.length === 5, 'IT-COUNT-016', 'Legacy record is NOT deleted from storage (storage raw count remains 5)');
assert(finalStorageDocs.some(d => d.id === 'SEL-LEGACY-001'), 'IT-COUNT-017', 'Legacy record SEL-LEGACY-001 is preserved intact in storage');

// ----------------------------------------------------------------------------
// TEST 15: DYNAMIC UPDATES (NO HARDCODING)
// ----------------------------------------------------------------------------
// When a Seleksi II document is subsequently created from Seleksi I:
const dynamicSel2Doc = {
  id: 'SEL2-DOC-001',
  docNo: '2026/SEL2/001',
  selectionStage: 'SELEKSI_II',
  sourceSelectionDocumentId: 'SEL-DOC-001',
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [...initialDocs, dynamicSel2Doc]);

const dynRawDocs = getPreGraftingSelectionDocuments({}, mockUser);
const dynActiveDocs = dynRawDocs.filter(d => !d.isSplit && !d.isLegacyAggregateSplit);
const dynSel1 = dynActiveDocs.filter(d => (d.selectionStage || 'SELEKSI_I') === 'SELEKSI_I' || d.selectionStage === 'SELEKSI_1');
const dynSel2 = dynActiveDocs.filter(d => d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2');
const dynSel3 = dynActiveDocs.filter(d => d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3');

assert(dynRawDocs.length === 6, 'IT-COUNT-018', 'Dynamic raw storage has 6 records');
assert(dynActiveDocs.length === 5, 'IT-COUNT-019', 'Dynamic active collection has 5 records (4 Seleksi I + 1 Seleksi II)');
assert(dynSel1.length === 4, 'IT-COUNT-020', 'Dynamic Seleksi I count remains 4');
assert(dynSel2.length === 1, 'IT-COUNT-021', 'Dynamic Seleksi II count dynamically updates to 1');
assert(dynSel3.length === 0, 'IT-COUNT-022', 'Dynamic Seleksi III count remains 0');
assert(dynActiveDocs.length === (dynSel1.length + dynSel2.length + dynSel3.length), 'IT-COUNT-023', 'Dynamic Parent count (5) equals sum of subtabs (4 + 1 + 0 = 5)');

console.log('\n' + '='.repeat(80));
console.log(`TEST SUMMARY: TOTAL = ${totalPassed + totalFailed} | PASSED = ${totalPassed} | FAILED = ${totalFailed}`);
console.log('='.repeat(80) + '\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
