/**
 * core/user-context.js — Role & User Context Compatibility Layer.
 *
 * Prinsip: "ADD, DO NOT BREAK"
 * Memisahkan dan menormalisasi atribut:
 * - role (normalized role string)
 * - rawRole / legacyRole (original role string)
 * - position (jabatan / context display)
 * - estateId & estateName (lingkup kebun)
 * - divisionId & divisionName (lingkup divisi/afdeling)
 * - scopeType (ESTATE vs DIVISION)
 *
 * Kompatibel dengan legacy user objects & session storage tanpa breaking changes.
 */

import { storage, KEYS } from './storage.js';

export const ROLES = Object.freeze({
  MANTRI_TANAMAN: 'MANTRI_TANAMAN',
  ASISTEN: 'ASISTEN',
  ASISTEN_BIBITAN: 'ASISTEN_BIBITAN',
  ASKEP: 'ASKEP',
  PENGURUS: 'PENGURUS',
  PENGURUS_KEBUN_SEPUPU: 'PENGURUS_KEBUN_SEPUPU',
  TEKNIKER_I: 'TEKNIKER_I',
  KTU: 'KTU'
});

export const SCOPE_TYPES = Object.freeze({
  ESTATE: 'ESTATE',
  DIVISION: 'DIVISION'
});

/**
 * Fallback mapping Role -> Position jika position belum tersedia pada object user.
 */
export const ROLE_POSITION_MAP = Object.freeze({
  [ROLES.PENGURUS]: 'Pengurus Kebun',
  [ROLES.MANTRI_TANAMAN]: 'Mantri Bibitan',
  [ROLES.ASISTEN]: 'Asisten Lapangan',
  [ROLES.ASISTEN_BIBITAN]: 'Asisten Pembibitan',
  [ROLES.ASKEP]: 'Asisten Kepala',
  ASISTEN_KEPALA: 'Asisten Kepala',
  [ROLES.TEKNIKER_I]: 'Tekniker I',
  [ROLES.KTU]: 'Kepala Tata Usaha',
  [ROLES.PENGURUS_KEBUN_SEPUPU]: 'Pengurus Kebun'
});

/**
 * Fallback mapping Role -> ScopeType jika scopeType belum tersedia pada object user.
 */
export const ROLE_SCOPE_MAP = Object.freeze({
  [ROLES.PENGURUS]: SCOPE_TYPES.ESTATE,
  [ROLES.ASKEP]: SCOPE_TYPES.ESTATE,
  ASISTEN_KEPALA: SCOPE_TYPES.ESTATE,
  [ROLES.TEKNIKER_I]: SCOPE_TYPES.ESTATE,
  [ROLES.KTU]: SCOPE_TYPES.ESTATE,
  [ROLES.PENGURUS_KEBUN_SEPUPU]: SCOPE_TYPES.ESTATE,
  [ROLES.MANTRI_TANAMAN]: SCOPE_TYPES.DIVISION,
  [ROLES.ASISTEN]: SCOPE_TYPES.DIVISION,
  [ROLES.ASISTEN_BIBITAN]: SCOPE_TYPES.DIVISION
});

/**
 * Normalization Map untuk abstraksi role baru tanpa mengubah runtime legacy role.
 */
export const ROLE_NORMALIZATION_MAP = Object.freeze({
  [ROLES.PENGURUS]: ROLES.PENGURUS,
  [ROLES.MANTRI_TANAMAN]: ROLES.MANTRI_TANAMAN,
  MANTRI_BIBITAN: ROLES.MANTRI_TANAMAN,
  [ROLES.ASISTEN]: ROLES.ASISTEN,
  [ROLES.ASISTEN_BIBITAN]: ROLES.ASISTEN_BIBITAN,
  [ROLES.ASKEP]: ROLES.ASKEP,
  ASISTEN_KEPALA: ROLES.ASKEP,
  [ROLES.TEKNIKER_I]: ROLES.TEKNIKER_I,
  [ROLES.KTU]: ROLES.KTU,
  [ROLES.PENGURUS_KEBUN_SEPUPU]: ROLES.PENGURUS
});

/**
 * Normalisasi role key ke target role key.
 * TIDAK mengubah original user object.
 * @param {string} role
 * @returns {string} Normalized role
 */
export function normalizeRole(role) {
  if (!role) return ROLES.MANTRI_TANAMAN;
  return ROLE_NORMALIZATION_MAP[role] || role;
}

/**
 * Resolve Normalized User Context dari input user object (atau fallback).
 * Bersifat NON-DESTRUCTIVE: tidak mengubah original user object.
 *
 * @param {Object} user - Raw user object dari session, database, atau parameter
 * @returns {Object} Normalized user context
 */
export function resolveUserContext(user) {
  if (!user) {
    return {
      id: 'MNT001',
      userId: 'MNT001',
      code: '1405482',
      name: 'Wagiman',
      role: ROLES.MANTRI_TANAMAN,
      rawRole: ROLES.MANTRI_TANAMAN,
      legacyRole: ROLES.MANTRI_TANAMAN,
      position: 'Mantri Bibitan',
      estateId: 'EST-001',
      estateName: 'Tanah Besih',
      divisionId: 'DIV-001',
      divisionName: 'Tanah Besih - Divisi I',
      scopeType: SCOPE_TYPES.DIVISION,
      isAuthenticated: false,
      isDemoSession: true
    };
  }

  const rawRole = user.role || user.rawRole || ROLES.MANTRI_TANAMAN;
  const normalizedRole = normalizeRole(rawRole);

  // Position resolution
  const position = user.position || ROLE_POSITION_MAP[rawRole] || 'Pegawai';

  // Scope resolution
  const scopeType = user.scopeType || ROLE_SCOPE_MAP[rawRole] || SCOPE_TYPES.DIVISION;

  // Estate resolution
  let estateId = user.estateId;
  let estateName = user.estateName;
  if (!estateId || !estateName) {
    if (
      user.divisionId === 'DIV-APM' ||
      (user.divisionId && user.divisionId.includes('APM')) ||
      (user.divisionName && user.divisionName.includes('Aek Pamingke')) ||
      rawRole === ROLES.PENGURUS_KEBUN_SEPUPU ||
      estateId === 'EST-APM' ||
      estateId === 'EST-003'
    ) {
      estateId = estateId || 'EST-APM';
      estateName = estateName || 'Aek Pamingke';
    } else {
      estateId = estateId || 'EST-TBS';
      estateName = estateName || 'Tanah Besih';
    }
  }

  // Division resolution
  let divisionId = user.divisionId;
  let divisionName = user.divisionName;
  if (!divisionId || !divisionName) {
    if (
      rawRole === ROLES.PENGURUS_KEBUN_SEPUPU ||
      estateId === 'EST-APM' ||
      estateId === 'EST-003' ||
      (divisionId && divisionId.includes('APM'))
    ) {
      divisionId = divisionId || 'DIV-APM';
      divisionName = divisionName || 'Aek Pamingke - All Division';
    } else {
      divisionId = divisionId || 'DIV-001';
      divisionName = divisionName || 'Tanah Besih - Divisi I';
    }
  }

  const id = user.userId || user.id || 'USR-001';
  const code = user.code || id;
  const name = user.name || 'User';

  return {
    ...user,
    id,
    userId: id,
    code,
    name,
    role: normalizedRole,
    rawRole,
    legacyRole: rawRole,
    position,
    estateId,
    estateName,
    divisionId,
    divisionName,
    scopeType,
    isAuthenticated: user.isAuthenticated !== false
  };
}

/**
 * Mengambil User Context yang sudah dinormalisasi dari session aktif saat ini.
 * @returns {Object} Normalized User Context
 */
export function getCurrentUserContext() {
  const activeUser = storage.get(KEYS.SESSION, null);
  return resolveUserContext(activeUser);
}

/**
 * Predikat pembantu untuk memeriksa scope user
 */
export function isScopeEstate(user) {
  const ctx = user && user.scopeType ? user : resolveUserContext(user || storage.get(KEYS.SESSION, null));
  return ctx.scopeType === SCOPE_TYPES.ESTATE;
}

export function isScopeDivision(user) {
  const ctx = user && user.scopeType ? user : resolveUserContext(user || storage.get(KEYS.SESSION, null));
  return ctx.scopeType === SCOPE_TYPES.DIVISION;
}

export function hasScope(user, scopeType) {
  const ctx = user && user.scopeType ? user : resolveUserContext(user || storage.get(KEYS.SESSION, null));
  return ctx.scopeType === scopeType;
}
