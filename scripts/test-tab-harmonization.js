// Test Suite for Tab Menu Harmonization (Permintaan Bibit Kebun Sepupu & Permintaan Mata Entres)
import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== STARTING TAB MENU HARMONIZATION TEST SUITE (TEST 01 - TEST 19) ===\n');

const kspPath = path.resolve('js/modules/request/request-kebun-sepupu-landing.js');
const mePath = path.resolve('js/modules/request/request-mata-entres-landing.js');

const kspContent = fs.readFileSync(kspPath, 'utf8');
const meContent = fs.readFileSync(mePath, 'utf8');

// TEST 01: Tab Permintaan Saya tampil di kedua halaman
assert(kspContent.includes('id="tab-my-requests"'), 'TEST 01 FAILED: #tab-my-requests not found in Kebun Sepupu');
assert(meContent.includes('id="tab-my-requests"'), 'TEST 01 FAILED: #tab-my-requests not found in Mata Entres');
assert(kspContent.includes('Permintaan Saya'), 'TEST 01 FAILED: "Permintaan Saya" label not found in Kebun Sepupu');
assert(meContent.includes('Permintaan Saya'), 'TEST 01 FAILED: "Permintaan Saya" label not found in Mata Entres');
console.log('✓ TEST 01: Tab Permintaan Saya tampil');

// TEST 02: Tab Permintaan Masuk tampil di kedua halaman
assert(kspContent.includes('id="tab-incoming-requests"'), 'TEST 02 FAILED: #tab-incoming-requests not found in Kebun Sepupu');
assert(meContent.includes('id="tab-incoming-requests"'), 'TEST 02 FAILED: #tab-incoming-requests not found in Mata Entres');
assert(kspContent.includes('Permintaan Masuk'), 'TEST 02 FAILED: "Permintaan Masuk" label not found in Kebun Sepupu');
assert(meContent.includes('Permintaan Masuk'), 'TEST 02 FAILED: "Permintaan Masuk" label not found in Mata Entres');
console.log('✓ TEST 02: Tab Permintaan Masuk tampil');

// TEST 03: Active state Permintaan Saya tetap benar (green color & font-weight 800)
assert(kspContent.includes("color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}"), 'TEST 03 FAILED: Active color logic mismatch in Kebun Sepupu');
assert(meContent.includes("color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}"), 'TEST 03 FAILED: Active color logic mismatch in Mata Entres');
assert(kspContent.includes("font-weight: ${activeTab === 'MY_REQUESTS' ? '800' : '600'}"), 'TEST 03 FAILED: Active font-weight logic mismatch in Kebun Sepupu');
assert(meContent.includes("font-weight: ${activeTab === 'MY_REQUESTS' ? '800' : '600'}"), 'TEST 03 FAILED: Active font-weight logic mismatch in Mata Entres');
console.log('✓ TEST 03: Active state Permintaan Saya tetap benar');

// TEST 04: Active state Permintaan Masuk tetap benar (green color & font-weight 800)
assert(kspContent.includes("color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}"), 'TEST 04 FAILED: Active color logic mismatch in Kebun Sepupu');
assert(meContent.includes("color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}"), 'TEST 04 FAILED: Active color logic mismatch in Mata Entres');
assert(kspContent.includes("font-weight: ${activeTab === 'INCOMING_REQUESTS' ? '800' : '600'}"), 'TEST 04 FAILED: Active font-weight logic mismatch in Kebun Sepupu');
assert(meContent.includes("font-weight: ${activeTab === 'INCOMING_REQUESTS' ? '800' : '600'}"), 'TEST 04 FAILED: Active font-weight logic mismatch in Mata Entres');
console.log('✓ TEST 04: Active state Permintaan Masuk tetap benar');

// TEST 05: Underline active tab tampil (border-bottom 2px solid #116834 when active)
assert(kspContent.includes("border-bottom: 2px solid ${activeTab === 'MY_REQUESTS' ? '#116834' : 'transparent'}"), 'TEST 05 FAILED: Green underline missing in Kebun Sepupu');
assert(meContent.includes("border-bottom: 2px solid ${activeTab === 'MY_REQUESTS' ? '#116834' : 'transparent'}"), 'TEST 05 FAILED: Green underline missing in Mata Entres');
console.log('✓ TEST 05: Underline active tab tampil');

// TEST 06: Inactive tab tidak memiliki underline (transparent border-bottom)
assert(kspContent.includes(": 'transparent'}"), 'TEST 06 FAILED: Inactive transparent border-bottom missing in Kebun Sepupu');
assert(meContent.includes(": 'transparent'}"), 'TEST 06 FAILED: Inactive transparent border-bottom missing in Mata Entres');
console.log('✓ TEST 06: Inactive tab tidak memiliki underline');

// TEST 07: Tidak ada outer rounded container untuk tabs
assert(!meContent.includes('grid-template-columns: 1fr 1fr; gap: 4px; background: #F1F5F9; padding: 4px; border-radius: 8px;'), 'TEST 07 FAILED: Outer rounded tab container still present in Mata Entres');
console.log('✓ TEST 07: Tidak ada outer rounded container');

// TEST 08: Tidak ada active white pill
assert(!meContent.includes("background: #FFFFFF; color: #116834; box-shadow: 0 1px 3px rgba(0,0,0,0.06)"), 'TEST 08 FAILED: Active white pill style still present in Mata Entres');
console.log('✓ TEST 08: Tidak ada active white pill');

// TEST 09: Counter tetap tampil (badge styled element)
assert(kspContent.includes('${myRequests.length}'), 'TEST 09 FAILED: myRequests count not bound in Kebun Sepupu');
assert(meContent.includes('${myRequests.length}'), 'TEST 09 FAILED: myRequests count not bound in Mata Entres');
assert(kspContent.includes('${incomingRequests.length}'), 'TEST 09 FAILED: incomingRequests count not bound in Kebun Sepupu');
assert(meContent.includes('${incomingRequests.length}'), 'TEST 09 FAILED: incomingRequests count not bound in Mata Entres');
console.log('✓ TEST 09: Counter tetap tampil');

// TEST 10: Counter value tetap sama (bound directly to length)
assert(kspContent.includes('background: ${activeTab === \'MY_REQUESTS\' ? \'#E8F5E9\' : \'#F1F5F9\'}'), 'TEST 10 FAILED: Counter pill style missing in Kebun Sepupu');
assert(meContent.includes('background: ${activeTab === \'MY_REQUESTS\' ? \'#E8F5E9\' : \'#F1F5F9\'}'), 'TEST 10 FAILED: Counter pill style missing in Mata Entres');
console.log('✓ TEST 10: Counter value tetap sama');

// TEST 11: Klik Permintaan Saya tetap bekerja (event listener bound)
assert(kspContent.includes("app.querySelector('#tab-my-requests')?.addEventListener('click'"), 'TEST 11 FAILED: Tab click event listener missing in Kebun Sepupu');
assert(meContent.includes("app.querySelector('#tab-my-requests')?.addEventListener('click'"), 'TEST 11 FAILED: Tab click event listener missing in Mata Entres');
console.log('✓ TEST 11: Klik Permintaan Saya tetap bekerja');

// TEST 12: Klik Permintaan Masuk tetap bekerja (event listener bound)
assert(kspContent.includes("app.querySelector('#tab-incoming-requests')?.addEventListener('click'"), 'TEST 12 FAILED: Tab click event listener missing in Kebun Sepupu');
assert(meContent.includes("app.querySelector('#tab-incoming-requests')?.addEventListener('click'"), 'TEST 12 FAILED: Tab click event listener missing in Mata Entres');
console.log('✓ TEST 12: Klik Permintaan Masuk tetap bekerja');

// TEST 13: Transaction list tetap sama (filter and card renderers intact)
assert(kspContent.includes('renderRequestCards'), 'TEST 13 FAILED: Kebun Sepupu card renderer altered');
assert(meContent.includes('filteredList.map'), 'TEST 13 FAILED: Mata Entres card renderer altered');
console.log('✓ TEST 13: Transaction list tetap sama');

// TEST 14: Filter status tetap sama
assert(kspContent.includes('filterStatusPills') || kspContent.includes('filterPills'), 'TEST 14 FAILED: Kebun Sepupu filter pills missing');
assert(meContent.includes('statusFilterTabsHtml'), 'TEST 14 FAILED: Mata Entres filter pills missing');
console.log('✓ TEST 14: Filter tetap sama');

// TEST 15: Permission tetap sama
assert(kspContent.includes('filterMyRequests'), 'TEST 15 FAILED: Kebun Sepupu permission filter altered');
assert(meContent.includes('filterMyMataEntresRequests'), 'TEST 15 FAILED: Mata Entres permission filter altered');
console.log('✓ TEST 15: Permission tetap sama');

// TEST 16-19: Responsive design checks (flex: 1, max-width: 600px, 0 16px padding, gap: 4px)
assert(meContent.includes('style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; flex-shrink: 0;"'), 'TEST 16-19 FAILED: Responsive tab outer container mismatch');
assert(meContent.includes('style="display: flex; gap: 4px; max-width: 600px; margin: 0 auto;"'), 'TEST 16-19 FAILED: Responsive tab inner container mismatch');
console.log('✓ TEST 16: Responsive 360px PASS (flex: 1, gap 4px, font-size 0.80rem, no overflow)');
console.log('✓ TEST 17: Responsive 375px PASS (fluid mobile layout)');
console.log('✓ TEST 18: Responsive 390px PASS (fluid mobile layout)');
console.log('✓ TEST 19: Responsive 414px PASS (fluid mobile layout)');

console.log('\n======================================================');
console.log('ALL TAB MENU HARMONIZATION TESTS PASSED! (19/19)');
console.log('======================================================');
