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
  const seleksiPct = calculateSelectionPercentage(batch.jumlahAfkirSeleksi, batch.initialQty);
  const isAPM = batch.growthStage === 'Rubber Advance Planting Material';
  const hasShi = Array.isArray(batch.pengeluaranShi) && batch.pengeluaranShi.length > 0;
  const totalPengeluaran = (batch.pengeluaranShi || []).reduce((acc, tx) => acc + (tx.qty || 0), 0);

  const modalContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 0.82rem; color: #1F2937;">
      
      <!-- HEADER BADGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB;">
        <div>
          <span style="font-size: 1.05rem; font-weight: 800; color: #111827;">${batch.batchCode}</span>
          <span style="display: inline-block; margin-left: 8px; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${isAPM ? '#EFF6FF' : '#FAF5FF'}; color: ${isAPM ? '#1E40AF' : '#6B21A8'}; border: 1px solid ${isAPM ? '#BFDBFE' : '#E9D5FF'};">
            ${isAPM ? 'APM' : 'Main Nursery'}
          </span>
        </div>
        <span style="font-size: 0.70rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${batch.status === 'AVAILABLE' ? '#DCFCE7' : '#FEE2E2'}; color: ${batch.status === 'AVAILABLE' ? '#166534' : '#991B1B'};">
          ${batch.status === 'AVAILABLE' ? 'TERSEDIA' : 'KOSONG'}
        </span>
      </div>

      <!-- 1. IDENTITAS -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 0.65rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
          I. Identitas Batch
        </div>
        <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Program Pembibitan:</span><strong style="color: #111827; text-align: right;">${batch.programName}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Kebun & Divisi:</span><strong style="color: #111827;">${batch.estateName} · ${batch.divisionName}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Tahapan Pertumbuhan:</span><strong style="color: #111827;">${batch.growthStage}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Bedengan:</span><strong style="color: #111827;">${batch.bedengan}</strong></div>
        </div>
      </div>

      <!-- 2. UMUR BIBIT -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 0.65rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
          II. Umur Bibit
        </div>
        <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Tanggal Semai:</span><strong style="color: #111827;">${formatDisplayDate(batch.tanggalSemai)}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Umur Bibit:</span><strong style="color: #166534; font-size: 0.88rem;">${ageWeeks} Minggu</strong></div>
        </div>
      </div>

      <!-- 3. POPULASI & PROSES -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 0.65rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
          III. Populasi & Proses
        </div>
        <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Stok Awal Semai:</span><strong style="color: #111827;">${batch.initialQty.toLocaleString('id-ID')} Bibit</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Okulasi (Grafting):</span><strong style="color: #116834;">${batch.jumlahGrafting.toLocaleString('id-ID')} Bibit</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Okulasi Ulang (Regrafting):</span><strong style="color: #92400E;">${batch.jumlahRegrafting.toLocaleString('id-ID')} Bibit</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Total Afkir / Seleksi:</span><strong style="color: #DC2626;">(${batch.jumlahAfkirSeleksi.toLocaleString('id-ID')}) Bibit</strong></div>
          <div style="display: flex; justify-content: space-between; padding-top: 3px; border-top: 1px dashed #E5E7EB;"><span style="color: #6B7280;">Persentase Seleksi (%):</span><strong style="color: #DC2626; font-size: 0.86rem;">${seleksiPct}%</strong></div>
        </div>
      </div>

      <!-- 4. STOK TERSEDIA -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 0.65rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
          IV. Posisi Stok Aktual
        </div>
        <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: #166534; font-size: 0.75rem;">Stok Tersedia:</span>
          <strong style="font-size: 1.15rem; font-weight: 900; color: #116834;">${batch.availableQty.toLocaleString('id-ID')} Bibit</strong>
        </div>
      </div>

      <!-- 5. PENGELUARAN BIBIT SHI -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 0.65rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
          V. Pengeluaran Bibit SHI
        </div>
        ${hasShi ? `
          <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px; border-bottom: 1px dashed #E5E7EB;">
              <span style="color: #6B7280; font-size: 0.72rem; font-weight: 600;">Total Pengeluaran SHI:</span>
              <strong style="color: #0369A1; font-size: 0.85rem; font-weight: 800;">${totalPengeluaran.toLocaleString('id-ID')} Bibit</strong>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
              ${batch.pengeluaranShi.map(tx => `
                <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 7px 9px; display: flex; flex-direction: column; gap: 3px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #111827; font-size: 0.76rem;">${tx.docNo}</strong>
                    <span style="color: #6B7280; font-size: 0.68rem; font-weight: 600;">${formatDisplayDate(tx.tanggal)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;">
                    <span style="color: #4B5563;">${tx.divisi} · <strong style="color: #1E293B;">${tx.block}</strong></span>
                    <strong style="color: #0369A1; font-weight: 800;">${tx.qty.toLocaleString('id-ID')} Bibit</strong>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6B7280; font-size: 0.72rem;">Belum ada riwayat pengeluaran bibit SHI</span>
            <strong style="color: #6B7280; font-size: 0.78rem;">0 Bibit</strong>
          </div>
        `}
      </div>

      <!-- 6. KOMPOSISI KLON -->
      <div>
        <div style="font-size: 0.65rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
          VI. Komposisi Klon
        </div>
        <div style="background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Klon Batang Bawah (Rootstock):</span><strong style="color: #111827;">${batch.rootstockClone}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #6B7280;">Klon Entres (Mata):</span><strong style="color: #111827;">${batch.entresClone}</strong></div>
        </div>
      </div>

    </div>
  `;

  openModal({
    title: `Detail ${batch.batchCode}`,
    body: modalContent,
    footer: `
      <div style="display: flex; justify-content: flex-end; width: 100%;">
        <button type="button" class="btn btn-secondary" data-modal-close style="padding: 6px 18px; font-weight: 700; font-size: 0.78rem; border-radius: 6px; cursor: pointer;">
          Tutup
        </button>
      </div>
    `
  });
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
  const totalAfkir = filteredBatches.reduce((acc, b) => acc + (b.jumlahAfkirSeleksi || 0), 0);
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
        <div style="font-size: 0.68rem; font-weight: 700; color: #116834; background: #E8F5E9; padding: 3px 8px; border-radius: 4px;">
          ${user.estateId || 'EST'} · ${user.divisionId || 'DIV'}
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
              <div style="font-size: 0.58rem; color: #DC2626; font-weight: 700; text-transform: uppercase;">Total Afkir</div>
              <div style="font-size: 0.85rem; font-weight: 900; color: #DC2626; margin-top: 1px; white-space: nowrap;">
                (${totalAfkir.toLocaleString('id-ID')})
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
                const seleksiPct = calculateSelectionPercentage(b.jumlahAfkirSeleksi, b.initialQty);
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
