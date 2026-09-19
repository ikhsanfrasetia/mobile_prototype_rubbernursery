/**
 * js/modules/request/request-kebun-sepupu-landing.js
 * Halaman Pusat Permintaan Bibit Kebun Sepupu (Role Pengurus & Asisten Bibitan)
 * 
 * Fitur & Workflow:
 * 1. Tab Permintaan Saya (Strict Ownership Requester Identity)
 * 2. Tab Permintaan Masuk (Target Estate Inbox untuk Role Pengurus & Asisten Bibitan)
 * 3. Notification Bubble (Red Dot 🔴) untuk item actionable pending review / verifikasi
 * 4. Status Filters (Semua, Diajukan, Diproses, Selesai, Ditolak)
 * 5. Card List Informasi Transaksi (Compact + Expand/Collapse)
 * 6. Review & Koreksi oleh Pengurus Kebun Tujuan:
 *    - Modal Form Review Permintaan Bibit (Data Permintaan vs Keputusan Pengurus)
 *    - Koreksi approvedQty, approvedClone (Clone Master), estimatedDeliveryDate
 *    - Aksi [ Setujui & Teruskan ] -> Status: MENUNGGU_VERIFIKASI_ASISTEN
 *    - Aksi [ Tolak Permintaan ] -> Modal Alasan Wajib -> Status: DITOLAK
 * 7. Verifikasi & Pengembalian oleh Asisten Bibitan Kebun Tujuan:
 *    - Data hasil keputusan Pengurus READ-ONLY bagi Asisten
 *    - Aksi [ Verifikasi ] -> Modal Konfirmasi -> Status: TERVERIFIKASI (audit VERIFY)
 *    - Aksi [ Kembalikan ke Pengurus ] -> Modal Alasan Wajib -> Status: PERLU_REVISI_PENGURUS (audit UPDATE)
 *    - Target setelah return: Pengurus tujuan dapat merevisi dan meneruskan kembali
 * 8. Read-Only Transaction Detail View (via openModal)
 * 9. Navigation ke Form Pengajuan (/request/kebun-sepupu/form)
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { requestRepository } from '../../db/repositories.js';
import { resolveTransactionActor, applyTransactionActor, AUDIT_EVENT_TYPES } from '../../core/transaction-actor.js';
import { resolveEstate, getNurseryDivisionsByEstate, resolveNurseryDivision } from '../../data/estate-master.js';
import { formatDate, esc } from '../../core/utils.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';

export function matchEstateHelper(estA, estB) {
  if (!estA || !estB) return true;
  const resA = resolveEstate(estA);
  const resB = resolveEstate(estB);
  if (resA && resB) return resA.estate_id === resB.estate_id;
  const cleanA = String(estA).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const cleanB = String(estB).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

export function matchDivisionHelper(divA, divB) {
  if (!divA || !divB) return true;
  if (divA === divB) return true;
  const cleanA = String(divA).trim().toUpperCase();
  const cleanB = String(divB).trim().toUpperCase();
  if (cleanA === cleanB) return true;
  const numA = cleanA.replace(/\D/g, '');
  const numB = cleanB.replace(/\D/g, '');
  if (numA && numB && parseInt(numA, 10) === parseInt(numB, 10)) return true;
  return false;
}

let activeTab = null; // 'MY_REQUESTS' | 'INCOMING_REQUESTS'
let lastUserRoleId = null; // Track current user role to set default tab on initial role change
let activeStatusFilter = 'SEMUA'; // 'SEMUA' | 'DIAJUKAN' | 'DIPROSES' | 'SELESAI' | 'DITOLAK'
let expandedCardIndex = -1; // Track which card is expanded (-1 = none)

/**
 * Cek apakah user berwenang melakukan aksi receiver Pengurus (Pengurus Kebun Tujuan)
 */
export function canPerformReceiverAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'PENGURUS') return false;
  
  const userEstateId = currentUser.estateId;
  if (!userEstateId || tx.targetEstateId !== userEstateId) return false;
  
  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;
  const currentLoginCode = currentUser.loginCode || currentUser.code;
  
  const isCreator = (
    (tx.userId && tx.userId === currentUserId) ||
    (tx.createdByUserId && tx.createdByUserId === currentUserId) ||
    (currentLoginCode && tx.createdByLoginCode && tx.createdByLoginCode === currentLoginCode) ||
    (tx.estateId && tx.estateId === userEstateId)
  );
  if (isCreator) return false;

  return true;
}

/**
 * Cek apakah user berwenang melakukan aksi verifikasi/review Asisten Kepala (Kebun Tujuan)
 * Otorisasi: Role (ASKEP / ASISTEN_KEPALA) + Target Estate
 */
export function canPerformAskepAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'ASKEP' && userRole !== 'ASISTEN_KEPALA') return false;
  
  const userEstateId = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId;
  if (!userEstateId || targetEstate !== userEstateId) return false;

  const status = (tx.status || '').toUpperCase();
  if (status !== 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' && status !== 'PERLU_REVISI_ASISTEN_KEPALA') return false;

  return true;
}

/**
 * Cek apakah user berwenang melakukan aksi verifikasi Asisten Bibitan (Kebun Tujuan)
 * Otorisasi: Role ASISTEN_BIBITAN (EKSKLUSIF) + Target Estate + Target Division
 * 
 * CRITICAL FIX (PRE-UAT): Role ASISTEN (Asisten Lapangan) TIDAK LAGI
 * diizinkan melakukan Verify/Return pada status MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN.
 * Hanya ASISTEN_BIBITAN yang berwenang.
 */
export function canPerformAsistenAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  // STRICT: Hanya ASISTEN_BIBITAN. ASISTEN (Lapangan) TIDAK diizinkan.
  if (userRole !== 'ASISTEN_BIBITAN') return false;
  
  const userEstateId = currentUser.estateId;
  const targetEstate = tx.targetNextEstateId || tx.targetEstateId;
  if (!userEstateId || targetEstate !== userEstateId) return false;

  // Routing validation: Estate + Division + Role
  const targetDivision = tx.targetNextDivisionId || tx.targetDivisionId;
  if (targetDivision && currentUser.divisionId && currentUser.divisionId !== targetDivision) {
    return false;
  }

  const status = (tx.status || '').toUpperCase();
  if (status !== 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' && status !== 'MENUNGGU_VERIFIKASI_ASISTEN') return false;

  return true;
}

/**
 * Hitung jumlah permintaan masuk yang membutuhkan aksi aktif role saat ini (Pengurus / Askep / Asisten)
 */
export function getActionableIncomingCount(incomingRequests, currentUser) {
  if (!Array.isArray(incomingRequests) || !currentUser) return 0;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);

  if (userRole === 'PENGURUS') {
    return incomingRequests.filter(tx => {
      const status = (tx.status || 'DIAJUKAN').toUpperCase();
      const isActionable = status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS';
      return isActionable && canPerformReceiverAction(tx, currentUser);
    }).length;
  }

  if (userRole === 'ASKEP' || userRole === 'ASISTEN_KEPALA') {
    return incomingRequests.filter(tx => {
      return canPerformAskepAction(tx, currentUser);
    }).length;
  }

  // STRICT: Hanya ASISTEN_BIBITAN yang dihitung actionable count untuk verifikasi bibitan
  if (userRole === 'ASISTEN_BIBITAN') {
    return incomingRequests.filter(tx => {
      return canPerformAsistenAction(tx, currentUser);
    }).length;
  }

  return 0;
}

/**
 * Filter permohonan milik user aktif (Strict Ownership)
 */
export function filterMyRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;
  const currentLoginCode = currentUser.loginCode || currentUser.code;

  return requests.filter(tx => {
    const actor = resolveTransactionActor(tx);
    const isOwner = (
      (tx.userId && tx.userId === currentUserId) ||
      (tx.createdByUserId && tx.createdByUserId === currentUserId) ||
      (currentLoginCode && tx.createdByLoginCode && tx.createdByLoginCode === currentLoginCode) ||
      (actor && actor.userId === currentUserId)
    );
    return isOwner;
  });
}

/**
 * Filter permohonan masuk ke kebun aktif (Strict Role: PENGURUS, ASKEP & ASISTEN_BIBITAN & Target Estate + Division)
 * 
 * CRITICAL FIX (PRE-UAT): ASISTEN (Lapangan) tidak lagi termasuk dalam filter incoming.
 * Jika bisnis memutuskan Asisten Lapangan butuh read-only, tambahkan kembali
 * dengan filter division tanpa action buttons.
 */
export function filterIncomingRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== 'PENGURUS' && userRole !== 'ASKEP' && userRole !== 'ASISTEN_KEPALA' && userRole !== 'ASISTEN_BIBITAN') return [];

  return requests.filter(tx => {
    const isRequestType = tx.type === 'KEBUN_SEPUPU' || tx.type === 'KEBUN_SENDIRI' || !tx.type;
    if (!isRequestType) return false;
    const targetEstate = tx.targetEstateId || tx.targetEstate || tx.senderEstateId || tx.targetNextEstateId;
    const sourceEstate = tx.estateId || tx.sourceEstateId || tx.requesterEstate;
    const isTargetEstate = matchEstateHelper(targetEstate, currentUser.estateId) && !matchEstateHelper(sourceEstate, currentUser.estateId);
    if (!isTargetEstate) return false;

    // Jika role adalah Asisten Bibitan, isolasi berdasarkan Divisi Target
    if (userRole === 'ASISTEN_BIBITAN') {
      const targetDivision = tx.targetDivisionId || tx.targetNextDivisionId;
      if (targetDivision && currentUser.divisionId && !matchDivisionHelper(targetDivision, currentUser.divisionId)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter permohonan berdasarkan status
 */
export function filterByStatus(requests, status) {
  if (!Array.isArray(requests)) return [];
  if (!status || status === 'SEMUA') return requests;
  if (status === 'DIPROSES') {
    return requests.filter(tx => {
      const s = (tx.status || '').toUpperCase();
      return s === 'DIPROSES' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' ||
             s === 'PERLU_REVISI_ASISTEN_KEPALA' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN' ||
             s === 'MENUNGGU_VERIFIKASI' ||
             s === 'PERLU_REVISI_PENGURUS' ||
             s === 'MENUNGGU_PENGELUARAN_BIBIT' ||
             s === 'PENGELUARAN_BERJALAN' ||
             s === 'MENUNGGU_PENERIMAAN_PENGURUS';
    });
  }
  if (status === 'SELESAI') {
    return requests.filter(tx => {
      const s = (tx.status || '').toUpperCase();
      return s === 'SELESAI' || s === 'TERVERIFIKASI' || s === 'APPROVED';
    });
  }
  return requests.filter(tx => (tx.status || 'DIAJUKAN').toUpperCase() === status.toUpperCase());
}

/**
 * Update transaksi secara aman ke IndexedDB & fallback LocalStorage
 */
async function updateRequestTransaction(id, patch, actionType, details, currentUser) {
  let updatedRecord;
  try {
    updatedRecord = await requestRepository.update(id, patch, currentUser, actionType, details);
  } catch (err) {
    console.warn('requestRepository.update fallback to localStorage:', err);
    const list = storage.get('requests_transactions', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      const merged = { ...list[idx], ...patch, id };
      updatedRecord = applyTransactionActor(merged, actionType, currentUser, details);
      list[idx] = updatedRecord;
      storage.set('requests_transactions', list);
    }
  }

  // Sync LocalStorage list
  const localList = storage.get('requests_transactions', []);
  const idx = localList.findIndex(r => r.id === id);
  if (idx !== -1 && updatedRecord) {
    localList[idx] = { ...localList[idx], ...updatedRecord };
    storage.set('requests_transactions', localList);
  }

  return updatedRecord;
}

/**
 * Buka Form Modal Review & Koreksi Permintaan Bibit oleh Pengurus
 */
export function openReviewModal(item, currentUser) {
  if (!canPerformReceiverAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mereview permintaan ini.', 'error');
    return;
  }
  const currentStatus = (item.status || 'DIAJUKAN').toUpperCase();
  if (currentStatus !== 'DIAJUKAN' && currentStatus !== 'PERLU_REVISI_PENGURUS') {
    toast('Hanya permintaan berstatus DIAJUKAN atau PERLU REVISI yang dapat diproses Pengurus.', 'warning');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || 'Tanah Besih');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || 'Aek Pamingke');

  // Clone Master Dropdown Options
  const activeKlons = getActiveKlons();
  const selectedClone = item.approvedClone || item.requestedClone || item.klon || '';
  const cloneOptions = activeKlons.map(k => `
    <option value="${esc(k.canonicalName)}" ${k.canonicalName === selectedClone ? 'selected' : ''}>${esc(k.canonicalName)}</option>
  `).join('');

  // Callout banner jika permohonan dikembalikan
  const revisionBanner = (item.revisionReason || item.returnReason) ? `
    <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
      <div style="font-weight: 700; color: #991B1B; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 4px;">
        ⚠️ Catatan Pengembalian:
      </div>
      <div style="color: #BE123C; font-size: 0.80rem; font-weight: 600; line-height: 1.35;">
        "${esc(item.revisionReason || item.returnReason)}"
      </div>
      ${item.returnedByName ? `
        <div style="color: #94A3B8; font-size: 0.70rem; margin-top: 4px;">
          Oleh: ${esc(item.returnedByName)} (${formatDate(item.returnedAt)})
        </div>
      ` : ''}
    </div>
  ` : '';

  openModal({
    title: 'Review Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        ${revisionBanner}

        <!-- SECTION 1: DATA PERMINTAAN (Read-only) -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #475569; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            1. Data Permintaan Awal
          </div>
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 6px; align-items: start;">
            <span style="color: #64748B;">No. Dokumen</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(docNo)}</span>

            <span style="color: #64748B;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || 'Pengurus')}</span>

            <span style="color: #64748B;">Kebun Asal</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(sourceName)}</span>

            <span style="color: #64748B;">Kebun Dituju</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(targetName)}</span>

            <span style="color: #64748B;">Kode Alokasi</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.allocationCode || '-')}</span>

            <span style="color: #64748B;">Klon Diminta</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedClone || item.klon || '-')}</span>

            <span style="color: #64748B;">Kategori</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.category || '-')}</span>

            <span style="color: #64748B;">Tahapan Pertumbuhan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>

            <span style="color: #64748B;">Banyaknya Diminta</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${(item.requestedQty || item.qty || 0).toLocaleString('id-ID')} Pkk</span>

            <span style="color: #64748B;">Tanggal Dibutuhkan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.requiredDate))}</span>
          </div>
        </div>

        <!-- SECTION 2: KEPUTUSAN PENGURUS (Editable) -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px;">
          <div style="font-weight: 700; color: #116834; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            2. Keputusan & Koreksi Pengurus
          </div>
          
          <!-- Field 1: Banyaknya Diproses -->
          <div style="margin-bottom: 10px;">
            <label for="review-approved-qty" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Banyaknya Diproses (Pkk) <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="number" 
              id="review-approved-qty" 
              min="0" 
              value="${item.approvedQty !== undefined ? item.approvedQty : (item.requestedQty || item.qty || 0)}" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit;"
            />
          </div>

          <!-- Field 2: Klon Diproses -->
          <div style="margin-bottom: 10px;">
            <label for="review-approved-clone" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Klon Diproses <span style="color: #DC2626;">*</span>
            </label>
            <select 
              id="review-approved-clone" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF;"
            >
              ${cloneOptions}
            </select>
          </div>

          <!-- Field 3: Estimasi Tanggal Dikirim -->
          <div style="margin-bottom: 4px;">
            <label for="review-delivery-date" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Estimasi Tanggal Dikirim <span style="color: #DC2626;">*</span>
            </label>
            <input 
              type="date" 
              id="review-delivery-date" 
              value="${item.estimatedDeliveryDate || ''}" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit;"
            />
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div style="display: flex; gap: 8px; width: 100%;">
          <button class="btn btn-ghost" id="btn-review-cancel" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600; padding: 8px;">
            Batal
          </button>
          <button class="btn" id="btn-review-reject" type="button" style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-weight: 700; border-radius: 8px; padding: 8px;">
            Tolak Permintaan
          </button>
        </div>
        <button class="btn" id="btn-review-approve-forward" type="button" style="width: 100%; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 10px; cursor: pointer;">
          Setujui & Teruskan
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  
  // 1. Tombol Batal
  root?.querySelector('#btn-review-cancel')?.addEventListener('click', closeModal);

  // 2. Tombol Tolak -> Buka Modal Penolakan
  root?.querySelector('#btn-review-reject')?.addEventListener('click', () => {
    closeModal();
    handleRejectRequestModal(item, currentUser);
  });

  // 3. Tombol Setujui & Teruskan -> Menuju Asisten Kepala (tanpa penentuan divisi oleh Pengurus)
  root?.querySelector('#btn-review-approve-forward')?.addEventListener('click', async () => {
    const rawQty = root.querySelector('#review-approved-qty')?.value;
    if (rawQty === '' || rawQty === null || rawQty === undefined) {
      toast('Banyaknya bibit yang diproses wajib diisi.', 'error');
      root.querySelector('#review-approved-qty')?.focus();
      return;
    }
    const qtyNum = parseInt(rawQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      toast('Banyaknya bibit yang diproses harus berupa angka >= 0.', 'error');
      root.querySelector('#review-approved-qty')?.focus();
      return;
    }

    const selClone = root.querySelector('#review-approved-clone')?.value?.trim();
    if (!selClone) {
      toast('Klon yang diproses wajib dipilih.', 'error');
      root.querySelector('#review-approved-clone')?.focus();
      return;
    }

    const delDate = root.querySelector('#review-delivery-date')?.value?.trim();
    if (!delDate) {
      toast('Estimasi tanggal dikirim wajib diisi sebelum permohonan diteruskan.', 'error');
      root.querySelector('#review-delivery-date')?.focus();
      return;
    }

    const patch = {
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
      statusLabel: 'Menunggu Verifikasi Asisten Kepala',
      approvedQty: qtyNum,
      approvedClone: selClone,
      estimatedDeliveryDate: delDate,
      targetDivisionId: null,
      targetDivisionName: null,
      targetNextDivisionId: null,
      processedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      processedByName: currentUser.name || 'Pengurus',
      processedByRole: currentUser.role || 'PENGURUS',
      processedByEstateId: currentUser.estateId,
      processedAt: new Date().toISOString(),
      targetNextRole: 'ASKEP',
      targetNextEstateId: item.targetEstateId
    };

    const details = 'Permintaan disetujui dan diteruskan ke Asisten Kepala';
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, details, currentUser);
    
    toast('Permintaan disetujui dan diteruskan ke Asisten Kepala.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Review & Verifikasi oleh Asisten Kepala
 * Titik Pemilihan Divisi Bibitan & Penerusan ke Asisten Bibitan
 */
export function openAskepReviewModal(item, currentUser) {
  if (!canPerformAskepAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memproses verifikasi Asisten Kepala.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || 'Tanah Besih');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || 'Aek Pamingke');

  const approvedQtyFormatted = parseInt(item.approvedQty !== undefined ? item.approvedQty : (item.requestedQty || item.qty || 0), 10).toLocaleString('id-ID');
  const approvedCloneName = item.approvedClone || item.requestedClone || item.klon || '-';
  const deliveryDateFormatted = formatDate(item.estimatedDeliveryDate);

  // Nursery Division Options for Target Estate
  const nurseryDivisions = getNurseryDivisionsByEstate(item.targetEstateId);
  const currentSelectedDiv = item.targetDivisionId || (nurseryDivisions.length === 1 ? nurseryDivisions[0].divisionId : '');
  
  let divisionOptionsHtml = '';
  if (nurseryDivisions.length > 1) {
    divisionOptionsHtml += '<option value="">-- Pilih Divisi Bibitan --</option>';
  }
  divisionOptionsHtml += nurseryDivisions.map(d => `
    <option value="${esc(d.divisionId)}" ${d.divisionId === currentSelectedDiv ? 'selected' : ''}>${esc(d.divisionName || d.divisionId)}</option>
  `).join('');

  // Callout banner jika permohonan dikembalikan dari Asisten Bibitan
  const revisionBanner = (item.revisionReason || item.returnReason) ? `
    <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
      <div style="font-weight: 700; color: #991B1B; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 4px;">
        ⚠️ Catatan Pengembalian dari Asisten Bibitan:
      </div>
      <div style="color: #BE123C; font-size: 0.80rem; font-weight: 600; line-height: 1.35;">
        "${esc(item.revisionReason || item.returnReason)}"
      </div>
      ${item.returnedByName ? `
        <div style="color: #94A3B8; font-size: 0.70rem; margin-top: 4px;">
          Oleh: ${esc(item.returnedByName)} (${formatDate(item.returnedAt)})
        </div>
      ` : ''}
    </div>
  ` : '';

  openModal({
    title: 'Verifikasi Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        ${revisionBanner}

        <!-- SECTION 1: DATA PERMINTAAN (Read-only) -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #475569; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            1. Data Permintaan Awal
          </div>
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 6px; align-items: start;">
            <span style="color: #64748B;">No. Dokumen</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(docNo)}</span>

            <span style="color: #64748B;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || 'Pengurus')}</span>

            <span style="color: #64748B;">Kebun Asal</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(sourceName)}</span>

            <span style="color: #64748B;">Kebun Dituju</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(targetName)}</span>

            <span style="color: #64748B;">Kode Alokasi</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.allocationCode || '-')}</span>

            <span style="color: #64748B;">Klon Diminta</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedClone || item.klon || '-')}</span>

            <span style="color: #64748B;">Kategori</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.category || '-')}</span>

            <span style="color: #64748B;">Tahapan Pertumbuhan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>

            <span style="color: #64748B;">Banyaknya Diminta</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${(item.requestedQty || item.qty || 0).toLocaleString('id-ID')} Pkk</span>

            <span style="color: #64748B;">Tanggal Dibutuhkan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.requiredDate))}</span>
          </div>
        </div>

        <!-- SECTION 2: HASIL KEPUTUSAN PENGURUS (Read-only) -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #116834; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            2. Hasil Keputusan Pengurus (Read-Only)
          </div>
          <div style="display: grid; grid-template-columns: 45% 55%; gap: 6px; font-size: 0.80rem;">
            <span style="color: #64748B;">Banyaknya Disetujui:</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${approvedQtyFormatted} Pkk</span>

            <span style="color: #64748B;">Klon Disetujui:</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(approvedCloneName)}</span>

            <span style="color: #64748B;">Estimasi Pengiriman:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(deliveryDateFormatted)}</span>

            <span style="color: #64748B;">Pengurus:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.processedByName || 'Pengurus')}</span>

            ${item.processedAt ? `
              <span style="color: #64748B;">Waktu Keputusan:</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.processedAt))}</span>
            ` : ''}
          </div>
        </div>

        <!-- SECTION 3: PENENTUAN DIVISI BIBITAN OLEH ASKEP -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px;">
          <div style="font-weight: 700; color: #116834; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            3. Penentuan Divisi Bibitan
          </div>
          <div style="margin-bottom: 4px;">
            <label for="askep-target-division" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 4px; font-size: 0.78rem;">
              Divisi Bibitan <span style="color: #DC2626;">*</span>
            </label>
            <select 
              id="askep-target-division" 
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; background: #FFFFFF;"
            >
              ${divisionOptionsHtml}
            </select>
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div style="display: flex; gap: 8px; width: 100%;">
          <button class="btn btn-ghost" id="btn-askep-cancel" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600; padding: 8px;">
            Batal
          </button>
          <button class="btn" id="btn-askep-return" type="button" style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-weight: 700; border-radius: 8px; padding: 8px;">
            Kembalikan ke Pengurus
          </button>
        </div>
        <button class="btn" id="btn-askep-forward" type="button" style="width: 100%; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 10px; cursor: pointer;">
          Verifikasi & Teruskan
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  
  // 1. Tombol Batal
  root?.querySelector('#btn-askep-cancel')?.addEventListener('click', closeModal);

  // 2. Tombol Kembalikan ke Pengurus
  root?.querySelector('#btn-askep-return')?.addEventListener('click', () => {
    closeModal();
    openAskepReturnModal(item, currentUser);
  });

  // 3. Tombol Verifikasi & Teruskan
  root?.querySelector('#btn-askep-forward')?.addEventListener('click', async () => {
    const selDivisionId = root.querySelector('#askep-target-division')?.value?.trim();
    if (!selDivisionId) {
      toast('Divisi Bibitan wajib dipilih sebelum verifikasi diteruskan.', 'error');
      root.querySelector('#askep-target-division')?.focus();
      return;
    }

    // Validasi kepemilikan divisi terhadap targetEstateId
    const selDivision = resolveNurseryDivision(selDivisionId, item.targetEstateId) || nurseryDivisions.find(d => d.divisionId === selDivisionId);
    if (!selDivision || selDivision.estateId !== item.targetEstateId) {
      toast('Divisi Bibitan yang dipilih tidak valid untuk kebun tujuan ini.', 'error');
      root.querySelector('#askep-target-division')?.focus();
      return;
    }

    const patch = {
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
      statusLabel: 'Menunggu Verifikasi Asisten Bibitan',
      targetDivisionId: selDivision.divisionId,
      targetDivisionName: selDivision.divisionName,
      targetNextDivisionId: selDivision.divisionId,
      verifiedAskepByUserId: currentUser.userId || currentUser.id || currentUser.code,
      verifiedAskepByName: currentUser.name || 'Asisten Kepala',
      verifiedAskepByRole: currentUser.role || 'ASKEP',
      verifiedAskepByEstateId: currentUser.estateId,
      verifiedAskepAt: new Date().toISOString(),
      targetNextRole: 'ASISTEN_BIBITAN',
      targetNextEstateId: item.targetEstateId
    };

    const details = `Permintaan diverifikasi oleh Asisten Kepala dan diteruskan ke Asisten Bibitan (${selDivision.divisionName})`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.VERIFY, details, currentUser);
    
    toast('Permintaan diverifikasi dan diteruskan ke Asisten Bibitan.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Pengembalian oleh Asisten Kepala ke Pengurus (MENUNGGU_VERIFIKASI_ASISTEN_KEPALA -> PERLU_REVISI_PENGURUS)
 */
export function openAskepReturnModal(item, currentUser) {
  if (!canPerformAskepAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mengembalikan permintaan ini.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const targetEstate = resolveEstate(item.targetEstateId);
  const targetEstateName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || 'Pengurus');

  openModal({
    title: 'Kembalikan ke Pengurus',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #475569; margin-bottom: 12px; line-height: 1.4;">
          Anda akan mengembalikan permintaan bibit <strong>${esc(docNo)}</strong> ke Pengurus <strong>${esc(targetEstateName)}</strong> untuk direvisi.
        </p>
        <div style="margin-bottom: 8px;">
          <label for="askep-return-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px;">
            Alasan Pengembalian <span style="color: #DC2626;">*</span>
          </label>
          <textarea 
            id="askep-return-reason" 
            rows="3" 
            placeholder="Masukkan alasan pengembalian ke Pengurus (contoh: ketersediaan klon, alokasi volume, tanggal pengiriman, dsb)..." 
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
          ></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-askep-return" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Batal</button>
        <button class="btn" id="btn-confirm-askep-return" type="button" style="flex: 1; background: #DC2626; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">Kembalikan ke Pengurus</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-askep-return')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-askep-return')?.addEventListener('click', async () => {
    const textarea = root.querySelector('#askep-return-reason');
    const reason = (textarea?.value || '').trim();

    if (!reason) {
      toast('Alasan pengembalian wajib diisi.', 'error');
      textarea?.focus();
      return;
    }

    const patch = {
      status: 'PERLU_REVISI_PENGURUS',
      statusLabel: 'Perlu Revisi Pengurus',
      revisionReason: reason,
      returnReason: reason,
      returnedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      returnedByName: currentUser.name || 'Asisten Kepala',
      returnedByRole: currentUser.role || 'ASKEP',
      returnedByEstateId: currentUser.estateId,
      returnedAt: new Date().toISOString(),
      targetNextRole: 'PENGURUS',
      targetNextEstateId: item.targetEstateId
    };

    const details = `Dokumen dikembalikan oleh Asisten Kepala ke Pengurus untuk revisi: ${reason}`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, details, currentUser);
    
    toast('Dokumen telah dikembalikan ke Pengurus untuk revisi.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Tolak Permintaan oleh Pengurus (DIAJUKAN -> DITOLAK)
 */
export function handleRejectRequestModal(item, currentUser) {
  if (!canPerformReceiverAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk menolak permintaan ini.', 'error');
    return;
  }
  const currentStatus = (item.status || 'DIAJUKAN').toUpperCase();
  if (currentStatus !== 'DIAJUKAN' && currentStatus !== 'PERLU_REVISI_PENGURUS') {
    toast('Hanya permintaan berstatus DIAJUKAN atau PERLU REVISI yang dapat ditolak.', 'warning');
    return;
  }

  openModal({
    title: 'Tolak Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #475569; margin-bottom: 12px; line-height: 1.4;">
          Anda akan menolak permintaan bibit <strong>${esc(item.docNo || '2026/NIR/001')}</strong> dari <strong>${esc(resolveEstate(item.estateId)?.estate_name || item.estateId)}</strong>.
        </p>
        <div style="margin-bottom: 8px;">
          <label for="reject-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px;">
            Alasan Penolakan <span style="color: #DC2626;">*</span>
          </label>
          <textarea 
            id="reject-reason" 
            rows="3" 
            placeholder="Masukkan alasan penolakan..." 
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
          ></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-reject" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Batal</button>
        <button class="btn" id="btn-confirm-reject" type="button" style="flex: 1; background: #DC2626; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">Tolak Permintaan</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-reject')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-reject')?.addEventListener('click', async () => {
    const textarea = root.querySelector('#reject-reason');
    const reason = (textarea?.value || '').trim();

    if (!reason) {
      toast('Alasan penolakan wajib diisi.', 'error');
      textarea?.focus();
      return;
    }

    const patch = {
      status: 'DITOLAK',
      statusLabel: 'Ditolak',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
      receiverUserId: currentUser.userId || currentUser.id || currentUser.code,
      receiverName: currentUser.name || 'Pengurus',
      receiverRole: currentUser.role || 'PENGURUS',
      receiverEstateId: currentUser.estateId
    };

    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, reason, currentUser);
    toast('Permintaan telah ditolak.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Verifikasi oleh Asisten Bibitan (MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN -> TERVERIFIKASI)
 */
export function openVerifyModal(item, currentUser) {
  if (!canPerformAsistenAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk memverifikasi permintaan ini.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const approvedQtyFormatted = parseInt(item.approvedQty !== undefined ? item.approvedQty : (item.requestedQty || item.qty || 0), 10).toLocaleString('id-ID');
  const approvedCloneName = item.approvedClone || item.requestedClone || item.klon || '-';
  const deliveryDateFormatted = formatDate(item.estimatedDeliveryDate);
  const divisionName = item.targetDivisionName || item.targetDivisionId || '-';

  openModal({
    title: 'Verifikasi Permintaan Bibit',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #334155; margin-bottom: 12px; line-height: 1.45;">
          Pastikan data keputusan Pengurus dan verifikasi Asisten Kepala untuk dokumen <strong>${esc(docNo)}</strong> sudah sesuai:
        </p>

        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: 45% 55%; gap: 6px; font-size: 0.80rem;">
            <span style="color: #64748B;">Banyaknya Disetujui:</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${approvedQtyFormatted} Pkk</span>

            <span style="color: #64748B;">Klon Disetujui:</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">${esc(approvedCloneName)}</span>

            <span style="color: #64748B;">Divisi Bibitan:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(divisionName)}</span>

            <span style="color: #64748B;">Estimasi Pengiriman:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(deliveryDateFormatted)}</span>

            <span style="color: #64748B;">Pengurus:</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.processedByName || 'Pengurus')}</span>

            ${item.verifiedAskepByName ? `
              <span style="color: #64748B;">Asisten Kepala:</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.verifiedAskepByName)}</span>
            ` : ''}

            ${item.verifiedAskepAt ? `
              <span style="color: #64748B;">Verifikasi Askep:</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.verifiedAskepAt))}</span>
            ` : ''}
          </div>
        </div>

        <p style="color: #64748B; font-size: 0.78rem; margin: 0; line-height: 1.4;">
          Setelah diverifikasi, dokumen ini akan diteruskan ke tahap persiapan pengeluaran bibit oleh Mantri Bibitan (${esc(divisionName)}).
        </p>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-verify" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">
          Batal
        </button>
        <button class="btn" id="btn-confirm-verify" type="button" style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 10px; cursor: pointer;">
          Verifikasi & Teruskan
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-verify')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-verify')?.addEventListener('click', async () => {
    const patch = {
      status: 'TERVERIFIKASI',
      statusLabel: 'Terverifikasi',
      targetDivisionId: item.targetDivisionId,
      targetDivisionName: item.targetDivisionName,
      targetNextDivisionId: item.targetDivisionId,
      verifiedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      verifiedByName: currentUser.name || 'Asisten Bibitan',
      verifiedByRole: currentUser.role || 'ASISTEN_BIBITAN',
      verifiedByEstateId: currentUser.estateId,
      verifiedAt: new Date().toISOString(),
      targetNextRole: 'MANTRI_TANAMAN',
      targetNextEstateId: currentUser.estateId
    };

    const details = `Dokumen permintaan telah diverifikasi oleh Asisten Bibitan (${item.targetDivisionName || item.targetDivisionId || ''})`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.VERIFY, details, currentUser);
    
    toast('Dokumen permintaan telah diverifikasi.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Aksi Buka Modal Pengembalian oleh Asisten Bibitan (MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN -> PERLU_REVISI_ASISTEN_KEPALA)
 */
export function openReturnModal(item, currentUser) {
  if (!canPerformAsistenAction(item, currentUser)) {
    toast('Anda tidak memiliki otorisasi untuk mengembalikan permintaan ini.', 'error');
    return;
  }

  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';

  openModal({
    title: 'Kembalikan ke Asisten Kepala',
    body: `
      <div style="padding: 4px 0; font-size: 0.84rem;">
        <p style="color: #475569; margin-bottom: 12px; line-height: 1.4;">
          Anda akan mengembalikan permintaan bibit <strong>${esc(docNo)}</strong> ke Asisten Kepala untuk direvisi.
        </p>
        <div style="margin-bottom: 8px;">
          <label for="return-reason" style="display: block; font-weight: 700; color: #1E293B; margin-bottom: 6px;">
            Alasan Pengembalian <span style="color: #DC2626;">*</span>
          </label>
          <textarea 
            id="return-reason" 
            rows="3" 
            placeholder="Masukkan alasan pengembalian ke Asisten Kepala (contoh: stok klon pada divisi kurang, jadwal pembibitan tidak sesuai, dsb)..." 
            style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem; font-family: inherit; resize: vertical;"
          ></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn btn-ghost" id="btn-cancel-return" type="button" style="flex: 1; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Batal</button>
        <button class="btn" id="btn-confirm-return" type="button" style="flex: 1; background: #DC2626; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">Kembalikan ke Asisten Kepala</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-cancel-return')?.addEventListener('click', closeModal);
  root?.querySelector('#btn-confirm-return')?.addEventListener('click', async () => {
    const textarea = root.querySelector('#return-reason');
    const reason = (textarea?.value || '').trim();

    if (!reason) {
      toast('Alasan pengembalian wajib diisi.', 'error');
      textarea?.focus();
      return;
    }

    const patch = {
      status: 'PERLU_REVISI_ASISTEN_KEPALA',
      statusLabel: 'Perlu Revisi Asisten Kepala',
      revisionReason: reason,
      returnReason: reason,
      targetDivisionId: item.targetDivisionId,
      targetDivisionName: item.targetDivisionName,
      targetNextDivisionId: item.targetDivisionId,
      returnedByUserId: currentUser.userId || currentUser.id || currentUser.code,
      returnedByName: currentUser.name || 'Asisten Bibitan',
      returnedByRole: currentUser.role || 'ASISTEN_BIBITAN',
      returnedByEstateId: currentUser.estateId,
      returnedAt: new Date().toISOString(),
      targetNextRole: 'ASKEP',
      targetNextEstateId: currentUser.estateId
    };

    const details = `Dokumen dikembalikan ke Asisten Kepala untuk revisi: ${reason}`;
    await updateRequestTransaction(item.id, patch, AUDIT_EVENT_TYPES.UPDATE, details, currentUser);
    
    toast('Dokumen telah dikembalikan ke Asisten Kepala untuk revisi.', 'success');
    closeModal();
    await renderRequestKebunSepupuLanding();
  });
}

/**
 * Render Utama Halaman Hub Permintaan Kebun Sepupu
 */
export async function renderRequestKebunSepupuLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const userCtx = getCurrentUserContext();
  const sessionUser = session.get();
  const currentUser = userCtx || sessionUser || {
    id: 'PGS001',
    userId: 'PGS001',
    code: 'PGS001',
    loginCode: 'PGS001',
    name: 'Junaidi',
    role: 'PENGURUS',
    position: 'Pengurus Kebun',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih'
  };

  // Muat transaksi dari IndexedDB / LocalStorage fallback
  let allRequests = [];
  try {
    allRequests = await requestRepository.list();
  } catch (err) {
    allRequests = storage.get('requests_transactions', []);
  }
  if (!allRequests || allRequests.length === 0) {
    allRequests = storage.get('requests_transactions', []);
  }

  // Filter Data Berdasarkan Perspektif
  const myRequests = filterMyRequests(allRequests, currentUser);
  const incomingRequests = filterIncomingRequests(allRequests, currentUser);

  // Default activeTab ke INCOMING_REQUESTS untuk role peninjau/verifikator (Askep & Asisten Bibitan) hanya saat awal buka / ganti role
  const normalizedUserRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const currentActorKey = `${currentUser.userId || currentUser.id || ''}_${normalizedUserRole}`;
  if (lastUserRoleId !== currentActorKey || !activeTab) {
    lastUserRoleId = currentActorKey;
    if (normalizedUserRole === 'ASKEP' || normalizedUserRole === 'ASISTEN_KEPALA' || normalizedUserRole === 'ASISTEN_BIBITAN') {
      activeTab = 'INCOMING_REQUESTS';
    } else {
      activeTab = 'MY_REQUESTS';
    }
  }

  // Tab yang aktif
  const currentTabItems = activeTab === 'MY_REQUESTS' ? myRequests : incomingRequests;
  const filteredItems = filterByStatus(currentTabItems, activeStatusFilter);

  // Hitung jumlah actionable items untuk notifikasi bubble
  const actionableIncomingCount = getActionableIncomingCount(incomingRequests, currentUser);
  const hasActionableIncoming = actionableIncomingCount > 0;

  // Status Filter Counts
  const statusCounts = {
    SEMUA: currentTabItems.length,
    DIAJUKAN: currentTabItems.filter(t => (t.status || 'DIAJUKAN').toUpperCase() === 'DIAJUKAN').length,
    DIPROSES: currentTabItems.filter(t => {
      const s = (t.status || '').toUpperCase();
      return s === 'DIPROSES' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' ||
             s === 'PERLU_REVISI_ASISTEN_KEPALA' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' ||
             s === 'MENUNGGU_VERIFIKASI_ASISTEN' ||
             s === 'MENUNGGU_VERIFIKASI' ||
             s === 'PERLU_REVISI_PENGURUS';
    }).length,
    SELESAI: currentTabItems.filter(t => {
      const s = (t.status || '').toUpperCase();
      return s === 'SELESAI' || s === 'TERVERIFIKASI' || s === 'APPROVED';
    }).length,
    DITOLAK: currentTabItems.filter(t => (t.status || '').toUpperCase() === 'DITOLAK').length
  };

  // Status Filter Pills Markup
  const filterPills = [
    { key: 'SEMUA', label: 'Semua' },
    { key: 'DIAJUKAN', label: 'Diajukan' },
    { key: 'DIPROSES', label: 'Diproses' },
    { key: 'SELESAI', label: 'Selesai' },
    { key: 'DITOLAK', label: 'Ditolak' }
  ].map(pill => {
    const isSelected = activeStatusFilter === pill.key;
    const count = statusCounts[pill.key] || 0;
    return `
      <button 
        class="filter-pill-btn" 
        data-status="${pill.key}"
        type="button" 
        style="padding: 4px 10px; font-size: 0.72rem; font-weight: ${isSelected ? '700' : '600'}; border-radius: 16px; border: 1px solid ${isSelected ? '#116834' : '#E2E8F0'}; background: ${isSelected ? '#116834' : '#FFFFFF'}; color: ${isSelected ? '#FFFFFF' : '#475569'}; white-space: nowrap; cursor: pointer; transition: all 0.15s ease; line-height: 1.3;"
      >
        ${pill.label} (${count})
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER (compact, single line) -->
      <header style="display: flex; align-items: center; justify-content: space-between; min-height: 48px; padding: 6px 14px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 0.80rem; font-weight: 700; color: #111111; margin: 0; letter-spacing: -0.015em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;">Permintaan Bibit Kebun Sepupu</h1>
        </div>
        <div style="display: flex; align-items: center; flex-shrink: 0;">
          <button id="btn-refresh" type="button" aria-label="Refresh" style="padding: 6px; margin-right: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg id="sync-icon-svg" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- TABS NAV (Permintaan Saya vs Permintaan Masuk + Notif Bubble 🔴) -->
      <div style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; flex-shrink: 0;">
        <div style="display: flex; gap: 4px;">
          <button 
            id="tab-my-requests" 
            type="button" 
            style="flex: 1; padding: 8px 4px; background: transparent; border: none; border-bottom: 2px solid ${activeTab === 'MY_REQUESTS' ? '#116834' : 'transparent'}; color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}; font-weight: ${activeTab === 'MY_REQUESTS' ? '800' : '600'}; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;"
          >
            <span>Permintaan Saya</span>
            <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 10px; background: ${activeTab === 'MY_REQUESTS' ? '#E8F5E9' : '#F1F5F9'}; color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}; font-weight: 700;">
              ${myRequests.length}
            </span>
          </button>
          
          <button 
            id="tab-incoming-requests" 
            type="button" 
            style="flex: 1; padding: 8px 4px; background: transparent; border: none; border-bottom: 2px solid ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : 'transparent'}; color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}; font-weight: ${activeTab === 'INCOMING_REQUESTS' ? '800' : '600'}; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
          >
            <span>Permintaan Masuk</span>
            ${hasActionableIncoming ? `<span class="notif-dot" style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #DC2626;"></span>` : ''}
            <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 10px; background: ${activeTab === 'INCOMING_REQUESTS' ? '#E8F5E9' : '#F1F5F9'}; color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}; font-weight: 700;">
              ${incomingRequests.length}
            </span>
          </button>
        </div>
      </div>

      <!-- FILTER STATUS BAR -->
      <div style="background: #FAFAFA; padding: 8px 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; flex-shrink: 0;">
        <div style="display: flex; gap: 6px;">
          ${filterPills}
        </div>
      </div>

      <!-- MAIN CONTENT: LIST TRANSAKSI / EMPTY STATE -->
      <main style="flex: 1; overflow-y: auto; padding: 10px 16px;">
        ${filteredItems.length === 0 ? renderEmptyState(activeTab) : renderRequestCards(filteredItems, currentUser)}
      </main>

      <!-- FOOTER ACTION: Create button hanya untuk PENGURUS -->
      ${normalizedUserRole === 'PENGURUS' ? `
      <div style="flex-shrink: 0; background: #FFFFFF; border-top: 1px solid #E2E8F0; padding: 10px 16px;">
        <button id="btn-create-request" type="button" style="width: 100%; min-height: 42px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.88rem; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 -1px 4px rgba(17,104,52,0.12);">
          Buat Permintaan
        </button>
      </div>
      ` : ''}

    </div>
  `;

  // Attach Event Handlers
  attachLandingEvents(filteredItems, currentUser);
}

/**
 * Render Kartu Permintaan
 */
function renderRequestCards(items, currentUser) {
  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${items.map((item, idx) => renderSingleCard(item, idx, currentUser)).join('')}
    </div>
  `;
}

/**
 * Render Satu Kartu Transaksi (Compact + Expand/Collapse + Workflow Actions)
 */
function renderSingleCard(item, index, currentUser) {
  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const status = (item.status || 'DIAJUKAN').toUpperCase();
  const isExpanded = expandedCardIndex === index;
  
  // Resolve Nama Kebun
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || 'Tanah Besih');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || 'Aek Pamingke');

  // Status Badge Colors & Labels
  let badgeBg = '#EFF6FF';
  let badgeColor = '#1D4ED8';
  let badgeBorder = '#BFDBFE';
  let badgeText = status;

  if (status === 'SELESAI' || status === 'APPROVED') {
    badgeBg = '#DCFCE7';
    badgeColor = '#15803D';
    badgeBorder = '#BBF7D0';
    badgeText = 'Selesai';
  } else if (status === 'TERVERIFIKASI') {
    badgeBg = '#DCFCE7';
    badgeColor = '#15803D';
    badgeBorder = '#BBF7D0';
    badgeText = 'Terverifikasi';
  } else if (status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA') {
    badgeBg = '#FEF3C7';
    badgeColor = '#B45309';
    badgeBorder = '#FDE68A';
    badgeText = 'Menunggu Verifikasi Askep';
  } else if (status === 'PERLU_REVISI_ASISTEN_KEPALA') {
    badgeBg = '#FFF1F2';
    badgeColor = '#BE123C';
    badgeBorder = '#FECDD3';
    badgeText = 'Perlu Revisi Askep';
  } else if (status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || status === 'MENUNGGU_VERIFIKASI_ASISTEN' || status === 'MENUNGGU_VERIFIKASI') {
    badgeBg = '#FEF3C7';
    badgeColor = '#B45309';
    badgeBorder = '#FDE68A';
    badgeText = 'Menunggu Verifikasi Asisten';
  } else if (status === 'PERLU_REVISI_PENGURUS') {
    badgeBg = '#FFF1F2';
    badgeColor = '#BE123C';
    badgeBorder = '#FECDD3';
    badgeText = 'Perlu Revisi Pengurus';
  } else if (status === 'DIPROSES') {
    badgeBg = '#FEF3C7';
    badgeColor = '#B45309';
    badgeBorder = '#FDE68A';
    badgeText = 'Diproses';
  } else if (status === 'DITOLAK' || status === 'REJECTED') {
    badgeBg = '#FEE2E2';
    badgeColor = '#B91C1C';
    badgeBorder = '#FECACA';
    badgeText = 'Ditolak';
  }

  const formattedDate = formatDate(item.requiredDate || item.date || item.createdAt);
  const qtyFormatted = parseInt(item.qty || item.requestedQty || 0, 10).toLocaleString('id-ID');

  const isPengurusAuthorized = activeTab === 'INCOMING_REQUESTS' && canPerformReceiverAction(item, currentUser);
  const isAskepAuthorized = activeTab === 'INCOMING_REQUESTS' && canPerformAskepAction(item, currentUser);
  const isAsistenAuthorized = activeTab === 'INCOMING_REQUESTS' && canPerformAsistenAction(item, currentUser);

  // Action buttons
  let cardActionButtons = '';
  if (isPengurusAuthorized && (status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS')) {
    cardActionButtons = `
      <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
        <button 
          class="btn-card-reject" 
          data-index="${index}" 
          type="button" 
          style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-size: 0.75rem; font-weight: 700; padding: 7px 8px; border-radius: 6px; cursor: pointer;"
        >
          Tolak Permintaan
        </button>
        <button 
          class="btn-card-process" 
          data-index="${index}" 
          type="button" 
          style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-size: 0.75rem; font-weight: 700; padding: 7px 8px; border-radius: 6px; cursor: pointer;"
        >
          ${status === 'PERLU_REVISI_PENGURUS' ? 'Revisi Permintaan' : 'Proses Permintaan'}
        </button>
      </div>
    `;
  } else if (isAskepAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' || status === 'PERLU_REVISI_ASISTEN_KEPALA')) {
    cardActionButtons = `
      <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
        <button 
          class="btn-card-askep-return" 
          data-index="${index}" 
          type="button" 
          style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-size: 0.75rem; font-weight: 700; padding: 7px 8px; border-radius: 6px; cursor: pointer;"
        >
          Kembalikan ke Pengurus
        </button>
        <button 
          class="btn-card-askep-process" 
          data-index="${index}" 
          type="button" 
          style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-size: 0.75rem; font-weight: 700; padding: 7px 8px; border-radius: 6px; cursor: pointer;"
        >
          Verifikasi & Teruskan
        </button>
      </div>
    `;
  } else if (isAsistenAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || status === 'MENUNGGU_VERIFIKASI_ASISTEN')) {
    cardActionButtons = `
      <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
        <button 
          class="btn-card-return" 
          data-index="${index}" 
          type="button" 
          style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-size: 0.75rem; font-weight: 700; padding: 7px 8px; border-radius: 6px; cursor: pointer;"
        >
          Kembalikan ke Asisten Kepala
        </button>
        <button 
          class="btn-card-verify" 
          data-index="${index}" 
          type="button" 
          style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-size: 0.75rem; font-weight: 700; padding: 7px 8px; border-radius: 6px; cursor: pointer;"
        >
          Verifikasi & Teruskan
        </button>
      </div>
    `;
  }

  // Expanded detail section
  const expandedSection = isExpanded ? `
    <!-- EXPANDED DETAIL -->
    <div class="card-expanded-detail" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
      <div style="display: grid; grid-template-columns: 40% 60%; gap: 4px; font-size: 0.75rem; padding: 0 2px;">
        <span style="color: #64748B;">Pemohon</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || 'Pengurus')}</span>

        <span style="color: #64748B;">Tujuan Permintaan</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.purpose || 'Penanaman / Bibit Tanam')}</span>

        <span style="color: #64748B;">Kode Alokasi</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.allocationCode || '-')}</span>

        <span style="color: #64748B;">Tahapan Pertumbuhan</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>

        <span style="color: #64748B;">Tanggal Pengajuan</span>
        <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.createdAt || item.date))}</span>

        ${item.approvedQty !== undefined ? `
          <span style="color: #116834; font-weight: 700;">Banyaknya Disetujui</span>
          <span style="font-weight: 800; color: #116834; text-align: right;">${parseInt(item.approvedQty, 10).toLocaleString('id-ID')} Pkk</span>
        ` : ''}

        ${item.approvedClone ? `
          <span style="color: #116834; font-weight: 700;">Klon Disetujui</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.approvedClone)}</span>
        ` : ''}

        ${item.targetDivisionName || item.targetDivisionId ? `
          <span style="color: #116834; font-weight: 700;">Divisi Bibitan</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.targetDivisionName || item.targetDivisionId)}</span>
        ` : ''}

        ${item.estimatedDeliveryDate ? `
          <span style="color: #116834; font-weight: 700;">Estimasi Kirim</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(formatDate(item.estimatedDeliveryDate))}</span>
        ` : ''}

        ${item.processedByName ? `
          <span style="color: #64748B;">Diproses Oleh</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.processedByName)}</span>
        ` : ''}

        ${item.verifiedAskepByName ? `
          <span style="color: #64748B;">Asisten Kepala</span>
          <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.verifiedAskepByName)}</span>
        ` : ''}

        ${(item.revisionReason || item.returnReason) ? `
          <span style="color: #BE123C; font-weight: 700;">Catatan Revisi</span>
          <span style="font-weight: 700; color: #BE123C; text-align: right; overflow-wrap: anywhere;">${esc(item.revisionReason || item.returnReason)}</span>
        ` : ''}

        ${item.returnedByName ? `
          <span style="color: #64748B;">Dikembalikan Oleh</span>
          <span style="font-weight: 700; color: #BE123C; text-align: right;">${esc(item.returnedByName)}</span>
        ` : ''}

        ${item.verifiedByName ? `
          <span style="color: #15803D; font-weight: 700;">Diverifikasi Oleh</span>
          <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.verifiedByName)}</span>
        ` : ''}

        ${item.rejectionReason ? `
          <span style="color: #DC2626; font-weight: 700;">Alasan Penolakan</span>
          <span style="font-weight: 700; color: #DC2626; text-align: right; overflow-wrap: anywhere;">${esc(item.rejectionReason)}</span>
        ` : ''}
      </div>

      ${cardActionButtons}

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 6px; border-top: 1px solid #F1F5F9;">
        <button class="btn-view-detail" data-index="${index}" type="button" style="background: transparent; border: none; color: #116834; font-size: 0.72rem; font-weight: 700; cursor: pointer; padding: 4px 0;">
          Lihat Detail Lengkap ↗
        </button>
        <button class="btn-collapse-card" data-index="${index}" type="button" style="background: transparent; border: none; color: #64748B; font-size: 0.72rem; font-weight: 600; cursor: pointer; padding: 4px 8px;">
          Tutup Detail ▲
        </button>
      </div>
    </div>
  ` : '';

  // Unexpanded footer markup
  let unexpandedFooter = '';
  if (!isExpanded) {
    if (isPengurusAuthorized && (status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS')) {
      unexpandedFooter = `
        <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between; border-top: 1px dashed #F1F5F9; padding-top: 8px; margin-top: 6px;">
          <button 
            class="btn-view-detail" 
            data-index="${index}"
            type="button" 
            style="background: transparent; border: 1px solid #CBD5E1; color: #334155; font-size: 0.72rem; font-weight: 600; padding: 4px 8px; border-radius: 5px; cursor: pointer;"
          >
            Detail ▼
          </button>
          <div style="display: flex; gap: 6px;">
            <button 
              class="btn-card-reject" 
              data-index="${index}" 
              type="button" 
              style="border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 5px; cursor: pointer;"
            >
              Tolak Permintaan
            </button>
            <button 
              class="btn-card-process" 
              data-index="${index}" 
              type="button" 
              style="background: #116834; color: #FFFFFF; border: none; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;"
            >
              ${status === 'PERLU_REVISI_PENGURUS' ? 'Revisi Permintaan' : 'Proses Permintaan'}
            </button>
          </div>
        </div>
      `;
    } else if (isAskepAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' || status === 'PERLU_REVISI_ASISTEN_KEPALA')) {
      unexpandedFooter = `
        <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between; border-top: 1px dashed #F1F5F9; padding-top: 8px; margin-top: 6px;">
          <button 
            class="btn-view-detail" 
            data-index="${index}"
            type="button" 
            style="background: transparent; border: 1px solid #CBD5E1; color: #334155; font-size: 0.72rem; font-weight: 600; padding: 4px 8px; border-radius: 5px; cursor: pointer;"
          >
            Detail ▼
          </button>
          <div style="display: flex; gap: 6px;">
            <button 
              class="btn-card-askep-return" 
              data-index="${index}" 
              type="button" 
              style="border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 5px; cursor: pointer;"
            >
              Kembalikan
            </button>
            <button 
              class="btn-card-askep-process" 
              data-index="${index}" 
              type="button" 
              style="background: #116834; color: #FFFFFF; border: none; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;"
            >
              Verifikasi
            </button>
          </div>
        </div>
      `;
    } else if (isAsistenAuthorized && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || status === 'MENUNGGU_VERIFIKASI_ASISTEN')) {
      unexpandedFooter = `
        <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between; border-top: 1px dashed #F1F5F9; padding-top: 8px; margin-top: 6px;">
          <button 
            class="btn-view-detail" 
            data-index="${index}"
            type="button" 
            style="background: transparent; border: 1px solid #CBD5E1; color: #334155; font-size: 0.72rem; font-weight: 600; padding: 4px 8px; border-radius: 5px; cursor: pointer;"
          >
            Detail ▼
          </button>
          <div style="display: flex; gap: 6px;">
            <button 
              class="btn-card-return" 
              data-index="${index}" 
              type="button" 
              style="border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 5px; cursor: pointer;"
            >
              Kembalikan
            </button>
            <button 
              class="btn-card-verify" 
              data-index="${index}" 
              type="button" 
              style="background: #116834; color: #FFFFFF; border: none; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;"
            >
              Verifikasi
            </button>
          </div>
        </div>
      `;
    } else {
      unexpandedFooter = `
        <div style="display: flex; justify-content: flex-end; border-top: 1px dashed #F1F5F9; padding-top: 6px; margin-top: 6px;">
          <button 
            class="btn-view-detail" 
            data-index="${index}"
            type="button" 
            style="background: transparent; border: 1px solid #CBD5E1; color: #334155; font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 5px; cursor: pointer;"
          >
            Detail ▼
          </button>
        </div>
      `;
    }
  }

  return `
    <div class="request-card" data-card-index="${index}" style="background: #FFFFFF; border: 1px solid ${isExpanded ? '#116834' : '#E2E8F0'}; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); transition: border-color 0.15s ease;">
      
      <!-- ROW 1: NO DOKUMEN & BADGE STATUS -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div style="font-size: 0.88rem; font-weight: 800; color: #116834;">${esc(docNo)}</div>
        <span style="font-size: 0.65rem; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 2px 7px; border-radius: 5px; text-transform: uppercase;">
          ${esc(badgeText)}
        </span>
      </div>

      <!-- ROW 2: KEBUN ASAL → KEBUN DITUJU -->
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 0.78rem;">
        <span style="font-weight: 700; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 42%;">${esc(sourceName)}</span>
        <span style="color: #94A3B8; font-weight: 700; flex-shrink: 0;">→</span>
        <span style="font-weight: 700; color: #116834; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 42%;">${esc(targetName)}</span>
      </div>

      <!-- ROW 3: KLON • KATEGORI -->
      <div style="font-size: 0.75rem; color: #475569; margin-bottom: 4px;">
        <span style="font-weight: 700;">${esc(item.klon || '-')}</span>
        <span style="color: #CBD5E1; margin: 0 4px;">•</span>
        <span style="font-weight: 600;">${esc(item.category || '-')}</span>
      </div>

      <!-- ROW 4: BANYAKNYA & TANGGAL -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: ${isExpanded ? '0' : '6px'};">
        <span style="font-weight: 800; color: #116834;">${qtyFormatted} Pkk</span>
        <span style="color: #64748B;">Dibutuhkan ${esc(formattedDate)}</span>
      </div>

      ${expandedSection}
      ${unexpandedFooter}

    </div>
  `;
}

/**
 * Render Tampilan Kosong (Empty State)
 */
function renderEmptyState(tab) {
  const isMyReq = tab === 'MY_REQUESTS';
  const title = isMyReq ? 'Belum Ada Permintaan' : 'Belum Ada Permintaan Masuk';
  const desc = isMyReq 
    ? 'Belum ada permintaan bibit kebun sepupu yang Anda buat.'
    : 'Belum ada permintaan bibit yang ditujukan ke kebun Anda.';

  return renderEmptyStateCard({
    title,
    description: desc,
    customStyle: 'text-align: center; padding: 40px 16px; background: #FFFFFF; border-radius: 10px; border: 1px dashed #CBD5E1; margin-top: 8px;'
  });
}

/**
 * Modal Detail Transaksi (Read-Only Detail View + Conditional Actions)
 */
function showDetailModal(item, currentUser) {
  const docNo = item.docNo || item.nomorDokumen || '2026/NIR/001';
  const sourceEstate = resolveEstate(item.estateId);
  const targetEstate = resolveEstate(item.targetEstateId);
  const sourceName = sourceEstate ? sourceEstate.estate_name : (item.estateId || 'Tanah Besih');
  const targetName = targetEstate ? targetEstate.estate_name : (item.targetEstateName || item.targetEstateId || 'Aek Pamingke');
  const qtyFormatted = parseInt(item.qty || item.requestedQty || 0, 10).toLocaleString('id-ID');
  const status = (item.status || 'DIAJUKAN').toUpperCase();

  const isAuthorizedPengurus = canPerformReceiverAction(item, currentUser);
  const isAuthorizedAskep = canPerformAskepAction(item, currentUser);
  const isAuthorizedAsisten = canPerformAsistenAction(item, currentUser);

  // Tentukan footer modal aksi berdasarkan otorisasi & status
  let modalFooterMarkup = `
    <div style="width: 100%;">
      <button class="btn btn-ghost" id="btn-close-detail" style="width: 100%; border: 1px solid #CBD5E1; color: #475569; font-weight: 600;">Tutup</button>
    </div>
  `;

  if (isAuthorizedPengurus && (status === 'DIAJUKAN' || status === 'PERLU_REVISI_PENGURUS')) {
    modalFooterMarkup = `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn" id="btn-modal-reject" type="button" style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
          Tolak Permintaan
        </button>
        <button class="btn" id="btn-modal-process" type="button" style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
          ${status === 'PERLU_REVISI_PENGURUS' ? 'Revisi Permintaan' : 'Proses Permintaan'}
        </button>
      </div>
    `;
  } else if (isAuthorizedAskep && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' || status === 'PERLU_REVISI_ASISTEN_KEPALA')) {
    modalFooterMarkup = `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn" id="btn-modal-askep-return" type="button" style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
          Kembalikan ke Pengurus
        </button>
        <button class="btn" id="btn-modal-askep-process" type="button" style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
          Verifikasi & Teruskan
        </button>
      </div>
    `;
  } else if (isAuthorizedAsisten && (status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || status === 'MENUNGGU_VERIFIKASI_ASISTEN')) {
    modalFooterMarkup = `
      <div style="display: flex; gap: 8px; width: 100%;">
        <button class="btn" id="btn-modal-return" type="button" style="flex: 1; border: 1px solid #DC2626; color: #DC2626; background: #FFFFFF; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
          Kembalikan ke Asisten Kepala
        </button>
        <button class="btn" id="btn-modal-verify" type="button" style="flex: 1; background: #116834; color: #FFFFFF; border: none; font-weight: 700; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
          Verifikasi & Teruskan
        </button>
      </div>
    `;
  }

  openModal({
    title: 'Detail Permintaan Bibit Kebun Sepupu',
    body: `
      <div style="padding: 4px 0;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; font-size: 0.82rem;">
          
          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;">
            <span style="color: #64748B;">No. Dokumen</span>
            <span style="font-weight: 800; color: #116834; text-align: right;">${esc(docNo)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Sumber Permintaan</span>
            <span style="font-weight: 700; color: #116834; text-align: right;">Kebun Sepupu</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Status</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(status)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kebun Asal</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(sourceName)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kebun Dituju</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(targetName)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Pemohon</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedBy || item.createdByName || 'Pengurus')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tujuan Permintaan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.purpose || 'Penanaman / Bibit Tanam')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kode Alokasi</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.allocationCode || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Klon Diminta</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.requestedClone || item.klon || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Kategori</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(item.category || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tahapan Pertumbuhan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.growthStage || '-')}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tanggal Dibutuhkan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.requiredDate))}</span>
          </div>

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-bottom: 7px;">
            <span style="color: #64748B;">Tanggal Pengajuan</span>
            <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.createdAt || item.date))}</span>
          </div>

          ${item.approvedQty !== undefined ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #BBF7D0;">
              <span style="color: #15803D; font-weight: 700;">Banyaknya Disetujui</span>
              <span style="font-weight: 800; color: #15803D; text-align: right;">${parseInt(item.approvedQty, 10).toLocaleString('id-ID')} Pkk</span>
            </div>
          ` : ''}

          ${item.approvedClone ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #15803D; font-weight: 700;">Klon Disetujui</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.approvedClone)}</span>
            </div>
          ` : ''}

          ${item.targetDivisionName || item.targetDivisionId ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #15803D; font-weight: 700;">Divisi Bibitan</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.targetDivisionName || item.targetDivisionId)}</span>
            </div>
          ` : ''}

          ${item.estimatedDeliveryDate ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #15803D; font-weight: 700;">Estimasi Kirim</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(formatDate(item.estimatedDeliveryDate))}</span>
            </div>
          ` : ''}

          ${item.processedByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #E2E8F0;">
              <span style="color: #64748B;">Diproses / Direview Oleh</span>
              <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.processedByName)}</span>
            </div>
          ` : ''}

          ${item.verifiedAskepByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #64748B;">Asisten Kepala</span>
              <span style="font-weight: 700; color: #116834; text-align: right;">${esc(item.verifiedAskepByName)}</span>
            </div>
          ` : ''}

          ${item.verifiedAskepAt ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #64748B;">Verifikasi Askep</span>
              <span style="font-weight: 700; color: #1E293B; text-align: right;">${esc(formatDate(item.verifiedAskepAt))}</span>
            </div>
          ` : ''}

          ${(item.revisionReason || item.returnReason) ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #FECDD3;">
              <span style="color: #BE123C; font-weight: 700;">Catatan Revisi</span>
              <span style="font-weight: 700; color: #991B1B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.revisionReason || item.returnReason)}</span>
            </div>
          ` : ''}

          ${item.returnedByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 5px;">
              <span style="color: #64748B;">Dikembalikan Oleh</span>
              <span style="font-weight: 700; color: #BE123C; text-align: right;">${esc(item.returnedByName)}</span>
            </div>
          ` : ''}

          ${item.verifiedByName ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #BBF7D0;">
              <span style="color: #15803D; font-weight: 700;">Diverifikasi Oleh</span>
              <span style="font-weight: 700; color: #15803D; text-align: right;">${esc(item.verifiedByName)}</span>
            </div>
          ` : ''}

          ${item.rejectionReason ? `
            <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: start; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #FECACA;">
              <span style="color: #B91C1C; font-weight: 700;">Alasan Penolakan</span>
              <span style="font-weight: 700; color: #991B1B; text-align: right; min-width: 0; overflow-wrap: anywhere;">${esc(item.rejectionReason)}</span>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 42% 58%; gap: 8px; align-items: baseline; margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span style="color: #64748B; font-weight: 600;">Banyaknya Diminta</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: #116834; text-align: right;">${qtyFormatted} Pkk</span>
          </div>

        </div>
      </div>
    `,
    footer: modalFooterMarkup
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-close-detail')?.addEventListener('click', closeModal);

  // Wire Pengurus actions
  root?.querySelector('#btn-modal-process')?.addEventListener('click', () => {
    closeModal();
    openReviewModal(item, currentUser);
  });

  root?.querySelector('#btn-modal-reject')?.addEventListener('click', () => {
    closeModal();
    handleRejectRequestModal(item, currentUser);
  });

  // Wire Askep actions
  root?.querySelector('#btn-modal-askep-process')?.addEventListener('click', () => {
    closeModal();
    openAskepReviewModal(item, currentUser);
  });

  root?.querySelector('#btn-modal-askep-return')?.addEventListener('click', () => {
    closeModal();
    openAskepReturnModal(item, currentUser);
  });

  // Wire Asisten actions
  root?.querySelector('#btn-modal-verify')?.addEventListener('click', () => {
    closeModal();
    openVerifyModal(item, currentUser);
  });

  root?.querySelector('#btn-modal-return')?.addEventListener('click', () => {
    closeModal();
    openReturnModal(item, currentUser);
  });
}

/**
 * Event Listeners untuk Halaman Hub
 */
function attachLandingEvents(items, currentUser) {
  const app = document.getElementById('app');
  if (!app) return;

  // Back Button -> /request
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/request');
  });

  // Refresh Button
  app.querySelector('#btn-refresh')?.addEventListener('click', () => {
    renderRequestKebunSepupuLanding();
  });

  // Action Button -> /request/kebun-sepupu/form
  const goToForm = () => navigate('/request/kebun-sepupu/form');
  app.querySelector('#btn-create-request')?.addEventListener('click', goToForm);
  app.querySelector('#btn-empty-create')?.addEventListener('click', goToForm);

  // Tab Switcher
  app.querySelector('#tab-my-requests')?.addEventListener('click', () => {
    if (activeTab !== 'MY_REQUESTS') {
      activeTab = 'MY_REQUESTS';
      activeStatusFilter = 'SEMUA';
      expandedCardIndex = -1;
      renderRequestKebunSepupuLanding();
    }
  });

  app.querySelector('#tab-incoming-requests')?.addEventListener('click', () => {
    if (activeTab !== 'INCOMING_REQUESTS') {
      activeTab = 'INCOMING_REQUESTS';
      activeStatusFilter = 'SEMUA';
      expandedCardIndex = -1;
      renderRequestKebunSepupuLanding();
    }
  });

  // Status Filter Pills
  app.querySelectorAll('.filter-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.getAttribute('data-status');
      if (activeStatusFilter !== status) {
        activeStatusFilter = status;
        expandedCardIndex = -1;
        renderRequestKebunSepupuLanding();
      }
    });
  });

  // Expand Card Buttons
  app.querySelectorAll('.btn-expand-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      expandedCardIndex = idx;
      renderRequestKebunSepupuLanding();
    });
  });

  // Collapse Card Buttons
  app.querySelectorAll('.btn-collapse-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      expandedCardIndex = -1;
      renderRequestKebunSepupuLanding();
    });
  });

  // Detail Modal Buttons (opens modal directly)
  app.querySelectorAll('.btn-view-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        showDetailModal(items[idx], currentUser);
      }
    });
  });

  // Pengurus Card Action: Buka Form Modal Review Permintaan
  app.querySelectorAll('.btn-card-process').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openReviewModal(items[idx], currentUser);
      }
    });
  });

  // Pengurus Card Action: Tolak Permintaan
  app.querySelectorAll('.btn-card-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        handleRejectRequestModal(items[idx], currentUser);
      }
    });
  });

  // Askep Card Action: Buka Form Modal Review & Verifikasi Askep
  app.querySelectorAll('.btn-card-askep-process').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openAskepReviewModal(items[idx], currentUser);
      }
    });
  });

  // Askep Card Action: Kembalikan ke Pengurus
  app.querySelectorAll('.btn-card-askep-return').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openAskepReturnModal(items[idx], currentUser);
      }
    });
  });

  // Asisten Card Action: Verifikasi & Teruskan
  app.querySelectorAll('.btn-card-verify').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openVerifyModal(items[idx], currentUser);
      }
    });
  });

  // Asisten Card Action: Kembalikan ke Asisten Kepala
  app.querySelectorAll('.btn-card-return').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (items[idx]) {
        openReturnModal(items[idx], currentUser);
      }
    });
  });
}
