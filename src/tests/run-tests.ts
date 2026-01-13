/**
 * Test Runner - Runs all tests
 * 
 * Usage: npm test
 */

import { spawn } from 'child_process';
import * as path from 'path';

const tests = [
  { name: 'Test 1: Success Script', file: 'test-success.ts' },
  { name: 'Test 2: Error Script', file: 'test-error.ts' },
  { name: 'Test 3: Health Check', file: 'test-health.ts' },
];

async function runTest(name: string, file: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n${'▓'.repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log(`${'▓'.repeat(60)}\n`);

    const testPath = path.join(__dirname, file);
    const child = spawn('npx', ['tsx', testPath], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '../..'),
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.error(`Failed to run test: ${err}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           MA3 Bridge Test Suite                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Running ${tests.length} tests...`);

  const results: Array<{ name: string; passed: boolean }> = [];

  for (const test of tests) {
    const passed = await runTest(test.name, test.file);
    results.push({ name: test.name, passed });
  }

  // Print summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`  ${icon} ${result.name}`);
    if (!result.passed) allPassed = false;
  }

  console.log();
  console.log('─'.repeat(60));
  
  const passedCount = results.filter(r => r.passed).length;
  console.log(`  Results: ${passedCount}/${results.length} tests passed`);
  
  if (allPassed) {
    console.log('\n  🎉 All tests passed!');
  } else {
    console.log('\n  ⚠️  Some tests failed. Check output above for details.');
  }
  
  console.log('─'.repeat(60));
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
