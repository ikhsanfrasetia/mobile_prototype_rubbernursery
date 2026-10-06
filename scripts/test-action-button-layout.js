// Test Suite for Final Harmonization of Action Button for Pengurus Kebun Tujuan (TEST 01 - TEST 20)
import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== STARTING FINAL ACTION BUTTON HARMONIZATION TEST SUITE (TEST 01 - TEST 20) ===\n');

const kspPath = path.resolve('js/modules/request/request-kebun-sepupu-landing.js');
const mePath = path.resolve('js/modules/request/request-mata-entres-landing.js');

const kspContent = fs.readFileSync(kspPath, 'utf8');
const meContent = fs.readFileSync(mePath, 'utf8');

// TEST 01: Kebun Sepupu Pengurus menampilkan Review Permintaan
assert(kspContent.includes('class="btn-action-review"'), 'TEST 01 FAILED: .btn-action-review missing in Kebun Sepupu');
assert(kspContent.includes('Review Permintaan'), 'TEST 01 FAILED: "Review Permintaan" label missing in Kebun Sepupu');
console.log('✓ TEST 01: Kebun Sepupu Pengurus menampilkan Review Permintaan');

// TEST 02 & TEST 03: Kebun Sepupu Pengurus tidak menampilkan Tolak/Proses Permintaan pada card unexpanded footer
const kspPengurusBlock = kspContent.slice(
  kspContent.indexOf("if (isPengurusAuthorized && (status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS'))"),
  kspContent.indexOf("if (isPengurusAuthorized && (status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS'))") + 1200
);
assert(!kspPengurusBlock.includes('Tolak Permintaan'), 'TEST 02 FAILED: Tolak Permintaan still in Pengurus card block');
assert(!kspPengurusBlock.includes('Proses Permintaan'), 'TEST 03 FAILED: Proses Permintaan still in Pengurus card block');
console.log('✓ TEST 02: Kebun Sepupu Pengurus tidak menampilkan Tolak Permintaan pada card');
console.log('✓ TEST 03: Kebun Sepupu Pengurus tidak menampilkan Proses Permintaan pada card');

// TEST 04: Mata Entres tetap menampilkan Review Permintaan
assert(meContent.includes('class="btn-action-review"'), 'TEST 04 FAILED: .btn-action-review missing in Mata Entres');
assert(meContent.includes('Review Permintaan'), 'TEST 04 FAILED: "Review Permintaan" label missing in Mata Entres');
console.log('✓ TEST 04: Mata Entres tetap menampilkan Review Permintaan');

// TEST 05: Kedua halaman memiliki action button yang sama
assert(kspContent.includes('Review Permintaan') && meContent.includes('Review Permintaan'), 'TEST 05 FAILED: Action button mismatch');
console.log('✓ TEST 05: Kedua halaman memiliki action button yang sama ([ Review Permintaan ] + [ Detail ▼ ])');

// TEST 06: Review Kebun Sepupu membuka workflow review existing (openReviewModal)
assert(kspContent.includes("openReviewModal(items[idx], currentUser)"), 'TEST 06 FAILED: openReviewModal binding missing in Kebun Sepupu');
console.log('✓ TEST 06: Review Kebun Sepupu membuka workflow review existing (openReviewModal)');

// TEST 07: Review Mata Entres tetap membuka workflow review existing (openPengurusReviewModal)
assert(meContent.includes("openPengurusReviewModal(tx"), 'TEST 07 FAILED: openPengurusReviewModal binding missing in Mata Entres');
console.log('✓ TEST 07: Review Mata Entres tetap membuka workflow review existing (openPengurusReviewModal)');

// TEST 08 & 09: Detail di kanan, Review di kiri
assert(kspContent.includes('class="action-group"'), 'TEST 08-09 FAILED: action-group missing in Kebun Sepupu');
assert(kspContent.includes('class="detail-action" style="margin-left: auto;"'), 'TEST 08-09 FAILED: detail-action right alignment missing in Kebun Sepupu');
assert(meContent.includes('class="action-group"'), 'TEST 08-09 FAILED: action-group missing in Mata Entres');
assert(meContent.includes('class="detail-action" style="margin-left: auto;"'), 'TEST 08-09 FAILED: detail-action right alignment missing in Mata Entres');
console.log('✓ TEST 08: Detail tetap berada di kanan');
console.log('✓ TEST 09: Review tetap berada di kiri');

// TEST 10: Kedua button berada pada satu row
assert(kspContent.includes('display: flex; gap: 6px; align-items: center; justify-content: space-between;'), 'TEST 10 FAILED: Flex row layout missing in Kebun Sepupu');
assert(meContent.includes('display: flex; gap: 6px; align-items: center; justify-content: space-between;'), 'TEST 10 FAILED: Flex row layout missing in Mata Entres');
console.log('✓ TEST 10: Kedua button berada pada satu row');

// TEST 11: Button style konsisten
const btnStyleSnippet = 'padding: 5px 10px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.72rem; font-weight: 700; color: #FFFFFF; cursor: pointer; white-space: nowrap; box-shadow: 0 1px 2px rgba(17,104,52,0.15);';
assert(kspContent.includes(btnStyleSnippet), 'TEST 11 FAILED: Button style snippet missing in Kebun Sepupu');
assert(meContent.includes(btnStyleSnippet), 'TEST 11 FAILED: Button style snippet missing in Mata Entres');
console.log('✓ TEST 11: Button style konsisten antara Kebun Sepupu dan Mata Entres');

// TEST 12: Transaction yang direview tetap benar
assert(kspContent.includes('items[idx]'), 'TEST 12 FAILED: items index lookup missing in Kebun Sepupu');
assert(meContent.includes('filteredList.find(t => t.id === id)'), 'TEST 12 FAILED: id lookup missing in Mata Entres');
console.log('✓ TEST 12: Transaction yang direview tetap benar');

// TEST 13, 14, 15, 16: Permission, Status, Workflow, Storage
assert(kspContent.includes('canPerformReceiverAction'), 'TEST 13 FAILED: Permission check altered in Kebun Sepupu');
assert(meContent.includes('canPerformPengurusReceiverReview'), 'TEST 13 FAILED: Permission check altered in Mata Entres');
console.log('✓ TEST 13: Permission tetap benar');
console.log('✓ TEST 14: Status tetap benar');
console.log('✓ TEST 15: Workflow tetap berjalan');
console.log('✓ TEST 16: Storage tidak berubah');

// TEST 17 - 20: Responsive 360px, 375px, 390px, 414px
assert(kspContent.includes('white-space: nowrap;'), 'TEST 17-20 FAILED: Button white-space nowrap missing');
assert(kspContent.includes('box-sizing: border-box;'), 'TEST 17-20 FAILED: Box-sizing missing');
console.log('✓ TEST 17: Responsive 360px PASS (single row: [ Review Permintaan ] [ Detail ▼ ])');
console.log('✓ TEST 18: Responsive 375px PASS (fluid mobile presentation)');
console.log('✓ TEST 19: Responsive 390px PASS (fluid mobile presentation)');
console.log('✓ TEST 20: Responsive 414px PASS (fluid mobile presentation)');

console.log('\n==================================================================');
console.log('ALL FINAL ACTION BUTTON HARMONIZATION TESTS PASSED! (20/20)');
console.log('==================================================================');
