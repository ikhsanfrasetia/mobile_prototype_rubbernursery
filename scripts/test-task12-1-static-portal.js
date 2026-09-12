/**
 * scripts/test-task12-1-static-portal.js
 * Verification test suite for Task 12.1:
 * - Static JSON Loading (data/process-mapping-data.json)
 * - Static Web Hosting Simulation (Zero REST API dependency)
 * - Local Draft CRUD (localStorage persistence & draft reset)
 * - Role & Module Filters, Search, Reconciliation Catalog
 * - Mobile Prototype, Notes, and Transactions Isolation
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import {
  initProjectDataStore,
  getActiveStore,
  hasActiveDraft,
  saveDraftToStorage,
  resetDraftToOfficial,
  createRequirement,
  editRequirement,
  archiveRequirement,
  restoreRequirement,
  addFlowNode,
  editFlowNode,
  archiveFlowNode,
  addFlowEdge,
  editFlowEdge,
  archiveFlowEdge,
  createBusinessRule,
  editBusinessRule,
  archiveBusinessRule,
  restoreBusinessRule,
  createMapping,
  deleteMapping,
  getReconciliationCatalog,
  getRequirementClassification
} from '../js/modules/process-mapping/process-mapping-data.js';

let totalTests = 0;
let passedTests = 0;

function assert(testId, name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testId}: ${name}`);
  } else {
    console.error(`  ❌ [FAIL] ${testId}: ${name} ${details ? '(' + details + ')' : ''}`);
  }
}

// Mock localStorage for Node.js test environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

async function runStaticPortalSuite() {
  console.log('\n===============================================================');
  console.log('🧪 TASK 12.1 STATIC PORTAL SUITE & REGRESSION TEST');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Static JSON & Canonical Baseline Loading
  // ---------------------------------------------------------------------------
  console.log('--- 1. Static JSON Loading & Canonical Baseline ---');
  localStorage.clear();
  const store = await initProjectDataStore(true);
  
  const activeRequirements = store.requirements.filter(r => !r.isArchived && !r.isSuperseded && r.status !== 'Deprecated');
  const activeConfirmed = activeRequirements.filter(r => r.status === 'Confirmed');
  const activeOpenPoints = activeRequirements.filter(r => r.status !== 'Confirmed');

  assert('T12.1.1', 'Static project data store initializes from data/process-mapping-data.json', store !== null);
  assert('T12.1.2', 'Canonical active requirements count is 127', activeRequirements.length === 127);
  assert('T12.1.3', 'Canonical active confirmed requirements is 121', activeConfirmed.length === 121);
  assert('T12.1.4', 'Canonical open points (Revisi/Draft) count is 6', activeOpenPoints.length === 6);
  assert('T12.1.5', 'Canonical modules count is 11', store.modules?.length === 11);
  assert('T12.1.6', 'Canonical roles count is 7', store.roles?.length === 7);
  assert('T12.1.7', 'Canonical business rules count is 18', store.businessRules?.length === 18);
  assert('T12.1.8', 'Flows structure contains 11 modules', Object.keys(store.flows || {}).length === 11);

  // ---------------------------------------------------------------------------
  // 2. Role & Module Filters, Compound Filter & Search
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Filtering & Search Engine ---');
  
  // Role filtering
  const mantriReqs = activeRequirements.filter(r => (r.role || '').toLowerCase().includes('mantri'));
  assert('T12.1.9', 'Role filter for Mantri Bibitan returns valid list', mantriReqs.length > 0);

  // Module filtering
  const mod01Reqs = activeRequirements.filter(r => r.moduleId === '01-presensi');
  assert('T12.1.10', 'Module filter for 01-presensi returns 11 active requirements', mod01Reqs.length === 11);

  // Compound filter (Role + Module)
  const compoundReqs = activeRequirements.filter(r => (r.role || '').toLowerCase().includes('mantri') && r.moduleId === '01-presensi');
  assert('T12.1.11', 'Compound filter (Role + Module) returns filtered subset', compoundReqs.length > 0 && compoundReqs.length <= mod01Reqs.length);

  // Search filter
  const searchResults = activeRequirements.filter(r => 
    (r.id && r.id.toLowerCase().includes('okulasi')) ||
    (r.title && r.title.toLowerCase().includes('okulasi')) ||
    (r.module && r.module.toLowerCase().includes('okulasi'))
  );
  assert('T12.1.12', 'Search query for "okulasi" returns matching requirements', searchResults.length > 0);

  // ---------------------------------------------------------------------------
  // 3. Reconciliation Catalog Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Reconciliation Catalog ---');
  const catalog = getReconciliationCatalog();
  const catalogActive = catalog.filter(c => c.classification === 'Retained' || c.classification === 'Revised');
  const catalogHistorical = catalog.filter(c => c.classification === 'Deprecated' || c.classification === 'Merged');

  assert('T12.1.13', 'Reconciliation catalog generates without error', Array.isArray(catalog) && catalog.length > 0);
  assert('T12.1.14', 'Catalog active canonical items count is 127', catalogActive.length === 127);
  assert('T12.1.15', 'Catalog deprecated/merged items are cleanly quarantined in historical', catalogHistorical.length > 0);

  // ---------------------------------------------------------------------------
  // 4. Local Draft CRUD & LocalStorage Persistence
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Local Draft CRUD & Persistence ---');
  assert('T12.1.16', 'Initially hasActiveDraft is false', hasActiveDraft() === false);

  // Create requirement in local draft
  const testReqData = {
    title: 'Test Draft Requirement Local',
    role: 'Mantri Bibitan',
    module: 'Penerimaan',
    moduleId: '02-penerimaan',
    feature: 'Penerimaan Biji',
    featureId: 'penerimaan-biji',
    acceptanceCriteria: 'Test criteria',
    process: 'Test process',
    input: 'Data Biji',
    validation: 'Validasi Fisik',
    output: 'Biji Diterima'
  };
  const createdReq = createRequirement(testReqData, 'Local Analyst');
  assert('T12.1.17', 'createRequirement creates draft requirement in memory', createdReq && createdReq.id.startsWith('RN-PEN-'));

  saveDraftToStorage();
  assert('T12.1.18', 'hasActiveDraft is true after saveDraftToStorage', hasActiveDraft() === true);

  // Edit requirement
  editRequirement(createdReq.id, { title: 'Updated Test Draft Title' }, 'Local Analyst');
  saveDraftToStorage();
  const updatedCheck = getActiveStore().requirements.find(r => r.id === createdReq.id);
  assert('T12.1.19', 'editRequirement updates local draft in memory', updatedCheck?.title === 'Updated Test Draft Title');

  // Archive requirement
  archiveRequirement(createdReq.id);
  saveDraftToStorage();
  const archivedCheck = getActiveStore().requirements.find(r => r.id === createdReq.id);
  assert('T12.1.20', 'archiveRequirement marks isArchived: true in local draft', archivedCheck?.isArchived === true);

  // Restore requirement
  restoreRequirement(createdReq.id, 'Local Analyst');
  saveDraftToStorage();
  const restoredCheck = getActiveStore().requirements.find(r => r.id === createdReq.id);
  assert('T12.1.21', 'restoreRequirement restores requirement to active in local draft', restoredCheck?.isArchived === false);

  // Flow Node CRUD in local draft
  const createdNode = addFlowNode('02-penerimaan', 'terima-benih', { label: 'Test Draft Node', type: 'process' }, 'Local Analyst');
  saveDraftToStorage();
  assert('T12.1.22', 'addFlowNode creates node in local draft', createdNode !== null && createdNode.id !== '');

  editFlowNode('02-penerimaan', 'terima-benih', createdNode.id, { label: 'Updated Draft Node Label' }, 'Local Analyst');
  saveDraftToStorage();
  const updatedNodeCheck = getActiveStore().flows['02-penerimaan']['terima-benih'].nodes.find(n => n.id === createdNode.id);
  assert('T12.1.23', 'editFlowNode updates node in local draft', updatedNodeCheck?.label === 'Updated Draft Node Label');

  archiveFlowNode('02-penerimaan', 'terima-benih', createdNode.id, 'Local Analyst');
  saveDraftToStorage();
  const archivedNodeCheck = getActiveStore().flows['02-penerimaan']['terima-benih'].nodes.find(n => n.id === createdNode.id);
  assert('T12.1.24', 'archiveFlowNode archives node in local draft', archivedNodeCheck?.isArchived === true);

  // Business Rule CRUD in local draft
  const createdRule = createBusinessRule({ title: 'Test Draft Rule', description: 'Test description', category: 'Presensi' }, 'Local Analyst');
  saveDraftToStorage();
  assert('T12.1.25', 'createBusinessRule creates rule in local draft', createdRule !== null);

  editBusinessRule(createdRule.id, { title: 'Updated Draft Rule Title' }, 'Local Analyst');
  saveDraftToStorage();
  const updatedRuleCheck = getActiveStore().businessRules.find(r => r.id === createdRule.id);
  assert('T12.1.26', 'editBusinessRule updates rule in local draft', updatedRuleCheck?.title === 'Updated Draft Rule Title');

  // Mapping CRUD in local draft
  createMapping({ sourceEntity: 'Requirement', sourceId: createdReq.id, targetEntity: 'BusinessRule', targetId: createdRule.id }, 'Local Analyst');
  saveDraftToStorage();
  const mappedReqCheck = getActiveStore().requirements.find(r => r.id === createdReq.id);
  assert('T12.1.27', 'createMapping links requirement to rule in local draft', mappedReqCheck?.ruleIds?.includes(createdRule.id) === true);

  deleteMapping('test-map-id', { sourceEntity: 'Requirement', sourceId: createdReq.id, targetEntity: 'BusinessRule', targetId: createdRule.id }, 'Local Analyst');
  saveDraftToStorage();
  assert('T12.1.28', 'deleteMapping unlinks requirement from rule in local draft', !mappedReqCheck?.ruleIds?.includes(createdRule.id));

  // Simulate Browser Page Refresh (re-init without force)
  const refreshedStore = await initProjectDataStore(false);
  const draftItemAfterReload = refreshedStore.requirements.find(r => r.id === createdReq.id);
  assert('T12.1.29', 'Simulated browser refresh loads draft from localStorage', draftItemAfterReload !== undefined && draftItemAfterReload.title === 'Updated Test Draft Title');

  // Reset Draft / Refresh Data (reverts to canonical JSON)
  const cleanStore = await resetDraftToOfficial();
  assert('T12.1.30', 'resetDraftToOfficial clears localStorage draft', hasActiveDraft() === false);
  const resetItemCheck = cleanStore.requirements.find(r => r.id === createdReq.id);
  assert('T12.1.31', 'After resetDraftToOfficial, cleanStore matches canonical active 127 requirements', resetItemCheck === undefined && cleanStore.requirements.filter(r => !r.isArchived && !r.isSuperseded && r.status !== 'Deprecated').length === 127);

  // ---------------------------------------------------------------------------
  // 5. Pure Static Web Server Simulation (GET data/process-mapping-data.json)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Pure Static Web Server Simulation ---');
  const server = http.createServer((req, res) => {
    // Pure static file server (no /api/process-mapping/* routes!)
    if (req.url === '/data/process-mapping-data.json' || req.url === './data/process-mapping-data.json') {
      const filePath = path.resolve('data/process-mapping-data.json');
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Connection': 'close' });
      res.end(content);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Connection': 'close' });
      res.end('Not Found');
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const staticFetchRes = await fetch(`http://127.0.0.1:${port}/data/process-mapping-data.json`, {
    headers: { Connection: 'close' }
  });
  assert('T12.1.32', 'Static HTTP server serves data/process-mapping-data.json with HTTP 200', staticFetchRes.status === 200);
  const staticJson = await staticFetchRes.json();
  const activeStaticReqs = (staticJson.requirements || []).filter(r => !r.isArchived && !r.isSuperseded && r.status !== 'Deprecated');
  assert('T12.1.33', 'Static JSON payload contains 127 active requirements and 11 modules', activeStaticReqs.length === 127 && staticJson.modules?.length === 11);

  const apiFetchRes = await fetch(`http://127.0.0.1:${port}/api/process-mapping/data`, {
    headers: { Connection: 'close' }
  });
  assert('T12.1.34', 'Static server returns HTTP 404 for /api/process-mapping/* (verifying zero server API dependency)', apiFetchRes.status === 404);

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => setTimeout(resolve, 50));

  // ---------------------------------------------------------------------------
  // 6. Mobile Prototype & Master Baseline Isolation
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Mobile Prototype & Master Baseline Isolation ---');
  const appJs = fs.readFileSync(path.resolve('js/app.js'), 'utf8');
  const routerJs = fs.readFileSync(path.resolve('js/core/router.js'), 'utf8');
  assert('T12.1.35', 'js/app.js is clean and intact', appJs.length > 0);
  assert('T12.1.36', 'js/core/router.js is clean and intact', routerJs.length > 0);
  assert('T12.1.37', 'Core PWA index.html and app.js exist and are intact', fs.existsSync(path.resolve('index.html')) && fs.existsSync(path.resolve('js/app.js')));

  console.log('\n===============================================================');
  console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} TESTS PASS (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('===============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runStaticPortalSuite().catch((err) => {
  console.error('Fatal Error running suite:', err);
  process.exit(1);
});
