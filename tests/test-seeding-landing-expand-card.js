import assert from 'node:assert';
import fs from 'node:fs';

console.log('================================================================================');
console.log('RUNNING TESTS: SEEDING LANDING EXPAND CARD VALIDATION');
console.log('================================================================================');

const landingSource = fs.readFileSync('js/modules/seeding/seeding-landing.js', 'utf-8');

// 1. Invariant: btn-toggle-pindah-expand rendered in card markup
assert.ok(landingSource.includes('class="btn-toggle-pindah-expand"'), 'seeding-landing.js must render .btn-toggle-pindah-expand button');
assert.ok(landingSource.includes('Lihat Detail Transaksi'), 'seeding-landing.js must render toggle text "Lihat Detail Transaksi"');

// 2. Invariant: 3-column metrics container layout
assert.ok(landingSource.includes('Kode Batch'), 'seeding-landing.js must contain metric "Kode Batch"');
assert.ok(landingSource.includes('Bibit Disemai'), 'seeding-landing.js must contain metric "Bibit Disemai"');
assert.ok(landingSource.includes('Polybag Terisi'), 'seeding-landing.js must contain metric "Polybag Terisi"');

// 3. Invariant: pindah-expandable-content wraps the structured metadata
assert.ok(landingSource.includes('class="pindah-expandable-content"'), 'seeding-landing.js must contain .pindah-expandable-content');
assert.ok(landingSource.includes('Sumber Dederan'), 'seeding-landing.js must contain metadata "Sumber Dederan"');
assert.ok(landingSource.includes('Bedengan Semai'), 'seeding-landing.js must contain metadata "Bedengan Semai"');
assert.ok(landingSource.includes('Tanggal Transaksi'), 'seeding-landing.js must contain metadata "Tanggal Transaksi"');
assert.ok(landingSource.includes('Dokumen Issue:'), 'seeding-landing.js must contain metadata "Dokumen Issue:"');

// 4. Invariant: attachPindahSemaiEvents targets card-pindah-summary-wrapper
assert.ok(landingSource.includes("card-pindah-summary-wrapper"), 'attachPindahSemaiEvents must target card-pindah-summary-wrapper');
assert.ok(landingSource.includes('Sembunyikan Detail Transaksi'), 'attachPindahSemaiEvents must toggle text to "Sembunyikan Detail Transaksi"');

// 4. Invariant: Collapsed by default (display: none)
assert.ok(landingSource.includes('class="pindah-expandable-content" style="display: none;'), 'pindah-expandable-content must be hidden (display: none) by default');

console.log('✓ PASS: All Expand Card Invariants in Seeding Landing Verified.');
console.log('================================================================================');
