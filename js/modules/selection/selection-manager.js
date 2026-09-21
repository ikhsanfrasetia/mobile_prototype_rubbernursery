/**
 * js/modules/selection/selection-manager.js
 * Manager, Business Logic, & Resolver for Pemeriksaan Hasil Seleksi (TASK ASB-09)
 * 
 * Prinsip:
 * - Dikelola oleh Role ASISTEN_BIBITAN (Pemeriksaan, Setujui, Kembalikan)
 * - Diinput/diajukan oleh MANTRI_TANAMAN
 * - PENTING: ZERO STOCK MUTATION (Mutasi stok ditunda ke ASB-13)
 * - Single Source of Truth: storage key 'selection_transactions'
 * - Traceability: Selection -> Batch -> Bedengan -> Program -> Estate -> Divisi
 */

import { storage } from '../../core/storage.js';
import { normalizeRole, ROLES } from '../../core/user-context.js';
import { getBatchById, getBatchByCode } from '../../data/batch-master.js';
import { getBedenganById } from '../../data/bedengan-master.js';
import { getProgramById } from '../../data/program-master.js';
import { getEstateById, resolveNurseryDivision } from '../../data/estate-master.js';
import { formatStandardDocNo, formatDate } from '../../core/utils.js';
import { applyTransactionActor, AUDIT_EVENT_TYPES } from '../../core/transaction-actor.js';
import { 
  deductBatchStock as deductInventoryStock, 
  getAvailableQty as getInventoryAvailableQty, 
  INVENTORY_TX_TYPE 
} from '../../core/batch-inventory-service.js';
import { getBatchContext } from '../../core/master-context-service.js';

export const SELECTION_STATUS = Object.freeze({
  MENUNGGU_VERIFIKASI: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  DIAJUKAN: 'DIAJUKAN_PEMERIKSAAN',
  DISETUJUI: 'DISETUJUI',
  DIKEMBALIKAN: 'DIKEMBALIKAN'
});

export const SELECTION_STAGES = Object.freeze({
  SELEKSI_1: 'SELEKSI_I',
  SELEKSI_2: 'SELEKSI_II',
  SELEKSI_3: 'SELEKSI_III',
  PASCA_OKULASI: 'SELEKSI_PASCA_OKULASI'
});

export const SELECTION_TYPES = Object.freeze({
  PRA_OKULASI: 'PRA_OKULASI',
  PASCA_OKULASI: 'PASCA_OKULASI'
});

export const STOCK_MUTATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPLIED: 'APPLIED',
  NOT_REQUIRED: 'NOT_REQUIRED',
  FAILED: 'FAILED',
  ALREADY_APPLIED: 'ALREADY_APPLIED'
});

export const SELECTION_STORAGE_KEY = 'selection_transactions';
export const PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY = 'pre_grafting_selection_documents';

/**
 * Memeriksa apakah suatu item seleksi merupakan Seleksi Pra-Okulasi (Seleksi I/II/III)
 */
export function isPreGraftingSelection(item) {
  if (!item) return false;
  const stage = String(item.selectionStage || item.stage || '').toUpperCase();
  const type = String(item.selectionType || '').toUpperCase();
  return (
    type === SELECTION_TYPES.PRA_OKULASI ||
    stage === SELECTION_STAGES.SELEKSI_1 ||
    stage === SELECTION_STAGES.SELEKSI_2 ||
    stage === SELECTION_STAGES.SELEKSI_3 ||
    stage === 'SELEKSI_1' || stage === 'SELEKSI_2' || stage === 'SELEKSI_3' ||
    stage === 'SELEKSI_I' || stage === 'SELEKSI_II' || stage === 'SELEKSI_III'
  );
}

/**
 * Memeriksa apakah suatu item seleksi merupakan Seleksi Pasca-Okulasi (Afkir / Culling)
 */
export function isPostGraftingSelection(item) {
  return !isPreGraftingSelection(item);
}

/**
 * Format label tahap seleksi (Pra-Okulasi I-III vs Pasca-Okulasi)
 */
export function getSelectionStageLabel(item) {
  if (!item) return 'Seleksi';
  const stage = String(item.selectionStage || item.stage || '').toUpperCase();
  if (stage === SELECTION_STAGES.SELEKSI_1 || stage === 'SELEKSI_1' || stage === 'SELEKSI_I') return 'Seleksi I (Pra-Okulasi)';
  if (stage === SELECTION_STAGES.SELEKSI_2 || stage === 'SELEKSI_2' || stage === 'SELEKSI_II') return 'Seleksi II (Pra-Okulasi)';
  if (stage === SELECTION_STAGES.SELEKSI_3 || stage === 'SELEKSI_3' || stage === 'SELEKSI_III') return 'Seleksi III (Pra-Okulasi)';
  if (stage === SELECTION_STAGES.PASCA_OKULASI) return 'Seleksi Pasca-Okulasi';
  return getSelectionSourceLabel(item);
}

/**
 * Validasi otorisasi Asisten Bibitan untuk memeriksa seleksi
 */
export function canPerformAsistenSelectionAction(item, currentUser) {
  if (!item || !currentUser) return false;
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) return false;

  // Scope: Estate match
  if (currentUser.estateId && item.estateId && currentUser.estateId !== item.estateId) {
    return false;
  }

  // Scope: Division match if present on user
  if (currentUser.divisionId && item.divisionId && currentUser.divisionId !== item.divisionId) {
    return false;
  }

  const s = (item.status || '').toUpperCase();
  return (
    s === SELECTION_STATUS.MENUNGGU_VERIFIKASI ||
    s === SELECTION_STATUS.DIAJUKAN ||
    s === 'PENDING_DECLARATION'
  );
}

/**
 * Filter daftar hasil seleksi sesuai scope pengguna
 */
export function filterSelectionByScope(records, currentUser) {
  if (!Array.isArray(records) || !currentUser) return [];
  const role = normalizeRole(currentUser.role || currentUser.rawRole);

  return records.filter(item => {
    // Estate scope
    if (currentUser.estateId && item.estateId && item.estateId !== currentUser.estateId) {
      return false;
    }
    // Division scope for division-level roles
    if (currentUser.divisionId && item.divisionId && item.divisionId !== currentUser.divisionId) {
      return false;
    }
    return true;
  });
}

/**
 * Hitung jumlah transaksi/dokumen seleksi yang memerlukan tindakan Asisten Bibitan
 */
export function getActionableSelectionCount(records = null, currentUser) {
  if (!currentUser) return 0;
  if (records !== null && Array.isArray(records)) {
    return records.filter(item => canPerformAsistenSelectionAction(item, currentUser)).length;
  }
  const preDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const preCount = preDocs.filter(item => canPerformAsistenSelectionAction(item, currentUser)).length;
  const list = storage.get(SELECTION_STORAGE_KEY, []);
  const txCount = list.filter(item => canPerformAsistenSelectionAction(item, currentUser)).length;
  return preCount + txCount;
}

/**
 * Memeriksa apakah terdapat transaksi/dokumen penyeleksian yang memerlukan aksi user sesuai peran & scope
 */
export function hasActionableSelection(currentUser) {
  if (!currentUser) return false;
  const role = normalizeRole(currentUser.role || currentUser.rawRole);

  if (role === ROLES.ASISTEN_BIBITAN || role === ROLES.ASISTEN) {
    return getActionableSelectionCount(null, currentUser) > 0;
  }

  // Untuk Mantri Tanaman / Mantri Bibitan
  if (role === ROLES.MANTRI_TANAMAN || role === 'MANTRI' || role === 'MANTRI_BIBITAN' || isMantriRole(currentUser)) {
    // A. Pre-grafting Selection Documents (Seleksi I, II, III)
    const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
    const scopedDocs = filterSelectionByScope(allDocs, currentUser);

    const seleksi1Docs = scopedDocs.filter(d => (d.selectionStage || 'SELEKSI_I') === 'SELEKSI_I' || d.selectionStage === 'SELEKSI_1');
    const seleksi2Docs = scopedDocs.filter(d => d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2');
    const seleksi3Docs = scopedDocs.filter(d => d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3');

    // 1. Cek Dokumen Seleksi I
    for (const doc of seleksi1Docs) {
      const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
      const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
      const isFinal = Boolean(doc.isFinal);
      if (!isApproved && !isSubmitted) {
        return true; // Perlu dicatat transaksi, dideklarasikan selesai, atau diajukan ke Asisten
      }
      if (isApproved && isFinal) {
        // Cek apakah Seleksi II sudah dibuat dari Seleksi I ini
        const hasSel2 = seleksi2Docs.some(d => 
          d.sourceSelectionDocumentId === doc.id || 
          d.sourceSelectionDocNo === doc.docNo || 
          d.sourceDocNo === doc.docNo
        );
        if (!hasSel2) return true; // Mantri perlu membuat Dokumen Seleksi II
      }
    }

    // 2. Cek Dokumen Seleksi II
    for (const doc of seleksi2Docs) {
      const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
      const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
      const isFinal = Boolean(doc.isFinal);
      if (!isApproved && !isSubmitted) {
        return true;
      }
      if (isApproved && isFinal) {
        // Cek apakah Seleksi III sudah dibuat dari Seleksi II ini
        const hasSel3 = seleksi3Docs.some(d => 
          d.sourceSelectionDocumentId === doc.id || 
          d.sourceSelectionDocNo === doc.docNo || 
          d.sourceDocNo === doc.docNo
        );
        if (!hasSel3) return true; // Mantri perlu membuat Dokumen Seleksi III
      }
    }

    // 3. Cek Dokumen Seleksi III
    for (const doc of seleksi3Docs) {
      const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
      const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
      if (!isApproved && !isSubmitted) {
        return true;
      }
    }

    // B. Post-grafting Afkir Pool (Hanya REJECT_OKULASI, REJECT_PEMERIKSAAN, REJECT_REGRAFTING)
    const isPostGraftingReject = (item) => (
      item && (
        item.originType === 'REJECT_OKULASI' ||
        item.originType === 'REJECT_PEMERIKSAAN' ||
        item.originType === 'REJECT_REGRAFTING'
      )
    );
    const rawPool = storage.get('selection_pool', []);
    const scopedPool = filterSelectionByScope(rawPool, currentUser).filter(isPostGraftingReject);
    for (const item of scopedPool) {
      if (item.status !== 'DECLARED_CULLED' && !findExistingSelectionTransaction(item)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Format label sumber transaksi asal seleksi
 */
export function getSelectionSourceLabel(item) {
  if (!item) return 'Transaksi Seleksi';
  if (item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN') {
    return 'Pemeriksaan Dederan';
  }
  if (item.sourceModule === 'PENYEMAIAN' || item.originType === 'REJECT_PENYEMAIAN') {
    return 'Transaksi Penyemaian';
  }
  if (item.originType === 'REJECT_OKULASI') {
    return 'Okulasi (Grafting)';
  }
  if (item.originType === 'REJECT_REGRAFTING') {
    return 'Okulasi Janda (Regrafting)';
  }
  if (item.originType === 'REJECT_PEMERIKSAAN' || item.inspectionDocNo) {
    return 'Pemeriksaan Okulasi';
  }
  if (item.originType === 'REJECT_PENERIMAAN') {
    return 'Penerimaan Bibit';
  }
  return item.sourceModule || item.sumberAsal || 'Transaksi Seleksi';
}

/**
 * Format label kategori penyeleksian (Rusak / Mati / Lainnya)
 */
export function getSelectionCategoryLabel(item) {
  if (!item) return 'Afkir';
  const cat = String(item.category || item.alasanDitolakCategory || '').trim().toUpperCase();
  if (cat === 'RUSAK') return 'Rusak';
  if (cat === 'MATI') return 'Mati';
  if (cat === 'LAINNYA') return 'Lainnya';
  if (item.alasan && item.alasan !== '-' && !item.alasan.startsWith('Bibit ')) {
    return item.alasan;
  }
  return 'Afkir';
}

function formatSingleBedenganCode(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^BED-\d+/i.test(s)) return s.toUpperCase();
  const match = s.match(/Bedengan[- ]*(\d+)/i);
  if (match) {
    return `BED-${String(match[1]).padStart(3, '0')}`;
  }
  const digits = s.match(/^(\d+)$/);
  if (digits) {
    return `BED-${String(digits[1]).padStart(3, '0')}`;
  }
  return s;
}

/**
 * Format Bedengan agar hanya menampilkan Kode Bisnis Bedengan saja (BED-001, BED-002)
 */
export function formatBedenganDisplayCode(item) {
  if (!item) return '-';
  
  if (typeof item === 'string') {
    const parts = item.split(',').map(p => formatSingleBedenganCode(p.trim())).filter(Boolean);
    return parts.length > 0 ? Array.from(new Set(parts)).join(', ') : '-';
  }

  // If bedenganCode exists
  if (item.bedenganCode && typeof item.bedenganCode === 'string') {
    const parts = item.bedenganCode.split(',').map(s => formatSingleBedenganCode(s.trim())).filter(Boolean);
    if (parts.length > 0) return Array.from(new Set(parts)).join(', ');
  }

  // If bedenganIds exists (array of IDs or codes)
  if (Array.isArray(item.bedenganIds) && item.bedenganIds.length > 0) {
    const resolved = item.bedenganIds.map(idOrCode => {
      const bObj = getBedenganById(idOrCode);
      if (bObj && bObj.bedenganCode) return formatSingleBedenganCode(bObj.bedenganCode);
      return formatSingleBedenganCode(idOrCode);
    }).filter(Boolean);
    if (resolved.length > 0) return Array.from(new Set(resolved)).join(', ');
  }

  if (item.bedenganId) {
    const bObj = getBedenganById(item.bedenganId);
    if (bObj && bObj.bedenganCode) return formatSingleBedenganCode(bObj.bedenganCode);
  }

  if (item.bedengan) {
    const str = String(item.bedengan).trim();
    if (str === '-' || !str) return '-';
    const parts = str.split(',').map(p => formatSingleBedenganCode(p.trim())).filter(Boolean);
    if (parts.length > 0) return Array.from(new Set(parts)).join(', ');
  }

  return '-';
}


/**
 * Validasi form pengajuan / input hasil seleksi
 */
export function validateSelectionData(payload) {
  const errors = [];
  if (!payload) {
    return { isValid: false, errors: ['Data seleksi tidak boleh kosong.'] };
  }

  const checked = parseInt(payload.jumlahDiperiksa || payload.totalChecked || 0, 10);
  const pass = parseInt(payload.jumlahLayak || payload.layakQty || 0, 10);
  const cull = parseInt(payload.jumlahAfkir || payload.afkirQty || 0, 10);

  if (isNaN(checked) || checked <= 0) {
    errors.push('Jumlah bibit yang diperiksa harus lebih besar dari 0.');
  }
  if (isNaN(pass) || pass < 0) {
    errors.push('Jumlah bibit layak tidak boleh negatif.');
  }
  if (isNaN(cull) || cull < 0) {
    errors.push('Jumlah bibit afkir tidak boleh negatif.');
  }
  if (pass + cull !== checked) {
    errors.push(`Kombinasi Layak (${pass.toLocaleString('id-ID')}) + Afkir (${cull.toLocaleString('id-ID')}) harus sama dengan Total Diperiksa (${checked.toLocaleString('id-ID')}).`);
  }

  if (!payload.batchId && !payload.batchCode && !payload.batchNo) {
    errors.push('Batch sumber bibit wajib dipilih.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    checked,
    pass,
    cull
  };
}

/**
 * Cari existing selection transaction berdasarkan identitas source selection
 */
export function findExistingSelectionTransaction(item) {
  if (!item) return null;
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  
  const normCat = (c) => String(c || '').trim().toUpperCase();
  const itemCat = normCat(item.category || item.alasanDitolakCategory || 'AFKIR');
  const itemSourceDoc = String(item.sourceDocNo || item.seedingDocNo || item.buddingDocNo || item.inspectionDocNo || '').trim();
  const itemSourceTxId = String(item.sourceTransactionId || itemSourceDoc || item.id || '').trim();
  const itemDocNo = String(item.docNo || item.selectionNo || item.selectionPoolDocNo || '').trim();

  return allTxs.find(tx => {
    // 1. Direct match by transaction ID or Selection ID
    if (item.selectionTransactionId && (tx.id === item.selectionTransactionId || tx.selectionId === item.selectionTransactionId)) {
      return true;
    }
    if (item.id && (tx.id === item.id || tx.selectionId === item.id)) {
      return true;
    }

    // 2. Direct match by selectionPoolDocNo or docNo
    if (itemDocNo && (tx.selectionPoolDocNo === itemDocNo || tx.docNo === itemDocNo)) {
      if (itemCat && normCat(tx.category) !== itemCat && itemCat !== 'PENDING_DECLARATION' && normCat(tx.category) !== 'PENDING_DECLARATION') return false;
      return true;
    }

    // 3. Match by source selection identity (sourceDocNo / sourceTransactionId + category + module)
    const txSourceDoc = String(tx.sourceDocNo || '').trim();
    const txSourceTxId = String(tx.sourceTransactionId || '').trim();
    const txCat = normCat(tx.category || tx.alasanDitolakCategory || 'AFKIR');

    const validItemDoc = itemSourceDoc && itemSourceDoc !== '-';
    const validTxDoc = txSourceDoc && txSourceDoc !== '-';
    const validItemTxId = itemSourceTxId && itemSourceTxId !== '-';
    const validTxTxId = txSourceTxId && txSourceTxId !== '-';

    const sourceMatches = (
      (validItemDoc && validTxDoc && itemSourceDoc === txSourceDoc) ||
      (validItemTxId && validTxTxId && itemSourceTxId === txSourceTxId) ||
      (validItemDoc && validTxTxId && itemSourceDoc === txSourceTxId) ||
      (validItemTxId && validTxDoc && itemSourceTxId === txSourceDoc)
    );

    if (sourceMatches) {
      if (itemCat === txCat) return true;
      if (item.originType === tx.originType && (item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN')) return true;
    }

    return false;
  }) || null;
}

/**
 * Membuat transaksi hasil seleksi baru (oleh Mantri Bibitan)
 */
export function createSelectionRecord(payload, currentUser) {
  const val = validateSelectionData(payload);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  // Idempotency: Cari transaksi yang sudah ada untuk source yang sama
  const existingRecord = findExistingSelectionTransaction(payload);
  if (existingRecord) {
    return existingRecord;
  }

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  
  let docNo = payload.docNo || payload.selectionNo;
  if (!docNo) {
    let maxSeq = 0;
    allRecords.forEach(r => {
      const d = String(r.docNo || r.selectionNo || '');
      const match = d.match(/CULL\/(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
    docNo = formatStandardDocNo(2026, 'CULL', maxSeq + 1);
  }

  // Resolve batch metadata
  const bObj = payload.batchId ? getBatchById(payload.batchId) : getBatchByCode(payload.batchCode || payload.batchNo);
  const batchId = bObj ? bObj.id : (payload.batchId || `BATCH-${Date.now()}`);
  const batchCode = bObj ? (bObj.batchCode || bObj.batchNo) : (payload.batchCode || payload.batchNo || 'B-001');

  // Resolve bedengan
  const bedenganIds = payload.bedenganIds || (payload.bedenganId ? [payload.bedenganId] : (bObj?.bedenganIds || []));

  const newRecord = applyTransactionActor(
    {
      id: payload.id || `SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      selectionId: payload.selectionId || `SEL-${Date.now()}`,
      docNo: docNo,
      selectionNo: docNo,
      selectionPoolDocNo: payload.selectionPoolDocNo || docNo,
      parentSelectionDocNo: payload.parentSelectionDocNo || payload.selectionDocNo || null,
      parentSelectionDocumentId: payload.parentSelectionDocumentId || payload.selectionDocumentId || null,
      selectionDocumentId: payload.selectionDocumentId || payload.parentSelectionDocumentId || null,
      sourceModule: payload.sourceModule || 'PENYEMAIAN',
      sourceTransactionType: payload.sourceTransactionType || 'SEEDING',
      sourceTransactionId: payload.sourceTransactionId || payload.sourceDocNo || docNo,
      sourceDocNo: payload.sourceDocNo || '-',
      transactionType: 'PEMERIKSAAN_HASIL_SELEKSI',
      
      batchId: batchId,
      batchCode: batchCode,
      
      estateId: payload.estateId || bObj?.estateId || currentUser.estateId,
      estateName: payload.estateName || bObj?.estateName || currentUser.estateName || '-',
      divisionId: payload.divisionId || bObj?.divisionId || currentUser.divisionId,
      divisionName: payload.divisionName || bObj?.divisionName || currentUser.divisionName || '-',
      
      programId: payload.programId || bObj?.programId || 'PRG-2026-001',
      programName: payload.programName || bObj?.programName || '-',
      
      clone: payload.clone || payload.klon || bObj?.clone || 'IRCA 19',
      klon: payload.clone || payload.klon || bObj?.clone || 'IRCA 19',
      growthStage: payload.growthStage || payload.stage || bObj?.growthStage || 'Rubber Advance Planting Material',
      category: payload.category || bObj?.category || 'Polibag Besar',
      
      bedenganIds: bedenganIds,
      bedenganId: bedenganIds.length > 0 ? bedenganIds[0] : (payload.bedenganId || null),
      bedengan: payload.bedengan || (bedenganIds.length > 0 ? bedenganIds.join(', ') : '-'),
      
      jumlahDiperiksa: val.checked,
      jumlahLayak: val.pass,
      jumlahAfkir: val.cull,
      
      selectionStage: payload.selectionStage || (payload.isPreGrafting ? SELECTION_STAGES.SELEKSI_1 : SELECTION_STAGES.PASCA_OKULASI),
      selectionType: payload.selectionType || (payload.isPreGrafting ? SELECTION_TYPES.PRA_OKULASI : SELECTION_TYPES.PASCA_OKULASI),
      isCompleted: payload.isCompleted !== undefined ? Boolean(payload.isCompleted) : false,
      polybagCount: payload.polybagCount !== undefined ? parseInt(payload.polybagCount, 10) : Math.ceil(val.checked / 2),
      
      tanggalSeleksi: payload.tanggalSeleksi || payload.selectionDate || formatDate(new Date().toISOString()),
      catatan: payload.catatan || payload.remarks || payload.alasan || '-',
      
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
      stockMutationStatus: STOCK_MUTATION_STATUS.PENDING,
      
      createdByUserId: currentUser.userId || currentUser.code || currentUser.id,
      createdByName: currentUser.name || 'Mantri Bibitan',
      createdByRole: currentUser.role || 'MANTRI_TANAMAN',
      createdAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.CREATE,
    currentUser,
    `Pengajuan hasil seleksi batch ${batchCode} (Diperiksa: ${val.checked}, Layak: ${val.pass}, Afkir: ${val.cull})`
  );

  allRecords.push(newRecord);
  storage.set(SELECTION_STORAGE_KEY, allRecords);
  return newRecord;
}

/**
 * Approve Pemeriksaan Hasil Seleksi oleh Asisten Bibitan
 */
export function approveSelectionRecord(recordIdOrDocNo, notes = '', currentUser, autoMutateStock = false) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak menyetujui hasil seleksi.');
  }

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.selectionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Data seleksi dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];
  if (!canPerformAsistenSelectionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk menyetujui dokumen ini.');
  }

  const isDederan = target.originType === 'REJECT_DEDERAN' || target.sourceModule === 'DEDERAN';
  const nowIso = new Date().toISOString();

  const updatedRecord = applyTransactionActor(
    {
      ...target,
      status: SELECTION_STATUS.DISETUJUI,
      approvalNotes: notes || 'Disetujui oleh Asisten Bibitan',
      verifiedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      verifiedByName: currentUser.name || 'Asisten Bibitan',
      verifiedByRole: ROLES.ASISTEN_BIBITAN,
      verifiedAt: nowIso,
      updatedAt: nowIso
    },
    AUDIT_EVENT_TYPES.APPROVE,
    currentUser,
    isDederan
      ? `Persetujuan hasil seleksi Dederan ${target.docNo} (${target.bedengan || target.bedenganCode || '-'}, ${target.jumlahAfkir} Afkir)`
      : `Persetujuan hasil seleksi untuk batch ${target.batchCode} (${target.jumlahLayak} Layak, ${target.jumlahAfkir} Afkir)`
  );

  allRecords[idx] = updatedRecord;
  storage.set(SELECTION_STORAGE_KEY, allRecords);

  // Sync corresponding entry in selection_pool
  let fullPool = storage.get('selection_pool', []);
  const poolIdx = fullPool.findIndex(p => 
    p.selectionTransactionId === target.id ||
    p.id === target.selectionTransactionId ||
    p.docNo === target.docNo ||
    p.selectionDocNo === target.docNo ||
    (p.dederanDocNo && p.dederanDocNo === target.sourceDocNo)
  );
  if (poolIdx !== -1) {
    fullPool[poolIdx].status = 'DECLARED_CULLED';
    fullPool[poolIdx].verifiedAt = nowIso;
    fullPool[poolIdx].verifiedByName = currentUser.name || 'Asisten Bibitan';
    storage.set('selection_pool', fullPool);
  }

  if (autoMutateStock) {
    const mutationResult = mutateStockFromSelection(updatedRecord.id, currentUser);
    return mutationResult.selection;
  }

  return updatedRecord;
}

/**
 * MUTASI STOK HASIL SELEKSI (TASK ASB-13)
 * Mengurangi availableQty & currentQty pada nursery_batches berdasarkan jumlahAfkir hasil seleksi yang DISETUJUI.
 */
export function mutateStockFromSelection(recordIdOrDocNo, currentUser) {
  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.selectionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Data seleksi dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];

  // 1. Validasi Status Seleksi: Hanya DISETUJUI yang boleh memutasi stok
  const statusUpper = (target.status || '').toUpperCase();
  if (statusUpper !== SELECTION_STATUS.DISETUJUI) {
    throw new Error(`Hanya hasil seleksi dengan status DISETUJUI yang dapat melakukan mutasi stok (status saat ini: ${target.status}).`);
  }

  // 2. IDEMPOTENCY CHECK: Jika sudah dimutasi, jangan mutasi lagi
  if (target.stockMutationStatus === STOCK_MUTATION_STATUS.APPLIED) {
    return {
      status: STOCK_MUTATION_STATUS.ALREADY_APPLIED,
      success: true,
      message: 'Mutasi stok sudah pernah diterapkan sebelumnya.',
      selection: target,
      batch: null
    };
  }

  // 3. Formula: stockMutationQty = jumlahAfkir
  const mutationQty = parseInt(target.jumlahAfkir || 0, 10);

  // 4. Zero-Afkir Handling: Jika afkir = 0, stok tidak berubah
  if (mutationQty === 0) {
    const updatedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.NOT_REQUIRED,
      stockMutationAt: new Date().toISOString(),
      stockMutationBy: currentUser?.userId || currentUser?.id || 'SYSTEM',
      stockMutationQty: 0,
      stockMutationError: null,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = updatedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);

    return {
      status: STOCK_MUTATION_STATUS.NOT_REQUIRED,
      success: true,
      message: 'Jumlah afkir 0, mutasi stok tidak diperlukan.',
      selection: updatedRecord,
      batch: null
    };
  }

  // 5. Dederan handling: Pra-Semai germination tidak terikat batch polybag Main Nursery
  if (target.originType === 'REJECT_DEDERAN' || target.sourceModule === 'DEDERAN') {
    const updatedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.NOT_REQUIRED,
      stockMutationAt: new Date().toISOString(),
      stockMutationBy: currentUser?.userId || currentUser?.id || 'SYSTEM',
      stockMutationQty: mutationQty,
      stockMutationError: null,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = updatedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);

    return {
      status: STOCK_MUTATION_STATUS.NOT_REQUIRED,
      success: true,
      message: 'Hasil seleksi Dederan berhasil disetujui (Dederan Pra-Semai tidak terikat batch polybag).',
      selection: updatedRecord,
      batch: null
    };
  }

  // 6. Muat nursery_batches & Validasi Batch untuk Pasca-Okulasi / Main Nursery
  const allBatches = storage.get('nursery_batches', []);
  const bIdx = allBatches.findIndex(b => b.id === target.batchId || b.batchCode === target.batchCode || b.batchNo === target.batchCode);
  
  if (bIdx === -1) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Batch ${target.batchCode || target.batchId} tidak ditemukan di nursery_batches.`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Batch ${target.batchCode || target.batchId} tidak ditemukan di nursery_batches.`);
  }

  const batchObj = allBatches[bIdx];
  const batchCtx = getBatchContext(batchObj.id || batchObj.batchId || target.batchId || target.batchCode) || batchObj;

  // 7. Validasi Program / Estate / Division Alignment via Context Relation Layer
  if (target.estateId && batchCtx.estateId && target.estateId.toUpperCase() !== batchCtx.estateId.toUpperCase()) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Inkonsistensi estate: Selection (${target.estateId}) vs Batch (${batchCtx.estateId})`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Inkonsistensi estate: Selection (${target.estateId}) vs Batch (${batchCtx.estateId}).`);
  }

  if (target.divisionId && batchCtx.divisionId && target.divisionId.toUpperCase() !== batchCtx.divisionId.toUpperCase()) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Inkonsistensi divisi: Selection (${target.divisionId}) vs Batch (${batchCtx.divisionId})`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Inkonsistensi divisi: Selection (${target.divisionId}) vs Batch (${batchCtx.divisionId}).`);
  }

  // 8. Validasi Kecukupan Stok via Inventory Service
  const currentAvailable = getInventoryAvailableQty(batchObj.id || batchObj.batchCode || batchObj.batchNo);
  if (currentAvailable < mutationQty) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Stok tidak mencukupi: Tersedia ${currentAvailable}, Afkir ${mutationQty}`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Stok batch ${batchObj.batchCode || batchObj.batchNo} tidak mencukupi (Tersedia: ${currentAvailable} < Afkir: ${mutationQty}).`);
  }

  // 9. Atomic Stock Mutation Commit via Inventory Service
  const updatedInvState = deductInventoryStock(
    batchObj.id || batchObj.batchCode || batchObj.batchNo,
    mutationQty,
    INVENTORY_TX_TYPE.SELECTION,
    target.docNo || target.id,
    currentUser,
    `Pengurangan stok seleksi afkir ${target.docNo || target.id}`
  );

  const updatedBatch = {
    ...batchObj,
    availableQty: updatedInvState.availableQty,
    currentQty: updatedInvState.availableQty,
    status: updatedInvState.status,
    updatedAt: updatedInvState.updatedAt
  };

  // 10. Update Transaction Metadata
  const updatedSelection = {
    ...target,
    stockMutationStatus: STOCK_MUTATION_STATUS.APPLIED,
    stockMutationAt: new Date().toISOString(),
    stockMutationBy: currentUser?.userId || currentUser?.id || 'SYSTEM',
    stockMutationQty: mutationQty,
    stockMutationError: null,
    updatedAt: new Date().toISOString()
  };

  allRecords[idx] = updatedSelection;
  storage.set(SELECTION_STORAGE_KEY, allRecords);

  return {
    status: STOCK_MUTATION_STATUS.APPLIED,
    success: true,
    batch: updatedBatch,
    selection: updatedSelection
  };
}

/**
 * Kembalikan (Return) Pemeriksaan Hasil Seleksi oleh Asisten Bibitan
 * CATATAN PENTING: TIDAK BOLEH MEMUTASI STOCK BATCH
 */
export function returnSelectionRecord(recordIdOrDocNo, reason, currentUser) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak mengembalikan hasil seleksi.');
  }

  if (!reason || !reason.trim()) {
    throw new Error('Alasan pengembalian wajib diisi.');
  }

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.selectionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Data seleksi dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];
  if (!canPerformAsistenSelectionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk mengembalikan dokumen ini.');
  }

  const isDederan = target.originType === 'REJECT_DEDERAN' || target.sourceModule === 'DEDERAN';
  const nowIso = new Date().toISOString();

  const updatedRecord = applyTransactionActor(
    {
      ...target,
      status: SELECTION_STATUS.DIKEMBALIKAN,
      returnReason: reason.trim(),
      returnedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      returnedByName: currentUser.name || 'Asisten Bibitan',
      returnedByRole: ROLES.ASISTEN_BIBITAN,
      returnedAt: nowIso,
      updatedAt: nowIso
    },
    AUDIT_EVENT_TYPES.REJECT,
    currentUser,
    isDederan
      ? `Pengembalian hasil seleksi Dederan ${target.docNo}: ${reason.trim()}`
      : `Pengembalian hasil seleksi untuk batch ${target.batchCode}: ${reason.trim()}`
  );

  allRecords[idx] = updatedRecord;
  storage.set(SELECTION_STORAGE_KEY, allRecords);

  // Sync corresponding entry in selection_pool to allow re-declaration
  let fullPool = storage.get('selection_pool', []);
  const poolIdx = fullPool.findIndex(p => 
    p.selectionTransactionId === target.id ||
    p.id === target.selectionTransactionId ||
    p.docNo === target.docNo ||
    p.selectionDocNo === target.docNo ||
    (p.dederanDocNo && p.dederanDocNo === target.sourceDocNo)
  );
  if (poolIdx !== -1) {
    fullPool[poolIdx].status = SELECTION_STATUS.DIKEMBALIKAN;
    fullPool[poolIdx].returnReason = reason.trim();
    fullPool[poolIdx].returnedAt = nowIso;
    fullPool[poolIdx].returnedByName = currentUser.name || 'Asisten Bibitan';
    storage.set('selection_pool', fullPool);
  }

  return updatedRecord;
}

/**
 * Integrasi Hasil Seleksi (Rusak, Mati, Lainnya) dari Transaksi Penyemaian ke Selection Pool
 * 
 * Aturan Bisnis:
 * 1. Hanya hasil Rusak, Mati, dan Lainnya dari Transaksi Penyemaian yang masuk ke Seleksi.
 * 2. Hasil Bibit Disemai TIDAK masuk ke Seleksi.
 * 3. Kategori dibedakan: RUSAK, MATI, LAINNYA.
 * 4. Sumber integrasi ditandai: sourceModule: 'PENYEMAIAN', sourceTransactionType: 'SEEDING'.
 * 5. Membawa referensi transaksi asal, program, estate, division, batch, bedengan.
 * 6. Idempoten: mencegah duplikasi jika transaksi asal + kategori sudah ada di selection_pool.
 * 7. Tidak memutasi stok pada saat masuk pool (mutasi hanya saat ASB approve).
 * 8. Validasi: angka negatif/bukan angka melempar error; total 0 tidak membuat entry.
 */
export function integrateSeedingToSelectionPool(seedingTx, options = {}) {
  if (!seedingTx) {
    throw new Error('Data transaksi penyemaian tidak valid.');
  }

  const { isEditing = false } = options;
  const sourceDocNo = seedingTx.docNo || seedingTx.seedingDocNo || seedingTx.id;
  if (!sourceDocNo) {
    throw new Error('Nomor dokumen atau ID transaksi penyemaian wajib ada.');
  }

  // 1. Ekstraksi dan Validasi Kategori Rejection (Rusak, Mati, Lainnya)
  const categories = [];

  function parseAndValidateQty(rawVal, label) {
    if (rawVal === undefined || rawVal === null || rawVal === '') return 0;
    const n = Number(rawVal);
    if (isNaN(n) || !Number.isFinite(n)) {
      throw new Error(`Nilai jumlah ${label} tidak valid: "${rawVal}". Harus berupa bilangan bulat.`);
    }
    if (n < 0) {
      throw new Error(`Nilai jumlah ${label} tidak boleh negatif: ${n}.`);
    }
    return Math.floor(n);
  }

  // Check explicit category fields if present
  let rusakQty = parseAndValidateQty(seedingTx.rusakQty ?? seedingTx.rusak, 'Rusak');
  let matiQty = parseAndValidateQty(seedingTx.matiQty ?? seedingTx.mati, 'Mati');
  let lainnyaQty = parseAndValidateQty(seedingTx.lainnyaQty ?? seedingTx.lainnya, 'Lainnya');

  // If explicit categories are 0, check single 'ditolak' + 'alasanDitolak'
  const ditolakQty = parseAndValidateQty(seedingTx.ditolak ?? seedingTx.jumlahDitolak, 'Ditolak');
  if (ditolakQty > 0 && (rusakQty === 0 && matiQty === 0 && lainnyaQty === 0)) {
    const alasan = String(seedingTx.alasanDitolak || seedingTx.alasan || '').trim().toLowerCase();
    if (alasan.includes('rusak')) {
      rusakQty = ditolakQty;
    } else if (alasan.includes('mati')) {
      matiQty = ditolakQty;
    } else if (alasan !== 'tidak ada') {
      lainnyaQty = ditolakQty;
    }
  }

  if (rusakQty > 0) categories.push({ category: 'RUSAK', qty: rusakQty, label: 'Rusak' });
  if (matiQty > 0) categories.push({ category: 'MATI', qty: matiQty, label: 'Mati' });
  if (lainnyaQty > 0) categories.push({ category: 'LAINNYA', qty: lainnyaQty, label: 'Lainnya' });

  // If all categories are 0 (e.g. no rejected seeds), do not create any pool entries
  if (categories.length === 0) {
    return {
      success: true,
      createdCount: 0,
      entries: [],
      message: 'Tidak ada bibit ditolak (Rusak/Mati/Lainnya) pada transaksi penyemaian ini.'
    };
  }

  let selectionPool = storage.get('selection_pool', []);

  // If editing/re-syncing, purge existing entries for this seeding transaction to prevent duplicates
  if (isEditing) {
    selectionPool = selectionPool.filter(s => !(
      (s.sourceDocNo === sourceDocNo || s.seedingDocNo === sourceDocNo || s.sourceTransactionId === (seedingTx.id || sourceDocNo)) &&
      s.sourceModule === 'PENYEMAIAN'
    ));
  }

  const newEntries = [];

  categories.forEach(({ category, qty, label }) => {
    // Idempotency check: Jangan buat duplikasi jika sudah ada di pool
    const alreadyExists = selectionPool.some(s => 
      (s.sourceDocNo === sourceDocNo || s.seedingDocNo === sourceDocNo || s.sourceTransactionId === (seedingTx.id || sourceDocNo)) &&
      (s.category === category || s.alasanDitolakCategory === category) &&
      s.sourceModule === 'PENYEMAIAN'
    );

    if (!alreadyExists) {
      // Hitung max sequence dari selection_pool dan selection_transactions agar tidak terjadi duplikasi nomor
      const existingTxs = storage.get(SELECTION_STORAGE_KEY, []);
      let maxSeq = 0;
      [...selectionPool, ...existingTxs].forEach(item => {
        const d = String(item.docNo || item.selectionDocNo || item.selectionPoolDocNo || item.selectionNo || '');
        const match = d.match(/CULL\/(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });

      const poolSeq = maxSeq + 1;
      const poolDocNo = formatStandardDocNo(2026, 'CULL', poolSeq);
      
      const entry = {
        id: `SEL-POOL-SEED-${seedingTx.id || sourceDocNo}-${category}`,
        docNo: poolDocNo,
        originType: 'REJECT_PENYEMAIAN',
        sourceModule: 'PENYEMAIAN',
        sourceTransactionType: 'SEEDING',
        sourceTransactionId: seedingTx.id || sourceDocNo,
        sourceDocNo: sourceDocNo,
        seedingDocNo: sourceDocNo,
        sourceIndex: seedingTx.sourceIndex !== undefined ? seedingTx.sourceIndex : null,
        
        category: category, // 'RUSAK' | 'MATI' | 'LAINNYA'
        alasanDitolakCategory: category,
        jumlahAfkir: qty,
        quantity: qty,
        alasan: `Bibit ${label} saat Penyemaian (${sourceDocNo})`,
        
        // Scope & Master references
        estateId: seedingTx.estateId || null,
        divisionId: seedingTx.divisionId || null,
        programId: seedingTx.programId || null,
        programCode: seedingTx.programCode || seedingTx.program || null,
        program: seedingTx.program || seedingTx.programCode || null,
        programName: seedingTx.programName || null,
        batchId: seedingTx.batchId || null,
        batchCode: seedingTx.batchCode || seedingTx.batchNo || null,
        batchNo: seedingTx.batchNo || seedingTx.batchCode || null,
        bedenganId: seedingTx.bedenganId || null,
        bedenganCode: seedingTx.bedenganCode || null,
        bedenganIds: seedingTx.rows ? seedingTx.rows.map(r => r.bedenganId).filter(Boolean) : (seedingTx.bedenganId ? [seedingTx.bedenganId] : []),
        bedengan: seedingTx.bedengan || null,
        blockId: seedingTx.blockId || null,
        blockCode: seedingTx.blockCode || null,
        
        // Clones & stage snapshot
        klon: seedingTx.klonAwal || seedingTx.klon || 'GT 1',
        clone: seedingTx.klonAwal || seedingTx.klon || 'GT 1',
        tahapan: seedingTx.tahapan || 'Rubber Main Nursery',
        tanggal: seedingTx.date || formatDate(new Date().toISOString()),
        
        status: 'PENDING_DECLARATION',
        stockMutationStatus: 'PENDING',
        createdAt: new Date().toISOString()
      };

      selectionPool.push(entry);
      newEntries.push(entry);
    }
  });

  storage.set('selection_pool', selectionPool);

  return {
    success: true,
    createdCount: newEntries.length,
    entries: newEntries,
    message: `Berhasil mengintegrasikan ${newEntries.length} entri hasil penyemaian ke Selection Pool.`
  };
}

/**
 * Sinkronisasi seluruh transaksi penyemaian ke Selection Pool secara idempoten
 */
export function syncAllSeedingsToSelectionPool() {
  const seedingTxs = storage.get('seeding_transactions', []);
  let totalCreated = 0;
  seedingTxs.forEach(tx => {
    try {
      const res = integrateSeedingToSelectionPool(tx, { isEditing: false });
      totalCreated += res.createdCount;
    } catch (err) {
      console.warn(`[syncAllSeedingsToSelectionPool] Skip invalid tx ${tx.docNo}:`, err.message);
    }
  });
  return totalCreated;
}

export const SELECTION_PHOTO_STORAGE_KEY = 'selection_photos';

/**
 * Menyimpan data record foto dokumentasi seleksi bibit secara idempoten
 */
export function saveSelectionDocumentationPhoto(photoRecord) {
  if (!photoRecord || !photoRecord.photoData) {
    throw new Error('Data foto dokumentasi tidak valid');
  }
  const allPhotos = storage.get(SELECTION_PHOTO_STORAGE_KEY, []);
  
  // Mencegah duplikasi foto untuk transaksi / dokumen seleksi yang sama
  const existingIdx = allPhotos.findIndex(p => (
    (photoRecord.id && p.id === photoRecord.id) ||
    (photoRecord.selectionTransactionId && p.selectionTransactionId === photoRecord.selectionTransactionId) ||
    (photoRecord.selectionDocNo && p.selectionDocNo === photoRecord.selectionDocNo && p.category === photoRecord.category) ||
    (photoRecord.sourceDocNo && p.sourceDocNo === photoRecord.sourceDocNo && p.category === photoRecord.category && p.selectionDocNo === photoRecord.selectionDocNo)
  ));

  if (existingIdx !== -1) {
    allPhotos[existingIdx] = {
      ...allPhotos[existingIdx],
      ...photoRecord,
      id: allPhotos[existingIdx].id // Pertahankan ID asli
    };
  } else {
    allPhotos.push(photoRecord);
  }
  storage.set(SELECTION_PHOTO_STORAGE_KEY, allPhotos);
  return photoRecord;
}

/**
 * Mengambil daftar seluruh foto dokumentasi seleksi
 */
export function getSelectionPhotos() {
  return storage.get(SELECTION_PHOTO_STORAGE_KEY, []);
}

/**
 * Mengambil foto dokumentasi berdasarkan nomor dokumen seleksi
 */
export function getSelectionPhotosByDocNo(selectionDocNo) {
  if (!selectionDocNo) return [];
  const all = getSelectionPhotos();
  return all.filter(p => p.selectionDocNo === selectionDocNo || p.selectionPoolDocNo === selectionDocNo);
}

/**
 * Deklarasi hasil seleksi oleh Mantri Bibitan secara idempoten
 * Mencegah duplikasi transaksi dan duplikasi Dok. Seleksi
 */
export function declareSelectionItem(targetPoolItem, photoResult, user, customOptions = {}) {
  if (!targetPoolItem) {
    throw new Error('Data bibit afkir tidak valid.');
  }

  const today = formatDate(new Date().toISOString());
  const selectedCat = customOptions.category || targetPoolItem.category || targetPoolItem.alasanDitolakCategory || 'AFKIR';
  const customNotes = customOptions.notes || targetPoolItem.catatan || targetPoolItem.alasan || '-';

  // 1. Cari existing transaction berdasarkan identitas source selection
  const existingTx = findExistingSelectionTransaction(targetPoolItem);
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);

  let finalTx = null;
  let isNewTx = false;

  // Pastikan Dok. Seleksi stabil
  let poolDocNo = targetPoolItem.docNo;
  if (!poolDocNo || !poolDocNo.startsWith('2026/CULL/')) {
    let maxSeq = 0;
    allTxs.forEach(tx => {
      const d = String(tx.docNo || tx.selectionNo || tx.selectionPoolDocNo || '');
      const match = d.match(/CULL\/(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
    poolDocNo = formatStandardDocNo(2026, 'CULL', maxSeq + 1);
    targetPoolItem.docNo = poolDocNo;
  }

  if (existingTx) {
    finalTx = existingTx;
    finalTx.category = selectedCat;
    finalTx.alasanDitolakCategory = selectedCat;
    finalTx.status = SELECTION_STATUS.MENUNGGU_VERIFIKASI;
    finalTx.returnReason = null;
    finalTx.stockMutationStatus = STOCK_MUTATION_STATUS.PENDING;
    finalTx.updatedAt = new Date().toISOString();
    if (user && user.name) {
      finalTx.mantri = user.name;
      finalTx.createdByName = user.name;
      finalTx.createdByUserId = user.userId || user.code || user.id;
    }
    if (customNotes && customNotes !== '-') finalTx.catatan = customNotes;
    // Update photo reference if photoResult provided
    if (photoResult && photoResult.dataUrl) {
      finalTx.photoId = photoResult.id || `PHOTO-SEL-${Date.now()}`;
      finalTx.photoData = photoResult.dataUrl;
      finalTx.photoCapturedAt = photoResult.capturedAt || new Date().toISOString();
      finalTx.photoCapturedAtLabel = photoResult.capturedAtLabel || today;
      finalTx.latitude = photoResult.latitude !== undefined ? photoResult.latitude : null;
      finalTx.longitude = photoResult.longitude !== undefined ? photoResult.longitude : null;
    }
    const txIdx = allTxs.findIndex(t => t.id === existingTx.id);
    if (txIdx !== -1) {
      allTxs[txIdx] = finalTx;
      storage.set(SELECTION_STORAGE_KEY, allTxs);
    }
  } else {
    isNewTx = true;
    const newTxId = `SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isDederan = targetPoolItem.originType === 'REJECT_DEDERAN' || targetPoolItem.sourceModule === 'DEDERAN';
    const validPhotoId = photoResult?.id || `PHOTO-SEL-${Date.now()}`;

    finalTx = {
      id: newTxId,
      selectionId: newTxId,
      docNo: poolDocNo,
      selectionNo: poolDocNo,
      selectionPoolDocNo: poolDocNo,
      sourceModule: targetPoolItem.sourceModule || (targetPoolItem.originType === 'REJECT_PENYEMAIAN' ? 'PENYEMAIAN' : (targetPoolItem.originType === 'REJECT_OKULASI' ? 'BUDDING' : 'DEDERAN')),
      sourceTransactionType: targetPoolItem.sourceTransactionType || (targetPoolItem.originType === 'REJECT_PENYEMAIAN' ? 'SEEDING' : (targetPoolItem.originType === 'REJECT_DEDERAN' ? 'DEDER_INSPECTION' : 'GRAFTING')),
      sourceTransactionId: targetPoolItem.sourceTransactionId || targetPoolItem.sourceDocNo || targetPoolItem.docNo,
      sourceDocNo: targetPoolItem.sourceDocNo || targetPoolItem.seedingDocNo || targetPoolItem.buddingDocNo || targetPoolItem.inspectionDocNo || targetPoolItem.dederanDocNo || '-',
      category: selectedCat,
      alasanDitolakCategory: selectedCat,
      originType: targetPoolItem.originType || (targetPoolItem.sourceModule === 'DEDERAN' ? 'REJECT_DEDERAN' : 'REJECT_PENYEMAIAN'),
      
      estateId: targetPoolItem.estateId || user.estateId || null,
      divisionId: targetPoolItem.divisionId || user.divisionId || null,
      programId: targetPoolItem.programId || null,
      programCode: targetPoolItem.programCode || targetPoolItem.program || null,
      program: targetPoolItem.program || targetPoolItem.programCode || null,
      programName: targetPoolItem.programName || null,
      
      bedenganId: targetPoolItem.bedenganId || null,
      bedenganCode: targetPoolItem.bedenganCode || null,
      bedenganIds: targetPoolItem.bedenganIds || (targetPoolItem.bedenganId ? [targetPoolItem.bedenganId] : []),
      bedengan: targetPoolItem.bedengan || targetPoolItem.bedenganCode || '-',
      
      klon: targetPoolItem.klon || 'GT 1',
      clone: targetPoolItem.clone || targetPoolItem.klon || 'GT 1',
      tahapan: targetPoolItem.tahapan || 'Rubber Main Nursery',
      jumlahDiperiksa: targetPoolItem.jumlahDiperiksa || targetPoolItem.jumlahAfkir || targetPoolItem.quantity || 0,
      jumlahLayak: targetPoolItem.jumlahLayak || 0,
      jumlahAfkir: targetPoolItem.jumlahAfkir || targetPoolItem.quantity || 0,
      quantity: targetPoolItem.jumlahAfkir || targetPoolItem.quantity || 0,
      
      selectionStage: targetPoolItem.selectionStage || SELECTION_STAGES.PASCA_OKULASI,
      selectionType: targetPoolItem.selectionType || SELECTION_TYPES.PASCA_OKULASI,
      isCompleted: targetPoolItem.isCompleted !== undefined ? Boolean(targetPoolItem.isCompleted) : false,
      polybagCount: targetPoolItem.polybagCount !== undefined ? parseInt(targetPoolItem.polybagCount, 10) : Math.ceil((targetPoolItem.jumlahAfkir || targetPoolItem.quantity || 0) / 2),
      
      sumberAsal: getSelectionSourceLabel(targetPoolItem),
      alasan: targetPoolItem.alasan || '-',
      catatan: customNotes,
      tanggal: today,
      tanggalSeleksi: today,
      mantri: user.name,
      createdByName: user.name,
      createdByUserId: user.userId || user.code || user.id,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
      stockMutationStatus: STOCK_MUTATION_STATUS.PENDING,
      
      // Photo reference
      photoId: photoResult?.dataUrl ? validPhotoId : null,
      photoData: photoResult?.dataUrl || null,
      photoCapturedAt: photoResult?.capturedAt || null,
      photoCapturedAtLabel: photoResult?.capturedAtLabel || null,
      latitude: photoResult?.latitude !== undefined ? photoResult.latitude : null,
      longitude: photoResult?.longitude !== undefined ? photoResult.longitude : null
    };

    if (!isDederan) {
      finalTx.batchId = targetPoolItem.batchId || null;
      finalTx.batchCode = targetPoolItem.batchCode || targetPoolItem.batchNo || null;
      finalTx.batchNo = targetPoolItem.batchNo || targetPoolItem.batchCode || null;
    }

    allTxs.push(finalTx);
    storage.set(SELECTION_STORAGE_KEY, allTxs);
  }

  // 2. Simpan record foto dokumentasi jika ada
  let photoRecord = null;
  if (photoResult && photoResult.dataUrl) {
    photoRecord = {
      id: photoResult.id || finalTx.photoId || `PHOTO-SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      transactionType: 'SELECTION',
      selectionTransactionId: finalTx.id,
      selectionDocNo: finalTx.docNo,
      selectionPoolDocNo: finalTx.docNo,
      sourceTransactionId: finalTx.sourceTransactionId,
      sourceDocNo: finalTx.sourceDocNo,
      category: finalTx.category,
      quantity: finalTx.jumlahAfkir,
      photoData: photoResult.dataUrl,
      capturedAt: photoResult.capturedAt || new Date().toISOString(),
      capturedAtLabel: photoResult.capturedAtLabel || today,
      latitude: photoResult.latitude !== undefined ? photoResult.latitude : null,
      longitude: photoResult.longitude !== undefined ? photoResult.longitude : null,
      source: photoResult.source || 'CAMERA',
      createdAt: new Date().toISOString(),
      createdBy: user.name
    };
    if (finalTx.batchId) photoRecord.batchId = finalTx.batchId;
    if (finalTx.batchCode) photoRecord.batchCode = finalTx.batchCode;
    saveSelectionDocumentationPhoto(photoRecord);
  }

  // 3. Update status di selection_pool secara idempoten
  let fullPool = storage.get('selection_pool', []);
  const poolMatchIdx = fullPool.findIndex(p => (
    (p.id && targetPoolItem.id && p.id === targetPoolItem.id) ||
    (p.docNo && targetPoolItem.docNo && p.docNo === targetPoolItem.docNo) ||
    (p.sourceDocNo === targetPoolItem.sourceDocNo && p.sourceModule === targetPoolItem.sourceModule) ||
    (p.dederanDocNo && targetPoolItem.dederanDocNo && p.dederanDocNo === targetPoolItem.dederanDocNo)
  ));
  if (poolMatchIdx !== -1) {
    fullPool[poolMatchIdx] = {
      ...fullPool[poolMatchIdx],
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
      category: selectedCat,
      alasanDitolakCategory: selectedCat,
      docNo: finalTx.docNo,
      selectionTransactionId: finalTx.id,
      selectionDocNo: finalTx.docNo,
      declaredAt: new Date().toISOString(),
      declaredBy: user.name,
      returnReason: null
    };
  }
  storage.set('selection_pool', fullPool);

  return {
    success: true,
    isNew: isNewTx,
    transaction: finalTx,
    photoRecord
  };
}

/**
 * =============================================================================
 * DOKUMEN SELEKSI PRA-OKULASI (SELEKSI I, II, III CONTAINER)
 * =============================================================================
 */

/**
 * Membuat Dokumen Seleksi Pra-Okulasi dari Dokumen Penyemaian
 * Berperan sebagai kontainer induk (parent document) untuk rangkaian pelaksanaan Seleksi I, II, III
 */
export function createPreGraftingSelectionDocument(seedingTx, currentUser = null, options = {}) {
  if (!seedingTx) {
    throw new Error('Data transaksi penyemaian tidak valid.');
  }

  // Identifikasi nomor transaksi penyemaian sumber secara spesifik (cth: '2026/SOW/001')
  // JANGAN mendahulukan seedingTx.sourceDocNo karena itu merupakan nomor Dokumen Penerimaan (cth: '2026/APR/001')
  const seedingDocNo = String(
    (seedingTx.docNo && !options.docNo && !seedingTx.docNo.includes('SEL') && !seedingTx.docNo.includes('CULL') ? seedingTx.docNo : '') ||
    seedingTx.seedingDocNo ||
    seedingTx.sourceSeedingDocNo ||
    seedingTx.docNo ||
    seedingTx.id ||
    ''
  ).trim();

  if (!seedingDocNo) {
    throw new Error('Nomor transaksi penyemaian sumber wajib ada.');
  }

  const receiptDocNo = String(seedingTx.sourceDocNo || seedingTx.receiptDocNo || seedingTx.nomorPenerimaan || '').trim();
  const seedingTxId = String(seedingTx.id || seedingDocNo).trim();

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  
  // Idempotency: Jika dokumen Seleksi I untuk source transaksi penyemaian ini sudah ada, kembalikan dokumen yang ada
  const existing = allDocs.find(d => 
    (d.selectionStage === 'SELEKSI_I' || d.selectionStage === 'SELEKSI_1' || !d.selectionStage) &&
    (
      (d.sourceSeedingDocNo && d.sourceSeedingDocNo === seedingDocNo) ||
      (d.seedingDocNo && d.seedingDocNo === seedingDocNo) ||
      (d.sourceDocNo && d.sourceDocNo === seedingDocNo) ||
      (d.sourceTransactionId && (d.sourceTransactionId === seedingTxId || d.sourceTransactionId === seedingDocNo))
    )
  );
  if (existing) {
    return existing;
  }

  // Generate Dokumen Seleksi No (Format: 2026/SEL/001 atau 2026/CULL/001)
  let maxSeq = 0;
  allDocs.forEach(d => {
    const docStr = String(d.docNo || d.selectionDocNo || '');
    const match = docStr.match(/SEL(?:-DOC)?\/(\d+)/i) || docStr.match(/CULL\/(\d+)/i) || docStr.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });

  const nextSeq = maxSeq + 1;
  const docNo = options.docNo || formatStandardDocNo(2026, 'SEL', nextSeq);

  // Quantities: Bibit dan Polybag diperlakukan sebagai 2 kuantitas berbeda dari Penyemaian
  const sourceBibitQty = parseInt(
    seedingTx.sourceBibitQty !== undefined
      ? seedingTx.sourceBibitQty
      : (seedingTx.totalDisemai !== undefined
        ? seedingTx.totalDisemai
        : (seedingTx.disemai !== undefined ? seedingTx.disemai : (seedingTx.seedsQuantity !== undefined ? seedingTx.seedsQuantity : 0))),
    10
  );
  const sourcePolybagQty = parseInt(
    seedingTx.sourcePolybagQty !== undefined
      ? seedingTx.sourcePolybagQty
      : (seedingTx.totalPolybag !== undefined 
        ? seedingTx.totalPolybag 
        : (seedingTx.polybag !== undefined ? seedingTx.polybag : (seedingTx.polybagQuantity !== undefined ? seedingTx.polybagQuantity : Math.ceil(sourceBibitQty / 2)))),
    10
  );

  // Master contexts
  const bObj = seedingTx.batchId ? getBatchById(seedingTx.batchId) : getBatchByCode(seedingTx.batchCode || seedingTx.batchNo);
  const batchId = bObj ? bObj.id : (seedingTx.batchId || `BATCH-${Date.now()}`);
  const batchCode = bObj ? (bObj.batchCode || bObj.batchNo) : (seedingTx.batchCode || seedingTx.batchNo || 'Batch-01');

  const bedenganIds = seedingTx.bedenganIds || 
    (seedingTx.rows ? seedingTx.rows.map(r => r.bedenganId || r.bedenganCode).filter(Boolean) : 
    (seedingTx.bedenganBreakdown ? seedingTx.bedenganBreakdown.map(b => b.bedenganCode || b.bedenganId).filter(Boolean) : 
    (seedingTx.bedenganId ? [seedingTx.bedenganId] : (seedingTx.bedenganCode ? [seedingTx.bedenganCode] : []))));

  const rows = seedingTx.rows 
    ? JSON.parse(JSON.stringify(seedingTx.rows)) 
    : (seedingTx.bedenganBreakdown 
        ? seedingTx.bedenganBreakdown.map(b => ({ bedenganId: b.bedenganCode || b.bedenganId, bedenganCode: b.bedenganCode || b.bedenganId, polybag: b.polybagQuantity || b.polybag || 0, disemai: b.seedsQuantity || b.disemai || 0 }))
        : (bedenganIds.length > 0 ? bedenganIds.map(bId => ({ bedenganId: bId, bedenganCode: formatBedenganDisplayCode(bId), polybag: sourcePolybagQty, disemai: sourceBibitQty })) : []));

  const baseDoc = {
    id: `SEL-DOC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    docNo: docNo,
    selectionDocNo: docNo,
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: options.selectionStage || SELECTION_STAGES.SELEKSI_1,
    
    // Source Document Relation
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceTransactionId: seedingTxId,
    sourceDocNo: seedingDocNo,
    seedingDocNo: seedingDocNo,
    sourceSeedingDocNo: seedingDocNo,
    receiptDocNo: receiptDocNo,
    sourceReceiptDocNo: receiptDocNo,
    rows: rows,
    
    // Scope & Master references
    programId: seedingTx.programId || bObj?.programId || 'PRG-2026-001',
    programCode: seedingTx.programCode || seedingTx.program || bObj?.programCode || 'PRG/NUR/01/2026',
    programName: seedingTx.programName || bObj?.programName || '-',
    batchId: batchId,
    batchCode: batchCode,
    batchNo: batchCode,
    bedenganId: bedenganIds.length > 0 ? bedenganIds[0] : (seedingTx.bedenganId || null),
    bedenganCode: seedingTx.bedenganCode || null,
    bedenganIds: bedenganIds,
    bedengan: seedingTx.bedengan || (bedenganIds.length > 0 ? bedenganIds.join(', ') : '-'),
    estateId: seedingTx.estateId || bObj?.estateId || currentUser?.estateId || null,
    estateName: seedingTx.estateName || bObj?.estateName || currentUser?.estateName || '-',
    divisionId: seedingTx.divisionId || bObj?.divisionId || currentUser?.divisionId || null,
    divisionName: seedingTx.divisionName || bObj?.divisionName || currentUser?.divisionName || '-',
    
    klon: seedingTx.klonAwal || seedingTx.klon || 'GT 1',
    clone: seedingTx.klonAwal || seedingTx.klon || 'GT 1',
    tahapan: seedingTx.tahapan || 'Rubber Main Nursery',
    growthStage: seedingTx.growthStage || seedingTx.tahapan || 'Rubber Main Nursery',
    
    // Population Quantities (Dua quantity independen dari Penyemaian)
    sourceBibitQty: sourceBibitQty,
    sourcePolybagQty: sourcePolybagQty,
    currentBibitQty: sourceBibitQty,
    currentPolybagQty: sourcePolybagQty,
    activePolybagQty: 0,
    emptyPolybagQty: 0,
    
    // Execution Progress & Child Transaction Tracking
    executionTransactionIds: [],
    executionCount: 0,
    totalDiperiksa: 0,
    totalLayak: 0,
    totalAfkir: 0,
    
    // Completion State (Manual by Mantri, default false)
    isCompleted: false,
    isFinal: false,
    completedAt: null,
    completedByUserId: null,
    completedByName: null,
    
    // Lifecycle Status
    status: 'DRAFT',
    createdAt: new Date().toISOString()
  };

  const newDoc = currentUser 
    ? applyTransactionActor(baseDoc, AUDIT_EVENT_TYPES.CREATE, currentUser, `Pembuatan Dokumen Seleksi Pra-Okulasi ${docNo} untuk batch ${batchCode}`)
    : baseDoc;

  allDocs.push(newDoc);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  return newDoc;
}

/**
 * Mengambil daftar Dokumen Seleksi Pra-Okulasi
 */
export function getPreGraftingSelectionDocuments(filter = {}, currentUser = null) {
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  let scoped = currentUser ? filterSelectionByScope(allDocs, currentUser) : allDocs;

  if (filter.selectionStage) {
    scoped = scoped.filter(d => d.selectionStage === filter.selectionStage);
  }
  if (filter.batchId) {
    scoped = scoped.filter(d => d.batchId === filter.batchId);
  }
  if (filter.isCompleted !== undefined) {
    scoped = scoped.filter(d => Boolean(d.isCompleted) === Boolean(filter.isCompleted));
  }
  if (filter.sourceDocNo) {
    scoped = scoped.filter(d => d.sourceDocNo === filter.sourceDocNo);
  }
  return scoped;
}

/**
 * Memeriksa apakah Dokumen Seleksi II dapat dibuat dari Dokumen Seleksi I
 * Gate Baseline: Seleksi I harus berstatus DISETUJUI dan isFinal = true
 */
export function canCreateSelection2Document(sourceSelection1IdOrDoc) {
  const sourceDoc = typeof sourceSelection1IdOrDoc === 'object' && sourceSelection1IdOrDoc !== null
    ? sourceSelection1IdOrDoc
    : getPreGraftingSelectionDocumentById(sourceSelection1IdOrDoc);

  if (!sourceDoc) {
    return { canCreate: false, reason: 'Dokumen Seleksi I tidak ditemukan.', sourceDoc: null };
  }

  const stage = String(sourceDoc.selectionStage || '').toUpperCase();
  if (stage !== 'SELEKSI_I' && stage !== 'SELEKSI_1') {
    return { canCreate: false, reason: 'Source dokumen bukan merupakan Dokumen Seleksi I.', sourceDoc };
  }

  const isFinal = Boolean(sourceDoc.isFinal);
  const statusUpper = String(sourceDoc.status || '').toUpperCase();

  if (!isFinal || statusUpper !== SELECTION_STATUS.DISETUJUI) {
    return {
      canCreate: false,
      reason: `Dokumen Seleksi I (${sourceDoc.docNo}) belum berstatus FINAL disetujui Asisten Bibitan (status: ${sourceDoc.status || 'DRAFT'}).`,
      sourceDoc
    };
  }

  return { canCreate: true, sourceDoc };
}

/**
 * Membuat Dokumen Seleksi II dari Dokumen Seleksi I yang sudah FINAL
 * Mengimplementasikan Gate, Source Traceability, dan Kuantitas Hasil Final Seleksi I
 */
export function createSelection2DocumentFromSelection1(sourceSelection1IdOrDocNo, currentUser = null, options = {}) {
  const gateCheck = canCreateSelection2Document(sourceSelection1IdOrDocNo);
  if (!gateCheck.canCreate) {
    throw new Error(`Gagal membuat Dokumen Seleksi II: ${gateCheck.reason}`);
  }

  const sourceDoc = gateCheck.sourceDoc;
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);

  // Idempotency: Cek apakah Dokumen Seleksi II untuk source Seleksi I ini sudah ada
  const existing = allDocs.find(d => 
    (d.selectionStage === SELECTION_STAGES.SELEKSI_2 || d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2') &&
    (d.sourceSelectionDocumentId === sourceDoc.id || d.sourceSelectionDocNo === sourceDoc.docNo || d.sourceDocNo === sourceDoc.docNo)
  );

  if (existing) {
    return existing;
  }

  // Generate Dokumen Seleksi II No (Format: 2026/SEL-II/001)
  let maxSeq = 0;
  allDocs.forEach(d => {
    if (d.selectionStage === SELECTION_STAGES.SELEKSI_2 || d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2') {
      const docStr = String(d.docNo || d.selectionDocNo || '');
      const match = docStr.match(/SEL-II\/(\d+)/i) || docStr.match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const docNo = options.docNo || formatStandardDocNo(2026, 'SEL-II', nextSeq);

  // Kuantitas awal Seleksi II diambil dari HASIL FINAL Seleksi I
  // Bibit awal Seleksi II = Bibit dipertahankan (Layak) dari Seleksi I
  const sourceBibitQty = parseInt(
    sourceDoc.totalLayak !== undefined
      ? sourceDoc.totalLayak
      : (sourceDoc.finalBibitQty !== undefined ? sourceDoc.finalBibitQty : sourceDoc.currentBibitQty || 0),
    10
  );

  const executions = getSeleksi1ExecutionsByDocument(sourceDoc.id || sourceDoc.docNo);

  // Polybag source Seleksi II = Polybag AKTIF dari HASIL FINAL Seleksi I
  let sourcePolybagQty = 0;
  if (sourceDoc.activePolybagQty !== undefined && sourceDoc.activePolybagQty !== null && !isNaN(sourceDoc.activePolybagQty) && parseInt(sourceDoc.activePolybagQty, 10) > 0) {
    sourcePolybagQty = parseInt(sourceDoc.activePolybagQty, 10);
  } else if (executions.length > 0) {
    // Fallback defensif: hitung dari child transactions Seleksi I (mendukung actual model & legacy)
    sourcePolybagQty = executions.reduce((sum, tx) => {
      if (tx.actualPolybagActiveQty !== undefined && !isNaN(parseInt(tx.actualPolybagActiveQty, 10))) {
        return sum + parseInt(tx.actualPolybagActiveQty, 10);
      }
      if (tx.activePolybagQty !== undefined && !isNaN(parseInt(tx.activePolybagQty, 10))) {
        return sum + parseInt(tx.activePolybagQty, 10);
      }
      return sum + (parseInt(tx.polybag2Bibit || 0, 10) + parseInt(tx.polybag1Bibit || 0, 10));
    }, 0);
  } else {
    // Fallback jika tidak ada child tx
    sourcePolybagQty = parseInt(sourceDoc.currentPolybagQty !== undefined ? sourceDoc.currentPolybagQty : (sourceDoc.sourcePolybagQty || 0), 10);
  }

  // Build rows / bedengan breakdown dari Seleksi I dengan target polybag aktif per bedengan
  let rows = [];
  if (Array.isArray(sourceDoc.rows) && sourceDoc.rows.length > 0) {
    rows = sourceDoc.rows.map(r => {
      const bCode = formatBedenganDisplayCode(r.bedenganCode || r.bedengan || r.bedenganId);
      const bTxs = executions.filter(tx => formatBedenganDisplayCode(tx.bedenganCode || tx.bedengan).toUpperCase() === bCode.toUpperCase());
      const bLayak = bTxs.reduce((sum, tx) => sum + (parseInt(tx.actualBibitRetainedQty !== undefined ? tx.actualBibitRetainedQty : (tx.bibitDipertahankan || tx.jumlahLayak || 0), 10)), 0);
      const bActivePoly = bTxs.reduce((sum, tx) => {
        if (tx.actualPolybagActiveQty !== undefined && !isNaN(parseInt(tx.actualPolybagActiveQty, 10))) {
          return sum + parseInt(tx.actualPolybagActiveQty, 10);
        }
        if (tx.activePolybagQty !== undefined && !isNaN(parseInt(tx.activePolybagQty, 10))) {
          return sum + parseInt(tx.activePolybagQty, 10);
        }
        return sum + (parseInt(tx.polybag2Bibit || 0, 10) + parseInt(tx.polybag1Bibit || 0, 10));
      }, 0);
      return {
        bedenganId: r.bedenganId || r.bedenganCode || bCode,
        bedenganCode: bCode,
        polybag: bTxs.length > 0 ? bActivePoly : (r.polybag || 0),
        disemai: bLayak > 0 ? bLayak : (r.disemai || 0),
        sourceBibitQty: bLayak > 0 ? bLayak : (r.disemai || 0)
      };
    });
  } else {
    rows = [{
      bedenganId: sourceDoc.bedenganId || 'BED-001',
      bedenganCode: formatBedenganDisplayCode(sourceDoc.bedenganCode || sourceDoc.bedengan || 'BED-001'),
      polybag: sourcePolybagQty,
      disemai: sourceBibitQty,
      sourceBibitQty: sourceBibitQty
    }];
  }

  const baseDoc = {
    id: `SEL2-DOC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    docNo: docNo,
    selectionDocNo: docNo,
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_2,

    // Source Document Traceability ke Seleksi I FINAL
    sourceModule: 'SELEKSI',
    sourceTransactionType: 'SELEKSI_I',
    sourceSelectionStage: SELECTION_STAGES.SELEKSI_1,
    sourceSelectionType: SELECTION_TYPES.PRA_OKULASI,
    sourceSelectionDocumentId: sourceDoc.id,
    sourceSelectionDocNo: sourceDoc.docNo,
    sourceFinalStatus: SELECTION_STATUS.DISETUJUI,
    sourceFinalId: sourceDoc.id,
    sourceDocNo: sourceDoc.docNo,
    sourceSeedingDocNo: sourceDoc.sourceDocNo || sourceDoc.seedingDocNo || '-',

    // Master contexts & scope
    programId: sourceDoc.programId || 'PRG-2026-001',
    programCode: sourceDoc.programCode || 'PRG/NUR/01/2026',
    programName: sourceDoc.programName || '-',
    batchId: sourceDoc.batchId,
    batchCode: sourceDoc.batchCode || sourceDoc.batchNo,
    batchNo: sourceDoc.batchCode || sourceDoc.batchNo,
    bedenganId: sourceDoc.bedenganId || (sourceDoc.bedenganIds && sourceDoc.bedenganIds[0]) || null,
    bedenganCode: sourceDoc.bedenganCode || null,
    bedenganIds: sourceDoc.bedenganIds || [],
    bedengan: sourceDoc.bedengan || '-',
    estateId: sourceDoc.estateId || currentUser?.estateId || null,
    estateName: sourceDoc.estateName || currentUser?.estateName || '-',
    divisionId: sourceDoc.divisionId || currentUser?.divisionId || null,
    divisionName: sourceDoc.divisionName || currentUser?.divisionName || '-',

    klon: sourceDoc.klon || sourceDoc.clone || 'GT 1',
    clone: sourceDoc.clone || sourceDoc.klon || 'GT 1',
    tahapan: 'Rubber Main Nursery (Seleksi II)',
    growthStage: sourceDoc.growthStage || 'Rubber Main Nursery',

    rows: rows,

    // Population Quantities dari HASIL FINAL Seleksi I
    sourceBibitQty: sourceBibitQty,
    sourcePolybagQty: sourcePolybagQty,
    currentBibitQty: sourceBibitQty,
    currentPolybagQty: sourcePolybagQty,
    activePolybagQty: 0,
    emptyPolybagQty: 0,

    // Multi-session execution container
    executionTransactionIds: [],
    executionCount: 0,
    totalDiperiksa: 0,
    totalLayak: 0,
    totalAfkir: 0,

    // Lifecycle Completion & Finality
    isCompleted: false,
    isFinal: false,
    completedAt: null,
    completedByUserId: null,
    completedByName: null,

    status: 'DRAFT',
    createdAt: new Date().toISOString()
  };

  const newDoc = currentUser
    ? applyTransactionActor(baseDoc, AUDIT_EVENT_TYPES.CREATE, currentUser, `Pembuatan Dokumen Seleksi II ${docNo} dari hasil final Seleksi I ${sourceDoc.docNo}`)
    : baseDoc;

  allDocs.push(newDoc);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  return newDoc;
}

/**
 * Memeriksa apakah Dokumen Seleksi III dapat dibuat dari Dokumen Seleksi II
 * Gate Baseline: Seleksi II harus berstatus DISETUJUI dan isFinal = true
 */
export function canCreateSelection3Document(sourceSelection2IdOrDoc) {
  const sourceDoc = typeof sourceSelection2IdOrDoc === 'object' && sourceSelection2IdOrDoc !== null
    ? sourceSelection2IdOrDoc
    : getPreGraftingSelectionDocumentById(sourceSelection2IdOrDoc);

  if (!sourceDoc) {
    return { canCreate: false, reason: 'Dokumen Seleksi II tidak ditemukan.', sourceDoc: null };
  }

  const stage = String(sourceDoc.selectionStage || '').toUpperCase();
  if (stage !== 'SELEKSI_II' && stage !== 'SELEKSI_2') {
    return { canCreate: false, reason: 'Source dokumen bukan merupakan Dokumen Seleksi II.', sourceDoc };
  }

  const isFinal = Boolean(sourceDoc.isFinal);
  const statusUpper = String(sourceDoc.status || '').toUpperCase();

  if (!isFinal || statusUpper !== SELECTION_STATUS.DISETUJUI) {
    return {
      canCreate: false,
      reason: `Dokumen Seleksi II (${sourceDoc.docNo}) belum berstatus FINAL disetujui Asisten Bibitan (status: ${sourceDoc.status || 'DRAFT'}).`,
      sourceDoc
    };
  }

  return { canCreate: true, sourceDoc };
}

/**
 * Membuat Dokumen Seleksi III dari Dokumen Seleksi II yang sudah FINAL
 * Mengimplementasikan Gate, Source Traceability, dan Kuantitas Hasil Final Seleksi II
 */
export function createSelection3DocumentFromSelection2(sourceSelection2IdOrDocNo, currentUser = null, options = {}) {
  const gateCheck = canCreateSelection3Document(sourceSelection2IdOrDocNo);
  if (!gateCheck.canCreate) {
    throw new Error(`Gagal membuat Dokumen Seleksi III: ${gateCheck.reason}`);
  }

  const sourceDoc = gateCheck.sourceDoc;
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);

  // Idempotency: Cek apakah Dokumen Seleksi III untuk source Seleksi II ini sudah ada
  const existing = allDocs.find(d => 
    (d.selectionStage === SELECTION_STAGES.SELEKSI_3 || d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3') &&
    (d.sourceSelectionDocumentId === sourceDoc.id || d.sourceSelectionDocNo === sourceDoc.docNo || d.sourceDocNo === sourceDoc.docNo)
  );

  if (existing) {
    return existing;
  }

  // Generate Dokumen Seleksi III No (Format: 2026/SEL-III/001)
  let maxSeq = 0;
  allDocs.forEach(d => {
    if (d.selectionStage === SELECTION_STAGES.SELEKSI_3 || d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3') {
      const docStr = String(d.docNo || d.selectionDocNo || '');
      const match = docStr.match(/SEL-III\/(\d+)/i) || docStr.match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const docNo = options.docNo || formatStandardDocNo(2026, 'SEL-III', nextSeq);

  // Kuantitas awal Seleksi III diambil dari HASIL FINAL Seleksi II
  // Bibit awal Seleksi III = Bibit dipertahankan (Layak) dari Seleksi II
  const sourceBibitQty = parseInt(
    sourceDoc.totalLayak !== undefined
      ? sourceDoc.totalLayak
      : (sourceDoc.finalBibitQty !== undefined ? sourceDoc.finalBibitQty : sourceDoc.currentBibitQty || 0),
    10
  );

  const executions = getSeleksi2ExecutionsByDocument(sourceDoc.id || sourceDoc.docNo);

  // Polybag source Seleksi III = Polybag AKTIF dari HASIL FINAL Seleksi II
  let sourcePolybagQty = 0;
  if (sourceDoc.activePolybagQty !== undefined && sourceDoc.activePolybagQty !== null && !isNaN(sourceDoc.activePolybagQty) && parseInt(sourceDoc.activePolybagQty, 10) > 0) {
    sourcePolybagQty = parseInt(sourceDoc.activePolybagQty, 10);
  } else if (executions.length > 0) {
    // Fallback defensif: hitung dari child transactions Seleksi II (mendukung actual model & legacy)
    sourcePolybagQty = executions.reduce((sum, tx) => {
      if (tx.actualPolybagActiveQty !== undefined && !isNaN(parseInt(tx.actualPolybagActiveQty, 10))) {
        return sum + parseInt(tx.actualPolybagActiveQty, 10);
      }
      if (tx.activePolybagQty !== undefined && !isNaN(parseInt(tx.activePolybagQty, 10))) {
        return sum + parseInt(tx.activePolybagQty, 10);
      }
      return sum + (parseInt(tx.polybag2Bibit || 0, 10) + parseInt(tx.polybag1Bibit || 0, 10));
    }, 0);
  } else {
    // Fallback jika tidak ada child tx
    sourcePolybagQty = parseInt(sourceDoc.currentPolybagQty !== undefined ? sourceDoc.currentPolybagQty : (sourceDoc.sourcePolybagQty || 0), 10);
  }

  // Build rows / bedengan breakdown dari Seleksi II dengan target polybag aktif per bedengan
  let rows = [];
  if (Array.isArray(sourceDoc.rows) && sourceDoc.rows.length > 0) {
    rows = sourceDoc.rows.map(r => {
      const bCode = formatBedenganDisplayCode(r.bedenganCode || r.bedengan || r.bedenganId);
      const bTxs = executions.filter(tx => formatBedenganDisplayCode(tx.bedenganCode || tx.bedengan).toUpperCase() === bCode.toUpperCase());
      const bLayak = bTxs.reduce((sum, tx) => sum + (parseInt(tx.actualBibitRetainedQty !== undefined ? tx.actualBibitRetainedQty : (tx.bibitDipertahankan || tx.jumlahLayak || 0), 10)), 0);
      const bActivePoly = bTxs.reduce((sum, tx) => {
        if (tx.actualPolybagActiveQty !== undefined && !isNaN(parseInt(tx.actualPolybagActiveQty, 10))) {
          return sum + parseInt(tx.actualPolybagActiveQty, 10);
        }
        if (tx.activePolybagQty !== undefined && !isNaN(parseInt(tx.activePolybagQty, 10))) {
          return sum + parseInt(tx.activePolybagQty, 10);
        }
        return sum + (parseInt(tx.polybag2Bibit || 0, 10) + parseInt(tx.polybag1Bibit || 0, 10));
      }, 0);
      return {
        bedenganId: r.bedenganId || r.bedenganCode || bCode,
        bedenganCode: bCode,
        polybag: bTxs.length > 0 ? bActivePoly : (r.polybag || 0),
        disemai: bLayak > 0 ? bLayak : (r.disemai || r.sourceBibitQty || 0),
        sourceBibitQty: bLayak > 0 ? bLayak : (r.sourceBibitQty || r.disemai || 0)
      };
    });
  } else {
    rows = [{
      bedenganId: sourceDoc.bedenganId || 'BED-001',
      bedenganCode: formatBedenganDisplayCode(sourceDoc.bedenganCode || sourceDoc.bedengan || 'BED-001'),
      polybag: sourcePolybagQty,
      disemai: sourceBibitQty,
      sourceBibitQty: sourceBibitQty
    }];
  }

  const baseDoc = {
    id: `SEL3-DOC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    docNo: docNo,
    selectionDocNo: docNo,
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_3,

    // Source Document Traceability ke Seleksi II FINAL & Hulu
    sourceModule: 'SELEKSI',
    sourceTransactionType: 'SELEKSI_II',
    sourceSelectionStage: SELECTION_STAGES.SELEKSI_2,
    sourceSelectionType: SELECTION_TYPES.PRA_OKULASI,
    sourceSelectionDocumentId: sourceDoc.id,
    sourceSelectionDocNo: sourceDoc.docNo,
    sourceFinalStatus: SELECTION_STATUS.DISETUJUI,
    sourceFinalId: sourceDoc.id,
    sourceDocNo: sourceDoc.docNo,
    sourceSelection1DocNo: sourceDoc.sourceSelectionDocNo || sourceDoc.sourceDocNo || '-',
    sourceSeedingDocNo: sourceDoc.sourceSeedingDocNo || sourceDoc.seedingDocNo || '-',

    // Master contexts & scope
    programId: sourceDoc.programId || 'PRG-2026-001',
    programCode: sourceDoc.programCode || 'PRG/NUR/01/2026',
    programName: sourceDoc.programName || '-',
    batchId: sourceDoc.batchId,
    batchCode: sourceDoc.batchCode || sourceDoc.batchNo,
    batchNo: sourceDoc.batchCode || sourceDoc.batchNo,
    bedenganId: sourceDoc.bedenganId || (sourceDoc.bedenganIds && sourceDoc.bedenganIds[0]) || null,
    bedenganCode: sourceDoc.bedenganCode || null,
    bedenganIds: sourceDoc.bedenganIds || [],
    bedengan: sourceDoc.bedengan || '-',
    estateId: sourceDoc.estateId || currentUser?.estateId || null,
    estateName: sourceDoc.estateName || currentUser?.estateName || '-',
    divisionId: sourceDoc.divisionId || currentUser?.divisionId || null,
    divisionName: sourceDoc.divisionName || currentUser?.divisionName || '-',

    klon: sourceDoc.klon || sourceDoc.clone || 'GT 1',
    clone: sourceDoc.clone || sourceDoc.klon || 'GT 1',
    tahapan: 'Rubber Main Nursery',
    growthStage: sourceDoc.growthStage || 'Rubber Main Nursery',

    rows: rows,

    // Population Quantities dari HASIL FINAL Seleksi II
    sourceBibitQty: sourceBibitQty,
    sourcePolybagQty: sourcePolybagQty,
    currentBibitQty: sourceBibitQty,
    currentPolybagQty: sourcePolybagQty,
    activePolybagQty: 0,
    emptyPolybagQty: 0,

    // Multi-session execution container (ready for future task)
    executionTransactionIds: [],
    executionCount: 0,
    totalDiperiksa: 0,
    totalLayak: 0,
    totalAfkir: 0,

    // Lifecycle Completion & Finality
    isCompleted: false,
    isFinal: false,
    completedAt: null,
    completedByUserId: null,
    completedByName: null,

    status: 'DRAFT',
    createdAt: new Date().toISOString()
  };

  const newDoc = currentUser
    ? applyTransactionActor(baseDoc, AUDIT_EVENT_TYPES.CREATE, currentUser, `Pembuatan Dokumen Seleksi III ${docNo} dari hasil final Seleksi II ${sourceDoc.docNo}`)
    : baseDoc;

  allDocs.push(newDoc);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  return newDoc;
}

/**
 * Mencari Dokumen Seleksi Pra-Okulasi berdasarkan ID, Dokumen No, atau Source Doc No
 */
export function getPreGraftingSelectionDocumentById(idOrDocNo) {
  if (!idOrDocNo) return null;
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const searchStr = String(idOrDocNo).trim();
  const exact = allDocs.find(d => 
    d.id === searchStr || 
    d.docNo === searchStr || 
    d.selectionDocNo === searchStr
  );
  if (exact) return exact;
  return allDocs.find(d => 
    d.sourceSeedingDocNo === searchStr ||
    d.seedingDocNo === searchStr ||
    d.sourceDocNo === searchStr || 
    d.sourceSelectionDocNo === searchStr ||
    d.sourceTransactionId === searchStr
  ) || null;
}

/**
 * Memeriksa apakah pengguna memiliki role Mantri
 */
export function isMantriRole(currentUser) {
  if (!currentUser) return false;
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  return (
    role === ROLES.MANTRI_TANAMAN ||
    role === 'MANTRI_TANAMAN' ||
    role === 'MANTRI' ||
    role === 'MANTRI_BIBITAN' ||
    (currentUser.position && String(currentUser.position).toLowerCase().includes('mantri'))
  );
}

/**
 * Menghitung metrik agregat, balance, progress, dan status Dokumen Seleksi III
 */
export function getSeleksi3Metrics(doc, customExecutions = null) {
  if (!doc) {
    return {
      totalPopulasi: 0,
      totalPolybagDiperiksa: 0,
      totalBibitDiperiksa: 0,
      totalBibitDiseleksi: 0,
      totalBibitLayak: 0,
      totalBibitReject: 0,
      totalActivePolybag: 0,
      isOneToOne: true,
      belumDiklasifikasikan: 0,
      balanceValid: true,
      sisaPemeriksaan: 0,
      sisaPolybag: 0,
      pemeriksaanSelesai: false,
      seleksiValidUntukSelesai: false,
      progress: 0,
      status: 'Belum Dimulai'
    };
  }

  const executions = customExecutions || getSeleksi3ExecutionsByDocument(doc.id || doc.docNo);
  const totalPopulasi = parseInt(doc.sourcePolybagQty !== undefined ? doc.sourcePolybagQty : (doc.sourceBibitQty || 0), 10);
  const sourceBibit = parseInt(doc.sourceBibitQty !== undefined ? doc.sourceBibitQty : totalPopulasi, 10);

  const totalPolybagDiperiksa = executions.reduce((sum, tx) => sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 0);
  const totalBibitDiseleksi = executions.reduce((sum, tx) => sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 0);
  const totalBibitDiperiksa = totalBibitDiseleksi;
  const totalBibitReject = totalBibitDiseleksi;
  const totalBibitLayak = Math.max(0, sourceBibit - totalBibitDiseleksi);
  const totalActivePolybag = totalPolybagDiperiksa;

  const sisaPemeriksaan = Math.max(0, totalPopulasi - totalPolybagDiperiksa);
  const pemeriksaanSelesai = totalPopulasi > 0 && totalPolybagDiperiksa === totalPopulasi;
  const balanceValid = true;
  const belumDiklasifikasikan = 0;
  const isOneToOne = true;
  const seleksiValidUntukSelesai = pemeriksaanSelesai && sisaPemeriksaan === 0;
  const progress = totalPopulasi > 0 ? Math.min(100, Math.max(0, Math.round((totalPolybagDiperiksa / totalPopulasi) * 100))) : 0;

  let status = 'Belum Dimulai';
  if (doc.status === SELECTION_STATUS.DISETUJUI && doc.isFinal) {
    status = 'Disetujui';
  } else if (doc.status === SELECTION_STATUS.DIKEMBALIKAN) {
    status = 'Dikembalikan';
  } else if (doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN') {
    status = 'Menunggu Verifikasi';
  } else if (executions.length === 0) {
    status = 'Belum Dimulai';
  } else if (totalPolybagDiperiksa < totalPopulasi) {
    status = 'Sedang Diperiksa';
  } else if (seleksiValidUntukSelesai) {
    status = 'COMPLETED';
  }

  return {
    totalPopulasi,
    totalPolybagDiperiksa,
    totalBibitDiperiksa,
    totalBibitDiseleksi,
    totalBibitLayak,
    totalBibitReject,
    totalBibitDipertahankan: totalBibitLayak,
    totalDiperiksa: totalPolybagDiperiksa,
    totalLayak: totalBibitLayak,
    totalAfkir: totalBibitReject,
    remainingPolybag: sisaPemeriksaan,
    sisaPolybag: sisaPemeriksaan,
    sisaBibit: Math.max(0, sourceBibit - totalBibitDiseleksi),
    totalActivePolybag,
    isOneToOne,
    belumDiklasifikasikan,
    balanceValid,
    sisaPemeriksaan,
    pemeriksaanSelesai,
    seleksiValidUntukSelesai,
    progress,
    status
  };
}

/**
 * Validasi kelayakan completion Dokumen Seleksi Pra-Okulasi sebelum dinyatakan selesai / diajukan ke Asisten
 */
export function validatePreGraftingSelectionCompletion(idOrDocNo) {
  const doc = getPreGraftingSelectionDocumentById(idOrDocNo);
  const errors = [];
  if (!doc) {
    return { isValid: false, errors: ['Dokumen Seleksi Pra-Okulasi tidak ditemukan.'], doc: null, childTransactions: [] };
  }

  const isStage3 = (
    doc.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
    doc.selectionStage === 'SELEKSI_III' ||
    doc.selectionStage === 'SELEKSI_3'
  );

  const isStage2 = (
    doc.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
    doc.selectionStage === 'SELEKSI_II' ||
    doc.selectionStage === 'SELEKSI_2'
  );

  const childTxs = isStage3
    ? getSeleksi3ExecutionsByDocument(doc.id || doc.docNo)
    : (isStage2 
        ? getSeleksi2ExecutionsByDocument(doc.id || doc.docNo)
        : getSeleksi1ExecutionsByDocument(doc.id || doc.docNo));

  const stageLabel = isStage3 ? 'Seleksi III' : (isStage2 ? 'Seleksi II' : 'Seleksi I');

  if (childTxs.length === 0) {
    errors.push(`Dokumen ${doc.docNo} belum memiliki transaksi pelaksanaan ${stageLabel}. Minimal harus ada 1 transaksi sebelum dinyatakan selesai.`);
  }

  const sourcePolybag = parseInt(doc.sourcePolybagQty !== undefined ? doc.sourcePolybagQty : 0, 10);
  const totalPolyDiperiksa = childTxs.reduce((sum, tx) => sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 0);
  const sisaPolybag = Math.max(0, sourcePolybag - totalPolyDiperiksa);

  if (sourcePolybag > 0 && (sisaPolybag > 0 || totalPolyDiperiksa < sourcePolybag)) {
    errors.push(`Dokumen ${doc.docNo} belum selesai diperiksa. Masih terdapat ${sisaPolybag.toLocaleString('id-ID')} polybag yang belum diperiksa (${totalPolyDiperiksa.toLocaleString('id-ID')} dari ${sourcePolybag.toLocaleString('id-ID')} polybag).`);
  }

  childTxs.forEach(tx => {
    const pInspected = parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10);
    if (isNaN(pInspected) || pInspected <= 0) {
      errors.push(`Transaksi ${tx.docNo} memiliki jumlah polybag tidak valid.`);
    }
  });

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    message: errors.join(' '),
    doc,
    childTransactions: childTxs
  };
}

/**
 * Mengatur status completion Dokumen Seleksi Pra-Okulasi secara manual oleh Mantri
 */
export function setPreGraftingSelectionDocumentCompletion(idOrDocNo, isCompleted, currentUser = null) {
  if (currentUser) {
    const role = normalizeRole(currentUser.role || currentUser.rawRole);
    if (role !== ROLES.MANTRI_TANAMAN && !isMantriRole(currentUser)) {
      throw new Error('Hanya Mantri Bibitan yang berwenang menyatakan penyelesaian Dokumen Seleksi.');
    }
  }

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const searchStr = String(idOrDocNo).trim();
  const idx = allDocs.findIndex(d => 
    d.id === searchStr || 
    d.docNo === searchStr || 
    d.selectionDocNo === searchStr ||
    d.sourceDocNo === searchStr ||
    d.sourceTransactionId === searchStr
  );

  if (idx === -1) {
    throw new Error(`Dokumen seleksi pra-okulasi dengan identitas ${idOrDocNo} tidak ditemukan.`);
  }

  const target = allDocs[idx];
  const flag = Boolean(isCompleted);

  if (flag) {
    const val = validatePreGraftingSelectionCompletion(target.id);
    if (!val.isValid) {
      throw new Error(val.errors.join(' '));
    }
  }

  const isStage3 = (
    target.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
    target.selectionStage === 'SELEKSI_III' ||
    target.selectionStage === 'SELEKSI_3'
  );

  const isStage2 = (
    target.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
    target.selectionStage === 'SELEKSI_II' ||
    target.selectionStage === 'SELEKSI_2'
  );
  const childExecCount = isStage3
    ? getSeleksi3ExecutionsByDocument(target.id).length
    : (isStage2 
        ? getSeleksi2ExecutionsByDocument(target.id).length 
        : getSeleksi1ExecutionsByDocument(target.id).length);

  const updated = {
    ...target,
    isCompleted: flag,
    completedAt: flag ? new Date().toISOString() : null,
    completedByUserId: flag ? (currentUser?.userId || currentUser?.code || currentUser?.id || 'MANTRI') : null,
    completedByName: flag ? (currentUser?.name || 'Mantri Bibitan') : null,
    status: flag 
      ? (target.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || target.status === SELECTION_STATUS.DISETUJUI ? target.status : 'COMPLETED') 
      : ((target.executionCount > 0 || childExecCount > 0) ? 'IN_PROGRESS' : 'DRAFT'),
    updatedAt: new Date().toISOString()
  };

  allDocs[idx] = currentUser 
    ? applyTransactionActor(updated, AUDIT_EVENT_TYPES.UPDATE, currentUser, `Pembaruan status selesai dokumen seleksi ${target.docNo}: ${flag ? 'SELESAI' : 'BELUM SELESAI'}`)
    : updated;

  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  return allDocs[idx];
}

/**
 * Pengiriman Dokumen Seleksi Pra-Okulasi dari Verifikasi Data Mantri ke Asisten Bibitan
 */
export function submitPreGraftingSelectionDocumentToAsisten(idOrDocNo, currentUser) {
  if (currentUser) {
    const role = normalizeRole(currentUser.role || currentUser.rawRole);
    if (role !== ROLES.MANTRI_TANAMAN && !isMantriRole(currentUser)) {
      throw new Error('Hanya Mantri Bibitan yang berhak mengirim Dokumen Seleksi ke Asisten Bibitan.');
    }
  }

  const val = validatePreGraftingSelectionCompletion(idOrDocNo);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const targetDoc = val.doc;
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const docIdx = allDocs.findIndex(d => d.id === targetDoc.id);
  if (docIdx === -1) {
    throw new Error(`Dokumen ${idOrDocNo} tidak ditemukan.`);
  }

  const isStage3 = (
    targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
    targetDoc.selectionStage === 'SELEKSI_III' ||
    targetDoc.selectionStage === 'SELEKSI_3'
  );

  const isStage2 = (
    targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
    targetDoc.selectionStage === 'SELEKSI_II' ||
    targetDoc.selectionStage === 'SELEKSI_2'
  );
  const stageLabel = isStage3 ? 'Seleksi III' : (isStage2 ? 'Seleksi II' : 'Seleksi I');

  const nowIso = new Date().toISOString();
  const updatedDoc = applyTransactionActor(
    {
      ...targetDoc,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
      submittedAt: nowIso,
      submittedByUserId: currentUser?.userId || currentUser?.code || currentUser?.id || 'MANTRI',
      submittedByName: currentUser?.name || 'Mantri Bibitan',
      submittedByRole: 'MANTRI_TANAMAN',
      updatedAt: nowIso
    },
    AUDIT_EVENT_TYPES.SUBMIT,
    currentUser,
    `Pengajuan Dokumen ${stageLabel} ${targetDoc.docNo} ke Asisten Bibitan`
  );

  allDocs[docIdx] = updatedDoc;
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);

  // Update seluruh child transactions menjadi MENUNGGU_VERIFIKASI
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  let txsModified = false;
  allTxs.forEach(tx => {
    if (
      tx.selectionDocumentId === targetDoc.id ||
      tx.parentSelectionDocumentId === targetDoc.id ||
      tx.selectionDocNo === targetDoc.docNo ||
      tx.parentSelectionDocNo === targetDoc.docNo
    ) {
      tx.status = SELECTION_STATUS.MENUNGGU_VERIFIKASI;
      tx.updatedAt = nowIso;
      txsModified = true;
    }
  });

  if (txsModified) {
    storage.set(SELECTION_STORAGE_KEY, allTxs);
  }

  return updatedDoc;
}

/**
 * Persetujuan (Approve) Dokumen Seleksi Pra-Okulasi oleh Asisten Bibitan
 * Menjadikan hasil Dokumen Seleksi (I, II, atau III) bersifat FINAL
 */
export function approvePreGraftingSelectionDocument(idOrDocNo, notes = '', currentUser) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak menyetujui Dokumen Seleksi.');
  }

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const searchStr = String(idOrDocNo).trim();
  const idx = allDocs.findIndex(d => 
    d.id === searchStr || 
    d.docNo === searchStr || 
    d.selectionDocNo === searchStr ||
    d.sourceDocNo === searchStr
  );

  if (idx === -1) {
    throw new Error(`Dokumen Seleksi Pra-Okulasi ${idOrDocNo} tidak ditemukan.`);
  }

  const target = allDocs[idx];
  if (!canPerformAsistenSelectionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk menyetujui dokumen ini.');
  }

  const isStage3 = (
    target.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
    target.selectionStage === 'SELEKSI_III' ||
    target.selectionStage === 'SELEKSI_3'
  );

  const isStage2 = (
    target.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
    target.selectionStage === 'SELEKSI_II' ||
    target.selectionStage === 'SELEKSI_2'
  );
  const stageLabel = isStage3 ? 'Seleksi III' : (isStage2 ? 'Seleksi II' : 'Seleksi I');

  const nowIso = new Date().toISOString();
  const updatedDoc = applyTransactionActor(
    {
      ...target,
      status: SELECTION_STATUS.DISETUJUI,
      isFinal: true,
      verificationStatus: 'TERVERIFIKASI',
      finalBibitQty: target.totalLayak !== undefined ? target.totalLayak : target.currentBibitQty,
      finalPolybagQty: target.activePolybagQty !== undefined ? target.activePolybagQty : target.sourcePolybagQty,
      activePolybagQty: target.activePolybagQty !== undefined ? target.activePolybagQty : (target.currentPolybagQty || 0),
      emptyPolybagQty: target.emptyPolybagQty !== undefined ? target.emptyPolybagQty : 0,
      verifiedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      verifiedByName: currentUser.name || 'Asisten Bibitan',
      verifiedByRole: ROLES.ASISTEN_BIBITAN,
      verifiedAt: nowIso,
      approvalNotes: notes || 'Disetujui oleh Asisten Bibitan',
      updatedAt: nowIso
    },
    AUDIT_EVENT_TYPES.APPROVE,
    currentUser,
    `Persetujuan final Dokumen ${stageLabel} ${target.docNo} oleh Asisten Bibitan`
  );

  allDocs[idx] = updatedDoc;
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);

  // Update child transactions status
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  let txsModified = false;
  allTxs.forEach(tx => {
    if (
      tx.selectionDocumentId === target.id ||
      tx.parentSelectionDocumentId === target.id ||
      tx.selectionDocNo === target.docNo ||
      tx.parentSelectionDocNo === target.docNo
    ) {
      tx.status = SELECTION_STATUS.DISETUJUI;
      tx.verifiedByUserId = currentUser.userId || currentUser.code || currentUser.id;
      tx.verifiedByName = currentUser.name;
      tx.verifiedAt = nowIso;
      tx.approvalNotes = notes || 'Disetujui oleh Asisten Bibitan';
      tx.updatedAt = nowIso;
      txsModified = true;
    }
  });

  if (txsModified) {
    storage.set(SELECTION_STORAGE_KEY, allTxs);
  }

  // Record audit trail di verification_transactions (ZERO STOCK MUTATION)
  const allVerifs = storage.get('verification_transactions', []);
  allVerifs.push({
    verificationId: `VRF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    verificationNo: `VRF-2026-${Date.now().toString().slice(-4)}`,
    referenceType: 'SELECTION',
    referenceId: target.id,
    referenceDocNo: target.docNo,
    estateId: target.estateId || currentUser.estateId,
    divisionId: target.divisionId || currentUser.divisionId,
    verificationStatus: 'TERVERIFIKASI',
    notes: (notes || '').trim(),
    verifiedByUserId: currentUser.userId || currentUser.code || currentUser.id,
    verifiedByName: currentUser.name || 'Asisten Bibitan',
    verifiedByRole: ROLES.ASISTEN_BIBITAN,
    verifiedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  });
  storage.set('verification_transactions', allVerifs);

  return updatedDoc;
}

/**
 * Pengembalian (Return) Dokumen Seleksi Pra-Okulasi oleh Asisten Bibitan ke Mantri
 */
export function returnPreGraftingSelectionDocument(idOrDocNo, returnReason, currentUser) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak mengembalikan Dokumen Seleksi.');
  }

  if (!returnReason || !returnReason.trim()) {
    throw new Error('Alasan pengembalian wajib diisi.');
  }

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const searchStr = String(idOrDocNo).trim();
  const idx = allDocs.findIndex(d => 
    d.id === searchStr || 
    d.docNo === searchStr || 
    d.selectionDocNo === searchStr ||
    d.sourceDocNo === searchStr
  );

  if (idx === -1) {
    throw new Error(`Dokumen Seleksi Pra-Okulasi ${idOrDocNo} tidak ditemukan.`);
  }

  const target = allDocs[idx];
  if (!canPerformAsistenSelectionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk mengembalikan dokumen ini.');
  }

  const isStage3 = (
    target.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
    target.selectionStage === 'SELEKSI_III' ||
    target.selectionStage === 'SELEKSI_3'
  );

  const isStage2 = (
    target.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
    target.selectionStage === 'SELEKSI_II' ||
    target.selectionStage === 'SELEKSI_2'
  );
  const stageLabel = isStage3 ? 'Seleksi III' : (isStage2 ? 'Seleksi II' : 'Seleksi I');

  const nowIso = new Date().toISOString();
  const updatedDoc = applyTransactionActor(
    {
      ...target,
      status: SELECTION_STATUS.DIKEMBALIKAN,
      isFinal: false,
      isCompleted: false, // Dikembalikan ke Mantri untuk perbaikan / penambahan sesi
      verificationStatus: 'DIKEMBALIKAN',
      returnReason: returnReason.trim(),
      returnedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      returnedByName: currentUser.name || 'Asisten Bibitan',
      returnedByRole: ROLES.ASISTEN_BIBITAN,
      returnedAt: nowIso,
      updatedAt: nowIso
    },
    AUDIT_EVENT_TYPES.REJECT,
    currentUser,
    `Pengembalian Dokumen ${stageLabel} ${target.docNo} ke Mantri: ${returnReason.trim()}`
  );

  allDocs[idx] = updatedDoc;
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);

  // Update child transactions status
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  let txsModified = false;
  allTxs.forEach(tx => {
    if (
      tx.selectionDocumentId === target.id ||
      tx.parentSelectionDocumentId === target.id ||
      tx.selectionDocNo === target.docNo ||
      tx.parentSelectionDocNo === target.docNo
    ) {
      tx.status = SELECTION_STATUS.DIKEMBALIKAN;
      tx.returnReason = returnReason.trim();
      tx.returnedByUserId = currentUser.userId || currentUser.code || currentUser.id;
      tx.returnedByName = currentUser.name;
      tx.returnedAt = nowIso;
      tx.updatedAt = nowIso;
      txsModified = true;
    }
  });

  if (txsModified) {
    storage.set(SELECTION_STORAGE_KEY, allTxs);
  }

  // Record audit trail di verification_transactions
  const allVerifs = storage.get('verification_transactions', []);
  allVerifs.push({
    verificationId: `VRF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    verificationNo: `VRF-2026-${Date.now().toString().slice(-4)}`,
    referenceType: 'SELECTION',
    referenceId: target.id,
    referenceDocNo: target.docNo,
    estateId: target.estateId || currentUser.estateId,
    divisionId: target.divisionId || currentUser.divisionId,
    verificationStatus: 'DIKEMBALIKAN',
    returnReason: returnReason.trim(),
    verifiedByUserId: currentUser.userId || currentUser.code || currentUser.id,
    verifiedByName: currentUser.name || 'Asisten Bibitan',
    verifiedByRole: ROLES.ASISTEN_BIBITAN,
    verifiedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  });
  storage.set('verification_transactions', allVerifs);

  return updatedDoc;
}

/**
 * Sinkronisasi seluruh transaksi penyemaian ke Dokumen Seleksi Pra-Okulasi secara idempoten
 */
export function syncAllSeedingsToPreGraftingSelectionDocuments(currentUser = null) {
  const seedingTxs = storage.get('seeding_transactions', []);
  let createdCount = 0;

  seedingTxs.forEach(tx => {
    try {
      const existing = getPreGraftingSelectionDocumentById(tx.docNo || tx.id);
      if (!existing) {
        createPreGraftingSelectionDocument(tx, currentUser);
        createdCount++;
      }
    } catch (err) {
      console.warn(`[syncAllSeedingsToPreGraftingSelectionDocuments] Skip ${tx.docNo}:`, err.message);
    }
  });

  return createdCount;
}

/**
 * =============================================================================
 * TRANSAKSI PELAKSANAAN SELEKSI I (TASK-03)
 * =============================================================================
 */

/**
 * Mengambil daftar transaksi pelaksanaan Seleksi I untuk suatu parent Dokumen Seleksi
 */
export function getSeleksi1ExecutionsByDocument(idOrDocNo) {
  if (!idOrDocNo) return [];
  const searchStr = String(idOrDocNo).trim();
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  
  return allTxs.filter(tx => {
    const isStage1 = (
      tx.selectionStage === SELECTION_STAGES.SELEKSI_1 ||
      tx.stage === 'SELEKSI_I' ||
      tx.transactionType === 'PELAKSANAAN_SELEKSI_I'
    );
    if (!isStage1) return false;

    return (
      tx.parentSelectionDocumentId === searchStr ||
      tx.selectionDocumentId === searchStr ||
      tx.parentSelectionDocNo === searchStr ||
      tx.selectionDocNo === searchStr ||
      tx.sourceDocNo === searchStr
    );
  });
}

/**
 * Menghitung status alokasi dan sisa scope bedengan untuk Dokumen Seleksi I
 */
export function getBedenganScopeStatusForSeleksi1(parentDoc, txsOverride = null) {
  if (!parentDoc) return [];
  
  const executions = Array.isArray(txsOverride) ? txsOverride : getSeleksi1ExecutionsByDocument(parentDoc.id || parentDoc.docNo);
  
  // Resolve bedengan list from rows or bedenganIds
  let bedenganList = [];
  if (Array.isArray(parentDoc.rows) && parentDoc.rows.length > 0) {
    bedenganList = parentDoc.rows.map(r => ({
      bedenganId: r.bedenganId || r.bedenganCode || r.bedengan,
      bedenganCode: formatBedenganDisplayCode(r.bedenganCode || r.bedengan || r.bedenganId),
      initialPolybag: parseInt(r.polybag !== undefined ? r.polybag : Math.ceil((r.disemai || 0) / 2), 10),
      initialBibit: parseInt(r.disemai || ((r.polybag || 0) * 2), 10)
    }));
  } else if (Array.isArray(parentDoc.bedenganIds) && parentDoc.bedenganIds.length > 0) {
    const polyPerBed = Math.floor(parentDoc.sourcePolybagQty / parentDoc.bedenganIds.length);
    const remPoly = parentDoc.sourcePolybagQty % parentDoc.bedenganIds.length;
    bedenganList = parentDoc.bedenganIds.map((bId, idx) => ({
      bedenganId: bId,
      bedenganCode: formatBedenganDisplayCode(bId),
      initialPolybag: polyPerBed + (idx === 0 ? remPoly : 0),
      initialBibit: (polyPerBed + (idx === 0 ? remPoly : 0)) * 2
    }));
  } else {
    bedenganList = [{
      bedenganId: parentDoc.bedenganId || 'BED-001',
      bedenganCode: formatBedenganDisplayCode(parentDoc.bedenganCode || parentDoc.bedengan || 'BED-001'),
      initialPolybag: parentDoc.sourcePolybagQty || 0,
      initialBibit: parentDoc.sourceBibitQty || 0
    }];
  }

  // Calculate inspected polybag per bedengan from executions
  return bedenganList.map(bed => {
    const bedNorm = String(bed.bedenganCode || bed.bedenganId).trim().toUpperCase();
    const bedTxs = executions.filter(tx => {
      const txBed = String(tx.bedenganCode || tx.bedengan || tx.bedenganId || '').trim().toUpperCase();
      return txBed === bedNorm || txBed === String(bed.bedenganId).toUpperCase();
    });

    const inspectedPolybag = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 0);
    const inspectedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 0);
    const maintainedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualBibitRetainedQty !== undefined ? tx.actualBibitRetainedQty : (tx.bibitDipertahankan || tx.jumlahLayak || 0), 10), 0);
    const rejectedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.bibitReject !== undefined ? tx.bibitReject : (tx.jumlahAfkir || 0), 10), 0);
    const remainingPolybag = Math.max(0, bed.initialPolybag - inspectedPolybag);
    const remainingBibit = Math.max(0, bed.initialBibit - inspectedBibit);

    return {
      ...bed,
      inspectedPolybag,
      inspectedBibit,
      maintainedBibit,
      rejectedBibit,
      remainingPolybag,
      remainingBibit,
      isFullyInspected: remainingPolybag === 0 && bed.initialPolybag > 0
    };
  });
}

/**
 * Validasi payload transaksi pelaksanaan Seleksi I
 * Mendukung model kuantitas baru (actualPolybagInspectedQty, actualBibitSelectedQty) dan Legacy
 */
export function validateSeleksi1Execution(payload, parentDoc, existingTxs = []) {
  const errors = [];
  if (!payload) {
    return { isValid: false, errors: ['Data transaksi Seleksi I tidak boleh kosong.'] };
  }
  if (!parentDoc) {
    return { isValid: false, errors: ['Dokumen Seleksi Pra-Okulasi (parent) tidak ditemukan.'] };
  }

  // 1. Bedengan validation
  const bedenganCode = String(payload.bedenganCode || payload.bedengan || payload.bedenganId || '').trim();
  if (!bedenganCode) {
    errors.push('Bedengan yang diperiksa wajib dipilih.');
  }

  const bedScopeList = getBedenganScopeStatusForSeleksi1(parentDoc, existingTxs);
  const bedNorm = formatBedenganDisplayCode(bedenganCode).toUpperCase();
  const matchedBed = bedScopeList.find(b => 
    formatBedenganDisplayCode(b.bedenganCode).toUpperCase() === bedNorm ||
    String(b.bedenganId).toUpperCase() === String(payload.bedenganId || '').toUpperCase() ||
    String(b.bedenganCode).toUpperCase() === bedNorm
  );

  if (!matchedBed) {
    errors.push(`Bedengan ${bedenganCode} tidak termasuk dalam scope Dokumen Seleksi ${parentDoc.docNo}.`);
  }

  const maxPolybagScope = matchedBed ? matchedBed.remainingPolybag : parseInt(parentDoc.sourcePolybagQty || 0, 10);
  const sourceBibit = parseInt(parentDoc.sourceBibitQty !== undefined ? parentDoc.sourceBibitQty : ((parentDoc.sourcePolybagQty || 0) * 2), 10);

  // Parse 2 canonical inputs: Jlh Polybag Diperiksa & Jlh Bibit Diseleksi
  const actualPolyInspected = parseInt(
    payload.actualPolybagInspectedQty !== undefined
      ? payload.actualPolybagInspectedQty
      : (payload.polybagScope !== undefined
          ? payload.polybagScope
          : (payload.actualPolybagActiveQty !== undefined ? payload.actualPolybagActiveQty : payload.polybagAktif || 0)),
    10
  );

  const actualBibitSelected = parseInt(
    payload.actualBibitSelectedQty !== undefined
      ? payload.actualBibitSelectedQty
      : (payload.selectedBibitScopeQty !== undefined
          ? payload.selectedBibitScopeQty
          : (payload.jumlahDiperiksa !== undefined
              ? payload.jumlahDiperiksa
              : (payload.bibitAwal !== undefined ? payload.bibitAwal : 0))),
    10
  );

  if (isNaN(actualPolyInspected) || actualPolyInspected <= 0) {
    errors.push('Jumlah polybag diperiksa harus lebih besar dari 0.');
  }
  if (actualPolyInspected > maxPolybagScope) {
    errors.push(`Jumlah polybag diperiksa (${actualPolyInspected}) melebihi sisa scope polybag yang tersedia (${maxPolybagScope}).`);
  }

  if (isNaN(actualBibitSelected) || actualBibitSelected < 0) {
    errors.push('Jumlah bibit diseleksi tidak boleh negatif.');
  }

  // Hitung otomatis Bibit Dipertahankan secara kumulatif
  const existingBibitSelectedSum = existingTxs.reduce((sum, tx) => 
    sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
    0
  );
  const totalBibitDiseleksiAfter = existingBibitSelectedSum + (isNaN(actualBibitSelected) ? 0 : actualBibitSelected);
  const cumulativeBibitRetained = Math.max(0, sourceBibit - totalBibitDiseleksiAfter);

  const polyScope = actualPolyInspected;
  const inactivePolybagQty = 0;
  const selectedBibitScopeQty = actualBibitSelected;
  const bibitReject = actualBibitSelected;
  const bibitAwal = actualBibitSelected;

  return {
    isValid: errors.length === 0,
    errors,
    parsed: {
      bedenganId: matchedBed ? matchedBed.bedenganId : (payload.bedenganId || bedenganCode),
      bedenganCode: matchedBed ? matchedBed.bedenganCode : bedenganCode,
      polybagScope: polyScope,
      actualPolybagInspectedQty: actualPolyInspected,
      actualPolybagActiveQty: actualPolyInspected,
      actualBibitSelectedQty: actualBibitSelected,
      actualBibitRetainedQty: cumulativeBibitRetained,
      inactivePolybagQty,
      selectedBibitScopeQty,
      activePolybagQty: actualPolyInspected,
      totalLayak: cumulativeBibitRetained,
      bibitAwal,
      jumlahDiperiksa: actualBibitSelected,
      bibitDipertahankan: cumulativeBibitRetained,
      bibitReject
    }
  };
}

/**
 * Membuat transaksi pelaksanaan Seleksi I baru oleh Mantri Bibitan
 */
export function createSeleksi1ExecutionTransaction(payload, currentUser) {
  const parentDocId = payload.selectionDocumentId || payload.selectionDocNo || payload.docNo;
  const parentDoc = getPreGraftingSelectionDocumentById(parentDocId);
  if (!parentDoc) {
    throw new Error(`Dokumen Seleksi Pra-Okulasi dengan identitas "${parentDocId}" tidak ditemukan.`);
  }

  const existingExecutions = getSeleksi1ExecutionsByDocument(parentDoc.id);
  const val = validateSeleksi1Execution(payload, parentDoc, existingExecutions);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  
  // Generate Transaction Document Number
  let maxSeq = 0;
  allTxs.forEach(tx => {
    const d = String(tx.docNo || tx.selectionNo || '');
    const match = d.match(/SEL(?:-I|-TX)?\/(\d+)/i) || d.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  });

  const txSeq = maxSeq + 1;
  const txDocNo = payload.docNo || formatStandardDocNo(2026, 'SEL-I', txSeq);
  const today = payload.tanggalSeleksi || payload.date || formatDate(new Date().toISOString());

  const txRecord = {
    id: payload.id || `SEL-TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    docNo: txDocNo,
    selectionNo: txDocNo,
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    
    // Parent Document relation
    selectionDocumentId: parentDoc.id,
    selectionDocNo: parentDoc.docNo,
    parentSelectionDocumentId: parentDoc.id,
    parentSelectionDocNo: parentDoc.docNo,
    
    // Source Penyemaian relation
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceTransactionId: parentDoc.sourceTransactionId,
    sourceDocNo: parentDoc.sourceDocNo,
    seedingDocNo: parentDoc.sourceDocNo,
    
    // Master & Scope Contexts
    batchId: parentDoc.batchId,
    batchCode: parentDoc.batchCode,
    batchNo: parentDoc.batchCode,
    programId: parentDoc.programId,
    programCode: parentDoc.programCode,
    programName: parentDoc.programName,
    estateId: parentDoc.estateId || currentUser?.estateId,
    estateName: parentDoc.estateName || currentUser?.estateName,
    divisionId: parentDoc.divisionId || currentUser?.divisionId,
    divisionName: parentDoc.divisionName || currentUser?.divisionName,
    clone: parentDoc.clone,
    klon: parentDoc.klon,
    growthStage: parentDoc.growthStage || 'Rubber Main Nursery',
    
    bedenganId: val.parsed.bedenganId,
    bedenganCode: val.parsed.bedenganCode,
    bedengan: val.parsed.bedenganCode,
    
    // Population Breakdown & Quantities
    polybagScope: val.parsed.actualPolybagInspectedQty,
    initialPolybagCount: val.parsed.actualPolybagInspectedQty,
    sourcePolybagQty: parentDoc.sourcePolybagQty,
    sourceBibitQty: parentDoc.sourceBibitQty,
    bibitAwal: val.parsed.actualBibitSelectedQty,
    jumlahDiperiksa: val.parsed.actualBibitSelectedQty,
    
    // Canonical Quantities
    actualPolybagInspectedQty: val.parsed.actualPolybagInspectedQty,
    actualBibitSelectedQty: val.parsed.actualBibitSelectedQty,
    actualBibitRetainedQty: val.parsed.actualBibitRetainedQty,
    actualPolybagActiveQty: val.parsed.actualPolybagInspectedQty,
    activePolybagQty: val.parsed.actualPolybagInspectedQty,
    selectedBibitScopeQty: val.parsed.actualBibitSelectedQty,
    totalLayak: val.parsed.actualBibitRetainedQty,
    bibitDipertahankan: val.parsed.actualBibitRetainedQty,
    jumlahLayak: val.parsed.actualBibitRetainedQty,
    bibitReject: val.parsed.actualBibitSelectedQty,
    jumlahAfkir: val.parsed.actualBibitSelectedQty,
    
    // Reject Source Reference
    rejectSourceReference: {
      stage: SELECTION_STAGES.SELEKSI_1,
      parentDocNo: parentDoc.docNo,
      sourceDocNo: parentDoc.sourceDocNo,
      bedenganCode: val.parsed.bedenganCode,
      rejectCount: val.parsed.actualBibitSelectedQty
    },
    
    tanggalSeleksi: today,
    tanggal: today,
    catatan: payload.catatan || payload.remarks || '-',
    
    status: 'RECORDED',
    stockMutationStatus: 'NOT_REQUIRED',
    
    createdByUserId: currentUser?.userId || currentUser?.code || currentUser?.id || 'MANTRI',
    createdByName: currentUser?.name || 'Mantri Bibitan',
    createdByRole: currentUser?.role || 'MANTRI_TANAMAN',
    createdAt: new Date().toISOString()
  };

  const newTx = currentUser 
    ? applyTransactionActor(txRecord, AUDIT_EVENT_TYPES.CREATE, currentUser, `Pelaksanaan Seleksi I pada ${val.parsed.bedenganCode} (${val.parsed.actualPolybagInspectedQty} Polybag, ${val.parsed.actualBibitSelectedQty} Bibit Diseleksi)`)
    : txRecord;

  // 1. Save execution transaction to selection_transactions
  allTxs.push(newTx);
  storage.set(SELECTION_STORAGE_KEY, allTxs);

  // 2. Update Parent Pre-Grafting Selection Document
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentIdx = allDocs.findIndex(d => d.id === parentDoc.id || d.docNo === parentDoc.docNo);
  
  if (parentIdx !== -1) {
    const currentParent = allDocs[parentIdx];
    
    const parentExecutions = allTxs.filter(tx => {
      const isStage1 = (
        tx.selectionStage === SELECTION_STAGES.SELEKSI_1 ||
        tx.stage === 'SELEKSI_I' ||
        tx.stage === 'SELEKSI_1' ||
        tx.transactionType === 'PELAKSANAAN_SELEKSI_I'
      );
      if (!isStage1) return false;
      return (
        tx.parentSelectionDocumentId === currentParent.id ||
        tx.selectionDocumentId === currentParent.id ||
        tx.parentSelectionDocNo === currentParent.docNo ||
        tx.selectionDocNo === currentParent.docNo
      );
    });

    const sourcePoly = parseInt(currentParent.sourcePolybagQty || 0, 10);
    const sourceBibit = parseInt(currentParent.sourceBibitQty !== undefined ? currentParent.sourceBibitQty : (sourcePoly * 2), 10);

    const updatedTotalPolyDiperiksa = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 
      0
    );
    const updatedTotalBibitDiseleksi = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
      0
    );
    const updatedTotalLayak = Math.max(0, sourceBibit - updatedTotalBibitDiseleksi);
    const updatedTotalAfkir = updatedTotalBibitDiseleksi;
    const sisaPolybag = Math.max(0, sourcePoly - updatedTotalPolyDiperiksa);
    const isAllPolybagChecked = sourcePoly > 0 && updatedTotalPolyDiperiksa === sourcePoly && sisaPolybag === 0;

    allDocs[parentIdx] = {
      ...currentParent,
      executionTransactionIds: parentExecutions.map(tx => tx.id),
      executionCount: parentExecutions.length,
      totalDiperiksa: updatedTotalPolyDiperiksa,
      totalPolybagDiperiksa: updatedTotalPolyDiperiksa,
      totalBibitDiseleksi: updatedTotalBibitDiseleksi,
      totalBibitSelectedQty: updatedTotalBibitDiseleksi,
      totalBibitRetainedQty: updatedTotalLayak,
      totalLayak: updatedTotalLayak,
      totalAfkir: updatedTotalAfkir,
      totalReject: updatedTotalAfkir,
      activePolybagQty: updatedTotalPolyDiperiksa,
      currentBibitQty: updatedTotalLayak,
      currentPolybagQty: updatedTotalPolyDiperiksa,
      remainingPolybag: sisaPolybag,
      sisaPolybag: sisaPolybag,
      sisaBibit: Math.max(0, sourceBibit - updatedTotalBibitDiseleksi),
      progress: sourcePoly > 0 ? Math.min(100, Math.max(0, Math.round((updatedTotalPolyDiperiksa / sourcePoly) * 100))) : 0,
      isCompleted: isAllPolybagChecked,
      status: isAllPolybagChecked 
        ? 'COMPLETED'
        : (parentExecutions.length > 0 ? 'IN_PROGRESS' : 'DRAFT'),
      updatedAt: new Date().toISOString()
    };

    storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  }

  return {
    success: true,
    transaction: newTx,
    parentDocument: parentIdx !== -1 ? allDocs[parentIdx] : parentDoc
  };
}

/**
 * Menghapus transaksi pelaksanaan Seleksi I dan mengkalkulasi ulang Dokumen Induk
 */
export function deleteSeleksi1ExecutionTransaction(txIdOrDocNo, currentUser = null) {
  if (!txIdOrDocNo) {
    throw new Error('ID atau Nomor Transaksi yang akan dihapus tidak valid.');
  }

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const txIdx = allTxs.findIndex(tx => tx.id === txIdOrDocNo || tx.docNo === txIdOrDocNo || tx.selectionNo === txIdOrDocNo);
  
  if (txIdx === -1) {
    throw new Error(`Transaksi Seleksi I "${txIdOrDocNo}" tidak ditemukan.`);
  }

  const targetTx = allTxs[txIdx];
  const parentDocId = targetTx.parentSelectionDocumentId || targetTx.selectionDocumentId;
  const parentDocNo = targetTx.parentSelectionDocNo || targetTx.selectionDocNo;

  // Remove transaction
  allTxs.splice(txIdx, 1);
  storage.set(SELECTION_STORAGE_KEY, allTxs);

  // Recalculate Parent Pre-Grafting Selection Document
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentIdx = allDocs.findIndex(d => d.id === parentDocId || d.docNo === parentDocNo);

  if (parentIdx !== -1) {
    const currentParent = allDocs[parentIdx];
    const parentExecutions = allTxs.filter(tx => {
      const isStage1 = (
        tx.selectionStage === SELECTION_STAGES.SELEKSI_1 ||
        tx.stage === 'SELEKSI_I' ||
        tx.stage === 'SELEKSI_1' ||
        tx.transactionType === 'PELAKSANAAN_SELEKSI_I'
      );
      if (!isStage1) return false;
      return (
        tx.parentSelectionDocumentId === currentParent.id ||
        tx.selectionDocumentId === currentParent.id ||
        tx.parentSelectionDocNo === currentParent.docNo ||
        tx.selectionDocNo === currentParent.docNo
      );
    });

    const sourcePoly = parseInt(currentParent.sourcePolybagQty || 0, 10);
    const sourceBibit = parseInt(currentParent.sourceBibitQty !== undefined ? currentParent.sourceBibitQty : (sourcePoly * 2), 10);

    const updatedTotalPolyDiperiksa = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 
      0
    );
    const updatedTotalBibitDiseleksi = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
      0
    );
    const updatedTotalLayak = Math.max(0, sourceBibit - updatedTotalBibitDiseleksi);
    const updatedTotalAfkir = updatedTotalBibitDiseleksi;
    const sisaPolybag = Math.max(0, sourcePoly - updatedTotalPolyDiperiksa);
    const isAllPolybagChecked = sourcePoly > 0 && updatedTotalPolyDiperiksa === sourcePoly && sisaPolybag === 0;

    allDocs[parentIdx] = {
      ...currentParent,
      executionTransactionIds: parentExecutions.map(tx => tx.id),
      executionCount: parentExecutions.length,
      totalDiperiksa: updatedTotalPolyDiperiksa,
      totalPolybagDiperiksa: updatedTotalPolyDiperiksa,
      totalBibitDiseleksi: updatedTotalBibitDiseleksi,
      totalBibitSelectedQty: updatedTotalBibitDiseleksi,
      totalBibitRetainedQty: updatedTotalLayak,
      totalLayak: updatedTotalLayak,
      totalAfkir: updatedTotalAfkir,
      totalReject: updatedTotalAfkir,
      activePolybagQty: updatedTotalPolyDiperiksa,
      currentBibitQty: updatedTotalLayak,
      currentPolybagQty: updatedTotalPolyDiperiksa,
      remainingPolybag: sisaPolybag,
      sisaPolybag: sisaPolybag,
      sisaBibit: Math.max(0, sourceBibit - updatedTotalBibitDiseleksi),
      progress: sourcePoly > 0 ? Math.min(100, Math.max(0, Math.round((updatedTotalPolyDiperiksa / sourcePoly) * 100))) : 0,
      isCompleted: isAllPolybagChecked,
      status: isAllPolybagChecked ? 'COMPLETED' : (parentExecutions.length > 0 ? 'IN_PROGRESS' : 'DRAFT'),
      updatedAt: new Date().toISOString()
    };

    storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  }

  return { success: true };
}

/**
 * =============================================================================
 * TRANSAKSI PELAKSANAAN SELEKSI II (PRA-OKULASI)
 * =============================================================================
 */

/**
 * Mengambil daftar transaksi pelaksanaan Seleksi II yang berelasi dengan Dokumen Seleksi II
 */
export function getSeleksi2ExecutionsByDocument(idOrDocNo) {
  if (!idOrDocNo) return [];
  const searchStr = String(idOrDocNo).trim();
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  
  return allTxs.filter(tx => {
    const isStage2 = (
      tx.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
      tx.stage === 'SELEKSI_II' ||
      tx.stage === 'SELEKSI_2' ||
      tx.transactionType === 'PELAKSANAAN_SELEKSI_II'
    );
    if (!isStage2) return false;

    return (
      tx.parentSelectionDocumentId === searchStr ||
      tx.selectionDocumentId === searchStr ||
      tx.parentSelectionDocNo === searchStr ||
      tx.selectionDocNo === searchStr ||
      tx.sourceDocNo === searchStr ||
      tx.sourceSelectionDocNo === searchStr
    );
  });
}

/**
 * Menghitung status alokasi dan sisa scope bedengan untuk Dokumen Seleksi II
 */
export function getBedenganScopeStatusForSeleksi2(parentDoc, txsOverride = null) {
  if (!parentDoc) return [];
  
  const executions = Array.isArray(txsOverride) ? txsOverride : getSeleksi2ExecutionsByDocument(parentDoc.id || parentDoc.docNo);
  
  let bedenganList = [];
  if (Array.isArray(parentDoc.rows) && parentDoc.rows.length > 0) {
    bedenganList = parentDoc.rows.map(r => ({
      bedenganId: r.bedenganId || r.bedenganCode || r.bedengan,
      bedenganCode: formatBedenganDisplayCode(r.bedenganCode || r.bedengan || r.bedenganId),
      initialPolybag: parseInt(r.polybag || 0, 10),
      initialBibit: parseInt(r.sourceBibitQty !== undefined ? r.sourceBibitQty : (r.disemai || 0), 10)
    }));
  } else if (Array.isArray(parentDoc.bedenganIds) && parentDoc.bedenganIds.length > 0) {
    const polyPerBed = Math.floor(parentDoc.sourcePolybagQty / parentDoc.bedenganIds.length);
    const remPoly = parentDoc.sourcePolybagQty % parentDoc.bedenganIds.length;
    const bibitPerBed = Math.floor(parentDoc.sourceBibitQty / parentDoc.bedenganIds.length);
    const remBibit = parentDoc.sourceBibitQty % parentDoc.bedenganIds.length;
    bedenganList = parentDoc.bedenganIds.map((bId, idx) => ({
      bedenganId: bId,
      bedenganCode: formatBedenganDisplayCode(bId),
      initialPolybag: polyPerBed + (idx === 0 ? remPoly : 0),
      initialBibit: bibitPerBed + (idx === 0 ? remBibit : 0)
    }));
  } else {
    bedenganList = [{
      bedenganId: parentDoc.bedenganId || 'BED-001',
      bedenganCode: formatBedenganDisplayCode(parentDoc.bedenganCode || parentDoc.bedengan || 'BED-001'),
      initialPolybag: parentDoc.sourcePolybagQty || 0,
      initialBibit: parentDoc.sourceBibitQty || 0
    }];
  }

  return bedenganList.map(bed => {
    const bedNorm = String(bed.bedenganCode || bed.bedenganId).trim().toUpperCase();
    const bedTxs = executions.filter(tx => {
      const txBed = String(tx.bedenganCode || tx.bedengan || tx.bedenganId || '').trim().toUpperCase();
      return txBed === bedNorm || txBed === String(bed.bedenganId).toUpperCase();
    });

    const inspectedPolybag = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 0);
    const inspectedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 0);
    const maintainedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualBibitRetainedQty !== undefined ? tx.actualBibitRetainedQty : (tx.bibitDipertahankan || tx.jumlahLayak || 0), 10), 0);
    const rejectedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.bibitReject !== undefined ? tx.bibitReject : (tx.jumlahAfkir || 0), 10), 0);
    const remainingPolybag = Math.max(0, bed.initialPolybag - inspectedPolybag);
    const remainingBibit = Math.max(0, bed.initialBibit - inspectedBibit);

    return {
      ...bed,
      inspectedPolybag,
      inspectedBibit,
      maintainedBibit,
      rejectedBibit,
      remainingPolybag,
      remainingBibit,
      isFullyInspected: remainingPolybag === 0 && bed.initialPolybag > 0
    };
  });
}

/**
 * Validasi payload transaksi pelaksanaan Seleksi II
 * Mendukung model kuantitas baru (actualPolybagInspectedQty, actualBibitSelectedQty) dan Legacy
 */
export function validateSeleksi2Execution(payload, parentDoc, existingTxs = []) {
  const errors = [];
  if (!payload) {
    return { isValid: false, errors: ['Data transaksi Seleksi II tidak boleh kosong.'] };
  }
  if (!parentDoc) {
    return { isValid: false, errors: ['Dokumen Seleksi II (parent) tidak ditemukan.'] };
  }

  const stage = String(parentDoc.selectionStage || '').toUpperCase();
  if (stage !== 'SELEKSI_II' && stage !== 'SELEKSI_2') {
    errors.push(`Parent document bukan merupakan Dokumen Seleksi II (stage: ${parentDoc.selectionStage}).`);
  }

  // 1. Bedengan validation
  const bedenganCode = String(payload.bedenganCode || payload.bedengan || payload.bedenganId || '').trim();
  if (!bedenganCode) {
    errors.push('Bedengan yang diperiksa wajib dipilih.');
  }

  const bedScopeList = getBedenganScopeStatusForSeleksi2(parentDoc, existingTxs);
  const bedNorm = formatBedenganDisplayCode(bedenganCode).toUpperCase();
  const matchedBed = bedScopeList.find(b => 
    formatBedenganDisplayCode(b.bedenganCode).toUpperCase() === bedNorm ||
    String(b.bedenganId).toUpperCase() === String(payload.bedenganId || '').toUpperCase() ||
    String(b.bedenganCode).toUpperCase() === bedNorm
  );

  if (!matchedBed) {
    errors.push(`Bedengan ${bedenganCode} tidak termasuk dalam scope Dokumen Seleksi II ${parentDoc.docNo}.`);
  }

  const maxPolybagScope = matchedBed ? matchedBed.remainingPolybag : parseInt(parentDoc.sourcePolybagQty || 0, 10);
  const sourceBibit = parseInt(parentDoc.sourceBibitQty !== undefined ? parentDoc.sourceBibitQty : (parentDoc.sourcePolybagQty || 0), 10);

  // Parse 2 canonical inputs: Jlh Polybag Diperiksa & Jlh Bibit Diseleksi
  const actualPolyInspected = parseInt(
    payload.actualPolybagInspectedQty !== undefined
      ? payload.actualPolybagInspectedQty
      : (payload.polybagScope !== undefined
          ? payload.polybagScope
          : (payload.actualPolybagActiveQty !== undefined ? payload.actualPolybagActiveQty : payload.polybagAktif || 0)),
    10
  );

  const actualBibitSelected = parseInt(
    payload.actualBibitSelectedQty !== undefined
      ? payload.actualBibitSelectedQty
      : (payload.selectedBibitScopeQty !== undefined
          ? payload.selectedBibitScopeQty
          : (payload.jumlahDiperiksa !== undefined
              ? payload.jumlahDiperiksa
              : (payload.bibitAwal !== undefined ? payload.bibitAwal : 0))),
    10
  );

  if (isNaN(actualPolyInspected) || actualPolyInspected <= 0) {
    errors.push('Jumlah polybag diperiksa harus lebih besar dari 0.');
  }
  if (actualPolyInspected > maxPolybagScope) {
    errors.push(`Jumlah polybag diperiksa (${actualPolyInspected}) melebihi sisa scope polybag yang tersedia (${maxPolybagScope}).`);
  }

  if (isNaN(actualBibitSelected) || actualBibitSelected < 0) {
    errors.push('Jumlah bibit diseleksi tidak boleh negatif.');
  }

  // Hitung otomatis Bibit Dipertahankan secara kumulatif
  const existingBibitSelectedSum = existingTxs.reduce((sum, tx) => 
    sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
    0
  );
  const totalBibitDiseleksiAfter = existingBibitSelectedSum + (isNaN(actualBibitSelected) ? 0 : actualBibitSelected);
  const cumulativeBibitRetained = Math.max(0, sourceBibit - totalBibitDiseleksiAfter);

  const polyScope = actualPolyInspected;
  const inactivePolybagQty = 0;
  const selectedBibitScopeQty = actualBibitSelected;
  const bibitReject = actualBibitSelected;
  const bibitAwal = actualBibitSelected;

  return {
    isValid: errors.length === 0,
    errors,
    parsed: {
      bedenganId: matchedBed ? matchedBed.bedenganId : (payload.bedenganId || bedenganCode),
      bedenganCode: matchedBed ? matchedBed.bedenganCode : bedenganCode,
      polybagScope: polyScope,
      actualPolybagInspectedQty: actualPolyInspected,
      actualPolybagActiveQty: actualPolyInspected,
      actualBibitSelectedQty: actualBibitSelected,
      actualBibitRetainedQty: cumulativeBibitRetained,
      inactivePolybagQty,
      selectedBibitScopeQty,
      activePolybagQty: actualPolyInspected,
      totalLayak: cumulativeBibitRetained,
      bibitAwal,
      jumlahDiperiksa: actualBibitSelected,
      bibitDipertahankan: cumulativeBibitRetained,
      bibitReject
    }
  };
}

/**
 * Membuat transaksi pelaksanaan Seleksi II baru oleh Mantri Bibitan
 */
export function createSeleksi2ExecutionTransaction(payload, currentUser) {
  const parentDocId = payload.selectionDocumentId || payload.selectionDocNo || payload.docNo;
  const parentDoc = getPreGraftingSelectionDocumentById(parentDocId);
  if (!parentDoc) {
    throw new Error(`Dokumen Seleksi II dengan identitas "${parentDocId}" tidak ditemukan.`);
  }

  const existingExecutions = getSeleksi2ExecutionsByDocument(parentDoc.id);
  const val = validateSeleksi2Execution(payload, parentDoc, existingExecutions);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  
  // Generate Transaction Document Number
  let maxSeq = 0;
  allTxs.forEach(tx => {
    const d = String(tx.docNo || tx.selectionNo || '');
    const match = d.match(/SEL-II(?:-TX)?\/(\d+)/i) || d.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  });

  const txSeq = maxSeq + 1;
  const txDocNo = payload.docNo || formatStandardDocNo(2026, 'SEL-II', txSeq);
  const today = payload.tanggalSeleksi || payload.date || formatDate(new Date().toISOString());

  const txRecord = {
    id: payload.id || `SEL2-TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    docNo: txDocNo,
    selectionNo: txDocNo,
    transactionType: 'PELAKSANAAN_SELEKSI_II',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_2,
    
    // Parent Document relation
    selectionDocumentId: parentDoc.id,
    selectionDocNo: parentDoc.docNo,
    parentSelectionDocumentId: parentDoc.id,
    parentSelectionDocNo: parentDoc.docNo,
    
    // Traceability to Seleksi I FINAL and Seeding
    sourceModule: 'SELEKSI',
    sourceSelectionStage: SELECTION_STAGES.SELEKSI_1,
    sourceSelectionType: SELECTION_TYPES.PRA_OKULASI,
    sourceSelectionDocumentId: parentDoc.sourceSelectionDocumentId,
    sourceSelectionDocNo: parentDoc.sourceSelectionDocNo,
    sourceFinalId: parentDoc.sourceFinalId || parentDoc.sourceSelectionDocumentId,
    sourceFinalStatus: SELECTION_STATUS.DISETUJUI,
    sourceDocNo: parentDoc.docNo,
    sourceSeedingDocNo: parentDoc.sourceSeedingDocNo || '-',
    
    // Master & Scope Contexts
    batchId: parentDoc.batchId,
    batchCode: parentDoc.batchCode,
    batchNo: parentDoc.batchCode,
    programId: parentDoc.programId,
    programCode: parentDoc.programCode,
    programName: parentDoc.programName,
    estateId: parentDoc.estateId || currentUser?.estateId,
    estateName: parentDoc.estateName || currentUser?.estateName,
    divisionId: parentDoc.divisionId || currentUser?.divisionId,
    divisionName: parentDoc.divisionName || currentUser?.divisionName,
    clone: parentDoc.clone,
    klon: parentDoc.klon,
    growthStage: 'Rubber Main Nursery (Seleksi II)',
    
    bedenganId: val.parsed.bedenganId,
    bedenganCode: val.parsed.bedenganCode,
    bedengan: val.parsed.bedenganCode,
    
    // Population Breakdown & Quantities
    polybagScope: val.parsed.actualPolybagInspectedQty,
    initialPolybagCount: val.parsed.actualPolybagInspectedQty,
    sourcePolybagQty: parentDoc.sourcePolybagQty,
    sourceBibitQty: parentDoc.sourceBibitQty,
    bibitAwal: val.parsed.actualBibitSelectedQty,
    jumlahDiperiksa: val.parsed.actualBibitSelectedQty,
    
    // Canonical Quantities
    actualPolybagInspectedQty: val.parsed.actualPolybagInspectedQty,
    actualBibitSelectedQty: val.parsed.actualBibitSelectedQty,
    actualBibitRetainedQty: val.parsed.actualBibitRetainedQty,
    actualPolybagActiveQty: val.parsed.actualPolybagInspectedQty,
    activePolybagQty: val.parsed.actualPolybagInspectedQty,
    selectedBibitScopeQty: val.parsed.actualBibitSelectedQty,
    totalLayak: val.parsed.actualBibitRetainedQty,
    bibitDipertahankan: val.parsed.actualBibitRetainedQty,
    jumlahLayak: val.parsed.actualBibitRetainedQty,
    bibitReject: val.parsed.actualBibitSelectedQty,
    jumlahAfkir: val.parsed.actualBibitSelectedQty,
    
    // Reject Source Reference
    rejectSourceReference: {
      stage: SELECTION_STAGES.SELEKSI_2,
      parentDocNo: parentDoc.docNo,
      sourceSelectionDocNo: parentDoc.sourceSelectionDocNo,
      sourceSeedingDocNo: parentDoc.sourceSeedingDocNo,
      bedenganCode: val.parsed.bedenganCode,
      rejectCount: val.parsed.actualBibitSelectedQty,
      reason: 'Bibit kecil/terhambat saat Seleksi II'
    },
    
    tanggalSeleksi: today,
    tanggal: today,
    catatan: payload.catatan || payload.remarks || '-',
    
    status: 'RECORDED',
    stockMutationStatus: 'NOT_REQUIRED',
    
    createdByUserId: currentUser?.userId || currentUser?.code || currentUser?.id || 'MANTRI',
    createdByName: currentUser?.name || 'Mantri Bibitan',
    createdByRole: currentUser?.role || 'MANTRI_TANAMAN',
    createdAt: new Date().toISOString()
  };

  const newTx = currentUser 
    ? applyTransactionActor(txRecord, AUDIT_EVENT_TYPES.CREATE, currentUser, `Pelaksanaan Seleksi II pada ${val.parsed.bedenganCode} (${val.parsed.actualPolybagInspectedQty} Polybag, ${val.parsed.actualBibitSelectedQty} Bibit Diseleksi)`)
    : txRecord;

  // 1. Save execution transaction to selection_transactions
  allTxs.push(newTx);
  storage.set(SELECTION_STORAGE_KEY, allTxs);

  // 2. Update Parent Dokumen Seleksi II
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentIdx = allDocs.findIndex(d => d.id === parentDoc.id || d.docNo === parentDoc.docNo);
  
  if (parentIdx !== -1) {
    const currentParent = allDocs[parentIdx];
    const parentExecutions = allTxs.filter(tx => {
      const isStage2 = (
        tx.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
        tx.stage === 'SELEKSI_II' ||
        tx.stage === 'SELEKSI_2' ||
        tx.transactionType === 'PELAKSANAAN_SELEKSI_II'
      );
      if (!isStage2) return false;
      return (
        tx.parentSelectionDocumentId === currentParent.id ||
        tx.selectionDocumentId === currentParent.id ||
        tx.parentSelectionDocNo === currentParent.docNo ||
        tx.selectionDocNo === currentParent.docNo
      );
    });

    const sourcePoly = parseInt(currentParent.sourcePolybagQty || 0, 10);
    const sourceBibit = parseInt(currentParent.sourceBibitQty !== undefined ? currentParent.sourceBibitQty : sourcePoly, 10);

    const updatedTotalPolyDiperiksa = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 
      0
    );
    const updatedTotalBibitDiseleksi = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
      0
    );
    const updatedTotalLayak = Math.max(0, sourceBibit - updatedTotalBibitDiseleksi);
    const updatedTotalAfkir = updatedTotalBibitDiseleksi;
    const sisaPolybag = Math.max(0, sourcePoly - updatedTotalPolyDiperiksa);
    const isAllPolybagChecked = sourcePoly > 0 && updatedTotalPolyDiperiksa === sourcePoly && sisaPolybag === 0;

    allDocs[parentIdx] = {
      ...currentParent,
      executionTransactionIds: parentExecutions.map(tx => tx.id),
      executionCount: parentExecutions.length,
      totalDiperiksa: updatedTotalPolyDiperiksa,
      totalPolybagDiperiksa: updatedTotalPolyDiperiksa,
      totalBibitDiseleksi: updatedTotalBibitDiseleksi,
      totalBibitSelectedQty: updatedTotalBibitDiseleksi,
      totalBibitRetainedQty: updatedTotalLayak,
      totalLayak: updatedTotalLayak,
      totalAfkir: updatedTotalAfkir,
      totalReject: updatedTotalAfkir,
      activePolybagQty: updatedTotalPolyDiperiksa,
      currentBibitQty: updatedTotalLayak,
      currentPolybagQty: updatedTotalPolyDiperiksa,
      remainingPolybag: sisaPolybag,
      sisaPolybag: sisaPolybag,
      sisaBibit: Math.max(0, sourceBibit - updatedTotalBibitDiseleksi),
      progress: sourcePoly > 0 ? Math.min(100, Math.max(0, Math.round((updatedTotalPolyDiperiksa / sourcePoly) * 100))) : 0,
      isCompleted: isAllPolybagChecked,
      status: isAllPolybagChecked 
        ? 'COMPLETED'
        : (parentExecutions.length > 0 ? 'IN_PROGRESS' : 'DRAFT'),
      updatedAt: new Date().toISOString()
    };

    storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  }

  return {
    success: true,
    transaction: newTx,
    parentDocument: parentIdx !== -1 ? allDocs[parentIdx] : parentDoc
  };
}

/**
 * Menghapus transaksi pelaksanaan Seleksi II dan mengkalkulasi ulang Dokumen Induk
 */
export function deleteSeleksi2ExecutionTransaction(transactionId, currentUser = null) {
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const targetIdx = allTxs.findIndex(tx => tx.id === transactionId || tx.docNo === transactionId || tx.selectionNo === transactionId);
  if (targetIdx === -1) {
    throw new Error('Transaksi Seleksi II tidak ditemukan.');
  }

  const targetTx = allTxs[targetIdx];
  allTxs.splice(targetIdx, 1);
  storage.set(SELECTION_STORAGE_KEY, allTxs);

  // Re-aggregate Parent Dokumen Seleksi II
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentIdx = allDocs.findIndex(d => 
    d.id === targetTx.selectionDocumentId || 
    d.id === targetTx.parentSelectionDocumentId || 
    d.docNo === targetTx.selectionDocNo ||
    d.docNo === targetTx.parentSelectionDocNo
  );

  if (parentIdx !== -1) {
    const currentParent = allDocs[parentIdx];
    const parentExecutions = allTxs.filter(tx => {
      const isStage2 = (
        tx.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
        tx.selectionStage === 'SELEKSI_II' ||
        tx.selectionStage === 'SELEKSI_2' ||
        tx.stage === 'SELEKSI_II' ||
        tx.stage === 'SELEKSI_2' ||
        tx.transactionType === 'PELAKSANAAN_SELEKSI_II'
      );
      if (!isStage2) return false;
      return (
        tx.parentSelectionDocumentId === currentParent.id ||
        tx.selectionDocumentId === currentParent.id ||
        tx.parentSelectionDocNo === currentParent.docNo ||
        tx.selectionDocNo === currentParent.docNo
      );
    });

    const sourcePoly = parseInt(currentParent.sourcePolybagQty || 0, 10);
    const sourceBibit = parseInt(currentParent.sourceBibitQty !== undefined ? currentParent.sourceBibitQty : sourcePoly, 10);

    const updatedTotalPolyDiperiksa = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 
      0
    );
    const updatedTotalBibitDiseleksi = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
      0
    );
    const updatedTotalLayak = Math.max(0, sourceBibit - updatedTotalBibitDiseleksi);
    const updatedTotalAfkir = updatedTotalBibitDiseleksi;
    const sisaPolybag = Math.max(0, sourcePoly - updatedTotalPolyDiperiksa);
    const isAllPolybagChecked = sourcePoly > 0 && updatedTotalPolyDiperiksa === sourcePoly && sisaPolybag === 0;

    allDocs[parentIdx] = {
      ...currentParent,
      executionTransactionIds: parentExecutions.map(tx => tx.id),
      executionCount: parentExecutions.length,
      totalDiperiksa: updatedTotalPolyDiperiksa,
      totalPolybagDiperiksa: updatedTotalPolyDiperiksa,
      totalBibitDiseleksi: updatedTotalBibitDiseleksi,
      totalBibitSelectedQty: updatedTotalBibitDiseleksi,
      totalBibitRetainedQty: updatedTotalLayak,
      totalLayak: updatedTotalLayak,
      totalAfkir: updatedTotalAfkir,
      totalReject: updatedTotalAfkir,
      activePolybagQty: updatedTotalPolyDiperiksa,
      currentBibitQty: updatedTotalLayak,
      currentPolybagQty: updatedTotalPolyDiperiksa,
      remainingPolybag: sisaPolybag,
      sisaPolybag: sisaPolybag,
      sisaBibit: Math.max(0, sourceBibit - updatedTotalBibitDiseleksi),
      progress: sourcePoly > 0 ? Math.min(100, Math.max(0, Math.round((updatedTotalPolyDiperiksa / sourcePoly) * 100))) : 0,
      isCompleted: isAllPolybagChecked,
      status: isAllPolybagChecked ? 'COMPLETED' : (parentExecutions.length > 0 ? 'IN_PROGRESS' : 'DRAFT'),
      updatedAt: new Date().toISOString()
    };

    storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  }

  return { success: true };
}

/**
 * Mengambil seluruh transaksi pelaksanaan untuk sebuah Dokumen Seleksi III
 */
export function getSeleksi3ExecutionsByDocument(idOrDocNo) {
  if (!idOrDocNo) return [];
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const searchStr = String(idOrDocNo).trim();
  
  return allTxs.filter(tx => {
    const isStage3 = (
      tx.transactionType === 'PELAKSANAAN_SELEKSI_III' ||
      tx.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
      tx.selectionStage === 'SELEKSI_3' ||
      tx.selectionStage === 'SELEKSI_III' ||
      tx.stage === 'SELEKSI_III' ||
      tx.stage === 'SELEKSI_3' ||
      tx.parentDocId === searchStr
    );
    if (!isStage3) return false;
    
    return (
      tx.selectionDocumentId === searchStr ||
      tx.parentSelectionDocumentId === searchStr ||
      tx.parentDocId === searchStr ||
      tx.parentSelectionDocNo === searchStr ||
      tx.selectionDocNo === searchStr ||
      tx.sourceDocNo === searchStr ||
      tx.sourceSelectionDocNo === searchStr
    );
  });
}

/**
 * Menghitung status alokasi dan sisa scope bedengan untuk Dokumen Seleksi III
 */
export function getBedenganScopeStatusForSeleksi3(parentDoc, txsOverride = null) {
  if (!parentDoc) return [];
  
  const executions = Array.isArray(txsOverride) ? txsOverride : getSeleksi3ExecutionsByDocument(parentDoc.id || parentDoc.docNo);
  
  let bedenganList = [];
  if (Array.isArray(parentDoc.rows) && parentDoc.rows.length > 0) {
    bedenganList = parentDoc.rows.map(r => ({
      bedenganId: r.bedenganId || r.bedenganCode || r.bedengan,
      bedenganCode: formatBedenganDisplayCode(r.bedenganCode || r.bedengan || r.bedenganId),
      initialPolybag: parseInt(r.polybag || 0, 10),
      initialBibit: parseInt(r.sourceBibitQty !== undefined ? r.sourceBibitQty : (r.disemai || 0), 10)
    }));
  } else if (Array.isArray(parentDoc.bedenganIds) && parentDoc.bedenganIds.length > 0) {
    const polyPerBed = Math.floor(parentDoc.sourcePolybagQty / parentDoc.bedenganIds.length);
    const remPoly = parentDoc.sourcePolybagQty % parentDoc.bedenganIds.length;
    const bibitPerBed = Math.floor(parentDoc.sourceBibitQty / parentDoc.bedenganIds.length);
    const remBibit = parentDoc.sourceBibitQty % parentDoc.bedenganIds.length;
    bedenganList = parentDoc.bedenganIds.map((bId, idx) => ({
      bedenganId: bId,
      bedenganCode: formatBedenganDisplayCode(bId),
      initialPolybag: polyPerBed + (idx === 0 ? remPoly : 0),
      initialBibit: bibitPerBed + (idx === 0 ? remBibit : 0)
    }));
  } else {
    bedenganList = [{
      bedenganId: parentDoc.bedenganId || 'BED-001',
      bedenganCode: formatBedenganDisplayCode(parentDoc.bedenganCode || parentDoc.bedengan || 'BED-001'),
      initialPolybag: parentDoc.sourcePolybagQty || 0,
      initialBibit: parentDoc.sourceBibitQty || 0
    }];
  }

  return bedenganList.map(bed => {
    const bedNorm = String(bed.bedenganCode || bed.bedenganId).trim().toUpperCase();
    const bedTxs = executions.filter(tx => {
      const txBed = String(tx.bedenganCode || tx.bedengan || tx.bedenganId || '').trim().toUpperCase();
      return txBed === bedNorm || txBed === String(bed.bedenganId).toUpperCase();
    });

    const inspectedPolybag = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 0);
    const inspectedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 0);
    const maintainedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.actualBibitRetainedQty !== undefined ? tx.actualBibitRetainedQty : (tx.bibitDipertahankan || tx.jumlahLayak || 0), 10), 0);
    const rejectedBibit = bedTxs.reduce((sum, tx) => sum + parseInt(tx.bibitReject !== undefined ? tx.bibitReject : (tx.jumlahAfkir || 0), 10), 0);
    const remainingPolybag = Math.max(0, bed.initialPolybag - inspectedPolybag);
    const remainingBibit = Math.max(0, bed.initialBibit - inspectedBibit);

    return {
      ...bed,
      inspectedPolybag,
      inspectedBibit,
      maintainedBibit,
      rejectedBibit,
      remainingPolybag,
      remainingBibit,
      isFullyInspected: remainingPolybag === 0 && bed.initialPolybag > 0
    };
  });
}

/**
 * Validasi payload transaksi pelaksanaan Seleksi III
 * Mendukung model kuantitas baru (actualPolybagInspectedQty, actualBibitSelectedQty) dan Legacy
 */
export function validateSeleksi3Execution(payload, parentDoc, existingTxs = []) {
  const errors = [];
  if (!payload) {
    return { isValid: false, errors: ['Data transaksi Seleksi III tidak boleh kosong.'] };
  }
  if (!parentDoc) {
    return { isValid: false, errors: ['Dokumen Seleksi III (parent) tidak ditemukan.'] };
  }

  const stage = String(parentDoc.selectionStage || '').toUpperCase();
  if (stage !== 'SELEKSI_III' && stage !== 'SELEKSI_3') {
    errors.push(`Parent document bukan merupakan Dokumen Seleksi III (stage: ${parentDoc.selectionStage}).`);
  }

  // 1. Bedengan validation
  const bedenganCode = String(payload.bedenganCode || payload.bedengan || payload.bedenganId || '').trim();
  if (!bedenganCode) {
    errors.push('Bedengan yang diperiksa wajib dipilih.');
  }

  const bedScopeList = getBedenganScopeStatusForSeleksi3(parentDoc, existingTxs);
  const bedNorm = formatBedenganDisplayCode(bedenganCode).toUpperCase();
  let matchedBed = bedScopeList.find(b => 
    formatBedenganDisplayCode(b.bedenganCode).toUpperCase() === bedNorm ||
    String(b.bedenganId).toUpperCase() === String(payload.bedenganId || '').toUpperCase() ||
    String(b.bedenganCode).toUpperCase() === bedNorm
  );

  if (!matchedBed && bedScopeList.length === 1 && (bedScopeList[0].bedenganCode === 'BED-001' || bedScopeList[0].bedenganId === 'BED-001')) {
    matchedBed = bedScopeList[0];
  }

  if (!matchedBed && bedScopeList.length > 0 && bedScopeList[0].bedenganCode !== 'BED-001') {
    errors.push(`Bedengan ${bedenganCode} tidak termasuk dalam scope Dokumen Seleksi III ${parentDoc.docNo}.`);
  }

  const maxPolybagScope = matchedBed ? matchedBed.remainingPolybag : parseInt(parentDoc.sourcePolybagQty || 0, 10);
  const sourceBibit = parseInt(parentDoc.sourceBibitQty !== undefined ? parentDoc.sourceBibitQty : (parentDoc.sourcePolybagQty || 0), 10);

  // Parse 2 canonical inputs: Jlh Polybag Diperiksa & Jlh Bibit Diseleksi
  const actualPolyInspected = parseInt(
    payload.actualPolybagInspectedQty !== undefined
      ? payload.actualPolybagInspectedQty
      : (payload.polybagScope !== undefined
          ? payload.polybagScope
          : (payload.actualPolybagActiveQty !== undefined ? payload.actualPolybagActiveQty : payload.polybagAktif || 0)),
    10
  );

  const actualBibitSelected = parseInt(
    payload.actualBibitSelectedQty !== undefined
      ? payload.actualBibitSelectedQty
      : (payload.selectedBibitScopeQty !== undefined
          ? payload.selectedBibitScopeQty
          : (payload.jumlahDiperiksa !== undefined
              ? payload.jumlahDiperiksa
              : (payload.bibitAwal !== undefined ? payload.bibitAwal : 0))),
    10
  );

  if (isNaN(actualPolyInspected) || actualPolyInspected <= 0) {
    errors.push('Jumlah polybag diperiksa harus lebih besar dari 0.');
  }
  if (actualPolyInspected > maxPolybagScope) {
    errors.push(`Jumlah polybag diperiksa (${actualPolyInspected}) melebihi sisa scope polybag yang tersedia (${maxPolybagScope}).`);
  }

  if (isNaN(actualBibitSelected) || actualBibitSelected < 0) {
    errors.push('Jumlah bibit diseleksi tidak boleh negatif.');
  }

  // Hitung otomatis Bibit Dipertahankan secara kumulatif
  const existingBibitSelectedSum = existingTxs.reduce((sum, tx) => 
    sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
    0
  );
  const totalBibitDiseleksiAfter = existingBibitSelectedSum + (isNaN(actualBibitSelected) ? 0 : actualBibitSelected);
  const cumulativeBibitRetained = Math.max(0, sourceBibit - totalBibitDiseleksiAfter);

  const polyScope = actualPolyInspected;
  const inactivePolybagQty = 0;
  const selectedBibitScopeQty = actualBibitSelected;
  const bibitReject = actualBibitSelected;
  const bibitAwal = actualBibitSelected;

  return {
    isValid: errors.length === 0,
    errors,
    parsed: {
      bedenganId: matchedBed ? matchedBed.bedenganId : (payload.bedenganId || bedenganCode),
      bedenganCode: matchedBed ? matchedBed.bedenganCode : bedenganCode,
      polybagScope: polyScope,
      actualPolybagInspectedQty: actualPolyInspected,
      actualPolybagActiveQty: actualPolyInspected,
      actualBibitSelectedQty: actualBibitSelected,
      actualBibitRetainedQty: cumulativeBibitRetained,
      inactivePolybagQty,
      selectedBibitScopeQty,
      activePolybagQty: actualPolyInspected,
      totalLayak: cumulativeBibitRetained,
      bibitAwal,
      jumlahDiperiksa: actualBibitSelected,
      bibitDipertahankan: cumulativeBibitRetained,
      bibitReject
    }
  };
}

/**
 * Membuat transaksi pelaksanaan Seleksi III baru oleh Mantri Bibitan
 */
export function createSeleksi3ExecutionTransaction(payload, currentUser) {
  const parentDocId = payload.parentDocId || payload.selectionDocumentId || payload.selectionDocNo || payload.parentSelectionDocumentId || payload.docNo;
  const parentDoc = getPreGraftingSelectionDocumentById(parentDocId);
  if (!parentDoc) {
    throw new Error(`Dokumen Seleksi III dengan identitas "${parentDocId}" tidak ditemukan.`);
  }

  const existingExecutions = getSeleksi3ExecutionsByDocument(parentDoc.id);
  const val = validateSeleksi3Execution(payload, parentDoc, existingExecutions);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  
  // Generate Transaction Document Number (Format: 2026/SEL-III/001_01 or 2026/SEL-III-TX/001)
  let maxSeq = 0;
  allTxs.forEach(tx => {
    const d = String(tx.docNo || tx.selectionNo || '');
    const match = d.match(/SEL-III(?:-TX)?\/(\d+)/i) || d.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  });

  const txSeq = maxSeq + 1;
  const txDocNo = payload.docNo || formatStandardDocNo(2026, 'SEL-III', txSeq);
  const today = payload.tanggalSeleksi || payload.date || formatDate(new Date().toISOString());

  const txRecord = {
    id: payload.id || `SEL3-TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    docNo: txDocNo,
    selectionNo: txDocNo,
    transactionType: 'PELAKSANAAN_SELEKSI_III',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_3,
    
    // Parent Document relation
    selectionDocumentId: parentDoc.id,
    selectionDocNo: parentDoc.docNo,
    parentSelectionDocumentId: parentDoc.id,
    parentSelectionDocNo: parentDoc.docNo,
    
    // Traceability to Seleksi II FINAL and Seeding
    sourceModule: 'SELEKSI',
    sourceSelectionStage: SELECTION_STAGES.SELEKSI_2,
    sourceSelectionType: SELECTION_TYPES.PRA_OKULASI,
    sourceSelectionDocumentId: parentDoc.sourceSelectionDocumentId,
    sourceSelectionDocNo: parentDoc.sourceSelectionDocNo,
    sourceFinalId: parentDoc.sourceFinalId || parentDoc.sourceSelectionDocumentId,
    sourceFinalStatus: SELECTION_STATUS.DISETUJUI,
    sourceDocNo: parentDoc.docNo,
    sourceSeedingDocNo: parentDoc.sourceSeedingDocNo || '-',
    
    // Master & Scope Contexts
    batchId: parentDoc.batchId,
    batchCode: parentDoc.batchCode,
    batchNo: parentDoc.batchCode,
    programId: parentDoc.programId,
    programCode: parentDoc.programCode,
    programName: parentDoc.programName,
    estateId: parentDoc.estateId || currentUser?.estateId,
    estateName: parentDoc.estateName || currentUser?.estateName,
    divisionId: parentDoc.divisionId || currentUser?.divisionId,
    divisionName: parentDoc.divisionName || currentUser?.divisionName,
    clone: parentDoc.clone,
    klon: parentDoc.klon,
    growthStage: 'Bibit Siap Okulasi', // Based on Seleksi III outcome
    
    bedenganId: val.parsed.bedenganId,
    bedenganCode: val.parsed.bedenganCode,
    bedengan: val.parsed.bedenganCode,
    
    // Population Breakdown & Quantities
    polybagScope: val.parsed.actualPolybagInspectedQty,
    initialPolybagCount: val.parsed.actualPolybagInspectedQty,
    sourcePolybagQty: parentDoc.sourcePolybagQty,
    sourceBibitQty: parentDoc.sourceBibitQty,
    bibitAwal: val.parsed.actualBibitSelectedQty,
    jumlahDiperiksa: val.parsed.actualBibitSelectedQty,
    
    // Canonical Quantities
    actualPolybagInspectedQty: val.parsed.actualPolybagInspectedQty,
    actualBibitSelectedQty: val.parsed.actualBibitSelectedQty,
    actualBibitRetainedQty: val.parsed.actualBibitRetainedQty,
    actualPolybagActiveQty: val.parsed.actualPolybagInspectedQty,
    activePolybagQty: val.parsed.actualPolybagInspectedQty,
    selectedBibitScopeQty: val.parsed.actualBibitSelectedQty,
    totalLayak: val.parsed.actualBibitRetainedQty,
    bibitDipertahankan: val.parsed.actualBibitRetainedQty,
    jumlahLayak: val.parsed.actualBibitRetainedQty,
    bibitReject: val.parsed.actualBibitSelectedQty,
    jumlahAfkir: val.parsed.actualBibitSelectedQty,
    
    // Reject Source Reference
    rejectSourceReference: {
      stage: SELECTION_STAGES.SELEKSI_3,
      parentDocNo: parentDoc.docNo,
      sourceSelectionDocNo: parentDoc.sourceSelectionDocNo,
      sourceSeedingDocNo: parentDoc.sourceSeedingDocNo,
      bedenganCode: val.parsed.bedenganCode,
      rejectCount: val.parsed.actualBibitSelectedQty,
      reason: 'Bibit abnormal/sakit saat Seleksi III'
    },
    
    tanggalSeleksi: today,
    tanggal: today,
    catatan: payload.catatan || payload.remarks || '-',
    
    status: 'RECORDED',
    stockMutationStatus: 'NOT_REQUIRED',
    
    createdByUserId: currentUser?.userId || currentUser?.code || currentUser?.id || 'MANTRI',
    createdByName: currentUser?.name || 'Mantri Bibitan',
    createdByRole: currentUser?.role || 'MANTRI_TANAMAN',
    createdAt: new Date().toISOString()
  };

  const newTx = currentUser 
    ? applyTransactionActor(txRecord, AUDIT_EVENT_TYPES.CREATE, currentUser, `Pelaksanaan Seleksi III pada ${val.parsed.bedenganCode} (${val.parsed.actualPolybagInspectedQty} Polybag, ${val.parsed.actualBibitSelectedQty} Bibit Diseleksi)`)
    : txRecord;

  // 1. Save execution transaction to selection_transactions
  allTxs.push(newTx);
  storage.set(SELECTION_STORAGE_KEY, allTxs);

  // 2. Update Parent Dokumen Seleksi III
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentIdx = allDocs.findIndex(d => d.id === parentDoc.id || d.docNo === parentDoc.docNo);
  
  if (parentIdx !== -1) {
    const currentParent = allDocs[parentIdx];
    const parentExecutions = allTxs.filter(tx => {
      const isStage3 = (
        tx.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
        tx.stage === 'SELEKSI_III' ||
        tx.stage === 'SELEKSI_3' ||
        tx.transactionType === 'PELAKSANAAN_SELEKSI_III'
      );
      if (!isStage3) return false;
      return (
        tx.parentSelectionDocumentId === currentParent.id ||
        tx.selectionDocumentId === currentParent.id ||
        tx.parentSelectionDocNo === currentParent.docNo ||
        tx.selectionDocNo === currentParent.docNo
      );
    });

    const sourcePoly = parseInt(currentParent.sourcePolybagQty !== undefined ? currentParent.sourcePolybagQty : (currentParent.sourceBibitQty || 0), 10);
    const sourceBibit = parseInt(currentParent.sourceBibitQty !== undefined ? currentParent.sourceBibitQty : sourcePoly, 10);

    const updatedTotalPolyDiperiksa = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 
      0
    );
    const updatedTotalBibitDiseleksi = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
      0
    );
    const updatedTotalLayak = Math.max(0, sourceBibit - updatedTotalBibitDiseleksi);
    const updatedTotalAfkir = updatedTotalBibitDiseleksi;
    const sisaPolybag = Math.max(0, sourcePoly - updatedTotalPolyDiperiksa);
    const isAllPolybagChecked = sourcePoly > 0 && updatedTotalPolyDiperiksa === sourcePoly && sisaPolybag === 0;

    allDocs[parentIdx] = {
      ...currentParent,
      executionTransactionIds: parentExecutions.map(tx => tx.id),
      executionCount: parentExecutions.length,
      executedPolybagQty: updatedTotalPolyDiperiksa,
      totalDiperiksa: updatedTotalPolyDiperiksa,
      totalPolybagDiperiksa: updatedTotalPolyDiperiksa,
      totalBibitDiseleksi: updatedTotalBibitDiseleksi,
      totalBibitSelectedQty: updatedTotalBibitDiseleksi,
      totalBibitRetainedQty: updatedTotalLayak,
      totalLayak: updatedTotalLayak,
      totalAfkir: updatedTotalAfkir,
      totalReject: updatedTotalAfkir,
      activePolybagQty: updatedTotalPolyDiperiksa,
      currentBibitQty: updatedTotalLayak,
      currentPolybagQty: updatedTotalPolyDiperiksa,
      remainingPolybag: sisaPolybag,
      sisaPolybag: sisaPolybag,
      sisaBibit: Math.max(0, sourceBibit - updatedTotalBibitDiseleksi),
      progress: sourcePoly > 0 ? Math.min(100, Math.max(0, Math.round((updatedTotalPolyDiperiksa / sourcePoly) * 100))) : 0,
      isCompleted: isAllPolybagChecked,
      status: isAllPolybagChecked 
        ? 'COMPLETED'
        : (parentExecutions.length > 0 ? 'IN_PROGRESS' : 'DRAFT'),
      updatedAt: new Date().toISOString()
    };

    storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  }

  return {
    success: true,
    transaction: newTx,
    parentDocument: parentIdx !== -1 ? allDocs[parentIdx] : parentDoc
  };
}

/**
 * Mengubah data transaksi pelaksanaan Seleksi III yang sudah ada dan mengkalkulasi ulang Dokumen Induk
 */
export function updateSeleksi3ExecutionTransaction(txIdOrDocNo, payload, currentUser = null) {
  if (!txIdOrDocNo) {
    throw new Error('ID atau Nomor Transaksi yang akan diubah tidak valid.');
  }

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const txIdx = allTxs.findIndex(tx => tx.id === txIdOrDocNo || tx.docNo === txIdOrDocNo || tx.selectionNo === txIdOrDocNo);
  
  if (txIdx === -1) {
    throw new Error(`Transaksi Seleksi III "${txIdOrDocNo}" tidak ditemukan.`);
  }

  const existingTx = allTxs[txIdx];
  const parentDocId = existingTx.parentSelectionDocumentId || existingTx.selectionDocumentId;
  const parentDoc = getPreGraftingSelectionDocumentById(parentDocId);

  if (!parentDoc) {
    throw new Error(`Dokumen Induk Seleksi III untuk transaksi "${txIdOrDocNo}" tidak ditemukan.`);
  }

  const otherTxs = allTxs.filter((tx, idx) => idx !== txIdx && (tx.parentSelectionDocumentId === parentDoc.id || tx.selectionDocumentId === parentDoc.id));
  const val = validateSeleksi3Execution({
    ...existingTx,
    ...payload
  }, parentDoc, otherTxs);

  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const updatedTx = {
    ...existingTx,
    ...payload,
    bedenganId: val.parsed.bedenganId,
    bedenganCode: val.parsed.bedenganCode,
    polybagScope: val.parsed.actualPolybagInspectedQty,
    initialPolybagCount: val.parsed.actualPolybagInspectedQty,
    totalPolybagInspected: val.parsed.actualPolybagInspectedQty,
    bibitAwal: val.parsed.actualBibitSelectedQty,
    jumlahDiperiksa: val.parsed.actualBibitSelectedQty,
    actualPolybagInspectedQty: val.parsed.actualPolybagInspectedQty,
    actualPolybagActiveQty: val.parsed.actualPolybagInspectedQty,
    actualBibitSelectedQty: val.parsed.actualBibitSelectedQty,
    actualBibitRetainedQty: val.parsed.actualBibitRetainedQty,
    selectedBibitScopeQty: val.parsed.actualBibitSelectedQty,
    activePolybagQty: val.parsed.actualPolybagInspectedQty,
    bibitDipertahankan: val.parsed.actualBibitRetainedQty,
    jumlahLayak: val.parsed.actualBibitRetainedQty,
    bibitReject: val.parsed.actualBibitSelectedQty,
    jumlahAfkir: val.parsed.actualBibitSelectedQty,
    polybagDipertahankan: val.parsed.actualPolybagInspectedQty,
    afkirCategoryCounts: payload.afkirCategoryCounts || existingTx.afkirCategoryCounts || {},
    updatedAt: new Date().toISOString()
  };

  const finalTx = currentUser
    ? applyTransactionActor(updatedTx, AUDIT_EVENT_TYPES.UPDATE, currentUser, `Update Transaksi Seleksi III ${existingTx.docNo}`)
    : updatedTx;

  allTxs[txIdx] = finalTx;
  storage.set(SELECTION_STORAGE_KEY, allTxs);

  // Recalculate Parent Dokumen Seleksi III
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentIdx = allDocs.findIndex(d => d.id === parentDoc.id || d.docNo === parentDoc.docNo);

  if (parentIdx !== -1) {
    const currentParent = allDocs[parentIdx];
    const parentExecutions = allTxs.filter(tx => {
      const isStage3 = (
        tx.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
        tx.stage === 'SELEKSI_III' ||
        tx.stage === 'SELEKSI_3' ||
        tx.transactionType === 'PELAKSANAAN_SELEKSI_III'
      );
      if (!isStage3) return false;
      return (
        tx.parentSelectionDocumentId === currentParent.id ||
        tx.selectionDocumentId === currentParent.id ||
        tx.parentSelectionDocNo === currentParent.docNo ||
        tx.selectionDocNo === currentParent.docNo
      );
    });

    const sourcePoly = parseInt(currentParent.sourcePolybagQty !== undefined ? currentParent.sourcePolybagQty : (currentParent.sourceBibitQty || 0), 10);
    const sourceBibit = parseInt(currentParent.sourceBibitQty !== undefined ? currentParent.sourceBibitQty : sourcePoly, 10);

    const updatedTotalPolyDiperiksa = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 
      0
    );
    const updatedTotalBibitDiseleksi = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
      0
    );
    const updatedTotalLayak = Math.max(0, sourceBibit - updatedTotalBibitDiseleksi);
    const updatedTotalAfkir = updatedTotalBibitDiseleksi;
    const sisaPolybag = Math.max(0, sourcePoly - updatedTotalPolyDiperiksa);
    const isAllPolybagChecked = sourcePoly > 0 && updatedTotalPolyDiperiksa === sourcePoly && sisaPolybag === 0;

    allDocs[parentIdx] = {
      ...currentParent,
      executionTransactionIds: parentExecutions.map(tx => tx.id),
      executionCount: parentExecutions.length,
      executedPolybagQty: updatedTotalPolyDiperiksa,
      totalDiperiksa: updatedTotalPolyDiperiksa,
      totalPolybagDiperiksa: updatedTotalPolyDiperiksa,
      totalBibitDiseleksi: updatedTotalBibitDiseleksi,
      totalBibitSelectedQty: updatedTotalBibitDiseleksi,
      totalBibitRetainedQty: updatedTotalLayak,
      totalLayak: updatedTotalLayak,
      totalAfkir: updatedTotalAfkir,
      totalReject: updatedTotalAfkir,
      activePolybagQty: updatedTotalPolyDiperiksa,
      currentBibitQty: updatedTotalLayak,
      currentPolybagQty: updatedTotalPolyDiperiksa,
      remainingPolybag: sisaPolybag,
      sisaPolybag: sisaPolybag,
      sisaBibit: Math.max(0, sourceBibit - updatedTotalBibitDiseleksi),
      progress: sourcePoly > 0 ? Math.min(100, Math.max(0, Math.round((updatedTotalPolyDiperiksa / sourcePoly) * 100))) : 0,
      isCompleted: isAllPolybagChecked,
      status: isAllPolybagChecked 
        ? 'COMPLETED'
        : (parentExecutions.length > 0 ? 'IN_PROGRESS' : 'DRAFT'),
      updatedAt: new Date().toISOString()
    };

    storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  }

  return {
    success: true,
    transaction: allTxs[txIdx],
    parentDocument: parentIdx !== -1 ? allDocs[parentIdx] : parentDoc
  };
}

/**
 * Menghapus transaksi pelaksanaan Seleksi III dan mengkalkulasi ulang Dokumen Induk
 */
export function deleteSeleksi3ExecutionTransaction(txIdOrDocNo, currentUser = null) {
  if (!txIdOrDocNo) {
    throw new Error('ID atau Nomor Transaksi yang akan dihapus tidak valid.');
  }

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const txIdx = allTxs.findIndex(tx => tx.id === txIdOrDocNo || tx.docNo === txIdOrDocNo || tx.selectionNo === txIdOrDocNo);
  
  if (txIdx === -1) {
    throw new Error(`Transaksi Seleksi III "${txIdOrDocNo}" tidak ditemukan.`);
  }

  const targetTx = allTxs[txIdx];
  const parentDocId = targetTx.parentSelectionDocumentId || targetTx.selectionDocumentId;
  const parentDocNo = targetTx.parentSelectionDocNo || targetTx.selectionDocNo;

  // Remove transaction
  allTxs.splice(txIdx, 1);
  storage.set(SELECTION_STORAGE_KEY, allTxs);

  // Recalculate Parent Dokumen Seleksi III
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentIdx = allDocs.findIndex(d => d.id === parentDocId || d.docNo === parentDocNo);

  if (parentIdx !== -1) {
    const currentParent = allDocs[parentIdx];
    const parentExecutions = allTxs.filter(tx => {
      const isStage3 = (
        tx.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
        tx.stage === 'SELEKSI_III' ||
        tx.stage === 'SELEKSI_3' ||
        tx.transactionType === 'PELAKSANAAN_SELEKSI_III'
      );
      if (!isStage3) return false;
      return (
        tx.parentSelectionDocumentId === currentParent.id ||
        tx.selectionDocumentId === currentParent.id ||
        tx.parentSelectionDocNo === currentParent.docNo ||
        tx.selectionDocNo === currentParent.docNo
      );
    });

    const sourcePoly = parseInt(currentParent.sourcePolybagQty !== undefined ? currentParent.sourcePolybagQty : (currentParent.sourceBibitQty || 0), 10);
    const sourceBibit = parseInt(currentParent.sourceBibitQty !== undefined ? currentParent.sourceBibitQty : sourcePoly, 10);

    const updatedTotalPolyDiperiksa = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10), 
      0
    );
    const updatedTotalBibitDiseleksi = parentExecutions.reduce((sum, tx) => 
      sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || tx.bibitAwal || 0)), 10), 
      0
    );
    const updatedTotalLayak = Math.max(0, sourceBibit - updatedTotalBibitDiseleksi);
    const updatedTotalAfkir = updatedTotalBibitDiseleksi;
    const sisaPolybag = Math.max(0, sourcePoly - updatedTotalPolyDiperiksa);
    const isAllPolybagChecked = sourcePoly > 0 && updatedTotalPolyDiperiksa === sourcePoly && sisaPolybag === 0;

    allDocs[parentIdx] = {
      ...currentParent,
      executionTransactionIds: parentExecutions.map(tx => tx.id),
      executionCount: parentExecutions.length,
      executedPolybagQty: updatedTotalPolyDiperiksa,
      totalDiperiksa: updatedTotalPolyDiperiksa,
      totalPolybagDiperiksa: updatedTotalPolyDiperiksa,
      totalBibitDiseleksi: updatedTotalBibitDiseleksi,
      totalBibitSelectedQty: updatedTotalBibitDiseleksi,
      totalBibitRetainedQty: updatedTotalLayak,
      totalLayak: updatedTotalLayak,
      totalAfkir: updatedTotalAfkir,
      totalReject: updatedTotalAfkir,
      activePolybagQty: updatedTotalPolyDiperiksa,
      currentBibitQty: updatedTotalLayak,
      currentPolybagQty: updatedTotalPolyDiperiksa,
      remainingPolybag: sisaPolybag,
      sisaPolybag: sisaPolybag,
      sisaBibit: Math.max(0, sourceBibit - updatedTotalBibitDiseleksi),
      progress: sourcePoly > 0 ? Math.min(100, Math.max(0, Math.round((updatedTotalPolyDiperiksa / sourcePoly) * 100))) : 0,
      isCompleted: isAllPolybagChecked,
      status: isAllPolybagChecked 
        ? 'COMPLETED'
        : (parentExecutions.length > 0 ? 'IN_PROGRESS' : 'DRAFT'),
      updatedAt: new Date().toISOString()
    };

    storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);
  }

  return { 
    success: true,
    deletedId: targetTx.id,
    parentDocument: parentIdx !== -1 ? allDocs[parentIdx] : null
  };
}


