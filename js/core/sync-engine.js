/**
 * core/sync-engine.js — Synchronization Engine Berbasis Master Data Lokal (TASK-SYNC-02).
 *
 * Arsitektur:
 * User Context → Scope Resolver → Demo ERP Provider → Dataset Filter → Persistence Adapter → Sync Metadata
 *
 * Prinsip:
 * 1. "SINGLE SOURCE OF TRUTH" — Memanfaatkan master data canonical existing.
 * 2. "ZERO SESSION POLLUTION" — Dropdown sinkronisasi TIDAK BOLEH menimpa session.divisionId.
 * 3. "ESTATE & DIVISION ISOLATION" — Data lintas estate & divisi dibersihkan sebelum persistence.
 * 4. "DEFENSE IN DEPTH" — Validasi di layer resolver dan dataset filter.
 * 5. "RESILIENT & PERSISTENT" — Status sync persisten setelah reload dan mendukung partial success.
 */

import { storage } from './storage.js';
import { setMeta, getMeta } from '../db/indexeddb.js';
import { normalizeRole, resolveUserContext, ROLES } from './user-context.js';
import { getAllEstates, getNurseryDivisionsByEstate } from '../data/estate-master.js';
import { DEMO_DIVISIONS } from '../data/demo-data.js';
import { getAllWorkers } from '../data/worker-master.js';
import { getAllBlocks } from '../data/block-master.js';
import { getAllBudwoodPlots } from '../data/budwood-plot-master.js';
import { getAllPrograms } from '../data/program-master.js';
import { getAllBedengan } from '../data/bedengan-master.js';
import { getAllBatches } from '../data/batch-master.js';
import { KLON_MASTER } from '../data/klon-master.js';
import { CFNA_MASTER, getAllCfnaMaster } from '../data/cfna-master.js';

// ============================================================================
// CONSTANTS & STATUSES
// ============================================================================

export const SYNC_STATUS = Object.freeze({
  NOT_SYNCED: 'NOT_SYNCED',
  QUEUED: 'QUEUED',
  SYNCING: 'SYNCING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS'
});

export const SCOPE_TYPE = Object.freeze({
  GLOBAL: 'GLOBAL',
  ESTATE: 'ESTATE',
  DIVISION: 'DIVISION',
  NURSERY: 'NURSERY'
});

// ============================================================================
// CANONICAL REFERENCE DATASETS (For ERP Master Codes)
// ============================================================================

export const CANONICAL_ATTENDANCE_CODES = Object.freeze([
  { code: 'H', name: 'Hadir Penuh', type: 'PRESENT', multiplier: 1.0, isWorkingDay: true },
  { code: 'HK', name: 'Hari Kerja Normal', type: 'PRESENT', multiplier: 1.0, isWorkingDay: true },
  { code: 'PB', name: 'Pekerja Bibitan Khusus', type: 'PRESENT', multiplier: 1.0, isWorkingDay: true },
  { code: 'L1', name: 'Lembur 1 Jam', type: 'OVERTIME', multiplier: 1.5, isWorkingDay: true },
  { code: 'L2', name: 'Lembur 2 Jam', type: 'OVERTIME', multiplier: 2.0, isWorkingDay: true },
  { code: 'L3', name: 'Lembur 3 Jam', type: 'OVERTIME', multiplier: 2.5, isWorkingDay: true },
  { code: 'L4', name: 'Lembur 4 Jam atau Lebih', type: 'OVERTIME', multiplier: 3.0, isWorkingDay: true },
  { code: 'H-HL', name: 'Hadir Hari Libur', type: 'HOLIDAY_PRESENT', multiplier: 2.0, isWorkingDay: false }
]);

export const CANONICAL_ABSENCE_CODES = Object.freeze([
  { code: 'C', name: 'Cuti Tahunan', paid: true, requiresDocument: true },
  { code: 'P4', name: 'Izin Resmi (P4)', paid: true, requiresDocument: true },
  { code: 'S', name: 'Sakit dengan Surat Dokter', paid: true, requiresDocument: true },
  { code: 'M', name: 'Mangkir / Tanpa Keterangan', paid: false, requiresDocument: false },
  { code: 'H1', name: 'Cuti Haid', paid: true, requiresDocument: false },
  { code: 'ML', name: 'Cuti Melahirkan', paid: true, requiresDocument: true },
  { code: 'D', name: 'Tugas Dinas Luar', paid: true, requiresDocument: true },
  { code: 'I', name: 'Izin Pribadi', paid: false, requiresDocument: false }
]);

export const CANONICAL_WORKING_HOURS = Object.freeze([
  { id: 'WH-REG', estateId: 'EST-TBS', name: 'Reguler Senin-Kamis', startTime: '07:00', endTime: '14:00', breakStart: '12:00', breakEnd: '13:00', totalHours: 6 },
  { id: 'WH-FRI', estateId: 'EST-TBS', name: 'Reguler Jumat', startTime: '07:00', endTime: '11:30', breakStart: null, breakEnd: null, totalHours: 4.5 },
  { id: 'WH-SAT', estateId: 'EST-TBS', name: 'Reguler Sabtu', startTime: '07:00', endTime: '13:00', breakStart: null, breakEnd: null, totalHours: 6 },
  { id: 'WH-APM-REG', estateId: 'EST-APM', name: 'APM Reguler Senin-Kamis', startTime: '07:00', endTime: '14:00', breakStart: '12:00', breakEnd: '13:00', totalHours: 6 },
  { id: 'WH-APM-FRI', estateId: 'EST-APM', name: 'APM Reguler Jumat', startTime: '07:00', endTime: '11:30', breakStart: null, breakEnd: null, totalHours: 4.5 },
  { id: 'WH-APM-SAT', estateId: 'EST-APM', name: 'APM Reguler Sabtu', startTime: '07:00', endTime: '13:00', breakStart: null, breakEnd: null, totalHours: 6 }
]);

export const CANONICAL_DAY_CHANGES = Object.freeze([
  { id: 'DC-2026-01', estateId: 'EST-TBS', originalDate: '2026-05-01', substituteDate: '2026-05-02', reason: 'Penyesuaian Jadwal Hari Buruh', status: 'APPROVED' },
  { id: 'DC-2026-02', estateId: 'EST-TBS', originalDate: '2026-08-17', substituteDate: '2026-08-18', reason: 'Penyesuaian Hari Kemerdekaan', status: 'APPROVED' },
  { id: 'DC-APM-01', estateId: 'EST-APM', originalDate: '2026-05-01', substituteDate: '2026-05-02', reason: 'APM Penyesuaian Libur Nasional', status: 'APPROVED' }
]);

export const CANONICAL_ASSETS = Object.freeze([
  { id: 'AST-TBS-001', estateId: 'EST-TBS', divisionId: 'DIV-001', assetCode: 'TRK-TBS-01', name: 'Hand Tractor Kubota', category: 'MACHINERY', status: 'ACTIVE' },
  { id: 'AST-TBS-002', estateId: 'EST-TBS', divisionId: 'DIV-001', assetCode: 'PMP-TBS-01', name: 'Pompa Air Diesel Honda 3 Inch', category: 'IRRIGATION', status: 'ACTIVE' },
  { id: 'AST-TBS-003', estateId: 'EST-TBS', divisionId: 'DIV-001', assetCode: 'SPR-TBS-01', name: 'Sprinkler Automatic Set Bedengan', category: 'IRRIGATION', status: 'ACTIVE' },
  { id: 'AST-TBS-004', estateId: 'EST-TBS', divisionId: 'DIV-002', assetCode: 'TRK-TBS-02', name: 'Mini Dumper Kebun', category: 'VEHICLE', status: 'ACTIVE' },
  { id: 'AST-APM-001', estateId: 'EST-APM', divisionId: 'DIV-APM-01', assetCode: 'PMP-APM-01', name: 'Pompa Air Listrik 4 Inch', category: 'IRRIGATION', status: 'ACTIVE' },
  { id: 'AST-APM-002', estateId: 'EST-APM', divisionId: 'DIV-APM-02', assetCode: 'SPR-APM-01', name: 'Sprinkler System APM', category: 'IRRIGATION', status: 'ACTIVE' }
]);

export const CANONICAL_MATERIALS = Object.freeze([
  { id: 'MAT-001', estateId: 'EST-TBS', code: 'PBG-1530', name: 'Kantong Polybag Hitam 15x30 cm', unit: 'Lembar', minStock: 10000, category: 'CONTAINER' },
  { id: 'MAT-002', estateId: 'EST-TBS', code: 'NPK-1515', name: 'Pupuk NPK Mahkota 15-15-15', unit: 'Kg', minStock: 500, category: 'FERTILIZER' },
  { id: 'MAT-003', estateId: 'EST-TBS', code: 'UREA-46', name: 'Pupuk Urea Pusri 46% N', unit: 'Kg', minStock: 300, category: 'FERTILIZER' },
  { id: 'MAT-004', estateId: 'EST-TBS', code: 'FNG-DTH', name: 'Fungisida Dithane M-45 80WP', unit: 'Kg', minStock: 25, category: 'PESTICIDE' },
  { id: 'MAT-005', estateId: 'EST-TBS', code: 'PLT-SKP', name: 'Plastik Sungkup Transparan 0.08mm', unit: 'Roll', minStock: 20, category: 'STRUCTURE' },
  { id: 'MAT-APM-001', estateId: 'EST-APM', code: 'PBG-1530-APM', name: 'Polybag 15x30 cm APM Stock', unit: 'Lembar', minStock: 5000, category: 'CONTAINER' },
  { id: 'MAT-APM-002', estateId: 'EST-APM', code: 'NPK-1515-APM', name: 'Pupuk NPK APM Stock', unit: 'Kg', minStock: 200, category: 'FERTILIZER' }
]);

export const CANONICAL_PROJECTS = Object.freeze([
  { id: 'PRJ-2026-01', estateId: 'EST-TBS', projectCode: 'REPL-TBS-2026', name: 'Replanting Karet Tanah Besih 2026', budgetYear: 2026, status: 'ACTIVE' },
  { id: 'PRJ-2026-02', estateId: 'EST-TBS', projectCode: 'EXP-NUR-TBS', name: 'Perluasan Bedengan Nursery Tahap 2', budgetYear: 2026, status: 'ACTIVE' },
  { id: 'PRJ-APM-2026', estateId: 'EST-APM', projectCode: 'REPL-APM-2026', name: 'Replanting Karet Aek Pamingke 2026', budgetYear: 2026, status: 'ACTIVE' }
]);

// ============================================================================
// 1. SCOPE RESOLVER
// ============================================================================

/**
 * Memetakan dan memvalidasi scope user untuk operasi sinkronisasi.
 *
 * @param {Object} rawUser - User context dari session atau parameter
 * @param {string} [selectedSyncDivisionId] - Nilai divisi yang dipilih di dropdown UI
 * @returns {Object} Normalized Sync Scope Object
 */
export function resolveSyncScope(rawUser, selectedSyncDivisionIds = null) {
  const user = resolveUserContext(rawUser);
  const normalizedRole = normalizeRole(user.role || user.rawRole);

  const rawEstateId = (user.estateId || 'EST-TBS').toUpperCase();
  const isAekPamingke =
    rawEstateId === 'EST-APM' ||
    rawEstateId === 'EST-003' ||
    (user.divisionId && user.divisionId.includes('APM'));

  const primaryEstateId = isAekPamingke ? 'EST-APM' : 'EST-TBS';
  const isPengurus = normalizedRole === ROLES.PENGURUS || normalizedRole === ROLES.PENGURUS_KEBUN_SEPUPU;

  // 1. Master Canonical Operational Divisions
  const TBS_DIVISIONS = [
    { id: 'DIV-001', code: 'DIV-001', name: 'Tanah Besih - Divisi I', estateId: 'EST-TBS', estateName: 'Tanah Besih' },
    { id: 'DIV-002', code: 'DIV-002', name: 'Tanah Besih - Divisi Kantor', estateId: 'EST-TBS', estateName: 'Tanah Besih' },
    { id: 'DIV-003', code: 'DIV-003', name: 'Tanah Besih - Divisi Pabrik', estateId: 'EST-TBS', estateName: 'Tanah Besih' }
  ];

  const APM_DIVISIONS = [
    { id: 'DIV-APM-01', code: 'DIV-APM-01', name: 'Aek Pamingke - Divisi I', estateId: 'EST-APM', estateName: 'Aek Pamingke' },
    { id: 'DIV-APM-02', code: 'DIV-APM-02', name: 'Aek Pamingke - Divisi II', estateId: 'EST-APM', estateName: 'Aek Pamingke' }
  ];

  // 2. Resolve Allowed Divisions & Allowed Estates based on Role Matrix
  let allowedDivisions = [];
  let allowedEstateIds = [];

  if (isPengurus) {
    // Pengurus: Dapat memilih multiple divisi lintas kebun (Tanah Besih + Aek Pamingke)
    allowedDivisions = [...TBS_DIVISIONS, ...APM_DIVISIONS];
    allowedEstateIds = ['EST-TBS', 'EST-APM', 'EST-001', 'EST-002', 'EST-003'];
  } else if (isAekPamingke) {
    // Mantri, ASB, Askep, Asisten APM: Seluruh divisi operasional APM
    allowedDivisions = [...APM_DIVISIONS];
    allowedEstateIds = ['EST-APM', 'EST-003'];
  } else {
    // Mantri, ASB, Askep, Asisten TBS: Seluruh divisi operasional TBS
    allowedDivisions = [...TBS_DIVISIONS];
    allowedEstateIds = ['EST-TBS', 'EST-001', 'EST-002'];
  }

  // 3. Normalisasi & Validasi selectedSyncDivisionIds (mendukung String tunggal maupun Array)
  let rawSelection = [];
  if (Array.isArray(selectedSyncDivisionIds)) {
    rawSelection = selectedSyncDivisionIds;
  } else if (typeof selectedSyncDivisionIds === 'string' && selectedSyncDivisionIds.trim()) {
    rawSelection = [selectedSyncDivisionIds.trim()];
  } else if (selectedSyncDivisionIds && typeof selectedSyncDivisionIds === 'object') {
    rawSelection = selectedSyncDivisionIds.divisionIds || selectedSyncDivisionIds.selectedDivisionIds || [];
  }

  // Filter valid selected division IDs (buang duplikat, buang aggregate placeholder DIV-APM, buang di luar allowed)
  let filteredSelection = [...new Set(
    rawSelection
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id) => id && id !== 'DIV-APM' && allowedDivisions.some((d) => d.id === id))
  )];

  // Default selection jika tidak ada input atau invalid
  if (filteredSelection.length === 0) {
    if (user.divisionId && allowedDivisions.some((d) => d.id === user.divisionId)) {
      filteredSelection = [user.divisionId];
    } else {
      // Default: seluruh divisi pada primary estate user
      filteredSelection = allowedDivisions
        .filter((d) => (isPengurus ? d.estateId === primaryEstateId : true))
        .map((d) => d.id);
      if (filteredSelection.length === 0) {
        filteredSelection = [allowedDivisions[0].id];
      }
    }
  }

  const selectedDivisionId = filteredSelection[0] || allowedDivisions[0].id;
  const selectedDivisionObj = allowedDivisions.find((d) => d.id === selectedDivisionId) || allowedDivisions[0];

  return {
    isValid: true,
    userId: user.userId || user.id || 'USR-001',
    role: normalizedRole,
    rawRole: user.rawRole || normalizedRole,
    estateId: primaryEstateId,
    estateName: isAekPamingke ? 'Aek Pamingke' : 'Tanah Besih',
    estateIds: allowedEstateIds,
    allowedEstateIds,
    allowedDivisionIds: allowedDivisions.map((d) => d.id),
    divisionIds: filteredSelection,
    selectedDivisionIds: filteredSelection,
    selectedDivisionId,
    selectedDivisionName: selectedDivisionObj ? selectedDivisionObj.name : selectedDivisionId,
    allowedDivisions,
    isDivisionLocked: false,
    multiDivision: true,
    allowCrossEstate: isPengurus,
    scopeType: isPengurus ? SCOPE_TYPE.GLOBAL : SCOPE_TYPE.ESTATE
  };
}

// ============================================================================
// 2. DEMO ERP PROVIDER
// ============================================================================

export class DemoErpProvider {
  constructor({ simulateDelayMs = 0 } = {}) {
    this.simulateDelayMs = simulateDelayMs;
  }

  async _delay() {
    if (this.simulateDelayMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulateDelayMs));
    }
  }

  async getEstates(scope) {
    await this._delay();
    const estates = getAllEstates();
    return estates.filter((e) => scope.estateIds.includes(e.estate_id) || scope.estateIds.includes(e.estate_code));
  }

  async getDivisions(scope) {
    await this._delay();
    const allDivisions = [
      { id: 'DIV-001', code: 'DIV-001', name: 'Tanah Besih - Divisi I', estateId: 'EST-TBS' },
      { id: 'DIV-002', code: 'DIV-002', name: 'Tanah Besih - Divisi Kantor', estateId: 'EST-TBS' },
      { id: 'DIV-003', code: 'DIV-003', name: 'Tanah Besih - Divisi Pabrik', estateId: 'EST-TBS' },
      { id: 'DIV-APM-01', code: 'DIV-APM-01', name: 'Aek Pamingke - Divisi I', estateId: 'EST-APM' },
      { id: 'DIV-APM-02', code: 'DIV-APM-02', name: 'Aek Pamingke - Divisi II', estateId: 'EST-APM' }
    ];
    return allDivisions.filter((d) => scope.estateIds.includes(d.estateId) || scope.estateIds.includes(d.estateCode));
  }

  async getWorkers(scope) {
    await this._delay();
    const all = getAllWorkers();
    const activeDivs = (scope.selectedDivisionIds && scope.selectedDivisionIds.length > 0)
      ? scope.selectedDivisionIds
      : (scope.selectedDivisionId ? [scope.selectedDivisionId] : (scope.divisionIds || []));
    return all.filter((w) => {
      const matchEstate = scope.estateIds.includes(w.estateId);
      const matchDiv = !w.divisionId || activeDivs.length === 0 || activeDivs.includes(w.divisionId);
      return matchEstate && matchDiv;
    });
  }

  async getAttendanceCodes(scope) {
    await this._delay();
    return [...CANONICAL_ATTENDANCE_CODES];
  }

  async getAbsenceCodes(scope) {
    await this._delay();
    return [...CANONICAL_ABSENCE_CODES];
  }

  async getWorkingHours(scope) {
    await this._delay();
    return CANONICAL_WORKING_HOURS.filter((wh) => !wh.estateId || scope.estateIds.includes(wh.estateId));
  }

  async getDayChanges(scope) {
    await this._delay();
    return CANONICAL_DAY_CHANGES.filter((dc) => !dc.estateId || scope.estateIds.includes(dc.estateId));
  }

  async getAssets(scope) {
    await this._delay();
    const activeDivs = (scope.selectedDivisionIds && scope.selectedDivisionIds.length > 0)
      ? scope.selectedDivisionIds
      : (scope.selectedDivisionId ? [scope.selectedDivisionId] : (scope.divisionIds || []));
    return CANONICAL_ASSETS.filter((ast) => {
      const matchEstate = !ast.estateId || scope.estateIds.includes(ast.estateId);
      const matchDiv = !ast.divisionId || activeDivs.length === 0 || activeDivs.includes(ast.divisionId);
      return matchEstate && matchDiv;
    });
  }

  async getFaces(scope) {
    await this._delay();
    // Facial biometric embeddings linked to workers in scope
    const workers = await this.getWorkers(scope);
    return workers.map((w) => ({
      workerId: w.id,
      workerCode: w.code,
      name: w.name,
      divisionId: w.divisionId,
      estateId: w.estateId,
      photoUrl: w.defaultPhoto || 'assets/icons/worker_fadilah.jpg',
      embeddingVectorSize: 128,
      verifiedAt: '2026-01-10T08:00:00Z',
      status: 'VERIFIED'
    }));
  }

  async getWorkerLeaves(scope) {
    await this._delay();
    const workers = await this.getWorkers(scope);
    return workers.map((w, idx) => ({
      id: `LV-${w.id}`,
      workerId: w.id,
      workerName: w.name,
      divisionId: w.divisionId,
      estateId: w.estateId,
      totalAnnualQuota: 12,
      usedDays: idx % 2 === 0 ? 3 : 1,
      remainingDays: idx % 2 === 0 ? 9 : 11,
      periodYear: 2026
    }));
  }

  async getMangkir(scope) {
    await this._delay();
    const workers = await this.getWorkers(scope);
    const absentWorkers = workers.filter((w) => w.active === false || w.absentType === 'M');
    return absentWorkers.map((w) => ({
      id: `MK-${w.id}`,
      workerId: w.id,
      workerName: w.name,
      divisionId: w.divisionId,
      estateId: w.estateId,
      incidentDate: '2026-04-12',
      reason: 'Tidak ada kabar / Alfa',
      severity: 'WARNING_1'
    }));
  }

  async getMaterials(scope) {
    await this._delay();
    return CANONICAL_MATERIALS.filter((m) => !m.estateId || scope.estateIds.includes(m.estateId));
  }

  async getProjects(scope) {
    await this._delay();
    return CANONICAL_PROJECTS.filter((p) => !p.estateId || scope.estateIds.includes(p.estateId));
  }

  async getPrograms(scope) {
    await this._delay();
    const all = getAllPrograms();
    return all.filter((p) => !p.estateId || scope.estateIds.includes(p.estateId));
  }

  async getBudwoodPlots(scope) {
    await this._delay();
    return getAllBudwoodPlots();
  }

  async getBatches(scope) {
    await this._delay();
    const all = getAllBatches();
    const activeDivs = (scope.selectedDivisionIds && scope.selectedDivisionIds.length > 0)
      ? scope.selectedDivisionIds
      : (scope.selectedDivisionId ? [scope.selectedDivisionId] : (scope.divisionIds || []));
    return all.filter((b) => {
      const matchEstate = !b.estateId || scope.estateIds.includes(b.estateId);
      const matchDiv = !b.divisionId || activeDivs.length === 0 || activeDivs.includes(b.divisionId);
      return matchEstate && matchDiv;
    });
  }

  async getBedengan(scope) {
    await this._delay();
    const all = getAllBedengan();
    const activeDivs = (scope.selectedDivisionIds && scope.selectedDivisionIds.length > 0)
      ? scope.selectedDivisionIds
      : (scope.selectedDivisionId ? [scope.selectedDivisionId] : (scope.divisionIds || []));
    return all.filter((b) => {
      const matchEstate = !b.estateId || scope.estateIds.includes(b.estateId);
      const matchDiv = !b.divisionId || activeDivs.length === 0 || activeDivs.includes(b.divisionId);
      return matchEstate && matchDiv;
    });
  }

  async getBlocks(scope) {
    await this._delay();
    const all = getAllBlocks();
    const activeDivs = (scope.selectedDivisionIds && scope.selectedDivisionIds.length > 0)
      ? scope.selectedDivisionIds
      : (scope.selectedDivisionId ? [scope.selectedDivisionId] : (scope.divisionIds || []));
    return all.filter((b) => {
      const matchEstate = scope.estateIds.includes(b.estateCode);
      const matchDiv = !b.divisionCode || activeDivs.length === 0 || activeDivs.includes(b.divisionCode);
      return matchEstate && matchDiv;
    });
  }

  async getClones(scope) {
    await this._delay();
    return getAllKlon();
  }

  async getCFNA(scope) {
    await this._delay();
    return getAllCfnaMaster();
  }
}

// ============================================================================
// 3. CENTRAL DATASET REGISTRY
// ============================================================================

export const SYNC_DATASET_CONFIG = Object.freeze([
  {
    key: 'kebun',
    label: 'Kebun',
    scopeType: SCOPE_TYPE.ESTATE,
    fetcher: (provider, scope) => provider.getEstates(scope),
    isGlobal: false
  },
  {
    key: 'divisi',
    label: 'Divisi',
    scopeType: SCOPE_TYPE.ESTATE,
    fetcher: (provider, scope) => provider.getDivisions(scope),
    isGlobal: false
  },
  {
    key: 'pekerja',
    label: 'Pekerja',
    scopeType: SCOPE_TYPE.DIVISION,
    fetcher: (provider, scope) => provider.getWorkers(scope),
    isGlobal: false
  },
  {
    key: 'kode-kehadiran',
    label: 'Kode Kehadiran',
    scopeType: SCOPE_TYPE.GLOBAL,
    fetcher: (provider, scope) => provider.getAttendanceCodes(scope),
    isGlobal: true
  },
  {
    key: 'ketidakhadiran',
    label: 'Ketidakhadiran',
    scopeType: SCOPE_TYPE.GLOBAL,
    fetcher: (provider, scope) => provider.getAbsenceCodes(scope),
    isGlobal: true
  },
  {
    key: 'jam-kerja',
    label: 'Jam Kerja',
    scopeType: SCOPE_TYPE.ESTATE,
    fetcher: (provider, scope) => provider.getWorkingHours(scope),
    isGlobal: false
  },
  {
    key: 'ganti-hari',
    label: 'Ganti Hari',
    scopeType: SCOPE_TYPE.ESTATE,
    fetcher: (provider, scope) => provider.getDayChanges(scope),
    isGlobal: false
  },
  {
    key: 'aset',
    label: 'Aset',
    scopeType: SCOPE_TYPE.DIVISION,
    fetcher: (provider, scope) => provider.getAssets(scope),
    isGlobal: false
  },
  {
    key: 'wajah',
    label: 'Wajah',
    scopeType: SCOPE_TYPE.DIVISION,
    fetcher: (provider, scope) => provider.getFaces(scope),
    isGlobal: false
  },
  {
    key: 'cuti-pekerja',
    label: 'Cuti Pekerja',
    scopeType: SCOPE_TYPE.DIVISION,
    fetcher: (provider, scope) => provider.getWorkerLeaves(scope),
    isGlobal: false
  },
  {
    key: 'mangkir',
    label: 'Mangkir',
    scopeType: SCOPE_TYPE.DIVISION,
    fetcher: (provider, scope) => provider.getMangkir(scope),
    isGlobal: false
  },
  {
    key: 'material',
    label: 'Material',
    scopeType: SCOPE_TYPE.ESTATE,
    fetcher: (provider, scope) => provider.getMaterials(scope),
    isGlobal: false
  },
  {
    key: 'proyek',
    label: 'Proyek',
    scopeType: SCOPE_TYPE.ESTATE,
    fetcher: (provider, scope) => provider.getProjects(scope),
    isGlobal: false
  },
  {
    key: 'program-pembibitan',
    label: 'Program Pembibitan',
    scopeType: SCOPE_TYPE.ESTATE,
    fetcher: (provider, scope) => provider.getPrograms(scope),
    isGlobal: false
  },
  {
    key: 'kebun-entres',
    label: 'Kebun Entres',
    scopeType: SCOPE_TYPE.GLOBAL,
    fetcher: (provider, scope) => provider.getBudwoodPlots(scope),
    isGlobal: true
  },
  {
    key: 'batch',
    label: 'Batch',
    scopeType: SCOPE_TYPE.NURSERY,
    fetcher: (provider, scope) => provider.getBatches(scope),
    isGlobal: false
  },
  {
    key: 'bedengan',
    label: 'Bedengan',
    scopeType: SCOPE_TYPE.NURSERY,
    fetcher: (provider, scope) => provider.getBedengan(scope),
    isGlobal: false
  }
]);

// ============================================================================
// 4. DATASET DEFENSE FILTER
// ============================================================================

/**
 * Filter kedua (defense-in-depth) untuk menjamin data lintas estate/divisi
 * yang tidak sengaja dikembalikan provider dibersihkan sebelum disimpan ke storage.
 */
export function filterDatasetByScope(datasetConfig, rawData, scope) {
  if (!Array.isArray(rawData)) return [];
  if (datasetConfig.isGlobal) return rawData;

  const activeDivs = (scope.selectedDivisionIds && scope.selectedDivisionIds.length > 0)
    ? scope.selectedDivisionIds
    : (scope.selectedDivisionId ? [scope.selectedDivisionId] : (scope.divisionIds || []));

  return rawData.filter((item) => {
    if (!item || typeof item !== 'object') return false;

    // Check Estate Boundary
    const itemEstate = item.estateId || item.estateCode || item.estate_id || item.estate_code;
    if (itemEstate && !scope.estateIds.includes(itemEstate)) {
      return false;
    }

    // Check Division Boundary for Division/Nursery Scoped Datasets
    if (datasetConfig.scopeType === SCOPE_TYPE.DIVISION || datasetConfig.scopeType === SCOPE_TYPE.NURSERY) {
      const itemDiv = item.divisionId || item.divisionCode || item.division_id || item.division_code;
      if (itemDiv && activeDivs.length > 0) {
        if (!activeDivs.includes(itemDiv)) return false;
      }
    }

    return true;
  });
}

// ============================================================================
// 5. PERSISTENCE ADAPTER & METADATA STORE
// ============================================================================

export class SyncPersistenceAdapter {
  static getStorageKey(datasetKey, scope) {
    if (!scope || scope.scopeType === SCOPE_TYPE.GLOBAL) {
      return `sync_data_${datasetKey}_GLOBAL`;
    }
    const divKey = (scope.selectedDivisionIds && scope.selectedDivisionIds.length > 0)
      ? scope.selectedDivisionIds.slice().sort().join('_')
      : (scope.selectedDivisionId || 'ALL');
    return `sync_data_${datasetKey}_${scope.estateId}_${divKey}`;
  }

  static getStatusStorageKey(userId) {
    return `sync_status_${userId || 'default'}`;
  }

  static saveDataset(datasetKey, data, scope) {
    const key = this.getStorageKey(datasetKey, scope);
    const payload = {
      datasetKey,
      estateId: scope.estateId,
      divisionId: scope.selectedDivisionId,
      divisionIds: scope.selectedDivisionIds,
      scopeType: scope.scopeType,
      syncedBy: scope.userId,
      syncedAt: new Date().toISOString(),
      recordCount: data.length,
      data
    };
    storage.set(key, payload);
    return payload;
  }

  static getDataset(datasetKey, scope) {
    const key = this.getStorageKey(datasetKey, scope);
    return storage.get(key, null);
  }

  static saveStatuses(userId, statuses) {
    const key = this.getStatusStorageKey(userId);
    storage.set(key, statuses);
  }

  static getStatuses(userId) {
    const key = this.getStatusStorageKey(userId);
    return storage.get(key, {});
  }

  static saveSelection(userId, divisionIds) {
    if (!userId) return;
    const cleanIds = Array.isArray(divisionIds) ? divisionIds : [divisionIds];
    storage.set(`sync_selection_${userId}`, cleanIds);
  }

  static getSelection(userId) {
    if (!userId) return null;
    return storage.get(`sync_selection_${userId}`, null);
  }

  static clearSelection(userId) {
    if (!userId) return;
    storage.remove(`sync_selection_${userId}`);
  }
}

// ============================================================================
// 6. SYNC SERVICE (CORE ORCHESTRATOR)
// ============================================================================

export class SyncService {
  constructor({ provider = new DemoErpProvider({ simulateDelayMs: 60 }) } = {}) {
    this.provider = provider;
  }

  /**
   * Mengambil status seluruh dataset untuk user tertentu.
   */
  getStatuses(userId) {
    return SyncPersistenceAdapter.getStatuses(userId);
  }

  /**
   * Mengambil status satu dataset.
   */
  getDatasetStatus(userId, datasetKey) {
    const statuses = this.getStatuses(userId);
    return statuses[datasetKey] || {
      datasetKey,
      status: SYNC_STATUS.NOT_SYNCED,
      recordCount: 0,
      lastAttemptAt: null,
      lastSuccessAt: null,
      errorMessage: null
    };
  }

  /**
   * Menjalankan proses sinkronisasi menyeluruh.
   *
   * @param {Object} rawUser - User context login
   * @param {string|Array<string>} [selectedDivisionIds] - Pilihan divisi dari UI (single atau multiple array)
   * @param {Function} [onProgress] - Callback progress ({ datasetKey, status, recordCount, current, total })
   * @returns {Promise<Object>} Sync Summary Result
   */
  async syncAllDatasets(rawUser, selectedDivisionIds = null, onProgress = null) {
    const scope = resolveSyncScope(rawUser, selectedDivisionIds);
    if (!scope.isValid) {
      throw new Error('[SyncService] User scope tidak valid untuk sinkronisasi.');
    }

    const userId = scope.userId;
    const statuses = { ...SyncPersistenceAdapter.getStatuses(userId) };
    const datasets = SYNC_DATASET_CONFIG;
    const total = datasets.length;
    let successCount = 0;
    let failedCount = 0;

    // Persist active selection for the user
    SyncPersistenceAdapter.saveSelection(userId, scope.selectedDivisionIds);

    // 1. Inisialisasi status QUEUED
    datasets.forEach((ds) => {
      statuses[ds.key] = {
        datasetKey: ds.key,
        label: ds.label,
        status: SYNC_STATUS.QUEUED,
        recordCount: statuses[ds.key]?.recordCount || 0,
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: statuses[ds.key]?.lastSuccessAt || null,
        errorMessage: null,
        estateId: scope.estateId,
        divisionId: scope.selectedDivisionId,
        divisionIds: scope.selectedDivisionIds
      };
    });
    SyncPersistenceAdapter.saveStatuses(userId, statuses);

    // 2. Eksekusi sync dataset satu per satu
    for (let i = 0; i < total; i++) {
      const ds = datasets[i];

      // Update status SYNCING
      statuses[ds.key].status = SYNC_STATUS.SYNCING;
      SyncPersistenceAdapter.saveStatuses(userId, statuses);
      if (typeof onProgress === 'function') {
        onProgress({
          datasetKey: ds.key,
          label: ds.label,
          status: SYNC_STATUS.SYNCING,
          recordCount: statuses[ds.key].recordCount,
          current: i + 1,
          total
        });
      }

      try {
        // A. Ambil data dari provider
        const rawData = await ds.fetcher(this.provider, scope);

        // B. Filter defense in depth
        const filteredData = filterDatasetByScope(ds, rawData, scope);

        // C. Persist data
        SyncPersistenceAdapter.saveDataset(ds.key, filteredData, scope);

        // D. Update metadata status
        const nowIso = new Date().toISOString();
        statuses[ds.key].status = SYNC_STATUS.SUCCESS;
        statuses[ds.key].recordCount = filteredData.length;
        statuses[ds.key].lastSuccessAt = nowIso;
        statuses[ds.key].lastAttemptAt = nowIso;
        statuses[ds.key].errorMessage = null;
        successCount++;
      } catch (err) {
        console.error(`[SyncService] Gagal sinkronisasi dataset '${ds.key}':`, err);
        statuses[ds.key].status = SYNC_STATUS.FAILED;
        statuses[ds.key].errorMessage = err.message || 'Gagal mengambil data dari provider';
        statuses[ds.key].lastAttemptAt = new Date().toISOString();
        failedCount++;
      }

      SyncPersistenceAdapter.saveStatuses(userId, statuses);
      if (typeof onProgress === 'function') {
        onProgress({
          datasetKey: ds.key,
          label: ds.label,
          status: statuses[ds.key].status,
          recordCount: statuses[ds.key].recordCount,
          errorMessage: statuses[ds.key].errorMessage,
          current: i + 1,
          total
        });
      }
    }

    // 3. Tentukan Overall Status
    let overallStatus = SYNC_STATUS.SUCCESS;
    if (failedCount > 0) {
      overallStatus = successCount > 0 ? SYNC_STATUS.PARTIAL_SUCCESS : SYNC_STATUS.FAILED;
    }

    const completedAt = new Date();

    // 4. Update Meta di IndexedDB (kompatibel dengan legacy reader di browser)
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      try {
        await setMeta(`sync_status_${userId}`, {
          userId,
          divisionId: scope.selectedDivisionId,
          divisionIds: scope.selectedDivisionIds,
          estateId: scope.estateId,
          estateIds: scope.estateIds,
          syncedAt: completedAt.toISOString(),
          status: overallStatus,
          successCount,
          failedCount,
          total
        });
        await setMeta('lastSync', {
          userId,
          divisionId: scope.selectedDivisionId,
          divisionIds: scope.selectedDivisionIds,
          estateId: scope.estateId,
          estateIds: scope.estateIds,
          syncedAt: completedAt.toISOString(),
          status: overallStatus
        });
      } catch (e) {
        console.warn('[SyncService] Gagal menyimpan lastSync meta ke IndexedDB:', e);
      }
    }

    return {
      overallStatus,
      successCount,
      failedCount,
      total,
      syncedAt: completedAt,
      scope,
      statuses
    };
  }
}

// Export singleton instance untuk kemudahan pemakaian
export const defaultSyncService = new SyncService();
