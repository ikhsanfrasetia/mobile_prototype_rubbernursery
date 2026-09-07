import { PROCESS_MAPPING_BASELINE } from '../js/data/process-mapping-baseline.js';

const reqs = PROCESS_MAPPING_BASELINE.requirements || [];

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

const activeReqs = reqs.filter(r => !r.isArchived);

const foundNew = activeReqs.filter(r => NEW_IDS.has(r.id));
const foundRev = activeReqs.filter(r => REVISED_IDS.has(r.id));
const foundRet = activeReqs.filter(r => !NEW_IDS.has(r.id) && !REVISED_IDS.has(r.id));
const foundDep = reqs.filter(r => r.isArchived || DEPRECATED_IDS.has(r.id));

console.log('--- RECONCILIATION QUANTITATIVE AUDIT ---');
console.log('Active Requirements Total:', activeReqs.length, '(Expected: 172)');
console.log('Retained Requirements:', foundRet.length, '(Expected: 130)');
console.log('Revised Requirements:', foundRev.length, '(Expected: 28)');
console.log('New Accepted Requirements:', foundNew.length, '(Expected: 14)');
console.log('Deprecated Requirements:', foundDep.length, '(Expected: 7)');
console.log('Verification: 130 + 28 + 14 =', foundRet.length + foundRev.length + foundNew.length);
