/**
 * modules/seeding/dederan-form.js — Form Transaksi Dederan Per-Bedengan & In-Place Koreksi.
 *
 * Responsibilities:
 * - Input kuantitas bibit yang didederkan pada bedengan terpilih.
 * - Enforces: Jumlah Deder > 0 dan <= Sisa Belum Deder (Aggregate Balance).
 * - Readonly fields: Tanggal Deder, Lokasi Bedengan, Sisa Belum Deder.
 * - Koreksi In-Place: Mendukung perbaikan dokumen Dederan yang dikembalikan oleh Asisten.
 * - Selesai simpan: Persist ke dederan_transactions dan re-sync dederan_induk_documents.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, esc } from '../../core/utils.js';
import { toast } from '../../components/toast.js';
import { 
  getDederanIndukById, 
  saveDederanTransaction,
  updateDederanTransaction,
  getDederanTransactionById,
  getBedenganInspectionSummary
} from './dederan-manager.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { canUserAccessTransaction } from '../../core/transaction-actor.js';
import { isTransactionLockedForMantri } from '../verification/mantri-confirmation-service.js';

export function renderDederanForm() {
  const app = document.getElementById('app');
  const userCtx = getCurrentUserContext();
  const user = session.get() || { name: userCtx?.name || 'Wagiman', code: userCtx?.code || 'MNT001', position: 'Mantri Bibitan' };
  const today = formatDate(new Date().toISOString());

  const editingDocNo = storage.get('editing_dederan_doc_no', null);
  let editingTx = null;
  let isEditMode = false;

  if (editingDocNo) {
    editingTx = getDederanTransactionById(editingDocNo);
    if (!editingTx || !canUserAccessTransaction(editingTx, userCtx)) {
      storage.remove('editing_dederan_doc_no');
      toast('Dokumen Dederan tidak ditemukan atau Anda tidak berwenang.', 'error');
      navigate('/seeding');
      return;
    }
    if (isTransactionLockedForMantri(editingTx)) {
      storage.remove('editing_dederan_doc_no');
      toast('Transaksi Dederan sedang dalam proses verifikasi atau sudah disetujui.', 'error');
      navigate('/seeding');
      return;
    }
    isEditMode = true;
  }

  const parentDocNo = isEditMode ? (editingTx.parentDederIndukDocNo || editingTx.parentDederIndukId) : storage.get('active_dederan_parent_doc', null);
  const parent = getDederanIndukById(parentDocNo);

  if (!parent) {
    storage.remove('editing_dederan_doc_no');
    toast('Dokumen Induk Deder tidak ditemukan.', 'error');
    navigate('/seeding');
    return;
  }

  const bedId = isEditMode ? (editingTx.bedenganId || editingTx.bedenganCode || editingTx.bedengan) : storage.get('scanned_dederan_bedengan_id', null);
  const bedCode = isEditMode ? (editingTx.bedenganCode || editingTx.bedengan || 'BED-001') : storage.get('scanned_dederan_bedengan_code', 'BED-001');

  if (!isEditMode && !bedId && !bedCode) {
    toast('Bedengan belum dipilih. Silakan pindai QR bedengan.', 'error');
    navigate('/seeding/dederan/scan');
    return;
  }

  const totalPenerimaan = parent.totalNilaiButirPenerimaan || 0;
  const totalSudahDeder = parent.totalDidederSDHI || 0;
  const oldJumlah = isEditMode ? parseInt(editingTx.jumlahDeder || 0, 10) : 0;
  const sisaBelumDeder = isEditMode ? ((parent.sisaBelumDeder || 0) + oldJumlah) : (parent.sisaBelumDeder || 0);

  const inspSummary = isEditMode ? getBedenganInspectionSummary(editingTx) : { totalDiperiksa: 0, totalBerhasil: 0 };
  const minAllowed = inspSummary.totalDiperiksa > 0 ? inspSummary.totalDiperiksa : 1;
  const returnReasonNote = isEditMode ? (editingTx.returnReason || editingTx.lastReturnReason || '') : '';

  app.innerHTML = `
    <div class="page dederan-form-page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; position: relative; overflow: hidden;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 52px; padding: 0 14px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center; min-width: 0; flex: 1;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div style="margin-left: 6px; min-width: 0; overflow: hidden;">
            <h1 style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;">
              ${isEditMode ? 'Koreksi Transaksi Dederan' : 'Transaksi Dederan'}
            </h1>
          </div>
        </div>
        ${isEditMode ? `
          <span style="font-size: 0.68rem; font-weight: 700; background: #FEF2F2; color: #DC2626; padding: 3px 8px; border-radius: 9999px; border: 1px solid #FECACA; flex-shrink: 0; margin-left: 8px; white-space: nowrap;">
            ${esc(editingTx.docNo)}
          </span>
        ` : ''}
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding-bottom: 24px;">
        
        <!-- CATATAN PENGEMBALIAN ASISTEN BANNER (KOREKSI MODE) -->
        ${isEditMode && returnReasonNote ? `
          <section style="margin: 10px 14px 0 14px; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 9px 12px;">
            <div style="display: flex; align-items: flex-start; gap: 8px;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#DC2626" stroke-width="2.2" fill="none" style="flex-shrink: 0; margin-top: 1px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.72rem; font-weight: 700; color: #991B1B; line-height: 1.2; margin-bottom: 2px;">
                  Catatan Pengembalian Asisten:
                </div>
                <div style="font-size: 0.74rem; color: #7F1D1D; font-weight: 500; line-height: 1.35; word-break: break-word;">
                  "${esc(returnReasonNote)}"
                </div>
              </div>
            </div>
          </section>
        ` : ''}

        <!-- INFORMASI OPERATOR / TANGGAL -->
        <section style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #0F172A; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${esc(user.name || 'Wagiman')}
            </div>
            <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">
              ${esc(user.code || 'MNT001')} • ${esc(user.position || 'Mantri Bibitan')}
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
            <div style="font-size: 0.66rem; color: #64748B; line-height: 1.2;">Tanggal Deder</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-top: 2px;">
              ${esc(isEditMode ? (editingTx.tanggalDeder || today) : today)}
            </div>
          </div>
        </section>

        <!-- INFORMASI DOKUMEN CARD -->
        <section style="margin: 10px 14px 0 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
          <h2 style="font-size: 0.74rem; font-weight: 700; color: #334155; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.03em;">
            Informasi Dokumen Induk
          </h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 0.74rem; margin-bottom: 10px;">
            <div>
              <div style="color: #64748B; font-size: 0.67rem; margin-bottom: 2px;">Dokumen Induk:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #0F172A; word-break: break-word;">${esc(parent.docNo)}</div>
            </div>
            <div>
              <div style="color: #64748B; font-size: 0.67rem; margin-bottom: 2px;">Penerimaan Benih:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #0F172A; word-break: break-word;">${esc(parent.sourceReceiptDocNo)}</div>
            </div>
            <div>
              <div style="color: #64748B; font-size: 0.67rem; margin-bottom: 2px;">Klon Batang Bawah:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #116834;">${esc(parent.klon || 'GT 1')}</div>
            </div>
            <div>
              <div style="color: #64748B; font-size: 0.67rem; margin-bottom: 2px;">Program Pembibitan:</div>
              <div style="font-weight: 700; font-size: 0.76rem; color: #0F172A; word-break: break-word;">${esc(parent.programCode || parent.program || '-')}</div>
            </div>
          </div>

          <!-- REKAP SALDO INDUK 3-KOLOM -->
          <div style="padding: 8px 4px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center;">
            <div style="padding: 0 4px;">
              <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px; line-height: 1.2;">Total Penerimaan</div>
              <div style="font-size: 0.86rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin: 2px 0;">${totalPenerimaan.toLocaleString('id-ID')}</div>
              <div style="font-size: 0.64rem; color: #64748B; line-height: 1;">Butir</div>
            </div>
            <div style="padding: 0 4px; border-left: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">
              <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px; line-height: 1.2;">Sudah Dideder</div>
              <div style="font-size: 0.86rem; font-weight: 800; color: #15803D; line-height: 1.2; margin: 2px 0;">${totalSudahDeder.toLocaleString('id-ID')}</div>
              <div style="font-size: 0.64rem; color: #64748B; line-height: 1;">Butir</div>
            </div>
            <div style="padding: 0 4px;">
              <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px; line-height: 1.2;">${isEditMode ? 'Kapasitas Tersedia' : 'Sisa Belum Deder'}</div>
              <div id="lbl-sisa-saldo" style="font-size: 0.86rem; font-weight: 800; color: #D97706; line-height: 1.2; margin: 2px 0;">${sisaBelumDeder.toLocaleString('id-ID')}</div>
              <div style="font-size: 0.64rem; color: #64748B; line-height: 1;">Butir</div>
            </div>
          </div>
        </section>

        <!-- FORM INPUT AREA -->
        <section style="padding: 12px 14px 0 14px;">
          
          <!-- DETAIL TRANSAKSI BEDENGAN -->
          <div style="margin-bottom: 12px;">
            <h2 style="font-size: 0.80rem; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">
              Lokasi Bedengan Dederan
            </h2>
            
            <div style="display: flex; align-items: center; justify-content: space-between; background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 6px; padding: 8px 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span style="font-weight: 700; font-size: 0.86rem; color: #116834; letter-spacing: 0.02em;">${esc(bedCode)}</span>
              </div>
              ${!isEditMode ? `
                <button type="button" id="btn-ganti-bedengan" style="background: #FFFFFF; border: 1px solid #116834; color: #116834; font-size: 0.70rem; font-weight: 700; border-radius: 4px; padding: 4px 10px; cursor: pointer; transition: all 0.15s ease;">Ganti</button>
              ` : `
                <span style="font-size: 0.68rem; font-weight: 700; color: #15803D; background: #DCFCE7; border: 1px solid #BBF7D0; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;">
                  <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Terkunci
                </span>
              `}
            </div>
          </div>

          <!-- INPUT JUMLAH DEDER -->
          <div style="margin-bottom: 12px;">
            <label for="inp-jumlah-deder" style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
              Jumlah di Deder (Butir Benih) <span style="color: #DC2626;">*</span>
            </label>
            <div id="wrap-inp-jumlah" style="display: flex; align-items: stretch; border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden; background: #FFFFFF; height: 38px; transition: border-color 0.15s ease;">
              <input type="number" id="inp-jumlah-deder" placeholder="Masukkan jumlah benih..." min="${minAllowed}" max="${sisaBelumDeder}" value="${isEditMode ? editingTx.jumlahDeder : ''}" style="flex: 1; height: 100%; border: none; padding: 0 10px; font-size: 0.84rem; font-weight: 700; color: #0F172A; box-sizing: border-box; outline: none; background: transparent;">
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 12px; background: #F8FAFC; border-left: 1px solid #CBD5E1; color: #475569; font-size: 0.76rem; font-weight: 600; flex-shrink: 0;">
                Butir
              </div>
            </div>
            <div id="msg-validation" style="font-size: 0.68rem; margin-top: 4px; color: #64748B; line-height: 1.3;">
              ${inspSummary.totalDiperiksa > 0 
                ? `Minimal: ${minAllowed.toLocaleString('id-ID')} Butir (sudah diperiksa) • Maksimal: ${sisaBelumDeder.toLocaleString('id-ID')} Butir`
                : `Maksimal Jumlah Benih yang dapat dideder: ${sisaBelumDeder.toLocaleString('id-ID')} Butir`}
            </div>
          </div>

          <!-- INFORMASI SALDO DEDER -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 8px;">
              Ringkasan Saldo Dederan
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 4px;">
              <span style="color: #64748B;">Kapasitas Maksimal</span>
              <span style="font-weight: 600; color: #0F172A;">${sisaBelumDeder.toLocaleString('id-ID')} Butir</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 6px;">
              <span style="color: #64748B;">Jumlah Dideder</span>
              <span id="lbl-live-input" style="font-weight: 700; color: #15803D;">${(isEditMode ? editingTx.jumlahDeder : 0).toLocaleString('id-ID')} Butir</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; padding-top: 6px; border-top: 1px solid #E2E8F0;">
              <span style="font-weight: 700; color: #0F172A;">Sisa Belum di Deder</span>
              <span id="lbl-live-remaining" style="font-weight: 800; color: #DC2626; font-size: 0.78rem;">${(sisaBelumDeder - (isEditMode ? editingTx.jumlahDeder : 0)).toLocaleString('id-ID')} Butir</span>
            </div>
          </div>

          <!-- TAMBAH FOTO -->
          <section style="padding: 4px 0 16px 0; background: #FFFFFF;">
            <h2 style="font-size: 0.82rem; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">Tambah Foto Dokumentasi</h2>
            <p style="font-size: 0.68rem; color: #64748B; margin: 0 0 8px 0; line-height: 1.35;">
              Ambil foto di lokasi bedengan dederan (disertai timestamp waktu & lokasi otomatis).
            </p>
            
            <div id="photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;"></div>

            <button id="btn-tambah-foto" type="button" style="width: 100%; padding: 9px; background: #F8FAFC; border: 1px dashed #94A3B8; border-radius: 6px; color: #475569; font-size: 0.78rem; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 6px; cursor: pointer; transition: all 0.15s ease;">
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

      <!-- BOTTOM ACTION -->
      <footer style="padding: 10px 14px; background: #FFFFFF; border-top: 1px solid #E5E7EB; flex-shrink: 0; box-shadow: 0 -2px 8px rgba(0,0,0,0.04);">
        <button id="btn-simpan-deder" type="button" disabled style="width: 100%; height: 42px; background: #CBD5E1; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.84rem; cursor: not-allowed; transition: all 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.06);">
          ${isEditMode ? 'Simpan Koreksi Transaksi Dederan' : 'Simpan Transaksi Dederan'}
        </button>
      </footer>

      <!-- CAMERA OVERLAY (PERSIS SEEDING FORM) -->
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

  let photos = isEditMode && Array.isArray(editingTx.photos) ? [...editingTx.photos] : [];
  const inpJumlah = app.querySelector('#inp-jumlah-deder');
  const wrapInpJumlah = app.querySelector('#wrap-inp-jumlah');
  const btnSimpan = app.querySelector('#btn-simpan-deder');
  const lblLiveInput = app.querySelector('#lbl-live-input');
  const lblLiveRemaining = app.querySelector('#lbl-live-remaining');
  const msgValidation = app.querySelector('#msg-validation');

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
    photoContainer.innerHTML = photos.map((p, idx) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: 4px; overflow: hidden; border: 1px solid #D9D9D9;">
        <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
        <button class="btn-hapus-foto" data-index="${idx}" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; padding: 4px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `).join('');

    photoContainer.querySelectorAll('.btn-hapus-foto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        photos.splice(idx, 1);
        renderPhotos();
      });
    });
  };

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
    const timeFormatted = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const ts = `${today} ${timeFormatted} WIB`;

    if (isCameraActive && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0);

      // Add timestamp bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, canvasEl.height - 40, canvasEl.width, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText(`SIGMA NURSERY | ${bedCode} | ${ts}`, 10, canvasEl.height - 15);

      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    } else {
      // Dummy / simulation photo with timestamp
      canvasEl.width = 400;
      canvasEl.height = 400;
      const ctx = canvasEl.getContext('2d');
      ctx.fillStyle = '#116834';
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
      ctx.fillText(`DEDERAN: ${bedCode}`, 200, 190);
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillText(`Induk: ${parent.docNo}`, 200, 220);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 360, 400, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillText(`SIGMA | ${bedCode} | ${ts}`, 10, 385);
      dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
    }

    photos.push(dataUrl);
    stopCamera();
    renderPhotos();
  });

  const validateInput = () => {
    const val = parseInt(inpJumlah.value || 0, 10);
    lblLiveInput.textContent = `${val.toLocaleString('id-ID')} Butir`;
    const remaining = sisaBelumDeder - val;
    lblLiveRemaining.textContent = `${Math.max(0, remaining).toLocaleString('id-ID')} Butir`;

    if (val >= minAllowed && val <= sisaBelumDeder) {
      btnSimpan.disabled = false;
      btnSimpan.style.background = '#116834';
      btnSimpan.style.cursor = 'pointer';
      if (wrapInpJumlah) wrapInpJumlah.style.borderColor = '#116834';
      msgValidation.style.color = '#15803D';
      msgValidation.textContent = `Sisa Belum di Deder: ${remaining.toLocaleString('id-ID')} Butir`;
    } else {
      btnSimpan.disabled = true;
      btnSimpan.style.background = '#CBD5E1';
      btnSimpan.style.cursor = 'not-allowed';
      const isExceed = val > sisaBelumDeder;
      const isUnderMin = val < minAllowed;
      if (wrapInpJumlah) wrapInpJumlah.style.borderColor = (isExceed || isUnderMin) ? '#DC2626' : '#CBD5E1';
      msgValidation.style.color = (isExceed || isUnderMin) ? '#DC2626' : '#64748B';
      if (isUnderMin && inspSummary.totalDiperiksa > 0) {
        msgValidation.textContent = `⚠️ Jumlah tidak boleh kurang dari hasil periksa (${inspSummary.totalDiperiksa.toLocaleString('id-ID')} Butir)`;
      } else if (isExceed) {
        msgValidation.textContent = `⚠️ Jumlah melebihi kapasitas tersedia (${sisaBelumDeder.toLocaleString('id-ID')} Butir)`;
      } else {
        msgValidation.textContent = `Minimal: ${minAllowed.toLocaleString('id-ID')} • Maksimal: ${sisaBelumDeder.toLocaleString('id-ID')} Butir`;
      }
    }
  };

  inpJumlah?.addEventListener('input', validateInput);

  app.querySelector('#btn-back')?.addEventListener('click', () => {
    storage.remove('editing_dederan_doc_no');
    navigate('/seeding');
  });

  app.querySelector('#btn-ganti-bedengan')?.addEventListener('click', () => {
    navigate('/seeding/dederan/scan');
  });

  btnSimpan?.addEventListener('click', () => {
    const val = parseInt(inpJumlah.value || 0, 10);
    if (val < minAllowed || val > sisaBelumDeder) return;

    try {
      if (isEditMode) {
        const updatedTx = updateDederanTransaction(editingTx.docNo, {
          jumlahDeder: val,
          photos
        });

        // Clear temp storage
        storage.remove('editing_dederan_doc_no');
        storage.remove('scanned_dederan_bedengan_id');
        storage.remove('scanned_dederan_bedengan_code');
        storage.remove('scanned_dederan_bedengan_name');

        toast(`Koreksi transaksi ${updatedTx.docNo} berhasil disimpan!`, 'success');

        setTimeout(() => {
          navigate('/seeding');
        }, 500);
      } else {
        const savedTx = saveDederanTransaction({
          parentDederIndukDocNo: parent.docNo,
          bedenganId: bedId,
          bedenganCode: bedCode,
          jumlahDeder: val,
          photos,
          tanggalDeder: formatDate(new Date().toISOString()),
          createdBy: user.name
        });

        // Clear temp scan storage
        storage.remove('scanned_dederan_bedengan_id');
        storage.remove('scanned_dederan_bedengan_code');
        storage.remove('scanned_dederan_bedengan_name');

        toast(`Transaksi ${savedTx.docNo} berhasil disimpan!`, 'success');

        setTimeout(() => {
          navigate('/seeding');
        }, 500);
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Initial render for photos and validation
  renderPhotos();
  if (isEditMode && inpJumlah.value) {
    validateInput();
  }
}

