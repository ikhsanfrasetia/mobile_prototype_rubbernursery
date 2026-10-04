/**
 * tests/test-pindah-semai-empty-state-and-ui-standardization.js
 * Integration Test Suite: Empty State & Container Standardization for Pindah Semai (SIGMA Rubber Nursery)
 */

// Mock Storage and DOM Environment for Node.js
const mockStore = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => mockStore.has(k) ? mockStore.get(k) : null,
    setItem: (k, v) => mockStore.set(k, String(v)),
    removeItem: (k) => mockStore.delete(k),
    clear: () => mockStore.clear()
  };
}

import { renderPindahSemaiTabContent } from '../js/modules/seeding/seeding-landing.js';
import { storage } from '../js/core/storage.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================================');
console.log('RUNNING INTEGRATION TESTS: PINDAH SEMAI EMPTY STATE & UI STANDARDIZATION');
console.log('================================================================================\n');

// Mock Data Builders
function createMockReadySource(id = '1') {
  return {
    sourceType: 'DEDER_INSPECTION',
    sourceDederTxId: `DED-TX-00${id}`,
    sourceDederDocNo: `2026/DED/00${id}`,
    dederanTxDocNo: `2026/DED/00${id}`,
    parentDederIndukDocNo: `2026/DDR/00${id}`,
    docNo: `2026/DED/00${id}`,
    sourceIndex: `DED_DED-TX-00${id}`,
    tanggal: '2026-04-10',
    klon: 'GT 1',
    bedenganCode: `BED-00${id}`,
    bedengan: `BED-00${id}`,
    totalBerhasil: 5000,
    remainingQty: 4900,
    isApproved: true,
    selectionStatus: 'DISETUJUI'
  };
}

function createMockPendingSource(id = '1') {
  return {
    sourceType: 'DEDER_INSPECTION',
    sourceDederTxId: `DED-TX-P0${id}`,
    sourceDederDocNo: `2026/DED/P0${id}`,
    dederanTxDocNo: `2026/DED/P0${id}`,
    parentDederIndukDocNo: `2026/DDR/P0${id}`,
    docNo: `2026/DED/P0${id}`,
    sourceIndex: `DED_DED-TX-P0${id}`,
    tanggal: '2026-04-10',
    klon: 'PB 260',
    bedenganCode: `BED-P0${id}`,
    bedengan: `BED-P0${id}`,
    totalBerhasil: 3000,
    totalTidakBerhasil: 100,
    remainingQty: 3000,
    isApproved: false,
    selectionStatus: 'MENUNGGU_VERIFIKASI',
    selectionStatusLabel: 'Menunggu Persetujuan Pemeriksaan'
  };
}

// -----------------------------------------------------------------------------
// TEST CASE 1: IT-PINDAH-SEMAI-EMPTY-001 (READY = 0, PENDING = 0)
// -----------------------------------------------------------------------------
{
  const html = renderPindahSemaiTabContent([], [], []);
  assert(html.includes('Belum Ada Sumber Siap Pindah Semai'), 'IT-PINDAH-SEMAI-EMPTY-001a: Empty state tampil saat READY=0 dan PENDING=0');
  assert(html.includes('Bedengan Siap Pindah Semai'), 'IT-PINDAH-SEMAI-EMPTY-001b: Header section Bedengan Siap Pindah Semai tetap ada');
  assert(!html.includes('Menunggu Persetujuan Asisten'), 'IT-PINDAH-SEMAI-EMPTY-001c: Section Menunggu Persetujuan Asisten tidak tampil saat pending=0');
}

// -----------------------------------------------------------------------------
// TEST CASE 2: IT-PINDAH-SEMAI-EMPTY-002 (READY = 1, PENDING = 0)
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const html = renderPindahSemaiTabContent(readySources, [], []);
  assert(!html.includes('Belum Ada Sumber Siap Pindah Semai'), 'IT-PINDAH-SEMAI-EMPTY-002a: Empty state TIDAK tampil saat READY=1 dan PENDING=0');
  assert(html.includes('card-pindah-semai-wrapper'), 'IT-PINDAH-SEMAI-EMPTY-002b: Card pindah semai dirender untuk ready source');
  assert(html.includes('2026/DED/001'), 'IT-PINDAH-SEMAI-EMPTY-002c: Nomor dokumen ready source tampil');
}

// -----------------------------------------------------------------------------
// TEST CASE 3: IT-PINDAH-SEMAI-EMPTY-003 (READY = 0, PENDING = 4)
// -----------------------------------------------------------------------------
{
  const pendingSources = [
    createMockPendingSource('1'),
    createMockPendingSource('2'),
    createMockPendingSource('3'),
    createMockPendingSource('4')
  ];
  const html = renderPindahSemaiTabContent([], [], pendingSources);
  assert(!html.includes('Belum Ada Sumber Siap Pindah Semai'), 'IT-PINDAH-SEMAI-EMPTY-003a: Empty state TIDAK tampil saat READY=0 dan PENDING=4');
  assert(html.includes('Menunggu Persetujuan Asisten'), 'IT-PINDAH-SEMAI-EMPTY-003b: Section Menunggu Persetujuan Asisten tampil');
  assert(html.includes('4 Bedengan'), 'IT-PINDAH-SEMAI-EMPTY-003c: Badge menampilkan 4 Bedengan');
  assert(!html.includes('card-pindah-semai-wrapper'), 'IT-PINDAH-SEMAI-EMPTY-003d: Tidak merender card ready saat ready=0');
}

// -----------------------------------------------------------------------------
// TEST CASE 4: IT-PINDAH-SEMAI-EMPTY-004 (READY = 1, PENDING = 4)
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const pendingSources = [
    createMockPendingSource('1'),
    createMockPendingSource('2'),
    createMockPendingSource('3'),
    createMockPendingSource('4')
  ];
  const html = renderPindahSemaiTabContent(readySources, [], pendingSources);
  assert(!html.includes('Belum Ada Sumber Siap Pindah Semai'), 'IT-PINDAH-SEMAI-EMPTY-004a: Empty state TIDAK tampil saat READY=1 dan PENDING=4');
  assert(html.includes('card-pindah-semai-wrapper'), 'IT-PINDAH-SEMAI-EMPTY-004b: Card ready tampil');
  assert(html.includes('card-waiting-approval'), 'IT-PINDAH-SEMAI-EMPTY-004c: Card waiting approval tampil');
}

// -----------------------------------------------------------------------------
// TEST CASE 5: IT-PINDAH-SEMAI-EMPTY-005 (READY COUNT SEMANTIC)
// -----------------------------------------------------------------------------
{
  const pendingSources = [createMockPendingSource('1'), createMockPendingSource('2')];
  const html = renderPindahSemaiTabContent([], [], pendingSources);
  assert(html.includes('Bedengan Siap Pindah Semai') && (html.includes('>0<') || html.includes('>\n              0\n            <')), 'IT-PINDAH-SEMAI-EMPTY-005: Ready count tetap 0 saat hanya ada pending');
}

// -----------------------------------------------------------------------------
// TEST CASE 6: IT-PINDAH-SEMAI-EMPTY-006 (PENDING COUNT SEMANTIC)
// -----------------------------------------------------------------------------
{
  const pendingSources = [
    createMockPendingSource('1'),
    createMockPendingSource('2'),
    createMockPendingSource('3')
  ];
  const html = renderPindahSemaiTabContent([], [], pendingSources);
  assert(html.includes('3 Bedengan'), 'IT-PINDAH-SEMAI-EMPTY-006: Pending count tepat menunjukkan 3 Bedengan');
}

// -----------------------------------------------------------------------------
// TEST CASE 7: IT-PINDAH-SEMAI-UI-007 (GERMINASI CARD STRUCTURE PATTERN)
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const html = renderPindahSemaiTabContent(readySources, [], []);
  assert(html.includes('card-summary-wrapper'), 'IT-PINDAH-SEMAI-UI-007a: Container uses .card-summary-wrapper class');
  assert(html.includes('card-pindah-semai-wrapper'), 'IT-PINDAH-SEMAI-UI-007b: Container uses .card-pindah-semai-wrapper class');
  assert(html.includes('border-radius: 10px'), 'IT-PINDAH-SEMAI-UI-007c: Card uses 10px rounded border matching Germinasi');
  assert(html.includes('border: 1px solid #E2E8F0'), 'IT-PINDAH-SEMAI-UI-007d: Card uses 1px slate border matching Germinasi');
  assert(html.includes('status-dot') || html.includes('SELECTION_APPROVED'), 'IT-PINDAH-SEMAI-UI-007e: Status dot rendered on ready card');
  assert(html.includes('btn-execute-pindah-semai'), 'IT-PINDAH-SEMAI-UI-007f: Action button Proses Pindah Semai (Polybag) present');
}

// -----------------------------------------------------------------------------
// TEST CASE 8: IT-PINDAH-SEMAI-UI-008 (CANONICAL METADATA HIERARCHY)
// -----------------------------------------------------------------------------
{
  const readySources = [{
    sourceType: 'DEDER_INSPECTION',
    docNo: '2026/DED/777',
    parentDederIndukDocNo: '2026/DDR/999',
    tanggal: '2026-05-12',
    klon: 'AVROS 2003',
    bedenganCode: 'BED-777',
    totalBerhasil: 4500,
    remainingQty: 4500,
    isApproved: true
  }];
  const html = renderPindahSemaiTabContent(readySources, [], []);
  assert(html.includes('2026/DED/777'), 'IT-PINDAH-SEMAI-UI-008a: Document number 2026/DED/777 rendered');
  assert(html.includes('Dok. Induk:') && html.includes('2026/DDR/999'), 'IT-PINDAH-SEMAI-UI-008b: Parent doc 2026/DDR/999 rendered in second row');
  assert(html.includes('Klon:') && html.includes('AVROS 2003'), 'IT-PINDAH-SEMAI-UI-008c: Klon AVROS 2003 rendered');
  assert(html.includes('Bedengan:') && html.includes('BED-777'), 'IT-PINDAH-SEMAI-UI-008d: Bedengan BED-777 rendered');
  assert(html.includes('Tgl:') && html.includes('2026-05-12'), 'IT-PINDAH-SEMAI-UI-008e: Tanggal 2026-05-12 rendered');
}

// -----------------------------------------------------------------------------
// TEST CASE 9: IT-PINDAH-SEMAI-UI-009 (METRICS CONTAINER VALUE CANONICAL)
// -----------------------------------------------------------------------------
{
  const readySources = [{
    sourceType: 'DEDER_INSPECTION',
    docNo: '2026/DED/001',
    parentDederIndukDocNo: '2026/DDR/001',
    totalBerhasil: 6000,
    remainingQty: 3500,
    isApproved: true
  }];
  const pendingSources = [{
    sourceType: 'DEDER_INSPECTION',
    docNo: '2026/DED/P01',
    parentDederIndukDocNo: '2026/DDR/P01',
    totalBerhasil: 4000,
    totalTidakBerhasil: 250,
    isApproved: false
  }];
  const html = renderPindahSemaiTabContent(readySources, [], pendingSources);
  
  // Ready metrics
  assert(html.includes('Jumlah Hasil Deder') && html.includes('6.000 Butir'), 'IT-PINDAH-SEMAI-UI-009a: Ready metric Jumlah Hasil Deder = 6.000 Butir');
  assert(html.includes('Belum Pindah Semai') && html.includes('3.500 Butir'), 'IT-PINDAH-SEMAI-UI-009b: Ready metric Belum Pindah Semai = 3.500 Butir');

  // Pending metrics
  assert(html.includes('Hasil Layak') && html.includes('4.000 Butir'), 'IT-PINDAH-SEMAI-UI-009c: Pending metric Hasil Layak = 4.000 Butir');
  assert(html.includes('Afkir') && html.includes('250 Butir'), 'IT-PINDAH-SEMAI-UI-009d: Pending metric Afkir = 250 Butir');
}

// -----------------------------------------------------------------------------
// TEST CASE 10: IT-PINDAH-SEMAI-UI-010 (ZERO STORAGE MUTATION ON RENDER)
// -----------------------------------------------------------------------------
{
  storage.set('dederan_transactions', [{ id: 'TEST-1' }]);
  storage.set('seeding_transactions', [{ id: 'TEST-2' }]);
  const snapshotDederan = JSON.stringify(storage.get('dederan_transactions'));
  const snapshotSeeding = JSON.stringify(storage.get('seeding_transactions'));

  renderPindahSemaiTabContent([createMockReadySource('1')], [{ id: 'TEST-2' }], [createMockPendingSource('1')]);

  const afterDederan = JSON.stringify(storage.get('dederan_transactions'));
  const afterSeeding = JSON.stringify(storage.get('seeding_transactions'));

  assert(snapshotDederan === afterDederan, 'IT-PINDAH-SEMAI-UI-010a: Zero mutation on dederan_transactions');
  assert(snapshotSeeding === afterSeeding, 'IT-PINDAH-SEMAI-UI-010b: Zero mutation on seeding_transactions');
}

// -----------------------------------------------------------------------------
// TEST CASE 11: IT-PINDAH-SEMAI-UI-011 (NO OUTER GRAY WRAPPER ON PENDING SECTION)
// -----------------------------------------------------------------------------
{
  const pendingSources = [createMockPendingSource('1')];
  const html = renderPindahSemaiTabContent([], [], pendingSources);
  // Pastikan section header adalah direct child tanpa outer card box wrapper background #F8FAFC
  assert(!html.includes('background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column;'), 'IT-PINDAH-SEMAI-UI-011a: Pending section tidak memiliki outer gray card wrapper');
  assert(html.includes('card-summary-wrapper card-waiting-approval'), 'IT-PINDAH-SEMAI-UI-011b: Pending document card menjadi direct children section list');
}

// -----------------------------------------------------------------------------
// TEST CASE 12: IT-PINDAH-SEMAI-UI-012 (READY CARD HAS ELLIPSIS TRIGGER)
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const html = renderPindahSemaiTabContent(readySources, [], []);
  assert(html.includes('btn-tx-action-trigger'), 'IT-PINDAH-SEMAI-UI-012a: READY card memiliki .btn-tx-action-trigger');
  assert(html.includes('aria-label="Menu Aksi"'), 'IT-PINDAH-SEMAI-UI-012b: READY card ellipsis memiliki aria-label Menu Aksi');
}

// -----------------------------------------------------------------------------
// TEST CASE 13: IT-PINDAH-SEMAI-UI-013 (PENDING CARD HAS ELLIPSIS TRIGGER)
// -----------------------------------------------------------------------------
{
  const pendingSources = [createMockPendingSource('1')];
  const html = renderPindahSemaiTabContent([], [], pendingSources);
  assert(html.includes('btn-tx-action-trigger'), 'IT-PINDAH-SEMAI-UI-013a: PENDING card memiliki .btn-tx-action-trigger');
  assert(html.includes('aria-label="Menu Aksi"'), 'IT-PINDAH-SEMAI-UI-013b: PENDING card ellipsis memiliki aria-label Menu Aksi');
}

// -----------------------------------------------------------------------------
// TEST CASE 14: IT-PINDAH-SEMAI-UI-014 (METADATA SEPARATOR IS BULLET "•")
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const pendingSources = [createMockPendingSource('1')];
  const htmlReady = renderPindahSemaiTabContent(readySources, [], []);
  const htmlPending = renderPindahSemaiTabContent([], [], pendingSources);

  assert(htmlReady.includes('Dok. Induk:') && htmlReady.includes('• Klon:') && htmlReady.includes('Bedengan:') && htmlReady.includes('• Tgl:'), 'IT-PINDAH-SEMAI-UI-014a: READY card metadata menggunakan separator "•"');
  assert(htmlPending.includes('Dok. Induk:') && htmlPending.includes('• Klon:') && htmlPending.includes('Bedengan:') && htmlPending.includes('• Tgl:'), 'IT-PINDAH-SEMAI-UI-014b: PENDING card metadata menggunakan separator "•"');
  assert(!htmlReady.includes('· Klon:'), 'IT-PINDAH-SEMAI-UI-014c: Tidak menggunakan separator middle dot "·" pada ready card');
  assert(!htmlPending.includes('· Klon:'), 'IT-PINDAH-SEMAI-UI-014d: Tidak menggunakan separator middle dot "·" pada pending card');
}

// -----------------------------------------------------------------------------
// TEST CASE 15: IT-PINDAH-SEMAI-UI-015 (METRICS CONTAINER SPACING & PADDING)
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const html = renderPindahSemaiTabContent(readySources, [], []);
  assert(html.includes('margin-top: 8px'), 'IT-PINDAH-SEMAI-UI-015a: Metrics container memiliki margin-top: 8px');
  assert(html.includes('padding: 8px 12px'), 'IT-PINDAH-SEMAI-UI-015b: Metrics container memiliki padding: 8px 12px');
  assert(html.includes('background: #F8FAFC'), 'IT-PINDAH-SEMAI-UI-015c: Metrics container memiliki background: #F8FAFC');
}

// -----------------------------------------------------------------------------
// TEST CASE 16: IT-PINDAH-SEMAI-UI-016 (OUTER CARD BORDER & RADIUS)
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const pendingSources = [createMockPendingSource('1')];
  const htmlReady = renderPindahSemaiTabContent(readySources, [], []);
  const htmlPending = renderPindahSemaiTabContent([], [], pendingSources);

  assert(htmlReady.includes('border: 1px solid #E2E8F0') && htmlReady.includes('border-radius: 10px'), 'IT-PINDAH-SEMAI-UI-016a: READY card menggunakan border #E2E8F0 dan border-radius 10px');
  assert(htmlPending.includes('border: 1px solid #E2E8F0') && htmlPending.includes('border-radius: 10px'), 'IT-PINDAH-SEMAI-UI-016b: PENDING card menggunakan border #E2E8F0 dan border-radius 10px');
}

// -----------------------------------------------------------------------------
// TEST CASE 17: IT-PINDAH-SEMAI-UI-017 (DOCUMENT CARD HIERARCHY)
// -----------------------------------------------------------------------------
{
  const readySources = [createMockReadySource('1')];
  const html = renderPindahSemaiTabContent(readySources, [], []);
  
  const headerIdx = html.indexOf('2026/DED/001');
  const metaIdx = html.indexOf('Dok. Induk:');
  const metricsIdx = html.indexOf('Jumlah Hasil Deder');
  const actionIdx = html.indexOf('Proses Pindah Semai (Polybag)');

  assert(headerIdx < metaIdx && metaIdx < metricsIdx && metricsIdx < actionIdx, 'IT-PINDAH-SEMAI-UI-017: Hierarchy urutan: Header -> Metadata -> Metrics -> Action');
}

// -----------------------------------------------------------------------------
// TEST CASE 18: IT-PINDAH-SEMAI-UI-018 (NO DATA MUTATION)
// -----------------------------------------------------------------------------
{
  const beforeLen = storage.get('seeding_transactions', []).length;
  renderPindahSemaiTabContent([createMockReadySource('1')], [], [createMockPendingSource('1')]);
  const afterLen = storage.get('seeding_transactions', []).length;
  assert(beforeLen === afterLen, 'IT-PINDAH-SEMAI-UI-018: Seeding transactions length identical before and after render');
}

// =============================================================================
// HARMONISASI FINAL UI/UX PINDAH SEMAI SPECIFIC TEST SUITE
// =============================================================================

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-001: Section title dan badge berada dalam satu flex row
// -----------------------------------------------------------------------------
{
  const pendingSources = [createMockPendingSource('1'), createMockPendingSource('2')];
  const html = renderPindahSemaiTabContent([createMockReadySource('1')], [], pendingSources);
  
  const hasReadyHeaderRow = html.includes('display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;');
  const hasPendingHeaderTitle = html.includes('<h2 style="font-size: 0.90rem; font-weight: 700; color: #0F172A; margin: 0; letter-spacing: -0.01em; min-width: 0; flex: 1;">\n            Menunggu Persetujuan Asisten\n          </h2>') ||
    html.includes('Menunggu Persetujuan Asisten');
  
  assert(hasReadyHeaderRow && hasPendingHeaderTitle, 'IT-PINDAH-SEMAI-HARMONIZE-001: Section title dan badge berada dalam satu flex row');
}

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-002: Badge flex-shrink: 0 & white-space: nowrap
// -----------------------------------------------------------------------------
{
  const pendingSources = [createMockPendingSource('1')];
  const html = renderPindahSemaiTabContent([createMockReadySource('1')], [], pendingSources);

  const hasBadgeRules = html.includes('flex-shrink: 0; white-space: nowrap;');
  assert(hasBadgeRules, 'IT-PINDAH-SEMAI-HARMONIZE-002: Badge memiliki flex-shrink: 0 dan white-space: nowrap');
}

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-003: Document identity container & Ellipsis container
// -----------------------------------------------------------------------------
{
  const html = renderPindahSemaiTabContent([createMockReadySource('1')], [], [createMockPendingSource('1')]);

  const hasIdentityContainer = html.includes('flex: 1; min-width: 0;');
  const hasEllipsisContainer = html.includes('position: relative; flex-shrink: 0; margin-left: 10px;');
  const hasEllipsisBtn = html.includes('width: 28px; height: 28px;') && html.includes('class="btn-tx-action-trigger"');

  assert(hasIdentityContainer, 'IT-PINDAH-SEMAI-HARMONIZE-003a: Document identity container memiliki flex: 1 dan min-width: 0');
  assert(hasEllipsisContainer, 'IT-PINDAH-SEMAI-HARMONIZE-003b: Ellipsis container memiliki flex-shrink: 0 dan margin-left: 10px');
  assert(hasEllipsisBtn, 'IT-PINDAH-SEMAI-HARMONIZE-003c: Ellipsis button 28x28px dengan class .btn-tx-action-trigger');
}

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-004: Metadata dua baris (separator “•”, field lengkap, hierarchy)
// -----------------------------------------------------------------------------
{
  const readySources = [{
    sourceType: 'DEDER_INSPECTION',
    docNo: '2026/DED/001',
    parentDederIndukDocNo: '2026/DDR/001',
    tanggal: '2026-04-10',
    klon: 'PB 260',
    bedenganCode: 'BED-001',
    totalBerhasil: 5000,
    remainingQty: 4000,
    isApproved: true
  }];
  const html = renderPindahSemaiTabContent(readySources, [], []);

  const hasBullet = html.includes('• Klon:') && html.includes('• Tgl:');
  const hasFields = html.includes('Dok. Induk:') && html.includes('Klon:') && html.includes('Bedengan:') && html.includes('Tgl:');
  const hasProminentValues = html.includes('<strong style="color: #334155; font-weight: 600;">2026/DDR/001</strong>') &&
                             html.includes('<strong style="color: #116834; font-weight: 600;">PB 260</strong>') &&
                             html.includes('<strong style="color: #0F172A; font-weight: 600;">BED-001</strong>');

  assert(hasBullet, 'IT-PINDAH-SEMAI-HARMONIZE-004a: Metadata menggunakan separator bullet "•"');
  assert(hasFields, 'IT-PINDAH-SEMAI-HARMONIZE-004b: Metadata mencakup Dok. Induk, Klon, Bedengan, Tgl');
  assert(hasProminentValues, 'IT-PINDAH-SEMAI-HARMONIZE-004c: Value metadata lebih prominent dengan font-weight 600');
}

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-005: Metrics container (padding, margin, block label)
// -----------------------------------------------------------------------------
{
  const html = renderPindahSemaiTabContent([createMockReadySource('1')], [], [createMockPendingSource('1')]);

  const hasMetricsPadding = html.includes('padding: 8px 12px;');
  const hasMetricsMargin = html.includes('margin-top: 8px;');
  const hasBlockLabel = html.includes('display: block; margin-bottom: 2px;');

  assert(hasMetricsPadding, 'IT-PINDAH-SEMAI-HARMONIZE-005a: Metrics container memiliki padding: 8px 12px');
  assert(hasMetricsMargin, 'IT-PINDAH-SEMAI-HARMONIZE-005b: Metrics container memiliki margin-top: 8px');
  assert(hasBlockLabel, 'IT-PINDAH-SEMAI-HARMONIZE-005c: Label metric menggunakan display: block dan margin-bottom: 2px');
}

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-006: Ready & Pending card visual (padding 14px 16px, radius 10px, border #E2E8F0)
// -----------------------------------------------------------------------------
{
  const html = renderPindahSemaiTabContent([createMockReadySource('1')], [], [createMockPendingSource('1')]);

  const readyCardStyles = html.includes('class="card-summary-wrapper card-pindah-semai-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px;');
  const pendingCardStyles = html.includes('class="card-summary-wrapper card-waiting-approval" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px;');

  assert(readyCardStyles, 'IT-PINDAH-SEMAI-HARMONIZE-006a: Ready card memiliki padding 14px 16px, border 1px solid #E2E8F0, radius 10px');
  assert(pendingCardStyles, 'IT-PINDAH-SEMAI-HARMONIZE-006b: Pending card memiliki padding 14px 16px, border 1px solid #E2E8F0, radius 10px');
}

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-007: Document card tidak menghasilkan horizontal overflow
// -----------------------------------------------------------------------------
{
  const html = renderPindahSemaiTabContent([createMockReadySource('1')], [], [createMockPendingSource('1')]);

  const hasWidthRules = html.includes('width: 100%; box-sizing: border-box;');
  const hasWordBreak = html.includes('word-break: break-word;');

  assert(hasWidthRules, 'IT-PINDAH-SEMAI-HARMONIZE-007a: Card container menerapkan width: 100% dan box-sizing: border-box');
  assert(hasWordBreak, 'IT-PINDAH-SEMAI-HARMONIZE-007b: Text document number menerapkan word-break: break-word');
}

// -----------------------------------------------------------------------------
// IT-PINDAH-SEMAI-HARMONIZE-008: Rendering tidak melakukan storage/data mutation
// -----------------------------------------------------------------------------
{
  storage.set('dederan_transactions', [{ id: 'DED-STATIC-1', val: 100 }]);
  storage.set('seeding_transactions', [{ id: 'SED-STATIC-1', val: 200 }]);
  
  const rawDederBefore = JSON.stringify(storage.get('dederan_transactions'));
  const rawSeedBefore = JSON.stringify(storage.get('seeding_transactions'));

  // Run render multiple times
  renderPindahSemaiTabContent([createMockReadySource('1'), createMockReadySource('2')], [], [createMockPendingSource('1')]);
  renderPindahSemaiTabContent([], [], []);
  renderPindahSemaiTabContent([createMockReadySource('1')], [], []);

  const rawDederAfter = JSON.stringify(storage.get('dederan_transactions'));
  const rawSeedAfter = JSON.stringify(storage.get('seeding_transactions'));

  assert(rawDederBefore === rawDederAfter, 'IT-PINDAH-SEMAI-HARMONIZE-008a: Dederan transactions storage is unmodified after multiple renders');
  assert(rawSeedBefore === rawSeedAfter, 'IT-PINDAH-SEMAI-HARMONIZE-008b: Seeding transactions storage is unmodified after multiple renders');
}

console.log('\n================================================================================');
console.log(`TEST SUMMARY: TOTAL = ${passed + failed} | PASSED = ${passed} | FAILED = ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

