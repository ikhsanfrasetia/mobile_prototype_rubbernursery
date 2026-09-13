import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { openModal, closeModal } from '../../components/modal.js';
import { requestRepository } from '../../db/repositories.js';
import { getActiveKlons, resolveKlon } from '../../data/klon-master.js';
import { getActiveCfnaMaster, getCfnaByCode } from '../../data/cfna-master.js';
import { getActiveEstates, resolveEstate } from '../../data/estate-master.js';
import { getActivePrograms, getProgramById } from '../../data/program-master.js';
import {
  formatDate,
  formatFullDateIndonesian,
  todayISO,
  nowISO,
  generateUniqueDocNo,
  esc
} from '../../core/utils.js';

/**
 * Daftar role yang diizinkan membuat Permintaan Kebun Sepupu.
 * HANYA PENGURUS yang boleh create request.
 */
const ALLOWED_CREATE_ROLES = ['PENGURUS'];

export async function renderRequestKebunSepupuForm() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = getCurrentUserContext() || session.get() || { name: 'Junaidi', role: 'PENGURUS', position: 'Pengurus Kebun', estateId: 'EST-TBS' };

  // ========================================================================
  // ROUTE GUARD: Hanya PENGURUS yang boleh mengakses form create request.
  // MANTRI_TANAMAN, ASISTEN_BIBITAN, ASKEP, dan role lain ditolak.
  // ========================================================================
  const userRole = normalizeRole(user.role || user.rawRole);
  if (!ALLOWED_CREATE_ROLES.includes(userRole)) {
    toast('Anda tidak memiliki otorisasi untuk membuat Permintaan Kebun Sepupu.', 'error');
    navigate('/request');
    return;
  }

  const today = formatFullDateIndonesian(new Date());

  // Load existing requests for unique document numbering
  let existingRequests = [];
  try {
    existingRequests = await requestRepository.list();
  } catch (err) {
    existingRequests = storage.get('requests_transactions', []);
  }
  const docNo = generateUniqueDocNo('request', existingRequests);

  // 1. Pilih Kebun Dituju
  const allEstates = getActiveEstates();
  const targetEstates = allEstates.filter(e => e.estate_id !== user.estateId);
  const estateOptions = targetEstates.map(e => `
    <option value="${esc(e.estate_id)}">${esc(e.estate_name)}</option>
  `).join('');

  // 2. Program Pembibitan
  const activePrograms = getActivePrograms();
  const programOptions = activePrograms.map(p => `
    <option value="${esc(p.id)}">${esc(p.code)} - ${esc(p.name)}</option>
  `).join('');

  // 3. Kode Alokasi
  const activeCfna = getActiveCfnaMaster();
  const cfnaOptions = activeCfna.map(c => `
    <option value="${esc(c.code)}">${esc(c.code)} - ${esc(c.name)}</option>
  `).join('');

  // 4. Klon yang Diminta
  const activeKlons = getActiveKlons();
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

          <!-- FIELD 1: PILIH KEBUN DITUJU -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Pilih Kebun Dituju <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-target-estate" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              <option value="">-- Pilih Kebun --</option>
              ${estateOptions}
            </select>
          </div>

          <!-- FIELD 2: PROGRAM PEMBIBITAN -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Program Pembibitan <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-program" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              ${programOptions}
            </select>
          </div>

          <!-- FIELD 3: KODE ALOKASI -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Kode Alokasi <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-allocation" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              <option value="">-- Pilih Kode Alokasi --</option>
              ${cfnaOptions}
            </select>
          </div>

          <!-- FIELD 4: KLON YANG DIMINTA -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Klon yang Diminta <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-klon" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              <option value="">-- Pilih Klon --</option>
              ${cloneOptions}
            </select>
          </div>

          <!-- FIELD 4: KATEGORI -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Kategori <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-category" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              <option value="">-- Pilih Kategori --</option>
              <option value="APM">APM</option>
              <option value="Seedlings">Seedlings</option>
            </select>
          </div>

          <!-- FIELD 5: TAHAPAN PERTUMBUHAN -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Tahapan Pertumbuhan <span style="color: #EF4444;">*</span>
            </label>
            <select id="input-growth-stage" class="field-control" required style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;">
              <option value="">-- Pilih Tahapan Pertumbuhan --</option>
              <option value="Rubber Main Nursery">Rubber Main Nursery</option>
              <option value="Rubber Advance Planting Material">Rubber Advance Planting Material</option>
            </select>
          </div>

          <!-- FIELD 6: BANYAKNYA (PKK) -->
          <div class="field" style="margin-bottom: 14px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Banyaknya (Pkk) <span style="color: #EF4444;">*</span>
            </label>
            <div style="position: relative; display: flex; align-items: center;">
              <input 
                id="input-qty" 
                class="field-control" 
                type="number" 
                min="0" 
                step="1" 
                placeholder="Masukkan jumlah bibit" 
                required 
                style="width: 100%; min-height: 44px; padding: 10px 50px 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.95rem; font-weight: 700; color: #0F172A;"
              />
              <span style="position: absolute; right: 14px; font-size: 0.82rem; font-weight: 700; color: #64748B;">Pkk</span>
            </div>
            <div class="field-hint" style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">
              Jumlah tidak boleh lebih kecil dari 0
            </div>
          </div>

          <!-- FIELD 7: TANGGAL DIBUTUHKAN -->
          <div class="field" style="margin-bottom: 20px;">
            <label class="field-label" style="display: block; font-size: 0.8rem; font-weight: 700; color: #334155; margin-bottom: 6px;">
              Tanggal Dibutuhkan <span style="color: #EF4444;">*</span>
            </label>
            <input 
              id="input-required-date" 
              class="field-control" 
              type="date" 
              required 
              style="width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; font-size: 0.88rem; color: #0F172A;"
            />
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
    navigate('/request/kebun-sepupu');
  });

  // Review button handler
  app.querySelector('#btn-review')?.addEventListener('click', () => {
    const targetEstateId = app.querySelector('#input-target-estate')?.value?.trim();
    const programId = app.querySelector('#input-program')?.value?.trim();
    const allocationCode = app.querySelector('#input-allocation')?.value?.trim();
    const klon = app.querySelector('#input-klon')?.value?.trim();
    const category = app.querySelector('#input-category')?.value?.trim();
    const growthStage = app.querySelector('#input-growth-stage')?.value?.trim();
    const qtyStr = app.querySelector('#input-qty')?.value?.trim();
    const requiredDate = app.querySelector('#input-required-date')?.value?.trim();
    
    const qty = parseInt(qtyStr, 10);

    // Validasi
    if (!targetEstateId) {
      toast('Silakan pilih Kebun Dituju.', 'warning');
      return;
    }
    if (targetEstateId === user.estateId) {
      toast('Kebun Dituju tidak boleh sama dengan kebun asal pemohon.', 'warning');
      return;
    }
    if (!allocationCode) {
      toast('Silakan pilih Kode Alokasi.', 'warning');
      return;
    }
    if (!klon) {
      toast('Silakan pilih Klon yang diminta.', 'warning');
      return;
    }
    if (!category) {
      toast('Silakan pilih Kategori.', 'warning');
      return;
    }
    if (!growthStage) {
      toast('Silakan pilih Tahapan Pertumbuhan.', 'warning');
      return;
    }
    if (!qtyStr || isNaN(qty) || qty <= 0) {
      toast('Jumlah bibit harus berupa angka dan minimal lebih besar dari 0.', 'warning');
      return;
    }
    if (!requiredDate) {
      toast('Silakan isi Tanggal Dibutuhkan.', 'warning');
      return;
    }

    const resolvedTargetEstate = resolveEstate(targetEstateId);
    const purpose = 'Penanaman / Bibit Tanam';
    const programObj = getProgramById(programId);
    
    // Tampilkan Modal Review Pengajuan
    openReviewModal({
      docNo,
      today,
      user,
      targetEstateId,
      targetEstateName: resolvedTargetEstate ? resolvedTargetEstate.estate_name : targetEstateId,
      programId: programId || 'PRG-2026-001',
      programName: programObj ? programObj.name : 'Program Nursery 2026 - Batch 1',
      purpose,
      allocationCode,
      klon,
      category,
      growthStage,
      qty,
      requiredDate
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
          <!-- 1. NO. DOKUMEN -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">No. Dokumen</span>
            <span style="font-weight: 800; color: #116834; font-size: 0.85rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.docNo)}</span>
          </div>

          <!-- 2. PEMOHON -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.user.name || 'Pengurus')}</span>
          </div>

          <!-- 3. KEBUN DITUJU -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Kebun Dituju</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.targetEstateName)}</span>
          </div>

          <!-- 4. PROGRAM -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Program Pembibitan</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.programName)}</span>
          </div>

          <!-- 5. TUJUAN PERMINTAAN -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Tujuan Permintaan</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.purpose || 'Penanaman / Bibit Tanam')}</span>
          </div>

          <!-- 6. KODE ALOKASI -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Kode Alokasi</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.allocationCode)}</span>
          </div>

          <!-- 7. KLON -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Klon</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.klon)}</span>
          </div>

          <!-- 8. KATEGORI -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Kategori</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.category)}</span>
          </div>

          <!-- 9. TAHAPAN PERTUMBUHAN -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Tahapan Pertumbuhan</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(data.growthStage)}</span>
          </div>

          <!-- 10. TANGGAL DIBUTUHKAN -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B; font-size: 0.82rem; line-height: 1.35; text-align: left;">Tanggal Dibutuhkan</span>
            <span style="font-weight: 700; color: #1E293B; font-size: 0.82rem; line-height: 1.35; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(formatDate(data.requiredDate))}</span>
          </div>

          <!-- 11. BANYAKNYA -->
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: baseline; margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span style="color: #64748B; font-weight: 600; font-size: 0.82rem; line-height: 1.35; text-align: left;">Banyaknya</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: #116834; line-height: 1.35; text-align: right; min-width: 0;">${data.qty.toLocaleString('id-ID')} Pkk</span>
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 10px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-modal" style="width: 100%; min-height: 42px; border: 1px solid #CBD5E1; color: #475569; font-weight: 600; font-size: 0.88rem; padding: 8px 12px; white-space: nowrap; cursor: pointer;">Ubah Data</button>
        <button class="btn btn-primary" id="btn-confirm-submit" style="width: 100%; min-height: 42px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.88rem; padding: 8px 12px; white-space: nowrap; cursor: pointer;">Kirim Permintaan</button>
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

/**
 * Proses Penyimpanan Transaksi Permintaan.
 * SERVICE-LEVEL GUARD: Hanya PENGURUS yang dapat membuat request.
 */
async function submitRequest(data) {
  // Service-level authorization: Reject non-PENGURUS
  const creatorRole = normalizeRole(data.user?.role || data.user?.rawRole || '');
  if (!ALLOWED_CREATE_ROLES.includes(creatorRole)) {
    toast('Otorisasi ditolak: Hanya Pengurus Kebun yang dapat membuat Permintaan Bibit.', 'error');
    console.error(`[submitRequest] ACCESS DENIED: role '${creatorRole}' tidak diizinkan membuat request.`);
    return;
  }

  const resolvedKlon = resolveKlon(data.klon);
  const canonicalKlon = resolvedKlon ? resolvedKlon.canonicalName : (data.klon || '');
  const resolvedCfna = getCfnaByCode(data.allocationCode);
  const canonicalAllocation = resolvedCfna ? resolvedCfna.code : (data.allocationCode || '');

  const newRecord = {
    id: 'REQ-' + Date.now(),
    docNo: data.docNo,
    nomorDokumen: data.docNo, // for legacy compatibility if needed
    type: 'KEBUN_SEPUPU',
    category: data.category,
    status: 'DIAJUKAN',
    statusLabel: 'Diajukan',

    // Transaction Date Context
    createdAt: nowISO(),
    date: todayISO(),
    tanggal: todayISO(),

    // Requester Identity
    userId: data.user.userId || data.user.id || 'PGS001',
    role: data.user.role || 'PENGURUS',
    requestedBy: data.user.name || 'Junaidi',
    position: data.user.position || 'Pengurus Kebun',
    divisionName: data.user.divisionName || 'Tanah Besih - Divisi I',
    estateId: data.user.estateId || 'EST-TBS', // Source Estate

    // Target Estate
    targetEstateId: data.targetEstateId,
    targetEstateName: data.targetEstateName,

    // Program Master
    programId: data.programId || 'PRG-2026-001',
    programName: data.programName || 'Program Nursery 2026 - Batch 1',

    // Payload Final
    purpose: data.purpose || 'Penanaman / Bibit Tanam',
    allocationCode: canonicalAllocation,
    klon: canonicalKlon,
    growthStage: data.growthStage,
    qty: data.qty,
    requestedQty: data.qty,
    unit: 'Pkk',
    requiredDate: data.requiredDate
  };

  try {
    // 1. Simpan ke IndexedDB requests store
    const savedRecord = await requestRepository.create(newRecord, data.user);

    // 2. Simpan ke LocalStorage fallback agar kompatibel dengan transaction-manager
    const localList = storage.get('requests_transactions', []);
    localList.unshift(savedRecord);
    storage.set('requests_transactions', localList);

    toast('Dokumen Permintaan Bibit diajukan.', 'success');

    // Kembali ke Hub Permintaan Bibit Kebun Sepupu
    navigate('/request/kebun-sepupu');
  } catch (err) {
    console.error('[submitRequest] Gagal menyimpan permintaan:', err);
    toast('Gagal mengajukan permohonan. Revisi permohonan.', 'danger');
  }
}
