import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, formatStandardDocNo, generateUniqueDocNo } from '../../core/utils.js';
import { getActiveKlons, normalizeKlonName, resolveKlon } from '../../data/klon-master.js';
import { getActiveBatches, getBatchById, getBatchByCode } from '../../data/batch-master.js';
import { getActiveBedengan, getBedenganById, getBedenganByCode } from '../../data/bedengan-master.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { integrateSeedingToSelectionPool } from '../selection/selection-manager.js';

export function renderSeedingForm() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const userCtx = getCurrentUserContext();
  const today = formatDate(new Date().toISOString());

  // Get source transaction
  const sourceIdx = storage.get('seeding_source_index', null);
  const txs = storage.get('receipt_transactions', []);
  const sourceTx = txs[sourceIdx] || {};
  const sourceDocNo = sourceTx.docNo || sourceTx.nomorDokumen || formatStandardDocNo(2026, 'APR', (parseInt(sourceIdx || 0) + 1));
  const docNo = sourceDocNo;

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
  const state = {
    batchId: defaultBatchId,
    batchNo: defaultBatchCode,
    ditolak: editTx ? editTx.ditolak : '',
    alasanDitolak: editTx ? editTx.alasanDitolak : 'Tidak Ada',
    tableRows: editTx ? JSON.parse(JSON.stringify(editTx.rows)) : [
      {
        bedenganId: initialBedId,
        bedenganCode: initialBedCode,
        bedengan: initialBedName,
        klon: sourceTx.klon ? normalizeKlonName(sourceTx.klon) : 'GT 1',
        disemai: '',
        polybag: ''
      }
    ],
    photos: editTx ? JSON.parse(JSON.stringify(editTx.photos)) : []
  };

  const activeKlons = getActiveKlons();
  const klonList = activeKlons.map(k => k.canonicalName);
  
  const totalPenerimaan = parseInt(sourceTx.qty || 0);

  // Calculate previous accumulations for this source document
  let accumulatedDisemai = 0;
  let accumulatedDitolak = 0;
  seedingTxs.forEach((s, idx) => {
    if (s.sourceIndex == sourceIdx) {
      // If editing, don't count the current transaction in the previous balance
      if (editIdx === null || editIdx != idx) {
        accumulatedDisemai += parseInt(s.totalDisemai || 0);
        accumulatedDitolak += parseInt(s.ditolak || 0);
      }
    }
  });
  
  const previousBalance = totalPenerimaan - accumulatedDisemai - accumulatedDitolak;

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">Penyemaian</h1>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding-bottom: 24px;">
        
        <!-- 1. IDENTITAS TRANSAKSI -->
        <section style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 16px; border-bottom: 1px solid #E5E7EB; gap: 12px; background: #FFFFFF;">
          <div style="flex: 1;">
            <div style="font-size: 0.95rem; font-weight: 700; color: #111111; margin-bottom: 2px;">${user.name}</div>
            <div style="font-size: 0.76rem; color: #6B7280; line-height: 1.3;">${user.code} - ${user.position}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.74rem; font-weight: 600; color: #6B7280; margin-bottom: 2px;">Tanggal Penyemaian</div>
            <div style="font-size: 0.92rem; color: #111111; font-weight: 700;">${today}</div>
          </div>
        </section>

        <!-- 2. RINCIAN PENYEMAIAN -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Rincian Penyemaian</h2>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.78rem; color: #555555;">Jenis Bibitan</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: #111111;">Green Budding</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.78rem; color: #555555;">Tahapan Pertumbuhan</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: #111111;">${sourceTx.tahapan || 'Rubber Main Nursery'}</span>
          </div>
          
          <!-- Program Pembibitan -->
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.76rem; font-weight: 600; color: #4B5563; margin-bottom: 6px;">Program Pembibitan</label>
            <div style="background: #F3F4F6; height: 38px; padding: 0 10px; border-radius: 6px; border: 1px solid #D1D5DB; display: flex; align-items: center; box-sizing: border-box;">
              <span style="color: #116834; font-weight: 700; font-size: 0.8rem;">${sourceTx.program || 'PRG/NUR/01/2026'}</span>
              <span style="color: #374151; font-size: 0.8rem; margin-left: 4px;"> - Pembibitan Karet 2026</span>
            </div>
          </div>

          <!-- Klon Awal & Total Penerimaan (Rata Kiri, 2 Kolom Seimbang) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <div style="font-size: 0.76rem; font-weight: 600; color: #4B5563; margin-bottom: 6px; text-align: left;">Klon Awal</div>
              <div style="font-size: 0.88rem; font-weight: 700; color: #111827; height: 38px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; display: flex; align-items: center; padding: 0 10px; box-sizing: border-box; text-align: left;">
                ${sourceTx.klon ? normalizeKlonName(sourceTx.klon) : 'GT 1'}
              </div>
            </div>
            <div>
              <div style="font-size: 0.76rem; font-weight: 600; color: #4B5563; margin-bottom: 6px; text-align: left;">Total Penerimaan</div>
              <div style="font-size: 0.88rem; font-weight: 700; color: #111827; height: 38px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; display: flex; align-items: center; padding: 0 10px; box-sizing: border-box; text-align: left;">
                ${totalPenerimaan.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <!-- Banyaknya Ditolak / Seleksi (Simetris 2 Kolom Seimbang) -->
          <div>
            <div style="font-size: 0.76rem; font-weight: 600; color: #4B5563; margin-bottom: 6px; text-align: left;">Banyaknya Ditolak/Seleksi</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center;">
              <input type="number" id="input-ditolak" value="${state.ditolak}" placeholder="0" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; text-align: left; font-size: 0.88rem; font-weight: 700; color: #111827; background: #FFFFFF; outline: none; box-sizing: border-box;">
              <div style="position: relative; width: 100%; height: 38px;">
                <select id="select-alasan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; padding: 0 10px; font-size: 0.82rem; font-weight: 600; color: #374151; cursor: pointer; outline: none; box-sizing: border-box;" ${(!state.ditolak || parseInt(state.ditolak) === 0) ? 'disabled' : ''}>
                  <option value="Tidak Ada" ${state.alasanDitolak === 'Tidak Ada' || !state.ditolak || parseInt(state.ditolak) === 0 ? 'selected' : ''}>Tidak Ada</option>
                  <option value="Rusak" ${state.alasanDitolak === 'Rusak' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Rusak</option>
                  <option value="Mati" ${state.alasanDitolak === 'Mati' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Mati</option>
                  <option value="Lainnya" ${state.alasanDitolak === 'Lainnya' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Lainnya</option>
                </select>
              </div>
            </div>
          </div>

        </section>

        <!-- 3. DETAIL PENYEMAIAN -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0;">Detail Penyemaian</h2>
            <button id="btn-tambah-data" type="button" style="background: #116834; color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Tambah Data
            </button>
          </div>

          <!-- Table Header -->
          <div style="background: #E8F5E9; padding: 8px 6px; display: grid; grid-template-columns: 1.5fr 1fr 1fr 28px; gap: 6px; border: 1px solid #C8E6C9; border-bottom: none; align-items: center; text-align: center;">
            <div style="font-size: 0.7rem; font-weight: 700; color: #116834; text-align: left; padding-left: 4px;">No. Bedengan</div>
            <div style="font-size: 0.7rem; font-weight: 700; color: #116834;">Bibit Disemai</div>
            <div style="font-size: 0.7rem; font-weight: 700; color: #116834;">Jlh Polybag</div>
            <div></div>
          </div>
          
          <div id="table-body" style="border-left: 1px solid #C8E6C9; border-right: 1px solid #C8E6C9; border-bottom: 1px solid #C8E6C9;">
            <!-- rows -->
          </div>
        </section>

        <!-- 4. RINGKASAN PENYEMAIAN -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Ringkasan Penyemaian</h2>
          <div style="background: #E8F5E9; padding: 12px 14px; border: 1px solid #C8E6C9; border-radius: 6px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.76rem; font-weight: 700; color: #116834;">Nomor Batch</span>
              <select id="select-batch" style="font-size: 0.76rem; font-weight: 700; color: #111111; border: 1px solid #A5D6A7; background: #FFFFFF; border-radius: 4px; padding: 3px 8px; outline: none; cursor: pointer;">
                ${finalBatchList.map(b => `<option value="${b.id || b.batchId}" ${(state.batchId === (b.id || b.batchId) || state.batchNo === (b.batchCode || b.batchNo)) ? 'selected' : ''}>${b.batchCode || b.batchNo}</option>`).join('')}
              </select>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.76rem; font-weight: 700; color: #116834;">Bibit Disemai (Sesi Ini)</span>
              <span id="lbl-tersedia" style="font-size: 0.82rem; font-weight: 700; color: #111111;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.76rem; font-weight: 700; color: #116834;">Banyaknya Ditolak/Seleksi</span>
              <span id="lbl-ditolak" style="font-size: 0.82rem; font-weight: 700; color: #111111;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.76rem; font-weight: 700; color: #116834;">Sisa Benih Belum Disemai</span>
              <span id="lbl-belum" style="font-size: 0.82rem; font-weight: 700; color: #D32F2F;">${previousBalance}</span>
            </div>
          </div>
        </section>

        <!-- 5. TAMBAH FOTO -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0 0 4px 0;">Tambah Foto</h2>
          <p style="font-size: 0.74rem; color: #6B7280; margin: 0 0 10px 0; line-height: 1.35;">
            Praktik terbaik adalah menyertakan foto jarak dekat untuk detail Item dan foto jarak jauh untuk konteks area yang terpengaruh.
          </p>
          
          <div id="photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;"></div>

          <button id="btn-tambah-foto" type="button" style="width: 100%; padding: 10px; background: #E3F2FD; border: 1px dashed #4A90E2; border-radius: 6px; color: #4A90E2; font-size: 0.82rem; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 6px; cursor: pointer;">
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
      <footer style="padding: 14px 16px; background: #FFFFFF; border-top: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-simpan" type="button" disabled style="width: 100%; height: 44px; background: #E0E0E0; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.92rem; cursor: not-allowed;">
          Simpan Penyemaian
        </button>
      </footer>

      <!-- OVERLAY -->
      <div id="modal-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>
      
      <!-- BOTTOM SHEET KONFIRMASI SIMPAN -->
      <div id="sheet-konfirmasi" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 16px 16px 0 0; padding: 32px 16px 24px; z-index: 101; flex-direction: column; align-items: center; box-shadow: 0 -4px 12px rgba(0,0,0,0.1);">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="#000000" style="margin-bottom: 16px;">
          <rect x="2" y="5" width="20" height="6" rx="1" />
          <circle cx="6" cy="8" r="2" fill="#FFFFFF" />
          <rect x="2" y="13" width="20" height="6" rx="1" />
          <circle cx="6" cy="16" r="2" fill="#FFFFFF" />
        </svg>
        <h3 style="font-size: 1.2rem; font-weight: 700; color: #111111; margin: 0 0 8px 0;">Konfirmasi Simpan</h3>
        <p style="font-size: 0.95rem; color: #333333; text-align: center; margin: 0 0 24px 0; line-height: 1.5;">
          Apakah anda setuju menyimpan<br><strong>Data Penyemaian</strong> ini?
        </p>
        <div style="display: flex; gap: 12px; width: 100%;">
          <button id="btn-konfirm-batal" type="button" style="flex: 1; padding: 14px; background: #FFFFFF; border: 1px solid #356943; border-radius: 6px; color: #356943; font-weight: 700; font-size: 1rem; cursor: pointer;">Kembali</button>
          <button id="btn-konfirm-simpan" type="button" style="flex: 1; padding: 14px; background: #356943; border: none; border-radius: 6px; color: #FFFFFF; font-weight: 700; font-size: 1rem; cursor: pointer;">Simpan</button>
        </div>
      </div>

      <!-- CAMERA OVERLAY -->
      <div id="camera-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #000; z-index: 200; flex-direction: column;">
        <header style="display: flex; justify-content: space-between; align-items: center; padding: 16px; position: absolute; top: 0; left: 0; right: 0; z-index: 201;">
          <button id="btn-close-camera" type="button" style="background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <main style="flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
          <video id="camera-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
          <canvas id="camera-canvas" style="display: none;"></canvas>
          <div id="camera-error" style="display: none; color: white; text-align: center; padding: 20px;">
            <p>Kamera tidak tersedia atau akses ditolak.</p>
            <p style="font-size: 0.8rem; color: #aaa;">Ketuk tombol rana untuk foto simulasi.</p>
          </div>
        </main>
        <footer style="padding: 24px; display: flex; justify-content: center; align-items: center; position: absolute; bottom: 0; left: 0; right: 0; z-index: 201; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
          <button id="btn-shutter" type="button" style="width: 70px; height: 70px; border-radius: 50%; background: transparent; border: 4px solid #ffffff; display: flex; justify-content: center; align-items: center; cursor: pointer;">
            <div style="width: 54px; height: 54px; background: #ffffff; border-radius: 50%;"></div>
          </button>
        </footer>
      </div>

    </div>
  `;

  const inputDitolak = app.querySelector('#input-ditolak');
  const selectAlasan = app.querySelector('#select-alasan');
  const tableBody = app.querySelector('#table-body');
  const btnTambahData = app.querySelector('#btn-tambah-data');
  
  const lblTersedia = app.querySelector('#lbl-tersedia');
  const lblDitolak = app.querySelector('#lbl-ditolak');
  const lblBelum = app.querySelector('#lbl-belum');

  const selectBatch = app.querySelector('#select-batch');
  const photoContainer = app.querySelector('#photo-container');
  const btnTambahFoto = app.querySelector('#btn-tambah-foto');
  const btnSimpan = app.querySelector('#btn-simpan');
  const modalOverlay = app.querySelector('#modal-overlay');
  const sheetKonfirmasi = app.querySelector('#sheet-konfirmasi');
  const btnKonfirmBatal = app.querySelector('#btn-konfirm-batal');
  const btnKonfirmSimpan = app.querySelector('#btn-konfirm-simpan');

  function validateForm() {
    let isValid = true;
    
    // Check table rows
    if (state.tableRows.length === 0) isValid = false;
    state.tableRows.forEach(row => {
      if (!row.bedengan || parseInt(row.disemai || 0) <= 0) {
        isValid = false;
      }
    });

    // Check photos
    if (state.photos.length === 0) isValid = false;
    
    if (isValid) {
      btnSimpan.disabled = false;
      btnSimpan.style.background = '#356943';
      btnSimpan.style.cursor = 'pointer';
    } else {
      btnSimpan.disabled = true;
      btnSimpan.style.background = '#E0E0E0';
      btnSimpan.style.cursor = 'not-allowed';
    }
  }

  function calculateTotals() {
    let disemaiTotal = 0;
    state.tableRows.forEach(row => {
      disemaiTotal += parseInt(row.disemai || 0);
    });
    const ditolak = parseInt(state.ditolak || 0);
    
    lblTersedia.textContent = disemaiTotal.toLocaleString('id-ID');
    lblDitolak.textContent = ditolak.toLocaleString('id-ID');
    
    const sisaBenih = previousBalance - ditolak - disemaiTotal;
    lblBelum.textContent = sisaBenih.toLocaleString('id-ID');
    if (sisaBenih < 0) {
      lblBelum.style.color = '#D32F2F';
    } else {
      lblBelum.style.color = '#111111';
    }
  }

  function renderTableRows() {
    tableBody.innerHTML = state.tableRows.map((row, idx) => `
      <div class="table-row" style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 28px; gap: 6px; padding: 6px; border-bottom: 1px solid #E5E7EB; align-items: center; background: #FFFFFF;">
        <select class="sel-bedengan" data-index="${idx}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 4px; outline: none; background: #FFFFFF; font-size: 0.76rem; font-weight: 700; color: #111827; cursor: pointer; padding: 0 4px;">
          ${finalBedenganList.map(b => `<option value="${b.bedenganId}" ${(row.bedenganId === b.bedenganId || row.bedengan === b.name || row.bedengan === b.bedenganCode || row.bedenganCode === b.bedenganCode) ? 'selected' : ''}>${b.bedenganCode || b.name}</option>`).join('')}
        </select>
        <input type="number" class="inp-disemai" data-index="${idx}" value="${row.disemai}" placeholder="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 4px; outline: none; font-size: 0.82rem; font-weight: 700; text-align: center; background: #FFFFFF; color: #111827; padding: 0 4px; box-sizing: border-box;">
        <input type="number" class="inp-polybag" data-index="${idx}" value="${row.polybag}" placeholder="0" readonly style="width: 100%; height: 34px; border: 1px solid #E2E8F0; border-radius: 4px; outline: none; font-size: 0.82rem; font-weight: 600; text-align: center; background: #F8FAFC; color: #4B5563; padding: 0 4px; box-sizing: border-box;">
        <div style="display: flex; justify-content: center; align-items: center;">
          ${state.tableRows.length > 1 ? `
            <button type="button" class="btn-hapus-row" data-index="${idx}" title="Hapus baris" style="background: #FEE2E2; border: 1px solid #FECACA; border-radius: 4px; width: 26px; height: 26px; padding: 0; cursor: pointer; color: #DC2626; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          ` : `
            <button type="button" class="btn-reset-row" data-index="${idx}" title="Kosongkan baris" style="background: transparent; border: none; width: 26px; height: 26px; padding: 0; cursor: pointer; color: #9CA3AF; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          `}
        </div>
      </div>
    `).join('');

    tableBody.querySelectorAll('.sel-bedengan').forEach(el => {
      el.addEventListener('change', (e) => {
        const rowIdx = parseInt(e.target.dataset.index, 10);
        const bedId = e.target.value;
        const bObj = getBedenganById(bedId) || finalBedenganList.find(b => b.bedenganId === bedId);
        if (state.tableRows[rowIdx]) {
          state.tableRows[rowIdx].bedenganId = bObj ? bObj.bedenganId : bedId;
          state.tableRows[rowIdx].bedenganCode = bObj ? bObj.bedenganCode : null;
          state.tableRows[rowIdx].bedengan = bObj ? (bObj.bedenganCode || bObj.name) : bedId;
        }
        validateForm();
      });
    });

    tableBody.querySelectorAll('.sel-klon').forEach(el => {
      el.addEventListener('change', (e) => {
        state.tableRows[e.target.dataset.index].klon = e.target.value;
        e.target.style.color = '#111';
        validateForm();
      });
    });
    tableBody.querySelectorAll('.inp-disemai').forEach(el => {
      el.addEventListener('input', (e) => {
        let val = parseInt(e.target.value || 0);
        if (val < 0) {
          e.target.value = 0;
          val = 0;
        }
        state.tableRows[e.target.dataset.index].disemai = e.target.value;
        const polybagVal = Math.ceil(val / 2);
        state.tableRows[e.target.dataset.index].polybag = polybagVal || '';
        
        // update DOM directly for polybag
        const row = e.target.closest('.table-row') || e.target.closest('div');
        const polybagInput = row.querySelector('.inp-polybag');
        if (polybagInput) {
          polybagInput.value = polybagVal || '';
        }
        
        calculateTotals();
        validateForm();
      });
    });

    // Delete row event listeners
    tableBody.querySelectorAll('.btn-hapus-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        state.tableRows.splice(idx, 1);
        renderTableRows();
        calculateTotals();
        validateForm();
      });
    });

    // Reset single row event listener
    tableBody.querySelectorAll('.btn-reset-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        const defBed = initialBedObj || finalBedenganList[0] || null;
        state.tableRows[idx] = {
          bedenganId: defBed ? defBed.bedenganId : null,
          bedenganCode: defBed ? defBed.bedenganCode : null,
          bedengan: defBed ? (defBed.bedenganCode || defBed.name) : '',
          klon: sourceTx.klon ? normalizeKlonName(sourceTx.klon) : 'GT 1',
          disemai: '',
          polybag: ''
        };
        renderTableRows();
        calculateTotals();
        validateForm();
      });
    });
  }

  function renderPhotos() {
    photoContainer.innerHTML = state.photos.map((p, idx) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: 4px; overflow: hidden; border: 1px solid #D9D9D9;">
        <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
        <button class="btn-hapus-foto" data-index="${idx}" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; padding: 4px; cursor: pointer; color: white;">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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

  // Initial bindings
  if (selectBatch) {
    selectBatch.addEventListener('change', (e) => {
      const chosenId = e.target.value;
      const bObj = getBatchById(chosenId) || getBatchByCode(chosenId);
      state.batchId = bObj ? (bObj.id || bObj.batchId) : chosenId;
      state.batchNo = bObj ? (bObj.batchCode || bObj.batchNo) : chosenId;
      validateForm();
    });
  }

  inputDitolak.addEventListener('input', (e) => {
    let val = parseInt(e.target.value || 0);
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
  
  selectAlasan.addEventListener('change', (e) => {
    state.alasanDitolak = e.target.value;
  });

  btnTambahData.addEventListener('click', () => {
    const defaultBedObj = initialBedObj || finalBedenganList[0] || null;
    state.tableRows.push({
      bedenganId: defaultBedObj ? defaultBedObj.bedenganId : null,
      bedenganCode: defaultBedObj ? defaultBedObj.bedenganCode : null,
      bedengan: defaultBedObj ? (defaultBedObj.bedenganCode || defaultBedObj.name) : 'BED-001',
      klon: sourceTx.klon ? normalizeKlonName(sourceTx.klon) : 'GT 1',
      disemai: '',
      polybag: ''
    });
    renderTableRows();
    validateForm();
  });

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

  app.querySelector('#btn-back').addEventListener('click', () => {
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

  btnKonfirmSimpan.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
    sheetKonfirmasi.style.display = 'none';
    
    // Show banner success and navigate back
    const banner = document.createElement('div');
    banner.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: #689F38; color: white; text-align: center; padding: 12px; font-weight: 600; font-size: 0.95rem; z-index: 1000; transition: top 0.3s ease-out;';
    banner.textContent = 'Data berhasil disimpan';
    app.querySelector('.page').appendChild(banner);
    
    // Simpan ke storage (seeding_transactions)
    const txs = storage.get('seeding_transactions', []);
    let totalDisemai = 0;
    let totalPolybag = 0;
    state.tableRows.forEach(r => {
      const disVal = parseInt(r.disemai || 0);
      totalDisemai += disVal;
      totalPolybag += parseInt(r.polybag || Math.ceil(disVal / 2) || 0);
    });

    const bedenganDisplay = Array.from(new Set((state.tableRows || []).map(r => r.bedengan).filter(Boolean))).join(', ') || 'Bedengan 001';

    const seedingDocNo = (editTx && editTx.docNo) ? editTx.docNo : generateUniqueDocNo('seeding', txs, 2026);

    // Resolve Canonical References
    const batchObj = (state.batchId || state.batchNo) ? (getBatchById(state.batchId) || getBatchByCode(state.batchNo)) : null;
    const finalBatchId = batchObj ? (batchObj.id || batchObj.batchId) : (state.batchId || null);
    const finalBatchCode = batchObj ? (batchObj.batchCode || batchObj.batchNo) : (state.batchNo || null);

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
      return {
        ...r,
        bedenganId: bObj ? bObj.bedenganId : (r.bedenganId || null),
        bedenganCode: bObj ? bObj.bedenganCode : null,
        bedengan: bObj ? bObj.name : r.bedengan
      };
    });

    const newTx = {
      date: today,
      docNo: seedingDocNo,
      sourceDocNo: sourceDocNo,
      sourceIndex: sourceIdx,
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
      totalPolybag: Math.ceil(totalDisemai / 2)
    };

    if (editIdx !== null) {
      txs[editIdx] = newTx;
    } else {
      txs.push(newTx);
    }
    
    storage.set('seeding_transactions', txs);

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
  renderTableRows();
  calculateTotals();
  renderPhotos();
  validateForm();
}
