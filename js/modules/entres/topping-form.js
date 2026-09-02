/**
 * modules/entres/topping-form.js — Halaman Transaksi Topping Entres.
 * Menampilkan identitas plot dari hasil scan QR/pilihan manual:
 * - Kode Plot
 * - Nama Klon
 * - Jlh Pokok per Plot
 * 
 * Field Input Transaksi:
 * - Tanggal Topping (default current date dd/mm/yyyy)
 * 1. Jlh Kayu Okulasi (Number)
 * 2. Total Panjang dlm Meter (Number)
 * 3. Jlh Perisai (Number)
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { toast } from '../../components/toast.js';
import { todayISO, formatDate } from '../../core/utils.js';

function formatDateDDMMYYYY(val) {
  if (!val) return '-';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.substring(0, 10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
}

export function renderToppingForm() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get() || { name: 'Mantri Entres', id: 'MTR-01' };
  const selectedPlot = storage.get('selected_topping_plot', null) || storage.get('selected_entres_plot', null) || {
    kodePlot: 'PLOT-ENT-01',
    namaKlon: 'PB 260',
    jlhPokok: 200,
    lokasi: 'Kebun Entres Blok A1',
    verifiedMethod: 'MANUAL_SELECT'
  };

  const editingIdx = storage.get('editing_topping_index', null);
  const txs = storage.get('entres_topping_transactions', []);
  const editData = (editingIdx !== null && txs[editingIdx]) ? txs[editingIdx] : null;

  const initialTgl = editData ? editData.tanggal : todayISO();
  const initialKayu = editData ? editData.jumlahKayu : '';
  const initialPanjang = editData ? editData.totalPanjangMeter : '';
  const initialPerisai = editData ? editData.jumlahPerisai : '';

  app.innerHTML = `
    <div class="page topping-form-page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 6px; letter-spacing: -0.01em;">
            Transaksi Topping
          </h1>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        <!-- 1. KARTU IDENTITAS PLOT ENTRES (DARI SCAN QR / PILIHAN MANUAL) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <span style="font-size: 0.65rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">
                Identitas Plot Entres
              </span>
              <div style="font-size: 1.15rem; font-weight: 800; color: #111827; line-height: 1.2;">
                ${selectedPlot.kodePlot}
              </div>
            </div>
            <button id="btn-change-plot" type="button" style="background: none; border: none; padding: 4px 0; font-size: 0.74rem; color: #116834; font-weight: 700; cursor: pointer; text-decoration: underline;">
              Ganti Plot
            </button>
          </div>

          <!-- GRID IDENTITAS: NAMA KLON & JLH POKOK PER PLOT (SIMETRIS 50:50) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px;">
            <div style="padding-right: 12px;">
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 500;">Nama Klon:</div>
              <div style="font-size: 0.90rem; font-weight: 800; color: #116834; margin-top: 3px;">
                ${selectedPlot.namaKlon}
              </div>
            </div>
            <div style="border-left: 1px solid #E2E8F0; padding-left: 12px;">
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 500;">Jlh Pokok per Plot:</div>
              <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 3px;">
                ${parseInt(selectedPlot.jlhPokok || 0).toLocaleString('id-ID')} Pkk
              </div>
            </div>
          </div>
        </div>

        <!-- 2. FORMULIR INPUT TRANSAKSI TOPPING -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <h2 style="font-size: 0.88rem; font-weight: 700; color: #111827; margin: 0 0 14px 0; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            Rincian Topping
          </h2>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            
            <!-- TANGGAL TOPPING (DEFAULT CURRENT DATE DD/MM/YYYY) -->
            <div>
              <label for="inp-tanggal" style="display: block; font-size: 0.76rem; font-weight: 700; color: #374151; margin-bottom: 5px;">
                Tanggal Topping
              </label>
              <div style="position: relative;">
                <input id="inp-tanggal" type="text" value="${formatDateDDMMYYYY(initialTgl)}" data-iso="${initialTgl}" readonly disabled style="width: 100%; height: 42px; padding: 0 12px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; font-weight: 700; color: #334155; box-sizing: border-box; cursor: not-allowed;" />
              </div>
            </div>

            <!-- 1. INPUT JLH KAYU OKULASI* (NUMBER) -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label for="inp-kayu" style="font-size: 0.76rem; font-weight: 700; color: #374151;">
                  Jlh Kayu Okulasi <span style="color: #DC2626;">*</span>
                </label>
                <span style="font-size: 0.68rem; color: #64748B; font-weight: 600;">Batang / Kayu</span>
              </div>
              <div style="position: relative;">
                <input id="inp-kayu" type="number" min="1" value="${initialKayu}" placeholder="Contoh: 120" style="width: 100%; height: 44px; padding: 0 64px 0 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.90rem; font-weight: 700; color: #111827; box-sizing: border-box; transition: border-color 0.15s ease;" />
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.74rem; font-weight: 700; color: #64748B;">Kayu</span>
              </div>
            </div>

            <!-- 2. INPUT TOTAL PANJANG DLM METER* (NUMBER) -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label for="inp-panjang" style="font-size: 0.76rem; font-weight: 700; color: #374151;">
                  Total Panjang dlm Meter <span style="color: #DC2626;">*</span>
                </label>
                <span style="font-size: 0.68rem; color: #64748B; font-weight: 600;">Satuan: Meter (m)</span>
              </div>
              <div style="position: relative;">
                <input id="inp-panjang" type="number" min="0.1" step="0.1" value="${initialPanjang}" placeholder="Contoh: 75" style="width: 100%; height: 44px; padding: 0 64px 0 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.90rem; font-weight: 700; color: #111827; box-sizing: border-box; transition: border-color 0.15s ease;" />
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.74rem; font-weight: 700; color: #64748B;">Meter</span>
              </div>
            </div>

            <!-- 3. INPUT JLH PERISAI* (NUMBER) -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label for="inp-perisai" style="font-size: 0.76rem; font-weight: 700; color: #374151;">
                  Jlh Perisai <span style="color: #DC2626;">*</span>
                </label>
                <span style="font-size: 0.68rem; color: #64748B; font-weight: 600;">Mata Tunas / Perisai</span>
              </div>
              <div style="position: relative;">
                <input id="inp-perisai" type="number" min="1" value="${initialPerisai}" placeholder="Contoh: 300" style="width: 100%; height: 44px; padding: 0 64px 0 12px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.90rem; font-weight: 700; color: #111827; box-sizing: border-box; transition: border-color 0.15s ease;" />
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.74rem; font-weight: 700; color: #64748B;">Perisai</span>
              </div>
            </div>

          </div>

          <!-- RANGKUMAN ESTIMASI HASIL TOPPING -->
          <div id="box-summary" style="margin-top: 14px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #166534; margin-bottom: 4px;">
              Estimasi Rata-rata Entres:
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #15803D;">
              <span>Rata-rata / Kayu:</span>
              <span id="disp-avg-kayu" style="font-weight: 700;">- Perisai/Kayu</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #15803D; margin-top: 2px;">
              <span>Rata-rata / Meter:</span>
              <span id="disp-avg-meter" style="font-weight: 700;">- Perisai/Meter</span>
            </div>
          </div>

          <!-- TOMBOL SIMPAN & BATAL -->
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="btn-cancel" type="button" style="flex: 1; height: 46px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; font-weight: 700; color: #475569; cursor: pointer; text-align: center;">
              Batal
            </button>
            <button id="btn-simpan-topping" type="button" style="flex: 1; height: 46px; background: #116834; border: none; border-radius: 8px; font-size: 0.88rem; font-weight: 700; color: #FFFFFF; cursor: pointer; text-align: center; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
              Simpan Data
            </button>
          </div>

        </div>

      </main>

      <!-- MODAL VALIDASI ERROR (JIKA FORM BELUM LENGKAP) -->
      <div id="modal-validation-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; backdrop-filter: blur(2px);"></div>
      <div id="modal-validation-dialog" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; padding: 20px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 100; text-align: center; box-sizing: border-box;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: 0.98rem; font-weight: 800; color: #111111; margin: 0 0 6px 0;">Data Belum Lengkap</h3>
        <div id="val-error-list" style="font-size: 0.78rem; color: #64748B; margin: 0 0 16px 0; text-align: left; line-height: 1.5; background: #F8FAFC; padding: 8px 12px; border-radius: 6px;"></div>
        <button id="btn-close-validation" type="button" style="width: 100%; height: 40px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.84rem; font-weight: 700; cursor: pointer;">
          Lengkapi Data
        </button>
      </div>

    </div>
  `;

  // Live calculation & preview
  const inpKayu = app.querySelector('#inp-kayu');
  const inpPanjang = app.querySelector('#inp-panjang');
  const inpPerisai = app.querySelector('#inp-perisai');
  const dispAvgKayu = app.querySelector('#disp-avg-kayu');
  const dispAvgMeter = app.querySelector('#disp-avg-meter');

  const updateCalculations = () => {
    const k = parseFloat(inpKayu?.value || 0);
    const m = parseFloat(inpPanjang?.value || 0);
    const p = parseFloat(inpPerisai?.value || 0);

    if (p > 0 && k > 0) {
      dispAvgKayu.textContent = `${(p / k).toFixed(1)} Perisai/Kayu`;
    } else {
      dispAvgKayu.textContent = '- Perisai/Kayu';
    }

    if (p > 0 && m > 0) {
      dispAvgMeter.textContent = `${(p / m).toFixed(1)} Perisai/Meter`;
    } else {
      dispAvgMeter.textContent = '- Perisai/Meter';
    }
  };

  inpKayu?.addEventListener('input', updateCalculations);
  inpPanjang?.addEventListener('input', updateCalculations);
  inpPerisai?.addEventListener('input', updateCalculations);

  // Jalankan kalkulasi awal jika form memuat data edit
  updateCalculations();

  // Back & Cancel Actions
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    storage.remove('editing_topping_index');
    navigate('/entres');
  });

  app.querySelector('#btn-cancel')?.addEventListener('click', () => {
    storage.remove('editing_topping_index');
    navigate('/entres');
  });

  app.querySelector('#btn-change-plot')?.addEventListener('click', () => {
    navigate('/entres/topping');
  });

  // Validation Modal Handlers
  const valOverlay = app.querySelector('#modal-validation-overlay');
  const valDialog = app.querySelector('#modal-validation-dialog');
  const valList = app.querySelector('#val-error-list');

  const showValidationErrors = (errors) => {
    if (valList && valOverlay && valDialog) {
      valList.innerHTML = errors.map(err => `• ${err}`).join('<br>');
      valOverlay.style.display = 'block';
      valDialog.style.display = 'block';
    }
  };

  const closeValidationModal = () => {
    if (valOverlay && valDialog) {
      valOverlay.style.display = 'none';
      valDialog.style.display = 'none';
    }
  };

  app.querySelector('#btn-close-validation')?.addEventListener('click', closeValidationModal);
  valOverlay?.addEventListener('click', closeValidationModal);

  // Save Topping Transaction
  app.querySelector('#btn-simpan-topping')?.addEventListener('click', () => {
    const tgl = app.querySelector('#inp-tanggal')?.dataset.iso || initialTgl || todayISO();
    const kayuVal = (inpKayu?.value || '').trim();
    const panjangVal = (inpPanjang?.value || '').trim();
    const perisaiVal = (inpPerisai?.value || '').trim();

    const errors = [];
    if (!tgl) errors.push('Tanggal Topping wajib diisi.');
    if (!kayuVal || parseInt(kayuVal) <= 0) errors.push('Jlh Kayu Okulasi wajib diisi angka > 0.');
    if (!panjangVal || parseFloat(panjangVal) <= 0) errors.push('Total Panjang dlm Meter wajib diisi angka > 0.');
    if (!perisaiVal || parseInt(perisaiVal) <= 0) errors.push('Jlh Perisai wajib diisi angka > 0.');

    if (errors.length > 0) {
      showValidationErrors(errors);
      return;
    }

    const kayu = parseInt(kayuVal);
    const panjang = parseFloat(panjangVal);
    const perisai = parseInt(perisaiVal);

    if (editingIdx !== null && txs[editingIdx]) {
      txs[editingIdx] = {
        ...txs[editingIdx],
        jumlahKayu: kayu,
        totalPanjangMeter: panjang,
        jumlahPerisai: perisai,
        updatedAt: new Date().toISOString()
      };
      storage.set('entres_topping_transactions', txs);
      storage.remove('editing_topping_index');

      toast(`Transaksi Topping ${txs[editingIdx].docNo} berhasil diperbarui!`, 'success');
      navigate('/entres');
      return;
    }

    const docNo = `TOP/ENT/2026/0${txs.length + 1}`;

    const newTx = {
      docNo,
      type: 'TOPPING',
      kodePlot: selectedPlot.kodePlot,
      namaKlon: selectedPlot.namaKlon,
      jlhPokok: parseInt(selectedPlot.jlhPokok || 0),
      tanggal: tgl,
      jumlahKayu: kayu,
      totalPanjangMeter: panjang,
      jumlahPerisai: perisai,
      verifiedMethod: selectedPlot.verifiedMethod || 'QR_SCAN',
      mantri: user.name || 'Mantri Entres',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString()
    };

    txs.push(newTx);
    storage.set('entres_topping_transactions', txs);

    toast(`Transaksi Topping ${docNo} (${kayu} Kayu, ${perisai} Perisai) berhasil disimpan!`, 'success');
    navigate('/entres');
  });
}
