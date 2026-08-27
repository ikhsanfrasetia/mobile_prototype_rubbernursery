import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderReceiptLanding() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page receipt-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF;">
      <!-- HEADER -->
      <header class="receipt-header" style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#111111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.1rem; font-weight: 600; color: #111111; flex: 1; margin: 0 16px;">Penerimaan</h1>
        <button id="btn-history" type="button" aria-label="Riwayat" style="padding: 8px; margin-right: -8px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#999999" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
      </header>

      <!-- CONTENT (EMPTY STATE) -->
      <main class="receipt-content" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; min-height: 0;">
        <div style="margin-bottom: 16px;">
          <svg viewBox="0 0 24 24" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill="#111111"/>
            <path d="M16 13H13V16H11V13H8V11H11V8H13V11H16V13Z" fill="#FFFFFF"/>
          </svg>
        </div>
        <h2 style="font-size: 1.1rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 8px 0; line-height: 1.4;">
          Belum ada Dokumen<br>Penerimaan Benih/Bibit hari ini
        </h2>
        <p style="font-size: 0.95rem; color: #999999; text-align: center; margin: 0; line-height: 1.4;">
          Pilih Jenis Penerimaan<br>untuk memulai rekam data
        </p>
      </main>

      <!-- BOTTOM ACTION -->
      <footer class="receipt-footer" style="padding: 16px; background: #FFFFFF; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
        <button id="btn-biji" type="button" style="width: 100%; height: 48px; background: #116834; color: #FFFFFF; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center;">
          Penerimaan Benih / Biji Kelatak
        </button>
        <button id="btn-bibit" type="button" style="width: 100%; height: 48px; background: #116834; color: #FFFFFF; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center;">
          Penerimaan Bibit
        </button>
      </footer>

      <!-- BOTTOM SHEET OVERLAY -->
      <div id="origin-type-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 10;"></div>
      
      <!-- BOTTOM SHEET -->
      <div id="origin-type-sheet" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 6px 6px 0 0; padding: 24px 16px; z-index: 11; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Tentukan Tipe Asal Penerimaan</h3>
        
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
          <label style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #116834; border-radius: 6px; padding: 12px 16px; background: #FFFFFF; cursor: pointer;">
            <span style="font-size: 0.95rem; color: #111111; font-weight: 600;">Kebun Sendiri</span>
            <input type="radio" name="origin_type" value="KEBUN_SENDIRI" style="accent-color: #116834; width: 18px; height: 18px; margin: 0;">
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #116834; border-radius: 6px; padding: 12px 16px; background: #FFFFFF; cursor: pointer;">
            <span style="font-size: 0.95rem; color: #111111; font-weight: 600;">Pihak Ke-III</span>
            <input type="radio" name="origin_type" value="PIHAK_KE_III" style="accent-color: #116834; width: 18px; height: 18px; margin: 0;">
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #116834; border-radius: 6px; padding: 12px 16px; background: #FFFFFF; cursor: pointer;">
            <span style="font-size: 0.95rem; color: #111111; font-weight: 600;">Lainya</span>
            <input type="radio" name="origin_type" value="LAINNYA" style="accent-color: #116834; width: 18px; height: 18px; margin: 0;">
          </label>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button id="btn-sheet-kembali" type="button" style="flex: 1; height: 48px; background: #FFFFFF; color: #116834; border: 1px solid #116834; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center;">
            Kembali
          </button>
          <button id="btn-sheet-lanjut" type="button" disabled style="flex: 1; height: 48px; background: #B0B0B0; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center;">
            Lanjut
          </button>
        </div>
      </div>
    </div>
  `;

  // Event Listeners
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/home');
  });

  // Bottom Sheet Elements
  const overlay = app.querySelector('#origin-type-overlay');
  const sheet = app.querySelector('#origin-type-sheet');
  const btnKembali = app.querySelector('#btn-sheet-kembali');
  const btnLanjut = app.querySelector('#btn-sheet-lanjut');
  const radios = app.querySelectorAll('input[name="origin_type"]');
  let selectedOriginType = null;

  app.querySelector('#btn-biji').addEventListener('click', () => {
    // Reset state
    selectedOriginType = null;
    radios.forEach(r => r.checked = false);
    btnLanjut.disabled = true;
    btnLanjut.style.background = '#B0B0B0';

    // Show sheet
    overlay.style.display = 'block';
    sheet.style.display = 'flex';
  });

  radios.forEach(r => {
    r.addEventListener('change', (e) => {
      selectedOriginType = e.target.value;
      btnLanjut.disabled = false;
      btnLanjut.style.background = '#116834';
    });
  });

  btnKembali.addEventListener('click', () => {
    // Hide sheet
    overlay.style.display = 'none';
    sheet.style.display = 'none';
  });

  btnLanjut.addEventListener('click', () => {
    if (!selectedOriginType) return;

    // Save originType to state
    storage.set('transaction_originType', selectedOriginType);

    // Hide sheet
    overlay.style.display = 'none';
    sheet.style.display = 'none';

    // Navigate to form route
    navigate('/reception/benih');
  });

  app.querySelector('#btn-bibit').addEventListener('click', () => {
    console.log('Lanjut ke flow Penerimaan Bibit');
  });
}
