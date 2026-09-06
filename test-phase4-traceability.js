/**
 * Automated Regression & Unit Test Suite for Phase 4A: Traceability Foundation
 * Covers:
 * A. Canonical Criteria Resolver
 * B. Requirement Trace Resolver
 * C. Business Rule Link Validation & Sanitization
 * D. Duplicate Rule Removal
 * E. Invalid Rule Handling
 * F. Covered Classification
 * G. Management Classification
 * H. True Gap Classification
 * I. Deterministic Coverage Formula
 * J. Zero-Denominator Safety Protection
 * K. Archived Requirement Exclusion
 * L. Baseline Data Integrity
 * M. Backward Compatibility (Schema without ruleIds)
 */

import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getRequirementCriteria,
  getRequirementTrace,
  getAllTraceabilityRecords,
  validateAndLinkBusinessRules,
  classifyRequirementTrace,
  getCoverageMetrics,
  createRequirement,
  archiveRequirement
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

async function runPhase4ATests() {
  console.log('=== STARTING PHASE 4A: TRACEABILITY FOUNDATION TEST SUITE ===\n');
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

  // ---------------------------------------------------------------------------
  // 1. Store Initialization & Baseline Integrity
  // ---------------------------------------------------------------------------
  const store = initProjectDataStore(true);
  assert(store && Array.isArray(store.requirements), '1. Store initialized with requirements array');
  assert(store.requirements.length === 165, `2. Total baseline operational requirements is 165 (got: ${store.requirements.length})`);
  assert(Array.isArray(store.businessRules) && store.businessRules.length === 16, `3. Total baseline business rules is 16 (got: ${store.businessRules?.length})`);
  assert(Array.isArray(store.modules) && store.modules.length === 11, `4. Total baseline modules is 11 (got: ${store.modules?.length})`);

  // ---------------------------------------------------------------------------
  // 2. Canonical Acceptance Criteria Resolver
  // ---------------------------------------------------------------------------
  const sampleReqWithCriteria = { id: 'TEST-01', criteria: 'Wajib lolos 100% validasi GPS' };
  assert(getRequirementCriteria(sampleReqWithCriteria) === 'Wajib lolos 100% validasi GPS', '5. getRequirementCriteria returns explicit criteria');

  const sampleReqWithAcceptanceCriteria = { id: 'TEST-02', acceptanceCriteria: 'Koneksi VPN aktif status Connected' };
  assert(getRequirementCriteria(sampleReqWithAcceptanceCriteria) === 'Koneksi VPN aktif status Connected', '6. getRequirementCriteria falls back to acceptanceCriteria if criteria not set');

  const sampleReqWithValidation = { id: 'TEST-03', validation: 'Geofencing areal bibitan' };
  assert(getRequirementCriteria(sampleReqWithValidation) === 'Geofencing areal bibitan', '7. getRequirementCriteria falls back to validation');

  const sampleReqWithDesc = { id: 'TEST-04', description: 'Deskripsi proses fallback' };
  assert(getRequirementCriteria(sampleReqWithDesc) === 'Deskripsi proses fallback', '8. getRequirementCriteria falls back to description if criteria/validation missing');

  const sampleReqWithTitle = { id: 'TEST-05', title: 'Judul requirement' };
  assert(getRequirementCriteria(sampleReqWithTitle) === 'Judul requirement', '9. getRequirementCriteria falls back to title if all else missing');

  assert(getRequirementCriteria(null) === '', '10. getRequirementCriteria returns empty string on null input');
  assert(getRequirementCriteria({}) === '', '11. getRequirementCriteria returns empty string on empty object');

  // ---------------------------------------------------------------------------
  // 3. Trace Classification Logic (Covered, Management, True Gap)
  // ---------------------------------------------------------------------------
  const traceCovered = classifyRequirementTrace({ id: 'RN-PRS-001', role: 'Mantri Bibitan' }, [{ id: 'PR_START' }]);
  assert(traceCovered.classification === 'covered', '12. Active node present classified as covered');
  assert(traceCovered.isFlowRequired === true, '13. Covered trace has isFlowRequired = true');
  assert(traceCovered.isGap === false, '14. Covered trace has isGap = false');

  const traceMgmtRole = classifyRequirementTrace({ id: 'RN-MGMT-001', role: 'Asisten Kepala' }, []);
  assert(traceMgmtRole.classification === 'management', '15. Askep without flow node classified as management');
  assert(traceMgmtRole.isFlowRequired === false, '16. Management classification has isFlowRequired = false');
  assert(traceMgmtRole.isGap === false, '17. Management classification has isGap = false');

  const traceExplicitScope = classifyRequirementTrace({ id: 'RN-SYS-001', role: 'Mandor', flowScope: 'management' }, []);
  assert(traceExplicitScope.classification === 'management', '18. Explicit flowScope management classified as management');

  const traceKNF = classifyRequirementTrace({ id: 'RN-KNF-001', role: 'Mantri Bibitan', type: 'non-functional' }, []);
  assert(traceKNF.classification === 'management', '19. Non-functional requirement without node classified as management');

  const traceTrueGap = classifyRequirementTrace({ id: 'RN-GAP-001', role: 'Mantri Bibitan' }, []);
  assert(traceTrueGap.classification === 'gap', '20. Mantri requirement without flow node classified as true gap');
  assert(traceTrueGap.isFlowRequired === true, '21. True gap has isFlowRequired = true');
  assert(traceTrueGap.isGap === true, '22. True gap has isGap = true');

  // ---------------------------------------------------------------------------
  // 4. Requirement Trace Resolver
  // ---------------------------------------------------------------------------
  const trace1 = getRequirementTrace('RN-PRS-001');
  assert(trace1 !== null, '23. getRequirementTrace returns trace object for existing reqId');
  assert(trace1.requirement && trace1.requirement.id === 'RN-PRS-001', '24. Trace contains correct requirement entity');
  assert(trace1.module !== null, '25. Trace resolves correct parent module');
  assert(trace1.feature !== null, '26. Trace resolves correct parent feature');
  assert(Array.isArray(trace1.nodes) && trace1.nodes.length > 0, '27. Trace resolves linked flow nodes by reqId');
  assert(trace1.classification === 'covered', '28. Trace with linked nodes has covered classification');
  assert(trace1.criteria.length > 0, '29. Trace contains canonical criteria text');

  const traceInvalid = getRequirementTrace('RN-NON-EXISTENT-999');
  assert(traceInvalid === null, '30. getRequirementTrace returns null for non-existent reqId');

  // ---------------------------------------------------------------------------
  // 5. Business Rule Linking & Sanitization
  // ---------------------------------------------------------------------------
  const linkResult = validateAndLinkBusinessRules('RN-PRS-001', ['BR-GLB-001', 'BR-PRS-001']);
  assert(linkResult.success === true, '31. validateAndLinkBusinessRules succeeds');
  assert(linkResult.ruleIds.length === 2, '32. Valid rule IDs linked to requirement');

  // Duplicate removal
  const dupResult = validateAndLinkBusinessRules('RN-PRS-001', ['BR-GLB-001', 'BR-GLB-001', 'BR-GLB-001']);
  assert(dupResult.ruleIds.length === 1 && dupResult.ruleIds[0] === 'BR-GLB-001', '33. Duplicate rule IDs deduplicated to 1 instance');

  // Invalid rule handling (filter non-existent IDs without error)
  const invalidResult = validateAndLinkBusinessRules('RN-PRS-001', ['INVALID-RULE-999', 'BR-PRS-001', 'NOT-A-RULE']);
  assert(invalidResult.ruleIds.length === 1 && invalidResult.ruleIds[0] === 'BR-PRS-001', '34. Invalid rule IDs ignored cleanly');

  // Trace reflects linked business rules
  const traceWithRule = getRequirementTrace('RN-PRS-001');
  assert(traceWithRule.businessRules.some(br => br.id === 'BR-PRS-001'), '35. getRequirementTrace returns resolved BusinessRule object');

  // ---------------------------------------------------------------------------
  // 6. All Traceability Records & Exclusion of Archived
  // ---------------------------------------------------------------------------
  const allTraces = getAllTraceabilityRecords();
  assert(allTraces.length === 165, `36. getAllTraceabilityRecords returns all 165 active requirements (got: ${allTraces.length})`);

  // Create a draft requirement, then archive it
  const tempReq = createRequirement({ title: 'Temporary Req', role: 'Mantri Bibitan', moduleId: '01-presensi', featureId: 'presensi-supervisor' });
  const afterAddTraces = getAllTraceabilityRecords();
  assert(afterAddTraces.length === 166, `37. New draft requirement included in active trace records (count: ${afterAddTraces.length})`);

  archiveRequirement(tempReq.id);
  const afterArchiveTraces = getAllTraceabilityRecords();
  assert(afterArchiveTraces.length === 165, `38. Archived requirement excluded from active trace records (count: ${afterArchiveTraces.length})`);

  // ---------------------------------------------------------------------------
  // 7. Deterministic Coverage Metrics & Mathematical Balance
  // ---------------------------------------------------------------------------
  const metrics = getCoverageMetrics();
  assert(typeof metrics.totalActiveRequirements === 'number', '39. metrics contains totalActiveRequirements');
  assert(typeof metrics.flowRequired === 'number', '40. metrics contains flowRequired');
  assert(typeof metrics.flowCovered === 'number', '41. metrics contains flowCovered');
  assert(typeof metrics.flowGap === 'number', '42. metrics contains flowGap');
  assert(typeof metrics.managementRequirements === 'number', '43. metrics contains managementRequirements');
  assert(typeof metrics.flowCoverageRate === 'number', '44. metrics contains flowCoverageRate');
  assert(typeof metrics.totalTraceabilityHealth === 'number', '45. metrics contains totalTraceabilityHealth');

  // Mathematical balance verification
  assert(
    metrics.flowRequired === (metrics.flowCovered + metrics.flowGap),
    `46. Mathematical balance: flowRequired (${metrics.flowRequired}) == flowCovered (${metrics.flowCovered}) + flowGap (${metrics.flowGap})`
  );
  assert(
    metrics.totalActiveRequirements === (metrics.flowRequired + metrics.managementRequirements),
    `47. Total active reqs (${metrics.totalActiveRequirements}) == flowRequired (${metrics.flowRequired}) + managementReqs (${metrics.managementRequirements})`
  );
  assert(
    !isNaN(metrics.flowCoverageRate) && isFinite(metrics.flowCoverageRate),
    `48. flowCoverageRate is valid finite number: ${metrics.flowCoverageRate}%`
  );
  assert(
    !isNaN(metrics.totalTraceabilityHealth) && isFinite(metrics.totalTraceabilityHealth),
    `49. totalTraceabilityHealth is valid finite number: ${metrics.totalTraceabilityHealth}%`
  );
  assert(
    typeof metrics.featureFlowCompleteness === 'number' && metrics.featureFlowCompleteness > 0,
    `50. featureFlowCompleteness is dynamically calculated (${metrics.featuresWithFlows}/${metrics.totalFeatures} = ${metrics.featureFlowCompleteness}%)`
  );
  assert(
    metrics.moduleFlowCompleteness === 100,
    `51. moduleFlowCompleteness is 100% across all 11 modules (got: ${metrics.moduleFlowCompleteness}%)`
  );

  // ---------------------------------------------------------------------------
  // 8. Backward Compatibility (Schema without ruleIds)
  // ---------------------------------------------------------------------------
  const legacyReq = {
    id: 'LEGACY-001',
    title: 'Requirement legacy',
    role: 'Mantri Bibitan',
    status: 'Confirmed'
    // no ruleIds, no criteria, no flowScope
  };
  const legacyTrace = classifyRequirementTrace(legacyReq, []);
  assert(legacyTrace.classification === 'gap', '52. Legacy requirement without ruleIds/flowScope processed smoothly');

  console.log(`\n========================================`);
  console.log(`PHASE 4A TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4ATests().catch(err => {
  console.error('Fatal error during Phase 4A tests:', err);
  process.exit(1);
});
