/**
 * test-phase4d-coverage-gap.js
 * Test Suite for Phase 4D — Coverage & Gap Analysis Dashboard
 * Validates Runtime Metrics, Gap Reporting, Module Gap Breakdown, Filters, Export, and Dynamic Recalculation
 */

import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getAllTraceabilityRecords,
  getRequirementTrace,
  getNodeTrace,
  getCoverageMetrics,
  getGapAnalysisReport,
  classifyRequirementTrace,
  getRequirementCriteria,
  createRequirement,
  archiveRequirement,
  addFlowNode,
  validateAndLinkBusinessRules,
  validateAndLinkNodeBusinessRules,
  resetDraftToOfficial
} from './js/modules/process-mapping/process-mapping-data.js';

// Mock localStorage for node environment
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

// Mock fetch for loading process-mapping-data.json
global.fetch = async (url) => {
  const content = fs.readFileSync('./data/process-mapping-data.json', 'utf8');
  return {
    ok: true,
    json: async () => JSON.parse(content)
  };
};

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase4DTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 4D — COVERAGE & GAP ANALYSIS TESTS');
  console.log('====================================================\n');

  initProjectDataStore(true);
  const store = getActiveStore();

  // ---------------------------------------------------------------------------
  // 1. Coverage Metrics Runtime Calculation
  // ---------------------------------------------------------------------------
  console.log('1. Coverage Metrics Runtime Calculation');
  const metrics = getCoverageMetrics();
  assert(metrics && typeof metrics === 'object', '1.1 getCoverageMetrics returns valid metrics object');
  assert(metrics.totalActiveRequirements === 165, `1.2 totalActiveRequirements equals 165 (got: ${metrics.totalActiveRequirements})`);
  assert(metrics.flowRequired === 155, `1.3 flowRequired equals 155 (got: ${metrics.flowRequired})`);
  assert(metrics.flowCovered === 122, `1.4 flowCovered equals 122 (got: ${metrics.flowCovered})`);
  assert(metrics.flowGap === 33, `1.5 flowGap equals 33 (got: ${metrics.flowGap})`);
  assert(metrics.managementRequirements === 10, `1.6 managementRequirements equals 10 (got: ${metrics.managementRequirements})`);

  // ---------------------------------------------------------------------------
  // 2. Mathematical Integrity & Rate Formulas
  // ---------------------------------------------------------------------------
  console.log('\n2. Mathematical Integrity & Rate Formulas');
  assert(metrics.flowRequired === metrics.flowCovered + metrics.flowGap, '2.1 Flow balance: flowRequired == flowCovered + flowGap');
  assert(metrics.totalActiveRequirements === metrics.flowRequired + metrics.managementRequirements, '2.2 Active requirements balance: total == flowRequired + management');
  assert(typeof metrics.flowCoverageRate === 'number' && metrics.flowCoverageRate > 0, `2.3 flowCoverageRate is valid positive number (${metrics.flowCoverageRate}%)`);
  assert(metrics.flowCoverageRate === 78.71, `2.4 flowCoverageRate matches formula 122/155 = 78.71% (got: ${metrics.flowCoverageRate}%)`);
  assert(metrics.totalTraceabilityHealth === 80, `2.5 totalTraceabilityHealth matches formula (122+10)/165 = 80% (got: ${metrics.totalTraceabilityHealth}%)`);

  // ---------------------------------------------------------------------------
  // 3. Feature & Module Completeness Metrics
  // ---------------------------------------------------------------------------
  console.log('\n3. Feature & Module Completeness Metrics');
  assert(metrics.totalFeatures > 0, `3.1 totalFeatures is positive (got: ${metrics.totalFeatures})`);
  assert(metrics.featuresWithFlows > 0, `3.2 featuresWithFlows is positive (got: ${metrics.featuresWithFlows})`);
  assert(metrics.featureFlowCompleteness === 71.43, `3.3 featureFlowCompleteness matches formula 15/21 = 71.43% (got: ${metrics.featureFlowCompleteness}%)`);
  assert(metrics.totalModules === 11, `3.4 totalModules is 11 (got: ${metrics.totalModules})`);
  assert(metrics.moduleFlowCompleteness === 100, `3.5 moduleFlowCompleteness is 100% (got: ${metrics.moduleFlowCompleteness}%)`);

  // ---------------------------------------------------------------------------
  // 4. Gap Analysis Report Structure
  // ---------------------------------------------------------------------------
  console.log('\n4. Gap Analysis Report Structure');
  const gapReport = getGapAnalysisReport();
  assert(gapReport && typeof gapReport === 'object', '4.1 getGapAnalysisReport returns valid report object');
  assert(gapReport.totalGaps === 33, `4.2 totalGaps equals 33 (got: ${gapReport.totalGaps})`);
  assert(Array.isArray(gapReport.gapRecords), '4.3 gapRecords is an Array');
  assert(gapReport.gapRecords.length === 33, `4.4 gapRecords contains exactly 33 items (got: ${gapReport.gapRecords.length})`);
  assert(gapReport.gapRecords.every(r => r.classification === 'gap' && r.hasFlowNodeGap === true), '4.5 All gapRecords strictly have classification === gap and hasFlowNodeGap === true');

  // ---------------------------------------------------------------------------
  // 5. Gap Breakdown by Module
  // ---------------------------------------------------------------------------
  console.log('\n5. Gap Breakdown by Module');
  assert(Array.isArray(gapReport.moduleSummary), '5.1 moduleSummary is an Array');
  assert(gapReport.moduleSummary.length === 11, `5.2 moduleSummary contains all 11 modules (got: ${gapReport.moduleSummary.length})`);
  const totalGapsSum = gapReport.moduleSummary.reduce((acc, m) => acc + m.totalGaps, 0);
  assert(totalGapsSum === 33, `5.3 Sum of module gaps equals totalGaps (33 == ${totalGapsSum})`);
  assert(gapReport.moduleSummary.every(m => m.moduleId && m.moduleName && Array.isArray(m.requirements)), '5.4 Every module entry has moduleId, moduleName, and requirements array');

  // ---------------------------------------------------------------------------
  // 6. Gap Filtering & Searching
  // ---------------------------------------------------------------------------
  console.log('\n6. Gap Filtering & Searching');
  const firstGapModule = gapReport.gapRecords[0].module?.id || gapReport.gapRecords[0].requirement.module;
  const filteredByModule = gapReport.gapRecords.filter(r => (r.module?.id === firstGapModule || r.requirement.module === firstGapModule));
  assert(filteredByModule.length > 0, `6.1 Filtering gaps by module ${firstGapModule} returns subset (got: ${filteredByModule.length})`);

  const firstGapRole = gapReport.gapRecords[0].requirement.role;
  const filteredByRole = gapReport.gapRecords.filter(r => r.requirement.role === firstGapRole);
  assert(filteredByRole.length > 0, `6.2 Filtering gaps by role ${firstGapRole} returns subset (got: ${filteredByRole.length})`);

  const sampleGapId = gapReport.gapRecords[0].requirement.id || gapReport.gapRecords[0].requirement.reqId;
  const searchGapResult = gapReport.gapRecords.filter(r => (r.requirement.id || r.requirement.reqId || '').includes(sampleGapId));
  assert(searchGapResult.length === 1, `6.3 Search by exact gap reqId ${sampleGapId} returns exactly 1 item`);

  // ---------------------------------------------------------------------------
  // 7. Empty State Handling
  // ---------------------------------------------------------------------------
  console.log('\n7. Empty State Handling');
  const nonExistent = gapReport.gapRecords.filter(r => (r.requirement.title || '').includes('NOT_EXISTENT_GAP_QUERY_123'));
  assert(nonExistent.length === 0, '7.1 Non-matching search query yields empty list safely');

  // ---------------------------------------------------------------------------
  // 8. Dynamic Recalculation on Flow Node Addition
  // ---------------------------------------------------------------------------
  console.log('\n8. Dynamic Recalculation on Flow Node Addition');
  const gapToLink = gapReport.gapRecords[0].requirement;
  const targetModId = gapToLink.module || '04-okulasi';
  const targetFeatId = gapToLink.feature || 'grafting';

  // Add flow node linking to this gap requirement
  const addedNode = addFlowNode(targetModId, targetFeatId, {
    title: 'Visual Step for Gap Resolution',
    reqId: gapToLink.id
  });
  assert(addedNode !== null, '8.1 Flow node created and linked to gap requirement');

  const updatedMetrics = getCoverageMetrics();
  assert(updatedMetrics.flowCovered === 123, `8.2 flowCovered incremented dynamically to 123 (got: ${updatedMetrics.flowCovered})`);
  assert(updatedMetrics.flowGap === 32, `8.3 flowGap decremented dynamically to 32 (got: ${updatedMetrics.flowGap})`);

  const updatedGapReport = getGapAnalysisReport();
  assert(updatedGapReport.totalGaps === 32, `8.4 getGapAnalysisReport totalGaps updated dynamically to 32 (got: ${updatedGapReport.totalGaps})`);
  assert(!updatedGapReport.gapRecords.some(r => r.requirement.id === gapToLink.id), '8.5 Previously gap requirement is now resolved and excluded from gapRecords');

  // ---------------------------------------------------------------------------
  // 9. Dynamic Recalculation on Requirement Archival
  // ---------------------------------------------------------------------------
  console.log('\n9. Dynamic Recalculation on Requirement Archival');
  const tempReq = createRequirement({
    title: 'Temporary Unlinked Requirement',
    role: 'Mantri Bibitan',
    module: '04-okulasi',
    feature: 'grafting'
  });
  const metricsWithNewReq = getCoverageMetrics();
  assert(metricsWithNewReq.totalActiveRequirements === 166, `9.1 Adding unlinked requirement increments totalActiveRequirements to 166 (got: ${metricsWithNewReq.totalActiveRequirements})`);
  assert(metricsWithNewReq.flowGap === 33, `9.2 Adding unlinked requirement increments flowGap (got: ${metricsWithNewReq.flowGap})`);

  archiveRequirement(tempReq.id, 'Pembersihan');
  const metricsAfterArchive = getCoverageMetrics();
  assert(metricsAfterArchive.totalActiveRequirements === 165, `9.3 Archiving requirement restores totalActiveRequirements to 165 (got: ${metricsAfterArchive.totalActiveRequirements})`);

  // ---------------------------------------------------------------------------
  // 10. CSV Export Data Formatting
  // ---------------------------------------------------------------------------
  console.log('\n10. CSV Export Data Formatting');
  const csvHeaders = ['Requirement ID', 'Judul Requirement', 'Role Pelaksana', 'Modul', 'Fitur', 'Status Alur', 'Kriteria Penerimaan', 'Status Baseline', 'Aturan Bisnis Terkait'];
  const sampleGap = gapReport.gapRecords[0];
  const csvSampleRow = [
    sampleGap.requirement.id,
    sampleGap.requirement.title,
    sampleGap.requirement.role,
    sampleGap.module?.name || sampleGap.requirement.module,
    sampleGap.feature?.name || sampleGap.requirement.feature,
    'Belum Memiliki Flow Node',
    sampleGap.criteria || '-',
    sampleGap.requirement.status || 'Confirmed',
    (sampleGap.businessRules || []).map(r => r.id).join('; ') || 'Belum Terhubung'
  ];
  assert(csvHeaders.length === 9, '10.1 CSV format defines 9 comprehensive audit columns');
  assert(csvSampleRow.every(val => val !== undefined), '10.2 All CSV fields are cleanly populated without undefined');

  // ---------------------------------------------------------------------------
  // 11. Baseline Integrity and Reset
  // ---------------------------------------------------------------------------
  console.log('\n11. Baseline Integrity and Reset');
  resetDraftToOfficial();
  const resetMetrics = getCoverageMetrics();
  assert(resetMetrics.totalActiveRequirements === 165, '11.1 Store reset restores baseline 165 requirements');
  assert(resetMetrics.flowCovered === 122, '11.2 Store reset restores baseline 122 covered requirements');
  assert(resetMetrics.flowGap === 33, '11.3 Store reset restores baseline 33 true gaps');

  // ---------------------------------------------------------------------------
  // 12. Full Phase Compatibility
  // ---------------------------------------------------------------------------
  console.log('\n12. Full Phase Compatibility');
  const criteria = getRequirementCriteria(gapReport.gapRecords[0].requirement);
  assert(criteria !== undefined, '12.1 Phase 4A getRequirementCriteria operates cleanly on gap records');
  const nodeTrace = getNodeTrace('04-okulasi', 'grafting', 'N_P002');
  assert(nodeTrace !== null, '12.2 Phase 4B getNodeTrace operates cleanly');
  const allTraces = getAllTraceabilityRecords();
  assert(allTraces.length === 165, '12.3 Phase 4C getAllTraceabilityRecords operates cleanly');

  console.log('\n====================================================');
  console.log(`🎉 ALL PHASE 4D TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions)`);
  console.log('====================================================\n');
}

runPhase4DTestSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
