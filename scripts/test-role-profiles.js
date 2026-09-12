/**
 * scripts/test-role-profiles.js
 * Automated Verification Suite for Role Profiles & Capability Registry (Phase 6).
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
  CANONICAL_ROLES,
  ROLE_PROFILES,
  getRoleProfile,
  getRoleCapabilities,
  getRoleDefaultScope,
  isCanonicalRole,
  getAllRoleProfiles
} from '../js/core/role-profiles.js';
import { ROLES, SCOPE_TYPES, resolveUserContext } from '../js/core/user-context.js';
import { permissions } from '../js/core/permissions.js';

console.log('=== STARTING ROLE PROFILE & CAPABILITY REGISTRY VERIFICATION (PHASE 6) ===\n');

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

// TEST 1: 7 canonical roles present
console.log('--- TEST 1: 7 Canonical Roles Inventory ---');
const canonicalKeys = Object.values(CANONICAL_ROLES);
assert(canonicalKeys.length === 7, `Canonical roles count is exactly 7 (actual: ${canonicalKeys.length})`);
assert(isCanonicalRole(ROLES.PENGURUS) === true, 'PENGURUS is canonical');
assert(isCanonicalRole(ROLES.ASKEP) === true, 'ASKEP is canonical');
assert(isCanonicalRole(ROLES.ASISTEN) === true, 'ASISTEN is canonical');
assert(isCanonicalRole(ROLES.ASISTEN_BIBITAN) === true, 'ASISTEN_BIBITAN is canonical');
assert(isCanonicalRole(ROLES.MANTRI_TANAMAN) === true, 'MANTRI_TANAMAN is canonical');
assert(isCanonicalRole(ROLES.TEKNIKER_I) === true, 'TEKNIKER_I is canonical');
assert(isCanonicalRole(ROLES.KTU) === true, 'KTU is canonical');
assert(isCanonicalRole(ROLES.PENGURUS_KEBUN_SEPUPU) === false, 'PENGURUS_KEBUN_SEPUPU is NOT a canonical role (legacy only)');

// TEST 2: Zero duplicate role keys
console.log('\n--- TEST 2: Duplicate Key Validation ---');
const profileKeys = Object.keys(ROLE_PROFILES);
const uniqueKeys = new Set(profileKeys);
assert(profileKeys.length === uniqueKeys.size, `No duplicate role keys in profiles (count: ${profileKeys.length})`);

// TEST 3: Profile Contract Check
console.log('\n--- TEST 3: Role Profile Schema Contract ---');
const allProfiles = getAllRoleProfiles();
assert(allProfiles.length === 7, `getAllRoleProfiles returns 7 profiles`);
allProfiles.forEach((p) => {
  assert(
    !!p.key && !!p.label && !!p.positionLabel && !!p.defaultScope && Array.isArray(p.capabilities) && !!p.status,
    `Profile '${p.key}' satisfies complete schema contract`
  );
});

// TEST 4 - 10: Default Scope Verification
console.log('\n--- TEST 4 - 10: Default Scope Verification ---');
assert(getRoleDefaultScope(ROLES.PENGURUS) === SCOPE_TYPES.ESTATE, 'TEST 4: PENGURUS defaultScope = ESTATE');
assert(getRoleDefaultScope(ROLES.ASKEP) === SCOPE_TYPES.ESTATE, 'TEST 5: ASKEP defaultScope = ESTATE');
assert(getRoleDefaultScope(ROLES.ASISTEN) === SCOPE_TYPES.DIVISION, 'TEST 6: ASISTEN defaultScope = DIVISION');
assert(getRoleDefaultScope(ROLES.ASISTEN_BIBITAN) === SCOPE_TYPES.DIVISION, 'TEST 7: ASISTEN_BIBITAN defaultScope = DIVISION');
assert(getRoleDefaultScope(ROLES.MANTRI_TANAMAN) === SCOPE_TYPES.DIVISION, 'TEST 8: MANTRI_TANAMAN defaultScope = DIVISION');
assert(getRoleDefaultScope(ROLES.TEKNIKER_I) === SCOPE_TYPES.ESTATE, 'TEST 9: TEKNIKER_I defaultScope = ESTATE');
assert(getRoleDefaultScope(ROLES.KTU) === SCOPE_TYPES.ESTATE, 'TEST 10: KTU defaultScope = ESTATE');

// TEST 11: PENGURUS Capabilities Baseline
console.log('\n--- TEST 11: PENGURUS Capabilities Baseline ---');
const pengurusCaps = getRoleCapabilities(ROLES.PENGURUS);
assert(pengurusCaps.includes('transaction:view'), 'PENGURUS has transaction:view');
assert(pengurusCaps.includes('transaction:view-submitted'), 'PENGURUS has transaction:view-submitted');
assert(pengurusCaps.includes('transaction:open-detail'), 'PENGURUS has transaction:open-detail');
assert(pengurusCaps.includes('transaction:approve'), 'PENGURUS has transaction:approve');
assert(pengurusCaps.includes('monitor:process'), 'PENGURUS has monitor:process');
assert(pengurusCaps.includes('approval:future'), 'PENGURUS has approval:future');

// TEST 12: MANTRI_TANAMAN Capabilities Baseline
console.log('\n--- TEST 12: MANTRI_TANAMAN Capabilities Baseline ---');
const mantriCaps = getRoleCapabilities(ROLES.MANTRI_TANAMAN);
assert(mantriCaps.includes('transaction:create'), 'MANTRI_TANAMAN has transaction:create');
assert(mantriCaps.includes('transaction:edit-before-submit'), 'MANTRI_TANAMAN has transaction:edit-before-submit');
assert(mantriCaps.includes('transaction:delete-before-submit'), 'MANTRI_TANAMAN has transaction:delete-before-submit');
assert(mantriCaps.includes('transaction:review-own'), 'MANTRI_TANAMAN has transaction:review-own');
assert(mantriCaps.includes('transaction:submit'), 'MANTRI_TANAMAN has transaction:submit');

// TEST 13: Legacy PENGURUS_KEBUN_SEPUPU resolution to PENGURUS profile
console.log('\n--- TEST 13: Legacy Role Resolution to Canonical Profile ---');
const legacyResolvedProfile = getRoleProfile(ROLES.PENGURUS_KEBUN_SEPUPU);
assert(legacyResolvedProfile !== null, 'getRoleProfile(PENGURUS_KEBUN_SEPUPU) resolves successfully');
assert(legacyResolvedProfile.key === ROLES.PENGURUS, 'Legacy role resolves to PENGURUS profile key');
assert(legacyResolvedProfile.positionLabel === 'Pengurus Kebun', 'Legacy role positionLabel resolves to Pengurus Kebun');
assert(legacyResolvedProfile.defaultScope === SCOPE_TYPES.ESTATE, 'Legacy role defaultScope resolves to ESTATE');

// TEST 14: resolveUserContext existing behavior remains unchanged
console.log('\n--- TEST 14: resolveUserContext Non-Regression Verification ---');
const mockUser = {
  id: 'PGS002',
  code: 'PGS002',
  name: 'Mukhsin Haji',
  role: 'PENGURUS_KEBUN_SEPUPU',
  divisionId: 'DIV-APM',
  divisionName: 'Aek Pamingke - All Division'
};
const resolved = resolveUserContext(mockUser);
assert(resolved.role === 'PENGURUS', 'Context role is normalized to PENGURUS');
assert(resolved.rawRole === 'PENGURUS_KEBUN_SEPUPU', 'Context rawRole remains PENGURUS_KEBUN_SEPUPU');
assert(resolved.position === 'Pengurus Kebun', 'Context position is Pengurus Kebun');
assert(resolved.estateName === 'Aek Pamingke', 'Context estateName is Aek Pamingke');
assert(resolved.scopeType === SCOPE_TYPES.ESTATE, 'Context scopeType is ESTATE');

console.log(`\n========================================`);
console.log(`ROLE PROFILES TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL 14 ROLE PROFILE TESTS PASSED SUCCESSFULLY!');
}
