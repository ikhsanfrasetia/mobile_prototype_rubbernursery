/**
 * app.js — entry point Sigma Nursery.
 * Bootstrap: register PWA SW → seed IndexedDB → init router.
 * Alur: Login → Splash → Sinkronisasi.
 */

import { registerRoute, initRouter, navigate, setNotFound } from './core/router.js';
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
import { renderSeedingScan } from './modules/seeding/seeding-scan.js';
import { renderSeedingForm } from './modules/seeding/seeding-form.js';
import { renderBuddingLanding } from './modules/budding/budding-landing.js';
import { renderBuddingGrafting } from './modules/budding/budding-grafting.js';
import { renderBuddingScan } from './modules/budding/budding-scan.js';
import { renderBuddingRegrafting } from './modules/budding/budding-regrafting.js';
import { renderBuddingForm } from './modules/budding/budding-form.js';
import { renderInspectionLanding } from './modules/inspection/inspection-landing.js';
import { renderInspectionForm } from './modules/inspection/inspection-form.js';
import { renderSelectionLanding } from './modules/selection/selection-landing.js';
import { renderNurseryHistory } from './modules/history/nursery-history.js';
import { renderTransactionManager } from './modules/transactions/transaction-manager.js';
import { renderEntresLanding } from './modules/entres/entres-landing.js';
import { renderMenunasScan } from './modules/entres/menunas-scan.js';
import { renderMenunasForm } from './modules/entres/menunas-form.js';
import { renderToppingScan } from './modules/entres/topping-scan.js';
import { renderToppingForm } from './modules/entres/topping-form.js';
import { renderNurseryActivityLanding, renderNurseryActivityForm } from './modules/maintenance/nursery-activity.js';
import { renderAnalysisPlaceholder } from './modules/placeholder/analysis-placeholder.js';
import { seedDatabase } from './db/seed.js';
import { initExportScreenToolbar } from './core/export-screen.js';

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
registerRoute('/seeding/scan', renderSeedingScan);
registerRoute('/seeding/form', renderSeedingForm);
registerRoute('/budding', renderBuddingLanding);
registerRoute('/budding/grafting', renderBuddingGrafting);
registerRoute('/budding/grafting/scan', renderBuddingScan);
registerRoute('/budding/grafting/form', renderBuddingForm);
registerRoute('/budding/regrafting', renderBuddingRegrafting);
registerRoute('/inspection', renderInspectionLanding);
registerRoute('/inspection/form', renderInspectionForm);
registerRoute('/selection', renderSelectionLanding);
registerRoute('/history', renderNurseryHistory);
registerRoute('/transactions', renderTransactionManager);

/* Modul dalam tahap analisis & operasional */
registerRoute('/material', renderAnalysisPlaceholder);
registerRoute('/nursery-activity', renderNurseryActivityLanding);
registerRoute('/nursery-activity/form', renderNurseryActivityForm);
registerRoute('/request', renderAnalysisPlaceholder);
registerRoute('/entres', renderEntresLanding);
registerRoute('/entres/menunas', renderMenunasScan);
registerRoute('/entres/menunas/form', renderMenunasForm);
registerRoute('/entres/topping', renderToppingScan);
registerRoute('/entres/topping/form', renderToppingForm);

/* Fallback Not Found */
setNotFound(renderAnalysisPlaceholder);

/* ---- Bootstrap ---- */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await seedDatabase();
  } catch (err) {
    console.error('[bootstrap] seed gagal:', err);
  }
  initRouter();
  initReviewWorkspace();
  initExportScreenToolbar();
});
