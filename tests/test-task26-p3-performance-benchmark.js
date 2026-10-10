/**
 * tests/test-task26-p3-performance-benchmark.js
 * Comprehensive Equivalence & Synthetic Performance Benchmark for Task 26 (P3 Optimization).
 */

import { storage } from '../js/core/storage.js';
import { findDownstreamDependency, isReceiptUsedAsReference, isReceiptLocked } from '../js/core/dependency-guard.js';

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
console.log('STARTING TESTS: TASK 26 (P3) PERFORMANCE & EQUIVALENCE');
console.log('====================================================\n');

// Mock storage setup
const mockDb = {};
storage.get = (key, fallback = null) => {
  return mockDb[key] !== undefined ? JSON.parse(JSON.stringify(mockDb[key])) : fallback;
};
storage.set = (key, val) => {
  mockDb[key] = JSON.parse(JSON.stringify(val));
};

function resetDb() {
  for (const k in mockDb) delete mockDb[k];
  mockDb['receipt_transactions'] = [];
  mockDb['dederan_transactions'] = [];
  mockDb['dederan_induk_documents'] = [];
  mockDb['dederan_inspection_transactions'] = [];
  mockDb['seeding_transactions'] = [];
  mockDb['pre_grafting_selection_documents'] = [];
  mockDb['selection_transactions'] = [];
  mockDb['budding_transactions'] = [];
  mockDb['inspection_transactions'] = [];
  mockDb['selection_pool'] = [];
}

// Full scan reference implementation for strict equivalence testing
function referenceFullScan(docIdentifier) {
  return findDownstreamDependency(docIdentifier, 'UNKNOWN');
}

// ==========================================
// PART 1: EQUIVALENCE VALIDATION SUITE
// ==========================================
console.log('--- PART 1: EQUIVALENCE VALIDATION SUITE ---');
resetDb();

// Seed sample data for all downstream modules
mockDb['receipt_transactions'] = [{ id: 'RCP-01', docNo: '2026/APR/001' }];
mockDb['dederan_transactions'] = [{ id: 'DED-01', docNo: '2026/DED/001', sourceReceiptDocNo: '2026/APR/001', status: 'READY_TO_CONFIRM' }];
mockDb['dederan_induk_documents'] = [{ id: 'IND-01', docNo: '2026/IND/001', sourceReceiptDocNo: '2026/APR/999', totalDidederSDHI: 100 }];
mockDb['dederan_inspection_transactions'] = [{ id: 'DED-INS-01', docNo: '2026/DED-INS/001', dederanTxDocNo: '2026/DED/002', status: 'ACTIVE' }];
mockDb['seeding_transactions'] = [{ id: 'SOW-01', docNo: '2026/SOW/001', dederanTxDocNo: '2026/DED/001', status: 'ACTIVE' }];
mockDb['pre_grafting_selection_documents'] = [{ id: 'SEL3-01', docNo: '2026/SEL-III/001', sourceSeedingDocNo: '2026/SOW/001', selectionStage: 'SELEKSI_III', isFinal: true, status: 'DISETUJUI' }];
mockDb['budding_transactions'] = [{ id: 'GRF-01', docNo: '2026/GRF/001', type: 'GRAFTING', sourceSelection3DocNo: '2026/SEL-III/001', status: 'DISETUJUI' }];
mockDb['inspection_transactions'] = [{ id: 'INS-01', docNo: '2026/INS/001', buddingDocNo: '2026/GRF/001', status: 'READY_TO_CONFIRM' }];
mockDb['selection_pool'] = [{ id: 'POOL-01', docNo: '2026/POOL/001', inspectionDocNo: '2026/INS/002', isConsumed: true, status: 'ACTIVE' }];

// Case 1A: RECEIPT source lookup equivalence
const optReceipt = findDownstreamDependency('2026/APR/001');
const refReceipt = referenceFullScan('2026/APR/001');
assert(JSON.stringify(optReceipt) === JSON.stringify(refReceipt), 'RECEIPT: Optimized output identical to Full Scan');

// Case 1B: DEDERAN source lookup equivalence
const optDeder = findDownstreamDependency('2026/DED/001');
const refDeder = referenceFullScan('2026/DED/001');
assert(JSON.stringify(optDeder) === JSON.stringify(refDeder), 'DEDERAN: Optimized output identical to Full Scan');

// Case 1C: SEEDING source lookup equivalence
const optSeeding = findDownstreamDependency('2026/SOW/001');
const refSeeding = referenceFullScan('2026/SOW/001');
assert(JSON.stringify(optSeeding) === JSON.stringify(refSeeding), 'SEEDING: Optimized output identical to Full Scan');

// Case 1D: SELECTION source lookup equivalence
const optSel = findDownstreamDependency('2026/SEL-III/001');
const refSel = referenceFullScan('2026/SEL-III/001');
assert(JSON.stringify(optSel) === JSON.stringify(refSel), 'SELECTION: Optimized output identical to Full Scan');

// Case 1E: BUDDING source lookup equivalence
const optBud = findDownstreamDependency('2026/GRF/001');
const refBud = referenceFullScan('2026/GRF/001');
assert(JSON.stringify(optBud) === JSON.stringify(refBud), 'BUDDING: Optimized output identical to Full Scan');

// Case 1F: INSPECTION source lookup equivalence
const optInsp = findDownstreamDependency('2026/INS/002');
const refInsp = referenceFullScan('2026/INS/002');
assert(JSON.stringify(optInsp) === JSON.stringify(refInsp), 'INSPECTION: Optimized output identical to Full Scan');

// Case 1G: Standalone doc (no downstream) equivalence
const optNone = findDownstreamDependency('2026/GRF/STANDALONE');
const refNone = referenceFullScan('2026/GRF/STANDALONE');
assert(optNone === null && refNone === null, 'STANDALONE: Both return null');

// Case 1H: Non-standard identifier fallback equivalence
const nonStandard = 'CUSTOM_BATCH_DOC_XYZ_999';
const optCustom = findDownstreamDependency(nonStandard);
const refCustom = referenceFullScan(nonStandard);
assert(JSON.stringify(optCustom) === JSON.stringify(refCustom), 'NON-STANDARD IDENTIFIER: Full-scan fallback returns identical result');

// Case 1I: Self-reference exclusion equivalence
const selfDoc = { id: 'GRF-01', docNo: '2026/GRF/001' };
mockDb['budding_transactions'].push(selfDoc);
const optSelf = findDownstreamDependency(selfDoc);
// It should match downstream inspection INS-01, but NOT itself as a cycle
assert(optSelf.docNo === '2026/INS/001', 'SELF-EXCLUSION: Excludes self correctly');

// Case 1J: Cancelled status bypass equivalence
mockDb['inspection_transactions'] = [{ id: 'INS-VOID', docNo: '2026/INS/VOID', buddingDocNo: '2026/GRF/CANCELLED_TEST', status: 'BATAL' }];
const optCancel = findDownstreamDependency('2026/GRF/CANCELLED_TEST');
const refCancel = referenceFullScan('2026/GRF/CANCELLED_TEST');
assert(optCancel === null && refCancel === null, 'CANCELLED STATUS: Both return null (bypassed)');

// Case 1K: Prefetch context accuracy in isReceiptUsedAsReference
const preloaded = {
  seedingTxs: mockDb['seeding_transactions'],
  dederTxs: mockDb['dederan_transactions'],
  indukDocs: mockDb['dederan_induk_documents'],
  selectionDocs: mockDb['pre_grafting_selection_documents']
};
const usedWithPrefetch = isReceiptUsedAsReference({ docNo: '2026/APR/001' }, 0, preloaded);
const usedDirect = isReceiptUsedAsReference({ docNo: '2026/APR/001' }, 0);
assert(usedWithPrefetch === true && usedDirect === true, 'PRELOADED BATCH CONTEXT: isReceiptUsedAsReference returns identical boolean');

// ==========================================
// PART 2: SYNTHETIC PERFORMANCE BENCHMARK
// ==========================================
console.log('\n--- PART 2: SYNTHETIC PERFORMANCE BENCHMARK ---');

function generateDataset(sizePerModule) {
  resetDb();
  for (let i = 1; i <= sizePerModule; i++) {
    const pad = String(i).padStart(5, '0');
    mockDb['receipt_transactions'].push({ id: `RCP-${pad}`, docNo: `2026/APR/${pad}`, qty: 100 });
    mockDb['dederan_transactions'].push({ id: `DED-${pad}`, docNo: `2026/DED/${pad}`, sourceReceiptDocNo: `2026/APR/${pad}`, status: 'ACTIVE' });
    mockDb['dederan_induk_documents'].push({ id: `IND-${pad}`, docNo: `2026/IND/${pad}`, totalDidederSDHI: 100 });
    mockDb['dederan_inspection_transactions'].push({ id: `DED-INS-${pad}`, docNo: `2026/DED-INS/${pad}`, dederanTxDocNo: `2026/DED/${pad}`, status: 'ACTIVE' });
    mockDb['seeding_transactions'].push({ id: `SOW-${pad}`, docNo: `2026/SOW/${pad}`, dederanTxDocNo: `2026/DED/${pad}`, status: 'ACTIVE' });
    mockDb['pre_grafting_selection_documents'].push({ id: `SEL-${pad}`, docNo: `2026/SEL/${pad}`, sourceSeedingDocNo: `2026/SOW/${pad}`, status: 'ACTIVE' });
    mockDb['budding_transactions'].push({ id: `GRF-${pad}`, docNo: `2026/GRF/${pad}`, type: 'GRAFTING', sourceSelection3DocNo: `2026/SEL/${pad}`, status: 'ACTIVE' });
    mockDb['inspection_transactions'].push({ id: `INS-${pad}`, docNo: `2026/INS/${pad}`, buddingDocNo: `2026/GRF/${pad}`, status: 'ACTIVE' });
    mockDb['selection_pool'].push({ id: `POOL-${pad}`, docNo: `2026/POOL/${pad}`, inspectionDocNo: `2026/INS/${pad}`, isConsumed: true, status: 'ACTIVE' });
  }
}

function calculatePercentiles(times) {
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  return { median: median.toFixed(3), p95: p95.toFixed(3) };
}

const benchmarkSizes = [50, 500, 5000];
const results = [];

for (const size of benchmarkSizes) {
  generateDataset(size);
  const totalRecords = size * 9;

  // Test target doc (Budding Grafting at middle index)
  const targetDoc = `2026/GRF/${String(Math.floor(size / 2)).padStart(5, '0')}`;
  const unlinkedDoc = `2026/GRF/UNLINKED_${size}`;

  // 1. Warm-up
  for (let w = 0; w < 20; w++) {
    findDownstreamDependency(targetDoc);
    referenceFullScan(targetDoc);
  }

  // 2. Measure Optimized findDownstreamDependency
  const iterations = 100;
  const timesOpt = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    findDownstreamDependency(targetDoc);
    const t1 = performance.now();
    timesOpt.push(t1 - t0);
  }

  // 3. Measure Full-Scan (Before optimization baseline)
  const timesBefore = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    referenceFullScan(targetDoc);
    const t1 = performance.now();
    timesBefore.push(t1 - t0);
  }

  // 4. Measure isReceiptUsedAsReference with vs without preloaded batch context
  const receiptTarget = mockDb['receipt_transactions'][Math.floor(size / 2)];
  const preloadedCtx = {
    seedingTxs: mockDb['seeding_transactions'],
    dederTxs: mockDb['dederan_transactions'],
    indukDocs: mockDb['dederan_induk_documents'],
    selectionDocs: mockDb['pre_grafting_selection_documents']
  };

  const timesBatch = [];
  const timesNoBatch = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    isReceiptUsedAsReference(receiptTarget, 0, preloadedCtx);
    const t1 = performance.now();
    timesBatch.push(t1 - t0);

    const t2 = performance.now();
    isReceiptUsedAsReference(receiptTarget, 0);
    const t3 = performance.now();
    timesNoBatch.push(t3 - t2);
  }

  const statOpt = calculatePercentiles(timesOpt);
  const statBefore = calculatePercentiles(timesBefore);
  const statBatch = calculatePercentiles(timesBatch);
  const statNoBatch = calculatePercentiles(timesNoBatch);

  results.push({
    size,
    totalRecords,
    before: statBefore,
    opt: statOpt,
    noBatch: statNoBatch,
    batch: statBatch
  });
}

console.log('--- BENCHMARK RESULTS TABLE ---');
console.table(results.map(r => ({
  'Records/Table': r.size,
  'Total Records': r.totalRecords,
  'Full-Scan Median (ms)': r.before.median,
  'Full-Scan p95 (ms)': r.before.p95,
  'Optimized Median (ms)': r.opt.median,
  'Optimized p95 (ms)': r.opt.p95,
  'Speedup Factor': (parseFloat(r.before.median) / Math.max(0.001, parseFloat(r.opt.median))).toFixed(2) + 'x',
  'Receipt Batching Median (ms)': r.batch.median
})));

assert(results.length === 3, 'All 3 dataset benchmarks completed successfully');
assert(parseFloat(results[2].opt.median) < 2.0, '5,000 dataset optimized lookup median is strictly < 2.0 ms');

console.log('\n====================================================');
console.log(`TASK 26 BENCHMARK FINISHED: ${passed} / ${total} ASSERTIONS PASSED`);
console.log('====================================================');
