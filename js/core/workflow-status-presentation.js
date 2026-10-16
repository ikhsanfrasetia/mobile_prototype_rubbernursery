const STATUS_PRESENTATION = {
  DIAJUKAN: ['Diajukan', 'info'],
  MENUNGGU_VERIFIKASI_ASISTEN_KEPALA: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_VERIFIKASI_ASISTEN: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_VERIFIKASI: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_VERIFIKASI_PENGURUS: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_REVIEW_PENGURUS: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_VERIFIKASI_PENGELUARAN: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN_PENGELUARAN: ['Menunggu Verifikasi', 'waiting'],
  MENUNGGU_PENERIMAAN: ['Menunggu Penerimaan', 'waiting'],
  MENUNGGU_PENERIMAAN_PENGURUS: ['Menunggu Penerimaan', 'waiting'],
  MENUNGGU_PENERIMAAN_MANTRI_BIBITAN: ['Menunggu Penerimaan', 'waiting'],
  MENUNGGU_PENGELUARAN_BIBIT: ['Menunggu Pengeluaran', 'waiting'],
  MENUNGGU_PENGELUARAN: ['Menunggu Pengeluaran', 'waiting'],
  TERVERIFIKASI: ['Terverifikasi', 'success'],
  DISETUJUI: ['Disetujui', 'success'],
  APPROVED: ['Disetujui', 'success'],
  SELESAI: ['Selesai', 'success'],
  DITERIMA: ['Diterima', 'success'],
  DITERIMA_DENGAN_SELISIH: ['Diterima (Selisih)', 'warning'],
  PERLU_REVISI_PENGURUS: ['Perlu Perbaikan', 'danger'],
  PERLU_REVISI_ASISTEN_KEPALA: ['Perlu Perbaikan', 'danger'],
  DIKEMBALIKAN_KE_PENGURUS: ['Perlu Perbaikan', 'danger'],
  DIKEMBALIKAN: ['Perlu Perbaikan', 'danger'],
  DITOLAK: ['Ditolak', 'danger'],
  REJECTED: ['Ditolak', 'danger'],
  SEDANG_DIPROSES: ['Sedang Diproses', 'info'],
  DIPROSES: ['Sedang Diproses', 'info'],
  PENGELUARAN_BERJALAN: ['Sedang Diproses', 'info'],
  DALAM_PERJALANAN: ['Dalam Perjalanan', 'info'],
  DIKELUARKAN: ['Dikeluarkan', 'info'],
};

const STATUS_TONES = {
  waiting: { background: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  success: { background: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  danger: { background: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  info: { background: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
  warning: { background: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  neutral: { background: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
};

export function getWorkflowStatusPresentation(status, fallbackLabel = '') {
  const key = String(status || '').trim().toUpperCase();
  const mapped = STATUS_PRESENTATION[key]
    || (key.startsWith('MENUNGGU_VERIFIKASI') || key.startsWith('MENUNGGU_REVIEW') ? ['Menunggu Verifikasi', 'waiting'] : null)
    || (key.startsWith('MENUNGGU_PENERIMAAN') ? ['Menunggu Penerimaan', 'waiting'] : null)
    || (key.startsWith('MENUNGGU_PENGELUARAN') ? ['Menunggu Pengeluaran', 'waiting'] : null)
    || (key.startsWith('PERLU_REVISI') || key.startsWith('DIKEMBALIKAN') ? ['Perlu Perbaikan', 'danger'] : null);
  const label = mapped?.[0] || fallbackLabel || (key
    ? key.replaceAll('_', ' ').toLocaleLowerCase('id-ID').replace(/(^|\s)\S/g, char => char.toLocaleUpperCase('id-ID'))
    : 'Dalam Proses');
  const tone = STATUS_TONES[mapped?.[1] || 'neutral'];
  return { label, ...tone };
}
