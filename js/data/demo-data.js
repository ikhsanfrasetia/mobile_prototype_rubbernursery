/**
 * data/demo-data.js — data dummy untuk seed.
 * Users: MNT001, AST001, ASK001, PGS001. Program nursery, divisions, estates,
 * workers, suppliers, warehouse stocks (tanggal hari ini agar flow Supplier testable).
 */

import { todayISO, nowISO } from '../core/utils.js';

const TODAY = todayISO();
const NOW = nowISO();

export const DEMO_USERS = [
  {
    id: 'MNT001',
    code: '1405482',
    name: 'Wagiman',
    role: 'MANTRI_TANAMAN',
    position: 'Mantri Bibitan',
    divisionId: 'DIV-001',
    password: 'demo',
    active: true
  },
  {
    id: 'AST001',
    code: 'AST001',
    name: 'Asisten',
    role: 'ASISTEN',
    divisionId: 'DIV-001',
    password: 'demo',
    active: true
  },
  {
    id: 'ASK001',
    code: 'ASK001',
    name: 'Askep',
    role: 'ASKEP',
    divisionId: 'DIV-001',
    password: 'demo',
    active: true
  },
  {
    id: 'PGS001',
    code: 'PGS001',
    name: 'Pengurus',
    role: 'PENGURUS',
    divisionId: 'DIV-001',
    password: 'demo',
    active: true
  }
];

export const DEMO_DIVISIONS = [
  { id: 'DIV-001', code: 'DIV-001', name: 'Divisi I', estateId: 'EST-001' },
  { id: 'DIV-002', code: 'DIV-002', name: 'Divisi Kantor', estateId: 'EST-001' },
  { id: 'DIV-003', code: 'DIV-003', name: 'Divisi Pabrik', estateId: 'EST-002' }
];

export const DEMO_ESTATES = [
  { id: 'EST-001', code: 'EST-001', name: 'Kebun Induk 1' },
  { id: 'EST-002', code: 'EST-002', name: 'Kebun Induk 2' }
];

export const DEMO_PROGRAM_REPLANTING = [
  {
    id: 'PRP-2026-01',
    code: 'PRP-2026-01',
    name: 'Program Replanting 2026',
    year: 2026,
    status: 'ACTIVE'
  },
  {
    id: 'PRP-2026-02',
    code: 'PRP-2026-02',
    name: 'Program Replanting 2026 Tahap 2',
    year: 2026,
    status: 'ACTIVE'
  }
];

export const DEMO_PROGRAM_NURSERY = [
  {
    id: 'PN-2026-01',
    code: 'PN-2026-01',
    name: 'Program Nursery 2026 - Batch 1',
    programReplantingId: 'PRP-2026-01',
    status: 'ACTIVE',
    periodStart: `${new Date().getFullYear()}-01-01`,
    periodEnd: `${new Date().getFullYear()}-12-31`
  },
  {
    id: 'PN-2026-02',
    code: 'PN-2026-02',
    name: 'Program Nursery 2026 - Batch 2',
    programReplantingId: 'PRP-2026-01',
    status: 'ACTIVE',
    periodStart: `${new Date().getFullYear()}-01-01`,
    periodEnd: `${new Date().getFullYear()}-12-31`
  },
  {
    id: 'PN-2026-03',
    code: 'PN-2026-03',
    name: 'Program Nursery 2026 - Tahap 2',
    programReplantingId: 'PRP-2026-02',
    status: 'ACTIVE',
    periodStart: `${new Date().getFullYear()}-01-01`,
    periodEnd: `${new Date().getFullYear()}-12-31`
  }
];

export const DEMO_WORKERS = [
  { id: 'WRK-001', code: '1405739', name: 'Fadilah Yusuf Purba', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: true, indicator: '1', defaultPhoto: 'assets/icons/worker_fadilah.jpg' },
  { id: 'WRK-002', code: '1405739', name: 'Adek Apria Syahputra', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: true, defaultPhoto: 'assets/icons/worker_adek.jpg' },
  { id: 'WRK-003', code: '1405739', name: 'Bidara Iswanda', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: true, defaultPhoto: 'assets/icons/worker_bidara.jpg' },
  { id: 'WRK-004', code: '1405739', name: 'Tugiman', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: true, defaultPhoto: 'assets/icons/worker_tugiman.jpg' },
  { id: 'WRK-ABS-001', code: '1405739', name: 'Supriadi', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: false, absentType: 'C', absentReason: 'Cuti' },
  { id: 'WRK-ABS-002', code: '1405739', name: 'Pahrul', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: false, absentType: 'P4', absentReason: 'P4' },
  { id: 'WRK-005', code: '1405810', name: 'Budi Santoso', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: true, defaultPhoto: 'assets/icons/worker_fadilah.jpg' },
  { id: 'WRK-006', code: '1405811', name: 'Andi Wijaya', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: true, defaultPhoto: 'assets/icons/worker_adek.jpg' },
  { id: 'WRK-007', code: '1405812', name: 'Joko Prasetyo', position: 'Pekerja Bibitan', divisionId: 'DIV-001', active: true, defaultPhoto: 'assets/icons/worker_bidara.jpg' }
];

export const DEMO_SUPPLIERS = [
  { id: 'SUP-001', code: 'SUP-001', name: 'Supplier Bibit Jaya', active: true },
  { id: 'SUP-002', code: 'SUP-002', name: 'CV. Agro Seedindo', active: true },
  { id: 'SUP-003', code: 'SUP-003', name: 'PT. Sumber Klon', active: true }
];

export const DEMO_WAREHOUSE_STOCKS = [
  {
    id: 'STK-001',
    code: 'STK-001',
    supplierId: 'SUP-001',
    cloneId: 'CLONE-PB260',
    quantity: 5000,
    receiptDate: TODAY,
    stage: 'RMN',
    createdAt: NOW
  },
  {
    id: 'STK-002',
    code: 'STK-002',
    supplierId: 'SUP-001',
    cloneId: 'CLONE-RRIM600',
    quantity: 3000,
    receiptDate: TODAY,
    stage: 'RMN',
    createdAt: NOW
  },
  {
    id: 'STK-003',
    code: 'STK-003',
    supplierId: 'SUP-002',
    cloneId: 'CLONE-GT1',
    quantity: 2000,
    receiptDate: TODAY,
    stage: 'RAPM',
    createdAt: NOW
  },
  {
    id: 'STK-004',
    code: 'STK-004',
    supplierId: 'SUP-003',
    cloneId: 'CLONE-PB260',
    quantity: 8000,
    receiptDate: TODAY,
    stage: 'RMN',
    createdAt: NOW
  }
];

/** Data seed lengkap untuk dimuat ke IndexedDB. */
export function buildSeedData() {
  return {
    users: DEMO_USERS,
    roles: ROLES_DEMO(),
    divisions: DEMO_DIVISIONS,
    estates: DEMO_ESTATES,
    programReplanting: DEMO_PROGRAM_REPLANTING,
    programNursery: DEMO_PROGRAM_NURSERY,
    clones: CLONES_DEMO(),
    workers: DEMO_WORKERS,
    suppliers: DEMO_SUPPLIERS,
    warehouseStocks: DEMO_WAREHOUSE_STOCKS,
    growthStages: GROWTH_STAGES_DEMO(),
    beds: BEDS_DEMO(),
    reasons: REASONS_DEMO()
  };
}

/* Re-export master statis sebagai objek seed agar konsisten satu sumber. */
function ROLES_DEMO() {
  return [
    { id: 'MANTRI_TANAMAN', code: 'MANTRI_TANAMAN', name: 'Mantri Tanaman' },
    { id: 'ASISTEN', code: 'ASISTEN', name: 'Asisten' },
    { id: 'ASKEP', code: 'ASKEP', name: 'Askep' },
    { id: 'PENGURUS', code: 'PENGURUS', name: 'Pengurus' }
  ];
}

function CLONES_DEMO() {
  return [
    { id: 'CLONE-PB260', code: 'PB 260', name: 'PB 260' },
    { id: 'CLONE-RRIM600', code: 'RRIM 600', name: 'RRIM 600' },
    { id: 'CLONE-GT1', code: 'GT 1', name: 'GT 1' }
  ];
}

function GROWTH_STAGES_DEMO() {
  return [
    { id: 'STAGE-RMN', code: 'RMN', name: 'Rootstock Mother Nursery' },
    { id: 'STAGE-RAPM', code: 'RAPM', name: 'RAPM' }
  ];
}

function BEDS_DEMO() {
  return [
    { id: 'BED-001', code: 'BED-001', name: 'Bedengan 001' },
    { id: 'BED-002', code: 'BED-002', name: 'Bedengan 002' },
    { id: 'BED-003', code: 'BED-003', name: 'Bedengan 003' }
  ];
}

function REASONS_DEMO() {
  return [
    { id: 'REASON-DEAD', code: 'MATI', name: 'Mati' },
    { id: 'REASON-ABNORMAL', code: 'ABNORMAL', name: 'Abnormal' },
    { id: 'REASON-DAMAGED', code: 'RUSAK', name: 'Rusak' }
  ];
}
