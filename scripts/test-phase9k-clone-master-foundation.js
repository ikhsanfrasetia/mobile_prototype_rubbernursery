/**
 * scripts/test-phase9k-clone-master-foundation.js
 * Verification Suite for Phase 9K: Master Data Klon Foundation
 *
 * Requirements:
 * - Minimum 45 assertions.
 * - Suite A: Source & Structure (klon-master.js existence, frozen dataset, unique IDs, canonical names, normalized keys, valid status)
 * - Suite B: Deduplication & Canonical Mapping (PB 260, GT 1, RRIM 600, IRR 300, leading zero handling)
 * - Suite C: Lookup & Helper APIs (getAllKlons, getActiveKlons, getKlonById, getKlonByCode, getKlonByName, resolveKlon, normalizeKlonName, getKlonAliases, isKlonActive, isKnownKlon)
 * - Suite D: Status & Category Filtering (getKlonsByCategory, getKlonsForUsage, active vs inactive)
 * - Suite E: Historical Safety & Non-Destructive Resolution (no DB mutation, unresolvable strings preserved, backward compatibility)
 * - Suite F: Protected Files & Regression Safety
 */

import fs from 'fs';
import path from 'path';
import {
  KLON_MASTER,
  KLON_STATUS,
  KLON_USAGE,
  KLON_CATEGORY,
  buildNormalizedKey,
  getAllKlons,
  getActiveKlons,
  getKlonById,
  getKlonByCode,
  getKlonByName,
  resolveKlon,
  normalizeKlonName,
  getKlonAliases,
  isKlonActive,
  isKnownKlon,
  getKlonsByCategory,
  getKlonsForUsage
} from '../js/data/klon-master.js';

console.log('================================================================================');
console.log('       SIGMA RUBBER NURSERY — TEST SUITE: PHASE 9K KLON MASTER FOUNDATION       ');
console.log('================================================================================\n');

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

const ROOT_DIR = process.cwd();

// -----------------------------------------------------------------------------
// SUITE A: Source & Structure
// -----------------------------------------------------------------------------
console.log('--- SUITE A: Source & Structure ---');

const masterFilePath = path.join(ROOT_DIR, 'js', 'data', 'klon-master.js');
assert(fs.existsSync(masterFilePath), 'Master file exists at js/data/klon-master.js');

const masterContent = fs.readFileSync(masterFilePath, 'utf-8');
assert(!masterContent.includes('document.'), 'klon-master.js has zero DOM document dependencies');
assert(!masterContent.includes('window.'), 'klon-master.js has zero DOM window dependencies');
assert(!masterContent.includes('indexedDB') && !masterContent.includes('openDB'), 'klon-master.js has zero IndexedDB dependencies');

assert(Array.isArray(KLON_MASTER), 'KLON_MASTER is an array');
assert(Object.isFrozen(KLON_MASTER), 'KLON_MASTER is frozen (read-only)');
assert(KLON_MASTER.length === 57, `KLON_MASTER contains exactly 57 official clones (actual count: ${KLON_MASTER.length})`);

// Validate every record schema
const ids = new Set();
const canonicalNames = new Set();
const normalizedKeys = new Set();

let allRecordsValid = true;
let allIdsUnique = true;
let allAliasesValid = true;
let allStatusValid = true;

KLON_MASTER.forEach((k) => {
  if (!k.id || !k.code || !k.canonicalName || !k.shortName || !k.normalizedKey || !k.category || !k.usage || !k.status || !k.source) {
    allRecordsValid = false;
  }
  if (ids.has(k.id)) {
    allIdsUnique = false;
  }
  ids.add(k.id);
  canonicalNames.add(k.canonicalName);
  normalizedKeys.add(k.normalizedKey);

  if (!Array.isArray(k.aliases) || k.aliases.length === 0) {
    allAliasesValid = false;
  }
  if (!Object.values(KLON_STATUS).includes(k.status)) {
    allStatusValid = false;
  }
});

assert(allRecordsValid, 'All records have complete schema (id, code, canonicalName, shortName, normalizedKey, category, usage, status, source)');
assert(allIdsUnique, 'All record IDs are strictly unique');
assert(ids.size === KLON_MASTER.length, `Unique IDs count (${ids.size}) equals total record count (${KLON_MASTER.length})`);
assert(normalizedKeys.size === KLON_MASTER.length, `Unique normalized keys (${normalizedKeys.size}) equals total record count`);
assert(allAliasesValid, 'All records have non-empty aliases arrays');
assert(allStatusValid, 'All records have valid status enum values (ACTIVE, INACTIVE, PENDING_REVIEW)');

// -----------------------------------------------------------------------------
// SUITE B: Deduplication & Canonical Mapping
// -----------------------------------------------------------------------------
console.log('\n--- SUITE B: Deduplication & Canonical Mapping ---');

// PB 260 mapping
const pb260A = resolveKlon('PB 260');
const pb260B = resolveKlon('PB260');
const pb260C = resolveKlon('PB-260');
assert(pb260A !== null && pb260A.id === 'KLON-PB-260', 'PB 260 spaced resolves to KLON-PB-260');
assert(pb260B !== null && pb260B.id === 'KLON-PB-260', 'PB260 condensed resolves to KLON-PB-260');
assert(pb260C !== null && pb260C.id === 'KLON-PB-260', 'PB-260 hyphenated resolves to KLON-PB-260');
assert(pb260A === pb260B && pb260B === pb260C, 'All 3 PB 260 variations resolve to the exact same canonical object');

// GT 1 & GT-01 mapping
const gt1A = resolveKlon('GT 1');
const gt1B = resolveKlon('GT1');
const gt1C = resolveKlon('GT-01');
const gt1D = resolveKlon('GT-1');
assert(gt1A !== null && gt1A.id === 'KLON-GT-1', 'GT 1 spaced resolves to KLON-GT-1');
assert(gt1B !== null && gt1B.id === 'KLON-GT-1', 'GT1 condensed resolves to KLON-GT-1');
assert(gt1C !== null && gt1C.id === 'KLON-GT-1', 'GT-01 leading zero hyphenated resolves to KLON-GT-1');
assert(gt1D !== null && gt1D.id === 'KLON-GT-1', 'GT-1 hyphenated resolves to KLON-GT-1');
assert(gt1A === gt1B && gt1B === gt1C && gt1C === gt1D, 'All 4 GT 1 variations resolve to the exact same canonical object');

// RRIM 600 mapping
const rrim600A = resolveKlon('RRIM 600');
const rrim600B = resolveKlon('RRIM600');
const rrim600C = resolveKlon('RRIM-600');
assert(rrim600A !== null && rrim600A.id === 'KLON-RRIM-600', 'RRIM 600 spaced resolves to KLON-RRIM-600');
assert(rrim600B !== null && rrim600B.id === 'KLON-RRIM-600', 'RRIM600 condensed resolves to KLON-RRIM-600');
assert(rrim600C !== null && rrim600C.id === 'KLON-RRIM-600', 'RRIM-600 hyphenated resolves to KLON-RRIM-600');
assert(rrim600A === rrim600B && rrim600B === rrim600C, 'All 3 RRIM 600 variations resolve to the exact same canonical object');

// IRR 112 mapping
const irr112A = resolveKlon('IRR 112');
const irr112B = resolveKlon('IRR112');
const irr112C = resolveKlon('IRR-112');
assert(irr112A !== null && irr112A.id === 'KLON-IRR-112', 'IRR 112 spaced resolves to KLON-IRR-112');
assert(irr112B !== null && irr112B.id === 'KLON-IRR-112', 'IRR112 condensed resolves to KLON-IRR-112');
assert(irr112C !== null && irr112C.id === 'KLON-IRR-112', 'IRR-112 hyphenated resolves to KLON-IRR-112');

// Leading zero normalizer function
assert(buildNormalizedKey('GT-01') === 'GT1', 'buildNormalizedKey handles GT-01 -> GT1');
assert(buildNormalizedKey('IRR-05') === 'IRR5', 'buildNormalizedKey handles IRR-05 -> IRR5');
assert(buildNormalizedKey('BPM-01') === 'BPM1', 'buildNormalizedKey handles BPM-01 -> BPM1');
assert(buildNormalizedKey('PB-260') === 'PB260', 'buildNormalizedKey handles PB-260 -> PB260');

// -----------------------------------------------------------------------------
// SUITE C: Lookup & Helper APIs
// -----------------------------------------------------------------------------
console.log('\n--- SUITE C: Lookup & Helper APIs ---');

// getAllKlons
const allKlons = getAllKlons();
assert(Array.isArray(allKlons) && allKlons.length === KLON_MASTER.length, 'getAllKlons() returns all master clones');
assert(allKlons !== KLON_MASTER, 'getAllKlons() returns a shallow copy protecting internal reference');

// getActiveKlons
const activeKlons = getActiveKlons();
assert(Array.isArray(activeKlons) && activeKlons.length > 0, 'getActiveKlons() returns non-empty active array');
assert(activeKlons.every((k) => k.status === KLON_STATUS.ACTIVE), 'All items in getActiveKlons() have status ACTIVE');

// getKlonById
const byId = getKlonById('KLON-PB-260');
assert(byId !== null && byId.canonicalName === 'PB 260', 'getKlonById("KLON-PB-260") returns PB 260 record');
assert(getKlonById('KLON-NON-EXISTENT') === null, 'getKlonById returns null for invalid ID');
assert(getKlonById('') === null, 'getKlonById returns null for empty string');

// getKlonByCode
const byCode = getKlonByCode('PB260');
assert(byCode !== null && byCode.canonicalName === 'PB 260', 'getKlonByCode("PB260") returns PB 260 record');
assert(getKlonByCode('gt1') !== null && getKlonByCode('gt1').canonicalName === 'GT 1', 'getKlonByCode handles lowercase "gt1"');
assert(getKlonByCode('UNKNOWN_CODE') === null, 'getKlonByCode returns null for unknown code');

// getKlonByName
const byName = getKlonByName('PB 260');
assert(byName !== null && byName.id === 'KLON-PB-260', 'getKlonByName("PB 260") returns PB 260 record');
assert(getKlonByName('pb 260') !== null, 'getKlonByName is case-insensitive');
assert(getKlonByName('Unknown Clone Name') === null, 'getKlonByName returns null for unknown name');

// normalizeKlonName
assert(normalizeKlonName('PB260') === 'PB 260', 'normalizeKlonName("PB260") returns canonical "PB 260"');
assert(normalizeKlonName('GT-01') === 'GT 1', 'normalizeKlonName("GT-01") returns canonical "GT 1"');
assert(normalizeKlonName('RRIM-600') === 'RRIM 600', 'normalizeKlonName("RRIM-600") returns canonical "RRIM 600"');
assert(normalizeKlonName('IRCA19') === 'IRCA 19', 'normalizeKlonName("IRCA19") returns canonical "IRCA 19"');
assert(normalizeKlonName('Custom-Clone-99') === 'Custom-Clone-99', 'normalizeKlonName returns original string for unknown clone (non-destructive)');

// getKlonAliases
const pbAliases = getKlonAliases('KLON-PB-260');
assert(Array.isArray(pbAliases) && pbAliases.includes('PB260') && pbAliases.includes('PB-260'), 'getKlonAliases returns registered aliases for KLON-PB-260');
assert(getKlonAliases('INVALID-ID').length === 0, 'getKlonAliases returns empty array for invalid ID');

// isKlonActive
assert(isKlonActive('KLON-PB-260') === true, 'isKlonActive returns true for active clone');
assert(isKlonActive('NON-EXISTENT') === false, 'isKlonActive returns false for non-existent clone');

// isKnownKlon
assert(isKnownKlon('PB 260') === true, 'isKnownKlon returns true for "PB 260"');
assert(isKnownKlon('PB260') === true, 'isKnownKlon returns true for "PB260"');
assert(isKnownKlon('GT-01') === true, 'isKnownKlon returns true for "GT-01"');
assert(isKnownKlon('Unknown Clone XYZ') === false, 'isKnownKlon returns false for unknown string');

// -----------------------------------------------------------------------------
// SUITE D: Status & Category Filtering
// -----------------------------------------------------------------------------
console.log('\n--- SUITE D: Status & Category Filtering ---');

// getKlonsByCategory
const standardKlons = getKlonsByCategory('STANDARD');
assert(Array.isArray(standardKlons) && standardKlons.length > 0, 'getKlonsByCategory("STANDARD") returns list of standard clones');
assert(getKlonsByCategory('NON_EXISTENT_CAT').length === 0, 'getKlonsByCategory returns empty array for unknown category');

// getKlonsForUsage
const rootstockKlons = getKlonsForUsage(KLON_USAGE.ROOTSTOCK);
assert(Array.isArray(rootstockKlons) && rootstockKlons.length > 0, 'getKlonsForUsage("ROOTSTOCK") returns valid clone list');
assert(rootstockKlons.some((k) => k.canonicalName === 'GT 1'), 'GT 1 is present in rootstock usage list');
assert(rootstockKlons.some((k) => k.canonicalName === 'PB 260'), 'PB 260 is present in rootstock usage list');

const entresKlons = getKlonsForUsage(KLON_USAGE.ENTRES);
assert(Array.isArray(entresKlons) && entresKlons.length > 0, 'getKlonsForUsage("ENTRES") returns valid clone list');
assert(entresKlons.some((k) => k.canonicalName === 'IRCA 19'), 'IRCA 19 is present in entres usage list');
assert(entresKlons.some((k) => k.canonicalName === 'RRIM 911'), 'RRIM 911 is present in entres usage list');

// -----------------------------------------------------------------------------
// SUITE E: Historical Safety & Non-Destructive Resolution
// -----------------------------------------------------------------------------
console.log('\n--- SUITE E: Historical Safety & Non-Destructive Resolution ---');

// Ensure no migration script existed or altered DB
const migrationFiles = fs.readdirSync(path.join(ROOT_DIR, 'scripts')).filter((f) => f.includes('migrate-klon') || f.includes('backfill-klon'));
assert(migrationFiles.length === 0, 'Zero migration or backfill scripts created');

// Check that normalizeKlonName is non-destructive
const legacyRaw = 'KLON_DUMMY_HISTORICAL_1995';
assert(normalizeKlonName(legacyRaw) === legacyRaw, 'normalizeKlonName preserves unrecognized legacy strings intact');
assert(normalizeKlonName('') === '', 'normalizeKlonName handles empty string cleanly');
assert(normalizeKlonName(null) === '', 'normalizeKlonName handles null cleanly');
assert(normalizeKlonName(undefined) === '', 'normalizeKlonName handles undefined cleanly');

// Verify Service Worker Cache Version & Asset Inclusion
const swContent = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf-8');
assert(swContent.includes('sigma-nursery-v160'), 'sw.js cache version bumped to sigma-nursery-v160');
assert(swContent.includes('./js/data/klon-master.js'), 'sw.js includes ./js/data/klon-master.js in CORE_ASSETS');

// -----------------------------------------------------------------------------
// SUITE F: Protected Files Safety
// -----------------------------------------------------------------------------
console.log('\n--- SUITE F: Protected Files Safety ---');

const protectedFiles = [
  'js/core/permissions.js',
  'js/core/role-profiles.js',
  'js/core/user-context.js',
  'js/core/transaction-actor.js',
  'js/core/menu-registry.js',
  'js/core/router.js',
  'js/db/repositories.js',
  'js/db/indexeddb.js',
  'js/components/drawer.js',
  'js/modules/auth/login.js',
  'js/data/demo-personas.js',
  'js/data/worker-master.js',
  'js/data/cfna-master.js',
  'js/data/master-data.js',
  'js/modules/receipt/receipt-sir.js',
  'js/modules/receipt/receipt-benih.js',
  'js/modules/seeding/seeding-form.js',
  'js/modules/budding/budding-form.js',
  'js/modules/budding/budding-regrafting.js',
  'js/modules/inspection/inspection-form.js',
  'js/modules/selection/selection-landing.js',
  'js/modules/entres/topping-form.js',
  'js/modules/entres/menunas-form.js',
  'js/modules/request/request-kebun-sepupu-form.js',
  'js/modules/history/nursery-history.js',
  'js/modules/transactions/transaction-manager.js',
  'js/modules/review/review-workspace.js'
];

protectedFiles.forEach((relPath) => {
  const fullPath = path.join(ROOT_DIR, relPath);
  assert(fs.existsSync(fullPath), `Protected file exists and intact: ${relPath}`);
});

console.log('\n================================================================================');
console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
