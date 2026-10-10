import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, resolveUserContext } from '../../core/user-context.js';
import { getAuthorizedTransactions, canUserAccessTransaction } from '../../core/transaction-actor.js';
import { formatStandardDocNo, formatDate, todayDDMMYYYY, todayISO, esc } from '../../core/utils.js';
import { guardDependency, isReceiptLocked, isReceiptUsedAsReference } from '../../core/dependency-guard.js';
import { renderStatusDots } from '../../core/status-dot-renderer.js';
import { filterReceiptKspRequests, getActionableReceiptCount } from './receipt-kebun-sepupu-landing.js';
import { getActionableMataEntresReceiptCount } from '../request/request-mata-entres-landing.js';
import {
  normalizeDateStr,
  ddmmyyyyToIso,
  renderCalendarHeaderButton,
  renderDateFilterBannerHtml,
  renderDatePickerModalHtml,
  attachDatePickerModalEvents
} from '../../components/date-filter-modal.js';

let selectedReceiptDate = todayDDMMYYYY();

export function setSelectedReceiptDate(dateStr) {
  selectedReceiptDate = normalizeDateStr(dateStr) || todayDDMMYYYY();
}

export function getSelectedReceiptDate() {
  return selectedReceiptDate;
}

export function renderReceiptLanding() {
  const app = document.getElementById('app');

  const user = session.get();
  const userCtx = getCurrentUserContext() || resolveUserContext(user);

  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const scopedReceipts = filterReceiptKspRequests(allReceipts, userCtx);
  const hasActionableBibitReceipt = getActionableReceiptCount(scopedReceipts, userCtx) > 0;

  const allRequests = storage.get('requests_transactions', []);
  const hasActionableEntresReceipt = getActionableMataEntresReceiptCount(allRequests, userCtx) > 0;

  const allReceiptTxs = storage.get('receipt_transactions', []);
  const authorizedReceiptTxs = getAuthorizedTransactions(allReceiptTxs, userCtx);
  const todayStr = todayDDMMYYYY();
  const isFiltered = selectedReceiptDate !== todayStr;

  // Filter transactions by selected date while preserving original index
  const filteredTxsWithIndex = authorizedReceiptTxs
    .map((tx) => {
      const originalIndex = allReceiptTxs.findIndex(t => t === tx || (t.id && t.id === tx.id) || (t.docNo && t.docNo === tx.docNo));
      return { tx, originalIndex: originalIndex >= 0 ? originalIndex : 0 };
    })
    .filter(({ tx }) => {
      const txDate = normalizeDateStr(tx.tanggal || tx.date || tx.createdAt);
      return txDate === selectedReceiptDate;
    });

  // Single-Read Batch Context untuk siklus render saat ini (O(1) storage read)
  const preloadedReceiptContext = {
    seedingTxs: storage.get('seeding_transactions', []),
    dederTxs: storage.get('dederan_transactions', []),
    indukDocs: storage.get('dederan_induk_documents', []),
    selectionDocs: storage.get('pre_grafting_selection_documents', [])
  };

  app.innerHTML = `
    <div class="page receipt-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      <!-- HEADER -->
      <header class="receipt-header" style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.15rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Penerimaan</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-right: -4px;">
          <button id="btn-sync" type="button" aria-label="Refresh" style="padding: 6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg id="sync-icon-svg" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.4s ease;">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          ${renderCalendarHeaderButton(selectedReceiptDate, isFiltered, 'btn-calendar')}
        </div>
      </header>

      <!-- CONTENT BODY -->
      <main style="flex: 1; padding: 16px; overflow-y: auto;">
        
        <!-- 3 TOP ACTION CARDS (1 ROW, EQUAL SIZE, CONSISTENT WITH BERANDA MANTRI BIBITAN) -->
        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
          
          <!-- Card 1: Penerimaan Benih / Biji Kelatak -->
          <button id="btn-biji" type="button" class="beranda-menu-card" style="flex: 1; min-width: 0; height: 115px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: transform 0.15s ease, box-shadow 0.15s ease; outline: none; box-sizing: border-box; position: relative;">
            <div style="width: 44px; height: 44px; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="#116834" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <!-- Benih / Biji Kelatak (3 rubber seeds outline) -->
                <ellipse cx="19" cy="19" rx="8.5" ry="5.5" transform="rotate(-30 19 19)"></ellipse>
                <path d="M15 15c2 2 4 5 5 8"></path>
                <ellipse cx="32" cy="28" rx="7.5" ry="5" transform="rotate(40 32 28)"></ellipse>
                <path d="M29 26c2 2 4 4 5 5"></path>
                <ellipse cx="16" cy="31" rx="6.5" ry="4.5" transform="rotate(15 16 31)"></ellipse>
                <path d="M13 30c2 1 3 2 5 3"></path>
              </svg>
            </div>
            <div style="font-weight: 700; font-size: 0.74rem; color: #116834; text-align: center; line-height: 1.2; letter-spacing: -0.015em; min-height: 30px; display: flex; align-items: center; justify-content: center;">
              Penerimaan<br>Benih / Biji<br>Kelatak
            </div>
          </button>

          <!-- Card 2: Penerimaan Bibit -->
          <button id="btn-bibit" type="button" class="beranda-menu-card" style="flex: 1; min-width: 0; height: 115px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: transform 0.15s ease, box-shadow 0.15s ease; outline: none; box-sizing: border-box; position: relative;">
            <div style="width: 44px; height: 44px; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="#116834" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
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
            <div style="font-weight: 700; font-size: 0.76rem; color: #116834; text-align: center; line-height: 1.2; letter-spacing: -0.015em; min-height: 30px; display: flex; align-items: center; justify-content: center;">
              Penerimaan<br>Bibit
            </div>
            ${hasActionableBibitReceipt ? `
              <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
            ` : ''}
          </button>

          <!-- Card 3: Penerimaan Mata Entres -->
          <button id="btn-entres" type="button" class="beranda-menu-card" style="flex: 1; min-width: 0; height: 115px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: transform 0.15s ease, box-shadow 0.15s ease; outline: none; box-sizing: border-box; position: relative;">
            <div style="width: 44px; height: 44px; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="#116834" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <!-- Budwood stem / Entres branch & buds -->
                <path d="M24 6v36"></path>
                <path d="M24 16c6-4 12-3 14 0-2 6-8 7-14 4"></path>
                <path d="M24 28c-6-4-12-3-14 0 2 6 8 7 14 4"></path>
                <circle cx="24" cy="18" r="2.5" fill="#116834"></circle>
                <circle cx="24" cy="30" r="2.5" fill="#116834"></circle>
              </svg>
            </div>
            <div style="font-weight: 700; font-size: 0.76rem; color: #116834; text-align: center; line-height: 1.2; letter-spacing: -0.015em; min-height: 30px; display: flex; align-items: center; justify-content: center;">
              Penerimaan<br>Mata Entres
            </div>
            ${hasActionableEntresReceipt ? `
              <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
            ` : ''}
          </button>

        </div>

        <!-- FILTER INDICATOR BANNER IF NOT TODAY -->
        ${renderDateFilterBannerHtml(selectedReceiptDate, isFiltered, 'btn-reset-date-filter')}

        <!-- RINGKASAN PENERIMAAN (DATA TRANSAKSI MASUK) -->
        <div style="margin-top: 8px;">
          <div style="margin-bottom: 12px;">
            <h2 style="font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0;">
              Ringkasan Penerimaan (${filteredTxsWithIndex.length})
            </h2>
          </div>

          ${filteredTxsWithIndex.length === 0 ? `
            <div style="background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 32px 16px; text-align: center; margin-top: 8px;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #64748B;">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div style="font-size: 0.90rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Tidak Ada Data Penerimaan</div>
              <div style="font-size: 0.78rem; color: #64748B; margin-bottom: ${isFiltered ? '16px' : '0'};">
                Tidak ditemukan data transaksi penerimaan untuk tanggal ${esc(selectedReceiptDate)}.
              </div>
              ${isFiltered ? `
                <button id="btn-empty-reset-today" type="button" style="padding: 7px 14px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.80rem; font-weight: 600; cursor: pointer;">
                  Kembali ke Hari Ini
                </button>
              ` : ''}
            </div>
          ` : `
            <div>
              ${filteredTxsWithIndex.map(({ tx, originalIndex }) => {
                const lock = isReceiptLocked(tx, originalIndex, preloadedReceiptContext);
                const isLocked = lock.locked;
                const isUsedRef = lock.reason === 'REFERENTIAL_LOCK' || isReceiptUsedAsReference(tx, originalIndex, preloadedReceiptContext);
                const docNo = tx.docNo || tx.nomorDokumen || formatStandardDocNo(2026, 'APR', originalIndex + 1);

                const activeFlags = [];
                if (isUsedRef) activeFlags.push({ key: 'RECEIPT_REF_USED', label: 'Sudah Digunakan' });
                if (tx.qtyDiterima && tx.qtyKirim && tx.qtyDiterima !== tx.qtyKirim) {
                  activeFlags.push({ key: 'RECEIPT_DIFF', label: 'Diterima dengan Selisih' });
                } else if (tx.qtyDiterima) {
                  activeFlags.push({ key: 'RECEIPT_OK', label: 'Diterima' });
                }

                return `
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; position: relative; box-shadow: 0 1px 4px rgba(0,0,0,0.04); margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      ${renderStatusDots(activeFlags)}
                      <div style="font-weight: 700; font-size: 0.95rem; color: #111111;">${docNo}</div>
                    </div>
                    <div style="position: relative;">
                      <button class="btn-card-menu" data-index="${originalIndex}" type="button" aria-label="Menu" style="background: transparent; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; color: #116834;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <circle cx="12" cy="5" r="2"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="12" cy="19" r="2"></circle>
                        </svg>
                      </button>
                      <!-- CARD POPOVER -->
                      <div class="card-popover" id="popover-${originalIndex}" style="display: none; position: absolute; right: 0; top: 100%; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; flex-direction: column; width: 140px;">
                        <button class="btn-popover-lihat" data-index="${originalIndex}" type="button" style="padding: 10px 16px; border: none; background: transparent; text-align: left; font-size: 0.9rem; color: #111111; cursor: pointer; border-bottom: 1px solid #F0F0F0;">
                          Lihat Data
                        </button>
                        ${isLocked ? `
                          <button class="btn-popover-locked" data-index="${originalIndex}" data-doc="${docNo}" data-reason="${lock.reason || ''}" type="button" style="padding: 10px 16px; border: none; background: #FAFAFA; text-align: left; font-size: 0.85rem; color: #9CA3AF; cursor: not-allowed; border-bottom: 1px solid #F0F0F0;">
                            Edit (Terkunci)
                          </button>
                          <button class="btn-popover-locked" data-index="${originalIndex}" data-doc="${docNo}" data-reason="${lock.reason || ''}" type="button" style="padding: 10px 16px; border: none; background: #FAFAFA; text-align: left; font-size: 0.85rem; color: #9CA3AF; cursor: not-allowed;">
                            Hapus (Terkunci)
                          </button>
                        ` : `
                          <button class="btn-popover-edit" data-index="${originalIndex}" type="button" style="padding: 10px 16px; border: none; background: transparent; text-align: left; font-size: 0.9rem; color: #111111; cursor: pointer; border-bottom: 1px solid #F0F0F0;">
                            Edit
                          </button>
                          <button class="btn-popover-hapus" data-index="${originalIndex}" type="button" style="padding: 10px 16px; border: none; background: transparent; text-align: left; font-size: 0.9rem; color: #D32F2F; cursor: pointer;">
                            Hapus
                          </button>
                        `}
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
            </div>
          `}
        </div>
      </main>

      <!-- MODAL DATE PICKER -->
      ${renderDatePickerModalHtml({
        modalId: 'modal-date-picker-overlay',
        inputId: 'input-filter-receipt-date',
        activeDate: selectedReceiptDate,
        title: 'Pilih Tanggal Penerimaan'
      })}
    </div>
  `;

  // --- HEADER EVENT LISTENERS ---
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

  // --- ATTACH STANDARDIZED DATE PICKER MODAL EVENTS ---
  attachDatePickerModalEvents({
    app,
    modalId: 'modal-date-picker-overlay',
    btnCalendarId: 'btn-calendar',
    inputId: 'input-filter-receipt-date',
    resetBtnId: 'btn-reset-date-filter',
    emptyResetBtnId: 'btn-empty-reset-today',
    getActiveDate: () => selectedReceiptDate,
    onDateSelected: (newDate) => {
      selectedReceiptDate = newDate;
      renderReceiptLanding();
    },
    onResetToday: () => {
      selectedReceiptDate = todayDDMMYYYY();
      renderReceiptLanding();
    }
  });

  // --- MENU 1: PENERIMAAN BENIH / BIJI KELATAK (DIRECT PIHAK KE-III) ---
  app.querySelector('#btn-biji').addEventListener('click', () => {
    storage.set('transaction_originType', 'PIHAK_KE_III');
    storage.set('benih_jenis', 'Benih / Biji Kelatak');
    storage.set('benih_tahapan', 'Rubber Main Nursery');

    // Reset temporary form session state (10 keys)
    storage.remove('editing_transaction_index');
    storage.remove('benih_program_id');
    storage.remove('benih_program_code');
    storage.remove('benih_source_id');
    storage.remove('benih_source_name');
    storage.remove('receipt_photos');
    storage.remove('selected_sir');
    storage.remove('selected_klon');
    storage.remove('benih_table_rows');
    storage.remove('benih_batch_code');

    navigate('/reception/benih');
  });

  // --- MENU 2: PENERIMAAN BIBIT (NAVIGASI PENERIMAAN KEBUN SEPUPU) ---
  app.querySelector('#btn-bibit').addEventListener('click', () => {
    navigate('/reception/kebun-sepupu');
  });

  // --- MENU 3: PENERIMAAN MATA ENTRES ---
  app.querySelector('#btn-entres').addEventListener('click', () => {
    storage.set('mata_entres_origin_route', '/reception');
    navigate('/request/mata-entres');
  });

  // --- POPOVER & CARD ACTIONS (LIHAT / EDIT / HAPUS) ---
  const btnCardMenus = app.querySelectorAll('.btn-card-menu');
  const cardPopovers = app.querySelectorAll('.card-popover');
  
  if (btnCardMenus.length > 0) {
    btnCardMenus.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = e.currentTarget.dataset.index;
        const popover = app.querySelector(`#popover-${idx}`);
        cardPopovers.forEach(p => p.style.display = 'none');
        if (popover) {
          popover.style.display = 'flex';
        }
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
        const idx = Number(e.currentTarget.dataset.index);
        const txs = storage.get('receipt_transactions', []);
        const tx = txs[idx];
        
        if (!tx || !canUserAccessTransaction(tx, userCtx, 'UPDATE')) {
          alert('Anda tidak memiliki otoritas untuk mengedit transaksi ini.');
          return;
        }

        const lock = isReceiptLocked(tx, idx);
        if (lock.locked) {
          if (lock.reason === 'VERIFICATION_LOCK') {
            alert('Transaksi ini sedang dalam proses verifikasi Asisten Bibitan atau sudah disetujui, sehingga tidak dapat diedit.');
          } else {
            const docNo = tx?.docNo || tx?.nomorDokumen || formatStandardDocNo(2026, 'APR', idx + 1);
            guardDependency(docNo, 'Penerimaan', 'Diubah');
          }
          return;
        }

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
          storage.set('transaction_originType', 'PIHAK_KE_III');
        }
        
        navigate('/reception/benih');
      });
    });

    app.querySelectorAll('.btn-popover-locked').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const docNo = e.currentTarget.dataset.doc || 'Dokumen ini';
        const reason = e.currentTarget.dataset.reason;
        cardPopovers.forEach(p => p.style.display = 'none');
        
        if (reason === 'VERIFICATION_LOCK') {
          alert('Transaksi ini sedang dalam proses verifikasi Asisten Bibitan atau sudah disetujui, sehingga tidak dapat diubah/dihapus.');
        } else {
          guardDependency(docNo, 'Penerimaan', 'Diubah/Dihapus');
        }
      });
    });

    app.querySelectorAll('.btn-popover-hapus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.index);
        const txs = storage.get('receipt_transactions', []);
        const tx = txs[idx];

        if (!tx || !canUserAccessTransaction(tx, userCtx, 'DELETE')) {
          alert('Anda tidak memiliki otoritas untuk menghapus transaksi ini.');
          return;
        }

        const lock = isReceiptLocked(tx, idx);
        if (lock.locked) {
          if (lock.reason === 'VERIFICATION_LOCK') {
            alert('Transaksi ini sedang dalam proses verifikasi Asisten Bibitan atau sudah disetujui, sehingga tidak dapat dihapus.');
          } else {
            const docNo = tx?.docNo || tx?.nomorDokumen || formatStandardDocNo(2026, 'APR', idx + 1);
            guardDependency(docNo, 'Penerimaan', 'Dihapus');
          }
          return;
        }

        if (guardDependency(tx, 'Penerimaan', 'Dihapus')) {
          return;
        }

        txs.splice(idx, 1);
        storage.set('receipt_transactions', txs);
        renderReceiptLanding();
      });
    });
  }
}
