/**
 * server/process-mapping-db.js — Storage Engine for Process Mapping CRUD
 *
 * Provides atomic read/write, validation guards, write locking,
 * and backup rotation for data/process-mapping-data.json.
 *
 * IMPORTANT CONSTRAINTS:
 * - Primary persistent store: data/process-mapping-data.json
 * - NO sync to js/data/process-mapping-baseline.js (dual-format constraint)
 * - NO physical deletion — soft-delete via isArchived only
 * - NO changes to MASTER_BASELINE
 * - NO new database creation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { appendAuditLog, getAuditLogs } from './audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const PM_DATA_FILE = path.join(DATA_DIR, 'process-mapping-data.json');

// ============================================================================
// WRITE LOCK (Simple in-process mutex for localhost)
// ============================================================================

let _writeLockActive = false;
let _writeLockHolder = null;
let _writeLockTimestamp = null;
const WRITE_LOCK_TIMEOUT_MS = 10000; // 10 seconds max lock hold time

/**
 * Acquires the write lock. Returns true if acquired, false otherwise.
 * Automatically releases stale locks older than WRITE_LOCK_TIMEOUT_MS.
 * @param {string} holder - Identifier for the lock holder
 * @returns {boolean}
 */
function acquireWriteLock(holder = 'api') {
  // Release stale lock
  if (_writeLockActive && _writeLockTimestamp) {
    const elapsed = Date.now() - _writeLockTimestamp;
    if (elapsed > WRITE_LOCK_TIMEOUT_MS) {
      console.warn(`[PM-DB] Stale write lock released (held by ${_writeLockHolder} for ${elapsed}ms)`);
      _writeLockActive = false;
      _writeLockHolder = null;
      _writeLockTimestamp = null;
    }
  }

  if (_writeLockActive) {
    return false;
  }

  _writeLockActive = true;
  _writeLockHolder = holder;
  _writeLockTimestamp = Date.now();
  return true;
}

/**
 * Releases the write lock.
 */
function releaseWriteLock() {
  _writeLockActive = false;
  _writeLockHolder = null;
  _writeLockTimestamp = null;
}

// ============================================================================
// FILE I/O (Atomic Read/Write)
// ============================================================================

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Reads and parses the process-mapping-data.json file.
 * @returns {Object} The parsed JSON data
 * @throws {Error} If file cannot be read or parsed
 */
export function readData() {
  ensureDataDir();
  if (!fs.existsSync(PM_DATA_FILE)) {
    throw new Error('Process mapping data file does not exist: ' + PM_DATA_FILE);
  }
  const raw = fs.readFileSync(PM_DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Process mapping data file contains invalid data');
  }
  return parsed;
}

/**
 * Writes data to process-mapping-data.json atomically.
 * Steps: write to .tmp → validate .tmp → backup current → rename .tmp → target
 * @param {Object} data - The full data object to write
 * @throws {Error} If write or validation fails
 */
function writeDataAtomic(data) {
  ensureDataDir();

  const tmpFile = PM_DATA_FILE + '.tmp';
  const backupFile = PM_DATA_FILE + '.bak';

  try {
    // 1. Serialize and write to temp file
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmpFile, jsonStr, 'utf-8');

    // 2. Validate temp file is valid JSON
    const verification = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
    if (!verification || typeof verification !== 'object') {
      throw new Error('Temp file validation failed: not a valid object');
    }
    if (!Array.isArray(verification.requirements)) {
      throw new Error('Temp file validation failed: requirements is not an array');
    }

    // 3. Backup current file (if exists)
    if (fs.existsSync(PM_DATA_FILE)) {
      try {
        fs.copyFileSync(PM_DATA_FILE, backupFile);
      } catch (backupErr) {
        console.warn('[PM-DB] Backup creation failed (non-fatal):', backupErr.message);
      }
    }

    // 4. Atomic rename temp → target
    fs.renameSync(tmpFile, PM_DATA_FILE);

    console.log('[PM-DB] Data written successfully');
  } catch (err) {
    // Clean up temp file on failure
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (_) { /* ignore */ }
    throw new Error('Atomic write failed: ' + err.message);
  }
}

// ============================================================================
// VALIDATION GUARDS
// ============================================================================

/** Valid requirement statuses */
const VALID_STATUSES = ['Confirmed', 'Draft', 'In Review', 'Rejected', 'Deprecated', 'KONFIRMASI', 'Revisi', 'Open Point', 'Archived'];

/**
 * Validates a requirement object for creation or update.
 * @param {Object} req - The requirement object
 * @param {Object} data - The full data store (for uniqueness checks)
 * @param {boolean} isNew - Whether this is a new creation
 * @throws {Error} If validation fails
 */
function validateRequirement(req, data, isNew = false) {
  if (!req.id || typeof req.id !== 'string' || !req.id.trim()) {
    throw new Error('Requirement ID is required and must be a non-empty string');
  }

  if (isNew) {
    // Check for duplicate ID among non-superseded requirements
    const existing = (data.requirements || []).find(
      r => r.id === req.id && !r.isSuperseded
    );
    if (existing) {
      throw new Error(`Duplicate Requirement ID: ${req.id} already exists`);
    }
  }

  if (!req.title || typeof req.title !== 'string' || !req.title.trim()) {
    throw new Error('Requirement title is required');
  }

  if (req.status && !VALID_STATUSES.includes(req.status)) {
    throw new Error(`Invalid status: ${req.status}. Valid: ${VALID_STATUSES.join(', ')}`);
  }

  // Validate ruleIds reference existing business rules
  if (Array.isArray(req.ruleIds) && req.ruleIds.length > 0) {
    const validRuleIds = new Set((data.businessRules || []).map(br => br.id || br.code));
    for (const rId of req.ruleIds) {
      if (rId && !validRuleIds.has(rId)) {
        throw new Error(`Requirement ${req.id} references unknown Business Rule: ${rId}`);
      }
    }
  }
}

/**
 * Validates a flow node for creation or update.
 * @param {Object} node - The node object
 * @param {Object} flow - The flow object containing nodes/edges
 * @param {Object} data - The full data store
 * @param {boolean} isNew - Whether this is a new creation
 * @throws {Error} If validation fails
 */
function validateFlowNode(node, flow, data, isNew = false) {
  if (!node.id || typeof node.id !== 'string') {
    throw new Error('Flow Node ID is required');
  }

  if (isNew) {
    const existing = (flow.nodes || []).find(
      n => n.id === node.id && !n.isSuperseded && !n.isArchived
    );
    if (existing) {
      throw new Error(`Duplicate Node ID: ${node.id} already exists in this flow`);
    }
  }

  // Validate ruleIds
  if (Array.isArray(node.ruleIds) && node.ruleIds.length > 0) {
    const validRuleIds = new Set((data.businessRules || []).map(br => br.id || br.code));
    for (const rId of node.ruleIds) {
      if (rId && !validRuleIds.has(rId)) {
        throw new Error(`Node ${node.id} references unknown Business Rule: ${rId}`);
      }
    }
  }
}

/**
 * Validates a flow edge.
 * @param {Object} edge - The edge object
 * @param {Object} flow - The flow object containing nodes/edges
 * @param {boolean} isNew - Whether this is a new creation
 * @throws {Error} If validation fails
 */
function validateFlowEdge(edge, flow, isNew = false) {
  const fromId = edge.from || edge.fromNode;
  const toId = edge.to || edge.toNode;

  if (!fromId || !toId) {
    throw new Error('Edge requires both "from" and "to" node IDs');
  }

  // Prevent self-loop
  if (fromId === toId) {
    throw new Error(`Self-loop rejected: edge cannot connect node ${fromId} to itself`);
  }

  // Validate that both nodes exist and are active
  const activeNodes = (flow.nodes || []).filter(n => !n.isArchived && !n.isSuperseded);
  const activeNodeIds = new Set(activeNodes.map(n => n.id));

  if (!activeNodeIds.has(fromId)) {
    throw new Error(`Broken edge: source node ${fromId} does not exist or is archived`);
  }
  if (!activeNodeIds.has(toId)) {
    throw new Error(`Broken edge: target node ${toId} does not exist or is archived`);
  }

  // Check for duplicate edge
  if (isNew) {
    const condition = (edge.condition || edge.label || '').trim().toLowerCase();
    const duplicate = (flow.edges || []).find(e =>
      !e.isArchived && !e.isSuperseded &&
      (e.from || e.fromNode) === fromId &&
      (e.to || e.toNode) === toId &&
      (e.condition || e.label || '').trim().toLowerCase() === condition
    );
    if (duplicate) {
      throw new Error(`Duplicate edge: ${fromId} → ${toId} with same condition already exists`);
    }
  }
}

/**
 * Validates a business rule.
 * @param {Object} rule - The rule object
 * @param {Object} data - The full data store
 * @param {boolean} isNew - Whether this is a new creation
 * @throws {Error} If validation fails
 */
function validateBusinessRule(rule, data, isNew = false) {
  const ruleId = rule.id || rule.code;
  if (!ruleId || typeof ruleId !== 'string') {
    throw new Error('Business Rule ID is required');
  }

  if (isNew) {
    const existing = (data.businessRules || []).find(br => (br.id || br.code) === ruleId);
    if (existing) {
      throw new Error(`Duplicate Business Rule ID: ${ruleId}`);
    }
  }

  if (!rule.title && !rule.name && !rule.description && !rule.desc) {
    throw new Error('Business Rule must have at least a title, name, or description');
  }
}

// ============================================================================
// REQUIREMENT OPERATIONS
// ============================================================================

/**
 * Gets all requirements.
 * @param {Object} [filters] - Optional filters
 * @param {string} [filters.moduleId] - Filter by moduleId
 * @param {string} [filters.role] - Filter by role
 * @param {string} [filters.status] - Filter by status
 * @param {boolean} [filters.includeArchived] - Include archived requirements
 * @returns {Array<Object>}
 */
export function getRequirements(filters = {}) {
  const data = readData();
  let reqs = data.requirements || [];

  if (!filters.includeArchived) {
    reqs = reqs.filter(r => !r.isArchived);
  }
  if (filters.moduleId) {
    reqs = reqs.filter(r => r.moduleId === filters.moduleId);
  }
  if (filters.role) {
    reqs = reqs.filter(r => r.role === filters.role);
  }
  if (filters.status) {
    reqs = reqs.filter(r => r.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    reqs = reqs.filter(r =>
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.process && r.process.toLowerCase().includes(q)) ||
      (r.acceptanceCriteria && r.acceptanceCriteria.toLowerCase().includes(q)) ||
      (r.feature && r.feature.toLowerCase().includes(q))
    );
  }

  return reqs;
}

/**
 * Gets a single requirement by ID.
 * @param {string} reqId
 * @returns {Object|null}
 */
export function getRequirementById(reqId) {
  const data = readData();
  return (data.requirements || []).find(r => r.id === reqId && !r.isSuperseded) ||
         (data.requirements || []).find(r => r.id === reqId) ||
         null;
}

/**
 * Creates a new requirement.
 * @param {Object} reqData
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The created requirement
 */
export function createRequirement(reqData, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('createRequirement')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();

    const newReq = {
      id: reqData.id,
      title: (reqData.title || '').trim(),
      role: reqData.role || 'Mantri Bibitan',
      module: reqData.module || '',
      moduleId: reqData.moduleId || '',
      feature: reqData.feature || '',
      featureId: reqData.featureId || '',
      type: reqData.type || 'KF',
      process: (reqData.process || '').trim(),
      input: (reqData.input || '-').trim(),
      validation: (reqData.validation || '-').trim(),
      fallback: (reqData.fallback || '-').trim(),
      output: (reqData.output || '-').trim(),
      businessRule: (reqData.businessRule || '').trim(),
      ruleIds: Array.isArray(reqData.ruleIds) ? reqData.ruleIds : [],
      status: reqData.status || 'Draft',
      version: 1,
      isArchived: false,
      isSuperseded: false,
      revisionOf: null,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Validate
    validateRequirement(newReq, data, true);

    // Persist
    if (!Array.isArray(data.requirements)) data.requirements = [];
    data.requirements.push(newReq);
    data.metadata.lastUpdated = new Date().toISOString().split('T')[0];

    writeDataAtomic(data);

    // Audit log
    appendAuditLog({
      actor,
      action: 'CREATE',
      entity: 'Requirement',
      entityId: newReq.id,
      moduleId: newReq.moduleId,
      featureId: newReq.featureId,
      before: null,
      after: newReq,
      reason
    });

    return newReq;
  } finally {
    releaseWriteLock();
  }
}

/**
 * Updates an existing requirement.
 * @param {string} reqId
 * @param {Object} updates - Fields to update
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The updated requirement
 */
export function updateRequirement(reqId, updates, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('updateRequirement')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();

    const reqIndex = (data.requirements || []).findIndex(
      r => r.id === reqId && !r.isSuperseded
    );
    if (reqIndex === -1) {
      throw new Error(`Requirement ${reqId} not found or is superseded`);
    }

    const existing = data.requirements[reqIndex];
    const before = { ...existing };

    // Apply allowed updates
    const allowedFields = [
      'title', 'role', 'module', 'moduleId', 'feature', 'featureId',
      'type', 'process', 'input', 'validation', 'fallback', 'output',
      'businessRule', 'ruleIds', 'status', 'acceptanceCriteria',
      'purpose', 'processType', 'relatedRole', 'stockImpact', 'populationImpact'
    ];

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        existing[key] = updates[key];
      }
    }
    existing.lastModified = new Date().toISOString();

    // Re-validate after update
    validateRequirement(existing, data, false);

    data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    writeDataAtomic(data);

    appendAuditLog({
      actor,
      action: 'UPDATE',
      entity: 'Requirement',
      entityId: reqId,
      moduleId: existing.moduleId,
      featureId: existing.featureId,
      before,
      after: existing,
      reason
    });

    return existing;
  } finally {
    releaseWriteLock();
  }
}

/**
 * Archives a requirement (soft-delete).
 * @param {string} reqId
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The archived requirement
 */
export function archiveRequirement(reqId, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('archiveRequirement')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();

    const req = (data.requirements || []).find(r => r.id === reqId && !r.isSuperseded);
    if (!req) {
      throw new Error(`Requirement ${reqId} not found`);
    }

    if (req.isArchived) {
      throw new Error(`Requirement ${reqId} is already archived`);
    }

    const before = { ...req };
    req.isArchived = true;
    req.archivedAt = new Date().toISOString();
    req.lastModified = new Date().toISOString();

    data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    writeDataAtomic(data);

    appendAuditLog({
      actor,
      action: 'ARCHIVE',
      entity: 'Requirement',
      entityId: reqId,
      moduleId: req.moduleId,
      featureId: req.featureId,
      before,
      after: req,
      reason
    });

    return req;
  } finally {
    releaseWriteLock();
  }
}

/**
 * Restores an archived requirement.
 * @param {string} reqId
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The restored requirement
 */
export function restoreRequirement(reqId, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('restoreRequirement')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();

    const req = (data.requirements || []).find(r => r.id === reqId);
    if (!req) {
      throw new Error(`Requirement ${reqId} not found`);
    }

    if (!req.isArchived) {
      throw new Error(`Requirement ${reqId} is not archived`);
    }

    const before = { ...req };
    req.isArchived = false;
    req.archivedAt = null;
    req.restoredAt = new Date().toISOString();
    req.lastModified = new Date().toISOString();

    data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    writeDataAtomic(data);

    appendAuditLog({
      actor,
      action: 'RESTORE',
      entity: 'Requirement',
      entityId: reqId,
      moduleId: req.moduleId,
      featureId: req.featureId,
      before,
      after: req,
      reason
    });

    return req;
  } finally {
    releaseWriteLock();
  }
}

// ============================================================================
// FLOW OPERATIONS (Nodes & Edges)
// ============================================================================

/**
 * Resolves a flow by moduleId and featureId.
 * @param {Object} data - Full data store
 * @param {string} moduleId
 * @param {string} featureId
 * @returns {Object|null} The flow object or null
 */
function resolveFlow(data, moduleId, featureId) {
  if (!data.flows || !data.flows[moduleId] || !data.flows[moduleId][featureId]) {
    return null;
  }
  return data.flows[moduleId][featureId];
}

/**
 * Gets all flows, structured by module and feature.
 * @returns {Object}
 */
export function getFlows() {
  const data = readData();
  return data.flows || {};
}

/**
 * Gets a specific flow by moduleId/featureId key.
 * @param {string} flowKey - Format: "moduleId/featureId"
 * @returns {Object|null}
 */
export function getFlowById(flowKey) {
  const [moduleId, featureId] = flowKey.split('/');
  if (!moduleId || !featureId) return null;
  const data = readData();
  return resolveFlow(data, moduleId, featureId);
}

/**
 * Creates or updates a flow node.
 * @param {string} moduleId
 * @param {string} featureId
 * @param {Object} nodeData
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The created/updated node
 */
export function upsertFlowNode(moduleId, featureId, nodeData, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('upsertFlowNode')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();

    // Ensure flow structure exists
    if (!data.flows) data.flows = {};
    if (!data.flows[moduleId]) data.flows[moduleId] = {};
    if (!data.flows[moduleId][featureId]) {
      data.flows[moduleId][featureId] = { title: featureId, nodes: [], edges: [] };
    }

    const flow = data.flows[moduleId][featureId];
    if (!Array.isArray(flow.nodes)) flow.nodes = [];

    const existingIdx = flow.nodes.findIndex(
      n => n.id === nodeData.id && !n.isSuperseded && !n.isArchived
    );

    let action, before = null;

    if (existingIdx >= 0) {
      // UPDATE existing node
      action = 'UPDATE';
      before = { ...flow.nodes[existingIdx] };

      const allowedFields = [
        'code', 'type', 'title', 'label', 'summary', 'purpose',
        'input', 'output', 'validation', 'fallback', 'process', 'processType',
        'stockImpact', 'populationImpact', 'reqId', 'relatedRole',
        'role', 'module', 'feature', 'businessRule', 'ruleIds', 'status',
        'isArchived'
      ];

      for (const key of allowedFields) {
        if (nodeData[key] !== undefined) {
          flow.nodes[existingIdx][key] = nodeData[key];
        }
      }
      flow.nodes[existingIdx].lastModified = new Date().toISOString();

      validateFlowNode(flow.nodes[existingIdx], flow, data, false);

      const result = flow.nodes[existingIdx];

      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      appendAuditLog({
        actor, action, entity: 'FlowNode', entityId: nodeData.id,
        moduleId, featureId, before, after: result, reason
      });

      return result;
    } else {
      // CREATE new node
      action = 'CREATE';

      const newNode = {
        id: nodeData.id,
        code: nodeData.code || '',
        type: nodeData.type || 'process',
        title: (nodeData.title || nodeData.label || '').trim(),
        label: (nodeData.label || nodeData.title || '').trim(),
        summary: (nodeData.summary || '').trim(),
        purpose: (nodeData.purpose || '').trim(),
        reqId: nodeData.reqId || '',
        role: nodeData.role || 'Mantri Bibitan',
        module: nodeData.module || '',
        feature: nodeData.feature || '',
        processType: nodeData.processType || '',
        input: (nodeData.input || '-').trim(),
        process: (nodeData.process || '').trim(),
        validation: (nodeData.validation || '-').trim(),
        fallback: (nodeData.fallback || '-').trim(),
        output: (nodeData.output || '-').trim(),
        relatedRole: (nodeData.relatedRole || '').trim(),
        businessRule: (nodeData.businessRule || '').trim(),
        ruleIds: Array.isArray(nodeData.ruleIds) ? nodeData.ruleIds : [],
        stockImpact: nodeData.stockImpact || 'NO STOCK CHANGE',
        populationImpact: nodeData.populationImpact || 'NO POPULATION CHANGE',
        version: 1,
        status: nodeData.status || 'Draft',
        isArchived: false,
        isSuperseded: false,
        revisionOf: null,
        createdAt: new Date().toISOString()
      };

      validateFlowNode(newNode, flow, data, true);

      flow.nodes.push(newNode);

      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      appendAuditLog({
        actor, action, entity: 'FlowNode', entityId: newNode.id,
        moduleId, featureId, before: null, after: newNode, reason
      });

      return newNode;
    }
  } finally {
    releaseWriteLock();
  }
}

/**
 * Creates or updates a flow edge.
 * @param {string} moduleId
 * @param {string} featureId
 * @param {Object} edgeData
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The created/updated edge
 */
export function upsertFlowEdge(moduleId, featureId, edgeData, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('upsertFlowEdge')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();

    const flow = resolveFlow(data, moduleId, featureId);
    if (!flow) {
      throw new Error(`Flow ${moduleId}/${featureId} not found`);
    }
    if (!Array.isArray(flow.edges)) flow.edges = [];

    const existingIdx = edgeData.id
      ? flow.edges.findIndex(e => e.id === edgeData.id && !e.isSuperseded && !e.isArchived)
      : -1;

    let action, before = null;

    if (existingIdx >= 0) {
      // UPDATE
      action = 'UPDATE';
      before = { ...flow.edges[existingIdx] };

      const allowedFields = ['from', 'to', 'condition', 'label', 'description', 'status', 'isArchived'];
      for (const key of allowedFields) {
        if (edgeData[key] !== undefined) {
          flow.edges[existingIdx][key] = edgeData[key];
        }
      }
      flow.edges[existingIdx].lastModified = new Date().toISOString();

      validateFlowEdge(flow.edges[existingIdx], flow, false);

      const result = flow.edges[existingIdx];
      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      appendAuditLog({
        actor, action, entity: 'FlowEdge', entityId: edgeData.id,
        moduleId, featureId, before, after: result, reason
      });

      return result;
    } else {
      // CREATE
      action = 'CREATE';
      const edgeId = edgeData.id || `E_${Date.now().toString(36)}_${Math.random().toString(36).slice(-4)}`;
      const condition = (edgeData.condition || edgeData.label || '').trim();

      const newEdge = {
        id: edgeId,
        from: (edgeData.from || '').trim(),
        to: (edgeData.to || '').trim(),
        condition,
        label: condition,
        description: (edgeData.description || '').trim(),
        status: edgeData.status || 'Draft',
        version: 1,
        isArchived: false,
        isSuperseded: false,
        revisionOf: null,
        createdAt: new Date().toISOString()
      };

      validateFlowEdge(newEdge, flow, true);

      flow.edges.push(newEdge);
      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      appendAuditLog({
        actor, action, entity: 'FlowEdge', entityId: edgeId,
        moduleId, featureId, before: null, after: newEdge, reason
      });

      return newEdge;
    }
  } finally {
    releaseWriteLock();
  }
}

// ============================================================================
// BUSINESS RULE OPERATIONS
// ============================================================================

/**
 * Gets all business rules.
 * @returns {Array<Object>}
 */
export function getBusinessRules() {
  const data = readData();
  return data.businessRules || [];
}

/**
 * Gets a single business rule by ID.
 * @param {string} ruleId
 * @returns {Object|null}
 */
export function getBusinessRuleById(ruleId) {
  const data = readData();
  return (data.businessRules || []).find(br => (br.id || br.code) === ruleId) || null;
}

/**
 * Creates a new business rule.
 * @param {Object} ruleData
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The created rule
 */
export function createBusinessRule(ruleData, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('createBusinessRule')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();

    const newRule = {
      id: ruleData.id || ruleData.code,
      title: (ruleData.title || ruleData.name || '').trim(),
      name: (ruleData.name || ruleData.title || '').trim(),
      description: (ruleData.description || ruleData.desc || '').trim(),
      desc: (ruleData.desc || ruleData.description || '').trim(),
      category: ruleData.category || '',
      status: ruleData.status || 'Draft',
      version: 1,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    validateBusinessRule(newRule, data, true);

    if (!Array.isArray(data.businessRules)) data.businessRules = [];
    data.businessRules.push(newRule);

    data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    writeDataAtomic(data);

    appendAuditLog({
      actor, action: 'CREATE', entity: 'BusinessRule', entityId: newRule.id,
      before: null, after: newRule, reason
    });

    return newRule;
  } finally {
    releaseWriteLock();
  }
}

/**
 * Updates an existing business rule.
 * @param {string} ruleId
 * @param {Object} updates
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The updated rule
 */
export function updateBusinessRule(ruleId, updates, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('updateBusinessRule')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();
    const ruleIdx = (data.businessRules || []).findIndex(br => (br.id || br.code) === ruleId);
    if (ruleIdx === -1) {
      throw new Error(`Business Rule ${ruleId} not found`);
    }

    const before = { ...data.businessRules[ruleIdx] };
    const allowedFields = ['title', 'name', 'description', 'desc', 'category', 'status'];
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        data.businessRules[ruleIdx][key] = updates[key];
      }
    }
    data.businessRules[ruleIdx].lastModified = new Date().toISOString();

    data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    writeDataAtomic(data);

    appendAuditLog({
      actor, action: 'UPDATE', entity: 'BusinessRule', entityId: ruleId,
      before, after: data.businessRules[ruleIdx], reason
    });

    return data.businessRules[ruleIdx];
  } finally {
    releaseWriteLock();
  }
}

// ============================================================================
// MAPPING OPERATIONS (Requirement ↔ Node, Requirement/Node ↔ Rule)
// ============================================================================

/**
 * Gets all mappings (requirement↔node and requirement/node↔rule linkages).
 * Derived from existing data — not stored as separate entities.
 * @returns {Array<Object>}
 */
export function getMappings() {
  const data = readData();
  const mappings = [];

  // Derive Requirement ↔ Flow Node mappings from node.reqId
  if (data.flows) {
    for (const [moduleId, features] of Object.entries(data.flows)) {
      for (const [featureId, flow] of Object.entries(features)) {
        for (const node of (flow.nodes || [])) {
          if (node.reqId && !node.isArchived && !node.isSuperseded) {
            mappings.push({
              id: `MAP-${node.id}-${node.reqId}`,
              type: 'Requirement-Node',
              sourceEntity: 'Requirement',
              sourceId: node.reqId,
              targetEntity: 'FlowNode',
              targetId: node.id,
              moduleId,
              featureId
            });
          }
          // Node ↔ Rule mappings
          if (Array.isArray(node.ruleIds)) {
            for (const ruleId of node.ruleIds) {
              mappings.push({
                id: `MAP-${node.id}-${ruleId}`,
                type: 'Node-Rule',
                sourceEntity: 'FlowNode',
                sourceId: node.id,
                targetEntity: 'BusinessRule',
                targetId: ruleId,
                moduleId,
                featureId
              });
            }
          }
        }
      }
    }
  }

  // Derive Requirement ↔ Rule mappings from requirement.ruleIds
  for (const req of (data.requirements || [])) {
    if (Array.isArray(req.ruleIds) && !req.isArchived && !req.isSuperseded) {
      for (const ruleId of req.ruleIds) {
        mappings.push({
          id: `MAP-${req.id}-${ruleId}`,
          type: 'Requirement-Rule',
          sourceEntity: 'Requirement',
          sourceId: req.id,
          targetEntity: 'BusinessRule',
          targetId: ruleId,
          moduleId: req.moduleId,
          featureId: req.featureId
        });
      }
    }
  }

  return mappings;
}

/**
 * Creates a mapping between entities.
 * @param {Object} mappingData - { sourceEntity, sourceId, targetEntity, targetId, moduleId, featureId }
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {Object} The created mapping description
 */
export function createMapping(mappingData, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('createMapping')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();
    const { sourceEntity, sourceId, targetEntity, targetId, moduleId, featureId } = mappingData;

    if (!sourceEntity || !sourceId || !targetEntity || !targetId) {
      throw new Error('Mapping requires sourceEntity, sourceId, targetEntity, and targetId');
    }

    // Handle Requirement ↔ Node mapping (set node.reqId)
    if (sourceEntity === 'Requirement' && targetEntity === 'FlowNode') {
      // Validate source requirement exists
      const req = (data.requirements || []).find(r => r.id === sourceId && !r.isSuperseded);
      if (!req) throw new Error(`Source Requirement ${sourceId} not found`);

      // Find target node
      const flow = resolveFlow(data, moduleId, featureId);
      if (!flow) throw new Error(`Flow ${moduleId}/${featureId} not found`);
      const node = (flow.nodes || []).find(n => n.id === targetId && !n.isArchived && !n.isSuperseded);
      if (!node) throw new Error(`Target Node ${targetId} not found in flow ${moduleId}/${featureId}`);

      // Check duplicate
      if (node.reqId === sourceId) {
        throw new Error(`Mapping already exists: ${sourceId} → ${targetId}`);
      }

      const before = { reqId: node.reqId };
      node.reqId = sourceId;
      node.lastModified = new Date().toISOString();

      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      const mappingId = `MAP-${targetId}-${sourceId}`;
      appendAuditLog({
        actor, action: 'MAP', entity: 'Mapping', entityId: mappingId,
        moduleId, featureId, before, after: { reqId: sourceId }, reason
      });

      return { id: mappingId, type: 'Requirement-Node', sourceId, targetId };
    }

    // Handle Node ↔ Rule or Requirement ↔ Rule mapping
    if (targetEntity === 'BusinessRule') {
      // Validate target rule exists
      const rule = (data.businessRules || []).find(br => (br.id || br.code) === targetId);
      if (!rule) throw new Error(`Target BusinessRule ${targetId} not found`);

      if (sourceEntity === 'FlowNode') {
        const flow = resolveFlow(data, moduleId, featureId);
        if (!flow) throw new Error(`Flow ${moduleId}/${featureId} not found`);
        const node = (flow.nodes || []).find(n => n.id === sourceId && !n.isArchived && !n.isSuperseded);
        if (!node) throw new Error(`Source Node ${sourceId} not found`);

        if (!Array.isArray(node.ruleIds)) node.ruleIds = [];
        if (node.ruleIds.includes(targetId)) {
          throw new Error(`Mapping already exists: Node ${sourceId} → Rule ${targetId}`);
        }

        node.ruleIds.push(targetId);
        node.lastModified = new Date().toISOString();
      } else if (sourceEntity === 'Requirement') {
        const req = (data.requirements || []).find(r => r.id === sourceId && !r.isSuperseded);
        if (!req) throw new Error(`Source Requirement ${sourceId} not found`);

        if (!Array.isArray(req.ruleIds)) req.ruleIds = [];
        if (req.ruleIds.includes(targetId)) {
          throw new Error(`Mapping already exists: Requirement ${sourceId} → Rule ${targetId}`);
        }

        req.ruleIds.push(targetId);
        req.lastModified = new Date().toISOString();
      } else {
        throw new Error(`Unsupported source entity type: ${sourceEntity}`);
      }

      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      const mappingId = `MAP-${sourceId}-${targetId}`;
      appendAuditLog({
        actor, action: 'MAP', entity: 'Mapping', entityId: mappingId,
        moduleId, featureId, before: null, after: { sourceId, targetId }, reason
      });

      return { id: mappingId, type: `${sourceEntity}-Rule`, sourceId, targetId };
    }

    throw new Error(`Unsupported mapping type: ${sourceEntity} → ${targetEntity}`);
  } finally {
    releaseWriteLock();
  }
}

/**
 * Deletes (unmaps) a mapping between entities.
 * @param {string} mappingId - Format: "MAP-{sourceId}-{targetId}" or explicit params
 * @param {Object} [params] - Optional explicit params { sourceEntity, sourceId, targetEntity, targetId, moduleId, featureId }
 * @param {string} [actor='local-user']
 * @param {string} [reason='']
 * @returns {boolean} true if unmap succeeded
 */
export function deleteMapping(mappingId, params = {}, actor = 'local-user', reason = '') {
  if (!acquireWriteLock('deleteMapping')) {
    throw new Error('WRITE_LOCK_BUSY: Another write operation is in progress. Try again later.');
  }

  try {
    const data = readData();
    const { sourceEntity, sourceId, targetEntity, targetId, moduleId, featureId } = params;

    if (!sourceEntity || !sourceId || !targetEntity || !targetId) {
      throw new Error('deleteMapping requires sourceEntity, sourceId, targetEntity, and targetId');
    }

    if (sourceEntity === 'Requirement' && targetEntity === 'FlowNode') {
      // Unlink node.reqId
      const flow = resolveFlow(data, moduleId, featureId);
      if (!flow) throw new Error(`Flow ${moduleId}/${featureId} not found`);
      const node = (flow.nodes || []).find(n => n.id === targetId && !n.isArchived && !n.isSuperseded);
      if (!node) throw new Error(`Node ${targetId} not found`);

      if (node.reqId !== sourceId) {
        throw new Error(`Mapping does not exist: Node ${targetId} reqId is "${node.reqId}", not "${sourceId}"`);
      }

      const before = { reqId: node.reqId };
      node.reqId = '';
      node.lastModified = new Date().toISOString();

      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      appendAuditLog({
        actor, action: 'UNMAP', entity: 'Mapping', entityId: mappingId,
        moduleId, featureId, before, after: { reqId: '' }, reason
      });

      return true;
    }

    if (targetEntity === 'BusinessRule') {
      if (sourceEntity === 'FlowNode') {
        const flow = resolveFlow(data, moduleId, featureId);
        if (!flow) throw new Error(`Flow ${moduleId}/${featureId} not found`);
        const node = (flow.nodes || []).find(n => n.id === sourceId && !n.isArchived && !n.isSuperseded);
        if (!node) throw new Error(`Node ${sourceId} not found`);

        if (!Array.isArray(node.ruleIds) || !node.ruleIds.includes(targetId)) {
          throw new Error(`Mapping does not exist: Node ${sourceId} → Rule ${targetId}`);
        }

        node.ruleIds = node.ruleIds.filter(id => id !== targetId);
        node.lastModified = new Date().toISOString();
      } else if (sourceEntity === 'Requirement') {
        const req = (data.requirements || []).find(r => r.id === sourceId && !r.isSuperseded);
        if (!req) throw new Error(`Requirement ${sourceId} not found`);

        if (!Array.isArray(req.ruleIds) || !req.ruleIds.includes(targetId)) {
          throw new Error(`Mapping does not exist: Requirement ${sourceId} → Rule ${targetId}`);
        }

        req.ruleIds = req.ruleIds.filter(id => id !== targetId);
        req.lastModified = new Date().toISOString();
      } else {
        throw new Error(`Unsupported source entity: ${sourceEntity}`);
      }

      data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
      writeDataAtomic(data);

      appendAuditLog({
        actor, action: 'UNMAP', entity: 'Mapping', entityId: mappingId,
        moduleId, featureId, before: { sourceId, targetId }, after: null, reason
      });

      return true;
    }

    throw new Error(`Unsupported unmap type: ${sourceEntity} → ${targetEntity}`);
  } finally {
    releaseWriteLock();
  }
}

// ============================================================================
// RE-EXPORT AUDIT LOGS
// ============================================================================

export { getAuditLogs };
