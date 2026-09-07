import { PROCESS_MAPPING_BASELINE } from '../js/data/process-mapping-baseline.js';

const reqs = PROCESS_MAPPING_BASELINE.requirements || [];

// Check requirements with version > 1, or revisionHistory, or revised descriptions
const revs = reqs.filter(r => r.version > 1 || (r.revisionHistory && r.revisionHistory.length > 1) || r.isRevised || r.changeType === 'Revised');
console.log('Explicit revised count in baseline:', revs.length, revs.map(r => r.id));

// Check all reqs in module 01 to 11
console.log('All active reqs count:', reqs.filter(r => !r.isArchived).length);
