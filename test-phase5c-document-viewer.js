/**
 * test-phase5c-document-viewer.js
 * Test Suite for Phase 5C — Document Viewer UI & Print Actions
 * 
 * Validates:
 * - Document Hub location (Process Mapping -> Laporan -> Subtab 5. Dokumen Resmi)
 * - Document List items (DOC-04: RTM Report, DOC-05: Gap Analysis Report)
 * - Dynamic metadata extraction from Document Engine (non hard-coded)
 * - Preview Modal Architecture (#pm-printable-root with Phase 5B Renderer)
 * - Top Toolbar isolation outside printable media (.pm-no-print)
 * - Live Current Runtime Data (Zero cached staleness, dynamic re-rendering on store mutations)
 * - Document DRAFT Status Enforcement & Watermark
 * - Browser Native Print / Save as PDF Action Triggers (window.print())
 * - Print Sheet Isolation & Portal Chrome Exclusion (@media print)
 * - Graceful Error / Empty State Handling
 * - Responsive Container Structures
 * - Immutability & Zero Mutation on Base Store
 * - Full Regression & Cross-Phase Compatibility (Phase 1-4, Phase 5A, Phase 5B)
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
  console.log('🧪 RUNNING PHASE 5C — DOCUMENT VIEWER UI & PRINT TESTS');
  console.log('====================================================\n');

  // Initialize store from official baseline
  await initProjectDataStore();
  const store = getActiveStore();

  // ----------------------------------------------------
  // 1. Document Hub Subtab in Reports View
  // ----------------------------------------------------
  console.log('1. Document Hub Location & Subtab Integration');
  const reportsHtml = renderReportsView(store);
  assert(typeof reportsHtml === 'string' && reportsHtml.length > 0, '1.1 renderReportsView returns valid HTML');
  assert(reportsHtml.includes('data-report-subtab="official-docs"'), '1.2 Subtab official-docs button exists');
  assert(reportsHtml.includes('5. Dokumen Resmi'), '1.3 Subtab label "5. Dokumen Resmi" is rendered');
  assert(reportsHtml.includes('1. Ringkasan Eksekutif') && reportsHtml.includes('4. Gap Analysis'), '1.4 Existing report subtabs preserved');

  // ----------------------------------------------------
  // 2. Official Document Hub Render & Document Cards
  // ----------------------------------------------------
  console.log('\n2. Official Document Hub Content & Card List');
  const hubHtml = renderReportOfficialDocs(store);
  assert(hubHtml.includes('id="pm-doc-hub-root"'), '2.1 Document Hub root container exists');
  assert(hubHtml.includes('Pusat Dokumen Resmi & Spesifikasi Sistem'), '2.2 Hub title rendered');
  assert(hubHtml.includes('data-doc-card="RTM_REPORT"'), '2.3 DOC-04 RTM Report card exists');
  assert(hubHtml.includes('data-doc-card="GAP_REPORT"'), '2.4 DOC-05 Gap Analysis card exists');
  assert(hubHtml.includes('DOC-04'), '2.5 DOC-04 badge rendered');
  assert(hubHtml.includes('DOC-05'), '2.6 DOC-05 badge rendered');
  assert(hubHtml.includes('Requirements Traceability Matrix (RTM) Report'), '2.7 DOC-04 Title rendered');
  assert(hubHtml.includes('Gap Analysis') && hubHtml.includes('Technical Debt Report'), '2.8 DOC-05 Title rendered');

  // ----------------------------------------------------
  // 3. Dynamic Metadata in Document Hub Cards
  // ----------------------------------------------------
  console.log('\n3. Dynamic Metadata Resolution in Hub');
  assert(hubHtml.includes('SIGMA-RN-DOC-04-RTM'), '3.1 DOC-04 document ID is dynamically populated');
  assert(hubHtml.includes('SIGMA-RN-DOC-05-GAP'), '3.2 DOC-05 document ID is dynamically populated');
  assert(hubHtml.includes('v0.2.0'), '3.3 Baseline data version v0.2.0 is displayed');
  assert(hubHtml.includes('1066f36'), '3.4 Baseline git commit 1066f36 is displayed');
  assert(hubHtml.includes('165 Requirements') && hubHtml.includes('122 Covered'), '3.5 RTM dataset counts displayed');
  assert(hubHtml.includes('33 True Gaps'), '3.6 Gap dataset counts displayed');

  // ----------------------------------------------------
  // 4. Action Buttons & Standards (No Emojis)
  // ----------------------------------------------------
  console.log('\n4. Action Buttons & Corporate Design Standards');
  assert(hubHtml.includes('pm-doc-preview-btn'), '4.1 Preview buttons rendered on cards');
  assert(hubHtml.includes('pm-doc-print-btn'), '4.2 Print / Save PDF buttons rendered on cards');
  assert(hubHtml.includes('Pratinjau Dokumen'), '4.3 Action label "Pratinjau Dokumen" used');
  assert(hubHtml.includes('Cetak / Simpan PDF'), '4.4 Action label "Cetak / Simpan PDF" used');
  assert(!hubHtml.includes('📄') && !hubHtml.includes('🖨️') && !hubHtml.includes('🔍'), '4.5 No emojis present in Document Hub actions');

  // ----------------------------------------------------
  // 5. Document Preview Modal Architecture
  // ----------------------------------------------------
  console.log('\n5. Document Preview Modal Architecture');
  const rtmDocModel = buildDocumentModel(DOCUMENT_TYPES.RTM_REPORT, {}, store);
  const rtmRendered = renderDocument(rtmDocModel);
  assert(rtmRendered.includes('id="pm-printable-root"'), '5.1 Preview embeds #pm-printable-root');
  assert(rtmRendered.includes('class="pm-doc-sheet'), '5.2 Preview contains .pm-doc-sheet A4 page wrappers');
  assert(rtmRendered.includes('Daftar Isi (Table of Contents)'), '5.3 Preview includes Table of Contents');
  assert(rtmRendered.includes('1.0 Document Control & Governance'), '5.4 Preview includes Document Control');
  assert(rtmRendered.includes('3.0 Matriks Keterlacakan Kebutuhan (RTM Detail)'), '5.5 Preview includes RTM Matrix table');
  assert(rtmRendered.includes('Lembar Persetujuan (Sign-off Sheet)'), '5.6 Preview includes Approval Sign-off');

  // ----------------------------------------------------
  // 6. Preview Toolbar & Non-Print Isolation
  // ----------------------------------------------------
  console.log('\n6. Preview Toolbar & Non-Print Isolation');
  const cssContent = fs.readFileSync('./css/process-mapping.css', 'utf8');
  const printCssContent = fs.readFileSync('./css/process-mapping-print.css', 'utf8');
  assert(cssContent.includes('.pm-doc-preview-toolbar'), '6.1 CSS includes .pm-doc-preview-toolbar');
  assert(cssContent.includes('.pm-doc-preview-viewport'), '6.2 CSS includes .pm-doc-preview-viewport');
  assert(printCssContent.includes('.pm-doc-preview-toolbar') && printCssContent.includes('display: none !important;'), '6.3 Print CSS excludes preview toolbar');
  assert(printCssContent.includes('.pm-no-print'), '6.4 Print CSS excludes .pm-no-print elements');
  assert(printCssContent.includes('.workspace-preview-column') && printCssContent.includes('display: none !important;'), '6.5 Print CSS excludes mobile preview frame');

  // ----------------------------------------------------
  // 7. Live Current Runtime Data & Zero Cached Staleness
  // ----------------------------------------------------
  console.log('\n7. Live Current Runtime Data & Dynamic Regeneration');
  const initialMetrics = getCoverageMetrics();
  assert(initialMetrics.totalActiveRequirements === 165, '7.1 Initial active requirements is 165');

  // Mutate store with new requirement
  const newReq = createRequirement({
    title: 'Requirement Baru Live Test Phase 5C',
    role: 'Mantri Bibitan',
    module: '04-okulasi',
    moduleId: '04-okulasi',
    feature: 'Okulasi Standar'
  }, 'Test Author');

  // Immediately build model without any cache sync
  const liveRtmModel = buildRtmDocumentModel({}, store);
  assert(liveRtmModel.data.totalRecords === 166, '7.2 Live RTM model immediately includes 166 requirements');
  assert(liveRtmModel.provenance.activeRequirementsCount === 166, '7.3 Live Provenance dynamically reflects 166 requirements');

  // Re-render and verify HTML content updates immediately
  const liveRender = renderDocument(liveRtmModel);
  assert(liveRender.includes('Requirement Baru Live Test Phase 5C'), '7.4 Live Render contains newly created requirement');

  // Archive requirement to restore clean baseline
  archiveRequirement(newReq.id, 'Test Author');
  const restoredRtmModel = buildRtmDocumentModel({}, store);
  assert(restoredRtmModel.data.totalRecords === 165, '7.5 Restored RTM model cleanly returns to 165 requirements');

  // ----------------------------------------------------
  // 8. Document DRAFT Status & Watermark Enforcement
  // ----------------------------------------------------
  console.log('\n8. DRAFT Status & Watermark Enforcement');
  const defaultMeta = resolveDocumentMetadata(DOCUMENT_TYPES.RTM_REPORT, {}, store);
  assert(defaultMeta.documentStatus === DOCUMENT_STATUS.DRAFT, '8.1 Default document status is strictly DRAFT');
  
  const draftRender = renderDocument(defaultMeta.documentType ? buildDocumentModel(defaultMeta.documentType, {}, store) : liveRtmModel);
  assert(draftRender.includes('DRAFT — FOR INTERNAL REVIEW ONLY'), '8.2 Draft badge text rendered');
  assert(draftRender.includes('pm-doc-watermark'), '8.3 Watermark container rendered for DRAFT');

  // Explicit APPROVED override verification
  const approvedModel = buildDocumentModel(DOCUMENT_TYPES.RTM_REPORT, { documentStatus: DOCUMENT_STATUS.APPROVED }, store);
  assert(approvedModel.metadata.documentStatus === DOCUMENT_STATUS.APPROVED, '8.4 Explicit status APPROVED preserved');
  const approvedRender = renderDocument(approvedModel);
  assert(!approvedRender.includes('pm-doc-watermark'), '8.5 Watermark is absent in APPROVED document');

  // ----------------------------------------------------
  // 9. Error & Empty State Handling
  // ----------------------------------------------------
  console.log('\n9. Error & Empty State Handling');
  let rejectedTypeCaught = false;
  try {
    buildDocumentModel('INVALID_UNKNOWN_TYPE', {}, store);
  } catch (err) {
    rejectedTypeCaught = true;
  }
  assert(rejectedTypeCaught, '9.1 Invalid document type throws controlled exception');

  // Hub handles empty or partial store gracefully
  const emptyHubHtml = renderReportOfficialDocs({});
  assert(typeof emptyHubHtml === 'string' && emptyHubHtml.length > 0, '9.2 renderReportOfficialDocs handles empty store without crash');

  // ----------------------------------------------------
  // 10. Responsive Containers & Media Paging
  // ----------------------------------------------------
  console.log('\n10. Responsive Container & Print Paging Rules');
  assert(cssContent.includes('@media (max-width: 768px)'), '10.1 Responsive breakpoint defined in process-mapping.css');
  assert(printCssContent.includes('@page {'), '10.2 @page rule defined for A4 portrait');
  assert(printCssContent.includes('size: A4 portrait;'), '10.3 Paged media size set to A4 portrait');
  assert(printCssContent.includes('.pm-page-break'), '10.4 .pm-page-break rule configured');

  // ----------------------------------------------------
  // 11. Immutability & Cross-Phase Compatibility
  // ----------------------------------------------------
  console.log('\n11. Immutability & Cross-Phase Compatibility');
  await resetDraftToOfficial();
  const cleanStore = getActiveStore();
  assert(cleanStore.requirements.length === 165, '11.1 Store requirements count not mutated (165)');
  assert(cleanStore.businessRules.length === 16, '11.2 Store business rules count not mutated (16)');
  assert(getAllTraceabilityRecords().length === 165, '11.3 Phase 4C getAllTraceabilityRecords operates cleanly');
  assert(getCoverageMetrics().flowCovered === 122, '11.4 Phase 4A getCoverageMetrics operates cleanly');
  assert(getGapAnalysisReport().totalGaps === 33, '11.5 Phase 4D getGapAnalysisReport operates cleanly');

  console.log('\n====================================================');
  console.log(`🎉 ALL PHASE 5C TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions)`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
