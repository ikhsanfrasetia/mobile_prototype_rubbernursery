import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, formatStandardDocNo, generateUniqueDocNo } from '../../core/utils.js';
import { getActiveKlons, normalizeKlonName } from '../../data/klon-master.js';
import { getActiveBatches, getBatchById, getBatchByCode } from '../../data/batch-master.js';
import { getActiveBedengan, getBedenganById, getBedenganByCode } from '../../data/bedengan-master.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { integrateSeedingToSelectionPool } from '../selection/selection-manager.js';
import { getEligiblePindahSemaiSources, calculateRemainingIssueBalance } from './dederan-pindah-semai-adapter.js';
import { toast } from '../../components/toast.js';

export function renderSeedingForm() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const userCtx = getCurrentUserContext();
  const today = formatDate(new Date().toISOString());

  // Get source transaction (from Dederan adapter first, or receipt fallback)
  const sourceIdx = storage.get('seeding_source_index', null);
  const eligibleSources = getEligiblePindahSemaiSources();
  let sourceTx = eligibleSources.find(s =>
    s.sourceIndex == sourceIdx ||
    s.sourceDederTxId == sourceIdx ||
    s.docNo == sourceIdx ||
    s.dederanTxDocNo == sourceIdx
  );
  if (!sourceTx) {
    const txs = storage.get('receipt_transactions', []);
    sourceTx = txs[sourceIdx] || eligibleSources[0] || {};
  }
  const sourceDocNo = sourceTx.docNo || sourceTx.nomorDokumen || formatStandardDocNo(2026, 'APR', (parseInt(sourceIdx || 0) + 1));

  // Context Scoping
  const effectiveEstateId = sourceTx.estateId || userCtx?.estateId || 'EST-TBS';
  const effectiveDivisionId = sourceTx.divisionId || userCtx?.divisionId || (effectiveEstateId === 'EST-APM' ? 'DIV-APM-02' : 'DIV-001');
  const effectiveProgramId = sourceTx.programId || sourceTx.rawState?.programNurseryId || null;
  const effectiveProgramCode = sourceTx.program || sourceTx.rawState?.programNurseryCode || 'PRG/NUR/01/2026';

  // Check if we are in Edit mode
  const editIdx = storage.get('editing_seeding_index', null);
  const seedingTxs = storage.get('seeding_transactions', []);
  const editTx = editIdx !== null ? seedingTxs[editIdx] : null;

  // Candidate Master Batches (Scoped)
  const availableBatches = getActiveBatches({
    estateId: effectiveEstateId,
    divisionId: effectiveDivisionId,
    programId: effectiveProgramId || undefined
  });
  const finalBatchList = availableBatches.length > 0 ? availableBatches : getActiveBatches({ estateId: effectiveEstateId });

  // Candidate Master Bedengan (Scoped)
  const availableBedengan = getActiveBedengan({
    estateId: effectiveEstateId,
    divisionId: effectiveDivisionId,
    programId: effectiveProgramId || undefined
  });
  const finalBedenganList = availableBedengan.length > 0 ? availableBedengan : getActiveBedengan({ estateId: effectiveEstateId });

  // Scanned Bedengan from QR or Manual
  const scannedBedenganId = storage.get('scanned_bedengan_id', null);
  const scannedBedenganName = storage.get('scanned_bedengan_name', storage.get('scanned_bedengan', null));
  const initialBedObj = (scannedBedenganId ? getBedenganById(scannedBedenganId) : null) ||
    (scannedBedenganName ? (getBedenganByCode(scannedBedenganName) || finalBedenganList.find(b => b.name === scannedBedenganName)) : null) ||
    finalBedenganList[0] ||
    null;

  // Batch determination
  let defaultBatchId = null;
  let defaultBatchCode = null;
  if (editTx && (editTx.batchId || editTx.batchNo)) {
    const b = getBatchById(editTx.batchId) || getBatchByCode(editTx.batchNo);
    defaultBatchId = b ? b.id : editTx.batchId;
    defaultBatchCode = b ? b.batchCode : editTx.batchNo;
  } else if (sourceTx.batchId || sourceTx.rawState?.batchId || sourceTx.batchCode || sourceTx.rawState?.batchCode) {
    const b = getBatchById(sourceTx.batchId || sourceTx.rawState?.batchId) || getBatchByCode(sourceTx.batchCode || sourceTx.rawState?.batchCode);
    defaultBatchId = b ? b.id : (sourceTx.batchId || sourceTx.rawState?.batchId);
    defaultBatchCode = b ? b.batchCode : (sourceTx.batchCode || sourceTx.rawState?.batchCode);
  } else if (finalBatchList.length > 0) {
    defaultBatchId = finalBatchList[0].id;
    defaultBatchCode = finalBatchList[0].batchCode;
  }

  const initialBedCode = initialBedObj ? (initialBedObj.bedenganCode || initialBedObj.name) : 'BED-001';
  const initialBedName = initialBedObj ? (initialBedObj.bedenganCode || initialBedObj.name) : 'BED-001';
  const initialBedId = initialBedObj ? initialBedObj.bedenganId : null;

  // Form state
  // CRITICAL BUSINESS RULE: 1 Transaksi = 1 Batch = 1 Bedengan (rows.length === 1)
  const initialPolybag = editTx ? (editTx.totalPolybag !== undefined ? editTx.totalPolybag : editTx.rows?.[0]?.polybag || '') : '';
  const initialDisemai = editTx ? (editTx.totalDisemai !== undefined ? editTx.totalDisemai : editTx.rows?.[0]?.disemai || '') : (initialPolybag ? Number(initialPolybag) * 2 : '');

  const state = {
    batchId: defaultBatchId,
    batchNo: defaultBatchCode,
    ditolak: editTx ? editTx.ditolak : '',
    alasanDitolak: editTx ? editTx.alasanDitolak : 'Tidak Ada',
    tableRows: [
      {
        batchId: defaultBatchId,
        batchNo: defaultBatchCode,
        bedenganId: initialBedId,
        bedenganCode: initialBedCode,
        bedengan: initialBedName,
        klon: sourceTx.klon ? normalizeKlonName(sourceTx.klon) : 'GT 1',
        disemai: initialDisemai,
        polybag: initialPolybag
      }
    ],
    photos: editTx ? JSON.parse(JSON.stringify(editTx.photos)) : []
  };

  const totalPenerimaan = parseInt(sourceTx.totalBerhasil !== undefined ? sourceTx.totalBerhasil : (sourceTx.qty || 0), 10);

  // Issue Gudang State (from Storage or Edit Mode)
  let issueDocNo = storage.get('selected_issue_doc_no', editTx ? editTx.issueDocNo : null);
  let issueItemId = storage.get('selected_issue_item_id', editTx ? editTx.issueItemId : null);
  let issueItemCode = storage.get('selected_issue_item_code', editTx ? editTx.itemCode : null);
  let issueItemName = storage.get('selected_issue_item_name', editTx ? editTx.itemName : null);
  let issueUom = storage.get('selected_issue_uom', editTx ? editTx.uom : 'LBR');

  // Clean up transient selection keys so they don't leak
  storage.remove('selected_issue_doc_no');
  storage.remove('selected_issue_item_id');
  storage.remove('selected_issue_item_code');
  storage.remove('selected_issue_item_name');
  storage.remove('selected_issue_uom');
  storage.remove('selected_issue_qty');
  storage.remove('selected_issue_remaining');

  // Calculate remaining Issue balance dynamically
  let remainingIssueQty = 0;
  if (issueDocNo && issueItemId) {
    const bal = calculateRemainingIssueBalance(issueDocNo, issueItemId, issueItemCode, editTx ? editTx.docNo : null);
    remainingIssueQty = bal.remainingQuantity;
  }

  // Calculate previous accumulations for this source document
  let accumulatedDisemai = 0;
  let accumulatedDitolak = 0;
  seedingTxs.forEach((s, idx) => {
    if (
      s.sourceIndex == sourceIdx ||
      s.sourceDederTxId == sourceIdx ||
      s.sourceDocNo === sourceDocNo ||
      (s.dederanTxDocNo && sourceTx.dederanTxDocNo && s.dederanTxDocNo === sourceTx.dederanTxDocNo)
    ) {
      if (editIdx === null || editIdx != idx) {
        accumulatedDisemai += parseInt(s.totalDisemai || 0, 10);
        accumulatedDitolak += parseInt(s.ditolak || 0, 10);
      }
    }
  });

  const previousBalance = Math.max(0, totalPenerimaan - accumulatedDisemai - accumulatedDitolak);

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 50px; padding: 0 14px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0 0 0 8px;">Pindah Semai</h1>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding-bottom: 20px;">
        
        <!-- 1. IDENTITAS TRANSAKSI -->
        <section style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.80rem; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.name}</div>
            <div style="font-size: 0.68rem; color: #6B7280;">${user.code} - ${user.position}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0; margin-left: 10px;">
            <div style="font-size: 0.66rem; color: #6B7280;">Tanggal Pindah Semai</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #111827;">${today}</div>
          </div>
        </section>

        <!-- 2. RINCIAN PENYEMAIAN -->
        <section style="padding: 12px 14px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <h2 style="font-size: 0.82rem; font-weight: 700; color: #111827; margin: 0 0 10px 0;">Rincian Penyemaian</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 2px;">Jenis Bibitan</div>
              <div style="font-size: 0.76rem; font-weight: 600; color: #111827;">Green Budding</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 2px;">Tahapan Pertumbuhan</div>
              <div style="font-size: 0.76rem; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sourceTx.tahapan || 'Rubber Main Nursery'}</div>
            </div>
          </div>
          
          <!-- Program Pembibitan -->
          <div style="margin-bottom: 8px;">
            <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 2px;">Program Pembibitan</div>
            <div style="background: #F9FAFB; height: 32px; padding: 0 8px; border-radius: 4px; border: 1px solid #E5E7EB; display: flex; align-items: center; font-size: 0.76rem; box-sizing: border-box; overflow: hidden;">
              <span style="color: #116834; font-weight: 700; white-space: nowrap;">${sourceTx.program || 'PRG/NUR/01/2026'}</span>
              <span style="color: #4B5563; margin-left: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"> - Pembibitan Karet 2026</span>
            </div>
          </div>

          <!-- No. Bedengan & No. Batch -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 2px;">No. Bedengan</div>
              <div style="height: 32px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; display: flex; align-items: center; padding: 0 8px; font-size: 0.78rem; font-weight: 700; color: #116834; box-sizing: border-box;">
                ${initialBedCode}
              </div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 2px;">No. Batch</div>
              <select id="select-batch" style="width: 100%; height: 32px; border: 1px solid #D1D5DB; border-radius: 4px; outline: none; background: #FFFFFF; font-size: 0.78rem; font-weight: 600; color: #111827; cursor: pointer; padding: 0 6px; box-sizing: border-box;">
                ${finalBatchList.map(b => `<option value="${b.id || b.batchId}" ${(state.batchId === (b.id || b.batchId) || state.batchNo === (b.batchCode || b.batchNo)) ? 'selected' : ''}>${b.batchCode || b.batchNo}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Klon Awal & Jlh Berhasil di Deder -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 2px;">Klon Awal</div>
              <div style="height: 32px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; display: flex; align-items: center; padding: 0 8px; font-size: 0.78rem; font-weight: 600; color: #111827; box-sizing: border-box;">
                ${sourceTx.klon ? normalizeKlonName(sourceTx.klon) : 'GT 1'}
              </div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 2px;">Jlh Berhasil di Deder</div>
              <div style="height: 32px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; display: flex; align-items: center; padding: 0 8px; font-size: 0.78rem; font-weight: 700; color: #111827; box-sizing: border-box;">
                ${totalPenerimaan.toLocaleString('id-ID')} Butir
              </div>
            </div>
          </div>

        </section>

        <!-- 3. DETAIL PINDAH SEMAI (EXACT ORDER: Material Gudang -> Bibit Pindah Semai -> Jlh Polybag -> Ditolak/Seleksi) -->
        <section style="padding: 12px 14px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h2 style="font-size: 0.82rem; font-weight: 700; color: #111827; margin: 0;">Detail Pindah Semai</h2>
          </div>

          <!-- Polybag / Material Gudang -->
          <div style="margin-bottom: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #475569;">Pilih Dokumen Material</div>
              <button id="btn-pilih-issue" type="button" style="background: #116834; color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 0.70rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                Pilih Material
              </button>
            </div>
            
            ${issueDocNo ? `
              <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 4px; padding: 8px; font-size: 0.74rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                  <span style="font-weight: 700; color: #1E293B;">${issueDocNo}</span>
                  <span style="color: #64748B;">${issueItemCode || ''}</span>
                </div>
                <div style="color: #475569; margin-bottom: 6px;">${issueItemName}</div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #E2E8F0; padding-top: 4px;">
                  <span style="color: #64748B;">Sisa Tersedia:</span>
                  <span style="font-weight: 700; color: #0F766E;">${remainingIssueQty.toLocaleString('id-ID')} ${issueUom}</span>
                </div>
              </div>
            ` : `
              <div style="background: #FFFBEB; border: 1px dashed #FCD34D; border-radius: 4px; padding: 8px; text-align: center; color: #B45309; font-size: 0.72rem;">
                Silakan pilih Dokumen Issue Gudang terlebih dahulu.
              </div>
            `}
          </div>

          <!-- 1. Bibit Pindah Semai (INPUT EDITABLE) -->
          <div style="margin-bottom: 10px;">
            <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 4px;">Bibit Pindah Semai</div>
            <div style="position: relative;">
              <input type="number" id="inp-disemai" value="${state.tableRows[0].disemai}" placeholder="0" min="0" ${(!issueDocNo || remainingIssueQty <= 0) ? 'disabled' : ''} style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 4px; outline: none; font-size: 0.82rem; font-weight: 700; text-align: left; background: ${(!issueDocNo || remainingIssueQty <= 0) ? '#F3F4F6' : '#FFFFFF'}; color: #111827; padding: 0 44px 0 8px; box-sizing: border-box;">
              <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.72rem; color: #6B7280; font-weight: 600;">Butir</span>
            </div>
          </div>

          <!-- 2. Jlh Polybag (INPUT EDITABLE) -->
          <div style="margin-bottom: 10px;">
            <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 4px;">Jlh Polybag</div>
            <div style="position: relative;">
              <input type="number" id="inp-polybag" value="${state.tableRows[0].polybag}" placeholder="0" min="0" ${(!issueDocNo || remainingIssueQty <= 0) ? 'disabled' : ''} style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 4px; outline: none; font-size: 0.82rem; font-weight: 700; text-align: left; background: ${(!issueDocNo || remainingIssueQty <= 0) ? '#F3F4F6' : '#FFFFFF'}; color: #111827; padding: 0 44px 0 8px; box-sizing: border-box;">
              <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.72rem; color: #6B7280; font-weight: 600;">${issueUom || 'LBR'}</span>
            </div>
          </div>

          <!-- 3. Banyaknya Ditolak / Seleksi (Simetris 2 Kolom) -->
          <div style="margin-top: 10px;">
            <div style="font-size: 0.68rem; color: #6B7280; margin-bottom: 4px; text-align: left;">Banyaknya Ditolak/Seleksi</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: center;">
              <input type="number" id="input-ditolak" value="${state.ditolak}" placeholder="0" min="0" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 4px; padding: 0 8px; text-align: left; font-size: 0.78rem; font-weight: 600; color: #111827; background: #FFFFFF; outline: none; box-sizing: border-box;">
              <div style="position: relative; width: 100%; height: 36px;">
                <select id="select-alasan" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 4px; background: #FFFFFF; padding: 0 6px; font-size: 0.74rem; font-weight: 500; color: #374151; cursor: pointer; outline: none; box-sizing: border-box;" ${(!state.ditolak || parseInt(state.ditolak) === 0) ? 'disabled' : ''}>
                  <option value="Tidak Ada" ${state.alasanDitolak === 'Tidak Ada' || !state.ditolak || parseInt(state.ditolak) === 0 ? 'selected' : ''}>Tidak Ada</option>
                  <option value="Rusak" ${state.alasanDitolak === 'Rusak' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Rusak</option>
                  <option value="Mati" ${state.alasanDitolak === 'Mati' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Mati</option>
                  <option value="Lainnya" ${state.alasanDitolak === 'Lainnya' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Lainnya</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. RINGKASAN PENYEMAIAN -->
        <section style="padding: 12px 14px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <h2 style="font-size: 0.82rem; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Ringkasan Penyemaian</h2>
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;">
              <span style="color: #4B5563;">Jlh Bibit Pindah Semai</span>
              <span id="lbl-tersedia" style="font-weight: 700; color: #111827;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;">
              <span style="color: #4B5563;">Jlh Polybag</span>
              <span id="lbl-polybag" style="font-weight: 700; color: #111827;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;">
              <span style="color: #4B5563;">Banyaknya Ditolak/Seleksi</span>
              <span id="lbl-ditolak" style="font-weight: 700; color: #111827;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; padding-top: 4px; border-top: 1px solid #E5E7EB;">
              <span style="font-weight: 600; color: #111827;">Sisa Belum Pindah Semai</span>
              <span id="lbl-belum" style="font-weight: 700; color: #DC2626;">${previousBalance}</span>
            </div>
          </div>
        </section>

        <!-- 5. TAMBAH FOTO -->
        <section style="padding: 12px 14px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <h2 style="font-size: 0.82rem; font-weight: 700; color: #111827; margin: 0 0 2px 0;">Tambah Foto</h2>
          <p style="font-size: 0.68rem; color: #6B7280; margin: 0 0 8px 0; line-height: 1.35;">
            Sertakan foto jarak dekat untuk detail Item dan foto jarak jauh untuk area bedengan.
          </p>
          
          <div id="photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;"></div>

          <button id="btn-tambah-foto" type="button" style="width: 100%; padding: 8px; background: #F9FAFB; border: 1px dashed #9CA3AF; border-radius: 4px; color: #4B5563; font-size: 0.76rem; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 6px; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Tambah Foto
          </button>
        </section>

      </main>

      <!-- 6. BOTTOM ACTION -->
      <footer style="padding: 10px 14px; background: #FFFFFF; border-top: 1px solid #E5E7EB; flex-shrink: 0;">
        <button id="btn-simpan" type="button" disabled style="width: 100%; height: 40px; background: #E5E7EB; color: #9CA3AF; border: none; border-radius: 4px; font-weight: 700; font-size: 0.84rem; cursor: not-allowed; transition: all 0.15s ease;">
          Simpan Penyemaian
        </button>
      </footer>

      <!-- OVERLAY -->
      <div id="modal-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>
      
      <!-- BOTTOM SHEET KONFIRMASI SIMPAN -->
      <div id="sheet-konfirmasi" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 14px 14px 0 0; padding: 22px 16px 18px; z-index: 101; flex-direction: column; align-items: center; box-shadow: 0 -4px 16px rgba(0,0,0,0.12);">
        <div style="width: 32px; height: 3px; background: #D1D5DB; border-radius: 2px; margin-bottom: 14px;"></div>
        
        <div style="font-size: 0.95rem; font-weight: 700; color: #111827; margin-bottom: 4px; text-align: center;">Simpan Data Penyemaian?</div>
        <div style="font-size: 0.74rem; color: #6B7280; text-align: center; margin-bottom: 16px; line-height: 1.4;">
          Pastikan seluruh data rincian dan foto dokumentasi telah sesuai.
        </div>

        <div style="display: flex; gap: 8px; width: 100%;">
          <button id="btn-konfirm-batal" type="button" style="flex: 1; height: 38px; background: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 4px; font-weight: 600; color: #374151; font-size: 0.80rem; cursor: pointer;">
            Batal
          </button>
          <button id="btn-konfirm-simpan" type="button" style="flex: 1; height: 38px; background: #116834; border: none; border-radius: 4px; font-weight: 600; color: #FFFFFF; font-size: 0.80rem; cursor: pointer;">
            Ya, Simpan
          </button>
        </div>
      </div>

      <!-- CAMERA OVERLAY -->
      <div id="camera-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #000; z-index: 200; flex-direction: column;">
        <header style="display: flex; justify-content: space-between; align-items: center; padding: 14px; position: absolute; top: 0; left: 0; right: 0; z-index: 201;">
          <button id="btn-close-camera" type="button" style="background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <main style="flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
          <video id="camera-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
          <canvas id="camera-canvas" style="display: none;"></canvas>
          <div id="camera-error" style="display: none; color: white; text-align: center; padding: 20px;">
            <p style="font-size: 0.84rem;">Kamera tidak tersedia atau akses ditolak.</p>
            <p style="font-size: 0.72rem; color: #aaa;">Ketuk tombol rana untuk foto simulasi.</p>
          </div>
        </main>
        <footer style="padding: 20px; display: flex; justify-content: center; align-items: center; position: absolute; bottom: 0; left: 0; right: 0; z-index: 201; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
          <button id="btn-shutter" type="button" style="width: 60px; height: 60px; border-radius: 50%; background: transparent; border: 3px solid #ffffff; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <div style="width: 46px; height: 46px; background: #ffffff; border-radius: 50%;"></div>
          </button>
        </footer>
      </div>

    </div>
  `;

  // Attach DOM Selectors
  const btnBack = app.querySelector('#btn-back');
  const selectBatch = app.querySelector('#select-batch');
  const inpDisemai = app.querySelector('#inp-disemai');
  const inpPolybag = app.querySelector('#inp-polybag');
  const inputDitolak = app.querySelector('#input-ditolak');
  const selectAlasan = app.querySelector('#select-alasan');
  const lblTersedia = app.querySelector('#lbl-tersedia');
  const lblPolybag = app.querySelector('#lbl-polybag');
  const lblDitolak = app.querySelector('#lbl-ditolak');
  const lblBelum = app.querySelector('#lbl-belum');
  const photoContainer = app.querySelector('#photo-container');
  const btnTambahFoto = app.querySelector('#btn-tambah-foto');
  const btnSimpan = app.querySelector('#btn-simpan');
  const modalOverlay = app.querySelector('#modal-overlay');
  const sheetKonfirmasi = app.querySelector('#sheet-konfirmasi');
  const btnKonfirmBatal = app.querySelector('#btn-konfirm-batal');
  const btnKonfirmSimpan = app.querySelector('#btn-konfirm-simpan');

  function validateForm() {
    let isValid = true;

    // Check table rows (1 row only)
    if (state.tableRows.length === 0) isValid = false;
    let polybagTotal = parseInt(state.tableRows[0]?.polybag || 0, 10);
    let disemaiTotal = parseInt(state.tableRows[0]?.disemai || 0, 10);

    if ((!state.tableRows[0]?.batchNo && !state.tableRows[0]?.batchId && !state.batchId && !state.batchNo) || disemaiTotal <= 0 || polybagTotal <= 0) {
      isValid = false;
    }

    // Validasi tidak boleh melebihi sisa Berhasil di Deder
    if (disemaiTotal > previousBalance) {
      isValid = false;
    }

    // Validasi Issue Gudang Polybag
    if (!issueDocNo || !issueItemId) {
      isValid = false;
    } else {
      if (polybagTotal > remainingIssueQty) {
        isValid = false;
      }
    }

    // Check photos
    if (state.photos.length === 0) isValid = false;

    if (isValid) {
      btnSimpan.disabled = false;
      btnSimpan.style.background = '#116834';
      btnSimpan.style.color = '#FFFFFF';
      btnSimpan.style.cursor = 'pointer';
    } else {
      btnSimpan.disabled = true;
      btnSimpan.style.background = '#E5E7EB';
      btnSimpan.style.color = '#9CA3AF';
      btnSimpan.style.cursor = 'not-allowed';
    }
  }

  function calculateTotals() {
    let polybagTotal = parseInt(state.tableRows[0]?.polybag || 0, 10);
    let disemaiTotal = parseInt(state.tableRows[0]?.disemai || 0, 10);
    const ditolak = parseInt(state.ditolak || 0, 10);

    lblTersedia.textContent = disemaiTotal.toLocaleString('id-ID');
    if (lblPolybag) {
      lblPolybag.textContent = polybagTotal.toLocaleString('id-ID');
    }
    lblDitolak.textContent = ditolak.toLocaleString('id-ID');

    const sisaBenih = previousBalance - ditolak - disemaiTotal;
    lblBelum.textContent = sisaBenih.toLocaleString('id-ID');
    if (sisaBenih < 0) {
      lblBelum.style.color = '#DC2626';
    } else {
      lblBelum.style.color = '#111827';
    }
  }

  // Bind Issue Button
  app.querySelector('#btn-pilih-issue')?.addEventListener('click', () => {
    navigate('/seeding/issue-select');
  });

  // Bind Batch Select
  if (selectBatch) {
    selectBatch.addEventListener('change', (e) => {
      const chosenId = e.target.value;
      const bObj = getBatchById(chosenId) || getBatchByCode(chosenId) || finalBatchList.find(b => (b.id || b.batchId) === chosenId);
      state.tableRows[0].batchId = bObj ? (bObj.id || bObj.batchId) : chosenId;
      state.tableRows[0].batchNo = bObj ? (bObj.batchCode || bObj.batchNo) : chosenId;
      state.batchId = state.tableRows[0].batchId;
      state.batchNo = state.tableRows[0].batchNo;
      validateForm();
    });
  }

  // Bind Bibit Pindah Semai Input (Editable)
  if (inpDisemai) {
    inpDisemai.addEventListener('input', (e) => {
      let val = parseInt(e.target.value || 0, 10);
      if (val < 0) {
        val = 0;
        e.target.value = 0;
      }

      if (val > previousBalance) {
        toast(`Jumlah bibit melebihi sisa hasil Deder (${previousBalance.toLocaleString('id-ID')} Butir).`, 'error');
        val = previousBalance;
        e.target.value = previousBalance;
      }

      state.tableRows[0].disemai = val || '';

      // Auto-populate / suggest Polybag = Math.ceil(val / 2)
      let suggestedPolybag = Math.ceil(val / 2);
      if (remainingIssueQty > 0 && suggestedPolybag > remainingIssueQty) {
        toast(`Kebutuhan melebihi sisa Material Gudang (${remainingIssueQty.toLocaleString('id-ID')} ${issueUom || 'LBR'}).`, 'error');
        suggestedPolybag = remainingIssueQty;
      }

      state.tableRows[0].polybag = suggestedPolybag || '';
      if (inpPolybag) {
        inpPolybag.value = suggestedPolybag || '';
      }

      calculateTotals();
      validateForm();
    });
  }

  // Bind Polybag Input (Editable)
  if (inpPolybag) {
    inpPolybag.addEventListener('input', (e) => {
      let val = parseInt(e.target.value || 0, 10);
      if (val < 0) {
        val = 0;
        e.target.value = 0;
      }

      // Maximum: Math.min(remainingIssueQty, Math.floor(previousBalance / 2))
      const maxPolybagFromDeder = Math.floor(previousBalance / 2);
      const maxLimit = issueDocNo ? Math.min(maxPolybagFromDeder, remainingIssueQty) : maxPolybagFromDeder;

      if (val > maxLimit) {
        if (val > remainingIssueQty && remainingIssueQty < maxPolybagFromDeder) {
          toast(`Kebutuhan melebihi sisa Material Gudang (${remainingIssueQty.toLocaleString('id-ID')} ${issueUom || 'LBR'}).`, 'error');
        } else {
          toast(`Jumlah bibit melebihi sisa hasil Deder (${previousBalance.toLocaleString('id-ID')} Butir).`, 'error');
        }
        val = maxLimit;
        e.target.value = maxLimit;
      }

      state.tableRows[0].polybag = val || '';

      // Auto-calculate suggested Disemai = val * 2
      const disemaiVal = val * 2;
      state.tableRows[0].disemai = disemaiVal || '';
      if (inpDisemai) {
        inpDisemai.value = disemaiVal || '';
      }

      calculateTotals();
      validateForm();
    });
  }

  // Bind Ditolak & Alasan
  if (inputDitolak) {
    inputDitolak.addEventListener('input', (e) => {
      let val = parseInt(e.target.value || 0, 10);
      if (val < 0) {
        e.target.value = 0;
        val = 0;
      }
      state.ditolak = e.target.value;

      if (val === 0 || !e.target.value) {
        selectAlasan.value = 'Tidak Ada';
        state.alasanDitolak = 'Tidak Ada';
        selectAlasan.disabled = true;
      } else {
        selectAlasan.disabled = false;
        if (selectAlasan.value === 'Tidak Ada') {
          selectAlasan.value = 'Rusak';
          state.alasanDitolak = 'Rusak';
        }
      }

      calculateTotals();
      validateForm();
    });
  }

  if (selectAlasan) {
    selectAlasan.addEventListener('change', (e) => {
      state.alasanDitolak = e.target.value;
    });
  }

  function renderPhotos() {
    photoContainer.innerHTML = state.photos.map((p, idx) => `
      <div style="position: relative; width: 68px; height: 68px; border-radius: 4px; overflow: hidden; border: 1px solid #D1D5DB;">
        <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
        <button class="btn-hapus-foto" data-index="${idx}" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white;">
          <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `).join('');

    photoContainer.querySelectorAll('.btn-hapus-foto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        state.photos.splice(idx, 1);
        renderPhotos();
        validateForm();
      });
    });
  }

  // CAMERA LOGIC
  const cameraOverlay = app.querySelector('#camera-overlay');
  const videoEl = app.querySelector('#camera-video');
  const canvasEl = app.querySelector('#camera-canvas');
  const errorEl = app.querySelector('#camera-error');
  const btnCloseCamera = app.querySelector('#btn-close-camera');
  const btnShutter = app.querySelector('#btn-shutter');
  let currentStream = null;
  let isCameraActive = false;

  async function openCamera() {
    cameraOverlay.style.display = 'flex';
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoEl.srcObject = currentStream;
        await videoEl.play();
        isCameraActive = true;
        errorEl.style.display = 'none';
        videoEl.style.display = 'block';
      } else {
        throw new Error('Not supported');
      }
    } catch (e) {
      console.warn(e);
      isCameraActive = false;
      errorEl.style.display = 'block';
      videoEl.style.display = 'none';
    }
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    cameraOverlay.style.display = 'none';
  }

  btnCloseCamera.addEventListener('click', stopCamera);

  btnShutter.addEventListener('click', () => {
    let dataUrl = '';
    const ts = new Date().toLocaleString();
    if (isCameraActive && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0);

      // Add timestamp
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, canvasEl.height - 40, canvasEl.width, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(ts, 10, canvasEl.height - 15);

      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    } else {
      // Dummy photo
      canvasEl.width = 400;
      canvasEl.height = 400;
      const ctx = canvasEl.getContext('2d');
      ctx.fillStyle = '#4A90E2';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 360, 400, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(ts, 10, 385);
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FOTO SIMULASI', 200, 200);
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    }

    state.photos.push(dataUrl);
    stopCamera();
    renderPhotos();
    validateForm();
  });

  btnTambahFoto.addEventListener('click', openCamera);

  btnBack.addEventListener('click', () => {
    storage.remove('editing_seeding_index');
    navigate('/seeding');
  });

  btnSimpan.addEventListener('click', () => {
    if (!btnSimpan.disabled) {
      modalOverlay.style.display = 'block';
      sheetKonfirmasi.style.display = 'flex';
    }
  });

  btnKonfirmBatal.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
    sheetKonfirmasi.style.display = 'none';
  });

  btnKonfirmSimpan.addEventListener('click', async () => {
    modalOverlay.style.display = 'none';
    sheetKonfirmasi.style.display = 'none';

    // Defense-in-Depth Gate #3: Validasi status persetujuan Asisten Bibitan
    const isDederanSource = sourceIdx && (String(sourceIdx).startsWith('DED_') || sourceTx.isFromDederan || sourceTx.sourceType === 'DEDER_INSPECTION');
    if (isDederanSource && editIdx === null) {
      const currentEligible = getEligiblePindahSemaiSources();
      const isStillEligible = currentEligible.some(s =>
        s.sourceIndex == sourceIdx ||
        s.docNo == sourceDocNo ||
        (s.dederanTxDocNo && sourceTx.dederanTxDocNo && s.dederanTxDocNo === sourceTx.dederanTxDocNo)
      );
      if (!isStillEligible) {
        toast('Data Seleksi Pra-Semai belum disetujui oleh Asisten Bibitan.', 'error');
        return;
      }
    }

    let totalPolybag = parseInt(state.tableRows[0]?.polybag || 0, 10);
    let totalDisemai = parseInt(state.tableRows[0]?.disemai || (totalPolybag * 2), 10);

    if (totalDisemai > previousBalance) {
      toast(`Jumlah bibit di Pindah Semai (${totalDisemai.toLocaleString('id-ID')} Butir) tidak boleh melebihi sisa hasil Deder (${previousBalance.toLocaleString('id-ID')} Butir).`, 'error');
      return;
    }

    // STALE-BALANCE REVALIDATION
    const freshBalance = calculateRemainingIssueBalance(issueDocNo, issueItemId, issueItemCode, editTx ? editTx.docNo : null);

    if (totalPolybag > freshBalance.remainingQuantity) {
      toast(`Gagal simpan! Sisa Material Gudang (${issueDocNo}) saat ini hanya ${freshBalance.remainingQuantity.toLocaleString('id-ID')} ${issueUom}, sedangkan kebutuhan Anda ${totalPolybag.toLocaleString('id-ID')} ${issueUom}. Silakan pilih item lain.`, 'error');
      return;
    }

    // Show banner success and navigate back
    const banner = document.createElement('div');
    banner.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: #689F38; color: white; text-align: center; padding: 12px; font-weight: 600; font-size: 0.95rem; z-index: 1000; transition: top 0.3s ease-out;';
    banner.textContent = 'Data berhasil disimpan';
    app.querySelector('.page').appendChild(banner);

    // Simpan ke storage (seeding_transactions)
    const txs = storage.get('seeding_transactions', []);

    const bedenganDisplay = Array.from(new Set((state.tableRows || []).map(r => r.bedengan).filter(Boolean))).join(', ') || 'Bedengan 001';

    const seedingDocNo = (editTx && editTx.docNo) ? editTx.docNo : generateUniqueDocNo('seeding', txs, 2026);

    // Resolve Canonical References
    const activeBatchId = state.tableRows[0]?.batchId || state.batchId;
    const activeBatchNo = state.tableRows[0]?.batchNo || state.batchNo;
    const batchObj = (activeBatchId || activeBatchNo) ? (getBatchById(activeBatchId) || getBatchByCode(activeBatchNo)) : null;
    const finalBatchId = batchObj ? (batchObj.id || batchObj.batchId) : (activeBatchId || null);
    const finalBatchCode = batchObj ? (batchObj.batchCode || batchObj.batchNo) : (activeBatchNo || null);

    const firstRowBedId = state.tableRows[0]?.bedenganId || initialBedObj?.bedenganId || null;
    const primaryBedObj = firstRowBedId ? getBedenganById(firstRowBedId) : (initialBedObj || null);
    const finalBedenganId = primaryBedObj ? primaryBedObj.bedenganId : (firstRowBedId || null);
    const finalBedenganCode = primaryBedObj ? primaryBedObj.bedenganCode : null;

    const finalProgramId = effectiveProgramId || batchObj?.programId || primaryBedObj?.programId || null;
    const finalProgramCode = effectiveProgramCode || batchObj?.programCode || primaryBedObj?.programCode || null;
    const finalBlockId = primaryBedObj?.blockId || batchObj?.blockId || sourceTx.blockId || null;
    const finalBlockCode = primaryBedObj?.blockCode || batchObj?.blockCode || sourceTx.blockCode || null;

    // Enriched Rows with Bedengan Canonical IDs
    const enrichedRows = state.tableRows.map(r => {
      const bObj = (r.bedenganId ? getBedenganById(r.bedenganId) : null) || getBedenganByCode(r.bedengan) || finalBedenganList.find(b => b.name === r.bedengan);
      const batchO = (r.batchId ? getBatchById(r.batchId) : null) || (r.batchNo ? getBatchByCode(r.batchNo) : null) || finalBatchList.find(b => (b.id || b.batchId) === r.batchId || (b.batchCode || b.batchNo) === r.batchNo);
      return {
        ...r,
        batchId: batchO ? (batchO.id || batchO.batchId) : (r.batchId || null),
        batchNo: batchO ? (batchO.batchCode || batchO.batchNo) : (r.batchNo || null),
        bedenganId: bObj ? bObj.bedenganId : (r.bedenganId || null),
        bedenganCode: bObj ? bObj.bedenganCode : null,
        bedengan: bObj ? bObj.name : r.bedengan,
        disemai: totalDisemai,
        polybag: totalPolybag
      };
    });

    const newTx = {
      date: today,
      docNo: seedingDocNo,
      sourceDocNo: sourceDocNo,
      sourceIndex: sourceIdx,
      sourceDederTxId: sourceTx.id || null,
      sourceDederDocNo: sourceTx.docNo || null,
      dederanTxDocNo: sourceTx.dederanTxDocNo || null,
      parentDederIndukDocNo: sourceTx.parentDederIndukDocNo || null,

      // Issue Gudang Reference
      issueDocNo: issueDocNo,
      issueItemId: issueItemId,
      itemCode: issueItemCode,
      itemName: issueItemName,
      uom: issueUom,

      // Canonical Foreign Keys
      programId: finalProgramId,
      programCode: finalProgramCode,
      batchId: finalBatchId,
      batchCode: finalBatchCode,
      bedenganId: finalBedenganId,
      bedenganCode: finalBedenganCode,
      blockId: finalBlockId,
      blockCode: finalBlockCode,
      estateId: effectiveEstateId,
      divisionId: effectiveDivisionId,
      // Display and Backward Compatibility Fields
      batchNo: finalBatchCode || state.batchNo || 'B-001',
      program: finalProgramCode || sourceTx.program || 'PRG/NUR/01/2026',
      tahapan: sourceTx.tahapan || 'Rubber Main Nursery',
      klonAwal: sourceTx.klon ? normalizeKlonName(sourceTx.klon) : 'GT 1',
      bedengan: bedenganDisplay,
      totalPenerimaan,
      ditolak: state.ditolak,
      alasanDitolak: state.alasanDitolak,
      rows: enrichedRows,
      photos: state.photos,
      totalDisemai,
      totalPolybag
    };

    if (editIdx !== null) {
      txs[editIdx] = newTx;
    } else {
      txs.push(newTx);
    }

    storage.set('seeding_transactions', txs);
    storage.remove('editing_seeding_index');

    // Integrasikan bibit ditolak (Rusak, Mati, Lainnya) ke Selection Pool secara idempoten
    try {
      integrateSeedingToSelectionPool(newTx, { isEditing: editIdx !== null });
    } catch (err) {
      console.warn('[seeding-form] Gagal integrasi ke selection_pool:', err.message);
    }

    // Bersihkan session scan bedengan
    storage.remove('scanned_bedengan_id');
    storage.remove('scanned_bedengan_code');
    storage.remove('scanned_bedengan_name');
    storage.remove('scanned_bedengan');
    storage.remove('scanned_bedengan_program_id');
    storage.remove('scanned_bedengan_block_id');
    storage.remove('scanned_bedengan_block_code');
    storage.remove('scanned_bedengan_estate_id');
    storage.remove('scanned_bedengan_division_id');
    storage.remove('bedengan_verified_method');
    storage.remove('bedengan_verified_at');

    setTimeout(() => {
      navigate('/seeding');
    }, 1500);
  });

  // Render initial
  calculateTotals();
  renderPhotos();
  validateForm();
}
