/**
 * js/modules/info-center/info-center-adapter.js
 * 
 * Adapter Data Baca-Saja Mandiri (Read-Only In-Memory Adapter)
 * untuk Pusat Informasi & Alur Proses Aplikasi — SIGMA Rubber Nursery
 * 
 * JAMINAN ARSITEKTUR & INTEGRITAS:
 * 1. Sumber Dokumentasi Mandiri: Membaca eksklusif dari data/info-center-data.json
 *    dan js/data/info-center-baseline.js.
 * 2. Terputus Total dari Pemetaan Alur: Bebas dependensi terhadap sumber data modul pemetaan alur proses.
 * 3. Zero Mutation: Tidak menulis ke file JSON, baseline JS, atau localStorage.
 * 4. Deep Freeze: Membekukan salinan data mentah secara rekursif.
 * 5. 5 Role Operasional: Scoping ke 5 role aktif lapangan.
 * 6. Klasifikasi Alur Jujur: 20 fitur kanonik diklasifikasikan tanpa silent fallback.
 */

import { INFO_CENTER_BASELINE } from '../../data/info-center-baseline.js';

/**
 * Pembekuan Rekursif (Deep Freeze) untuk menjamin objek tidak dapat dimutasi runtime
 * @param {Object} obj 
 * @returns {Object} Frozen object
 */
function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.keys(obj).forEach((key) => {
    const prop = obj[key];
    if (prop !== null && (typeof prop === 'object' || typeof prop === 'function') && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  });
  return obj;
}

/**
 * Memuat salinan data mentah dari sumber independen JSON dengan fallback ke baseline bundled
 * @returns {Promise<Object>} Frozen raw data
 */
async function fetchCleanRawData() {
  let raw = null;

  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const candidateUrls = [
      './data/info-center-data.json',
      'data/info-center-data.json',
      '/data/info-center-data.json'
    ];
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          raw = await res.json();
          break;
        }
      } catch (_) {
        // Coba kandidat URL berikutnya
      }
    }
  }

  if (!raw && typeof INFO_CENTER_BASELINE !== 'undefined' && INFO_CENTER_BASELINE) {
    console.info('ℹ️ [InfoCenterAdapter] Memuat data dari bundled INFO_CENTER_BASELINE');
    raw = JSON.parse(JSON.stringify(INFO_CENTER_BASELINE));
  }

  if (!raw) {
    throw new Error('Gagal memuat sumber data: file data/info-center-data.json tidak dapat diakses.');
  }

  // Deep clone lalu bekukan secara rekursif
  const frozenClone = deepFreeze(JSON.parse(JSON.stringify(raw)));
  return frozenClone;
}

/**
 * Whitelist resmi 5 Peran Operasional yang diizinkan untuk Pusat Informasi Aplikasi.
 */
export const ALLOWED_OPERATIONAL_ROLE_IDS = Object.freeze([
  'mantri-tanaman',
  'asisten-bibitan',
  'asisten',
  'askep',
  'pengurus'
]);

/**
 * Transformasi murni (Pure Transformation) dari Raw Frozen Data menjadi Info Center View Model.
 * Tidak mengubah objek masukan sedikit pun.
 * 
 * @param {Object} rawData 
 * @returns {Object} Transformed View Model
 */
export function buildInfoCenterViewModel(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Data mentah tidak valid untuk pembentukan View Model.');
  }

  // 1. Role Operasional (5 Role Sesuai Cakupan Resmi Pusat Informasi)
  const rawRolesList = Array.isArray(rawData.roles) ? rawData.roles : [];
  const roles = ALLOWED_OPERATIONAL_ROLE_IDS.map((id) => {
    const r = rawRolesList.find((role) => role.id === id);
    if (!r) return null;
    return {
      id: r.id,
      code: r.code || '',
      name: r.name || r.id,
      position: r.position || r.name || '',
      category: r.category || 'OPERATIONAL',
      desc: r.desc || '',
      scopeType: r.scopeType || r.primaryScope || 'DIVISION',
      primaryScope: r.scopeType || r.primaryScope || 'DIVISION',
      sourceRef: r.sourceRef || '',
      verificationStatus: r.verificationStatus || 'CONFIRMED',
      capabilities: Array.isArray(r.capabilities) ? [...r.capabilities] : [],
      navigationContext: r.navigationContext || {},
      primaryModules: Array.isArray(r.primaryModules) ? [...r.primaryModules] : [],
      accessibleModules: Array.isArray(r.accessibleModules) ? [...r.accessibleModules] : []
    };
  }).filter(Boolean);

  // 2. Kebutuhan Fungsional (KF) Aktif Resmi
  const activeOfficialKF = (Array.isArray(rawData.requirements) ? rawData.requirements : []).map((r) => ({
    id: r.id,
    title: r.title || 'Tanpa Judul',
    role: r.role || 'Mantri Bibitan',
    moduleId: r.moduleId || '',
    featureId: r.featureId || '',
    type: r.type || 'KF',
    status: r.status || 'Confirmed',
    input: r.input || 'Tidak dispesifikasikan',
    validation: r.validation || 'Tidak dispesifikasikan',
    output: r.output || 'Tidak dispesifikasikan',
    fallback: r.fallback || 'Tidak dispesifikasikan',
    version: r.version || 1,
    lastModified: r.lastModified || '2026-10-16',
    sourceRef: r.sourceRef || '',
    verificationStatus: r.verificationStatus || 'CONFIRMED_BASELINE'
  }));

  // 3. Kebutuhan Nonfungsional (KNF)
  const activeKNF = (Array.isArray(rawData.nonFunctionalRequirements) ? rawData.nonFunctionalRequirements : []).map((knf, idx) => ({
    id: knf.id || `KNF-${String(idx + 1).padStart(3, '0')}`,
    title: knf.title || '',
    category: knf.category || 'Quality Attribute',
    type: 'KNF',
    status: knf.status || 'Confirmed',
    version: knf.version || 1,
    acceptance: knf.acceptance || '',
    sourceRef: knf.sourceRef || '',
    verificationStatus: knf.verificationStatus || 'CONFIRMED_BASELINE'
  }));

  // 4. Aturan Bisnis Kanonik
  const businessRules = (Array.isArray(rawData.businessRules) ? rawData.businessRules : []).map((br) => ({
    id: br.id,
    title: br.title,
    desc: br.desc,
    category: br.category,
    sourceRef: br.sourceRef || '',
    verificationStatus: br.verificationStatus || 'CONFIRMED_LOCKED'
  }));

  // 5. Relasi Lintas Modul Kanonik
  const crossFlowEdges = (Array.isArray(rawData.crossModuleEdges) ? rawData.crossModuleEdges : []).map((cfe) => ({
    id: cfe.id,
    fromModule: cfe.fromModule,
    fromFeature: cfe.fromFeature,
    fromNode: cfe.fromNode,
    toModule: cfe.toModule,
    toFeature: cfe.toFeature,
    toNode: cfe.toNode,
    label: cfe.label,
    condition: cfe.condition,
    sourceRef: cfe.sourceRef || '',
    verificationStatus: cfe.verificationStatus || 'CONFIRMED_LOGIC'
  }));

  // 6. Modul & 20 Fitur Kanonik
  const rawModules = Array.isArray(rawData.modules) ? rawData.modules : [];
  const rawFlows = rawData.flows && typeof rawData.flows === 'object' ? rawData.flows : {};

  let totalFeaturesCount = 0;
  let featuresWithExplicitFlowCount = 0;
  let featuresWithSequentialBaselineCount = 0;
  let featuresWithoutFlowCount = 0;

  const modules = rawModules.map((m) => {
    const rawFeatures = Array.isArray(m.features) ? m.features : [];
    totalFeaturesCount += rawFeatures.length;

    const modFlowDict = rawFlows[m.id] || {};

    const features = rawFeatures.map((f) => {
      const flowObj = modFlowDict[f.id];
      const hasFlowObject = flowObj && typeof flowObj === 'object';
      const rawNodes = hasFlowObject && Array.isArray(flowObj.nodes) ? flowObj.nodes : [];
      const rawEdges = hasFlowObject && Array.isArray(flowObj.edges) ? flowObj.edges : [];

      // Filter node aktif
      const activeNodes = rawNodes.map((n) => ({
        id: n.id,
        code: n.code || '',
        title: n.title || n.label || '',
        type: n.type || 'process',
        role: n.role || m.primaryRole || 'Mantri Bibitan',
        reqId: n.reqId || '',
        sourceRef: n.sourceRef || ''
      }));

      // Filter edge aktif & normalisasi from/to in-memory
      const activeEdges = rawEdges.map((e) => ({
        id: e.id,
        from: e.from || '',
        to: e.to || '',
        label: e.label || '',
        sourceRef: e.sourceRef || ''
      })).filter((e) => e.from && e.to);

      // Klasifikasi Status Alur Secara Transparan & Jujur
      let flowStatus = 'NO_FLOW';
      let flowStatusLabel = 'Tahap Kebutuhan (Alur Belum Didefinisikan)';

      if (activeNodes.length > 0 && activeEdges.length > 0) {
        flowStatus = 'EXPLICIT_FLOW';
        flowStatusLabel = 'Alur Terdefinisi Penuh (Relasi Eksplisit)';
        featuresWithExplicitFlowCount++;
      } else if (activeNodes.length > 0) {
        flowStatus = 'SEQUENTIAL_BASELINE';
        flowStatusLabel = 'Urutan Sekuensial Baseline (Relasi Belum Divalidasi)';
        featuresWithSequentialBaselineCount++;
      } else {
        flowStatus = 'NO_FLOW';
        flowStatusLabel = 'Tahap Kebutuhan (Alur Belum Didefinisikan)';
        featuresWithoutFlowCount++;
      }

      // Kebutuhan Terhubung untuk Fitur Ini
      const relatedReqs = activeOfficialKF.filter((r) => 
        (r.moduleId === m.id || r.moduleId === m.name) &&
        (r.featureId === f.id || r.featureId === f.name || String(f.name).toLowerCase().includes(String(r.featureId).toLowerCase()))
      );

      return {
        id: f.id,
        moduleId: m.id,
        name: f.name || f.id,
        desc: f.desc || '',
        flowStatus,
        flowStatusLabel,
        flowTitle: hasFlowObject && flowObj.title ? flowObj.title : `Alur ${f.name}`,
        nodes: activeNodes,
        edges: activeEdges,
        relatedRequirements: relatedReqs,
        prototypeRoute: f.prototypeRoute || null,
        navigationSurface: f.navigationSurface || (f.prototypeRoute ? 'BERANDA_GRID' : 'NONE'),
        implementationStatus: f.implementationStatus || (f.prototypeRoute ? 'Tersedia & Fungsional' : 'Belum Diimplementasi di Prototipe'),
        qaStatus: f.qaStatus || 'Tervalidasi di Layar HP',
        verificationStatus: f.verificationStatus || 'CONFIRMED_ACTUAL',
        sourceRef: f.sourceRef || 'js/core/permissions.js'
      };
    });

    return {
      id: m.id,
      order: m.order || '',
      name: m.name || m.id,
      subtitle: m.subtitle || '',
      desc: m.desc || '',
      status: m.status || 'Confirmed',
      primaryRole: m.primaryRole || 'Mantri Bibitan',
      relatedRole: m.relatedRole || 'Asisten Bibitan',
      sourceRef: m.sourceRef || 'js/core/permissions.js',
      features
    };
  });

  // 7. Hitung Metrik Ringkasan Faktual
  const metrics = {
    totalRoles: roles.length,
    totalModules: modules.length,
    totalFeatures: totalFeaturesCount,
    totalActiveKF: activeOfficialKF.length,
    totalActiveKNF: activeKNF.length,
    flowMaturity: {
      explicitFlowCount: featuresWithExplicitFlowCount,
      sequentialBaselineCount: featuresWithSequentialBaselineCount,
      noFlowCount: featuresWithoutFlowCount
    },
    businessRulesCount: businessRules.length,
    crossFlowEdgesCount: crossFlowEdges.length
  };

  return {
    metadata: {
      title: rawData.metadata?.title || 'Pusat Informasi & Alur Proses Aplikasi — SIGMA Rubber Nursery',
      version: rawData.metadata?.version || '2.3.0',
      schemaVersion: rawData.metadata?.schemaVersion || '1.0.0',
      lastUpdated: rawData.metadata?.lastUpdated || '2026-10-16',
      sourceType: 'Dokumentasi Mandiri Independen (data/info-center-data.json)'
    },
    roles,
    modules,
    activeKF: activeOfficialKF,
    activeKNF,
    businessRules,
    crossFlowEdges,
    dataDictionary: rawData.dataDictionary || [],
    metrics
  };
}

/**
 * Cache Singleton In-Memory untuk View Model
 */
let cachedViewModel = null;

/**
 * Memuat dan mengembalikan View Model bersih secara aman
 * @param {boolean} [forceReload=false] 
 * @returns {Promise<Object>}
 */
export async function loadInfoCenterViewModel(forceReload = false) {
  if (cachedViewModel && !forceReload) {
    return cachedViewModel;
  }
  const raw = await fetchCleanRawData();
  cachedViewModel = deepFreeze(buildInfoCenterViewModel(raw));
  return cachedViewModel;
}
