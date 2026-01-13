/**
 * Script Runner for MA3 Bridge
 * Wraps and executes Lua scripts with result capture
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Client } from 'node-osc';
import { v4 as uuidv4 } from 'uuid';
import { ScriptResult, BridgeConfig } from './types.js';
import { wrapLuaScript } from './lua-wrapper.js';
import { waitForResult, ensureResultDir, cleanupFiles } from './result-watcher.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<BridgeConfig> = {
  resultDir: path.join(os.tmpdir(), 'gma3_results'),
  scriptTimeout: 30000,
  cleanupTempFiles: true,
  ma3Host: '127.0.0.1',
  ma3Port: 8000,
};

export class ScriptRunner {
  private config: BridgeConfig;
  private oscClient: Client | null = null;

  constructor(config: Partial<BridgeConfig> = {}) {
    this.config = {
      port: config.port || 3001,
      vercelAppUrl: config.vercelAppUrl || 'http://localhost:3000',
      ma3Host: config.ma3Host || DEFAULT_CONFIG.ma3Host!,
      ma3Port: config.ma3Port || DEFAULT_CONFIG.ma3Port!,
      resultDir: config.resultDir || DEFAULT_CONFIG.resultDir!,
      scriptTimeout: config.scriptTimeout || DEFAULT_CONFIG.scriptTimeout!,
      cleanupTempFiles: config.cleanupTempFiles ?? DEFAULT_CONFIG.cleanupTempFiles!,
      pollingInterval: config.pollingInterval || 1000,
    };

    // Ensure result directory exists
    ensureResultDir(this.config.resultDir);
    console.log(`[ScriptRunner] Initialized with result dir: ${this.config.resultDir}`);
  }

  /**
   * Initialize OSC client connection
   */
  initializeOscClient(): boolean {
    try {
      this.oscClient = new Client(this.config.ma3Host, this.config.ma3Port);
      console.log(`[ScriptRunner] OSC client initialized for ${this.config.ma3Host}:${this.config.ma3Port}`);
      return true;
    } catch (error) {
      console.error('[ScriptRunner] Failed to initialize OSC client:', error);
      return false;
    }
  }

  /**
   * Get or create OSC client
   */
  private getOscClient(): Client {
    if (!this.oscClient) {
      this.initializeOscClient();
    }
    return this.oscClient!;
  }

  /**
   * Generate a unique test ID
   */
  private generateTestId(): string {
    return uuidv4().substring(0, 8);
  }

  /**
   * Execute a Lua script with full result capture
   * @param luaCode - The Lua code to execute
   * @param timeout - Optional timeout override in milliseconds
   * @returns ScriptResult with success, outputs, and errors
   */
  async executeScript(
    luaCode: string,
    timeout?: number
  ): Promise<ScriptResult> {
    const startTime = Date.now();
    const testId = this.generateTestId();
    const effectiveTimeout = timeout || this.config.scriptTimeout;

    // Generate file paths
    const resultFile = path.join(this.config.resultDir, `result_${testId}.json`);
    const scriptFile = path.join(this.config.resultDir, `script_${testId}.lua`);

    console.log(`[ScriptRunner] Executing script ${testId}...`);

    // Wrap the script with capture code
    const wrappedScript = wrapLuaScript(luaCode, testId, resultFile, 'inline');

    // Write the wrapped script to a file
    try {
      fs.writeFileSync(scriptFile, wrappedScript, 'utf-8');
      console.log(`[ScriptRunner] Wrapped script written: ${scriptFile}`);
    } catch (error) {
      return this.createErrorResult(
        testId,
        `Failed to write script file: ${error}`,
        Date.now() - startTime
      );
    }

    // Send the script to MA3 via OSC
    try {
      const client = this.getOscClient();
      const luaFileCommand = `LuaFile "${scriptFile.replace(/\\/g, '\\\\')}"`;
      
      await new Promise<void>((resolve, reject) => {
        client.send('/cmd', luaFileCommand, (error: Error | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      console.log(`[ScriptRunner] Script sent to MA3`);
    } catch (error) {
      return this.createErrorResult(
        testId,
        `Failed to send script to MA3: ${error}`,
        Date.now() - startTime
      );
    }

    // Wait for the result file
    const result = await waitForResult(resultFile, effectiveTimeout);

    // Cleanup temp files
    if (this.config.cleanupTempFiles) {
      cleanupFiles([scriptFile, resultFile]);
    }

    if (result === null) {
      return this.createErrorResult(
        testId,
        `Timeout after ${effectiveTimeout}ms - no result file created. Check if MA3 is running and can write to: ${this.config.resultDir}`,
        Date.now() - startTime
      );
    }

    // Update execution time to be accurate
    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Execute a Lua file with full result capture
   * @param filePath - Path to the Lua file
   * @param timeout - Optional timeout override in milliseconds
   * @returns ScriptResult with success, outputs, and errors
   */
  async executeLuaFile(
    filePath: string,
    timeout?: number
  ): Promise<ScriptResult> {
    const startTime = Date.now();
    const testId = this.generateTestId();

    // Read the file
    let luaCode: string;
    try {
      luaCode = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      return this.createErrorResult(
        testId,
        `Failed to read Lua file: ${error}`,
        Date.now() - startTime
      );
    }

    // Execute with the file path as original_file
    const effectiveTimeout = timeout || this.config.scriptTimeout;
    const resultFile = path.join(this.config.resultDir, `result_${testId}.json`);
    const scriptFile = path.join(this.config.resultDir, `script_${testId}.lua`);

    // Wrap the script
    const wrappedScript = wrapLuaScript(luaCode, testId, resultFile, filePath);

    try {
      fs.writeFileSync(scriptFile, wrappedScript, 'utf-8');
    } catch (error) {
      return this.createErrorResult(
        testId,
        `Failed to write script file: ${error}`,
        Date.now() - startTime
      );
    }

    // Send to MA3
    try {
      const client = this.getOscClient();
      const luaFileCommand = `LuaFile "${scriptFile.replace(/\\/g, '\\\\')}"`;
      
      await new Promise<void>((resolve, reject) => {
        client.send('/cmd', luaFileCommand, (error: Error | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      return this.createErrorResult(
        testId,
        `Failed to send script to MA3: ${error}`,
        Date.now() - startTime
      );
    }

    // Wait for result
    const result = await waitForResult(resultFile, effectiveTimeout);

    if (this.config.cleanupTempFiles) {
      cleanupFiles([scriptFile, resultFile]);
    }

    if (result === null) {
      return this.createErrorResult(
        testId,
        `Timeout after ${effectiveTimeout}ms - no result file created`,
        Date.now() - startTime
      );
    }

    result.executionTime = Date.now() - startTime;
    result.luaFile = filePath;
    return result;
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    testId: string,
    error: string,
    executionTime: number
  ): ScriptResult {
    return {
      success: false,
      outputs: [],
      errors: [error],
      executionTime,
      testId,
      rawData: {},
    };
  }

  /**
   * Run a simple test command
   */
  async testConnection(): Promise<ScriptResult> {
    const testScript = 'Printf("MA3 Bridge Test - Connection Successful!")';
    return this.executeScript(testScript, 5000);
  }

  /**
   * Get the result directory path
   */
  getResultDir(): string {
    return this.config.resultDir;
  }

  /**
   * Close the OSC client
   */
  close(): void {
    if (this.oscClient) {
      this.oscClient.close();
      this.oscClient = null;
      console.log('[ScriptRunner] OSC client closed');
    }
  }
}
