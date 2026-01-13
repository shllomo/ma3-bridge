/**
 * File system watcher for MA3 result files
 * Polls for result.json files created by the Lua wrapper
 */

import * as fs from 'fs';
import * as path from 'path';
import { LuaResultFile, ScriptResult } from './types.js';

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse a result file from the Lua wrapper
 * @param filePath - Path to the result JSON file
 * @returns Parsed result or null if parsing fails
 */
export function parseResultFile(filePath: string): LuaResultFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as LuaResultFile;
    return data;
  } catch (error) {
    console.error(`[ResultWatcher] Failed to parse result file: ${error}`);
    return null;
  }
}

/**
 * Convert Lua result file to ScriptResult
 */
export function luaResultToScriptResult(
  luaResult: LuaResultFile,
  executionTime: number
): ScriptResult {
  return {
    success: luaResult.success,
    outputs: luaResult.outputs || [],
    errors: luaResult.errors || [],
    executionTime,
    testId: luaResult.test_id,
    luaFile: luaResult.original_file,
    rawData: luaResult as unknown as Record<string, unknown>,
  };
}

/**
 * Wait for a result file to appear and return its contents
 * @param resultPath - Path to the expected result file
 * @param timeout - Maximum time to wait in milliseconds
 * @param pollInterval - How often to check for the file in milliseconds
 * @returns ScriptResult if file found, null if timeout
 */
export async function waitForResult(
  resultPath: string,
  timeout: number = 30000,
  pollInterval: number = 500
): Promise<ScriptResult | null> {
  const startTime = Date.now();
  
  console.log(`[ResultWatcher] Waiting for result file: ${resultPath}`);
  
  while (Date.now() - startTime < timeout) {
    if (fs.existsSync(resultPath)) {
      // Wait a bit for file to be fully written
      await sleep(200);
      
      const luaResult = parseResultFile(resultPath);
      if (luaResult) {
        const executionTime = Date.now() - startTime;
        console.log(`[ResultWatcher] Got result: success=${luaResult.success}, outputs=${luaResult.outputs?.length || 0}`);
        return luaResultToScriptResult(luaResult, executionTime);
      }
      
      // File exists but couldn't parse - wait more and retry
      console.log('[ResultWatcher] File exists but could not parse, retrying...');
      await sleep(pollInterval);
      continue;
    }
    
    await sleep(pollInterval);
  }
  
  // Final check after timeout
  if (fs.existsSync(resultPath)) {
    const luaResult = parseResultFile(resultPath);
    if (luaResult) {
      const executionTime = Date.now() - startTime;
      return luaResultToScriptResult(luaResult, executionTime);
    }
  }
  
  console.error(`[ResultWatcher] Timeout waiting for result file: ${resultPath}`);
  return null;
}

/**
 * Ensure result directory exists
 * @param dirPath - Directory path to create if it doesn't exist
 */
export function ensureResultDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[ResultWatcher] Created result directory: ${dirPath}`);
  }
}

/**
 * Clean up temporary files
 * @param files - Array of file paths to delete
 */
export function cleanupFiles(files: string[]): void {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`[ResultWatcher] Cleaned up: ${path.basename(file)}`);
      }
    } catch (error) {
      console.warn(`[ResultWatcher] Failed to cleanup ${file}: ${error}`);
    }
  }
}
