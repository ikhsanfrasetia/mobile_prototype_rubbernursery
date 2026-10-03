/**
 * tests/test-asb-summary-cards.js
 * Integration Test for ASB Summary Cards (Verifikasi Diperlukan & Pemeriksaan Diperlukan)
 */

import assert from 'assert';

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import {
  getVerifikasiSummary,
  getPemeriksaanSummary,
  renderVerifikasiSummaryCardHtml,
  renderPemeriksaanSummaryCardHtml
} from '../js/modules/verification/asb-summary-cards.js';

console.log('====================================================');
console.log('STARTING INTEGRATION TESTS: ASB SUMMARY CARDS');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}:`, err.message);
    throw err;
  }
}

// Setup User Context
const asbUserTBS = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  role: 'ASISTEN_BIBITAN',
  name: 'Asisten Bibitan TBS',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

const asbUserAPM = {
  id: 'USR-ASB-02',
  userId: 'USR-ASB-02',
  role: 'ASISTEN_BIBITAN',
  name: 'Asisten Bibitan APM',
  estateId: 'EST-APM',
  divisionId: 'DIV-01'
};

// -------------------------------------------------------------
// TEST 1: Empty state -> "Belum ada pembaruan" & 0 counts
// -------------------------------------------------------------
it('TEST 1: Empty state returns 0 counts and "Belum ada pembaruan"', () => {
  localStorage.clear();

  const verifStats = getVerifikasiSummary(asbUserTBS);
  assert.strictEqual(verifStats.pendingCount, 0);
  assert.strictEqual(verifStats.verifiedCount, 0);
  assert.strictEqual(verifStats.totalCount, 0);
  assert.strictEqual(verifStats.percentage, 0);
  assert.strictEqual(verifStats.lastUpdatedStr, 'Belum ada pembaruan');

  const inspStats = getPemeriksaanSummary(asbUserTBS);
  assert.strictEqual(inspStats.pendingCount, 0);
  assert.strictEqual(inspStats.completedCount, 0);
  assert.strictEqual(inspStats.totalCount, 0);
  assert.strictEqual(inspStats.percentage, 0);
  assert.strictEqual(inspStats.lastUpdatedStr, 'Belum ada pembaruan');
});

// -------------------------------------------------------------
// TEST 2: Verifikasi Diperlukan with pending and verified records
// -------------------------------------------------------------
it('TEST 2: Verifikasi Diperlukan calculates counts and percentage accurately', () => {
  localStorage.clear();

  const verifTxs = [
    {
      id: 'VRF-01',
      referenceType: 'OKULASI',
      referenceId: 'BUD-01',
      referenceDocNo: 'BUD/TBS/2026/01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: 'MENUNGGU_VERIFIKASI',
      submittedAt: '2026-10-02T10:15:30Z'
    },
    {
      id: 'VRF-02',
      referenceType: 'PENYEMAIAN',
      referenceId: 'SEM-01',
      referenceDocNo: 'SEM/TBS/2026/01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: 'MENUNGGU_VERIFIKASI',
      submittedAt: '2026-10-02T11:20:45Z'
    },
    {
      id: 'VRF-03',
      referenceType: 'PENERIMAAN',
      referenceId: 'RCP-01',
      referenceDocNo: 'RCP/TBS/2026/01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: 'TERVERIFIKASI',
      verifiedAt: '2026-10-02T12:00:00Z'
    }
  ];
  storage.set('verification_transactions', verifTxs);

  const verifStats = getVerifikasiSummary(asbUserTBS);
  assert.strictEqual(verifStats.pendingCount, 2);
  assert.strictEqual(verifStats.verifiedCount, 1);
  assert.strictEqual(verifStats.totalCount, 3);
  assert.strictEqual(verifStats.percentage, 33); // 1/3 * 100 = 33%
  assert.ok(verifStats.lastUpdatedStr.includes('Pembaruan Terakhir'));
});

// -------------------------------------------------------------
// TEST 3: Scope Isolation on Verifikasi Diperlukan
// -------------------------------------------------------------
it('TEST 3: Scope Isolation - APM user does not see TBS verifications', () => {
  const apmStats = getVerifikasiSummary(asbUserAPM);
  assert.strictEqual(apmStats.pendingCount, 0);
  assert.strictEqual(apmStats.verifiedCount, 0);
  assert.strictEqual(apmStats.totalCount, 0);
  assert.strictEqual(apmStats.lastUpdatedStr, 'Belum ada pembaruan');
});

// -------------------------------------------------------------
// TEST 4: Pemeriksaan Diperlukan calculation with Selection and Destruction
// -------------------------------------------------------------
it('TEST 4: Pemeriksaan Diperlukan calculates Selection & Destruction counts', () => {
  localStorage.clear();

  // 1 Selection Pra-Okulasi (Pending) + 1 Approved
  storage.set('pre_grafting_selection_documents', [
    {
      id: 'DOC-SEL-01',
      docNo: 'SEL/TBS/2026/01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      selectionStage: 'SELEKSI_I',
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
      submittedAt: '2026-10-02T08:30:00Z'
    },
    {
      id: 'DOC-SEL-02',
      docNo: 'SEL/TBS/2026/02',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      selectionStage: 'SELEKSI_II',
      status: 'DISETUJUI',
      submittedAt: '2026-10-02T09:00:00Z'
    }
  ]);

  // 1 Destruction (Pending)
  storage.set('destruction_transactions', [
    {
      id: 'DEST-01',
      docNo: 'DES/TBS/2026/01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
      submittedAt: '2026-10-02T09:45:00Z'
    }
  ]);

  const inspStats = getPemeriksaanSummary(asbUserTBS);
  assert.strictEqual(inspStats.pendingSelection, 1);
  assert.strictEqual(inspStats.pendingDestruction, 1);
  assert.strictEqual(inspStats.pendingCount, 2);
  assert.strictEqual(inspStats.completedCount, 1); // 1 approved seleksi
  assert.strictEqual(inspStats.totalCount, 3);
  assert.strictEqual(inspStats.percentage, 33);
  assert.ok(inspStats.lastUpdatedStr.includes('Pembaruan Terakhir'));
});

// -------------------------------------------------------------
// TEST 5: renderVerifikasiSummaryCardHtml outputs ONLY Verifikasi card
// -------------------------------------------------------------
it('TEST 5: renderVerifikasiSummaryCardHtml outputs ONLY Verifikasi card with reference structure', () => {
  storage.set('verification_transactions', [
    { id: 'VRF-01', referenceType: 'OKULASI', referenceId: 'BUD-01', estateId: 'EST-TBS', divisionId: 'DIV-01', verificationStatus: 'MENUNGGU_VERIFIKASI', submittedAt: '2026-10-02T10:15:30Z' },
    { id: 'VRF-02', referenceType: 'PENYEMAIAN', referenceId: 'SEM-01', estateId: 'EST-TBS', divisionId: 'DIV-01', verificationStatus: 'MENUNGGU_VERIFIKASI', submittedAt: '2026-10-02T11:20:45Z' },
    { id: 'VRF-03', referenceType: 'PENERIMAAN', referenceId: 'RCP-01', estateId: 'EST-TBS', divisionId: 'DIV-01', verificationStatus: 'TERVERIFIKASI', verifiedAt: '2026-10-02T12:00:00Z' }
  ]);

  const html = renderVerifikasiSummaryCardHtml(asbUserTBS);
  assert.ok(html.includes('Verifikasi Diperlukan'), 'Card Title present');
  assert.ok(!html.includes('Pemeriksaan Diperlukan'), 'MUST NOT contain Pemeriksaan Diperlukan');
  assert.ok(html.includes('Verifikasi<br>Masuk'), 'Left label present');
  assert.ok(html.includes('Verifikasi<br>Diproses'), 'Right label present');
  assert.ok(html.includes('background: #EF4444'), 'Red progress bar fill present');
  assert.ok(html.includes('Pencapaian hari ini'), 'Footer label present');
  assert.ok(html.includes('33%'), 'Percentage present');
  assert.ok(html.includes('color: #EF4444'), 'Red percentage color present');
});

// -------------------------------------------------------------
// TEST 6: renderPemeriksaanSummaryCardHtml outputs ONLY Pemeriksaan card
// -------------------------------------------------------------
it('TEST 6: renderPemeriksaanSummaryCardHtml outputs ONLY Pemeriksaan card with reference structure', () => {
  const html = renderPemeriksaanSummaryCardHtml(asbUserTBS);
  assert.ok(html.includes('Pemeriksaan Diperlukan'), 'Card Title present');
  assert.ok(!html.includes('Verifikasi Diperlukan'), 'MUST NOT contain Verifikasi Diperlukan');
  assert.ok(html.includes('Pemeriksaan<br>Masuk'), 'Left label present');
  assert.ok(html.includes('Pemeriksaan<br>Diproses'), 'Right label present');
  assert.ok(html.includes('background: #EF4444'), 'Red progress bar fill present');
  assert.ok(html.includes('Pencapaian hari ini'), 'Footer label present');
  assert.ok(html.includes('33%'), 'Percentage present');
  assert.ok(html.includes('color: #EF4444'), 'Red percentage color present');
});

console.log(`\n====================================================`);
console.log(`ALL INTEGRATION TESTS PASSED (${passedTests}/${totalTests})`);
console.log('====================================================\n');
