import {
  initProjectDataStore,
  getActiveStore,
  saveDraftToStorage,
  resetDraftToOfficial,
  createRequirement,
  editRequirement,
  archiveRequirement,
  addFlowNode,
  editFlowNode,
  archiveFlowNode,
  addFlowEdge,
  editFlowEdge,
  archiveFlowEdge,
  getAllPendingRevisions,
  calculateEntityDiff,
  submitEntityForReview,
  confirmEntityRevision,
  rejectEntityRevision,
  discardEntityDraft,
  validateProjectData
} from './js/modules/process-mapping/process-mapping-data.js';
import fs from 'fs';

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

async function runPhase3Tests() {
  console.log('=== STARTING PHASE 3 REVISION & REVIEW REGRESSION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Initialize store
  const store = await initProjectDataStore();
  assert(store && store.requirements.length > 0, 'Store initialized successfully with baseline data');

  // Baseline check: all initial items should have 0 pending revisions
  let pending = getAllPendingRevisions(store);
  assert(pending.length === 0, `Initial state has 0 pending revisions (got: ${pending.length})`);

  // ---------------------------------------------------------------------------
  // TEST CASE 1: Create New Requirement -> Submit -> Reject -> Edit -> Confirm
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST CASE 1: New Requirement Lifecycle (Draft -> In Review -> Rejected -> In Review -> Confirmed) ---');
  const newReq = createRequirement({
    title: 'Pemeriksaan Bibit Unggul Tahap 3',
    role: 'Mantri Bibitan',
    module: 'Pemeriksaan Mutu',
    moduleId: '05-pemeriksaan',
    feature: 'Pemeriksaan Okulasi',
    featureId: 'pemeriksaan-okulasi',
    acceptanceCriteria: 'Bibit harus lolos uji visual dan viabilitas.',
    process: 'Pemeriksaan Visual',
    businessRule: 'BR-01: Standar Mutu'
  }, 'BA Tester');

  assert(newReq.status === 'Draft', 'New requirement created with status Draft');
  assert(newReq.version === 1, 'New requirement has version 1');
  assert(newReq.revisionOf === null, 'New requirement has revisionOf null');

  pending = getAllPendingRevisions(store);
  assert(pending.length === 1 && pending[0].entityId === newReq.id, 'Pending revisions lists the new requirement');
  assert(pending[0].changeType === 'Added', 'New requirement recognized as changeType Added');

  // Submit for Review
  const submittedReq = submitEntityForReview('Requirement', { entityId: newReq.id }, 'BA Tester');
  assert(submittedReq.status === 'In Review', 'Requirement moved to In Review status');

  // Reject with reason
  const rejectedReq = rejectEntityRevision('Requirement', { entityId: newReq.id }, 'Kriteria penerimaan kurang spesifik', 'Lead Reviewer');
  assert(rejectedReq.status === 'Rejected', 'Requirement moved to Rejected status');
  assert(rejectedReq.reviewNote === 'Kriteria penerimaan kurang spesifik', 'Rejection reason preserved in reviewNote');
  assert(rejectedReq.reviewedBy === 'Lead Reviewer', 'reviewedBy tracked');

  // Edit rejected draft
  const editedReq = editRequirement(newReq.id, {
    acceptanceCriteria: 'Bibit harus lolos uji visual, viabilitas 95%, dan diameter > 2cm.'
  }, 'BA Tester');
  assert(editedReq.requirement.status === 'Draft', 'Editing rejected requirement resets status to Draft');
  assert(editedReq.requirement.acceptanceCriteria.includes('diameter > 2cm'), 'Acceptance criteria updated');

  // Submit again and Confirm
  submitEntityForReview('Requirement', { entityId: newReq.id }, 'BA Tester');
  const confirmedReq = confirmEntityRevision('Requirement', { entityId: newReq.id }, 'Lead Reviewer');
  assert(confirmedReq.status === 'Confirmed', 'Requirement successfully Confirmed');
  assert(confirmedReq.reviewedBy === 'Lead Reviewer', 'confirmed requirement has reviewedBy');

  pending = getAllPendingRevisions(store);
  assert(pending.length === 0, 'No pending revisions after confirmation');

  // ---------------------------------------------------------------------------
  // TEST CASE 2: Edit Confirmed Requirement (Revision v1 -> v2)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST CASE 2: Edit Confirmed Requirement -> Revision v2 -> Diff -> Confirm ---');
  const editRes = editRequirement(newReq.id, {
    title: 'Pemeriksaan Bibit Unggul Tahap 3 (Revisi SOP)',
    process: 'Pemeriksaan Visual + Digital Scanner'
  }, 'BA Tester');

  assert(editRes.isRevision === true, 'Editing Confirmed requirement creates a new revision');
  assert(editRes.requirement.version === 2, 'New revision has version 2');
  assert(editRes.requirement.revisionOf === 'v1', 'New revision points to revisionOf: "v1"');
  assert(editRes.requirement.status === 'Draft', 'New revision starts as Draft');

  // Check diff
  const v1Baseline = store.requirements.find(r => r.id === newReq.id && r.version === 1);
  const v2Draft = store.requirements.find(r => r.id === newReq.id && r.version === 2);
  const reqDiff = calculateEntityDiff('Requirement', v1Baseline, v2Draft);
  assert(reqDiff.hasChanges === true, 'Diff detects changes between v1 baseline and v2 draft');
  assert(reqDiff.changedFieldsCount === 2, `Exact 2 fields changed (got: ${reqDiff.changedFieldsCount})`);
  assert(reqDiff.changeType === 'Modified', 'Diff changeType is Modified');

  // Confirm v2
  submitEntityForReview('Requirement', { entityId: newReq.id }, 'BA Tester');
  const confirmedV2 = confirmEntityRevision('Requirement', { entityId: newReq.id }, 'Lead Reviewer');
  assert(confirmedV2.version === 2 && confirmedV2.status === 'Confirmed', 'v2 Confirmed successfully');
  assert(v1Baseline.isSuperseded === true, 'v1 Baseline is marked isSuperseded: true');
  assert(v1Baseline.supersededBy === 'v2', 'v1 Baseline points supersededBy: "v2"');

  // ---------------------------------------------------------------------------
  // TEST CASE 3: Node Revision & Connection Maintenance
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST CASE 3: Node Revision & Connection Workflow ---');
  const modId = '04-okulasi';
  const featId = 'grafting';
  const initialNodes = store.flows[modId][featId].nodes;
  const targetNode = initialNodes[0];

  // Edit confirmed node -> creates revision
  const nodeEditRes = editFlowNode(modId, featId, targetNode.id, {
    label: targetNode.label + ' (Prosedur Diperbarui)',
    purpose: 'Verifikasi ketat terhadap standar bibit karet'
  }, 'BA Tester');

  assert(nodeEditRes.isRevision === true, 'Editing Confirmed node creates revision');
  assert(nodeEditRes.node.version === (targetNode.version || 1) + 1, 'Node version incremented');
  assert(nodeEditRes.node.revisionOf === `v${targetNode.version || 1}`, 'Node revisionOf set correctly');

  // Add explicit connection (edge)
  const edge = addFlowEdge(modId, featId, {
    from: initialNodes[0].id,
    to: initialNodes[1].id,
    condition: 'Sukses',
    description: 'Lolos uji coba'
  }, 'BA Tester');

  assert(edge.id.startsWith('E_') || edge.id.startsWith('EDGE-'), 'Edge created with unique ID');
  assert(edge.status === 'Draft', 'Edge created as Draft');

  // Check pending revisions: should have 1 Node and 1 Connection
  pending = getAllPendingRevisions(store);
  assert(pending.length === 2, `2 pending revisions present (got: ${pending.length})`);
  assert(pending.some(p => p.entityType === 'Node'), 'Node revision present in pending');
  assert(pending.some(p => p.entityType === 'Connection'), 'Connection revision present in pending');

  // Confirm Node revision
  submitEntityForReview('Node', { entityId: targetNode.id, moduleId: modId, featureId: featId }, 'BA Tester');
  confirmEntityRevision('Node', { entityId: targetNode.id, moduleId: modId, featureId: featId }, 'Lead Reviewer');

  // ---------------------------------------------------------------------------
  // TEST CASE 4: Discard Draft Connection
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST CASE 4: Discard Draft Connection ---');
  discardEntityDraft('Connection', { entityId: edge.id, moduleId: modId, featureId: featId }, 'BA Tester');
  const remainingEdges = store.flows[modId][featId].edges || [];
  assert(!remainingEdges.some(e => e.id === edge.id), 'Discarded unconfirmed new edge is cleanly removed');

  pending = getAllPendingRevisions(store);
  assert(pending.length === 0, '0 pending revisions remaining after discard');

  // ---------------------------------------------------------------------------
  // TEST CASE 5: Soft Archive Lifecycle (Requirement, Node, Connection)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST CASE 5: Soft Archive Lifecycle ---');
  // Archive confirmed requirement
  archiveRequirement(newReq.id, 'BA Tester');
  const archivedReqDraft = store.requirements.find(r => r.id === newReq.id && !r.isSuperseded);
  assert(archivedReqDraft.isArchived === true, 'Requirement marked isArchived: true');
  assert(archivedReqDraft.status === 'Draft', 'Archived state starts as Draft for review');

  pending = getAllPendingRevisions(store);
  assert(pending.length === 1 && pending[0].changeType === 'Archived', 'Archived requirement listed with changeType: Archived');

  // Confirm archive
  submitEntityForReview('Requirement', { entityId: newReq.id }, 'BA Tester');
  const confirmedArchivedReq = confirmEntityRevision('Requirement', { entityId: newReq.id }, 'Lead Reviewer');
  assert(confirmedArchivedReq.status === 'Confirmed' && confirmedArchivedReq.isArchived === true, 'Archive confirmed to baseline');

  // ---------------------------------------------------------------------------
  // TEST CASE 6: Data Integrity & Storage Persistence
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST CASE 6: Data Contract Integrity & Storage Persistence ---');
  const validation = validateProjectData(store);
  assert(validation.valid === true, `Data validation passed with 0 errors (${validation.errors.length} errors)`);

  saveDraftToStorage();
  assert(localStorage.getItem('PM_DRAFT_PROJECT_DATA_V2') !== null, 'Data saved to PM_DRAFT_PROJECT_DATA_V2 in localStorage');

  console.log(`\n==================================================`);
  console.log(`REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests();
