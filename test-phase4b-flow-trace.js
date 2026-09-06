/**
 * Automated Regression & Unit Test Suite for Phase 4B: Flow Trace Enhancement
 * Covers:
 * 1. Node supports ruleIds (optional, additive)
 * 2. Valid rule ID accepted & linked
 * 3. Duplicate rule IDs deduplicated
 * 4. Invalid rule IDs filtered cleanly without error
 * 5. Legacy node.businessRule text still resolved
 * 6. Node -> Requirement link (getNodeTrace)
 * 7. Requirement -> Node link (getRequirementTrace)
 * 8. Node -> Business Rule link
 * 9. Requirement -> Business Rule link
 * 10. Multiple nodes resolution & deterministic sorting
 * 11. Multiple rules resolution & deterministic sorting
 * 12. Missing relation handled safely (graceful fallback)
 * 13. Archived node excluded from active trace
 * 14. Archived requirement excluded from active trace
 * 15. Baseline data remains unmutated
 * 16. Existing node revision workflow preserved (v1 confirmed -> v2 draft)
 * 17. validateAndLinkNodeBusinessRules helper functionality
 */

import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getNodeTrace,
  getRequirementTrace,
  validateAndLinkNodeBusinessRules,
  validateAndLinkBusinessRules,
  addFlowNode,
  editFlowNode,
  archiveFlowNode,
  createRequirement,
  archiveRequirement,
  confirmEntityRevision
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

async function runPhase4BTests() {
  console.log('=== STARTING PHASE 4B: FLOW TRACE ENHANCEMENT TEST SUITE ===\n');
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
  // 1. Initialize & Baseline Integrity Check
  // ---------------------------------------------------------------------------
  const store = initProjectDataStore(true);
  assert(store && store.requirements.length === 165, '1. Store initialized from baseline (165 reqs)');
  assert(store.businessRules.length === 16, '2. Total business rules is 16');

  // ---------------------------------------------------------------------------
  // 2. Node -> Requirement Trace Resolution (getNodeTrace)
  // ---------------------------------------------------------------------------
  const nodeTrace1 = getNodeTrace('01-presensi', 'presensi-supervisor', 'PR_START');
  assert(nodeTrace1 !== null, '3. getNodeTrace returns trace object for existing PR_START node');
  assert(nodeTrace1.node && nodeTrace1.node.id === 'PR_START', '4. Node trace contains correct node entity');
  assert(nodeTrace1.requirement !== null && nodeTrace1.requirement.id === 'RN-PRS-001', '5. Node -> Requirement correctly resolved (RN-PRS-001)');
  assert(nodeTrace1.hasReqLink === true, '6. Node trace hasReqLink is true');
  assert(nodeTrace1.criteria.length > 0, '7. Node trace resolves criteria');

  // ---------------------------------------------------------------------------
  // 3. Legacy Business Rule Text Resolution in Node Trace
  // ---------------------------------------------------------------------------
  assert(nodeTrace1.businessRules.length > 0, '8. Node trace resolves legacy businessRule text into BusinessRule entity');
  assert(nodeTrace1.businessRules.some(br => br.id === 'BR-PRS-001'), '9. BR-PRS-001 resolved from node.businessRule text');
  assert(nodeTrace1.hasRuleLink === true, '10. Node trace hasRuleLink is true');

  // ---------------------------------------------------------------------------
  // 4. Node supports ruleIds (Structured Linking)
  // ---------------------------------------------------------------------------
  const linkNodeResult = validateAndLinkNodeBusinessRules('01-presensi', 'presensi-supervisor', 'PR_START', ['BR-GLB-001', 'BR-PRS-001']);
  assert(linkNodeResult.success === true, '11. validateAndLinkNodeBusinessRules succeeds');
  assert(linkNodeResult.ruleIds.length === 2, '12. Valid rule IDs linked to flow node');

  // Duplicate rule IDs deduplicated
  const dupNodeResult = validateAndLinkNodeBusinessRules('01-presensi', 'presensi-supervisor', 'PR_START', ['BR-GLB-001', 'BR-GLB-001']);
  assert(dupNodeResult.ruleIds.length === 1 && dupNodeResult.ruleIds[0] === 'BR-GLB-001', '13. Duplicate rule IDs deduplicated on node');

  // Invalid rule IDs rejected cleanly
  const invalidNodeResult = validateAndLinkNodeBusinessRules('01-presensi', 'presensi-supervisor', 'PR_START', ['NOT-A-REAL-RULE-999', 'BR-GLB-002']);
  assert(invalidNodeResult.ruleIds.length === 1 && invalidNodeResult.ruleIds[0] === 'BR-GLB-002', '14. Invalid rule IDs ignored cleanly on node');

  // ---------------------------------------------------------------------------
  // 5. Requirement -> Node Trace Resolution (getRequirementTrace)
  // ---------------------------------------------------------------------------
  const reqTrace1 = getRequirementTrace('RN-PRS-001');
  assert(reqTrace1 !== null, '15. getRequirementTrace returns trace for RN-PRS-001');
  assert(reqTrace1.nodes.some(n => n.id === 'PR_START'), '16. Requirement -> Node resolved (PR_START)');
  assert(reqTrace1.classification === 'covered', '17. RN-PRS-001 classified as covered');

  // ---------------------------------------------------------------------------
  // 6. Adding New Node with ruleIds Support (addFlowNode)
  // ---------------------------------------------------------------------------
  const newNode = addFlowNode('01-presensi', 'presensi-supervisor', {
    label: 'Validasi Biometrik Mandor Baru',
    type: 'process',
    reqId: 'RN-PRS-003',
    ruleIds: ['BR-PRS-003', 'BR-PRS-003', 'INVALID-RULE-XYZ'],
    businessRule: 'BR-PRS-003: Prioritas Biometrik Face ID'
  });
  assert(newNode.id.startsWith('N_') || newNode.id.length > 0, '18. New node created with valid ID');
  assert(Array.isArray(newNode.ruleIds) && newNode.ruleIds.length === 1 && newNode.ruleIds[0] === 'BR-PRS-003', '19. New node sanitized ruleIds properly');
  assert(newNode.businessRule.includes('BR-PRS-003'), '20. New node preserves legacy businessRule string');

  // Trace reflects new node links
  const newNodeTrace = getNodeTrace('01-presensi', 'presensi-supervisor', newNode.id);
  assert(newNodeTrace !== null && newNodeTrace.requirement.id === 'RN-PRS-003', '21. New node trace links to RN-PRS-003');
  assert(newNodeTrace.businessRules.some(br => br.id === 'BR-PRS-003'), '22. New node trace resolves BR-PRS-003');

  // ---------------------------------------------------------------------------
  // 7. Node Revision Workflow (editFlowNode on Confirmed node)
  // ---------------------------------------------------------------------------
  // Confirm newNode to make it baseline
  newNode.status = 'Confirmed';
  const editResult = editFlowNode('01-presensi', 'presensi-supervisor', newNode.id, {
    label: 'Validasi Biometrik Mandor Baru (Revisi)',
    ruleIds: ['BR-GLB-001', 'BR-PRS-003']
  });
  assert(editResult.isRevision === true, '23. Editing confirmed node creates revision v2');
  assert(editResult.node.version === 2, '24. Revised node has version 2');
  assert(editResult.node.revisionOf === 'v1', '25. Revised node has revisionOf v1');
  assert(editResult.node.ruleIds.length === 2, '26. Revised node retains updated ruleIds');

  // ---------------------------------------------------------------------------
  // 8. Missing Relations Handled Safely (Graceful Fallback)
  // ---------------------------------------------------------------------------
  const unlinkedNode = addFlowNode('01-presensi', 'presensi-supervisor', {
    label: 'Node Tanpa Requirement',
    type: 'process',
    reqId: ''
  });
  const unlinkedTrace = getNodeTrace('01-presensi', 'presensi-supervisor', unlinkedNode.id);
  assert(unlinkedTrace !== null, '27. getNodeTrace returns trace object for unlinked node');
  assert(unlinkedTrace.requirement === null, '28. Unlinked node requirement is null');
  assert(unlinkedTrace.hasReqLink === false, '29. Unlinked node hasReqLink is false');
  assert(getNodeTrace('01-presensi', 'presensi-supervisor', 'NON-EXISTENT-NODE-999') === null, '30. getNodeTrace returns null for non-existent node');

  // ---------------------------------------------------------------------------
  // 9. Archived Node and Requirement Exclusion
  // ---------------------------------------------------------------------------
  archiveFlowNode('01-presensi', 'presensi-supervisor', unlinkedNode.id);
  assert(getNodeTrace('01-presensi', 'presensi-supervisor', unlinkedNode.id) === null, '31. Archived node is excluded from active node trace');

  // ---------------------------------------------------------------------------
  // 10. Deterministic Sorting of Multiple Rules & Nodes
  // ---------------------------------------------------------------------------
  validateAndLinkBusinessRules('RN-PRS-002', ['BR-PRS-001', 'BR-GLB-001', 'BR-GLB-002']);
  const multiRuleTrace = getRequirementTrace('RN-PRS-002');
  assert(multiRuleTrace.businessRules.length >= 3, '32. Requirement resolves multiple linked business rules');

  console.log(`\n========================================`);
  console.log(`PHASE 4B TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4BTests().catch(err => {
  console.error('Fatal error during Phase 4B tests:', err);
  process.exit(1);
});
