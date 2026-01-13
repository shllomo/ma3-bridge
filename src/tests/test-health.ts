/**
 * Test 3: Recognize if MA3 is Up or Not
 * 
 * This test verifies that the health check:
 * - Returns available: true when MA3 is running
 * - Returns available: false when MA3 is not running
 * - Provides meaningful status messages
 */

import { checkMA3Health, fullMA3HealthCheck } from '../health-check.js';

const MA3_HOST = process.env.MA3_HOST || '127.0.0.1';
const MA3_PORT = Number.parseInt(process.env.MA3_PORT || '8000', 10);
const FAKE_PORT = 59999; // A port that definitely won't have MA3

async function runTest(): Promise<boolean> {
  console.log('═'.repeat(60));
  console.log('TEST 3: Recognize if MA3 is Up or Not');
  console.log('═'.repeat(60));
  console.log();

  let allPassed = true;

  // ─────────────────────────────────────────────────────────────
  // Test 3A: Check if MA3 is running on configured port
  // ─────────────────────────────────────────────────────────────
  console.log('Test 3A: Check if MA3 is running');
  console.log('─'.repeat(40));
  console.log(`Checking ${MA3_HOST}:${MA3_PORT} (TCP connection test)...`);
  console.log();

  const healthReal = await checkMA3Health(MA3_HOST, MA3_PORT);
  
  console.log('Result:');
  console.log(`  Available: ${healthReal.available}`);
  console.log(`  Message: ${healthReal.message}`);
  console.log();

  // Show clear status
  if (healthReal.available) {
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  ✅ MA3 IS RUNNING                      │');
    console.log('│     Ready to execute scripts            │');
    console.log('└─────────────────────────────────────────┘');
  } else {
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  ❌ MA3 IS NOT RUNNING                  │');
    console.log('│     Start MA3 onPC and enable OSC       │');
    console.log('└─────────────────────────────────────────┘');
  }
  console.log();

  // Validate structure
  const check3a1 = typeof healthReal.available === 'boolean';
  const check3a2 = typeof healthReal.message === 'string' && healthReal.message.length > 0;

  console.log('Structure Validations:');
  console.log(`  ${check3a1 ? '✅' : '❌'} available is boolean: ${healthReal.available}`);
  console.log(`  ${check3a2 ? '✅' : '❌'} message is non-empty string`);
  console.log();

  const test3aPassed = check3a1 && check3a2;
  allPassed = allPassed && test3aPassed;

  // ─────────────────────────────────────────────────────────────
  // Test 3B: Check an invalid port (should return unavailable)
  // ─────────────────────────────────────────────────────────────
  console.log('─'.repeat(40));
  console.log('Test 3B: Check invalid port (must fail)');
  console.log('─'.repeat(40));
  console.log(`Checking ${MA3_HOST}:${FAKE_PORT}...`);
  console.log();

  const healthFake = await checkMA3Health(MA3_HOST, FAKE_PORT, 1000);
  
  console.log('Result:');
  console.log(`  Available: ${healthFake.available}`);
  console.log(`  Message: ${healthFake.message}`);
  console.log();

  // This MUST be false - there's nothing on port 59999
  const check3b = healthFake.available === false;
  
  if (check3b) {
    console.log('✅ Correctly detected that nothing is running on fake port');
  } else {
    console.log('❌ FAILED: Should have returned available=false for fake port!');
  }
  console.log();

  const test3bPassed = check3b;
  allPassed = allPassed && test3bPassed;

  // ─────────────────────────────────────────────────────────────
  // Test 3C: Full health check
  // ─────────────────────────────────────────────────────────────
  console.log('─'.repeat(40));
  console.log('Test 3C: Full health check');
  console.log('─'.repeat(40));

  const healthFull = await fullMA3HealthCheck(MA3_HOST, MA3_PORT);
  
  console.log('Result:');
  console.log(`  Available: ${healthFull.available}`);
  console.log(`  Message: ${healthFull.message}`);
  console.log();

  const check3c = typeof healthFull.available === 'boolean' && healthFull.message.length > 0;
  const test3cPassed = check3c;
  allPassed = allPassed && test3cPassed;

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log();
  console.log(`  MA3 Status: ${healthReal.available ? '🟢 RUNNING' : '🔴 NOT RUNNING'}`);
  console.log();
  console.log('  Test Results:');
  console.log(`    Test 3A (Real Port Check): ${test3aPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`    Test 3B (Fake Port Check): ${test3bPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`    Test 3C (Full Check): ${test3cPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log();
  
  if (allPassed) {
    console.log('✅ TEST PASSED: Health check correctly detects MA3 status');
  } else {
    console.log('❌ TEST FAILED: Some checks did not pass');
  }
  console.log('═'.repeat(60));

  return allPassed;
}

// Run the test
runTest().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
