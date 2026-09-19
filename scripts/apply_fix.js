import fs from 'fs';
import vm from 'vm';

let code = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');

const target = `                \`;
              })()}
            \`}
        \` : activeMantriTab === 'PASCA_SEMAI' ? \``;

const replacement = `                \`;
              })()}
            \`}
          \`}
        \` : activeMantriTab === 'PASCA_SEMAI' ? \``;

let fixed = code.replace(target, replacement);

try {
  new vm.SourceTextModule(fixed, { context: vm.createContext({}) });
  console.log('PARSER VALIDATION PASSED 100%!');
  fs.writeFileSync('js/modules/selection/selection-landing.js', fixed, 'utf8');
} catch (e) {
  console.log('Parser error:', e.message);
}
