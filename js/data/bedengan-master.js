/**
 * data/bedengan-master.js — Master Data & Service Terpusat Master Bedengan (TASK ASB-03 & TASK-IMPLEMENT-PROGRAM-MASTER-01).
 * 
 * Prinsip:
 * - "SINGLE SOURCE OF TRUTH"
 * - Dikelola oleh Role ASISTEN_BIBITAN (CRUD, Activate/Deactivate)
 * - Dibaca oleh MANTRI_BIBITAN (Read-only / Consumer)
 * - Status Master Bedengan: ACTIVE / INACTIVE
 * - Program Pembibitan terintegrasi dengan data/program-master.js (Status: OPEN / CLOSE)
 * - Estate & Divisi terintegrasi dengan data/estate-master.js
 * - Dilindungi dari pembersihan Clean All (Master Data)
 */

import { storage } from '../core/storage.js';
import { ROLES, normalizeRole, getCurrentUserContext } from '../core/user-context.js';
import { getOpenPrograms, getActivePrograms, getProgramById, resolveProgram, isProgramOpen } from './program-master.js';
import { getActiveEstates, getEstateById, getNurseryDivisionsByEstate, resolveNurseryDivision } from './estate-master.js';
import { getAllBatches } from './batch-master.js';
import { 
  getBedenganContext, 
  setBedenganContext, 
  getBedengansByContext, 
  validateCrossEstateContext 
} from '../core/master-context-service.js';

export const BEDENGAN_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  // Compatibility aliases
  AVAILABLE: 'ACTIVE',
  OCCUPIED: 'ACTIVE',
  MAINTENANCE: 'ACTIVE'
});

export const STORAGE_KEY_BEDENGAN_MASTER = 'bedengan_master';

/**
 * Baseline Default Data Master Bedengan (Canonical Seed)
 * Baseline production/prototype: Dimulai dari [] (kosong)
 */
export const DEFAULT_BEDENGAN_MASTER = Object.freeze([]);

const OLD_LEGACY_BEDENGAN_IDS = new Set([
  'BED-TBS-D1-001', 'BED-TBS-D1-002', 'BED-TBS-D1-003', 'BED-TBS-D1-004', 'BED-TBS-D1-005',
  'BED-TBS-D1-006', 'BED-TBS-D1-007', 'BED-TBS-D1-008', 'BED-TBS-D1-009', 'BED-TBS-D1-010',
  'BED-APM-D2-001', 'BED-APM-D2-002'
]);

/**
 * Mengambil dataset raw dari storage dengan inisialisasi default
 */
function _loadBedenganFromStorage() {
  let stored = storage.get(STORAGE_KEY_BEDENGAN_MASTER, null);
  if (stored === null || !Array.isArray(stored)) {
    const cloned = JSON.parse(JSON.stringify(DEFAULT_BEDENGAN_MASTER));
    storage.set(STORAGE_KEY_BEDENGAN_MASTER, cloned);
    return cloned;
  }
  // Hard-clear: Sanitize out any legacy seed bedengans lingering in browser runtime storage
  if (stored.some(b => OLD_LEGACY_BEDENGAN_IDS.has(b.bedenganId) || (b.createdAt === '2026-01-01T08:00:00.000Z' && (b.createdBy === 'USR-ASB-TBS' || b.createdBy === 'USR-ASB-APM')))) {
    stored = stored.filter(b => !OLD_LEGACY_BEDENGAN_IDS.has(b.bedenganId) && !(b.createdAt === '2026-01-01T08:00:00.000Z' && (b.createdBy === 'USR-ASB-TBS' || b.createdBy === 'USR-ASB-APM')));
    storage.set(STORAGE_KEY_BEDENGAN_MASTER, stored);
  }
  return stored;
}

/**
 * Menyimpan dataset ke storage
 */
function _saveBedenganToStorage(list) {
  storage.set(STORAGE_KEY_BEDENGAN_MASTER, list);
}

/**
 * Reset master bedengan ke baseline (utility)
 */
export function resetBedenganMasterToDefault() {
  const cloned = JSON.parse(JSON.stringify(DEFAULT_BEDENGAN_MASTER));
  storage.set(STORAGE_KEY_BEDENGAN_MASTER, cloned);
  return cloned;
}

/**
 * Helper validasi relasi program, estate, divisi, dan block
 */
export function validateBedenganRelations({ programId, estateId, divisionId, blockId, blockCode }) {
  const errors = [];

  // 1. Validasi Program
  const program = getProgramById(programId) || resolveProgram(programId);
  if (!program) {
    errors.push(`Program dengan ID/Kode '${programId}' tidak ditemukan`);
  } else if (!isProgramOpen(program.id || programId)) {
    errors.push('Program pembibitan sudah berstatus Close dan tidak dapat digunakan untuk membuat Master Bedengan.');
  }

  // 2. Validasi Estate & Context Inheritance
  const targetEstateId = estateId || program?.estateId;
  const estate = getEstateById(targetEstateId);
  if (!estate) {
    errors.push(`Estate dengan ID '${targetEstateId}' tidak valid`);
  } else if (program && program.estateId && estateId && String(program.estateId).toUpperCase() !== String(estateId).toUpperCase() && !program.estateIds?.some(e => e.toUpperCase() === String(estateId).toUpperCase())) {
    errors.push(`Program '${program.code || programId}' terdaftar pada Estate '${program.estateName || program.estateId}', tidak cocok dengan Estate target '${estateId}'`);
  }

  // 3. Validasi Divisi dalam Estate
  const targetDivision = divisionId || program?.divisionId;
  if (estate && targetDivision) {
    const validDivisions = getNurseryDivisionsByEstate(estate.estate_id || targetEstateId);
    const divMatch = validDivisions.some(d => 
      d.divisionId.toUpperCase() === targetDivision.toUpperCase() ||
      d.divisionCode.toUpperCase() === targetDivision.toUpperCase()
    );
    if (!divMatch) {
      errors.push(`Divisi '${targetDivision}' tidak terdaftar pada Estate '${estate.estate_name || targetEstateId}'`);
    } else if (program && program.divisionId && divisionId && String(program.divisionId).toUpperCase() !== String(divisionId).toUpperCase() && !program.divisionIds?.some(d => d.toUpperCase() === String(divisionId).toUpperCase())) {
      errors.push(`Program '${program.code || programId}' terdaftar pada Divisi '${program.divisionName || program.divisionId}', tidak cocok dengan Divisi target '${divisionId}'`);
    }
  } else if (!targetDivision) {
    errors.push('Divisi wajib dipilih');
  }

  // 4. Validasi Blok (jika diberikan)
  if (program && (blockId || blockCode)) {
    const pBlock = program.blockCode || program.blockId;
    const tBlock = blockCode || blockId;
    if (pBlock && tBlock && String(pBlock).toUpperCase() !== String(tBlock).toUpperCase() && String(program.blockId || '').toUpperCase() !== String(blockId || '').toUpperCase()) {
      errors.push(`Blok '${tBlock}' tidak sesuai dengan Blok Bibitan Program '${pBlock}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    program,
    estate
  };
}

/**
 * Helper validasi otorisasi & scope user
 */
export function validateUserScopeAndRole(user, targetEstateId, targetDivisionId, actionName = 'mengubah') {
  const ctx = user || getCurrentUserContext();
  const normalized = normalizeRole(ctx.role);

  if (normalized !== ROLES.ASISTEN_BIBITAN) {
    throw new Error(`Akses ditolak: Hanya role ASISTEN_BIBITAN yang berwenang ${actionName} Master Bedengan.`);
  }

  const userEstate = String(ctx.estateId || '').trim().toUpperCase();
  const userDivision = String(ctx.divisionId || '').trim().toUpperCase();

  const targetEstate = String(targetEstateId || '').trim().toUpperCase();
  const targetDivision = String(targetDivisionId || '').trim().toUpperCase();

  const matchEstate = !userEstate || userEstate === targetEstate ||
    (userEstate.includes('TBS') && targetEstate.includes('TBS')) ||
    (userEstate.includes('APM') && targetEstate.includes('APM'));

  if (!matchEstate) {
    throw new Error(`Akses ditolak: User tidak memiliki akses pada Estate '${targetEstateId}'.`);
  }

  // Jika user terkunci pada divisi tertentu
  if (userDivision && targetDivision) {
    const matchDiv = userDivision === targetDivision ||
      (userDivision === 'DIV-001' && targetDivision === 'DIV-001') ||
      (userDivision === 'DIV-APM-02' && targetDivision === 'DIV-APM-02');
    if (!matchDiv) {
      throw new Error(`Akses ditolak: User tidak memiliki akses pada Divisi '${targetDivisionId}'.`);
    }
  }

  return true;
}

/**
 * Mengambil semua bedengan dengan filter opsional
 */
export function getAllBedengan(filters = {}) {
  let list = _loadBedenganFromStorage();

  return list.filter(b => {
    const ctx = getBedenganContext(b.bedenganId) || b;
    if (filters.estateId) {
      const cleanEstate = String(filters.estateId).trim().toUpperCase();
      if ((ctx.estateId || '').toUpperCase() !== cleanEstate) return false;
    }

    if (filters.divisionId) {
      const cleanDiv = String(filters.divisionId).trim().toUpperCase();
      if ((ctx.divisionId || '').toUpperCase() !== cleanDiv) return false;
    }

    if (filters.programId) {
      const prog = resolveProgram(filters.programId);
      const targetProgId = prog ? prog.id : String(filters.programId).trim();
      if (ctx.programId !== targetProgId && ctx.programCode !== targetProgId) return false;
    }

    if (filters.status) {
      if (b.status !== filters.status) return false;
    }

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      const match = (b.bedenganCode || '').toLowerCase().includes(q) ||
        (b.name || '').toLowerCase().includes(q) ||
        (b.qrCode && b.qrCode.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Mengambil bedengan berstatus aktif (status === ACTIVE atau status !== INACTIVE)
 */
export function getActiveBedengan(filters = {}) {
  const all = getAllBedengan(filters);
  return all.filter(b => {
    const isActive = b.status === BEDENGAN_STATUS.ACTIVE || b.status !== BEDENGAN_STATUS.INACTIVE;
    if (!isActive) return false;
    if (filters.openProgramOnly !== false && b.programId) {
      if (!isProgramOpen(b.programId)) return false;
    }
    return true;
  });
}

/**
 * Mengambil bedengan berdasarkan bedenganId
 */
export function getBedenganById(id) {
  if (!id) return null;
  const list = _loadBedenganFromStorage();
  return list.find(b => b.bedenganId === id) || null;
}

/**
 * Mengambil bedengan berdasarkan bedenganCode
 */
export function getBedenganByCode(code) {
  if (!code) return null;
  const clean = String(code).trim().toLowerCase();
  const list = _loadBedenganFromStorage();
  return list.find(b => 
    b.bedenganCode.toLowerCase() === clean ||
    b.name.toLowerCase() === clean
  ) || null;
}

/**
 * Mengambil bedengan berdasarkan qrCode
 */
export function getBedenganByQR(qrCode) {
  if (!qrCode) return null;
  const clean = String(qrCode).trim().toLowerCase();
  const list = _loadBedenganFromStorage();
  return list.find(b => 
    (b.qrCode && b.qrCode.toLowerCase() === clean) ||
    b.bedenganCode.toLowerCase() === clean
  ) || null;
}

export function getBedenganByProgram(programId) {
  return getAllBedengan({ programId });
}

export function getBedenganByEstate(estateId) {
  return getAllBedengan({ estateId });
}

export function getBedenganByDivision(divisionId) {
  return getAllBedengan({ divisionId });
}

export function isBedenganActive(id) {
  const b = getBedenganById(id);
  return b ? (b.status === BEDENGAN_STATUS.ACTIVE || b.status !== BEDENGAN_STATUS.INACTIVE) : false;
}

/**
 * Menghasilkan candidate identity berikutnya untuk Master Bedengan
 * Format:
 * - Kode: BED-001, BED-002, BED-003, dst.
 * - Nama: Bedengan-001, Bedengan-002, Bedengan-003, dst.
 * Sequence aman & unik dimulai dari 001.
 */
export function getNextBedenganCandidate(programId, estateId, divisionId) {
  if (!programId || !estateId || !divisionId) return null;

  const allBedengans = getAllBedengan({}); // includes INACTIVE

  let maxSeq = 0;
  allBedengans.forEach(b => {
    const codeMatch = String(b.bedenganCode || '').match(/BED-(\d+)/i);
    const nameMatch = String(b.name || '').match(/Bedengan-(\d+)/i);
    if (codeMatch) {
      const num = parseInt(codeMatch[1], 10);
      if (num > maxSeq) maxSeq = num;
    } else if (nameMatch) {
      const num = parseInt(nameMatch[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });

  let nextSeq = maxSeq + 1;
  let candidateCode = `BED-${String(nextSeq).padStart(3, '0')}`;
  let candidateName = `Bedengan-${String(nextSeq).padStart(3, '0')}`;

  while (
    allBedengans.some(b => 
      String(b.bedenganCode || '').toUpperCase() === candidateCode.toUpperCase() ||
      String(b.name || '').toUpperCase() === candidateName.toUpperCase()
    )
  ) {
    nextSeq++;
    candidateCode = `BED-${String(nextSeq).padStart(3, '0')}`;
    candidateName = `Bedengan-${String(nextSeq).padStart(3, '0')}`;
  }

  const estShort = String(estateId).replace(/^EST-/, '').toUpperCase();
  let divShort = 'D1';
  const numMatch = String(divisionId).match(/\d+/);
  if (numMatch) {
    divShort = `D${parseInt(numMatch[0], 10)}`;
  }

  const candidateId = `BED-${estShort}-${divShort}-${Date.now().toString().slice(-4)}-${String(nextSeq).padStart(3, '0')}`;
  const candidateQR = `SIGMA-${candidateCode}`;

  return {
    seq: nextSeq,
    bedenganId: candidateId,
    bedenganCode: candidateCode,
    name: candidateName,
    qrCode: candidateQR
  };
}

/**
 * CREATE Master Bedengan
 */
export function createBedengan(data, currentUser = null) {
  const ctx = currentUser || getCurrentUserContext();
  
  if (!data.bedenganCode || !String(data.bedenganCode).trim()) {
    throw new Error('Kode Bedengan wajib diisi');
  }
  if (!data.name || !String(data.name).trim()) {
    throw new Error('Nama Bedengan wajib diisi');
  }
  if (!data.capacity || Number(data.capacity) <= 0 || isNaN(Number(data.capacity))) {
    throw new Error('Kapasitas Bedengan harus berupa angka lebih dari 0');
  }
  if (!data.qrCode || !String(data.qrCode).trim()) {
    throw new Error('QR Code Bedengan wajib diisi');
  }

  // Relations Check & Context Inheritance
  const relCheck = validateBedenganRelations({
    programId: data.programId,
    estateId: data.estateId,
    divisionId: data.divisionId,
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
  validateUserScopeAndRole(ctx, finalEstateId, finalDivisionId, 'menambah');

  const list = _loadBedenganFromStorage();

  // Uniqueness Check
  const cleanCode = String(data.bedenganCode).trim().toUpperCase();
  const cleanQR = String(data.qrCode).trim().toUpperCase();

  if (list.some(b => b.bedenganCode.toUpperCase() === cleanCode)) {
    throw new Error(`Kode Bedengan '${data.bedenganCode}' sudah digunakan`);
  }
  if (list.some(b => b.qrCode && b.qrCode.toUpperCase() === cleanQR)) {
    throw new Error(`QR Code '${data.qrCode}' sudah digunakan`);
  }

  const now = new Date().toISOString();
  let newId = data.bedenganId;
  if (!newId) {
    let candidate = `BED-${finalEstateId || 'EST'}-${finalDivisionId || 'DIV'}-${Date.now().toString().slice(-4)}`;
    let counter = 1;
    while (list.some(b => b.bedenganId === candidate)) {
      candidate = `BED-${finalEstateId || 'EST'}-${finalDivisionId || 'DIV'}-${Date.now().toString().slice(-4)}-${counter++}`;
    }
    newId = candidate;
  }

  const newBedengan = {
    bedenganId: newId,
    bedenganCode: String(data.bedenganCode).trim(),
    name: String(data.name).trim(),
    programId: program ? program.id : data.programId,
    programCode: program ? program.code : (data.programCode || null),
    programName: program ? program.name : (data.programName || null),
    estateId: finalEstateId,
    divisionId: finalDivisionId,
    blockId: finalBlockId,
    blockCode: finalBlockCode,
    capacity: Number(data.capacity),
    qrCode: String(data.qrCode).trim(),
    status: data.status || BEDENGAN_STATUS.ACTIVE,
    createdAt: now,
    createdBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN',
    updatedAt: now,
    updatedBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN'
  };

  list.push(newBedengan);
  _saveBedenganToStorage(list);

  // Daftarkan Context Relasi ke Master Context Service
  setBedenganContext(newBedengan.bedenganId, {
    bedenganCode: newBedengan.bedenganCode,
    programId: program ? program.id : data.programId,
    programCode: program ? program.code : (data.programCode || null),
    programName: program ? program.name : (data.programName || null),
    estateId: finalEstateId,
    divisionId: finalDivisionId,
    blockId: finalBlockId,
    blockCode: finalBlockCode
  });

  return newBedengan;
}

/**
 * UPDATE Master Bedengan
 */
export function updateBedengan(id, data, currentUser = null) {
  const ctx = currentUser || getCurrentUserContext();
  const list = _loadBedenganFromStorage();

  const idx = list.findIndex(b => b.bedenganId === id);
  if (idx === -1) {
    throw new Error(`Bedengan dengan ID '${id}' tidak ditemukan`);
  }

  const existing = list[idx];

  // Scope & Role Check for existing and target
  validateUserScopeAndRole(ctx, existing.estateId, existing.divisionId, 'mengubah');
  if (data.estateId && data.divisionId) {
    validateUserScopeAndRole(ctx, data.estateId, data.divisionId, 'mengubah');
  }

  // Relations Check if changed
  const targetProgram = data.programId || existing.programId;
  const targetEstate = data.estateId || existing.estateId;
  const targetDivision = data.divisionId || existing.divisionId;

  const relCheck = validateBedenganRelations({
    programId: targetProgram,
    estateId: targetEstate,
    divisionId: targetDivision,
    blockId: data.blockId,
    blockCode: data.blockCode
  });
  if (!relCheck.valid) {
    throw new Error(relCheck.errors.join('. '));
  }

  if (data.capacity !== undefined && (Number(data.capacity) <= 0 || isNaN(Number(data.capacity)))) {
    throw new Error('Kapasitas Bedengan harus lebih dari 0');
  }

  // Uniqueness check for code and QR
  if (data.bedenganCode && data.bedenganCode !== existing.bedenganCode) {
    const cleanCode = String(data.bedenganCode).trim().toUpperCase();
    if (list.some(b => b.bedenganId !== id && b.bedenganCode.toUpperCase() === cleanCode)) {
      throw new Error(`Kode Bedengan '${data.bedenganCode}' sudah digunakan`);
    }
  }

  if (data.qrCode && data.qrCode !== existing.qrCode) {
    const cleanQR = String(data.qrCode).trim().toUpperCase();
    if (list.some(b => b.bedenganId !== id && b.qrCode && b.qrCode.toUpperCase() === cleanQR)) {
      throw new Error(`QR Code '${data.qrCode}' sudah digunakan`);
    }
  }

  const now = new Date().toISOString();

  const updated = {
    ...existing,
    bedenganCode: data.bedenganCode !== undefined ? String(data.bedenganCode).trim() : existing.bedenganCode,
    name: data.name !== undefined ? String(data.name).trim() : existing.name,
    programId: targetProgram,
    estateId: targetEstate,
    divisionId: targetDivision,
    blockId: data.blockId !== undefined ? data.blockId : existing.blockId,
    blockCode: data.blockCode !== undefined ? data.blockCode : existing.blockCode,
    capacity: data.capacity !== undefined ? Number(data.capacity) : existing.capacity,
    qrCode: data.qrCode !== undefined ? String(data.qrCode).trim() : existing.qrCode,
    status: data.status !== undefined ? data.status : existing.status,
    updatedAt: now,
    updatedBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN'
  };

  list[idx] = updated;
  _saveBedenganToStorage(list);

  // Perbarui Context Relasi di Master Context Service (dengan proteksi immutability program/estate)
  setBedenganContext(id, {
    bedenganCode: updated.bedenganCode,
    programId: targetProgram,
    estateId: targetEstate,
    divisionId: targetDivision,
    blockId: updated.blockId,
    blockCode: updated.blockCode
  });

  return updated;
}

/**
 * ACTIVATE Master Bedengan
 */
export function activateBedengan(id, currentUser = null) {
  return updateBedengan(id, { status: BEDENGAN_STATUS.ACTIVE }, currentUser);
}

/**
 * Check if a bedengan still has active nursery batches / population
 */
export function hasActiveBatchInBedengan(bedenganId) {
  const batches = getAllBatches() || [];
  return batches.some(b => {
    const isBatchActive = (b.status === 'AVAILABLE' || b.status === 'CREATED') && ((Number(b.availableQty ?? b.currentQty ?? 0)) > 0);
    if (!isBatchActive) return false;
    if (Array.isArray(b.bedenganIds) && (b.bedenganIds.includes(bedenganId) || b.bedenganIds.some(bid => String(bid).trim().toUpperCase() === String(bedenganId).trim().toUpperCase()))) return true;
    if (b.bedenganId && String(b.bedenganId).trim().toUpperCase() === String(bedenganId).trim().toUpperCase()) return true;
    return false;
  });
}

/**
 * DEACTIVATE Master Bedengan (Safe Non-Destructive Inactivation with Population Check)
 */
export function deactivateBedengan(id, currentUser = null) {
  if (hasActiveBatchInBedengan(id)) {
    throw new Error('Bedengan tidak dapat dinonaktifkan karena masih memiliki populasi/batch aktif.');
  }
  return updateBedengan(id, { status: BEDENGAN_STATUS.INACTIVE }, currentUser);
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
 * Memeriksa apakah bedengan sudah pernah digunakan dalam transaksi atau batch
 */
export function isBedenganUsedInTransactions(bedenganId, bedenganCode = null) {
  if (!bedenganId && !bedenganCode) return false;

  // 1. Cek keterkaitan dengan batch aktif/tercatat
  const batches = getAllBatches() || [];
  const inBatch = batches.some(b => {
    if (Array.isArray(b.bedenganIds)) {
      if (bedenganId && b.bedenganIds.some(bid => String(bid).trim().toUpperCase() === String(bedenganId).trim().toUpperCase())) return true;
      if (bedenganCode && b.bedenganIds.some(bid => String(bid).trim().toUpperCase() === String(bedenganCode).trim().toUpperCase())) return true;
    }
    if (bedenganId && b.bedenganId && String(b.bedenganId).trim().toUpperCase() === String(bedenganId).trim().toUpperCase()) return true;
    if (bedenganCode && b.bedenganId && String(b.bedenganId).trim().toUpperCase() === String(bedenganCode).trim().toUpperCase()) return true;
    return false;
  });
  if (inBatch) return true;

  // 2. Cek riwayat transaksi
  for (const key of TRANSACTION_STORAGE_KEYS) {
    const records = storage.get(key, []);
    if (Array.isArray(records) && records.length > 0) {
      const serialized = JSON.stringify(records);
      if (bedenganId && serialized.includes(`"${bedenganId}"`)) return true;
      if (bedenganCode && serialized.includes(`"${bedenganCode}"`)) return true;
      // Periksa juga property matching langsung
      const matched = records.some(r => 
        (bedenganId && (r.bedenganId === bedenganId || r.bedengan_id === bedenganId || r.bedengan === bedenganId)) ||
        (bedenganCode && (r.bedenganCode === bedenganCode || r.bedengan_code === bedenganCode || r.bedengan === bedenganCode || r.bedenganName === bedenganCode))
      );
      if (matched) return true;
    }
  }

  return false;
}

/**
 * DELETE Master Bedengan
 * Aturan:
 * - Jika record belum pernah digunakan pada transaksi: hard delete diperbolehkan.
 * - Jika record sudah memiliki referensi transaksi / batch: hard delete DITOLAK -> status diubah menjadi INACTIVE (soft delete).
 */
export function deleteBedengan(id, currentUser = null) {
  const ctx = currentUser || getCurrentUserContext();
  const list = _loadBedenganFromStorage();

  const idx = list.findIndex(b => b.bedenganId === id);
  if (idx === -1) {
    throw new Error(`Bedengan dengan ID '${id}' tidak ditemukan`);
  }

  const existing = list[idx];

  // Scope & Role Check
  validateUserScopeAndRole(ctx, existing.estateId, existing.divisionId, 'menghapus');

  const isUsed = isBedenganUsedInTransactions(existing.bedenganId, existing.bedenganCode);

  if (isUsed) {
    // Soft Delete: Ubah status menjadi INACTIVE untuk menjaga integritas histori transaksi
    const now = new Date().toISOString();
    existing.status = BEDENGAN_STATUS.INACTIVE;
    existing.updatedAt = now;
    existing.updatedBy = ctx.userId || ctx.id || 'ASISTEN_BIBITAN';

    list[idx] = existing;
    _saveBedenganToStorage(list);

    return {
      success: true,
      softDeleted: true,
      bedengan: existing,
      message: `Bedengan '${existing.bedenganCode}' sudah digunakan dalam data transaksi. Status diubah menjadi Nonaktif (INACTIVE) untuk menjaga histori.`
    };
  } else {
    // Hard Delete: Hapus permanen dari storage
    list.splice(idx, 1);
    _saveBedenganToStorage(list);

    return {
      success: true,
      softDeleted: false,
      bedengan: existing,
      message: `Bedengan '${existing.bedenganCode}' berhasil dihapus secara permanen.`
    };
  }
}

/**
 * Legacy Compatibility: Resolve Bedengan
 */
export function resolveBedenganLegacy(value) {
  const b = getBedenganById(value) || getBedenganByCode(value) || getBedenganByQR(value);
  if (b) return b;
  return {
    bedenganId: String(value || 'BED-001'),
    bedenganCode: String(value || 'BED-001'),
    name: String(value || 'Bedengan-001'),
    status: BEDENGAN_STATUS.ACTIVE,
    capacity: 1000
  };
}
