import fs from 'fs';
import { validateProjectData, initProjectDataStore, getActiveStore } from '../js/modules/process-mapping/process-mapping-data.js';
import { PROCESS_MAPPING_BASELINE } from '../js/data/process-mapping-baseline.js';

console.log('=== START VALIDATION OF MASTER BASELINE CURRENT ===\n');

let pass = true;
function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
    pass = false;
  }
}

// 1. JSON and Baseline File Check
const rawJson = fs.readFileSync('./data/process-mapping-data.json', 'utf8');
const dataJson = JSON.parse(rawJson);
assert(dataJson.metadata.version === '2.2.0', 'process-mapping-data.json has version 2.2.0');

// 2. Validate Schema with validateProjectData
const validation = validateProjectData(PROCESS_MAPPING_BASELINE);
assert(validation.valid === true, `validateProjectData returned valid=true (Errors: ${validation.errors.join(', ')})`);

// 3. Initialize In-Memory Store
const store = initProjectDataStore(true);
assert(Boolean(store), 'initProjectDataStore initialized successfully');

// 4. Role Counts & Special State Check (Tekniker I and KTU = empty)
const roles = store.roles || [];
assert(roles.length === 7, `Total 7 Master Roles present (found ${roles.length})`);

const expectedRoles = [
  'mantri-bibitan',
  'asisten-bibitan',
  'asisten-divisi',
  'asisten-kepala',
  'pengurus',
  'tekniker-1',
  'ktu'
];
expectedRoles.forEach(rId => {
  assert(roles.some(r => r.id === rId), `Role '${rId}' exists in role master`);
});

// Requirements Breakdown
const allReqs = store.requirements || [];
const activeReqs = allReqs.filter(r => !r.isArchived && !r.isSuperseded);
const deprecatedReqs = allReqs.filter(r => r.isArchived || r.status === 'Deprecated');

console.log(`\nRequirement Stats:`);
console.log(`- Total Master Requirements in Dataset: ${allReqs.length}`);
console.log(`- Active Requirements: ${activeReqs.length}`);
console.log(`- Deprecated Requirements: ${deprecatedReqs.length}`);

assert(allReqs.length === 179, `Total requirements dataset is 179 (found ${allReqs.length})`);
assert(activeReqs.length === 149, `Active requirements count is 149 (found ${activeReqs.length})`);
assert(deprecatedReqs.length === 30, `Deprecated requirements count is 30 (found ${deprecatedReqs.length})`);

// Check specific roles active requirements
const mantriActive = activeReqs.filter(r => r.role === 'Mantri Bibitan').length;
const asistenBibActive = activeReqs.filter(r => r.role === 'Asisten Bibitan').length;
const asistenDivActive = activeReqs.filter(r => r.role === 'Asisten Divisi').length;
const askepActive = activeReqs.filter(r => r.role === 'Asisten Kepala').length;
const pengurusActive = activeReqs.filter(r => r.role === 'Pengurus' || r.role === 'Pengurus Kebun Peminta').length;
const teknikerActive = activeReqs.filter(r => r.role === 'Tekniker I' || r.roleId === 'tekniker-1').length;
const ktuActive = activeReqs.filter(r => r.role === 'KTU' || r.roleId === 'ktu').length;

console.log(`\nActive Requirements per Role:`);
console.log(`- Mantri Bibitan: ${mantriActive}`);
console.log(`- Asisten Bibitan: ${asistenBibActive}`);
console.log(`- Asisten Divisi: ${asistenDivActive}`);
console.log(`- Asisten Kepala: ${askepActive}`);
console.log(`- Pengurus Kebun Peminta: ${pengurusActive}`);
console.log(`- Tekniker I: ${teknikerActive}`);
console.log(`- KTU: ${ktuActive}`);

assert(teknikerActive === 0, `Tekniker I has 0 active requirements (found ${teknikerActive})`);
assert(ktuActive === 0, `KTU has 0 active requirements (found ${ktuActive})`);
assert(pengurusActive === 6, `Pengurus has 6 active requirements (found ${pengurusActive})`);

// Check REVISI requirements
const revisiReqIds = ['RN-OKL-014', 'RN-REG-010', 'RN-MAT-005'];
revisiReqIds.forEach(id => {
  const req = allReqs.find(r => r.id === id);
  assert(Boolean(req), `REVISI Req ${id} exists in dataset`);
  if (req) {
    assert(req.status === 'Revisi' || req.status === 'Draft' || req.status === 'Confirmed', `Req ${id} status is valid`);
  }
});

// Check Modules (11 Modules)
const modules = store.modules || [];
assert(modules.length === 11, `Total 11 Modules present (found ${modules.length})`);

// Check Features (20 Active Features)
let totalFeatures = 0;
for (const m of modules) {
  totalFeatures += (m.features || []).length;
}
console.log(`- Total Active Features across 11 modules: ${totalFeatures}`);
assert(totalFeatures === 20, `Total 20 active features (transplanting-polybag removed, found ${totalFeatures})`);

// Check M03 contains only semai-bedengan
const m03 = modules.find(m => m.id === '03-penyemaian');
assert(m03 && m03.features.length === 1 && m03.features[0].id === 'semai-bedengan', 'Modul 03 only contains semai-bedengan');

// Check Flow Nodes & Edges Integrity
let totalNodes = 0;
let totalEdges = 0;
let brokenEdges = 0;
for (const [modId, feats] of Object.entries(store.flows || {})) {
  for (const [featId, flow] of Object.entries(feats || {})) {
    const nodeIds = new Set((flow.nodes || []).map(n => n.id));
    totalNodes += (flow.nodes || []).length;
    (flow.edges || []).forEach(e => {
      totalEdges++;
      const from = e.from || e.fromNode;
      const to = e.to || e.toNode;
      if (!nodeIds.has(from) || !nodeIds.has(to)) {
        console.error(`Broken edge in ${modId}/${featId}: ${e.id} (${from} -> ${to})`);
        brokenEdges++;
      }
    });
  }
}
console.log(`\nFlow Integrity:`);
console.log(`- Total Flow Nodes: ${totalNodes}`);
console.log(`- Total Flow Edges: ${totalEdges}`);
console.log(`- Broken Edges: ${brokenEdges}`);
assert(brokenEdges === 0, `0 broken edges across all 20 feature flows`);

// Check Cross Flow Edges
const cfeList = store.crossFlowEdges || [];
assert(cfeList.length === 5, `Total 5 cross-flow edges configured (found ${cfeList.length})`);

// Check Business Rules
const brList = store.businessRules || [];
assert(brList.length === 18, `Total 18 canonical business rules configured (found ${brList.length})`);

console.log(`\n=== FINAL VALIDATION RESULT: ${pass ? 'ALL CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'} ===`);
if (!pass) process.exit(1);
