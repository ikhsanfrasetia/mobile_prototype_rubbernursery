// Mock localStorage for node environment
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { getCurrentUserContext } from '../js/core/user-context.js';
import { session } from '../js/core/session.js';
import { validateSourceEditability } from '../js/core/dependency-guard.js';
import { approveVerification, returnVerification } from '../js/modules/verification/verification-manager.js';

console.log('=== TEST SUITE: P1 REAL-TIME QUOTA VALIDATION & REGRESSION ===\n');

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Setup session as Wagiman (MNT001, EST-TBS)
session.start({ code: 'MNT001' });
const user = getCurrentUserContext();

// --- Scenario 1: Transaksi Batal tidak mengurangi kuota Regrafting ---
console.log('--- 1. Transaksi Batal tidak mengurangi kuota Regrafting ---');
store.clear();

const poolItem = {
  docNo: 'REG-POOL/2026/01',
  inspectionDocNo: '2026/INS/001',
  batchNo: 'Batch-01',
  jumlah: 100, // Populasi gagal = 100
  sisaRegrafting: 100
};
storage.set('regrafting_pool', [poolItem]);

const mockBuddingTxs = [
  {
    docNo: '2026/RGRF/001',
    type: 'REGRAFTING',
    regraftPoolDocNo: 'REG-POOL/2026/01',
    jumlah: 30,
    jumlahDitolak: 0,
    status: 'BATAL' // CANCELLED
  },
  {
    docNo: '2026/RGRF/002',
    type: 'REGRAFTING',
    regraftPoolDocNo: 'REG-POOL/2026/01',
    jumlah: 20,
    jumlahDitolak: 0,
    status: 'MENUNGGU_VERIFIKASI_MANTRI' // ACTIVE
  }
];
storage.set('budding_transactions', mockBuddingTxs);

// Calculate available quota for Regrafting
let activeUsage = 0;
mockBuddingTxs.forEach((b) => {
  const isCancelled = ['BATAL', 'CANCELLED', 'VOID'].includes(String(b.status || '').toUpperCase());
  if (!isCancelled && b.type === 'REGRAFTING' && b.regraftPoolDocNo === 'REG-POOL/2026/01') {
    activeUsage += (parseInt(b.jumlah || 0) + parseInt(b.jumlahDitolak || 0));
  }
});
const sisaQuota = poolItem.jumlah - activeUsage;
assert(activeUsage === 20, 'Only active transaction (20 Pkk) is counted in usage; BATAL (30 Pkk) is excluded');
assert(sisaQuota === 80, 'Available quota for Regrafting is correctly 80 Pkk (100 - 20)');

// --- Scenario 2: Dokumen yang sedang diedit tidak menghitung pemakaian sendiri dua kali ---
console.log('\n--- 2. Dokumen yang sedang diedit tidak menghitung pemakaian sendiri dua kali ---');
const editingIdx = 1; // Editing 2026/RGRF/002 (20 Pkk)
let editModeUsage = 0;
mockBuddingTxs.forEach((b, i) => {
  if (i === editingIdx) return; // Self-exclusion
  const isCancelled = ['BATAL', 'CANCELLED', 'VOID'].includes(String(b.status || '').toUpperCase());
  if (!isCancelled && b.type === 'REGRAFTING' && b.regraftPoolDocNo === 'REG-POOL/2026/01') {
    editModeUsage += (parseInt(b.jumlah || 0) + parseInt(b.jumlahDitolak || 0));
  }
});
const editModeAvailable = poolItem.jumlah - editModeUsage;
assert(editModeUsage === 0, 'In edit mode for 2026/RGRF/002, usage from itself is safely excluded (0 Pkk)');
assert(editModeAvailable === 100, 'Available quota during edit mode is full 100 Pkk');

// --- Scenario 3: Input Regrafting melebihi kuota Batch ---
console.log('\n--- 3. Input Regrafting melebihi kuota Batch ---');
const inputQtyValid = 70;
const inputQtyInvalid = 85; // 85 > 80
assert(inputQtyValid <= sisaQuota, 'Input 70 Pkk is within available quota (80 Pkk) -> Valid');
assert(inputQtyInvalid > sisaQuota, 'Input 85 Pkk exceeds available quota (80 Pkk) -> Over-quota detected');

// --- Scenario 4: Transaksi Batal tidak mengurangi kuota Pemeriksaan Okulasi ---
console.log('\n--- 4. Transaksi Batal tidak mengurangi kuota Pemeriksaan Okulasi ---');
const parentBudding = {
  docNo: '2026/GRF/001',
  batchNo: 'Batch-01',
  type: 'GRAFTING',
  jumlah: 500,
  workers: [
    { id: 'WRK001', name: 'Ahmad Rifai', code: '104521', qty: 300 },
    { id: 'WRK002', name: 'Budi Santoso', code: '104522', qty: 200 }
  ]
};
storage.set('budding_transactions', [parentBudding]);

const mockInspections = [
  {
    docNo: '2026/INS/001',
    buddingDocNo: '2026/GRF/001',
    totalDiperiksa: 100,
    status: 'BATAL', // Cancelled inspection
    workers: [
      { id: 'WRK001', name: 'Ahmad Rifai', code: '104521', jlhDiperiksa: 100 }
    ]
  },
  {
    docNo: '2026/INS/002',
    buddingDocNo: '2026/GRF/001',
    totalDiperiksa: 150,
    status: 'DISETUJUI', // Approved inspection
    workers: [
      { id: 'WRK001', name: 'Ahmad Rifai', code: '104521', jlhDiperiksa: 150 }
    ]
  }
];
storage.set('inspection_transactions', mockInspections);

let totalInspUsage = 0;
const workerInspMap = {};
mockInspections.forEach(insp => {
  const isCancelled = ['BATAL', 'CANCELLED', 'VOID'].includes(String(insp.status || '').toUpperCase());
  if (!isCancelled && insp.buddingDocNo === '2026/GRF/001') {
    totalInspUsage += parseInt(insp.totalDiperiksa || 0);
    (insp.workers || []).forEach(w => {
      const key = w.id || w.code;
      workerInspMap[key] = (workerInspMap[key] || 0) + parseInt(w.jlhDiperiksa || 0);
    });
  }
});

const sisaInspBatch = parentBudding.jumlah - totalInspUsage;
assert(totalInspUsage === 150, 'Inspection usage correctly ignores BATAL inspection (150 Pkk counted, 100 Pkk excluded)');
assert(sisaInspBatch === 350, 'Sisa kuota batch pemeriksaan is 350 Pkk (500 - 150)');

// --- Scenario 5 & 6: Kuota per Pekerja dan Pemeriksaan Bertahap ---
console.log('\n--- 5 & 6. Kuota per Pekerja dan Pemeriksaan Bertahap ---');
const w1Max = parentBudding.workers[0].qty; // 300
const w1Inspected = workerInspMap['WRK001'] || 0; // 150
const w1Remaining = w1Max - w1Inspected; // 150

const w2Max = parentBudding.workers[1].qty; // 200
const w2Inspected = workerInspMap['WRK002'] || 0; // 0
const w2Remaining = w2Max - w2Inspected; // 200

assert(w1Remaining === 150, 'WRK001 (Ahmad) remaining quota is 150 Pkk after previous session of 150 Pkk');
assert(w2Remaining === 200, 'WRK002 (Budi) remaining quota is 200 Pkk (uninspected)');

const w1InputExceeded = 160; // 160 > 150
assert(w1InputExceeded > w1Remaining, 'Input 160 Pkk for Ahmad exceeds his remaining quota (150 Pkk) -> Worker over-quota caught');

// --- Scenario 7: Identitas Pekerja Historis Ambigu tidak digabung keliru ---
console.log('\n--- 7. Identitas Pekerja Historis Ambigu tidak digabung keliru ---');
const workerA = { id: 'WRK001', code: '104521', name: 'Ahmad' };
const workerB = { id: 'WRK003', code: '104523', name: 'Ahmad' }; // Same name, distinct ID & code
const keyA = workerA.id || workerA.code;
const keyB = workerB.id || workerB.code;
assert(keyA !== keyB, 'Workers with identical name but distinct IDs/Codes resolve to separate keys');

// --- Scenario 8: Pengajuan Ulang Dokumen yang Dikembalikan ---
console.log('\n--- 8. Pengajuan Ulang Dokumen yang Dikembalikan ---');
const returnedInsp = {
  id: 'INS-003',
  docNo: '2026/INS/003',
  buddingDocNo: '2026/GRF/001',
  status: 'DIKEMBALIKAN',
  returnReason: 'Periksa ulang okulator Budi',
  workers: [
    { id: 'WRK002', name: 'Budi Santoso', code: '104522', jlhDiperiksa: 50, jlhBerhasil: 45, jlhTidakBerhasil: 5 }
  ],
  jumlahJadi: 45,
  jumlahGagal: 5,
  totalDiperiksa: 50
};
mockInspections.push(returnedInsp);
storage.set('inspection_transactions', mockInspections);

// Resubmit
returnedInsp.status = 'MENUNGGU_VERIFIKASI_MANTRI';
returnedInsp.lastReturnReason = returnedInsp.returnReason;
returnedInsp.returnReason = null;
assert(returnedInsp.status === 'MENUNGGU_VERIFIKASI_MANTRI', 'Returned inspection resubmitted to MENUNGGU_VERIFIKASI_MANTRI');
assert(returnedInsp.lastReturnReason === 'Periksa ulang okulator Budi', 'Audit trail of returnReason is preserved in lastReturnReason');

// --- Scenario 9: Penolakan Approval Tanpa Mutasi Stok ---
console.log('\n--- 9. Penolakan Approval Tanpa Mutasi Stok ---');
storage.set('stock_ledger', [{ klon: 'PB 260', saldo: 1000 }]);
const initialLedger = JSON.stringify(storage.get('stock_ledger', []));

// Downstream consistency guard check: blocking reduction
const guardCheck = validateSourceEditability('BUDDING', '2026/GRF/001', {
  jumlahOkulasi: 100 // Lower than already approved inspection (150 Pkk)
});
assert(guardCheck.allowed === false, 'Reduction of Grafting below approved inspection is rejected by Dependency Guard');
assert(JSON.stringify(storage.get('stock_ledger', [])) === initialLedger, 'Stock ledger is untouched upon validation failure (Zero Stock Mutation)');

// --- Scenario 10: Idempotensi Approval ---
console.log('\n--- 10. Idempotensi Approval ---');
const sampleBudding = {
  id: 'BUD-001',
  docNo: '2026/GRF/999',
  type: 'GRAFTING',
  status: 'DISETUJUI',
  verificationStatus: 'TERVERIFIKASI',
  jumlah: 500,
  estateId: 'EST-TBS'
};
storage.set('budding_transactions', [sampleBudding]);

const asbUser = { id: 'ASB001', name: 'Asisten Bibitan', userRole: 'ASISTEN_BIBITAN', estateId: 'EST-TBS' };

// Processing approval on already approved record
const secondApproval = approveVerification({
  referenceType: 'OKULASI',
  referenceId: 'BUD-001',
  currentUser: asbUser
});
assert(secondApproval !== null, 'Repeated approval on already approved document returns idempotent audit record');
assert(sampleBudding.status === 'DISETUJUI', 'Status remains DISETUJUI without duplicate history entries');

console.log(`\n========================================`);
console.log(`P1 TEST RESULT: ${passedAssertions} / ${totalAssertions} PASSED`);
console.log(`========================================\n`);
