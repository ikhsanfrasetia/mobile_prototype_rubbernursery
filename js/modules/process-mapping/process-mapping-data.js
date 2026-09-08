/**
 * portal_patch/process-mapping-data.js
 * Single Source of Truth Loader, Adapter & Traceability Finalization Engine
 * for Sigma Nursery Process Mapping.
 * 
 * Includes:
 * - Full Baseline Store & Adapter Architecture (ES Module)
 * - Revision & Review Workflow Engine (Phase 3)
 * - Traceability Foundation & Coverage Engine (Phase 4A)
 * - Flow Trace Resolution Engine (Phase 4B)
 * - Traceability Matrix & Gap Analysis Engine (Phase 4C & 4D)
 * - Final True Gap Resolution Plan & Engine (Phase 4E)
 * - Flow Edge Finalization, Cross-Flow Edges & Business Rule Finalization (Phase 4F)
 */

import { processMappingApi, normalizeProjectData } from './process-mapping-api.js';
import { PROCESS_MAPPING_BASELINE } from '../../data/process-mapping-baseline.js';

const DRAFT_STORAGE_KEY = 'PM_DRAFT_PROJECT_DATA_V2';

// In-Memory Active Data Store
let activeStore = null;
let officialBaselineStore = null;

export { processMappingApi };

// =============================================================================
// VALIDATION & INTEGRITY ENGINE
// =============================================================================

/**
 * Validates the entire project data schema, integrity, edges, ruleIds, and traceability.
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
  const validRuleIdSet = new Set((data.businessRules || []).map(br => br.id || br.code));
  if (!Array.isArray(data.requirements)) {
    errors.push('Daftar Requirements harus berupa array');
  } else {
    const reqKeys = new Set();
    data.requirements.forEach((req, idx) => {
      if (!req.id) errors.push(`Requirement ke-${idx + 1} tidak memiliki ID`);
      const key = `${req.id}_v${req.version || 1}`;
      if (reqKeys.has(key)) {
        errors.push(`Duplikasi Requirement ID & Versi: ${key}`);
      }
      reqKeys.add(key);
      if (!req.title) errors.push(`Requirement ${req.id} tidak memiliki judul`);

      // Rule IDs validation
      if (Array.isArray(req.ruleIds)) {
        req.ruleIds.forEach(rId => {
          if (rId && validRuleIdSet.size > 0 && !validRuleIdSet.has(rId)) {
            errors.push(`Requirement ${req.id} merujuk ke Business Rule ID tidak dikenal: ${rId}`);
          }
        });
      }
    });
  }

  // 5. Flows Validation
  const allActiveGlobalNodeIds = new Set();
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

          if (!node.isSuperseded && !node.isArchived) {
            if (activeNodeIds.has(node.id)) {
              errors.push(`Duplikasi Node ID aktif ${node.id} pada flow ${modId}/${featId}`);
            }
            activeNodeIds.add(node.id);
            allActiveGlobalNodeIds.add(node.id);

            // Rule IDs validation on node
            if (Array.isArray(node.ruleIds)) {
              node.ruleIds.forEach(rId => {
                if (rId && validRuleIdSet.size > 0 && !validRuleIdSet.has(rId)) {
                  errors.push(`Node ${node.id} pada flow ${modId}/${featId} merujuk ke Business Rule ID tidak dikenal: ${rId}`);
                }
              });
            }
          }
        });

        // Flow Edges Validation
        if (Array.isArray(flowObj.edges)) {
          flowObj.edges.forEach((edge, eIdx) => {
            if (!edge.isSuperseded && !edge.isArchived) {
              const fromId = edge.from || edge.fromNode;
              const toId = edge.to || edge.toNode;
              if (!activeNodeIds.has(fromId)) {
                errors.push(`Edge ke-${eIdx + 1} pada flow ${modId}/${featId} memiliki broken 'from': ${fromId}`);
              }
              if (!activeNodeIds.has(toId)) {
                errors.push(`Edge ke-${eIdx + 1} pada flow ${modId}/${featId} memiliki broken 'to': ${toId}`);
              }
            }
          });
        }
      }
    }
  }

  // 6. Cross-flow Edges Validation
  if (Array.isArray(data.crossFlowEdges)) {
    data.crossFlowEdges.forEach((cfe, idx) => {
      if (!cfe.fromNode || !cfe.toNode) {
        errors.push(`Cross-flow edge ke-${idx + 1} wajib memiliki fromNode dan toNode`);
      } else {
        if (!allActiveGlobalNodeIds.has(cfe.fromNode)) {
          errors.push(`Cross-flow edge ke-${idx + 1} (${cfe.id || idx}) memiliki broken fromNode: ${cfe.fromNode}`);
        }
        if (!allActiveGlobalNodeIds.has(cfe.toNode)) {
          errors.push(`Cross-flow edge ke-${idx + 1} (${cfe.id || idx}) memiliki broken toNode: ${cfe.toNode}`);
        }
      }
    });
  }

  // 7. Business Rules Validation
  if (Array.isArray(data.businessRules)) {
    const brIds = new Set();
    data.businessRules.forEach((br, bIdx) => {
      const id = br.id || br.code;
      if (!id) errors.push(`Business Rule ke-${bIdx + 1} tidak memiliki ID/code`);
      if (brIds.has(id)) errors.push(`Duplikasi Business Rule ID: ${id}`);
      brIds.add(id);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Loads the official baseline data from static JSON (data/process-mapping-data.json)
 * or bundled baseline fallback.
 * @returns {Promise<Object>}
 */
export async function fetchOfficialSourceData() {
  let rawData = null;

  // 1. Browser environment: Fetch static JSON file directly
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const candidates = [
      './data/process-mapping-data.json',
      'data/process-mapping-data.json',
      '/data/process-mapping-data.json'
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          rawData = await res.json();
          break;
        }
      } catch (e) {
        // try next candidate
      }
    }
  }

  // 2. Node.js environment: Read static JSON file directly
  if (!rawData && typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const jsonPath = path.resolve(process.cwd(), 'data/process-mapping-data.json');
      if (fs.existsSync(jsonPath)) {
        rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fallback to bundled PROCESS_MAPPING_BASELINE
  if (!rawData && typeof PROCESS_MAPPING_BASELINE !== 'undefined' && PROCESS_MAPPING_BASELINE) {
    rawData = JSON.parse(JSON.stringify(PROCESS_MAPPING_BASELINE));
  }

  if (!rawData) {
    throw new Error('Gagal memuat data Portal: data/process-mapping-data.json tidak dapat diakses');
  }

  officialBaselineStore = normalizeProjectData(rawData);
  return officialBaselineStore;
}

/**
 * Initializes the project data store from static JSON (data/process-mapping-data.json)
 * or localStorage draft.
 * Applies schema validation and Phase 4E + Phase 4F traceability finalizations.
 * 
 * @param {boolean} [forceOfficial=false] If true, forces reload from static JSON and clears temporary draft
 * @returns {Promise<Object>} The initialized activeStore
 */
export async function initProjectDataStore(forceOfficial = false) {
  if (forceOfficial && typeof localStorage !== 'undefined') {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  // Check if draft exists in localStorage
  if (!forceOfficial && typeof localStorage !== 'undefined') {
    const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draftStr) {
      try {
        const draftData = JSON.parse(draftStr);
        const validation = validateProjectData(draftData);
        if (validation.valid) {
          activeStore = draftData;
          finalizeFlowAndBusinessRuleTraceability(activeStore);
          console.log(`🌿 [ProcessMapping] Data runtime dimuat dari LocalStorage draft (v${activeStore.metadata?.version || '1.0.0'})`);
          return activeStore;
        }
      } catch (e) {
        console.warn('⚠️ [ProcessMapping] Draft LocalStorage tidak valid, memuat data resmi', e);
      }
    }
  }

  try {
    const data = await fetchOfficialSourceData();
    const validation = validateProjectData(data);
    if (!validation.valid) {
      console.warn('⚠️ [ProcessMapping] Data memiliki peringatan validasi:', validation.errors);
    }

    activeStore = JSON.parse(JSON.stringify(data));
    finalizeFlowAndBusinessRuleTraceability(activeStore);
    console.log(`🌿 [ProcessMapping] Data berhasil dimuat dari data/process-mapping-data.json (v${activeStore.metadata?.version || '1.0.0'}, ${activeStore.requirements?.length || 0} reqs)`);
    return activeStore;
  } catch (err) {
    console.error('❌ [ProcessMapping] Gagal memuat data Portal:', err);
    throw err;
  }
}

/**
 * Returns the active project data store.
 */
export function getActiveStore() {
  return activeStore;
}

/**
 * Checks if a temporary draft is currently active in localStorage.
 */
export function hasActiveDraft() {
  if (typeof localStorage === 'undefined') return false;
  return Boolean(localStorage.getItem(DRAFT_STORAGE_KEY));
}

/**
 * Saves current in-memory store to localStorage as a temporary draft.
 */
export function saveDraftToStorage() {
  if (!activeStore || typeof localStorage === 'undefined') return;
  const validation = validateProjectData(activeStore);
  if (!validation.valid) {
    throw new Error('Data tidak valid:\n' + validation.errors.join('\n'));
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(activeStore));
  console.log('💾 [ProcessMapping] Draft tersimpan ke LocalStorage');
}

/**
 * Resets the in-memory store and re-fetches latest data from REST API.
 */
export async function resetDraftToOfficial() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }
  return await initProjectDataStore(true);
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

// =============================================================================
// REQUIREMENT OPERATIONS
// =============================================================================

export function generateUniqueReqId(moduleId = '') {
  const store = getActiveStore();
  const existingIds = new Set((store.requirements || []).map((r) => r.id));
  
  let prefix = 'RN-GEN';
  if (moduleId) {
    const cleanMod = moduleId.replace(/^[0-9]+-/, '').toUpperCase().slice(0, 3);
    prefix = `RN-${cleanMod}`;
  }

  let counter = 1;
  while (existingIds.has(`${prefix}-${String(counter).padStart(3, '0')}`)) {
    counter++;
  }
  return `${prefix}-${String(counter).padStart(3, '0')}`;
}

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

export function getNodeRevisionHistory(moduleId, featureId, nodeId) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.nodes)) return [];
  return flow.nodes.filter((n) => n.id === nodeId).sort((a, b) => (a.version || 1) - (b.version || 1));
}

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
  return allReqs.find((r) => r.id === reqId && !r.isSuperseded) || allReqs.find((r) => r.id === reqId) || null;
}

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
    const currentVersion = existing.version || 1;
    const nextVersion = currentVersion + 1;

    const revisionReq = {
      ...existing,
      ...updatedFields,
      id: existing.id,
      version: nextVersion,
      status: 'Draft',
      revisionOf: `v${currentVersion}`,
      lastRevisedAt: new Date().toISOString(),
      revisedBy: author,
      isArchived: false,
      isSuperseded: false
    };

    existing.isSuperseded = true;
    existing.supersededBy = `v${nextVersion}`;

    store.requirements.push(revisionReq);
    updateMetadata({ updatedBy: author });
    return { isRevision: true, requirement: revisionReq };
  } else {
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

export function restoreRequirement(reqId, author = 'Business Analyst', reason = '') {
  const store = getActiveStore();
  const req = store.requirements.find(r => r.id === reqId);
  if (!req) throw new Error(`Requirement ${reqId} tidak ditemukan`);
  req.isArchived = false;
  req.restoredAt = new Date().toISOString();
  req.restoredBy = author;
  updateMetadata({ updatedBy: author });
  return req;
}

// =============================================================================
// FLOW NODE & EDGE OPERATIONS
// =============================================================================

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

  let sanitizedRuleIds = undefined;
  if (Array.isArray(nodeData.ruleIds)) {
    const validRuleIdSet = new Set((store.businessRules || []).map(br => br.id || br.code));
    sanitizedRuleIds = Array.from(new Set(nodeData.ruleIds.map(id => typeof id === 'string' ? id.trim() : '').filter(id => id && validRuleIdSet.has(id))));
  }

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

  if (sanitizedRuleIds !== undefined) {
    newNode.ruleIds = sanitizedRuleIds;
  }
  if (nodeData.businessRule) {
    newNode.businessRule = String(nodeData.businessRule).trim();
  }

  flow.nodes.push(newNode);
  updateMetadata({ updatedBy: author });
  return newNode;
}

export function editFlowNode(moduleId, featureId, nodeId, updatedFields, author = 'Business Analyst') {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.nodes)) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const nodeIdx = flow.nodes.findIndex((n) => n.id === nodeId && !n.isArchived && !n.isSuperseded);
  if (nodeIdx === -1) throw new Error(`Node ${nodeId} tidak ditemukan`);

  const existingNode = flow.nodes[nodeIdx];
  const nodeTitle = (updatedFields.label || updatedFields.title || existingNode.label || existingNode.title).trim();

  let sanitizedRuleIds = undefined;
  if (Array.isArray(updatedFields.ruleIds)) {
    const validRuleIdSet = new Set((store.businessRules || []).map(br => br.id || br.code));
    sanitizedRuleIds = Array.from(new Set(updatedFields.ruleIds.map(id => typeof id === 'string' ? id.trim() : '').filter(id => id && validRuleIdSet.has(id))));
  }

  if (existingNode.status === 'Confirmed') {
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

    if (sanitizedRuleIds !== undefined) {
      revisedNode.ruleIds = sanitizedRuleIds;
    }

    existingNode.isSuperseded = true;
    existingNode.supersededBy = `v${nextVersion}`;

    flow.nodes.push(revisedNode);
    updateMetadata({ updatedBy: author });
    return { isRevision: true, node: revisedNode };
  } else {
    const updatedNode = {
      ...existingNode,
      ...updatedFields,
      label: nodeTitle,
      title: nodeTitle,
      status: 'Draft',
      reviewNote: null,
      lastModified: new Date().toISOString()
    };

    if (sanitizedRuleIds !== undefined) {
      updatedNode.ruleIds = sanitizedRuleIds;
    }

    flow.nodes[nodeIdx] = updatedNode;
    updateMetadata({ updatedBy: author });
    return { isRevision: false, node: updatedNode };
  }
}

export function reorderFlowNode(moduleId, featureId, nodeId, direction) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.nodes)) return false;

  const activeNodes = flow.nodes.filter((n) => !n.isArchived && !n.isSuperseded);
  const idx = activeNodes.findIndex((n) => n.id === nodeId);
  if (idx === -1) return false;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= activeNodes.length) {
    return false;
  }

  const temp = activeNodes[idx];
  activeNodes[idx] = activeNodes[targetIdx];
  activeNodes[targetIdx] = temp;

  const otherNodes = flow.nodes.filter((n) => n.isArchived || n.isSuperseded);
  flow.nodes = [...activeNodes, ...otherNodes];

  let pIndex = 1;
  activeNodes.forEach((node) => {
    if (node.type === 'process') {
      node.code = `P-${String(pIndex++).padStart(3, '0')}`;
    }
  });

  updateMetadata({ updatedBy: 'Business Analyst' });
  return true;
}

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
  updateMetadata({ updatedBy: 'Business Analyst' });
  return node;
}

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

  if (!sourceNode || !targetNode) {
    throw new Error(`Source Node (${fromId}) atau Target Node (${toId}) tidak ditemukan pada alur ini.`);
  }

  const isDuplicate = flow.edges.some(e => 
    !e.isArchived && !e.isSuperseded && 
    e.from === fromId && 
    e.to === toId && 
    (e.condition || e.label || '').trim().toLowerCase() === condition.toLowerCase()
  );

  if (isDuplicate) {
    throw new Error(`Koneksi yang sama sudah ada.`);
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

  if (!fromId || !toId) throw new Error('Source Node dan Target Node wajib dipilih.');
  if (fromId === toId) throw new Error('Self-loop ditolak.');

  const activeNodes = (flow.nodes || []).filter(n => !n.isArchived && !n.isSuperseded);
  if (!activeNodes.find(n => n.id === fromId) || !activeNodes.find(n => n.id === toId)) {
    throw new Error('Source dan Target Node harus berupa node aktif pada alur ini.');
  }

  if (existingEdge.status === 'Confirmed') {
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

export function getFlowEdgeRevisionHistory(moduleId, featureId, edgeId) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow || !Array.isArray(flow.edges)) return [];
  return flow.edges.filter(e => e.id === edgeId).sort((a, b) => (a.version || 1) - (b.version || 1));
}

// =============================================================================
// EXPORT & IMPORT HANDLERS
// =============================================================================

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
    flows: store.flows || {},
    crossFlowEdges: store.crossFlowEdges || []
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  if (typeof Blob !== 'undefined' && typeof document !== 'undefined') {
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
  return exportData;
}

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

  const totalReqs = (candidateData.requirements || []).length;
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

export function applyImportedProjectData(candidateData) {
  activeStore = candidateData;
  saveDraftToStorage();
  console.log('✅ [ProcessMapping] Data hasil import berhasil diterapkan');
  return activeStore;
}

// =============================================================================
// REVISION & REVIEW WORKFLOW (PHASE 3)
// =============================================================================

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

export function getAllPendingRevisions() {
  const store = getActiveStore();
  const revisions = [];

  const allReqs = store.requirements || [];
  allReqs.forEach((req) => {
    if (!req.isSuperseded && req.status !== 'Confirmed' && req.status !== 'Deprecated' && !DEPRECATED_REQUIREMENT_IDS.has(req.id)) {
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

export function confirmEntityRevision(entityType, params, author = 'ikhsan', note = null) {
  const store = getActiveStore();
  const idToFind = params.reqId || params.nodeId || params.edgeId || params.entityId || params.id;
  let target = null;

  if (entityType === 'Requirement') {
    target = store.requirements.find(r => r.id === idToFind && (params.version ? (r.version || 1) === params.version : !r.isSuperseded));
    if (target) {
      if (target.status !== 'In Review') {
        throw new Error(`Requirement ${idToFind} berstatus '${target.status}'. Hanya revisi dengan status 'In Review' yang dapat disetujui.`);
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
        throw new Error(`Node ${idToFind} berstatus '${target.status}'. Hanya revisi dengan status 'In Review' yang dapat disetujui.`);
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
        throw new Error(`Koneksi ${idToFind} berstatus '${target.status}'. Hanya revisi dengan status 'In Review' yang dapat disetujui.`);
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

// =============================================================================
// TRACEABILITY FOUNDATION & COVERAGE ENGINE (PHASE 4A & 4B)
// =============================================================================

const MANAGEMENT_ROLES = [
  'pengurus',
  'pengurus kebun',
  'pengurus kebun peminta',
  'asisten kepala',
  'askep',
  'asisten divisi',
  'ktu',
  'kepala kebun',
  'manager',
  'auditor',
  'finance',
  'tekniker i',
  'tekniker 1'
];

export function getRequirementCriteria(req) {
  if (!req || typeof req !== 'object') return '';

  if (typeof req.criteria === 'string' && req.criteria.trim().length > 0) {
    return req.criteria.trim();
  }

  if (typeof req.acceptanceCriteria === 'string' && req.acceptanceCriteria.trim().length > 0) {
    return req.acceptanceCriteria.trim();
  }

  const store = getActiveStore();
  let nodeValidation = '';
  if (req.linkedNode || req.id || req.reqId) {
    const targetReqId = req.reqId || req.id;
    if (store && store.flows) {
      for (const features of Object.values(store.flows)) {
        if (!features || typeof features !== 'object') continue;
        for (const flowObj of Object.values(features)) {
          if (!flowObj || !Array.isArray(flowObj.nodes)) continue;
          const matched = flowObj.nodes.find(n => 
            !n.isSuperseded && !n.isArchived && 
            (n.id === req.linkedNode || n.reqId === targetReqId)
          );
          if (matched && typeof matched.validation === 'string' && matched.validation.trim().length > 0 && matched.validation.trim() !== '-') {
            nodeValidation = matched.validation.trim();
            break;
          }
        }
        if (nodeValidation) break;
      }
    }
  }

  if (nodeValidation) return nodeValidation;
  if (typeof req.validation === 'string' && req.validation.trim().length > 0 && req.validation.trim() !== '-') {
    return req.validation.trim();
  }

  if (typeof req.description === 'string' && req.description.trim().length > 0) {
    return req.description.trim();
  }

  return (req.title || '').trim();
}

export function classifyRequirementTrace(req, linkedNodes = []) {
  if (Array.isArray(linkedNodes) && linkedNodes.length > 0) {
    return {
      classification: 'covered',
      label: 'Covered',
      isFlowRequired: true,
      isGap: false
    };
  }

  if (!req) {
    return {
      classification: 'gap',
      label: 'True Gap',
      isFlowRequired: true,
      isGap: true
    };
  }

  // Check explicit scope or management role
  const roleStr = (req.role || '').toLowerCase().trim();
  const isMgmtRole = MANAGEMENT_ROLES.some(r => roleStr.includes(r));
  const isExplicitMgmt = req.flowScope === 'management' || req.flowScope === 'system' || req.type === 'non-functional' || req.type === 'KNF';

  if (isExplicitMgmt || isMgmtRole) {
    return {
      classification: 'management',
      label: 'Business / Management',
      isFlowRequired: false,
      isGap: false
    };
  }

  return {
    classification: 'gap',
    label: 'True Gap',
    isFlowRequired: true,
    isGap: true
  };
}

export function getRequirementTrace(reqId) {
  const store = getActiveStore();
  if (!store) return null;

  const allReqs = [
    ...(store.requirements || []),
    ...(store.functionalRequirements || []),
    ...(store.nonFunctionalRequirements || [])
  ];

  const req = allReqs.find(r => 
    !r.isSuperseded && !r.isArchived && (r.id === reqId || r.reqId === reqId)
  ) || allReqs.find(r => r.id === reqId || r.reqId === reqId);

  if (!req) return null;

  let moduleObj = null;
  let featureObj = null;

  if (Array.isArray(store.modules)) {
    moduleObj = store.modules.find(m => m.id === req.moduleId) || null;
    if (moduleObj && Array.isArray(moduleObj.features)) {
      featureObj = moduleObj.features.find(f => f.id === req.featureId) || null;
    }
  }

  const linkedNodes = [];
  const targetReqId = req.reqId || req.id;

  if (store.flows && typeof store.flows === 'object') {
    for (const [mId, features] of Object.entries(store.flows)) {
      if (!features || typeof features !== 'object') continue;
      for (const [fId, flowObj] of Object.entries(features)) {
        if (!flowObj || !Array.isArray(flowObj.nodes)) continue;
        for (const node of flowObj.nodes) {
          if (!node.isSuperseded && !node.isArchived) {
            if (node.reqId === targetReqId || (req.linkedNode && node.id === req.linkedNode)) {
              linkedNodes.push({
                ...node,
                moduleId: mId,
                featureId: fId
              });
            }
          }
        }
      }
    }
  }

  const matchedRules = [];
  const ruleIdSet = new Set();

  if (Array.isArray(req.ruleIds)) {
    req.ruleIds.forEach(id => ruleIdSet.add(id));
  }

  linkedNodes.forEach(node => {
    if (Array.isArray(node.ruleIds)) {
      node.ruleIds.forEach(id => ruleIdSet.add(id));
    }
    if (typeof node.businessRule === 'string') {
      const matches = node.businessRule.match(/BR-[A-Z]+-[0-9]+/g);
      if (matches) matches.forEach(m => ruleIdSet.add(m));
    }
  });

  if (typeof req.businessRule === 'string') {
    const matches = req.businessRule.match(/BR-[A-Z]+-[0-9]+/g);
    if (matches) matches.forEach(m => ruleIdSet.add(m));
  }

  if (Array.isArray(store.businessRules)) {
    store.businessRules.forEach(br => {
      if (ruleIdSet.has(br.id) || ruleIdSet.has(br.code)) {
        matchedRules.push(br);
      }
    });
  }

  const classificationResult = classifyRequirementTrace(req, linkedNodes);
  const criteriaText = getRequirementCriteria(req);

  return {
    requirement: req,
    module: moduleObj,
    feature: featureObj,
    nodes: linkedNodes,
    businessRules: matchedRules,
    hasFlowNodeGap: linkedNodes.length === 0,
    hasRuleGap: matchedRules.length === 0,
    classification: classificationResult.classification,
    isFlowRequired: classificationResult.isFlowRequired,
    isGap: classificationResult.isGap,
    criteria: criteriaText
  };
}

export function getAllTraceabilityRecords() {
  const store = getActiveStore();
  if (!store || !Array.isArray(store.requirements)) return [];

  const activeReqs = store.requirements.filter(
    r => !r.isArchived && !r.isSuperseded && r.status !== 'Archived' && r.status !== 'archived'
  );

  return activeReqs.map(r => getRequirementTrace(r.id)).filter(Boolean);
}

export function validateAndLinkBusinessRules(reqId, ruleIds = [], author = 'Business Analyst') {
  const store = getActiveStore();
  if (!store) throw new Error('Store belum diinisialisasi');

  const req = (store.requirements || []).find(
    r => !r.isArchived && !r.isSuperseded && (r.id === reqId || r.reqId === reqId)
  );

  if (!req) {
    throw new Error(`Requirement ${reqId} tidak ditemukan`);
  }

  if (!Array.isArray(ruleIds)) {
    ruleIds = [];
  }

  const validRuleIdSet = new Set((store.businessRules || []).map(br => br.id || br.code));
  const sanitized = Array.from(
    new Set(
      ruleIds
        .map(id => (typeof id === 'string' ? id.trim() : ''))
        .filter(id => id && validRuleIdSet.has(id))
    )
  );

  req.ruleIds = sanitized;
  req.lastModified = new Date().toISOString();
  updateMetadata({ updatedBy: author });

  return {
    success: true,
    reqId: req.id,
    ruleIds: sanitized
  };
}

export function getCoverageMetrics() {
  const traces = getAllTraceabilityRecords();
  const store = getActiveStore();

  const totalActiveRequirements = traces.length;

  let flowRequired = 0;
  let flowCovered = 0;
  let flowGap = 0;
  let managementRequirements = 0;
  let requirementsWithBusinessRules = 0;

  traces.forEach(t => {
    if (t.isFlowRequired) flowRequired++;
    if (t.classification === 'covered') flowCovered++;
    if (t.classification === 'gap') flowGap++;
    if (t.classification === 'management') managementRequirements++;
    if (t.businessRules && t.businessRules.length > 0) requirementsWithBusinessRules++;
  });

  let totalFeatures = 0;
  let featuresWithFlows = 0;
  let totalModules = 0;
  let modulesWithFlows = 0;

  if (store && Array.isArray(store.modules)) {
    totalModules = store.modules.length;
    store.modules.forEach(m => {
      let moduleHasNodes = false;
      if (Array.isArray(m.features)) {
        totalFeatures += m.features.length;
        m.features.forEach(f => {
          const flowObj = store.flows?.[m.id]?.[f.id];
          const activeNodes = (flowObj?.nodes || []).filter(n => !n.isSuperseded && !n.isArchived);
          if (activeNodes.length > 0) {
            featuresWithFlows++;
            moduleHasNodes = true;
          }
        });
      }
      if (moduleHasNodes) modulesWithFlows++;
    });
  }

  const flowCoverageRate = flowRequired > 0 
    ? Number(((flowCovered / flowRequired) * 100).toFixed(2))
    : 0;

  const totalTraceabilityHealth = totalActiveRequirements > 0
    ? Number((((flowCovered + managementRequirements) / totalActiveRequirements) * 100).toFixed(2))
    : 0;

  const businessRuleCoverage = totalActiveRequirements > 0
    ? Number(((requirementsWithBusinessRules / totalActiveRequirements) * 100).toFixed(2))
    : 0;

  const featureFlowCompleteness = totalFeatures > 0
    ? Number(((featuresWithFlows / totalFeatures) * 100).toFixed(2))
    : 0;

  const moduleFlowCompleteness = totalModules > 0
    ? Number(((modulesWithFlows / totalModules) * 100).toFixed(2))
    : 0;

  return {
    totalActiveRequirements,
    flowRequired,
    flowCovered,
    flowGap,
    managementRequirements,
    requirementsWithBusinessRules,
    totalModules,
    modulesWithFlows,
    totalFeatures,
    featuresWithFlows,
    flowCoverageRate,
    totalTraceabilityHealth,
    businessRuleCoverage,
    featureFlowCompleteness,
    moduleFlowCompleteness
  };
}

export function getNodeTrace(moduleId, featureId, nodeId) {
  const store = getActiveStore();
  if (!store || !store.flows) return null;

  let foundNode = null;
  let effectiveModId = moduleId;
  let effectiveFeatId = featureId;

  if (moduleId && featureId && store.flows[moduleId]?.[featureId]) {
    foundNode = (store.flows[moduleId][featureId].nodes || []).find(n => !n.isSuperseded && !n.isArchived && n.id === nodeId);
  }

  if (!foundNode) {
    for (const [mId, feats] of Object.entries(store.flows || {})) {
      for (const [fId, flowObj] of Object.entries(feats || {})) {
        const match = (flowObj.nodes || []).find(n => !n.isSuperseded && !n.isArchived && n.id === nodeId);
        if (match) {
          foundNode = match;
          effectiveModId = mId;
          effectiveFeatId = fId;
          break;
        }
      }
      if (foundNode) break;
    }
  }

  if (!foundNode) return null;

  const moduleObj = store.modules?.find(m => m.id === effectiveModId) || null;
  const featureObj = moduleObj?.features?.find(f => f.id === effectiveFeatId) || null;

  let linkedReq = null;
  if (foundNode.reqId) {
    linkedReq = getRequirementByReqId(foundNode.reqId) || null;
  }

  const matchedRules = [];
  const ruleIdSet = new Set();

  if (Array.isArray(foundNode.ruleIds)) {
    foundNode.ruleIds.forEach(id => ruleIdSet.add(id));
  }

  if (typeof foundNode.businessRule === 'string') {
    const matches = foundNode.businessRule.match(/BR-[A-Z]+-[0-9]+/g);
    if (matches) matches.forEach(m => ruleIdSet.add(m));
  }

  if (linkedReq) {
    if (Array.isArray(linkedReq.ruleIds)) {
      linkedReq.ruleIds.forEach(id => ruleIdSet.add(id));
    }
    if (typeof linkedReq.businessRule === 'string') {
      const matches = linkedReq.businessRule.match(/BR-[A-Z]+-[0-9]+/g);
      if (matches) matches.forEach(m => ruleIdSet.add(m));
    }
  }

  if (Array.isArray(store.businessRules)) {
    store.businessRules.forEach(br => {
      if (ruleIdSet.has(br.id) || ruleIdSet.has(br.code)) {
        matchedRules.push(br);
      }
    });
  }

  matchedRules.sort((a, b) => (a.id || a.code || '').localeCompare(b.id || b.code || ''));
  const criteriaText = linkedReq ? getRequirementCriteria(linkedReq) : (foundNode.validation || '');

  return {
    node: foundNode,
    moduleId: effectiveModId,
    featureId: effectiveFeatId,
    module: moduleObj,
    feature: featureObj,
    requirement: linkedReq,
    businessRules: matchedRules,
    criteria: criteriaText,
    hasReqLink: Boolean(linkedReq),
    hasRuleLink: matchedRules.length > 0
  };
}

export function validateAndLinkNodeBusinessRules(moduleId, featureId, nodeId, ruleIds = [], author = 'Business Analyst') {
  const store = getActiveStore();
  if (!store || !store.flows) throw new Error('Store belum diinisialisasi');

  let targetNode = null;
  let flow = store.flows[moduleId]?.[featureId];

  if (flow && Array.isArray(flow.nodes)) {
    targetNode = flow.nodes.find(n => !n.isSuperseded && !n.isArchived && n.id === nodeId);
  }

  if (!targetNode) {
    for (const [mId, feats] of Object.entries(store.flows || {})) {
      for (const [fId, fObj] of Object.entries(feats || {})) {
        const match = (fObj.nodes || []).find(n => !n.isSuperseded && !n.isArchived && n.id === nodeId);
        if (match) {
          targetNode = match;
          break;
        }
      }
      if (targetNode) break;
    }
  }

  if (!targetNode) throw new Error(`Node ${nodeId} tidak ditemukan`);
  if (!Array.isArray(ruleIds)) ruleIds = [];

  const validRuleIdSet = new Set((store.businessRules || []).map(br => br.id || br.code));
  const sanitized = Array.from(
    new Set(
      ruleIds
        .map(id => (typeof id === 'string' ? id.trim() : ''))
        .filter(id => id && validRuleIdSet.has(id))
    )
  );

  targetNode.ruleIds = sanitized;
  targetNode.lastModified = new Date().toISOString();
  updateMetadata({ updatedBy: author });

  return {
    success: true,
    nodeId: targetNode.id,
    ruleIds: sanitized
  };
}

export function getGapAnalysisReport() {
  const allTraces = getAllTraceabilityRecords();
  const store = getActiveStore();
  const gapRecords = allTraces.filter(t => t.classification === 'gap');

  const gapsByModule = {};
  if (store && Array.isArray(store.modules)) {
    store.modules.forEach(m => {
      gapsByModule[m.id] = {
        moduleId: m.id,
        moduleName: m.name,
        moduleOrder: m.order,
        totalGaps: 0,
        requirements: []
      };
    });
  }

  gapRecords.forEach(rec => {
    const modId = rec.module?.id || rec.requirement?.module || 'other';
    if (!gapsByModule[modId]) {
      gapsByModule[modId] = {
        moduleId: modId,
        moduleName: rec.module?.name || rec.requirement?.module || 'Lainnya',
        moduleOrder: 99,
        totalGaps: 0,
        requirements: []
      };
    }
    gapsByModule[modId].totalGaps++;
    gapsByModule[modId].requirements.push(rec);
  });

  const moduleSummary = Object.values(gapsByModule).sort(
    (a, b) => (a.moduleOrder || 99) - (b.moduleOrder || 99)
  );

  return {
    totalGaps: gapRecords.length,
    gapRecords,
    moduleSummary,
    generatedAt: new Date().toISOString()
  };
}


// =============================================================================
// FLOW NODES, EDGES & BUSINESS RULES INITIALIZATION
// =============================================================================

export function buildCanonicalCrossFlowEdges() {
  return [
    {
      id: 'CFE-01',
      name: 'Penerimaan Benih → Penyemaian Bedengan',
      fromModule: '02-penerimaan',
      fromFeature: 'terima-benih',
      fromNode: 'TB_END',
      toModule: '03-penyemaian',
      toFeature: 'semai-bedengan',
      toNode: 'SEM_START',
      label: 'Distribusi Benih ke Bedengan',
      condition: 'Benih Terverifikasi',
      description: 'Benih terverifikasi dari penerimaan masuk ke fase penyemaian bedengan perkecambahan.'
    },
    {
      id: 'CFE-02',
      name: 'Penyemaian Bedengan → Okulasi (Grafting)',
      fromModule: '03-penyemaian',
      fromFeature: 'semai-bedengan',
      fromNode: 'SEM_END',
      toModule: '04-okulasi',
      toFeature: 'grafting',
      toNode: 'N_START',
      label: 'Batch Bibit Siap Okulasi',
      condition: 'Batch Terbentuk',
      description: 'Batch bibit dari bedengan siap diokulasi masuk ke siklus penempelan mata entres dari Kebun Kayu Okulasi.'
    },
    {
      id: 'CFE-03',
      name: 'Panen Mata Entres → Okulasi (Grafting)',
      fromModule: '08-panen-mata-entres',
      fromFeature: 'panen-entres',
      fromNode: 'PN_END',
      toModule: '04-okulasi',
      toFeature: 'grafting',
      toNode: 'N_P004',
      label: 'Alokasi Stok Mata Entres',
      condition: 'Stok Terverifikasi',
      description: 'Mata entres hasil panen diverifikasi dialokasikan untuk penempelan okulasi.'
    },
    {
      id: 'CFE-04',
      name: 'Pemeriksaan Grafting → Okulasi Regrafting',
      fromModule: '05-pemeriksaan',
      fromFeature: 'periksa-grafting',
      fromNode: 'CHK_05',
      toModule: '04-okulasi',
      toFeature: 'regrafting',
      toNode: 'RG_START',
      label: 'Bibit Gagal Di-Regrafting',
      condition: 'Tindak Lanjut Regrafting',
      description: 'Bibit dengan mata tempelan mati diarahkan ke okulasi ulang (regrafting).'
    },
    {
      id: 'CFE-05',
      name: 'Pengeluaran Bibit → Penerimaan Bibit di Divisi',
      fromModule: '11-pengeluaran',
      fromFeature: 'pengeluaran-bibit',
      fromNode: 'EXB_END',
      toModule: '02-penerimaan',
      toFeature: 'terima-kebun-sendiri',
      toNode: 'KS_04',
      label: 'Konfirmasi Penerimaan di Divisi Tanam',
      condition: 'Armada Tiba di Divisi & Polygon Valid',
      description: 'Bibit yang dikirim dari pembibitan tiba di lokasi divisi dan dikonfirmasi penerimaannya serta di-plotting polygon tanamnya.'
    }
  ];
}

export function finalizeFlowAndBusinessRuleTraceability(store = activeStore) {
  if (!store) store = getActiveStore();

  // 1. Business Rules Master Definition
  const canonicalRules = [
    { id: 'BR-GLB-001', title: 'Mandatory Foto Dokumentasi + Timestamp', desc: 'Setiap transaksi operasional Mantri Bibitan wajib menyertakan foto fisik dokumentasi dengan watermark timestamp ISO dan geolokasi GPS yang valid.', category: 'Global' },
    { id: 'BR-GLB-002', title: 'Kewajiban Verifikasi Asisten Bibitan', desc: 'Semua transaksi yang diinput oleh Mantri Bibitan berstatus Menunggu Verifikasi dan belum memengaruhi saldo produksi sampai disetujui oleh Asisten Bibitan.', category: 'Global' },
    { id: 'BR-GLB-003', title: 'Promosi ke Server Production', desc: 'Hanya transaksi yang telah diverifikasi dan disetujui oleh Asisten Bibitan yang akan dikirim ke basis data Server Production.', category: 'Global' },
    { id: 'BR-PRS-001', title: 'Presensi Masuk Sebagai Syarat Transaksi', desc: 'Presensi Masuk supervisor wajib diselesaikan terlebih dahulu di pagi hari sebelum sistem mengizinkan transaksi operasional harian lainnya.', category: 'Presensi' },
    { id: 'BR-PRS-003', title: 'Prioritas Biometrik Face ID', desc: 'Face ID adalah metode biometrik utama untuk presensi supervisor (foto otomatis). Foto manual hanya diizinkan sebagai fallback jika verifikasi Face ID mengalami kegagalan teknis dan wajib menyertakan alasan.', category: 'Presensi' },
    { id: 'BR-OKL-001', title: 'Presensi Sebelum Okulasi', desc: 'Transaksi okulasi hanya dapat dibuka jika Mantri telah menyelesaikan presensi harian dan pekerja yang dialokasikan terdaftar hadir.', category: 'Okulasi' },
    { id: 'BR-OKL-002', title: 'Validasi QR Code Objek Fisik', desc: 'Batch bibit wajib divalidasi menggunakan QR Code sebelum penginputan hasil kerja okulasi dilakukan. Pemilihan manual hanya jalur fallback.', category: 'Okulasi' },
    { id: 'BR-OKL-005', title: 'Identitas Stok Mata Entres', desc: 'Stok mata entres dikelola berdasarkan kombinasi Plot Entres + Clone, bukan berdasarkan Batch.', category: 'Okulasi' },
    { id: 'BR-OKL-006', title: 'Status Estimasi vs Stok Aktual', desc: 'Kalkulasi Jumlah Cabang x Rata-rata Mata Entres adalah estimasi referensi semata. Hanya mata entres aktual yang diverifikasi yang menjadi pengurang saldo stok.', category: 'Okulasi' },
    { id: 'BR-OKL-007', title: 'Pengurangan Stok Pasca Verifikasi', desc: 'Pengurangan saldo stok mata entres terjadi secara otomatis hanya setelah berkas transaksi okulasi disetujui (diverifikasi) oleh Asisten Bibitan.', category: 'Okulasi' },
    { id: 'BR-OKL-008', title: 'Regrafting Berulang Tanpa Batas Tunggal', desc: 'Proses regrafting pada bibit gagal tidak dibatasi hanya satu kali. Bibit yang gagal pada pemeriksaan regrafting dapat diregrafting kembali atau diputuskan reject oleh Mantri.', category: 'Okulasi' },
    { id: 'BR-SEM-001', title: 'Alokasi Multi-Bedengan per Dokumen', desc: 'Satu dokumen penerimaan benih dapat dialokasikan ke beberapa bedengan perkecambahan (contoh: 10.000 benih dibagi ke Bedengan 001, 002, dan 003).', category: 'Penyemaian' },
    { id: 'BR-SEM-006', title: 'Standar 1 Polybag = 2 Benih/Bibit', desc: 'Kecambah yang ditransplanting dari bedengan ke kantong polybag wajib ditanami 2 kecambah per polybag untuk seleksi vigor selanjutnya.', category: 'Penyemaian' },
    { id: 'BR-SEM-007', title: 'Konsolidasi Multi-Bedengan ke 1 Batch', desc: 'Satu Batch bibit siap okulasi dapat dibentuk dari gabungan beberapa bedengan semaian.', category: 'Penyemaian' },
    { id: 'BR-SEL-001', title: 'Verifikasi Fisik Sebelum Pengurangan Populasi Batch', desc: 'Deklarasi bibit reject/mati pada modul penyeleksian oleh Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan pemeriksaan fisik langsung dan menyetujuinya.', category: 'Penyeleksian' },
    { id: 'BR-MAT-001', title: 'Integritas 1 Dokumen Gudang = 1 Heading Kerja', desc: 'Satu dokumen pengeluaran gudang hanya dapat dilekatkan pada satu aktivitas pemeliharaan dengan heading kerja yang sama (matching).', category: 'Material' },
    { id: 'BR-AUD-001', title: 'Audit Trail Koreksi Transaksi', desc: 'Setiap koreksi terhadap transaksi yang telah berstatus Confirmed wajib mencatat log audit trail yang berisi originalValue, correctedValue, reason, correctedBy, dan correctedAt secara immutable.', category: 'Governance' },
    { id: 'BR-QAL-001', title: 'Quality Control & Agronomy Standard', desc: 'Verifikasi agronomi teknis pembibitan karet wajib memenuhi batas toleransi standar mutu Socfindo sebelum batch disetujui.', category: 'Quality Control' }
  ];
  store.businessRules = canonicalRules;

  // 2. Cross-flow edges
  store.crossFlowEdges = buildCanonicalCrossFlowEdges();

  // 3. Normalize Flow Nodes & Edges from Baseline
  if (!store.flows || Object.keys(store.flows).length === 0) {
    store.flows = JSON.parse(JSON.stringify(PROCESS_MAPPING_BASELINE.flows || {}));
  }

  for (const [modId, features] of Object.entries(store.flows)) {
    if (!features || typeof features !== 'object') continue;
    for (const [featId, flowObj] of Object.entries(features)) {
      if (!flowObj || !Array.isArray(flowObj.nodes)) continue;

      flowObj.nodes = flowObj.nodes.map(n => ({
        ...n,
        version: n.version || 1,
        status: n.status || 'Confirmed',
        isArchived: Boolean(n.isArchived),
        isSuperseded: Boolean(n.isSuperseded),
        revisionOf: n.revisionOf || null,
        createdAt: n.createdAt || new Date().toISOString()
      }));

      if (Array.isArray(flowObj.edges)) {
        flowObj.edges = flowObj.edges.map(e => ({
          ...e,
          from: e.from || e.fromNode,
          to: e.to || e.toNode,
          fromNode: e.fromNode || e.from,
          toNode: e.toNode || e.to,
          version: e.version || 1,
          status: e.status || 'Confirmed',
          isArchived: Boolean(e.isArchived),
          isSuperseded: Boolean(e.isSuperseded),
          revisionOf: e.revisionOf || null,
          createdAt: e.createdAt || new Date().toISOString()
        }));
      }
    }
  }

  // 4. Link Business Rules to Requirements
  const ruleMapping = {
    'RN-PRS-001': ['BR-PRS-001', 'BR-GLB-001'],
    'RN-PRS-002': ['BR-PRS-001'],
    'RN-PRS-003': ['BR-PRS-003'],
    'RN-PRS-005': ['BR-PRS-003', 'BR-GLB-001'],
    'RN-PRS-006': ['BR-GLB-001'],
    'RN-PRS-007': ['BR-PRS-001'],
    'RN-PRS-PWP001': ['BR-PRS-001'],
    'RN-PRS-PWP002': ['BR-GLB-001'],
    'RN-PRS-PWP003': ['BR-GLB-001'],
    'RN-PRS-PWP004': ['BR-GLB-002'],
    'RN-PRS-PWP005': ['BR-GLB-003'],
    
    'RN-PWP-001': ['BR-PRS-001'],
    'RN-PWP-002': ['BR-GLB-001'],
    'RN-PWP-003': ['BR-GLB-001'],
    'RN-PWP-004': ['BR-GLB-002'],
    'RN-PWP-005': ['BR-GLB-003'],
    'RN-RCV-KSP021': ['BR-GLB-003'],
    'RN-RCV-ME027': ['BR-GLB-003'],
    'RN-SEM-TP028': ['BR-SEM-007'],
    'RN-PWP-006': ['BR-GLB-002'],
    'RN-PWP-007': ['BR-GLB-003'],
    'RN-RCV-002': ['BR-GLB-001'],
    'RN-RCV-003': ['BR-GLB-001'],
    'RN-RCV-004': ['BR-GLB-001'],
    'RN-RCV-005': ['BR-GLB-002'],
    'RN-RCV-006': ['BR-SEM-001', 'BR-GLB-003'],
    'RN-RCV-028': ['BR-QAL-001'],
    'RN-RCV-KS01': ['BR-GLB-002'],
    'RN-RCV-KS02': ['BR-GLB-002'],
    'RN-RCV-KS03': ['BR-GLB-002'],
    'RN-RCV-KS04': ['BR-GLB-001'],
    'RN-RCV-KS05': ['BR-GLB-001'],
    'RN-RCV-KS06': ['BR-GLB-003'],
    'RN-RCV-KSP015': ['BR-GLB-002'],
    'RN-RCV-KSP016': ['BR-GLB-002'],
    'RN-RCV-KSP017': ['BR-GLB-002'],
    'RN-RCV-KSP018': ['BR-GLB-001'],
    'RN-RCV-KSP019': ['BR-GLB-001'],
    'RN-RCV-KSP020': ['BR-GLB-003'],
    'RN-RCV-ME021': ['BR-GLB-002'],
    'RN-RCV-ME022': ['BR-GLB-002'],
    'RN-RCV-ME023': ['BR-GLB-002'],
    'RN-RCV-ME024': ['BR-GLB-001'],
    'RN-RCV-ME025': ['BR-GLB-001'],
    'RN-RCV-ME026': ['BR-GLB-003'],
    'RN-SEM-001': ['BR-SEM-001'],
    'RN-SEM-002': ['BR-OKL-002'],
    'RN-SEM-003': ['BR-SEM-001'],
    'RN-SEM-004': ['BR-GLB-001'],
    'RN-SEM-005': ['BR-GLB-002'],
    'RN-SEM-006': ['BR-SEM-006'],
    'RN-SEM-007': ['BR-SEM-007'],
    'RN-SEM-008': ['BR-GLB-003'],
    'RN-SEM-TP029': ['BR-SEM-007'],
    'RN-SEM-TP030': ['BR-OKL-002'],
    'RN-SEM-TP031': ['BR-SEM-006'],
    'RN-SEM-TP032': ['BR-GLB-002'],
    'RN-SEM-TP033': ['BR-GLB-001'],
    'RN-SEM-TP034': ['BR-GLB-001'],
    'RN-SEM-TP035': ['BR-GLB-003'],
    'RN-SEM-TP036': ['BR-GLB-002'],
    'RN-OKL-001': ['BR-OKL-001'],
    'RN-OKL-002': ['BR-OKL-002'],
    'RN-OKL-003': ['BR-OKL-001'],
    'RN-OKL-004': ['BR-OKL-001'],
    'RN-OKL-005': ['BR-OKL-005'],
    'RN-OKL-006': ['BR-OKL-006'],
    'RN-OKL-007': ['BR-OKL-007'],
    'RN-OKL-008': ['BR-OKL-006'],
    'RN-OKL-009': ['BR-OKL-006'],
    'RN-OKL-010': ['BR-OKL-006'],
    'RN-OKL-011': ['BR-GLB-001'],
    'RN-OKL-012': ['BR-GLB-002'],
    'RN-OKL-013': ['BR-GLB-002'],
    'RN-OKL-014': ['BR-OKL-007'],
    'RN-OKL-015': ['BR-GLB-003'],
    'RN-OKL-029': ['BR-QAL-001'],
    'RN-REG-000': ['BR-OKL-008'],
    'RN-REG-001': ['BR-OKL-008'],
    'RN-REG-002': ['BR-OKL-002'],
    'RN-REG-003': ['BR-OKL-008'],
    'RN-REG-004': ['BR-OKL-001'],
    'RN-REG-005': ['BR-OKL-005'],
    'RN-REG-006': ['BR-OKL-006'],
    'RN-REG-007': ['BR-GLB-001'],
    'RN-REG-008': ['BR-GLB-002'],
    'RN-REG-009': ['BR-GLB-002'],
    'RN-REG-010': ['BR-OKL-007'],
    'RN-REG-011': ['BR-GLB-003'],
    'RN-CHK-001': ['BR-OKL-008'],
    'RN-CHK-002': ['BR-OKL-008'],
    'RN-CHK-003': ['BR-OKL-002'],
    'RN-CHK-004': ['BR-GLB-001'],
    'RN-CHK-005': ['BR-GLB-001'],
    'RN-CHK-006': ['BR-OKL-008'],
    'RN-CHK-007': ['BR-GLB-001'],
    'RN-CHK-008': ['BR-GLB-002'],
    'RN-CHK-009': ['BR-GLB-003'],
    'RN-CHK-RG036': ['BR-OKL-008'],
    'RN-CHK-RG037': ['BR-OKL-008'],
    'RN-CHK-RG038': ['BR-OKL-002'],
    'RN-CHK-RG039': ['BR-GLB-001'],
    'RN-CHK-RG040': ['BR-GLB-001'],
    'RN-CHK-RG041': ['BR-OKL-008'],
    'RN-CHK-RG042': ['BR-GLB-001'],
    'RN-CHK-RG043': ['BR-GLB-002'],
    'RN-CHK-RG044': ['BR-GLB-003'],
    'RN-SEL-001': ['BR-SEL-001'],
    'RN-SEL-003': ['BR-OKL-002'],
    'RN-SEL-004': ['BR-SEL-001'],
    'RN-SEL-005': ['BR-SEL-001'],
    'RN-SEL-006': ['BR-GLB-001'],
    'RN-SEL-007': ['BR-GLB-002'],
    'RN-SEL-008': ['BR-SEL-001'],
    'RN-SEL-009': ['BR-SEL-001'],
    'RN-SEL-010': ['BR-GLB-002'],
    'RN-SEL-011': ['BR-GLB-003'],
    'RN-SEL-012': ['BR-SEL-001', 'BR-GLB-002'],
    'RN-SEL-013': ['BR-SEL-001'],
    'RN-SEL-014': ['BR-SEL-001'],
    'RN-ENT-002': ['BR-OKL-002'],
    'RN-ENT-003': ['BR-OKL-005'],
    'RN-ENT-004': ['BR-GLB-001'],
    'RN-ENT-005': ['BR-GLB-001'],
    'RN-ENT-006': ['BR-GLB-001', 'BR-GLB-002'],
    'RN-ENT-007': ['BR-GLB-003'],
    'RN-ENT-008': ['BR-QAL-001'],
    'RN-ENT-TOP045': ['BR-GLB-001'],
    'RN-ENT-TOP046': ['BR-OKL-002'],
    'RN-ENT-TOP047': ['BR-OKL-005'],
    'RN-ENT-TOP048': ['BR-GLB-001'],
    'RN-ENT-TOP049': ['BR-GLB-001'],
    'RN-ENT-TOP050': ['BR-GLB-001', 'BR-GLB-002'],
    'RN-ENT-TOP051': ['BR-GLB-003'],
    'RN-HAR-001': ['BR-OKL-005', 'BR-OKL-007'],
    'RN-HAR-002': ['BR-OKL-002'],
    'RN-HAR-003': ['BR-OKL-006'],
    'RN-HAR-004': ['BR-OKL-006'],
    'RN-HAR-005': ['BR-OKL-006'],
    'RN-HAR-006': ['BR-GLB-001'],
    'RN-HAR-007': ['BR-GLB-002'],
    'RN-HAR-008': ['BR-GLB-003'],
    'RN-MAT-001': ['BR-MAT-001'],
    'RN-MAT-002': ['BR-OKL-005'],
    'RN-MAT-003': ['BR-OKL-007'],
    'RN-MAT-004': ['BR-MAT-001'],
    'RN-MAT-005': ['BR-MAT-001'],
    'RN-MAT-006': ['BR-GLB-001'],
    'RN-MAT-007': ['BR-GLB-003'],
    'RN-MAT-MMG052': ['BR-MAT-001'],
    'RN-MAT-MMG053': ['BR-MAT-001'],
    'RN-MAT-MMG054': ['BR-MAT-001'],
    'RN-MAT-MMG055': ['BR-MAT-001'],
    'RN-MAT-MMG056': ['BR-MAT-001'],
    'RN-MAT-MMG057': ['BR-GLB-001'],
    'RN-MAT-MMG058': ['BR-GLB-003'],
    'RN-MAT-MMG059': ['BR-MAT-001', 'BR-GLB-002'],
    'RN-MAT-MMG060': ['BR-MAT-001', 'BR-GLB-003'],
    'RN-MNT-001': ['BR-GLB-001'],
    'RN-MNT-002': ['BR-GLB-001'],
    'RN-MNT-003': ['BR-OKL-002'],
    'RN-MNT-004': ['BR-GLB-001'],
    'RN-MNT-005': ['BR-GLB-001'],
    'RN-MNT-006': ['BR-MAT-001'],
    'RN-MNT-007': ['BR-GLB-002'],
    'RN-MNT-008': ['BR-GLB-003'],
    'RN-MNT-009': ['BR-AUD-001'],
    'RN-EXP-001': ['BR-GLB-002'],
    'RN-EXP-002': ['BR-GLB-002'],
    'RN-EXP-003': ['BR-OKL-002'],
    'RN-EXP-004': ['BR-GLB-001'],
    'RN-EXP-007': ['BR-GLB-003'],
    'RN-EXP-008': ['BR-GLB-001'],
    'RN-EXP-009': ['BR-GLB-003'],
    'RN-EXM-001': ['BR-GLB-002'],
    'RN-EXM-002': ['BR-OKL-002'],
    'RN-EXM-003': ['BR-OKL-006'],
    'RN-EXM-004': ['BR-GLB-001', 'BR-GLB-002'],
    'RN-EXM-005': ['BR-GLB-003']
  };

  (store.requirements || []).forEach(req => {
    if (ruleMapping[req.id]) {
      req.ruleIds = ruleMapping[req.id];
      req.businessRule = req.ruleIds.join(', ');
    }
  });

  updateMetadata({ updatedBy: 'System Architect (Task 10 Finalization)' });
  return store;
}

export const FINAL_TRUE_GAP_FLOW_PLAN = {};
export function applyTrueGapResolutionPlan(store = activeStore) {
  return finalizeFlowAndBusinessRuleTraceability(store);
}
export function finalizeFlowEdges(store = activeStore) {
  return finalizeFlowAndBusinessRuleTraceability(store);
}
export function finalizeBusinessRuleTraceability(store = activeStore) {
  return finalizeFlowAndBusinessRuleTraceability(store);
}

export function getFlowEdgeCoverageReport(store = activeStore) {
  if (!store) store = getActiveStore();
  const edgeSummary = [];
  let totalEdges = 0;
  let invalidEdges = 0;
  let orphanNodes = 0;

  for (const [modId, features] of Object.entries(store.flows || {})) {
    for (const [featId, flow] of Object.entries(features || {})) {
      const nodes = flow.nodes || [];
      const edges = flow.edges || [];
      const nodeIds = new Set(nodes.map(n => n.id));
      
      const targetNodeIds = new Set(edges.map(e => e.to || e.toNode));
      const sourceNodeIds = new Set(edges.map(e => e.from || e.fromNode));

      nodes.forEach(n => {
        if (n.type !== 'start' && n.type !== 'end') {
          if (!targetNodeIds.has(n.id) && !sourceNodeIds.has(n.id)) {
            orphanNodes++;
          }
        }
      });

      edges.forEach(e => {
        totalEdges++;
        const fromId = e.from || e.fromNode;
        const toId = e.to || e.toNode;
        if (!nodeIds.has(fromId) || !nodeIds.has(toId)) {
          invalidEdges++;
        }
      });

      edgeSummary.push({
        moduleId: modId,
        featureId: featId,
        nodeCount: nodes.length,
        edgeCount: edges.length
      });
    }
  }

  const totalCrossFlowEdges = (store.crossFlowEdges || []).length;

  return {
    totalEdges,
    totalActiveEdges: totalEdges,
    totalCrossFlowEdges,
    invalidEdges,
    orphanNodes,
    edgeSummary,
    valid: invalidEdges === 0 && orphanNodes === 0
  };
}

export function getBusinessRuleTraceabilityReport(store = activeStore) {
  if (!store) store = getActiveStore();
  const rules = store.businessRules || [];
  const reqs = store.requirements || [];

  const ruleSummary = rules.map(rule => {
    const linkedReqs = reqs.filter(r => !r.isArchived && (r.ruleIds || []).includes(rule.id));
    return {
      ruleId: rule.id,
      title: rule.name || rule.title,
      linkedReqCount: linkedReqs.length,
      isCovered: linkedReqs.length > 0
    };
  });

  const coveredCount = ruleSummary.filter(r => r.isCovered).length;
  const coverageRate = rules.length > 0 ? Number(((coveredCount / rules.length) * 100).toFixed(2)) : 100;

  return {
    totalRules: rules.length,
    totalCanonicalRules: rules.length,
    coveredRules: coveredCount,
    coveredRulesCount: coveredCount,
    coverageRate,
    ruleSummary
  };
}

export const NEW_REQUIREMENT_IDS = new Set([
  'RN-PWP-006', 'RN-MAT-MMG059', 'RN-EXP-008', 'RN-SEL-012', 'RN-ENT-008',
  'RN-OKL-029', 'RN-RCV-028', 'RN-EXP-009', 'RN-MAT-MMG060', 'RN-PWP-007',
  'RN-MNT-009', 'RN-SEM-TP036', 'RN-SEL-013', 'RN-SEL-014'
]);

export const REVISED_REQUIREMENT_IDS = new Set([
  'RN-PRS-006', 'RN-PRS-007', 'RN-RCV-002', 'RN-EXP-001', 'RN-EXP-004',
  'RN-RCV-KSP019', 'RN-RCV-ME025', 'RN-OKL-001', 'RN-OKL-002', 'RN-OKL-003',
  'RN-OKL-004', 'RN-OKL-005', 'RN-OKL-006', 'RN-SEL-001', 'RN-SEL-003',
  'RN-SEL-004', 'RN-SEL-005', 'RN-MAT-MMG054', 'RN-MAT-MMG055', 'RN-MAT-MMG056',
  'RN-MNT-001', 'RN-MNT-002', 'RN-MNT-003', 'RN-MNT-004', 'RN-MNT-005',
  'RN-MNT-006', 'RN-MNT-007', 'RN-MNT-008'
]);

export const DEPRECATED_REQUIREMENT_IDS = new Set([
  'RN-PRS-004', 'RN-RCV-001', 'RN-OKL-000', 'RN-SEL-002', 'RN-ENT-001',
  'RN-EXP-005', 'RN-EXP-006'
]);

export const MERGED_REQUIREMENT_ITEMS = [
  {
    id: 'PROPOSED-012',
    targetId: 'RN-RCV-006',
    title: 'Pencocokan Surat Jalan / BKB Vendor Penerimaan Benih Kelatak',
    role: 'Mantri Bibitan',
    module: '02-penerimaan-biji',
    feature: 'terima-benih',
    classification: 'Merged',
    status: 'Merged',
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
    status: 'Merged',
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
    status: 'Merged',
    description: 'Dileburkan ke requirement induk RN-EXP-002 (Otorisasi Pengeluaran Bibit).'
  }
];

export function getRequirementClassification(reqId) {
  if (!reqId) return 'Retained';
  if (DEPRECATED_REQUIREMENT_IDS.has(reqId)) return 'Deprecated';
  if (NEW_REQUIREMENT_IDS.has(reqId)) return 'New';
  if (REVISED_REQUIREMENT_IDS.has(reqId)) return 'Revised';
  if (MERGED_REQUIREMENT_ITEMS.some(m => m.id === reqId || m.originalId === reqId)) return 'Merged';
  return 'Retained';
}

export function getReconciliationCatalog(store = activeStore) {
  if (!store) store = getActiveStore();
  const reqs = store.requirements || [];
  const catalog = [];

  reqs.forEach(r => {
    let classification = 'Retained';
    let statusLabel = 'Confirmed';

    if (r.isArchived || DEPRECATED_REQUIREMENT_IDS.has(r.id)) {
      classification = 'Deprecated';
      statusLabel = 'Deprecated / Archived';
    } else if (NEW_REQUIREMENT_IDS.has(r.id)) {
      classification = 'New';
      statusLabel = 'Confirmed';
    } else if (REVISED_REQUIREMENT_IDS.has(r.id)) {
      classification = 'Revised';
      statusLabel = 'Confirmed';
    }

    catalog.push({
      entityType: 'Requirement',
      id: r.id,
      title: r.title,
      role: r.role,
      module: r.module,
      moduleId: r.moduleId,
      feature: r.feature,
      featureId: r.featureId,
      classification,
      status: statusLabel,
      version: r.version ? `v${r.version}` : 'v1.0.0',
      sourceProposedId: r.sourceProposedId || null,
      raw: r
    });
  });

  MERGED_REQUIREMENT_ITEMS.forEach(m => {
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
      status: 'Merged',
      version: 'v1.0.0',
      description: m.description,
      raw: m
    });
  });

  return catalog;
}

/**
 * Canonical content resolver for Flow Node across BPD and Detail Node UI.
 * Unifies Input, Validasi & Aturan, Fallback / Pengecualian, Output & Dampak Stok,
 * Purpose, and Process from official baseline sources.
 */
export function resolveNodeCanonicalContent(moduleId, featureId, node, store = activeStore) {
  if (!node) return null;
  if (!store) store = getActiveStore();

  const trace = getNodeTrace(moduleId, featureId, node.id, store);
  const linkedReq = trace?.requirement || (node.reqId ? getRequirementByReqId(node.reqId, store) : null);
  const matchedRules = trace?.businessRules || [];

  // Special canonical override for Modul 01 - Presensi Supervisor (Task 15.9.1)
  const isPresensiSupervisor = (moduleId === '01-presensi' || node.module === 'Presensi') && 
    (featureId === 'presensi-supervisor' || node.feature === 'Presensi Supervisor' || (node.id && node.id.startsWith('PR_')));

  if (isPresensiSupervisor) {
    const role = node.role || linkedReq?.role || 'Mantri Bibitan';
    const relatedRole = node.relatedRole || 'Asisten Bibitan';
    return {
      nodeId: node.id,
      nodeCode: node.code || node.id,
      nodeLabel: node.label || node.title || linkedReq?.title || '',
      reqId: linkedReq?.id || node.reqId || null,
      linkedReq,
      matchedRules,
      input: 'Kredensial pengguna, pindaian Face ID (foto otomatis), koordinat GPS, atau foto manual dan alasan jika Face ID gagal.',
      validation: 'Kecocokan Face ID valid. Koordinat GPS berada dalam area nursery/kebun yang diizinkan. Presensi Masuk wajib tercatat sebelum transaksi operasional. Presensi Pulang tersedia mulai 14:00 (Jumat mulai 12:00).',
      fallback: 'Jika Face ID gagal, gunakan Foto Manual dengan wajib mencantumkan alasan. Jika berada di luar koordinat kebun/nursery yang diizinkan, presensi ditolak.',
      output: 'Data presensi supervisor tercatat dan status presensi aktif untuk membuka akses transaksi operasional.',
      purpose: 'Melakukan presensi Mantri Bibitan sebelum menjalankan transaksi operasional.',
      process: 'Sistem menentukan status presensi (Masuk/Pulang) secara otomatis berdasarkan waktu. Pengguna melakukan verifikasi biometrik Face ID di mana foto diambil secara otomatis. Jika Face ID gagal, pengguna menggunakan Foto Manual sebagai fallback dengan menyertakan alasan. Sistem memvalidasi koordinat GPS berada dalam area nursery/kebun yang diizinkan.',
      stockImpact: (node.stockImpact && node.stockImpact.trim() && node.stockImpact !== 'NO STOCK CHANGE') ? node.stockImpact.trim() : '',
      populationImpact: (node.populationImpact && node.populationImpact.trim() && node.populationImpact !== 'NO POPULATION CHANGE') ? node.populationImpact.trim() : '',
      role,
      relatedRole
    };
  }

  // 1. Input Data
  let input = '';
  if (node.input && node.input.trim() && node.input.trim() !== '-') {
    input = node.input.trim();
  } else if (linkedReq?.input && linkedReq.input.trim() && linkedReq.input.trim() !== '-') {
    input = linkedReq.input.trim();
  }

  // 2. Validasi & Aturan
  let validation = '';
  if (node.validation && node.validation.trim() && node.validation.trim() !== '-' && node.validation.trim() !== 'Validasi format dan ketersediaan data') {
    validation = node.validation.trim();
  } else if (linkedReq?.validation && linkedReq.validation.trim() && linkedReq.validation.trim() !== '-') {
    validation = linkedReq.validation.trim();
  }

  // 3. Fallback / Pengecualian
  let fallback = '';
  if (node.fallback && node.fallback.trim() && node.fallback.trim() !== '-' && node.fallback.trim() !== 'Tidak ada fallback manual') {
    fallback = node.fallback.trim();
  } else if (linkedReq?.fallback && linkedReq.fallback.trim() && linkedReq.fallback.trim() !== '-') {
    fallback = linkedReq.fallback.trim();
  }

  // 4. Output Data
  let output = '';
  if (node.output && node.output.trim() && node.output.trim() !== '-') {
    output = node.output.trim();
  } else if (linkedReq?.output && linkedReq.output.trim() && linkedReq.output.trim() !== '-') {
    output = linkedReq.output.trim();
  }

  // 5. Purpose / Tujuan / Summary / Description
  let purpose = '';
  if (node.purpose && node.purpose.trim() && node.purpose.trim() !== '-') {
    purpose = node.purpose.trim();
  } else if (node.summary && node.summary.trim() && node.summary.trim() !== '-') {
    purpose = node.summary.trim();
  } else if (node.description && node.description.trim() && node.description.trim() !== '-') {
    purpose = node.description.trim();
  }

  // 6. Process
  let process = '';
  if (node.process && node.process.trim() && node.process.trim() !== '-') {
    process = node.process.trim();
  } else if (linkedReq?.process && linkedReq.process.trim() && linkedReq.process.trim() !== '-') {
    process = linkedReq.process.trim();
  }

  // 7. Stock & Population Impact
  const stockImpact = (node.stockImpact && node.stockImpact.trim() && node.stockImpact !== 'NO STOCK CHANGE') ? node.stockImpact.trim() : '';
  const populationImpact = (node.populationImpact && node.populationImpact.trim() && node.populationImpact !== 'NO POPULATION CHANGE') ? node.populationImpact.trim() : '';

  // 8. Roles
  const role = node.role || linkedReq?.role || 'Mantri Bibitan';
  const relatedRole = node.relatedRole || 'Asisten Bibitan (Verifikasi)';

  return {
    nodeId: node.id,
    nodeCode: node.code || node.id,
    nodeLabel: node.label || node.title || linkedReq?.title || '',
    reqId: linkedReq?.id || node.reqId || null,
    linkedReq,
    matchedRules,
    input,
    validation,
    fallback,
    output,
    purpose,
    process,
    stockImpact,
    populationImpact,
    role,
    relatedRole
  };
}

// =============================================================================
// BUSINESS RULES & TRACEABILITY MAPPING CRUD OPERATIONS
// =============================================================================

export function createBusinessRule(ruleData, author = 'Business Analyst') {
  const store = getActiveStore();
  if (!Array.isArray(store.businessRules)) store.businessRules = [];
  const ruleId = (ruleData.id || ruleData.code || '').trim() || `BR-GEN-${String(store.businessRules.length + 1).padStart(3, '0')}`;
  
  const newRule = {
    id: ruleId,
    code: ruleId,
    title: (ruleData.title || ruleData.name || '').trim(),
    name: (ruleData.name || ruleData.title || '').trim(),
    category: (ruleData.category || 'Aturan Operasional').trim(),
    description: (ruleData.description || ruleData.desc || '').trim(),
    desc: (ruleData.desc || ruleData.description || '').trim(),
    impact: (ruleData.impact || '').trim(),
    status: ruleData.status || 'Confirmed',
    isArchived: false,
    createdAt: new Date().toISOString()
  };

  store.businessRules.push(newRule);
  updateMetadata({ updatedBy: author });
  return newRule;
}

export function editBusinessRule(ruleId, updatedFields, author = 'Business Analyst') {
  const store = getActiveStore();
  if (!Array.isArray(store.businessRules)) store.businessRules = [];
  const ruleIdx = store.businessRules.findIndex(r => r.id === ruleId || r.code === ruleId);
  if (ruleIdx === -1) throw new Error(`Business Rule ${ruleId} tidak ditemukan`);
  
  const existing = store.businessRules[ruleIdx];
  const updated = {
    ...existing,
    ...updatedFields,
    id: existing.id,
    title: updatedFields.title || updatedFields.name || existing.title || existing.name,
    name: updatedFields.name || updatedFields.title || existing.name || existing.title,
    description: updatedFields.description || updatedFields.desc || existing.description || existing.desc,
    desc: updatedFields.desc || updatedFields.description || existing.desc || existing.description,
    lastModified: new Date().toISOString()
  };
  store.businessRules[ruleIdx] = updated;
  updateMetadata({ updatedBy: author });
  return updated;
}

export function archiveBusinessRule(ruleId, author = 'Business Analyst', reason = '') {
  const store = getActiveStore();
  const rule = (store.businessRules || []).find(r => r.id === ruleId || r.code === ruleId);
  if (!rule) throw new Error(`Business Rule ${ruleId} tidak ditemukan`);
  rule.isArchived = true;
  rule.archivedAt = new Date().toISOString();
  rule.archivedBy = author;
  updateMetadata({ updatedBy: author });
  return rule;
}

export function restoreBusinessRule(ruleId, author = 'Business Analyst', reason = '') {
  const store = getActiveStore();
  const rule = (store.businessRules || []).find(r => r.id === ruleId || r.code === ruleId);
  if (!rule) throw new Error(`Business Rule ${ruleId} tidak ditemukan`);
  rule.isArchived = false;
  rule.restoredAt = new Date().toISOString();
  rule.restoredBy = author;
  updateMetadata({ updatedBy: author });
  return rule;
}

export function createMapping(mapping, author = 'Business Analyst') {
  const store = getActiveStore();
  const { sourceEntity, sourceId, targetEntity, targetId, moduleId, featureId } = mapping;

  if (sourceEntity === 'Requirement' && targetEntity === 'FlowNode') {
    const modId = moduleId || store.modules[0]?.id;
    const featId = featureId || (store.flows[modId] && Object.keys(store.flows[modId])[0]);
    const flow = store.flows[modId]?.[featId];
    const node = flow?.nodes?.find(n => n.id === targetId && !n.isArchived && !n.isSuperseded);
    if (node) {
      node.reqId = sourceId;
    }
  } else if (sourceEntity === 'Requirement' && targetEntity === 'BusinessRule') {
    const req = store.requirements.find(r => r.id === sourceId && !r.isArchived && !r.isSuperseded);
    if (req) {
      if (!Array.isArray(req.ruleIds)) req.ruleIds = [];
      if (!req.ruleIds.includes(targetId)) req.ruleIds.push(targetId);
    }
  } else if (sourceEntity === 'FlowNode' && targetEntity === 'BusinessRule') {
    const modId = moduleId || store.modules[0]?.id;
    const featId = featureId || (store.flows[modId] && Object.keys(store.flows[modId])[0]);
    const flow = store.flows[modId]?.[featId];
    const node = flow?.nodes?.find(n => n.id === sourceId && !n.isArchived && !n.isSuperseded);
    if (node) {
      if (!Array.isArray(node.ruleIds)) node.ruleIds = [];
      if (!node.ruleIds.includes(targetId)) node.ruleIds.push(targetId);
    }
  }

  updateMetadata({ updatedBy: author });
  return { success: true, mapping };
}

export function deleteMapping(mappingId, mappingParams = {}, author = 'Business Analyst') {
  const store = getActiveStore();
  const { sourceEntity, sourceId, targetEntity, targetId, moduleId, featureId } = mappingParams;

  if (sourceEntity === 'Requirement' && targetEntity === 'FlowNode') {
    for (const [modId, features] of Object.entries(store.flows || {})) {
      for (const [featId, flow] of Object.entries(features || {})) {
        for (const node of flow.nodes || []) {
          if (node.id === targetId && node.reqId === sourceId) {
            node.reqId = '';
          }
        }
      }
    }
  } else if (sourceEntity === 'Requirement' && targetEntity === 'BusinessRule') {
    const req = store.requirements.find(r => r.id === sourceId);
    if (req && Array.isArray(req.ruleIds)) {
      req.ruleIds = req.ruleIds.filter(id => id !== targetId);
    }
  } else if (sourceEntity === 'FlowNode' && targetEntity === 'BusinessRule') {
    for (const [modId, features] of Object.entries(store.flows || {})) {
      for (const [featId, flow] of Object.entries(features || {})) {
        for (const node of flow.nodes || []) {
          if (node.id === sourceId && Array.isArray(node.ruleIds)) {
            node.ruleIds = node.ruleIds.filter(id => id !== targetId);
          }
        }
      }
    }
  }

  updateMetadata({ updatedBy: author });
  return { success: true };
}
