import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import {
  programReplantingRepository,
  requestRepository
} from '../../db/repositories.js';
import { getActiveKlons, resolveKlon } from '../../data/klon-master.js';
import {
  formatDate,
  formatFullDateIndonesian,
  todayISO,
  nowISO,
  generateUniqueDocNo,
  esc
} from '../../core/utils.js';

export async function renderRequestKebunSepupuForm() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = getCurrentUserContext() || session.get() || { name: 'Junaidi', role: 'PENGURUS', position: 'Pengurus Kebun' };
  const today = formatFullDateIndonesian(new Date());

  // Load existing requests for unique document numbering
  let existingRequests = [];
  try {
    existingRequests = await requestRepository.list();
  } catch (err) {
    existingRequests = storage.get('requests_transactions', []);
  }
  const docNo = generateUniqueDocNo('request', existingRequests);

  // Load Master Data (Replanting Programs)
  let programs = [];
  try {
    programs = await programReplantingRepository.list();
  } catch (err) {
    console.warn('[request-form] Gagal memuat master data program:', err);
  }

  // Fallback jika database belum berisi master program
  if (!programs || programs.length === 0) {
    programs = [
      { id: 'PRP-2026-01', code: 'PRP-2026-01', name: 'Program Replanting 2026' },
      { id: 'PRP-2026-02', code: 'PRP-2026-02', name: 'Program Replanting 2026 Tahap 2' }
    ];
  }

  // Master Klon Terpusat (57 Klon Aktif Resmi)
  const activeKlons = getActiveKlons();

  const programOptions = programs.map(p => `
    <option value="${esc(p.name || p.code)}">${esc(p.name || p.code)}</option>
  `).join('');

  const cloneOptions = activeKlons.map(c => `
    <option value="${esc(c.canonicalName)}">${esc(c.canonicalName)}</option>
  `).join('');

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.15rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Permintaan Bibit Kebun Sepupu</h1>
      </header>

      <!-- SCROLLABLE FORM BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        <!-- CARD INFO DOKUMEN -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Nomor Dokumen</div>
              <div style="font-size: 0.92rem; font-weight: 800; color: #116834; margin-top: 2px;">${esc(docNo)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Tanggal</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #334155; margin-top: 2px;">${esc(today)}</div>
            </div>
          </div>
          <div style="border-top: 1px solid #F1F5F9; padding-top: 8px; display: flex; justify-content: space-between; font-size: 0.78rem;">
            <span style="color: #64748B;">Pemohon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(user.name || 'Pengurus')} (${esc(user.position || 'Pengurus')})</span>
          </div>
        </div>

        <!-- FORM INPUT -->
        <form id="form-request-ksp" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <h2 style="font-size: 0.9rem; font-weight: 800; color: #0F172A; margin: 0 0 14px 0;">Rincian Kebutuhan Permintaan</h2>

          <!-- FIELD 1: RENCANA TANAM -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Rencana Tanam <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-program" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              <option value="">-- Pilih Rencana Tanam --</option>
              ${programOptions}
            </select>
            <div class="field-hint" style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">
              Kebutuhan bibit sesuai luas areal tanam.
            </div>
          </div>

          <!-- FIELD 2: KLON YANG DIMINTA -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Klon yang Diminta <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-klon" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              <option value="">-- Pilih Klon --</option>
              ${cloneOptions}
            </select>
          </div>

          <!-- FIELD 3: JUMLAH BIBIT -->
          <div class="field" style="margin-bottom: 20px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Jumlah Bibit (Pkk) <span style="color: #EF4444;">*</span>
            </label>
            <div style="position: relative; display: flex; align-items: center;">
              <input 
                id="input-qty" 
                class="field-control" 
                type="number" 
                min="1" 
                step="1" 
                placeholder="Masukkan jumlah bibit (misal: 1500)" 
                required 
                style="width: 100%; min-height: 44px; padding: 10px 50px 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.95rem; font-weight: 700; color: #0F172A;"
              />
              <span style="position: absolute; right: 14px; font-size: 0.82rem; font-weight: 700; color: #64748B;">Pkk</span>
            </div>
          </div>

          <!-- BUTTON ACTION -->
          <button id="btn-review" type="button" class="btn btn-primary btn-block" style="width: 100%; min-height: 46px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.92rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s ease;">
            Review Pengajuan
          </button>
        </form>
      </main>
    </div>
  `;

  // Back button
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/request');
  });

  // Review button handler
  app.querySelector('#btn-review')?.addEventListener('click', () => {
    const program = app.querySelector('#input-program')?.value?.trim();
    const klon = app.querySelector('#input-klon')?.value?.trim();
    const qtyStr = app.querySelector('#input-qty')?.value?.trim();
    const qty = parseInt(qtyStr, 10);

    // Validasi input form
    if (!program) {
      toast('Silakan pilih Rencana Tanam. Revisi permohonan.', 'warning');
      app.querySelector('#input-program')?.focus();
      return;
    }

    if (!klon) {
      toast('Silakan pilih Klon yang diminta. Revisi permohonan.', 'warning');
      app.querySelector('#input-klon')?.focus();
      return;
    }

    if (!qtyStr || isNaN(qty) || qty <= 0) {
      toast('Jumlah bibit harus berupa angka positif. Revisi permohonan.', 'warning');
      app.querySelector('#input-qty')?.focus();
      return;
    }

    // Tampilkan Modal Review Pengajuan
    openReviewModal({
      docNo,
      today,
      user,
      program,
      klon,
      qty
    });
  });
}

/** Modal Review Pengajuan Sebelum Submit */
function openReviewModal(data) {
  openModal({
    title: 'Review Pengajuan Permintaan Bibit',
    body: `
      <div style="padding: 4px 0;">
        <p style="font-size: 0.82rem; color: #64748B; margin: 0 0 12px 0; line-height: 1.4;">
          Pastikan rincian permintaan bibit kebun sepupu di bawah ini telah sesuai sebelum diajukan:
        </p>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;">
            <span style="color: #64748B;">No. Dokumen</span>
            <span style="font-weight: 800; color: #116834;">${esc(data.docNo)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748B;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(data.user.name || 'Pengurus')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748B;">Rencana Tanam</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(data.program)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #64748B;">Klon yang Diminta</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(data.klon)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span style="color: #64748B; font-weight: 600;">Jumlah Diminta</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: #116834;">${data.qty.toLocaleString('id-ID')} Pkk</span>
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 10px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-modal" style="flex: 1; border: 1px solid #CBD5E1; color: #475569;">Ubah Data</button>
        <button class="btn btn-primary" id="btn-confirm-submit" style="flex: 1.4; background: #116834; color: #FFFFFF;">Submit Pengajuan</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-modal')?.addEventListener('click', closeModal);

  root?.querySelector('#btn-confirm-submit')?.addEventListener('click', async () => {
    closeModal();
    await submitRequest(data);
  });
}

/** Proses Penyimpanan Transaksi Permintaan */
async function submitRequest(data) {
  const resolvedKlon = resolveKlon(data.klon);
  const canonicalKlon = resolvedKlon ? resolvedKlon.canonicalName : (data.klon || '');

  const newRecord = {
    id: `REQ-${Date.now()}`,
    docNo: data.docNo,
    nomorDokumen: data.docNo,
    type: 'KEBUN_SEPUPU',
    category: 'BIBIT_KEBUN_SEPUPU',
    requestType: 'BIBIT',
    program: data.program,
    klon: canonicalKlon,
    qty: data.qty,
    requestedQty: data.qty,
    unit: 'Pkk',
    status: 'DIAJUKAN',
    statusLabel: 'Diajukan',
    requestedBy: data.user.name || 'Junaidi',
    userId: data.user.userId || data.user.id || 'PGS001',
    role: data.user.role || 'PENGURUS',
    position: data.user.position || 'Pengurus Kebun',
    divisionName: data.user.divisionName || 'Tanah Besih - Divisi I',
    createdAt: nowISO(),
    date: todayISO(),
    tanggal: todayISO()
  };

  try {
    // 1. Simpan ke IndexedDB requests store (dengan actor snapshot otomatis)
    const savedRecord = await requestRepository.create(newRecord, data.user);

    // 2. Simpan ke LocalStorage fallback agar kompatibel dengan transaction-manager
    const localList = storage.get('requests_transactions', []);
    localList.unshift(savedRecord);
    storage.set('requests_transactions', localList);

    toast('Dokumen Permintaan Bibit diajukan.', 'success');

    // Kembali ke Landing Page Permintaan Bibit
    navigate('/request');
  } catch (err) {
    console.error('[submitRequest] Gagal menyimpan permintaan:', err);
    toast('Gagal mengajukan permohonan. Revisi permohonan.', 'danger');
  }
}
