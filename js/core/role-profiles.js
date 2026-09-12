/**
 * core/role-profiles.js — Master Role Profile & Capability Registry (Phase 6).
 *
 * Prinsip: "DEFINE FIRST, MIGRATE LATER."
 * Mendefinisikan profil konseptual untuk 7 canonical roles:
 * - PENGURUS
 * - ASKEP
 * - ASISTEN
 * - ASISTEN_BIBITAN
 * - MANTRI_TANAMAN
 * - TEKNIKER_I
 * - KTU
 *
 * File ini bersifat READ-ONLY CONFIGURATION dan TIDAK menggantikan runtime authorization di permissions.js.
 */

import { ROLES, SCOPE_TYPES, normalizeRole } from './user-context.js';

export const CANONICAL_ROLES = Object.freeze({
  PENGURUS: ROLES.PENGURUS,
  ASKEP: ROLES.ASKEP,
  ASISTEN: ROLES.ASISTEN,
  ASISTEN_BIBITAN: ROLES.ASISTEN_BIBITAN,
  MANTRI_TANAMAN: ROLES.MANTRI_TANAMAN,
  TEKNIKER_I: ROLES.TEKNIKER_I,
  KTU: ROLES.KTU
});

export const ROLE_PROFILES = Object.freeze({
  [ROLES.PENGURUS]: {
    key: ROLES.PENGURUS,
    label: 'Pengurus',
    positionLabel: 'Pengurus Kebun',
    description: 'Pengelola kebun dengan kewenangan monitoring dan otorisasi sesuai scope estate.',
    defaultScope: SCOPE_TYPES.ESTATE,
    capabilities: Object.freeze([
      'transaction:view',
      'transaction:view-submitted',
      'transaction:open-detail',
      'transaction:approve',
      'monitor:process',
      'approval:future'
    ]),
    status: 'ACTIVE',
    menuReady: true,
    existingModules: Object.freeze(['reception', 'request', 'dispatch'])
  },

  [ROLES.ASKEP]: {
    key: ROLES.ASKEP,
    label: 'Askep',
    positionLabel: 'Asisten Kepala',
    description: 'Pengawas tingkat estate untuk monitoring, review, dan otorisasi sesuai proses.',
    defaultScope: SCOPE_TYPES.ESTATE,
    capabilities: Object.freeze([
      'transaction:view',
      'transaction:view-submitted',
      'transaction:open-detail',
      'transaction:approve',
      'monitor:process'
    ]),
    status: 'ACTIVE',
    menuReady: true,
    existingModules: Object.freeze(['review', 'history'])
  },

  [ROLES.ASISTEN]: {
    key: ROLES.ASISTEN,
    label: 'Asisten',
    positionLabel: 'Asisten Lapangan',
    description: 'Pengawas operasional divisi/afdeling.',
    defaultScope: SCOPE_TYPES.DIVISION,
    capabilities: Object.freeze([
      'transaction:view',
      'transaction:view-submitted',
      'transaction:open-detail',
      'transaction:approve',
      'monitor:process'
    ]),
    status: 'ACTIVE',
    menuReady: true,
    existingModules: Object.freeze(['inspection', 'review', 'history'])
  },

  [ROLES.ASISTEN_BIBITAN]: {
    key: ROLES.ASISTEN_BIBITAN,
    label: 'Asisten Bibitan',
    positionLabel: 'Asisten Pembibitan',
    description: 'Pengawas teknis kegiatan pembibitan.',
    defaultScope: SCOPE_TYPES.DIVISION,
    capabilities: Object.freeze([
      'transaction:create',
      'transaction:edit-before-submit',
      'transaction:review-own',
      'transaction:submit',
      'transaction:view',
      'transaction:open-detail'
    ]),
    status: 'ACTIVE',
    menuReady: true,
    existingModules: Object.freeze(['seeding', 'budding', 'inspection', 'selection'])
  },

  [ROLES.MANTRI_TANAMAN]: {
    key: ROLES.MANTRI_TANAMAN,
    label: 'Mantri Bibitan',
    positionLabel: 'Mantri Bibitan',
    description: 'Pelaksana dan pencatat kegiatan operasional lapangan.',
    defaultScope: SCOPE_TYPES.DIVISION,
    capabilities: Object.freeze([
      'transaction:create',
      'transaction:edit-before-submit',
      'transaction:delete-before-submit',
      'transaction:review-own',
      'transaction:submit'
    ]),
    status: 'ACTIVE',
    menuReady: true,
    existingModules: Object.freeze([
      'attendance',
      'reception',
      'seeding',
      'budding',
      'inspection',
      'selection',
      'entres',
      'nursery-activity',
      'request'
    ])
  },

  [ROLES.TEKNIKER_I]: {
    key: ROLES.TEKNIKER_I,
    label: 'Tekniker I',
    positionLabel: 'Tekniker I',
    description: 'Pengawas teknis engineering/workshop sesuai kewenangan.',
    defaultScope: SCOPE_TYPES.ESTATE,
    capabilities: Object.freeze([
      'transaction:view',
      'transaction:view-submitted',
      'transaction:open-detail'
    ]),
    status: 'ACTIVE',
    menuReady: true,
    existingModules: Object.freeze(['history'])
  },

  [ROLES.KTU]: {
    key: ROLES.KTU,
    label: 'KTU',
    positionLabel: 'Kepala Tata Usaha',
    description: 'Pengelola administratif dan tata usaha.',
    defaultScope: SCOPE_TYPES.ESTATE,
    capabilities: Object.freeze([
      'transaction:view',
      'transaction:view-submitted',
      'transaction:open-detail',
      'transaction:approve'
    ]),
    status: 'ACTIVE',
    menuReady: true,
    existingModules: Object.freeze(['dispatch', 'history'])
  }
});

/**
 * Mengambil profil role canonical berdasarkan role key.
 * Jika role adalah legacy role (seperti PENGURUS_KEBUN_SEPUPU), otomatis resolve ke profile role canonical (PENGURUS).
 * @param {string} role - Role key
 * @returns {Object|null} Role profile
 */
export function getRoleProfile(role) {
  if (!role) return null;
  const canonicalKey = normalizeRole(role);
  return ROLE_PROFILES[canonicalKey] || null;
}

/**
 * Mengambil daftar kapabilitas yang dimiliki oleh role profile.
 * @param {string} role - Role key
 * @returns {Array<string>} Array of capability strings
 */
export function getRoleCapabilities(role) {
  const profile = getRoleProfile(role);
  return profile ? [...profile.capabilities] : [];
}

/**
 * Mengambil default scope dari role profile ('ESTATE' atau 'DIVISION').
 * @param {string} role - Role key
 * @returns {string} Default Scope
 */
export function getRoleDefaultScope(role) {
  const profile = getRoleProfile(role);
  return profile ? profile.defaultScope : SCOPE_TYPES.DIVISION;
}

/**
 * Memeriksa apakah role key merupakan salah satu dari 7 canonical roles.
 * @param {string} role - Role key
 * @returns {boolean}
 */
export function isCanonicalRole(role) {
  if (!role) return false;
  return Object.values(CANONICAL_ROLES).includes(role);
}

/**
 * Mengambil seluruh profil role canonical (7 roles).
 * @returns {Array<Object>} Array of 7 role profiles
 */
export function getAllRoleProfiles() {
  return Object.values(ROLE_PROFILES);
}
