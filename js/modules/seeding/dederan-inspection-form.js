/**
 * modules/seeding/dederan-inspection-form.js
 * Form Pemeriksaan Dederan Per-Bedengan.
 *
 * Rules (Section J, K, L, Q):
 * - Entity: dederan_inspections (2026/DED-INS/xxx)
 * - Source quantity: Jumlah Deder on the bedengan being inspected.
 * - Input: Jumlah Diperiksa (> 0, <= sisa bedengan), Jumlah Berhasil (>= 0, <= Jumlah Diperiksa).
 * - Readonly auto-calc: Jumlah Tidak Berhasil = Jumlah Diperiksa - Jumlah Berhasil (cannot be < 0).
 * - Partial inspection: Does NOT yield Eligible Pindah Semai until 100% of bedengan is inspected.
 * - Isolated from Okulasi inspection logic.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate } from '../../core/utils.js';
import { toast } from '../../components/toast.js';
import {
  getDederanTransactionById,
  getBedenganInspectionSummary,
  saveDederanInspection,
  updateDederanInspection,
  getDederanInspectionById,
  getDederanIndukById
} from './dederan-manager.js';

export function renderDederanInspectionForm() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get() || { name: 'Wagiman', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  const editInspId = storage.get('editing_dederan_inspection_id', null);
  const editingInsp = editInspId ? getDederanInspectionById(editInspId) : null;
  const isEditing = !!editingInsp;

  let dederTxId = storage.get('active_dederan_inspection_tx_id', null);
  if (isEditing && editingInsp) {
    dederTxId = editingInsp.dederanTxDocNo || editingInsp.dederanTxId || dederTxId;
  }
  const dederTx = getDederanTransactionById(dederTxId);

  if (!dederTx) {
    toast('Data transaksi Dederan tidak ditemukan untuk pemeriksaan.', 'error');
    navigate('/inspection');
    return;
  }

  const parent = getDederanIndukById(dederTx.parentDederIndukDocNo || dederTx.parentDederIndukId);
  const summary = getBedenganInspectionSummary(dederTx);

  if (!isEditing && summary.sisaBelumDiperiksa <= 0 && summary.totalDiperiksa > 0) {
    toast('Bedengan ini sudah 100% selesai diperiksa.', 'info');
  }

  let capturedPhotos = isEditing && Array.isArray(editingInsp.photos) ? [...editingInsp.photos] : [];
  const initialDiperiksa = isEditing ? (editingInsp.jumlahDiperiksa || 0) : 0;
  const initialBerhasil = isEditing ? (editingInsp.jumlahBerhasil || 0) : 0;
  const initialTidakBerhasil = isEditing ? (editingInsp.jumlahTidakBerhasil || 0) : 0;
  const maxAllowedDiperiksa = isEditing ? (summary.sisaBelumDiperiksa + initialDiperiksa) : summary.sisaBelumDiperiksa;

  app.innerHTML = `
    <div class="page dederan-insp-form-page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; position: relative; overflow: hidden;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 8px; letter-spacing: -0.01em;">${isEditing ? 'Edit Pemeriksaan Dederan' : 'Pemeriksaan Dederan'}</h1>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding-bottom: 20px;">
        
        <!-- INFORMASI OPERATOR / TANGGAL -->
        <section style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #F1F5F9; background: #FFFFFF;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.84rem; font-weight: 700; color: #0F172A; line-height: 1.2;">${user.name || 'Wagiman'}</div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.code || '1405482'} - ${user.position || 'Mantri Pembibitan'}</div>
          </div>
          <div style="width: 1px; height: 26px; background: #E2E8F0; margin: 0 12px; flex-shrink: 0;"></div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.66rem; font-weight: 600; color: #64748B; line-height: 1.2;">Tanggal Periksa</div>
            <div style="font-size: 0.80rem; color: #0F172A; font-weight: 700; margin-top: 2px;">${today}</div>
          </div>
        </section>

        <!-- INFORMASI DOKUMEN CARD -->
        <section style="margin: 12px 16px 0 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
          <h2 style="font-size: 0.74rem; font-weight: 700; color: #334155; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.03em;">Informasi Dokumen</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 0.74rem; margin-bottom: 12px;">
            <div>
              <div style="color: #64748B; font-size: 0.68rem; margin-bottom: 1px;">Dokumen Dederan:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #0F172A; word-break: break-all;">${dederTx.docNo}</div>
            </div>
            <div>
              <div style="color: #64748B; font-size: 0.68rem; margin-bottom: 1px;">Dokumen Induk:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #0F172A; word-break: break-all;">${dederTx.parentDederIndukDocNo || '-'}</div>
            </div>
            <div>
              <div style="color: #64748B; font-size: 0.68rem; margin-bottom: 1px;">Klon Batang Bawah:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #116834;">${dederTx.klon || 'GT 1'}</div>
            </div>
            <div>
              <div style="color: #64748B; font-size: 0.68rem; margin-bottom: 1px;">Penerimaan Asal:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #0F172A; word-break: break-all;">${dederTx.sourceReceiptDocNo || '-'}</div>
            </div>
          </div>

          <!-- REKAPITULASI PROGRES PEMERIKSAAN 3-KOLOM -->
          <div style="padding: 8px 4px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center;">
            <div style="padding: 0 4px;">
              <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px; line-height: 1.2;">Populasi Deder</div>
              <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin: 2px 0;">${(dederTx.jumlahDeder || 0).toLocaleString('id-ID')}</div>
              <div style="font-size: 0.64rem; color: #64748B; line-height: 1;">Butir</div>
            </div>
            <div style="padding: 0 4px; border-left: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">
              <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px; line-height: 1.2;">Sudah Diperiksa</div>
              <div style="font-size: 0.88rem; font-weight: 800; color: #15803D; line-height: 1.2; margin: 2px 0;">${(summary.totalDiperiksa || 0).toLocaleString('id-ID')}</div>
              <div style="font-size: 0.64rem; color: #64748B; line-height: 1;">Butir</div>
            </div>
            <div style="padding: 0 4px;">
              <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px; line-height: 1.2;">Sisa Belum Periksa</div>
              <div id="lbl-sisa-belum-periksa" style="font-size: 0.88rem; font-weight: 800; color: ${summary.sisaBelumDiperiksa > 0 ? '#D97706' : '#15803D'}; line-height: 1.2; margin: 2px 0;">${(summary.sisaBelumDiperiksa || 0).toLocaleString('id-ID')}</div>
              <div style="font-size: 0.64rem; color: #64748B; line-height: 1;">Butir</div>
            </div>
          </div>
        </section>

        <!-- FORM INPUT AREA -->
        <section style="padding: 12px 16px 0 16px;">
          
          <!-- DETAIL BEDENGAN -->
          <div style="margin-bottom: 12px;">
            <h2 style="font-size: 0.80rem; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Detail Bedengan</h2>
            
            <div style="display: flex; align-items: center; justify-content: space-between; background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 6px; padding: 8px 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span style="font-weight: 700; font-size: 0.86rem; color: #116834; letter-spacing: 0.02em;">${dederTx.bedenganCode || 'BED-001'}</span>
              </div>
              <span style="font-size: 0.70rem; color: #15803D; font-weight: 700; background: #DCFCE7; padding: 3px 8px; border-radius: 4px; border: 1px solid #86EFAC;">
                Populasi: ${(dederTx.jumlahDeder || 0).toLocaleString('id-ID')} Butir
              </span>
            </div>
          </div>

          <!-- INPUT JUMLAH DIPERIKSA -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <label for="inp-diperiksa" style="font-size: 0.74rem; font-weight: 700; color: #0F172A;">
                Jumlah Diperiksa (Butir) <span style="color: #DC2626;">*</span>
              </label>
              <span style="font-size: 0.68rem; color: #64748B;">Maks: <strong>${maxAllowedDiperiksa.toLocaleString('id-ID')} Butir</strong></span>
            </div>
            <div id="wrap-inp-diperiksa" style="display: flex; align-items: stretch; border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden; background: #FFFFFF; height: 38px; transition: border-color 0.15s ease;">
              <input type="number" id="inp-diperiksa" min="1" max="${maxAllowedDiperiksa}" value="${initialDiperiksa}" placeholder="0" style="flex: 1; height: 100%; border: none; padding: 0 10px; font-size: 0.82rem; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none; background: transparent;">
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 12px; background: #F8FAFC; border-left: 1px solid #CBD5E1; color: #475569; font-size: 0.76rem; font-weight: 600;">
                Butir
              </div>
            </div>
            <div id="msg-diperiksa" style="font-size: 0.68rem; margin-top: 4px; color: #64748B;">
              Maksimal yang dapat diperiksa: ${maxAllowedDiperiksa.toLocaleString('id-ID')} Butir
            </div>
          </div>

          <!-- INPUT JUMLAH BERHASIL -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <label for="inp-berhasil" style="font-size: 0.74rem; font-weight: 700; color: #116834;">
                Jumlah Berhasil (Butir) <span style="color: #DC2626;">*</span>
              </label>
              <span id="label-max-berhasil" style="font-size: 0.68rem; color: #64748B;">Maks: <strong>${initialDiperiksa.toLocaleString('id-ID')} Butir</strong></span>
            </div>
            <div id="wrap-inp-berhasil" style="display: flex; align-items: stretch; border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden; background: #FFFFFF; height: 38px; transition: border-color 0.15s ease;">
              <input type="number" id="inp-berhasil" min="0" max="${maxAllowedDiperiksa}" value="${initialBerhasil}" placeholder="0" style="flex: 1; height: 100%; border: none; padding: 0 10px; font-size: 0.82rem; font-weight: 600; color: #116834; box-sizing: border-box; outline: none; background: transparent;">
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 12px; background: #F8FAFC; border-left: 1px solid #CBD5E1; color: #475569; font-size: 0.76rem; font-weight: 600;">
                Butir
              </div>
            </div>
            <div id="msg-berhasil" style="font-size: 0.68rem; margin-top: 4px; color: #64748B;">
              Kecambah siap semai yang layak dipindahkan ke Polybag.
            </div>
          </div>

          <!-- INPUT JUMLAH TIDAK BERHASIL (OTOMATIS) -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <label style="font-size: 0.74rem; font-weight: 700; color: #DC2626;">
                Jumlah Tidak Berhasil (Otomatis)
              </label>
              <span style="font-size: 0.68rem; color: #64748B;">Diperiksa - Berhasil</span>
            </div>
            <div style="display: flex; align-items: stretch; border: 1px solid #FCA5A5; border-radius: 6px; overflow: hidden; background: #FEF2F2; height: 38px;">
              <input type="number" id="inp-tidak-berhasil" value="${initialTidakBerhasil}" readonly style="flex: 1; height: 100%; border: none; padding: 0 10px; font-size: 0.84rem; font-weight: 800; color: #DC2626; box-sizing: border-box; outline: none; background: transparent;">
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 12px; background: #FEE2E2; border-left: 1px solid #FCA5A5; color: #991B1B; font-size: 0.76rem; font-weight: 600;">
                Butir
              </div>
            </div>
            <div style="font-size: 0.68rem; margin-top: 4px; color: #64748B; line-height: 1.3;">
              * Jumlah tidak berhasil akan masuk ke tab <strong>Pasca Semai</strong> dengan status <em>PENDING_DECLARATION</em>.
            </div>
          </div>

          <!-- INFORMASI SALDO PEMERIKSAAN CARD -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 8px;">
              Informasi Saldo Pemeriksaan
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 4px;">
              <span style="color: #64748B;">Sisa Belum Periksa Awal</span>
              <span style="font-weight: 600; color: #0F172A;">${maxAllowedDiperiksa.toLocaleString('id-ID')} Butir</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 4px;">
              <span style="color: #64748B;">Jumlah Diperiksa (Sesi Ini)</span>
              <span id="lbl-live-diperiksa" style="font-weight: 600; color: #15803D;">${initialDiperiksa.toLocaleString('id-ID')} Butir</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; padding-top: 6px; border-top: 1px solid #E2E8F0;">
              <span style="font-weight: 700; color: #0F172A;">Sisa Belum Diperiksa Akhir</span>
              <span id="lbl-live-sisa" style="font-weight: 800; color: #D97706; font-size: 0.78rem;">${Math.max(0, maxAllowedDiperiksa - initialDiperiksa).toLocaleString('id-ID')} Butir</span>
            </div>
          </div>

          <!-- TAMBAH FOTO -->
          <section style="padding: 12px 0; background: #FFFFFF;">
            <h2 style="font-size: 0.84rem; font-weight: 700; color: #111111; margin: 0 0 4px 0;">Tambah Foto</h2>
            <p style="font-size: 0.72rem; color: #6B7280; margin: 0 0 10px 0; line-height: 1.35;">
              Wajib ambil foto langsung di lokasi pemeriksaan dederan (disertai timestamp waktu & lokasi otomatis).
            </p>
            
            <div id="photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;"></div>

            <button id="btn-tambah-foto" type="button" style="width: 100%; padding: 10px; background: #E3F2FD; border: 1px dashed #4A90E2; border-radius: 6px; color: #4A90E2; font-size: 0.80rem; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 6px; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Tambah Foto
            </button>
          </section>

        </section>

      </main>

      <!-- STICKY BOTTOM ACTION BAR -->
      <footer style="padding: 12px 16px; background: #FFFFFF; border-top: 1px solid #E2E8F0; flex-shrink: 0;">
        <button id="btn-save-inspection" type="button" disabled
          style="width: 100%; height: 40px; background: #CBD5E1; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.84rem; cursor: not-allowed; transition: background 0.15s ease;">
          ${isEditing ? 'Update Hasil Pemeriksaan' : 'Simpan Hasil Pemeriksaan'}
        </button>
      </footer>

      <!-- CAMERA OVERLAY (PERSIS DEDERAN & SEEDING FORM) -->
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
            <p style="margin-bottom: 6px; font-weight: 700;">Kamera tidak tersedia atau akses ditolak.</p>
            <p style="font-size: 0.8rem; color: #aaa; margin: 0;">Ketuk tombol rana untuk foto simulasi ber-timestamp.</p>
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

  // Dynamic calculation logic
  const inpDiperiksa = app.querySelector('#inp-diperiksa');
  const wrapInpDiperiksa = app.querySelector('#wrap-inp-diperiksa');
  const msgDiperiksa = app.querySelector('#msg-diperiksa');

  const inpBerhasil = app.querySelector('#inp-berhasil');
  const wrapInpBerhasil = app.querySelector('#wrap-inp-berhasil');
  const msgBerhasil = app.querySelector('#msg-berhasil');

  const inpTidakBerhasil = app.querySelector('#inp-tidak-berhasil');
  const labelMaxBerhasil = app.querySelector('#label-max-berhasil');
  const lblLiveDiperiksa = app.querySelector('#lbl-live-diperiksa');
  const lblLiveSisa = app.querySelector('#lbl-live-sisa');
  const btnSaveInspection = app.querySelector('#btn-save-inspection');

  function updateCalculations() {
    const maxDiperiksa = maxAllowedDiperiksa;
    const diperiksaRaw = inpDiperiksa.value;
    let diperiksa = parseInt(diperiksaRaw, 10);
    if (isNaN(diperiksa) || diperiksa < 0) {
      diperiksa = 0;
      if (diperiksaRaw !== '') inpDiperiksa.value = 0;
    }

    if (diperiksa > maxDiperiksa) {
      diperiksa = maxDiperiksa;
      inpDiperiksa.value = diperiksa;
      toast(`Jumlah diperiksa tidak boleh melebihi batas (${maxDiperiksa.toLocaleString('id-ID')} butir)`, 'warning');
    }

    inpBerhasil.max = diperiksa;
    if (labelMaxBerhasil) {
      labelMaxBerhasil.innerHTML = `Maks: <strong>${diperiksa.toLocaleString('id-ID')} Butir</strong>`;
    }

    const berhasilRaw = inpBerhasil.value;
    let berhasil = parseInt(berhasilRaw, 10);
    if (isNaN(berhasil) || berhasil < 0) {
      berhasil = 0;
      if (berhasilRaw !== '') inpBerhasil.value = 0;
    }

    if (berhasil > diperiksa) {
      berhasil = diperiksa;
      inpBerhasil.value = berhasil;
    }

    const tidakBerhasil = Math.max(0, diperiksa - berhasil);
    inpTidakBerhasil.value = tidakBerhasil;

    // Update live balance card
    if (lblLiveDiperiksa) {
      lblLiveDiperiksa.textContent = `${diperiksa.toLocaleString('id-ID')} Butir`;
    }
    const sisaAkhir = Math.max(0, maxDiperiksa - diperiksa);
    if (lblLiveSisa) {
      lblLiveSisa.textContent = `${sisaAkhir.toLocaleString('id-ID')} Butir`;
      lblLiveSisa.style.color = sisaAkhir > 0 ? '#D97706' : '#15803D';
    }

    // Visual state on save button and borders
    if (diperiksa > 0 && diperiksa <= maxDiperiksa && berhasil >= 0 && berhasil <= diperiksa) {
      if (wrapInpDiperiksa) wrapInpDiperiksa.style.borderColor = '#116834';
      if (msgDiperiksa) {
        msgDiperiksa.style.color = '#15803D';
        msgDiperiksa.textContent = `Sisa setelah pemeriksaan ini: ${sisaAkhir.toLocaleString('id-ID')} Butir`;
      }
      if (wrapInpBerhasil) wrapInpBerhasil.style.borderColor = '#116834';
      if (btnSaveInspection) {
        btnSaveInspection.disabled = false;
        btnSaveInspection.style.background = '#116834';
        btnSaveInspection.style.cursor = 'pointer';
      }
    } else {
      if (wrapInpDiperiksa) wrapInpDiperiksa.style.borderColor = (diperiksa <= 0 && diperiksaRaw !== '' && diperiksaRaw !== '0') ? '#DC2626' : '#CBD5E1';
      if (msgDiperiksa) {
        msgDiperiksa.style.color = '#64748B';
        msgDiperiksa.textContent = `Maksimal yang dapat diperiksa: ${maxDiperiksa.toLocaleString('id-ID')} Butir`;
      }
      if (wrapInpBerhasil) wrapInpBerhasil.style.borderColor = '#CBD5E1';
      if (btnSaveInspection) {
        btnSaveInspection.disabled = true;
        btnSaveInspection.style.background = '#CBD5E1';
        btnSaveInspection.style.cursor = 'not-allowed';
      }
    }
  }

  inpDiperiksa.addEventListener('input', updateCalculations);
  inpBerhasil.addEventListener('input', updateCalculations);

  // Run initial calculation to establish disabled state when default is 0
  updateCalculations();

  // Photo handling & Camera Logic
  const photoContainer = app.querySelector('#photo-container');
  const btnTambahFoto = app.querySelector('#btn-tambah-foto');
  const cameraOverlay = app.querySelector('#camera-overlay');
  const videoEl = app.querySelector('#camera-video');
  const canvasEl = app.querySelector('#camera-canvas');
  const cameraErrorEl = app.querySelector('#camera-error');
  const btnCloseCamera = app.querySelector('#btn-close-camera');
  const btnShutter = app.querySelector('#btn-shutter');

  let currentStream = null;
  let isCameraActive = false;

  const renderPhotos = () => {
    if (!photoContainer) return;
    photoContainer.innerHTML = capturedPhotos.map((p, idx) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: 4px; overflow: hidden; border: 1px solid #D9D9D9;">
        <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" class="btn-hapus-foto" data-index="${idx}" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; padding: 4px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `).join('');

    photoContainer.querySelectorAll('.btn-hapus-foto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        capturedPhotos.splice(idx, 1);
        renderPhotos();
      });
    });
  };

  // Render initial photos if editing
  renderPhotos();

  async function openCamera() {
    cameraOverlay.style.display = 'flex';
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoEl.srcObject = currentStream;
        await videoEl.play();
        isCameraActive = true;
        cameraErrorEl.style.display = 'none';
        videoEl.style.display = 'block';
      } else {
        throw new Error('Not supported');
      }
    } catch (e) {
      console.warn(e);
      isCameraActive = false;
      cameraErrorEl.style.display = 'block';
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

  btnTambahFoto?.addEventListener('click', openCamera);
  btnCloseCamera?.addEventListener('click', stopCamera);

  btnShutter?.addEventListener('click', () => {
    let dataUrl = '';
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const ts = `${today} ${timeFormatted} WIB`;
    const bedLabel = dederTx.bedenganCode || 'BDG';

    if (isCameraActive && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0);

      // Add timestamp bar
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, canvasEl.height - 40, canvasEl.width, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(`SIGMA NURSERY | ${bedLabel} | ${ts} | PEMERIKSAAN DEDERAN`, 10, canvasEl.height - 15);

      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    } else {
      // Dummy / simulation photo with timestamp
      canvasEl.width = 400;
      canvasEl.height = 400;
      const ctx = canvasEl.getContext('2d');
      ctx.fillStyle = '#15803D';
      ctx.fillRect(0, 0, 400, 400);

      // Pattern simulation
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let i = 40; i < 400; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 400);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(400, i);
        ctx.stroke();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`PEMERIKSAAN: ${bedLabel}`, 200, 185);
      ctx.font = '13px -apple-system, sans-serif';
      ctx.fillText(`Ref: ${dederTx.docNo}`, 200, 215);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 360, 400, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '13px -apple-system, sans-serif';
      ctx.fillText(`SIGMA | ${bedLabel} | ${ts}`, 10, 385);
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    }

    capturedPhotos.push(dataUrl);
    stopCamera();
    renderPhotos();
  });

  // Navigation handlers
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    storage.remove('editing_dederan_inspection_id');
    navigate('/inspection');
  });

  // Save / Update handler
  app.querySelector('#btn-save-inspection')?.addEventListener('click', () => {
    const diperiksa = parseInt(inpDiperiksa.value, 10);
    const berhasil = parseInt(inpBerhasil.value, 10);

    if (isNaN(diperiksa) || diperiksa <= 0) {
      toast('Jumlah diperiksa tidak boleh 0 atau kurang (harus > 0).', 'error');
      inpDiperiksa.focus();
      return;
    }

    if (isNaN(berhasil) || berhasil < 0) {
      toast('Jumlah berhasil tidak boleh bernilai negatif.', 'error');
      inpBerhasil.focus();
      return;
    }

    if (berhasil > diperiksa) {
      toast('Jumlah berhasil tidak boleh melebihi jumlah diperiksa.', 'error');
      inpBerhasil.focus();
      return;
    }

    const payload = {
      dederanTxId: dederTx.id,
      dederanTxDocNo: dederTx.docNo,
      tanggalPemeriksaan: isEditing ? (editingInsp.tanggalPemeriksaan || today) : today,
      jumlahDiperiksa: diperiksa,
      jumlahBerhasil: berhasil,
      photos: capturedPhotos,
      inspectorName: user.name || 'Mantri Pembibitan'
    };

    try {
      if (isEditing) {
        const result = updateDederanInspection(editingInsp.docNo || editingInsp.id, payload);
        storage.remove('editing_dederan_inspection_id');
        toast(`Pemeriksaan ${result.inspection.docNo} berhasil diperbarui!`, 'success');
      } else {
        const result = saveDederanInspection(payload);
        toast(`Pemeriksaan ${result.inspection.docNo} berhasil disimpan.`, 'success');
      }
      navigate('/inspection');
    } catch (err) {
      toast(err.message || 'Gagal menyimpan pemeriksaan Dederan', 'error');
    }
  });
}

