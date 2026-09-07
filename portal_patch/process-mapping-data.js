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
    { id: 'BR-PRS-001', title: 'Presensi Datang Sebagai Syarat Transaksi', desc: 'Presensi Datang supervisor wajib diselesaikan terlebih dahulu di pagi hari sebelum sistem mengizinkan transaksi operasional harian lainnya.', category: 'Presensi' },
    { id: 'BR-PRS-003', title: 'Prioritas Biometrik Face ID', desc: 'Face ID adalah metode biometrik utama untuk presensi supervisor. Foto manual hanya diizinkan sebagai fallback jika verifikasi Face ID mengalami kegagalan teknis.', category: 'Presensi' },
    { id: 'BR-OKL-001', title: 'Presensi Sebelum Okulasi', desc: 'Transaksi okulasi hanya dapat dibuka jika Mantri telah menyelesaikan presensi harian dan pekerja yang dialokasikan terdaftar hadir.', category: 'Okulasi' },
    { id: 'BR-OKL-002', title: 'Validasi QR Code Objek Fisik', desc: 'Batch bibit wajib divalidasi menggunakan QR Code sebelum penginputan hasil kerja okulasi dilakukan. Pemilihan manual hanya jalur fallback.', category: 'Okulasi' },
    { id: 'BR-OKL-005', title: 'Identitas Stok Mata Entres', desc: 'Stok mata entres dikelola berdasarkan kombinasi Plot Entres + Clone, bukan berdasarkan Batch.', category: 'Okulasi' },
    { id: 'BR-OKL-006', title: 'Status Estimasi vs Stok Aktual', desc: 'Kalkulasi Jumlah Cabang x Rata-rata Mata Entres adalah estimasi referensi semata. Hanya mata entres aktual yang diverifikasi yang menjadi pengurang saldo stok.', category: 'Okulasi' },
    { id: 'BR-OKL-007', title: 'Pengurangan Stok Pasca Verifikasi', desc: 'Pengurangan saldo stok mata entres terjadi secara otomatis hanya setelah berkas transaksi okulasi disetujui (diverifikasi) oleh Asisten Bibitan.', category: 'Okulasi' },
    { id: 'BR-OKL-008', title: 'Regrafting Berulang Tanpa Batas Tunggal', desc: 'Proses regrafting pada bibit gagal tidak dibatasi hanya satu kali. Bibit yang gagal pada pemeriksaan regrafting dapat diregrafting kembali atau diputuskan reject oleh Mantri.', category: 'Okulasi' },
    { id: 'BR-SEM-001', title: 'Alokasi Multi-Bedengan per Dokumen', desc: 'Satu dokumen penerimaan benih dapat dialokasikan ke beberapa bedengan perkecambahan (contoh: 10.000 benih dibagi ke Bedengan 001, 002, dan 003).', category: 'Penyemaian' },
    { id: 'BR-SEM-006', title: 'Standar 1 Polybag = 2 Benih/Bibit', desc: 'Kecambah yang ditransplanting dari bedengan ke kantong polybag wajib ditanami 2 kecambah per polybag untuk seleksi vigor selanjutnya.', category: 'Penyemaian' },
    { id: 'BR-SEM-007', title: 'Konsolidasi Multi-Bedengan ke 1 Batch', desc: 'Satu Batch bibit siap okulasi dapat dibentuk dari gabungan beberapa bedengan semaian dengan clone yang sama.', category: 'Penyemaian' },
    { id: 'BR-SEL-001', title: 'Verifikasi Fisik Sebelum Pengurangan Populasi Batch', desc: 'Deklarasi bibit reject/mati pada modul penyeleksian oleh Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan pemeriksaan fisik langsung dan menyetujuinya.', category: 'Penyeleksian' },
    { id: 'BR-MAT-001', title: 'Integritas 1 Dokumen Gudang = 1 Heading Kerja', desc: 'Satu dokumen pengeluaran gudang hanya dapat dilekatkan pada satu aktivitas pemeliharaan dengan heading kerja yang sama (matching).', category: 'Material' },
    { id: 'BR-AUD-001', title: 'Audit Trail Koreksi Transaksi', desc: 'Setiap koreksi terhadap transaksi yang telah berstatus Confirmed wajib mencatat log audit trail yang berisi originalValue, correctedValue, reason, correctedBy, dan correctedAt secara immutable.', category: 'Governance' },
    { id: 'BR-QAL-001', title: 'Quality Control & Agronomy Standard Tekniker', desc: 'Verifikasi agronomi teknis (uji mutu kecambah benih, kalibrasi pisau/ikatan juru okulasi, dan sertifikasi kemurnian clone kebun entres) wajib memenuhi batas toleransi standar mutu Socfindo sebelum batch disetujui.', category: 'Quality Control' }
  ];
  store.businessRules = canonicalRules;

  // 2. Cross-flow edges
  store.crossFlowEdges = buildCanonicalCrossFlowEdges();

  // 3. Ensure all 21 feature flows exist and map to requirements
  if (!store.flows) store.flows = {};

  // Setup/Update Feature Flows
  const FLOW_DEFINITIONS = {
    '01-presensi/presensi-supervisor': {
      title: 'Flow Proses - Presensi Supervisor Harian',
      nodes: [
        { id: 'PR_START', code: 'START', type: 'start', title: 'Buka Modul Presensi', reqId: 'RN-PRS-001', role: 'Mantri Bibitan' },
        { id: 'PR_01', code: 'P-001', type: 'process', title: 'Pilih Status Datang / Pulang', reqId: 'RN-PRS-002', role: 'Mantri Bibitan' },
        { id: 'PR_02', code: 'P-002', type: 'process', title: 'Verifikasi Face ID Biometrik', reqId: 'RN-PRS-003', role: 'Mantri Bibitan' },
        { id: 'PR_FB', code: 'FB-001', type: 'fallback', title: 'Foto Manual Fallback', reqId: 'RN-PRS-005', role: 'Mantri Bibitan' },
        { id: 'PR_03', code: 'P-003', type: 'process', title: 'Validasi GPS Radius Lokasi', reqId: 'RN-PRS-005', role: 'Mantri Bibitan' },
        { id: 'PR_04', code: 'P-004', type: 'process', title: 'Pencatatan Presensi Terverifikasi', reqId: 'RN-PRS-006', role: 'Mantri Bibitan' },
        { id: 'PR_END', code: 'END', type: 'end', title: 'Presensi Selesai - Buka Transaksi', reqId: 'RN-PRS-007', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_PR_01', fromNode: 'PR_START', toNode: 'PR_01', label: 'Buka Form Presensi' },
        { id: 'E_PR_02', fromNode: 'PR_01', toNode: 'PR_02', label: 'Pilih Presensi Datang' },
        { id: 'E_PR_03', fromNode: 'PR_02', toNode: 'PR_03', label: 'Biometrik Berhasil' },
        { id: 'E_PR_04', fromNode: 'PR_02', toNode: 'PR_FB', label: 'Biometrik Gagal (Fallback)' },
        { id: 'E_PR_05', fromNode: 'PR_FB', toNode: 'PR_03', label: 'Ambil Foto Manual' },
        { id: 'E_PR_06', fromNode: 'PR_03', toNode: 'PR_04', label: 'Radius GPS Valid' },
        { id: 'E_PR_07', fromNode: 'PR_04', toNode: 'PR_END', label: 'Pencatatan Berhasil' }
      ]
    },
    '01-presensi/presensi-pekerja': {
      title: 'Flow Proses - Presensi & Alokasi Pekerja Lapangan',
      nodes: [
        { id: 'PW_START', code: 'START', type: 'start', title: 'Buka Presensi Pekerja', reqId: 'RN-PWP-001', role: 'Mantri Bibitan' },
        { id: 'PW_01', code: 'P-001', type: 'process', title: 'Pilih Grup Mandor / Regu', reqId: 'RN-PWP-002', role: 'Mantri Bibitan' },
        { id: 'PW_02', code: 'P-002', type: 'process', title: 'Ceklis Kehadiran & Bantuan Afdeling', reqId: 'RN-PWP-003', role: 'Mantri Bibitan' },
        { id: 'PW_03', code: 'P-003', type: 'process', title: 'Alokasi Penugasan Blok/Kegiatan', reqId: 'RN-PWP-004', role: 'Mantri Bibitan' },
        { id: 'PW_04', code: 'P-004', type: 'verification', title: 'Verifikasi Presensi HK oleh Asisten', reqId: 'RN-PWP-006', role: 'Asisten Bibitan' },
        { id: 'PW_05', code: 'P-005', type: 'verification', title: 'Verifikasi Rekap HK & Payroll KTU', reqId: 'RN-PWP-007', role: 'KTU' },
        { id: 'PW_END', code: 'END', type: 'end', title: 'Presensi Pekerja Terverifikasi Sah', reqId: 'RN-PWP-005', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_PW_01', fromNode: 'PW_START', toNode: 'PW_01', label: 'Buka Modul' },
        { id: 'E_PW_02', fromNode: 'PW_01', toNode: 'PW_02', label: 'Pilih Regu Kerja' },
        { id: 'E_PW_03', fromNode: 'PW_02', toNode: 'PW_03', label: 'Kehadiran Lengkap' },
        { id: 'E_PW_04', fromNode: 'PW_03', toNode: 'PW_04', label: 'Kirim ke Asisten' },
        { id: 'E_PW_05', fromNode: 'PW_04', toNode: 'PW_05', label: 'Asisten Setuju' },
        { id: 'E_PW_06', fromNode: 'PW_05', toNode: 'PW_END', label: 'Payroll KTU Valid' }
      ]
    },
    '02-penerimaan/terima-benih': {
      title: 'Flow Proses - Penerimaan Benih Kelapa Sawit (Pihak Ke-3)',
      nodes: [
        { id: 'TB_START', code: 'START', type: 'start', title: 'Pemeriksaan Surat Jalan Vendor', reqId: 'RN-RCV-002', role: 'Mantri Bibitan' },
        { id: 'TB_QC', code: 'QC-001', type: 'process', title: 'Uji Mutu & Daya Kecambah Benih', reqId: 'RN-RCV-028', role: 'Tekniker I' },
        { id: 'TB_03', code: 'P-003', type: 'process', title: 'Hitung Fisik Benih / Karung', reqId: 'RN-RCV-003', role: 'Mantri Bibitan' },
        { id: 'TB_04', code: 'P-004', type: 'process', title: 'Foto Bukti Fisik & Dokumen', reqId: 'RN-RCV-004', role: 'Mantri Bibitan' },
        { id: 'TB_05', code: 'P-005', type: 'verification', title: 'Persetujuan Asisten Bibitan', reqId: 'RN-RCV-005', role: 'Asisten Bibitan' },
        { id: 'TB_END', code: 'END', type: 'end', title: 'Benih Terdaftar & Siap Semai', reqId: 'RN-RCV-006', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_TB_01', fromNode: 'TB_START', toNode: 'TB_QC', label: 'Verifikasi Dokumen' },
        { id: 'E_TB_02', fromNode: 'TB_QC', toNode: 'TB_03', label: 'Mutu Benih Lolos QC' },
        { id: 'E_TB_03', fromNode: 'TB_03', toNode: 'TB_04', label: 'Kuantitas Fisik Klop' },
        { id: 'E_TB_04', fromNode: 'TB_04', toNode: 'TB_05', label: 'Kirim Berkas Verifikasi' },
        { id: 'E_TB_05', fromNode: 'TB_05', toNode: 'TB_END', label: 'Asisten Approve' }
      ]
    },
    '02-penerimaan/terima-kebun-sendiri': {
      title: 'Flow Proses - Penerimaan Bibit Kebun Sendiri',
      nodes: [
        { id: 'KS_01', code: 'CR-001', type: 'start', title: 'Pengajuan SPB oleh Asisten Divisi', reqId: 'RN-RCV-KS01', role: 'Asisten Divisi' },
        { id: 'KS_02', code: 'CR-002', type: 'process', title: 'Peninjauan Permintaan Bibit oleh Askep', reqId: 'RN-RCV-KS02', role: 'Asisten Kepala' },
        { id: 'KS_DEC', code: 'CR-003', type: 'decision', title: 'Keputusan Kuota & Stok Askep', reqId: 'RN-RCV-KS03', role: 'Asisten Kepala' },
        { id: 'KS_03', code: 'CR-004', type: 'process', title: 'Tindak Lanjut & Muat oleh Mantri', reqId: 'RN-RCV-KS04', role: 'Mantri Bibitan' },
        { id: 'KS_04', code: 'CR-005', type: 'process', title: 'Penerimaan & Plotting Polygon Divisi', reqId: 'RN-RCV-KS05', role: 'Asisten Divisi' },
        { id: 'KS_END', code: 'END', type: 'end', title: 'Serah Terima Bibit Tuntas', reqId: 'RN-RCV-KS06', role: 'Asisten Divisi' }
      ],
      edges: [
        { id: 'E_KS_01', fromNode: 'KS_01', toNode: 'KS_02', label: 'Ajukan SPB' },
        { id: 'E_KS_02', fromNode: 'KS_02', toNode: 'KS_DEC', label: 'Cek Stok' },
        { id: 'E_KS_03', fromNode: 'KS_DEC', toNode: 'KS_03', label: 'Disetujui' },
        { id: 'E_KS_04', fromNode: 'KS_DEC', toNode: 'KS_01', label: 'Ditolak / Revisi' },
        { id: 'E_KS_05', fromNode: 'KS_03', toNode: 'KS_04', label: 'Kirim Armada' },
        { id: 'E_KS_06', fromNode: 'KS_04', toNode: 'KS_END', label: 'Polygon Tanam Valid' }
      ]
    },
    '02-penerimaan/terima-kebun-sepupu': {
      title: 'Flow Proses - Penerimaan Bibit Kebun Sepupu (Cross-Estate)',
      nodes: [
        { id: 'KSP_01', code: 'CR-001', type: 'start', title: 'Permohonan Bibit oleh Pengurus', reqId: 'RN-RCV-KSP015', role: 'Pengurus' },
        { id: 'KSP_02', code: 'CR-002', type: 'process', title: 'Review Permohonan oleh Askep', reqId: 'RN-RCV-KSP016', role: 'Asisten Kepala' },
        { id: 'KSP_DEC', code: 'CR-003', type: 'decision', title: 'Otorisasi Alokasi oleh Askep', reqId: 'RN-RCV-KSP017', role: 'Asisten Kepala' },
        { id: 'KSP_03', code: 'CR-004', type: 'process', title: 'Eksekusi Muat oleh Mantri Bibitan', reqId: 'RN-RCV-KSP019', role: 'Mantri Bibitan' },
        { id: 'KSP_04', code: 'CR-005', type: 'process', title: 'Konfirmasi Terima Kebun Sepupu', reqId: 'RN-RCV-KSP018', role: 'Pengurus' },
        { id: 'KSP_END', code: 'END', type: 'end', title: 'Transaksi Cross-Estate Tuntas', reqId: 'RN-RCV-KSP020', role: 'Pengurus' }
      ],
      edges: [
        { id: 'E_KSP_01', fromNode: 'KSP_01', toNode: 'KSP_02', label: 'Ajukan Permohonan' },
        { id: 'E_KSP_02', fromNode: 'KSP_02', toNode: 'KSP_DEC', label: 'Review Kuota' },
        { id: 'E_KSP_03', fromNode: 'KSP_DEC', toNode: 'KSP_03', label: 'Approve' },
        { id: 'E_KSP_04', fromNode: 'KSP_DEC', toNode: 'KSP_01', label: 'Reject' },
        { id: 'E_KSP_05', fromNode: 'KSP_03', toNode: 'KSP_04', label: 'Muat & Kirim' },
        { id: 'E_KSP_06', fromNode: 'KSP_04', toNode: 'KSP_END', label: 'Konfirmasi Terima' }
      ]
    },
    '02-penerimaan/terima-mata-entres': {
      title: 'Flow Proses - Penerimaan Mata Entres',
      nodes: [
        { id: 'TME_01', code: 'CR-001', type: 'start', title: 'Permintaan Entres Kebun Sepupu', reqId: 'RN-RCV-ME021', role: 'Pengurus' },
        { id: 'TME_02', code: 'CR-002', type: 'process', title: 'Verifikasi Plot & Klon Askep', reqId: 'RN-RCV-ME022', role: 'Asisten Kepala' },
        { id: 'TME_DEC', code: 'CR-003', type: 'decision', title: 'Persetujuan Pengiriman Entres', reqId: 'RN-RCV-ME023', role: 'Asisten Kepala' },
        { id: 'TME_03', code: 'CR-004', type: 'process', title: 'Panen & Kemas Mata Entres Mantri', reqId: 'RN-RCV-ME025', role: 'Mantri Bibitan' },
        { id: 'TME_04', code: 'CR-005', type: 'process', title: 'Penerimaan Entres di Lokasi Tujuan', reqId: 'RN-RCV-ME024', role: 'Pengurus' },
        { id: 'TME_END', code: 'END', type: 'end', title: 'Entres Siap Digunakan Okulasi', reqId: 'RN-RCV-ME026', role: 'Pengurus' }
      ],
      edges: [
        { id: 'E_TME_01', fromNode: 'TME_01', toNode: 'TME_02', label: 'Kirim Permintaan' },
        { id: 'E_TME_02', fromNode: 'TME_02', toNode: 'TME_DEC', label: 'Cek Ketersediaan' },
        { id: 'E_TME_03', fromNode: 'TME_DEC', toNode: 'TME_03', label: 'Disetujui' },
        { id: 'E_TME_04', fromNode: 'TME_DEC', toNode: 'TME_01', label: 'Ditolak' },
        { id: 'E_TME_05', fromNode: 'TME_03', toNode: 'TME_04', label: 'Kemas & Kirim' },
        { id: 'E_TME_06', fromNode: 'TME_04', toNode: 'TME_END', label: 'Diterima' }
      ]
    },
    '03-penyemaian/semai-bedengan': {
      title: 'Flow Proses - Penyemaian Benih di Bedengan',
      nodes: [
        { id: 'SM_START', code: 'START', type: 'start', title: 'Alokasi Dokumen Penerimaan', reqId: 'RN-SEM-001', role: 'Mantri Bibitan' },
        { id: 'SM_01', code: 'P-001', type: 'process', title: 'Scan QR Code Plang Bedengan', reqId: 'RN-SEM-002', role: 'Mantri Bibitan' },
        { id: 'SM_02', code: 'P-002', type: 'process', title: 'Input Jumlah Butir Benih', reqId: 'RN-SEM-003', role: 'Mantri Bibitan' },
        { id: 'SM_03', code: 'P-003', type: 'process', title: 'Foto Bukti Benih Reject & Rusak', reqId: 'RN-SEM-004', role: 'Mantri Bibitan' },
        { id: 'SM_04', code: 'P-004', type: 'verification', title: 'Persetujuan Penaburan Asisten', reqId: 'RN-SEM-005', role: 'Asisten Bibitan' },
        { id: 'SM_05', code: 'P-005', type: 'process', title: 'Transplanting ke Polybag (Rasio 2)', reqId: 'RN-SEM-006', role: 'Mantri Bibitan' },
        { id: 'SM_06', code: 'P-006', type: 'process', title: 'Konsolidasi Multi-Bedengan ke Batch', reqId: 'RN-SEM-007', role: 'Mantri Bibitan' },
        { id: 'SM_END', code: 'END', type: 'end', title: 'Batch Polybag Terdaftar Resmi', reqId: 'RN-SEM-008', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_SM_01', fromNode: 'SM_START', toNode: 'SM_01', label: 'Pilih Dokumen' },
        { id: 'E_SM_02', fromNode: 'SM_01', toNode: 'SM_02', label: 'QR Valid' },
        { id: 'E_SM_03', fromNode: 'SM_02', toNode: 'SM_03', label: 'Input Selesai' },
        { id: 'E_SM_04', fromNode: 'SM_03', toNode: 'SM_04', label: 'Kirim Verifikasi' },
        { id: 'E_SM_05', fromNode: 'SM_04', toNode: 'SM_05', label: 'Asisten Setuju' },
        { id: 'E_SM_06', fromNode: 'SM_05', toNode: 'SM_06', label: 'Transplanting' },
        { id: 'E_SM_07', fromNode: 'SM_06', toNode: 'SM_END', label: 'Batch Terbentuk' }
      ]
    },
    '03-penyemaian/transplanting-polybag': {
      title: 'Flow Proses - Transplanting Polybag & Pemeliharaan Seedling',
      nodes: [
        { id: 'TP_START', code: 'START', type: 'start', title: 'Alokasi Dokumen Penerimaan Polybag', reqId: 'RN-SEM-TP028', role: 'Mantri Bibitan' },
        { id: 'TP_01', code: 'P-001', type: 'process', title: 'Pilih Batch Bedengan Asal', reqId: 'RN-SEM-TP029', role: 'Mantri Bibitan' },
        { id: 'TP_02', code: 'P-002', type: 'process', title: 'Scan QR Blok Polybag', reqId: 'RN-SEM-TP030', role: 'Mantri Bibitan' },
        { id: 'TP_03', code: 'P-003', type: 'process', title: 'Pencatatan Kuantitas Transplanting', reqId: 'RN-SEM-TP031', role: 'Mantri Bibitan' },
        { id: 'TP_04', code: 'P-004', type: 'process', title: 'Pencatatan Tenaga Kerja & HK', reqId: 'RN-SEM-TP033', role: 'Mantri Bibitan' },
        { id: 'TP_05', code: 'P-005', type: 'process', title: 'Foto Dokumentasi Blok Polybag', reqId: 'RN-SEM-TP034', role: 'Mantri Bibitan' },
        { id: 'TP_06', code: 'P-006', type: 'verification', title: 'Verifikasi Lapangan Asisten', reqId: 'RN-SEM-TP032', role: 'Asisten Bibitan' },
        { id: 'TP_07', code: 'P-007', type: 'process', title: 'Transfer Tahap Pertumbuhan Seedling', reqId: 'RN-SEM-TP036', role: 'Asisten Bibitan' },
        { id: 'TP_END', code: 'END', type: 'end', title: 'Seedling Siap Siklus Okulasi', reqId: 'RN-SEM-TP035', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_TP_01', fromNode: 'TP_START', toNode: 'TP_01', label: 'Buka Dokumen' },
        { id: 'E_TP_02', fromNode: 'TP_01', toNode: 'TP_02', label: 'Pilih Batch' },
        { id: 'E_TP_03', fromNode: 'TP_02', toNode: 'TP_03', label: 'QR Valid' },
        { id: 'E_TP_04', fromNode: 'TP_03', toNode: 'TP_04', label: 'Input Jumlah' },
        { id: 'E_TP_05', fromNode: 'TP_04', toNode: 'TP_05', label: 'Alokasi HK' },
        { id: 'E_TP_06', fromNode: 'TP_05', toNode: 'TP_06', label: 'Kirim Verifikasi' },
        { id: 'E_TP_07', fromNode: 'TP_06', toNode: 'TP_07', label: 'Asisten Setuju' },
        { id: 'E_TP_08', fromNode: 'TP_07', toNode: 'TP_END', label: 'Status: Siap Okulasi' }
      ]
    },
    '04-okulasi/grafting': {
      title: 'Flow Proses - Okulasi Grafting Utama',
      nodes: [
        { id: 'N_START', code: 'START', type: 'start', title: 'Pilih Batch Batang Bawah', reqId: 'RN-OKL-001', role: 'Mantri Bibitan' },
        { id: 'N_P002', code: 'P-002', type: 'process', title: 'Validasi QR Plang Batch', reqId: 'RN-OKL-002', role: 'Mantri Bibitan' },
        { id: 'N_P003', code: 'P-003', type: 'process', title: 'Tampilkan Saldo Populasi Batch', reqId: 'RN-OKL-003', role: 'Mantri Bibitan' },
        { id: 'N_P004', code: 'P-004', type: 'process', title: 'Catat Identitas Juru Okulasi', reqId: 'RN-OKL-004', role: 'Mantri Bibitan' },
        { id: 'N_QC', code: 'QC-001', type: 'process', title: 'Kalibrasi Standar Irisan Okulasi', reqId: 'RN-OKL-029', role: 'Tekniker I' },
        { id: 'N_P005', code: 'P-005', type: 'process', title: 'Validasi Kemurnian Varietas Klon', reqId: 'RN-OKL-005', role: 'Mantri Bibitan' },
        { id: 'N_P006', code: 'P-006', type: 'process', title: 'Hitung Estimasi Kebutuhan Entres', reqId: 'RN-OKL-006', role: 'Mantri Bibitan' },
        { id: 'N_P007', code: 'P-007', type: 'process', title: 'Potong Saldo Stok Mata Entres', reqId: 'RN-OKL-007', role: 'Mantri Bibitan' },
        { id: 'N_P008', code: 'P-008', type: 'process', title: 'Input Jumlah Batang Kayu Entres', reqId: 'RN-OKL-008', role: 'Mantri Bibitan' },
        { id: 'N_P009', code: 'P-009', type: 'process', title: 'Tampilkan Indeks Rasio Entres', reqId: 'RN-OKL-009', role: 'Mantri Bibitan' },
        { id: 'N_P010', code: 'P-010', type: 'process', title: 'Catat Mata Entres Aktual Dipakai', reqId: 'RN-OKL-010', role: 'Mantri Bibitan' },
        { id: 'N_P011', code: 'P-011', type: 'process', title: 'Foto Fisik Penempelan & Ikatan', reqId: 'RN-OKL-011', role: 'Mantri Bibitan' },
        { id: 'N_P012', code: 'P-012', type: 'process', title: 'Kirim Berkas ke Antrean Asisten', reqId: 'RN-OKL-012', role: 'Mantri Bibitan' },
        { id: 'N_P013', code: 'P-013', type: 'verification', title: 'Pemeriksaan Lapangan Asisten', reqId: 'RN-OKL-013', role: 'Asisten Bibitan' },
        { id: 'N_P014', code: 'P-014', type: 'process', title: 'Pemotongan Resmi Stok Database', reqId: 'RN-OKL-014', role: 'Mantri Bibitan' },
        { id: 'N_END', code: 'END', type: 'end', title: 'Okulasi Grafting Berhasil Tuntas', reqId: 'RN-OKL-015', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_OKL_01', fromNode: 'N_START', toNode: 'N_P002', label: 'Pilih Batch' },
        { id: 'E_OKL_02', fromNode: 'N_P002', toNode: 'N_P003', label: 'QR Valid' },
        { id: 'E_OKL_03', fromNode: 'N_P003', toNode: 'N_P004', label: 'Populasi Sesuai' },
        { id: 'E_OKL_04', fromNode: 'N_P004', toNode: 'N_QC', label: 'Juru Okulasi Siap' },
        { id: 'E_OKL_05', fromNode: 'N_QC', toNode: 'N_P005', label: 'Standar QC Valid' },
        { id: 'E_OKL_06', fromNode: 'N_P005', toNode: 'N_P006', label: 'Klon Sesuai' },
        { id: 'E_OKL_07', fromNode: 'N_P006', toNode: 'N_P007', label: 'Estimasi Ok' },
        { id: 'E_OKL_08', fromNode: 'N_P007', toNode: 'N_P008', label: 'Alokasi Stok' },
        { id: 'E_OKL_09', fromNode: 'N_P008', toNode: 'N_P009', label: 'Input Kayu' },
        { id: 'E_OKL_10', fromNode: 'N_P009', toNode: 'N_P010', label: 'Rasio Valid' },
        { id: 'E_OKL_11', fromNode: 'N_P010', toNode: 'N_P011', label: 'Catat Aktual' },
        { id: 'E_OKL_12', fromNode: 'N_P011', toNode: 'N_P012', label: 'Foto + Timestamp' },
        { id: 'E_OKL_13', fromNode: 'N_P012', toNode: 'N_P013', label: 'Kirim Verifikasi' },
        { id: 'E_OKL_14', fromNode: 'N_P013', toNode: 'N_P014', label: 'Asisten Approve' },
        { id: 'E_OKL_15', fromNode: 'N_P014', toNode: 'N_END', label: 'Stok Terpotong' }
      ]
    },
    '04-okulasi/regrafting': {
      title: 'Flow Proses - Okulasi Ulang (Regrafting)',
      nodes: [
        { id: 'RG_START', code: 'START', type: 'start', title: 'Inisialisasi Okulasi Ulang', reqId: 'RN-REG-000', role: 'Mantri Bibitan' },
        { id: 'RG_01', code: 'P-001', type: 'process', title: 'Pilih Dokumen Pemeriksaan Gagal', reqId: 'RN-REG-001', role: 'Mantri Bibitan' },
        { id: 'RG_02', code: 'P-002', type: 'process', title: 'Validasi QR Batch Regrafting', reqId: 'RN-REG-002', role: 'Mantri Bibitan' },
        { id: 'RG_03', code: 'P-003', type: 'process', title: 'Periksa Kuota Batang Gagal', reqId: 'RN-REG-003', role: 'Mantri Bibitan' },
        { id: 'RG_04', code: 'P-004', type: 'process', title: 'Input Jumlah Regrafting & Juru', reqId: 'RN-REG-004', role: 'Mantri Bibitan' },
        { id: 'RG_05', code: 'P-005', type: 'process', title: 'Scan QR Plot Kebun Entres', reqId: 'RN-REG-005', role: 'Mantri Bibitan' },
        { id: 'RG_06', code: 'P-006', type: 'process', title: 'Catat Mata Entres Regrafting', reqId: 'RN-REG-006', role: 'Mantri Bibitan' },
        { id: 'RG_07', code: 'P-007', type: 'process', title: 'Foto Dokumentasi Ikatan Regrafting', reqId: 'RN-REG-007', role: 'Mantri Bibitan' },
        { id: 'RG_08', code: 'P-008', type: 'process', title: 'Kirim Berkas ke Antrean Asisten', reqId: 'RN-REG-008', role: 'Mantri Bibitan' },
        { id: 'RG_09', code: 'P-009', type: 'verification', title: 'Pemeriksaan Mutu Tempelan Ulang', reqId: 'RN-REG-009', role: 'Asisten Bibitan' },
        { id: 'RG_10', code: 'P-010', type: 'process', title: 'Pemotongan Resmi Stok Entres', reqId: 'RN-REG-010', role: 'Mantri Bibitan' },
        { id: 'RG_END', code: 'END', type: 'end', title: 'Regrafting Selesai & Siap Diperiksa', reqId: 'RN-REG-011', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_RG_01', fromNode: 'RG_START', toNode: 'RG_01', label: 'Buka Form' },
        { id: 'E_RG_02', fromNode: 'RG_01', toNode: 'RG_02', label: 'Pilih Dokumen' },
        { id: 'E_RG_03', fromNode: 'RG_02', toNode: 'RG_03', label: 'QR Valid' },
        { id: 'E_RG_04', fromNode: 'RG_03', toNode: 'RG_04', label: 'Kuota Sesuai' },
        { id: 'E_RG_05', fromNode: 'RG_04', toNode: 'RG_05', label: 'Input Batang' },
        { id: 'E_RG_06', fromNode: 'RG_05', toNode: 'RG_06', label: 'Scan Entres' },
        { id: 'E_RG_07', fromNode: 'RG_06', toNode: 'RG_07', label: 'Catat Kebutuhan' },
        { id: 'E_RG_08', fromNode: 'RG_07', toNode: 'RG_08', label: 'Foto + Timestamp' },
        { id: 'E_RG_09', fromNode: 'RG_08', toNode: 'RG_09', label: 'Kirim Verifikasi' },
        { id: 'E_RG_10', fromNode: 'RG_09', toNode: 'RG_10', label: 'Asisten Approve' },
        { id: 'E_RG_11', fromNode: 'RG_10', toNode: 'RG_END', label: 'Stok Terpotong' }
      ]
    },
    '05-pemeriksaan/periksa-grafting': {
      title: 'Flow Proses - Pemeriksaan Bertahap Okulasi Grafting',
      nodes: [
        { id: 'CHK_START', code: 'START', type: 'start', title: 'Inisialisasi Jadwal Pemeriksaan', reqId: 'RN-CHK-001', role: 'Mantri Bibitan' },
        { id: 'CHK_01', code: 'P-001', type: 'process', title: 'Identifikasi Tindak Lanjut Gagal', reqId: 'RN-CHK-002', role: 'Mantri Bibitan' },
        { id: 'CHK_02', code: 'P-002', type: 'process', title: 'Validasi QR Code Batch', reqId: 'RN-CHK-003', role: 'Mantri Bibitan' },
        { id: 'CHK_03', code: 'P-003', type: 'process', title: 'Input Jumlah Batang Sesi Periksa', reqId: 'RN-CHK-004', role: 'Mantri Bibitan' },
        { id: 'CHK_04', code: 'P-004', type: 'process', title: 'Catat Jumlah Mata Tempelan Hijau', reqId: 'RN-CHK-005', role: 'Mantri Bibitan' },
        { id: 'CHK_05', code: 'P-005', type: 'decision', title: 'Tindak Lanjut Mata Gagal (Regraft/Afkir)', reqId: 'RN-CHK-006', role: 'Mantri Bibitan' },
        { id: 'CHK_06', code: 'P-006', type: 'process', title: 'Foto Dokumentasi Tempelan & Sampel', reqId: 'RN-CHK-007', role: 'Mantri Bibitan' },
        { id: 'CHK_07', code: 'P-007', type: 'verification', title: 'Verifikasi Hasil Periksa oleh Asisten', reqId: 'RN-CHK-008', role: 'Asisten Bibitan' },
        { id: 'CHK_END', code: 'END', type: 'end', title: 'Pemeriksaan Tuntas - Update Status', reqId: 'RN-CHK-009', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_CHK_01', fromNode: 'CHK_START', toNode: 'CHK_01', label: 'Buka Form' },
        { id: 'E_CHK_02', fromNode: 'CHK_01', toNode: 'CHK_02', label: 'Jadwal Hari Ke-21' },
        { id: 'E_CHK_03', fromNode: 'CHK_02', toNode: 'CHK_03', label: 'QR Valid' },
        { id: 'E_CHK_04', fromNode: 'CHK_03', toNode: 'CHK_04', label: 'Hitung Batang' },
        { id: 'E_CHK_05', fromNode: 'CHK_04', toNode: 'CHK_05', label: 'Catat Sukses' },
        { id: 'E_CHK_06', fromNode: 'CHK_05', toNode: 'CHK_06', label: 'Klasifikasi Gagal' },
        { id: 'E_CHK_07', fromNode: 'CHK_06', toNode: 'CHK_07', label: 'Kirim Verifikasi' },
        { id: 'E_CHK_08', fromNode: 'CHK_07', toNode: 'CHK_END', label: 'Asisten Approve' }
      ]
    },
    '05-pemeriksaan/periksa-regrafting': {
      title: 'Flow Proses - Pemeriksaan Okulasi Ulang (Regrafting)',
      nodes: [
        { id: 'CHKR_START', code: 'START', type: 'start', title: 'Inisialisasi Pemeriksaan Regrafting', reqId: 'RN-CHK-RG036', role: 'Mantri Bibitan' },
        { id: 'CHKR_01', code: 'P-001', type: 'process', title: 'Identifikasi Bibit Gagal Regrafting', reqId: 'RN-CHK-RG037', role: 'Mantri Bibitan' },
        { id: 'CHKR_02', code: 'P-002', type: 'process', title: 'Validasi QR Batch Regrafting', reqId: 'RN-CHK-RG038', role: 'Mantri Bibitan' },
        { id: 'CHKR_03', code: 'P-003', type: 'process', title: 'Input Jumlah Batang Sesi Periksa', reqId: 'RN-CHK-RG039', role: 'Mantri Bibitan' },
        { id: 'CHKR_04', code: 'P-004', type: 'process', title: 'Catat Jumlah Tempelan Hijau', reqId: 'RN-CHK-RG040', role: 'Mantri Bibitan' },
        { id: 'CHKR_05', code: 'P-005', type: 'decision', title: 'Tindak Lanjut Batang Gagal Regrafting', reqId: 'RN-CHK-RG041', role: 'Mantri Bibitan' },
        { id: 'CHKR_06', code: 'P-006', type: 'process', title: 'Foto Bukti Fisik & Geotagging', reqId: 'RN-CHK-RG042', role: 'Mantri Bibitan' },
        { id: 'CHKR_07', code: 'P-007', type: 'verification', title: 'Verifikasi Lapangan Asisten', reqId: 'RN-CHK-RG043', role: 'Asisten Bibitan' },
        { id: 'CHKR_END', code: 'END', type: 'end', title: 'Pemeriksaan Regrafting Tuntas', reqId: 'RN-CHK-RG044', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_CHKR_01', fromNode: 'CHKR_START', toNode: 'CHKR_01', label: 'Buka Jadwal' },
        { id: 'E_CHKR_02', fromNode: 'CHKR_01', toNode: 'CHKR_02', label: 'Cek Riwayat' },
        { id: 'E_CHKR_03', fromNode: 'CHKR_02', toNode: 'CHKR_03', label: 'QR Valid' },
        { id: 'E_CHKR_04', fromNode: 'CHKR_03', toNode: 'CHKR_04', label: 'Hitung Batang' },
        { id: 'E_CHKR_05', fromNode: 'CHKR_04', toNode: 'CHKR_05', label: 'Catat Sukses' },
        { id: 'E_CHKR_06', fromNode: 'CHKR_05', toNode: 'CHKR_06', label: 'Tentukan Status' },
        { id: 'E_CHKR_07', fromNode: 'CHKR_06', toNode: 'CHKR_07', label: 'Kirim Verifikasi' },
        { id: 'E_CHKR_08', fromNode: 'CHKR_07', toNode: 'CHKR_END', label: 'Asisten Approve' }
      ]
    },
    '06-penyeleksian/seleksi-batch': {
      title: 'Flow Proses - Penyeleksian Batch Polybag & Klasifikasi Mutu',
      nodes: [
        { id: 'SEL_START', code: 'START', type: 'start', title: 'Perekaman Usulan Seleksi Afkir Mantri', reqId: 'RN-SEL-001', role: 'Mantri Bibitan' },
        { id: 'SEL_02', code: 'P-002', type: 'process', title: 'Scan QR Form Penilaian Visual Batch', reqId: 'RN-SEL-003', role: 'Mantri Bibitan' },
        { id: 'SEL_03', code: 'P-003', type: 'process', title: 'Sajian Data Historis & Populasi Batch', reqId: 'RN-SEL-004', role: 'Mantri Bibitan' },
        { id: 'SEL_04', code: 'P-004', type: 'process', title: 'Input 3 Grade Mutu (Siap Salur/Tunda/Afkir)', reqId: 'RN-SEL-005', role: 'Mantri Bibitan' },
        { id: 'SEL_05', code: 'P-005', type: 'process', title: 'Foto Dokumentasi Fisik Bibit Afkir', reqId: 'RN-SEL-006', role: 'Mantri Bibitan' },
        { id: 'SEL_06', code: 'P-006', type: 'process', title: 'Kirim Berkas Usulan Seleksi ke Asisten', reqId: 'RN-SEL-007', role: 'Mantri Bibitan' },
        { id: 'SEL_07', code: 'P-007', type: 'verification', title: 'Pemeriksaan Fisik Lapangan oleh Asisten', reqId: 'RN-SEL-008', role: 'Asisten Bibitan' },
        { id: 'SEL_08', code: 'P-008', type: 'verification', title: 'Verifikasi Kuantitas & Kriteria Afkir', reqId: 'RN-SEL-009', role: 'Asisten Bibitan' },
        { id: 'SEL_09', code: 'P-009', type: 'verification', title: 'Asisten Bibitan Setujui Hasil Seleksi', reqId: 'RN-SEL-010', role: 'Asisten Bibitan' },
        { id: 'SEL_10', code: 'P-010', type: 'decision', title: 'Otorisasi Berita Acara Pemusnahan Askep', reqId: 'RN-SEL-012', role: 'Asisten Kepala' },
        { id: 'SEL_11', code: 'P-011', type: 'process', title: 'Verifikasi Transfer Batch Bibitan', reqId: 'RN-SEL-013', role: 'Asisten Bibitan' },
        { id: 'SEL_12', code: 'P-012', type: 'process', title: 'Pemeriksaan Berkala Stok Siap Salur vs RKAP', reqId: 'RN-SEL-014', role: 'Asisten Kepala' },
        { id: 'SEL_END', code: 'END', type: 'end', title: 'Populasi Batch Resmi Terkoreksi', reqId: 'RN-SEL-011', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_SEL_01', fromNode: 'SEL_START', toNode: 'SEL_02', label: 'Buka Form Seleksi' },
        { id: 'E_SEL_02', fromNode: 'SEL_02', toNode: 'SEL_03', label: 'QR Valid' },
        { id: 'E_SEL_03', fromNode: 'SEL_03', toNode: 'SEL_04', label: 'Tampil Populasi' },
        { id: 'E_SEL_04', fromNode: 'SEL_04', toNode: 'SEL_05', label: 'Klasifikasi Grade' },
        { id: 'E_SEL_05', fromNode: 'SEL_05', toNode: 'SEL_06', label: 'Foto Bukti Afkir' },
        { id: 'E_SEL_06', fromNode: 'SEL_06', toNode: 'SEL_07', label: 'Kirim ke Asisten' },
        { id: 'E_SEL_07', fromNode: 'SEL_07', toNode: 'SEL_08', label: 'Cek Fisik Lapangan' },
        { id: 'E_SEL_08', fromNode: 'SEL_08', toNode: 'SEL_09', label: 'Kuantitas Klop' },
        { id: 'E_SEL_09', fromNode: 'SEL_09', toNode: 'SEL_10', label: 'Susun BA Pemusnahan' },
        { id: 'E_SEL_10', fromNode: 'SEL_10', toNode: 'SEL_11', label: 'Askep Otorisasi' },
        { id: 'E_SEL_11', fromNode: 'SEL_11', toNode: 'SEL_12', label: 'Transfer Batch Grade' },
        { id: 'E_SEL_12', fromNode: 'SEL_12', toNode: 'SEL_END', label: 'Sinkron Stok Siap Salur' }
      ]
    },
    '07-kebun-entres/entres-menunas': {
      title: 'Flow Proses - Menunas Kebun Entres',
      nodes: [
        { id: 'MN_START', code: 'START', type: 'start', title: 'Scan QR Plang Plot Entres', reqId: 'RN-ENT-002', role: 'Mantri Bibitan' },
        { id: 'MN_QC', code: 'QC-001', type: 'process', title: 'Audit Kemurnian Clone Entres', reqId: 'RN-ENT-008', role: 'Tekniker I' },
        { id: 'MN_02', code: 'P-002', type: 'process', title: 'Tampilkan Data Clone & Pokok', reqId: 'RN-ENT-003', role: 'Mantri Bibitan' },
        { id: 'MN_03', code: 'P-003', type: 'process', title: 'Input Variabel Menunas (Perisai/Cabang)', reqId: 'RN-ENT-004', role: 'Mantri Bibitan' },
        { id: 'MN_04', code: 'P-004', type: 'process', title: 'Kalkulasi Otomatis Rata-rata Perisai', reqId: 'RN-ENT-005', role: 'Mantri Bibitan' },
        { id: 'MN_05', code: 'P-005', type: 'verification', title: 'Foto Dokumentasi & Verifikasi Asisten', reqId: 'RN-ENT-006', role: 'Asisten Bibitan' },
        { id: 'MN_END', code: 'END', type: 'end', title: 'Plot Entres Terawat & Siap Panen', reqId: 'RN-ENT-007', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_MN_01', fromNode: 'MN_START', toNode: 'MN_QC', label: 'Scan QR Plot' },
        { id: 'E_MN_02', fromNode: 'MN_QC', toNode: 'MN_02', label: 'Clone Murni Terverifikasi' },
        { id: 'E_MN_03', fromNode: 'MN_02', toNode: 'MN_03', label: 'Tampil Data Pokok' },
        { id: 'E_MN_04', fromNode: 'MN_03', toNode: 'MN_04', label: 'Input Parameter' },
        { id: 'E_MN_05', fromNode: 'MN_04', toNode: 'MN_05', label: 'Hitung Rata-rata' },
        { id: 'E_MN_06', fromNode: 'MN_05', toNode: 'MN_END', label: 'Asisten Approve' }
      ]
    },
    '07-kebun-entres/entres-topping': {
      title: 'Flow Proses - Topping Plot Entres',
      nodes: [
        { id: 'TOP_START', code: 'START', type: 'start', title: 'Inisialisasi Aktivitas Topping', reqId: 'RN-ENT-TOP045', role: 'Mantri Bibitan' },
        { id: 'TOP_01', code: 'P-001', type: 'process', title: 'Scan QR Code Plot Entres', reqId: 'RN-ENT-TOP046', role: 'Mantri Bibitan' },
        { id: 'TOP_02', code: 'P-002', type: 'process', title: 'Tampilkan Data Pokok & Clone', reqId: 'RN-ENT-TOP047', role: 'Mantri Bibitan' },
        { id: 'TOP_03', code: 'P-003', type: 'process', title: 'Input Kayu Okulasi & Panjang Meter', reqId: 'RN-ENT-TOP048', role: 'Mantri Bibitan' },
        { id: 'TOP_04', code: 'P-004', type: 'process', title: 'Kalkulasi Rasio Perisai/Kayu', reqId: 'RN-ENT-TOP049', role: 'Mantri Bibitan' },
        { id: 'TOP_05', code: 'P-005', type: 'verification', title: 'Foto Dokumentasi & Verifikasi Asisten', reqId: 'RN-ENT-TOP050', role: 'Asisten Bibitan' },
        { id: 'TOP_END', code: 'END', type: 'end', title: 'Topping Selesai - Mutu Terjaga', reqId: 'RN-ENT-TOP051', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_TOP_01', fromNode: 'TOP_START', toNode: 'TOP_01', label: 'Buka Modul' },
        { id: 'E_TOP_02', fromNode: 'TOP_01', toNode: 'TOP_02', label: 'QR Valid' },
        { id: 'E_TOP_03', fromNode: 'TOP_02', toNode: 'TOP_03', label: 'Data Pokok Valid' },
        { id: 'E_TOP_04', fromNode: 'TOP_03', toNode: 'TOP_04', label: 'Input Variabel' },
        { id: 'E_TOP_05', fromNode: 'TOP_04', toNode: 'TOP_05', label: 'Hitung Rasio' },
        { id: 'E_TOP_06', fromNode: 'TOP_05', toNode: 'TOP_END', label: 'Asisten Approve' }
      ]
    },
    '08-panen-mata-entres/panen-entres': {
      title: 'Flow Proses - Panen Mata Entres',
      nodes: [
        { id: 'PN_START', code: 'START', type: 'start', title: 'Inisialisasi Panen Mata Entres', reqId: 'RN-HAR-001', role: 'Mantri Bibitan' },
        { id: 'PN_01', code: 'P-001', type: 'process', title: 'Validasi QR Code Plot Entres', reqId: 'RN-HAR-002', role: 'Mantri Bibitan' },
        { id: 'PN_02', code: 'P-002', type: 'process', title: 'Input Jumlah Cabang Entres Dipotong', reqId: 'RN-HAR-003', role: 'Mantri Bibitan' },
        { id: 'PN_03', code: 'P-003', type: 'process', title: 'Kalkulasi Nilai Estimasi Mata Entres', reqId: 'RN-HAR-004', role: 'Mantri Bibitan' },
        { id: 'PN_04', code: 'P-004', type: 'process', title: 'Pencatatan Jumlah Mata Entres Aktual', reqId: 'RN-HAR-005', role: 'Mantri Bibitan' },
        { id: 'PN_05', code: 'P-005', type: 'process', title: 'Foto Ikatan Cabang Kayu Entres', reqId: 'RN-HAR-006', role: 'Mantri Bibitan' },
        { id: 'PN_06', code: 'P-006', type: 'verification', title: 'Pemeriksaan Mutu Fisik Asisten', reqId: 'RN-HAR-007', role: 'Asisten Bibitan' },
        { id: 'PN_END', code: 'END', type: 'end', title: 'Mata Entres Siap Dialokasikan', reqId: 'RN-HAR-008', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_PN_01', fromNode: 'PN_START', toNode: 'PN_01', label: 'Buka Form' },
        { id: 'E_PN_02', fromNode: 'PN_01', toNode: 'PN_02', label: 'QR Valid' },
        { id: 'E_PN_03', fromNode: 'PN_02', toNode: 'PN_03', label: 'Input Cabang' },
        { id: 'E_PN_04', fromNode: 'PN_03', toNode: 'PN_04', label: 'Hitung Estimasi' },
        { id: 'E_PN_05', fromNode: 'PN_04', toNode: 'PN_05', label: 'Catat Riil' },
        { id: 'E_PN_06', fromNode: 'PN_05', toNode: 'PN_06', label: 'Foto + Timestamp' },
        { id: 'E_PN_07', fromNode: 'PN_06', toNode: 'PN_END', label: 'Asisten Approve' }
      ]
    },
    '09-material-bahan/monitoring-stok-entres': {
      title: 'Flow Proses - Monitoring Mutasi Stok Entres',
      nodes: [
        { id: 'MB_START', code: 'START', type: 'start', title: 'Pilih Plot Entres & Klon', reqId: 'RN-MAT-001', role: 'Mantri Bibitan' },
        { id: 'MB_01', code: 'P-001', type: 'process', title: 'Tampilkan Saldo Stok Tersedia', reqId: 'RN-MAT-002', role: 'Mantri Bibitan' },
        { id: 'MB_02', code: 'P-002', type: 'process', title: 'Audit Mutasi Tambah (+ Panen)', reqId: 'RN-MAT-003', role: 'Mantri Bibitan' },
        { id: 'MB_03', code: 'P-003', type: 'process', title: 'Audit Mutasi Kurang (- Okulasi)', reqId: 'RN-MAT-004', role: 'Mantri Bibitan' },
        { id: 'MB_04', code: 'P-004', type: 'process', title: 'Validasi Rekonsiliasi Kartu Stok', reqId: 'RN-MAT-005', role: 'Mantri Bibitan' },
        { id: 'MB_05', code: 'P-005', type: 'process', title: 'Notifikasi Sinkronisasi Berhasil', reqId: 'RN-MAT-006', role: 'Mantri Bibitan' },
        { id: 'MB_END', code: 'END', type: 'end', title: 'Mutasi Stok Entres Tuntas & Sah', reqId: 'RN-MAT-007', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_MB_01', fromNode: 'MB_START', toNode: 'MB_01', label: 'Pilih Plot' },
        { id: 'E_MB_02', fromNode: 'MB_01', toNode: 'MB_02', label: 'Tampil Saldo' },
        { id: 'E_MB_03', fromNode: 'MB_02', toNode: 'MB_03', label: 'Cek Tambah' },
        { id: 'E_MB_04', fromNode: 'MB_03', toNode: 'MB_04', label: 'Cek Kurang' },
        { id: 'E_MB_05', fromNode: 'MB_04', toNode: 'MB_05', label: 'Rekonsiliasi Valid' },
        { id: 'E_MB_06', fromNode: 'MB_05', toNode: 'MB_END', label: 'Sinkron Selesai' }
      ]
    },
    '09-material-bahan/material-gudang-matching': {
      title: 'Flow Proses - Matching Material Gudang (BKB)',
      nodes: [
        { id: 'MMG_START', code: 'START', type: 'start', title: 'Buka Dokumen Matching Gudang', reqId: 'RN-MAT-MMG052', role: 'Mantri Bibitan' },
        { id: 'MMG_01', code: 'P-001', type: 'process', title: 'Pilih Rentang Waktu & Jenis Bahan', reqId: 'RN-MAT-MMG053', role: 'Mantri Bibitan' },
        { id: 'MMG_02', code: 'P-002', type: 'process', title: 'Tarik Alokasi Bahan Gudang (Pupuk/Kimia)', reqId: 'RN-MAT-MMG055', role: 'Mantri Bibitan' },
        { id: 'MMG_03', code: 'P-003', type: 'process', title: 'Pencocokan BKB vs Realisasi Heading', reqId: 'RN-MAT-MMG054', role: 'Mantri Bibitan' },
        { id: 'MMG_04', code: 'P-004', type: 'process', title: 'Validasi Batas Maksimum Alokasi BKB', reqId: 'RN-MAT-MMG056', role: 'Mantri Bibitan' },
        { id: 'MMG_05', code: 'P-005', type: 'verification', title: 'Approval BKB oleh Asisten Bibitan', reqId: 'RN-MAT-MMG059', role: 'Asisten Bibitan' },
        { id: 'MMG_06', code: 'P-006', type: 'verification', title: 'Audit Biaya Material oleh KTU', reqId: 'RN-MAT-MMG060', role: 'KTU' },
        { id: 'MMG_07', code: 'P-007', type: 'process', title: 'Notifikasi Matching BKB Sukses', reqId: 'RN-MAT-MMG057', role: 'Mantri Bibitan' },
        { id: 'MMG_END', code: 'END', type: 'end', title: 'Material Gudang Terbebankan Sah', reqId: 'RN-MAT-MMG058', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_MMG_01', fromNode: 'MMG_START', toNode: 'MMG_01', label: 'Buka Form' },
        { id: 'E_MMG_02', fromNode: 'MMG_01', toNode: 'MMG_02', label: 'Pilih Parameter' },
        { id: 'E_MMG_03', fromNode: 'MMG_02', toNode: 'MMG_03', label: 'Tarik BKB' },
        { id: 'E_MMG_04', fromNode: 'MMG_03', toNode: 'MMG_04', label: 'Cocokkan Heading' },
        { id: 'E_MMG_05', fromNode: 'MMG_04', toNode: 'MMG_05', label: 'Kirim ke Asisten' },
        { id: 'E_MMG_06', fromNode: 'MMG_05', toNode: 'MMG_06', label: 'Asisten Setuju' },
        { id: 'E_MMG_07', fromNode: 'MMG_06', toNode: 'MMG_07', label: 'Audit KTU Valid' },
        { id: 'E_MMG_08', fromNode: 'MMG_07', toNode: 'MMG_END', label: 'Tercatat Resmi' }
      ]
    },
    '10-rekam-pemeliharaan/pemeliharaan-heading': {
      title: 'Flow Proses - Rekam Pemeliharaan Tanaman (Heading Kerja)',
      nodes: [
        { id: 'PM_START', code: 'START', type: 'start', title: 'Buka Form Rekam Pemeliharaan Harian', reqId: 'RN-MNT-001', role: 'Mantri Bibitan' },
        { id: 'PM_01', code: 'P-001', type: 'process', title: 'Pilih Master Grup Heading Pemeliharaan', reqId: 'RN-MNT-002', role: 'Mantri Bibitan' },
        { id: 'PM_02', code: 'P-002', type: 'process', title: 'Scan QR Lokasi Blok/Bedengan Kerja', reqId: 'RN-MNT-003', role: 'Mantri Bibitan' },
        { id: 'PM_03', code: 'P-003', type: 'process', title: 'Perekaman Tenaga Kerja & Output Fisik', reqId: 'RN-MNT-004', role: 'Mantri Bibitan' },
        { id: 'PM_04', code: 'P-004', type: 'process', title: 'Foto Geotagging Koordinat & Timestamp', reqId: 'RN-MNT-005', role: 'Mantri Bibitan' },
        { id: 'PM_05', code: 'P-005', type: 'process', title: 'Tautkan Nomor BKB Material ke Heading', reqId: 'RN-MNT-006', role: 'Mantri Bibitan' },
        { id: 'PM_06', code: 'P-006', type: 'verification', title: 'Kirim Rekapitulasi ke Asisten Bibitan', reqId: 'RN-MNT-007', role: 'Asisten Bibitan' },
        { id: 'PM_07', code: 'P-007', type: 'process', title: 'Pencatatan Audit Trail Koreksi Transaksi', reqId: 'RN-MNT-009', role: 'Mantri Bibitan' },
        { id: 'PM_END', code: 'END', type: 'end', title: 'Aktivitas Pemeliharaan Selesai & Sah', reqId: 'RN-MNT-008', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_PM_01', fromNode: 'PM_START', toNode: 'PM_01', label: 'Buka Form' },
        { id: 'E_PM_02', fromNode: 'PM_01', toNode: 'PM_02', label: 'Pilih Heading' },
        { id: 'E_PM_03', fromNode: 'PM_02', toNode: 'PM_03', label: 'QR Valid' },
        { id: 'E_PM_04', fromNode: 'PM_03', toNode: 'PM_04', label: 'Catat Pekerja' },
        { id: 'E_PM_05', fromNode: 'PM_04', toNode: 'PM_05', label: 'Foto Bukti' },
        { id: 'E_PM_06', fromNode: 'PM_05', toNode: 'PM_06', label: 'Kaitkan BKB' },
        { id: 'E_PM_07', fromNode: 'PM_06', toNode: 'PM_07', label: 'Asisten Setuju' },
        { id: 'E_PM_08', fromNode: 'PM_07', toNode: 'PM_END', label: 'Log Audit Valid' }
      ]
    },
    '11-pengeluaran/pengeluaran-bibit': {
      title: 'Flow Proses - Pengeluaran Bibit SPB Disetujui',
      nodes: [
        { id: 'EXB_START', code: 'START', type: 'start', title: 'Pengajuan SPB Bibit Kebun Sendiri', reqId: 'RN-EXP-001', role: 'Asisten Divisi' },
        { id: 'EXB_01', code: 'P-001', type: 'process', title: 'Pilih Dokumen SPB Terverifikasi Askep', reqId: 'RN-EXP-002', role: 'Mantri Bibitan' },
        { id: 'EXB_02', code: 'P-002', type: 'process', title: 'Validasi QR Plang Batch Bibit', reqId: 'RN-EXP-003', role: 'Mantri Bibitan' },
        { id: 'EXB_03', code: 'P-003', type: 'process', title: 'Perekaman Muat Bibit & Verifikasi Armada', reqId: 'RN-EXP-004', role: 'Mantri Bibitan' },
        { id: 'EXB_04', code: 'P-004', type: 'process', title: 'Plotting Polygon Lokasi Tanam & Terima Divisi', reqId: 'RN-EXP-008', role: 'Asisten Divisi' },
        { id: 'EXB_05', code: 'P-005', type: 'verification', title: 'Rekonsiliasi Buku Stok & SPPB oleh KTU', reqId: 'RN-EXP-009', role: 'KTU' },
        { id: 'EXB_END', code: 'END', type: 'end', title: 'Armada Tuntas & Mutasi Stok Terbukukan', reqId: 'RN-EXP-007', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_EXB_01', fromNode: 'EXB_START', toNode: 'EXB_01', label: 'SPB Disetujui' },
        { id: 'E_EXB_02', fromNode: 'EXB_01', toNode: 'EXB_02', label: 'Pilih SPB' },
        { id: 'E_EXB_03', fromNode: 'EXB_02', toNode: 'EXB_03', label: 'QR Valid' },
        { id: 'E_EXB_04', fromNode: 'EXB_03', toNode: 'EXB_04', label: 'Muat Bibit' },
        { id: 'E_EXB_05', fromNode: 'EXB_04', toNode: 'EXB_05', label: 'Polygon Tanam Valid' },
        { id: 'E_EXB_06', fromNode: 'EXB_05', toNode: 'EXB_END', label: 'Audit KTU Klop' }
      ]
    },
    '11-pengeluaran/pengeluaran-mata-entres': {
      title: 'Flow Proses - Pengeluaran Mata Entres',
      nodes: [
        { id: 'EXM_START', code: 'START', type: 'start', title: 'Inisialisasi Pengeluaran Mata Entres', reqId: 'RN-EXM-001', role: 'Mantri Bibitan' },
        { id: 'EXM_01', code: 'P-001', type: 'process', title: 'Validasi QR Code Plot Entres Sumber', reqId: 'RN-EXM-002', role: 'Mantri Bibitan' },
        { id: 'EXM_02', code: 'P-002', type: 'process', title: 'Input Cabang & Kuantitas Mata Entres', reqId: 'RN-EXM-003', role: 'Mantri Bibitan' },
        { id: 'EXM_03', code: 'P-003', type: 'verification', title: 'Foto Ikatan & Verifikasi Asisten', reqId: 'RN-EXM-004', role: 'Asisten Bibitan' },
        { id: 'EXM_END', code: 'END', type: 'end', title: 'Entres Siap Dikirim ke Peminta', reqId: 'RN-EXM-005', role: 'Mantri Bibitan' }
      ],
      edges: [
        { id: 'E_EXM_01', fromNode: 'EXM_START', toNode: 'EXM_01', label: 'Buka Dokumen' },
        { id: 'E_EXM_02', fromNode: 'EXM_01', toNode: 'EXM_02', label: 'QR Valid' },
        { id: 'E_EXM_03', fromNode: 'EXM_02', toNode: 'EXM_03', label: 'Input Kuantitas' },
        { id: 'E_EXM_04', fromNode: 'EXM_03', toNode: 'EXM_END', label: 'Asisten Setuju' }
      ]
    }
  };

  for (const [key, flowDef] of Object.entries(FLOW_DEFINITIONS)) {
    const [modId, featId] = key.split('/');
    if (!store.flows[modId]) store.flows[modId] = {};
    store.flows[modId][featId] = {
      title: flowDef.title,
      nodes: flowDef.nodes.map(n => ({
        ...n,
        version: 1,
        status: 'Confirmed',
        isArchived: false,
        isSuperseded: false,
        revisionOf: null,
        createdAt: new Date().toISOString()
      })),
      edges: flowDef.edges.map(e => ({
        ...e,
        from: e.from || e.fromNode,
        to: e.to || e.toNode,
        fromNode: e.fromNode || e.from,
        toNode: e.toNode || e.to,
        version: 1,
        status: 'Confirmed',
        isArchived: false,
        isSuperseded: false,
        revisionOf: null,
        createdAt: new Date().toISOString()
      }))
    };
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
