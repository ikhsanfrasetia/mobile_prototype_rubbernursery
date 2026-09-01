/**
 * modules/history/nursery-history.js — Riwayat Data Pembibitan & Laporan Ketersediaan Stok
 * Menghubungkan dan mengagregasi seluruh proses transaksi pembibitan berdasarkan data real:
 * 
 * PEMISAHAN KETAT BERDASARKAN TAHAPAN PERTUMBUHAN:
 * 1. Rubber Main Nursery (RMN):
 *    - Penerimaan Benih / Biji Kelatak -> Penyemaian (Seeding) -> Okulasi (Grafting) -> Pemeriksaan -> Okulasi Janda (Regrafting) -> Afkir.
 *    - Klon Utama: Diambil dari Klon Entres hasil Okulasi terakhir.
 *    - Populasi Klon: Rincian jumlah bibit per klon entres (Okulasi Pokok vs Okulasi Janda).
 * 
 * 2. Rubber Advance Planting Material (APM):
 *    - Penerimaan Bibit APM (Stok Masuk Jadi / Siap Tanam) -> Seleksi / Afkir Penerimaan APM.
 *    - TIDAK ADA proses penyemaian maupun okulasi/okulasi janda.
 *    - Klon: Klon bibit yang diterima saat transaksi penerimaan APM.
 * 
 * Perhitungan Stok Aktual:
 * Total Bibit Tersedia (Stok Aktual) = Stok Awal Penerimaan - Total Pengurangan Stok Afkir
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate } from '../../core/utils.js';

let selectedProgramFilter = 'ALL';
let selectedStageFilter = 'ALL'; // 'ALL' | 'Rubber Main Nursery' | 'Rubber Advance Planting Material'
let activeCategoryFilter = 'ALL';
let searchQuery = '';

export function renderNurseryHistory() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Wagiman', role: 'MANTRI_TANAMAN', position: 'Mandor Semprot' };
  const today = formatDate(new Date().toISOString());

  // 1. Ambil data real transaksi dari storage
  const receiptTxs = storage.get('receipt_transactions', []);
  const seedingTxs = storage.get('seeding_transactions', []);
  const buddingTxs = storage.get('budding_transactions', []);
  const inspectionTxs = storage.get('inspection_transactions', []);
  const selectionTxs = storage.get('selection_transactions', []);

  // 2. Kumpulkan Daftar Program Pembibitan Unik dari Transaksi Real
  const programSet = new Set();
  receiptTxs.forEach(tx => { if (tx.program) programSet.add(tx.program); });
  seedingTxs.forEach(tx => { if (tx.program) programSet.add(tx.program); });
  buddingTxs.forEach(tx => { if (tx.program) programSet.add(tx.program); });
  const availablePrograms = Array.from(programSet);

  // 3. Normalisasi Seluruh Transaksi ke Format Universal
  const allHistoryItems = [];

  // A. Penerimaan Benih / Bibit APM (Stok Masuk Awal)
  receiptTxs.forEach((tx, idx) => {
    const qty = parseInt(tx.qty || tx.jumlahBenih || tx.jumlahDiterima || tx.totalKecambah || tx.jumlah || 0);
    const itemProgram = tx.program || '-';
    const itemStage = tx.tahapan || 'Rubber Main Nursery';
    const isAPM = itemStage === 'Rubber Advance Planting Material';
    
    allHistoryItems.push({
      id: `RCV-${idx}`,
      category: 'RECEPTION',
      categoryLabel: isAPM ? 'Penerimaan APM' : 'Penerimaan Benih',
      program: itemProgram,
      stage: itemStage,
      badgeBg: isAPM ? '#EFF6FF' : '#E0F2FE',
      badgeColor: isAPM ? '#1E40AF' : '#0369A1',
      badgeBorder: isAPM ? '#BFDBFE' : '#BAE6FD',
      docNo: tx.docNo || tx.nomorDokumen || `RCV/2026/0${idx + 1}`,
      batchNo: tx.batchNo || (tx.rawState && tx.rawState.batchCode) || '-',
      klon: tx.klon || tx.jenisBenih || tx.klonRootstock || '-',
      bedengan: tx.bedengan || '-',
      tanggal: tx.tanggal || tx.date || today,
      mantri: tx.penerima || tx.mantri || user.name,
      qty: qty,
      stockMutation: `+${qty.toLocaleString('id-ID')} Pkk`,
      mutationType: 'IN',
      summaryCol1: { label: 'Stok Diterima', val: `${qty.toLocaleString('id-ID')} Pkk`, color: '#0369A1' },
      summaryCol2: { label: 'Asal / Sumber', val: tx.sumber || tx.tipeAsal || '-', color: '#374151' },
      summaryCol3: { label: 'Mutasi Stok', val: `+${qty.toLocaleString('id-ID')} Pkk`, color: '#0369A1', isBold: true },
      details: [
        { label: 'Program Pembibitan', val: itemProgram },
        { label: 'Tahapan Pertumbuhan', val: itemStage },
        { label: 'Jenis Penerimaan', val: tx.jenis || (isAPM ? 'Rubber Advance Planting Material' : 'Benih / Biji Kelatak') },
        { label: 'Klon', val: tx.klon || '-' },
        ...(tx.sir && tx.sir !== '-' ? [{ label: 'No. Surat Pengantar (SIR)', val: tx.sir }] : []),
        { label: 'Sumber Asal', val: tx.sumber || tx.tipeAsal || '-' },
        { label: 'Petugas Penerima', val: tx.penerima || tx.mantri || user.name },
        { label: 'Tanggal Transaksi', val: tx.tanggal || today }
      ]
    });
  });

  // B. Penanaman (Seeding) — HANYA Rubber Main Nursery
  seedingTxs.forEach((tx, idx) => {
    const qty = parseInt(tx.totalDisemai || tx.jumlahDitanam || tx.totalPenerimaan || tx.jumlah || 0);
    const ditolak = parseInt(tx.ditolak || 0);
    const itemProgram = tx.program || '-';
    const itemStage = tx.tahapan || 'Rubber Main Nursery';

    allHistoryItems.push({
      id: `SEED-${idx}`,
      category: 'SEEDING',
      categoryLabel: 'Penyemaian / Tanam',
      program: itemProgram,
      stage: itemStage,
      badgeBg: '#F3E8FF',
      badgeColor: '#6B21A8',
      badgeBorder: '#E9D5FF',
      docNo: tx.docNo || `SEED/2026/0${idx + 1}`,
      batchNo: tx.batchNo || `Batch-0${idx + 1}`,
      klon: tx.klonAwal || tx.klonRootstock || tx.klon || 'GT-01',
      bedengan: (tx.rows && tx.rows.map(r => r.bedengan).filter(Boolean).join(', ')) || tx.bedengan || 'Bedengan 01',
      tanggal: tx.date || tx.tanggal || today,
      mantri: tx.mantri || user.name,
      qty: qty,
      stockMutation: `Ditanam ${qty.toLocaleString('id-ID')} Pkk`,
      mutationType: 'PROCESS',
      summaryCol1: { label: 'Disemai / Tanam', val: `${qty.toLocaleString('id-ID')} Pkk`, color: '#6B21A8' },
      summaryCol2: { label: 'Bedengan', val: (tx.rows && tx.rows.map(r => r.bedengan).filter(Boolean).join(', ')) || tx.bedengan || 'Bedengan 01', color: '#374151' },
      summaryCol3: { label: 'Ditolak Awal', val: ditolak > 0 ? `${ditolak.toLocaleString('id-ID')} Pkk` : '0 Pkk', color: ditolak > 0 ? '#DC2626' : '#6B7280' },
      details: [
        { label: 'Program Pembibitan', val: itemProgram },
        { label: 'Tahapan Pertumbuhan', val: itemStage },
        { label: 'Nomor Batch', val: tx.batchNo || `Batch-0${idx + 1}` },
        { label: 'Klon Rootstock', val: tx.klonAwal || tx.klonRootstock || tx.klon || 'GT-01' },
        { label: 'Total Penerimaan Awal', val: `${parseInt(tx.totalPenerimaan || qty).toLocaleString('id-ID')} Pkk` },
        { label: 'Total Bibit Disemai', val: `${qty.toLocaleString('id-ID')} Pkk` },
        { label: 'Total Polybag', val: `${parseInt(tx.totalPolybag || qty).toLocaleString('id-ID')} Bag` },
        { label: 'Ditolak / Seleksi Awal', val: `${ditolak} Pkk (${tx.alasanDitolak || 'Tidak Ada'})` },
        { label: 'Tanggal Transaksi', val: tx.date || tx.tanggal || today }
      ]
    });
  });

  // C. Okulasi (Grafting & Okulasi Janda) — HANYA Rubber Main Nursery
  buddingTxs.forEach((tx, idx) => {
    const isRegraft = tx.type === 'REGRAFTING';
    const qty = parseInt(tx.jumlah || 0);
    const ditolak = parseInt(tx.jumlahDitolak || 0);
    const itemProgram = tx.program || '-';
    const itemStage = tx.tahapan || 'Rubber Main Nursery';

    allHistoryItems.push({
      id: `OKL-${idx}`,
      category: 'BUDDING',
      categoryLabel: isRegraft ? 'Okulasi Janda' : 'Okulasi (Grafting)',
      program: itemProgram,
      stage: itemStage,
      badgeBg: isRegraft ? '#FEF3C7' : '#DCFCE7',
      badgeColor: isRegraft ? '#92400E' : '#116834',
      badgeBorder: isRegraft ? '#FDE68A' : '#BBF7D0',
      docNo: tx.docNo || (isRegraft ? `OKL/REG/2026/0${idx + 1}` : `OKL/2026/0${idx + 1}`),
      batchNo: tx.batchNo || 'Batch-01',
      klon: `${tx.klonEntres || 'PB 260'} / ${tx.klonRootstock || 'GT1'}`,
      bedengan: tx.bedengan || 'Bedengan 01',
      tanggal: tx.tanggal || today,
      mantri: tx.mantri || user.name,
      qty: qty,
      stockMutation: `Diokulasi ${qty.toLocaleString('id-ID')} Pkk`,
      mutationType: 'PROCESS',
      summaryCol1: { label: 'Diokulasi', val: `${qty.toLocaleString('id-ID')} Pkk`, color: '#116834' },
      summaryCol2: { label: 'Mata Entres', val: tx.klonEntres || 'PB 260', color: '#374151' },
      summaryCol3: { label: 'Reject / Ditolak', val: ditolak > 0 ? `${ditolak.toLocaleString('id-ID')} Pkk` : '0 Pkk', color: ditolak > 0 ? '#C2410C' : '#6B7280', isBold: ditolak > 0 },
      details: [
        { label: 'Tipe Transaksi', val: isRegraft ? 'Okulasi Ulang / Janda (Regrafting)' : 'Okulasi Pokok Pertama (Grafting)' },
        { label: 'Tahapan Pertumbuhan', val: itemStage },
        { label: 'Nomor Batch', val: tx.batchNo || 'Batch-01' },
        { label: 'Klon Rootstock (Bawah)', val: tx.klonRootstock || 'GT1' },
        { label: 'Klon Entres (Mata)', val: tx.klonEntres || 'PB 260' },
        { label: 'Bedengan', val: tx.bedengan || 'Bedengan 01' },
        { label: 'Jumlah Diokulasi', val: `${qty.toLocaleString('id-ID')} Pkk` },
        ...(ditolak > 0 ? [{ label: 'Jumlah Ditolak / Reject', val: `${ditolak.toLocaleString('id-ID')} Pkk` }] : []),
        { label: 'Pekerja Terlibat', val: `${(tx.workers && tx.workers.length) || 1} Orang` },
        { label: 'Mantri Pengawas', val: tx.mantri || user.name },
        { label: 'Tanggal Transaksi', val: tx.tanggal || today }
      ]
    });
  });

  // D. Pemeriksaan Okulasi — HANYA Rubber Main Nursery
  inspectionTxs.forEach((tx, idx) => {
    const total = parseInt(tx.totalDiperiksa || 0);
    const berhasil = parseInt(tx.jumlahJadi || 0);
    const gagal = parseInt(tx.jumlahGagal || 0);
    const persen = parseFloat(tx.persenJadi || (total > 0 ? Math.round((berhasil / total) * 100) : 0));
    const itemProgram = tx.program || '-';
    const itemStage = tx.tahapan || 'Rubber Main Nursery';

    allHistoryItems.push({
      id: `INSP-${idx}`,
      category: 'INSPECTION',
      categoryLabel: 'Pemeriksaan Okulasi',
      program: itemProgram,
      stage: itemStage,
      badgeBg: '#E0E7FF',
      badgeColor: '#3730A3',
      badgeBorder: '#C7D2FE',
      docNo: tx.docNo || `INSP/2026/0${idx + 1}`,
      batchNo: tx.batchNo || 'Batch-01',
      klon: tx.klonEntres || 'PB 260',
      bedengan: tx.bedengan || 'Bedengan 01',
      tanggal: tx.tanggal || today,
      mantri: tx.inspector || tx.mantri || user.name,
      qty: total,
      stockMutation: `Periksa ${total.toLocaleString('id-ID')} Pkk`,
      mutationType: 'INSPECT',
      summaryCol1: { label: 'Hasil Jadi', val: `${berhasil.toLocaleString('id-ID')} Pkk`, color: '#116834' },
      summaryCol2: { label: 'Keberhasilan', val: `${persen}%`, color: persen >= 80 ? '#116834' : '#C2410C', isBold: true },
      summaryCol3: { label: 'Gagal / Mati', val: `${gagal.toLocaleString('id-ID')} Pkk`, color: gagal > 0 ? '#DC2626' : '#6B7280' },
      details: [
        { label: 'Ref. Dokumen Okulasi', val: tx.buddingDocNo || '-' },
        { label: 'Tahapan Pertumbuhan', val: itemStage },
        { label: 'Nomor Batch', val: tx.batchNo || 'Batch-01' },
        { label: 'Klon Entres', val: tx.klonEntres || 'PB 260' },
        { label: 'Total Bibit Diperiksa', val: `${total.toLocaleString('id-ID')} Pkk` },
        { label: 'Jumlah Berhasil (Jadi)', val: `${berhasil.toLocaleString('id-ID')} Pkk (${persen}%)` },
        { label: 'Jumlah Gagal (Mati)', val: `${gagal.toLocaleString('id-ID')} Pkk` },
        { label: 'Alokasi Okulasi Janda', val: `${parseInt(tx.totalToRegrafting || 0).toLocaleString('id-ID')} Pkk` },
        { label: 'Alokasi Seleksi / Afkir', val: `${parseInt(tx.totalToSelection || 0).toLocaleString('id-ID')} Pkk` },
        { label: 'Mandor Pemeriksa', val: tx.inspector || tx.mantri || user.name },
        { label: 'Tanggal Transaksi', val: tx.tanggal || today }
      ]
    });
  });

  // E. Penyeleksian Bibit (Afkir) — RMN & APM
  selectionTxs.forEach((tx, idx) => {
    const qty = parseInt(tx.jumlahAfkir || 0);
    const itemProgram = tx.program || '-';
    const itemStage = tx.tahapan || 'Rubber Main Nursery';

    allHistoryItems.push({
      id: `CUL-${idx}`,
      category: 'SELECTION',
      categoryLabel: 'Penyeleksian (Afkir)',
      program: itemProgram,
      stage: itemStage,
      badgeBg: '#FEE2E2',
      badgeColor: '#B91C1C',
      badgeBorder: '#FCA5A5',
      docNo: tx.docNo || `DEC-CUL/2026/0${idx + 1}`,
      batchNo: tx.batchNo || 'Batch-01',
      klon: tx.klon || 'PB 260',
      bedengan: tx.bedengan || 'Bedengan 01',
      tanggal: tx.tanggal || today,
      mantri: tx.mantri || user.name,
      qty: qty,
      stockMutation: `(${qty.toLocaleString('id-ID')}) Pkk`,
      mutationType: 'OUT',
      summaryCol1: { label: 'Bibit Diafkir', val: `${qty.toLocaleString('id-ID')} Pkk`, color: '#DC2626' },
      summaryCol2: { label: 'Dok. Alokasi', val: tx.selectionPoolDocNo || '-', color: '#374151' },
      summaryCol3: { label: 'Pengurangan Stok', val: `(${qty.toLocaleString('id-ID')}) Pkk`, color: '#DC2626', isBold: true },
      details: [
        { label: 'Dokumen Alokasi Pool', val: tx.selectionPoolDocNo || '-' },
        { label: 'Tahapan Pertumbuhan', val: itemStage },
        { label: 'Nomor Batch', val: tx.batchNo || 'Batch-01' },
        { label: 'Klon', val: tx.klon || 'PB 260' },
        { label: 'Bedengan', val: tx.bedengan || 'Bedengan 01' },
        { label: 'Alasan Pengafkiran', val: tx.alasan || 'Tidak Berhasil Okulasi / Gagal Tumbuh / Afkir Penerimaan' },
        { label: 'Pengurangan Stok Fisik', val: `(${qty.toLocaleString('id-ID')}) Pkk (Dikonfirmasi)` },
        { label: 'Mantri Pelaksana', val: tx.mantri || user.name },
        { label: 'Tanggal Transaksi', val: tx.tanggal || today }
      ]
    });
  });

  // 4. Kalkulasi Stok Berdasarkan Data Real Transaksi (Filtered by Program & Tahapan if selected)
  const filterByCriteria = (list) => {
    return list.filter(t => {
      const matchProgram = selectedProgramFilter === 'ALL' || t.program === selectedProgramFilter;
      const matchStage = selectedStageFilter === 'ALL' || (t.tahapan || 'Rubber Main Nursery') === selectedStageFilter;
      return matchProgram && matchStage;
    });
  };

  const targetReceipts = filterByCriteria(receiptTxs);
  const targetSeedings = filterByCriteria(seedingTxs);
  const targetBuddings = filterByCriteria(buddingTxs);
  const targetInspections = filterByCriteria(inspectionTxs);
  const targetSelections = filterByCriteria(selectionTxs);

  // Perhitungan Stok Global Terpilih
  let stokAwalPenerimaan = targetReceipts.reduce((sum, tx) => sum + parseInt(tx.qty || tx.jumlahBenih || tx.jumlahDiterima || tx.totalKecambah || tx.jumlah || 0), 0);
  if (stokAwalPenerimaan === 0 && targetSeedings.length > 0) {
    stokAwalPenerimaan = targetSeedings.reduce((sum, tx) => sum + parseInt(tx.totalPenerimaan || tx.totalDisemai || 0), 0);
  }

  const totalDitanam = targetSeedings.reduce((sum, tx) => sum + parseInt(tx.totalDisemai || tx.jumlahDitanam || 0), 0);
  const totalDiokulasi = targetBuddings.reduce((sum, tx) => sum + parseInt(tx.jumlah || 0), 0);
  const totalDiperiksa = targetInspections.reduce((sum, tx) => sum + parseInt(tx.totalDiperiksa || 0), 0);
  const totalBerhasil = targetInspections.reduce((sum, tx) => sum + parseInt(tx.jumlahJadi || 0), 0);
  const totalAfkir = targetSelections.reduce((sum, tx) => sum + parseInt(tx.jumlahAfkir || 0), 0);

  // Stok Aktual Ketersediaan = Stok Awal Penerimaan - Total Deklarasi Afkir
  const stokAktualKetersediaan = Math.max(0, stokAwalPenerimaan - totalAfkir);

  // 5. Kalkulasi Khusus Komparasi Berdasarkan 2 Jenis Tahapan Pertumbuhan:
  // A. Rubber Main Nursery
  const rmnReceipts = receiptTxs.filter(t => (selectedProgramFilter === 'ALL' || t.program === selectedProgramFilter) && (t.tahapan || 'Rubber Main Nursery') === 'Rubber Main Nursery');
  const rmnSeedings = seedingTxs.filter(t => (selectedProgramFilter === 'ALL' || t.program === selectedProgramFilter) && (t.tahapan || 'Rubber Main Nursery') === 'Rubber Main Nursery');
  const rmnSelections = selectionTxs.filter(t => (selectedProgramFilter === 'ALL' || t.program === selectedProgramFilter) && (t.tahapan || 'Rubber Main Nursery') === 'Rubber Main Nursery');
  let stokAwalRMN = rmnReceipts.reduce((sum, tx) => sum + parseInt(tx.qty || tx.jumlahBenih || tx.jumlahDiterima || tx.totalKecambah || tx.jumlah || 0), 0);
  if (stokAwalRMN === 0 && rmnSeedings.length > 0) {
    stokAwalRMN = rmnSeedings.reduce((sum, tx) => sum + parseInt(tx.totalPenerimaan || tx.totalDisemai || 0), 0);
  }
  const afkirRMN = rmnSelections.reduce((sum, tx) => sum + parseInt(tx.jumlahAfkir || 0), 0);
  const stokAktualRMN = Math.max(0, stokAwalRMN - afkirRMN);

  // B. Rubber Advance Planting Material (APM)
  const apmReceipts = receiptTxs.filter(t => (selectedProgramFilter === 'ALL' || t.program === selectedProgramFilter) && t.tahapan === 'Rubber Advance Planting Material');
  const apmSelections = selectionTxs.filter(t => (selectedProgramFilter === 'ALL' || t.program === selectedProgramFilter) && t.tahapan === 'Rubber Advance Planting Material');
  const stokAwalAPM = apmReceipts.reduce((sum, tx) => sum + parseInt(tx.qty || tx.jumlahBenih || tx.jumlahDiterima || tx.totalKecambah || tx.jumlah || 0), 0);
  const afkirAPM = apmSelections.reduce((sum, tx) => sum + parseInt(tx.jumlahAfkir || 0), 0);
  const stokAktualAPM = Math.max(0, stokAwalAPM - afkirAPM);

  // 6. Kalkulasi Rincian Ketersediaan Stok per Masing-Masing Batch
  // Akumulasi total nilai per batch (satu kartu per nomor batch unik dalam tahapannya)
  const batchMap = new Map();
  const matchesProgram = (tx) => selectedProgramFilter === 'ALL' || !tx.program || tx.program === selectedProgramFilter;

  const getBatchKey = (stage, batchNo) => `${stage}____${(batchNo || '').trim().toUpperCase()}`;

  const getBatchObj = (batchNo, defaultProgram, stage, defaultKlon) => {
    const cleanBatchNo = (batchNo || '').trim();
    const key = getBatchKey(stage, cleanBatchNo);

    if (!batchMap.has(key)) {
      batchMap.set(key, {
        batchNo: cleanBatchNo,
        program: defaultProgram || '-',
        stage: stage,
        klon: defaultKlon || '-',
        rootstockKlon: defaultKlon || '-',
        latestOkulasiKlon: null,
        okulasiEntries: [],
        bedengan: '-',
        stokAwal: 0,
        ditanam: 0,
        diokulasi: 0,
        diperiksa: 0,
        berhasilOkulasi: 0,
        afkir: 0,
        stokAktual: 0
      });
    }
    const item = batchMap.get(key);
    if (defaultProgram && item.program === '-') item.program = defaultProgram;
    if (defaultKlon && item.klon === '-') {
      item.klon = defaultKlon;
      item.rootstockKlon = defaultKlon;
    }
    return item;
  };

  // 1. Data dari Seeding (HANYA Rubber Main Nursery)
  seedingTxs.forEach((tx, idx) => {
    if (!matchesProgram(tx)) return;
    const stage = tx.tahapan || 'Rubber Main Nursery';
    if (stage !== 'Rubber Main Nursery') return;
    const bNo = (tx.batchNo || `Batch-0${idx + 1}`).trim();
    if (!bNo || bNo === '-') return;

    const bObj = getBatchObj(bNo, tx.program, stage, tx.klonAwal || tx.klon);
    const disemai = parseInt(tx.totalDisemai || tx.jumlahDitanam || 0);
    bObj.stokAwal += disemai;
    bObj.ditanam += disemai;
    if (tx.klonAwal || tx.klon) {
      bObj.rootstockKlon = tx.klonAwal || tx.klon;
      if (!bObj.latestOkulasiKlon) bObj.klon = bObj.rootstockKlon;
    }
    if (tx.rows && tx.rows.length > 0) {
      const beds = tx.rows.map(r => r.bedengan).filter(Boolean).join(', ');
      if (beds) bObj.bedengan = beds;
    } else if (tx.bedengan && tx.bedengan !== '-') {
      bObj.bedengan = tx.bedengan;
    }
  });

  // 2. Data dari Penerimaan APM (HANYA Rubber Advance Planting Material)
  receiptTxs.forEach((tx, idx) => {
    if (!matchesProgram(tx)) return;
    const stage = tx.tahapan || 'Rubber Main Nursery';
    if (stage === 'Rubber Advance Planting Material') {
      const bNo = (tx.batchNo || (tx.rawState && tx.rawState.batchCode) || `Batch-APM-0${idx + 1}`).trim();
      const qty = parseInt(tx.qty || tx.jumlahBenih || tx.jumlahDiterima || 0);
      const bObj = getBatchObj(bNo, tx.program, stage, tx.klon || 'IRR 300');
      bObj.stokAwal += qty;
      bObj.klon = tx.klon || 'IRR 300';
      if (tx.sumber || tx.tipeAsal) bObj.sumber = tx.sumber || tx.tipeAsal;
      if (tx.bedengan && tx.bedengan !== '-') bObj.bedengan = tx.bedengan;
    }
  });

  // 3. Data dari Okulasi (Grafting & Okulasi Janda) — HANYA Rubber Main Nursery
  buddingTxs.forEach((tx) => {
    if (!matchesProgram(tx)) return;
    const stage = tx.tahapan || 'Rubber Main Nursery';
    if (stage !== 'Rubber Main Nursery') return;
    const bNo = (tx.batchNo || '').trim();
    if (!bNo || bNo === '-') return;

    const bObj = getBatchObj(bNo, tx.program, stage, tx.klonRootstock);
    const jml = parseInt(tx.jumlah || 0);
    bObj.diokulasi += jml;

    const klonEntresName = tx.klonEntres || 'PB 260';
    const isRegraft = tx.type === 'REGRAFTING';

    if (isRegraft) {
      bObj.regraftOkulasi = (bObj.regraftOkulasi || 0) + jml;
    } else {
      bObj.primaryOkulasi = (bObj.primaryOkulasi || 0) + jml;
    }
    
    bObj.okulasiEntries.push({
      type: isRegraft ? 'Okulasi Janda' : 'Okulasi Pokok',
      klonEntres: klonEntresName,
      klonRootstock: tx.klonRootstock || bObj.rootstockKlon,
      jumlah: jml,
      tanggal: tx.tanggal || today,
      docNo: tx.docNo
    });

    bObj.latestOkulasiKlon = klonEntresName;
    if (tx.bedengan && tx.bedengan !== '-' && bObj.bedengan === '-') {
      bObj.bedengan = tx.bedengan;
    }
  });

  // 4. Data dari Pemeriksaan Okulasi — HANYA Rubber Main Nursery
  inspectionTxs.forEach((tx) => {
    if (!matchesProgram(tx)) return;
    const stage = tx.tahapan || 'Rubber Main Nursery';
    if (stage !== 'Rubber Main Nursery') return;
    const bNo = (tx.batchNo || '').trim();
    if (!bNo || bNo === '-') return;

    const bObj = getBatchObj(bNo, tx.program, stage, tx.klonEntres);
    bObj.diperiksa += parseInt(tx.totalDiperiksa || 0);
    bObj.berhasilOkulasi += parseInt(tx.jumlahJadi || 0);
  });

  // 5. Data dari Selection (Afkir) — RMN & APM
  selectionTxs.forEach((tx) => {
    if (!matchesProgram(tx)) return;
    const stage = tx.tahapan || 'Rubber Main Nursery';
    const bNo = (tx.batchNo || (stage === 'Rubber Advance Planting Material' ? 'Batch-APM-01' : 'Batch-01')).trim();
    if (!bNo || bNo === '-') return;

    const bObj = getBatchObj(bNo, tx.program, stage, tx.klon);
    bObj.afkir += parseInt(tx.jumlahAfkir || 0);
  });

  // 6. Hitung Stok Aktual dan Agregasi Populasi per Klon per Batch
  const batchListSummary = Array.from(batchMap.values()).map(b => {
    const isAPM = b.stage === 'Rubber Advance Planting Material';
    const baseline = b.stokAwal > 0 ? b.stokAwal : b.ditanam;
    b.stokAktual = Math.max(0, baseline - b.afkir);

    if (isAPM) {
      b.klonPopulations = [];
      b.hasMultipleKlons = false;
      b.pokokDiokulasiPrimer = 0;
      b.pokokDiokulasiJanda = 0;
      b.sisaBatangBawahHidup = 0;
      b.stokOkulasiHidup = 0;
    } else {
      b.klon = b.latestOkulasiKlon || b.rootstockKlon || '-';

      const primaryGrafted = b.primaryOkulasi || 0;
      const regrafted = b.regraftOkulasi || 0;
      b.pokokDiokulasiPrimer = Math.min(primaryGrafted, b.stokAwal);
      b.pokokDiokulasiJanda = regrafted;

      // Batang bawah yang belum pernah disentuh okulasi
      const unGraftedRaw = Math.max(0, b.stokAwal - b.pokokDiokulasiPrimer);

      // Sisa Batang Bawah Hidup setelah memperhitungkan afkir
      b.sisaBatangBawahHidup = Math.max(0, unGraftedRaw - b.afkir);

      // Stok Bibit Hasil Okulasi yang Hidup saat ini
      const stokOkulasiHidup = Math.max(0, b.stokAktual - b.sisaBatangBawahHidup);
      b.stokOkulasiHidup = stokOkulasiHidup;

      // Agregasi rincian klon hidup yang klop dengan stok aktual
      const klonPop = [];
      if (regrafted > 0) {
        const regraftEntry = b.okulasiEntries.find(e => e.type === 'Okulasi Janda');
        const regraftKlonName = regraftEntry ? regraftEntry.klonEntres : 'PB 260';
        
        const primaryEntry = b.okulasiEntries.find(e => e.type === 'Okulasi Pokok');
        const primaryKlonName = primaryEntry ? primaryEntry.klonEntres : (b.latestOkulasiKlon || 'IRR 215');

        const hidupRegraft = Math.min(regrafted, stokOkulasiHidup);
        const hidupPrimary = Math.max(0, stokOkulasiHidup - hidupRegraft);

        if (hidupPrimary > 0) {
          klonPop.push({
            klon: primaryKlonName,
            type: 'Okulasi Pokok',
            jumlah: hidupPrimary
          });
        }
        if (hidupRegraft > 0) {
          klonPop.push({
            klon: regraftKlonName,
            type: 'Okulasi Janda',
            jumlah: hidupRegraft
          });
        }
      } else if (b.pokokDiokulasiPrimer > 0 && stokOkulasiHidup > 0) {
        const primaryEntry = b.okulasiEntries.find(e => e.type === 'Okulasi Pokok');
        const primaryKlonName = primaryEntry ? primaryEntry.klonEntres : (b.latestOkulasiKlon || 'PB 260');
        klonPop.push({
          klon: primaryKlonName,
          type: 'Okulasi Pokok',
          jumlah: stokOkulasiHidup
        });
      }

      b.klonPopulations = klonPop;
      b.hasMultipleKlons = klonPop.length > 1;
    }

    return b;
  });

  // Filter batch list by selected Stage
  const filteredBatches = batchListSummary.filter(b => {
    return selectedStageFilter === 'ALL' || b.stage === selectedStageFilter;
  });

  // 7. Filter Item Riwayat Berdasarkan Program, Tahapan Pertumbuhan, Kategori Transaksi, & Search
  let filteredItems = allHistoryItems;
  if (selectedProgramFilter !== 'ALL') {
    filteredItems = filteredItems.filter(item => item.program === selectedProgramFilter);
  }
  if (selectedStageFilter !== 'ALL') {
    filteredItems = filteredItems.filter(item => item.stage === selectedStageFilter);
  }
  if (activeCategoryFilter !== 'ALL') {
    filteredItems = filteredItems.filter(item => item.category === activeCategoryFilter);
  }
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filteredItems = filteredItems.filter(item => 
      (item.docNo && item.docNo.toLowerCase().includes(q)) ||
      (item.batchNo && item.batchNo.toLowerCase().includes(q)) ||
      (item.klon && item.klon.toLowerCase().includes(q)) ||
      (item.bedengan && item.bedengan.toLowerCase().includes(q)) ||
      (item.stage && item.stage.toLowerCase().includes(q)) ||
      (item.program && item.program.toLowerCase().includes(q)) ||
      (item.mantri && item.mantri.toLowerCase().includes(q))
    );
  }

  const isFilteredToAPM = selectedStageFilter === 'Rubber Advance Planting Material';

  // Render HTML
  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">Laporan & Riwayat Pembibitan</h1>
        </div>
      </header>

      <!-- CONTENT WRAPPER -->
      <main style="flex: 1; overflow-y: auto; padding: 14px 16px; min-height: 0; box-sizing: border-box;">
        
        <!-- CARD SUMMARY: FILTER PROGRAM & METRIK STOK -->
        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); box-sizing: border-box;">
          
          <!-- FILTER DROPDOWNS BARIS (RESPONSIVE GRID) -->
          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #F3F4F6;">
            <div style="font-size: 0.65rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
              Filter Data Laporan
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              
              <!-- FILTER 1: PROGRAM PEMBIBITAN -->
              <div style="position: relative;">
                <select id="select-program-filter" style="width: 100%; font-size: 0.74rem; font-weight: 700; color: #116834; border: 1px solid #A5D6A7; background: #E8F5E9; border-radius: 6px; padding: 7px 22px 7px 8px; outline: none; appearance: none; cursor: pointer; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; box-sizing: border-box;">
                  <option value="ALL" ${selectedProgramFilter === 'ALL' ? 'selected' : ''}>Semua Program</option>
                  ${availablePrograms.map(p => `<option value="${p}" ${selectedProgramFilter === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#116834" stroke-width="2.5" fill="none" style="position: absolute; right: 7px; top: 50%; transform: translateY(-50%); pointer-events: none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

              <!-- FILTER 2: TAHAPAN PERTUMBUHAN -->
              <div style="position: relative;">
                <select id="select-stage-filter" style="width: 100%; font-size: 0.74rem; font-weight: 700; color: #1E40AF; border: 1px solid #BFDBFE; background: #EFF6FF; border-radius: 6px; padding: 7px 22px 7px 8px; outline: none; appearance: none; cursor: pointer; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; box-sizing: border-box;">
                  <option value="ALL" ${selectedStageFilter === 'ALL' ? 'selected' : ''}>Semua Tahapan</option>
                  <option value="Rubber Main Nursery" ${selectedStageFilter === 'Rubber Main Nursery' ? 'selected' : ''}>Main Nursery</option>
                  <option value="Rubber Advance Planting Material" ${selectedStageFilter === 'Rubber Advance Planting Material' ? 'selected' : ''}>Advance Planting</option>
                </select>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#1E40AF" stroke-width="2.5" fill="none" style="position: absolute; right: 7px; top: 50%; transform: translateY(-50%); pointer-events: none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

            </div>
          </div>

          <!-- 2 BANNER UTAMA: STOK AWAL & BIBIT TERSEDIA (STOK AKTUAL) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 8px; padding: 10px 12px; box-sizing: border-box;">
              <div style="font-size: 0.62rem; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.02em;">Stok Awal Penerimaan</div>
              <div style="font-size: 1.20rem; font-weight: 900; color: #116834; margin-top: 3px; white-space: nowrap;">
                ${stokAwalPenerimaan.toLocaleString('id-ID')} <span style="font-size: 0.70rem; font-weight: 700;">Pkk</span>
              </div>
              <div style="font-size: 0.62rem; color: #15803D; margin-top: 2px;">Total Masuk</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; box-sizing: border-box;">
              <div style="font-size: 0.62rem; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.02em;">Total Bibit Tersedia</div>
              <div style="font-size: 1.20rem; font-weight: 900; color: #0F172A; margin-top: 3px; white-space: nowrap;">
                ${stokAktualKetersediaan.toLocaleString('id-ID')} <span style="font-size: 0.70rem; font-weight: 700;">Pkk</span>
              </div>
              <div style="font-size: 0.62rem; color: #64748B; margin-top: 2px;">Stok Aktual (Non-Afkir)</div>
            </div>
          </div>

          <!-- KOMPARASI STOK BERDASARKAN TAHAPAN PERTUMBUHAN -->
          <div style="margin-bottom: 10px;">
            <div style="font-size: 0.64rem; font-weight: 700; color: #6B7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em;">
              Stok Berdasarkan Tahapan Pertumbuhan
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              
              <!-- TAHAPAN 1: RUBBER MAIN NURSERY -->
              <div style="background: #FAF5FF; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 10px; box-sizing: border-box;">
                <div style="font-size: 0.65rem; font-weight: 700; color: #6B21A8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Main Nursery (RMN)</div>
                <div style="font-size: 0.95rem; font-weight: 900; color: #581C87; margin-top: 2px; white-space: nowrap;">
                  ${stokAktualRMN.toLocaleString('id-ID')} <span style="font-size: 0.65rem; font-weight: 700;">Pkk</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.60rem; color: #7E22CE; margin-top: 3px; padding-top: 3px; border-top: 1px dashed #E9D5FF;">
                  <span>Awal: ${stokAwalRMN.toLocaleString('id-ID')}</span>
                  <span style="color: #DC2626; font-weight: 700;">Afkir: (${afkirRMN.toLocaleString('id-ID')})</span>
                </div>
              </div>

              <!-- TAHAPAN 2: RUBBER ADVANCE PLANTING MATERIAL -->
              <div style="background: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; padding: 8px 10px; box-sizing: border-box;">
                <div style="font-size: 0.65rem; font-weight: 700; color: #1D4ED8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Advance Planting (APM)</div>
                <div style="font-size: 0.95rem; font-weight: 900; color: #1E3A8A; margin-top: 2px; white-space: nowrap;">
                  ${stokAktualAPM.toLocaleString('id-ID')} <span style="font-size: 0.65rem; font-weight: 700;">Pkk</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.60rem; color: #2563EB; margin-top: 3px; padding-top: 3px; border-top: 1px dashed #BFDBFE;">
                  <span>Awal: ${stokAwalAPM.toLocaleString('id-ID')}</span>
                  <span style="color: #DC2626; font-weight: 700;">Afkir: (${afkirAPM.toLocaleString('id-ID')})</span>
                </div>
              </div>

            </div>
          </div>

          <!-- STRIP RINCIAN MUTASI PEMBIBITAN -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 7px 4px; text-align: center; margin-bottom: 12px; box-sizing: border-box;">
            <div style="min-width: 0;">
              <div style="font-size: 0.60rem; color: #6B7280; font-weight: 600;">Jlh Awal Semai</div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #374151; margin-top: 1px; white-space: nowrap;">
                ${isFilteredToAPM ? '-' : `${totalDitanam.toLocaleString('id-ID')} Pkk`}
              </div>
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 0.60rem; color: #6B7280; font-weight: 600;">Diokulasi</div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #116834; margin-top: 1px; white-space: nowrap;">
                ${isFilteredToAPM ? '-' : `${totalDiokulasi.toLocaleString('id-ID')} Pkk`}
              </div>
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 0.60rem; color: #DC2626; font-weight: 600;">Afkir/Reject</div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #DC2626; margin-top: 1px; white-space: nowrap;">(${totalAfkir.toLocaleString('id-ID')}) Pkk</div>
            </div>
          </div>

          <!-- SECTION: RINCIAN KETERSEDIAAN STOK PER BATCH -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: 0.68rem; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.02em;">
                Ketersediaan Stok per Batch
              </div>
              <span style="font-size: 0.65rem; color: #116834; font-weight: 700; background: #E8F5E9; padding: 2px 6px; border-radius: 4px;">
                ${filteredBatches.length} Batch Aktif
              </span>
            </div>

            ${filteredBatches.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${filteredBatches.map(b => {
                  const isBatchAPM = b.stage === 'Rubber Advance Planting Material';
                  return `
                  <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); box-sizing: border-box;">
                    
                    <!-- BARIS 1: NAMA BATCH, BADGE TAHAPAN & BADGE LOKASI (TIDAK AKAN PERNAH TABRAKAN / WRAP) -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 6px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span style="font-weight: 800; font-size: 0.96rem; color: #111827; white-space: nowrap; word-break: keep-all; letter-spacing: -0.01em;">${b.batchNo}</span>
                        <span style="font-size: 0.60rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${isBatchAPM ? '#EFF6FF' : '#FAF5FF'}; color: ${isBatchAPM ? '#1E40AF' : '#6B21A8'}; border: 1px solid ${isBatchAPM ? '#BFDBFE' : '#E9D5FF'}; white-space: nowrap; flex-shrink: 0;">
                          ${isBatchAPM ? 'APM' : 'Main Nursery'}
                        </span>
                      </div>
                      <div style="font-size: 0.65rem; font-weight: 600; color: #4B5563; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 4px; padding: 2px 7px; white-space: nowrap; flex-shrink: 0;">
                        ${b.bedengan && b.bedengan !== '-' ? b.bedengan : 'Bedengan Lapangan'}
                      </div>
                    </div>

                    <!-- BARIS 2: BANNER STOK TERSEDIA (LEBAR PENUH & WRAP-PROOF) -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; padding: 7px 10px; margin-bottom: 8px;">
                      <span style="font-size: 0.65rem; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap;">
                        Stok Tersedia (Hidup)
                      </span>
                      <div style="display: flex; align-items: baseline; gap: 3px; white-space: nowrap; flex-shrink: 0;">
                        <span style="font-size: 1.10rem; font-weight: 900; color: #116834; line-height: 1;">
                          ${b.stokAktual.toLocaleString('id-ID')}
                        </span>
                        <span style="font-size: 0.68rem; font-weight: 700; color: #15803D;">Pkk</span>
                      </div>
                    </div>

                    <!-- BARIS 3: STATUS KESIAPAN BIBIT & POPULASI KLON (KHUSUS RUBBER MAIN NURSERY) -->
                    ${!isBatchAPM ? `
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
                        
                        <!-- SUB 1: BIBIT SUDAH DIOKULASI -->
                        <div style="margin-bottom: ${b.sisaBatangBawahHidup > 0 ? '5px' : '0'};">
                          <div style="font-size: 0.62rem; font-weight: 700; color: #15803D; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.02em;">
                            ✓ Bibit Sudah Diokulasi (${b.stokOkulasiHidup.toLocaleString('id-ID')} Pkk):
                          </div>
                          ${b.klonPopulations.length > 0 ? `
                            <div style="display: flex; flex-direction: column; gap: 2px; padding-left: 2px;">
                              ${b.klonPopulations.map(kp => `
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                                  <span style="color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 6px;">
                                    • Klon <strong style="color: #0F172A;">${kp.klon}</strong> <span style="color: #64748B; font-size: 0.60rem;">(${kp.type})</span>:
                                  </span>
                                  <span style="font-weight: 800; color: #116834; white-space: nowrap; flex-shrink: 0;">
                                    ${kp.jumlah.toLocaleString('id-ID')} Pkk
                                  </span>
                                </div>
                              `).join('')}
                            </div>
                          ` : `
                            <div style="font-size: 0.65rem; color: #94A3B8; font-style: italic; padding-left: 2px;">Belum ada realisasi okulasi hidup</div>
                          `}
                        </div>

                        <!-- SUB 2: BATANG BAWAH / BELUM DIOKULASI (HANYA MUNCUL JIKA ADA SISA HIDUP NON-AFKIR) -->
                        ${b.sisaBatangBawahHidup > 0 ? `
                          <div style="padding-top: 4px; border-top: 1px dashed #CBD5E1; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem;">
                            <span style="color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">• Batang Bawah Belum Diokulasi (${b.rootstockKlon || 'GT1'}):</span>
                            <span style="font-weight: 700; color: #475569; white-space: nowrap; flex-shrink: 0;">${b.sisaBatangBawahHidup.toLocaleString('id-ID')} Pkk</span>
                          </div>
                        ` : ''}

                      </div>
                    ` : `
                      <!-- APM: STATUS KLON BIBIT JADI -->
                      <div style="background: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem;">
                          <span style="color: #1E40AF; font-weight: 600; white-space: nowrap;">Klon APM Siap Tanam:</span>
                          <strong style="color: #1E3A8A; font-size: 0.82rem; white-space: nowrap;">${b.klon}</strong>
                        </div>
                        ${b.sumber ? `
                          <div style="font-size: 0.62rem; color: #60A5FA; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            Sumber / Rekanan: ${b.sumber}
                          </div>
                        ` : ''}
                      </div>
                    `}

                    <!-- BARIS 4: STRIP METRIK MUTASI PER BATCH (WRAP-PROOF & EQUAL HEIGHT) -->
                    ${isBatchAPM ? `
                      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 6px 3px; text-align: center; box-sizing: border-box;">
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 44px; min-width: 0;">
                          <span style="color: #6B7280; font-size: 0.58rem; font-weight: 600; white-space: nowrap; display: block;">Stok Diterima</span>
                          <span style="font-weight: 800; font-size: 0.72rem; color: #0369A1; margin-top: 2px; white-space: nowrap;">${b.stokAwal.toLocaleString('id-ID')} Pkk</span>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 44px; min-width: 0;">
                          <span style="color: #6B7280; font-size: 0.58rem; font-weight: 600; white-space: nowrap; display: block;">Tipe Bibit</span>
                          <span style="font-weight: 800; font-size: 0.72rem; color: #1E40AF; margin-top: 2px; white-space: nowrap;">APM Siap Tanam</span>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 44px; min-width: 0;">
                          <span style="color: #DC2626; font-size: 0.58rem; font-weight: 600; white-space: nowrap; display: block;">Total Afkir</span>
                          <span style="font-weight: 800; font-size: 0.72rem; color: #DC2626; margin-top: 2px; white-space: nowrap;">(${b.afkir.toLocaleString('id-ID')}) Pkk</span>
                        </div>
                      </div>
                    ` : `
                      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 6px 3px; text-align: center; box-sizing: border-box;">
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 44px; min-width: 0;">
                          <span style="color: #6B7280; font-size: 0.58rem; font-weight: 600; white-space: nowrap; display: block;">Jlh Awal Semai</span>
                          <span style="font-weight: 800; font-size: 0.72rem; color: #374151; margin-top: 2px; white-space: nowrap;">${b.stokAwal.toLocaleString('id-ID')} Pkk</span>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 44px; min-width: 0;">
                          <span style="color: #6B7280; font-size: 0.58rem; font-weight: 600; white-space: nowrap; display: block;">Pokok Diokulasi</span>
                          <span style="font-weight: 800; font-size: 0.72rem; color: #116834; margin-top: 2px; white-space: nowrap;">${b.pokokDiokulasiPrimer.toLocaleString('id-ID')} Pkk</span>
                          ${b.pokokDiokulasiJanda > 0 ? `<span style="font-size: 0.54rem; font-weight: 700; color: #92400E; margin-top: 1px; white-space: nowrap;">(+${b.pokokDiokulasiJanda} Janda)</span>` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 44px; min-width: 0;">
                          <span style="color: #DC2626; font-size: 0.58rem; font-weight: 600; white-space: nowrap; display: block;">Total Afkir</span>
                          <span style="font-weight: 800; font-size: 0.72rem; color: #DC2626; margin-top: 2px; white-space: nowrap;">(${b.afkir.toLocaleString('id-ID')}) Pkk</span>
                        </div>
                      </div>
                    `}

                  </div>
                `;}).join('')}
              </div>
            ` : `
              <div style="background: #F9FAFB; border: 1px dashed #D1D5DB; border-radius: 6px; padding: 12px; text-align: center; font-size: 0.72rem; color: #6B7280;">
                Belum ada data batch pada kriteria filter terpilih.
              </div>
            `}
          </div>

        </div>

        <!-- SEARCH INPUT BOX -->
        <div style="margin-bottom: 10px; position: relative;">
          <input id="input-history-search" type="text" placeholder="Cari Dokumen, Batch, Klon, Bedengan..." value="${searchQuery}" style="width: 100%; height: 38px; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 8px; padding: 0 12px 0 34px; font-size: 0.78rem; box-sizing: border-box; outline: none;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#9CA3AF" stroke-width="2" fill="none" style="position: absolute; left: 10px; top: 11px;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <!-- CATEGORY FILTER CHIPS -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 10px; scrollbar-width: none; -webkit-overflow-scrolling: touch;">
          <button type="button" class="btn-history-filter ${activeCategoryFilter === 'ALL' ? 'active' : ''}" data-cat="ALL" style="padding: 5px 11px; border-radius: 16px; font-size: 0.70rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${activeCategoryFilter === 'ALL' ? '#116834' : '#D1D5DB'}; background: ${activeCategoryFilter === 'ALL' ? '#116834' : '#FFFFFF'}; color: ${activeCategoryFilter === 'ALL' ? '#FFFFFF' : '#4B5563'};">
            Semua Tahapan (${allHistoryItems.length})
          </button>
          <button type="button" class="btn-history-filter ${activeCategoryFilter === 'RECEPTION' ? 'active' : ''}" data-cat="RECEPTION" style="padding: 5px 11px; border-radius: 16px; font-size: 0.70rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${activeCategoryFilter === 'RECEPTION' ? '#0369A1' : '#D1D5DB'}; background: ${activeCategoryFilter === 'RECEPTION' ? '#0369A1' : '#FFFFFF'}; color: ${activeCategoryFilter === 'RECEPTION' ? '#FFFFFF' : '#4B5563'};">
            Penerimaan (${receiptTxs.length})
          </button>
          <button type="button" class="btn-history-filter ${activeCategoryFilter === 'SEEDING' ? 'active' : ''}" data-cat="SEEDING" style="padding: 5px 11px; border-radius: 16px; font-size: 0.70rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${activeCategoryFilter === 'SEEDING' ? '#6B21A8' : '#D1D5DB'}; background: ${activeCategoryFilter === 'SEEDING' ? '#6B21A8' : '#FFFFFF'}; color: ${activeCategoryFilter === 'SEEDING' ? '#FFFFFF' : '#4B5563'};">
            Penyemaian (${seedingTxs.length})
          </button>
          <button type="button" class="btn-history-filter ${activeCategoryFilter === 'BUDDING' ? 'active' : ''}" data-cat="BUDDING" style="padding: 5px 11px; border-radius: 16px; font-size: 0.70rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${activeCategoryFilter === 'BUDDING' ? '#116834' : '#D1D5DB'}; background: ${activeCategoryFilter === 'BUDDING' ? '#116834' : '#FFFFFF'}; color: ${activeCategoryFilter === 'BUDDING' ? '#FFFFFF' : '#4B5563'};">
            Okulasi (${buddingTxs.length})
          </button>
          <button type="button" class="btn-history-filter ${activeCategoryFilter === 'INSPECTION' ? 'active' : ''}" data-cat="INSPECTION" style="padding: 5px 11px; border-radius: 16px; font-size: 0.70rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${activeCategoryFilter === 'INSPECTION' ? '#3730A3' : '#D1D5DB'}; background: ${activeCategoryFilter === 'INSPECTION' ? '#3730A3' : '#FFFFFF'}; color: ${activeCategoryFilter === 'INSPECTION' ? '#FFFFFF' : '#4B5563'};">
            Pemeriksaan (${inspectionTxs.length})
          </button>
          <button type="button" class="btn-history-filter ${activeCategoryFilter === 'SELECTION' ? 'active' : ''}" data-cat="SELECTION" style="padding: 5px 11px; border-radius: 16px; font-size: 0.70rem; font-weight: 700; white-space: nowrap; cursor: pointer; border: 1px solid ${activeCategoryFilter === 'SELECTION' ? '#DC2626' : '#D1D5DB'}; background: ${activeCategoryFilter === 'SELECTION' ? '#DC2626' : '#FFFFFF'}; color: ${activeCategoryFilter === 'SELECTION' ? '#FFFFFF' : '#4B5563'};">
            Seleksi / Afkir (${selectionTxs.length})
          </button>
        </div>

        <!-- DAFTAR FEED TRANSAKSI KRONOLOGIS -->
        ${filteredItems.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
            ${filteredItems.map((item, idx) => `
              <div class="card-history-entry" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); box-sizing: border-box;">
                
                <!-- BARIS 1: NO DOKUMEN & BADGE TAHAPAN KIRI <-> TANGGAL TRANSAKSI KANAN -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                  <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; min-width: 0;">
                    <span style="font-weight: 800; font-size: 0.86rem; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${item.docNo}
                    </span>
                    <span style="font-size: 0.62rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: ${item.badgeBg}; color: ${item.badgeColor}; border: 1px solid ${item.badgeBorder}; white-space: nowrap; flex-shrink: 0;">
                      ${item.categoryLabel}
                    </span>
                  </div>
                  <span style="font-size: 0.68rem; color: #6B7280; font-weight: 700; white-space: nowrap; flex-shrink: 0; margin-left: 6px;">
                    ${item.tanggal}
                  </span>
                </div>

                <!-- BARIS 2: BATCH, KLON, TAHAPAN PERTUMBUHAN & LOKASI -->
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #6B7280; margin-bottom: 8px;">
                  <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;">
                    ${item.batchNo !== '-' ? `<span style="font-weight: 700; color: #374151;">${item.batchNo}</span> • ` : ''}
                    <span>Klon: ${item.klon}</span>
                    ${item.bedengan !== '-' ? ` • <span>${item.bedengan}</span>` : ''}
                  </div>
                  <div style="color: #4B5563; white-space: nowrap; flex-shrink: 0; margin-left: 6px;">
                    Mantri: <span style="font-weight: 700; color: #111;">${item.mantri}</span>
                  </div>
                </div>

                <!-- BARIS 3: STRIP METRIK SIMETRIS 3-KOLOM -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 7px 4px; text-align: center; margin-bottom: 8px; box-sizing: border-box;">
                  <div style="min-width: 0;">
                    <div style="font-size: 0.62rem; color: #6B7280; font-weight: 600;">${item.summaryCol1.label}</div>
                    <div style="font-size: 0.78rem; font-weight: 700; color: ${item.summaryCol1.color}; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${item.summaryCol1.val}
                    </div>
                  </div>
                  <div style="min-width: 0;">
                    <div style="font-size: 0.62rem; color: #6B7280; font-weight: 600;">${item.summaryCol2.label}</div>
                    <div style="font-size: 0.78rem; font-weight: ${item.summaryCol2.isBold ? '800' : '700'}; color: ${item.summaryCol2.color}; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.summaryCol2.val}">
                      ${item.summaryCol2.val}
                    </div>
                  </div>
                  <div style="min-width: 0;">
                    <div style="font-size: 0.62rem; color: #6B7280; font-weight: 600;">${item.summaryCol3.label}</div>
                    <div style="font-size: 0.78rem; font-weight: ${item.summaryCol3.isBold ? '800' : '700'}; color: ${item.summaryCol3.color}; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${item.summaryCol3.val}
                    </div>
                  </div>
                </div>

                <!-- TOMBOL TOGGLE EXPAND RINCIAN -->
                <button type="button" class="btn-toggle-expand-history" data-id="${item.id}" style="width: 100%; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; height: 32px; font-size: 0.72rem; font-weight: 700; color: #4B5563; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer;">
                  <span class="label-expand">Lihat Rincian Lengkap</span>
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" class="icon-expand-chevron">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                <!-- DETAIL EXPANDED CONTENT -->
                <div id="detail-${item.id}" class="history-expanded-detail" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-top: 8px; font-size: 0.73rem;">
                  <div style="font-weight: 700; color: #111827; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #E5E7EB;">
                    Rincian Transaksi (${item.docNo})
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${item.details.map(d => `
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <span style="color: #6B7280; flex-shrink: 0;">${d.label}:</span>
                        <span style="font-weight: 600; color: #111827; text-align: right; word-break: break-word;">${d.val}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

              </div>
            `).join('')}
          </div>
        ` : `
          <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 36px 16px; text-align: center; margin-top: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #9CA3AF;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 4px 0;">Tidak Ada Transaksi</h3>
            <p style="font-size: 0.76rem; color: #6B7280; margin: 0;">
              ${searchQuery ? 'Tidak ditemukan data transaksi yang sesuai kata kunci pencarian.' : 'Belum ada data transaksi pada kriteria filter ini.'}
            </p>
          </div>
        `}

      </main>
    </div>
  `;

  // Event Listeners: Back button
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/home');
  });

  // Filter Program dropdown
  const programSelect = app.querySelector('#select-program-filter');
  if (programSelect) {
    programSelect.addEventListener('change', (e) => {
      selectedProgramFilter = e.target.value;
      renderNurseryHistory();
    });
  }

  // Filter Stage dropdown
  const stageSelect = app.querySelector('#select-stage-filter');
  if (stageSelect) {
    stageSelect.addEventListener('change', (e) => {
      selectedStageFilter = e.target.value;
      renderNurseryHistory();
    });
  }

  // Filter category buttons
  app.querySelectorAll('.btn-history-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeCategoryFilter = e.currentTarget.dataset.cat;
      renderNurseryHistory();
    });
  });

  // Search Input box
  const searchInput = app.querySelector('#input-history-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderNurseryHistory();
      const newSearch = document.getElementById('input-history-search');
      if (newSearch) {
        newSearch.focus();
        newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
      }
    });
  }

  // Toggle Expand details
  app.querySelectorAll('.btn-toggle-expand-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const targetDetail = app.querySelector(`#detail-${id}`);
      const labelSpan = e.currentTarget.querySelector('.label-expand');
      const iconChevron = e.currentTarget.querySelector('.icon-expand-chevron');

      if (targetDetail) {
        const isHidden = targetDetail.style.display === 'none' || targetDetail.style.display === '';
        targetDetail.style.display = isHidden ? 'block' : 'none';
        if (labelSpan) {
          labelSpan.textContent = isHidden ? 'Tutup Rincian' : 'Lihat Rincian Lengkap';
        }
        if (iconChevron) {
          iconChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      }
    });
  });
}
