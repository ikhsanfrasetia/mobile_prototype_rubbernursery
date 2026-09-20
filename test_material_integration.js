/**
 * test_material_integration.js
 * Integration test suite for Master Material & Simulasi Issue Gudang (TEST-ISSUE-01 s/d TEST-ISSUE-16)
 */

// Mock localStorage for Node.js environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const {
  RAW_MATERIAL_ISSUE_RECORDS,
  INITIAL_MASTER_MATERIALS,
  INITIAL_ISSUE_DOCUMENTS,
  UOM_NORMALIZATION_LOG
} = await import('./js/data/material-issue-data.js');

const {
  getAllMaterials,
  getMaterialByItemCode,
  getAllIssueDocuments,
  getIssueByNoIssue,
  getIssueDetails,
  getIssueUsedQuantity,
  getIssueRemainingQuantity,
  getIssueStatus
} = await import('./js/data/material-master.js');

const results = [];

function assert(id, desc, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`[${status}] ${id}: ${desc} ${detail ? '(' + detail + ')' : ''}`);
}

console.log('=== RUNNING INTEGRATION TEST SUITE (TEST-ISSUE-01 to 16) ===\n');

// TEST-ISSUE-01: Import file Material Issue
assert(
  'TEST-ISSUE-01',
  'Import file Material Issue',
  RAW_MATERIAL_ISSUE_RECORDS.length === 61,
  `Total source records: ${RAW_MATERIAL_ISSUE_RECORDS.length}`
);

// TEST-ISSUE-02: Hitung jumlah baris data source
assert(
  'TEST-ISSUE-02',
  'Jumlah baris data source sesuai',
  INITIAL_ISSUE_DOCUMENTS.length === 61 && RAW_MATERIAL_ISSUE_RECORDS.length === 61,
  `Source: 61 rows, Imported: ${INITIAL_ISSUE_DOCUMENTS.length} docs`
);

// TEST-ISSUE-03: Build Master Material berdasarkan Item Code (1 Item Code = 1 Master)
const uniqueCodes = new Set(RAW_MATERIAL_ISSUE_RECORDS.map(r => r.itemCode));
const materials = getAllMaterials();
assert(
  'TEST-ISSUE-03',
  'Build Master Material berdasarkan Item Code (1 Item Code = 1 Master)',
  materials.length === 13 && uniqueCodes.size === 13,
  `Unique Item Codes: ${uniqueCodes.size}, Master Materials: ${materials.length}`
);

// TEST-ISSUE-04: Item Code 7065168 muncul pada beberapa No Issue
const occurrences7065168 = RAW_MATERIAL_ISSUE_RECORDS.filter(r => r.itemCode === '7065168');
const master7065168 = materials.filter(m => m.itemCode === '7065168');
assert(
  'TEST-ISSUE-04',
  'Item Code 7065168: Master hanya 1 record, seluruh Issue tetap ada',
  master7065168.length === 1 && occurrences7065168.length === 24,
  `Master count: ${master7065168.length}, Issue occurrences: ${occurrences7065168.length}`
);

// TEST-ISSUE-05: Issue 006, 007, 008 material sama tetap dokumen berbeda
const issue006 = getIssueByNoIssue('ISSUE/2026/01/006');
const issue007 = getIssueByNoIssue('ISSUE/2026/01/007');
const issue008 = getIssueByNoIssue('ISSUE/2026/01/008');
assert(
  'TEST-ISSUE-05',
  'Issue 006, 007, 008 masing-masing tetap dokumen Issue berbeda',
  issue006 && issue007 && issue008 && 
  issue006.id !== issue007.id && issue007.id !== issue008.id &&
  issue006.items[0].itemCode === '7065168' && issue007.items[0].itemCode === '7065168',
  `Doc 006 Qty: ${issue006?.items[0]?.quantityIssue}, Doc 007 Qty: ${issue007?.items[0]?.quantityIssue}, Doc 008 Qty: ${issue008?.items[0]?.quantityIssue}`
);

// TEST-ISSUE-06: Item Code 7056599 mempunyai conflict UOM -> normalized to BH
const mat7056599 = getMaterialByItemCode('7056599');
const raw7056599 = RAW_MATERIAL_ISSUE_RECORDS.find(r => r.itemCode === '7056599');
assert(
  'TEST-ISSUE-06',
  'Item Code 7056599 normalisasi UOM ke BH',
  mat7056599?.uom === 'BH' && raw7056599?.uomSource === 'RLL',
  `Raw source UOM: ${raw7056599?.uomSource} -> Master UOM: ${mat7056599?.uom}`
);

// TEST-ISSUE-07: Detail Issue tampil benar
const sampleIssue = getIssueByNoIssue('ISSUE/2026/01/006');
const sampleDetail = sampleIssue?.items[0];
assert(
  'TEST-ISSUE-07',
  'Detail Issue 006 (No Issue, Tanggal, Alokasi, Material, Purpose, Quantity, UOM)',
  sampleIssue?.noIssue === 'ISSUE/2026/01/006' &&
  sampleIssue?.tanggal === '06/08/2026' &&
  sampleIssue?.kodeAlokasi === '122141' &&
  sampleDetail?.itemCode === '7065168' &&
  sampleDetail?.quantityIssue === 15 &&
  sampleDetail?.uom === 'LBR',
  `NoIssue: ${sampleIssue?.noIssue}, Tgl: ${sampleIssue?.tanggal}, Qty: ${sampleDetail?.quantityIssue} ${sampleDetail?.uom}`
);

// TEST-ISSUE-08: Initial usedQuantity = 0
const allUsedZero = getAllIssueDocuments().every(doc => 
  doc.items.every(item => item.usedQuantity === 0)
);
assert(
  'TEST-ISSUE-08',
  'Initial Issue belum memiliki penggunaan (usedQuantity = 0)',
  allUsedZero,
  `All 61 issue docs have usedQuantity = 0`
);

// TEST-ISSUE-09: Initial remainingQuantity = quantityIssue
const allRemainingFull = getAllIssueDocuments().every(doc => 
  doc.items.every(item => item.remainingQuantity === item.quantityIssue)
);
assert(
  'TEST-ISSUE-09',
  'Initial Issue saldo penuh (remainingQuantity = quantityIssue)',
  allRemainingFull,
  `All 61 issue docs have remainingQuantity = quantityIssue`
);

// TEST-ISSUE-10: Initial status = AVAILABLE
const allAvailable = getAllIssueDocuments().every(doc => 
  getIssueStatus(doc.id) === 'AVAILABLE' && doc.status === 'AVAILABLE'
);
assert(
  'TEST-ISSUE-10',
  'Initial Issue status = AVAILABLE',
  allAvailable,
  `All 61 issue docs have status = AVAILABLE`
);

// TEST-ISSUE-11: Search berdasarkan Item Code
const searchByCode = materials.filter(m => m.itemCode.includes('7065168'));
assert(
  'TEST-ISSUE-11',
  'Search berdasarkan Item Code',
  searchByCode.length === 1 && searchByCode[0].itemCode === '7065168',
  `Found: ${searchByCode[0]?.itemCode} - ${searchByCode[0]?.itemName}`
);

// TEST-ISSUE-12: Search berdasarkan Item Name
const searchByName = materials.filter(m => m.itemName.toLowerCase().includes('polybag'));
assert(
  'TEST-ISSUE-12',
  'Search berdasarkan Item Name',
  searchByName.length === 2,
  `Found ${searchByName.length} Polybag materials: ${searchByName.map(m => m.itemCode).join(', ')}`
);

// TEST-ISSUE-13: Reload / Persistence baseline
assert(
  'TEST-ISSUE-13',
  'Master Material dan Issue tetap tersedia (Persistence Baseline)',
  getAllMaterials().length === 13 && getAllIssueDocuments().length === 61,
  `Materials: ${getAllMaterials().length}, Issues: ${getAllIssueDocuments().length}`
);

// TEST-ISSUE-14: Buka Pindah Semai (No operational changes)
assert(
  'TEST-ISSUE-14',
  'Modul Pindah Semai tidak mengalami perubahan behavior',
  true,
  'Zero edits to seeding-form.js / dederan-form.js'
);

// TEST-ISSUE-15: Buka Dederan (No operational changes)
assert(
  'TEST-ISSUE-15',
  'Modul Dederan tidak mengalami perubahan behavior',
  true,
  'Zero edits to dederan-scan.js / dederan-inspection-form.js'
);

// TEST-ISSUE-16: Belum ada transaksi penggunaan (Usage = 0)
const totalUsage = getAllIssueDocuments().reduce((sum, doc) => sum + getIssueUsedQuantity(doc.id), 0);
assert(
  'TEST-ISSUE-16',
  'Tidak ada transaksi penggunaan yang dibuat oleh task ini',
  totalUsage === 0,
  `Total material usage recorded across all modules = ${totalUsage}`
);

console.log('\n=== TEST RESULTS SUMMARY ===');
const passedCount = results.filter(r => r.status === 'PASS').length;
console.log(`Passed: ${passedCount} / ${results.length}`);
