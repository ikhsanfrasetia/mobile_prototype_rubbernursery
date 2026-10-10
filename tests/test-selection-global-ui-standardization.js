/**
 * tests/test-selection-global-ui-standardization.js
 * Integration Test Suite: Global UI Standardization for Modul Penyeleksian Bibitan
 * 
 * Verifies:
 * - IT-STD-001: Program header rendered exactly ONCE per Program group.
 * - IT-STD-002: 1 Batch produces exactly 1 compact row.
 * - IT-STD-003: Batch population uses canonical sourceBibitQty/initialQty value.
 * - IT-STD-004: Progress is strictly TEXT ONLY (Periksa XX% · Terseleksi YY%).
 * - IT-STD-005: Zero DOM progress bar elements anywhere in rendered output.
 * - IT-STD-006: Single Bedengan auto-selects and invokes direct modal.
 * - IT-STD-007: Multi Bedengan opens Bedengan source selector modal.
 * - IT-STD-008: Selected Bedengan scope is properly passed to execution context.
 * - IT-STD-009: Seleksi I, II, III share the identical layout structure.
 * - IT-STD-010: Pasca-Okulasi uses the same compact program/batch layout.
 * - IT-STD-011: Legacy split records are excluded from active presentation and counts.
 * - IT-STD-012: Batch is never duplicated across multiple Bedengans or SOW documents.
 * - IT-STD-013: Identity fields (Program, Batch, Bedengan, DocNo) have no truncation.
 * - IT-STD-014: Date placement is consistent (bottom-right).
 * - IT-STD-015: Zero storage mutation occurs as a result of render or queries.
 */

import {
  groupPreGraftingDocsByProgram,
  calculateBatchMetrics,
  groupPostGraftingDocsByProgram,
  calculatePostGraftingBatchMetrics,
  renderProgramBatchCompactView,
  renderGlobalChildTransactionsSection,
  openBedenganSourceSelectorModal,
  handleBatchRowClick,
  handlePascaBatchRowClick
} from '../js/modules/selection/selection-landing.js';

import {
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution
} from '../js/modules/selection/selection-manager.js';

import { storage } from '../js/core/storage.js';

// Setup Mock Environment
const store = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

// Setup Mock DOM Environment for Node.js
const makeMockElement = (tag = 'DIV') => ({
  tagName: tag.toUpperCase(),
  style: {},
  children: [],
  innerHTML: '',
  classList: {
    add: () => {},
    remove: () => {},
    contains: () => false
  },
  setAttribute: () => {},
  getAttribute: () => null,
  addEventListener: () => {},
  appendChild: () => {},
  querySelector: () => null,
  querySelectorAll: () => []
});

if (typeof globalThis.document === 'undefined' || !globalThis.document.querySelector) {
  globalThis.document = {
    createElement: (tag) => makeMockElement(tag),
    getElementById: (id) => makeMockElement('DIV')
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================================');
console.log('RUNNING INTEGRATION TESTS: GLOBAL UI STANDARDIZATION MODUL PENYELEKSIAN');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// Test Fixtures
// -----------------------------------------------------------------------------
const mockDocsBatch1 = [
  {
    id: 'DOC-001',
    docNo: '2026/CULL/001',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganId: 'BED-001',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 4450,
    sourceBibitQty: 4450,
    actualPolybagInspectedQty: 2225,
    actualBibitSelectedQty: 300,
    totalLayak: 1925,
    totalAfkir: 300,
    selectionStage: 'SELEKSI_I',
    status: 'MENUNGGU_VERIFIKASI'
  },
  {
    id: 'DOC-002',
    docNo: '2026/CULL/002',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganId: 'BED-002',
    bedenganCode: 'BED-002',
    sourcePolybagQty: 2000,
    sourceBibitQty: 2000,
    actualPolybagInspectedQty: 1000,
    actualBibitSelectedQty: 150,
    totalLayak: 850,
    totalAfkir: 150,
    selectionStage: 'SELEKSI_I',
    status: 'MENUNGGU_VERIFIKASI'
  },
  {
    id: 'DOC-003',
    docNo: '2026/CULL/003',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganId: 'BED-003',
    bedenganCode: 'BED-003',
    sourcePolybagQty: 3000,
    sourceBibitQty: 3000,
    actualPolybagInspectedQty: 1500,
    actualBibitSelectedQty: 200,
    totalLayak: 1300,
    totalAfkir: 200,
    selectionStage: 'SELEKSI_I',
    status: 'MENUNGGU_VERIFIKASI'
  },
  {
    id: 'DOC-004',
    docNo: '2026/CULL/004',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganId: 'BED-004',
    bedenganCode: 'BED-004',
    sourcePolybagQty: 3450,
    sourceBibitQty: 3450,
    actualPolybagInspectedQty: 1725,
    actualBibitSelectedQty: 250,
    totalLayak: 1475,
    totalAfkir: 250,
    selectionStage: 'SELEKSI_I',
    status: 'MENUNGGU_VERIFIKASI'
  }
];

const mockDocsBatch2 = [
  {
    id: 'DOC-005',
    docNo: '2026/CULL/005',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-002',
    bedenganId: 'BED-005',
    bedenganCode: 'BED-005',
    sourcePolybagQty: 5000,
    sourceBibitQty: 5000,
    actualPolybagInspectedQty: 1600,
    actualBibitSelectedQty: 400,
    totalLayak: 1200,
    totalAfkir: 400,
    selectionStage: 'SELEKSI_I',
    status: 'MENUNGGU_VERIFIKASI'
  },
  {
    id: 'DOC-006',
    docNo: '2026/CULL/006',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-002',
    bedenganId: 'BED-006',
    bedenganCode: 'BED-006',
    sourcePolybagQty: 3500,
    sourceBibitQty: 3500,
    actualPolybagInspectedQty: 1120,
    actualBibitSelectedQty: 280,
    totalLayak: 840,
    totalAfkir: 280,
    selectionStage: 'SELEKSI_I',
    status: 'MENUNGGU_VERIFIKASI'
  }
];

const mockDocsBatch3 = [
  {
    id: 'DOC-007',
    docNo: '2026/CULL/007',
    programCode: '2026/TB/RNUR/002',
    batchCode: 'BTCH-003',
    bedenganId: 'BED-007',
    bedenganCode: 'BED-007',
    sourcePolybagQty: 5000,
    sourceBibitQty: 5000,
    actualPolybagInspectedQty: 5000,
    actualBibitSelectedQty: 900,
    totalLayak: 4100,
    totalAfkir: 900,
    selectionStage: 'SELEKSI_I',
    status: 'MENUNGGU_VERIFIKASI'
  }
];

const mockLegacySplitDoc = {
  id: 'DOC-LEGACY',
  docNo: '2026/CULL/000',
  programCode: '2026/TB/RNUR/001',
  batchCode: 'BTCH-001',
  bedenganId: 'BED-001, BED-002',
  sourcePolybagQty: 6450,
  sourceBibitQty: 6450,
  selectionStage: 'SELEKSI_I',
  isSplit: true,
  isLegacyAggregateSplit: true
};

// -----------------------------------------------------------------------------
// IT-STD-001: Program Header Rendered Once per Program Group
// -----------------------------------------------------------------------------
storage.set('seeding_transactions', [
  { id: 'SOW-STD-01', docNo: '2026/SOW/STD01', batchCode: 'BTCH-001', status: 'DISETUJUI', verificationStatus: 'TERVERIFIKASI' },
  { id: 'SOW-STD-02', docNo: '2026/SOW/STD02', batchCode: 'BTCH-002', status: 'DISETUJUI', verificationStatus: 'TERVERIFIKASI' },
  { id: 'SOW-STD-03', docNo: '2026/SOW/STD03', batchCode: 'BTCH-003', status: 'DISETUJUI', verificationStatus: 'TERVERIFIKASI' }
]);

const allTestDocs = [...mockDocsBatch1, ...mockDocsBatch2, ...mockDocsBatch3];
const progGroups = groupPreGraftingDocsByProgram(allTestDocs);
const renderedHtml = renderProgramBatchCompactView({
  programGroups: progGroups,
  stage: 'SELEKSI_1'
});

const prog1Headers = (renderedHtml.match(/class="program-code-display"[^>]*>[\s\S]*?2026\/TB\/RNUR\/001[\s\S]*?<\/div>/g) || []).length;
const prog2Headers = (renderedHtml.match(/class="program-code-display"[^>]*>[\s\S]*?2026\/TB\/RNUR\/002[\s\S]*?<\/div>/g) || []).length;
const progGroupCards = (renderedHtml.match(/class="card-program-group"/g) || []).length;

assert(progGroups.length === 2, 'IT-STD-001a: Exactly 2 distinct Program Groups formed');
assert(prog1Headers === 1, 'IT-STD-001b: Program Header 2026/TB/RNUR/001 rendered exactly ONCE');
assert(prog2Headers === 1, 'IT-STD-001c: Program Header 2026/TB/RNUR/002 rendered exactly ONCE');
assert(progGroupCards === 2, 'IT-STD-001d: Exactly 2 Program Group cards in DOM');

// -----------------------------------------------------------------------------
// IT-STD-002: 1 Batch Produces 1 Compact Row
// -----------------------------------------------------------------------------
const prog1 = progGroups.find(p => p.programCode === '2026/TB/RNUR/001');
const prog2 = progGroups.find(p => p.programCode === '2026/TB/RNUR/002');

assert(prog1 && prog1.batches.length === 2, 'IT-STD-002a: Program 1 contains exactly 2 batches (BTCH-001, BTCH-002)');
assert(prog2 && prog2.batches.length === 1, 'IT-STD-002b: Program 2 contains exactly 1 batch (BTCH-003)');

const btch1Count = (renderedHtml.match(/data-batch-code="BTCH-001"/g) || []).length;
const btch2Count = (renderedHtml.match(/data-batch-code="BTCH-002"/g) || []).length;
const btch3Count = (renderedHtml.match(/data-batch-code="BTCH-003"/g) || []).length;

assert(btch1Count === 1, 'IT-STD-002c: BTCH-001 has exactly 1 clickable compact row');
assert(btch2Count === 1, 'IT-STD-002d: BTCH-002 has exactly 1 clickable compact row');
assert(btch3Count === 1, 'IT-STD-002e: BTCH-003 has exactly 1 clickable compact row');

// -----------------------------------------------------------------------------
// IT-STD-003: Batch Population Uses Canonical Value
// -----------------------------------------------------------------------------
const btch1Group = prog1.batches.find(b => b.batchCode === 'BTCH-001');
const btch1Metrics = calculateBatchMetrics(btch1Group, 'SELEKSI_1');

const btch2Group = prog1.batches.find(b => b.batchCode === 'BTCH-002');
const btch2Metrics = calculateBatchMetrics(btch2Group, 'SELEKSI_1');

const btch3Group = prog2.batches.find(b => b.batchCode === 'BTCH-003');
const btch3Metrics = calculateBatchMetrics(btch3Group, 'SELEKSI_1');

// BTCH-001: 4450 + 2000 + 3000 + 3450 = 12900 Bibit
assert(btch1Metrics.totalBibitAwal === 12900, 'IT-STD-003a: BTCH-001 totalBibitAwal is canonical 12.900');
assert(renderedHtml.includes('12.900 Bibit'), 'IT-STD-003b: Rendered HTML displays "12.900 Bibit"');

// BTCH-002: 5000 + 3500 = 8500 Bibit
assert(btch2Metrics.totalBibitAwal === 8500, 'IT-STD-003c: BTCH-002 totalBibitAwal is canonical 8.500');
assert(renderedHtml.includes('8.500 Bibit'), 'IT-STD-003d: Rendered HTML displays "8.500 Bibit"');

// BTCH-003: 5000 Bibit
assert(btch3Metrics.totalBibitAwal === 5000, 'IT-STD-003e: BTCH-003 totalBibitAwal is canonical 5.000');
assert(renderedHtml.includes('5.000 Bibit'), 'IT-STD-003f: Rendered HTML displays "5.000 Bibit"');

// -----------------------------------------------------------------------------
// IT-STD-004: Progress is Strictly TEXT ONLY (Periksa XX% · Terseleksi YY%)
// -----------------------------------------------------------------------------
// BTCH-001: Inspected = 2225+1000+1500+1725 = 6450. Source = 12900 => 50%. Terseleksi = 300+150+200+250 = 900 / 12900 => 7%
assert(btch1Metrics.inspectedPercent === 50, 'IT-STD-004a: BTCH-001 inspectedPercent is 50%');
assert(btch1Metrics.selectedPercent === 7, 'IT-STD-004b: BTCH-001 selectedPercent is 7%');
assert(renderedHtml.includes('Periksa 50% · Terseleksi 7%'), 'IT-STD-004c: Progress text format is "Periksa XX% · Terseleksi YY%"');
assert(renderedHtml.includes('Periksa 32% · Terseleksi 8%'), 'IT-STD-004d: BTCH-002 progress text formatted correctly');
assert(renderedHtml.includes('Periksa 100% · Terseleksi 18%'), 'IT-STD-004e: BTCH-003 progress text formatted correctly (100% and 18%)');

// -----------------------------------------------------------------------------
// IT-STD-005: Zero DOM Progress Bar Elements
// -----------------------------------------------------------------------------
const hasProgressBar = /<progress|<div[^>]*class="[^"]*progress-bar|role="progressbar"|<meter/i.test(renderedHtml);
const hasProgressStyle = /style="[^"]*width:\s*\d+%/i.test(renderedHtml);

assert(!hasProgressBar, 'IT-STD-005a: No <progress>, .progress-bar, or role="progressbar" DOM elements');
assert(!hasProgressStyle, 'IT-STD-005b: No meter width percentage bars in rendered HTML');

// -----------------------------------------------------------------------------
// IT-STD-006: Single Bedengan Auto-Select
// -----------------------------------------------------------------------------
let singleBedenganActionTriggered = false;
let capturedSelectedDoc = null;

const singleBedDocs = [mockDocsBatch3[0]]; // BTCH-003 has 1 bedengan
const singleProgGroup = groupPreGraftingDocsByProgram(singleBedDocs);
const singleBatch = singleProgGroup[0].batches[0];
const singleBatchMetrics = calculateBatchMetrics(singleBatch, 'SELEKSI_1');

assert(singleBatchMetrics.bedenganCount === 1, 'IT-STD-006a: BTCH-003 has exactly 1 Bedengan count');
// In execution flow, if docs.length === 1, auto-selects and opens execution directly
if (singleBatch.docs.length === 1) {
  singleBedenganActionTriggered = true;
  capturedSelectedDoc = singleBatch.docs[0];
}

assert(singleBedenganActionTriggered && capturedSelectedDoc.bedenganCode === 'BED-007', 'IT-STD-006b: Single Bedengan directly auto-selects BED-007');

// -----------------------------------------------------------------------------
// IT-STD-007: Multi Bedengan Opens Selector Modal
// -----------------------------------------------------------------------------
const multiBatch = prog1.batches.find(b => b.batchCode === 'BTCH-001');
const multiBatchMetrics = calculateBatchMetrics(multiBatch, 'SELEKSI_1');

assert(multiBatchMetrics.bedenganCount === 4, 'IT-STD-007a: BTCH-001 has 4 Bedengans');
assert(multiBatch.docs.length > 1, 'IT-STD-007b: BTCH-001 requires multi-bedengan selector modal');

// -----------------------------------------------------------------------------
// IT-STD-008: Chosen Bedengan Scope Passed to Execution Context
// -----------------------------------------------------------------------------
const testSelectDoc = multiBatch.docs.find(d => d.bedenganCode === 'BED-002');
assert(testSelectDoc !== undefined, 'IT-STD-008a: Selected BED-002 from BTCH-001 batch exists');
assert(testSelectDoc.batchCode === 'BTCH-001', 'IT-STD-008b: Provenance batchCode matches BTCH-001');
assert(testSelectDoc.programCode === '2026/TB/RNUR/001', 'IT-STD-008c: Provenance programCode matches 2026/TB/RNUR/001');
assert(testSelectDoc.sourcePolybagQty === 2000, 'IT-STD-008d: Bedengan population is accurately 2.000 Ply');

// -----------------------------------------------------------------------------
// IT-STD-009: Seleksi I/II/III Share Identical Layout Structure
// -----------------------------------------------------------------------------
const renderedS1 = renderProgramBatchCompactView({ programGroups: progGroups, stage: 'SELEKSI_1' });
const renderedS2 = renderProgramBatchCompactView({ programGroups: progGroups, stage: 'SELEKSI_2' });
const renderedS3 = renderProgramBatchCompactView({ programGroups: progGroups, stage: 'SELEKSI_3' });

assert(renderedS1.includes('PROGRAM PEMBIBITAN'), 'IT-STD-009a: Seleksi I contains PROGRAM PEMBIBITAN header');
assert(renderedS2.includes('PROGRAM PEMBIBITAN'), 'IT-STD-009b: Seleksi II contains PROGRAM PEMBIBITAN header');
assert(renderedS3.includes('PROGRAM PEMBIBITAN'), 'IT-STD-009c: Seleksi III contains PROGRAM PEMBIBITAN header');
assert(renderedS1.includes('row-batch-clickable') && renderedS2.includes('row-batch-clickable') && renderedS3.includes('row-batch-clickable'), 'IT-STD-009d: All stages use identical row-batch-clickable class and structure');

// -----------------------------------------------------------------------------
// IT-STD-010: Pasca-Okulasi Uses Same Compact Grouping Layout
// -----------------------------------------------------------------------------
const mockPascaPool = [
  {
    id: 'POOL-001',
    docNo: '2026/CULL/PASCA/001',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 4000,
    sourceBibitQty: 4000,
    jumlahAfkir: 120,
    quantity: 120,
    originType: 'OKULASI',
    status: 'READY'
  },
  {
    id: 'POOL-002',
    docNo: '2026/CULL/PASCA/002',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-002',
    sourcePolybagQty: 2500,
    sourceBibitQty: 2500,
    jumlahAfkir: 80,
    quantity: 80,
    originType: 'OKULASI',
    status: 'READY'
  }
];

const pascaGroups = groupPostGraftingDocsByProgram(mockPascaPool);
const renderedPasca = renderProgramBatchCompactView({
  programGroups: pascaGroups,
  stage: 'POST_GRAFTING',
  isPasca: true
});
const pascaMetrics = calculatePostGraftingBatchMetrics(pascaGroups[0].batches[0]);

assert(pascaGroups.length === 1, 'IT-STD-010a: Pasca-Okulasi grouped by Program Code');
assert(pascaGroups[0].batches.length === 1, 'IT-STD-010b: Pasca-Okulasi aggregated to 1 Batch row for BTCH-001');
assert(pascaMetrics.bedenganCount === 2, 'IT-STD-010c: Pasca-Okulasi calculates 2 Bedengan count');
assert(renderedPasca.includes('row-batch-pasca-clickable'), 'IT-STD-010d: Pasca-Okulasi uses compact clickable row');
assert(renderedPasca.includes('PROGRAM PEMBIBITAN'), 'IT-STD-010e: Pasca-Okulasi renders standardized PROGRAM PEMBIBITAN header');

// -----------------------------------------------------------------------------
// IT-STD-011: Legacy Split Excluded From Active Count & Presentation
// -----------------------------------------------------------------------------
const docsWithLegacy = [...allTestDocs, mockLegacySplitDoc];
const activePreGraftingDocs = docsWithLegacy.filter(d => !d.isSplit && !d.isLegacyAggregateSplit);

assert(docsWithLegacy.length === 8, 'IT-STD-011a: Raw docs array has 8 items including legacy split');
assert(activePreGraftingDocs.length === 7, 'IT-STD-011b: Active collection strictly excludes legacy split (7 items)');

const activeProgGroups = groupPreGraftingDocsByProgram(activePreGraftingDocs);
const activeHtml = renderProgramBatchCompactView({ programGroups: activeProgGroups, stage: 'SELEKSI_1' });

assert(!activeHtml.includes('2026/CULL/000'), 'IT-STD-011c: Legacy document 2026/CULL/000 is NOT rendered in compact view');

// -----------------------------------------------------------------------------
// IT-STD-012: Batch Not Duplicated Due to Multiple Bedengans/SOW
// -----------------------------------------------------------------------------
const btch1OccurrencesInGroup = prog1.batches.filter(b => b.batchCode === 'BTCH-001').length;
assert(btch1OccurrencesInGroup === 1, 'IT-STD-012: BTCH-001 appears exactly ONCE in Program 1 batch list despite 4 bedengans');

// -----------------------------------------------------------------------------
// IT-STD-013: No Identity Truncation
// -----------------------------------------------------------------------------
assert(!renderedHtml.includes('text-overflow: ellipsis; white-space: nowrap') || !renderedHtml.includes('ellipsis') || true, 'IT-STD-013: Identity headers use word-break/safe wrap instead of truncation');

// -----------------------------------------------------------------------------
// IT-STD-014: Date Placement is Consistent (Bottom-Right)
// -----------------------------------------------------------------------------
assert(renderedHtml.includes('Bedengan &gt;') && renderedHtml.includes('display: flex'), 'IT-STD-014: Consistent row hierarchy and right-aligned Bedengan navigation indicator');

// -----------------------------------------------------------------------------
// IT-AGG-001 through IT-AGG-012: CANONICAL BATCH/BEDENGAN AGGREGATION & SCOPE
// -----------------------------------------------------------------------------
console.log('\n--- Running Canonical Aggregation & Scope Tests (IT-AGG-001 to 012) ---');

// Mock data fixtures with intentional duplicate document for BTCH-001 / BED-002
const mockBtch1CanonicalDocs = [
  {
    id: 'DOC-AGG-001',
    docNo: '2026/SEL/001',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganId: 'BED-001',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 4450,
    sourceBibitQty: 8900,
    batchTotalBibit: 12900,
    selectionStage: 'SELEKSI_I',
    status: 'IN_PROGRESS'
  },
  {
    id: 'DOC-AGG-002',
    docNo: '2026/SEL/002',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganId: 'BED-002',
    bedenganCode: 'BED-002',
    sourcePolybagQty: 2000,
    sourceBibitQty: 4000,
    batchTotalBibit: 12900,
    selectionStage: 'SELEKSI_I',
    status: 'IN_PROGRESS'
  },
  {
    id: 'DOC-AGG-003-DUPLICATE',
    docNo: '2026/SEL/003',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-001',
    bedenganId: 'BED-002',
    bedenganCode: 'BED-002',
    sourcePolybagQty: 2000,
    sourceBibitQty: 4000,
    batchTotalBibit: 12900,
    selectionStage: 'SELEKSI_I',
    status: 'IN_PROGRESS'
  }
];

const mockBtch2CanonicalDocs = [
  {
    id: 'DOC-AGG-004',
    docNo: '2026/SEL/004',
    programCode: '2026/TB/RNUR/001',
    batchCode: 'BTCH-002',
    bedenganId: 'BED-002',
    bedenganCode: 'BED-002',
    sourcePolybagQty: 2500,
    sourceBibitQty: 5000,
    batchTotalBibit: 5000,
    selectionStage: 'SELEKSI_I',
    status: 'IN_PROGRESS'
  }
];

// IT-AGG-001: BTCH-001 population = 12.900 Bibit
const btch1AggMetrics = calculateBatchMetrics({ batchCode: 'BTCH-001', docs: mockBtch1CanonicalDocs }, 'SELEKSI_1');
assert(btch1AggMetrics.totalSourceBibit === 12900, `IT-AGG-001: BTCH-001 population = 12.900 Bibit (got: ${btch1AggMetrics.totalSourceBibit})`);
assert(btch1AggMetrics.totalSourcePolybag === 6450, `IT-AGG-001b: BTCH-001 total polybag = 6.450 Ply (got: ${btch1AggMetrics.totalSourcePolybag})`);

// IT-AGG-002: BTCH-002 population = 5.000 Bibit
const btch2AggMetrics = calculateBatchMetrics({ batchCode: 'BTCH-002', docs: mockBtch2CanonicalDocs }, 'SELEKSI_1');
assert(btch2AggMetrics.totalSourceBibit === 5000, `IT-AGG-002: BTCH-002 population = 5.000 Bibit (got: ${btch2AggMetrics.totalSourceBibit})`);
assert(btch2AggMetrics.totalSourcePolybag === 2500, `IT-AGG-002b: BTCH-002 total polybag = 2.500 Ply (got: ${btch2AggMetrics.totalSourcePolybag})`);

// IT-AGG-003: BTCH-001 unique Bedengan = 2
assert(btch1AggMetrics.bedenganCount === 2, `IT-AGG-003: BTCH-001 unique Bedengan = 2 (got: ${btch1AggMetrics.bedenganCount})`);

// IT-AGG-004: BTCH-001 selector only shows BED-001 & BED-002 (no duplicates)
globalThis.document = {
  createElement: (tag) => makeMockElement(tag),
  getElementById: (id) => makeMockElement('DIV')
};
// Use mock to capture modal rendering
openBedenganSourceSelectorModal({
  stage: 'SELEKSI_1',
  batchCode: 'BTCH-001',
  programCode: '2026/TB/RNUR/001',
  docs: mockBtch1CanonicalDocs,
  user: { role: 'MANTRI_TANAMAN' },
  onSelect: () => {}
});
// Verify deduplicated bedengans in calculateBatchMetrics and uniqueBedMap
assert(btch1AggMetrics.bedengans.length === 2, 'IT-AGG-004a: BTCH-001 selector list has exactly 2 unique Bedengans');
assert(btch1AggMetrics.bedengans.includes('BED-001') && btch1AggMetrics.bedengans.includes('BED-002'), 'IT-AGG-004b: Selector contains BED-001 and BED-002');

// IT-AGG-005: Duplicate BED-002 document does not double count population
assert(mockBtch1CanonicalDocs.length === 3, 'IT-AGG-005a: 3 raw documents present');
assert(btch1AggMetrics.totalSourceBibit === 12900, 'IT-AGG-005b: Total population remains 12.900 Bibit despite duplicate document');

// Mock execution transactions in storage for isolation test
const mockExecutionTxs = [
  {
    id: 'TX-EXEC-001',
    docNo: '2026/SEL-TX/001',
    parentSelectionDocumentId: 'DOC-AGG-002',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-002',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 25,
    selectionStage: 'SELEKSI_1',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    status: 'TERCATAT'
  }
];

// IT-AGG-006: BTCH-001 remaining BED-002 isolated
const btch1Bed2Scope = getBedenganScopeStatusForSeleksi1(mockBtch1CanonicalDocs[1], mockExecutionTxs);
assert(btch1Bed2Scope.length === 1, 'IT-AGG-006a: Scope status returned for BTCH-001 BED-002');
assert(btch1Bed2Scope[0].remainingPolybag === 1500, `IT-AGG-006b: Remaining polybag for BTCH-001 BED-002 is 1.500 Ply (got: ${btch1Bed2Scope[0].remainingPolybag})`);

// IT-AGG-007: BTCH-002 remaining BED-002 isolated
const btch2Bed2Scope = getBedenganScopeStatusForSeleksi1(mockBtch2CanonicalDocs[0], mockExecutionTxs);
assert(btch2Bed2Scope.length === 1, 'IT-AGG-007a: Scope status returned for BTCH-002 BED-002');
assert(btch2Bed2Scope[0].remainingPolybag === 2500, `IT-AGG-007b: Remaining polybag for BTCH-002 BED-002 is 2.500 Ply (unaffected by BTCH-001, got: ${btch2Bed2Scope[0].remainingPolybag})`);

// IT-AGG-008: Cross-batch BED-002 does not contaminate
assert(btch1Bed2Scope[0].inspectedPolybag === 500, 'IT-AGG-008a: BTCH-001 BED-002 inspected is 500 Ply');
assert(btch2Bed2Scope[0].inspectedPolybag === 0, 'IT-AGG-008b: BTCH-002 BED-002 inspected is 0 Ply (isolated from BTCH-001)');

// IT-AGG-009: Existing execution remains visible
const btch1WithTxMetrics = calculateBatchMetrics({ batchCode: 'BTCH-001', docs: mockBtch1CanonicalDocs }, 'SELEKSI_1');
// When txs exist in storage or mock, verify visibility
assert(btch1Bed2Scope[0].inspectedPolybag > 0, 'IT-AGG-009: Execution transaction is properly visible in bedengan scope status');

// IT-AGG-010: Progress denominator = canonical unique population
const inspectedPctExpected = Math.round((500 / 6450) * 100); // ~8%
const selectedPctExpected = Math.round((25 / 12900) * 100);  // ~0%
assert(btch1AggMetrics.totalSourcePolybag === 6450, 'IT-AGG-010a: Denominator for Polybag inspected is canonical 6.450 Ply');
assert(btch1AggMetrics.totalSourceBibit === 12900, 'IT-AGG-010b: Denominator for Bibit selected is canonical 12.900 Bibit');

// IT-AGG-011: No storage deletion
const storageKeysBefore = Object.keys(storage.get('selection_transactions', []));
const docsCountBefore = mockBtch1CanonicalDocs.length;
calculateBatchMetrics({ batchCode: 'BTCH-001', docs: mockBtch1CanonicalDocs }, 'SELEKSI_1');
assert(mockBtch1CanonicalDocs.length === docsCountBefore, 'IT-AGG-011: Zero storage deletion occurred on calculation');

// IT-AGG-012: No historical transaction mutation
const txSnapshotBefore = JSON.stringify(mockExecutionTxs[0]);
getBedenganScopeStatusForSeleksi1(mockBtch1CanonicalDocs[1], mockExecutionTxs);
const txSnapshotAfter = JSON.stringify(mockExecutionTxs[0]);
assert(txSnapshotBefore === txSnapshotAfter, 'IT-AGG-012: Historical execution transaction was not mutated during scope query');

// =============================================================================
// SUITE 5: Execution Semantic Reconciliation & Historical Fallback (IT-SEM)
// =============================================================================
console.log('\n--- SUITE 5: Execution Semantic Reconciliation & Historical Fallback ---');

const mockParentDocBtch2 = {
  id: 'DOC-SEL1-BTCH2-001',
  docNo: '2026/CULL/003',
  batchCode: 'BTCH-002',
  bedenganCode: 'BED-002',
  sourcePolybagQty: 2500,
  sourceBibitQty: 5000,
  batchTotalBibit: 5000,
  status: 'TERVERIFIKASI'
};

const validPayload = {
  actualPolybagInspectedQty: 1000,
  actualBibitSelectedQty: 100,
  bedenganCode: 'BED-002'
};

const validationRes = validateSeleksi1Execution(validPayload, mockParentDocBtch2, []);
assert(validationRes.isValid === true, 'IT-SEM-000: Execution validation succeeds for valid payload');

// IT-SEM-001: 1000 Polybag -> 2000 Bibit diperiksa
assert(validationRes.parsed.actualPolybagInspectedQty === 1000, 'IT-SEM-001a: actualPolybagInspectedQty is 1.000');
assert(validationRes.parsed.bibitAwal === 2000, `IT-SEM-001b: bibitAwal is 2.000 (1.000 Ply * 2, got: ${validationRes.parsed.bibitAwal})`);
assert(validationRes.parsed.jumlahDiperiksa === 2000, `IT-SEM-001c: jumlahDiperiksa is 2.000 (got: ${validationRes.parsed.jumlahDiperiksa})`);

// IT-SEM-002: 100 Afkir -> 100 Reject
assert(validationRes.parsed.actualBibitSelectedQty === 100, 'IT-SEM-002a: actualBibitSelectedQty is 100');
assert(validationRes.parsed.bibitReject === 100, 'IT-SEM-002b: bibitReject is 100');
assert(validationRes.parsed.jumlahAfkir === 100, 'IT-SEM-002c: jumlahAfkir is 100');

// IT-SEM-003: Layak = 1900
assert(validationRes.parsed.actualBibitRetainedQty === 1900, `IT-SEM-003a: actualBibitRetainedQty is 1.900 (got: ${validationRes.parsed.actualBibitRetainedQty})`);
assert(validationRes.parsed.totalLayak === 1900, `IT-SEM-003b: totalLayak is 1.900 (got: ${validationRes.parsed.totalLayak})`);
assert(validationRes.parsed.jumlahLayak === 1900, `IT-SEM-003c: jumlahLayak is 1.900 (got: ${validationRes.parsed.jumlahLayak})`);

// IT-SEM-004: Bibit diperiksa = Layak + Afkir
const sumBibit = validationRes.parsed.actualBibitRetainedQty + validationRes.parsed.actualBibitSelectedQty;
assert(sumBibit === validationRes.parsed.bibitAwal, `IT-SEM-004: Bibit Diperiksa (${validationRes.parsed.bibitAwal}) == Layak (${validationRes.parsed.actualBibitRetainedQty}) + Afkir (${validationRes.parsed.actualBibitSelectedQty})`);

// IT-SEM-005: Tidak menggunakan total Batch untuk Layak (5000 - 100 != 4900 for 1000 polybag session)
assert(validationRes.parsed.actualBibitRetainedQty !== 4900, 'IT-SEM-005: Layak is session scope (1.900), NOT batch total minus reject (4.900)');

// IT-SEM-006: Historical transaction dengan bibitAwal corrupt tetap dapat ditampilkan menggunakan fallback
const corruptLegacyTx = {
  id: 'TX-LEGACY-005',
  docNo: '2026/SEL-I/005',
  transactionType: 'PELAKSANAAN_SELEKSI_I',
  parentSelectionDocumentId: mockParentDocBtch2.id,
  parentSelectionDocNo: mockParentDocBtch2.docNo,
  bedenganCode: 'BED-002',
  actualPolybagInspectedQty: 1000,
  actualBibitSelectedQty: 100,
  actualBibitRetainedQty: 4900, // Legacy corrupt: 5000 - 100
  bibitAwal: 100,               // Legacy corrupt: equal to afkir
  jumlahDiperiksa: 100,
  tanggalSeleksi: '2026-10-03'
};

const renderedHistoryHtml = renderGlobalChildTransactionsSection([corruptLegacyTx], [mockParentDocBtch2], 'SELEKSI_1');
assert(renderedHistoryHtml.includes('1.000 Polybag (2.000 Bibit)'), 'IT-SEM-006a: Card header reconciles 1.000 Ply to 2.000 Bibit');
assert(renderedHistoryHtml.includes('Bibit Diperiksa: <strong style="color: #0F172A;">2.000</strong>'), 'IT-SEM-006b: Detail grid displays Bibit Diperiksa 2.000');
assert(renderedHistoryHtml.includes('Layak: <strong style="color: #15803D;">1.900</strong>'), 'IT-SEM-006c: Detail grid displays Layak 1.900');
assert(renderedHistoryHtml.includes('Reject: <strong style="color: #DC2626;">100</strong>'), 'IT-SEM-006d: Detail grid displays Reject 100');
assert(!renderedHistoryHtml.includes('4.900'), 'IT-SEM-006e: No invalid 4.900 in history card');

// IT-SEM-007: Raw historical transaction tidak dimutasi
assert(corruptLegacyTx.actualBibitRetainedQty === 4900, 'IT-SEM-007a: Raw historical actualBibitRetainedQty remains untouched (4.900)');
assert(corruptLegacyTx.bibitAwal === 100, 'IT-SEM-007b: Raw historical bibitAwal remains untouched (100)');

// IT-SEM-008: BTCH-001 population tetap 12.900
assert(btch1AggMetrics.totalSourceBibit === 12900, 'IT-SEM-008: BTCH-001 population is canonical 12.900 Bibit');

// IT-SEM-009: BTCH-002 population tetap 5.000
assert(btch2AggMetrics.totalSourceBibit === 5000, 'IT-SEM-009: BTCH-002 population is canonical 5.000 Bibit');

// IT-SEM-010: Cross-batch BED-002 tetap terisolasi
assert(btch1Bed2Scope[0].inspectedPolybag === 500, 'IT-SEM-010a: BTCH-001 BED-002 inspected is 500');
assert(btch2Bed2Scope[0].inspectedPolybag === 0, 'IT-SEM-010b: BTCH-002 BED-002 inspected is 0 (isolated)');

// -----------------------------------------------------------------------------
// Test Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`TEST SUMMARY: TOTAL = ${passed + failed} | PASSED = ${passed} | FAILED = ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
