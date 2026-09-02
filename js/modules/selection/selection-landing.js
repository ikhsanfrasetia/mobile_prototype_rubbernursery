import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate } from '../../core/utils.js';

export function renderSelectionLanding() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  // 1. Ambil selection pool eksisting
  let selectionPool = storage.get('selection_pool', []);
  const buddingTxs = storage.get('budding_transactions', []);
  const receiptTxs = storage.get('receipt_transactions', []);

  // 2. Sinkronisasi Data Seleksi / Reject dari Transaksi Penerimaan Benih / Bibit (APM)
  receiptTxs.forEach((rtx, i) => {
    const rcvDocNo = rtx.docNo || rtx.nomorDokumen || (rtx.jenis === 'Benih / Biji Kelatak' ? `RCV/SEEDS/2026/0${i + 1}` : `RCV/SEEDLINGS/2026/0${i + 1}`);
    const rows = (rtx.rawState && rtx.rawState.tableRows) || [];
    const sourceName = rtx.sumber || rtx.tipeAsal || (rtx.rawState && rtx.rawState.sourceName) || 'Kebun Sendiri';
    const batchNo = rtx.batchNo || (rtx.rawState && rtx.rawState.batchCode) || `Batch-0${i + 1}`;
    const stage = rtx.tahapan || (rtx.rawState && rtx.rawState.tahapanPertumbuhan) || 'Rubber Advance Planting Material';

    if (rows.length > 0) {
      rows.forEach((row, rIdx) => {
        const rejected = parseInt(row.rejected || 0);
        if (rejected > 0) {
          const poolDocNo = `SEL/RCV/2026/0${i + 1}_${rIdx + 1}`;
          const exists = selectionPool.some(s => s.receiptDocNo === rcvDocNo && s.originType === 'REJECT_PENERIMAAN' && s.klon === (row.klon || rtx.klon));
          if (!exists) {
            selectionPool.push({
              docNo: poolDocNo,
              originType: 'REJECT_PENERIMAAN',
              batchNo: batchNo,
              receiptDocNo: rcvDocNo,
              buddingDocNo: '-',
              inspectionDocNo: '-',
              klon: row.klon || rtx.klon || 'IRR300',
              bedengan: rtx.bedengan || '-',
              program: rtx.program || 'PRG/NUR/01/2026',
              tahapan: stage,
              sumberAsal: sourceName,
              jumlahAfkir: rejected,
              alasan: row.reason ? `Diseleksi saat Penerimaan (${row.reason})` : 'Diseleksi saat Penerimaan Bibit',
              status: 'PENDING_DECLARATION'
            });
          }
        }
      });
    } else {
      // Direct receipt qty rejection check
      const rejected = parseInt(rtx.rejected || rtx.jumlahDitolak || 0);
      if (rejected > 0) {
        const poolDocNo = `SEL/RCV/2026/0${i + 1}`;
        const exists = selectionPool.some(s => s.receiptDocNo === rcvDocNo && s.originType === 'REJECT_PENERIMAAN');
        if (!exists) {
          selectionPool.push({
            docNo: poolDocNo,
            originType: 'REJECT_PENERIMAAN',
            batchNo: batchNo,
            receiptDocNo: rcvDocNo,
            buddingDocNo: '-',
            inspectionDocNo: '-',
            klon: rtx.klon || 'IRR300',
            bedengan: rtx.bedengan || '-',
            program: rtx.program || 'PRG/NUR/01/2026',
            tahapan: stage,
            sumberAsal: sourceName,
            jumlahAfkir: rejected,
            alasan: rtx.alasan || 'Diseleksi saat Penerimaan Bibit',
            status: 'PENDING_DECLARATION'
          });
        }
      }
    }
  });

  // 3. Sinkronisasi Data Bibit Ditolak saat Okulasi
  buddingTxs.forEach((btx, i) => {
    const ditolak = parseInt(btx.jumlahDitolak || 0);
    if (ditolak > 0) {
      const exists = selectionPool.some(s => s.buddingDocNo === btx.docNo && s.originType === 'REJECT_OKULASI');
      if (!exists) {
        selectionPool.push({
          docNo: `SEL/REJ/2026/0${selectionPool.length + 1}`,
          originType: 'REJECT_OKULASI',
          batchNo: btx.batchNo || `Batch-0${i + 1}`,
          receiptDocNo: '-',
          buddingDocNo: btx.docNo,
          inspectionDocNo: '-',
          klon: btx.klonRootstock || 'GT-01',
          bedengan: btx.bedengan || 'Bedengan 01',
          program: btx.program || 'PRG/NUR/01/2026',
          tahapan: btx.tahapan || 'Rubber Main Nursery',
          sumberAsal: 'Proses Okulasi Lapangan',
          jumlahAfkir: ditolak,
          alasan: 'Bibit Ditolak saat Proses Okulasi (Grafting)',
          status: 'PENDING_DECLARATION'
        });
      }
    }
  });

  const culledTxs = storage.get('selection_transactions', []);

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 6px; letter-spacing: -0.01em;">Penyeleksian Bibit (Afkir)</h1>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 14px 16px;">
        
        <!-- DAFTAR BIBIT AFKIR / SELECTION POOL (HANYA MUNCUL JIKA ADA DATA) -->
        ${selectionPool.length > 0 ? `
          <div style="margin-bottom: 10px;">
            <h2 style="font-size: 0.90rem; font-weight: 700; color: #111111; margin: 0;">Daftar Bibit Afkir / Diseleksi dari Transaksi</h2>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            ${selectionPool.map((item, idx) => {
              const isDeclared = item.status === 'DECLARED_CULLED';
              const isRejectPenerimaan = item.originType === 'REJECT_PENERIMAAN';
              const isRejectOkulasi = item.originType === 'REJECT_OKULASI';
              
              const sourceLabel = isRejectPenerimaan ? 'Penerimaan Bibit' : (isRejectOkulasi ? 'Reject Okulasi' : 'Gagal Periksa');
              const sourceColor = isRejectPenerimaan ? '#0369A1' : (isRejectOkulasi ? '#C2410C' : '#B91C1C');
              const originDocNo = isRejectPenerimaan ? (item.receiptDocNo || '-') : (isRejectOkulasi ? (item.buddingDocNo || '-') : (item.inspectionDocNo || '-'));

              return `
                <div class="card-selection-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); box-sizing: border-box;">
                  
                  <!-- BARIS 1: NAMA BATCH & STATUS -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <div style="font-weight: 800; font-size: 0.88rem; color: #111827; white-space: nowrap;">
                      ${item.batchNo || 'Batch-01'} - ${item.klon || 'PB 260'}
                    </div>
                    <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${isDeclared ? '#F0FDF4' : '#FEF2F2'}; color: ${isDeclared ? '#116834' : '#DC2626'}; border: 1px solid ${isDeclared ? '#BBF7D0' : '#FECACA'}; white-space: nowrap;">
                      ${isDeclared ? 'Telah Dikurangi' : 'Perlu Deklarasi'}
                    </span>
                  </div>

                  <!-- BARIS 2: LOKASI/TAHAPAN & DOKUMEN ALOKASI -->
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem; color: #6B7280; margin-bottom: 8px;">
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;">
                      ${item.bedengan && item.bedengan !== '-' ? `<span>${item.bedengan}</span>` : `<span>${item.tahapan || 'Pembibitan'}</span>`}
                    </div>
                    <div style="font-weight: 600; color: #9CA3AF; white-space: nowrap;">
                      Dok: ${item.docNo || `SEL-POOL/2026/0${idx+1}`}
                    </div>
                  </div>

                  <!-- BARIS 3: METRIK KOTAK 2-KOLOM HERO (BEBAS TABRAKAN TEKS) -->
                  <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 8px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 8px; padding: 8px 12px; align-items: center; margin-bottom: 10px;">
                    <div style="min-width: 0;">
                      <div style="font-size: 0.62rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.02em;">Sumber Transaksi</div>
                      <div style="font-size: 0.78rem; font-weight: 700; color: ${sourceColor}; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${sourceLabel}
                      </div>
                      <div style="font-size: 0.68rem; font-weight: 600; color: #4B5563; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${originDocNo}">
                        Ref: ${originDocNo}
                      </div>
                    </div>
                    
                    <div style="text-align: right; border-left: 1px solid #E5E7EB; padding-left: 10px; min-width: 0;">
                      <div style="font-size: 0.62rem; font-weight: 700; color: #DC2626; text-transform: uppercase; letter-spacing: 0.02em;">Bibit Afkir</div>
                      <div style="font-size: 1.05rem; font-weight: 900; color: #DC2626; margin-top: 1px; white-space: nowrap;">
                        ${parseInt(item.jumlahAfkir || 0).toLocaleString('id-ID')} <span style="font-size: 0.70rem; font-weight: 700;">Pkk</span>
                      </div>
                    </div>
                  </div>

                  <!-- BARIS 4: KETERANGAN & INFORMASI ASAL REKANAN -->
                  <div style="background: #FFFFFF; border-top: 1px dashed #E5E7EB; padding-top: 8px; margin-bottom: ${!isDeclared ? '10px' : '0'}; font-size: 0.72rem; color: #4B5563; display: flex; flex-direction: column; gap: 3px;">
                    <div><span style="font-weight: 700; color: #374151;">Keterangan:</span> ${item.alasan || 'Tidak Berhasil Okulasi'}</div>
                    ${item.sumberAsal ? `<div><span style="font-weight: 700; color: #374151;">Asal Rekanan/Kebun:</span> ${item.sumberAsal}</div>` : ''}
                  </div>

                  ${!isDeclared ? `
                    <!-- BARIS 5: TOMBOL AKSI DEKLARASI -->
                    <button type="button" class="btn-deklarasi-afkir" data-index="${idx}" style="width: 100%; height: 38px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 3px rgba(220,38,38,0.25);">
                      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" fill="none">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Deklarasi Bibit Afkir (${parseInt(item.jumlahAfkir || 0).toLocaleString('id-ID')} Pkk)</span>
                    </button>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- STATE KOSONG JIKA TIDAK ADA DATA SAMA SEKALI -->
        ${selectionPool.length === 0 && culledTxs.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 32px 16px; text-align: center; margin-top: 24px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #64748B;">
              <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 6px 0;">Belum Ada Data Penyeleksian</h3>
            <p style="font-size: 0.78rem; color: #757575; margin: 0; line-height: 1.4;">
              Data bibit afkir akan muncul saat terdapat bibit yang diseleksi atau ditolak pada transaksi Penerimaan, Okulasi, atau Pemeriksaan.
            </p>
          </div>
        ` : ''}

        <!-- HISTORI DEKLARASI SELEKSI -->
        ${culledTxs.length > 0 ? `
          <div style="margin: 20px 0 10px 0;">
            <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0;">Histori Deklarasi Pengurangan Stok (${culledTxs.length})</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${culledTxs.map((ctx, idx) => `
              <div class="card-culled-history-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); box-sizing: border-box; position: relative;">
                
                <!-- BARIS 1: NAMA BATCH, NILAI PENGURANGAN & MENU 3-DOTS -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <div style="font-weight: 800; font-size: 0.88rem; color: #111827; white-space: nowrap;">
                    ${ctx.batchNo || 'Batch'} - ${ctx.klon || 'PB 260'}
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 800; font-size: 0.86rem; color: #DC2626; white-space: nowrap;">
                      -${parseInt(ctx.jumlahAfkir || 0).toLocaleString('id-ID')} Pkk
                    </span>

                    <!-- TOMBOL AKSI 3-DOTS -->
                    <div style="position: relative;">
                      <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>

                      <!-- DROPDOWN POPUP MENU -->
                      <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 120px; overflow: hidden;">
                        <button type="button" class="menu-action-rincian" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          <span class="text-menu-rincian">Rincian</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- BARIS 2: LOKASI & MANTRI -->
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #6B7280;">
                  <div>${ctx.bedengan && ctx.bedengan !== '-' ? ctx.bedengan + ' • ' : ''}${ctx.tanggal || today}</div>
                  <div style="color: #4B5563;">Mantri: <span style="font-weight: 700; color: #111;">${ctx.mantri || user.name}</span></div>
                </div>

                <!-- EXPANDABLE DETAIL CONTENT -->
                <div class="culled-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-top: 8px; font-size: 0.74rem;">
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6B7280;">No. Dokumen:</span>
                      <span style="font-weight: 700; color: #111;">${ctx.docNo || `DEC-CUL/2026/0${idx+1}`}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6B7280;">Dokumen Alokasi:</span>
                      <span style="font-weight: 700; color: #111;">${ctx.selectionPoolDocNo || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6B7280;">Pengurangan Stok:</span>
                      <span style="font-weight: 800; color: #DC2626;">-${parseInt(ctx.jumlahAfkir || 0).toLocaleString('id-ID')} Pkk</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6B7280;">Mantri Pelaksana:</span>
                      <span style="font-weight: 700; color: #111;">${ctx.mantri || user.name}</span>
                    </div>
                    ${ctx.alasan ? `
                      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                        <span style="color: #6B7280;">Keterangan:</span>
                        <span style="font-weight: 600; color: #4B5563; text-align: right;">${ctx.alasan}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>

              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- MODAL DIALOG KONFIRMASI DEKLARASI AFKIR -->
        <div id="modal-declare-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000; backdrop-filter: blur(2px);"></div>
        
        <div id="dialog-confirm-declare" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; padding: 20px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1001; text-align: center; box-sizing: border-box;">
          <div style="width: 58px; height: 58px; border-radius: 50%; background: #F3F4F6; color: #111827; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
            <svg viewBox="0 0 24 24" width="34" height="34" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p id="dialog-declare-msg" style="font-size: 0.78rem; color: #666666; margin: 0 0 18px 0; line-height: 1.45;">
            Apakah Anda yakin ingin mendeklarasikan pengurangan stok ini? Data pengurangan stok bibit akan disimpan secara permanen setelah di verifikasi oleh Asisten.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-declare" type="button" style="flex: 1; height: 38px; background: #F3F4F6; color: #374151; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
              Batal
            </button>
            <button id="btn-confirm-declare" type="button" style="flex: 1; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.25);">
              Setuju
            </button>
          </div>
        </div>

      </main>
    </div>
  `;

  // Event Listeners: Back button
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/home');
  });

  // Action Menu Trigger (3-dots popup)
  app.querySelectorAll('.btn-tx-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentMenu = btn.nextElementSibling;
      const isOpen = currentMenu && currentMenu.style.display === 'block';
      
      // Close all other open action menus
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        m.style.display = 'none';
      });

      if (!isOpen && currentMenu) {
        currentMenu.style.display = 'block';
      }
    });
  });

  // Action: Rincian (Toggle Expand)
  app.querySelectorAll('.menu-action-rincian').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.card-culled-history-wrapper');
      const expandContent = card ? card.querySelector('.culled-expand-content') : null;
      const textSpan = btn.querySelector('.text-menu-rincian');

      if (expandContent) {
        const isHidden = expandContent.style.display === 'none' || expandContent.style.display === '';
        expandContent.style.display = isHidden ? 'block' : 'none';
        if (textSpan) {
          textSpan.textContent = isHidden ? 'Tutup Rincian' : 'Rincian';
        }
      }

      // Close menu
      const menu = btn.closest('.tx-action-menu');
      if (menu) menu.style.display = 'none';
    });
  });

  // Close menus on clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-tx-action-trigger') && !e.target.closest('.tx-action-menu')) {
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        m.style.display = 'none';
      });
    }
  });

  // Action: Dialog Konfirmasi Deklarasikan Pengurangan Stok
  let pendingDeclareIndex = null;
  const modalOverlay = app.querySelector('#modal-declare-overlay');
  const modalDialog = app.querySelector('#dialog-confirm-declare');
  const dialogMsg = app.querySelector('#dialog-declare-msg');
  const btnCancelDeclare = app.querySelector('#btn-cancel-declare');
  const btnConfirmDeclare = app.querySelector('#btn-confirm-declare');

  const hideDeclareModal = () => {
    pendingDeclareIndex = null;
    if (modalOverlay) modalOverlay.style.display = 'none';
    if (modalDialog) modalDialog.style.display = 'none';
  };

  if (btnCancelDeclare) {
    btnCancelDeclare.addEventListener('click', hideDeclareModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', hideDeclareModal);
  }

  app.querySelectorAll('.btn-deklarasi-afkir').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      const targetPoolItem = selectionPool[idx];
      if (!targetPoolItem) return;

      pendingDeclareIndex = idx;
      if (dialogMsg) {
        dialogMsg.innerHTML = `Apakah Anda yakin ingin mendeklarasikan pengurangan stok sebanyak <strong style="color: #DC2626;">-${parseInt(targetPoolItem.jumlahAfkir || 0).toLocaleString('id-ID')} Pkk</strong> untuk <strong>${targetPoolItem.batchNo || 'Batch'} - ${targetPoolItem.klon || 'PB 260'}</strong>?<br><br>Data pengurangan stok bibit akan disimpan secara permanen setelah di verifikasi oleh Asisten.`;
      }
      if (modalOverlay) modalOverlay.style.display = 'block';
      if (modalDialog) modalDialog.style.display = 'block';
    });
  });

  if (btnConfirmDeclare) {
    btnConfirmDeclare.addEventListener('click', () => {
      if (pendingDeclareIndex === null) return;
      const targetPoolItem = selectionPool[pendingDeclareIndex];
      if (!targetPoolItem) return;

      targetPoolItem.status = 'DECLARED_CULLED';
      storage.set('selection_pool', selectionPool);

      const culled = storage.get('selection_transactions', []);
      culled.push({
        docNo: `DEC-CUL/2026/0${culled.length + 1}`,
        selectionPoolDocNo: targetPoolItem.docNo,
        batchNo: targetPoolItem.batchNo,
        klon: targetPoolItem.klon,
        bedengan: targetPoolItem.bedengan,
        program: targetPoolItem.program,
        tahapan: targetPoolItem.tahapan,
        sumberAsal: targetPoolItem.sumberAsal,
        jumlahAfkir: targetPoolItem.jumlahAfkir,
        tanggal: today,
        mantri: user.name,
        alasan: targetPoolItem.alasan
      });
      storage.set('selection_transactions', culled);

      hideDeclareModal();
      renderSelectionLanding();
    });
  }
}
