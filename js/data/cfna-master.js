/**
 * data/cfna-master.js — Master Data Cost Field Nursery Allocation (CFNA) Foundation (Phase 9B).
 *
 * Prinsip:
 * "SAFETY FIRST."
 * "MASTER DATA FIRST, TRANSACTION LATER."
 * "ADD, DO NOT BREAK."
 *
 * File ini merupakan Master Data tersendiri untuk kodifikasi alokasi biaya pembibitan (CFNA).
 * Bersifat deklaratif & read-only. BELUM diintegrasikan ke transaksi pemeliharaan pada fase ini.
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
 * Dataset Master CFNA (46 Record Terverifikasi)
 */
export const CFNA_MASTER = Object.freeze([
  // --- KELOMPOK 964: Pemeliharaan Main Nursery ---
  {
    id: 'CFNA-964009',
    code: '964009',
    name: 'Penyiraman (Manual)',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964008',
    code: '964008',
    name: 'Seleksi Bibit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964007',
    code: '964007',
    name: 'Pengendalian Hama Penyakit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964006',
    code: '964006',
    name: 'Pemupukan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964005',
    code: '964005',
    name: 'Pengendalian Gulma (Manual)',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964004',
    code: '964004',
    name: 'Pengendalian Gulma (Kimia)',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964003',
    code: '964003',
    name: 'Pemeliharaan Sprinkler/Pipa',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964002',
    code: '964002',
    name: 'Pemeliharaan Mesin Sprinkler',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-964001',
    code: '964001',
    name: 'Operator Mesin Sprinkler',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 955: Pemeliharaan Pre-Nursery / Babybag ---
  {
    id: 'CFNA-955005',
    code: '955005',
    name: 'Seleksi Bibit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-955004',
    code: '955004',
    name: 'Pengendalian Hama Penyakit',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-955003',
    code: '955003',
    name: 'Pemupukan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-955002',
    code: '955002',
    name: 'Pengendalian Gulma',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-955001',
    code: '955001',
    name: 'Penyiraman',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 952: Biaya Babybag ---
  {
    id: 'CFNA-952001',
    code: '952001',
    name: 'Biaya Babybag',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 966 & 959: Pembebanan Kebun Sepupu ---
  {
    id: 'CFNA-966001',
    code: '966001',
    name: 'Pembebanan ke Kebun Sepupu',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-959001',
    code: '959001',
    name: 'Pembebanan ke Kebun Sepupu',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 963: Penanaman & Transplanting Polybag ---
  {
    id: 'CFNA-963004',
    code: '963004',
    name: 'Buat/Pasang No. Kategori',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-963003',
    code: '963003',
    name: 'Isi Cangkang/Mulsa',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-963002',
    code: '963002',
    name: 'Tanam Bibit di Polybag',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-963001',
    code: '963001',
    name: 'Pemindahan Bibit Babybag',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 954: Penanaman Kecambah Pre-Nursery ---
  {
    id: 'CFNA-954002',
    code: '954002',
    name: 'Buat/Pasang No. Kategori',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-954001',
    code: '954001',
    name: 'Tanam Kecambah',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 962: Persiapan Media Main Nursery (Polybag) ---
  {
    id: 'CFNA-962005',
    code: '962005',
    name: 'Susun Polybag di Bibitan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-962004',
    code: '962004',
    name: 'Isi Tanah ke Polybag',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-962003',
    code: '962003',
    name: 'Ayak/Campur Tanah dgn RP & Solid',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-962002',
    code: '962002',
    name: 'Cari/Kumpulkan Tanah/Media',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-962001',
    code: '962001',
    name: 'Membersihkan/Meratakan Areal Bibitan',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 953: Persiapan Media Pre-Nursery (Bedengan/Babybag) ---
  {
    id: 'CFNA-953006',
    code: '953006',
    name: 'Pemeliharaan Bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-953005',
    code: '953005',
    name: 'Persiapan Bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-953004',
    code: '953004',
    name: 'Susun Babybag di Bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-953003',
    code: '953003',
    name: 'Isi Tanah ke Babybag',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-953002',
    code: '953002',
    name: 'Ayak/Campur Tanah dgn RP & Solid',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-953001',
    code: '953001',
    name: 'Cari/Kumpulkan Tanah/Media',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 951: Biaya Benih / Kecambah ---
  {
    id: 'CFNA-951001',
    code: '951001',
    name: 'Biaya Kecambah',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK 965 & 956: Supervisi & Pengawasan ---
  {
    id: 'CFNA-965002',
    code: '965002',
    name: 'Gaji mengawasi bibitan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-965001',
    code: '965001',
    name: 'Gaji Mantri Bibitan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-956001',
    code: '956001',
    name: 'Gaji Mantri Bibitan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-956002',
    code: '956002',
    name: 'Mengawasi Bibitan',
    status: CFNA_STATUS.ACTIVE
  },

  // --- KELOMPOK TAMBAHAN: Persediaan & Bedengan Standar ---
  {
    id: 'CFNA-091A11',
    code: '091A11',
    name: 'Persediaan Bibit Komersil',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-091B11',
    code: '091B11',
    name: 'Persediaan Bibit Prog. Tanam',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122124',
    code: '122124',
    name: 'Penyiraman di Bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122123',
    code: '122123',
    name: 'Tanam Biji di Bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122122',
    code: '122122',
    name: 'Pemeliharaan Bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122121',
    code: '122121',
    name: 'Persiapan Bedengan',
    status: CFNA_STATUS.ACTIVE
  },
  {
    id: 'CFNA-122111',
    code: '122111',
    name: 'Biaya Biji Kelatak',
    status: CFNA_STATUS.ACTIVE
  }
]);

/**
 * Metadata Pemetaan Aktivitas Bibitan (Metadata Registry)
 */
export const CFNA_ACTIVITY_MAPPINGS = Object.freeze([
  {
    cfnaCode: '964009',
    cfnaName: 'Penyiraman (Manual)',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PENYIRAMAN',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '964008',
    cfnaName: 'Seleksi Bibit',
    targetActivityModule: 'PENYELEKSIAN',
    targetActivityType: 'SELEKSI_BIBIT',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '964006',
    cfnaName: 'Pemupukan',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PEMUPUKAN',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '964005',
    cfnaName: 'Pengendalian Gulma (Manual)',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PENGENDALIAN_GULMA',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '964007',
    cfnaName: 'Pengendalian Hama Penyakit',
    targetActivityModule: 'KEGIATAN_BIBITAN',
    targetActivityType: 'PENGENDALIAN_HAMA_PENYAKIT',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '954001',
    cfnaName: 'Tanam Kecambah',
    targetActivityModule: 'PENYEMAIAN',
    targetActivityType: 'PENANAMAN_KECAMBAH',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '951001',
    cfnaName: 'Biaya Kecambah',
    targetActivityModule: 'PENERIMAAN',
    targetActivityType: 'PENERIMAAN_BENIH',
    mappingStatus: MAPPING_STATUS.CONFIRMED,
    source: 'DAK_CFNA_SPEC'
  },
  {
    cfnaCode: '966001',
    cfnaName: 'Pembebanan ke Kebun Sepupu',
    targetActivityModule: 'PERMINTAAN',
    targetActivityType: 'PERMINTAAN_KEBUN_SEPUPU',
    mappingStatus: MAPPING_STATUS.NEEDS_REVIEW,
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
