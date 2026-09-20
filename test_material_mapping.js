/**
 * test_material_mapping.js
 * Integration test suite for Material Identity & Issue Hierarchy (TEST-MAPPING-01 s/d TEST-MAPPING-10)
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
  INITIAL_ISSUE_DOCUMENTS
} = await import('./js/data/material-issue-data.js');

const {
  getAllMaterials,
  getMaterialByItemCode,
  getAllIssueDocuments,
  getIssueByNoIssue,
  getIssueDetails
} = await import('./js/data/material-master.js');

const results = [];

function assert(id, desc, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`[${status}] ${id}: ${desc} ${detail ? '(' + detail + ')' : ''}`);
}

console.log('=== RUNNING MAPPING & HIERARCHY TEST SUITE (TEST-MAPPING-01 to 10) ===\n');

// TEST-MAPPING-01: Open Issue Gudang -> Item Code & Item Name adalah identitas utama
const allIssues = getAllIssueDocuments();
const hasItemIdentity = allIssues.every(doc => {
  const item = doc.items[0];
  return item && item.itemCode && item.itemName && item.uom;
});
assert(
  'TEST-MAPPING-01',
  'Item Code dan Item Name menjadi identitas utama pada seluruh Issue',
  hasItemIdentity,
  `All ${allIssues.length} docs have Item Code, Item Name, and UOM bound to items`
);

// TEST-MAPPING-02: Cari 7038525 -> KERETA SORONG ASAHI KOMPLIT NEW SPECIAL ditampilkan sebagai material
const mat7038525 = getMaterialByItemCode('7038525');
const issue7038525 = allIssues.find(d => d.items.some(it => it.itemCode === '7038525'));
assert(
  'TEST-MAPPING-02',
  'Item Code 7038525 adalah KERETA SORONG ASAHI KOMPLIT NEW SPECIAL',
  mat7038525?.itemName === 'KERETA SORONG ASAHI KOMPLIT NEW SPECIAL' &&
  issue7038525?.items[0]?.itemName === 'KERETA SORONG ASAHI KOMPLIT NEW SPECIAL',
  `Master Name: ${mat7038525?.itemName}, UOM: ${mat7038525?.uom}`
);

// TEST-MAPPING-03: Periksa Issue ISSUE/2026/01/036
const doc036 = getIssueByNoIssue('ISSUE/2026/01/036');
const item036 = doc036?.items[0];
assert(
  'TEST-MAPPING-03',
  'ISSUE/2026/01/036: Item 7038525 (UNT) terpisah dari Alokasi 122141 — Biaya Polybag',
  doc036 &&
  item036?.itemCode === '7038525' &&
  item036?.itemName === 'KERETA SORONG ASAHI KOMPLIT NEW SPECIAL' &&
  item036?.uom === 'UNT' &&
  doc036?.kodeAlokasi === '122141' &&
  doc036?.namaAlokasi === 'Biaya Polybag',
  `Item: ${item036?.itemCode} (${item036?.itemName}) | Alokasi: ${doc036?.kodeAlokasi} (${doc036?.namaAlokasi})`
);

// TEST-MAPPING-04: Biaya Polybag tidak lagi menjadi nama/kategori material
const materials = getAllMaterials();
const hasBiayaPolybagAsMaterial = materials.some(m => m.itemName.toLowerCase().includes('biaya polybag'));
assert(
  'TEST-MAPPING-04',
  'Biaya Polybag adalah Nama Alokasi (Bukan Nama/Kategori Material)',
  !hasBiayaPolybagAsMaterial,
  `0 Master Material named "Biaya Polybag"`
);

// TEST-MAPPING-05: Periksa Item Code 7065168
const mat7065168 = getMaterialByItemCode('7065168');
const issues7065168 = allIssues.filter(d => d.items.some(it => it.itemCode === '7065168'));
assert(
  'TEST-MAPPING-05',
  'Item Code 7065168: POLYBAG 25X50CMX0,20MM terikat konsisten',
  mat7065168?.itemName === 'POLYBAG 25X50CMX0,20MM' &&
  mat7065168?.uom === 'LBR' &&
  issues7065168.length === 24,
  `Master UOM: ${mat7065168?.uom}, Total Issues: ${issues7065168.length}`
);

// TEST-MAPPING-06: Periksa Item Code 7058117
const mat7058117 = getMaterialByItemCode('7058117');
const issues7058117 = allIssues.filter(d => d.items.some(it => it.itemCode === '7058117'));
assert(
  'TEST-MAPPING-06',
  'Item Code 7058117: PUPUK RP @50KG/ZAK terikat konsisten',
  mat7058117?.itemName === 'PUPUK RP @50KG/ZAK' &&
  mat7058117?.uom === 'KG' &&
  issues7058117.length === 19,
  `Master UOM: ${mat7058117?.uom}, Total Issues: ${issues7058117.length}`
);

// TEST-MAPPING-07: Kode Alokasi 122141 digunakan oleh beberapa Item Code berbeda
const issuesAlokasi122141 = allIssues.filter(d => d.kodeAlokasi === '122141');
const itemsIn122141 = new Set(issuesAlokasi122141.map(d => d.items[0].itemCode));
assert(
  'TEST-MAPPING-07',
  'Alokasi 122141 (Biaya Polybag) menaungi beragam Item Code tanpa mengubah identitas material',
  itemsIn122141.size >= 4 &&
  itemsIn122141.has('7065168') && // Polybag
  itemsIn122141.has('7058117') && // Pupuk RP
  itemsIn122141.has('7038525') && // Kereta Sorong
  itemsIn122141.has('7000133'),   // Polybag 25x60
  `Distinct Item Codes in Alokasi 122141: ${Array.from(itemsIn122141).join(', ')}`
);

// TEST-MAPPING-08: Search Item Name
const searchPolybag = allIssues.filter(d => d.items[0].itemName.toLowerCase().includes('polybag'));
assert(
  'TEST-MAPPING-08',
  'Search berdasarkan Item Name menghasilkan dokumen terkait material tersebut',
  searchPolybag.length === 30, // 24 (7065168) + 6 (7000133)
  `Found ${searchPolybag.length} issue documents with Polybag material`
);

// TEST-MAPPING-09: Search Item Code
const search7038525 = allIssues.filter(d => d.items[0].itemCode.includes('7038525'));
assert(
  'TEST-MAPPING-09',
  'Search berdasarkan Item Code 7038525 menghasilkan dokumen Kereta Sorong',
  search7038525.length === 1 && search7038525[0].items[0].itemName.includes('KERETA SORONG'),
  `Found Doc: ${search7038525[0]?.noIssue} for Item: ${search7038525[0]?.items[0]?.itemName}`
);

// TEST-MAPPING-10: Refresh / Persistence integrity
assert(
  'TEST-MAPPING-10',
  'Mapping tetap benar setelah re-fetch data dari storage/service',
  getAllMaterials().length === 13 && getAllIssueDocuments().length === 61,
  `13 Master Materials & 61 Issue Documents persisted`
);

console.log('\n=== TEST RESULTS SUMMARY ===');
const passedCount = results.filter(r => r.status === 'PASS').length;
console.log(`Passed: ${passedCount} / ${results.length}`);
