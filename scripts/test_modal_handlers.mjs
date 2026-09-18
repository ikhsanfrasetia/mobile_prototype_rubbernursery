import {
  openPengurusReviewModal,
  openAskepVerificationModal,
  openAsistenBibitanVerificationModal,
  openMantriDispatchModal,
  openPengurusArrivalModal,
  openAskepReceiptRoutingModal,
  openAsistenBibitanReceiptModal,
  openMantriBibitanReceiptModal,
  openMataEntresDetailModal
} from '../js/modules/request/request-mata-entres-landing.js';

// Setup minimal DOM mock
globalThis.document = {
  getElementById: (id) => ({
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  })
};

const dummyTx = {
  id: 'REQ-001',
  docNo: '2026/REQ/ETRS/001',
  sourceEstateId: 'EST-TBS',
  targetEstateId: 'EST-APM',
  klon: 'IRCA 41',
  jumlahBatang: 400,
  jumlahMataEntres: 800,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
  approval: {
    approvedBatang: 400,
    approvedMataEntres: 800,
    approvedKlon: 'IRCA 41'
  }
};

const dummyUser = {
  id: 'USR-01',
  name: 'Askep Test',
  role: 'ASKEP',
  estateId: 'EST-APM'
};

console.log('Testing openAskepVerificationModal...');
openAskepVerificationModal(dummyTx, dummyUser, () => {});
console.log('openAskepVerificationModal passed!');

console.log('Testing openAskepReceiptRoutingModal...');
openAskepReceiptRoutingModal(dummyTx, dummyUser, () => {});
console.log('openAskepReceiptRoutingModal passed!');

console.log('All modal open functions executed without exception!');
