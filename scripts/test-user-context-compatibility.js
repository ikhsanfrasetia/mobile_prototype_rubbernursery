/**
 * scripts/test-user-context-compatibility.js
 * Automated Regression Test Suite for Role & User Context Compatibility Layer.
 */

import { ROLES, ROLE_LABELS, permissions } from '../js/core/permissions.js';
import {
  SCOPE_TYPES,
  ROLE_POSITION_MAP,
  ROLE_SCOPE_MAP,
  ROLE_NORMALIZATION_MAP,
  normalizeRole,
  resolveUserContext,
  getCurrentUserContext,
  isScopeEstate,
  isScopeDivision,
  hasScope
} from '../js/core/user-context.js';
import { DEMO_USERS } from '../js/data/demo-data.js';

console.log('=== STARTING AUTOMATED TEST SUITE: ROLE & USER CONTEXT COMPATIBILITY LAYER ===\n');

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

// TEST 1: PENGURUS (Junaidi)
console.log('--- TEST 1: PENGURUS Persona (Junaidi / PGS001) ---');
const junaidiRaw = DEMO_USERS.find(u => u.id === 'PGS001');
const junaidiCtx = resolveUserContext(junaidiRaw);
assert(junaidiCtx.role === 'PENGURUS', 'Normalized role is PENGURUS');
assert(junaidiCtx.rawRole === 'PENGURUS', 'Raw role is preserved as PENGURUS');
assert(junaidiCtx.position === 'Pengurus Kebun', 'Position resolves to Pengurus Kebun');
assert(junaidiCtx.scopeType === SCOPE_TYPES.ESTATE, 'Scope resolves to ESTATE');
assert(junaidiCtx.estateName === 'Tanah Besih', 'Estate resolves to Tanah Besih');
assert(isScopeEstate(junaidiCtx) === true, 'isScopeEstate returns true');
assert(isScopeDivision(junaidiCtx) === false, 'isScopeDivision returns false');

// TEST 2: MANTRI_TANAMAN (Wagiman)
console.log('\n--- TEST 2: MANTRI_TANAMAN Persona (Wagiman / MNT001) ---');
const wagimanRaw = DEMO_USERS.find(u => u.id === 'MNT001');
const wagimanCtx = resolveUserContext(wagimanRaw);
assert(wagimanCtx.role === 'MANTRI_TANAMAN', 'Normalized role is MANTRI_TANAMAN');
assert(wagimanCtx.rawRole === 'MANTRI_TANAMAN', 'Raw role is MANTRI_TANAMAN');
assert(wagimanCtx.position === 'Mantri Bibitan', 'Position is Mantri Bibitan');
assert(wagimanCtx.scopeType === SCOPE_TYPES.DIVISION, 'Scope resolves to DIVISION');
assert(isScopeDivision(wagimanCtx) === true, 'isScopeDivision returns true');
assert(isScopeEstate(wagimanCtx) === false, 'isScopeEstate returns false');

// TEST 3: PENGURUS_KEBUN_SEPUPU (Mukhsin Haji)
console.log('\n--- TEST 3: PENGURUS_KEBUN_SEPUPU Persona (Mukhsin Haji / PKS001) ---');
const mukhsinRaw = DEMO_USERS.find(u => u.id === 'PKS001');
const mukhsinCtx = resolveUserContext(mukhsinRaw);
assert(mukhsinRaw.role === 'PENGURUS_KEBUN_SEPUPU', 'Original raw user role is unchanged (PENGURUS_KEBUN_SEPUPU)');
assert(mukhsinCtx.role === 'PENGURUS', 'Normalized context role is PENGURUS');
assert(mukhsinCtx.rawRole === 'PENGURUS_KEBUN_SEPUPU', 'Preserved rawRole is PENGURUS_KEBUN_SEPUPU');
assert(mukhsinCtx.position === 'Pengurus Kebun' || mukhsinCtx.position === 'Pengurus Kebun Sepupu', 'Position resolved properly');
assert(mukhsinCtx.estateName === 'Aek Pamingke', 'Estate resolves to Aek Pamingke');
assert(mukhsinCtx.divisionId === 'DIV-APM', 'DivisionId resolves to DIV-APM');
assert(mukhsinCtx.scopeType === SCOPE_TYPES.ESTATE, 'Scope resolves to ESTATE');

// TEST 4: Minimal Legacy User (Fallback derivation)
console.log('\n--- TEST 4: Minimal Legacy User Fallback ---');
const legacyUser = {
  id: 'LEG-001',
  name: 'Old User',
  role: 'ASKEP'
};
const legacyCtx = resolveUserContext(legacyUser);
assert(legacyCtx.role === 'ASKEP', 'Normalized role is ASKEP');
assert(legacyCtx.position === 'Asisten Kepala', 'Position derived from role: Asisten Kepala');
assert(legacyCtx.scopeType === SCOPE_TYPES.ESTATE, 'Scope derived from role: ESTATE');
assert(legacyCtx.estateName === 'Tanah Besih', 'Default estate: Tanah Besih');
assert(legacyCtx.divisionId === 'DIV-001', 'Default division: DIV-001');

// TEST 5: Null / Undefined User Fallback
console.log('\n--- TEST 5: Null / Undefined Fallback ---');
const nullCtx = resolveUserContext(null);
assert(nullCtx.role === 'MANTRI_TANAMAN', 'Fallback default role is MANTRI_TANAMAN');
assert(nullCtx.name === 'Wagiman', 'Fallback default name is Wagiman');
assert(nullCtx.scopeType === SCOPE_TYPES.DIVISION, 'Fallback scope is DIVISION');

// TEST 6: Normalization Helper Verification
console.log('\n--- TEST 6: normalizeRole() Abstraction ---');
assert(normalizeRole('PENGURUS') === 'PENGURUS', 'normalizeRole(PENGURUS) === PENGURUS');
assert(normalizeRole('MANTRI_TANAMAN') === 'MANTRI_TANAMAN', 'normalizeRole(MANTRI_TANAMAN) === MANTRI_TANAMAN');
assert(normalizeRole('PENGURUS_KEBUN_SEPUPU') === 'PENGURUS', 'normalizeRole(PENGURUS_KEBUN_SEPUPU) === PENGURUS');
assert(normalizeRole('ASISTEN') === 'ASISTEN', 'normalizeRole(ASISTEN) === ASISTEN');
assert(normalizeRole('ASISTEN_BIBITAN') === 'ASISTEN_BIBITAN', 'normalizeRole(ASISTEN_BIBITAN) === ASISTEN_BIBITAN');
assert(normalizeRole('ASKEP') === 'ASKEP', 'normalizeRole(ASKEP) === ASKEP');
assert(normalizeRole('TEKNIKER_I') === 'TEKNIKER_I', 'normalizeRole(TEKNIKER_I) === TEKNIKER_I');
assert(normalizeRole('KTU') === 'KTU', 'normalizeRole(KTU) === KTU');

// TEST 7: Permissions and Capabilities Compatibility
console.log('\n--- TEST 7: Permissions & Capabilities Integrity ---');
assert(permissions.hasCapability(ROLES.MANTRI_TANAMAN, 'transaction:create') === true, 'Mantri has transaction:create');
assert(permissions.hasCapability(ROLES.PENGURUS, 'transaction:create') === false, 'Pengurus does not have direct transaction:create');
assert(permissions.hasCapability(ROLES.PENGURUS, 'transaction:view') === true, 'Pengurus has transaction:view');
assert(permissions.hasCapability(ROLES.PENGURUS_KEBUN_SEPUPU, 'transaction:view') === true, 'Pengurus Kebun Sepupu has transaction:view');
assert(permissions.isMantri(ROLES.MANTRI_TANAMAN) === true, 'permissions.isMantri(MANTRI_TANAMAN) === true');
assert(permissions.isMantri(ROLES.PENGURUS) === false, 'permissions.isMantri(PENGURUS) === false');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL REGRESSION TESTS PASSED SUCCESSFULLY!');
}
