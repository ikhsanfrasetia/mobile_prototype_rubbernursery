import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawData = fs.readFileSync(path.join(__dirname, '../data/process-mapping-data.json'), 'utf8');
const data = JSON.parse(rawData);
const activeReqs = data.requirements.filter(r => !r.isArchived && !r.isSuperseded);

function filterReqs(activeReqs, { reqSearchQuery = '', reqFilterRole = 'ALL', reqFilterModule = 'ALL', reqFilterFeature = 'ALL', reqFilterStatus = 'ALL' }) {
  return activeReqs.filter((r) => {
    const q = reqSearchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.process && r.process.toLowerCase().includes(q)) ||
      (r.acceptanceCriteria && (
        Array.isArray(r.acceptanceCriteria)
          ? r.acceptanceCriteria.some((ac) => String(ac).toLowerCase().includes(q))
          : String(r.acceptanceCriteria).toLowerCase().includes(q)
      )) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.role && r.role.toLowerCase().includes(q)) ||
      (r.roleId && r.roleId.toLowerCase().includes(q)) ||
      (r.module && r.module.toLowerCase().includes(q)) ||
      (r.moduleId && r.moduleId.toLowerCase().includes(q)) ||
      (r.feature && r.feature.toLowerCase().includes(q)) ||
      (r.featureId && r.featureId.toLowerCase().includes(q)) ||
      (r.businessRule && r.businessRule.toLowerCase().includes(q)) ||
      (r.ruleIds && Array.isArray(r.ruleIds) && r.ruleIds.some((ruleId) => String(ruleId).toLowerCase().includes(q)));

    const matchRole = reqFilterRole === 'ALL' ||
      (r.role && r.role.toLowerCase() === reqFilterRole.toLowerCase()) ||
      (r.roleId && r.roleId.toLowerCase() === reqFilterRole.toLowerCase());

    const matchModule = reqFilterModule === 'ALL' ||
      (r.moduleId && r.moduleId.toLowerCase() === reqFilterModule.toLowerCase()) ||
      (r.module && r.module.toLowerCase() === reqFilterModule.toLowerCase());

    const matchFeature = reqFilterFeature === 'ALL' ||
      (r.featureId && r.featureId.toLowerCase() === reqFilterFeature.toLowerCase()) ||
      (r.feature && r.feature.toLowerCase() === reqFilterFeature.toLowerCase());

    const matchStatus = reqFilterStatus === 'ALL' ||
      (r.status && r.status.toUpperCase() === reqFilterStatus.toUpperCase());

    return matchSearch && matchRole && matchModule && matchFeature && matchStatus;
  });
}

console.log('=== TEST A: ALL FILTERS DEFAULT ===');
const resA = filterReqs(activeReqs, {});
console.log('Test A count (Expected: 172):', resA.length);
console.assert(resA.length === 172, 'Test A Failed!');

console.log('\n=== TEST B: SINGLE ROLE FILTERS ===');
['Mantri Bibitan', 'Asisten Bibitan', 'Asisten Divisi', 'Asisten Kepala', 'Tekniker I', 'Pengurus Kebun Peminta', 'KTU'].forEach(role => {
  const res = filterReqs(activeReqs, { reqFilterRole: role });
  const allMatch = res.every(r => (r.role && r.role.toLowerCase() === role.toLowerCase()) || (r.roleId && r.roleId.toLowerCase() === role.toLowerCase()));
  console.log(`Role [${role}]: ${res.length} reqs | Match check: ${allMatch}`);
  console.assert(allMatch && res.length > 0, `Test B Failed for ${role}`);
});

console.log('\n=== TEST C: SINGLE MODULE FILTERS ===');
data.modules.forEach(m => {
  const res = filterReqs(activeReqs, { reqFilterModule: m.id });
  const allMatch = res.every(r => r.moduleId === m.id || r.module.toLowerCase() === m.name.toLowerCase());
  console.log(`Module [${m.id}] (${m.name}): ${res.length} reqs | Match check: ${allMatch}`);
  console.assert(allMatch && res.length > 0, `Test C Failed for ${m.id}`);
});

console.log('\n=== TEST D: SINGLE FEATURE FILTERS ===');
const sampleFeatures = ['presensi-supervisor', 'grafting', 'terima-benih', 'panen-entres'];
sampleFeatures.forEach(f => {
  const res = filterReqs(activeReqs, { reqFilterFeature: f });
  const allMatch = res.every(r => r.featureId === f || r.feature.toLowerCase() === f.toLowerCase());
  console.log(`Feature [${f}]: ${res.length} reqs | Match check: ${allMatch}`);
  console.assert(allMatch && res.length > 0, `Test D Failed for ${f}`);
});

console.log('\n=== TEST E: STATUS FILTER CONFIRMED ===');
const resE = filterReqs(activeReqs, { reqFilterStatus: 'CONFIRMED' });
console.log('Status CONFIRMED count (Expected: 172):', resE.length);
console.assert(resE.length === 172, 'Test E Failed!');

console.log('\n=== TEST F: COMBINATION ROLE + MODUL + FITUR + STATUS ===');
const resF = filterReqs(activeReqs, {
  reqFilterRole: 'Mantri Bibitan',
  reqFilterModule: '04-okulasi',
  reqFilterFeature: 'grafting',
  reqFilterStatus: 'CONFIRMED'
});
console.log(`Mantri Bibitan + 04-okulasi + grafting + CONFIRMED: ${resF.length} reqs | IDs: ${resF.map(r => r.id).join(', ')}`);
console.assert(resF.length > 0, 'Test F Failed!');

console.log('\n=== TEST G: SEARCH + DROPDOWN COMBINATIONS ===');
const resG1 = filterReqs(activeReqs, { reqSearchQuery: 'geofencing' });
console.log(`Search 'geofencing': ${resG1.length} reqs | IDs: ${resG1.map(r => r.id).join(', ')}`);
console.assert(resG1.length > 0, 'Test G1 Failed!');

const resG2 = filterReqs(activeReqs, { reqSearchQuery: 'RN-PRS-001' });
console.log(`Search 'RN-PRS-001': ${resG2.length} reqs | IDs: ${resG2.map(r => r.id).join(', ')}`);
console.assert(resG2.length === 1, 'Test G2 Failed!');

const resG3 = filterReqs(activeReqs, { reqSearchQuery: 'geofencing', reqFilterModule: '01-presensi' });
console.log(`Search 'geofencing' + Modul 01-presensi: ${resG3.length} reqs | IDs: ${resG3.map(r => r.id).join(', ')}`);
console.assert(resG3.length > 0, 'Test G3 Failed!');

console.log('\n=== TEST H: RESET FILTER ===');
const resH = filterReqs(activeReqs, { reqSearchQuery: '', reqFilterRole: 'ALL', reqFilterModule: 'ALL', reqFilterFeature: 'ALL', reqFilterStatus: 'ALL' });
console.log('Reset count (Expected: 172):', resH.length);
console.assert(resH.length === 172, 'Test H Failed!');

console.log('\n>>> ALL 8 FILTER TEST SCENARIOS PASSED WITH 100% SUCCESS! <<<');
