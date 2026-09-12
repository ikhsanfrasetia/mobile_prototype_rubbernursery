/**
 * scripts/test-persona-registry.js
 * Automated Validation Suite for Demo Persona Registry (Phase 3).
 */

import {
  DEMO_PERSONAS,
  getDemoPersonas,
  getDemoPersonaByCode,
  getDemoPersonaById,
  getDemoPersonasByEstate,
  getDemoPersonasByRole
} from '../js/data/demo-personas.js';
import { ROLES, SCOPE_TYPES } from '../js/core/user-context.js';
import { DEMO_USERS } from '../js/data/demo-data.js';

console.log('=== STARTING DEMO PERSONA REGISTRY VALIDATION (PHASE 3) ===\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// 1. Total Personas
console.log('--- 1. Persona Count & Distribution ---');
assert(DEMO_PERSONAS.length === 14, `Total personas is exactly 14 (actual: ${DEMO_PERSONAS.length})`);

const tbsPersonas = getDemoPersonasByEstate('EST-TBS');
const apmPersonas = getDemoPersonasByEstate('EST-APM');
assert(tbsPersonas.length === 7, `Tanah Besih count is exactly 7 (actual: ${tbsPersonas.length})`);
assert(apmPersonas.length === 7, `Aek Pamingke count is exactly 7 (actual: ${apmPersonas.length})`);

// 2. Canonical Roles Distribution
console.log('\n--- 2. Role Coverage & Distribution ---');
const canonicalRoles = [
  ROLES.PENGURUS,
  ROLES.ASKEP,
  ROLES.ASISTEN,
  ROLES.ASISTEN_BIBITAN,
  ROLES.MANTRI_TANAMAN,
  ROLES.TEKNIKER_I,
  ROLES.KTU
];

canonicalRoles.forEach((role) => {
  const personasWithRole = getDemoPersonasByRole(role);
  assert(
    personasWithRole.length === 2,
    `Role '${role}' has exactly 2 personas across estates (actual: ${personasWithRole.length})`
  );
  const inTBS = personasWithRole.some((p) => p.estateId === 'EST-TBS');
  const inAPM = personasWithRole.some((p) => p.estateId === 'EST-APM');
  assert(inTBS && inAPM, `Role '${role}' is present in both EST-TBS and EST-APM`);
});

// 3. Uniqueness Check
console.log('\n--- 3. Uniqueness Constraints ---');
const codes = DEMO_PERSONAS.map((p) => p.code);
const uniqueCodes = new Set(codes);
assert(codes.length === uniqueCodes.size, `All login codes are unique (14 codes)`);

const ids = DEMO_PERSONAS.map((p) => p.id);
const uniqueIds = new Set(ids);
assert(ids.length === uniqueIds.size, `All persona IDs are unique (14 IDs)`);

// 4. Exact Persona Names Check
console.log('\n--- 4. Persona Identity & Naming Verification ---');
const expectedTBS = [
  { code: 'PGS001', name: 'Junaidi', role: ROLES.PENGURUS, pos: 'Pengurus Kebun', scope: SCOPE_TYPES.ESTATE },
  { code: 'ASK001', name: 'Beny Sihotang', role: ROLES.ASKEP, pos: 'Asisten Kepala', scope: SCOPE_TYPES.ESTATE },
  { code: 'AST002', name: 'Rahmad', role: ROLES.ASISTEN, pos: 'Asisten Lapangan', scope: SCOPE_TYPES.DIVISION },
  { code: 'ASB001', name: 'Annisa', role: ROLES.ASISTEN_BIBITAN, pos: 'Asisten Pembibitan', scope: SCOPE_TYPES.DIVISION },
  { code: 'MNT001', name: 'Wagiman', role: ROLES.MANTRI_TANAMAN, pos: 'Mantri Bibitan', scope: SCOPE_TYPES.DIVISION },
  { code: 'TKI001', name: 'Marihot', role: ROLES.TEKNIKER_I, pos: 'Tekniker I', scope: SCOPE_TYPES.ESTATE },
  { code: 'KTU001', name: 'Kusnadi', role: ROLES.KTU, pos: 'Kepala Tata Usaha', scope: SCOPE_TYPES.ESTATE }
];

expectedTBS.forEach((exp) => {
  const p = getDemoPersonaByCode(exp.code);
  assert(!!p, `Tanah Besih Persona ${exp.code} found`);
  if (p) {
    assert(p.name === exp.name, `[${exp.code}] Name is '${exp.name}'`);
    assert(p.role === exp.role, `[${exp.code}] Role is '${exp.role}'`);
    assert(p.position === exp.pos, `[${exp.code}] Position is '${exp.pos}'`);
    assert(p.scopeType === exp.scope, `[${exp.code}] Scope is '${exp.scope}'`);
    assert(p.estateId === 'EST-TBS', `[${exp.code}] EstateId is 'EST-TBS'`);
  }
});

const expectedAPM = [
  { code: 'PGS002', name: 'Mukhsin Haji', role: ROLES.PENGURUS, pos: 'Pengurus Kebun', scope: SCOPE_TYPES.ESTATE },
  { code: 'ASK002', name: 'Dadin', role: ROLES.ASKEP, pos: 'Asisten Kepala', scope: SCOPE_TYPES.ESTATE },
  { code: 'AST001', name: 'Nando', role: ROLES.ASISTEN, pos: 'Asisten Lapangan', scope: SCOPE_TYPES.DIVISION },
  { code: 'ASB002', name: 'Abdul Gofur', role: ROLES.ASISTEN_BIBITAN, pos: 'Asisten Pembibitan', scope: SCOPE_TYPES.DIVISION },
  { code: 'MNT002', name: 'Supriono', role: ROLES.MANTRI_TANAMAN, pos: 'Mantri Bibitan', scope: SCOPE_TYPES.DIVISION },
  { code: 'TKI002', name: 'Dedek', role: ROLES.TEKNIKER_I, pos: 'Tekniker I', scope: SCOPE_TYPES.ESTATE },
  { code: 'KTU002', name: 'Dedi Sugiarto', role: ROLES.KTU, pos: 'Kepala Tata Usaha', scope: SCOPE_TYPES.ESTATE }
];

expectedAPM.forEach((exp) => {
  const p = getDemoPersonaByCode(exp.code);
  assert(!!p, `Aek Pamingke Persona ${exp.code} found`);
  if (p) {
    assert(p.name === exp.name, `[${exp.code}] Name is '${exp.name}'`);
    assert(p.role === exp.role, `[${exp.code}] Role is '${exp.role}'`);
    assert(p.position === exp.pos, `[${exp.code}] Position is '${exp.pos}'`);
    assert(p.scopeType === exp.scope, `[${exp.code}] Scope is '${exp.scope}'`);
    assert(p.estateId === 'EST-APM', `[${exp.code}] EstateId is 'EST-APM'`);
  }
});

// 5. Query Helpers Verification
console.log('\n--- 5. Registry Helper API Verification ---');
assert(getDemoPersonas().length === 14, 'getDemoPersonas() returns copy of all 14 personas');
assert(getDemoPersonaById('TBS-PGS-001')?.name === 'Junaidi', 'getDemoPersonaById(TBS-PGS-001) resolves to Junaidi');
assert(getDemoPersonaById('APM-PGS-002')?.name === 'Mukhsin Haji', 'getDemoPersonaById(APM-PGS-002) resolves to Mukhsin Haji');
assert(getDemoPersonaByCode('NON_EXISTENT') === null, 'getDemoPersonaByCode(NON_EXISTENT) returns null safely');
assert(getDemoPersonasByEstate('NON_EXISTENT').length === 0, 'getDemoPersonasByEstate(NON_EXISTENT) returns empty array');

// 6. Existing DEMO_USERS backward compatibility check
console.log('\n--- 6. Backward Compatibility: DEMO_USERS Unchanged ---');
assert(DEMO_USERS.length >= 8, `Existing DEMO_USERS array is preserved (length: ${DEMO_USERS.length})`);
assert(DEMO_USERS.some((u) => u.id === 'MNT001' && u.name === 'Wagiman'), 'Existing Wagiman / MNT001 preserved');
assert(DEMO_USERS.some((u) => u.id === 'PKS001' && u.name === 'Mukhsin Haji'), 'Existing Mukhsin Haji / PKS001 preserved');

// 7. Render Role x Estate Matrix Table
console.log('\n--- 7. Role × Estate Matrix ---');
const matrix = [
  ['Estate', 'PENGURUS', 'ASKEP', 'ASISTEN', 'ASISTEN_BIBITAN', 'MANTRI_TANAMAN', 'TEKNIKER_I', 'KTU'],
  [
    'Tanah Besih',
    getDemoPersonaByCode('PGS001').name,
    getDemoPersonaByCode('ASK001').name,
    getDemoPersonaByCode('AST002').name,
    getDemoPersonaByCode('ASB001').name,
    getDemoPersonaByCode('MNT001').name,
    getDemoPersonaByCode('TKI001').name,
    getDemoPersonaByCode('KTU001').name
  ],
  [
    'Aek Pamingke',
    getDemoPersonaByCode('PGS002').name,
    getDemoPersonaByCode('ASK002').name,
    getDemoPersonaByCode('AST001').name,
    getDemoPersonaByCode('ASB002').name,
    getDemoPersonaByCode('MNT002').name,
    getDemoPersonaByCode('TKI002').name,
    getDemoPersonaByCode('KTU002').name
  ]
];

console.log('\n| ' + matrix[0].join(' | ') + ' |');
console.log('|' + matrix[0].map(() => '---|').join(''));
console.log('| ' + matrix[1].join(' | ') + ' |');
console.log('| ' + matrix[2].join(' | ') + ' |\n');

console.log(`========================================`);
console.log(`PERSONA VALIDATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PERSONA REGISTRY VALIDATIONS PASSED!');
}
