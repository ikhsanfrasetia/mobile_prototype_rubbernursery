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

      <!-- CONTENT -->
      <main class="receipt-content" style="flex: 1; display: flex; flex-direction: column; padding: 24px 16px; min-height: 0; overflow-y: auto; background: #F5F5F5;">
        ${(() => {
          const txs = storage.get('receipt_transactions', []);
          const seedingTxs = storage.get('seeding_transactions', []);
          if (txs.length === 0) {
            return `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
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
              </div>
            `;
          }

          return `
            <h2 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 12px 0;">Ringkasan Penerimaan (${txs.length})</h2>
            ${txs.map((tx, idx) => {
              const hasSeeding = seedingTxs.some(s => s.sourceIndex == idx);
              const docNo = `RCV/SEEDS/2026/AGUS/0${idx + 1}`;

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
                    <button class="btn-card-menu" data-index="${idx}" style="background: none; border: none; padding: 4px; margin-right: -4px; cursor: pointer; color: #116834;">
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    <div class="card-popover" id="popover-${idx}" style="display: none; position: absolute; top: 24px; right: 0; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); width: 140px; z-index: 20; flex-direction: column; overflow: hidden;">
                      <button class="btn-popover-lihat" data-index="${idx}" style="padding: 10px 14px; text-align: left; background: #FFFFFF; border: none; border-bottom: 1px solid #EFEFEF; font-size: 0.85rem; font-weight: 600; color: #116834; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Lihat
                      </button>
                      ${hasSeeding ? `
                        <button class="btn-popover-locked" data-index="${idx}" data-doc="${docNo}" style="padding: 10px 14px; text-align: left; background: #FAFAFA; border: none; border-bottom: 1px solid #EFEFEF; font-size: 0.82rem; color: #9CA3AF; cursor: not-allowed; display: flex; align-items: center; gap: 6px;" title="Dokumen tidak dapat diubah karena telah diproses penyemaian">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          Edit (Terkunci)
                        </button>
                        <button class="btn-popover-locked" data-index="${idx}" data-doc="${docNo}" style="padding: 10px 14px; text-align: left; background: #FAFAFA; border: none; font-size: 0.82rem; color: #9CA3AF; cursor: not-allowed; display: flex; align-items: center; gap: 6px;" title="Dokumen tidak dapat dihapus karena telah diproses penyemaian">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          Hapus (Terkunci)
                        </button>
                      ` : `
                        <button class="btn-popover-edit" data-index="${idx}" style="padding: 10px 14px; text-align: left; background: #FFFFFF; border: none; border-bottom: 1px solid #EFEFEF; font-size: 0.85rem; font-weight: 500; color: #111111; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Edit
                        </button>
                        <button class="btn-popover-hapus" data-index="${idx}" style="padding: 10px 14px; text-align: left; background: #FFFFFF; border: none; font-size: 0.85rem; font-weight: 500; color: #D32F2F; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          Hapus
                        </button>
                      `}
                    </div>
                  </div>
                </div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.program || 'PRG/NUR/TB/01/2026'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.tahapan || 'Rubber Main Nursery'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.klon || 'Klon GT-01'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 4px;">${tx.tipeAsal || '-'}</div>
                <div style="font-size: 0.85rem; color: #666666; margin-bottom: 12px;">${tx.sumber || '-'}</div>
                <div style="font-size: 0.75rem; color: #999999; text-align: right;">Diterima pada ${tx.tanggal || 'Rabu, 26 Agustus 2026'}</div>
              </div>
              `;
            }).join('')}
          `;
        })()}
      </main>

      <!-- BOTTOM ACTION -->
      <footer class="receipt-footer" style="padding: 16px; background: #FFFFFF; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
        <button id="btn-biji" type="button" style="width: 100%; height: 48px; background: #116834; color: #FFFFFF; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: flex-start; padding: 0 16px;">
          Penerimaan Benih / Biji Kelatak
        </button>
        <button id="btn-bibit" type="button" style="width: 100%; height: 48px; background: #116834; color: #FFFFFF; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: flex-start; padding: 0 16px;">
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
  let selectedJenis = null;

  app.querySelector('#btn-biji').addEventListener('click', () => {
    selectedJenis = 'Benih / Biji Kelatak';
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
    
    // Prepare fresh form state for new transaction
    storage.set('benih_jenis', selectedJenis);
    storage.set('benih_tahapan', 'Rubber Main Nursery');
    
    // Optionally clear other state here to guarantee a fresh form, but since the user might back and forth, we keep it simple

    // Hide sheet
    overlay.style.display = 'none';
    sheet.style.display = 'none';

    // Navigate to form route
    navigate('/reception/benih');
  });

  app.querySelector('#btn-bibit').addEventListener('click', () => {
    selectedJenis = 'Bibit / Tanaman Muda';
    // Reset state
    selectedOriginType = null;
    radios.forEach(r => r.checked = false);
    btnLanjut.disabled = true;
    btnLanjut.style.background = '#B0B0B0';

    // Show sheet
    overlay.style.display = 'block';
    sheet.style.display = 'flex';
  });

  // Popover Actions
  const btnCardMenus = app.querySelectorAll('.btn-card-menu');
  const cardPopovers = app.querySelectorAll('.card-popover');
  
  if (btnCardMenus.length > 0) {
    btnCardMenus.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent document click from closing it immediately
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
          // Restore form state
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
          storage.set('benih_batch_code', tx.rawState.batchCode);
          
          storage.set('editing_transaction_index', idx);
        } else {
          storage.set('transaction_originType', 'KEBUN_SENDIRI');
        }
        
        navigate('/reception/benih');
      });
    });

    app.querySelectorAll('.btn-popover-locked').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const docNo = e.currentTarget.dataset.doc || 'Dokumen ini';
        cardPopovers.forEach(p => p.style.display = 'none');
        
        // Show floating warning toast
        const toast = document.createElement('div');
        toast.style.cssText = 'position: absolute; top: 16px; left: 16px; right: 16px; background: #C62828; color: #FFFFFF; padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px; animation: slideDown 0.25s ease-out;';
        toast.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span style="line-height: 1.3;">${docNo} tidak dapat diubah/dihapus karena telah diproses pada tahap Penyemaian.</span>
        `;
        app.querySelector('.page').appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
      });
    });

    app.querySelectorAll('.btn-popover-hapus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        const txs = storage.get('receipt_transactions', []);
        txs.splice(idx, 1);
        storage.set('receipt_transactions', txs);
        // Refresh page to show updated list
        renderReceiptLanding();
      });
    });
  }
}
