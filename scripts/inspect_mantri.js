import fs from 'fs';
import vm from 'vm';

const code = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = code.split('\n');

// Extract lines 746 to 2500
const mantriLines = lines.slice(745, 2300);

// Let's test which line in mantriLines causes the template syntax error
for (let i = 40; i < mantriLines.length; i++) {
  const partial = 'function test() {\n' + mantriLines.slice(0, i).join('\n') + '\n`}';
  try {
    new vm.SourceTextModule(partial, { context: vm.createContext({}) });
  } catch (e) {
    if (!e.message.includes('Unexpected end of input') && !e.message.includes('Unterminated')) {
      // console.log(`Line ${746 + i}: ${e.message}`);
    }
  }
}

// Let's check how the activeMantriTab branches are closed
console.log('Line 818:', lines[817]); // activeMantriTab === 'PRE_GRAFTING'
console.log('Line 835:', lines[834]); // activePreGraftingTab === 'SELEKSI_1'
console.log('Line 1215:', lines[1214]); // activePreGraftingTab === 'SELEKSI_2'
console.log('Line 1617:', lines[1616]); // activePreGraftingTab === 'SELEKSI_3'
console.log('Line 2011:', lines[2010]); // activeMantriTab === 'PASCA_SEMAI'
console.log('Line 2085:', lines[2084]); // activeMantriTab === 'POST_GRAFTING'
console.log('Line 2252:', lines[2251]); // end of template
console.log('Line 2253:', lines[2252]);
console.log('Line 2254:', lines[2253]);
console.log('Line 2255:', lines[2254]);
console.log('Line 2256:', lines[2255]);
