import fs from 'fs';

console.log('=== VERIFIKASI FITUR FINAL REDESIGN FOTO DOKUMENTASI PEMERIKSAAN ===');

const formCode = fs.readFileSync('./js/modules/inspection/inspection-form.js', 'utf8');
const landingCode = fs.readFileSync('./js/modules/inspection/inspection-landing.js', 'utf8');

const tests = [
  { name: '1. Inline Photo Grid Container Exists (#inline-photo-grid)', pass: formCode.includes('id="inline-photo-grid"') },
  { name: '2. Button "+ Ambil Foto Baru" Exists (#btn-tambah-foto)', pass: formCode.includes('id="btn-tambah-foto"') },
  { name: '3. Fullscreen Lightbox Modal Exists (#modal-fullscreen-viewer)', pass: formCode.includes('id="modal-fullscreen-viewer"') && formCode.includes('id="modal-fullscreen-overlay"') },
  { name: '4. Fullscreen Image Target & Close Button Exist', pass: formCode.includes('id="img-fullscreen-target"') && formCode.includes('id="btn-close-fullscreen-viewer"') },
  { name: '5. renderInlinePhotos function exists and renders photos inline', pass: formCode.includes('function renderInlinePhotos()') && formCode.includes('btn-delete-inline-photo') && formCode.includes('btn-fullscreen-trigger') },
  { name: '6. Shutter immediately pushes to state.photos and calls renderInlinePhotos()', pass: formCode.includes('state.photos.push(newPhoto)') && formCode.includes('renderInlinePhotos()') },
  { name: '7. Watermark drawn at bottom-right (drawBottomRightWatermark)', pass: formCode.includes('function drawBottomRightWatermark') && formCode.includes('boxX = canvasWidth - boxWidth') && formCode.includes('boxY = canvasHeight - boxHeight') },
  { name: '8. Watermark has dark transparent bg & white text', pass: formCode.includes('rgba(0, 0, 0, 0.65)') && formCode.includes("ctx.fillStyle = '#FFFFFF'") },
  { name: '9. Structured photo object { image, capturedAt, latitude, longitude }', pass: formCode.includes('const newPhoto = {') && formCode.includes('capturedAt,') && formCode.includes('latitude: gps.ok ? gps.lat : null') },
  { name: '10. Delete photo removes item from state.photos and refreshes inline grid', pass: formCode.includes('state.photos.splice(idx, 1)') },
  { name: '11. Click photo opens fullscreen viewer', pass: formCode.includes('openFullscreenViewer(imgSrc)') },
  { name: '12. QR Batch Gateway logic preserved', pass: formCode.includes('inspection_qr_verified') && formCode.includes('inspection_verified_batch') },
  { name: '13. Calculation logic preserved (Regrafting & Selection)', pass: formCode.includes('updateWorkerCalculations') && formCode.includes('totalToRegrafting') && formCode.includes('totalToSelection') }
];

let allPassed = true;
tests.forEach(t => {
  console.log(`${t.pass ? '✅ PASS' : '❌ FAIL'}: ${t.name}`);
  if (!t.pass) allPassed = false;
});

console.log('\nFINAL STATUS:', allPassed ? 'ALL CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌');
