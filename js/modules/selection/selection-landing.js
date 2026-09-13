/**
 * js/modules/selection/selection-landing.js
 * Landing Page & Execution Module: Pemeriksaan Hasil Seleksi (Role Asisten Bibitan) & Penyeleksian (Mantri)
 * 
 * Prinsip:
 * - ASISTEN_BIBITAN: Memeriksa hasil seleksi (Menunggu Pemeriksaan vs Riwayat Pemeriksaan), Approve, Return.
 * - MANTRI_TANAMAN: Menginput / mendeklarasikan hasil seleksi.
 * - PENTING: ZERO STOCK MUTATION pada tahapan ASB-09 (Mutasi stok ditunda ke ASB-13).
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, formatStandardDocNo, esc } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import {
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS,
  SELECTION_STORAGE_KEY,
  filterSelectionByScope,
  getActionableSelectionCount,
  canPerformAsistenSelectionAction,
  approveSelectionRecord,
  returnSelectionRecord,
  createSelectionRecord,
  mutateStockFromSelection
} from './selection-manager.js';
import { getBatchById, getBatchByCode } from '../../data/batch-master.js';
import { getBedenganById } from '../../data/bedengan-master.js';

export {
  SELECTION_STATUS,
  SELECTION_STORAGE_KEY,
  filterSelectionByScope,
  getActionableSelectionCount,
  canPerformAsistenSelectionAction,
  approveSelectionRecord,
  returnSelectionRecord,
  createSelectionRecord
};

let activeAsbTab = 'PENDING'; // 'PENDING' | 'HISTORY'
let activeFilterProgram = 'ALL';

export function renderSelectionLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawUser = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan', role: 'MANTRI_TANAMAN' };
  const currentUser = getCurrentUserContext() || resolveUserContext(rawUser);
  const normalizedUserRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const isAsistenBibitan = normalizedUserRole === ROLES.ASISTEN_BIBITAN;

  // Jika Asisten Bibitan, render Halaman Pemeriksaan Hasil Seleksi (ASB-09 Canonical)
  if (isAsistenBibitan) {
    renderAsistenSelectionReview(app, currentUser);
    return;
  }

  // Jika Mantri atau role lain, render modul operasional penyeleksian eksisting
  renderMantriSelectionLanding(app, currentUser);
}

/**
 * =============================================================================
 * ASISTEN BIBITAN: PEMERIKSAAN HASIL SELEKSI (ASB-09 CANONICAL VIEW)
 * =============================================================================
 */
function renderAsistenSelectionReview(app, currentUser) {
  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const scopedRecords = filterSelectionByScope(allRecords, currentUser);

  const pendingRecords = scopedRecords.filter(r => (
    (r.status || '').toUpperCase() === SELECTION_STATUS.MENUNGGU_VERIFIKASI ||
    (r.status || '').toUpperCase() === SELECTION_STATUS.DIAJUKAN ||
    (r.status || '').toUpperCase() === 'PENDING_DECLARATION'
  ));

  const historyRecords = scopedRecords.filter(r => (
    (r.status || '').toUpperCase() === SELECTION_STATUS.DISETUJUI ||
    (r.status || '').toUpperCase() === SELECTION_STATUS.DIKEMBALIKAN ||
    (r.status || '').toUpperCase() === 'DECLARED_CULLED'
  ));

  const activeList = activeAsbTab === 'PENDING' ? pendingRecords : historyRecords;

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Pemeriksaan Hasil Seleksi</h1>
        </div>
      </header>

      <!-- TAB NAVIGATION -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 20px;">
        <button id="tab-pending" type="button" style="padding: 12px 4px; font-size: 0.85rem; font-weight: ${activeAsbTab === 'PENDING' ? '700' : '600'}; color: ${activeAsbTab === 'PENDING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeAsbTab === 'PENDING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Menunggu Pemeriksaan</span>
          ${pendingRecords.length > 0 ? `<span style="background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pendingRecords.length}</span>` : ''}
        </button>
        <button id="tab-history" type="button" style="padding: 12px 4px; font-size: 0.85rem; font-weight: ${activeAsbTab === 'HISTORY' ? '700' : '600'}; color: ${activeAsbTab === 'HISTORY' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeAsbTab === 'HISTORY' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Riwayat Pemeriksaan</span>
          ${historyRecords.length > 0 ? `<span style="background: #E2E8F0; color: #475569; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${historyRecords.length}</span>` : ''}
        </button>
      </div>

      <!-- MAIN CONTENT LIST -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        ${activeList.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1E293B; margin: 0 0 4px 0;">
              ${activeAsbTab === 'PENDING' ? 'Tidak Ada Pengajuan Seleksi' : 'Belum Ada Riwayat'}
            </h3>
            <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">
              ${activeAsbTab === 'PENDING' 
                ? 'Semua hasil seleksi bibit dari Mantri telah diperiksa atau belum ada pengajuan baru.' 
                : 'Daftar hasil seleksi yang telah disetujui atau dikembalikan akan tampil di sini.'}
            </p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${activeList.map((item, idx) => {
              const checked = parseInt(item.jumlahDiperiksa || 0, 10);
              const pass = parseInt(item.jumlahLayak || 0, 10);
              const cull = parseInt(item.jumlahAfkir || 0, 10);
              const passPct = checked > 0 ? Math.round((pass / checked) * 100) : 0;
              const cullPct = checked > 0 ? Math.round((cull / checked) * 100) : 0;
              const isActionable = canPerformAsistenSelectionAction(item, currentUser);
              const isApproved = item.status === SELECTION_STATUS.DISETUJUI;
              const isReturned = item.status === SELECTION_STATUS.DIKEMBALIKAN;

              let statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A;">MENUNGGU PEMERIKSAAN</span>`;
              if (isApproved) {
                let mutationBadge = '';
                if (item.stockMutationStatus === 'APPLIED') {
                  mutationBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; margin-left: 4px;">STOCK APPLIED (-${item.stockMutationQty || item.jumlahAfkir} Pkk)</span>`;
                } else if (item.stockMutationStatus === 'NOT_REQUIRED' || item.stockMutationStatus === 'NO_CHANGE') {
                  mutationBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; margin-left: 4px;">TIDAK ADA MUTASI</span>`;
                } else if (item.stockMutationStatus === 'FAILED') {
                  mutationBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; margin-left: 4px;">MUTASI GAGAL</span>`;
                }
                statusBadge = `
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0;">DISETUJUI</span>
                    ${mutationBadge}
                  </div>
                `;
              } else if (isReturned) {
                statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA;">DIKEMBALIKAN</span>`;
              }

              return `
                <div class="card-selection-item" data-id="${esc(item.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  
                  <!-- HEADER BARIS 1 -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.95rem; color: #0F172A;">
                        ${esc(item.batchCode || item.batchNo || 'Batch')} • ${esc(item.clone || item.klon || '-')}
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px;">
                        ${esc(item.programName || item.programId || 'Program Pembibitan')}
                      </div>
                    </div>
                    <div>
                      ${statusBadge}
                    </div>
                  </div>

                  <!-- METADATA BARIS 2 -->
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748B; margin-bottom: 10px; border-bottom: 1px dashed #E2E8F0; padding-bottom: 8px;">
                    <div>
                      Bedengan: <strong style="color: #334155;">${esc(item.bedengan || (item.bedenganIds ? item.bedenganIds.join(', ') : '-'))}</strong>
                    </div>
                    <div>
                      Dok: <strong style="color: #334155;">${esc(item.docNo || item.selectionNo || '-')}</strong>
                    </div>
                  </div>

                  <!-- 3-KOLOM METRIK SELEKSI -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; margin-bottom: 10px; text-align: center;">
                    <div>
                      <div style="font-size: 0.65rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Diperiksa</div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin-top: 2px;">
                        ${checked.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.64rem; color: #94A3B8;">100%</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
                      <div style="font-size: 0.65rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Layak</div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #15803D; margin-top: 2px;">
                        ${pass.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.64rem; color: #15803D; font-weight: 600;">${passPct}%</div>
                    </div>
                    <div>
                      <div style="font-size: 0.65rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Afkir</div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #DC2626; margin-top: 2px;">
                        ${cull.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.64rem; color: #DC2626; font-weight: 600;">${cullPct}%</div>
                    </div>
                  </div>

                  <!-- CATATAN / PENGAJU -->
                  <div style="font-size: 0.72rem; color: #475569; margin-bottom: ${isActionable ? '12px' : '4px'};">
                    <div>Pengaju: <strong>${esc(item.createdByName || item.mantri || 'Mantri Bibitan')}</strong> • ${esc(item.tanggalSeleksi || item.createdAt ? formatDate(item.createdAt) : '-')}</div>
                    ${item.catatan && item.catatan !== '-' ? `<div style="margin-top: 2px;">Catatan: <em>${esc(item.catatan)}</em></div>` : ''}
                    ${item.approvalNotes ? `<div style="margin-top: 2px; color: #15803D;">Catatan Persetujuan: ${esc(item.approvalNotes)}</div>` : ''}
                    ${item.returnReason ? `<div style="margin-top: 2px; color: #DC2626;">Alasan Pengembalian: <strong>${esc(item.returnReason)}</strong></div>` : ''}
                  </div>

                  ${isActionable ? `
                    <!-- ACTION BUTTONS UNTUK ASISTEN BIBITAN -->
                    <div style="display: flex; gap: 8px; border-top: 1px solid #E2E8F0; padding-top: 10px;">
                      <button type="button" class="btn-return-selection" data-id="${esc(item.id)}" style="flex: 1; height: 36px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                        Kembalikan
                      </button>
                      <button type="button" class="btn-approve-selection" data-id="${esc(item.id)}" style="flex: 1.2; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.2);">
                        Setujui Hasil Seleksi
                      </button>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        `}

      </main>
    </div>
  `;

  // Event Listeners
  app.querySelector('#btn-back')?.addEventListener('click', () => navigate('/home'));

  app.querySelector('#tab-pending')?.addEventListener('click', () => {
    activeAsbTab = 'PENDING';
    renderAsistenSelectionReview(app, currentUser);
  });

  app.querySelector('#tab-history')?.addEventListener('click', () => {
    activeAsbTab = 'HISTORY';
    renderAsistenSelectionReview(app, currentUser);
  });

  // Action: Approve Selection
  app.querySelectorAll('.btn-approve-selection').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const target = allRecords.find(r => r.id === id);
      if (!target) return;

      openModal({
        title: 'Konfirmasi Persetujuan Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              Anda akan menyetujui hasil seleksi batch <strong>${esc(target.batchCode)}</strong> (${target.jumlahLayak} Layak, ${target.jumlahAfkir} Afkir).
            </p>
            <div style="background: #F1F5F9; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 0.78rem;">
              <div style="color: #64748B;">Catatan Tambahan (Opsional):</div>
              <textarea id="modal-approval-notes" rows="2" style="width: 100%; box-sizing: border-box; margin-top: 6px; padding: 6px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.8rem;" placeholder="Masukkan catatan jika ada..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-approve" type="button" style="flex: 1; height: 38px; background: #116834; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Setujui</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-approve')?.addEventListener('click', () => {
        const notes = document.getElementById('modal-approval-notes')?.value || '';
        try {
          approveSelectionRecord(id, notes, currentUser, true);
          closeModal();
          toast('Hasil seleksi bibit berhasil disetujui dan stok batch dimutasi.', 'success');
          renderAsistenSelectionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal menyetujui hasil seleksi', 'error');
        }
      });
    });
  });

  // Action: Return Selection
  app.querySelectorAll('.btn-return-selection').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const target = allRecords.find(r => r.id === id);
      if (!target) return;

      openModal({
        title: 'Kembalikan Hasil Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              Kembalikan hasil seleksi batch <strong>${esc(target.batchCode)}</strong> ke Mantri untuk perbaikan atau penghitungan ulang.
            </p>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Alasan Pengembalian (Wajib) <span style="color: #DC2626;">*</span></label>
              <textarea id="modal-return-reason" rows="3" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" placeholder="Jelaskan alasan pengembalian hasil seleksi..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-return" type="button" style="flex: 1; height: 38px; background: #DC2626; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Kembalikan</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-return')?.addEventListener('click', () => {
        const reason = document.getElementById('modal-return-reason')?.value || '';
        if (!reason.trim()) {
          toast('Alasan pengembalian wajib diisi.', 'error');
          return;
        }
        try {
          returnSelectionRecord(id, reason, currentUser);
          closeModal();
          toast('Hasil seleksi berhasil dikembalikan ke Mantri.', 'info');
          renderAsistenSelectionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal mengembalikan hasil seleksi', 'error');
        }
      });
    });
  });
}

/**
 * =============================================================================
 * MANTRI BIBITAN: OPERASIONAL SELEKSI & DEKLARASI (LEGACY COMPATIBILITY)
 * =============================================================================
 */
function renderMantriSelectionLanding(app, user) {
  const today = formatDate(new Date().toISOString());

  function standardizeSelectionDocNo(rawDocNo, index = 1) {
    if (!rawDocNo || typeof rawDocNo !== 'string') {
      return formatStandardDocNo(2026, 'CULL', index);
    }
    const clean = rawDocNo.trim();
    if (clean.startsWith('2026/CULL/')) return clean;
    const match = clean.match(/(\d+)(?:_\d+)?$/);
    const seq = match ? parseInt(match[1], 10) : index;
    return formatStandardDocNo(2026, 'CULL', seq > 0 ? seq : index);
  }

  let selectionPool = storage.get('selection_pool', []);
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
        
        ${selectionPool.length > 0 ? `
          <div style="margin-bottom: 10px;">
            <h2 style="font-size: 0.90rem; font-weight: 700; color: #111111; margin: 0;">Daftar Bibit Afkir / Diseleksi dari Transaksi</h2>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            ${selectionPool.map((item, idx) => {
              const isDeclared = item.status === 'DECLARED_CULLED';
              const displayDocNo = standardizeSelectionDocNo(item.docNo, idx + 1);

              return `
                <div class="card-selection-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <div style="font-weight: 800; font-size: 0.88rem; color: #111827;">
                      ${item.batchNo || 'Batch-01'} - ${item.klon || 'PB 260'}
                    </div>
                    <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${isDeclared ? '#F0FDF4' : '#FEF2F2'}; color: ${isDeclared ? '#116834' : '#DC2626'}; border: 1px solid ${isDeclared ? '#BBF7D0' : '#FECACA'};">
                      ${isDeclared ? 'Telah Dikurangi' : 'Perlu Deklarasi'}
                    </span>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem; color: #6B7280; margin-bottom: 8px;">
                    <div>${item.bedengan && item.bedengan !== '-' ? item.bedengan : (item.tahapan || 'Pembibitan')}</div>
                    <div>Dok: ${displayDocNo}</div>
                  </div>

                  <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px;">
                    <div style="font-size: 0.62rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Bibit Afkir</div>
                    <div style="font-size: 1.05rem; font-weight: 900; color: #DC2626;">
                      ${parseInt(item.jumlahAfkir || 0).toLocaleString('id-ID')} Pkk
                    </div>
                  </div>

                  ${!isDeclared ? `
                    <button type="button" class="btn-deklarasi-afkir" data-index="${idx}" style="width: 100%; height: 38px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer;">
                      Deklarasi Bibit Afkir (${parseInt(item.jumlahAfkir || 0).toLocaleString('id-ID')} Pkk)
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${selectionPool.length === 0 && culledTxs.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 32px 16px; text-align: center; margin-top: 24px;">
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 6px 0;">Belum Ada Data Penyeleksian</h3>
            <p style="font-size: 0.78rem; color: #757575; margin: 0;">Data bibit afkir akan muncul saat terdapat bibit yang diseleksi pada transaksi hulu.</p>
          </div>
        ` : ''}

        ${culledTxs.length > 0 ? `
          <div style="margin: 20px 0 10px 0;">
            <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0;">Histori Deklarasi Pengurangan Stok (${culledTxs.length})</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${culledTxs.map((ctx, idx) => `
              <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-weight: 800; font-size: 0.88rem; color: #111827;">${ctx.batchNo || 'Batch'} - ${ctx.klon || 'PB 260'}</div>
                  <span style="font-weight: 800; font-size: 0.86rem; color: #DC2626;">-${parseInt(ctx.jumlahAfkir || 0).toLocaleString('id-ID')} Pkk</span>
                </div>
                <div style="font-size: 0.72rem; color: #6B7280; margin-top: 4px;">
                  ${ctx.bedengan || '-'} • Mantri: <strong>${ctx.mantri || user.name}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

      </main>
    </div>
  `;

  app.querySelector('#btn-back')?.addEventListener('click', () => navigate('/home'));

  app.querySelectorAll('.btn-deklarasi-afkir').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const targetPoolItem = selectionPool[idx];
      if (!targetPoolItem) return;

      targetPoolItem.status = 'DECLARED_CULLED';
      storage.set('selection_pool', selectionPool);

      const culled = storage.get('selection_transactions', []);
      culled.push({
        id: `SEL-${Date.now()}`,
        docNo: formatStandardDocNo(2026, 'CULL', culled.length + 1),
        selectionPoolDocNo: targetPoolItem.docNo,
        batchNo: targetPoolItem.batchNo,
        batchCode: targetPoolItem.batchNo,
        klon: targetPoolItem.klon,
        clone: targetPoolItem.klon,
        bedengan: targetPoolItem.bedengan,
        program: targetPoolItem.program,
        tahapan: targetPoolItem.tahapan,
        sumberAsal: targetPoolItem.sumberAsal,
        jumlahAfkir: targetPoolItem.jumlahAfkir,
        tanggal: today,
        mantri: user.name,
        status: 'DECLARED_CULLED'
      });
      storage.set('selection_transactions', culled);

      toast('Pengurangan stok seleksi berhasil dideklarasikan.', 'success');
      renderMantriSelectionLanding(app, user);
    });
  });
}
