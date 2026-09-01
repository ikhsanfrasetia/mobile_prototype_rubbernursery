import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate } from '../../core/utils.js';

export function renderInspectionForm() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  // Edit Mode Check
  const editingIdx = storage.get('editing_inspection_index', null);
  const isEditing = editingIdx !== null && editingIdx !== undefined && editingIdx !== '';
  const inspectionTxs = storage.get('inspection_transactions', []);
  const targetInsp = isEditing ? inspectionTxs[parseInt(editingIdx)] : null;

  // Selected budding transaction (supports both Grafting and Regrafting)
  const buddingTxs = storage.get('budding_transactions', []);
  const buddingIdx = storage.get('selected_inspection_budding_index', 0);
  const selectedBudding = buddingTxs[buddingIdx] || {
    batchNo: 'Batch-01',
    docNo: 'OKL/2026/01',
    sourceDocNo: 'RCV/SEEDS/2026/AGUS/01',
    type: 'GRAFTING',
    klonEntres: 'PB 260',
    klonRootstock: 'GT-01',
    bedengan: 'Bedengan 01',
    jumlah: 2000,
    tanggal: today,
    workers: [
      { id: 'W001', name: 'Ahmad Rifai', code: '104521', qty: 2000 }
    ]
  };

  const isRegrafting = selectedBudding.type === 'REGRAFTING';
  const batchNo = selectedBudding.batchNo || 'Batch-01';
  const docNo = selectedBudding.docNo || (isRegrafting ? 'OKL/REG/2026/01' : 'OKL/2026/01');
  const populasiDiokulasi = parseInt(selectedBudding.jumlah || 0);

  // Workers who performed grafting
  let workerList = selectedBudding.workers || [];
  if (workerList.length === 0) {
    workerList = [
      { id: 'W001', name: 'Ahmad Rifai', code: '104521', qty: populasiDiokulasi }
    ];
  }

  // Accumulated inspection stats for this budding record (excluding this transaction if editing)
  let alreadyInspected = 0;
  inspectionTxs.filter((insp, i) => {
    if (isEditing && i === parseInt(editingIdx)) return false;
    return insp.buddingDocNo === docNo || insp.buddingIndex === parseInt(buddingIdx) || (insp.batchNo === batchNo && (insp.buddingType === selectedBudding.type || (!insp.buddingType && !isRegrafting)));
  }).forEach(insp => {
    alreadyInspected += parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
  });

  const sisaBelumDiperiksa = Math.max(0, populasiDiokulasi - alreadyInspected);

  // Validasi: Jika status sudah selesai diperiksa dan bukan edit mode, blokir form dan redirect
  if (!isEditing && sisaBelumDiperiksa <= 0) {
    navigate('/inspection');
    return;
  }

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow-x: hidden; box-sizing: border-box; position: relative;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">
          ${isEditing ? 'Edit Pemeriksaan Okulasi' : 'Rekam Pemeriksaan Okulasi'}
        </h1>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 24px; box-sizing: border-box;">
        
        <!-- INFORMASI MANTRI & TANGGAL -->
        <section style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 16px; border-bottom: 1px solid #E5E7EB; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.88rem; font-weight: 700; color: #111111; margin-bottom: 2px;">${user.name}</div>
            <div style="font-size: 0.74rem; color: #6B7280;">${user.code}-${user.position}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.72rem; font-weight: 600; color: #6B7280; margin-bottom: 2px;">Tanggal Pemeriksaan</div>
            <div style="font-size: 0.85rem; color: #111111; font-weight: 700;">${isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today}</div>
          </div>
        </section>

        <!-- INFORMASI BATCH OKULASI ASAL -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0;">Informasi Batch Okulasi</h2>
              <span style="background: ${isRegrafting ? '#FFF8E1' : '#E8F5E9'}; color: ${isRegrafting ? '#B45309' : '#116834'}; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: ${isRegrafting ? '1px solid #FFE082' : '1px solid #C8E6C9'}; white-space: nowrap;">
                ${isRegrafting ? 'Okulasi Janda (Regrafting)' : 'Okulasi (Grafting)'}
              </span>
            </div>
            ${isEditing ? `
              <span style="background: #E0F2FE; color: #0284C7; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; border: 1px solid #BAE6FD;">
                Mode Edit (${targetInsp?.docNo || 'INSP'})
              </span>
            ` : ''}
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 0.76rem;">
            <div>
              <span style="color: #6B7280;">Nomor Batch:</span>
              <div style="font-weight: 700; color: #116834; font-size: 0.84rem; margin-top: 1px;">${batchNo}</div>
            </div>
            <div>
              <span style="color: #6B7280;">Dokumen Okulasi:</span>
              <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px; word-break: break-all;">${docNo}</div>
            </div>
            <div>
              <span style="color: #6B7280;">Klon Entres:</span>
              <div style="font-weight: 700; color: #116834; font-size: 0.84rem; margin-top: 1px;">${selectedBudding.klonEntres || 'PB 260'}</div>
            </div>
            <div>
              <span style="color: #6B7280;">Lokasi Bedengan:</span>
              <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px;">${selectedBudding.bedengan || 'Bedengan 01'}</div>
            </div>
            <div>
              <span style="color: #6B7280;">${isRegrafting ? 'Populasi Regrafting' : 'Populasi Diokulasi'}:</span>
              <div style="font-weight: 700; color: #111; font-size: 0.84rem; margin-top: 1px;">${populasiDiokulasi} Pkk</div>
            </div>
            <div>
              <span style="color: #6B7280;">Sisa Belum Diperiksa:</span>
              <div style="font-weight: 800; color: #116834; font-size: 0.84rem; margin-top: 1px;">${sisaBelumDiperiksa} Pkk</div>
            </div>
            ${isRegrafting ? `
              <div style="grid-column: span 2; padding-top: 4px; border-top: 1px dashed #E5E7EB;">
                <span style="color: #6B7280;">Dokumen Alokasi Pool / Pemeriksaan Asal:</span>
                <div style="font-weight: 700; color: #374151; margin-top: 1px;">${selectedBudding.regraftPoolDocNo || '-'} (Asal: ${selectedBudding.inspectionDocNo || '-'})</div>
              </div>
            ` : ''}
          </div>
        </section>

        <!-- DAFTAR OKULATOR & HASIL PEMERIKSAAN -->
        <section style="padding: 16px;">
          <div style="margin-bottom: 12px;">
            <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0 0 4px 0;">Hasil Pemeriksaan per Okulator</h2>
            <p style="font-size: 0.72rem; color: #666666; margin: 0; line-height: 1.35;">
              Masukkan jumlah bibit yang diperiksa, jumlah berhasil (mata hijau segar), dan tidak berhasil (mata hitam/kering).
            </p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${workerList.map(w => {
              const initW = (isEditing && targetInsp?.workers) ? targetInsp.workers.find(tw => tw.id === w.id || tw.name === w.name) : null;
              const initDiperiksa = initW ? initW.jlhDiperiksa : '';
              const initBerhasil = initW ? initW.jlhBerhasil : '';
              const initGagal = initW ? initW.jlhTidakBerhasil : '';
              const initRegraft = initW ? (initW.perluRegrafting !== false) : true;
              return `
                <div class="worker-inspection-card" data-id="${w.id}" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                  
                  <!-- WORKER HEADER: NAMA, NIK, & TOTAL DIOKULASI -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB;">
                    <div>
                      <div style="font-size: 0.84rem; font-weight: 700; color: #111827;">${w.name}</div>
                      <div style="font-size: 0.72rem; color: #6B7280; margin-top: 1px;">NIK: ${w.code || '-'}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.68rem; color: #6B7280; font-weight: 600;">Total Diokulasi:</div>
                      <div style="font-size: 0.86rem; font-weight: 800; color: #116834;">${w.qty || 0} Pkk</div>
                    </div>
                  </div>

                  <!-- INPUT 3 KOLOM: JLH DIPERIKSA, JLH BERHASIL, JLH TIDAK BERHASIL -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; align-items: end;">
                    <div>
                      <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #374151; margin-bottom: 4px; text-align: center; height: 18px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        Jlh Diperiksa <span style="color:#D32F2F;">*</span>
                      </label>
                      <input type="number" class="inp-insp-diperiksa" data-id="${w.id}" data-max="${w.qty || 0}" maxlength="${String(w.qty || 0).length}" placeholder="0" min="0" max="${w.qty || 0}" value="${initDiperiksa !== '' && initDiperiksa !== undefined ? initDiperiksa : ''}" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 0 4px; font-size: 0.82rem; font-weight: 700; text-align: center; outline: none; box-sizing: border-box; background: #FFFFFF; color: #111;">
                    </div>
                    <div>
                      <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #116834; margin-bottom: 4px; text-align: center; height: 18px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        Jlh Berhasil <span style="color:#D32F2F;">*</span>
                      </label>
                      <input type="number" class="inp-insp-berhasil" data-id="${w.id}" data-max="${w.qty || 0}" maxlength="${String(w.qty || 0).length}" placeholder="0" min="0" max="${w.qty || 0}" value="${initBerhasil !== '' && initBerhasil !== undefined ? initBerhasil : ''}" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 0 4px; font-size: 0.82rem; font-weight: 700; color: #116834; text-align: center; outline: none; box-sizing: border-box; background: #FFFFFF;">
                    </div>
                    <div>
                      <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #D32F2F; margin-bottom: 4px; text-align: center; height: 18px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        Tdk Berhasil <span style="color:#D32F2F;">*</span>
                      </label>
                      <input type="number" class="inp-insp-gagal" data-id="${w.id}" data-max="${w.qty || 0}" maxlength="${String(w.qty || 0).length}" placeholder="0" min="0" max="${w.qty || 0}" value="${initGagal !== '' && initGagal !== undefined ? initGagal : ''}" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 0 4px; font-size: 0.82rem; font-weight: 700; color: #D32F2F; text-align: center; outline: none; box-sizing: border-box; background: #FFFFFF;">
                    </div>
                  </div>

                  <!-- PERSENTASE KEBERHASILAN PEKERJA -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #E5E7EB;">
                    <span style="font-size: 0.70rem; color: #6B7280; font-weight: 600;">% Keberhasilan Okulator:</span>
                    <span class="lbl-worker-persen" data-id="${w.id}" style="font-size: 0.78rem; font-weight: 800; color: #116834; background: #E8F5E9; padding: 2px 8px; border-radius: 4px; border: 1px solid #C8E6C9;">0%</span>
                  </div>

                  <!-- CHECKBOX PERLU OKULASI JANDA JIKA ADA TIDAK BERHASIL -->
                  <div class="regrafting-toggle-container" data-id="${w.id}" style="display: none; margin-top: 8px; padding: 6px 10px; background: #FFFDE7; border: 1px solid #FFE082; border-radius: 6px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.72rem; font-weight: 700; color: #374151; user-select: none;">
                        <input type="checkbox" class="chk-regrafting" data-id="${w.id}" ${initRegraft ? 'checked' : ''} style="width: 15px; height: 15px; accent-color: #116834; cursor: pointer;">
                        <span>Perlu Okulasi Janda</span>
                      </label>
                      <span class="lbl-allocation-badge" data-id="${w.id}" style="font-size: 0.68rem; font-weight: 700; color: #116834; background: #E8F5E9; padding: 2px 6px; border-radius: 4px; border: 1px solid #C8E6C9; white-space: nowrap;">
                        ➔ Okulasi Janda
                      </span>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>

          <!-- REKAP KESELURUHAN HASIL PEMERIKSAAN -->
          <div style="background: #F0FDF4; border: 1px solid #C8E6C9; border-radius: 8px; padding: 12px; margin-top: 14px;">
            <div style="font-size: 0.76rem; font-weight: 700; color: #116834; margin-bottom: 8px;">Ringkasan Total Pemeriksaan:</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.74rem;">
              <span style="color: #4B5563;">Total Jlh Diperiksa:</span>
              <span id="lbl-total-diperiksa" style="font-weight: 800; color: #111;">0 Pkk</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.74rem;">
              <span style="color: #116834; font-weight: 600;">Total Jlh Berhasil:</span>
              <span id="lbl-total-berhasil" style="font-weight: 800; color: #116834;">0 Pkk (0%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.74rem;">
              <span style="color: #D32F2F; font-weight: 600;">Total Jlh Tidak Berhasil:</span>
              <span id="lbl-total-gagal" style="font-weight: 800; color: #D32F2F;">0 Pkk (0%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px dashed #A7F3D0;">
              <span style="font-size: 0.76rem; font-weight: 700; color: #116834;">Tingkat Keberhasilan Batch:</span>
              <span id="lbl-persen-total" style="font-size: 0.95rem; font-weight: 800; color: #116834;">0%</span>
            </div>
            <div id="lbl-regrafting-note" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FFF8E1; border: 1px solid #FFE082; border-radius: 4px; font-size: 0.70rem; color: #374151; font-weight: 600; line-height: 1.3;">
            </div>
          </div>

          <!-- CATATAN PEMERIKSAAN -->
          <div style="margin-top: 14px;">
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #374151; margin-bottom: 6px;">Catatan / Kondisi Bibit</label>
            <textarea id="inp-catatan" placeholder="Contoh: Kondisi mata entres sehat, balutan dibuka dengan baik..." style="width: 100%; height: 60px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 8px 10px; font-size: 0.78rem; outline: none; box-sizing: border-box; resize: none;">${targetInsp?.catatan || ''}</textarea>
          </div>

        </section>

      </main>

      <!-- BOTTOM ACTION -->
      <footer style="padding: 14px 16px; background: #FFFFFF; border-top: 1px solid #D9D9D9; flex-shrink: 0; box-sizing: border-box;">
        <button id="btn-simpan-pemeriksaan" type="button" style="width: 100%; height: 44px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.90rem; cursor: pointer;">
          ${isEditing ? 'Simpan Perubahan Pemeriksaan' : 'Simpan Data Pemeriksaan'}
        </button>
      </footer>

      <!-- MODAL OVERLAY & DIALOG VALIDASI -->
      <div id="modal-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>
      <div id="dialog-validation" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; z-index: 102; padding: 20px 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); box-sizing: border-box; text-align: center;">
        <div style="width: 46px; height: 46px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: 1rem; font-weight: 700; color: #111827; margin: 0 0 6px 0;">Data Belum Lengkap</h3>
        <p style="font-size: 0.74rem; color: #6B7280; margin: 0 0 12px 0; line-height: 1.35;">
          Mohon lengkapi dan periksa kolom yang masih kosong atau belum valid berikut ini:
        </p>
        <div id="dialog-error-list" style="text-align: left; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; font-size: 0.72rem; color: #B91C1C; display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto;">
        </div>
        <button id="btn-close-validation-dialog" type="button" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
          Lengkapi Data
        </button>
      </div>

    </div>
  `;

  const overlay = app.querySelector('#modal-overlay');
  const dialogValidation = app.querySelector('#dialog-validation');
  const dialogErrorList = app.querySelector('#dialog-error-list');
  const btnCloseValidationDialog = app.querySelector('#btn-close-validation-dialog');

  function showValidationErrorDialog(errors) {
    if (dialogErrorList) {
      dialogErrorList.innerHTML = errors.map((err, i) => `
        <div style="display: flex; align-items: flex-start; gap: 6px;">
          <span style="font-weight: 700;">${i + 1}.</span>
          <span style="line-height: 1.3;">${err}</span>
        </div>
      `).join('');
    }
    overlay.style.display = 'block';
    dialogValidation.style.display = 'block';
  }

  function closeValidationDialog() {
    dialogValidation.style.display = 'none';
    overlay.style.display = 'none';
  }

  btnCloseValidationDialog.addEventListener('click', closeValidationDialog);
  overlay.addEventListener('click', closeValidationDialog);

  // Helper to sanitize, clamp max digits and clamp max value
  function sanitizeInput(inp, maxVal) {
    let raw = (inp.value || '').replace(/[^0-9]/g, '');
    if (raw === '') return '';
    const maxDigits = String(maxVal).length;
    if (raw.length > maxDigits) {
      raw = raw.slice(0, maxDigits);
    }
    let num = parseInt(raw);
    if (num > maxVal) {
      num = maxVal;
      raw = String(maxVal);
    }
    inp.value = raw;
    return raw;
  }

  // Real-time calculation per worker and overall
  function updateWorkerCalculations() {
    let grandDiperiksa = 0;
    let grandBerhasil = 0;
    let grandGagal = 0;
    let totalToRegrafting = 0;
    let totalToSelection = 0;

    app.querySelectorAll('.worker-inspection-card').forEach(card => {
      const wid = card.dataset.id;
      const targetWorker = workerList.find(w => w.id === wid);
      const wMax = parseInt(targetWorker?.qty || 0);

      const inpDiperiksa = card.querySelector('.inp-insp-diperiksa');
      const inpBerhasil = card.querySelector('.inp-insp-berhasil');
      const inpGagal = card.querySelector('.inp-insp-gagal');
      const lblPersen = card.querySelector('.lbl-worker-persen');
      const regraftToggleContainer = card.querySelector('.regrafting-toggle-container');
      const chkRegrafting = card.querySelector('.chk-regrafting');
      const destBadge = card.querySelector('.lbl-allocation-badge');

      const diperiksaVal = inpDiperiksa?.value.trim();
      const berhasilVal = inpBerhasil?.value.trim();
      const gagalVal = inpGagal?.value.trim();

      const diperiksa = parseInt(diperiksaVal || 0);
      const berhasil = parseInt(berhasilVal || 0);
      const gagal = parseInt(gagalVal || 0);

      // Highlight boundary errors
      if (diperiksa > wMax && wMax > 0) {
        inpDiperiksa.style.borderColor = '#D32F2F';
        inpDiperiksa.style.color = '#D32F2F';
      } else {
        inpDiperiksa.style.borderColor = '#D1D5DB';
        inpDiperiksa.style.color = '#111111';
      }

      if (diperiksaVal !== '' && berhasilVal !== '' && gagalVal !== '' && (berhasil + gagal !== diperiksa)) {
        inpBerhasil.style.borderColor = '#D32F2F';
        inpGagal.style.borderColor = '#D32F2F';
      } else {
        inpBerhasil.style.borderColor = '#D1D5DB';
        inpGagal.style.borderColor = '#D1D5DB';
      }

      grandDiperiksa += diperiksa;
      grandBerhasil += berhasil;
      grandGagal += gagal;

      // Checkbox visibility & allocation badge
      if (gagal > 0) {
        if (regraftToggleContainer) regraftToggleContainer.style.display = 'block';
        if (chkRegrafting?.checked) {
          totalToRegrafting += gagal;
          if (destBadge) {
            destBadge.textContent = '➔ Okulasi Janda';
            destBadge.style.background = '#E8F5E9';
            destBadge.style.color = '#116834';
            destBadge.style.borderColor = '#C8E6C9';
          }
        } else {
          totalToSelection += gagal;
          if (destBadge) {
            destBadge.textContent = '➔ Penyeleksian (Afkir)';
            destBadge.style.background = '#FEE2E2';
            destBadge.style.color = '#B91C1C';
            destBadge.style.borderColor = '#FCA5A5';
          }
        }
      } else {
        if (regraftToggleContainer) regraftToggleContainer.style.display = 'none';
      }

      if (diperiksa > 0) {
        const p = Math.round((berhasil / diperiksa) * 100);
        lblPersen.textContent = `${p}% Berhasil`;
        if (p >= 85) {
          lblPersen.style.background = '#E8F5E9';
          lblPersen.style.color = '#116834';
          lblPersen.style.borderColor = '#C8E6C9';
        } else {
          lblPersen.style.background = '#FFF8E1';
          lblPersen.style.color = '#F57F17';
          lblPersen.style.borderColor = '#FFE082';
        }
      } else {
        lblPersen.textContent = `0%`;
        lblPersen.style.background = '#E8F5E9';
        lblPersen.style.color = '#116834';
        lblPersen.style.borderColor = '#C8E6C9';
      }
    });

    const lblTotalDiperiksa = app.querySelector('#lbl-total-diperiksa');
    const lblTotalBerhasil = app.querySelector('#lbl-total-berhasil');
    const lblTotalGagal = app.querySelector('#lbl-total-gagal');
    const lblPersenTotal = app.querySelector('#lbl-persen-total');
    const regraftingNote = app.querySelector('#lbl-regrafting-note');

    if (grandDiperiksa > sisaBelumDiperiksa && sisaBelumDiperiksa > 0) {
      if (lblTotalDiperiksa) {
        lblTotalDiperiksa.innerHTML = `<span style="color: #D32F2F;">${grandDiperiksa} Pkk (Maks ${sisaBelumDiperiksa} Pkk)</span>`;
      }
    } else {
      if (lblTotalDiperiksa) lblTotalDiperiksa.textContent = `${grandDiperiksa} Pkk`;
    }

    if (grandDiperiksa > 0) {
      const persenBerhasil = Math.round((grandBerhasil / grandDiperiksa) * 100);
      const persenGagal = Math.round((grandGagal / grandDiperiksa) * 100);

      if (lblTotalBerhasil) lblTotalBerhasil.textContent = `${grandBerhasil} Pkk (${persenBerhasil}%)`;
      if (lblTotalGagal) lblTotalGagal.textContent = `${grandGagal} Pkk (${persenGagal}%)`;
      if (lblPersenTotal) lblPersenTotal.textContent = `${persenBerhasil}%`;

      if (grandGagal > 0 && regraftingNote) {
        regraftingNote.style.display = 'block';
        let msg = '';
        if (totalToRegrafting > 0) {
          msg += `<div>• <strong>${totalToRegrafting} Pkk</strong> dialokasikan ke tahap <strong>Okulasi Janda (Regrafting)</strong>.</div>`;
        }
        if (totalToSelection > 0) {
          msg += `<div>• <strong>${totalToSelection} Pkk</strong> dialokasikan ke tahap <strong>Penyeleksian (Afkir/Pengurangan Stok)</strong>.</div>`;
        }
        regraftingNote.innerHTML = `<strong>Alokasi Bibit Tidak Berhasil (${grandGagal} Pkk):</strong>${msg}`;
      } else if (regraftingNote) {
        regraftingNote.style.display = 'none';
      }
    } else {
      if (lblTotalBerhasil) lblTotalBerhasil.textContent = `0 Pkk (0%)`;
      if (lblTotalGagal) lblTotalGagal.textContent = `0 Pkk (0%)`;
      if (lblPersenTotal) lblPersenTotal.textContent = `0%`;
      if (regraftingNote) regraftingNote.style.display = 'none';
    }

    return { grandDiperiksa, grandBerhasil, grandGagal, totalToRegrafting, totalToSelection };
  }

  // Attach input listeners with strict clamping and smart auto-calculation
  app.querySelectorAll('.worker-inspection-card').forEach(card => {
    const wid = card.dataset.id;
    const targetWorker = workerList.find(w => w.id === wid);
    const wMax = parseInt(targetWorker?.qty || 0);

    const inpDiperiksa = card.querySelector('.inp-insp-diperiksa');
    const inpBerhasil = card.querySelector('.inp-insp-berhasil');
    const inpGagal = card.querySelector('.inp-insp-gagal');
    const chkRegrafting = card.querySelector('.chk-regrafting');

    inpDiperiksa.addEventListener('input', () => {
      const dVal = sanitizeInput(inpDiperiksa, wMax);
      if (dVal !== '') {
        const d = parseInt(dVal);
        let b = parseInt(inpBerhasil.value || 0);
        if (b > d) {
          inpBerhasil.value = d;
          b = d;
        }
        if (inpBerhasil.value.trim() !== '') {
          inpGagal.value = Math.max(0, d - b);
        }
      }
      updateWorkerCalculations();
    });

    inpBerhasil.addEventListener('input', () => {
      const dVal = inpDiperiksa.value.trim();
      const currentLimit = dVal !== '' ? parseInt(dVal) : wMax;
      const bVal = sanitizeInput(inpBerhasil, currentLimit);
      
      if (dVal !== '' && bVal !== '') {
        const d = parseInt(dVal);
        const b = parseInt(bVal);
        inpGagal.value = Math.max(0, d - b);
      }
      updateWorkerCalculations();
    });

    inpGagal.addEventListener('input', () => {
      const dVal = inpDiperiksa.value.trim();
      const currentLimit = dVal !== '' ? parseInt(dVal) : wMax;
      const gVal = sanitizeInput(inpGagal, currentLimit);
      
      if (dVal !== '' && gVal !== '') {
        const d = parseInt(dVal);
        const g = parseInt(gVal);
        inpBerhasil.value = Math.max(0, d - g);
      }
      updateWorkerCalculations();
    });

    if (chkRegrafting) {
      chkRegrafting.addEventListener('change', updateWorkerCalculations);
    }
  });

  updateWorkerCalculations();

  // Back button
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/inspection');
  });

  // Save button with multi-worker validation and routing to Regrafting / Selection
  app.querySelector('#btn-simpan-pemeriksaan').addEventListener('click', () => {
    const { grandDiperiksa, grandBerhasil, grandGagal, totalToRegrafting, totalToSelection } = updateWorkerCalculations();
    const catatan = app.querySelector('#inp-catatan')?.value || '';

    const validationErrors = [];
    const inspectedWorkersData = [];

    app.querySelectorAll('.worker-inspection-card').forEach(card => {
      const wid = card.dataset.id;
      const targetWorker = workerList.find(w => w.id === wid);
      const wName = targetWorker?.name || 'Pekerja';
      const wMax = parseInt(targetWorker?.qty || 0);

      const inpDiperiksa = card.querySelector('.inp-insp-diperiksa');
      const inpBerhasil = card.querySelector('.inp-insp-berhasil');
      const inpGagal = card.querySelector('.inp-insp-gagal');
      const chkRegrafting = card.querySelector('.chk-regrafting');

      const valDiperiksa = (inpDiperiksa?.value || '').trim();
      const valBerhasil = (inpBerhasil?.value || '').trim();
      const valGagal = (inpGagal?.value || '').trim();

      if (valDiperiksa === '') {
        validationErrors.push(`Kolom "Jlh Diperiksa" untuk ${wName} masih kosong.`);
      }
      if (valBerhasil === '') {
        validationErrors.push(`Kolom "Jlh Berhasil" untuk ${wName} masih kosong.`);
      }
      if (valGagal === '') {
        validationErrors.push(`Kolom "Tdk Berhasil" untuk ${wName} masih kosong.`);
      }

      const numDiperiksa = parseInt(valDiperiksa || 0);
      const numBerhasil = parseInt(valBerhasil || 0);
      const numGagal = parseInt(valGagal || 0);

      if (valDiperiksa !== '' && numDiperiksa > wMax && wMax > 0) {
        validationErrors.push(`Jlh Diperiksa untuk ${wName} (${numDiperiksa} Pkk) melebihi total diokulasi pekerja (${wMax} Pkk).`);
      }

      if (valDiperiksa !== '' && valBerhasil !== '' && valGagal !== '') {
        if (numBerhasil + numGagal !== numDiperiksa) {
          validationErrors.push(`Untuk ${wName}: Jlh Berhasil (${numBerhasil}) + Tdk Berhasil (${numGagal}) = ${numBerhasil + numGagal} Pkk harus sama dengan Jlh Diperiksa (${numDiperiksa} Pkk).`);
        }
      }

      const isRegraft = chkRegrafting ? chkRegrafting.checked : true;

      inspectedWorkersData.push({
        id: wid,
        name: wName,
        code: targetWorker?.code,
        totalDiokulasi: wMax,
        jlhDiperiksa: numDiperiksa,
        jlhBerhasil: numBerhasil,
        jlhTidakBerhasil: numGagal,
        perluRegrafting: isRegraft,
        persenBerhasil: numDiperiksa > 0 ? Math.round((numBerhasil / numDiperiksa) * 100) : 0,
        persenGagal: numDiperiksa > 0 ? Math.round((numGagal / numDiperiksa) * 100) : 0
      });
    });

    if (grandDiperiksa <= 0) {
      validationErrors.push('Total bibit yang diperiksa tidak boleh 0 Pkk.');
    }

    if (grandDiperiksa > sisaBelumDiperiksa && sisaBelumDiperiksa > 0) {
      validationErrors.push(`Total Diperiksa (${grandDiperiksa} Pkk) melebihi Sisa Belum Diperiksa (${sisaBelumDiperiksa} Pkk).`);
    }

    if (validationErrors.length > 0) {
      showValidationErrorDialog(validationErrors);
      return;
    }

    const txs = storage.get('inspection_transactions', []);
    const docNoInsp = isEditing && targetInsp ? targetInsp.docNo : `INSP/2026/0${txs.length + 1}`;
    const persenTotal = grandDiperiksa > 0 ? Math.round((grandBerhasil / grandDiperiksa) * 100) : 0;

    const inspectionRecord = {
      ...(isEditing && targetInsp ? targetInsp : {}),
      docNo: docNoInsp,
      buddingIndex: parseInt(buddingIdx),
      buddingDocNo: docNo,
      buddingType: selectedBudding.type || 'GRAFTING',
      batchNo,
      sourceDocNo: selectedBudding.sourceDocNo,
      tanggal: isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today,
      bedengan: selectedBudding.bedengan,
      klonEntres: selectedBudding.klonEntres,
      klonRootstock: selectedBudding.klonRootstock,
      workers: inspectedWorkersData,
      jumlahJadi: grandBerhasil,
      jumlahGagal: grandGagal,
      totalToRegrafting,
      totalToSelection,
      totalDiperiksa: grandDiperiksa,
      persenJadi: persenTotal,
      catatan
    };

    if (isEditing) {
      txs[parseInt(editingIdx)] = inspectionRecord;
    } else {
      txs.push(inspectionRecord);
    }
    storage.set('inspection_transactions', txs);

    // Save/Update to Regrafting Pool if checked
    let regraftPool = storage.get('regrafting_pool', []);
    if (isEditing) {
      regraftPool = regraftPool.filter(r => r.inspectionDocNo !== docNoInsp);
    }
    if (totalToRegrafting > 0) {
      regraftPool.push({
        docNo: `REG-POOL/2026/0${regraftPool.length + 1}`,
        inspectionDocNo: docNoInsp,
        batchNo,
        sourceBuddingDocNo: docNo,
        sourceDocNo: selectedBudding.sourceDocNo,
        tanggal: isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today,
        bedengan: selectedBudding.bedengan,
        klonRootstock: selectedBudding.klonRootstock || 'GT-01',
        klonAwal: selectedBudding.klonEntres || 'PB 260',
        jumlah: totalToRegrafting,
        sisaRegrafting: totalToRegrafting,
        status: 'READY_TO_REGRAFT'
      });
    }
    storage.set('regrafting_pool', regraftPool);

    // Save/Update to Selection Pool if unchecked
    let selectionPool = storage.get('selection_pool', []);
    if (isEditing) {
      selectionPool = selectionPool.filter(s => s.inspectionDocNo !== docNoInsp);
    }
    if (totalToSelection > 0) {
      selectionPool.push({
        docNo: `SEL-POOL/2026/0${selectionPool.length + 1}`,
        inspectionDocNo: docNoInsp,
        batchNo,
        sourceBuddingDocNo: docNo,
        sourceDocNo: selectedBudding.sourceDocNo,
        tanggal: isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today,
        bedengan: selectedBudding.bedengan,
        klon: selectedBudding.klonEntres || 'PB 260',
        klonRootstock: selectedBudding.klonRootstock || 'GT-01',
        jumlahAfkir: totalToSelection,
        alasan: 'Gagal / Tidak Berhasil Okulasi (Ditolak Regrafting)',
        status: 'PENDING_CULLING'
      });
    }
    storage.set('selection_pool', selectionPool);

    storage.remove('editing_inspection_index');
    navigate('/inspection');
  });
}
