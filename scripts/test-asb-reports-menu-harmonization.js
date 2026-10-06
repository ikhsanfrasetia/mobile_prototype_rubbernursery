import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { REPORT_MENUS } from '../js/modules/reports/reports-landing.js';

console.log('=== STARTING ASB REPORTS MENU HARMONIZATION TEST SUITE ===\n');

const reportsPath = path.resolve('js/modules/reports/reports-landing.js');
const reportsCode = fs.readFileSync(reportsPath, 'utf8');

// 1. MENU DEFINITION & ROUTES
console.log('--- 1. Menu Definition & Routes ---');
const stokMenu = REPORT_MENUS.find(m => m.id === 'stok-bibit');
const riwayatMenu = REPORT_MENUS.find(m => m.id === 'riwayat-transaksi');

assert.ok(stokMenu, 'TEST 01: Stok Bibit menu exists');
assert.strictEqual(stokMenu.title, 'Stok Bibit', 'TEST 01: Stok Bibit title intact');
assert.strictEqual(stokMenu.route, '/history', 'TEST 01: Stok Bibit route is /history');
console.log('✓ TEST 01: Stok Bibit menu & route (/history) preserved');

assert.ok(riwayatMenu, 'TEST 02: Riwayat Transaksi menu exists');
assert.ok(riwayatMenu.title.includes('Riwayat'), 'TEST 02: Riwayat Transaksi title intact');
assert.strictEqual(riwayatMenu.route, '/history', 'TEST 02: Riwayat Transaksi route is /history');
console.log('✓ TEST 02: Riwayat Transaksi menu & route (/history) preserved');

// 2. DESIGN SYSTEM & CLASS HARMONIZATION
console.log('\n--- 2. Design System & Class Harmonization ---');
assert.ok(reportsCode.includes('class="beranda-menu-card report-menu-card"'), 'TEST 03: Must use .beranda-menu-card class');
console.log('✓ TEST 03: Report menu cards use master class .beranda-menu-card');

assert.ok(reportsCode.includes('class="beranda-card-icon"'), 'TEST 04: Must use .beranda-card-icon');
console.log('✓ TEST 04: Report menu icons use master class .beranda-card-icon');

assert.ok(reportsCode.includes('class="beranda-card-title"'), 'TEST 05: Must use .beranda-card-title');
console.log('✓ TEST 05: Report menu titles use master class .beranda-card-title');

assert.ok(reportsCode.includes('class="beranda-body"'), 'TEST 06: Main container must use .beranda-body');
console.log('✓ TEST 06: Main container uses master class .beranda-body');

// 3. CONTAINER LAYOUT & REMOVAL OF OVERSIZED AD-HOC STYLES
console.log('\n--- 3. Container Layout & Dimensions ---');
assert.ok(reportsCode.includes('display: flex; gap: 8px; flex-wrap: wrap;'), 'TEST 07: Grid container must use master flex wrap');
assert.ok(!reportsCode.includes('repeat(2, 1fr)'), 'TEST 07: Oversized repeat(2, 1fr) must be removed');
assert.ok(!reportsCode.includes('min-height: 120px'), 'TEST 07: Oversized min-height must be removed');
assert.ok(!reportsCode.includes('padding: 20px 12px'), 'TEST 07: Oversized padding must be removed');
console.log('✓ TEST 07: Layout uses master flex wrap gap 8px and removed all oversized ad-hoc styles');

// 4. ICON SIZING HARMONIZATION (56px)
console.log('\n--- 4. Icon Sizing ---');
assert.ok(reportsCode.includes('width="56" height="56"'), 'TEST 08: Report icons must use 56px dimensions');
console.log('✓ TEST 08: Report SVGs use master 56px dimension');

// 5. MASTER INTEGRITY: VERIFIKASI & PEMERIKSAAN
console.log('\n--- 5. Master Integrity Check ---');
const verifCode = fs.readFileSync(path.resolve('js/modules/verification/verification-landing.js'), 'utf8');
const inspCode = fs.readFileSync(path.resolve('js/modules/inspection/inspection-landing.js'), 'utf8');

assert.ok(verifCode.includes('class="beranda-menu-card verif-grid-card"'), 'TEST 09: Verifikasi remains untouched');
assert.ok(inspCode.includes('class="beranda-menu-card inspection-asb-menu-card"'), 'TEST 10: Pemeriksaan remains untouched');
console.log('✓ TEST 09: Verifikasi master landing page intact');
console.log('✓ TEST 10: Pemeriksaan landing page intact');

console.log('\n======================================================');
console.log('ALL ASB REPORTS MENU HARMONIZATION TESTS PASSED! (10/10)');
console.log('======================================================\n');
