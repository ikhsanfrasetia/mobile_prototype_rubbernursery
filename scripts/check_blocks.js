import fs from 'fs';
import vm from 'vm';

const original = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = original.split('\n');

function checkBlock(start, end, label) {
  const block = lines.slice(start - 1, end).join('\n');
  console.log(`=== ${label} (lines ${start} to ${end}) ===`);
  try {
    new vm.SourceTextModule('const test = `' + block + '`;', { context: vm.createContext({}) });
    console.log(`${label}: PARSE SUCCESS!`);
  } catch (e) {
    console.log(`${label}: PARSE ERROR: ${e.message}`);
  }
}

checkBlock(836, 1214, 'SELEKSI_1');
checkBlock(1216, 1616, 'SELEKSI_2');
checkBlock(1618, 2010, 'SELEKSI_3');
checkBlock(2012, 2084, 'PASCA_SEMAI');
checkBlock(2086, 2252, 'POST_GRAFTING');
