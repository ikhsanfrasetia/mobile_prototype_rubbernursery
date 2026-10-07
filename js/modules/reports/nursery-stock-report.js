/**
 * js/modules/reports/nursery-stock-report.js
 * Dedicated Renderer untuk Halaman Laporan Stok Bibit (Role ASISTEN_BIBITAN)
 * Route: /#/reports/stock
 */

import { navigate } from '../../core/router.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { openModal, closeModal } from '../../components/modal.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { renderAsbBottomNav, attachAsbBottomNavEvents } from '../../components/bottom-nav-asb.js';
import { getMockBatchesForUser } from '../../data/mock-nursery-stock-report.js';

let selectedProgram = 'ALL';
let selectedStage = 'ALL';

/**
 * Helper menghitung umur bibit dalam satuan Minggu dari tanggal semai.
 * @param {string} dateStr - Tanggal format YYYY-MM-DD
 * @returns {number} Umur dalam minggu
 */
export function calculateAgeInWeeks(dateStr) {
  if (!dateStr) return 0;
  const semaiDate = new Date(dateStr);
  // Gunakan baseline tanggal aktif simulasi 2026-10-07 atau waktu saat ini
  const refDate = new Date('2026-10-07T00:00:00.000Z');
  const diffTime = Math.max(0, refDate.getTime() - semaiDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/**
 * Helper menghitung persentase seleksi bulat.
 * @param {number} afkirQty
 * @param {number} initialQty
 * @returns {number} Persentase bulat (0-100)
 */
export function calculateSelectionPercentage(afkirQty, initialQty) {
  if (!initialQty || initialQty <= 0) return 0;
  const pct = (afkirQty / initialQty) * 100;
  return Math.round(pct);
}

/**
 * Helper format tanggal ke DD/MM/YYYY
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (_) {
    return dateStr;
  }
}

/**
 * Membuka Modal Detail Batch
 * @param {Object} batch
 */
export function openBatchDetailModal(batch) {
  if (!batch) return;

  const ageWeeks = calculateAgeInWeeks(batch.tanggalSemai);
  const totalSeleksi = (batch.selectionRecords || []).reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
  const seleksiPct = calculateSelectionPercentage(totalSeleksi, batch.initialQty);
  const isAPM = batch.growthStage === 'Rubber Advance Planting Material';
  const hasShi = Array.isArray(batch.pengeluaranShi) && batch.pengeluaranShi.length > 0;
  const totalPengeluaranShi = (batch.pengeluaranShi || []).reduce(
    (total, tx) => total + Number(tx.qty || 0),
    0
  );

  const PRE_GRAFT_STAGES = [
    'SELEKSI_PRA_SEMAI',
    'SELEKSI_DITOLAK_PINDAH_SEMAI',
    'SELEKSI_PRA_OKULASI_I',
    'SELEKSI_PRA_OKULASI_II',
    'SELEKSI_PRA_OKULASI_III'
  ];
  const preGraftAfkir = (batch.selectionRecords || [])
    .filter(r => PRE_GRAFT_STAGES.includes(r.stage))
    .reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
  const graftingInput = batch.initialQty - preGraftAfkir;

  const graftRec = (batch.selectionRecords || []).find(r => r.stage === 'SELEKSI_GRAFTING');
  const graftAfkir = graftRec ? Number(graftRec.qtyAfkir || 0) : 0;
  const berhasilGrafting = Math.max(0, graftingInput - graftAfkir);

  const regraftingInput = Number(batch.jumlahRegrafting || 0);
  const regraftRec = (batch.selectionRecords || []).find(r => r.stage === 'SELEKSI_REGRAFTING');
  const regraftAfkir = regraftRec ? Number(regraftRec.qtyAfkir || 0) : 0;
  const berhasilRegrafting = regraftingInput > 0 ? Math.max(0, regraftingInput - regraftAfkir) : 0;

  const formatStagePercentage = (qtyAfkir, baseQty) => {
    if (!baseQty || baseQty <= 0) return '0%';
    const rawPct = (Number(qtyAfkir || 0) / Number(baseQty)) * 100;
    const rounded = Math.round(rawPct * 10) / 10;
    const formattedStr = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace('.', ',');
    return `${formattedStr}%`;
  };

  const STAGES_DEF = [
    { key: 'SELEKSI_PRA_SEMAI', label: 'Seleksi Pra-Semai (Deder)' },
    { key: 'SELEKSI_DITOLAK_PINDAH_SEMAI', label: 'Seleksi Ditolak Pindah Semai' },
    { key: 'SELEKSI_PRA_OKULASI_I', label: 'Seleksi I – Pra-Okulasi' },
    { key: 'SELEKSI_PRA_OKULASI_II', label: 'Seleksi II – Pra-Okulasi' },
    { key: 'SELEKSI_PRA_OKULASI_III', label: 'Seleksi III – Pra-Okulasi' },
    { key: 'SELEKSI_GRAFTING', label: 'Seleksi Grafting' },
    { key: 'SELEKSI_REGRAFTING', label: 'Seleksi Regrafting' }
  ];

  const modalContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 0.80rem; color: #1E293B;">
      
      <!-- SUBHEADER BATCH -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.10rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em;">${batch.batchCode}</span>
          <span style="display: inline-block; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${isAPM ? '#EFF6FF' : '#F8FAFC'}; color: ${isAPM ? '#1E40AF' : '#475569'}; border: 1px solid ${isAPM ? '#DBEAFE' : '#E2E8F0'};">
            ${isAPM ? 'APM' : 'Main Nursery'}
          </span>
        </div>
        <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${batch.status === 'AVAILABLE' ? '#DCFCE7' : '#FEE2E2'}; color: ${batch.status === 'AVAILABLE' ? '#166534' : '#DC2626'}; border: 1px solid ${batch.status === 'AVAILABLE' ? '#BBF7D0' : '#FECACA'};">
          ${batch.status === 'AVAILABLE' ? 'TERSEDIA' : 'KOSONG'}
        </span>
      </div>

      <!-- 1. IDENTITAS BATCH -->
      <div style="margin-bottom: 12px;">
        <div style="background: #F1F5F9; border-radius: 4px; padding: 5px 8px; font-size: 0.68rem; font-weight: 800; color: #1E293B; letter-spacing: 0.02em; margin-bottom: 8px; text-transform: uppercase;">
          I. Identitas Batch
        </div>
        <div style="display: grid; grid-template-columns: 145px 12px 1fr; row-gap: 5px; font-size: 0.75rem; padding: 0 4px;">
          <span style="color: #64748B;">Program Pembibitan</span><span style="color: #64748B;">:</span><strong style="color: #0F172A; word-break: break-word;">${batch.programName}</strong>
          <span style="color: #64748B;">Kebun & Divisi</span><span style="color: #64748B;">:</span><strong style="color: #0F172A; word-break: break-word;">${batch.estateName} - ${batch.divisionName}</strong>
          <span style="color: #64748B;">Tahapan Pertumbuhan</span><span style="color: #64748B;">:</span><strong style="color: #0F172A; word-break: break-word;">${batch.growthStage}</strong>
          <span style="color: #64748B;">Asal Bibit</span><span style="color: #64748B;">:</span><strong style="color: #0F172A; word-break: break-word;">${batch.asalBibit || '-'}</strong>
          <span style="color: #64748B;">Bedengan</span><span style="color: #64748B;">:</span><strong style="color: #0F172A; word-break: break-word;">${batch.bedengan}</strong>
        </div>
      </div>

      <!-- 2. UMUR BIBIT -->
      <div style="margin-bottom: 12px;">
        <div style="background: #F1F5F9; border-radius: 4px; padding: 5px 8px; font-size: 0.68rem; font-weight: 800; color: #1E293B; letter-spacing: 0.02em; margin-bottom: 8px; text-transform: uppercase;">
          II. Umur Bibit
        </div>
        <div style="display: grid; grid-template-columns: 145px 12px 1fr; row-gap: 5px; font-size: 0.75rem; padding: 0 4px;">
          <span style="color: #64748B;">Tanggal Semai</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${formatDisplayDate(batch.tanggalSemai)}</strong>
          <span style="color: #64748B;">Umur Bibit</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${ageWeeks} Minggu</strong>
        </div>
      </div>

      <!-- 3. POPULASI & PROSES -->
      <div style="margin-bottom: 12px;">
        <div style="background: #F1F5F9; border-radius: 4px; padding: 5px 8px; font-size: 0.68rem; font-weight: 800; color: #1E293B; letter-spacing: 0.02em; margin-bottom: 8px; text-transform: uppercase;">
          III. Populasi & Proses
        </div>
        <div style="display: grid; grid-template-columns: 210px 12px 1fr; row-gap: 5px; font-size: 0.75rem; padding: 0 4px;">
          <span style="color: #64748B;">Stok Awal Semai</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${batch.initialQty.toLocaleString('id-ID')} Bibit</strong>
          <span style="color: #64748B;">Berhasil Diokulasi (Grafting)</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${berhasilGrafting.toLocaleString('id-ID')} Bibit</strong>
          <span style="color: #64748B;">Berhasil Diokulasi Ulang (Regrafting)</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${berhasilRegrafting.toLocaleString('id-ID')} Bibit</strong>
          <span style="color: #64748B;">Total Seleksi</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${totalSeleksi.toLocaleString('id-ID')} Bibit</strong>
          <span style="color: #64748B;">Persentase Seleksi (%)</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${seleksiPct}%</strong>
        </div>
        <div style="border-top: 1px dashed #E2E8F0; margin: 6px 0;"></div>
        <div style="display: grid; grid-template-columns: 210px 12px 1fr; row-gap: 5px; font-size: 0.75rem; padding: 0 4px;">
          <span style="color: #64748B;">Stok Tersedia (SHI)</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${batch.availableQty.toLocaleString('id-ID')} Bibit</strong>
        </div>
      </div>

      <!-- 4. RIWAYAT TAHAPAN SELEKSI BIBIT -->
      <div style="margin-bottom: 12px;">
        <div style="background: #F1F5F9; border-radius: 4px; padding: 5px 8px; font-size: 0.68rem; font-weight: 800; color: #1E293B; letter-spacing: 0.02em; margin-bottom: 8px; text-transform: uppercase;">
          IV. Riwayat Tahapan Seleksi Bibit
        </div>
        <div style="display: flex; flex-direction: column; gap: 0;">
          ${STAGES_DEF.map(s => {
            const rec = (batch.selectionRecords || []).find(r => r.stage === s.key);
            const qty = rec ? rec.qtyAfkir : 0;
            const baseQty = rec ? rec.baseQty : 0;
            const pct = rec ? formatStagePercentage(rec.qtyAfkir, rec.baseQty) : '0%';
            const tanggal = rec ? formatDisplayDate(rec.tanggal) : '-';

            return `
              <div class="stage-accordion-item" style="border-bottom: 1px solid #F1F5F9; padding: 8px 4px;">
                <div class="stage-toggle-row" data-stage="${s.key}" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #0F172A;">${s.label}</span>
                  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <strong style="font-size: 0.75rem; font-weight: 700; color: #0F172A;">${qty.toLocaleString('id-ID')} Bibit • ${pct}</strong>
                    <span class="stage-arrow" style="font-size: 0.75rem; font-weight: 700; color: #64748B; font-family: monospace; display: inline-block; width: 10px; text-align: right;">&gt;</span>
                  </div>
                </div>
                <div class="stage-detail-panel" style="display: none; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-top: 6px; font-size: 0.73rem;">
                  <div style="display: grid; grid-template-columns: 110px 10px 1fr; row-gap: 4px; color: #64748B;">
                    <span>Tanggal Seleksi</span><span>:</span><strong style="color: #0F172A;">${tanggal}</strong>
                    <span>Stok Sebelum</span><span>:</span><strong style="color: #0F172A;">${baseQty.toLocaleString('id-ID')} Bibit</strong>
                    <span>Jumlah Seleksi</span><span>:</span><strong style="color: #0F172A;">${qty.toLocaleString('id-ID')} Bibit</strong>
                    <span>Persentase</span><span>:</span><strong style="color: #0F172A;">${pct}</strong>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 5. PENGELUARAN BIBIT SHI -->
      <div style="margin-bottom: 12px;">
        <div style="background: #F1F5F9; border-radius: 4px; padding: 5px 8px; font-size: 0.68rem; font-weight: 800; color: #1E293B; letter-spacing: 0.02em; margin-bottom: 8px; text-transform: uppercase;">
          V. Pengeluaran Bibit SHI
        </div>
        ${hasShi ? `
          <div style="display: flex; flex-direction: column; gap: 8px; padding: 0 4px;">
            <div style="display: grid; grid-template-columns: 180px 12px 1fr; font-size: 0.75rem;">
              <span style="color: #64748B;">Total Pengeluaran Bibit (SHI)</span><span style="color: #64748B;">:</span><strong style="color: #0F172A;">${totalPengeluaranShi.toLocaleString('id-ID')} Bibit</strong>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${batch.pengeluaranShi.map(tx => `
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 7px 9px; display: flex; flex-direction: column; gap: 3px;">
                  <div style="font-weight: 800; color: #0F172A; font-size: 0.75rem; margin-bottom: 2px;">${tx.docNo}</div>
                  <div style="display: grid; grid-template-columns: 120px 10px 1fr; row-gap: 3px; font-size: 0.73rem; color: #64748B;">
                    <span>Tanggal</span><span>:</span><strong style="color: #0F172A;">${formatDisplayDate(tx.tanggal)}</strong>
                    <span>Divisi & Blok</span><span>:</span><strong style="color: #0F172A; word-break: break-word;">${tx.divisi} - ${tx.block}</strong>
                    <span>Jumlah Pengeluaran</span><span>:</span><strong style="color: #0F172A;">${Number(tx.qty || 0).toLocaleString('id-ID')} Bibit</strong>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div style="font-size: 0.74rem; color: #64748B; padding: 4px;">
            Belum ada riwayat pengeluaran bibit SHI (0 Bibit)
          </div>
        `}
      </div>

    </div>
  `;

  openModal({
    title: `Detail ${batch.batchCode}`,
    body: modalContent,
    footer: `
      <div style="width: 100%;">
        <button type="button" id="btn-modal-back" style="width: 100%; background: #116834; border: none; color: #FFFFFF; font-weight: 700; font-size: 0.84rem; height: 38px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          Kembali
        </button>
      </div>
    `
  });

  // Attach event handlers for modal actions
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) {
    // 1. Tombol Kembali
    const backBtn = modalRoot.querySelector('#btn-modal-back');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }

    // 2. Expand/Collapse 7 stages
    modalRoot.querySelectorAll('.stage-toggle-row').forEach(row => {
      row.addEventListener('click', () => {
        const detail = row.nextElementSibling;
        const arrow = row.querySelector('.stage-arrow');
        if (!detail) return;
        const isCollapsed = detail.style.display === 'none';
        detail.style.display = isCollapsed ? 'block' : 'none';
        if (arrow) {
          arrow.innerHTML = isCollapsed ? '&#8964;' : '&gt;'; // ⌄ or >
          arrow.style.fontSize = isCollapsed ? '0.90rem' : '0.75rem';
        }
      });
    });
  }
}

/**
 * Render Halaman Laporan Stok Bibit
 */
export function renderNurseryStockReport() {
  const app = document.getElementById('main-content') || document.getElementById('app');
  if (!app) return;

  // 1. STEP 1: Strict User Context Scope Filtering (Mandatory estateId & divisionId matching)
  const user = getCurrentUserContext() || { estateId: 'EST-TBS', divisionId: 'DIV-001', name: 'Annisa' };
  const scopedBatches = getMockBatchesForUser(user);

  // 2. Extract Available Programs from scoped batches
  const programSet = new Set();
  scopedBatches.forEach(b => { if (b.programName) programSet.add(b.programName); });
  const availablePrograms = Array.from(programSet);

  // 3. STEP 2 & 3: Filter Program & Growth Stage
  const filteredBatches = scopedBatches.filter(b => {
    const matchProg = selectedProgram === 'ALL' || b.programName === selectedProgram;
    const matchStage = selectedStage === 'ALL' || b.growthStage === selectedStage;
    return matchProg && matchStage;
  });

  // 4. Calculate Summary Metrics from filtered batches
  const totalStokAwal = filteredBatches.reduce((acc, b) => acc + (b.initialQty || 0), 0);
  const totalSeleksiSummary = filteredBatches.reduce((acc, b) => {
    const bTotal = (b.selectionRecords || []).reduce((sum, r) => sum + Number(r.qtyAfkir || 0), 0);
    return acc + bTotal;
  }, 0);
  const totalStokTersedia = filteredBatches.reduce((acc, b) => acc + (b.availableQty || 0), 0);

  // Render Page HTML
  app.innerHTML = `
    <div class="page nursery-stock-report-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.01em;">Laporan Stok Bibit</h1>
        </div>
      </header>

      <!-- BODY / CONTENT -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px 20px; display: flex; flex-direction: column; gap: 12px; box-sizing: border-box;">
        
        <!-- CARD SUMMARY & FILTER -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); box-sizing: border-box;">
          
          <!-- FILTER DROPDOWNS -->
          <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #F1F5F9;">
            <div style="font-size: 0.65rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
              Filter Data Laporan
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              
              <!-- FILTER 1: PROGRAM PEMBIBITAN -->
              <div style="position: relative;">
                <select id="select-stock-program" style="width: 100%; font-size: 0.72rem; font-weight: 700; color: #116834; border: 1px solid #A5D6A7; background: #E8F5E9; border-radius: 6px; padding: 6px 20px 6px 8px; outline: none; appearance: none; cursor: pointer; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; box-sizing: border-box;">
                  <option value="ALL" ${selectedProgram === 'ALL' ? 'selected' : ''}>Semua Program</option>
                  ${availablePrograms.map(p => `<option value="${p}" ${selectedProgram === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#116834" stroke-width="2.5" fill="none" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); pointer-events: none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

              <!-- FILTER 2: TAHAPAN PERTUMBUHAN -->
              <div style="position: relative;">
                <select id="select-stock-stage" style="width: 100%; font-size: 0.72rem; font-weight: 700; color: #1E40AF; border: 1px solid #BFDBFE; background: #EFF6FF; border-radius: 6px; padding: 6px 20px 6px 8px; outline: none; appearance: none; cursor: pointer; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; box-sizing: border-box;">
                  <option value="ALL" ${selectedStage === 'ALL' ? 'selected' : ''}>Semua Tahapan</option>
                  <option value="Rubber Main Nursery" ${selectedStage === 'Rubber Main Nursery' ? 'selected' : ''}>Main Nursery</option>
                  <option value="Rubber Advance Planting Material" ${selectedStage === 'Rubber Advance Planting Material' ? 'selected' : ''}>Advance Planting</option>
                </select>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#1E40AF" stroke-width="2.5" fill="none" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); pointer-events: none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>

            </div>
          </div>

          <!-- SUMMARY STRIP (3 METRIKS) -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 8px; padding: 8px 4px; text-align: center; box-sizing: border-box;">
            <div style="min-width: 0;">
              <div style="font-size: 0.58rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Stok Awal</div>
              <div style="font-size: 0.85rem; font-weight: 900; color: #1E293B; margin-top: 1px; white-space: nowrap;">
                ${totalStokAwal.toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.55rem; color: #94A3B8;">Bibit</div>
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 0.58rem; color: #DC2626; font-weight: 700; text-transform: uppercase;">Total Seleksi</div>
              <div style="font-size: 0.85rem; font-weight: 900; color: #DC2626; margin-top: 1px; white-space: nowrap;">
                (${totalSeleksiSummary.toLocaleString('id-ID')})
              </div>
              <div style="font-size: 0.55rem; color: #DC2626;">Bibit</div>
            </div>
            <div style="min-width: 0;">
              <div style="font-size: 0.58rem; color: #166534; font-weight: 800; text-transform: uppercase;">Tersedia</div>
              <div style="font-size: 0.95rem; font-weight: 900; color: #116834; margin-top: 1px; white-space: nowrap;">
                ${totalStokTersedia.toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.55rem; color: #15803D; font-weight: 700;">Bibit</div>
            </div>
          </div>

        </div>

        <!-- SECTION: DAFTAR BATCH -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 0.72rem; font-weight: 800; color: #1E293B; text-transform: uppercase; letter-spacing: 0.02em;">
              Daftar Ketersediaan Batch
            </div>
            <span style="font-size: 0.65rem; color: #116834; font-weight: 700; background: #E8F5E9; padding: 2px 7px; border-radius: 4px;">
              ${filteredBatches.length} Batch
            </span>
          </div>

          ${filteredBatches.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${filteredBatches.map((b, idx) => {
                const ageWeeks = calculateAgeInWeeks(b.tanggalSemai);
                const batchTotalSeleksi = (b.selectionRecords || []).reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
                const seleksiPct = calculateSelectionPercentage(batchTotalSeleksi, b.initialQty);
                const isAPM = b.growthStage === 'Rubber Advance Planting Material';
                const isEmpty = b.status === 'EMPTY' || b.availableQty === 0;

                return `
                  <div class="card-batch-stock" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); box-sizing: border-box;">
                    
                    <!-- BARIS 1: NAMA BATCH & BADGES -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-weight: 800; font-size: 0.96rem; color: #111827; letter-spacing: -0.01em;">${b.batchCode}</span>
                        <span style="font-size: 0.60rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: ${isAPM ? '#EFF6FF' : '#FAF5FF'}; color: ${isAPM ? '#1E40AF' : '#6B21A8'}; border: 1px solid ${isAPM ? '#BFDBFE' : '#E9D5FF'};">
                          ${isAPM ? 'APM' : 'Main Nursery'}
                        </span>
                      </div>
                      <div style="font-size: 0.65rem; font-weight: 700; color: #4B5563; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 4px; padding: 2px 7px;">
                        ${b.bedengan}
                      </div>
                    </div>

                    <!-- BARIS 2: UMUR BIBIT & KLON -->
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem; color: #64748B; margin-bottom: 8px;">
                      <div>
                        Umur: <strong style="color: #166534;">${ageWeeks} Minggu</strong> • Klon: <strong style="color: #334155;">${b.entresClone} / ${b.rootstockClone}</strong>
                      </div>
                      <div>
                        Seleksi: <strong style="color: #DC2626;">${seleksiPct}%</strong>
                      </div>
                    </div>

                    <!-- BARIS 3: STRIP STOK TERSEDIA -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: ${isEmpty ? '#FEF2F2' : '#F0FDF4'}; border: 1px solid ${isEmpty ? '#FEE2E2' : '#DCFCE7'}; border-radius: 6px; padding: 7px 10px; margin-bottom: 8px;">
                      <span style="font-size: 0.65rem; font-weight: 700; color: ${isEmpty ? '#991B1B' : '#166534'}; text-transform: uppercase; letter-spacing: 0.02em;">
                        ${isEmpty ? 'Stok Kosong' : 'Stok Tersedia'}
                      </span>
                      <div style="display: flex; align-items: baseline; gap: 3px;">
                        <span style="font-size: 1.10rem; font-weight: 900; color: ${isEmpty ? '#DC2626' : '#116834'};">
                          ${b.availableQty.toLocaleString('id-ID')}
                        </span>
                        <span style="font-size: 0.68rem; font-weight: 700; color: ${isEmpty ? '#DC2626' : '#15803D'};">Bibit</span>
                      </div>
                    </div>

                    <!-- BARIS 4: ACTION BUTTON DETAIL -->
                    <button type="button" class="btn-batch-detail" data-index="${idx}" style="width: 100%; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; height: 32px; font-size: 0.72rem; font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer;">
                      <span>Lihat Rincian Lengkap</span>
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>

                  </div>
                `;
              }).join('')}
            </div>
          ` : renderEmptyStateCard({
            title: 'Tidak Ada Data Batch',
            description: 'Tidak ada data stok batch yang sesuai dengan kriteria filter.',
            customStyle: 'margin-top: 14px;'
          })}
        </div>

      </main>

      <!-- BOTTOM NAVIGATION -->
      ${renderAsbBottomNav('laporan')}

    </div>
  `;

  // Event Listeners: Back Button
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/reports');
  });

  // Filter Program
  const programSelect = app.querySelector('#select-stock-program');
  if (programSelect) {
    programSelect.addEventListener('change', (e) => {
      selectedProgram = e.target.value;
      renderNurseryStockReport();
    });
  }

  // Filter Stage
  const stageSelect = app.querySelector('#select-stock-stage');
  if (stageSelect) {
    stageSelect.addEventListener('change', (e) => {
      selectedStage = e.target.value;
      renderNurseryStockReport();
    });
  }

  // Detail Buttons
  app.querySelectorAll('.btn-batch-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      if (!isNaN(idx) && filteredBatches[idx]) {
        openBatchDetailModal(filteredBatches[idx]);
      }
    });
  });

  // Attach Bottom Nav Events
  attachAsbBottomNavEvents(app);
}
