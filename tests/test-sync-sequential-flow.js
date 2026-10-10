import assert from 'node:assert';
import fs from 'node:fs';

const code = fs.readFileSync('js/modules/verification/verification-landing.js', 'utf8');

console.log('Testing Sync Sequential Loading Implementation...');

// 1. Check sequential animation loop exists
assert(code.includes('for (let i = 0; i < itemsToSend.length; i++)'), 'Sequential loop exists');

// 2. Check loading spinner badge exists
assert(code.includes('syncSpin'), 'CSS keyframes for syncSpin exists');
assert(code.includes('Mengirim...'), 'Badge Mengirim... with spinner exists');

// 3. Check green checkmark SVG per item exists
assert(code.includes('<polyline points="20 6 9 17 4 12"></polyline>'), 'Green checkmark polyline points exist');
assert(code.includes('Terkirim'), 'Badge Terkirim exists');

// 4. Check delay and auto-scroll exists
assert(code.includes('delayPerDoc'), 'delayPerDoc exists');
assert(code.includes('scrollIntoView'), 'scrollIntoView for active item exists');

// 5. Check progress bar exists
assert(code.includes('sync-progress-bar'), 'Progress bar exists');

// 6. Check clean buttons without icons: Kembali ke Beranda and Kirim Ulang
assert(code.includes('btn-sync-finish-home-screen'), 'Kembali ke Beranda button exists');
assert(code.includes('btn-sync-retry-screen'), 'Kirim Ulang button exists');

console.log('✓ All Sync Sequential Loading assertions PASSED!');
