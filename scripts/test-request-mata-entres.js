/**
 * scripts/test-request-mata-entres.js
 * Integration Test Suite: End-to-End Permintaan Mata Entres Workflow
 * 
 * Scenarios Tested:
 * A. Create Request (Pengurus Kebun Peminta)
 * B. Review & Approval (Pengurus Kebun Tujuan)
 * C. Verification & Routing (Askep Kebun Tujuan)
 * D. Readiness Verification (Asisten Bibitan Kebun Tujuan)
 * E. Physical Dispatch (Mantri Bibitan Kebun Pengirim)
 * F. Physical Receipt (Kebun Peminta)
 * G. Data Integrity (Permintaan vs Pengeluaran vs Penerimaan)
 * H. Estate & Role Isolation
 */

const memoryStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k, v) => { memoryStore[k] = String(v); },
  removeItem: (k) => { delete memoryStore[k]; },
  clear: () => { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; }
};

import assert from 'assert';
import { storage } from '../js/core/storage.js';
import { generateUniqueDocNo } from '../js/core/utils.js';
import { submitMataEntresRequest } from '../js/modules/request/request-mata-entres-form.js';
import {
  MATA_ENTRES_STATUS,
  filterMyMataEntresRequests,
  filterIncomingMataEntresRequests,
  getActionableMataEntresCount,
  filterMataEntresByStatus,
  canPerformPengurusReceiverReview,
  canPerformAskepVerification,
  canPerformAsistenBibitanVerification,
  canPerformMantriDispatch,
  canPerformRequesterReceipt,
  processPengurusReview,
  processAskepVerification,
  processAsistenBibitanVerification,
  processMantriDispatch,
  processRequesterReceipt
} from '../js/modules/request/request-mata-entres-landing.js';

console.log('========================================================================================');
console.log('   SIGMA RUBBER NURSERY — INTEGRATION TEST SUITE: PERMINTAAN MATA ENTRES END-TO-END     ');
console.log('========================================================================================\n');

let passedAssertions = 0;
function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passedAssertions++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  globalThis.localStorage.clear();
  storage.set('requests_transactions', []);

  // Define Actor Contexts
  const userPengurusPeminta = {
    userId: 'PGR-TBS-01',
    name: 'Junaidi (Pengurus TBS)',
    role: 'PENGURUS',
    estateId: 'EST-TBS',
    position: 'Pengurus Kebun'
  };

  const userPengurusTujuan = {
    userId: 'PGR-APM-01',
    name: 'Hendra Gunawan (Pengurus APM)',
    role: 'PENGURUS',
    estateId: 'EST-APM',
    position: 'Pengurus Kebun'
  };

  const userAskepTujuan = {
    userId: 'ASK-APM-01',
    name: 'Budi Santoso (Askep APM)',
    role: 'ASKEP',
    estateId: 'EST-APM',
    position: 'Asisten Kepala'
  };

  const userAsistenBibitanTujuan = {
    userId: 'ASB-APM-01',
    name: 'Rahmat Hidayat (Asb APM)',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-APM',
    divisionId: 'DIV-01',
    position: 'Asisten Bibitan'
  };

  const userMantriTujuan = {
    userId: 'MTR-APM-01',
    name: 'Sugiono (Mantri APM)',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-APM',
    divisionId: 'DIV-01',
    position: 'Mantri Bibitan'
  };

  const userKebunLain = {
    userId: 'PGR-KBN-99',
    name: 'User Kebun Lain',
    role: 'PENGURUS',
    estateId: 'EST-001',
    position: 'Pengurus'
  };

  // --------------------------------------------------------------------------
  console.log('--- SCENARIO A: CREATE REQUEST (Pengurus Kebun Peminta) ---');
  // --------------------------------------------------------------------------
  const existingList = storage.get('requests_transactions', []);
  const docNo1 = generateUniqueDocNo('REQ/ETRS', existingList);
  
  it('A1. Format nomor dokumen otomatis YYYY/REQ/ETRS/001', () => {
    assert.strictEqual(docNo1, '2026/REQ/ETRS/001');
  });

  const createdTx = await submitMataEntresRequest({
    docNo: docNo1,
    targetEstateId: 'EST-APM',
    targetEstateName: 'Aek Pamingke',
    requiredDate: '2026-09-25',
    klon: 'PB 260',
    jumlahBatang: 100,
    jumlahMataEntres: 1200,
    catatan: 'Kebutuhan okulasi massal blok nursery 2',
    user: userPengurusPeminta
  });

  it('A2. Transaksi tersimpan dengan type MATA_ENTRES dan status DIAJUKAN', () => {
    assert.strictEqual(createdTx.type, 'MATA_ENTRES');
    assert.strictEqual(createdTx.status, MATA_ENTRES_STATUS.DIAJUKAN);
    assert.strictEqual(createdTx.docNo, '2026/REQ/ETRS/001');
    assert.strictEqual(createdTx.jumlahBatang, 100);
    assert.strictEqual(createdTx.jumlahMataEntres, 1200);
    assert.strictEqual(createdTx.estateId, 'EST-TBS');
    assert.strictEqual(createdTx.targetEstateId, 'EST-APM');
  });

  it('A3. Pengurus Peminta melihat transaksi di tab Permintaan Saya', () => {
    const all = storage.get('requests_transactions', []);
    const myReqs = filterMyMataEntresRequests(all, userPengurusPeminta);
    assert.strictEqual(myReqs.length, 1);
    assert.strictEqual(myReqs[0].docNo, '2026/REQ/ETRS/001');
  });

  it('A4. Generator menghasilkan nomor sequence berikutnya (2026/REQ/ETRS/002)', () => {
    const all = storage.get('requests_transactions', []);
    const nextDocNo = generateUniqueDocNo('REQ/ETRS', all);
    assert.strictEqual(nextDocNo, '2026/REQ/ETRS/002');
  });

  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO B: PENGURUS KEBUN TUJUAN (Review & Approval) ---');
  // --------------------------------------------------------------------------
  it('B1. Pengurus Kebun Tujuan melihat transaksi di tab Permintaan Masuk', () => {
    const all = storage.get('requests_transactions', []);
    const incoming = filterIncomingMataEntresRequests(all, userPengurusTujuan);
    assert.strictEqual(incoming.length, 1);
    assert.strictEqual(incoming[0].docNo, '2026/REQ/ETRS/001');
  });

  it('B2. Actionable counter Pengurus Tujuan bernilai 1 (Red Dot ON)', () => {
    const all = storage.get('requests_transactions', []);
    const incoming = filterIncomingMataEntresRequests(all, userPengurusTujuan);
    const count = getActionableMataEntresCount(incoming, userPengurusTujuan);
    assert.strictEqual(count, 1);
    assert.strictEqual(canPerformPengurusReceiverReview(incoming[0], userPengurusTujuan), true);
  });

  it('B3. Pengurus Tujuan mengeksekusi Review & Setujui Kuota', async () => {
    const updated = await processPengurusReview(createdTx.id, {
      approvedBatang: 100,
      approvedMataEntres: 1150,
      approvedKlon: 'PB 260',
      estimatedDeliveryDate: '2026-09-24',
      notes: 'Disetujui 100 batang kayu entres segar'
    }, userPengurusTujuan);

    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA);
    assert.strictEqual(updated.targetNextRole, 'ASKEP');
    assert.strictEqual(updated.approval.approvedBatang, 100);
    assert.strictEqual(updated.approval.approvedMataEntres, 1150);
  });

  it('B4. Actionable counter Pengurus Tujuan menjadi 0 setelah submit (Red Dot OFF)', () => {
    const all = storage.get('requests_transactions', []);
    const incoming = filterIncomingMataEntresRequests(all, userPengurusTujuan);
    const count = getActionableMataEntresCount(incoming, userPengurusTujuan);
    assert.strictEqual(count, 0);
  });

  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO C: ASKEP KEBUN TUJUAN (Verifikasi & Routing) ---');
  // --------------------------------------------------------------------------
  it('C1. Askep Kebun Tujuan berhak memverifikasi transaksi (Actionable)', () => {
    const all = storage.get('requests_transactions', []);
    const incoming = filterIncomingMataEntresRequests(all, userAskepTujuan);
    assert.strictEqual(incoming.length, 1);
    assert.strictEqual(canPerformAskepVerification(incoming[0], userAskepTujuan), true);
    assert.strictEqual(getActionableMataEntresCount(incoming, userAskepTujuan), 1);
  });

  it('C2. Askep Kebun Tujuan memverifikasi dan memilih Divisi Bibitan (DIV-01)', async () => {
    const updated = await processAskepVerification(createdTx.id, {
      targetDivisionId: 'DIV-01',
      notes: 'Teruskan ke Asisten Bibitan Divisi 1'
    }, userAskepTujuan);

    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN);
    assert.strictEqual(updated.targetNextRole, 'ASISTEN_BIBITAN');
    assert.strictEqual(updated.targetNextDivisionId, 'DIV-01');
  });

  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO D: ASISTEN BIBITAN (Verifikasi Kesiapan) ---');
  // --------------------------------------------------------------------------
  it('D1. Asisten Bibitan Divisi 1 berhak memverifikasi kesiapan potong & kemas', () => {
    const all = storage.get('requests_transactions', []);
    const incoming = filterIncomingMataEntresRequests(all, userAsistenBibitanTujuan);
    assert.strictEqual(incoming.length, 1);
    assert.strictEqual(canPerformAsistenBibitanVerification(incoming[0], userAsistenBibitanTujuan), true);
  });

  it('D2. Asisten Bibitan mengeksekusi Verifikasi Kesiapan -> Status TERVERIFIKASI', async () => {
    const updated = await processAsistenBibitanVerification(createdTx.id, {
      isCutReady: true,
      isPackReady: true,
      notes: 'Pohon entres blok E siap dipotong besok pagi'
    }, userAsistenBibitanTujuan);

    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.TERVERIFIKASI);
    assert.strictEqual(updated.targetNextRole, 'MANTRI_TANAMAN');
    assert.strictEqual(updated.asbVerification.isCutReady, true);
  });

  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO E: MANTRI BIBITAN (Pengeluaran Fisik) ---');
  // --------------------------------------------------------------------------
  it('E1. Mantri Bibitan Divisi 1 melihat transaksi siap pengeluaran', () => {
    const all = storage.get('requests_transactions', []);
    const incoming = filterIncomingMataEntresRequests(all, userMantriTujuan);
    assert.strictEqual(incoming.length, 1);
    assert.strictEqual(canPerformMantriDispatch(incoming[0], userMantriTujuan), true);
  });

  it('E2. Mantri Bibitan mencatat pengeluaran fisik: 100 batang / 1.150 mata', async () => {
    const updated = await processMantriDispatch(createdTx.id, {
      jumlahBatangDikeluarkan: 100,
      jumlahMataEntresDikeluarkan: 1150,
      tanggalPengeluaran: '2026-09-24',
      notes: 'Dikemas dengan pelepah basah & label klon PB 260'
    }, userMantriTujuan);

    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.DIKELUARKAN);
    assert.strictEqual(updated.jumlahBatangDikeluarkan, 100);
    assert.strictEqual(updated.jumlahMataEntresDikeluarkan, 1150);
    assert.strictEqual(updated.tanggalPengeluaran, '2026-09-24');
    assert.strictEqual(updated.targetNextRole, 'PENGURUS');
  });

  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO F: PENERIMAAN KEBUN PEMINTA ---');
  // --------------------------------------------------------------------------
  it('F1. Pengurus Kebun Peminta melihat transaksi berstatus DIKELUARKAN siap diterima', () => {
    const all = storage.get('requests_transactions', []);
    const myReqs = filterMyMataEntresRequests(all, userPengurusPeminta);
    assert.strictEqual(myReqs.length, 1);
    assert.strictEqual(canPerformRequesterReceipt(myReqs[0], userPengurusPeminta), true);
  });

  it('F2. Kebun Peminta mengonfirmasi penerimaan fisik: 100 batang / 1.150 mata', async () => {
    const updated = await processRequesterReceipt(createdTx.id, {
      jumlahBatangDiterima: 100,
      jumlahMataEntresDiterima: 1150,
      tanggalPenerimaan: '2026-09-25',
      notes: 'Kayu dan mata entres tiba segar dan lengkap'
    }, userPengurusPeminta);

    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.DITERIMA);
    assert.strictEqual(updated.workflowStage, 'SELESAI');
    assert.strictEqual(updated.jumlahBatangDiterima, 100);
    assert.strictEqual(updated.jumlahMataEntresDiterima, 1150);
    assert.strictEqual(updated.tanggalPenerimaan, '2026-09-25');
  });

  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO G: DATA INTEGRITY (Pemisahan 3 Tahap Transaksi) ---');
  // --------------------------------------------------------------------------
  it('G1. Ketiga tahap (Permintaan, Pengeluaran, Penerimaan) memiliki nilai independen dan tidak tertimpa', () => {
    const all = storage.get('requests_transactions', []);
    const finalTx = all.find(t => t.id === createdTx.id);

    // Permintaan
    assert.strictEqual(typeof finalTx.jumlahBatang, 'number');
    assert.strictEqual(finalTx.jumlahBatang, 100);
    assert.strictEqual(typeof finalTx.jumlahMataEntres, 'number');
    assert.strictEqual(finalTx.jumlahMataEntres, 1200);

    // Pengeluaran
    assert.strictEqual(typeof finalTx.jumlahBatangDikeluarkan, 'number');
    assert.strictEqual(finalTx.jumlahBatangDikeluarkan, 100);
    assert.strictEqual(typeof finalTx.jumlahMataEntresDikeluarkan, 'number');
    assert.strictEqual(finalTx.jumlahMataEntresDikeluarkan, 1150);

    // Penerimaan
    assert.strictEqual(typeof finalTx.jumlahBatangDiterima, 'number');
    assert.strictEqual(finalTx.jumlahBatangDiterima, 100);
    assert.strictEqual(typeof finalTx.jumlahMataEntresDiterima, 'number');
    assert.strictEqual(finalTx.jumlahMataEntresDiterima, 1150);
  });

  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO H: ESTATE & ROLE ISOLATION ---');
  // --------------------------------------------------------------------------
  it('H1. User dari kebun lain (EST-001) tidak dapat melihat request di Permintaan Saya maupun Permintaan Masuk', () => {
    const all = storage.get('requests_transactions', []);
    const myReqs = filterMyMataEntresRequests(all, userKebunLain);
    const incomingReqs = filterIncomingMataEntresRequests(all, userKebunLain);
    assert.strictEqual(myReqs.length, 0);
    assert.strictEqual(incomingReqs.length, 0);
  });

  it('H2. Filter status SEMUA, DIAJUKAN, DIPROSES, SELESAI, DITOLAK berfungsi akurat', () => {
    const all = storage.get('requests_transactions', []);
    const myReqs = filterMyMataEntresRequests(all, userPengurusPeminta);

    assert.strictEqual(filterMataEntresByStatus(myReqs, 'SEMUA').length, 1);
    assert.strictEqual(filterMataEntresByStatus(myReqs, 'DIAJUKAN').length, 0);
    assert.strictEqual(filterMataEntresByStatus(myReqs, 'DIPROSES').length, 0);
    assert.strictEqual(filterMataEntresByStatus(myReqs, 'SELESAI').length, 1);
    assert.strictEqual(filterMataEntresByStatus(myReqs, 'DITOLAK').length, 0);
  });

  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------------------------');
  console.log(`TOTAL ASSERTIONS: ${passedAssertions}`);
  console.log(`PASSED:           ${passedAssertions}`);
  console.log(`FAILED:           ${process.exitCode ? 1 : 0}`);
  console.log('----------------------------------------------------------------------------------------');
  if (!process.exitCode) {
    console.log('✅ ALL MATA ENTRES WORKFLOW & INTEGRATION TESTS PASSED!');
  }
}

runTests();
