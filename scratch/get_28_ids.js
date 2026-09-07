import fs from 'fs';

const task9 = fs.readFileSync('C:\\Users\\T1N0C\\.gemini\\antigravity-ide\\brain\\833fa311-ff34-4c30-ae55-6cc36bf96b4d\\scratch\\task9_full_content.txt', 'utf8');

const lines = task9.split('\n');
const revRows = [];
lines.forEach(l => {
  if (l.includes('| **`RN-') && l.includes('|')) {
    const match = l.match(/\| \*\*`([^`]+)`\*\* \|/);
    if (match) {
      revRows.push(match[1]);
    }
  }
});

console.log('Total extracted:', revRows.length);
console.log(revRows);
