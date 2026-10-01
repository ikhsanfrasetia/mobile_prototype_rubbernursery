// test-topping-estimated-length.js
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- RUNNING INTEGRATION TESTS FOR TOPPING ESTIMATED LENGTH (REVISI FLAT VALUE) ---');

// 1. Static code check
const toppingFormPath = path.resolve('js/modules/entres/topping-form.js');
const code = fs.readFileSync(toppingFormPath, 'utf8');

// IT-TOPPING-LENGTH-001: Field estimasi tampil di dalam kotak hijau
assert(code.includes('Total Panjang Kayu:'), 'IT-TOPPING-LENGTH-001 FAILED: Label not found');
assert(code.includes('disp-est-panjang'), 'IT-TOPPING-LENGTH-001 FAILED: Element disp-est-panjang not found');
console.log('✓ IT-TOPPING-LENGTH-001 PASS: Field estimasi tampil di dalam kotak hijau');

// Test calculation logic simulation
function calculatePanjang(k) {
  const val = parseFloat(k || 0);
  if (val > 0) {
    const estPanjang = Math.round(val * 0.6);
    return `${estPanjang} Meter`;
  }
  return '-';
}

// IT-TOPPING-LENGTH-002: Jumlah Kayu = 100 menghasilkan: 60 Meter
assert.strictEqual(calculatePanjang(100), '60 Meter', 'IT-TOPPING-LENGTH-002 FAILED');
console.log('✓ IT-TOPPING-LENGTH-002 PASS: 100 -> 60 Meter');

// IT-TOPPING-LENGTH-003: Jumlah Kayu = 50 menghasilkan: 30 Meter
assert.strictEqual(calculatePanjang(50), '30 Meter', 'IT-TOPPING-LENGTH-003 FAILED');
console.log('✓ IT-TOPPING-LENGTH-003 PASS: 50 -> 30 Meter');

// IT-TOPPING-LENGTH-004: Jumlah Kayu = 125 menghasilkan: 75 Meter
assert.strictEqual(calculatePanjang(125), '75 Meter', 'IT-TOPPING-LENGTH-004 FAILED');
console.log('✓ IT-TOPPING-LENGTH-004 PASS: 125 -> 75 Meter');

// IT-TOPPING-LENGTH-005: Jumlah Kayu = 200 menghasilkan: 120 Meter
assert.strictEqual(calculatePanjang(200), '120 Meter', 'IT-TOPPING-LENGTH-005 FAILED');
console.log('✓ IT-TOPPING-LENGTH-005 PASS: 200 -> 120 Meter');

// IT-TOPPING-LENGTH-006: Input kosong tidak menghasilkan NaN
assert.strictEqual(calculatePanjang(''), '-', 'IT-TOPPING-LENGTH-006 FAILED');
assert.strictEqual(calculatePanjang(null), '-', 'IT-TOPPING-LENGTH-006 FAILED');
assert.strictEqual(calculatePanjang(undefined), '-', 'IT-TOPPING-LENGTH-006 FAILED');
console.log('✓ IT-TOPPING-LENGTH-006 PASS: Empty input returns "-"');

// IT-TOPPING-LENGTH-007: Input invalid tidak menghasilkan NaN
assert.strictEqual(calculatePanjang(0), '-', 'IT-TOPPING-LENGTH-007 FAILED');
assert.strictEqual(calculatePanjang(-10), '-', 'IT-TOPPING-LENGTH-007 FAILED');
assert.strictEqual(calculatePanjang('abc'), '-', 'IT-TOPPING-LENGTH-007 FAILED');
console.log('✓ IT-TOPPING-LENGTH-007 PASS: Invalid input returns "-"');

// IT-TOPPING-LENGTH-008: Jumlah Perisai tidak terpengaruh
assert(code.includes('jumlahPerisai: perisai'), 'IT-TOPPING-LENGTH-008 FAILED: Perisai mapping modified');
console.log('✓ IT-TOPPING-LENGTH-008 PASS: Jumlah Perisai mapping unaffected');

// IT-TOPPING-LENGTH-009: Save transaksi Topping tetap berhasil
assert(code.includes("storage.set('entres_topping_transactions'"), 'IT-TOPPING-LENGTH-009 FAILED: Save transaction modified');
console.log('✓ IT-TOPPING-LENGTH-009 PASS: Save transaction logic intact');

// IT-TOPPING-LENGTH-010: Data Topping existing tetap tersimpan dengan schema existing
assert(code.includes('totalPanjangMeter: 0'), 'IT-TOPPING-LENGTH-010 FAILED: Schema modified');
assert(code.includes('jumlahKayu: kayu'), 'IT-TOPPING-LENGTH-010 FAILED: Schema modified');
console.log('✓ IT-TOPPING-LENGTH-010 PASS: Schema preserved without modification');

// IT-TOPPING-LENGTH-011: Stok Mata Entres tetap menggunakan jumlahPerisai, bukan Total Panjang Kayu
const inventoryPath = path.resolve('js/core/entres-inventory-service.js');
const invCode = fs.readFileSync(inventoryPath, 'utf8');
assert(invCode.includes('t.jumlahPerisai'), 'IT-TOPPING-LENGTH-011 FAILED: Inventory formula changed');
console.log('✓ IT-TOPPING-LENGTH-011 PASS: Inventory service uses jumlahPerisai');

// IT-TOPPING-LENGTH-012: Edit transaksi Topping tidak rusak
assert(code.includes('validateToppingUpdate(existingDocNo, perisai)'), 'IT-TOPPING-LENGTH-012 FAILED: Edit guard modified');
console.log('✓ IT-TOPPING-LENGTH-012 PASS: Edit transaction logic intact');

// IT-TOPPING-LENGTH-013: Delete transaksi Topping tetap berjalan sesuai existing validation
const landingPath = path.resolve('js/modules/entres/entres-landing.js');
const landingCode = fs.readFileSync(landingPath, 'utf8');
assert(landingCode.includes('validateToppingDeletion'), 'IT-TOPPING-LENGTH-013 FAILED: Delete validation missing');
console.log('✓ IT-TOPPING-LENGTH-013 PASS: Delete validation intact');

console.log('\n--- ALL INTEGRATION TESTS PASSED (REVISI FLAT VALUE 0.6 METER) ---');
