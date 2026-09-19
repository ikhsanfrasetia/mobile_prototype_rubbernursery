import fs from 'fs';
import vm from 'vm';

let code = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = code.split('\n');

// Find line where `: activeMantriTab === 'PASCA_SEMAI' ?` is located
const targetIdx = lines.findIndex((l, idx) => idx > 1000 && l.includes("activeMantriTab === 'PASCA_SEMAI'"));
console.log('Target line index:', targetIdx, lines[targetIdx]);

// Insert `          `}\r before targetIdx
lines.splice(targetIdx, 0, '          `}');

const fixed = lines.join('\n');

try {
  new vm.SourceTextModule(fixed, { context: vm.createContext({}) });
  console.log('SUCCESS: FIXED SELECTION-LANDING.JS WITH ZERO SYNTAX ERRORS!');
  fs.writeFileSync('js/modules/selection/selection-landing.js', fixed, 'utf8');
} catch (e) {
  console.log('Error after insert:', e.message);
}
