/**
 * js/modules/consolidation/consolidation-landing.js
 * Landing Page & Workspace Module: Konsolidasi Data Pembibitan (Role Asisten Bibitan)
 * 
 * Prinsip:
 * - Dikelola oleh Role ASISTEN_BIBITAN
 * - PURE AGGREGATION & DERIVED VIEW: Menampilkan konsolidasi data transaksi eksisting
 * - ZERO STOCK MUTATION: Tidak mengubah availableQty, currentQty, atau master batches
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, esc } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { openModal, closeModal } from '../../components/modal.js';
import {
  CONSOLIDATION_STATUS,
  getConsolidatedData,
  buildTraceabilityChain
} from './consolidation-manager.js';

let activeSection = 'OVERVIEW'; // 'OVERVIEW' | 'REQUESTS' | 'DISPATCHES' | 'RECEIPTS' | 'SELECTIONS' | 'DESTRUCTIONS' | 'CONSISTENCY'

export function renderConsolidationLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawUser = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Asisten Pembibitan', role: 'ASISTEN_BIBITAN' };
  const currentUser = getCurrentUserContext() || resolveUserContext(rawUser);

  const data = getConsolidatedData(currentUser);
  const summary = data.summary;
  const consistency = data.consistency;

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
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Konsolidasi Data Pembibitan</h1>
        </div>
      </header>

      <!-- NAVIGATION TABS -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 14px; overflow-x: auto; white-space: nowrap;">
        <button class="nav-tab ${activeSection === 'OVERVIEW' ? 'active' : ''}" data-tab="OVERVIEW" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeSection === 'OVERVIEW' ? '700' : '600'}; color: ${activeSection === 'OVERVIEW' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeSection === 'OVERVIEW' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer;">
          Ringkasan
        </button>
        <button class="nav-tab ${activeSection === 'REQUESTS' ? 'active' : ''}" data-tab="REQUESTS" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeSection === 'REQUESTS' ? '700' : '600'}; color: ${activeSection === 'REQUESTS' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeSection === 'REQUESTS' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer;">
          Permintaan (${summary.totalRequests})
        </button>
        <button class="nav-tab ${activeSection === 'DISPATCHES' ? 'active' : ''}" data-tab="DISPATCHES" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeSection === 'DISPATCHES' ? '700' : '600'}; color: ${activeSection === 'DISPATCHES' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeSection === 'DISPATCHES' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer;">
          Pengeluaran (${summary.totalDispatches})
        </button>
        <button class="nav-tab ${activeSection === 'RECEIPTS' ? 'active' : ''}" data-tab="RECEIPTS" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeSection === 'RECEIPTS' ? '700' : '600'}; color: ${activeSection === 'RECEIPTS' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeSection === 'RECEIPTS' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer;">
          Penerimaan (${summary.totalReceipts})
        </button>
        <button class="nav-tab ${activeSection === 'SELECTIONS' ? 'active' : ''}" data-tab="SELECTIONS" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeSection === 'SELECTIONS' ? '700' : '600'}; color: ${activeSection === 'SELECTIONS' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeSection === 'SELECTIONS' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer;">
          Seleksi (${summary.totalSelections})
        </button>
        <button class="nav-tab ${activeSection === 'DESTRUCTIONS' ? 'active' : ''}" data-tab="DESTRUCTIONS" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeSection === 'DESTRUCTIONS' ? '700' : '600'}; color: ${activeSection === 'DESTRUCTIONS' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeSection === 'DESTRUCTIONS' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer;">
          Pemusnahan (${summary.totalDestructions})
        </button>
        <button class="nav-tab ${activeSection === 'CONSISTENCY' ? 'active' : ''}" data-tab="CONSISTENCY" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeSection === 'CONSISTENCY' ? '700' : '600'}; color: ${activeSection === 'CONSISTENCY' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeSection === 'CONSISTENCY' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer;">
          Konsistensi ${summary.inconsistenciesCount > 0 ? `<span style="background: #DC2626; color: #FFF; font-size: 0.65rem; padding: 1px 6px; border-radius: 999px;">${summary.inconsistenciesCount}</span>` : ''}
        </button>
      </div>

      <!-- MAIN CONTENT AREA -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        ${renderSectionContent(activeSection, data)}
      </main>
    </div>
  `;

  // Attach event listeners
  app.querySelector('#btn-back')?.addEventListener('click', () => navigate('/home'));

  app.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeSection = e.currentTarget.dataset.tab;
      renderConsolidationLanding();
    });
  });

  // Action: Open Traceability modal
  app.querySelectorAll('.btn-view-chain').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const id = btn.dataset.id;
      showTraceabilityModal(type, id);
    });
  });
}

function renderSectionContent(section, data) {
  switch (section) {
    case 'OVERVIEW':
      return renderOverviewSection(data);
    case 'REQUESTS':
      return renderRequestsSection(data.requests);
    case 'DISPATCHES':
      return renderDispatchesSection(data.dispatches);
    case 'RECEIPTS':
      return renderReceiptsSection(data.receipts);
    case 'SELECTIONS':
      return renderSelectionsSection(data.selections);
    case 'DESTRUCTIONS':
      return renderDestructionsSection(data.destructions);
    case 'CONSISTENCY':
      return renderConsistencySection(data.consistency);
    default:
      return renderOverviewSection(data);
  }
}

function renderOverviewSection(data) {
  const s = data.summary;
  const status = data.status;
  let statusBadge = `<span style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0;">LENGKAP & KONSISTEN</span>`;
  if (status === CONSOLIDATION_STATUS.PERLU_PERHATIAN) {
    statusBadge = `<span style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA;">PERLU PERHATIAN (${s.inconsistenciesCount})</span>`;
  } else if (status === CONSOLIDATION_STATUS.TIDAK_LENGKAP) {
    statusBadge = `<span style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A;">RANTAI BERJALAN (${s.inconsistenciesCount})</span>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      
      <!-- HERO STATUS BANNER -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div>
          <div style="font-size: 0.75rem; color: #64748B; font-weight: 600;">Status Konsolidasi Transaksi</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-top: 2px;">
            Integritas Operasional Bibitan
          </div>
        </div>
        <div>
          ${statusBadge}
        </div>
      </div>

      <!-- 6 METRICS GRID -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Permintaan</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${s.totalRequests}</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Pengeluaran</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${s.totalDispatches}</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Penerimaan</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${s.totalReceipts}</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Seleksi</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${s.totalSelections}</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Pemusnahan</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${s.totalDestructions}</div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
          <div style="font-size: 0.68rem; font-weight: 700; color: ${s.inconsistenciesCount > 0 ? '#DC2626' : '#64748B'}; text-transform: uppercase;">Anomali / Perhatian</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: ${s.inconsistenciesCount > 0 ? '#DC2626' : '#0F172A'}; margin-top: 4px;">${s.inconsistenciesCount}</div>
        </div>
      </div>

      <!-- RECENT ANOMALIES IF ANY -->
      ${data.consistency.errors.length > 0 ? `
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 14px;">
          <div style="font-size: 0.85rem; font-weight: 700; color: #991B1B; margin-bottom: 8px;">Peringatan Integritas Transaksi (${data.consistency.errors.length})</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${data.consistency.errors.map(err => `
              <div style="font-size: 0.75rem; color: #B91C1C; background: #FFFFFF; border: 1px solid #FEE2E2; padding: 8px 10px; border-radius: 6px;">
                <strong>[${esc(err.docNo || err.type)}]</strong> ${esc(err.message)}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

function renderRequestsSection(requests) {
  if (!requests || requests.length === 0) {
    return `<div style="text-align: center; padding: 32px; color: #64748B; background: #FFF; border-radius: 8px;">Tidak ada data permohonan bibit.</div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${requests.map(req => {
        const approved = parseInt(req.approvedQty || req.requestedQty || 0, 10);
        const issued = parseInt(req.totalIssuedQty || req.actualIssuedQty || 0, 10);
        const remaining = approved - issued;

        return `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A;">${esc(req.docNo)}</div>
              <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #E8F3EC; color: #116834;">${esc(req.status || 'DIAJUKAN')}</span>
            </div>
            <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 8px;">
              ${esc(req.approvedClone || req.requestedClone || '-')} • ${esc(req.programName || req.programId || '-')}
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; padding: 6px 8px; border-radius: 6px; font-size: 0.72rem; text-align: center; margin-bottom: 8px;">
              <div>Approved: <strong>${approved.toLocaleString('id-ID')}</strong></div>
              <div>Issued: <strong>${issued.toLocaleString('id-ID')}</strong></div>
              <div>Remaining: <strong style="color: ${remaining > 0 ? '#D97706' : '#15803D'};">${remaining.toLocaleString('id-ID')}</strong></div>
            </div>
            <button type="button" class="btn-view-chain" data-type="REQUEST" data-id="${esc(req.id || req.docNo)}" style="width: 100%; height: 28px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.72rem; font-weight: 600; cursor: pointer;">
              Lihat Rantai Transaksi (Chain)
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderDispatchesSection(dispatches) {
  if (!dispatches || dispatches.length === 0) {
    return `<div style="text-align: center; padding: 32px; color: #64748B; background: #FFF; border-radius: 8px;">Tidak ada data pengeluaran bibit.</div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${dispatches.map(d => {
        const qty = parseInt(d.issuedQty || d.quantity || 0, 10);
        return `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A;">${esc(d.docNo || d.dispatchNo)}</div>
              <span style="font-size: 0.78rem; font-weight: 800; color: #116834;">${qty.toLocaleString('id-ID')} Pkk</span>
            </div>
            <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 6px;">
              Parent SPB: <strong>${esc(d.parentRequestDocNo || d.parentRequestId || '-')}</strong>
            </div>
            <div style="font-size: 0.70rem; color: #475569; margin-bottom: 8px;">
              Tanggal: ${esc(d.issuedDate || d.createdAt ? formatDate(d.createdAt) : '-')} • Mantri: ${esc(d.issuedByName || 'Mantri Bibitan')}
            </div>
            <button type="button" class="btn-view-chain" data-type="DISPATCH" data-id="${esc(d.id || d.docNo || d.dispatchNo)}" style="width: 100%; height: 28px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.72rem; font-weight: 600; cursor: pointer;">
              Lihat Rantai Transaksi (Chain)
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderReceiptsSection(receipts) {
  if (!receipts || receipts.length === 0) {
    return `<div style="text-align: center; padding: 32px; color: #64748B; background: #FFF; border-radius: 8px;">Tidak ada data tanda terima KSP.</div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${receipts.map(rcp => {
        const shipped = parseInt(rcp.totalShippedQty || rcp.shippedQty || 0, 10);
        const accepted = parseInt(rcp.totalAcceptedQty || rcp.acceptedQty || 0, 10);
        const rejected = parseInt(rcp.totalRejectedQty || rcp.rejectedQty || 0, 10);

        return `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A;">${esc(rcp.docNo || rcp.receiptDocNo)}</div>
              <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #F1F5F9; color: #334155;">${esc(rcp.status || '-')}</span>
            </div>
            <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 6px;">
              Ref Dispatch: <strong>${esc(rcp.dispatchDocNo || rcp.dispatchNo || '-')}</strong>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; padding: 6px 8px; border-radius: 6px; font-size: 0.72rem; text-align: center;">
              <div>Shipped: <strong>${shipped.toLocaleString('id-ID')}</strong></div>
              <div>Accepted: <strong style="color: #15803D;">${accepted.toLocaleString('id-ID')}</strong></div>
              <div>Rejected: <strong style="color: #DC2626;">${rejected.toLocaleString('id-ID')}</strong></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSelectionsSection(selections) {
  if (!selections || selections.length === 0) {
    return `<div style="text-align: center; padding: 32px; color: #64748B; background: #FFF; border-radius: 8px;">Tidak ada data seleksi bibit.</div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${selections.map(sel => {
        const checked = parseInt(sel.jumlahDiperiksa || 0, 10);
        const pass = parseInt(sel.jumlahLayak || 0, 10);
        const cull = parseInt(sel.jumlahAfkir || 0, 10);

        return `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A;">${esc(sel.batchCode || sel.batchNo)} • ${esc(sel.clone || sel.klon || '-')}</div>
              <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #E8F3EC; color: #116834;">${esc(sel.status || '-')}</span>
            </div>
            <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 6px;">
              Bedengan: <strong>${esc(sel.bedengan || (sel.bedenganIds ? sel.bedenganIds.join(', ') : '-'))}</strong>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; padding: 6px 8px; border-radius: 6px; font-size: 0.72rem; text-align: center; margin-bottom: 8px;">
              <div>Diperiksa: <strong>${checked.toLocaleString('id-ID')}</strong></div>
              <div>Layak: <strong style="color: #15803D;">${pass.toLocaleString('id-ID')}</strong></div>
              <div>Afkir: <strong style="color: #DC2626;">${cull.toLocaleString('id-ID')}</strong></div>
            </div>
            <button type="button" class="btn-view-chain" data-type="BATCH" data-id="${esc(sel.batchId || sel.batchCode || sel.batchNo)}" style="width: 100%; height: 28px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.72rem; font-weight: 600; cursor: pointer;">
              Lihat Rantai Batch
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderDestructionsSection(destructions) {
  if (!destructions || destructions.length === 0) {
    return `<div style="text-align: center; padding: 32px; color: #64748B; background: #FFF; border-radius: 8px;">Tidak ada data pemusnahan bibit.</div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${destructions.map(dst => {
        const qty = parseInt(dst.quantity || dst.destructionQty || 0, 10);
        return `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A;">${esc(dst.batchCode || dst.batchNo)} • ${esc(dst.clone || dst.klon || '-')}</div>
              <span style="font-size: 0.78rem; font-weight: 800; color: #DC2626;">${qty.toLocaleString('id-ID')} Pkk</span>
            </div>
            <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 4px;">
              Alasan: <strong>${esc(dst.reason || dst.alasan || '-')}</strong>
            </div>
            <div style="font-size: 0.70rem; color: #475569; margin-bottom: 8px;">
              Status: <strong>${esc(dst.status || '-')}</strong>
            </div>
            <button type="button" class="btn-view-chain" data-type="BATCH" data-id="${esc(dst.batchId || dst.batchCode || dst.batchNo)}" style="width: 100%; height: 28px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 0.72rem; font-weight: 600; cursor: pointer;">
              Lihat Rantai Batch
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderConsistencySection(consistency) {
  const errors = consistency.errors || [];
  const warnings = consistency.warnings || [];

  if (errors.length === 0 && warnings.length === 0) {
    return `
      <div style="background: #FFFFFF; border: 1px solid #BBF7D0; border-radius: 10px; padding: 32px 16px; text-align: center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #F0FDF4; color: #15803D; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h3 style="font-size: 0.95rem; font-weight: 700; color: #15803D; margin: 0 0 4px 0;">100% Data Konsisten & Terhubung</h3>
        <p style="font-size: 0.78rem; color: #64748B; margin: 0;">Seluruh rantai transaksi operasional pembibitan valid dan terverifikasi.</p>
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${errors.map(err => `
        <div style="background: #FFFFFF; border-left: 4px solid #DC2626; border-top: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 0.70rem; font-weight: 700; color: #DC2626;">ERROR: ${esc(err.type)}</div>
          <div style="font-size: 0.80rem; font-weight: 600; color: #1E293B; margin-top: 2px;">${esc(err.message)}</div>
        </div>
      `).join('')}

      ${warnings.map(w => `
        <div style="background: #FFFFFF; border-left: 4px solid #D97706; border-top: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 0.70rem; font-weight: 700; color: #D97706;">INFO / PROGRES: ${esc(w.type)}</div>
          <div style="font-size: 0.80rem; font-weight: 600; color: #1E293B; margin-top: 2px;">${esc(w.message)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function showTraceabilityModal(type, id) {
  const chain = buildTraceabilityChain(type, id);

  openModal({
    title: 'Rantai Pelacakan (Traceability Chain)',
    body: `
      <div style="font-size: 0.82rem; color: #334155; line-height: 1.5;">
        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
          <span style="font-size: 0.70rem; color: #64748B; font-weight: 600;">Pencarian Root:</span>
          <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A;">${esc(type)} • ${esc(id)}</div>
        </div>

        ${chain.request ? `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
            <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">1. PERMINTAAN (PARENT REQUEST)</div>
            <div style="font-weight: 700; color: #0F172A;">${esc(chain.request.docNo)}</div>
            <div style="font-size: 0.72rem; color: #64748B;">Approved: ${chain.request.approvedQty || chain.request.requestedQty} Pkk • Klon: ${chain.request.approvedClone || chain.request.requestedClone}</div>
          </div>
        ` : ''}

        ${chain.dispatches.length > 0 ? `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
            <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">2. PENGELUARAN (${chain.dispatches.length} TRANSAKSI)</div>
            ${chain.dispatches.map(d => `
              <div style="border-top: 1px dashed #CBD5E1; margin-top: 4px; padding-top: 4px;">
                <div style="font-weight: 700;">${esc(d.docNo || d.dispatchNo)} (${parseInt(d.issuedQty || 0).toLocaleString('id-ID')} Pkk)</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${chain.receipts.length > 0 ? `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
            <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">3. TANDA TERIMA KSP (${chain.receipts.length} DOKUMEN)</div>
            ${chain.receipts.map(r => `
              <div style="border-top: 1px dashed #CBD5E1; margin-top: 4px; padding-top: 4px;">
                <div style="font-weight: 700;">${esc(r.docNo || r.receiptDocNo)} (Status: ${esc(r.status)})</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${chain.selections.length > 0 ? `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
            <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">SELEKSI BATCH (${chain.selections.length} REKAMAN)</div>
            ${chain.selections.map(s => `
              <div style="border-top: 1px dashed #CBD5E1; margin-top: 4px; padding-top: 4px;">
                <div style="font-weight: 700;">${esc(s.docNo || s.selectionNo)}: Layak ${s.jumlahLayak}, Afkir ${s.jumlahAfkir}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${chain.destructions.length > 0 ? `
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
            <div style="font-size: 0.68rem; font-weight: 700; color: #DC2626;">PEMUSNAHAN BATCH (${chain.destructions.length} REKAMAN)</div>
            ${chain.destructions.map(d => `
              <div style="border-top: 1px dashed #CBD5E1; margin-top: 4px; padding-top: 4px;">
                <div style="font-weight: 700;">${esc(d.docNo || d.destructionNo)}: ${d.quantity} Pkk (${esc(d.reason)})</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <button id="btn-close-chain-modal" type="button" style="width: 100%; height: 36px; background: #116834; color: #FFF; border: none; border-radius: 6px; font-weight: 700; margin-top: 12px; cursor: pointer;">
          Tutup
        </button>
      </div>
    `
  });

  document.getElementById('btn-close-chain-modal')?.addEventListener('click', closeModal);
}
