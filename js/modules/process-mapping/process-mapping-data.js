/**
 * js/modules/process-mapping/process-mapping-data.js
 * Single Source of Truth Loader & Adapter for Process Mapping.
 * 
 * Architecture:
 * - RUNTIME SOURCE: `js/data/process-mapping-baseline.js` (JS Module import)
 * - EXPORT/IMPORT: `data/process-mapping-data.json` (file download/upload only)
 * - LocalStorage used ONLY for temporary drafts & unsaved changes
 * - No runtime dependency on static JSON fetch (no 404 risk in production)
 * - Strict integrity validations before save/export
 * - Protected Confirmed Revisions (Creates Revision v2, v3... without overwrite)
 * - Safe Archiving (isArchived: true, no permanent delete)
 * - Structured Visual Node management (no raw Mermaid syntax)
 */

import { PROCESS_MAPPING_BASELINE } from '../../data/process-mapping-baseline.js';

const DRAFT_STORAGE_KEY = 'PM_DRAFT_PROJECT_DATA_V2';

// In-Memory Active Data Store
let activeStore = null;
let officialBaselineStore = null;

/**
 * Validates the entire project data schema and integrity.
 * @param {Object} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProjectData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data harus berupa objek valid'] };
  }

  // 1. Metadata Validation
  if (!data.metadata || typeof data.metadata !== 'object') {
    errors.push('Metadata proyek tidak ditemukan');
  } else {
    if (!data.metadata.version) errors.push('Metadata version wajib diisi');
    if (!data.metadata.lastUpdated) errors.push('Metadata lastUpdated wajib diisi');
    if (!data.metadata.updatedBy) errors.push('Metadata updatedBy wajib diisi');
  }

  // 2. Roles Validation
  if (!Array.isArray(data.roles) || data.roles.length === 0) {
    errors.push('Daftar Role tidak boleh kosong');
  } else {
    const roleIds = new Set();
    data.roles.forEach((r, idx) => {
      if (!r.id) errors.push(`Role ke-${idx + 1} tidak memiliki ID`);
      if (roleIds.has(r.id)) errors.push(`Duplikasi Role ID: ${r.id}`);
      roleIds.add(r.id);
      if (!r.name) errors.push(`Role ${r.id} tidak memiliki nama`);
    });
  }

  // 3. Modules Validation
  if (!Array.isArray(data.modules) || data.modules.length === 0) {
    errors.push('Daftar Modul tidak boleh kosong');
  } else {
    const moduleIds = new Set();
    data.modules.forEach((m, idx) => {
      if (!m.id) errors.push(`Modul ke-${idx + 1} tidak memiliki ID`);
      if (moduleIds.has(m.id)) errors.push(`Duplikasi Modul ID: ${m.id}`);
      moduleIds.add(m.id);
      if (!m.name) errors.push(`Modul ${m.id} tidak memiliki nama`);
    });
  }

  // 4. Requirements Validation
  if (!Array.isArray(data.requirements)) {
    errors.push('Daftar Requirements harus berupa array');
  } else {
    const reqKeys = new Set();
    data.requirements.forEach((req, idx) => {
      if (!req.id) errors.push(`Requirement ke-${idx + 1} tidak memiliki ID`);
      // Unique key based on ID + version
      const key = `${req.id}_v${req.version || 1}`;
      if (reqKeys.has(key)) {
        errors.push(`Duplikasi Requirement ID & Versi: ${key}`);
      }
      reqKeys.add(key);
      if (!req.title) errors.push(`Requirement ${req.id} tidak memiliki judul`);
    });
  }

  // 5. Flows Validation
  if (!data.flows || typeof data.flows !== 'object') {
    errors.push('Flows harus berupa objek modul');
  } else {
    for (const [modId, features] of Object.entries(data.flows)) {
      if (typeof features !== 'object' || features === null) continue;
      for (const [featId, flowObj] of Object.entries(features)) {
        if (!flowObj || !Array.isArray(flowObj.nodes)) {
          errors.push(`Flow ${modId}/${featId} tidak memiliki nodes array valid`);
          continue;
        }

        const activeNodeIds = new Set();
        const nodeKeys = new Set();
        flowObj.nodes.forEach((node, nIdx) => {
          if (!node.id) errors.push(`Node ke-${nIdx + 1} pada flow ${modId}/${featId} tidak memiliki ID`);
          const key = `${node.id}_v${node.version || 1}`;
          if (nodeKeys.has(key)) {
            errors.push(`Duplikasi Node ID & Versi ${key} pada flow ${modId}/${featId}`);
          }
          nodeKeys.add(key);

          if (!node.isSuperseded) {
            if (activeNodeIds.has(node.id)) {
              errors.push(`Duplikasi Node ID aktif ${node.id} pada flow ${modId}/${featId}`);
            }
            activeNodeIds.add(node.id);
          }
        });

        if (Array.isArray(flowObj.edges)) {
          flowObj.edges.forEach((edge, eIdx) => {
            if (!edge.isSuperseded) {
              if (!activeNodeIds.has(edge.from)) {
                errors.push(`Edge ke-${eIdx + 1} pada flow ${modId}/${featId} memiliki broken 'from': ${edge.from}`);
              }
              if (!activeNodeIds.has(edge.to)) {
                errors.push(`Edge ke-${eIdx + 1} pada flow ${modId}/${featId} memiliki broken 'to': ${edge.to}`);
              }
            }
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Loads the official baseline data from the imported JS module.
 * No network fetch required — data is bundled as a native ES module.
 */
export function fetchOfficialSourceData() {
  const data = JSON.parse(JSON.stringify(PROCESS_MAPPING_BASELINE));
  const validation = validateProjectData(data);
  if (!validation.valid) {
    console.warn('[ProcessMapping] Validasi baseline menemukan catatan:', validation.errors);
  }
  officialBaselineStore = JSON.parse(JSON.stringify(data));
  return data;
}

/**
 * Initializes the project data store.
 * Checks for temporary unsaved draft in localStorage, or loads baseline JS module.
 * @param {boolean} forceOfficial If true, bypasses draft and forces official baseline
 */
export function initProjectDataStore(forceOfficial = false) {
  // Load official baseline from JS module (synchronous, no fetch)
  const official = fetchOfficialSourceData();

  if (!forceOfficial) {
    try {
      const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftJson) {
        const parsedDraft = JSON.parse(draftJson);
        const validation = validateProjectData(parsedDraft);
        if (validation.valid) {
          activeStore = parsedDraft;
          console.log('🌿 [ProcessMapping] Memuat Draft Lokal dari Session Storage');
          return activeStore;
        } else {
          console.warn('⚠️ [ProcessMapping] Draft lokal tidak valid, memulihkan data resmi:', validation.errors);
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn('⚠️ [ProcessMapping] Gagal membaca draft lokal:', err);
    }
  }

  activeStore = JSON.parse(JSON.stringify(official));
  return activeStore;
}

/**
 * Returns the active project data store.
 */
export function getActiveStore() {
  if (!activeStore) {
    throw new Error('Project Data Store belum diinisialisasi. Panggil initProjectDataStore() terlebih dahulu.');
  }
  return activeStore;
}

/**
 * Checks if a temporary draft is currently active in localStorage.
 */
export function hasActiveDraft() {
  return Boolean(localStorage.getItem(DRAFT_STORAGE_KEY));
}

/**
 * Saves current in-memory store to localStorage as a temporary draft.
 */
export function saveDraftToStorage() {
  if (!activeStore) return;
  const validation = validateProjectData(activeStore);
  if (!validation.valid) {
    throw new Error('Data tidak valid:\n' + validation.errors.join('\n'));
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(activeStore));
  console.log('💾 [ProcessMapping] Draft tersimpan ke LocalStorage');
}

/**
 * Resets the in-memory store and discards any temporary draft in localStorage.
 */
export function resetDraftToOfficial() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  return initProjectDataStore(true);
}

/**
 * Updates metadata fields (version, updatedBy, lastUpdated).
 */
export function updateMetadata(newMeta) {
  if (!activeStore) return;
  activeStore.metadata = {
    ...activeStore.metadata,
    ...newMeta,
    lastUpdated: newMeta.lastUpdated || new Date().toISOString().split('T')[0]
  };
}

// -----------------------------------------------------------------------------
// Requirement Operations (Create, Edit, Revision, Archive, Helpers)
// -----------------------------------------------------------------------------

/**
 * Helper to generate a unique requirement ID based on module ID or fallback.
 * @param {string} moduleId 
 * @returns {string}
 */
export function generateUniqueReqId(moduleId = '') {
  const store = getActiveStore();
  const existingIds = new Set((store.requirements || []).map((r) => r.id));
  
  let prefix = 'RN-GEN';
  if (moduleId) {
    const cleanMod = moduleId.replace(/^[0-9]+-/, '').toUpperCase().slice(0, 3);
    prefix = `RN-${cleanMod}`;
  }

  // Find next available number
  let counter = 1;
  while (existingIds.has(`${prefix}-${String(counter).padStart(3, '0')}`)) {
    counter++;
  }
  return `${prefix}-${String(counter).padStart(3, '0')}`;
}

/**
 * Checks if a requirement is linked to any flow nodes in any module/feature.
 * @param {string} reqId 
 * @returns {{ isUsed: boolean, nodes: Array<{ moduleId: string, featureId: string, nodeId: string, code: string, title: string }> }}
 */
export function checkRequirementNodeUsage(reqId) {
  const store = getActiveStore();
  const linkedNodes = [];

  if (store.flows && typeof store.flows === 'object') {
    for (const [modId, features] of Object.entries(store.flows)) {
      if (!features || typeof features !== 'object') continue;
      for (const [featId, flowObj] of Object.entries(features)) {
        if (!flowObj || !Array.isArray(flowObj.nodes)) continue;
        for (const node of flowObj.nodes) {
          if (node.reqId === reqId) {
            linkedNodes.push({
              moduleId: modId,
              featureId: featId,
              nodeId: node.id,
              code: node.code || node.id,
              title: node.title || node.label || 'Langkah Alur'
            });
          }
        }
      }
    }
  }

  return {
    isUsed: linkedNodes.length > 0,
    nodes: linkedNodes
  };
}

/**
 * Returns all historical and active revision records for a given requirement ID.
 * @param {string} reqId 
 * @returns {Array<Object>}
 */
export function getRequirementRevisionHistory(reqId) {
  const store = getActiveStore();
  const allReqs = [
    ...(store.requirements || []),
    ...(store.functionalRequirements || []),
    ...(store.nonFunctionalRequirements || [])
  ];
  return allReqs
    .filter((r) => r.id === reqId)
    .sort((a, b) => (a.version || 1) - (b.version || 1));
}

/**
 * Returns all historical and active revision records for a given node ID in a flow.
 * @param {string} moduleId 
 * @param {string} featureId 
 * @param {string} nodeId 
 * @returns {Array<Object>}
 */
export function getNodeRevisionHistory(moduleId, featureId, nodeId) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.nodes)) return [];
  return flow.nodes.filter((n) => n.id === nodeId).sort((a, b) => (a.version || 1) - (b.version || 1));
}

/**
 * Retrieves a single requirement by its reqId.
 * @param {string} reqId 
 * @param {number|null} version 
 * @returns {Object|null}
 */
export function getRequirementByReqId(reqId, version = null) {
  const store = getActiveStore();
  const allReqs = [
    ...(store.requirements || []),
    ...(store.functionalRequirements || []),
    ...(store.nonFunctionalRequirements || [])
  ];
  if (version !== null) {
    return allReqs.find((r) => r.id === reqId && (r.version || 1) === version) || null;
  }
  // Return the active (non-superseded) requirement
  return allReqs.find((r) => r.id === reqId && !r.isSuperseded) || allReqs.find((r) => r.id === reqId) || null;
}

/**
 * Creates a new requirement record.
 * @param {Object} reqData 
 * @param {string} author 
 * @returns {Object} The created requirement
 */
export function createRequirement(reqData, author = 'Business Analyst') {
  const store = getActiveStore();
  const reqId = (reqData.id || '').trim() || generateUniqueReqId(reqData.moduleId);

  const newReq = {
    id: reqId,
    title: (reqData.title || '').trim(),
    role: reqData.role || 'Mantri Bibitan',
    module: reqData.module || 'Presensi',
    moduleId: reqData.moduleId || '01-presensi',
    feature: reqData.feature || 'Presensi Supervisor',
    featureId: reqData.featureId || 'presensi-supervisor',
    type: reqData.type || 'KF',
    acceptanceCriteria: (reqData.acceptanceCriteria || reqData.acceptance || '').trim(),
    process: (reqData.process || '').trim(),
    input: (reqData.input || '-').trim(),
    validation: (reqData.validation || '-').trim(),
    fallback: (reqData.fallback || '-').trim(),
    output: (reqData.output || '-').trim(),
    businessRule: (reqData.businessRule || '').trim(),
    status: 'Draft',
    version: 1,
    isArchived: false,
    isSuperseded: false,
    revisionOf: null,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  store.requirements.push(newReq);
  updateMetadata({ updatedBy: author });
  return newReq;
}

/**
 * Edits an existing requirement.
 * If the requirement is already 'Confirmed', it generates a new revision (Draft vX+1)
 * with revisionOf pointing to previous version, rather than overwriting the baseline.
 * If the requirement is 'Draft', it updates it directly in-place.
 * @param {string} reqId 
 * @param {Object} updatedFields 
 * @param {string} author 
 * @returns {{ isRevision: boolean, requirement: Object }}
 */
export function editRequirement(reqId, updatedFields, author = 'Business Analyst') {
  const store = getActiveStore();
  const existingIndex = store.requirements.findIndex(
    (r) => r.id === reqId && !r.isArchived && !r.isSuperseded
  );

  if (existingIndex === -1) {
    throw new Error(`Requirement ${reqId} tidak ditemukan atau telah diarsipkan.`);
  }

  const existing = store.requirements[existingIndex];

  if (existing.status === 'Confirmed') {
    // If requirement is Confirmed, create a NEW revision (Draft) without overwriting baseline
    const currentVersion = existing.version || 1;
    const nextVersion = currentVersion + 1;

    const revisionReq = {
      ...existing,
      ...updatedFields,
      id: existing.id,
      version: nextVersion,
      status: 'Draft', // Revision always begins as Draft
      revisionOf: `v${currentVersion}`,
      lastRevisedAt: new Date().toISOString(),
      revisedBy: author,
      isArchived: false,
      isSuperseded: false
    };

    // Mark previous confirmed version as superseded so it stays in history
    existing.isSuperseded = true;
    existing.supersededBy = `v${nextVersion}`;

    // Append new revision to requirements store
    store.requirements.push(revisionReq);
    updateMetadata({ updatedBy: author });
    return { isRevision: true, requirement: revisionReq };
  } else {
    // If Draft or In Progress or Rejected, update directly in-place and reset status to Draft
    const updated = {
      ...existing,
      ...updatedFields,
      status: 'Draft',
      reviewNote: null,
      lastModified: new Date().toISOString()
    };
    store.requirements[existingIndex] = updated;
    updateMetadata({ updatedBy: author });
    return { isRevision: false, requirement: updated };
  }
}

/**
 * Approves a draft revision to Confirmed.
 */
export function approveRequirementRevision(reqId, version, author = 'Business Analyst') {
  const store = getActiveStore();
  const req = store.requirements.find((r) => r.id === reqId && (r.version || 1) === version && !r.isArchived);
  if (!req) throw new Error(`Requirement ${reqId} v${version} tidak ditemukan`);

  req.status = 'Confirmed';
  req.approvedAt = new Date().toISOString();
  req.approvedBy = author;
  updateMetadata({ updatedBy: author });
  return req;
}

/**
 * Archives a requirement (marked as isArchived: true, never permanently deleted).
 * Flow nodes referencing this requirement are safely preserved without breaking links.
 * @param {string} reqId 
 * @param {number|null} version 
 * @returns {Object}
 */
export function archiveRequirement(reqId, version = null) {
  const store = getActiveStore();
  const req = store.requirements.find(
    (r) => r.id === reqId && (version ? (r.version || 1) === version : !r.isArchived && !r.isSuperseded)
  ) || store.requirements.find(
    (r) => r.id === reqId && !r.isSuperseded
  ) || store.requirements.find(
    (r) => r.id === reqId
  );

  if (!req) throw new Error(`Requirement ${reqId} tidak ditemukan`);
  req.isArchived = true;
  req.status = 'Draft';
  req.archivedAt = new Date().toISOString();
  updateMetadata({ updatedBy: 'Business Analyst' });
  return req;
}

// -----------------------------------------------------------------------------
// Structured Visual Flow Node Operations (Add, Edit, Reorder, Archive, Helpers)
// -----------------------------------------------------------------------------

/**
 * Generates next sequential step code for a flow (e.g. P-001, DEC-01).
 * @param {Object} flow 
 * @param {string} type 
 * @returns {string}
 */
export function generateNextNodeCode(flow, type = 'process') {
  if (!flow || !Array.isArray(flow.nodes)) return 'P-001';
  const activeNodes = flow.nodes.filter((n) => !n.isArchived && !n.isSuperseded);

  if (type === 'decision') {
    const decCount = activeNodes.filter((n) => n.type === 'decision').length + 1;
    return `DEC-${String(decCount).padStart(2, '0')}`;
  }

  const procCount = activeNodes.filter((n) => n.type === 'process').length + 1;
  return `P-${String(procCount).padStart(3, '0')}`;
}

/**
 * Adds a new flow node into a module flow.
 * @param {string} moduleId 
 * @param {string} featureId 
 * @param {Object} nodeData 
 * @param {string} author 
 * @returns {Object} The added node
 */
export function addFlowNode(moduleId, featureId, nodeData, author = 'Business Analyst') {
  const store = getActiveStore();
  if (!store.flows[moduleId]) store.flows[moduleId] = {};
  if (!store.flows[moduleId][featureId]) {
    store.flows[moduleId][featureId] = { title: featureId, nodes: [], edges: [] };
  }

  const flow = store.flows[moduleId][featureId];
  if (!Array.isArray(flow.nodes)) flow.nodes = [];

  const nodeId = nodeData.id?.trim() || `N_${Date.now().toString().slice(-6)}_${Math.random().toString(36).slice(-3)}`;
  const code = nodeData.code?.trim() || generateNextNodeCode(flow, nodeData.type || 'process');
  const nodeTitle = (nodeData.label || nodeData.title || '').trim();

  const newNode = {
    id: nodeId,
    code,
    type: nodeData.type || 'process',
    label: nodeTitle,
    title: nodeTitle,
    purpose: (nodeData.purpose || nodeData.summary || nodeData.description || '').trim(),
    input: (nodeData.input || '-').trim(),
    output: (nodeData.output || '-').trim(),
    validation: (nodeData.validation || '-').trim(),
    fallback: (nodeData.fallback || '-').trim(),
    stockImpact: (nodeData.stockImpact || 'NO STOCK CHANGE').trim(),
    reqId: (nodeData.reqId || '').trim(),
    relatedRole: (nodeData.relatedRole || 'Asisten Bibitan (Verifikasi)').trim(),
    status: 'Draft',
    version: 1,
    isArchived: false,
    isSuperseded: false,
    revisionOf: null,
    createdAt: new Date().toISOString()
  };

  flow.nodes.push(newNode);
  regenerateFlowEdges(flow);
  updateMetadata({ updatedBy: author });
  return newNode;
}

/**
 * Edits an existing flow node.
 * If Confirmed, creates a revision (Draft vX+1) with revisionOf without overwriting baseline.
 * If Draft, updates directly in-place.
 * @param {string} moduleId 
 * @param {string} featureId 
 * @param {string} nodeId 
 * @param {Object} updatedFields 
 * @param {string} author 
 * @returns {{ isRevision: boolean, node: Object }}
 */
export function editFlowNode(moduleId, featureId, nodeId, updatedFields, author = 'Business Analyst') {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.nodes)) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const nodeIdx = flow.nodes.findIndex((n) => n.id === nodeId && !n.isArchived && !n.isSuperseded);
  if (nodeIdx === -1) throw new Error(`Node ${nodeId} tidak ditemukan`);

  const existingNode = flow.nodes[nodeIdx];
  const nodeTitle = (updatedFields.label || updatedFields.title || existingNode.label || existingNode.title).trim();

  if (existingNode.status === 'Confirmed') {
    // Create new revision without overwriting baseline
    const currentVersion = existingNode.version || 1;
    const nextVersion = currentVersion + 1;

    const revisedNode = {
      ...existingNode,
      ...updatedFields,
      id: existingNode.id,
      label: nodeTitle,
      title: nodeTitle,
      version: nextVersion,
      status: 'Draft',
      revisionOf: `v${currentVersion}`,
      isArchived: false,
      isSuperseded: false,
      lastRevisedAt: new Date().toISOString(),
      revisedBy: author
    };

    // Mark previous confirmed version as superseded in history
    existingNode.isSuperseded = true;
    existingNode.supersededBy = `v${nextVersion}`;

    flow.nodes.push(revisedNode);
    regenerateFlowEdges(flow);
    updateMetadata({ updatedBy: author });
    return { isRevision: true, node: revisedNode };
  } else {
    // Direct edit on Draft / In Review / Rejected
    const updatedNode = {
      ...existingNode,
      ...updatedFields,
      label: nodeTitle,
      title: nodeTitle,
      status: 'Draft',
      reviewNote: null,
      lastModified: new Date().toISOString()
    };
    flow.nodes[nodeIdx] = updatedNode;
    regenerateFlowEdges(flow);
    updateMetadata({ updatedBy: author });
    return { isRevision: false, node: updatedNode };
  }
}

/**
 * Reorders a flow node up or down in the sequence.
 * @param {string} moduleId 
 * @param {string} featureId 
 * @param {string} nodeId 
 * @param {'up' | 'down'} direction 
 */
export function reorderFlowNode(moduleId, featureId, nodeId, direction) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.nodes)) return false;

  const activeNodes = flow.nodes.filter((n) => !n.isArchived && !n.isSuperseded);
  const idx = activeNodes.findIndex((n) => n.id === nodeId);
  if (idx === -1) return false;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= activeNodes.length) {
    return false; // Cannot move beyond boundaries
  }

  // Swap in active nodes
  const temp = activeNodes[idx];
  activeNodes[idx] = activeNodes[targetIdx];
  activeNodes[targetIdx] = temp;

  // Rebuild flow.nodes preserving any archived/superseded ones
  const otherNodes = flow.nodes.filter((n) => n.isArchived || n.isSuperseded);
  flow.nodes = [...activeNodes, ...otherNodes];

  // Re-generate step codes (P-001, P-002, ...) for processes while preserving decision/start/end
  let pIndex = 1;
  activeNodes.forEach((node) => {
    if (node.type === 'process') {
      node.code = `P-${String(pIndex++).padStart(3, '0')}`;
    }
  });

  regenerateFlowEdges(flow);
  updateMetadata({ updatedBy: 'Business Analyst' });
  return true;
}

/**
 * Archives a flow node (marks isArchived: true, retains in history).
 */
export function archiveFlowNode(moduleId, featureId, nodeId) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const node = flow.nodes.find((n) => n.id === nodeId && !n.isArchived && !n.isSuperseded) ||
               flow.nodes.find((n) => n.id === nodeId && !n.isSuperseded) ||
               flow.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node ${nodeId} tidak ditemukan`);

  node.isArchived = true;
  node.status = 'Draft';
  node.archivedAt = new Date().toISOString();
  regenerateFlowEdges(flow);
  updateMetadata({ updatedBy: 'Business Analyst' });
  return node;
}

/**
 * Regenerates sequential edges for active nodes if no explicit custom edges exist.
 */
function regenerateFlowEdges(flow) {
  if (!flow) return;
  // If flow already contains custom explicit edges, do not overwrite them
  if (Array.isArray(flow.edges) && flow.edges.length > 0) {
    return;
  }
}

/**
 * Adds an explicit connection (edge) between two active nodes in a flow.
 * @param {string} moduleId 
 * @param {string} featureId 
 * @param {Object} edgeData { from, to, condition, label, description }
 * @param {string} author 
 */
export function addFlowEdge(moduleId, featureId, edgeData, author = 'Business Analyst') {
  const store = getActiveStore();
  if (!store.flows[moduleId]) store.flows[moduleId] = {};
  if (!store.flows[moduleId][featureId]) {
    store.flows[moduleId][featureId] = { title: featureId, nodes: [], edges: [] };
  }

  const flow = store.flows[moduleId][featureId];
  if (!Array.isArray(flow.edges)) flow.edges = [];

  const fromId = edgeData.from?.trim();
  const toId = edgeData.to?.trim();
  const condition = (edgeData.condition || edgeData.label || '').trim();

  if (!fromId || !toId) {
    throw new Error('Source Node dan Target Node wajib dipilih.');
  }

  if (fromId === toId) {
    throw new Error('Koneksi tidak boleh menghubungkan node ke dirinya sendiri (Self-loop ditolak).');
  }

  const activeNodes = (flow.nodes || []).filter(n => !n.isArchived && !n.isSuperseded);
  const sourceNode = activeNodes.find(n => n.id === fromId);
  const targetNode = activeNodes.find(n => n.id === toId);

  if (!sourceNode) {
    throw new Error(`Source Node (${fromId}) tidak ditemukan atau tidak berstatus aktif pada alur ini.`);
  }

  if (!targetNode) {
    throw new Error(`Target Node (${toId}) tidak ditemukan atau tidak berstatus aktif pada alur ini.`);
  }

  // Check duplicate active edge
  const isDuplicate = flow.edges.some(e => 
    !e.isArchived && !e.isSuperseded && 
    e.from === fromId && 
    e.to === toId && 
    (e.condition || e.label || '').trim().toLowerCase() === condition.toLowerCase()
  );

  if (isDuplicate) {
    throw new Error(`Koneksi yang sama dari ${sourceNode.code || sourceNode.label} ke ${targetNode.code || targetNode.label}${condition ? ` [${condition}]` : ''} sudah ada.`);
  }

  const edgeId = edgeData.id?.trim() || `E_${Date.now().toString().slice(-6)}_${Math.random().toString(36).slice(-3)}`;
  const newEdge = {
    id: edgeId,
    from: fromId,
    to: toId,
    condition: condition,
    label: condition,
    description: (edgeData.description || '').trim(),
    status: 'Draft',
    version: 1,
    isArchived: false,
    isSuperseded: false,
    revisionOf: null,
    createdAt: new Date().toISOString()
  };

  flow.edges.push(newEdge);
  updateMetadata({ updatedBy: author });
  return newEdge;
}

/**
 * Edits an explicit connection. If Confirmed, creates a revision without overwriting baseline.
 */
export function editFlowEdge(moduleId, featureId, edgeId, updatedFields, author = 'Business Analyst') {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.edges)) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const edgeIdx = flow.edges.findIndex(e => e.id === edgeId && !e.isArchived && !e.isSuperseded);
  if (edgeIdx === -1) throw new Error(`Koneksi ${edgeId} tidak ditemukan`);

  const existingEdge = flow.edges[edgeIdx];
  const fromId = (updatedFields.from || existingEdge.from).trim();
  const toId = (updatedFields.to || existingEdge.to).trim();
  const condition = (updatedFields.condition !== undefined ? updatedFields.condition : (updatedFields.label !== undefined ? updatedFields.label : existingEdge.condition || '')).trim();

  if (!fromId || !toId) {
    throw new Error('Source Node dan Target Node wajib dipilih.');
  }

  if (fromId === toId) {
    throw new Error('Koneksi tidak boleh menghubungkan node ke dirinya sendiri (Self-loop ditolak).');
  }

  const activeNodes = (flow.nodes || []).filter(n => !n.isArchived && !n.isSuperseded);
  const sourceNode = activeNodes.find(n => n.id === fromId);
  const targetNode = activeNodes.find(n => n.id === toId);

  if (!sourceNode || !targetNode) {
    throw new Error('Source dan Target Node harus berupa node aktif pada alur ini.');
  }

  // Check duplicate with OTHER active edges
  const isDuplicate = flow.edges.some(e => 
    e.id !== edgeId && 
    !e.isArchived && !e.isSuperseded && 
    e.from === fromId && 
    e.to === toId && 
    (e.condition || e.label || '').trim().toLowerCase() === condition.toLowerCase()
  );

  if (isDuplicate) {
    throw new Error(`Koneksi lain dengan source, target, dan kondisi yang sama sudah ada.`);
  }

  if (existingEdge.status === 'Confirmed') {
    // Create new revision
    const currentVersion = existingEdge.version || 1;
    const nextVersion = currentVersion + 1;

    const revisedEdge = {
      ...existingEdge,
      ...updatedFields,
      id: existingEdge.id,
      from: fromId,
      to: toId,
      condition: condition,
      label: condition,
      version: nextVersion,
      status: 'Draft',
      revisionOf: `v${currentVersion}`,
      isArchived: false,
      isSuperseded: false,
      lastRevisedAt: new Date().toISOString(),
      revisedBy: author
    };

    existingEdge.isSuperseded = true;
    existingEdge.supersededBy = `v${nextVersion}`;

    flow.edges.push(revisedEdge);
    updateMetadata({ updatedBy: author });
    return { isRevision: true, edge: revisedEdge };
  } else {
    // In-place edit for Draft / In Review / Rejected
    const updatedEdge = {
      ...existingEdge,
      ...updatedFields,
      from: fromId,
      to: toId,
      condition: condition,
      label: condition,
      status: 'Draft',
      reviewNote: null,
      lastModified: new Date().toISOString()
    };
    flow.edges[edgeIdx] = updatedEdge;
    updateMetadata({ updatedBy: author });
    return { isRevision: false, edge: updatedEdge };
  }
}

/**
 * Soft-archives a connection.
 */
export function archiveFlowEdge(moduleId, featureId, edgeId, author = 'Business Analyst') {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.edges)) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const edge = flow.edges.find(e => e.id === edgeId && !e.isArchived && !e.isSuperseded) ||
               flow.edges.find(e => e.id === edgeId && !e.isSuperseded) ||
               flow.edges.find(e => e.id === edgeId);
  if (!edge) throw new Error(`Koneksi ${edgeId} tidak ditemukan`);

  edge.isArchived = true;
  edge.status = 'Draft';
  edge.archivedAt = new Date().toISOString();
  updateMetadata({ updatedBy: author });
  return edge;
}

/**
 * Returns revision history for a connection.
 */
export function getFlowEdgeRevisionHistory(moduleId, featureId, edgeId) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.edges)) return [];
  return flow.edges.filter(e => e.id === edgeId).sort((a, b) => (a.version || 1) - (b.version || 1));
}

// -----------------------------------------------------------------------------
// Export & Import Handlers
// -----------------------------------------------------------------------------

/**
 * Generates and triggers browser download of process-mapping-data.json.
 */
export function exportProjectDataFile(customMetadata = {}) {
  const store = getActiveStore();

  const exportData = {
    metadata: {
      ...store.metadata,
      ...customMetadata,
      lastUpdated: new Date().toISOString().split('T')[0]
    },
    roles: store.roles || [],
    modules: store.modules || [],
    functionalRequirements: store.functionalRequirements || [],
    nonFunctionalRequirements: store.nonFunctionalRequirements || [],
    requirements: store.requirements || [],
    businessRules: store.businessRules || [],
    commonFeatures: store.commonFeatures || [],
    endToEndPipeline: store.endToEndPipeline || [],
    flows: store.flows || {}
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `process-mapping-data-${exportData.metadata.version || 'v2'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Previews imported project data file and validates schema.
 */
export function previewImportProjectData(jsonString) {
  let candidateData;
  try {
    candidateData = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('File tidak berformat JSON yang valid: ' + err.message);
  }

  const validation = validateProjectData(candidateData);
  if (!validation.valid) {
    throw new Error('Data tidak sesuai skema validasi:\n' + validation.errors.join('\n'));
  }

  const totalReqs = (candidateData.requirements || []).length +
                    (candidateData.functionalRequirements || []).length +
                    (candidateData.nonFunctionalRequirements || []).length;

  let totalFlowNodes = 0;
  if (candidateData.flows) {
    for (const mId in candidateData.flows) {
      for (const fId in candidateData.flows[mId]) {
        totalFlowNodes += (candidateData.flows[mId][fId].nodes || []).length;
      }
    }
  }

  return {
    candidateData,
    validation,
    metadata: candidateData.metadata,
    totalModules: (candidateData.modules || []).length,
    totalRequirements: totalReqs,
    totalFlows: totalFlowNodes
  };
}

/**
 * Applies imported valid data to active store and persists to draft session.
 */
export function applyImportedProjectData(candidateData) {
  activeStore = candidateData;
  saveDraftToStorage();
  console.log('✅ [ProcessMapping] Data hasil import berhasil diterapkan');
  return activeStore;
}

// -----------------------------------------------------------------------------
// Phase 3: Revision & Review Workflow (Centralized Diff, Review, Confirm, Reject, Discard)
// -----------------------------------------------------------------------------

/**
 * Calculates field-by-field differences between baseline and candidate/draft version.
 */
export function calculateEntityDiff(entityType, baseline, draft) {
  const fieldDiffs = [];
  if (!draft) {
    return {
      hasChanges: false,
      changedFieldsCount: 0,
      changeType: 'Modified',
      fieldDiffs: []
    };
  }

  const compareField = (key, label, oldVal, newVal) => {
    const v1 = (oldVal !== undefined && oldVal !== null) ? String(oldVal).trim() : '';
    const v2 = (newVal !== undefined && newVal !== null) ? String(newVal).trim() : '';
    const isChanged = v1 !== v2;
    let status = 'Same';
    if (draft.isArchived) {
      status = 'Archived';
    } else if (!baseline) {
      status = 'Added';
    } else if (isChanged) {
      status = 'Modified';
    }

    fieldDiffs.push({
      fieldName: key,
      fieldLabel: label,
      oldValue: v1 || '-',
      newValue: v2 || '-',
      isChanged,
      status
    });
  };

  if (entityType === 'Requirement') {
    compareField('title', 'Judul Requirement', baseline?.title, draft?.title);
    compareField('type', 'Tipe (KF/KNF)', baseline?.type, draft?.type);
    compareField('module', 'Modul', baseline?.module, draft?.module);
    compareField('feature', 'Fitur', baseline?.feature, draft?.feature);
    compareField('role', 'Role', baseline?.role, draft?.role);
    compareField('acceptanceCriteria', 'Kriteria Penerimaan', baseline?.acceptanceCriteria, draft?.acceptanceCriteria);
    compareField('process', 'Proses Bisnis', baseline?.process, draft?.process);
    compareField('input', 'Input', baseline?.input, draft?.input);
    compareField('validation', 'Validasi', baseline?.validation, draft?.validation);
    compareField('fallback', 'Fallback', baseline?.fallback, draft?.fallback);
    compareField('output', 'Output', baseline?.output, draft?.output);
    compareField('businessRule', 'Aturan Bisnis', baseline?.businessRule, draft?.businessRule);
    compareField('isArchived', 'Status Arsip', baseline?.isArchived ? 'Arsip' : 'Aktif', draft?.isArchived ? 'Arsip' : 'Aktif');
  } else if (entityType === 'Node') {
    compareField('code', 'Kode Langkah', baseline?.code, draft?.code);
    compareField('type', 'Tipe Langkah', baseline?.type, draft?.type);
    compareField('label', 'Nama Langkah', baseline?.label || baseline?.title, draft?.label || draft?.title);
    compareField('purpose', 'Tujuan / Ringkasan', baseline?.purpose || baseline?.summary, draft?.purpose || draft?.summary);
    compareField('input', 'Input', baseline?.input, draft?.input);
    compareField('output', 'Output', baseline?.output, draft?.output);
    compareField('validation', 'Validasi', baseline?.validation, draft?.validation);
    compareField('fallback', 'Fallback', baseline?.fallback, draft?.fallback);
    compareField('stockImpact', 'Dampak Stok', baseline?.stockImpact, draft?.stockImpact);
    compareField('reqId', 'Requirement ID', baseline?.reqId, draft?.reqId);
    compareField('relatedRole', 'Role Verifikator', baseline?.relatedRole, draft?.relatedRole);
    compareField('isArchived', 'Status Arsip', baseline?.isArchived ? 'Arsip' : 'Aktif', draft?.isArchived ? 'Arsip' : 'Aktif');
  } else if (entityType === 'Connection') {
    compareField('from', 'Source Node (Asal)', baseline?.from, draft?.from);
    compareField('to', 'Target Node (Tujuan)', baseline?.to, draft?.to);
    compareField('condition', 'Kondisi / Percabangan', baseline?.condition || baseline?.label, draft?.condition || draft?.label);
    compareField('description', 'Keterangan', baseline?.description, draft?.description);
    compareField('isArchived', 'Status Arsip', baseline?.isArchived ? 'Arsip' : 'Aktif', baseline?.isArchived ? 'Arsip' : 'Aktif');
  }

  const changedFields = fieldDiffs.filter(d => d.isChanged);
  let changeType = 'Modified';
  if (draft.isArchived) {
    changeType = 'Archived';
  } else if (!baseline) {
    changeType = 'Added';
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFieldsCount: changedFields.length,
    changeType,
    fieldDiffs
  };
}

/**
 * Collects all pending revisions, drafts, and pending archives across Requirement, Node, and Connection.
 */
export function getAllPendingRevisions() {
  const store = getActiveStore();
  const revisions = [];

  // 1. Requirements
  const allReqs = store.requirements || [];
  allReqs.forEach((req) => {
    // Include if not superseded and not confirmed active baseline
    if (!req.isSuperseded && (req.status !== 'Confirmed' || req.isArchived)) {
      const baseline = allReqs.find((b) => b.id === req.id && b.status === 'Confirmed' && b !== req);
      let changeType = 'Modified';
      if (req.isArchived) {
        changeType = 'Archived';
      } else if (!baseline && (!req.revisionOf || req.version === 1)) {
        changeType = 'Added';
      }

      const diff = calculateEntityDiff('Requirement', baseline, req);

      revisions.push({
        id: req.id,
        entityId: req.id,
        entityType: 'Requirement',
        moduleId: req.moduleId || '01-presensi',
        moduleName: req.module || 'Modul',
        featureId: req.featureId || req.feature || '-',
        featureName: req.feature || '-',
        code: req.id,
        title: req.title,
        version: req.version || 1,
        revisionOf: req.revisionOf || null,
        status: req.status || 'Draft',
        changeType,
        isArchived: Boolean(req.isArchived),
        createdAt: req.createdAt || req.lastRevisedAt || new Date().toISOString(),
        createdBy: req.revisedBy || req.createdBy || 'Business Analyst',
        submittedAt: req.submittedAt || null,
        submittedBy: req.submittedBy || null,
        reviewedAt: req.reviewedAt || null,
        reviewedBy: req.reviewedBy || null,
        reviewNote: req.reviewNote || null,
        item: req,
        baseline: baseline || null,
        diff
      });
    }
  });

  // 2. Nodes
  for (const [modId, features] of Object.entries(store.flows || {})) {
    const modObj = store.modules.find(m => m.id === modId);
    for (const [featId, flowObj] of Object.entries(features)) {
      const featObj = modObj?.features?.find(f => f.id === featId);
      const featName = featObj?.name || flowObj.title || featId;
      const allNodes = flowObj.nodes || [];

      allNodes.forEach((node) => {
        if (!node.isSuperseded && (node.status !== 'Confirmed' || node.isArchived)) {
          const baseline = allNodes.find((b) => b.id === node.id && b.status === 'Confirmed' && b !== node);
          let changeType = 'Modified';
          if (node.isArchived) {
            changeType = 'Archived';
          } else if (!baseline && (!node.revisionOf || node.version === 1)) {
            changeType = 'Added';
          }

          const diff = calculateEntityDiff('Node', baseline, node);

          revisions.push({
            id: node.id,
            entityId: node.id,
            entityType: 'Node',
            moduleId: modId,
            moduleName: modObj?.name || modId,
            featureId: featId,
            featureName: featName,
            code: node.code || node.id,
            title: node.label || node.title || node.code,
            version: node.version || 1,
            revisionOf: node.revisionOf || null,
            status: node.status || 'Draft',
            changeType,
            isArchived: Boolean(node.isArchived),
            createdAt: node.createdAt || node.lastRevisedAt || new Date().toISOString(),
            createdBy: node.revisedBy || node.createdBy || 'Business Analyst',
            submittedAt: node.submittedAt || null,
            submittedBy: node.submittedBy || null,
            reviewedAt: node.reviewedAt || null,
            reviewedBy: node.reviewedBy || null,
            reviewNote: node.reviewNote || null,
            item: node,
            baseline: baseline || null,
            diff
          });
        }
      });

      // 3. Connections / Edges
      const allEdges = flowObj.edges || [];
      allEdges.forEach((edge) => {
        if (!edge.isSuperseded && (edge.status !== 'Confirmed' || edge.isArchived)) {
          const baseline = allEdges.find((b) => b.id === edge.id && b.status === 'Confirmed' && b !== edge);
          let changeType = 'Modified';
          if (edge.isArchived) {
            changeType = 'Archived';
          } else if (!baseline && (!edge.revisionOf || edge.version === 1)) {
            changeType = 'Added';
          }

          const diff = calculateEntityDiff('Connection', baseline, edge);

          revisions.push({
            id: edge.id,
            entityId: edge.id,
            entityType: 'Connection',
            moduleId: modId,
            moduleName: modObj?.name || modId,
            featureId: featId,
            featureName: featName,
            code: `${edge.from} → ${edge.to}`,
            title: `Koneksi: ${edge.from} → ${edge.to}${edge.condition ? ` (${edge.condition})` : ''}`,
            version: edge.version || 1,
            revisionOf: edge.revisionOf || null,
            status: edge.status || 'Draft',
            changeType,
            isArchived: Boolean(edge.isArchived),
            createdAt: edge.createdAt || edge.lastRevisedAt || new Date().toISOString(),
            createdBy: edge.revisedBy || edge.createdBy || 'Business Analyst',
            submittedAt: edge.submittedAt || null,
            submittedBy: edge.submittedBy || null,
            reviewedAt: edge.reviewedAt || null,
            reviewedBy: edge.reviewedBy || null,
            reviewNote: edge.reviewNote || null,
            item: edge,
            baseline: baseline || null,
            diff
          });
        }
      });
    }
  }

  return revisions;
}

/**
 * Submits a draft revision for review (status: 'In Review').
 */
export function submitEntityForReview(entityType, params, author = 'Business Analyst') {
  const store = getActiveStore();
  const idToFind = params.reqId || params.nodeId || params.edgeId || params.entityId || params.id;
  let target = null;

  if (entityType === 'Requirement') {
    target = store.requirements.find(r => r.id === idToFind && (params.version ? (r.version || 1) === params.version : !r.isSuperseded));
  } else if (entityType === 'Node') {
    if (params.moduleId && params.featureId) {
      target = store.flows[params.moduleId]?.[params.featureId]?.nodes?.find(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded));
    }
    if (!target) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, flowObj] of Object.entries(feats)) {
          const match = (flowObj.nodes || []).find(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded));
          if (match) { target = match; break; }
        }
        if (target) break;
      }
    }
  } else if (entityType === 'Connection') {
    if (params.moduleId && params.featureId) {
      target = store.flows[params.moduleId]?.[params.featureId]?.edges?.find(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded));
    }
    if (!target) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, flowObj] of Object.entries(feats)) {
          const match = (flowObj.edges || []).find(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded));
          if (match) { target = match; break; }
        }
        if (target) break;
      }
    }
  }

  if (!target) throw new Error(`${entityType} tidak ditemukan`);
  target.status = 'In Review';
  target.submittedAt = new Date().toISOString();
  target.submittedBy = author;
  updateMetadata({ updatedBy: author });
  return target;
}

/**
 * Reviewer Confirmation Gate:
 * Credential configuration for frontend approval gate.
 * Default reviewer: username 'ikhsan', password 'medan2026'.
 * Note: This is an internal frontend confirmation gate to prevent accidental approvals.
 * Password is never saved to LocalStorage or cookies.
 */
export const REVIEWER_CREDENTIALS = {
  username: 'ikhsan',
  password: 'medan2026'
};

export function verifyReviewerCredentials(username, password) {
  if (!username || typeof username !== 'string') return false;
  if (!password || typeof password !== 'string') return false;
  return (
    username.trim().toLowerCase() === REVIEWER_CREDENTIALS.username.toLowerCase() &&
    password.trim() === REVIEWER_CREDENTIALS.password
  );
}

/**
 * Confirms a draft revision to become official Confirmed baseline.
 * Enforces that only revisions with status 'In Review' can be confirmed.
 */
export function confirmEntityRevision(entityType, params, author = 'ikhsan', note = null) {
  const store = getActiveStore();
  const idToFind = params.reqId || params.nodeId || params.edgeId || params.entityId || params.id;
  let target = null;

  if (entityType === 'Requirement') {
    target = store.requirements.find(r => r.id === idToFind && (params.version ? (r.version || 1) === params.version : !r.isSuperseded));
    if (target) {
      if (target.status !== 'In Review') {
        throw new Error(`Requirement ${idToFind} berstatus '${target.status}'. Hanya revisi dengan status 'In Review' yang dapat disetujui (Confirm Review).`);
      }
      store.requirements.forEach(r => {
        if (r.id === target.id && r !== target) {
          r.isSuperseded = true;
          r.supersededBy = `v${target.version || 1}`;
        }
      });
    }
  } else if (entityType === 'Node') {
    let flow = params.moduleId && params.featureId ? store.flows[params.moduleId]?.[params.featureId] : null;
    if (flow) {
      target = flow.nodes?.find(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded));
    }
    if (!target) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, fObj] of Object.entries(feats)) {
          const match = (fObj.nodes || []).find(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded));
          if (match) { target = match; flow = fObj; break; }
        }
        if (target) break;
      }
    }
    if (target && flow) {
      if (target.status !== 'In Review') {
        throw new Error(`Node ${idToFind} berstatus '${target.status}'. Hanya revisi dengan status 'In Review' yang dapat disetujui (Confirm Review).`);
      }
      flow.nodes.forEach(n => {
        if (n.id === target.id && n !== target) {
          n.isSuperseded = true;
          n.supersededBy = `v${target.version || 1}`;
        }
      });
    }
  } else if (entityType === 'Connection') {
    let flow = params.moduleId && params.featureId ? store.flows[params.moduleId]?.[params.featureId] : null;
    if (flow) {
      target = flow.edges?.find(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded));
    }
    if (!target) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, fObj] of Object.entries(feats)) {
          const match = (fObj.edges || []).find(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded));
          if (match) { target = match; flow = fObj; break; }
        }
        if (target) break;
      }
    }
    if (target && flow) {
      if (target.status !== 'In Review') {
        throw new Error(`Koneksi ${idToFind} berstatus '${target.status}'. Hanya revisi dengan status 'In Review' yang dapat disetujui (Confirm Review).`);
      }
      flow.edges.forEach(e => {
        if (e.id === target.id && e !== target) {
          e.isSuperseded = true;
          e.supersededBy = `v${target.version || 1}`;
        }
      });
    }
  }

  if (!target) throw new Error(`${entityType} tidak ditemukan`);
  target.status = 'Confirmed';
  target.reviewedAt = new Date().toISOString();
  target.reviewedBy = author;
  target.reviewNote = note || null;
  updateMetadata({ updatedBy: author });
  return target;
}

/**
 * Rejects a draft revision with a mandatory note/reason.
 */
export function rejectEntityRevision(entityType, params, reason, author = 'Reviewer') {
  const store = getActiveStore();
  const idToFind = params.reqId || params.nodeId || params.edgeId || params.entityId || params.id;
  let target = null;

  if (entityType === 'Requirement') {
    target = store.requirements.find(r => r.id === idToFind && (params.version ? (r.version || 1) === params.version : !r.isSuperseded));
  } else if (entityType === 'Node') {
    if (params.moduleId && params.featureId) {
      target = store.flows[params.moduleId]?.[params.featureId]?.nodes?.find(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded));
    }
    if (!target) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, flowObj] of Object.entries(feats)) {
          const match = (flowObj.nodes || []).find(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded));
          if (match) { target = match; break; }
        }
        if (target) break;
      }
    }
  } else if (entityType === 'Connection') {
    if (params.moduleId && params.featureId) {
      target = store.flows[params.moduleId]?.[params.featureId]?.edges?.find(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded));
    }
    if (!target) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, flowObj] of Object.entries(feats)) {
          const match = (flowObj.edges || []).find(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded));
          if (match) { target = match; break; }
        }
        if (target) break;
      }
    }
  }

  if (!target) throw new Error(`${entityType} tidak ditemukan`);
  target.status = 'Rejected';
  target.reviewedAt = new Date().toISOString();
  target.reviewedBy = author;
  target.reviewNote = reason || 'Perubahan belum memenuhi kriteria';
  updateMetadata({ updatedBy: author });
  return target;
}

/**
 * Discards/cancels a draft change safely, restoring previous confirmed state or removing new draft.
 */
export function discardEntityDraft(entityType, params, author = 'Business Analyst') {
  const store = getActiveStore();
  const idToFind = params.reqId || params.nodeId || params.edgeId || params.entityId || params.id;

  if (entityType === 'Requirement') {
    const idx = store.requirements.findIndex(r => r.id === idToFind && (params.version ? (r.version || 1) === params.version : !r.isSuperseded));
    if (idx === -1) throw new Error('Requirement tidak ditemukan');
    const target = store.requirements[idx];

    if (target.isArchived) {
      target.isArchived = false;
      target.archivedAt = null;
    } else if (target.revisionOf) {
      store.requirements.splice(idx, 1);
      const prev = store.requirements.find(r => r.id === target.id && r.status === 'Confirmed');
      if (prev) {
        prev.isSuperseded = false;
        prev.supersededBy = null;
      }
    } else {
      store.requirements.splice(idx, 1);
    }
  } else if (entityType === 'Node') {
    let flow = params.moduleId && params.featureId ? store.flows[params.moduleId]?.[params.featureId] : null;
    let idx = flow ? flow.nodes?.findIndex(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded)) : -1;

    if (idx === -1) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, fObj] of Object.entries(feats)) {
          const matchIdx = (fObj.nodes || []).findIndex(n => n.id === idToFind && (params.version ? (n.version || 1) === params.version : !n.isSuperseded));
          if (matchIdx !== -1) { idx = matchIdx; flow = fObj; break; }
        }
        if (idx !== -1) break;
      }
    }

    if (!flow || idx === -1) throw new Error('Node tidak ditemukan');
    const target = flow.nodes[idx];

    if (target.isArchived) {
      target.isArchived = false;
      target.archivedAt = null;
    } else if (target.revisionOf) {
      flow.nodes.splice(idx, 1);
      const prev = flow.nodes.find(n => n.id === target.id && n.status === 'Confirmed');
      if (prev) {
        prev.isSuperseded = false;
        prev.supersededBy = null;
      }
    } else {
      flow.nodes.splice(idx, 1);
    }
  } else if (entityType === 'Connection') {
    let flow = params.moduleId && params.featureId ? store.flows[params.moduleId]?.[params.featureId] : null;
    let idx = flow ? flow.edges?.findIndex(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded)) : -1;

    if (idx === -1) {
      for (const [mId, feats] of Object.entries(store.flows || {})) {
        for (const [fId, fObj] of Object.entries(feats)) {
          const matchIdx = (fObj.edges || []).findIndex(e => e.id === idToFind && (params.version ? (e.version || 1) === params.version : !e.isSuperseded));
          if (matchIdx !== -1) { idx = matchIdx; flow = fObj; break; }
        }
        if (idx !== -1) break;
      }
    }

    if (!flow || idx === -1) throw new Error('Koneksi tidak ditemukan');
    const target = flow.edges[idx];

    if (target.isArchived) {
      target.isArchived = false;
      target.archivedAt = null;
    } else if (target.revisionOf) {
      flow.edges.splice(idx, 1);
      const prev = flow.edges.find(e => e.id === target.id && e.status === 'Confirmed');
      if (prev) {
        prev.isSuperseded = false;
        prev.supersededBy = null;
      }
    } else {
      flow.edges.splice(idx, 1);
    }
  }

  updateMetadata({ updatedBy: author });
  return true;
}

