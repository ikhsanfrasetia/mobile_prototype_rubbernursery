/**
 * scripts/test-persona-switcher.js
 * Automated Verification Suite for Persona Switcher & Legacy Session Compatibility (Phase 4).
 */

// Mock localStorage for Node.js test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
}

import {
  DEMO_PERSONAS,
  getDemoPersonas,
  getDemoPersonaByCode,
  getDemoPersonasByEstate
} from '../js/data/demo-personas.js';
import { session } from '../js/core/session.js';
import { getCurrentUserContext, resolveUserContext, ROLES, SCOPE_TYPES } from '../js/core/user-context.js';
import { permissions } from '../js/core/permissions.js';

console.log('=== STARTING PERSONA SWITCHER VERIFICATION SUITE (PHASE 4) ===\n');

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

// TEST 1: Get all personas
console.log('--- TEST 1: Persona Count in Registry ---');
const personas = getDemoPersonas();
assert(personas.length === 14, `Total personas is 14 (actual: ${personas.length})`);

// TEST 2: Tanah Besih count
console.log('\n--- TEST 2: Tanah Besih Persona Count ---');
const tbs = getDemoPersonasByEstate('EST-TBS');
assert(tbs.length === 7, `Tanah Besih personas count is 7 (actual: ${tbs.length})`);

// TEST 3: Aek Pamingke count
console.log('\n--- TEST 3: Aek Pamingke Persona Count ---');
const apm = getDemoPersonasByEstate('EST-APM');
assert(apm.length === 7, `Aek Pamingke personas count is 7 (actual: ${apm.length})`);

// Helper to simulate switching in the same manner as drawer.js
function simulatePersonaSwitch(code) {
  const targetPersona = getDemoPersonaByCode(code);
  if (!targetPersona) throw new Error(`Persona not found: ${code}`);

  const sessionRole = targetPersona.code === 'PGS002' ? 'PENGURUS_KEBUN_SEPUPU' : targetPersona.role;

  return session.start({
    userId: targetPersona.code,
    code: targetPersona.code,
    role: sessionRole,
    name: targetPersona.name,
    position: targetPersona.position,
    estateId: targetPersona.estateId,
    estateName: targetPersona.estateName,
    divisionId: targetPersona.divisionId,
    divisionName: targetPersona.divisionName,
    scopeType: targetPersona.scopeType,
    isDemoSession: true
  });
}

// TEST 4: Switch to Junaidi
console.log('\n--- TEST 4: Switch to Junaidi (PGS001 - Tanah Besih) ---');
simulatePersonaSwitch('PGS001');
const junaidiSess = session.get();
const junaidiCtx = getCurrentUserContext();
assert(junaidiSess.userId === 'PGS001', 'Session userId is PGS001');
assert(junaidiSess.role === 'PENGURUS', 'Session role is PENGURUS');
assert(junaidiCtx.role === 'PENGURUS', 'Context role is PENGURUS');
assert(junaidiCtx.position === 'Pengurus Kebun', 'Context position is Pengurus Kebun');
assert(junaidiCtx.estateName === 'Tanah Besih', 'Context estate is Tanah Besih');
assert(junaidiCtx.scopeType === SCOPE_TYPES.ESTATE, 'Context scope is ESTATE');
assert(permissions.canAccessRoute('/request') === true, 'Pengurus can access /request');

// TEST 5: Switch to Wagiman
console.log('\n--- TEST 5: Switch to Wagiman (MNT001 - Tanah Besih) ---');
simulatePersonaSwitch('MNT001');
const wagimanSess = session.get();
const wagimanCtx = getCurrentUserContext();
assert(wagimanSess.userId === 'MNT001', 'Session userId is MNT001');
assert(wagimanSess.role === 'MANTRI_TANAMAN', 'Session role is MANTRI_TANAMAN');
assert(wagimanCtx.role === 'MANTRI_TANAMAN', 'Context role is MANTRI_TANAMAN');
assert(wagimanCtx.position === 'Mantri Bibitan', 'Context position is Mantri Bibitan');
assert(wagimanCtx.divisionName === 'Divisi I', 'Context division is Divisi I');
assert(wagimanCtx.scopeType === SCOPE_TYPES.DIVISION, 'Context scope is DIVISION');
assert(permissions.isMantri(wagimanSess.role) === true, 'permissions.isMantri(Wagiman) === true');

// TEST 6: Switch to Mukhsin Haji
console.log('\n--- TEST 6: Switch to Mukhsin Haji (PGS002 - Aek Pamingke) ---');
simulatePersonaSwitch('PGS002');
const mukhsinSess = session.get();
const mukhsinCtx = getCurrentUserContext();
assert(mukhsinSess.userId === 'PGS002', 'Session userId is PGS002');
assert(mukhsinSess.name === 'Mukhsin Haji', 'Session name is Mukhsin Haji');
assert(mukhsinSess.role === 'PENGURUS_KEBUN_SEPUPU', 'Session role preserves legacy PENGURUS_KEBUN_SEPUPU for compatibility');
assert(mukhsinCtx.role === 'PENGURUS', 'Normalized Context role is PENGURUS');
assert(mukhsinCtx.rawRole === 'PENGURUS_KEBUN_SEPUPU', 'Context rawRole is PENGURUS_KEBUN_SEPUPU');
assert(mukhsinCtx.estateName === 'Aek Pamingke', 'Context estate is Aek Pamingke');
assert(mukhsinCtx.scopeType === SCOPE_TYPES.ESTATE, 'Context scope is ESTATE');

// TEST 7: Switch to Nando
console.log('\n--- TEST 7: Switch to Nando (AST001 - Aek Pamingke) ---');
simulatePersonaSwitch('AST001');
const nandoSess = session.get();
const nandoCtx = getCurrentUserContext();
assert(nandoSess.userId === 'AST001', 'Session userId is AST001');
assert(nandoSess.name === 'Nando', 'Session name is Nando');
assert(nandoSess.role === 'ASISTEN', 'Session role is ASISTEN');
assert(nandoCtx.estateName === 'Aek Pamingke', 'Context estate is Aek Pamingke');
assert(nandoCtx.scopeType === SCOPE_TYPES.DIVISION, 'Context scope is DIVISION');

// TEST 8: Switch to Abdul Gofur
console.log('\n--- TEST 8: Switch to Abdul Gofur (ASB002 - Aek Pamingke) ---');
simulatePersonaSwitch('ASB002');
const abdulSess = session.get();
const abdulCtx = getCurrentUserContext();
assert(abdulSess.name === 'Abdul Gofur', 'Session name is Abdul Gofur');
assert(abdulSess.role === 'ASISTEN_BIBITAN', 'Session role is ASISTEN_BIBITAN');
assert(abdulCtx.estateName === 'Aek Pamingke', 'Context estate is Aek Pamingke');

// TEST 9: Switch to Supriono
console.log('\n--- TEST 9: Switch to Supriono (MNT002 - Aek Pamingke) ---');
simulatePersonaSwitch('MNT002');
const suprionoSess = session.get();
const suprionoCtx = getCurrentUserContext();
assert(suprionoSess.name === 'Supriono', 'Session name is Supriono');
assert(suprionoSess.role === 'MANTRI_TANAMAN', 'Session role is MANTRI_TANAMAN');
assert(suprionoCtx.estateName === 'Aek Pamingke', 'Context estate is Aek Pamingke');
assert(suprionoCtx.scopeType === SCOPE_TYPES.DIVISION, 'Context scope is DIVISION');

// TEST 10: Switch back to Junaidi
console.log('\n--- TEST 10: Switch back to Junaidi (PGS001 - Tanah Besih) ---');
simulatePersonaSwitch('PGS001');
const junaidiFinalSess = session.get();
const junaidiFinalCtx = getCurrentUserContext();
assert(junaidiFinalSess.name === 'Junaidi', 'Session name returned to Junaidi');
assert(junaidiFinalSess.role === 'PENGURUS', 'Session role returned to PENGURUS');
assert(junaidiFinalCtx.estateName === 'Tanah Besih', 'Context estate returned to Tanah Besih');

console.log(`\n========================================`);
console.log(`SWITCHER TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PERSONA SWITCHER TESTS PASSED SUCCESSFULLY!');
}
