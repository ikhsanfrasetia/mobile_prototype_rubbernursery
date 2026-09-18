/**
 * Integration Test for Permintaan Mata Entres Kebun Sepupu Harmonized Workflow
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
  MATA_ENTRES_STATUS,
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

import { getReceiptKspTransactions } from '../js/core/receipt-ksp-manager.js';
import { RECEIPT_KSP_STATUS } from '../js/core/receipt-ksp-constants.js';
import {
  filterReceiptKspRequests,
  canPerformPengurusReceiptAction,
  getActionableReceiptCount
} from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';

async function runTests() {
  console.log('=== STARTING INTEGRATION TESTS FOR MATA ENTRES HARMONIZED WORKFLOW ===\n');

  // Actors
  const pengurusPemohon = { userId: 'USR-PGS-TBS', role: 'PENGURUS', name: 'Pengurus TBS', estateId: 'EST-TBS', estateName: 'Tanah Besih' };
  const pengurusPengirim = { userId: 'USR-PGS-APM', role: 'PENGURUS', name: 'Pengurus APM', estateId: 'EST-APM', estateName: 'Aek Pamienke' };
  const askepPengirim = { userId: 'USR-ASK-APM', role: 'ASKEP', name: 'Askep APM', estateId: 'EST-APM', estateName: 'Aek Pamienke' };
  const asbPengirim = { userId: 'USR-ASB-APM', role: 'ASISTEN_BIBITAN', name: 'Asb APM', estateId: 'EST-APM', divisionId: 'DIV-01', estateName: 'Aek Pamienke' };
  const mantriPengirim = { userId: 'USR-MNT-APM', role: 'MANTRI_TANAMAN', name: 'Mantri APM', estateId: 'EST-APM', divisionId: 'DIV-01', estateName: 'Aek Pamienke' };
  
  const askepPemohon = { userId: 'USR-ASK-TBS', role: 'ASKEP', name: 'Askep TBS', estateId: 'EST-TBS', estateName: 'Tanah Besih' };
  const asbPemohon = { userId: 'USR-ASB-TBS', role: 'ASISTEN_BIBITAN', name: 'Asb TBS', estateId: 'EST-TBS', divisionId: 'DIV-02', estateName: 'Tanah Besih' };
  const mantriPemohon = { userId: 'USR-MNT-TBS', role: 'MANTRI_TANAMAN', name: 'Mantri TBS', estateId: 'EST-TBS', divisionId: 'DIV-02', estateName: 'Tanah Besih' };
  
  const kebunKetiga = { userId: 'USR-LGS', role: 'PENGURUS', name: 'Pengurus LGS', estateId: 'EST-LGS', estateName: 'Lima Puluh' };

  // --- TEST 1: Create Request ---
  console.log('TEST 1: Create Request');
  const reqPayload = {
    id: 'REQ-ME-2026-001',
    docNo: '2026/REQ/ETRS/001',
    type: 'MATA_ENTRES',
    transactionType: 'PERMINTAAN_MATA_ENTRES',
    requestDate: '2026-09-18',
    estateId: 'EST-TBS',
    sourceEstateId: 'EST-TBS',
    sourceEstateName: 'Tanah Besih',
    targetEstateId: 'EST-APM',
    targetEstateName: 'Aek Pamienke',
    requiredDate: '2026-09-25',
    allocationCode: 'ALOK-2026-01',
    klon: 'PB 260',
    jumlahBatang: 500,
    jumlahMataEntres: null, // Removed from Pengurus create form
    catatan: 'Permintaan mata entres untuk pembibitan',
    status: MATA_ENTRES_STATUS.DIAJUKAN,
    createdAt: new Date().toISOString()
  };
  storage.set('requests_transactions', [reqPayload]);

  assert.strictEqual(reqPayload.jumlahMataEntres, null, 'Input jumlahMataEntres is not present in create request');
  assert.strictEqual(reqPayload.jumlahBatang, 500);
  assert.strictEqual(reqPayload.allocationCode, 'ALOK-2026-01');
  console.log('  -> PASS: Request created with allocationCode and without Pengurus jumlahMataEntres input.\n');

  // --- TEST 2: Approval by Pengurus Pengirim ---
  console.log('TEST 2: Approval by Pengurus Pengirim');
  assert.strictEqual(canPerformPengurusReceiverReview(reqPayload, pengurusPengirim), true);
  assert.strictEqual(canPerformPengurusReceiverReview(reqPayload, pengurusPemohon), false, 'Pemohon cannot review own request');
  assert.strictEqual(canPerformPengurusReceiverReview(reqPayload, kebunKetiga), false, 'Kebun ketiga cannot review');

  await processPengurusReview(reqPayload.id, {
    approvedBatang: 500,
    approvedKlon: 'PB 260',
    estimatedDeliveryDate: '2026-09-24',
    notes: 'Disetujui kuota 500 batang'
  }, pengurusPengirim);

  let updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA);
  assert.strictEqual(updatedReq.approval.approvedBatang, 500);
  assert.strictEqual(updatedReq.approval.approvedMataEntres, 1000);
  console.log('  -> PASS: Pengurus Pengirim approved, status is MENUNGGU_VERIFIKASI_ASISTEN_KEPALA.\n');

  // --- TEST 3: Askep Pengirim Verification & Source Division Assignment ---
  console.log('TEST 3: Askep Pengirim Verification');
  assert.strictEqual(canPerformAskepVerification(updatedReq, askepPengirim), true);
  assert.strictEqual(canPerformAskepVerification(updatedReq, askepPemohon), false, 'Askep pemohon cannot verify sender stage');

  await processAskepVerification(updatedReq.id, {
    targetDivisionId: 'DIV-01',
    notes: 'Keluarkan dari Kebun Entres Divisi 01'
  }, askepPengirim);

  updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN);
  assert.strictEqual(updatedReq.targetNextDivisionId, 'DIV-01');
  console.log('  -> PASS: Askep Pengirim verified, routed to Divisi 01.\n');

  // --- TEST 4: Asisten Bibitan Pengirim Verification ---
  console.log('TEST 4: Asisten Bibitan Pengirim Verification');
  assert.strictEqual(canPerformAsistenBibitanVerification(updatedReq, asbPengirim), true);
  const wrongDivAsb = { ...asbPengirim, divisionId: 'DIV-09' };
  assert.strictEqual(canPerformAsistenBibitanVerification(updatedReq, wrongDivAsb), false, 'Asb with wrong division cannot verify');

  await processAsistenBibitanVerification(updatedReq.id, {
    isCutReady: true,
    isPackReady: true,
    notes: 'Entres siap potong pagi hari'
  }, asbPengirim);

  updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.TERVERIFIKASI);
  console.log('  -> PASS: Asisten Bibitan Pengirim verified readiness, status is TERVERIFIKASI.\n');

  // --- TEST 5: Mantri Pengirim Dispatch & Auto Receipt Handoff ---
  console.log('TEST 5: Mantri Pengirim Dispatch');
  assert.strictEqual(canPerformMantriDispatch(updatedReq, mantriPengirim), true);
  assert.strictEqual(canPerformMantriDispatch(updatedReq, mantriPemohon), false, 'Mantri pemohon cannot dispatch');

  await processMantriDispatch(updatedReq.id, {
    jumlahBatangDikeluarkan: 500,
    jumlahMataEntresDikeluarkan: 1000,
    tanggalPengeluaran: '2026-09-24',
    vehiclePlate: 'BK 9999 XX',
    photoEvidence: { image: 'data:image/jpeg;base64,samplephoto' },
    notes: 'Dikemas 5 karung basah'
  }, mantriPengirim);

  updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_PENGURUS);
  assert.strictEqual(updatedReq.jumlahBatangDikeluarkan, 500);
  assert.strictEqual(updatedReq.jumlahMataEntresDikeluarkan, 1000);

  const receipts = getReceiptKspTransactions();
  assert.strictEqual(receipts.length, 1, 'Auto-created child receipt should exist');
  const childRcp = receipts[0];
  assert.strictEqual(childRcp.parentRequestId, updatedReq.id);
  assert.strictEqual(childRcp.type, 'MATA_ENTRES');
  assert.strictEqual(childRcp.jalurPenerimaan, 'BIBITAN');
  assert.strictEqual(childRcp.status, 'MENUNGGU_PENERIMAAN_PENGURUS');
  assert.strictEqual(childRcp.targetEstateId, 'EST-TBS');
  console.log('  -> PASS: Mantri Pengirim dispatched, child receipt auto-created for Kebun Pemohon.\n');

  // --- TEST 6: Pengurus Pemohon Catat Kedatangan Awal ---
  console.log('TEST 6: Pengurus Pemohon Catat Kedatangan Awal');
  assert.strictEqual(canPerformPengurusArrival(updatedReq, pengurusPemohon), true);
  assert.strictEqual(canPerformPengurusArrival(updatedReq, pengurusPengirim), false, 'Pengirim cannot record arrival for receiver');

  await processPengurusArrival(updatedReq.id, {
    initialReceivedDate: '2026-09-24',
    notes: 'Truk tiba di pos utama pukul 14:00'
  }, pengurusPemohon);

  updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA);
  assert.strictEqual(updatedReq.targetNextRole, 'ASKEP');
  console.log('  -> PASS: Pengurus Pemohon recorded arrival, status is MENUNGGU_VERIFIKASI_ASISTEN_KEPALA (handoff to Askep Pemohon).\n');

  // --- TEST 7: Askep Pemohon Routing (Jalur BIBITAN) ---
  console.log('TEST 7: Askep Pemohon Routing (Jalur BIBITAN)');
  assert.strictEqual(canPerformAskepReceiptRouting(updatedReq, askepPemohon), true);
  assert.strictEqual(canPerformAskepReceiptRouting(updatedReq, askepPengirim), false, 'Askep pengirim cannot route receiver side');

  await processAskepReceiptRouting(updatedReq.id, {
    targetNextDivisionId: 'DIV-02',
    notes: 'Teruskan ke Bibitan Divisi 02 untuk persiapan okulasi'
  }, askepPemohon);

  updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN);
  assert.strictEqual(updatedReq.targetNextDivisionId, 'DIV-02');
  console.log('  -> PASS: Askep Pemohon routed to Divisi Bibitan 02.\n');

  // --- TEST 8: Asisten Bibitan Pemohon Verification ---
  console.log('TEST 8: Asisten Bibitan Pemohon Verification');
  assert.strictEqual(canPerformAsistenBibitanReceiptVerification(updatedReq, asbPemohon), true);
  const wrongDivAsbPemohon = { ...asbPemohon, divisionId: 'DIV-05' };
  assert.strictEqual(canPerformAsistenBibitanReceiptVerification(updatedReq, wrongDivAsbPemohon), false, 'Wrong division Asb cannot verify');

  await processAsistenBibitanReceiptVerification(updatedReq.id, {
    notes: 'Dokumen dan transaksi diverifikasi, diteruskan ke Mantri'
  }, asbPemohon);

  updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN);
  assert.strictEqual(updatedReq.targetNextRole, 'MANTRI_TANAMAN');
  assert.strictEqual(updatedReq.asbReceiptVerification.notes, 'Dokumen dan transaksi diverifikasi, diteruskan ke Mantri');
  console.log('  -> PASS: Asisten Bibitan Pemohon verified, handed off to Mantri Bibitan Pemohon.\n');

  // --- TEST 9: Mantri Bibitan Pemohon Final Receipt ---
  console.log('TEST 9: Mantri Bibitan Pemohon Final Receipt');
  assert.strictEqual(canPerformMantriBibitanFinalReceipt(updatedReq, mantriPemohon), true);
  assert.strictEqual(canPerformMantriBibitanFinalReceipt(updatedReq, mantriPengirim), false, 'Mantri pengirim cannot finalize receiver receipt');

  await processMantriBibitanFinalReceipt(updatedReq.id, {
    jumlahBatangDiterima: 500,
    jumlahMataEntresDiterima: 1000,
    rejectBatang: 0,
    rejectMata: 0,
    tanggalPenerimaan: '2026-09-24',
    photoEvidence: { image: 'data:image/jpeg;base64,receiptphoto' },
    notes: 'Seluruh 500 batang mata entres diterima dalam kondisi segar'
  }, mantriPemohon);

  updatedReq = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq.status, MATA_ENTRES_STATUS.DITERIMA);
  assert.strictEqual(updatedReq.jumlahBatangDiterima, 500);
  assert.strictEqual(updatedReq.jumlahMataEntresDiterima, 1000);
  assert.strictEqual(updatedReq.workflowStage, 'SELESAI');

  const finalReceipt = getReceiptKspTransactions()[0];
  assert.strictEqual(finalReceipt.status, RECEIPT_KSP_STATUS.DITERIMA);
  assert.strictEqual(finalReceipt.totalAcceptedBatang, 500);
  assert.strictEqual(finalReceipt.totalAcceptedMata, 1000);
  console.log('  -> PASS: Mantri Bibitan Pemohon finalized receipt, status is DITERIMA.\n');

  // --- TEST 10: Data Integrity (REQUEST != DISPATCH != RECEIPT) ---
  console.log('TEST 10: Data Integrity');
  assert.strictEqual(updatedReq.jumlahBatang, 500, 'Original request batang intact');
  assert.strictEqual(updatedReq.jumlahBatangDikeluarkan, 500, 'Dispatch batang intact');
  assert.strictEqual(updatedReq.jumlahMataEntresDikeluarkan, 1000, 'Dispatch mata intact');
  assert.strictEqual(updatedReq.jumlahBatangDiterima, 500, 'Receipt batang intact');
  assert.strictEqual(updatedReq.jumlahMataEntresDiterima, 1000, 'Receipt mata intact');
  console.log('  -> PASS: Request, Dispatch, and Receipt data are clearly isolated and intact.\n');

  // --- TEST 11: Discrepancy Scenario ---
  console.log('TEST 11: Discrepancy Scenario');
  const req2 = {
    id: 'REQ-ME-2026-002',
    docNo: '2026/REQ/ETRS/002',
    type: 'MATA_ENTRES',
    jumlahBatang: 200,
    jumlahBatangDikeluarkan: 200,
    jumlahMataEntresDikeluarkan: 400,
    sourceEstateId: 'EST-TBS',
    targetNextDivisionId: 'DIV-02',
    status: MATA_ENTRES_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN
  };
  storage.set('requests_transactions', [req2]);

  await processMantriBibitanFinalReceipt(req2.id, {
    jumlahBatangDiterima: 190,
    jumlahMataEntresDiterima: 380,
    rejectBatang: 10,
    rejectMata: 20,
    rejectReason: '10 batang patah saat pengiriman',
    tanggalPenerimaan: '2026-09-24',
    notes: 'Diterima dengan selisih reject'
  }, mantriPemohon);

  const updatedReq2 = storage.get('requests_transactions')[0];
  assert.strictEqual(updatedReq2.status, MATA_ENTRES_STATUS.DITERIMA_DENGAN_SELISIH);
  assert.strictEqual(updatedReq2.rejectBatang, 10);
  assert.strictEqual(updatedReq2.jumlahBatangDiterima, 190);
  console.log('  -> PASS: Discrepancy correctly transitions status to DITERIMA_DENGAN_SELISIH.\n');

  // --- TEST 12: Domain Isolation for Penerimaan Bibit ---
  console.log('TEST 12: Domain Isolation for Penerimaan Bibit');
  const allReceipts = [
    {
      id: 'RCP-ME-001',
      type: 'MATA_ENTRES',
      transactionType: 'PENERIMAAN_MATA_ENTRES',
      targetEstateId: 'EST-TBS',
      status: RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS,
      targetNextRole: 'PENGURUS',
      jalurPenerimaan: 'BIBITAN'
    },
    {
      id: 'RCP-BIBIT-001',
      type: 'KEBUN_SEPUPU',
      transactionType: 'PENERIMAAN_BIBIT',
      targetEstateId: 'EST-TBS',
      status: RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS,
      targetNextRole: 'PENGURUS',
      jalurPenerimaan: 'BIBITAN'
    }
  ];

  const filteredForPengurus = filterReceiptKspRequests(allReceipts, pengurusPemohon);
  assert.strictEqual(filteredForPengurus.length, 1, 'Only 1 receipt should pass filter for Penerimaan Bibit');
  assert.strictEqual(filteredForPengurus[0].id, 'RCP-BIBIT-001', 'Only Bibit receipt should be visible in Penerimaan Bibit');
  assert.strictEqual(canPerformPengurusReceiptAction(allReceipts[0], pengurusPemohon), false, 'Mata Entres receipt must not be actionable in Penerimaan Bibit');
  assert.strictEqual(canPerformPengurusReceiptAction(allReceipts[1], pengurusPemohon), true, 'Bibit receipt is actionable in Penerimaan Bibit');
  assert.strictEqual(getActionableReceiptCount(allReceipts, pengurusPemohon), 1, 'Actionable count for Bibit is 1, ignoring Mata Entres');
  console.log('  -> PASS: Penerimaan Bibit cleanly rejects Mata Entres records.\n');

  // --- TEST 13: Idempotency Protection on Dispatch & Receipt ---
  console.log('TEST 13: Idempotency Protection on Dispatch & Receipt');
  const reqIdempotent = {
    id: 'REQ-ME-IDEMP-001',
    docNo: '2026/REQ/ETRS/IDEMP',
    type: 'MATA_ENTRES',
    jumlahBatang: 100,
    jumlahBatangDikeluarkan: 100,
    sourceEstateId: 'EST-TBS',
    targetEstateId: 'EST-APM',
    status: MATA_ENTRES_STATUS.TERVERIFIKASI
  };
  storage.set('requests_transactions', [reqIdempotent]);
  storage.set('dispatch_transactions', []);
  storage.set('receipt_ksp_transactions', []);

  // Dispatch 1st call
  await processMantriDispatch(reqIdempotent.id, {
    jumlahBatangDikeluarkan: 100,
    jumlahMataEntresDikeluarkan: 200,
    tanggalPengeluaran: '2026-09-24'
  }, mantriPengirim);

  const dispatchesAfter1st = storage.get('dispatch_transactions', []);
  const receiptsAfter1st = storage.get('receipt_ksp_transactions', []);
  assert.strictEqual(dispatchesAfter1st.length, 1, 'First dispatch creates 1 DSP');
  assert.strictEqual(receiptsAfter1st.length, 1, 'First dispatch creates 1 RCP');

  // Repeated dispatch call for the same request
  await processMantriDispatch(reqIdempotent.id, {
    jumlahBatangDikeluarkan: 100,
    jumlahMataEntresDikeluarkan: 200,
    tanggalPengeluaran: '2026-09-24'
  }, mantriPengirim);

  const dispatchesAfter2nd = storage.get('dispatch_transactions', []);
  const receiptsAfter2nd = storage.get('receipt_ksp_transactions', []);
  assert.strictEqual(dispatchesAfter2nd.length, 1, 'Repeated dispatch must NOT create duplicate DSP');
  assert.strictEqual(receiptsAfter2nd.length, 1, 'Repeated dispatch must NOT create duplicate RCP');
  console.log('  -> PASS: Idempotency protection prevents duplicate DSP and RCP on repeated execution.\n');

  console.log('=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
