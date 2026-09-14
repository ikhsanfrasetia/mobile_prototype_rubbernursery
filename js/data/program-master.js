/**
 * data/program-master.js — Master Data & Provider Terpusat Program Pembibitan (TASK ASB-02 & TASK-IMPLEMENT-PROGRAM-MASTER-01).
 * 
 * Prinsip:
 * - "SINGLE SOURCE OF TRUTH"
 * - BUKAN menu & BUKAN CRUD
 * - Read-only reference provider untuk Role ASISTEN_BIBITAN (select) & MANTRI (consume)
 * - Provider Architecture: Mendukung Dummy Prototype & Future ERP Provider
 * - Status Lifecycle Bisnis: OPEN / CLOSE
 */

export const PROGRAM_STATUS = Object.freeze({
  OPEN: 'OPEN',
  CLOSE: 'CLOSE',
  // Compatibility Aliases for existing callers
  ACTIVE: 'OPEN',
  INACTIVE: 'CLOSE'
});

/**
 * Canonical Master Dataset Program Pembibitan (Baseline Bisnis Terkunci)
 * Prototype Data: 2 Program Utama berstatus OPEN
 */
export const PROGRAM_MASTER = Object.freeze([
  // =========================================================================
  // PROGRAM 1: TANAH BESIH (EST-TBS) — DIVISI I (DIV-001) — BLOK 001/91
  // =========================================================================
  {
    id: 'PRG-TBS-2026-001',
    code: '2026/TB/RNUR/001',
    name: 'RB Nursery Program 2026-2027 TB',
    estateId: 'EST-TBS',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockId: 'BLK-001',
    blockCode: '001/91',
    blockName: 'Block 001/91',
    startDate: '2026-09-01',
    endDate: '2027-09-01',
    year: 2026,
    status: PROGRAM_STATUS.OPEN,
    // Backward compatibility aliases
    legacyCodes: [
      'PRG-2026-001', 'PN-2026-01', 'PRG/NUR/01/2026', 'PRG/NUR/TB/01/2026', '1',
      'PRG-2026-002', 'PN-2026-02', 'PRG/NUR/02/2027', '2',
      'PRG-2026-004', 'PN-2026-04', 'PRG/NUR/TB/02/2026',
      'Program Nursery 2026 - Batch 1', 'Program Nursery 2026 - Batch 2', 'Program Replanting Tanah Besih 2026'
    ],
    estateIds: ['EST-TBS', 'EST-001', 'EST-002'],
    divisionIds: ['DIV-001', 'DIV1', 'DIV2'],
    programReplantingId: 'PRP-2026-01',
    periodStart: '2026-09-01',
    periodEnd: '2027-09-01'
  },

  // =========================================================================
  // PROGRAM 2: AEK PAMINGKE (EST-APM) — DIVISI II (DIV-APM-02) — BLOK 007/03
  // =========================================================================
  {
    id: 'PRG-APM-2026-001',
    code: '2026/AP/RNUR/001',
    name: 'RB Nursery Program 2026-2027 AP',
    estateId: 'EST-APM',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionId: 'DIV-APM-02',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockId: null, // Reference business blockCode '007/03' (Site Nursery APM)
    blockCode: '007/03',
    blockName: 'Block 007/03',
    startDate: '2026-09-01',
    endDate: '2027-09-01',
    year: 2026,
    status: PROGRAM_STATUS.OPEN,
    // Backward compatibility aliases
    legacyCodes: [
      'PRG-2026-003', 'PN-2026-03', 'PRG/NUR/03/2028', '3',
      'Program Nursery 2026 - Tahap 2'
    ],
    estateIds: ['EST-APM', 'EST-003'],
    divisionIds: ['DIV-APM-02', 'DIV3'],
    programReplantingId: 'PRP-2026-02',
    periodStart: '2026-09-01',
    periodEnd: '2027-09-01'
  }
]);

/**
 * Dummy / Mock Program Provider untuk Prototype Frontend
 */
export class DummyProgramProvider {
  constructor(programs = PROGRAM_MASTER) {
    this._programs = Object.freeze([...programs]);
  }

  getAll() {
    return [...this._programs];
  }

  getOpen(filters = {}) {
    let list = this._programs.filter(p => p.status === PROGRAM_STATUS.OPEN || p.status === 'ACTIVE');
    if (filters && typeof filters === 'object') {
      if (filters.estateId) {
        const clean = String(filters.estateId).trim().toUpperCase();
        list = list.filter(p => 
          (p.estateId && p.estateId.toUpperCase() === clean) ||
          (p.estateCode && p.estateCode.toUpperCase() === clean) ||
          (p.estateIds && p.estateIds.some(e => 
            e.toUpperCase() === clean ||
            (clean.includes('TBS') && (e.includes('TBS') || e === 'EST-001' || e === 'EST-002')) ||
            (clean.includes('APM') && (e.includes('APM') || e === 'EST-003'))
          ))
        );
      }
      if (filters.divisionId) {
        const cleanDiv = String(filters.divisionId).trim().toUpperCase();
        list = list.filter(p => 
          (p.divisionId && p.divisionId.toUpperCase() === cleanDiv) ||
          (p.divisionCode && p.divisionCode.toUpperCase() === cleanDiv) ||
          (p.divisionIds && p.divisionIds.some(d => 
            d.toUpperCase() === cleanDiv ||
            (cleanDiv.includes('DIV-001') && (d.includes('DIV-001') || d === 'DIV1')) ||
            (cleanDiv.includes('DIV-APM-02') && (d.includes('DIV-APM-02') || d === 'DIV2' || d === 'DIV3'))
          ))
        );
      }
      if (filters.blockIdOrCode || filters.blockId || filters.blockCode) {
        const targetBlock = String(filters.blockIdOrCode || filters.blockId || filters.blockCode).trim().toUpperCase();
        list = list.filter(p => 
          (p.blockId && p.blockId.toUpperCase() === targetBlock) ||
          (p.blockCode && p.blockCode.toUpperCase() === targetBlock)
        );
      }
    }
    return list;
  }

  getActive(filters = {}) {
    return this.getOpen(filters);
  }

  getById(id) {
    if (!id) return null;
    const clean = String(id).trim().toUpperCase();
    return this._programs.find(p => 
      p.id.toUpperCase() === clean ||
      (p.legacyCodes && p.legacyCodes.some(lc => lc.toUpperCase() === clean))
    ) || null;
  }

  getByCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();
    return this._programs.find(p => 
      p.code.toUpperCase() === clean ||
      p.id.toUpperCase() === clean ||
      (p.legacyCodes && p.legacyCodes.some(lc => lc.toUpperCase() === clean))
    ) || null;
  }

  getByEstate(estateId, filters = {}) {
    if (!estateId) return [];
    return this.getOpen({ ...filters, estateId });
  }

  getByDivision(divisionId) {
    if (!divisionId) return [];
    const clean = String(divisionId).trim().toUpperCase();
    return this._programs.filter(p => 
      (p.divisionId && p.divisionId.toUpperCase() === clean) ||
      (p.divisionCode && p.divisionCode.toUpperCase() === clean) ||
      (p.divisionIds && p.divisionIds.some(d => 
        d.toUpperCase() === clean ||
        (clean.includes('DIV-001') && (d.includes('DIV-001') || d === 'DIV1')) ||
        (clean.includes('DIV-APM-02') && (d.includes('DIV-APM-02') || d === 'DIV2' || d === 'DIV3'))
      ))
    );
  }

  getByBlock(blockIdOrCode) {
    if (!blockIdOrCode) return [];
    const clean = String(blockIdOrCode).trim().toUpperCase();
    return this._programs.filter(p => 
      (p.blockId && p.blockId.toUpperCase() === clean) ||
      (p.blockCode && p.blockCode.toUpperCase() === clean) ||
      (p.blockName && p.blockName.toUpperCase() === clean)
    );
  }
}

/**
 * Placeholder Interface untuk Integrasi Masa Depan dengan Backend / ERP API
 */
export class ErpProgramProvider {
  async getAll() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
  async getOpen() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
  async getActive() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
  async getById() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
  async getByCode() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
  async getByEstate() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
  async getByDivision() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
  async getByBlock() {
    throw new Error('ErpProgramProvider belum diaktifkan pada mode prototype frontend-only.');
  }
}

// Active Provider Instance (Default: DummyProgramProvider)
let activeProvider = new DummyProgramProvider();

export function getProgramProvider() {
  return activeProvider;
}

export function setProgramProvider(provider) {
  if (!provider) throw new Error('[ProgramMaster] Provider cannot be null');
  activeProvider = provider;
}

/**
 * Canonical Resolvers & API
 */
export function getAllPrograms() {
  return activeProvider.getAll();
}

export function getOpenPrograms(filters = {}) {
  return activeProvider.getOpen(filters);
}

export function getActivePrograms(filters = {}) {
  return activeProvider.getActive(filters);
}

export function getProgramById(id) {
  return activeProvider.getById(id);
}

export function getProgramByCode(code) {
  return activeProvider.getByCode(code);
}

export function getProgramsByEstate(estateId, filters = {}) {
  return activeProvider.getByEstate(estateId, filters);
}

export function getProgramsByDivision(divisionId) {
  return activeProvider.getByDivision(divisionId);
}

export function getProgramsByBlock(blockIdOrCode) {
  return activeProvider.getByBlock(blockIdOrCode);
}

/**
 * Resolver fleksibel untuk mencocokkan ID, Code, Name, atau Legacy Code.
 */
export function resolveProgram(value) {
  if (!value) return null;
  const clean = String(value).trim().toLowerCase();
  
  const all = activeProvider.getAll();
  return all.find(p => 
    p.id.toLowerCase() === clean ||
    p.code.toLowerCase() === clean ||
    p.name.toLowerCase() === clean ||
    (p.legacyCodes && p.legacyCodes.some(lc => lc.toLowerCase() === clean))
  ) || null;
}

/**
 * Legacy Compatibility Helper
 * Menghasilkan objek kompatibel untuk modul-modul existing
 */
export function resolveProgramLegacy(value) {
  const prog = resolveProgram(value);
  if (!prog) {
    return {
      id: String(value || ''),
      code: String(value || '2026/TB/RNUR/001'),
      canonicalCode: String(value || '2026/TB/RNUR/001'),
      name: String(value || 'Program Nursery'),
      status: PROGRAM_STATUS.OPEN
    };
  }
  return {
    id: prog.id,
    code: prog.code,
    canonicalCode: prog.code,
    name: prog.name,
    status: prog.status,
    estateId: prog.estateId,
    divisionId: prog.divisionId,
    blockId: prog.blockId,
    blockCode: prog.blockCode
  };
}

/**
 * Helper validasi keaktifan / keterbukaan program
 */
export function isProgramOpen(idOrCode) {
  const prog = resolveProgram(idOrCode) || getProgramById(idOrCode) || getProgramByCode(idOrCode);
  return prog ? (prog.status === PROGRAM_STATUS.OPEN || prog.status === 'ACTIVE') : false;
}

export function isProgramActive(idOrCode) {
  return isProgramOpen(idOrCode);
}
