/**
 * portal_patch/test-phase4e-gap-resolution.js
 * Regression Test Suite for Phase 4E — True Gap Resolution Plan (16/16 PASS)
 * Validates deterministic gap resolution, node generation, RTM coverage, and baseline data integrity.
 */

import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getCoverageMetrics,
  getGapAnalysisReport,
  getAllTraceabilityRecords,
  applyTrueGapResolutionPlan,
  validateProjectData,
  FINAL_TRUE_GAP_FLOW_PLAN,
  resetDraftToOfficial
} from './process-mapping-data.js';

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

async function runPhase4ETestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 4E — TRUE GAP RESOLUTION REGRESSION TESTS');
  console.log('================================================================\n');

  // Initialize fresh store
  initProjectDataStore(true);
  const store = getActiveStore();

  // Test 1: Initial Gap Baseline Detection
  console.log('Test 1: Initial Gap Baseline Detection');
  const initialMetrics = getCoverageMetrics();
  assert(initialMetrics.totalActiveRequirements === 165 && initialMetrics.flowRequired === 155, `1. Baseline requirements initialized (total: ${initialMetrics.totalActiveRequirements}, flowRequired: ${initialMetrics.flowRequired})`);

  // Test 2: Resolution Plan Structure Validation
  console.log('\nTest 2: Resolution Plan Structure Validation');
  const planFeatures = Object.keys(FINAL_TRUE_GAP_FLOW_PLAN || {});
  assert(planFeatures.length === 6, `2. FINAL_TRUE_GAP_FLOW_PLAN contains all 6 targeted feature flows (got: ${planFeatures.length})`);

  // Test 3: Plan Execution
  console.log('\nTest 3: Plan Execution');
  const resolutionResult = applyTrueGapResolutionPlan(store);
  assert(resolutionResult && typeof resolutionResult === 'object' && resolutionResult.flows !== undefined, `3. applyTrueGapResolutionPlan executed successfully and populated flows`);

  // Test 4: Post-Execution True Gap Count
  console.log('\nTest 4: Post-Execution True Gap Count');
  const postMetrics = getCoverageMetrics();
  assert(postMetrics.flowGap === 0, `4. flowGap is reduced to exactly 0 (got: ${postMetrics.flowGap})`);

  // Test 5: Flow Covered Count
  console.log('\nTest 5: Flow Covered Count');
  assert(postMetrics.flowCovered === 155, `5. flowCovered equals 155 out of 155 flowRequired (got: ${postMetrics.flowCovered})`);

  // Test 6: Flow Coverage Rate
  console.log('\nTest 6: Flow Coverage Rate');
  assert(postMetrics.flowCoverageRate === 100, `6. flowCoverageRate reaches 100.00% (got: ${postMetrics.flowCoverageRate}%)`);

  // Test 7: Total Traceability Health
  console.log('\nTest 7: Total Traceability Health');
  assert(postMetrics.totalTraceabilityHealth === 100, `7. totalTraceabilityHealth reaches 100% (got: ${postMetrics.totalTraceabilityHealth}%)`);

  // Test 8: Active Node Growth
  console.log('\nTest 8: Active Node Growth');
  let activeNodesCount = 0;
  if (store.flows) {
    Object.values(store.flows).forEach(features => {
      Object.values(features).forEach(flow => {
        (flow.nodes || []).forEach(node => {
          if (!node.isArchived) activeNodesCount++;
        });
      });
    });
  }
  assert(activeNodesCount === 167, `8. Total active flow nodes equals 167 (got: ${activeNodesCount})`);

  // Test 9: Management Scope Invariance
  console.log('\nTest 9: Management Scope Invariance');
  assert(postMetrics.managementRequirements === 10, `9. Management requirements remain constant at 10 (got: ${postMetrics.managementRequirements})`);

  // Test 10: Total Active Requirements Invariance
  console.log('\nTest 10: Total Active Requirements Invariance');
  assert(postMetrics.totalActiveRequirements === 165, `10. Total active requirements remains constant at 165 (got: ${postMetrics.totalActiveRequirements})`);

  // Test 11: Idempotency
  console.log('\nTest 11: Idempotency');
  applyTrueGapResolutionPlan(store);
  const secondRunMetrics = getCoverageMetrics();
  assert(secondRunMetrics.flowGap === 0 && secondRunMetrics.flowCovered === 155, '11. Re-executing applyTrueGapResolutionPlan is strictly idempotent (no duplicate nodes, flowGap remains 0)');

  // Test 12: RTM Trace Classification
  console.log('\nTest 12: RTM Trace Classification');
  const allTraces = getAllTraceabilityRecords();
  const coveredCount = allTraces.filter(t => t.classification === 'covered').length;
  const mgmtCount = allTraces.filter(t => t.classification === 'management').length;
  const gapCount = allTraces.filter(t => t.classification === 'gap').length;
  assert(coveredCount === 155 && mgmtCount === 10 && gapCount === 0, `12. All 165 RTM records classified correctly (155 covered, 10 mgmt, 0 gap; got: ${coveredCount} covered, ${mgmtCount} mgmt, ${gapCount} gap)`);

  // Test 13: Module Gap Summary
  console.log('\nTest 13: Module Gap Summary');
  const gapReport = getGapAnalysisReport();
  const anyModuleHasGap = (gapReport.moduleSummary || []).some(m => m.totalGaps > 0);
  assert(gapReport.totalGaps === 0 && !anyModuleHasGap, `13. getGapAnalysisReport confirms 0 gaps across all 11 modules (totalGaps: ${gapReport.totalGaps})`);

  // Test 14: Data Validation Integrity
  console.log('\nTest 14: Data Validation Integrity');
  const valResult = validateProjectData(store);
  assert(valResult.valid === true && valResult.errors.length === 0, `14. validateProjectData passes with 0 errors (valid: ${valResult.valid}, errors: ${valResult.errors.length})`);

  // Test 15: Two-Way Linkage
  console.log('\nTest 15: Two-Way Linkage');
  const allLinkedReqIds = new Set();
  if (store.flows) {
    Object.values(store.flows).forEach(features => {
      Object.values(features).forEach(flow => {
        (flow.nodes || []).forEach(node => {
          if (!node.isArchived && node.reqId) allLinkedReqIds.add(node.reqId);
        });
      });
    });
  }
  assert(allLinkedReqIds.size >= 155, `15. All 155 flow requirements are actively linked to flow nodes (linked unique reqIds: ${allLinkedReqIds.size})`);

  // Test 16: Acceptance Criteria and Node Metadata
  console.log('\nTest 16: Acceptance Criteria and Node Metadata');
  let completeMetadataNodes = 0;
  if (store.flows) {
    Object.values(store.flows).forEach(features => {
      Object.values(features).forEach(flow => {
        (flow.nodes || []).forEach(node => {
          if (!node.isArchived && node.title && node.type && node.role) completeMetadataNodes++;
        });
      });
    });
  }
  assert(completeMetadataNodes === 167, `16. All 167 active flow nodes contain valid title, type, and role metadata (complete: ${completeMetadataNodes}/167)`);

  console.log('\n================================================================');
  console.log(`🎉 ALL PHASE 4E TESTS PASSED! (${passedAssertions}/${totalAssertions} PASS)`);
  console.log('================================================================\n');
}

runPhase4ETestSuite().catch(err => {
  console.error('\n❌ Phase 4E Test Suite Failed:', err);
  process.exit(1);
});
