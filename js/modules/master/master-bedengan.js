/**
 * js/modules/master/master-bedengan.js
 * Modul Pengelolaan Master Bedengan Role ASISTEN_BIBITAN (TASK ASB-03)
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { openQRViewerModal } from '../../components/qr-viewer-modal.js';
import { esc, formatDate } from '../../core/utils.js';
import {
  BEDENGAN_STATUS,
  getAllBedengan,
  getActiveBedengan,
  getBedenganById,
  getNextBedenganCandidate,
  createBedengan,
  updateBedengan,
  activateBedengan,
  deactivateBedengan
} from '../../data/bedengan-master.js';
import { getActivePrograms, getProgramById } from '../../data/program-master.js';
import { getActiveEstates, getEstateById, getNurseryDivisionsByEstate } from '../../data/estate-master.js';

let state = {
  search: '',
  programId: 'ALL',
  estateId: 'ALL',
  divisionId: 'ALL',
  status: 'ALL'
};

export function renderMasterBedengan() {
  const app = document.getElementById('app');
  const user = getCurrentUserContext();
  const normalizedRole = normalizeRole(user?.role);
  const isAsb = normalizedRole === ROLES.ASISTEN_BIBITAN;

  // Auto-scope for ASISTEN_BIBITAN if applicable
  if (isAsb) {
    state.estateId = user?.estateId || 'ALL';
    state.divisionId = user?.divisionId || 'ALL';
  }

  const allPrograms = getActivePrograms();
  const allEstates = getActiveEstates();

  function getFilteredList() {
    if (isAsb) {
      const filters = {
        estateId: user.estateId,
        divisionId: user.divisionId
      };
      if (state.programId !== 'ALL') filters.programId = state.programId;
      return getAllBedengan(filters);
    }
    const filters = {};
    if (state.search) filters.search = state.search;
    if (state.programId !== 'ALL') filters.programId = state.programId;
    if (state.estateId !== 'ALL') filters.estateId = state.estateId;
    if (state.divisionId !== 'ALL') filters.divisionId = state.divisionId;
    if (state.status !== 'ALL') filters.status = state.status;

    return getAllBedengan(filters);
  }

  function getStats() {
    const all = getAllBedengan({
      estateId: isAsb ? user.estateId : (state.estateId !== 'ALL' ? state.estateId : undefined),
      divisionId: isAsb ? user.divisionId : (state.divisionId !== 'ALL' ? state.divisionId : undefined)
    });
    return {
      total: all.length,
      available: all.filter(b => b.status === BEDENGAN_STATUS.AVAILABLE).length,
      active: all.filter(b => b.status !== BEDENGAN_STATUS.INACTIVE).length,
      occupied: all.filter(b => b.status === BEDENGAN_STATUS.OCCUPIED).length,
      maintenance: all.filter(b => b.status === BEDENGAN_STATUS.MAINTENANCE).length,
      inactive: all.filter(b => b.status === BEDENGAN_STATUS.INACTIVE).length
    };
  }

  function renderView() {
    const items = getFilteredList();
    const stats = getStats();
    const currentDivisions = state.estateId !== 'ALL' ? getNurseryDivisionsByEstate(state.estateId) : [];

    if (isAsb) {
      app.innerHTML = `
        <div class="page master-bedengan-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          
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
                  <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0;">Master Bedengan</h1>
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

            <!-- LIST OF BEDENGAN -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              ${items.length === 0 ? `
                <div style="text-align: center; padding: 24px 16px; color: #64748B; font-size: 0.84rem;">
                  Belum ada data bedengan.
                </div>
              ` : `
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                    <thead>
                      <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #475569; font-weight: 700; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.03em;">
                        <th style="padding: 9px 12px;">Kode Bedengan</th>
                        <th style="padding: 9px 12px;">Nama Bedengan</th>
                        <th style="padding: 9px 12px;">Program</th>
                        <th style="padding: 9px 12px;">Status</th>
                        <th style="padding: 9px 12px; text-align: center;">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map((b, idx) => {
                        const prog = getProgramById(b.programId);
                        const isInactive = b.status === BEDENGAN_STATUS.INACTIVE;
                        const statusBadge = isInactive
                          ? { bg: '#E2E8F0', color: '#475569', label: 'Nonaktif' }
                          : { bg: '#DCFCE7', color: '#166534', label: 'Aktif' };

                        return `
                          <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.1s ease; ${idx % 2 === 1 ? 'background: #FAFAFA;' : ''}">
                            <td style="padding: 10px 12px; font-weight: 700; color: #0F172A; font-family: monospace;">
                              ${esc(b.bedenganCode)}
                            </td>
                            <td style="padding: 10px 12px; font-weight: 600; color: #1E293B;">
                              ${esc(b.name)}
                            </td>
                            <td style="padding: 10px 12px;">
                              <div style="font-weight: 600; color: #1E293B;">${esc(prog ? prog.name : b.programId)}</div>
                            </td>
                            <td style="padding: 10px 12px;">
                              <span style="display: inline-block; padding: 2px 7px; background: ${statusBadge.bg}; color: ${statusBadge.color}; border-radius: 9999px; font-size: 0.70rem; font-weight: 700;">${statusBadge.label}</span>
                            </td>
                            <td style="padding: 10px 12px; text-align: center; white-space: nowrap;">
                              <button type="button" class="btn-view-qr" data-id="${b.bedenganId}" title="Lihat QR Bedengan" style="padding: 4px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; color: #166534; font-size: 0.74rem; font-weight: 700; cursor: pointer;">Lihat QR</button>
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
            <button id="btn-tambah-bedengan-bottom" type="button" style="width: 100%; background: #116834; color: #FFFFFF; border: none; padding: 12px 16px; border-radius: 8px; font-size: 0.90rem; font-weight: 700; cursor: pointer; text-align: center; box-shadow: 0 2px 4px rgba(17,104,52,0.2); transition: background 0.15s ease;">
              Tambah Bedengan
            </button>
          </div>

        </div>
      `;
    } else {
      document.getElementById('external-action-area')?.remove();
      // Role lain / Non-ASB: Existing Full UI
      app.innerHTML = `
        <div class="page master-bedengan-page" style="display: flex; flex-direction: column; min-height: 100%; background: #F8FAFC; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          
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
                  <h1 style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin: 0;">Master Bedengan</h1>
                  <p style="font-size: 0.76rem; color: #64748B; margin: 0;">Data referensi operasional tata letak & kapasitas bedengan pembibitan</p>
                </div>
              </div>

              <button id="btn-tambah-bedengan" type="button" style="background: #116834; color: #FFFFFF; border: none; padding: 8px 14px; border-radius: 6px; font-size: 0.84rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.15s ease;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Tambah Bedengan</span>
              </button>
            </div>
          </header>

          <!-- MAIN CONTAINER -->
          <main style="max-width: 1100px; width: 100%; margin: 0 auto; padding: 16px; box-sizing: border-box; flex: 1;">
            
            <!-- SUMMARY CARDS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px;">
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Total Bedengan</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${stats.total}</div>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #15803D; text-transform: uppercase;">Tersedia</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #166534; margin-top: 2px;">${stats.available}</div>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #1D4ED8; text-transform: uppercase;">Digunakan</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #1E40AF; margin-top: 2px;">${stats.occupied}</div>
              </div>
              <div style="background: #FFFFFF; border: 1px solid #FEF08A; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 0.72rem; font-weight: 600; color: #A16207; text-transform: uppercase;">Pemeliharaan</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #854D0E; margin-top: 2px;">${stats.maintenance}</div>
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
                <input id="input-search" type="text" placeholder="Cari kode, nama, QR bedengan..." value="${esc(state.search)}" style="width: 100%; box-sizing: border-box; padding: 8px 10px 8px 30px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none;">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="#94A3B8" stroke-width="2.2" fill="none" style="position: absolute; left: 9px; top: 10px;">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              <!-- Filter Program -->
              <select id="select-filter-program" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 140px;">
                <option value="ALL">Semua Program</option>
                ${allPrograms.map(p => `<option value="${p.id}" ${state.programId === p.id ? 'selected' : ''}>${esc(p.code)} - ${esc(p.name)}</option>`).join('')}
              </select>

              <!-- Filter Estate -->
              <select id="select-filter-estate" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 120px;">
                <option value="ALL">Semua Kebun</option>
                ${allEstates.map(e => `<option value="${e.estate_id}" ${state.estateId === e.estate_id ? 'selected' : ''}>${esc(e.estate_name)}</option>`).join('')}
              </select>

              <!-- Filter Divisi -->
              <select id="select-filter-division" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 110px;">
                <option value="ALL">Semua Divisi</option>
                ${currentDivisions.map(d => `<option value="${d.divisionId}" ${state.divisionId === d.divisionId ? 'selected' : ''}>${esc(d.divisionName)}</option>`).join('')}
              </select>

              <!-- Filter Status -->
              <select id="select-filter-status" style="padding: 7px 10px; font-size: 0.82rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #334155; outline: none; min-width: 110px;">
                <option value="ALL" ${state.status === 'ALL' ? 'selected' : ''}>Semua Status</option>
                <option value="${BEDENGAN_STATUS.AVAILABLE}" ${state.status === BEDENGAN_STATUS.AVAILABLE ? 'selected' : ''}>Tersedia</option>
                <option value="${BEDENGAN_STATUS.OCCUPIED}" ${state.status === BEDENGAN_STATUS.OCCUPIED ? 'selected' : ''}>Digunakan</option>
                <option value="${BEDENGAN_STATUS.MAINTENANCE}" ${state.status === BEDENGAN_STATUS.MAINTENANCE ? 'selected' : ''}>Pemeliharaan</option>
                <option value="${BEDENGAN_STATUS.INACTIVE}" ${state.status === BEDENGAN_STATUS.INACTIVE ? 'selected' : ''}>Nonaktif</option>
              </select>

              ${(state.search || state.programId !== 'ALL' || state.estateId !== 'ALL' || state.status !== 'ALL') ? `
                <button id="btn-reset-filter" type="button" style="padding: 7px 10px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.8rem; color: #475569; cursor: pointer;">Reset</button>
              ` : ''}
            </div>

            <!-- LIST OF BEDENGAN -->
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              ${items.length === 0 ? `
                <div style="text-align: center; padding: 40px 16px; color: #94A3B8;">
                  <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none" style="margin-bottom: 8px;">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                  </svg>
                  <div style="font-size: 0.95rem; font-weight: 600; color: #475569;">Tidak ada bedengan yang cocok</div>
                  <div style="font-size: 0.8rem; margin-top: 4px;">Coba ubah kata kunci pencarian atau filter status.</div>
                </div>
              ` : `
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
                    <thead>
                      <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #475569; font-weight: 700; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.03em;">
                        <th style="padding: 10px 14px;">Kode & Nama</th>
                        <th style="padding: 10px 14px;">Program Pembibitan</th>
                        <th style="padding: 10px 14px;">Kebun & Divisi</th>
                        <th style="padding: 10px 14px; text-align: right;">Kapasitas</th>
                        <th style="padding: 10px 14px;">QR Code</th>
                        <th style="padding: 10px 14px;">Status</th>
                        <th style="padding: 10px 14px; text-align: center;">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items.map((b, idx) => {
                        const prog = getProgramById(b.programId);
                        const est = getEstateById(b.estateId);
                        
                        let statusBadge = { bg: '#E2E8F0', color: '#475569', label: 'Nonaktif' };
                        if (b.status === BEDENGAN_STATUS.AVAILABLE) statusBadge = { bg: '#DCFCE7', color: '#166534', label: 'Tersedia' };
                        if (b.status === BEDENGAN_STATUS.OCCUPIED) statusBadge = { bg: '#DBEAFE', color: '#1E40AF', label: 'Digunakan' };
                        if (b.status === BEDENGAN_STATUS.MAINTENANCE) statusBadge = { bg: '#FEF9C3', color: '#854D0E', label: 'Pemeliharaan' };

                        return `
                          <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.1s ease; ${idx % 2 === 1 ? 'background: #FAFAFA;' : ''}">
                            <td style="padding: 12px 14px;">
                              <div style="font-weight: 700; color: #0F172A;">${esc(b.name)}</div>
                              <div style="font-size: 0.74rem; color: #64748B; font-family: monospace;">${esc(b.bedenganCode)}</div>
                            </td>
                            <td style="padding: 12px 14px;">
                              <div style="font-weight: 600; color: #1E293B;">${esc(prog ? prog.code : b.programId)}</div>
                              <div style="font-size: 0.72rem; color: #64748B;">${esc(prog ? prog.name : '-')}</div>
                            </td>
                            <td style="padding: 12px 14px;">
                              <div style="font-weight: 600; color: #1E293B;">${esc(est ? est.estate_name : b.estateId)}</div>
                              <div style="font-size: 0.72rem; color: #64748B;">${esc(b.divisionId)}</div>
                            </td>
                            <td style="padding: 12px 14px; text-align: right; font-weight: 600; color: #0F172A;">
                              ${Number(b.capacity).toLocaleString('id-ID')} <span style="font-size: 0.72rem; color: #64748B; font-weight: 400;">Bibit</span>
                            </td>
                            <td style="padding: 12px 14px;">
                              <span style="display: inline-block; padding: 2px 6px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; font-family: monospace; font-size: 0.74rem; color: #334155;">
                                ${esc(b.qrCode || '-')}
                              </span>
                            </td>
                            <td style="padding: 12px 14px;">
                              <span style="display: inline-block; padding: 3px 8px; background: ${statusBadge.bg}; color: ${statusBadge.color}; border-radius: 9999px; font-size: 0.72rem; font-weight: 700;">
                                ${statusBadge.label}
                              </span>
                            </td>
                            <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
                              <button type="button" class="btn-detail-bedengan" data-id="${b.bedenganId}" title="Lihat Detail" style="padding: 5px 8px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; color: #475569; font-size: 0.76rem; font-weight: 600; cursor: pointer; margin-right: 4px;">
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
    // Back to home
    app.querySelector('#btn-back-home')?.addEventListener('click', () => {
      navigate('/home');
    });

    // Filters
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

    app.querySelector('#select-filter-status')?.addEventListener('change', (e) => {
      state.status = e.target.value;
      renderView();
    });

    app.querySelector('#btn-reset-filter')?.addEventListener('click', () => {
      state.search = '';
      state.programId = 'ALL';
      state.estateId = isAsb && user.estateId ? user.estateId : 'ALL';
      state.divisionId = isAsb && user.divisionId ? user.divisionId : 'ALL';
      state.status = 'ALL';
      renderView();
    });

    // Tambah Bedengan Buttons (Header or Bottom)
    app.querySelector('#btn-tambah-bedengan')?.addEventListener('click', () => {
      openCreateBedenganModal();
    });
    app.querySelector('#btn-tambah-bedengan-bottom')?.addEventListener('click', () => {
      openCreateBedenganModal();
    });

    // View QR Modal
    app.querySelectorAll('.btn-view-qr').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = getBedenganById(id);
        if (!item) return;
        const prog = getProgramById(item.programId);
        openQRViewerModal({
          type: 'BEDENGAN',
          typeTitle: 'Bedengan',
          code: item.bedenganCode,
          name: item.name,
          programName: prog ? prog.name : item.programId,
          programCode: prog ? prog.code : item.programId,
          startDate: formatDate(item.createdAt),
          verificationText: 'Terverifikasi Sistem SIGMA',
          payload: {
            type: 'BEDENGAN',
            bedenganId: item.bedenganId,
            bedenganCode: item.bedenganCode,
            programId: item.programId,
            estateId: item.estateId,
            divisionId: item.divisionId
          }
        });
      });
    });

    // Detail Bedengan Modal
    app.querySelectorAll('.btn-detail-bedengan').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openDetailBedenganModal(id);
      });
    });

    // Edit Bedengan Modal
    app.querySelectorAll('.btn-edit-bedengan').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openEditBedenganModal(id);
      });
    });

    // Toggle Status / Deactivate / Activate
    app.querySelectorAll('.btn-toggle-status').forEach(btn => {
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
        activateBedengan(id, user);
        toast('Bedengan berhasil diaktifkan kembali.', 'success');
      } else {
        deactivateBedengan(id, user);
        toast('Bedengan berhasil dinonaktifkan (arsip aman).', 'info');
      }
      renderView();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function openCreateBedenganModal() {
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
        <h2 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0 0 14px 0;">Tambah Master Bedengan</h2>
        
        <div id="modal-create-error" style="display: none; background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 8px 12px; border-radius: 6px; font-size: 0.80rem; margin-bottom: 12px; font-weight: 500;"></div>

        <form id="form-create-bedengan" style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- SCOPE INFO USER AKTIF (NON-EDITABLE) -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; font-size: 0.78rem; color: #475569;">
            Kebun: <strong>${esc(estateLabel)}</strong> &bull; Divisi: <strong>${esc(divisionLabel)}</strong>
          </div>
          <input type="hidden" id="modal-create-estate" value="${esc(defaultEstate)}">
          <input type="hidden" id="modal-create-division" value="${esc(defaultDivision)}">

          <!-- FIELD PERTAMA: PROGRAM PEMBIBITAN -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Program Pembibitan *</label>
            <select id="modal-create-program" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
              <option value="" disabled selected>Pilih Program Pembibitan</option>
              ${activePrograms.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
            </select>
          </div>

          <!-- Preview Identity Bedengan -->
          <div id="preview-identity-container" style="margin-top: 4px; padding: 12px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 6px; transition: all 0.2s ease;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; display: flex; align-items: center; justify-content: space-between;">
              <span>Preview Identity Bedengan (Auto-Generated)</span>
              <span id="preview-badge-status" style="font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; background: #E2E8F0; color: #64748B;">Menunggu Program</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Program</div>
                <div id="preview-program-name" style="font-size: 0.82rem; font-weight: 600; color: #1E293B;">—</div>
              </div>
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Kebun & Divisi</div>
                <div id="preview-scope" style="font-size: 0.82rem; font-weight: 600; color: #1E293B;">${esc(estateLabel)} &bull; ${esc(divisionLabel)}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Kode Bedengan</div>
                <div id="preview-bedengan-code" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; font-family: monospace;">—</div>
                <input type="hidden" id="modal-create-code" value="">
              </div>
              <div>
                <div style="font-size: 0.68rem; color: #64748B;">Nama Bedengan</div>
                <div id="preview-bedengan-name" style="font-size: 0.88rem; font-weight: 700; color: #0F172A;">—</div>
                <input type="hidden" id="modal-create-name" value="">
              </div>
            </div>
            
            <div>
              <div style="font-size: 0.68rem; color: #64748B;">QR Code</div>
              <div id="preview-bedengan-qr" style="font-size: 0.82rem; font-weight: 700; color: #0F172A; font-family: monospace;">—</div>
              <input type="hidden" id="modal-create-qr" value="">
            </div>
          </div>

          <input type="hidden" id="modal-create-capacity" value="1000">

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button id="btn-cancel-create" type="button" style="padding: 8px 16px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #475569; cursor: pointer;">Batal</button>
            <button id="btn-submit-create" type="submit" style="padding: 8px 18px; background: #116834; border: none; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #FFFFFF; cursor: pointer;">Simpan Bedengan</button>
          </div>

        </form>
      </div>
    `;

    openModal(html);

    const form = document.getElementById('form-create-bedengan');
    const programSel = document.getElementById('modal-create-program');
    const estateSel = document.getElementById('modal-create-estate');
    const divSel = document.getElementById('modal-create-division');
    const codeInput = document.getElementById('modal-create-code');
    const nameInput = document.getElementById('modal-create-name');
    const qrInput = document.getElementById('modal-create-qr');
    const errorBox = document.getElementById('modal-create-error');

    const previewContainer = document.getElementById('preview-identity-container');
    const previewBadge = document.getElementById('preview-badge-status');
    const previewProgram = document.getElementById('preview-program-name');
    const previewCode = document.getElementById('preview-bedengan-code');
    const previewName = document.getElementById('preview-bedengan-name');
    const previewQR = document.getElementById('preview-bedengan-qr');

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
        if (qrInput) qrInput.value = '';
        return;
      }

      const progObj = getProgramById(progId);
      const candidate = getNextBedenganCandidate(progId, defaultEstate, defaultDivision);

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
        if (previewCode) previewCode.textContent = candidate.bedenganCode;
        if (previewName) previewName.textContent = candidate.name;
        if (previewQR) previewQR.textContent = candidate.qrCode;

        if (codeInput) codeInput.value = candidate.bedenganCode;
        if (nameInput) nameInput.value = candidate.name;
        if (qrInput) qrInput.value = candidate.qrCode;
      }
    };

    programSel?.addEventListener('change', (e) => {
      updatePreviewOnProgramChange(e.target.value);
    });

    document.getElementById('btn-cancel-create')?.addEventListener('click', closeModal);

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
      }

      const programVal = programSel?.value;
      const estateVal = estateSel?.value;
      const divVal = divSel?.value;

      if (!programVal) {
        if (errorBox) {
          errorBox.textContent = 'Program Pembibitan wajib dipilih terlebih dahulu';
          errorBox.style.display = 'block';
        }
        return;
      }

      // Final uniqueness re-check before save
      const finalCandidate = getNextBedenganCandidate(programVal, estateVal, divVal);
      if (!finalCandidate) {
        if (errorBox) {
          errorBox.textContent = 'Gagal menghasilkan candidate identity bedengan';
          errorBox.style.display = 'block';
        }
        return;
      }

      try {
        const payload = {
          bedenganId: finalCandidate.bedenganId,
          programId: programVal,
          estateId: estateVal,
          divisionId: divVal,
          bedenganCode: finalCandidate.bedenganCode,
          name: finalCandidate.name,
          capacity: 1000,
          qrCode: finalCandidate.qrCode,
          status: BEDENGAN_STATUS.AVAILABLE
        };

        createBedengan(payload, user);
        closeModal();
        toast('Master Bedengan berhasil ditambahkan.', 'success');
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

  function openEditBedenganModal(id) {
    const item = getBedenganById(id);
    if (!item) return;

    const currentDivisions = getNurseryDivisionsByEstate(item.estateId);

    const html = `
      <div style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0 0 14px 0;">Ubah Master Bedengan</h2>
        
        <form id="form-edit-bedengan" style="display: flex; flex-direction: column; gap: 12px;">
          
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; font-size: 0.78rem; color: #64748B;">
            ID Bedengan (Immutable): <strong style="color: #0F172A; font-family: monospace;">${esc(item.bedenganId)}</strong>
          </div>

          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Program Pembibitan *</label>
            <select id="modal-edit-program" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
              ${allPrograms.map(p => `<option value="${p.id}" ${p.id === item.programId ? 'selected' : ''}>${esc(p.code)} - ${esc(p.name)}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Kebun (Estate) *</label>
              <select id="modal-edit-estate" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
                ${allEstates.map(e => `<option value="${e.estate_id}" ${e.estate_id === item.estateId ? 'selected' : ''}>${esc(e.estate_name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Divisi *</label>
              <select id="modal-edit-division" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
                ${currentDivisions.map(d => `<option value="${d.divisionId}" ${d.divisionId === item.divisionId ? 'selected' : ''}>${esc(d.divisionName)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Kode Bedengan *</label>
              <input id="modal-edit-code" type="text" value="${esc(item.bedenganCode)}" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none;">
            </div>
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Nama Bedengan *</label>
              <input id="modal-edit-name" type="text" value="${esc(item.name)}" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Kapasitas (Bibit) *</label>
              <input id="modal-edit-capacity" type="number" min="1" value="${item.capacity}" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none;">
            </div>
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Status Bedengan *</label>
              <select id="modal-edit-status" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; outline: none;">
                <option value="${BEDENGAN_STATUS.AVAILABLE}" ${item.status === BEDENGAN_STATUS.AVAILABLE ? 'selected' : ''}>Tersedia</option>
                <option value="${BEDENGAN_STATUS.OCCUPIED}" ${item.status === BEDENGAN_STATUS.OCCUPIED ? 'selected' : ''}>Digunakan</option>
                <option value="${BEDENGAN_STATUS.MAINTENANCE}" ${item.status === BEDENGAN_STATUS.MAINTENANCE ? 'selected' : ''}>Pemeliharaan</option>
                <option value="${BEDENGAN_STATUS.INACTIVE}" ${item.status === BEDENGAN_STATUS.INACTIVE ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 4px;">QR Code *</label>
            <input id="modal-edit-qr" type="text" value="${esc(item.qrCode)}" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 0.84rem; border: 1px solid #CBD5E1; border-radius: 6px; outline: none;">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button id="btn-cancel-edit" type="button" style="padding: 8px 16px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #475569; cursor: pointer;">Batal</button>
            <button type="submit" style="padding: 8px 18px; background: #116834; border: none; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #FFFFFF; cursor: pointer;">Simpan Perubahan</button>
          </div>

        </form>
      </div>
    `;

    openModal(html);

    const form = document.getElementById('form-edit-bedengan');
    const estateSel = document.getElementById('modal-edit-estate');
    const divSel = document.getElementById('modal-edit-division');

    estateSel?.addEventListener('change', () => {
      const divs = getNurseryDivisionsByEstate(estateSel.value);
      divSel.innerHTML = divs.map(d => `<option value="${d.divisionId}">${esc(d.divisionName)}</option>`).join('');
    });

    document.getElementById('btn-cancel-edit')?.addEventListener('click', closeModal);

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const payload = {
          programId: document.getElementById('modal-edit-program').value,
          estateId: estateSel.value,
          divisionId: divSel.value,
          bedenganCode: document.getElementById('modal-edit-code').value.trim(),
          name: document.getElementById('modal-edit-name').value.trim(),
          capacity: Number(document.getElementById('modal-edit-capacity').value),
          qrCode: document.getElementById('modal-edit-qr').value.trim(),
          status: document.getElementById('modal-edit-status').value
        };

        updateBedengan(id, payload, user);
        closeModal();
        toast('Perubahan Master Bedengan berhasil disimpan.', 'success');
        renderView();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function openDetailBedenganModal(id) {
    const item = getBedenganById(id);
    if (!item) return;

    const prog = getProgramById(item.programId);
    const est = getEstateById(item.estateId);

    const html = `
      <div style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h2 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0;">Detail Master Bedengan</h2>
          <span style="display: inline-block; padding: 3px 8px; background: #F1F5F9; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; color: #334155;">
            ${esc(item.status)}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; font-size: 0.82rem;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Nama Bedengan</div>
            <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">${esc(item.name)}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Kode Bedengan</div>
            <div style="font-weight: 700; color: #0F172A; font-family: monospace;">${esc(item.bedenganCode)}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Program Pembibitan</div>
            <div style="font-weight: 600; color: #0F172A;">${esc(prog ? prog.code + ' - ' + prog.name : item.programId)}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Kebun & Divisi</div>
            <div style="font-weight: 600; color: #0F172A;">${esc(est ? est.estate_name : item.estateId)} / ${esc(item.divisionId)}</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">Kapasitas Maksimal</div>
            <div style="font-weight: 700; color: #15803D;">${Number(item.capacity).toLocaleString('id-ID')} Bibit</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
            <div style="font-size: 0.7rem; color: #64748B;">QR Code Payload</div>
            <div style="font-weight: 700; color: #0F172A; font-family: monospace;">${esc(item.qrCode || '-')}</div>
          </div>
        </div>

        <!-- AUDIT TRAIL -->
        <div style="background: #FAFAFA; border: 1px dashed #CBD5E1; border-radius: 6px; padding: 10px; font-size: 0.74rem; color: #64748B; margin-bottom: 14px;">
          <div>Dibuat oleh: <strong>${esc(item.createdBy || '-')}</strong> (${formatDate(item.createdAt)})</div>
          <div>Diperbarui oleh: <strong>${esc(item.updatedBy || '-')}</strong> (${formatDate(item.updatedAt)})</div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button id="btn-close-detail" type="button" style="padding: 8px 18px; background: #0F172A; border: none; border-radius: 6px; font-size: 0.84rem; font-weight: 600; color: #FFFFFF; cursor: pointer;">Tutup</button>
        </div>
      </div>
    `;

    openModal(html);
    document.getElementById('btn-close-detail')?.addEventListener('click', closeModal);
  }

  renderView();
}
