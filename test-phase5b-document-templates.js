/**
 * test-phase5b-document-templates.js
 * Test Suite for Phase 5B — Document Templates & Renderer
 * 
 * Validates:
 * - HTML/Print Document Renderer Architecture
 * - DOC-04: RTM Report Render (165 records, 11 modules)
 * - DOC-05: Gap Analysis Report Render (33 true gaps, 5 modules)
 * - DRAFT status & Watermark enforcement
 * - Print Namespace Isolation (#pm-printable-root)
 * - Section & Table Layouts (Cover, Control, TOC, Executive Summary, RTM, Gap, Approval, Appendix)
 * - Immutability & Zero Mutation
 * - Cross-phase Compatibility (Phase 1-4, Phase 5A)
 */

import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getAllTraceabilityRecords,
  getCoverageMetrics,
  getGapAnalysisReport,
  resetDraftToOfficial
} from './js/modules/process-mapping/process-mapping-data.js';

import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  buildRtmDocumentModel,
  buildGapDocumentModel,
  buildDocumentModel
} from './js/modules/process-mapping/process-mapping-doc.js';

import {
  renderDocument,
  renderCover,
  renderDocumentControl,
  renderTableOfContents,
  renderExecutiveSummary,
  renderRtmTable,
  renderGapSummary,
  renderGapTable,
  renderProvenance,
  renderApprovalSection,
  renderAppendix
} from './js/modules/process-mapping/process-mapping-doc-renderer.js';

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
  console.log('🧪 RUNNING PHASE 5B — DOCUMENT TEMPLATES & RENDERER TESTS');
  console.log('====================================================\n');

  await initProjectDataStore();
  const store = getActiveStore();

  const rtmModel = buildRtmDocumentModel({}, store);
  const gapModel = buildGapDocumentModel({}, store);

  // ----------------------------------------------------
  // 1. Master Renderer & Print Namespace Isolation
  // ----------------------------------------------------
  console.log('1. Master Renderer & Print Root Isolation');
  const rtmHtml = renderDocument(rtmModel);
  assert(typeof rtmHtml === 'string' && rtmHtml.length > 0, '1.1 renderDocument returns valid non-empty HTML string');
  assert(rtmHtml.includes('<div id="pm-printable-root">'), '1.2 Document is wrapped in #pm-printable-root namespace');
  assert(rtmHtml.includes('class="pm-doc-sheet'), '1.3 Document contains .pm-doc-sheet A4 page wrappers');

  const gapHtml = renderDocument(gapModel);
  assert(typeof gapHtml === 'string' && gapHtml.length > 0, '1.4 renderDocument for GAP returns valid non-empty HTML string');
  assert(gapHtml.includes('<div id="pm-printable-root">'), '1.5 Gap document is wrapped in #pm-printable-root namespace');

  // ----------------------------------------------------
  // 2. Cover Page Rendering & DRAFT Watermark
  // ----------------------------------------------------
  console.log('\n2. Cover Page & DRAFT Watermark');
  const coverHtml = renderCover(rtmModel.metadata);
  assert(coverHtml.includes('PT SOCFIN INDONESIA'), '2.1 Cover includes company name PT SOCFIN INDONESIA');
  assert(coverHtml.includes('SIGMA Rubber Nursery Management System'), '2.2 Cover includes system name');
  assert(coverHtml.includes('Requirements Traceability Matrix (RTM) Report'), '2.3 Cover includes document title');
  assert(coverHtml.includes('SIGMA-RN-DOC-04-RTM'), '2.4 Cover includes document ID');
  assert(coverHtml.includes('DRAFT — FOR INTERNAL REVIEW ONLY'), '2.5 Cover enforces DRAFT badge');
  assert(coverHtml.includes('class="pm-doc-watermark"'), '2.6 Cover renders DRAFT watermark');

  // ----------------------------------------------------
  // 3. Document Control Section
  // ----------------------------------------------------
  console.log('\n3. Document Control & Governance Section');
  const controlHtml = renderDocumentControl(rtmModel.metadata, rtmModel.provenance);
  assert(controlHtml.includes('1.0 Document Control & Governance'), '3.1 Control section has 1.0 heading');
  assert(controlHtml.includes('SIGMA-RN-DOC-04-RTM'), '3.2 Control table includes Document ID');
  assert(controlHtml.includes('v0.2.0'), '3.3 Control table includes baseline data version');
  assert(controlHtml.includes('1066f36'), '3.4 Control table includes git commit SHA');
  assert(controlHtml.includes('165 Requirements'), '3.5 Control table includes 165 requirements count');
  assert(controlHtml.includes('33 True Gaps'), '3.6 Control table includes 33 true gaps count');
  assert(controlHtml.includes('16 Master Rules'), '3.7 Control table includes 16 master rules count');

  // ----------------------------------------------------
  // 4. Table of Contents Rendering
  // ----------------------------------------------------
  console.log('\n4. Table of Contents Rendering');
  const tocHtml = renderTableOfContents(rtmModel.tableOfContents);
  assert(tocHtml.includes('Daftar Isi (Table of Contents)'), '4.1 TOC heading rendered');
  assert(tocHtml.includes('1.0 Document Control & Governance'), '4.2 Section 1.0 present in TOC');
  assert(tocHtml.includes('2.0 Ringkasan Eksekutif Keterlacakan'), '4.3 Section 2.0 present in TOC');
  assert(tocHtml.includes('3.0 Matriks Keterlacakan Kebutuhan (RTM Detail)'), '4.4 Section 3.0 present in TOC');
  assert(tocHtml.includes('4.0 Analisis Cakupan & Distribusi Kebutuhan'), '4.5 Section 4.0 present in TOC');
  assert(tocHtml.includes('5.0 Provenansi Data & Lampiran'), '4.6 Section 5.0 present in TOC');

  // ----------------------------------------------------
  // 5. Executive Summary & KPI Cards
  // ----------------------------------------------------
  console.log('\n5. Executive Summary & KPI Cards');
  const execHtml = renderExecutiveSummary(rtmModel.metadata, rtmModel.data);
  assert(execHtml.includes('2.0 Ringkasan Eksekutif'), '5.1 Executive Summary heading rendered');
  assert(execHtml.includes('165'), '5.2 Active Requirements KPI rendered (165)');
  assert(execHtml.includes('122'), '5.3 Flow Covered KPI rendered (122)');
  assert(execHtml.includes('33'), '5.4 True Gaps KPI rendered (33)');
  assert(execHtml.includes('80%') || execHtml.includes('80.0%'), '5.5 Traceability Health KPI rendered (80%)');

  // ----------------------------------------------------
  // 6. DOC-04 RTM Table Rendering (165 Records)
  // ----------------------------------------------------
  console.log('\n6. DOC-04 RTM Table Rendering (165 Records)');
  const rtmTableHtml = renderRtmTable(rtmModel.data.traceabilityRecords, rtmModel.data.moduleGroups);
  assert(rtmTableHtml.includes('3.0 Matriks Keterlacakan Kebutuhan (RTM Detail)'), '6.1 RTM table heading rendered');
  assert(rtmTableHtml.includes('Modul: Penerimaan (24 Requirements)'), '6.2 Module Penerimaan header rendered');
  assert(rtmTableHtml.includes('Modul: Okulasi (28 Requirements)'), '6.3 Module Okulasi header rendered');
  assert(rtmTableHtml.includes('RN-PRS-001'), '6.4 Sample req ID RN-PRS-001 rendered in table');
  assert(rtmTableHtml.includes('RN-MAT-MMG058'), '6.5 Sample req ID RN-MAT-MMG058 rendered in table');
  assert(rtmTableHtml.includes('pm-tag-covered'), '6.6 Covered tag rendered');
  assert(rtmTableHtml.includes('pm-tag-gap'), '6.7 True Gap tag rendered');
  assert(rtmTableHtml.includes('pm-tag-mgmt'), '6.8 Management tag rendered');

  // Count rendered rows in table (165 data rows)
  const rowMatches = rtmTableHtml.match(/<tr>\s*<td style="text-align: center;">\d+<\/td>/g);
  assert(rowMatches && rowMatches.length === 165, `6.9 Exactly 165 data rows rendered in RTM table (got: ${rowMatches?.length})`);

  // ----------------------------------------------------
  // 7. DOC-05 Gap Analysis Summary & Module Breakdown
  // ----------------------------------------------------
  console.log('\n7. DOC-05 Gap Analysis Summary & Module Breakdown');
  const gapSummaryHtml = renderGapSummary(gapModel.data);
  assert(gapSummaryHtml.includes('2.0 Ringkasan Kesenjangan Alur (Gap Summary)'), '7.1 Gap Summary heading rendered');
  assert(gapSummaryHtml.includes('33 True Gaps'), '7.2 Gap summary mentions 33 True Gaps');
  assert(gapSummaryHtml.includes('5 modul operasional'), '7.3 Gap summary mentions 5 operational modules');
  assert(gapSummaryHtml.includes('02-penerimaan') && gapSummaryHtml.includes('2 Gaps'), '7.4 Module 02-penerimaan shows 2 Gaps');
  assert(gapSummaryHtml.includes('03-penyemaian') && gapSummaryHtml.includes('8 Gaps'), '7.5 Module 03-penyemaian shows 8 Gaps');
  assert(gapSummaryHtml.includes('05-pemeriksaan') && gapSummaryHtml.includes('9 Gaps'), '7.6 Module 05-pemeriksaan shows 9 Gaps');
  assert(gapSummaryHtml.includes('07-kebun-entres') && gapSummaryHtml.includes('7 Gaps'), '7.7 Module 07-kebun-entres shows 7 Gaps');
  assert(gapSummaryHtml.includes('09-material-bahan') && gapSummaryHtml.includes('7 Gaps'), '7.8 Module 09-material-bahan shows 7 Gaps');

  // ----------------------------------------------------
  // 8. DOC-05 True Gap Table (Exactly 33 Records)
  // ----------------------------------------------------
  console.log('\n8. DOC-05 True Gap Table Rendering (33 Records)');
  const gapTableHtml = renderGapTable(gapModel.data.gapRecords);
  assert(gapTableHtml.includes('3.0 Rincian Kesenjangan Alur Kerja (33 True Gaps)'), '8.1 Gap Table heading rendered');
  assert(gapTableHtml.includes('RN-RCV-KSP019'), '8.2 Gap sample RN-RCV-KSP019 rendered');
  assert(gapTableHtml.includes('RN-MAT-MMG058'), '8.3 Gap sample RN-MAT-MMG058 rendered');
  assert(gapTableHtml.includes('Belum memiliki Flow Node'), '8.4 Explanation "Belum memiliki Flow Node" rendered');

  const gapRowMatches = gapTableHtml.match(/<tr>\s*<td style="text-align: center;">\d+<\/td>/g);
  assert(gapRowMatches && gapRowMatches.length === 33, `8.5 Exactly 33 data rows rendered in Gap table (got: ${gapRowMatches?.length})`);

  // ----------------------------------------------------
  // 9. Provenance, Approval, and Appendix
  // ----------------------------------------------------
  console.log('\n9. Provenance, Approval, and Appendix Sections');
  const provHtml = renderProvenance(rtmModel.provenance);
  assert(provHtml.includes('4.0 Provenansi Data & Baseline Integrity'), '9.1 Provenance heading rendered');
  assert(provHtml.includes('165 Active Reqs = 122 Covered + 33 True Gap + 10 Management'), '9.2 Provenance balance formula rendered');

  const apprvHtml = renderApprovalSection(rtmModel.metadata);
  assert(apprvHtml.includes('Lembar Persetujuan (Sign-off Sheet)'), '9.3 Approval heading rendered');
  assert(apprvHtml.includes('Dibuat Oleh') && apprvHtml.includes('Diperiksa Oleh') && apprvHtml.includes('Disetujui Oleh'), '9.4 All 3 approval roles rendered');
  assert(apprvHtml.includes('DRAFT'), '9.5 Approval text clarifies DRAFT state');

  const appndxHtml = renderAppendix(DOCUMENT_TYPES.RTM_REPORT, rtmModel.data);
  assert(appndxHtml.includes('Glosarium Istilah Operasional'), '9.6 Appendix glossary rendered');
  assert(appndxHtml.includes('Mata Entres') && appndxHtml.includes('Okulasi') && appndxHtml.includes('Regrafting'), '9.7 Agronomy terms rendered');

  // ----------------------------------------------------
  // 10. Immutability & Determinism
  // ----------------------------------------------------
  console.log('\n10. Immutability & Determinism');
  const render1 = renderDocument(rtmModel);
  const render2 = renderDocument(rtmModel);
  assert(render1 === render2, '10.1 Consecutive renders produce identical deterministic HTML output');
  assert(store.requirements.length === 165, '10.2 Store requirements count not mutated by renderer');
  assert(store.businessRules.length === 16, '10.3 Store business rules count not mutated by renderer');

  // ----------------------------------------------------
  // 11. Cross-Phase Compatibility
  // ----------------------------------------------------
  console.log('\n11. Cross-Phase Compatibility (Phase 1-4, Phase 5A)');
  assert(getAllTraceabilityRecords().length === 165, '11.1 Phase 4C getAllTraceabilityRecords operates cleanly');
  assert(getCoverageMetrics().flowCovered === 122, '11.2 Phase 4A getCoverageMetrics operates cleanly');
  assert(getGapAnalysisReport().totalGaps === 33, '11.3 Phase 4D getGapAnalysisReport operates cleanly');

  console.log('\n====================================================');
  console.log(`🎉 ALL PHASE 5B TESTS PASSED! (${passedAssertions}/${totalAssertions} assertions)`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
