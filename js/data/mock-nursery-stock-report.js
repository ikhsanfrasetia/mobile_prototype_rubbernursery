/**
 * js/data/mock-nursery-stock-report.js
 * Dedicated Mock Data Provider untuk Halaman Laporan Stok Bibit (Role ASISTEN_BIBITAN)
 * 
 * Sifat:
 * - Read-Only Mock Dataset untuk Prototype / Customer Review
 * - Terisolasi 100% dari storage transaksi operasional & engine mutasi stok
 * - Mendukung multi-estate & multi-divisi untuk verifikasi strict scope filtering
 * 
 * Aturan Rekonsiliasi Pengeluaran SHI terhadap Stok Tersedia (Universal):
 * - Stok Setelah Seleksi = Stok Awal Semai - Total Seleksi (7 Tahap)
 * - Total Pengeluaran Bibit SHI = SUM(seluruh transaksi Pengeluaran Bibit SHI)
 * - Stok Tersedia = Stok Setelah Seleksi - Total Pengeluaran Bibit SHI
 * - Berlaku universal untuk seluruh Growth Stage (Rubber Main Nursery & APM)
 * - Total Pengeluaran Bibit SHI <= Stok Setelah Seleksi (Over-Issue Validation)
 * 
 * Distribusi Dataset (Total 15 Batches):
 * - Tanah Besih (EST-TBS / DIV-001): 8 Batch -> Total Stok Tersedia: 29.254 Bibit
 * - Aek Pamingke (EST-APM / DIV-APM-02): 7 Batch -> Total Stok Tersedia: 10.957 Bibit
 * - Grand Total Stok Tersedia: 40.211 Bibit
 */

export const MOCK_NURSERY_STOCK_BATCHES = Object.freeze([
  // =========================================================================
  // TANAH BESIH (EST-TBS) — DIVISI I (DIV-001) — 8 BATCHES
  // =========================================================================
  {
    batchId: 'MOCK-BTCH-001',
    batchCode: 'Batch - 001',
    batchNo: 'Batch - 001',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Main Nursery',
    asalBibit: 'Pihak Ke-III',
    bedengan: 'Bed - 001',
    rootstockClone: 'GT 1',
    entresClone: 'IRCA 19',
    tanggalSemai: '2026-06-15',
    initialQty: 15000,
    jumlahGrafting: 14800,
    jumlahRegrafting: 500,
    jumlahAfkirSeleksi: 350,
    selectionRecords: [
      {
        docNo: '2026/SEL/001',
        tanggal: '2026-06-16',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 16100,
        percentage: 2,
        qtyAfkir: 322,
        alasanUtama: 'Benih busuk / abnormal'
      },
      {
        docNo: '2026/SEL/002',
        tanggal: '2026-06-30',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 15778,
        percentage: 1.5,
        qtyAfkir: 236,
        alasanUtama: 'Radikula bengkok / patah'
      },
      {
        docNo: '2026/SEL/003',
        tanggal: '2026-07-20',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 15000,
        percentage: 2,
        qtyAfkir: 300,
        alasanUtama: 'Batang kerdil / bengkok'
      },
      {
        docNo: '2026/SEL/004',
        tanggal: '2026-08-20',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 14700,
        percentage: 1.8,
        qtyAfkir: 265,
        alasanUtama: 'Diameter batang di bawah standar'
      },
      {
        docNo: '2026/SEL/005',
        tanggal: '2026-09-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 14435,
        percentage: 2.2,
        qtyAfkir: 318,
        alasanUtama: 'Mata tidur / vigor lemah'
      },
      {
        docNo: '2026/SEL/006',
        tanggal: '2026-09-28',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 14800,
        percentage: 16.4,
        qtyAfkir: 2420,
        alasanUtama: 'Mata entres mati / tidak menempel'
      },
      {
        docNo: '2026/SEL/007',
        tanggal: '2026-10-04',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 600,
        percentage: 6.55,
        qtyAfkir: 39,
        alasanUtama: 'Tunas regrafting gagal tumbuh'
      }
    ],
    stockBeforeShi: 11100,
    availableQty: 11100, // 11.100 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  },
  {
    batchId: 'MOCK-BTCH-002',
    batchCode: 'Batch - 002',
    batchNo: 'Batch - 002',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Main Nursery',
    bedengan: 'Bed - 002',
    rootstockClone: 'GT 1',
    entresClone: 'PB 260',
    tanggalSemai: '2026-07-01',
    initialQty: 12000,
    jumlahGrafting: 11800,
    jumlahRegrafting: 500,
    jumlahAfkirSeleksi: 400,
    selectionRecords: [
      {
        docNo: '2026/SEL/008',
        tanggal: '2026-07-02',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 12800,
        percentage: 2.1,
        qtyAfkir: 269,
        alasanUtama: 'Benih busuk / abnormal'
      },
      {
        docNo: '2026/SEL/009',
        tanggal: '2026-07-15',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 12531,
        percentage: 1.6,
        qtyAfkir: 200,
        alasanUtama: 'Radikula tidak sempurna'
      },
      {
        docNo: '2026/SEL/010',
        tanggal: '2026-08-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 12000,
        percentage: 2,
        qtyAfkir: 240,
        alasanUtama: 'Pertumbuhan tidak seragam'
      },
      {
        docNo: '2026/SEL/011',
        tanggal: '2026-08-30',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 11760,
        percentage: 1.9,
        qtyAfkir: 223,
        alasanUtama: 'Serangan hama daun'
      },
      {
        docNo: '2026/SEL/012',
        tanggal: '2026-09-20',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 11537,
        percentage: 2.5,
        qtyAfkir: 288,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/013',
        tanggal: '2026-09-30',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 11800,
        percentage: 16.5,
        qtyAfkir: 1947,
        alasanUtama: 'Mata entres mengering'
      },
      {
        docNo: '2026/SEL/014',
        tanggal: '2026-10-05',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 500,
        percentage: 5.8,
        qtyAfkir: 29,
        alasanUtama: 'Gagal pertunasan'
      }
    ],
    stockBeforeShi: 8804,
    availableQty: 8804, // 8.804 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  },
  {
    batchId: 'MOCK-BTCH-003',
    batchCode: 'Batch - 003',
    batchNo: 'Batch - 003',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Main Nursery',
    bedengan: 'Bed - 003',
    rootstockClone: 'GT 1',
    entresClone: 'IRCA 109',
    tanggalSemai: '2026-07-20',
    initialQty: 8000,
    jumlahGrafting: 7800,
    jumlahRegrafting: 350,
    jumlahAfkirSeleksi: 250,
    selectionRecords: [
      {
        docNo: '2026/SEL/015',
        tanggal: '2026-07-21',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 8600,
        percentage: 1.8,
        qtyAfkir: 155,
        alasanUtama: 'Benih kerdil / rusak'
      },
      {
        docNo: '2026/SEL/016',
        tanggal: '2026-08-05',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 8445,
        percentage: 1.4,
        qtyAfkir: 118,
        alasanUtama: 'Akar primer patah'
      },
      {
        docNo: '2026/SEL/017',
        tanggal: '2026-08-25',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 8000,
        percentage: 2,
        qtyAfkir: 160,
        alasanUtama: 'Batang kerdil / abnormal'
      },
      {
        docNo: '2026/SEL/018',
        tanggal: '2026-09-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 7840,
        percentage: 1.7,
        qtyAfkir: 133,
        alasanUtama: 'Diameter di bawah standar'
      },
      {
        docNo: '2026/SEL/019',
        tanggal: '2026-09-30',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 7707,
        percentage: 2.1,
        qtyAfkir: 162,
        alasanUtama: 'Bercak daun berat'
      },
      {
        docNo: '2026/SEL/020',
        tanggal: '2026-10-02',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 7800,
        percentage: 17.2,
        qtyAfkir: 1342,
        alasanUtama: 'Mata entres lepas'
      },
      {
        docNo: '2026/SEL/021',
        tanggal: '2026-10-06',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 350,
        percentage: 6,
        qtyAfkir: 21,
        alasanUtama: 'Tunas mati'
      }
    ],
    stockBeforeShi: 5909,
    availableQty: 5909, // 5.909 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  },
  {
    batchId: 'MOCK-BTCH-004',
    batchCode: 'Batch - 004',
    batchNo: 'Batch - 004',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Advance Planting Material',
    bedengan: 'Bed - 004',
    rootstockClone: 'GT 1',
    entresClone: 'IRCA 19',
    tanggalSemai: '2025-08-20',
    initialQty: 5000,
    jumlahGrafting: 4850,
    jumlahRegrafting: 120,
    jumlahAfkirSeleksi: 150,
    selectionRecords: [
      {
        docNo: '2026/SEL/022',
        tanggal: '2025-08-22',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 5400,
        percentage: 3,
        qtyAfkir: 162,
        alasanUtama: 'Benih rusak'
      },
      {
        docNo: '2026/SEL/023',
        tanggal: '2025-09-05',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 5238,
        percentage: 2.5,
        qtyAfkir: 131,
        alasanUtama: 'Akar abnormal'
      },
      {
        docNo: '2026/SEL/024',
        tanggal: '2025-09-20',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 5000,
        percentage: 4,
        qtyAfkir: 200,
        alasanUtama: 'Bibit kerdil'
      },
      {
        docNo: '2026/SEL/025',
        tanggal: '2025-11-20',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 4800,
        percentage: 4,
        qtyAfkir: 192,
        alasanUtama: 'Diameter batang kecil'
      },
      {
        docNo: '2026/SEL/026',
        tanggal: '2026-01-20',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 4608,
        percentage: 4.5,
        qtyAfkir: 207,
        alasanUtama: 'Bercak daun berat'
      },
      {
        docNo: '2026/SEL/027',
        tanggal: '2026-03-20',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 4850,
        percentage: 68,
        qtyAfkir: 3298,
        alasanUtama: 'Tunas okulasi mati / rebah'
      },
      {
        docNo: '2026/SEL/028',
        tanggal: '2026-04-10',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 120,
        percentage: 8.3,
        qtyAfkir: 10,
        alasanUtama: 'Tunas regrafting kering'
      }
    ],
    stockBeforeShi: 800,
    availableQty: 300, // 800 - 500 SHI
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/003',
        tanggal: '2026-10-02',
        divisi: 'Divisi I',
        block: 'Block 003/24',
        qty: 500
      }
    ]
  },
  {
    batchId: 'MOCK-BTCH-005',
    batchCode: 'Batch - 005',
    batchNo: 'Batch - 005',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Main Nursery',
    bedengan: 'Bed - 005',
    rootstockClone: 'GT 1',
    entresClone: 'RRIC 100',
    tanggalSemai: '2026-08-05',
    initialQty: 3000,
    jumlahGrafting: 2880,
    jumlahRegrafting: 100,
    jumlahAfkirSeleksi: 120,
    selectionRecords: [
      {
        docNo: '2026/SEL/029',
        tanggal: '2026-08-06',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 3250,
        percentage: 2.2,
        qtyAfkir: 72,
        alasanUtama: 'Benih berjamur'
      },
      {
        docNo: '2026/SEL/030',
        tanggal: '2026-08-20',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 3178,
        percentage: 1.7,
        qtyAfkir: 54,
        alasanUtama: 'Radikula abnormal'
      },
      {
        docNo: '2026/SEL/031',
        tanggal: '2026-09-05',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 3000,
        percentage: 2,
        qtyAfkir: 60,
        alasanUtama: 'Batang kerdil / albino'
      },
      {
        docNo: '2026/SEL/032',
        tanggal: '2026-09-20',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 2940,
        percentage: 1.9,
        qtyAfkir: 56,
        alasanUtama: 'Diameter tidak cukup'
      },
      {
        docNo: '2026/SEL/033',
        tanggal: '2026-09-30',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 2884,
        percentage: 2.4,
        qtyAfkir: 69,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/034',
        tanggal: '2026-10-02',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 2880,
        percentage: 16,
        qtyAfkir: 461,
        alasanUtama: 'Mata entres mati'
      },
      {
        docNo: '2026/SEL/035',
        tanggal: '2026-10-05',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 100,
        percentage: 7,
        qtyAfkir: 7,
        alasanUtama: 'Gagal bertunas'
      }
    ],
    stockBeforeShi: 2221,
    availableQty: 2221, // 2.221 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  },
  {
    batchId: 'MOCK-BTCH-006',
    batchCode: 'Batch - 006',
    batchNo: 'Batch - 006',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Advance Planting Material',
    asalBibit: 'Pihak Ke-III',
    bedengan: 'Bed - 006',
    rootstockClone: 'GT 1',
    entresClone: 'IRR 112',
    tanggalSemai: '2025-06-10',
    initialQty: 2000,
    jumlahGrafting: 1900,
    jumlahRegrafting: 0,
    jumlahAfkirSeleksi: 100,
    selectionRecords: [
      {
        docNo: '2026/SEL/036',
        tanggal: '2025-06-12',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 2160,
        percentage: 3,
        qtyAfkir: 65,
        alasanUtama: 'Benih cacat'
      },
      {
        docNo: '2026/SEL/037',
        tanggal: '2025-06-25',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 2095,
        percentage: 2.5,
        qtyAfkir: 52,
        alasanUtama: 'Akar membusuk'
      },
      {
        docNo: '2026/SEL/038',
        tanggal: '2025-07-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 2000,
        percentage: 4,
        qtyAfkir: 80,
        alasanUtama: 'Kerdil'
      },
      {
        docNo: '2026/SEL/039',
        tanggal: '2025-09-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 1920,
        percentage: 4,
        qtyAfkir: 77,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/040',
        tanggal: '2025-11-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 1843,
        percentage: 4.5,
        qtyAfkir: 83,
        alasanUtama: 'Diameter tidak cukup'
      },
      {
        docNo: '2026/SEL/041',
        tanggal: '2026-01-10',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 1900,
        percentage: 72.8,
        qtyAfkir: 1383,
        alasanUtama: 'Okulasi tidak bertunas'
      }
    ],
    stockBeforeShi: 260,
    availableQty: 0, // 260 - 260 SHI
    status: 'EMPTY',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/010',
        tanggal: '2026-09-18',
        divisi: 'Divisi I',
        block: 'Block 006/25',
        qty: 260
      }
    ]
  },
  {
    batchId: 'MOCK-BTCH-012',
    batchCode: 'Batch - 012',
    batchNo: 'Batch - 012',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Advance Planting Material',
    bedengan: 'Bed - 007',
    rootstockClone: 'GT 1',
    entresClone: 'RRIM 600',
    tanggalSemai: '2025-07-10',
    initialQty: 6000,
    jumlahGrafting: 5800,
    jumlahRegrafting: 150,
    jumlahAfkirSeleksi: 200,
    selectionRecords: [
      {
        docNo: '2026/SEL/042',
        tanggal: '2025-07-12',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 6480,
        percentage: 3,
        qtyAfkir: 194,
        alasanUtama: 'Benih berjamur'
      },
      {
        docNo: '2026/SEL/043',
        tanggal: '2025-07-26',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 6286,
        percentage: 2.5,
        qtyAfkir: 157,
        alasanUtama: 'Akar bengkok'
      },
      {
        docNo: '2026/SEL/044',
        tanggal: '2025-08-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 6000,
        percentage: 4,
        qtyAfkir: 240,
        alasanUtama: 'Bibit kerdil'
      },
      {
        docNo: '2026/SEL/045',
        tanggal: '2025-10-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 5760,
        percentage: 4,
        qtyAfkir: 230,
        alasanUtama: 'Batang ganda / cacat'
      },
      {
        docNo: '2026/SEL/046',
        tanggal: '2025-12-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 5530,
        percentage: 4.5,
        qtyAfkir: 249,
        alasanUtama: 'Serangan jamur akar'
      },
      {
        docNo: '2026/SEL/047',
        tanggal: '2026-02-10',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 5800,
        percentage: 70.3,
        qtyAfkir: 4078,
        alasanUtama: 'Mata entres mengering'
      },
      {
        docNo: '2026/SEL/048',
        tanggal: '2026-03-01',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 150,
        percentage: 8,
        qtyAfkir: 12,
        alasanUtama: 'Gagal pertunasan regrafting'
      }
    ],
    stockBeforeShi: 840,
    availableQty: 240, // 840 - 600 SHI
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/008',
        tanggal: '2026-10-04',
        divisi: 'Divisi I',
        block: 'Block 005/24',
        qty: 600
      }
    ]
  },
  {
    batchId: 'MOCK-BTCH-013',
    batchCode: 'Batch - 013',
    batchNo: 'Batch - 013',
    programId: 'PRG-TBS-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    growthStage: 'Rubber Advance Planting Material',
    bedengan: 'Bed - 008',
    rootstockClone: 'GT 1',
    entresClone: 'IRR 118',
    tanggalSemai: '2025-09-01',
    initialQty: 4000,
    jumlahGrafting: 3900,
    jumlahRegrafting: 100,
    jumlahAfkirSeleksi: 100,
    selectionRecords: [
      {
        docNo: '2026/SEL/049',
        tanggal: '2025-09-03',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 4320,
        percentage: 3,
        qtyAfkir: 130,
        alasanUtama: 'Benih kerdil'
      },
      {
        docNo: '2026/SEL/050',
        tanggal: '2025-09-17',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 4190,
        percentage: 2.5,
        qtyAfkir: 105,
        alasanUtama: 'Radikula patah'
      },
      {
        docNo: '2026/SEL/051',
        tanggal: '2025-10-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 4000,
        percentage: 4,
        qtyAfkir: 160,
        alasanUtama: 'Bibit kerdil'
      },
      {
        docNo: '2026/SEL/052',
        tanggal: '2025-12-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 3840,
        percentage: 4,
        qtyAfkir: 154,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/053',
        tanggal: '2026-02-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 3686,
        percentage: 4.5,
        qtyAfkir: 166,
        alasanUtama: 'Diameter batang kecil'
      },
      {
        docNo: '2026/SEL/054',
        tanggal: '2026-04-01',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 3900,
        percentage: 66.6,
        qtyAfkir: 2597,
        alasanUtama: 'Tunas palsu / gagal'
      },
      {
        docNo: '2026/SEL/055',
        tanggal: '2026-04-20',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 100,
        percentage: 8,
        qtyAfkir: 8,
        alasanUtama: 'Tunas mati angin'
      }
    ],
    stockBeforeShi: 680,
    availableQty: 680, // 680 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  },
  // =========================================================================
  // AEK PAMINGKE (EST-APM) — DIVISI II (DIV-APM-02) — 7 BATCHES
  // =========================================================================
  {
    batchId: 'MOCK-BTCH-007',
    batchCode: 'Batch - 007',
    batchNo: 'Batch - 007',
    programId: 'PRG-APM-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    growthStage: 'Rubber Advance Planting Material',
    bedengan: 'Bed - 001',
    rootstockClone: 'GT 1',
    entresClone: 'PB 260',
    tanggalSemai: '2025-09-15',
    initialQty: 18000,
    jumlahGrafting: 17500,
    jumlahRegrafting: 450,
    jumlahAfkirSeleksi: 500,
    selectionRecords: [
      {
        docNo: '2026/SEL/056',
        tanggal: '2025-09-17',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 19440,
        percentage: 3,
        qtyAfkir: 583,
        alasanUtama: 'Benih busuk'
      },
      {
        docNo: '2026/SEL/057',
        tanggal: '2025-10-01',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 18857,
        percentage: 2.5,
        qtyAfkir: 471,
        alasanUtama: 'Radikula bengkok'
      },
      {
        docNo: '2026/SEL/058',
        tanggal: '2025-10-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 18000,
        percentage: 4,
        qtyAfkir: 720,
        alasanUtama: 'Bibit kerdil'
      },
      {
        docNo: '2026/SEL/059',
        tanggal: '2025-12-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 17280,
        percentage: 4,
        qtyAfkir: 691,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/060',
        tanggal: '2026-02-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 16589,
        percentage: 4.5,
        qtyAfkir: 747,
        alasanUtama: 'Diameter tidak seragam'
      },
      {
        docNo: '2026/SEL/061',
        tanggal: '2026-04-15',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 17500,
        percentage: 66.8,
        qtyAfkir: 11692,
        alasanUtama: 'Mata entres gugur'
      },
      {
        docNo: '2026/SEL/062',
        tanggal: '2026-05-01',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 450,
        percentage: 8,
        qtyAfkir: 36,
        alasanUtama: 'Gagal tumbuh tunas'
      }
    ],
    stockBeforeShi: 3060,
    availableQty: 560, // 3.060 - 2.500 SHI
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/005',
        tanggal: '2026-09-20',
        divisi: 'Divisi II',
        block: 'Block 001/99',
        qty: 2500
      }
    ]
  },
  {
    batchId: 'MOCK-BTCH-008',
    batchCode: 'Batch - 008',
    batchNo: 'Batch - 008',
    programId: 'PRG-APM-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    growthStage: 'Rubber Advance Planting Material',
    bedengan: 'Bed - 002',
    rootstockClone: 'GT 1',
    entresClone: 'IRCA 18',
    tanggalSemai: '2025-10-01',
    initialQty: 10000,
    jumlahGrafting: 9700,
    jumlahRegrafting: 250,
    jumlahAfkirSeleksi: 300,
    selectionRecords: [
      {
        docNo: '2026/SEL/063',
        tanggal: '2025-10-03',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 10800,
        percentage: 3,
        qtyAfkir: 324,
        alasanUtama: 'Benih busuk'
      },
      {
        docNo: '2026/SEL/064',
        tanggal: '2025-10-17',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 10476,
        percentage: 2.5,
        qtyAfkir: 262,
        alasanUtama: 'Radikula patah'
      },
      {
        docNo: '2026/SEL/065',
        tanggal: '2025-11-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 10000,
        percentage: 4,
        qtyAfkir: 400,
        alasanUtama: 'Bibit kerdil'
      },
      {
        docNo: '2026/SEL/066',
        tanggal: '2026-01-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 9600,
        percentage: 4,
        qtyAfkir: 384,
        alasanUtama: 'Batang bercabang / abnormal'
      },
      {
        docNo: '2026/SEL/067',
        tanggal: '2026-03-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 9216,
        percentage: 4.5,
        qtyAfkir: 415,
        alasanUtama: 'Diameter di bawah standar'
      },
      {
        docNo: '2026/SEL/068',
        tanggal: '2026-05-01',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 9700,
        percentage: 65.9,
        qtyAfkir: 6395,
        alasanUtama: 'Okulasi mati angin'
      },
      {
        docNo: '2026/SEL/069',
        tanggal: '2026-05-20',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 250,
        percentage: 8,
        qtyAfkir: 20,
        alasanUtama: 'Tunas regrafting kering'
      }
    ],
    stockBeforeShi: 1800,
    availableQty: 600, // 1.800 - 1.200 SHI
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/006',
        tanggal: '2026-09-26',
        divisi: 'Divisi II',
        block: 'Block 002/24',
        qty: 1200
      }
    ]
  },
  {
    batchId: 'MOCK-BTCH-009',
    batchCode: 'Batch - 009',
    batchNo: 'Batch - 009',
    programId: 'PRG-APM-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    growthStage: 'Rubber Main Nursery',
    bedengan: 'Bed - 003',
    rootstockClone: 'GT 1',
    entresClone: 'IRCA 19',
    tanggalSemai: '2026-07-15',
    initialQty: 7500,
    jumlahGrafting: 7300,
    jumlahRegrafting: 250,
    jumlahAfkirSeleksi: 220,
    selectionRecords: [
      {
        docNo: '2026/SEL/070',
        tanggal: '2026-07-17',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 8050,
        percentage: 2,
        qtyAfkir: 161,
        alasanUtama: 'Benih kerdil'
      },
      {
        docNo: '2026/SEL/071',
        tanggal: '2026-08-01',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 7889,
        percentage: 1.5,
        qtyAfkir: 118,
        alasanUtama: 'Radikula membusuk'
      },
      {
        docNo: '2026/SEL/072',
        tanggal: '2026-08-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 7500,
        percentage: 2,
        qtyAfkir: 150,
        alasanUtama: 'Batang kerdil / bengkok'
      },
      {
        docNo: '2026/SEL/073',
        tanggal: '2026-09-05',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 7350,
        percentage: 1.8,
        qtyAfkir: 132,
        alasanUtama: 'Diameter tidak cukup'
      },
      {
        docNo: '2026/SEL/074',
        tanggal: '2026-09-25',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 7218,
        percentage: 2.1,
        qtyAfkir: 152,
        alasanUtama: 'Bercak daun'
      },
      {
        docNo: '2026/SEL/075',
        tanggal: '2026-10-01',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 7300,
        percentage: 16.2,
        qtyAfkir: 1183,
        alasanUtama: 'Mata entres mengering'
      },
      {
        docNo: '2026/SEL/076',
        tanggal: '2026-10-05',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 250,
        percentage: 6.4,
        qtyAfkir: 16,
        alasanUtama: 'Tunas gagal tumbuh'
      }
    ],
    stockBeforeShi: 5588,
    availableQty: 5588, // 5.588 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  },
  {
    batchId: 'MOCK-BTCH-010',
    batchCode: 'Batch - 010',
    batchNo: 'Batch - 010',
    programId: 'PRG-APM-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    growthStage: 'Rubber Main Nursery',
    bedengan: 'Bed - 004',
    rootstockClone: 'GT 1',
    entresClone: 'PB 217',
    tanggalSemai: '2026-08-01',
    initialQty: 4000,
    jumlahGrafting: 3820,
    jumlahRegrafting: 150,
    jumlahAfkirSeleksi: 180,
    selectionRecords: [
      {
        docNo: '2026/SEL/077',
        tanggal: '2026-08-03',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 4320,
        percentage: 2.1,
        qtyAfkir: 91,
        alasanUtama: 'Benih abnormal'
      },
      {
        docNo: '2026/SEL/078',
        tanggal: '2026-08-16',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 4229,
        percentage: 1.6,
        qtyAfkir: 68,
        alasanUtama: 'Radikula bercabang'
      },
      {
        docNo: '2026/SEL/079',
        tanggal: '2026-09-01',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 4000,
        percentage: 2,
        qtyAfkir: 80,
        alasanUtama: 'Bibit kerdil / abnormal'
      },
      {
        docNo: '2026/SEL/080',
        tanggal: '2026-09-18',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 3920,
        percentage: 1.9,
        qtyAfkir: 74,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/081',
        tanggal: '2026-09-29',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 3846,
        percentage: 2.4,
        qtyAfkir: 92,
        alasanUtama: 'Diameter tidak cukup'
      },
      {
        docNo: '2026/SEL/082',
        tanggal: '2026-10-02',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 3820,
        percentage: 15.5,
        qtyAfkir: 592,
        alasanUtama: 'Mata entres membusuk'
      },
      {
        docNo: '2026/SEL/083',
        tanggal: '2026-10-05',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 150,
        percentage: 6,
        qtyAfkir: 9,
        alasanUtama: 'Tunas gagal tumbuh'
      }
    ],
    stockBeforeShi: 2994,
    availableQty: 2994, // 2.994 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  },
  {
    batchId: 'MOCK-BTCH-011',
    batchCode: 'Batch - 011',
    batchNo: 'Batch - 011',
    programId: 'PRG-APM-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    growthStage: 'Rubber Advance Planting Material',
    asalBibit: 'Pihak Ke-III',
    bedengan: 'Bed - 005',
    rootstockClone: 'GT 1',
    entresClone: 'BPM 24',
    tanggalSemai: '2025-05-15',
    initialQty: 1500,
    jumlahGrafting: 1450,
    jumlahRegrafting: 0,
    jumlahAfkirSeleksi: 50,
    selectionRecords: [
      {
        docNo: '2026/SEL/084',
        tanggal: '2025-05-17',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 1620,
        percentage: 3,
        qtyAfkir: 49,
        alasanUtama: 'Benih berjamur'
      },
      {
        docNo: '2026/SEL/085',
        tanggal: '2025-05-30',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 1571,
        percentage: 2.5,
        qtyAfkir: 39,
        alasanUtama: 'Radikula membusuk'
      },
      {
        docNo: '2026/SEL/086',
        tanggal: '2025-06-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 1500,
        percentage: 4,
        qtyAfkir: 60,
        alasanUtama: 'Kerdil'
      },
      {
        docNo: '2026/SEL/087',
        tanggal: '2025-08-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 1440,
        percentage: 4,
        qtyAfkir: 58,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/088',
        tanggal: '2025-10-15',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 1382,
        percentage: 4.5,
        qtyAfkir: 62,
        alasanUtama: 'Diameter tidak seragam'
      },
      {
        docNo: '2026/SEL/089',
        tanggal: '2025-12-15',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 1450,
        percentage: 72.6,
        qtyAfkir: 1052,
        alasanUtama: 'Tunas okulasi mati'
      }
    ],
    stockBeforeShi: 180,
    availableQty: 0, // 180 - 180 SHI
    status: 'EMPTY',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/011',
        tanggal: '2026-09-15',
        divisi: 'Divisi II',
        block: 'Block 005/25',
        qty: 180
      }
    ]
  },
  {
    batchId: 'MOCK-BTCH-014',
    batchCode: 'Batch - 014',
    batchNo: 'Batch - 014',
    programId: 'PRG-APM-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    growthStage: 'Rubber Advance Planting Material',
    bedengan: 'Bed - 006',
    rootstockClone: 'GT 1',
    entresClone: 'PR 107',
    tanggalSemai: '2025-06-25',
    initialQty: 8500,
    jumlahGrafting: 8200,
    jumlahRegrafting: 200,
    jumlahAfkirSeleksi: 300,
    selectionRecords: [
      {
        docNo: '2026/SEL/090',
        tanggal: '2025-06-27',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 9180,
        percentage: 3,
        qtyAfkir: 275,
        alasanUtama: 'Benih berjamur'
      },
      {
        docNo: '2026/SEL/091',
        tanggal: '2025-07-10',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 8905,
        percentage: 2.5,
        qtyAfkir: 223,
        alasanUtama: 'Akar primer bengkok'
      },
      {
        docNo: '2026/SEL/092',
        tanggal: '2025-07-25',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 8500,
        percentage: 4,
        qtyAfkir: 340,
        alasanUtama: 'Bibit kerdil'
      },
      {
        docNo: '2026/SEL/093',
        tanggal: '2025-09-25',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 8160,
        percentage: 4,
        qtyAfkir: 326,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/094',
        tanggal: '2025-11-25',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 7834,
        percentage: 4.5,
        qtyAfkir: 353,
        alasanUtama: 'Diameter tidak cukup'
      },
      {
        docNo: '2026/SEL/095',
        tanggal: '2026-01-25',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 8200,
        percentage: 70.5,
        qtyAfkir: 5777,
        alasanUtama: 'Mata okulasi mengering'
      },
      {
        docNo: '2026/SEL/096',
        tanggal: '2026-02-15',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 200,
        percentage: 8,
        qtyAfkir: 16,
        alasanUtama: 'Tunas regrafting mati'
      }
    ],
    stockBeforeShi: 1190,
    availableQty: 390, // 1.190 - 800 SHI
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/009',
        tanggal: '2026-10-05',
        divisi: 'Divisi II',
        block: 'Block 004/25',
        qty: 800
      }
    ]
  },
  {
    batchId: 'MOCK-BTCH-015',
    batchCode: 'Batch - 015',
    batchNo: 'Batch - 015',
    programId: 'PRG-APM-2026-001',
    programName: 'Program Nursery 2026',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    growthStage: 'Rubber Advance Planting Material',
    bedengan: 'Bed - 007',
    rootstockClone: 'GT 1',
    entresClone: 'PB 235',
    tanggalSemai: '2025-08-10',
    initialQty: 5500,
    jumlahGrafting: 5350,
    jumlahRegrafting: 150,
    jumlahAfkirSeleksi: 150,
    selectionRecords: [
      {
        docNo: '2026/SEL/097',
        tanggal: '2025-08-12',
        category: 'PRA_SEMAI',
        stage: 'SELEKSI_PRA_SEMAI',
        stageLabel: 'Seleksi Pra-Semai (Deder)',
        baseQty: 5940,
        percentage: 3,
        qtyAfkir: 178,
        alasanUtama: 'Benih kerdil'
      },
      {
        docNo: '2026/SEL/098',
        tanggal: '2025-08-25',
        category: 'DITOLAK_PINDAH_SEMAI',
        stage: 'SELEKSI_DITOLAK_PINDAH_SEMAI',
        stageLabel: 'Seleksi Ditolak Pindah Semai',
        baseQty: 5762,
        percentage: 2.5,
        qtyAfkir: 144,
        alasanUtama: 'Akar primer patah'
      },
      {
        docNo: '2026/SEL/099',
        tanggal: '2025-09-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_I',
        stageLabel: 'Seleksi I – Pra-Okulasi',
        baseQty: 5500,
        percentage: 4,
        qtyAfkir: 220,
        alasanUtama: 'Bibit kerdil'
      },
      {
        docNo: '2026/SEL/100',
        tanggal: '2025-11-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_II',
        stageLabel: 'Seleksi II – Pra-Okulasi',
        baseQty: 5280,
        percentage: 4,
        qtyAfkir: 211,
        alasanUtama: 'Batang bengkok'
      },
      {
        docNo: '2026/SEL/101',
        tanggal: '2026-01-10',
        category: 'PRA_OKULASI',
        stage: 'SELEKSI_PRA_OKULASI_III',
        stageLabel: 'Seleksi III – Pra-Okulasi',
        baseQty: 5069,
        percentage: 4.5,
        qtyAfkir: 228,
        alasanUtama: 'Diameter di bawah standar'
      },
      {
        docNo: '2026/SEL/102',
        tanggal: '2026-03-10',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_GRAFTING',
        stageLabel: 'Seleksi Grafting',
        baseQty: 5350,
        percentage: 68.8,
        qtyAfkir: 3682,
        alasanUtama: 'Okulasi tidak bertunas'
      },
      {
        docNo: '2026/SEL/103',
        tanggal: '2026-04-01',
        category: 'PASCA_OKULASI',
        stage: 'SELEKSI_REGRAFTING',
        stageLabel: 'Seleksi Regrafting',
        baseQty: 150,
        percentage: 8,
        qtyAfkir: 12,
        alasanUtama: 'Tunas regrafting mati'
      }
    ],
    stockBeforeShi: 825,
    availableQty: 825, // 825 - 0 SHI
    status: 'AVAILABLE',
    pengeluaranShi: []
  }
]);

/**
 * Helper: Mengambil data mock batch yang telah difilter berdasarkan User Context Scope (Estate & Division).
 * @param {Object} userContext
 * @returns {Array<Object>}
 */
export function getMockBatchesForUser(userContext) {
  if (!userContext || !userContext.estateId || !userContext.divisionId) {
    return [];
  }
  const cleanEstate = String(userContext.estateId).trim().toUpperCase();
  const cleanDivision = String(userContext.divisionId).trim().toUpperCase();

  return MOCK_NURSERY_STOCK_BATCHES.filter(batch => {
    return String(batch.estateId).trim().toUpperCase() === cleanEstate &&
           String(batch.divisionId).trim().toUpperCase() === cleanDivision;
  });
}
