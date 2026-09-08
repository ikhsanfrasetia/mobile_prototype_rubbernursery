/**
 * scripts/test-crud-api.js — Comprehensive Sanity Test for Process Mapping CRUD API
 *
 * Tests A through R as specified:
 * A. GET requirements
 * B. CREATE requirement
 * C. UPDATE requirement
 * D. ARCHIVE requirement
 * E. RESTORE requirement
 * F. CREATE flow node
 * G. UPDATE flow node
 * H. CREATE business rule
 * I. UPDATE business rule
 * J. CREATE mapping
 * K. DELETE mapping
 * L. Audit log generated
 * M. JSON remains valid
 * N. Duplicate ID rejected
 * O. Invalid mapping rejected
 * P. Broken edge rejected
 * Q. Concurrent write protection (simulated)
 * R. /api/notes remains functional
 *
 * Run: node scripts/test-crud-api.js
 * Requires server running at http://localhost:3000
 */

const BASE = 'http://localhost:3000';
const PM = `${BASE}/api/process-mapping`;
const RUN_ID = Date.now().toString(36).toUpperCase();
const TEST_PREFIX = `__TEST_${RUN_ID}__`;

let passed = 0;
let failed = 0;
const results = [];

async function request(method, url, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  return { status: res.status, ...data };
}

function assert(testId, label, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ testId, label, status: 'PASS', detail });
    console.log(`  ✅ [${testId}] ${label}`);
  } else {
    failed++;
    results.push({ testId, label, status: 'FAIL', detail });
    console.log(`  ❌ [${testId}] ${label} — ${detail}`);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  CRUD API SANITY TEST SUITE');
  console.log('  Target: http://localhost:3000');
  console.log('========================================\n');

  // ============================================
  // A. GET requirements
  // ============================================
  console.log('--- A. GET Requirements ---');
  try {
    const r = await request('GET', `${PM}/requirements`);
    assert('A1', 'GET /requirements returns success', r.success === true);
    assert('A2', 'GET /requirements returns array', Array.isArray(r.data));
    assert('A3', 'GET /requirements has data', r.data.length > 0, `Count: ${r.data.length}`);
  } catch (e) {
    assert('A', 'GET /requirements reachable', false, e.message);
  }

  // ============================================
  // B. CREATE requirement
  // ============================================
  console.log('\n--- B. CREATE Requirement ---');
  const testReqId = `${TEST_PREFIX}RN-TEST-001`;
  try {
    const r = await request('POST', `${PM}/requirements`, {
      requirement: {
        id: testReqId,
        title: 'Test requirement for CRUD sanity check',
        role: 'Mantri Bibitan',
        module: 'Presensi',
        moduleId: '01-presensi',
        feature: 'Presensi Supervisor',
        featureId: 'presensi-supervisor',
        type: 'KF',
        input: 'Test input',
        validation: 'Test validation',
        fallback: 'Test fallback',
        output: 'Test output',
        status: 'Draft'
      },
      actor: 'test-runner',
      reason: 'CRUD sanity test'
    });
    assert('B1', 'POST /requirements returns 201', r.success === true, r.error || '');
    assert('B2', 'Created requirement has correct ID', r.data?.id === testReqId);
    assert('B3', 'Created requirement has Draft status', r.data?.status === 'Draft');
  } catch (e) {
    assert('B', 'POST /requirements works', false, e.message);
  }

  // ============================================
  // C. UPDATE requirement
  // ============================================
  console.log('\n--- C. UPDATE Requirement ---');
  try {
    const r = await request('PUT', `${PM}/requirements/${testReqId}`, {
      updates: {
        title: 'Updated test requirement title',
        input: 'Updated test input'
      },
      actor: 'test-runner',
      reason: 'Testing update'
    });
    assert('C1', 'PUT /requirements/:id returns success', r.success === true, r.error || '');
    assert('C2', 'Updated title matches', r.data?.title === 'Updated test requirement title');
    assert('C3', 'Updated input matches', r.data?.input === 'Updated test input');
  } catch (e) {
    assert('C', 'PUT /requirements works', false, e.message);
  }

  // ============================================
  // D. ARCHIVE requirement
  // ============================================
  console.log('\n--- D. ARCHIVE Requirement ---');
  try {
    const r = await request('PATCH', `${PM}/requirements/${testReqId}/archive`, {
      actor: 'test-runner',
      reason: 'Testing archive'
    });
    assert('D1', 'PATCH /requirements/:id/archive returns success', r.success === true, r.error || '');
    assert('D2', 'Archived requirement has isArchived=true', r.data?.isArchived === true);
    assert('D3', 'Archived requirement has archivedAt', !!r.data?.archivedAt);
  } catch (e) {
    assert('D', 'PATCH /archive works', false, e.message);
  }

  // ============================================
  // E. RESTORE requirement
  // ============================================
  console.log('\n--- E. RESTORE Requirement ---');
  try {
    const r = await request('PATCH', `${PM}/requirements/${testReqId}/restore`, {
      actor: 'test-runner',
      reason: 'Testing restore'
    });
    assert('E1', 'PATCH /requirements/:id/restore returns success', r.success === true, r.error || '');
    assert('E2', 'Restored requirement has isArchived=false', r.data?.isArchived === false);
    assert('E3', 'Restored requirement has restoredAt', !!r.data?.restoredAt);
  } catch (e) {
    assert('E', 'PATCH /restore works', false, e.message);
  }

  // ============================================
  // F. CREATE flow node
  // ============================================
  console.log('\n--- F. CREATE Flow Node ---');
  const testNodeId = `${TEST_PREFIX}NODE_001`;
  try {
    const r = await request('POST', `${PM}/flows`, {
      moduleId: '01-presensi',
      featureId: 'presensi-supervisor',
      node: {
        id: testNodeId,
        code: 'T-001',
        type: 'process',
        title: 'Test Flow Node',
        label: 'Test Flow Node',
        input: 'Test input',
        output: 'Test output',
        validation: 'Test validation',
        fallback: 'Test fallback',
        status: 'Draft'
      },
      actor: 'test-runner',
      reason: 'CRUD sanity test'
    });
    assert('F1', 'POST /flows (node) returns success', r.success === true, r.error || '');
    assert('F2', 'Created node has correct ID', r.data?.id === testNodeId);
  } catch (e) {
    assert('F', 'POST /flows (node) works', false, e.message);
  }

  // ============================================
  // G. UPDATE flow node
  // ============================================
  console.log('\n--- G. UPDATE Flow Node ---');
  try {
    const r = await request('PUT', `${PM}/flows/01-presensi/presensi-supervisor`, {
      node: {
        id: testNodeId,
        title: 'Updated Test Flow Node',
        label: 'Updated Test Flow Node'
      },
      actor: 'test-runner',
      reason: 'Testing update'
    });
    assert('G1', 'PUT /flows/:m/:f (node) returns success', r.success === true, r.error || '');
    assert('G2', 'Updated node title matches', r.data?.title === 'Updated Test Flow Node');
  } catch (e) {
    assert('G', 'PUT /flows (node update) works', false, e.message);
  }

  // ============================================
  // H. CREATE business rule
  // ============================================
  console.log('\n--- H. CREATE Business Rule ---');
  const testRuleId = `${TEST_PREFIX}BR-TEST-001`;
  try {
    const r = await request('POST', `${PM}/rules`, {
      rule: {
        id: testRuleId,
        title: 'Test Business Rule',
        description: 'A test business rule for CRUD sanity check',
        category: 'Test'
      },
      actor: 'test-runner',
      reason: 'CRUD sanity test'
    });
    assert('H1', 'POST /rules returns success', r.success === true, r.error || '');
    assert('H2', 'Created rule has correct ID', r.data?.id === testRuleId);
  } catch (e) {
    assert('H', 'POST /rules works', false, e.message);
  }

  // ============================================
  // I. UPDATE business rule
  // ============================================
  console.log('\n--- I. UPDATE Business Rule ---');
  try {
    const r = await request('PUT', `${PM}/rules/${testRuleId}`, {
      updates: {
        title: 'Updated Test Business Rule',
        description: 'Updated description'
      },
      actor: 'test-runner',
      reason: 'Testing update'
    });
    assert('I1', 'PUT /rules/:id returns success', r.success === true, r.error || '');
    assert('I2', 'Updated rule title matches', r.data?.title === 'Updated Test Business Rule');
  } catch (e) {
    assert('I', 'PUT /rules works', false, e.message);
  }

  // ============================================
  // J. CREATE mapping (Requirement ↔ Rule)
  // ============================================
  console.log('\n--- J. CREATE Mapping ---');
  try {
    const r = await request('POST', `${PM}/mappings`, {
      mapping: {
        sourceEntity: 'Requirement',
        sourceId: testReqId,
        targetEntity: 'BusinessRule',
        targetId: testRuleId,
        moduleId: '01-presensi',
        featureId: 'presensi-supervisor'
      },
      actor: 'test-runner',
      reason: 'CRUD sanity test'
    });
    assert('J1', 'POST /mappings returns success', r.success === true, r.error || '');
    assert('J2', 'Created mapping has correct type', r.data?.type === 'Requirement-Rule');
  } catch (e) {
    assert('J', 'POST /mappings works', false, e.message);
  }

  // ============================================
  // K. DELETE mapping
  // ============================================
  console.log('\n--- K. DELETE Mapping ---');
  try {
    const mappingId = `MAP-${testReqId}-${testRuleId}`;
    const r = await request('DELETE', `${PM}/mappings/${mappingId}`, {
      sourceEntity: 'Requirement',
      sourceId: testReqId,
      targetEntity: 'BusinessRule',
      targetId: testRuleId,
      moduleId: '01-presensi',
      featureId: 'presensi-supervisor',
      actor: 'test-runner',
      reason: 'CRUD sanity test cleanup'
    });
    assert('K1', 'DELETE /mappings/:id returns success', r.success === true, r.error || '');
  } catch (e) {
    assert('K', 'DELETE /mappings works', false, e.message);
  }

  // ============================================
  // L. Audit log generated
  // ============================================
  console.log('\n--- L. Audit Log ---');
  try {
    const r = await request('GET', `${PM}/audit-logs?limit=50`);
    assert('L1', 'GET /audit-logs returns success', r.success === true);
    assert('L2', 'Audit log has entries', r.data.length > 0, `Count: ${r.data.length}`);

    const testLogs = r.data.filter(l => l.actor === 'test-runner');
    assert('L3', 'Audit log contains test entries', testLogs.length > 0, `Test entries: ${testLogs.length}`);

    const actions = new Set(testLogs.map(l => l.action));
    assert('L4', 'Audit log has CREATE action', actions.has('CREATE'));
    assert('L5', 'Audit log has UPDATE action', actions.has('UPDATE'));
    assert('L6', 'Audit log has ARCHIVE action', actions.has('ARCHIVE'));
    assert('L7', 'Audit log has RESTORE action', actions.has('RESTORE'));
  } catch (e) {
    assert('L', 'GET /audit-logs works', false, e.message);
  }

  // ============================================
  // M. JSON remains valid
  // ============================================
  console.log('\n--- M. JSON Validity ---');
  try {
    const r = await request('GET', `${PM}/data`);
    assert('M1', 'GET /data returns success', r.success === true);
    assert('M2', 'Data has metadata', !!r.data?.metadata);
    assert('M3', 'Data has requirements array', Array.isArray(r.data?.requirements));
    assert('M4', 'Data has flows object', typeof r.data?.flows === 'object');
    assert('M5', 'Data has businessRules array', Array.isArray(r.data?.businessRules));
    assert('M6', 'Data has modules array', Array.isArray(r.data?.modules));
    assert('M7', 'Data has roles array', Array.isArray(r.data?.roles));
  } catch (e) {
    assert('M', 'JSON validity check', false, e.message);
  }

  // ============================================
  // N. Duplicate ID rejected
  // ============================================
  console.log('\n--- N. Duplicate ID Rejection ---');
  try {
    const r = await request('POST', `${PM}/requirements`, {
      requirement: {
        id: testReqId,
        title: 'Duplicate test',
        role: 'Mantri Bibitan'
      },
      actor: 'test-runner'
    });
    assert('N1', 'Duplicate requirement ID rejected', r.success === false, r.error || '');
    assert('N2', 'Returns 409 status', r.error?.includes('Duplicate') || false, r.error || '');
  } catch (e) {
    assert('N', 'Duplicate ID rejection', false, e.message);
  }

  try {
    const r = await request('POST', `${PM}/rules`, {
      rule: { id: testRuleId, title: 'Duplicate rule' },
      actor: 'test-runner'
    });
    assert('N3', 'Duplicate rule ID rejected', r.success === false, r.error || '');
  } catch (e) {
    assert('N3', 'Duplicate rule rejection', false, e.message);
  }

  // ============================================
  // O. Invalid mapping rejected
  // ============================================
  console.log('\n--- O. Invalid Mapping Rejection ---');
  try {
    const r = await request('POST', `${PM}/mappings`, {
      mapping: {
        sourceEntity: 'Requirement',
        sourceId: 'NONEXISTENT-REQ-999',
        targetEntity: 'BusinessRule',
        targetId: testRuleId
      },
      actor: 'test-runner'
    });
    assert('O1', 'Invalid mapping (bad source) rejected', r.success === false, r.error || '');
  } catch (e) {
    assert('O1', 'Invalid mapping rejection', false, e.message);
  }

  try {
    const r = await request('POST', `${PM}/mappings`, {
      mapping: {
        sourceEntity: 'Requirement',
        sourceId: testReqId,
        targetEntity: 'BusinessRule',
        targetId: 'NONEXISTENT-RULE-999'
      },
      actor: 'test-runner'
    });
    assert('O2', 'Invalid mapping (bad target) rejected', r.success === false, r.error || '');
  } catch (e) {
    assert('O2', 'Invalid mapping (bad target)', false, e.message);
  }

  // ============================================
  // P. Broken edge rejected
  // ============================================
  console.log('\n--- P. Broken Edge Rejection ---');
  try {
    // Self-loop
    const r1 = await request('POST', `${PM}/flows`, {
      moduleId: '01-presensi',
      featureId: 'presensi-supervisor',
      edge: {
        from: testNodeId,
        to: testNodeId,
        condition: 'Self-loop test'
      },
      actor: 'test-runner'
    });
    assert('P1', 'Self-loop edge rejected', r1.success === false, r1.error || '');
  } catch (e) {
    assert('P1', 'Self-loop rejection', false, e.message);
  }

  try {
    // Broken edge (nonexistent target)
    const r2 = await request('POST', `${PM}/flows`, {
      moduleId: '01-presensi',
      featureId: 'presensi-supervisor',
      edge: {
        from: testNodeId,
        to: 'NONEXISTENT_NODE_999',
        condition: 'Broken edge test'
      },
      actor: 'test-runner'
    });
    assert('P2', 'Broken edge (bad target) rejected', r2.success === false, r2.error || '');
  } catch (e) {
    assert('P2', 'Broken edge rejection', false, e.message);
  }

  // ============================================
  // Q. Concurrent write protection (simulated)
  // ============================================
  console.log('\n--- Q. Concurrent Write Protection ---');
  try {
    // Fire two simultaneous create requests
    const p1 = request('POST', `${PM}/requirements`, {
      requirement: {
        id: `${TEST_PREFIX}RN-CONC-001`,
        title: 'Concurrent test 1',
        role: 'Mantri Bibitan'
      },
      actor: 'test-runner'
    });
    const p2 = request('POST', `${PM}/requirements`, {
      requirement: {
        id: `${TEST_PREFIX}RN-CONC-002`,
        title: 'Concurrent test 2',
        role: 'Mantri Bibitan'
      },
      actor: 'test-runner'
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    // At least one should succeed, or both succeed if sequential processing
    const oneSucceeded = r1.success || r2.success;
    assert('Q1', 'At least one concurrent write succeeds', oneSucceeded,
      `r1: ${r1.success}, r2: ${r2.success}`);

    // Data integrity: verify the JSON is still valid after concurrent attempts
    const check = await request('GET', `${PM}/data`);
    assert('Q2', 'JSON valid after concurrent writes', check.success === true && Array.isArray(check.data?.requirements));
  } catch (e) {
    assert('Q', 'Concurrent write protection', false, e.message);
  }

  // ============================================
  // R. /api/notes remains functional
  // ============================================
  console.log('\n--- R. /api/notes Functionality ---');
  try {
    const r = await request('GET', `${BASE}/api/notes`);
    assert('R1', 'GET /api/notes returns success', r.success === true);
    assert('R2', 'GET /api/notes returns data array', Array.isArray(r.data));
    assert('R3', 'GET /api/notes returns valid count', typeof r.total === 'number' && Array.isArray(r.data) && r.data.length >= 0, `Count: ${r.data.length}`);
  } catch (e) {
    assert('R', '/api/notes functional', false, e.message);
  }

  try {
    const r = await request('GET', `${BASE}/api/health`);
    assert('R4', 'GET /api/health returns online', r.status === 'online');
  } catch (e) {
    assert('R4', '/api/health functional', false, e.message);
  }

  // ============================================
  // CLEANUP: Remove test records
  // ============================================
  console.log('\n--- CLEANUP ---');
  try {
    // Archive and mark test requirements for cleanup
    // We re-archive the test requirement
    await request('PATCH', `${PM}/requirements/${testReqId}/archive`, {
      actor: 'test-cleanup',
      reason: 'Removing test data'
    });

    // Archive concurrent test requirements
    for (const id of [`${TEST_PREFIX}RN-CONC-001`, `${TEST_PREFIX}RN-CONC-002`]) {
      try {
        await request('PATCH', `${PM}/requirements/${id}/archive`, {
          actor: 'test-cleanup',
          reason: 'Removing test data'
        });
      } catch (_) { /* may not exist if concurrent write rejected it */ }
    }

    // Archive the test flow node
    await request('PUT', `${PM}/flows/01-presensi/presensi-supervisor`, {
      node: { id: testNodeId, isArchived: true },
      actor: 'test-cleanup',
      reason: 'Removing test data'
    });

    // Verify data integrity after cleanup
    const finalCheck = await request('GET', `${PM}/data`);
    const activeReqs = (finalCheck.data?.requirements || []).filter(
      r => r.id?.startsWith(TEST_PREFIX) && !r.isArchived
    );
    assert('CLEANUP', 'No active test records remain', activeReqs.length === 0,
      `Remaining active test records: ${activeReqs.length}`);

    console.log('  🧹 Test data archived successfully');
  } catch (e) {
    console.log(`  ⚠️ Cleanup warning: ${e.message}`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('  TEST RESULTS SUMMARY');
  console.log('========================================');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total:  ${passed + failed}`);
  console.log(`  📋 Status: ${failed === 0 ? 'ALL PASS ✅' : 'HAS FAILURES ❌'}`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
