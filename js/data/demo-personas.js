/**
 * data/demo-personas.js — Master Demo Persona Registry (Phase 3).
 *
 * Struktur Organisasi Final:
 * 2 Estate × 7 Roles = 14 Persona Demo.
 *
 * Prinsip: "ADD, VERIFY, THEN SWITCH."
 * File ini merupakan registry baru terstandarisasi untuk persiapan Persona Switcher.
 * DEMO_USERS existing tetap dipertahankan untuk backward compatibility.
 */

import { ROLES, SCOPE_TYPES } from '../core/user-context.js';

export const DEMO_PERSONAS = Object.freeze([
  // ==========================================
  // TANAH BESIH (EST-TBS) — 7 Personas
  // ==========================================
  {
    id: 'TBS-PGS-001',
    code: 'PGS001',
    loginCode: 'PGS001',
    name: 'Junaidi',
    role: ROLES.PENGURUS,
    position: 'Pengurus Kebun',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-TBS-EST',
    divisionName: 'Tanah Besih',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'TBS-ASK-001',
    code: 'ASK001',
    loginCode: 'ASK001',
    name: 'Beny Sihotang',
    role: ROLES.ASKEP,
    position: 'Asisten Kepala',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-TBS-EST',
    divisionName: 'Tanah Besih',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'TBS-AST-002',
    code: 'AST002',
    loginCode: 'AST002',
    name: 'Rahmad',
    role: ROLES.ASISTEN,
    position: 'Asisten Lapangan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-002',
    divisionName: 'Divisi II',
    scopeType: SCOPE_TYPES.DIVISION,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'TBS-ASB-001',
    code: 'ASB001',
    loginCode: 'ASB001',
    name: 'Annisa',
    role: ROLES.ASISTEN_BIBITAN,
    position: 'Asisten Pembibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    scopeType: SCOPE_TYPES.DIVISION,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'TBS-MNT-001',
    code: 'MNT001',
    loginCode: 'MNT001',
    name: 'Wagiman',
    role: ROLES.MANTRI_TANAMAN,
    position: 'Mantri Bibitan',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    scopeType: SCOPE_TYPES.DIVISION,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'TBS-TKI-001',
    code: 'TKI001',
    loginCode: 'TKI001',
    name: 'Marihot',
    role: ROLES.TEKNIKER_I,
    position: 'Tekniker I',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-TBS-EST',
    divisionName: 'Tanah Besih',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'TBS-KTU-001',
    code: 'KTU001',
    loginCode: 'KTU001',
    name: 'Kusnadi',
    role: ROLES.KTU,
    position: 'Kepala Tata Usaha',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-TBS-EST',
    divisionName: 'Tanah Besih',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },

  // ==========================================
  // AEK PAMINGKE (EST-APM) — 7 Personas
  // ==========================================
  {
    id: 'APM-PGS-002',
    code: 'PGS002',
    loginCode: 'PGS002',
    name: 'Mukhsin Haji',
    role: ROLES.PENGURUS,
    position: 'Pengurus Kebun',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-EST',
    divisionName: 'Aek Pamingke',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'APM-ASK-002',
    code: 'ASK002',
    loginCode: 'ASK002',
    name: 'Dadin',
    role: ROLES.ASKEP,
    position: 'Asisten Kepala',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-EST',
    divisionName: 'Aek Pamingke',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'APM-AST-001',
    code: 'AST001',
    loginCode: 'AST001',
    name: 'Nando',
    role: ROLES.ASISTEN,
    position: 'Asisten Lapangan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-01',
    divisionName: 'Divisi I',
    scopeType: SCOPE_TYPES.DIVISION,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'APM-ASB-002',
    code: 'ASB002',
    loginCode: 'ASB002',
    name: 'Abdul Gofur',
    role: ROLES.ASISTEN_BIBITAN,
    position: 'Asisten Pembibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    scopeType: SCOPE_TYPES.DIVISION,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'APM-MNT-002',
    code: 'MNT002',
    loginCode: 'MNT002',
    name: 'Supriono',
    role: ROLES.MANTRI_TANAMAN,
    position: 'Mantri Bibitan',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionName: 'Divisi II',
    scopeType: SCOPE_TYPES.DIVISION,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'APM-TKI-002',
    code: 'TKI002',
    loginCode: 'TKI002',
    name: 'Dedek',
    role: ROLES.TEKNIKER_I,
    position: 'Tekniker I',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-EST',
    divisionName: 'Aek Pamingke',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  },
  {
    id: 'APM-KTU-002',
    code: 'KTU002',
    loginCode: 'KTU002',
    name: 'Dedi Sugiarto',
    role: ROLES.KTU,
    position: 'Kepala Tata Usaha',
    estateId: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-EST',
    divisionName: 'Aek Pamingke',
    scopeType: SCOPE_TYPES.ESTATE,
    password: 'demo',
    active: true,
    status: 'ACTIVE'
  }
]);

/**
 * Mengambil seluruh persona demo (14 persona).
 * @returns {Array<Object>}
 */
export function getDemoPersonas() {
  return [...DEMO_PERSONAS];
}

/**
 * Mencari persona demo berdasarkan login code (e.g. "PGS001", "PGS002").
 * @param {string} code
 * @returns {Object|null}
 */
export function getDemoPersonaByCode(code) {
  if (!code) return null;
  return DEMO_PERSONAS.find((p) => p.code === code || p.loginCode === code) || null;
}

/**
 * Mencari persona demo berdasarkan ID (e.g. "TBS-PGS-001").
 * @param {string} id
 * @returns {Object|null}
 */
export function getDemoPersonaById(id) {
  if (!id) return null;
  return DEMO_PERSONAS.find((p) => p.id === id) || null;
}

/**
 * Mengambil seluruh persona demo pada estate tertentu ("EST-TBS" atau "EST-APM").
 * @param {string} estateId
 * @returns {Array<Object>}
 */
export function getDemoPersonasByEstate(estateId) {
  if (!estateId) return [];
  return DEMO_PERSONAS.filter((p) => p.estateId === estateId);
}

/**
 * Mengambil persona demo berdasarkan role key (e.g. "PENGURUS", "ASKEP").
 * @param {string} role
 * @returns {Array<Object>}
 */
export function getDemoPersonasByRole(role) {
  if (!role) return [];
  return DEMO_PERSONAS.filter((p) => p.role === role);
}
