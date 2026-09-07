import fs from 'fs';

const task9 = fs.readFileSync('C:\\Users\\T1N0C\\.gemini\\antigravity-ide\\brain\\833fa311-ff34-4c30-ae55-6cc36bf96b4d\\scratch\\task9_full_content.txt', 'utf8');

// Find section with 28
const lines = task9.split('\n');
let inSection = false;
lines.forEach(l => {
  if (l.includes('28') && (l.includes('Revisi') || l.includes('REVISI') || l.includes('Revised'))) {
    inSection = true;
  }
  if (inSection) {
    console.log(l);
    if (l.includes('---') && l.trim() === '---') inSection = false;
  }
});
