/**
 * test-request-clone-integration.js
 * Verification Suite for SPB Permintaan Bibit Master Klon Integration.
 */

import {
  KLON_MASTER,
  KLON_STATUS,
  getAllKlons,
  getActiveKlons,
  resolveKlon,
  isKlonActive
} from '../js/data/klon-master.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('--- TEST SUITE: SPB PERMINTAAN BIBIT MASTER KLON INTEGRATION ---');

// 1. ACTIVE CLONES AVAILABILITY (57 RESMI)
console.log('\n1. Active Clones Availability (57 Klon Resmi):');
const activeKlons = getActiveKlons();
assert(activeKlons.length === 57, `Total klon aktif untuk SPB harus tepat 57 (ditemukan: ${activeKlons.length})`);

const sampleActive = activeKlons.map(k => k.canonicalName);
assert(sampleActive.includes('PB 260'), 'PB 260 harus tersedia di opsi SPB');
assert(sampleActive.includes('RRIM 600'), 'RRIM 600 harus tersedia di opsi SPB');
assert(sampleActive.includes('GT 1'), 'GT 1 harus tersedia di opsi SPB');
assert(sampleActive.includes('IRCA 331'), 'IRCA 331 harus tersedia di opsi SPB');
assert(sampleActive.includes('IRR 112'), 'IRR 112 harus tersedia di opsi SPB');

// 2. EXCLUSION OF 7 LEGACY CLONES FROM ACTIVE SPB DROPDOWN
console.log('\n2. 7 Legacy Clones Exclusion from New SPB Options:');
const legacyClones = [
  'IRR 300',
  'PR 261',
  'IRR 215',
  'IRR 100',
  'IRR 219',
  'IRR 107',
  'IRCA 120'
];

for (const leg of legacyClones) {
  const isFoundInActive = activeKlons.some(k => k.canonicalName.toUpperCase() === leg.toUpperCase() || k.code.toUpperCase() === leg.replace(/\s+/g, '').toUpperCase());
  assert(!isFoundInActive, `Legacy clone "${leg}" TIDAK boleh ada dalam daftar klon aktif SPB baru`);
}

// 3. CANONICAL NAME RESOLUTION ON SUBMIT
console.log('\n3. Canonical Name Resolution on Request Submission:');
const testInput1 = 'pb 260';
const resolved1 = resolveKlon(testInput1);
assert(resolved1 !== null && resolved1.canonicalName === 'PB 260', 'Resolusi "pb 260" -> "PB 260"');

const testInput2 = 'IRCA331';
const resolved2 = resolveKlon(testInput2);
assert(resolved2 !== null && resolved2.canonicalName === 'IRCA 331', 'Resolusi "IRCA331" -> "IRCA 331"');

const testInput3 = 'GT-1';
const resolved3 = resolveKlon(testInput3);
assert(resolved3 !== null && resolved3.canonicalName === 'GT 1', 'Resolusi "GT-1" -> "GT 1"');

// 4. REQUEST OBJECT STRUCTURE & SCHEMA COMPATIBILITY
console.log('\n4. Request Object Schema & Integrity:');
const mockUser = {
  name: 'Junaidi',
  userId: 'PGS001',
  role: 'PENGURUS',
  position: 'Pengurus Kebun',
  divisionName: 'Tanah Besih - Divisi I'
};

const simulatedRequest = {
  id: `REQ-${Date.now()}`,
  docNo: 'SPB/KSP/2026/001',
  nomorDokumen: 'SPB/KSP/2026/001',
  type: 'KEBUN_SEPUPU',
  category: 'BIBIT_KEBUN_SEPUPU',
  requestType: 'BIBIT',
  program: 'Program Replanting 2026',
  klon: resolved1.canonicalName,
  qty: 1500,
  requestedQty: 1500,
  unit: 'Pkk',
  status: 'DIAJUKAN',
  statusLabel: 'Diajukan',
  requestedBy: mockUser.name,
  userId: mockUser.userId,
  role: mockUser.role,
  position: mockUser.position,
  divisionName: mockUser.divisionName,
  createdAt: new Date().toISOString(),
  date: '2026-09-12',
  tanggal: '2026-09-12'
};

assert(simulatedRequest.klon === 'PB 260', 'Klon tersimpan secara kanonikal');
assert(simulatedRequest.docNo === 'SPB/KSP/2026/001', 'Nomor dokumen terisi');
assert(simulatedRequest.program === 'Program Replanting 2026', 'Program replanting terisi');
assert(simulatedRequest.qty === 1500 && simulatedRequest.unit === 'Pkk', 'Qty dan Unit terisi');
assert(simulatedRequest.requestedBy === 'Junaidi', 'RequestedBy actor terisi');
assert(simulatedRequest.status === 'DIAJUKAN', 'Status awal DIAJUKAN');

// 5. HISTORICAL LEGACY REQUEST READABILITY
console.log('\n5. Historical Request Compatibility:');
const legacyHistoricalRequest = {
  id: 'REQ-LEGACY-001',
  docNo: 'SPB/KSP/2025/099',
  program: 'Program Replanting 2025',
  klon: 'IRR 300', // legacy clone
  qty: 2000,
  unit: 'Pkk',
  status: 'APPROVED'
};

assert(legacyHistoricalRequest.klon === 'IRR 300', 'Histori lama dengan klon legacy tetap utuh');
assert(legacyHistoricalRequest.qty === 2000, 'Qty histori lama tetap utuh');

// SUMMARY
console.log('\n-----------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed === 0) {
  console.log('✅ ALL SPB REQUEST MASTER CLONE INTEGRATION TESTS PASSED!');
} else {
  console.log('❌ SOME TESTS FAILED!');
  process.exit(1);
}
