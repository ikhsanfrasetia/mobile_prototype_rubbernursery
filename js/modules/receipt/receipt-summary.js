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
            <div style="font-size: 0.85rem; color: #666666;">Jumlah</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.qty || '-'}</div>
          </div>
          <div style="padding-bottom: 12px;">
            <div style="font-size: 0.85rem; color: #666666;">Klon</div>
            <div style="font-size: 1rem; font-weight: 700; color: #111111;">${summaryData.klon || '-'}</div>
          </div>
        </div>
      </main>
    </div>
  `;

  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/reception');
  });
}
