/**
 * modules/auth/login.js — Login (mobile-first) + Role Switch User (demo).
 * Alur: login sukses → Splash Screen → Sinkronisasi (/sync).
 */

import { session } from '../../core/session.js';
import { navigate } from '../../core/router.js';
import { userRepository } from '../../db/repositories.js';
import { ROLE_LABELS } from '../../core/permissions.js';
import { esc } from '../../core/utils.js';
import { storage } from '../../core/storage.js';
import { openModal, closeModal } from '../../components/modal.js';

const ROLE_ORDER = ['MANTRI_TANAMAN', 'ASISTEN', 'ASKEP', 'PENGURUS'];
const VPN_KEY = 'vpn';

function startSession(user, { demo = false } = {}) {
  session.start({
    userId: user.id,
    code: user.code || user.id || '1405482',
    role: user.role,
    name: user.name,
    position: user.position || 'Mantri Bibitan',
    divisionId: user.divisionId,
    divisionName: user.divisionId,
    isDemoSession: demo
  });
}

/* Setelah login sukses → Splash Screen (bukan placeholder / Beranda).
   Pakai replace agar browser-back tidak kembali ke /login. */
function renderSuccess(user, { demo = false } = {}) {
  void user; void demo;
  navigate('/splash', { replace: true });
}

export async function renderLogin() {
  const users = await userRepository.list();
  const vpnOn = storage.get(VPN_KEY, false) === true;

  const eyeOffSvg = `
    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  `;
  const eyeOnSvg = `
    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page">
      <div class="login-topbar">
        <div class="vpn-group">
          <span class="vpn-label">VPN</span>
          <button class="vpn-switch ${vpnOn ? 'is-on' : ''}" id="vpn-toggle" type="button" aria-pressed="${vpnOn}" aria-label="Toggle VPN">
            <span class="vpn-thumb"></span>
          </button>
        </div>
        <div class="status-group">
          <span class="status-label">Status</span>
          <span class="status-badge ${vpnOn ? 'is-connected' : 'is-disconnected'}" id="conn-status">${vpnOn ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div class="login-hero">
        <div class="login-logo">
          <img src="assets/icons/login_icon.png" alt="PT SOCFIN INDONESIA (SOCFINDO)" />
        </div>
      </div>

      <div class="login-card">
        <div class="field">
          <label class="field-label" for="login-username">Nama Akun</label>
          <input class="field-control" id="login-username" type="text" autocomplete="username" placeholder="Masukkan nama akun" />
        </div>
        <div class="field">
          <label class="field-label" for="login-password">Kata Sandi</label>
          <div class="password-wrap">
            <input class="field-control" id="login-password" type="password" autocomplete="current-password" placeholder="Masukan kata sandi" />
            <button class="password-toggle" id="password-toggle" type="button" aria-label="Tampilkan kata sandi">${eyeOffSvg}</button>
          </div>
        </div>
        <div class="login-error" id="login-error" hidden></div>
        <button class="btn btn-primary btn-block btn-login-submit" id="login-submit" type="button">Masuk</button>

        <button class="btn btn-outline btn-block role-switch-trigger" id="role-switch-trigger" type="button">Bantu Role Switch User</button>
      </div>

      <div class="login-footer">
        <p class="login-help">Segera hubungi admin bila butuh bantuan.</p>
        <div class="login-version">Versi 1.1.1</div>
      </div>
    </div>
  `;

  const userInput = app.querySelector('#login-username');
  const pwdInput = app.querySelector('#login-password');
  const pwdToggle = app.querySelector('#password-toggle');
  const errorEl = app.querySelector('#login-error');
  const submitBtn = app.querySelector('#login-submit');
  const vpnToggle = app.querySelector('#vpn-toggle');
  const connStatus = app.querySelector('#conn-status');

  const showError = (msg) => { errorEl.textContent = msg; errorEl.hidden = false; };
  const clearError = () => { errorEl.hidden = true; };

  // VPN toggle (simulasi, tanpa koneksi nyata).
  const applyVpn = (on) => {
    storage.set(VPN_KEY, on);
    vpnToggle.classList.toggle('is-on', on);
    vpnToggle.setAttribute('aria-pressed', String(on));
    connStatus.classList.toggle('is-connected', on);
    connStatus.classList.toggle('is-disconnected', !on);
    connStatus.textContent = on ? 'Connected' : 'Disconnected';
    if (on) clearError();
  };
  vpnToggle.addEventListener('click', () => applyVpn(!storage.get(VPN_KEY, false)));

  // Password show/hide.
  pwdToggle.addEventListener('click', () => {
    const show = pwdInput.type === 'password';
    pwdInput.type = show ? 'text' : 'password';
    pwdToggle.innerHTML = show ? eyeOnSvg : eyeOffSvg;
    pwdToggle.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  const doLogin = () => {
    clearError();
    const isVpnConnected = storage.get(VPN_KEY, false) === true;
    if (!isVpnConnected) {
      showError('VPN wajib diaktifkan (Status: Connected) agar dapat login ke sistem SIGMA.');
      return;
    }

    const username = userInput.value.trim();
    const password = pwdInput.value;
    if (!username) { showError('Nama akun wajib diisi.'); userInput.focus(); return; }
    if (!password) { showError('Kata sandi wajib diisi.'); pwdInput.focus(); return; }
    const user = users.find(
      (u) => u.active !== false && (u.code === username || u.name === username) && u.password === password
    );
    if (!user) { showError('Nama akun atau kata sandi salah.'); return; }
    startSession(user);
    renderSuccess(user);
  };

  submitBtn.addEventListener('click', doLogin);
  userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  pwdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

  // Role Switch User (demo).
  app.querySelector('#role-switch-trigger').addEventListener('click', () => openRolePicker(users, showError));
}

function openRolePicker(users, showError) {
  const roles = ROLE_ORDER.filter((r) => users.some((u) => u.role === r && u.active !== false));
  const radios = roles
    .map(
      (r, i) => `
      <label class="role-pick">
        <input type="radio" name="demo-role" value="${esc(r)}" ${i === 0 ? 'checked' : ''} />
        <span class="role-pick-label">${esc(ROLE_LABELS[r] || r)}</span>
      </label>
    `
    )
    .join('');

  openModal({
    title: 'Pilih Role Demo',
    body: `
      <p class="role-pick-hint">Mode demo — pilih role untuk masuk tanpa kredensial.</p>
      <div class="role-pick-list">${radios}</div>
    `,
    footer: `
      <button class="btn btn-ghost" data-role-cancel>Batal</button>
      <button class="btn btn-primary" data-role-confirm>Masuk sebagai Role</button>
    `
  });

  const root = document.getElementById('modal-root');
  const cancelBtn = root.querySelector('[data-role-cancel]');
  const confirmBtn = root.querySelector('[data-role-confirm]');

  cancelBtn?.addEventListener('click', closeModal);

  confirmBtn?.addEventListener('click', () => {
    const isVpnConnected = storage.get(VPN_KEY, false) === true;
    if (!isVpnConnected) {
      closeModal();
      if (showError) {
        showError('VPN wajib diaktifkan (Status: Connected) agar semua role dapat login ke sistem SIGMA.');
      }
      return;
    }

    const sel = root.querySelector('input[name="demo-role"]:checked');
    const role = sel?.value;
    const user = users.find((u) => u.role === role && u.active !== false);
    if (!role || !user) return;
    startSession(user, { demo: true });
    closeModal();
    renderSuccess(user, { demo: true });
  });
}
