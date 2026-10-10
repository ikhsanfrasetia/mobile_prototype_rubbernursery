// tests/test-returned-documents-report.js
import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('Testing Daftar Dokumen Dikembalikan Report Implementation...');

// 1. Check reports-landing.js
const landingContent = fs.readFileSync(path.resolve('js/modules/reports/reports-landing.js'), 'utf8');
assert(landingContent.includes('daftar-dokumen-dikembalikan'), 'Must have daftar-dokumen-dikembalikan menu');
assert(landingContent.includes('Daftar Dokumen<br>Dikembalikan'), 'Must have title Daftar Dokumen Dikembalikan');
assert(landingContent.includes('/reports/returned-docs'), 'Must have route /reports/returned-docs');
assert(landingContent.includes('getReturnedDocumentsData'), 'Must import getReturnedDocumentsData');

// 2. Check app.js route registration
const appContent = fs.readFileSync(path.resolve('js/app.js'), 'utf8');
assert(appContent.includes('/reports/returned-docs'), 'Must register /reports/returned-docs route in app.js');
assert(appContent.includes('renderReturnedDocumentsReport'), 'Must import renderReturnedDocumentsReport in app.js');

// 3. Check returned-documents-report.js file
const reportContent = fs.readFileSync(path.resolve('js/modules/reports/returned-documents-report.js'), 'utf8');
assert(reportContent.includes('function renderReturnedDocumentsReport'), 'Must export renderReturnedDocumentsReport');
assert(reportContent.includes('function getReturnedDocumentsData'), 'Must export getReturnedDocumentsData');
assert(reportContent.includes('MENUNGGU_REVISI'), 'Must handle MENUNGGU_REVISI status');
assert(reportContent.includes('SUDAH_DIAJUKAN'), 'Must handle SUDAH_DIAJUKAN status');
assert(reportContent.includes('TELAH_DISETUJUI'), 'Must handle TELAH_DISETUJUI status');
assert(reportContent.includes('Alasan Pengembalian:'), 'Must show Alasan Pengembalian section');
assert(reportContent.includes('btn-view-ret-detail'), 'Must provide view detail action');

console.log('✓ All Daftar Dokumen Dikembalikan assertions PASSED!');
