/**
 * modules/receipt/receipt-placeholder.js
 * Halaman placeholder untuk menu Penerimaan Bibit & Penerimaan Mata Entres
 */

import { navigate } from '../../core/router.js';

export function renderReceiptPlaceholder() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="page receipt-placeholder-page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header class="receipt-header" style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back-placeholder" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.15rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Penerimaan</h1>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        
        <!-- ICON BADGE -->
        <div style="width: 80px; height: 80px; background: #E8F5E9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(17, 104, 52, 0.08);">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="#116834" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>

        <!-- MAIN PLACEHOLDER TEXT (EXACT REQUIREMENT) -->
        <h2 style="font-size: 1.15rem; font-weight: 700; color: #111827; text-align: center; margin: 0 0 10px 0; max-width: 320px; line-height: 1.45;">
          Ringkasan Data Penerimaan Mata Entres Belum Tersedia
        </h2>

        <p style="font-size: 0.90rem; color: #6B7280; text-align: center; margin: 0; max-width: 290px; line-height: 1.5;">
          Fitur pencatatan dan ringkasan data untuk alur ini belum tersedia pada sistem.
        </p>

      </main>
    </div>
  `;

  // Event Listener: Back to Reception Landing
  const btnBack = app.querySelector('#btn-back-placeholder');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      navigate('/reception');
    });
  }
}
