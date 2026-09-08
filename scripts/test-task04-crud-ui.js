/**
 * TASK 04 — UI CRUD & FRONTEND INTEGRATION VERIFICATION TEST SUITE
 * 
 * Verifies full end-to-end CRUD capabilities using processMappingApi adapter:
 * 1. Requirement CRUD (Create, Read, Edit, Archive, Restore)
 * 2. Flow CRUD (Create Node, Edit Node, Archive Node, Create Edge, Edit Edge, Archive Edge)
 * 3. Business Rule CRUD (Create, Edit)
 * 4. Traceability Mapping (Create Mapping, Delete Mapping)
 * 5. Persistence across server storage & GET /api/process-mapping/data
 * 6. Audit Trail Logging (CREATE, UPDATE, ARCHIVE, RESTORE, MAP, UNMAP)
 * 7. Business & Data Integrity Validation (Duplicate ID, Self-loop edge, Broken edge, Invalid mapping)
 */

import { processMappingApi } from '../js/modules/process-mapping/process-mapping-api.js';
import {
  initProjectDataStore,
  getActiveStore
} from '../js/modules/process-mapping/process-mapping-data.js';

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let failed = 0;
const results = [];

function assert(id, desc, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ [${id}] ${desc} ${extra ? `(${extra})` : ''}`);
    results.push({ id, desc, pass: true });
  } else {
    failed++;
    console.error(`  ❌ [${id}] ${desc} ${extra ? `(${extra})` : ''}`);
    results.push({ id, desc, pass: false, error: extra });
  }
}

async function runTask04Tests() {
  console.log('==================================================');
  console.log('  TASK 04 UI CRUD INTEGRATION VERIFICATION SUITE');
  console.log('  Target: ' + BASE_URL);
  console.log('==================================================\n');

  const testSuffix = 'T4_' + Date.now();
  const testReqId = `RN-TEST-${testSuffix}`;
  const testNodeId = `NODE_TEST_${testSuffix}`;
  const testEdgeId = `EDGE_TEST_${testSuffix}`;
  const testRuleId = `BR-TEST-${testSuffix}`;
  const testModuleId = '01-presensi';
  const testFeatureId = 'presensi-supervisor';

  // --- SECTION 1: REQUIREMENT CRUD ---
  console.log('--- 1. Requirement CRUD (Create, Read, Edit, Archive, Restore) ---');

  // 1.1 CREATE Requirement
  try {
    const createReqRes = await processMappingApi.createRequirement({
      id: testReqId,
      title: `Automated Test Requirement ${testSuffix}`,
      role: 'Mantri Bibitan',
      module: 'Presensi',
      moduleId: testModuleId,
      feature: 'Presensi Supervisor',
      featureId: testFeatureId,
      acceptanceCriteria: 'Kriteria pengujian otomatis UI CRUD',
      input: 'Data Input Test',
      validation: 'Validasi Format Test',
      output: 'Hasil Output Test',
      fallback: 'Fallback Test',
      businessRule: 'BR-GLB-001',
      status: 'Draft'
    }, 'Test BA User', 'Create requirement via UI CRUD');

    assert('T04.1.1', 'POST Requirement via processMappingApi returns success', createReqRes.success === true);
    assert('T04.1.2', 'Created requirement has correct test ID', createReqRes.data.id === testReqId);
  } catch (err) {
    assert('T04.1.1', 'POST Requirement error', false, err.message);
  }

  // 1.2 READ Requirement
  try {
    const getReqRes = await processMappingApi.getRequirement(testReqId);
    assert('T04.1.3', 'GET Requirement returns created item', getReqRes.success && getReqRes.data.id === testReqId);
  } catch (err) {
    assert('T04.1.3', 'GET Requirement error', false, err.message);
  }

  // 1.3 EDIT / UPDATE Requirement
  try {
    const updateReqRes = await processMappingApi.updateRequirement(testReqId, {
      title: `Updated Title ${testSuffix}`,
      input: 'Updated Input Data'
    }, 'Test BA User', 'Update requirement details');

    assert('T04.1.4', 'PUT Requirement returns success', updateReqRes.success === true);
    assert('T04.1.5', 'Updated requirement title matches new value', updateReqRes.data.title === `Updated Title ${testSuffix}`);
  } catch (err) {
    assert('T04.1.4', 'PUT Requirement error', false, err.message);
  }

  // 1.4 ARCHIVE Requirement (Soft delete)
  try {
    const archiveReqRes = await processMappingApi.archiveRequirement(testReqId, 'Test BA User', 'Archive requirement');
    assert('T04.1.6', 'PATCH Archive Requirement returns success', archiveReqRes.success === true);
    assert('T04.1.7', 'Archived requirement marked with isArchived=true', archiveReqRes.data.isArchived === true);

    // Verify it is excluded from active requirements list by default
    const activeReqs = await processMappingApi.getRequirements({ isArchived: 'false' });
    const isPresentInActive = activeReqs.data.some(r => r.id === testReqId);
    assert('T04.1.8', 'Archived requirement is excluded from active list', isPresentInActive === false);

    // Verify it is present when including archived
    const allReqs = await processMappingApi.getRequirements({ includeArchived: 'true' });
    const isPresentInArchived = allReqs.data.some(r => r.id === testReqId && r.isArchived);
    assert('T04.1.9', 'Archived requirement is present in archived dataset', isPresentInArchived === true);
  } catch (err) {
    assert('T04.1.6', 'Archive Requirement error', false, err.message);
  }

  // 1.5 RESTORE Requirement
  try {
    const restoreReqRes = await processMappingApi.restoreRequirement(testReqId, 'Test BA User', 'Restore requirement to active');
    assert('T04.1.10', 'PATCH Restore Requirement returns success', restoreReqRes.success === true);
    assert('T04.1.11', 'Restored requirement has isArchived=false', restoreReqRes.data.isArchived === false);

    // Verify it returns to active list
    const activeReqs = await processMappingApi.getRequirements({ isArchived: 'false' });
    const isPresentInActive = activeReqs.data.some(r => r.id === testReqId);
    assert('T04.1.12', 'Restored requirement is back in active list', isPresentInActive === true);
  } catch (err) {
    assert('T04.1.10', 'Restore Requirement error', false, err.message);
  }

  // --- SECTION 2: FLOW CRUD (Node & Edge) ---
  console.log('\n--- 2. Flow CRUD (Create, Edit, Archive Node & Edge) ---');

  // 2.1 CREATE Flow Node
  try {
    const createNodeRes = await processMappingApi.createFlowNode(testModuleId, testFeatureId, {
      id: testNodeId,
      code: `P-${testSuffix.slice(-3)}`,
      label: `Test Step ${testSuffix}`,
      type: 'process',
      purpose: 'Testing node creation',
      reqId: testReqId,
      input: 'Form input',
      output: 'Output record'
    }, 'Test BA User', 'Create flow node via UI');

    const createdNode = createNodeRes.data?.node || createNodeRes.data;
    assert('T04.2.1', 'POST Flow Node returns success', createNodeRes.success === true);
    assert('T04.2.2', 'Created flow node ID matches', createdNode?.id === testNodeId);
  } catch (err) {
    assert('T04.2.1', 'POST Flow Node error', false, err.message);
  }

  // 2.2 UPDATE Flow Node
  try {
    const updateNodeRes = await processMappingApi.updateFlowNode(testModuleId, testFeatureId, testNodeId, {
      label: `Updated Step Label ${testSuffix}`,
      purpose: 'Updated purpose description'
    }, 'Test BA User', 'Update flow node details');

    const updatedNode = updateNodeRes.data?.node || updateNodeRes.data;
    assert('T04.2.3', 'PUT Flow Node returns success', updateNodeRes.success === true);
    assert('T04.2.4', 'Updated flow node label matches', updatedNode?.label === `Updated Step Label ${testSuffix}`);
  } catch (err) {
    assert('T04.2.3', 'PUT Flow Node error', false, err.message);
  }

  // 2.3 CREATE Flow Edge (from existing start node to new test node)
  const flowData = await processMappingApi.getFlow(testModuleId, testFeatureId);
  const startNode = flowData.data.nodes.find(n => n.id !== testNodeId && !n.isArchived) || flowData.data.nodes[0];

  try {
    const createEdgeRes = await processMappingApi.createFlowEdge(testModuleId, testFeatureId, {
      id: testEdgeId,
      from: startNode.id,
      to: testNodeId,
      condition: 'Sukses',
      label: 'Sukses',
      description: 'Test edge connection'
    }, 'Test BA User', 'Create flow edge via UI');

    const createdEdge = createEdgeRes.data?.edge || createEdgeRes.data;
    assert('T04.2.5', 'POST Flow Edge returns success', createEdgeRes.success === true);
    assert('T04.2.6', 'Created edge connects valid source and target', createdEdge?.from === startNode.id && createdEdge?.to === testNodeId);
  } catch (err) {
    assert('T04.2.5', 'POST Flow Edge error', false, err.message);
  }

  // 2.4 UPDATE Flow Edge
  try {
    const updateEdgeRes = await processMappingApi.updateFlowEdge(testModuleId, testFeatureId, testEdgeId, {
      condition: 'Lolos Validasi',
      label: 'Lolos Validasi'
    }, 'Test BA User', 'Update flow edge condition');

    const updatedEdge = updateEdgeRes.data?.edge || updateEdgeRes.data;
    assert('T04.2.7', 'PUT Flow Edge returns success', updateEdgeRes.success === true);
    assert('T04.2.8', 'Updated edge condition matches', updatedEdge?.condition === 'Lolos Validasi');
  } catch (err) {
    assert('T04.2.7', 'PUT Flow Edge error', false, err.message);
  }

  // 2.5 ARCHIVE Flow Edge & Node
  try {
    const archiveEdgeRes = await processMappingApi.updateFlowEdge(testModuleId, testFeatureId, testEdgeId, { isArchived: true }, 'Test BA User', 'Archive edge');
    assert('T04.2.9', 'Archive Flow Edge returns success', archiveEdgeRes.success === true);

    const archiveNodeRes = await processMappingApi.updateFlowNode(testModuleId, testFeatureId, testNodeId, { isArchived: true }, 'Test BA User', 'Archive node');
    assert('T04.2.10', 'Archive Flow Node returns success', archiveNodeRes.success === true);
  } catch (err) {
    assert('T04.2.9', 'Archive Edge/Node error', false, err.message);
  }

  // --- SECTION 3: BUSINESS RULE CRUD ---
  console.log('\n--- 3. Business Rule CRUD (Create, Edit) ---');

  // 3.1 CREATE Business Rule
  try {
    const createRuleRes = await processMappingApi.createRule({
      id: testRuleId,
      title: `Aturan Bisnis Test ${testSuffix}`,
      category: 'Validasi Operasional',
      desc: 'Deskripsi aturan bisnis pengujian',
      impact: 'Dampak stok dan integritas'
    }, 'Test BA User', 'Create business rule via UI');

    assert('T04.3.1', 'POST Business Rule returns success', createRuleRes.success === true);
    assert('T04.3.2', 'Created rule ID matches', createRuleRes.data.id === testRuleId);
  } catch (err) {
    assert('T04.3.1', 'POST Business Rule error', false, err.message);
  }

  // 3.2 UPDATE Business Rule
  try {
    const updateRuleRes = await processMappingApi.updateRule(testRuleId, {
      title: `Updated Aturan Bisnis Title ${testSuffix}`,
      desc: 'Updated deskripsi aturan'
    }, 'Test BA User', 'Update business rule');

    assert('T04.3.3', 'PUT Business Rule returns success', updateRuleRes.success === true);
    assert('T04.3.4', 'Updated rule title matches', updateRuleRes.data.title === `Updated Aturan Bisnis Title ${testSuffix}`);
  } catch (err) {
    assert('T04.3.3', 'PUT Business Rule error', false, err.message);
  }

  // --- SECTION 4: TRACEABILITY MAPPING ---
  console.log('\n--- 4. Traceability Mapping (Create, Delete) ---');

  const testMappingId = `MAP_${testSuffix}`;
  try {
    const createMapRes = await processMappingApi.createMapping({
      id: testMappingId,
      sourceEntity: 'Requirement',
      sourceId: testReqId,
      targetEntity: 'BusinessRule',
      targetId: testRuleId
    }, 'Test BA User', 'Map requirement to business rule');

    assert('T04.4.1', 'POST Mapping returns success', createMapRes.success === true);
    assert('T04.4.2', 'Created mapping links requirement to business rule', createMapRes.data.sourceId === testReqId && createMapRes.data.targetId === testRuleId);
  } catch (err) {
    assert('T04.4.1', 'POST Mapping error', false, err.message);
  }

  try {
    const deleteMapRes = await processMappingApi.deleteMapping(testMappingId, {
      sourceEntity: 'Requirement',
      sourceId: testReqId,
      targetEntity: 'BusinessRule',
      targetId: testRuleId
    }, 'Test BA User', 'Unmap requirement from business rule');

    assert('T04.4.3', 'DELETE Mapping returns success', deleteMapRes.success === true);
  } catch (err) {
    assert('T04.4.3', 'DELETE Mapping error', false, err.message);
  }

  // --- SECTION 5: PERSISTENCE & DATA REFRESH ---
  console.log('\n--- 5. Persistence & Data Re-fetch Verification ---');
  try {
    const freshStore = await initProjectDataStore(true);
    assert('T04.5.1', 'initProjectDataStore(true) cleanly loads latest dataset', freshStore !== null && typeof freshStore === 'object');
    
    // Check our test requirement exists in the re-fetched dataset
    const foundInStore = freshStore.requirements.find(r => r.id === testReqId);
    assert('T04.5.2', 'Server dataset contains persisted test requirement', Boolean(foundInStore));
    assert('T04.5.3', 'Persisted title reflects updated value', foundInStore?.title === `Updated Title ${testSuffix}`);
  } catch (err) {
    assert('T04.5.1', 'Persistence re-fetch error', false, err.message);
  }

  // --- SECTION 6: VALIDATION ERROR HANDLING ---
  console.log('\n--- 6. Business Validation & Error Handling ---');

  // 6.1 Duplicate Requirement ID
  try {
    await processMappingApi.createRequirement({
      id: testReqId,
      title: 'Duplicate Req',
      role: 'Mantri Bibitan',
      module: 'Presensi',
      moduleId: testModuleId,
      feature: 'Presensi Supervisor',
      featureId: testFeatureId
    });
    assert('T04.6.1', 'Duplicate requirement ID rejected', false, 'Expected duplicate to fail');
  } catch (err) {
    assert('T04.6.1', 'Duplicate requirement ID rejected with 409 Conflict', err.status === 409);
  }

  // 6.2 Duplicate Rule ID
  try {
    await processMappingApi.createRule({
      id: testRuleId,
      title: 'Duplicate Rule',
      desc: 'Duplicate Desc'
    });
    assert('T04.6.2', 'Duplicate rule ID rejected', false, 'Expected duplicate rule to fail');
  } catch (err) {
    assert('T04.6.2', 'Duplicate rule ID rejected with 409 Conflict', err.status === 409);
  }

  // 6.3 Self-loop Edge
  try {
    await processMappingApi.createFlowEdge(testModuleId, testFeatureId, {
      from: startNode.id,
      to: startNode.id
    });
    assert('T04.6.3', 'Self-loop edge rejected', false, 'Expected self-loop to fail');
  } catch (err) {
    assert('T04.6.3', 'Self-loop edge rejected with 400 Bad Request', err.status === 400);
  }

  // 6.4 Broken Edge (non-existent target)
  try {
    await processMappingApi.createFlowEdge(testModuleId, testFeatureId, {
      from: startNode.id,
      to: '__NON_EXISTENT_TARGET_NODE_ID__'
    });
    assert('T04.6.4', 'Broken edge rejected', false, 'Expected broken edge to fail');
  } catch (err) {
    assert('T04.6.4', 'Broken edge rejected with 400 Bad Request', err.status === 400);
  }

  // 6.5 Invalid Mapping (non-existent target entity)
  try {
    await processMappingApi.createMapping({
      sourceEntity: 'Requirement',
      sourceId: testReqId,
      targetEntity: 'FlowNode',
      targetId: '__NON_EXISTENT_TARGET_NODE_ID__',
      moduleId: testModuleId,
      featureId: testFeatureId
    });
    assert('T04.6.5', 'Invalid mapping rejected', false, 'Expected invalid mapping to fail');
  } catch (err) {
    assert('T04.6.5', 'Invalid mapping rejected with 400/404 Error', err.status === 400 || err.status === 404);
  }

  // --- SECTION 7: AUDIT LOG VERIFICATION ---
  console.log('\n--- 7. Audit Log Trail Verification ---');
  try {
    const auditRes = await processMappingApi.getAuditLogs({ limit: 50 });
    assert('T04.7.1', 'GET Audit Logs returns success', auditRes.success === true);
    assert('T04.7.2', 'Audit logs contain entries', Array.isArray(auditRes.data) && auditRes.data.length > 0);

    const logActions = new Set(auditRes.data.map(l => l.action));
    assert('T04.7.3', 'Audit log records CREATE action', logActions.has('CREATE'));
    assert('T04.7.4', 'Audit log records UPDATE action', logActions.has('UPDATE'));
    assert('T04.7.5', 'Audit log records ARCHIVE action', logActions.has('ARCHIVE'));
    assert('T04.7.6', 'Audit log records RESTORE action', logActions.has('RESTORE'));
    assert('T04.7.7', 'Audit log records MAP / UNMAP action', logActions.has('MAP') || logActions.has('UNMAP'));
  } catch (err) {
    assert('T04.7.1', 'Audit log error', false, err.message);
  }

  // Clean up test requirement (archive it)
  try {
    await processMappingApi.archiveRequirement(testReqId, 'Test Cleanup', 'Clean up test data');
  } catch (e) {}

  // Summary
  console.log('\n==================================================');
  console.log('  TASK 04 TEST SUMMARY');
  console.log('==================================================');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(`  Status: ${failed === 0 ? 'ALL CRUD UI INTEGRATION TESTS PASS ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTask04Tests();
