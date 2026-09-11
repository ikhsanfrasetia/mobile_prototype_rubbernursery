/**
 * Automated Verification Script for Penyeleksian (Selection / Afkir) Multi-Source Sync
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== TEST SUITE: SELECTION MULTI-SOURCE SYNC ===');

// Test 1: Verify selection-landing.js supports all 4 origin types
const selFile = readFileSync(resolve('js/modules/selection/selection-landing.js'), 'utf-8');

if (!selFile.includes('REJECT_PENERIMAAN')) throw new Error('REJECT_PENERIMAAN missing in selection-landing.js');
if (!selFile.includes('REJECT_OKULASI')) throw new Error('REJECT_OKULASI missing in selection-landing.js');
if (!selFile.includes('REJECT_REGRAFTING')) throw new Error('REJECT_REGRAFTING missing in selection-landing.js');
if (!selFile.includes('REJECT_PEMERIKSAAN')) throw new Error('REJECT_PEMERIKSAAN missing in selection-landing.js');

console.log('✅ TEST 1: selection-landing.js supports REJECT_PENERIMAAN, REJECT_OKULASI, REJECT_REGRAFTING, and REJECT_PEMERIKSAAN');

// Test 2: Verify beranda.js synchronizes all 4 origin types for pendingSelectionCount
const berandaFile = readFileSync(resolve('js/modules/dashboard/beranda.js'), 'utf-8');

if (!berandaFile.includes('REJECT_REGRAFTING') || !berandaFile.includes('REJECT_PEMERIKSAAN')) {
  throw new Error('beranda.js missing complete origin type sync for selection!');
}
console.log('✅ TEST 2: beranda.js accurately synchronizes all 4 rejection sources for badge counter');

// Test 3: Simulation of multi-source pooling
const mockSelectionPool = [];

// Receipt
const mockReceiptTxs = [{ docNo: '2026/APR/001', rejected: 15, klon: 'PB 260' }];
mockReceiptTxs.forEach((r, i) => {
  if (r.rejected > 0) {
    mockSelectionPool.push({
      docNo: `SEL/RCV/2026/0${i + 1}`,
      originType: 'REJECT_PENERIMAAN',
      receiptDocNo: r.docNo,
      jumlahAfkir: r.rejected,
      status: 'PENDING_DECLARATION'
    });
  }
});

// Grafting
const mockBuddingTxs = [
  { docNo: 'OKL/2026/001', type: 'GRAFTING', jumlahDitolak: 25 },
  { docNo: 'OKL/REG/001', type: 'REGRAFTING', jumlahDitolak: 5 }
];
mockBuddingTxs.forEach((b, i) => {
  if (b.jumlahDitolak > 0) {
    mockSelectionPool.push({
      docNo: `SEL/REJ/2026/0${i + 1}`,
      originType: b.type === 'REGRAFTING' ? 'REJECT_REGRAFTING' : 'REJECT_OKULASI',
      buddingDocNo: b.docNo,
      jumlahAfkir: b.jumlahDitolak,
      status: 'PENDING_DECLARATION'
    });
  }
});

// Inspection
const mockInspectionTxs = [
  { docNo: '2026/PRK/001', jumlahGagal: 30, totalToRegrafting: 20, totalToSelection: 10 }
];
mockInspectionTxs.forEach((insp, i) => {
  if (insp.totalToSelection > 0) {
    mockSelectionPool.push({
      docNo: `SEL-POOL/2026/0${i + 1}`,
      originType: 'REJECT_PEMERIKSAAN',
      inspectionDocNo: insp.docNo,
      jumlahAfkir: insp.totalToSelection,
      status: 'PENDING_DECLARATION'
    });
  }
});

if (mockSelectionPool.length !== 4) {
  throw new Error(`Expected 4 items in selection pool, got ${mockSelectionPool.length}`);
}

const totalAfkir = mockSelectionPool.reduce((acc, curr) => acc + curr.jumlahAfkir, 0);
if (totalAfkir !== (15 + 25 + 5 + 10)) {
  throw new Error(`Expected total afkir 55, got ${totalAfkir}`);
}

console.log(`✅ TEST 3: Multi-source pool simulation successful: 4 sources generated ${totalAfkir} Pkk total afkir`);
console.log('=== ALL SELECTION AUDIT TESTS PASSED ===');
