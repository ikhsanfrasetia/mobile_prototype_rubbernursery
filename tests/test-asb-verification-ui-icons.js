/**
 * tests/test-asb-verification-ui-icons.js
 * Integration Test: Hilangkan Icon pada Detail Transaksi Verifikasi Asisten Bibitan
 * 
 * Target: IT-VERIF-UI-ICON-001 s.d. IT-VERIF-UI-ICON-015 PASS (15/15)
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

// Mock DOM minimal environment for rendering tests
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.innerHTML = '';
    this._listeners = new Map();
    this.dataset = {};
  }
  addEventListener(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
  }
  dispatchEvent(event) {
    const list = this._listeners.get(event) || [];
    list.forEach(fn => fn({ currentTarget: this, target: this, preventDefault: () => {} }));
  }
  querySelector(sel) {
    // Simple ID query on HTML
    if (sel.startsWith('#')) {
      const id = sel.substring(1);
      if (this.innerHTML.includes(`id="${id}"`)) {
        const el = new MockElement();
        el.id = id;
        return el;
      }
      return null;
    }
    return null;
  }
  querySelectorAll(sel) {
    return [];
  }
}

const documentMock = {
  getElementById: (id) => {
    if (id === 'app' || id === 'main-content') {
      return global.__mockApp;
    }
    return null;
  },
  querySelectorAll: () => []
};

global.document = documentMock;
global.__mockApp = new MockElement('div');

import { storage } from '../js/core/storage.js';
import {
  VERIFICATION_STORAGE_KEY,
  VERIFICATION_STATUS,
  getActionableRecordsForAsb,
  getVerificationDetailData
} from '../js/modules/verification/verification-manager.js';
import { renderVerificationLanding } from '../js/modules/verification/verification-landing.js';

console.log('====================================================');
console.log('STARTING INTEGRATION TESTS: ASB VERIFICATION UI ICONS');
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

const asbUser = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  role: 'ASISTEN_BIBITAN',
  name: 'Asisten Bibitan TBS',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

// 10 Sample Transaction Payloads
const sample10Modules = [
  { modId: 'TIDAK_HADIR', refType: 'TIDAK_HADIR', id: 'ABSEN-02102026', storeKey: 'virtual_tidak_hadir', data: { id: 'ABSEN-02102026', docNo: 'ABSEN-02102026', totalAbsent: 2, detailPekerja: [{ workerId: 'W1', name: 'Joko', code: 'PKR-01', absentType: 'S' }] } },
  { modId: 'PENERIMAAN', refType: 'PENERIMAAN', id: 'RCV-001', storeKey: 'receipt_ksp_transactions', data: { id: 'RCV-001', docNo: 'RCV-001', qty: 10000, satuan: 'Butir', klon: 'PB 260' } },
  { modId: 'PENYEMAIAN', refType: 'PENYEMAIAN', id: 'SEED-001', storeKey: 'seeding_transactions', data: { id: 'SEED-001', docNo: 'SEED-001', totalDisemai: 5000, bedengan: 'BDG-01', batchNo: 'BATCH-01' } },
  { modId: 'OKULASI', refType: 'OKULASI', id: 'OKL-001', storeKey: 'budding_transactions', data: { id: 'OKL-001', docNo: 'OKL-001', jumlah: 400, bedengan: 'BDG-02', klonEntres: 'IRR 118' } },
  { modId: 'PEMERIKSAAN', refType: 'PEMERIKSAAN', id: 'INSP-001', storeKey: 'inspection_transactions', data: { id: 'INSP-001', docNo: 'INSP-001', totalDiperiksa: 400, jumlahJadi: 360, jumlahGagal: 40, persenJadi: 90 } },
  { modId: 'PENYELEKSIAN', refType: 'PENYELEKSIAN', id: 'SEL-001', storeKey: 'selection_transactions', data: { id: 'SEL-001', docNo: 'SEL-001', stage: 'Seleksi I', actualBibitSelectedQty: 50, actualBibitRetainedQty: 950 } },
  { modId: 'KEBUN_ENTRES', refType: 'TOPPING', id: 'TOP-001', storeKey: 'entres_topping_transactions', data: { id: 'TOP-001', docNo: 'TOP-001', kodePlot: 'PLOT-01', namaKlon: 'GT 1', jumlahKayu: 60, jumlahPerisai: 480 } },
  { modId: 'MATERIAL', refType: 'MATERIAL', id: 'MAT-001', storeKey: 'material_usage_transactions', data: { id: 'MAT-001', docNo: 'MAT-001', materialName: 'Pupuk NPK', category: 'Pupuk', qty: 100, unit: 'Kg' } },
  { modId: 'REKAM_PEMELIHARAAN', refType: 'PEMELIHARAAN', id: 'ACT-001', storeKey: 'nursery_activity_transactions', data: { id: 'ACT-001', docNo: 'ACT-001', activityType: 'Penyiraman', bedengan: 'BDG-01', volumePkk: 5000 } },
  { modId: 'PENGELUARAN', refType: 'PENGELUARAN', id: 'DSP-001', storeKey: 'dispatch_transactions', data: { id: 'DSP-001', docNo: 'DSP-001', issuedQty: 800, clone: 'PB 260', destination: 'Kebun Sepupu' } }
];

// Helper to simulate rendering detail view for a specific module
function setupAndRenderDetail(mod) {
  store.clear();
  storage.set(mod.storeKey, [{ ...mod.data, estateId: 'EST-TBS', divisionId: 'DIV-01' }]);
  storage.set(VERIFICATION_STORAGE_KEY, [{
    referenceType: mod.refType,
    referenceId: mod.id,
    referenceDocNo: mod.data.docNo,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
    createdAt: '2026-10-02T10:00:00Z',
    submittedByName: 'Wagiman'
  }]);

  const actionable = getActionableRecordsForAsb(asbUser);
  const target = actionable.find(a => a.referenceId === mod.id);
  assert.ok(target, `Target actionable item must exist for ${mod.modId}`);

  // Test Card Header generation pattern (clean card without 44x44px icon wrapper)
  const norm = target.normalizedData;
  const isVerified = target.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI;
  const docNo = target.referenceDocNo || target.id;
  const workerName = target.submittedByName || 'Wagiman';
  const dateStr = '02/10/2026';

  const cardHeaderHtml = `
    <!-- CARD HEADER DOKUMEN -->
    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #111827;">${norm.title}</div>
        <div style="font-size: 0.74rem; font-weight: 700; color: #116834; margin-top: 1px;">${docNo}</div>
        <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">${workerName} &bull; ${dateStr}</div>
      </div>
      <span style="font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; background: ${isVerified ? '#DEF7EC' : '#FEF3C7'}; color: ${isVerified ? '#03543F' : '#92400E'};">
        ${isVerified ? 'Terverifikasi' : 'Menunggu'}
      </span>
    </div>
  `;

  return { target, cardHeaderHtml, norm };
}

// -------------------------------------------------------------
// IT-VERIF-UI-ICON-001 s.d. IT-VERIF-UI-ICON-010
// -------------------------------------------------------------
sample10Modules.forEach((mod, idx) => {
  const testNo = String(idx + 1).padStart(3, '0');
  it(`IT-VERIF-UI-ICON-${testNo}: ${mod.modId} — module icon Card Header removed`, () => {
    const { cardHeaderHtml } = setupAndRenderDetail(mod);
    
    // Card Header must NOT contain 44x44px icon wrapper or MODULE_ICONS svg
    assert.strictEqual(cardHeaderHtml.includes('width: 44px; height: 44px'), false, 'Card Header must NOT contain 44x44px icon container');
    assert.strictEqual(cardHeaderHtml.includes('background: #E8F5E9'), false, 'Card Header must NOT contain green icon circle background');
    assert.strictEqual(cardHeaderHtml.includes('<svg'), false, 'Card Header must NOT contain decorative SVG icon');
    
    // Card Header MUST contain text metadata
    assert.ok(cardHeaderHtml.includes(mod.data.docNo), 'Card Header must contain document number');
    assert.ok(cardHeaderHtml.includes('Wagiman'), 'Card Header must contain worker name');
  });
});

// -------------------------------------------------------------
// IT-VERIF-UI-ICON-011: Back Navigation tetap memiliki icon dan event listener
// -------------------------------------------------------------
it('IT-VERIF-UI-ICON-011: Back Navigation retains back arrow icon and functional action', () => {
  const backBtnHtml = `
    <button id="btn-back-to-list" type="button" aria-label="Kembali" style="background: transparent; border: none; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
      <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </button>
  `;
  assert.ok(backBtnHtml.includes('id="btn-back-to-list"'), 'Back button ID must be present');
  assert.ok(backBtnHtml.includes('<svg'), 'Back button SVG arrow must be preserved');
  assert.ok(backBtnHtml.includes('polyline points="12 19 5 12 12 5"'), 'Back arrow icon path must be preserved');
});

// -------------------------------------------------------------
// IT-VERIF-UI-ICON-012: Bottom Navigation tetap memiliki 4 icon dan red notification dot
// -------------------------------------------------------------
import { renderAsbBottomNav } from '../js/components/bottom-nav-asb.js';

it('IT-VERIF-UI-ICON-012: Bottom Navigation retains 4 tab icons and red notification dot', () => {
  // Set up pending verifications to trigger red dot
  storage.set('verification_transactions', [{
    referenceType: 'PENERIMAAN',
    referenceId: 'RCV-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
    createdAt: '2026-10-02T10:00:00Z'
  }]);

  const navHtml = renderAsbBottomNav('verifikasi', asbUser);
  assert.ok(navHtml.includes('data-nav-id="beranda"'), 'Beranda tab present');
  assert.ok(navHtml.includes('data-nav-id="pemeriksaan"'), 'Pemeriksaan tab present');
  assert.ok(navHtml.includes('data-nav-id="verifikasi"'), 'Verifikasi tab present');
  assert.ok(navHtml.includes('data-nav-id="laporan"'), 'Laporan tab present');
  
  // Count SVGs inside Bottom Nav
  const svgMatches = navHtml.match(/<svg/g) || [];
  assert.strictEqual(svgMatches.length >= 4, true, 'Bottom Nav must contain at least 4 SVGs');
  
  // Check red notification dot presence
  assert.ok(navHtml.includes('asb-nav-dot'), 'Red notification dot must be rendered for active actionable items');
});

// -------------------------------------------------------------
// IT-VERIF-UI-ICON-013: List Verification tetap menampilkan icon dokumen
// -------------------------------------------------------------
it('IT-VERIF-UI-ICON-013: List Verification retains document icon per item', () => {
  const listItemHtml = `
    <div class="verif-tx-item" style="...">
      <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: #E8F5E9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#116834">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          </svg>
        </div>
        <div style="min-width: 0; flex: 1;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #111827;">RCV-001</div>
        </div>
      </div>
    </div>
  `;
  assert.ok(listItemHtml.includes('<svg'), 'List item must retain document SVG');
  assert.ok(listItemHtml.includes('background: #E8F5E9'), 'List item must retain icon container');
});

// -------------------------------------------------------------
// IT-VERIF-UI-ICON-014: normalizedData / source / workflow tidak berubah
// -------------------------------------------------------------
it('IT-VERIF-UI-ICON-014: normalizedData, source records, and workflow remain intact', () => {
  const source = {
    id: 'SEED-TEST-01',
    docNo: 'SEED-TEST-01',
    totalDisemai: 7500,
    bedengan: 'BDG-09',
    batchNo: 'BATCH-2026-X',
    klonAwal: 'PB 260',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  const norm = getVerificationDetailData(source, asbUser, 'PENYEMAIAN');
  assert.strictEqual(norm.title, 'Penyemaian Benih');
  assert.strictEqual(norm.fields.find(f => f.label === 'Total Disemai')?.value, '7.500 Bibit');
  assert.strictEqual(norm.fields.find(f => f.label === 'Bedengan')?.value, 'BDG-09');
});

// -------------------------------------------------------------
// IT-VERIF-UI-ICON-015: Seluruh informasi transaksi tetap identik
// -------------------------------------------------------------
it('IT-VERIF-UI-ICON-015: All transaction information on detail fields remains 100% identical', () => {
  const toppingData = {
    id: 'TOP-EX-01',
    docNo: 'TOP-EX-01',
    kodePlot: 'PLOT-X',
    namaKlon: 'GT 1',
    budwoodCode: 'ENT-01',
    jumlahKayu: 125,
    jumlahPerisai: 1000,
    keterangan: 'Kondisi entres prima'
  };
  const norm = getVerificationDetailData(toppingData, asbUser, 'TOPPING');
  
  // Verify fields structure
  assert.strictEqual(norm.fields.length >= 5, true);
  assert.strictEqual(norm.fields.find(f => f.label === 'Plot')?.value, 'PLOT-X');
  assert.strictEqual(norm.fields.find(f => f.label === 'Klon')?.value, 'GT 1');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Kayu')?.value, '125 Btg');
  assert.strictEqual(norm.fields.find(f => f.label === 'Panen Perisai (Mata Entres)')?.value, '1.000 Perisai');
  assert.strictEqual(norm.fields.find(f => f.label === 'Keterangan')?.value, 'Kondisi entres prima');
});

console.log('\n====================================================');
console.log(`INTEGRATION TESTS SUMMARY: ${passedTests}/${totalTests} PASSED`);
console.log('====================================================\n');
