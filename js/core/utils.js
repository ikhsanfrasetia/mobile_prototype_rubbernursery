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
