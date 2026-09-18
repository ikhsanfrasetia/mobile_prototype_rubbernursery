/**
 * core/utils.js — helpers umum (format, tanggal, id, dom)
 */

export function uid(prefix = '') {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}${time}${rnd}`;
}

export function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

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
  mataEntres: 'REQ/ETRS',
  MATA_ENTRES: 'REQ/ETRS',
  'REQ/ETRS': 'REQ/ETRS'
};

export function getModuleDocCode(modId) {
  return MODULE_DOC_CODES[modId] || (String(modId || 'DOC').slice(0, 3).toUpperCase());
}

export function formatStandardDocNo(year, docCode, sequence) {
  const y = year || 2026;
  const c = (MODULE_DOC_CODES[docCode] || String(docCode || 'APR')).toUpperCase();
  const s = String(sequence || 1).padStart(3, '0');
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

