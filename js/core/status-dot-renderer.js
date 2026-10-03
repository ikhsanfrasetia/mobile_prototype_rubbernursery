/**
 * Sigma Nursery — Global Dot Status Presentation Renderer
 * 
 * PRESENTATION LAYER ONLY.
 * Mengubah representasi visual flagging existing menjadi compact colored dot (●).
 * TIDAK MENGUBAH business logic, status key, storage, atau validation guards.
 */

// Master semantic color mapping table
const FLAG_COLOR_MAP = {
  // GREEN: Selesai / Terverifikasi / Disetujui / 100%
  'RECEIPT_OK': 'green',
  'DEDER_SELESAI': 'green',
  'INSP_DEDER_DONE': 'green',
  'OKULASI_SELESAI': 'green',
  'REGRAFT_SELESAI': 'green',
  'SELECTION_APPROVED': 'green',
  'CENTRAL_TERVERIFIKASI': 'green',
  'DISPATCH_COMPLETED': 'green',
  'VERIFIED': 'green',
  'APPROVED': 'green',
  'COMPLETED': 'green',

  // YELLOW / AMBER: Menunggu Verifikasi / Approval / Pending Action
  'PINDAH_SEMAI_WAIT': 'yellow',
  'PINDAH_SEMAI_INSP_WAIT': 'yellow',
  'SELECTION_WAIT_ASB': 'yellow',
  'CENTRAL_SIAP_KIRIM': 'yellow',
  'CENTRAL_SUDAH_DIAJUKAN': 'yellow',
  'DISPATCH_WAIT_ASKEP': 'yellow',
  'DISPATCH_WAIT_ASL': 'yellow',
  'SUBMITTED': 'yellow',
  'PENDING_ASB': 'yellow',
  'PENDING_ASKEP': 'yellow',
  'PENDING_ASL': 'yellow',
  'WAITING_APPROVAL': 'yellow',
  'MENUNAS_WAITING': 'yellow',

  // RED: Perlu Aksi / Belum Dikerjakan / Ditolak / Selisih / Dikembalikan
  'DEDER_BELUM': 'red',
  'OKULASI_PERLU': 'red',
  'REGRAFT_PERLU': 'red',
  'INSP_PERLU': 'red',
  'RECEIPT_DIFF': 'red',
  'SELECTION_REJECTED': 'red',
  'CENTRAL_LEWAT_WAKTU': 'red',
  'CENTRAL_DIKEMBALIKAN': 'red',
  'DISPATCH_REJECTED': 'red',
  'SELECTION_NEED_AFKIR': 'red',
  'REJECTED': 'red',
  'RETURNED': 'red',
  'RETURNED_TO_PENGURUS': 'red',

  // BLUE: Progres Berjalan / Parsial / Sebagian Selesai
  'DEDER_SISA': 'blue',
  'OKULASI_BELUM_SELESAI': 'blue',
  'REGRAFT_PROGRESS': 'blue',
  'INSP_SISA': 'blue',
  'INSP_DEDER_PARTIAL': 'blue',
  'IN_PROGRESS': 'blue',
  'PARTIAL': 'blue',

  // GRAY / SLATE: Draft / Locked Referential / Sudah Digunakan
  'RECEIPT_REF_USED': 'gray',
  'TX_LOCKED_VERIF': 'gray',
  'SELECTION_DRAFT': 'gray',
  'DRAFT': 'gray',
  'LOCKED': 'gray'
};

// Fallback semantic labels if not provided
const DEFAULT_FLAG_LABELS = {
  'RECEIPT_OK': 'Diterima',
  'RECEIPT_DIFF': 'Diterima dengan Selisih',
  'RECEIPT_REF_USED': 'Sudah Digunakan',
  'DEDER_SELESAI': 'Selesai Dideder (100%)',
  'DEDER_SISA': 'Sisa Butir Belum Dideder',
  'DEDER_BELUM': 'Belum Dideder',
  'INSP_DEDER_DONE': 'Selesai Periksa',
  'INSP_DEDER_PARTIAL': 'Pemeriksaan Berjalan',
  'PINDAH_SEMAI_WAIT': 'Menunggu Persetujuan Asisten Bibitan',
  'PINDAH_SEMAI_INSP_WAIT': 'Menunggu Persetujuan Pemeriksaan',
  'OKULASI_PERLU': 'Perlu Diokulasi',
  'OKULASI_BELUM_SELESAI': 'Okulasi Belum Selesai',
  'OKULASI_SELESAI': 'Selesai Diokulasi',
  'REGRAFT_PERLU': 'Perlu Okulasi Ulang',
  'REGRAFT_PROGRESS': 'Okulasi Ulang Belum Selesai',
  'REGRAFT_SELESAI': 'Selesai Okulasi Ulang',
  'INSP_PERLU': 'Perlu Pemeriksaan',
  'INSP_SISA': 'Pemeriksaan Belum Selesai',
  'SELECTION_DRAFT': 'Draft',
  'SELECTION_WAIT_ASB': 'Menunggu Verifikasi Asisten Bibitan',
  'SELECTION_APPROVED': 'Disetujui',
  'SELECTION_REJECTED': 'Dikembalikan',
  'SELECTION_NEED_AFKIR': 'Perlu Deklarasi Afkir',
  'CENTRAL_SIAP_KIRIM': 'Siap Dikirim',
  'CENTRAL_LEWAT_WAKTU': 'Lewat Waktu',
  'CENTRAL_SUDAH_DIAJUKAN': 'Menunggu Verifikasi',
  'CENTRAL_TERVERIFIKASI': 'Terverifikasi',
  'CENTRAL_DIKEMBALIKAN': 'Dikembalikan',
  'DISPATCH_WAIT_ASKEP': 'Menunggu Persetujuan Askep',
  'DISPATCH_WAIT_ASL': 'Menunggu Verifikasi Asisten Lapangan',
  'DISPATCH_REJECTED': 'Ditolak',
  'DISPATCH_COMPLETED': 'Disetujui / Selesai',
  'TX_LOCKED_VERIF': 'Menunggu Verifikasi (Terkunci)'
};

/**
 * Normalisasi flag item menjadi descriptor { key, color, label }
 * @param {string|Object} item 
 * @returns {Object|null}
 */
export function resolveFlagDescriptor(item) {
  if (!item) return null;

  if (typeof item === 'string') {
    const color = FLAG_COLOR_MAP[item] || 'gray';
    const label = DEFAULT_FLAG_LABELS[item] || item;
    return { key: item, color, label };
  }

  if (typeof item === 'object') {
    // Jika ada properti active dan nilainya falsy, jangan render
    if ('active' in item && !item.active) return null;

    const key = item.key || item.status || 'UNKNOWN';
    const color = FLAG_COLOR_MAP[key] || item.color || 'gray';
    const label = item.label || item.text || DEFAULT_FLAG_LABELS[key] || key;
    return { key, color, label };
  }

  return null;
}

/**
 * Merender daftar flag aktif menjadi container kumpulan colored dot
 * @param {Array<string|Object>} flags - Array of active flags
 * @returns {string} HTML string
 */
export function renderStatusDots(flags) {
  if (!Array.isArray(flags) || flags.length === 0) {
    return '';
  }

  const descriptors = flags
    .map(resolveFlagDescriptor)
    .filter(Boolean);

  if (descriptors.length === 0) {
    return '';
  }

  const ariaLabel = descriptors.map(d => d.label).join(', ');

  const dotsHtml = descriptors.map(d => {
    return `<span class="dot-status dot-${d.color}" title="${escapeHtml(d.label)}" data-status="${escapeHtml(d.key)}" aria-label="${escapeHtml(d.label)}"></span>`;
  }).join('');

  return `<div class="dot-status-group" role="status" aria-label="${escapeHtml(ariaLabel)}">${dotsHtml}</div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
