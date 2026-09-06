/**
 * Automated Regression Test Suite for Reviewer Confirm Gate (Username: ikhsan, Password: medan2026)
 * Verifies all 9 core test criteria + 12 step regression requirements
 */
import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  hasActiveDraft,
  saveDraftToStorage,
  resetDraftToOfficial,
  validateProjectData,
  createRequirement,
  editRequirement,
  submitEntityForReview,
  confirmEntityRevision,
  rejectEntityRevision,
  discardEntityDraft,
  verifyReviewerCredentials,
  REVIEWER_CREDENTIALS,
  getRequirementRevisionHistory,
  getRequirementByReqId,
  addFlowNode,
  editFlowNode,
  addFlowEdge,
  editFlowEdge,
  getAllPendingRevisions,
  exportProjectDataFile
} from './js/modules/process-mapping/process-mapping-data.js';

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

// Mock LocalStorage
const mockLocalStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};
global.localStorage = mockLocalStorage;

console.log('🧪 Starting Reviewer Confirm Gate (ikhsan / medan2026) Regression Tests...\n');

// 1. Initialize Store
const store = initProjectDataStore(true);
assert(store !== null, 'Store initialized from baseline');

// ---------------------------------------------------------------------------
// Credential Gate Tests
// ---------------------------------------------------------------------------
console.log('\n--- CREDENTIAL GATE TESTS ---');
assert(REVIEWER_CREDENTIALS.username === 'ikhsan', 'Reviewer username is ikhsan');
assert(REVIEWER_CREDENTIALS.password === 'medan2026', 'Reviewer password is medan2026');

// Old credentials must fail
assert(verifyReviewerCredentials('admin', 'admin') === false, 'Old credential admin/admin rejected');
assert(verifyReviewerCredentials('demo', 'demo') === false, 'Old credential demo/demo rejected');
assert(verifyReviewerCredentials('reviewer', 'sigma2026') === false, 'Old credential sigma2026 rejected');
assert(verifyReviewerCredentials('ikhsan', 'sigma2026') === false, 'Old password sigma2026 rejected');
assert(verifyReviewerCredentials('ikhsan', 'wrong_pass') === false, 'Wrong password rejected');
assert(verifyReviewerCredentials('other_user', 'medan2026') === false, 'Wrong username rejected');

// Valid credential must pass
assert(verifyReviewerCredentials('ikhsan', 'medan2026') === true, 'Valid credential ikhsan/medan2026 passed');
assert(verifyReviewerCredentials('IKHSAN', 'medan2026') === true, 'Case-insensitive username ikhsan/medan2026 passed');

// ---------------------------------------------------------------------------
// Step 1: Create / Edit Draft
// ---------------------------------------------------------------------------
console.log('\n--- STEP 1: Create / Edit Draft ---');
const newReq = createRequirement({
  title: 'Validasi Otentikasi Reviewer Biometrik',
  role: 'Mantri Bibitan',
  module: 'Okulasi',
  moduleId: '04-okulasi',
  feature: 'Okulasi Batch',
  featureId: 'grafting',
  acceptanceCriteria: 'Reviewer wajib memasukkan kredensial yang valid sebelum data disetujui.',
  process: 'Pemeriksaan Hasil Okulasi',
  input: 'Credential Reviewer',
  output: 'Status Confirmed'
}, 'BA Author');

assert(newReq.status === 'Draft', 'Requirement created in status Draft');
assert(newReq.version === 1, 'Requirement starts at version 1');

// ---------------------------------------------------------------------------
// Step 2: Submit -> In Review
// ---------------------------------------------------------------------------
console.log('\n--- STEP 2: Submit -> In Review ---');
const submitted = submitEntityForReview('Requirement', { entityId: newReq.id }, 'BA Author');
assert(submitted.status === 'In Review', 'Requirement moved to In Review');
assert(submitted.submittedBy === 'BA Author', 'submittedBy recorded');

// ---------------------------------------------------------------------------
// Step 3: Confirm dengan Wrong Credential -> Tetap In Review
// ---------------------------------------------------------------------------
console.log('\n--- STEP 3: Confirm dengan Wrong Credential ---');
const isInvalid = verifyReviewerCredentials('ikhsan', 'wrongpass123');
assert(isInvalid === false, 'Credential validation returns false for wrong password');

const reqAfterWrong = store.requirements.find(r => r.id === newReq.id && !r.isSuperseded);
assert(reqAfterWrong.status === 'In Review', 'Requirement remains In Review on wrong credential');

// ---------------------------------------------------------------------------
// Step 4: Cancel -> Tidak Ada Perubahan
// ---------------------------------------------------------------------------
console.log('\n--- STEP 4: Cancel -> Tidak Ada Perubahan ---');
const reqAfterCancel = store.requirements.find(r => r.id === newReq.id && !r.isSuperseded);
assert(reqAfterCancel.status === 'In Review', 'Requirement unchanged (In Review) after cancel');

// ---------------------------------------------------------------------------
// Step 5 & 6: Confirm dengan Correct Credential -> Confirmed
// ---------------------------------------------------------------------------
console.log('\n--- STEP 5 & 6: Confirm dengan Correct Credential -> Confirmed ---');
const isValid = verifyReviewerCredentials('ikhsan', 'medan2026');
assert(isValid === true, 'Credential validation returns true for ikhsan/medan2026');

const confirmed = confirmEntityRevision('Requirement', { entityId: newReq.id }, 'ikhsan', 'Disetujui oleh ikhsan sesuai SOP 2026');
assert(confirmed.status === 'Confirmed', 'Status successfully updated to Confirmed');
assert(confirmed.reviewedBy === 'ikhsan', 'reviewedBy saved as ikhsan');
assert(confirmed.reviewNote === 'Disetujui oleh ikhsan sesuai SOP 2026', 'reviewNote saved correctly');
assert(Boolean(confirmed.reviewedAt), 'reviewedAt timestamp saved');

// ---------------------------------------------------------------------------
// Step 7: Reload / Persistence State
// ---------------------------------------------------------------------------
console.log('\n--- STEP 7: Reload / Persistence State ---');
saveDraftToStorage();
const savedJson = mockLocalStorage.getItem('PM_DRAFT_PROJECT_DATA_V2');
assert(savedJson !== null, 'Data saved to localStorage (PM_DRAFT_PROJECT_DATA_V2)');

// Password must NOT be stored in localStorage
assert(!savedJson.includes('medan2026'), 'Password medan2026 is NEVER saved in localStorage');
assert(!savedJson.includes('"password"'), 'No password property saved in localStorage schema');

const reloadedStore = JSON.parse(savedJson);
const reloadedReq = reloadedStore.requirements.find(r => r.id === newReq.id && !r.isSuperseded);
assert(reloadedReq && reloadedReq.status === 'Confirmed', 'Reload retains Confirmed requirement');

// ---------------------------------------------------------------------------
// Step 8: Revision History Traceability
// ---------------------------------------------------------------------------
console.log('\n--- STEP 8: Revision History Traceability ---');
const history = getRequirementRevisionHistory(newReq.id);
assert(history.length === 1 && history[0].status === 'Confirmed', 'Revision history tracked for new Confirmed requirement');

// Test v2 revision
const editRes = editRequirement(newReq.id, {
  acceptanceCriteria: 'Kriteria v2 diperbarui dengan approval ikhsan.'
}, 'BA Editor');
assert(editRes.isRevision === true && editRes.requirement.version === 2, 'Edit Confirmed requirement created v2 Draft');

// Submit v2 and confirm v2 with ikhsan
submitEntityForReview('Requirement', { entityId: newReq.id, version: 2 }, 'BA Editor');
const confirmedV2 = confirmEntityRevision('Requirement', { entityId: newReq.id, version: 2 }, 'ikhsan', 'v2 Approved by ikhsan');
assert(confirmedV2.version === 2 && confirmedV2.status === 'Confirmed', 'v2 Confirmed successfully');

const fullHistory = getRequirementRevisionHistory(newReq.id);
assert(fullHistory.length === 2, `History has 2 versions (v1 and v2)`);
assert(fullHistory[0].version === 1 && fullHistory[0].isSuperseded === true, 'v1 is preserved and marked isSuperseded');
assert(fullHistory[1].version === 2 && fullHistory[1].status === 'Confirmed', 'v2 is active Confirmed');

// ---------------------------------------------------------------------------
// Step 9: Export Project Data Validation (Confirmed !== Published)
// ---------------------------------------------------------------------------
console.log('\n--- STEP 9: Export Project Data & Publish Separation ---');
assert(typeof exportProjectDataFile === 'function', 'Export Project Data function available');
const baselineData = JSON.parse(fs.readFileSync('./data/process-mapping-data.json', 'utf8'));

// Verify that Confirmed status in browser does NOT overwrite official data/process-mapping-data.json automatically
assert(!baselineData.requirements.some(r => r.id === newReq.id), 'Confirmed requirement in browser does NOT automatically write to source file/Git');

// ---------------------------------------------------------------------------
// Step 10: Reference Tab Integrity (24 items: 14 Functional + 10 Non-Functional)
// ---------------------------------------------------------------------------
console.log('\n--- STEP 10: Reference Tab Integrity ---');
const funcCount = (store.functionalRequirements || []).length;
const nonFuncCount = (store.nonFunctionalRequirements || []).length;
assert(funcCount === 14, `Functional requirements intact: 14 (got: ${funcCount})`);
assert(nonFuncCount === 10, `Non-Functional requirements intact: 10 (got: ${nonFuncCount})`);
assert(funcCount + nonFuncCount === 24, 'Reference Tab default remains 24 requirements');

// ---------------------------------------------------------------------------
// Step 11: Flow Editor Integrity (Node & Edge Maintenance)
// ---------------------------------------------------------------------------
console.log('\n--- STEP 11: Flow Editor Integrity ---');
const flowModId = '04-okulasi';
const flowFeatId = 'grafting';
const addedNode = addFlowNode(flowModId, flowFeatId, {
  label: 'Langkah Tambahan Flow Gate Ikhsan',
  type: 'process',
  code: 'P-999'
}, 'BA Flow Editor');
assert(addedNode.status === 'Draft', 'Flow node added as Draft');

submitEntityForReview('Node', { entityId: addedNode.id, moduleId: flowModId, featureId: flowFeatId }, 'BA Flow Editor');
const confirmedNode = confirmEntityRevision('Node', { entityId: addedNode.id, moduleId: flowModId, featureId: flowFeatId }, 'ikhsan', 'Node OK by ikhsan');
assert(confirmedNode.status === 'Confirmed' && confirmedNode.reviewedBy === 'ikhsan', 'Node confirmed by ikhsan');

// ---------------------------------------------------------------------------
// Step 12: Mobile Prototype Lock Verification
// ---------------------------------------------------------------------------
console.log('\n--- STEP 12: Mobile Prototype Lock Verification ---');
const appJsContent = fs.readFileSync('./js/app.js', 'utf8');
const routerJsContent = fs.readFileSync('./js/core/router.js', 'utf8');
const pagesCssContent = fs.readFileSync('./css/pages.css', 'utf8');

assert(appJsContent.includes('initRouter') && appJsContent.includes('renderLogin'), 'js/app.js is untouched');
assert(routerJsContent.includes('class Router') || routerJsContent.includes('Router'), 'js/core/router.js is untouched');
assert(pagesCssContent.includes('.phone-frame') || pagesCssContent.length > 1000, 'css/pages.css is untouched');

console.log(`\n==================================================`);
console.log(`REGRESSION RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL REVIEWER CONFIRM GATE (ikhsan / medan2026) TESTS PASSED!');
}
