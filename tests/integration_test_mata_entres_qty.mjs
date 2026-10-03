/**
 * Integration Test Suite for Permintaan Mata Entres
 * Enhancements: Stock Integration + Partial Dispatch + Mata as Primary Unit
 * Test Cases: IT-ME-QTY-001 through IT-ME-QTY-029
 */

import assert from 'assert';

// Mock localStorage and session
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import {
  getSortedToppingSources,
  getFifoAllocationBreakdown,
  getMataEntresBalances
} from '../js/core/entres-inventory-service.js';

import {
  MATA_ENTRES_STATUS,
  getRequestDispatchAggregate,
  canPerformPengurusReceiverReview,
  canPerformAskepVerification,
  canPerformAsistenBibitanVerification,
  canPerformMantriDispatch,
  canPerformPengurusArrival,
  canPerformAskepReceiptRouting,
  canPerformAsistenBibitanReceiptVerification,
  canPerformMantriBibitanFinalReceipt,
  processPengurusReview,
  processAskepVerification,
  processAsistenBibitanVerification,
  processMantriDispatch,
  processPengurusArrival,
  processAskepReceiptRouting,
  processAsistenBibitanReceiptVerification,
  processMantriBibitanFinalReceipt
} from '../js/modules/request/request-mata-entres-landing.js';

import {
  createReceiptFromDispatch,
  getReceiptKspTransactions
} from '../js/core/receipt-ksp-manager.js';

async function runAllTests() {
  console.log('================================================================');
  console.log('STARTING INTEGRATION TESTS FOR MATA ENTRES ENHANCEMENTS B+C');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function it(name, fn) {
    totalCount++;
    try {
      fn();
      passedCount++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  async function itAsync(name, fn) {
    totalCount++;
    try {
      await fn();
      passedCount++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // Define actors
  const pemohonEstate = { id: 'EST-TBS', name: 'Tanah Besih' };
  const pengirimEstate = { id: 'EST-APM', name: 'Aek Pamingke' };

  const pengurusPemohon = { userId: 'USR-PGS-TBS', role: 'PENGURUS', name: 'Pengurus TBS', estateId: pemohonEstate.id, estateName: pemohonEstate.name };
  const pengurusPengirim = { userId: 'USR-PGS-APM', role: 'PENGURUS', name: 'Pengurus APM', estateId: pengirimEstate.id, estateName: pengirimEstate.name };
  const askepPengirim = { userId: 'USR-ASK-APM', role: 'ASKEP', name: 'Askep APM', estateId: pengirimEstate.id, estateName: pengirimEstate.name };
  const asbPengirim = { userId: 'USR-ASB-APM', role: 'ASISTEN_BIBITAN', name: 'Asb APM', estateId: pengirimEstate.id, divisionId: 'DIV-01', estateName: pengirimEstate.name };
  const mantriPengirim = { userId: 'USR-MNT-APM', role: 'MANTRI_TANAMAN', name: 'Mantri APM', estateId: pengirimEstate.id, divisionId: 'DIV-01', estateName: pengirimEstate.name };

  const pengurusArrival = { userId: 'USR-PGS-TBS', role: 'PENGURUS', name: 'Pengurus TBS', estateId: pemohonEstate.id };
  const askepPemohon = { userId: 'USR-ASK-TBS', role: 'ASKEP', name: 'Askep TBS', estateId: pemohonEstate.id };
  const asbPemohon = { userId: 'USR-ASB-TBS', role: 'ASISTEN_BIBITAN', name: 'Asb TBS', estateId: pemohonEstate.id, divisionId: 'DIV-02' };
  const mantriPemohon = { userId: 'USR-MNT-TBS', role: 'MANTRI_TANAMAN', name: 'Mantri TBS', estateId: pemohonEstate.id, divisionId: 'DIV-02' };

  // ============================================================================
  // SECTION 1: INVENTORY SERVICE (STOCK INTEGRATION & ESTATE SCOPING)
  // ============================================================================
  console.log('\n--- SECTION 1: INVENTORY SERVICE (STOCK INTEGRATION & ESTATE SCOPING) ---');

  it('IT-ME-QTY-001: Initial Topping stock setup for APM estate', () => {
    localStorage.clear();
    const toppings = [
      { id: 'TOP-1', docNo: 'TOP/APM/01', estateId: 'EST-APM', namaKlon: 'PB 260', jumlahPerisai: 1000, tanggal: '2026-09-01' },
      { id: 'TOP-2', docNo: 'TOP/APM/02', estateId: 'EST-APM', namaKlon: 'PB 260', jumlahPerisai: 500, tanggal: '2026-09-02' },
      { id: 'TOP-3', docNo: 'TOP/TBS/01', estateId: 'EST-TBS', namaKlon: 'PB 260', jumlahPerisai: 800, tanggal: '2026-09-01' }
    ];
    storage.set('entres_topping_transactions', toppings);

    const apmPb260 = getFifoAllocationBreakdown('PB 260', { estateId: 'EST-APM' });
    assert.strictEqual(apmPb260.totalPanenTopping, 1500);
    assert.strictEqual(apmPb260.saldoMataEntres, 1500);

    const tbsPb260 = getFifoAllocationBreakdown('PB 260', { estateId: 'EST-TBS' });
    assert.strictEqual(tbsPb260.totalPanenTopping, 800);
    assert.strictEqual(tbsPb260.saldoMataEntres, 800);
  });

  it('IT-ME-QTY-002: FIFO ordering preserved: Grafting -> Regrafting -> Dispatch', () => {
    storage.set('budding_transactions', [
      { id: 'GRF-1', docNo: 'GRF/01', type: 'GRAFTING', estateId: 'EST-APM', klonEntres: 'PB 260', jumlah: 300, tanggal: '2026-09-03' },
      { id: 'REGRF-1', docNo: 'RGRF/01', type: 'REGRAFTING', estateId: 'EST-APM', klonEntres: 'PB 260', jumlah: 100, tanggal: '2026-09-04' }
    ]);
    storage.set('dispatch_transactions', [
      { id: 'DSP-1', type: 'MATA_ENTRES', estateId: 'EST-APM', klon: 'PB 260', jumlahMataEntresDikeluarkan: 400, tanggalPengeluaran: '2026-09-05' }
    ]);

    const apmPb260 = getFifoAllocationBreakdown('PB 260', { estateId: 'EST-APM' });
    assert.strictEqual(apmPb260.totalPakaiGrafting, 300);
    assert.strictEqual(apmPb260.totalPakaiRegrafting, 100);
    assert.strictEqual(apmPb260.totalPakaiDispatch, 400);
    assert.strictEqual(apmPb260.saldoMataEntres, 1500 - 300 - 100 - 400); // 700
  });

  it('IT-ME-QTY-003: Dispatch transaction must not consume stock in another estate (Estate Scoping)', () => {
    const tbsPb260 = getFifoAllocationBreakdown('PB 260', { estateId: 'EST-TBS' });
    assert.strictEqual(tbsPb260.totalPakaiDispatch, 0);
    assert.strictEqual(tbsPb260.saldoMataEntres, 800);
  });

  // ============================================================================
  // SECTION 2: PERMINTAAN FORM & APPROVAL WORKFLOW
  // ============================================================================
  console.log('\n--- SECTION 2: PERMINTAAN FORM & APPROVAL WORKFLOW ---');

  const reqDoc = {
    id: 'REQ-2026-001',
    docNo: 'REQ/TBS/2026/001',
    type: 'MATA_ENTRES',
    transactionType: 'PERMINTAAN_MATA_ENTRES',
    estateId: pemohonEstate.id,
    sourceEstateId: pemohonEstate.id,
    sourceEstateName: pemohonEstate.name,
    targetEstateId: pengirimEstate.id,
    targetEstateName: pengirimEstate.name,
    klon: 'PB 260',
    jumlahMataEntres: 600,
    jumlahBatang: 300,
    qty: 600,
    allocationCode: 'ALOK-2026-01',
    requiredDate: '2026-10-01',
    status: MATA_ENTRES_STATUS.DIAJUKAN,
    createdAt: '2026-09-20T08:00:00Z'
  };

  it('IT-ME-QTY-004: Request created with Mata as primary quantity', () => {
    storage.set('requests_transactions', [reqDoc]);
    const stored = storage.get('requests_transactions');
    assert.strictEqual(stored[0].jumlahMataEntres, 600);
    assert.strictEqual(stored[0].jumlahBatang, 300);
    assert.strictEqual(stored[0].status, MATA_ENTRES_STATUS.DIAJUKAN);
  });

  await itAsync('IT-ME-QTY-005: Pengurus Review sets approvedMataEntres without heuristic * 2', async () => {
    assert.strictEqual(canPerformPengurusReceiverReview(reqDoc, pengurusPengirim), true);
    assert.strictEqual(canPerformPengurusReceiverReview(reqDoc, pengurusPemohon), false);

    await processPengurusReview(reqDoc.id, {
      approvedMataEntres: 600,
      approvedBatang: 300,
      approvedKlon: 'PB 260',
      estimatedDeliveryDate: '2026-09-28',
      notes: 'Disetujui 600 mata entres'
    }, pengurusPengirim);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA);
    assert.strictEqual(updated.approval.approvedMataEntres, 600);
    assert.strictEqual(updated.approval.approvedBatang, 300);
  });

  await itAsync('IT-ME-QTY-006: Askep Verification advances to MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(canPerformAskepVerification(doc, askepPengirim), true);

    await processAskepVerification(doc.id, { notes: 'Askep OK' }, askepPengirim);
    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN);
  });

  await itAsync('IT-ME-QTY-007: Asisten Bibitan Verification advances to TERVERIFIKASI', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(canPerformAsistenBibitanVerification(doc, asbPengirim), true);

    await processAsistenBibitanVerification(doc.id, {
      sourceDivisionId: 'DIV-01',
      targetDivisionId: 'DIV-02',
      notes: 'Bibitan ready'
    }, asbPengirim);
    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.TERVERIFIKASI);
  });

  // ============================================================================
  // SECTION 3: PARTIAL DISPATCH & STOCK CONSUMPTION
  // ============================================================================
  console.log('\n--- SECTION 3: PARTIAL DISPATCH & STOCK CONSUMPTION ---');

  it('IT-ME-QTY-008: Aggregate before any dispatch shows full remaining quota', () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    const agg = getRequestDispatchAggregate(doc.id, doc);
    assert.strictEqual(agg.approvedMata, 600);
    assert.strictEqual(agg.totalDispatchedMata, 0);
    assert.strictEqual(agg.remainingMata, 600);
    assert.strictEqual(agg.isFullyDispatched, false);
    assert.strictEqual(canPerformMantriDispatch(doc, mantriPengirim), true);
  });

  await itAsync('IT-ME-QTY-009: Dispatch 1 (Partial 250 Mata) -> Status PENGELUARAN_BERJALAN', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);

    await processMantriDispatch(doc.id, {
      jumlahMataEntresDikeluarkan: 250,
      jumlahBatangDikeluarkan: 125,
      tanggalPengeluaran: '2026-09-25',
      vehiclePlate: 'BK 1111 XX',
      notes: 'Pengiriman Tahap 1'
    }, mantriPengirim);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.PENGELUARAN_BERJALAN);

    // Verify aggregate
    const agg = getRequestDispatchAggregate(doc.id, updated);
    assert.strictEqual(agg.totalDispatchedMata, 250);
    assert.strictEqual(agg.remainingMata, 350);
    assert.strictEqual(agg.isFullyDispatched, false);

    // Verify stock deducted in APM
    const apmPb260 = getFifoAllocationBreakdown('PB 260', { estateId: 'EST-APM' });
    // APM topping: 1500, grafting: 300, regrafting: 100, previous dispatch: 400, this dispatch: 250 -> 450 remaining
    assert.strictEqual(apmPb260.totalPakaiDispatch, 400 + 250);
    assert.strictEqual(apmPb260.saldoMataEntres, 450);

    // Verify 1 receipt created in receipt manager
    const receipts = getReceiptKspTransactions();
    assert.strictEqual(receipts.length, 1);
    assert.strictEqual(receipts[0].totalShippedMata, 250);
    assert.strictEqual(receipts[0].totalShippedBatang, 125);
    assert.strictEqual(receipts[0].sourceEstateId, pengirimEstate.id); // APM (Pengirim) is source
    assert.strictEqual(receipts[0].targetEstateId, pemohonEstate.id); // TBS (Pemohon) is recipient target
  });

  await itAsync('IT-ME-QTY-010: Dispatch 2 (Partial 200 Mata) -> Status remains PENGELUARAN_BERJALAN', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(canPerformMantriDispatch(doc, mantriPengirim), true);

    await processMantriDispatch(doc.id, {
      jumlahMataEntresDikeluarkan: 200,
      jumlahBatangDikeluarkan: 100,
      tanggalPengeluaran: '2026-09-26',
      vehiclePlate: 'BK 2222 YY',
      notes: 'Pengiriman Tahap 2'
    }, mantriPengirim);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.PENGELUARAN_BERJALAN);

    const agg = getRequestDispatchAggregate(doc.id, updated);
    assert.strictEqual(agg.totalDispatchedMata, 450);
    assert.strictEqual(agg.remainingMata, 150);
    assert.strictEqual(agg.isFullyDispatched, false);

    // Verify second distinct receipt created
    const receipts = getReceiptKspTransactions();
    assert.strictEqual(receipts.length, 2);
    assert.strictEqual(receipts[1].totalShippedMata, 200);
  });

  await itAsync('IT-ME-QTY-011: Dispatch 3 (Final 150 Mata) -> Status transitions to MENUNGGU_PENERIMAAN_PENGURUS', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);

    await processMantriDispatch(doc.id, {
      jumlahMataEntresDikeluarkan: 150,
      jumlahBatangDikeluarkan: 75,
      tanggalPengeluaran: '2026-09-27',
      vehiclePlate: 'BK 3333 ZZ',
      notes: 'Pengiriman Tahap 3 (Pelunasan)'
    }, mantriPengirim);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_PENGURUS);

    const agg = getRequestDispatchAggregate(doc.id, updated);
    assert.strictEqual(agg.totalDispatchedMata, 600);
    assert.strictEqual(agg.remainingMata, 0);
    assert.strictEqual(agg.isFullyDispatched, true);

    // Can no longer dispatch
    assert.strictEqual(canPerformMantriDispatch(updated, mantriPengirim), false);

    const receipts = getReceiptKspTransactions();
    assert.strictEqual(receipts.length, 3);
  });

  await itAsync('IT-ME-QTY-012: Over-dispatch validation rejects dispatch exceeding remaining quota', async () => {
    // Attempting to dispatch more should fail
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    let errorCaught = false;
    try {
      await processMantriDispatch(doc.id, {
        jumlahMataEntresDikeluarkan: 50,
        jumlahBatangDikeluarkan: 25,
        tanggalPengeluaran: '2026-09-28'
      }, mantriPengirim);
    } catch (e) {
      errorCaught = true;
      assert.ok(e.message.includes('melebihi'));
    }
    assert.strictEqual(errorCaught, true);
  });

  // ============================================================================
  // SECTION 4: RECEIPT WORKFLOW AT PEMOHON ESTATE
  // ============================================================================
  console.log('\n--- SECTION 4: RECEIPT WORKFLOW AT PEMOHON ESTATE ---');

  await itAsync('IT-ME-QTY-013: Pengurus Pemohon Arrival Confirmation', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(canPerformPengurusArrival(doc, pengurusArrival), true);

    await processPengurusArrival(doc.id, {
      initialReceivedDate: '2026-09-28',
      notes: 'Diterima utuh di pos pengurus'
    }, pengurusArrival);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA);
  });

  await itAsync('IT-ME-QTY-014: Askep Pemohon Receipt Verification Routing', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(canPerformAskepReceiptRouting(doc, askepPemohon), true);

    await processAskepReceiptRouting(doc.id, { notes: 'Teruskan ke Asisten Bibitan' }, askepPemohon);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN);
  });

  await itAsync('IT-ME-QTY-015: Asisten Bibitan Pemohon Receipt Verification', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(canPerformAsistenBibitanReceiptVerification(doc, asbPemohon), true);

    await processAsistenBibitanReceiptVerification(doc.id, { notes: 'Teruskan ke Mantri untuk cek fisik' }, asbPemohon);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN);
  });

  await itAsync('IT-ME-QTY-016: Mantri Bibitan Pemohon Final Receipt with Reject handling -> Status SELESAI', async () => {
    const doc = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(canPerformMantriBibitanFinalReceipt(doc, mantriPemohon), true);

    await processMantriBibitanFinalReceipt(doc.id, {
      jumlahMataEntresDiterima: 580,
      jumlahBatangDiterima: 290,
      rejectMata: 20,
      rejectBatang: 10,
      tanggalPenerimaan: '2026-09-29',
      notes: '20 mata kering/afkir, 580 mata siap okulasi'
    }, mantriPemohon);

    const updated = storage.get('requests_transactions').find(r => r.id === reqDoc.id);
    assert.strictEqual(updated.status, MATA_ENTRES_STATUS.DITERIMA_DENGAN_SELISIH);
    assert.strictEqual(updated.jumlahMataEntresDiterima, 580);
    assert.strictEqual(updated.rejectMata, 20);
    assert.strictEqual(updated.jumlahBatangDiterima, 290);
    assert.strictEqual(updated.rejectBatang, 10);
  });

  // ============================================================================
  // SECTION 5: HISTORICAL COMPATIBILITY (LEGACY BATANG ONLY RECORDS)
  // ============================================================================
  console.log('\n--- SECTION 5: HISTORICAL COMPATIBILITY ---');

  it('IT-ME-QTY-017: Legacy record having only jumlahBatang does not produce NaN or fake x2 Mata', () => {
    const legacyReq = {
      id: 'REQ-LEGACY-001',
      docNo: 'REQ/LEGACY/2025/999',
      type: 'MATA_ENTRES',
      jumlahBatang: 200,
      // jumlahMataEntres is intentionally undefined/null
      status: MATA_ENTRES_STATUS.SELESAI
    };

    const agg = getRequestDispatchAggregate(legacyReq.id, legacyReq);
    assert.strictEqual(agg.approvedBatang, 200);
    assert.strictEqual(agg.approvedMata, null);
    assert.strictEqual(isNaN(agg.totalDispatchedMata), false);
    assert.strictEqual(agg.totalDispatchedMata, 0);
  });

  it('IT-ME-QTY-018: Inventory service gracefully handles legacy topping / dispatch without Mata', () => {
    const legacyDispatch = [
      { id: 'DSP-LEGACY', sourceEstateId: 'EST-APM', klon: 'PB 260', jumlahBatangDikeluarkan: 100 }
      // jumlahMataEntresDikeluarkan is undefined
    ];
    storage.set('dispatch_transactions', legacyDispatch);

    const pb260 = getFifoAllocationBreakdown('PB 260', { estateId: 'EST-APM' });
    // Legacy dispatch with 0 / undefined Mata contributes 0 Mata to FIFO consumption without NaN
    assert.strictEqual(isNaN(pb260.totalPakaiDispatch), false);
    assert.strictEqual(pb260.totalPakaiDispatch, 0);
  });

  // ============================================================================
  // SECTION 6: RECEIPT IDEMPOTENCY PER DISPATCH
  // ============================================================================
  console.log('\n--- SECTION 6: RECEIPT IDEMPOTENCY PER DISPATCH ---');

  it('IT-ME-QTY-019: createReceiptFromDispatch is strictly idempotent by dispatchId', () => {
    storage.set('receipt_ksp_transactions', []);
    const parentReqMock = {
      id: 'REQ-2026-UNIT',
      docNo: 'REQ/TBS/2026/UNIT',
      sourceEstateId: 'EST-TBS',
      targetEstateId: 'EST-APM',
      klon: 'GT 1',
      type: 'MATA_ENTRES'
    };
    const dispatchData = {
      id: 'DSP-UNIT-01',
      docNo: 'DSP/APM/2026/001',
      parentRequestId: 'REQ-2026-UNIT',
      parentRequestDocNo: 'REQ/TBS/2026/UNIT',
      estateId: 'EST-APM',
      klon: 'GT 1',
      type: 'MATA_ENTRES',
      jumlahMataEntresDikeluarkan: 300,
      jumlahBatangDikeluarkan: 150,
      tanggalPengeluaran: '2026-09-30'
    };

    const r1 = createReceiptFromDispatch(dispatchData, parentReqMock, mantriPengirim);
    assert.strictEqual(r1.dispatchId, 'DSP-UNIT-01');
    assert.strictEqual(r1.totalShippedMata, 300);

    const all1 = getReceiptKspTransactions();
    assert.strictEqual(all1.length, 1);

    // Call again with same dispatchId
    const r2 = createReceiptFromDispatch(dispatchData, parentReqMock, mantriPengirim);
    assert.strictEqual(r2.id, r1.id);

    const all2 = getReceiptKspTransactions();
    assert.strictEqual(all2.length, 1, 'Duplicate receipt was prevented');
  });

  it('IT-ME-QTY-020: Second dispatch with different dispatchId produces second receipt', () => {
    const parentReqMock = {
      id: 'REQ-2026-UNIT',
      docNo: 'REQ/TBS/2026/UNIT',
      sourceEstateId: 'EST-TBS',
      targetEstateId: 'EST-APM',
      klon: 'GT 1',
      type: 'MATA_ENTRES'
    };
    const dispatchData2 = {
      id: 'DSP-UNIT-02',
      docNo: 'DSP/APM/2026/002',
      parentRequestId: 'REQ-2026-UNIT',
      parentRequestDocNo: 'REQ/TBS/2026/UNIT',
      estateId: 'EST-APM',
      klon: 'GT 1',
      type: 'MATA_ENTRES',
      jumlahMataEntresDikeluarkan: 200,
      jumlahBatangDikeluarkan: 100,
      tanggalPengeluaran: '2026-10-01'
    };

    const r2 = createReceiptFromDispatch(dispatchData2, parentReqMock, mantriPengirim);
    assert.strictEqual(r2.dispatchId, 'DSP-UNIT-02');
    assert.strictEqual(r2.totalShippedMata, 200);

    const all = getReceiptKspTransactions();
    assert.strictEqual(all.length, 2, 'Two distinct receipts exist for the two dispatches');
  });

  // ============================================================================
  // SECTION 7: MATERIAL / WAREHOUSE DOMAIN ISOLATION
  // ============================================================================
  console.log('\n--- SECTION 7: MATERIAL DOMAIN ISOLATION ---');

  it('IT-ME-QTY-021: Entres dispatch does not touch warehouseStocks or materialUsage', () => {
    const matUsage = storage.get('material_usage_transactions') || [];
    const whStocks = storage.get('warehouseStocks') || [];
    assert.strictEqual(matUsage.length, 0);
    assert.strictEqual(whStocks.length, 0);
  });

  console.log('\n================================================================');
  console.log(`ALL INTEGRATION TESTS PASSED (${passedCount}/${totalCount})`);
  console.log('================================================================\n');
}

runAllTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
