/**
 * js/modules/process-mapping/process-mapping-api.js — Frontend Data Adapter
 * Centralized API service for SIGMA Rubber Nursery Process Mapping Portal.
 * 
 * Connects the portal's data layer to the backend REST API:
 *   Portal UI -> Frontend Data Adapter (this module) -> REST API (/api/process-mapping/*) -> process-mapping-data.json
 * 
 * Capabilities:
 * - Full READ operations for Requirements, Flows, Business Rules, Mappings, Audit Logs, and Project Data
 * - Unified HTTP request handler with timeout, status checking, and normalized error responses
 * - Data normalization and schema verification
 * - Environment-aware base URL resolution (Browser relative / Node.js absolute)
 * - Zero silent fallbacks to stale data on API failure
 */

/**
 * Resolves API base origin depending on environment.
 * - Browser: returns empty string (relative URL to same origin)
 * - Node.js: returns configured base URL or default localhost:3000
 */
function resolveBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    return '';
  }
  if (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

const API_BASE_URL = resolveBaseUrl();
const PM_ENDPOINT_PREFIX = `${API_BASE_URL}/api/process-mapping`;
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Standardized API Error class for process mapping operations.
 */
export class ProcessMappingApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status HTTP status code (0 for network/timeout errors)
   * @param {boolean} [isNetworkError=false]
   * @param {any} [details=null]
   */
  constructor(message, status = 0, isNetworkError = false, details = null) {
    super(message);
    this.name = 'ProcessMappingApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.details = details;
  }
}

/**
 * Core HTTP request executor with timeout, robust JSON parsing, and normalized error throwing.
 * 
 * @param {string} url Endpoint URL
 * @param {RequestInit} [options={}] Fetch options
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] Request timeout in ms
 * @returns {Promise<any>} Parsed JSON response payload
 */
async function apiRequest(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ProcessMappingApiError(
        `Permintaan API timeout setelah ${timeoutMs}ms: ${url}`,
        0,
        true
      );
    }
    throw new ProcessMappingApiError(
      `Gagal terhubung ke backend API (${err.message || 'Network Unavailable'}). Pastikan server berjalan di ${API_BASE_URL || 'localhost'}.`,
      0,
      true,
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Parse JSON response safely
  let result;
  const rawText = await response.text();
  try {
    result = rawText ? JSON.parse(rawText) : {};
  } catch (parseErr) {
    throw new ProcessMappingApiError(
      `Format response server tidak valid (malformed JSON) dari ${url}. Status: ${response.status}`,
      response.status,
      false,
      { rawText }
    );
  }

  // Handle HTTP error responses
  if (!response.ok) {
    const errorMsg = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new ProcessMappingApiError(
      errorMsg,
      response.status,
      false,
      result
    );
  }

  return result;
}

/**
 * Normalizes and verifies project dataset structure returned by API.
 * Ensures all standard arrays, objects, and metadata exist without mutating entity values.
 * 
 * @param {Object} rawData
 * @returns {Object} Normalized project data object
 */
export function normalizeProjectData(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    throw new ProcessMappingApiError('Response API tidak berisi dataset proyek yang valid', 500);
  }

  return {
    metadata: {
      version: rawData.metadata?.version || '1.0.0',
      systemName: rawData.metadata?.systemName || 'SIGMA Rubber Nursery Management System',
      company: rawData.metadata?.company || 'PT SOCFIN INDONESIA',
      lastUpdated: rawData.metadata?.lastUpdated || new Date().toISOString().split('T')[0],
      updatedBy: rawData.metadata?.updatedBy || 'System',
      description: rawData.metadata?.description || '',
      scope: rawData.metadata?.scope || ''
    },
    roles: Array.isArray(rawData.roles) ? rawData.roles : [],
    modules: Array.isArray(rawData.modules) ? rawData.modules : [],
    requirements: Array.isArray(rawData.requirements) ? rawData.requirements : [],
    functionalRequirements: Array.isArray(rawData.functionalRequirements) ? rawData.functionalRequirements : [],
    nonFunctionalRequirements: Array.isArray(rawData.nonFunctionalRequirements) ? rawData.nonFunctionalRequirements : [],
    flows: rawData.flows && typeof rawData.flows === 'object' ? rawData.flows : {},
    crossFlowEdges: Array.isArray(rawData.crossFlowEdges) ? rawData.crossFlowEdges : [],
    businessRules: Array.isArray(rawData.businessRules) ? rawData.businessRules : [],
    dataDictionary: rawData.dataDictionary || {},
    commonFeatures: Array.isArray(rawData.commonFeatures) ? rawData.commonFeatures : []
  };
}

/**
 * Centralized API Service for Process Mapping Portal.
 */
export const processMappingApi = {
  /**
   * Health check for backend server.
   * @returns {Promise<{ status: string, timestamp?: string }>}
   */
  async checkHealth() {
    return apiRequest(`${API_BASE_URL}/api/health`, { method: 'GET' });
  },

  /**
   * Retrieves the complete project dataset from runtime storage.
   * GET /api/process-mapping/data
   * 
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  async getProjectData() {
    const res = await apiRequest(`${PM_ENDPOINT_PREFIX}/data`, { method: 'GET' });
    if (!res || !res.data) {
      throw new ProcessMappingApiError('Endpoint /api/process-mapping/data mengembalikan response kosong', 500);
    }
    res.data = normalizeProjectData(res.data);
    return res;
  },

  /**
   * Retrieves requirements with optional server-side filtering.
   * GET /api/process-mapping/requirements?moduleId=...&status=...&isArchived=...&search=...
   * 
   * @param {Object} [filters={}]
   * @param {string} [filters.moduleId]
   * @param {string} [filters.status]
   * @param {boolean|string} [filters.isArchived]
   * @param {string} [filters.type]
   * @param {string} [filters.role]
   * @param {string} [filters.search]
   * @returns {Promise<{ success: boolean, total: number, data: Array<Object> }>}
   */
  async getRequirements(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`${PM_ENDPOINT_PREFIX}/requirements${qs}`, { method: 'GET' });
  },

  /**
   * Retrieves a single requirement by its ID.
   * GET /api/process-mapping/requirements/:id
   * 
   * @param {string} id Requirement ID (e.g., 'RN-RCV-001')
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  async getRequirement(id) {
    if (!id || typeof id !== 'string') {
      throw new ProcessMappingApiError('Requirement ID wajib diisi', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/requirements/${encodeURIComponent(id.trim())}`, { method: 'GET' });
  },

  /**
   * Retrieves all flows and cross-flow edges.
   * GET /api/process-mapping/flows
   * 
   * @returns {Promise<{ success: boolean, data: { flows: Object, crossFlowEdges: Array } }>}
   */
  async getFlows() {
    return apiRequest(`${PM_ENDPOINT_PREFIX}/flows`, { method: 'GET' });
  },

  /**
   * Retrieves a specific flow by module ID and feature ID.
   * GET /api/process-mapping/flows/:moduleId/:featureId
   * 
   * @param {string} moduleId
   * @param {string} featureId
   * @returns {Promise<{ success: boolean, data: { featureTitle: string, nodes: Array, edges: Array } }>}
   */
  async getFlow(moduleId, featureId) {
    if (!moduleId || !featureId) {
      throw new ProcessMappingApiError('moduleId dan featureId wajib diisi', 400);
    }
    return apiRequest(
      `${PM_ENDPOINT_PREFIX}/flows/${encodeURIComponent(moduleId)}/${encodeURIComponent(featureId)}`,
      { method: 'GET' }
    );
  },

  /**
   * Retrieves business rules with optional filtering.
   * GET /api/process-mapping/rules?category=...&search=...
   * 
   * @param {Object} [filters={}]
   * @param {string} [filters.category]
   * @param {string} [filters.search]
   * @returns {Promise<{ success: boolean, total: number, data: Array<Object> }>}
   */
  async getRules(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`${PM_ENDPOINT_PREFIX}/rules${qs}`, { method: 'GET' });
  },

  /**
   * Retrieves a single business rule by its ID.
   * GET /api/process-mapping/rules/:id
   * 
   * @param {string} id Business rule ID or code (e.g., 'BR-RCV-001')
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  async getRule(id) {
    if (!id || typeof id !== 'string') {
      throw new ProcessMappingApiError('Business Rule ID wajib diisi', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/rules/${encodeURIComponent(id.trim())}`, { method: 'GET' });
  },

  /**
   * Retrieves all derived traceability mappings.
   * GET /api/process-mapping/mappings?type=...&sourceId=...&targetId=...
   * 
   * @param {Object} [filters={}]
   * @param {string} [filters.type]
   * @param {string} [filters.sourceId]
   * @param {string} [filters.targetId]
   * @returns {Promise<{ success: boolean, total: number, data: Array<Object> }>}
   */
  async getMappings(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`${PM_ENDPOINT_PREFIX}/mappings${qs}`, { method: 'GET' });
  },

  /**
   * Retrieves audit logs with optional limit and filter criteria.
   * GET /api/process-mapping/audit-logs?limit=...&action=...&entityType=...&entityId=...
   * 
   * @param {Object} [filters={}]
   * @param {number} [filters.limit]
   * @param {string} [filters.action]
   * @param {string} [filters.entityType]
   * @param {string} [filters.entityId]
   * @returns {Promise<{ success: boolean, total: number, data: Array<Object> }>}
   */
  async getAuditLogs(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`${PM_ENDPOINT_PREFIX}/audit-logs${qs}`, { method: 'GET' });
  },

  // ===========================================================================
  // MUTATION METHODS (CREATE / UPDATE / ARCHIVE / RESTORE / MAPPING)
  // ===========================================================================

  /**
   * Creates a new requirement.
   * POST /api/process-mapping/requirements
   * 
   * @param {Object} requirement
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async createRequirement(requirement, actor = 'Portal User', reason = '') {
    if (!requirement || !requirement.id) {
      throw new ProcessMappingApiError('Requirement object dengan ID wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/requirements`, {
      method: 'POST',
      body: JSON.stringify({ requirement, actor, reason })
    });
  },

  /**
   * Updates an existing requirement.
   * PUT /api/process-mapping/requirements/:id
   * 
   * @param {string} id
   * @param {Object} updates
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async updateRequirement(id, updates, actor = 'Portal User', reason = '') {
    if (!id || typeof id !== 'string') {
      throw new ProcessMappingApiError('Requirement ID wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/requirements/${encodeURIComponent(id.trim())}`, {
      method: 'PUT',
      body: JSON.stringify({ updates, actor, reason })
    });
  },

  /**
   * Archives (soft-deletes) a requirement.
   * PATCH /api/process-mapping/requirements/:id/archive
   * 
   * @param {string} id
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async archiveRequirement(id, actor = 'Portal User', reason = '') {
    if (!id || typeof id !== 'string') {
      throw new ProcessMappingApiError('Requirement ID wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/requirements/${encodeURIComponent(id.trim())}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ actor, reason })
    });
  },

  /**
   * Restores an archived requirement.
   * PATCH /api/process-mapping/requirements/:id/restore
   * 
   * @param {string} id
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async restoreRequirement(id, actor = 'Portal User', reason = '') {
    if (!id || typeof id !== 'string') {
      throw new ProcessMappingApiError('Requirement ID wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/requirements/${encodeURIComponent(id.trim())}/restore`, {
      method: 'PATCH',
      body: JSON.stringify({ actor, reason })
    });
  },

  /**
   * Creates a flow node.
   * POST /api/process-mapping/flows
   * 
   * @param {string} moduleId
   * @param {string} featureId
   * @param {Object} node
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async createFlowNode(moduleId, featureId, node, actor = 'Portal User', reason = '') {
    if (!moduleId || !featureId || !node || !node.id) {
      throw new ProcessMappingApiError('moduleId, featureId, dan node.id wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/flows`, {
      method: 'POST',
      body: JSON.stringify({ moduleId, featureId, node, actor, reason })
    });
  },

  /**
   * Updates a flow node.
   * PUT /api/process-mapping/flows/:moduleId/:featureId
   * 
   * @param {string} moduleId
   * @param {string} featureId
   * @param {Object|string} nodeOrId - Node object with id, or node ID string
   * @param {Object|string} [updatesOrActor] - If nodeOrId is ID string, updates object; otherwise actor string
   * @param {string} [maybeActor='Portal User']
   * @param {string} [maybeReason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async updateFlowNode(moduleId, featureId, nodeOrId, updatesOrActor, maybeActor = 'Portal User', maybeReason = '') {
    let nodeObj = null;
    let actor = 'Portal User';
    let reason = '';
    if (typeof nodeOrId === 'object' && nodeOrId !== null) {
      nodeObj = nodeOrId;
      actor = typeof updatesOrActor === 'string' ? updatesOrActor : 'Portal User';
      reason = maybeActor && typeof maybeActor === 'string' ? maybeActor : '';
    } else {
      nodeObj = { id: nodeOrId, ...(typeof updatesOrActor === 'object' ? updatesOrActor : {}) };
      actor = typeof maybeActor === 'string' ? maybeActor : 'Portal User';
      reason = typeof maybeReason === 'string' ? maybeReason : '';
    }

    if (!moduleId || !featureId || !nodeObj || !nodeObj.id) {
      throw new ProcessMappingApiError('moduleId, featureId, dan node.id wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/flows/${encodeURIComponent(moduleId)}/${encodeURIComponent(featureId)}`, {
      method: 'PUT',
      body: JSON.stringify({ node: nodeObj, actor, reason })
    });
  },

  /**
   * Creates a flow edge.
   * POST /api/process-mapping/flows
   * 
   * @param {string} moduleId
   * @param {string} featureId
   * @param {Object} edge
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async createFlowEdge(moduleId, featureId, edge, actor = 'Portal User', reason = '') {
    if (!moduleId || !featureId || !edge) {
      throw new ProcessMappingApiError('moduleId, featureId, dan edge wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/flows`, {
      method: 'POST',
      body: JSON.stringify({ moduleId, featureId, edge, actor, reason })
    });
  },

  /**
   * Updates a flow edge.
   * PUT /api/process-mapping/flows/:moduleId/:featureId
   * 
   * @param {string} moduleId
   * @param {string} featureId
   * @param {Object|string} edgeOrId - Edge object with id, or edge ID string
   * @param {Object|string} [updatesOrActor] - If edgeOrId is ID string, updates object; otherwise actor string
   * @param {string} [maybeActor='Portal User']
   * @param {string} [maybeReason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async updateFlowEdge(moduleId, featureId, edgeOrId, updatesOrActor, maybeActor = 'Portal User', maybeReason = '') {
    let edgeObj = null;
    let actor = 'Portal User';
    let reason = '';
    if (typeof edgeOrId === 'object' && edgeOrId !== null) {
      edgeObj = edgeOrId;
      actor = typeof updatesOrActor === 'string' ? updatesOrActor : 'Portal User';
      reason = maybeActor && typeof maybeActor === 'string' ? maybeActor : '';
    } else {
      edgeObj = { id: edgeOrId, ...(typeof updatesOrActor === 'object' ? updatesOrActor : {}) };
      actor = typeof maybeActor === 'string' ? maybeActor : 'Portal User';
      reason = typeof maybeReason === 'string' ? maybeReason : '';
    }

    if (!moduleId || !featureId || !edgeObj || !edgeObj.id) {
      throw new ProcessMappingApiError('moduleId, featureId, dan edge.id wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/flows/${encodeURIComponent(moduleId)}/${encodeURIComponent(featureId)}`, {
      method: 'PUT',
      body: JSON.stringify({ edge: edgeObj, actor, reason })
    });
  },

  /**
   * Creates a business rule.
   * POST /api/process-mapping/rules
   * 
   * @param {Object} rule
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async createRule(rule, actor = 'Portal User', reason = '') {
    if (!rule || !(rule.id || rule.code)) {
      throw new ProcessMappingApiError('Rule object dengan ID/code wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/rules`, {
      method: 'POST',
      body: JSON.stringify({ rule, actor, reason })
    });
  },

  /**
   * Updates an existing business rule.
   * PUT /api/process-mapping/rules/:id
   * 
   * @param {string} id
   * @param {Object} updates
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async updateRule(id, updates, actor = 'Portal User', reason = '') {
    if (!id || typeof id !== 'string') {
      throw new ProcessMappingApiError('Business Rule ID wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/rules/${encodeURIComponent(id.trim())}`, {
      method: 'PUT',
      body: JSON.stringify({ updates, actor, reason })
    });
  },

  /**
   * Creates a traceability mapping.
   * POST /api/process-mapping/mappings
   * 
   * @param {Object} mapping
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async createMapping(mapping, actor = 'Portal User', reason = '') {
    if (!mapping) {
      throw new ProcessMappingApiError('Mapping object wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/mappings`, {
      method: 'POST',
      body: JSON.stringify({ mapping, actor, reason })
    });
  },

  /**
   * Deletes a traceability mapping.
   * DELETE /api/process-mapping/mappings/:id
   * 
   * @param {string} id
   * @param {Object} [mappingParams={}]
   * @param {string} [actor='Portal User']
   * @param {string} [reason='']
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async deleteMapping(id, mappingParams = {}, actor = 'Portal User', reason = '') {
    if (!id || typeof id !== 'string') {
      throw new ProcessMappingApiError('Mapping ID wajib disertakan', 400);
    }
    return apiRequest(`${PM_ENDPOINT_PREFIX}/mappings/${encodeURIComponent(id.trim())}`, {
      method: 'DELETE',
      body: JSON.stringify({ ...mappingParams, actor, reason })
    });
  }
};

export default processMappingApi;
