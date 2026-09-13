/**
 * data/program-master.js — Master Data & Provider Terpusat Program Pembibitan (TASK ASB-02).
 * 
 * Prinsip:
 * - "SINGLE SOURCE OF TRUTH"
 * - BUKAN menu & BUKAN CRUD
 * - Read-only reference provider untuk Role ASISTEN_BIBITAN (select) & MANTRI (consume)
 * - Provider Architecture: Mendukung Dummy Prototype & Future ERP Provider
 */

export const PROGRAM_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

/**
 * Canonical Master Dataset Program Pembibitan
 * Diharmonisasikan dari dataset demo dan kebutuhan operasional nursery.
 */
export const PROGRAM_MASTER = Object.freeze([
  {
    id: 'PRG-2026-001',
    code: 'PN-2026-01',
    name: 'Program Nursery 2026 - Batch 1',
    legacyCodes: ['PRG/NUR/01/2026', 'PRG/NUR/TB/01/2026', '1'],
    estateIds: ['EST-TBS', 'EST-001', 'EST-002'],
    divisionIds: ['DIV-001', 'DIV1'],
    programReplantingId: 'PRP-2026-01',
    year: 2026,
    status: PROGRAM_STATUS.ACTIVE,
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31'
  },
  {
    id: 'PRG-2026-002',
    code: 'PN-2026-02',
    name: 'Program Nursery 2026 - Batch 2',
    legacyCodes: ['PRG/NUR/02/2027', '2'],
    estateIds: ['EST-TBS', 'EST-001', 'EST-002'],
    divisionIds: ['DIV-001', 'DIV2'],
    programReplantingId: 'PRP-2026-01',
    year: 2026,
    status: PROGRAM_STATUS.ACTIVE,
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31'
  },
  {
    id: 'PRG-2026-003',
    code: 'PN-2026-03',
    name: 'Program Nursery 2026 - Tahap 2',
    legacyCodes: ['PRG/NUR/03/2028', '3'],
    estateIds: ['EST-APM', 'EST-003'],
    divisionIds: ['DIV-APM-02', 'DIV3'],
    programReplantingId: 'PRP-2026-02',
    year: 2026,
    status: PROGRAM_STATUS.ACTIVE,
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31'
  },
  {
    id: 'PRG-2026-004',
    code: 'PN-2026-04',
    name: 'Program Replanting Tanah Besih 2026',
    legacyCodes: ['PRG/NUR/TB/02/2026'],
    estateIds: ['EST-TBS', 'EST-001'],
    divisionIds: ['DIV-001'],
    programReplantingId: 'PRP-2026-01',
    year: 2026,
    status: PROGRAM_STATUS.ACTIVE,
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31'
  },
  {
    id: 'PRG-2029-005',
    code: 'PN-2029-01',
    name: 'Program Cadangan Nursery 2029',
    legacyCodes: ['PRG/NUR/08/2029', '4'],
    estateIds: ['EST-TBS', 'EST-APM'],
    divisionIds: ['DIV-001', 'DIV-APM-02'],
    programReplantingId: 'PRP-2026-02',
    year: 2029,
    status: PROGRAM_STATUS.INACTIVE,
    periodStart: '2029-01-01',
    periodEnd: '2029-12-31'
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

  getActive() {
    return this._programs.filter(p => p.status === PROGRAM_STATUS.ACTIVE);
  }

  getById(id) {
    if (!id) return null;
    return this._programs.find(p => p.id === id) || null;
  }

  getByCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();
    return this._programs.find(p => 
      p.code.toUpperCase() === clean ||
      (p.legacyCodes && p.legacyCodes.some(lc => lc.toUpperCase() === clean))
    ) || null;
  }

  getByEstate(estateId) {
    if (!estateId) return [];
    const clean = String(estateId).trim().toUpperCase();
    return this._programs.filter(p => 
      p.estateIds && p.estateIds.some(e => 
        e.toUpperCase() === clean ||
        (clean.includes('TBS') && (e.includes('TBS') || e === 'EST-001' || e === 'EST-002')) ||
        (clean.includes('APM') && (e.includes('APM') || e === 'EST-003'))
      )
    );
  }

  getByDivision(divisionId) {
    if (!divisionId) return [];
    const clean = String(divisionId).trim().toUpperCase();
    return this._programs.filter(p => 
      p.divisionIds && p.divisionIds.some(d => 
        d.toUpperCase() === clean ||
        (clean.includes('DIV-001') && (d.includes('DIV-001') || d === 'DIV1')) ||
        (clean.includes('DIV-APM-02') && (d.includes('DIV-APM-02') || d === 'DIV2' || d === 'DIV3'))
      )
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

export function getActivePrograms() {
  return activeProvider.getActive();
}

export function getProgramById(id) {
  return activeProvider.getById(id);
}

export function getProgramByCode(code) {
  return activeProvider.getByCode(code);
}

export function getProgramsByEstate(estateId) {
  return activeProvider.getByEstate(estateId);
}

export function getProgramsByDivision(divisionId) {
  return activeProvider.getByDivision(divisionId);
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
      code: String(value || 'PRG/NUR/01/2026'),
      name: String(value || 'Program Nursery')
    };
  }
  return {
    id: prog.id,
    code: prog.legacyCodes && prog.legacyCodes[0] ? prog.legacyCodes[0] : prog.code,
    canonicalCode: prog.code,
    name: prog.name,
    status: prog.status
  };
}

/**
 * Helper validasi keaktifan program
 */
export function isProgramActive(idOrCode) {
  const prog = resolveProgram(idOrCode);
  return prog ? prog.status === PROGRAM_STATUS.ACTIVE : false;
}
