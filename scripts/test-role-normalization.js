/**
 * scripts/test-role-normalization.js
 * Automated Verification Suite for Role Normalization (Phase 5).
 * Validates: PENGURUS_KEBUN_SEPUPU -> PENGURUS at normalized context level with rawRole preservation.
 */

// Mock localStorage for Node environment
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
  ROLES,
  SCOPE_TYPES,
  normalizeRole,
  resolveUserContext,
  getCurrentUserContext,
  isScopeEstate,
  isScopeDivision,
  hasScope
} from '../js/core/user-context.js';
import { permissions } from '../js/core/permissions.js';
import { session } from '../js/core/session.js';
import { getDemoPersonaByCode } from '../js/data/demo-personas.js';

console.log('=== STARTING ROLE NORMALIZATION VERIFICATION SUITE (PHASE 5) ===\n');

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

// TEST 1: Input Junaidi / PGS001
console.log('--- TEST 1: Junaidi (PGS001) Normalization ---');
const junaidiPersona = getDemoPersonaByCode('PGS001');
const junaidiCtx = resolveUserContext(junaidiPersona);
assert(junaidiCtx.role === 'PENGURUS', 'Junaidi normalized role is PENGURUS');
assert(junaidiCtx.rawRole === 'PENGURUS', 'Junaidi rawRole is PENGURUS');

// TEST 2: Input Mukhsin / PGS002
console.log('\n--- TEST 2: Mukhsin (PGS002) Normalization & rawRole Preservation ---');
const mukhsinPersona = getDemoPersonaByCode('PGS002');
// Simulate legacy input with raw role PENGURUS_KEBUN_SEPUPU
const mukhsinLegacyInput = {
  id: 'PGS002',
  code: 'PGS002',
  name: 'Mukhsin Haji',
  role: 'PENGURUS_KEBUN_SEPUPU',
  divisionId: 'DIV-APM',
  divisionName: 'Aek Pamingke - All Division'
};
const mukhsinCtx = resolveUserContext(mukhsinLegacyInput);
assert(mukhsinCtx.role === 'PENGURUS', 'Mukhsin normalized role is PENGURUS');
assert(mukhsinCtx.rawRole === 'PENGURUS_KEBUN_SEPUPU', 'Mukhsin rawRole is preserved as PENGURUS_KEBUN_SEPUPU');
assert(mukhsinCtx.legacyRole === 'PENGURUS_KEBUN_SEPUPU', 'Mukhsin legacyRole is PENGURUS_KEBUN_SEPUPU');

// TEST 3: Mukhsin Position
console.log('\n--- TEST 3: Mukhsin Position Resolution ---');
assert(mukhsinCtx.position === 'Pengurus Kebun', `Mukhsin position is 'Pengurus Kebun' (actual: '${mukhsinCtx.position}')`);

// TEST 4: Mukhsin Estate
console.log('\n--- TEST 4: Mukhsin Estate Resolution ---');
assert(mukhsinCtx.estateName === 'Aek Pamingke', `Mukhsin estateName is 'Aek Pamingke' (actual: '${mukhsinCtx.estateName}')`);
assert(mukhsinCtx.estateId === 'EST-APM' || mukhsinCtx.estateId === 'EST-003', `Mukhsin estateId is valid Aek Pamingke estate ID`);

// TEST 5: Mukhsin Scope
console.log('\n--- TEST 5: Mukhsin Scope Resolution ---');
assert(mukhsinCtx.scopeType === SCOPE_TYPES.ESTATE, 'Mukhsin scopeType is ESTATE');
assert(isScopeEstate(mukhsinCtx) === true, 'isScopeEstate(mukhsinCtx) is true');
assert(isScopeDivision(mukhsinCtx) === false, 'isScopeDivision(mukhsinCtx) is false');

// TEST 6: Junaidi Estate
console.log('\n--- TEST 6: Junaidi Estate Resolution ---');
assert(junaidiCtx.estateName === 'Tanah Besih', `Junaidi estateName is 'Tanah Besih' (actual: '${junaidiCtx.estateName}')`);
assert(junaidiCtx.estateId === 'EST-TBS' || junaidiCtx.estateId === 'EST-001', 'Junaidi estateId is valid Tanah Besih estate ID');

// TEST 7: Junaidi Scope
console.log('\n--- TEST 7: Junaidi Scope Resolution ---');
assert(junaidiCtx.scopeType === SCOPE_TYPES.ESTATE, 'Junaidi scopeType is ESTATE');
assert(isScopeEstate(junaidiCtx) === true, 'isScopeEstate(junaidiCtx) is true');

// TEST 8: Legacy Role Checks Compatibility
console.log('\n--- TEST 8: Legacy Role Constants & Check Compatibility ---');
assert(ROLES.PENGURUS_KEBUN_SEPUPU === 'PENGURUS_KEBUN_SEPUPU', 'ROLES.PENGURUS_KEBUN_SEPUPU constant remains defined');
assert(ROLES.PENGURUS === 'PENGURUS', 'ROLES.PENGURUS constant remains defined');
assert(ROLES.MANTRI_TANAMAN === 'MANTRI_TANAMAN', 'ROLES.MANTRI_TANAMAN constant remains defined');
assert(normalizeRole('PENGURUS_KEBUN_SEPUPU') === 'PENGURUS', 'normalizeRole maps PENGURUS_KEBUN_SEPUPU to PENGURUS');

// TEST 9: Permissions & Capabilities Compatibility
console.log('\n--- TEST 9: Permission & Capability Invariants ---');
assert(permissions.hasCapability('PENGURUS', 'transaction:view') === true, 'PENGURUS has transaction:view capability');
assert(permissions.hasCapability('PENGURUS_KEBUN_SEPUPU', 'transaction:view') === true, 'PENGURUS_KEBUN_SEPUPU has transaction:view capability');
assert(permissions.hasCapability('PENGURUS', 'approval:future') === true, 'PENGURUS has approval:future capability');
assert(permissions.hasCapability('PENGURUS_KEBUN_SEPUPU', 'approval:future') === true, 'PENGURUS_KEBUN_SEPUPU has approval:future capability');

// TEST 10: Request & Route Access Invariants
console.log('\n--- TEST 10: Request & Route Access Invariants ---');
// Set active session for Junaidi
session.start({
  userId: 'PGS001',
  code: 'PGS001',
  role: 'PENGURUS',
  name: 'Junaidi',
  position: 'Pengurus Kebun'
});
assert(permissions.canAccessRoute('/request') === true, 'Junaidi can access /request');
assert(permissions.canAccessRoute('/reception') === true, 'Junaidi can access /reception');

// Set active session for Mukhsin (legacy session role)
session.start({
  userId: 'PGS002',
  code: 'PGS002',
  role: 'PENGURUS_KEBUN_SEPUPU',
  name: 'Mukhsin Haji',
  position: 'Pengurus Kebun',
  divisionId: 'DIV-APM',
  divisionName: 'Aek Pamingke - All Division'
});
assert(permissions.canAccessRoute('/request') === true, 'Mukhsin can access /request');
assert(permissions.canAccessRoute('/reception') === true, 'Mukhsin can access /reception');

console.log(`\n========================================`);
console.log(`NORMALIZATION TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL 10 ROLE NORMALIZATION TESTS PASSED SUCCESSFULLY!');
}
