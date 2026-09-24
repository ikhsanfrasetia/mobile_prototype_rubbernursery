/**
 * js/modules/verification/verification-landing.js
 * UI Modul Verifikasi Data Asisten Bibitan (TASK ASB-12)
 */

import { session } from '../../core/session.js';
import { toast } from '../../components/toast.js';
import {
  VERIFICATION_STATUS,
  REFERENCE_TYPES,
  getActionableRecordsForAsb,
  getVerificationHistory,
  approveVerification,
  returnVerification,
  evaluateRecordConsistency,
  getPendingVerificationCount
} from './verification-manager.js';
import { buildTraceabilityChain } from '../consolidation/consolidation-manager.js';
import { getEstateById } from '../../data/estate-master.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';

let activeTab = 'PENDING'; // 'PENDING' | 'HISTORY'
let currentFilters = {
  referenceType: 'ALL',
  status: 'ALL',
  severity: 'ALL',
  keyword: ''
};
let selectedItem = null;

function esc(str) {
  if (str === null || str === undefined) return '-';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderVerificationLanding() {
  const main = document.getElementById('main-content') || document.getElementById('app');
  if (!main) return;

  const currentUser = session.getUser();
  const estate = currentUser?.estateId ? getEstateById(currentUser.estateId) : null;
  const estateLabel = estate ? `${estate.name} (${estate.code})` : currentUser?.estateId || 'Semua Kebun';
  const divisionLabel = currentUser?.divisionId || 'Semua Divisi';

  const actionableList = getActionableRecordsForAsb(currentUser, currentFilters);
  const historyList = getVerificationHistory(currentUser, currentFilters);

  const pendingCount = getActionableRecordsForAsb(currentUser).length;
  const verifiedCount = getVerificationHistory(currentUser, { verificationStatus: VERIFICATION_STATUS.TERVERIFIKASI }).length;
  const returnedCount = getVerificationHistory(currentUser, { verificationStatus: VERIFICATION_STATUS.DIKEMBALIKAN }).length;
  const errorCount = actionableList.filter(item => item.errors.length > 0).length;

  main.innerHTML = `
    <div class="verification-workspace-container" style="padding: 20px; max-width: 1400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      
      <!-- Top Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <h1 style="margin: 0; font-size: 1.6rem; font-weight: 700; color: #0F172A;">Verifikasi Data Transaksi</h1>
            <span style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE;">
              Audit Layer ASB
            </span>
          </div>
          <p style="margin: 0; color: #64748B; font-size: 0.9rem;">
            Pemeriksaan kelengkapan, validasi konsistensi rantai transaksi, dan persetujuan audit final.
          </p>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btn-refresh-verif" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: #334155; cursor: pointer;">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Metric Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; color: #64748B; font-weight: 600; text-transform: uppercase;">Menunggu Verifikasi</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: #D97706; margin-top: 6px;">${pendingCount}</div>
          <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Perlu audit & verifikasi</div>
        </div>

        <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; color: #64748B; font-weight: 600; text-transform: uppercase;">Telah Terverifikasi</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: #16A34A; margin-top: 6px;">${verifiedCount}</div>
          <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Audit disetujui</div>
        </div>

        <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; color: #64748B; font-weight: 600; text-transform: uppercase;">Dikembalikan (Revisi)</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: #DC2626; margin-top: 6px;">${returnedCount}</div>
          <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Perlu perbaikan data</div>
        </div>

        <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 0.8rem; color: #64748B; font-weight: 600; text-transform: uppercase;">Temuan Anomali / Error</div>
          <div style="font-size: 1.8rem; font-weight: 700; color: ${errorCount > 0 ? '#DC2626' : '#16A34A'}; margin-top: 6px;">${errorCount}</div>
          <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">${errorCount > 0 ? 'Blokir approval aktif' : 'Semua data bersih'}</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; margin-bottom: 20px;">
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
          <div style="flex: 1; min-width: 180px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Tipe Dokumen</label>
            <select id="filter-ref-type" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;">
              <option value="ALL" ${currentFilters.referenceType === 'ALL' ? 'selected' : ''}>Semua Tipe</option>
              <option value="REQUEST" ${currentFilters.referenceType === 'REQUEST' ? 'selected' : ''}>Permintaan (SPB)</option>
              <option value="DISPATCH" ${currentFilters.referenceType === 'DISPATCH' ? 'selected' : ''}>Pengeluaran (Dispatch)</option>
              <option value="RECEIPT" ${currentFilters.referenceType === 'RECEIPT' ? 'selected' : ''}>Penerimaan KSP</option>
              <option value="SELECTION" ${currentFilters.referenceType === 'SELECTION' ? 'selected' : ''}>Hasil Seleksi</option>
              <option value="DESTRUCTION" ${currentFilters.referenceType === 'DESTRUCTION' ? 'selected' : ''}>Pemusnahan Bibit</option>
            </select>
          </div>

          <div style="flex: 1; min-width: 160px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Konsistensi</label>
            <select id="filter-severity" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;">
              <option value="ALL" ${currentFilters.severity === 'ALL' ? 'selected' : ''}>Semua Status Konsistensi</option>
              <option value="CLEAN" ${currentFilters.severity === 'CLEAN' ? 'selected' : ''}>✅ Clean (Siap Verifikasi)</option>
              <option value="WARNING" ${currentFilters.severity === 'WARNING' ? 'selected' : ''}>⚠️ Warning (Perhatian)</option>
              <option value="ERROR" ${currentFilters.severity === 'ERROR' ? 'selected' : ''}>⛔ Error (Bermasalah)</option>
            </select>
          </div>

          <div style="flex: 2; min-width: 200px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Pencarian Dokumen</label>
            <input type="text" id="filter-keyword" placeholder="Cari No Dokumen / Catatan..." value="${esc(currentFilters.keyword || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;" />
          </div>

          <div style="align-self: flex-end;">
            <button id="btn-reset-filters" style="padding: 8px 14px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem; color: #475569; cursor: pointer;">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; border-bottom: 2px solid #E2E8F0; margin-bottom: 20px;">
        <button id="tab-pending" style="padding: 10px 20px; font-size: 0.9rem; font-weight: 700; border: none; background: none; cursor: pointer; border-bottom: 3px solid ${activeTab === 'PENDING' ? '#2563EB' : 'transparent'}; color: ${activeTab === 'PENDING' ? '#2563EB' : '#64748B'}; margin-bottom: -2px;">
          ⏳ Menunggu Verifikasi (${actionableList.length})
        </button>
        <button id="tab-history" style="padding: 10px 20px; font-size: 0.9rem; font-weight: 700; border: none; background: none; cursor: pointer; border-bottom: 3px solid ${activeTab === 'HISTORY' ? '#2563EB' : 'transparent'}; color: ${activeTab === 'HISTORY' ? '#2563EB' : '#64748B'}; margin-bottom: -2px;">
          📜 Riwayat Audit Verifikasi (${historyList.length})
        </button>
      </div>

      <!-- Tab Content -->
      <div id="verif-tab-content">
        ${activeTab === 'PENDING' ? renderPendingTable(actionableList) : renderHistoryTable(historyList)}
      </div>

      <!-- Modal Container -->
      <div id="verif-modal-container"></div>
    </div>
  `;

  attachEventListeners(main, currentUser);
}

function renderPendingTable(records) {
  if (!records || records.length === 0) {
    return renderEmptyStateCard({
      title: 'Tidak Ada Data Menunggu Verifikasi',
      description: 'Seluruh data transaksi dalam scope Anda sudah terverifikasi dan memenuhi syarat konsistensi.'
    });
  }

  return `
    <div style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
        <thead>
          <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #475569;">
            <th style="padding: 12px 16px; font-weight: 600;">Tipe Dokumen</th>
            <th style="padding: 12px 16px; font-weight: 600;">No. Dokumen / Referensi</th>
            <th style="padding: 12px 16px; font-weight: 600;">Tanggal</th>
            <th style="padding: 12px 16px; font-weight: 600;">Estate / Divisi</th>
            <th style="padding: 12px 16px; font-weight: 600;">Status Sumber</th>
            <th style="padding: 12px 16px; font-weight: 600;">Konsistensi</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => {
            let consistencyBadge = `<span style="font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0;">✅ CLEAN</span>`;
            if (r.errors.length > 0) {
              consistencyBadge = `<span style="font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;">⛔ ERROR (${r.errors.length})</span>`;
            } else if (r.warnings.length > 0) {
              consistencyBadge = `<span style="font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A;">⚠️ WARNING (${r.warnings.length})</span>`;
            }

            return `
              <tr style="border-bottom: 1px solid #F1F5F9; hover: background-color: #F8FAFC;">
                <td style="padding: 12px 16px; font-weight: 600; color: #1E293B;">
                  <span style="display: inline-block; padding: 2px 6px; font-size: 0.7rem; font-weight: 700; border-radius: 4px; background: #F1F5F9; color: #334155;">
                    ${esc(r.referenceType)}
                  </span>
                </td>
                <td style="padding: 12px 16px; font-weight: 600; color: #2563EB;">${esc(r.referenceDocNo)}</td>
                <td style="padding: 12px 16px; color: #64748B;">${esc(r.date ? r.date.substring(0, 10) : '-')}</td>
                <td style="padding: 12px 16px; color: #334155;">${esc(r.estateId)} / ${esc(r.divisionId)}</td>
                <td style="padding: 12px 16px;">
                  <span style="font-size: 0.75rem; font-weight: 600; color: #475569;">${esc(r.currentStatus)}</span>
                </td>
                <td style="padding: 12px 16px;">${consistencyBadge}</td>
                <td style="padding: 12px 16px; text-align: center;">
                  <button class="btn-open-detail" data-type="${esc(r.referenceType)}" data-id="${esc(r.referenceId)}" style="padding: 6px 14px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                    🔍 Periksa & Verifikasi
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderHistoryTable(records) {
  if (!records || records.length === 0) {
    return renderEmptyStateCard({
      title: 'Belum Ada Riwayat Verifikasi',
      description: 'Catatan audit verifikasi dan keputusan pengembalian akan tercatat di sini.'
    });
  }

  return `
    <div style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
        <thead>
          <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #475569;">
            <th style="padding: 12px 16px; font-weight: 600;">No. Verifikasi</th>
            <th style="padding: 12px 16px; font-weight: 600;">Tipe & No Dokumen</th>
            <th style="padding: 12px 16px; font-weight: 600;">Status Audit</th>
            <th style="padding: 12px 16px; font-weight: 600;">Verifikator</th>
            <th style="padding: 12px 16px; font-weight: 600;">Tanggal & Waktu</th>
            <th style="padding: 12px 16px; font-weight: 600;">Catatan / Alasan</th>
            <th style="padding: 12px 16px; font-weight: 600; text-align: center;">Trace</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(v => {
            const isApproved = v.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI;
            const badge = isApproved 
              ? `<span style="font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0;">✅ TERVERIFIKASI</span>`
              : `<span style="font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;">↩️ DIKEMBALIKAN</span>`;

            return `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 12px 16px; font-weight: 700; color: #1E293B;">${esc(v.verificationNo)}</td>
                <td style="padding: 12px 16px;">
                  <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #F1F5F9; color: #475569; margin-right: 4px;">${esc(v.referenceType)}</span>
                  <strong style="color: #2563EB;">${esc(v.referenceDocNo)}</strong>
                </td>
                <td style="padding: 12px 16px;">${badge}</td>
                <td style="padding: 12px 16px; color: #334155;">
                  <strong>${esc(v.verifiedByName)}</strong><br>
                  <span style="font-size: 0.72rem; color: #64748B;">${esc(v.verifiedByRole)}</span>
                </td>
                <td style="padding: 12px 16px; color: #64748B; font-size: 0.8rem;">
                  ${esc(v.verifiedAt ? v.verifiedAt.replace('T', ' ').substring(0, 19) : '-')}
                </td>
                <td style="padding: 12px 16px; color: #334155; max-width: 250px;">
                  ${v.returnReason ? `<div style="color: #DC2626; font-size: 0.8rem;"><strong>Alasan:</strong> ${esc(v.returnReason)}</div>` : ''}
                  ${v.notes ? `<div style="color: #475569; font-size: 0.8rem;"><strong>Catatan:</strong> ${esc(v.notes)}</div>` : '-'}
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                  <button class="btn-trace-history" data-type="${esc(v.referenceType)}" data-no="${esc(v.referenceDocNo)}" style="padding: 4px 10px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.75rem; color: #334155; cursor: pointer;">
                    🔗 Rantai
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function openDetailModal(item, currentUser) {
  const container = document.getElementById('verif-modal-container');
  if (!container) return;

  const raw = item.rawRecord || {};
  const evalResult = evaluateRecordConsistency(item.referenceType, raw);
  const chain = buildTraceabilityChain(item.referenceType, item.referenceDocNo);

  container.innerHTML = `
    <div class="verif-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
      <div style="background: #FFFFFF; border-radius: 16px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);">
        
        <!-- Modal Header -->
        <div style="padding: 20px 24px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC;">
          <div>
            <div style="font-size: 0.75rem; font-weight: 700; color: #2563EB; text-transform: uppercase;">Pemeriksaan & Verifikasi Dokumen</div>
            <h2 style="margin: 4px 0 0 0; font-size: 1.25rem; font-weight: 700; color: #0F172A;">
              [${esc(item.referenceType)}] ${esc(item.referenceDocNo)}
            </h2>
          </div>
          <button id="btn-close-modal" style="background: none; border: none; font-size: 1.5rem; color: #64748B; cursor: pointer; padding: 4px 8px;">&times;</button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div style="padding: 24px; overflow-y: auto; flex: 1;">
          
          <!-- Consistency Gate Alert -->
          <div style="margin-bottom: 20px;">
            ${evalResult.errors.length > 0 ? `
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 14px 16px; color: #991B1B;">
                <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  ⛔ Peringatan Konsistensi (ERROR Ditemukan)
                </div>
                <div style="font-size: 0.85rem; line-height: 1.4;">
                  Dokumen ini memiliki kesalahan konsistensi fatal. Tombol approval dinonaktifkan sampai data diperbaiki.
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 0.8rem;">
                  ${evalResult.errors.map(e => `<li>${esc(e.message)}</li>`).join('')}
                </ul>
              </div>
            ` : evalResult.warnings.length > 0 ? `
              <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; color: #92400E;">
                <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  ⚠️ Catatan Konsistensi (WARNING)
                </div>
                <div style="font-size: 0.85rem; line-height: 1.4;">
                  Terdapat catatan pada alur rantai dokumen, namun verifikasi tetap dapat disetujui jika dapat dijustifikasi.
                </div>
                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 0.8rem;">
                  ${evalResult.warnings.map(w => `<li>${esc(w.message)}</li>`).join('')}
                </ul>
              </div>
            ` : `
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px 16px; color: #166534; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                <span>✅</span> <strong>Data Konsisten:</strong> Seluruh rantai relasi dan kuantitas valid. Dokumen siap diverifikasi.
              </div>
            `}
          </div>

          <!-- Document Key Attributes -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 10px; text-transform: uppercase;">Informasi Dokumen</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 0.85rem;">
              <div><span style="color: #64748B;">Kebun / Divisi:</span> <strong>${esc(item.estateId)} / ${esc(item.divisionId)}</strong></div>
              <div><span style="color: #64748B;">Status Sumber:</span> <strong>${esc(item.currentStatus)}</strong></div>
              <div><span style="color: #64748B;">Tanggal:</span> <strong>${esc(item.date ? item.date.substring(0, 10) : '-')}</strong></div>
              <div><span style="color: #64748B;">Jumlah / Qty:</span> <strong>${esc(raw.requestedQty || raw.shippedQty || raw.acceptedQty || raw.quantity || raw.inspectedQty || '-')}</strong></div>
            </div>
          </div>

          <!-- Traceability Chain -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase;">Silsilah Rantai Transaksi</div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 0.85rem;">
              ${chain.type === 'DISTRIBUTION_CHAIN' ? `
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="padding: 4px 8px; background: ${chain.request ? '#EFF6FF' : '#F1F5F9'}; color: #1E40AF; border-radius: 4px; font-weight: 600;">
                    1. Request: ${esc(chain.request ? chain.request.docNo || chain.request.nir : 'N/A')}
                  </span>
                  <span>➔</span>
                  <span style="padding: 4px 8px; background: ${chain.dispatch ? '#EFF6FF' : '#F1F5F9'}; color: #1E40AF; border-radius: 4px; font-weight: 600;">
                    2. Dispatch: ${esc(chain.dispatch ? chain.dispatch.docNo || chain.dispatch.dispatchNo : 'N/A')}
                  </span>
                  <span>➔</span>
                  <span style="padding: 4px 8px; background: ${chain.receipt ? '#EFF6FF' : '#F1F5F9'}; color: #1E40AF; border-radius: 4px; font-weight: 600;">
                    3. Receipt: ${esc(chain.receipt ? chain.receipt.docNo || chain.receipt.receiptDocNo : 'N/A')}
                  </span>
                </div>
              ` : `
                <div style="color: #64748B; font-size: 0.8rem;">
                  Batch Referensi: <strong>${esc(chain.batch ? chain.batch.batchCode : raw.batchId || '-')}</strong> | 
                  Seleksi Terkait: <strong>${chain.selections ? chain.selections.length : 0}</strong> | 
                  Pemusnahan Terkait: <strong>${chain.destructions ? chain.destructions.length : 0}</strong>
                </div>
              `}
            </div>
          </div>

          <!-- Audit Action Form -->
          <div>
            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Catatan Verifikasi (Opsional untuk Approve):</label>
              <textarea id="modal-notes" placeholder="Tuliskan catatan hasil audit atau pemeriksaan..." style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem; height: 60px;"></textarea>
            </div>

            <div id="return-reason-container" style="display: none; margin-bottom: 12px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #DC2626; margin-bottom: 4px;">Alasan Pengembalian (Wajib diisi jika dikembalikan): *</label>
              <textarea id="modal-return-reason" placeholder="Jelaskan alasan pengembalian data untuk perbaikan..." style="width: 100%; padding: 8px 12px; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 0.85rem; height: 60px; background: #FEF2F2;"></textarea>
            </div>
          </div>

        </div>

        <!-- Modal Footer -->
        <div style="padding: 16px 24px; border-top: 1px solid #E2E8F0; background: #F8FAFC; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div>
            <button id="btn-toggle-return" style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #FCA5A5; color: #DC2626; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
              ↩️ Kembalikan (Revisi)
            </button>
            <button id="btn-confirm-return" style="display: none; padding: 8px 16px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
              Kirim Pengembalian
            </button>
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-modal" style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #475569; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
              Tutup
            </button>
            <button id="btn-approve-modal" ${!evalResult.canApprove ? 'disabled style="padding: 8px 16px; background: #94A3B8; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: not-allowed;"' : 'style="padding: 8px 16px; background: #16A34A; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;"'}>
              ✅ Setujui & Verifikasi
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Attach Modal Listeners
  const closeModal = () => { container.innerHTML = ''; };
  document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

  // Toggle Return Form
  const btnToggleReturn = document.getElementById('btn-toggle-return');
  const btnConfirmReturn = document.getElementById('btn-confirm-return');
  const returnContainer = document.getElementById('return-reason-container');
  const btnApprove = document.getElementById('btn-approve-modal');

  btnToggleReturn?.addEventListener('click', () => {
    returnContainer.style.display = 'block';
    btnToggleReturn.style.display = 'none';
    btnConfirmReturn.style.display = 'inline-block';
    if (btnApprove) btnApprove.style.display = 'none';
  });

  // Handle Confirm Return
  btnConfirmReturn?.addEventListener('click', () => {
    const returnReason = document.getElementById('modal-return-reason')?.value || '';
    const notes = document.getElementById('modal-notes')?.value || '';
    if (!returnReason.trim()) {
      toast('Alasan pengembalian wajib diisi!', 'error');
      return;
    }

    try {
      returnVerification({
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        returnReason,
        notes,
        currentUser
      });
      toast(`Dokumen ${item.referenceDocNo} berhasil dikembalikan untuk perbaikan.`, 'success');
      closeModal();
      renderVerificationLanding();
    } catch (err) {
      toast(err.message || 'Gagal mengembalikan dokumen.', 'error');
    }
  });

  // Handle Approve
  btnApprove?.addEventListener('click', () => {
    if (!evalResult.canApprove) {
      toast('Dokumen memiliki kesalahan konsistensi (ERROR). Approval diblokir.', 'error');
      return;
    }

    const notes = document.getElementById('modal-notes')?.value || '';

    try {
      const record = approveVerification({
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        notes,
        currentUser
      });
      toast(`Dokumen ${item.referenceDocNo} berhasil diverifikasi (No: ${record.verificationNo}).`, 'success');
      closeModal();
      renderVerificationLanding();
    } catch (err) {
      toast(err.message || 'Gagal memverifikasi dokumen.', 'error');
    }
  });
}

function attachEventListeners(main, currentUser) {
  // Tab Switching
  document.getElementById('tab-pending')?.addEventListener('click', () => {
    activeTab = 'PENDING';
    renderVerificationLanding();
  });
  document.getElementById('tab-history')?.addEventListener('click', () => {
    activeTab = 'HISTORY';
    renderVerificationLanding();
  });

  // Refresh
  document.getElementById('btn-refresh-verif')?.addEventListener('click', () => {
    renderVerificationLanding();
    toast('Data verifikasi diperbarui.', 'info');
  });

  // Filters
  document.getElementById('filter-ref-type')?.addEventListener('change', (e) => {
    currentFilters.referenceType = e.target.value;
    renderVerificationLanding();
  });
  document.getElementById('filter-severity')?.addEventListener('change', (e) => {
    currentFilters.severity = e.target.value;
    renderVerificationLanding();
  });
  document.getElementById('filter-keyword')?.addEventListener('input', (e) => {
    currentFilters.keyword = e.target.value;
    const content = document.getElementById('verif-tab-content');
    if (content) {
      if (activeTab === 'PENDING') {
        content.innerHTML = renderPendingTable(getActionableRecordsForAsb(currentUser, currentFilters));
      } else {
        content.innerHTML = renderHistoryTable(getVerificationHistory(currentUser, currentFilters));
      }
    }
  });
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    currentFilters = { referenceType: 'ALL', status: 'ALL', severity: 'ALL', keyword: '' };
    renderVerificationLanding();
  });

  // Open Detail
  main.querySelectorAll('.btn-open-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      const list = getActionableRecordsForAsb(currentUser, {});
      const target = list.find(item => item.referenceType === type && String(item.referenceId) === String(id));
      if (target) {
        openDetailModal(target, currentUser);
      }
    });
  });

  // History Trace
  main.querySelectorAll('.btn-trace-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const no = btn.getAttribute('data-no');
      const chain = buildTraceabilityChain(type, no);
      toast(`Rantai: ${chain.type} (Status: ${chain.status})`, 'info');
    });
  });
}
