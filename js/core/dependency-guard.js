import { storage } from './storage.js';
import { openModal, closeModal } from '../components/modal.js';
import { navigate } from './router.js';
import { formatStandardDocNo } from './utils.js';
import { isTransactionLockedForMantri, normalizeDateStr } from '../modules/verification/mantri-confirmation-service.js';

/**
 * Helper: Mengekstrak tahun dari konteks tanggal transaksi penerimaan.
 * Menggunakan prioritas field tanggal transaksi bisnis.
 */
function getReceiptContextYear(receiptTx) {
  if (!receiptTx || typeof receiptTx !== 'object') {
    return new Date().getFullYear();
  }

  const dateCandidates = [
    receiptTx.tanggal,
    receiptTx.date,
    receiptTx.tanggalPenerimaan,
    receiptTx.receiptDate,
    receiptTx.createdAt
  ];

  for (const rawDate of dateCandidates) {
    if (rawDate) {
      const norm = normalizeDateStr(rawDate);
      if (norm) {
        const parts = norm.split('/');
        if (parts.length === 3 && parts[2]) {
          const y = parseInt(parts[2], 10);
          if (!Number.isNaN(y) && y > 1900 && y < 2100) {
            return y;
          }
        }
      }
    }
  }

  return new Date().getFullYear();
}

function isTxActive(tx) {
  if (!tx || typeof tx !== 'object') return false;
  const s = String(tx.status || tx.verificationStatus || '').trim().toUpperCase();
  return s !== 'BATAL' && s !== 'CANCELLED' && s !== 'VOID';
}

/**
 * Memeriksa apakah Penerimaan (receiptTx) sudah digunakan sebagai dokumen referensi oleh modul hilir (downstream).
 * Menggunakan prioritas identity kanonikal:
 * 1. receipt transaction ID (id / receiptId)
 * 2. canonical docNo / nomorDokumen
 * 3. sourceDocNo / receiptDocNo / sourceReceiptDocNo
 * 4. sourceReceiptId
 * 5. sourceIndex / sourceReceiptIndex (hanya sebagai fallback)
 * 
 * @param {object} receiptTx - Record transaksi penerimaan
 * @param {number} [receiptIndex=-1] - Indeks array penerimaan (fallback)
 * @param {object} [preloadedContext=null] - Konteks koleksi transaksi yang telah dimuat sebelumnya (opsional)
 * @returns {boolean} true jika telah digunakan oleh transaksi downstream yang aktif
 */
export function isReceiptUsedAsReference(receiptTx, receiptIndex = -1, preloadedContext = null) {
  if (!receiptTx && receiptIndex < 0) return false;

  const tx = receiptTx || {};
  const txId = tx.id || tx.receiptId || null;
  
  // 1. Jika docNo / nomorDokumen tersedia: gunakan langsung dan JANGAN masuk fallback
  let docNo = tx.docNo || tx.nomorDokumen || null;
  
  // 2. Fallback hanya jika docNo belum ada dan receiptIndex valid (>= 0)
  if (!docNo && receiptIndex !== undefined && receiptIndex !== null && Number(receiptIndex) >= 0) {
    const year = getReceiptContextYear(tx);
    docNo = formatStandardDocNo(year, 'APR', Number(receiptIndex) + 1);
  }

  const canonicalDocNo = docNo ? String(docNo).trim() : null;
  const canonicalId = txId ? String(txId).trim() : null;
  const hasValidIndex = (receiptIndex !== undefined && receiptIndex !== null && Number(receiptIndex) >= 0);
  const targetIndex = hasValidIndex ? Number(receiptIndex) : (tx.originalIndex !== undefined ? Number(tx.originalIndex) : -1);

  const getCol = (key, preloadedKey) => {
    if (preloadedContext && preloadedContext[preloadedKey]) return preloadedContext[preloadedKey];
    return storage.get(key, []);
  };

  // 1. Cek Seeding (seeding_transactions)
  const seedingTxs = getCol('seeding_transactions', 'seedingTxs');
  const usedInSeeding = seedingTxs.some(s => {
    if (!s || !isTxActive(s)) return false;
    // Priority 1: ID
    if (canonicalId && (
      (s.sourceReceiptId && String(s.sourceReceiptId).trim() === canonicalId) ||
      (s.receiptId && String(s.receiptId).trim() === canonicalId) ||
      (s.sourceTxId && String(s.sourceTxId).trim() === canonicalId)
    )) {
      return true;
    }
    // Priority 2: docNo / sourceDocNo / receiptDocNo / sourceReceiptDocNo
    if (canonicalDocNo) {
      if (s.sourceDocNo && String(s.sourceDocNo).trim() === canonicalDocNo) return true;
      if (s.receiptDocNo && String(s.receiptDocNo).trim() === canonicalDocNo) return true;
      if (s.sourceReceiptDocNo && String(s.sourceReceiptDocNo).trim() === canonicalDocNo) return true;
    }
    // Priority 5: sourceIndex fallback
    if (targetIndex >= 0 && s.sourceIndex !== undefined && s.sourceIndex !== null && String(s.sourceIndex) !== '') {
      if (Number(s.sourceIndex) === targetIndex) return true;
    }
    return false;
  });
  if (usedInSeeding) return true;

  // 2. Cek Dederan (dederan_transactions)
  const dederTxs = getCol('dederan_transactions', 'dederTxs');
  const usedInDederan = dederTxs.some(d => {
    if (!d || !isTxActive(d)) return false;
    // Priority 1: ID
    if (canonicalId && (
      (d.sourceReceiptId && String(d.sourceReceiptId).trim() === canonicalId) ||
      (d.receiptId && String(d.receiptId).trim() === canonicalId)
    )) {
      return true;
    }
    // Priority 2: docNo
    if (canonicalDocNo) {
      if (d.sourceReceiptDocNo && String(d.sourceReceiptDocNo).trim() === canonicalDocNo) return true;
      if (d.receiptDocNo && String(d.receiptDocNo).trim() === canonicalDocNo) return true;
      if (d.sourceDocNo && String(d.sourceDocNo).trim() === canonicalDocNo) return true;
    }
    // Priority 5: fallback sourceReceiptIndex / sourceIndex
    if (targetIndex >= 0) {
      if (d.sourceReceiptIndex !== undefined && d.sourceReceiptIndex !== null && String(d.sourceReceiptIndex) !== '') {
        if (Number(d.sourceReceiptIndex) === targetIndex) return true;
      }
      if (d.sourceIndex !== undefined && d.sourceIndex !== null && String(d.sourceIndex) !== '') {
        if (Number(d.sourceIndex) === targetIndex) return true;
      }
    }
    return false;
  });
  if (usedInDederan) return true;

  // 3. Cek Dokumen Induk Deder (dederan_induk_documents) yang AKTIF mengikat kuota (totalDidederSDHI > 0 atau child txs aktif)
  const indukDocs = getCol('dederan_induk_documents', 'indukDocs');
  const activeInduk = indukDocs.find(induk => {
    if (!induk) return false;
    let isMatch = false;
    if (canonicalDocNo && (
      (induk.sourceReceiptDocNo && String(induk.sourceReceiptDocNo).trim() === canonicalDocNo) ||
      (induk.receiptDocNo && String(induk.receiptDocNo).trim() === canonicalDocNo)
    )) {
      isMatch = true;
    }
    if (!isMatch && targetIndex >= 0 && induk.sourceReceiptIndex !== undefined && Number(induk.sourceReceiptIndex) === targetIndex) {
      isMatch = true;
    }
    if (isMatch) {
      const totalDideder = parseInt(induk.totalDidederSDHI || 0, 10);
      if (totalDideder > 0) return true;
      const hasChildDeder = dederTxs.some(t => isTxActive(t) && t.parentDederIndukDocNo === induk.docNo);
      if (hasChildDeder) return true;
    }
    return false;
  });
  if (activeInduk) return true;

  // 4. Cek Seleksi Pra-Okulasi (pre_grafting_selection_documents) yang direct referensi ke Penerimaan
  const selectionDocs = getCol('pre_grafting_selection_documents', 'selectionDocs');
  const usedInSelection = selectionDocs.some(d => {
    if (!d || !isTxActive(d)) return false;
    if (canonicalDocNo && (
      (d.receiptDocNo && String(d.receiptDocNo).trim() === canonicalDocNo) ||
      (d.sourceReceiptDocNo && String(d.sourceReceiptDocNo).trim() === canonicalDocNo) ||
      (d.sourceDocNo && String(d.sourceDocNo).trim() === canonicalDocNo)
    )) {
      return true;
    }
    return false;
  });
  if (usedInSelection) return true;

  return false;
}

/**
 * Canonical Lock Helper untuk Dokumen Penerimaan:
 * Persistent Lifecycle Lock berdasarkan:
 * Condition A: Verification Lock (sedang dalam proses verifikasi atau disetujui)
 * Condition B: Referential Lock (sudah digunakan sebagai referensi transaksi hilir)
 * 
 * @param {object} receiptTx - Record transaksi penerimaan
 * @param {number} [receiptIndex=-1] - Indeks transaksi dalam list
 * @param {object} [preloadedContext=null] - Konteks koleksi transaksi yang telah dimuat sebelumnya (opsional)
 * @returns {{ locked: boolean, reason: 'VERIFICATION_LOCK' | 'REFERENTIAL_LOCK' | null }}
 */
export function isReceiptLocked(receiptTx, receiptIndex = -1, preloadedContext = null) {
  if (isTransactionLockedForMantri(receiptTx)) {
    return {
      locked: true,
      reason: 'VERIFICATION_LOCK'
    };
  }

  if (isReceiptUsedAsReference(receiptTx, receiptIndex, preloadedContext)) {
    return {
      locked: true,
      reason: 'REFERENTIAL_LOCK'
    };
  }

  return {
    locked: false,
    reason: null
  };
}

/**
 * Memeriksa apakah suatu dokumen/transaksi telah digunakan sebagai referensi oleh modul hilir (downstream).
 * Mendukung masukan string (docNo/ID) maupun object transaksi ({ id, docNo, ... }).
 * Menggunakan Directional Topological Filtering untuk membatasi pemindaian tabel yang relevan secara domain,
 * dengan full-scan fallback jika tipe sumber tidak dikenali atau ambigu.
 * Mengecualikan transaksi downstream yang berstatus pembatalan valid (BATAL, CANCELLED, VOID).
 *
 * @param {string|object} docIdentifier - Nomor dokumen atau record objek transaksi
 * @param {string} [sourceTypeHint=null] - Petunjuk tipe modul sumber ('RECEIPT', 'DEDERAN', 'SEEDING', 'SELECTION', 'BUDDING', 'INSPECTION')
 * @param {object} [preloadedContext=null] - Konteks koleksi transaksi yang telah dimuat sebelumnya (opsional)
 * @returns {object|null} - Mengembalikan objek { docNo, moduleName, url, status } jika ada dependensi aktif, atau null jika aman.
 */
export function findDownstreamDependency(docIdentifier, sourceTypeHint = null, preloadedContext = null) {
  if (!docIdentifier) return null;

  const isObj = typeof docIdentifier === 'object' && docIdentifier !== null;
  const docNo = isObj
    ? (docIdentifier.docNo || docIdentifier.nomorDokumen || docIdentifier.selectionNo || null)
    : (typeof docIdentifier === 'string' ? docIdentifier.trim() : null);
  const docId = isObj
    ? (docIdentifier.id || docIdentifier.receiptId || docIdentifier.txId || null)
    : (typeof docIdentifier === 'string' ? docIdentifier.trim() : null);
  const batchCode = isObj
    ? (docIdentifier.batchCode || docIdentifier.batchNo || docIdentifier.batch_id || null)
    : null;

  if (!docNo && !docId && !batchCode) return null;

  const matchesKey = (val, targetKeys) => {
    if (!val) return false;
    const strVal = String(val).trim();
    return targetKeys.some(k => k && String(k).trim() === strVal);
  };

  const keysToCheck = [docNo, docId].filter(Boolean);

  // Helper untuk membaca dari preloadedContext jika tersedia atau storage.get
  const getCol = (key, preloadedKey) => {
    if (preloadedContext && preloadedContext[preloadedKey]) return preloadedContext[preloadedKey];
    return storage.get(key, []);
  };

  // 1. Cek Penyemaian / Pindah Semai (seeding_transactions)
  const checkSeeding = () => {
    const seedingTxs = getCol('seeding_transactions', 'seedingTxs');
    const dependentSeeding = seedingTxs.find(s => {
      if (!s || !isTxActive(s)) return false;
      if (s.id && (s.id === docId || s.id === docNo)) return false; // Abaikan dirinya sendiri
      if (s.docNo && s.docNo === docNo) return false;

      return (
        matchesKey(s.sourceDocNo, keysToCheck) ||
        matchesKey(s.receiptDocNo, keysToCheck) ||
        matchesKey(s.sourceReceiptDocNo, keysToCheck) ||
        matchesKey(s.sourceReceiptId, keysToCheck) ||
        matchesKey(s.receiptId, keysToCheck) ||
        matchesKey(s.sourceTxId, keysToCheck) ||
        matchesKey(s.dederanTxDocNo, keysToCheck) ||
        matchesKey(s.sourceDederanDocNo, keysToCheck) ||
        matchesKey(s.sourceDederanId, keysToCheck)
      );
    });
    if (dependentSeeding) {
      return {
        docNo: dependentSeeding.docNo || dependentSeeding.nomorDokumen || dependentSeeding.id || 'Transaksi Penyemaian',
        moduleName: 'Penyemaian / Pindah Semai',
        url: '/seeding',
        status: dependentSeeding.status || dependentSeeding.verificationStatus || 'AKTIF'
      };
    }
    return null;
  };

  // 2. Cek Dederan (dederan_transactions)
  const checkDederan = () => {
    const dederTxs = getCol('dederan_transactions', 'dederTxs');
    const dependentDeder = dederTxs.find(d => {
      if (!d || !isTxActive(d)) return false;
      if (d.id && (d.id === docId || d.id === docNo)) return false;
      if (d.docNo && d.docNo === docNo) return false;

      return (
        matchesKey(d.sourceReceiptDocNo, keysToCheck) ||
        matchesKey(d.receiptDocNo, keysToCheck) ||
        matchesKey(d.sourceDocNo, keysToCheck) ||
        matchesKey(d.sourceReceiptId, keysToCheck) ||
        matchesKey(d.receiptId, keysToCheck)
      );
    });
    if (dependentDeder) {
      return {
        docNo: dependentDeder.docNo || dependentDeder.nomorDokumen || dependentDeder.id || 'Transaksi Dederan',
        moduleName: 'Dederan (Germinasi)',
        url: '/seeding',
        status: dependentDeder.status || dependentDeder.verificationStatus || 'AKTIF'
      };
    }
    return null;
  };

  // 3. Cek Dokumen Induk Deder yang aktif (dederan_induk_documents)
  const checkInduk = () => {
    const indukDocs = getCol('dederan_induk_documents', 'indukDocs');
    const dederTxs = getCol('dederan_transactions', 'dederTxs');
    const dependentInduk = indukDocs.find(induk => {
      if (!induk) return false;
      if (induk.docNo && induk.docNo === docNo) return false;

      const isMatch = (
        matchesKey(induk.sourceReceiptDocNo, keysToCheck) ||
        matchesKey(induk.receiptDocNo, keysToCheck) ||
        matchesKey(induk.sourceReceiptId, keysToCheck)
      );
      if (!isMatch) return false;

      const totalDideder = parseInt(induk.totalDidederSDHI || 0, 10);
      const hasChildDeder = dederTxs.some(t => isTxActive(t) && t.parentDederIndukDocNo === induk.docNo);
      return totalDideder > 0 || hasChildDeder;
    });
    if (dependentInduk) {
      return {
        docNo: dependentInduk.docNo || 'Dokumen Induk Deder',
        moduleName: 'Dederan (Dokumen Induk)',
        url: '/seeding',
        status: 'AKTIF'
      };
    }
    return null;
  };

  // 4. Cek Pemeriksaan Dederan (dederan_inspection_transactions)
  const checkDederInspection = () => {
    const dederInspTxs = getCol('dederan_inspection_transactions', 'dederInspTxs');
    const dependentDederInsp = dederInspTxs.find(di => {
      if (!di || !isTxActive(di)) return false;
      if (di.id && (di.id === docId || di.id === docNo)) return false;
      if (di.docNo && di.docNo === docNo) return false;

      return (
        matchesKey(di.dederanTxDocNo, keysToCheck) ||
        matchesKey(di.sourceDederanDocNo, keysToCheck) ||
        matchesKey(di.sourceDocNo, keysToCheck) ||
        matchesKey(di.dederanTxId, keysToCheck)
      );
    });
    if (dependentDederInsp) {
      return {
        docNo: dependentDederInsp.docNo || 'Pemeriksaan Dederan',
        moduleName: 'Pemeriksaan Dederan',
        url: '/inspection',
        status: dependentDederInsp.status || dependentDederInsp.verificationStatus || 'AKTIF'
      };
    }
    return null;
  };

  // 5. Cek Dokumen Seleksi Pra-Okulasi (pre_grafting_selection_documents) & Transaksi Seleksi (selection_transactions)
  const checkSelection = () => {
    const selectionDocs = getCol('pre_grafting_selection_documents', 'selectionDocs');
    const dependentSelection = selectionDocs.find(d => {
      if (!d || !isTxActive(d)) return false;
      if (d.id && (d.id === docId || d.id === docNo)) return false;
      if (d.docNo && d.docNo === docNo) return false;

      return (
        matchesKey(d.sourceSeedingDocNo, keysToCheck) ||
        matchesKey(d.sourceDocNo, keysToCheck) ||
        matchesKey(d.seedingDocNo, keysToCheck) ||
        matchesKey(d.receiptDocNo, keysToCheck) ||
        matchesKey(d.sourceReceiptDocNo, keysToCheck) ||
        matchesKey(d.sourceSelection1DocNo, keysToCheck) ||
        matchesKey(d.sourceSelection2DocNo, keysToCheck) ||
        matchesKey(d.sourceSelectionDocNo, keysToCheck) ||
        matchesKey(d.sourceSeedingId, keysToCheck) ||
        matchesKey(d.dederanTxDocNo, keysToCheck)
      );
    });
    if (dependentSelection) {
      return {
        docNo: dependentSelection.docNo || 'Dokumen Seleksi',
        moduleName: 'Penyeleksian (Pra-Okulasi)',
        url: '/selection',
        status: dependentSelection.status || dependentSelection.verificationStatus || 'AKTIF'
      };
    }

    const selectionTxs = getCol('selection_transactions', 'selectionTxs');
    const dependentSelectionTx = selectionTxs.find(st => {
      if (!st || !isTxActive(st)) return false;
      if (st.id && (st.id === docId || st.id === docNo)) return false;
      if (st.docNo && st.docNo === docNo) return false;

      return (
        matchesKey(st.sourceDocNo, keysToCheck) ||
        matchesKey(st.dederanTxDocNo, keysToCheck) ||
        matchesKey(st.sourceTransactionId, keysToCheck) ||
        matchesKey(st.sourceSeedingDocNo, keysToCheck)
      );
    });
    if (dependentSelectionTx) {
      return {
        docNo: dependentSelectionTx.docNo || dependentSelectionTx.selectionNo || 'Transaksi Seleksi',
        moduleName: 'Penyeleksian',
        url: '/selection',
        status: dependentSelectionTx.status || dependentSelectionTx.verificationStatus || 'AKTIF'
      };
    }
    return null;
  };

  // 6. Cek Okulasi Grafting / Regrafting (budding_transactions)
  const checkBudding = () => {
    const buddingTxs = getCol('budding_transactions', 'buddingTxs');
    const dependentBudding = buddingTxs.find(b => {
      if (!b || !isTxActive(b)) return false;
      if (b.id && (b.id === docId || b.id === docNo)) return false;
      if (b.docNo && b.docNo === docNo) return false;

      return (
        matchesKey(b.sourceSelection3DocNo, keysToCheck) ||
        matchesKey(b.sourceSelectionDocNo, keysToCheck) ||
        matchesKey(b.sourceSelection3DocumentId, keysToCheck) ||
        matchesKey(b.sourceSeedingDocNo, keysToCheck) ||
        matchesKey(b.seedingDocNo, keysToCheck) ||
        matchesKey(b.sourceDocNo, keysToCheck) ||
        matchesKey(b.regraftPoolDocNo, keysToCheck) ||
        matchesKey(b.sourceInspectionDocNo, keysToCheck) ||
        matchesKey(b.inspectionDocNo, keysToCheck) ||
        matchesKey(b.sourceInspectionId, keysToCheck)
      );
    });
    if (dependentBudding) {
      const isRegraft = b => b.type === 'REGRAFTING';
      return {
        docNo: dependentBudding.docNo || 'Transaksi Okulasi',
        moduleName: isRegraft(dependentBudding) ? 'Okulasi (Regrafting)' : 'Okulasi (Grafting)',
        url: isRegraft(dependentBudding) ? '/budding/regrafting' : '/budding/grafting',
        status: dependentBudding.status || dependentBudding.verificationStatus || 'AKTIF'
      };
    }
    return null;
  };

  // 7. Cek Pemeriksaan Okulasi (inspection_transactions)
  const checkInspection = () => {
    const inspectionTxs = getCol('inspection_transactions', 'inspectionTxs');
    const dependentInspection = inspectionTxs.find(ins => {
      if (!ins || !isTxActive(ins)) return false;
      if (ins.id && (ins.id === docId || ins.id === docNo)) return false;
      if (ins.docNo && ins.docNo === docNo) return false;

      return (
        matchesKey(ins.buddingDocNo, keysToCheck) ||
        matchesKey(ins.sourceBuddingDocNo, keysToCheck) ||
        matchesKey(ins.sourceDocNo, keysToCheck) ||
        matchesKey(ins.buddingId, keysToCheck) ||
        matchesKey(ins.sourceBuddingId, keysToCheck)
      );
    });
    if (dependentInspection) {
      return {
        docNo: dependentInspection.docNo || 'Transaksi Pemeriksaan Okulasi',
        moduleName: 'Pemeriksaan Okulasi',
        url: '/inspection',
        status: dependentInspection.status || dependentInspection.verificationStatus || 'AKTIF'
      };
    }
    return null;
  };

  // 8. Cek Pool Pasca-Okulasi / Regrafting (selection_pool) yang aktif dikonsumsi
  const checkPool = () => {
    const pool = getCol('selection_pool', 'pool');
    const dependentPool = pool.find(p => {
      if (!p || !isTxActive(p)) return false;
      if (p.id && (p.id === docId || p.id === docNo)) return false;
      if (p.docNo && p.docNo === docNo) return false;

      const matches = (
        matchesKey(p.inspectionDocNo, keysToCheck) ||
        matchesKey(p.buddingDocNo, keysToCheck) ||
        matchesKey(p.sourceInspectionId, keysToCheck) ||
        matchesKey(p.sourceDocNo, keysToCheck)
      );
      if (!matches) return false;

      // Pool dianggap dependensi aktif jika sudah dikonsumsi atau memiliki kuantitas aktif
      return Boolean(p.isConsumed || (p.consumedQty && Number(p.consumedQty) > 0) || p.status === 'CONSUMED' || p.status === 'ACTIVE');
    });
    if (dependentPool) {
      return {
        docNo: dependentPool.docNo || dependentPool.inspectionDocNo || 'Alokasi Regrafting / Seleksi',
        moduleName: 'Seleksi Pasca-Okulasi',
        url: '/selection',
        status: dependentPool.status || 'AKTIF'
      };
    }
    return null;
  };

  // Resolusi tipe sumber (Source Type Resolution)
  let resolvedType = null;
  if (sourceTypeHint && typeof sourceTypeHint === 'string') {
    resolvedType = sourceTypeHint.trim().toUpperCase();
  } else if (isObj) {
    if (docIdentifier.type) resolvedType = String(docIdentifier.type).trim().toUpperCase();
    else if (docIdentifier.module) resolvedType = String(docIdentifier.module).trim().toUpperCase();
    else if (docIdentifier.stage) resolvedType = String(docIdentifier.stage).trim().toUpperCase();
    else if (docIdentifier.sourceModule) resolvedType = String(docIdentifier.sourceModule).trim().toUpperCase();
  }

  // Normalisasi kategori tipe sumber
  let category = 'UNKNOWN';
  if (resolvedType) {
    if (resolvedType.includes('RECEIPT') || resolvedType.includes('PENERIMAAN') || resolvedType === 'APR') {
      category = 'RECEIPT';
    } else if (resolvedType.includes('DEDERAN') || resolvedType.includes('GERMINASI') || resolvedType === 'DED') {
      category = 'DEDERAN';
    } else if (resolvedType.includes('SEEDING') || resolvedType.includes('PINDAH_SEMAI') || resolvedType.includes('PENYEMAIAN') || resolvedType === 'SOW') {
      category = 'SEEDING';
    } else if (resolvedType.includes('SELEKSI') || resolvedType.includes('SELECTION') || resolvedType === 'SEL' || resolvedType === 'CULL') {
      category = 'SELECTION';
    } else if (resolvedType.includes('BUDDING') || resolvedType.includes('OKULASI') || resolvedType.includes('GRAFTING') || resolvedType === 'GRF' || resolvedType === 'RGRF') {
      category = 'BUDDING';
    } else if (resolvedType.includes('INSPECTION') || resolvedType.includes('PEMERIKSAAN') || resolvedType === 'INS' || resolvedType === 'PRK') {
      category = 'INSPECTION';
    }
  }

  // Secondary prefix hint (hanya jika category masih UNKNOWN)
  if (category === 'UNKNOWN' && docNo) {
    const upperDoc = String(docNo).toUpperCase();
    if (upperDoc.includes('/APR/') || upperDoc.startsWith('APR-') || upperDoc.includes('/REC/')) {
      category = 'RECEIPT';
    } else if (upperDoc.includes('/DED/') || upperDoc.startsWith('DED-')) {
      category = 'DEDERAN';
    } else if (upperDoc.includes('/SOW/') || upperDoc.startsWith('SOW-')) {
      category = 'SEEDING';
    } else if (upperDoc.includes('/SEL/') || upperDoc.includes('/SEL-') || upperDoc.includes('/CULL/')) {
      category = 'SELECTION';
    } else if (upperDoc.includes('/GRF/') || upperDoc.includes('/RGRF/') || upperDoc.includes('/OKL/') || upperDoc.includes('/OKJ/')) {
      category = 'BUDDING';
    } else if (upperDoc.includes('/INS/') || upperDoc.includes('/PRK/') || upperDoc.includes('/INSP/')) {
      category = 'INSPECTION';
    }
  }

  // Directional Topological Routing: Tentukan urutan pemeriksaan tabel yang relevan
  const checksToRun = [];

  switch (category) {
    case 'RECEIPT':
      checksToRun.push(checkSeeding, checkDederan, checkInduk, checkSelection);
      break;
    case 'DEDERAN':
      checksToRun.push(checkSeeding, checkDederInspection, checkSelection);
      break;
    case 'SEEDING':
      checksToRun.push(checkSelection, checkBudding);
      break;
    case 'SELECTION':
      checksToRun.push(checkBudding, checkSelection);
      break;
    case 'BUDDING':
      checksToRun.push(checkInspection, checkPool);
      break;
    case 'INSPECTION':
      checksToRun.push(checkBudding, checkPool, checkSelection);
      break;
    default:
      // Fallback Aman (Full Scan 8 Pemeriksaan dalam urutan asli kanonikal)
      checksToRun.push(checkSeeding, checkDederan, checkInduk, checkDederInspection, checkSelection, checkBudding, checkInspection, checkPool);
      break;
  }

  for (const fn of checksToRun) {
    const dep = fn();
    if (dep) return dep;
  }

  return null;
}

/**
 * Menampilkan warning popup jika ada dependency aktif downstream, dan mengembalikan true jika di-block.
 *
 * @param {string|object} docIdentifier - Nomor dokumen atau objek record transaksi
 * @param {string} moduleName - Nama modul (misal: "Penyemaian")
 * @param {string} action - "Diubah" atau "Dihapus"
 * @returns {boolean} - true jika BLOCKED, false jika AMAN
 */
export function guardDependency(docIdentifier, moduleName, action = 'Diubah') {
  const dependency = findDownstreamDependency(docIdentifier);
  
  if (dependency) {
    const docDisplay = (typeof docIdentifier === 'object' && docIdentifier !== null)
      ? (docIdentifier.docNo || docIdentifier.nomorDokumen || docIdentifier.id || '')
      : String(docIdentifier || '');

    const modalBody = `
      <div style="text-align: center; color: #333;">
        <p style="margin-bottom: 12px;">Transaksi <strong>${moduleName}</strong> ${docDisplay ? `(<strong>${docDisplay}</strong>) ` : ''}tidak dapat ${action.toLowerCase()} karena masih memiliki transaksi downstream aktif.</p>
        <div style="background: #FFF3E0; border: 1px solid #FFE0B2; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 0.8rem; color: #E65100; margin-bottom: 4px;">DOKUMEN TERKAIT:</div>
          <div style="font-weight: bold; color: #E65100; font-size: 1.1rem;">${dependency.docNo}</div>
          <div style="font-size: 0.85rem; color: #E65100; margin-top: 4px;">(${dependency.moduleName}${dependency.status ? ` • ${dependency.status}` : ''})</div>
        </div>
        <p style="font-size: 0.85rem; color: #666; margin-bottom: 20px;">
          Silakan batalkan atau hapus dokumen downstream terkait terlebih dahulu sebelum melakukan ${action.toLowerCase()} pada dokumen sumber ini.
        </p>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button id="btn-dep-close" style="padding: 10px 16px; border-radius: 6px; border: 1px solid #CCC; background: #FFF; cursor: pointer; flex: 1;">Tutup</button>
          <button id="btn-dep-nav" style="padding: 10px 16px; border-radius: 6px; border: none; background: #E53935; color: #FFF; font-weight: bold; cursor: pointer; flex: 1;">Buka Dokumen</button>
        </div>
      </div>
    `;

    if (typeof document !== 'undefined') {
      try {
        openModal({
          title: `Data Tidak Dapat ${action}`,
          body: modalBody
        });

        setTimeout(() => {
          if (typeof document !== 'undefined') {
            document.getElementById('btn-dep-close')?.addEventListener('click', closeModal);
            document.getElementById('btn-dep-nav')?.addEventListener('click', () => {
              closeModal();
              if (dependency.url) {
                navigate(dependency.url);
              }
            });
          }
        }, 50);
      } catch (e) {
        // Fallback for environments where modal root is not present
      }
    }

    return true; // Blocked
  }

  return false; // Safe
}

/**
 * Validasi apakah dokumen sumber aman untuk dikoreksi.
 * Membedakan perubahan metadata (selalu aman) dari perubahan kuantitas yang dapat melanggar kuantitas yang sudah disetujui di dokumen turunan langsung.
 *
 * @param {string} docType - Tipe dokumen sumber ('DEDERAN', 'DEDERAN_INSPECTION', 'BUDDING', 'SEEDING', etc.)
 * @param {string} docNo - Nomor dokumen sumber
 * @param {object} [updatedPayload=null] - Payload koreksi yang akan disimpan
 * @returns {{ allowed: boolean, reason?: string, blockingDocNo?: string }}
 */
export function validateSourceEditability(docType, docNo, updatedPayload = null) {
  if (!docNo) return { allowed: true };

  const normType = String(docType || '').toUpperCase();

  // 1. Kasus Dokumen Dederan / Germinasi
  if (normType === 'DEDERAN' || normType === 'DEDERAN_TRANSACTION') {
    if (!updatedPayload) return { allowed: true };

    const newQty = parseInt(
      updatedPayload.jumlahDeder !== undefined
        ? updatedPayload.jumlahDeder
        : (updatedPayload.jumlahKecambahDitanam !== undefined ? updatedPayload.jumlahKecambahDitanam : -1),
      10
    );

    if (isNaN(newQty) || newQty < 0) {
      // Jika perubahan tidak memodifikasi kuantitas (hanya metadata/catatan), selalu izinkan
      return { allowed: true, isMetadataOnly: true };
    }

    // Cek turunan Pindah Semai (seeding_transactions) yang telah DISETUJUI
    const seedingTxs = storage.get('seeding_transactions', []);
    let approvedPindahSemaiQty = 0;
    let blockingSeedingDoc = null;

    seedingTxs.forEach(s => {
      if (!s) return;
      const isRef = (s.dederanTxDocNo && s.dederanTxDocNo === docNo) || (s.sourceDocNo && s.sourceDocNo === docNo);
      const isApproved = String(s.status || '').toUpperCase() === 'DISETUJUI' || String(s.status || '').toUpperCase() === 'TERVERIFIKASI';
      if (isRef && isApproved) {
        const sQty = parseInt(s.jumlahBibitDipindahkan || s.totalDisemai || s.qty || 0, 10);
        approvedPindahSemaiQty += sQty;
        if (!blockingSeedingDoc) blockingSeedingDoc = s.docNo || s.id;
      }
    });

    // Cek turunan Seleksi Pra-Semai (selection_transactions) yang telah DISETUJUI
    const selTxs = storage.get('selection_transactions', []);
    let approvedSelAfkir = 0;
    let blockingSelDoc = null;

    selTxs.forEach(st => {
      if (!st) return;
      const isDederanStage = st.stage === 'SELEKSI_PRA_SEMAI' || st.stage === 'PRA_SEMAI' || st.originType === 'REJECT_DEDERAN' || st.originType === 'DEDERAN' || st.sourceTransactionType === 'DEDER_INSPECTION';
      const isRef = (st.sourceDocNo && st.sourceDocNo === docNo) || (st.dederanTxDocNo && st.dederanTxDocNo === docNo) || (st.sourceTransactionId && st.sourceTransactionId === docNo);
      const isApproved = String(st.status || '').toUpperCase() === 'DISETUJUI' || String(st.status || '').toUpperCase() === 'TERVERIFIKASI';
      if (isDederanStage && isRef && isApproved) {
        const afkirQty = parseInt(st.jumlahAfkirTotal || st.jumlahAfkir || st.quantity || 0, 10);
        approvedSelAfkir += afkirQty;
        if (!blockingSelDoc) blockingSelDoc = st.docNo || st.id;
      }
    });

    const totalPhysicalConsumption = approvedPindahSemaiQty + approvedSelAfkir;

    if (totalPhysicalConsumption > 0 && newQty < totalPhysicalConsumption) {
      const breakdown = [];
      if (approvedPindahSemaiQty > 0) breakdown.push(`Pindah Semai: ${approvedPindahSemaiQty.toLocaleString('id-ID')}`);
      if (approvedSelAfkir > 0) breakdown.push(`Seleksi Pra-Semai: ${approvedSelAfkir.toLocaleString('id-ID')}`);
      return {
        allowed: false,
        reason: `Kuantitas baru (${newQty.toLocaleString('id-ID')}) lebih kecil dari total konsumsi fisik final yang telah disetujui (${totalPhysicalConsumption.toLocaleString('id-ID')}${breakdown.length > 0 ? ` [${breakdown.join(', ')}]` : ''}).`,
        blockingDocNo: blockingSeedingDoc || blockingSelDoc
      };
    }
  }

  // 2. Kasus Pemeriksaan Dederan
  if (normType === 'DEDERAN_INSPECTION' || normType === 'PEMERIKSAAN_DEDERAN') {
    if (!updatedPayload) return { allowed: true };

    const newDiperiksa = parseInt(updatedPayload.jumlahDiperiksa, 10);
    const newBerhasil = parseInt(updatedPayload.jumlahBerhasil, 10);

    if (!isNaN(newDiperiksa) && !isNaN(newBerhasil)) {
      const newTidakBerhasil = Math.max(0, newDiperiksa - newBerhasil);

      // Cek apakah ada Transaksi Seleksi turunan yang telah DISETUJUI dengan kuantitas > newTidakBerhasil
      const selTxs = storage.get('selection_transactions', []);
      let approvedSelAfkir = 0;
      let blockingSelDoc = null;

      selTxs.forEach(st => {
        if (!st) return;
        const isRef = (st.sourceDocNo && st.sourceDocNo === docNo) || (st.dederanTxDocNo && st.dederanTxDocNo === docNo);
        const isApproved = String(st.status || '').toUpperCase() === 'DISETUJUI';
        if (isRef && isApproved) {
          const afkirQty = parseInt(st.jumlahAfkirTotal || st.jumlahAfkir || st.quantity || 0, 10);
          approvedSelAfkir += afkirQty;
          if (!blockingSelDoc) blockingSelDoc = st.docNo || st.id;
        }
      });

      if (approvedSelAfkir > 0 && newTidakBerhasil < approvedSelAfkir) {
        return {
          allowed: false,
          reason: `Kuantitas afkir baru (${newTidakBerhasil.toLocaleString('id-ID')}) lebih kecil dari kuantitas seleksi yang telah disetujui (${approvedSelAfkir.toLocaleString('id-ID')}).`,
          blockingDocNo: blockingSelDoc
        };
      }
    }
  }

  // 3. Kasus Penerimaan Benih / Biji Kelatak
  if (normType === 'RECEIPT' || normType === 'PENERIMAAN' || normType === 'RECEIPT_TRANSACTION') {
    if (!updatedPayload) return { allowed: true };

    const newQty = parseInt(
      updatedPayload.diterima !== undefined
        ? updatedPayload.diterima
        : (updatedPayload.qty !== undefined ? updatedPayload.qty : (updatedPayload.totalDiterima !== undefined ? updatedPayload.totalDiterima : -1)),
      10
    );

    if (isNaN(newQty) || newQty < 0) {
      return { allowed: true, isMetadataOnly: true };
    }

    const indukDocs = storage.get('dederan_induk_documents', []);
    const dederTxs = storage.get('dederan_transactions', []);
    let committedDederQty = 0;
    let blockingDederDoc = null;

    indukDocs.forEach(induk => {
      if (!induk) return;
      const isRef = (induk.sourceReceiptDocNo && induk.sourceReceiptDocNo === docNo) ||
                    (induk.receiptDocNo && induk.receiptDocNo === docNo) ||
                    (induk.docNo && induk.docNo === docNo);
      if (isRef) {
        const totalDideder = parseInt(induk.totalDidederSDHI || 0, 10);
        if (totalDideder > committedDederQty) {
          committedDederQty = totalDideder;
          blockingDederDoc = induk.docNo;
        }
      }
    });

    dederTxs.forEach(d => {
      if (!d) return;
      const isCancelled = ['BATAL', 'CANCELLED', 'VOID'].includes(String(d.status || '').toUpperCase());
      if (isCancelled) return;
      const isRef = (d.sourceReceiptDocNo && d.sourceReceiptDocNo === docNo) ||
                    (d.receiptDocNo && d.receiptDocNo === docNo) ||
                    (d.sourceDocNo && d.sourceDocNo === docNo);
      if (isRef) {
        const dQty = parseInt(d.jumlahDeder || d.jumlahKecambahDitanam || 0, 10);
        if (dQty > 0 && !blockingDederDoc) blockingDederDoc = d.docNo || d.id;
      }
    });

    if (committedDederQty > 0 && newQty < committedDederQty) {
      return {
        allowed: false,
        reason: `Kuantitas penerimaan baru (${newQty.toLocaleString('id-ID')}) lebih kecil dari total kuantitas yang telah didederkan (${committedDederQty.toLocaleString('id-ID')}).`,
        blockingDocNo: blockingDederDoc
      };
    }
  }

  // 4. Kasus Pindah Semai (Main Nursery)
  if (normType === 'SEEDING' || normType === 'PENYEMAIAN' || normType === 'PINDAH_SEMAI' || normType === 'SEEDING_TRANSACTION') {
    if (!updatedPayload) return { allowed: true };

    const newQty = parseInt(
      updatedPayload.jumlahBibitDipindahkan !== undefined
        ? updatedPayload.jumlahBibitDipindahkan
        : (updatedPayload.totalDisemai !== undefined ? updatedPayload.totalDisemai : (updatedPayload.qty !== undefined ? updatedPayload.qty : -1)),
      10
    );

    if (isNaN(newQty) || newQty < 0) {
      return { allowed: true, isMetadataOnly: true };
    }

    const selectionDocs = storage.get('pre_grafting_selection_documents', []);
    const buddingTxs = storage.get('budding_transactions', []);
    let approvedDownstreamQty = 0;
    let blockingDownstreamDoc = null;

    selectionDocs.forEach(s => {
      if (!s) return;
      const isRef = (s.sourceSeedingDocNo && s.sourceSeedingDocNo === docNo) ||
                    (s.seedingDocNo && s.seedingDocNo === docNo) ||
                    (s.sourceDocNo && s.sourceDocNo === docNo);
      const isApproved = String(s.status || '').toUpperCase() === 'DISETUJUI' || String(s.status || '').toUpperCase() === 'TERVERIFIKASI';
      if (isRef && isApproved) {
        const sQty = parseInt(s.jumlahAfkirTotal || s.rejected || s.afkir || 0, 10);
        approvedDownstreamQty += sQty;
        if (!blockingDownstreamDoc) blockingDownstreamDoc = s.docNo || s.id;
      }
    });

    buddingTxs.forEach(b => {
      if (!b) return;
      const isRef = (b.sourceSeedingDocNo && b.sourceSeedingDocNo === docNo) ||
                    (b.seedingDocNo && b.seedingDocNo === docNo) ||
                    (b.sourceDocNo && b.sourceDocNo === docNo);
      const isApproved = String(b.status || '').toUpperCase() === 'DISETUJUI' || String(b.status || '').toUpperCase() === 'TERVERIFIKASI';
      if (isRef && isApproved) {
        const bQty = parseInt(b.jumlahOkulasi || b.totalOkulasi || b.jumlahBatangOkulasi || 0, 10);
        approvedDownstreamQty += bQty;
        if (!blockingDownstreamDoc) blockingDownstreamDoc = b.docNo || b.id;
      }
    });

    if (approvedDownstreamQty > 0 && newQty < approvedDownstreamQty) {
      return {
        allowed: false,
        reason: `Kuantitas Pindah Semai baru (${newQty.toLocaleString('id-ID')}) lebih kecil dari total kuantitas hilir yang telah disetujui (${approvedDownstreamQty.toLocaleString('id-ID')}).`,
        blockingDocNo: blockingDownstreamDoc
      };
    }
  }

  // 5. Kasus Okulasi (Grafting / Regrafting)
  if (normType === 'BUDDING' || normType === 'OKULASI' || normType === 'BUDDING_TRANSACTION' || normType === 'GRAFTING' || normType === 'REGRAFTING') {
    if (!updatedPayload) return { allowed: true };

    const newQty = parseInt(
      updatedPayload.jumlahOkulasi !== undefined
        ? updatedPayload.jumlahOkulasi
        : (updatedPayload.totalOkulasi !== undefined ? updatedPayload.totalOkulasi : (updatedPayload.jumlahBatangOkulasi !== undefined ? updatedPayload.jumlahBatangOkulasi : -1)),
      10
    );

    if (isNaN(newQty) || newQty < 0) {
      return { allowed: true, isMetadataOnly: true };
    }

    const inspectionTxs = storage.get('inspection_transactions', []);
    let approvedInspectedQty = 0;
    let blockingInspDoc = null;

    inspectionTxs.forEach(ins => {
      if (!ins) return;
      const isRef = (ins.buddingDocNo && ins.buddingDocNo === docNo) ||
                    (ins.sourceBuddingDocNo && ins.sourceBuddingDocNo === docNo) ||
                    (ins.sourceDocNo && ins.sourceDocNo === docNo);
      const isApproved = String(ins.status || '').toUpperCase() === 'DISETUJUI' || String(ins.status || '').toUpperCase() === 'TERVERIFIKASI';
      if (isRef && isApproved) {
        const insQty = parseInt(ins.jumlahDiperiksa || ins.totalDiperiksa || ins.jumlahBatangDiperiksa || 0, 10);
        approvedInspectedQty += insQty;
        if (!blockingInspDoc) blockingInspDoc = ins.docNo || ins.id;
      }
    });

    if (approvedInspectedQty > 0 && newQty < approvedInspectedQty) {
      return {
        allowed: false,
        reason: `Kuantitas Okulasi baru (${newQty.toLocaleString('id-ID')}) lebih kecil dari jumlah batang yang telah disetujui pada Pemeriksaan Okulasi (${approvedInspectedQty.toLocaleString('id-ID')}).`,
        blockingDocNo: blockingInspDoc
      };
    }
  }

  return { allowed: true };
}


