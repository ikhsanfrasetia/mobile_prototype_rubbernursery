import { storage } from './storage.js';
import { openModal, closeModal } from '../components/modal.js';
import { navigate } from './router.js';

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
    d.sourceDocNo === docNo || 
    d.docNo === docNo || 
    (d.nomorDokumen && d.nomorDokumen === docNo)
  );
  if (dependentSeeding) {
    return {
      docNo: dependentSeeding.docNo || 'Transaksi Penyemaian',
      moduleName: 'Penyemaian Benih',
      url: '/seeding'
    };
  }

  // 1. Cek Seleksi (I, II, III) yang mungkin menggunakan docNo ini (bisa dari Seeding atau Seleksi sebelumnya)
  const selectionDocs = storage.get('pre_grafting_selection_documents', []);
  const dependentSelection = selectionDocs.find(d => 
    d.sourceSeedingDocNo === docNo || 
    d.sourceDocNo === docNo || 
    d.seedingDocNo === docNo ||
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
