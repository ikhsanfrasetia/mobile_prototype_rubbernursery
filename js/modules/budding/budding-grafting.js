import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderBuddingGrafting() {
  const app = document.getElementById('app');

  // Load seeding transactions (batches from balanced seedings)
  const seedingTxs = storage.get('seeding_transactions', []);
  const buddingTxs = storage.get('budding_transactions', []).filter(b => b.type === 'GRAFTING' || !b.type);

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
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 6px; letter-spacing: -0.01em;">Okulasi (Grafting)</h1>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        <div style="margin-bottom: 12px;">
          <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Daftar Batch Siap Okulasi</h2>
        </div>

        ${seedingTxs.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            ${seedingTxs.map((stx, idx) => {
              const batchNo = stx.batchNo || `Batch-0${idx + 1}`;
              const docNo = stx.docNo || `RCV/SEEDS/2026/AGUS/0${(stx.sourceIndex || 0) + 1}`;
              const populasiBibit = parseInt(stx.totalDisemai || 0);

              // Calculate accumulated budding for this batch
              let ttlDiokulasi = 0;
              let ttlDitolak = 0;
              let ttlKayu = 0;
              const relatedBuddings = buddingTxs.filter(b => b.seedingIndex === idx || b.batchNo === batchNo);
              relatedBuddings.forEach(b => {
                ttlDiokulasi += parseInt(b.jumlah || 0);
                ttlDitolak += parseInt(b.jumlahDitolak || 0);
                ttlKayu += parseInt(b.jumlahKayu || 0);
              });

              const totalRealisasi = ttlDiokulasi + ttlDitolak;
              const sisaBelumOkulasi = Math.max(0, populasiBibit - totalRealisasi);
              const persenSelesai = populasiBibit > 0 ? Math.min(100, Math.round((totalRealisasi / populasiBibit) * 100)) : 0;

              // Status badge
              let statusBadgeText = 'Perlu Diokulasi';
              let statusBadgeBg = '#E53935';
              let statusBadgeColor = '#FFFFFF';
              let statusBadgeBorder = 'none';

              if (totalRealisasi === 0) {
                statusBadgeText = 'Perlu Diokulasi';
                statusBadgeBg = '#E53935';
                statusBadgeColor = '#FFFFFF';
              } else if (sisaBelumOkulasi <= 0) {
                statusBadgeText = 'Selesai Diokulasi';
                statusBadgeBg = '#E8F5E9';
                statusBadgeColor = '#116834';
                statusBadgeBorder = '1px solid #116834';
              } else {
                statusBadgeText = 'Okulasi Belum Selesai';
                statusBadgeBg = '#FFF8E1';
                statusBadgeColor = '#F57F17';
                statusBadgeBorder = '1px solid #FFE082';
              }

              // Extract bedengan rows
              const rows = stx.rows || [];
              const bedenganNames = rows.map(r => r.bedengan).filter(Boolean);
              const bedenganDisplay = bedenganNames.length > 0 ? Array.from(new Set(bedenganNames)).join(', ') : 'Bedengan 01';

              return `
                <div class="card-batch-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  
                  <!-- HEADER BARIS 1: NOMOR BATCH & BADGE STATUS -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 8px;">
                    <div style="font-size: 0.95rem; font-weight: 800; color: #116834; white-space: nowrap; letter-spacing: -0.01em;">
                      ${batchNo}
                    </div>
                    <span style="background: ${statusBadgeBg}; color: ${statusBadgeColor}; font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; white-space: nowrap; border: ${statusBadgeBorder}; flex-shrink: 0;">
                      ${statusBadgeText}
                    </span>
                  </div>

                  <!-- HEADER BARIS 2: DOKUMEN ASAL & TANGGAL -->
                  <div style="font-size: 0.82rem; font-weight: 700; color: #111111; margin-bottom: 2px;">
                    ${docNo}
                  </div>
                  <div style="font-size: 0.72rem; color: #888888; margin-bottom: 10px;">
                    Penyemaian: ${stx.date || 'Hari ini'}
                  </div>

                  <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 10px 0;" />

                  <!-- GRID DETAIL 2x2 -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 10px;">
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Klon Batang Bawah</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #111111;">${stx.klonAwal || 'GT-01'}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Lokasi Bedengan</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bedenganDisplay}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Populasi Bibit (Disemai)</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #116834;">${populasiBibit} Pkk</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Belum Diokulasi</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: ${sisaBelumOkulasi > 0 ? '#D32F2F' : '#116834'};">${sisaBelumOkulasi} Pkk</div>
                    </div>
                  </div>

                  <!-- TOMBOL TOGGLE EXPAND DETAIL -->
                  <div style="margin-bottom: 6px;">
                    <button type="button" class="btn-toggle-expand-batch" style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                      <span class="text-expand-batch">Tampilkan Detail</span>
                      <svg class="icon-expand-batch" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>

                  <!-- EXPANDABLE ACCORDION DETAIL (LOCATED DIRECTLY BELOW BUTTON) -->
                  <div class="batch-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; font-size: 0.74rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                      <span style="color: #6B7280;">Program Nursery:</span>
                      <span style="font-weight: 700; color: #111;">${stx.program || 'PRG/NUR/01/2026'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                      <span style="color: #6B7280;">Tahapan Pertumbuhan:</span>
                      <span style="font-weight: 700; color: #111;">${stx.tahapan || 'Rubber Main Nursery'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                      <span style="color: #6B7280;">Total Diokulasi SDHI:</span>
                      <span style="font-weight: 700; color: #116834;">${ttlDiokulasi} Pkk (${persenSelesai}%)</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                      <span style="color: #6B7280;">Total Bibit Ditolak:</span>
                      <span style="font-weight: 700; color: #D32F2F;">${ttlDitolak} Pkk</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                      <span style="color: #6B7280;">Total Kayu Entres Dipakai:</span>
                      <span style="font-weight: 700; color: #111;">${ttlKayu} Batang</span>
                    </div>

                    ${rows.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 4px;">Rincian Bedengan Asal:</div>
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                          ${rows.map(r => `
                            <div style="display: flex; justify-content: space-between; color: #4B5563;">
                              <span>• ${r.bedengan || 'Bedengan'} (${r.klon || stx.klonAwal || 'GT-01'})</span>
                              <span style="font-weight: 700; color: #116834;">${parseInt(r.disemai || 0)} Pkk</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}

                    ${relatedBuddings.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 4px;">Riwayat Rekam Okulasi (${relatedBuddings.length}):</div>
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                          ${relatedBuddings.map(b => `
                            <div style="display: flex; justify-content: space-between; color: #4B5563;">
                              <span>• ${b.klonEntres || 'PB 260'} (${b.tanggal || 'Hari ini'})</span>
                              <span style="font-weight: 700; color: #116834;">${b.jumlah || 0} Pkk</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>

                  <!-- FOOTER ACTION ROW -->
                  ${sisaBelumOkulasi <= 0 ? `
                    <div class="card-action-rekam" data-index="${idx}" data-completed="true" style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #E5E7EB; cursor: default;">
                      <span style="font-size: 0.74rem; color: #116834; font-weight: 700;">✓ Okulasi Selesai (100% Balance)</span>
                      <div style="display: flex; align-items: center; gap: 4px; color: #116834; font-weight: 700; font-size: 0.74rem;">
                        <span>Batch Selesai</span>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                  ` : `
                    <div class="card-action-rekam" data-index="${idx}" data-completed="false" style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #E5E7EB; cursor: pointer;">
                      <span style="font-size: 0.74rem; color: #116834; font-weight: 600;">Ketuk untuk Rekam Okulasi</span>
                      <div style="display: flex; align-items: center; gap: 3px; color: #116834; font-weight: 700; font-size: 0.76rem;">
                        <span>Input Data</span>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  `}

                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 32px 16px; text-align: center; margin-top: 24px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #E8F5E9; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #116834;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 6px 0;">Belum Ada Batch Penyemaian</h3>
            <p style="font-size: 0.78rem; color: #757575; margin: 0; line-height: 1.4;">
              Lakukan penyemaian terlebih dahulu pada modul <strong>Penyemaian</strong> agar batch otomatis masuk ke tahap Okulasi.
            </p>
          </div>
        `}

        <!-- HISTORI / RINGKASAN DATA OKULASI DENGAN MENU AKSI 3-DOTS (...) -->
        ${buddingTxs.length > 0 ? `
          <div style="margin: 20px 0 10px 0;">
            <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0;">Ringkasan Data Okulasi (${buddingTxs.length})</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${buddingTxs.map((tx, idx) => {
              const workersList = tx.workers || [];
              return `
                <div class="card-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); position: relative;">
                  
                  <!-- BARIS 1: JUDUL BATCH & TOMBOL AKSI 3-DOTS -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span style="font-weight: 800; font-size: 0.86rem; color: #111827;">${tx.batchNo || 'Batch'}</span>
                      <span style="color: #9CA3AF; font-size: 0.80rem;">-</span>
                      <span style="font-weight: 700; font-size: 0.84rem; color: #374151;">${tx.klonEntres || tx.klon || 'PB 260'}</span>
                      <span style="font-size: 0.62rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #F0FDF4; color: #116834; border: 1px solid #BBF7D0;">
                        Okulasi
                      </span>
                    </div>

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
                      <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 130px; overflow: hidden;">
                        <button type="button" class="menu-action-rincian" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          <span>Rincian</span>
                        </button>
                        <button type="button" class="menu-action-edit" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #116834; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          <span>Edit</span>
                        </button>
                        <button type="button" class="menu-action-delete" data-index="${idx}" data-doc="${tx.docNo || ''}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- BARIS 2: LOKASI & TANGGAL -->
                  <div style="font-size: 0.72rem; color: #6B7280; margin-bottom: 8px;">
                    ${tx.bedengan || 'Bedengan 01'} • ${tx.tanggal || 'Hari ini'}
                  </div>

                  <!-- BARIS 3: METRIK STATISTIK SIMETRIS 2-KOLOM -->
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 7px 4px; text-align: center;">
                    <div>
                      <div style="font-size: 0.65rem; color: #116834;">Total Diokulasi</div>
                      <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">${tx.jumlah || 0} Pkk</div>
                    </div>
                    <div>
                      <div style="font-size: 0.65rem; color: #6B7280;">Kayu Okulasi</div>
                      <div style="font-size: 0.82rem; font-weight: 800; color: #374151; margin-top: 1px;">${tx.jumlahKayu || 0} Batang</div>
                    </div>
                  </div>

                  <!-- EXPANDABLE CONTENT DETAIL TRANSAKSI -->
                  <div class="summary-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-top: 8px; font-size: 0.74rem;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">No. Dokumen:</span>
                        <span style="font-weight: 700; color: #111;">${tx.docNo || `OKL/2026/0${idx+1}`}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Dokumen Penerimaan:</span>
                        <span style="font-weight: 700; color: #111;">${tx.sourceDocNo || '-'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Batang Bawah:</span>
                        <span style="font-weight: 700; color: #111;">${tx.klonRootstock || 'GT-01'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Kayu Okulasi:</span>
                        <span style="font-weight: 700; color: #111;">${tx.jumlahKayu || 0} Batang</span>
                      </div>
                      ${parseInt(tx.jumlahDitolak || 0) > 0 ? `
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #6B7280;">Bibit Ditolak:</span>
                          <span style="font-weight: 700; color: #D32F2F;">${tx.jumlahDitolak} Pkk</span>
                        </div>
                      ` : ''}
                    </div>

                    ${workersList.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 6px; font-size: 0.74rem;">Pekerja Okulasi:</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          ${workersList.map(w => `
                            <div style="display: flex; justify-content: space-between; color: #4B5563;">
                              <span>• ${w.name} <span style="color: #9CA3AF;">(${w.code})</span></span>
                              <span style="font-weight: 700; color: #116834;">${w.qty || 0} Pkk</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}

                  </div>

                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

      </main>
    </div>
  `;

  // Event Listener: Back button
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/budding');
  });

  // Event Listener: Expand / Collapse on Batch Cards
  app.querySelectorAll('.card-batch-wrapper').forEach(wrapper => {
    const btnToggle = wrapper.querySelector('.btn-toggle-expand-batch');
    const content = wrapper.querySelector('.batch-expand-content');
    const textSpan = wrapper.querySelector('.text-expand-batch');
    const icon = wrapper.querySelector('.icon-expand-batch');

    if (btnToggle && content) {
      btnToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        textSpan.textContent = isOpen ? 'Tampilkan Detail' : 'Sembunyikan Detail';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    }
  });

  // Event Listener: Action Rekam Okulasi
  app.querySelectorAll('.card-action-rekam').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.currentTarget.dataset.completed === 'true') return;
      const idx = e.currentTarget.dataset.index;
      storage.remove('editing_budding_index');
      storage.set('selected_grafting_batch_index', idx);
      navigate('/budding/grafting/form');
    });
  });

  // Event Listener: 3-Dots Action Menu Trigger
  app.querySelectorAll('.btn-tx-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      
      // Close other open menus
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });

      if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  // Close menus when clicking outside
  document.addEventListener('click', () => {
    app.querySelectorAll('.tx-action-menu').forEach(m => {
      m.style.display = 'none';
    });
  });

  // Event Listener: Action Rincian (Toggle Expand)
  app.querySelectorAll('.menu-action-rincian').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      if (menu) menu.style.display = 'none';

      const content = wrapper?.querySelector('.summary-expand-content');
      if (content) {
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  // Event Listener: Action Edit Okulasi
  app.querySelectorAll('.menu-action-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.index);
      const targetTx = buddingTxs[idx];
      storage.set('editing_budding_index', idx);
      storage.set('selected_grafting_batch_index', targetTx?.seedingIndex !== undefined ? targetTx.seedingIndex : 0);
      storage.set('budding_type', 'GRAFTING');
      navigate('/budding/grafting/form');
    });
  });

  // Event Listener: Action Delete Okulasi
  app.querySelectorAll('.menu-action-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      if (menu) menu.style.display = 'none';

      const idx = parseInt(e.currentTarget.dataset.index);
      const doc = e.currentTarget.dataset.doc;
      if (confirm(`Apakah Anda yakin ingin menghapus transaksi okulasi "${doc}"?`)) {
        let allTxs = storage.get('budding_transactions', []);
        const actualIdx = allTxs.findIndex(b => b.docNo === doc);
        if (actualIdx !== -1) {
          allTxs.splice(actualIdx, 1);
        } else {
          allTxs.splice(idx, 1);
        }
        storage.set('budding_transactions', allTxs);
        renderBuddingGrafting();
      }
    });
  });
}
