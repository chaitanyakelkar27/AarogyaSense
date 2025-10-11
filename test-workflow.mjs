#!/usr/bin/env node

/**
 * Automated Integration Test Script
 * Tests the complete CHW → ASHA → Notification workflow
 * 
 * Usage: node test-workflow.mjs
 */

const BASE_URL = 'http://localhost:5173';
const API_URL = BASE_URL;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function header(message) {
  log(`\n${'='.repeat(60)}`, 'bold');
  log(`${message}`, 'bold');
  log(`${'='.repeat(60)}`, 'bold');
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      responseTime
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    return {
      ok: false,
      status: 0,
      error: err.message,
      responseTime
    };
  }
}

async function authenticateUser(email, password) {
  info(`Authenticating as ${email}...`);
  
  const response = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (response.ok && response.data.token) {
    success(`Authenticated successfully (${response.responseTime}ms)`);
    return response.data.token;
  } else {
    error(`Authentication failed: ${response.data.error || 'Unknown error'}`);
    return null;
  }
}

async function testAPIPerformance() {
  header('TEST 1: API Performance');
  
  const tests = [
    { name: 'GET /api/chw', endpoint: '/api/chw', threshold: 200 },
    { name: 'GET /api/cases', endpoint: '/api/cases?limit=10', threshold: 300 },
    { name: 'GET /api/analytics/chw-performance', endpoint: '/api/analytics/chw-performance?days=7', threshold: 500 },
    { name: 'GET /api/alerts', endpoint: '/api/alerts?limit=10', threshold: 200 }
  ];
  
  const results = [];
  
  for (const test of tests) {
    info(`Testing ${test.name}...`);
    const response = await makeRequest(test.endpoint);
    
    if (response.ok) {
      if (response.responseTime < test.threshold) {
        success(`${test.name}: ${response.responseTime}ms (threshold: ${test.threshold}ms)`);
        results.push({ test: test.name, passed: true, time: response.responseTime });
      } else {
        warning(`${test.name}: ${response.responseTime}ms (exceeded threshold: ${test.threshold}ms)`);
        results.push({ test: test.name, passed: false, time: response.responseTime });
      }
    } else {
      error(`${test.name}: Failed with status ${response.status}`);
      results.push({ test: test.name, passed: false, time: response.responseTime });
    }
  }
  
  const passedCount = results.filter(r => r.passed).length;
  log(`\nPerformance Tests: ${passedCount}/${tests.length} passed`, passedCount === tests.length ? 'green' : 'yellow');
  
  return results;
}

async function testCHWCreateCase(token) {
  header('TEST 2: CHW Creates Case');
  
  info('Creating test case...');
  
  const caseData = {
    patient: {
      name: 'Test Patient',
      age: 35,
      gender: 'female',
      phone: '1234567890',
      village: 'Test Village'
    },
    symptoms: 'fever, cough, headache',
    vitalSigns: {
      temperature: 101.5,
      bloodPressure: '120/80',
      heartRate: 85
    },
    notes: 'Automated test case'
  };
  
  const response = await makeRequest('/api/cases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(caseData)
  });
  
  if (response.ok && response.data.id) {
    success(`Case created successfully: ID = ${response.data.id} (${response.responseTime}ms)`);
    info(`Case status: ${response.data.status}`);
    info(`Case priority: ${response.data.priority}`);
    return response.data.id;
  } else {
    error(`Failed to create case: ${response.data.error || 'Unknown error'}`);
    return null;
  }
}

async function testASHASeesCase(token, caseId) {
  header('TEST 3: ASHA Can See Case');
  
  info('Fetching cases from ASHA perspective...');
  
  const response = await makeRequest('/api/cases?status=PENDING', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const cases = response.data.cases || [];
    const foundCase = cases.find(c => c.id === caseId);
    
    if (foundCase) {
      success(`Case ${caseId} found in ASHA's pending list (${response.responseTime}ms)`);
      info(`Total pending cases: ${cases.length}`);
      return true;
    } else {
      warning(`Case ${caseId} not found in pending list`);
      info(`Found ${cases.length} pending cases`);
      return false;
    }
  } else {
    error(`Failed to fetch cases: ${response.data.error || 'Unknown error'}`);
    return false;
  }
}

async function testASHAApproveCase(token, caseId) {
  header('TEST 4: ASHA Approves Case');
  
  info(`Approving case ${caseId}...`);
  
  const response = await makeRequest(`/api/cases/${caseId}/review`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'approve',
      notes: 'Approved during automated testing'
    })
  });
  
  if (response.ok) {
    success(`Case approved successfully (${response.responseTime}ms)`);
    info(`New status: ${response.data.case?.status || 'APPROVED'}`);
    return true;
  } else {
    error(`Failed to approve case: ${response.data.error || 'Unknown error'}`);
    return false;
  }
}

async function testAuditLogCreated(caseId) {
  header('TEST 5: Audit Log Verification');
  
  info('Note: Audit logs are internal and require database access');
  warning('Manual verification required: Check AuditLog table for case review action');
  
  // This would require database access which we don't have in the API
  // Manual verification step
  log('\nManual Check:', 'cyan');
  log('  1. Open Prisma Studio: npx prisma studio', 'cyan');
  log('  2. Navigate to AuditLog table', 'cyan');
  log(`  3. Look for action="case_review" and resource="case:${caseId}"`, 'cyan');
  log('  4. Verify outcome="success"', 'cyan');
  
  return 'manual';
}

async function testAlertCreated(token, userId) {
  header('TEST 6: Alert/Notification Created');
  
  info('Fetching alerts for CHW user...');
  
  const response = await makeRequest(`/api/alerts?userId=${userId}&limit=5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const alerts = response.data.alerts || [];
    
    if (alerts.length > 0) {
      success(`Found ${alerts.length} alert(s) (${response.responseTime}ms)`);
      
      const recentAlert = alerts[0];
      info(`Latest alert: ${recentAlert.message}`);
      info(`Status: ${recentAlert.status}`);
      info(`Priority: ${recentAlert.priority}`);
      
      return true;
    } else {
      warning('No alerts found for user');
      info('Note: Alerts are only created for high-priority case approvals');
      return false;
    }
  } else {
    error(`Failed to fetch alerts: ${response.data.error || 'Unknown error'}`);
    return false;
  }
}

async function testCHWSeesUpdatedCase(token, caseId) {
  header('TEST 7: CHW Sees Updated Case Status');
  
  info('Fetching case details from CHW perspective...');
  
  const response = await makeRequest(`/api/cases/${caseId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok && response.data) {
    const status = response.data.status;
    
    if (status === 'APPROVED') {
      success(`Case status correctly shows APPROVED (${response.responseTime}ms)`);
      return true;
    } else {
      warning(`Case status is ${status}, expected APPROVED`);
      return false;
    }
  } else {
    error(`Failed to fetch case: ${response.data?.error || 'Unknown error'}`);
    return false;
  }
}

async function testDataConsistency(chwToken, ashaToken, caseId) {
  header('TEST 8: Data Consistency Across Portals');
  
  info('Fetching case from CHW portal...');
  const chwResponse = await makeRequest(`/api/cases/${caseId}`, {
    headers: { 'Authorization': `Bearer ${chwToken}` }
  });
  
  info('Fetching case from ASHA portal...');
  const ashaResponse = await makeRequest(`/api/cases/${caseId}`, {
    headers: { 'Authorization': `Bearer ${ashaToken}` }
  });
  
  if (chwResponse.ok && ashaResponse.ok) {
    const chwCase = chwResponse.data;
    const ashaCase = ashaResponse.data;
    
    const checks = [
      { name: 'Status', chw: chwCase.status, asha: ashaCase.status },
      { name: 'Priority', chw: chwCase.priority, asha: ashaCase.priority },
      { name: 'Patient Name', chw: chwCase.patient?.name, asha: ashaCase.patient?.name }
    ];
    
    let allMatch = true;
    for (const check of checks) {
      if (check.chw === check.asha) {
        success(`${check.name} matches: ${check.chw}`);
      } else {
        error(`${check.name} mismatch: CHW=${check.chw}, ASHA=${check.asha}`);
        allMatch = false;
      }
    }
    
    return allMatch;
  } else {
    error('Failed to fetch case from one or both portals');
    return false;
  }
}

async function runFullWorkflowTest() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bold');
  log('║        ASHA-CHW INTEGRATION - FULL WORKFLOW TEST          ║', 'bold');
  log('╚════════════════════════════════════════════════════════════╝\n', 'bold');
  
  info('Starting automated integration tests...');
  info(`Target: ${BASE_URL}\n`);
  
  const results = {
    performance: null,
    caseCreated: false,
    ashaSeesCase: false,
    ashaApproved: false,
    auditLog: 'manual',
    alertCreated: false,
    chwSeesUpdate: false,
    dataConsistency: false
  };
  
  // Test 1: API Performance
  results.performance = await testAPIPerformance();
  
  // Authenticate as CHW
  const chwToken = await authenticateUser('chw@demo.com', 'demo123');
  if (!chwToken) {
    error('CHW authentication failed. Aborting tests.');
    return results;
  }
  
  // Test 2: CHW creates case
  const caseId = await testCHWCreateCase(chwToken);
  if (!caseId) {
    error('Case creation failed. Aborting tests.');
    return results;
  }
  results.caseCreated = true;
  
  // Wait a moment for database to sync
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Authenticate as ASHA
  const ashaToken = await authenticateUser('asha@demo.com', 'demo123');
  if (!ashaToken) {
    error('ASHA authentication failed. Aborting tests.');
    return results;
  }
  
  // Test 3: ASHA sees the case
  results.ashaSeesCase = await testASHASeesCase(ashaToken, caseId);
  
  // Test 4: ASHA approves the case
  results.ashaApproved = await testASHAApproveCase(ashaToken, caseId);
  
  // Wait a moment for database to sync
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 5: Audit log (manual)
  results.auditLog = await testAuditLogCreated(caseId);
  
  // Test 6: Alert created
  // Note: We need the CHW user ID - for now we'll check if any alerts exist
  results.alertCreated = await testAlertCreated(chwToken, 'chw_user_id');
  
  // Test 7: CHW sees updated case
  results.chwSeesUpdate = await testCHWSeesUpdatedCase(chwToken, caseId);
  
  // Test 8: Data consistency
  results.dataConsistency = await testDataConsistency(chwToken, ashaToken, caseId);
  
  // Summary
  header('TEST SUMMARY');
  
  const tests = [
    { name: 'API Performance', result: results.performance?.filter(r => r.passed).length === results.performance?.length },
    { name: 'CHW Creates Case', result: results.caseCreated },
    { name: 'ASHA Sees Case', result: results.ashaSeesCase },
    { name: 'ASHA Approves Case', result: results.ashaApproved },
    { name: 'Audit Log Created', result: results.auditLog === 'manual' ? 'manual' : results.auditLog },
    { name: 'Alert/Notification Created', result: results.alertCreated },
    { name: 'CHW Sees Updated Status', result: results.chwSeesUpdate },
    { name: 'Data Consistency', result: results.dataConsistency }
  ];
  
  log('\nTest Results:', 'bold');
  for (const test of tests) {
    if (test.result === true) {
      success(`${test.name}: PASSED`);
    } else if (test.result === 'manual') {
      warning(`${test.name}: MANUAL VERIFICATION REQUIRED`);
    } else {
      error(`${test.name}: FAILED`);
    }
  }
  
  const passedCount = tests.filter(t => t.result === true).length;
  const totalCount = tests.filter(t => t.result !== 'manual').length;
  
  log(`\n${'═'.repeat(60)}`, 'bold');
  if (passedCount === totalCount) {
    success(`ALL TESTS PASSED! (${passedCount}/${totalCount})`);
  } else {
    warning(`TESTS COMPLETED: ${passedCount}/${totalCount} passed`);
  }
  log(`${'═'.repeat(60)}\n`, 'bold');
  
  return results;
}

// Run the tests
runFullWorkflowTest()
  .then(() => {
    log('\nTest execution completed.', 'green');
    process.exit(0);
  })
  .catch((err) => {
    error(`\nTest execution failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
