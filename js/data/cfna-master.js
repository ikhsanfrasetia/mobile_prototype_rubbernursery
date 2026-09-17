/**
 * data/cfna-master.js — Master Data Cost Field Nursery Allocation (CFNA) Official Dataset (Phase 9B/TASK-CFNA-REPLACE-02).
 *
 * Prinsip:
 * "SINGLE SOURCE OF TRUTH"
 * "FULL REPLACEMENT WITH 54 OFFICIAL ACTIVE CODES"
 * "IMMUTABLE BUSINESS STRINGS"
 *
 * File ini merupakan Master Data tersendiri untuk kodifikasi alokasi biaya pembibitan (CFNA).
 * Bersifat deklaratif & read-only.
 */

export const CFNA_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  NEEDS_REVIEW: 'NEEDS_REVIEW'
});

export const MAPPING_STATUS = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
});

/**
 * Dataset Master CFNA Resmi Terbaru (54 Record Terverifikasi)
 */
export const CFNA_MASTER = Object.freeze([
  // --- KELOMPOK 1221: Pembibitan Karet (Main Nursery & Bedengan) ---
  {
    id: 'CFNA-122111',
    code: '122111',
    name: 'Kecambah/Klatak',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122121',
    code: '122121',
    name: 'Persiapan bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122122',
    code: '122122',
    name: 'Pemeliharaan bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122123',
    code: '122123',
    name: 'Penanaman biji dibedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122124',
    code: '122124',
    name: 'Penyiraman di bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122141',
    code: '122141',
    name: 'Biaya Polybag',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122151',
    code: '122151',
    name: 'Mencari dan mengumpulkan tanah',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122152',
    code: '122152',
    name: 'Persiapan media dan pengisian polybag',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122153',
    code: '122153',
    name: 'Pembuatan parit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122154',
    code: '122154',
    name: 'Menyusun polybag',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122155',
    code: '122155',
    name: 'Ayak tanah dan campur dengan pupuk RP',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122160',
    code: '122160',
    name: 'Pembebanan Biaya Dari Bedengan Perkecambahan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122161',
    code: '122161',
    name: 'Menanam kecambah di polybag',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122162',
    code: '122162',
    name: 'Tanam Entrys Baru',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122171',
    code: '122171',
    name: 'Penyiraman',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122172',
    code: '122172',
    name: 'Penyisipan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122173',
    code: '122173',
    name: 'Pengendalian gulma',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122174',
    code: '122174',
    name: 'Pemupukan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122175',
    code: '122175',
    name: 'Pengendalian hama penyakit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122176',
    code: '122176',
    name: 'Seleksi bibit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122177',
    code: '122177',
    name: 'Perawatan Entrys Baru',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122181',
    code: '122181',
    name: 'Panen Entrys',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122182',
    code: '122182',
    name: 'Okulasi',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122183',
    code: '122183',
    name: 'Buka Perban dan pemeriksaan okulasi',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122191',
    code: '122191',
    name: 'Topping',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122193',
    code: '122193',
    name: 'Treatment dan pengemasan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-1221A1',
    code: '1221A1',
    name: 'Gaji Mantri Tanaman',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-1221A2',
    code: '1221A2',
    name: 'Gaji jaga malam',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-1221Z1',
    code: '1221Z1',
    name: 'Dipakai kebun sendiri',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-1221Z2',
    code: '1221Z2',
    name: 'Dipakai / dikirim ke kebun sepupu',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-1221Z3',
    code: '1221Z3',
    name: 'Penjualan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-1221Z4',
    code: '1221Z4',
    name: 'Pemindahan Biaya Bibitan ke APM Nursery',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 1223: Pembibitan Karet (High Stump & APM) ---
  {
    id: 'CFNA-122311',
    code: '122311',
    name: 'Pemindahan Biaya Bibitan dari RN - Green Budding',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122312',
    code: '122312',
    name: 'Memancang',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122313',
    code: '122313',
    name: 'Melobang',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122314',
    code: '122314',
    name: 'Menanam',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122315',
    code: '122315',
    name: 'Memupuk',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122316',
    code: '122316',
    name: 'Merawat High Stump',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122317',
    code: '122317',
    name: 'Pengendalian Penyakit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122318',
    code: '122318',
    name: 'Root Pruning',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122319',
    code: '122319',
    name: 'Topping',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-12231A',
    code: '12231A',
    name: 'Bongkar High Stump',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-12231B',
    code: '12231B',
    name: 'Pemindahan Biaya ke High Stump N2 - N4',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122320',
    code: '122320',
    name: 'Pemindahan Biaya dari High Stump N0 - N1',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122321',
    code: '122321',
    name: 'Memupuk',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122322',
    code: '122322',
    name: 'Merawat High Stump',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122323',
    code: '122323',
    name: 'Pengendalian Penyakit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122324',
    code: '122324',
    name: 'Root Pruning',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122325',
    code: '122325',
    name: 'Topping',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122326',
    code: '122326',
    name: 'Bongkar High Stump',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122391',
    code: '122391',
    name: 'Dipakai kebun sendiri',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122392',
    code: '122392',
    name: 'Dipakai / dikirim ke kebun sepupu',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122393',
    code: '122393',
    name: 'Penjualan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122394',
    code: '122394',
    name: 'Pemusnahan Bibit',
    status: CFNA_STATUS.ACTIVE
  }
]);

/**
 * Metadata Pemetaan Aktivitas Bibitan Resmi (Metadata Registry)
 */
export const CFNA_ACTIVITY_MAPPINGS = Object.freeze([
  {
    cfnaCode: '122171',
    cfnaName: 'Penyiraman',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PENYIRAMAN',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '122174',
    cfnaName: 'Pemupukan',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PEMUPUKAN',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '122176',
    cfnaName: 'Seleksi bibit',
    targetActivityModule: 'PENYELEKSIAN',
    targetActivityType: 'SELEKSI_BIBIT',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '122173',
    cfnaName: 'Pengendalian gulma',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PENGENDALIAN_GULMA',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '122175',
    cfnaName: 'Pengendalian hama penyakit',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PENGENDALIAN_HAMA_PENYAKIT',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '122161',
    cfnaName: 'Menanam kecambah di polybag',
    targetActivityModule: 'PENYEMAIAN',
    targetActivityType: 'PENANAMAN_KECAMBAH',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '122111',
    cfnaName: 'Kecambah/Klatak',
    targetActivityModule: 'PENERIMAAN',
    targetActivityType: 'PENERIMAAN_BENIH',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '1221Z1',
    cfnaName: 'Dipakai kebun sendiri',
    targetActivityModule: 'PERMINTAAN',
    targetActivityType: 'PERMINTAAN_KEBUN_SENDIRI',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '1221Z2',
    cfnaName: 'Dipakai / dikirim ke kebun sepupu',
    targetActivityModule: 'PERMINTAAN',
    targetActivityType: 'PERMINTAAN_KEBUN_SEPUPU',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  }
]);

// ==========================================
// GENERIC QUERY HELPERS
// ==========================================

/**
 * Mengambil seluruh data master CFNA.
 * @returns {Array<Object>}
 */
export function getAllCfnaMaster() {
  return [...CFNA_MASTER];
}

/**
 * Mengambil seluruh data master CFNA yang aktif.
 * @returns {Array<Object>}
 */
export function getActiveCfnaMaster() {
  return CFNA_MASTER.filter((c) => c.status === CFNA_STATUS.ACTIVE);
}

/**
 * Mengambil record CFNA berdasarkan kode.
 * @param {string} code
 * @returns {Object|null}
 */
export function getCfnaByCode(code) {
  if (!code) return null;
  const clean = String(code).trim();
  return CFNA_MASTER.find((c) => c.code === clean) || null;
}

/**
 * Mengambil record CFNA berdasarkan nama.
 * @param {string} name
 * @returns {Object|null}
 */
export function getCfnaByName(name) {
  if (!name) return null;
  const clean = String(name).trim().toLowerCase();
  return CFNA_MASTER.find((c) => c.name.toLowerCase() === clean) || null;
}

/**
 * Memvalidasi apakah suatu kode CFNA terdaftar dan valid.
 * @param {string} code
 * @returns {boolean}
 */
export function isCfnaCodeValid(code) {
  return getCfnaByCode(code) !== null;
}

/**
 * Mengambil daftar metadata mapping aktivitas CFNA.
 * @returns {Array<Object>}
 */
export function getCfnaActivityMappings() {
  return [...CFNA_ACTIVITY_MAPPINGS];
}

/**
 * Mengambil mapping aktivitas berdasarkan kode CFNA.
 * @param {string} code
 * @returns {Object|null}
 */
export function getCfnaMappingByCode(code) {
  if (!code) return null;
  const clean = String(code).trim();
  return CFNA_ACTIVITY_MAPPINGS.find((m) => m.cfnaCode === clean) || null;
}
