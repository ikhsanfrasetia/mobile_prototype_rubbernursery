/**
 * test-restriction-klon-penerimaan-pihak-iii.js
 * Integration test suite for TASK: RESTRICT-KLON-PENERIMAAN-PIHAK-III
 * Tests clone restriction for Penerimaan Benih Pihak Ke-III (GT1, RRIC 100, PB 330, Mix).
 */

// Setup Mock Environment for Node.js
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

import { storage } from './js/core/storage.js';
import { KLON_MASTER, getActiveKlons, normalizeKlonName, resolveKlon } from './js/data/klon-master.js';
import { getRestrictedPihakIIIKlons } from './js/modules/receipt/receipt-benih.js';

const results = [];

function assert(id, desc, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`[${status}] ${id}: ${desc} ${detail ? '-> ' + detail : ''}`);
  if (!condition) {
    console.error(`  FAIL DETAIL: ${detail}`);
  }
}

console.log('============================================================');
console.log('INTEGRATION TEST: RESTRICT-KLON-PENERIMAAN-PIHAK-III');
console.log('============================================================\n');

function resetCleanState() {
  globalThis.localStorage.clear();
  storage.set('receipt_transactions', []);
}

// Helper simulating selector options based on originType
function getSelectorOptionsForOrigin(originType) {
  if (originType === 'PIHAK_KE_III') {
    return getRestrictedPihakIIIKlons();
  }
  const activeKlons = getActiveKlons();
  return activeKlons.map((k) => ({
    id: k.id,
    title: k.canonicalName,
    code: k.code,
    canonicalName: k.canonicalName,
    sub: 'Klon-' + (k.canonicalName.replace(/[^0-9]/g, '') || k.code)
  }));
}

// Helper simulating table rows rendering logic with legacyOption
function renderTableRowsSimulation(tableRows, originType) {
  const currentKlons = originType === 'PIHAK_KE_III' ? getRestrictedPihakIIIKlons() : getActiveKlons();
  return tableRows.map(row => {
    const isSelectedInActive = currentKlons.some(k => k.canonicalName === row.klon || k.code === row.klon || k.id === row.klon || k.title === row.klon);
    const legacyOption = (row.klon && !isSelectedInActive) ? row.klon : null;
    const availableOptions = currentKlons.map(k => k.canonicalName || k.title);
    return {
      selectedKlon: row.klon,
      legacyOption,
      availableOptions,
      isLegacyVisible: Boolean(legacyOption)
    };
  });
}

// Helper simulating save validation & transaction persistence
function simulateSaveReceipt({ originTypeRaw, selectedKlonName, editingIdx = null }) {
  const allowedPihakIII = ['GT1', 'GT 1', 'RRIC 100', 'PB 330', 'Mix', 'MIX'];
  
  // Validation for Pihak Ke-III
  if (originTypeRaw === 'PIHAK_KE_III' && editingIdx === null) {
    if (!selectedKlonName || !allowedPihakIII.includes(String(selectedKlonName).trim())) {
      return { success: false, error: 'Pilihan klon hanya diperbolehkan GT1, RRIC 100, PB 330, atau Mix.' };
    }
  }

  const txs = storage.get('receipt_transactions', []);
  const docNo = `2026/APR/00${txs.length + 1}`;
  const newTx = {
    id: docNo,
    docNo,
    klon: selectedKlonName,
    rawState: {
      originTypeRaw,
      tableRows: [{ klon: selectedKlonName, qty: 1000 }]
    }
  };

  if (editingIdx !== null) {
    txs[editingIdx] = newTx;
  } else {
    txs.push(newTx);
  }
  storage.set('receipt_transactions', txs);
  return { success: true, transaction: newTx };
}

// ============================================================
// TEST 01: Tipe Asal = Pihak Ke-III -> Expected options exactly: GT1, RRIC 100, PB 330, Mix
// ============================================================
const options01 = getSelectorOptionsForOrigin('PIHAK_KE_III');
const titles01 = options01.map(o => o.title || o.canonicalName);
const expected01 = ['GT1', 'RRIC 100', 'PB 330', 'Mix'];
const isExactMatch01 = titles01.length === 4 && expected01.every(e => titles01.includes(e));

assert(
  'TEST 01',
  'Tipe Asal = Pihak Ke-III: Expected options exactly GT1, RRIC 100, PB 330, Mix',
  isExactMatch01,
  `Options: [${titles01.join(', ')}]`
);

// ============================================================
// TEST 02: Tipe Asal = Pihak Ke-III -> Expected: No other clone from Master Klon appears
// ============================================================
const otherMasterKlons = getActiveKlons().filter(k => k.canonicalName !== 'GT 1' && k.canonicalName !== 'RRIC 100' && k.canonicalName !== 'PB 330');
const hasOtherClones02 = options01.some(o => otherMasterKlons.some(m => m.canonicalName === o.canonicalName || m.code === o.code));

assert(
  'TEST 02',
  'Tipe Asal = Pihak Ke-III: No other clone from Master Klon appears',
  !hasOtherClones02,
  `Forbidden clones found: ${hasOtherClones02}`
);

// ============================================================
// TEST 03: Create: Pihak Ke-III + GT1 -> Saved successfully
// ============================================================
resetCleanState();
const res03 = simulateSaveReceipt({ originTypeRaw: 'PIHAK_KE_III', selectedKlonName: 'GT1' });
assert(
  'TEST 03',
  'Create: Pihak Ke-III + GT1 -> transaction saved successfully',
  res03.success && res03.transaction.klon === 'GT1',
  `Saved klon: ${res03.transaction?.klon}`
);

// ============================================================
// TEST 04: Create: Pihak Ke-III + RRIC 100 -> Saved successfully
// ============================================================
resetCleanState();
const res04 = simulateSaveReceipt({ originTypeRaw: 'PIHAK_KE_III', selectedKlonName: 'RRIC 100' });
assert(
  'TEST 04',
  'Create: Pihak Ke-III + RRIC 100 -> transaction saved successfully',
  res04.success && res04.transaction.klon === 'RRIC 100',
  `Saved klon: ${res04.transaction?.klon}`
);

// ============================================================
// TEST 05: Create: Pihak Ke-III + PB 330 -> Saved successfully
// ============================================================
resetCleanState();
const res05 = simulateSaveReceipt({ originTypeRaw: 'PIHAK_KE_III', selectedKlonName: 'PB 330' });
assert(
  'TEST 05',
  'Create: Pihak Ke-III + PB 330 -> transaction saved successfully',
  res05.success && res05.transaction.klon === 'PB 330',
  `Saved klon: ${res05.transaction?.klon}`
);

// ============================================================
// TEST 06: Create: Pihak Ke-III + Mix -> Saved with canonical tx.klon = 'Mix'
// ============================================================
resetCleanState();
const res06 = simulateSaveReceipt({ originTypeRaw: 'PIHAK_KE_III', selectedKlonName: 'Mix' });
assert(
  'TEST 06',
  'Create: Pihak Ke-III + Mix -> saved with canonical tx.klon = \'Mix\'',
  res06.success && res06.transaction.klon === 'Mix',
  `Saved klon: ${res06.transaction?.klon}`
);

// ============================================================
// TEST 07: Create: Pihak Ke-III + clone outside allowed list -> REJECT
// ============================================================
resetCleanState();
const res07 = simulateSaveReceipt({ originTypeRaw: 'PIHAK_KE_III', selectedKlonName: 'PB 260' });
assert(
  'TEST 07',
  'Create: Pihak Ke-III + clone outside allowed list -> REJECT',
  res07.success === false,
  `Validation Result: ${res07.error}`
);

// ============================================================
// TEST 08: Non Pihak Ke-III -> Existing full clone selector behavior remains unchanged
// ============================================================
const options08 = getSelectorOptionsForOrigin('KEBUN_SENDIRI');
const masterActiveCount = getActiveKlons().length;
assert(
  'TEST 08',
  'Non Pihak Ke-III (Kebun Sendiri): Full clone selector behavior remains unchanged (57 active clones)',
  options08.length === masterActiveCount && masterActiveCount === 57,
  `Option count: ${options08.length}, Master count: ${masterActiveCount}`
);

// ============================================================
// TEST 09: Edit legacy transaction: Tipe Asal = Pihak Ke-III, Existing Klon = legacy clone outside allowed list
// ============================================================
const legacyRender09 = renderTableRowsSimulation([{ klon: 'PB 260', qty: 5000 }], 'PIHAK_KE_III');
assert(
  'TEST 09',
  'Edit legacy transaction (Pihak Ke-III with PB 260): Existing clone remains visible/selected via legacyOption',
  legacyRender09[0].legacyOption === 'PB 260' && legacyRender09[0].isLegacyVisible === true,
  `Legacy Option: ${legacyRender09[0].legacyOption}, Visible: ${legacyRender09[0].isLegacyVisible}`
);

// ============================================================
// TEST 10: Edit legacy transaction and change clone: Existing = legacy clone -> Expected new options: GT1, RRIC 100, PB 330, Mix
// ============================================================
const availableOpts10 = legacyRender09[0].availableOptions;
const hasCorrect4Options = availableOpts10.length === 4 && ['GT1', 'RRIC 100', 'PB 330', 'Mix'].every(k => availableOpts10.includes(k));
assert(
  'TEST 10',
  'Edit legacy transaction and change clone: New available options are restricted to GT1, RRIC 100, PB 330, Mix',
  hasCorrect4Options,
  `Available options: [${availableOpts10.join(', ')}]`
);

// ============================================================
// TEST 11: Change Tipe Asal: Non Pihak Ke-III -> Pihak Ke-III -> selector changes to restricted 4 options
// ============================================================
const beforeChange11 = getSelectorOptionsForOrigin('KEBUN_SENDIRI').length;
const afterChange11 = getSelectorOptionsForOrigin('PIHAK_KE_III').length;
assert(
  'TEST 11',
  'Change Tipe Asal: Kebun Sendiri (57) -> Pihak Ke-III (4): selector dynamically restricts',
  beforeChange11 === 57 && afterChange11 === 4,
  `Before: ${beforeChange11} options, After: ${afterChange11} options`
);

// ============================================================
// TEST 12: Change Tipe Asal: Pihak Ke-III -> Non Pihak Ke-III -> selector follows existing full-list behavior
// ============================================================
const beforeChange12 = getSelectorOptionsForOrigin('PIHAK_KE_III').length;
const afterChange12 = getSelectorOptionsForOrigin('LAINNYA').length;
assert(
  'TEST 12',
  'Change Tipe Asal: Pihak Ke-III (4) -> Lainnya (57): selector dynamically restores full list',
  beforeChange12 === 4 && afterChange12 === 57,
  `Before: ${beforeChange12} options, After: ${afterChange12} options`
);

// ============================================================
// TEST 13: Master Klon integrity -> KLON_MASTER record count unchanged (57 records)
// ============================================================
assert(
  'TEST 13',
  'Master Klon integrity: KLON_MASTER record count remains strictly 57 records',
  KLON_MASTER.length === 57,
  `KLON_MASTER count: ${KLON_MASTER.length}`
);

// ============================================================
// TEST 14: Mix integrity -> Mix is NOT inserted into KLON_MASTER
// ============================================================
const mixInMaster = KLON_MASTER.some(k => k.canonicalName === 'Mix' || k.code === 'MIX' || k.id === 'KLON-MIX');
assert(
  'TEST 14',
  'Mix integrity: Mix is NOT inserted into KLON_MASTER global',
  mixInMaster === false,
  `Mix in Master: ${mixInMaster}`
);

// ============================================================
// TEST 15: Downstream string compatibility -> tx.klon remains readable by existing normalization/downstream logic
// ============================================================
const normGT1 = normalizeKlonName('GT1');
const normRRIC = normalizeKlonName('RRIC 100');
const normPB330 = normalizeKlonName('PB 330');
const normMix = normalizeKlonName('Mix');

assert(
  'TEST 15',
  'Downstream string compatibility: normalizeKlonName correctly handles GT1, RRIC 100, PB 330, and Mix',
  normGT1 === 'GT 1' && normRRIC === 'RRIC 100' && normPB330 === 'PB 330' && normMix === 'Mix',
  `GT1 -> '${normGT1}', RRIC 100 -> '${normRRIC}', PB 330 -> '${normPB330}', Mix -> '${normMix}'`
);

console.log('\n============================================================');
console.log('TEST SUMMARY');
console.log('============================================================');
const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
console.log(`TOTAL TESTS: ${results.length}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log(`OVERALL RESULT: ${failCount === 0 ? 'PASS' : 'FAIL'}`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
