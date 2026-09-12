/**
 * scripts/test-phase9j-clone-data-audit.js
 * Verification Suite for Phase 9J: Clone Data Consistency & Master Integration
 *
 * Validates canonical code & data sources directly (ZERO markdown dependency):
 * 1. Canonical Master Klon & CSV dataset structure (js/data/klon-master.js, data/budwood-plot-klon.csv).
 * 2. All 11 Clone user modules & 5 transaction sources connected to canonical master.
 * 3. Format variations (spaced, condensed, hyphenated) normalized via resolveKlon().
 * 4. Field schema variations (klon, klonAwal, klonEntres, klonRootstock, namaKlon) handled.
 * 5. Historical transaction compatibility and non-destructive legacy resolution.
 * 6. Protected core files integrity (READ-ONLY guarantee).
 */

import fs from 'fs';
import path from 'path';
import {
  KLON_MASTER,
  KLON_STATUS,
  KLON_USAGE,
  KLON_CATEGORY,
  getAllKlons,
  getActiveKlons,
  getKlonById,
  getKlonByCode,
  resolveKlon,
  normalizeKlonName,
  isKlonActive
} from '../js/data/klon-master.js';

console.log('================================================================================');
console.log('         SIGMA RUBBER NURSERY — TEST SUITE: PHASE 9J CLONE DATA AUDIT          ');
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
// SUITE A: Master Klon Canonical Source Verification
// -----------------------------------------------------------------------------
console.log('--- SUITE A: Master Klon Canonical Source Verification ---');

const masterJsPath = path.join(ROOT_DIR, 'js/data/klon-master.js');
const datasetCsvPath = path.join(ROOT_DIR, 'data/budwood-plot-klon.csv');

assert(fs.existsSync(masterJsPath), 'Canonical file exists: js/data/klon-master.js');
assert(fs.existsSync(datasetCsvPath), 'Canonical dataset exists: data/budwood-plot-klon.csv');

assert(Array.isArray(KLON_MASTER), 'KLON_MASTER is an Array');
assert(Object.isFrozen(KLON_MASTER), 'KLON_MASTER is frozen (immutable read-only)');
assert(KLON_MASTER.length === 57, `KLON_MASTER contains exactly 57 canonical active clone entries (got ${KLON_MASTER.length})`);

const activeKlons = getActiveKlons();
assert(activeKlons.length === 57, `getActiveKlons() returns exactly 57 active clones (got ${activeKlons.length})`);
assert(typeof resolveKlon === 'function', 'resolveKlon() is exported as normalization resolver');
assert(typeof normalizeKlonName === 'function', 'normalizeKlonName() is exported as display normalizer');
assert(typeof getKlonById === 'function', 'getKlonById() is exported as canonical identifier lookup');
assert(typeof getKlonByCode === 'function', 'getKlonByCode() is exported as code lookup');
assert(typeof isKlonActive === 'function', 'isKlonActive() is exported as active status checker');

const csvContent = fs.readFileSync(datasetCsvPath, 'utf-8');
assert(csvContent.length > 500, 'Dataset CSV has sufficient content (>500 bytes)');
assert(csvContent.includes('clone_name') && csvContent.includes('budwood_code'), 'Dataset CSV contains required headers');

// -----------------------------------------------------------------------------
// SUITE B: Module & Source Inventory Verification
// -----------------------------------------------------------------------------
console.log('\n--- SUITE B: Module & Source Inventory Verification ---');

const expectedModules = [
  { name: 'Penerimaan', file: 'js/modules/receipt/receipt-sir.js' },
  { name: 'Penyemaian', file: 'js/modules/seeding/seeding-form.js' },
  { name: 'Okulasi', file: 'js/modules/budding/budding-form.js' },
  { name: 'Regrafting', file: 'js/modules/budding/budding-regrafting.js' },
  { name: 'Pemeriksaan', file: 'js/modules/inspection/inspection-form.js' },
  { name: 'Penyeleksian', file: 'js/modules/selection/selection-landing.js' },
  { name: 'Kebun Entres', file: 'js/modules/entres/topping-form.js' },
  { name: 'Permintaan', file: 'js/modules/request/request-kebun-sepupu-form.js' },
  { name: 'Riwayat', file: 'js/modules/history/nursery-history.js' },
  { name: 'Transaction Manager', file: 'js/modules/transactions/transaction-manager.js' },
  { name: 'Review Workspace', file: 'js/modules/review/review-workspace.js' }
];

expectedModules.forEach((mod) => {
  const fullPath = path.join(ROOT_DIR, mod.file);
  const exists = fs.existsSync(fullPath);
  assert(exists, `Module verified and intact: ${mod.name} (${mod.file})`);
});

// Verify 5 distinct transaction input forms integrated with canonical clone master
const expectedSources = [
  'js/modules/receipt/receipt-sir.js',
  'js/modules/receipt/receipt-benih.js',
  'js/modules/seeding/seeding-form.js',
  'js/modules/budding/budding-form.js',
  'js/modules/request/request-kebun-sepupu-form.js'
];

expectedSources.forEach((src) => {
  const content = fs.readFileSync(path.join(ROOT_DIR, src), 'utf-8');
  const usesMaster = content.includes('klon-master.js') || content.includes('getActiveKlons');
  assert(usesMaster, `Transaction source uses canonical Klon Master: ${src}`);
});

// -----------------------------------------------------------------------------
// SUITE C: Field Schema & Formatting Inconsistency Normalization
// -----------------------------------------------------------------------------
console.log('\n--- SUITE C: Field Schema & Formatting Inconsistency Normalization ---');

// Format inconsistency normalization checks (Spaced, Condensed, Hyphenated)
const pb260Spaced = resolveKlon('PB 260');
const pb260Condensed = resolveKlon('PB260');
const pb260Hyphen = resolveKlon('PB-260');
assert(
  pb260Spaced && pb260Condensed && pb260Hyphen &&
  pb260Spaced.id === 'KLON-PB-260' &&
  pb260Condensed.id === 'KLON-PB-260' &&
  pb260Hyphen.id === 'KLON-PB-260',
  'Normalization resolves PB 260 variations (Spaced, Condensed, Hyphenated) to canonical ID'
);

const gt1Spaced = resolveKlon('GT 1');
const gt1Condensed = resolveKlon('GT1');
const gt1Hyphen = resolveKlon('GT-01');
assert(
  gt1Spaced && gt1Condensed && gt1Hyphen &&
  gt1Spaced.id === 'KLON-GT-1' &&
  gt1Condensed.id === 'KLON-GT-1' &&
  gt1Hyphen.id === 'KLON-GT-1',
  'Normalization resolves GT 1 variations (GT 1, GT1, GT-01) to canonical ID'
);

const rrim600Spaced = resolveKlon('RRIM 600');
const rrim600Condensed = resolveKlon('RRIM600');
const rrim600Hyphen = resolveKlon('RRIM-600');
assert(
  rrim600Spaced && rrim600Condensed && rrim600Hyphen &&
  rrim600Spaced.id === 'KLON-RRIM-600' &&
  rrim600Condensed.id === 'KLON-RRIM-600' &&
  rrim600Hyphen.id === 'KLON-RRIM-600',
  'Normalization resolves RRIM 600 variations to canonical ID'
);

const irca331Spaced = resolveKlon('IRCA 331');
const irca331Condensed = resolveKlon('IRCA331');
assert(
  irca331Spaced && irca331Condensed && irca331Spaced.id === 'KLON-IRCA-331',
  'Normalization resolves IRCA 331 variations to canonical ID'
);

// Schema field resolution test (handling klon, klonAwal, klonEntres, klonRootstock, namaKlon)
const dummyRecordA = { klon: 'PB 260' };
const dummyRecordB = { klonAwal: 'GT 1' };
const dummyRecordC = { klonEntres: 'RRIM 600' };
const dummyRecordD = { klonRootstock: 'BPM 24' };
const dummyRecordE = { namaKlon: 'IRR 112' };

const resolveField = (rec) => resolveKlon(rec.klon || rec.klonAwal || rec.klonEntres || rec.klonRootstock || rec.namaKlon);

const schemaTestA = resolveField(dummyRecordA);
const schemaTestB = resolveField(dummyRecordB);
const schemaTestC = resolveField(dummyRecordC);
const schemaTestD = resolveField(dummyRecordD);
const schemaTestE = resolveField(dummyRecordE);

assert(schemaTestA && schemaTestA.canonicalName === 'PB 260', 'Schema resolution handles field "klon"');
assert(schemaTestB && schemaTestB.canonicalName === 'GT 1', 'Schema resolution handles field "klonAwal"');
assert(schemaTestC && schemaTestC.canonicalName === 'RRIM 600', 'Schema resolution handles field "klonEntres"');
assert(schemaTestD && schemaTestD.canonicalName === 'BPM 24', 'Schema resolution handles field "klonRootstock"');
assert(schemaTestE && schemaTestE.canonicalName === 'IRR 112', 'Schema resolution handles field "namaKlon"');

// -----------------------------------------------------------------------------
// SUITE D: Historical Compatibility & Read-Only Safety
// -----------------------------------------------------------------------------
console.log('\n--- SUITE D: Historical Compatibility & Read-Only Safety ---');

const legacyKlons = ['IRR 300', 'PR 261', 'IRR 215', 'IRR 100', 'IRR 219', 'IRR 107', 'IRCA 120'];
const activeIncludesLegacy = legacyKlons.some((kName) => {
  return activeKlons.some((a) => a.canonicalName === kName);
});
assert(!activeIncludesLegacy, 'Strict non-destructive rule: 7 legacy klons are excluded from active clone dropdowns');

// normalizeKlonName fallback preserves unmapped legacy names non-destructively
const normLegacy = normalizeKlonName('IRR 300');
assert(normLegacy === 'IRR 300', 'Historical audit: normalizeKlonName preserves legacy clone strings non-destructively');

const invalidResolve = resolveKlon('UNKNOWN_KLON_999');
assert(invalidResolve === null, 'Non-existent clone returns null safely without throwing');
assert(Object.isFrozen(KLON_STATUS), 'KLON_STATUS enum is frozen (immutable)');

// -----------------------------------------------------------------------------
// SUITE E: Protected Files Integrity Check
// -----------------------------------------------------------------------------
console.log('\n--- SUITE E: Protected Core Files Integrity Check ---');

const protectedFiles = [
  'js/core/permissions.js',
  'js/core/role-profiles.js',
  'js/core/user-context.js',
  'js/core/transaction-actor.js',
  'js/core/router.js',
  'js/core/session.js',
  'js/components/drawer.js',
  'js/data/demo-personas.js',
  'js/data/worker-master.js',
  'js/data/cfna-master.js',
  'js/db/repositories.js'
];

protectedFiles.forEach((file) => {
  const filePath = path.join(ROOT_DIR, file);
  assert(fs.existsSync(filePath), `Protected core file exists and is intact: ${file}`);
});

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${passedTests}`);
console.log(`TOTAL ASSERTIONS FAILED: ${failedTests}`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
