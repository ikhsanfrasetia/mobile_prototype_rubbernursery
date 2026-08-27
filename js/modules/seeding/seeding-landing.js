import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderSeedingLanding() {
  const app = document.getElementById('app');

  // Load transactions
  const txs = storage.get('receipt_transactions', []);
  // Filter for Benih and keep original index
  const benihTxs = txs
    .map((tx, originalIndex) => ({ ...tx, originalIndex }))
    .filter(tx => tx.jenis === 'Benih / Biji Kelatak');
  
  // Seeding transactions
  const seedingTxs = storage.get('seeding_transactions', []);

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">Penyemaian</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button type="button" style="background: none; border: none; cursor: pointer; padding: 4px;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          <button type="button" style="background: none; border: none; cursor: pointer; padding: 4px;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#999999" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        </div>
      </header>

      <main style="flex: 1; overflow-y: auto;">
        
        <!-- PENDING SEEDING CARDS -->
        <div style="padding: 12px 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9;">
          ${benihTxs.length > 0 ? benihTxs.map((tx, idx) => {
            const docIdxStr = (idx + 1).toString().padStart(2, '0');
            const docNo = `RCV/SEEDS/2026/AGUS/${docIdxStr}`;
            
            // Accumulate values
            let ttlDisemaiSDHI = 0;
            let ttlPolybagSDHI = 0;
            let ttlDitolakSDHI = 0;
            const relatedTxs = seedingTxs.filter(s => s.sourceIndex == tx.originalIndex);
            relatedTxs.forEach(r => {
              ttlDisemaiSDHI += parseInt(r.totalDisemai || 0);
              ttlPolybagSDHI += parseInt(r.totalPolybag || 0);
              ttlDitolakSDHI += parseInt(r.ditolak || 0);
            });
            const qty = parseInt(tx.qty || 0);
            const bibitTersedia = qty - ttlDisemaiSDHI - ttlDitolakSDHI;

            // Determine status text and color
            let statusText = 'Belum Disemai';
            let statusColor = '#999999'; // grey

            if (ttlDisemaiSDHI === 0 && ttlPolybagSDHI === 0 && ttlDitolakSDHI === 0) {
              statusText = 'Belum Disemai';
              statusColor = '#999999';
            } else if (bibitTersedia <= 0) {
              statusText = 'Selesai Disemai';
              statusColor = '#116834'; // green
            } else {
              statusText = 'Semai Belum Selesai';
              statusColor = '#F57F17'; // orange
            }

            // Top badge logic
            let topBadgeText = bibitTersedia <= 0 ? 'Selesai Disemai' : 'Perlu Disemai';
            let topBadgeBg = bibitTersedia <= 0 ? '#E8F5E9' : '#E53935';
            let topBadgeColor = bibitTersedia <= 0 ? '#116834' : '#FFFFFF';
            let topBadgeBorder = bibitTersedia <= 0 ? '1px solid #116834' : 'none';

            return `
            <div style="border: 1px solid #D9D9D9; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #FFFFFF;">
              
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div class="btn-seeding-form" data-index="${tx.originalIndex}" data-status="${statusText}" style="font-weight: 700; font-size: 0.95rem; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">${docNo}</div>
                  <div style="font-size: 0.8rem; color: #999999; margin-top: 4px;">Penerimaan, ${tx.tanggal || '28/08/2026'}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                  <span style="background: ${topBadgeBg}; color: ${topBadgeColor}; font-size: 0.7rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; white-space: nowrap; border: ${topBadgeBorder};">${topBadgeText}</span>
                  <svg class="btn-seeding-form" data-index="${tx.originalIndex}" data-status="${statusText}" viewBox="0 0 24 24" width="18" height="18" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer;">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
              
              <hr style="border: none; border-top: 1px solid #EFEFEF; margin: 12px 0;" />
              
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; gap: 8px;">
                <span style="font-weight: 700; font-size: 0.95rem; color: #111111; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tx.program || 'PRG/NUR/01/2026'}</span>
                <span class="btn-lihat-penerimaan" data-index="${tx.originalIndex}" style="font-size: 0.8rem; color: #4A90E2; cursor: pointer; flex-shrink: 0; text-decoration: none;">Lihat Penerimaan</span>
              </div>
              
              <div class="card-details-content" style="display: none; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Tahapan Pertumbuhan</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${tx.tahapan || 'Rubber Main Nursery'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Ttl Penerimaan</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${qty}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Ttl Disemai SDHI</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${ttlDisemaiSDHI}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Ttl Polybag SDHI</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${ttlPolybagSDHI}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Banyaknya Ditolak SDHI</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${ttlDitolakSDHI}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Bibit Tersedia</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${qty}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Ttl Bibit Belum Diseleksi</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${Math.max(0, bibitTersedia)}</span>
                </div>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <div class="btn-expand-card" style="font-size: 0.8rem; color: #116834; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <span class="expand-text">Tampilkan Detail</span>
                  <svg class="expand-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <div style="text-align: right; font-weight: 700; font-size: 0.8rem; color: ${statusColor};">
                  ${statusText}
                </div>
              </div>
            </div>
            `;
          }).join('') : `
            <div style="text-align: center; color: #999999; font-size: 0.9rem; padding: 12px 0;">Tidak ada dokumen penerimaan benih yang perlu disemai.</div>
          `}
        </div>

        <!-- RINGKASAN PENYEMAIAN -->
        <div style="padding: 24px 16px;">
          <h2 style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 24px 0;">Ringkasan Penyemaian (${seedingTxs.length})</h2>
          
          ${seedingTxs.length > 0 ? seedingTxs.map((tx, idx) => `
            <div style="border: 1px solid #D9D9D9; border-radius: 6px; padding: 12px; margin-bottom: 12px; background: #FFFFFF; position: relative;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.95rem; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tx.docNo || 'DOC-UNAVAILABLE'}</div>
                  <div style="font-size: 0.8rem; color: #999999; margin-top: 4px;">Penyemaian, ${tx.date || '28/08/2026'}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0; position: relative;">
                  <span style="background: #E8F5E9; color: #116834; font-size: 0.7rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; white-space: nowrap; border: 1px solid #116834;">Telah Disemai</span>
                  <button class="btn-card-menu-seeding" data-index="${idx}" style="background: none; border: none; padding: 4px; margin-right: -4px; cursor: pointer; color: #111;">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                  <div class="card-popover-seeding" id="popover-seeding-${idx}" style="display: none; position: absolute; top: 28px; right: 0; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 120px; z-index: 20; flex-direction: column; overflow: hidden;">
                    <button class="btn-popover-seeding-edit" data-index="${idx}" style="padding: 12px 16px; text-align: left; background: #FFFFFF; border: none; border-bottom: 1px solid #D9D9D9; font-size: 0.9rem; color: #111111; cursor: pointer;">Edit</button>
                    <button class="btn-popover-seeding-hapus" data-index="${idx}" style="padding: 12px 16px; text-align: left; background: #FFFFFF; border: none; font-size: 0.9rem; color: #D32F2F; cursor: pointer;">Hapus</button>
                  </div>
                </div>
              </div>
              
              <hr style="border: none; border-top: 1px solid #EFEFEF; margin: 12px 0;" />
              
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; gap: 8px;">
                <span style="font-weight: 700; font-size: 0.95rem; color: #111111; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tx.program || 'PRG/NUR/01/2026'}</span>
              </div>
              
              <div class="card-details-content" style="display: none; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Tahapan Pertumbuhan</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${tx.tahapan || 'Rubber Main Nursery'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Ttl Penerimaan</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${tx.totalPenerimaan || '0'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Ttl Disemai HI</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${tx.totalDisemai || '0'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Ttl Polybag HI</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${tx.totalPolybag || '0'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
                  <span style="font-size: 0.85rem; color: #666666; flex-shrink: 0;">Banyaknya Ditolak HI</span>
                  <span style="font-size: 0.9rem; font-weight: 700; color: #111111; text-align: right; word-break: break-word;">${tx.ditolak || '0'}</span>
                </div>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <div class="btn-expand-card" style="font-size: 0.8rem; color: #116834; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <span class="expand-text">Tampilkan Detail</span>
                  <svg class="expand-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; color: #116834; font-weight: 700; font-size: 0.85rem;">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Tersimpan
                </div>
              </div>
            </div>
          `).join('') : `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 0;">
              <div style="margin-bottom: 16px;">
                <svg viewBox="0 0 24 24" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill="#111111"/>
                  <path d="M16 13H13V16H11V13H8V11H11V8H13V11H16V13Z" fill="#FFFFFF"/>
                </svg>
              </div>
              <h2 style="font-size: 1.1rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 8px 0; line-height: 1.4;">
                Belum ada Dokumen<br>Penyemaian Bibit hari ini
              </h2>
              <p style="font-size: 0.95rem; color: #999999; text-align: center; margin: 0; line-height: 1.4;">
                Pilih Dokumen Penyemaian<br>untuk memulai rekam data
              </p>
            </div>
          `}
        </div>
      </main>

      <!-- POPUP SELESAI -->
      <div id="popup-selesai" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; padding: 24px;">
        <div style="background: #FFFFFF; border-radius: 8px; padding: 24px; text-align: center; max-width: 320px; width: 100%;">
          <svg viewBox="0 0 24 24" width="64" height="64" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 12px 0; line-height: 1.4;">Proses Penyemaian pada Dokumen ini Telah Selesai</h3>
          <p style="font-size: 0.9rem; color: #666666; margin: 0 0 24px 0; line-height: 1.5;">Tidak ada lagi Bibit yang perlu Disemai</p>
          <button id="btn-tutup-popup" style="width: 100%; padding: 12px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.95rem; cursor: pointer;">Tutup</button>
        </div>
      </div>
    </div>
  `;

  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/home');
  });

  // Event listener for Lihat Penerimaan
  app.querySelectorAll('.btn-lihat-penerimaan').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      storage.set('viewing_transaction_index', idx);
      storage.set('summary_back_url', '/seeding'); // for receipt-summary back button if implemented
      navigate('/reception/summary');
    });
  });

  // Expand actions
  app.querySelectorAll('.btn-expand-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('div[style*="border-radius: 6px"]');
      if (card) {
        const details = card.querySelector('.card-details-content');
        const icon = card.querySelector('.expand-icon');
        const text = card.querySelector('.expand-text');
        
        if (details.style.display === 'none') {
          details.style.display = 'flex';
          icon.style.transform = 'rotate(180deg)';
          text.textContent = 'Sembunyikan';
        } else {
          details.style.display = 'none';
          icon.style.transform = 'rotate(0deg)';
          text.textContent = 'Tampilkan Detail';
        }
      }
    });
  });

  // Event listener for Form Penyemaian (Chevron or No Dokumen)
  const popupSelesai = app.querySelector('#popup-selesai');
  const btnTutupPopup = app.querySelector('#btn-tutup-popup');
  
  if (btnTutupPopup) {
    btnTutupPopup.addEventListener('click', () => {
      popupSelesai.style.display = 'none';
    });
  }

  app.querySelectorAll('.btn-seeding-form').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const status = e.currentTarget.dataset.status;
      if (status === 'Selesai Disemai') {
        popupSelesai.style.display = 'flex';
      } else {
        const idx = e.currentTarget.dataset.index;
        storage.set('seeding_source_index', idx);
        storage.set('editing_seeding_index', null); // clear edit state
        navigate('/seeding/form');
      }
    });
  });

  // Popover Actions for Seeding Cards
  const btnCardMenusSeeding = app.querySelectorAll('.btn-card-menu-seeding');
  const cardPopoversSeeding = app.querySelectorAll('.card-popover-seeding');
  
  if (btnCardMenusSeeding.length > 0) {
    btnCardMenusSeeding.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent document click from closing it immediately
        const idx = e.currentTarget.dataset.index;
        const popover = app.querySelector(`#popover-seeding-${idx}`);
        cardPopoversSeeding.forEach(p => p.style.display = 'none');
        popover.style.display = 'flex';
      });
    });

    document.addEventListener('click', () => {
      cardPopoversSeeding.forEach(p => p.style.display = 'none');
    });

    app.querySelectorAll('.btn-popover-seeding-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        storage.set('editing_seeding_index', idx);
        
        // Find original source index by matching docNo to avoid restoring a blank form
        // (This is just an extra precaution since the form will load from editing state)
        const txs = storage.get('seeding_transactions', []);
        const editTx = txs[idx];
        if (editTx && editTx.sourceIndex !== undefined) {
          storage.set('seeding_source_index', editTx.sourceIndex);
        }

        navigate('/seeding/form');
      });
    });

    app.querySelectorAll('.btn-popover-seeding-hapus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (window.confirm('Hapus data penyemaian ini?')) {
          const idx = e.currentTarget.dataset.index;
          const txs = storage.get('seeding_transactions', []);
          txs.splice(idx, 1);
          storage.set('seeding_transactions', txs);
          renderSeedingLanding(); // re-render
        }
      });
    });
  }
}
