import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { formatStandardDocNo } from '../../core/utils.js';
import { normalizeKlonName } from '../../data/klon-master.js';

/**
 * Format string atau kode Bedengan agar seragam menjadi Kode Bedengan (misal: BED-001, BED-002)
 */
export function formatBedenganCode(bedengan, bedenganCode) {
  if (bedenganCode) {
    const codeStr = String(bedenganCode).trim();
    if (/^BED-\d+/i.test(codeStr)) return codeStr.toUpperCase();
    const m = codeStr.match(/(\d+)/);
    if (m) return `BED-${String(m[1]).padStart(3, '0')}`;
    return codeStr;
  }
  if (!bedengan) return '';
  const str = String(bedengan).trim();
  if (/^BED-\d+/i.test(str)) {
    return str.toUpperCase();
  }
  const match = str.match(/Bedengan[- ]*(\d+)/i);
  if (match) {
    return `BED-${String(match[1]).padStart(3, '0')}`;
  }
  return str;
}

export function renderBuddingGrafting() {
  const app = document.getElementById('app');

  // Load Seleksi III FINAL documents (Rootstock population source)
  const allSelectionDocs = storage.get('pre_grafting_selection_documents', []);
  const seleksi3FinalDocs = allSelectionDocs.filter(d => 
    (d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3') &&
    (d.selectionType === 'PRA_OKULASI' || !d.selectionType) &&
    d.status === 'DISETUJUI' &&
    Boolean(d.isFinal)
  );
  const buddingTxs = storage.get('budding_transactions', []).filter(b => b.type === 'GRAFTING' || !b.type);

  // Process and sort batches: yang belum selesai (Perlu Diokulasi) di ATAS, yang sudah selesai (Selesai Diokulasi) di BAWAH
  const processedBatchList = seleksi3FinalDocs.map((s3Doc, idx) => {
    const batchNo = s3Doc.batchCode || s3Doc.batchNo || `Batch-0${idx + 1}`;
    const docNo = s3Doc.docNo || formatStandardDocNo(2026, 'SEL-III', idx + 1);
    const populasiBibit = parseInt(
      s3Doc.totalLayak !== undefined
        ? s3Doc.totalLayak
        : (s3Doc.finalBibitQty !== undefined ? s3Doc.finalBibitQty : (s3Doc.currentBibitQty || 0)),
      10
    );

    // Calculate accumulated budding for this Seleksi III FINAL document
    let ttlDiokulasi = 0;
    let ttlDitolak = 0;
    let ttlKayu = 0;
    const relatedBuddings = buddingTxs.filter(b => 
      (b.sourceSelection3DocNo && b.sourceSelection3DocNo === docNo) ||
      (b.sourceSelection3DocumentId && s3Doc.id && b.sourceSelection3DocumentId === s3Doc.id) ||
      (b.sourceDocNo && b.sourceDocNo === docNo) ||
      (b.batchNo === batchNo && !b.sourceSelection3DocNo && !b.sourceDocNo)
    );
    relatedBuddings.forEach(b => {
      ttlDiokulasi += parseInt(b.jumlah || 0);
      ttlDitolak += parseInt(b.jumlahDitolak || 0);
      ttlKayu += parseInt(b.jumlahKayu || 0);
    });

    const totalRealisasi = ttlDiokulasi + ttlDitolak;
    const sisaBelumOkulasi = Math.max(0, populasiBibit - totalRealisasi);
    const persenSelesai = populasiBibit > 0 ? Math.min(100, Math.round((totalRealisasi / populasiBibit) * 100)) : 0;
    const isCompleted = sisaBelumOkulasi <= 0 && populasiBibit > 0;

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

    // Extract bedengan rows (Tampilkan Kode Bedengan: BED-001, BED-002, dst)
    const rows = s3Doc.rows || [];
    const bedenganCodes = rows.map(r => formatBedenganCode(r.bedengan, r.bedenganCode)).filter(Boolean);
    const bedenganDisplay = bedenganCodes.length > 0 ? Array.from(new Set(bedenganCodes)).join(', ') : (formatBedenganCode(s3Doc.bedengan, s3Doc.bedenganCode) || 'BED-001');

    return {
      s3Doc,
      originalIdx: idx,
      batchNo,
      docNo,
      populasiBibit,
      ttlDiokulasi,
      ttlDitolak,
      ttlKayu,
      relatedBuddings,
      totalRealisasi,
      sisaBelumOkulasi,
      persenSelesai,
      isCompleted,
      statusBadgeText,
      statusBadgeBg,
      statusBadgeColor,
      statusBadgeBorder,
      bedenganDisplay
    };
  });

  // Urutkan: Dokumen/Batch yang belum selesai paling ATAS, yang sudah selesai paling BAWAH
  processedBatchList.sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0;
    return a.isCompleted ? 1 : -1;
  });

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

        ${processedBatchList.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            ${processedBatchList.map((item) => {
              const {
                s3Doc,
                originalIdx,
                batchNo,
                docNo,
                populasiBibit,
                ttlDiokulasi,
                ttlDitolak,
                ttlKayu,
                relatedBuddings,
                totalRealisasi,
                sisaBelumOkulasi,
                persenSelesai,
                statusBadgeText,
                statusBadgeBg,
                statusBadgeColor,
                statusBadgeBorder,
                bedenganDisplay
              } = item;
              const rows = s3Doc.rows || [];

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
                  <div style="font-size: 0.72rem; color: #6B7280; margin-bottom: 10px;">
                    Dokumen Seleksi III FINAL • Disetujui Asisten Bibitan
                  </div>

                  <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 10px 0;" />

                  <!-- GRID DETAIL 2x2 -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 12px;">
                    <div>
                      <div style="font-size: 0.70rem; color: #6B7280; margin-bottom: 2px;">Klon Batang Bawah</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #111827; line-height: 1.3;">${s3Doc.klon ? normalizeKlonName(s3Doc.klon) : (s3Doc.clone ? normalizeKlonName(s3Doc.clone) : 'GT 1')}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.70rem; color: #6B7280; margin-bottom: 2px;">Lokasi Bedengan</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #111827; line-height: 1.35; word-break: break-word;">${bedenganDisplay}</div>
                    </div>
                    <div>
                      <div style="font-size: 0.70rem; color: #6B7280; margin-bottom: 2px;">Populasi Siap Okulasi (Layak)</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #116834; line-height: 1.3;">${populasiBibit.toLocaleString('id-ID')} Pkk</div>
                    </div>
                    <div>
                      <div style="font-size: 0.70rem; color: #6B7280; margin-bottom: 2px;">Belum Diokulasi</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: ${sisaBelumOkulasi > 0 ? '#D32F2F' : '#116834'}; line-height: 1.3;">${sisaBelumOkulasi.toLocaleString('id-ID')} Pkk</div>
                    </div>
                  </div>

                  <!-- TOMBOL TOGGLE EXPAND DETAIL -->
                  <div style="margin-bottom: 8px;">
                    <button type="button" class="btn-toggle-expand-batch" style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                      <span class="text-expand-batch">Tampilkan Detail</span>
                      <svg class="icon-expand-batch" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>

                  <!-- EXPANDABLE ACCORDION DETAIL (LOCATED DIRECTLY BELOW BUTTON) -->
                  <div class="batch-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; font-size: 0.74rem; line-height: 1.45;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px;">
                      <span style="color: #6B7280; flex-shrink: 0;">Program Nursery:</span>
                      <span style="font-weight: 700; color: #111827; text-align: right; word-break: break-word;">${s3Doc.programCode || s3Doc.programName || s3Doc.program || 'PRG/NUR/01/2026'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px;">
                      <span style="color: #6B7280; flex-shrink: 0;">Tahapan Pertumbuhan:</span>
                      <span style="font-weight: 700; color: #111827; text-align: right; word-break: break-word;">${(s3Doc.tahapan || s3Doc.growthStage || 'Rubber Main Nursery').replace(/\s*\(Seleksi\s*III\s*-\s*Stadia\s*15-16\s*Minggu\)/gi, '').replace(/\s*\(Seleksi\s*III\s*FINAL\)/gi, '').trim() || 'Rubber Main Nursery'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px;">
                      <span style="color: #6B7280; flex-shrink: 0;">Total Diokulasi SDHI:</span>
                      <span style="font-weight: 700; color: #116834; text-align: right; word-break: break-word;">${ttlDiokulasi.toLocaleString('id-ID')} Pkk (${persenSelesai}%)</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px;">
                      <span style="color: #6B7280; flex-shrink: 0;">Total Bibit Ditolak:</span>
                      <span style="font-weight: 700; color: #D32F2F; text-align: right; word-break: break-word;">${ttlDitolak.toLocaleString('id-ID')} Pkk</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px;">
                      <span style="color: #6B7280; flex-shrink: 0;">Total Kayu Entres Dipakai:</span>
                      <span style="font-weight: 700; color: #111827; text-align: right; word-break: break-word;">${ttlKayu.toLocaleString('id-ID')} Batang</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px;">
                      <span style="color: #6B7280; flex-shrink: 0;">Ref. Dokumen Seleksi II:</span>
                      <span style="font-weight: 700; color: #111827; text-align: right; word-break: break-word;">${s3Doc.sourceSelectionDocNo || s3Doc.sourceDocNo || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px;">
                      <span style="color: #6B7280; flex-shrink: 0;">Ref. Dokumen Penyemaian:</span>
                      <span style="font-weight: 700; color: #111827; text-align: right; word-break: break-word;">${s3Doc.sourceSeedingDocNo || '-'}</span>
                    </div>

                    ${rows.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #D1D5DB;">
                        <div style="font-weight: 700; color: #374151; margin-bottom: 4px;">Rincian Bedengan Asal:</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          ${rows.map(r => `
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; color: #4B5563;">
                              <span style="word-break: break-word;">• ${formatBedenganCode(r.bedengan, r.bedenganCode) || 'BED-001'} (${r.klon ? normalizeKlonName(r.klon) : (s3Doc.klon ? normalizeKlonName(s3Doc.klon) : 'GT 1')})</span>
                              <span style="font-weight: 700; color: #116834; white-space: nowrap; flex-shrink: 0;">${parseInt(r.disemai || r.sourceBibitQty || 0).toLocaleString('id-ID')} Pkk</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>

                  <!-- FOOTER ACTION ROW -->
                  ${sisaBelumOkulasi <= 0 ? `
                    <div class="card-action-rekam" data-index="${originalIdx}" data-doc="${docNo}" data-id="${s3Doc.id || ''}" data-completed="true" style="display: flex; justify-content: flex-end; align-items: center; padding-top: 8px; border-top: 1px dashed #E5E7EB; cursor: default;">
                      <div style="display: flex; align-items: center; gap: 4px; color: #116834; font-weight: 700; font-size: 0.74rem;">
                        <span>Batch Selesai</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                  ` : `
                    <div class="card-action-rekam" data-index="${originalIdx}" data-doc="${docNo}" data-id="${s3Doc.id || ''}" data-completed="false" style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #E5E7EB; cursor: pointer;">
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
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 6px 0;">Belum Ada Bibit Siap Diokulasi</h3>
            <p style="font-size: 0.78rem; color: #757575; margin: 0; line-height: 1.4;">
              Belum ada bibit yang siap diokulasi. Seleksi III belum final.
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
              const docNo = tx.docNo ? tx.docNo.replace('/OKL/', '/GRF/') : formatStandardDocNo(2026, 'GRF', idx + 1);
              const jmlDiokulasi = parseInt(tx.jumlah || 0);
              const jmlKayu = parseInt(tx.jumlahKayu || 0);
              const rawAvg = (jmlKayu > 0 && jmlDiokulasi > 0) ? Math.round(jmlDiokulasi / jmlKayu) : 0;
              const avgMataEntresText = rawAvg > 0 ? `${rawAvg} Mata Entres` : '-';
              const totalMataEntres = (rawAvg > 0 && jmlDiokulasi > 0) ? (jmlDiokulasi * rawAvg) : '-';

              return `
                <div class="card-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; font-size: 0.78rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); position: relative; margin-bottom: 8px;">
                  
                  <!-- BAGIAN A: IDENTITAS DOKUMEN -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-weight: 800; font-size: 0.98rem; color: #111827; letter-spacing: -0.01em;">${docNo}</span>
                        <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: #E8F5E9; color: #116834; border: 1px solid #C8E6C9;">
                          Okulasi
                        </span>
                      </div>
                      <div style="font-weight: 700; font-size: 0.86rem; color: #111827; margin-top: 4px;">
                        ${tx.batchNo || 'Batch-01'} <span style="color: #9CA3AF; margin: 0 2px;">•</span> ${tx.klonEntres || tx.klon || 'PB 260'}
                      </div>
                      <div style="font-size: 0.74rem; color: #6B7280; margin-top: 2px;">
                        ${tx.bedengan ? formatBedenganCode(tx.bedengan, tx.bedenganCode) : 'BED-001'} <span style="color: #9CA3AF; margin: 0 2px;">•</span> ${tx.tanggal || 'Hari ini'}
                      </div>
                      <div style="font-size: 0.74rem; color: #6B7280; margin-top: 2px;">
                        Dok. Penyemaian: <span style="color: #374151; font-weight: 600;">${tx.sourceDocNo || '-'}</span>
                      </div>
                    </div>

                    <!-- TOMBOL AKSI 3-DOTS -->
                    <div style="position: relative; flex-shrink: 0; margin-top: 2px;">
                      <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>

                      <!-- DROPDOWN POPUP MENU -->
                      <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 34px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 130px; overflow: hidden;">
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

                  <!-- BAGIAN B: TOMBOL LIHAT DETAIL -->
                  <div>
                    <button type="button" class="btn-toggle-expand-summary" style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                      <span class="text-expand-summary">Lihat Detail</span>
                      <svg class="icon-expand-summary" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>

                  <!-- EXPANDABLE CONTENT (TERSEMBUNYI SAAT COLLAPSED, TERBUKA SAAT EXPANDED) -->
                  <div class="summary-expand-content" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E5E7EB;">
                    
                    <!-- RINGKASAN PRODUKSI (2x2) -->
                    <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px;">
                      <!-- Baris 1, Kolom 1: Total Diokulasi -->
                      <div>
                        <div style="font-size: 0.70rem; color: #6B7280;">Total Diokulasi</div>
                        <div style="font-size: 0.92rem; font-weight: 800; color: #116834; margin-top: 2px;">${jmlDiokulasi} Pkk</div>
                      </div>
                      <!-- Baris 1, Kolom 2: Kayu Okulasi -->
                      <div>
                        <div style="font-size: 0.70rem; color: #6B7280;">Kayu Okulasi</div>
                        <div style="font-size: 0.92rem; font-weight: 800; color: #116834; margin-top: 2px;">${jmlKayu} Batang</div>
                      </div>
                      <!-- Baris 2, Kolom 1: Rata-rata Mata Entres / Batang -->
                      <div>
                        <div style="font-size: 0.70rem; color: #6B7280; line-height: 1.2;">Rata-rata Mata Entres / Batang</div>
                        <div style="font-size: 0.92rem; font-weight: 800; color: #116834; margin-top: 2px;">${avgMataEntresText}</div>
                      </div>
                      <!-- Baris 2, Kolom 2: Jumlah Mata Entres -->
                      <div>
                        <div style="font-size: 0.70rem; color: #6B7280; line-height: 1.2;">Jumlah Mata Entres</div>
                        <div style="font-size: 0.92rem; font-weight: 800; color: #116834; margin-top: 2px;">${totalMataEntres}</div>
                      </div>
                    </div>

                    <!-- INFORMASI PENDUKUNG -->
                    <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
                      <div style="font-size: 0.70rem; color: #6B7280;">Batang Bawah:</div>
                      <div style="font-size: 0.86rem; font-weight: 800; color: #111827; margin-top: 1px;">${tx.klonRootstock ? normalizeKlonName(tx.klonRootstock) : 'GT 1'}</div>
                      ${parseInt(tx.jumlahDitolak || 0) > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #E5E7EB;">
                          <span style="font-size: 0.70rem; color: #6B7280;">Bibit Ditolak:</span>
                          <span style="font-weight: 800; color: #D32F2F; font-size: 0.82rem;">${tx.jumlahDitolak} Pkk</span>
                        </div>
                      ` : ''}
                    </div>

                    <!-- DETAIL PEKERJA LENGKAP -->
                    ${workersList.length > 0 ? `
                      <div>
                        <div style="font-weight: 700; color: #111827; margin-bottom: 6px; font-size: 0.78rem;">Pekerja Okulasi:</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          ${workersList.map(w => `
                            <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563; font-size: 0.76rem;">
                              <span>• ${w.name} <span style="color: #9CA3AF;">(${w.code})</span></span>
                              <span style="font-weight: 700; color: #116834; text-align: right;">${parseInt(w.qty || 0)} Pkk</span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : `
                      <div style="color: #9CA3AF; font-size: 0.74rem; font-style: italic;">Tidak ada data pekerja</div>
                    `}

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

  // Event Listener: Expand / Collapse on Summary Cards (Single-expand with Auto-scroll)
  app.querySelectorAll('.card-summary-wrapper').forEach(wrapper => {
    const btnToggle = wrapper.querySelector('.btn-toggle-expand-summary');
    const content = wrapper.querySelector('.summary-expand-content');
    const textSpan = wrapper.querySelector('.text-expand-summary');
    const icon = wrapper.querySelector('.icon-expand-summary');

    if (btnToggle && content) {
      btnToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const willOpen = content.style.display !== 'block';

        // Close all other summary cards (single-expand behavior)
        app.querySelectorAll('.card-summary-wrapper').forEach(otherWrapper => {
          if (otherWrapper !== wrapper) {
            const otherContent = otherWrapper.querySelector('.summary-expand-content');
            const otherTextSpan = otherWrapper.querySelector('.text-expand-summary');
            const otherIcon = otherWrapper.querySelector('.icon-expand-summary');
            if (otherContent) otherContent.style.display = 'none';
            if (otherTextSpan) otherTextSpan.textContent = 'Lihat Detail';
            if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
          }
        });

        // Toggle current card
        content.style.display = willOpen ? 'block' : 'none';
        if (textSpan) textSpan.textContent = willOpen ? 'Sembunyikan Detail' : 'Lihat Detail';
        if (icon) icon.style.transform = willOpen ? 'rotate(180deg)' : 'rotate(0deg)';

        // Auto-scroll / focus to the opened card
        if (willOpen) {
          setTimeout(() => {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 50);
        }
      });
    }
  });

  // Event Listener: Action Rekam Okulasi
  app.querySelectorAll('.card-action-rekam').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.currentTarget.dataset.completed === 'true') return;
      const idx = e.currentTarget.dataset.index;
      const doc = e.currentTarget.dataset.doc;
      const id = e.currentTarget.dataset.id;
      storage.remove('editing_budding_index');
      storage.set('selected_grafting_batch_index', idx);
      if (doc) storage.set('selected_grafting_batch_doc_no', doc);
      if (id) storage.set('selected_grafting_batch_id', id);
      storage.remove('budding_qr_verified');
      navigate('/budding/grafting/scan');
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
