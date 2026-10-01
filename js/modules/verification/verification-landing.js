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
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { todayDDMMYYYY, esc } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, ROLES } from '../../core/user-context.js';
import { renderAsbBottomNav, attachAsbBottomNavEvents } from '../../components/bottom-nav-asb.js';
import {
  VERIFICATION_10_MODULES,
  VERIFICATION_STATUS,
  REFERENCE_TYPE_LABELS,
  getActionableRecordsForAsb,
  getVerifiedTransactionsByScope,
  get10ModulesSummary,
  canSubmitFinalVerificationToServer,
  submitFinalVerificationToServer,
  approveVerification,
  returnVerification,
  findSourceRecord
} from './verification-manager.js';

// State Halaman
let currentVerifView = 'MODULE_GRID'; // 'MODULE_GRID' | 'TRANSACTION_LIST' | 'TRANSACTION_DETAIL' | 'TINJAU_FILTER' | 'TINJAU_SUMMARY' | 'TINJAU_DETAIL'
let activeModuleId = null; // e.g. 'PRESENSI', 'OKULASI', etc.
let selectedTxItem = null; // Transaksi yang dibuka di detail
let activeFilterDate = todayDDMMYYYY();
let tinjauFilter = {
  date: todayDDMMYYYY(),
  estateId: 'Tanah Besih',
  divisionId: 'Divisi I'
};

const MODULE_ICONS = {
  team: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="#116834">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 7.66 5 11s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  `,
  documentPlus: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="#116834">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#116834"/>
      <line x1="12" y1="11" x2="12" y2="17" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
      <line x1="9" y1="14" x2="15" y2="14" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  sprout: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22v-9"></path>
      <path d="M12 13a5 5 0 0 0 5-5c0-4-5-6-5-6s-5 2-5 6a5 5 0 0 0 5 5z"></path>
    </svg>
  `,
  scissors: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
      <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
      <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
    </svg>
  `,
  documentSearch: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <circle cx="11" cy="14" r="3"></circle>
      <line x1="13.5" y1="16.5" x2="16.5" y2="19.5"></line>
    </svg>
  `,
  leafCheck: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  `,
  tree: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22V12 M12 12C12 7 8 4 8 4s-1 4 4 8z M12 12c0-5 4-8 4-8s1 4-4 8z"></path>
    </svg>
  `,
  material: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  `,
  plantCare: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22v-9"></path>
      <path d="M12 13a5 5 0 0 0 5-5c0-4-5-6-5-6s-5 2-5 6a5 5 0 0 0 5 5z"></path>
      <path d="M12 13a5 5 0 0 1-5-5c0-4 5-6 5-6s5 2 5 6a5 5 0 0 1-5 5z"></path>
    </svg>
  `,
  dispatch: `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="#116834">
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

  if (currentVerifView === 'MODULE_GRID') {
    renderModuleGridView(app, userCtx);
  } else if (currentVerifView === 'TRANSACTION_LIST') {
    renderTransactionListView(app, userCtx);
  } else if (currentVerifView === 'TRANSACTION_DETAIL') {
    renderTransactionDetailView(app, userCtx);
  } else if (currentVerifView === 'TINJAU_FILTER') {
    renderTinjauFilterView(app, userCtx);
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
      <button class="verif-grid-card" data-module-id="${mod.id}" type="button" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 14px 6px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04); text-align: center; gap: 6px; min-height: 98px; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center;">
          ${iconSvg}
        </div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #111827; line-height: 1.2;">
          ${mod.label}
        </div>
        ${modCount > 0 ? `
          <span style="position: absolute; top: 6px; right: 6px; background: #EF4444; color: #FFFFFF; font-size: 0.62rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 4px;">
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

      <!-- BODY: 10 MODULES GRID -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
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

  // Open Tinjau Data -> Screen 7
  app.querySelector('#btn-open-tinjau')?.addEventListener('click', () => {
    currentVerifView = 'TINJAU_FILTER';
    renderVerificationLanding();
  });

  attachAsbBottomNavEvents(app);
}

/**
 * SCREEN 5: Verifikasi - Daftar Transaksi per Modul
 */
function renderTransactionListView(app, userCtx) {
  const currentMod = VERIFICATION_10_MODULES.find(m => m.id === activeModuleId) || VERIFICATION_10_MODULES[0];
  const allActionable = getActionableRecordsForAsb(userCtx);
  const allVerified = getVerifiedTransactionsByScope(userCtx);

  // Filter items matching this module
  const pendingForMod = allActionable.filter(item => currentMod.types.includes(item.referenceType) || item.moduleCategory === currentMod.id);
  const verifiedForMod = allVerified.filter(item => currentMod.types.includes(item.referenceType) || item.moduleCategory === currentMod.id);

  const combinedList = [...pendingForMod, ...verifiedForMod];

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
          const isVerified = item.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI;
          const isPending = !isVerified;
          const docNo = item.referenceDocNo || item.docNo || item.id;
          const dateStr = item.date ? String(item.date).substring(0, 10) : activeFilterDate;
          const workerName = item.submittedByName || item.rawRecord?.mantri || item.rawRecord?.actorName || 'Mantri Bibitan';

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
                  <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">
                    ${esc(workerName)} &bull; ${esc(dateStr)}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: ${isVerified ? '#DEF7EC' : '#FEF3C7'}; color: ${isVerified ? '#03543F' : '#92400E'};">
                  ${isVerified ? 'Terverifikasi' : 'Menunggu'}
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

  const raw = selectedTxItem.rawRecord || {};
  const currentMod = VERIFICATION_10_MODULES.find(m => m.id === selectedTxItem.moduleCategory || m.types.includes(selectedTxItem.referenceType)) || VERIFICATION_10_MODULES[0];
  const docNo = selectedTxItem.referenceDocNo || selectedTxItem.docNo || selectedTxItem.id;
  const isVerified = selectedTxItem.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI;
  const dateStr = selectedTxItem.date ? String(selectedTxItem.date).substring(0, 10) : activeFilterDate;
  const workerName = selectedTxItem.submittedByName || raw.mantri || raw.actorName || userCtx?.name || 'Mantri';

  // Specific Module Details
  let detailRows = '';
  if (selectedTxItem.referenceType === 'TOPPING' || currentMod.id === 'KEBUN_ENTRES') {
    const stikHijau = raw.jumlahStikHijau !== undefined ? raw.jumlahStikHijau : (raw.jumlahStik || raw.jumlahPokok || raw.qty || 500);
    const perisai = raw.jumlahPerisai !== undefined ? raw.jumlahPerisai : (raw.jumlahMata || raw.jumlahTopping || 120);
    detailRows = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Jumlah Kayu</span>
        <strong style="color: #0F172A;">${stikHijau}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Jumlah Perisai</span>
        <strong style="color: #0F172A;">${perisai}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0;">
        <span style="color: #64748B;">Keterangan</span>
        <span style="color: #0F172A;">${esc(raw.keterangan || raw.notes || '-')}</span>
      </div>
    `;
  } else if (selectedTxItem.referenceType === 'OKULASI' || currentMod.id === 'OKULASI') {
    const mata = raw.jumlahMataOkulasi !== undefined ? raw.jumlahMataOkulasi : (raw.jumlahMata || raw.jumlah || 300);
    const stik = raw.jumlahStik !== undefined ? raw.jumlahStik : (raw.jumlahKayu || 250);
    detailRows = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Jumlah Mata Okulasi</span>
        <strong style="color: #0F172A;">${mata}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Jumlah Stik</span>
        <strong style="color: #0F172A;">${stik}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0;">
        <span style="color: #64748B;">Keterangan</span>
        <span style="color: #0F172A;">${esc(raw.keterangan || raw.notes || '-')}</span>
      </div>
    `;
  } else if (selectedTxItem.referenceType === 'PRESENSI' || currentMod.id === 'PRESENSI') {
    detailRows = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Jumlah Kehadiran</span>
        <strong style="color: #0F172A;">${raw.totalWorkers || raw.workerCount || 1} Orang</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Status Presensi</span>
        <strong style="color: #116834;">${raw.status || raw.type || 'HADIR'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0;">
        <span style="color: #64748B;">Keterangan</span>
        <span style="color: #0F172A;">${esc(raw.keterangan || '-')}</span>
      </div>
    `;
  } else {
    const qty = raw.qty || raw.quantity || raw.totalDisemai || raw.totalDeder || raw.actualBibitRetainedQty || raw.volumePkk || raw.jumlah || '-';
    detailRows = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Volume / Kuantitas</span>
        <strong style="color: #0F172A;">${qty}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0;">
        <span style="color: #64748B;">Keterangan</span>
        <span style="color: #0F172A;">${esc(raw.keterangan || raw.notes || '-')}</span>
      </div>
    `;
  }

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
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #E8F5E9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${MODULE_ICONS[currentMod.iconName] || MODULE_ICONS.sprout}
            </div>
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #111827;">${currentMod.label}</div>
              <div style="font-size: 0.74rem; font-weight: 700; color: #116834; margin-top: 1px;">${esc(docNo)}</div>
              <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">${esc(workerName)} &bull; ${esc(dateStr)}</div>
            </div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; background: ${isVerified ? '#DEF7EC' : '#FEF3C7'}; color: ${isVerified ? '#03543F' : '#92400E'};">
            ${isVerified ? 'Terverifikasi' : 'Menunggu'}
          </span>
        </div>

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

        <!-- ACTION BUTTONS IF PENDING -->
        ${!isVerified ? `
          <div style="display: flex; gap: 10px; margin-top: 10px; padding-bottom: 10px;">
            <button id="btn-tx-return" type="button" style="flex: 1; height: 42px; background: #FFFFFF; border: 1.5px solid #EF4444; color: #DC2626; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
              Kembalikan
            </button>
            <button id="btn-tx-approve" type="button" style="flex: 1; height: 42px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
              Setujui
            </button>
          </div>
        ` : `
          <div style="background: #DEF7EC; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px; text-align: center; color: #03543F; font-size: 0.78rem; font-weight: 700; margin-top: 8px;">
            ✓ Dokumen ini telah selesai diverifikasi
          </div>
        `}

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
    const reason = prompt('Masukkan alasan pengembalian:');
    if (reason && reason.trim()) {
      try {
        returnVerification({
          referenceType: selectedTxItem.referenceType,
          referenceId: selectedTxItem.referenceId,
          returnReason: reason.trim(),
          currentUser: userCtx
        });
        toast(`Dokumen ${docNo} dikembalikan untuk revisi`, 'info');
        currentVerifView = 'TRANSACTION_LIST';
        renderVerificationLanding();
      } catch (err) {
        toast(err.message || 'Gagal mengembalikan dokumen', 'error');
      }
    }
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
  const allVerified = summary10.every(m => m.pendingCount === 0);

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
        
        <!-- TOP CARD PERIODE & SCOPE -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #E8F5E9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#116834" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #64748B;">Periode Data</div>
              <div style="font-size: 0.82rem; font-weight: 800; color: #111827;">${tinjauFilter.date}</div>
              <div style="font-size: 0.7rem; color: #64748B;">${tinjauFilter.estateId} - ${tinjauFilter.divisionId}</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2.2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>

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

  // Back button
  app.querySelector('#btn-back-to-filter')?.addEventListener('click', () => {
    currentVerifView = 'TINJAU_FILTER';
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

  const raw = selectedTxItem.rawRecord || {};
  const currentMod = VERIFICATION_10_MODULES.find(m => m.id === selectedTxItem.moduleCategory || m.types.includes(selectedTxItem.referenceType)) || VERIFICATION_10_MODULES[0];
  const docNo = selectedTxItem.referenceDocNo || selectedTxItem.docNo || selectedTxItem.id;
  const dateStr = selectedTxItem.date ? String(selectedTxItem.date).substring(0, 10) : tinjauFilter.date;
  const workerName = selectedTxItem.submittedByName || raw.mantri || raw.actorName || userCtx?.name || 'Wagiman';

  let detailRows = '';
  if (selectedTxItem.referenceType === 'TOPPING' || currentMod.id === 'KEBUN_ENTRES') {
    const stikHijau = raw.jumlahStikHijau !== undefined ? raw.jumlahStikHijau : (raw.jumlahStik || raw.jumlahPokok || raw.qty || 500);
    const perisai = raw.jumlahPerisai !== undefined ? raw.jumlahPerisai : (raw.jumlahMata || raw.jumlahTopping || 120);
    detailRows = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Jumlah Kayu</span>
        <strong style="color: #0F172A;">${stikHijau}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Jumlah Perisai</span>
        <strong style="color: #0F172A;">${perisai}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0;">
        <span style="color: #64748B;">Keterangan</span>
        <span style="color: #0F172A;">${esc(raw.keterangan || raw.notes || '-')}</span>
      </div>
    `;
  } else {
    const qty = raw.qty || raw.quantity || raw.totalDisemai || raw.totalDeder || raw.actualBibitRetainedQty || raw.volumePkk || raw.jumlah || '-';
    detailRows = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
        <span style="color: #64748B;">Volume / Kuantitas</span>
        <strong style="color: #0F172A;">${qty}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0;">
        <span style="color: #64748B;">Keterangan</span>
        <span style="color: #0F172A;">${esc(raw.keterangan || raw.notes || '-')}</span>
      </div>
    `;
  }

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
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #E8F5E9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${MODULE_ICONS[currentMod.iconName] || MODULE_ICONS.sprout}
            </div>
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #111827;">${currentMod.label}</div>
              <div style="font-size: 0.74rem; font-weight: 700; color: #116834; margin-top: 1px;">${esc(docNo)}</div>
              <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">${esc(workerName)} &bull; ${esc(dateStr)}</div>
            </div>
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
              <span style="color: #0F172A; font-weight: 600;">${esc(tinjauFilter.date)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Kebun</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(tinjauFilter.estateId)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span style="color: #64748B;">Divisi</span>
              <span style="color: #0F172A; font-weight: 600;">${esc(tinjauFilter.divisionId)}</span>
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
