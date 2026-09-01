/**
 * data/master-data.js — master data statis (roles, clones, stages, reasons, growth stages).
 * Data dummy; jangan ubah requirement tanpa konfirmasi.
 */

export const ROLES_MASTER = [
  { id: 'MANTRI_TANAMAN', code: 'MANTRI_TANAMAN', name: 'Mantri Tanaman', desc: 'Input & pelaksanaan kegiatan operasional' },
  { id: 'ASISTEN', code: 'ASISTEN', name: 'Asisten', desc: 'Verifikasi & review/koreksi transaksi' },
  { id: 'ASISTEN_BIBITAN', code: 'ASISTEN_BIBITAN', name: 'Asisten Bibitan', desc: 'Verifikasi & approval bibitan' },
  { id: 'ASKEP', code: 'ASKEP', name: 'Askep', desc: 'Monitoring & approval sesuai kewenangan' },
  { id: 'PENGURUS', code: 'PENGURUS', name: 'Pengurus', desc: 'Monitoring & approval/penentuan sumber' }
];

export const CLONES = [
  { id: 'CLONE-PB260', code: 'PB 260', name: 'PB 260' },
  { id: 'CLONE-RRIM600', code: 'RRIM 600', name: 'RRIM 600' },
  { id: 'CLONE-GT1', code: 'GT 1', name: 'GT 1' }
];

export const GROWTH_STAGES = [
  { id: 'STAGE-RMN', code: 'RMN', name: 'Rootstock Mother Nursery' },
  { id: 'STAGE-RAPM', code: 'RAPM', name: 'RAPM' }
];

export const RECEPTION_STAGES = [
  { id: 'STAGE-RMN', code: 'RMN', name: 'RMN' },
  { id: 'STAGE-RAPM', code: 'RAPM', name: 'RAPM' }
];

export const ORIGIN_TYPES = [
  { id: 'SUPPLIER', code: 'Supplier', name: 'Supplier' },
  { id: 'OWN_ESTATE', code: 'Own Estate', name: 'Own Estate' },
  { id: 'OTHERS', code: 'Others', name: 'Others' }
];

export const RECEIPT_TYPES = [
  { id: 'RT-SEED', code: 'BIJI', name: 'Biji' },
  { id: 'RT-STUMP', code: 'STUMP', name: 'Stump' },
  { id: 'RT-SEEDLING', code: 'BIBIT', name: 'Bibit' }
];

export const REASONS = [
  { id: 'REASON-DEAD', code: 'MATI', name: 'Mati' },
  { id: 'REASON-ABNORMAL', code: 'ABNORMAL', name: 'Abnormal' },
  { id: 'REASON-DAMAGED', code: 'RUSAK', name: 'Rusak' }
];

export const BEDS = [
  { id: 'BED-001', code: 'BED-001', name: 'Bedengan 001' },
  { id: 'BED-002', code: 'BED-002', name: 'Bedengan 002' },
  { id: 'BED-003', code: 'BED-003', name: 'Bedengan 003' }
];
