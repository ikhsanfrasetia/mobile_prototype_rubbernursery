/**
 * scripts/test-role-menu-mapping.js
 * Automated Verification Suite for Role Menu Mapping & Validation (Phase 8A).
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
  ACTIONS,
  IMPLEMENTATION_STATUS,
  REQUIREMENT_SOURCE,
  MENU_REGISTRY,
  SUBMENU_REGISTRY,
  FEATURE_REGISTRY,
  getMenusByRole,
  getSubmenusByMenu,
  getFeaturesByRole,
  getFeaturesByMenu,
  getFeature,
  getFeatureActions,
  isFeatureExisting
} from '../js/core/menu-registry.js';
import {
  CANONICAL_ROLES,
  ROLE_PROFILES,
  getRoleProfile,
  isCanonicalRole
} from '../js/core/role-profiles.js';
import { ROLES, SCOPE_TYPES, normalizeRole } from '../js/core/user-context.js';
import {
  createTransactionActorSnapshot,
  applyTransactionActor,
  AUDIT_EVENT_TYPES
} from '../js/core/transaction-actor.js';
import { permissions } from '../js/core/permissions.js';

console.log('=== STARTING ROLE MENU MAPPING & VALIDATION SUITE (PHASE 8A) ===\n');

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

// TEST 1: 7 canonical roles are defined
console.log('--- TEST 1: 7 Canonical Roles Availability ---');
const canonicalRoleList = Object.values(CANONICAL_ROLES);
assert(canonicalRoleList.length === 7, `Canonical roles count is exactly 7 (actual: ${canonicalRoleList.length})`);
assert(isCanonicalRole(ROLES.PENGURUS), 'PENGURUS is canonical');
assert(isCanonicalRole(ROLES.ASKEP), 'ASKEP is canonical');
assert(isCanonicalRole(ROLES.ASISTEN), 'ASISTEN is canonical');
assert(isCanonicalRole(ROLES.ASISTEN_BIBITAN), 'ASISTEN_BIBITAN is canonical');
assert(isCanonicalRole(ROLES.MANTRI_TANAMAN), 'MANTRI_TANAMAN is canonical');
assert(isCanonicalRole(ROLES.TEKNIKER_I), 'TEKNIKER_I is canonical');
assert(isCanonicalRole(ROLES.KTU), 'KTU is canonical');

// TEST 2: Every canonical role has at least 1 menu and 1 feature mapped
console.log('\n--- TEST 2: Role Menu & Feature Mapping Coverage ---');
canonicalRoleList.forEach((roleKey) => {
  const menus = getMenusByRole(roleKey);
  const features = getFeaturesByRole(roleKey);
  assert(menus.length > 0, `Role [${roleKey}] has ${menus.length} menus mapped`);
  assert(features.length > 0, `Role [${roleKey}] has ${features.length} features mapped`);
});

// TEST 3: No duplicate menu keys or IDs
console.log('\n--- TEST 3: No Duplicate Menus ---');
const menuKeys = MENU_REGISTRY.map((m) => m.key);
const uniqueMenuKeys = new Set(menuKeys);
assert(menuKeys.length === uniqueMenuKeys.size, `All ${menuKeys.length} menu keys are distinct`);

// TEST 4: No duplicate submenu keys or IDs
console.log('\n--- TEST 4: No Duplicate Submenus ---');
const submenuKeys = SUBMENU_REGISTRY.map((s) => s.key);
const uniqueSubmenuKeys = new Set(submenuKeys);
assert(submenuKeys.length === uniqueSubmenuKeys.size, `All ${submenuKeys.length} submenu keys are distinct`);

// TEST 5: No duplicate feature keys or IDs
console.log('\n--- TEST 5: No Duplicate Features ---');
const featureKeys = FEATURE_REGISTRY.map((f) => f.key);
const uniqueFeatureKeys = new Set(featureKeys);
assert(featureKeys.length === uniqueFeatureKeys.size, `All ${featureKeys.length} feature keys are distinct`);

// TEST 6: No orphan submenus (every submenu belongs to a valid parent menu)
console.log('\n--- TEST 6: Submenu Referential Integrity (No Orphans) ---');
let orphanSubmenus = 0;
SUBMENU_REGISTRY.forEach((sub) => {
  const parentMenu = MENU_REGISTRY.find((m) => m.key === sub.menuKey);
  if (!parentMenu) orphanSubmenus++;
});
assert(orphanSubmenus === 0, `All ${SUBMENU_REGISTRY.length} submenus have valid parent menus`);

// TEST 7: No orphan features (every feature belongs to a valid parent submenu)
console.log('\n--- TEST 7: Feature Referential Integrity (No Orphans) ---');
let orphanFeatures = 0;
FEATURE_REGISTRY.forEach((feat) => {
  const parentSubmenu = SUBMENU_REGISTRY.find((s) => s.key === feat.submenuKey);
  if (!parentSubmenu) orphanFeatures++;
});
assert(orphanFeatures === 0, `All ${FEATURE_REGISTRY.length} features have valid parent submenus`);

// TEST 8: All actions are canonical
console.log('\n--- TEST 8: Canonical Action Vocabulary Integrity ---');
const canonicalActionSet = new Set(Object.values(ACTIONS));
let allActionsCanonical = true;
FEATURE_REGISTRY.forEach((feat) => {
  feat.actionKeys.forEach((act) => {
    if (!canonicalActionSet.has(act)) {
      allActionsCanonical = false;
      assert(false, `Feature [${feat.key}] references non-canonical action [${act}]`);
    }
  });
});
if (allActionsCanonical) {
  assert(true, 'All feature action keys adhere strictly to canonical ACTIONS vocabulary');
}

// TEST 9: Every feature defines valid implementation status
console.log('\n--- TEST 9: Implementation Status Integrity ---');
const validStatusSet = new Set(Object.values(IMPLEMENTATION_STATUS));
let allStatusValid = true;
FEATURE_REGISTRY.forEach((feat) => {
  if (!validStatusSet.has(feat.implementationStatus)) {
    allStatusValid = false;
    assert(false, `Feature [${feat.key}] has invalid status [${feat.implementationStatus}]`);
  }
});
if (allStatusValid) {
  assert(true, `All ${FEATURE_REGISTRY.length} features have valid implementation status definitions`);
}

// TEST 10: Every feature defines valid requirement source
console.log('\n--- TEST 10: Requirement Source Traceability ---');
const validSourceSet = new Set(Object.values(REQUIREMENT_SOURCE));
let allSourcesValid = true;
FEATURE_REGISTRY.forEach((feat) => {
  if (!validSourceSet.has(feat.requirementSource)) {
    allSourcesValid = false;
    assert(false, `Feature [${feat.key}] has invalid requirement source [${feat.requirementSource}]`);
  }
});
if (allSourcesValid) {
  assert(true, `All ${FEATURE_REGISTRY.length} features define valid requirement sources`);
}

// TEST 11: PENGURUS baseline mapping
console.log('\n--- TEST 11: PENGURUS Baseline Mapping Validation ---');
const pengurusMenus = getMenusByRole(ROLES.PENGURUS).map((m) => m.key);
assert(pengurusMenus.includes('PENERIMAAN'), 'PENGURUS has PENERIMAAN menu');
assert(pengurusMenus.includes('PERMINTAAN'), 'PENGURUS has PERMINTAAN menu');
assert(pengurusMenus.includes('PENGIRIMAN'), 'PENGURUS has PENGIRIMAN menu');
assert(pengurusMenus.includes('REVIEW_WORKSPACE'), 'PENGURUS has REVIEW_WORKSPACE menu');
assert(pengurusMenus.includes('RIWAYAT_DATA'), 'PENGURUS has RIWAYAT_DATA menu');

// TEST 12: MANTRI_TANAMAN baseline mapping
console.log('\n--- TEST 12: MANTRI_TANAMAN Baseline Mapping Validation ---');
const mantriMenus = getMenusByRole(ROLES.MANTRI_TANAMAN).map((m) => m.key);
assert(mantriMenus.includes('PRESENSI'), 'MANTRI has PRESENSI menu');
assert(mantriMenus.includes('PENYEMAIAN'), 'MANTRI has PENYEMAIAN menu');
assert(mantriMenus.includes('OKULASI'), 'MANTRI has OKULASI menu');
assert(mantriMenus.includes('PEMERIKSAAN'), 'MANTRI has PEMERIKSAAN menu');
assert(mantriMenus.includes('PENYELEKSIAN'), 'MANTRI has PENYELEKSIAN menu');
assert(mantriMenus.includes('KEBUN_ENTRES'), 'MANTRI has KEBUN_ENTRES menu');
assert(mantriMenus.includes('KEGIATAN_BIBITAN'), 'MANTRI has KEGIATAN_BIBITAN menu');

// TEST 13: Legacy role PENGURUS_KEBUN_SEPUPU resolution
console.log('\n--- TEST 13: Legacy Role Resolution to PENGURUS Mapping ---');
const legacyMappedMenus = getMenusByRole(ROLES.PENGURUS_KEBUN_SEPUPU);
const canonicalPengurusMappedMenus = getMenusByRole(ROLES.PENGURUS);
assert(legacyMappedMenus.length === canonicalPengurusMappedMenus.length, 'Legacy role resolves same menu length as PENGURUS');
assert(
  JSON.stringify(legacyMappedMenus.map((m) => m.key)) === JSON.stringify(canonicalPengurusMappedMenus.map((m) => m.key)),
  'Legacy role resolves identical menu keys to PENGURUS'
);

// TEST 14: Scope integrity (ESTATE vs DIVISION)
console.log('\n--- TEST 14: Scope Contract Integrity ---');
const validScopes = new Set(Object.values(SCOPE_TYPES));
let allScopesValid = true;
FEATURE_REGISTRY.forEach((feat) => {
  if (!validScopes.has(feat.expectedScope)) {
    allScopesValid = false;
    assert(false, `Feature [${feat.key}] has invalid scope [${feat.expectedScope}]`);
  }
});
if (allScopesValid) {
  assert(true, 'All features conform to canonical SCOPE_TYPES (ESTATE or DIVISION)');
}

// TEST 15: Estate Independence (No estate hardcoding)
console.log('\n--- TEST 15: Estate Independence Verification ---');
const forbiddenKeywords = ['TBS', 'APM', 'TANAH_BESIH', 'AEK_PAMINGKE'];
let estateFree = true;
MENU_REGISTRY.forEach((m) => {
  forbiddenKeywords.forEach((kw) => {
    if (m.key.includes(kw)) estateFree = false;
  });
});
FEATURE_REGISTRY.forEach((f) => {
  forbiddenKeywords.forEach((kw) => {
    if (f.key.includes(kw)) estateFree = false;
  });
});
assert(estateFree, 'Menu and feature keys are completely independent of specific estate identifiers');

// TEST 16: Transactional features have actor requirement
console.log('\n--- TEST 16: Transactional Features Actor Identity Requirement ---');
const transactionalFeatures = FEATURE_REGISTRY.filter((f) =>
  f.actionKeys.some((act) => [ACTIONS.CREATE, ACTIONS.SUBMIT, ACTIONS.APPROVE, ACTIONS.REVIEW].includes(act))
);
assert(transactionalFeatures.length > 0, `Identified ${transactionalFeatures.length} transactional features requiring actor identity`);

// TEST 17: Traceability readiness
console.log('\n--- TEST 17: Actor Traceability Snapshot Readiness ---');
const testSnapshot = createTransactionActorSnapshot({
  code: 'PGS001',
  name: 'Junaidi',
  role: ROLES.PENGURUS,
  estateId: 'EST-TBS'
});
assert(testSnapshot.userId === 'PGS001', 'Traceability snapshot captures userId');
assert(testSnapshot.role === 'PENGURUS', 'Traceability snapshot captures role');
assert(testSnapshot.estateId === 'EST-TBS', 'Traceability snapshot captures estateId');

// TEST 18: No feature without parent hierarchy
console.log('\n--- TEST 18: Complete Hierarchy Top-to-Bottom ---');
let completeHierarchy = true;
FEATURE_REGISTRY.forEach((f) => {
  const submenu = SUBMENU_REGISTRY.find((s) => s.key === f.submenuKey);
  if (!submenu) completeHierarchy = false;
  else {
    const menu = MENU_REGISTRY.find((m) => m.key === submenu.menuKey);
    if (!menu) completeHierarchy = false;
  }
});
assert(completeHierarchy, 'All features possess complete and unbroken ROLE -> MENU -> SUBMENU -> FEATURE hierarchy');

console.log('\n==================================================');
console.log(`TOTAL TESTS RUN: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 8A ROLE MENU MAPPING TESTS PASSED!');
}
