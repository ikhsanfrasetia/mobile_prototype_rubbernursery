/**
 * core/utils.js — helpers umum (format, tanggal, id, dom)
 */

export function uid(prefix = '') {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}${time}${rnd}`;
}

import { getEffectiveDate, getEffectiveTodayDDMMYYYY } from './simulation-clock-service.js';

export function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

export function todayISO() {
  return getEffectiveDate();
}

export function todayDDMMYYYY() {
  return getEffectiveTodayDDMMYYYY();
}

export function nowISO() {
  return new Date().toISOString();
}

export const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowTimeWithSeconds() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatFullDateIndonesian(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${DAY_NAMES_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso) {
  if (!iso) return '-';
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
    const [y, m, d] = iso.trim().split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export { getEffectiveDate, getEffectiveTodayDDMMYYYY } from './simulation-clock-service.js';

export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('id-ID');
}

export function statusLabel(status) {
  const map = {
    DRAFT: 'Draft',
    READY: 'Siap',
    SUBMITTED: 'Terkirim',
    UNDER_REVIEW: 'Dalam Review',
    CORRECTED: 'Dikoreksi',
    APPROVED: 'Disetujui',
    PENDING: 'Antrian',
    SYNCING: 'Menyinkron',
    SYNCED: 'Tersinkron',
    FAILED: 'Gagal'
  };
  return map[status] || status;
}

export function badgeClass(status) {
  return `badge-${String(status || '').toLowerCase().replace('_', '-')}`;
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Standard Document Numbering System
 * Format: <YEAR>/<DOC_CODE>/<SEQUENCE>
 * Example: 2026/APR/001
 */
export const MODULE_DOC_CODES = {
  reception: 'APR',
  seeding: 'SOW',
  SEM: 'SOW',
  SOW: 'SOW',
  budding: 'GRF',
  grafting: 'GRF',
  OKL: 'GRF',
  GRF: 'GRF',
  inspection: 'INS',
  INS: 'INS',
  INSP: 'INS',
  PRK: 'INS',
  regrafting: 'RGRF',
  RGRF: 'RGRF',
  selection: 'CULL',
  CULL: 'CULL',
  SEL: 'CULL',
  entres: 'ENT',
  nurseryActivity: 'RAW',
  material: 'MAT',
  request: 'NIR',
  NIR: 'NIR',
  KEBUN_SEPUPU: 'NIR',
  PGL: 'PGL',
  attendance: 'PRS',
  syncQueue: 'SYN',
  dederanInduk: 'DDR',
  'DDR': 'DDR',
  'DED-IND': 'DDR',
  dederan: 'DED',
  DED: 'DED',
  dederanInspection: 'DED-INS',
  'DED-INS': 'DED-INS',
  mataEntres: 'REQ/ETRS',
  MATA_ENTRES: 'REQ/ETRS',
  'REQ/ETRS': 'REQ/ETRS',
  BWGDTL: 'BWGDTL',
  'BWGDTL': 'BWGDTL'
};

export function getModuleDocCode(modId) {
  return MODULE_DOC_CODES[modId] || (String(modId || 'DOC').slice(0, 3).toUpperCase());
}

export const CULL_SOURCE_CODES = {
  'SEL-I': 'SEL-I',
  SELEKSI_1: 'SEL-I',
  SELEKSI_I: 'SEL-I',
  'SEL-II': 'SEL-II',
  SELEKSI_2: 'SEL-II',
  SELEKSI_II: 'SEL-II',
  'SEL-III': 'SEL-III',
  SELEKSI_3: 'SEL-III',
  SELEKSI_III: 'SEL-III',
  'SEL-OKL': 'SEL-OKL',
  PASCA_OKULASI: 'SEL-OKL',
  SELEKSI_PASCA_OKULASI: 'SEL-OKL',
  OKULASI: 'SEL-OKL',
  REJECT_OKULASI: 'SEL-OKL',
  REJECT_REGRAFTING: 'SEL-OKL',
  REJECT_PEMERIKSAAN: 'SEL-OKL',
  PS: 'PS',
  PINDAH_SEMAI: 'PS',
  REJECT_PENYEMAIAN: 'PS',
  DDR: 'DDR',
  DEDERAN: 'DDR',
  REJECT_DEDERAN: 'DDR'
};

export const CULL_DOC_NO_REGEX = /^(\d{4})\/CULL\/(?:([A-Za-z0-9-]+)\/)?(\d{1,6})$/i;

export function parseCullDocNo(rawDocNo) {
  if (!rawDocNo || typeof rawDocNo !== 'string') return null;
  const clean = rawDocNo.trim();
  const match = clean.match(CULL_DOC_NO_REGEX);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const rawSub = match[2] ? match[2].toUpperCase() : null;
  const subCode = rawSub ? (CULL_SOURCE_CODES[rawSub] || rawSub) : null;
  const sequence = parseInt(match[3], 10);
  return {
    year,
    docType: 'CULL',
    subCode,
    sequence,
    isLegacy: !match[2],
    isStandard: Boolean(match[2]),
    canonicalDocNo: subCode
      ? `${year}/CULL/${subCode}/${String(sequence).padStart(3, '0')}`
      : `${year}/CULL/${String(sequence).padStart(3, '0')}`
  };
}

export function isCullDocNo(rawDocNo) {
  return Boolean(parseCullDocNo(rawDocNo));
}

export function resolveCullSourceCode(source) {
  if (!source) return 'PS';
  if (typeof source === 'string') {
    const s = source.trim().toUpperCase();
    if (CULL_SOURCE_CODES[s]) return CULL_SOURCE_CODES[s];
    if (s.includes('DEDER')) return 'DDR';
    if (s.includes('SEMAI') || s.includes('SEED')) return 'PS';
    if (s.includes('OKL') || s.includes('GRAFT') || s.includes('INSP')) return 'SEL-OKL';
    if (s.includes('SEL-I') || s === 'SELEKSI_1' || s === 'SELEKSI_I') return 'SEL-I';
    if (s.includes('SEL-II') || s === 'SELEKSI_2' || s === 'SELEKSI_II') return 'SEL-II';
    if (s.includes('SEL-III') || s === 'SELEKSI_3' || s === 'SELEKSI_III') return 'SEL-III';
    return 'PS';
  }

  // Object resolution
  const stage = String(source.selectionStage || source.stage || '').toUpperCase();
  const originType = String(source.originType || '').toUpperCase();
  const sourceMod = String(source.sourceModule || '').toUpperCase();
  const txType = String(source.sourceTransactionType || source.transactionType || '').toUpperCase();

  if (stage === 'SELEKSI_1' || stage === 'SELEKSI_I' || txType === 'PELAKSANAAN_SELEKSI_I') return 'SEL-I';
  if (stage === 'SELEKSI_2' || stage === 'SELEKSI_II' || txType === 'PELAKSANAAN_SELEKSI_II') return 'SEL-II';
  if (stage === 'SELEKSI_3' || stage === 'SELEKSI_III' || txType === 'PELAKSANAAN_SELEKSI_III') return 'SEL-III';

  if (originType === 'REJECT_DEDERAN' || sourceMod === 'DEDERAN' || txType === 'DEDER_INSPECTION' || stage === 'PRA_SEMAI') {
    return 'DDR';
  }

  if (originType === 'REJECT_PENYEMAIAN' || sourceMod === 'PENYEMAIAN' || txType === 'SEEDING' || stage === 'PINDAH_SEMAI') {
    return 'PS';
  }

  if (
    originType === 'REJECT_OKULASI' ||
    originType === 'REJECT_REGRAFTING' ||
    originType === 'REJECT_PEMERIKSAAN' ||
    sourceMod === 'BUDDING' ||
    sourceMod === 'GRAFTING' ||
    sourceMod === 'INSPECTION' ||
    txType === 'GRAFTING' ||
    txType === 'BUDDING' ||
    stage === 'PASCA_OKULASI'
  ) {
    return 'SEL-OKL';
  }

  if (source.cullCode && CULL_SOURCE_CODES[String(source.cullCode).toUpperCase()]) {
    return CULL_SOURCE_CODES[String(source.cullCode).toUpperCase()];
  }

  return 'PS';
}

export function formatCullDocNo(year, subCode, sequence) {
  const y = year || 2026;
  const sc = resolveCullSourceCode(subCode);
  const s = String(sequence || 1).padStart(3, '0');
  return `${y}/CULL/${sc}/${s}`;
}

export function formatStandardDocNo(year, docCode, sequence, subCode = null) {
  const y = year || 2026;
  const s = String(sequence || 1).padStart(3, '0');
  if (subCode) {
    const c = (MODULE_DOC_CODES[docCode] || String(docCode || 'APR')).toUpperCase();
    const sc = (CULL_SOURCE_CODES[subCode] || String(subCode)).toUpperCase();
    return `${y}/${c}/${sc}/${s}`;
  }
  const c = (MODULE_DOC_CODES[docCode] || String(docCode || 'APR')).toUpperCase();
  return `${y}/${c}/${s}`;
}

export function generateUniqueDocNo(modIdOrCode, existingList = [], targetYear = 2026) {
  const docCode = MODULE_DOC_CODES[modIdOrCode] || String(modIdOrCode || 'APR').toUpperCase();
  const year = targetYear || 2026;
  const prefix = `${year}/${docCode}/`;

  const existingSet = new Set();
  let maxSeq = 0;

  const checkAndAdd = (rawDoc) => {
    if (!rawDoc || typeof rawDoc !== 'string') return;
    const cleanDoc = rawDoc.trim();
    existingSet.add(cleanDoc);
    if (cleanDoc.startsWith(prefix)) {
      const part = cleanDoc.slice(prefix.length);
      const n = parseInt(part, 10);
      if (!isNaN(n) && n > maxSeq) {
        maxSeq = n;
      }
    }
  };

  (existingList || []).forEach(item => {
    if (typeof item === 'string') {
      checkAndAdd(item);
    } else if (item && typeof item === 'object') {
      checkAndAdd(item.docNo);
      checkAndAdd(item.nomorDokumen);
      checkAndAdd(item.id);
      checkAndAdd(item.code);
    }
  });

  let nextSeq = maxSeq + 1;
  let candidate = formatStandardDocNo(year, docCode, nextSeq);
  while (existingSet.has(candidate)) {
    nextSeq += 1;
    candidate = formatStandardDocNo(year, docCode, nextSeq);
  }

  return candidate;
}

export function getAttendanceUniqueKey(record) {
  if (!record || typeof record !== 'object') return '';
  const type = String(record.type || 'WORKER').toUpperCase();
  const date = String(record.date || record.tanggal || (record.createdAt ? String(record.createdAt).slice(0, 10) : '')).trim();
  const attType = String(record.attendanceType || 'DATANG').toUpperCase();
  const idStr = type === 'SUPERVISOR'
    ? String(record.userId || record.code || record.userCode || record.createdBy || record.name || 'SUPERVISOR').trim()
    : String(record.workerId || record.workerCode || record.code || record.name || '').trim();
  return `${type}:${idStr}:${date}:${attType}`;
}

