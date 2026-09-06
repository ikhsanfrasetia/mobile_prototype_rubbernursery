import assert from 'node:assert';
import fs from 'node:fs';

const store = JSON.parse(fs.readFileSync('./data/process-mapping-data.json', 'utf8'));

console.log('--- TEST SUITE: ROLE -> MODULE SCOPING VALIDATION ---');

function getRoleScopedData(roleId, store) {
  const roleObj = (store.roles || []).find((r) => r.id === roleId) || (store.roles && store.roles[0]) || { id: 'mantri-bibitan', name: 'Mantri Bibitan' };
  const allReqs = (store.requirements || []).filter((r) => !r.isArchived && !r.isSuperseded);

  if (roleObj.id === 'mantri-bibitan') {
    return {
      roleObj,
      roleModules: store.modules || [],
      roleRequirements: allReqs,
      hasData: true
    };
  }

  const roleReqs = allReqs.filter((r) => {
    const rRole = (r.role || '').toLowerCase();
    const roId = roleObj.id.toLowerCase();
    const roName = (roleObj.name || '').toLowerCase();
    return rRole === roId || rRole === roName || (roleObj.id === 'pengurus' && rRole.includes('pengurus'));
  });

  if (roleReqs.length === 0) {
    return {
      roleObj,
      roleModules: [],
      roleRequirements: [],
      hasData: false
    };
  }

  const moduleKeys = new Set(roleReqs.map((r) => r.moduleId || r.module));
  const roleModules = (store.modules || []).filter((m) => moduleKeys.has(m.id) || moduleKeys.has(m.name));

  return {
    roleObj,
    roleModules,
    roleRequirements: roleReqs,
    hasData: roleModules.length > 0
  };
}

// 1. Validate all 7 roles mapping
const expectedRoles = [
  { id: 'mantri-bibitan', name: 'Mantri Bibitan', modCount: 11, reqCount: 165, hasData: true },
  { id: 'asisten-bibitan', name: 'Asisten Bibitan', modCount: 5, reqCount: 8, hasData: true },
  { id: 'asisten-divisi', name: 'Asisten Divisi', modCount: 1, reqCount: 3, hasData: true },
  { id: 'asisten-kepala', name: 'Asisten Kepala', modCount: 1, reqCount: 6, hasData: true },
  { id: 'pengurus', name: 'Pengurus', modCount: 1, reqCount: 6, hasData: true },
  { id: 'tekniker-1', name: 'Tekniker I', modCount: 0, reqCount: 0, hasData: false },
  { id: 'ktu', name: 'KTU', modCount: 0, reqCount: 0, hasData: false }
];

expectedRoles.forEach((exp) => {
  const scoped = getRoleScopedData(exp.id, store);
  assert.strictEqual(scoped.roleObj.name, exp.name, `Role name match for ${exp.id}`);
  assert.strictEqual(scoped.roleModules.length, exp.modCount, `Module count match for ${exp.id}`);
  assert.strictEqual(scoped.roleRequirements.length, exp.reqCount, `Req count match for ${exp.id}`);
  assert.strictEqual(scoped.hasData, exp.hasData, `hasData match for ${exp.id}`);
  console.log(`PASS: Role ${exp.id} -> ${scoped.roleModules.length} modules, ${scoped.roleRequirements.length} reqs, hasData=${scoped.hasData}`);
});

// 2. Validate Specific Module IDs per role
const asistenBibitanScoped = getRoleScopedData('asisten-bibitan', store);
const asistenBibitanModIds = asistenBibitanScoped.roleModules.map((m) => m.id);
assert.deepStrictEqual(asistenBibitanModIds, ['02-penerimaan', '04-okulasi', '06-penyeleksian', '08-panen-mata-entres', '11-pengeluaran']);
console.log('PASS: Asisten Bibitan modules exact list verified:', asistenBibitanModIds.join(', '));

const asistenDivisiScoped = getRoleScopedData('asisten-divisi', store);
assert.deepStrictEqual(asistenDivisiScoped.roleModules.map((m) => m.id), ['02-penerimaan']);
console.log('PASS: Asisten Divisi module exact list verified: 02-penerimaan');

const asistenKepalaScoped = getRoleScopedData('asisten-kepala', store);
assert.deepStrictEqual(asistenKepalaScoped.roleModules.map((m) => m.id), ['02-penerimaan']);
console.log('PASS: Asisten Kepala module exact list verified: 02-penerimaan');

const pengurusScoped = getRoleScopedData('pengurus', store);
assert.deepStrictEqual(pengurusScoped.roleModules.map((m) => m.id), ['02-penerimaan']);
console.log('PASS: Pengurus module exact list verified: 02-penerimaan');

// 3. Validate Module-Specific Content for Asisten Bibitan on 04-okulasi
const oklMod = asistenBibitanScoped.roleModules.find(m => m.id === '04-okulasi');
const oklReqs = asistenBibitanScoped.roleRequirements.filter(r => r.moduleId === oklMod.id || r.module === oklMod.name);
assert.strictEqual(oklReqs.length, 2);
assert.deepStrictEqual(oklReqs.map(r => r.id), ['RN-OKL-013', 'RN-REG-009']);
console.log('PASS: Asisten Bibitan on 04-okulasi has exactly 2 reqs (RN-OKL-013, RN-REG-009)');

console.log('\n--- ALL ROLE -> MODULE SCOPE UNIT TESTS PASSED (100%) ---');
