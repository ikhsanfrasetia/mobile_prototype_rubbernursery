/**
 * modules/entres/menunas-form.js — Halaman Transaksi Menunas Entres.
 * Menampilkan identitas plot dari hasil scan QR/pilihan manual:
 * - Kode Plot
 * - Nama Klon
 * - Jlh Pokok per Plot (Populasi Master Plot - Read-only)
 * 
 * Field Input Transaksi:
 * 1. Tanggal Menunas (otomatis current date)
 * 2. Input Jumlah Pohon Ditunas* (Number - Realisasi aktivitas)
 * 
 * Field Preservation:
 * Seluruh schema legacy (jumlahPerisai, jumlahCabang, jumlahPanjangMeter, dll) tetap dipertahankan.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { toast } from '../../components/toast.js';
import { todayISO, formatDate, generateUniqueDocNo } from '../../core/utils.js';
import { resolvePlot, getAllBudwoodPlots } from '../../data/budwood-plot-master.js';
import { assertAttendanceGateOrThrow } from '../../core/attendance-gate-service.js';

function formatDateDDMMYYYY(val) {
  if (!val) return '-';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.substring(0, 10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
}

export function renderMenunasForm() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get() || { name: 'Mantri Entres', id: 'MTR-01' };
  const rawPlot = storage.get('selected_menunas_plot', null) || storage.get('selected_entres_plot', null);
  let selectedPlot = null;

  if (rawPlot) {
    const resolved = resolvePlot(rawPlot.kodePlot || rawPlot.plotName || rawPlot.id || rawPlot);
    if (resolved) {
      selectedPlot = {
        id: resolved.id,
        kodePlot: `Plot ${resolved.plotName}`,
        plotName: resolved.plotName,
        namaKlon: resolved.cloneName,
        jlhPokok: resolved.numberOfPlants,
        lokasi: `Kebun Entres - Plot ${resolved.plotName}`,
        tahunTanam: resolved.yearOfPlanting,
        budwoodCode: resolved.budwoodCode,
        verifiedMethod: rawPlot.verifiedMethod || 'MANUAL'
      };
    } else {
      selectedPlot = {
        kodePlot: rawPlot.kodePlot || 'Plot IA',
        namaKlon: rawPlot.namaKlon || 'IRCA331',
        jlhPokok: rawPlot.jlhPokok || 425,
        lokasi: rawPlot.lokasi || 'Kebun Entres - Plot IA',
        budwoodCode: rawPlot.budwoodCode || '2021/BWG/001',
        verifiedMethod: rawPlot.verifiedMethod || 'MANUAL'
      };
    }
  } else {
    const defaultPlot = getAllBudwoodPlots()[0];
    selectedPlot = {
      id: defaultPlot.id,
      kodePlot: `Plot ${defaultPlot.plotName}`,
      plotName: defaultPlot.plotName,
      namaKlon: defaultPlot.cloneName,
      jlhPokok: defaultPlot.numberOfPlants,
      lokasi: `Kebun Entres - Plot ${defaultPlot.plotName}`,
      tahunTanam: defaultPlot.yearOfPlanting,
      budwoodCode: defaultPlot.budwoodCode,
      verifiedMethod: 'MANUAL_SELECT'
    };
  }

  const editingIdx = storage.get('editing_menunas_index', null);
  const txs = storage.get('entres_menunas_transactions', []);
  const editData = (editingIdx !== null && txs[editingIdx]) ? txs[editingIdx] : null;

  const initialTgl = editData ? editData.tanggal : todayISO();
  const initialPohonDitunas = editData ? (editData.jumlahPohonDitunas || '') : '';

  app.innerHTML = `
    <div class="page menunas-form-page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      
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
            ${editData ? 'Edit Transaksi Menunas' : 'Transaksi Menunas'}
          </h1>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        <!-- 1. KARTU IDENTITAS PLOT ENTRES (DARI SCAN QR / PILIHAN MANUAL) -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #111827; line-height: 1.2;">
                ${selectedPlot.kodePlot}
              </div>
            </div>
            <button id="btn-change-plot" type="button" style="background: none; border: none; padding: 4px 0; font-size: 0.74rem; color: #116834; font-weight: 700; cursor: pointer; text-decoration: underline;">
              Ganti Plot
            </button>
          </div>

          <!-- GRID IDENTITAS: NAMA KLON & JLH POKOK POPULASI MASTER (50:50) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px;">
            <div style="padding-right: 12px;">
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 500;">Nama Klon:</div>
              <div style="font-size: 0.90rem; font-weight: 800; color: #116834; margin-top: 3px;">
                ${selectedPlot.namaKlon}
              </div>
            </div>
            <div style="border-left: 1px solid #E2E8F0; padding-left: 12px;">
              <div style="font-size: 0.68rem; color: #64748B; font-weight: 500;">Populasi Jumlah Pokok:</div>
              <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 3px;">
                ${parseInt(selectedPlot.jlhPokok || 0).toLocaleString('id-ID')} Pkk
              </div>
            </div>
          </div>
        </div>

        <!-- 2. FORMULIR INPUT TRANSAKSI MENUNAS -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <h2 style="font-size: 0.88rem; font-weight: 700; color: #111827; margin: 0 0 14px 0; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            Rincian Kegiatan Menunas
          </h2>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            
            <!-- 1. TANGGAL MENUNAS (OTOMATIS CURRENT DATE DD/MM/YYYY) -->
            <div>
              <label for="inp-tanggal" style="display: block; font-size: 0.76rem; font-weight: 700; color: #374151; margin-bottom: 5px;">
                Tanggal Menunas
              </label>
              <div style="position: relative;">
                <input id="inp-tanggal" type="text" value="${formatDateDDMMYYYY(initialTgl)}" data-iso="${initialTgl}" readonly disabled style="width: 100%; height: 42px; padding: 0 12px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; font-weight: 700; color: #334155; box-sizing: border-box; cursor: not-allowed;" />
              </div>
            </div>

            <!-- 2. INPUT JUMLAH POKOK DITUNAS* (NUMBER) -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label for="inp-pohon-ditunas" style="font-size: 0.76rem; font-weight: 700; color: #111827;">
                  Jumlah Pokok Ditunas <span style="color: #DC2626;">*</span>
                </label>
                <span style="font-size: 0.68rem; color: #116834; font-weight: 700;">Realisasi Aktual</span>
              </div>
              <div style="position: relative;">
                <input id="inp-pohon-ditunas" type="number" min="1" value="${initialPohonDitunas}" placeholder="Contoh: 120" style="width: 100%; height: 44px; padding: 0 64px 0 12px; background: #FFFFFF; border: 1px solid #116834; border-radius: 8px; font-size: 0.92rem; font-weight: 800; color: #116834; box-sizing: border-box; transition: border-color 0.15s ease;" />
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.74rem; font-weight: 700; color: #116834;">Pkk</span>
              </div>
              <div style="font-size: 0.68rem; color: #64748B; margin-top: 4px;">
                Masukkan jumlah pokok aktual yang dikerjakan pada kegiatan menunas hari ini.
              </div>
            </div>

          </div>

        </div>

        <!-- 3. TOMBOL AKSI SUBMIT TRANSAKSI -->
        <div style="margin-top: 18px; margin-bottom: 24px; display: flex; gap: 10px;">
          <button id="btn-cancel" type="button" style="flex: 1; height: 46px; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 0.84rem; font-weight: 700; color: #4B5563; cursor: pointer; display: flex; align-items: center; justify-content: center; text-align: center;">
            Batal
          </button>
          <button id="btn-simpan-menunas" type="button" style="flex: 1; height: 46px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.86rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 0 2px 6px rgba(17,104,52,0.3); transition: background 0.15s ease;">
            <span>Simpan Data</span>
          </button>
        </div>

      </main>

      <!-- MODAL VALIDASI ERROR -->
      <div id="modal-validation-overlay" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; backdrop-filter: blur(2px);"></div>
      <div id="modal-validation-dialog" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 310px; background: #FFFFFF; border-radius: 12px; padding: 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1001; text-align: center; box-sizing: border-box;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #FEF2F2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="#DC2626" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: 0.92rem; font-weight: 800; color: #111827; margin: 0 0 6px;">Data Belum Lengkap</h3>
        <div id="validation-error-list" style="font-size: 0.74rem; color: #6B7280; text-align: left; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px;"></div>
        <button id="btn-close-validation" type="button" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
          Periksa Kembali
        </button>
      </div>

    </div>
  `;

  // Change Plot Button Action
  app.querySelector('#btn-change-plot')?.addEventListener('click', () => {
    navigate('/entres/menunas');
  });

  // Back & Cancel Actions
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    storage.remove('editing_menunas_index');
    navigate('/entres');
  });

  app.querySelector('#btn-cancel')?.addEventListener('click', () => {
    storage.remove('editing_menunas_index');
    navigate('/entres');
  });

  // Validation Modal Handlers
  const valOverlay = app.querySelector('#modal-validation-overlay');
  const valDialog = app.querySelector('#modal-validation-dialog');
  const valList = app.querySelector('#validation-error-list');

  const showValidationErrors = (errors) => {
    if (!valList) return;
    valList.innerHTML = errors.map(e => `<div style="margin-bottom: 3px;">• ${e}</div>`).join('');
    if (valOverlay && valDialog) {
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

  // Save Menunas Transaction
  app.querySelector('#btn-simpan-menunas')?.addEventListener('click', () => {
    try {
      assertAttendanceGateOrThrow();
    } catch (err) {
      showValidationErrors([err.message || 'Presensi harian diperlukan sebelum membuat transaksi.']);
      return;
    }

    const tgl = app.querySelector('#inp-tanggal')?.dataset.iso || initialTgl || todayISO();
    const pohonDitunasVal = (app.querySelector('#inp-pohon-ditunas')?.value || '').trim();

    const errors = [];
    if (!tgl) errors.push('Tanggal Menunas wajib diisi.');
    if (!pohonDitunasVal || parseInt(pohonDitunasVal, 10) <= 0) {
      errors.push('Jumlah Pokok Ditunas wajib diisi angka > 0.');
    }

    if (errors.length > 0) {
      showValidationErrors(errors);
      return;
    }

    const jumlahPohonDitunas = parseInt(pohonDitunasVal, 10);

    if (editingIdx !== null && txs[editingIdx]) {
      txs[editingIdx] = {
        ...txs[editingIdx],
        jumlahPohonDitunas,
        updatedAt: new Date().toISOString()
      };
      storage.set('entres_menunas_transactions', txs);
      storage.remove('editing_menunas_index');

      toast(`Transaksi Menunas ${txs[editingIdx].docNo} berhasil diperbarui!`, 'success');
      navigate('/entres');
      return;
    }

    const combinedTxs = [
      ...storage.get('entres_topping_transactions', []),
      ...storage.get('entres_menunas_transactions', [])
    ];
    const currentYear = tgl ? (parseInt(String(tgl).substring(0, 4), 10) || new Date().getFullYear()) : new Date().getFullYear();
    const docNo = generateUniqueDocNo('BWGDTL', combinedTxs, currentYear);

    const newTx = {
      docNo,
      type: 'MENUNAS',
      kodePlot: selectedPlot.kodePlot,
      namaKlon: selectedPlot.namaKlon,
      jlhPokok: parseInt(selectedPlot.jlhPokok || 0, 10), // Populasi Master Plot
      budwoodCode: selectedPlot.budwoodCode || '2021/BWG/001',
      tanggal: tgl,
      jumlahPohonDitunas, // Realisasi pohon ditunas
      // Preserve legacy fields for compatibility
      jumlahPerisai: 0,
      jumlahCabang: 0,
      jumlahPanjangMeter: 0,
      verifiedMethod: selectedPlot.verifiedMethod || 'QR_SCAN',
      mantri: user.name || 'Mantri Entres',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString()
    };

    txs.push(newTx);
    storage.set('entres_menunas_transactions', txs);

    toast(`Transaksi Menunas ${docNo} (${jumlahPohonDitunas} Pkk) berhasil disimpan!`, 'success');
    navigate('/entres');
  });
}

