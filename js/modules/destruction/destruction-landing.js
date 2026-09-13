/**
 * js/modules/destruction/destruction-landing.js
 * Landing Page & Execution Module: Pemusnahan Bibit (Role Asisten Bibitan & Mantri)
 * 
 * Prinsip:
 * - ASISTEN_BIBITAN: Memeriksa pengajuan pemusnahan (Menunggu Pemeriksaan vs Riwayat Pemusnahan), Approve, Return.
 * - MANTRI_TANAMAN: Membuat & mengajukan form pemusnahan bibit.
 * - SANGAT PENTING: ZERO STOCK MUTATION pada tahapan ASB-10 (Mutasi stok ditunda ke ASB-14).
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, formatStandardDocNo, esc } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import {
  DESTRUCTION_STATUS,
  DESTRUCTION_REASONS,
  STOCK_MUTATION_STATUS,
  DESTRUCTION_STORAGE_KEY,
  filterDestructionByScope,
  getActionableDestructionCount,
  canPerformAsistenDestructionAction,
  approveDestructionRecord,
  returnDestructionRecord,
  createDestructionRecord,
  mutateStockFromDestruction
} from './destruction-manager.js';
import { getAllBatches, getBatchById } from '../../data/batch-master.js';
import { getBedenganById } from '../../data/bedengan-master.js';

export {
  DESTRUCTION_STATUS,
  DESTRUCTION_REASONS,
  DESTRUCTION_STORAGE_KEY,
  filterDestructionByScope,
  getActionableDestructionCount,
  canPerformAsistenDestructionAction,
  approveDestructionRecord,
  returnDestructionRecord,
  createDestructionRecord
};

let activeTab = 'PENDING'; // 'PENDING' | 'HISTORY'

export function renderDestructionLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawUser = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan', role: 'MANTRI_TANAMAN' };
  const currentUser = getCurrentUserContext() || resolveUserContext(rawUser);
  const normalizedUserRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const isAsistenBibitan = normalizedUserRole === ROLES.ASISTEN_BIBITAN;

  if (isAsistenBibitan) {
    renderAsistenDestructionReview(app, currentUser);
  } else {
    renderMantriDestructionLanding(app, currentUser);
  }
}

/**
 * =============================================================================
 * ASISTEN BIBITAN: PEMERIKSAAN PENGAJUAN PEMUSNAHAN (ASB-10 CANONICAL VIEW)
 * =============================================================================
 */
function renderAsistenDestructionReview(app, currentUser) {
  const allRecords = storage.get(DESTRUCTION_STORAGE_KEY, []);
  const scopedRecords = filterDestructionByScope(allRecords, currentUser);

  const pendingRecords = scopedRecords.filter(r => (
    (r.status || '').toUpperCase() === DESTRUCTION_STATUS.MENUNGGU_VERIFIKASI ||
    (r.status || '').toUpperCase() === 'DIAJUKAN' ||
    (r.status || '').toUpperCase() === 'PENDING'
  ));

  const historyRecords = scopedRecords.filter(r => (
    (r.status || '').toUpperCase() === DESTRUCTION_STATUS.DISETUJUI ||
    (r.status || '').toUpperCase() === DESTRUCTION_STATUS.DIKEMBALIKAN
  ));

  const activeList = activeTab === 'PENDING' ? pendingRecords : historyRecords;

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
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Pemusnahan Bibit</h1>
        </div>
      </header>

      <!-- TAB NAVIGATION -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 20px;">
        <button id="tab-pending" type="button" style="padding: 12px 4px; font-size: 0.85rem; font-weight: ${activeTab === 'PENDING' ? '700' : '600'}; color: ${activeTab === 'PENDING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeTab === 'PENDING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Menunggu Pemeriksaan</span>
          ${pendingRecords.length > 0 ? `<span style="background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pendingRecords.length}</span>` : ''}
        </button>
        <button id="tab-history" type="button" style="padding: 12px 4px; font-size: 0.85rem; font-weight: ${activeTab === 'HISTORY' ? '700' : '600'}; color: ${activeTab === 'HISTORY' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeTab === 'HISTORY' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Riwayat Pemusnahan</span>
          ${historyRecords.length > 0 ? `<span style="background: #E2E8F0; color: #475569; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${historyRecords.length}</span>` : ''}
        </button>
      </div>

      <!-- MAIN CONTENT LIST -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        ${activeList.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1E293B; margin: 0 0 4px 0;">
              ${activeTab === 'PENDING' ? 'Tidak Ada Pengajuan Pemusnahan' : 'Belum Ada Riwayat'}
            </h3>
            <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">
              ${activeTab === 'PENDING' 
                ? 'Semua pengajuan pemusnahan bibit telah diverifikasi atau belum ada pengajuan baru dari Mantri.' 
                : 'Daftar pemusnahan bibit yang telah disetujui atau dikembalikan akan tampil di sini.'}
            </p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${activeList.map((item, idx) => {
              const qty = parseInt(item.quantity || item.destructionQty || 0, 10);
              const isActionable = canPerformAsistenDestructionAction(item, currentUser);
              const isApproved = item.status === DESTRUCTION_STATUS.DISETUJUI;
              const isReturned = item.status === DESTRUCTION_STATUS.DIKEMBALIKAN;

              let statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A;">MENUNGGU PEMERIKSAAN</span>`;
              if (isApproved) {
                let mutationBadge = '';
                if (item.stockMutationStatus === 'APPLIED') {
                  mutationBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; margin-left: 4px;">STOCK APPLIED (-${item.stockMutationQty || qty} Pkk)</span>`;
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
                <div class="card-destruction-item" data-id="${esc(item.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  
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
                      Dok: <strong style="color: #334155;">${esc(item.docNo || item.destructionNo || '-')}</strong>
                    </div>
                  </div>

                  <!-- METRIK & ALASAN -->
                  <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px; background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; align-items: center;">
                    <div>
                      <div style="font-size: 0.64rem; font-weight: 700; color: #991B1B; text-transform: uppercase;">Alasan Pemusnahan</div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #991B1B; margin-top: 2px;">
                        ${esc(item.reason || item.alasan || 'Tidak memenuhi standar')}
                      </div>
                    </div>
                    <div style="text-align: right; border-left: 1px solid #FECACA; padding-left: 10px;">
                      <div style="font-size: 0.64rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Jumlah Dimusnahkan</div>
                      <div style="font-size: 1.1rem; font-weight: 900; color: #DC2626; margin-top: 1px;">
                        ${qty.toLocaleString('id-ID')} <span style="font-size: 0.72rem; font-weight: 700;">Pkk</span>
                      </div>
                    </div>
                  </div>

                  <!-- CATATAN / AUDIT -->
                  <div style="font-size: 0.72rem; color: #475569; margin-bottom: ${isActionable ? '12px' : '4px'};">
                    <div>Pengaju: <strong>${esc(item.createdByName || 'Mantri Bibitan')}</strong> • ${esc(item.tanggalPemusnahan || item.createdAt ? formatDate(item.createdAt) : '-')}</div>
                    ${item.description && item.description !== '-' ? `<div style="margin-top: 2px;">Keterangan: <em>${esc(item.description)}</em></div>` : ''}
                    ${item.approvalNotes ? `<div style="margin-top: 2px; color: #15803D;">Catatan Persetujuan: ${esc(item.approvalNotes)}</div>` : ''}
                    ${item.returnReason ? `<div style="margin-top: 2px; color: #DC2626;">Alasan Pengembalian: <strong>${esc(item.returnReason)}</strong></div>` : ''}
                  </div>

                  ${isActionable ? `
                    <!-- ACTION BUTTONS UNTUK ASISTEN BIBITAN -->
                    <div style="display: flex; gap: 8px; border-top: 1px solid #E2E8F0; padding-top: 10px;">
                      <button type="button" class="btn-return-destruction" data-id="${esc(item.id)}" style="flex: 1; height: 36px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                        Kembalikan
                      </button>
                      <button type="button" class="btn-approve-destruction" data-id="${esc(item.id)}" style="flex: 1.2; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.2);">
                        Setujui Pemusnahan
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
    activeTab = 'PENDING';
    renderAsistenDestructionReview(app, currentUser);
  });

  app.querySelector('#tab-history')?.addEventListener('click', () => {
    activeTab = 'HISTORY';
    renderAsistenDestructionReview(app, currentUser);
  });

  // Action: Approve Destruction
  app.querySelectorAll('.btn-approve-destruction').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const target = allRecords.find(r => r.id === id);
      if (!target) return;

      openModal({
        title: 'Konfirmasi Persetujuan Pemusnahan',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              Anda akan menyetujui pemusnahan bibit sebanyak <strong style="color: #DC2626;">${parseInt(target.quantity || 0).toLocaleString('id-ID')} Pkk</strong> pada batch <strong>${esc(target.batchCode)}</strong> (${esc(target.reason)}).
            </p>
            <div style="background: #F1F5F9; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 0.78rem;">
              <div style="color: #64748B;">Catatan Tambahan (Opsional):</div>
              <textarea id="modal-destruction-notes" rows="2" style="width: 100%; box-sizing: border-box; margin-top: 6px; padding: 6px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.8rem;" placeholder="Masukkan catatan jika ada..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-approve-destr" type="button" style="flex: 1; height: 38px; background: #116834; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Setujui</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-approve-destr')?.addEventListener('click', () => {
        const notes = document.getElementById('modal-destruction-notes')?.value || '';
        try {
          approveDestructionRecord(id, notes, currentUser, true);
          closeModal();
          toast('Pengajuan pemusnahan bibit berhasil disetujui dan stok batch dimutasi.', 'success');
          renderAsistenDestructionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal menyetujui pemusnahan bibit', 'error');
        }
      });
    });
  });

  // Action: Return Destruction
  app.querySelectorAll('.btn-return-destruction').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const target = allRecords.find(r => r.id === id);
      if (!target) return;

      openModal({
        title: 'Kembalikan Pengajuan Pemusnahan',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              Kembalikan pengajuan pemusnahan batch <strong>${esc(target.batchCode)}</strong> (${parseInt(target.quantity || 0).toLocaleString('id-ID')} Pkk) ke Mantri untuk verifikasi ulang.
            </p>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Alasan Pengembalian (Wajib) <span style="color: #DC2626;">*</span></label>
              <textarea id="modal-destruction-return-reason" rows="3" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" placeholder="Jelaskan alasan pengembalian pengajuan pemusnahan..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-return-destr" type="button" style="flex: 1; height: 38px; background: #DC2626; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Kembalikan</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-return-destr')?.addEventListener('click', () => {
        const reason = document.getElementById('modal-destruction-return-reason')?.value || '';
        if (!reason.trim()) {
          toast('Alasan pengembalian wajib diisi.', 'error');
          return;
        }
        try {
          returnDestructionRecord(id, reason, currentUser);
          closeModal();
          toast('Pengajuan pemusnahan berhasil dikembalikan.', 'info');
          renderAsistenDestructionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal mengembalikan pengajuan pemusnahan', 'error');
        }
      });
    });
  });
}

/**
 * =============================================================================
 * MANTRI BIBITAN: FORM PENGAJUAN PEMUSNAHAN
 * =============================================================================
 */
function renderMantriDestructionLanding(app, currentUser) {
  const allBatches = getAllBatches().filter(b => b.estateId === currentUser.estateId && (b.availableQty || 0) > 0 && b.status !== 'INACTIVE');
  const todayStr = new Date().toISOString().split('T')[0];

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
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Pengajuan Pemusnahan Bibit</h1>
        </div>
      </header>

      <!-- FORM SUBMISSION -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        <form id="form-destruction" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Pilih Batch Sumber <span style="color: #DC2626;">*</span></label>
            <select id="select-batch" required style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.82rem; background: #FFF;">
              <option value="">-- Pilih Batch --</option>
              ${allBatches.map(b => `
                <option value="${esc(b.id)}">${esc(b.batchCode || b.batchNo)} (${esc(b.clone || b.klon)}) - Stok: ${(b.availableQty || 0).toLocaleString('id-ID')} Pkk</option>
              `).join('')}
            </select>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Jumlah Pemusnahan (Pkk) <span style="color: #DC2626;">*</span></label>
            <input type="number" id="input-qty" required min="1" placeholder="Masukkan jumlah bibit..." style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; box-sizing: border-box;" />
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Alasan Pemusnahan <span style="color: #DC2626;">*</span></label>
            <select id="select-reason" required style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.82rem; background: #FFF;">
              ${DESTRUCTION_REASONS.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
            </select>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 4px;">Catatan / Keterangan Rinci</label>
            <textarea id="input-notes" rows="3" placeholder="Masukkan keterangan tambahan jika diperlukan..." style="width: 100%; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px; font-size: 0.82rem; box-sizing: border-box;"></textarea>
          </div>

          <button type="submit" style="width: 100%; height: 40px; background: #116834; color: #FFF; border: none; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
            Kirim Pengajuan Pemusnahan
          </button>
        </form>
      </main>
    </div>
  `;

  app.querySelector('#btn-back')?.addEventListener('click', () => navigate('/home'));

  app.querySelector('#form-destruction')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const batchId = document.getElementById('select-batch')?.value;
    const qty = parseInt(document.getElementById('input-qty')?.value, 10);
    const reason = document.getElementById('select-reason')?.value;
    const notes = document.getElementById('input-notes')?.value || '';

    try {
      createDestructionRecord({
        batchId: batchId,
        quantity: qty,
        reason: reason,
        description: notes,
        tanggalPemusnahan: todayStr
      }, currentUser);

      toast('Pengajuan pemusnahan berhasil dikirim ke Asisten Bibitan.', 'success');
      navigate('/home');
    } catch (err) {
      toast(err.message || 'Gagal membuat pengajuan pemusnahan', 'error');
    }
  });
}
