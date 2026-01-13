/**
 * Types and interfaces for MA3 Bridge
 */

/**
 * Result of a script execution on MA3
 */
export interface ScriptResult {
  /** Whether the script executed successfully (no pcall errors) */
  success: boolean;
  /** Captured Printf() output lines */
  outputs: string[];
  /** Captured error messages */
  errors: string[];
  /** Execution time in milliseconds */
  executionTime: number;
  /** Unique test identifier */
  testId: string;
  /** Raw JSON data from result file */
  rawData?: Record<string, unknown>;
  /** Original Lua file path (if applicable) */
  luaFile?: string;
}

/**
 * Result file format written by the Lua wrapper
 */
export interface LuaResultFile {
  success: boolean;
  test_id: string;
  original_file?: string;
  errors: string[];
  outputs: string[];
  start_time?: number;
  end_time?: number;
}

/**
 * MA3 health check result
 */
export interface MA3HealthStatus {
  /** Whether MA3 is reachable */
  available: boolean;
  /** Status message */
  message: string;
  /** Host address */
  host?: string;
  /** Port number */
  port?: number;
}

/**
 * Test job stored in the queue
 */
export interface TestJob {
  id: string;
  script: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  result?: ScriptResult;
}

/**
 * Bridge configuration
 */
export interface BridgeConfig {
  port: number;
  vercelAppUrl: string;
  ma3Host: string;
  ma3Port: number;
  resultDir: string;
  scriptTimeout: number;
  cleanupTempFiles: boolean;
  pollingInterval: number;
}
