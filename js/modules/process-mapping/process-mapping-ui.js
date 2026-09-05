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
  addFlowNode,
  editFlowNode,
  reorderFlowNode,
  archiveFlowNode,
  exportProjectDataFile,
  previewImportProjectData,
  applyImportedProjectData,
  updateMetadata
} from './process-mapping-data.js';

// Global UI State
let isManageMode = false;
let currentRole = 'mantri-bibitan';
let currentModuleId = 'ALL'; // 'ALL' | '01-presensi' | ... | '11-pengeluaran'
let currentFeatureId = 'grafting';
let currentViewTab = 'flow'; // 'flow' | 'requirement' | 'business-rule' | 'related-role' | 'end-to-end'
let selectedNodeId = 'N_P002'; // default: Scan QR Batch
let selectedModuleId = '04-okulasi'; // the module of selected node
let isDetailOpen = true;
let zoomScale = 1.0;
let searchQuery = '';

// Portal Navigation State ('dashboard' | 'mapping' | 'reference' | 'reports')
let currentNavTab = 'mapping';

// Reference Filter State
let refFilterType = 'all'; // 'all' | 'functional' | 'non-functional'
let refFilterCategory = 'all';
let refFilterStatus = 'all';
let refSearchQuery = '';

// Reports State
let reportSubTab = 'req-doc'; // 'req-doc' | 'bp-doc' | 'req-matrix'
let reportFilterRole = 'all';
let reportFilterModule = 'all';
let reportFilterStatus = 'all';

// Active Modals State
let activeModal = null; // null | 'edit-req' | 'edit-node' | 'export' | 'import' | 'reset'
let modalData = null;
let toastMessage = null;
let toastTimer = null;

window.handleMermaidClick = function (nodeId) {
  const event = new CustomEvent('pm-mermaid-click', { detail: { nodeId } });
  window.dispatchEvent(event);
};

function generateMermaidSyntax(activeNodes) {
  let str = 'graph TD\n';
  if (!activeNodes || activeNodes.length === 0) return 'graph TD\n  Empty["Belum ada node"]';

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
  return str;
}

/**
 * Main Portal Render Entrypoint
 */
export async function renderProcessMappingPortal(container) {
  if (!container) return;

  // Initialize store if not ready
  let store;
  try {
    store = getActiveStore();
  } catch (err) {
    container.innerHTML = '<div style="padding: 48px; text-align: center; color: #64748b; font-size: 0.95rem;">🌿 Memuat data resmi proses bisnis pembibitan...</div>';
    store = await initProjectDataStore();
  }

  // Detect Customer Mode from URL parameter (?mode=customer)
  const urlParams = new URLSearchParams(window.location.search);
  const isCustomerMode = urlParams.get('mode') === 'customer';
  if (isCustomerMode) {
    isManageMode = false;
  }

  const roleObj = store.roles.find((r) => r.id === currentRole) || store.roles[0];
  const isMantri = currentRole === 'mantri-bibitan';
  const currentMod = isMantri
    ? currentModuleId === 'ALL'
      ? null
      : store.modules.find((m) => m.id === currentModuleId) || store.modules[3]
    : null;

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
              ${renderSidebar(roleObj, currentMod, store.roles, store.modules, store.commonFeatures)}

              <!-- Center Content / Canvas -->
              <main class="pm-content">
                ${isMantri
        ? currentModuleId === 'ALL'
          ? renderAllModulesContent(store)
          : renderSingleModuleContent(currentMod, store)
        : renderInProgressRole(roleObj)
      }
              </main>

              <!-- Right Detail Panel -->
              ${isMantri && isDetailOpen ? renderDetailPanel(store) : ''}
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
            👁️ View Mode
          </button>
          <button type="button" class="pm-mode-seg-btn ${isManageMode ? 'is-active' : ''}" id="pm-mode-manage-btn">
            ✏️ Manage Mode
          </button>
        </div>

        <div class="pm-meta-chip">
          <span>📦 v${escapeHtml(metadata.version)}</span>
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
              💾 Simpan Draf
            </button>
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-btn-export-data" title="Ekspor file process-mapping-data.json untuk pembaruan source data">
              📥 Export Project Data
            </button>
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-btn-import-data" title="Impor file data JSON ke editor state">
              📤 Import Data
            </button>
            <button type="button" class="pm-btn-sm pm-btn-danger" id="pm-btn-reset-draft" title="Batalkan draf dan muat ulang data resmi dari process-mapping-data.json">
              🔄 Reset Draf
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
          <button type="button" class="pm-nav-link ${currentNavTab === 'mapping' ? 'is-active' : ''}" id="pm-nav-mapping">Process Mapping</button>
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
          <kbd class="pm-search-kbd">⌘K</kbd>
        </div>

        <div class="pm-header-meta">
          <span class="pm-version-badge">v${escapeHtml(metadata.version)}</span>
        </div>
      </div>
    </header>
  `;
}

function renderSidebar(roleObj, currentMod, roles, modules, commonFeatures) {
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
                ${r.name} ${r.status === 'CONFIRMED' ? '(Confirmed)' : '(In Progress)'}
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
          ${currentRole === 'mantri-bibitan'
      ? `
                <!-- Semua Modul Option -->
                <button
                  type="button"
                  class="pm-module-item ${currentModuleId === 'ALL' ? 'is-active' : ''}"
                  data-module-id="ALL"
                  title="Tampilkan seluruh flow 11 module Mantri Bibitan"
                >
                  <span class="pm-mod-num">★</span>
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
      : `<div style="font-size:0.8rem; color:#94a3b8; padding:8px 0;">Module belum tersedia</div>`
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

function renderAllModulesContent(store) {
  return `
    <!-- Breadcrumb -->
    <div class="pm-breadcrumb">
      <span class="pm-breadcrumb-link">Mantri Bibitan</span>
      <span>&rsaquo;</span>
      <span style="color:#1e293b; font-weight:600;">Semua Modul (11 Tahapan Alur Lengkap)</span>
    </div>

    <!-- Header Section -->
    <div class="pm-mod-header">
      <div class="pm-title-row">
        <h1 class="pm-mod-title">Alur Proses Seluruh Modul</h1>
        <span class="pm-badge-confirmed">11 Modul Confirmed</span>
      </div>
      <div class="pm-mod-subtitle">Peta Alur Operasional Lengkap Mantri Bibitan dari Hulu ke Hilir</div>
      <p class="pm-mod-desc">
        Menampilkan seluruh rangkaian proses bisnis pembibitan karet secara terorganisir per modul. Klik pada setiap proses untuk melihat rincian requirement, validasi, dan aturan bisnis pada panel detail.
      </p>
    </div>

    <!-- Sub-Tabs & Filter Bar Row -->
    <div class="pm-all-filter-bar">
      <div class="pm-sub-tabs">
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'flow' ? 'is-active' : ''}" data-view="flow">Flow Seluruh Modul</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'requirement' ? 'is-active' : ''}" data-view="requirement">Requirement Master (${store.requirements.filter((r) => !r.isArchived).length})</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'business-rule' ? 'is-active' : ''}" data-view="business-rule">Business Rules</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'related-role' ? 'is-active' : ''}" data-view="related-role">Related Role</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'end-to-end' ? 'is-active' : ''}" data-view="end-to-end">End-to-End Overview</button>
      </div>

      <div style="display:flex; align-items:center; gap:8px;">
        <label for="pm-jump-module-select" style="font-size:0.82rem; color:#475569; font-weight:600;">Lompat ke:</label>
        <select id="pm-jump-module-select" class="pm-feature-select">
          <option value="">-- Pilih Modul --</option>
          ${store.modules.map((m) => `<option value="${m.id}">[${m.order}] ${m.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- View Switcher for All Modules -->
    ${currentViewTab === 'flow'
      ? renderAllModulesFlowSections(store)
      : currentViewTab === 'requirement'
        ? renderRequirementsView(store.requirements, store.modules)
        : currentViewTab === 'business-rule'
          ? renderBusinessRuleView(store.businessRules)
          : currentViewTab === 'related-role'
            ? renderRelatedRoleView(null)
            : renderEndToEndView(store.endToEndPipeline)
    }
  `;
}

function renderAllModulesFlowSections(store) {
  return `
    <div class="pm-all-modules-container" id="pm-all-modules-container">
      ${store.modules
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
                      ➕ Tambah Node
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
              <div class="mermaid-diagram" data-mermaid="${escapeHtml(generateMermaidSyntax(activeNodes))}" style="width:100%; text-align:center;"></div>
            </div>
          </section>
        `;
      })
      .join('')}
    </div>
  `;
}

function renderSingleModuleContent(currentMod, store) {
  const modFlows = store.flows[currentMod.id] || {};
  const currentFlow = modFlows[currentFeatureId] || Object.values(modFlows)[0] || { title: currentMod.name, nodes: [], edges: [] };
  const activeNodes = (currentFlow.nodes || []).filter((n) => !n.isArchived);

  return `
    <!-- Breadcrumb -->
    <div class="pm-breadcrumb">
      <span class="pm-breadcrumb-link">Mantri Bibitan</span>
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
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'requirement' ? 'is-active' : ''}" data-view="requirement">Requirement</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'business-rule' ? 'is-active' : ''}" data-view="business-rule">Business Rule</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'related-role' ? 'is-active' : ''}" data-view="related-role">Related Role</button>
        <button type="button" class="pm-sub-tab-btn ${currentViewTab === 'end-to-end' ? 'is-active' : ''}" data-view="end-to-end">End-to-End</button>
      </div>

      <!-- Feature Dropdown Selector -->
      ${currentMod.features.length > 1
      ? `
        <div class="pm-feature-selector">
          <label for="pm-feature-select" class="pm-feature-label">Fitur:</label>
          <select id="pm-feature-select" class="pm-feature-select">
            ${currentMod.features
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
        ? renderRequirementsView(store.requirements.filter((r) => r.module === currentMod.name), store.modules)
        : currentViewTab === 'business-rule'
          ? renderBusinessRuleView(store.businessRules)
          : currentViewTab === 'related-role'
            ? renderRelatedRoleView(currentMod)
            : renderEndToEndView(store.endToEndPipeline)
    }
  `;
}

function renderFlowCanvas(currentMod, currentFlow, activeNodes) {
  return `
    <div class="pm-canvas-container" id="pm-canvas-container">
      <!-- Toolbar Controls -->
      <div class="pm-canvas-toolbar">
        <div class="pm-canvas-title">
          <span>${escapeHtml(currentFlow.title || currentMod.name)}</span>
          ${isManageMode
      ? `
              <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-add-node" data-mod-id="${currentMod.id}" data-feat-id="${currentFeatureId}">
                ➕ Tambah Node
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
          <div class="mermaid-diagram" data-mermaid="${escapeHtml(generateMermaidSyntax(activeNodes))}" style="width:100%; text-align:center;"></div>
        </div>
      </div>
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
            <button type="button" class="pm-node-btn-icon pm-btn-node-edit" title="Edit Node / Buat Revisi" data-node-id="${node.id}" data-mod-id="${modId}" data-feat-id="${featId}">✏️</button>
            <button type="button" class="pm-node-btn-icon is-danger pm-btn-node-archive" title="Arsipkan Node" data-node-id="${node.id}" data-mod-id="${modId}" data-feat-id="${featId}">📦</button>
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

function renderRequirementsView(reqs, modules) {
  const activeReqs = reqs.filter((r) => !r.isArchived);

  return `
    <div class="pm-req-table-card" style="margin-top: 0;">
      <div class="pm-req-table-head" style="display:flex; align-items:center; justify-content:space-between;">
        <span class="pm-req-table-title">Daftar Lengkap Requirement (${activeReqs.length})</span>
        ${isManageMode
      ? `
          <button type="button" class="pm-btn-sm pm-btn-primary" id="pm-btn-add-req">
            ➕ Tambah Requirement
          </button>
        `
      : ''
    }
      </div>

      <div style="overflow-x: auto;">
        <table class="pm-table">
          <thead>
            <tr>
              <th style="width: 130px;">ID</th>
              <th>Requirement</th>
              <th style="width: 110px;">Role</th>
              <th style="width: 110px;">Modul</th>
              <th style="width: 140px;">Proses</th>
              <th style="width: 100px;">Status</th>
              ${isManageMode ? '<th style="width: 130px; text-align:center;">Aksi</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${activeReqs
      .map(
        (r) => `
              <tr class="pm-req-full-row" data-req-id="${r.id}" data-mod-name="${r.module}">
                <td>
                  <code>${r.id}</code>
                  ${r.version && r.version > 1 ? `<span class="pm-badge-draft" style="font-size:0.65rem; margin-left:4px;">v${r.version}</span>` : ''}
                  ${r.revisionOf ? `<div style="font-size:0.68rem; color:#64748b;">(Revisi dari ${r.revisionOf})</div>` : ''}
                </td>
                <td><strong>${escapeHtml(r.title)}</strong></td>
                <td>${r.role}</td>
                <td>${r.module}</td>
                <td>${escapeHtml(r.process)}</td>
                <td>
                  <span class="${r.status === 'Confirmed' ? 'pm-badge-confirmed' : 'pm-badge-draft'}">
                    ${r.status}
                  </span>
                </td>
                ${isManageMode
            ? `
                  <td style="text-align:center;">
                    <div style="display:inline-flex; gap:4px;">
                      <button type="button" class="pm-row-btn pm-btn-edit-req" data-req-id="${r.id}" title="Edit / Buat Revisi">
                        ✏️ Edit
                      </button>
                      <button type="button" class="pm-row-btn is-danger pm-btn-archive-req" data-req-id="${r.id}" title="Arsipkan Requirement">
                        📦 Arsip
                      </button>
                    </div>
                  </td>
                `
            : ''
          }
              </tr>
            `
      )
      .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBusinessRuleView(brs) {
  return `
    <div>
      <div style="margin-bottom: 12px;">
        <h3 style="margin:0 0 4px; font-size:1.1rem; font-weight:700; color:#0f172a;">Business Rules Pembibitan Karet</h3>
        <p style="margin:0; font-size:0.84rem; color:#64748b;">Aturan bisnis mutlak yang mendasari validasi, integritas stok, dan audit trail.</p>
      </div>

      <div class="pm-br-list">
        ${brs
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
            <span style="font-size:24px;">📝</span>
          </div>

          <div style="text-align:center; font-size:18px; color:#94a3b8; font-weight:bold;">&darr; Menunggu Verifikasi &darr;</div>

          <div style="padding:14px 18px; background:#ffffff; border:1.5px solid #16a34a; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.72rem; font-weight:700; color:#16a34a; text-transform:uppercase;">Related Role (Verifikator)</span>
              <h4 style="margin:2px 0 0; font-size:1rem; color:#0f172a;">Asisten Bibitan</h4>
              <p style="margin:2px 0 0; font-size:0.8rem; color:#64748b;">Pemeriksaan Fisik Lapangan, Review Foto, Persetujuan / Penolakan Koreksi</p>
            </div>
            <span style="font-size:24px;">✅</span>
          </div>

          <div style="text-align:center; font-size:18px; color:#94a3b8; font-weight:bold;">&darr; Setelah Disetujui &darr;</div>

          <div style="padding:14px 18px; background:#ffffff; border:1.5px solid #2563eb; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.72rem; font-weight:700; color:#2563eb; text-transform:uppercase;">Database Ledger</span>
              <h4 style="margin:2px 0 0; font-size:1rem; color:#0f172a;">Server Production</h4>
              <p style="margin:2px 0 0; font-size:0.8rem; color:#64748b;">Pemotongan Stok Mata Entres, Update Populasi Batch Resmi</p>
            </div>
            <span style="font-size:24px;">🗄️</span>
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
      <div class="pm-empty-icon">📋</div>
      <h3 class="pm-empty-title">Requirement belum tersedia</h3>
      <p class="pm-empty-desc">
        Dokumentasi proses bisnis untuk role <strong>${escapeHtml(roleObj.name)}</strong> saat ini berstatus <em>In Progress</em> dan akan ditambahkan secara incremental sesuai jadwal.
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
          <button type="button" class="pm-detail-close-btn" id="pm-detail-close" title="Tutup Detail Panel">✖</button>
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
        <button type="button" class="pm-detail-close-btn" id="pm-detail-close" title="Tutup Detail Panel">✖</button>
      </div>

      <div class="pm-detail-body" style="display:flex; flex-direction:column; gap:20px;">
        <div class="pm-detail-node-title-row">
          <h2 class="pm-detail-node-name">${escapeHtml(foundNode.label || foundNode.title || 'Node')}</h2>
          ${foundNode.code ? `<span class="pm-step-code-badge">${escapeHtml(foundNode.code)}</span>` : ''}
        </div>
        
        <div class="pm-detail-action-bar" style="display:flex; gap:8px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-top:-8px;">
          <button type="button" class="pm-btn-sm pm-btn-secondary pm-btn-node-edit" data-node-id="${escapeHtml(foundNode.id)}" data-mod-id="${escapeHtml(effectiveModId)}" data-feat-id="${escapeHtml(effectiveFeatId)}">✏️ Edit Node</button>
          ${isManageMode
      ? `<button type="button" class="pm-btn-sm pm-btn-danger pm-btn-node-archive" data-node-id="${escapeHtml(foundNode.id)}" data-mod-id="${escapeHtml(effectiveModId)}" data-feat-id="${escapeHtml(effectiveFeatId)}">📦 Arsip</button>`
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

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">${isNew ? 'Tambah Requirement Baru' : isConfirmed ? `Buat Revisi: ${modalData.id}` : `Edit Requirement: ${modalData.id}`}</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-requirement">
            <div class="pm-modal-body">
              ${isConfirmed
        ? `
                <div class="pm-revision-alert">
                  <span>ℹ️</span>
                  <div>
                    <strong>Requirement berstatus Confirmed.</strong><br/>
                    Menyimpan perubahan akan otomatis menghasilkan <strong>Revisi Baru (v${(modalData.version || 1) + 1} Draft)</strong> tanpa menimpa baseline confirmed.
                  </div>
                </div>
              `
        : ''
      }

              <div class="pm-form-grid">
                <div class="pm-form-group">
                  <label class="pm-form-label">ID Requirement</label>
                  <input type="text" name="reqId" class="pm-form-input" value="${escapeHtml(modalData?.id || '')}" ${!isNew ? 'readonly' : 'required'} placeholder="Contoh: RN-OKL-008" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Status</label>
                  <select name="status" class="pm-form-select">
                    <option value="Draft" ${modalData?.status === 'Draft' ? 'selected' : ''}>Draft</option>
                    <option value="Confirmed" ${modalData?.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                  </select>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Judul Requirement</label>
                  <input type="text" name="title" class="pm-form-input" value="${escapeHtml(modalData?.title || '')}" required />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Modul Terkait</label>
                  <select name="module" class="pm-form-select">
                    ${store.modules.map((m) => `<option value="${m.name}" ${modalData?.module === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}
                  </select>
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Proses / Langkah</label>
                  <input type="text" name="process" class="pm-form-input" value="${escapeHtml(modalData?.process || '')}" required />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Input Data</label>
                  <textarea name="input" class="pm-form-textarea">${escapeHtml(modalData?.input || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Aturan Validasi</label>
                  <textarea name="validation" class="pm-form-textarea">${escapeHtml(modalData?.validation || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Mekanisme Fallback</label>
                  <textarea name="fallback" class="pm-form-textarea">${escapeHtml(modalData?.fallback || '')}</textarea>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Output / Hasil</label>
                  <textarea name="output" class="pm-form-textarea">${escapeHtml(modalData?.output || '')}</textarea>
                </div>
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary">${isConfirmed ? '💾 Simpan sebagai Revisi Baru' : '💾 Simpan Perubahan'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (activeModal === 'edit-node') {
    const isNew = !modalData?.node?.id;
    const isConfirmed = modalData?.node?.status === 'Confirmed';

    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">${isNew ? 'Tambah Langkah Alur (Node)' : isConfirmed ? `Buat Revisi Node: ${modalData?.node?.label || modalData?.node?.title || ''}` : `Edit Node: ${modalData?.node?.label || modalData?.node?.title || ''}`}</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <form id="pm-form-node">
            <div class="pm-modal-body">
              ${isConfirmed
        ? `
                <div class="pm-revision-alert">
                  <span>ℹ️</span>
                  <div>
                    <strong>Langkah alur ini berstatus Confirmed.</strong><br/>
                    Menyimpan draf akan menghasilkan <strong>versi revisi baru (v${(modalData.node.version || 1) + 1} Draft)</strong> tanpa langsung menimpa baseline confirmed resmi.
                  </div>
                </div>
              `
        : ''
      }

              <div class="pm-form-grid">
                <div class="pm-form-group">
                  <label class="pm-form-label">Kode Langkah</label>
                  <input type="text" name="code" class="pm-form-input" value="${escapeHtml(modalData?.node?.code || '')}" placeholder="P-001" required />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Tipe Langkah</label>
                  <select name="type" class="pm-form-select">
                    <option value="process" ${modalData?.node?.type === 'process' ? 'selected' : ''}>Process (Aktivitas)</option>
                    <option value="decision" ${modalData?.node?.type === 'decision' ? 'selected' : ''}>Decision (Keputusan / Kondisi)</option>
                    <option value="start" ${modalData?.node?.type === 'start' ? 'selected' : ''}>Start (Titik Awal)</option>
                    <option value="end" ${modalData?.node?.type === 'end' ? 'selected' : ''}>End (Titik Akhir)</option>
                  </select>
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Label / Nama Langkah</label>
                  <input type="text" name="label" class="pm-form-input" value="${escapeHtml(modalData?.node?.label || modalData?.node?.title || '')}" required />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Tujuan Proses</label>
                  <textarea name="purpose" class="pm-form-textarea">${escapeHtml(modalData?.node?.purpose || modalData?.node?.summary || '')}</textarea>
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Input</label>
                  <input type="text" name="input" class="pm-form-input" value="${escapeHtml(modalData?.node?.input || '')}" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Output</label>
                  <input type="text" name="output" class="pm-form-input" value="${escapeHtml(modalData?.node?.output || '')}" />
                </div>

                <div class="pm-form-group is-full">
                  <label class="pm-form-label">Validasi</label>
                  <input type="text" name="validation" class="pm-form-input" value="${escapeHtml(modalData?.node?.validation || '')}" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Fallback</label>
                  <input type="text" name="fallback" class="pm-form-input" value="${escapeHtml(modalData?.node?.fallback || '')}" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Dampak Stok</label>
                  <input type="text" name="stockImpact" class="pm-form-input" value="${escapeHtml(modalData?.node?.stockImpact || '')}" placeholder="Contoh: - Stok Mata Entres" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">ID Requirement Terkait</label>
                  <input type="text" name="reqId" class="pm-form-input" value="${escapeHtml(modalData?.node?.reqId || '')}" placeholder="Contoh: RN-PRS-001" />
                </div>

                <div class="pm-form-group">
                  <label class="pm-form-label">Role Terkait (Verifikator)</label>
                  <input type="text" name="relatedRole" class="pm-form-input" value="${escapeHtml(modalData?.node?.relatedRole || 'Asisten Bibitan (Verifikasi)')}" />
                </div>
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary" id="pm-btn-submit-node">💾 Simpan Draf</button>
            </div>
          </form>
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
        ? '<div style="color:#16a34a; font-size:0.78rem;">✅ Data lengkap dan tervalidasi (0 error). Siap untuk diekspor.</div>'
        : `<div style="color:#dc2626; font-size:0.78rem;">⚠️ Ditemukan kesalahan:<br/>${validation.errors.join('<br/>')}</div>`
      }
              </div>
            </div>

            <div class="pm-modal-footer">
              <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Tutup</button>
              <button type="submit" class="pm-btn-sm pm-btn-primary" ${!validation.valid ? 'disabled' : ''}>
                📥 Unduh process-mapping-data.json
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
              ✅ Konfirmasi &amp; Muat Data
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (activeModal === 'reset') {
    return `
      <div class="pm-modal-backdrop" id="pm-modal-backdrop">
        <div class="pm-modal-dialog" style="max-width:480px;">
          <div class="pm-modal-header">
            <h3 class="pm-modal-title">Konfirmasi Reset Draf</h3>
            <button type="button" class="pm-modal-close" id="pm-modal-close-btn">&times;</button>
          </div>

          <div class="pm-modal-body">
            <p style="margin:0; font-size:0.88rem; color:#334155;">
              Apakah Anda yakin ingin membatalkan semua perubahan draf lokal dan memuat ulang data resmi dari <strong>process-mapping-data.json</strong>?
            </p>
            <p style="margin:8px 0 0; font-size:0.8rem; color:#64748b;">
              ⚠️ <em>Catatan: Tindakan ini tidak akan pernah menghapus atau mengubah baseline Confirmed.</em>
            </p>
          </div>

          <div class="pm-modal-footer">
            <button type="button" class="pm-btn-sm pm-btn-secondary" id="pm-modal-cancel-btn">Batal</button>
            <button type="button" class="pm-btn-sm pm-btn-danger" id="pm-btn-confirm-reset">
              🔄 Ya, Reset ke Data Resmi
            </button>
          </div>
        </div>
      </div>
    `;
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
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      const nodeId = btn.dataset.nodeId;
      if (confirm('Arsipkan langkah alur ini? Node akan tetap tersimpan di riwayat data.')) {
        archiveFlowNode(modId, featId, nodeId);
        saveDraftToStorage();
        showToast('📦 Node berhasil diarsipkan (Draft)');
        renderProcessMappingPortal(container);
      }
    });
  });
}

function attachPortalEvents(container, store) {
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

  // Save Draft Button
  container.querySelector('#pm-btn-save-draft')?.addEventListener('click', () => {
    try {
      saveDraftToStorage();
      showToast('💾 Draf berhasil disimpan ke sesi lokal');
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
      if (e.target.closest('.pm-row-btn')) return; // ignore edit/archive buttons

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
    renderProcessMappingPortal(container);
  });

  // ---------------------------------------------------------------------------
  // Manage Mode Events: Requirements (Add, Edit, Archive)
  // ---------------------------------------------------------------------------
  container.querySelector('#pm-btn-add-req')?.addEventListener('click', () => {
    modalData = {
      id: '',
      title: '',
      module: store.modules[0]?.name || 'Okulasi',
      role: 'Mantri Bibitan',
      process: '',
      status: 'Draft',
      input: '',
      validation: '',
      fallback: '',
      output: ''
    };
    activeModal = 'edit-req';
    renderProcessMappingPortal(container);
  });

  container.querySelectorAll('.pm-btn-edit-req[data-req-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reqId = btn.dataset.reqId;
      const req = store.requirements.find((r) => r.id === reqId && !r.isArchived);
      if (req) {
        modalData = JSON.parse(JSON.stringify(req));
        activeModal = 'edit-req';
        renderProcessMappingPortal(container);
      }
    });
  });

  container.querySelectorAll('.pm-btn-archive-req[data-req-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reqId = btn.dataset.reqId;
      if (confirm(`Apakah Anda yakin ingin mengarsipkan requirement ${reqId}? Data akan tetap tersimpan dalam riwayat.`)) {
        archiveRequirement(reqId);
        saveDraftToStorage();
        showToast(`📦 Requirement ${reqId} berhasil diarsipkan`);
        renderProcessMappingPortal(container);
      }
    });
  });

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
          label: '',
          type: 'process',
          purpose: '',
          input: '',
          output: '',
          validation: '',
          fallback: '',
          stockImpact: '',
          reqId: '',
          relatedRole: 'Asisten Bibitan (Verifikasi)',
          status: 'Draft'
        }
      };
      activeModal = 'edit-node';
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-btn-node-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      const nodeId = btn.dataset.nodeId;
      const flow = store.flows[modId]?.[featId];
      const node = flow?.nodes.find((n) => n.id === nodeId);
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
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      const nodeId = btn.dataset.nodeId;
      reorderFlowNode(modId, featId, nodeId, 'up');
      saveDraftToStorage();
      showToast('↑ Urutan langkah berhasil dinaikkan');
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-btn-node-down').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      const nodeId = btn.dataset.nodeId;
      reorderFlowNode(modId, featId, nodeId, 'down');
      saveDraftToStorage();
      showToast('↓ Urutan langkah berhasil diturunkan');
      renderProcessMappingPortal(container);
    });
  });

  container.querySelectorAll('.pm-btn-node-archive').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId;
      const featId = btn.dataset.featId;
      const nodeId = btn.dataset.nodeId;
      if (confirm('Arsipkan langkah alur ini? Node akan tetap tersimpan di riwayat data.')) {
        archiveFlowNode(modId, featId, nodeId);
        saveDraftToStorage();
        showToast('📦 Node berhasil diarsipkan');
        renderProcessMappingPortal(container);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Modal Actions: Submit & Cancel Handlers
  // ---------------------------------------------------------------------------
  container.querySelector('#pm-modal-close-btn')?.addEventListener('click', closeModal);
  container.querySelector('#pm-modal-cancel-btn')?.addEventListener('click', closeModal);

  // Form Submit: Requirement
  container.querySelector('#pm-form-requirement')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reqId = formData.get('reqId');
    const fields = {
      id: reqId,
      title: formData.get('title'),
      status: formData.get('status'),
      module: formData.get('module'),
      process: formData.get('process'),
      input: formData.get('input'),
      validation: formData.get('validation'),
      fallback: formData.get('fallback'),
      output: formData.get('output')
    };

    try {
      if (!modalData?.id) {
        // Create new
        createRequirement(fields);
        showToast(`Requirement ${fields.id} berhasil ditambahkan`);
      } else {
        // Edit or revision
        const res = editRequirement(modalData.id, fields, 'Business Analyst');
        if (res.isRevision) {
          showToast(`Revisi baru ${res.requirement.id} v${res.requirement.version} berhasil dibuat (Draft)`);
        } else {
          showToast(`Requirement ${res.requirement.id} berhasil diperbarui`);
        }
      }

      saveDraftToStorage();
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menyimpan requirement: ' + err.message);
    }
  });

  // Form Submit: Node
  container.querySelector('#pm-form-node')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const modId = modalData.moduleId;
    const featId = modalData.featureId;
    const newLabel = formData.get('label');
    const newPurpose = formData.get('purpose');

    const fields = {
      code: formData.get('code'),
      type: formData.get('type'),
      label: newLabel,
      title: newLabel,
      purpose: newPurpose,
      summary: newPurpose,
      description: newPurpose,
      input: formData.get('input'),
      output: formData.get('output'),
      validation: formData.get('validation'),
      fallback: formData.get('fallback'),
      stockImpact: formData.get('stockImpact'),
      reqId: formData.get('reqId'),
      relatedRole: formData.get('relatedRole'),
      status: 'Draft'
    };

    try {
      if (!modalData?.node?.id) {
        // Add node
        const createdNode = addFlowNode(modId, featId, fields, 'Business Analyst');
        if (createdNode && createdNode.id) selectedNodeId = createdNode.id;
        showToast('Langkah alur baru berhasil ditambahkan (Draft)');
      } else {
        // Edit node
        const res = editFlowNode(modId, featId, modalData.node.id, fields, 'Business Analyst');
        selectedNodeId = modalData.node.id;
        selectedModuleId = modId;
        currentFeatureId = featId;
        if (res.isRevision) {
          showToast(`Revisi langkah v${res.node.version} berhasil dibuat (Draft)`);
        } else {
          showToast('Langkah alur berhasil diperbarui (Draft)');
        }
      }

      saveDraftToStorage();
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal menyimpan langkah: ' + err.message);
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
      showToast('📥 process-mapping-data.json berhasil diekspor');
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
            showToast('✅ Data berhasil diimpor ke editor state');
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
      showToast('🔄 Draf lokal dibatalkan. Memulihkan data resmi process-mapping-data.json');
      closeModal();
      renderProcessMappingPortal(container);
    } catch (err) {
      alert('Gagal mereset draf: ' + err.message);
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
          <span class="pm-meta-chip">📦 Dataset v${escapeHtml(store.metadata?.version || '1.0.0')}</span>
          <span class="pm-meta-chip">🗓️ ${escapeHtml(store.metadata?.lastUpdated || '-')}</span>
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
            <span>📋 Status Kesiapan Modul Operasional</span>
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
            <span>📑 Rekapitulasi Baseline Dokumen Sistem</span>
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
                📖 Buka Reference Requirement &rarr;
              </button>
              <button type="button" class="pm-btn-sm pm-btn-secondary" data-dash-nav="mapping">
                🗺️ Buka Process Mapping Flow &rarr;
              </button>
              <button type="button" class="pm-btn-sm pm-btn-secondary" data-dash-nav="reports">
                📄 Buka Reports &amp; Cetak Dokumen &rarr;
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

  if (refFilterType === 'functional') {
    all = all.filter((item) => item.reqType === 'Functional');
  } else if (refFilterType === 'non-functional') {
    all = all.filter((item) => item.reqType === 'Non-Functional');
  }

  if (refFilterCategory && refFilterCategory !== 'all') {
    all = all.filter((item) => item.category === refFilterCategory);
  }

  if (refFilterStatus && refFilterStatus !== 'all') {
    all = all.filter((item) => (item.status || '').toUpperCase() === refFilterStatus.toUpperCase());
  }

  if (refSearchQuery && refSearchQuery.trim()) {
    const q = refSearchQuery.toLowerCase().trim();
    all = all.filter((item) => {
      return (
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.acceptance && item.acceptance.toLowerCase().includes(q))
      );
    });
  }

  return all;
}

function renderReferenceTableRows(items) {
  if (items.length === 0) {
    return `
      <tr>
        <td colspan="5" style="text-align: center; padding: 32px; color: #64748b;">
          Tidak ada requirement yang sesuai dengan filter pencarian.
        </td>
      </tr>
    `;
  }

  return items
    .map(
      (item) => `
    <tr>
      <td style="white-space: nowrap;">
        <span class="pm-ref-id-badge">${escapeHtml(item.id)}</span>
      </td>
      <td style="white-space: nowrap;">
        <span class="pm-chip-type ${item.reqType === 'Functional' ? 'pm-chip-func' : 'pm-chip-nonfunc'}">
          ${escapeHtml(item.reqType)}
        </span>
      </td>
      <td style="white-space: nowrap;">
        <span class="pm-ref-category-tag">${escapeHtml(item.category || '-')}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${escapeHtml(item.title || '')}</div>
        <div style="color: #475569; font-size: 0.8rem; line-height: 1.45;">${escapeHtml(item.description || '')}</div>
        ${item.acceptance
          ? `
          <div style="margin-top: 6px; padding: 6px 10px; background: #f8fafc; border-left: 3px solid #116834; border-radius: 4px; font-size: 0.76rem; color: #334155;">
            <strong>Kriteria Penerimaan:</strong> ${escapeHtml(item.acceptance)}
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
  );

  const filteredItems = getFilteredReferenceItems(store);

  return `
    <div class="pm-reference-container">
      <div class="pm-dashboard-header">
        <div>
          <h1 class="pm-dashboard-title">Reference: Kebutuhan Sistem General (Baseline)</h1>
          <p class="pm-dashboard-desc">Spesifikasi kebutuhan umum sistem (Functional &amp; Non-Functional) yang menjadi standar acuan seluruh modul.</p>
        </div>
        <div>
          <span class="pm-meta-chip">✅ Confirmed Baseline</span>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="pm-ref-filter-bar">
        <div class="pm-ref-pill-group">
          <button type="button" class="pm-ref-pill-btn ${refFilterType === 'all' ? 'is-active' : ''}" data-ref-type="all">
            Semua (${totalGeneral})
          </button>
          <button type="button" class="pm-ref-pill-btn ${refFilterType === 'functional' ? 'is-active' : ''}" data-ref-type="functional">
            Functional (${funcItems.length})
          </button>
          <button type="button" class="pm-ref-pill-btn ${refFilterType === 'non-functional' ? 'is-active' : ''}" data-ref-type="non-functional">
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
          <option value="all">Semua Kategori (${categories.length})</option>
          ${categories
      .map(
        (cat) => `
            <option value="${escapeHtml(cat)}" ${refFilterCategory === cat ? 'selected' : ''}>
              ${escapeHtml(cat)}
            </option>
          `
      )
      .join('')}
        </select>

        <select id="pm-ref-status-filter" class="pm-ref-select">
          <option value="all">Semua Status</option>
          <option value="Confirmed" ${refFilterStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
        </select>
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
              <th style="width: 120px;">Tipe</th>
              <th style="width: 180px;">Kategori</th>
              <th>Judul &amp; Deskripsi Kebutuhan</th>
              <th style="width: 110px; text-align: center;">Status</th>
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
// 3. REPORTS VIEW (Strictly READ-ONLY Formal Documentation & Print Preview)
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
            📄 1. Dokumen Analisa Kebutuhan Sistem (DAK)
          </button>
          <button type="button" class="pm-report-tab-btn ${reportSubTab === 'bp-doc' ? 'is-active' : ''}" data-report-subtab="bp-doc">
            🗺️ 2. Dokumen Proses Bisnis (BPD)
          </button>
          <button type="button" class="pm-report-tab-btn ${reportSubTab === 'req-matrix' ? 'is-active' : ''}" data-report-subtab="req-matrix">
            🔗 3. Matriks Ketertelusuran (RTM)
          </button>
        </div>

        <div class="pm-report-controls">
          ${reportSubTab === 'bp-doc' || reportSubTab === 'req-matrix'
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

          <button type="button" class="pm-btn-export-pdf" id="pm-btn-export-pdf">
            🖨️ Cetak / Export PDF
          </button>
        </div>
      </div>

      <!-- Document Sheet Preview Container -->
      <div class="pm-report-document" id="pm-printable-report">
        ${reportSubTab === 'req-doc'
      ? renderReportReqDoc(store)
      : reportSubTab === 'bp-doc'
        ? renderReportBpDoc(store)
        : renderReportMatrix(store)
    }
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
                  <span>🔹 Fitur:</span> <span>${escapeHtml(feat.name)}</span>
                </h4>
                <table class="pm-doc-table">
                  <thead>
                    <tr>
                      <th style="width: 40px; text-align:center;">No</th>
                      <th style="width: 80px;">Kode</th>
                      <th style="width: 180px;">Langkah Alur / Proses</th>
                      <th>Input Data</th>
                      <th>Validasi &amp; Aturan</th>
                      <th>Fallback / Pengecualian</th>
                      <th>Output &amp; Dampak Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${nodes.length === 0
                    ? '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:12px;">Alur proses belum dikonfigurasi.</td></tr>'
                    : nodes
                      .map(
                        (node, idx) => `
                        <tr>
                          <td style="text-align:center; color:#64748b;">${idx + 1}</td>
                          <td style="font-weight:700; color:#116834;">${escapeHtml(node.code || node.id)}</td>
                          <td>
                            <div style="font-weight:600; color:#0f172a;">${escapeHtml(node.label || node.title || '')}</div>
                            <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(node.purpose || '')}</div>
                          </td>
                          <td style="font-size:0.78rem; color:#334155;">${escapeHtml(node.input || '-')}</td>
                          <td style="font-size:0.78rem; color:#334155;">${escapeHtml(node.validation || '-')}</td>
                          <td style="font-size:0.78rem; color:#b45309;">${escapeHtml(node.fallback || '-')}</td>
                          <td style="font-size:0.78rem; color:#15803d;">
                            <div>${escapeHtml(node.output || '-')}</div>
                            ${node.stockImpact ? `<div style="font-size:0.72rem; color:#0369a1; margin-top:2px;">📦 ${escapeHtml(node.stockImpact)}</div>` : ''}
                          </td>
                        </tr>
                      `
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

// Subtab 3: Traceability Matrix Document
function renderReportMatrix(store) {
  let targetModules = store.modules || [];
  if (reportFilterModule && reportFilterModule !== 'all') {
    targetModules = targetModules.filter((m) => m.id === reportFilterModule);
  }

  // Build rows from flows
  const rows = [];
  targetModules.forEach((m) => {
    (m.features || []).forEach((f) => {
      const flow = store.flows?.[m.id]?.[f.id];
      if (flow && flow.nodes) {
        flow.nodes.forEach((node) => {
          rows.push({
            module: m.name,
            moduleOrder: m.order,
            feature: f.name,
            nodeCode: node.code || node.id,
            nodeLabel: node.label || node.title || '',
            reqId: node.reqId || '-',
            primaryRole: m.primaryRole || 'Mantri Bibitan',
            relatedRole: node.relatedRole || m.relatedRole || 'Asisten Bibitan',
            stockImpact: node.stockImpact || '-',
            status: node.status || 'Confirmed'
          });
        });
      }
    });
  });

  return `
    <div class="pm-doc-header">
      <div class="pm-doc-company">PT SOCFIN INDONESIA — PROJECT SIGMA</div>
      <h1 class="pm-doc-title">Matriks Ketertelusuran Kebutuhan (RTM)</h1>
      <div style="font-size: 0.9rem; color: #475569;">Traceability Matrix antara Modul Operasional, Fitur, Alur Proses, &amp; Dokumen Kebutuhan</div>

      <div class="pm-doc-meta-grid">
        <div class="pm-doc-meta-item"><strong>Nomor Dokumen:</strong> RTM-SIGMA-NURSERY-01</div>
        <div class="pm-doc-meta-item"><strong>Versi Baseline:</strong> v${escapeHtml(store.metadata?.version || '1.0.0')}</div>
        <div class="pm-doc-meta-item"><strong>Total Relasi Terpetakan:</strong> ${rows.length} Langkah Alur</div>
        <div class="pm-doc-meta-item"><strong>Status:</strong> <span style="color:#116834; font-weight:700;">CONFIRMED BASELINE</span></div>
      </div>
    </div>

    <div class="pm-doc-section">
      <h2 class="pm-doc-section-title">1.0 Matriks Ketertelusuran Alur Proses ke Kebutuhan Sistem</h2>
      <table class="pm-doc-table">
        <thead>
          <tr>
            <th style="width: 120px;">Modul</th>
            <th style="width: 140px;">Fitur</th>
            <th style="width: 75px;">Kode Alur</th>
            <th>Langkah Alur Proses</th>
            <th style="width: 90px; text-align:center;">Req ID Terkait</th>
            <th style="width: 110px;">PIC Utama</th>
            <th style="width: 110px;">Role Verifikator</th>
            <th style="width: 80px; text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length === 0
      ? '<tr><td colspan="8" style="text-align:center; padding:24px; color:#94a3b8;">Tidak ada data matriks yang sesuai filter.</td></tr>'
      : rows
        .map(
          (row) => `
              <tr>
                <td style="font-weight:600; color:#1e293b;">${escapeHtml(row.module)}</td>
                <td style="font-size:0.8rem; color:#475569;">${escapeHtml(row.feature)}</td>
                <td style="font-weight:700; color:#116834;">${escapeHtml(row.nodeCode)}</td>
                <td style="font-weight:600; color:#0f172a;">${escapeHtml(row.nodeLabel)}</td>
                <td style="text-align:center;">
                  <span class="pm-ref-id-badge">${escapeHtml(row.reqId)}</span>
                </td>
                <td style="font-size:0.78rem; color:#475569;">${escapeHtml(row.primaryRole)}</td>
                <td style="font-size:0.78rem; color:#64748b;">${escapeHtml(row.relatedRole)}</td>
                <td style="text-align:center;">
                  <span class="pm-status-badge pm-status-confirmed">${escapeHtml(row.status)}</span>
                </td>
              </tr>
            `
        )
        .join('')
    }
        </tbody>
      </table>
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

