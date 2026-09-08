import fs from 'fs';
import path from 'path';

console.log('=== EXECUTING CLEANUP & ARCHIVAL SCRIPT ===\n');

// 1. Create target archive directories
const dirsToCreate = [
  'docs/archive',
  'docs/archive/legacy',
  'docs/archive/historical',
  'docs/archive/audit-reports'
];

dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// 2. Create docs/archive/README.md
const archiveReadmeContent = `# ARCHIVE NOTICE
## SIGMA RUBBER NURSERY

Dokumen dan data di dalam direktori ini bersifat **historis / legacy reference**.

### Ketentuan Arsip:
1. **Tidak digunakan sebagai runtime source.**
2. **Tidak digunakan untuk menghitung requirement atau metrik aktif.**
3. **Tidak digunakan sebagai fallback data.**
4. **Tidak boleh digunakan oleh AI Agent untuk membuat requirement atau flow baru.**
5. **Tidak boleh dianggap sebagai baseline aktif.**

---

### ACTIVE SOURCE OF TRUTH (RESMI & TERKUNCI):

- **Business Source of Truth:**
  [\`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\`](../../MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md)

- **Runtime Data Source:**
  [\`data/process-mapping-data.json\`](../../data/process-mapping-data.json)

- **Runtime Baseline Engine:**
  [\`js/data/process-mapping-baseline.js\`](../../js/data/process-mapping-baseline.js)

- **Runtime Processing:**
  [\`js/modules/process-mapping/process-mapping-data.js\`](../../js/modules/process-mapping/process-mapping-data.js)
`;

fs.writeFileSync('docs/archive/README.md', archiveReadmeContent, 'utf8');
console.log('✅ Created docs/archive/README.md');

// 3. Move Legacy Machine-Readable Files to docs/archive/legacy/
const legacyFilesToMove = [
  { from: 'requirement.md', to: 'docs/archive/legacy/requirement.md' },
  { from: 'data_old.json', to: 'docs/archive/legacy/data_old.json' },
  { from: 'task15_2_search_results.json', to: 'docs/archive/legacy/task15_2_search_results.json' }
];

const movedFiles = [];
legacyFilesToMove.forEach(({ from, to }) => {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    console.log(`📦 Moved legacy machine-readable: ${from} -> ${to}`);
    movedFiles.push({ from, to, type: 'LEGACY MACHINE-READABLE' });
  }
});

// 4. Move Historical Documents to docs/archive/historical/
const historicalFilesToMove = [
  { from: 'SIGMA_Nursery_AI_Agent_SPEC.md', to: 'docs/archive/historical/SIGMA_Nursery_AI_Agent_SPEC.md' },
  { from: 'SIGMA-RUBBER-NURSERY-STAKEHOLDER-REVIEW-BRIEF.md', to: 'docs/archive/historical/SIGMA-RUBBER-NURSERY-STAKEHOLDER-REVIEW-BRIEF.md' },
  { from: 'SIGMA-RUBBER-NURSERY-STAKEHOLDER-SIGNOFF.md', to: 'docs/archive/historical/SIGMA-RUBBER-NURSERY-STAKEHOLDER-SIGNOFF.md' }
];

historicalFilesToMove.forEach(({ from, to }) => {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    console.log(`📦 Moved historical doc: ${from} -> ${to}`);
    movedFiles.push({ from, to, type: 'HISTORICAL DOCUMENT' });
  }
});

// Move docs/final-release to docs/archive/historical/final-release
if (fs.existsSync('docs/final-release')) {
  const targetDir = 'docs/archive/historical/final-release';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const releaseFiles = fs.readdirSync('docs/final-release');
  releaseFiles.forEach(f => {
    const src = path.join('docs/final-release', f);
    const dest = path.join(targetDir, f);
    fs.renameSync(src, dest);
    console.log(`📦 Moved release doc: ${src} -> ${dest}`);
    movedFiles.push({ from: src, to: dest, type: 'HISTORICAL RELEASE' });
  });
  fs.rmdirSync('docs/final-release');
}

// 5. Move Audit & Task Reports to docs/archive/audit-reports/
const rootFiles = fs.readdirSync('.');
rootFiles.forEach(f => {
  if (f.startsWith('TASK-') && f.endsWith('.md')) {
    const dest = path.join('docs/archive/audit-reports', f);
    fs.renameSync(f, dest);
    console.log(`📦 Moved task report: ${f} -> ${dest}`);
    movedFiles.push({ from: f, to: dest, type: 'AUDIT REPORT' });
  }
});

const docsFiles = fs.readdirSync('docs');
docsFiles.forEach(f => {
  if ((f.startsWith('TASK-') || f.startsWith('FINAL-')) && f.endsWith('.md')) {
    const src = path.join('docs', f);
    const dest = path.join('docs/archive/audit-reports', f);
    fs.renameSync(src, dest);
    console.log(`📦 Moved docs audit report: ${src} -> ${dest}`);
    movedFiles.push({ from: src, to: dest, type: 'AUDIT REPORT' });
  }
});

// Also move AUDIT_FINAL_MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md to docs/archive/audit-reports/
if (fs.existsSync('AUDIT_FINAL_MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md')) {
  const src = 'AUDIT_FINAL_MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md';
  const dest = 'docs/archive/audit-reports/AUDIT_FINAL_MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md';
  fs.copyFileSync(src, dest);
  console.log(`📦 Archived copy of final audit report: ${src} -> ${dest}`);
}

// 6. Delete Safe to Remove Files (Category F)
const deletedFiles = [];

// Delete portal_patch/backup-task10 and backup-before-merge
['portal_patch/backup-task10', 'portal_patch/backup-before-merge'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`🗑️ Deleted directory: ${dir}`);
    deletedFiles.push({ path: dir, type: 'BACKUP DIRECTORY' });
  }
});

// Delete old root ad-hoc test files (test-*.js)
rootFiles.forEach(f => {
  if (f.startsWith('test-') && f.endsWith('.js')) {
    fs.unlinkSync(f);
    console.log(`🗑️ Deleted legacy ad-hoc test: ${f}`);
    deletedFiles.push({ path: f, type: 'LEGACY TEST SCRIPT' });
  }
});

// Delete scratch files
if (fs.existsSync('scratch')) {
  const scratchList = fs.readdirSync('scratch');
  scratchList.forEach(f => {
    const src = path.join('scratch', f);
    fs.unlinkSync(src);
    console.log(`🗑️ Deleted scratch file: ${src}`);
    deletedFiles.push({ path: src, type: 'SCRATCH ARTIFACT' });
  });
}

// Save summary of execution
fs.writeFileSync('scratch/cleanup_execution_summary.json', JSON.stringify({
  movedCount: movedFiles.length,
  movedFiles,
  deletedCount: deletedFiles.length,
  deletedFiles
}, null, 2));

console.log(`\n=== CLEANUP EXECUTION COMPLETE ===`);
console.log(`Total Files Moved: ${movedFiles.length}`);
console.log(`Total Files/Dirs Deleted: ${deletedFiles.length}`);
