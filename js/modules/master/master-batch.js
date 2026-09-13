/**
 * js/modules/master/master-batch.js
 * Modul Pengelolaan Master Batch Role ASISTEN_BIBITAN (TASK ASB-04)
 */

import { navigate } from '../../core/router.js';
import { getCurrentUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { openQRViewerModal } from '../../components/qr-viewer-modal.js';
import { esc, formatDate } from '../../core/utils.js';
import {
  BATCH_STATUS,
  BATCH_CATEGORIES,
  BATCH_GROWTH_STAGES,
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getNextBatchCandidate,
  createBatch,
  updateBatch,
  activateBatch,
  deactivateBatch
} from '../../data/batch-master.js';
import { getActivePrograms, getProgramById } from '../../data/program-master.js';
import { getActiveEstates, getEstateById, getNurseryDivisionsByEstate } from '../../data/estate-master.js';
import { getActiveKlons, normalizeKlonName } from '../../data/klon-master.js';
import { getActiveBedengan, getBedenganById } from '../../data/bedengan-master.js';

let state = {
  search: '',
  programId: 'ALL',
  estateId: 'ALL',
  divisionId: 'ALL',
  cloneId: 'ALL',
  growthStage: 'ALL',
  status: 'ALL'
};

export function renderMasterBatch() {
  const app = document.getElementById('app');
  const user = getCurrentUserContext();
  const normalizedRole = normalizeRole(user?.role);
  const isAsb = normalizedRole === ROLES.ASISTEN_BIBITAN;

  // Auto-scope for ASISTEN_BIBITAN
  if (isAsb && user.estateId && state.estateId === 'ALL') {
    state.estateId = user.estateId;
  }
  if (isAsb && user.divisionId && state.divisionId === 'ALL') {
    state.divisionId = user.divisionId;
  }

  const allPrograms = getActivePrograms();
  const allEstates = getActiveEstates();
  const allKlons = getActiveKlons();

  function getFilteredList() {
    if (isAsb) {
      const filters = {
        estateId: user.estateId,
        divisionId: user.divisionId
      };
      if (state.programId !== 'ALL') filters.programId = state.programId;
      return getAllBatches(filters);
    }
    const filters = {};
    if (state.search) filters.search = state.search;
    if (state.programId !== 'ALL') filters.programId = state.programId;
    if (state.estateId !== 'ALL') filters.estateId = state.estateId;
    if (state.divisionId !== 'ALL') filters.divisionId = state.divisionId;
    if (state.cloneId !== 'ALL') filters.cloneId = state.cloneId;
    if (state.growthStage !== 'ALL') filters.growthStage = state.growthStage;
    if (state.status !== 'ALL') filters.status = state.status;

    return getAllBatches(filters);
  }

  function getStats() {
    const all = getAllBatches({
      estateId: isAsb ? user.estateId : (state.estateId !== 'ALL' ? state.estateId : undefined),
      divisionId: isAsb ? user.divisionId : (state.divisionId !== 'ALL' ? state.divisionId : undefined)
    });
    const availableBatches = all.filter(b => b.status === BATCH_STATUS.AVAILABLE && (b.availableQty || 0) > 0);
    const activeBatches = all.filter(b => b.status === BATCH_STATUS.AVAILABLE);
    const totalStock = availableBatches.reduce((acc, b) => acc + (Number(b.availableQty) || 0), 0);

    return {
      total: all.length,
      available: availableBatches.length,
      active: activeBatches.length,
      inactive: all.filter(b => b.status === BATCH_STATUS.INACTIVE).length,
      totalStock: totalStock,
      empty: all.filter(b => b.status === BATCH_STATUS.EMPTY || (b.availableQty || 0) <= 0).length
    };
  }

  function renderView() {
    const items = getFilteredList();
    const stats = getStats();
    const currentDivisions = state.estateId !== 'ALL' ? getNurseryDivisionsByEstate(state.estateId) : [];

    if (isAsb) {
      app.innerHTML = `
        <div class="page master-batch-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          
          <!-- HEADER (ASB) -->
          <header style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 12px 14px; flex-shrink: 0; z-index: 10;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <button id="btn-back-home" type="button" style="background: transparent; border: none; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #475569;">
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <div>
                  <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0;">Master Batch</h1>
                </div>
              </div>
            </div>
          </header>

          <!-- MAIN SCROLLABLE CONTAINER (ASB) -->
          <main style="flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 12px 14px 28px 14px; box-sizing: border-box;">
            
            <!-- COMPACT SUMMARY (4 METRICS) -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 8px; text-align: center;">
                <div>
                  <div style="font-size: 0.68rem; color: #64748B; font-weight: 600;">Total</div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-top: 1px;">${stats.total}</div>
                </div>
                <div>
                  <div style="font-size: 0.68rem; color: #15803D; font-weight: 600;">Tersedia</div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #166534; margin-top: 1px;">${stats.available}</div>
                </div>
                <div>
                  <div style="font-size: 0.68rem; color: #15803D; font-weight: 600;">Aktif</div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #166534; margin-top: 1px;">${stats.active}</div>
                </div>
                <div>
                  <div style="font-size: 0.68rem; color: #64748B; font-weight: 600;">Nonaktif</div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #64748B; margin-top: 1px;">${stats.inactive}</div>
                </div>
              </div>
            </div>

            <!-- FILTER BAR (HANYA PROGRAM PEMBIBITAN) -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
              <select id="select-filter-program" style="width: 100%; padding: 8px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #1E293B; outline: none;">
                <option value="ALL">Semua Program</option>
                ${allPrograms.map(p => `<option value="${p.id}" ${state.programId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
              </select>
            </div>

            <!-- LIST OF BATCHES -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              ${items.length === 0 ? `
                <div style="text-align: center; padding: 24px 16px; color: #64748B; font-size: 0.84rem;">
                  Belum ada data batch.
                </div>
              ` : `
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                    <thead>
                      <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #475569; font-weight: 700; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.03em;">
                        <th style="padding: 9px 12px;">Kode Batch</th>
                        <th style="padding: 9px 12px;">Klon</th>
                        <th style="padding: 9px 12px;">Program</th>
                        <th style="padding: 9px 12px;">Tahapan Pertumbuhan</th>
                        <th style="padding: 9px 12px;">Kategori</th>
                        <th style="padding: 9px 12px; text-align: right;">Stok Tersedia</th>
                        <th style="padding: 9px 12px;">Status</th>
                        <th style="padding: 9px 12px; text-align: center;">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map((b, idx) => {
                        const prog = getProgramById(b.programId);
                        let statusBadge = { bg: '#E2E8F0', color: '#475569', label: 'Nonaktif' };
                        if (b.status === BATCH_STATUS.AVAILABLE && (b.availableQty || 0) > 0) statusBadge = { bg: '#DCFCE7', color: '#166534', label: 'Tersedia' };
                        else if (b.status === BATCH_STATUS.CREATED) statusBadge = { bg: '#DBEAFE', color: '#1E40AF', label: 'Baru' };
                        else if (b.status === BATCH_STATUS.EMPTY || (b.availableQty || 0) <= 0) statusBadge = { bg: '#FFEDD5', color: '#9A3412', label: 'Habis' };

                        return `
                          <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.1s ease; ${idx % 2 === 1 ? 'background: #FAFAFA;' : ''}">
                            <td style="padding: 10px 12px; font-weight: 700; color: #0F172A; font-family: monospace;">
                              ${esc(b.batchCode || b.batchNo || '-')}
                            </td>
                            <td style="padding: 10px 12px; font-weight: 700; color: #1E293B;">
                              ${esc(b.clone || b.klon || '-')}
                            </td>
                            <td style="padding: 10px 12px; font-weight: 600; color: #1E293B;">
                              ${esc(prog ? prog.name : b.programId || '-')}
                            </td>
                            <td style="padding: 10px 12px; color: #475569;">
                              ${esc(b.growthStage || b.stage || '-')}
                            </td>
                            <td style="padding: 10px 12px; color: #475569;">
                              ${esc(b.category || '-')}
                            </td>
                            <td style="padding: 10px 12px; text-align: right;">
                              <div style="font-weight: 700; color: ${(b.availableQty || 0) > 0 ? '#15803D' : '#94A3B8'}; font-size: 0.90rem;">
                                ${Number(b.availableQty || 0).toLocaleString('id-ID')} <span style="font-size: 0.70rem; color: #64748B; font-weight: 400;">Bibit</span>
                              </div>
                            </td>
                            <td style="padding: 10px 12px;">
                              <span style="display: inline-block; padding: 2px 7px; background: ${statusBadge.bg}; color: ${statusBadge.color}; border-radius: 9999px; font-size: 0.70rem; font-weight: 700;">
                                ${statusBadge.label}
                              </span>
                            </td>
                            <td style="padding: 10px 12px; text-align: center; white-space: nowrap;">
                              <button type="button" class="btn-view-qr" data-id="${b.id || b.batchId}" title="Lihat QR Batch" style="padding: 4px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; color: #166534; font-size: 0.74rem; font-weight: 700; cursor: pointer;">Lihat QR</button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>

          </main>

          <!-- BOTTOM ACTION (INSIDE MOBILE FRAME) -->
          <div style="flex-shrink: 0; padding: 10px 14px; background: #FFFFFF; border-top: 1px solid #E2E8F0; box-shadow: 0 -2px 8px rgba(0,0,0,0.05); z-index: 10;">
            <button id="btn-tambah-batch-bottom" type="button" style="width: 100%; background: #116834; color: #FFFFFF; border: none; padding: 12px 16px; border-radius: 8px; font-size: 0.90rem; font-weight: 700; cursor: pointer; text-align: center; box-shadow: 0 2px 4px rgba(17,104,52,0.2); transition: background 0.15s ease;">
              Tambah Batch
            </button>
          </div>

        </div>
      `;
    } else {
      // Role lain / Non-ASB: Existing Full UI
      app.innerHTML = `
        <div class="page master-batch-page" style="display: flex; flex-direction: column; min-height: 100%; background: #F8FAFC; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          
          <!-- HEADER -->
          <header style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 14px 16px; position: sticky; top: 0; z-index: 20;">
            <div style="max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <button id="btn-back-home" type="button" style="background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #475569;">
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <div>
                  <h1 style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin: 0;">Master Batch Bibitan</h1>
                  <p style="font-size: 0.76rem; color: #64748B; margin: 0;">Data referensi operasional batch & saldo stok bibit nursery terpusat</p>
                </div>
              </div>

              <button id="btn-tambah-batch" type="button" style="background: #116834; color: #FFFFFF; border: none; padding: 8px 14px; border-radius: 6px; font-size: 0.84rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.15s ease;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Tambah Batch</span>
              </button>
            </div>
          </header>

          <!-- MAIN CONTAINER -->
          <main style="max-width: 1100px; width: 100%; margin: 0 auto; padding: 16px; box-sizing: border-box; flex: 1;">
            
            <!-- SUMMARY CARDS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px;">
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Total Batch</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${stats.total}</div>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #15803D; text-transform: uppercase;">Batch Aktif</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #166534; margin-top: 2px;">${stats.available}</div>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #15803D; text-transform: uppercase;">Total Stok Aktif</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #166534; margin-top: 2px;">${stats.totalStock.toLocaleString('id-ID')} <span style="font-size: 0.74rem; font-weight: 500;">Bibit</span></div>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #FED7AA; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #C2410C; text-transform: uppercase;">Habis / Kosong</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #9A3412; margin-top: 2px;">${stats.empty}</div>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #94A3B8; text-transform: uppercase;">Nonaktif</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #64748B; margin-top: 2px;">${stats.inactive}</div>
              </div>
            </div>

            <!-- FILTER BAR -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
              
              <!-- Search -->
              <div style="flex: 1; min-width: 180px; position: relative;">
                <input id="input-search" type="text" placeholder="Cari kode batch, ID, klon..." value="${esc(state.search)}" style="width: 100%; box-sizing: border-box; padding: 8px 10px 8px 30px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none;">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="#94A3B8" stroke-width="2.2" fill="none" style="position: absolute; left: 9px; top: 10px;">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              <!-- Filter Program -->
              <select id="select-filter-program" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 130px;">
                <option value="ALL">Semua Program</option>
                ${allPrograms.map(p => `<option value="${p.id}" ${state.programId === p.id ? 'selected' : ''}>${esc(p.code)} - ${esc(p.name)}</option>`).join('')}
              </select>

              <!-- Filter Estate -->
              <select id="select-filter-estate" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 110px;">
                <option value="ALL">Semua Kebun</option>
                ${allEstates.map(e => `<option value="${e.estate_id}" ${state.estateId === e.estate_id ? 'selected' : ''}>${esc(e.estate_name)}</option>`).join('')}
              </select>

              <!-- Filter Divisi -->
              <select id="select-filter-division" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 110px;">
                <option value="ALL">Semua Divisi</option>
                ${currentDivisions.map(d => `<option value="${d.divisionId}" ${state.divisionId === d.divisionId ? 'selected' : ''}>${esc(d.divisionName)}</option>`).join('')}
              </select>

              <!-- Filter Klon -->
              <select id="select-filter-clone" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 110px;">
                <option value="ALL">Semua Klon</option>
                ${allKlons.map(k => `<option value="${k.name}" ${state.cloneId === k.name ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}
              </select>

              <!-- Filter Status -->
              <select id="select-filter-status" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 110px;">
                <option value="ALL" ${state.status === 'ALL' ? 'selected' : ''}>Semua Status</option>
                <option value="${BATCH_STATUS.AVAILABLE}" ${state.status === BATCH_STATUS.AVAILABLE ? 'selected' : ''}>Tersedia</option>
                <option value="${BATCH_STATUS.EMPTY}" ${state.status === BATCH_STATUS.EMPTY ? 'selected' : ''}>Habis</option>
                <option value="${BATCH_STATUS.INACTIVE}" ${state.status === BATCH_STATUS.INACTIVE ? 'selected' : ''}>Nonaktif</option>
              </select>

              ${(state.search || state.programId !== 'ALL' || state.estateId !== 'ALL' || state.status !== 'ALL') ? `
                <button id="btn-reset-filter" type="button" style="padding: 7px 10px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.8rem; color: #475569; cursor: pointer;">Reset</button>
              ` : ''}
            </div>

            <!-- LIST OF BATCHES -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              ${items.length === 0 ? `
                <div style="text-align: center; padding: 40px 16px; color: #94A3B8;">
                  <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" style="margin-bottom: 8px;">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <div style="font-size: 0.95rem; font-weight: 600; color: #475569;">Tidak ada batch yang cocok</div>
                  <div style="font-size: 0.8rem; margin-top: 4px;">Coba ubah kata kunci pencarian atau filter.</div>
                </div>
              ` : `
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
                    <thead>
                      <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #475569; font-weight: 700; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.03em;">
                        <th style="padding: 10px 14px;">Kode Batch</th>
                        <th style="padding: 10px 14px;">Klon & Tahapan</th>
                        <th style="padding: 10px 14px;">Kebun & Divisi</th>
                        <th style="padding: 10px 14px;">Bedengan</th>
                        <th style="padding: 10px 14px; text-align: right;">Stok Tersedia</th>
                        <th style="padding: 10px 14px;">Status</th>
                        <th style="padding: 10px 14px; text-align: center;">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map((b, idx) => {
                        const prog = getProgramById(b.programId);
                        const est = getEstateById(b.estateId);
                        
                        let statusBadge = { bg: '#E2E8F0', color: '#475569', label: 'Nonaktif' };
                        if (b.status === BATCH_STATUS.AVAILABLE && (b.availableQty || 0) > 0) statusBadge = { bg: '#DCFCE7', color: '#166534', label: 'Tersedia' };
                        else if (b.status === BATCH_STATUS.CREATED) statusBadge = { bg: '#DBEAFE', color: '#1E40AF', label: 'Baru' };
                        else if (b.status === BATCH_STATUS.EMPTY || (b.availableQty || 0) <= 0) statusBadge = { bg: '#FFEDD5', color: '#9A3412', label: 'Habis' };

                        const bedLabels = (Array.isArray(b.bedenganIds) ? b.bedenganIds : []).map(bid => {
                          const bedObj = getBedenganById(bid);
                          return bedObj ? bedObj.bedenganCode || bedObj.name : bid;
                        });

                        return `
                          <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.1s ease; ${idx % 2 === 1 ? 'background: #FAFAFA;' : ''}">
                            <td style="padding: 12px 14px;">
                              <div style="font-weight: 700; color: #0F172A; font-family: monospace;">${esc(b.batchCode || b.batchNo || '-')}</div>
                              <div style="font-size: 0.72rem; color: #64748B;">${esc(prog ? prog.code : b.programId || '-')}</div>
                            </td>
                            <td style="padding: 12px 14px;">
                              <div style="font-weight: 700; color: #1E293B;">${esc(b.clone || b.klon || '-')}</div>
                              <div style="font-size: 0.72rem; color: #64748B;">${esc(b.growthStage || b.stage || '-')} • ${esc(b.category || '-')}</div>
                            </td>
                            <td style="padding: 12px 14px;">
                              <div style="font-weight: 600; color: #1E293B;">${esc(est ? est.estate_name : b.estateName || b.estateId)}</div>
                              <div style="font-size: 0.72rem; color: #64748B;">${esc(b.divisionName || b.divisionId)}</div>
                            </td>
                            <td style="padding: 12px 14px;">
                              <div style="display: flex; flex-wrap: wrap; gap: 4px; max-width: 180px;">
                                ${bedLabels.length > 0 ? bedLabels.map(bl => `
                                  <span style="display: inline-block; padding: 1px 5px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; font-family: monospace; font-size: 0.72rem; color: #334155;">
                                    ${esc(bl)}
                                  </span>
                                `).join('') : '<span style="color: #94A3B8; font-size: 0.74rem;">-</span>'}
                              </div>
                            </td>
                            <td style="padding: 12px 14px; text-align: right;">
                              <div style="font-weight: 700; color: ${(b.availableQty || 0) > 0 ? '#15803D' : '#94A3B8'}; font-size: 0.92rem;">
                                ${Number(b.availableQty || 0).toLocaleString('id-ID')} <span style="font-size: 0.72rem; color: #64748B; font-weight: 400;">Bibit</span>
                              </div>
                              <div style="font-size: 0.7rem; color: #94A3B8;">Awal: ${Number(b.initialQty || b.receivedQty || 0).toLocaleString('id-ID')}</div>
                            </td>
                            <td style="padding: 12px 14px;">
                              <span style="display: inline-block; padding: 3px 8px; background: ${statusBadge.bg}; color: ${statusBadge.color}; border-radius: 9999px; font-size: 0.72rem; font-weight: 700;">
                                ${statusBadge.label}
                              </span>
                            </td>
                            <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
                              <button type="button" class="btn-detail-batch" data-id="${b.id || b.batchId}" title="Lihat Detail" style="padding: 5px 8px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; color: #475569; font-size: 0.76rem; font-weight: 600; cursor: pointer; margin-right: 4px;">
                                Detail
                              </button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>

          </main>
        </div>
      `;
    }

    bindEvents();
  }

  function bindEvents() {
    app.querySelector('#btn-back-home')?.addEventListener('click', () => {
      navigate('/home');
    });

    app.querySelector('#input-search')?.addEventListener('input', (e) => {
      state.search = e.target.value;
      renderView();
    });

    app.querySelector('#select-filter-program')?.addEventListener('change', (e) => {
      state.programId = e.target.value;
      renderView();
    });

    app.querySelector('#select-filter-estate')?.addEventListener('change', (e) => {
      state.estateId = e.target.value;
      state.divisionId = 'ALL';
      renderView();
    });

    app.querySelector('#select-filter-division')?.addEventListener('change', (e) => {
      state.divisionId = e.target.value;
      renderView();
    });

    app.querySelector('#select-filter-clone')?.addEventListener('change', (e) => {
      state.cloneId = e.target.value;
      renderView();
    });

    app.querySelector('#select-filter-status')?.addEventListener('change', (e) => {
      state.status = e.target.value;
      renderView();
    });

    app.querySelector('#btn-reset-filter')?.addEventListener('click', () => {
      state.search = '';
      state.programId = 'ALL';
      state.estateId = isAsb && user.estateId ? user.estateId : 'ALL';
      state.divisionId = isAsb && user.divisionId ? user.divisionId : 'ALL';
      state.cloneId = 'ALL';
      state.growthStage = 'ALL';
      state.status = 'ALL';
      renderView();
    });

    // Tambah Batch Buttons (Header or Bottom)
    app.querySelector('#btn-tambah-batch')?.addEventListener('click', () => {
      openCreateBatchModal();
    });
    app.querySelector('#btn-tambah-batch-bottom')?.addEventListener('click', () => {
      openCreateBatchModal();
    });

    // View QR Modal
    app.querySelectorAll('.btn-view-qr').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = getBatchById(id);
        if (!item) return;
        const prog = getProgramById(item.programId);
        openQRViewerModal({
          type: 'BATCH',
          typeTitle: 'Batch',
          code: item.batchCode || item.batchNo,
          name: item.name || `Batch ${item.batchCode || item.batchNo}`,
          programName: prog ? prog.name : item.programId,
          programCode: prog ? prog.code : item.programId,
          startDate: formatDate(item.createdAt),
          verificationText: 'Terverifikasi Sistem SIGMA',
          payload: {
            type: 'BATCH',
            batchId: item.batchId || item.id,
            batchCode: item.batchCode || item.batchNo,
            programId: item.programId,
            estateId: item.estateId,
            divisionId: item.divisionId
          }
        });
      });
    });

    app.querySelectorAll('.btn-detail-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        openDetailBatchModal(btn.dataset.id);
      });
    });

    app.querySelectorAll('.btn-edit-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        openEditBatchModal(btn.dataset.id);
      });
    });

    app.querySelectorAll('.btn-toggle-status-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        handleToggleStatus(id, action);
      });
    });
  }

  function handleToggleStatus(id, action) {
    try {
      if (action === 'ACTIVATE') {
        activateBatch(id, user);
        toast('Batch berhasil diaktifkan kembali.', 'success');
      } else {
        deactivateBatch(id, user);
        toast('Batch berhasil dinonaktifkan (arsip aman).', 'info');
      }
      renderView();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function openCreateBatchModal() {
    const activePrograms = getActivePrograms();
    const defaultEstate = user.estateId || (allEstates[0] ? allEstates[0].estate_id : 'EST-TBS');
    const initialDivisions = getNurseryDivisionsByEstate(defaultEstate);
    const defaultDivision = user.divisionId || (initialDivisions[0] ? initialDivisions[0].divisionId : 'DIV-001');

    const est = getEstateById(defaultEstate);
    const div = initialDivisions.find(d => d.divisionId === defaultDivision);

    const estateLabel = est ? est.estate_name : defaultEstate;
    const divisionLabel = div ? div.divisionName : defaultDivision;

    const html = `
      <div style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0 0 14px 0;">Tambah Master Batch Bibitan</h2>
        
        <div id="modal-create-batch-error" style="display: none; background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 8px 12px; border-radius: 6px; font-size: 0.80rem; margin-bottom: 12px; font-weight: 500;"></div>

        <form id="form-create-batch" style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- SCOPE INFO USER AKTIF (NON-EDITABLE) -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; font-size: 0.78rem; color: #475569;">
            Kebun: <strong>${esc(estateLabel)}</strong> &bull; Divisi: <strong>${esc(divisionLabel)}</strong>
          </div>
          <input type="hidden" id="modal-create-batch-estate" value="${esc(defaultEstate)}">
          <input type="hidden" id="modal-create-batch-division" value="${esc(defaultDivision)}">

          <!-- FIELD PERTAMA: PROGRAM PEMBIBITAN -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Program Pembibitan *</label>
            <select id="modal-create-batch-program" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
              <option value="" disabled selected>Pilih Program Pembibitan</option>
              ${activePrograms.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
            </select>
          </div>

          <!-- Preview Identity Batch (SAMA DENGAN MASTER BEDENGAN) -->
          <div id="preview-batch-identity-container" style="margin-top: 4px; padding: 12px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 6px; transition: all 0.2s ease;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; display: flex; align-items: center; justify-content: space-between;">
              <span>Preview Identity Batch (Auto-Generated)</span>
              <span id="preview-batch-badge-status" style="font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; background: #E2E8F0; color: #64748B;">Menunggu Program</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Program</div>
                <div id="preview-batch-program-name" style="font-size: 0.82rem; font-weight: 600; color: #1E293B;">—</div>
              </div>
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Kebun & Divisi</div>
                <div id="preview-batch-scope" style="font-size: 0.82rem; font-weight: 600; color: #1E293B;">${esc(estateLabel)} &bull; ${esc(divisionLabel)}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Kode Batch</div>
                <div id="preview-batch-code" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; font-family: monospace;">—</div>
                <input type="hidden" id="modal-create-batch-code" value="">
                <input type="hidden" id="modal-create-batch-id" value="">
              </div>
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Nama Batch</div>
                <div id="preview-batch-name" style="font-size: 0.88rem; font-weight: 700; color: #0F172A;">—</div>
                <input type="hidden" id="modal-create-batch-name" value="">
              </div>
            </div>
            
            <div>
              <div style="font-size: 0.68rem; color: #64748B;">QR Code</div>
              <div id="preview-batch-qr" style="font-size: 0.82rem; font-weight: 700; color: #0F172A; font-family: monospace;">—</div>
              <input type="hidden" id="modal-create-batch-qr" value="">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button id="btn-cancel-create-batch" type="button" style="padding: 8px 16px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #475569; cursor: pointer;">Batal</button>
            <button id="btn-submit-create-batch" type="submit" style="padding: 8px 18px; background: #116834; border: none; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #FFFFFF; cursor: pointer;">Simpan Batch</button>
          </div>

        </form>
      </div>
    `;

    openModal(html);

    const form = document.getElementById('form-create-batch');
    const progSel = document.getElementById('modal-create-batch-program');
    const estateSel = document.getElementById('modal-create-batch-estate');
    const divSel = document.getElementById('modal-create-batch-division');
    const codeInput = document.getElementById('modal-create-batch-code');
    const nameInput = document.getElementById('modal-create-batch-name');
    const idInput = document.getElementById('modal-create-batch-id');
    const qrInput = document.getElementById('modal-create-batch-qr');
    const errorBox = document.getElementById('modal-create-batch-error');

    const previewContainer = document.getElementById('preview-batch-identity-container');
    const previewBadge = document.getElementById('preview-batch-badge-status');
    const previewProgram = document.getElementById('preview-batch-program-name');
    const previewCode = document.getElementById('preview-batch-code');
    const previewName = document.getElementById('preview-batch-name');
    const previewQR = document.getElementById('preview-batch-qr');

    const updatePreviewOnProgramChange = (progId) => {
      if (!progId) {
        if (previewContainer) {
          previewContainer.style.background = '#F8FAFC';
          previewContainer.style.borderColor = '#CBD5E1';
        }
        if (previewBadge) {
          previewBadge.textContent = 'Menunggu Program';
          previewBadge.style.background = '#E2E8F0';
          previewBadge.style.color = '#64748B';
        }
        if (previewProgram) previewProgram.textContent = '—';
        if (previewCode) previewCode.textContent = '—';
        if (previewName) previewName.textContent = '—';
        if (previewQR) previewQR.textContent = '—';
        if (codeInput) codeInput.value = '';
        if (nameInput) nameInput.value = '';
        if (idInput) idInput.value = '';
        if (qrInput) qrInput.value = '';
        return;
      }

      const progObj = getProgramById(progId);
      const candidate = getNextBatchCandidate(progId, defaultEstate, defaultDivision);

      if (candidate) {
        if (previewContainer) {
          previewContainer.style.background = '#F0FDF4';
          previewContainer.style.borderColor = '#86EFAC';
        }
        if (previewBadge) {
          previewBadge.textContent = 'Ready to Generate';
          previewBadge.style.background = '#DCFCE7';
          previewBadge.style.color = '#166534';
        }
        if (previewProgram) previewProgram.textContent = progObj ? progObj.name : progId;
        if (previewCode) previewCode.textContent = candidate.batchCode;
        if (previewName) previewName.textContent = candidate.name;
        if (previewQR) previewQR.textContent = candidate.qrCode;

        if (codeInput) codeInput.value = candidate.batchCode;
        if (nameInput) nameInput.value = candidate.name;
        if (idInput) idInput.value = candidate.batchId;
        if (qrInput) qrInput.value = candidate.qrCode;
      }
    };

    progSel?.addEventListener('change', (e) => {
      updatePreviewOnProgramChange(e.target.value);
    });

    document.getElementById('btn-cancel-create-batch')?.addEventListener('click', closeModal);

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
      }

      const programVal = progSel?.value;
      const estateVal = estateSel?.value;
      const divVal = divSel?.value;

      if (!programVal) {
        if (errorBox) {
          errorBox.textContent = 'Program Pembibitan wajib dipilih terlebih dahulu';
          errorBox.style.display = 'block';
        }
        return;
      }

      // Final uniqueness recheck before save
      const finalCandidate = getNextBatchCandidate(programVal, estateVal, divVal);
      if (!finalCandidate) {
        if (errorBox) {
          errorBox.textContent = 'Gagal menghasilkan candidate identity batch';
          errorBox.style.display = 'block';
        }
        return;
      }

      try {
        const payload = {
          batchId: finalCandidate.batchId,
          batchCode: finalCandidate.batchCode,
          name: finalCandidate.name,
          qrCode: finalCandidate.qrCode,
          programId: programVal,
          estateId: estateVal,
          divisionId: divVal,
          clone: 'IRCA 19',
          growthStage: 'Rubber Advance Planting Material',
          category: 'Polibag Besar',
          initialQty: 0,
          availableQty: 0,
          currentQty: 0,
          bedenganIds: [],
          status: BATCH_STATUS.CREATED
        };

        createBatch(payload, user);
        closeModal();
        toast('Master Batch berhasil ditambahkan.', 'success');
        renderView();
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message;
          errorBox.style.display = 'block';
        }
        toast(err.message, 'error');
      }
    });
  }

  function openEditBatchModal(id) {
    const item = getBatchById(id);
    if (!item) return;

    const currentDivisions = getNurseryDivisionsByEstate(item.estateId);
    const availableBeds = getActiveBedengan({
      estateId: item.estateId,
      divisionId: item.divisionId,
      programId: item.programId
    });

    const selectedBedSet = new Set(Array.isArray(item.bedenganIds) ? item.bedenganIds : []);

    const html = `
      <div style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0 0 14px 0;">Ubah Master Batch Bibitan</h2>
        
        <form id="form-edit-batch" style="display: flex; flex-direction: column; gap: 12px;">
          
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; font-size: 0.78rem; color: #64748B;">
            ID Batch (Immutable): <strong style="color: #0F172A; font-family: monospace;">${esc(item.id || item.batchId)}</strong>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Kode Batch *</label>
              <input id="modal-edit-batch-code" type="text" value="${esc(item.batchCode || item.batchNo)}" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none;">
            </div>
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Bibit *</label>
              <select id="modal-edit-batch-clone" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
                ${allKlons.map(k => `<option value="${k.name}" ${normalizeKlonName(k.name) === normalizeKlonName(item.clone || item.klon) ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Tahapan Pertumbuhan *</label>
              <select id="modal-edit-batch-stage" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
                ${BATCH_GROWTH_STAGES.map(s => `<option value="${s}" ${s === (item.growthStage || item.stage) ? 'selected' : ''}>${esc(s)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Kategori *</label>
              <select id="modal-edit-batch-category" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
                ${BATCH_CATEGORIES.map(c => `<option value="${c}" ${c === item.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Status Batch *</label>
            <select id="modal-edit-batch-status" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
              <option value="${BATCH_STATUS.AVAILABLE}" ${item.status === BATCH_STATUS.AVAILABLE ? 'selected' : ''}>Tersedia</option>
              <option value="${BATCH_STATUS.EMPTY}" ${item.status === BATCH_STATUS.EMPTY ? 'selected' : ''}>Habis</option>
              <option value="${BATCH_STATUS.INACTIVE}" ${item.status === BATCH_STATUS.INACTIVE ? 'selected' : ''}>Nonaktif</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Alokasi Bedengan (1 Batch -> N Bedengan)</label>
            <div id="container-edit-bedengan" style="max-height: 120px; overflow-y: auto; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px; background: #FFFFFF; display: flex; flex-direction: column; gap: 6px;">
              ${availableBeds.length > 0 ? availableBeds.map(b => `
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #334155; cursor: pointer;">
                  <input type="checkbox" class="cb-edit-bedengan" value="${b.bedenganId}" ${selectedBedSet.has(b.bedenganId) ? 'checked' : ''}>
                  <span><strong>${esc(b.bedenganCode)}</strong> - ${esc(b.name)}</span>
                </label>
              `).join('') : '<div style="color: #94A3B8; font-size: 0.78rem;">Tidak ada bedengan aktif pada scope ini</div>'}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button id="btn-cancel-edit-batch" type="button" style="padding: 8px 16px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #475569; cursor: pointer;">Batal</button>
            <button type="submit" style="padding: 8px 18px; background: #116834; border: none; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #FFFFFF; cursor: pointer;">Simpan Perubahan</button>
          </div>

        </form>
      </div>
    `;

    openModal(html);
    document.getElementById('btn-cancel-edit-batch')?.addEventListener('click', closeModal);

    document.getElementById('form-edit-batch')?.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const selectedBedIds = Array.from(document.querySelectorAll('.cb-edit-bedengan:checked')).map(cb => cb.value);

        const payload = {
          batchCode: document.getElementById('modal-edit-batch-code').value.trim(),
          clone: document.getElementById('modal-edit-batch-clone').value,
          growthStage: document.getElementById('modal-edit-batch-stage').value,
          category: document.getElementById('modal-edit-batch-category').value,
          status: document.getElementById('modal-edit-batch-status').value,
          bedenganIds: selectedBedIds
        };

        updateBatch(id, payload, user);
        closeModal();
        toast('Perubahan Master Batch berhasil disimpan.', 'success');
        renderView();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function openDetailBatchModal(id) {
    const item = getBatchById(id);
    if (!item) return;

    const prog = getProgramById(item.programId);
    const est = getEstateById(item.estateId);

    const bedList = (Array.isArray(item.bedenganIds) ? item.bedenganIds : []).map(bid => {
      const bObj = getBedenganById(bid);
      return bObj ? `${bObj.bedenganCode} (${bObj.name})` : bid;
    });

    const html = `
      <div style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h2 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0;">Detail Master Batch</h2>
          <span style="display: inline-block; padding: 3px 8px; background: #F1F5F9; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; color: #334155;">
            ${esc(item.status)}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; font-size: 0.82rem;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Kode & ID Batch</div>
            <div style="font-weight: 700; color: #0F172A; font-family: monospace; font-size: 0.95rem;">${esc(item.batchCode || item.batchNo)}</div>
            <div style="font-size: 0.7rem; color: #64748B;">${esc(item.id || item.batchId)}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Klon & Tahapan</div>
            <div style="font-weight: 700; color: #0F172A;">${esc(item.clone || item.klon)}</div>
            <div style="font-size: 0.72rem; color: #64748B;">${esc(item.growthStage || item.stage)}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Program Pembibitan</div>
            <div style="font-weight: 600; color: #0F172A;">${esc(prog ? prog.code + ' - ' + prog.name : item.programId || '-')}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Kebun & Divisi</div>
            <div style="font-weight: 600; color: #0F172A;">${esc(est ? est.estate_name : item.estateName || item.estateId)} / ${esc(item.divisionName || item.divisionId)}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Stok Tersedia / Awal</div>
            <div style="font-weight: 700; color: #15803D; font-size: 0.95rem;">${Number(item.availableQty || 0).toLocaleString('id-ID')} Bibit</div>
            <div style="font-size: 0.72rem; color: #64748B;">Awal: ${Number(item.initialQty || item.receivedQty || 0).toLocaleString('id-ID')} Bibit</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Kategori & Bedengan</div>
            <div style="font-weight: 600; color: #0F172A;">${esc(item.category || '-')}</div>
            <div style="font-size: 0.72rem; color: #64748B;">${bedList.length > 0 ? esc(bedList.join(', ')) : 'Belum dialokasikan'}</div>
          </div>
        </div>

        ${(item.sourceReceiptId || item.sourceDispatchId || item.sourceParentRequestId || item.sourceBatchCode) ? `
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 10px; font-size: 0.76rem; color: #166534; margin-bottom: 14px;">
            <div style="font-weight: 700; margin-bottom: 4px;">Traceability Transaksi Asal:</div>
            ${item.sourceReceiptDocNo ? `<div>Penerimaan: <strong>${esc(item.sourceReceiptDocNo)}</strong></div>` : ''}
            ${item.sourceDispatchDocNo ? `<div>Pengeluaran: <strong>${esc(item.sourceDispatchDocNo)}</strong></div>` : ''}
            ${item.sourceParentRequestDocNo ? `<div>Parent Request: <strong>${esc(item.sourceParentRequestDocNo)}</strong></div>` : ''}
            ${item.sourceBatchCode ? `<div>Batch Asal: <strong>${esc(item.sourceBatchCode)}</strong></div>` : ''}
          </div>
        ` : ''}

        <!-- AUDIT TRAIL -->
        <div style="background: #FAFAFA; border: 1px dashed #CBD5E1; border-radius: 6px; padding: 10px; font-size: 0.74rem; color: #64748B; margin-bottom: 14px;">
          <div>Dibuat oleh: <strong>${esc(item.createdBy || '-')}</strong> (${formatDate(item.createdAt)})</div>
          <div>Diperbarui oleh: <strong>${esc(item.updatedBy || '-')}</strong> (${formatDate(item.updatedAt)})</div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button id="btn-close-detail-batch" type="button" style="padding: 8px 18px; background: #0F172A; border: none; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #FFFFFF; cursor: pointer;">Tutup</button>
        </div>
      </div>
    `;

    openModal(html);
    document.getElementById('btn-close-detail-batch')?.addEventListener('click', closeModal);
  }

  renderView();
}
