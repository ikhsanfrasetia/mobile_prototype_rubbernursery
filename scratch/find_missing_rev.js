import { PROCESS_MAPPING_BASELINE } from '../js/data/process-mapping-baseline.js';

const reqs = PROCESS_MAPPING_BASELINE.requirements || [];
const activeReqs = reqs.filter(r => !r.isArchived);

const REVISED_IDS = [
  'RN-PRS-006', 'RN-PRS-007', 'RN-RCV-002', 'RN-EXP-001', 'RN-EXP-004',
  'RN-RCV-KSP019', 'RN-RCV-ME025', 'RN-OKL-001', 'RN-OKL-002', 'RN-OKL-003',
  'RN-OKL-004', 'RN-OKL-005', 'RN-OKL-006', 'RN-SEL-001', 'RN-SEL-003',
  'RN-SEL-004', 'RN-SEL-005', 'RN-MAT-MMG054', 'RN-MAT-MMG055', 'RN-MAT-MMG056',
  'RN-MNT-001', 'RN-MNT-002', 'RN-MNT-003', 'RN-MNT-004', 'RN-MNT-005',
  'RN-MNT-006', 'RN-MNT-007', 'RN-PRS-012'
];

REVISED_IDS.forEach(id => {
  const found = activeReqs.find(r => r.id === id);
  if (!found) console.log('Not in active:', id);
});
