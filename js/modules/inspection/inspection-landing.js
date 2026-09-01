import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderInspectionLanding() {
  const app = document.getElementById('app');

  // Load all budding transactions (both Grafting & Regrafting) and inspection transactions
  const buddingTxs = storage.get('budding_transactions', []);
  const inspectionTxs = storage.get('inspection_transactions', []);

  // Group or map budding transactions with cumulative inspection stats
  const items = buddingTxs.map((btx, idx) => {
    const populasiDiokulasi = parseInt(btx.jumlah || 0);
    const isRegrafting = btx.type === 'REGRAFTING';
    const relatedInspections = inspectionTxs.filter(insp => insp.buddingDocNo === btx.docNo || insp.buddingIndex === idx || (insp.batchNo === btx.batchNo && (insp.buddingType === btx.type || (!insp.buddingType && !isRegrafting))));
    
    let totalDiperiksa = 0;
    let totalJadi = 0;
    let totalGagal = 0;
    let totalRegrafting = 0;
    let totalSelection = 0;

    relatedInspections.forEach(insp => {
      const dip = parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
      const jadi = parseInt(insp.jumlahJadi || 0);
      const gagal = parseInt(insp.jumlahGagal || 0);

      let regraft = 0;
      let seleksi = 0;
      if (insp.totalToRegrafting !== undefined) {
        regraft = parseInt(insp.totalToRegrafting || 0);
        seleksi = insp.totalToSelection !== undefined ? parseInt(insp.totalToSelection || 0) : Math.max(0, gagal - regraft);
      } else {
        regraft = gagal;
        seleksi = 0;
      }

      totalDiperiksa += dip;
      totalJadi += jadi;
      totalGagal += gagal;
      totalRegrafting += regraft;
      totalSelection += seleksi;
    });

    const sisaBelumDiperiksa = Math.max(0, populasiDiokulasi - totalDiperiksa);
    
    // Perhitungan persentase akurat
    let persenJadiDisplay = '0%';
    let rawPercent = 0;
    if (totalDiperiksa > 0) {
      rawPercent = (totalJadi / totalDiperiksa) * 100;
      if (totalGagal === 0 && totalJadi === totalDiperiksa) {
        persenJadiDisplay = '100%';
      } else if (rawPercent % 1 === 0) {
        persenJadiDisplay = `${rawPercent}%`;
      } else {
        persenJadiDisplay = `${rawPercent.toFixed(1)}%`;
      }
    }

    let statusText = 'Perlu Pemeriksaan';
    let statusBg = '#E53935';
    let statusColor = '#FFFFFF';
    let statusBorder = 'none';

    if (totalDiperiksa === 0) {
      statusText = 'Perlu Pemeriksaan';
      statusBg = '#E53935';
      statusColor = '#FFFFFF';
    } else if (sisaBelumDiperiksa <= 0) {
      statusText = `Selesai (${persenJadiDisplay})`;
      statusBg = '#E8F5E9';
      statusColor = '#116834';
      statusBorder = '1px solid #116834';
    } else {
      statusText = `Sisa ${sisaBelumDiperiksa} Pkk`;
      statusBg = '#FFF8E1';
      statusColor = '#F57F17';
      statusBorder = '1px solid #FFE082';
    }

    return {
      ...btx,
      originalIndex: idx,
      isRegrafting,
      typeLabel: isRegrafting ? 'Okulasi Janda (Regrafting)' : 'Okulasi (Grafting)',
      typeBadgeBg: isRegrafting ? '#FFFBEB' : '#F0FDF4',
      typeBadgeColor: isRegrafting ? '#B45309' : '#116834',
      typeBadgeBorder: isRegrafting ? '1px solid #FDE68A' : '1px solid #BBF7D0',
      populasiDiokulasi,
      totalDiperiksa,
      totalJadi,
      totalGagal,
      totalRegrafting,
      totalSelection,
      sisaBelumDiperiksa,
      persenJadiDisplay,
      statusText,
      statusBg,
      statusColor,
      statusBorder,
      relatedInspections,
      inspectionsCount: relatedInspections.length
    };
  });

  const graftingCount = items.filter(i => !i.isRegrafting).length;
  const regraftingCount = items.filter(i => i.isRegrafting).length;

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 6px; letter-spacing: -0.01em;">Pemeriksaan Okulasi</h1>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        <div style="margin-bottom: 12px;">
          <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Daftar Hasil Okulasi Siap Periksa</h2>

          <!-- TAB FILTER KLASIFIKASI SUMBER DOKUMEN -->
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;">
            <button type="button" class="btn-filter-insp-tab" data-filter="ALL" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; border-radius: 20px; border: 1px solid #116834; background: #116834; color: #FFFFFF; cursor: pointer; white-space: nowrap; box-sizing: border-box;">
              Semua (${items.length})
            </button>
            <button type="button" class="btn-filter-insp-tab" data-filter="GRAFTING" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; border-radius: 20px; border: 1px solid #D1D5DB; background: #FFFFFF; color: #374151; cursor: pointer; white-space: nowrap; box-sizing: border-box;">
              Okulasi (${graftingCount})
            </button>
            <button type="button" class="btn-filter-insp-tab" data-filter="REGRAFTING" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; border-radius: 20px; border: 1px solid #FDE68A; background: #FFFBEB; color: #B45309; cursor: pointer; white-space: nowrap; box-sizing: border-box;">
              Okulasi Janda (${regraftingCount})
            </button>
          </div>
        </div>

        ${items.length > 0 ? `
          <div id="insp-cards-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            ${items.map((item, idx) => {
              const workers = item.workers || [];
              const relatedInspections = item.relatedInspections || [];
              return `
                <div class="card-inspection-wrapper" data-type="${item.isRegrafting ? 'REGRAFTING' : 'GRAFTING'}" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); box-sizing: border-box;">
                  
                  <!-- HEADER BARIS 1: NOMOR BATCH & STATUS BADGE -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 8px;">
                    <div style="font-size: 0.95rem; font-weight: 800; color: #116834; white-space: nowrap; letter-spacing: -0.01em;">
                      ${item.batchNo || 'Batch-01'}
                    </div>
                    <span style="background: ${item.statusBg}; color: ${item.statusColor}; font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; white-space: nowrap; border: ${item.statusBorder}; flex-shrink: 0;">
                      ${item.statusText}
                    </span>
                  </div>

                  <!-- HEADER BARIS 2: BADGE SUMBER & DOKUMEN -->
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; gap: 6px; flex-wrap: wrap;">
                    <span style="background: ${item.typeBadgeBg}; color: ${item.typeBadgeColor}; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: ${item.typeBadgeBorder}; white-space: nowrap;">
                      ${item.typeLabel}
                    </span>
                    <span style="font-size: 0.78rem; font-weight: 700; color: #111827;">
                      ${item.docNo || `OKL/2026/0${idx + 1}`}
                    </span>
                  </div>

                  <!-- HEADER BARIS 3: TANGGAL & DOKUMEN ASAL -->
                  <div style="font-size: 0.72rem; color: #888888; margin-bottom: 10px;">
                    ${item.isRegrafting ? `Regrafting: ${item.tanggal || 'Hari ini'} • Pool: ${item.regraftPoolDocNo || '-'}` : `Okulasi: ${item.tanggal || 'Hari ini'} • Asal: ${item.sourceDocNo || '-'}`}
                  </div>

                  <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 10px 0;" />

                  <!-- GRID DETAIL 2x2 -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 10px;">
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Klon Entres</div>
                      <div style="font-size: 0.84rem; font-weight: 800; color: #116834;">${item.klonEntres || 'PB 260'}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Lokasi Bedengan</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.bedengan || 'Bedengan 01'}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">${item.isRegrafting ? 'Populasi Regrafting' : 'Populasi Diokulasi'}</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #116834;">${item.populasiDiokulasi} Pkk</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Belum Diperiksa</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: ${item.sisaBelumDiperiksa > 0 ? '#D32F2F' : '#116834'};">${item.sisaBelumDiperiksa} Pkk</div>
                    </div>
                  </div>

                  <!-- TOMBOL TOGGLE EXPAND DETAIL -->
                  <div style="margin-bottom: 6px;">
                    <button type="button" class="btn-toggle-expand-insp" style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                      <span class="text-expand-insp">Tampilkan Detail Akumulasi</span>
                      <svg class="icon-expand-insp" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>

                  <!-- EXPANDABLE ACCORDION DETAIL AKUMULASI -->
                  <div class="insp-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; font-size: 0.74rem;">
                    
                    <!-- 1. DATA DASAR OKULASI (KIRI: LABEL, KANAN: NILAI) -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6B7280;">Klon Batang Bawah:</span>
                        <span style="font-weight: 700; color: #111827; text-align: right;">${item.klonRootstock || 'GT-01'}</span>
                      </div>
                      ${item.isRegrafting ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: #6B7280;">Pemeriksaan Asal:</span>
                          <span style="font-weight: 700; color: #111827; text-align: right;">${item.inspectionDocNo || '-'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: #6B7280;">Penyebab Okulasi Ulang:</span>
                          <span style="font-weight: 700; color: #D97706; text-align: right;">${item.alasan || 'Okulasi Ulang'}</span>
                        </div>
                      ` : `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: #6B7280;">Bibit Ditolak Okulasi:</span>
                          <span style="font-weight: 700; color: #D32F2F; text-align: right;">${item.jumlahDitolak || 0} Pkk</span>
                        </div>
                      `}
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6B7280;">Jumlah Kayu Okulasi:</span>
                        <span style="font-weight: 700; color: #111827; text-align: right;">${item.jumlahKayu || 0} Batang</span>
                      </div>
                    </div>

                    <!-- 2. REKAPITULASI AKUMULASI PEMERIKSAAN (BOX BERSIH & RAPI) -->
                    <div style="background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin: 10px 0; display: flex; flex-direction: column; gap: 6px;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #374151; font-weight: 600;">Telah Diperiksa:</span>
                        <span style="font-weight: 800; color: #111827; text-align: right;">${item.totalDiperiksa} Pkk</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #116834; font-weight: 600;">Berhasil:</span>
                        <span style="font-weight: 800; color: #116834; text-align: right;">${item.totalJadi} Pkk (${item.persenJadiDisplay})</span>
                      </div>
                      ${item.totalRegrafting > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: #D97706; font-weight: 600;">Okulasi Janda:</span>
                          <span style="font-weight: 800; color: #D97706; text-align: right;">${item.totalRegrafting} Pkk</span>
                        </div>
                      ` : ''}
                      ${item.totalSelection > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: #DC2626; font-weight: 600;">Gagal (Mati):</span>
                          <span style="font-weight: 800; color: #DC2626; text-align: right;">${item.totalSelection} Pkk</span>
                        </div>
                      ` : ''}
                    </div>

                    <!-- 3. RIWAYAT SESI PEMERIKSAAN -->
                    ${relatedInspections.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 6px; font-size: 0.74rem;">Riwayat Sesi Pemeriksaan (${relatedInspections.length}):</div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                          ${relatedInspections.map((insp, sIdx) => {
                            const sesiDiperiksa = parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
                            const sesiJadi = parseInt(insp.jumlahJadi || 0);
                            const sesiGagal = parseInt(insp.jumlahGagal || 0);
                            const sesiRegraft = insp.totalToRegrafting !== undefined ? parseInt(insp.totalToRegrafting || 0) : sesiGagal;
                            const sesiSeleksi = insp.totalToSelection !== undefined ? parseInt(insp.totalToSelection || 0) : Math.max(0, sesiGagal - sesiRegraft);
                            const sesiPersen = sesiDiperiksa > 0 ? (sesiGagal === 0 ? '100%' : `${((sesiJadi / sesiDiperiksa) * 100).toFixed(1)}%`) : '0%';
                            return `
                              <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                  <span style="font-weight: 700; color: #111827; font-size: 0.76rem;">Sesi ${sIdx + 1} <span style="font-weight: 500; color: #6B7280; font-size: 0.70rem;">(${insp.tanggal || 'Hari ini'})</span></span>
                                  <span style="font-weight: 700; color: #374151; font-size: 0.76rem; text-align: right;">${sesiDiperiksa} Pkk</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem;">
                                  <span style="color: #116834; font-weight: 600;">
                                    ${sesiJadi} Berhasil
                                    ${sesiRegraft > 0 ? `<span style="color: #D97706; margin-left: 4px;">/ ${sesiRegraft} Janda</span>` : ''}
                                    ${sesiSeleksi > 0 ? `<span style="color: #DC2626; margin-left: 4px;">/ ${sesiSeleksi} Mati</span>` : ''}
                                  </span>
                                  <span style="background: #E8F5E9; color: #116834; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid #C8E6C9; text-align: right;">${sesiPersen} Berhasil</span>
                                </div>
                              </div>
                            `;
                          }).join('')}
                        </div>
                      </div>
                    ` : ''}

                    <!-- 4. PEKERJA OKULASI -->
                    ${workers.length > 0 ? `
                      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 6px; font-size: 0.74rem;">Pekerja Okulasi:</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          ${workers.map(w => `
                            <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563;">
                              <span>• ${w.name} <span style="color: #9CA3AF;">(${w.code})</span></span>
                              <span style="font-weight: 700; color: #116834; text-align: right;">${w.qty || 0} Pkk</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>

                  <!-- FOOTER ACTION ROW -->
                  ${item.sisaBelumDiperiksa <= 0 ? `
                    <div class="card-action-periksa" data-index="${item.originalIndex}" data-completed="true" data-batch="${item.batchNo || 'Batch'}" data-total="${item.populasiDiokulasi}" style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #E5E7EB; cursor: pointer;">
                      <span style="font-size: 0.74rem; color: #116834; font-weight: 700;">✓ Pemeriksaan Selesai (100% Diperiksa)</span>
                      <div style="display: flex; align-items: center; gap: 4px; color: #116834; font-weight: 700; font-size: 0.74rem;">
                        <span>Selesai</span>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                  ` : `
                    <div class="card-action-periksa" data-index="${item.originalIndex}" data-completed="false" data-batch="${item.batchNo || 'Batch'}" data-total="${item.populasiDiokulasi}" style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #E5E7EB; cursor: pointer;">
                      <span style="font-size: 0.74rem; color: #116834; font-weight: 600;">Ketuk untuk Rekam Pemeriksaan</span>
                      <div style="display: flex; align-items: center; gap: 3px; color: #116834; font-weight: 700; font-size: 0.76rem;">
                        <span>Input Pemeriksaan</span>
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
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 6px 0;">Belum Ada Data Okulasi</h3>
            <p style="font-size: 0.78rem; color: #757575; margin: 0; line-height: 1.4;">
              Lakukan proses <strong>Okulasi (Grafting)</strong> terlebih dahulu agar data batch otomatis masuk ke tahap Pemeriksaan.
            </p>
          </div>
        `}

        <!-- HISTORI PEMERIKSAAN DENGAN MENU AKSI 3-DOTS (...) -->
        ${inspectionTxs.length > 0 ? `
          <div style="margin: 20px 0 10px 0;">
            <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0;">Ringkasan Data Pemeriksaan (${inspectionTxs.length})</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${inspectionTxs.map((insp, idx) => {
              const workerStats = insp.workers || [];
              const inspGagal = parseInt(insp.jumlahGagal || 0);
              const regraftTotal = insp.totalToRegrafting !== undefined ? parseInt(insp.totalToRegrafting || 0) : inspGagal;
              const selectionTotal = insp.totalToSelection !== undefined ? parseInt(insp.totalToSelection || 0) : Math.max(0, inspGagal - regraftTotal);
              const isRegraftInsp = insp.buddingType === 'REGRAFTING';

              return `
                <div class="card-insp-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); box-sizing: border-box; position: relative;">
                  
                  <!-- BARIS 1: JUDUL BATCH & TOMBOL AKSI 3-DOTS -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-weight: 800; font-size: 0.88rem; color: #111827;">${insp.batchNo || 'Batch'} - ${insp.klonEntres || 'PB 260'}</span>
                      <span style="font-size: 0.62rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: ${isRegraftInsp ? '#FFFBEB' : '#F0FDF4'}; color: ${isRegraftInsp ? '#B45309' : '#116834'}; border: ${isRegraftInsp ? '1px solid #FDE68A' : '1px solid #BBF7D0'};">
                        ${isRegraftInsp ? 'Regrafting' : 'Okulasi'}
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
                          <span class="text-menu-rincian">Rincian</span>
                        </button>
                        <button type="button" class="menu-action-edit" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #116834; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          <span>Edit</span>
                        </button>
                        <button type="button" class="menu-action-delete" data-index="${idx}" data-doc="${insp.docNo || ''}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- BARIS 2: LOKASI & TANGGAL -->
                  <div style="font-size: 0.72rem; color: #6B7280; margin-bottom: 8px;">
                    ${insp.bedengan || 'Bedengan 01'} • ${insp.tanggal || 'Hari ini'}
                  </div>

                  <!-- BARIS 3: METRIK STATISTIK SIMETRIS 3-KOLOM -->
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 7px 4px; text-align: center;">
                    <div>
                      <div style="font-size: 0.65rem; color: #6B7280;">Keberhasilan</div>
                      <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">${insp.persenJadi || 100}%</div>
                    </div>
                    <div>
                      <div style="font-size: 0.65rem; color: #116834;">Berhasil</div>
                      <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">${insp.jumlahJadi || 0} Pkk</div>
                    </div>
                    <div>
                      <div style="font-size: 0.65rem; color: ${regraftTotal > 0 ? '#D97706' : (selectionTotal > 0 ? '#DC2626' : '#6B7280')};">
                        ${regraftTotal > 0 ? 'Okulasi Janda' : 'Mati / Gagal'}
                      </div>
                      <div style="font-size: 0.82rem; font-weight: 800; color: ${regraftTotal > 0 ? '#D97706' : (selectionTotal > 0 ? '#DC2626' : '#6B7280')}; margin-top: 1px;">
                        ${regraftTotal > 0 ? regraftTotal : selectionTotal} Pkk
                      </div>
                    </div>
                  </div>

                  <!-- EXPANDABLE DETAILS TRANSAKSI PEMERIKSAAN -->
                  <div class="insp-summary-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-top: 8px; font-size: 0.74rem;">
                    
                    <!-- INFORMASI DOKUMEN & ALOKASI -->
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">No. Dokumen:</span>
                        <span style="font-weight: 700; color: #111;">${insp.docNo || `INSP/2026/0${idx+1}`}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Dokumen Okulasi:</span>
                        <span style="font-weight: 700; color: #111;">${insp.buddingDocNo || '-'}</span>
                      </div>
                      ${regraftTotal > 0 ? `
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #6B7280;">Alokasi Okulasi Janda:</span>
                          <span style="font-weight: 700; color: #D97706;">${regraftTotal} Pkk</span>
                        </div>
                      ` : ''}
                      ${selectionTotal > 0 ? `
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #6B7280;">Alokasi Penyeleksian:</span>
                          <span style="font-weight: 700; color: #DC2626;">${selectionTotal} Pkk</span>
                        </div>
                      ` : ''}
                      ${insp.catatan ? `
                        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                          <span style="color: #6B7280;">Catatan:</span>
                          <span style="color: #374151; font-style: italic; text-align: right;">${insp.catatan}</span>
                        </div>
                      ` : ''}
                    </div>

                    <!-- HASIL PER OKULATOR -->
                    ${workerStats.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 6px; font-size: 0.74rem;">Hasil per Okulator:</div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                          ${workerStats.map(w => `
                            <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 10px;">
                              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <div style="font-weight: 700; font-size: 0.80rem; color: #111827;">${w.name}</div>
                                <span style="font-size: 0.68rem; font-weight: 700; color: #116834; background: #E8F5E9; padding: 2px 6px; border-radius: 4px; border: 1px solid #C8E6C9;">
                                  ${w.persenBerhasil || 0}% Berhasil
                                </span>
                              </div>
                              
                              <!-- 4-KOLOM MATRIKS ANGKA PROFESIONAL & RAPI -->
                              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 0.68rem; text-align: center; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 4px; padding: 6px 2px;">
                                <div>
                                  <div style="color: #6B7280;">Diokulasi</div>
                                  <div style="font-weight: 700; color: #111827; margin-top: 2px;">${w.totalDiokulasi || 0} Pkk</div>
                                </div>
                                <div>
                                  <div style="color: #6B7280;">Diperiksa</div>
                                  <div style="font-weight: 700; color: #111827; margin-top: 2px;">${w.jlhDiperiksa || 0} Pkk</div>
                                </div>
                                <div>
                                  <div style="color: #116834;">Berhasil</div>
                                  <div style="font-weight: 800; color: #116834; margin-top: 2px;">${w.jlhBerhasil || 0} Pkk</div>
                                </div>
                                <div>
                                  <div style="color: #DC2626;">Gagal</div>
                                  <div style="font-weight: 800; color: ${(w.jlhTidakBerhasil || 0) > 0 ? '#DC2626' : '#9CA3AF'}; margin-top: 2px;">${w.jlhTidakBerhasil || 0} Pkk</div>
                                </div>
                              </div>
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

        <!-- MODAL DIALOG KONFIRMASI HAPUS -->
        <div id="modal-delete-insp-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000; backdrop-filter: blur(2px);"></div>
        
        <div id="dialog-delete-insp" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; padding: 20px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1001; text-align: center; box-sizing: border-box;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.02rem; font-weight: 800; color: #111111; margin: 0 0 6px 0;">Hapus Transaksi?</h3>
          <p id="dialog-delete-insp-msg" style="font-size: 0.78rem; color: #666666; margin: 0 0 18px 0; line-height: 1.45;">
            Apakah Anda yakin ingin menghapus data pemeriksaan ini? Data yang terhubung ke Okulasi Janda & Seleksi juga akan dibersihkan.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-delete-insp" type="button" style="flex: 1; height: 38px; background: #F3F4F6; color: #374151; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
              Batal
            </button>
            <button id="btn-confirm-delete-insp" type="button" style="flex: 1; height: 38px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
              Ya, Hapus
            </button>
          </div>
        </div>

        <!-- MODAL DIALOG JIKA BATCH TELAH 100% SELESAI DIPERIKSA -->
        <div id="modal-completed-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000; backdrop-filter: blur(2px);"></div>
        
        <div id="dialog-batch-completed" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; padding: 20px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1001; text-align: center; box-sizing: border-box;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #E8F5E9; color: #116834; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 style="font-size: 1.02rem; font-weight: 800; color: #111111; margin: 0 0 6px 0;">Pemeriksaan Selesai</h3>
          <p id="dialog-completed-desc" style="font-size: 0.78rem; color: #666666; margin: 0 0 18px 0; line-height: 1.45;">
            Seluruh populasi pada batch ini telah selesai diperiksa 100%. Tidak ada pemeriksaan yang perlu dilakukan lagi.
          </p>
          <button id="btn-close-completed-dialog" type="button" style="width: 100%; height: 42px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.86rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
            Tutup Pesan
          </button>
        </div>

      </main>
    </div>
  `;

  // Event Listener: Back button
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/home');
  });

  // Event Listener: Category Filter Tabs
  app.querySelectorAll('.btn-filter-insp-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const filter = e.currentTarget.dataset.filter;

      app.querySelectorAll('.btn-filter-insp-tab').forEach(t => {
        const isSelected = t === e.currentTarget;
        t.style.background = isSelected ? '#116834' : '#FFFFFF';
        t.style.color = isSelected ? '#FFFFFF' : '#374151';
        t.style.border = isSelected ? '1px solid #116834' : '1px solid #D1D5DB';
      });

      app.querySelectorAll('.card-inspection-wrapper').forEach(card => {
        const cardType = card.dataset.type;
        if (filter === 'ALL' || cardType === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Modal Completed Handlers
  const overlayCompleted = app.querySelector('#modal-completed-overlay');
  const dialogCompleted = app.querySelector('#dialog-batch-completed');
  const btnCloseCompleted = app.querySelector('#btn-close-completed-dialog');

  function closeCompletedDialog() {
    if (overlayCompleted) overlayCompleted.style.display = 'none';
    if (dialogCompleted) dialogCompleted.style.display = 'none';
  }

  if (btnCloseCompleted) btnCloseCompleted.addEventListener('click', closeCompletedDialog);
  if (overlayCompleted) overlayCompleted.addEventListener('click', closeCompletedDialog);

  // Event Listener: Expand / Collapse on Cards
  app.querySelectorAll('.card-inspection-wrapper').forEach(wrapper => {
    const btnToggle = wrapper.querySelector('.btn-toggle-expand-insp');
    const content = wrapper.querySelector('.insp-expand-content');
    const textSpan = wrapper.querySelector('.text-expand-insp');
    const icon = wrapper.querySelector('.icon-expand-insp');

    if (btnToggle && content) {
      btnToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        textSpan.textContent = isOpen ? 'Tampilkan Detail Akumulasi' : 'Sembunyikan Detail';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    }
  });

  // Event Listener: Expand / Collapse on Inspection Summary Cards
  app.querySelectorAll('.card-insp-summary-wrapper').forEach(wrapper => {
    const btnToggle = wrapper.querySelector('.btn-toggle-expand-insp-summary');
    const content = wrapper.querySelector('.insp-summary-expand-content');
    const textSpan = wrapper.querySelector('.text-expand-insp-summary');
    const icon = wrapper.querySelector('.icon-expand-insp-summary');

    if (btnToggle && content) {
      btnToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        textSpan.textContent = isOpen ? 'Tampilkan Rincian Pekerja' : 'Sembunyikan Rincian';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    }
  });

  // Event Listener: Action Rekam Pemeriksaan (dengan validasi blokir jika sudah selesai)
  app.querySelectorAll('.card-action-periksa').forEach(card => {
    card.addEventListener('click', (e) => {
      const isCompleted = e.currentTarget.dataset.completed === 'true';
      if (isCompleted) {
        const batchName = e.currentTarget.dataset.batch || 'Batch ini';
        const totalPop = e.currentTarget.dataset.total || '0';
        const descEl = app.querySelector('#dialog-completed-desc');
        if (descEl) {
          descEl.innerHTML = `Seluruh populasi pada <strong>${batchName}</strong> (${totalPop} Pkk) telah selesai diperiksa 100%.<br><br><strong>Tidak ada pemeriksaan yang perlu dilakukan lagi pada batch tersebut.</strong>`;
        }
        if (overlayCompleted) overlayCompleted.style.display = 'block';
        if (dialogCompleted) dialogCompleted.style.display = 'block';
        return;
      }

      const idx = e.currentTarget.dataset.index;
      storage.remove('editing_inspection_index');
      storage.set('selected_inspection_budding_index', idx);
      navigate('/inspection/form');
    });
  });

  // Event Listener: 3-Dots Action Menu Trigger
  app.querySelectorAll('.btn-tx-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-insp-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      
      // Close any other open menus
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
      const wrapper = e.currentTarget.closest('.card-insp-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      if (menu) menu.style.display = 'none';

      const content = wrapper?.querySelector('.insp-summary-expand-content');
      if (content) {
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  // Event Listener: Action Edit Data Pemeriksaan
  app.querySelectorAll('.menu-action-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.index);
      const targetInsp = inspectionTxs[idx];
      let bIdx = 0;
      if (targetInsp) {
        const found = buddingTxs.findIndex(b => b.docNo === targetInsp.buddingDocNo || b.batchNo === targetInsp.batchNo);
        if (found !== -1) bIdx = found;
        else if (targetInsp.buddingIndex !== undefined) bIdx = targetInsp.buddingIndex;
      }
      storage.set('editing_inspection_index', idx);
      storage.set('selected_inspection_budding_index', bIdx);
      navigate('/inspection/form');
    });
  });

  // Event Listener: Action Delete Inspection Transaction
  const modalDeleteOverlay = app.querySelector('#modal-delete-insp-overlay');
  const dialogDelete = app.querySelector('#dialog-delete-insp');
  const btnCancelDelete = app.querySelector('#btn-cancel-delete-insp');
  const btnConfirmDelete = app.querySelector('#btn-confirm-delete-insp');
  const deleteMsg = app.querySelector('#dialog-delete-insp-msg');

  let pendingDeleteIndex = null;
  let pendingDeleteDocNo = null;

  function closeDeleteDialog() {
    if (modalDeleteOverlay) modalDeleteOverlay.style.display = 'none';
    if (dialogDelete) dialogDelete.style.display = 'none';
    pendingDeleteIndex = null;
    pendingDeleteDocNo = null;
  }

  btnCancelDelete?.addEventListener('click', closeDeleteDialog);
  modalDeleteOverlay?.addEventListener('click', closeDeleteDialog);

  app.querySelectorAll('.menu-action-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-insp-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      if (menu) menu.style.display = 'none';

      pendingDeleteIndex = parseInt(e.currentTarget.dataset.index);
      pendingDeleteDocNo = e.currentTarget.dataset.doc;
      if (deleteMsg) {
        deleteMsg.textContent = `Apakah Anda yakin ingin menghapus data pemeriksaan "${pendingDeleteDocNo}"? Data turunan yang masuk ke Okulasi Janda & Seleksi dari dokumen ini juga akan dibersihkan.`;
      }
      if (modalDeleteOverlay) modalDeleteOverlay.style.display = 'block';
      if (dialogDelete) dialogDelete.style.display = 'block';
    });
  });

  btnConfirmDelete?.addEventListener('click', () => {
    let currentInspTxs = storage.get('inspection_transactions', []);
    let currentRegraftPool = storage.get('regrafting_pool', []);
    let currentSelPool = storage.get('selection_pool', []);

    if (pendingDeleteIndex !== null) {
      const docToDelete = pendingDeleteDocNo || currentInspTxs[pendingDeleteIndex]?.docNo;
      currentInspTxs.splice(pendingDeleteIndex, 1);
      
      if (docToDelete) {
        currentRegraftPool = currentRegraftPool.filter(r => r.inspectionDocNo !== docToDelete);
        currentSelPool = currentSelPool.filter(s => s.inspectionDocNo !== docToDelete);
      }
    }

    storage.set('inspection_transactions', currentInspTxs);
    storage.set('regrafting_pool', currentRegraftPool);
    storage.set('selection_pool', currentSelPool);

    closeDeleteDialog();
    renderInspectionLanding();
  });
}
