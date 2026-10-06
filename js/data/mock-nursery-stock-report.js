/**
 * js/data/mock-nursery-stock-report.js
 * Dedicated Mock Data Provider untuk Halaman Laporan Stok Bibit (Role ASISTEN_BIBITAN)
 * 
 * Sifat:
 * - Read-Only Mock Dataset untuk Prototype / Customer Review
 * - Terisolasi 100% dari storage transaksi operasional & engine mutasi stok
 * - Mendukung multi-estate & multi-divisi untuk verifikasi strict scope filtering
 * 
 * Aturan Rekonsiliasi Pengeluaran SHI terhadap Stok Tersedia:
 * 1. SHI mengurangi stok HANYA jika:
 *    - growthStage === "Rubber Advance Planting Material" (APM), ATAU
 *    - umur bibit > 30 minggu.
 * 2. Jika bukan APM dan umur <= 30 minggu (Main Nursery muda):
 *    - SHI tetap tampil sebagai riwayat/informasi histori, tetapi TIDAK memotong availableQty.
 * 
 * Distribusi Dataset (Total 15 Batches):
 * - Tanah Besih (EST-TBS / DIV-001): 8 Batch -> Total Stok Tersedia: 49.430 Bibit
 * - Aek Pamingke (EST-APM / DIV-APM-02): 7 Batch -> Total Stok Tersedia: 46.650 Bibit
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
    bedengan: 'Bed - 001',
    rootstockClone: 'GT 1',
    entresClone: 'IRCA 19',
    tanggalSemai: '2026-06-15',
    initialQty: 15000,
    jumlahGrafting: 14800,
    jumlahRegrafting: 600,
    jumlahAfkirSeleksi: 350,
    stockBeforeShi: 14650,
    availableQty: 14650, // Main Nursery <= 30 minggu: SHI tidak memotong stok
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/001',
        tanggal: '2026-09-25',
        divisi: 'Divisi I',
        block: 'Block 001/99',
        qty: 2000
      }
    ]
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
    stockBeforeShi: 11600,
    availableQty: 11600, // Main Nursery <= 30 minggu: SHI tidak memotong stok
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/002',
        tanggal: '2026-09-28',
        divisi: 'Divisi I',
        block: 'Block 002/99',
        qty: 1500
      }
    ]
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
    stockBeforeShi: 7750,
    availableQty: 7750,
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
    stockBeforeShi: 4850,
    availableQty: 3850, // APM: Rekonsiliasi (4.850 - 1.000)
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/003',
        tanggal: '2026-10-02',
        divisi: 'Divisi I',
        block: 'Block 003/24',
        qty: 1000
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
    stockBeforeShi: 2880,
    availableQty: 2880, // Main Nursery <= 30 minggu: SHI tidak memotong stok
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/004',
        tanggal: '2026-10-04',
        divisi: 'Divisi I',
        block: 'Block 004/25',
        qty: 2880
      }
    ]
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
    bedengan: 'Bed - 006',
    rootstockClone: 'GT 1',
    entresClone: 'IRR 112',
    tanggalSemai: '2025-06-10',
    initialQty: 2000,
    jumlahGrafting: 1900,
    jumlahRegrafting: 0,
    jumlahAfkirSeleksi: 100,
    stockBeforeShi: 1900,
    availableQty: 0, // APM: Rekonsiliasi (1.900 - 1.900)
    status: 'EMPTY',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/010',
        tanggal: '2026-09-18',
        divisi: 'Divisi I',
        block: 'Block 006/25',
        qty: 1900
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
    stockBeforeShi: 5800,
    availableQty: 4800, // APM: Rekonsiliasi (5.800 - 1.000)
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/008',
        tanggal: '2026-10-04',
        divisi: 'Divisi I',
        block: 'Block 005/24',
        qty: 1000
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
    stockBeforeShi: 3900,
    availableQty: 3900,
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
    stockBeforeShi: 17500,
    availableQty: 15000, // APM: Rekonsiliasi (17.500 - 2.500)
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
    stockBeforeShi: 9700,
    availableQty: 8500, // APM: Rekonsiliasi (9.700 - 1.200)
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
    stockBeforeShi: 7280,
    availableQty: 7280, // Main Nursery <= 30 minggu: SHI tidak memotong stok
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
    stockBeforeShi: 3820,
    availableQty: 3820, // Main Nursery <= 30 minggu: SHI tidak memotong stok
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/007',
        tanggal: '2026-10-03',
        divisi: 'Divisi II',
        block: 'Block 003/25',
        qty: 3820
      }
    ]
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
    bedengan: 'Bed - 005',
    rootstockClone: 'GT 1',
    entresClone: 'BPM 24',
    tanggalSemai: '2025-05-15',
    initialQty: 1500,
    jumlahGrafting: 1450,
    jumlahRegrafting: 0,
    jumlahAfkirSeleksi: 50,
    stockBeforeShi: 1450,
    availableQty: 0, // APM: Rekonsiliasi (1.450 - 1.450)
    status: 'EMPTY',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/011',
        tanggal: '2026-09-15',
        divisi: 'Divisi II',
        block: 'Block 005/25',
        qty: 1450
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
    stockBeforeShi: 8200,
    availableQty: 6700, // APM: Rekonsiliasi (8.200 - 1.500)
    status: 'AVAILABLE',
    pengeluaranShi: [
      {
        docNo: '2026/NIR/009',
        tanggal: '2026-10-05',
        divisi: 'Divisi II',
        block: 'Block 004/25',
        qty: 1500
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
    stockBeforeShi: 5350,
    availableQty: 5350,
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
