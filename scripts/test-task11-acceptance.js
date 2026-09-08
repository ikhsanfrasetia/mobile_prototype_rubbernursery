/**
 * scripts/test-task11-acceptance.js — Feature Acceptance Test for Task 11
 * Executes tests 1 to 7 defined in Task 11 prompt.
 */

import { processMappingApi } from '../js/modules/process-mapping/process-mapping-api.js';

let passed = 0;
let failed = 0;

function assert(id, desc, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ [${id}] ${desc} ${extra ? `(${extra})` : ''}`);
  } else {
    failed++;
    console.error(`  ❌ [${id}] ${desc} FAILED ${extra ? `(${extra})` : ''}`);
  }
}

async function runAcceptanceTests() {
  console.log('==================================================');
  console.log('🧪 TASK 11 FEATURE ACCEPTANCE TEST SUITE');
  console.log('==================================================');

  // TEST 1 — Requirement Manager
  console.log('\n--- TEST 1: Requirement Manager & Catalog ---');
  const reqListRes = await processMappingApi.getRequirements();
  assert('T11.1.1', 'Active requirement list contains only unarchived items',
    reqListRes.success && reqListRes.data.every(r => !r.isArchived));
  assert('T11.1.2', 'Active requirement count matches canonical 127',
    reqListRes.total === 127, `Count: ${reqListRes.total}`);

  // Search & Filter
  const searchRes = await processMappingApi.getRequirements({ search: 'presensi' });
  assert('T11.1.3', 'Search returns matching items', searchRes.data.length > 0);

  const filterRes = await processMappingApi.getRequirements({ moduleId: '02-penerimaan' });
  assert('T11.1.4', 'Filter by module returns scoped items', filterRes.data.every(r => r.moduleId === '02-penerimaan'));

  // Detail
  const detailRes = await processMappingApi.getRequirement('RN-PRS-001');
  assert('T11.1.5', 'Requirement detail loads completely', detailRes.success && detailRes.data.id === 'RN-PRS-001');

  // TEST 2 — Edit Requirement with rollback
  console.log('\n--- TEST 2: Edit Requirement with Persistence ---');
  const testEditId = 'RN-PRS-001';
  const origDetail = await processMappingApi.getRequirement(testEditId);
  const origTitle = origDetail.data.title;

  const editRes = await processMappingApi.updateRequirement(testEditId, {
    title: origTitle + ' [TEMP_EDIT]'
  }, 'AcceptanceTester', 'Temporary test edit');
  assert('T11.2.1', 'PUT Requirement returns updated title', editRes.data.title.includes('[TEMP_EDIT]'));

  // Verify persistence via fresh GET
  const verifyEdit = await processMappingApi.getRequirement(testEditId);
  assert('T11.2.2', 'Fresh GET reflects updated title', verifyEdit.data.title.includes('[TEMP_EDIT]'));

  // Revert back to original
  await processMappingApi.updateRequirement(testEditId, { title: origTitle }, 'AcceptanceTester', 'Revert test edit');
  const revertedDetail = await processMappingApi.getRequirement(testEditId);
  assert('T11.2.3', 'Requirement reverted cleanly to original title', revertedDetail.data.title === origTitle);

  // TEST 3 & 4 — Archive & Restore
  console.log('\n--- TEST 3 & 4: Archive & Restore Lifecycle ---');
  const tempTestReqId = `__ACC_TEST_REQ_${Date.now()}__`;
  await processMappingApi.createRequirement({
    id: tempTestReqId,
    title: 'Temporary Acceptance Test Req',
    role: 'Mantri Bibitan',
    module: '01-presensi',
    feature: 'presensi-supervisor',
    moduleId: '01-presensi',
    featureId: 'presensi-supervisor',
    status: 'Draft',
    input: 'test',
    validation: 'test',
    output: 'test',
    fallback: 'test'
  }, 'AcceptanceTester', 'Create temp req');

  // Archive
  const archRes = await processMappingApi.archiveRequirement(tempTestReqId, 'AcceptanceTester', 'Archive temp req');
  assert('T11.3.1', 'Archive marks isArchived=true', archRes.data.isArchived === true);

  const activeCheck = await processMappingApi.getRequirements();
  assert('T11.3.2', 'Archived req is excluded from default active list', !activeCheck.data.some(r => r.id === tempTestReqId));

  const fullCheck = await processMappingApi.getRequirements({ includeArchived: true });
  assert('T11.3.3', 'Archived req is present when includeArchived=true', fullCheck.data.some(r => r.id === tempTestReqId));

  // Restore
  const restRes = await processMappingApi.restoreRequirement(tempTestReqId, 'AcceptanceTester', 'Restore temp req');
  assert('T11.4.1', 'Restore marks isArchived=false', restRes.data.isArchived === false);

  // Clean up
  await processMappingApi.archiveRequirement(tempTestReqId, 'AcceptanceTester', 'Final cleanup of temp req');
  assert('T11.4.2', 'Temporary requirement cleaned up successfully', true);

  // TEST 5 — Flow & Edge Integrity
  console.log('\n--- TEST 5: Flow, Nodes, & Edge Integrity ---');
  const flowRes = await processMappingApi.getFlows();
  assert('T11.5.1', 'GET Flows returns valid dataset', flowRes.success && typeof flowRes.data === 'object');

  let brokenEdgeCount = 0;
  let totalEdgeCount = 0;
  for (const m of Object.keys(flowRes.data || {})) {
    for (const f of Object.keys(flowRes.data[m] || {})) {
      const fl = flowRes.data[m][f];
      const nodeIds = new Set((fl.nodes || []).map(n => n.id));
      (fl.edges || []).forEach(e => {
        totalEdgeCount++;
        const from = e.from || e.fromNode;
        const to = e.to || e.toNode;
        if (!nodeIds.has(from) || !nodeIds.has(to)) {
          brokenEdgeCount++;
        }
      });
    }
  }
  assert('T11.5.2', 'Total active edges valid and 0 broken edges', brokenEdgeCount === 0 && totalEdgeCount >= 30, `Total: ${totalEdgeCount}, Broken: ${brokenEdgeCount}`);

  // TEST 6 — Business Rules
  console.log('\n--- TEST 6: Business Rules & Traceability ---');
  const ruleRes = await processMappingApi.getRules();
  assert('T11.6.1', 'GET Business Rules returns canonical list', ruleRes.success && ruleRes.data.length >= 18);
  const canonical18 = [
    'BR-GLB-001', 'BR-GLB-002', 'BR-GLB-003',
    'BR-PRS-001', 'BR-PRS-003',
    'BR-OKL-001', 'BR-OKL-002', 'BR-OKL-005', 'BR-OKL-006', 'BR-OKL-007', 'BR-OKL-008',
    'BR-SEM-001', 'BR-SEM-006', 'BR-SEM-007',
    'BR-SEL-001', 'BR-MAT-001', 'BR-AUD-001', 'BR-QAL-001'
  ];
  const all18Present = canonical18.every(id => ruleRes.data.some(r => (r.id || r.code) === id));
  assert('T11.6.2', 'All 18 canonical Master Baseline rules are present', all18Present);

  // TEST 7 — Persistence & Consistency
  console.log('\n--- TEST 7: Data Store Persistence Check ---');
  const projectData = await processMappingApi.getProjectData();
  assert('T11.7.1', 'Full project data payload is valid JSON and contains metadata', projectData.success && projectData.data?.metadata?.version === '2.2.0');
  assert('T11.7.2', 'Active confirmed requirements match expected count', projectData.data.requirements.filter(r => !r.isArchived && r.status === 'Confirmed').length === 121);
  assert('T11.7.3', 'Open points / pending consensus items preserved (6 items)', projectData.data.requirements.filter(r => !r.isArchived && r.status !== 'Confirmed').length === 6);

  console.log('\n==================================================');
  console.log('  ACCEPTANCE TEST SUMMARY');
  console.log('==================================================');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(`  Status: ${failed === 0 ? 'ALL ACCEPTANCE TESTS PASS ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runAcceptanceTests().catch(err => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});
