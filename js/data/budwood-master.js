/**
 * data/budwood-master.js — Master Data Budwood Terpusat.
 * Sumber Data Resmi: data/budwood-plot-klon.csv
 *
 * Prinsip:
 * "SAFETY FIRST."
 * "SINGLE SOURCE OF TRUTH."
 * "DATASET PENGGUNA ADALAH SUMBER AKTUAL."
 * "ADD, DO NOT BREAK."
 */

export const BUDWOOD_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

/**
 * Dataset Master Budwood (1 Budwood Unik dari Dataset Resmi)
 */
export const BUDWOOD_MASTER = Object.freeze([
  {
    id: 'BW-001',
    code: '2021/BWG/001',
    budwoodCode: '2021/BWG/001',
    name: 'Budwood Garden 2021/BWG/001',
    status: BUDWOOD_STATUS.ACTIVE,
    totalPlots: 97,
    totalPlants: 8383,
    source: 'data/budwood-plot-klon.csv',
    description: 'Kebun Entres / Budwood Garden Resmi 2021/BWG/001'
  }
]);

/**
 * Mengambil seluruh data master Budwood.
 * @returns {Array<Object>}
 */
export function getAllBudwoods() {
  return [...BUDWOOD_MASTER];
}

/**
 * Mengambil master Budwood berdasarkan ID internal (mis. 'BW-001').
 * @param {string} id
 * @returns {Object|null}
 */
export function getBudwoodById(id) {
  if (!id) return null;
  const clean = String(id).trim().toUpperCase();
  return BUDWOOD_MASTER.find((b) => b.id.toUpperCase() === clean) || null;
}

/**
 * Mengambil master Budwood berdasarkan budwood_code (mis. '2021/BWG/001').
 * @param {string} code
 * @returns {Object|null}
 */
export function getBudwoodByCode(code) {
  if (!code) return null;
  const clean = String(code).trim();
  return BUDWOOD_MASTER.find((b) => b.budwoodCode === clean || b.code === clean) || null;
}

/**
 * Memeriksa apakah budwood_code aktif.
 * @param {string} code
 * @returns {boolean}
 */
export function isBudwoodActive(code) {
  const bw = getBudwoodByCode(code);
  return bw !== null && bw.status === BUDWOOD_STATUS.ACTIVE;
}
