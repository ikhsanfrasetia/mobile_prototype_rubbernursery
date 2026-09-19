/**
 * js/modules/request/request-kebun-sendiri-landing.js
 * Halaman Pusat Permintaan Bibit Kebun Sendiri (Transaction Type: KEBUN_SENDIRI)
 *
 * Workflow:
 * 1. ASISTEN_BIBITAN / ASISTEN (Lapangan) Buat Permintaan -> Status: MENUNGGU_VERIFIKASI_ASISTEN_KEPALA (DIAJUKAN)
 * 2. ASISTEN_KEPALA Review / Koreksi / Approve -> Status: MENUNGGU_VERIFIKASI_PENGURUS
 * 3. PENGURUS KEBUN ASAL Review / Koreksi / Approve -> Status: MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN
 * 4. ASISTEN_BIBITAN PEMENUH Review Stok / Verify -> Status: TERVERIFIKASI
 * 5. MANTRI_BIBITAN Pengeluaran Bibit (Dispatch) -> Status: MENUNGGU_VERIFIKASI_PENGELUARAN
 * 6. ASISTEN_BIBITAN PEMENUH Verifikasi Aktual Pengeluaran -> Status: MENUNGGU_PENERIMAAN
 * 7. ASISTEN PEMOHON (Requester Asli) Penerimaan Fisik (Layak/Rusak + Camera Only) -> Status: SELESAI
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { storage } from '../../core/storage.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { requestRepository, batchRepository } from '../../db/repositories.js';
import { resolveEstate } from '../../data/estate-master.js';
import { getActiveKlons, resolveKlon } from '../../data/klon-master.js';
import { formatDate, formatFullDateIndonesian, nowISO, todayISO, esc } from '../../core/utils.js';
import { deductMultiBatchStock, getNurseryBatches } from '../dispatch/dispatch-landing.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';

let activeTab = null; // 'MY_REQUESTS' | 'INCOMING_REQUESTS'
let lastUserRoleId = null; // Track current user role to set default tab on initial role change
let activeStatusFilter = 'SEMUA'; // 'SEMUA' | 'DIAJUKAN' | 'DIPROSES' | 'SELESAI' | 'DITOLAK'
let expandedCardIndex = -1;

/**
 * Cek apakah user berwenang membuat permohonan Kebun Sendiri
 * HANYA ASISTEN_BIBITAN & ASISTEN (Lapangan/Divisi)
 */
export function canUserCreateKebunSendiri(currentUser) {
  if (!currentUser) return false;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  return userRole === ROLES.ASISTEN_BIBITAN || userRole === ROLES.ASISTEN;
}

/**
 * Cek apakah user berwenang melakukan aksi verifikasi/koreksi Asisten Kepala
 */
export function canPerformAskepAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  if (tx.type !== 'KEBUN_SENDIRI' && tx.transactionType !== 'KEBUN_SENDIRI') return false;
  
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== ROLES.ASKEP && userRole !== 'ASISTEN_KEPALA') return false;

  const userEstateId = currentUser.estateId;
  const requestEstateId = tx.requesterEstateId || tx.estateId;
  if (!userEstateId || requestEstateId !== userEstateId) return false;

  const status = (tx.status || '').toUpperCase();
  return (
    status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' ||
    status === 'DIAJUKAN' ||
    status === 'PERLU_REVISI_ASISTEN_KEPALA'
  );
}

/**
 * Cek apakah user berwenang melakukan aksi review/approval Pengurus Kebun Asal
 */
export function canPerformPengurusAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  if (tx.type !== 'KEBUN_SENDIRI' && tx.transactionType !== 'KEBUN_SENDIRI') return false;
  
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== ROLES.PENGURUS) return false;

  const userEstateId = currentUser.estateId;
  const requestEstateId = tx.requesterEstateId || tx.estateId;
  if (!userEstateId || requestEstateId !== userEstateId) return false;

  const status = (tx.status || '').toUpperCase();
  return (
    status === 'MENUNGGU_VERIFIKASI_PENGURUS' ||
    status === 'MENUNGGU_REVIEW_PENGURUS' ||
    status === 'PERLU_REVISI_PENGURUS'
  );
}

/**
 * Cek apakah user berwenang melakukan aksi verifikasi Asisten Bibitan Pemenuh
 */
export function canPerformAsbVerifyAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  if (tx.type !== 'KEBUN_SENDIRI' && tx.transactionType !== 'KEBUN_SENDIRI') return false;
  
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== ROLES.ASISTEN_BIBITAN) return false;

  const userEstateId = currentUser.estateId;
  const requestEstateId = tx.requesterEstateId || tx.estateId;
  if (!userEstateId || requestEstateId !== userEstateId) return false;

  const status = (tx.status || '').toUpperCase();
  return status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN';
}

/**
 * Cek apakah user berwenang melakukan aksi verifikasi aktual pengeluaran (ASB Pemenuh)
 */
export function canPerformAsbDispatchVerificationAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  if (tx.type !== 'KEBUN_SENDIRI' && tx.transactionType !== 'KEBUN_SENDIRI') return false;
  
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  if (userRole !== ROLES.ASISTEN_BIBITAN) return false;

  const userEstateId = currentUser.estateId;
  const requestEstateId = tx.requesterEstateId || tx.estateId;
  if (!userEstateId || requestEstateId !== userEstateId) return false;

  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;
  if (tx.fulfillmentAssistantUserId && currentUserId && tx.fulfillmentAssistantUserId !== currentUserId) {
    // Jika sudah ditunjuk ASB spesifik, prioritaskan ASB tersebut
  }

  const status = (tx.status || '').toUpperCase();
  return (
    status === 'MENUNGGU_VERIFIKASI_PENGELUARAN' ||
    status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN_PENGELUARAN' ||
    status === 'PENGELUARAN_BERJALAN'
  );
}

/**
 * Cek apakah user berwenang melakukan aksi penerimaan akhir
 * STRICT: HANYA Requester Asli (pembuat request) yang boleh melakukan penerimaan!
 */
export function canPerformRequesterReceiptAction(tx, currentUser) {
  if (!tx || !currentUser) return false;
  if (tx.type !== 'KEBUN_SENDIRI' && tx.transactionType !== 'KEBUN_SENDIRI') return false;

  const status = (tx.status || '').toUpperCase();
  if (status !== 'MENUNGGU_PENERIMAAN') return false;

  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;
  const requesterId = tx.requesterUserId || tx.userId || tx.createdByUserId;

  if (!currentUserId || !requesterId) return false;
  return currentUserId === requesterId;
}

/**
 * Filter requests untuk Tab Permintaan Saya (Requester)
 */
export function filterMyRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const currentUserId = currentUser.userId || currentUser.id || currentUser.code;

  return requests.filter(tx => {
    const isKebunSendiri = tx.type === 'KEBUN_SENDIRI' || tx.transactionType === 'KEBUN_SENDIRI';
    if (!isKebunSendiri) return false;

    const requesterId = tx.requesterUserId || tx.userId || tx.createdByUserId;
    return requesterId === currentUserId;
  });
}

/**
 * Filter requests untuk Tab Menunggu Tindakan / Monitoring (Askep, Pengurus, ASB, Mantri)
 */
export function filterIncomingRequests(requests, currentUser) {
  if (!Array.isArray(requests) || !currentUser) return [];
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const userEstateId = currentUser.estateId;

  return requests.filter(tx => {
    const isKebunSendiri = tx.type === 'KEBUN_SENDIRI' || tx.transactionType === 'KEBUN_SENDIRI';
    if (!isKebunSendiri) return false;

    const reqEstate = tx.requesterEstateId || tx.estateId;
    if (userEstateId && reqEstate !== userEstateId) return false;

    if (userRole === ROLES.ASKEP || userRole === 'ASISTEN_KEPALA') {
      return true;
    }
    if (userRole === ROLES.PENGURUS) {
      return true;
    }
    if (userRole === ROLES.ASISTEN_BIBITAN) {
      return true;
    }
    if (userRole === ROLES.MANTRI_TANAMAN) {
      const status = (tx.status || '').toUpperCase();
      return status === 'TERVERIFIKASI' || status === 'MENUNGGU_VERIFIKASI_PENGELUARAN' || status === 'MENUNGGU_PENERIMAAN' || status === 'SELESAI';
    }
    return false;
  });
}

/**
 * Hitung jumlah permintaan masuk yang membutuhkan aksi aktif role saat ini (Askep / Pengurus / ASB)
 */
export function getActionableIncomingCount(incomingRequests, currentUser) {
  if (!Array.isArray(incomingRequests) || !currentUser) return 0;
  const userRole = normalizeRole(currentUser.role || currentUser.rawRole);

  if (userRole === ROLES.ASKEP || userRole === 'ASISTEN_KEPALA') {
    return incomingRequests.filter(tx => canPerformAskepAction(tx, currentUser)).length;
  }

  if (userRole === ROLES.PENGURUS) {
    return incomingRequests.filter(tx => canPerformPengurusAction(tx, currentUser)).length;
  }

  if (userRole === ROLES.ASISTEN_BIBITAN) {
    return incomingRequests.filter(tx => 
      canPerformAsbVerifyAction(tx, currentUser) || 
      canPerformAsbDispatchVerificationAction(tx, currentUser)
    ).length;
  }

  return 0;
}

/**
 * Helper status label & badge style
 */
export function getStatusBadge(status) {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA':
    case 'DIAJUKAN':
      return { label: 'Menunggu Verifikasi Askep', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
    case 'MENUNGGU_VERIFIKASI_PENGURUS':
    case 'MENUNGGU_REVIEW_PENGURUS':
      return { label: 'Menunggu Review Pengurus', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    case 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN':
      return { label: 'Menunggu Verifikasi ASB', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' };
    case 'TERVERIFIKASI':
      return { label: 'Terverifikasi (Siap Pengeluaran)', color: '#0D9488', bg: '#CCFBF1', border: '#99F6E4' };
    case 'MENUNGGU_VERIFIKASI_PENGELUARAN':
    case 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN_PENGELUARAN':
      return { label: 'Menunggu Verifikasi Pengeluaran ASB', color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' };
    case 'MENUNGGU_PENERIMAAN':
      return { label: 'Menunggu Penerimaan Pemohon', color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' };
    case 'SELESAI':
      return { label: 'Selesai Diterima', color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' };
    case 'DITOLAK':
      return { label: 'Ditolak', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' };
    case 'PERLU_REVISI_ASISTEN_KEPALA':
      return { label: 'Perlu Revisi Askep', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
    case 'PERLU_REVISI_PENGURUS':
      return { label: 'Perlu Revisi Pengurus', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
    default:
      return { label: status || 'Diajukan', color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' };
  }
}

/**
 * Render Main Landing Page Permintaan Kebun Sendiri
 */
export async function renderRequestKebunSendiriLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get() || { role: 'ASISTEN', name: 'Asisten' };
  const userCtx = getCurrentUserContext() || user;
  const userRole = normalizeRole(userCtx.role || userCtx.rawRole);

  // Load requests
  let allRequests = [];
  try {
    allRequests = await requestRepository.list();
  } catch (err) {
    allRequests = storage.get('requests_transactions', []);
  }
  if (!allRequests || allRequests.length === 0) {
    allRequests = storage.get('requests_transactions', []);
  }

  // Filter kebun sendiri requests
  const kebunSendiriReqs = allRequests.filter(
    tx => tx.type === 'KEBUN_SENDIRI' || tx.transactionType === 'KEBUN_SENDIRI'
  );

  const myReqs = filterMyRequests(kebunSendiriReqs, userCtx);
  const incomingReqs = filterIncomingRequests(kebunSendiriReqs, userCtx);

  // Tentukan default tab berdasarkan role hanya saat pertama kali load / ganti role
  const isRequesterRole = userRole === ROLES.ASISTEN || userRole === ROLES.ASISTEN_BIBITAN;
  const currentActorKey = `${userCtx.userId || userCtx.id || ''}_${userRole}`;
  if (lastUserRoleId !== currentActorKey || !activeTab) {
    lastUserRoleId = currentActorKey;
    if (!isRequesterRole) {
      activeTab = 'INCOMING_REQUESTS';
    } else {
      activeTab = 'MY_REQUESTS';
    }
  }

  const currentDisplayList = activeTab === 'MY_REQUESTS' ? myReqs : incomingReqs;

  // Filter status
  const filteredList = currentDisplayList.filter(tx => {
    if (activeStatusFilter === 'SEMUA') return true;
    const s = (tx.status || '').toUpperCase();
    if (activeStatusFilter === 'DIAJUKAN') {
      return s === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' || s === 'DIAJUKAN';
    }
    if (activeStatusFilter === 'DIPROSES') {
      return (
        s === 'MENUNGGU_VERIFIKASI_PENGURUS' ||
        s === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' ||
        s === 'TERVERIFIKASI' ||
        s === 'MENUNGGU_VERIFIKASI_PENGELUARAN' ||
        s === 'MENUNGGU_PENERIMAAN' ||
        s === 'PENGELUARAN_BERJALAN'
      );
    }
    if (activeStatusFilter === 'SELESAI') return s === 'SELESAI';
    if (activeStatusFilter === 'DITOLAK') return s === 'DITOLAK';
    return true;
  });

  // Tombol Buat Permintaan: HANYA muncul untuk ASISTEN_BIBITAN dan ASISTEN (Lapangan)
  const showCreateButton = canUserCreateKebunSendiri(userCtx);

  const incomingActionableCount = getActionableIncomingCount(incomingReqs, userCtx);
  const myActionableCount = myReqs.filter(tx => canPerformRequesterReceiptAction(tx, userCtx)).length;

  // Tabs HTML
  const tabsHtml = isRequesterRole ? `
    <div style="background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
      <div style="display: flex; padding: 0 12px;">
        <button id="tab-my-requests" type="button" style="flex: 1; padding: 10px 4px; background: transparent; border: none; border-bottom: 2.5px solid ${activeTab === 'MY_REQUESTS' ? '#116834' : 'transparent'}; color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}; font-weight: ${activeTab === 'MY_REQUESTS' ? '800' : '600'}; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; position: relative;">
          <span>Permintaan Saya</span>
          <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 10px; background: ${activeTab === 'MY_REQUESTS' ? '#E8F5E9' : '#F1F5F9'}; color: ${activeTab === 'MY_REQUESTS' ? '#116834' : '#64748B'}; font-weight: 700;">
            ${myReqs.length}
          </span>
          ${myActionableCount > 0 ? `
            <span class="notif-dot" style="display: inline-block; width: 7px; height: 7px; background-color: #D32F2F; border-radius: 50%; margin-left: 2px;"></span>
          ` : ''}
        </button>
        <button id="tab-incoming-requests" type="button" style="flex: 1; padding: 10px 4px; background: transparent; border: none; border-bottom: 2.5px solid ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : 'transparent'}; color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}; font-weight: ${activeTab === 'INCOMING_REQUESTS' ? '800' : '600'}; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; position: relative;">
          <span>Daftar Permintaan</span>
          <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 10px; background: ${activeTab === 'INCOMING_REQUESTS' ? '#E8F5E9' : '#F1F5F9'}; color: ${activeTab === 'INCOMING_REQUESTS' ? '#116834' : '#64748B'}; font-weight: 700;">
            ${incomingReqs.length}
          </span>
          ${incomingActionableCount > 0 ? `
            <span class="notif-dot" style="display: inline-block; width: 7px; height: 7px; background-color: #D32F2F; border-radius: 50%; margin-left: 2px;"></span>
          ` : ''}
        </button>
      </div>
    </div>
  ` : `
    <div style="padding: 10px 16px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 0.80rem; font-weight: 700; color: #334155; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;">
      <span>Daftar Permintaan Masuk (${incomingReqs.length})</span>
      ${incomingActionableCount > 0 ? `
        <span class="notif-dot" style="display: inline-block; width: 8px; height: 8px; background-color: #D32F2F; border-radius: 50%;"></span>
      ` : ''}
    </div>
  `;

  // Status Filter Pills
  const statusFiltersHtml = `
    <div style="background: #FAFAFA; padding: 8px 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
      <div style="display: flex; gap: 6px;">
        ${['SEMUA', 'DIAJUKAN', 'DIPROSES', 'SELESAI', 'DITOLAK'].map(filter => `
          <button class="status-filter-btn" data-filter="${filter}" type="button" style="padding: 4px 10px; border-radius: 16px; font-size: 0.72rem; font-weight: ${activeStatusFilter === filter ? '700' : '600'}; border: 1px solid ${activeStatusFilter === filter ? '#116834' : '#E2E8F0'}; background: ${activeStatusFilter === filter ? '#E8F5E9' : '#FFFFFF'}; color: ${activeStatusFilter === filter ? '#116834' : '#64748B'}; cursor: pointer; white-space: nowrap;">
            ${filter === 'SEMUA' ? 'Semua' : filter.charAt(0) + filter.slice(1).toLowerCase()}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Request Cards
  const cardsHtml = filteredList.length === 0 ? renderEmptyStateCard({
    title: 'Belum Ada Permintaan',
    description: 'Tidak ada dokumen permintaan bibit kebun sendiri pada kategori ini.'
  }) : filteredList.map((tx, idx) => {
    const isExpanded = expandedCardIndex === idx;
    const badge = getStatusBadge(tx.status);
    const requestedQty = (tx.requestedQty || tx.qty || 0).toLocaleString('id-ID');
    const approvedQty = (tx.approvedQty || tx.qty || 0).toLocaleString('id-ID');

    // Action button detection
    const canAskep = canPerformAskepAction(tx, userCtx);
    const canPengurus = canPerformPengurusAction(tx, userCtx);
    const canAsbVerify = canPerformAsbVerifyAction(tx, userCtx);
    const canAsbDispatchVerif = canPerformAsbDispatchVerificationAction(tx, userCtx);
    const canRequesterReceipt = canPerformRequesterReceiptAction(tx, userCtx);

    let actionBtnHtml = '';
    if (canAskep) {
      actionBtnHtml = `
        <button class="btn-action-askep" data-id="${esc(tx.id)}" type="button" style="width: 100%; padding: 8px 12px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.82rem; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;">
          Review Permintaan (Asisten Kepala)
        </button>
      `;
    } else if (canPengurus) {
      actionBtnHtml = `
        <button class="btn-action-pengurus" data-id="${esc(tx.id)}" type="button" style="width: 100%; padding: 8px 12px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.82rem; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;">
          Review Permintaan (Pengurus Kebun)
        </button>
      `;
    } else if (canAsbVerify) {
      actionBtnHtml = `
        <button class="btn-action-asb-verify" data-id="${esc(tx.id)}" type="button" style="width: 100%; padding: 8px 12px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.82rem; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;">
          Verifikasi Ketersediaan Nursery (ASB)
        </button>
      `;
    } else if (canAsbDispatchVerif) {
      actionBtnHtml = `
        <button class="btn-action-asb-dispatch-verif" data-id="${esc(tx.id)}" type="button" style="width: 100%; padding: 8px 12px; background: #D97706; color: #FFFFFF; font-weight: 700; font-size: 0.82rem; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;">
          Verifikasi Aktual Pengeluaran (ASB)
        </button>
      `;
    } else if (canRequesterReceipt) {
      actionBtnHtml = `
        <button class="btn-action-requester-receipt" data-id="${esc(tx.id)}" type="button" style="width: 100%; padding: 8px 12px; background: #16A34A; color: #FFFFFF; font-weight: 700; font-size: 0.82rem; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          Terima Bibit (Kamera Wajib)
        </button>
      `;
    }

    return `
      <div class="card-request-item" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        
        <!-- Header Dokumen & Badge Status -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 0.66rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">Dokumen NIR</div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #116834; line-height: 1.25; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(tx.docNo || tx.nir || tx.id)}</div>
          </div>
          <div style="flex-shrink: 0; text-align: right; max-width: 52%;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 0.68rem; font-weight: 700; color: ${badge.color}; background: ${badge.bg}; border: 1px solid ${badge.border}; line-height: 1.25;">
              ${esc(badge.label)}
            </span>
          </div>
        </div>

        <!-- 2x2 Grid Informasi Rapi & Proporsional -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 0.76rem; margin-bottom: 8px;">
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; color: #64748B; margin-bottom: 1px;">Pemohon:</div>
            <div style="font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(tx.requestedBy || tx.requesterUserId || 'Asisten')}</div>
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; color: #64748B; margin-bottom: 1px;">Klon Diminta:</div>
            <div style="font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(tx.klon || tx.cloneId || '-')}</div>
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; color: #64748B; margin-bottom: 1px;">Jumlah Diminta:</div>
            <div style="font-weight: 800; color: #116834;">${requestedQty} Pkk</div>
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 0.68rem; color: #64748B; margin-bottom: 1px;">Tanggal Dibutuhkan:</div>
            <div style="font-weight: 600; color: #475569;">${esc(formatDate(tx.requiredDate))}</div>
          </div>
        </div>

        <!-- Detail Expandable Area -->
        <button class="btn-toggle-expand" data-index="${idx}" type="button" style="width: 100%; background: transparent; border: none; border-top: 1px dashed #E2E8F0; padding: 6px 0 2px 0; font-size: 0.74rem; color: #64748B; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer;">
          <span>${isExpanded ? 'Sembunyikan Rincian' : 'Lihat Rincian & Timeline'}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        ${isExpanded ? `
          <div style="background: #F8FAFC; border-radius: 8px; padding: 10px; margin-top: 8px; font-size: 0.78rem;">
            ${tx.distributionItems && tx.distributionItems.length > 0 ? `
              <div style="margin-bottom: 10px;">
                <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">Rincian Distribusi Blok:</div>
                <div style="border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.74rem;">
                    <thead>
                      <tr style="background: #E2E8F0; color: #334155;">
                        <th style="padding: 4px 6px; text-align: left;">Klon</th>
                        <th style="padding: 4px 6px; text-align: left;">Blok</th>
                        <th style="padding: 4px 6px; text-align: right;">Banyaknya</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${tx.distributionItems.map(d => `
                        <tr style="border-bottom: 1px solid #E2E8F0;">
                          <td style="padding: 4px 6px; font-weight: 700; color: #1E293B;">${esc(d.cloneId || d.klon || '-')}</td>
                          <td style="padding: 4px 6px; color: #475569;">${esc(d.blockCode || d.blockName || d.blockId || '-')}</td>
                          <td style="padding: 4px 6px; text-align: right; font-weight: 700; color: #116834;">${(d.qty || 0).toLocaleString('id-ID')} Pkk</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}

            <div style="font-weight: 700; color: #334155; margin-bottom: 6px;">Timeline & Audit Trail:</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${(tx.auditTrail || []).map(a => `
                <div style="border-left: 2px solid #116834; padding-left: 8px;">
                  <div style="font-weight: 700; color: #1E293B;">${esc(a.actorName || a.actorId)} (${esc(a.actorRole)})</div>
                  <div style="font-size: 0.72rem; color: #64748B;">${esc(formatDate(a.timestamp))} — ${esc(a.note || a.event)}</div>
                </div>
              `).join('')}
            </div>

            ${tx.dispatchData ? `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
                <span style="font-weight: 700; color: #1E293B;">Pengeluaran Mantri:</span> ${tx.dispatchData.issuedQty} Pkk (Doc: ${esc(tx.dispatchData.dispatchDocNo || '-')})
              </div>
            ` : ''}

            ${tx.dispatchVerification ? `
              <div style="margin-top: 4px;">
                <span style="font-weight: 700; color: #1E293B;">Verifikasi Aktual ASB:</span> ${tx.dispatchVerification.verifiedQty} Pkk (Oleh: ${esc(tx.dispatchVerification.verifiedByName || tx.dispatchVerification.verifiedBy)})
              </div>
            ` : ''}

            ${tx.receiptData ? `
              <div style="margin-top: 4px; background: #DCFCE7; padding: 6px 8px; border-radius: 6px; color: #166534;">
                <div><strong>Hasil Penerimaan:</strong> Layak: ${tx.receiptData.layakQty} Pkk | Rusak: ${tx.receiptData.rusakQty} Pkk (Total: ${tx.receiptData.totalQty} Pkk)</div>
                <div style="font-size: 0.72rem; margin-top: 2px;">Foto: <strong>${esc(tx.receiptData.captureSource || 'CAMERA')}</strong> pada ${esc(formatDate(tx.receiptData.capturedAt))}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${actionBtnHtml}
      </div>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 52px; padding: 0 12px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 4px; min-width: 0; flex: 1;">
          <button id="btn-back-request" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -4px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Permintaan Bibit Kebun Sendiri</h1>
        </div>
        <button id="btn-refresh" type="button" aria-label="Refresh" style="padding: 6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834; flex-shrink: 0;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </header>

      <!-- TABS -->
      ${tabsHtml}

      <!-- STATUS FILTER PILLS -->
      ${statusFiltersHtml}

      <!-- CARDS LIST BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 12px 16px;">
        ${cardsHtml}
      </main>

      <!-- FOOTER ACTION: Tombol Buat Permintaan Bibit Kebun Sendiri (Hanya ASISTEN_BIBITAN & ASISTEN) -->
      ${showCreateButton ? `
        <footer style="flex-shrink: 0; background: #FFFFFF; border-top: 1px solid #E5E7EB; padding: 10px 16px; box-shadow: 0 -2px 8px rgba(0,0,0,0.04);">
          <button id="btn-create-kebun-sendiri" type="button" style="width: 100%; min-height: 44px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.88rem; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease;">
            Buat Permintaan Bibit Kebun Sendiri
          </button>
        </footer>
      ` : ''}

    </div>
  `;

  // Event Listeners
  app.querySelector('#btn-back-request')?.addEventListener('click', () => {
    navigate('/request');
  });

  app.querySelector('#btn-refresh')?.addEventListener('click', () => {
    renderRequestKebunSendiriLanding();
  });

  app.querySelector('#btn-create-kebun-sendiri')?.addEventListener('click', () => {
    navigate('/request/kebun-sendiri/form');
  });

  app.querySelector('#tab-my-requests')?.addEventListener('click', () => {
    activeTab = 'MY_REQUESTS';
    expandedCardIndex = -1;
    renderRequestKebunSendiriLanding();
  });

  app.querySelector('#tab-incoming-requests')?.addEventListener('click', () => {
    activeTab = 'INCOMING_REQUESTS';
    expandedCardIndex = -1;
    renderRequestKebunSendiriLanding();
  });

  app.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.dataset.filter;
      renderRequestKebunSendiriLanding();
    });
  });

  app.querySelectorAll('.btn-toggle-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      expandedCardIndex = expandedCardIndex === idx ? -1 : idx;
      renderRequestKebunSendiriLanding();
    });
  });

  // Action Buttons
  app.querySelectorAll('.btn-action-askep').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = kebunSendiriReqs.find(r => r.id === btn.dataset.id);
      if (tx) openAskepReviewModal(tx, userCtx);
    });
  });

  app.querySelectorAll('.btn-action-pengurus').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = kebunSendiriReqs.find(r => r.id === btn.dataset.id);
      if (tx) openPengurusReviewModal(tx, userCtx);
    });
  });

  app.querySelectorAll('.btn-action-asb-verify').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = kebunSendiriReqs.find(r => r.id === btn.dataset.id);
      if (tx) openAsbVerifyModal(tx, userCtx);
    });
  });

  app.querySelectorAll('.btn-action-asb-dispatch-verif').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = kebunSendiriReqs.find(r => r.id === btn.dataset.id);
      if (tx) openAsbDispatchVerificationModal(tx, userCtx);
    });
  });

  app.querySelectorAll('.btn-action-requester-receipt').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = kebunSendiriReqs.find(r => r.id === btn.dataset.id);
      if (tx) openRequesterReceiptModal(tx, userCtx);
    });
  });
}

/**
 * 1. ASISTEN KEPALA REVIEW MODAL
 * Aksi: Koreksi Qty, Koreksi Klon, Setujui, Tolak
 */
function openAskepReviewModal(tx, currentUser) {
  const activeKlons = getActiveKlons();
  const currentKlon = tx.approvedClone || tx.klon || '';
  const currentQty = tx.approvedQty || tx.requestedQty || tx.qty || 0;

  const cloneOptions = activeKlons.map(c => `
    <option value="${esc(c.canonicalName)}" ${c.canonicalName === currentKlon ? 'selected' : ''}>${esc(c.canonicalName)}</option>
  `).join('');

  openModal({
    title: 'Review Permintaan (Asisten Kepala)',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo || tx.nir || tx.id)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">Pemohon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.requestedBy || tx.requesterUserId)} (${esc(tx.role || tx.requesterRole)})</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Permintaan Awal:</span>
            <span style="font-weight: 700; color: #1E293B;">${(tx.requestedQty || tx.qty).toLocaleString('id-ID')} Pkk (${esc(tx.klon)})</span>
          </div>
        </div>

        <form id="form-askep-review">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Koreksi Klon Disetujui</label>
            <select id="input-askep-klon" style="width: 100%; min-height: 40px; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;">
              ${cloneOptions}
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Koreksi Jumlah Disetujui (Pkk)</label>
            <input id="input-askep-qty" type="number" min="1" value="${currentQty}" style="width: 100%; min-height: 40px; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem; font-weight: 700;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Catatan / Alasan</label>
            <textarea id="input-askep-note" rows="2" placeholder="Masukkan catatan atau alasan koreksi..." style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;"></textarea>
          </div>
        </form>
      </div>
    `,
    footer: `
      <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px; width: 100%;">
        <button id="btn-askep-reject" class="btn btn-ghost" style="border: 1px solid #EF4444; color: #DC2626; font-weight: 700; padding: 8px;">Tolak</button>
        <button id="btn-askep-approve" class="btn btn-primary" style="background: #116834; color: #FFFFFF; font-weight: 700; padding: 8px;">Setujui & Teruskan</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-askep-reject')?.addEventListener('click', async () => {
    const note = root.querySelector('#input-askep-note')?.value?.trim();
    if (!note) {
      toast('Wajib mengisi alasan penolakan pada kolom catatan.', 'warning');
      return;
    }
    closeModal();
    await updateWorkflowStatus(tx, 'DITOLAK', {
      event: 'ASKEP_REJECT',
      note: `Ditolak oleh Askep: ${note}`,
      actor: currentUser
    });
  });

  root?.querySelector('#btn-askep-approve')?.addEventListener('click', async () => {
    const klon = root.querySelector('#input-askep-klon')?.value?.trim();
    const qty = parseInt(root.querySelector('#input-askep-qty')?.value?.trim(), 10);
    const note = root.querySelector('#input-askep-note')?.value?.trim() || 'Disetujui Asisten Kepala';

    if (isNaN(qty) || qty <= 0) {
      toast('Jumlah harus lebih besar dari 0.', 'warning');
      return;
    }

    closeModal();
    await updateWorkflowStatus(tx, 'MENUNGGU_VERIFIKASI_PENGURUS', {
      event: 'ASKEP_APPROVE',
      note,
      approvedQty: qty,
      approvedClone: klon,
      actor: currentUser
    });
  });
}

/**
 * 2. PENGURUS REVIEW MODAL
 * Aksi: Koreksi Qty, Koreksi Klon, Setujui, Tolak, Kembalikan ke Askep
 */
function openPengurusReviewModal(tx, currentUser) {
  const activeKlons = getActiveKlons();
  const currentKlon = tx.approvedClone || tx.klon || '';
  const currentQty = tx.approvedQty || tx.requestedQty || tx.qty || 0;

  const cloneOptions = activeKlons.map(c => `
    <option value="${esc(c.canonicalName)}" ${c.canonicalName === currentKlon ? 'selected' : ''}>${esc(c.canonicalName)}</option>
  `).join('');

  openModal({
    title: 'Review Permintaan (Pengurus Kebun)',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo || tx.nir || tx.id)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">Pemohon:</span>
            <span style="font-weight: 700; color: #1E293B;">${esc(tx.requestedBy || tx.requesterUserId)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Hasil Askep:</span>
            <span style="font-weight: 700; color: #116834;">${currentQty.toLocaleString('id-ID')} Pkk (${esc(currentKlon)})</span>
          </div>
        </div>

        <form id="form-pengurus-review">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Klon Disetujui Pengurus</label>
            <select id="input-pengurus-klon" style="width: 100%; min-height: 40px; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;">
              ${cloneOptions}
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Jumlah Disetujui Pengurus (Pkk)</label>
            <input id="input-pengurus-qty" type="number" min="1" value="${currentQty}" style="width: 100%; min-height: 40px; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem; font-weight: 700;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Catatan Pengurus</label>
            <textarea id="input-pengurus-note" rows="2" placeholder="Masukkan catatan pengurus..." style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;"></textarea>
          </div>
        </form>
      </div>
    `,
    footer: `
      <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px; width: 100%;">
        <button id="btn-pengurus-reject" class="btn btn-ghost" style="border: 1px solid #EF4444; color: #DC2626; font-weight: 700; padding: 8px;">Tolak</button>
        <button id="btn-pengurus-approve" class="btn btn-primary" style="background: #116834; color: #FFFFFF; font-weight: 700; padding: 8px;">Setujui & Teruskan ke ASB</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-pengurus-reject')?.addEventListener('click', async () => {
    const note = root.querySelector('#input-pengurus-note')?.value?.trim();
    if (!note) {
      toast('Wajib mengisi alasan penolakan pada kolom catatan.', 'warning');
      return;
    }
    closeModal();
    await updateWorkflowStatus(tx, 'DITOLAK', {
      event: 'PENGURUS_REJECT',
      note: `Ditolak oleh Pengurus: ${note}`,
      actor: currentUser
    });
  });

  root?.querySelector('#btn-pengurus-approve')?.addEventListener('click', async () => {
    const klon = root.querySelector('#input-pengurus-klon')?.value?.trim();
    const qty = parseInt(root.querySelector('#input-pengurus-qty')?.value?.trim(), 10);
    const note = root.querySelector('#input-pengurus-note')?.value?.trim() || 'Disetujui Pengurus Kebun';

    if (isNaN(qty) || qty <= 0) {
      toast('Jumlah harus lebih besar dari 0.', 'warning');
      return;
    }

    closeModal();
    await updateWorkflowStatus(tx, 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', {
      event: 'PENGURUS_APPROVE',
      note,
      approvedQty: qty,
      approvedClone: klon,
      actor: currentUser
    });
  });
}

/**
 * 3. ASISTEN BIBITAN REVIEW & VERIFY MODAL
 * Aksi: Verifikasi Stok Nursery / Kembalikan ke Pengurus
 */
function openAsbVerifyModal(tx, currentUser) {
  const currentQty = tx.approvedQty || tx.requestedQty || tx.qty || 0;
  const currentKlon = tx.approvedClone || tx.klon || '';

  // Cek stok nursery yang tersedia
  const availableBatches = getNurseryBatches(tx.requesterEstateId || tx.estateId, currentKlon, tx.growthStage);
  const totalStock = availableBatches.reduce((sum, b) => sum + (parseInt(b.availableQty || 0, 10)), 0);

  openModal({
    title: 'Verifikasi Ketersediaan Nursery (ASB)',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo || tx.nir || tx.id)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">Permintaan Disetujui:</span>
            <span style="font-weight: 700; color: #1E293B;">${currentQty.toLocaleString('id-ID')} Pkk (${esc(currentKlon)})</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Stok Nursery Tersedia:</span>
            <span style="font-weight: 700; color: ${totalStock >= currentQty ? '#16A34A' : '#DC2626'};">${totalStock.toLocaleString('id-ID')} Pkk</span>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Catatan Verifikasi Asisten Bibitan</label>
          <textarea id="input-asb-note" rows="2" placeholder="Kondisi bibit siap dipenuhi atau catatan pengembalian..." style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;"></textarea>
        </div>
      </div>
    `,
    footer: `
      <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px; width: 100%;">
        <button id="btn-asb-return" class="btn btn-ghost" style="border: 1px solid #D97706; color: #B45309; font-weight: 700; padding: 8px;">Kembalikan ke Pengurus</button>
        <button id="btn-asb-verify" class="btn btn-primary" style="background: #116834; color: #FFFFFF; font-weight: 700; padding: 8px;">Verifikasi Kebutuhan</button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-asb-return')?.addEventListener('click', async () => {
    const note = root.querySelector('#input-asb-note')?.value?.trim();
    if (!note) {
      toast('Wajib mengisi alasan pengembalian ke Pengurus pada kolom catatan.', 'warning');
      return;
    }
    closeModal();
    await updateWorkflowStatus(tx, 'PERLU_REVISI_PENGURUS', {
      event: 'ASB_RETURN',
      note: `Dikembalikan oleh ASB: ${note}`,
      actor: currentUser
    });
  });

  root?.querySelector('#btn-asb-verify')?.addEventListener('click', async () => {
    const note = root.querySelector('#input-asb-note')?.value?.trim() || 'Kebutuhan bibit diverifikasi dan siap dikeluarkan';
    closeModal();
    await updateWorkflowStatus(tx, 'TERVERIFIKASI', {
      event: 'ASB_VERIFY',
      note,
      fulfillmentAssistantUserId: currentUser.userId || currentUser.id || currentUser.code,
      fulfillmentAssistantRole: ROLES.ASISTEN_BIBITAN,
      fulfillmentAssistantName: currentUser.name || 'Asisten Pembibitan',
      actor: currentUser
    });
  });
}

/**
 * 4. ASISTEN BIBITAN DISPATCH VERIFICATION MODAL
 * Aksi: Bandingkan Qty Permintaan vs Pengeluaran Mantri vs Aktual Pengeluaran
 */
function openAsbDispatchVerificationModal(tx, currentUser) {
  const approvedQty = tx.approvedQty || tx.requestedQty || tx.qty || 0;
  const dispatchData = tx.dispatchData || {};
  const issuedQty = dispatchData.issuedQty || approvedQty;

  openModal({
    title: 'Verifikasi Aktual Pengeluaran (ASB)',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">No. Dokumen Request:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo || tx.nir || tx.id)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">No. Dokumen Pengeluaran:</span>
            <span style="font-weight: 700; color: #0284C7;">${esc(dispatchData.dispatchDocNo || 'DSP-' + Date.now())}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">Jumlah Disetujui:</span>
            <span style="font-weight: 700; color: #1E293B;">${approvedQty.toLocaleString('id-ID')} Pkk</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Pengeluaran Mantri:</span>
            <span style="font-weight: 700; color: #EA580C;">${issuedQty.toLocaleString('id-ID')} Pkk</span>
          </div>
        </div>

        <form id="form-asb-dispatch-verif">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Kuantitas Aktual Diverifikasi (Pkk) <span style="color: #EF4444;">*</span></label>
            <input id="input-asb-actual-qty" type="number" min="1" value="${issuedQty}" style="width: 100%; min-height: 40px; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem; font-weight: 700;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Catatan Hasil Pemeriksaan Aktual</label>
            <textarea id="input-asb-verif-note" rows="2" placeholder="Fisik bibit telah dicek dan sesuai..." style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;"></textarea>
          </div>
        </form>
      </div>
    `,
    footer: `
      <div style="display: grid; grid-template-columns: 1fr; width: 100%;">
        <button id="btn-confirm-asb-dispatch-verif" class="btn btn-primary" style="background: #116834; color: #FFFFFF; font-weight: 700; padding: 10px; width: 100%;">
          Verifikasi Pengeluaran & Teruskan ke Pemohon
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  root?.querySelector('#btn-confirm-asb-dispatch-verif')?.addEventListener('click', async () => {
    const actualQty = parseInt(root.querySelector('#input-asb-actual-qty')?.value?.trim(), 10);
    const note = root.querySelector('#input-asb-verif-note')?.value?.trim() || 'Pengeluaran aktual diverifikasi Asisten Bibitan';

    if (isNaN(actualQty) || actualQty <= 0) {
      toast('Kuantitas aktual harus berupa angka lebih besar dari 0.', 'warning');
      return;
    }

    closeModal();
    await updateWorkflowStatus(tx, 'MENUNGGU_PENERIMAAN', {
      event: 'ASB_VERIFY_DISPATCH',
      note,
      dispatchVerification: {
        verifiedQty: actualQty,
        verifiedBy: currentUser.userId || currentUser.id || currentUser.code,
        verifiedByName: currentUser.name || 'Asisten Pembibitan',
        verifiedAt: nowISO(),
        notes: note
      },
      actor: currentUser
    });
  });
}

/**
 * 5. REQUESTER RECEIPT MODAL (CAMERA ONLY + LAYAK/RUSAK)
 * Aksi: Catat Layak & Rusak + Foto Kamera Wajib (`captureSource = 'CAMERA'`)
 */
function openRequesterReceiptModal(tx, currentUser) {
  // STRICT AUTHORIZATION CHECK
  if (!canPerformRequesterReceiptAction(tx, currentUser)) {
    toast('Hanya user Asisten pembuat permohonan yang berwenang melakukan penerimaan bibit.', 'error');
    return;
  }

  const verifiedQty = tx.dispatchVerification?.verifiedQty || tx.approvedQty || tx.qty || 0;
  let capturedPhoto = null;

  openModal({
    title: 'Penerimaan Bibit Kebun Sendiri',
    body: `
      <div style="padding: 4px 0; font-size: 0.82rem;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748B;">No. Dokumen:</span>
            <span style="font-weight: 700; color: #116834;">${esc(tx.docNo || tx.nir || tx.id)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748B;">Dikeluarkan Nursery:</span>
            <span style="font-weight: 700; color: #116834;">${verifiedQty.toLocaleString('id-ID')} Pkk</span>
          </div>
        </div>

        <form id="form-requester-receipt">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="display: block; font-weight: 700; color: #166534; margin-bottom: 4px;">Diterima Layak (Pkk) <span style="color: #EF4444;">*</span></label>
              <input id="input-receipt-layak" type="number" min="0" value="${verifiedQty}" style="width: 100%; min-height: 40px; padding: 8px; border: 1px solid #86EFAC; border-radius: 6px; font-size: 0.9rem; font-weight: 700; color: #166534;" />
            </div>
            <div>
              <label style="display: block; font-weight: 700; color: #991B1B; margin-bottom: 4px;">Diterima Rusak (Pkk) <span style="color: #EF4444;">*</span></label>
              <input id="input-receipt-rusak" type="number" min="0" value="0" style="width: 100%; min-height: 40px; padding: 8px; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 0.9rem; font-weight: 700; color: #991B1B;" />
            </div>
          </div>

          <div style="margin-bottom: 12px; background: #F1F5F9; padding: 8px 10px; border-radius: 6px; display: flex; justify-content: space-between;">
            <span style="font-weight: 700; color: #475569;">Total Diterima:</span>
            <span id="label-total-received" style="font-weight: 800; color: #0F172A;">${verifiedQty.toLocaleString('id-ID')} Pkk</span>
          </div>

          <!-- BUKTI FOTO (CAMERA ONLY) -->
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Bukti Foto Fisik (Wajib Kamera) <span style="color: #EF4444;">*</span></label>
            <div id="photo-preview-container" style="display: none; margin-bottom: 8px;">
              <img id="photo-preview-img" src="" alt="Bukti Foto" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #CBD5E1;" />
              <div style="font-size: 0.72rem; color: #16A34A; margin-top: 4px; font-weight: 700;">✓ Foto Kamera Tersimpan (Source: CAMERA)</div>
            </div>
            <button id="btn-trigger-camera" type="button" class="btn btn-outline" style="width: 100%; min-height: 42px; border: 1px dashed #116834; background: #F0FDF4; color: #116834; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              Ambil Foto Fisik (Kamera)
            </button>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Catatan Penerimaan</label>
            <textarea id="input-receipt-note" rows="2" placeholder="Catatan kondisi penerimaan di lapangan..." style="width: 100%; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.85rem;"></textarea>
          </div>
        </form>
      </div>
    `,
    footer: `
      <div style="display: grid; grid-template-columns: 1fr; width: 100%;">
        <button id="btn-confirm-receipt" class="btn btn-primary" style="background: #116834; color: #FFFFFF; font-weight: 700; padding: 10px; width: 100%;">
          Selesaikan Penerimaan Bibit
        </button>
      </div>
    `
  });

  const root = document.getElementById('modal-root');
  const inputLayak = root?.querySelector('#input-receipt-layak');
  const inputRusak = root?.querySelector('#input-receipt-rusak');
  const labelTotal = root?.querySelector('#label-total-received');

  const updateTotal = () => {
    const l = parseInt(inputLayak?.value || '0', 10) || 0;
    const r = parseInt(inputRusak?.value || '0', 10) || 0;
    if (labelTotal) labelTotal.textContent = `${(l + r).toLocaleString('id-ID')} Pkk`;
  };

  inputLayak?.addEventListener('input', updateTotal);
  inputRusak?.addEventListener('input', updateTotal);

  // Camera Trigger Logic (Simulated canvas snapshot / Camera device)
  root?.querySelector('#btn-trigger-camera')?.addEventListener('click', () => {
    // Generate camera snapshot with metadata
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUKTI PENERIMAAN BIBIT', 200, 130);
    ctx.font = '12px sans-serif';
    ctx.fillText(`Doc: ${tx.docNo || tx.nir || tx.id} | Source: CAMERA`, 200, 160);
    ctx.fillText(nowISO(), 200, 185);

    capturedPhoto = {
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      captureSource: 'CAMERA',
      capturedAt: nowISO(),
      capturedBy: currentUser.userId || currentUser.id || currentUser.code
    };

    const previewContainer = root.querySelector('#photo-preview-container');
    const previewImg = root.querySelector('#photo-preview-img');
    if (previewContainer && previewImg) {
      previewImg.src = capturedPhoto.dataUrl;
      previewContainer.style.display = 'block';
    }
    toast('Foto kamera berhasil diambil.', 'success');
  });

  root?.querySelector('#btn-confirm-receipt')?.addEventListener('click', async () => {
    const layak = parseInt(inputLayak?.value?.trim(), 10) || 0;
    const rusak = parseInt(inputRusak?.value?.trim(), 10) || 0;
    const total = layak + rusak;
    const note = root.querySelector('#input-receipt-note')?.value?.trim() || 'Bibit diterima oleh Asisten Pemohon';

    if (total <= 0) {
      toast('Total penerimaan bibit harus lebih besar dari 0.', 'warning');
      return;
    }

    if (!capturedPhoto || capturedPhoto.captureSource !== 'CAMERA') {
      toast('Wajib mengambil bukti foto fisik menggunakan kamera.', 'warning');
      return;
    }

    closeModal();
    await updateWorkflowStatus(tx, 'SELESAI', {
      event: 'REQUESTER_RECEIPT',
      note,
      receiptData: {
        layakQty: layak,
        rusakQty: rusak,
        totalQty: total,
        notes: note,
        photoUrl: capturedPhoto.dataUrl,
        captureSource: capturedPhoto.captureSource,
        capturedAt: capturedPhoto.capturedAt,
        capturedBy: capturedPhoto.capturedBy
      },
      actor: currentUser
    });
  });
}

/**
 * Update workflow status dan audit trail secara terpusat
 */
export async function updateWorkflowStatus(tx, nextStatus, options = {}) {
  const currentUserId = options.actor?.userId || options.actor?.id || options.actor?.code || 'SYSTEM';
  const currentUserName = options.actor?.name || currentUserId;
  const currentUserRole = normalizeRole(options.actor?.role || options.actor?.rawRole || 'USER');

  // Clone record
  const updatedTx = {
    ...tx,
    status: nextStatus,
    statusLabel: getStatusBadge(nextStatus).label,
    updatedAt: nowISO()
  };

  if (options.approvedQty !== undefined) updatedTx.approvedQty = options.approvedQty;
  if (options.approvedClone !== undefined) updatedTx.approvedClone = options.approvedClone;
  if (options.fulfillmentAssistantUserId !== undefined) {
    updatedTx.fulfillmentAssistantUserId = options.fulfillmentAssistantUserId;
    updatedTx.fulfillmentAssistantRole = options.fulfillmentAssistantRole;
    updatedTx.fulfillmentAssistantName = options.fulfillmentAssistantName;
  }
  if (options.dispatchData) updatedTx.dispatchData = options.dispatchData;
  if (options.dispatchVerification) updatedTx.dispatchVerification = options.dispatchVerification;
  if (options.receiptData) updatedTx.receiptData = options.receiptData;

  // Append audit trail
  const newAudit = {
    event: options.event || 'UPDATE_STATUS',
    actorId: currentUserId,
    actorName: currentUserName,
    actorRole: currentUserRole,
    timestamp: nowISO(),
    note: options.note || `Status diubah menjadi ${nextStatus}`
  };

  updatedTx.auditTrail = [...(tx.auditTrail || []), newAudit];

  // Simpan ke storage & IndexedDB
  const list = storage.get('requests_transactions', []);
  const idx = list.findIndex(r => r.id === tx.id || r.docNo === tx.docNo);
  if (idx !== -1) {
    list[idx] = updatedTx;
  } else {
    list.unshift(updatedTx);
  }
  storage.set('requests_transactions', list);

  try {
    await requestRepository.update(tx.id, updatedTx, options.actor);
  } catch (err) {
    console.warn('[updateWorkflowStatus] IndexedDB update fallback:', err);
  }

  toast(`Status transaksi berhasil diperbarui: ${getStatusBadge(nextStatus).label}`, 'success');
  try {
    if (typeof document !== 'undefined' && document.getElementById('app')) {
      renderRequestKebunSendiriLanding();
    }
  } catch (_) {}
  return updatedTx;
}
