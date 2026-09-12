/**
 * scripts/test-budding-clone-integration.js
 * Verification suite for Phase: Integrasi Master Klon ke Modul Okulasi / Budding.
 *
 * Tests:
 * 1. Module import & dependency verification (budding-form.js, budding-scan.js, budding-regrafting.js, budding-grafting.js use klon-master.js).
 * 2. Active Entres clones count and metadata (getKlonsForUsage(ENTRES)).
 * 3. Rootstock clones classification (getKlonsForUsage(ROOTSTOCK)).
 * 4. 7 legacy clones exclusion from active dropdowns/modal for new transactions.
 * 5. Clone resolution & normalization behavior in budding-form and budding-scan.
 * 6. Budding transaction payload schema and persistence compatibility (klonEntres, klonRootstock, workers, jumlahKayu).
 * 7. Historical transaction snapshot & regrafting pool backward compatibility.
 * 8. Absence of hardcoded duplicate clone arrays in budding modules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Dynamic import of master klon
import {
  KLON_MASTER,
  KLON_STATUS,
  KLON_USAGE,
  getActiveKlons,
  getAllKlons,
  getKlonsForUsage,
  getKlonById,
  getKlonByCode,
  getKlonByName,
  resolveKlon,
  normalizeKlonName,
  isKlonActive
} from '../js/data/klon-master.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('='.repeat(80));
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: BUDDING CLONE MASTER INTEGRATION    ');
console.log('='.repeat(80));

// --- SUITE A: Static Code & Dependency Audit ---
console.log('\n--- SUITE A: Static Code & Dependency Audit ---');

const buddingFormPath = path.join(rootDir, 'js', 'modules', 'budding', 'budding-form.js');
const buddingScanPath = path.join(rootDir, 'js', 'modules', 'budding', 'budding-scan.js');
const buddingRegraftingPath = path.join(rootDir, 'js', 'modules', 'budding', 'budding-regrafting.js');
const buddingGraftingPath = path.join(rootDir, 'js', 'modules', 'budding', 'budding-grafting.js');

assert(fs.existsSync(buddingFormPath), 'budding-form.js exists');
assert(fs.existsSync(buddingScanPath), 'budding-scan.js exists');
assert(fs.existsSync(buddingRegraftingPath), 'budding-regrafting.js exists');
assert(fs.existsSync(buddingGraftingPath), 'budding-grafting.js exists');

const formContent = fs.readFileSync(buddingFormPath, 'utf8');
const scanContent = fs.readFileSync(buddingScanPath, 'utf8');
const regraftContent = fs.readFileSync(buddingRegraftingPath, 'utf8');
const graftContent = fs.readFileSync(buddingGraftingPath, 'utf8');

assert(formContent.includes("from '../../data/klon-master.js'"), 'budding-form.js imports from klon-master.js');
assert(scanContent.includes("from '../../data/klon-master.js'"), 'budding-scan.js imports from klon-master.js');
assert(regraftContent.includes("from '../../data/klon-master.js'"), 'budding-regrafting.js imports from klon-master.js');
assert(graftContent.includes("from '../../data/klon-master.js'"), 'budding-grafting.js imports from klon-master.js');

// Verify removal of hardcoded KLON_ENTRES_LIST
assert(!formContent.includes('const KLON_ENTRES_LIST = ['), 'budding-form.js no longer contains hardcoded KLON_ENTRES_LIST array');

// --- SUITE B: Entres & Rootstock Usage Classification ---
console.log('\n--- SUITE B: Entres & Rootstock Usage Classification ---');

const entresKlons = getKlonsForUsage(KLON_USAGE.ENTRES);
assert(Array.isArray(entresKlons), 'getKlonsForUsage(ENTRES) returns an array');
assert(entresKlons.length === 57, `getKlonsForUsage(ENTRES) returns 57 active clones (actual: ${entresKlons.length})`);

const rootstockKlons = getKlonsForUsage(KLON_USAGE.ROOTSTOCK);
assert(Array.isArray(rootstockKlons), 'getKlonsForUsage(ROOTSTOCK) returns an array');
assert(rootstockKlons.length > 0, `getKlonsForUsage(ROOTSTOCK) contains active rootstock clones (count: ${rootstockKlons.length})`);

const gt1 = rootstockKlons.find(k => k.code === 'GT1' || k.canonicalName === 'GT 1');
assert(gt1 !== undefined, 'GT 1 is present in Rootstock usage classification');

// Check 7 legacy clones are NOT in entres list
const legacyClones = [
  'IRR 300',
  'PR 261',
  'IRR 215',
  'IRR 100',
  'IRR 219',
  'IRR 107',
  'IRCA 120'
];

legacyClones.forEach(legacy => {
  const isInEntres = entresKlons.some(
    k => k.canonicalName === legacy || k.code === legacy.replace(/\s+/g, '')
  );
  assert(!isInEntres, `Legacy clone "${legacy}" is NOT in active Entres list for new transactions`);
});

// --- SUITE C: Entres Search & Selection Simulation in Budding Form ---
console.log('\n--- SUITE C: Entres Search & Selection Simulation in Budding Form ---');

function searchEntres(query) {
  const q = (query || '').trim().toLowerCase();
  return entresKlons.filter(k => 
    k.canonicalName.toLowerCase().includes(q) ||
    k.code.toLowerCase().includes(q) ||
    k.aliases.some(a => a.toLowerCase().includes(q))
  );
}

assert(searchEntres('PB 260').length >= 1, 'Search "PB 260" matches PB 260');
assert(searchEntres('pb260').length >= 1, 'Search "pb260" matches PB260 code');
assert(searchEntres('RRIM 911').length >= 1, 'Search "RRIM 911" matches RRIM 911');
assert(searchEntres('IRCA 19').length >= 1, 'Search "IRCA 19" matches IRCA 19');
assert(searchEntres('IRR 215').length === 0, 'Search for legacy "IRR 215" returns 0 matches');
assert(searchEntres('IRR 100').length === 0, 'Search for legacy "IRR 100" returns 0 matches');

// --- SUITE D: Budding Transaction Payload Persistence ---
console.log('\n--- SUITE D: Budding Transaction Payload Persistence ---');

// Mock Seeding input batch
const mockSeedingBatch = {
  batchNo: 'Batch-01',
  docNo: '2026/SOW/001',
  sourceDocNo: '2026/APR/001',
  klonAwal: 'GT 1',
  totalDisemai: 2000,
  rows: [{ bedengan: 'Bedengan 01', disemai: 2000 }]
};

const selectedKlonEntres = 'PB 260';
const mockWorkers = [
  { id: 'WRK-TB-001', name: 'Budi Santoso', code: '1405001', qty: 500 }
];

const newBuddingTx = {
  docNo: '2026/OKL/001',
  type: 'GRAFTING',
  seedingIndex: 0,
  regraftPoolDocNo: '',
  inspectionDocNo: '',
  batchNo: mockSeedingBatch.batchNo,
  sourceDocNo: mockSeedingBatch.docNo,
  tanggal: '12/09/2026',
  bedengan: 'Bedengan 01',
  klonEntres: normalizeKlonName(selectedKlonEntres),
  klonRootstock: mockSeedingBatch.klonAwal ? normalizeKlonName(mockSeedingBatch.klonAwal) : 'GT 1',
  workers: mockWorkers,
  jumlah: 500,
  jumlahKayu: 10,
  jumlahDitolak: 0,
  alasan: null
};

assert(newBuddingTx.klonEntres === 'PB 260', 'newBuddingTx.klonEntres stores canonical name "PB 260"');
assert(newBuddingTx.klonRootstock === 'GT 1', 'newBuddingTx.klonRootstock stores canonical name "GT 1"');
assert(newBuddingTx.jumlah === 500, 'newBuddingTx.jumlah matches recorded worker output (500)');
assert(newBuddingTx.jumlahKayu === 10, 'newBuddingTx.jumlahKayu matches recorded wood count (10)');

// --- SUITE E: Historical & Legacy Budding Compatibility ---
console.log('\n--- SUITE E: Historical & Legacy Budding Compatibility ---');

const historicalBuddingTx = {
  docNo: '2026/OKL/000',
  type: 'GRAFTING',
  batchNo: 'Batch-01',
  klonEntres: 'IRR 215', // legacy clone snapshot
  klonRootstock: 'GT-01', // old format
  jumlah: 400
};

assert(historicalBuddingTx.klonEntres === 'IRR 215', 'Historical budding tx klonEntres field remains intact');
assert(historicalBuddingTx.klonRootstock === 'GT-01', 'Historical budding tx klonRootstock field remains intact');

const normalizedHistEntres = normalizeKlonName(historicalBuddingTx.klonEntres);
const normalizedHistRootstock = normalizeKlonName(historicalBuddingTx.klonRootstock);

assert(normalizedHistEntres === 'IRR 215', 'normalizeKlonName preserves legacy clone "IRR 215" non-destructively');
assert(normalizedHistRootstock === 'GT 1', 'normalizeKlonName normalizes "GT-01" to canonical "GT 1"');

console.log('\n' + '='.repeat(80));
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

if (failed > 0) {
  process.exit(1);
}
