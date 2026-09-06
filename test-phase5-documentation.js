/**
 * test-phase5-documentation.js
 * Test Suite for Phase 5A — Core Document Engine & Data Aggregator
 * 
 * Validates:
 * - Document Engine Architecture & Data Collectors
 * - Document Types (RTM_REPORT, GAP_REPORT)
 * - Metadata & Provenance (Deterministic & Non-hardcoded)
 * - RTM Document Model (DOC-04)
 * - Gap Analysis Document Model (DOC-05)
 * - Reusable Table of Contents Generator
 * - Complete Immutability / Non-destructive behavior
 * - Cross-phase Compatibility (Phase 1-4)
 */

import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getAllTraceabilityRecords,
  getCoverageMetrics,
  getGapAnalysisReport,
  createRequirement,
  archiveRequirement,
  resetDraftToOfficial
} from './js/modules/process-mapping/process-mapping-data.js';

import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  collectProjectMetadata,
  collectRoles,
  collectModules,
  collectFeatures,
  collectRequirements,
  collectBusinessRules,
  collectFlows,
  collectTraceability,
  collectCoverage,
  collectGapAnalysis,
  calculateDocumentProvenance,
  resolveDocumentMetadata,
  buildTableOfContents,
  buildRtmDocumentModel,
  buildGapDocumentModel,
  buildDocumentModel
} from './js/modules/process-mapping/process-mapping-doc.js';

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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 5A — CORE DOCUMENT ENGINE TESTS');
  console.log('====================================================\n');

  await initProjectDataStore();
  const store = getActiveStore();

  // ----------------------------------------------------
  // 1. Document Types & Status Enums
  // ----------------------------------------------------
  console.log('1. Document Types & Status Constants');
  assert(DOCUMENT_TYPES.RTM_REPORT === 'RTM_REPORT', '1.1 DOCUMENT_TYPES.RTM_REPORT is defined');
  assert(DOCUMENT_TYPES.GAP_REPORT === 'GAP_REPORT', '1.2 DOCUMENT_TYPES.GAP_REPORT is defined');
  assert(DOCUMENT_STATUS.DRAFT === 'DRAFT', '1.3 DOCUMENT_STATUS.DRAFT is defined');
  assert(DOCUMENT_STATUS.APPROVED === 'APPROVED', '1.4 DOCUMENT_STATUS.APPROVED is defined');

  // ----------------------------------------------------
  // 2. Data Collectors
  // ----------------------------------------------------
  console.log('\n2. Runtime Data Collectors');
  const projectMeta = collectProjectMetadata(store);
  assert(projectMeta.projectCode === 'SIGMA-RN', '2.1 Project code is SIGMA-RN');
  assert(projectMeta.company === 'PT Socfin Indonesia (Socfindo)', '2.2 Company is PT Socfin Indonesia');

  const roles = collectRoles(store);
  assert(Array.isArray(roles) && roles.length === 7, `2.3 Roles collection returns 7 roles (got: ${roles.length})`);
  assert(roles.some(r => r.id === 'mantri-bibitan' && r.requirementCount === 138), `2.4 Mantri Bibitan requirement count dynamically resolved (got: ${roles.find(r => r.id === 'mantri-bibitan')?.requirementCount})`);

  const modules = collectModules(store);
  assert(Array.isArray(modules) && modules.length === 11, `2.5 Modules collection returns 11 modules (got: ${modules.length})`);

  const features = collectFeatures(store);
  assert(Array.isArray(features) && features.length === 21, `2.6 Features collection returns 21 features (got: ${features.length})`);

  const requirements = collectRequirements(store);
  assert(Array.isArray(requirements) && requirements.length === 165, `2.7 Requirements collection returns 165 active requirements (got: ${requirements.length})`);
  assert(requirements[0].canonicalCriteria.length > 0, '2.8 Requirements have resolved canonical criteria');

  const businessRules = collectBusinessRules(store);
  assert(Array.isArray(businessRules) && businessRules.length === 16, `2.9 Master Business Rules collection returns 16 rules (got: ${businessRules.length})`);
  assert(businessRules.some(b => b.id === 'BR-GLB-001'), '2.10 BR-GLB-001 is present in master rules');

  const flows = collectFlows(store);
  assert(typeof flows === 'object' && flows !== null, '2.11 Flows collection returns valid flows object');

  // ----------------------------------------------------
  // 3. Document Provenance Calculation
  // ----------------------------------------------------
  console.log('\n3. Document Provenance Calculation');
  const provenance = calculateDocumentProvenance(store);
  assert(provenance.gitCommit === '1066f369d7b93a0b16867dc1f855d0f6ae2347fa', '3.1 Provenance git commit matches baseline');
  assert(provenance.activeRequirementsCount === 165, `3.2 Provenance active requirements is 165 (got: ${provenance.activeRequirementsCount})`);
  assert(provenance.flowCoveredCount === 122, `3.3 Provenance covered count is 122 (got: ${provenance.flowCoveredCount})`);
  assert(provenance.trueGapCount === 33, `3.4 Provenance true gap count is 33 (got: ${provenance.trueGapCount})`);
  assert(provenance.businessManagementCount === 10, `3.5 Provenance management count is 10 (got: ${provenance.businessManagementCount})`);
  assert(provenance.masterBusinessRulesCount === 16, `3.6 Provenance master rules count is 16 (got: ${provenance.masterBusinessRulesCount})`);
  assert(provenance.linkedBusinessRulesRequirementCount === 77, `3.7 Provenance linked rules req count is 77 (got: ${provenance.linkedBusinessRulesRequirementCount})`);
  assert(typeof provenance.generatedTimestamp === 'string', '3.8 Provenance has valid ISO generated timestamp');

  // ----------------------------------------------------
  // 4. Metadata Resolver
  // ----------------------------------------------------
  console.log('\n4. Document Metadata Resolver');
  const rtmMeta = resolveDocumentMetadata(DOCUMENT_TYPES.RTM_REPORT, { generatedBy: 'Lead QA' }, store);
  assert(rtmMeta.docCode === 'DOC-04', '4.1 RTM docCode is DOC-04');
  assert(rtmMeta.documentId === 'SIGMA-RN-DOC-04-RTM', '4.2 RTM documentId is SIGMA-RN-DOC-04-RTM');
  assert(rtmMeta.generatedBy === 'Lead QA', '4.3 Custom metadata override works');

  const gapMeta = resolveDocumentMetadata(DOCUMENT_TYPES.GAP_REPORT, {}, store);
  assert(gapMeta.docCode === 'DOC-05', '4.4 Gap docCode is DOC-05');
  assert(gapMeta.documentId === 'SIGMA-RN-DOC-05-GAP', '4.5 Gap documentId is SIGMA-RN-DOC-05-GAP');

  // ----------------------------------------------------
  // 5. Table of Contents Generator
  // ----------------------------------------------------
  console.log('\n5. Reusable Table of Contents Generator');
  const sampleSections = [
    {
      id: 'sec-1',
      title: 'Pendahuluan',
      subsections: [
        { id: 'sub-1-1', title: 'Latar Belakang' },
        { id: 'sub-1-2', title: 'Ruang Lingkup' }
      ]
    },
    {
      id: 'sec-2',
      title: 'Matriks Keterlacakan',
      subsections: [
        { id: 'sub-2-1', title: 'Detail Matriks' }
      ]
    }
  ];
  const toc = buildTableOfContents(sampleSections);
  assert(Array.isArray(toc) && toc.length === 2, '5.1 TOC contains 2 main sections');
  assert(toc[0].number === '1.0', '5.2 Section 1 number is 1.0');
  assert(toc[0].subsections[0].number === '1.1', '5.3 Subsection 1.1 number is 1.1');
  assert(toc[1].number === '2.0', '5.4 Section 2 number is 2.0');

  // ----------------------------------------------------
  // 6. RTM Document Model (DOC-04)
  // ----------------------------------------------------
  console.log('\n6. RTM Document Model (DOC-04)');
  const rtmDoc = buildRtmDocumentModel({}, store);
  assert(rtmDoc.documentType === DOCUMENT_TYPES.RTM_REPORT, '6.1 rtmDoc has correct documentType');
  assert(rtmDoc.metadata.docCode === 'DOC-04', '6.2 rtmDoc metadata has DOC-04 code');
  assert(Array.isArray(rtmDoc.tableOfContents) && rtmDoc.tableOfContents.length === 5, `6.3 rtmDoc TOC has 5 main chapters (got: ${rtmDoc.tableOfContents.length})`);
  assert(rtmDoc.data.totalRecords === 165, `6.4 rtmDoc data has 165 total traceability records (got: ${rtmDoc.data.totalRecords})`);
  assert(Array.isArray(rtmDoc.data.moduleGroups) && rtmDoc.data.moduleGroups.length === 11, `6.5 rtmDoc data groups records by 11 modules (got: ${rtmDoc.data.moduleGroups.length})`);
  assert(rtmDoc.provenance.activeRequirementsCount === 165, '6.6 rtmDoc embeds accurate runtime provenance');

  // ----------------------------------------------------
  // 7. Gap Analysis Document Model (DOC-05)
  // ----------------------------------------------------
  console.log('\n7. Gap Analysis Document Model (DOC-05)');
  const gapDoc = buildGapDocumentModel({}, store);
  assert(gapDoc.documentType === DOCUMENT_TYPES.GAP_REPORT, '7.1 gapDoc has correct documentType');
  assert(gapDoc.metadata.docCode === 'DOC-05', '7.2 gapDoc metadata has DOC-05 code');
  assert(gapDoc.data.totalGaps === 33, `7.3 gapDoc data has exactly 33 true gaps (got: ${gapDoc.data.totalGaps})`);
  assert(gapDoc.data.gapRecords.every(r => r.classification === 'gap'), '7.4 All gapRecords in gapDoc strictly have classification === gap');
  assert(gapDoc.data.activeGapModules.length === 5, `7.5 gapDoc active gap modules equals 5 (got: ${gapDoc.data.activeGapModules.length})`);
  assert(gapDoc.tableOfContents.length === 5, '7.6 gapDoc TOC has 5 structured chapters');

  // ----------------------------------------------------
  // 8. Unified Master Builder
  // ----------------------------------------------------
  console.log('\n8. Unified Document Builder Dispatcher');
  const docFromMasterRtm = buildDocumentModel(DOCUMENT_TYPES.RTM_REPORT, {}, store);
  assert(docFromMasterRtm.documentType === DOCUMENT_TYPES.RTM_REPORT, '8.1 Master builder dispatches RTM_REPORT');
  const docFromMasterGap = buildDocumentModel(DOCUMENT_TYPES.GAP_REPORT, {}, store);
  assert(docFromMasterGap.documentType === DOCUMENT_TYPES.GAP_REPORT, '8.2 Master builder dispatches GAP_REPORT');

  let errorThrown = false;
  try {
    buildDocumentModel('UNKNOWN_TYPE', {}, store);
  } catch (e) {
    errorThrown = true;
  }
  assert(errorThrown, '8.3 Master builder rejects unsupported document type safely');

  // ----------------------------------------------------
  // 9. Immutability & Non-Destructive Behavior
  // ----------------------------------------------------
  console.log('\n9. Immutability & Non-destructive Verification');
  const beforeReqCount = store.requirements.length;
  const beforeRuleCount = store.businessRules.length;
  
  // Mutate returned document model
  rtmDoc.data.traceabilityRecords[0].title = 'MUTATED TITLE';
  rtmDoc.metadata.company = 'MUTATED COMPANY';
  gapDoc.data.gapRecords[0].title = 'MUTATED GAP TITLE';

  // Verify store is completely unaffected
  assert(store.requirements.length === beforeReqCount, '9.1 Store requirement count unchanged');
  assert(store.businessRules.length === beforeRuleCount, '9.2 Store business rules count unchanged');
  assert(store.requirements[0].title !== 'MUTATED TITLE', '9.3 Store requirement title not mutated');
  assert(collectProjectMetadata(store).company === 'PT Socfin Indonesia (Socfindo)', '9.4 Project company metadata not mutated');

  // ----------------------------------------------------
  // 10. Dynamic Recalculation & Lifecycle
  // ----------------------------------------------------
  console.log('\n10. Dynamic Recalculation on Store Changes');
  createRequirement({
    id: 'RN-TEST-DOC01',
    role: 'Mantri Bibitan',
    moduleId: '01-presensi',
    featureId: 'presensi-masuk',
    title: 'Test Temporary Req for Document Engine',
    criteria: 'Test Criteria'
  });

  const updatedRtmDoc = buildRtmDocumentModel({}, getActiveStore());
  assert(updatedRtmDoc.data.totalRecords === 166, `10.1 Adding requirement dynamically updates RTM document to 166 records (got: ${updatedRtmDoc.data.totalRecords})`);
  assert(updatedRtmDoc.provenance.activeRequirementsCount === 166, '10.2 Document provenance dynamically reflects 166 requirements');

  archiveRequirement('RN-TEST-DOC01');
  const archivedRtmDoc = buildRtmDocumentModel({}, getActiveStore());
  assert(archivedRtmDoc.data.totalRecords === 165, `10.3 Archiving restores RTM document to 165 records (got: ${archivedRtmDoc.data.totalRecords})`);

  resetDraftToOfficial();

  // ----------------------------------------------------
  // 11. Cross-Phase Compatibility
  // ----------------------------------------------------
  console.log('\n11. Cross-Phase Compatibility (Phase 1-4)');
  assert(getAllTraceabilityRecords().length === 165, '11.1 Phase 4A/4C getAllTraceabilityRecords operates cleanly');
  assert(getCoverageMetrics().flowCovered === 122, '11.2 Phase 4A getCoverageMetrics operates cleanly');
  assert(getGapAnalysisReport().totalGaps === 33, '11.3 Phase 4D getGapAnalysisReport operates cleanly');

  console.log('\n====================================================');
  console.log(`🎉 ALL PHASE 5A TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions)`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
