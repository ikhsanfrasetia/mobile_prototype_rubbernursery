/**
 * data/worker-master.js — Master Data Pekerja Foundation (Phase 9F-B).
 *
 * Prinsip:
 * "SAFETY FIRST."
 * "AUDIT BEFORE IMPLEMENTATION."
 * "SINGLE SOURCE OF TRUTH."
 * "MASTER FIRST, MODULE INTEGRATION LATER."
 * "ADD, DO NOT BREAK."
 *
 * Master Data Pekerja terpusat untuk SIGMA Rubber Nursery.
 * Menyediakan representasi 24 pekerja:
 * - Tanah Besih Divisi I: 7 active + 2 absent/inactive (9 total)
 * - Tanah Besih Divisi II: 5 active
 * - Aek Pamingke Divisi I: 5 active
 * - Aek Pamingke Divisi II: 5 active
 *
 * Bersifat deklaratif & mandiri. Modul transaksi akan diintegrasikan secara bertahap pada fase berikutnya.
 */

import { getCurrentUserContext, resolveUserContext } from '../core/user-context.js';

export const WORKER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

/**
 * Dataset Master Pekerja (24 Record Terverifikasi)
 */
export const WORKER_MASTER = Object.freeze([
  // ==========================================
  // TANAH BESIH — DIVISI I (EST-TBS, DIV-001)
  // ==========================================
  {
    id: 'WRK-001',
    code: '1405739',
    name: 'Fadilah Yusuf Purba',
    nik: '1405739',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    indicator: '1',
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  },
  {
    id: 'WRK-002',
    code: '1405739',
    name: 'Adek Apria Syahputra',
    nik: '1405739',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_adek.jpg'
  },
  {
    id: 'WRK-003',
    code: '1405739',
    name: 'Bidara Iswanda',
    nik: '1405739',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_bidara.jpg'
  },
  {
    id: 'WRK-004',
    code: '1405739',
    name: 'Tugiman',
    nik: '1405739',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_tugiman.jpg'
  },
  {
    id: 'WRK-005',
    code: '1405810',
    name: 'Budi Santoso',
    nik: '1405810',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  },
  {
    id: 'WRK-006',
    code: '1405811',
    name: 'Andi Wijaya',
    nik: '1405811',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_adek.jpg'
  },
  {
    id: 'WRK-007',
    code: '1405812',
    name: 'Joko Prasetyo',
    nik: '1405812',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_bidara.jpg'
  },
  {
    id: 'WRK-ABS-001',
    code: '1405739',
    name: 'Supriadi',
    nik: '1405739',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.INACTIVE,
    active: false,
    absentType: 'C',
    absentReason: 'Cuti'
  },
  {
    id: 'WRK-ABS-002',
    code: '1405739',
    name: 'Pahrul',
    nik: '1405739',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.INACTIVE,
    active: false,
    absentType: 'P4',
    absentReason: 'P4'
  },

  // ==========================================
  // TANAH BESIH — DIVISI II (EST-TBS, DIV-002)
  // ==========================================
  {
    id: 'WRK-TBS-D2-001',
    code: 'WRK-TBS-D2-001',
    name: 'Darman',
    nik: '1405901',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-002',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  },
  {
    id: 'WRK-TBS-D2-002',
    code: 'WRK-TBS-D2-002',
    name: 'Iwan Setiawan',
    nik: '1405902',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-002',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_adek.jpg'
  },
  {
    id: 'WRK-TBS-D2-003',
    code: 'WRK-TBS-D2-003',
    name: 'Rahmad Hidayat',
    nik: '1405903',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-002',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_bidara.jpg'
  },
  {
    id: 'WRK-TBS-D2-004',
    code: 'WRK-TBS-D2-004',
    name: 'Surya',
    nik: '1405904',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-002',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_tugiman.jpg'
  },
  {
    id: 'WRK-TBS-D2-005',
    code: 'WRK-TBS-D2-005',
    name: 'M. Ridwan',
    nik: '1405905',
    position: 'Pekerja Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-002',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  },

  // ==========================================
  // AEK PAMINGKE — DIVISI I (EST-APM, DIV-APM-01)
  // ==========================================
  {
    id: 'WRK-APM-D1-001',
    code: 'WRK-APM-D1-001',
    name: 'Herman',
    nik: '1505101',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-01',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  },
  {
    id: 'WRK-APM-D1-002',
    code: 'WRK-APM-D1-002',
    name: 'Jefri',
    nik: '1505102',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-01',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_adek.jpg'
  },
  {
    id: 'WRK-APM-D1-003',
    code: 'WRK-APM-D1-003',
    name: 'Tarmizi',
    nik: '1505103',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-01',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_bidara.jpg'
  },
  {
    id: 'WRK-APM-D1-004',
    code: 'WRK-APM-D1-004',
    name: 'Suharto',
    nik: '1505104',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-01',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_tugiman.jpg'
  },
  {
    id: 'WRK-APM-D1-005',
    code: 'WRK-APM-D1-005',
    name: 'Yanto',
    nik: '1505105',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-01',
    divisionName: 'Divisi I',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  },

  // ==========================================
  // AEK PAMINGKE — DIVISI II (EST-APM, DIV-APM-02)
  // ==========================================
  {
    id: 'WRK-APM-D2-001',
    code: 'WRK-APM-D2-001',
    name: 'Nasrul',
    nik: '1505201',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  },
  {
    id: 'WRK-APM-D2-002',
    code: 'WRK-APM-D2-002',
    name: 'Feri Irawan',
    nik: '1505202',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_adek.jpg'
  },
  {
    id: 'WRK-APM-D2-003',
    code: 'WRK-APM-D2-003',
    name: 'Zulkifli',
    nik: '1505203',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_bidara.jpg'
  },
  {
    id: 'WRK-APM-D2-004',
    code: 'WRK-APM-D2-004',
    name: 'Arman',
    nik: '1505204',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_tugiman.jpg'
  },
  {
    id: 'WRK-APM-D2-005',
    code: 'WRK-APM-D2-005',
    name: 'Ilham',
    nik: '1505205',
    position: 'Pekerja Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    status: WORKER_STATUS.ACTIVE,
    active: true,
    defaultPhoto: 'assets/icons/worker_fadilah.jpg'
  }
]);

// ==========================================
// LOOKUP & FILTER QUERY APIS
// ==========================================

/**
 * Mengambil seluruh data master pekerja (24 pekerja).
 * @returns {Array<Object>}
 */
export function getAllWorkers() {
  return [...WORKER_MASTER];
}

/**
 * Mengambil seluruh pekerja yang berstatus aktif.
 * @returns {Array<Object>}
 */
export function getActiveWorkers() {
  return WORKER_MASTER.filter((w) => w.status === WORKER_STATUS.ACTIVE && w.active !== false);
}

/**
 * Mengambil record pekerja berdasarkan ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getWorkerById(id) {
  if (!id) return null;
  const clean = String(id).trim();
  return WORKER_MASTER.find((w) => w.id === clean) || null;
}

/**
 * Mengambil record pekerja berdasarkan code.
 * @param {string} code
 * @returns {Object|null}
 */
export function getWorkerByCode(code) {
  if (!code) return null;
  const clean = String(code).trim();
  return WORKER_MASTER.find((w) => w.code === clean) || null;
}

/**
 * Mengambil pekerja berdasarkan Estate ID.
 * @param {string} estateId
 * @param {Object} [options]
 * @param {boolean} [options.activeOnly=true]
 * @returns {Array<Object>}
 */
export function getWorkersByEstate(estateId, { activeOnly = true } = {}) {
  if (!estateId) return [];
  const clean = String(estateId).trim();
  return WORKER_MASTER.filter((w) => {
    const matchEstate = w.estateId === clean;
    const matchActive = !activeOnly || (w.status === WORKER_STATUS.ACTIVE && w.active !== false);
    return matchEstate && matchActive;
  });
}

/**
 * Mengambil pekerja berdasarkan Division ID.
 * @param {string} divisionId
 * @param {Object} [options]
 * @param {boolean} [options.activeOnly=true]
 * @returns {Array<Object>}
 */
export function getWorkersByDivision(divisionId, { activeOnly = true } = {}) {
  if (!divisionId) return [];
  const clean = String(divisionId).trim();
  return WORKER_MASTER.filter((w) => {
    const matchDivision = w.divisionId === clean;
    const matchActive = !activeOnly || (w.status === WORKER_STATUS.ACTIVE && w.active !== false);
    return matchDivision && matchActive;
  });
}

/**
 * Mengambil pekerja berdasarkan Estate ID dan Division ID.
 * @param {string} estateId
 * @param {string} divisionId
 * @param {Object} [options]
 * @param {boolean} [options.activeOnly=true]
 * @returns {Array<Object>}
 */
export function getWorkersByEstateAndDivision(estateId, divisionId, { activeOnly = true } = {}) {
  if (!estateId && !divisionId) return [];
  return WORKER_MASTER.filter((w) => {
    const matchEstate = !estateId || w.estateId === String(estateId).trim();
    const matchDivision = !divisionId || w.divisionId === String(divisionId).trim();
    const matchActive = !activeOnly || (w.status === WORKER_STATUS.ACTIVE && w.active !== false);
    return matchEstate && matchDivision && matchActive;
  });
}

/**
 * Mengambil pekerja yang sesuai dengan konteks user aktif (estate + division).
 * @param {Object} [userContext=null]
 * @param {Object} [options]
 * @param {boolean} [options.activeOnly=true]
 * @returns {Array<Object>}
 */
export function getWorkersForUserContext(userContext = null, { activeOnly = true } = {}) {
  const ctx = userContext ? resolveUserContext(userContext) : getCurrentUserContext();
  if (!ctx) return [];

  // Jika user memiliki scope divisi, filter berdasarkan estateId & divisionId
  if (ctx.scopeType === 'DIVISION' && ctx.divisionId) {
    return getWorkersByEstateAndDivision(ctx.estateId, ctx.divisionId, { activeOnly });
  }

  // Jika user memiliki scope estate (misal Pengurus/Askep), tampilkan pekerja di seluruh estate terkait
  if (ctx.estateId) {
    return getWorkersByEstate(ctx.estateId, { activeOnly });
  }

  return activeOnly ? getActiveWorkers() : getAllWorkers();
}

/**
 * Memeriksa apakah seorang pekerja berstatus aktif.
 * @param {string} id
 * @returns {boolean}
 */
export function isWorkerActive(id) {
  const worker = getWorkerById(id);
  return worker ? (worker.status === WORKER_STATUS.ACTIVE && worker.active !== false) : false;
}

/**
 * Memeriksa apakah seorang pekerja berada dalam cakupan estate dan divisi tertentu.
 * @param {string} workerId
 * @param {string} estateId
 * @param {string} divisionId
 * @returns {boolean}
 */
export function isWorkerInScope(workerId, estateId, divisionId) {
  const worker = getWorkerById(workerId);
  if (!worker) return false;
  const matchEstate = !estateId || worker.estateId === String(estateId).trim();
  const matchDivision = !divisionId || worker.divisionId === String(divisionId).trim();
  return matchEstate && matchDivision;
}
