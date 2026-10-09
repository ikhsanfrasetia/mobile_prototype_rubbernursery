/**
 * js/modules/verification/verification-landing.js
 * Workspace Verifikasi Data Asisten Bibitan
 * Sesuai Desain Acuan 10-Screen Mobile Reference
 * 
 * Alur Views:
 * 1. MODULE_GRID (Screen 3): 10 Modul Card Grid + CTA Tinjau Data Hari Ini
 * 2. TRANSACTION_LIST (Screen 5): Daftar Transaksi per Modul + Filter Tanggal
 * 3. TRANSACTION_DETAIL (Screen 6): Detail Transaksi + [ Kembalikan ] [ Setujui ]
 * 4. TINJAU_FILTER (Screen 7): Tinjau Data Hari Ini - Form Filter
 * 5. TINJAU_SUMMARY (Screen 8 / 10): Tinjau Data Hari Ini - Ringkasan 10 Modul & Kirim Data
 * 6. TINJAU_DETAIL (Screen 9): Detail Transaksi Terverifikasi (Read-only)
 */

import { session } from '../../core/session.js';
import { openDrawer } from '../../components/drawer.js';
import { openModal, closeModal } from '../../components/modal.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { todayDDMMYYYY, esc } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, ROLES } from '../../core/user-context.js';
import { renderAsbBottomNav, attachAsbBottomNavEvents } from '../../components/bottom-nav-asb.js';
import { renderVerifikasiSummaryCardHtml } from './asb-summary-cards.js';
import {
  VERIFICATION_10_MODULES,
  VERIFICATION_STATUS,
  REFERENCE_TYPE_LABELS,
  getActionableRecordsForAsb,
  getVerificationRecordsByScope,
  getVerifiedTransactionsByScope,
  get10ModulesSummary,
  canSubmitFinalVerificationToServer,
  submitFinalVerificationToServer,
  approveVerification,
  returnVerification,
  findSourceRecord,
  getVerificationDetailData
} from './verification-manager.js';

// State Halaman
let currentVerifView = 'MODULE_GRID'; // 'MODULE_GRID' | 'TRANSACTION_LIST' | 'TRANSACTION_DETAIL' | 'TINJAU_FILTER' | 'TINJAU_SUMMARY' | 'TINJAU_DETAIL'
let activeModuleId = null; // e.g. 'TIDAK_HADIR', 'OKULASI', etc.
let selectedTxItem = null; // Transaksi yang dibuka di detail (berisi normalizedData)
let activeFilterDate = todayDDMMYYYY();
let tinjauFilter = {
  date: todayDDMMYYYY(),
  estateId: '',
  divisionId: ''
};

const MODULE_ICONS = {
  team: `
    <svg viewBox="2 3 26 22" width="56" height="56" fill="#116834">
      <circle cx="11" cy="9" r="4.3" fill="#116834"/>
      <path d="M4 23 C4 18 7.5 15.5 11 15.5 C14.5 15.5 18 18 18 23 Z" fill="#116834"/>
      <circle cx="21" cy="10.5" r="3.5" fill="#116834"/>
      <path d="M16.8 23 C17 19.8 18.8 17.8 21 17.8 C23.5 17.8 26.5 19.8 26.5 23 Z" fill="#116834"/>
    </svg>
  `,
  documentPlus: `
    <svg viewBox="3 2 26 27" width="56" height="56" fill="#116834">
      <rect x="5" y="4" width="22" height="24" rx="4.5" fill="#116834"/>
      <line x1="9" y1="12" x2="19" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="16" x2="19" y2="16" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="23" cy="7" r="4.2" fill="#116834" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="23" y1="4.8" x2="23" y2="9.2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20.8" y1="7" x2="25.2" y2="7" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  sprout: `
    <svg viewBox="2 1.5 28 19" width="56" height="56" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `,
  scissors: `
    <svg viewBox="2 1.5 28 19" width="56" height="56" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `,
  documentSearch: `
    <svg viewBox="3 2 26 27" width="56" height="56" fill="#116834">
      <rect x="5" y="4" width="22" height="24" rx="4.5" fill="#116834"/>
      <line x1="9" y1="12" x2="19" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="16" x2="19" y2="16" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="23" cy="7" r="4.2" fill="#116834" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="23" y1="4.8" x2="23" y2="9.2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20.8" y1="7" x2="25.2" y2="7" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  leafCheck: `
    <svg viewBox="2 1.5 28 19" width="56" height="56" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `,
  tree: `
    <svg viewBox="2 2 28 28" width="56" height="56" fill="#116834">
      <path d="M14 26 C14 26 14 13 14 9 C14 5.5 17.5 3 22 2.5 C22.5 7 19.5 10.5 15.8 11 C15.8 13 15.8 17 15.8 26 Z" fill="#116834"/>
      <path d="M14 16.5 C10.5 16.5 6.5 14 6 10 C10 9.5 13.5 12 14 15 Z" fill="#116834"/>
      <circle cx="14" cy="24" r="2.5" fill="#116834"/>
    </svg>
  `,
  entres: `
    <svg viewBox="2 2 28 28" width="56" height="56" fill="#116834">
      <path d="M14 26 C14 26 14 13 14 9 C14 5.5 17.5 3 22 2.5 C22.5 7 19.5 10.5 15.8 11 C15.8 13 15.8 17 15.8 26 Z" fill="#116834"/>
      <path d="M14 16.5 C10.5 16.5 6.5 14 6 10 C10 9.5 13.5 12 14 15 Z" fill="#116834"/>
      <circle cx="14" cy="24" r="2.5" fill="#116834"/>
    </svg>
  `,
  material: `
    <svg viewBox="2 1.5 28 19" width="56" height="56" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `,
  plantCare: `
    <svg viewBox="3 2 26 27" width="56" height="56" fill="#116834">
      <rect x="5" y="4" width="22" height="24" rx="4.5" fill="#116834"/>
      <line x1="9" y1="12" x2="19" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="16" x2="19" y2="16" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="23" cy="7" r="4.2" fill="#116834" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="23" y1="4.8" x2="23" y2="9.2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20.8" y1="7" x2="25.2" y2="7" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  dispatch: `
    <svg viewBox="2 1.5 28 19" width="56" height="56" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `
};

export function renderVerificationLanding() {
  const app = document.getElementById('main-content') || document.getElementById('app');
  if (!app) return;

  const currentUser = session.getUser ? session.getUser() : (session.get ? session.get() : null);
  const userCtx = getCurrentUserContext() || resolveUserContext(currentUser);

  if (userCtx) {
    tinjauFilter.date = todayDDMMYYYY();
    tinjauFilter.estateId = userCtx.estateName || userCtx.estateId || '';
    tinjauFilter.divisionId = userCtx.divisionName || userCtx.divisionId || '';
  }

  if (currentVerifView === 'MODULE_GRID') {
    renderModuleGridView(app, userCtx);
  } else if (currentVerifView === 'TRANSACTION_LIST') {
    renderTransactionListView(app, userCtx);
  } else if (currentVerifView === 'TRANSACTION_DETAIL') {
    renderTransactionDetailView(app, userCtx);
  } else if (currentVerifView === 'TINJAU_FILTER') {
    renderTinjauSummaryView(app, userCtx);
  } else if (currentVerifView === 'TINJAU_SUMMARY') {
    renderTinjauSummaryView(app, userCtx);
  } else if (currentVerifView === 'TINJAU_DETAIL') {
    renderTinjauDetailView(app, userCtx);
  }
}

/**
 * SCREEN 3: Grid 10 Modul Verifikasi
 */
function renderModuleGridView(app, userCtx) {
  const actionableList = getActionableRecordsForAsb(userCtx);

  const moduleCards = VERIFICATION_10_MODULES.map((mod) => {
    const modCount = actionableList.filter(item => mod.types.includes(item.referenceType) || item.moduleCategory === mod.id).length;
    const iconSvg = MODULE_ICONS[mod.iconName] || MODULE_ICONS.sprout;

    return `
      <button class="beranda-menu-card verif-grid-card" data-module-id="${mod.id}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${iconSvg}</div>
        <div class="beranda-card-title">${mod.label}</div>
        ${modCount > 0 ? `
          <span style="position: absolute; top: 6px; right: 6px; background: #EF4444; color: #FFFFFF; font-size: 0.62rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); z-index: 5;">
            ${modCount}
          </span>
        ` : ''}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page verif-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="verif-drawer-btn" type="button" aria-label="Menu" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.01em;">Verifikasi</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="verif-refresh-btn" type="button" aria-label="Segarkan" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
          <button id="verif-notif-btn" type="button" aria-label="Notifikasi" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- BODY: VERIFIKASI SUMMARY CARD + 10 MODULES GRID -->
      <main class="beranda-body" style="flex: 1; min-height: 0; overflow-y: auto; padding: 12px 10px 14px; display: flex; flex-direction: column; gap: 10px;">
        ${renderVerifikasiSummaryCardHtml(userCtx)}

        <div class="beranda-grid">
          ${moduleCards}
        </div>

        <!-- CTA TINJAU DATA HARI INI -->
        <div style="margin-top: auto; padding-top: 10px;">
          <button id="btn-open-tinjau" type="button" style="width: 100%; height: 42px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.84rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Tinjau Data Hari Ini</span>
          </button>
        </div>
      </main>

      <!-- BOTTOM NAVIGATION (4 ITEMS) -->
      ${renderAsbBottomNav('verifikasi')}

    </div>
  `;

  // Attach drawer
  app.querySelector('#verif-drawer-btn')?.addEventListener('click', openDrawer);

  // Refresh
  app.querySelector('#verif-refresh-btn')?.addEventListener('click', () => {
    toast('Data verifikasi diperbarui', 'info');
    renderVerificationLanding();
  });

  // Notif
  app.querySelector('#verif-notif-btn')?.addEventListener('click', () => {
    toast('Tidak ada notifikasi baru', 'info');
  });

  // Module card clicks -> open Screen 5
  app.querySelectorAll('.verif-grid-card').forEach((card) => {
    card.addEventListener('click', () => {
      activeModuleId = card.dataset.moduleId;
      currentVerifView = 'TRANSACTION_LIST';
      renderVerificationLanding();
    });
  });

  // Open Tinjau Data -> Langsung Final Review (TINJAU_SUMMARY)
  app.querySelector('#btn-open-tinjau')?.addEventListener('click', () => {
    currentVerifView = 'TINJAU_SUMMARY';
    renderVerificationLanding();
  });

  attachAsbBottomNavEvents(app);
}

/**
 * SCREEN 5: Verifikasi - Daftar Transaksi per Modul
 */
function renderTransactionListView(app, userCtx) {
  const currentMod = VERIFICATION_10_MODULES.find(m => m.id === activeModuleId) || VERIFICATION_10_MODULES[0];
  const allRecords = getVerificationRecordsByScope(userCtx);

  // Filter items matching this module
  const combinedList = allRecords.filter(item => currentMod.types.includes(item.referenceType) || item.moduleCategory === currentMod.id);

  app.innerHTML = `
    <div class="page verif-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-back-to-grid" type="button" aria-label="Kembali" style="background: transparent; border: none; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0;">${currentMod.label}</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="verif-refresh-btn2" type="button" aria-label="Segarkan" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
          <button id="verif-notif-btn2" type="button" aria-label="Notifikasi" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- DATE FILTER SELECTOR -->
      <div style="padding: 12px 14px 6px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 12px; background: #FFFFFF;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 700; color: #111827;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#116834" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${activeFilterDate}</span>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" stroke-width="2" fill="none" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <!-- TRANSACTION LIST -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;">
        ${combinedList.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 32px 16px; text-align: center; color: #64748B;">
            <div style="font-size: 1.8rem; margin-bottom: 8px;">📋</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: #1E293B;">Belum Ada Transaksi ${currentMod.label}</div>
            <div style="font-size: 0.74rem; margin-top: 4px;">Transaksi dari Mantri akan muncul di sini setelah dikirim via Central Hub.</div>
          </div>
        ` : combinedList.map(item => {
          const isVerified = item.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI || item.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI;
          const isReturned = item.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN || item.currentStatus === 'DIKEMBALIKAN' || item.currentStatus === 'REVISION' || item.rawRecord?.status === 'DIKEMBALIKAN';
          
          let badgeText = 'Menunggu';
          let badgeBg = '#FEF3C7';
          let badgeColor = '#92400E';

          if (isVerified) {
            badgeText = 'Terverifikasi';
            badgeBg = '#DEF7EC';
            badgeColor = '#03543F';
          } else if (isReturned) {
            badgeText = 'Dikembalikan';
            badgeBg = '#FEF2F2';
            badgeColor = '#DC2626';
          }

          const docNo = item.referenceDocNo || item.docNo || item.id;
          const dateStr = item.date ? String(item.date).substring(0, 10) : activeFilterDate;
          const workerName = item.submittedByName || item.rawRecord?.mantri || item.rawRecord?.actorName || 'Mantri Bibitan';
          const summaryText = item.normalizedData?.summary || item.summary || '';

          return `
            <div class="verif-tx-item" data-ref-type="${item.referenceType}" data-ref-id="${item.referenceId}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.02); gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                <div style="width: 36px; height: 36px; border-radius: 8px; background: #E8F5E9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#116834">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  </svg>
                </div>
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 0.82rem; font-weight: 800; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${esc(docNo)}
                  </div>
                  ${summaryText ? `
                    <div style="font-size: 0.72rem; font-weight: 600; color: #334155; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${esc(summaryText)}
                    </div>
                  ` : ''}
                  <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">
                    ${esc(workerName)} &bull; ${esc(dateStr)}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor};">
                  ${badgeText}
                </span>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2.2" fill="none">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          `;
        }).join('')}
      </main>

      <!-- BOTTOM NAVIGATION (4 ITEMS) -->
      ${renderAsbBottomNav('verifikasi')}

    </div>
  `;

  // Back button
  app.querySelector('#btn-back-to-grid')?.addEventListener('click', () => {
    currentVerifView = 'MODULE_GRID';
    renderVerificationLanding();
  });

  // Refresh
  app.querySelector('#verif-refresh-btn2')?.addEventListener('click', () => {
    toast('Data diperbarui', 'info');
    renderVerificationLanding();
  });

  // Click transaction -> Screen 6
  app.querySelectorAll('.verif-tx-item').forEach((card) => {
    card.addEventListener('click', () => {
      const refType = card.dataset.refType;
      const refId = card.dataset.refId;
      const target = combinedList.find(t => t.referenceType === refType && String(t.referenceId) === String(refId));
      if (target) {
        selectedTxItem = target;
        currentVerifView = 'TRANSACTION_DETAIL';
        renderVerificationLanding();
      }
    });
  });

  attachAsbBottomNavEvents(app);
}

/**
 * SCREEN 6: Verifikasi - Detail Transaksi
 */
function renderTransactionDetailView(app, userCtx) {
  if (!selectedTxItem) {
    currentVerifView = 'MODULE_GRID';
    renderVerificationLanding();
    return;
  }

  // Gunakan normalizedData yang sudah terlampir pada selectedTxItem (Single Source of Truth)
  const norm = selectedTxItem.normalizedData || getVerificationDetailData(selectedTxItem.rawRecord, userCtx, selectedTxItem.referenceType);
  const currentMod = VERIFICATION_10_MODULES.find(m => m.id === selectedTxItem.moduleCategory || m.types.includes(selectedTxItem.referenceType)) || VERIFICATION_10_MODULES[0];
  const docNo = selectedTxItem.referenceDocNo || selectedTxItem.docNo || selectedTxItem.id;
  const isVerified = selectedTxItem.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI || selectedTxItem.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI;
  const isReturned = selectedTxItem.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN || selectedTxItem.currentStatus === 'DIKEMBALIKAN' || selectedTxItem.currentStatus === 'REVISION' || selectedTxItem.rawRecord?.status === 'DIKEMBALIKAN' || selectedTxItem.rawRecord?.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN;

  let badgeText = 'Menunggu';
  let badgeBg = '#FEF3C7';
  let badgeColor = '#92400E';

  if (isVerified) {
    badgeText = 'Terverifikasi';
    badgeBg = '#DEF7EC';
    badgeColor = '#03543F';
  } else if (isReturned) {
    badgeText = 'Dikembalikan';
    badgeBg = '#FEF2F2';
    badgeColor = '#DC2626';
  }

  const returnReasonText = selectedTxItem.returnReason || selectedTxItem.rawRecord?.returnReason || selectedTxItem.latestVerification?.returnReason || norm.returnReason;
  const dateStr = selectedTxItem.date ? String(selectedTxItem.date).substring(0, 10) : activeFilterDate;
  const workerName = selectedTxItem.submittedByName || selectedTxItem.rawRecord?.mantri || selectedTxItem.rawRecord?.actorName || userCtx?.name || 'Mantri';

  // Render Rincian Data dinamis dari normalized fields (Zero hardcoding)
  const detailRows = (norm.fields || []).map(f => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
      <span style="color: #64748B;">${esc(f.label)}</span>
      <strong style="color: ${f.highlight ? '#116834' : '#0F172A'}; text-align: right;">${f.value}</strong>
    </div>
  `).join('');

  app.innerHTML = `
    <div class="page verif-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-back-to-list" type="button" aria-label="Kembali" style="background: transparent; border: none; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0;">Detail Transaksi</h1>
        </div>
      </header>

      <!-- BODY -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- CARD HEADER DOKUMEN -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #111827;">${esc(norm.title || currentMod.label)}</div>
            <div style="font-size: 0.74rem; font-weight: 700; color: #116834; margin-top: 1px;">${esc(docNo)}</div>
            <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">${esc(workerName)} &bull; ${esc(dateStr)}</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor};">
            ${badgeText}
          </span>
        </div>

        <!-- CATATAN PENGEMBALIAN JIKA ADA -->
        ${returnReasonText ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.82rem; font-weight: 800; color: #DC2626; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#DC2626" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Catatan Pengembalian
            </div>
            <div style="font-size: 0.78rem; color: #991B1B; line-height: 1.4;">
              ${esc(returnReasonText)}
            </div>
          </div>
        ` : ''}

        <!-- INFORMASI UMUM -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size: 0.84rem; font-weight: 800; color: #111827; margin-bottom: 10px; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px;">
            Informasi Umum
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem;">
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Tanggal</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(dateStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Kebun</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(selectedTxItem.estateId || userCtx?.estateName || 'Tanah Besih')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Divisi</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(selectedTxItem.divisionId || userCtx?.divisionName || 'Divisi I')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Mantri</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(workerName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Nomor Dokumen</span>
              <span style="color: #116834; font-weight: 700;">${esc(docNo)}</span>
            </div>
          </div>
        </div>

        <!-- RINCIAN DATA -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size: 0.84rem; font-weight: 800; color: #111827; margin-bottom: 10px; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px;">
            Rincian Data
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem;">
            ${detailRows}
          </div>
        </div>

        <!-- ACTION BUTTONS IF PENDING, OR STATUS NOTICE -->
        ${isReturned ? `
          <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px; text-align: center; color: #DC2626; font-size: 0.78rem; font-weight: 700; margin-top: 8px;">
            ⚠ Dokumen ini telah dikembalikan ke Mantri untuk perbaikan
          </div>
        ` : (isVerified ? `
          <div style="background: #DEF7EC; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px; text-align: center; color: #03543F; font-size: 0.78rem; font-weight: 700; margin-top: 8px;">
            ✓ Dokumen ini telah selesai diverifikasi
          </div>
        ` : `
          <div style="display: flex; gap: 10px; margin-top: 10px; padding-bottom: 10px;">
            ${selectedTxItem.referenceType !== 'TIDAK_HADIR' ? `
              <button id="btn-tx-return" type="button" style="flex: 1; height: 42px; background: #FFFFFF; border: 1.5px solid #EF4444; color: #DC2626; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
                Kembalikan
              </button>
            ` : ''}
            <button id="btn-tx-approve" type="button" style="flex: 1; height: 42px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
              Setujui
            </button>
          </div>
        `)}

      </main>

      <!-- BOTTOM NAVIGATION (4 ITEMS) -->
      ${renderAsbBottomNav('verifikasi')}

    </div>
  `;

  // Back button
  app.querySelector('#btn-back-to-list')?.addEventListener('click', () => {
    currentVerifView = 'TRANSACTION_LIST';
    renderVerificationLanding();
  });

  // Approve
  app.querySelector('#btn-tx-approve')?.addEventListener('click', () => {
    try {
      approveVerification({
        referenceType: selectedTxItem.referenceType,
        referenceId: selectedTxItem.referenceId,
        currentUser: userCtx
      });
      toast(`Dokumen ${docNo} berhasil disetujui`, 'success');
      currentVerifView = 'TRANSACTION_LIST';
      renderVerificationLanding();
    } catch (err) {
      toast(err.message || 'Gagal menyetujui dokumen', 'error');
    }
  });

  // Return
  app.querySelector('#btn-tx-return')?.addEventListener('click', () => {
    openModal({
      title: 'Kembalikan Hasil Pemeriksaan',
      body: `
        <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
          <p style="margin: 0 0 12px 0;">
            Kembalikan dokumen pemeriksaan <strong>${esc(docNo)}</strong> ke Mantri untuk perbaikan atau penyesuaian data.
          </p>
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Alasan Pengembalian (Wajib) <span style="color: #DC2626;">*</span></label>
            <textarea id="modal-return-reason" rows="3" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" placeholder="Jelaskan alasan pengembalian..."></textarea>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
            <button id="btn-confirm-return" type="button" style="flex: 1; height: 38px; background: #DC2626; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Kembalikan</button>
          </div>
        </div>
      `
    });

    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-confirm-return')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (btn?.disabled) return;
      const reason = document.getElementById('modal-return-reason')?.value || '';
      if (!reason.trim()) {
        toast('Alasan pengembalian wajib diisi.', 'error');
        return;
      }
      if (btn) btn.disabled = true;
      try {
        returnVerification({
          referenceType: selectedTxItem.referenceType,
          referenceId: selectedTxItem.referenceId,
          returnReason: reason.trim(),
          currentUser: userCtx
        });
        closeModal();
        toast(`Dokumen ${docNo} dikembalikan untuk revisi`, 'info');
        currentVerifView = 'TRANSACTION_LIST';
        renderVerificationLanding();
      } catch (err) {
        if (btn) btn.disabled = false;
        toast(err.message || 'Gagal mengembalikan dokumen', 'error');
      }
    });
  });

  attachAsbBottomNavEvents(app);
}

/**
 * SCREEN 7: Tinjau Data Hari Ini (Form Filter)
 */
function renderTinjauFilterView(app, userCtx) {
  app.innerHTML = `
    <div class="page verif-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-back-to-grid2" type="button" aria-label="Kembali" style="background: transparent; border: none; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0;">Tinjau Data Hari Ini</h1>
        </div>
      </header>

      <!-- BODY: FILTER FORM -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 16px;">
        
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 16px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          
          <!-- Periode Data -->
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #64748B; margin-bottom: 6px;">Periode Data</label>
            <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; background: #FFFFFF;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; font-weight: 700; color: #111827;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#116834" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${tinjauFilter.date}</span>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>

          <!-- Kebun -->
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #64748B; margin-bottom: 6px;">Kebun</label>
            <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; background: #FFFFFF;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; font-weight: 700; color: #111827;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#116834" stroke-width="2"><path d="M12 22V12 M12 12C12 7 8 4 8 4s-1 4 4 8z M12 12c0-5 4-8 4-8s1 4-4 8z"></path></svg>
                <span>${tinjauFilter.estateId}</span>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>

          <!-- Divisi -->
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #64748B; margin-bottom: 6px;">Divisi</label>
            <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; background: #FFFFFF;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; font-weight: 700; color: #111827;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#116834" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span>${tinjauFilter.divisionId}</span>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>

          <!-- Tombol Lihat Data -->
          <div style="margin-top: 8px;">
            <button id="btn-submit-tinjau-filter" type="button" style="width: 100%; height: 44px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.86rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#FFFFFF" stroke-width="2.2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Lihat Data</span>
            </button>
          </div>

        </div>

      </main>

      <!-- BOTTOM NAVIGATION (4 ITEMS) -->
      ${renderAsbBottomNav('verifikasi')}

    </div>
  `;

  app.querySelector('#btn-back-to-grid2')?.addEventListener('click', () => {
    currentVerifView = 'MODULE_GRID';
    renderVerificationLanding();
  });

  app.querySelector('#btn-submit-tinjau-filter')?.addEventListener('click', () => {
    currentVerifView = 'TINJAU_SUMMARY';
    renderVerificationLanding();
  });

  attachAsbBottomNavEvents(app);
}

/**
 * SCREEN 8 & 10: Tinjau Data Hari Ini - Daftar Transaksi Ringkasan 10 Modul
 */
function renderTinjauSummaryView(app, userCtx) {
  const summary10 = get10ModulesSummary(userCtx);
  const canSend = canSubmitFinalVerificationToServer(userCtx);

  const moduleRows = summary10.map(mod => {
    const iconSvg = MODULE_ICONS[VERIFICATION_10_MODULES.find(m => m.id === mod.id)?.iconName] || MODULE_ICONS.sprout;

    return `
      <div class="tinjau-mod-row" data-mod-id="${mod.id}" style="display: flex; align-items: center; justify-content: space-between; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; color: #116834;">
            ${iconSvg}
          </div>
          <span style="font-size: 0.82rem; font-weight: 700; color: #111827;">${mod.label}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.74rem; font-weight: 700; color: ${mod.verifiedCount > 0 ? '#116834' : '#64748B'};">
            ${mod.verifiedCount} transaksi
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2.2" fill="none">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page verif-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-back-to-filter" type="button" aria-label="Kembali" style="background: transparent; border: none; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0;">Tinjau Data Hari Ini</h1>
        </div>
      </header>

      <!-- BODY -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- LIST OF 10 MODULES -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${moduleRows}
        </div>

        <!-- SCREEN 10 CHECKMARK & KIRIM DATA -->
        <div style="margin-top: 10px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          ${canSend ? `
            <div style="width: 52px; height: 52px; border-radius: 50%; background: #116834; display: flex; align-items: center; justify-content: center; color: #FFFFFF; margin-bottom: 2px;">
              <svg viewBox="0 0 24 24" width="30" height="30" stroke="#FFFFFF" stroke-width="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #111827;">Semua transaksi sudah diverifikasi</div>
            <div style="font-size: 0.74rem; color: #64748B; margin-bottom: 8px;">Data siap dikirim ke server.</div>
            <button id="btn-send-to-server" type="button" style="width: 100%; height: 44px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.86rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#FFFFFF" stroke-width="2.2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Kirim Data ke Server</span>
            </button>
          ` : `
            <div style="font-size: 0.84rem; font-weight: 700; color: #B45309;">Masih ada transaksi yang belum selesai diverifikasi</div>
            <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 8px;">Selesaikan verifikasi seluruh modul sebelum mengirim ke server.</div>
            <button id="btn-send-to-server" type="button" disabled style="width: 100%; height: 44px; background: #E2E8F0; color: #94A3B8; border: none; border-radius: 8px; font-size: 0.86rem; font-weight: 700; cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#94A3B8" stroke-width="2.2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Kirim Data ke Server</span>
            </button>
          `}
        </div>

      </main>

      <!-- BOTTOM NAVIGATION (4 ITEMS) -->
      ${renderAsbBottomNav('verifikasi')}

    </div>
  `;

  // Back button -> kembali langsung ke halaman Verifikasi utama (MODULE_GRID)
  app.querySelector('#btn-back-to-filter')?.addEventListener('click', () => {
    currentVerifView = 'MODULE_GRID';
    renderVerificationLanding();
  });

  // Click module row -> open Screen 9 if verified items exist
  app.querySelectorAll('.tinjau-mod-row').forEach((row) => {
    row.addEventListener('click', () => {
      const modId = row.dataset.modId;
      const modSummary = summary10.find(m => m.id === modId);
      if (modSummary && modSummary.verifiedItems.length > 0) {
        selectedTxItem = modSummary.verifiedItems[0];
        currentVerifView = 'TINJAU_DETAIL';
        renderVerificationLanding();
      } else {
        toast(`Belum ada transaksi terverifikasi untuk modul ini`, 'info');
      }
    });
  });

  // Kirim ke server
  app.querySelector('#btn-send-to-server')?.addEventListener('click', () => {
    if (!canSend) return;
    try {
      const result = submitFinalVerificationToServer(userCtx);
      toast(result.message || 'Data berhasil dikirim ke server!', 'success');
      currentVerifView = 'MODULE_GRID';
      renderVerificationLanding();
    } catch (err) {
      toast(err.message || 'Gagal mengirim data ke server', 'error');
    }
  });

  attachAsbBottomNavEvents(app);
}

/**
 * SCREEN 9: Tinjau Data Hari Ini - Detail Transaksi (Read-Only)
 */
function renderTinjauDetailView(app, userCtx) {
  if (!selectedTxItem) {
    currentVerifView = 'TINJAU_SUMMARY';
    renderVerificationLanding();
    return;
  }

  // Gunakan normalizedData yang sudah terlampir pada selectedTxItem (Single Source of Truth)
  const norm = selectedTxItem.normalizedData || getVerificationDetailData(selectedTxItem.rawRecord, userCtx, selectedTxItem.referenceType);
  const currentMod = VERIFICATION_10_MODULES.find(m => m.id === selectedTxItem.moduleCategory || m.types.includes(selectedTxItem.referenceType)) || VERIFICATION_10_MODULES[0];
  const docNo = selectedTxItem.referenceDocNo || selectedTxItem.docNo || selectedTxItem.id;
  const dateStr = selectedTxItem.date ? String(selectedTxItem.date).substring(0, 10) : (tinjauFilter.date || todayDDMMYYYY());
  const workerName = selectedTxItem.submittedByName || selectedTxItem.rawRecord?.mantri || selectedTxItem.rawRecord?.actorName || userCtx?.name || 'Mantri';
  const estateName = selectedTxItem.estateName || selectedTxItem.estateId || userCtx?.estateName || userCtx?.estateId || tinjauFilter.estateId || '-';
  const divisionName = selectedTxItem.divisionName || selectedTxItem.divisionId || userCtx?.divisionName || userCtx?.divisionId || tinjauFilter.divisionId || '-';

  // Render Rincian Data dinamis dari normalized fields (Zero hardcoding)
  const detailRows = (norm.fields || []).map(f => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
      <span style="color: #64748B;">${esc(f.label)}</span>
      <strong style="color: ${f.highlight ? '#116834' : '#0F172A'}; text-align: right;">${f.value}</strong>
    </div>
  `).join('');

  app.innerHTML = `
    <div class="page verif-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-back-to-tinjau-summary" type="button" aria-label="Kembali" style="background: transparent; border: none; padding: 4px; margin-left: -4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0;">Detail Transaksi</h1>
        </div>
      </header>

      <!-- BODY -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- CARD HEADER DOKUMEN -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #111827;">${esc(norm.title || currentMod.label)}</div>
            <div style="font-size: 0.74rem; font-weight: 700; color: #116834; margin-top: 1px;">${esc(docNo)}</div>
            <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">${esc(workerName)} &bull; ${esc(dateStr)}</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; background: #DEF7EC; color: #03543F;">
            Terverifikasi
          </span>
        </div>

        <!-- INFORMASI UMUM -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size: 0.84rem; font-weight: 800; color: #111827; margin-bottom: 10px; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px;">
            Informasi Umum
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem;">
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Periode Data</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(tinjauFilter.date || dateStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Kebun</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(estateName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Divisi</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(divisionName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Mantri</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(workerName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Tanggal Transaksi</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(dateStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Nomor Dokumen</span>
              <span style="color: #116834; font-weight: 700;">${esc(docNo)}</span>
            </div>
          </div>
        </div>

        <!-- RINCIAN DATA -->
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size: 0.84rem; font-weight: 800; color: #111827; margin-bottom: 10px; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px;">
            Rincian Data
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem;">
            ${detailRows}
          </div>
        </div>

      </main>

      <!-- BOTTOM NAVIGATION (4 ITEMS) -->
      ${renderAsbBottomNav('verifikasi')}

    </div>
  `;

  app.querySelector('#btn-back-to-tinjau-summary')?.addEventListener('click', () => {
    currentVerifView = 'TINJAU_SUMMARY';
    renderVerificationLanding();
  });

  attachAsbBottomNavEvents(app);
}
