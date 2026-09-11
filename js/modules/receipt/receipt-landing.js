import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { formatStandardDocNo } from '../../core/utils.js';

export function renderReceiptLanding() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page receipt-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <!-- HEADER -->
      <header class="receipt-header" style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.15rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Penerimaan</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-right: -4px;">
          <button id="btn-sync" type="button" aria-label="Refresh" style="padding: 6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg id="sync-icon-svg" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.4s ease;">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          <button id="btn-calendar" type="button" aria-label="Filter Kalender" style="padding: 6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <main style="flex: 1; padding: 16px; overflow-y: auto;">
        
        <!-- 2 TOP ACTION TILES -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
          
          <!-- Card Benih / Biji Kelatak -->
          <button id="btn-biji" type="button" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 22px 10px 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.03); transition: transform 0.15s, box-shadow 0.15s; outline: none;">
            <div style="width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="#116834" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <!-- Benih / Kelatak seeds outline -->
                <ellipse cx="19" cy="19" rx="8.5" ry="5.5" transform="rotate(-30 19 19)"></ellipse>
                <path d="M15 15c2 2 4 5 5 8"></path>
                <ellipse cx="32" cy="28" rx="7.5" ry="5" transform="rotate(40 32 28)"></ellipse>
                <path d="M29 26c2 2 4 4 5 5"></path>
                <ellipse cx="16" cy="31" rx="6.5" ry="4.5" transform="rotate(15 16 31)"></ellipse>
                <path d="M13 30c2 1 3 2 5 3"></path>
              </svg>
            </div>
            <div style="font-weight: 700; font-size: 0.88rem; color: #116834; text-align: center; line-height: 1.3;">
              Penerimaan<br>Benih / Biji Kelatak
            </div>
          </button>

          <!-- Card Penerimaan Bibit -->
          <button id="btn-bibit" type="button" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 22px 10px 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.03); transition: transform 0.15s, box-shadow 0.15s; outline: none;">
            <div style="width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="#116834" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <!-- Soil / Ground mound -->
                <path d="M11 38c3.5-3 8.5-4 13-4s9.5 1 13 4"></path>
                <!-- Central Stem -->
                <path d="M24 34V20"></path>
                <!-- Left leaf -->
                <path d="M24 26c-5.5 0-10-4.5-10-9 4.5 0 9 4.5 10 9z"></path>
                <!-- Right leaf -->
                <path d="M24 22c5.5 0 10-4.5 10-9-4.5 0-9 4.5-10 9z"></path>
              </svg>
            </div>
            <div style="font-weight: 700; font-size: 0.88rem; color: #116834; text-align: center; line-height: 1.3;">
              Penerimaan Bibit
            </div>
          </button>

        </div>

        <!-- TRANSACTION SUMMARY LIST -->
        ${(() => {
          const txs = storage.get('receipt_transactions', []);
          const seedingTxs = storage.get('seeding_transactions', []);
          if (txs.length === 0) return '';

          return `
            <h2 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 12px 0;">Ringkasan Penerimaan (${txs.length})</h2>
            ${txs.map((tx, idx) => {
              const hasSeeding = seedingTxs.some(s => s.sourceIndex == idx || s.receiptDocNo == tx.docNo);
              const docNo = tx.docNo || tx.nomorDokumen || formatStandardDocNo(2026, 'APR', idx + 1);

              return `
              <div style="background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 8px; padding: 16px; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <div style="font-weight: 700; font-size: 0.95rem; color: #111111;">${docNo}</div>
                    ${hasSeeding ? `
                      <span style="font-size: 0.68rem; font-weight: 700; background: #E8F5E9; color: #116834; border: 1px solid #C8E6C9; padding: 2px 6px; border-radius: 12px; display: inline-flex; align-items: center; gap: 3px;">
                        <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Sudah Disemai
                      </span>
                    ` : ''}
                  </div>
                  <div style="position: relative;">
                    <button class="btn-card-menu" data-index="${idx}" type="button" aria-label="Menu" style="background: transparent; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; color: #116834;">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <circle cx="12" cy="5" r="2"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                        <circle cx="12" cy="19" r="2"></circle>
                      </svg>
                    </button>
                    <!-- CARD POPOVER -->
                    <div class="card-popover" id="popover-${idx}" style="display: none; position: absolute; right: 0; top: 100%; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; flex-direction: column; width: 140px;">
                      <button class="btn-popover-lihat" data-index="${idx}" type="button" style="padding: 10px 16px; border: none; background: transparent; text-align: left; font-size: 0.9rem; color: #111111; cursor: pointer; border-bottom: 1px solid #F0F0F0;">
                        Lihat Data
                      </button>
                      <button class="btn-popover-edit" data-index="${idx}" type="button" style="padding: 10px 16px; border: none; background: transparent; text-align: left; font-size: 0.9rem; color: #111111; cursor: pointer; border-bottom: 1px solid #F0F0F0;">
                        Edit
                      </button>
                      <button class="btn-popover-hapus" data-index="${idx}" type="button" style="padding: 10px 16px; border: none; background: transparent; text-align: left; font-size: 0.9rem; color: #D32F2F; cursor: pointer;">
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.program || 'PRG/NUR/TB/01/2026'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.tahapan || 'Rubber Main Nursery'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.klon || 'GT1'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.tipeAsal || tx.sumber || 'Pihak Ke-III'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 12px;">${tx.sumber || tx.rekanan || 'UD Ganang Jaya'}</div>
                <div style="font-size: 0.75rem; color: #999999; text-align: right;">Diterima pada ${tx.tanggal || tx.date || '11/09/2026'}</div>
              </div>
              `;
            }).join('')}
          `;
        })()}
      </main>

      <!-- BOTTOM SHEET OVERLAY -->
      <div id="origin-type-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 30;"></div>
      
      <!-- BOTTOM SHEET -->
      <div id="origin-type-sheet" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 14px 14px 0 0; padding: 24px 16px; z-index: 31; flex-direction: column; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);">
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
          <button id="btn-sheet-kembali" type="button" style="flex: 1; height: 48px; background: #FFFFFF; color: #116834; border: 1px solid #116834; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            Kembali
          </button>
          <button id="btn-sheet-lanjut" type="button" disabled style="flex: 1; height: 48px; background: #B0B0B0; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; cursor: pointer;">
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

  const btnSync = app.querySelector('#btn-sync');
  if (btnSync) {
    let rotation = 0;
    btnSync.addEventListener('click', () => {
      rotation += 360;
      const iconSvg = app.querySelector('#sync-icon-svg');
      if (iconSvg) {
        iconSvg.style.transform = `rotate(${rotation}deg)`;
      }
      setTimeout(() => {
        renderReceiptLanding();
      }, 300);
    });
  }

  // Bottom Sheet Elements
  const overlay = app.querySelector('#origin-type-overlay');
  const sheet = app.querySelector('#origin-type-sheet');
  const btnKembali = app.querySelector('#btn-sheet-kembali');
  const btnLanjut = app.querySelector('#btn-sheet-lanjut');
  const radios = app.querySelectorAll('input[name="origin_type"]');
  let selectedOriginType = null;
  let selectedJenis = null;

  app.querySelector('#btn-biji').addEventListener('click', () => {
    selectedJenis = 'Benih / Biji Kelatak';
    selectedOriginType = null;
    radios.forEach(r => r.checked = false);
    btnLanjut.disabled = true;
    btnLanjut.style.background = '#B0B0B0';

    overlay.style.display = 'block';
    sheet.style.display = 'flex';
  });

  app.querySelector('#btn-bibit').addEventListener('click', () => {
    selectedJenis = 'Bibit / Tanaman Muda';
    selectedOriginType = null;
    radios.forEach(r => r.checked = false);
    btnLanjut.disabled = true;
    btnLanjut.style.background = '#B0B0B0';

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
    overlay.style.display = 'none';
    sheet.style.display = 'none';
  });

  btnLanjut.addEventListener('click', () => {
    if (!selectedOriginType) return;

    storage.set('transaction_originType', selectedOriginType);
    storage.set('benih_jenis', selectedJenis);
    storage.set('benih_tahapan', 'Rubber Main Nursery');

    // Clean previous editing session
    storage.remove('editing_transaction_index');

    overlay.style.display = 'none';
    sheet.style.display = 'none';

    navigate('/reception/benih');
  });

  // Popover Actions
  const btnCardMenus = app.querySelectorAll('.btn-card-menu');
  const cardPopovers = app.querySelectorAll('.card-popover');
  
  if (btnCardMenus.length > 0) {
    btnCardMenus.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = e.currentTarget.dataset.index;
        const popover = app.querySelector(`#popover-${idx}`);
        cardPopovers.forEach(p => p.style.display = 'none');
        popover.style.display = 'flex';
      });
    });

    document.addEventListener('click', () => {
      cardPopovers.forEach(p => p.style.display = 'none');
    });

    app.querySelectorAll('.btn-popover-lihat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        storage.set('viewing_transaction_index', idx);
        navigate('/reception/summary');
      });
    });

    app.querySelectorAll('.btn-popover-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        const txs = storage.get('receipt_transactions', []);
        const tx = txs[idx];
        
        if (tx && tx.rawState) {
          storage.set('transaction_originType', tx.rawState.originTypeRaw);
          storage.set('benih_jenis', tx.rawState.jenisPenerimaan);
          storage.set('benih_tahapan', tx.rawState.tahapanPertumbuhan);
          storage.set('benih_program_id', tx.rawState.programNurseryId);
          storage.set('benih_program_code', tx.rawState.programNurseryCode);
          storage.set('benih_source_id', tx.rawState.sourceId);
          storage.set('benih_source_name', tx.rawState.sourceName);
          storage.set('receipt_photos', tx.rawState.photos);
          storage.set('benih_table_rows', tx.rawState.tableRows);
          storage.set('selected_sir', tx.rawState.selectedSir);
          storage.set('selected_klon', tx.rawState.selectedKlon);
          
          storage.set('editing_transaction_index', idx);
        } else {
          storage.set('transaction_originType', 'KEBUN_SENDIRI');
        }
        
        navigate('/reception/benih');
      });
    });

    app.querySelectorAll('.btn-popover-hapus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        const txs = storage.get('receipt_transactions', []);
        txs.splice(idx, 1);
        storage.set('receipt_transactions', txs);
        renderReceiptLanding();
      });
    });
  }
}
