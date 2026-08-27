import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderReceiptSummary() {
  const app = document.getElementById('app');
  
  const txs = storage.get('receipt_transactions', []);
  const viewingIdx = storage.get('viewing_transaction_index', 0);
  const summaryData = txs[viewingIdx] || {};
  
  // Format No. Dokumen
  const docIdxStr = (parseInt(viewingIdx) + 1).toString().padStart(2, '0');
  const noDoc = `RCV/SEEDS/2026/AGUS/${docIdxStr}`;
  
  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: sans-serif;">
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">Detail Penerimaan</h1>
      </header>

      <!-- CONTENT -->
      <main style="flex: 1; padding: 16px; overflow-y: auto;">
        <div style="background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">No. Dokumen</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${noDoc}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Tanggal Penerimaan</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.tanggal || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Jenis Penerimaan</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.jenis || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Tahapan Pertumbuhan</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.tahapan || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Program Pembibitan</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.program || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Tipe Asal</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.tipeAsal || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Asal Benih / Rekanan</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.sumber || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">No Issue / SIR</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.sir || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Jumlah Total Diterima</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.qty || '-'}</div>
          </div>
          <div style="border-bottom: 1px solid #EFEFEF; padding-bottom: 12px; margin-bottom: 12px; display: ${summaryData.rawState && summaryData.rawState.batchCode ? 'block' : 'none'};">
            <div style="font-size: 0.85rem; color: #666666;">Scan QR Batch / Pilih Manual</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${(summaryData.rawState && summaryData.rawState.batchCode) || '-'}</div>
          </div>
        </div>

        ${summaryData.rawState && summaryData.rawState.tableRows && summaryData.rawState.tableRows.length > 0 && (summaryData.rawState.originTypeRaw === 'KEBUN_SENDIRI' || summaryData.rawState.originTypeRaw === 'LAINNYA') ? `
        <h2 style="font-size: 1rem; font-weight: 700; color: #111111; margin: 24px 0 12px 0;">Detail Item</h2>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${summaryData.rawState.tableRows.map((row, idx) => `
            <div style="background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <div style="font-weight: 700; font-size: 0.95rem; color: #111111; margin-bottom: 8px;">Item ${idx + 1}</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 0.85rem; color: #666666;">Klon:</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: #111111;">${row.klon || '-'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 0.85rem; color: #666666;">Banyaknya:</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: #111111;">${row.qty || '0'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 0.85rem; color: #666666;">Diseleksi:</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: #D32F2F;">${row.rejected || '0'}</span>
              </div>
              ${parseInt(row.rejected || 0) > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 0.85rem; color: #666666;">Alasan:</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: #111111;">${row.reason || '-'}</span>
              </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${summaryData.rawState && summaryData.rawState.photos && summaryData.rawState.photos.length > 0 ? `
        <h2 style="font-size: 1rem; font-weight: 700; color: #111111; margin: 24px 0 12px 0;">Foto Lampiran</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${summaryData.rawState.photos.map(p => `
            <div style="width: 80px; height: 80px; border-radius: 6px; border: 1px solid #D9D9D9; overflow: hidden;">
              <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          `).join('')}
        </div>
        ` : ''}
      </main>
    </div>
  `;

  app.querySelector('#btn-back').addEventListener('click', () => {
    const backUrl = storage.get('summary_back_url', '/reception');
    storage.remove('summary_back_url'); // clear it so we don't accidentally use it later
    navigate(backUrl);
  });
}
