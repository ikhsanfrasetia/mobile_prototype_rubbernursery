// Comprehensive diagnostic script for auditing all module imports, exports, and circular dependencies across the codebase
import fs from 'fs';
import path from 'path';
import vm from 'vm';

console.log('=== COMPREHENSIVE MODULE DIAGNOSTIC AUDIT ===');

const allFiles = [];
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'assets') {
        collectFiles(fullPath);
      }
    } else if (entry.name.endsWith('.js')) {
      allFiles.push(fullPath);
    }
  }
}

collectFiles('./js');

console.log(`Auditing ${allFiles.length} JS files...`);

let syntaxErrors = [];
let missingImports = [];
let duplicateImports = [];

for (const file of allFiles) {
  const code = fs.readFileSync(file, 'utf8');
  
  // 1. VM Module Syntax Parsing
  try {
    new vm.SourceTextModule(code, { initializeImportMeta() {} });
  } catch (err) {
    syntaxErrors.push({ file, error: err.message });
  }

  // 2. Check import targets
  const importLines = code.split('\n');
  const fileDir = path.dirname(file);
  const importedInThisFile = new Map();

  for (let i = 0; i < importLines.length; i++) {
    const line = importLines[i].trim();
    if (line.startsWith('import ')) {
      // Check duplicate imported names
      const matchNames = line.match(/import\s+\{([^}]+)\}/);
      if (matchNames) {
        const names = matchNames[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
        for (const name of names) {
          if (importedInThisFile.has(name)) {
            duplicateImports.push({
              file,
              name,
              lineFirst: importedInThisFile.get(name),
              lineSecond: i + 1
            });
          } else {
            importedInThisFile.set(name, i + 1);
          }
        }
      }

      // Check path resolution
      const matchPath = line.match(/from\s+['"](.*?)['"]/);
      if (matchPath) {
        const importTarget = matchPath[1];
        if (importTarget.startsWith('.')) {
          const resolved = path.resolve(fileDir, importTarget);
          if (!fs.existsSync(resolved)) {
            missingImports.push({ file, line: i + 1, target: importTarget, resolved });
          }
        }
      }
    }
  }
}

console.log('\n--- 1. Syntax / Module Instantiation Errors ---');
if (syntaxErrors.length === 0) {
  console.log('✅ No syntax errors found.');
} else {
  syntaxErrors.forEach(e => console.log(`❌ SYNTAX ERROR in ${e.file}:\n   -> ${e.error}`));
}

console.log('\n--- 2. Duplicate Imported Identifiers ---');
if (duplicateImports.length === 0) {
  console.log('✅ No duplicate imports found.');
} else {
  duplicateImports.forEach(d => console.log(`❌ DUPLICATE IMPORT: '${d.name}' in ${d.file} (Line ${d.lineFirst} and Line ${d.lineSecond})`));
}

console.log('\n--- 3. Missing Import Paths ---');
if (missingImports.length === 0) {
  console.log('✅ No missing import paths found.');
} else {
  missingImports.forEach(m => console.log(`❌ MISSING IMPORT: in ${m.file}:${m.line} -> Target "${m.target}"`));
}

console.log('\n--- 4. Circular Dependency & Core Module Graph Audit ---');
const coreFiles = [
  './js/core/session.js',
  './js/core/user-context.js',
  './js/data/demo-personas.js',
  './js/components/drawer.js',
  './js/core/transaction-actor.js',
  './js/modules/transactions/transaction-manager.js'
];

coreFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const importLines = code.split('\n').filter(l => l.trim().startsWith('import '));
  console.log(`\nModule: ${file}`);
  importLines.forEach(l => console.log(`  ${l.trim()}`));
});

