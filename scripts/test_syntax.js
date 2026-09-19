import fs from 'fs';
import vm from 'vm';
import path from 'path';

function getAllFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, allFiles);
    } else if (fullPath.endsWith('.js')) {
      allFiles.push(fullPath);
    }
  }
  return allFiles;
}

const jsFiles = getAllFiles(path.resolve('./js'));
let hasError = false;

for (const file of jsFiles) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    new vm.SourceTextModule(code, { context: vm.createContext({}) });
  } catch (e) {
    console.log('ESM SYNTAX ERROR in file:', file, e.message);
    hasError = true;
  }
}

if (!hasError) {
  console.log('ALL ESM JS FILES PARSED SUCCESSFULLY WITH ZERO ERRORS!');
}
