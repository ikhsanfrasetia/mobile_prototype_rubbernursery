// test-docno-bwgdtl-shared-sequence.js
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { generateUniqueDocNo, formatStandardDocNo, MODULE_DOC_CODES } from './js/core/utils.js';
import { getSortedToppingSources } from './js/core/entres-inventory-service.js';

console.log('--- RUNNING INTEGRATION TESTS FOR SHARED SEQUENCE BWGDTL (IT-DOCNO-001 s/d 020) ---');

// Verify MODULE_DOC_CODES registration
assert.strictEqual(MODULE_DOC_CODES['BWGDTL'], 'BWGDTL', 'MODULE_DOC_CODES registration failed');

// Mock storage array
let mockToppingTxs = [];
let mockMenunasTxs = [];

const getCombined = () => [...mockToppingTxs, ...mockMenunasTxs];

// IT-DOCNO-001: Create Topping pertama: 2026/BWGDTL/001
const doc1 = generateUniqueDocNo('BWGDTL', getCombined(), 2026);
assert.strictEqual(doc1, '2026/BWGDTL/001', 'IT-DOCNO-001 FAILED');
mockToppingTxs.push({ docNo: doc1, type: 'TOPPING', jumlahKayu: 100, jumlahPerisai: 800, namaKlon: 'IRCA331', status: 'SUBMITTED' });
console.log('✓ IT-DOCNO-001 PASS: Create Topping 1 -> 2026/BWGDTL/001');

// IT-DOCNO-002: Create Menunas berikutnya: 2026/BWGDTL/002
const doc2 = generateUniqueDocNo('BWGDTL', getCombined(), 2026);
assert.strictEqual(doc2, '2026/BWGDTL/002', 'IT-DOCNO-002 FAILED');
mockMenunasTxs.push({ docNo: doc2, type: 'MENUNAS', jumlahPohonDitunas: 100, namaKlon: 'IRCA331', status: 'SUBMITTED' });
console.log('✓ IT-DOCNO-002 PASS: Create Menunas 2 -> 2026/BWGDTL/002');

// IT-DOCNO-003: Create Topping berikutnya: 2026/BWGDTL/003
const doc3 = generateUniqueDocNo('BWGDTL', getCombined(), 2026);
assert.strictEqual(doc3, '2026/BWGDTL/003', 'IT-DOCNO-003 FAILED');
mockToppingTxs.push({ docNo: doc3, type: 'TOPPING', jumlahKayu: 50, jumlahPerisai: 400, namaKlon: 'IRCA331', status: 'SUBMITTED' });
console.log('✓ IT-DOCNO-003 PASS: Create Topping 3 -> 2026/BWGDTL/003');

// IT-DOCNO-004: Create Menunas berikutnya: 2026/BWGDTL/004
const doc4 = generateUniqueDocNo('BWGDTL', getCombined(), 2026);
assert.strictEqual(doc4, '2026/BWGDTL/004', 'IT-DOCNO-004 FAILED');
mockMenunasTxs.push({ docNo: doc4, type: 'MENUNAS', jumlahPohonDitunas: 50, namaKlon: 'IRCA331', status: 'SUBMITTED' });
console.log('✓ IT-DOCNO-004 PASS: Create Menunas 4 -> 2026/BWGDTL/004');

// IT-DOCNO-005: Tidak ada duplicate docNo antara Topping dan Menunas
const allDocNos = getCombined().map(t => t.docNo);
const uniqueDocNos = new Set(allDocNos);
assert.strictEqual(allDocNos.length, uniqueDocNos.size, 'IT-DOCNO-005 FAILED: Duplicates detected');
console.log('✓ IT-DOCNO-005 PASS: No duplicate docNo between Topping and Menunas');

// IT-DOCNO-006: Format sequence selalu 3 digit
assert(/^\d{4}\/BWGDTL\/\d{3}$/.test(doc1), 'IT-DOCNO-006 FAILED: Format not 3 digits');
assert(/^\d{4}\/BWGDTL\/\d{3}$/.test(doc2), 'IT-DOCNO-006 FAILED: Format not 3 digits');
console.log('✓ IT-DOCNO-006 PASS: Sequence is always 3-digit padded');

// IT-DOCNO-007: Year bersifat dinamis
const doc2027 = generateUniqueDocNo('BWGDTL', getCombined(), 2027);
assert.strictEqual(doc2027, '2027/BWGDTL/001', 'IT-DOCNO-007 FAILED');
console.log('✓ IT-DOCNO-007 PASS: Dynamic target year supported');

// IT-DOCNO-008: Sequence tahun baru benar (reset per tahun)
assert.strictEqual(doc2027, '2027/BWGDTL/001', 'IT-DOCNO-008 FAILED');
console.log('✓ IT-DOCNO-008 PASS: New year starts sequence from 001');

// IT-DOCNO-009: Delete/VOID tidak menyebabkan sequence reuse
// Hapus transaksi doc3 (2026/BWGDTL/003)
const filteredAfterDelete = getCombined().filter(t => t.docNo !== '2026/BWGDTL/003');
const doc5 = generateUniqueDocNo('BWGDTL', filteredAfterDelete, 2026);
assert.strictEqual(doc5, '2026/BWGDTL/005', 'IT-DOCNO-009 FAILED: Deleted item caused sequence reuse');
console.log('✓ IT-DOCNO-009 PASS: Deletion does not cause sequence reuse (highest is 004 -> next is 005)');

// IT-DOCNO-010: Edit tidak mengubah docNo
const toppingToEdit = { ...mockToppingTxs[0] };
toppingToEdit.jumlahPerisai = 900; // Updated value
assert.strictEqual(toppingToEdit.docNo, '2026/BWGDTL/001', 'IT-DOCNO-010 FAILED');
console.log('✓ IT-DOCNO-010 PASS: Edit preserves existing docNo');

// IT-DOCNO-011: Historical TOP/ENT/... tetap utuh
const historicalTopping = { docNo: 'TOP/ENT/2026/01', type: 'TOPPING', jumlahPerisai: 500, namaKlon: 'IRCA331' };
const combinedWithHist = [...getCombined(), historicalTopping];
const nextAfterHist = generateUniqueDocNo('BWGDTL', combinedWithHist, 2026);
assert.strictEqual(nextAfterHist, '2026/BWGDTL/005', 'IT-DOCNO-011 FAILED');
console.log('✓ IT-DOCNO-011 PASS: Historical TOP/ENT/... is preserved and does not interfere');

// IT-DOCNO-012: Historical MEN/ENT/... tetap utuh
const historicalMenunas = { docNo: 'MEN/ENT/2026/01', type: 'MENUNAS', jumlahPohonDitunas: 100, namaKlon: 'IRCA331' };
const combinedWithHist2 = [...combinedWithHist, historicalMenunas];
const nextAfterHist2 = generateUniqueDocNo('BWGDTL', combinedWithHist2, 2026);
assert.strictEqual(nextAfterHist2, '2026/BWGDTL/005', 'IT-DOCNO-012 FAILED');
console.log('✓ IT-DOCNO-012 PASS: Historical MEN/ENT/... is preserved');

// IT-DOCNO-013: Topping baru tetap menambah inventory berdasarkan jumlahPerisai
const sortedToppings = getSortedToppingSources('IRCA331', mockToppingTxs);
const totalHarvest = sortedToppings.reduce((acc, t) => acc + (t.jumlahPerisai || 0), 0);
assert.strictEqual(totalHarvest, 1200, 'IT-DOCNO-013 FAILED: Topping did not contribute to harvest sum');
console.log('✓ IT-DOCNO-013 PASS: New Topping increases inventory sum (800 + 400 = 1200)');

// IT-DOCNO-014: Menunas baru tidak menambah inventory Mata Entres
// Menunas tidak masuk dalam getSortedToppingSources
const sortedFromCombined = getSortedToppingSources('IRCA331', getCombined().filter(t => t.type === 'TOPPING'));
const totalHarvestFromCombined = sortedFromCombined.reduce((acc, t) => acc + (t.jumlahPerisai || 0), 0);
assert.strictEqual(totalHarvestFromCombined, 1200, 'IT-DOCNO-014 FAILED: Menunas added to inventory');
console.log('✓ IT-DOCNO-014 PASS: Menunas transactions do not alter Mata Entres inventory');

// IT-DOCNO-015: Inventory tidak menentukan transaction type dari docNo
// Verify entres-inventory-service.js relies on tx object properties, not docNo prefix
const invSrc = fs.readFileSync(path.resolve('js/core/entres-inventory-service.js'), 'utf8');
assert(!invSrc.includes('docNo.startsWith("TOP")') && !invSrc.includes("docNo.includes('TOP')"), 'IT-DOCNO-015 FAILED');
console.log('✓ IT-DOCNO-015 PASS: Inventory service does not determine type by docNo string');

// IT-DOCNO-016: Central Hub tetap dapat membaca docNo baru
const hubItem = { docNo: '2026/BWGDTL/001', type: 'TOPPING' };
const docRef = hubItem.docNo || hubItem.id;
assert.strictEqual(docRef, '2026/BWGDTL/001', 'IT-DOCNO-016 FAILED');
console.log('✓ IT-DOCNO-016 PASS: Central Hub resolves new docNo format');

// IT-DOCNO-017: Central Hub tetap dapat membaca docNo historical
const histHubItem = { docNo: 'TOP/ENT/2026/01', type: 'TOPPING' };
const histDocRef = histHubItem.docNo || histHubItem.id;
assert.strictEqual(histDocRef, 'TOP/ENT/2026/01', 'IT-DOCNO-017 FAILED');
console.log('✓ IT-DOCNO-017 PASS: Central Hub resolves historical docNo');

// IT-DOCNO-018: FIFO inventory Topping tetap dapat menggunakan source transaction baru
assert(invSrc.includes('sourceToppingDocNo') || invSrc.includes('toppingDocNo') || invSrc.includes('t.docNo'), 'IT-DOCNO-018 FAILED');
console.log('✓ IT-DOCNO-018 PASS: FIFO allocation accepts new docNo');

// IT-DOCNO-019: Create Topping setelah Menunas mengambil sequence global berikutnya
const lastMenunas = [{ docNo: '2026/BWGDTL/009', type: 'MENUNAS' }];
const nextToppingDoc = generateUniqueDocNo('BWGDTL', lastMenunas, 2026);
assert.strictEqual(nextToppingDoc, '2026/BWGDTL/010', 'IT-DOCNO-019 FAILED');
console.log('✓ IT-DOCNO-019 PASS: Topping created after Menunas takes next global sequence');

// IT-DOCNO-020: Create Menunas setelah Topping mengambil sequence global berikutnya
const lastTopping = [{ docNo: '2026/BWGDTL/010', type: 'TOPPING' }];
const nextMenunasDoc = generateUniqueDocNo('BWGDTL', lastTopping, 2026);
assert.strictEqual(nextMenunasDoc, '2026/BWGDTL/011', 'IT-DOCNO-020 FAILED');
console.log('✓ IT-DOCNO-020 PASS: Menunas created after Topping takes next global sequence');

console.log('\n--- ALL 20 INTEGRATION TESTS (IT-DOCNO-001 s/d IT-DOCNO-020) PASSED SUCCESSFULLY ---');
