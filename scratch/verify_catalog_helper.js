import { PROCESS_MAPPING_BASELINE } from '../js/data/process-mapping-baseline.js';

const NEW_IDS = new Set([
  'RN-PWP-006', 'RN-MAT-MMG059', 'RN-EXP-008', 'RN-SEL-012', 'RN-ENT-008',
  'RN-OKL-029', 'RN-RCV-028', 'RN-EXP-009', 'RN-MAT-MMG060', 'RN-PWP-007',
  'RN-MNT-009', 'RN-SEM-TP036', 'RN-SEL-013', 'RN-SEL-014'
]);

const REVISED_IDS = new Set([
  'RN-PRS-006', 'RN-PRS-007', 'RN-RCV-002', 'RN-EXP-001', 'RN-EXP-004',
  'RN-RCV-KSP019', 'RN-RCV-ME025', 'RN-OKL-001', 'RN-OKL-002', 'RN-OKL-003',
  'RN-OKL-004', 'RN-OKL-005', 'RN-OKL-006', 'RN-SEL-001', 'RN-SEL-003',
  'RN-SEL-004', 'RN-SEL-005', 'RN-MAT-MMG054', 'RN-MAT-MMG055', 'RN-MAT-MMG056',
  'RN-MNT-001', 'RN-MNT-002', 'RN-MNT-003', 'RN-MNT-004', 'RN-MNT-005',
  'RN-MNT-006', 'RN-MNT-007', 'RN-MNT-008'
]);

const DEPRECATED_IDS = new Set([
  'RN-PRS-004', 'RN-RCV-001', 'RN-OKL-000', 'RN-SEL-002', 'RN-ENT-001',
  'RN-EXP-005', 'RN-EXP-006'
]);

const MERGED_ITEMS = [
  {
    id: 'PROPOSED-012',
    targetId: 'RN-RCV-006',
    title: 'Pencocokan Surat Jalan / BKB Vendor Penerimaan Benih Kelatak',
    role: 'Mantri Bibitan',
    module: '02-penerimaan-biji',
    feature: 'terima-benih',
    classification: 'Merged',
    status: 'MERGED',
    description: 'Dileburkan ke requirement induk RN-RCV-006 (Verifikasi Dokumen Penerimaan Benih).'
  },
  {
    id: 'PROPOSED-013',
    targetId: 'RN-SEM-007',
    title: 'Pencatatan Penanaman Benih Kelatak & Validasi Tanggal Tanam Bedengan',
    role: 'Mantri Bibitan',
    module: '03-penyemaian',
    feature: 'tanam-benih',
    classification: 'Merged',
    status: 'MERGED',
    description: 'Dileburkan ke requirement induk RN-SEM-007 (Perekaman Bedengan Semai).'
  },
  {
    id: 'PROPOSED-018',
    targetId: 'RN-EXP-002',
    title: 'Pemeriksaan Dokumen Pengeluaran Bibit & Otorisasi SPB',
    role: 'Asisten Kepala',
    module: '11-pengeluaran',
    feature: 'pengeluaran-bibit',
    classification: 'Merged',
    status: 'MERGED',
    description: 'Dileburkan ke requirement induk RN-EXP-002 (Otorisasi Pengeluaran Bibit).'
  }
];

export function getReconciliationCatalog(store) {
  const reqs = (store?.requirements || PROCESS_MAPPING_BASELINE.requirements || []);
  const catalog = [];

  reqs.forEach(r => {
    let classification = 'Retained';
    let statusLabel = 'Confirmed';

    if (r.isArchived || DEPRECATED_IDS.has(r.id)) {
      classification = 'Deprecated';
      statusLabel = 'Deprecated / Out of Scope';
    } else if (NEW_IDS.has(r.id)) {
      classification = 'New';
      statusLabel = 'NEW / ACCEPTED';
    } else if (REVISED_IDS.has(r.id)) {
      classification = 'Revised';
      statusLabel = 'Confirmed (Revised)';
    }

    catalog.push({
      entityType: 'Requirement',
      id: r.id,
      title: r.title,
      role: r.role,
      module: r.module,
      feature: r.feature,
      classification,
      status: statusLabel,
      version: r.version ? `v${r.version}` : 'v1.0.0',
      sourceProposedId: r.sourceProposedId || null,
      raw: r
    });
  });

  MERGED_ITEMS.forEach(m => {
    catalog.push({
      entityType: 'Requirement',
      id: `${m.id} → ${m.targetId}`,
      originalId: m.id,
      targetId: m.targetId,
      title: m.title,
      role: m.role,
      module: m.module,
      feature: m.feature,
      classification: 'Merged',
      status: 'MERGED',
      version: 'v1.0.0',
      description: m.description,
      raw: m
    });
  });

  return catalog;
}

const cat = getReconciliationCatalog(PROCESS_MAPPING_BASELINE);
const counts = {
  total: cat.length,
  retained: cat.filter(c => c.classification === 'Retained').length,
  revised: cat.filter(c => c.classification === 'Revised').length,
  new: cat.filter(c => c.classification === 'New').length,
  deprecated: cat.filter(c => c.classification === 'Deprecated').length,
  merged: cat.filter(c => c.classification === 'Merged').length
};

console.log('Catalog breakdown:', counts);
