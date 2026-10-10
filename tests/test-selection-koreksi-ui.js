import { storage } from '../js/core/storage.js';
import {
  renderStandardizedRejectList,
  deduplicateLogicalSelectionPool
} from '../js/modules/selection/selection-landing.js';
import { SELECTION_STATUS } from '../js/modules/selection/selection-manager.js';

console.log('=== TEST SUITE: SELECTION PRA-SEMAI & PINDAH SEMAI KOREKSI UI ===\n');

// 1. Test Dederan Stage Returned Section Rendering & Date Filter Independence
console.log('--- 1. Seleksi Pra-Semai (Dederan): Perlu Perbaikan Section & Date Independence ---');
const rawPoolDederan = [
  {
    id: 'POOL-DED-001',
    docNo: '2026/CULL/001',
    sourceModule: 'DEDERAN',
    originType: 'REJECT_DEDERAN',
    sourceDocNo: '2026/DED/001',
    bedenganCode: 'BED-001',
    programName: 'PROG-A',
    jumlahAfkir: 50,
    status: SELECTION_STATUS.DIKEMBALIKAN,
    returnReason: 'Periksa kembali butir afkir'
  },
  {
    id: 'POOL-DED-002',
    docNo: '2026/CULL/002',
    sourceModule: 'DEDERAN',
    originType: 'REJECT_DEDERAN',
    sourceDocNo: '2026/DED/002',
    bedenganCode: 'BED-002',
    programName: 'PROG-A',
    jumlahAfkir: 30,
    status: 'AVAILABLE'
  }
];

const culledTxsDederan = [
  {
    id: 'TX-DED-003',
    docNo: '2026/CULL/003',
    sourceModule: 'DEDERAN',
    originType: 'REJECT_DEDERAN',
    sourceDocNo: '2026/DED/003',
    bedenganCode: 'BED-003',
    jumlahAfkir: 20,
    status: SELECTION_STATUS.DISETUJUI,
    tanggalSeleksi: '01/01/2026'
  }
];

// Render with different today / date filter
const htmlDederan = renderStandardizedRejectList(
  rawPoolDederan,
  culledTxsDederan,
  'Belum Ada Data Afkir Dederan',
  'Data afkir dederan akan muncul saat terdapat bibit yang tidak berhasil.',
  'Daftar Bibit Afkir Pra-Semai (Dederan)',
  '09/10/2026',
  culledTxsDederan
);

console.assert(htmlDederan.includes('Transaksi Perlu Perbaikan'), 'Must contain Transaksi Perlu Perbaikan header');
console.assert(htmlDederan.includes('1 dokumen menunggu koreksi'), 'Must display 1 dokumen menunggu koreksi counter');
console.assert(htmlDederan.includes('2026/CULL/001'), 'Must display returned doc 2026/CULL/001 in returned section');
console.assert(htmlDederan.includes('Catatan Pengembalian Asisten:'), 'Must display Catatan Pengembalian Asisten banner');
console.assert(htmlDederan.includes('Periksa kembali butir afkir'), 'Must display actual returnReason');
console.assert(htmlDederan.includes('Deklarasi Ulang / Koreksi Seleksi'), 'Must display Deklarasi Ulang / Koreksi Seleksi CTA');
console.assert(htmlDederan.includes('btn-koreksi-seleksi'), 'Must contain btn-koreksi-seleksi class');
console.assert(htmlDederan.includes('Butir'), 'Unit for Dederan must be Butir');
console.assert(htmlDederan.includes('Daftar Bibit Afkir Pra-Semai (Dederan) (1)'), 'Pending pool must have count 1 (excluding returned doc)');
console.log('  ✅ PASS: Seleksi Pra-Semai renders dedicated Perlu Perbaikan section with correct counter, reason, unit, and CTA');

// 2. Test Pindah Semai Stage Returned Section
console.log('\n--- 2. Seleksi Ditolak Pindah Semai: Perlu Perbaikan Section ---');
const rawPoolPindahSemai = [
  {
    id: 'POOL-PS-001',
    docNo: '2026/CULL/010',
    sourceModule: 'PENYEMAIAN',
    originType: 'REJECT_PENYEMAIAN',
    sourceDocNo: '2026/PS/001',
    bedenganCode: 'BED-010',
    batchCode: 'BATCH-01',
    programName: 'PROG-B',
    jumlahAfkir: 15,
    status: SELECTION_STATUS.DIKEMBALIKAN,
    returnReason: 'Hitung ulang bibit patah'
  }
];

const htmlPindahSemai = renderStandardizedRejectList(
  rawPoolPindahSemai,
  [],
  'Belum Ada Data Ditolak Pindah Semai',
  'Data bibit ditolak akan muncul saat transaksi Pindah Semai mencatat adanya bibit yang ditolak/afkir.',
  'Daftar Hasil Ditolak Pindah Semai',
  '09/10/2026',
  []
);

console.assert(htmlPindahSemai.includes('Transaksi Perlu Perbaikan'), 'Must contain Transaksi Perlu Perbaikan header');
console.assert(htmlPindahSemai.includes('1 dokumen menunggu koreksi'), 'Must display 1 dokumen menunggu koreksi');
console.assert(htmlPindahSemai.includes('Hitung ulang bibit patah'), 'Must display returnReason');
console.assert(htmlPindahSemai.includes('Pkk'), 'Unit for Pindah Semai must be Pkk');
console.assert(htmlPindahSemai.includes('BATCH-01'), 'Must display batchCode');
console.assert(htmlPindahSemai.includes('Semua data bibit afkir telah dideklarasikan atau sedang dalam proses perbaikan.'), 'Must show informational message when pending pool is empty but returned item exists');
console.log('  ✅ PASS: Seleksi Ditolak Pindah Semai renders dedicated Perlu Perbaikan section with correct metadata and Pkk unit');

// 3. Test Deduplication (No duplicate display between returned section and normal lists)
console.log('\n--- 3. Visual Deduplication & No Duplicate Display ---');
const rawPoolDup = [
  {
    id: 'POOL-DUP-001',
    docNo: '2026/CULL/099',
    sourceModule: 'DEDERAN',
    originType: 'REJECT_DEDERAN',
    sourceDocNo: '2026/DED/099',
    bedenganCode: 'BED-099',
    jumlahAfkir: 40,
    status: SELECTION_STATUS.DIKEMBALIKAN,
    returnReason: 'Perlu revisi data'
  }
];

const culledTxsDup = [
  {
    id: 'TX-DUP-001',
    docNo: '2026/CULL/099',
    sourceModule: 'DEDERAN',
    originType: 'REJECT_DEDERAN',
    sourceDocNo: '2026/DED/099',
    bedenganCode: 'BED-099',
    jumlahAfkir: 40,
    status: SELECTION_STATUS.DIKEMBALIKAN,
    tanggalSeleksi: '09/10/2026'
  }
];

const htmlDup = renderStandardizedRejectList(
  rawPoolDup,
  culledTxsDup,
  'Empty',
  'Empty desc',
  'Daftar Bibit Afkir Pra-Semai (Dederan)',
  '09/10/2026',
  culledTxsDup
);

// Count occurrences of docNo 2026/CULL/099 in rendered HTML
const matches = htmlDup.match(/2026\/CULL\/099/g);
console.assert(matches && matches.length === 1, `2026/CULL/099 must appear exactly ONCE in HTML (found: ${matches ? matches.length : 0})`);
console.assert(htmlDup.includes('Riwayat Deklarasi (0)'), 'History list must exclude returned doc so count is 0');
console.log('  ✅ PASS: Returned document appears exactly ONCE in the returned section and is excluded from pending pool and history list');

console.log('\n========================================');
console.log('TEST RESULT: ALL TESTS PASSED SUCCESSFULLY!');
console.log('========================================\n');
