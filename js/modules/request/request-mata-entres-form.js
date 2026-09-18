/**
 * js/modules/request/request-mata-entres-form.js
 * Form Pengajuan Permintaan Mata Entres (Role Pengurus)
 * 
 * Spesifikasi Form:
 * 1. Format Nomor Dokumen: YYYY/REQ/ETRS/XXX (e.g. 2026/REQ/ETRS/001)
 * 2. Tanggal Permintaan: Current date (default hari ini, otomatis)
 * 3. Tanggal Dibutuhkan: Input Date (required)
 * 4. Jenis Klon: Master Data Klon (getActiveKlons, required)
 * 5. Jlh Batang: Input Number (min="1", required)
 * 6. Jlh Mata Entres: Input Number (min="1", required)
 * 7. Kebun Pemohon: Mengikuti estate user yang login (read-only)
 * 8. Kebun Dituju: Pilihan kebun tujuan (kebun sepupu sumber entres)
 * 9. Catatan Kebutuhan: Input catatan/deskripsi opsional
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { requestRepository } from '../../db/repositories.js';
import { getActiveKlons, resolveKlon } from '../../data/klon-master.js';
import { getActiveEstates, resolveEstate } from '../../data/estate-master.js';
import {
  formatDate,
  formatFullDateIndonesian,
  todayISO,
  nowISO,
  generateUniqueDocNo,
  esc
} from '../../core/utils.js';

const ALLOWED_CREATE_ROLES = ['PENGURUS'];

export async function renderRequestMataEntresForm() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = getCurrentUserContext() || session.get() || { name: 'Pengurus', role: 'PENGURUS', position: 'Pengurus Kebun', estateId: 'EST-TBS' };

  // ROUTE GUARD: Hanya PENGURUS yang boleh membuat Permintaan Mata Entres
  const userRole = normalizeRole(user.role || user.rawRole);
  if (!ALLOWED_CREATE_ROLES.includes(userRole)) {
    toast('Anda tidak memiliki otorisasi untuk membuat Permintaan Mata Entres.', 'error');
    navigate('/request');
    return;
  }

  const today = formatFullDateIndonesian(new Date());

  // Load existing requests for unique document numbering (REQ/ETRS)
  let existingRequests = [];
  try {
    existingRequests = await requestRepository.list();
  } catch (err) {
    existingRequests = storage.get('requests_transactions', []);
  }
  const docNo = generateUniqueDocNo('REQ/ETRS', existingRequests);

  // 1. Kebun Pemohon (User Estate)
  const userEstateId = user.estateId || 'EST-TBS';
  const userEstateObj = resolveEstate(userEstateId);
  const userEstateName = userEstateObj ? userEstateObj.estate_name : userEstateId;

  // 2. Kebun Dituju (Pilihan Kebun Sepupu)
  const allEstates = getActiveEstates();
  const targetEstates = allEstates.filter(e => e.estate_id !== userEstateId);
  const estateOptions = targetEstates.map(e => `
    <option value="${esc(e.estate_id)}">${esc(e.estate_name)}</option>
  `).join('');

  // 3. Pilihan Klon dari Master Data Klon
  const activeKlons = getActiveKlons();
  const cloneOptions = activeKlons.map(c => `
    <option value="${esc(c.canonicalName)}">${esc(c.canonicalName)}</option>
  `).join('');

  app.innerHTML = `
    <div class="page request-mata-entres-form-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; overflow: hidden;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 50px; padding: 0 14px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0; z-index: 20;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Permintaan Mata Entres</h1>
      </header>

      <!-- SCROLLABLE FORM BODY -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 10px 12px 32px 12px; max-width: 500px; margin: 0 auto; width: 100%; box-sizing: border-box;">
        
        <!-- CARD INFO DOKUMEN & HEADER -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div>
              <div style="font-size: 0.66rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">Nomor Dokumen</div>
              <div style="font-size: 0.88rem; font-weight: 800; color: #116834; margin-top: 1px;">${esc(docNo)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.66rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">Tanggal Permintaan</div>
              <div style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-top: 1px;">${formatDate(new Date())}</div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #F1F5F9; padding-top: 6px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748B;">Pemohon:</span>
              <span style="font-weight: 700; color: #1E293B;">${esc(user.name || 'Pengurus')} (${esc(user.position || 'Pengurus')})</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748B;">Kebun Pemohon:</span>
              <span style="font-weight: 700; color: #116834;">${esc(userEstateName)}</span>
            </div>
          </div>
        </div>

        <!-- FORM INPUT RINCIAN -->
        <form id="form-request-mata-entres" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 12px 14px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin-bottom: 16px;">
          <h2 style="font-size: 0.84rem; font-weight: 800; color: #0F172A; margin: 0 0 10px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px;">
            Rincian Kebutuhan Mata Entres
          </h2>

          <!-- FIELD: KEBUN DITUJU -->
          <div style="margin-bottom: 10px;">
            <label for="select-target-estate" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Kebun Dituju (Sumber Entres) <span style="color: #DC2626;">*</span>
            </label>
            <select 
              id="select-target-estate" 
              name="targetEstateId" 
              style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF; color: #0F172A;"
              required
            >
              ${estateOptions}
            </select>
            <div style="font-size: 0.68rem; color: #64748B; margin-top: 3px; line-height: 1.2;">
              Pilih kebun sepupu penyedia kayu/mata entres.
            </div>
          </div>

          <!-- FIELD: TANGGAL DIBUTUHKAN -->
          <div style="margin-bottom: 10px;">
            <label for="input-required-date" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Tanggal Dibutuhkan <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="input-required-date" 
              name="requiredDate" 
              value="${todayISO()}"
              min="${todayISO()}"
              style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF; color: #0F172A;"
              required
            />
            <div style="font-size: 0.68rem; color: #64748B; margin-top: 3px; line-height: 1.2;">
              Estimasi tanggal pelaksanaan penempelan/okulasi di kebun pemohon.
            </div>
          </div>

          <!-- FIELD: JENIS KLON -->
          <div style="margin-bottom: 10px;">
            <label for="select-klon" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Jenis Klon <span style="color: #DC2626;">*</span>
            </label>
            <select 
              id="select-klon" 
              name="klon" 
              style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 7px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF; color: #0F172A;"
              required
            >
              <option value="" disabled selected>-- Pilih Klon Master --</option>
              ${cloneOptions}
            </select>
          </div>

          <!-- DUAL FIELDS: JLH BATANG & JLH MATA ENTRES -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div>
              <label for="input-jumlah-batang" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
                Jlh Batang <span style="color: #DC2626;">*</span>
              </label>
              <input 
                type="number" 
                id="input-jumlah-batang" 
                name="jumlahBatang" 
                min="1" 
                placeholder="0"
                style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; font-weight: 700; color: #0F172A;"
                required
              />
              <div style="font-size: 0.66rem; color: #64748B; margin-top: 2px;">Batang / Kayu</div>
            </div>

            <div>
              <label for="input-jumlah-mata" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
                Jlh Mata Entres <span style="color: #DC2626;">*</span>
              </label>
              <input 
                type="number" 
                id="input-jumlah-mata" 
                name="jumlahMataEntres" 
                min="1" 
                placeholder="0"
                style="width: 100%; box-sizing: border-box; min-height: 38px; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; font-weight: 700; color: #0F172A;"
                required
              />
              <div style="font-size: 0.66rem; color: #64748B; margin-top: 2px;">Mata Entres</div>
            </div>
          </div>

          <!-- FIELD: CATATAN KEBUTUHAN -->
          <div style="margin-bottom: 12px;">
            <label for="input-catatan" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.76rem;">
              Catatan Kebutuhan (Opsional)
            </label>
            <textarea 
              id="input-catatan" 
              name="catatan" 
              rows="2" 
              placeholder="Contoh: Kebutuhan okulasi baru batch 2 nursery blok B..."
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-family: inherit; resize: vertical; color: #0F172A;"
            ></textarea>
          </div>

          <!-- ACTION BUTTONS -->
          <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #F1F5F9; padding-top: 12px;">
            <button 
              type="button" 
              id="btn-cancel" 
              style="flex: 1; min-height: 38px; padding: 8px 14px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #475569; cursor: pointer; transition: background 0.15s ease;"
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-submit" 
              style="flex: 1.6; min-height: 38px; padding: 8px 16px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.15); transition: background 0.15s ease;"
            >
              Ajukan Permintaan
            </button>
          </div>
        </form>
      </main>
    </div>
  `;

  // Attach Event Handlers
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/request/mata-entres');
  });

  app.querySelector('#btn-cancel')?.addEventListener('click', () => {
    navigate('/request/mata-entres');
  });

  app.querySelector('#form-request-mata-entres')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const targetEstateId = app.querySelector('#select-target-estate')?.value;
    const requiredDate = app.querySelector('#input-required-date')?.value;
    const klon = app.querySelector('#select-klon')?.value;
    const jumlahBatang = parseInt(app.querySelector('#input-jumlah-batang')?.value, 10);
    const jumlahMataEntres = parseInt(app.querySelector('#input-jumlah-mata')?.value, 10);
    const catatan = app.querySelector('#input-catatan')?.value || '';

    // Validasi
    if (!targetEstateId) {
      toast('Kebun Dituju wajib dipilih', 'error');
      return;
    }
    if (!requiredDate) {
      toast('Tanggal Dibutuhkan wajib diisi', 'error');
      return;
    }
    if (!klon) {
      toast('Jenis Klon wajib dipilih', 'error');
      return;
    }
    if (isNaN(jumlahBatang) || jumlahBatang <= 0) {
      toast('Jumlah Batang harus berupa angka lebih dari 0', 'error');
      return;
    }
    if (isNaN(jumlahMataEntres) || jumlahMataEntres <= 0) {
      toast('Jumlah Mata Entres harus berupa angka lebih dari 0', 'error');
      return;
    }

    const targetEstateObj = resolveEstate(targetEstateId);
    const targetEstateName = targetEstateObj ? targetEstateObj.estate_name : targetEstateId;

    // Tampilkan Modal Konfirmasi
    openModal({
      title: 'Konfirmasi Pengajuan Permintaan',
      body: `
        <div style="font-size: 0.84rem; line-height: 1.5; color: #334155;">
          <p style="margin: 0 0 10px 0;">Apakah Anda yakin ingin mengajukan Permintaan Mata Entres berikut?</p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
            <div style="display: grid; grid-template-columns: 45% 55%; gap: 6px; font-size: 0.78rem;">
              <span style="color: #64748B;">No. Dokumen:</span>
              <span style="font-weight: 700; color: #116834;">${esc(docNo)}</span>
              <span style="color: #64748B;">Kebun Tujuan:</span>
              <span style="font-weight: 700; color: #1E293B;">${esc(targetEstateName)}</span>
              <span style="color: #64748B;">Jenis Klon:</span>
              <span style="font-weight: 700; color: #1E293B;">${esc(klon)}</span>
              <span style="color: #64748B;">Jlh Batang:</span>
              <span style="font-weight: 700; color: #1E293B;">${jumlahBatang.toLocaleString('id-ID')} Batang</span>
              <span style="color: #64748B;">Jlh Mata Entres:</span>
              <span style="font-weight: 700; color: #116834;">${jumlahMataEntres.toLocaleString('id-ID')} Mata</span>
              <span style="color: #64748B;">Tgl Dibutuhkan:</span>
              <span style="font-weight: 700; color: #1E293B;">${esc(requiredDate)}</span>
            </div>
          </div>
        </div>
      `,
      footer: `
        <div style="display: flex; gap: 8px; justify-content: flex-end; width: 100%;">
          <button type="button" id="btn-modal-cancel" style="padding: 8px 16px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-weight: 600; color: #475569; cursor: pointer;">
            Batal
          </button>
          <button type="button" id="btn-modal-confirm" style="padding: 8px 18px; background: #116834; border: 1px solid #116834; border-radius: 6px; font-size: 0.82rem; font-weight: 700; color: #FFFFFF; cursor: pointer;">
            Ya, Ajukan
          </button>
        </div>
      `
    });

    const modalRoot = document.getElementById('modal-root');
    modalRoot?.querySelector('#btn-modal-cancel')?.addEventListener('click', closeModal);
    modalRoot?.querySelector('#btn-modal-confirm')?.addEventListener('click', async () => {
      closeModal();
      await submitMataEntresRequest({
        docNo,
        targetEstateId,
        targetEstateName,
        requiredDate,
        klon,
        jumlahBatang,
        jumlahMataEntres,
        catatan,
        user
      });
    });
  });
}

/**
 * Simpan transaksi Permintaan Mata Entres baru
 */
export async function submitMataEntresRequest(data) {
  const resolvedKlon = resolveKlon(data.klon);
  const canonicalKlon = resolvedKlon ? resolvedKlon.canonicalName : (data.klon || '');

  const newRecord = {
    id: 'REQ-ME-' + Date.now(),
    docNo: data.docNo,
    nomorDokumen: data.docNo,
    type: 'MATA_ENTRES',
    status: 'DIAJUKAN',
    statusLabel: 'Diajukan',
    workflowStage: 'DIAJUKAN',

    // Transaction Date Context
    createdAt: nowISO(),
    date: todayISO(),
    tanggal: todayISO(),
    requestDate: todayISO(),
    requiredDate: data.requiredDate,

    // Requester Context (Kebun Peminta)
    userId: data.user.userId || data.user.id || 'PGS001',
    role: data.user.role || 'PENGURUS',
    requestedBy: data.user.name || 'Pengurus',
    requester: data.user.name || 'Pengurus',
    position: data.user.position || 'Pengurus Kebun',
    divisionName: data.user.divisionName || '',
    estateId: data.user.estateId || 'EST-TBS',
    requesterEstate: data.user.estateId || 'EST-TBS',
    sourceEstateId: data.user.estateId || 'EST-TBS',
    sourceEstateName: resolveEstate(data.user.estateId)?.estate_name || data.user.estateId,

    // Target Context (Kebun Pengirim / Sumber Entres)
    targetEstateId: data.targetEstateId,
    targetEstate: data.targetEstateId,
    targetEstateName: data.targetEstateName,
    targetNextEstateId: data.targetEstateId,
    targetNextRole: 'PENGURUS',

    // Data Permintaan Awal
    klon: canonicalKlon,
    jumlahBatang: Number(data.jumlahBatang),
    jumlahMataEntres: Number(data.jumlahMataEntres),
    qty: Number(data.jumlahMataEntres), // alias
    catatan: data.catatan ? data.catatan.trim() : null,
    notes: data.catatan ? data.catatan.trim() : null,

    // Tahap Pengeluaran & Penerimaan (Awalnya null)
    approval: null,
    verification: null,
    pengeluaran: null,
    penerimaan: null,

    // Fields terpisah sesuai spesifikasi
    jumlahBatangDikeluarkan: null,
    jumlahMataEntresDikeluarkan: null,
    tanggalPengeluaran: null,

    jumlahBatangDiterima: null,
    jumlahMataEntresDiterima: null,
    tanggalPenerimaan: null
  };

  try {
    let savedRecord = null;
    try {
      savedRecord = await requestRepository.create(newRecord, data.user);
    } catch (e) {
      savedRecord = newRecord;
    }
    const localList = storage.get('requests_transactions', []);
    localList.unshift(savedRecord || newRecord);
    storage.set('requests_transactions', localList);

    if (typeof toast === 'function' && typeof document !== 'undefined') {
      toast(`Dokumen Permintaan Mata Entres ${data.docNo} berhasil diajukan.`, 'success');
    }
    if (typeof navigate === 'function' && typeof window !== 'undefined') {
      navigate('/request/mata-entres');
    }
    return savedRecord || newRecord;
  } catch (err) {
    console.error('[submitMataEntresRequest] Gagal menyimpan permintaan:', err);
    if (typeof toast === 'function' && typeof document !== 'undefined') {
      toast('Gagal mengajukan permohonan mata entres.', 'error');
    }
    throw err;
  }
}
