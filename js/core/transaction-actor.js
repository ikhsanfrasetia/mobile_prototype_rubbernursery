/**
 * core/transaction-actor.js — Transaction Actor Identity & Audit Traceability (Phase 8B).
 *
 * Prinsip: "PRESERVE EXISTING DATA, ADD ACTOR IDENTITY, NEVER LOSE TRACEABILITY."
 *
 * Mengelola snapshot identitas pelaku transaksi secara unik dan konsisten:
 * USER ID + LOGIN CODE + NAME + ROLE + POSITION + ESTATE + DIVISION + SCOPE + TIMESTAMP
 *
 * Memastikan pemisahan data transaksi untuk user dengan role yang sama pada estate yang berbeda
 * (misal: Junaidi / Tanah Besih vs Mukhsin Haji / Aek Pamingke).
 */

import { getCurrentUserContext, resolveUserContext, ROLES, SCOPE_TYPES, normalizeRole } from './user-context.js';

export const AUDIT_EVENT_TYPES = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  SUBMIT: 'SUBMIT',
  REVIEW: 'REVIEW',
  APPROVE: 'APPROVE',
  VERIFY: 'VERIFY',
  DELETE: 'DELETE'
});

/**
 * Membuat snapshot identitas aktor dari user context saat ini atau parameter yang diberikan.
 * Bersifat immutable dan mandiri dari perubahan master user di masa depan.
 *
 * @param {Object} [userContext] - Opsional, jika null mengambil dari getCurrentUserContext()
 * @returns {Object} Immutable Actor Snapshot
 */
export function createTransactionActorSnapshot(userContext = null) {
  const ctx = userContext ? resolveUserContext(userContext) : getCurrentUserContext();

  const userId = ctx.code || ctx.loginCode || (ctx.userId && !ctx.userId.includes('-') ? ctx.userId : ctx.code) || ctx.userId || ctx.id || 'USR-001';
  const loginCode = ctx.loginCode || ctx.code || userId;
  const name = ctx.name || 'User';
  const rawRole = ctx.rawRole || ctx.role || ROLES.MANTRI_TANAMAN;
  const role = normalizeRole(rawRole);
  const position = ctx.position || 'Pegawai';
  const estateId = ctx.estateId || 'EST-TBS';
  const estateName = ctx.estateName || 'Tanah Besih';
  const divisionId = ctx.divisionId || 'DIV-001';
  const divisionName = ctx.divisionName || 'Tanah Besih - Divisi I';
  const scopeType = ctx.scopeType || SCOPE_TYPES.DIVISION;
  const timestamp = new Date().toISOString();

  return Object.freeze({
    userId,
    loginCode,
    name,
    role,
    rawRole,
    position,
    estateId,
    estateName,
    divisionId,
    divisionName,
    scopeType,
    timestamp
  });
}

/**
 * Membuat record audit event untuk melacak riwayat tindakan transaksi.
 *
 * @param {string} eventType - Tipe event (CREATE, UPDATE, SUBMIT, REVIEW, APPROVE, VERIFY, DELETE)
 * @param {Object} [userContextOrSnapshot] - Context user atau actor snapshot
 * @param {string|Object} [details] - Keterangan / catatan tambahan
 * @returns {Object} Audit Event Entry
 */
export function createAuditEvent(eventType = AUDIT_EVENT_TYPES.CREATE, userContextOrSnapshot = null, details = null) {
  let actor = userContextOrSnapshot;
  if (!actor || !actor.userId || !actor.timestamp) {
    actor = createTransactionActorSnapshot(userContextOrSnapshot);
  }

  return {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    userId: actor.userId,
    loginCode: actor.loginCode,
    name: actor.name,
    role: actor.role,
    rawRole: actor.rawRole,
    position: actor.position,
    estateId: actor.estateId,
    estateName: actor.estateName,
    divisionId: actor.divisionId,
    divisionName: actor.divisionName,
    scopeType: actor.scopeType,
    timestamp: new Date().toISOString(),
    details: details || null
  };
}

/**
 * Menerapkan snapshot identitas aktor ke dalam record transaksi secara aditif dan aman.
 * Menjaga seluruh field existing (seperti createdByRole, approvedByRole, auditTrail).
 *
 * @param {Object} record - Record transaksi
 * @param {string} [actionType='CREATE'] - Tipe tindakan (CREATE, SUBMIT, REVIEW, APPROVE, VERIFY, UPDATE)
 * @param {Object} [userContext=null] - Context user opsional
 * @param {string|Object} [details=null] - Catatan tambahan untuk audit trail
 * @returns {Object} Enriched Transaction Record
 */
export function applyTransactionActor(record, actionType = AUDIT_EVENT_TYPES.CREATE, userContext = null, details = null) {
  if (!record || typeof record !== 'object') return record;

  const actor = createTransactionActorSnapshot(userContext);
  const now = actor.timestamp;
  const enriched = { ...record };

  // Pastikan audit trail existing selalu dipertahankan
  const existingAuditTrail = Array.isArray(enriched.auditTrail) ? [...enriched.auditTrail] : [];
  const auditEvent = createAuditEvent(actionType, actor, details);
  enriched.auditTrail = [...existingAuditTrail, auditEvent];

  switch (actionType) {
    case AUDIT_EVENT_TYPES.CREATE:
      // Primary Creator Identity Snapshot (Additive)
      enriched.createdByUserId = enriched.createdByUserId || actor.userId;
      enriched.createdByLoginCode = enriched.createdByLoginCode || actor.loginCode;
      enriched.createdByName = enriched.createdByName || actor.name;
      // Pertahankan createdByRole existing jika sudah ada dan normalisasi
      const rawCreatorRole = enriched.createdByRole || actor.rawRole;
      enriched.createdByRole = normalizeRole(rawCreatorRole);
      enriched.createdByRawRole = enriched.createdByRawRole || rawCreatorRole;
      enriched.createdByPosition = enriched.createdByPosition || actor.position;
      enriched.createdByEstateId = enriched.createdByEstateId || actor.estateId;
      enriched.createdByEstateName = enriched.createdByEstateName || actor.estateName;
      enriched.createdByDivisionId = enriched.createdByDivisionId || actor.divisionId;
      enriched.createdByDivisionName = enriched.createdByDivisionName || actor.divisionName;
      enriched.createdByScopeType = enriched.createdByScopeType || actor.scopeType;
      enriched.createdAt = enriched.createdAt || now;
      break;

    case AUDIT_EVENT_TYPES.SUBMIT:
      enriched.submittedByUserId = actor.userId;
      enriched.submittedByLoginCode = actor.loginCode;
      enriched.submittedByName = actor.name;
      enriched.submittedByRole = actor.role;
      enriched.submittedByPosition = actor.position;
      enriched.submittedByEstateId = actor.estateId;
      enriched.submittedByDivisionId = actor.divisionId;
      enriched.submittedByScopeType = actor.scopeType;
      enriched.submittedAt = now;
      break;

    case AUDIT_EVENT_TYPES.REVIEW:
      enriched.reviewedByUserId = actor.userId;
      enriched.reviewedByLoginCode = actor.loginCode;
      enriched.reviewedByName = actor.name;
      enriched.reviewedByRole = actor.role;
      enriched.reviewedByPosition = actor.position;
      enriched.reviewedByEstateId = actor.estateId;
      enriched.reviewedByDivisionId = actor.divisionId;
      enriched.reviewedByScopeType = actor.scopeType;
      enriched.reviewedAt = now;
      break;

    case AUDIT_EVENT_TYPES.APPROVE:
      // Pertahankan approvedByRole existing contract
      enriched.approvedByRole = actor.role;
      enriched.approvedByUserId = actor.userId;
      enriched.approvedByLoginCode = actor.loginCode;
      enriched.approvedByName = actor.name;
      enriched.approvedByPosition = actor.position;
      enriched.approvedByEstateId = actor.estateId;
      enriched.approvedByDivisionId = actor.divisionId;
      enriched.approvedByScopeType = actor.scopeType;
      enriched.approvedAt = now;
      break;

    case AUDIT_EVENT_TYPES.VERIFY:
      enriched.verifiedByUserId = actor.userId;
      enriched.verifiedByLoginCode = actor.loginCode;
      enriched.verifiedByName = actor.name;
      enriched.verifiedByRole = actor.role;
      enriched.verifiedByPosition = actor.position;
      enriched.verifiedByEstateId = actor.estateId;
      enriched.verifiedByDivisionId = actor.divisionId;
      enriched.verifiedByScopeType = actor.scopeType;
      enriched.verifiedAt = now;
      break;

    case AUDIT_EVENT_TYPES.UPDATE:
      enriched.updatedByUserId = actor.userId;
      enriched.updatedByLoginCode = actor.loginCode;
      enriched.updatedByName = actor.name;
      enriched.updatedByRole = actor.role;
      enriched.updatedByPosition = actor.position;
      enriched.updatedByEstateId = actor.estateId;
      enriched.updatedByDivisionId = actor.divisionId;
      enriched.updatedByScopeType = actor.scopeType;
      enriched.updatedAt = now;
      break;

    default:
      break;
  }

  return enriched;
}

/**
 * Resolver identitas aktor untuk transaksi historis / legacy.
 * Mampu membaca transaksi lama (yang hanya memiliki createdByRole atau userId biasa)
 * maupun transaksi baru dengan snapshot lengkap tanpa menyebabkan error runtime.
 *
 * @param {Object} record - Record transaksi (baru atau legacy)
 * @returns {Object} Resolved Actor Information
 */
export function resolveTransactionActor(record) {
  if (!record || typeof record !== 'object') {
    return {
      userId: 'UNKNOWN',
      loginCode: 'UNKNOWN',
      name: 'Unknown User',
      role: ROLES.MANTRI_TANAMAN,
      rawRole: ROLES.MANTRI_TANAMAN,
      position: 'Unknown Position',
      estateId: 'EST-TBS',
      estateName: 'Tanah Besih',
      divisionId: 'DIV-001',
      divisionName: 'Tanah Besih - Divisi I',
      scopeType: SCOPE_TYPES.DIVISION,
      isLegacy: true
    };
  }

  // Jika record memiliki snapshot lengkap
  if (record.createdByUserId) {
    return {
      userId: record.createdByUserId,
      loginCode: record.createdByLoginCode || record.createdByUserId,
      name: record.createdByName || record.name || record.requestedBy || record.workerName || 'User',
      role: normalizeRole(record.createdByRole || record.role),
      rawRole: record.createdByRawRole || record.createdByRole || record.role || ROLES.MANTRI_TANAMAN,
      position: record.createdByPosition || record.position || 'Pegawai',
      estateId: record.createdByEstateId || record.estateId || 'EST-TBS',
      estateName: record.createdByEstateName || record.estateName || 'Tanah Besih',
      divisionId: record.createdByDivisionId || record.divisionId || 'DIV-001',
      divisionName: record.createdByDivisionName || record.divisionName || 'Tanah Besih - Divisi I',
      scopeType: record.createdByScopeType || record.scopeType || SCOPE_TYPES.DIVISION,
      isLegacy: false
    };
  }

  // Fallback untuk legacy record (misal: hanya ada createdByRole, userId, atau role)
  const legacyRole = record.createdByRole || record.role || ROLES.MANTRI_TANAMAN;
  const normalizedRole = normalizeRole(legacyRole);
  const userId = record.userId || record.createdBy || 'LEGACY-USR';
  const name = record.name || record.requestedBy || record.workerName || record.mantri || 'Legacy User';

  return {
    userId,
    loginCode: record.code || record.userCode || userId,
    name,
    role: normalizedRole,
    rawRole: legacyRole,
    position: record.position || 'Pegawai',
    estateId: record.estateId || 'EST-TBS',
    estateName: record.estateName || 'Tanah Besih',
    divisionId: record.divisionId || 'DIV-001',
    divisionName: record.divisionName || 'Tanah Besih - Divisi I',
    scopeType: record.scopeType || (normalizedRole === ROLES.PENGURUS || normalizedRole === ROLES.ASKEP ? SCOPE_TYPES.ESTATE : SCOPE_TYPES.DIVISION),
    isLegacy: true
  };
}

// ==========================================
// GENERIC QUERY & FILTERING HELPERS
// ==========================================

/**
 * Filter daftar transaksi berdasarkan User ID.
 * @param {Array<Object>} transactions
 * @param {string} userId
 * @returns {Array<Object>}
 */
export function getTransactionsByUser(transactions, userId) {
  if (!Array.isArray(transactions) || !userId) return [];
  return transactions.filter((tx) => {
    const actor = resolveTransactionActor(tx);
    return actor.userId === userId || tx.createdByUserId === userId || tx.userId === userId;
  });
}

/**
 * Filter daftar transaksi berdasarkan Role (mendukung legacy & normalized role).
 * @param {Array<Object>} transactions
 * @param {string} role
 * @returns {Array<Object>}
 */
export function getTransactionsByRole(transactions, role) {
  if (!Array.isArray(transactions) || !role) return [];
  const targetNormalized = normalizeRole(role);
  return transactions.filter((tx) => {
    const actor = resolveTransactionActor(tx);
    return actor.role === targetNormalized || tx.createdByRole === role || tx.role === role;
  });
}

/**
 * Filter daftar transaksi berdasarkan Estate ID.
 * @param {Array<Object>} transactions
 * @param {string} estateId
 * @returns {Array<Object>}
 */
export function getTransactionsByEstate(transactions, estateId) {
  if (!Array.isArray(transactions) || !estateId) return [];
  return transactions.filter((tx) => {
    const actor = resolveTransactionActor(tx);
    return actor.estateId === estateId || tx.createdByEstateId === estateId || tx.estateId === estateId;
  });
}

/**
 * Filter daftar transaksi berdasarkan Division ID.
 * @param {Array<Object>} transactions
 * @param {string} divisionId
 * @returns {Array<Object>}
 */
export function getTransactionsByDivision(transactions, divisionId) {
  if (!Array.isArray(transactions) || !divisionId) return [];
  return transactions.filter((tx) => {
    const actor = resolveTransactionActor(tx);
    return actor.divisionId === divisionId || tx.createdByDivisionId === divisionId || tx.divisionId === divisionId;
  });
}
