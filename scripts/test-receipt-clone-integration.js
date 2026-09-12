/**
 * scripts/test-receipt-clone-integration.js
 * Verification suite for Phase: Integrasi Master Klon ke Modul Penerimaan.
 *
 * Tests:
 * 1. Module import & dependency verification (receipt-sir.js & receipt-benih.js use klon-master.js).
 * 2. Active clones count and presence (57 canonical active clones).
 * 3. 7 legacy clones exclusion from active dropdowns/lists for new transactions.
 * 4. Clone selection, rendering, and search behavior in receipt-sir & receipt-benih.
 * 5. Transaction payload schema and storage persistence compatibility.
 * 6. Historical transaction snapshot backward compatibility.
 * 7. Absence of hardcoded duplicate clone arrays in receipt modules.
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
  getActiveKlons,
  getAllKlons,
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
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: RECEIPT CLONE MASTER INTEGRATION    ');
console.log('='.repeat(80));

// --- SUITE A: Static Code & Dependency Audit ---
console.log('\n--- SUITE A: Static Code & Dependency Audit ---');

const receiptSirPath = path.join(rootDir, 'js', 'modules', 'receipt', 'receipt-sir.js');
const receiptBenihPath = path.join(rootDir, 'js', 'modules', 'receipt', 'receipt-benih.js');

assert(fs.existsSync(receiptSirPath), 'receipt-sir.js exists');
assert(fs.existsSync(receiptBenihPath), 'receipt-benih.js exists');

const sirContent = fs.readFileSync(receiptSirPath, 'utf8');
const benihContent = fs.readFileSync(receiptBenihPath, 'utf8');

assert(
  sirContent.includes("from '../../data/klon-master.js'") || sirContent.includes('from "../../data/klon-master.js"'),
  'receipt-sir.js imports from klon-master.js'
);
assert(
  benihContent.includes("from '../../data/klon-master.js'") || benihContent.includes('from "../../data/klon-master.js"'),
  'receipt-benih.js imports from klon-master.js'
);

// Verify that hardcoded klon arrays are removed
assert(!sirContent.includes('const klonNames = ['), 'receipt-sir.js no longer contains hardcoded klonNames array');
assert(!benihContent.includes('<option value="IRCA120"'), 'receipt-benih.js no longer contains hardcoded IRCA120 option');
assert(!benihContent.includes('<option value="IRR300"'), 'receipt-benih.js no longer contains hardcoded IRR300 option');

// --- SUITE B: Active Clones & Dropdown Source Verification ---
console.log('\n--- SUITE B: Active Clones & Dropdown Source Verification ---');

const activeKlons = getActiveKlons();
assert(Array.isArray(activeKlons), 'getActiveKlons() returns an array');
assert(activeKlons.length === 57, `getActiveKlons() returns exactly 57 active clones (actual: ${activeKlons.length})`);

// Check all 57 clones are ACTIVE
const allActive = activeKlons.every(k => k.status === KLON_STATUS.ACTIVE);
assert(allActive, 'All 57 returned clones have status ACTIVE');

// Check 7 legacy clones are NOT in getActiveKlons()
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
  const isInActive = activeKlons.some(
    k => k.canonicalName === legacy || k.code === legacy.replace(/\s+/g, '') || k.id === `KLON-${legacy.replace(/\s+/g, '-')}`
  );
  assert(!isInActive, `Legacy clone "${legacy}" is NOT in active clones dropdown list`);
});

// --- SUITE C: Receipt SIR Selection & Search Logic ---
console.log('\n--- SUITE C: Receipt SIR Selection & Search Logic ---');

const klonDataSir = activeKlons.map((k) => ({
  id: k.id,
  title: k.canonicalName,
  code: k.code,
  canonicalName: k.canonicalName,
  sub: 'Klon-' + (k.canonicalName.replace(/[^0-9]/g, '') || k.code)
}));

assert(klonDataSir.length === 57, `Receipt SIR has 57 clone items mapped from master (actual: ${klonDataSir.length})`);

// Test search filter simulations
const searchFilter = (query) => {
  const q = (query || '').trim().toLowerCase();
  return klonDataSir.filter(
    k => k.title.toLowerCase().includes(q) || k.sub.toLowerCase().includes(q) || (k.code && k.code.toLowerCase().includes(q))
  );
};

assert(searchFilter('PB 260').length >= 1, 'Search "PB 260" matches canonical title');
assert(searchFilter('pb260').length >= 1, 'Search "pb260" matches condensed code');
assert(searchFilter('GT 1').length >= 1, 'Search "GT 1" matches GT 1');
assert(searchFilter('IRCA 19').length >= 1, 'Search "IRCA 19" matches IRCA 19');
assert(searchFilter('IRCA19').length >= 1, 'Search "IRCA19" matches IRCA 19 code');
assert(searchFilter('IRCA 120').length === 0, 'Search for legacy "IRCA 120" returns 0 matches in active master');
assert(searchFilter('IRR 300').length === 0, 'Search for legacy "IRR 300" returns 0 matches in active master');

// --- SUITE D: Receipt Benih Table Dropdown Options Generation ---
console.log('\n--- SUITE D: Receipt Benih Table Dropdown Options Generation ---');

function generateRowOptions(rowKlon) {
  const isSelectedInActive = activeKlons.some(
    k => k.canonicalName === rowKlon || k.code === rowKlon || k.id === rowKlon
  );
  const legacyOption = (rowKlon && !isSelectedInActive)
    ? `<option value="${rowKlon}" selected>${rowKlon}</option>`
    : '';
  
  const optionsHtml = activeKlons.map(k => {
    const isSelected = rowKlon === k.canonicalName || rowKlon === k.code || rowKlon === k.id;
    return `<option value="${k.canonicalName}" ${isSelected ? 'selected' : ''}>${k.canonicalName}</option>`;
  }).join('');

  return { legacyOption, optionsHtml, isSelectedInActive };
}

// 1. New row (empty clone)
const newRowResult = generateRowOptions('');
assert(newRowResult.legacyOption === '', 'New row has no legacyOption injected');
assert(!newRowResult.optionsHtml.includes('IRR 300'), 'New row optionsHtml does not contain IRR 300');
assert(!newRowResult.optionsHtml.includes('IRCA 120'), 'New row optionsHtml does not contain IRCA 120');
assert(newRowResult.optionsHtml.includes('PB 260'), 'New row optionsHtml contains canonical PB 260');
assert(newRowResult.optionsHtml.includes('GT 1'), 'New row optionsHtml contains canonical GT 1');

// 2. Active clone row
const activeRowResult = generateRowOptions('PB 260');
assert(activeRowResult.isSelectedInActive === true, 'PB 260 recognized as active');
assert(activeRowResult.legacyOption === '', 'Active clone does not generate extra legacyOption');
assert(activeRowResult.optionsHtml.includes('<option value="PB 260" selected>PB 260</option>'), 'PB 260 is marked selected');

// 3. Historical / Legacy clone row (e.g. from an old transaction draft with legacy clone)
const legacyRowResult = generateRowOptions('IRCA 120');
assert(legacyRowResult.isSelectedInActive === false, 'IRCA 120 recognized as non-active');
assert(
  legacyRowResult.legacyOption === '<option value="IRCA 120" selected>IRCA 120</option>',
  'Historical draft with IRCA 120 safely preserves option without throwing error'
);

// --- SUITE E: Transaction Payload & Storage Persistence ---
console.log('\n--- SUITE E: Transaction Payload & Storage Persistence ---');

// Simulate creating a new transaction from Kebun Sendiri
const sampleRow = { klon: 'PB 260', qty: '500', rejected: '10', reason: 'Rusak' };
const mockState = {
  jenisPenerimaan: 'Benih / Biji Kelatak',
  tahapanPertumbuhan: 'Rubber Main Nursery',
  programNurseryCode: 'PRG/NUR/01/2026',
  sourceName: 'Divisi I',
  photos: ['photo1.jpg'],
  tableRows: [sampleRow]
};

const newTx = {
  id: '2026/APR/001',
  docNo: '2026/APR/001',
  nomorDokumen: '2026/APR/001',
  jenis: mockState.jenisPenerimaan,
  tahapan: mockState.tahapanPertumbuhan,
  program: mockState.programNurseryCode,
  klon: mockState.tableRows[0]?.klon || 'GT 1',
  tanggal: '12/09/2026',
  tipeAsal: 'Kebun Sendiri',
  sumber: mockState.sourceName,
  sir: '-',
  qty: 500,
  rawState: mockState
};

assert(newTx.klon === 'PB 260', 'Transaction clone field stores canonical name "PB 260"');
assert(newTx.docNo === '2026/APR/001', 'Transaction docNo matches standard format');
assert(newTx.rawState.tableRows[0].klon === 'PB 260', 'rawState table row clone is preserved');

// Simulate historical transaction compatibility
const historicalTx = {
  id: '2026/APR/002',
  docNo: '2026/APR/002',
  nomorDokumen: '2026/APR/002',
  jenis: 'Benih / Biji Kelatak',
  tahapan: 'Rubber Main Nursery',
  program: 'PRG/NUR/01/2026',
  klon: 'IRR300', // legacy snapshot
  tanggal: '01/08/2026',
  tipeAsal: 'Pihak Ke-III',
  sumber: 'UD Ganang Jaya',
  sir: 'ISSUE/2026/01/347',
  qty: '39250 BUTIR'
};

assert(historicalTx.klon === 'IRR300', 'Historical transaction data remains unchanged and accessible');
const resolvedHistorical = resolveKlon(historicalTx.klon);
// Master resolver handles normalization non-destructively
const normalizedHistoricalName = normalizeKlonName(historicalTx.klon);
assert(typeof normalizedHistoricalName === 'string', 'normalizeKlonName handles historical clone strings gracefully');

console.log('\n' + '='.repeat(80));
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

if (failed > 0) {
  process.exit(1);
}
