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

import { PROCESS_MAPPING_BASELINE } from '../js/data/process-mapping-baseline.js';

const DRAFT_STORAGE_KEY = 'PM_DRAFT_PROJECT_DATA_V2';

// In-Memory Active Data Store
let activeStore = null;
let officialBaselineStore = null;

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
 * Loads the official baseline data from the imported JS module.
 */
export function fetchOfficialSourceData() {
  const data = JSON.parse(JSON.stringify(PROCESS_MAPPING_BASELINE));
  officialBaselineStore = JSON.parse(JSON.stringify(data));
  return data;
}

/**
 * Initializes the project data store and applies Phase 4E + Phase 4F finalizations.
 * @param {boolean} forceOfficial If true, bypasses draft and forces official baseline
 */
export function initProjectDataStore(forceOfficial = false) {
  const official = fetchOfficialSourceData();

  if (!forceOfficial && typeof localStorage !== 'undefined') {
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
  finalizeFlowAndBusinessRuleTraceability(activeStore);
  return activeStore;
}

/**
 * Returns the active project data store.
 */
export function getActiveStore() {
  if (!activeStore) {
    return initProjectDataStore();
  }
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
 * Resets the in-memory store and discards any temporary draft in localStorage.
 */
export function resetDraftToOfficial() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }
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
// PHASE 4E: FINAL TRUE GAP RESOLUTION PLAN & ENGINE
// =============================================================================

export const FINAL_TRUE_GAP_FLOW_PLAN = {
  // 1. 02-penerimaan / terima-kebun-sepupu (6 nodes)
  '02-penerimaan/terima-kebun-sepupu': {
    title: 'Flow Proses - Penerimaan Bibit (Kebun Sepupu - Cross-Estate)',
    nodes: [
      {
        id: 'KSP_01',
        code: 'CR-001',
        type: 'start',
        title: 'Pengurus Kebun Peminta Buat Permintaan',
        summary: 'Pengurus Kebun Peminta mengajukan SPB bibit karet untuk penanaman di kebun.',
        reqId: '',
        role: 'Pengurus Kebun Peminta',
        purpose: 'Memulai permohonan alokasi bibit antar kebun sepupu.',
        input: 'Rencana tanam dan jumlah bibit kebun peminta.',
        process: 'Pengurus mengisi SPB permohonan bibit resmi.',
        validation: 'Kelayakan alokasi kebun sepupu.',
        fallback: 'Revisi SPB.',
        output: 'Dokumen SPB Permintaan Bibit diajukan.',
        relatedRole: 'Asisten Kepala, Asisten Bibitan',
        businessRule: 'BR-RCV-004: Alur cross-estate wajib verifikasi berjenjang.',
        ruleIds: ['BR-GLB-001', 'BR-GLB-002'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'KSP_02',
        code: 'CR-002',
        type: 'process',
        title: 'Asisten Kepala Review & Cek Saldo',
        summary: 'Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur.',
        reqId: '',
        role: 'Asisten Kepala',
        purpose: 'Memverifikasi ketersediaan stok bibit siap salur di kebun pembibitan.',
        input: 'SPB bibit vs saldo bibit nursery.',
        process: 'Pemeriksaan kuota dan umur bibit.',
        validation: 'Stok bibit nursery memenuhi syarat.',
        fallback: 'Koreksi kuota bibit.',
        output: 'Rekomendasi persetujuan alokasi bibit.',
        relatedRole: 'Pengurus, Asisten Bibitan',
        businessRule: 'BR-RCV-004: Verifikasi saldo bibit oleh Askep.',
        ruleIds: ['BR-GLB-002'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'KSP_DEC',
        code: 'CR-003',
        type: 'decision',
        title: 'Stok Bibit Cukup?',
        summary: 'Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan.',
        reqId: '',
        role: 'Asisten Kepala',
        purpose: 'Menentukan kelanjutan distribusi bibit ke kebun peminta.',
        input: 'Hasil audit ketersediaan batch.',
        process: 'Jika cukup -> Setujui; Jika tidak cukup -> Koreksi/Batalkan.',
        validation: 'Stok bibit >= jumlah SPB.',
        fallback: 'Revisi SPB atau batalkan permohonan.',
        output: 'Keputusan alokasi bibit disahkan.',
        relatedRole: 'Pengurus, Asisten Bibitan',
        businessRule: 'BR-RCV-004: Persetujuan pengeluaran bibit antar-kebun.',
        ruleIds: ['BR-GLB-002'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'KSP_03',
        code: 'CR-004',
        type: 'process',
        title: 'Mantri Eksekusi Muat & Kirim Bibit',
        summary: 'Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran bibit.',
        reqId: 'RN-RCV-KSP019',
        role: 'Mantri Bibitan',
        purpose: 'Memuat bibit ke armada angkut dan menerbitkan surat jalan pengiriman.',
        input: 'Dokumen SPB approved dan armada angkut.',
        process: 'Mantri scan QR Batch, menghitung bibit naik truk, dan foto timestamp.',
        validation: 'Fisik bibit sesuai SPB approved.',
        fallback: 'Scan manual jika QR barcode rusak.',
        output: 'Surat jalan terbit dan bibit diberangkatkan.',
        relatedRole: 'Asisten Bibitan, Pengurus Peminta',
        businessRule: 'BR-GLB-001: Foto wajib watermark timestamp ISO & GPS.',
        ruleIds: ['BR-GLB-001', 'BR-GLB-002', 'BR-GLB-003'],
        stockImpact: '- BIBIT PADA BATCH (Setelah Verifikasi)'
      },
      {
        id: 'KSP_04',
        code: 'CR-005',
        type: 'process',
        title: 'Pengurus Peminta Konfirmasi Penerimaan',
        summary: 'Pengurus Kebun Peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan.',
        reqId: '',
        role: 'Pengurus Kebun Peminta',
        purpose: 'Mengonfirmasi penerimaan fisik bibit segar di kebun peminta.',
        input: 'Bibit tiba dan surat jalan kirim.',
        process: 'Pemeriksaan fisik bibit dan konfirmasi sistem penerimaan.',
        validation: 'Bibit diterima hidup dan sehat.',
        fallback: 'Catat bibit rusak di perjalanan.',
        output: 'Berita Acara Serah Terima Bibit selesai.',
        relatedRole: 'Mantri Bibitan, Asisten Bibitan',
        businessRule: 'BR-RCV-004: Konfirmasi penerimaan menutup distribusi.',
        ruleIds: ['BR-GLB-002'],
        stockImpact: 'BIBIT RESMI DITERIMA DI KEBUN PEMINTA'
      },
      {
        id: 'KSP_END',
        code: 'END',
        type: 'end',
        title: 'Penerimaan Bibit Kebun Sepupu Tuntas',
        summary: 'Seluruh tahapan permohonan hingga penerimaan bibit kebun sepupu selesai terverifikasi.',
        reqId: '',
        role: 'Pengurus Kebun Peminta',
        purpose: 'Menuntaskan siklus distribusi bibit cross-estate.',
        input: 'Konfirmasi serah terima selesai.',
        process: 'Status transaksi: Completed.',
        validation: '-',
        fallback: '-',
        output: 'Data mutasi produksi tersinkron penuh.',
        relatedRole: 'Semua Role Terkait',
        businessRule: 'BR-GLB-003: Promosi data transaksi terverifikasi.',
        ruleIds: ['BR-GLB-003'],
        stockImpact: 'SELESAI'
      }
    ]
  },

  // 2. 02-penerimaan / terima-mata-entres (6 nodes)
  '02-penerimaan/terima-mata-entres': {
    title: 'Flow Proses - Penerimaan Mata Entres (Kebun Sepupu - Cross-Estate)',
    nodes: [
      {
        id: 'TME_01',
        code: 'CR-001',
        type: 'start',
        title: 'Pengurus Ajukan SPB Mata Entres',
        summary: 'Pengurus Kebun Peminta mengajukan SPB mata entres karet untuk penanaman di kebun.',
        reqId: '',
        role: 'Pengurus Kebun Peminta',
        purpose: 'Memulai permohonan penyaluran mata entres ke kebun peminta.',
        input: 'Kebutuhan klon dan jumlah mata entres.',
        process: 'Pengurus mengajukan SPB mata entres resmi.',
        validation: 'Kebutuhan klon sesuai rekomendasi teknis.',
        fallback: 'Revisi permohonan klon.',
        output: 'Dokumen SPB Mata Entres diajukan.',
        relatedRole: 'Asisten Kepala, Asisten Bibitan',
        businessRule: 'BR-RCV-004: Pengajuan SPB mata entres cross-estate.',
        ruleIds: ['BR-GLB-001', 'BR-GLB-002', 'BR-OKL-005'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TME_02',
        code: 'CR-002',
        type: 'process',
        title: 'Asisten Kepala Cek Stok Entres',
        summary: 'Asisten Kepala meninjau permintaan mata entres dan memeriksa ketersediaan stok mata entres siap salur.',
        reqId: '',
        role: 'Asisten Kepala',
        purpose: 'Memastikan kecukupan stok mata entres per Plot Entres + Clone.',
        input: 'SPB mata entres vs saldo entres nursery.',
        process: 'Pengecekan saldo stok aktual pada sistem.',
        validation: 'Stok mata entres mencukupi.',
        fallback: 'Koreksi kuota cabang/mata entres.',
        output: 'Rekomendasi persetujuan alokasi entres.',
        relatedRole: 'Pengurus, Asisten Bibitan',
        businessRule: 'BR-OKL-005: Stok mata entres dikelola per Plot + Clone.',
        ruleIds: ['BR-OKL-005', 'BR-GLB-002'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TME_DEC',
        code: 'CR-003',
        type: 'decision',
        title: 'Stok Mata Entres Cukup?',
        summary: 'Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan.',
        reqId: '',
        role: 'Asisten Kepala',
        purpose: 'Memutuskan persetujuan alokasi mata entres.',
        input: 'Hasil audit stok entres per klon.',
        process: 'Jika stok cukup -> Setujui; Jika tidak cukup -> Koreksi kuantitas atau batalkan.',
        validation: 'Saldo mata entres >= jumlah SPB.',
        fallback: 'Revisi jumlah atau batalkan SPB.',
        output: 'Keputusan alokasi mata entres disahkan.',
        relatedRole: 'Pengurus, Asisten Bibitan',
        businessRule: 'BR-RCV-004: Approval pengeluaran mata entres.',
        ruleIds: ['BR-GLB-002', 'BR-OKL-005'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TME_03',
        code: 'CR-004',
        type: 'process',
        title: 'Mantri Eksekusi Packing & Muat Entres',
        summary: 'Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran mata entres.',
        reqId: 'RN-RCV-ME025',
        role: 'Mantri Bibitan',
        purpose: 'Memotong, membungkus kayu entres, dan menerbitkan surat jalan pengeluaran.',
        input: 'SPB approved dan kayu entres siap salur.',
        process: 'Mantri memvalidasi jumlah mata aktual, membungkus kayu entres, dan foto timestamp.',
        validation: 'Jumlah mata aktual sesuai SPB.',
        fallback: 'Hitung ulang mata entres segar.',
        output: 'Kayu entres diberangkatkan dengan surat jalan.',
        relatedRole: 'Asisten Bibitan, Pengurus Peminta',
        businessRule: 'BR-GLB-001: Foto dokumentasi kayu entres dengan timestamp.',
        ruleIds: ['BR-GLB-001', 'BR-GLB-002', 'BR-OKL-006', 'BR-OKL-007'],
        stockImpact: '- MATA ENTRES PADA PLOT (Setelah Verifikasi)'
      },
      {
        id: 'TME_04',
        code: 'CR-005',
        type: 'process',
        title: 'Pengurus Peminta Konfirmasi Entres',
        summary: 'Pengurus Kebun Peminta menerima mata entres di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan.',
        reqId: '',
        role: 'Pengurus Kebun Peminta',
        purpose: 'Mengonfirmasi penerimaan fisik kayu entres segar di kebun peminta.',
        input: 'Kayu entres tiba dan surat jalan kirim.',
        process: 'Pemeriksaan kesegaran mata entres dan konfirmasi penerimaan di sistem.',
        validation: 'Mata entres segar dan layak okulasi.',
        fallback: 'Catat mata entres rusak/kering.',
        output: 'Penerimaan mata entres disahkan.',
        relatedRole: 'Mantri Bibitan, Asisten Bibitan',
        businessRule: 'BR-RCV-004: Konfirmasi penerimaan mata entres kebun sepupu.',
        ruleIds: ['BR-GLB-002'],
        stockImpact: 'MATA ENTRES DITERIMA DI KEBUN PEMINTA'
      },
      {
        id: 'TME_END',
        code: 'END',
        type: 'end',
        title: 'Penerimaan Mata Entres Tuntas',
        summary: 'Seluruh tahapan permohonan hingga penerimaan mata entres kebun sepupu selesai terverifikasi.',
        reqId: '',
        role: 'Pengurus Kebun Peminta',
        purpose: 'Menuntaskan siklus distribusi mata entres antar-kebun.',
        input: 'Konfirmasi penerimaan tuntas.',
        process: 'Status transaksi: Completed.',
        validation: '-',
        fallback: '-',
        output: 'Mutasi stok entres tersinkron penuh.',
        relatedRole: 'Semua Role Terkait',
        businessRule: 'BR-GLB-003: Promosi data ke Server Production.',
        ruleIds: ['BR-GLB-003'],
        stockImpact: 'SELESAI'
      }
    ]
  },

  // 3. 03-penyemaian / transplanting-polybag (8 nodes)
  '03-penyemaian/transplanting-polybag': {
    title: 'Flow Proses - Transplanting ke Polybag (Batch)',
    nodes: [
      {
        id: 'TP_START',
        code: 'START',
        type: 'start',
        title: 'Pilih Dokumen Penerimaan Benih',
        summary: 'Satu dokumen penerimaan benih dapat dialokasikan ke beberapa polybag.',
        reqId: 'RN-SEM-TP028',
        role: 'Mantri Bibitan',
        purpose: 'Memulai proses pemindahan kecambah dari bedengan ke kantong polybag.',
        input: 'Dokumen penerimaan benih dan bedengan perkecambahan.',
        process: 'Mantri memilih dokumen penerimaan benih dan bedengan semaian sumber.',
        validation: 'Benih pada bedengan berumur ±12–15 hari.',
        fallback: 'Pilih bedengan semai lainnya.',
        output: 'Data sumber kecambah terverifikasi.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-SEM-001: Alokasi multi-bedengan/polybag per dokumen.',
        ruleIds: ['BR-SEM-001', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TP_01',
        code: 'P-001',
        type: 'process',
        title: 'Scan QR Plang Polybag Pembibitan',
        summary: 'Memindai QR Code fisik pada plang polybag pembibitan.',
        reqId: 'RN-SEM-TP029',
        role: 'Mantri Bibitan',
        purpose: 'Memastikan identitas lokasi plot/baris polybag yang akan ditanami kecambah.',
        input: 'Plang QR fisik barisan polybag.',
        process: 'Kamera smartphone memindai barcode QR plang polybag.',
        validation: 'Barcode valid dan terdaftar di area nursery aktif.',
        fallback: 'Input manual kode blok polybag.',
        output: 'Plot polybag terkunci untuk pencatatan.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-002: Validasi QR Code objek fisik di lapangan.',
        ruleIds: ['BR-OKL-002', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TP_02',
        code: 'P-002',
        type: 'process',
        title: 'Input Jumlah Transplanting & Afkir',
        summary: 'Mantri menginput jumlah butir benih yang ditransplanting dan jumlah benih afkir/rusak.',
        reqId: 'RN-SEM-TP030',
        role: 'Mantri Bibitan',
        purpose: 'Mencatat realisasi kecambah ditanam vs kecambah mati/cacat.',
        input: 'Jumlah kecambah dicabut dari bedengan.',
        process: 'Mantri menginput jumlah butir transplanting dan butir benih afkir/rusak.',
        validation: 'Jumlah transplanting + afkir <= saldo benih bedengan.',
        fallback: 'Hitung ulang fisik kecambah.',
        output: 'Draft angka mutasi semaian terisi.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-001: Pencatatan operasional mantri bibitan.',
        ruleIds: ['BR-GLB-001'],
        stockImpact: 'DRAFT MUTASI KECAMBAH'
      },
      {
        id: 'TP_03',
        code: 'P-003',
        type: 'process',
        title: 'Foto Bukti Benih Reject + Watermark',
        summary: 'Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS.',
        reqId: 'RN-SEM-TP031',
        role: 'Mantri Bibitan',
        purpose: 'Memberikan bukti visual autentik pembuangan kecambah tidak layak.',
        input: 'Kecambah reject berjejer di lokasi transplanting.',
        process: 'Mengambil foto fisik dengan watermark timestamp ISO dan koordinat GPS.',
        validation: 'Foto jernih dan metadata GPS akurat.',
        fallback: 'Foto ulang dengan pencahayaan cukup.',
        output: 'Bukti dokumentasi tersimpan di berkas.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-001: Mandatory foto dokumentasi + timestamp ISO.',
        ruleIds: ['BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TP_04',
        code: 'P-004',
        type: 'process',
        title: 'Standar 1 Polybag = 2 Benih/Bibit',
        summary: 'Transplanting ke polybag menggunakan rasio 1 Polybag = 2 Benih/Bibit.',
        reqId: 'RN-SEM-TP033',
        role: 'Mantri Bibitan',
        purpose: 'Menegakkan standar agronomi penanaman 2 kecambah per kantong polybag.',
        input: 'Kecambah terpilih dan polybag terisi tanah.',
        process: 'Kecambah ditanam 2 batang per kantong untuk seleksi vigor selanjutnya.',
        validation: 'Rasio tepat 2 butir per polybag.',
        fallback: 'Koreksi penanaman polybag tunggal.',
        output: 'Polybag tertanami sesuai SOP.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-SEM-006: Standar 1 Polybag = 2 Benih/Bibit.',
        ruleIds: ['BR-SEM-006', 'BR-GLB-001'],
        stockImpact: '+ POPULASI POLYBAG'
      },
      {
        id: 'TP_05',
        code: 'P-005',
        type: 'process',
        title: 'Konsolidasi Multi-Bedengan ke 1 Batch',
        summary: 'Satu Batch bibitan dapat dikonsolidasi dari beberapa polybag.',
        reqId: 'RN-SEM-TP034',
        role: 'Mantri Bibitan',
        purpose: 'Membentuk satu kesatuan Batch bibitan dari beberapa bedengan/polybag sejenis.',
        input: 'Polybag tertanam dari klon yang sama.',
        process: 'Sistem menggabungkan alokasi polybag ke dalam nomor Batch terdaftar.',
        validation: 'Semua polybag memiliki klon dan umur tanam seragam.',
        fallback: 'Pisahkan ke nomor Batch berbeda.',
        output: 'Nomor Batch pembibitan terbentuk.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-SEM-007: Konsolidasi Multi-Bedengan ke 1 Batch.',
        ruleIds: ['BR-SEM-007', 'BR-GLB-001'],
        stockImpact: 'TERBENTUK BATCH BARU'
      },
      {
        id: 'TP_06',
        code: 'P-006',
        type: 'process',
        title: 'Verifikasi Asisten Pemindahan Polybag',
        summary: 'Asisten menyetujui pemindahan benih kecambah dari bedengan ke polybag.',
        reqId: 'RN-SEM-TP032',
        role: 'Asisten Bibitan',
        purpose: 'Mengesahkan pemindahan kecambah dan mengunci populasi resmi Batch.',
        input: 'Laporan transplanting Mantri + foto reject.',
        process: 'Asisten memeriksa kesesuaian fisik dan menyetujui di aplikasi portal.',
        validation: 'Realisasi tanam dan afkir logis.',
        fallback: 'Kembalikan berkas untuk revisi Mantri.',
        output: 'Transaksi transplanting disetujui.',
        relatedRole: 'Mantri Bibitan',
        businessRule: 'BR-GLB-002: Kewajiban verifikasi Asisten Bibitan.',
        ruleIds: ['BR-GLB-002', 'BR-GLB-003'],
        stockImpact: '+ SALDO RESMI BATCH'
      },
      {
        id: 'TP_END',
        code: 'END',
        type: 'end',
        title: 'Batch Polybag Siap Dipelihara',
        summary: 'Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi.',
        reqId: 'RN-SEM-TP035',
        role: 'Mantri Bibitan',
        purpose: 'Menuntaskan fase transplanting ke polybag.',
        input: 'Batch terverifikasi aktif.',
        process: 'Batch masuk ke jadwal pemeliharaan harian (penyiraman, pemupukan).',
        validation: '-',
        fallback: '-',
        output: 'Batch terdaftar untuk siklus okulasi mendatang.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-003: Promosi ke Server Production.',
        ruleIds: ['BR-GLB-003'],
        stockImpact: 'BATCH SIAP PEMELIHARAAN'
      }
    ]
  },

  // 4. 05-pemeriksaan / periksa-regrafting (11 nodes)
  '05-pemeriksaan/periksa-regrafting': {
    title: 'Flow Proses - Pemeriksaan Hasil Regrafting',
    nodes: [
      {
        id: 'CHKR_START',
        code: 'START',
        type: 'start',
        title: 'Buka Pemeriksaan Regrafting Bertahap',
        summary: 'Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap.',
        reqId: 'RN-CHK-RG036',
        role: 'Mantri Bibitan',
        purpose: 'Memulai sesi pemeriksaan fisik ikatan okulasi janda (regrafting).',
        input: 'Daftar dokumen regrafting aktif.',
        process: 'Mantri membuka modul pemeriksaan dan memilih berkas regrafting.',
        validation: 'Umur tempelan regrafting mencapai batas buka perban (±21 hari).',
        fallback: 'Tunda pemeriksaan sampai umur cukup.',
        output: 'Sesi pemeriksaan regrafting dibuka.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-008: Regrafting berulang tanpa batas tunggal.',
        ruleIds: ['BR-OKL-008', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'CHKR_01',
        code: 'P-001',
        type: 'process',
        title: 'Pilih Dokumen Okulasi Regrafting',
        summary: 'Memilih dokumen transaksi regrafting yang akan diperiksa hasilnya.',
        reqId: 'RN-CHK-RG036',
        role: 'Mantri Bibitan',
        purpose: 'Menentukan referensi transaksi regrafting sumber.',
        input: 'Daftar SPB/Nomor Regrafting.',
        process: 'Mantri memilih dokumen regrafting yang sesuai di lapangan.',
        validation: 'Dokumen berstatus Terverifikasi/In-Inspection.',
        fallback: 'Pilih dokumen lain.',
        output: 'Dokumen regrafting terpilih.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-008: Penelusuran riwayat okulasi berulang.',
        ruleIds: ['BR-OKL-008'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'CHKR_02',
        code: 'P-002',
        type: 'process',
        title: 'Scan QR Batch Bibit Regrafting',
        summary: 'Validasi fisik QR Code Batch yang diperiksa.',
        reqId: 'RN-CHK-RG038',
        role: 'Mantri Bibitan',
        purpose: 'Memastikan kecocokan fisik batch bibit yang sedang diperiksa.',
        input: 'QR Code pada plang batch regrafting.',
        process: 'Kamera memindai QR plang batch regrafting.',
        validation: 'Batch cocok dengan dokumen regrafting terpilih.',
        fallback: 'Input kode batch manual.',
        output: 'Batch bibit regrafting terkonfirmasi.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-002: Validasi QR Code objek fisik.',
        ruleIds: ['BR-OKL-002', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'CHKR_03',
        code: 'P-003',
        type: 'process',
        title: 'Input Jumlah Batang Diperiksa Bertahap',
        summary: 'Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000).',
        reqId: 'RN-CHK-RG039',
        role: 'Mantri Bibitan',
        purpose: 'Mencatat kuantitas pemeriksaan parsial/penuh sesi hari ini.',
        input: 'Batang yang dibuka perbannya hari ini.',
        process: 'Mantri memasukkan angka batang yang diperiksa.',
        validation: 'Jumlah diperiksa <= sisa populasi batch yang belum diperiksa.',
        fallback: 'Koreksi angka batang.',
        output: 'Jumlah sampel pemeriksaan sesi aktif tercatat.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-001: Pencatatan bertahap pemeriksaan.',
        ruleIds: ['BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'CHKR_DEC1',
        code: 'DEC-01',
        type: 'decision',
        title: 'Kuantitas Pemeriksaan Valid?',
        summary: 'Validasi apakah jumlah batang yang diperiksa sesuai dengan sisa alur.',
        reqId: 'RN-CHK-RG039',
        role: 'Mantri Bibitan',
        purpose: 'Memvalidasi batas input kuantitas pemeriksaan.',
        input: 'Angka batang vs sisa belum diperiksa.',
        process: 'Sistem mengevaluasi kecukupan sisa.',
        validation: 'Input valid dan logis.',
        fallback: 'Ulangi input jumlah batang.',
        output: 'Arah alur pemeriksaan dilanjutkan.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-001: Validasi batas transaksi.',
        ruleIds: ['BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'CHKR_04',
        code: 'P-004',
        type: 'process',
        title: 'Catat Mata Hijau (Berhasil) vs Mati (Gagal)',
        summary: 'Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal).',
        reqId: 'RN-CHK-RG040',
        role: 'Mantri Bibitan',
        purpose: 'Mengklasifikasikan hasil penempelan mata regrafting.',
        input: 'Kondisi visual mata tempelan pada batang.',
        process: 'Mantri menginput jumlah mata hijau (hidup) dan mata hitam (mati).',
        validation: 'Jumlah hijau + hitam === total batang diperiksa sesi ini.',
        fallback: 'Hitung ulang fisik batang.',
        output: 'Data keberhasilan regrafting terisi.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-008: Identifikasi bibit gagal regrafting.',
        ruleIds: ['BR-OKL-008', 'BR-GLB-001'],
        stockImpact: 'DRAFT POPULASI REGRAFTING'
      },
      {
        id: 'CHKR_DEC2',
        code: 'DEC-02',
        type: 'decision',
        title: 'Keputusan Bibit Gagal: Regrafting atau Reject?',
        summary: 'Bibit gagal dapat ditentukan untuk Regrafting kembali atau Reject.',
        reqId: 'RN-CHK-RG037',
        role: 'Mantri Bibitan',
        purpose: 'Menentukan nasib bibit yang mata tempelannya mati pada pemeriksaan regrafting.',
        input: 'Kondisi kesehatan batang bawah dan jumlah regrafting sebelumnya.',
        process: 'Jika batang masih sehat -> Regrafting Ulang; Jika batang rusak/lemah -> Reject.',
        validation: 'Keputusan agronomi Mantri sesuai kondisi fisik batang.',
        fallback: 'Konsultasi dengan Asisten Bibitan.',
        output: 'Arah tindak lanjut bibit gagal ditentukan.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-008: Regrafting berulang tanpa batas tunggal.',
        ruleIds: ['BR-OKL-008'],
        stockImpact: 'ALOKASI REGRAFTING / REJECT'
      },
      {
        id: 'CHKR_05',
        code: 'P-005',
        type: 'process',
        title: 'Tindak Lanjut Alokasi Bibit Gagal',
        summary: 'Mantri menentukan tindak lanjut bibit yang gagal: Regrafting kembali atau Reject.',
        reqId: 'RN-CHK-RG041',
        role: 'Mantri Bibitan',
        purpose: 'Mendaftarkan bibit gagal ke antrean regrafting ulang atau penyeleksian afkir.',
        input: 'Keputusan keputusan DEC-02.',
        process: 'Sistem menandai bibit ke antrean siklus regrafting berikutnya atau afkir.',
        validation: 'Kategori tindak lanjut terekam jelas.',
        fallback: 'Koreksi alokasi.',
        output: 'Alokasi bibit gagal tersimpan di berkas.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-008: Siklus regrafting berulang.',
        ruleIds: ['BR-OKL-008', 'BR-GLB-001'],
        stockImpact: 'MUTASI STATUS BIBIT'
      },
      {
        id: 'CHKR_06',
        code: 'P-006',
        type: 'process',
        title: 'Foto Bukti Mata Hijau & Mati + Timestamp',
        summary: 'Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark.',
        reqId: 'RN-CHK-RG042',
        role: 'Mantri Bibitan',
        purpose: 'Menyediakan bukti otentik kondisi mata tempelan regrafting.',
        input: 'Mata tempelan hijau dan hitam berdampingan.',
        process: 'Pengambilan foto dokumentasi dengan timestamp ISO dan geolokasi GPS.',
        validation: 'Foto fokus pada mata tempelan dan watermark terbaca.',
        fallback: 'Foto ulang dengan pencahayaan jelas.',
        output: 'Dokumentasi foto terlampir pada berkas.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-001: Mandatory foto dokumentasi + timestamp.',
        ruleIds: ['BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'CHKR_07',
        code: 'P-007',
        type: 'process',
        title: 'Kirim Hasil & Verifikasi Asisten Bibitan',
        summary: 'Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui.',
        reqId: 'RN-CHK-RG043',
        role: 'Asisten Bibitan',
        purpose: 'Mengesahkan hasil pemeriksaan regrafting dan memutasi status bibit.',
        input: 'Berkas pemeriksaan Mantri dan foto bukti.',
        process: 'Asisten Bibitan memverifikasi ke lapangan dan menekan tombol Approve.',
        validation: 'Data persen keberhasilan wajar dan foto valid.',
        fallback: 'Minta Mantri memeriksa ulang.',
        output: 'Hasil pemeriksaan regrafting resmi disetujui.',
        relatedRole: 'Mantri Bibitan',
        businessRule: 'BR-GLB-002: Kewajiban verifikasi Asisten Bibitan.',
        ruleIds: ['BR-GLB-002', 'BR-GLB-003'],
        stockImpact: 'STATUS RESMI DIPERBARUI'
      },
      {
        id: 'CHKR_END',
        code: 'END',
        type: 'end',
        title: 'Pemeriksaan Regrafting Tuntas',
        summary: 'Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap di-Regrafting kembali atau di-Reject.',
        reqId: 'RN-CHK-RG044',
        role: 'Mantri Bibitan',
        purpose: 'Menuntaskan sesi pemeriksaan regrafting.',
        input: 'Transaksi disetujui Asisten.',
        process: 'Bibit berhasil lanjut ke pemotongan batang atas, bibit gagal diarahkan sesuai keputusan.',
        validation: '-',
        fallback: '-',
        output: 'Populasi bibit regrafting terupdate resmi.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-003: Promosi ke Server Production.',
        ruleIds: ['BR-GLB-003'],
        stockImpact: 'TERVERIFIKASI'
      }
    ]
  },

  // 5. 07-kebun-entres / entres-topping (7 nodes)
  '07-kebun-entres/entres-topping': {
    title: 'Flow Proses - Pemeliharaan Topping Plot Entres',
    nodes: [
      {
        id: 'TOP_START',
        code: 'START',
        type: 'start',
        title: 'Buka Aktivitas Topping Plot Entres',
        summary: 'Aktivitas topping menghitung rasio Perisai/Kayu dan Perisai/Meter.',
        reqId: 'RN-ENT-TOP045',
        role: 'Mantri Bibitan',
        purpose: 'Memulai pencatatan pemeliharaan pemotongan pucuk (topping) pada tanaman induk entres.',
        input: 'Jadwal pemeliharaan kebun entres.',
        process: 'Mantri membuka menu topping kebun entres di aplikasi.',
        validation: 'Plot entres dalam masa vegetatif produktif.',
        fallback: 'Pilih plot entres lainnya.',
        output: 'Sesi topping plot entres aktif.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-001: Pencatatan aktivitas kebun entres.',
        ruleIds: ['BR-GLB-001', 'BR-OKL-005'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TOP_01',
        code: 'P-001',
        type: 'process',
        title: 'Scan QR Plang Fisik Plot Entres',
        summary: 'Validasi QR Code plang fisik plot entres yang dirawat.',
        reqId: 'RN-ENT-TOP046',
        role: 'Mantri Bibitan',
        purpose: 'Mengunci identitas plot entres yang sedang ditopping.',
        input: 'QR Code pada plang plot entres.',
        process: 'Kamera memindai barcode QR plot entres.',
        validation: 'Plot terdaftar aktif di master data nursery.',
        fallback: 'Input manual nomor plot entres.',
        output: 'Plot entres berhasil divalidasi.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-002: Validasi QR Code objek fisik.',
        ruleIds: ['BR-OKL-002', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TOP_02',
        code: 'P-002',
        type: 'process',
        title: 'Tampilkan Data Clone & Jumlah Pokok',
        summary: 'Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot.',
        reqId: 'RN-ENT-TOP047',
        role: 'Mantri Bibitan',
        purpose: 'Menyajikan informasi klon murni dan populasi pokok tanaman induk.',
        input: 'Data master plot entres.',
        process: 'Sistem menampilkan nama clone, tahun tanam, dan jumlah pokok aktif.',
        validation: 'Data klon sesuai dengan plang fisik lapangan.',
        fallback: 'Laporkan ketidaksesuaian master data plot.',
        output: 'Informasi plot terverifikasi oleh Mantri.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-005: Identitas stok mata entres per Plot + Clone.',
        ruleIds: ['BR-OKL-005'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TOP_03',
        code: 'P-003',
        type: 'process',
        title: 'Input Variabel Topping (Kayu, Meter, Perisai)',
        summary: 'Mantri menginput Tanggal, Jumlah Kayu Okulasi, Total Panjang Meter, dan Jumlah Perisai.',
        reqId: 'RN-ENT-TOP048',
        role: 'Mantri Bibitan',
        purpose: 'Mencatat parameter hasil pemangkasan pucuk pohon induk.',
        input: 'Hasil pengukuran fisik kayu entres setelah topping.',
        process: 'Mantri menginput tanggal kerja, jumlah kayu, total meter, dan estimasi perisai mata.',
        validation: 'Angka input > 0 dan rasio masuk akal.',
        fallback: 'Ukur ulang kayu okulasi.',
        output: 'Variabel topping tersimpan.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-006: Status estimasi vs kalkulasi aktual.',
        ruleIds: ['BR-OKL-006', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'TOP_04',
        code: 'P-004',
        type: 'process',
        title: 'Kalkulasi Otomatis Rasio Perisai',
        summary: 'Sistem menghitung Rata-rata Perisai/Kayu dan Rata-rata Perisai/Meter.',
        reqId: 'RN-ENT-TOP049',
        role: 'Mantri Bibitan',
        purpose: 'Menghasilkan metrik produktivitas tunas tanaman induk secara otomatis.',
        input: 'Variabel kayu, meter, dan perisai dari langkah P-003.',
        process: 'Sistem menghitung: Perisai/Kayu = Perisai / Kayu; Perisai/Meter = Perisai / Meter.',
        validation: 'Rasio dalam batas standar mutu klon karet.',
        fallback: 'Periksa kembali input angka pada P-003.',
        output: 'Rasio produktivitas entres terhitung.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-OKL-006: Kalkulasi estimasi produktivitas entres.',
        ruleIds: ['BR-OKL-006'],
        stockImpact: 'ESTIMASI PRODUKTIVITAS ENTRES'
      },
      {
        id: 'TOP_05',
        code: 'P-005',
        type: 'process',
        title: 'Foto Plot Ditopping & Verifikasi Asisten',
        summary: 'Foto dokumentasi plot setelah ditopping beserta timestamp, diteruskan ke Asisten Bibitan.',
        reqId: 'RN-ENT-TOP050',
        role: 'Asisten Bibitan',
        purpose: 'Mendokumentasikan hasil pangkasan dan mengesahkan transaksi pemeliharaan.',
        input: 'Foto fisik pohon induk pasca-topping dengan watermark ISO + GPS.',
        process: 'Mantri upload foto, Asisten Bibitan memeriksa dan menyetujui di portal.',
        validation: 'Foto memperlihatkan tajuk tanaman yang rapi pasca-topping.',
        fallback: 'Foto ulang atau perbaiki pemangkasan.',
        output: 'Pemeliharaan topping disetujui Asisten.',
        relatedRole: 'Mantri Bibitan',
        businessRule: 'BR-GLB-001 & BR-GLB-002: Mandatory foto & verifikasi asisten.',
        ruleIds: ['BR-GLB-001', 'BR-GLB-002', 'BR-GLB-003'],
        stockImpact: 'REKAM PEMELIHARAAN SAH'
      },
      {
        id: 'TOP_END',
        code: 'END',
        type: 'end',
        title: 'Plot Entres Terawat Optimal',
        summary: 'Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas.',
        reqId: 'RN-ENT-TOP051',
        role: 'Mantri Bibitan',
        purpose: 'Menuntaskan pemeliharaan topping plot entres.',
        input: 'Verifikasi selesai.',
        process: 'Status pemeliharaan plot terupdate aktif.',
        validation: '-',
        fallback: '-',
        output: 'Plot entres siap dipanen pada periode selanjutnya.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-GLB-003: Promosi ke Server Production.',
        ruleIds: ['BR-GLB-003'],
        stockImpact: 'PLOT ENTRES OPTIMAL'
      }
    ]
  },

  // 6. 09-material-bahan / material-gudang-matching (7 nodes)
  '09-material-bahan/material-gudang-matching': {
    title: 'Flow Proses - Rekonsiliasi Dokumen Gudang Material Matching',
    nodes: [
      {
        id: 'MMG_START',
        code: 'START',
        type: 'start',
        title: 'Buka Rekonsiliasi Dokumen Gudang',
        summary: 'Dokumen gudang material wajib matching 1 Heading Kerja pemeliharaan.',
        reqId: 'RN-MAT-MMG052',
        role: 'Mantri Bibitan',
        purpose: 'Memulai proses pencocokan dokumen pengeluaran material gudang ke rekam kerja.',
        input: 'Buku rekam pemeliharaan dan pengeluaran gudang.',
        process: 'Mantri membuka menu rekonsiliasi material gudang.',
        validation: 'Sesi aktif dan terhubung ke database material.',
        fallback: 'Refresh modul material.',
        output: 'Sesi rekonsiliasi material aktif.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-MAT-001: Integritas 1 Dokumen Gudang = 1 Heading Kerja.',
        ruleIds: ['BR-MAT-001', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'MMG_01',
        code: 'P-001',
        type: 'process',
        title: 'Pilih Rentang Waktu & Jenis Material',
        summary: 'Memilih rentang waktu dan jenis material gudang untuk ditinjau rekonsiliasinya.',
        reqId: 'RN-MAT-MMG053',
        role: 'Mantri Bibitan',
        purpose: 'Memfilter transaksi material yang perlu direkonsiliasi.',
        input: 'Filter tanggal (bulan/minggu) dan jenis material (pupuk, pestisida, plastik).',
        process: 'Mantri menentukan filter pencarian dokumen gudang.',
        validation: 'Rentang tanggal valid.',
        fallback: 'Sesuaikan rentang tanggal.',
        output: 'Daftar dokumen gudang yang belum direkonsiliasi tampil.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-MAT-001: Penelusuran dokumen material gudang.',
        ruleIds: ['BR-MAT-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'MMG_02',
        code: 'P-002',
        type: 'process',
        title: 'Tarik Dokumen Pengeluaran Gudang (BKB/SPB)',
        summary: 'Menarik dokumen pengeluaran gudang untuk pupuk, pestisida, dan plastik okulasi.',
        reqId: 'RN-MAT-MMG055',
        role: 'Mantri Bibitan',
        purpose: 'Mengunduh nomor referensi BKB/SPB material dari gudang sentral.',
        input: 'Nomor BKB/SPB dari staf gudang.',
        process: 'Mantri memilih dokumen BKB/SPB yang ingin dipasangkan dengan pekerjaan nursery.',
        validation: 'Dokumen berstatus Released dari gudang.',
        fallback: 'Konfirmasi staf gudang jika dokumen belum keluar.',
        output: 'Dokumen pengeluaran gudang terpilih.',
        relatedRole: 'Asisten Bibitan, Petugas Gudang',
        businessRule: 'BR-MAT-001: Penarikan dokumen gudang resmi.',
        ruleIds: ['BR-MAT-001', 'BR-GLB-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'MMG_03',
        code: 'P-003',
        type: 'process',
        title: 'Validasi Heading Kerja Pemeliharaan',
        summary: 'Validasi/pencocokan dokumen pengeluaran gudang (BKB/SPB sesuai dokumen yang berlaku) terhadap realisasi pemeliharaan berdasarkan Heading Kerja.',
        reqId: 'RN-MAT-MMG054',
        role: 'Mantri Bibitan',
        purpose: 'Mencocokkan jenis pekerjaan di lapangan dengan peruntukan material di BKB.',
        input: 'Nomor Heading Kerja pada rekam pemeliharaan.',
        process: 'Mantri memilih Heading Kerja pemeliharaan yang relevan (misal Pemupukan Batch A).',
        validation: 'Heading Kerja berstatus aktif dan sesuai tanggal aplikasi.',
        fallback: 'Pilih Heading Kerja yang tepat.',
        output: 'Pasangan Dokumen BKB vs Heading Kerja terdefinisi.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-MAT-001: 1 Dokumen Gudang wajib matching 1 Heading Kerja.',
        ruleIds: ['BR-MAT-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'MMG_04',
        code: 'P-004',
        type: 'decision',
        title: 'Verifikasi Sistem: Matching Heading Kerja?',
        summary: 'Sistem memverifikasi kecocokan Heading Kerja dokumen gudang dengan rekam pemeliharaan.',
        reqId: 'RN-MAT-MMG056',
        role: 'Sistem',
        purpose: 'Menjalankan validasi otomatis integritas alokasi material.',
        input: 'Kode material BKB vs jenis pekerjaan Heading Kerja.',
        process: 'Sistem memvalidasi kecocokan kode akun pemeliharaan: Jika cocok -> Sukses; Jika beda -> Tolak.',
        validation: 'Kesesuaian 100% antara jenis material dan heading kerja.',
        fallback: 'Munculkan peringatan mismatch dokumen.',
        output: 'Status kecocokan dokumen terverifikasi sistem.',
        relatedRole: 'Mantri Bibitan',
        businessRule: 'BR-MAT-001: Integritas sistem penolakan mismatch material.',
        ruleIds: ['BR-MAT-001'],
        stockImpact: 'NO STOCK CHANGE'
      },
      {
        id: 'MMG_05',
        code: 'P-005',
        type: 'process',
        title: 'Lekatkan Dokumen Gudang ke Rekam Kerja',
        summary: 'Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan.',
        reqId: 'RN-MAT-MMG057',
        role: 'Mantri Bibitan',
        purpose: 'Mengunci pengikatan dokumen gudang ke rekam pemeliharaan secara permanen.',
        input: 'Validasi sistem berhasil.',
        process: 'Dokumen BKB resmi dilekatkan pada berkas rekam pemeliharaan dan dikirim ke Asisten.',
        validation: 'Tautan relasi database tersimpan utuh.',
        fallback: 'Simpan ulang dokumen.',
        output: 'Dokumen material melekat pada rekam kerja.',
        relatedRole: 'Asisten Bibitan',
        businessRule: 'BR-MAT-001 & BR-GLB-002: Pengikatan dokumen & verifikasi asisten.',
        ruleIds: ['BR-MAT-001', 'BR-GLB-002'],
        stockImpact: 'MATERIAL TERALOKASI RESMI'
      },
      {
        id: 'MMG_END',
        code: 'END',
        type: 'end',
        title: 'Material & Mutasi Stok Sah Terakuntasi',
        summary: 'Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan.',
        reqId: 'RN-MAT-MMG058',
        role: 'Mantri Bibitan',
        purpose: 'Menuntaskan rekonsiliasi pemakaian material nursery.',
        input: 'Pengikatan sukses dan diverifikasi.',
        process: 'Status transaksi: Reconciled & Closed.',
        validation: '-',
        fallback: '-',
        output: 'Saldo material nursery akuntabel dan sinkron.',
        relatedRole: 'Asisten Bibitan, Auditor',
        businessRule: 'BR-GLB-003: Promosi data audit ke Server Production.',
        ruleIds: ['BR-GLB-003'],
        stockImpact: 'MUTASI MATERIAL SELESAI'
      }
    ]
  }
};

/**
 * Applies the Final True Gap Resolution Plan to the store.
 * Resolves all 33 True Gaps and ensures 167 active flow nodes across 21 features.
 * @param {Object} store 
 * @returns {Object} Updated store
 */
export function applyTrueGapResolutionPlan(store = activeStore) {
  if (!store) store = getActiveStore();
  if (!store.flows) store.flows = {};

  for (const [key, plan] of Object.entries(FINAL_TRUE_GAP_FLOW_PLAN)) {
    const [modId, featId] = key.split('/');
    if (!store.flows[modId]) store.flows[modId] = {};
    
    // Merge or initialize flow
    const existingFlow = store.flows[modId][featId] || {};
    const nodes = plan.nodes.map(n => ({
      ...n,
      version: 1,
      status: 'Confirmed',
      isArchived: false,
      isSuperseded: false,
      revisionOf: null,
      createdAt: new Date().toISOString()
    }));

    store.flows[modId][featId] = {
      ...existingFlow,
      title: plan.title,
      nodes,
      edges: existingFlow.edges || []
    };
  }

  updateMetadata({ updatedBy: 'Business Analyst' });
  return store;
}

// =============================================================================
// PHASE 4F: FLOW EDGE FINALIZATION & CROSS-FLOW EDGES ENGINE
// =============================================================================

/**
 * Returns the 4 Canonical Cross-Flow Edges in Sigma Nursery pipeline.
 * @returns {Array<Object>}
 */
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
      toNode: 'SM_START',
      label: 'Distribusi Benih ke Bedengan',
      condition: 'Benih Terverifikasi',
      description: 'Benih terverifikasi dari penerimaan masuk ke fase penyemaian bedengan perkecambahan.'
    },
    {
      id: 'CFE-02',
      name: 'Transplanting Polybag → Okulasi Grafting',
      fromModule: '03-penyemaian',
      fromFeature: 'transplanting-polybag',
      fromNode: 'TP_END',
      toModule: '04-okulasi',
      toFeature: 'grafting',
      toNode: 'N_START',
      label: 'Batch Bibit Siap Okulasi',
      condition: 'Batch Terkonsolidasi',
      description: 'Bibit polybag yang terkonsolidasi masuk ke siklus penempelan mata entres.'
    },
    {
      id: 'CFE-03',
      name: 'Panen Mata Entres → Okulasi Grafting',
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
    }
  ];
}

/**
 * Builds all canonical intra-feature flow edges for the 21 features (exactly 187 active edges).
 * @param {Object} store 
 * @returns {Object} Updated store
 */
export function finalizeFlowEdges(store = activeStore) {
  if (!store) store = getActiveStore();
  if (!store.flows) store.flows = {};

  const createEdge = (id, from, to, condition = '', label = '', desc = '') => ({
    id,
    from,
    to,
    condition: condition || label || '',
    label: label || condition || '',
    description: desc || '',
    status: 'Confirmed',
    version: 1,
    isArchived: false,
    isSuperseded: false,
    revisionOf: null,
    createdAt: new Date().toISOString()
  });

  // 1. 01-presensi / presensi-supervisor (8 edges)
  if (store.flows['01-presensi']?.['presensi-supervisor']) {
    store.flows['01-presensi']['presensi-supervisor'].edges = [
      createEdge('E_PS_01', 'PR_START', 'PR_01', '', 'Mulai Presensi'),
      createEdge('E_PS_02', 'PR_01', 'PR_02', '', 'Deteksi Face ID'),
      createEdge('E_PS_03', 'PR_02', 'PR_03', 'Valid (Sukses)', 'Face ID Valid'),
      createEdge('E_PS_04', 'PR_02', 'PR_FB', 'Gagal (Fallback)', 'Fallback Foto Manual'),
      createEdge('E_PS_05', 'PR_FB', 'PR_03', '', 'Lanjut Submit Foto'),
      createEdge('E_PS_06', 'PR_03', 'PR_04', '', 'Kirim ke Asisten'),
      createEdge('E_PS_07', 'PR_04', 'PR_END', 'Disetujui', 'Verifikasi Sukses'),
      createEdge('E_PS_08', 'PR_04', 'PR_01', 'Ditolak / Revisi', 'Revisi Presensi')
    ];
  }

  // 2. 01-presensi / presensi-pekerja (5 edges)
  if (store.flows['01-presensi']?.['presensi-pekerja']) {
    store.flows['01-presensi']['presensi-pekerja'].edges = [
      createEdge('E_PP_01', 'PW_START', 'PW_01', '', 'Buka Daftar Pekerja'),
      createEdge('E_PP_02', 'PW_01', 'PW_02', '', 'Centang Kehadiran'),
      createEdge('E_PP_03', 'PW_02', 'PW_03', '', 'Kirim Absensi'),
      createEdge('E_PP_04', 'PW_03', 'PW_END', 'Disetujui', 'Presensi Selesai'),
      createEdge('E_PP_05', 'PW_02', 'PW_01', 'Koreksi Data', 'Koreksi Daftar')
    ];
  }

  // 3. 02-penerimaan / terima-benih (6 edges)
  if (store.flows['02-penerimaan']?.['terima-benih']) {
    store.flows['02-penerimaan']['terima-benih'].edges = [
      createEdge('E_TB_01', 'TB_01', 'TB_02', '', 'Pilih Dokumen Gudang'),
      createEdge('E_TB_02', 'TB_02', 'TB_03', '', 'Input Jumlah Diterima'),
      createEdge('E_TB_03', 'TB_03', 'TB_04', '', 'Foto Fisik + Timestamp'),
      createEdge('E_TB_04', 'TB_04', 'TB_05', '', 'Kirim Verifikasi Asisten'),
      createEdge('E_TB_05', 'TB_05', 'TB_END', 'Disetujui', 'Benih Resmi Masuk'),
      createEdge('E_TB_06', 'TB_03', 'TB_02', 'Koreksi Jumlah', 'Hitung Ulang')
    ];
  }

  // 4. 02-penerimaan / terima-kebun-sendiri (7 edges)
  if (store.flows['02-penerimaan']?.['terima-kebun-sendiri']) {
    store.flows['02-penerimaan']['terima-kebun-sendiri'].edges = [
      createEdge('E_KS_01', 'KS_01', 'KS_02', '', 'Asisten Divisi Ajukan SPB'),
      createEdge('E_KS_02', 'KS_02', 'KS_DEC', '', 'Askep Cek Stok'),
      createEdge('E_KS_03', 'KS_DEC', 'KS_03', 'Stok Cukup', 'Askep Approve'),
      createEdge('E_KS_04', 'KS_DEC', 'KS_01', 'Stok Tidak Cukup', 'Koreksi SPB'),
      createEdge('E_KS_05', 'KS_03', 'KS_04', '', 'Mantri Muat & Kirim Bibit'),
      createEdge('E_KS_06', 'KS_04', 'KS_END', 'Diterima Lengkap', 'Konfirmasi Penerimaan'),
      createEdge('E_KS_07', 'KS_04', 'KS_03', 'Koreksi Fisik', 'Catat Bibit Rusak')
    ];
  }

  // 5. 02-penerimaan / terima-kebun-sepupu (7 edges)
  if (store.flows['02-penerimaan']?.['terima-kebun-sepupu']) {
    store.flows['02-penerimaan']['terima-kebun-sepupu'].edges = [
      createEdge('E_KSP_01', 'KSP_01', 'KSP_02', '', 'Pengurus Ajukan SPB'),
      createEdge('E_KSP_02', 'KSP_02', 'KSP_DEC', '', 'Askep Audit Saldo'),
      createEdge('E_KSP_03', 'KSP_DEC', 'KSP_03', 'Stok Cukup', 'Askep Setujui'),
      createEdge('E_KSP_04', 'KSP_DEC', 'KSP_01', 'Stok Kurang', 'Koreksi Kuota SPB'),
      createEdge('E_KSP_05', 'KSP_03', 'KSP_04', '', 'Mantri Muat Bibit'),
      createEdge('E_KSP_06', 'KSP_04', 'KSP_END', 'Diterima Baik', 'Konfirmasi Selesai'),
      createEdge('E_KSP_07', 'KSP_04', 'KSP_03', 'Klaim Rusak', 'Koreksi Pengiriman')
    ];
  }

  // 6. 02-penerimaan / terima-mata-entres (7 edges)
  if (store.flows['02-penerimaan']?.['terima-mata-entres']) {
    store.flows['02-penerimaan']['terima-mata-entres'].edges = [
      createEdge('E_TME_01', 'TME_01', 'TME_02', '', 'Pengurus Ajukan SPB Entres'),
      createEdge('E_TME_02', 'TME_02', 'TME_DEC', '', 'Askep Cek Stok Klon'),
      createEdge('E_TME_03', 'TME_DEC', 'TME_03', 'Stok Cukup', 'Askep Approve'),
      createEdge('E_TME_04', 'TME_DEC', 'TME_01', 'Stok Kurang', 'Revisi Permohonan Klon'),
      createEdge('E_TME_05', 'TME_03', 'TME_04', '', 'Mantri Packing & Kirim'),
      createEdge('E_TME_06', 'TME_04', 'TME_END', 'Entres Segar', 'Penerimaan Disahkan'),
      createEdge('E_TME_07', 'TME_04', 'TME_03', 'Klaim Kering', 'Koreksi Kayu Entres')
    ];
  }

  // 7. 03-penyemaian / semai-bedengan (8 edges)
  if (store.flows['03-penyemaian']?.['semai-bedengan']) {
    store.flows['03-penyemaian']['semai-bedengan'].edges = [
      createEdge('E_SM_01', 'SM_START', 'SM_01', '', 'Pilih Dokumen Benih'),
      createEdge('E_SM_02', 'SM_01', 'SM_02', '', 'Scan QR Bedengan'),
      createEdge('E_SM_03', 'SM_02', 'SM_03', '', 'Input Jumlah Semai & Reject'),
      createEdge('E_SM_04', 'SM_03', 'SM_04', '', 'Foto Bukti Benih Afkir'),
      createEdge('E_SM_05', 'SM_04', 'SM_05', 'Disetujui', 'Pemeliharaan ±12–15 Hari'),
      createEdge('E_SM_06', 'SM_05', 'SM_06', '', 'Transplanting Polybag'),
      createEdge('E_SM_07', 'SM_06', 'SM_END', '', 'Konsolidasi Batch Bibit'),
      createEdge('E_SM_08', 'SM_03', 'SM_02', 'Koreksi Afkir', 'Hitung Ulang Benih')
    ];
  }

  // 8. 03-penyemaian / transplanting-polybag (8 edges)
  if (store.flows['03-penyemaian']?.['transplanting-polybag']) {
    store.flows['03-penyemaian']['transplanting-polybag'].edges = [
      createEdge('E_TP_01', 'TP_START', 'TP_01', '', 'Pilih Dokumen Semai'),
      createEdge('E_TP_02', 'TP_01', 'TP_02', '', 'Scan QR Plang Polybag'),
      createEdge('E_TP_03', 'TP_02', 'TP_03', '', 'Input Jumlah & Afkir'),
      createEdge('E_TP_04', 'TP_03', 'TP_04', '', 'Foto Dokumentasi Reject'),
      createEdge('E_TP_05', 'TP_04', 'TP_05', '', 'Tanam 1 Polybag = 2 Benih'),
      createEdge('E_TP_06', 'TP_05', 'TP_06', '', 'Konsolidasi ke 1 Batch'),
      createEdge('E_TP_07', 'TP_06', 'TP_END', 'Disetujui', 'Batch Terdaftar Resmi'),
      createEdge('E_TP_08', 'TP_03', 'TP_02', 'Koreksi Afkir', 'Hitung Ulang Kecambah')
    ];
  }

  // 9. 04-okulasi / grafting (18 edges)
  if (store.flows['04-okulasi']?.['grafting']) {
    store.flows['04-okulasi']['grafting'].edges = [
      createEdge('E_GR_01', 'N_START', 'N_P001', '', 'Mulai Okulasi Utama'),
      createEdge('E_GR_02', 'N_P001', 'N_P002', '', 'Pilih Batch Target'),
      createEdge('E_GR_03', 'N_P002', 'N_P003', '', 'Scan QR Batch Bibit'),
      createEdge('E_GR_04', 'N_P003', 'N_P004', '', 'Pilih Plot Entres'),
      createEdge('E_GR_05', 'N_P004', 'N_P005', '', 'Scan QR Plot Entres'),
      createEdge('E_GR_06', 'N_P005', 'N_P006', '', 'Input Cabang & Mata'),
      createEdge('E_GR_07', 'N_P006', 'N_P007', '', 'Alokasi Pekerja Okulasi'),
      createEdge('E_GR_08', 'N_P007', 'N_P008', '', 'Input Batang Ditempel'),
      createEdge('E_GR_09', 'N_P008', 'N_P009', '', 'Rekam Penggunaan Plastik'),
      createEdge('E_GR_10', 'N_P009', 'N_P010', '', 'Dokumentasi Foto Kerja'),
      createEdge('E_GR_11', 'N_P010', 'N_P011', '', 'Foto Label Klon'),
      createEdge('E_GR_12', 'N_P011', 'N_P012', '', 'Kirim Berkas ke Asisten'),
      createEdge('E_GR_13', 'N_P012', 'N_P013', 'Disetujui', 'Verifikasi Asisten'),
      createEdge('E_GR_14', 'N_P013', 'N_P014', '', 'Pengurangan Stok Otomatis'),
      createEdge('E_GR_15', 'N_P014', 'N_END', '', 'Okulasi Selesai & Sah'),
      createEdge('E_GR_16', 'N_P003', 'N_P002', 'QR Mismatch', 'Scan Ulang Batch'),
      createEdge('E_GR_17', 'N_P006', 'N_P005', 'Koreksi Angka', 'Hitung Ulang Cabang'),
      createEdge('E_GR_18', 'N_P012', 'N_P008', 'Revisi Asisten', 'Perbaikan Data')
    ];
  }

  // 10. 04-okulasi / regrafting (14 edges)
  if (store.flows['04-okulasi']?.['regrafting']) {
    store.flows['04-okulasi']['regrafting'].edges = [
      createEdge('E_RG_01', 'RG_START', 'RG_01', '', 'Buka Okulasi Janda'),
      createEdge('E_RG_02', 'RG_01', 'RG_02', '', 'Pilih Batch Gagal'),
      createEdge('E_RG_03', 'RG_02', 'RG_03', '', 'Scan QR Batch Gagal'),
      createEdge('E_RG_04', 'RG_03', 'RG_04', '', 'Pilih Stok Mata Entres'),
      createEdge('E_RG_05', 'RG_04', 'RG_05', '', 'Input Batang Regrafting'),
      createEdge('E_RG_06', 'RG_05', 'RG_06', '', 'Alokasi Pekerja'),
      createEdge('E_RG_07', 'RG_06', 'RG_07', '', 'Foto Pelaksanaan Regrafting'),
      createEdge('E_RG_08', 'RG_07', 'RG_08', '', 'Submit Berkas Regrafting'),
      createEdge('E_RG_09', 'RG_08', 'RG_09', 'Disetujui', 'Verifikasi Asisten'),
      createEdge('E_RG_10', 'RG_09', 'RG_10', '', 'Potong Stok Mata Entres'),
      createEdge('E_RG_11', 'RG_10', 'RG_END', '', 'Regrafting Selesai'),
      createEdge('E_RG_12', 'RG_03', 'RG_02', 'QR Gagal', 'Scan Ulang Batch'),
      createEdge('E_RG_13', 'RG_07', 'RG_06', 'Foto Ulang', 'Dokumentasi Ulang'),
      createEdge('E_RG_14', 'RG_08', 'RG_05', 'Revisi Asisten', 'Perbaikan Angka')
    ];
  }

  // 11. 05-pemeriksaan / periksa-grafting (11 edges)
  if (store.flows['05-pemeriksaan']?.['periksa-grafting']) {
    store.flows['05-pemeriksaan']['periksa-grafting'].edges = [
      createEdge('E_CHK_01', 'CHK_START', 'CHK_01', '', 'Buka Pemeriksaan Okulasi'),
      createEdge('E_CHK_02', 'CHK_01', 'CHK_02', '', 'Pilih Dokumen Okulasi'),
      createEdge('E_CHK_03', 'CHK_02', 'CHK_03', '', 'Scan QR Batch'),
      createEdge('E_CHK_04', 'CHK_03', 'CHK_04', '', 'Input Batang Diperiksa'),
      createEdge('E_CHK_05', 'CHK_04', 'CHK_05', '', 'Input Berhasil & Gagal'),
      createEdge('E_CHK_06', 'CHK_05', 'CHK_06', 'Regrafting', 'Alokasi Regrafting'),
      createEdge('E_CHK_07', 'CHK_05', 'CHK_06', 'Reject / Afkir', 'Alokasi Afkir'),
      createEdge('E_CHK_08', 'CHK_06', 'CHK_07', '', 'Foto Dokumentasi + GPS'),
      createEdge('E_CHK_09', 'CHK_07', 'CHK_END', 'Disetujui', 'Verifikasi Selesai'),
      createEdge('E_CHK_10', 'CHK_04', 'CHK_03', 'Koreksi Batang', 'Hitung Ulang'),
      createEdge('E_CHK_11', 'CHK_07', 'CHK_05', 'Revisi Asisten', 'Koreksi Alokasi')
    ];
  }

  // 12. 05-pemeriksaan / periksa-regrafting (14 edges)
  if (store.flows['05-pemeriksaan']?.['periksa-regrafting']) {
    store.flows['05-pemeriksaan']['periksa-regrafting'].edges = [
      createEdge('E_CHKR_01', 'CHKR_START', 'CHKR_01', '', 'Buka Periksa Regrafting'),
      createEdge('E_CHKR_02', 'CHKR_01', 'CHKR_02', '', 'Pilih Dokumen Regrafting'),
      createEdge('E_CHKR_03', 'CHKR_02', 'CHKR_03', '', 'Scan QR Batch Regrafting'),
      createEdge('E_CHKR_04', 'CHKR_03', 'CHKR_DEC1', '', 'Validasi Jumlah Sampel'),
      createEdge('E_CHKR_05', 'CHKR_DEC1', 'CHKR_04', 'Valid', 'Lanjut Input Mata'),
      createEdge('E_CHKR_06', 'CHKR_DEC1', 'CHKR_03', 'Tidak Valid', 'Koreksi Angka Batang'),
      createEdge('E_CHKR_07', 'CHKR_04', 'CHKR_DEC2', '', 'Evaluasi Mata Tempelan'),
      createEdge('E_CHKR_08', 'CHKR_DEC2', 'CHKR_05', 'Regrafting Ulang', 'Alokasi Regrafting Baru'),
      createEdge('E_CHKR_09', 'CHKR_DEC2', 'CHKR_05', 'Reject Batang', 'Alokasi Reject'),
      createEdge('E_CHKR_10', 'CHKR_05', 'CHKR_06', '', 'Rekam Keputusan Gagal'),
      createEdge('E_CHKR_11', 'CHKR_06', 'CHKR_07', '', 'Foto Bukti Mata Hijau & Mati'),
      createEdge('E_CHKR_12', 'CHKR_07', 'CHKR_END', 'Disetujui', 'Verifikasi Selesai'),
      createEdge('E_CHKR_13', 'CHKR_06', 'CHKR_05', 'Foto Ulang', 'Dokumentasi Ulang'),
      createEdge('E_CHKR_14', 'CHKR_07', 'CHKR_04', 'Revisi Asisten', 'Perbaikan Hasil')
    ];
  }

  // 13. 06-penyeleksian / seleksi-batch (13 edges)
  if (store.flows['06-penyeleksian']?.['seleksi-batch']) {
    store.flows['06-penyeleksian']['seleksi-batch'].edges = [
      createEdge('E_SEL_01', 'SEL_START', 'SEL_01', '', 'Buka Seleksi Batch'),
      createEdge('E_SEL_02', 'SEL_01', 'SEL_02', '', 'Pilih Batch Target'),
      createEdge('E_SEL_03', 'SEL_02', 'SEL_03', '', 'Scan QR Batch'),
      createEdge('E_SEL_04', 'SEL_03', 'SEL_04', '', 'Input Bibit Afkir / Mati'),
      createEdge('E_SEL_05', 'SEL_04', 'SEL_05', '', 'Pilih Kategori Kerusakan'),
      createEdge('E_SEL_06', 'SEL_05', 'SEL_06', '', 'Foto Fisik Bibit Afkir'),
      createEdge('E_SEL_07', 'SEL_06', 'SEL_07', '', 'Kirim Deklarasi Mantri'),
      createEdge('E_SEL_08', 'SEL_07', 'SEL_08', 'Pemeriksaan Lapangan', 'Asisten Cek Fisik'),
      createEdge('E_SEL_09', 'SEL_08', 'SEL_09', 'Disetujui', 'Potong Populasi Batch'),
      createEdge('E_SEL_10', 'SEL_09', 'SEL_END', '', 'Populasi Batch Sah'),
      createEdge('E_SEL_11', 'SEL_04', 'SEL_03', 'Koreksi Hitungan', 'Hitung Ulang Afkir'),
      createEdge('E_SEL_12', 'SEL_07', 'SEL_05', 'Revisi Foto', 'Foto Ulang'),
      createEdge('E_SEL_13', 'SEL_08', 'SEL_06', 'Ditolak Asisten', 'Periksa Ulang Fisik')
    ];
  }

  // 14. 07-kebun-entres / entres-menunas (7 edges)
  if (store.flows['07-kebun-entres']?.['entres-menunas']) {
    store.flows['07-kebun-entres']['entres-menunas'].edges = [
      createEdge('E_MN_01', 'MN_START', 'MN_01', '', 'Buka Menunas Entres'),
      createEdge('E_MN_02', 'MN_01', 'MN_02', '', 'Scan QR Plot Entres'),
      createEdge('E_MN_03', 'MN_02', 'MN_03', '', 'Tampilkan Clone & Pokok'),
      createEdge('E_MN_04', 'MN_03', 'MN_04', '', 'Input Variabel Menunas'),
      createEdge('E_MN_05', 'MN_04', 'MN_05', '', 'Hitung Rata-rata Otomatis'),
      createEdge('E_MN_06', 'MN_05', 'MN_END', 'Disetujui', 'Foto & Verifikasi Asisten'),
      createEdge('E_MN_07', 'MN_03', 'MN_02', 'Koreksi Data', 'Pilih Ulang Plot')
    ];
  }

  // 15. 07-kebun-entres / entres-topping (7 edges)
  if (store.flows['07-kebun-entres']?.['entres-topping']) {
    store.flows['07-kebun-entres']['entres-topping'].edges = [
      createEdge('E_TOP_01', 'TOP_START', 'TOP_01', '', 'Buka Topping Plot'),
      createEdge('E_TOP_02', 'TOP_01', 'TOP_02', '', 'Scan QR Plot'),
      createEdge('E_TOP_03', 'TOP_02', 'TOP_03', '', 'Cek Data Clone'),
      createEdge('E_TOP_04', 'TOP_03', 'TOP_04', '', 'Input Kayu & Meter'),
      createEdge('E_TOP_05', 'TOP_04', 'TOP_05', '', 'Kalkulasi Rasio Perisai'),
      createEdge('E_TOP_06', 'TOP_05', 'TOP_END', 'Disetujui', 'Foto & Verifikasi Asisten'),
      createEdge('E_TOP_07', 'TOP_03', 'TOP_02', 'Koreksi Plot', 'Scan Ulang Plang')
    ];
  }

  // 16. 08-panen-mata-entres / panen-entres (9 edges)
  if (store.flows['08-panen-mata-entres']?.['panen-entres']) {
    store.flows['08-panen-mata-entres']['panen-entres'].edges = [
      createEdge('E_PN_01', 'PN_START', 'PN_01', '', 'Buka Panen Entres'),
      createEdge('E_PN_02', 'PN_01', 'PN_02', '', 'Scan QR Plot Entres'),
      createEdge('E_PN_03', 'PN_02', 'PN_03', '', 'Input Cabang & Estimasi'),
      createEdge('E_PN_04', 'PN_03', 'PN_04', '', 'Verifikasi Mata Aktual'),
      createEdge('E_PN_05', 'PN_04', 'PN_05', '', 'Foto Dokumentasi Cabang'),
      createEdge('E_PN_06', 'PN_05', 'PN_06', '', 'Submit Berkas ke Asisten'),
      createEdge('E_PN_07', 'PN_06', 'PN_END', 'Disetujui', 'Tambah Saldo Stok Resmi'),
      createEdge('E_PN_08', 'PN_03', 'PN_02', 'Koreksi Cabang', 'Hitung Ulang Cabang'),
      createEdge('E_PN_09', 'PN_06', 'PN_04', 'Revisi Asisten', 'Hitung Ulang Aktual')
    ];
  }

  // 17. 09-material-bahan / monitoring-stok-entres (8 edges)
  if (store.flows['09-material-bahan']?.['monitoring-stok-entres']) {
    store.flows['09-material-bahan']['monitoring-stok-entres'].edges = [
      createEdge('E_MB_01', 'MB_START', 'MB_01', '', 'Buka Monitoring Material'),
      createEdge('E_MB_02', 'MB_01', 'MB_02', '', 'Pilih Plot Entres + Clone'),
      createEdge('E_MB_03', 'MB_02', 'MB_03', '', 'Audit Mutasi Masuk/Keluar'),
      createEdge('E_MB_04', 'MB_03', 'MB_04', '', 'Tarik Dokumen Gudang'),
      createEdge('E_MB_05', 'MB_04', 'MB_05', 'Matching', 'Heading Kerja Cocok'),
      createEdge('E_MB_06', 'MB_04', 'MB_03', 'Mismatch', 'Pilih Ulang Dokumen'),
      createEdge('E_MB_07', 'MB_05', 'MB_END', 'Disetujui', 'Lekatkan & Verifikasi'),
      createEdge('E_MB_08', 'MB_05', 'MB_04', 'Koreksi Dokumen', 'Perbaikan Pengikatan')
    ];
  }

  // 18. 09-material-bahan / material-gudang-matching (8 edges)
  if (store.flows['09-material-bahan']?.['material-gudang-matching']) {
    store.flows['09-material-bahan']['material-gudang-matching'].edges = [
      createEdge('E_MMG_01', 'MMG_START', 'MMG_01', '', 'Buka Rekonsiliasi Gudang'),
      createEdge('E_MMG_02', 'MMG_01', 'MMG_02', '', 'Filter Waktu & Material'),
      createEdge('E_MMG_03', 'MMG_02', 'MMG_03', '', 'Tarik Dokumen BKB/SPB'),
      createEdge('E_MMG_04', 'MMG_03', 'MMG_04', '', 'Pilih Heading Kerja'),
      createEdge('E_MMG_05', 'MMG_04', 'MMG_05', 'Matching 100%', 'Verifikasi Sistem Lolos'),
      createEdge('E_MMG_06', 'MMG_04', 'MMG_02', 'Mismatch', 'Pilih Ulang BKB'),
      createEdge('E_MMG_07', 'MMG_05', 'MMG_END', 'Disetujui', 'Lekatkan Permanen'),
      createEdge('E_MMG_08', 'MMG_05', 'MMG_03', 'Revisi Alokasi', 'Perbaiki Heading')
    ];
  }

  // 19. 10-rekam-pemeliharaan / pemeliharaan-heading (8 edges)
  if (store.flows['10-rekam-pemeliharaan']?.['pemeliharaan-heading']) {
    store.flows['10-rekam-pemeliharaan']['pemeliharaan-heading'].edges = [
      createEdge('E_PM_01', 'PM_START', 'PM_01', '', 'Buka Rekam Pemeliharaan'),
      createEdge('E_PM_02', 'PM_01', 'PM_02', '', 'Pilih Heading Kerja'),
      createEdge('E_PM_03', 'PM_02', 'PM_03', '', 'Input Realisasi Tenaga & Bahan'),
      createEdge('E_PM_04', 'PM_03', 'PM_04', '', 'Matching Dokumen Gudang'),
      createEdge('E_PM_05', 'PM_04', 'PM_05', '', 'Foto Dokumentasi Aplikasi'),
      createEdge('E_PM_06', 'PM_05', 'PM_06', '', 'Submit ke Asisten Bibitan'),
      createEdge('E_PM_07', 'PM_06', 'PM_END', 'Disetujui', 'Biaya & Realisasi Sah'),
      createEdge('E_PM_08', 'PM_03', 'PM_02', 'Koreksi Angka', 'Hitung Ulang Bahan')
    ];
  }

  // 20. 11-pengeluaran / pengeluaran-bibit (8 edges)
  if (store.flows['11-pengeluaran']?.['pengeluaran-bibit']) {
    store.flows['11-pengeluaran']['pengeluaran-bibit'].edges = [
      createEdge('E_EXB_01', 'EXB_START', 'EXB_01', '', 'Buka Pengeluaran Bibit'),
      createEdge('E_EXB_02', 'EXB_01', 'EXB_02', '', 'Pilih SPB / DO Approved'),
      createEdge('E_EXB_03', 'EXB_02', 'EXB_03', '', 'Scan QR Batch Bibit'),
      createEdge('E_EXB_04', 'EXB_03', 'EXB_04', '', 'Input Bibit Dimuat'),
      createEdge('E_EXB_05', 'EXB_04', 'EXB_05', '', 'Foto Muat Truk + Timestamp'),
      createEdge('E_EXB_06', 'EXB_05', 'EXB_END', 'Disetujui', 'Terbitkan Surat Jalan'),
      createEdge('E_EXB_07', 'EXB_04', 'EXB_03', 'Koreksi Muat', 'Hitung Ulang Fisik'),
      createEdge('E_EXB_08', 'EXB_05', 'EXB_04', 'Revisi Foto', 'Dokumentasi Ulang')
    ];
  }

  // 21. 11-pengeluaran / pengeluaran-mata-entres (6 edges)
  if (store.flows['11-pengeluaran']?.['pengeluaran-mata-entres']) {
    store.flows['11-pengeluaran']['pengeluaran-mata-entres'].edges = [
      createEdge('E_EXM_01', 'EXM_START', 'EXM_01', '', 'Buka Pengeluaran Entres'),
      createEdge('E_EXM_02', 'EXM_01', 'EXM_02', '', 'Pilih SPB Entres Approved'),
      createEdge('E_EXM_03', 'EXM_02', 'EXM_03', '', 'Packing & Hitung Mata Aktual'),
      createEdge('E_EXM_04', 'EXM_03', 'EXM_END', 'Disetujui', 'Foto + Surat Jalan Terbit'),
      createEdge('E_EXM_05', 'EXM_03', 'EXM_02', 'Koreksi Entres', 'Hitung Ulang Mata'),
      createEdge('E_EXM_06', 'EXM_03', 'EXM_01', 'Revisi Asisten', 'Perbaikan SPB')
    ];
  }

  // Attach cross-flow edges
  store.crossFlowEdges = buildCanonicalCrossFlowEdges();

  updateMetadata({ updatedBy: 'Business Analyst' });
  return store;
}

// =============================================================================
// BUSINESS RULE TRACEABILITY FINALIZATION & REPORTS
// =============================================================================

/**
 * Finalizes canonical business rules mapping to requirements and flow nodes (16/16 covered).
 * @param {Object} store 
 * @returns {Object} Updated store
 */
export function finalizeBusinessRuleTraceability(store = activeStore) {
  if (!store) store = getActiveStore();

  const canonicalRules = [
    { id: 'BR-GLB-001', title: 'Mandatory Foto Dokumentasi + Timestamp', desc: 'Setiap transaksi operasional Mantri Bibitan wajib menyertakan foto fisik dokumentasi dengan watermark timestamp ISO dan geolokasi GPS yang valid.' },
    { id: 'BR-GLB-002', title: 'Kewajiban Verifikasi Asisten Bibitan', desc: 'Semua transaksi yang diinput oleh Mantri Bibitan berstatus Menunggu Verifikasi dan belum memengaruhi saldo produksi sampai disetujui oleh Asisten Bibitan.' },
    { id: 'BR-GLB-003', title: 'Promosi ke Server Production', desc: 'Hanya transaksi yang telah diverifikasi dan disetujui oleh Asisten Bibitan yang akan dikirim ke basis data Server Production.' },
    { id: 'BR-PRS-001', title: 'Presensi Datang Sebagai Syarat Transaksi', desc: 'Presensi Datang supervisor wajib diselesaikan terlebih dahulu di pagi hari sebelum sistem mengizinkan transaksi operasional harian lainnya.' },
    { id: 'BR-PRS-003', title: 'Prioritas Biometrik Face ID', desc: 'Face ID adalah metode biometrik utama untuk presensi supervisor. Foto manual hanya diizinkan sebagai fallback jika verifikasi Face ID mengalami kegagalan teknis.' },
    { id: 'BR-OKL-001', title: 'Presensi Sebelum Okulasi', desc: 'Transaksi okulasi hanya dapat dibuka jika Mantri telah menyelesaikan presensi harian dan pekerja yang dialokasikan terdaftar hadir.' },
    { id: 'BR-OKL-002', title: 'Validasi QR Code Objek Fisik', desc: 'Batch bibit wajib divalidasi menggunakan QR Code sebelum penginputan hasil kerja okulasi dilakukan. Pemilihan manual hanya jalur fallback.' },
    { id: 'BR-OKL-005', title: 'Identitas Stok Mata Entres', desc: 'Stok mata entres dikelola berdasarkan kombinasi Plot Entres + Clone, bukan berdasarkan Batch.' },
    { id: 'BR-OKL-006', title: 'Status Estimasi vs Stok Aktual', desc: 'Kalkulasi Jumlah Cabang x Rata-rata Mata Entres adalah estimasi referensi semata. Hanya mata entres aktual yang diverifikasi yang menjadi pengurang saldo stok.' },
    { id: 'BR-OKL-007', title: 'Pengurangan Stok Pasca Verifikasi', desc: 'Pengurangan saldo stok mata entres terjadi secara otomatis hanya setelah berkas transaksi okulasi disetujui (diverifikasi) oleh Asisten Bibitan.' },
    { id: 'BR-OKL-008', title: 'Regrafting Berulang Tanpa Batas Tunggal', desc: 'Proses regrafting pada bibit gagal tidak dibatasi hanya satu kali. Bibit yang gagal pada pemeriksaan regrafting dapat diregrafting kembali atau diputuskan reject oleh Mantri.' },
    { id: 'BR-SEM-001', title: 'Alokasi Multi-Bedengan per Dokumen', desc: 'Satu dokumen penerimaan benih dapat dialokasikan ke beberapa bedengan perkecambahan (contoh: 10.000 benih dibagi ke Bedengan 001, 002, dan 003).' },
    { id: 'BR-SEM-006', title: 'Standar 1 Polybag = 2 Benih/Bibit', desc: 'Kecambah yang ditransplanting dari bedengan ke kantong polybag wajib ditanami 2 kecambah per polybag untuk seleksi vigor selanjutnya.' },
    { id: 'BR-SEM-007', title: 'Konsolidasi Multi-Bedengan ke 1 Batch', desc: 'Satu Batch bibit siap okulasi dapat dibentuk dari gabungan beberapa bedengan semaian dengan clone yang sama.' },
    { id: 'BR-SEL-001', title: 'Verifikasi Fisik Sebelum Pengurangan Populasi Batch', desc: 'Deklarasi bibit reject/mati pada modul penyeleksian oleh Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan pemeriksaan fisik langsung dan menyetujuinya.' },
    { id: 'BR-MAT-001', title: 'Integritas 1 Dokumen Gudang = 1 Heading Kerja', desc: 'Satu dokumen pengeluaran gudang hanya dapat dilekatkan pada satu aktivitas pemeliharaan dengan heading kerja yang sama (matching).' }
  ];

  store.businessRules = canonicalRules;

  // Enrich requirements with explicit ruleIds
  const ruleMappings = {
    'RN-PRS-001': ['BR-PRS-001', 'BR-GLB-001'],
    'RN-PRS-002': ['BR-PRS-003', 'BR-GLB-001'],
    'RN-PRS-003': ['BR-PRS-003', 'BR-GLB-001'],
    'RN-PRS-004': ['BR-PRS-003', 'BR-GLB-001'],
    'RN-PRS-005': ['BR-GLB-001'],
    'RN-PRS-006': ['BR-GLB-002', 'BR-GLB-003'],
    'RN-PRS-007': ['BR-GLB-003'],
    'RN-PWP-001': ['BR-GLB-001'],
    'RN-PWP-002': ['BR-GLB-001'],
    'RN-PWP-003': ['BR-GLB-001'],
    'RN-PWP-004': ['BR-GLB-002'],
    'RN-PWP-005': ['BR-GLB-003'],
    'RN-RCV-001': ['BR-GLB-001'],
    'RN-RCV-002': ['BR-GLB-001'],
    'RN-RCV-003': ['BR-GLB-001'],
    'RN-RCV-004': ['BR-GLB-001'],
    'RN-RCV-005': ['BR-GLB-002'],
    'RN-RCV-006': ['BR-GLB-003'],
    'RN-RCV-KS01': ['BR-GLB-001'],
    'RN-RCV-KS02': ['BR-GLB-002'],
    'RN-RCV-KS03': ['BR-GLB-002'],
    'RN-RCV-KS04': ['BR-GLB-001', 'BR-GLB-002', 'BR-GLB-003'],
    'RN-RCV-KS05': ['BR-GLB-002'],
    'RN-RCV-KS06': ['BR-GLB-003'],
    'RN-RCV-KSP016': ['BR-GLB-001', 'BR-GLB-002'],
    'RN-RCV-KSP017': ['BR-GLB-002'],
    'RN-RCV-KSP018': ['BR-GLB-002'],
    'RN-RCV-KSP019': ['BR-GLB-001', 'BR-GLB-002', 'BR-GLB-003'],
    'RN-RCV-KSP020': ['BR-GLB-002'],
    'RN-RCV-KSP021': ['BR-GLB-003'],
    'RN-RCV-ME022': ['BR-GLB-001', 'BR-GLB-002', 'BR-OKL-005'],
    'RN-RCV-ME023': ['BR-OKL-005', 'BR-GLB-002'],
    'RN-RCV-ME024': ['BR-GLB-002', 'BR-OKL-005'],
    'RN-RCV-ME025': ['BR-GLB-001', 'BR-GLB-002', 'BR-OKL-006', 'BR-OKL-007'],
    'RN-RCV-ME026': ['BR-GLB-002'],
    'RN-RCV-ME027': ['BR-GLB-003'],
    'RN-SEM-001': ['BR-SEM-001', 'BR-GLB-001'],
    'RN-SEM-002': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-SEM-003': ['BR-GLB-001'],
    'RN-SEM-004': ['BR-GLB-001'],
    'RN-SEM-005': ['BR-GLB-002'],
    'RN-SEM-006': ['BR-SEM-006', 'BR-GLB-001'],
    'RN-SEM-007': ['BR-SEM-007', 'BR-GLB-001'],
    'RN-SEM-008': ['BR-GLB-003'],
    'RN-SEM-TP028': ['BR-SEM-001', 'BR-GLB-001'],
    'RN-SEM-TP029': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-SEM-TP030': ['BR-GLB-001'],
    'RN-SEM-TP031': ['BR-GLB-001'],
    'RN-SEM-TP032': ['BR-GLB-002'],
    'RN-SEM-TP033': ['BR-SEM-006', 'BR-GLB-001'],
    'RN-SEM-TP034': ['BR-SEM-007', 'BR-GLB-001'],
    'RN-SEM-TP035': ['BR-GLB-003'],
    'RN-OKL-000': ['BR-OKL-001', 'BR-PRS-001'],
    'RN-OKL-001': ['BR-OKL-001', 'BR-PRS-001'],
    'RN-OKL-002': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-OKL-003': ['BR-OKL-002'],
    'RN-OKL-004': ['BR-OKL-005'],
    'RN-OKL-005': ['BR-OKL-005', 'BR-OKL-002'],
    'RN-OKL-006': ['BR-OKL-006'],
    'RN-OKL-007': ['BR-OKL-006'],
    'RN-OKL-008': ['BR-GLB-001'],
    'RN-OKL-009': ['BR-GLB-001'],
    'RN-OKL-010': ['BR-GLB-001'],
    'RN-OKL-011': ['BR-GLB-001'],
    'RN-OKL-012': ['BR-GLB-001'],
    'RN-OKL-013': ['BR-GLB-002'],
    'RN-OKL-014': ['BR-OKL-007', 'BR-GLB-003'],
    'RN-OKL-015': ['BR-GLB-003'],
    'RN-REG-000': ['BR-OKL-001', 'BR-OKL-008'],
    'RN-REG-001': ['BR-OKL-008'],
    'RN-REG-002': ['BR-OKL-002'],
    'RN-REG-003': ['BR-OKL-002'],
    'RN-REG-004': ['BR-OKL-005'],
    'RN-REG-005': ['BR-OKL-008'],
    'RN-REG-006': ['BR-GLB-001'],
    'RN-REG-007': ['BR-GLB-001'],
    'RN-REG-008': ['BR-GLB-001'],
    'RN-REG-009': ['BR-GLB-002'],
    'RN-REG-010': ['BR-OKL-007', 'BR-GLB-003'],
    'RN-REG-011': ['BR-GLB-003'],
    'RN-CHK-001': ['BR-GLB-001'],
    'RN-CHK-002': ['BR-GLB-001'],
    'RN-CHK-003': ['BR-OKL-002'],
    'RN-CHK-004': ['BR-GLB-001'],
    'RN-CHK-005': ['BR-GLB-001'],
    'RN-CHK-006': ['BR-OKL-008'],
    'RN-CHK-007': ['BR-GLB-001'],
    'RN-CHK-008': ['BR-GLB-002'],
    'RN-CHK-009': ['BR-GLB-003'],
    'RN-CHK-RG036': ['BR-OKL-008', 'BR-GLB-001'],
    'RN-CHK-RG037': ['BR-OKL-008'],
    'RN-CHK-RG038': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-CHK-RG039': ['BR-GLB-001'],
    'RN-CHK-RG040': ['BR-OKL-008', 'BR-GLB-001'],
    'RN-CHK-RG041': ['BR-OKL-008', 'BR-GLB-001'],
    'RN-CHK-RG042': ['BR-GLB-001'],
    'RN-CHK-RG043': ['BR-GLB-002', 'BR-GLB-003'],
    'RN-CHK-RG044': ['BR-GLB-003'],
    'RN-SEL-001': ['BR-SEL-001', 'BR-GLB-001'],
    'RN-SEL-002': ['BR-GLB-001'],
    'RN-SEL-003': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-SEL-004': ['BR-GLB-001'],
    'RN-SEL-005': ['BR-GLB-001'],
    'RN-SEL-006': ['BR-GLB-001'],
    'RN-SEL-007': ['BR-SEL-001'],
    'RN-SEL-008': ['BR-SEL-001', 'BR-GLB-002'],
    'RN-SEL-009': ['BR-SEL-001', 'BR-GLB-002'],
    'RN-SEL-010': ['BR-SEL-001', 'BR-GLB-003'],
    'RN-SEL-011': ['BR-GLB-003'],
    'RN-ENT-001': ['BR-GLB-001'],
    'RN-ENT-002': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-ENT-003': ['BR-OKL-005'],
    'RN-ENT-004': ['BR-GLB-001'],
    'RN-ENT-005': ['BR-OKL-006'],
    'RN-ENT-006': ['BR-GLB-001', 'BR-GLB-002'],
    'RN-ENT-007': ['BR-GLB-003'],
    'RN-ENT-TOP045': ['BR-GLB-001', 'BR-OKL-005'],
    'RN-ENT-TOP046': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-ENT-TOP047': ['BR-OKL-005'],
    'RN-ENT-TOP048': ['BR-OKL-006', 'BR-GLB-001'],
    'RN-ENT-TOP049': ['BR-OKL-006'],
    'RN-ENT-TOP050': ['BR-GLB-001', 'BR-GLB-002', 'BR-GLB-003'],
    'RN-ENT-TOP051': ['BR-GLB-003'],
    'RN-HAR-001': ['BR-GLB-001'],
    'RN-HAR-002': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-HAR-003': ['BR-OKL-005'],
    'RN-HAR-004': ['BR-OKL-006'],
    'RN-HAR-005': ['BR-OKL-006', 'BR-GLB-001'],
    'RN-HAR-006': ['BR-GLB-001'],
    'RN-HAR-007': ['BR-GLB-002'],
    'RN-HAR-008': ['BR-OKL-007', 'BR-GLB-003'],
    'RN-MAT-001': ['BR-MAT-001', 'BR-GLB-001'],
    'RN-MAT-002': ['BR-OKL-005'],
    'RN-MAT-003': ['BR-GLB-001'],
    'RN-MAT-004': ['BR-MAT-001'],
    'RN-MAT-005': ['BR-MAT-001'],
    'RN-MAT-006': ['BR-MAT-001', 'BR-GLB-002'],
    'RN-MAT-007': ['BR-GLB-003'],
    'RN-MAT-MMG052': ['BR-MAT-001', 'BR-GLB-001'],
    'RN-MAT-MMG053': ['BR-MAT-001'],
    'RN-MAT-MMG054': ['BR-MAT-001'],
    'RN-MAT-MMG055': ['BR-MAT-001', 'BR-GLB-001'],
    'RN-MAT-MMG056': ['BR-MAT-001'],
    'RN-MAT-MMG057': ['BR-MAT-001', 'BR-GLB-002'],
    'RN-MAT-MMG058': ['BR-GLB-003'],
    'RN-MNT-001': ['BR-GLB-001'],
    'RN-MNT-002': ['BR-GLB-001'],
    'RN-MNT-003': ['BR-GLB-001'],
    'RN-MNT-004': ['BR-MAT-001'],
    'RN-MNT-005': ['BR-MAT-001', 'BR-GLB-001'],
    'RN-MNT-006': ['BR-GLB-001'],
    'RN-MNT-007': ['BR-GLB-002'],
    'RN-MNT-008': ['BR-GLB-003'],
    'RN-EXP-001': ['BR-GLB-001'],
    'RN-EXP-002': ['BR-GLB-001'],
    'RN-EXP-003': ['BR-OKL-002', 'BR-GLB-001'],
    'RN-EXP-004': ['BR-GLB-001'],
    'RN-EXP-005': ['BR-GLB-001'],
    'RN-EXP-006': ['BR-GLB-002'],
    'RN-EXP-007': ['BR-GLB-003'],
    'RN-EXM-001': ['BR-GLB-001'],
    'RN-EXM-002': ['BR-OKL-005', 'BR-GLB-001'],
    'RN-EXM-003': ['BR-OKL-006', 'BR-GLB-001'],
    'RN-EXM-004': ['BR-GLB-002'],
    'RN-EXM-005': ['BR-GLB-003']
  };

  (store.requirements || []).forEach(req => {
    if (ruleMappings[req.id]) {
      req.ruleIds = ruleMappings[req.id];
    }
  });

  updateMetadata({ updatedBy: 'Business Analyst' });
  return store;
}

/**
 * Generates coverage report for Business Rules.
 * @param {Object} store 
 * @returns {Object}
 */
export function getBusinessRuleTraceabilityReport(store = activeStore) {
  if (!store) store = getActiveStore();
  const rules = store.businessRules || [];
  const traces = getAllTraceabilityRecords();

  const ruleUsage = {};
  rules.forEach(r => {
    ruleUsage[r.id] = {
      rule: r,
      totalLinkedRequirements: 0,
      totalLinkedNodes: 0,
      requirements: [],
      nodes: []
    };
  });

  traces.forEach(t => {
    (t.businessRules || []).forEach(r => {
      if (ruleUsage[r.id]) {
        ruleUsage[r.id].totalLinkedRequirements++;
        ruleUsage[r.id].requirements.push(t.requirement);
        (t.nodes || []).forEach(n => {
          ruleUsage[r.id].totalLinkedNodes++;
          ruleUsage[r.id].nodes.push(n);
        });
      }
    });
  });

  const ruleList = Object.values(ruleUsage);
  const coveredRules = ruleList.filter(r => r.totalLinkedRequirements > 0 || r.totalLinkedNodes > 0);

  return {
    totalCanonicalRules: rules.length,
    coveredRulesCount: coveredRules.length,
    coverageRate: rules.length > 0 ? Number(((coveredRules.length / rules.length) * 100).toFixed(2)) : 0,
    rules: ruleList,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generates coverage report for Flow Edges & Cross-Flow Edges.
 * @param {Object} store 
 * @returns {Object}
 */
export function getFlowEdgeCoverageReport(store = activeStore) {
  if (!store) store = getActiveStore();

  let totalActiveNodes = 0;
  let totalActiveEdges = 0;
  const featureEdgeSummary = [];

  for (const [modId, features] of Object.entries(store.flows || {})) {
    for (const [featId, flowObj] of Object.entries(features || {})) {
      const activeNodes = (flowObj.nodes || []).filter(n => !n.isArchived && !n.isSuperseded);
      const activeEdges = (flowObj.edges || []).filter(e => !e.isArchived && !e.isSuperseded);
      totalActiveNodes += activeNodes.length;
      totalActiveEdges += activeEdges.length;

      featureEdgeSummary.push({
        moduleId: modId,
        featureId: featId,
        featureTitle: flowObj.title || featId,
        nodesCount: activeNodes.length,
        edgesCount: activeEdges.length
      });
    }
  }

  const crossFlowEdges = (store.crossFlowEdges || []).filter(cfe => !cfe.isArchived);

  return {
    totalActiveNodes,
    totalActiveEdges,
    totalCrossFlowEdges: crossFlowEdges.length,
    featuresCount: featureEdgeSummary.length,
    featureEdgeSummary,
    crossFlowEdges,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Master finalization function: applies Phase 4E (Gap resolution) + Phase 4F (Edges & Rules).
 * @param {Object} store 
 * @returns {Object}
 */
export function finalizeFlowAndBusinessRuleTraceability(store = activeStore) {
  if (!store) store = getActiveStore();
  applyTrueGapResolutionPlan(store);
  finalizeFlowEdges(store);
  finalizeBusinessRuleTraceability(store);
  return store;
}
