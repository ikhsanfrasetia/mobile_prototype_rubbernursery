import fs from 'fs';
import vm from 'vm';

const original = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = original.split('\n');

const seleksi1Code = lines.slice(835, 1214).join('\n');
const seleksi2Code = lines.slice(1215, 1616).join('\n');
const seleksi3Code = lines.slice(1617, 2010).join('\n');
const pascaSemaiCode = lines.slice(2011, 2084).join('\n');
const postGraftingCode = lines.slice(2085, 2252).join('\n');

function test(name, body) {
  // body is already inside a template literal expression from the original code
  // Let's test if body starts with HTML and ends with `}
  const code = 'function ' + name + '() {\n  return `' + body + ';\n}';
  try {
    new vm.SourceTextModule(code, { context: vm.createContext({}) });
    console.log(name + ': SUCCESS');
  } catch (e) {
    console.log(name + ': ERROR - ' + e.message);
  }
}

test('renderSeleksi1', seleksi1Code);
test('renderSeleksi2', seleksi2Code);
test('renderSeleksi3', seleksi3Code);
test('renderPascaSemai', pascaSemaiCode);
test('renderPostGrafting', postGraftingCode);
