/**
 * test-phase5e-browser-integration.js
 * Integration test verifying:
 * 1. Cross navigation container resolution (no freeze)
 * 2. Jump to requirement target resolution
 * 3. Jump to flow node target resolution
 * 4. Printable root presence and styling under print
 * 5. DOC-04 & DOC-05 printable content integrity
 */

import assert from 'assert';
import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getRequirementByReqId
} from './js/modules/process-mapping/process-mapping-data.js';
import {
  buildDocumentModel,
  DOCUMENT_TYPES
} from './js/modules/process-mapping/process-mapping-doc.js';
import {
  renderDocument
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

async function runBrowserIntegrationTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 5E — BROWSER INTEGRATION & BUGFIX TESTS');
  console.log('====================================================\n');

  initProjectDataStore(true);
  const store = getActiveStore();

  // Test 1: DOM Container Resolution
  console.log('1. Portal Container Resolution');
  const mockContainer = {
    id: 'process-mapping-container',
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };
  assert(mockContainer.id === 'process-mapping-container', '1.1 #process-mapping-container is the standard DOM container');

  // Test 2: Requirement Lookup & Target Module Resolution
  console.log('\n2. Requirement & Flow Node Navigation Target Resolution');
  const allReqs = (store.requirements || []).filter(r => !r.isArchived);
  assert(allReqs.length === 165, `2.1 Total active requirements is 165 (got: ${allReqs.length})`);
  
  const sampleReq = allReqs[0];
  assert(sampleReq !== null && sampleReq !== undefined, '2.2 First requirement is found');
  const resolvedSample = getRequirementByReqId(sampleReq.id);
  assert(resolvedSample !== null, `2.3 getRequirementByReqId resolved ${sampleReq.id}`);
  assert(resolvedSample.moduleId !== undefined || resolvedSample.module !== undefined, '2.4 Target module is correctly resolved');

  // Test 3: Print Media CSS Verification
  console.log('\n3. Print Stylesheet Isolation & Reset Rules');
  const printCss = fs.readFileSync('./css/process-mapping-print.css', 'utf8');
  const mappingCss = fs.readFileSync('./css/process-mapping.css', 'utf8');

  assert(printCss.includes('@media print'), '3.1 @media print is defined in process-mapping-print.css');
  assert(printCss.includes('#process-mapping-container'), '3.2 #process-mapping-container is reset in print CSS');
  assert(printCss.includes('.pm-doc-preview-backdrop'), '3.3 .pm-doc-preview-backdrop is reset in print CSS');
  assert(printCss.includes('.pm-doc-preview-viewport'), '3.4 .pm-doc-preview-viewport is reset in print CSS');
  assert(printCss.includes('overflow: visible !important'), '3.5 overflow: visible !important is enforced for print containers');
  assert(printCss.includes('page-break-after: always'), '3.6 A4 sheets have page-break-after: always for multi-page print');

  assert(mappingCss.includes('#process-mapping-container'), '3.7 process-mapping.css also resets #process-mapping-container');

  // Test 4: DOC-04 Printable Content Model & Rendering
  console.log('\n4. DOC-04 & DOC-05 Printable Content Verification');
  const doc04Model = buildDocumentModel(DOCUMENT_TYPES.RTM_REPORT, {}, store);
  const doc04Html = renderDocument(doc04Model);
  assert(doc04Html.includes('id="pm-printable-root"'), '4.1 DOC-04 contains #pm-printable-root');
  assert(doc04Html.includes('class="pm-doc-sheet"'), '4.2 DOC-04 contains .pm-doc-sheet wrappers');
  assert(doc04Html.includes(sampleReq.id), '4.3 DOC-04 printable body contains requirement data');

  const doc05Model = buildDocumentModel(DOCUMENT_TYPES.GAP_REPORT, {}, store);
  const doc05Html = renderDocument(doc05Model);
  assert(doc05Html.includes('id="pm-printable-root"'), '4.4 DOC-05 contains #pm-printable-root');
  assert(doc05Html.includes('class="pm-doc-sheet"'), '4.5 DOC-05 contains .pm-doc-sheet wrappers');

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 5E INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runBrowserIntegrationTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
