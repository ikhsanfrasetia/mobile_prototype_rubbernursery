import fs from 'fs';
import path from 'path';

console.log("=== GENERATING COMPREHENSIVE ROLE DEPENDENCY AUDIT REPORT ===");

// Let's analyze all files in js/
const jsFiles = [
  'js/core/permissions.js',
  'js/core/session.js',
  'js/core/storage.js',
  'js/core/router.js',
  'js/core/workflow.js',
  'js/core/utils.js',
  'js/core/export-screen.js',
  'js/data/demo-data.js',
  'js/data/master-data.js',
  'js/data/process-mapping-baseline.js',
  'js/db/indexeddb.js',
  'js/db/seed.js',
  'js/db/repositories.js',
  'js/components/drawer.js',
  'js/components/modal.js',
  'js/components/toast.js',
  'js/modules/auth/login.js',
  'js/modules/auth/splash.js',
  'js/modules/auth/sync.js',
  'js/modules/dashboard/beranda.js',
  'js/modules/attendance/attendance-landing.js',
  'js/modules/attendance/attendance-supervisor.js',
  'js/modules/attendance/attendance-supervisor-result.js',
  'js/modules/attendance/attendance-workers.js',
  'js/modules/attendance/attendance-summary.js',
  'js/modules/receipt/receipt-landing.js',
  'js/modules/receipt/receipt-benih.js',
  'js/modules/receipt/receipt-sir.js',
  'js/modules/receipt/receipt-camera.js',
  'js/modules/receipt/receipt-summary.js',
  'js/modules/receipt/receipt-placeholder.js',
  'js/modules/seeding/seeding-landing.js',
  'js/modules/seeding/seeding-scan.js',
  'js/modules/seeding/seeding-form.js',
  'js/modules/budding/budding-landing.js',
  'js/modules/budding/budding-grafting.js',
  'js/modules/budding/budding-scan.js',
  'js/modules/budding/budding-regrafting.js',
  'js/modules/budding/budding-form.js',
  'js/modules/inspection/inspection-landing.js',
  'js/modules/inspection/inspection-scan.js',
  'js/modules/inspection/inspection-form.js',
  'js/modules/selection/selection-landing.js',
  'js/modules/entres/entres-landing.js',
  'js/modules/entres/menunas-scan.js',
  'js/modules/entres/menunas-form.js',
  'js/modules/entres/topping-scan.js',
  'js/modules/entres/topping-form.js',
  'js/modules/maintenance/nursery-activity.js',
  'js/modules/request/request-landing.js',
  'js/modules/request/request-kebun-sepupu-form.js',
  'js/modules/dispatch/dispatch-landing.js',
  'js/modules/dispatch/dispatch-report.js',
  'js/modules/placeholder/analysis-placeholder.js',
  'js/modules/history/nursery-history.js',
  'js/modules/transactions/transaction-manager.js',
  'js/modules/review/review-workspace.js',
  'js/modules/process-mapping/process-mapping-api.js',
  'js/modules/process-mapping/process-mapping-data.js',
  'js/modules/process-mapping/process-mapping-doc.js',
  'js/modules/process-mapping/process-mapping-ui.js',
  'js/app.js',
  'sw.js',
  'index.html',
  'data/process-mapping-data.json',
  'server/process-mapping-db.js'
];

console.log(`Analyzing ${jsFiles.length} core application files...`);

const stats = {
  totalDependencies: 0,
  highRisk: 0,
  mediumRisk: 0,
  lowRisk: 0,
  byRole: {
    PENGURUS: 0,
    MANTRI_TANAMAN: 0,
    PENGURUS_KEBUN_SEPUPU: 0,
    ASISTEN: 0,
    ASISTEN_BIBITAN: 0,
    ASKEP: 0,
    TEKNIKER_I: 0,
    KTU: 0
  }
};

const fileFindings = [];

jsFiles.forEach(relPath => {
  if (!fs.existsSync(relPath)) return;
  const content = fs.readFileSync(relPath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const l = line.trim();

    // Check specific role usages
    const checks = [
      { key: 'PENGURUS', roles: ['PENGURUS'] },
      { key: 'MANTRI_TANAMAN', roles: ['MANTRI_TANAMAN'] },
      { key: 'PENGURUS_KEBUN_SEPUPU', roles: ['PENGURUS_KEBUN_SEPUPU', 'PENGURUS_KEBUN_SEPUKU'] },
      { key: 'ASISTEN', roles: ['ASISTEN'] },
      { key: 'ASISTEN_BIBITAN', roles: ['ASISTEN_BIBITAN'] },
      { key: 'ASKEP', roles: ['ASKEP'] },
      { key: 'TEKNIKER_I', roles: ['TEKNIKER_I'] },
      { key: 'KTU', roles: ['KTU'] }
    ];

    checks.forEach(c => {
      c.roles.forEach(r => {
        const reg = new RegExp(`\\b${r}\\b`);
        if (reg.test(l)) {
          stats.totalDependencies++;
          stats.byRole[c.key]++;
          
          let risk = 'LOW';
          let classification = 'CONFIGURATION';
          let area = 'Data';

          if (l.includes('if (') || l.includes('if(') || l.includes('===') || l.includes('!==') || l.includes('includes(')) {
            risk = 'HIGH';
            classification = 'DIRECT';
            area = 'Business Logic / Conditional Rendering';
          } else if (relPath.includes('permissions.js') || relPath.includes('session.js') || relPath.includes('router.js')) {
            risk = 'HIGH';
            classification = 'DIRECT';
            area = 'Auth / Permissions / Routing';
          } else if (relPath.includes('drawer.js') || relPath.includes('login.js')) {
            risk = 'HIGH';
            classification = 'DIRECT';
            area = 'Role Switcher / Auth UI';
          } else if (relPath.includes('beranda.js') || relPath.includes('request-landing.js')) {
            risk = 'HIGH';
            classification = 'DIRECT';
            area = 'Dashboard / Navigation';
          } else if (relPath.includes('form.js') || relPath.includes('transaction')) {
            risk = 'HIGH';
            classification = 'DIRECT';
            area = 'Form / Transaction';
          } else if (relPath.includes('demo-data.js') || relPath.includes('seed.js')) {
            risk = 'MEDIUM';
            classification = 'CONFIGURATION';
            area = 'Mock Data / Seed';
          } else {
            risk = 'LOW';
            classification = 'CONFIGURATION';
            area = 'Reference / Mapping';
          }

          if (risk === 'HIGH') stats.highRisk++;
          else if (risk === 'MEDIUM') stats.mediumRisk++;
          else stats.lowRisk++;

          fileFindings.push({
            file: relPath,
            lineNum,
            line: l,
            role: c.key,
            area,
            classification,
            risk
          });
        }
      });
    });
  });
});

console.log("Stats summary:", stats);
fs.writeFileSync('scratch/analyzed_role_findings.json', JSON.stringify({ stats, fileFindings }, null, 2));
