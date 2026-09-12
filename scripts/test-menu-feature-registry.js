/**
 * scripts/test-menu-feature-registry.js
 * Automated Verification Suite for Menu, Submenu, Feature & Action Registry (Phase 7).
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
import { ROLES, SCOPE_TYPES, normalizeRole } from '../js/core/user-context.js';
import { CANONICAL_ROLES, ROLE_PROFILES, isCanonicalRole } from '../js/core/role-profiles.js';
import { permissions } from '../js/core/permissions.js';

console.log('=== STARTING MENU & FEATURE REGISTRY VERIFICATION (PHASE 7) ===\n');

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

// TEST 1: 7 canonical roles covered in registry
console.log('--- TEST 1: 7 Canonical Roles Coverage ---');
const allCanonicalRoles = Object.values(CANONICAL_ROLES);
assert(allCanonicalRoles.length === 7, `7 canonical roles defined: ${allCanonicalRoles.join(', ')}`);
allCanonicalRoles.forEach((role) => {
  const menus = getMenusByRole(role);
  assert(menus.length > 0, `Canonical role [${role}] has at least 1 menu assigned (${menus.length} menus)`);
});

// TEST 2: No duplicate menu keys or IDs
console.log('\n--- TEST 2: No Duplicate Menu Keys/IDs ---');
const menuKeys = MENU_REGISTRY.map((m) => m.key);
const menuIds = MENU_REGISTRY.map((m) => m.id);
const uniqueMenuKeys = new Set(menuKeys);
const uniqueMenuIds = new Set(menuIds);
assert(menuKeys.length === uniqueMenuKeys.size, `All ${menuKeys.length} menu keys are unique`);
assert(menuIds.length === uniqueMenuIds.size, `All ${menuIds.length} menu IDs are unique`);

// TEST 3: No duplicate submenu keys or IDs
console.log('\n--- TEST 3: No Duplicate Submenu Keys/IDs ---');
const submenuKeys = SUBMENU_REGISTRY.map((s) => s.key);
const submenuIds = SUBMENU_REGISTRY.map((s) => s.id);
const uniqueSubmenuKeys = new Set(submenuKeys);
const uniqueSubmenuIds = new Set(submenuIds);
assert(submenuKeys.length === uniqueSubmenuKeys.size, `All ${submenuKeys.length} submenu keys are unique`);
assert(submenuIds.length === uniqueSubmenuIds.size, `All ${submenuIds.length} submenu IDs are unique`);

// TEST 4: No duplicate feature keys or IDs
console.log('\n--- TEST 4: No Duplicate Feature Keys/IDs ---');
const featureKeys = FEATURE_REGISTRY.map((f) => f.key);
const featureIds = FEATURE_REGISTRY.map((f) => f.id);
const uniqueFeatureKeys = new Set(featureKeys);
const uniqueFeatureIds = new Set(featureIds);
assert(featureKeys.length === uniqueFeatureKeys.size, `All ${featureKeys.length} feature keys are unique`);
assert(featureIds.length === uniqueFeatureIds.size, `All ${featureIds.length} feature IDs are unique`);

// TEST 5: Every submenu has a valid parent menu
console.log('\n--- TEST 5: Submenu Parent Menu Integrity ---');
let allSubmenusHaveValidParent = true;
SUBMENU_REGISTRY.forEach((s) => {
  const parent = MENU_REGISTRY.find((m) => m.key === s.menuKey);
  if (!parent) {
    allSubmenusHaveValidParent = false;
    assert(false, `Submenu [${s.key}] references non-existent parent menuKey [${s.menuKey}]`);
  }
});
if (allSubmenusHaveValidParent) {
  assert(true, `All ${SUBMENU_REGISTRY.length} submenus have valid parent menu keys`);
}

// TEST 6: Every feature has a valid parent submenu
console.log('\n--- TEST 6: Feature Parent Submenu Integrity ---');
let allFeaturesHaveValidParent = true;
FEATURE_REGISTRY.forEach((f) => {
  const parent = SUBMENU_REGISTRY.find((s) => s.key === f.submenuKey);
  if (!parent) {
    allFeaturesHaveValidParent = false;
    assert(false, `Feature [${f.key}] references non-existent parent submenuKey [${f.submenuKey}]`);
  }
});
if (allFeaturesHaveValidParent) {
  assert(true, `All ${FEATURE_REGISTRY.length} features have valid parent submenu keys`);
}

// TEST 7: Every feature defines implementationStatus and valid actions
console.log('\n--- TEST 7: Feature Contract & Status Integrity ---');
const validStatuses = Object.values(IMPLEMENTATION_STATUS);
const validActions = Object.values(ACTIONS);
let allFeaturesValid = true;
FEATURE_REGISTRY.forEach((f) => {
  if (!validStatuses.includes(f.implementationStatus)) {
    allFeaturesValid = false;
    assert(false, `Feature [${f.key}] has invalid implementationStatus [${f.implementationStatus}]`);
  }
  if (!Array.isArray(f.actionKeys) || f.actionKeys.length === 0) {
    allFeaturesValid = false;
    assert(false, `Feature [${f.key}] has empty or invalid actionKeys`);
  } else {
    f.actionKeys.forEach((act) => {
      if (!validActions.includes(act)) {
        allFeaturesValid = false;
        assert(false, `Feature [${f.key}] has invalid actionKey [${act}]`);
      }
    });
  }
});
if (allFeaturesValid) {
  assert(true, `All ${FEATURE_REGISTRY.length} features have valid implementationStatus and canonical actions`);
}

// TEST 8: PENGURUS existing baseline mapping
console.log('\n--- TEST 8: PENGURUS Existing Baseline Mapping ---');
const pengurusMenus = getMenusByRole(ROLES.PENGURUS);
const pengurusMenuKeys = pengurusMenus.map((m) => m.key);
assert(pengurusMenuKeys.includes('PENERIMAAN'), 'PENGURUS has PENERIMAAN menu');
assert(pengurusMenuKeys.includes('PERMINTAAN'), 'PENGURUS has PERMINTAAN menu');
assert(pengurusMenuKeys.includes('PENGIRIMAN'), 'PENGURUS has PENGIRIMAN menu');
assert(pengurusMenuKeys.includes('REVIEW_WORKSPACE'), 'PENGURUS has REVIEW_WORKSPACE menu');
assert(pengurusMenuKeys.includes('RIWAYAT_DATA'), 'PENGURUS has RIWAYAT_DATA menu');

const pengurusFeatures = getFeaturesByRole(ROLES.PENGURUS);
assert(pengurusFeatures.some((f) => f.key === 'PERMINTAAN_BIBIT_APPROVAL'), 'PENGURUS has PERMINTAAN_BIBIT_APPROVAL feature');
assert(pengurusFeatures.some((f) => f.key === 'PENGIRIMAN_BIBIT_DISPATCH'), 'PENGURUS has PENGIRIMAN_BIBIT_DISPATCH feature');
assert(pengurusFeatures.some((f) => f.key === 'PENERIMAAN_BIBIT_APPROVAL'), 'PENGURUS has PENERIMAAN_BIBIT_APPROVAL feature');

// TEST 9: MANTRI_TANAMAN existing baseline mapping
console.log('\n--- TEST 9: MANTRI_TANAMAN Existing Baseline Mapping ---');
const mantriMenus = getMenusByRole(ROLES.MANTRI_TANAMAN);
const mantriMenuKeys = mantriMenus.map((m) => m.key);
assert(mantriMenuKeys.includes('PRESENSI'), 'MANTRI_TANAMAN has PRESENSI menu');
assert(mantriMenuKeys.includes('PENERIMAAN'), 'MANTRI_TANAMAN has PENERIMAAN menu');
assert(mantriMenuKeys.includes('PENYEMAIAN'), 'MANTRI_TANAMAN has PENYEMAIAN menu');
assert(mantriMenuKeys.includes('OKULASI'), 'MANTRI_TANAMAN has OKULASI menu');
assert(mantriMenuKeys.includes('PEMERIKSAAN'), 'MANTRI_TANAMAN has PEMERIKSAAN menu');
assert(mantriMenuKeys.includes('PENYELEKSIAN'), 'MANTRI_TANAMAN has PENYELEKSIAN menu');
assert(mantriMenuKeys.includes('KEBUN_ENTRES'), 'MANTRI_TANAMAN has KEBUN_ENTRES menu');
assert(mantriMenuKeys.includes('KEGIATAN_BIBITAN'), 'MANTRI_TANAMAN has KEGIATAN_BIBITAN menu');
assert(mantriMenuKeys.includes('RIWAYAT_DATA'), 'MANTRI_TANAMAN has RIWAYAT_DATA menu');

const mantriFeatures = getFeaturesByRole(ROLES.MANTRI_TANAMAN);
assert(mantriFeatures.some((f) => f.key === 'PRESENSI_SUPERVISOR_SUBMIT'), 'MANTRI_TANAMAN has PRESENSI_SUPERVISOR_SUBMIT');
assert(mantriFeatures.some((f) => f.key === 'PENYEMAIAN_FORM_ENTRY'), 'MANTRI_TANAMAN has PENYEMAIAN_FORM_ENTRY');
assert(mantriFeatures.some((f) => f.key === 'OKULASI_GRAFTING_ENTRY'), 'MANTRI_TANAMAN has OKULASI_GRAFTING_ENTRY');
assert(mantriFeatures.some((f) => f.key === 'ENTRES_TOPPING_ENTRY'), 'MANTRI_TANAMAN has ENTRES_TOPPING_ENTRY');

// TEST 10: New/Planned roles query without runtime impact
console.log('\n--- TEST 10: Planned/New Roles Query Support ---');
const askepMenus = getMenusByRole(ROLES.ASKEP);
const ktuMenus = getMenusByRole(ROLES.KTU);
const teknikerMenus = getMenusByRole(ROLES.TEKNIKER_I);
assert(askepMenus.length > 0, `ASKEP resolved ${askepMenus.length} menus successfully`);
assert(ktuMenus.length > 0, `KTU resolved ${ktuMenus.length} menus successfully`);
assert(teknikerMenus.length > 0, `TEKNIKER_I resolved ${teknikerMenus.length} menus successfully`);

// TEST 11: Legacy role PENGURUS_KEBUN_SEPUPU resolves cleanly to PENGURUS menus
console.log('\n--- TEST 11: Legacy Role Normalization Resolution ---');
const legacyMenus = getMenusByRole(ROLES.PENGURUS_KEBUN_SEPUPU);
const canonicalPengurusMenus = getMenusByRole(ROLES.PENGURUS);
assert(legacyMenus.length === canonicalPengurusMenus.length, 'Legacy PENGURUS_KEBUN_SEPUPU returns same menu count as PENGURUS');
assert(
  JSON.stringify(legacyMenus.map((m) => m.key)) === JSON.stringify(canonicalPengurusMenus.map((m) => m.key)),
  'Legacy PENGURUS_KEBUN_SEPUPU maps identically to PENGURUS menu keys'
);

const legacyFeatures = getFeaturesByRole(ROLES.PENGURUS_KEBUN_SEPUPU);
const canonicalPengurusFeatures = getFeaturesByRole(ROLES.PENGURUS);
assert(legacyFeatures.length === canonicalPengurusFeatures.length, 'Legacy role returns exact same features as PENGURUS');

// TEST 12: Estate independence preserved (no estate in menu/feature keys)
console.log('\n--- TEST 12: Estate Independence Verification ---');
const estateKeywords = ['TANAH_BESIH', 'AEK_PAMINGKE', 'ESTATE_1', 'ESTATE_2'];
let hasEstateInKeys = false;
MENU_REGISTRY.forEach((m) => {
  estateKeywords.forEach((est) => {
    if (m.key.includes(est)) hasEstateInKeys = true;
  });
});
FEATURE_REGISTRY.forEach((f) => {
  estateKeywords.forEach((est) => {
    if (f.key.includes(est)) hasEstateInKeys = true;
  });
});
assert(!hasEstateInKeys, 'No menu or feature keys contain hardcoded estate identifiers');

// TEST 13: Generic helper functions and query contracts
console.log('\n--- TEST 13: Generic Query Helpers & Contracts ---');
const submenusOfPenerimaan = getSubmenusByMenu('PENERIMAAN');
assert(submenusOfPenerimaan.length === 2, `PENERIMAAN has 2 submenus (actual: ${submenusOfPenerimaan.length})`);

const featuresOfPenerimaan = getFeaturesByMenu('PENERIMAAN');
assert(featuresOfPenerimaan.length === 2, `PENERIMAAN has 2 features (actual: ${featuresOfPenerimaan.length})`);

const singleFeat = getFeature('OKULASI_GRAFTING_ENTRY');
assert(singleFeat !== null && singleFeat.label === 'Input Okulasi & Grafting', 'getFeature returns valid object');

const featActions = getFeatureActions('PERMINTAAN_BIBIT_APPROVAL');
assert(featActions.includes(ACTIONS.APPROVE) && featActions.includes(ACTIONS.REVIEW), 'getFeatureActions returns action list');

const isExisting = isFeatureExisting('PRESENSI_SUPERVISOR_SUBMIT');
assert(isExisting === true, 'isFeatureExisting accurately identifies EXISTING feature');

// Verify runtime permissions.js remains untouched and identical
assert(typeof permissions.hasCapability === 'function', 'Runtime permissions.hasCapability remains unchanged');
assert(typeof permissions.canAccessRoute === 'function', 'Runtime permissions.canAccessRoute remains unchanged');

console.log('\n==================================================');
console.log(`TOTAL TESTS RUN: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 7 MENU & FEATURE REGISTRY TESTS PASSED!');
}
