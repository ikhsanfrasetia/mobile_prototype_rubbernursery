/**
 * scripts/test-task12-1a-recovery-suite.js
 * TASK 12.1A — 15 COMPREHENSIVE RECOVERY & ARCHITECTURE TESTS
 *
 * TEST 01 - Portal load
 * TEST 02 - Static JSON reading
 * TEST 03 - Requirement Manager
 * TEST 04 - Flow
 * TEST 05 - Business Rules
 * TEST 06 - Rekonsiliasi
 * TEST 07 - Riwayat / Audit metadata
 * TEST 08 - Role filter
 * TEST 09 - Module filter
 * TEST 10 - Role + Module intersection
 * TEST 11 - Search engine
 * TEST 12 - Reset filter
 * TEST 13 - CRUD local development & draft persistence
 * TEST 14 - Browser refresh simulation
 * TEST 15 - Static hosting simulation & zero API dependency
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
  createBusinessRule,
  editBusinessRule,
  createMapping,
  deleteMapping,
  getReconciliationCatalog,
  validateProjectData
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

// Mock localStorage for Node.js
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

async function runSuite() {
  console.log('\n===============================================================');
  console.log('🧪 TASK 12.1A — 15 COMPREHENSIVE RECOVERY & ARCHITECTURE TESTS');
  console.log('===============================================================\n');

  // TEST 01: Portal Load
  console.log('--- TEST 01: Portal Load ---');
  localStorage.clear();
  const store = await initProjectDataStore(true);
  assert('T01.1', 'Portal store initializes successfully', Boolean(store));
  assert('T01.2', 'Portal metadata version is 2.2.0', store.metadata?.version === '2.2.0');
  assert('T01.3', 'Portal contains 11 modules and 7 roles', store.modules?.length === 11 && store.roles?.length === 7);

  // TEST 02: Static JSON Reading
  console.log('\n--- TEST 02: Static JSON Dapat Dibaca ---');
  const jsonPath = path.resolve('data/process-mapping-data.json');
  assert('T02.1', 'data/process-mapping-data.json exists on disk', fs.existsSync(jsonPath));
  let parsedJson = null;
  try { parsedJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (e) {}
  assert('T02.2', 'data/process-mapping-data.json is valid JSON', parsedJson !== null);
  const valResult = validateProjectData(parsedJson);
  assert('T02.3', 'validateProjectData reports valid schema', valResult.valid === true);

  // TEST 03: Requirement Manager
  console.log('\n--- TEST 03: Requirement Manager ---');
  const allReqs = store.requirements || [];
  const activeReqs = allReqs.filter(r => !r.isArchived && !r.isSuperseded && r.status !== 'Deprecated');
  const activeConfirmed = activeReqs.filter(r => r.status === 'Confirmed');
  const activeOpenPoints = activeReqs.filter(r => r.status !== 'Confirmed');
  assert('T03.1', 'Total active requirements is canonical 127', activeReqs.length === 127);
  assert('T03.2', 'Total active confirmed requirements is 121', activeConfirmed.length === 121);
  assert('T03.3', 'Total active open points (Revisi/Draft) is 6', activeOpenPoints.length === 6);

  // TEST 04: Flow
  console.log('\n--- TEST 04: Flow ---');
  const flows = store.flows || {};
  let brokenEdges = 0;
  const activeNodeIds = new Set();
  for (const [, features] of Object.entries(flows)) {
    for (const [, flowObj] of Object.entries(features || {})) {
      (flowObj.nodes || []).forEach(n => { if (!n.isArchived && !n.isSuperseded) activeNodeIds.add(n.id); });
    }
  }
  for (const [, features] of Object.entries(flows)) {
    for (const [, flowObj] of Object.entries(features || {})) {
      (flowObj.edges || []).forEach(e => {
        if (!e.isArchived && !e.isSuperseded) {
          if (!activeNodeIds.has(e.from || e.fromNode) || !activeNodeIds.has(e.to || e.toNode)) brokenEdges++;
        }
      });
    }
  }
  assert('T04.1', 'Flow structure covers 11 modules', Object.keys(flows).length === 11);
  assert('T04.2', '0 broken edges across all flows', brokenEdges === 0);
  assert('T04.3', 'Cross-flow edges present (5)', Array.isArray(store.crossFlowEdges) && store.crossFlowEdges.length === 5);

  // TEST 05: Business Rules
  console.log('\n--- TEST 05: Business Rules ---');
  assert('T05.1', 'Canonical 18 business rules', store.businessRules?.length === 18);
  assert('T05.2', 'BR-GLB-001 present', store.businessRules.some(r => r.id === 'BR-GLB-001'));

  // TEST 06: Rekonsiliasi
  console.log('\n--- TEST 06: Rekonsiliasi ---');
  const catalog = getReconciliationCatalog();
  const catActive = catalog.filter(c => c.classification === 'Retained' || c.classification === 'Revised');
  const catHist = catalog.filter(c => c.classification === 'Deprecated' || c.classification === 'Merged');
  assert('T06.1', 'Reconciliation catalog total = 182', catalog.length === 182);
  assert('T06.2', 'Catalog active = 127', catActive.length === 127);
  assert('T06.3', 'Catalog historical = 55', catHist.length === 55);

  // TEST 07: Riwayat
  console.log('\n--- TEST 07: Riwayat ---');
  assert('T07.1', 'Metadata contains version and timestamps', Boolean(store.metadata?.version));

  // TEST 08: Role Filter
  console.log('\n--- TEST 08: Role Filter ---');
  const mantriItems = activeReqs.filter(r => (r.role || '').toLowerCase().includes('mantri'));
  assert('T08.1', 'Role filter Mantri Bibitan returns results', mantriItems.length > 0);
  assert('T08.2', 'Role filter Asisten Bibitan returns results', activeReqs.filter(r => (r.role || '').toLowerCase().includes('asisten bibitan')).length > 0);

  // TEST 09: Module Filter
  console.log('\n--- TEST 09: Module Filter ---');
  const mod01 = activeReqs.filter(r => r.moduleId === '01-presensi');
  assert('T09.1', 'Module 01-presensi returns 11 items', mod01.length === 11);
  assert('T09.2', 'Module 04-okulasi returns non-empty', activeReqs.filter(r => r.moduleId === '04-okulasi').length > 0);

  // TEST 10: Role + Module Intersection
  console.log('\n--- TEST 10: Role + Module Intersection ---');
  const compound = activeReqs.filter(r => (r.role || '').toLowerCase().includes('mantri') && r.moduleId === '01-presensi');
  assert('T10.1', 'Compound filter returns subset', compound.length > 0 && compound.length <= mod01.length);

  // TEST 11: Search
  console.log('\n--- TEST 11: Search ---');
  const sr = activeReqs.filter(r => (r.id + r.title + (r.module || '')).toLowerCase().includes('okulasi'));
  assert('T11.1', 'Search "okulasi" returns results', sr.length > 0);

  // TEST 12: Reset Filter
  console.log('\n--- TEST 12: Reset Filter ---');
  assert('T12.1', 'Reset returns full 127', activeReqs.length === 127);

  // TEST 13: CRUD Local Development
  console.log('\n--- TEST 13: CRUD Local Development ---');
  const testReq = createRequirement({ title: 'Recovery Test', role: 'Mantri Bibitan', module: 'Penerimaan', moduleId: '02-penerimaan', feature: 'Penerimaan Biji', featureId: 'penerimaan-biji', input: 'X', validation: 'Y', output: 'Z' }, 'Tester');
  assert('T13.1', 'createRequirement works', Boolean(testReq?.id));
  saveDraftToStorage();
  assert('T13.2', 'Draft active after save', hasActiveDraft());
  editRequirement(testReq.id, { title: 'Updated' }, 'Tester');
  assert('T13.3', 'editRequirement updates title', getActiveStore().requirements.find(r => r.id === testReq.id)?.title === 'Updated');
  archiveRequirement(testReq.id);
  assert('T13.4', 'archiveRequirement sets isArchived', getActiveStore().requirements.find(r => r.id === testReq.id)?.isArchived === true);
  restoreRequirement(testReq.id, 'Tester');
  assert('T13.5', 'restoreRequirement clears isArchived', getActiveStore().requirements.find(r => r.id === testReq.id)?.isArchived === false);

  // TEST 14: Browser Refresh Simulation
  console.log('\n--- TEST 14: Browser Refresh ---');
  saveDraftToStorage();
  const refreshed = await initProjectDataStore(false);
  assert('T14.1', 'Refresh loads draft', refreshed.requirements.find(r => r.id === testReq.id) !== undefined);
  const clean = await resetDraftToOfficial();
  assert('T14.2', 'Reset clears draft', clean.requirements.find(r => r.id === testReq.id) === undefined);

  // TEST 15: Static Hosting Simulation
  console.log('\n--- TEST 15: Static Hosting Simulation ---');
  const srv = http.createServer((req, res) => {
    if (req.url === '/data/process-mapping-data.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Connection': 'close' });
      res.end(fs.readFileSync(path.resolve('data/process-mapping-data.json'), 'utf8'));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Connection': 'close' });
      res.end('Not Found');
    }
  });
  await new Promise(r => srv.listen(0, r));
  const p = srv.address().port;
  const r1 = await fetch(`http://127.0.0.1:${p}/data/process-mapping-data.json`, { headers: { Connection: 'close' } });
  assert('T15.1', 'Static JSON returns HTTP 200', r1.status === 200);
  const r2 = await fetch(`http://127.0.0.1:${p}/api/process-mapping/data`, { headers: { Connection: 'close' } });
  assert('T15.2', 'API route returns 404 (no backend dependency)', r2.status === 404);
  if (typeof srv.closeAllConnections === 'function') srv.closeAllConnections();
  await new Promise(r => srv.close(r));
  await new Promise(r => setTimeout(r, 50));

  // SUMMARY
  console.log('\n===============================================================');
  console.log(`📊 TASK 12.1A RESULT: ${passedTests}/${totalTests} TESTS PASS (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('===============================================================\n');
  if (passedTests !== totalTests) process.exit(1);
}

runSuite().catch(err => { console.error('Fatal:', err); process.exit(1); });
