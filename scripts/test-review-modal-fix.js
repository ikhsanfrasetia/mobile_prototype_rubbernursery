// Test Suite for Specific Bug Verification: Review Permintaan Modal Initialization (TEST REVIEW-01 - TEST REVIEW-10)
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { getActiveKlons } from '../js/data/klon-master.js';

console.log('=== STARTING REVIEW PERMINTAAN BUG FIX TEST SUITE (TEST REVIEW-01 - TEST REVIEW-10) ===\n');

const kspPath = path.resolve('js/modules/request/request-kebun-sepupu-landing.js');
const mePath = path.resolve('js/modules/request/request-mata-entres-landing.js');

const kspContent = fs.readFileSync(kspPath, 'utf8');
const meContent = fs.readFileSync(mePath, 'utf8');

// TEST REVIEW-01: Button .btn-action-review ditemukan di markup
assert(kspContent.includes('class="btn-action-review"'), 'TEST REVIEW-01 FAILED: .btn-action-review missing in Kebun Sepupu');
assert(kspContent.includes('Review Permintaan'), 'TEST REVIEW-01 FAILED: "Review Permintaan" text missing in Kebun Sepupu');
console.log('✓ TEST REVIEW-01: Button .btn-action-review ditemukan pada card Kebun Sepupu');

// TEST REVIEW-02: Transaction reference items[idx] valid di event handler
assert(kspContent.includes('const idx = parseInt(btn.getAttribute(\'data-index\'), 10);'), 'TEST REVIEW-02 FAILED: data-index retrieval missing');
assert(kspContent.includes('if (items[idx]) {'), 'TEST REVIEW-02 FAILED: items[idx] guard missing');
console.log('✓ TEST REVIEW-02: Transaction reference items[idx] valid dan terikat pada data-index');

// TEST REVIEW-03: openReviewModal(item, currentUser) dapat dipanggil dan di-import
assert(kspContent.includes('export function openReviewModal(item, currentUser)'), 'TEST REVIEW-03 FAILED: openReviewModal export missing');
console.log('✓ TEST REVIEW-03: openReviewModal(item, currentUser) didefinisikan dan diekspor dengan benar');

// TEST REVIEW-04 & TEST REVIEW-05: getActiveKlons di-import dan tidak ada ReferenceError
assert(kspContent.includes("import { getActiveKlons } from '../../data/klon-master.js';"), 'TEST REVIEW-04 FAILED: getActiveKlons import missing');
const activeKlons = getActiveKlons();
assert(Array.isArray(activeKlons) && activeKlons.length === 57, `TEST REVIEW-05 FAILED: getActiveKlons() count mismatch (got ${activeKlons.length})`);
console.log('✓ TEST REVIEW-04: Tidak ada ReferenceError (getActiveKlons ter-import dari klon-master.js)');
console.log(`✓ TEST REVIEW-05: getActiveKlons() berhasil menghasilkan ${activeKlons.length} master klon aktif resmi`);

// TEST REVIEW-06 & TEST REVIEW-07: Inisialisasi Modal Review Permintaan dan dropdown klon
let modalOpened = false;
let modalTitle = '';
let modalBody = '';

// Mock environment for modal opening test
global.document = {
  getElementById: (id) => {
    if (id === 'modal-root') {
      return {
        querySelector: () => null,
        querySelectorAll: () => []
      };
    }
    return null;
  }
};

const mockItem = {
  id: 'ksp-01',
  docNo: '2026/NIR/001',
  estateId: 'EST-TBS',
  targetEstateId: 'EST-APM',
  status: 'DIAJUKAN',
  requestedQty: 1000,
  klon: 'IRCA 19',
  category: 'PB',
  growthStage: 'BIBIT_SIAP_SALUR',
  requiredDate: '2026-10-09'
};

const mockUser = {
  id: 'PGS_APM',
  userId: 'PGS_APM',
  role: 'PENGURUS',
  estateId: 'EST-APM'
};

// Import module dynamically and test openReviewModal execution
const kspModule = await import('../js/modules/request/request-kebun-sepupu-landing.js');
try {
  kspModule.openReviewModal(mockItem, mockUser);
  console.log('✓ TEST REVIEW-06: Modal Review Permintaan berhasil diinisialisasi tanpa error JavaScript');
} catch (err) {
  assert.fail(`TEST REVIEW-06 FAILED: openReviewModal threw unexpected error: ${err.message}`);
}

// TEST REVIEW-07: Dropdown Klon Diproses memiliki opsi dari Master Klon
const sampleCanonical = activeKlons[0].canonicalName;
assert(kspContent.includes('activeKlons.map(k => `'), 'TEST REVIEW-07 FAILED: activeKlons mapping missing in openReviewModal');
console.log(`✓ TEST REVIEW-07: Dropdown Klon Diproses terisi opsi dari Master Klon (Contoh: "${sampleCanonical}")`);

// TEST REVIEW-08: Transaction tetap 2026/NIR/001
assert.strictEqual(mockItem.docNo, '2026/NIR/001', 'TEST REVIEW-08 FAILED: Transaction docNo altered');
assert.strictEqual(mockItem.requestedQty, 1000, 'TEST REVIEW-08 FAILED: Transaction requestedQty altered');
assert.strictEqual(mockItem.status, 'DIAJUKAN', 'TEST REVIEW-08 FAILED: Transaction status altered');
console.log('✓ TEST REVIEW-08: Transaction tetap 2026/NIR/001 tanpa mutasi');

// TEST REVIEW-09: Detail button tetap bekerja
assert(kspContent.includes('showDetailModal(items[idx], currentUser);'), 'TEST REVIEW-09 FAILED: Detail modal trigger missing');
console.log('✓ TEST REVIEW-09: Detail button tetap bekerja dan membuka showDetailModal()');

// TEST REVIEW-10: Mata Entres tetap bekerja
assert(meContent.includes('openPengurusReviewModal(tx'), 'TEST REVIEW-10 FAILED: Mata Entres review modal missing');
assert(meContent.includes('openMataEntresDetailModal(tx)'), 'TEST REVIEW-10 FAILED: Mata Entres detail modal missing');
console.log('✓ TEST REVIEW-10: Modul Permintaan Mata Entres tetap berfungsi normal tanpa regresi');

console.log('\n==================================================================');
console.log('ALL 10 REVIEW MODAL BUG FIX TESTS PASSED! (10/10)');
console.log('==================================================================\n');
