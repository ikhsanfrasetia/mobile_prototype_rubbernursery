/**
 * js/modules/master/material-master.js
 * Modul Standalone: Master Material & Simulasi Issue Gudang (SIGMA Rubber Nursery).
 *
 * Source of Truth: Material Issue.xlsx (61 records)
 *
 * Fitur:
 * 1. Tab [ Master Material ]: 13 Material Unik (1 Item Code = 1 Master, 1 UOM Master)
 * 2. Tab [ Issue Gudang ]: 61 Dokumen Issue Gudang dari posting gudang
 * 3. Modal / Drawer Detail Issue Gudang lengkap dengan Saldo Issue Initial
 * 4. Responsive UI (320px, 360px, 390px, 430px, Desktop)
 * 5. NO INTEGRATION ke modul operasional (Pindah Semai, Dederan, Okulasi, dll).
 */

import { navigate } from '../../core/router.js';
import { esc } from '../../core/utils.js';
import { openModal, closeModal } from '../../components/modal.js';
import {
  getAllMaterials,
  getMaterialByItemCode,
  getAllIssueDocuments,
  getIssueByNoIssue,
  getIssueDetails,
  getIssueUsedQuantity,
  getIssueRemainingQuantity,
  getIssueStatus,
  getMaterialSummaryStats,
  getUomNormalizationLog,
  initMaterialMasterStorage
} from '../../data/material-master.js';

let activeTab = 'master'; // 'master' | 'issue'
let state = {
  masterSearch: '',
  masterUomFilter: 'ALL',
  masterStatusFilter: 'ALL',
  issueSearch: '',
  issueAlokasiFilter: 'ALL',
  issueStatusFilter: 'ALL',
  selectedMaterialCode: null
};

function formatStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'AVAILABLE' || s === 'TERSEDIA') {
    return {
      label: 'Tersedia',
      style: 'background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;'
    };
  }
  if (s === 'PARTIALLY_USED' || s === 'TERPAKAI SEBAGIAN') {
    return {
      label: 'Terpakai Sebagian',
      style: 'background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A;'
    };
  }
  if (s === 'FULLY_USED' || s === 'HABIS') {
    return {
      label: 'Habis Terpakai',
      style: 'background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;'
    };
  }
  if (s === 'ACTIVE' || s === 'AKTIF') {
    return {
      label: 'Aktif',
      style: 'background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;'
    };
  }
  if (s === 'INACTIVE' || s === 'NON-AKTIF') {
    return {
      label: 'Non-Aktif',
      style: 'background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;'
    };
  }
  return {
    label: status || '-',
    style: 'background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;'
  };
}

export function renderMaterialMaster() {
  initMaterialMasterStorage();
  const app = document.getElementById('app');
  if (!app) return;

  function renderView() {
    const stats = getMaterialSummaryStats();
    const allMaterials = getAllMaterials();
    const allIssues = getAllIssueDocuments();
    const normLog = getUomNormalizationLog();

    // Filter Master Materials
    const filteredMaterials = allMaterials.filter(m => {
      const q = state.masterSearch.trim().toLowerCase();
      const matchSearch = !q ||
        String(m.itemCode).toLowerCase().includes(q) ||
        String(m.itemName).toLowerCase().includes(q);
      const matchUom = state.masterUomFilter === 'ALL' || m.uom === state.masterUomFilter;
      const matchStatus = state.masterStatusFilter === 'ALL' || m.status === state.masterStatusFilter;
      return matchSearch && matchUom && matchStatus;
    });

    // Extract unique UOMs for filter
    const uomList = Array.from(new Set(allMaterials.map(m => m.uom))).sort();

    // Extract unique Alokasi for filter
    const alokasiList = Array.from(new Set(allIssues.map(d => `${d.kodeAlokasi} - ${d.namaAlokasi}`))).sort();

    // Filter Issue Documents
    const filteredIssues = allIssues.filter(doc => {
      const q = state.issueSearch.trim().toLowerCase();
      const firstItem = doc.items?.[0] || {};
      const status = getIssueStatus(doc.id);

      const matchSearch = !q ||
        String(doc.noIssue).toLowerCase().includes(q) ||
        String(doc.kodeAlokasi).toLowerCase().includes(q) ||
        String(doc.namaAlokasi).toLowerCase().includes(q) ||
        String(firstItem.itemCode || '').toLowerCase().includes(q) ||
        String(firstItem.itemName || '').toLowerCase().includes(q) ||
        String(firstItem.purpose || '').toLowerCase().includes(q);

      const alokasiVal = `${doc.kodeAlokasi} - ${doc.namaAlokasi}`;
      const matchAlokasi = state.issueAlokasiFilter === 'ALL' || alokasiVal === state.issueAlokasiFilter;
      const matchStatus = state.issueStatusFilter === 'ALL' || status === state.issueStatusFilter;

      // Filter by selected material if triggered from master tab
      const matchMaterial = !state.selectedMaterialCode || firstItem.itemCode === state.selectedMaterialCode;

      return matchSearch && matchAlokasi && matchStatus && matchMaterial;
    });

    app.innerHTML = `
      <div class="page material-master-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden;">
        
        <!-- HEADER -->
        <header style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 12px 16px; flex-shrink: 0; z-index: 10;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <button id="mat-btn-back" type="button" aria-label="Kembali ke Beranda" style="background: #F1F5F9; border: 1px solid #E2E8F0; cursor: pointer; padding: 7px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #334155; flex-shrink: 0;">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>
              <div style="min-width: 0;">
                <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Material & Bahan</h1>
              </div>
            </div>

            <!-- SYNC / REFRESH BUTTON -->
            <button id="mat-btn-sync" type="button" aria-label="Sinkronisasi Data" title="Sync / Refresh Data" style="background: #F1F5F9; border: 1px solid #E2E8F0; cursor: pointer; padding: 7px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #116834; flex-shrink: 0; transition: transform 0.3s ease;">
              <svg id="mat-sync-svg" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>

          <!-- TAB SWITCHER -->
          <div style="display: flex; background: #F1F5F9; padding: 3px; border-radius: 8px; margin-top: 12px; gap: 2px;">
            <button id="tab-btn-master" type="button" style="flex: 1; padding: 8px 12px; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease; ${activeTab === 'master' ? 'background: #FFFFFF; color: #0F172A; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: #64748B;'}">
              Master Material <span style="display: inline-block; padding: 1px 6px; background: ${activeTab === 'master' ? '#E0F2FE' : '#E2E8F0'}; color: ${activeTab === 'master' ? '#0369A1' : '#475569'}; border-radius: 10px; font-size: 0.68rem; margin-left: 4px;">${stats.totalMasterMaterials}</span>
            </button>
            <button id="tab-btn-issue" type="button" style="flex: 1; padding: 8px 12px; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease; ${activeTab === 'issue' ? 'background: #FFFFFF; color: #0F172A; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: #64748B;'}">
              Issue Gudang <span style="display: inline-block; padding: 1px 6px; background: ${activeTab === 'issue' ? '#E0F2FE' : '#E2E8F0'}; color: ${activeTab === 'issue' ? '#0369A1' : '#475569'}; border-radius: 10px; font-size: 0.68rem; margin-left: 4px;">${stats.totalIssueDocuments}</span>
            </button>
          </div>
        </header>

        <!-- MAIN BODY (SCROLLABLE CONTAINER) -->
        <main id="material-main-scroll" style="flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 14px 16px 48px; max-width: 1100px; width: 100%; margin: 0 auto; box-sizing: border-box;">
          
          ${activeTab === 'master' ? renderMasterTabContent(filteredMaterials, uomList, stats, normLog) : renderIssueTabContent(filteredIssues, alokasiList, stats)}

        </main>
      </div>
    `;

    attachEventListeners();
  }

  // --- RENDER TAB MASTER MATERIAL ---
  function renderMasterTabContent(materials, uomList, stats, normLog) {
    return `
      <!-- SUMMARY METRICS -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 14px;">
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="font-size: 0.7rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Master Material</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-top: 4px;">${stats.totalMasterMaterials} <span style="font-size: 0.75rem; font-weight: 500; color: #64748B;">Item</span></div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="font-size: 0.7rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Dokumen Issue</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0369A1; margin-top: 4px;">${stats.totalIssueDocuments} <span style="font-size: 0.75rem; font-weight: 500; color: #64748B;">Doc</span></div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="font-size: 0.7rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Status Master</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #059669; margin-top: 4px;">${materials.length} <span style="font-size: 0.75rem; font-weight: 500; color: #64748B;">Active</span></div>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="font-size: 0.7rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Normalisasi UOM</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #D97706; margin-top: 4px;">${normLog.length} <span style="font-size: 0.75rem; font-weight: 500; color: #64748B;">Rule</span></div>
        </div>
      </div>

      <!-- SEARCH & FILTER BAR -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- SEARCH INPUT -->
          <div style="position: relative; width: 100%;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input id="input-master-search" type="text" placeholder="Cari Item Code atau Nama Material..." value="${esc(state.masterSearch)}" style="width: 100%; box-sizing: border-box; padding: 8px 10px 8px 34px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.82rem; color: #0F172A; outline: none; background: #F8FAFC;" />
          </div>

          <!-- FILTERS -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <select id="select-master-uom" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.78rem; color: #334155; background: #FFFFFF; outline: none; cursor: pointer;">
              <option value="ALL" ${state.masterUomFilter === 'ALL' ? 'selected' : ''}>Semua UOM</option>
              ${uomList.map(u => `<option value="${u}" ${state.masterUomFilter === u ? 'selected' : ''}>UOM: ${u}</option>`).join('')}
            </select>

            <select id="select-master-status" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.78rem; color: #334155; background: #FFFFFF; outline: none; cursor: pointer;">
              <option value="ALL" ${state.masterStatusFilter === 'ALL' ? 'selected' : ''}>Semua Status</option>
              <option value="ACTIVE" ${state.masterStatusFilter === 'ACTIVE' ? 'selected' : ''}>Aktif</option>
              <option value="INACTIVE" ${state.masterStatusFilter === 'INACTIVE' ? 'selected' : ''}>Non-Aktif</option>
            </select>
          </div>
        </div>
      </div>

      <!-- MASTER MATERIAL LIST -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        
        <div style="padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="font-size: 0.84rem; font-weight: 700; color: #1E293B;">Daftar Master Material</div>
          <span style="display: inline-block; padding: 2px 8px; background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; font-weight: 700; border-radius: 12px; font-size: 0.7rem; white-space: nowrap;">
            ${materials.length} Master Aktif
          </span>
        </div>

        ${materials.length === 0 ? `
          <div style="padding: 40px 20px; text-align: center; color: #64748B;">
            <div style="font-size: 0.9rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Material Tidak Ditemukan</div>
            <div style="font-size: 0.78rem;">Silakan ubah kata kunci pencarian atau reset filter.</div>
          </div>
        ` : `
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem; min-width: 600px;">
              <thead>
                <tr style="background: #F1F5F9; color: #475569; border-bottom: 1px solid #E2E8F0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                  <th style="padding: 10px 14px; width: 45px; text-align: center;">No</th>
                  <th style="padding: 10px 14px; width: 120px;">Item Code</th>
                  <th style="padding: 10px 14px; min-width: 200px;">Nama Material</th>
                  <th style="padding: 10px 14px; width: 85px; text-align: center;">UOM</th>
                  <th style="padding: 10px 14px; width: 85px; text-align: center;">Status</th>
                  <th style="padding: 10px 14px; width: 110px; text-align: center;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${materials.map((m, idx) => {
      const isNormalized = normLog.some(l => l.itemCode === m.itemCode);
      const statusInfo = formatStatusBadge(m.status);
      return `
                    <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 12px 14px; text-align: center; color: #94A3B8; font-weight: 600; font-size: 0.78rem;">${idx + 1}</td>
                      <td style="padding: 12px 14px; white-space: nowrap;">
                        <span style="display: inline-block; padding: 3px 8px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-family: monospace; font-size: 0.78rem; font-weight: 700; color: #0F172A; white-space: nowrap;">
                          ${esc(m.itemCode)}
                        </span>
                      </td>
                      <td style="padding: 12px 14px;">
                        <div style="font-weight: 600; color: #0F172A; line-height: 1.35; font-size: 0.82rem;">${esc(m.itemName)}</div>
                        ${isNormalized ? `
                          <div style="font-size: 0.68rem; color: #D97706; margin-top: 3px; display: inline-flex; align-items: center; gap: 3px;">
                            <span style="font-weight: 700;">★ Normalized:</span> Master UOM dikunci ke <strong>BH</strong>
                          </div>
                        ` : ''}
                      </td>
                      <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
                        <span style="display: inline-block; padding: 3px 8px; background: #E0F2FE; color: #0369A1; font-weight: 700; border-radius: 6px; font-size: 0.72rem; white-space: nowrap;">
                          ${esc(m.uom)}
                        </span>
                      </td>
                      <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
                        <span style="display: inline-block; padding: 3px 8px; ${statusInfo.style} font-weight: 700; border-radius: 6px; font-size: 0.7rem; white-space: nowrap;">
                          ${esc(statusInfo.label)}
                        </span>
                      </td>
                      <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-view-issues" data-item-code="${esc(m.itemCode)}" style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 5px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; color: #0369A1; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease; white-space: nowrap;">
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          Lihat Issue
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
    `;
  }

  // --- RENDER TAB ISSUE GUDANG ---
  function renderIssueTabContent(issues, alokasiList, stats) {
    return `
      <!-- SEARCH & FILTER BAR -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
        <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- SEARCH INPUT -->
          <div style="position: relative; width: 100%;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input id="input-issue-search" type="text" placeholder="Cari No Issue, Material, Alokasi, Purpose..." value="${esc(state.issueSearch)}" style="width: 100%; box-sizing: border-box; padding: 8px 10px 8px 34px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.82rem; color: #0F172A; outline: none; background: #F8FAFC;" />
          </div>

          <!-- FILTER DROPDOWNS -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <!-- ALOKASI FILTER -->
            <select id="select-issue-alokasi" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.78rem; color: #334155; background: #FFFFFF; outline: none; cursor: pointer;">
              <option value="ALL" ${state.issueAlokasiFilter === 'ALL' ? 'selected' : ''}>Semua Alokasi</option>
              ${alokasiList.map(a => `<option value="${a}" ${state.issueAlokasiFilter === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>

            <!-- STATUS FILTER -->
            <select id="select-issue-status" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.78rem; color: #334155; background: #FFFFFF; outline: none; cursor: pointer;">
              <option value="ALL" ${state.issueStatusFilter === 'ALL' ? 'selected' : ''}>Semua Status</option>
              <option value="AVAILABLE" ${state.issueStatusFilter === 'AVAILABLE' ? 'selected' : ''}>Tersedia</option>
              <option value="PARTIALLY_USED" ${state.issueStatusFilter === 'PARTIALLY_USED' ? 'selected' : ''}>Terpakai Sebagian</option>
              <option value="FULLY_USED" ${state.issueStatusFilter === 'FULLY_USED' ? 'selected' : ''}>Habis Terpakai</option>
            </select>
          </div>

        </div>

        ${state.selectedMaterialCode ? `
          <div style="margin-top: 10px; padding: 6px 10px; background: #E0F2FE; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: #0369A1;">
            <div>Menampilkan Issue untuk: <strong>${esc(state.selectedMaterialCode)}</strong></div>
            <button id="btn-clear-material-filter" type="button" style="background: transparent; border: none; color: #0284C7; font-weight: 700; cursor: pointer; padding: 2px 6px;">Reset Filter</button>
          </div>
        ` : ''}
      </div>

      <!-- ISSUE DOCUMENTS LIST -->
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        
        <div style="padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="font-size: 0.84rem; font-weight: 700; color: #1E293B;">Daftar Dokumen Issue Gudang</div>
          <span style="display: inline-block; padding: 2px 8px; background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; font-weight: 700; border-radius: 12px; font-size: 0.7rem; white-space: nowrap;">
            ${issues.length} Dokumen Terposting
          </span>
        </div>

        ${issues.length === 0 ? `
          <div style="padding: 40px 20px; text-align: center; color: #64748B;">
            <div style="font-size: 0.9rem; font-weight: 600; color: #334155; margin-bottom: 4px;">Dokumen Issue Tidak Ditemukan</div>
            <div style="font-size: 0.78rem;">Silakan sesuaikan parameter pencarian Anda.</div>
          </div>
        ` : `
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem; min-width: 760px;">
              <thead>
                <tr style="background: #F1F5F9; color: #475569; border-bottom: 1px solid #E2E8F0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                  <th style="padding: 10px 14px; min-width: 180px;">Material</th>
                  <th style="padding: 10px 14px; width: 140px;">Dokumen Issue</th>
                  <th style="padding: 10px 14px; width: 160px;">Alokasi Biaya</th>
                  <th style="padding: 10px 14px; min-width: 150px;">Purpose / Peruntukan</th>
                  <th style="padding: 10px 14px; width: 120px; text-align: right;">Qty & Saldo</th>
                  <th style="padding: 10px 14px; width: 110px; text-align: center;">Status</th>
                  <th style="padding: 10px 14px; width: 80px; text-align: center;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${issues.map(doc => {
      const item = doc.items?.[0] || {};
      const status = getIssueStatus(doc.id);
      const statusInfo = formatStatusBadge(status);
      return `
                    <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
                      <!-- 1. MATERIAL IDENTITY (PRIMARY) -->
                      <td style="padding: 12px 14px; vertical-align: top;">
                        <div style="font-weight: 700; color: #0F172A; font-size: 0.84rem; line-height: 1.35;">
                          ${esc(item.itemName || '-')}
                        </div>
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 5px;">
                          <span style="display: inline-block; padding: 2px 6px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px; font-family: monospace; font-size: 0.72rem; font-weight: 700; color: #334155; white-space: nowrap;">
                            Item: ${esc(item.itemCode || '-')}
                          </span>
                          <span style="display: inline-block; padding: 2px 6px; background: #E0F2FE; color: #0369A1; font-weight: 700; border-radius: 4px; font-size: 0.7rem; white-space: nowrap;">
                            ${esc(item.uom || '-')}
                          </span>
                        </div>
                      </td>

                      <!-- 2. ISSUE DOCUMENT -->
                      <td style="padding: 12px 14px; vertical-align: top; white-space: nowrap;">
                        <span style="font-family: monospace; font-weight: 700; color: #0F172A; font-size: 0.8rem; display: block;">
                          ${esc(doc.noIssue)}
                        </span>
                        <span style="font-size: 0.72rem; color: #64748B; margin-top: 3px; display: inline-flex; align-items: center; gap: 4px;">
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="#64748B" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          ${esc(doc.tanggal)}
                        </span>
                      </td>

                      <!-- 3. ALOKASI ISSUE METADATA -->
                      <td style="padding: 12px 14px; vertical-align: top;">
                        <div style="font-weight: 600; color: #1E293B; font-size: 0.78rem; line-height: 1.35;">
                          ${esc(doc.namaAlokasi)}
                        </div>
                        <div style="font-family: monospace; font-size: 0.7rem; color: #64748B; margin-top: 3px;">
                          ${esc(doc.kodeAlokasi)}
                        </div>
                      </td>

                      <!-- 4. PURPOSE -->
                      <td style="padding: 12px 14px; vertical-align: top;">
                        <div style="font-size: 0.76rem; color: #475569; line-height: 1.35; max-width: 220px;">
                          ${esc(item.purpose || '-')}
                        </div>
                      </td>

                      <!-- 5. QUANTITY & SALDO -->
                      <td style="padding: 12px 14px; vertical-align: top; text-align: right; white-space: nowrap;">
                        <div style="font-weight: 800; color: #0F172A; font-size: 0.84rem;">
                          ${Number(item.quantityIssue).toLocaleString('id-ID')} <span style="font-size: 0.7rem; font-weight: 600; color: #0369A1;">${esc(item.uom)}</span>
                        </div>
                        <div style="font-size: 0.7rem; color: #059669; font-weight: 600; margin-top: 2px;">
                          Sisa: ${Number(item.remainingQuantity).toLocaleString('id-ID')} ${esc(item.uom)}
                        </div>
                      </td>

                      <!-- 6. STATUS -->
                      <td style="padding: 12px 14px; vertical-align: top; text-align: center; white-space: nowrap;">
                        <span style="display: inline-block; padding: 3px 8px; ${statusInfo.style} font-weight: 700; border-radius: 6px; font-size: 0.68rem; white-space: nowrap;">
                          ${esc(statusInfo.label)}
                        </span>
                      </td>

                      <!-- 7. AKSI -->
                      <td style="padding: 12px 14px; vertical-align: top; text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-detail-issue" data-no-issue="${esc(doc.noIssue)}" style="background: #116834; color: #FFFFFF; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; box-shadow: 0 1px 2px rgba(17,104,52,0.2); white-space: nowrap;">
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
    `;
  }

  // --- DETAIL ISSUE MODAL DIALOG ---
  function showIssueDetailModal(noIssue) {
    const doc = getIssueByNoIssue(noIssue);
    if (!doc) return;

    const item = doc.items?.[0] || {};
    const usedQty = getIssueUsedQuantity(doc.id);
    const remQty = getIssueRemainingQuantity(doc.id);
    const status = getIssueStatus(doc.id);
    const statusInfo = formatStatusBadge(status);

    const modalBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B;">
        
        <!-- SECTION 1: ITEM / MATERIAL (PRIMARY IDENTITY) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="font-size: 0.7rem; font-weight: 700; color: #242731ff; text-transform: uppercase; letter-spacing: 0.5px;">Ringkasan Material</div>
            <span style="display: inline-block; padding: 2px 7px; background: #E0F2FE; color: #1d272dff; font-weight: 700; border-radius: 4px; font-size: 0.72rem;">
              UOM: ${esc(item.uom || '-')}
            </span>
          </div>
          
          <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; line-height: 1.35; margin-bottom: 6px;">
            ${esc(item.itemName || '-')}
          </div>

          <div style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-family: monospace; font-size: 0.78rem; font-weight: 700; color: #0F172A;">
            Item Code: ${esc(item.itemCode || '-')}
          </div>
        </div>

        <!-- SECTION 2: ISSUE INFORMATION -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">DOKUMEN ISSUE GUDANG</div>
            <span style="display: inline-block; padding: 3px 8px; ${statusInfo.style} font-weight: 700; border-radius: 6px; font-size: 0.7rem;">
              ${esc(statusInfo.label)}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; font-size: 0.78rem;">
            <div>
              <span style="color: #64748B; display: block; font-size: 0.7rem;">No Issue:</span>
              <strong style="font-family: monospace; color: #0F172A; font-size: 0.85rem;">${esc(doc.noIssue)}</strong>
            </div>
            <div>
              <span style="color: #64748B; display: block; font-size: 0.7rem;">Tanggal Posting:</span>
              <strong style="color: #0F172A;">${esc(doc.tanggal)}</strong>
            </div>
          </div>
        </div>

        <!-- SECTION 3: ALOKASI BIAYA & PURPOSE -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
          <div style="font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">ALOKASI BIAYA</div>
          
          <div style="margin-bottom: 8px;">
            <span style="color: #64748B; display: block; font-size: 0.7rem;">Alokasi Biaya Issue:</span>
            <strong style="color: #1E293B; font-size: 0.82rem;">${esc(doc.kodeAlokasi)} — ${esc(doc.namaAlokasi)}</strong>
          </div>

          <div>
            <span style="color: #64748B; display: block; font-size: 0.7rem;">Keterangan Penggunaan:</span>
            <div style="font-size: 0.8rem; color: #334155; margin-top: 2px; line-height: 1.4; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 6px 10px; border-radius: 6px;">
              ${esc(item.purpose || 'Tidak ada keterangan peruntukan')}
            </div>
          </div>
        </div>

        <!-- SECTION 4: QUANTITY & SALDO ISSUE -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">QUANTITY & SALDO ISSUE</div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 4px;">
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 600;">Kuantitas Issue</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin-top: 3px;">
                ${Number(item.quantityIssue).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #0369A1;">${esc(item.uom)}</div>
            </div>

            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 4px;">
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 600;">Sudah Digunakan</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #64748B; margin-top: 3px;">
                ${Number(usedQty).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #64748B;">${esc(item.uom)}</div>
            </div>

            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 10px 4px;">
              <div style="font-size: 0.68rem; color: #065F46; font-weight: 600;">Belum Digunakan</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #047857; margin-top: 3px;">
                ${Number(remQty).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #047857;">${esc(item.uom)}</div>
            </div>
          </div>
        </div>

      </div>
    `;

    openModal({
      title: `Detail Dokumen Issue`,
      body: modalBody,
      footer: `
        <button id="modal-btn-close-detail" type="button" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer;">
          Tutup
        </button>
      `
    });

    document.getElementById('modal-btn-close-detail')?.addEventListener('click', closeModal);
  }

  // --- EVENT LISTENERS ---
  function attachEventListeners() {
    // Back button
    document.getElementById('mat-btn-back')?.addEventListener('click', () => {
      navigate('/home');
    });

    // Sync / Refresh button
    document.getElementById('mat-btn-sync')?.addEventListener('click', () => {
      const svg = document.getElementById('mat-sync-svg');
      if (svg) {
        svg.style.transition = 'transform 0.5s ease';
        svg.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          renderView();
        }, 300);
      } else {
        renderView();
      }
    });

    // Tab buttons
    document.getElementById('tab-btn-master')?.addEventListener('click', () => {
      activeTab = 'master';
      renderView();
    });

    document.getElementById('tab-btn-issue')?.addEventListener('click', () => {
      activeTab = 'issue';
      renderView();
    });

    // Master search & filter
    document.getElementById('input-master-search')?.addEventListener('input', (e) => {
      state.masterSearch = e.target.value;
      renderView();
    });

    document.getElementById('select-master-uom')?.addEventListener('change', (e) => {
      state.masterUomFilter = e.target.value;
      renderView();
    });

    document.getElementById('select-master-status')?.addEventListener('change', (e) => {
      state.masterStatusFilter = e.target.value;
      renderView();
    });

    // Issue search & filter
    document.getElementById('input-issue-search')?.addEventListener('input', (e) => {
      state.issueSearch = e.target.value;
      renderView();
    });

    document.getElementById('select-issue-alokasi')?.addEventListener('change', (e) => {
      state.issueAlokasiFilter = e.target.value;
      renderView();
    });

    document.getElementById('select-issue-status')?.addEventListener('change', (e) => {
      state.issueStatusFilter = e.target.value;
      renderView();
    });

    // Clear material filter
    document.getElementById('btn-clear-material-filter')?.addEventListener('click', () => {
      state.selectedMaterialCode = null;
      renderView();
    });

    // Master row click -> View issues for that material
    document.querySelectorAll('.btn-view-issues').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemCode = e.currentTarget.getAttribute('data-item-code');
        state.selectedMaterialCode = itemCode;
        activeTab = 'issue';
        renderView();
      });
    });

    // Issue row click -> Open detail modal
    document.querySelectorAll('.btn-detail-issue').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const noIssue = e.currentTarget.getAttribute('data-no-issue');
        showIssueDetailModal(noIssue);
      });
    });
  }

  renderView();
}
