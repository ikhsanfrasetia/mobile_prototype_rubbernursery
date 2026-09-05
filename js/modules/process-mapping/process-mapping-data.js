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

        const nodeIds = new Set();
        flowObj.nodes.forEach((node, nIdx) => {
          if (!node.id) errors.push(`Node ke-${nIdx + 1} pada flow ${modId}/${featId} tidak memiliki ID`);
          if (nodeIds.has(node.id)) {
            errors.push(`Duplikasi Node ID ${node.id} pada flow ${modId}/${featId}`);
          }
          nodeIds.add(node.id);
        });

        if (Array.isArray(flowObj.edges)) {
          flowObj.edges.forEach((edge, eIdx) => {
            if (!nodeIds.has(edge.from)) {
              errors.push(`Edge ke-${eIdx + 1} pada flow ${modId}/${featId} memiliki broken 'from': ${edge.from}`);
            }
            if (!nodeIds.has(edge.to)) {
              errors.push(`Edge ke-${eIdx + 1} pada flow ${modId}/${featId} memiliki broken 'to': ${edge.to}`);
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
          if (!parsedDraft.functionalRequirements) {
            parsedDraft.functionalRequirements = JSON.parse(JSON.stringify(official.functionalRequirements || []));
          }
          if (!parsedDraft.nonFunctionalRequirements) {
            parsedDraft.nonFunctionalRequirements = JSON.parse(JSON.stringify(official.nonFunctionalRequirements || []));
          }
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
  if (!activeStore) return false;
  const validation = validateProjectData(activeStore);
  if (!validation.valid) {
    throw new Error('Data tidak valid:\n' + validation.errors.join('\n'));
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(activeStore));
  return true;
}

/**
 * Resets any local draft and reloads the official baseline from the JS module.
 */
export function resetDraftToOfficial() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  activeStore = fetchOfficialSourceData();
  return activeStore;
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
// Requirement Operations (Create, Edit, Revision, Archive)
// -----------------------------------------------------------------------------

/**
 * Creates a new requirement.
 */
export function createRequirement(reqData) {
  const store = getActiveStore();
  const id = reqData.id?.trim() || `RN-NEW-${Date.now().toString().slice(-4)}`;
  
  const newReq = {
    id,
    title: reqData.title?.trim() || 'Requirement Baru',
    role: reqData.role || 'Mantri Bibitan',
    module: reqData.module || 'Okulasi',
    feature: reqData.feature || 'Grafting',
    process: reqData.process || 'Proses Lapangan',
    status: reqData.status || 'Draft',
    input: reqData.input || '-',
    validation: reqData.validation || '-',
    fallback: reqData.fallback || '-',
    output: reqData.output || '-',
    version: 1,
    isArchived: false,
    revisionOf: null,
    createdAt: new Date().toISOString()
  };

  store.requirements.push(newReq);
  updateMetadata({ updatedBy: reqData.updatedBy || 'System' });
  return newReq;
}

/**
 * Edits an existing requirement or creates a new revision if Confirmed.
 * Rule: CONFIRMED requirement cannot be overwritten; creates a new revision (e.g. v2 Draft).
 */
export function editRequirement(reqId, updatedFields, author = 'Project Manager') {
  const store = getActiveStore();
  const existingIndex = store.requirements.findIndex((r) => r.id === reqId && !r.isArchived);

  if (existingIndex === -1) {
    throw new Error(`Requirement ${reqId} tidak ditemukan atau telah diarsipkan`);
  }

  const existing = store.requirements[existingIndex];

  // If Confirmed, create a new Revision!
  if (existing.status === 'Confirmed') {
    const currentVersion = existing.version || 1;
    const nextVersion = currentVersion + 1;

    const revisionReq = {
      ...existing,
      ...updatedFields,
      id: existing.id,
      version: nextVersion,
      status: updatedFields.status || 'Draft', // Revision starts as Draft unless explicitly confirmed
      revisionOf: `v${currentVersion}`,
      lastRevisedAt: new Date().toISOString(),
      revisedBy: author,
      isArchived: false
    };

    // Keep the old confirmed version in history by marking as archived/superseded
    existing.isSuperseded = true;
    existing.supersededBy = `v${nextVersion}`;

    // Add revision to requirements list
    store.requirements.push(revisionReq);
    updateMetadata({ updatedBy: author });
    return { isRevision: true, requirement: revisionReq };
  } else {
    // If Draft or In Progress, update directly
    const updated = {
      ...existing,
      ...updatedFields,
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
export function approveRequirementRevision(reqId, version, author = 'Project Manager') {
  const store = getActiveStore();
  const req = store.requirements.find((r) => r.id === reqId && (r.version || 1) === version);
  if (!req) throw new Error(`Requirement ${reqId} v${version} tidak ditemukan`);

  req.status = 'Confirmed';
  req.approvedAt = new Date().toISOString();
  req.approvedBy = author;
  updateMetadata({ updatedBy: author });
  return req;
}

/**
 * Archives a requirement (marked as isArchived: true, never permanently deleted).
 */
export function archiveRequirement(reqId, version = null) {
  const store = getActiveStore();
  const req = store.requirements.find(
    (r) => r.id === reqId && (version ? (r.version || 1) === version : !r.isArchived)
  );

  if (!req) throw new Error(`Requirement ${reqId} tidak ditemukan`);
  req.isArchived = true;
  req.archivedAt = new Date().toISOString();
  updateMetadata({ updatedBy: 'Project Manager' });
  return req;
}

// -----------------------------------------------------------------------------
// Structured Visual Flow Node Operations (Add, Edit, Reorder, Archive)
// -----------------------------------------------------------------------------

/**
 * Adds a structured flow node to a module feature.
 */
export function addFlowNode(moduleId, featureId, nodeData, author = 'Project Manager') {
  const store = getActiveStore();
  if (!store.flows[moduleId]) store.flows[moduleId] = {};
  if (!store.flows[moduleId][featureId]) {
    store.flows[moduleId][featureId] = { title: featureId, nodes: [], edges: [] };
  }

  const flow = store.flows[moduleId][featureId];
  const newNodeId = nodeData.id?.trim() || `N_${moduleId}_${Date.now().toString().slice(-4)}`;

  const newNode = {
    id: newNodeId,
    code: nodeData.code || `P-${String(flow.nodes.length + 1).padStart(3, '0')}`,
    label: nodeData.label || 'Langkah Baru',
    type: nodeData.type || 'process', // 'start' | 'process' | 'decision' | 'end'
    purpose: nodeData.purpose || '',
    input: nodeData.input || '',
    process: nodeData.process || '',
    validation: nodeData.validation || '',
    fallback: nodeData.fallback || '',
    output: nodeData.output || '',
    relatedRole: nodeData.relatedRole || 'Asisten Bibitan (Verifikasi)',
    stockImpact: nodeData.stockImpact || '',
    reqId: nodeData.reqId || '',
    businessRule: nodeData.businessRule || '',
    status: nodeData.status || 'Draft',
    version: 1,
    isArchived: false,
    revisionOf: null
  };

  flow.nodes.push(newNode);

  // Automatically maintain edge connections
  regenerateFlowEdges(flow);
  updateMetadata({ updatedBy: author });
  return newNode;
}

/**
 * Edits a flow node. If node is Confirmed, creates revision.
 */
export function editFlowNode(moduleId, featureId, nodeId, updatedFields, author = 'Project Manager') {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const nodeIdx = flow.nodes.findIndex((n) => n.id === nodeId && !n.isArchived);
  if (nodeIdx === -1) throw new Error(`Node ${nodeId} tidak ditemukan`);

  const existingNode = flow.nodes[nodeIdx];

  if (existingNode.status === 'Confirmed') {
    // Create revision
    const currentVersion = existingNode.version || 1;
    const nextVersion = currentVersion + 1;

    const revisedNode = {
      ...existingNode,
      ...updatedFields,
      id: existingNode.id,
      version: nextVersion,
      status: updatedFields.status || 'Draft',
      revisionOf: `v${currentVersion}`,
      isArchived: false
    };

    flow.nodes[nodeIdx] = revisedNode;
    updateMetadata({ updatedBy: author });
    return { isRevision: true, node: revisedNode };
  } else {
    // Direct edit on Draft
    const updatedNode = {
      ...existingNode,
      ...updatedFields
    };
    flow.nodes[nodeIdx] = updatedNode;
    updateMetadata({ updatedBy: author });
    return { isRevision: false, node: updatedNode };
  }
}

/**
 * Reorders a flow node up or down in the sequence.
 * @param {'up' | 'down'} direction
 */
export function reorderFlowNode(moduleId, featureId, nodeId, direction) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const activeNodes = flow.nodes.filter((n) => !n.isArchived);
  const idx = activeNodes.findIndex((n) => n.id === nodeId);
  if (idx === -1) throw new Error(`Node ${nodeId} tidak ditemukan`);

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= activeNodes.length) {
    return false; // Cannot move beyond boundaries
  }

  // Swap in active nodes
  const temp = activeNodes[idx];
  activeNodes[idx] = activeNodes[targetIdx];
  activeNodes[targetIdx] = temp;

  // Rebuild flow.nodes preserving any archived ones
  const archived = flow.nodes.filter((n) => n.isArchived);
  flow.nodes = [...activeNodes, ...archived];

  // Re-generate step codes (P-001, P-002, ...) for processes
  let pIndex = 1;
  activeNodes.forEach((node) => {
    if (node.type === 'process' || node.type === 'decision') {
      node.code = `P-${String(pIndex++).padStart(3, '0')}`;
    }
  });

  regenerateFlowEdges(flow);
  updateMetadata({ updatedBy: 'Project Manager' });
  return true;
}

/**
 * Archives a flow node (marks isArchived: true, retains in history).
 */
export function archiveFlowNode(moduleId, featureId, nodeId) {
  const store = getActiveStore();
  const flow = store.flows[moduleId]?.[featureId];
  if (!flow) throw new Error(`Flow ${moduleId}/${featureId} tidak ditemukan`);

  const node = flow.nodes.find((n) => n.id === nodeId && !n.isArchived);
  if (!node) throw new Error(`Node ${nodeId} tidak ditemukan`);

  node.isArchived = true;
  regenerateFlowEdges(flow);
  updateMetadata({ updatedBy: 'Project Manager' });
  return node;
}

/**
 * Regenerates sequential edges for active nodes.
 */
function regenerateFlowEdges(flow) {
  const activeNodes = flow.nodes.filter((n) => !n.isArchived);
  const edges = [];
  for (let i = 0; i < activeNodes.length - 1; i++) {
    edges.push({
      from: activeNodes[i].id,
      to: activeNodes[i + 1].id
    });
  }
  flow.edges = edges;
}

// -----------------------------------------------------------------------------
// Export & Import Handlers
// -----------------------------------------------------------------------------

/**
 * Generates and triggers browser download of process-mapping-data.json.
 */
export function exportProjectDataFile(customMetadata = {}) {
  const store = getActiveStore();

  const exportPayload = {
    ...store,
    metadata: {
      version: customMetadata.version || store.metadata.version || '0.2.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      updatedBy: customMetadata.updatedBy || store.metadata.updatedBy || 'Project Manager'
    }
  };

  const validation = validateProjectData(exportPayload);
  if (!validation.valid) {
    throw new Error('Ekspor dibatalkan karena data tidak valid:\n' + validation.errors.join('\n'));
  }

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'process-mapping-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return exportPayload;
}

/**
 * Validates an imported JSON string and returns preview analysis.
 */
export function previewImportProjectData(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('File yang diunggah bukan JSON yang valid: ' + err.message);
  }

  const validation = validateProjectData(parsed);
  if (!validation.valid) {
    throw new Error('Data tidak memenuhi skema:\n' + validation.errors.join('\n'));
  }

  return {
    metadata: parsed.metadata,
    totalRoles: parsed.roles?.length || 0,
    totalModules: parsed.modules?.length || 0,
    totalRequirements: parsed.requirements?.length || 0,
    totalFlows: Object.keys(parsed.flows || {}).length,
    candidateData: parsed
  };
}

/**
 * Confirms and applies imported data into the active store.
 */
export function applyImportedProjectData(candidateData) {
  const validation = validateProjectData(candidateData);
  if (!validation.valid) {
    throw new Error('Gagal menerapkan data impor: data tidak valid.');
  }

  activeStore = JSON.parse(JSON.stringify(candidateData));
  saveDraftToStorage();
  return activeStore;
}
