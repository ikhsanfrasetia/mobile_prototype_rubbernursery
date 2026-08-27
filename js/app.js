/**
 * app.js — entry point Sigma Nursery.
 * Bootstrap: register PWA SW → seed IndexedDB → init router.
 * Alur: Login → Splash → Sinkronisasi.
 */

import { registerRoute, initRouter, navigate } from './core/router.js';
import { renderLogin } from './modules/auth/login.js';
import { renderSplash } from './modules/auth/splash.js';
import { renderSync } from './modules/auth/sync.js';
import { renderBeranda } from './modules/dashboard/beranda.js';
import { renderAttendanceLanding } from './modules/attendance/attendance-landing.js';
import { renderAttendanceSupervisor } from './modules/attendance/attendance-supervisor.js';
import { renderAttendanceSupervisorResult } from './modules/attendance/attendance-supervisor-result.js';
import { renderAttendanceWorkers } from './modules/attendance/attendance-workers.js';
import { renderAttendanceSummary } from './modules/attendance/attendance-summary.js';
import { initReviewWorkspace } from './modules/review/review-workspace.js';
import { renderReceiptLanding } from './modules/receipt/receipt-landing.js';
import { renderReceiptBenih } from './modules/receipt/receipt-benih.js';
import { renderReceiptSir } from './modules/receipt/receipt-sir.js';
import { renderReceiptCamera } from './modules/receipt/receipt-camera.js';
import { renderReceiptSummary } from './modules/receipt/receipt-summary.js';
import { renderSeedingLanding } from './modules/seeding/seeding-landing.js';
import { renderSeedingForm } from './modules/seeding/seeding-form.js';
import { seedDatabase } from './db/seed.js';

/* ---- PWA: service worker ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[sw] register gagal:', err);
    });
  });
}

/* ---- Routes ---- */
registerRoute('/', () => navigate('/login', { replace: true }));
registerRoute('/login', renderLogin);
registerRoute('/splash', renderSplash);
registerRoute('/sync', renderSync);
registerRoute('/home', renderBeranda);
registerRoute('/attendance', renderAttendanceLanding);
registerRoute('/attendance/supervisor', renderAttendanceSupervisor);
registerRoute('/attendance/supervisor/result', renderAttendanceSupervisorResult);
registerRoute('/attendance/workers', renderAttendanceWorkers);
registerRoute('/attendance/summary', renderAttendanceSummary);
registerRoute('/reception', renderReceiptLanding);
registerRoute('/reception/benih', renderReceiptBenih);
registerRoute('/reception/benih/sir', renderReceiptSir);
registerRoute('/reception/benih/camera', renderReceiptCamera);
registerRoute('/reception/summary', renderReceiptSummary);
registerRoute('/seeding', renderSeedingLanding);
registerRoute('/seeding/form', renderSeedingForm);

/* ---- Bootstrap ---- */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await seedDatabase();
  } catch (err) {
    console.error('[bootstrap] seed gagal:', err);
  }
  initRouter();
  initReviewWorkspace();
});
