/**
 * modules/profile/profile.js — Halaman Profil Saya.
 *
 * Prinsip: "ADD, DO NOT BREAK."
 * Menampilkan identitas persona/role yang sedang aktif secara dinamis dan read-only.
 * Menggunakan getCurrentUserContext() & session.
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext, SCOPE_TYPES } from '../../core/user-context.js';
import { ROLE_LABELS } from '../../core/permissions.js';
import { esc } from '../../core/utils.js';

const ROLE_DISPLAY_NAMES = Object.freeze({
  MANTRI_TANAMAN: 'Mantri Tanaman',
  ASISTEN: 'Asisten',
  ASISTEN_BIBITAN: 'Asisten Pembibitan',
  ASKEP: 'Asisten Kepala',
  PENGURUS: 'Pengurus',
  PENGURUS_KEBUN_SEPUPU: 'Pengurus Kebun Sepupu',
  TEKNIKER_I: 'Tekniker I',
  KTU: 'Kepala Tata Usaha'
});

/**
 * Render Halaman Profil Saya
 */
export function renderProfile() {
  const app = document.getElementById('app');
  if (!app) return;

  const userCtx = getCurrentUserContext();
  const sessionUser = session.get() || {};

  // Dynamic field extraction with safe fallbacks
  const name = (userCtx.name && userCtx.name !== 'User') ? userCtx.name : (sessionUser.name || 'Wagiman');
  const code = userCtx.code || userCtx.loginCode || userCtx.userId || sessionUser.code || sessionUser.userId || 'MNT001';
  const role = userCtx.role || sessionUser.role || 'MANTRI_TANAMAN';
  const roleName = ROLE_DISPLAY_NAMES[role] || ROLE_LABELS[role] || role;
  const position = userCtx.position || sessionUser.position || 'Mantri Bibitan';
  const estateName = userCtx.estateName || sessionUser.estateName || (userCtx.estateId === 'EST-APM' ? 'Aek Pamingke' : 'Tanah Besih');
  
  let divisionName = userCtx.divisionName || sessionUser.divisionName;
  if (userCtx.scopeType === SCOPE_TYPES.ESTATE) {
    divisionName = (divisionName && divisionName.startsWith('Divisi')) ? divisionName : '-';
  } else {
    divisionName = divisionName || 'Divisi I';
  }

  const scope = userCtx.scopeType || sessionUser.scopeType || 'DIVISION';
  const initial = (name.trim().charAt(0) || 'U').toUpperCase();

  app.innerHTML = `
    <div class="profile-page-wrapper">
      <!-- HEADER -->
      <header class="profile-header">
        <button id="btn-back" class="profile-back-btn" type="button" aria-label="Kembali">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1 class="profile-header-title">Profil Saya</h1>
        <div class="profile-header-spacer"></div>
      </header>

      <!-- MAIN CONTENT -->
      <main class="profile-main-content">
        <div class="profile-container">

          <!-- PROFILE SUMMARY CARD -->
          <div class="profile-summary-card">
            <div class="profile-summary-body">
              <div class="profile-avatar">
                ${esc(initial)}
              </div>
              <div class="profile-summary-meta">
                <div class="profile-summary-name">${esc(name)}</div>
                <div class="profile-summary-code">${esc(code)}</div>
                <div class="profile-position-pill">${esc(position)}</div>
              </div>
            </div>
            <div class="profile-status-pill">
              <span class="profile-dot-active"></span>
              <span class="profile-status-text">Aktif</span>
            </div>
          </div>

          <!-- SECTION IDENTITAS -->
          <section class="profile-section-card">
            <h2 class="profile-section-title">Identitas</h2>
            <div class="profile-field-list">
              <div class="profile-field-row">
                <span class="profile-field-label">Nama Lengkap</span>
                <span class="profile-field-value" id="profile-val-name">${esc(name)}</span>
              </div>
              <div class="profile-field-row">
                <span class="profile-field-label">Login Code</span>
                <span class="profile-field-value" id="profile-val-code">${esc(code)}</span>
              </div>
            </div>
          </section>

          <!-- SECTION ROLE & POSISI -->
          <section class="profile-section-card">
            <h2 class="profile-section-title">Role & Posisi</h2>
            <div class="profile-field-list">
              <div class="profile-field-row">
                <span class="profile-field-label">Role Aktif</span>
                <span class="profile-field-value" id="profile-val-role">${esc(role)}</span>
              </div>
              <div class="profile-field-row">
                <span class="profile-field-label">Nama Role</span>
                <span class="profile-field-value" id="profile-val-rolename">${esc(roleName)}</span>
              </div>
              <div class="profile-field-row">
                <span class="profile-field-label">Posisi</span>
                <span class="profile-field-value" id="profile-val-position">${esc(position)}</span>
              </div>
            </div>
          </section>

          <!-- SECTION UNIT KERJA -->
          <section class="profile-section-card">
            <h2 class="profile-section-title">Unit Kerja</h2>
            <div class="profile-field-list">
              <div class="profile-field-row">
                <span class="profile-field-label">Kebun</span>
                <span class="profile-field-value" id="profile-val-estate">${esc(estateName)}</span>
              </div>
              <div class="profile-field-row">
                <span class="profile-field-label">Divisi</span>
                <span class="profile-field-value" id="profile-val-division">${esc(divisionName)}</span>
              </div>
              <div class="profile-field-row">
                <span class="profile-field-label">Scope</span>
                <span class="profile-field-value" id="profile-val-scope">${esc(scope)}</span>
              </div>
            </div>
          </section>

          <!-- SECTION STATUS -->
          <section class="profile-section-card profile-status-section">
            <h2 class="profile-section-title">Status</h2>
            <div class="profile-status-box">
              <div class="profile-status-header">
                <span class="profile-status-circle"></span>
                <span class="profile-status-title">Akun Aktif</span>
              </div>
              <p class="profile-status-desc">
                Anda sedang menggunakan persona aktif dan memiliki akses sesuai role, kebun, dan cakupan kerja yang ditetapkan sistem.
              </p>
            </div>
          </section>

          <!-- READ-ONLY NOTICE -->
          <div class="profile-notice-box">
            <p class="profile-notice-text">
              Informasi pada halaman ini mengikuti persona yang sedang aktif. Untuk mengganti persona, silakan gunakan Persona Switcher pada sidebar.
            </p>
          </div>

        </div>
      </main>
    </div>
  `;

  // Back button handler
  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      navigate('/home');
    });
  }
}
