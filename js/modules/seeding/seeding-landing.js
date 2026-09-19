/**
 * modules/seeding/seeding-landing.js
 * Landing Hub for Penyemaian with Dual-Tab Architecture:
 * 1. 🌱 Dederan (Dokumen Induk Deder & Transaksi Dederan)
 * 2. 🌿 Pindah Semai (Consuming Eligible 100% Completed Dederan Inspection Results)
 *
 * Preserves all legacy downstream identifiers (seeding_transactions, seedings, SOW, etc.).
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { formatStandardDocNo } from '../../core/utils.js';
import { guardDependency } from '../../core/dependency-guard.js';
import {
  syncDederanIndukDocuments,
  getDederanIndukDocuments,
  getDederanTransactions,
  getDederanTransactionsByParent,
  getBedenganInspectionSummary,
  deleteDederanTransaction
} from './dederan-manager.js';
import { getEligiblePindahSemaiSources } from './dederan-pindah-semai-adapter.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { toast } from '../../components/toast.js';

let activeTab = 'DEDERAN'; // 'DEDERAN' | 'PINDAH_SEMAI'

export function renderSeedingLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  // Sync Dederan Induk with Benih receipts (1:1)
  syncDederanIndukDocuments();

  const dederanIndukDocs = getDederanIndukDocuments();
  const dederanTxs = getDederanTransactions();
  const eligiblePindahSemai = getEligiblePindahSemaiSources();
  const seedingTxs = storage.get('seeding_transactions', []);

  // Counts for tab badges
  const pendingDederCount = dederanIndukDocs.filter(d => (d.sisaBelumDeder || 0) > 0).length;
  const pendingPindahCount = eligiblePindahSemai.filter(s => (s.remainingQty || 0) > 0).length;

  app.innerHTML = `
    <div class="page seeding-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Penyemaian & Dederan</h1>
        </div>
      </header>

      <!-- DUAL TAB NAVIGATION -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 16px;">
        <button id="tab-btn-dederan" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeTab === 'DEDERAN' ? '700' : '600'}; color: ${activeTab === 'DEDERAN' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeTab === 'DEDERAN' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Dederan Benih</span>
          ${pendingDederCount > 0 ? `<span style="background: #116834; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pendingDederCount}</span>` : ''}
        </button>

        <button id="tab-btn-pindah-semai" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeTab === 'PINDAH_SEMAI' ? '700' : '600'}; color: ${activeTab === 'PINDAH_SEMAI' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeTab === 'PINDAH_SEMAI' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Pindah Semai</span>
          ${pendingPindahCount > 0 ? `<span style="background: #D97706; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pendingPindahCount}</span>` : ''}
        </button>
      </div>

      <!-- MAIN SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        ${activeTab === 'DEDERAN' ? renderDederanTabContent(dederanIndukDocs, dederanTxs) : renderPindahSemaiTabContent(eligiblePindahSemai, seedingTxs)}
      </main>

    </div>
  `;

  // Bind Event Listeners
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/home');
  });

  app.querySelector('#tab-btn-dederan')?.addEventListener('click', () => {
    activeTab = 'DEDERAN';
    renderSeedingLanding();
  });

  app.querySelector('#tab-btn-pindah-semai')?.addEventListener('click', () => {
    activeTab = 'PINDAH_SEMAI';
    renderSeedingLanding();
  });

  attachDederanEvents(app);
  attachPindahSemaiEvents(app);
}

/**
 * Render Content for Tab 1: Dederan
 */
function renderDederanTabContent(indukDocs, dederanTxs = []) {
  if (indukDocs.length === 0) {
    return renderEmptyStateCard({
      title: 'Belum Ada Penerimaan Benih',
      description: 'Lakukan transaksi <strong>Penerimaan Benih / Biji Kelatak</strong> terlebih dahulu agar Dokumen Induk Deder otomatis terbentuk.'
    });
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- SECTION 1: DOKUMEN INDUK DEDER -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${indukDocs.map((induk) => {
          const totalPenerimaan = induk.totalNilaiButirPenerimaan || 0;
          const totalDideder = induk.totalDidederSDHI || 0;
          const sisa = induk.sisaBelumDeder || 0;
          const isComplete = sisa === 0 && totalPenerimaan > 0;

          let badgeBg = '#FEF3C7';
          let badgeColor = '#B45309';
          let badgeBorder = '#FDE68A';
          let badgeText = `Sisa ${sisa.toLocaleString('id-ID')} Butir`;

          if (isComplete) {
            badgeBg = '#F0FDF4';
            badgeColor = '#15803D';
            badgeBorder = '#BBF7D0';
            badgeText = 'Selesai Dideder (100%)';
          } else if (totalDideder === 0) {
            badgeBg = '#FEE2E2';
            badgeColor = '#B91C1C';
            badgeBorder = '#FECACA';
            badgeText = 'Belum Dideder';
          }

          return `
            <div class="card-dederan-induk" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              
              <!-- HEADER -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;">
                  DOKUMEN INDUK DEDER
                </span>
                <span style="font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                  ${badgeText}
                </span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                <strong style="font-size: 0.95rem; font-weight: 800; color: #0F172A;">${induk.docNo}</strong>
                <span style="font-size: 0.74rem; color: #64748B;">Klon: <strong style="color: #116834;">${induk.klon || 'GT 1'}</strong></span>
              </div>

              <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 10px;">
                Asal Penerimaan: <strong>${induk.sourceReceiptDocNo}</strong> • Tgl: ${induk.tanggalPenerimaan || '-'}
              </div>

              <!-- METRIC GRID 3-KOLOM -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 4px; text-align: center; margin-bottom: 10px;">
                <div>
                  <div style="font-size: 0.65rem; color: #64748B;">Total Penerimaan</div>
                  <div style="font-size: 0.82rem; font-weight: 800; color: #0F172A; margin-top: 1px;">
                    ${totalPenerimaan.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.65rem; color: #116834;">Sudah Dideder</div>
                  <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">
                    ${totalDideder.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.65rem; color: ${sisa > 0 ? '#D97706' : '#116834'};">Sisa Belum Deder</div>
                  <div style="font-size: 0.82rem; font-weight: 800; color: ${sisa > 0 ? '#D97706' : '#116834'}; margin-top: 1px;">
                    ${sisa.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <!-- ACTION BUTTON -->
              <div>
                ${sisa > 0 ? `
                  <button type="button" class="btn-tambah-deder" data-doc="${induk.docNo}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                    Rekam Data Dederan
                  </button>
                ` : `
                  <button type="button" class="btn-deder-selesai" style="width: 100%; height: 38px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: default; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    ✓ Seluruh Kuota Selesai Dideder
                  </button>
                `}
              </div>

            </div>
          `;
        }).join('')}
      </div>

      <!-- SECTION 2: RINGKASAN TRANSAKSI DEDERAN -->
      <div>
        <h2 style="font-size: 0.90rem; font-weight: 700; color: #0F172A; margin: 0 0 10px 0;">
          Ringkasan Transaksi Dederan (${dederanTxs.length})
        </h2>

        ${dederanTxs.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 16px; text-align: center; font-size: 0.78rem; color: #64748B;">
            Belum ada transaksi Dederan yang dicatat.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${dederanTxs.map((tx, idx) => {
              const inspSummary = getBedenganInspectionSummary(tx);
              const hasInspection = inspSummary.totalDiperiksa > 0;

              return `
                <div class="card-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 0.78rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); position: relative;">
                  
                  <!-- IDENTITAS DOKUMEN & 3-DOTS ACTION -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div style="flex: 1; min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: 800; font-size: 0.92rem; color: #0F172A; letter-spacing: -0.01em;">${tx.docNo}</span>
                        <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #E8F5E9; color: #116834; border: 1px solid #C8E6C9;">
                          Dederan
                        </span>
                        ${inspSummary.isComplete ? `
                          <span style="font-size: 0.62rem; font-weight: 700; background: #DCFCE7; color: #15803D; padding: 2px 6px; border-radius: 4px; border: 1px solid #BBF7D0;">✓ Selesai Periksa</span>
                        ` : (inspSummary.totalDiperiksa > 0 ? `
                          <span style="font-size: 0.62rem; font-weight: 700; background: #FEF3C7; color: #B45309; padding: 2px 6px; border-radius: 4px; border: 1px solid #FDE68A;">${inspSummary.totalDiperiksa}/${tx.jumlahDeder} Diperiksa</span>
                        ` : '')}
                      </div>
                      
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 4px; line-height: 1.3;">
                        Dok. Induk: <strong style="color: #334155;">${tx.parentDederIndukDocNo || '-'}</strong> • Klon: <strong style="color: #116834;">${tx.klon || 'GT 1'}</strong>
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px; line-height: 1.3;">
                        Bedengan: <strong style="color: #0F172A;">${tx.bedenganCode || tx.bedengan || 'BED-001'}</strong> • Tgl: ${tx.tanggalDeder || tx.tanggal || '-'}
                      </div>
                    </div>

                    <!-- 3-DOTS ACTION TRIGGER -->
                    <div style="position: relative; flex-shrink: 0; margin-left: 8px;">
                      <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>

                      <!-- POPUP MENU -->
                      <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 140px; overflow: hidden;">
                        ${hasInspection ? `
                          <button type="button" class="menu-action-locked" style="width: 100%; padding: 8px 12px; text-align: left; background: #FAFAFA; border: none; font-size: 0.75rem; font-weight: 600; color: #9CA3AF; cursor: not-allowed;">
                            <span>Hapus (Terkunci)</span>
                          </button>
                        ` : `
                          <button type="button" class="menu-action-delete-deder" data-doc="${tx.docNo}" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Hapus</span>
                          </button>
                        `}
                      </div>
                    </div>
                  </div>

                  <!-- METRICS CONTAINER -->
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <div>
                      <span style="font-size: 0.68rem; color: #64748B;">Jumlah Dideder</span>
                      <div style="font-size: 0.84rem; font-weight: 800; color: #116834; margin-top: 1px;">
                        ${(tx.jumlahDeder || 0).toLocaleString('id-ID')} Butir
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 0.68rem; color: #64748B;">Hasil Periksa</span>
                      <div style="font-size: 0.80rem; font-weight: 700; color: ${inspSummary.totalDiperiksa > 0 ? '#15803D' : '#64748B'}; margin-top: 1px;">
                        ${inspSummary.totalDiperiksa > 0 ? `${inspSummary.totalBerhasil.toLocaleString('id-ID')} Berhasil` : 'Belum Diperiksa'}
                      </div>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

/**
 * Render Content for Tab 2: Pindah Semai (Source strictly from Dederan Inspection Berhasil)
 */
function renderPindahSemaiTabContent(eligibleSources, seedingTxs = []) {
  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- SECTION 1: ELIGIBLE SOURCES FOR PINDAH SEMAI -->
      <div>
        <h2 style="font-size: 0.90rem; font-weight: 700; color: #0F172A; margin: 0 0 10px 0;">
          Sumber Siap Pindah Semai (Hasil Dederan 100% Selesai Periksa)
        </h2>

        ${eligibleSources.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px 16px; text-align: center;">
            <div style="font-size: 0.78rem; color: #64748B; line-height: 1.5;">
              Belum ada hasil Dederan yang siap untuk Pindah Semai.<br>
              <em>Syarat: Bedengan Dederan harus sudah <strong>100% selesai diperiksa</strong> dengan kuantitas berhasil > 0.</em>
            </div>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${eligibleSources.map(src => {
              const isCompleted = src.remainingQty === 0;
              return `
                <div style="background: #FFFFFF; border: 1px solid ${isCompleted ? '#E2E8F0' : '#86EFAC'}; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                    <div>
                      <span style="font-size: 0.65rem; font-weight: 700; background: #DCFCE7; color: #116834; padding: 2px 6px; border-radius: 4px; border: 1px solid #86EFAC;">
                        HASIL DEDERAN: ${src.bedenganCode}
                      </span>
                      <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 4px;">
                        ${src.dederanTxDocNo}
                      </div>
                    </div>
                    <span style="font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${isCompleted ? '#F1F5F9' : '#FEF3C7'}; color: ${isCompleted ? '#64748B' : '#B45309'}; border: 1px solid ${isCompleted ? '#CBD5E1' : '#FDE68A'};">
                      ${isCompleted ? 'Selesai Dipindah Semai' : `Sisa ${src.remainingQty} Butir`}
                    </span>
                  </div>

                  <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 8px;">
                    Induk: ${src.parentDederIndukDocNo} • Klon: <strong>${src.klon}</strong>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
                    <div>Hasil Berhasil: <strong>${src.totalBerhasil}</strong> Butir</div>
                    <div>Sudah Disemai: <strong style="color: #116834;">${src.processedQty}</strong></div>
                    <div>Sisa Kuota: <strong style="color: ${src.remainingQty > 0 ? '#D97706' : '#116834'};">${src.remainingQty}</strong></div>
                  </div>

                  ${!isCompleted ? `
                    <button type="button" class="btn-execute-pindah-semai" data-source-id="${src.sourceIndex}" style="width: 100%; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                      Proses Pindah Semai (Polybag)
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- SECTION 2: RINGKASAN TRANSAKSI PINDAH SEMAI -->
      <div>
        <h2 style="font-size: 0.90rem; font-weight: 700; color: #0F172A; margin: 0 0 10px 0;">
          Ringkasan Transaksi Pindah Semai (${seedingTxs.length})
        </h2>

        ${seedingTxs.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 16px; text-align: center; font-size: 0.78rem; color: #64748B;">
            Belum ada transaksi Pindah Semai yang tercatat.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${seedingTxs.map((stx, idx) => `
              <div class="card-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 0.78rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); position: relative;">
                
                <!-- HEADER BARIS 1: NO DOKUMEN & BADGE -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span style="font-weight: 800; font-size: 0.92rem; color: #0F172A; letter-spacing: -0.01em;">${stx.docNo || `2026/SOW/0${idx + 1}`}</span>
                      <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #E8F5E9; color: #116834; border: 1px solid #C8E6C9;">
                        Pindah Semai
                      </span>
                    </div>
                    <div style="font-size: 0.74rem; color: #64748B; margin-top: 4px; line-height: 1.3;">
                      Sumber Dederan: <strong style="color: #334155;">${stx.sourceDocNo || '-'}</strong> • Klon: <strong style="color: #116834;">${stx.klon || 'GT 1'}</strong>
                    </div>
                    <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px; line-height: 1.3;">
                      Bedengan Semai: <strong style="color: #0F172A;">${stx.bedengan || '-'}</strong> • Tgl: ${stx.date || '-'}
                    </div>
                  </div>

                  <!-- 3-DOTS ACTION TRIGGER -->
                  <div style="position: relative; flex-shrink: 0; margin-left: 8px;">
                    <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                        <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                        <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                      </svg>
                    </button>

                    <!-- POPUP MENU -->
                    <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 140px; overflow: hidden;">
                      <button type="button" class="menu-action-delete-pindah" data-index="${idx}" data-doc="${stx.docNo || ''}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- METRICS CONTAINER -->
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                  <div>
                    <span style="font-size: 0.68rem; color: #64748B;">Bibit Disemai</span>
                    <div style="font-size: 0.84rem; font-weight: 800; color: #116834; margin-top: 1px;">
                      ${(stx.totalDisemai || 0).toLocaleString('id-ID')} Pkk
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-size: 0.68rem; color: #64748B;">Polybag Terisi</span>
                    <div style="font-size: 0.84rem; font-weight: 700; color: #0F172A; margin-top: 1px;">
                      ${(stx.totalPolybag || 0).toLocaleString('id-ID')} Ply
                    </div>
                  </div>
                </div>

              </div>
            `).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

/**
 * Event bindings for Dederan Tab
 */
function attachDederanEvents(app) {
  // Tambah Dederan
  app.querySelectorAll('.btn-tambah-deder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docNo = e.currentTarget.dataset.doc;
      storage.set('active_dederan_parent_doc', docNo);
      storage.remove('scanned_dederan_bedengan_id');
      storage.remove('scanned_dederan_bedengan_code');
      storage.remove('scanned_dederan_bedengan_name');
      navigate('/seeding/dederan/scan');
    });
  });

  // 3-Dots Action Trigger Popovers
  app.querySelectorAll('.btn-tx-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = e.currentTarget.closest('div');
      const menu = parent?.querySelector('.tx-action-menu');
      const isVisible = menu && menu.style.display === 'block';

      // Close all other open menus first
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        m.style.display = 'none';
      });

      if (menu && !isVisible) {
        menu.style.display = 'block';
      }
    });
  });

  // Close menus on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-tx-action-trigger') && !e.target.closest('.tx-action-menu')) {
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        m.style.display = 'none';
      });
    }
  });

  // Delete Dederan Transaction
  app.querySelectorAll('.menu-action-delete-deder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const docNo = e.currentTarget.dataset.doc;
      if (!confirm(`Apakah Anda yakin ingin menghapus transaksi Dederan '${docNo}'?`)) {
        return;
      }

      const res = deleteDederanTransaction(docNo);
      if (res.success) {
        toast('Transaksi Dederan berhasil dihapus', 'success');
        renderSeedingLanding();
      } else {
        toast(res.error || 'Gagal menghapus transaksi', 'error');
      }
    });
  });
}

/**
 * Event bindings for Pindah Semai Tab
 */
function attachPindahSemaiEvents(app) {
  // Proses Pindah Semai
  app.querySelectorAll('.btn-execute-pindah-semai').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sourceId = e.currentTarget.dataset.sourceId;
      storage.set('seeding_source_index', sourceId);
      storage.set('editing_seeding_index', null);
      storage.remove('scanned_bedengan');
      navigate('/seeding/scan');
    });
  });

  // Delete Pindah Semai Transaction
  app.querySelectorAll('.menu-action-delete-pindah').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const docNo = e.currentTarget.dataset.doc;

      if (!confirm(`Apakah Anda yakin ingin menghapus transaksi Pindah Semai '${docNo}'?`)) {
        return;
      }

      let txs = storage.get('seeding_transactions', []);
      if (idx >= 0 && idx < txs.length) {
        txs.splice(idx, 1);
        storage.set('seeding_transactions', txs);
        toast('Transaksi Pindah Semai berhasil dihapus', 'success');
        renderSeedingLanding();
      }
    });
  });
}

