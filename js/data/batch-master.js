/**
 * data/batch-master.js — Master Data & Service Terpusat Master Batch (TASK ASB-04).
 * 
 * Prinsip:
 * - "SINGLE SOURCE OF TRUTH: nursery_batches"
 * - Dikelola oleh Role ASISTEN_BIBITAN (CRUD, Activate/Deactivate, Atribut Master)
 * - Dibaca oleh MANTRI_BIBITAN (Read-only / Consumer)
 * - 1 Batch -> N Bedengan (bedenganIds: string[])
 * - Terintegrasi dengan program-master.js, estate-master.js, klon-master.js, bedengan-master.js
 * - Mutasi stok transaksional terisolasi melalui service dispatch/receipt existing
 */

import { storage } from '../core/storage.js';
import { ROLES, normalizeRole, getCurrentUserContext } from '../core/user-context.js';
import { getActivePrograms, getProgramById, resolveProgram } from './program-master.js';
import { getActiveEstates, getEstateById, getNurseryDivisionsByEstate } from './estate-master.js';
import { normalizeKlonName, isKnownKlon } from './klon-master.js';
import { getBedenganById, getActiveBedengan, BEDENGAN_STATUS } from './bedengan-master.js';

export const STORAGE_KEY_NURSERY_BATCHES = 'nursery_batches';

export const BATCH_STATUS = Object.freeze({
  CREATED: 'CREATED',
  AVAILABLE: 'AVAILABLE',
  EMPTY: 'EMPTY',
  INACTIVE: 'INACTIVE'
});

export const BATCH_CATEGORIES = Object.freeze([
  'Polibag Besar',
  'Polibag Kecil',
  'Rootstock',
  'Stump Mata Tidur',
  'Bibit Siap Tanam',
  'Komersial',
  'Cadangan'
]);

export const BATCH_GROWTH_STAGES = Object.freeze([
  'Rubber Advance Planting Material',
  'Rubber Main Nursery',
  'Rootstock Mother Nursery',
  'RAPM',
  'RMN'
]);

/**
 * Baseline Default Seed Batches (Canonical Master Seed)
 */
export const DEFAULT_CANONICAL_BATCHES = Object.freeze([
  // ==========================================
  // AEK PAMINGKE (EST-APM) — DIVISI II (DIV-APM-02)
  // ==========================================
  {
    id: 'BATCH-APM-001',
    batchId: 'BATCH-APM-001',
    batchCode: 'B-001',
    batchNo: 'B-001',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    cloneId: 'IRCA 19',
    clone: 'IRCA 19',
    klon: 'IRCA 19',
    growthStage: 'Rubber Advance Planting Material',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: ['BED-APM-D2-001'],
    initialQty: 5000,
    receivedQty: 5000,
    availableQty: 5000,
    currentQty: 5000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },
  {
    id: 'BATCH-APM-002',
    batchId: 'BATCH-APM-002',
    batchCode: 'B-002',
    batchNo: 'B-002',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    cloneId: 'IRCA 19',
    clone: 'IRCA 19',
    klon: 'IRCA 19',
    growthStage: 'Rubber Advance Planting Material',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: ['BED-APM-D2-002'],
    initialQty: 4000,
    receivedQty: 4000,
    availableQty: 4000,
    currentQty: 4000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },
  {
    id: 'BATCH-APM-003',
    batchId: 'BATCH-APM-003',
    batchCode: 'B-003',
    batchNo: 'B-003',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    cloneId: 'IRCA 19',
    clone: 'IRCA 19',
    klon: 'IRCA 19',
    growthStage: 'Rubber Advance Planting Material',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: ['BED-APM-D2-001', 'BED-APM-D2-002'],
    initialQty: 5000,
    receivedQty: 5000,
    availableQty: 5000,
    currentQty: 5000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },
  {
    id: 'BATCH-APM-007',
    batchId: 'BATCH-APM-007',
    batchCode: 'B-007',
    batchNo: 'B-007',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    cloneId: 'IRCA 19',
    clone: 'IRCA 19',
    klon: 'IRCA 19',
    growthStage: 'Rubber Advance Planting Material',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: ['BED-APM-D2-001'],
    initialQty: 6000,
    receivedQty: 6000,
    availableQty: 6000,
    currentQty: 6000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },
  {
    id: 'BATCH-APM-006',
    batchId: 'BATCH-APM-006',
    batchCode: 'B-006',
    batchNo: 'B-006',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    cloneId: 'IRCA 18',
    clone: 'IRCA 18',
    klon: 'IRCA 18',
    growthStage: 'Rubber Advance Planting Material',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: ['BED-APM-D2-002'],
    initialQty: 10000,
    receivedQty: 10000,
    availableQty: 10000,
    currentQty: 10000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },
  {
    id: 'BATCH-APM-004',
    batchId: 'BATCH-APM-004',
    batchCode: 'B-004',
    batchNo: 'B-004',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    cloneId: 'PB 260',
    clone: 'PB 260',
    klon: 'PB 260',
    growthStage: 'Rubber Main Nursery',
    stage: 'Rubber Main Nursery',
    category: 'Polibag Kecil',
    bedenganIds: ['BED-APM-D2-001'],
    initialQty: 10000,
    receivedQty: 10000,
    availableQty: 10000,
    currentQty: 10000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },
  {
    id: 'BATCH-APM-005',
    batchId: 'BATCH-APM-005',
    batchCode: 'B-005',
    batchNo: 'B-005',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    cloneId: 'GT 1',
    clone: 'GT 1',
    klon: 'GT 1',
    growthStage: 'Rubber Advance Planting Material',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: ['BED-APM-D2-002'],
    initialQty: 8000,
    receivedQty: 8000,
    availableQty: 8000,
    currentQty: 8000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },

  // ==========================================
  // TANAH BESIH (EST-TBS) — DIVISI I (DIV-001)
  // ==========================================
  {
    id: 'BATCH-TBS-001',
    batchId: 'BATCH-TBS-001',
    batchCode: 'B-TBS-01',
    batchNo: 'B-TBS-01',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    cloneId: 'IRCA 19',
    clone: 'IRCA 19',
    klon: 'IRCA 19',
    growthStage: 'Rubber Advance Planting Material',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: ['BED-TBS-D1-001', 'BED-TBS-D1-002'],
    initialQty: 5000,
    receivedQty: 5000,
    availableQty: 5000,
    currentQty: 5000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    id: 'BATCH-TBS-002',
    batchId: 'BATCH-TBS-002',
    batchCode: 'B-TBS-02',
    batchNo: 'B-TBS-02',
    programId: 'PRG-2026-002',
    estateId: 'EST-TBS',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    cloneId: 'PB 260',
    clone: 'PB 260',
    klon: 'PB 260',
    growthStage: 'Rubber Main Nursery',
    stage: 'Rubber Main Nursery',
    category: 'Polibag Kecil',
    bedenganIds: ['BED-TBS-D1-004'],
    initialQty: 8000,
    receivedQty: 8000,
    availableQty: 8000,
    currentQty: 8000,
    status: BATCH_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  }
]);

/**
 * Mengambil dataset raw dari storage dengan inisialisasi default
 */
function _loadBatchesFromStorage() {
  const stored = storage.get(STORAGE_KEY_NURSERY_BATCHES, null);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    const cloned = JSON.parse(JSON.stringify(DEFAULT_CANONICAL_BATCHES));
    storage.set(STORAGE_KEY_NURSERY_BATCHES, cloned);
    return cloned;
  }
  return stored;
}

/**
 * Menyimpan dataset ke storage
 */
function _saveBatchesToStorage(list) {
  storage.set(STORAGE_KEY_NURSERY_BATCHES, list);
}

/**
 * Reset master batch ke baseline default
 */
export function resetBatchMasterToDefault() {
  const cloned = JSON.parse(JSON.stringify(DEFAULT_CANONICAL_BATCHES));
  storage.set(STORAGE_KEY_NURSERY_BATCHES, cloned);
  return cloned;
}

/**
 * Validasi otorisasi & scope user untuk Master Batch
 */
export function validateBatchUserScope(user, targetEstateId, targetDivisionId, actionName = 'mengubah') {
  const ctx = user || getCurrentUserContext();
  const normalized = normalizeRole(ctx.role);

  if (normalized !== ROLES.ASISTEN_BIBITAN) {
    throw new Error(`Akses ditolak: Hanya role ASISTEN_BIBITAN yang berwenang ${actionName} Master Batch.`);
  }

  const userEstate = String(ctx.estateId || '').trim().toUpperCase();
  const userDivision = String(ctx.divisionId || '').trim().toUpperCase();

  const targetEstate = String(targetEstateId || '').trim().toUpperCase();
  const targetDivision = String(targetDivisionId || '').trim().toUpperCase();

  const matchEstate = !userEstate || userEstate === targetEstate ||
    (userEstate.includes('TBS') && targetEstate.includes('TBS')) ||
    (userEstate.includes('APM') && targetEstate.includes('APM'));

  if (!matchEstate) {
    throw new Error(`Akses ditolak: User tidak memiliki wewenang pada Estate '${targetEstateId}'.`);
  }

  if (userDivision && targetDivision) {
    const matchDiv = userDivision === targetDivision ||
      (userDivision === 'DIV-001' && targetDivision === 'DIV-001') ||
      (userDivision === 'DIV-APM-02' && targetDivision === 'DIV-APM-02');
    if (!matchDiv) {
      throw new Error(`Akses ditolak: User tidak memiliki wewenang pada Divisi '${targetDivisionId}'.`);
    }
  }

  return true;
}

/**
 * Validasi Relasi Batch (Program, Estate, Divisi, Klon, Bedengan N-relation)
 */
export function validateBatchRelations({ programId, estateId, divisionId, clone, bedenganIds = [] }) {
  const errors = [];

  // 1. Program Validation
  const prog = getProgramById(programId) || resolveProgram(programId);
  if (!prog) {
    errors.push(`Program Pembibitan '${programId}' tidak ditemukan`);
  } else if (prog.status !== 'ACTIVE') {
    errors.push(`Program '${prog.name || programId}' tidak berstatus ACTIVE`);
  }

  // 2. Estate Validation
  const est = getEstateById(estateId);
  if (!est) {
    errors.push(`Estate '${estateId}' tidak valid`);
  }

  // 3. Division Validation
  if (est && divisionId) {
    const validDivs = getNurseryDivisionsByEstate(estateId);
    const divMatch = validDivs.some(d => 
      d.divisionId.toUpperCase() === divisionId.toUpperCase() ||
      d.divisionCode.toUpperCase() === divisionId.toUpperCase()
    );
    if (!divMatch) {
      errors.push(`Divisi '${divisionId}' tidak terdaftar pada Estate '${est.estate_name || estateId}'`);
    }
  } else if (!divisionId) {
    errors.push('Divisi wajib dipilih');
  }

  // 4. Clone Validation
  const normClone = normalizeKlonName(clone);
  if (!isKnownKlon(normClone)) {
    errors.push(`Klon '${clone}' tidak terdaftar dalam Master Data Klon`);
  }

  // 5. Bedengan N-Relation Validation
  if (Array.isArray(bedenganIds) && bedenganIds.length > 0) {
    bedenganIds.forEach(bedId => {
      const bed = getBedenganById(bedId);
      if (!bed) {
        errors.push(`Bedengan '${bedId}' tidak ditemukan di Master Bedengan`);
      } else {
        if (bed.status === BEDENGAN_STATUS.INACTIVE) {
          errors.push(`Bedengan '${bed.name || bedId}' berstatus INACTIVE`);
        }
        if (estateId && bed.estateId && bed.estateId.toUpperCase() !== estateId.toUpperCase()) {
          errors.push(`Bedengan '${bed.name || bedId}' tidak berada di Estate '${estateId}'`);
        }
        if (divisionId && bed.divisionId && bed.divisionId.toUpperCase() !== divisionId.toUpperCase()) {
          errors.push(`Bedengan '${bed.name || bedId}' tidak berada di Divisi '${divisionId}'`);
        }
        if (prog && bed.programId && bed.programId !== prog.id && bed.programId !== prog.code) {
          errors.push(`Bedengan '${bed.name || bedId}' dialokasikan untuk program lain (${bed.programId})`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    program: prog,
    estate: est,
    cloneName: normClone
  };
}

/**
 * Resolvers
 */
export function getAllBatches(filters = {}) {
  let list = _loadBatchesFromStorage();

  if (filters.estateId) {
    const cleanEst = String(filters.estateId).trim().toUpperCase();
    list = list.filter(b => (b.estateId || '').toUpperCase() === cleanEst);
  }

  if (filters.divisionId) {
    const cleanDiv = String(filters.divisionId).trim().toUpperCase();
    list = list.filter(b => (b.divisionId || '').toUpperCase() === cleanDiv);
  }

  if (filters.programId) {
    const cleanProg = String(filters.programId).trim();
    list = list.filter(b => b.programId === cleanProg);
  }

  if (filters.cloneId || filters.clone || filters.klon) {
    const target = normalizeKlonName(filters.cloneId || filters.clone || filters.klon).toUpperCase();
    list = list.filter(b => normalizeKlonName(b.clone || b.klon || b.cloneId).toUpperCase() === target);
  }

  if (filters.growthStage || filters.stage) {
    const stage = String(filters.growthStage || filters.stage).trim().toUpperCase();
    list = list.filter(b => (b.growthStage || b.stage || '').toUpperCase() === stage);
  }

  if (filters.status) {
    list = list.filter(b => b.status === filters.status);
  }

  if (filters.bedenganId) {
    list = list.filter(b => Array.isArray(b.bedenganIds) && b.bedenganIds.includes(filters.bedenganId));
  }

  if (filters.search) {
    const q = String(filters.search).trim().toLowerCase();
    list = list.filter(b => 
      (b.batchCode || '').toLowerCase().includes(q) ||
      (b.batchId || '').toLowerCase().includes(q) ||
      (b.batchNo || '').toLowerCase().includes(q) ||
      (b.clone || b.klon || '').toLowerCase().includes(q)
    );
  }

  return list;
}

export function getActiveBatches(filters = {}) {
  const all = getAllBatches(filters);
  return all.filter(b => b.status !== BATCH_STATUS.INACTIVE && b.status !== BATCH_STATUS.EMPTY && (b.availableQty || 0) > 0);
}

export function getBatchById(id) {
  if (!id) return null;
  const list = _loadBatchesFromStorage();
  return list.find(b => b.id === id || b.batchId === id) || null;
}

export function getBatchByCode(code) {
  if (!code) return null;
  const clean = String(code).trim().toLowerCase();
  const list = _loadBatchesFromStorage();
  return list.find(b => 
    (b.batchCode || '').toLowerCase() === clean ||
    (b.batchNo || '').toLowerCase() === clean
  ) || null;
}

export function getBatchesByProgram(programId) {
  return getAllBatches({ programId });
}

export function getBatchesByEstate(estateId) {
  return getAllBatches({ estateId });
}

export function getBatchesByDivision(divisionId) {
  return getAllBatches({ divisionId });
}

export function getBatchesByClone(cloneId) {
  return getAllBatches({ cloneId });
}

export function getBatchesByGrowthStage(stage) {
  return getAllBatches({ growthStage: stage });
}

export function getBatchesByBedengan(bedenganId) {
  return getAllBatches({ bedenganId });
}

export function isBatchActive(id) {
  const b = getBatchById(id);
  return b ? b.status !== BATCH_STATUS.INACTIVE : false;
}

export function getAvailableBatchStock(id) {
  const b = getBatchById(id);
  if (!b || b.status === BATCH_STATUS.INACTIVE) return 0;
  return Number(b.availableQty || 0);
}

/**
 * Menghasilkan candidate identity berikutnya untuk Master Batch
 * scoped strictly to (programId + estateId + divisionId)
 */
export function getNextBatchCandidate(programId, estateId, divisionId) {
  if (!programId || !estateId || !divisionId) return null;

  const allBatches = getAllBatches({}); // includes INACTIVE & EMPTY

  // Format estate code short: 'EST-APM' -> 'APM', 'EST-TBS' -> 'TBS'
  const estShort = String(estateId).replace(/^EST-/, '').toUpperCase();

  // Format division 2-digits: 'DIV-APM-02' -> '02', 'DIV-001' -> '01'
  let divDigits = '01';
  const numMatch = String(divisionId).match(/\d+/);
  if (numMatch) {
    divDigits = String(parseInt(numMatch[0], 10)).padStart(2, '0');
  }

  // Find all batches in this scope (programId + estateId + divisionId)
  const scopedBatches = allBatches.filter(b =>
    b.programId === programId &&
    String(b.estateId).toUpperCase() === String(estateId).toUpperCase() &&
    String(b.divisionId).toUpperCase() === String(divisionId).toUpperCase()
  );

  let maxSeq = 0;
  scopedBatches.forEach(b => {
    const m = (b.batchCode || b.batchNo || '').match(/(\d+)$/);
    if (m) {
      const s = parseInt(m[1], 10);
      if (s > maxSeq) maxSeq = s;
    }
  });

  let nextSeq = maxSeq + 1;
  let candidateCode = `B-${estShort}-${divDigits}-${String(nextSeq).padStart(3, '0')}`;
  let candidateName = `Batch ${String(nextSeq).padStart(3, '0')}`;
  let candidateId = `BATCH-${estShort}-${divDigits}-${String(programId).replace(/[^A-Za-z0-9]/g, '')}-${String(nextSeq).padStart(3, '0')}`;
  let candidateQR = `SIGMA-BATCH-${estShort}-${divDigits}-${String(nextSeq).padStart(3, '0')}`;

  while (
    scopedBatches.some(b => 
      ((b.batchCode && b.batchCode.toUpperCase() === candidateCode.toUpperCase()) ||
       (b.batchNo && b.batchNo.toUpperCase() === candidateCode.toUpperCase())) ||
      (b.name && b.name.toUpperCase() === candidateName.toUpperCase())
    )
  ) {
    nextSeq++;
    candidateCode = `B-${estShort}-${divDigits}-${String(nextSeq).padStart(3, '0')}`;
    candidateName = `Batch ${String(nextSeq).padStart(3, '0')}`;
    candidateId = `BATCH-${estShort}-${divDigits}-${String(programId).replace(/[^A-Za-z0-9]/g, '')}-${String(nextSeq).padStart(3, '0')}`;
    candidateQR = `SIGMA-BATCH-${estShort}-${divDigits}-${String(nextSeq).padStart(3, '0')}`;
  }

  return {
    seq: nextSeq,
    batchId: candidateId,
    batchCode: candidateCode,
    name: candidateName,
    qrCode: candidateQR
  };
}

/**
 * CREATE Master Batch
 */
export function createBatch(data, currentUser = null) {
  const ctx = currentUser || getCurrentUserContext();

  if (!data.batchCode || !String(data.batchCode).trim()) {
    throw new Error('Kode Batch wajib diisi');
  }

  const initialQty = Number(data.initialQty !== undefined ? data.initialQty : (data.receivedQty || 0));
  if (data.status !== BATCH_STATUS.CREATED && (initialQty <= 0 || isNaN(initialQty))) {
    throw new Error('Kuantitas awal (Initial Qty) harus berupa angka lebih dari 0');
  } else if (initialQty < 0 || isNaN(initialQty)) {
    throw new Error('Kuantitas awal (Initial Qty) tidak boleh negatif');
  }

  // Scope & Role Check
  validateBatchUserScope(ctx, data.estateId, data.divisionId, 'menambah');

  // Relations Check
  const relCheck = validateBatchRelations({
    programId: data.programId,
    estateId: data.estateId,
    divisionId: data.divisionId,
    clone: data.clone || data.klon || data.cloneId,
    bedenganIds: data.bedenganIds || []
  });
  if (!relCheck.valid) {
    throw new Error(relCheck.errors.join('. '));
  }

  const list = _loadBatchesFromStorage();

  const cleanCode = String(data.batchCode).trim().toUpperCase();
  if (list.some(b => (b.batchCode || '').toUpperCase() === cleanCode)) {
    throw new Error(`Kode Batch '${data.batchCode}' sudah digunakan`);
  }

  const newId = data.batchId || data.id || `BATCH-${data.estateId || 'EST'}-${Date.now().toString().slice(-6)}`;
  if (list.some(b => b.id === newId || b.batchId === newId)) {
    throw new Error(`Batch ID '${newId}' sudah digunakan`);
  }

  const now = new Date().toISOString();
  const estObj = getEstateById(data.estateId);
  const divs = getNurseryDivisionsByEstate(data.estateId);
  const divObj = divs.find(d => d.divisionId === data.divisionId);

  const newBatch = {
    id: newId,
    batchId: newId,
    batchCode: String(data.batchCode).trim(),
    batchNo: String(data.batchCode).trim(),
    name: data.name ? String(data.name).trim() : `Batch ${String(data.batchCode).trim()}`,
    qrCode: data.qrCode ? String(data.qrCode).trim() : `SIGMA-${newId}`,

    programId: data.programId,

    estateId: data.estateId,
    estateCode: data.estateId,
    estateName: estObj ? estObj.estate_name : data.estateId,

    divisionId: data.divisionId,
    divisionCode: data.divisionId,
    divisionName: divObj ? divObj.divisionName : data.divisionId,

    cloneId: relCheck.cloneName,
    clone: relCheck.cloneName,
    klon: relCheck.cloneName,

    growthStage: data.growthStage || data.stage || 'Rubber Advance Planting Material',
    stage: data.growthStage || data.stage || 'Rubber Advance Planting Material',

    category: data.category || 'Polibag Besar',
    bedenganIds: Array.isArray(data.bedenganIds) ? data.bedenganIds : [],

    initialQty: initialQty,
    receivedQty: Number(data.receivedQty || initialQty),
    availableQty: Number(data.availableQty !== undefined ? data.availableQty : initialQty),
    currentQty: Number(data.currentQty !== undefined ? data.currentQty : initialQty),

    status: data.status || (initialQty > 0 ? BATCH_STATUS.AVAILABLE : BATCH_STATUS.EMPTY),

    sourceReceiptId: data.sourceReceiptId || null,
    sourceDispatchId: data.sourceDispatchId || null,
    sourceParentRequestId: data.sourceParentRequestId || null,
    sourceBatchId: data.sourceBatchId || null,
    sourceBatchCode: data.sourceBatchCode || null,

    createdAt: now,
    createdBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN',
    updatedAt: now,
    updatedBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN'
  };

  list.push(newBatch);
  _saveBatchesToStorage(list);

  return newBatch;
}

/**
 * UPDATE Master Batch
 */
export function updateBatch(id, data, currentUser = null) {
  const ctx = currentUser || getCurrentUserContext();
  const list = _loadBatchesFromStorage();

  const idx = list.findIndex(b => b.id === id || b.batchId === id);
  if (idx === -1) {
    throw new Error(`Batch dengan ID '${id}' tidak ditemukan`);
  }

  const existing = list[idx];

  // Scope & Role Check
  validateBatchUserScope(ctx, existing.estateId, existing.divisionId, 'mengubah');
  if (data.estateId && data.divisionId) {
    validateBatchUserScope(ctx, data.estateId, data.divisionId, 'mengubah');
  }

  const targetProgram = data.programId || existing.programId;
  const targetEstate = data.estateId || existing.estateId;
  const targetDivision = data.divisionId || existing.divisionId;
  const targetClone = data.clone || data.klon || data.cloneId || existing.clone;
  const targetBedengans = data.bedenganIds !== undefined ? data.bedenganIds : existing.bedenganIds;

  const relCheck = validateBatchRelations({
    programId: targetProgram,
    estateId: targetEstate,
    divisionId: targetDivision,
    clone: targetClone,
    bedenganIds: targetBedengans
  });
  if (!relCheck.valid) {
    throw new Error(relCheck.errors.join('. '));
  }

  if (data.batchCode && data.batchCode !== existing.batchCode) {
    const cleanCode = String(data.batchCode).trim().toUpperCase();
    if (list.some(b => (b.id !== id && b.batchId !== id) && (b.batchCode || '').toUpperCase() === cleanCode)) {
      throw new Error(`Kode Batch '${data.batchCode}' sudah digunakan`);
    }
  }

  const now = new Date().toISOString();
  let nextStatus = data.status !== undefined ? data.status : existing.status;
  if (nextStatus === BATCH_STATUS.AVAILABLE && (existing.availableQty || 0) <= 0) {
    nextStatus = BATCH_STATUS.EMPTY;
  }

  const updated = {
    ...existing,
    batchCode: data.batchCode !== undefined ? String(data.batchCode).trim() : existing.batchCode,
    batchNo: data.batchCode !== undefined ? String(data.batchCode).trim() : existing.batchNo,
    programId: targetProgram,
    estateId: targetEstate,
    divisionId: targetDivision,
    cloneId: relCheck.cloneName,
    clone: relCheck.cloneName,
    klon: relCheck.cloneName,
    growthStage: data.growthStage || data.stage || existing.growthStage,
    stage: data.growthStage || data.stage || existing.stage,
    category: data.category !== undefined ? data.category : existing.category,
    bedenganIds: targetBedengans,
    status: nextStatus,
    updatedAt: now,
    updatedBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN'
  };

  list[idx] = updated;
  _saveBatchesToStorage(list);

  return updated;
}

/**
 * ACTIVATE Master Batch
 */
export function activateBatch(id, currentUser = null) {
  const b = getBatchById(id);
  if (!b) throw new Error(`Batch '${id}' tidak ditemukan`);
  const status = (b.availableQty || 0) > 0 ? BATCH_STATUS.AVAILABLE : BATCH_STATUS.EMPTY;
  return updateBatch(id, { status }, currentUser);
}

/**
 * DEACTIVATE Master Batch (Safe Non-Destructive Inactivation)
 */
export function deactivateBatch(id, currentUser = null) {
  return updateBatch(id, { status: BATCH_STATUS.INACTIVE }, currentUser);
}

/**
 * Legacy Resolver Compatibility
 */
export function resolveBatchLegacy(value) {
  const b = getBatchById(value) || getBatchByCode(value);
  if (b) return b;
  return {
    id: String(value || 'BATCH-001'),
    batchId: String(value || 'BATCH-001'),
    batchCode: String(value || 'B-001'),
    batchNo: String(value || 'B-001'),
    clone: 'IRCA 19',
    klon: 'IRCA 19',
    stage: 'Rubber Advance Planting Material',
    growthStage: 'Rubber Advance Planting Material',
    availableQty: 0,
    status: BATCH_STATUS.EMPTY
  };
}
