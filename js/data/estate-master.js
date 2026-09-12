/**
 * data/estate-master.js — Master Data Kebun (Estate) Terpusat.
 * 
 * Prinsip:
 * "SINGLE SOURCE OF TRUTH."
 */

export const ESTATE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

export const ESTATE_MASTER = Object.freeze([
  {
    estate_id: 'EST-TBS',
    estate_code: 'EST-TBS',
    estate_name: 'Tanah Besih',
    status: ESTATE_STATUS.ACTIVE
  },
  {
    estate_id: 'EST-APM',
    estate_code: 'EST-APM',
    estate_name: 'Aek Pamingke',
    status: ESTATE_STATUS.ACTIVE
  }
]);

/**
 * Mengembalikan seluruh array master estate.
 */
export function getAllEstates() {
  return [...ESTATE_MASTER];
}

/**
 * Mengembalikan list estate dengan status ACTIVE.
 */
export function getActiveEstates() {
  return ESTATE_MASTER.filter(e => e.status === ESTATE_STATUS.ACTIVE);
}

/**
 * Mengembalikan objek spesifik berdasarkan estate_id.
 */
export function getEstateById(id) {
  if (!id) return null;
  return ESTATE_MASTER.find(e => e.estate_id === id) || null;
}

/**
 * Mengembalikan objek spesifik berdasarkan estate_code.
 */
export function getEstateByCode(code) {
  if (!code) return null;
  return ESTATE_MASTER.find(e => e.estate_code === code) || null;
}

/**
 * Mencari estate secara fleksibel melalui id, code, atau name.
 * Kompatibel dengan legacy value (e.g. 'EST-TBS' atau 'Tanah Besih').
 */
export function resolveEstate(value) {
  if (!value) return null;
  
  const normalizedValue = String(value).trim().toLowerCase();
  
  const found = ESTATE_MASTER.find(e => 
    e.estate_id.toLowerCase() === normalizedValue ||
    e.estate_code.toLowerCase() === normalizedValue ||
    e.estate_name.toLowerCase() === normalizedValue
  );
  
  return found || null;
}

/**
 * Mengembalikan boolean untuk validasi ketersediaan dan keaktifan.
 */
export function isEstateActive(id) {
  const estate = getEstateById(id);
  return estate ? estate.status === ESTATE_STATUS.ACTIVE : false;
}

import { DEMO_PERSONAS } from './demo-personas.js';

/**
 * Mengambil daftar Divisi Bibitan resmi untuk suatu Estate.
 * Sesuai prinsip:
 * 1 Estate -> N Divisi Bibitan (saat ini 1 divisi bibitan aktif per estate di master demo).
 * 
 * @param {string} estateIdOrCode
 * @returns {Array<{divisionId: string, divisionCode: string, divisionName: string, estateId: string, estateName: string}>}
 */
export function getNurseryDivisionsByEstate(estateIdOrCode) {
  if (!estateIdOrCode) return [];
  const clean = String(estateIdOrCode).trim().toUpperCase();

  // 1. Ekstrak persona bibitan (ASISTEN_BIBITAN) untuk estate yang sesuai
  const personas = DEMO_PERSONAS.filter(p => {
    const pEstate = (p.estateId || '').toUpperCase();
    const isAsistenBibitan = p.role === 'ASISTEN_BIBITAN' || (p.position && p.position.toLowerCase().includes('pembibitan'));
    const matchEstate = (
      pEstate === clean ||
      (pEstate === 'EST-APM' && (clean.includes('APM') || clean === 'EST-003')) ||
      (pEstate === 'EST-TBS' && (clean.includes('TBS') || clean === 'EST-001' || clean === 'EST-002'))
    );
    return matchEstate && isAsistenBibitan;
  });

  const divisionMap = new Map();
  personas.forEach(p => {
    if (p.divisionId && !divisionMap.has(p.divisionId)) {
      divisionMap.set(p.divisionId, {
        divisionId: p.divisionId,
        divisionCode: p.divisionId,
        divisionName: p.divisionName || p.divisionId,
        estateId: p.estateId,
        estateName: p.estateName
      });
    }
  });

  // 2. Fallback deterministik
  if (divisionMap.size === 0) {
    if (clean.includes('APM') || clean === 'EST-003') {
      divisionMap.set('DIV-APM-02', {
        divisionId: 'DIV-APM-02',
        divisionCode: 'DIV-APM-02',
        divisionName: 'Divisi II',
        estateId: 'EST-APM',
        estateName: 'Aek Pamingke'
      });
    } else {
      divisionMap.set('DIV-001', {
        divisionId: 'DIV-001',
        divisionCode: 'DIV-001',
        divisionName: 'Divisi I',
        estateId: 'EST-TBS',
        estateName: 'Tanah Besih'
      });
    }
  }

  return Array.from(divisionMap.values());
}

/**
 * Resolver cerdas untuk memvalidasi dan menemukan objek Divisi Bibitan
 * @param {string} divisionIdOrCode
 * @param {string} [estateId]
 * @returns {Object|null}
 */
export function resolveNurseryDivision(divisionIdOrCode, estateId = null) {
  if (!divisionIdOrCode) return null;
  const clean = String(divisionIdOrCode).trim().toUpperCase();
  const allDivisions = [
    ...getNurseryDivisionsByEstate('EST-TBS'),
    ...getNurseryDivisionsByEstate('EST-APM')
  ];

  return allDivisions.find(d => {
    const matchEstate = !estateId || d.estateId.toUpperCase() === String(estateId).trim().toUpperCase();
    const matchCode = (
      d.divisionId.toUpperCase() === clean ||
      d.divisionCode.toUpperCase() === clean ||
      d.divisionName.toUpperCase() === clean
    );
    return matchEstate && matchCode;
  }) || null;
}
