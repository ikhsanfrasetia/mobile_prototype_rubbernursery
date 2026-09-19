import fs from 'fs';
import vm from 'vm';

const original = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = original.split('\n');

const seleksi1Code = lines.slice(835, 1213).join('\n');
const seleksi2Code = lines.slice(1215, 1615).join('\n');
const seleksi3Code = lines.slice(1617, 2009).join('\n');
const pascaSemaiCode = lines.slice(2011, 2083).join('\n');
const postGraftingCode = lines.slice(2085, 2251).join('\n');

const helpersCode = `
function renderSeleksi1Section(seleksi1Docs) {
  return \`
${seleksi1Code}
  \`;
}

function renderSeleksi2Section(seleksi2Docs) {
  return \`
${seleksi2Code}
  \`;
}

function renderSeleksi3Section(seleksi3Docs) {
  return \`
${seleksi3Code}
  \`;
}

function renderMantriPreGraftingSection(seleksi1Docs, seleksi2Docs, seleksi3Docs, activePreGraftingTab) {
  return \`
    <!-- SUB-TAB SELEKSI PRA-OKULASI: SELEKSI I vs SELEKSI II vs SELEKSI III -->
    <div style="display: flex; background: #F1F5F9; border-radius: 8px; padding: 4px; margin-bottom: 14px; gap: 4px;">
      <button id="subtab-seleksi-1" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: \${activePreGraftingTab === 'SELEKSI_1' ? '700' : '600'}; color: \${activePreGraftingTab === 'SELEKSI_1' ? '#116834' : '#64748B'}; background: \${activePreGraftingTab === 'SELEKSI_1' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: \${activePreGraftingTab === 'SELEKSI_1' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>Seleksi I</span>
        \${seleksi1Docs.length > 0 ? \`<span style="background: \${activePreGraftingTab === 'SELEKSI_1' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">\${seleksi1Docs.length}</span>\` : ''}
      </button>
      <button id="subtab-seleksi-2" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: \${activePreGraftingTab === 'SELEKSI_2' ? '700' : '600'}; color: \${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#64748B'}; background: \${activePreGraftingTab === 'SELEKSI_2' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: \${activePreGraftingTab === 'SELEKSI_2' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>Seleksi II</span>
        \${seleksi2Docs.length > 0 ? \`<span style="background: \${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">\${seleksi2Docs.length}</span>\` : ''}
      </button>
      <button id="subtab-seleksi-3" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: \${activePreGraftingTab === 'SELEKSI_3' ? '700' : '600'}; color: \${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#64748B'}; background: \${activePreGraftingTab === 'SELEKSI_3' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: \${activePreGraftingTab === 'SELEKSI_3' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>Seleksi III</span>
        \${seleksi3Docs.length > 0 ? \`<span style="background: \${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">\${seleksi3Docs.length}</span>\` : ''}
      </button>
    </div>

    \${activePreGraftingTab === 'SELEKSI_1' ? renderSeleksi1Section(seleksi1Docs) : (activePreGraftingTab === 'SELEKSI_2' ? renderSeleksi2Section(seleksi2Docs) : renderSeleksi3Section(seleksi3Docs))}
  \`;
}

function renderMantriPascaSemaiSection(pascaSemaiPool) {
  return \`
${pascaSemaiCode}
  \`;
}

function renderMantriPostGraftingSection(selectionPool, culledTxs, user, today, standardizeSelectionDocNo) {
  return \`
${postGraftingCode}
  \`;
}
`;

const part1 = lines.slice(0, 816).join('\n');
const part2 = lines.slice(2253).join('\n');

const fullNewCode = part1 + '\n' +
  '        ${activeMantriTab === \'PRE_GRAFTING\' ? renderMantriPreGraftingSection(seleksi1Docs, seleksi2Docs, seleksi3Docs, activePreGraftingTab) : (activeMantriTab === \'PASCA_SEMAI\' ? renderMantriPascaSemaiSection(pascaSemaiPool) : renderMantriPostGraftingSection(selectionPool, culledTxs, user, today, standardizeSelectionDocNo))}\n' +
  '      </main>\n' +
  '    </div>\n' +
  '  `;\n' +
  part2;

const finalResult = fullNewCode.replace(
  'function renderMantriSelectionLanding(app, user) {',
  helpersCode + '\n\nfunction renderMantriSelectionLanding(app, user) {'
);

try {
  new vm.SourceTextModule(finalResult, { context: vm.createContext({}) });
  console.log('CLEAN MODULAR REFACTOR PASSED PARSING WITH ZERO ERRORS!');
  fs.writeFileSync('js/modules/selection/selection-landing.js', finalResult, 'utf8');
} catch (e) {
  console.log('Refactor parse error:', e.message);
}
