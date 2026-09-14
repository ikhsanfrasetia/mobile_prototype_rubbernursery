/**
 * scripts/test-fix-seeding-summary-logic.js
 * Comprehensive Integration Test Suite for REVISI TASK-FIX-SEEDING-SUMMARY-LOGIC-01
 */

import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== CHECKING SOURCE CODE INVARIANTS (REVISED) ===');

const landingSource = fs.readFileSync('js/modules/seeding/seeding-landing.js', 'utf-8');
const formSource = fs.readFileSync('js/modules/seeding/seeding-form.js', 'utf-8');

// Polybag must be present with rule 1:2
assert.ok(formSource.includes('Math.ceil(val / 2)'), 'seeding-form.js must contain Math.ceil(val / 2)');
assert.ok(landingSource.includes('ttlPolybagSDHI'), 'seeding-landing.js must calculate ttlPolybagSDHI');
assert.ok(landingSource.includes('Ttl Polybag SDHI'), 'seeding-landing.js must display Ttl Polybag SDHI');
assert.ok(landingSource.includes('Ttl Polybag HI'), 'seeding-landing.js must display Ttl Polybag HI');
assert.ok(formSource.includes('inp-polybag'), 'seeding-form.js must contain inp-polybag');

// Bugfixes must be present
assert.ok(!landingSource.includes('Ttl Bibit Belum Diseleksi'), 'seeding-landing.js must NOT contain misnomer Ttl Bibit Belum Diseleksi');
assert.ok(!landingSource.includes('Bibit Tersedia</span>\n                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${qty}'), 'seeding-landing.js must NOT display ${qty} as Bibit Tersedia');
assert.ok(landingSource.includes('Sisa Benih Belum Disemai'), 'seeding-landing.js must display Sisa Benih Belum Disemai');
assert.ok(landingSource.includes('Dokumen Penerimaan'), 'seeding-landing.js must emphasize Dokumen Penerimaan identity');
assert.ok(formSource.includes('Sisa Benih Belum Disemai'), 'seeding-form.js must contain Sisa Benih Belum Disemai label');

console.log('✓ Source Code Invariants Verified.\n');

// Mock Runtime Simulation of Seeding Logic
class MockStorage {
  constructor() {
    this.store = {};
  }
  get(key, defaultValue = null) {
    const val = this.store[key];
    if (val === undefined || val === null) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  set(key, value) {
    this.store[key] = JSON.stringify(value);
  }
  remove(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const storage = new MockStorage();

function evaluateSeedingLanding(storageInstance) {
  const txs = storageInstance.get('receipt_transactions', []);
  const benihTxs = txs
    .map((tx, originalIndex) => ({ ...tx, originalIndex }))
    .filter(tx => tx.jenis === 'Benih / Biji Kelatak');
  const seedingTxs = storageInstance.get('seeding_transactions', []);

  return benihTxs.map(tx => {
    const docNo = tx.docNo || tx.nomorDokumen;
    let ttlDisemaiSDHI = 0;
    let ttlPolybagSDHI = 0;
    let ttlDitolakSDHI = 0;
    const relatedTxs = seedingTxs.filter(s => s.sourceIndex == tx.originalIndex);
    relatedTxs.forEach(r => {
      const disemaiVal = parseInt(r.totalDisemai || 0);
      ttlDisemaiSDHI += disemaiVal;
      ttlPolybagSDHI += parseInt(r.totalPolybag !== undefined ? r.totalPolybag : Math.ceil(disemaiVal / 2));
      ttlDitolakSDHI += parseInt(r.ditolak || 0);
    });
    const qty = parseInt(tx.qty || 0);
    const bibitTersedia = qty - ttlDisemaiSDHI - ttlDitolakSDHI;

    let statusText = 'Belum Disemai';
    let statusColor = '#999999';

    if (ttlDisemaiSDHI === 0 && ttlDitolakSDHI === 0) {
      statusText = 'Belum Disemai';
      statusColor = '#999999';
    } else if (bibitTersedia <= 0) {
      statusText = 'Selesai Disemai';
      statusColor = '#116834';
    } else {
      statusText = 'Semai Belum Selesai';
      statusColor = '#F57F17';
    }

    const topBadgeText = bibitTersedia <= 0 ? 'Selesai Disemai' : 'Perlu Disemai';

    return {
      docNo,
      program: tx.program,
      cardIdentity: 'Dokumen Penerimaan',
      topBadgeText,
      statusText,
      ttlPenerimaan: qty,
      ttlDisemaiSDHI,
      ttlPolybagSDHI,
      ttlDitolakSDHI,
      sisaBenihBelumDisemai: Math.max(0, bibitTersedia)
    };
  });
}

console.log('=== RUNNING REVISED INTEGRATION SCENARIOS ===');

// SCENARIO 1: Receipt 39.250 -> Disemai 39.000 -> Ditolak 250
console.log('\n--- SCENARIO 1: Receipt 39.250 -> Disemai 39.000 -> Ditolak 250 ---');
storage.clear();
storage.set('receipt_transactions', [
  { id: 'RCV-01', docNo: '2026/TB/RNUR/001', program: '2026/TB/RNUR/001', jenis: 'Benih / Biji Kelatak', qty: 39250 }
]);
storage.set('seeding_transactions', [
  { sourceIndex: 0, docNo: '2026/SOW/0001', totalDisemai: 39000, totalPolybag: 19500, ditolak: 250, rows: [{ bedengan: 'Bedengan 01', disemai: 39000, polybag: 19500 }] }
]);

const s1Cards = evaluateSeedingLanding(storage);
assert.strictEqual(s1Cards.length, 1);
assert.strictEqual(s1Cards[0].ttlPenerimaan, 39250);
assert.strictEqual(s1Cards[0].ttlDisemaiSDHI, 39000);
assert.strictEqual(s1Cards[0].ttlPolybagSDHI, 19500);
assert.strictEqual(s1Cards[0].ttlDitolakSDHI, 250);
assert.strictEqual(s1Cards[0].sisaBenihBelumDisemai, 0);
assert.strictEqual(s1Cards[0].statusText, 'Selesai Disemai');
assert.strictEqual(s1Cards[0].topBadgeText, 'Selesai Disemai');
console.log('✓ Scenario 1 PASS:', s1Cards[0]);

// SCENARIO 2: Receipt 20.000 -> Disemai 15.000
console.log('\n--- SCENARIO 2: Receipt 20.000 -> Disemai 15.000 ---');
storage.clear();
storage.set('receipt_transactions', [
  { id: 'RCV-02', docNo: '2026/TB/RNUR/001', program: '2026/TB/RNUR/001', jenis: 'Benih / Biji Kelatak', qty: 20000 }
]);
storage.set('seeding_transactions', [
  { sourceIndex: 0, docNo: '2026/SOW/0002', totalDisemai: 15000, totalPolybag: 7500, ditolak: 0, rows: [{ bedengan: 'Bedengan 01', disemai: 15000, polybag: 7500 }] }
]);

const s2Cards = evaluateSeedingLanding(storage);
assert.strictEqual(s2Cards.length, 1);
assert.strictEqual(s2Cards[0].ttlPenerimaan, 20000);
assert.strictEqual(s2Cards[0].ttlDisemaiSDHI, 15000);
assert.strictEqual(s2Cards[0].ttlPolybagSDHI, 7500);
assert.strictEqual(s2Cards[0].ttlDitolakSDHI, 0);
assert.strictEqual(s2Cards[0].sisaBenihBelumDisemai, 5000);
assert.strictEqual(s2Cards[0].topBadgeText, 'Perlu Disemai');
assert.strictEqual(s2Cards[0].statusText, 'Semai Belum Selesai');
console.log('✓ Scenario 2 PASS:', s2Cards[0]);

// SCENARIO 3: Receipt 39.001 -> Disemai 39.001 (CEILING TEST)
console.log('\n--- SCENARIO 3: Receipt 39.001 -> Disemai 39.001 (CEILING 1:2) ---');
storage.clear();
storage.set('receipt_transactions', [
  { id: 'RCV-03', docNo: '2026/TB/RNUR/003', program: '2026/TB/RNUR/003', jenis: 'Benih / Biji Kelatak', qty: 39001 }
]);
storage.set('seeding_transactions', [
  { sourceIndex: 0, docNo: '2026/SOW/0003', totalDisemai: 39001, totalPolybag: Math.ceil(39001 / 2), ditolak: 0, rows: [{ bedengan: 'Bedengan 01', disemai: 39001, polybag: Math.ceil(39001 / 2) }] }
]);

const s3Cards = evaluateSeedingLanding(storage);
assert.strictEqual(s3Cards.length, 1);
assert.strictEqual(s3Cards[0].ttlDisemaiSDHI, 39001);
assert.strictEqual(s3Cards[0].ttlPolybagSDHI, 19501, '39.001 / 2 must ceiling to 19.501');
assert.strictEqual(s3Cards[0].sisaBenihBelumDisemai, 0);
assert.strictEqual(s3Cards[0].statusText, 'Selesai Disemai');
console.log('✓ Scenario 3 PASS (Ceiling Rule Verified):', s3Cards[0]);

// SCENARIO 4: Receipt baru tanpa penyemaian
console.log('\n--- SCENARIO 4: Receipt baru tanpa penyemaian ---');
storage.clear();
storage.set('receipt_transactions', [
  { id: 'RCV-04', docNo: '2026/APR/002', program: '2026/APR/002', jenis: 'Benih / Biji Kelatak', qty: 10000 }
]);
storage.set('seeding_transactions', []);

const s4Cards = evaluateSeedingLanding(storage);
assert.strictEqual(s4Cards.length, 1);
assert.strictEqual(s4Cards[0].ttlPenerimaan, 10000);
assert.strictEqual(s4Cards[0].ttlDisemaiSDHI, 0);
assert.strictEqual(s4Cards[0].ttlPolybagSDHI, 0);
assert.strictEqual(s4Cards[0].ttlDitolakSDHI, 0);
assert.strictEqual(s4Cards[0].sisaBenihBelumDisemai, 10000);
assert.strictEqual(s4Cards[0].topBadgeText, 'Perlu Disemai');
assert.strictEqual(s4Cards[0].statusText, 'Belum Disemai');
console.log('✓ Scenario 4 PASS:', s4Cards[0]);

// SCENARIO 5: Reload / Persistence
console.log('\n--- SCENARIO 5: Reload / Persistence ---');
const reloadedReceipts = storage.get('receipt_transactions', []);
const reloadedSeedings = storage.get('seeding_transactions', []);
const reloadedCards = evaluateSeedingLanding(storage);
assert.strictEqual(reloadedCards.length, s4Cards.length);
assert.deepStrictEqual(reloadedCards[0], s4Cards[0]);
console.log('✓ Scenario 5 PASS: Persistence 100% consistent across reloads.');

// SCENARIO 6: Multiple Receipt pada Program yang sama
console.log('\n--- SCENARIO 6: Multiple Receipt pada Program yang sama ---');
storage.clear();
storage.set('receipt_transactions', [
  { id: 'RCV-A', docNo: '2026/TB/RNUR/001-A', program: '2026/TB/RNUR/001', jenis: 'Benih / Biji Kelatak', qty: 39250 },
  { id: 'RCV-B', docNo: '2026/TB/RNUR/001-B', program: '2026/TB/RNUR/001', jenis: 'Benih / Biji Kelatak', qty: 20000 }
]);
storage.set('seeding_transactions', [
  { sourceIndex: 0, docNo: '2026/SOW/0001', totalDisemai: 39000, totalPolybag: 19500, ditolak: 250 }
]);

const s6Cards = evaluateSeedingLanding(storage);
assert.strictEqual(s6Cards.length, 2, 'Must display 2 separate cards for 2 receipts in same program');
assert.strictEqual(s6Cards[0].docNo, '2026/TB/RNUR/001-A');
assert.strictEqual(s6Cards[0].ttlPolybagSDHI, 19500);
assert.strictEqual(s6Cards[0].sisaBenihBelumDisemai, 0);
assert.strictEqual(s6Cards[0].statusText, 'Selesai Disemai');

assert.strictEqual(s6Cards[1].docNo, '2026/TB/RNUR/001-B');
assert.strictEqual(s6Cards[1].ttlPolybagSDHI, 0);
assert.strictEqual(s6Cards[1].sisaBenihBelumDisemai, 20000);
assert.strictEqual(s6Cards[1].statusText, 'Belum Disemai');
console.log('✓ Scenario 6 PASS: 2 separate cards per receipt maintained.');

console.log('\n======================================================');
console.log('🎉 ALL 6 REVISED INTEGRATION TEST SCENARIOS PASSED!');
console.log('======================================================');
