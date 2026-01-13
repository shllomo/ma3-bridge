/**
 * Test 1: Successful Script Gets Output
 * 
 * This test verifies that a script that runs successfully:
 * - Returns success: true
 * - Captures all Printf() outputs
 * - Has no errors
 */

import { ScriptRunner } from '../script-runner.js';
import { checkMA3Health } from '../health-check.js';

const MA3_HOST = process.env.MA3_HOST || '127.0.0.1';
const MA3_PORT = Number.parseInt(process.env.MA3_PORT || '8000', 10);

// Test script that should succeed
const TEST_SCRIPT = `
Printf("Hello from test!")
Printf("Value is: " .. tostring(42))
local x = 10 + 20
Printf("Sum: " .. x)
`;

async function runTest(): Promise<boolean> {
  console.log('═'.repeat(60));
  console.log('TEST 1: Successful Script Gets Output');
  console.log('═'.repeat(60));
  console.log();

  // First check if MA3 is available
  console.log('Checking MA3 availability...');
  const health = await checkMA3Health(MA3_HOST, MA3_PORT);
  
  if (!health.available) {
    console.log(`⚠️  MA3 not available: ${health.message}`);
    console.log('   This test requires MA3 to be running.');
    console.log('   Skipping test...');
    return false;
  }
  
  console.log(`✅ MA3 available at ${MA3_HOST}:${MA3_PORT}`);
  console.log();

  // Create script runner
  const runner = new ScriptRunner({
    ma3Host: MA3_HOST,
    ma3Port: MA3_PORT,
    scriptTimeout: 10000,
    cleanupTempFiles: true,
  });
  runner.initializeOscClient();

  console.log('Executing test script:');
  console.log('─'.repeat(40));
  console.log(TEST_SCRIPT.trim());
  console.log('─'.repeat(40));
  console.log();

  try {
    const result = await runner.executeScript(TEST_SCRIPT);

    console.log('Result:');
    console.log('─'.repeat(40));
    console.log(`  Success: ${result.success}`);
    console.log(`  Execution Time: ${result.executionTime}ms`);
    console.log(`  Test ID: ${result.testId}`);
    console.log();
    console.log('  Outputs:');
    for (const output of result.outputs) {
      console.log(`    - "${output}"`);
    }
    console.log();
    console.log('  Errors:');
    if (result.errors.length === 0) {
      console.log('    (none)');
    } else {
      for (const error of result.errors) {
        console.log(`    - "${error}"`);
      }
    }
    console.log('─'.repeat(40));
    console.log();

    // Validate results
    let passed = true;
    const validations: Array<{ check: string; passed: boolean; message: string }> = [];

    // Check 1: success should be true
    const check1 = result.success === true;
    validations.push({
      check: 'result.success === true',
      passed: check1,
      message: check1 ? 'Script executed successfully' : `Expected success=true, got ${result.success}`,
    });
    passed = passed && check1;

    // Check 2: should have 3 outputs
    const check2 = result.outputs.length === 3;
    validations.push({
      check: 'result.outputs.length === 3',
      passed: check2,
      message: check2 ? 'Got expected 3 outputs' : `Expected 3 outputs, got ${result.outputs.length}`,
    });
    passed = passed && check2;

    // Check 3: first output contains "Hello"
    const check3 = result.outputs.length > 0 && result.outputs[0].includes('Hello');
    validations.push({
      check: 'result.outputs[0].includes("Hello")',
      passed: check3,
      message: check3 ? 'First output contains "Hello"' : 'First output does not contain "Hello"',
    });
    passed = passed && check3;

    // Check 4: should have no errors
    const check4 = result.errors.length === 0;
    validations.push({
      check: 'result.errors.length === 0',
      passed: check4,
      message: check4 ? 'No errors captured' : `Got ${result.errors.length} errors`,
    });
    passed = passed && check4;

    // Print validation results
    console.log('Validations:');
    for (const v of validations) {
      const icon = v.passed ? '✅' : '❌';
      console.log(`  ${icon} ${v.check}`);
      console.log(`     ${v.message}`);
    }
    console.log();

    // Final result
    console.log('═'.repeat(60));
    if (passed) {
      console.log('✅ TEST PASSED: Successful script captured outputs correctly');
    } else {
      console.log('❌ TEST FAILED: Some validations did not pass');
    }
    console.log('═'.repeat(60));

    runner.close();
    return passed;

  } catch (error) {
    console.error('❌ Test execution error:', error);
    runner.close();
    return false;
  }
}

// Run the test
runTest().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
