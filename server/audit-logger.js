/**
 * server/audit-logger.js — Audit Trail Logger for Process Mapping CRUD
 * Appends immutable audit records to data/process-mapping-audit-log.json.
 * Uses atomic write to prevent log corruption.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'process-mapping-audit-log.json');

// Maximum log entries before rotating (keep file manageable)
const MAX_LOG_ENTRIES = 5000;

/**
 * Ensures the data directory exists.
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Reads the current audit log from disk.
 * Returns an array of log entries.
 * @returns {Array<Object>}
 */
function readAuditLog() {
  ensureDataDir();
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[AuditLog] Log file is not an array, resetting.');
      return [];
    }
    return parsed;
  } catch (err) {
    console.error('[AuditLog] Failed to read audit log:', err.message);
    return [];
  }
}

/**
 * Writes audit log entries to disk atomically.
 * @param {Array<Object>} entries
 */
function writeAuditLog(entries) {
  ensureDataDir();
  const tmpFile = AUDIT_LOG_FILE + '.tmp';
  try {
    const jsonStr = JSON.stringify(entries, null, 2);
    fs.writeFileSync(tmpFile, jsonStr, 'utf-8');

    // Validate the temp file is valid JSON before replacing
    const verification = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
    if (!Array.isArray(verification)) {
      throw new Error('Temp audit log is not a valid array');
    }

    fs.renameSync(tmpFile, AUDIT_LOG_FILE);
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err.message);
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (_) { /* ignore cleanup errors */ }
    throw new Error('Audit log write failed: ' + err.message);
  }
}

/**
 * Generates a unique audit log entry ID.
 * @returns {string}
 */
function generateAuditId() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AUD-${dateStr}-${rand}`;
}

/**
 * Appends a new audit log entry.
 *
 * @param {Object} params
 * @param {string} params.actor - Who performed the action (e.g. 'local-user')
 * @param {string} params.action - One of: CREATE, UPDATE, ARCHIVE, RESTORE, MAP, UNMAP
 * @param {string} params.entity - Entity type: Requirement, FlowNode, FlowEdge, BusinessRule, Mapping
 * @param {string} params.entityId - The ID of the entity affected
 * @param {string} [params.moduleId] - Optional module scope
 * @param {string} [params.featureId] - Optional feature scope
 * @param {Object} [params.before] - Snapshot of data before mutation (for UPDATE/ARCHIVE)
 * @param {Object} [params.after] - Snapshot of data after mutation (for CREATE/UPDATE/RESTORE)
 * @param {string} [params.reason] - Reason for the change
 * @returns {Object} The created audit log entry
 */
export function appendAuditLog({
  actor = 'local-user',
  action,
  entity,
  entityId,
  moduleId = null,
  featureId = null,
  before = null,
  after = null,
  reason = ''
}) {
  if (!action || !entity || !entityId) {
    throw new Error('Audit log entry requires action, entity, and entityId');
  }

  const validActions = ['CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'MAP', 'UNMAP'];
  if (!validActions.includes(action)) {
    throw new Error(`Invalid audit action: ${action}. Valid: ${validActions.join(', ')}`);
  }

  const entry = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    entity,
    entityId,
    moduleId,
    featureId,
    before,
    after,
    reason: reason || ''
  };

  const entries = readAuditLog();
  entries.push(entry);

  // Rotate if exceeding max entries (keep most recent)
  const trimmed = entries.length > MAX_LOG_ENTRIES
    ? entries.slice(entries.length - MAX_LOG_ENTRIES)
    : entries;

  writeAuditLog(trimmed);

  console.log(`[AuditLog] ${action} ${entity} ${entityId} by ${actor}`);
  return entry;
}

/**
 * Returns all audit log entries, optionally filtered.
 *
 * @param {Object} [filters]
 * @param {string} [filters.entity] - Filter by entity type
 * @param {string} [filters.entityId] - Filter by entity ID
 * @param {string} [filters.action] - Filter by action
 * @param {number} [filters.limit] - Max entries to return (from most recent)
 * @returns {Array<Object>}
 */
export function getAuditLogs(filters = {}) {
  let entries = readAuditLog();

  if (filters.entity) {
    entries = entries.filter(e => e.entity === filters.entity);
  }
  if (filters.entityId) {
    entries = entries.filter(e => e.entityId === filters.entityId);
  }
  if (filters.action) {
    entries = entries.filter(e => e.action === filters.action);
  }

  // Sort by timestamp descending (most recent first)
  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (filters.limit && filters.limit > 0) {
    entries = entries.slice(0, filters.limit);
  }

  return entries;
}
