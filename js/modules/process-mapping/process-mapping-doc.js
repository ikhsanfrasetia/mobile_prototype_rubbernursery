/**
 * process-mapping-doc.js
 * Core Document Engine & Data Aggregator for SIGMA Rubber Nursery
 * 
 * Single Source of Truth (SSOT) Document Model Generator for:
 * - DOC-04: Requirements Traceability Matrix Report (RTM_REPORT)
 * - DOC-05: Gap Analysis & Technical Debt Report (GAP_REPORT)
 * 
 * Non-destructive, in-memory runtime aggregation engine.
 */

import {
  getActiveStore,
  getAllTraceabilityRecords,
  getRequirementTrace,
  getNodeTrace,
  getCoverageMetrics,
  getGapAnalysisReport,
  getRequirementCriteria
} from './process-mapping-data.js';

/**
 * Standard Document Type Enums
 */
export const DOCUMENT_TYPES = {
  RTM_REPORT: 'RTM_REPORT',
  GAP_REPORT: 'GAP_REPORT',
  BRD: 'BRD',
  SRS: 'SRS',
  BPD: 'BPD',
  MASTER_SPEC: 'MASTER_SPEC'
};

/**
 * Standard Document Status Enums
 */
export const DOCUMENT_STATUS = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED'
};

/**
 * Deep clone helper to ensure 100% immutability
 * @param {any} obj
 * @returns {any}
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return Array.isArray(obj) ? [...obj] : { ...obj };
  }
}

/**
 * 1. Collect Project Metadata
 * @param {Object} [store]
 * @returns {Object}
 */
export function collectProjectMetadata(store = getActiveStore()) {
  const meta = store?.metadata || {};
  return {
    projectName: 'SIGMA Rubber Nursery Management System',
    projectCode: 'SIGMA-RN',
    company: 'PT Socfin Indonesia (Socfindo)',
    department: 'Agronomy & Estate Operations',
    systemVersion: meta.version || '0.2.0',
    lastUpdated: meta.lastUpdated || new Date().toISOString().split('T')[0],
    updatedBy: meta.updatedBy || 'Business Analyst'
  };
}

/**
 * 2. Collect Roles Master (Dynamic from store.roles and active requirements)
 * @param {Object} [store]
 * @returns {Array<Object>}
 */
export function collectRoles(store = getActiveStore()) {
  const masterRoles = deepClone(store?.roles || []);
  const reqs = (store?.requirements || []).filter(r => !r.isArchived);
  
  // Count requirements per role dynamically
  const roleReqCounts = {};
  reqs.forEach(r => {
    if (r.role) {
      roleReqCounts[r.role] = (roleReqCounts[r.role] || 0) + 1;
    }
  });

  return masterRoles.map(role => ({
    ...role,
    requirementCount: roleReqCounts[role.name] || 0
  }));
}

/**
 * 3. Collect Modules Master
 * @param {Object} [store]
 * @returns {Array<Object>}
 */
export function collectModules(store = getActiveStore()) {
  const modules = deepClone(store?.modules || []);
  const reqs = (store?.requirements || []).filter(r => !r.isArchived);
  const flows = store?.flows || {};

  return modules.map(m => {
    const modReqs = reqs.filter(r => r.module === m.id || r.moduleId === m.id || r.module === m.name);
    const hasFlow = !!flows[m.id] || Object.values(flows).some(f => f.moduleId === m.id);
    return {
      ...m,
      totalRequirements: modReqs.length,
      hasFlow
    };
  });
}

/**
 * 4. Collect Features Master
 * @param {Object} [store]
 * @returns {Array<Object>}
 */
export function collectFeatures(store = getActiveStore()) {
  let rawFeatures = [];
  if (Array.isArray(store?.features)) {
    rawFeatures = store.features;
  } else if (Array.isArray(store?.modules)) {
    store.modules.forEach(m => {
      if (Array.isArray(m.features)) {
        m.features.forEach(f => {
          rawFeatures.push({
            ...f,
            moduleId: m.id,
            moduleName: m.name
          });
        });
      }
    });
  }

  const features = deepClone(rawFeatures);
  const flows = store?.flows || {};
  const reqs = (store?.requirements || []).filter(r => !r.isArchived);

  return features.map(f => {
    const featReqs = reqs.filter(r => r.featureId === f.id || r.feature === f.id);
    const hasFlow = !!flows[f.id];
    return {
      ...f,
      requirementCount: featReqs.length,
      hasFlow
    };
  });
}

/**
 * 5. Collect Active Requirements Master
 * @param {Object} [store]
 * @returns {Array<Object>}
 */
export function collectRequirements(store = getActiveStore()) {
  const reqs = (store?.requirements || []).filter(r => !r.isArchived);
  return reqs.map(r => ({
    ...deepClone(r),
    canonicalCriteria: getRequirementCriteria(r)
  }));
}

/**
 * 6. Collect Master Business Rules
 * @param {Object} [store]
 * @returns {Array<Object>}
 */
export function collectBusinessRules(store = getActiveStore()) {
  const rules = deepClone(store?.businessRules || []);
  const reqs = (store?.requirements || []).filter(r => !r.isArchived);

  return rules.map(rule => {
    const linkedReqs = reqs.filter(r => Array.isArray(r.ruleIds) && r.ruleIds.includes(rule.id));
    return {
      ...rule,
      linkedRequirementCount: linkedReqs.length,
      linkedRequirementIds: linkedReqs.map(r => r.id)
    };
  });
}

/**
 * 7. Collect Flows Master
 * @param {Object} [store]
 * @returns {Object}
 */
export function collectFlows(store = getActiveStore()) {
  return deepClone(store?.flows || {});
}

/**
 * 8. Collect Traceability Records
 * @returns {Array<Object>}
 */
export function collectTraceability() {
  return deepClone(getAllTraceabilityRecords());
}

/**
 * 9. Collect Coverage Metrics
 * @returns {Object}
 */
export function collectCoverage() {
  return deepClone(getCoverageMetrics());
}

/**
 * 10. Collect Gap Analysis Report
 * @returns {Object}
 */
export function collectGapAnalysis() {
  return deepClone(getGapAnalysisReport());
}

/**
 * 11. Calculate Document Provenance
 * Answers: "Dokumen ini dibuat berdasarkan data versi apa?"
 * @param {Object} [store]
 * @returns {Object}
 */
export function calculateDocumentProvenance(store = getActiveStore()) {
  const meta = collectProjectMetadata(store);
  const metrics = collectCoverage();
  const gapReport = collectGapAnalysis();
  const masterRules = collectBusinessRules(store);

  return {
    systemCode: meta.projectCode,
    systemName: meta.projectName,
    company: meta.company,
    dataVersion: meta.systemVersion,
    generatedTimestamp: new Date().toISOString(),
    gitCommit: '1066f369d7b93a0b16867dc1f855d0f6ae2347fa', // Baseline Git Checkpoint
    activeRequirementsCount: metrics.totalActiveRequirements,
    flowRequiredCount: metrics.flowRequired,
    flowCoveredCount: metrics.flowCovered,
    trueGapCount: metrics.flowGap || gapReport.totalGaps,
    businessManagementCount: metrics.managementRequirements,
    masterBusinessRulesCount: masterRules.length,
    linkedBusinessRulesRequirementCount: metrics.requirementsWithBusinessRules,
    flowCoverageRate: metrics.flowCoverageRate,
    totalTraceabilityHealth: metrics.totalTraceabilityHealth
  };
}

/**
 * 12. Resolve Document Metadata
 * @param {string} documentType
 * @param {Object} [customMeta]
 * @param {Object} [store]
 * @returns {Object}
 */
export function resolveDocumentMetadata(documentType, customMeta = {}, store = getActiveStore()) {
  const projectMeta = collectProjectMetadata(store);
  const provenance = calculateDocumentProvenance(store);
  const now = new Date();

  const typeConfig = {
    [DOCUMENT_TYPES.RTM_REPORT]: {
      documentId: 'SIGMA-RN-DOC-04-RTM',
      title: 'Requirements Traceability Matrix (RTM) Report',
      docCode: 'DOC-04',
      version: 'v1.0.0',
      description: 'Laporan Audit Matriks Keterlacakan Kebutuhan Fungsional, Alur Kerja, dan Aturan Bisnis SIGMA Rubber Nursery.'
    },
    [DOCUMENT_TYPES.GAP_REPORT]: {
      documentId: 'SIGMA-RN-DOC-05-GAP',
      title: 'Gap Analysis & Technical Debt Report',
      docCode: 'DOC-05',
      version: 'v1.0.0',
      description: 'Laporan Audit Kesenjangan Alur Kerja Proses Bisnis (True Gaps) dan Kesiapan Implementasi Mobile SIGMA Rubber Nursery.'
    }
  }[documentType] || {
    documentId: `SIGMA-RN-${documentType}`,
    title: `Specification Document (${documentType})`,
    docCode: 'DOC-GEN',
    version: 'v1.0.0',
    description: 'Dokumen Spesifikasi Teknis SIGMA Rubber Nursery.'
  };

  return {
    documentId: customMeta.documentId || typeConfig.documentId,
    docCode: typeConfig.docCode,
    documentType,
    title: customMeta.title || typeConfig.title,
    systemName: projectMeta.projectName,
    systemCode: projectMeta.projectCode,
    company: projectMeta.company,
    department: projectMeta.department,
    documentVersion: customMeta.documentVersion || typeConfig.version,
    documentStatus: customMeta.documentStatus || DOCUMENT_STATUS.DRAFT,
    description: customMeta.description || typeConfig.description,
    generatedDate: now.toISOString(),
    generatedDateFormatted: now.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    generatedBy: customMeta.generatedBy || 'Lead Business Analyst',
    reviewer: customMeta.reviewer || 'Product Manager / QA Lead',
    sourceBaseline: provenance
  };
}

/**
 * 13. Reusable Table of Contents Generator
 * Extracts numbered sections from document structure
 * @param {Array<Object>} sections
 * @returns {Array<Object>}
 */
export function buildTableOfContents(sections = []) {
  return sections.map((sec, index) => {
    const secNumber = `${index + 1}.0`;
    const subsections = (sec.subsections || []).map((sub, subIndex) => ({
      number: `${index + 1}.${subIndex + 1}`,
      id: sub.id || `sec-${index + 1}-${subIndex + 1}`,
      title: sub.title
    }));

    return {
      number: secNumber,
      id: sec.id || `sec-${index + 1}`,
      title: sec.title,
      subsections
    };
  });
}

/**
 * 14. Build RTM Document Model (DOC-04)
 * @param {Object} [options]
 * @param {Object} [store]
 * @returns {Object}
 */
export function buildRtmDocumentModel(options = {}, store = getActiveStore()) {
  const metadata = resolveDocumentMetadata(DOCUMENT_TYPES.RTM_REPORT, options, store);
  const traceabilityRecords = collectTraceability();
  const coverage = collectCoverage();
  const roles = collectRoles(store);
  const modules = collectModules(store);

  // Group RTM records by module for structured executive presentation
  const rtmByModule = {};
  modules.forEach(m => {
    rtmByModule[m.id] = {
      moduleId: m.id,
      moduleName: m.name,
      moduleOrder: m.order,
      records: []
    };
  });

  traceabilityRecords.forEach(rec => {
    const modId = rec.module?.id || rec.requirement?.module || 'other';
    if (!rtmByModule[modId]) {
      rtmByModule[modId] = {
        moduleId: modId,
        moduleName: rec.module?.name || 'Lainnya',
        moduleOrder: 99,
        records: []
      };
    }
    rtmByModule[modId].records.push(rec);
  });

  const moduleGroups = Object.values(rtmByModule)
    .sort((a, b) => (a.moduleOrder || 99) - (b.moduleOrder || 99))
    .filter(g => g.records.length > 0);

  const sections = [
    {
      id: 'sec-doc-control',
      title: 'Document Control & Governance',
      subsections: [
        { id: 'sub-doc-info', title: 'Informasi Dokumen & Versi' },
        { id: 'sub-revision-hist', title: 'Riwayat Revisi Dokumen' },
        { id: 'sub-signoff', title: 'Lembar Persetujuan & Tanda Tangan' }
      ]
    },
    {
      id: 'sec-exec-summary',
      title: 'Ringkasan Eksekutif Keterlacakan',
      subsections: [
        { id: 'sub-scope', title: 'Ruang Lingkup Keterlacakan' },
        { id: 'sub-metrics', title: 'Metrik Kesehatan Traceability Runtime' },
        { id: 'sub-roles', title: 'Peran & Tanggung Jawab Operasional' }
      ]
    },
    {
      id: 'sec-rtm-matrix',
      title: 'Matriks Keterlacakan Kebutuhan (RTM Detail)',
      subsections: moduleGroups.map(g => ({
        id: `sub-mod-${g.moduleId}`,
        title: `Modul: ${g.moduleName} (${g.records.length} Requirements)`
      }))
    },
    {
      id: 'sec-coverage-summary',
      title: 'Analisis Cakupan & Distribusi Kebutuhan',
      subsections: [
        { id: 'sub-classification-breakdown', title: 'Klasifikasi Traceability (Covered vs Gap vs Management)' },
        { id: 'sub-rule-coverage', title: 'Distribusi Keterkaitan Aturan Bisnis' }
      ]
    },
    {
      id: 'sec-provenance-appendix',
      title: 'Provenansi Data & Lampiran',
      subsections: [
        { id: 'sub-data-provenance', title: 'Integritas & Provenansi Baseline Data' },
        { id: 'sub-glossary', title: 'Glosarium Istilah' }
      ]
    }
  ];

  const toc = buildTableOfContents(sections);

  return {
    documentType: DOCUMENT_TYPES.RTM_REPORT,
    metadata,
    tableOfContents: toc,
    sections,
    data: {
      traceabilityRecords,
      totalRecords: traceabilityRecords.length,
      moduleGroups,
      coverage,
      roles,
      modules
    },
    provenance: metadata.sourceBaseline,
    generatedAt: metadata.generatedDate
  };
}

/**
 * 15. Build Gap Analysis Document Model (DOC-05)
 * @param {Object} [options]
 * @param {Object} [store]
 * @returns {Object}
 */
export function buildGapDocumentModel(options = {}, store = getActiveStore()) {
  const metadata = resolveDocumentMetadata(DOCUMENT_TYPES.GAP_REPORT, options, store);
  const gapReport = collectGapAnalysis();
  const coverage = collectCoverage();
  const modules = collectModules(store);

  // Filter modules that have true gaps
  const activeGapModules = gapReport.moduleSummary.filter(m => m.totalGaps > 0);

  const sections = [
    {
      id: 'sec-doc-control',
      title: 'Document Control & Governance',
      subsections: [
        { id: 'sub-doc-info', title: 'Informasi Dokumen & Status Audit' },
        { id: 'sub-revision-hist', title: 'Riwayat Revisi Dokumen' },
        { id: 'sub-signoff', title: 'Lembar Persetujuan Technical Debt' }
      ]
    },
    {
      id: 'sec-gap-summary',
      title: 'Ringkasan Eksekutif Kesenjangan Alur (Gap Summary)',
      subsections: [
        { id: 'sub-gap-overview', title: 'Kondisi Kesenjangan Alur Mobile Saat Ini' },
        { id: 'sub-gap-metrics', title: 'Metrik Kuantitatif Kesenjangan' },
        { id: 'sub-gap-by-module-overview', title: 'Distribusi Gap Berdasarkan Modul Kebun' }
      ]
    },
    {
      id: 'sec-gap-by-module',
      title: activeGapModules.length > 0 
        ? 'Rincian Kesenjangan Alur Berdasarkan Modul (True Gaps)' 
        : 'Status Kesenjangan Alur Kerja (0 True Gap)',
      subsections: activeGapModules.length > 0
        ? activeGapModules.map(m => ({
            id: `sub-gap-mod-${m.moduleId}`,
            title: `Modul ${m.moduleName} (${m.totalGaps} True Gaps)`
          }))
        : [{ id: 'sub-zero-gap-status', title: 'Status Kesenjangan Alur Kerja (0 True Gap)' }]
    },
    {
      id: 'sec-remediation-plan',
      title: activeGapModules.length > 0
        ? 'Rekomendasi & Rencana Tindak Lanjut (Action Plan)'
        : 'Status Verifikasi & Kesiapan Implementasi (Zero Gap)',
      subsections: activeGapModules.length > 0
        ? [
            { id: 'sub-remediation-steps', title: 'Langkah Implementasi Node Alur Proses' },
            { id: 'sub-priority-matrix', title: 'Matriks Prioritas Penutupan Gap' }
          ]
        : [
            { id: 'sub-ready-status', title: 'Kesiapan Baseline untuk Implementasi Mobile' }
          ]
    },
    {
      id: 'sec-provenance-appendix',
      title: 'Provenansi Data & Lampiran',
      subsections: [
        { id: 'sub-data-provenance', title: 'Integritas & Provenansi Baseline Data' },
        { id: 'sub-management-note', title: 'Catatan Khusus Kebutuhan Manajemen (Non-Gap)' }
      ]
    }
  ];

  const toc = buildTableOfContents(sections);

  return {
    documentType: DOCUMENT_TYPES.GAP_REPORT,
    metadata,
    tableOfContents: toc,
    sections,
    data: {
      gapRecords: gapReport.gapRecords,
      totalGaps: gapReport.totalGaps,
      moduleSummary: gapReport.moduleSummary,
      activeGapModules,
      coverage,
      modules
    },
    provenance: metadata.sourceBaseline,
    generatedAt: metadata.generatedDate
  };
}

/**
 * 16. Unified Master Document Model Builder
 * @param {string} documentType
 * @param {Object} [options]
 * @param {Object} [store]
 * @returns {Object}
 */
export function buildDocumentModel(documentType, options = {}, store = getActiveStore()) {
  switch (documentType) {
    case DOCUMENT_TYPES.RTM_REPORT:
      return buildRtmDocumentModel(options, store);
    case DOCUMENT_TYPES.GAP_REPORT:
      return buildGapDocumentModel(options, store);
    default:
      throw new Error(`Unsupported document type: ${documentType}`);
  }
}
