import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SEARCH_DIRS = ['js', 'css', 'data', 'portal_patch', 'server'];

const TARGET_ROLES = [
  'PENGURUS',
  'MANTRI_TANAMAN',
  'PENGURUS_KEBUN_SEPUPU',
  'PENGURUS_KEBUN_SEPUKU', // check legacy typos
  'ASISTEN',
  'ASISTEN_BIBITAN',
  'ASKEP',
  'TEKNIKER_I',
  'KTU'
];

const TARGET_LABELS = [
  'Pengurus',
  'Mantri Bibitan',
  'Mantri Tanaman',
  'Pengurus Kebun Sepupu',
  'Pengurus Kebun Peminta',
  'Asisten',
  'Asisten Bibitan',
  'Asisten Divisi',
  'Asisten Kepala',
  'Askep',
  'Tekniker I',
  'KTU'
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'docs') {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.js', '.json', '.html', '.css', '.md'].includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = [];
SEARCH_DIRS.forEach(d => {
  const full = path.join(ROOT_DIR, d);
  if (fs.existsSync(full)) {
    getAllFiles(full, allFiles);
  }
});
// Also add root files like index.html, sw.js
['index.html', 'sw.js', 'package.json'].forEach(f => {
  const p = path.join(ROOT_DIR, f);
  if (fs.existsSync(p)) allFiles.push(p);
});

console.log(`Found ${allFiles.length} files to scan.`);

const roleOccurrences = [];

allFiles.forEach(filePath => {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  // Skip large historical report archives in scan if in scripts or data
  if (relPath.startsWith('scripts/classification_') || relPath.startsWith('scripts/gap_analysis_')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    TARGET_ROLES.forEach(roleKey => {
      // Look for role key
      const regex = new RegExp(`\\b${roleKey}\\b`, 'g');
      if (regex.test(line)) {
        roleOccurrences.push({
          relPath,
          lineNum,
          line: line.trim(),
          matched: roleKey,
          type: 'ROLE_KEY'
        });
      }
    });

    TARGET_LABELS.forEach(label => {
      if (line.includes(label)) {
        roleOccurrences.push({
          relPath,
          lineNum,
          line: line.trim(),
          matched: label,
          type: 'ROLE_LABEL'
        });
      }
    });
  });
});

console.log(`Total occurrences found: ${roleOccurrences.length}`);
fs.writeFileSync('scratch/role_raw_audit_results.json', JSON.stringify(roleOccurrences, null, 2));
console.log('Saved to scratch/role_raw_audit_results.json');
