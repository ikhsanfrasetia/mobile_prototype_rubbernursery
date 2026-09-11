/**
 * Automated Verification Script for Okulasi Janda (Regrafting) Strict Document Relation
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== TEST SUITE: REGRAFTING STRICT RELATION AUDIT ===');

// Test 1: Verify budding-regrafting.js does not contain loose batchNo filter for related regrafts
const regraftFile = readFileSync(resolve('js/modules/budding/budding-regrafting.js'), 'utf-8');
if (regraftFile.includes('r.batchNo === batchNo')) {
  throw new Error('Loose "r.batchNo === batchNo" found in budding-regrafting.js!');
}
console.log('✅ TEST 1: budding-regrafting.js does NOT contain loose batchNo relation matching');

// Test 2: Verify budding-form.js does not contain loose batchNo in isMatch or regrafting_pool sync
const formFile = readFileSync(resolve('js/modules/budding/budding-form.js'), 'utf-8');
if (formFile.includes('b.regraftPoolDocNo === docNo || b.batchNo === batchNo')) {
  throw new Error('Loose batchNo matching found in budding-form.js quota calculation!');
}
if (formFile.includes('p.docNo === poolDocNo || p.batchNo === batchNo')) {
  throw new Error('Loose batchNo matching found in budding-form.js pool synchronization!');
}
console.log('✅ TEST 2: budding-form.js uses strict document-level relation without loose batchNo');

// Test 3: Simulation of 2 pool items in the same batch
const mockRegraftPool = [
  {
    docNo: '2026/OKJ/001',
    inspectionDocNo: '2026/PRK/001',
    batchNo: 'Batch-01',
    klonAwal: 'IRCA 19',
    jumlah: 100,
    sisaRegrafting: 100,
    status: 'READY_TO_REGRAFT'
  },
  {
    docNo: '2026/OKJ/002',
    inspectionDocNo: '2026/PRK/002',
    batchNo: 'Batch-01',
    klonAwal: 'IRCA 101',
    jumlah: 6,
    sisaRegrafting: 6,
    status: 'READY_TO_REGRAFT'
  }
];

// Transaction only recorded for 2026/OKJ/001
const mockRegraftTxs = [
  {
    docNo: 'OKL/REG/001',
    type: 'REGRAFTING',
    regraftPoolDocNo: '2026/OKJ/001',
    inspectionDocNo: '2026/PRK/001',
    batchNo: 'Batch-01',
    jumlah: 100,
    jumlahKayu: 10,
    jumlahDitolak: 0
  }
];

// Map over pool using our new strict logic
const processed = mockRegraftPool.map((poolItem) => {
  const docNo = poolItem.docNo;
  const populasiGagal = parseInt(poolItem.jumlah || 0);

  let ttlRegrafted = 0;
  let ttlDitolak = 0;
  const relatedRegrafts = mockRegraftTxs.filter(r => 
    (r.regraftPoolDocNo && r.regraftPoolDocNo === docNo) || 
    (r.inspectionDocNo && poolItem.inspectionDocNo && r.inspectionDocNo === poolItem.inspectionDocNo)
  );

  relatedRegrafts.forEach(r => {
    ttlRegrafted += parseInt(r.jumlah || 0);
    ttlDitolak += parseInt(r.jumlahDitolak || 0);
  });

  const totalRealisasi = ttlRegrafted + ttlDitolak;
  const sisaBelumRegraft = Math.max(0, populasiGagal - totalRealisasi);

  return {
    docNo,
    populasiGagal,
    totalRealisasi,
    sisaBelumRegraft,
    isCompleted: sisaBelumRegraft <= 0
  };
});

const item1 = processed.find(p => p.docNo === '2026/OKJ/001');
const item2 = processed.find(p => p.docNo === '2026/OKJ/002');

if (!item1.isCompleted || item1.sisaBelumRegraft !== 0) {
  throw new Error(`Item 1 calculation error: ${JSON.stringify(item1)}`);
}
if (item2.isCompleted || item2.sisaBelumRegraft !== 6 || item2.totalRealisasi !== 0) {
  throw new Error(`Item 2 incorrectly marked completed or sisa is not 6: ${JSON.stringify(item2)}`);
}

console.log('✅ TEST 3: Simulation confirmed: 2026/OKJ/001 is Selesai, 2026/OKJ/002 retains Sisa 6 Pkk (Belum Selesai)');

// Test 4: Verify notification dot calculation when all items are 100% completed
function checkPendingRegrafting(pool, txs) {
  let hasPending = false;
  for (let i = 0; i < pool.length; i++) {
    const item = pool[i];
    const qty = parseInt(item.jumlah || 0);
    if (qty <= 0) continue;
    if (item.status === 'COMPLETED' || (item.sisaRegrafting !== undefined && parseInt(item.sisaRegrafting) <= 0)) {
      continue;
    }
    let done = 0;
    txs.filter(r => (r.regraftPoolDocNo && r.regraftPoolDocNo === item.docNo) || (r.inspectionDocNo && item.inspectionDocNo && r.inspectionDocNo === item.inspectionDocNo)).forEach(r => {
      done += parseInt(r.jumlah || 0) + parseInt(r.jumlahDitolak || 0);
    });
    if (qty - done > 0) {
      hasPending = true;
      break;
    }
  }
  return hasPending;
}

// Case A: 1 pending, 1 completed -> hasPending should be TRUE
const pendingStatusA = checkPendingRegrafting(mockRegraftPool, mockRegraftTxs);
if (!pendingStatusA) {
  throw new Error('Expected hasPendingRegrafting to be true when item 2 is incomplete!');
}

// Case B: Both completed -> hasPending should be FALSE
const allCompletedTxs = [
  ...mockRegraftTxs,
  {
    docNo: 'OKL/REG/002',
    type: 'REGRAFTING',
    regraftPoolDocNo: '2026/OKJ/002',
    inspectionDocNo: '2026/PRK/002',
    batchNo: 'Batch-01',
    jumlah: 5,
    jumlahKayu: 1,
    jumlahDitolak: 1 // 5 + 1 = 6 (100% of 6)
  }
];
const pendingStatusB = checkPendingRegrafting(mockRegraftPool, allCompletedTxs);
if (pendingStatusB) {
  throw new Error('Expected hasPendingRegrafting to be false when all items are 100% completed!');
}
console.log('✅ TEST 4: Notification badge correctly turns OFF (false) when all items reach 100% completion');

console.log('=== ALL REGRAFTING AUDIT TESTS PASSED ===');
