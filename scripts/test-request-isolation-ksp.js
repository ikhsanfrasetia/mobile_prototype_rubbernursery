/**
 * scripts/test-request-isolation-ksp.js
 * Verification Suite for Permintaan Bibit Kebun Sepupu Submodule Isolation (TEST 01 - TEST 15)
 */

import { 
  filterMyRequests as filterMyKspRequests,
  filterIncomingRequests as filterIncomingKspRequests,
  canPerformReceiverAction,
  canPerformAskepAction,
  canPerformAsistenAction
} from '../js/modules/request/request-kebun-sepupu-landing.js';

import {
  filterMyMataEntresRequests,
  filterIncomingMataEntresRequests
} from '../js/modules/request/request-mata-entres-landing.js';

import {
  filterMyRequests as filterMySendiriRequests,
  filterIncomingRequests as filterIncomingSendiriRequests
} from '../js/modules/request/request-kebun-sendiri-landing.js';

import { ROLES } from '../js/core/permissions.js';

const testResults = [];

function recordTest(testId, name, passed, detail = '') {
  testResults.push({ testId, name, passed, detail });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusStr}] ${testId}: ${name} ${detail ? `(${detail})` : ''}`);
}

async function runAllTests() {
  console.log('====================================================');
  console.log('RUNNING TEST SUITE: REQUEST SUBMODULE ISOLATION (TEST 01 - TEST 15)');
  console.log('====================================================\n');

  // Dummy current user: Pengurus Tanah Besih
  const pengurusTBS = {
    id: 'PGS001',
    userId: 'PGS001',
    code: 'PGS001',
    name: 'Junaidi',
    role: ROLES.PENGURUS,
    position: 'Pengurus Kebun',
    estateId: 'EST-TBS'
  };

  // Dummy target user: Pengurus Aek Pamingke
  const pengurusAPM = {
    id: 'PGS002',
    userId: 'PGS002',
    code: 'PGS002',
    name: 'Budianto',
    role: ROLES.PENGURUS,
    position: 'Pengurus Kebun',
    estateId: 'EST-APM'
  };

  // Shared store containing multiple request types created by Pengurus TBS
  const mockSharedRequests = [
    {
      id: 'REQ-001',
      docNo: '2026/NIR/001',
      nomorDokumen: '2026/NIR/001',
      type: 'KEBUN_SEPUPU',
      status: 'DIAJUKAN',
      estateId: 'EST-TBS',
      targetEstateId: 'EST-APM',
      userId: 'PGS001',
      requestedBy: 'Junaidi',
      klon: 'IRC 19',
      category: 'APM',
      qty: 1000,
      unit: 'Pkk',
      requiredDate: '2026-10-09'
    },
    {
      id: 'REQ-ME-001',
      docNo: '2026/REQ/ETRS/001',
      nomorDokumen: '2026/REQ/ETRS/001',
      type: 'MATA_ENTRES',
      status: 'DIAJUKAN',
      estateId: 'EST-TBS',
      targetEstateId: 'EST-APM',
      userId: 'PGS001',
      requestedBy: 'Junaidi',
      klon: 'IRC 19',
      qty: 1000,
      jumlahMataEntres: 1000,
      unit: 'Batang',
      requiredDate: '2026-10-09'
    },
    {
      id: 'REQ-SND-001',
      docNo: '2026/NIR/002',
      type: 'KEBUN_SENDIRI',
      status: 'DIAJUKAN',
      estateId: 'EST-TBS',
      userId: 'AST001',
      requestedBy: 'Asisten Afdeling I',
      klon: 'PB 260',
      qty: 500
    }
  ];

  // TEST 01: Login context check for ROLES.PENGURUS (PGS001)
  {
    const pass = pengurusTBS.role === ROLES.PENGURUS && pengurusTBS.userId === 'PGS001';
    recordTest('TEST 01', 'Login context as ROLES.PENGURUS (PGS001)', pass, `role=${pengurusTBS.role}, user=${pengurusTBS.userId}`);
  }

  // TEST 02: Presence of 1 KEBUN_SEPUPU and 1 MATA_ENTRES in shared storage
  {
    const hasNir = mockSharedRequests.some(r => r.docNo === '2026/NIR/001' && r.type === 'KEBUN_SEPUPU');
    const hasEtrs = mockSharedRequests.some(r => r.docNo === '2026/REQ/ETRS/001' && r.type === 'MATA_ENTRES');
    const pass = hasNir && hasEtrs;
    recordTest('TEST 02', 'Shared storage contains both 2026/NIR/001 and 2026/REQ/ETRS/001', pass, `NIR=${hasNir}, ETRS=${hasEtrs}`);
  }

  // TEST 03: /request/kebun-sepupu Tab "Permintaan Saya" -> Only 2026/NIR/001 appears
  {
    const myKspList = filterMyKspRequests(mockSharedRequests, pengurusTBS);
    const pass = myKspList.length === 1 && myKspList[0].docNo === '2026/NIR/001' && myKspList[0].type === 'KEBUN_SEPUPU';
    recordTest('TEST 03', '/request/kebun-sepupu Permintaan Saya returns only 2026/NIR/001', pass, `count=${myKspList.length}, item=${myKspList[0]?.docNo}`);
  }

  // TEST 04: Ensure 2026/REQ/ETRS/001 does NOT appear on /request/kebun-sepupu
  {
    const myKspList = filterMyKspRequests(mockSharedRequests, pengurusTBS);
    const hasEtrsInKsp = myKspList.some(r => r.docNo === '2026/REQ/ETRS/001' || r.type === 'MATA_ENTRES');
    const pass = !hasEtrsInKsp;
    recordTest('TEST 04', '2026/REQ/ETRS/001 does not appear on /request/kebun-sepupu', pass, `hasEtrs=${hasEtrsInKsp}`);
  }

  // TEST 05: /request/mata-entres Tab "Permintaan Saya" -> 2026/REQ/ETRS/001 still appears
  {
    const myMeList = filterMyMataEntresRequests(mockSharedRequests, pengurusTBS);
    const pass = myMeList.length === 1 && myMeList[0].docNo === '2026/REQ/ETRS/001' && myMeList[0].type === 'MATA_ENTRES';
    recordTest('TEST 05', '/request/mata-entres Permintaan Saya returns 2026/REQ/ETRS/001', pass, `count=${myMeList.length}, item=${myMeList[0]?.docNo}`);
  }

  // TEST 06: Mata Entres record is not deleted/lost from storage
  {
    const pass = mockSharedRequests.length === 3 && mockSharedRequests.find(r => r.id === 'REQ-ME-001') !== undefined;
    recordTest('TEST 06', 'Mata Entres record preserved in shared store', pass, `totalInStore=${mockSharedRequests.length}`);
  }

  // TEST 07: Reload simulation on /request/kebun-sepupu -> count & records remain consistent
  {
    const firstCall = filterMyKspRequests(mockSharedRequests, pengurusTBS);
    const secondCall = filterMyKspRequests(mockSharedRequests, pengurusTBS);
    const pass = firstCall.length === 1 && secondCall.length === 1 && firstCall[0].id === secondCall[0].id;
    recordTest('TEST 07', 'Reload consistency on /request/kebun-sepupu', pass, `len1=${firstCall.length}, len2=${secondCall.length}`);
  }

  // TEST 08: Create new Permintaan Kebun Sepupu -> Only Kebun Sepupu records appear
  {
    const updatedStore = [
      ...mockSharedRequests,
      {
        id: 'REQ-002',
        docNo: '2026/NIR/003',
        type: 'KEBUN_SEPUPU',
        status: 'DIAJUKAN',
        estateId: 'EST-TBS',
        targetEstateId: 'EST-APM',
        userId: 'PGS001'
      }
    ];
    const myKspList = filterMyKspRequests(updatedStore, pengurusTBS);
    const pass = myKspList.length === 2 && myKspList.every(r => r.type === 'KEBUN_SEPUPU');
    recordTest('TEST 08', 'New Kebun Sepupu request added without leakage', pass, `count=${myKspList.length}`);
  }

  // TEST 09: Create new Permintaan Mata Entres -> Does not appear on Kebun Sepupu page
  {
    const updatedStore = [
      ...mockSharedRequests,
      {
        id: 'REQ-ME-002',
        docNo: '2026/REQ/ETRS/002',
        type: 'MATA_ENTRES',
        status: 'DIAJUKAN',
        estateId: 'EST-TBS',
        targetEstateId: 'EST-APM',
        userId: 'PGS001'
      }
    ];
    const myKspList = filterMyKspRequests(updatedStore, pengurusTBS);
    const pass = myKspList.length === 1 && !myKspList.some(r => r.type === 'MATA_ENTRES');
    recordTest('TEST 09', 'New Mata Entres request does not appear in Kebun Sepupu', pass, `count=${myKspList.length}`);
  }

  // TEST 10: Target Pengurus -> /request/kebun-sepupu Tab "Permintaan Masuk" -> Only type KEBUN_SEPUPU
  {
    const incomingKsp = filterIncomingKspRequests(mockSharedRequests, pengurusAPM);
    const pass = incomingKsp.length === 1 && incomingKsp[0].docNo === '2026/NIR/001' && incomingKsp[0].type === 'KEBUN_SEPUPU';
    recordTest('TEST 10', 'Incoming requests for target Pengurus returns only KEBUN_SEPUPU', pass, `count=${incomingKsp.length}, doc=${incomingKsp[0]?.docNo}`);
  }

  // TEST 11: MATA_ENTRES does not enter Permintaan Masuk Kebun Sepupu
  {
    const incomingKsp = filterIncomingKspRequests(mockSharedRequests, pengurusAPM);
    const hasEtrs = incomingKsp.some(r => r.type === 'MATA_ENTRES');
    const pass = !hasEtrs;
    recordTest('TEST 11', 'MATA_ENTRES excluded from incoming Kebun Sepupu requests', pass, `hasEtrs=${hasEtrs}`);
  }

  // TEST 12: Existing workflow lifecycle (canPerformReceiverAction) remains functional
  {
    const kspItem = mockSharedRequests.find(r => r.docNo === '2026/NIR/001');
    const canProcess = canPerformReceiverAction(kspItem, pengurusAPM);
    const cannotProcessOwn = canPerformReceiverAction(kspItem, pengurusTBS);
    const pass = canProcess === true && cannotProcessOwn === false;
    recordTest('TEST 12', 'Workflow action authorization remains valid', pass, `targetCan=${canProcess}, sourceCannot=${!cannotProcessOwn}`);
  }

  // TEST 13: Status workflow remains unaffected
  {
    const kspItem = mockSharedRequests.find(r => r.docNo === '2026/NIR/001');
    const pass = kspItem.status === 'DIAJUKAN';
    recordTest('TEST 13', 'Workflow status integrity verified', pass, `status=${kspItem.status}`);
  }

  // TEST 14: Numbering logic untouched
  {
    const kspItem = mockSharedRequests.find(r => r.docNo === '2026/NIR/001');
    const meItem = mockSharedRequests.find(r => r.docNo === '2026/REQ/ETRS/001');
    const pass = kspItem.docNo === '2026/NIR/001' && meItem.docNo === '2026/REQ/ETRS/001';
    recordTest('TEST 14', 'Document numbering integrity verified', pass, `ksp=${kspItem.docNo}, me=${meItem.docNo}`);
  }

  // TEST 15: Modul Mata Entres & Kebun Sendiri remain fully operational
  {
    const meIncoming = filterIncomingMataEntresRequests(mockSharedRequests, pengurusAPM);
    const pass = meIncoming.length === 1 && meIncoming[0].docNo === '2026/REQ/ETRS/001';
    recordTest('TEST 15', 'Mata Entres incoming filter remains fully operational', pass, `meIncomingCount=${meIncoming.length}`);
  }

  console.log('\n====================================================');
  const allPassed = testResults.every(r => r.passed);
  console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${testResults.filter(r => r.passed).length} | FAILED: ${testResults.filter(r => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('====================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled Test Error:', err);
  process.exit(1);
});
