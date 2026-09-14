/**
 * data/batch-master.js — Master Data & Service Terpusat Master Batch (TASK ASB-04 & TASK-IMPLEMENT-PROGRAM-MASTER-01).
 * 
 * Prinsip:
 * - "SINGLE SOURCE OF TRUTH: nursery_batches"
 * - Dikelola oleh Role ASISTEN_BIBITAN (CRUD, Activate/Deactivate, Atribut Master)
 * - Dibaca oleh MANTRI_BIBITAN (Read-only / Consumer)
 * - 1 Batch -> N Bedengan (bedenganIds: string[])
 * - Terintegrasi dengan program-master.js (Status: OPEN/CLOSE), estate-master.js, klon-master.js, bedengan-master.js
 * - Status Master Batch: ACTIVE / INACTIVE
 * - Mutasi stok transaksional terisolasi melalui service dispatch/receipt existing
 */

import { storage } from '../core/storage.js';
import { ROLES, normalizeRole, getCurrentUserContext } from '../core/user-context.js';
import { getOpenPrograms, getActivePrograms, getProgramById, resolveProgram, isProgramOpen } from './program-master.js';
import { getActiveEstates, getEstateById, getNurseryDivisionsByEstate } from './estate-master.js';
import { normalizeKlonName, isKnownKlon } from './klon-master.js';
import { getBedenganById, getActiveBedengan, BEDENGAN_STATUS } from './bedengan-master.js';
import { 
  getAvailableQty as getInventoryAvailableQty,
  deductBatchStock as deductInventoryStock,
  addBatchStockFromReceipt as addInventoryStockFromReceipt,
  initBatchInventory,
  INVENTORY_TX_TYPE
} from '../core/batch-inventory-service.js';
import {
  getBatchContext,
  setBatchContext,
  getBatchesByContext,
  validateCrossEstateContext
} from '../core/master-context-service.js';

export const STORAGE_KEY_NURSERY_BATCHES = 'nursery_batches';

export const BATCH_MASTER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

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
 * Baseline production/prototype: Dimulai dari [] (kosong)
 */
export const DEFAULT_CANONICAL_BATCHES = Object.freeze([]);

const OLD_LEGACY_BATCH_IDS = new Set([
  'BATCH-APM-001', 'BATCH-APM-002', 'BATCH-APM-003', 'BATCH-APM-004', 'BATCH-APM-005', 'BATCH-APM-006', 'BATCH-APM-007',
  'BATCH-TBS-001', 'BATCH-TBS-002',
  'B-001', 'B-002', 'B-003', 'B-004', 'B-005', 'B-006', 'B-007',
  'B-TBS-01', 'B-TBS-02'
]);

/**
 * Mengambil dataset raw dari storage dengan inisialisasi default
 */
function _loadBatchesFromStorage() {
  let stored = storage.get(STORAGE_KEY_NURSERY_BATCHES, null);
  if (stored === null || !Array.isArray(stored)) {
    const cloned = JSON.parse(JSON.stringify(DEFAULT_CANONICAL_BATCHES));
    storage.set(STORAGE_KEY_NURSERY_BATCHES, cloned);
    return cloned;
  }
  // Hard-clear: Sanitize out any legacy seed batches lingering in browser runtime storage
  if (stored.some(b => OLD_LEGACY_BATCH_IDS.has(b.id) || OLD_LEGACY_BATCH_IDS.has(b.batchId) || OLD_LEGACY_BATCH_IDS.has(b.batchCode) || (b.createdAt === '2026-01-01T08:00:00.000Z' && (b.createdBy === 'USR-ASB-TBS' || b.createdBy === 'USR-ASB-APM')))) {
    stored = stored.filter(b => !OLD_LEGACY_BATCH_IDS.has(b.id) && !OLD_LEGACY_BATCH_IDS.has(b.batchId) && !OLD_LEGACY_BATCH_IDS.has(b.batchCode) && !(b.createdAt === '2026-01-01T08:00:00.000Z' && (b.createdBy === 'USR-ASB-TBS' || b.createdBy === 'USR-ASB-APM')));
    storage.set(STORAGE_KEY_NURSERY_BATCHES, stored);
  }
  // Pastikan statusMaster tersedia
  return stored.map(b => ({
    ...b,
    statusMaster: b.statusMaster || (b.status === BATCH_STATUS.INACTIVE ? BATCH_MASTER_STATUS.INACTIVE : BATCH_MASTER_STATUS.ACTIVE)
  }));
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
 * Validasi Relasi Batch (Program, Estate, Divisi, Klon, Bedengan N-relation, Block)
 */
export function validateBatchRelations({ programId, estateId, divisionId, clone, bedenganIds = [], blockId, blockCode }) {
  const errors = [];

  // 1. Program Validation
  const prog = getProgramById(programId) || resolveProgram(programId);
  if (!prog) {
    errors.push(`Program Pembibitan '${programId}' tidak ditemukan`);
  } else if (!isProgramOpen(prog.id || programId)) {
    errors.push('Program pembibitan sudah berstatus Close dan tidak dapat digunakan untuk membuat Master Batch.');
  }

  // 2. Estate Validation & Context Inheritance
  const targetEstateId = estateId || prog?.estateId;
  const est = getEstateById(targetEstateId);
  if (!est) {
    errors.push(`Estate '${targetEstateId}' tidak valid`);
  } else if (prog && prog.estateId && estateId && String(prog.estateId).toUpperCase() !== String(estateId).toUpperCase() && !prog.estateIds?.some(e => e.toUpperCase() === String(estateId).toUpperCase())) {
    errors.push(`Program '${prog.code || programId}' terdaftar pada Estate '${prog.estateName || prog.estateId}', tidak cocok dengan Estate target '${estateId}'`);
  }

  // 3. Division Validation
  const targetDivision = divisionId || prog?.divisionId;
  if (est && targetDivision) {
    const validDivs = getNurseryDivisionsByEstate(est.estate_id || targetEstateId);
    const divMatch = validDivs.some(d => 
      d.divisionId.toUpperCase() === targetDivision.toUpperCase() ||
      d.divisionCode.toUpperCase() === targetDivision.toUpperCase()
    );
    if (!divMatch) {
      errors.push(`Divisi '${targetDivision}' tidak terdaftar pada Estate '${est.estate_name || targetEstateId}'`);
    } else if (prog && prog.divisionId && divisionId && String(prog.divisionId).toUpperCase() !== String(divisionId).toUpperCase() && !prog.divisionIds?.some(d => d.toUpperCase() === String(divisionId).toUpperCase())) {
      errors.push(`Program '${prog.code || programId}' terdaftar pada Divisi '${prog.divisionName || prog.divisionId}', tidak cocok dengan Divisi target '${divisionId}'`);
    }
  } else if (!targetDivision) {
    errors.push('Divisi wajib dipilih');
  }

  // 4. Block Validation (jika diberikan)
  if (prog && (blockId || blockCode)) {
    const pBlock = prog.blockCode || prog.blockId;
    const tBlock = blockCode || blockId;
    if (pBlock && tBlock && String(pBlock).toUpperCase() !== String(tBlock).toUpperCase() && String(prog.blockId || '').toUpperCase() !== String(blockId || '').toUpperCase()) {
      errors.push(`Blok '${tBlock}' tidak sesuai dengan Blok Bibitan Program '${pBlock}'`);
    }
  }

  // 5. Clone Validation
  const normClone = normalizeKlonName(clone);
  if (!isKnownKlon(normClone)) {
    errors.push(`Klon '${clone}' tidak terdaftar dalam Master Data Klon`);
  }

  // 6. Bedengan N-Relation Validation
  if (Array.isArray(bedenganIds) && bedenganIds.length > 0) {
    bedenganIds.forEach(bedId => {
      const bed = getBedenganById(bedId);
      if (!bed) {
        errors.push(`Bedengan '${bedId}' tidak ditemukan di Master Bedengan`);
      } else {
        if (bed.status === BEDENGAN_STATUS.INACTIVE) {
          errors.push(`Bedengan '${bed.name || bedId}' berstatus INACTIVE`);
        }
        if (targetEstateId && bed.estateId && bed.estateId.toUpperCase() !== targetEstateId.toUpperCase()) {
          errors.push(`Bedengan '${bed.name || bedId}' tidak berada di Estate '${targetEstateId}'`);
        }
        if (targetDivision && bed.divisionId && bed.divisionId.toUpperCase() !== targetDivision.toUpperCase()) {
          errors.push(`Bedengan '${bed.name || bedId}' tidak berada di Divisi '${targetDivision}'`);
        }
        if (prog && bed.programId && bed.programId !== prog.id && bed.programId !== prog.code && (!prog.legacyCodes || !prog.legacyCodes.includes(bed.programId))) {
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
    list = list.filter(b => {
      const ctx = getBatchContext(b.id || b.batchId) || b;
      return (ctx.estateId || '').toUpperCase() === cleanEst;
    });
  }

  if (filters.divisionId) {
    const cleanDiv = String(filters.divisionId).trim().toUpperCase();
    list = list.filter(b => {
      const ctx = getBatchContext(b.id || b.batchId) || b;
      return (ctx.divisionId || '').toUpperCase() === cleanDiv;
    });
  }

  if (filters.programId) {
    const prog = resolveProgram(filters.programId);
    const targetProgId = prog ? prog.id : String(filters.programId).trim();
    list = list.filter(b => {
      const ctx = getBatchContext(b.id || b.batchId) || b;
      return ctx.programId === targetProgId || ctx.programCode === targetProgId;
    });
  }

  if (filters.cloneId || filters.clone || filters.klon) {
    const target = normalizeKlonName(filters.cloneId || filters.clone || filters.klon).toUpperCase();
    list = list.filter(b => normalizeKlonName(b.clone || b.klon || b.cloneId).toUpperCase() === target);
  }

  if (filters.growthStage || filters.stage) {
    const stage = String(filters.growthStage || filters.stage).trim().toUpperCase();
    list = list.filter(b => (b.growthStage || b.stage || '').toUpperCase() === stage);
  }

  if (filters.statusMaster) {
    list = list.filter(b => (b.statusMaster || (b.status === BATCH_STATUS.INACTIVE ? BATCH_MASTER_STATUS.INACTIVE : BATCH_MASTER_STATUS.ACTIVE)) === filters.statusMaster);
  }

  if (filters.status) {
    list = list.filter(b => b.status === filters.status || b.statusMaster === filters.status);
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
  return all.filter(b => {
    const isMasterActive = (b.statusMaster || (b.status === BATCH_STATUS.INACTIVE ? BATCH_MASTER_STATUS.INACTIVE : BATCH_MASTER_STATUS.ACTIVE)) === BATCH_MASTER_STATUS.ACTIVE && b.status !== BATCH_STATUS.INACTIVE;
    if (!isMasterActive) return false;
    if (filters.openProgramOnly !== false && b.programId) {
      if (!isProgramOpen(b.programId)) return false;
    }
    return true;
  });
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
    (b.batchNo || '').toLowerCase() === clean ||
    (b.id || '').toLowerCase() === clean ||
    (b.batchId || '').toLowerCase() === clean
  ) || null;
}

export function getBatchesByEstate(estateId) {
  return getAllBatches({ estateId });
}

export function getBatchesByDivision(divisionId) {
  return getAllBatches({ divisionId });
}

export function getBatchesByProgram(programId) {
  return getAllBatches({ programId });
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
  if (!b) return false;
  return (b.statusMaster || (b.status === BATCH_STATUS.INACTIVE ? BATCH_MASTER_STATUS.INACTIVE : BATCH_MASTER_STATUS.ACTIVE)) === BATCH_MASTER_STATUS.ACTIVE;
}

export function getAvailableBatchStock(id) {
  const b = getBatchById(id);
  if (!b || b.statusMaster === BATCH_MASTER_STATUS.INACTIVE || b.status === BATCH_STATUS.INACTIVE) return 0;
  return getInventoryAvailableQty(b.id || b.batchId || b.batchCode || id);
}

/**
 * Menghasilkan candidate identity berikutnya untuk Master Batch
 * Format:
 * - Kode: BTCH-001, BTCH-002, BTCH-003, dst.
 * - Nama: Batch-001, Batch-002, Batch-003, dst.
 * Sequence aman & unik dimulai dari 001.
 */
export function getNextBatchCandidate(programId, estateId, divisionId) {
  if (!programId || !estateId || !divisionId) return null;

  const allBatches = getAllBatches({}); // includes INACTIVE & EMPTY

  let maxSeq = 0;
  allBatches.forEach(b => {
    const codeMatch = String(b.batchCode || b.batchNo || '').match(/BTCH-(\d+)/i);
    const nameMatch = String(b.name || '').match(/Batch-(\d+)/i);
    if (codeMatch) {
      const num = parseInt(codeMatch[1], 10);
      if (num > maxSeq) maxSeq = num;
    } else if (nameMatch) {
      const num = parseInt(nameMatch[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });

  let nextSeq = maxSeq + 1;
  let candidateCode = `BTCH-${String(nextSeq).padStart(3, '0')}`;
  let candidateName = `Batch-${String(nextSeq).padStart(3, '0')}`;

  while (
    allBatches.some(b => 
      String(b.batchCode || b.batchNo || '').toUpperCase() === candidateCode.toUpperCase() ||
      String(b.name || '').toUpperCase() === candidateName.toUpperCase()
    )
  ) {
    nextSeq++;
    candidateCode = `BTCH-${String(nextSeq).padStart(3, '0')}`;
    candidateName = `Batch-${String(nextSeq).padStart(3, '0')}`;
  }

  const estShort = String(estateId).replace(/^EST-/, '').toUpperCase();
  const candidateId = `BATCH-${estShort}-${Date.now().toString().slice(-4)}-${String(nextSeq).padStart(3, '0')}`;
  const candidateQR = `SIGMA-${candidateCode}`;

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
  if (data.status !== BATCH_STATUS.CREATED && data.initialQty !== undefined && (initialQty <= 0 || isNaN(initialQty))) {
    throw new Error('Kuantitas awal (Initial Qty) harus berupa angka lebih dari 0');
  } else if (initialQty < 0 || isNaN(initialQty)) {
    throw new Error('Kuantitas awal (Initial Qty) tidak boleh negatif');
  }

  // Relations Check & Context Inheritance
  const relCheck = validateBatchRelations({
    programId: data.programId,
    estateId: data.estateId,
    divisionId: data.divisionId,
    clone: data.clone || data.klon || data.cloneId,
    bedenganIds: data.bedenganIds || [],
    blockId: data.blockId,
    blockCode: data.blockCode
  });
  if (!relCheck.valid) {
    throw new Error(relCheck.errors.join('. '));
  }

  const program = relCheck.program;
  const finalEstateId = data.estateId || program?.estateId;
  const finalDivisionId = data.divisionId || program?.divisionId;
  const finalBlockId = data.blockId !== undefined ? data.blockId : (program?.blockId || null);
  const finalBlockCode = data.blockCode !== undefined ? data.blockCode : (program?.blockCode || null);

  // Scope & Role Check
  validateBatchUserScope(ctx, finalEstateId, finalDivisionId, 'menambah');

  const list = _loadBatchesFromStorage();

  const cleanCode = String(data.batchCode).trim().toUpperCase();
  if (list.some(b => (b.batchCode || '').toUpperCase() === cleanCode)) {
    throw new Error(`Kode Batch '${data.batchCode}' sudah digunakan`);
  }

  let newId = data.batchId || data.id;
  if (!newId) {
    let candidate = `BATCH-${finalEstateId || 'EST'}-${Date.now().toString().slice(-6)}`;
    let counter = 1;
    while (list.some(b => b.id === candidate || b.batchId === candidate)) {
      candidate = `BATCH-${finalEstateId || 'EST'}-${Date.now().toString().slice(-6)}-${counter++}`;
    }
    newId = candidate;
  }
  if (list.some(b => b.id === newId || b.batchId === newId)) {
    throw new Error(`Batch ID '${newId}' sudah digunakan`);
  }

  const now = new Date().toISOString();
  const estObj = getEstateById(finalEstateId);
  const divs = getNurseryDivisionsByEstate(finalEstateId);
  const divObj = divs.find(d => d.divisionId === finalDivisionId);

  const statusMasterVal = data.statusMaster || (data.status === BATCH_STATUS.INACTIVE ? BATCH_MASTER_STATUS.INACTIVE : BATCH_MASTER_STATUS.ACTIVE);

  const newBatch = {
    id: newId,
    batchId: newId,
    batchCode: String(data.batchCode).trim(),
    batchNo: String(data.batchCode).trim(),
    name: data.name ? String(data.name).trim() : `Batch ${String(data.batchCode).trim()}`,
    qrCode: data.qrCode ? String(data.qrCode).trim() : `SIGMA-${newId}`,

    programId: program ? program.id : data.programId,
    programCode: program ? program.code : (data.programCode || null),
    programName: program ? program.name : (data.programName || null),

    estateId: finalEstateId,
    estateCode: finalEstateId,
    estateName: estObj ? estObj.estate_name : finalEstateId,

    divisionId: finalDivisionId,
    divisionCode: finalDivisionId,
    divisionName: divObj ? divObj.divisionName : finalDivisionId,

    blockId: finalBlockId,
    blockCode: finalBlockCode,

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

    statusMaster: statusMasterVal,
    status: data.status || (initialQty > 0 ? BATCH_STATUS.AVAILABLE : BATCH_STATUS.CREATED),

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

  // Daftarkan Context Relasi ke Master Context Service
  setBatchContext(newBatch.id, {
    batchCode: newBatch.batchCode,
    programId: program ? program.id : data.programId,
    programCode: program ? program.code : (data.programCode || null),
    programName: program ? program.name : (data.programName || null),
    estateId: finalEstateId,
    divisionId: finalDivisionId,
    blockId: finalBlockId,
    blockCode: finalBlockCode
  });

  // Inisialisasi saldo di Inventory Ledger Service
  initBatchInventory(newBatch.id, newBatch.batchCode, initialQty, {
    createdBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN',
    notes: `Inisialisasi Master Batch ${newBatch.batchCode}`
  });

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

  // Scope & Role Check for existing and target
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
    bedenganIds: targetBedengans,
    blockId: data.blockId !== undefined ? data.blockId : existing.blockId,
    blockCode: data.blockCode !== undefined ? data.blockCode : existing.blockCode
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
  const estObj = getEstateById(targetEstate);
  const divs = getNurseryDivisionsByEstate(targetEstate);
  const divObj = divs.find(d => d.divisionId === targetDivision);

  const updated = {
    ...existing,
    batchCode: data.batchCode !== undefined ? String(data.batchCode).trim() : existing.batchCode,
    batchNo: data.batchCode !== undefined ? String(data.batchCode).trim() : existing.batchNo,
    name: data.name !== undefined ? String(data.name).trim() : existing.name,
    qrCode: data.qrCode !== undefined ? String(data.qrCode).trim() : existing.qrCode,
    programId: targetProgram,
    estateId: targetEstate,
    estateCode: targetEstate,
    estateName: estObj ? estObj.estate_name : targetEstate,
    divisionId: targetDivision,
    divisionCode: targetDivision,
    divisionName: divObj ? divObj.divisionName : targetDivision,
    blockId: data.blockId !== undefined ? data.blockId : existing.blockId,
    blockCode: data.blockCode !== undefined ? data.blockCode : existing.blockCode,
    cloneId: relCheck.cloneName,
    clone: relCheck.cloneName,
    klon: relCheck.cloneName,
    growthStage: data.growthStage || data.stage || existing.growthStage,
    stage: data.growthStage || data.stage || existing.stage,
    category: data.category || existing.category,
    bedenganIds: Array.isArray(targetBedengans) ? targetBedengans : existing.bedenganIds,
    statusMaster: data.statusMaster !== undefined ? data.statusMaster : (data.status === BATCH_STATUS.INACTIVE ? BATCH_MASTER_STATUS.INACTIVE : (existing.statusMaster || BATCH_MASTER_STATUS.ACTIVE)),
    status: data.status !== undefined ? data.status : existing.status,
    updatedAt: now,
    updatedBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN'
  };

  list[idx] = updated;
  _saveBatchesToStorage(list);

  // Perbarui Context Relasi di Master Context Service (dengan proteksi immutability program/estate)
  setBatchContext(id, {
    batchCode: updated.batchCode,
    programId: targetProgram,
    estateId: targetEstate,
    divisionId: targetDivision,
    blockId: updated.blockId,
    blockCode: updated.blockCode
  });

  return updated;
}

/**
 * ACTIVATE Master Batch (Administrative Status Update Only)
 */
export function activateBatch(id, currentUser = null) {
  return updateBatch(id, { 
    statusMaster: BATCH_MASTER_STATUS.ACTIVE,
    status: BATCH_STATUS.AVAILABLE 
  }, currentUser);
}

/**
 * DEACTIVATE Master Batch (Administrative Status Update Only)
 */
export function deactivateBatch(id, currentUser = null) {
  return updateBatch(id, { 
    statusMaster: BATCH_MASTER_STATUS.INACTIVE,
    status: BATCH_STATUS.INACTIVE 
  }, currentUser);
}

const TRANSACTION_STORAGE_KEYS = [
  'requests_transactions', 'requests', 'dispatch_transactions',
  'receipt_ksp_transactions', 'receipt_transactions', 'nursery_activity_records',
  'entres_transactions', 'entres_menunas_transactions', 'entres_topping_transactions',
  'materials_transactions', 'seeding_transactions', 'budding_transactions',
  'inspection_transactions', 'attendance_transactions', 'selection_transactions',
  'destruction_transactions', 'verification_transactions',
  'selection_pool', 'regrafting_pool'
];

/**
 * Memeriksa apakah batch sudah pernah digunakan dalam transaksi
 */
export function isBatchUsedInTransactions(batchId, batchCode = null) {
  if (!batchId && !batchCode) return false;

  for (const key of TRANSACTION_STORAGE_KEYS) {
    const records = storage.get(key, []);
    if (Array.isArray(records) && records.length > 0) {
      const serialized = JSON.stringify(records);
      if (batchId && serialized.includes(`"${batchId}"`)) return true;
      if (batchCode && serialized.includes(`"${batchCode}"`)) return true;
      // Periksa property matching langsung
      const matched = records.some(r => 
        (batchId && (r.batchId === batchId || r.batch_id === batchId || r.batchCode === batchId || r.id === batchId)) ||
        (batchCode && (r.batchCode === batchCode || r.batch_code === batchCode || r.batchNo === batchCode || r.batch_no === batchCode || r.batchName === batchCode))
      );
      if (matched) return true;
    }
  }

  return false;
}

/**
 * DELETE Master Batch
 * Aturan:
 * - Jika record belum pernah digunakan pada transaksi: hard delete diperbolehkan.
 * - Jika record sudah memiliki referensi transaksi: hard delete DITOLAK -> status diubah menjadi INACTIVE (soft delete).
 */
export function deleteBatch(id, currentUser = null) {
  const ctx = currentUser || getCurrentUserContext();
  const list = _loadBatchesFromStorage();

  const idx = list.findIndex(b => b.id === id || b.batchId === id);
  if (idx === -1) {
    throw new Error(`Batch dengan ID '${id}' tidak ditemukan`);
  }

  const existing = list[idx];

  // Scope & Role Check
  validateBatchUserScope(ctx, existing.estateId, existing.divisionId, 'menghapus');

  const isUsed = isBatchUsedInTransactions(existing.id || existing.batchId, existing.batchCode || existing.batchNo);

  if (isUsed) {
    // Soft Delete: Ubah statusMaster & status menjadi INACTIVE untuk menjaga integritas histori transaksi
    const now = new Date().toISOString();
    existing.statusMaster = BATCH_MASTER_STATUS.INACTIVE;
    existing.status = BATCH_STATUS.INACTIVE;
    existing.updatedAt = now;
    existing.updatedBy = ctx.userId || ctx.id || 'ASISTEN_BIBITAN';

    list[idx] = existing;
    _saveBatchesToStorage(list);

    return {
      success: true,
      softDeleted: true,
      batch: existing,
      message: `Batch '${existing.batchCode || existing.batchNo}' sudah digunakan dalam data transaksi. Status diubah menjadi Nonaktif (INACTIVE) untuk menjaga histori.`
    };
  } else {
    // Hard Delete: Hapus permanen dari storage
    list.splice(idx, 1);
    _saveBatchesToStorage(list);

    return {
      success: true,
      softDeleted: false,
      batch: existing,
      message: `Batch '${existing.batchCode || existing.batchNo}' berhasil dihapus secara permanen.`
    };
  }
}

/**
 * Mutasi Stok Transaksional (Deduct Stock) - Delegasi ke Inventory Service
 */
export function deductBatchStock(batchIdOrCode, qty, reason = 'DISPATCH') {
  const txType = reason === 'SELECTION' ? INVENTORY_TX_TYPE.SELECTION : (reason === 'DESTRUCTION' ? INVENTORY_TX_TYPE.DESTRUCTION : INVENTORY_TX_TYPE.DISPATCH);
  deductInventoryStock(batchIdOrCode, qty, txType, null, null, `Deduct stock via batch-master (${reason})`);
  return getBatchById(batchIdOrCode) || getBatchByCode(batchIdOrCode) || { id: batchIdOrCode };
}

/**
 * Mutasi Stok Transaksional (Add Stock from Receipt KSP) - Delegasi ke Inventory Service
 */
export function addBatchStockFromReceipt(batchIdOrCode, qty, receiptId = null) {
  addInventoryStockFromReceipt(batchIdOrCode, qty, receiptId, null, 'Add stock via batch-master');
  return getBatchById(batchIdOrCode) || getBatchByCode(batchIdOrCode) || { id: batchIdOrCode };
}

/**
 * Legacy Compatibility: Resolve Batch
 */
export function resolveBatchLegacy(value) {
  const b = getBatchById(value) || getBatchByCode(value);
  if (b) return b;
  return {
    id: String(value || 'BATCH-001'),
    batchId: String(value || 'BATCH-001'),
    batchCode: String(value || 'BTCH-001'),
    name: String(value || 'Batch-001'),
    status: BATCH_STATUS.EMPTY,
    statusMaster: BATCH_MASTER_STATUS.ACTIVE,
    availableQty: 0
  };
}
