// tests/test-sync-history-view.js
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const fileContent = fs.readFileSync(path.resolve('js/modules/verification/verification-landing.js'), 'utf8');

console.log('Testing Sync History View & Header Document Icon Implementation...');

// 1. Check icon dokumen kecil di header Tinjau Data Hari Ini
assert(fileContent.includes('btn-sync-history-from-tinjau'), 'Must have btn-sync-history-from-tinjau');
assert(fileContent.includes('id="btn-sync-history-from-tinjau" type="button" aria-label="Riwayat Pengiriman Server"'), 'Tinjau Data Hari Ini header must have sync history document icon button');

// 2. Check Pengiriman Berhasil header is clean
assert(!fileContent.includes('btn-sync-history-icon-success'), 'Pengiriman Berhasil must not have sync history icon');
assert(!fileContent.includes('btn-sync-history-icon-confirm'), 'Sync Confirmation must not have sync history icon');

// 3. Check SYNC_HISTORY view routing and function
assert(fileContent.includes("currentVerifView === 'SYNC_HISTORY'"), 'Must route SYNC_HISTORY');
assert(fileContent.includes('function renderSyncHistoryView'), 'Must have renderSyncHistoryView function');

// 4. Check date filter and status filter
assert(fileContent.includes('sync-history-date-input'), 'Must have date filter input');
assert(fileContent.includes('history-status-pill'), 'Must have status filter buttons');
assert(fileContent.includes("data-status=\"ALL\""), 'Must have ALL filter pill');
assert(fileContent.includes("data-status=\"BERHASIL\""), 'Must have BERHASIL filter pill');
assert(fileContent.includes("data-status=\"GAGAL\""), 'Must have GAGAL filter pill');

// 5. Check status labels per document
assert(fileContent.includes('Berhasil Terkirim'), 'Must render Berhasil Terkirim label');
assert(fileContent.includes('Gagal Terkirim'), 'Must render Gagal Terkirim label');

// 6. Check clean footer buttons
assert(fileContent.includes('btn-sync-history-back'), 'Must have Kembali button');
assert(fileContent.includes('btn-sync-history-home'), 'Must have Kembali ke Beranda button');

console.log('✓ All Sync History View assertions PASSED!');
