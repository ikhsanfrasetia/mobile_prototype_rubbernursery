/**
 * test-phase5d-simplified-management.js
 * Test Suite for Phase 5D — Simplified Document Management for PM/BA
 * 
 * Validates:
 * - Document Hub location (Process Mapping -> Laporan -> Subtab 5. Dokumen Resmi)
 * - DOC-04: Requirements Traceability Matrix Report
 * - DOC-05: Gap Analysis & Technical Debt Report
 * - Concise, useful card information (Code, Title, Status, Doc Version, Data Version, Last Generated, Coverage/Gap Summary)
 * - Strict DRAFT default status enforcement & no status toggle
 * - Document version (v1.0.0) & Data baseline version (v0.2.0)
 * - Live dynamic regeneration without model caching
 * - Dynamic requirement and gap count recalculation on runtime store mutations
 * - Preview and Print actions without status or data mutation
 * - Provenance display inside documents vs concise on cards
 * - Full cross-phase compatibility (Phase 1-4, Phase 5A, 5B, 5C)
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
  addFlowNode,
  archiveFlowNode,
  resetDraftToOfficial
} from './js/modules/process-mapping/process-mapping-data.js';

import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  buildRtmDocumentModel,
  buildGapDocumentModel,
  buildDocumentModel,
  resolveDocumentMetadata
} from './js/modules/process-mapping/process-mapping-doc.js';

import {
  renderDocument
} from './js/modules/process-mapping/process-mapping-doc-renderer.js';

import {
  renderReportsView,
  renderReportOfficialDocs,
  renderModals
} from './js/modules/process-mapping/process-mapping-ui.js';

// Mock localStorage for node test runner
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
  console.log('🧪 RUNNING PHASE 5D — SIMPLIFIED DOCUMENT MANAGEMENT TESTS');
  console.log('====================================================\n');

  // Initialize store from official baseline
  await initProjectDataStore();
  const store = getActiveStore();

  // ----------------------------------------------------
  // 1. Document Hub Location & Main Document Cards
  // ----------------------------------------------------
  console.log('1. Document Hub Location & Main Documents');
  const reportsHtml = renderReportsView(store);
  assert(reportsHtml.includes('data-report-subtab="official-docs"'), '1.1 Subtab official-docs button exists');
  assert(reportsHtml.includes('5. Dokumen Resmi'), '1.2 Subtab label "5. Dokumen Resmi" is rendered');

  const hubHtml = renderReportOfficialDocs(store);
  assert(hubHtml.includes('id="pm-doc-hub-root"'), '1.3 Document Hub root container rendered');
  assert(hubHtml.includes('data-doc-card="RTM_REPORT"'), '1.4 DOC-04 RTM Report card rendered');
  assert(hubHtml.includes('data-doc-card="GAP_REPORT"'), '1.5 DOC-05 Gap Analysis card rendered');
  assert(hubHtml.includes('DOC-04'), '1.6 DOC-04 code badge rendered');
  assert(hubHtml.includes('DOC-05'), '1.7 DOC-05 code badge rendered');

  // ----------------------------------------------------
  // 2. Simplified Card Information
  // ----------------------------------------------------
  console.log('\n2. Simplified Card Information & Useful Metadata');
  assert(hubHtml.includes('Requirements Traceability Matrix (RTM) Report'), '2.1 DOC-04 Title rendered');
  assert(hubHtml.includes('Gap Analysis') && hubHtml.includes('Technical Debt Report'), '2.2 DOC-05 Title rendered');
  assert(hubHtml.includes('SIGMA-RN-DOC-04-RTM'), '2.3 DOC-04 document ID rendered');
  assert(hubHtml.includes('SIGMA-RN-DOC-05-GAP'), '2.4 DOC-05 document ID rendered');
  assert(hubHtml.includes('v1.0.0'), '2.5 Document Version v1.0.0 rendered on cards');
  assert(hubHtml.includes('v0.2.0'), '2.6 Data Version v0.2.0 rendered on cards');
  assert(hubHtml.includes('165 Requirements') && hubHtml.includes('122 Covered'), '2.7 RTM coverage summary rendered');
  assert(hubHtml.includes('33 True Gaps') && hubHtml.includes('5 Modul'), '2.8 Gap summary rendered');
  assert(hubHtml.includes('Terakhir Dibuat:'), '2.9 Last generated label rendered');

  // ----------------------------------------------------
  // 3. Strict DRAFT Status Model
  // ----------------------------------------------------
  console.log('\n3. Strict DRAFT Status Model & No Direct Toggle');
  const rtmMeta = resolveDocumentMetadata(DOCUMENT_TYPES.RTM_REPORT, {}, store);
  const gapMeta = resolveDocumentMetadata(DOCUMENT_TYPES.GAP_REPORT, {}, store);
  assert(rtmMeta.documentStatus === DOCUMENT_STATUS.DRAFT, '3.1 RTM default status is strictly DRAFT');
  assert(gapMeta.documentStatus === DOCUMENT_STATUS.DRAFT, '3.2 Gap default status is strictly DRAFT');
  assert(hubHtml.includes('DRAFT'), '3.3 DRAFT status tag rendered on document cards');
  assert(!hubHtml.includes('pm-status-toggle') && !hubHtml.includes('select-status'), '3.4 No status toggle UI exposed on cards');

  // ----------------------------------------------------
  // 4. Action Buttons (Pratinjau & Cetak PDF)
  // ----------------------------------------------------
  console.log('\n4. Standard Action Buttons');
  assert(hubHtml.includes('pm-doc-preview-btn'), '4.1 Preview button present on card');
  assert(hubHtml.includes('pm-doc-print-btn'), '4.2 Print button present on card');
  assert(hubHtml.includes('Pratinjau'), '4.3 Action label "Pratinjau" used');
  assert(hubHtml.includes('Cetak PDF'), '4.4 Action label "Cetak PDF" used');

  // ----------------------------------------------------
  // 5. Live Regeneration & Dynamic Requirement Counts
  // ----------------------------------------------------
  console.log('\n5. Live Regeneration & Dynamic Requirement Counts');
  const baseMetrics = getCoverageMetrics();
  assert(baseMetrics.totalActiveRequirements === 165, '5.1 Baseline active requirements is 165');

  // Add requirement at runtime
  const newReq = createRequirement({
    title: 'Requirement Baru Live Test Phase 5D',
    role: 'Mantri Bibitan',
    module: '04-okulasi',
    moduleId: '04-okulasi',
    feature: 'Okulasi Standar'
  }, 'BA User');

  // Re-build RTM document model on current state
  const liveRtm = buildRtmDocumentModel({}, store);
  assert(liveRtm.data.totalRecords === 166, '5.2 Live RTM model reflects 166 requirements immediately');
  assert(liveRtm.provenance.activeRequirementsCount === 166, '5.3 Live provenance reflects 166 requirements');

  // Archive to restore
  archiveRequirement(newReq.id, 'BA User');
  const restoredRtm = buildRtmDocumentModel({}, store);
  assert(restoredRtm.data.totalRecords === 165, '5.4 Restored RTM model cleanly returns to 165 requirements');

  // ----------------------------------------------------
  // 6. Live Regeneration & Dynamic Gap Counts
  // ----------------------------------------------------
  console.log('\n6. Live Regeneration & Dynamic Gap Counts');
  const baseGapReport = getGapAnalysisReport();
  assert(baseGapReport.totalGaps === 33, '6.1 Baseline true gaps count is 33');

  const gapToLink = baseGapReport.gapRecords[0].requirement;
  const targetModId = gapToLink.module || '04-okulasi';
  const targetFeatId = gapToLink.feature || 'grafting';

  // Link flow node to a gap requirement
  const newNode = addFlowNode(targetModId, targetFeatId, {
    title: 'Validasi Live Gap Phase 5D',
    role: 'Mantri Bibitan',
    reqId: gapToLink.id
  });

  // Re-build Gap document model on current state
  const liveGap = buildGapDocumentModel({}, store);
  assert(liveGap.data.totalGaps === 32, '6.2 Live Gap model reflects 32 true gaps immediately');
  assert(liveGap.data.gapRecords.length === 32, '6.3 Gap records array contains exactly 32 items');

  // Archive node to restore
  archiveFlowNode(targetModId, targetFeatId, newNode.id);
  const restoredGap = buildGapDocumentModel({}, store);
  assert(restoredGap.data.totalGaps === 33, '6.4 Restored Gap model cleanly returns to 33 true gaps');

  // ----------------------------------------------------
  // 7. Zero Caching & Immutability Under Preview / Print
  // ----------------------------------------------------
  console.log('\n7. Zero Caching & Immutability Under Preview/Print');
  const doc1 = buildDocumentModel(DOCUMENT_TYPES.RTM_REPORT, {}, store);
  const render1 = renderDocument(doc1);
  const render2 = renderDocument(doc1);
  assert(render1 === render2, '7.1 Repeated document generation from model is 100% deterministic');
  assert(doc1.metadata.documentStatus === DOCUMENT_STATUS.DRAFT, '7.2 Document status remains DRAFT after rendering');

  const doc2 = buildDocumentModel(DOCUMENT_TYPES.RTM_REPORT, {}, store);
  assert(doc2.metadata.documentStatus === DOCUMENT_STATUS.DRAFT, '7.3 Newly generated document status is strictly DRAFT');

  // ----------------------------------------------------
  // 8. Provenance Detail Placement
  // ----------------------------------------------------
  console.log('\n8. Provenance Detail Placement');
  assert(render1.includes('4.0 Provenansi Data & Baseline Integrity'), '8.1 Detailed provenance heading present in document body');
  assert(render1.includes('1066f369d7b93a0b16867dc1f855d0f6ae2347fa'), '8.2 Full Git commit hash preserved in document body');
  assert(!hubHtml.includes('1066f369d7b93a0b16867dc1f855d0f6ae2347fa'), '8.3 Card avoids long raw Git SHA string');

  // ----------------------------------------------------
  // 9. Cross-Phase Regression & Clean Baseline
  // ----------------------------------------------------
  console.log('\n9. Cross-Phase Regression & Clean Baseline');
  await resetDraftToOfficial();
  const cleanStore = getActiveStore();
  assert(cleanStore.requirements.length === 165, '9.1 Baseline store has 165 requirements');
  assert(cleanStore.businessRules.length === 16, '9.2 Baseline store has 16 master business rules');
  assert(getAllTraceabilityRecords().length === 165, '9.3 Phase 4C getAllTraceabilityRecords operates cleanly');
  assert(getCoverageMetrics().flowCovered === 122, '9.4 Phase 4A getCoverageMetrics operates cleanly');
  assert(getGapAnalysisReport().totalGaps === 33, '9.5 Phase 4D getGapAnalysisReport operates cleanly');

  console.log('\n====================================================');
  console.log(`🎉 ALL PHASE 5D TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions)`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
