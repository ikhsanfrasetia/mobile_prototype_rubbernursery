import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderBuddingRegrafting() {
  const app = document.getElementById('app');

  // Load regrafting pool from storage
  let regraftPool = storage.get('regrafting_pool', []);
  const allBuddingTxs = storage.get('budding_transactions', []);
  const regraftTxs = allBuddingTxs.filter(b => b.type === 'REGRAFTING');
  const inspectionTxs = storage.get('inspection_transactions', []);

  // AUTO-SYNC: Ensure all inspections with Regrafting allocation are present in regraftPool
  inspectionTxs.forEach((insp, i) => {
    const gagal = parseInt(insp.jumlahGagal || 0);
    const toRegraft = insp.totalToRegrafting !== undefined ? parseInt(insp.totalToRegrafting || 0) : gagal;
    if (toRegraft > 0) {
      const exists = regraftPool.some(p => p.inspectionDocNo === insp.docNo || (p.batchNo === insp.batchNo && p.sourceBuddingDocNo === insp.buddingDocNo));
      if (!exists) {
        regraftPool.push({
          docNo: `REG-POOL/2026/0${regraftPool.length + 1}`,
          inspectionDocNo: insp.docNo,
          batchNo: insp.batchNo || `Batch-0${i + 1}`,
          sourceBuddingDocNo: insp.buddingDocNo,
          tanggal: insp.tanggal || 'Hari ini',
          bedengan: insp.bedengan || 'Bedengan 01',
          klonRootstock: insp.klonRootstock || 'GT-01',
          klonAwal: insp.klonEntres || 'PB 260',
          jumlah: toRegraft,
          sisaRegrafting: toRegraft,
          status: 'READY_TO_REGRAFT'
        });
      }
    }
  });

  // AUTO-SYNC: Ensure any existing Regrafting transaction has its parent document in regraftPool
  regraftTxs.forEach((rtx, i) => {
    const exists = regraftPool.some(p => (rtx.regraftPoolDocNo && p.docNo === rtx.regraftPoolDocNo) || (rtx.inspectionDocNo && p.inspectionDocNo === rtx.inspectionDocNo) || (p.batchNo === rtx.batchNo));
    if (!exists) {
      const totalPop = parseInt(rtx.jumlah || 0) + parseInt(rtx.jumlahDitolak || 0);
      regraftPool.push({
        docNo: rtx.regraftPoolDocNo || `REG-POOL/2026/0${regraftPool.length + 1}`,
        inspectionDocNo: rtx.inspectionDocNo || `INSP/2026/0${i + 1}`,
        batchNo: rtx.batchNo || `Batch-0${i + 1}`,
        sourceBuddingDocNo: rtx.sourceBuddingDocNo || `OKL/2026/0${i + 1}`,
        tanggal: rtx.tanggal || 'Hari ini',
        bedengan: rtx.bedengan || 'Bedengan 01',
        klonRootstock: rtx.klonRootstock || 'GT-01',
        klonAwal: rtx.klonAwal || rtx.klonEntres || 'PB 260',
        jumlah: totalPop,
        sisaRegrafting: 0,
        status: 'READY_TO_REGRAFT'
      });
    }
  });

  storage.set('regrafting_pool', regraftPool);

  const processedRegraftPool = regraftPool.map((poolItem, idx) => {
    const batchNo = poolItem.batchNo || `Batch-0${idx + 1}`;
    const docNo = poolItem.docNo || `REG-POOL/2026/0${idx + 1}`;
    const populasiGagal = parseInt(poolItem.jumlah || 0);

    // Calculate accumulated done regraftings for this parent batch
    let ttlRegrafted = 0;
    let ttlDitolak = 0;
    let ttlKayu = 0;
    const relatedRegrafts = regraftTxs.filter(r => r.regraftPoolDocNo === docNo || r.inspectionDocNo === poolItem.inspectionDocNo || r.batchNo === batchNo);
    
    relatedRegrafts.forEach(r => {
      ttlRegrafted += parseInt(r.jumlah || 0);
      ttlDitolak += parseInt(r.jumlahDitolak || 0);
      ttlKayu += parseInt(r.jumlahKayu || 0);
    });

    const totalRealisasi = ttlRegrafted + ttlDitolak;
    const sisaBelumRegraft = Math.max(0, populasiGagal - totalRealisasi);
    const persenSelesai = populasiGagal > 0 ? Math.min(100, Math.round((totalRealisasi / populasiGagal) * 100)) : 0;

    // Status badge
    let statusBadgeText = 'Perlu Okulasi Ulang';
    let statusBadgeBg = '#E53935';
    let statusBadgeColor = '#FFFFFF';
    let statusBadgeBorder = 'none';

    if (totalRealisasi === 0) {
      statusBadgeText = 'Perlu Okulasi Ulang';
      statusBadgeBg = '#E53935';
      statusBadgeColor = '#FFFFFF';
    } else if (sisaBelumRegraft <= 0) {
      statusBadgeText = 'Selesai Regrafting';
      statusBadgeBg = '#E8F5E9';
      statusBadgeColor = '#116834';
      statusBadgeBorder = '1px solid #116834';
    } else {
      statusBadgeText = `Sisa ${sisaBelumRegraft} Pkk`;
      statusBadgeBg = '#FFF8E1';
      statusBadgeColor = '#F57F17';
      statusBadgeBorder = '1px solid #FFE082';
    }

    return {
      poolItem,
      originalIndex: idx,
      batchNo,
      docNo,
      populasiGagal,
      relatedRegrafts,
      ttlRegrafted,
      ttlDitolak,
      ttlKayu,
      totalRealisasi,
      sisaBelumRegraft,
      persenSelesai,
      statusBadgeText,
      statusBadgeBg,
      statusBadgeColor,
      statusBadgeBorder
    };
  });

  // Urutkan: Dokumen yang perlu okulasi ulang / belum selesai paling ATAS, yang sudah selesai di BAWAH
  processedRegraftPool.sort((a, b) => {
    const aNeed = a.sisaBelumRegraft > 0;
    const bNeed = b.sisaBelumRegraft > 0;
    if (aNeed !== bNeed) return aNeed ? -1 : 1;
    const aPerlu = a.statusBadgeText === 'Perlu Okulasi Ulang';
    const bPerlu = b.statusBadgeText === 'Perlu Okulasi Ulang';
    if (aPerlu !== bPerlu) return aPerlu ? -1 : 1;
    return 0;
  });

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
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 6px; letter-spacing: -0.01em;">Okulasi Janda (Regrafting)</h1>
        </div>
      </header>

      <!-- MAIN CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        <div style="margin-bottom: 12px;">
          <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Daftar Bibit Gagal Okulasi (Siap Regrafting)</h2>
        </div>

        ${processedRegraftPool.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            ${processedRegraftPool.map((item) => {
              const { poolItem, originalIndex, batchNo, docNo, populasiGagal, relatedRegrafts, ttlRegrafted, ttlDitolak, ttlKayu, totalRealisasi, sisaBelumRegraft, persenSelesai, statusBadgeText, statusBadgeBg, statusBadgeColor, statusBadgeBorder } = item;
              const idx = originalIndex;

              return `
                <div class="card-regraft-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  
                  <!-- CARD HEADER: NOMOR BATCH & BADGE STATUS -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 8px;">
                    <div style="font-size: 0.95rem; font-weight: 800; color: #116834; white-space: nowrap; letter-spacing: -0.01em;">
                      ${batchNo}
                    </div>
                    <span style="background: ${statusBadgeBg}; color: ${statusBadgeColor}; font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; white-space: nowrap; border: ${statusBadgeBorder}; flex-shrink: 0;">
                      ${statusBadgeText}
                    </span>
                  </div>

                  <!-- CARD INFO: DOKUMEN & ASAL -->
                  <div style="font-size: 0.82rem; font-weight: 700; color: #111111; margin-bottom: 2px;">
                    ${docNo}
                  </div>
                  <div style="font-size: 0.72rem; color: #888888; margin-bottom: 10px;">
                    Pemeriksaan Asal: ${poolItem.inspectionDocNo || '-'}
                  </div>

                  <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 10px 0;" />

                  <!-- GRID DETAIL 2x2 -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 10px;">
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Klon Awal (Gagal)</div>
                      <div style="font-size: 0.84rem; font-weight: 800; color: #D32F2F;">${poolItem.klonAwal || 'IRR 215'}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Lokasi Bedengan</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${poolItem.bedengan || 'Bedengan 01'}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Populasi Gagal Okulasi</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #D32F2F;">${populasiGagal} Pkk</div>
                    </div>
                    <div>
                      <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Sisa Belum Regrafting</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: ${sisaBelumRegraft > 0 ? '#D32F2F' : '#116834'};">${sisaBelumRegraft} Pkk</div>
                    </div>
                  </div>

                  <!-- TOMBOL TOGGLE EXPAND DETAIL AKUMULASI -->
                  <div style="margin-bottom: 6px;">
                    <button type="button" class="btn-toggle-expand-regraft" style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                      <span class="text-expand-regraft">Tampilkan Detail Akumulasi</span>
                      <svg class="icon-expand-regraft" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>

                  <!-- EXPANDABLE ACCORDION DETAIL AKUMULASI -->
                  <div class="regraft-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; font-size: 0.74rem;">
                    
                    <!-- 1. DATA DASAR ALOKASI (KIRI: LABEL, KANAN: NILAI) -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6B7280;">Klon Batang Bawah:</span>
                        <span style="font-weight: 700; color: #111827; text-align: right;">${poolItem.klonRootstock || 'GT1'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6B7280;">Dokumen Pemeriksaan:</span>
                        <span style="font-weight: 700; color: #111827; text-align: right;">${poolItem.inspectionDocNo || '-'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6B7280;">Alasan Okulasi Janda:</span>
                        <span style="font-weight: 700; color: #D97706; text-align: right;">${poolItem.alasan || 'Gagal Okulasi Pertama (Perlu Regrafting)'}</span>
                      </div>
                    </div>

                    <!-- 2. REKAPITULASI AKUMULASI REGRAFTING (BOX BERSIH & RAPI) -->
                    <div style="background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin: 10px 0; display: flex; flex-direction: column; gap: 6px;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #374151; font-weight: 600;">Total Populasi Gagal:</span>
                        <span style="font-weight: 800; color: #DC2626; text-align: right;">${populasiGagal} Pkk</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #116834; font-weight: 600;">Total Telah Di-Regrafting:</span>
                        <span style="font-weight: 800; color: #116834; text-align: right;">${ttlRegrafted} Pkk (${persenSelesai}%)</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6B7280; font-weight: 600;">Total Bibit Ditolak:</span>
                        <span style="font-weight: 800; color: #111827; text-align: right;">${ttlDitolak} Pkk</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6B7280; font-weight: 600;">Total Kayu Entres Digunakan:</span>
                        <span style="font-weight: 800; color: #111827; text-align: right;">${ttlKayu} Batang</span>
                      </div>
                    </div>

                    <!-- 3. RIWAYAT SESI OKULASI JANDA -->
                    ${relatedRegrafts.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 6px; font-size: 0.74rem;">Riwayat Transaksi Regrafting (${relatedRegrafts.length}):</div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                          ${relatedRegrafts.map((rtx, sIdx) => `
                            <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                              <div>
                                <span style="font-weight: 700; color: #111827; font-size: 0.76rem;">Sesi ${sIdx + 1} - ${rtx.klonEntres || 'PB 260'}</span>
                                <div style="font-size: 0.70rem; color: #6B7280; margin-top: 2px;">${rtx.tanggal || 'Hari ini'} • ${rtx.docNo || `OKL/REG/0${sIdx+1}`}</div>
                              </div>
                              <span style="font-weight: 800; color: #116834; font-size: 0.80rem; text-align: right;">${rtx.jumlah || 0} Pkk</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}

                  </div>

                  <!-- FOOTER ACTION ROW -->
                  ${sisaBelumRegraft <= 0 ? `
                    <div class="card-action-regraft" data-index="${idx}" data-completed="true" data-batch="${batchNo}" data-total="${populasiGagal}" style="display: flex; justify-content: space-between; align-items: center; background: #E8F5E9; border: 1px solid #C8E6C9; border-radius: 6px; padding: 8px 12px; margin-top: 10px; cursor: default;">
                      <span style="font-size: 0.74rem; color: #116834; font-weight: 700;">✓ Selesai Regrafting (100% Selesai)</span>
                      <div style="display: flex; align-items: center; gap: 4px; color: #116834; font-weight: 700; font-size: 0.74rem;">
                        <span>Selesai</span>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                  ` : `
                    <div class="card-action-regraft" data-index="${idx}" data-completed="false" data-batch="${batchNo}" data-total="${populasiGagal}" style="display: flex; justify-content: space-between; align-items: center; background: #116834; color: #FFFFFF; border-radius: 6px; padding: 10px 14px; margin-top: 10px; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.22); transition: opacity 0.15s ease;">
                      <span style="font-size: 0.78rem; color: #FFFFFF; font-weight: 700; letter-spacing: -0.01em;">Ketuk untuk Rekam Okulasi Janda</span>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
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
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 6px 0;">Belum Ada Bibit Siap Regrafting</h3>
            <p style="font-size: 0.78rem; color: #757575; margin: 0; line-height: 1.4;">
              Saat hasil Pemeriksaan Okulasi memiliki bibit tidak berhasil dan opsi <strong>"Perlu Okulasi Janda"</strong> dicentang, data otomatis akan masuk ke sini.
            </p>
          </div>
        `}

        <!-- HISTORI / RINGKASAN DATA REGRAFTING DENGAN MENU AKSI 3-DOTS (...) -->
        ${regraftTxs.length > 0 ? `
          <div style="margin: 20px 0 10px 0;">
            <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0;">Ringkasan Data Okulasi Janda (${regraftTxs.length})</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${regraftTxs.map((rtx, rIdx) => {
              const originalIndex = allBuddingTxs.indexOf(rtx);
              const workersList = rtx.workers || [];

              return `
                <div class="card-regraft-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); position: relative;">
                  
                  <!-- BARIS 1: JUDUL BATCH & TOMBOL AKSI 3-DOTS -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span style="font-weight: 800; font-size: 0.86rem; color: #111827;">${rtx.batchNo || 'Batch'}</span>
                      <span style="color: #9CA3AF; font-size: 0.80rem;">-</span>
                      <span style="font-weight: 700; font-size: 0.84rem; color: #374151;">${rtx.klonEntres || rtx.klon || 'PB 260'}</span>
                      <span style="font-size: 0.62rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A;">
                        Okulasi Janda
                      </span>
                    </div>

                    <!-- TOMBOL AKSI 3-DOTS -->
                    <div style="position: relative;">
                      <button type="button" class="btn-tx-action-trigger" data-index="${rIdx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>

                      <!-- DROPDOWN POPUP MENU -->
                      <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 130px; overflow: hidden;">
                        <button type="button" class="menu-action-rincian" data-index="${rIdx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          <span>Rincian</span>
                        </button>
                        <button type="button" class="menu-action-edit-regraft" data-original-index="${originalIndex >= 0 ? originalIndex : rIdx}" data-pool-doc="${rtx.regraftPoolDocNo || ''}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #116834; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          <span>Edit</span>
                        </button>
                        <button type="button" class="menu-action-delete-regraft" data-original-index="${originalIndex >= 0 ? originalIndex : rIdx}" data-doc="${rtx.docNo || ''}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- BARIS 2: LOKASI & TANGGAL -->
                  <div style="font-size: 0.72rem; color: #6B7280; margin-bottom: 8px;">
                    ${rtx.bedengan || 'Bedengan 01'} • ${rtx.tanggal || 'Hari ini'}
                  </div>

                  <!-- BARIS 3: METRIK STATISTIK SIMETRIS 2-KOLOM -->
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 7px 4px; text-align: center;">
                    <div>
                      <div style="font-size: 0.65rem; color: #116834;">Total Diokulasi Janda</div>
                      <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">${rtx.jumlah || 0} Pkk</div>
                    </div>
                    <div>
                      <div style="font-size: 0.65rem; color: #6B7280;">Kayu Okulasi</div>
                      <div style="font-size: 0.82rem; font-weight: 800; color: #374151; margin-top: 1px;">${rtx.jumlahKayu || 0} Batang</div>
                    </div>
                  </div>

                  <!-- EXPANDABLE CONTENT DETAIL TRANSAKSI REGRAFTING -->
                  <div class="regraft-summary-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-top: 8px; font-size: 0.74rem;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">No. Dokumen:</span>
                        <span style="font-weight: 700; color: #111;">${rtx.docNo || `OKL/REG/2026/0${rIdx+1}`}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Dokumen Alokasi:</span>
                        <span style="font-weight: 700; color: #111;">${rtx.regraftPoolDocNo || '-'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Pemeriksaan Asal:</span>
                        <span style="font-weight: 700; color: #111;">${rtx.inspectionDocNo || '-'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Batang Bawah:</span>
                        <span style="font-weight: 700; color: #111;">${rtx.klonRootstock || 'GT1'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Alasan Okulasi:</span>
                        <span style="font-weight: 700; color: #D97706;">${rtx.alasan || 'Okulasi Ulang'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #6B7280;">Kayu Okulasi:</span>
                        <span style="font-weight: 700; color: #111;">${rtx.jumlahKayu || 0} Batang</span>
                      </div>
                      ${parseInt(rtx.jumlahDitolak || 0) > 0 ? `
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #6B7280;">Bibit Ditolak:</span>
                          <span style="font-weight: 700; color: #D32F2F;">${rtx.jumlahDitolak} Pkk</span>
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

      <!-- DIALOG MODAL: BATCH SELESAI -->
      <div id="modal-overlay-regraft" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>
      
      <div id="dialog-regraft-completed" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; z-index: 101; padding: 20px 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); box-sizing: border-box; text-align: center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #E8F5E9; color: #116834; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 id="dialog-regraft-title" style="font-size: 1rem; font-weight: 700; color: #111827; margin: 0 0 6px 0;">Okulasi Janda Selesai</h3>
        <p id="dialog-regraft-msg" style="font-size: 0.78rem; color: #6B7280; margin: 0 0 16px 0; line-height: 1.4;">
          Seluruh sisa populasi pada dokumen alokasi ini telah selesai diokulasi ulang 100%.
        </p>
        <button id="btn-close-regraft-completed" type="button" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
          Tutup
        </button>
      </div>
    </div>
  `;

  // Event Listener: Back button
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/budding');
  });

  // Modal Completed Handlers
  const overlayRegraft = app.querySelector('#modal-overlay-regraft');
  const dialogRegraft = app.querySelector('#dialog-regraft-completed');
  const btnCloseRegraft = app.querySelector('#btn-close-regraft-completed');

  function closeRegraftDialog() {
    if (overlayRegraft) overlayRegraft.style.display = 'none';
    if (dialogRegraft) dialogRegraft.style.display = 'none';
  }

  if (btnCloseRegraft) btnCloseRegraft.addEventListener('click', closeRegraftDialog);
  if (overlayRegraft) overlayRegraft.addEventListener('click', closeRegraftDialog);

  // Event Listener: Expand / Collapse on Cards (Detail Akumulasi)
  app.querySelectorAll('.card-regraft-wrapper').forEach(wrapper => {
    const btnToggle = wrapper.querySelector('.btn-toggle-expand-regraft');
    const content = wrapper.querySelector('.regraft-expand-content');
    const textSpan = wrapper.querySelector('.text-expand-regraft');
    const icon = wrapper.querySelector('.icon-expand-regraft');

    if (btnToggle && content) {
      btnToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        if (textSpan) textSpan.textContent = isOpen ? 'Tampilkan Detail Akumulasi' : 'Sembunyikan Detail';
        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    }
  });

  // Event Listener: Action Rekam Okulasi Janda
  app.querySelectorAll('.card-action-regraft').forEach(card => {
    card.addEventListener('click', (e) => {
      const isCompleted = e.currentTarget.dataset.completed === 'true';
      if (isCompleted) {
        const poolDoc = e.currentTarget.dataset.poolDoc || 'Dokumen ini';
        const totalPop = e.currentTarget.dataset.total || '0';
        const msgEl = app.querySelector('#dialog-regraft-msg');
        if (msgEl) {
          msgEl.innerHTML = `Seluruh populasi pada <strong>${poolDoc}</strong> (${totalPop} Pkk) telah selesai diokulasi ulang 100%.<br><br><strong>Tidak ada data yang perlu diinput lagi pada dokumen alokasi tersebut.</strong>`;
        }
        if (overlayRegraft) overlayRegraft.style.display = 'block';
        if (dialogRegraft) dialogRegraft.style.display = 'block';
        return;
      }

      const idx = e.currentTarget.dataset.index;
      storage.remove('editing_budding_index');
      storage.set('selected_regraft_index', idx);
      storage.set('budding_type', 'REGRAFTING');
      navigate('/budding/grafting/form');
    });
  });

  // Event Listener: 3-Dots Action Menu Trigger on Summary Cards
  app.querySelectorAll('.btn-tx-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-regraft-summary-wrapper');
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
      const wrapper = e.currentTarget.closest('.card-regraft-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      if (menu) menu.style.display = 'none';

      const content = wrapper?.querySelector('.regraft-summary-expand-content');
      if (content) {
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  // Event Listener: Action Edit Okulasi Janda on Transaction Cards
  app.querySelectorAll('.menu-action-edit-regraft').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const origIdx = parseInt(e.currentTarget.dataset.originalIndex);
      const poolDoc = e.currentTarget.dataset.poolDoc;
      
      let poolIdx = regraftPool.findIndex(p => p.docNo === poolDoc);
      if (poolIdx < 0) poolIdx = 0;

      storage.set('editing_budding_index', origIdx);
      storage.set('selected_regraft_index', poolIdx);
      storage.set('budding_type', 'REGRAFTING');
      navigate('/budding/grafting/form');
    });
  });

  // Event Listener: Action Delete Okulasi Janda
  app.querySelectorAll('.menu-action-delete-regraft').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-regraft-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      if (menu) menu.style.display = 'none';

      const origIdx = parseInt(e.currentTarget.dataset.originalIndex);
      const doc = e.currentTarget.dataset.doc;
      if (confirm(`Apakah Anda yakin ingin menghapus transaksi okulasi janda "${doc}"?`)) {
        let allTxs = storage.get('budding_transactions', []);
        const actualIdx = allTxs.findIndex(b => b.docNo === doc);
        if (actualIdx !== -1) {
          allTxs.splice(actualIdx, 1);
        } else if (origIdx >= 0) {
          allTxs.splice(origIdx, 1);
        }
        storage.set('budding_transactions', allTxs);
        renderBuddingRegrafting();
      }
    });
  });
}
