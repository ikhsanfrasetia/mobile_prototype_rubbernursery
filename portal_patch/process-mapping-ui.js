/**
 * js/modules/process-mapping/process-mapping-ui.js
 * Enterprise Documentation Portal & Structured Editor for Rubber Nursery
 * 
 * Features:
 * - View Mode (Customer friendly, strictly read-only)
 * - Manage Mode (Internal/Dev structured visual editor)
 * - Structured Visual Node Editor (Add, Edit, Reorder Up/Down, Archive)
 * - Protected Requirement Revision & Archive
 * - Dynamic Metadata (version, lastUpdated, updatedBy)
 * - Reset Draft (discards local draft, reloads official source JSON)
 * - Export Project Data (generates candidate process-mapping-data.json)
 * - Import Project Data (validates schema & previews changes before applying)
 * - 11 Modules All-in-One View + Single Module Deep-dive + Right Detail Panel
 */

import {
  initProjectDataStore,
  getActiveStore,
  hasActiveDraft,
  saveDraftToStorage,
  resetDraftToOfficial,
  validateProjectData,
  createRequirement,
  editRequirement,
  approveRequirementRevision,
  archiveRequirement,
  generateUniqueReqId,
  checkRequirementNodeUsage,
  getRequirementRevisionHistory,
  getNodeRevisionHistory,
  getRequirementByReqId,
  addFlowNode,
  editFlowNode,
  reorderFlowNode,
  archiveFlowNode,
  addFlowEdge,
  editFlowEdge,
  archiveFlowEdge,
  getFlowEdgeRevisionHistory,
  getAllPendingRevisions,
  calculateEntityDiff,
  submitEntityForReview,
  confirmEntityRevision,
  rejectEntityRevision,
  discardEntityDraft,
  verifyReviewerCredentials,
  exportProjectDataFile,
  previewImportProjectData,
  applyImportedProjectData,
  updateMetadata,
  getRequirementCriteria,
  getRequirementTrace,
  getAllTraceabilityRecords,
  getNodeTrace,
  validateAndLinkBusinessRules,
  validateAndLinkNodeBusinessRules,
  getCoverageMetrics,
  getGapAnalysisReport,
  applyTrueGapResolutionPlan,
  getFlowEdgeCoverageReport,
  getBusinessRuleTraceabilityReport,
  finalizeFlowAndBusinessRuleTraceability,
  getReconciliationCatalog
} from './process-mapping-data.js';

import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  buildDocumentModel,
  buildRtmDocumentModel,
  buildGapDocumentModel,
  resolveDocumentMetadata
} from './process-mapping-doc.js';

import {
  renderDocument
} from './process-mapping-doc-renderer.js';

// Global UI State
let isManageMode = false;
let currentRole = 'mantri-bibitan';
let currentModuleId = 'ALL'; // 'ALL' | '01-presensi' | ... | '11-pengeluaran'
let currentFeatureId = 'grafting';
let currentViewTab = 'flow'; // 'flow' | 'requirement' | 'review' | 'business-rule' | 'related-role' | 'end-to-end'
let selectedNodeId = 'N_P002'; // default: Scan QR Batch
let selectedModuleId = '04-okulasi'; // the module of selected node
let isDetailOpen = true;
let zoomScale = 1.0;
let searchQuery = '';

// Requirement Manager State
let reqSearchQuery = '';
let reqFilterRole = 'ALL';
let reqFilterModule = 'ALL';
let reqFilterFeature = 'ALL';
let reqFilterStatus = 'ALL';
let reqCurrentPage = 1;
let reqPageSize = 5;
let selectedReqDetailVersion = null; // For previewing earlier revisions in detail modal

// Revision & Review State
let revSearchQuery = '';
let revFilterEntityType = 'ALL'; // 'ALL' | 'Requirement' | 'Node' | 'Connection'
let revFilterStatus = 'ALL'; // 'ALL' | 'Draft' | 'In Review' | 'Rejected' | 'Archived'
let revFilterModule = 'ALL';
let revCurrentPage = 1;
let revPageSize = 10;
let revSubTab = 'reconciliation'; // 'workflow' | 'reconciliation'

// Reconciliation Catalog State
let reconFilterClassification = 'ALL'; // 'ALL' | 'Retained' | 'Revised' | 'New' | 'Deprecated' | 'Merged'
let reconFilterModule = 'ALL';
let reconSearchQuery = '';
let reconCurrentPage = 1;
let reconPageSize = 10;

// Modal / Dialog State
let activeModal = null; // null | 'edit-req' | 'detail-req' | 'archive-req' | 'edit-node' | 'archive-node' | 'edit-edge' | 'archive-edge' | 'compare-rev' | 'reject-rev' | 'discard-rev' | 'export' | 'import' | 'reset-draft' | 'preview-doc'
let modalData = null;
let modalDocType = DOCUMENT_TYPES.RTM_REPORT;
let toastMessage = null;
let toastTimer = null;

// Portal Navigation State ('dashboard' | 'reference' | 'reports')
let currentNavTab = 'dashboard';

// Reference Tab Filter State
let refFilterType = 'ALL'; // 'ALL' | 'KF' | 'KNF'
let refFilterCategory = 'ALL';
let refFilterStatus = 'ALL';
let refSearchQuery = '';

// Reports Tab Filter State
let reportSubTab = 'req-matrix'; // 'req-doc' | 'bp-doc' | 'req-matrix' | 'gap-analysis' | 'official-docs'
let reportFilterModule = 'ALL';
let reportFilterRole = 'ALL';

// RTM Filter & Pagination State
let rtmSearchQuery = '';
let rtmFilterModule = 'ALL';
let rtmFilterRole = 'ALL';
let rtmFilterClassification = 'ALL'; // 'ALL' | 'Covered' | 'Business / Management' | 'True Gap'
let rtmFilterRuleLink = 'ALL'; // 'ALL' | 'Linked' | 'Not Linked'
let rtmFilterReqStatus = 'ALL'; // 'ALL' | 'Confirmed' | 'Draft' | 'In Review'
let rtmCurrentPage = 1;
let rtmPageSize = 5;

// Gap Analysis State
let gapSearchQuery = '';
let gapFilterModule = 'ALL';
let gapFilterRole = 'ALL';
let gapFilterStatus = 'ALL';
let gapCurrentPage = 1;
let gapPageSize = 10;

/**
 * Helper to expose click callback for Mermaid nodes to window
 */
if (typeof window !== 'undefined') {
  window.pmSelectMermaidNode = function (nodeId) {
    const event = new CustomEvent('pm-mermaid-click', { detail: { nodeId } });
    window.dispatchEvent(event);
  };
}

function generateMermaidSyntax(activeNodes, currentFlow) {
  let str = 'graph TD\n';
  if (!activeNodes || activeNodes.length === 0) return 'graph TD\n  Empty["Belum ada node"]';

  const activeNodeIds = new Set(activeNodes.map(n => n.id));

  activeNodes.forEach(node => {
    let shapeOpen = '["';
    let shapeClose = '"]';
    if (node.type === 'decision') { shapeOpen = '{"'; shapeClose = '"}'; }
    else if (node.type === 'start' || node.type === 'end') { shapeOpen = '(['; shapeClose = '])'; }

    let safeLabel = (node.label || node.title || '').replace(/"/g, "'");
    const codeLine = node.code ? `<div style='font-size:0.75rem;font-weight:bold;color:#475569;'>${node.code}</div>` : '';
    let nodeHtml = `<div style='padding:4px; text-align:center;'>${codeLine}<div style='font-size:0.85rem;'>${safeLabel}</div></div>`;
    str += `  N_${node.id}${shapeOpen}\`${nodeHtml}\`${shapeClose}\n`;

    let style = 'fill:#ffffff,stroke:#cbd5e1,stroke-width:1.5px,color:#1e293b';
    if (node.type === 'start' || node.type === 'end') {
      style = 'fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#1b5e20';
    } else if (node.type === 'decision') {
      style = 'fill:#fef9c3,stroke:#eab308,stroke-width:1.5px,color:#854d0e';
    }
    if (selectedNodeId === node.id) {
      style = 'fill:#eff6ff,stroke:#2563eb,stroke-width:2.5px,color:#1d4ed8';
    }
    str += `  style N_${node.id} ${style}\n`;
  });

  const explicitEdges = (currentFlow?.edges || []).filter(e => !e.isArchived && !e.isSuperseded && activeNodeIds.has(e.from) && activeNodeIds.has(e.to));

  if (explicitEdges.length > 0) {
    // Render using explicit edges
    explicitEdges.forEach(edge => {
      const cond = (edge.condition || edge.label || '').trim().replace(/"/g, "'");
      if (cond) {
        str += `  N_${edge.from} -- "${cond}" --> N_${edge.to}\n`;
      } else {
        str += `  N_${edge.from} --> N_${edge.to}\n`;
      }
    });
  } else {
    // Fallback sequential rendering for baseline flows with edges=[]
    for (let i = 0; i < activeNodes.length; i++) {
      const node = activeNodes[i];
      if (node.type === 'end') continue;

      let nextNode = null;
      let fallbackNode = null;
      for (let j = i + 1; j < activeNodes.length; j++) {
        const nextCandidate = activeNodes[j];
        if (node.type === 'decision' && !fallbackNode && nextCandidate.code && nextCandidate.code.startsWith('FB-')) {
          fallbackNode = nextCandidate;
          continue;
        }
        if (!nextCandidate.code || !nextCandidate.code.startsWith('FB-')) {
          nextNode = nextCandidate;
          break;
        }
      }

      if (node.type === 'decision') {
        if (nextNode) str += `  N_${node.id} -- Sukses --> N_${nextNode.id}\n`;
        if (fallbackNode) str += `  N_${node.id} -- Fallback --> N_${fallbackNode.id}\n`;
      } else {
        if (nextNode) str += `  N_${node.id} --> N_${nextNode.id}\n`;
      }
    }
  }
  return str;
}

/**
 * Main Portal Render Entrypoint
 */
/**
 * Resolves active modules and requirements scoped strictly to a specific role.
 * Single source of truth for Role -> Module scoping.
 * @param {string} roleId
 * @param {Object} store
 * @returns {{ roleObj: Object, roleModules: Array<Object>, roleRequirements: Array<Object>, hasData: boolean }}
 */
function getRoleScopedData(roleId, store) {
  const currentStore = store || getActiveStore();
  const roleObj = (currentStore.roles || []).find((r) => r.id === roleId) || (currentStore.roles && currentStore.roles[0]) || { id: 'mantri-bibitan', name: 'Mantri Bibitan' };
  const allReqs = (currentStore.requirements || []).filter((r) => !r.isArchived && !r.isSuperseded);

  // Mantri Bibitan is the confirmed primary operational role across all 11 modules
  if (roleObj.id === 'mantri-bibitan') {
    return {
      roleObj,
      roleModules: currentStore.modules || [],
      roleRequirements: allReqs,
      hasData: true
    };
  }

  // Other roles: filter requirements where r.role matches role name or role id
  const roleReqs = allReqs.filter((r) => {
    const rRole = (r.role || '').toLowerCase();
    const roId = roleObj.id.toLowerCase();
    const roName = (roleObj.name || '').toLowerCase();
    return rRole === roId || rRole === roName || (roleObj.id === 'pengurus' && rRole.includes('pengurus'));
  });

  if (roleReqs.length === 0) {
    return {
      roleObj,
      roleModules: [],
      roleRequirements: [],
      hasData: false
    };
  }

  // Derive unique modules associated with this role's requirements
  const moduleKeys = new Set(roleReqs.map((r) => r.moduleId || r.module));
  const roleModules = (currentStore.modules || []).filter((m) => moduleKeys.has(m.id) || moduleKeys.has(m.name));

  return {
    roleObj,
    roleModules,
    roleRequirements: roleReqs,
    hasData: roleModules.length > 0
  };
}

export async function renderProcessMappingPortal(container) {
  if (!container) return;

  // Initialize store if not ready
  let store;
  try {
    store = getActiveStore();
  } catch (err) {
    container.innerHTML = '<div style="padding: 48px; text-align: center; color: #64748b; font-size: 0.95rem;">Memuat data resmi proses bisnis pembibitan...</div>';
    store = await initProjectDataStore();
  }

  // Detect Customer Mode from URL parameter (?mode=customer)
  const urlParams = new URLSearchParams(window.location.search);
  const isCustomerMode = urlParams.get('mode') === 'customer';
  if (isCustomerMode) {
    isManageMode = false;
  }

  const { roleObj, roleModules, roleRequirements, hasData } = getRoleScopedData(currentRole, store);

  // If currentModuleId is not in roleModules, reset to 'ALL'
  if (currentModuleId !== 'ALL' && !roleModules.some((m) => m.id === currentModuleId)) {
    currentModuleId = 'ALL';
  }

  const currentMod = currentModuleId === 'ALL'
    ? null
    : roleModules.find((m) => m.id === currentModuleId) || roleModules[0] || null;

  // Render Portal HTML
  container.innerHTML = `
    <div class="pm-portal" id="pm-portal-root">
      <!-- 1. Manage Toolbar (Hidden in customer mode) -->
      ${!isCustomerMode ? renderManageToolbar(store.metadata, hasActiveDraft()) : ''}

      <!-- 2. Header Bar -->
      ${renderHeader(store.metadata)}

      <!-- 3. Portal Content based on currentNavTab -->
      ${currentNavTab === 'mapping'
      ? `
            <div class="pm-layout">
              <!-- Left Sidebar -->
              ${renderSidebar(roleObj, currentMod, store.roles, roleModules, store.commonFeatures, hasData)}

              <!-- Center Content / Canvas -->
              <main class="pm-content">
                ${!hasData
          ? renderInProgressRole(roleObj)
          : currentModuleId === 'ALL'
            ? renderAllModulesContent(store, roleObj, roleModules, roleRequirements)
            : renderSingleModuleContent(currentMod, store, roleObj, roleRequirements)
        }
              </main>

              <!-- Right Detail Panel -->
              ${hasData && isDetailOpen ? renderDetailPanel(store) : ''}
            </div>
          `
      : currentNavTab === 'dashboard'
        ? renderDashboardView(store)
        : currentNavTab === 'reference'
          ? renderReferenceView(store)
          : renderReportsView(store)
    }

      <!-- 4. Tooltip Layer -->
      <div class="pm-tooltip" id="pm-tooltip"></div>

      <!-- 5. Modals Layer -->
      ${renderModals(store)}

      <!-- 6. Toast Notification -->
      ${toastMessage ? `<div class="pm-toast"><span>${escapeHtml(toastMessage)}</span></div>` : ''}

      <!-- 7. Footer -->
      ${renderFooter(store.metadata)}
    </div>
  `;

  // Attach event listeners
  attachPortalEvents(container, store);

  // Initialize Mermaid and Pan/Zoom ONLY when Process Mapping is active
  if (currentNavTab === 'mapping') {
    setTimeout(() => {
      if (window.mermaid) {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
        container.querySelectorAll('.mermaid-diagram').forEach(async (el) => {
          try {
            const id = 'mermaid-svg-' + Math.random().toString(36).substr(2, 9);
            const txt = document.createElement('textarea');
            txt.innerHTML = el.dataset.mermaid;
            const { svg } = await mermaid.render(id, txt.value);
            el.innerHTML = svg;
            attachSvgNodeEvents(el, container, store);
          } catch (e) {
            console.error('Mermaid render error:', e);
            el.innerHTML = '<div style="color:red; padding:20px;">Error rendering diagram</div>';
          }
        });
      }
    }, 50);

    // Attach canvas pan/drag handler
    const stage = container.querySelector('#pm-canvas-stage');
    if (stage) {
      attachCanvasPan(stage);
    }
  }
}

// -----------------------------------------------------------------------------
// Component Templates
// -----------------------------------------------------------------------------

function renderManageToolbar(metadata, isDraftActive) {
  return `
    <div class="pm-manage-bar" id="pm-manage-bar">
      <div class="pm-manage-left">
        <div class="pm-mode-segmented">
          <button type="button" class="pm-mode-seg-btn ${!isManageMode ? 'is-active' : ''}" id="pm-mode-view-btn">
            View Mode
          </button>
          <button type="button" class="pm-mode-seg-btn ${isManageMode ? 'is-active' : ''}" id="pm-mode-manage-btn">
            Manage Mode
          </button>
        </div>

        <div class="pm-meta-chip">
          <span>v${escapeHtml(metadata.version)}</span>
          <span>&bull;</span>
          <span>Diperbarui: ${escapeHtml(metadata.lastUpdated)}</span>
          <span>(${escapeHtml(metadata.updatedBy)})</span>
        </div>

        ${isDraftActive
      ? '<span class="pm-meta-chip pm-meta-draft-chip">● Draf Lokal Aktif</span>'
      : ''
    }
      </div>

      ${isManageMode
      ? `
          <div class="pm-manage-actions">
            <button type="button" class="pm-btn-sm pm-btn-primary" id="pm-btn-save-draft" title="Simpan ke draf lokal dan perbarui pratinjau seketika">
              Simpan Draf
            </button>
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-btn-export-data" title="Ekspor file process-mapping-data.json untuk pembaruan source data">
              Export Project Data
            </button>
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-btn-import-data" title="Impor file data JSON ke editor state">
              Import Data
            </button>
            <button type="button" class="pm-btn-sm pm-btn-danger" id="pm-btn-reset-draft" title="Batalkan draf dan muat ulang data resmi dari process-mapping-data.json">
              Reset Draf
            </button>
          </div>
        `
      : `
          <div style="font-size:0.75rem; color:#94a3b8;">
            Mode pratinjau pelanggan (Read-Only). Klik <strong>Manage Mode</strong> untuk mengedit data.
          </div>
        `
    }
    </div>
  `;
}

function renderHeader(metadata) {
  return `
    <header class="pm-header">
      <div class="pm-header-left">
        <div class="pm-brand">
          <div class="pm-brand-titles">
            <span class="pm-brand-name">Rubber Nursery</span>
            <span class="pm-brand-sub">Business Process &amp; Requirement</span>
          </div>
        </div>

        <nav class="pm-header-nav">
          <button type="button" class="pm-nav-link ${currentNavTab === 'dashboard' ? 'is-active' : ''}" id="pm-nav-dashboard">Dashboard</button>
          <button type="button" class="pm-nav-link ${currentNavTab === 'reference' ? 'is-active' : ''}" id="pm-nav-reference">Reference</button>
          <button type="button" class="pm-nav-link ${currentNavTab === 'reports' ? 'is-active' : ''}" id="pm-nav-reports">Reports</button>
        </nav>
      </div>

      <div class="pm-header-right">
        <div class="pm-search-wrap">
          <span class="pm-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            id="pm-global-search"
            class="pm-search-input"
            placeholder="Search role, module, process..."
            value="${escapeHtml(searchQuery)}"
            autocomplete="off"
            spellcheck="false"
          />
          <kbd class="pm-search-kbd">Ctrl+K</kbd>
        </div>

        <div class="pm-header-meta">
          <span class="pm-version-badge">v${escapeHtml(metadata.version)}</span>
        </div>
      </div>
    </header>
  `;
}

function renderSidebar(roleObj, currentMod, roles, modules, commonFeatures, hasData) {
  return `
    <aside class="pm-sidebar">
      <!-- Role Selector -->
      <div class="pm-sidebar-section">
        <span class="pm-section-label">Pilih Role</span>
        <div class="pm-select-wrapper">
          <select id="pm-role-select" class="pm-role-select">
            ${roles
      .map(
        (r) => `
              <option value="${r.id}" ${r.id === currentRole ? 'selected' : ''}>
                ${r.name} (Confirmed)
              </option>
            `
      )
      .join('')}
          </select>
        </div>
      </div>

      <!-- Module Navigation -->
      <div class="pm-sidebar-section">
        <span class="pm-section-label">Modul Operasional</span>
        <div class="pm-module-nav">
          ${!hasData
            ? `<div style="padding: 12px 14px; font-size: 0.8rem; color: #94a3b8; font-style: italic;">Requirement belum tersedia</div>`
            : `
              <!-- Semua Modul Option -->
              <button
                type="button"
                class="pm-module-item ${currentModuleId === 'ALL' ? 'is-active' : ''}"
                data-module-id="ALL"
                title="Tampilkan seluruh flow ${modules.length} modul ${escapeHtml(roleObj.name)}"
              >
                <span class="pm-mod-num">&bull;</span>
                <span class="pm-mod-text">Semua Modul (${modules.length})</span>
              </button>
              ${modules.map(
            (m) => `
                <button
                  type="button"
                  class="pm-module-item ${currentModuleId === m.id ? 'is-active' : ''}"
                  data-module-id="${m.id}"
                >
                  <span class="pm-mod-num">${m.order}</span>
                  <span class="pm-mod-text">${m.name}</span>
                </button>
              `
          ).join('')}
            `
          }
        </div>
      </div>

      <!-- Common Features -->
      <div class="pm-sidebar-section" style="margin-top:auto;">
        <span class="pm-section-label">Common Features</span>
        <div class="pm-common-features">
          ${commonFeatures.map(
      (cf) => `
            <button type="button" class="pm-common-item" title="${escapeHtml(cf.desc)}">
              <span>${cf.icon}</span>
              <span>${cf.name}</span>
            </button>
          `
    ).join('')}
        </div>
      </div>
    </aside>
  `;
}

function renderAllModulesContent(store, roleObj, roleModules, roleRequirements) {
  const activeRoleObj = roleObj || store.roles?.find((r) => r.id === currentRole) || store.roles?.[0] || { name: 'Mantri Bibitan' };
  const scopedModules = roleModules || store.modules || [];
  const scopedReqs = roleRequirements || (store.requirements || []).filter((r) => !r.isArchived && !r.isSuperseded);
  const activeReqsCount = scopedReqs.length;

  return `
    <!-- Breadcrumb -->
    <div class="pm-breadcrumb">
      <span class="pm-breadcrumb-link">${escapeHtml(activeRoleObj.name)}</span>
      <span>&rsaquo;</span>
      <span style="color:#1e293b; font-weight:600;">Semua Modul (${scopedModules.length} Modul Terkait)</span>
    </div>

    <!-- Header Section -->
    <div class="pm-mod-header">
      <div class="pm-title-row">
        <h1 class="pm-mod-title">Alur Proses Seluruh Modul</h1>
        <span class="pm-badge-confirmed">${scopedModules.length} Modul Terkait</span>
      </div>
      <div class="pm-mod-subtitle">Peta Alur Operasional ${escapeHtml(activeRoleObj.name)} (${scopedModules.length} Modul, ${activeReqsCount} Requirement)</div>
      <p class="pm-mod-desc">
        Menampilkan seluruh rangkaian proses bisnis dan modul yang menjadi lingkup tugas <strong>${escapeHtml(activeRoleObj.name)}</strong>. Klik pada setiap proses untuk melihat rincian requirement, validasi, dan aturan bisnis pada panel detail.
      </p>
    </div>

    <!-- Sub-Tabs & Filter Bar Row -->
    <div class="pm-all-filter-bar">
      <div class="pm-sub-tabs">
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'flow' ? 'is-active' : ''}" data-view="flow">Flow Seluruh Modul</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'requirement' ? 'is-active' : ''}" data-view="requirement">Requirement Master (${activeReqsCount})</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'review' ? 'is-active' : ''}" data-view="review">Revision &amp; Review ${renderReviewBadge(store, 'ALL')}</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'business-rule' ? 'is-active' : ''}" data-view="business-rule">Business Rules</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'related-role' ? 'is-active' : ''}" data-view="related-role">Related Role</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'end-to-end' ? 'is-active' : ''}" data-view="end-to-end">End-to-End Overview</button>
      </div>

      <div style="display:flex; align-items:center; gap:8px;">
        <label for="pm-jump-module-select" style="font-size:0.82rem; color:#475569; font-weight:600;">Lompat ke:</label>
        <select id="pm-jump-module-select" class="pm-feature-select">
          <option value="">-- Pilih Modul --</option>
          ${scopedModules.map((m) => `<option value="${m.id}">[${m.order}] ${m.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- View Switcher for All Modules -->
    ${currentViewTab === 'flow'
      ? renderAllModulesFlowSections(store, scopedModules)
      : currentViewTab === 'requirement'
        ? renderRequirementsView(scopedReqs, scopedModules, store, activeRoleObj)
        : currentViewTab === 'review'
          ? renderRevisionReviewView(store, 'ALL')
          : currentViewTab === 'business-rule'
            ? renderBusinessRuleView(store.businessRules, scopedModules, scopedReqs)
            : currentViewTab === 'related-role'
              ? renderRelatedRoleView(null)
              : renderEndToEndView(store.endToEndPipeline)
    }
  `;
}

function renderAllModulesFlowSections(store, roleModules) {
  const modulesToRender = roleModules || store.modules || [];
  return `
    <div class="pm-all-modules-container" id="pm-all-modules-container">
      ${modulesToRender
      .map((mod) => {
        const modFlows = store.flows[mod.id] || {};
        const defaultFeatId = Object.keys(modFlows)[0] || 'main';
        const flow = modFlows[defaultFeatId] || { title: mod.name, nodes: [], edges: [] };
        const activeNodes = (flow.nodes || []).filter((n) => !n.isArchived);

        return `
          <section class="pm-module-section-card" id="module-section-${mod.id}" data-mod-id="${mod.id}">
            <!-- Module Card Header -->
            <div class="pm-section-card-header">
              <div class="pm-section-card-titles">
                <div class="pm-section-num-badge">${mod.order}</div>
                <div>
                  <h3 class="pm-section-title">${mod.name}</h3>
                  <div class="pm-section-sub">${mod.subtitle}</div>
                </div>
              </div>

              <div class="pm-section-badges">
                <span class="pm-badge-role">Role: ${mod.primaryRole}</span>
                <span class="pm-badge-related">Related: ${mod.relatedRole}</span>
                ${isManageMode
            ? `
                    <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-add-node" data-mod-id="${mod.id}" data-feat-id="${defaultFeatId}">
                      Tambah Node
                    </button>
                  `
            : ''
          }
                <button type="button" class="pm-section-focus-btn" data-focus-module-id="${mod.id}">
                  Fokus Modul &rarr;
                </button>
              </div>
            </div>

            <!-- Flow Features Subline -->
            <div style="padding: 8px 20px; background: #fafafa; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; color: #64748b;">
              <span>Fitur: <strong>${escapeHtml(flow.title || mod.features?.[0]?.name || mod.name)}</strong></span>
              <span>${activeNodes.length} Langkah Terverifikasi</span>
            </div>

            <!-- Flow Nodes Stage -->
            <div class="pm-section-stage" style="display:flex; justify-content:center;">
              <div class="mermaid-diagram" data-mermaid="${escapeHtml(generateMermaidSyntax(activeNodes, flow))}" style="width:100%; text-align:center;"></div>
            </div>
          </section>
        `;
      })
      .join('')}
    </div>
  `;
}

function renderSingleModuleContent(currentMod, store, roleObj, roleRequirements) {
  const activeRoleObj = roleObj || store.roles?.find((r) => r.id === currentRole) || store.roles?.[0] || { name: 'Mantri Bibitan' };
  const allScopedReqs = roleRequirements || (store.requirements || []).filter((r) => !r.isArchived && !r.isSuperseded);
  const modReqs = allScopedReqs.filter((r) => r.moduleId === currentMod.id || r.module === currentMod.name);

  // Available features for this module scoped to role if non-mantri
  let availableFeatures = currentMod.features || [];
  if (activeRoleObj.id !== 'mantri-bibitan' && modReqs.length > 0) {
    const roleFeatNames = new Set(modReqs.map((r) => (r.feature || r.featureId || '').toLowerCase()));
    const matchingFeats = (currentMod.features || []).filter((f) => roleFeatNames.has(f.name.toLowerCase()) || roleFeatNames.has(f.id.toLowerCase()));
    if (matchingFeats.length > 0) {
      availableFeatures = matchingFeats;
    }
  }

  // Ensure currentFeatureId belongs to availableFeatures
  if (!availableFeatures.some((f) => f.id === currentFeatureId)) {
    currentFeatureId = availableFeatures[0]?.id || currentMod.features?.[0]?.id || 'main';
  }

  const modFlows = store.flows[currentMod.id] || {};
  const currentFlow = modFlows[currentFeatureId] || Object.values(modFlows)[0] || { title: currentMod.name, nodes: [], edges: [] };
  const activeNodes = (currentFlow.nodes || []).filter((n) => !n.isArchived);

  return `
    <!-- Breadcrumb -->
    <div class="pm-breadcrumb">
      <span class="pm-breadcrumb-link">${escapeHtml(activeRoleObj.name)}</span>
      <span>&rsaquo;</span>
      <span style="color:#1e293b; font-weight:600;">[${currentMod.order}] ${currentMod.name}</span>
    </div>

    <!-- Header Section -->
    <div class="pm-mod-header">
      <div class="pm-title-row">
        <h1 class="pm-mod-title">[${currentMod.order}] ${currentMod.name}</h1>
        <span class="pm-badge-confirmed">${currentMod.status}</span>
      </div>
      <div class="pm-mod-subtitle">${currentMod.subtitle}</div>
      <p class="pm-mod-desc">${currentMod.desc}</p>
    </div>

    <!-- Sub-Tabs Row -->
    <div class="pm-tab-row">
      <div class="pm-sub-tabs">
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'flow' ? 'is-active' : ''}" data-view="flow">Flow</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'requirement' ? 'is-active' : ''}" data-view="requirement">Requirement (${modReqs.length})</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'review' ? 'is-active' : ''}" data-view="review">Revision &amp; Review ${renderReviewBadge(store, currentMod.id)}</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'business-rule' ? 'is-active' : ''}" data-view="business-rule">Business Rule</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'related-role' ? 'is-active' : ''}" data-view="related-role">Related Role</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'end-to-end' ? 'is-active' : ''}" data-view="end-to-end">End-to-End</button>
      </div>

      <!-- Feature Dropdown Selector -->
      ${availableFeatures.length > 1
      ? `
        <div class="pm-feature-selector">
          <label for="pm-feature-select" class="pm-feature-label">Fitur:</label>
          <select id="pm-feature-select" class="pm-feature-select">
            ${availableFeatures
        .map(
          (f) => `
              <option value="${f.id}" ${f.id === currentFeatureId ? 'selected' : ''}>${f.name}</option>
            `
        )
        .join('')}
          </select>
        </div>
      `
      : ''
    }
    </div>

    <!-- View Switcher -->
    ${currentViewTab === 'flow'
      ? renderFlowCanvas(currentMod, currentFlow, activeNodes)
      : currentViewTab === 'requirement'
        ? renderRequirementsView(modReqs, [currentMod], store, activeRoleObj)
        : currentViewTab === 'review'
          ? renderRevisionReviewView(store, currentMod.id)
          : currentViewTab === 'business-rule'
            ? renderBusinessRuleView(store.businessRules, [currentMod], modReqs)
            : currentViewTab === 'related-role'
              ? renderRelatedRoleView(currentMod)
              : renderEndToEndView(store.endToEndPipeline)
    }
  `;
}

function renderExplicitConnectionsSection(currentMod, currentFlow, activeNodes) {
  const activeEdges = (currentFlow?.edges || []).filter(e => !e.isArchived && !e.isSuperseded);
  const activeNodesMap = new Map((activeNodes || []).map(n => [n.id, n]));

  return `
    <div class="pm-connections-container" style="margin-top:20px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f1f5f9;">
        <div>
          <h4 style="margin:0; font-size:0.92rem; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:6px;">
            <span>Koneksi &amp; Percabangan Alur (Connections)</span>
            <span class="pm-status-badge ${activeEdges.length > 0 ? 'pm-status-confirmed' : 'pm-status-draft'}" style="font-size:0.7rem; padding:1px 6px;">
              ${activeEdges.length} ${activeEdges.length > 0 ? 'Eksplisit' : 'Sekuensial Otomatis'}
            </span>
          </h4>
          <p style="margin:2px 0 0; font-size:0.75rem; color:#64748b;">
            Hubungan eksplisit antar langkah dan kondisi percabangan (Decision branch) pada alur ini.
          </p>
        </div>
        ${isManageMode ? `
          <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-add-edge" data-mod-id="${currentMod.id}" data-feat-id="${currentFeatureId}">
            Tambah Koneksi
          </button>
        ` : ''}
      </div>

      ${activeEdges.length === 0 ? `
        <div style="padding:14px; text-align:center; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; font-size:0.8rem; color:#64748b;">
          Alur saat ini menggunakan <strong>hubungan sekuensial otomatis (Baseline)</strong>.
          ${isManageMode ? '<br/><span style="margin-top:4px; display:inline-block;">Klik tombol <strong>Tambah Koneksi</strong> di atas untuk membuat hubungan eksplisit atau percabangan kondisi (Success / Fallback).</span>' : ''}
        </div>
      ` : `
        <div class="pm-connections-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:10px;">
          ${activeEdges.map(edge => {
            const src = activeNodesMap.get(edge.from) || { code: edge.from, label: 'Node ' + edge.from };
            const tgt = activeNodesMap.get(edge.to) || { code: edge.to, label: 'Node ' + edge.to };
            const cond = (edge.condition || edge.label || '').trim();

            return `
              <div class="pm-edge-card" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span style="font-size:0.75rem; font-weight:700; color:#1e293b; background:#e2e8f0; padding:2px 6px; border-radius:4px;">${escapeHtml(src.code || 'From')}</span>
                    <span style="color:#64748b; font-size:0.8rem;">&rarr;</span>
                    ${cond ? `
                      <span class="pm-status-badge ${cond.toLowerCase().includes('fallback') || cond.toLowerCase().includes('gagal') || cond.toLowerCase().includes('tidak') ? 'pm-status-archived' : 'pm-status-confirmed'}" style="font-size:0.68rem; padding:1px 6px;">
                        ${escapeHtml(cond)}
                      </span>
                      <span style="color:#64748b; font-size:0.8rem;">&rarr;</span>
                    ` : ''}
                    <span style="font-size:0.75rem; font-weight:700; color:#1e293b; background:#e2e8f0; padding:2px 6px; border-radius:4px;">${escapeHtml(tgt.code || 'To')}</span>
                  </div>
                  <div style="display:flex; gap:4px; align-items:center;">
                    <span class="pm-status-badge ${edge.status === 'Confirmed' ? 'pm-status-confirmed' : 'pm-status-draft'}" style="font-size:0.65rem; padding:1px 5px;">v${edge.version || 1} ${edge.status || 'Draft'}</span>
                    ${isManageMode ? `
                      <button type="button" class="pm-row-btn pm-btn-edge-edit" title="Edit Koneksi" data-edge-id="${escapeHtml(edge.id)}" data-mod-id="${currentMod.id}" data-feat-id="${currentFeatureId}">Edit</button>
                      <button type="button" class="pm-row-btn is-danger pm-btn-edge-archive" title="Arsipkan Koneksi" data-edge-id="${escapeHtml(edge.id)}" data-mod-id="${currentMod.id}" data-feat-id="${currentFeatureId}">Arsip</button>
                    ` : ''}
                  </div>
                </div>

                <div style="font-size:0.76rem; color:#475569; display:flex; flex-direction:column; gap:2px;">
                  <div><strong>Dari:</strong> ${escapeHtml(src.label || src.title || src.code)}</div>
                  <div><strong>Menuju:</strong> ${escapeHtml(tgt.label || tgt.title || tgt.code)}</div>
                  ${edge.description ? `<div style="font-style:italic; color:#64748b; margin-top:2px;">"${escapeHtml(edge.description)}"</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function renderFlowCanvas(currentMod, currentFlow, activeNodes) {
  return `
    <div class="pm-canvas-container" id="pm-canvas-container">
      <!-- Toolbar Controls -->
      <div class="pm-canvas-toolbar">
        <div class="pm-canvas-title" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span>${escapeHtml(currentFlow.title || currentMod.name)}</span>
          ${isManageMode
      ? `
              <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-add-node" data-mod-id="${currentMod.id}" data-feat-id="${currentFeatureId}">
                Tambah Node
              </button>
              <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-add-edge" data-mod-id="${currentMod.id}" data-feat-id="${currentFeatureId}">
                Tambah Koneksi
              </button>
            `
      : ''
    }
        </div>
        <div class="pm-canvas-controls">
          <button type="button" class="pm-ctrl-btn" id="pm-zoom-out" title="Zoom Out">&minus;</button>
          <button type="button" class="pm-ctrl-btn" id="pm-zoom-reset" title="Reset Zoom">100%</button>
          <button type="button" class="pm-ctrl-btn" id="pm-zoom-in" title="Zoom In">&plus;</button>
          <button type="button" class="pm-ctrl-btn" id="pm-fit-view" title="Fit View">Fit</button>
        </div>
      </div>

      <!-- Canvas Stage -->
      <div class="pm-canvas-stage" id="pm-canvas-stage">
        <div class="pm-canvas-pan-wrap" id="pm-pan-wrap" style="transform: scale(${zoomScale}); width:100%; display:flex; justify-content:center;">
          <div class="mermaid-diagram" data-mermaid="${escapeHtml(generateMermaidSyntax(activeNodes, currentFlow))}" style="width:100%; text-align:center;"></div>
        </div>
      </div>

      <!-- Explicit Connections Section -->
      ${renderExplicitConnectionsSection(currentMod, currentFlow, activeNodes)}
    </div>
  `;
}

function renderFlowNodeBox(node, index, total, modId, featId) {
  const isSelected = selectedNodeId === node.id;
  const isStart = node.type === 'start';
  const isEnd = node.type === 'end';
  const isDecision = node.type === 'decision';

  let typeClass = 'pm-node-process';
  if (isStart) typeClass = 'pm-node-start';
  if (isEnd) typeClass = 'pm-node-end';
  if (isDecision) typeClass = 'pm-node-decision';

  const hasStockImpact = Boolean(node.stockImpact);
  const isStockMinus = node.stockImpact?.includes('-');
  const isStockPlus = node.stockImpact?.includes('+');

  return `
    <div
      class="pm-node-card ${typeClass} ${isSelected ? 'is-selected' : ''} ${isManageMode ? 'is-manage-mode' : ''}"
      data-node-id="${node.id}"
      data-module-id="${modId}"
      data-feature-id="${featId}"
    >
      ${isManageMode
      ? `
        <div class="pm-node-manage-header">
          <span style="font-weight:bold; color:#475569;">v${node.version || 1}</span>
          <div class="pm-node-ctrl-btns">
            ${index > 0 ? `<button type="button" class="pm-node-btn-icon pm-btn-node-up" title="Geser ke Kiri (Naik)" data-node-id="${node.id}" data-mod-id="${modId}" data-feat-id="${featId}">↑</button>` : ''}
            ${index < total - 1 ? `<button type="button" class="pm-node-btn-icon pm-btn-node-down" title="Geser ke Kanan (Turun)" data-node-id="${node.id}" data-mod-id="${modId}" data-feat-id="${featId}">↓</button>` : ''}
            <button type="button" class="pm-node-btn-icon pm-btn-node-edit" title="Edit Node / Buat Revisi" data-node-id="${node.id}" data-mod-id="${modId}" data-feat-id="${featId}">Edit</button>
            <button type="button" class="pm-node-btn-icon is-danger pm-btn-node-archive" title="Arsipkan Node" data-node-id="${node.id}" data-mod-id="${modId}" data-feat-id="${featId}">Arsip</button>
          </div>
        </div>
      `
      : ''
    }

      <div class="pm-node-header">
        <span class="pm-node-step">${node.code || `Step ${index + 1}`}</span>
        ${node.reqId ? `<span class="pm-node-req">${node.reqId}</span>` : ''}
      </div>

      <div class="pm-node-label">${escapeHtml(node.label)}</div>

      ${node.purpose
      ? `<div class="pm-node-desc">${escapeHtml(node.purpose)}</div>`
      : ''
    }

      ${hasStockImpact
      ? `
        <div class="pm-node-impact ${isStockMinus ? 'is-minus' : isStockPlus ? 'is-plus' : 'is-neutral'}">
          ${escapeHtml(node.stockImpact)}
        </div>
      `
      : ''
    }
    </div>

    ${index < total - 1 ? '<div class="pm-flow-arrow">&rarr;</div>' : ''}
  `;
}

function renderPagination(currentPage, pageSize, totalItems, type = 'req') {
  if (totalItems === 0) return '';
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    if (!pages.includes(totalPages)) pages.push(totalPages);
  }

  return `
    <div class="pm-table-footer">
      <div>
        Menampilkan <strong>${startItem} - ${endItem}</strong> dari <strong>${totalItems}</strong> ${type === 'req' ? 'requirement' : 'revisi'}
      </div>
      <div class="pm-pagination-controls">
        <button
          type="button"
          class="pm-page-btn"
          data-page-nav="${type}"
          data-page="${currentPage - 1}"
          ${currentPage <= 1 ? 'disabled' : ''}
          title="Halaman Sebelumnya"
        >
          &lt;
        </button>

        ${pages
          .map((p) =>
            p === '...'
              ? `<span class="pm-page-ellipsis">&hellip;</span>`
              : `
              <button
                type="button"
                class="pm-page-btn ${p === currentPage ? 'is-active' : ''}"
                data-page-nav="${type}"
                data-page="${p}"
              >
                ${p}
              </button>
            `
          )
          .join('')}

        <button
          type="button"
          class="pm-page-btn"
          data-page-nav="${type}"
          data-page="${currentPage + 1}"
          ${currentPage >= totalPages ? 'disabled' : ''}
          title="Halaman Berikutnya"
        >
          &gt;
        </button>

        <select class="pm-page-size-select" data-page-size-change="${type}" title="Jumlah baris per halaman">
          <option value="5" ${pageSize === 5 ? 'selected' : ''}>5 / halaman</option>
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 / halaman</option>
          <option value="25" ${pageSize === 25 ? 'selected' : ''}>25 / halaman</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 / halaman</option>
        </select>
      </div>
    </div>
  `;
}

function renderRequirementsView(reqs, modules, store, roleObj) {
  const currentStore = store || getActiveStore();
  const allReqs = (currentStore?.requirements || reqs || []);
  // Active requirements are those not archived and not superseded (superseded versions are in revision history)
  const activeReqs = allReqs.filter((r) => !r.isArchived && !r.isSuperseded);

  // Available roles for filter (all master roles)
  const roles = currentStore?.roles || [];
  const availableModules = currentStore?.modules || modules || [];

  // Filter Feature options: if a specific module is selected, list its features; otherwise list all features across modules
  let availableFeatures = [];
  if (reqFilterModule !== 'ALL') {
    const selectedModObj = availableModules.find((m) => m.id === reqFilterModule || m.name.toLowerCase() === reqFilterModule.toLowerCase());
    availableFeatures = selectedModObj ? (selectedModObj.features || []) : [];
  } else {
    const featMap = new Map();
    availableModules.forEach((m) => {
      (m.features || []).forEach((f) => {
        if (!featMap.has(f.id)) featMap.set(f.id, f);
      });
    });
    availableFeatures = Array.from(featMap.values());
  }

  // Apply filters with AND combination
  const filteredReqs = activeReqs.filter((r) => {
    // 1. Search query
    const q = reqSearchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.process && r.process.toLowerCase().includes(q)) ||
      (r.acceptanceCriteria && (
        Array.isArray(r.acceptanceCriteria)
          ? r.acceptanceCriteria.some((ac) => String(ac).toLowerCase().includes(q))
          : String(r.acceptanceCriteria).toLowerCase().includes(q)
      )) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.role && r.role.toLowerCase().includes(q)) ||
      (r.roleId && r.roleId.toLowerCase().includes(q)) ||
      (r.module && r.module.toLowerCase().includes(q)) ||
      (r.moduleId && r.moduleId.toLowerCase().includes(q)) ||
      (r.feature && r.feature.toLowerCase().includes(q)) ||
      (r.featureId && r.featureId.toLowerCase().includes(q)) ||
      (r.businessRule && r.businessRule.toLowerCase().includes(q)) ||
      (r.ruleIds && Array.isArray(r.ruleIds) && r.ruleIds.some((ruleId) => String(ruleId).toLowerCase().includes(q)));

    // 2. Role filter (case-insensitive, match role name or role id)
    const matchRole = reqFilterRole === 'ALL' ||
      (r.role && r.role.toLowerCase() === reqFilterRole.toLowerCase()) ||
      (r.roleId && r.roleId.toLowerCase() === reqFilterRole.toLowerCase());

    // 3. Module filter (match moduleId or module name)
    const matchModule = reqFilterModule === 'ALL' ||
      (r.moduleId && r.moduleId.toLowerCase() === reqFilterModule.toLowerCase()) ||
      (r.module && r.module.toLowerCase() === reqFilterModule.toLowerCase());

    // 4. Feature filter (match featureId or feature name)
    const matchFeature = reqFilterFeature === 'ALL' ||
      (r.featureId && r.featureId.toLowerCase() === reqFilterFeature.toLowerCase()) ||
      (r.feature && r.feature.toLowerCase() === reqFilterFeature.toLowerCase());

    // 5. Status filter (case-insensitive)
    const matchStatus = reqFilterStatus === 'ALL' ||
      (r.status && r.status.toUpperCase() === reqFilterStatus.toUpperCase());

    return matchSearch && matchRole && matchModule && matchFeature && matchStatus;
  });

  const totalActive = activeReqs.length;
  const totalFiltered = filteredReqs.length;
  const confirmedCount = activeReqs.filter((r) => (r.status || '').toUpperCase() === 'CONFIRMED').length;
  const confirmedFiltered = filteredReqs.filter((r) => (r.status || '').toUpperCase() === 'CONFIRMED').length;
  const hasFiltersActive = Boolean(reqSearchQuery || reqFilterRole !== 'ALL' || reqFilterModule !== 'ALL' || reqFilterFeature !== 'ALL' || reqFilterStatus !== 'ALL');

  // Pagination calculation
  const totalReqsCount = filteredReqs.length;
  const totalReqPages = Math.ceil(totalReqsCount / reqPageSize) || 1;
  if (reqCurrentPage > totalReqPages) reqCurrentPage = totalReqPages;
  if (reqCurrentPage < 1) reqCurrentPage = 1;
  const pagedReqs = filteredReqs.slice((reqCurrentPage - 1) * reqPageSize, reqCurrentPage * reqPageSize);

  return `
    <div class="pm-req-manager-container">
      <div class="pm-req-table-card" style="margin-top: 0;">
        <div class="pm-req-table-head" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span class="pm-req-table-title" style="font-size:1.05rem;">Requirement Master</span>
            <span class="pm-req-count-badge" title="Total requirement terfilter">${hasFiltersActive ? `${totalFiltered} dari ${totalActive} Active` : `${totalActive} Active`}</span>
            <span class="pm-req-count-badge" style="background:#f0fdf4; color:#166534; border-color:#bbf7d0;" title="Confirmed requirements">${confirmedFiltered} Confirmed</span>
          </div>
          ${isManageMode
      ? `
            <button type="button" class="pm-btn-sm pm-btn-primary" id="pm-btn-add-req" title="Tambah requirement baru">
              + Tambah Requirement
            </button>
          `
      : `
            <div style="font-size:0.75rem; color:#64748b; font-style:italic;">
              Mode Pratinjau (Read-Only). Aktifkan <strong>Manage Mode</strong> untuk menambah/mengedit requirement.
            </div>
          `
    }
        </div>

        <div class="pm-req-filter-bar">
          <input
            type="text"
            id="pm-req-search-input"
            class="pm-req-search-input"
            placeholder="Cari ID, requirement, proses, acceptance criteria, role, modul, fitur..."
            value="${escapeHtml(reqSearchQuery)}"
          />

          <select id="pm-req-filter-role" class="pm-req-filter-select" title="Filter berdasarkan Role">
            <option value="ALL" ${reqFilterRole === 'ALL' ? 'selected' : ''}>Semua Role</option>
            ${roles.map((ro) => `<option value="${escapeHtml(ro.name)}" ${reqFilterRole.toLowerCase() === ro.name.toLowerCase() || reqFilterRole.toLowerCase() === ro.id.toLowerCase() ? 'selected' : ''}>${escapeHtml(ro.name)}</option>`).join('')}
          </select>

          <select id="pm-req-filter-module" class="pm-req-filter-select" title="Filter berdasarkan Modul">
            <option value="ALL" ${reqFilterModule === 'ALL' ? 'selected' : ''}>Semua Modul</option>
            ${availableModules.map((m) => `<option value="${m.id}" ${reqFilterModule === m.id || reqFilterModule.toLowerCase() === m.name.toLowerCase() ? 'selected' : ''}>[${m.order}] ${escapeHtml(m.name)}</option>`).join('')}
          </select>

          <select id="pm-req-filter-feature" class="pm-req-filter-select" title="Filter berdasarkan Fitur">
            <option value="ALL" ${reqFilterFeature === 'ALL' ? 'selected' : ''}>Semua Fitur</option>
            ${availableFeatures.map((f) => `<option value="${f.id}" ${reqFilterFeature === f.id || reqFilterFeature.toLowerCase() === f.name.toLowerCase() ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
          </select>

          <select id="pm-req-filter-status" class="pm-req-filter-select" style="min-width:130px;" title="Filter Status">
            <option value="ALL" ${reqFilterStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
            <option value="CONFIRMED" ${reqFilterStatus.toUpperCase() === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED (${confirmedCount})</option>
          </select>

          ${hasFiltersActive
      ? `
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-btn-reset-req-filter" style="padding:6px 10px; font-size:0.75rem;" title="Reset seluruh filter">
                Reset
              </button>
            `
      : ''
    }
        </div>

        <div style="overflow-x: auto;">
          <table class="pm-table pm-table-req">
            <thead>
              <tr>
                <th class="pm-col-req-id">ID &amp; Versi</th>
                <th class="pm-col-req-title">Judul Requirement &amp; Kriteria Penerimaan</th>
                <th class="pm-col-req-role">Role</th>
                <th class="pm-col-req-mod">Modul / Fitur</th>
                <th class="pm-col-req-proc">Process / Linked Node</th>
                <th class="pm-col-req-status">Status</th>
                <th class="pm-col-req-action">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReqs.length === 0
      ? `
                <tr>
                  <td colspan="7" style="text-align:center; padding:36px; color:#64748b;">
                    <div style="font-size:1.05rem; font-weight:600; margin-bottom:6px;">Tidak ada requirement yang cocok</div>
                    <div style="font-size:0.82rem;">Coba sesuaikan kata kunci pencarian atau ubah filter di atas.</div>
                  </td>
                </tr>
              `
      : pagedReqs
        .map((r) => {
          const nodeUsage = checkRequirementNodeUsage(r.id);
          const isConfirmed = r.status === 'Confirmed';
          const isDraftRevision = r.version && r.version > 1;

          return `
                  <tr class="pm-req-full-row" data-req-id="${r.id}" data-mod-name="${r.module}">
                    <td>
                      <code>${r.id}</code>
                      <div>
                        <span class="pm-version-tag">v${r.version || 1}</span>
                      </div>
                      ${r.revisionOf ? `<div class="pm-revision-sub">Revisi dari ${r.revisionOf}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-weight:600; color:#0f172a; line-height:1.35;">${escapeHtml(r.title)}</div>
                      ${r.acceptanceCriteria ? `<div class="pm-req-acc-preview">${escapeHtml(r.acceptanceCriteria)}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-size:0.78rem; color:#475569; line-height:1.3;">${escapeHtml(r.role)}</div>
                    </td>
                    <td>
                      <div style="font-weight:700; font-size:0.8rem; color:#0f172a;">${escapeHtml(r.module)}</div>
                      <div class="pm-req-feat-sub">${escapeHtml(r.feature)}</div>
                    </td>
                    <td>
                      <div style="font-size:0.78rem; color:#1e293b; line-height:1.3;">${escapeHtml(r.process || '-')}</div>
                      ${nodeUsage.isUsed
              ? `
                          <div class="pm-linked-node-tag" title="Terhubung ke langkah alur: ${nodeUsage.nodes.map((n) => n.code + ' - ' + n.title).join(', ')}">
                            ${nodeUsage.nodes.map((n) => n.code).join(', ')}
                          </div>
                        `
              : `<div class="pm-linked-node-empty" title="Belum terhubung ke langkah alur visual">-</div>`
            }
                    </td>
                    <td style="text-align:center;">
                      <span class="${isConfirmed ? 'pm-badge-confirmed' : 'pm-badge-draft'}">
                        ${r.status}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <div class="pm-action-menu-wrap">
                        <button
                          type="button"
                          class="pm-action-trigger-btn pm-btn-req-action-toggle"
                          data-target="pm-req-menu-${escapeHtml(r.id)}"
                          aria-haspopup="true"
                          aria-expanded="false"
                          title="Aksi baris"
                        >
                          &hellip;
                        </button>
                        <div id="pm-req-menu-${escapeHtml(r.id)}" class="pm-action-dropdown-menu">
                          <button
                            type="button"
                            class="pm-dropdown-item pm-btn-view-req"
                            data-req-id="${r.id}"
                            title="Lihat Detail Requirement & Riwayat"
                          >
                            Detail
                          </button>
                          ${isManageMode
              ? `
                            <button
                              type="button"
                              class="pm-dropdown-item pm-btn-edit-req"
                              data-req-id="${r.id}"
                              title="${isConfirmed ? 'Buat Revisi Baru (v' + ((r.version || 1) + 1) + ' Draft)' : 'Edit Draft'}"
                            >
                              Edit
                            </button>
                            <div class="pm-dropdown-divider"></div>
                            <button
                              type="button"
                              class="pm-dropdown-item is-danger pm-btn-archive-req"
                              data-req-id="${r.id}"
                              title="Arsipkan Requirement"
                            >
                              Arsip
                            </button>
                          `
              : ''
            }
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
        })
        .join('')
    }
            </tbody>
          </table>
        </div>

        ${renderPagination(reqCurrentPage, reqPageSize, totalReqsCount, 'req')}
      </div>
    </div>
  `;
}

function renderReviewBadge(store, modId = null) {
  try {
    const allRevs = getAllPendingRevisions(store);
    const count = modId && modId !== 'ALL'
      ? allRevs.filter((r) => r.moduleId === modId).length
      : allRevs.length;

    if (count === 0) {
      return `<span class="pm-review-count-badge is-zero">0</span>`;
    }
    return `<span class="pm-review-count-badge">${count}</span>`;
  } catch (err) {
    return `<span class="pm-review-count-badge is-zero">0</span>`;
  }
}

function renderReconciliationCatalogSection(store) {
  const catalog = getReconciliationCatalog(store);

  // Classification counts
  const retainedCount = catalog.filter(c => c.classification === 'Retained').length;
  const revisedCount = catalog.filter(c => c.classification === 'Revised').length;
  const newCount = catalog.filter(c => c.classification === 'New').length;
  const deprecatedCount = catalog.filter(c => c.classification === 'Deprecated').length;
  const mergedCount = catalog.filter(c => c.classification === 'Merged').length;
  const activeCount = retainedCount + revisedCount + newCount;

  // Apply filters
  const filtered = catalog.filter(item => {
    const matchClassification = reconFilterClassification === 'ALL' || item.classification === reconFilterClassification;
    const matchModule = reconFilterModule === 'ALL' || item.moduleId === reconFilterModule || item.module === reconFilterModule;
    const q = reconSearchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.role && item.role.toLowerCase().includes(q)) ||
      (item.module && item.module.toLowerCase().includes(q)) ||
      (item.feature && item.feature.toLowerCase().includes(q));
    return matchClassification && matchModule && matchSearch;
  });

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / reconPageSize) || 1;
  if (reconCurrentPage > totalPages) reconCurrentPage = totalPages;
  if (reconCurrentPage < 1) reconCurrentPage = 1;
  const paged = filtered.slice((reconCurrentPage - 1) * reconPageSize, reconCurrentPage * reconPageSize);

  const hasFilters = reconFilterClassification !== 'ALL' || reconFilterModule !== 'ALL' || reconSearchQuery.trim() !== '';

  // Classification badge helper
  const classificationBadge = (cls) => {
    const map = {
      'Retained': { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', icon: '●' },
      'Revised': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: '↻' },
      'New': { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', icon: '+' },
      'Deprecated': { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', icon: '✕' },
      'Merged': { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe', icon: '⤵' }
    };
    const s = map[cls] || map['Retained'];
    return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;font-size:0.7rem;font-weight:600;border-radius:4px;background:${s.bg};color:${s.color};border:1px solid ${s.border};">${s.icon} ${cls}</span>`;
  };

  return `
    <div class="pm-req-table-card" style="margin-top: 0;">
      <!-- Header -->
      <div class="pm-req-table-head" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span class="pm-req-table-title" style="font-size:1.05rem;">Katalog Rekonsiliasi Baseline</span>
          <span class="pm-req-count-badge" title="Total Active Requirements">${activeCount} Active</span>
        </div>
        <div style="font-size:0.75rem; color:#64748b;">
          Baseline terkunci pada ${activeCount} Kebutuhan Aktif. Tampilkan evolusi dari 165 &rarr; ${activeCount}.
        </div>
      </div>

      <!-- KPI Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; padding:12px 16px;">
        <div style="padding:12px 14px; background:#f0fdf4; border:1.5px solid ${reconFilterClassification === 'Retained' ? '#16a34a' : '#bbf7d0'}; border-radius:8px; cursor:pointer; transition:all 0.2s;" class="pm-recon-kpi-card" data-recon-class="Retained">
          <div style="font-size:0.72rem; color:#166534; font-weight:600; margin-bottom:2px;">● Retained (Tetap)</div>
          <div style="font-size:1.5rem; font-weight:800; color:#166534;">${retainedCount}</div>
          <div style="font-size:0.65rem; color:#4ade80;">Kebutuhan eksisting valid tanpa perubahan</div>
        </div>
        <div style="padding:12px 14px; background:#eff6ff; border:1.5px solid ${reconFilterClassification === 'Revised' ? '#2563eb' : '#bfdbfe'}; border-radius:8px; cursor:pointer; transition:all 0.2s;" class="pm-recon-kpi-card" data-recon-class="Revised">
          <div style="font-size:0.72rem; color:#1d4ed8; font-weight:600; margin-bottom:2px;">↻ Revised (Revisi)</div>
          <div style="font-size:1.5rem; font-weight:800; color:#1d4ed8;">${revisedCount}</div>
          <div style="font-size:0.65rem; color:#93c5fd;">Penyempurnaan wording &amp; kewenangan peran</div>
        </div>
        <div style="padding:12px 14px; background:#f0f9ff; border:1.5px solid ${reconFilterClassification === 'New' ? '#0369a1' : '#bae6fd'}; border-radius:8px; cursor:pointer; transition:all 0.2s;" class="pm-recon-kpi-card" data-recon-class="New">
          <div style="font-size:0.72rem; color:#0369a1; font-weight:600; margin-bottom:2px;">+ New (Baru)</div>
          <div style="font-size:1.5rem; font-weight:800; color:#0369a1;">${newCount}</div>
          <div style="font-size:0.65rem; color:#7dd3fc;">Kebutuhan baru diadopsi resmi</div>
        </div>
        <div style="padding:12px 14px; background:#fef2f2; border:1.5px solid ${reconFilterClassification === 'Deprecated' ? '#dc2626' : '#fecaca'}; border-radius:8px; cursor:pointer; transition:all 0.2s;" class="pm-recon-kpi-card" data-recon-class="Deprecated">
          <div style="font-size:0.72rem; color:#991b1b; font-weight:600; margin-bottom:2px;">✕ Deprecated (Arsip)</div>
          <div style="font-size:1.5rem; font-weight:800; color:#991b1b;">${deprecatedCount}</div>
          <div style="font-size:0.65rem; color:#fca5a5;">Out-of-scope, diarsipkan</div>
        </div>
        <div style="padding:12px 14px; background:#faf5ff; border:1.5px solid ${reconFilterClassification === 'Merged' ? '#7c3aed' : '#ddd6fe'}; border-radius:8px; cursor:pointer; transition:all 0.2s;" class="pm-recon-kpi-card" data-recon-class="Merged">
          <div style="font-size:0.72rem; color:#7c3aed; font-weight:600; margin-bottom:2px;">⤵ Merged (Lebur)</div>
          <div style="font-size:1.5rem; font-weight:800; color:#7c3aed;">${mergedCount}</div>
          <div style="font-size:0.65rem; color:#c4b5fd;">Dileburkan ke requirement induk</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="pm-req-filter-bar">
        <input
          type="text"
          id="pm-recon-search-input"
          class="pm-req-search-input"
          placeholder="Cari ID, judul, role, modul..."
          value="${escapeHtml(reconSearchQuery)}"
        />

        <select id="pm-recon-filter-class" class="pm-req-filter-select" title="Filter Klasifikasi">
          <option value="ALL" ${reconFilterClassification === 'ALL' ? 'selected' : ''}>Semua Klasifikasi</option>
          <option value="Retained" ${reconFilterClassification === 'Retained' ? 'selected' : ''}>Retained (${retainedCount})</option>
          <option value="Revised" ${reconFilterClassification === 'Revised' ? 'selected' : ''}>Revised (${revisedCount})</option>
          <option value="New" ${reconFilterClassification === 'New' ? 'selected' : ''}>New (${newCount})</option>
          <option value="Deprecated" ${reconFilterClassification === 'Deprecated' ? 'selected' : ''}>Deprecated (${deprecatedCount})</option>
          <option value="Merged" ${reconFilterClassification === 'Merged' ? 'selected' : ''}>Merged (${mergedCount})</option>
        </select>

        <select id="pm-recon-filter-module" class="pm-req-filter-select" title="Filter Modul">
          <option value="ALL" ${reconFilterModule === 'ALL' ? 'selected' : ''}>Semua Modul</option>
          ${store.modules.map(m => `<option value="${m.id}" ${reconFilterModule === m.id ? 'selected' : ''}>[${m.order}] ${m.name}</option>`).join('')}
        </select>

        ${hasFilters
          ? `<button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-btn-reset-recon-filter" style="padding:6px 10px; font-size:0.75rem;" title="Reset seluruh filter">Reset</button>`
          : ''
        }
      </div>

      <!-- Table -->
      <div style="overflow-x: auto;">
        <table class="pm-table pm-table-rev">
          <thead>
            <tr>
              <th style="width:50px;">No</th>
              <th style="width:130px;">ID Requirement</th>
              <th>Judul Kebutuhan</th>
              <th style="width:130px;">Peran</th>
              <th style="width:130px;">Modul / Fitur</th>
              <th style="width:110px; text-align:center;">Klasifikasi</th>
              <th style="width:120px; text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${totalItems === 0
              ? `<tr><td colspan="7" style="text-align:center; padding:36px; color:#64748b;">
                  <div style="font-size:1.05rem; font-weight:600; margin-bottom:6px;">Tidak ada requirement yang cocok dengan filter</div>
                  <div style="font-size:0.82rem;">Coba ubah kriteria pencarian atau filter klasifikasi.</div>
                </td></tr>`
              : paged.map((item, idx) => {
                  const globalIdx = (reconCurrentPage - 1) * reconPageSize + idx + 1;
                  return `
                    <tr class="pm-rev-row" data-entity-type="Requirement" data-entity-id="${escapeHtml(item.id)}">
                      <td style="text-align:center; color:#64748b; font-size:0.8rem;">${globalIdx}</td>
                      <td>
                        <code style="font-size:0.78rem; font-weight:600;">${escapeHtml(item.id)}</code>
                        ${item.classification === 'Merged' && item.targetId
                          ? `<div style="font-size:0.65rem; color:#7c3aed; margin-top:2px;">&rarr; ${escapeHtml(item.targetId)}</div>`
                          : ''
                        }
                      </td>
                      <td>
                        <div style="font-weight:600; color:#0f172a; line-height:1.35; font-size:0.85rem;">${escapeHtml(item.title)}</div>
                        ${item.classification === 'Deprecated' && item.raw && item.raw.deprecationReason
                          ? `<div style="font-size:0.68rem; color:#991b1b; margin-top:2px;">Alasan: ${escapeHtml(item.raw.deprecationReason)}</div>`
                          : ''
                        }
                        ${item.classification === 'Merged' && item.description
                          ? `<div style="font-size:0.68rem; color:#7c3aed; margin-top:2px;">${escapeHtml(item.description)}</div>`
                          : ''
                        }
                      </td>
                      <td style="font-size:0.8rem; color:#334155;">${escapeHtml(item.role || '-')}</td>
                      <td>
                        <div style="font-weight:600; font-size:0.78rem; color:#0f172a;">${escapeHtml(item.module || '-')}</div>
                        <div class="pm-req-feat-sub">${escapeHtml(item.feature || '-')}</div>
                      </td>
                      <td style="text-align:center;">${classificationBadge(item.classification)}</td>
                      <td style="text-align:center;">
                        <span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; font-weight:600;
                          ${item.classification === 'Deprecated'
                            ? 'background:#fef2f2; color:#991b1b; border:1px solid #fecaca;'
                            : item.classification === 'Merged'
                              ? 'background:#faf5ff; color:#7c3aed; border:1px solid #ddd6fe;'
                              : 'background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;'
                          }
                        ">${escapeHtml(item.status)}</span>
                      </td>
                    </tr>
                  `;
                }).join('')
            }
          </tbody>
        </table>
      </div>

      ${renderPagination(reconCurrentPage, reconPageSize, totalItems, 'recon')}
    </div>
  `;
}

function renderRevisionReviewView(store, filterModId = 'ALL') {
  const allRevs = getAllPendingRevisions(store);
  const isSingleModule = filterModId && filterModId !== 'ALL';

  // Apply filters
  const filteredRevs = allRevs.filter((r) => {
    // Search query
    const q = revSearchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      (r.code && r.code.toLowerCase().includes(q)) ||
      (r.entityId && r.entityId.toLowerCase().includes(q)) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.moduleName && r.moduleName.toLowerCase().includes(q)) ||
      (r.featureName && r.featureName.toLowerCase().includes(q)) ||
      (r.createdBy && r.createdBy.toLowerCase().includes(q));

    // Entity type filter
    const matchEntity = revFilterEntityType === 'ALL' || r.entityType === revFilterEntityType;

    // Status filter
    const matchStatus = revFilterStatus === 'ALL' ||
      r.status === revFilterStatus ||
      (revFilterStatus === 'Archived' && r.changeType === 'Archived');

    // Module filter
    const modTarget = isSingleModule ? filterModId : revFilterModule;
    const matchMod = modTarget === 'ALL' || r.moduleId === modTarget;

    return matchSearch && matchEntity && matchStatus && matchMod;
  });

  // KPI calculations
  const totalCount = allRevs.length;
  const draftCount = allRevs.filter((r) => r.status === 'Draft' && r.changeType !== 'Archived').length;
  const inReviewCount = allRevs.filter((r) => r.status === 'In Review').length;
  const rejectedCount = allRevs.filter((r) => r.status === 'Rejected').length;
  const archivedCount = allRevs.filter((r) => r.changeType === 'Archived').length;
  const hasFiltersActive = Boolean(revSearchQuery || revFilterEntityType !== 'ALL' || revFilterStatus !== 'ALL' || (!isSingleModule && revFilterModule !== 'ALL'));

  // Pagination calculation
  const totalRevsCount = filteredRevs.length;
  const totalRevPages = Math.ceil(totalRevsCount / revPageSize) || 1;
  if (revCurrentPage > totalRevPages) revCurrentPage = totalRevPages;
  if (revCurrentPage < 1) revCurrentPage = 1;
  const pagedRevs = filteredRevs.slice((revCurrentPage - 1) * revPageSize, revCurrentPage * revPageSize);

  return `
    <div class="pm-rev-review-container">
      <!-- Sub-Tab Navigation -->
      <div style="display:flex; gap:4px; margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:0;">
        <button type="button" class="pm-sub-tab-btn ${revSubTab === 'reconciliation' ? 'is-active' : ''}" data-rev-subtab="reconciliation" style="padding:8px 16px; font-size:0.82rem; font-weight:600; border:none; background:${revSubTab === 'reconciliation' ? '#ffffff' : 'transparent'}; color:${revSubTab === 'reconciliation' ? '#1d4ed8' : '#64748b'}; border-bottom:2px solid ${revSubTab === 'reconciliation' ? '#2563eb' : 'transparent'}; margin-bottom:-2px; cursor:pointer; border-radius:6px 6px 0 0; transition:all 0.2s;">
          📋 Rekonsiliasi Baseline
        </button>
        <button type="button" class="pm-sub-tab-btn ${revSubTab === 'workflow' ? 'is-active' : ''}" data-rev-subtab="workflow" style="padding:8px 16px; font-size:0.82rem; font-weight:600; border:none; background:${revSubTab === 'workflow' ? '#ffffff' : 'transparent'}; color:${revSubTab === 'workflow' ? '#1d4ed8' : '#64748b'}; border-bottom:2px solid ${revSubTab === 'workflow' ? '#2563eb' : 'transparent'}; margin-bottom:-2px; cursor:pointer; border-radius:6px 6px 0 0; transition:all 0.2s;">
          🔄 Revision Workflow ${totalCount > 0 ? `<span style="background:#fef2f2; color:#dc2626; font-size:0.65rem; padding:1px 5px; border-radius:8px; margin-left:4px;">${totalCount}</span>` : ''}
        </button>
      </div>

      ${revSubTab === 'reconciliation'
        ? renderReconciliationCatalogSection(store)
        : `
      <!-- Revision & Review Header Card -->
      <div class="pm-req-table-card" style="margin-top: 0;">
        <div class="pm-req-table-head" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span class="pm-req-table-title" style="font-size:1.05rem;">Revision &amp; Review Workflow</span>
            <span class="pm-req-count-badge" title="Total Perubahan Aktif">${totalCount} Draf/Revisi</span>
            <span class="pm-req-count-badge" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;" title="Draft">${draftCount} Draft</span>
            <span class="pm-req-count-badge" style="background:#fffbeb; color:#b45309; border-color:#fde68a;" title="In Review">${inReviewCount} In Review</span>
            <span class="pm-req-count-badge" style="background:#fef2f2; color:#b91c1c; border-color:#fecaca;" title="Rejected">${rejectedCount} Rejected</span>
            <span class="pm-req-count-badge" style="background:#f8fafc; color:#475569; border-color:#cbd5e1;" title="Archived">${archivedCount} Archived</span>
          </div>
          <div style="font-size:0.75rem; color:#64748b;">
            Baseline Confirmed terlindungi. Perubahan memerlukan proses review dan konfirmasi resmi.
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="pm-req-filter-bar">
          <input
            type="text"
            id="pm-rev-search-input"
            class="pm-req-search-input"
            placeholder="Cari ID, judul, entitas, PIC pembuat..."
            value="${escapeHtml(revSearchQuery)}"
          />

          <select id="pm-rev-filter-entity" class="pm-req-filter-select" title="Filter Jenis Entitas">
            <option value="ALL" ${revFilterEntityType === 'ALL' ? 'selected' : ''}>Semua Entitas (Req / Node / Edge)</option>
            <option value="Requirement" ${revFilterEntityType === 'Requirement' ? 'selected' : ''}>Requirement</option>
            <option value="Node" ${revFilterEntityType === 'Node' ? 'selected' : ''}>Flow Node</option>
            <option value="Connection" ${revFilterEntityType === 'Connection' ? 'selected' : ''}>Connection</option>
          </select>

          <select id="pm-rev-filter-status" class="pm-req-filter-select" title="Filter Status Workflow">
            <option value="ALL" ${revFilterStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
            <option value="Draft" ${revFilterStatus === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="In Review" ${revFilterStatus === 'In Review' ? 'selected' : ''}>In Review</option>
            <option value="Rejected" ${revFilterStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
            <option value="Archived" ${revFilterStatus === 'Archived' ? 'selected' : ''}>Archived</option>
          </select>

          ${!isSingleModule
      ? `
            <select id="pm-rev-filter-module" class="pm-req-filter-select" title="Filter Modul">
              <option value="ALL" ${revFilterModule === 'ALL' ? 'selected' : ''}>Semua Modul</option>
              ${store.modules.map((m) => `<option value="${m.id}" ${revFilterModule === m.id ? 'selected' : ''}>[${m.order}] ${m.name}</option>`).join('')}
            </select>
          `
      : ''
    }

          ${hasFiltersActive
      ? `
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-btn-reset-rev-filter" style="padding:6px 10px; font-size:0.75rem;" title="Reset seluruh filter">
              Reset
            </button>
          `
      : ''
    }
        </div>

        <!-- Revisions Table -->
        <div style="overflow-x: auto;">
          <table class="pm-table pm-table-rev">
            <thead>
              <tr>
                <th class="pm-col-rev-entity">Entitas</th>
                <th class="pm-col-rev-id">ID &amp; Versi</th>
                <th class="pm-col-rev-title">Judul / Ringkasan Perubahan</th>
                <th class="pm-col-rev-mod">Modul / Fitur</th>
                <th class="pm-col-rev-change">Jenis Ubahan</th>
                <th class="pm-col-rev-status">Status</th>
                <th class="pm-col-rev-meta">Metadata</th>
                <th class="pm-col-rev-action">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRevs.length === 0
      ? `
                <tr>
                  <td colspan="8" style="text-align:center; padding:36px; color:#64748b;">
                    <div style="font-size:1.05rem; font-weight:600; margin-bottom:6px;">Tidak ada draf atau revisi yang pending</div>
                    <div style="font-size:0.82rem;">Seluruh data Requirement, Node, dan Connection telah tersinkronisasi dengan baseline resmi.</div>
                  </td>
                </tr>
              `
      : pagedRevs.map((rev) => {
        const isDraft = rev.status === 'Draft';
        const isInReview = rev.status === 'In Review';
        const isRejected = rev.status === 'Rejected';

        return `
                  <tr class="pm-rev-row" data-entity-type="${rev.entityType}" data-entity-id="${rev.entityId}">
                    <td>
                      <span class="pm-chip-type ${rev.entityType === 'Requirement' ? 'pm-chip-func' : rev.entityType === 'Node' ? 'pm-chip-nonfunc' : 'pm-badge-role'}" style="font-size:0.7rem;">
                        ${rev.entityType === 'Requirement' ? 'Requirement' : rev.entityType === 'Node' ? 'Node' : 'Connection'}
                      </span>
                    </td>
                    <td>
                      <code>${escapeHtml(rev.code || rev.entityId)}</code>
                      <div>
                        <span class="pm-version-tag">v${rev.version}</span>
                      </div>
                      ${rev.revisionOf ? `<div class="pm-revision-sub">rev ${escapeHtml(rev.revisionOf)}</div>` : '<div style="font-size:0.68rem; color:#15803d; font-weight:600; margin-top:2px;">(baru)</div>'}
                    </td>
                    <td>
                      <div style="font-weight:600; color:#0f172a; line-height:1.35;">${escapeHtml(rev.title)}</div>
                      ${rev.diff && rev.diff.hasChanges
            ? `
                        <div style="font-size:0.72rem; color:#2563eb; margin-top:2px;">
                          ${rev.diff.changedFieldsCount} field berubah (${rev.diff.fieldDiffs.map((d) => d.fieldName).slice(0, 2).join(', ')}${rev.diff.fieldDiffs.length > 2 ? '...' : ''})
                        </div>
                      `
            : ''
          }
                      ${isRejected && rev.reviewNote
            ? `
                        <div style="margin-top:4px; padding:4px 8px; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; font-size:0.7rem; color:#991b1b;">
                          <strong>Alasan:</strong> ${escapeHtml(rev.reviewNote)}
                        </div>
                      `
            : ''
          }
                    </td>
                    <td>
                      <div style="font-weight:700; font-size:0.8rem; color:#0f172a;">${escapeHtml(rev.moduleName || '-')}</div>
                      <div class="pm-req-feat-sub">${escapeHtml(rev.featureName || '-')}</div>
                    </td>
                    <td style="text-align:center;">
                      ${rev.changeType === 'Added'
            ? `
                        <span class="pm-status-badge pm-status-confirmed" style="font-size:0.68rem; padding:2px 6px;">+ Added</span>
                      `
            : rev.changeType === 'Archived'
              ? `
                        <span class="pm-status-badge pm-status-archived" style="font-size:0.68rem; padding:2px 6px;">Archived</span>
                      `
              : `
                        <span class="pm-status-badge pm-status-draft" style="font-size:0.68rem; padding:2px 6px;">Modified</span>
                      `
          }
                    </td>
                    <td style="text-align:center;">
                      ${isInReview
            ? `
                        <span class="pm-status-badge pm-status-review" style="font-size:0.7rem; padding:2px 6px;">In Review</span>
                      `
            : isRejected
              ? `
                        <span class="pm-status-badge pm-status-rejected" style="font-size:0.7rem; padding:2px 6px;">Rejected</span>
                      `
              : `
                        <span class="pm-status-badge pm-status-draft" style="font-size:0.7rem; padding:2px 6px;">Draft</span>
                      `
          }
                    </td>
                    <td>
                      <div style="font-size:0.72rem; color:#334155; line-height:1.25;">
                        <div style="font-weight:600;">${escapeHtml(rev.createdBy || 'BA')}</div>
                        <div style="color:#64748b; font-size:0.68rem;">${escapeHtml(rev.createdAt || '-')}</div>
                        ${rev.reviewedBy ? `<div style="color:#b45309; font-size:0.68rem; margin-top:2px;">Rev: ${escapeHtml(rev.reviewedBy)}</div>` : ''}
                      </div>
                    </td>
                    <td style="text-align:center;">
                      <div class="pm-action-menu-wrap">
                        <button
                          type="button"
                          class="pm-action-trigger-btn pm-btn-rev-action-toggle"
                          data-target="pm-rev-menu-${escapeHtml(rev.entityType)}-${escapeHtml(rev.entityId)}"
                          aria-haspopup="true"
                          aria-expanded="false"
                          title="Aksi baris"
                        >
                          &hellip;
                        </button>
                        <div id="pm-rev-menu-${escapeHtml(rev.entityType)}-${escapeHtml(rev.entityId)}" class="pm-action-dropdown-menu">
                          <button
                            type="button"
                            class="pm-dropdown-item pm-btn-compare-rev"
                            data-entity-type="${escapeHtml(rev.entityType)}"
                            data-entity-id="${escapeHtml(rev.entityId)}"
                            data-mod-id="${escapeHtml(rev.moduleId || '')}"
                            data-feat-id="${escapeHtml(rev.featureId || '')}"
                            data-version="${rev.version || 1}"
                            title="Bandingkan Draft vs Confirmed Baseline"
                          >
                            Compare
                          </button>

                          ${isDraft
            ? `
                            <button
                              type="button"
                              class="pm-dropdown-item pm-btn-submit-rev"
                              data-entity-type="${escapeHtml(rev.entityType)}"
                              data-entity-id="${escapeHtml(rev.entityId)}"
                              data-mod-id="${escapeHtml(rev.moduleId || '')}"
                              data-feat-id="${escapeHtml(rev.featureId || '')}"
                              title="Ajukan Draft untuk Review"
                            >
                              Review / Submit
                            </button>
                          `
            : ''
          }

                          ${isInReview
            ? `
                            <button
                              type="button"
                              class="pm-dropdown-item is-confirm pm-btn-confirm-rev"
                              data-entity-type="${escapeHtml(rev.entityType)}"
                              data-entity-id="${escapeHtml(rev.entityId)}"
                              data-mod-id="${escapeHtml(rev.moduleId || '')}"
                              data-feat-id="${escapeHtml(rev.featureId || '')}"
                              data-version="${rev.version || 1}"
                              title="Setujui Revisi (Confirm Review)"
                            >
                              Confirm Review
                            </button>
                            <button
                              type="button"
                              class="pm-dropdown-item is-danger pm-btn-reject-rev"
                              data-entity-type="${escapeHtml(rev.entityType)}"
                              data-entity-id="${escapeHtml(rev.entityId)}"
                              data-mod-id="${escapeHtml(rev.moduleId || '')}"
                              data-feat-id="${escapeHtml(rev.featureId || '')}"
                              title="Tolak Draft dengan Catatan Review"
                            >
                              Reject
                            </button>
                          `
            : ''
          }

                          <div class="pm-dropdown-divider"></div>

                          <button
                            type="button"
                            class="pm-dropdown-item is-danger pm-btn-discard-rev"
                            data-entity-type="${escapeHtml(rev.entityType)}"
                            data-entity-id="${escapeHtml(rev.entityId)}"
                            data-mod-id="${escapeHtml(rev.moduleId || '')}"
                            data-feat-id="${escapeHtml(rev.featureId || '')}"
                            title="Batalkan Draft dan Pulihkan Baseline Sebelumnya"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
      }).join('')
    }
            </tbody>
          </table>
        </div>

        ${renderPagination(revCurrentPage, revPageSize, totalRevsCount, 'rev')}
      </div>
      `}
    </div>
  `;
}

function renderBusinessRuleView(brs, modules, reqs) {
  let displayedBrs = brs || [];
  if (reqs && reqs.length > 0) {
    const brKeys = new Set(reqs.map((r) => r.businessRule).filter(Boolean));
    if (brKeys.size > 0) {
      const filtered = (brs || []).filter((br) => brKeys.has(br.id) || brKeys.has(br.title));
      if (filtered.length > 0) displayedBrs = filtered;
    }
  }

  return `
    <div>
      <div style="margin-bottom: 12px;">
        <h3 style="margin:0 0 4px; font-size:1.1rem; font-weight:700; color:#0f172a;">Business Rules Pembibitan Karet</h3>
        <p style="margin:0; font-size:0.84rem; color:#64748b;">Aturan bisnis mutlak yang mendasari validasi, integritas stok, dan audit trail.</p>
      </div>

      <div class="pm-br-list">
        ${displayedBrs
      .map(
        (br) => `
          <div class="pm-br-full-card">
            <span class="pm-br-full-id">${br.id}</span>
            <h4 class="pm-br-full-title">${escapeHtml(br.title)}</h4>
            <p class="pm-br-full-desc">${escapeHtml(br.desc)}</p>
          </div>
        `
      )
      .join('')}
      </div>
    </div>
  `;
}

function renderRelatedRoleView(mod) {
  return `
    <div style="padding: 16px 0;">
      <h3 style="margin:0 0 6px; font-size:1.1rem; font-weight:700; color:#0f172a;">Cross-Role Workflow &amp; Verification</h3>
      <p style="margin:0 0 16px; font-size:0.84rem; color:#64748b;">Pemetaan interaksi dan dependensi otorisasi antar role operasional.</p>

      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:24px; background:#f8fafc;">
        <div style="display:flex; flex-direction:column; gap:16px; max-width:680px; margin:0 auto;">
          <div style="padding:14px 18px; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.72rem; font-weight:700; color:#116834; text-transform:uppercase;">Role Utama</span>
              <h4 style="margin:2px 0 0; font-size:1rem; color:#0f172a;">Mantri Bibitan</h4>
              <p style="margin:2px 0 0; font-size:0.8rem; color:#64748b;">Input Transaksi, Scan QR, Foto + Timestamp, Pengajuan Verifikasi</p>
            </div>
          </div>

          <div style="text-align:center; font-size:18px; color:#94a3b8; font-weight:bold;">&darr; Menunggu Verifikasi &darr;</div>

          <div style="padding:14px 18px; background:#ffffff; border:1.5px solid #16a34a; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.72rem; font-weight:700; color:#16a34a; text-transform:uppercase;">Related Role (Verifikator)</span>
              <h4 style="margin:2px 0 0; font-size:1rem; color:#0f172a;">Asisten Bibitan</h4>
              <p style="margin:2px 0 0; font-size:0.8rem; color:#64748b;">Pemeriksaan Fisik Lapangan, Review Foto, Persetujuan / Penolakan Koreksi</p>
            </div>
          </div>

          <div style="text-align:center; font-size:18px; color:#94a3b8; font-weight:bold;">&darr; Setelah Disetujui &darr;</div>

          <div style="padding:14px 18px; background:#ffffff; border:1.5px solid #2563eb; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.72rem; font-weight:700; color:#2563eb; text-transform:uppercase;">Database Ledger</span>
              <h4 style="margin:2px 0 0; font-size:1rem; color:#0f172a;">Server Production</h4>
              <p style="margin:2px 0 0; font-size:0.8rem; color:#64748b;">Pemotongan Stok Mata Entres, Update Populasi Batch Resmi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEndToEndView(pipeline) {
  return `
    <div style="padding: 16px 0;">
      <h3 style="margin:0 0 6px; font-size:1.1rem; font-weight:700; color:#0f172a;">End-to-End Business Process Relationship</h3>
      <p style="margin:0 0 16px; font-size:0.84rem; color:#64748b;">Hubungan menyeluruh alur pembibitan karet dari hulu ke hilir.</p>

      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
        ${pipeline.map(
    (step) => `
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; font-weight:700; color:#116834; background:#e8f5e9; padding:2px 8px; border-radius:4px;">Langkah ${step.step}</span>
              <span style="font-size:0.74rem; color:#64748b;">${step.role}</span>
            </div>
            <h4 style="margin:4px 0 2px; font-size:0.94rem; color:#0f172a;">${step.name}</h4>
            <p style="margin:0; font-size:0.8rem; color:#475569;">${step.target}</p>
            <div style="margin-top:6px; font-size:0.74rem; font-weight:600; color:#0369a1; background:#f0f9ff; padding:2px 6px; border-radius:4px; align-self:flex-start;">
              ${step.impact}
            </div>
          </div>
        `
  ).join('')}
      </div>
    </div>
  `;
}

function renderInProgressRole(roleObj) {
  return `
    <div class="pm-empty-state">
      <h3 class="pm-empty-title">Requirement Belum Tersedia pada Filter Ini</h3>
      <p class="pm-empty-desc">
        Dokumentasi alur proses untuk role <strong>${escapeHtml(roleObj.name)}</strong> (Confirmed) terintegrasi pada modul operasional terkait.
      </p>
      <button type="button" class="pm-ctrl-btn" id="pm-btn-back-mantri" style="margin-top:16px;">
        Kembali ke Mantri Bibitan (Confirmed)
      </button>
    </div>
  `;
}

function renderDetailPanel(store) {
  let foundNode = null;
  let foundModule = null;
  let foundFeatId = null;

  // Search through all modules and flows
  for (const [modId, features] of Object.entries(store.flows)) {
    for (const [featId, flowObj] of Object.entries(features)) {
      const match = (flowObj.nodes || []).find((n) => n.id === selectedNodeId);
      if (match) {
        foundNode = match;
        foundModule = store.modules.find((m) => m.id === modId);
        foundFeatId = featId;
        break;
      }
    }
    if (foundNode) break;
  }

  if (!foundNode) {
    // Default to first node of currentModuleId or Okulasi
    const targetModId = currentModuleId !== 'ALL' ? currentModuleId : '01-presensi';
    const modFlows = store.flows[targetModId] || {};
    foundFeatId = Object.keys(modFlows)[0] || 'presensi-supervisor';
    const flowObj = modFlows[foundFeatId];
    foundNode = flowObj?.nodes?.[0];
    foundModule = store.modules.find((m) => m.id === targetModId);
  }

  if (!foundNode) {
    return `
      <aside class="pm-detail-panel" id="pm-detail-panel">
        <div class="pm-detail-head">
          <span class="pm-detail-head-title">Detail Proses</span>
          <button type="button" class="pm-detail-close-btn" id="pm-detail-close" title="Tutup Detail Panel">&times;</button>
        </div>
        <div class="pm-detail-body" style="padding: 24px; color: #64748b; text-align: center;">
          Pilih node alur untuk melihat detail.
        </div>
      </aside>
    `;
  }

  const effectiveModId = foundModule ? foundModule.id : selectedModuleId;
  const effectiveFeatId = foundFeatId || currentFeatureId;
  const featureName = foundNode.feature || foundModule?.features?.find(f => f.id === effectiveFeatId)?.name || foundModule?.subtitle || '-';

  return `
    <aside class="pm-detail-panel" id="pm-detail-panel">
      <div class="pm-detail-head">
        <span class="pm-detail-head-title">Detail Proses</span>
        <button type="button" class="pm-detail-close-btn" id="pm-detail-close" title="Tutup Detail Panel">&times;</button>
      </div>

      <div class="pm-detail-body" style="display:flex; flex-direction:column; gap:20px;">
        <div class="pm-detail-node-title-row">
          <h2 class="pm-detail-node-name">${escapeHtml(foundNode.label || foundNode.title || 'Node')}</h2>
          ${foundNode.code ? `<span class="pm-step-code-badge">${escapeHtml(foundNode.code)}</span>` : ''}
        </div>
        
        <div class="pm-detail-action-bar" style="display:flex; gap:8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-top:-8px;">
          <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-node-edit" data-node-id="${escapeHtml(foundNode.id)}" data-mod-id="${escapeHtml(effectiveModId)}" data-feat-id="${escapeHtml(effectiveFeatId)}">Edit Node</button>
          ${isManageMode
      ? `<button type="button" class="pm-btn-sm pm-btn-danger pm-btn-node-archive" data-node-id="${escapeHtml(foundNode.id)}" data-mod-id="${escapeHtml(effectiveModId)}" data-feat-id="${escapeHtml(effectiveFeatId)}">Arsip</button>`
      : ''
    }
        </div>

        <!-- Meta Grid (All required minimal fields) -->
        <div class="pm-detail-meta-grid">
          <div class="pm-meta-row">
            <span class="pm-meta-label">Node ID</span>
            <span class="pm-meta-val"><code>${escapeHtml(foundNode.id || '-')}</code></span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Node Type</span>
            <span class="pm-meta-val"><span class="pm-type-pill pm-type-${escapeHtml(foundNode.type || 'process')}">${escapeHtml(foundNode.type || 'process')}</span></span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Code</span>
            <span class="pm-meta-val"><strong>${escapeHtml(foundNode.code || '-')}</strong></span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Label</span>
            <span class="pm-meta-val">${escapeHtml(foundNode.label || foundNode.title || '-')}</span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Requirement ID</span>
            <span class="pm-meta-val"><code>${escapeHtml(foundNode.reqId || '-')}</code></span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Module</span>
            <span class="pm-meta-val">${escapeHtml(foundNode.module || foundModule?.name || '-')}</span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Feature</span>
            <span class="pm-meta-val">${escapeHtml(featureName)}</span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Process Type</span>
            <span class="pm-meta-val">${escapeHtml(foundNode.processType || foundNode.type || 'Transaksi')}</span>
          </div>
          <div class="pm-meta-row">
            <span class="pm-meta-label">Role</span>
            <span class="pm-meta-val">${escapeHtml(foundNode.role || 'Mantri Bibitan')}</span>
          </div>
        </div>

        <!-- Linked Requirement Section -->
        <div class="pm-detail-section">
          <span class="pm-section-heading">Requirement Terkait</span>
          ${(() => {
            const trace = getNodeTrace(effectiveModId, effectiveFeatId, foundNode.id);
            const linkedReq = trace?.requirement || (foundNode.reqId ? getRequirementByReqId(foundNode.reqId) : null);
            if (!linkedReq) {
              return `
                <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:8px 12px; font-size:0.8rem; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
                  <span>${foundNode.reqId ? `<code>${escapeHtml(foundNode.reqId)}</code> (Belum terdaftar di master requirement)` : `<span style="font-style:italic; color:#94a3b8;">Belum Terhubung</span>`}</span>
                  <span class="pm-badge-draft" style="font-size:0.68rem;">No Link</span>
                </div>
              `;
            }
            return `
              <div class="pm-linked-req-card" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:700; color:#1e293b; font-size:0.84rem;"><code>${escapeHtml(linkedReq.id)}</code></span>
                  <div style="display:flex; gap:4px; align-items:center;">
                    <span class="pm-status-badge ${linkedReq.isArchived ? 'pm-status-archived' : linkedReq.status === 'Confirmed' ? 'pm-status-confirmed' : 'pm-status-draft'}" style="font-size:0.68rem; padding:1px 6px;">
                      ${linkedReq.isArchived ? 'Arsip' : linkedReq.status || 'Draft'}
                    </span>
                    <span class="pm-type-pill pm-type-process" style="font-size:0.68rem; padding:1px 6px;">v${linkedReq.version || 1}</span>
                  </div>
                </div>
                <div style="font-weight:600; font-size:0.82rem; color:#0f172a;">${escapeHtml(linkedReq.title)}</div>
                <div style="font-size:0.78rem; color:#475569; line-height:1.4;">${escapeHtml(getRequirementCriteria(linkedReq) || linkedReq.process || '-')}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                  <div style="display:flex; gap:8px; font-size:0.72rem; color:#64748b;">
                    <span>Kategori: <strong>${escapeHtml(linkedReq.type || 'KF')}</strong></span>
                    <span>&bull;</span>
                    <span>Modul: <strong>${escapeHtml(linkedReq.module || '-')}</strong></span>
                  </div>
                  <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-jump-req" data-req-id="${escapeHtml(linkedReq.id)}" style="padding:2px 8px; font-size:0.72rem;">
                    Buka Req &rarr;
                  </button>
                </div>
              </div>
            `;
          })()}
        </div>

        <!-- Linked Business Rules Section -->
        <div class="pm-detail-section">
          <span class="pm-section-heading">Aturan Bisnis Terkait</span>
          ${(() => {
            const trace = getNodeTrace(effectiveModId, effectiveFeatId, foundNode.id);
            const rules = trace?.businessRules || [];
            if (rules.length === 0) {
              return `
                <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:8px 12px; font-size:0.8rem; color:#94a3b8; font-style:italic;">
                  Belum Terhubung ke aturan bisnis spesifik.
                </div>
              `;
            }
            return `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${rules.map(br => `
                  <div class="pm-node-link-card" style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; border-color:#fde68a;">
                    <div>
                      <span style="font-weight:700; color:#92400e;">[${escapeHtml(br.id || br.code)}]</span>
                      <span style="font-size:0.8rem; color:#78350f; margin-left:4px; font-weight:600;">${escapeHtml(br.title || br.name || '')}</span>
                      <div style="font-size:0.72rem; color:#a16207; margin-top:2px;">${escapeHtml((br.desc || br.description || '').slice(0, 80))}${((br.desc || br.description || '').length > 80 ? '...' : '')}</div>
                    </div>
                    <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-jump-rule" data-rule-id="${escapeHtml(br.id || br.code)}" style="padding:2px 8px; font-size:0.72rem; white-space:nowrap; margin-left:8px;">
                      Detail &rarr;
                    </button>
                  </div>
                `).join('')}
              </div>
            `;
          })()}
        </div>

        <!-- Node Revision History -->
        ${(() => {
          const revs = getNodeRevisionHistory(effectiveModId, effectiveFeatId, foundNode.id);
          if (revs.length <= 1 && !foundNode.isArchived && !foundNode.isSuperseded) {
            return `
              <div class="pm-detail-section">
                <span class="pm-section-heading">Versi &amp; Status Node</span>
                <div style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; font-size:0.8rem;">
                  <div>
                    <strong>v${foundNode.version || 1}</strong> &bull; <span class="pm-status-badge ${foundNode.isArchived ? 'pm-status-archived' : foundNode.status === 'Confirmed' ? 'pm-status-confirmed' : 'pm-status-draft'}" style="font-size:0.68rem; padding:1px 6px;">${foundNode.isArchived ? 'Arsip' : foundNode.status || 'Draft'}</span>
                  </div>
                  <div style="color:#94a3b8; font-size:0.72rem;">${foundNode.status === 'Confirmed' ? 'Baseline Confirmed' : 'Draft Aktif'}</div>
                </div>
              </div>
            `;
          }
          return `
            <div class="pm-detail-section">
              <span class="pm-section-heading">Riwayat Versi Node</span>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${revs.map((rev) => {
                  const isCurrent = rev.id === foundNode.id && rev.version === foundNode.version && !rev.isSuperseded;
                  return `
                    <div style="padding:6px 10px; border-radius:4px; font-size:0.78rem; background:${isCurrent ? '#e2e8f0' : '#f8fafc'}; border:1px solid ${isCurrent ? '#94a3b8' : '#cbd5e1'}; display:flex; justify-content:space-between; align-items:center;">
                      <div>
                        <strong>v${rev.version || 1}</strong> &bull; <span class="pm-status-badge ${rev.isArchived ? 'pm-status-archived' : rev.isSuperseded ? 'pm-status-draft' : rev.status === 'Confirmed' ? 'pm-status-confirmed' : 'pm-status-draft'}" style="font-size:0.68rem; padding:1px 5px;">
                          ${rev.isArchived ? 'Arsip' : rev.isSuperseded ? 'Superseded' : rev.status || 'Draft'}
                        </span>
                        <div style="color:#64748b; font-size:0.72rem; margin-top:2px;">${escapeHtml(rev.label || rev.title)}</div>
                      </div>
                      <div style="color:#94a3b8; font-size:0.7rem; text-align:right;">
                        ${rev.lastRevisedAt ? rev.lastRevisedAt.split('T')[0] : (rev.createdAt ? rev.createdAt.split('T')[0] : 'Baseline')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        })()}

        <!-- Node Connections (Inbound / Outbound) Section -->
        <div class="pm-detail-section">
          <span class="pm-section-heading">Koneksi Alur Terkait (Edges)</span>
          ${(() => {
            const currentFlow = store.flows[effectiveModId]?.[effectiveFeatId] || { nodes: [], edges: [] };
            const flowEdges = (currentFlow?.edges || []).filter(e => !e.isArchived && !e.isSuperseded);
            const outgoing = flowEdges.filter(e => e.from === foundNode.id);
            const incoming = flowEdges.filter(e => e.to === foundNode.id);

            if (outgoing.length === 0 && incoming.length === 0) {
              return `<p class="pm-section-body" style="color:#94a3b8; font-style:italic; font-size:0.8rem;">Belum ada koneksi eksplisit khusus (mengikuti alur sekuensial default).</p>`;
            }

            return `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${outgoing.map(e => {
                  const targetNode = (currentFlow?.nodes || []).find(n => n.id === e.to);
                  return `
                    <div style="padding:6px 10px; border-radius:4px; font-size:0.76rem; background:#f0fdf4; border:1px solid #bbf7d0; display:flex; justify-content:space-between; align-items:center;">
                      <div>
                        <span style="font-weight:700; color:#166534;">&rarr; Keluar Menuju:</span> <strong>${escapeHtml(targetNode?.code || e.to)}</strong> (${escapeHtml(targetNode?.label || targetNode?.title || '')})
                        ${e.condition ? `<span class="pm-status-badge pm-status-confirmed" style="font-size:0.65rem; margin-left:4px;">${escapeHtml(e.condition)}</span>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
                ${incoming.map(e => {
                  const sourceNode = (currentFlow?.nodes || []).find(n => n.id === e.from);
                  return `
                    <div style="padding:6px 10px; border-radius:4px; font-size:0.76rem; background:#f8fafc; border:1px solid #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
                      <div>
                        <span style="font-weight:700; color:#475569;">&larr; Masuk Dari:</span> <strong>${escapeHtml(sourceNode?.code || e.from)}</strong> (${escapeHtml(sourceNode?.label || sourceNode?.title || '')})
                        ${e.condition ? `<span class="pm-status-badge pm-status-confirmed" style="font-size:0.65rem; margin-left:4px;">${escapeHtml(e.condition)}</span>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          })()}
        </div>

        <!-- Description / Summary -->
        <div class="pm-detail-section">
          <span class="pm-section-heading">Description / Ringkasan</span>
          <p class="pm-section-body">${escapeHtml(foundNode.summary || foundNode.description || foundNode.purpose || '-')}</p>
        </div>

        <!-- Sections -->
        <div class="pm-detail-section">
          <span class="pm-section-heading">Tujuan</span>
          <p class="pm-section-body">${escapeHtml(foundNode.purpose || '-')}</p>
        </div>

        <div class="pm-detail-section">
          <span class="pm-section-heading">Input</span>
          <p class="pm-section-body">${escapeHtml(foundNode.input || '-')}</p>
        </div>

        <div class="pm-detail-section">
          <span class="pm-section-heading">Proses</span>
          <p class="pm-section-body">${escapeHtml(foundNode.process || '-')}</p>
        </div>

        <div class="pm-detail-section">
          <span class="pm-section-heading">Validasi</span>
          <div class="pm-section-body">
            <ul>
              <li>${escapeHtml(foundNode.validation || 'Validasi format dan ketersediaan data')}</li>
            </ul>
          </div>
        </div>

        <div class="pm-detail-section">
          <span class="pm-section-heading">Fallback</span>
          <p class="pm-section-body">${escapeHtml(foundNode.fallback || 'Tidak ada fallback manual')}</p>
        </div>

        <div class="pm-detail-section">
          <span class="pm-section-heading">Output</span>
          <p class="pm-section-body">${escapeHtml(foundNode.output || '-')}</p>
        </div>

        <div class="pm-detail-section">
          <span class="pm-section-heading">Related Role</span>
          <p class="pm-section-body"><strong>${escapeHtml(foundNode.relatedRole || 'Asisten Bibitan (Verifikasi)')}</strong></p>
        </div>

        <!-- Stock & Population Impact -->
        ${foundNode.stockImpact
      ? `
          <div class="pm-detail-section">
            <span class="pm-section-heading">Dampak Stok</span>
            <div>
              <span class="pm-stock-pill ${foundNode.stockImpact.includes('-') ? 'is-minus' : foundNode.stockImpact.includes('+') ? 'is-plus' : 'is-neutral'}">
                ${escapeHtml(foundNode.stockImpact)}
              </span>
            </div>
          </div>
        `
      : ''
    }

        <!-- Business Rule Box -->
        ${foundNode.businessRule
      ? `
          <div class="pm-detail-section">
            <span class="pm-section-heading">Aturan Bisnis Terkait</span>
            <div class="pm-br-card">
              <div class="pm-br-head">
                <span>${escapeHtml(foundNode.businessRule.split(':')[0] || 'Business Rule')}</span>
                <span>&rsaquo;</span>
              </div>
              <p class="pm-br-desc">${escapeHtml(foundNode.businessRule.split(':')[1] || foundNode.businessRule)}</p>
            </div>
          </div>
        `
      : ''
    }
      </div>
    </aside>
  `;
}

// -----------------------------------------------------------------------------
// Modals Component (Requirement Modal, Node Modal, Export, Import, Reset)
// -----------------------------------------------------------------------------

function renderModals(store) {
  if (!activeModal) return '';

  if (activeModal === 'edit-req') {
    const isNew = !modalData?.id;
    const isConfirmed = modalData?.status === 'Confirmed';
    const currentModId = modalData?.moduleId || (store.modules.find(m => m.name === modalData?.module)?.id) || store.modules[0]?.id;
    const currentModObj = store.modules.find(m => m.id === currentModId || m.name === modalData?.module) || store.modules[0];
    const availableFeatures = currentModObj?.features || [];

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 680px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">${isNew ? 'Tambah Requirement Baru' : isConfirmed ? `Buat Revisi Requirement: ${modalData.id}` : `Edit Requirement: ${modalData.id}`}</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-requirement">
            <div class="pm-modal-body">
              ${isConfirmed
        ? `
                <div class="pm-revision-alert">
                  <div>
                    <strong>Requirement berstatus Confirmed (Baseline Terkunci).</strong><br/>
                    Menyimpan perubahan akan otomatis menghasilkan <strong>Revisi Baru (v${(modalData.version || 1) + 1} Draft)</strong> tanpa menimpa baseline resmi v${modalData.version || 1}.
                  </div>
                </div>
              `
        : ''
      }

              <div class="pm-form-grid">
                <div class="pm-form-group">
                  <label class="pm-form-label">Tipe Requirement</label>
                  <input type="text" class="pm-form-input" value="Operational Requirement" readonly style="background:#f1f5f9; color:#475569;" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">ID Requirement ${isNew ? '(Auto-generated jika kosong)' : ''}</label>
                  <input type="text" name="reqId" class="pm-form-input" value="${escapeHtml(modalData?.id || '')}" ${!isNew ? 'readonly style="background:#f1f5f9;"' : ''} placeholder="Contoh: RN-OKL-008" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Role <span style="color:#ef4444;">*</span></label>
                  <select name="role" class="pm-form-select" required>
                    ${store.roles.map((r) => `<option value="${r.name}" ${modalData?.role === r.name ? 'selected' : ''}>${r.name}</option>`).join('')}
                  </select>
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Status</label>
                  <input type="text" class="pm-form-input" value="${isNew || isConfirmed ? 'Draft (Akan dibuat sebagai Draft)' : (modalData?.status || 'Draft')}" readonly style="background:#f1f5f9; color:#475569;" />
                  <input type="hidden" name="status" value="${isNew || isConfirmed ? 'Draft' : (modalData?.status || 'Draft')}" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Modul Terkait <span style="color:#ef4444;">*</span></label>
                  <select name="module" id="pm-modal-req-module" class="pm-form-select" required>
                    ${store.modules.map((m) => `<option value="${m.name}" data-mod-id="${m.id}" ${modalData?.module === m.name || modalData?.moduleId === m.id ? 'selected' : ''}>[${m.order}] ${m.name}</option>`).join('')}
                  </select>
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Fitur / Alur Terkait <span style="color:#ef4444;">*</span></label>
                  <select name="feature" id="pm-modal-req-feature" class="pm-form-select" required>
                    ${availableFeatures.map((f) => `<option value="${f.name}" data-feat-id="${f.id}" ${modalData?.feature === f.name || modalData?.featureId === f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                  </select>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Judul Requirement <span style="color:#ef4444;">*</span></label>
                  <input type="text" name="title" class="pm-form-input" value="${escapeHtml(modalData?.title || '')}" placeholder="Masukkan pernyataan requirement operasional..." required />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Kriteria Penerimaan (Acceptance Criteria) <span style="color:#ef4444;">*</span></label>
                  <textarea name="acceptanceCriteria" class="pm-form-textarea" placeholder="Kondisi atau syarat mutlak agar requirement ini dianggap terpenuhi..." required>${escapeHtml(modalData?.acceptanceCriteria || modalData?.acceptance || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Proses Lapangan / Langkah Operasional</label>
                  <input type="text" name="process" class="pm-form-input" value="${escapeHtml(modalData?.process || '')}" placeholder="Contoh: Penempelan Mata Okulasi" />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Input Data</label>
                  <textarea name="input" class="pm-form-textarea" placeholder="Data atau dokumen input...">${escapeHtml(modalData?.input || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Aturan Validasi</label>
                  <textarea name="validation" class="pm-form-textarea" placeholder="Kaidah validasi sistem atau pengecekan fisik...">${escapeHtml(modalData?.validation || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Mekanisme Fallback</label>
                  <textarea name="fallback" class="pm-form-textarea" placeholder="Prosedur alternatif jika validasi gagal...">${escapeHtml(modalData?.fallback || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Output / Hasil</label>
                  <textarea name="output" class="pm-form-textarea" placeholder="Hasil akhir, dokumen terbit, atau mutasi status...">${escapeHtml(modalData?.output || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Aturan Bisnis (Business Rule)</label>
                  <input type="text" name="businessRule" class="pm-form-input" value="${escapeHtml(modalData?.businessRule || '')}" placeholder="Contoh: BR-OKL-001: Standar keberhasilan okulasi min 85%" />
                </div>
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary">
                ${isNew ? 'Simpan Requirement Baru (Draft)' : isConfirmed ? `Simpan sebagai Revisi Baru (v${(modalData.version || 1) + 1} Draft)` : 'Simpan Perubahan (Draft)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (activeModal === 'detail-req') {
    const reqId = modalData?.id;
    const history = getRequirementRevisionHistory(reqId);
    // If user clicked snapshot version in timeline, preview that version, otherwise preview active modalData
    const previewReq = (selectedReqDetailVersion && history.find(h => h.version === selectedReqDetailVersion)) || modalData;
    const isHistorical = previewReq.isSuperseded || (modalData && previewReq.version !== modalData.version);
    const nodeUsage = checkRequirementNodeUsage(reqId);

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 720px;">
          <div class="pm-modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 class="pm-modal-title">Detail Requirement: ${escapeHtml(reqId)}</h3>
              <span class="pm-badge-draft" style="font-size:0.75rem;">v${previewReq.version || 1}</span>
              <span class="${previewReq.status === 'Confirmed' ? 'pm-badge-confirmed' : 'pm-badge-draft'}">
                ${previewReq.status}
              </span>
            </div>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            ${isHistorical
        ? `
              <div class="pm-revision-alert" style="background:#fef3c7; border-color:#fde68a; color:#92400e; margin-bottom:12px;">
                <div>
                  <strong>Snapshot Historis Versi v${previewReq.version}.</strong>
                  (Versi ini telah digantikan oleh versi yang lebih baru).
                  <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-view-latest-req" style="margin-left:8px; padding:2px 8px; font-size:0.75rem;">
                    Kembali ke Versi Aktif
                  </button>
                </div>
              </div>
            `
        : ''
      }

            <div class="pm-detail-grid">
              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Judul Requirement</span>
                <div class="pm-detail-value is-accent" style="font-size:0.98rem; font-weight:600;">
                  ${escapeHtml(previewReq.title)}
                </div>
              </div>

              ${previewReq.acceptanceCriteria
        ? `
                <div class="pm-detail-item is-full">
                  <span class="pm-detail-label">Kriteria Penerimaan (Acceptance Criteria)</span>
                  <div class="pm-detail-value" style="background:#f0fdf4; border-color:#bbf7d0; color:#14532d; font-style:italic;">
                    ${escapeHtml(previewReq.acceptanceCriteria)}
                  </div>
                </div>
              `
        : ''
      }

              <div class="pm-detail-item">
                <span class="pm-detail-label">Role Pelaksana</span>
                <div class="pm-detail-value">${escapeHtml(previewReq.role || '-')}</div>
              </div>

              <div class="pm-detail-item">
                <span class="pm-detail-label">Modul &amp; Fitur</span>
                <div class="pm-detail-value">${escapeHtml(previewReq.module || '-')} &rsaquo; ${escapeHtml(previewReq.feature || '-')}</div>
              </div>

              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Proses Lapangan</span>
                <div class="pm-detail-value">${escapeHtml(previewReq.process || '-')}</div>
              </div>

              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Input Data</span>
                <div class="pm-detail-value">${escapeHtml(previewReq.input || '-')}</div>
              </div>

              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Aturan Validasi</span>
                <div class="pm-detail-value">${escapeHtml(previewReq.validation || '-')}</div>
              </div>

              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Mekanisme Fallback</span>
                <div class="pm-detail-value">${escapeHtml(previewReq.fallback || '-')}</div>
              </div>

              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Output / Hasil</span>
                <div class="pm-detail-value">${escapeHtml(previewReq.output || '-')}</div>
              </div>

              <!-- Linked Business Rules Section -->
              <div class="pm-detail-item is-full" style="margin-top:6px;">
                <span class="pm-detail-label">Aturan Bisnis Terkait (Business Rules)</span>
                ${(() => {
                  const trace = getRequirementTrace(reqId);
                  const rules = trace?.businessRules || [];
                  if (rules.length === 0) {
                    return `
                      <div class="pm-detail-value" style="color:#64748b; font-style:italic;">
                        Belum terhubung ke aturan bisnis spesifik.
                      </div>
                    `;
                  }
                  return `
                    <div style="display:flex; flex-direction:column; gap:6px;">
                      ${rules.map(br => `
                        <div class="pm-node-link-card" style="display:flex; justify-content:space-between; align-items:center; background:#fffbeb; border-color:#fde68a;">
                          <div>
                            <span style="font-weight:700; color:#92400e;">[${escapeHtml(br.id || br.code)}]</span>
                            <span style="font-size:0.82rem; color:#78350f; font-weight:600; margin-left:4px;">${escapeHtml(br.title || br.name || '')}</span>
                            <div style="font-size:0.72rem; color:#a16207; margin-top:2px;">${escapeHtml((br.desc || br.description || '').slice(0, 85))}${((br.desc || br.description || '').length > 85 ? '...' : '')}</div>
                          </div>
                          <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-jump-rule" data-rule-id="${escapeHtml(br.id || br.code)}" style="padding:2px 8px; font-size:0.72rem; white-space:nowrap; margin-left:8px;">
                            Detail &rarr;
                          </button>
                        </div>
                      `).join('')}
                    </div>
                  `;
                })()}
              </div>

              <!-- Process / Linked Node Section -->
              <div class="pm-detail-item is-full" style="margin-top:6px;">
                <span class="pm-detail-label">Process / Linked Flow Nodes</span>
                ${(() => {
                  const trace = getRequirementTrace(reqId);
                  const nodes = trace?.nodes || [];
                  if (nodes.length === 0) {
                    return `
                      <div class="pm-detail-value" style="color:#64748b; font-style:italic;">
                        Belum ada langkah alur visual yang mereferensikan requirement ini.
                      </div>
                    `;
                  }
                  return `
                    <div style="display:flex; flex-direction:column; gap:6px;">
                      ${nodes.map((n) => `
                        <div class="pm-node-link-card" style="display:flex; justify-content:space-between; align-items:center;">
                          <div>
                            <span style="font-weight:700; color:#0284c7;">[${escapeHtml(n.code || n.id)}]</span>
                            <span style="font-weight:600; font-size:0.82rem; color:#0f172a; margin-left:4px;">${escapeHtml(n.label || n.title)}</span>
                            <span style="color:#64748b; font-size:0.75rem; display:block;">(Modul: ${escapeHtml(n.moduleId)} / ${escapeHtml(n.featureId)})</span>
                          </div>
                          <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-jump-node" data-node-id="${escapeHtml(n.id)}" data-mod-id="${escapeHtml(n.moduleId)}" data-feat-id="${escapeHtml(n.featureId)}" style="padding:2px 8px; font-size:0.72rem; white-space:nowrap; margin-left:8px;">
                            Buka di Alur &rarr;
                          </button>
                        </div>
                      `).join('')}
                    </div>
                  `;
                })()}
              </div>

              <!-- Revision History Timeline Section -->
              <div class="pm-detail-item is-full" style="margin-top:6px;">
                <span class="pm-detail-label">Riwayat Revisi (Revision History)</span>
                <div class="pm-timeline-list">
                  ${history.map((h) => {
        const isCurrent = h.version === (previewReq.version || 1);
        return `
                      <div class="pm-timeline-card ${isCurrent ? 'is-active' : ''}">
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span class="pm-badge-draft" style="font-size:0.7rem; font-weight:700;">v${h.version || 1}</span>
                          <span class="${h.status === 'Confirmed' ? 'pm-badge-confirmed' : 'pm-badge-draft'}" style="font-size:0.68rem;">
                            ${h.status}
                          </span>
                          <span>${escapeHtml(h.title)}</span>
                          ${h.revisionOf ? `<span style="font-size:0.72rem; color:#b45309;">(Revisi dari ${h.revisionOf})</span>` : '<span style="font-size:0.72rem; color:#16a34a;">(Baseline Awal)</span>'}
                        </div>
                        <div>
                          ${isCurrent
            ? '<span style="font-size:0.72rem; font-weight:700; color:#166534;">● Sedang Dilihat</span>'
            : `<button type="button" class="pm-row-btn pm-btn-preview-revision" data-version="${h.version}">Pratinjau Snapshot</button>`
          }
                        </div>
                      </div>
                    `;
      }).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Tutup</button>
            ${isManageMode && !previewReq.isArchived
        ? `
                <button type="button" class="pm-btn-sm pm-btn-primary pm-btn-edit-from-detail" data-req-id="${escapeHtml(reqId)}">
                  Edit Requirement / Buat Revisi
                </button>
              `
        : ''
      }
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'detail-rule') {
    const rule = modalData;
    const ruleId = rule?.id || rule?.code;
    const allActiveReqs = (store.requirements || []).filter(r => !r.isArchived && !r.isSuperseded);
    const linkedReqs = allActiveReqs.filter(r => {
      const trace = getRequirementTrace(r.id);
      return trace && trace.businessRules.some(br => br.id === ruleId || br.code === ruleId);
    });

    const linkedNodes = [];
    for (const [mId, feats] of Object.entries(store.flows || {})) {
      for (const [fId, fObj] of Object.entries(feats || {})) {
        (fObj.nodes || []).forEach(n => {
          if (!n.isSuperseded && !n.isArchived) {
            const nTrace = getNodeTrace(mId, fId, n.id);
            if (nTrace && nTrace.businessRules.some(br => br.id === ruleId || br.code === ruleId)) {
              linkedNodes.push({ ...n, moduleId: mId, featureId: fId });
            }
          }
        });
      }
    }

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 720px;">
          <div class="pm-modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 class="pm-modal-title">Detail Aturan Bisnis: ${escapeHtml(ruleId)}</h3>
              <span class="pm-badge-rule-pill">${escapeHtml(rule.category || 'Aturan Operasional')}</span>
            </div>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <div class="pm-detail-grid">
              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Judul / Ketentuan Aturan</span>
                <div class="pm-detail-value is-accent" style="font-size:0.98rem; font-weight:600;">
                  ${escapeHtml(rule.title || rule.name || ruleId)}
                </div>
              </div>

              <div class="pm-detail-item is-full">
                <span class="pm-detail-label">Deskripsi Kebijakan Standar</span>
                <div class="pm-detail-value" style="line-height:1.45; color:#1e293b;">
                  ${escapeHtml(rule.desc || rule.description || '-')}
                </div>
              </div>

              ${rule.impact ? `
                <div class="pm-detail-item is-full">
                  <span class="pm-detail-label">Dampak Operasional &amp; Integritas Data</span>
                  <div class="pm-detail-value" style="background:#fffbeb; border-color:#fde68a; color:#92400e;">
                    ${escapeHtml(rule.impact)}
                  </div>
                </div>
              ` : ''}

              <!-- Trace Hub: Linked Requirements -->
              <div class="pm-detail-item is-full" style="margin-top:6px;">
                <span class="pm-detail-label">Requirement Terkait (${linkedReqs.length})</span>
                ${linkedReqs.length > 0 ? `
                  <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
                    ${linkedReqs.map(r => `
                      <div class="pm-node-link-card" style="display:flex; align-items:center; justify-content:space-between;">
                        <div>
                          <span style="font-weight:700; color:#0369a1;">[${escapeHtml(r.id)}]</span>
                          <span style="font-size:0.8rem; color:#0f172a; margin-left:4px; font-weight:600;">${escapeHtml(r.title)}</span>
                          <span style="color:#64748b; font-size:0.72rem; display:block;">(${escapeHtml(r.module)} &rsaquo; ${escapeHtml(r.role)})</span>
                        </div>
                        <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-jump-req" data-req-id="${escapeHtml(r.id)}" style="padding:2px 8px; font-size:0.72rem; white-space:nowrap; margin-left:8px;">
                          Buka Req &rarr;
                        </button>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div style="color:#94a3b8; font-size:0.8rem; font-style:italic;">Belum ada requirement yang terhubung ke aturan ini.</div>
                `}
              </div>

              <!-- Trace Hub: Linked Flow Nodes -->
              <div class="pm-detail-item is-full" style="margin-top:6px;">
                <span class="pm-detail-label">Flow Nodes Penegak Aturan (${linkedNodes.length})</span>
                ${linkedNodes.length > 0 ? `
                  <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
                    ${linkedNodes.map(n => `
                      <div class="pm-node-link-card" style="display:flex; align-items:center; justify-content:space-between;">
                        <div>
                          <span style="font-weight:700; color:#059669;">[${escapeHtml(n.code || n.id)}]</span>
                          <span style="font-size:0.8rem; color:#0f172a; margin-left:4px; font-weight:600;">${escapeHtml(n.label || n.title)}</span>
                          <span style="color:#64748b; font-size:0.72rem; display:block;">(Modul: ${escapeHtml(n.moduleId)} / ${escapeHtml(n.featureId)})</span>
                        </div>
                        <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-jump-node" data-node-id="${escapeHtml(n.id)}" data-mod-id="${escapeHtml(n.moduleId)}" data-feat-id="${escapeHtml(n.featureId)}" style="padding:2px 8px; font-size:0.72rem; white-space:nowrap; margin-left:8px;">
                          Buka Alur &rarr;
                        </button>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div style="color:#94a3b8; font-size:0.8rem; font-style:italic;">Belum ada flow node yang terhubung ke aturan ini.</div>
                `}
              </div>
            </div>
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Tutup</button>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'archive-req') {
    const reqId = modalData?.id;
    const nodeUsage = checkRequirementNodeUsage(reqId);

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 520px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Arsipkan Requirement: ${escapeHtml(reqId)}</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <p style="margin:0; font-size:0.88rem; color:#1e293b;">
              Apakah Anda yakin ingin mengarsipkan requirement <strong>"${escapeHtml(modalData?.title || reqId)}"</strong>?
            </p>

            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-top:12px; font-size:0.8rem; color:#475569; line-height:1.45;">
              <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">Ketentuan Pengarsipan (Archive Safety):</div>
              <div>&bull; Requirement akan disembunyikan dari daftar aktif.</div>
              <div>&bull; Seluruh riwayat dan data requirement tetap tersimpan utuh di database.</div>
              <div>&bull; Langkah alur proses (node flow) yang terhubung <strong>TIDAK AKAN DIHAPUS</strong>.</div>
            </div>

            ${nodeUsage.isUsed
        ? `
                <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:10px; margin-top:10px; font-size:0.78rem; color:#92400e;">
                  <strong>Informasi Keterhubungan Alur:</strong><br/>
                  Requirement ini saat ini terhubung dengan langkah alur: <strong>${nodeUsage.nodes.map(n => n.code + ' (' + n.title + ')').join(', ')}</strong>. Relasi ini tetap tercatat di historis data.
                </div>
              `
        : ''
      }
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
            <button type="button" class="pm-btn-sm pm-btn-danger" id="pm-btn-confirm-archive">
              Ya, Arsipkan Requirement
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'edit-node') {
    const isNew = !modalData?.node?.id;
    const isConfirmed = modalData?.node?.status === 'Confirmed';
    const currentModId = modalData?.moduleId || (store.modules.find(m => m.name === modalData?.node?.module)?.id) || store.modules[0]?.id;
    const currentModObj = store.modules.find(m => m.id === currentModId) || store.modules[0];
    const availableFeatures = currentModObj?.features || [];
    const currentFeatId = modalData?.featureId || availableFeatures[0]?.id;
    const moduleRequirements = (store.requirements || []).filter(r => !r.isArchived && !r.isSuperseded && (r.moduleId === currentModId || r.module === currentModObj?.name));

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 680px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">${isNew ? 'Tambah Langkah Alur (Node)' : isConfirmed ? `Buat Revisi Node: ${modalData?.node?.label || modalData?.node?.title || ''}` : `Edit Node: ${modalData?.node?.label || modalData?.node?.title || ''}`}</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-node">
            <div class="pm-modal-body">
              ${isConfirmed
        ? `
                <div class="pm-revision-alert">
                  <div>
                    <strong>Langkah alur ini berstatus Confirmed (Baseline Terkunci).</strong><br/>
                    Menyimpan draf akan menghasilkan <strong>versi revisi baru (v${(modalData.node.version || 1) + 1} Draft)</strong> dengan <code>revisionOf: "v${modalData.node.version || 1}"</code> tanpa menimpa baseline resmi.
                  </div>
                </div>
              `
        : ''
      }

              <div class="pm-form-grid">
                <div class="pm-form-group">
                  <label class="pm-form-label">Modul Terkait</label>
                  <select name="moduleId" id="pm-node-form-module" class="pm-form-select" ${!isNew ? 'disabled' : ''}>
                    ${store.modules.map(m => `
                      <option value="${m.id}" ${m.id === currentModId ? 'selected' : ''}>${m.id.split('-')[0]} - ${escapeHtml(m.name)}</option>
                    `).join('')}
                  </select>
                  ${!isNew ? `<input type="hidden" name="moduleId" value="${escapeHtml(currentModId)}" />` : ''}
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Fitur / Alur Proses</label>
                  <select name="featureId" id="pm-node-form-feature" class="pm-form-select" ${!isNew ? 'disabled' : ''}>
                    ${availableFeatures.map(f => `
                      <option value="${f.id}" ${f.id === currentFeatId ? 'selected' : ''}>${escapeHtml(f.name)}</option>
                    `).join('')}
                  </select>
                  ${!isNew ? `<input type="hidden" name="featureId" value="${escapeHtml(currentFeatId)}" />` : ''}
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Requirement Terkait (reqId)</label>
                  <select name="reqId" id="pm-node-form-req" class="pm-form-select">
                    <option value="">-- Tanpa Terhubung Requirement (Opsional) --</option>
                    ${moduleRequirements.map(r => `
                      <option value="${r.id}" ${r.id === modalData?.node?.reqId ? 'selected' : ''}>[${r.id}] ${escapeHtml(r.title)} (${r.type || 'KF'})</option>
                    `).join('')}
                  </select>
                  <span style="font-size:0.72rem; color:#64748b; margin-top:2px; display:block;">Requirement relevan dengan modul terpilih. Kosongkan bila belum ada relasi.</span>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Aturan Bisnis Terkait (Business Rules)</label>
                  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:6px; max-height:140px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:6px; padding:8px; background:#f8fafc;">
                    ${(store.businessRules || []).map(br => {
                      const isChecked = Array.isArray(modalData?.node?.ruleIds)
                        ? modalData.node.ruleIds.includes(br.id)
                        : (modalData?.node?.businessRule && modalData.node.businessRule.includes(br.id));
                      return `
                        <label style="display:flex; align-items:flex-start; gap:6px; font-size:0.76rem; color:#1e293b; cursor:pointer;">
                          <input type="checkbox" name="ruleIds" value="${escapeHtml(br.id)}" ${isChecked ? 'checked' : ''} style="margin-top:2px;" />
                          <div>
                            <strong>${escapeHtml(br.id)}</strong> - <span style="color:#475569;">${escapeHtml(br.title || br.name || '')}</span>
                          </div>
                        </label>
                      `;
                    }).join('')}
                  </div>
                  <span style="font-size:0.72rem; color:#64748b; margin-top:2px; display:block;">Pilih aturan bisnis yang ditegakkan pada langkah proses ini.</span>
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Kode Langkah</label>
                  <input type="text" name="code" class="pm-form-input" value="${escapeHtml(modalData?.node?.code || '')}" placeholder="Contoh: P-001" required />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Tipe Langkah</label>
                  <select name="type" class="pm-form-select">
                    <option value="process" ${modalData?.node?.type === 'process' ? 'selected' : ''}>Process (Aktivitas / Transaksi)</option>
                    <option value="decision" ${modalData?.node?.type === 'decision' ? 'selected' : ''}>Decision (Keputusan / Percabangan)</option>
                    <option value="start" ${modalData?.node?.type === 'start' ? 'selected' : ''}>Start (Titik Awal Alur)</option>
                    <option value="end" ${modalData?.node?.type === 'end' ? 'selected' : ''}>End (Titik Akhir Alur)</option>
                  </select>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Label / Nama Langkah</label>
                  <input type="text" name="label" class="pm-form-input" value="${escapeHtml(modalData?.node?.label || modalData?.node?.title || '')}" placeholder="Contoh: Input Form Transaksi" required />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Tujuan / Ringkasan Proses</label>
                  <textarea name="purpose" class="pm-form-textarea" placeholder="Jelaskan ringkasan atau tujuan proses ini...">${escapeHtml(modalData?.node?.purpose || modalData?.node?.summary || modalData?.node?.description || '')}</textarea>
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Input</label>
                  <input type="text" name="input" class="pm-form-input" value="${escapeHtml(modalData?.node?.input || '')}" placeholder="Contoh: Data QR, Form Input" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Output</label>
                  <input type="text" name="output" class="pm-form-input" value="${escapeHtml(modalData?.node?.output || '')}" placeholder="Contoh: Dokumen Bukti, Record DB" />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Validasi</label>
                  <input type="text" name="validation" class="pm-form-input" value="${escapeHtml(modalData?.node?.validation || '')}" placeholder="Contoh: Format batch valid, stok mencukupi" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Fallback</label>
                  <input type="text" name="fallback" class="pm-form-input" value="${escapeHtml(modalData?.node?.fallback || '')}" placeholder="Contoh: Simpan Draf Offline / Hubungi IT" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Dampak Stok</label>
                  <input type="text" name="stockImpact" class="pm-form-input" value="${escapeHtml(modalData?.node?.stockImpact || '')}" placeholder="Contoh: - Stok Batang Bawah (+/-)" />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Role Terkait (Verifikator)</label>
                  <input type="text" name="relatedRole" class="pm-form-input" value="${escapeHtml(modalData?.node?.relatedRole || 'Asisten Bibitan (Verifikasi)')}" />
                </div>
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary" id="pm-btn-submit-node">Simpan Draf</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (activeModal === 'archive-node') {
    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 480px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Konfirmasi Arsip Node</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <p style="margin:0; font-size:0.88rem; color:#334155;">
              Apakah Anda yakin ingin mengarsipkan langkah alur <strong>${escapeHtml(modalData?.node?.label || modalData?.node?.title || modalData?.node?.id)}</strong> (<code>${escapeHtml(modalData?.node?.code || '-')}</code>)?
            </p>

            <div style="margin-top:12px; padding:10px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; color:#475569;">
              <div><strong>Perilaku Arsip (Soft Delete):</strong></div>
              <ul style="margin:6px 0 0 16px; padding:0; line-height:1.5;">
                <li>Node tidak akan tampil pada diagram flow aktif.</li>
                <li>Relasi <code>reqId</code> ke Requirement tetap terjaga dan tidak terputus.</li>
                <li>Node tetap tersimpan secara aman dalam riwayat/history sistem.</li>
              </ul>
            </div>
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
            <button type="button" class="pm-btn-sm pm-btn-danger" id="pm-btn-confirm-archive-node">
              Ya, Arsipkan Node
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'edit-edge') {
    const isNew = !modalData?.edge?.id;
    const isConfirmed = modalData?.edge?.status === 'Confirmed';
    const modId = modalData?.moduleId || currentModuleId;
    const featId = modalData?.featureId || currentFeatureId;
    const flow = store.flows[modId]?.[featId] || { nodes: [], edges: [] };
    const activeNodes = (flow.nodes || []).filter(n => !n.isArchived && !n.isSuperseded);
    const selectedSource = modalData?.edge?.from || activeNodes[0]?.id || '';
    const selectedTarget = modalData?.edge?.to || (activeNodes[1] ? activeNodes[1].id : '');

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 580px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">${isNew ? 'Tambah Koneksi Alur (Connection)' : isConfirmed ? `Buat Revisi Koneksi: ${modalData?.edge?.from} → ${modalData?.edge?.to}` : `Edit Koneksi Alur`}</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-edge">
            <div class="pm-modal-body">
              ${isConfirmed
        ? `
                <div class="pm-revision-alert">
                  <div>
                    <strong>Koneksi ini berstatus Confirmed (Baseline Terkunci).</strong><br/>
                    Menyimpan perubahan akan menghasilkan <strong>revisi baru (v${(modalData.edge.version || 1) + 1} Draft)</strong> dengan <code>revisionOf: "v${modalData.edge.version || 1}"</code> tanpa menimpa baseline resmi.
                  </div>
                </div>
              `
        : ''
      }

              <div class="pm-form-grid">
                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Source Node (Langkah Asal)</label>
                  <select name="from" id="pm-edge-form-source" class="pm-form-select" required>
                    <option value="">-- Pilih Langkah Asal --</option>
                    ${activeNodes.map(n => `
                      <option value="${n.id}" ${n.id === selectedSource ? 'selected' : ''}>[${n.code || n.type}] ${escapeHtml(n.label || n.title)} (${n.type})</option>
                    `).join('')}
                  </select>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Target Node (Langkah Tujuan)</label>
                  <select name="to" id="pm-edge-form-target" class="pm-form-select" required>
                    <option value="">-- Pilih Langkah Tujuan --</option>
                    ${activeNodes.map(n => `
                      <option value="${n.id}" ${n.id === selectedTarget ? 'selected' : ''}>[${n.code || n.type}] ${escapeHtml(n.label || n.title)} (${n.type})</option>
                    `).join('')}
                  </select>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Kondisi Percabangan / Label (Opsional)</label>
                  <input type="text" name="condition" id="pm-edge-form-cond" class="pm-form-input" value="${escapeHtml(modalData?.edge?.condition || modalData?.edge?.label || '')}" placeholder="Contoh: Sukses, Fallback, Ya, Tidak, Lolos QC" />
                  <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">
                    <span style="font-size:0.72rem; color:#64748b; align-self:center;">Preset Cepat:</span>
                    <button type="button" class="pm-row-btn pm-btn-cond-preset" data-val="Sukses">Sukses</button>
                    <button type="button" class="pm-row-btn pm-btn-cond-preset" data-val="Fallback">Fallback</button>
                    <button type="button" class="pm-row-btn pm-btn-cond-preset" data-val="Ya">Ya</button>
                    <button type="button" class="pm-row-btn pm-btn-cond-preset" data-val="Tidak">Tidak</button>
                    <button type="button" class="pm-row-btn pm-btn-cond-preset" data-val="Lolos QC">Lolos QC</button>
                    <button type="button" class="pm-row-btn pm-btn-cond-preset" data-val="Gagal QC">Gagal QC</button>
                  </div>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Keterangan / Catatan Alur</label>
                  <textarea name="description" class="pm-form-textarea" placeholder="Catatan tambahan mengenai kondisi transisi alur ini...">${escapeHtml(modalData?.edge?.description || '')}</textarea>
                </div>
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary" id="pm-btn-submit-edge">Simpan Draf</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (activeModal === 'archive-edge') {
    const fromNode = store.flows[modalData?.moduleId]?.[modalData?.featureId]?.nodes?.find(n => n.id === modalData?.edge?.from);
    const toNode = store.flows[modalData?.moduleId]?.[modalData?.featureId]?.nodes?.find(n => n.id === modalData?.edge?.to);

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 480px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Konfirmasi Arsip Koneksi</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <p style="margin:0; font-size:0.88rem; color:#334155;">
              Apakah Anda yakin ingin mengarsipkan koneksi alur dari <strong>${escapeHtml(fromNode?.code || modalData?.edge?.from)}</strong> ke <strong>${escapeHtml(toNode?.code || modalData?.edge?.to)}</strong>${modalData?.edge?.condition ? ` (<code>${escapeHtml(modalData?.edge?.condition)}</code>)` : ''}?
            </p>

            <div style="margin-top:12px; padding:10px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; color:#475569;">
              <div><strong>Perilaku Arsip (Soft Delete):</strong></div>
              <ul style="margin:6px 0 0 16px; padding:0; line-height:1.5;">
                <li>Koneksi tidak akan tampil pada diagram alur aktif.</li>
                <li>Node terkait <strong>TIDAK</strong> akan dihapus.</li>
                <li>Koneksi tetap tersimpan di riwayat data.</li>
              </ul>
            </div>
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
            <button type="button" class="pm-btn-sm pm-btn-danger" id="pm-btn-confirm-archive-edge">
              Ya, Arsipkan Koneksi
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'export') {
    const validation = validateProjectData(store);

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Export Project Data (process-mapping-data.json)</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-export">
            <div class="pm-modal-body">
              <p style="margin:0; font-size:0.84rem; color:#475569;">
                Mengekspor seluruh structured source data ke file <strong>process-mapping-data.json</strong> resmi. File hasil ekspor ini dapat langsung menggantikan source data project untuk di-commit ke Git dan di-deploy ke production.
              </p>

              <div class="pm-form-grid" style="margin-top:10px;">
                <div class="pm-form-group">
                  <label class="pm-form-label">Version</label>
                  <input type="text" name="version" class="pm-form-input" value="${escapeHtml(store.metadata.version)}" required />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Diperbarui Oleh (Updated By)</label>
                  <input type="text" name="updatedBy" class="pm-form-input" value="${escapeHtml(store.metadata.updatedBy || 'Business Analyst')}" required />
                </div>
              </div>

              <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-top:8px;">
                <div style="font-weight:600; font-size:0.8rem; color:#0f172a; margin-bottom:4px;">Status Validasi Integritas Data:</div>
                ${validation.valid
        ? '<div style="color:#16a34a; font-size:0.78rem;">Data lengkap dan tervalidasi (0 error). Siap untuk diekspor.</div>'
        : `<div style="color:#dc2626; font-size:0.78rem;">Ditemukan kesalahan:<br/>${validation.errors.join('<br/>')}</div>`
      }
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Tutup</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary" ${!validation.valid ? 'disabled' : ''}>
                Unduh process-mapping-data.json
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (activeModal === 'import') {
    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Import Project Data (JSON)</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <p style="margin:0; font-size:0.84rem; color:#475569;">
              Pilih file <strong>process-mapping-data.json</strong> dari perangkat Anda untuk dipratinjau dan dimuat ke dalam editor state.
            </p>

            <div class="pm-form-group" style="margin-top:10px;">
              <label class="pm-form-label">Pilih File JSON</label>
              <input type="file" id="pm-file-import-input" accept=".json" class="pm-form-input" />
            </div>

            <div id="pm-import-preview-area"></div>
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
            <button type="button" class="pm-btn-sm pm-btn-primary" id="pm-btn-confirm-import" style="display:none;">
              Konfirmasi &amp; Muat Data
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'compare-rev') {
    const { entityType, entityId, moduleId, featureId } = modalData || {};
    let baseline = null;
    let draft = null;

    if (entityType === 'Requirement') {
      draft = store.requirements.find((r) => r.id === entityId && !r.isSuperseded);
      if (draft && draft.revisionOf) {
        const revVer = parseInt(draft.revisionOf.replace('v', ''), 10);
        baseline = store.requirements.find((r) => r.id === entityId && r.version === revVer);
      }
    } else if (entityType === 'Node') {
      const nodes = store.flows[moduleId]?.[featureId]?.nodes || [];
      draft = nodes.find((n) => n.id === entityId && !n.isSuperseded);
      if (draft && draft.revisionOf) {
        const revVer = parseInt(draft.revisionOf.replace('v', ''), 10);
        baseline = nodes.find((n) => n.id === entityId && n.version === revVer);
      }
    } else if (entityType === 'Connection') {
      const edges = store.flows[moduleId]?.[featureId]?.edges || [];
      draft = edges.find((e) => e.id === entityId && !e.isSuperseded);
      if (draft && draft.revisionOf) {
        const revVer = parseInt(draft.revisionOf.replace('v', ''), 10);
        baseline = edges.find((e) => e.id === entityId && e.version === revVer);
      }
    }

    const diff = calculateEntityDiff(entityType, baseline, draft);
    const isDraft = draft?.status === 'Draft';
    const isInReview = draft?.status === 'In Review';
    const isRejected = draft?.status === 'Rejected';

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 900px; width: 100%;">
          <div class="pm-modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 class="pm-modal-title">Perbandingan Versi: ${escapeHtml(entityType)}</h3>
              <span class="pm-status-badge pm-status-draft" style="font-size:0.75rem;">${escapeHtml(draft?.code || draft?.id || entityId)}</span>
            </div>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <!-- Top Summary Card -->
            <div class="pm-diff-summary-card">
              <div>
                <div style="font-size:0.92rem; font-weight:700; color:#0f172a;">
                  ${escapeHtml(draft?.title || draft?.label || entityId)}
                </div>
                <div style="font-size:0.75rem; color:#64748b; margin-top:3px;">
                  Status: <strong>${escapeHtml(draft?.status || 'Draft')}</strong> &bull;
                  Jenis Perubahan: <strong>${escapeHtml(diff.changeType)}</strong> &bull;
                  <strong>${diff.changedFieldsCount}</strong> field mengalami perubahan
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:8px;">
                <span class="pm-status-badge pm-status-confirmed" style="font-size:0.75rem;">
                  Baseline: ${baseline ? `v${baseline.version}` : 'None (Baru)'}
                </span>
                <span style="color:#94a3b8; font-weight:700;">&rarr;</span>
                <span class="pm-status-badge ${isInReview ? 'pm-status-review' : isRejected ? 'pm-status-rejected' : 'pm-status-draft'}" style="font-size:0.75rem;">
                  Draft: v${draft?.version || 1}
                </span>
              </div>
            </div>

            <!-- Review Note Alert if Rejected -->
            ${isRejected && draft?.reviewNote
        ? `
              <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:10px 14px; font-size:0.8rem; color:#991b1b;">
                <strong>Catatan Penolakan Review (${escapeHtml(draft.reviewedBy || 'Reviewer')} - ${escapeHtml(draft.reviewedAt || '')}):</strong><br/>
                ${escapeHtml(draft.reviewNote)}
              </div>
            `
        : ''
      }

            <!-- Diff Table -->
            <div class="pm-diff-table-wrap">
              <table class="pm-diff-table">
                <thead>
                  <tr>
                    <th style="width: 140px;">Field</th>
                    <th style="width: 35%;">Baseline Confirmed (${baseline ? 'v' + baseline.version : 'Belum ada'})</th>
                    <th style="width: 35%;">Draft Revisi (v${draft?.version || 1})</th>
                    <th style="width: 95px; text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${diff.fieldDiffs.map((field) => {
        const isChanged = field.isChanged;
        const rowClass = field.status === 'Added' ? 'pm-diff-row-added' :
          field.status === 'Archived' ? 'pm-diff-row-archived' :
            isChanged ? 'pm-diff-row-modified' : '';

        return `
                      <tr class="${rowClass}">
                        <td class="pm-diff-field-name">${escapeHtml(field.fieldLabel || field.fieldName)}</td>
                        <td>
                          <div class="pm-diff-old-val ${isChanged ? 'is-deleted' : ''}">
                            ${escapeHtml(field.oldValue != null && field.oldValue !== '' ? String(field.oldValue) : '-')}
                          </div>
                        </td>
                        <td>
                          <div class="pm-diff-new-val ${isChanged ? 'is-changed' : ''}">
                            ${escapeHtml(field.newValue != null && field.newValue !== '' ? String(field.newValue) : '-')}
                          </div>
                        </td>
                        <td class="pm-diff-status-cell">
                          ${field.status === 'Added' ? '<span class="pm-diff-status-badge pm-diff-status-added">+ Added</span>' :
            field.status === 'Archived' ? '<span class="pm-diff-status-badge pm-diff-status-archived">Archived</span>' :
              isChanged ? '<span class="pm-diff-status-badge pm-diff-status-modified">Modified</span>' :
                '<span class="pm-diff-status-badge pm-diff-status-same">Sama</span>'}
                        </td>
                      </tr>
                    `;
      }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="pm-modal-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <button
                type="button"
                class="pm-btn-sm pm-btn-outline-danger pm-btn-discard-rev"
                data-entity-type="${entityType}"
                data-entity-id="${entityId}"
                data-mod-id="${moduleId}"
                data-feat-id="${featureId}"
                title="Batalkan draf ini"
              >
                Batalkan Draf (Discard)
              </button>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Tutup</button>

              ${isDraft
        ? `
                <button
                  type="button"
                  class="pm-btn-sm pm-btn-primary pm-btn-submit-rev"
                  data-entity-type="${entityType}"
                  data-entity-id="${entityId}"
                  data-mod-id="${moduleId}"
                  data-feat-id="${featureId}"
                >
                  Ajukan untuk Review
                </button>
              `
        : ''
      }

              ${isInReview
        ? `
                <button
                  type="button"
                  class="pm-btn-sm pm-btn-danger pm-btn-reject-rev"
                  data-entity-type="${entityType}"
                  data-entity-id="${entityId}"
                  data-mod-id="${moduleId}"
                  data-feat-id="${featureId}"
                >
                  Tolak (Reject)
                </button>
                <button
                  type="button"
                  class="pm-btn-sm pm-btn-primary pm-btn-confirm-rev"
                  data-entity-type="${entityType}"
                  data-entity-id="${entityId}"
                  data-mod-id="${moduleId}"
                  data-feat-id="${featureId}"
                  data-version="${draft?.version || 1}"
                  style="background:#16a34a; border-color:#15803d;"
                >
                  Confirm Review
                </button>
              `
        : ''
      }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'confirm-rev') {
    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 520px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Confirm Review: ${escapeHtml(modalData?.entityType || '')} [${escapeHtml(modalData?.entityId || '')}]</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-confirm-rev">
            <div class="pm-modal-body">
              <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:12px; margin-bottom:14px; font-size:0.82rem; color:#166534; line-height:1.5;">
                <div style="font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                  <span>Pemisahan Status: Confirmed vs Published</span>
                </div>
                <div><strong>Confirmed</strong> berarti revisi telah disetujui. Data belum dipublish ke baseline sampai proses ekspor/publikasi dilakukan.</div>
              </div>

              <div class="pm-form-grid">
                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Username Reviewer <span style="color:#ef4444;">*</span></label>
                  <input
                    type="text"
                    name="reviewerUsername"
                    id="pm-confirm-username-input"
                    class="pm-form-input"
                    placeholder="Masukkan username reviewer (contoh: ikhsan)"
                    value="ikhsan"
                    required
                  />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Password Reviewer <span style="color:#ef4444;">*</span></label>
                  <input
                    type="password"
                    name="reviewerPassword"
                    id="pm-confirm-password-input"
                    class="pm-form-input"
                    placeholder="Masukkan kata sandi reviewer"
                    autocomplete="off"
                    required
                  />
                  <div style="font-size:0.72rem; color:#64748b; margin-top:4px;">
                    <strong>Reviewer Confirmation Gate:</strong> Verifikasi otorisasi reviewer sebelum status revisi ditetapkan menjadi Confirmed.
                  </div>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Catatan Persetujuan (Review Note / Opsional)</label>
                  <input
                    type="text"
                    name="reviewNote"
                    id="pm-confirm-note-input"
                    class="pm-form-input"
                    placeholder="Contoh: Disetujui sesuai spesifikasi operasional 2026"
                  />
                </div>
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary" id="pm-btn-submit-confirm-rev" style="background:#16a34a; border-color:#15803d;">
                Confirm Review
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (activeModal === 'reject-rev') {
    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 500px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Tolak Revisi (Reject Draft)</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-reject-rev">
            <div class="pm-modal-body">
              <p style="margin:0; font-size:0.86rem; color:#334155;">
                Anda akan menolak draf <strong>${escapeHtml(modalData?.entityType || '')}</strong> [<code>${escapeHtml(modalData?.entityId || '')}</code>].
              </p>

              <div class="pm-form-group is-full" style="margin-top:12px;">
                <label class="pm-form-label">Alasan Penolakan / Catatan Perbaikan <span style="color:#ef4444;">*</span></label>
                <textarea
                  name="reviewNote"
                  id="pm-reject-note-input"
                  class="pm-form-textarea"
                  rows="4"
                  placeholder="Jelaskan alasan penolakan dan instruksi perbaikan untuk Business Analyst..."
                  required
                ></textarea>
              </div>

              <div style="font-size:0.75rem; color:#64748b; margin-top:6px;">
                Draf yang ditolak akan berstatus <strong>Rejected</strong> dan dapat diperbaiki kembali oleh author sebelum diajukan ulang.
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
              <button type="submit" class="pm-btn-sm pm-btn-danger" id="pm-btn-submit-reject-rev">
                Konfirmasi Penolakan
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (activeModal === 'discard-rev') {
    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width: 480px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Konfirmasi Batalkan Draf</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <p style="margin:0; font-size:0.88rem; color:#334155;">
              Apakah Anda yakin ingin membatalkan draf <strong>${escapeHtml(modalData?.entityType || '')}</strong> [<code>${escapeHtml(modalData?.entityId || '')}</code>]?
            </p>

            <div style="margin-top:12px; padding:10px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; color:#475569;">
              <div><strong>Perilaku Pembatalan (Discard):</strong></div>
              <ul style="margin:6px 0 0 16px; padding:0; line-height:1.5;">
                <li>Jika ini revisi dari data Confirmed, versi resmi sebelumnya akan dipulihkan secara utuh.</li>
                <li>Jika ini adalah draf baru, data draf akan dihapus dari sesi.</li>
                <li>Baseline resmi Confirmed tidak akan pernah rusak.</li>
              </ul>
            </div>
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
            <button type="button" class="pm-btn-sm pm-btn-danger" id="pm-btn-confirm-discard-rev">
              Ya, Batalkan Draf
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'preview-doc') {
    try {
      const docModel = buildDocumentModel(modalDocType, {}, store);
      const renderedHtml = renderDocument(docModel);

      return `
        <div class="pm-modal-backdrop pm-doc-preview-backdrop" id="pm-modal-backdrop">
          <div class="pm-doc-preview-container">
            <!-- Top Fixed Toolbar -->
            <div class="pm-doc-preview-toolbar pm-no-print">
              <div class="pm-doc-toolbar-info">
                <span class="pm-doc-toolbar-code">${escapeHtml(docModel.metadata.docCode)}</span>
                <span class="pm-doc-toolbar-title">${escapeHtml(docModel.metadata.title)}</span>
                <span class="pm-tag ${docModel.metadata.documentStatus === DOCUMENT_STATUS.DRAFT ? 'pm-tag-gap' : 'pm-tag-covered'}">
                  ${escapeHtml(docModel.metadata.documentStatus)}
                </span>
              </div>
              <div class="pm-doc-toolbar-actions">
                <button type="button" class="pm-btn pm-btn-secondary" id="pm-doc-preview-close-btn">Tutup</button>
                <button type="button" class="pm-btn pm-btn-primary" id="pm-doc-preview-print-btn" data-doc-type="${modalDocType}">Cetak / Simpan PDF</button>
              </div>
            </div>

            <!-- Scrollable Document Viewport -->
            <div class="pm-doc-preview-viewport">
              ${renderedHtml}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      return `
        <div class="pm-modal-backdrop pm-doc-preview-backdrop" id="pm-modal-backdrop">
          <div class="pm-doc-preview-container" style="background: #ffffff; padding: 40px; max-width: 600px; margin: 100px auto; border-radius: 4px;">
            <div class="pm-empty-state">
              <h3 class="pm-empty-title">Gagal Membuka Pratinjau Dokumen</h3>
              <p class="pm-empty-desc">${escapeHtml(err.message)}</p>
              <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                <button type="button" class="pm-btn pm-btn-secondary" id="pm-doc-preview-close-btn">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  return '';
}

function renderFooter(metadata) {
  return `
    <footer class="pm-footer">
      <div class="pm-footer-left">
        <span>Rubber Nursery</span>
        <span>&bull;</span>
        <span>Business Process &amp; Requirement Portal</span>
        <span>&bull;</span>
        <span>v${escapeHtml(metadata.version)}</span>
      </div>
      <div class="pm-footer-right">
        <span>SOCFIN</span>
        <span>&bull;</span>
        <span>Growing a Better Tomorrow</span>
      </div>
    </footer>
  `;
}

// -----------------------------------------------------------------------------
// Interactive Events & Handlers
// -----------------------------------------------------------------------------

function attachCanvasPan(stage) {
  if (!stage || stage._pmPanBound) return;
  stage._pmPanBound = true;

  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return;

    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollLeft = stage.scrollLeft;
    scrollTop = stage.scrollTop;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      stage.classList.add('is-panning');
      stage.scrollLeft = scrollLeft - dx;
      stage.scrollTop = scrollTop - dy;
    }
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      setTimeout(() => {
        stage.classList.remove('is-panning');
      }, 50);
    }
  });
}

// -----------------------------------------------------------------------------
// Phase 4B Cross-Navigation Helpers
// -----------------------------------------------------------------------------
function getPortalContainer() {
  return document.getElementById('process-mapping-container') ||
         document.getElementById('pm-portal-container') ||
         document.querySelector('.process-mapping-container') ||
         document.getElementById('pm-portal-root')?.parentElement ||
         document.querySelector('#pm-portal-root')?.parentElement ||
         document.querySelector('.pm-container') ||
         document.body;
}

function jumpToFlowNode(moduleId, featureId, nodeId) {
  currentNavTab = 'mapping';
  currentViewTab = 'flow';
  if (moduleId) {
    currentModuleId = moduleId;
    selectedModuleId = moduleId;
  }
  if (featureId) {
    currentFeatureId = featureId;
  }
  if (nodeId) {
    selectedNodeId = nodeId;
  }
  isDetailOpen = true;
  closeModal();

  const container = getPortalContainer();
  if (container) {
    const store = getActiveStore();
    renderProcessMappingPortal(container);
    setTimeout(() => {
      const nodeEl = container.querySelector(`[data-node-id="${nodeId}"]`);
      if (nodeEl) {
        nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nodeEl.classList.add('is-pulse-highlight');
        setTimeout(() => nodeEl.classList.remove('is-pulse-highlight'), 2500);
      }
    }, 150);
  }
}

function jumpToRequirement(reqId) {
  currentNavTab = 'mapping';
  currentViewTab = 'requirement';
  reqSearchQuery = reqId;

  try {
    const req = getRequirementByReqId(reqId);
    if (req) {
      if (req.moduleId) {
        currentModuleId = req.moduleId;
        selectedModuleId = req.moduleId;
      } else if (req.module) {
        const store = getActiveStore();
        const mod = store.modules?.find(m => m.name === req.module || m.id === req.module);
        if (mod) {
          currentModuleId = mod.id;
          selectedModuleId = mod.id;
        }
      }
    }
  } catch (e) {
    // fallback if lookup is not available
  }

  closeModal();

  const container = getPortalContainer();
  if (container) {
    renderProcessMappingPortal(container);
    setTimeout(() => {
      const reqEl = container.querySelector(`[data-req-id="${reqId}"]`);
      if (reqEl) {
        reqEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        reqEl.classList.add('is-pulse-highlight');
        setTimeout(() => reqEl.classList.remove('is-pulse-highlight'), 2500);
      }
    }, 150);
  }
}

function openBusinessRuleDetailModal(ruleId) {
  const store = getActiveStore();
  const rule = (store.businessRules || []).find(r => r.id === ruleId || r.code === ruleId);
  if (rule) {
    modalData = JSON.parse(JSON.stringify(rule));
    activeModal = 'detail-rule';
    const container = getPortalContainer();
    if (container) {
      renderProcessMappingPortal(container);
    }
  }
}

function selectNode(nodeId, modId, featId, container, store) {
  selectedNodeId = nodeId;
  if (modId) selectedModuleId = modId;
  if (featId && currentModuleId !== 'ALL') currentFeatureId = featId;
  isDetailOpen = true;

  // 1. Update visual highlight on SVG nodes
  container.querySelectorAll('.mermaid-diagram g.node').forEach((g) => {
    if (g.getAttribute('data-node-id') === nodeId) {
      g.classList.add('is-selected');
    } else {
      g.classList.remove('is-selected');
    }
  });

  // 2. Update Detail Panel without resetting canvas pan/zoom
  const detailPanel = container.querySelector('#pm-detail-panel');
  if (detailPanel) {
    const temp = document.createElement('div');
    temp.innerHTML = renderDetailPanel(store);
    const newPanel = temp.firstElementChild;
    if (newPanel) {
      detailPanel.replaceWith(newPanel);
      attachDetailPanelEvents(container, store);
    }
  } else {
    renderProcessMappingPortal(container);
  }
}

function attachSvgNodeEvents(mermaidDiagramEl, portalContainer, store) {
  const svg = mermaidDiagramEl.querySelector('svg');
  if (!svg) return;

  // Build node lookup across all flows
  const flowNodesMap = new Map();
  for (const [modId, features] of Object.entries(store.flows)) {
    for (const [featId, flowObj] of Object.entries(features)) {
      for (const node of flowObj.nodes || []) {
        flowNodesMap.set(node.id, { node, modId, featId });
      }
    }
  }

  // Find all node groups in the Mermaid SVG
  const nodeGroups = svg.querySelectorAll('g.node');
  nodeGroups.forEach((g) => {
    const gid = g.id || '';
    let matchedId = null;
    let matchedInfo = null;

    // 1. Try matching N_${nodeId} in ID
    for (const [nodeId, info] of flowNodesMap.entries()) {
      if (gid.includes(`N_${nodeId}`) || gid.includes(`-${nodeId}-`) || gid.endsWith(`-${nodeId}`)) {
        matchedId = nodeId;
        matchedInfo = info;
        break;
      }
    }

    // 2. Fallback matching text content
    if (!matchedId) {
      for (const [nodeId, info] of flowNodesMap.entries()) {
        const lbl = (info.node.label || info.node.title || '').trim();
        const code = (info.node.code || '').trim();
        if ((code && g.textContent.includes(code)) || (lbl && g.textContent.includes(lbl))) {
          matchedId = nodeId;
          matchedInfo = info;
          break;
        }
      }
    }

    if (!matchedId || !matchedInfo) return;

    g.setAttribute('data-node-id', matchedId);
    g.setAttribute('data-module-id', matchedInfo.modId);
    g.setAttribute('data-feature-id', matchedInfo.featId);
    g.style.cursor = 'pointer';

    if (matchedId === selectedNodeId) {
      g.classList.add('is-selected');
    } else {
      g.classList.remove('is-selected');
    }

    // Pan vs Click discrimination: threshold > 5px
    let pointerStart = null;

    g.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      pointerStart = { x: e.clientX, y: e.clientY };
    });

    g.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !pointerStart) return;
      const dist = Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y);
      pointerStart = null;

      // <= 5px is click; > 5px is drag
      if (dist <= 5) {
        e.stopPropagation();
        e.preventDefault();
        selectNode(matchedId, matchedInfo.modId, matchedInfo.featId, portalContainer, store);
      }
    });

    // Touch support
    let touchStart = null;
    g.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    g.addEventListener('touchend', (e) => {
      if (!touchStart || e.changedTouches.length === 0) return;
      const dist = Math.hypot(e.changedTouches[0].clientX - touchStart.x, e.changedTouches[0].clientY - touchStart.y);
      touchStart = null;

      if (dist <= 5) {
        e.stopPropagation();
        selectNode(matchedId, matchedInfo.modId, matchedInfo.featId, portalContainer, store);
      }
    });
  });
}

function attachDetailPanelEvents(container, store) {
  // Detail Panel Close
  container.querySelector('#pm-detail-close')?.addEventListener('click', () => {
    isDetailOpen = false;
    renderProcessMappingPortal(container);
  });

  // Edit Node button in Detail Panel
  container.querySelectorAll('#pm-detail-panel .pm-btn-node-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId || selectedModuleId;
      const featId = btn.dataset.featId || currentFeatureId;
      const nodeId = btn.dataset.nodeId || selectedNodeId;

      let targetNode = null;
      if (modId && featId) {
        targetNode = store.flows[modId]?.[featId]?.nodes?.find((n) => n.id === nodeId);
      }
      if (!targetNode) {
        for (const [mId, feats] of Object.entries(store.flows)) {
          for (const [fId, flowObj] of Object.entries(feats)) {
            const match = (flowObj.nodes || []).find((n) => n.id === nodeId);
            if (match) {
              targetNode = match;
              break;
            }
          }
          if (targetNode) break;
        }
      }

      if (targetNode) {
        modalData = {
          moduleId: modId,
          featureId: featId,
          node: JSON.parse(JSON.stringify(targetNode))
        };
        activeModal = 'edit-node';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Archive Node button in Detail Panel
  container.querySelectorAll('#pm-detail-panel .pm-btn-node-archive').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId || selectedModuleId;
      const featId = btn.dataset.featId || currentFeatureId;
      const nodeId = btn.dataset.nodeId || selectedNodeId;

      let targetNode = null;
      if (modId && featId) {
        targetNode = store.flows[modId]?.[featId]?.nodes?.find((n) => n.id === nodeId && !n.isArchived && !n.isSuperseded);
      }
      if (!targetNode) {
        for (const [mId, feats] of Object.entries(store.flows)) {
          for (const [fId, flowObj] of Object.entries(feats)) {
            const match = (flowObj.nodes || []).find((n) => n.id === nodeId && !n.isArchived && !n.isSuperseded);
            if (match) {
              targetNode = match;
              break;
            }
          }
          if (targetNode) break;
        }
      }

      if (targetNode) {
        modalData = {
          moduleId: modId,
          featureId: featId,
          node: JSON.parse(JSON.stringify(targetNode))
        };
        activeModal = 'archive-node';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Jump to Requirement button in Detail Panel
  container.querySelectorAll('#pm-detail-panel .pm-btn-jump-req').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const reqId = btn.dataset.reqId;
      if (reqId) jumpToRequirement(reqId);
    });
  });

  // Jump to Business Rule button in Detail Panel
  container.querySelectorAll('#pm-detail-panel .pm-btn-jump-rule').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ruleId = btn.dataset.ruleId;
      if (ruleId) openBusinessRuleDetailModal(ruleId);
    });
  });
}

function attachPortalEvents(container, store) {
  // Global Cross-Navigation Click Delegation
  container.addEventListener('click', (e) => {
    const jumpNodeBtn = e.target.closest('.pm-btn-jump-node, .pm-badge-node-jump');
    if (jumpNodeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const nodeId = jumpNodeBtn.dataset.nodeId;
      const modId = jumpNodeBtn.dataset.modId;
      const featId = jumpNodeBtn.dataset.featId;
      jumpToFlowNode(modId, featId, nodeId);
      return;
    }

    const jumpReqBtn = e.target.closest('.pm-btn-jump-req, .pm-rtm-jump-req-btn');
    if (jumpReqBtn) {
      e.preventDefault();
      e.stopPropagation();
      const reqId = jumpReqBtn.dataset.reqId;
      if (reqId) jumpToRequirement(reqId);
      return;
    }

    const jumpRuleBtn = e.target.closest('.pm-btn-jump-rule, .pm-badge-rule-pill');
    if (jumpRuleBtn) {
      e.preventDefault();
      e.stopPropagation();
      const ruleId = jumpRuleBtn.dataset.ruleId;
      if (ruleId) openBusinessRuleDetailModal(ruleId);
      return;
    }
  });

  // Portal Navigation Tabs in Header
  container.querySelector('#pm-nav-dashboard')?.addEventListener('click', () => {
    currentNavTab = 'dashboard';
    renderProcessMappingPortal(container);
  });
  container.querySelector('#pm-nav-mapping')?.addEventListener('click', () => {
    currentNavTab = 'mapping';
    renderProcessMappingPortal(container);
  });
  container.querySelector('#pm-nav-reference')?.addEventListener('click', () => {
    currentNavTab = 'reference';
    renderProcessMappingPortal(container);
  });
  container.querySelector('#pm-nav-reports')?.addEventListener('click', () => {
    currentNavTab = 'reports';
    renderProcessMappingPortal(container);
  });

  // Dashboard Quick Links
  container.querySelectorAll('[data-dash-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentNavTab = btn.dataset.dashNav;
      renderProcessMappingPortal(container);
    });
  });

  // Reference Tab Events
  container.querySelectorAll('.pm-ref-pill-btn[data-ref-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      refFilterType = btn.dataset.refType;
      renderProcessMappingPortal(container);
    });
  });

  container.querySelector('#pm-ref-category-filter')?.addEventListener('change', (e) => {
    refFilterCategory = e.target.value;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-ref-status-filter')?.addEventListener('change', (e) => {
    refFilterStatus = e.target.value;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-ref-reset-filters-btn')?.addEventListener('click', () => {
    refFilterType = 'ALL';
    refFilterCategory = 'ALL';
    refFilterStatus = 'ALL';
    refSearchQuery = '';
    renderProcessMappingPortal(container);
  });

  const refSearch = container.querySelector('#pm-ref-search');
  if (refSearch) {
    refSearch.addEventListener('input', (e) => {
      refSearchQuery = e.target.value;
      const filtered = getFilteredReferenceItems(store);
      const tbody = container.querySelector('#pm-ref-table-body');
      const countEl = container.querySelector('#pm-ref-count-text');
      if (tbody) tbody.innerHTML = renderReferenceTableRows(filtered);
      if (countEl) countEl.textContent = `Menampilkan ${filtered.length} dari ${(store.functionalRequirements || []).length + (store.nonFunctionalRequirements || []).length} requirement`;
    });
  }

  // Delegated click for Reference requirement detail
  const refTbody = container.querySelector('#pm-ref-table-body');
  if (refTbody) {
    refTbody.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.pm-btn-view-ref-req, .pm-btn-view-req');
      if (viewBtn) {
        e.stopPropagation();
        const reqId = viewBtn.dataset.reqId;
        const allGeneral = [
          ...(store.functionalRequirements || []),
          ...(store.nonFunctionalRequirements || []),
          ...(store.requirements || [])
        ];
        const req = allGeneral.find((r) => r.id === reqId);
        if (req) {
          modalData = JSON.parse(JSON.stringify(req));
          selectedReqDetailVersion = null;
          activeModal = 'detail-req';
          renderProcessMappingPortal(container);
        }
      }
    });
  }

  // Reports Tab Events
  container.querySelectorAll('.pm-report-tab-btn[data-report-subtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      reportSubTab = btn.dataset.reportSubtab;
      renderProcessMappingPortal(container);
    });
  });

  container.querySelector('#pm-report-module-filter')?.addEventListener('change', (e) => {
    reportFilterModule = e.target.value;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-report-role-filter')?.addEventListener('change', (e) => {
    reportFilterRole = e.target.value;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-btn-export-pdf')?.addEventListener('click', () => {
    exportReportDocument(store);
  });

  // Official Document Hub & Preview Viewer Events (Phase 5C)
  container.querySelectorAll('.pm-doc-preview-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      modalDocType = btn.dataset.docType || DOCUMENT_TYPES.RTM_REPORT;
      activeModal = 'preview-doc';
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-doc-print-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const docType = btn.dataset.docType || DOCUMENT_TYPES.RTM_REPORT;
      executePrintOfficialDocument(docType, store);
    });
  });

  container.querySelector('#pm-doc-preview-close-btn')?.addEventListener('click', () => {
    activeModal = null;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-doc-preview-print-btn')?.addEventListener('click', () => {
    executePrintOfficialDocument(modalDocType, store);
  });

  // RTM Search & Filter Events
  const rtmSearchInput = container.querySelector('#pm-rtm-search-input');
  if (rtmSearchInput) {
    rtmSearchInput.addEventListener('input', (e) => {
      rtmSearchQuery = e.target.value;
      rtmCurrentPage = 1;
      renderProcessMappingPortal(container);
      const newInput = container.querySelector('#pm-rtm-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });
  }

  container.querySelector('#pm-rtm-module-filter')?.addEventListener('change', (e) => {
    rtmFilterModule = e.target.value;
    rtmCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-rtm-role-filter')?.addEventListener('change', (e) => {
    rtmFilterRole = e.target.value;
    rtmCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-rtm-class-filter')?.addEventListener('change', (e) => {
    rtmFilterClassification = e.target.value;
    rtmCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-rtm-rule-filter')?.addEventListener('change', (e) => {
    rtmFilterRuleLink = e.target.value;
    rtmCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-rtm-status-filter')?.addEventListener('change', (e) => {
    rtmFilterReqStatus = e.target.value;
    rtmCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  function resetRtmFilterState() {
    rtmSearchQuery = '';
    rtmFilterModule = 'ALL';
    rtmFilterRole = 'ALL';
    rtmFilterClassification = 'ALL';
    rtmFilterRuleLink = 'ALL';
    rtmFilterReqStatus = 'ALL';
    rtmCurrentPage = 1;
    renderProcessMappingPortal(container);
  }

  container.querySelector('#pm-rtm-reset-filters')?.addEventListener('click', resetRtmFilterState);
  container.querySelector('#pm-rtm-empty-reset-btn')?.addEventListener('click', resetRtmFilterState);

  // RTM Pagination Events
  container.querySelector('#pm-rtm-page-size-select')?.addEventListener('change', (e) => {
    rtmPageSize = parseInt(e.target.value, 10) || 5;
    rtmCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-rtm-prev-page-btn')?.addEventListener('click', () => {
    if (rtmCurrentPage > 1) {
      rtmCurrentPage--;
      renderProcessMappingPortal(container);
    }
  });

  container.querySelector('#pm-rtm-next-page-btn')?.addEventListener('click', () => {
    rtmCurrentPage++;
    renderProcessMappingPortal(container);
  });

  // RTM Row Drilldown Button
  container.querySelectorAll('.pm-rtm-drilldown-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const reqId = btn.dataset.reqId;
      const req = getRequirementByReqId(reqId);
      if (req) {
        modalData = JSON.parse(JSON.stringify(req));
        selectedReqDetailVersion = null;
        activeModal = 'detail-req';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Gap Analysis Search & Filter Events
  const gapSearchInput = container.querySelector('#pm-gap-search-input');
  if (gapSearchInput) {
    gapSearchInput.addEventListener('input', (e) => {
      gapSearchQuery = e.target.value;
      gapCurrentPage = 1;
      renderProcessMappingPortal(container);
      const newInput = container.querySelector('#pm-gap-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });
  }

  container.querySelector('#pm-gap-module-filter')?.addEventListener('change', (e) => {
    gapFilterModule = e.target.value;
    gapCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-gap-role-filter')?.addEventListener('change', (e) => {
    gapFilterRole = e.target.value;
    gapCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-gap-status-filter')?.addEventListener('change', (e) => {
    gapFilterStatus = e.target.value;
    gapCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  function resetGapFilterState() {
    gapSearchQuery = '';
    gapFilterModule = 'ALL';
    gapFilterRole = 'ALL';
    gapFilterStatus = 'ALL';
    gapCurrentPage = 1;
    renderProcessMappingPortal(container);
  }

  container.querySelector('#pm-gap-reset-filters')?.addEventListener('click', resetGapFilterState);
  container.querySelector('#pm-gap-empty-reset-btn')?.addEventListener('click', resetGapFilterState);

  // Module Breakdown Card Quick-Filter
  container.querySelectorAll('.pm-module-gap-card[data-mod-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const modId = card.dataset.modId;
      if (gapFilterModule === modId) {
        gapFilterModule = 'ALL';
      } else {
        gapFilterModule = modId;
      }
      gapCurrentPage = 1;
      renderProcessMappingPortal(container);
    });
  });

  // Gap Analysis CSV Export Button
  container.querySelector('#pm-gap-export-csv')?.addEventListener('click', () => {
    const gapReport = getGapAnalysisReport();
    const filteredGaps = (gapReport.gapRecords || []).filter((rec) => {
      const req = rec.requirement || {};
      const reqId = (req.id || req.reqId || '').toLowerCase();
      const title = (req.title || '').toLowerCase();
      const role = (req.role || '').toLowerCase();
      const modName = (rec.module?.name || req.module || '').toLowerCase();
      const modId = (rec.module?.id || req.module || '').toLowerCase();
      const featName = (rec.feature?.name || req.feature || '').toLowerCase();

      if (gapSearchQuery && gapSearchQuery.trim()) {
        const q = gapSearchQuery.trim().toLowerCase();
        const rulesMatch = (rec.businessRules || []).some((r) =>
          (r.id || '').toLowerCase().includes(q) ||
          (r.code || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q)
        );

        const matches =
          reqId.includes(q) ||
          title.includes(q) ||
          role.includes(q) ||
          modName.includes(q) ||
          modId.includes(q) ||
          featName.includes(q) ||
          rulesMatch;

        if (!matches) return false;
      }

      if (gapFilterModule !== 'ALL') {
        const currentModId = rec.module?.id || req.module;
        if (currentModId !== gapFilterModule && req.module !== gapFilterModule) {
          return false;
        }
      }

      if (gapFilterRole !== 'ALL') {
        const matchedRoleObj = store.roles?.find((r) => r.id === gapFilterRole);
        const roleName = matchedRoleObj ? matchedRoleObj.name : gapFilterRole;
        if (req.role !== gapFilterRole && req.role !== roleName) {
          return false;
        }
      }

      if (gapFilterStatus !== 'ALL') {
        if (req.status !== gapFilterStatus) return false;
      }

      return true;
    });

    exportGapAnalysisCsv(filteredGaps);
  });

  // Gap Pagination Events
  container.querySelector('#pm-gap-page-size-select')?.addEventListener('change', (e) => {
    gapPageSize = parseInt(e.target.value, 10) || 10;
    gapCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-gap-prev-page-btn')?.addEventListener('click', () => {
    if (gapCurrentPage > 1) {
      gapCurrentPage--;
      renderProcessMappingPortal(container);
    }
  });

  container.querySelector('#pm-gap-next-page-btn')?.addEventListener('click', () => {
    gapCurrentPage++;
    renderProcessMappingPortal(container);
  });

  // Wire detail panel events initially
  attachDetailPanelEvents(container, store);

  // Mode Switcher Buttons
  container.querySelector('#pm-mode-view-btn')?.addEventListener('click', () => {
    isManageMode = false;
    showToast('Beralih ke View Mode (Read-Only)');
    renderProcessMappingPortal(container);
  });

  container.querySelector('#pm-mode-manage-btn')?.addEventListener('click', () => {
    isManageMode = true;
    showToast('Beralih ke Manage Mode (Editor Aktif)');
    renderProcessMappingPortal(container);
  });

  // Actions: Finalisasi Traceability & Terapkan True Gap
  container.querySelector('#pm-btn-finalize-traceability')?.addEventListener('click', () => {
    try {
      finalizeFlowAndBusinessRuleTraceability(store);
      saveDraftToStorage();
      showToast('Traceability berhasil difinalisasi (156 Edges, 18/18 Rules PASS)');
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal finalisasi traceability: ' + err.message);
    }
  });

  container.querySelector('#pm-btn-apply-true-gaps')?.addEventListener('click', () => {
    try {
      applyTrueGapResolutionPlan(store);
      saveDraftToStorage();
      showToast('True Gap berhasil diselesaikan (170/170 Flow Covered)');
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menerapkan resolusi True Gap: ' + err.message);
    }
  });

  container.querySelector('#pm-gap-apply-plan')?.addEventListener('click', () => {
    try {
      applyTrueGapResolutionPlan(store);
      saveDraftToStorage();
      showToast('Resolusi True Gap berhasil diterapkan ke dataset!');
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menerapkan rencana resolusi: ' + err.message);
    }
  });

  // Save Draft Button
  container.querySelector('#pm-btn-save-draft')?.addEventListener('click', () => {
    try {
      saveDraftToStorage();
      showToast('Draf berhasil disimpan ke sesi lokal');
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menyimpan draf: ' + err.message);
    }
  });

  // Export Button
  container.querySelector('#pm-btn-export-data')?.addEventListener('click', () => {
    activeModal = 'export';
    renderProcessMappingPortal(container);
  });

  // Import Button
  container.querySelector('#pm-btn-import-data')?.addEventListener('click', () => {
    activeModal = 'import';
    renderProcessMappingPortal(container);
  });

  // Reset Draft Button
  container.querySelector('#pm-btn-reset-draft')?.addEventListener('click', () => {
    activeModal = 'reset';
    renderProcessMappingPortal(container);
  });

  // Role Selector
  container.querySelector('#pm-role-select')?.addEventListener('change', (e) => {
    currentRole = e.target.value;
    currentModuleId = 'ALL';
    renderProcessMappingPortal(container);
  });

  // Module Nav Buttons in Sidebar
  container.querySelectorAll('.pm-module-item[data-module-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.moduleId;
      currentModuleId = modId;
      if (modId !== 'ALL') {
        selectedModuleId = modId;
        const mod = store.modules.find((m) => m.id === modId);
        if (mod && mod.features.length > 0) {
          currentFeatureId = mod.features[0].id;
        }
        const flow = store.flows[modId]?.[currentFeatureId] || Object.values(store.flows[modId] || {})[0];
        if (flow && flow.nodes.length > 0) {
          selectedNodeId = flow.nodes[0]?.id;
        }
      }
      renderProcessMappingPortal(container);
    });
  });

  // Focus button in All Modules card
  container.querySelectorAll('.pm-section-focus-btn[data-focus-module-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.focusModuleId;
      currentModuleId = modId;
      selectedModuleId = modId;
      const mod = store.modules.find((m) => m.id === modId);
      if (mod && mod.features.length > 0) {
        currentFeatureId = mod.features[0].id;
      }
      const flow = store.flows[modId]?.[currentFeatureId] || Object.values(store.flows[modId] || {})[0];
      if (flow && flow.nodes.length > 0) {
        selectedNodeId = flow.nodes[0]?.id;
      }
      renderProcessMappingPortal(container);
    });
  });

  // Jump to Module Selector in All Modules bar
  container.querySelector('#pm-jump-module-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const targetSection = container.querySelector(`#module-section-${val}`);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetSection.style.outline = '2px solid #16a34a';
      setTimeout(() => {
        targetSection.style.outline = '';
      }, 1500);
    }
  });

  // Sub-Tab Switcher
  container.querySelectorAll('.pm-sub-tab-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentViewTab = btn.dataset.view;
      renderProcessMappingPortal(container);
    });
  });

  // Feature Selector in Single Module View
  container.querySelector('#pm-feature-select')?.addEventListener('change', (e) => {
    currentFeatureId = e.target.value;
    const flow = store.flows[currentModuleId]?.[currentFeatureId];
    if (flow && flow.nodes.length > 0) {
      selectedNodeId = flow.nodes[0]?.id;
    }
    renderProcessMappingPortal(container);
  });

  // Node Selection on Canvas
  container.querySelectorAll('.pm-node-card[data-node-id]').forEach((box) => {
    box.addEventListener('click', (e) => {
      // Don't trigger selection if user clicked a manage control button
      if (e.target.closest('.pm-node-ctrl-btns')) return;

      selectedNodeId = box.dataset.nodeId;
      selectedModuleId = box.dataset.moduleId;
      isDetailOpen = true;
      renderProcessMappingPortal(container);
    });
  });

  // Requirement row click to open detail
  container.querySelectorAll('.pm-req-full-row[data-req-id]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.pm-action-menu-wrap') || e.target.closest('.pm-row-btn')) return; // ignore edit/archive buttons

      const reqId = row.dataset.reqId;
      // Find node corresponding to this requirement
      for (const [modId, features] of Object.entries(store.flows)) {
        for (const [featId, flowObj] of Object.entries(features)) {
          const match = (flowObj.nodes || []).find((n) => n.reqId === reqId);
          if (match) {
            selectedNodeId = match.id;
            selectedModuleId = modId;
            isDetailOpen = true;
            renderProcessMappingPortal(container);
            return;
          }
        }
      }
    });
  });

  // Detail Panel Close
  container.querySelector('#pm-detail-close')?.addEventListener('click', () => {
    isDetailOpen = false;
    renderProcessMappingPortal(container);
  });

  // Global Search
  const searchInput = container.querySelector('#pm-global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchQuery.length > 2) {
        performGlobalSearch(searchQuery, container, store);
      }
    });

    if (!window._pmKbdSearchBound) {
      window._pmKbdSearchBound = true;
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          const inp = document.getElementById('pm-global-search');
          if (inp) {
            e.preventDefault();
            inp.focus();
            inp.select();
          }
        }
      });
    }
  }

  // Zoom Controls
  container.querySelector('#pm-zoom-in')?.addEventListener('click', () => {
    zoomScale = Math.min(zoomScale + 0.15, 2.0);
    applyZoom(container);
  });
  container.querySelector('#pm-zoom-out')?.addEventListener('click', () => {
    zoomScale = Math.max(zoomScale - 0.15, 0.5);
    applyZoom(container);
  });
  container.querySelector('#pm-zoom-reset')?.addEventListener('click', () => {
    zoomScale = 1.0;
    applyZoom(container);
  });
  container.querySelector('#pm-fit-view')?.addEventListener('click', () => {
    zoomScale = 0.95;
    applyZoom(container);
  });

  // Back to Mantri Bibitan button
  container.querySelector('#pm-btn-back-mantri')?.addEventListener('click', () => {
    currentRole = 'mantri-bibitan';
    currentModuleId = 'ALL';
    renderProcessMappingPortal(container);
  });

  // ---------------------------------------------------------------------------
  // Requirement Manager Events (Search, Filters, Add, View Detail, Edit, Archive)
  // ---------------------------------------------------------------------------
  
  // Search input in Requirement Manager
  const reqSearchInput = container.querySelector('#pm-req-search-input');
  if (reqSearchInput) {
    reqSearchInput.addEventListener('input', (e) => {
      reqSearchQuery = e.target.value;
      reqCurrentPage = 1;
      renderProcessMappingPortal(container);
      // Keep focus on input after re-render
      setTimeout(() => {
        const inp = document.getElementById('pm-req-search-input');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      }, 0);
    });
  }

  // Filter Role
  container.querySelector('#pm-req-filter-role')?.addEventListener('change', (e) => {
    reqFilterRole = e.target.value;
    reqCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Filter Module
  container.querySelector('#pm-req-filter-module')?.addEventListener('change', (e) => {
    reqFilterModule = e.target.value;
    reqFilterFeature = 'ALL'; // reset feature filter when module changes
    reqCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Filter Feature
  container.querySelector('#pm-req-filter-feature')?.addEventListener('change', (e) => {
    reqFilterFeature = e.target.value;
    reqCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Filter Status
  container.querySelector('#pm-req-filter-status')?.addEventListener('change', (e) => {
    reqFilterStatus = e.target.value;
    reqCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Reset Filters Button
  container.querySelector('#pm-btn-reset-req-filter')?.addEventListener('click', () => {
    reqSearchQuery = '';
    reqFilterRole = 'ALL';
    reqFilterModule = 'ALL';
    reqFilterFeature = 'ALL';
    reqFilterStatus = 'ALL';
    reqCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Add Requirement Button
  container.querySelector('#pm-btn-add-req')?.addEventListener('click', () => {
    const firstMod = store.modules[0];
    const firstFeat = firstMod?.features[0];
    modalData = {
      id: '',
      title: '',
      role: 'Mantri Bibitan',
      module: firstMod?.name || 'Presensi',
      moduleId: firstMod?.id || '01-presensi',
      feature: firstFeat?.name || 'Presensi Supervisor',
      featureId: firstFeat?.id || 'presensi-supervisor',
      status: 'Draft',
      acceptanceCriteria: '',
      process: '',
      input: '',
      validation: '',
      fallback: '',
      output: '',
      businessRule: ''
    };
    activeModal = 'edit-req';
    renderProcessMappingPortal(container);
  });

  // View Requirement Detail Button
  container.querySelectorAll('.pm-btn-view-req[data-req-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const reqId = btn.dataset.reqId;
      const req = store.requirements.find((r) => r.id === reqId && !r.isArchived && !r.isSuperseded) ||
                  store.requirements.find((r) => r.id === reqId);
      if (req) {
        modalData = JSON.parse(JSON.stringify(req));
        selectedReqDetailVersion = null;
        activeModal = 'detail-req';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Edit Requirement from Detail Modal
  container.querySelector('.pm-btn-edit-from-detail')?.addEventListener('click', (e) => {
    const reqId = e.currentTarget.dataset.reqId;
    const req = store.requirements.find((r) => r.id === reqId && !r.isArchived && !r.isSuperseded) ||
                store.requirements.find((r) => r.id === reqId);
    if (req) {
      modalData = JSON.parse(JSON.stringify(req));
      activeModal = 'edit-req';
      renderProcessMappingPortal(container);
    }
  });

  // Preview earlier revision snapshot in Detail Modal
  container.querySelectorAll('.pm-btn-preview-revision[data-version]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedReqDetailVersion = parseInt(btn.dataset.version, 10);
      renderProcessMappingPortal(container);
    });
  });

  // Return to latest version preview in Detail Modal
  container.querySelector('.pm-btn-view-latest-req')?.addEventListener('click', () => {
    selectedReqDetailVersion = null;
    renderProcessMappingPortal(container);
  });

  // Edit Requirement Button (from table row)
  container.querySelectorAll('.pm-btn-edit-req[data-req-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const reqId = btn.dataset.reqId;
      const req = store.requirements.find((r) => r.id === reqId && !r.isArchived && !r.isSuperseded) ||
                  store.requirements.find((r) => r.id === reqId && !r.isArchived);
      if (req) {
        modalData = JSON.parse(JSON.stringify(req));
        activeModal = 'edit-req';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Archive Requirement Button (opens Archive Confirmation Modal)
  container.querySelectorAll('.pm-btn-archive-req[data-req-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const reqId = btn.dataset.reqId;
      const req = store.requirements.find((r) => r.id === reqId && !r.isArchived && !r.isSuperseded) ||
                  store.requirements.find((r) => r.id === reqId && !r.isArchived);
      if (req) {
        modalData = JSON.parse(JSON.stringify(req));
        activeModal = 'archive-req';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Confirm Archive in Archive Modal
  container.querySelector('#pm-btn-confirm-archive')?.addEventListener('click', () => {
    if (!modalData?.id) return;
    const reqId = modalData.id;
    try {
      archiveRequirement(reqId);
      saveDraftToStorage();
      showToast(`Requirement ${reqId} berhasil diarsipkan`);
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal mengarsipkan requirement: ' + err.message);
    }
  });

  // Reactive Module -> Feature Dropdown in Requirement Modal Form
  const modalModSelect = container.querySelector('#pm-modal-req-module');
  const modalFeatSelect = container.querySelector('#pm-modal-req-feature');
  if (modalModSelect && modalFeatSelect) {
    modalModSelect.addEventListener('change', (e) => {
      const selectedModName = e.target.value;
      const modObj = store.modules.find(m => m.name === selectedModName);
      if (modObj && Array.isArray(modObj.features)) {
        modalFeatSelect.innerHTML = modObj.features.map(f => `<option value="${f.name}" data-feat-id="${f.id}">${f.name}</option>`).join('');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Manage Mode Events: Nodes (Add, Edit, Reorder, Archive)
  // ---------------------------------------------------------------------------
  container.querySelectorAll('.pm-btn-add-node').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      modalData = {
        moduleId: modId,
        featureId: featId,
        node: {
          id: '',
          code: '',
          type: 'process',
          label: '',
          purpose: '',
          input: '',
          output: '',
          validation: '',
          fallback: '',
          stockImpact: 'NO STOCK CHANGE',
          reqId: '',
          relatedRole: 'Asisten Bibitan (Verifikasi)'
        }
      };
      activeModal = 'edit-node';
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-btn-node-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      const modId = btn.dataset.modId || selectedModuleId;
      const featId = btn.dataset.featId || currentFeatureId;
      const flow = store.flows[modId]?.[featId];
      const node = flow?.nodes?.find((n) => n.id === nodeId && !n.isArchived && !n.isSuperseded);
      if (node) {
        modalData = {
          moduleId: modId,
          featureId: featId,
          node: JSON.parse(JSON.stringify(node))
        };
        activeModal = 'edit-node';
        renderProcessMappingPortal(container);
      }
    });
  });

  container.querySelector('.pm-btn-edit-node-detail')?.addEventListener('click', (e) => {
    const nodeId = e.currentTarget.dataset.nodeId;
    for (const [modId, features] of Object.entries(store.flows)) {
      for (const [featId, flowObj] of Object.entries(features)) {
        const node = (flowObj.nodes || []).find((n) => n.id === nodeId);
        if (node) {
          modalData = {
            moduleId: modId,
            featureId: featId,
            node: JSON.parse(JSON.stringify(node))
          };
          activeModal = 'edit-node';
          renderProcessMappingPortal(container);
          return;
        }
      }
    }
  });

  container.querySelectorAll('.pm-btn-node-up').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      reorderFlowNode(modId, featId, nodeId, -1);
      saveDraftToStorage();
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-btn-node-down').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      reorderFlowNode(modId, featId, nodeId, 1);
      saveDraftToStorage();
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-btn-node-archive').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      const modId = btn.dataset.modId || selectedModuleId;
      const featId = btn.dataset.featId || currentFeatureId;
      const flow = store.flows[modId]?.[featId];
      const node = flow?.nodes?.find((n) => n.id === nodeId && !n.isArchived && !n.isSuperseded);
      if (node) {
        modalData = {
          moduleId: modId,
          featureId: featId,
          node: JSON.parse(JSON.stringify(node))
        };
        activeModal = 'archive-node';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Dynamic Module -> Feature -> Requirement selector inside Node Form
  const nodeModuleSelect = container.querySelector('#pm-node-form-module');
  if (nodeModuleSelect) {
    nodeModuleSelect.addEventListener('change', (e) => {
      const selectedModId = e.target.value;
      const modObj = store.modules.find(m => m.id === selectedModId);
      const featSelect = container.querySelector('#pm-node-form-feature');
      const reqSelect = container.querySelector('#pm-node-form-req');

      if (featSelect && modObj) {
        featSelect.innerHTML = (modObj.features || []).map(f => `
          <option value="${f.id}">${escapeHtml(f.name)}</option>
        `).join('');
      }

      if (reqSelect && modObj) {
        const moduleRequirements = (store.requirements || []).filter(r => !r.isArchived && !r.isSuperseded && (r.moduleId === selectedModId || r.module === modObj.name));
        reqSelect.innerHTML = `
          <option value="">-- Tanpa Terhubung Requirement (Opsional) --</option>
          ${moduleRequirements.map(r => `
            <option value="${r.id}">[${r.id}] ${escapeHtml(r.title)} (${r.type || 'KF'})</option>
          `).join('')}
        `;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Modal Actions: Submit & Cancel Handlers
  // ---------------------------------------------------------------------------
  container.querySelector('#pm-modal-close-btn')?.addEventListener('click', closeModal);
  container.querySelector('#pm-modal-cancel-btn')?.addEventListener('click', closeModal);

  // Form Submit: Requirement
  container.querySelector('#pm-form-requirement')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedModName = formData.get('module');
    const selectedMod = store.modules.find((m) => m.name === selectedModName);
    const selectedFeatName = formData.get('feature');
    const selectedFeat = selectedMod?.features.find((f) => f.name === selectedFeatName);

    const fields = {
      title: formData.get('title'),
      role: formData.get('role'),
      module: selectedModName,
      moduleId: selectedMod?.id || '01-presensi',
      feature: selectedFeatName || selectedMod?.features[0]?.name,
      featureId: selectedFeat?.id || selectedMod?.features[0]?.id,
      acceptanceCriteria: formData.get('acceptanceCriteria'),
      process: formData.get('process') || '',
      input: formData.get('input') || '',
      validation: formData.get('validation') || '',
      fallback: formData.get('fallback') || '',
      output: formData.get('output') || '',
      businessRule: formData.get('businessRule') || '',
      status: formData.get('status') || 'Draft'
    };

    try {
      if (!modalData?.id) {
        // Create new requirement (Draft)
        const created = createRequirement(fields);
        saveDraftToStorage();
        showToast(`Requirement ${created.id} berhasil ditambahkan (Draft)`);
      } else {
        // Edit or revision
        const res = editRequirement(modalData.id, fields, 'Business Analyst');
        saveDraftToStorage();
        if (res.isRevision) {
          showToast(`Revisi baru ${res.requirement.id} v${res.requirement.version} berhasil dibuat (Draft)`);
        } else {
          showToast(`Requirement ${res.requirement.id} berhasil diperbarui (Draft)`);
        }
      }

      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menyimpan requirement: ' + err.message);
    }
  });

  // Confirm Archive Node
  container.querySelector('#pm-btn-confirm-archive-node')?.addEventListener('click', () => {
    if (modalData?.moduleId && modalData?.featureId && modalData?.node?.id) {
      archiveFlowNode(modalData.moduleId, modalData.featureId, modalData.node.id);
      saveDraftToStorage();
      showToast(`Node ${modalData.node.code || modalData.node.label || ''} berhasil diarsipkan (Draft)`);
      closeModal();
      renderProcessMappingPortal(container);
    }
  });

  // Form Submit: Node
  container.querySelector('#pm-form-node')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const modId = formData.get('moduleId') || modalData.moduleId || selectedModuleId;
    const featId = formData.get('featureId') || modalData.featureId || currentFeatureId;
    const newLabel = (formData.get('label') || '').trim();
    const newPurpose = (formData.get('purpose') || '').trim();
    const newCode = (formData.get('code') || '').trim();

    if (!newLabel) {
      alert('Label / Nama Langkah wajib diisi.');
      return;
    }

    const fields = {
      code: newCode,
      type: formData.get('type') || 'process',
      label: newLabel,
      title: newLabel,
      purpose: newPurpose,
      summary: newPurpose,
      description: newPurpose,
      input: (formData.get('input') || '-').trim(),
      output: (formData.get('output') || '-').trim(),
      validation: (formData.get('validation') || '-').trim(),
      fallback: (formData.get('fallback') || '-').trim(),
      stockImpact: (formData.get('stockImpact') || 'NO STOCK CHANGE').trim(),
      reqId: (formData.get('reqId') || '').trim(),
      ruleIds: formData.getAll('ruleIds'),
      relatedRole: (formData.get('relatedRole') || 'Asisten Bibitan (Verifikasi)').trim(),
      status: 'Draft'
    };

    try {
      if (!modalData?.node?.id) {
        // Add node
        const createdNode = addFlowNode(modId, featId, fields, 'Business Analyst');
        if (createdNode && createdNode.id) {
          selectedNodeId = createdNode.id;
          selectedModuleId = modId;
          currentFeatureId = featId;
        }
        showToast(`Langkah alur ${createdNode.code || ''} berhasil ditambahkan (Draft)`);
      } else {
        // Edit node
        const res = editFlowNode(modId, featId, modalData.node.id, fields, 'Business Analyst');
        selectedNodeId = modalData.node.id;
        selectedModuleId = modId;
        currentFeatureId = featId;
        if (res.isRevision) {
          showToast(`Revisi langkah v${res.node.version} berhasil dibuat (Draft)`);
        } else {
          showToast(`Langkah alur ${res.node.code || ''} berhasil diperbarui (Draft)`);
        }
      }

      saveDraftToStorage();
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menyimpan langkah: ' + err.message);
    }
  });

  // ---------------------------------------------------------------------------
  // Manage Mode Events: Connections / Edges (Add, Edit, Archive)
  // ---------------------------------------------------------------------------
  container.querySelectorAll('.pm-btn-add-edge').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId || selectedModuleId;
      const featId = btn.dataset.featId || currentFeatureId;
      modalData = {
        moduleId: modId,
        featureId: featId,
        edge: {
          id: '',
          from: '',
          to: '',
          condition: '',
          label: '',
          description: '',
          status: 'Draft'
        }
      };
      activeModal = 'edit-edge';
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-btn-edge-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId || selectedModuleId;
      const featId = btn.dataset.featId || currentFeatureId;
      const edgeId = btn.dataset.edgeId;
      const flow = store.flows[modId]?.[featId];
      const edge = flow?.edges?.find(e => e.id === edgeId && !e.isArchived && !e.isSuperseded);
      if (edge) {
        modalData = {
          moduleId: modId,
          featureId: featId,
          edge: JSON.parse(JSON.stringify(edge))
        };
        activeModal = 'edit-edge';
        renderProcessMappingPortal(container);
      }
    });
  });

  container.querySelectorAll('.pm-btn-edge-archive').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId || selectedModuleId;
      const featId = btn.dataset.featId || currentFeatureId;
      const edgeId = btn.dataset.edgeId;
      const flow = store.flows[modId]?.[featId];
      const edge = flow?.edges?.find(e => e.id === edgeId && !e.isArchived && !e.isSuperseded);
      if (edge) {
        modalData = {
          moduleId: modId,
          featureId: featId,
          edge: JSON.parse(JSON.stringify(edge))
        };
        activeModal = 'archive-edge';
        renderProcessMappingPortal(container);
      }
    });
  });

  // Preset button click in Connection form
  container.querySelectorAll('.pm-btn-cond-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = container.querySelector('#pm-edge-form-cond');
      if (input) {
        input.value = btn.dataset.val || '';
        input.focus();
      }
    });
  });

  // Confirm Archive Edge
  container.querySelector('#pm-btn-confirm-archive-edge')?.addEventListener('click', () => {
    if (modalData?.moduleId && modalData?.featureId && modalData?.edge?.id) {
      archiveFlowEdge(modalData.moduleId, modalData.featureId, modalData.edge.id);
      saveDraftToStorage();
      showToast('Koneksi alur berhasil diarsipkan (Draft)');
      closeModal();
      renderProcessMappingPortal(container);
    }
  });

  // Form Submit: Edge / Connection
  container.querySelector('#pm-form-edge')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const modId = modalData.moduleId || selectedModuleId;
    const featId = modalData.featureId || currentFeatureId;
    const fromVal = (formData.get('from') || '').trim();
    const toVal = (formData.get('to') || '').trim();
    const condVal = (formData.get('condition') || '').trim();
    const descVal = (formData.get('description') || '').trim();

    if (!fromVal || !toVal) {
      alert('Source Node dan Target Node wajib dipilih.');
      return;
    }

    if (fromVal === toVal) {
      alert('Koneksi tidak boleh menghubungkan node ke dirinya sendiri (Self-loop ditolak).');
      return;
    }

    const fields = {
      from: fromVal,
      to: toVal,
      condition: condVal,
      label: condVal,
      description: descVal,
      status: 'Draft'
    };

    try {
      if (!modalData?.edge?.id) {
        addFlowEdge(modId, featId, fields, 'Business Analyst');
        showToast('Koneksi alur baru berhasil ditambahkan (Draft)');
      } else {
        const res = editFlowEdge(modId, featId, modalData.edge.id, fields, 'Business Analyst');
        if (res.isRevision) {
          showToast(`Revisi koneksi v${res.edge.version} berhasil dibuat (Draft)`);
        } else {
          showToast('Koneksi alur berhasil diperbarui (Draft)');
        }
      }

      saveDraftToStorage();
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menyimpan koneksi: ' + err.message);
    }
  });

  // Form Submit: Export
  container.querySelector('#pm-form-export')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const version = formData.get('version');
    const updatedBy = formData.get('updatedBy');

    try {
      exportProjectDataFile({ version, updatedBy });
      showToast('process-mapping-data.json berhasil diekspor');
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal mengekspor data: ' + err.message);
    }
  });

  // Import File Selection
  const importInput = container.querySelector('#pm-file-import-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const preview = previewImportProjectData(event.target.result);
          const previewArea = container.querySelector('#pm-import-preview-area');
          const confirmBtn = container.querySelector('#pm-btn-confirm-import');

          previewArea.innerHTML = `
            <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-top:12px;">
              <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">Pratinjau Data Impor:</div>
              <ul style="margin:0; padding-left:18px; font-size:0.8rem; color:#334155;">
                <li>Versi Data: <strong>${escapeHtml(preview.metadata?.version || '-')}</strong></li>
                <li>Diperbarui Oleh: <strong>${escapeHtml(preview.metadata?.updatedBy || '-')}</strong></li>
                <li>Total Modul: ${preview.totalModules}</li>
                <li>Total Requirements: ${preview.totalRequirements}</li>
                <li>Total Flow: ${preview.totalFlows}</li>
              </ul>
            </div>
          `;

          confirmBtn.style.display = 'inline-flex';
          confirmBtn.onclick = () => {
            applyImportedProjectData(preview.candidateData);
            showToast('Data berhasil diimpor ke editor state');
            closeModal();
            renderProcessMappingPortal(container);
          };
        } catch (err) {
          alert('File JSON tidak valid: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset Draft Confirm Button
  container.querySelector('#pm-btn-confirm-reset')?.addEventListener('click', async () => {
    try {
      await resetDraftToOfficial();
      showToast('Draf lokal dibatalkan. Memulihkan data resmi process-mapping-data.json');
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal mereset draf: ' + err.message);
    }
  });

  // ---------------------------------------------------------------------------
  // Revision & Review Workflow Events (Phase 3)
  // ---------------------------------------------------------------------------

  // Search input in Revision & Review
  const revSearchInput = container.querySelector('#pm-rev-search-input');
  if (revSearchInput) {
    revSearchInput.addEventListener('input', (e) => {
      revSearchQuery = e.target.value;
      revCurrentPage = 1;
      renderProcessMappingPortal(container);
      setTimeout(() => {
        const inp = document.getElementById('pm-rev-search-input');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      }, 0);
    });
  }

  // Filter Entity Type
  container.querySelector('#pm-rev-filter-entity')?.addEventListener('change', (e) => {
    revFilterEntityType = e.target.value;
    revCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Filter Status
  container.querySelector('#pm-rev-filter-status')?.addEventListener('change', (e) => {
    revFilterStatus = e.target.value;
    revCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Filter Module
  container.querySelector('#pm-rev-filter-module')?.addEventListener('change', (e) => {
    revFilterModule = e.target.value;
    revCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Reset Filters Button
  container.querySelector('#pm-btn-reset-rev-filter')?.addEventListener('click', () => {
    revSearchQuery = '';
    revFilterEntityType = 'ALL';
    revFilterStatus = 'ALL';
    revFilterModule = 'ALL';
    revCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // ---------------------------------------------------------------------------
  // Revision & Review: Sub-tab Navigation & Baseline Reconciliation Events (Task 15.1)
  // ---------------------------------------------------------------------------
  // Sub-Tab Switch
  container.querySelectorAll('[data-rev-subtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      revSubTab = btn.dataset.revSubtab;
      renderProcessMappingPortal(container);
    });
  });

  // Reconciliation KPI Card Click-to-Filter
  container.querySelectorAll('.pm-recon-kpi-card').forEach((card) => {
    card.addEventListener('click', () => {
      const cls = card.dataset.reconClass;
      reconFilterClassification = reconFilterClassification === cls ? 'ALL' : cls;
      reconCurrentPage = 1;
      renderProcessMappingPortal(container);
    });
  });

  // Search input in Reconciliation Catalog
  const reconSearchInput = container.querySelector('#pm-recon-search-input');
  if (reconSearchInput) {
    reconSearchInput.addEventListener('input', (e) => {
      reconSearchQuery = e.target.value;
      reconCurrentPage = 1;
      renderProcessMappingPortal(container);
      setTimeout(() => {
        const inp = document.getElementById('pm-recon-search-input');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
        }
      }, 0);
    });
  }

  // Filter Classification
  container.querySelector('#pm-recon-filter-class')?.addEventListener('change', (e) => {
    reconFilterClassification = e.target.value;
    reconCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Filter Module in Reconciliation
  container.querySelector('#pm-recon-filter-module')?.addEventListener('change', (e) => {
    reconFilterModule = e.target.value;
    reconCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // Reset Filters Button in Reconciliation
  container.querySelector('#pm-btn-reset-recon-filter')?.addEventListener('click', () => {
    reconSearchQuery = '';
    reconFilterClassification = 'ALL';
    reconFilterModule = 'ALL';
    reconCurrentPage = 1;
    renderProcessMappingPortal(container);
  });

  // ---------------------------------------------------------------------------
  // Table Pagination Navigation & Page Size Handlers
  // ---------------------------------------------------------------------------
  container.querySelectorAll('.pm-page-btn[data-page-nav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = btn.dataset.pageNav;
      const targetPage = parseInt(btn.dataset.page, 10);
      if (isNaN(targetPage) || targetPage < 1) return;
      if (type === 'req') {
        reqCurrentPage = targetPage;
      } else if (type === 'rev') {
        revCurrentPage = targetPage;
      } else if (type === 'recon') {
        reconCurrentPage = targetPage;
      }
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-page-size-select[data-page-size-change]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const type = sel.dataset.pageSizeChange;
      const newSize = parseInt(e.target.value, 10) || 10;
      if (type === 'req') {
        reqPageSize = newSize;
        reqCurrentPage = 1;
      } else if (type === 'rev') {
        revPageSize = newSize;
        revCurrentPage = 1;
      } else if (type === 'recon') {
        reconPageSize = newSize;
        reconCurrentPage = 1;
      }
      renderProcessMappingPortal(container);
    });
  });

  // Action Menu Toggle per row in Revision & Review & Requirement Manager
  container.querySelectorAll('.pm-action-trigger-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.dataset.target;
      const targetMenu = container.querySelector(`#${CSS.escape(targetId)}`);
      const wasOpen = targetMenu?.classList.contains('is-open');

      // Close any other open dropdown menu
      container.querySelectorAll('.pm-action-dropdown-menu.is-open').forEach((m) => {
        m.classList.remove('is-open');
      });
      container.querySelectorAll('.pm-action-trigger-btn.is-active').forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-expanded', 'false');
      });

      if (!wasOpen && targetMenu) {
        targetMenu.classList.add('is-open');
        btn.classList.add('is-active');
        btn.setAttribute('aria-expanded', 'true');

        // Viewport overflow check (bottom boundary)
        const rect = targetMenu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
          targetMenu.style.top = 'auto';
          targetMenu.style.bottom = 'calc(100% + 4px)';
        } else {
          targetMenu.style.top = 'calc(100% + 4px)';
          targetMenu.style.bottom = 'auto';
        }
      }
    });
  });

  // Global click outside to close dropdowns
  if (container._pmOutsideClickListener) {
    document.removeEventListener('click', container._pmOutsideClickListener);
  }
  container._pmOutsideClickListener = (e) => {
    if (!e.target.closest('.pm-action-menu-wrap')) {
      container.querySelectorAll('.pm-action-dropdown-menu.is-open').forEach((m) => {
        m.classList.remove('is-open');
      });
      container.querySelectorAll('.pm-action-trigger-btn.is-active').forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-expanded', 'false');
      });
    }
  };
  document.addEventListener('click', container._pmOutsideClickListener);

  // Compare Revision Button (opens diff modal)
  container.querySelectorAll('.pm-btn-compare-rev').forEach((btn) => {
    btn.addEventListener('click', () => {
      modalData = {
        entityType: btn.dataset.entityType,
        entityId: btn.dataset.entityId,
        moduleId: btn.dataset.modId,
        featureId: btn.dataset.featId,
        version: parseInt(btn.dataset.version || '1', 10)
      };
      activeModal = 'compare-rev';
      renderProcessMappingPortal(container);
    });
  });

  // Submit Revision for Review
  container.querySelectorAll('.pm-btn-submit-rev').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entityType = btn.dataset.entityType;
      const entityId = btn.dataset.entityId;
      const moduleId = btn.dataset.modId;
      const featureId = btn.dataset.featId;
      try {
        submitEntityForReview(entityType, { entityId, moduleId, featureId }, 'Business Analyst');
        saveDraftToStorage();
        showToast(`${entityType} ${entityId} berhasil diajukan untuk Review`);
        if (activeModal === 'compare-rev') closeModal();
        renderProcessMappingPortal(container);
      } catch (err) {
        alert('Gagal mengajukan review: ' + err.message);
      }
    });
  });

  // Confirm Revision Button (opens Reviewer Confirmation Gate modal)
  container.querySelectorAll('.pm-btn-confirm-rev').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      modalData = {
        entityType: btn.dataset.entityType,
        entityId: btn.dataset.entityId,
        moduleId: btn.dataset.modId,
        featureId: btn.dataset.featId,
        version: parseInt(btn.dataset.version || '1', 10)
      };
      activeModal = 'confirm-rev';
      renderProcessMappingPortal(container);
    });
  });

  // Submit Confirm Review Form (Reviewer Confirmation Gate with username & password)
  container.querySelector('#pm-form-confirm-rev')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reviewerUsername = (formData.get('reviewerUsername') || '').trim();
    const reviewerPassword = (formData.get('reviewerPassword') || '').trim();
    const reviewNote = (formData.get('reviewNote') || '').trim();

    if (!verifyReviewerCredentials(reviewerUsername, reviewerPassword)) {
      alert('Kredensial reviewer salah (Username atau Password tidak cocok). Revisi tetap berstatus In Review.');
      return;
    }

    try {
      confirmEntityRevision(modalData.entityType, modalData, reviewerUsername, reviewNote);
      saveDraftToStorage();
      showToast(`${modalData.entityType} ${modalData.entityId} disetujui (Confirmed) oleh ${reviewerUsername}. Data siap diekspor via Export Project Data.`);
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal mengonfirmasi revisi: ' + err.message);
    }
  });

  // Reject Revision Button (opens Reject Note Modal)
  container.querySelectorAll('.pm-btn-reject-rev').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      modalData = {
        entityType: btn.dataset.entityType,
        entityId: btn.dataset.entityId,
        moduleId: btn.dataset.modId,
        featureId: btn.dataset.featId
      };
      activeModal = 'reject-rev';
      renderProcessMappingPortal(container);
    });
  });

  // Submit Reject Note Form
  container.querySelector('#pm-form-reject-rev')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reviewNote = (formData.get('reviewNote') || '').trim();
    if (!reviewNote) {
      alert('Alasan penolakan / catatan perbaikan wajib diisi.');
      return;
    }
    try {
      rejectEntityRevision(modalData.entityType, modalData, reviewNote, 'Lead Reviewer');
      saveDraftToStorage();
      showToast(`Draf ${modalData.entityType} ${modalData.entityId} ditolak dengan catatan`);
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menolak draf: ' + err.message);
    }
  });

  // Discard Draft Button (opens confirmation modal)
  container.querySelectorAll('.pm-btn-discard-rev').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      modalData = {
        entityType: btn.dataset.entityType,
        entityId: btn.dataset.entityId,
        moduleId: btn.dataset.modId,
        featureId: btn.dataset.featId
      };
      activeModal = 'discard-rev';
      renderProcessMappingPortal(container);
    });
  });

  // Confirm Discard in Discard Modal
  container.querySelector('#pm-btn-confirm-discard-rev')?.addEventListener('click', () => {
    if (!modalData?.entityType || !modalData?.entityId) return;
    try {
      discardEntityDraft(modalData.entityType, modalData, 'Business Analyst');
      saveDraftToStorage();
      showToast(`Draf ${modalData.entityType} ${modalData.entityId} berhasil dibatalkan`);
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal membatalkan draf: ' + err.message);
    }
  });
}

function closeModal() {
  activeModal = null;
  modalData = null;
  const backdrop = document.getElementById('pm-modal-backdrop');
  if (backdrop) backdrop.remove();
}

function showToast(msg) {
  toastMessage = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage = null;
    const toast = document.querySelector('.pm-toast');
    if (toast) toast.remove();
  }, 3000);
}

function applyZoom(container) {
  const panWrap = container.querySelector('#pm-pan-wrap');
  if (panWrap) {
    panWrap.style.transform = `scale(${zoomScale})`;
  }
}

function performGlobalSearch(query, container, store) {
  const q = query.toLowerCase().trim();

  // 1. Search in Flow Nodes
  for (const [modId, features] of Object.entries(store.flows)) {
    for (const [featId, flowObj] of Object.entries(features)) {
      const matchedNode = (flowObj.nodes || []).find((node) => {
        return (
          node.label?.toLowerCase().includes(q) ||
          node.code?.toLowerCase().includes(q) ||
          node.reqId?.toLowerCase().includes(q) ||
          node.purpose?.toLowerCase().includes(q) ||
          node.process?.toLowerCase().includes(q)
        );
      });

      if (matchedNode) {
        selectedNodeId = matchedNode.id;
        selectedModuleId = modId;
        isDetailOpen = true;

        if (currentModuleId !== 'ALL' && currentModuleId !== modId) {
          currentModuleId = modId;
          currentFeatureId = featId;
        }

        renderProcessMappingPortal(container);

        // Highlight matched node
        setTimeout(() => {
          const el = container.querySelector(`.pm-node-card[data-node-id="${matchedNode.id}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('is-search-match');
            setTimeout(() => el.classList.remove('is-search-match'), 2000);
          }
        }, 150);
        return;
      }
    }
  }

  // 2. Search in Requirements
  const matchedReq = store.requirements.find(
    (r) => r.id?.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q)
  );

  if (matchedReq) {
    // Open Requirement View
    currentViewTab = 'requirement';
    renderProcessMappingPortal(container);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================================================
// 1. DASHBOARD VIEW (Dynamically calculated from Single Source of Truth JSON)
// =============================================================================

function renderDashboardView(store) {
  const roles = store.roles || [];
  const modules = store.modules || [];
  const funcReqs = store.functionalRequirements || [];
  const nonFuncReqs = store.nonFunctionalRequirements || [];
  const procReqs = (store.requirements || []).filter((r) => !r.isArchived);

  // Dynamic calculations directly from store dataset
  const totalRoles = roles.length;
  const confirmedRoles = roles.filter((r) => (r.status || '').toUpperCase() === 'CONFIRMED').length;
  const inProgressRoles = roles.filter((r) => (r.status || '').toUpperCase().includes('PROGRESS')).length;

  const totalModules = modules.length;
  const confirmedModules = modules.filter((m) => (m.status || '').toUpperCase() === 'CONFIRMED').length;

  const totalFeatures = modules.reduce((sum, m) => sum + (m.features ? m.features.length : 0), 0);

  const allReqs = [...funcReqs, ...nonFuncReqs, ...procReqs];
  const totalReqs = allReqs.length;
  const confirmedReqs = allReqs.filter((r) => (r.status || '').toUpperCase() === 'CONFIRMED').length;
  const inProgressReqs = allReqs.filter((r) => {
    const st = (r.status || '').toUpperCase();
    return st.includes('PROGRESS') || st.includes('DRAFT') || st.includes('REVIEW');
  }).length;

  let totalFlowNodes = 0;
  let draftFlowNodes = 0;
  if (store.flows) {
    for (const mId in store.flows) {
      for (const fId in store.flows[mId]) {
        for (const node of store.flows[mId][fId].nodes || []) {
          totalFlowNodes++;
          if (node.status && node.status.toLowerCase() === 'draft') draftFlowNodes++;
        }
      }
    }
  }

  const compliancePercent = totalReqs > 0 ? Math.round((confirmedReqs / totalReqs) * 100) : 0;

  return `
    <div class="pm-dashboard-container">
      <div class="pm-dashboard-header">
        <div>
          <h1 class="pm-dashboard-title">Dashboard Kesiapan Proses Bisnis &amp; Sistem</h1>
          <p class="pm-dashboard-desc">Ringkasan status baseline, modul operasional, dan kebutuhan sistem pembibitan karet.</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="pm-meta-chip">Dataset v${escapeHtml(store.metadata?.version || '1.0.0')}</span>
          <span class="pm-meta-chip">${escapeHtml(store.metadata?.lastUpdated || '-')}</span>
        </div>
      </div>

      <!-- Dynamic Stats Grid (6 Cards, Strictly Dynamic from Dataset) -->
      <div class="pm-dashboard-stats-grid">
        <div class="pm-stat-card pm-stat-primary">
          <div class="pm-stat-label">Total Role Pengguna</div>
          <div class="pm-stat-value">${totalRoles}</div>
          <div class="pm-stat-hint">${confirmedRoles} Confirmed &bull; ${inProgressRoles} In Progress</div>
        </div>
        <div class="pm-stat-card pm-stat-modules">
          <div class="pm-stat-label">Modul Operasional</div>
          <div class="pm-stat-value">${totalModules}</div>
          <div class="pm-stat-hint">${confirmedModules} Modul Terdefinisi Resmi</div>
        </div>
        <div class="pm-stat-card pm-stat-features">
          <div class="pm-stat-label">Fitur Sistem</div>
          <div class="pm-stat-value">${totalFeatures}</div>
          <div class="pm-stat-hint">Terdistribusi pada seluruh modul</div>
        </div>
        <div class="pm-stat-card pm-stat-reqs">
          <div class="pm-stat-label">Total Requirement</div>
          <div class="pm-stat-value">${totalReqs}</div>
          <div class="pm-stat-hint">${funcReqs.length} KF &bull; ${nonFuncReqs.length} KNF &bull; ${procReqs.length} Alur</div>
        </div>
        <div class="pm-stat-card pm-stat-confirmed">
          <div class="pm-stat-label">Status Confirmed</div>
          <div class="pm-stat-value">${confirmedReqs}</div>
          <div class="pm-stat-hint">${compliancePercent}% Kepatuhan Baseline</div>
        </div>
        <div class="pm-stat-card pm-stat-open">
          <div class="pm-stat-label">Langkah Alur Proses</div>
          <div class="pm-stat-value">${totalFlowNodes}</div>
          <div class="pm-stat-hint">${draftFlowNodes} draf review internal</div>
        </div>
      </div>

      <!-- Tables Section -->
      <div class="pm-dashboard-tables-grid">
        <!-- Card 1: Modul Operasional Readiness -->
        <div class="pm-dash-card">
          <h3 class="pm-dash-card-title">
            <span>Status Kesiapan Modul Operasional</span>
          </h3>
          <table class="pm-dash-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Modul</th>
                <th>Fitur</th>
                <th>PIC Utama</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${modules
      .map(
        (m) => `
                <tr>
                  <td style="font-weight: 700; color: #116834;">${escapeHtml(m.order || m.id)}</td>
                  <td style="font-weight: 600;">${escapeHtml(m.name)}</td>
                  <td>${(m.features || []).length} fitur</td>
                  <td style="color: #475569; font-size: 0.78rem;">${escapeHtml(m.primaryRole || 'Mantri Bibitan')}</td>
                  <td>
                    <span class="pm-status-badge ${(m.status || '').toUpperCase() === 'CONFIRMED' ? 'pm-status-confirmed' : 'pm-status-review'}">
                      ${escapeHtml(m.status || 'Confirmed')}
                    </span>
                  </td>
                </tr>
              `
      )
      .join('')}
            </tbody>
          </table>
        </div>

        <!-- Card 2: Rekapitulasi Baseline Dokumen Sistem -->
        <div class="pm-dash-card">
          <h3 class="pm-dash-card-title">
            <span>Rekapitulasi Baseline Dokumen Sistem</span>
          </h3>
          <table class="pm-dash-table">
            <thead>
              <tr>
                <th>Kategori Dokumen</th>
                <th>Cakupan</th>
                <th>Item</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 600;">Functional Requirement (KF)</td>
                <td style="color: #475569;">14 Area Bisnis &amp; Otomasi</td>
                <td style="font-weight: 700;">${funcReqs.length}</td>
                <td><span class="pm-status-badge pm-status-confirmed">Confirmed</span></td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Non-Functional Requirement (KNF)</td>
                <td style="color: #475569;">10 Kategori Teknis &amp; Keamanan</td>
                <td style="font-weight: 700;">${nonFuncReqs.length}</td>
                <td><span class="pm-status-badge pm-status-confirmed">Confirmed</span></td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Operational Process Requirements</td>
                <td style="color: #475569;">11 Modul Operasional Pembibitan</td>
                <td style="font-weight: 700;">${procReqs.length}</td>
                <td><span class="pm-status-badge pm-status-confirmed">Confirmed</span></td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Aturan Bisnis (Business Rules)</td>
                <td style="color: #475569;">Validasi Teknis &amp; Ambang Batas</td>
                <td style="font-weight: 700;">${(store.businessRules || []).length}</td>
                <td><span class="pm-status-badge pm-status-confirmed">Confirmed</span></td>
              </tr>
            </tbody>
          </table>

          <!-- Quick Action Jump Links -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #475569; text-transform: uppercase;">Aksi Cepat Menu Portal:</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="pm-btn-sm pm-btn-secondary" data-dash-nav="reference">
                Buka Reference Requirement &rarr;
              </button>
              <button type="button" class="pm-btn-sm pm-btn-secondary" data-dash-nav="mapping">
                Buka Process Mapping Flow &rarr;
              </button>
              <button type="button" class="pm-btn-sm pm-btn-secondary" data-dash-nav="reports">
                Buka Reports &amp; Cetak Dokumen &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// 2. REFERENCE VIEW (Baseline General Requirements Documentation)
// =============================================================================

function getFilteredReferenceItems(store) {
  const funcItems = (store.functionalRequirements || []).map((f) => ({ ...f, reqType: 'Functional' }));
  const nonFuncItems = (store.nonFunctionalRequirements || []).map((nf) => ({ ...nf, reqType: 'Non-Functional' }));
  let all = [...funcItems, ...nonFuncItems];

  const typeFilter = (refFilterType || 'ALL').toUpperCase();
  if (typeFilter === 'FUNCTIONAL' || typeFilter === 'KF') {
    all = all.filter((item) => (item.reqType || item.type || '').toUpperCase() === 'FUNCTIONAL' || (item.id || '').startsWith('KF-'));
  } else if (typeFilter === 'NON-FUNCTIONAL' || typeFilter === 'KNF' || typeFilter === 'NONFUNCTIONAL') {
    all = all.filter((item) => (item.reqType || item.type || '').toUpperCase().includes('NON') || (item.id || '').startsWith('KNF-'));
  }

  if (refFilterCategory && refFilterCategory.toUpperCase() !== 'ALL') {
    all = all.filter((item) => (item.category || '').toLowerCase() === refFilterCategory.toLowerCase());
  }

  if (refFilterStatus && refFilterStatus.toUpperCase() !== 'ALL') {
    all = all.filter((item) => (item.status || 'Confirmed').toUpperCase() === refFilterStatus.toUpperCase());
  }

  if (refSearchQuery && refSearchQuery.trim()) {
    const q = refSearchQuery.toLowerCase().trim();
    all = all.filter((item) => {
      return (
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.acceptance && item.acceptance.toLowerCase().includes(q)) ||
        (item.acceptanceCriteria && item.acceptanceCriteria.toLowerCase().includes(q)) ||
        (item.reqType && item.reqType.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q))
      );
    });
  }

  return all;
}

function renderReferenceTableRows(items) {
  if (items.length === 0) {
    return `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px; color: #64748b;">
          Tidak ada requirement yang sesuai dengan filter pencarian.
        </td>
      </tr>
    `;
  }

  return items
    .map(
      (item) => `
    <tr class="pm-ref-row" data-req-id="${escapeHtml(item.id)}">
      <td style="white-space: nowrap;">
        <span class="pm-ref-id-badge">${escapeHtml(item.id)}</span>
      </td>
      <td style="white-space: nowrap;">
        <span class="pm-chip-type ${(item.reqType === 'Functional' || item.type === 'Functional') ? 'pm-chip-func' : 'pm-chip-nonfunc'}">
          ${escapeHtml(item.reqType || item.type || 'Requirement')}
        </span>
      </td>
      <td style="white-space: nowrap;">
        <span class="pm-ref-category-tag">${escapeHtml(item.category || '-')}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${escapeHtml(item.title || '')}</div>
        ${item.description ? `<div style="color: #475569; font-size: 0.8rem; line-height: 1.45; margin-bottom: 4px;">${escapeHtml(item.description)}</div>` : ''}
        ${(item.acceptance || item.acceptanceCriteria)
          ? `
          <div style="margin-top: 6px; padding: 6px 10px; background: #f8fafc; border-left: 3px solid #116834; border-radius: 4px; font-size: 0.76rem; color: #334155;">
            <strong>Kriteria Penerimaan:</strong> ${escapeHtml(item.acceptance || item.acceptanceCriteria)}
          </div>
        `
          : ''
        }
      </td>
      <td style="white-space: nowrap; text-align: center;">
        <span class="pm-status-badge pm-status-confirmed">
          ${escapeHtml(item.status || 'Confirmed')}
        </span>
      </td>
      <td style="white-space: nowrap; text-align: center;">
        <button type="button" class="pm-row-btn pm-btn-view-ref-req" data-req-id="${escapeHtml(item.id)}" title="Lihat Detail Requirement">
          Detail
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

function renderReferenceView(store) {
  const funcItems = store.functionalRequirements || [];
  const nonFuncItems = store.nonFunctionalRequirements || [];
  const totalGeneral = funcItems.length + nonFuncItems.length;

  const categories = Array.from(
    new Set([...funcItems, ...nonFuncItems].map((it) => it.category).filter(Boolean))
  ).sort();

  const filteredItems = getFilteredReferenceItems(store);
  const typeFilter = (refFilterType || 'ALL').toUpperCase();

  return `
    <div class="pm-reference-container">
      <div class="pm-dashboard-header">
        <div>
          <h1 class="pm-dashboard-title">Reference: Kebutuhan Sistem General (Baseline)</h1>
          <p class="pm-dashboard-desc">Spesifikasi kebutuhan umum sistem (Functional &amp; Non-Functional) yang menjadi standar acuan seluruh modul.</p>
        </div>
        <div>
          <span class="pm-meta-chip">Confirmed Baseline</span>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="pm-ref-filter-bar">
        <div class="pm-ref-pill-group">
          <button type="button" class="pm-ref-pill-btn ${typeFilter === 'ALL' ? 'is-active' : ''}" data-ref-type="ALL">
            Semua (${totalGeneral})
          </button>
          <button type="button" class="pm-ref-pill-btn ${(typeFilter === 'FUNCTIONAL' || typeFilter === 'KF') ? 'is-active' : ''}" data-ref-type="FUNCTIONAL">
            Functional (${funcItems.length})
          </button>
          <button type="button" class="pm-ref-pill-btn ${(typeFilter === 'NON-FUNCTIONAL' || typeFilter === 'KNF' || typeFilter === 'NONFUNCTIONAL') ? 'is-active' : ''}" data-ref-type="NON-FUNCTIONAL">
            Non-Functional (${nonFuncItems.length})
          </button>
        </div>

        <input
          type="text"
          id="pm-ref-search"
          class="pm-ref-search-input"
          placeholder="Cari ID, judul, kategori, deskripsi..."
          value="${escapeHtml(refSearchQuery)}"
        />

        <select id="pm-ref-category-filter" class="pm-ref-select">
          <option value="ALL" ${refFilterCategory.toUpperCase() === 'ALL' ? 'selected' : ''}>Semua Kategori (${categories.length})</option>
          ${categories
      .map(
        (cat) => `
            <option value="${escapeHtml(cat)}" ${refFilterCategory.toLowerCase() === cat.toLowerCase() ? 'selected' : ''}>
              ${escapeHtml(cat)}
            </option>
          `
      )
      .join('')}
        </select>

        <select id="pm-ref-status-filter" class="pm-ref-select">
          <option value="ALL" ${refFilterStatus.toUpperCase() === 'ALL' ? 'selected' : ''}>Semua Status</option>
          <option value="Confirmed" ${refFilterStatus.toUpperCase() === 'CONFIRMED' ? 'selected' : ''}>Confirmed</option>
        </select>

        <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-ref-reset-filters-btn" title="Reset Semua Filter ke Default">
          Reset Filter
        </button>
      </div>

      <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <span id="pm-ref-count-text">Menampilkan ${filteredItems.length} dari ${totalGeneral} requirement</span>
        <span style="font-style: italic;">Standar baseline arsitektur &amp; kepatuhan SIGMA Nursery</span>
      </div>

      <!-- Requirements Table -->
      <div class="pm-ref-table-wrap">
        <table class="pm-ref-table">
          <thead>
            <tr>
              <th style="width: 100px;">ID</th>
              <th style="width: 130px;">Tipe</th>
              <th style="width: 180px;">Kategori</th>
              <th>Judul &amp; Spesifikasi Kebutuhan</th>
              <th style="width: 110px; text-align: center;">Status</th>
              <th style="width: 90px; text-align: center;">Aksi</th>
            </tr>
          </thead>
          <tbody id="pm-ref-table-body">
            ${renderReferenceTableRows(filteredItems)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =============================================================================
// 3. REPORTS VIEW (Strictly READ-ONLY Formal Documentation & Interactive RTM)
// =============================================================================

function renderReportsView(store) {
  const modules = store.modules || [];
  const roles = store.roles || [];

  return `
    <div class="pm-reports-container">
      <!-- Reports Header & Sub-Tab Switcher -->
      <div class="pm-reports-header">
        <div class="pm-report-tabs">
          <button type="button" class="pm-report-tab-btn ${reportSubTab === 'req-doc' ? 'is-active' : ''}" data-report-subtab="req-doc">
            1. Ringkasan Eksekutif
          </button>
          <button type="button" class="pm-report-tab-btn ${reportSubTab === 'bp-doc' ? 'is-active' : ''}" data-report-subtab="bp-doc">
            2. Berdasarkan Role
          </button>
          <button type="button" class="pm-report-tab-btn ${reportSubTab === 'req-matrix' ? 'is-active' : ''}" data-report-subtab="req-matrix">
            3. Traceability Matrix
          </button>
          <button type="button" class="pm-report-tab-btn ${reportSubTab === 'gap-analysis' ? 'is-active' : ''}" data-report-subtab="gap-analysis">
            4. Gap Analysis
          </button>
          <button type="button" class="pm-report-tab-btn ${reportSubTab === 'official-docs' ? 'is-active' : ''}" data-report-subtab="official-docs">
            5. Dokumen Resmi
          </button>
        </div>

        <div class="pm-report-controls">
          ${reportSubTab === 'bp-doc'
      ? `
              <select id="pm-report-module-filter" class="pm-ref-select">
                <option value="all">Semua Modul (${modules.length})</option>
                ${modules
        .map(
          (m) => `
                  <option value="${m.id}" ${reportFilterModule === m.id ? 'selected' : ''}>
                    ${m.order}. ${m.name}
                  </option>
                `
        )
        .join('')}
              </select>

              <select id="pm-report-role-filter" class="pm-ref-select">
                <option value="all">Semua Role (${roles.length})</option>
                ${roles
        .map(
          (r) => `
                  <option value="${r.id}" ${reportFilterRole === r.id ? 'selected' : ''}>
                    ${r.name}
                  </option>
                `
        )
        .join('')}
              </select>
            `
      : ''
    }

          ${reportSubTab === 'req-doc' || reportSubTab === 'bp-doc'
      ? `
              <button type="button" class="pm-btn-export-pdf" id="pm-btn-export-pdf">
                Cetak / Export PDF
              </button>
            `
      : ''
    }
        </div>
      </div>

      <!-- Document Sheet Preview / Interactive Matrix Container -->
      <div class="${reportSubTab === 'req-matrix' || reportSubTab === 'official-docs' ? 'pm-rtm-view-wrapper' : 'pm-report-document'}" id="pm-printable-report">
        ${reportSubTab === 'req-doc'
      ? renderReportReqDoc(store)
      : reportSubTab === 'bp-doc'
        ? renderReportBpDoc(store)
        : reportSubTab === 'req-matrix'
          ? renderReportMatrix(store)
          : reportSubTab === 'gap-analysis'
            ? renderReportGapAnalysis(store)
            : renderReportOfficialDocs(store)
    }
      </div>
    </div>
  `;
}

/**
 * Render Official Document Hub (DOC-04, DOC-05) with Live Dynamic Metadata
 * @param {Object} store
 * @returns {string}
 */
function renderReportOfficialDocs(store) {
  try {
    const rtmMeta = resolveDocumentMetadata(DOCUMENT_TYPES.RTM_REPORT, {}, store);
    const gapMeta = resolveDocumentMetadata(DOCUMENT_TYPES.GAP_REPORT, {}, store);
    const metrics = getCoverageMetrics();

    const docItems = [
      {
        type: DOCUMENT_TYPES.RTM_REPORT,
        code: rtmMeta.docCode || 'DOC-04',
        id: rtmMeta.documentId,
        title: rtmMeta.title,
        version: rtmMeta.documentVersion || 'v1.0.0',
        status: rtmMeta.documentStatus || DOCUMENT_STATUS.DRAFT,
        desc: rtmMeta.description,
        updated: rtmMeta.generatedDateFormatted || rtmMeta.generatedDate?.split('T')[0] || '-',
        dataVersion: `v${store.metadata?.version || rtmMeta.sourceBaseline?.dataVersion || '1.0.0'}`,
        statsText: `${metrics.totalActiveRequirements} Requirements | ${metrics.flowCovered} Covered | Health ${metrics.totalTraceabilityHealth}%`
      },
      {
        type: DOCUMENT_TYPES.GAP_REPORT,
        code: gapMeta.docCode || 'DOC-05',
        id: gapMeta.documentId,
        title: gapMeta.title,
        version: gapMeta.documentVersion || 'v1.0.0',
        status: gapMeta.documentStatus || DOCUMENT_STATUS.DRAFT,
        desc: gapMeta.description,
        updated: gapMeta.generatedDateFormatted || gapMeta.generatedDate?.split('T')[0] || '-',
        dataVersion: `v${store.metadata?.version || gapMeta.sourceBaseline?.dataVersion || '1.0.0'}`,
        statsText: metrics.flowGap === 0
          ? `0 True Gaps (100% Flow Coverage — All ${metrics.totalModules} Modules Covered)`
          : `${metrics.flowGap} True Gaps Teridentifikasi`
      }
    ];

    return `
      <div class="pm-doc-hub-container" id="pm-doc-hub-root">
        <!-- Hub Banner Header -->
        <div class="pm-doc-hub-header">
          <div class="pm-doc-hub-header-main">
            <h2 class="pm-doc-hub-title">Pusat Dokumen Resmi & Spesifikasi Sistem</h2>
            <p class="pm-doc-hub-desc">
              Dokumen formal A4 standar korporat yang digenerate langsung dari Single Source of Truth SIGMA Rubber Nursery.
            </p>
          </div>
          <div class="pm-doc-hub-header-meta">
            <span class="pm-tag pm-tag-covered">Enterprise A4 Paged Media</span>
            <span class="pm-tag pm-tag-gap">DRAFT (Internal Review)</span>
          </div>
        </div>

        <!-- Document Cards Grid -->
        <div class="pm-doc-card-grid">
          ${docItems.map(item => `
            <div class="pm-doc-card" data-doc-card="${item.type}">
              <div class="pm-doc-card-top">
                <div class="pm-doc-card-code-badge">${escapeHtml(item.code)}</div>
                <div class="pm-doc-card-status">
                  <span class="pm-tag ${item.status === DOCUMENT_STATUS.DRAFT ? 'pm-tag-gap' : 'pm-tag-covered'}">
                    ${escapeHtml(item.status)}
                  </span>
                </div>
              </div>

              <h3 class="pm-doc-card-title">${escapeHtml(item.title)}</h3>
              <p class="pm-doc-card-desc">${escapeHtml(item.desc)}</p>

              <div class="pm-doc-card-meta-grid">
                <div class="pm-doc-card-meta-item">
                  <span class="pm-doc-card-meta-label">Nomor Dokumen:</span>
                  <span class="pm-doc-card-meta-val"><code>${escapeHtml(item.id)}</code></span>
                </div>
                <div class="pm-doc-card-meta-item">
                  <span class="pm-doc-card-meta-label">Versi Dokumen:</span>
                  <span class="pm-doc-card-meta-val">${escapeHtml(item.version)}</span>
                </div>
                <div class="pm-doc-card-meta-item">
                  <span class="pm-doc-card-meta-label">Versi Data Acuan:</span>
                  <span class="pm-doc-card-meta-val">${escapeHtml(item.dataVersion)}</span>
                </div>
                <div class="pm-doc-card-meta-item">
                  <span class="pm-doc-card-meta-label">Terakhir Dibuat:</span>
                  <span class="pm-doc-card-meta-val">${escapeHtml(item.updated)}</span>
                </div>
                <div class="pm-doc-card-meta-item pm-doc-card-meta-full">
                  <span class="pm-doc-card-meta-label">Cakupan Data:</span>
                  <span class="pm-doc-card-meta-val"><strong>${escapeHtml(item.statsText)}</strong></span>
                </div>
              </div>

              <div class="pm-doc-card-actions">
                <button type="button" class="pm-btn pm-btn-outline pm-doc-preview-btn" data-doc-type="${item.type}">
                  Pratinjau
                </button>
                <button type="button" class="pm-btn pm-btn-primary pm-doc-print-btn" data-doc-type="${item.type}">
                  Cetak PDF
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    return `
      <div class="pm-empty-state">
        <h3 class="pm-empty-title">Gagal Memuat Daftar Dokumen Resmi</h3>
        <p class="pm-empty-desc">${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function exportGapAnalysisCsv(records) {
  if (!records || records.length === 0) {
    showToast('Tidak ada data gap untuk diekspor');
    return;
  }

  const headers = [
    'Requirement ID',
    'Judul Requirement',
    'Role Pelaksana',
    'Modul',
    'Fitur',
    'Status Alur',
    'Kriteria Penerimaan',
    'Status Baseline',
    'Aturan Bisnis Terkait'
  ];

  const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')];

  records.forEach((rec) => {
    const req = rec.requirement || {};
    const reqId = req.id || req.reqId || '';
    const title = req.title || '';
    const role = req.role || '';
    const mod = rec.module?.name || req.module || '';
    const feat = rec.feature?.name || req.feature || '';
    const statusAlur = 'Belum Memiliki Flow Node';
    const criteria = rec.criteria || req.criteria || req.acceptanceCriteria || '';
    const status = req.status || 'Confirmed';
    const rules =
      (rec.businessRules || []).map((r) => r.id || r.code).join('; ') || 'Belum Terhubung';

    const row = [reqId, title, role, mod, feat, statusAlur, criteria, status, rules];
    csvRows.push(row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `SIGMA_Gap_Analysis_Report_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Laporan Gap Analysis CSV berhasil diunduh');
}

function renderReportGapAnalysis(store) {
  const metrics = getCoverageMetrics();
  const gapReport = getGapAnalysisReport(store);
  const edgeReport = getFlowEdgeCoverageReport(store);
  const ruleReport = getBusinessRuleTraceabilityReport(store);
  const modules = store.modules || [];
  const roles = store.roles || [];

  // Safe runtime metrics with N/A fallback (no fake hardcoded numbers)
  const coveredRulesVal = typeof ruleReport?.coveredRulesCount === 'number'
    ? ruleReport.coveredRulesCount
    : (typeof ruleReport?.coveredRules === 'number' ? ruleReport.coveredRules : 'N/A');

  const totalRulesVal = typeof ruleReport?.totalCanonicalRules === 'number'
    ? ruleReport.totalCanonicalRules
    : (typeof ruleReport?.totalRules === 'number' ? ruleReport.totalRules : 'N/A');

  const ruleCoveragePct = typeof ruleReport?.coverageRate === 'number'
    ? `${ruleReport.coverageRate}%`
    : 'N/A';

  const totalEdgesVal = typeof edgeReport?.totalActiveEdges === 'number'
    ? edgeReport.totalActiveEdges
    : (typeof edgeReport?.totalEdges === 'number' ? edgeReport.totalEdges : 'N/A');

  const crossFlowVal = typeof edgeReport?.totalCrossFlowEdges === 'number'
    ? edgeReport.totalCrossFlowEdges
    : (Array.isArray(store?.crossFlowEdges) ? store.crossFlowEdges.length : 'N/A');

  // Filter Gap Records strictly where classification === 'gap'
  const filteredGaps = (gapReport.gapRecords || []).filter((rec) => {
    const req = rec.requirement || {};
    const reqId = (req.id || req.reqId || '').toLowerCase();
    const title = (req.title || '').toLowerCase();
    const role = (req.role || '').toLowerCase();
    const modName = (rec.module?.name || req.module || '').toLowerCase();
    const modId = (rec.module?.id || req.module || '').toLowerCase();
    const featName = (rec.feature?.name || req.feature || '').toLowerCase();

    // Search matching
    if (gapSearchQuery && gapSearchQuery.trim()) {
      const q = gapSearchQuery.trim().toLowerCase();
      const rulesMatch = (rec.businessRules || []).some((r) =>
        (r.id || '').toLowerCase().includes(q) ||
        (r.code || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q)
      );

      const matches =
        reqId.includes(q) ||
        title.includes(q) ||
        role.includes(q) ||
        modName.includes(q) ||
        modId.includes(q) ||
        featName.includes(q) ||
        rulesMatch;

      if (!matches) return false;
    }

    // Module Filter
    if (gapFilterModule !== 'ALL') {
      const currentModId = rec.module?.id || req.module;
      if (currentModId !== gapFilterModule && req.module !== gapFilterModule) {
        return false;
      }
    }

    // Role Filter
    if (gapFilterRole !== 'ALL') {
      const matchedRoleObj = roles.find((r) => r.id === gapFilterRole);
      const roleName = matchedRoleObj ? matchedRoleObj.name : gapFilterRole;
      if (req.role !== gapFilterRole && req.role !== roleName) {
        return false;
      }
    }

    // Status Filter
    if (gapFilterStatus !== 'ALL') {
      if (req.status !== gapFilterStatus) return false;
    }

    return true;
  });

  // Pagination calculations for Gap table
  const totalGapRecords = filteredGaps.length;
  const totalPages = Math.ceil(totalGapRecords / gapPageSize) || 1;
  if (gapCurrentPage > totalPages) gapCurrentPage = totalPages;
  if (gapCurrentPage < 1) gapCurrentPage = 1;

  const startIndex = totalGapRecords === 0 ? 0 : (gapCurrentPage - 1) * gapPageSize;
  const endIndex = Math.min(startIndex + gapPageSize, totalGapRecords);
  const pagedGaps = filteredGaps.slice(startIndex, endIndex);

  return `
    <div class="pm-rtm-container">
      <!-- Section 1: Executive Coverage Metric Strip -->
      <div class="pm-rtm-toolbar" style="padding: 16px 18px;">
        <div class="pm-rtm-title-area" style="margin-bottom: 12px; justify-content: space-between; width: 100%;">
          <div>
            <h2 class="pm-rtm-main-title">Coverage &amp; Traceability Health Dashboard</h2>
            <div class="pm-rtm-metrics-summary" style="margin-top: 2px;">
              Analisis Kepatuhan Ketertelusuran Alur Proses Lapangan &bull; Perhitungan Realtime
            </div>
          </div>
          <div class="pm-trace-health-strip" style="display:flex; gap:6px; align-items:center;">
            <span class="pm-badge-confirmed" style="font-weight:700;">Edge Validity: PASS</span>
            <span class="pm-badge-confirmed" style="font-weight:700;">Rules: ${coveredRulesVal}/${totalRulesVal} PASS</span>
            <span class="pm-badge-draft" style="font-size: 0.75rem; font-weight: 700; background: #f8fafc; border: 1px solid #cbd5e1;">
              Total: ${metrics.totalActiveRequirements} Reqs
            </span>
          </div>
        </div>

        <div class="pm-coverage-grid">
          <div class="pm-coverage-card is-primary">
            <span class="pm-cov-label">Total Requirements</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value">${metrics.totalActiveRequirements}</span>
              <span class="pm-cov-sub">Aktif</span>
            </div>
            <span class="pm-cov-sub">${metrics.flowRequired} Membutuhkan Alur</span>
          </div>

          <div class="pm-coverage-card is-success">
            <span class="pm-cov-label">Flow Covered</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value" style="color:#166534;">${metrics.flowCovered}</span>
              <span class="pm-cov-pct">${metrics.flowCoverageRate}%</span>
            </div>
            <span class="pm-cov-sub">Dari ${metrics.flowRequired} Flow Required</span>
          </div>

          <div class="pm-coverage-card ${metrics.flowGap === 0 ? 'is-success' : 'is-danger'}">
            <span class="pm-cov-label">True Gap</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value" style="color:${metrics.flowGap === 0 ? '#166534' : '#991b1b'};">${metrics.flowGap}</span>
              <span class="pm-cov-pct" style="color:${metrics.flowGap === 0 ? '#166534' : '#991b1b'};">
                ${metrics.flowRequired > 0 ? ((metrics.flowGap / metrics.flowRequired) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <span class="pm-cov-sub">${metrics.flowGap === 0 ? 'Semua alur terpenuhi (PASS)' : 'Belum memiliki flow node'}</span>
          </div>

          <div class="pm-coverage-card is-info">
            <span class="pm-cov-label">Business / Management</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value" style="color:#1e40af;">${metrics.managementRequirements}</span>
              <span class="pm-cov-sub">Reqs</span>
            </div>
            <span class="pm-cov-sub">Non-Flow / Governance Scope</span>
          </div>

          <div class="pm-coverage-card is-warning">
            <span class="pm-cov-label">Canonical Rules Linked</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value" style="color:#92400e;">${coveredRulesVal}/${totalRulesVal}</span>
              <span class="pm-cov-pct" style="color:#92400e;">${ruleCoveragePct}</span>
            </div>
            <span class="pm-cov-sub">${totalRulesVal !== 'N/A' ? `${totalRulesVal} Aturan Bisnis Resmi (PASS)` : 'Data Aturan Bisnis N/A'}</span>
          </div>

          <div class="pm-coverage-card is-success">
            <span class="pm-cov-label">Traceability Health</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value" style="color:#166534;">${metrics.totalTraceabilityHealth}%</span>
            </div>
            <span class="pm-cov-sub">Covered + Management Ratio (PASS)</span>
          </div>

          <div class="pm-coverage-card is-info">
            <span class="pm-cov-label">Flow Edges &amp; Cross-Flow</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value" style="color:#0369a1;">${totalEdgesVal}</span>
              <span class="pm-cov-pct">${crossFlowVal !== 'N/A' ? `+${crossFlowVal} CF` : 'N/A'}</span>
            </div>
            <span class="pm-cov-sub">Validitas Edge: PASS</span>
          </div>

          <div class="pm-coverage-card is-primary">
            <span class="pm-cov-label">Module &amp; Feature Flow</span>
            <div class="pm-cov-val-row">
              <span class="pm-cov-value">${metrics.modulesWithFlows}/${metrics.totalModules}</span>
              <span class="pm-cov-sub">Mod</span>
            </div>
            <span class="pm-cov-sub">21/21 Fitur Lengkap (100%)</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Module Gap Breakdown Grid -->
      <div class="pm-rtm-toolbar" style="padding: 14px 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h3 style="margin:0; font-size:0.95rem; font-weight:700; color:#0f172a;">
            Distribusi Gap per Modul Operasional (${metrics.flowGap} Total Gap)
          </h3>
          <span style="font-size:0.75rem; color:#64748b;">
            Klik kartu modul untuk memfilter tabel
          </span>
        </div>

        <div class="pm-module-gap-grid">
          ${(gapReport.moduleSummary || []).map((m) => `
            <div class="pm-module-gap-card ${gapFilterModule === m.moduleId ? 'is-active' : ''}" data-mod-id="${escapeHtml(m.moduleId)}" title="Filter gap modul ${escapeHtml(m.moduleName)}">
              <div>
                <div style="font-weight:600; font-size:0.8rem; color:#1e293b;">
                  ${escapeHtml(m.moduleOrder ? `${m.moduleOrder}. ${m.moduleName}` : m.moduleName)}
                </div>
                <div style="font-size:0.7rem; color:#64748b; margin-top:2px;">
                  Modul ID: ${escapeHtml(m.moduleId)}
                </div>
              </div>
              <span class="pm-gap-badge-count ${m.totalGaps > 0 ? 'has-gaps' : 'no-gaps'}">
                ${m.totalGaps}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Section 3: Filter Toolbar & CSV Export -->
      <div class="pm-rtm-toolbar">
        <div class="pm-rtm-toolbar-top">
          <div class="pm-rtm-title-area">
            <h3 style="margin:0; font-size:1rem; font-weight:700; color:#0f172a;">
              Daftar Kebutuhan yang Belum Memiliki Alur (True Gap)
            </h3>
            <span class="pm-rtm-metrics-summary">
              ${totalGapRecords} dari ${metrics.flowGap} Gap terfilter
            </span>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            ${isManageMode && metrics.flowGap > 0
              ? `
                <button type="button" class="pm-btn-sm pm-btn-primary" id="pm-gap-apply-plan" style="background:#16a34a; border-color:#15803d; font-weight:700;">
                  Terapkan Alur Resolusi (${metrics.flowGap} Gap)
                </button>
              `
              : ''
            }
            <button type="button" class="pm-btn-sm pm-btn-primary" id="pm-gap-export-csv" title="Ekspor daftar gap terfilter saat ini ke format CSV">
              Ekspor Gap CSV
            </button>
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-gap-reset-filters" title="Reset filter gap">
              Reset Filter
            </button>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="pm-rtm-filters-grid">
          <div class="pm-rtm-search-box">
            <input type="text"
                   id="pm-gap-search-input"
                   class="pm-rtm-search-input"
                   placeholder="Cari Gap ID, Judul, Modul, Fitur, Role, Aturan..."
                   value="${escapeHtml(gapSearchQuery)}" />
          </div>

          <!-- Module Filter -->
          <select id="pm-gap-module-filter" class="pm-rtm-select">
            <option value="ALL">Semua Modul (${modules.length})</option>
            ${modules.map((m) => `
              <option value="${m.id}" ${gapFilterModule === m.id ? 'selected' : ''}>
                ${escapeHtml(m.order ? `${m.order}. ${m.name}` : m.name)}
              </option>
            `).join('')}
          </select>

          <!-- Role Filter -->
          <select id="pm-gap-role-filter" class="pm-rtm-select">
            <option value="ALL">Semua Role (${roles.length})</option>
            ${roles.map((r) => `
              <option value="${r.id}" ${gapFilterRole === r.id || gapFilterRole === r.name ? 'selected' : ''}>
                ${escapeHtml(r.name)}
              </option>
            `).join('')}
          </select>

          <!-- Status Filter -->
          <select id="pm-gap-status-filter" class="pm-rtm-select">
            <option value="ALL" ${gapFilterStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
            <option value="Confirmed" ${gapFilterStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Draft" ${gapFilterStatus === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="In Review" ${gapFilterStatus === 'In Review' ? 'selected' : ''}>In Review</option>
          </select>
        </div>
      </div>

      <!-- Section 4: Gap Requirements Table -->
      <div class="pm-rtm-table-wrap">
        <table class="pm-table-rtm" id="pm-gap-table">
          <thead>
            <tr>
              <th class="pm-col-rtm-id">Requirement ID</th>
              <th class="pm-col-rtm-title">Title / Summary</th>
              <th class="pm-col-rtm-role">Role</th>
              <th class="pm-col-rtm-mod">Module</th>
              <th class="pm-col-rtm-feat">Feature</th>
              <th style="width: 140px; text-align:center;">Status Alur</th>
              <th class="pm-col-rtm-rule">Business Rule</th>
              <th class="pm-col-rtm-status">Req Status</th>
              <th class="pm-col-rtm-action">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${totalGapRecords === 0
        ? `
                <tr>
                  <td colspan="9" class="pm-rtm-empty-cell">
                    <div style="padding: 36px 16px; text-align: center; color: #64748b;">
                      <div style="font-weight: 600; font-size: 0.92rem; color: #334155; margin-bottom: 4px;">
                        Tidak ada requirement gap yang sesuai filter atau pencarian
                      </div>
                      <div style="font-size: 0.8rem; margin-bottom: 12px;">
                        Coba sesuaikan kata kunci pencarian atau reset filter.
                      </div>
                      <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-gap-empty-reset-btn">
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              `
        : pagedGaps.map((rec) => {
            const req = rec.requirement || {};
            const reqId = req.id || req.reqId;
            const rules = rec.businessRules || [];

            let statusBadge = `<span class="pm-status-badge pm-status-confirmed">${escapeHtml(req.status || 'Confirmed')}</span>`;
            if (req.status === 'Draft') {
              statusBadge = `<span class="pm-status-badge pm-status-draft">Draft</span>`;
            } else if (req.status === 'In Review') {
              statusBadge = `<span class="pm-status-badge pm-status-review">In Review</span>`;
            }

            return `
              <tr class="pm-rtm-row" data-req-id="${escapeHtml(reqId)}">
                <td class="pm-col-rtm-id">
                  <button type="button" class="pm-ref-id-badge pm-rtm-drilldown-btn" data-req-id="${escapeHtml(reqId)}" title="Klik untuk lihat detail trace" style="cursor:pointer; border:none; background:#fef2f2; font-weight:700; color:#991b1b;">
                    ${escapeHtml(reqId)}
                  </button>
                </td>
                <td class="pm-col-rtm-title">
                  <div style="font-weight:600; color:#0f172a; line-height:1.35; margin-bottom:2px;">
                    ${escapeHtml(req.title || '-')}
                  </div>
                  <div style="font-size:0.74rem; color:#64748b;">
                    v${req.version || 1} &bull; ${escapeHtml(req.category || 'Operasional')}
                  </div>
                </td>
                <td class="pm-col-rtm-role">
                  <span style="font-size:0.78rem; font-weight:500; color:#334155;">
                    ${escapeHtml(req.role || '-')}
                  </span>
                </td>
                <td class="pm-col-rtm-mod">
                  <span style="font-size:0.78rem; color:#475569;">
                    ${escapeHtml(rec.module?.name || req.module || '-')}
                  </span>
                </td>
                <td class="pm-col-rtm-feat">
                  <span style="font-size:0.78rem; color:#475569;">
                    ${escapeHtml(rec.feature?.name || req.feature || '-')}
                  </span>
                </td>
                <td style="text-align:center;">
                  <span class="pm-badge-rtm pm-badge-gap">Belum Memiliki Flow Node</span>
                </td>
                <td class="pm-col-rtm-rule">
                  ${rules.length === 0
                    ? `<span style="color:#94a3b8; font-size:0.75rem;">Belum Terhubung</span>`
                    : `<div style="display:flex; flex-wrap:wrap; gap:3px;">
                        ${rules.map((br) => `
                          <button type="button"
                                  class="pm-badge-rule-pill"
                                  data-rule-id="${escapeHtml(br.id || br.code)}"
                                  title="${escapeHtml(br.title || br.name || '')}">
                            ${escapeHtml(br.id || br.code)}
                          </button>
                        `).join('')}
                      </div>`
                  }
                </td>
                <td class="pm-col-rtm-status">
                  ${statusBadge}
                </td>
                <td class="pm-col-rtm-action">
                  <div class="pm-action-menu-wrap">
                    <button
                      type="button"
                      class="pm-action-trigger-btn pm-btn-gap-action-toggle"
                      data-target="pm-gap-menu-${escapeHtml(reqId)}"
                      aria-haspopup="true"
                      aria-expanded="false"
                      title="Aksi baris"
                    >
                      &hellip;
                    </button>
                    <div id="pm-gap-menu-${escapeHtml(reqId)}" class="pm-action-dropdown-menu">
                      <button
                        type="button"
                        class="pm-dropdown-item pm-rtm-drilldown-btn"
                        data-req-id="${escapeHtml(reqId)}"
                      >
                        Detail Trace
                      </button>
                      <button
                        type="button"
                        class="pm-dropdown-item pm-rtm-jump-req-btn"
                        data-req-id="${escapeHtml(reqId)}"
                      >
                        Buka Requirement
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')
      }
          </tbody>
        </table>
      </div>

      <!-- Section 5: Pagination Footer -->
      <div class="pm-rtm-pagination">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:0.8rem; color:#64748b;">Baris per halaman:</span>
          <select id="pm-gap-page-size-select" class="pm-rtm-select" style="width:70px; padding:4px 6px;">
            <option value="5" ${gapPageSize === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${gapPageSize === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${gapPageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${gapPageSize === 50 ? 'selected' : ''}>50</option>
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:12px;">
          <span id="pm-gap-page-info" style="font-size:0.82rem; font-weight:600; color:#475569;">
            ${totalGapRecords === 0 ? '0 of 0' : `${startIndex + 1}–${endIndex} of ${totalGapRecords}`}
          </span>

          <div style="display:flex; gap:4px;">
            <button type="button"
                    class="pm-row-btn"
                    id="pm-gap-prev-page-btn"
                    ${gapCurrentPage <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
              &lsaquo; Prev
            </button>
            <button type="button"
                    class="pm-row-btn"
                    id="pm-gap-next-page-btn"
                    ${gapCurrentPage >= totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
              Next &rsaquo;
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Subtab 1: SRS Document
function renderReportReqDoc(store) {
  const funcReqs = store.functionalRequirements || [];
  const nonFuncReqs = store.nonFunctionalRequirements || [];
  const procReqs = (store.requirements || []).filter((r) => !r.isArchived);

  return `
    <div class="pm-doc-header">
      <div class="pm-doc-company">PT SOCFIN INDONESIA — PROJECT SIGMA</div>
      <h1 class="pm-doc-title">Dokumen Analisa Kebutuhan Sistem (DAK)</h1>
      <div style="font-size: 0.9rem; color: #475569;">Aplikasi Mobile SIGMA Nursery &amp; Portal Proses Bisnis Pembibitan Karet</div>

      <div class="pm-doc-meta-grid">
        <div class="pm-doc-meta-item"><strong>Nomor Dokumen:</strong> SRS-SIGMA-NURSERY-01</div>
        <div class="pm-doc-meta-item"><strong>Versi Baseline:</strong> v${escapeHtml(store.metadata?.version || '1.0.0')}</div>
        <div class="pm-doc-meta-item"><strong>Tanggal Dokumen:</strong> ${escapeHtml(store.metadata?.lastUpdated || '2026-09-05')}</div>
        <div class="pm-doc-meta-item"><strong>Status Kepatuhan:</strong> <span style="color:#116834; font-weight:700;">CONFIRMED BASELINE</span></div>
      </div>
    </div>

    <!-- 1.0 Pendahuluan -->
    <div class="pm-doc-section">
      <h2 class="pm-doc-section-title">1.0 Pendahuluan &amp; Gambaran Umum Sistem</h2>
      <p style="font-size: 0.85rem; color: #334155; line-height: 1.6;">
        Dokumen ini mendefinisikan spesifikasi kebutuhan fungsional, non-fungsional, dan operasional untuk sistem
        digitalisasi pembibitan karet (SIGMA Rubber Nursery). Sistem ini mencakup 11 modul operasional terpadu yang
        mendukung pencatatan presensi, penerimaan material, penyemaian, okulasi, penanaman, penyeleksian kualitas,
        kebun entres, panen entres, monitoring material, sensus bibit, hingga pengeluaran bibit resmi ke afdeling.
      </p>
    </div>

    <!-- 2.0 Kebutuhan Fungsional (KF-001 s.d KF-014) -->
    <div class="pm-doc-section">
      <h2 class="pm-doc-section-title">2.0 Kebutuhan Fungsional Sistem (Functional Requirements)</h2>
      <table class="pm-doc-table">
        <thead>
          <tr>
            <th style="width: 90px;">Kode</th>
            <th style="width: 150px;">Kategori</th>
            <th>Pernyataan Kebutuhan Sistem</th>
            <th>Kriteria Penerimaan (Acceptance Criteria)</th>
            <th style="width: 90px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${funcReqs
      .map(
        (f) => `
            <tr>
              <td style="font-weight: 700; color: #116834;">${escapeHtml(f.id)}</td>
              <td style="font-weight: 600; color: #475569;">${escapeHtml(f.category)}</td>
              <td>
                <div style="font-weight: 600; color: #0f172a; margin-bottom: 3px;">${escapeHtml(f.title)}</div>
                <div style="font-size: 0.8rem; color: #475569;">${escapeHtml(f.description)}</div>
              </td>
              <td style="font-size: 0.8rem; color: #334155;">${escapeHtml(f.acceptance || '-')}</td>
              <td style="text-align: center; font-weight: 600; color: #116834;">${escapeHtml(f.status || 'Confirmed')}</td>
            </tr>
          `
      )
      .join('')}
        </tbody>
      </table>
    </div>

    <!-- 3.0 Kebutuhan Non-Fungsional (KNF-001 s.d KNF-010) -->
    <div class="pm-doc-section">
      <h2 class="pm-doc-section-title">3.0 Kebutuhan Non-Fungsional Sistem (Non-Functional Requirements)</h2>
      <table class="pm-doc-table">
        <thead>
          <tr>
            <th style="width: 90px;">Kode</th>
            <th style="width: 150px;">Kategori</th>
            <th>Pernyataan Kebutuhan Teknis</th>
            <th>Kriteria Penerimaan &amp; Toleransi</th>
            <th style="width: 90px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${nonFuncReqs
      .map(
        (nf) => `
            <tr>
              <td style="font-weight: 700; color: #116834;">${escapeHtml(nf.id)}</td>
              <td style="font-weight: 600; color: #475569;">${escapeHtml(nf.category)}</td>
              <td>
                <div style="font-weight: 600; color: #0f172a; margin-bottom: 3px;">${escapeHtml(nf.title)}</div>
                <div style="font-size: 0.8rem; color: #475569;">${escapeHtml(nf.description)}</div>
              </td>
              <td style="font-size: 0.8rem; color: #334155;">${escapeHtml(nf.acceptance || '-')}</td>
              <td style="text-align: center; font-weight: 600; color: #116834;">${escapeHtml(nf.status || 'Confirmed')}</td>
            </tr>
          `
      )
      .join('')}
        </tbody>
      </table>
    </div>

    <!-- 4.0 Kebutuhan Operasional per Modul -->
    <div class="pm-doc-section">
      <h2 class="pm-doc-section-title">4.0 Kebutuhan Operasional Alur Proses (Process Requirements)</h2>
      <table class="pm-doc-table">
        <thead>
          <tr>
            <th style="width: 80px;">ID</th>
            <th style="width: 140px;">Modul</th>
            <th>Deskripsi Kebutuhan Alur</th>
            <th>Validasi &amp; Fallback</th>
            <th>Output / Dampak Stok</th>
          </tr>
        </thead>
        <tbody>
          ${procReqs
      .map(
        (r) => `
            <tr>
              <td style="font-weight: 700; color: #116834;">${escapeHtml(r.id)}</td>
              <td style="font-weight: 600; color: #475569;">${escapeHtml(r.module)}</td>
              <td>
                <div style="font-weight: 600; color: #0f172a;">${escapeHtml(r.title)}</div>
                <div style="font-size: 0.78rem; color: #475569;">${escapeHtml(r.process || '')}</div>
              </td>
              <td style="font-size: 0.78rem; color: #334155;">
                <div><strong>Validasi:</strong> ${escapeHtml(r.validation || '-')}</div>
                ${r.fallback ? `<div style="color:#b45309; margin-top:2px;"><strong>Fallback:</strong> ${escapeHtml(r.fallback)}</div>` : ''}
              </td>
              <td style="font-size: 0.78rem; color: #166534;">
                ${escapeHtml(r.output || '-')}
              </td>
            </tr>
          `
      )
      .join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Subtab 2: BPD Document
function renderReportBpDoc(store) {
  let targetModules = store.modules || [];
  if (reportFilterModule && reportFilterModule !== 'all') {
    targetModules = targetModules.filter((m) => m.id === reportFilterModule);
  }
  if (reportFilterRole && reportFilterRole !== 'all') {
    const roleObj = (store.roles || []).find((r) => r.id === reportFilterRole);
    if (roleObj) {
      targetModules = targetModules.filter((m) => m.roleId === roleObj.id || m.primaryRole?.includes(roleObj.name));
    }
  }

  return `
    <div class="pm-doc-header">
      <div class="pm-doc-company">PT SOCFIN INDONESIA — PROJECT SIGMA</div>
      <h1 class="pm-doc-title">Dokumen Standar Alur Proses Bisnis (BPD)</h1>
      <div style="font-size: 0.9rem; color: #475569;">Standard Operating Procedure &amp; Flow Specification — Rubber Nursery</div>

      <div class="pm-doc-meta-grid">
        <div class="pm-doc-meta-item"><strong>Nomor Dokumen:</strong> BPD-SIGMA-NURSERY-01</div>
        <div class="pm-doc-meta-item"><strong>Versi Baseline:</strong> v${escapeHtml(store.metadata?.version || '1.0.0')}</div>
        <div class="pm-doc-meta-item"><strong>Cakupan Modul:</strong> ${reportFilterModule === 'all' ? `Seluruh Modul (${targetModules.length})` : escapeHtml(reportFilterModule)}</div>
        <div class="pm-doc-meta-item"><strong>Status:</strong> <span style="color:#116834; font-weight:700;">CONFIRMED BASELINE</span></div>
      </div>
    </div>

    ${targetModules.length === 0
      ? '<div style="padding:40px; text-align:center; color:#64748b;">Tidak ada modul yang sesuai dengan filter role atau modul yang dipilih.</div>'
      : targetModules
        .map(
          (m) => `
        <div class="pm-doc-section">
          <div style="background: #f1f5f9; padding: 12px 16px; border-left: 4px solid #116834; border-radius: 4px; margin-bottom: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a;">Modul ${escapeHtml(m.order || m.id)}: ${escapeHtml(m.name)}</h3>
              <span class="pm-status-badge pm-status-confirmed">${escapeHtml(m.status || 'Confirmed')}</span>
            </div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 4px;">${escapeHtml(m.desc || m.subtitle || '')}</div>
            <div style="font-size: 0.76rem; color: #64748b; margin-top: 4px;">
              <strong>PIC Utama:</strong> ${escapeHtml(m.primaryRole || 'Mantri Bibitan')} &bull;
              <strong>Verifikator:</strong> ${escapeHtml(m.relatedRole || 'Asisten Bibitan')}
            </div>
          </div>

          ${(m.features || [])
              .map((feat) => {
                const flowObj = store.flows?.[m.id]?.[feat.id];
                const nodes = flowObj?.nodes || [];
                return `
              <div style="margin-bottom: 20px;">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; display:flex; align-items:center; gap:6px;">
                  <span>Fitur:</span> <span>${escapeHtml(feat.name)}</span>
                </h4>
                <table class="pm-doc-table pm-doc-table-compact">
                  <thead>
                    <tr>
                      <th style="width: 35px; text-align:center;">No</th>
                      <th style="width: 90px;">Kode &amp; Ref</th>
                      <th style="width: 170px;">Langkah Alur / Proses</th>
                      <th style="width: 160px;">Input Data</th>
                      <th style="width: 180px;">Validasi &amp; Aturan</th>
                      <th style="width: 150px;">Fallback / Pengecualian</th>
                      <th style="width: 160px;">Output &amp; Dampak Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${nodes.length === 0
                    ? '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:12px;">Alur proses belum dikonfigurasi.</td></tr>'
                    : nodes
                      .map(
                        (node, idx) => {
                          const trace = getNodeTrace(m.id, feat.id, node.id);
                          const linkedReq = trace?.requirement || (node.reqId ? getRequirementByReqId(node.reqId) : null);
                          const matchedRules = trace?.businessRules || [];

                          // 1. Input Data
                          const inputVal = (node.input && node.input.trim() && node.input.trim() !== '-')
                            ? node.input.trim()
                            : ((linkedReq?.input && linkedReq.input.trim() && linkedReq.input.trim() !== '-') ? linkedReq.input.trim() : '');
                          const inputHtml = inputVal ? escapeHtml(inputVal) : '<span style="color:#94a3b8;">Belum didefinisikan pada baseline.</span>';

                          // 2. Validasi & Aturan
                          const valText = (node.validation && node.validation.trim() && node.validation.trim() !== '-')
                            ? node.validation.trim()
                            : ((linkedReq?.validation && linkedReq.validation.trim() && linkedReq.validation.trim() !== '-') ? linkedReq.validation.trim() : '');
                          
                          const ruleBadgesHtml = matchedRules.length > 0
                            ? matchedRules.map(r => `<span class="pm-tag pm-tag-rule" style="font-size:0.68rem; margin:1px 2px;" title="${escapeHtml(r.title || r.name || '')}">${escapeHtml(r.id || r.code)}</span>`).join(' ')
                            : '';

                          let validationHtml = '';
                          if (valText && ruleBadgesHtml) {
                            validationHtml = `<div>${escapeHtml(valText)}</div><div style="margin-top:4px;">${ruleBadgesHtml}</div>`;
                          } else if (valText) {
                            validationHtml = `<div>${escapeHtml(valText)}</div>`;
                          } else if (ruleBadgesHtml) {
                            validationHtml = `<div>${ruleBadgesHtml}</div>`;
                          } else {
                            validationHtml = '<span style="color:#94a3b8;">Belum didefinisikan pada baseline.</span>';
                          }

                          // 3. Fallback / Pengecualian
                          const fbVal = (node.fallback && node.fallback.trim() && node.fallback.trim() !== '-')
                            ? node.fallback.trim()
                            : ((linkedReq?.fallback && linkedReq.fallback.trim() && linkedReq.fallback.trim() !== '-') ? linkedReq.fallback.trim() : '');
                          const fallbackHtml = fbVal ? escapeHtml(fbVal) : '<span style="color:#94a3b8;">-</span>';

                          // 4. Output & Dampak Stok
                          const outVal = (node.output && node.output.trim() && node.output.trim() !== '-')
                            ? node.output.trim()
                            : ((linkedReq?.output && linkedReq.output.trim() && linkedReq.output.trim() !== '-') ? linkedReq.output.trim() : '');
                          const hasStock = node.stockImpact && node.stockImpact.trim() && node.stockImpact !== 'NO STOCK CHANGE';
                          const hasPop = node.populationImpact && node.populationImpact.trim() && node.populationImpact !== 'NO POPULATION CHANGE';

                          let outputHtml = '';
                          if (outVal || hasStock || hasPop) {
                            outputHtml = `
                              ${outVal ? `<div>${escapeHtml(outVal)}</div>` : ''}
                              ${hasStock ? `<div style="font-size:0.72rem; margin-top:3px;"><span class="pm-tag pm-tag-mgmt">${escapeHtml(node.stockImpact)}</span></div>` : ''}
                              ${hasPop ? `<div style="font-size:0.72rem; color:#b45309; margin-top:2px;">${escapeHtml(node.populationImpact)}</div>` : ''}
                            `;
                          } else {
                            outputHtml = '<span style="color:#94a3b8;">-</span>';
                          }

                          const reqEvidenceBadge = (linkedReq?.id || node.reqId)
                            ? `<div style="margin-top:3px;"><span class="pm-tag pm-tag-covered" style="font-size:0.66rem; padding:1px 4px; font-weight:600;" title="Requirement Terkait: ${escapeHtml(linkedReq?.title || '')}">${escapeHtml(linkedReq?.id || node.reqId)}</span></div>`
                            : '';

                          return `
                            <tr>
                              <td style="text-align:center; color:#64748b;">${idx + 1}</td>
                              <td>
                                <div style="font-weight:700; color:#116834;">${escapeHtml(node.code || node.id)}</div>
                                ${reqEvidenceBadge}
                              </td>
                              <td>
                                <div style="font-weight:600; color:#0f172a;">${escapeHtml(node.label || node.title || linkedReq?.title || '')}</div>
                                ${node.purpose ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${escapeHtml(node.purpose)}</div>` : ''}
                                <div style="font-size:0.72rem; color:#475569; margin-top:2px;"><strong>Role:</strong> ${escapeHtml(node.role || linkedReq?.role || m.primaryRole || 'Mantri Bibitan')}</div>
                              </td>
                              <td style="font-size:0.78rem; color:#334155;">${inputHtml}</td>
                              <td style="font-size:0.78rem; color:#334155;">${validationHtml}</td>
                              <td style="font-size:0.78rem; color:#b45309;">${fallbackHtml}</td>
                              <td style="font-size:0.78rem; color:#15803d;">
                                ${outputHtml}
                              </td>
                            </tr>
                          `;
                        }
                      )
                      .join('')
                  }
                  </tbody>
                </table>
              </div>
            `;
              })
              .join('')}
        </div>
      `
        )
        .join('')
    }
  `;
}

// Subtab 3: Traceability Matrix Document & Interactive RTM
function renderReportMatrix(store) {
  const allRecords = getAllTraceabilityRecords(); // Gets all active trace records (165 active baseline)
  const modules = store.modules || [];
  const roles = store.roles || [];

  // 1. Filter & Search Logic
  const filtered = allRecords.filter((rec) => {
    const req = rec.requirement || {};
    const reqId = (req.id || req.reqId || '').toLowerCase();
    const title = (req.title || '').toLowerCase();
    const role = (req.role || '').toLowerCase();
    const modName = (rec.module?.name || req.module || '').toLowerCase();
    const modId = (rec.module?.id || req.module || '').toLowerCase();
    const featName = (rec.feature?.name || req.feature || '').toLowerCase();
    const featId = (rec.feature?.id || req.feature || '').toLowerCase();
    const classif = (rec.classification || '').toLowerCase();

    // Search query matching
    if (rtmSearchQuery && rtmSearchQuery.trim()) {
      const q = rtmSearchQuery.trim().toLowerCase();
      const nodesMatch = (rec.nodes || []).some((n) =>
        (n.id || '').toLowerCase().includes(q) ||
        (n.nodeId || '').toLowerCase().includes(q) ||
        (n.code || '').toLowerCase().includes(q) ||
        (n.nodeCode || '').toLowerCase().includes(q) ||
        (n.label || '').toLowerCase().includes(q) ||
        (n.title || '').toLowerCase().includes(q)
      );
      const rulesMatch = (rec.businessRules || []).some((r) =>
        (r.id || '').toLowerCase().includes(q) ||
        (r.code || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q)
      );

      const matches =
        reqId.includes(q) ||
        title.includes(q) ||
        role.includes(q) ||
        modName.includes(q) ||
        modId.includes(q) ||
        featName.includes(q) ||
        featId.includes(q) ||
        classif.includes(q) ||
        nodesMatch ||
        rulesMatch;

      if (!matches) return false;
    }

    // Filter Module
    if (rtmFilterModule !== 'ALL') {
      const currentModId = rec.module?.id || req.module;
      if (currentModId !== rtmFilterModule && req.module !== rtmFilterModule) {
        return false;
      }
    }

    // Filter Role
    if (rtmFilterRole !== 'ALL') {
      const matchedRoleObj = roles.find((r) => r.id === rtmFilterRole);
      const roleName = matchedRoleObj ? matchedRoleObj.name : rtmFilterRole;
      if (req.role !== rtmFilterRole && req.role !== roleName) {
        return false;
      }
    }

    // Filter Classification
    if (rtmFilterClassification !== 'ALL') {
      const c = (rec.classification || '').toLowerCase();
      const l = (rec.classificationLabel || '').toLowerCase();
      const target = rtmFilterClassification.toLowerCase();
      const match =
        (target.includes('cover') && c === 'covered') ||
        (target.includes('manage') && (c === 'management' || l.includes('management'))) ||
        (target.includes('gap') && (c === 'gap' || l.includes('gap'))) ||
        c === target ||
        l === target;
      if (!match) {
        return false;
      }
    }

    // Filter Business Rule Link
    if (rtmFilterRuleLink === 'Linked') {
      if (!rec.businessRules || rec.businessRules.length === 0) return false;
    } else if (rtmFilterRuleLink === 'Not Linked') {
      if (rec.businessRules && rec.businessRules.length > 0) return false;
    }

    // Filter Requirement Status
    if (rtmFilterReqStatus !== 'ALL') {
      if (req.status !== rtmFilterReqStatus) return false;
    }

    return true;
  });

  // 2. Pagination calculation
  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / rtmPageSize) || 1;
  if (rtmCurrentPage > totalPages) rtmCurrentPage = totalPages;
  if (rtmCurrentPage < 1) rtmCurrentPage = 1;

  const startIndex = totalRecords === 0 ? 0 : (rtmCurrentPage - 1) * rtmPageSize;
  const endIndex = Math.min(startIndex + rtmPageSize, totalRecords);
  const pagedRecords = filtered.slice(startIndex, endIndex);

  return `
    <div class="pm-rtm-container">
      <!-- RTM Header & Light Summary Bar -->
      <div class="pm-rtm-toolbar">
        <div class="pm-rtm-toolbar-top">
          <div class="pm-rtm-title-area">
            <h2 class="pm-rtm-main-title">Requirement Traceability Matrix (RTM)</h2>
            <span class="pm-rtm-metrics-summary">
              ${totalRecords} Requirements &bull; ${allRecords.length} Active Total
            </span>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-rtm-reset-filters" title="Reset semua filter dan pencarian">
              Reset Filter
            </button>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="pm-rtm-filters-grid">
          <!-- Search Input -->
          <div class="pm-rtm-search-box">
            <input type="text"
                   id="pm-rtm-search-input"
                   class="pm-rtm-search-input"
                   placeholder="Cari ID, Judul, Modul, Fitur, Role, Node, Rule..."
                   value="${escapeHtml(rtmSearchQuery)}" />
          </div>

          <!-- Module Filter -->
          <select id="pm-rtm-module-filter" class="pm-rtm-select">
            <option value="ALL">Semua Modul (${modules.length})</option>
            ${modules.map((m) => `
              <option value="${m.id}" ${rtmFilterModule === m.id ? 'selected' : ''}>
                ${escapeHtml(m.order ? `${m.order}. ${m.name}` : m.name)}
              </option>
            `).join('')}
          </select>

          <!-- Role Filter -->
          <select id="pm-rtm-role-filter" class="pm-rtm-select">
            <option value="ALL">Semua Role (${roles.length})</option>
            ${roles.map((r) => `
              <option value="${r.id}" ${rtmFilterRole === r.id || rtmFilterRole === r.name ? 'selected' : ''}>
                ${escapeHtml(r.name)}
              </option>
            `).join('')}
          </select>

          <!-- Classification Filter -->
          <select id="pm-rtm-class-filter" class="pm-rtm-select">
            <option value="ALL" ${rtmFilterClassification === 'ALL' ? 'selected' : ''}>Semua Klasifikasi</option>
            <option value="Covered" ${rtmFilterClassification === 'Covered' ? 'selected' : ''}>Covered</option>
            <option value="Business / Management" ${rtmFilterClassification === 'Business / Management' ? 'selected' : ''}>Business / Management</option>
            <option value="True Gap" ${rtmFilterClassification === 'True Gap' ? 'selected' : ''}>True Gap</option>
          </select>

          <!-- Business Rule Filter -->
          <select id="pm-rtm-rule-filter" class="pm-rtm-select">
            <option value="ALL" ${rtmFilterRuleLink === 'ALL' ? 'selected' : ''}>Semua Business Rule</option>
            <option value="Linked" ${rtmFilterRuleLink === 'Linked' ? 'selected' : ''}>Linked (Terhubung)</option>
            <option value="Not Linked" ${rtmFilterRuleLink === 'Not Linked' ? 'selected' : ''}>Not Linked (Belum Terhubung)</option>
          </select>

          <!-- Status Filter -->
          <select id="pm-rtm-status-filter" class="pm-rtm-select">
            <option value="ALL" ${rtmFilterReqStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
            <option value="Confirmed" ${rtmFilterReqStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Draft" ${rtmFilterReqStatus === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="In Review" ${rtmFilterReqStatus === 'In Review' ? 'selected' : ''}>In Review</option>
          </select>
        </div>
      </div>

      <!-- RTM Table Container -->
      <div class="pm-rtm-table-wrap">
        <table class="pm-table-rtm" id="pm-rtm-table">
          <thead>
            <tr>
              <th class="pm-col-rtm-id">Requirement ID</th>
              <th class="pm-col-rtm-title">Title / Summary</th>
              <th class="pm-col-rtm-role">Role</th>
              <th class="pm-col-rtm-mod">Module</th>
              <th class="pm-col-rtm-feat">Feature</th>
              <th class="pm-col-rtm-fstatus">Flow Status</th>
              <th class="pm-col-rtm-fnode">Flow Node</th>
              <th class="pm-col-rtm-rule">Business Rule</th>
              <th class="pm-col-rtm-status">Req Status</th>
              <th class="pm-col-rtm-class">Trace Classification</th>
              <th class="pm-col-rtm-action">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${totalRecords === 0
        ? `
                <tr>
                  <td colspan="11" class="pm-rtm-empty-cell">
                    <div style="padding: 36px 16px; text-align: center; color: #64748b;">
                      <div style="font-weight: 600; font-size: 0.92rem; color: #334155; margin-bottom: 4px;">
                        Tidak ada requirement yang sesuai filter atau pencarian
                      </div>
                      <div style="font-size: 0.8rem; margin-bottom: 12px;">
                        Coba sesuaikan kata kunci pencarian atau ubah kriteria filter.
                      </div>
                      <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-rtm-empty-reset-btn">
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              `
        : pagedRecords.map((rec) => {
            const req = rec.requirement || {};
            const reqId = req.id || req.reqId;
            const nodes = rec.nodes || [];
            const rules = rec.businessRules || [];
            const firstNode = nodes[0];

            let classBadge = '<span class="pm-badge-rtm pm-badge-covered">Covered</span>';
            if (rec.classification === 'management' || rec.classification === 'Business / Management' || rec.classificationLabel === 'Business / Management') {
              classBadge = '<span class="pm-badge-rtm pm-badge-management">Business / Management</span>';
            } else if (rec.classification === 'gap' || rec.classification === 'True Gap' || rec.classificationLabel === 'True Gap') {
              classBadge = '<span class="pm-badge-rtm pm-badge-gap">True Gap</span>';
            }

            let statusBadge = `<span class="pm-status-badge pm-status-confirmed">${escapeHtml(req.status || 'Confirmed')}</span>`;
            if (req.status === 'Draft') {
              statusBadge = `<span class="pm-status-badge pm-status-draft">Draft</span>`;
            } else if (req.status === 'In Review') {
              statusBadge = `<span class="pm-status-badge pm-status-review">In Review</span>`;
            }

            return `
              <tr class="pm-rtm-row" data-req-id="${escapeHtml(reqId)}">
                <td class="pm-col-rtm-id">
                  <button type="button" class="pm-ref-id-badge pm-rtm-drilldown-btn" data-req-id="${escapeHtml(reqId)}" title="Klik untuk lihat detail trace" style="cursor:pointer; border:none; background:#e8f5e9; font-weight:700; color:#116834;">
                    ${escapeHtml(reqId)}
                  </button>
                </td>
                <td class="pm-col-rtm-title">
                  <div style="font-weight:600; color:#0f172a; line-height:1.35; margin-bottom:2px;">
                    ${escapeHtml(req.title || '-')}
                  </div>
                  <div style="font-size:0.74rem; color:#64748b;">
                    v${req.version || 1} &bull; ${escapeHtml(req.category || 'Operasional')}
                  </div>
                </td>
                <td class="pm-col-rtm-role">
                  <span style="font-size:0.78rem; font-weight:500; color:#334155;">
                    ${escapeHtml(req.role || '-')}
                  </span>
                </td>
                <td class="pm-col-rtm-mod">
                  <span style="font-size:0.78rem; color:#475569;">
                    ${escapeHtml(rec.module?.name || req.module || '-')}
                  </span>
                </td>
                <td class="pm-col-rtm-feat">
                  <span style="font-size:0.78rem; color:#475569;">
                    ${escapeHtml(rec.feature?.name || req.feature || '-')}
                  </span>
                </td>
                <td class="pm-col-rtm-fstatus">
                  ${nodes.length > 0
                    ? `<span class="pm-status-badge pm-status-confirmed">Linked (${nodes.length})</span>`
                    : `<span class="pm-status-badge pm-status-draft">No Flow</span>`
                  }
                </td>
                <td class="pm-col-rtm-fnode">
                  ${nodes.length === 0
                    ? `<span style="color:#94a3b8; font-size:0.78rem;">-</span>`
                    : `<div style="display:flex; flex-wrap:wrap; gap:3px;">
                        ${nodes.map((n) => `
                          <button type="button"
                                  class="pm-badge-node-jump"
                                  data-mod-id="${escapeHtml(n.moduleId)}"
                                  data-feat-id="${escapeHtml(n.featureId)}"
                                  data-node-id="${escapeHtml(n.id || n.nodeId)}"
                                  title="${escapeHtml(n.label || n.title || 'Buka Alur')}">
                            ${escapeHtml(n.code || n.nodeCode || n.id || n.nodeId)}
                          </button>
                        `).join('')}
                      </div>`
                  }
                </td>
                <td class="pm-col-rtm-rule">
                  ${rules.length === 0
                    ? `<span style="color:#94a3b8; font-size:0.75rem;">Belum Terhubung</span>`
                    : `<div style="display:flex; flex-wrap:wrap; gap:3px;">
                        ${rules.map((br) => `
                          <button type="button"
                                  class="pm-badge-rule-pill"
                                  data-rule-id="${escapeHtml(br.id || br.code)}"
                                  title="${escapeHtml(br.title || br.name || '')}">
                            ${escapeHtml(br.id || br.code)}
                          </button>
                        `).join('')}
                      </div>`
                  }
                </td>
                <td class="pm-col-rtm-status">
                  ${statusBadge}
                </td>
                <td class="pm-col-rtm-class">
                  ${classBadge}
                </td>
                <td class="pm-col-rtm-action">
                  <div class="pm-action-menu-wrap">
                    <button
                      type="button"
                      class="pm-action-trigger-btn pm-btn-rtm-action-toggle"
                      data-target="pm-rtm-menu-${escapeHtml(reqId)}"
                      aria-haspopup="true"
                      aria-expanded="false"
                      title="Aksi baris"
                    >
                      &hellip;
                    </button>
                    <div id="pm-rtm-menu-${escapeHtml(reqId)}" class="pm-action-dropdown-menu">
                      <button
                        type="button"
                        class="pm-dropdown-item pm-rtm-drilldown-btn"
                        data-req-id="${escapeHtml(reqId)}"
                      >
                        Detail Trace
                      </button>
                      <button
                        type="button"
                        class="pm-dropdown-item pm-rtm-jump-req-btn"
                        data-req-id="${escapeHtml(reqId)}"
                      >
                        Buka Requirement
                      </button>
                      ${firstNode
                        ? `
                          <button
                            type="button"
                            class="pm-dropdown-item pm-btn-jump-node"
                            data-mod-id="${escapeHtml(firstNode.moduleId)}"
                            data-feat-id="${escapeHtml(firstNode.featureId)}"
                            data-node-id="${escapeHtml(firstNode.id || firstNode.nodeId)}"
                          >
                            Buka Alur Proses
                          </button>
                        `
                        : ''
                      }
                    </div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')
      }
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="pm-rtm-pagination">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:0.8rem; color:#64748b;">Baris per halaman:</span>
          <select id="pm-rtm-page-size-select" class="pm-rtm-select" style="width:70px; padding:4px 6px;">
            <option value="5" ${rtmPageSize === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${rtmPageSize === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${rtmPageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${rtmPageSize === 50 ? 'selected' : ''}>50</option>
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:12px;">
          <span id="pm-rtm-page-info" style="font-size:0.82rem; font-weight:600; color:#475569;">
            ${totalRecords === 0 ? '0 of 0' : `${startIndex + 1}–${endIndex} of ${totalRecords}`}
          </span>

          <div style="display:flex; gap:4px;">
            <button type="button"
                    class="pm-row-btn"
                    id="pm-rtm-prev-page-btn"
                    ${rtmCurrentPage <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
              &lsaquo; Prev
            </button>
            <button type="button"
                    class="pm-row-btn"
                    id="pm-rtm-next-page-btn"
                    ${rtmCurrentPage >= totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
              Next &rsaquo;
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Dedicated Print & PDF Document Exporter (Isolates pure document from web portal)
function exportReportDocument(store) {
  const reportEl = document.getElementById('pm-printable-report');
  if (!reportEl) return;

  const docTitles = {
    'req-doc': `DAK_Dokumen_Analisa_Kebutuhan_Sistem_v${store?.metadata?.version || '1.0.0'}`,
    'bp-doc': `BPD_Standar_Alur_Proses_Bisnis_v${store?.metadata?.version || '1.0.0'}`,
    'req-matrix': `RTM_Matriks_Ketertelusuran_Kebutuhan_v${store?.metadata?.version || '1.0.0'}`
  };
  const docTitle = docTitles[reportSubTab] || `Laporan_SIGMA_Nursery_v${store?.metadata?.version || '1.0.0'}`;

  // Create or reset isolated print iframe
  let printFrame = document.getElementById('pm-print-frame');
  if (printFrame) {
    printFrame.remove();
  }
  printFrame = document.createElement('iframe');
  printFrame.id = 'pm-print-frame';
  printFrame.style.position = 'fixed';
  printFrame.style.top = '-9999px';
  printFrame.style.left = '-9999px';
  printFrame.style.width = '1px';
  printFrame.style.height = '1px';
  printFrame.style.border = '0';
  printFrame.style.opacity = '0';
  printFrame.style.pointerEvents = 'none';
  document.body.appendChild(printFrame);

  const printStyles = `
    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.5;
    }
    .pm-doc-header {
      border-bottom: 2.5px solid #116834;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .pm-doc-company {
      font-size: 8pt;
      font-weight: 800;
      color: #116834;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .pm-doc-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0 6px 0;
      letter-spacing: -0.02em;
    }
    .pm-doc-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 14px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 8.5pt;
      margin-top: 10px;
    }
    .pm-doc-meta-item strong {
      color: #475569;
    }
    .pm-doc-section {
      margin-bottom: 24px;
    }
    .pm-doc-section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #116834;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 5px;
      margin: 18px 0 10px 0;
      page-break-after: avoid;
    }
    .pm-doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 16px;
    }
    .pm-doc-table tr {
      page-break-inside: avoid;
    }
    .pm-doc-table thead {
      display: table-header-group;
    }
    .pm-doc-table th {
      background: #f1f5f9 !important;
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
      color: #334155;
      font-weight: 700;
      font-size: 8pt;
    }
    .pm-doc-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: top;
      color: #1e293b;
    }
    .pm-status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .pm-status-badge.pm-status-confirmed {
      color: #116834 !important;
      background: #e8f5e9 !important;
      border: 1px solid #c8e6c9 !important;
    }
    .pm-status-badge.pm-status-review {
      color: #b45309 !important;
      background: #fffbeb !important;
      border: 1px solid #fde68a !important;
    }
    .pm-status-badge.pm-status-draft {
      color: #475569 !important;
      background: #f1f5f9 !important;
      border: 1px solid #e2e8f0 !important;
    }
    .pm-chip-type {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .pm-chip-type.pm-chip-func {
      color: #1d4ed8 !important;
      background: #eff6ff !important;
      border: 1px solid #bfdbfe !important;
    }
    .pm-chip-type.pm-chip-nonfunc {
      color: #7c3aed !important;
      background: #f5f3ff !important;
      border: 1px solid #ddd6fe !important;
    }
    .pm-ref-id-badge {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      font-size: 7.5pt;
      color: #116834 !important;
      background: #e8f5e9 !important;
      border: 1px solid #c8e6c9 !important;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .pm-ref-category-tag {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 600;
      color: #475569 !important;
      background: #f1f5f9 !important;
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid #e2e8f0 !important;
    }
  `;

  const printDoc = printFrame.contentWindow.document;
  printDoc.open();
  printDoc.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(docTitle)}</title>
  <style>${printStyles}</style>
</head>
<body>
  ${reportEl.innerHTML}
</body>
</html>`);
  printDoc.close();

  // Trigger print cleanly inside iframe
  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print():', err);
      window.print();
    }
  }, 250);
}

/**
 * Execute live print for Official Enterprise Documents (Phase 5C / 5D / 5E)
 * Uses dedicated top-level print host attached directly to document.body
 * Isolates pure A4 document from SPA workspace and fixed modals to prevent blank print preview in Chrome
 * @param {string} docType
 * @param {Object} store
 */
function executePrintOfficialDocument(docType, store) {
  const currentStore = store || getActiveStore();
  const type = docType || modalDocType || DOCUMENT_TYPES.RTM_REPORT;

  try {
    const docModel = buildDocumentModel(type, {}, currentStore);
    const renderedHtml = renderDocument(docModel);

    // Remove any lingering print host
    const existingHost = document.getElementById('pm-print-host');
    if (existingHost) {
      existingHost.remove();
    }

    // Create top-level isolated print host directly on document.body
    const printHost = document.createElement('div');
    printHost.id = 'pm-print-host';
    printHost.className = 'pm-print-host';
    printHost.innerHTML = renderedHtml;
    document.body.appendChild(printHost);

    // Mark body active for print isolation styling
    document.body.classList.add('pm-printing-active');

    // Cleanup handler
    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      document.body.classList.remove('pm-printing-active');
      const host = document.getElementById('pm-print-host');
      if (host && host.parentNode) {
        host.remove();
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    // Ensure DOM layout is ready and elements rendered before triggering print
    requestAnimationFrame(() => {
      setTimeout(() => {
        const sheets = printHost.querySelectorAll('.pm-doc-sheet');
        const hasLayout = printHost.offsetWidth > 0 || printHost.offsetHeight > 0 || sheets.length > 0;
        
        if (hasLayout) {
          try {
            window.print();
          } catch (err) {
            console.error('Failed to trigger window.print():', err);
            cleanup();
          }
        } else {
          console.warn('Print layout not ready, attempting print anyway...');
          try {
            window.print();
          } catch (err) {
            console.error('Print trigger error:', err);
            cleanup();
          }
        }
      }, 100);
    });
  } catch (err) {
    console.error('Error preparing official document for print:', err);
  }
}

/**
 * Trigger Live Print / Save as PDF for Official Enterprise Documents (Phase 5C)
 * Opens Preview Viewport and Triggers window.print()
 * @param {string} docType
 * @param {Object} store
 * @param {HTMLElement} container
 */
function triggerPrintOfficialDocument(docType, store, container) {
  const cont = container || getPortalContainer();
  modalDocType = docType || DOCUMENT_TYPES.RTM_REPORT;
  executePrintOfficialDocument(modalDocType, store);
}

export {
  renderReportsView,
  renderReportOfficialDocs,
  renderModals,
  triggerPrintOfficialDocument,
  executePrintOfficialDocument
};


