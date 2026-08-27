/**
 * modules/auth/splash.js — Splash Screen (setelah Login berhasil).
 * Sequence: Login → Splash → user menekan "Saya Siap Bekerja Jujur"
 *           → progress 4 detik dengan status dinamis → Sinkronisasi (/sync).
 */

import { navigate } from '../../core/router.js';
import { session } from '../../core/session.js';

const PROGRESS_MS = 4000;
const STEP_MS = 50;

const STATUS_STAGES = [
  { at: 0, text: 'Memverifikasi kredensial & sesi…' },
  { at: 25, text: 'Menyiapkan basis data lokal…' },
  { at: 55, text: 'Menyelaraskan modul operasional…' },
  { at: 85, text: 'Memuat modul sinkronisasi…' },
  { at: 100, text: 'Siap! Mengalihkan…' }
];

function getStatusMessage(pct) {
  let msg = STATUS_STAGES[0].text;
  for (const st of STATUS_STAGES) {
    if (pct >= st.at) msg = st.text;
  }
  return msg;
}

export function renderSplash() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="splash-page">
      <div class="splash-bg-glow"></div>

      <div class="splash-content">
        <div class="splash-emblem-wrap">
          <div class="splash-pulse-ring"></div>
          <div class="splash-pulse-ring delay"></div>
          <div class="splash-emblem">
            <img src="assets/icons/icon_splash.jpeg" alt="Logo Integritas SOCFIN" />
          </div>
        </div>

        <div class="splash-text-block">
          <h1 class="splash-title">Anda siap untuk bekerja jujur</h1>
          <p class="splash-sub">Selamat bekerja</p>
        </div>

        <div class="splash-action-area">
          <div class="splash-gate" id="splash-gate">
            <button class="btn btn-primary btn-block splash-ready-btn" id="splash-ready" type="button">
              <span>Saya Siap Bekerja Jujur</span>
            </button>
          </div>

          <div class="splash-progress-card" id="splash-progress" hidden>
            <div class="splash-progress-head">
              <span class="splash-progress-status" id="splash-progress-status">Menyiapkan…</span>
              <span class="splash-progress-pct" id="splash-progress-pct">0%</span>
            </div>
            <div class="splash-progress-track">
              <div class="splash-progress-fill" id="splash-progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const readyBtn = app.querySelector('#splash-ready');
  const gateEl = app.querySelector('#splash-gate');
  const progressEl = app.querySelector('#splash-progress');
  const fillEl = app.querySelector('#splash-progress-fill');
  const statusEl = app.querySelector('#splash-progress-status');
  const pctEl = app.querySelector('#splash-progress-pct');
  let running = false;

  readyBtn.addEventListener('click', () => {
    if (running) return;
    running = true;
    gateEl.classList.add('fade-out');
    
    setTimeout(() => {
      gateEl.hidden = true;
      progressEl.hidden = false;
      progressEl.classList.add('fade-in');

      const start = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.round((elapsed / PROGRESS_MS) * 100));
        fillEl.style.width = `${pct}%`;
        pctEl.textContent = `${pct}%`;
        statusEl.textContent = getStatusMessage(pct);

        if (elapsed >= PROGRESS_MS) {
          clearInterval(timer);
          if (!session.isAuthenticated()) {
            navigate('/login', { replace: true });
            return;
          }
          navigate('/sync', { replace: true });
        }
      }, STEP_MS);
    }, 200);
  });
}
