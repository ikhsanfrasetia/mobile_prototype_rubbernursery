/**
 * tests/test-seleksi2-visibility-and-cull-deadlock-resolution.js
 * 
 * Verifikasi End-to-End:
 * 1. Resolusi deadlock afkir Pindah Semai (Screenshot 1 & 2)
 *    - Auto-heal pool item yang tercemar nomor dokumen eksekusi seleksi
 *    - Pool item muncul di tab Pindah Semai Mantri (bukan count 0)
 *    - Mantri mendeklarasikan CULL -> ASB menyetujui CULL
 *    - Gate Seleksi I terbuka
 * 2. Visibilitas Dokumen Seleksi II bagi Mantri
 *    - Seleksi I disetujui ASB
 *    - Dokumen Seleksi II dibuat otomatis
 *    - Mantri Wagiman dapat melihat Dokumen Seleksi II (bukan count 0)
 * 3. Auto-heal dokumen Seleksi II historis yang tercemar creator ASB
 */

import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  reconcileSelectionPoolWithTransactions,
  syncAllSeedingsToSelectionPool,
  syncAllApprovedPreGraftingSelectionDocuments,
  canPerformPreGraftingSelection1,
  canCreatePreGraftingSelection1Document,
  getPreGraftingSelectionDocuments,
  createPreGraftingSelectionDocument,
  createSeleksi1ExecutionTransaction,
  approvePreGraftingSelectionDocument,
  createSelection2DocumentFromSelection1,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS,
  SELECTION_STAGES,
  filterSelectionByScope
} from '../js/modules/selection/selection-manager.js';
import { canUserAccessTransaction } from '../js/core/transaction-actor.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

console.log('================================================================================');
console.log('RUNNING TEST: SELEKSI II VISIBILITY & CULL DEADLOCK RESOLUTION');
console.log('================================================================================');

function clearStorage() {
  globalThis.localStorage.clear();
}

const mantriUser = {
  id: 'TBS-MNT-001',
  userId: 'TBS-MNT-001',
  code: 'MNT001',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const asbUser = {
  id: 'ASB-001',
  userId: 'ASB-001',
  code: 'ASB001',
  name: 'Asisten Bibitan',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

// TEST 1: Auto-heal pool item yang tercemar nomor dokumen eksekusi seleksi
{
  clearStorage();
  console.log('\n--- TEST 1: Auto-heal pool item terkontaminasi execution docNo ---');

  // Simulasi kondisi Screenshot 1 & 2:
  // SOW dengan afkir 50, tetapi pool itemnya pernah tercemar docNo '2026/SEL/001_1' dan status 'MENUNGGU_VERIFIKASI'
  const corruptedPoolItem = {
    id: 'SEL-POOL-SEED-SOW-001-RUSAK',
    docNo: '2026/SEL/001_1',
    selectionDocNo: '2026/SEL/001_1',
    selectionTransactionId: 'SEL-TX-001_1',
    status: 'MENUNGGU_VERIFIKASI',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/001',
    seedingDocNo: '2026/SOW/001',
    jumlahAfkir: 50,
    quantity: 50,
    category: 'RUSAK',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    actorId: 'TBS-MNT-001',
    actorName: 'Wagiman'
  };

  const sow = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 12075,
    ditolak: 50,
    rusak: 50,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    actorId: 'TBS-MNT-001',
    actorName: 'Wagiman'
  };

  const selTxExecution = {
    id: 'SEL-TX-001_1',
    docNo: '2026/SEL/001_1',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionStage: 'SELEKSI_1',
    sourceDocNo: '2026/SOW/001',
    sourceModule: 'PENYEMAIAN',
    status: 'MENUNGGU_VERIFIKASI',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  };

  storage.set('seeding_transactions', [sow]);
  storage.set('selection_pool', [corruptedPoolItem]);
  storage.set(SELECTION_STORAGE_KEY, [selTxExecution]);

  // Jalankan reconcile
  reconcileSelectionPoolWithTransactions();

  const healedPool = storage.get('selection_pool', []);
  const item = healedPool[0];
  assert.strictEqual(item.status, 'PENDING_DECLARATION', 'Status pool harus dipulihkan ke PENDING_DECLARATION');
  assert.strictEqual(item.docNo, null, 'docNo eksekusi seleksi harus dibersihkan dari pool item');
  assert.strictEqual(item.selectionTransactionId, null, 'selectionTransactionId eksekusi harus dibersihkan');

  // Verifikasi visibilitas ke Mantri
  const scopedPool = filterSelectionByScope(healedPool, mantriUser);
  assert.strictEqual(scopedPool.length, 1, 'Pool item harus muncul dan dapat diakses Mantri Wagiman');
  console.log('✓ PASS 1: Auto-heal pool item sukses, pool item kembali tersedia untuk deklarasi Mantri.');
}

// TEST 2: Alur Lengkap Deklarasi CULL -> Unlock Gate Seleksi I
{
  console.log('\n--- TEST 2: Deklarasi CULL -> Approval ASB -> Gate Seleksi I Terbuka ---');

  // Dokumen Seleksi I
  const sel1Doc = {
    id: 'SEL1-DOC-001',
    docNo: '2026/SEL-I/001',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    sourceBibitQty: 12075,
    sourcePolybagQty: 6000,
    status: 'DRAFT',
    isCompleted: false,
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    actorId: 'TBS-MNT-001',
    actorName: 'Wagiman',
    createdByUserId: 'TBS-MNT-001',
    createdByName: 'Wagiman'
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [sel1Doc]);

  // Cek gate sebelum CULL dideklarasikan: WAJIB DIBLOKIR
  const gateBefore = canPerformPreGraftingSelection1(sel1Doc, 'BED-001');
  assert.strictEqual(gateBefore.canPerform, false, 'Seleksi I harus diblokir sebelum CULL dideklarasikan');
  assert.ok(gateBefore.pendingCullPool.length > 0, 'Harus mencantumkan pending cull pool');

  // Mantri deklarasikan CULL
  const cullTx = {
    id: 'CULL-TX-001',
    docNo: '2026/CULL/PS/001',
    selectionNo: '2026/CULL/PS/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/001',
    seedingDocNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    category: 'RUSAK',
    jumlahAfkir: 50,
    status: 'MENUNGGU_VERIFIKASI',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    actorId: 'TBS-MNT-001',
    actorName: 'Wagiman'
  };
  storage.set(SELECTION_STORAGE_KEY, [cullTx]);

  // Update pool item status ke MENUNGGU_VERIFIKASI
  storage.set('selection_pool', [{
    id: 'SEL-POOL-SEED-SOW-001-RUSAK',
    docNo: '2026/CULL/PS/001',
    selectionDocNo: '2026/CULL/PS/001',
    selectionTransactionId: 'CULL-TX-001',
    status: 'MENUNGGU_VERIFIKASI',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/001',
    jumlahAfkir: 50,
    category: 'RUSAK',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  }]);

  // Cek gate saat CULL masih menunggu verifikasi: TETAP DIBLOKIR
  const gatePending = canPerformPreGraftingSelection1(sel1Doc, 'BED-001');
  assert.strictEqual(gatePending.canPerform, false, 'Seleksi I harus diblokir saat CULL menunggu verifikasi ASB');
  assert.ok(gatePending.unapprovedCulls.length > 0, 'Harus mencantumkan unapproved culls');

  // ASB menyetujui CULL
  cullTx.status = 'DISETUJUI';
  cullTx.verificationStatus = 'TERVERIFIKASI';
  storage.set(SELECTION_STORAGE_KEY, [cullTx]);

  // Cek gate setelah CULL disetujui: HARUS LOLOS (ELIGIBLE)
  const gateAfter = canPerformPreGraftingSelection1(sel1Doc, 'BED-001');
  assert.strictEqual(gateAfter.canPerform, true, 'Seleksi I harus lolos setelah CULL disetujui ASB');
  console.log('✓ PASS 2: Lifecycle CULL declaration & approval berhasil membuka gate Seleksi I.');
}

// TEST 3: Seleksi I Approval -> Generasi Dokumen Seleksi II & Visibilitas Mantri
{
  console.log('\n--- TEST 3: Seleksi I Final Approval -> Dokumen Seleksi II Muncul di Mantri ---');

  // Dokumen Seleksi I berstatus FINAL DISETUJUI oleh ASB
  const sel1Doc = {
    id: 'SEL1-DOC-001',
    docNo: '2026/SEL-I/001',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    sourceBibitQty: 12075,
    sourcePolybagQty: 6000,
    totalLayak: 12000,
    activePolybagQty: 5950,
    status: 'DISETUJUI',
    isFinal: true,
    verificationStatus: 'TERVERIFIKASI',
    verifiedAt: new Date().toISOString(),
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    actorId: 'TBS-MNT-001',
    actorName: 'Wagiman',
    mantri: 'Wagiman',
    createdByUserId: 'TBS-MNT-001',
    createdByName: 'Wagiman',
    createdByRole: 'MANTRI_TANAMAN'
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [sel1Doc]);

  // ASB jalankan sinkronisasi approval (seperti saat approval modal atau render)
  const createdCount = syncAllApprovedPreGraftingSelectionDocuments(asbUser);
  assert.strictEqual(createdCount, 1, 'Harus membentuk 1 Dokumen Seleksi II baru');

  // Ambil dokumen dari sudut pandang Mantri Wagiman
  const sel2DocsForMantri = getPreGraftingSelectionDocuments({ selectionStage: 'SELEKSI_II' }, mantriUser);
  assert.strictEqual(sel2DocsForMantri.length, 1, 'Dokumen Seleksi II HARUS muncul pada view Mantri Wagiman');

  const sel2Doc = sel2DocsForMantri[0];
  assert.strictEqual(sel2Doc.docNo, '2026/SEL-II/001', 'Nomor dokumen harus 2026/SEL-II/001');
  assert.strictEqual(sel2Doc.selectionStage, 'SELEKSI_II', 'Stage harus SELEKSI_II');
  assert.strictEqual(sel2Doc.sourceBibitQty, 12000, 'sourceBibitQty Seleksi II harus sama dengan totalLayak Seleksi I (12.000)');
  assert.strictEqual(sel2Doc.sourcePolybagQty, 5950, 'sourcePolybagQty Seleksi II harus sama dengan activePolybagQty Seleksi I (5.950)');

  // Verifikasi canUserAccessTransaction langsung
  const canMantriAccess = canUserAccessTransaction(sel2Doc, mantriUser, 'READ');
  assert.strictEqual(canMantriAccess, true, 'canUserAccessTransaction harus return true untuk Mantri');

  console.log('✓ PASS 3: Dokumen Seleksi II berhasil dibuat dan terlihat 100% oleh Mantri Wagiman.');
}

// TEST 4: Auto-heal dokumen Seleksi II historis yang tersimpan dengan createdBy ASB
{
  console.log('\n--- TEST 4: Auto-heal dokumen Seleksi II historis dengan creator ASB ---');

  // Dokumen Seleksi II legacy/lama yang terbentuk dengan createdBy ASB (tanpa Mantri fields)
  const legacySel2Doc = {
    id: 'SEL2-DOC-LEGACY',
    docNo: '2026/SEL-II/002',
    selectionStage: 'SELEKSI_II',
    sourceSelectionDocumentId: 'SEL1-DOC-001',
    sourceSelectionDocNo: '2026/SEL-I/001',
    status: 'DRAFT',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    createdByUserId: 'ASB-001',
    createdByName: 'Asisten Bibitan',
    createdByRole: 'ASISTEN_BIBITAN'
    // sengaja tanpa actorId/mantri
  };

  const currentDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [...currentDocs, legacySel2Doc]);

  // Sebelum auto-heal: periksa bahwa legacySel2Doc tidak dapat diakses Mantri
  assert.strictEqual(canUserAccessTransaction(legacySel2Doc, mantriUser, 'READ'), false, 'Legacy doc sebelumnya tidak dapat diakses Mantri');

  // Jalankan syncAllApprovedPreGraftingSelectionDocuments yang memuat auto-heal
  syncAllApprovedPreGraftingSelectionDocuments(mantriUser);

  // Ambil ulang dokumen
  const healedDocs = getPreGraftingSelectionDocuments({ selectionStage: 'SELEKSI_II' }, mantriUser);
  const foundLegacyHealed = healedDocs.find(d => d.id === 'SEL2-DOC-LEGACY');
  assert.ok(foundLegacyHealed, 'Dokumen legacy harus berhasil di-auto-heal dan terlihat oleh Mantri');
  assert.strictEqual(foundLegacyHealed.createdByName, 'Wagiman', 'createdByName harus dipulihkan ke Wagiman');
  assert.strictEqual(foundLegacyHealed.actorId, 'TBS-MNT-001', 'actorId harus dipulihkan ke Mantri');

  console.log('✓ PASS 4: Auto-heal dokumen Seleksi II historis berhasil 100%.');
}

console.log('================================================================================');
console.log('SEMUA TEST SELEKSI II VISIBILITY & CULL DEADLOCK RESOLUTION BERHASIL (4/4)!');
console.log('================================================================================');
