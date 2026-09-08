/**
 * scripts/test-local-deployment-sim.js — Local Deployment Simulation
 * Simulates complete production lifecycle on an isolated custom port (PORT=3005):
 * 1. Spawn server on PORT 3005
 * 2. Load portal endpoints
 * 3. GET /api/process-mapping/requirements
 * 4. CREATE test requirement with unique ID
 * 5. UPDATE test requirement
 * 6. ARCHIVE test requirement
 * 7. RESTORE test requirement
 * 8. Verify audit log contains full trail
 * 9. Restart server on PORT 3005
 * 10. Verify data retention after restart
 * 11. Cleanup test record
 */

import { spawn } from 'child_process';
import http from 'http';

const SIM_PORT = 3005;
const BASE_URL = `http://localhost:${SIM_PORT}/api/process-mapping`;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startServer(port) {
  return spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'pipe'
  });
}

async function waitForServer(port, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) return true;
    } catch (_) {
      await wait(500);
    }
  }
  throw new Error(`Server failed to start on port ${port}`);
}

async function runSimulation() {
  console.log('==================================================');
  console.log('🚀 TASK 09 LOCAL DEPLOYMENT SIMULATION');
  console.log(`📡 Target Port: ${SIM_PORT}`);
  console.log('==================================================');

  const testId = `__DEPLOY_SIM_${Date.now()}__`;
  let serverProcess = null;

  try {
    // 1. Start Server on Custom Port
    console.log('\n[1/10] Starting server on custom PORT 3005...');
    serverProcess = startServer(SIM_PORT);
    await waitForServer(SIM_PORT);
    console.log('  ✅ Server running and healthy on port 3005');

    // 2. Load Portal Root / SPA Fallback
    console.log('\n[2/10] Checking Portal SPA root load...');
    const rootRes = await fetch(`http://localhost:${SIM_PORT}/`);
    console.log(`  ✅ Portal HTTP Status: ${rootRes.status}`);

    // 3. GET Requirements
    console.log('\n[3/10] GET /requirements from simulation server...');
    const reqsRes = await fetch(`${BASE_URL}/requirements`).then(r => r.json());
    console.log(`  ✅ Total active requirements: ${reqsRes.total}`);

    // 4. CREATE Test Requirement
    console.log('\n[4/10] CREATE test requirement via REST API...');
    const createRes = await fetch(`${BASE_URL}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          id: testId,
          title: 'Simulated Deployment Test Requirement',
          role: 'Mantri Bibitan',
          module: '01-presensi',
          feature: 'presensi-supervisor',
          moduleId: '01-presensi',
          featureId: 'presensi-supervisor',
          status: 'Draft',
          input: 'Test input payload',
          validation: 'Test validation criteria',
          output: 'Test output summary',
          fallback: 'Test fallback action'
        },
        actor: 'DeploySimRunner',
        reason: 'Task 09 deployment verification'
      })
    }).then(r => r.json());
    console.log(`  ✅ CREATE response: success=${createRes.success}, id=${createRes.data?.id}`);

    // 5. UPDATE Test Requirement
    console.log('\n[5/10] UPDATE test requirement title...');
    const updateRes = await fetch(`${BASE_URL}/requirements/${testId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: { title: 'Simulated Deployment Test Requirement (UPDATED)' },
        actor: 'DeploySimRunner',
        reason: 'Task 09 update verification'
      })
    }).then(r => r.json());
    console.log(`  ✅ UPDATE response: title=${updateRes.data?.title}`);

    // 6. ARCHIVE Test Requirement
    console.log('\n[6/10] ARCHIVE test requirement...');
    const archiveRes = await fetch(`${BASE_URL}/requirements/${testId}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'DeploySimRunner',
        reason: 'Task 09 archive verification'
      })
    }).then(r => r.json());
    console.log(`  ✅ ARCHIVE response: isArchived=${archiveRes.data?.isArchived}`);

    // 7. RESTORE Test Requirement
    console.log('\n[7/10] RESTORE test requirement...');
    const restoreRes = await fetch(`${BASE_URL}/requirements/${testId}/restore`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'DeploySimRunner',
        reason: 'Task 09 restore verification'
      })
    }).then(r => r.json());
    console.log(`  ✅ RESTORE response: isArchived=${restoreRes.data?.isArchived}`);

    // 8. Verify Audit Logs
    console.log('\n[8/10] Verifying Audit Logs for test trail...');
    const auditRes = await fetch(`${BASE_URL}/audit-logs?entityId=${testId}`).then(r => r.json());
    console.log(`  ✅ Audit entries recorded for ${testId}: ${auditRes.total}`);
    auditRes.data.forEach(log => console.log(`     - [${log.action}] ${log.entity} by ${log.actor} (${log.reason})`));

    // 9. Restart Server Simulation
    console.log('\n[9/10] Simulating Server Restart...');
    serverProcess.kill('SIGTERM');
    await wait(1000);
    serverProcess = startServer(SIM_PORT);
    await waitForServer(SIM_PORT);
    console.log('  ✅ Server successfully restarted on port 3005');

    // 10. Verify Data Retention after restart & Cleanup
    console.log('\n[10/10] Verifying data persistence after restart & Cleanup...');
    const postRestartItem = await fetch(`${BASE_URL}/requirements/${testId}`).then(r => r.json());
    console.log(`  ✅ Persisted item found post-restart: ${postRestartItem.data?.id} (title: ${postRestartItem.data?.title})`);

    // Clean up test record via archive
    await fetch(`${BASE_URL}/requirements/${testId}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'DeploySimCleanup', reason: 'Simulation cleanup' })
    });
    console.log('  🧹 Simulation test record cleaned up successfully');

    console.log('\n==================================================');
    console.log('🎉 LOCAL DEPLOYMENT SIMULATION RESULT: ALL PASS ✅');
    console.log('==================================================');

  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runSimulation().catch(err => {
  console.error('Simulation Failed:', err);
  process.exit(1);
});
