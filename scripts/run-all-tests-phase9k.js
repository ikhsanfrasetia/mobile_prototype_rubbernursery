/**
 * scripts/run-all-tests-phase9k.js
 * Master Regression & Verification Test Runner for Phase 9K
 * Master Data Klon Foundation Verification
 */

import { execSync } from 'child_process';

const suites = [
  { name: 'Demo Synchronization Engine: Scope & Isolation Suite (TASK-SYNC-02)', file: 'scripts/test-sync-engine.js' },
  { name: 'Master Block Distribution: KEBUN_SENDIRI Distribution Items Suite', file: 'scripts/test-distribution-block-master.js' },
  { name: 'Permintaan Bibit Kebun Sendiri: End-to-End Suite', file: 'scripts/test-permintaan-kebun-sendiri.js' },
  { name: 'Mantri Create Guard: MANTRI_BIBITAN Request Create Block (PRE-UAT)', file: 'scripts/test-mantri-request-create-guard.js' },
  { name: 'Role Separation: ASISTEN vs ASISTEN_BIBITAN (PRE-UAT)', file: 'scripts/test-request-role-separation.js' },
  { name: 'Header ASB Cleanup: UI Scope Badge Removal Audit', file: 'scripts/test-asb-header-cleanup.js' },
  { name: 'Master Data ASB UI: Simplified Bedengan & Batch UI (PRE-UAT-03)', file: 'scripts/test-asb-master-ui.js' },
  { name: 'UAT End-to-End Modul Asisten Bibitan (ASB-15)', file: 'scripts/test-asb-uat.js' },
  { name: 'Mutasi Stok Pemusnahan ASB: Destruction Stock Suite (ASB-14)', file: 'scripts/test-asb-destruction-stock.js' },
  { name: 'Mutasi Stok Seleksi ASB: Stock Mutation Suite (ASB-13)', file: 'scripts/test-asb-selection-stock.js' },
  { name: 'Verifikasi Data ASB: Finalisasi Modul Verification Suite (ASB-12)', file: 'scripts/test-asb-verification.js' },
  { name: 'Konsolidasi Data ASB: Finalisasi Modul Consolidation Suite (ASB-11)', file: 'scripts/test-asb-consolidation.js' },
  { name: 'Pemusnahan Bibit ASB: Finalisasi Modul Destruction Suite (ASB-10)', file: 'scripts/test-asb-destruction.js' },
  { name: 'Pemeriksaan Seleksi ASB: Finalisasi Review Suite (ASB-09)', file: 'scripts/test-asb-selection-review.js' },
  { name: 'Pengeluaran Bibit ASB: Finalisasi Modul Dispatch Suite (ASB-08)', file: 'scripts/test-asb-dispatch.js' },
  { name: 'Permintaan Bibit ASB: Finalisasi Modul Request Suite (ASB-07)', file: 'scripts/test-asb-request.js' },
  { name: 'Penerimaan Bibit ASB: Finalisasi Modul & Batch Suite (ASB-06)', file: 'scripts/test-asb-reception.js' },
  { name: 'Master Integration: Transaction Integration Suite (ASB-05)', file: 'scripts/test-asb-master-integration.js' },
  { name: 'Master Batch: Foundation & Service Suite (ASB-04)', file: 'scripts/test-asb-master-batch.js' },
  { name: 'Master Bedengan: Foundation & Service Suite (ASB-03)', file: 'scripts/test-asb-master-bedengan.js' },
  { name: 'Program Master: Canonical Reference Suite (ASB-02)', file: 'scripts/test-program-master-reference.js' },
  { name: 'Navigasi ASB: Finalisasi Beranda & Sidebar (ASB-01)', file: 'scripts/test-asisten-bibitan-navigation.js' },
  { name: 'Katalog & Transaksi: Clean All Data Suite (CLEAN-01)', file: 'scripts/test-audit-clean-all-data.js' },
  { name: 'Penerimaan KSP: Final Audit Kamera & Metadata (PENERIMAAN-08)', file: 'scripts/test-receipt-ksp-camera-audit.js' },
  { name: 'Penerimaan KSP: Mantri Bibitan & Batch Baru (PENERIMAAN-07)', file: 'scripts/test-receipt-ksp-mantri-bibitan.js' },
  { name: 'Penerimaan KSP: Asisten Bibitan & Verifikasi (PENERIMAAN-06)', file: 'scripts/test-receipt-ksp-asisten-bibitan.js' },
  { name: 'Penerimaan KSP: Asisten Lapangan & Alokasi Blok (PENERIMAAN-05)', file: 'scripts/test-receipt-ksp-asisten-lapangan.js' },
  { name: 'Penerimaan KSP: Verifikasi & Routing Askep (PENERIMAAN-04)', file: 'scripts/test-receipt-ksp-askep.js' },
  { name: 'Penerimaan KSP: Modul Pengurus Pemohon (PENERIMAAN-03)', file: 'scripts/test-receipt-ksp-pengurus.js' },
  { name: 'Penerimaan KSP: Fondasi Data & Status (PENERIMAAN-02)', file: 'scripts/test-receipt-ksp-foundation.js' },
  { name: 'Division Routing: Estate + Division + Role', file: 'scripts/test-division-routing.js' },
  { name: 'Dispatch Module: Mantri Execution Suite', file: 'scripts/test-dispatch-mantri-execution.js' },
  { name: 'Request Kebun Sepupu: Hub & Isolation Suite', file: 'scripts/test-request-kebun-sepupu-hub.js' },
  { name: 'Request Kebun Sepupu: Form & Review Suite', file: 'scripts/test-request-kebun-sepupu.js' },
  { name: 'Nursery Activity: Block Master Integration (New)', file: 'scripts/test-nursery-activity-block-master.js' },
  { name: 'Block Master: Centralized Foundation Suite', file: 'scripts/test-block-master-foundation.js' },
  { name: 'History & TM: Final Integration Validation', file: 'scripts/test-history-transaction-integration.js' },
  { name: 'Request Module: Klon Master Integration', file: 'scripts/test-request-clone-integration.js' },
  { name: 'Entres Module: Budwood & Plot Master Integration', file: 'scripts/test-entres-master-integration.js' },
  { name: 'Budding Module: Klon Master Integration', file: 'scripts/test-budding-clone-integration.js' },
  { name: 'Seeding Module: Klon Master Integration', file: 'scripts/test-seeding-clone-integration.js' },
  { name: 'Receipt Module: Klon Master Integration', file: 'scripts/test-receipt-clone-integration.js' },
  { name: 'Master Data: Foundation Verification', file: 'scripts/test-master-data-foundation.js' },
  { name: 'Phase 9K:   Master Data Klon Foundation', file: 'scripts/test-phase9k-clone-master-foundation.js' },
  { name: 'Phase 9J:   Clone Data Consistency Audit', file: 'scripts/test-phase9j-clone-data-audit.js' },
  { name: 'Login Modal: Login Persona Modal Consistency Suite', file: 'scripts/test-login-persona-modal-consistency.js' },
  { name: 'Profile Page: Profil Saya Implementation Suite', file: 'scripts/test-profile-page.js' },
  { name: 'Phase 9I:   Worker Master + CFNA Integration: Maintenance', file: 'scripts/test-phase9i-maintenance-worker-cfna.js' },
  { name: 'Phase 9H:   Worker Master Integration: Presensi', file: 'scripts/test-phase9h-attendance-worker-integration.js' },
  { name: 'Phase 9G:   Worker Master Integration: Budding', file: 'scripts/test-phase9g-budding-worker-integration.js' },
  { name: 'Phase 9F-B: Master Data Pekerja Foundation', file: 'scripts/test-phase9fb-worker-master.js' },
  { name: 'Phase 9F-A: Worker Master Dependency Audit', file: 'scripts/test-phase9fa-worker-audit.js' },
  { name: 'Phase 9E:   Persona Division Alignment', file: 'scripts/test-phase9e-persona-division.js' },
  { name: 'Phase 9D:   UAT Mantri Transaction Isolation', file: 'scripts/run-uat-phase9d.js' },
  { name: 'Phase 9D:   Transaction Data Isolation & Actor Ownership', file: 'scripts/test-phase9d-transaction-isolation.js' },
  { name: 'Phase 9C:   CFNA Maintenance Module Integration', file: 'scripts/test-phase9c-cfna-maintenance.js' },
  { name: 'Phase 9B:   Master Data CFNA Foundation', file: 'scripts/test-phase9b-cfna-master.js' },
  { name: 'Phase 9A:   Gap Resolution & SPB Integration', file: 'scripts/test-phase9a-request-integration.js' },
  { name: 'Phase 8A:   Role Menu Mapping & Validation', file: 'scripts/test-role-menu-mapping.js' },
  { name: 'Phase 8B:   Transaction Actor Identity Traceability', file: 'scripts/test-transaction-actor-identity.js' },
  { name: 'Phase 7:    Menu & Feature Registry', file: 'scripts/test-menu-feature-registry.js' },
  { name: 'Phase 6:    Role Profile & Capability Registry', file: 'scripts/test-role-profiles.js' },
  { name: 'Phase 5:    Role Normalization Compatibility', file: 'scripts/test-role-normalization.js' },
  { name: 'Phase 4:    Persona Switcher & Session Layer', file: 'scripts/test-persona-switcher.js' },
  { name: 'Phase 3:    Demo User & Persona Registry', file: 'scripts/test-persona-registry.js' },
  { name: 'Acceptance Suite: Task 11 Feature Acceptance', file: 'scripts/test-task11-acceptance.js' },
  { name: 'Phase 2:    User Context Compatibility Layer', file: 'scripts/test-user-context-compatibility.js' }
];

console.log('========================================================================================');
console.log('                 SIGMA RUBBER NURSERY — MASTER REGRESSION RUNNER (PHASE 9K)             ');
console.log('========================================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of suites) {
  try {
    const output = execSync(`node ${suite.file}`, { encoding: 'utf-8' });
    const countMatch = output.match(/(?:(\d+)\s+(?:PASSED|passed|assertions passed)|Passed:\s*(\d+))/i);
    let count = 0;
    if (countMatch) {
      count = parseInt(countMatch[1] || countMatch[2], 10);
    } else {
      const individualPass = (output.match(/✅/g) || []).length;
      count = individualPass;
    }

    totalPassed += count;
    results.push({ name: suite.name, count, status: 'PASS', error: null });
    console.log(`✅ [PASS] ${suite.name} — ${count} assertions`);
  } catch (err) {
    totalFailed++;
    results.push({ name: suite.name, count: 0, status: 'FAIL', error: err.message });
    console.error(`❌ [FAIL] ${suite.name}`);
    console.error(err.stdout || err.message);
  }
}

console.log('\n========================================================================================');
console.log('                                  REGRESSION SUMMARY TABLE                              ');
console.log('========================================================================================');
results.forEach((r, idx) => {
  const num = String(idx + 1).padEnd(3, ' ');
  const name = r.name.padEnd(65, ' ');
  const count = String(r.count + ' assertions').padStart(15, ' ');
  const status = r.status === 'PASS' ? 'PASS ✅' : 'FAIL ❌';
  console.log(`${num} ${name} ${count}   ${status}`);
});
console.log('----------------------------------------------------------------------------------------');
console.log(`GRAND TOTAL ASSERTIONS PASSED: ${totalPassed}`);
console.log(`TOTAL SUITES FAILED:           ${totalFailed}`);
console.log('========================================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
}
