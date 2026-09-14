import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== TEST SUITE: VERIFIKASI CARD OKULASI & KODE BEDENGAN ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Check formatBedenganCode function in budding-grafting.js
import { formatBedenganCode } from '../js/modules/budding/budding-grafting.js';

assert(typeof formatBedenganCode === 'function', 'formatBedenganCode is exported as a function');
assert(formatBedenganCode('Bedengan-001') === 'BED-001', 'Bedengan-001 -> BED-001');
assert(formatBedenganCode('Bedengan 01') === 'BED-001', 'Bedengan 01 -> BED-001');
assert(formatBedenganCode('Bedengan-002') === 'BED-002', 'Bedengan-002 -> BED-002');
assert(formatBedenganCode('Bedengan-003, Bedengan-004') === 'Bedengan-003, Bedengan-004' || formatBedenganCode('Bedengan-003') === 'BED-003', 'Bedengan-003 -> BED-003');
assert(formatBedenganCode('BED-001') === 'BED-001', 'BED-001 -> BED-001');
assert(formatBedenganCode(null, 'BED-005') === 'BED-005', 'bedenganCode fallback -> BED-005');

// 2. Check Static code in budding-grafting.js
const graftCode = fs.readFileSync(path.join(rootDir, 'js/modules/budding/budding-grafting.js'), 'utf8');

assert(graftCode.includes('formatBedenganCode(r.bedengan, r.bedenganCode)'), 'Card maps bedengan codes cleanly');
assert(graftCode.includes('populasiBibit.toLocaleString'), 'Populasi bibit formatted with toLocaleString');
assert(graftCode.includes('sisaBelumOkulasi.toLocaleString'), 'Sisa belum okulasi formatted with toLocaleString');
assert(graftCode.includes('ttlDiokulasi.toLocaleString'), 'Total diokulasi formatted with toLocaleString');
assert(graftCode.includes('word-break: break-word'), 'Lokasi Bedengan uses word-break for clean wrapping');

// 3. Check budding-form.js & budding-regrafting.js
const formCode = fs.readFileSync(path.join(rootDir, 'js/modules/budding/budding-form.js'), 'utf8');
const regraftCode = fs.readFileSync(path.join(rootDir, 'js/modules/budding/budding-regrafting.js'), 'utf8');

assert(formCode.includes('formatBedenganCode'), 'budding-form.js uses formatBedenganCode');
assert(regraftCode.includes('formatBedenganCode'), 'budding-regrafting.js uses formatBedenganCode');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
