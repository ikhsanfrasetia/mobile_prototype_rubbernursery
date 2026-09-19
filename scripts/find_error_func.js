import fs from 'fs';
import vm from 'vm';

const code = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = code.split('\n');

console.log('Total lines:', lines.length);

// Let's test functions individually
let currentFunction = '';
let inFunc = false;
let funcStart = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.match(/^export function|^function/)) {
    if (inFunc) {
      try {
        new vm.SourceTextModule(currentFunction, { context: vm.createContext({}) });
      } catch (e) {
        console.log(`Error in function starting at line ${funcStart}: ${e.message}`);
      }
    }
    inFunc = true;
    funcStart = i + 1;
    currentFunction = line + '\n';
  } else if (inFunc) {
    currentFunction += line + '\n';
  }
}

if (inFunc) {
  try {
    new vm.SourceTextModule(currentFunction, { context: vm.createContext({}) });
  } catch (e) {
    console.log(`Error in function starting at line ${funcStart}: ${e.message}`);
  }
}
