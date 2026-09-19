import fs from 'fs';
import vm from 'vm';

const code = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = code.split('\n');

// Find all template expressions inside renderMantriSelectionLanding (from line 783 to 2260)
for (let i = 783; i < 2260; i++) {
  // Let's test substrings
  const sub = lines.slice(783, i).join('\n');
  const countOpen = (sub.match(/\${/g) || []).length;
  const countClose = (sub.match(/}/g) || []).length;
  const countBacktick = (sub.match(/`/g) || []).length;
  if (lines[i].includes('`') || lines[i].includes('${') || lines[i].includes('}')) {
    // console.log(`${i+1}: backticks=${countBacktick}, open=\${${countOpen}}, close=}${countClose} | ${lines[i].trim().slice(0, 50)}`);
  }
}

// Let's write a small scanner that tracks template literal depth and ${} stack
let depth = 0;
let stack = [];
for (let i = 783; i < 2260; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const next = line[j+1];
    if (char === '`') {
      // Toggle or stack
    }
  }
}
