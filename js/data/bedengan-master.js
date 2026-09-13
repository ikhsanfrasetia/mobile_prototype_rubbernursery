/**
 * data/bedengan-master.js — Master Data & Service Terpusat Master Bedengan (TASK ASB-03).
 * 
 * Prinsip:
 * - "SINGLE SOURCE OF TRUTH"
 * - Dikelola oleh Role ASISTEN_BIBITAN (CRUD, Activate/Deactivate)
 * - Dibaca oleh MANTRI_BIBITAN (Read-only / Consumer)
 * - Program Pembibitan terintegrasi dengan data/program-master.js (ASB-02)
 * - Estate & Divisi terintegrasi dengan data/estate-master.js
 * - Dilindungi dari pembersihan Clean All (Master Data)
 */

import { storage } from '../core/storage.js';
import { ROLES, normalizeRole, getCurrentUserContext } from '../core/user-context.js';
import { getActivePrograms, getProgramById, resolveProgram } from './program-master.js';
import { getActiveEstates, getEstateById, getNurseryDivisionsByEstate, resolveNurseryDivision } from './estate-master.js';
import { getAllBatches } from './batch-master.js';

export const BEDENGAN_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE: 'INACTIVE'
});

export const STORAGE_KEY_BEDENGAN_MASTER = 'bedengan_master';

/**
 * Baseline Default Data Master Bedengan
 */
export const DEFAULT_BEDENGAN_MASTER = Object.freeze([
  // ==========================================
  // TANAH BESIH (EST-TBS) — DIVISI I (DIV-001)
  // ==========================================
  {
    bedenganId: 'BED-TBS-D1-001',
    bedenganCode: 'BED-001',
    name: 'Bedengan 001',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-001',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-002',
    bedenganCode: 'BED-002',
    name: 'Bedengan 002',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-002',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-003',
    bedenganCode: 'BED-003',
    name: 'Bedengan 003',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-003',
    status: BEDENGAN_STATUS.OCCUPIED,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-004',
    bedenganCode: 'BED-004',
    name: 'Bedengan 004',
    programId: 'PRG-2026-002',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-004',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-005',
    bedenganCode: 'BED-005',
    name: 'Bedengan 005',
    programId: 'PRG-2026-002',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-005',
    status: BEDENGAN_STATUS.MAINTENANCE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-006',
    bedenganCode: 'BED-006',
    name: 'Bedengan 006',
    programId: 'PRG-2026-002',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-006',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-007',
    bedenganCode: 'BED-007',
    name: 'Bedengan 007',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-007',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-008',
    bedenganCode: 'BED-008',
    name: 'Bedengan 008',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-008',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-009',
    bedenganCode: 'BED-009',
    name: 'Bedengan 009',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-009',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },
  {
    bedenganId: 'BED-TBS-D1-010',
    bedenganCode: 'BED-010',
    name: 'Bedengan 010',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    capacity: 1000,
    qrCode: 'SIGMA-BED-010',
    status: BEDENGAN_STATUS.INACTIVE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-TBS',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-TBS'
  },

  // ==========================================
  // AEK PAMINGKE (EST-APM) — DIVISI II (DIV-APM-02)
  // ==========================================
  {
    bedenganId: 'BED-APM-D2-001',
    bedenganCode: 'BED-APM-001',
    name: 'Bedengan APM 01',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    capacity: 1200,
    qrCode: 'SIGMA-BED-APM-001',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  },
  {
    bedenganId: 'BED-APM-D2-002',
    bedenganCode: 'BED-APM-002',
    name: 'Bedengan APM 02',
    programId: 'PRG-2026-003',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    capacity: 1200,
    qrCode: 'SIGMA-BED-APM-002',
    status: BEDENGAN_STATUS.AVAILABLE,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'USR-ASB-APM',
    updatedAt: '2026-01-01T08:00:00.000Z',
    updatedBy: 'USR-ASB-APM'
  }
]);

/**
 * Mengambil dataset raw dari storage dengan inisialisasi default
 */
function _loadBedenganFromStorage() {
  const stored = storage.get(STORAGE_KEY_BEDENGAN_MASTER, null);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    const cloned = JSON.parse(JSON.stringify(DEFAULT_BEDENGAN_MASTER));
    storage.set(STORAGE_KEY_BEDENGAN_MASTER, cloned);
    return cloned;
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
 * Helper validasi relasi program, estate, divisi
 */
export function validateBedenganRelations({ programId, estateId, divisionId }) {
  const errors = [];

  // 1. Validasi Program
  const program = getProgramById(programId) || resolveProgram(programId);
  if (!program) {
    errors.push(`Program dengan ID/Kode '${programId}' tidak ditemukan`);
  } else if (program.status !== 'ACTIVE') {
    errors.push(`Program '${program.name || programId}' tidak berstatus ACTIVE`);
  }

  // 2. Validasi Estate
  const estate = getEstateById(estateId);
  if (!estate) {
    errors.push(`Estate dengan ID '${estateId}' tidak valid`);
  }

  // 3. Validasi Divisi dalam Estate
  if (estate && divisionId) {
    const validDivisions = getNurseryDivisionsByEstate(estateId);
    const divMatch = validDivisions.some(d => 
      d.divisionId.toUpperCase() === divisionId.toUpperCase() ||
      d.divisionCode.toUpperCase() === divisionId.toUpperCase()
    );
    if (!divMatch) {
      errors.push(`Divisi '${divisionId}' tidak terdaftar pada Estate '${estate.estate_name || estateId}'`);
    }
  } else if (!divisionId) {
    errors.push('Divisi wajib dipilih');
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

  if (filters.estateId) {
    const cleanEstate = String(filters.estateId).trim().toUpperCase();
    list = list.filter(b => b.estateId.toUpperCase() === cleanEstate);
  }

  if (filters.divisionId) {
    const cleanDiv = String(filters.divisionId).trim().toUpperCase();
    list = list.filter(b => b.divisionId.toUpperCase() === cleanDiv);
  }

  if (filters.programId) {
    const cleanProg = String(filters.programId).trim();
    list = list.filter(b => b.programId === cleanProg);
  }

  if (filters.status) {
    list = list.filter(b => b.status === filters.status);
  }

  if (filters.search) {
    const q = String(filters.search).trim().toLowerCase();
    list = list.filter(b => 
      b.bedenganCode.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      (b.qrCode && b.qrCode.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Mengambil bedengan berstatus aktif (bukan INACTIVE)
 */
export function getActiveBedengan(filters = {}) {
  const all = getAllBedengan(filters);
  return all.filter(b => b.status !== BEDENGAN_STATUS.INACTIVE);
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
  return b ? b.status !== BEDENGAN_STATUS.INACTIVE : false;
}

/**
 * Menghasilkan candidate identity berikutnya untuk Master Bedengan
 * scoped strictly to (programId + estateId + divisionId)
 */
export function getNextBedenganCandidate(programId, estateId, divisionId) {
  if (!programId || !estateId || !divisionId) return null;

  const allBedengans = getAllBedengan({}); // includes INACTIVE

  // Format estate code short: 'EST-APM' -> 'APM', 'EST-TBS' -> 'TBS'
  const estShort = String(estateId).replace(/^EST-/, '').toUpperCase();

  // Format division short: 'DIV-APM-02' -> 'D2', 'DIV-001' -> 'D1'
  let divShort = 'D1';
  const numMatch = String(divisionId).match(/\d+/);
  if (numMatch) {
    divShort = `D${parseInt(numMatch[0], 10)}`;
  }

  // Find all bedengans in this scope (programId + estateId + divisionId)
  const scopedBedengans = allBedengans.filter(b => 
    b.programId === programId &&
    String(b.estateId).toUpperCase() === String(estateId).toUpperCase() &&
    String(b.divisionId).toUpperCase() === String(divisionId).toUpperCase()
  );

  let maxSeq = 0;
  scopedBedengans.forEach(b => {
    const m = (b.bedenganCode || '').match(/(\d+)$/);
    if (m) {
      const s = parseInt(m[1], 10);
      if (s > maxSeq) maxSeq = s;
    }
  });

  let nextSeq = maxSeq + 1;
  let candidateCode = `BED-${estShort}-${divShort}-${String(nextSeq).padStart(3, '0')}`;
  let candidateName = `Bedengan ${String(nextSeq).padStart(3, '0')}`;
  let candidateQR = `SIGMA-BED-${estShort}-${divShort}-${String(nextSeq).padStart(3, '0')}`;
  let candidateId = `BED-${estShort}-${divShort}-${String(programId).replace(/[^A-Za-z0-9]/g, '')}-${String(nextSeq).padStart(3, '0')}`;

  while (
    scopedBedengans.some(b => 
      (b.bedenganCode && b.bedenganCode.toUpperCase() === candidateCode.toUpperCase()) ||
      (b.name && b.name.toUpperCase() === candidateName.toUpperCase())
    )
  ) {
    nextSeq++;
    candidateCode = `BED-${estShort}-${divShort}-${String(nextSeq).padStart(3, '0')}`;
    candidateName = `Bedengan ${String(nextSeq).padStart(3, '0')}`;
    candidateQR = `SIGMA-BED-${estShort}-${divShort}-${String(nextSeq).padStart(3, '0')}`;
    candidateId = `BED-${estShort}-${divShort}-${String(programId).replace(/[^A-Za-z0-9]/g, '')}-${String(nextSeq).padStart(3, '0')}`;
  }

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

  // Scope & Role Check
  validateUserScopeAndRole(ctx, data.estateId, data.divisionId, 'menambah');

  // Relations Check
  const relCheck = validateBedenganRelations({
    programId: data.programId,
    estateId: data.estateId,
    divisionId: data.divisionId
  });
  if (!relCheck.valid) {
    throw new Error(relCheck.errors.join('. '));
  }

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
  const newId = data.bedenganId || `BED-${data.estateId || 'EST'}-${data.divisionId || 'DIV'}-${Date.now().toString().slice(-4)}`;

  const newBedengan = {
    bedenganId: newId,
    bedenganCode: String(data.bedenganCode).trim(),
    name: String(data.name).trim(),
    programId: data.programId,
    estateId: data.estateId,
    divisionId: data.divisionId,
    capacity: Number(data.capacity),
    qrCode: String(data.qrCode).trim(),
    status: data.status || BEDENGAN_STATUS.AVAILABLE,
    createdAt: now,
    createdBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN',
    updatedAt: now,
    updatedBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN'
  };

  list.push(newBedengan);
  _saveBedenganToStorage(list);

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
    divisionId: targetDivision
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
    capacity: data.capacity !== undefined ? Number(data.capacity) : existing.capacity,
    qrCode: data.qrCode !== undefined ? String(data.qrCode).trim() : existing.qrCode,
    status: data.status !== undefined ? data.status : existing.status,
    updatedAt: now,
    updatedBy: ctx.userId || ctx.id || 'ASISTEN_BIBITAN'
  };

  list[idx] = updated;
  _saveBedenganToStorage(list);

  return updated;
}

/**
 * ACTIVATE Master Bedengan
 */
export function activateBedengan(id, currentUser = null) {
  return updateBedengan(id, { status: BEDENGAN_STATUS.AVAILABLE }, currentUser);
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

/**
 * Legacy Compatibility: Resolve Bedengan
 */
export function resolveBedenganLegacy(value) {
  const b = getBedenganById(value) || getBedenganByCode(value) || getBedenganByQR(value);
  if (b) return b;
  return {
    bedenganId: String(value || 'BED-001'),
    bedenganCode: String(value || 'BED-001'),
    name: String(value || 'Bedengan 001'),
    status: BEDENGAN_STATUS.AVAILABLE,
    capacity: 1000
  };
}
