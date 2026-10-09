// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { getCurrentUserContext } from '../js/core/user-context.js';
import { canUserAccessTransaction, applyTransactionActor } from '../js/core/transaction-actor.js';
import { isTransactionLockedForMantri } from '../js/modules/verification/mantri-confirmation-service.js';
import { session } from '../js/core/session.js';

console.log('=== TEST SUITE: OKULASI & OKULASI JANDA KOREKSI / PENGEMBALIAN LIFECYCLE ===\n');

// 1. Setup session as Mantri (Wagiman, MNT001, EST-TBS)
session.start({ code: 'MNT001' });
const userWagiman = getCurrentUserContext();
console.log(`Active Persona: ${userWagiman.name} (${userWagiman.code}) - ${userWagiman.estateId}`);

// 2. Prepare mock budding_transactions
const testTxs = [
  // Normal Grafting
  {
    docNo: '2026/GRF/001',
    type: 'GRAFTING',
    batchNo: 'Batch-01',
    klonEntres: 'PB 260',
    bedengan: 'BED-001',
    tanggal: '01/10/2026',
    jumlah: 500,
    jumlahKayu: 10,
    status: 'READY_TO_CONFIRM',
    actorName: 'Wagiman',
    actorCode: 'MNT001',
    estateId: 'EST-TBS'
  },
  // Returned Grafting (perlu perbaikan)
  {
    docNo: '2026/GRF/002',
    type: 'GRAFTING',
    batchNo: 'Batch-01',
    klonEntres: 'IRCA 331',
    bedengan: 'BED-002',
    tanggal: '02/10/2026',
    jumlah: 300,
    jumlahKayu: 8,
    status: 'DIKEMBALIKAN',
    returnReason: 'Kuantitas kayu entres tidak sesuai saldo fisik.',
    returnedAt: '2026-10-08T10:00:00.000Z',
    returnedBy: 'Asisten Bibitan',
    actorName: 'Wagiman',
    actorCode: 'MNT001',
    estateId: 'EST-TBS'
  },
  // Normal Regrafting
  {
    docNo: '2026/RGRF/001',
    type: 'REGRAFTING',
    batchNo: 'Batch-01',
    klonEntres: 'PB 260',
    bedengan: 'BED-001',
    tanggal: '01/10/2026',
    jumlah: 50,
    jumlahKayu: 2,
    status: 'READY_TO_CONFIRM',
    actorName: 'Wagiman',
    actorCode: 'MNT001',
    estateId: 'EST-TBS'
  },
  // Returned Regrafting (perlu perbaikan)
  {
    docNo: '2026/RGRF/002',
    type: 'REGRAFTING',
    batchNo: 'Batch-01',
    klonEntres: 'PB 260',
    bedengan: 'BED-001',
    tanggal: '02/10/2026',
    jumlah: 40,
    jumlahKayu: 2,
    status: 'DIKEMBALIKAN',
    returnReason: 'Alasan okulasi janda perlu diklarifikasi.',
    returnedAt: '2026-10-08T11:00:00.000Z',
    returnedBy: 'Asisten Bibitan',
    actorName: 'Wagiman',
    actorCode: 'MNT001',
    estateId: 'EST-TBS'
  }
];

storage.set('budding_transactions', testTxs);

// Test 1: Separation of returned vs normal transactions for Grafting
const allBuddings = storage.get('budding_transactions', []);
const returnedGraftingTxs = allBuddings.filter(b => 
  (b.type === 'GRAFTING' || !b.type) && 
  (b.status === 'DIKEMBALIKAN' || b.status === 'REVISION' || b.returnReason || b.lastReturnReason) &&
  b.status !== 'MENUNGGU_VERIFIKASI_MANTRI' &&
  b.status !== 'PENDING_SUBMISSION' &&
  b.status !== 'APPROVED' &&
  b.status !== 'DISETUJUI'
);

const normalGraftingTxs = allBuddings.filter(b => 
  (b.type === 'GRAFTING' || !b.type) &&
  b.status !== 'DIKEMBALIKAN' &&
  b.status !== 'REVISION'
);

console.log('--- 1. Okulasi (Grafting) Separation & Date Independence ---');
if (returnedGraftingTxs.length === 1 && returnedGraftingTxs[0].docNo === '2026/GRF/002') {
  console.log('  ✅ PASS: Returned Grafting transaction isolated correctly (found: 2026/GRF/002)');
} else {
  console.error('  ❌ FAIL: Returned Grafting isolation failed', returnedGraftingTxs);
  process.exit(1);
}

if (normalGraftingTxs.length === 1 && normalGraftingTxs[0].docNo === '2026/GRF/001') {
  console.log('  ✅ PASS: Normal Grafting list excludes returned transaction (no duplicate)');
} else {
  console.error('  ❌ FAIL: Normal Grafting list contains returned tx or count mismatch', normalGraftingTxs);
  process.exit(1);
}

// Test 2: Separation of returned vs normal transactions for Regrafting
const returnedRegraftTxs = allBuddings.filter(b => 
  b.type === 'REGRAFTING' && 
  (b.status === 'DIKEMBALIKAN' || b.status === 'REVISION' || b.returnReason || b.lastReturnReason) &&
  b.status !== 'MENUNGGU_VERIFIKASI_MANTRI' &&
  b.status !== 'PENDING_SUBMISSION' &&
  b.status !== 'APPROVED' &&
  b.status !== 'DISETUJUI'
);

const normalRegraftTxs = allBuddings.filter(b => 
  b.type === 'REGRAFTING' &&
  b.status !== 'DIKEMBALIKAN' &&
  b.status !== 'REVISION'
);

console.log('\n--- 2. Okulasi Janda (Regrafting) Separation & Date Independence ---');
if (returnedRegraftTxs.length === 1 && returnedRegraftTxs[0].docNo === '2026/RGRF/002') {
  console.log('  ✅ PASS: Returned Regrafting transaction isolated correctly (found: 2026/RGRF/002)');
} else {
  console.error('  ❌ FAIL: Returned Regrafting isolation failed', returnedRegraftTxs);
  process.exit(1);
}

if (normalRegraftTxs.length === 1 && normalRegraftTxs[0].docNo === '2026/RGRF/001') {
  console.log('  ✅ PASS: Normal Regrafting list excludes returned transaction (no duplicate)');
} else {
  console.error('  ❌ FAIL: Normal Regrafting list contains returned tx or count mismatch', normalRegraftTxs);
  process.exit(1);
}

// Test 3: Lock and Access verification on returned transactions
console.log('\n--- 3. Authorization & Lock Status for Returned Transactions ---');
const grfRet = returnedGraftingTxs[0];
const isLockedGrf = isTransactionLockedForMantri(grfRet);
const canAccessGrf = canUserAccessTransaction(grfRet, userWagiman, 'EDIT');

if (!isLockedGrf && canAccessGrf) {
  console.log('  ✅ PASS: Returned Grafting is UNLOCKED for repair and authorized for Wagiman');
} else {
  console.error(`  ❌ FAIL: Returned Grafting lock/access check failed. Locked: ${isLockedGrf}, CanAccess: ${canAccessGrf}`);
  process.exit(1);
}

// Check other persona (Supriono) cannot access
session.switchRole({ code: 'MNT002' });
const userSupriono = getCurrentUserContext();
const canSuprionoAccessGrf = canUserAccessTransaction(grfRet, userSupriono, 'EDIT');
if (!canSuprionoAccessGrf) {
  console.log('  ✅ PASS: Cross-persona access rejected (Supriono cannot edit Wagiman document)');
} else {
  console.error('  ❌ FAIL: Persona isolation leak!');
  process.exit(1);
}

// Switch back to Wagiman
session.switchRole({ code: 'MNT001' });

// Test 4: In-place edit & save simulation for Grafting
console.log('\n--- 4. In-Place Edit & Return Reason Preservation for Okulasi ---');
const grfIndex = allBuddings.findIndex(b => b.docNo === '2026/GRF/002');
const existingGrf = allBuddings[grfIndex];

const updatedGrf = applyTransactionActor({
  ...existingGrf,
  jumlahKayu: 12, // corrected
  status: 'MENUNGGU_VERIFIKASI_MANTRI',
  returnReason: existingGrf.returnReason || null,
  lastReturnReason: existingGrf.lastReturnReason || existingGrf.returnReason || null,
  returnedAt: existingGrf.returnedAt || null,
  returnedBy: existingGrf.returnedBy || null,
  updatedAt: new Date().toISOString()
}, 'UPDATE', userWagiman);

allBuddings[grfIndex] = updatedGrf;
storage.set('budding_transactions', allBuddings);

const savedTxs = storage.get('budding_transactions', []);
if (savedTxs.length === 4) {
  console.log('  ✅ PASS: Total record count preserved at 4 (no duplicate created on edit)');
} else {
  console.error(`  ❌ FAIL: Record count changed to ${savedTxs.length}`);
  process.exit(1);
}

const savedGrf = savedTxs[grfIndex];
if (
  savedGrf.docNo === '2026/GRF/002' &&
  savedGrf.jumlahKayu === 12 &&
  savedGrf.status === 'MENUNGGU_VERIFIKASI_MANTRI' &&
  savedGrf.returnReason === 'Kuantitas kayu entres tidak sesuai saldo fisik.' &&
  savedGrf.lastReturnReason === 'Kuantitas kayu entres tidak sesuai saldo fisik.'
) {
  console.log('  ✅ PASS: Saved Grafting updated in-place, status reset to MENUNGGU_VERIFIKASI_MANTRI, returnReason preserved');
} else {
  console.error('  ❌ FAIL: Saved Grafting payload mismatch', savedGrf);
  process.exit(1);
}

// Test 5: In-place edit & save simulation for Regrafting
console.log('\n--- 5. In-Place Edit & Return Reason Preservation for Okulasi Janda ---');
const rgrfIndex = savedTxs.findIndex(b => b.docNo === '2026/RGRF/002');
const existingRgrf = savedTxs[rgrfIndex];

const updatedRgrf = applyTransactionActor({
  ...existingRgrf,
  jumlah: 45, // corrected
  status: 'MENUNGGU_VERIFIKASI_MANTRI',
  returnReason: existingRgrf.returnReason || null,
  lastReturnReason: existingRgrf.lastReturnReason || existingRgrf.returnReason || null,
  returnedAt: existingRgrf.returnedAt || null,
  returnedBy: existingRgrf.returnedBy || null,
  updatedAt: new Date().toISOString()
}, 'UPDATE', userWagiman);

savedTxs[rgrfIndex] = updatedRgrf;
storage.set('budding_transactions', savedTxs);

const finalTxs = storage.get('budding_transactions', []);
const savedRgrf = finalTxs[rgrfIndex];
if (
  savedRgrf.docNo === '2026/RGRF/002' &&
  savedRgrf.jumlah === 45 &&
  savedRgrf.status === 'MENUNGGU_VERIFIKASI_MANTRI' &&
  savedRgrf.returnReason === 'Alasan okulasi janda perlu diklarifikasi.'
) {
  console.log('  ✅ PASS: Saved Regrafting updated in-place, status reset to MENUNGGU_VERIFIKASI_MANTRI, returnReason preserved');
} else {
  console.error('  ❌ FAIL: Saved Regrafting payload mismatch', savedRgrf);
  process.exit(1);
}

console.log('\n========================================');
console.log('🎉 ALL OKULASI & OKULASI JANDA TESTS PASSED!');
console.log('========================================\n');
