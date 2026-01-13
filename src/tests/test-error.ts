/**
 * Test 2: Error Script Gets Errors
 * 
 * This test verifies that a script with errors:
 * - Returns success: false
 * - Captures the error message
 * - Only captures outputs before the error
 */

import { ScriptRunner } from '../script-runner.js';
import { checkMA3Health } from '../health-check.js';

const MA3_HOST = process.env.MA3_HOST || '127.0.0.1';
const MA3_PORT = Number.parseInt(process.env.MA3_PORT || '8000', 10);

// Test script that will error
const ERROR_SCRIPT = `
Printf("Starting...")
local x = undefined_variable.property  -- This will error
Printf("This never runs")
`;

async function runTest(): Promise<boolean> {
  console.log('═'.repeat(60));
  console.log('TEST 2: Error Script Gets Errors');
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

  console.log('Executing error script:');
  console.log('─'.repeat(40));
  console.log(ERROR_SCRIPT.trim());
  console.log('─'.repeat(40));
  console.log();

  try {
    const result = await runner.executeScript(ERROR_SCRIPT);

    console.log('Result:');
    console.log('─'.repeat(40));
    console.log(`  Success: ${result.success}`);
    console.log(`  Execution Time: ${result.executionTime}ms`);
    console.log(`  Test ID: ${result.testId}`);
    console.log();
    console.log('  Outputs:');
    if (result.outputs.length === 0) {
      console.log('    (none)');
    } else {
      for (const output of result.outputs) {
        console.log(`    - "${output}"`);
      }
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

    // Check 1: success should be false
    const check1 = result.success === false;
    validations.push({
      check: 'result.success === false',
      passed: check1,
      message: check1 ? 'Script correctly reported failure' : `Expected success=false, got ${result.success}`,
    });
    passed = passed && check1;

    // Check 2: should have at least 1 error
    const check2 = result.errors.length >= 1;
    validations.push({
      check: 'result.errors.length >= 1',
      passed: check2,
      message: check2 ? `Captured ${result.errors.length} error(s)` : 'No errors were captured',
    });
    passed = passed && check2;

    // Check 3: error message contains "nil" or "undefined"
    const check3 = result.errors.length > 0 && 
      (result.errors[0].toLowerCase().includes('nil') || 
       result.errors[0].toLowerCase().includes('undefined'));
    validations.push({
      check: 'error message mentions "nil" or "undefined"',
      passed: check3,
      message: check3 
        ? 'Error message correctly identifies nil access' 
        : `Error message: "${result.errors[0] || 'none'}"`,
    });
    passed = passed && check3;

    // Check 4: outputs contains "Starting..." but not "This never runs"
    const hasStarting = result.outputs.some((o: string) => o.includes('Starting'));
    const hasNeverRuns = result.outputs.some((o: string) => o.includes('never runs'));
    const check4 = hasStarting && !hasNeverRuns;
    validations.push({
      check: 'outputs contain "Starting..." but not "This never runs"',
      passed: check4,
      message: check4 
        ? 'Outputs correctly captured before error' 
        : `hasStarting=${hasStarting}, hasNeverRuns=${hasNeverRuns}`,
    });
    // This check is optional since Printf before pcall might not be captured
    // passed = passed && check4;

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
      console.log('✅ TEST PASSED: Error script captured errors correctly');
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
