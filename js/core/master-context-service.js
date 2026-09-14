/**
 * js/core/master-context-service.js
 * CONTEXT RELATION LAYER UNTUK MASTER BEDENGAN & MASTER BATCH
 * (TASK-REFACTOR-MASTER-CONTEXT-RELATION-01)
 * 
 * Prinsip:
 * - Memisahkan identitas murni Master Bedengan & Master Batch dari context relasi:
 *   Program, Kebun (Estate), Divisi (Division), dan Blok (Block).
 * - Master Data hanya menjadi pure identity & status.
 * - Context Relation Layer menjadi sumber informasi relasi scope operasional & bisnis.
 * - Context relation bersifat IMMUTABLE terhadap identity master yang sudah dibuat.
 * - Mendukung Single Source of Truth untuk Cross-Estate Isolation & Transaction Context Resolution.
 */

import { storage } from './storage.js';
import { resolveProgram } from '../data/program-master.js';
import { resolveEstate, getNurseryDivisionsByEstate } from '../data/estate-master.js';
import { getBlockById, getBlockByCode } from '../data/block-master.js';

export const STORAGE_KEY_BEDENGAN_CONTEXT = 'bedengan_context_relations';
export const STORAGE_KEY_BATCH_CONTEXT = 'batch_context_relations';

/**
 * Memuat data relasi context Bedengan
 */
function _loadBedenganContexts() {
  const list = storage.get(STORAGE_KEY_BEDENGAN_CONTEXT, null);
  if (list === null || !Array.isArray(list)) {
    return [];
  }
  return list;
}

/**
 * Menyimpan data relasi context Bedengan
 */
function _saveBedenganContexts(contexts) {
  storage.set(STORAGE_KEY_BEDENGAN_CONTEXT, contexts);
}

/**
 * Memuat data relasi context Batch
 */
function _loadBatchContexts() {
  const list = storage.get(STORAGE_KEY_BATCH_CONTEXT, null);
  if (list === null || !Array.isArray(list)) {
    return [];
  }
  return list;
}

/**
 * Menyimpan data relasi context Batch
 */
function _saveBatchContexts(contexts) {
  storage.set(STORAGE_KEY_BATCH_CONTEXT, contexts);
}

/**
 * Helper: Normalisasi Payload Context
 */
function _normalizeContextPayload(data) {
  const prog = resolveProgram(data.programId || data.programCode || data.program);
  const progId = prog ? prog.id : (data.programId || null);
  const progCode = prog ? prog.code : (data.programCode || null);
  const progName = prog ? prog.name : (data.programName || null);

  const est = resolveEstate(data.estateId || data.estateCode || data.estateName || data.estate);
  const estId = est ? est.estate_id : (data.estateId || null);
  const estCode = est ? est.estate_code : (data.estateCode || estId);
  const estName = est ? est.estate_name : (data.estateName || estId);

  const divId = data.divisionId || data.divisionCode || (data.division && (data.division.divisionId || data.division.id)) || null;
  const divCode = data.divisionCode || divId;
  const divName = data.divisionName || divId;

  const blk = (data.blockId ? getBlockById(data.blockId) : null) || (data.blockCode ? getBlockByCode(data.blockCode) : null);
  const blkId = blk ? (blk.id || blk.blockId) : (data.blockId || null);
  const blkCode = blk ? (blk.blockCode || blk.blockNo) : (data.blockCode || blkId);

  return {
    programId: progId,
    programCode: progCode,
    programName: progName,
    estateId: estId,
    estateCode: estCode,
    estateName: estName,
    divisionId: divId,
    divisionCode: divCode,
    divisionName: divName,
    blockId: blkId,
    blockCode: blkCode
  };
}

// ============================================================================
// BEDENGAN CONTEXT METHODS
// ============================================================================

/**
 * Mengambil context relasi dari Bedengan berdasarkan ID atau Kode
 * @param {string} bedenganIdOrCode 
 * @returns {Object|null}
 */
export function getBedenganContext(bedenganIdOrCode) {
  if (!bedenganIdOrCode) return null;
  const clean = String(bedenganIdOrCode).trim();

  const list = _loadBedenganContexts();
  let found = list.find(c => 
    c.bedenganId === clean || 
    c.bedenganCode === clean ||
    (c.id && c.id === clean) ||
    (c.kode && c.kode === clean)
  );

  if (found) {
    return { ...found };
  }

  // Fallback bootstrap dari bedengan_master jika belum tersimpan di context relation
  const masterList = storage.get('bedengan_master', []);
  const masterBed = masterList.find(b => 
    b.bedenganId === clean || 
    b.bedenganCode === clean ||
    b.id === clean ||
    b.kode === clean ||
    (b.name && b.name.toLowerCase() === clean.toLowerCase())
  );

  if (masterBed) {
    const norm = _normalizeContextPayload(masterBed);
    const contextObj = {
      bedenganId: masterBed.bedenganId || masterBed.id,
      bedenganCode: masterBed.bedenganCode || masterBed.kode || masterBed.name,
      ...norm,
      createdAt: masterBed.createdAt || new Date().toISOString(),
      updatedAt: masterBed.updatedAt || new Date().toISOString()
    };

    list.push(contextObj);
    _saveBedenganContexts(list);
    return { ...contextObj };
  }

  return null;
}

/**
 * Menyimpan / mendaftarkan context relasi untuk Bedengan
 * @param {string} bedenganId 
 * @param {Object} contextData 
 * @returns {Object}
 */
export function setBedenganContext(bedenganId, contextData = {}) {
  if (!bedenganId) {
    throw new Error('bedenganId wajib diisi untuk registrasi context.');
  }

  const list = _loadBedenganContexts();
  const existingIdx = list.findIndex(c => c.bedenganId === bedenganId || (c.bedenganCode && c.bedenganCode === contextData.bedenganCode));

  const norm = _normalizeContextPayload(contextData);

  // Business Rule: Immutability check jika sudah ada context sebelumnya
  if (existingIdx !== -1) {
    const existing = list[existingIdx];
    if (existing.programId && norm.programId && existing.programId !== norm.programId) {
      throw new Error(`Bedengan '${existing.bedenganCode || bedenganId}' tidak dapat dipindahkan ke Program lain (Program saat ini: ${existing.programId}, Diminta: ${norm.programId}).`);
    }
    if (existing.estateId && norm.estateId && existing.estateId !== norm.estateId) {
      throw new Error(`Bedengan '${existing.bedenganCode || bedenganId}' tidak dapat dipindahkan ke Estate lain (Estate saat ini: ${existing.estateId}, Diminta: ${norm.estateId}).`);
    }
  }

  const now = new Date().toISOString();
  const contextObj = {
    bedenganId: bedenganId,
    bedenganCode: contextData.bedenganCode || (existingIdx !== -1 ? list[existingIdx].bedenganCode : bedenganId),
    ...norm,
    createdAt: existingIdx !== -1 ? list[existingIdx].createdAt : (contextData.createdAt || now),
    updatedAt: now
  };

  if (existingIdx !== -1) {
    list[existingIdx] = contextObj;
  } else {
    list.push(contextObj);
  }

  _saveBedenganContexts(list);
  return contextObj;
}

/**
 * Mengambil daftar ID Bedengan yang sesuai dengan filter context
 * @param {Object} filters - { estateId, divisionId, programId, blockId }
 * @returns {Array<Object>}
 */
export function getBedengansByContext(filters = {}) {
  let list = _loadBedenganContexts();

  // Pastikan bootstrap dari bedengan_master jika context list masih kosong
  if (list.length === 0) {
    const masterList = storage.get('bedengan_master', []);
    masterList.forEach(m => {
      getBedenganContext(m.bedenganId || m.id);
    });
    list = _loadBedenganContexts();
  }

  return list.filter(c => {
    if (filters.estateId) {
      const cleanEst = String(filters.estateId).trim().toUpperCase();
      if ((c.estateId || '').toUpperCase() !== cleanEst) return false;
    }
    if (filters.divisionId) {
      const cleanDiv = String(filters.divisionId).trim().toUpperCase();
      if ((c.divisionId || '').toUpperCase() !== cleanDiv) return false;
    }
    if (filters.programId) {
      const prog = resolveProgram(filters.programId);
      const targetProgId = prog ? prog.id : String(filters.programId).trim();
      if (c.programId !== targetProgId && c.programCode !== targetProgId) return false;
    }
    if (filters.blockId) {
      if (c.blockId !== filters.blockId && c.blockCode !== filters.blockId) return false;
    }
    return true;
  });
}

// ============================================================================
// BATCH CONTEXT METHODS
// ============================================================================

/**
 * Mengambil context relasi dari Batch berdasarkan ID atau Kode
 * @param {string} batchIdOrCode 
 * @returns {Object|null}
 */
export function getBatchContext(batchIdOrCode) {
  if (!batchIdOrCode) return null;
  const clean = String(batchIdOrCode).trim();

  const list = _loadBatchContexts();
  let found = list.find(c => 
    c.batchId === clean || 
    c.batchCode === clean ||
    (c.id && c.id === clean) ||
    (c.kode && c.kode === clean) ||
    (c.batchNo && c.batchNo === clean)
  );

  if (found) {
    return { ...found };
  }

  // Fallback bootstrap dari nursery_batches jika belum ada di relation layer
  const masterList = storage.get('nursery_batches', []);
  const masterBatch = masterList.find(b => 
    b.id === clean || 
    b.batchId === clean || 
    b.batchCode === clean || 
    b.batchNo === clean ||
    b.kode === clean
  );

  if (masterBatch) {
    const norm = _normalizeContextPayload(masterBatch);
    const contextObj = {
      batchId: masterBatch.id || masterBatch.batchId || clean,
      batchCode: masterBatch.batchCode || masterBatch.batchNo || masterBatch.kode || clean,
      ...norm,
      createdAt: masterBatch.createdAt || new Date().toISOString(),
      updatedAt: masterBatch.updatedAt || new Date().toISOString()
    };

    list.push(contextObj);
    _saveBatchContexts(list);
    return { ...contextObj };
  }

  return null;
}

/**
 * Menyimpan / mendaftarkan context relasi untuk Batch
 * @param {string} batchId 
 * @param {Object} contextData 
 * @returns {Object}
 */
export function setBatchContext(batchId, contextData = {}) {
  if (!batchId) {
    throw new Error('batchId wajib diisi untuk registrasi context.');
  }

  const list = _loadBatchContexts();
  const existingIdx = list.findIndex(c => c.batchId === batchId || (c.batchCode && c.batchCode === contextData.batchCode));

  const norm = _normalizeContextPayload(contextData);

  // Business Rule: Immutability check jika sudah ada context sebelumnya
  if (existingIdx !== -1) {
    const existing = list[existingIdx];
    if (existing.programId && norm.programId && existing.programId !== norm.programId) {
      throw new Error(`Batch '${existing.batchCode || batchId}' tidak dapat dipindahkan ke Program lain (Program saat ini: ${existing.programId}, Diminta: ${norm.programId}).`);
    }
    if (existing.estateId && norm.estateId && existing.estateId !== norm.estateId) {
      throw new Error(`Batch '${existing.batchCode || batchId}' tidak dapat dipindahkan ke Estate lain (Estate saat ini: ${existing.estateId}, Diminta: ${norm.estateId}).`);
    }
  }

  const now = new Date().toISOString();
  const contextObj = {
    batchId: batchId,
    batchCode: contextData.batchCode || (existingIdx !== -1 ? list[existingIdx].batchCode : batchId),
    ...norm,
    createdAt: existingIdx !== -1 ? list[existingIdx].createdAt : (contextData.createdAt || now),
    updatedAt: now
  };

  if (existingIdx !== -1) {
    list[existingIdx] = contextObj;
  } else {
    list.push(contextObj);
  }

  _saveBatchContexts(list);
  return contextObj;
}

/**
 * Mengambil daftar ID Batch yang sesuai dengan filter context
 * @param {Object} filters - { estateId, divisionId, programId, blockId }
 * @returns {Array<Object>}
 */
export function getBatchesByContext(filters = {}) {
  let list = _loadBatchContexts();

  // Pastikan bootstrap dari nursery_batches jika context list masih kosong
  if (list.length === 0) {
    const masterList = storage.get('nursery_batches', []);
    masterList.forEach(m => {
      getBatchContext(m.id || m.batchId);
    });
    list = _loadBatchContexts();
  }

  return list.filter(c => {
    if (filters.estateId) {
      const cleanEst = String(filters.estateId).trim().toUpperCase();
      if ((c.estateId || '').toUpperCase() !== cleanEst) return false;
    }
    if (filters.divisionId) {
      const cleanDiv = String(filters.divisionId).trim().toUpperCase();
      if ((c.divisionId || '').toUpperCase() !== cleanDiv) return false;
    }
    if (filters.programId) {
      const prog = resolveProgram(filters.programId);
      const targetProgId = prog ? prog.id : String(filters.programId).trim();
      if (c.programId !== targetProgId && c.programCode !== targetProgId) return false;
    }
    if (filters.blockId) {
      if (c.blockId !== filters.blockId && c.blockCode !== filters.blockId) return false;
    }
    return true;
  });
}

// ============================================================================
// SECURITY & CROSS-ESTATE ISOLATION VALIDATORS
// ============================================================================

/**
 * Validasi akses pengguna terhadap context data (Cross-Estate Isolation)
 * @param {Object} contextObj - Objek context dari Bedengan atau Batch
 * @param {Object} userContext - Sesi user aktif { estateId, divisionId, role, ... }
 * @param {string} actionName - Nama aksi untuk pesan error
 * @returns {boolean}
 */
export function validateCrossEstateContext(contextObj, userContext, actionName = 'mengakses') {
  if (!contextObj || !userContext) return true;

  // Jika user memiliki scope estate (misal ASISTEN_BIBITAN atau MANTRI_BIBITAN)
  const userEstate = (userContext.estateId || '').trim().toUpperCase();
  const contextEstate = (contextObj.estateId || '').trim().toUpperCase();

  if (userEstate && contextEstate && userEstate !== contextEstate) {
    throw new Error(`Akses ditolak: User dari kebun '${userEstate}' tidak memiliki hak untuk ${actionName} data di kebun '${contextEstate}'.`);
  }

  return true;
}

/**
 * Reset seluruh context relation ke baseline kosong
 */
export function resetContextRelationsToDefault() {
  storage.set(STORAGE_KEY_BEDENGAN_CONTEXT, []);
  storage.set(STORAGE_KEY_BATCH_CONTEXT, []);
}
