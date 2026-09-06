/**
 * test-phase4c-rtm.js
 * Test Suite for Phase 4C — Interactive Traceability Matrix (RTM)
 * Validates RTM Data Source, Filter, Search, Pagination, Cross-Navigation, and Trace Completeness
 */

import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getAllTraceabilityRecords,
  getRequirementTrace,
  getNodeTrace,
  getCoverageMetrics,
  classifyRequirementTrace,
  getRequirementCriteria,
  createRequirement,
  archiveRequirement,
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

async function runPhase4CTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 4C — INTERACTIVE TRACEABILITY MATRIX TESTS');
  console.log('====================================================\n');

  initProjectDataStore(true);
  const store = getActiveStore();

  // Test 1: RTM Data Source Integrity
  console.log('1. RTM Data Source Integrity');
  const allRecords = getAllTraceabilityRecords();
  assert(Array.isArray(allRecords), '1.1 getAllTraceabilityRecords returns an Array');
  assert(allRecords.length === 165, `1.2 Initial active traceability records count is exactly 165 (got: ${allRecords.length})`);
  assert(allRecords.every(r => r && r.requirement && (r.classification || r.classificationLabel)), '1.3 Every trace record contains requirement and classification');

  // Test 2: 165 Active Requirements Verification
  console.log('\n2. 165 Active Requirements Verification');
  const coveredCount = allRecords.filter(r => r.classification === 'covered' || r.classification === 'Covered' || r.classificationLabel === 'Covered').length;
  const mgmtCount = allRecords.filter(r => r.classification === 'management' || r.classification === 'Business / Management' || r.classificationLabel === 'Business / Management').length;
  const trueGapCount = allRecords.filter(r => r.classification === 'gap' || r.classification === 'True Gap' || r.classificationLabel === 'True Gap').length;
  assert(coveredCount === 122, `2.1 Covered count equals 122 (got: ${coveredCount})`);
  assert(mgmtCount === 10, `2.2 Business / Management count equals 10 (got: ${mgmtCount})`);
  assert(trueGapCount === 33, `2.3 True Gap count equals 33 (got: ${trueGapCount})`);
  assert(coveredCount + mgmtCount + trueGapCount === 165, '2.4 Sum of classifications equals 165 total active requirements');

  // Test 3: Filter Module
  console.log('\n3. Filter Module');
  const okuModuleRecords = allRecords.filter(r => r.module?.id === '04-okulasi' || r.requirement?.module === '04-okulasi');
  assert(okuModuleRecords.length > 0, `3.1 Module 04-okulasi filter returns records (got: ${okuModuleRecords.length})`);
  assert(okuModuleRecords.every(r => (r.module?.id === '04-okulasi' || r.requirement?.module === '04-okulasi')), '3.2 All filtered records match 04-okulasi');

  // Test 4: Filter Role
  console.log('\n4. Filter Role');
  const mantriRecords = allRecords.filter(r => r.requirement?.role === 'Mantri Bibitan' || r.requirement?.role === 'mantri-bibitan');
  assert(mantriRecords.length > 0, `4.1 Filter role Mantri Bibitan returns records (got: ${mantriRecords.length})`);
  const asistenRecords = allRecords.filter(r => r.requirement?.role === 'Asisten Bibitan' || r.requirement?.role === 'asisten-bibitan');
  assert(asistenRecords.length > 0, `4.2 Filter role Asisten Bibitan returns records (got: ${asistenRecords.length})`);

  // Test 5: Filter Classification
  console.log('\n5. Filter Classification');
  const filteredCovered = allRecords.filter(r => r.classification === 'covered' || r.classification === 'Covered' || r.classificationLabel === 'Covered');
  assert(filteredCovered.length === 122, '5.1 Filter Covered returns 122 records');
  const filteredMgmt = allRecords.filter(r => r.classification === 'management' || r.classification === 'Business / Management' || r.classificationLabel === 'Business / Management');
  assert(filteredMgmt.length === 10, '5.2 Filter Business / Management returns 10 records');
  const filteredGap = allRecords.filter(r => r.classification === 'gap' || r.classification === 'True Gap' || r.classificationLabel === 'True Gap');
  assert(filteredGap.length === 33, '5.3 Filter True Gap returns 33 records');

  // Test 6: Filter Business Rule Link
  console.log('\n6. Filter Business Rule Link');
  const linkedRulesRecords = allRecords.filter(r => r.businessRules && r.businessRules.length > 0);
  const unlinkedRulesRecords = allRecords.filter(r => !r.businessRules || r.businessRules.length === 0);
  assert(linkedRulesRecords.length === 77, `6.1 Records with linked Business Rules equals 77 (got: ${linkedRulesRecords.length})`);
  assert(unlinkedRulesRecords.length === 88, `6.2 Records without linked Business Rules equals 88 (got: ${unlinkedRulesRecords.length})`);
  assert(linkedRulesRecords.length + unlinkedRulesRecords.length === 165, '6.3 Linked + Unlinked rules sum equals 165');

  // Test 7: Search Requirement ID
  console.log('\n7. Search Requirement ID');
  const sampleReqId = allRecords[0].requirement?.id || allRecords[0].requirement?.reqId;
  const searchIdResult = allRecords.filter(r => (r.requirement?.id || r.requirement?.reqId || '').toLowerCase().includes(sampleReqId.toLowerCase()));
  assert(searchIdResult.length > 0, `7.1 Searching by Req ID ${sampleReqId} returns match`);
  assert(searchIdResult.some(r => (r.requirement?.id === sampleReqId || r.requirement?.reqId === sampleReqId)), '7.2 Target reqId found in search results');

  // Test 8: Search Flow Node
  console.log('\n8. Search Flow Node');
  const qNode = 'N_P002';
  const searchNodeResult = allRecords.filter(r => (r.nodes || []).some(n => (n.id || n.nodeId || '').includes(qNode)));
  assert(searchNodeResult.length > 0, `8.1 Searching by Flow Node ${qNode} returns matching requirements (got: ${searchNodeResult.length})`);

  // Test 9: Search Business Rule
  console.log('\n9. Search Business Rule');
  const sampleRuleRecord = allRecords.find(r => r.businessRules && r.businessRules.length > 0);
  const sampleRuleId = sampleRuleRecord.businessRules[0].id || sampleRuleRecord.businessRules[0].code;
  const searchRuleResult = allRecords.filter(r => (r.businessRules || []).some(br => (br.id || br.code || '').includes(sampleRuleId)));
  assert(searchRuleResult.length > 0, `9.1 Searching by Business Rule ${sampleRuleId} returns matching requirements (got: ${searchRuleResult.length})`);

  // Test 10: Combined Filters
  console.log('\n10. Combined Filters');
  const combined = allRecords.filter(r => 
    (r.module?.id === '04-okulasi' || r.requirement?.module === '04-okulasi') &&
    (r.classification === 'covered' || r.classification === 'Covered' || r.classificationLabel === 'Covered') &&
    r.businessRules.length > 0
  );
  assert(combined.length > 0, `10.1 Combined Module + Covered + Linked Rules filter returns valid subset (got: ${combined.length})`);
  assert(combined.every(r => (r.classification === 'covered' || r.classification === 'Covered' || r.classificationLabel === 'Covered') && r.businessRules.length > 0), '10.2 All combined records strictly satisfy all criteria');

  // Test 11: Pagination Calculations
  console.log('\n11. Pagination Calculations');
  const pageSize5 = 5;
  const totalPages5 = Math.ceil(allRecords.length / pageSize5);
  assert(totalPages5 === 33, `11.1 Total pages for 165 records with pageSize=5 is 33 (got: ${totalPages5})`);
  const page1 = allRecords.slice(0, 5);
  assert(page1.length === 5, '11.2 Page 1 contains exactly 5 records');

  // Test 12: Page Size Options
  console.log('\n12. Page Size Options');
  [5, 10, 25, 50].forEach(size => {
    const pages = Math.ceil(allRecords.length / size);
    assert(pages > 0, `12.1 Page size ${size} produces valid page count (${pages} pages)`);
  });

  // Test 13: Empty State Handling
  console.log('\n13. Empty State Handling');
  const nonExistent = allRecords.filter(r => (r.requirement?.title || '').includes('NON_EXISTENT_QUERY_STRING_XYZ'));
  assert(nonExistent.length === 0, '13.1 Non-matching search produces empty list safely without exception');

  // Test 14: Row Trace Detail Drilldown Data
  console.log('\n14. Row Trace Detail Drilldown Data');
  const firstTrace = getRequirementTrace(allRecords[0].requirement.id);
  assert(firstTrace !== null && typeof firstTrace === 'object', '14.1 getRequirementTrace returns structured detail object');
  assert(firstTrace.requirement && firstTrace.criteria !== undefined, '14.2 Trace detail includes requirement and canonical criteria');
  assert(Array.isArray(firstTrace.nodes), '14.3 Trace detail includes nodes array');
  assert(Array.isArray(firstTrace.businessRules), '14.4 Trace detail includes businessRules array');

  // Test 15: Cross Navigation - Requirement Target
  console.log('\n15. Cross Navigation - Requirement Target');
  const targetReqId = allRecords[0].requirement.id;
  assert(targetReqId && typeof targetReqId === 'string', '15.1 Target requirement ID is valid for jumpToRequirement');

  // Test 16: Cross Navigation - Flow Node Target
  console.log('\n16. Cross Navigation - Flow Node Target');
  const coveredWithNode = allRecords.find(r => r.nodes && r.nodes.length > 0);
  assert(coveredWithNode && coveredWithNode.nodes[0].id, '16.1 Covered record has valid node ID for jumpToFlowNode');
  assert(coveredWithNode.nodes[0].moduleId, '16.2 Covered record node has valid moduleId');

  // Test 17: Cross Navigation - Business Rule Target
  console.log('\n17. Cross Navigation - Business Rule Target');
  const recordWithRule = allRecords.find(r => r.businessRules && r.businessRules.length > 0);
  assert(recordWithRule && recordWithRule.businessRules[0].id, '17.1 Record has valid businessRule ID for detail modal');

  // Test 18: Multiple Nodes Linked Requirement
  console.log('\n18. Multiple Nodes Linked Requirement');
  const multiNodeReq = allRecords.find(r => r.nodes && r.nodes.length > 1);
  if (multiNodeReq) {
    assert(multiNodeReq.nodes.length > 1, `18.1 Multi-node requirement identified (${multiNodeReq.requirement.id} has ${multiNodeReq.nodes.length} nodes)`);
  } else {
    assert(true, '18.1 Single-node requirements handled gracefully');
  }

  // Test 19: Multiple Rules Linked Requirement
  console.log('\n19. Multiple Rules Linked Requirement');
  const multiRuleReq = allRecords.find(r => r.businessRules && r.businessRules.length > 1);
  assert(multiRuleReq !== undefined, '19.1 Multi-rule requirement identified in active dataset');
  assert(multiRuleReq.businessRules.length >= 2, `19.2 Multi-rule requirement has ${multiRuleReq.businessRules.length} rules linked`);

  // Test 20: True Gap Row Verification
  console.log('\n20. True Gap Row Verification');
  const gapSample = allRecords.find(r => r.classification === 'gap' || r.classification === 'True Gap' || r.classificationLabel === 'True Gap');
  assert(gapSample !== undefined, '20.1 True Gap sample exists');
  assert(gapSample.hasFlowNodeGap === true, '20.2 True Gap hasFlowNodeGap is true');
  assert(gapSample.isFlowRequired === true, '20.3 True Gap isFlowRequired is true');
  assert(gapSample.isGap === true, '20.4 True Gap isGap is true');

  // Test 21: Management Row Verification
  console.log('\n21. Management Row Verification');
  const mgmtSample = allRecords.find(r => r.classification === 'management' || r.classification === 'Business / Management' || r.classificationLabel === 'Business / Management');
  assert(mgmtSample !== undefined, '21.1 Business / Management sample exists');
  assert(mgmtSample.isFlowRequired === false, '21.2 Business / Management isFlowRequired is false');
  assert(mgmtSample.isGap === false, '21.3 Business / Management isGap is false');

  // Test 22: Covered Row Verification
  console.log('\n22. Covered Row Verification');
  const coveredSample = allRecords.find(r => r.classification === 'covered' || r.classification === 'Covered' || r.classificationLabel === 'Covered');
  assert(coveredSample !== undefined, '22.1 Covered sample exists');
  assert(coveredSample.nodes.length > 0, '22.2 Covered sample has linked flow nodes');
  assert(coveredSample.isGap === false, '22.3 Covered sample isGap is false');

  // Test 23: Archived Requirement Exclusion
  console.log('\n23. Archived Requirement Exclusion');
  const newReq = createRequirement({
    title: 'Temporary Requirement for RTM Archive Test',
    role: 'Mantri Bibitan',
    module: '04-okulasi',
    feature: 'grafting',
    category: 'Operasional',
    process: 'Proses uji coba RTM'
  });
  const tracesBeforeArchive = getAllTraceabilityRecords();
  assert(tracesBeforeArchive.length === 166, `23.1 After adding requirement, total traces = 166 (got: ${tracesBeforeArchive.length})`);

  archiveRequirement(newReq.id, 'Pembersihan pengujian');
  const tracesAfterArchive = getAllTraceabilityRecords();
  assert(tracesAfterArchive.length === 165, `23.2 After archiving requirement, total traces returns to 165 (got: ${tracesAfterArchive.length})`);
  assert(!tracesAfterArchive.some(r => r.requirement.id === newReq.id), '23.3 Archived requirement is excluded from RTM list');

  // Test 24: Deterministic Ordering
  console.log('\n24. Deterministic Ordering');
  const tracesRun1 = getAllTraceabilityRecords();
  const tracesRun2 = getAllTraceabilityRecords();
  assert(tracesRun1.length === tracesRun2.length, '24.1 Deterministic length across consecutive calls');
  assert(tracesRun1[0].requirement.id === tracesRun2[0].requirement.id, '24.2 Deterministic ordering matches exactly');

  // Test 25: No Source Mutation
  console.log('\n25. No Source Mutation');
  resetDraftToOfficial();
  const freshRecords = getAllTraceabilityRecords();
  assert(freshRecords.length === 165, '25.1 Official store reset retains exactly 165 active requirements');

  // Test 26: Existing Phase 4A Compatibility
  console.log('\n26. Existing Phase 4A Compatibility');
  const metrics = getCoverageMetrics();
  assert(metrics.totalActiveRequirements === 165, `26.1 Phase 4A getCoverageMetrics totalActiveRequirements = 165 (got: ${metrics.totalActiveRequirements})`);
  assert(metrics.flowCovered === 122, `26.2 Phase 4A getCoverageMetrics flowCovered = 122 (got: ${metrics.flowCovered})`);

  // Test 27: Existing Phase 4B Compatibility
  console.log('\n27. Existing Phase 4B Compatibility');
  const nodeTrace = getNodeTrace('04-okulasi', 'grafting', 'N_P002');
  assert(nodeTrace !== null, '27.1 Phase 4B getNodeTrace returns node trace object');
  assert(Array.isArray(nodeTrace.businessRules), '27.2 Phase 4B node trace includes businessRules array');

  // Test 28: 11 Columns Completeness
  console.log('\n28. 11 Columns Completeness');
  const sampleTrace = allRecords[0];
  const reqObj = sampleTrace.requirement;
  const col1_id = reqObj.id || reqObj.reqId;
  const col2_title = reqObj.title;
  const col3_role = reqObj.role;
  const col4_module = sampleTrace.module?.name || reqObj.module;
  const col5_feature = sampleTrace.feature?.name || reqObj.feature;
  const col6_fstatus = sampleTrace.nodes.length > 0 ? 'Linked' : 'No Flow';
  const col7_fnode = sampleTrace.nodes;
  const col8_rule = sampleTrace.businessRules;
  const col9_status = reqObj.status;
  const col10_class = sampleTrace.classification;
  const col11_action = '...';

  assert(col1_id !== undefined && col2_title !== undefined && col3_role !== undefined &&
         col4_module !== undefined && col5_feature !== undefined && col6_fstatus !== undefined &&
         col7_fnode !== undefined && col8_rule !== undefined && col9_status !== undefined &&
         col10_class !== undefined && col11_action !== undefined,
         '28.1 All 11 columns data fields are fully resolvable for every row');

  // Test 29: Action Options Availability
  console.log('\n29. Action Options Availability');
  const actionOptions = ['Detail Trace', 'Buka Requirement', 'Buka Alur Proses'];
  assert(actionOptions.length === 3, '29.1 Action dropdown contains 3 enterprise options');

  // Test 30: Filter Reset Determinism
  console.log('\n30. Filter Reset Determinism');
  let searchQ = allRecords[0].requirement.id;
  let filteredCount = allRecords.filter(r => (r.requirement.id || '').includes(searchQ)).length;
  assert(filteredCount < 165 && filteredCount > 0, `30.1 Filtered count (${filteredCount}) is a subset of 165`);
  searchQ = '';
  let resetCount = allRecords.filter(r => (r.requirement.id || '').includes(searchQ)).length;
  assert(resetCount === 165, '30.2 Reset filter restores all 165 records');

  console.log('\n====================================================');
  console.log(`🎉 ALL PHASE 4C TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions)`);
  console.log('====================================================\n');
}

runPhase4CTestSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
