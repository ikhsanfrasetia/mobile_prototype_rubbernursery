import { PROCESS_MAPPING_BASELINE } from '../js/data/process-mapping-baseline.js';

const reqs = PROCESS_MAPPING_BASELINE.requirements || [];
console.log('Total reqs in baseline:', reqs.length);

const classifications = {};
const statusMap = {};

reqs.forEach(r => {
  const c = r.changeClassification || r.classification || r.changeType || (r.isNew ? 'New' : r.isRevised ? 'Revised' : r.isArchived ? 'Deprecated' : 'Retained');
  classifications[c] = (classifications[c] || 0) + 1;
  statusMap[r.status] = (statusMap[r.status] || 0) + 1;
});

console.log('Classifications:', classifications);
console.log('Status Map:', statusMap);

const sampleNew = reqs.find(r => r.id === 'RN-PWP-006' || r.isNew);
console.log('Sample New Req:', sampleNew ? { id: sampleNew.id, title: sampleNew.title, status: sampleNew.status, version: sampleNew.version, sourceProposedId: sampleNew.sourceProposedId, changeClassification: sampleNew.changeClassification } : 'Not found');

const sampleArchived = reqs.filter(r => r.isArchived);
console.log('Archived/Deprecated count:', sampleArchived.length, sampleArchived.map(r => r.id));

const sampleMerged = reqs.filter(r => r.mergeInfo || r.mergedFrom || r.isMerged);
console.log('Merged count:', sampleMerged.length, sampleMerged.map(r => ({ id: r.id, mergeInfo: r.mergeInfo, mergedFrom: r.mergedFrom })));
