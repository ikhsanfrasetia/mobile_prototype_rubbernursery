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
 * @returns {boolean} true jika telah digunakan oleh transaksi downstream
 */
export function isReceiptUsedAsReference(receiptTx, receiptIndex = -1) {
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

  // 1. Cek Seeding (seeding_transactions)
  const seedingTxs = storage.get('seeding_transactions', []);
  const usedInSeeding = seedingTxs.some(s => {
    if (!s) return false;
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
  const dederTxs = storage.get('dederan_transactions', []);
  const usedInDederan = dederTxs.some(d => {
    if (!d) return false;
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

  // 3. Cek Dokumen Induk Deder (dederan_induk_documents) yang AKTIF mengikat kuota (totalDidederSDHI > 0 atau child txs)
  const indukDocs = storage.get('dederan_induk_documents', []);
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
      const hasChildDeder = dederTxs.some(t => t.parentDederIndukDocNo === induk.docNo);
      if (hasChildDeder) return true;
    }
    return false;
  });
  if (activeInduk) return true;

  // 4. Cek Seleksi Pra-Okulasi (pre_grafting_selection_documents) yang direct referensi ke Penerimaan
  const selectionDocs = storage.get('pre_grafting_selection_documents', []);
  const usedInSelection = selectionDocs.some(d => {
    if (!d) return false;
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
 * @returns {{ locked: boolean, reason: 'VERIFICATION_LOCK' | 'REFERENTIAL_LOCK' | null }}
 */
export function isReceiptLocked(receiptTx, receiptIndex = -1) {
  if (isTransactionLockedForMantri(receiptTx)) {
    return {
      locked: true,
      reason: 'VERIFICATION_LOCK'
    };
  }

  if (isReceiptUsedAsReference(receiptTx, receiptIndex)) {
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
 * @param {string} docNo - Nomor dokumen yang akan dicek.
 * @returns {object|null} - Mengembalikan objek { docNo, moduleName, url } jika ada dependensi, atau null jika aman.
 */
export function findDownstreamDependency(docNo) {
  if (!docNo) return null;

  // 0. Cek Penyemaian yang mungkin menggunakan Penerimaan ini
  const seedingTxs = storage.get('seeding_transactions', []);
  const dependentSeeding = seedingTxs.find(d => 
    (d.sourceDocNo && d.sourceDocNo === docNo) || 
    (d.receiptDocNo && d.receiptDocNo === docNo) ||
    (d.sourceReceiptDocNo && d.sourceReceiptDocNo === docNo) ||
    (d.docNo && d.docNo === docNo) || 
    (d.nomorDokumen && d.nomorDokumen === docNo)
  );
  if (dependentSeeding) {
    return {
      docNo: dependentSeeding.docNo || 'Transaksi Penyemaian',
      moduleName: 'Penyemaian Benih',
      url: '/seeding'
    };
  }

  // 0b. Cek Dederan yang menggunakan Penerimaan ini
  const dederTxs = storage.get('dederan_transactions', []);
  const dependentDeder = dederTxs.find(d => 
    (d.sourceReceiptDocNo && d.sourceReceiptDocNo === docNo) || 
    (d.receiptDocNo && d.receiptDocNo === docNo) || 
    (d.sourceDocNo && d.sourceDocNo === docNo) ||
    (d.docNo && d.docNo === docNo)
  );
  if (dependentDeder) {
    return {
      docNo: dependentDeder.docNo || 'Transaksi Dederan',
      moduleName: 'Dederan (Germinasi)',
      url: '/dederan'
    };
  }

  // 0c. Cek Dokumen Induk Deder yang aktif
  const indukDocs = storage.get('dederan_induk_documents', []);
  const dependentInduk = indukDocs.find(induk => 
    ((induk.sourceReceiptDocNo && induk.sourceReceiptDocNo === docNo) || 
     (induk.receiptDocNo && induk.receiptDocNo === docNo) || 
     (induk.docNo && induk.docNo === docNo)) &&
    (parseInt(induk.totalDidederSDHI || 0, 10) > 0 || dederTxs.some(t => t.parentDederIndukDocNo === induk.docNo))
  );
  if (dependentInduk) {
    return {
      docNo: dependentInduk.docNo || 'Dokumen Induk Deder',
      moduleName: 'Dederan (Germinasi)',
      url: '/dederan'
    };
  }

  // 1. Cek Seleksi (I, II, III) yang mungkin menggunakan docNo ini (bisa dari Seeding, Penerimaan, atau Seleksi sebelumnya)
  const selectionDocs = storage.get('pre_grafting_selection_documents', []);
  const dependentSelection = selectionDocs.find(d => 
    d.sourceSeedingDocNo === docNo || 
    d.sourceDocNo === docNo || 
    d.seedingDocNo === docNo ||
    d.receiptDocNo === docNo ||
    d.sourceReceiptDocNo === docNo ||
    d.sourceSelection1DocNo === docNo ||
    d.sourceSelection2DocNo === docNo ||
    d.sourceSelectionDocNo === docNo
  );
  if (dependentSelection) {
    return {
      docNo: dependentSelection.docNo,
      moduleName: 'Penyeleksian (Pra-Okulasi)',
      url: '/selection'
    };
  }

  // 2. Cek Okulasi (Grafting) yang mungkin menggunakan Seleksi III
  const buddingTxs = storage.get('budding_transactions', []);
  const dependentBudding = buddingTxs.find(d => 
    d.sourceSelection3DocNo === docNo ||
    d.sourceSelectionDocNo === docNo
  );
  if (dependentBudding) {
    return {
      docNo: dependentBudding.docNo || 'Transaksi Okulasi',
      moduleName: 'Okulasi (Grafting)',
      url: '/budding'
    };
  }

  // 3. Cek Pemeriksaan yang mungkin menggunakan Okulasi
  const inspectionTxs = storage.get('inspection_transactions', []);
  const dependentInspection = inspectionTxs.find(d => 
    d.buddingDocNo === docNo ||
    d.sourceBuddingDocNo === docNo
  );
  if (dependentInspection) {
    return {
      docNo: dependentInspection.docNo || 'Transaksi Pemeriksaan',
      moduleName: 'Pemeriksaan Okulasi',
      url: '/inspection'
    };
  }

  // 4. Cek Seleksi Pasca-Okulasi / Regrafting (selection_pool)
  const pool = storage.get('selection_pool', []);
  const dependentPool = pool.find(d => 
    d.inspectionDocNo === docNo ||
    d.buddingDocNo === docNo
  );
  if (dependentPool) {
    return {
      docNo: dependentPool.docNo || 'Data Afkir',
      moduleName: 'Seleksi Pasca-Okulasi',
      url: '/selection' // as it has post-grafting tab
    };
  }

  return null;
}

/**
 * Menampilkan warning popup jika ada dependency, dan mengembalikan true jika di-block.
 * @param {string} docNo - Nomor dokumen
 * @param {string} moduleName - Nama modul (misal: "Penyemaian")
 * @param {string} action - "Diubah" atau "Dihapus"
 * @returns {boolean} - true jika BLOCKED, false jika AMAN
 */
export function guardDependency(docNo, moduleName, action = 'Diubah') {
  const dependency = findDownstreamDependency(docNo);
  
  if (dependency) {
    const modalBody = `
      <div style="text-align: center; color: #333;">
        <p style="margin-bottom: 12px;">Transaksi <strong>${moduleName}</strong> ini sudah digunakan oleh Dokumen hilir.</p>
        <div style="background: #FFF3E0; border: 1px solid #FFE0B2; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 0.8rem; color: #E65100; margin-bottom: 4px;">DOKUMEN TERKAIT:</div>
          <div style="font-weight: bold; color: #E65100; font-size: 1.1rem;">${dependency.docNo}</div>
          <div style="font-size: 0.85rem; color: #E65100; margin-top: 4px;">(${dependency.moduleName})</div>
        </div>
        <p style="font-size: 0.85rem; color: #666; margin-bottom: 20px;">
          Silakan koreksi atau hapus dokumen terkait terlebih dahulu.
        </p>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button id="btn-dep-close" style="padding: 10px 16px; border-radius: 6px; border: 1px solid #CCC; background: #FFF; cursor: pointer; flex: 1;">Tutup</button>
          <button id="btn-dep-nav" style="padding: 10px 16px; border-radius: 6px; border: none; background: #E53935; color: #FFF; font-weight: bold; cursor: pointer; flex: 1;">Buka Dokumen</button>
        </div>
      </div>
    `;

    openModal({
      title: `Data Tidak Dapat ${action}`,
      body: modalBody
    });

    setTimeout(() => {
      document.getElementById('btn-dep-close')?.addEventListener('click', closeModal);
      document.getElementById('btn-dep-nav')?.addEventListener('click', () => {
        closeModal();
        if (dependency.url) {
          navigate(dependency.url);
        }
      });
    }, 50);

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

    if (approvedPindahSemaiQty > 0 && newQty < approvedPindahSemaiQty) {
      return {
        allowed: false,
        reason: `Kuantitas baru (${newQty.toLocaleString('id-ID')}) lebih kecil dari kuantitas yang telah disetujui pada Pindah Semai (${approvedPindahSemaiQty.toLocaleString('id-ID')}).`,
        blockingDocNo: blockingSeedingDoc
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

  return { allowed: true };
}


