#!/usr/bin/env node

import { Client } from 'node-osc';
import { config } from './config.js';

console.log('🔍 Testing MA3 OSC Connection...');
console.log(`Target: ${config.ma3.host}:${config.ma3.port}`);

const client = new Client(config.ma3.host, config.ma3.port);

// Test with a simple Echo command
const testCommand = 'Echo "MA3 Bridge Test Connection"';

console.log(`📤 Sending test command: ${testCommand}`);

client.send('/cmd', testCommand, (error: Error | undefined) => {
  if (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure MA3 onPC is running');
    console.log('2. Check that OSC is enabled in MA3:');
    console.log('   - In MA3: Menu > System > MA Network Control');
    console.log('   - Enable "OSC"');
    console.log(`   - Set port to ${config.ma3.port}`);
    console.log('3. Check Windows Firewall settings');
    process.exit(1);
  } else {
    console.log('✅ Connection test successful!');
    console.log('📝 Check MA3 Command Line window for the test message');
    
    // Test a more complex command
    const luaTest = 'Lua "Printf(\\"MA3 Bridge: Lua execution test successful\\")"';
    console.log(`\n📤 Testing Lua execution...`);
    
    client.send('/cmd', luaTest, (luaError: Error | undefined) => {
      if (luaError) {
        console.error('⚠️  Lua test failed:', luaError.message);
      } else {
        console.log('✅ Lua execution test successful!');
      }
      
      client.close?.();
      process.exit(0);
    });
  }
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('\n⏱️  Connection test timed out after 5 seconds');
  console.log('MA3 might not be responding to OSC commands');
  client.close?.();
  process.exit(1);
}, 5000);
