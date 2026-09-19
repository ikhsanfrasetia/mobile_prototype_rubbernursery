import fs from 'fs';
import vm from 'vm';

const original = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = original.split('\n');

// Let's inspect line 835 to 845
console.log('--- LINE 835 to 845 ---');
console.log(lines.slice(834, 845).join('\n'));

// Let's inspect line 1210 to 1220
console.log('--- LINE 1210 to 1220 ---');
console.log(lines.slice(1209, 1220).join('\n'));

// Let's inspect line 1612 to 1622
console.log('--- LINE 1612 to 1622 ---');
console.log(lines.slice(1611, 1622).join('\n'));

// Let's inspect line 2005 to 2018
console.log('--- LINE 2005 to 2018 ---');
console.log(lines.slice(2004, 2018).join('\n'));

// Let's inspect line 2080 to 2090
console.log('--- LINE 2080 to 2090 ---');
console.log(lines.slice(2079, 2090).join('\n'));

// Let's inspect line 2248 to 2258
console.log('--- LINE 2248 to 2258 ---');
console.log(lines.slice(2247, 2258).join('\n'));
