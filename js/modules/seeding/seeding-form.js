import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate } from '../../core/utils.js';

export function renderSeedingForm() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  // Get source transaction
  const sourceIdx = storage.get('seeding_source_index', null);
  const txs = storage.get('receipt_transactions', []);
  const sourceTx = txs[sourceIdx] || {};
  const docIdxStr = (parseInt(sourceIdx) + 1).toString().padStart(2, '0');
  const docNo = `RCV/SEEDS/2026/AGUS/${docIdxStr}`;

  // Check if we are in Edit mode
  const editIdx = storage.get('editing_seeding_index', null);
  const seedingTxs = storage.get('seeding_transactions', []);
  const editTx = editIdx !== null ? seedingTxs[editIdx] : null;

  // Batch determination
  const defaultBatch = editTx 
    ? (editTx.batchNo || 'Batch-01')
    : (sourceTx.rawState?.batchCode || sourceTx.batchCode || `Batch-${(seedingTxs.filter(s => s.sourceIndex == sourceIdx).length + 1).toString().padStart(2, '0')}`);

  // Form state
  const state = {
    batchNo: defaultBatch,
    ditolak: editTx ? editTx.ditolak : '',
    alasanDitolak: editTx ? editTx.alasanDitolak : 'Tidak Ada',
    tableRows: editTx ? JSON.parse(JSON.stringify(editTx.rows)) : [
      { bedengan: '', klon: sourceTx.klon || 'GT-01', disemai: '', polybag: '' }
    ],
    photos: editTx ? JSON.parse(JSON.stringify(editTx.photos)) : []
  };

  const batchList = ['Batch-01', 'Batch-02', 'Batch-03', 'Batch-04', 'Batch-05', 'Batch-06', 'Batch-07', 'Batch-08', 'Batch-09', 'Batch-10'];
  if (!batchList.includes(state.batchNo)) {
    batchList.unshift(state.batchNo);
  }

  const klonList = ['GT-01', 'PB-235', 'PB-260', 'PB-330', 'RRIM-600', 'IRR-300', 'BPM-24', 'PR-261'];
  const bedenganList = Array.from({length: 10}, (_, i) => `Bedengan ${(i + 1).toString().padStart(2, '0')}`);
  
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
        
        <!-- INFORMASI MANTRI & TANGGAL -->
        <section style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 16px; border-bottom: 1px solid #D9D9D9; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-size: 0.88rem; font-weight: 700; color: #111111; margin-bottom: 2px;">${user.name}</div>
            <div style="font-size: 0.74rem; color: #6B7280; line-height: 1.3;">${user.code}-${user.position}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.74rem; font-weight: 600; color: #555555; margin-bottom: 2px;">Tanggal Penyemaian</div>
            <div style="font-size: 0.85rem; color: #111111; font-weight: 700;">${today}</div>
          </div>
        </section>

        <!-- RINCIAN PENYEMAIAN -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #D9D9D9;">
          <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Rincian Penyemaian</h2>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 0.78rem; color: #555555;">Jenis Bibitan</span>
            <span style="font-size: 0.82rem; font-weight: 600; color: #222222;">Green Budding</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 0.78rem; color: #555555;">Tahapan Pertumbuhan</span>
            <span style="font-size: 0.82rem; font-weight: 600; color: #222222;">${sourceTx.tahapan || 'Rubber Main Nursery'}</span>
          </div>
          
          <div style="margin-bottom: 4px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #111111; margin-bottom: 6px;">Pilih Program Pembibitan</label>
            <div style="background: #F3F4F6; padding: 8px 10px; border-radius: 4px; border: 1px solid #D1D5DB;">
              <span style="color: #116834; font-weight: 700; font-size: 0.78rem;">${sourceTx.program || 'PRG/NUR/01/2026'}</span>
              <span style="color: #374151; font-size: 0.78rem;"> - Pembibitan Karet 2026</span>
            </div>
          </div>
        </section>

        <!-- KLON & TOTAL -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #D9D9D9;">
          <div style="display: grid; grid-template-columns: 0.85fr 1fr 1.45fr; gap: 6px; text-align: center; align-items: flex-end;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 600; color: #555555; margin-bottom: 6px;">Klon Awal</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #111111; height: 30px; display: flex; align-items: center; justify-content: center;">${sourceTx.klon || 'GT-01'}</div>
            </div>
            <div>
              <div style="font-size: 0.72rem; font-weight: 600; color: #555555; margin-bottom: 6px;">Total Penerimaan</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #111111; height: 30px; display: flex; align-items: center; justify-content: center;">${totalPenerimaan}</div>
            </div>
            <div>
              <div style="font-size: 0.72rem; font-weight: 600; color: #555555; margin-bottom: 6px; line-height: 1.15;">Banyaknya<br>Ditolak/Seleksi</div>
              <div style="display: flex; align-items: center; border: 1px solid #D1D5DB; border-radius: 4px; height: 30px; background: #FFFFFF; overflow: hidden;">
                <input type="number" id="input-ditolak" value="${state.ditolak}" placeholder="0" style="width: 36px; border: none; outline: none; padding: 0 2px; text-align: center; font-size: 0.76rem; font-weight: 600; color: #111111; background: transparent;">
                <div style="width: 1px; height: 18px; background: #D1D5DB; flex-shrink: 0;"></div>
                <select id="select-alasan" style="flex: 1; min-width: 0; border: none; outline: none; background: transparent; padding: 0 4px; font-size: 0.74rem; color: #374151; cursor: pointer;" ${(!state.ditolak || parseInt(state.ditolak) === 0) ? 'disabled' : ''}>
                  <option value="Tidak Ada" ${state.alasanDitolak === 'Tidak Ada' || !state.ditolak || parseInt(state.ditolak) === 0 ? 'selected' : ''}>Tidak Ada</option>
                  <option value="Rusak" ${state.alasanDitolak === 'Rusak' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Rusak</option>
                  <option value="Mati" ${state.alasanDitolak === 'Mati' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Mati</option>
                  <option value="Lainnya" ${state.alasanDitolak === 'Lainnya' && parseInt(state.ditolak) > 0 ? 'selected' : ''}>Lainnya</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- DETAIL PENYEMAIAN -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #D9D9D9;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0;">Detail Penyemaian</h2>
            <button id="btn-tambah-data" type="button" style="background: #116834; color: white; border: none; border-radius: 4px; padding: 4px 10px; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Tambah Data
            </button>
          </div>
          
          <div style="background: #E8F5E9; padding: 8px 6px; display: grid; grid-template-columns: 1.4fr 1fr 0.9fr 24px; gap: 6px; border: 1px solid #C8E6C9; border-bottom: none; text-align: center; align-items: center;">
            <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">No. Bedengan</div>
            <!-- <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">Klon Baru</div> -->
            <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">Bibit Disemai</div>
            <div style="font-size: 0.68rem; font-weight: 700; color: #116834;">Jlh Polybag</div>
            <div></div>
          </div>
          
          <div id="table-body" style="border-left: 1px solid #C8E6C9; border-right: 1px solid #C8E6C9;">
            <!-- rows -->
          </div>
          
          <div style="background: #E8F5E9; padding: 10px 12px; border: 1px solid #C8E6C9; border-top: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-size: 0.74rem; font-weight: 700; color: #116834;">Nomor Batch</span>
              <select id="select-batch" style="font-size: 0.75rem; font-weight: 700; color: #111111; border: 1px solid #A5D6A7; background: #FFFFFF; border-radius: 4px; padding: 2px 6px; outline: none; cursor: pointer;">
                ${batchList.map(b => `<option value="${b}" ${state.batchNo === b ? 'selected' : ''}>${b}</option>`).join('')}
              </select>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="font-size: 0.74rem; font-weight: 700; color: #116834;">Bibit Tersedia</span>
              <span id="lbl-tersedia" style="font-size: 0.78rem; font-weight: 700; color: #111111;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="font-size: 0.74rem; font-weight: 700; color: #116834;">Banyaknya Ditolak/Seleksi</span>
              <span id="lbl-ditolak" style="font-size: 0.78rem; font-weight: 700; color: #111111;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 0.74rem; font-weight: 700; color: #116834;">Bibit Belum Diseleksi</span>
              <span id="lbl-belum" style="font-size: 0.78rem; font-weight: 700; color: #D32F2F;">${previousBalance}</span>
            </div>
          </div>
        </section>

        <!-- TAMBAH FOTO -->
        <section style="padding: 14px 16px;">
          <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0 0 6px 0;">Tambah Foto</h2>
          <p style="font-size: 0.74rem; color: #6B7280; margin: 0 0 12px 0; line-height: 1.35;">
            Praktik terbaik adalah menyertakan foto jarak dekat untuk detail Item dan foto jarak jauh untuk konteks area yang terpengaruh.
          </p>
          
          <div id="photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;"></div>

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

      <!-- BOTTOM ACTION -->
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
    
    lblTersedia.textContent = disemaiTotal;
    lblDitolak.textContent = ditolak;
    
    const belumDiseleksi = previousBalance - ditolak - disemaiTotal;
    lblBelum.textContent = belumDiseleksi;
    if (belumDiseleksi < 0 || belumDiseleksi > 0) {
      lblBelum.style.color = '#D32F2F';
    } else {
      lblBelum.style.color = '#111111';
    }
  }

  function renderTableRows() {
    tableBody.innerHTML = state.tableRows.map((row, idx) => `
      <div style="display: grid; grid-template-columns: 1.4fr 1fr 0.9fr 24px; gap: 6px; padding: 6px; border-bottom: 1px solid #E5E7EB; align-items: center;">
        <select class="sel-bedengan" data-index="${idx}" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.72rem; text-overflow: ellipsis; padding: 3px 0; color: ${row.bedengan ? '#111111' : '#6B7280'}; cursor: pointer;">
          <option value="" disabled ${!row.bedengan ? 'selected' : ''}>Pilih</option>
          ${bedenganList.map(b => `<option value="${b}" ${row.bedengan === b ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
        <!-- 
        <select class="sel-klon" data-index="${idx}" style="width: 100%; border: none; outline: none; background: transparent; font-size: 0.72rem; text-overflow: ellipsis; padding: 3px 0; color: ${row.klon ? '#111111' : '#6B7280'}; cursor: pointer;">
          <option value="" disabled ${!row.klon ? 'selected' : ''}>Pilih</option>
          ${klonList.map(k => `<option value="${k}" ${row.klon === k ? 'selected' : ''}>${k}</option>`).join('')}
        </select>
        -->
        <input type="number" class="inp-disemai" data-index="${idx}" value="${row.disemai}" placeholder="0" style="width: 100%; border: none; outline: none; font-size: 0.75rem; font-weight: 600; text-align: center; background: transparent; color: #111111; padding: 3px 0;">
        <input type="number" class="inp-polybag" data-index="${idx}" value="${row.polybag}" placeholder="0" readonly style="width: 100%; border: none; outline: none; font-size: 0.75rem; font-weight: 600; text-align: center; background: transparent; color: #4B5563; padding: 3px 0;">
        <div style="display: flex; justify-content: center; align-items: center;">
          ${state.tableRows.length > 1 ? `
            <button type="button" class="btn-hapus-row" data-index="${idx}" title="Hapus baris" style="background: #FEE2E2; border: 1px solid #FECACA; border-radius: 3px; width: 20px; height: 20px; padding: 0; cursor: pointer; color: #DC2626; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          ` : `
            <button type="button" class="btn-reset-row" data-index="${idx}" title="Kosongkan baris" style="background: transparent; border: none; width: 20px; height: 20px; padding: 0; cursor: pointer; color: #9CA3AF; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
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
        state.tableRows[e.target.dataset.index].bedengan = e.target.value;
        e.target.style.color = '#111';
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
        const row = e.target.closest('div');
        row.querySelector('.inp-polybag').value = polybagVal || '';
        
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
        state.tableRows[idx] = { bedengan: '', klon: sourceTx.klon || 'GT-01', disemai: '', polybag: '' };
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
      state.batchNo = e.target.value;
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
    state.tableRows.push({ bedengan: '', klon: sourceTx.klon || 'GT-01', disemai: '', polybag: '' });
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
      totalDisemai += parseInt(r.disemai || 0);
      totalPolybag += parseInt(r.polybag || 0);
    });

    const newTx = {
      date: today,
      docNo: docNo,
      sourceIndex: sourceIdx,
      batchNo: state.batchNo || 'Batch-01',
      program: sourceTx.program || 'PRG/NUR/01/2026',
      tahapan: sourceTx.tahapan || 'Rubber Main Nursery',
      klonAwal: sourceTx.klon || 'GT-01',
      totalPenerimaan,
      ditolak: state.ditolak,
      alasanDitolak: state.alasanDitolak,
      rows: state.tableRows,
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

    setTimeout(() => {
      navigate('/seeding');
    }, 1000);
  });

  // Render initial
  renderTableRows();
  calculateTotals();
  renderPhotos();
  validateForm();
}
