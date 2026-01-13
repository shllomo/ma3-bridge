import express from 'express';
import cors from 'cors';
import { Client } from 'node-osc';
import dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';
import { ScriptRunner } from './script-runner.js';
import { checkMA3Health, fullMA3HealthCheck } from './health-check.js';
import { TestJob, ScriptResult } from './types.js';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const VERCEL_APP_URL = process.env.VERCEL_APP_URL || 'http://localhost:3000';
const MA3_HOST = process.env.MA3_HOST || '127.0.0.1';
const MA3_PORT = Number.parseInt(process.env.MA3_PORT || '8000', 10);
const RESULT_DIR = process.env.RESULT_DIR || path.join(os.tmpdir(), 'gma3_results');
const SCRIPT_TIMEOUT = Number.parseInt(process.env.SCRIPT_TIMEOUT || '30000', 10);
const CLEANUP_TEMP_FILES = process.env.CLEANUP_TEMP_FILES !== 'false';
const POLLING_INTERVAL = 1000; // 1 second

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Initialize OSC client
let oscClient: Client | null = null;
let isConnected = false;

// Initialize Script Runner
const scriptRunner = new ScriptRunner({
  ma3Host: MA3_HOST,
  ma3Port: MA3_PORT,
  resultDir: RESULT_DIR,
  scriptTimeout: SCRIPT_TIMEOUT,
  cleanupTempFiles: CLEANUP_TEMP_FILES,
});

// Test job queue (in-memory for now)
const jobQueue: Map<string, TestJob> = new Map();

/**
 * Initialize OSC client connection
 */
function initializeOscClient(): boolean {
  try {
    oscClient = new Client(MA3_HOST, MA3_PORT);
    isConnected = true;
    console.log(`✅ OSC client initialized for MA3 at ${MA3_HOST}:${MA3_PORT}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize OSC client:', error);
    isConnected = false;
    return false;
  }
}

/**
 * Execute script with full result capture
 */
async function executeScriptWithCapture(script: string): Promise<ScriptResult> {
  return scriptRunner.executeScript(script);
}

/**
 * Poll Vercel app for pending test jobs
 */
async function pollForJobs(): Promise<void> {
  try {
    const response = await fetch(`${VERCEL_APP_URL}/api/ma3/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status !== 404) {
        console.error('Failed to fetch jobs:', response.statusText);
      }
      return;
    }

    const data = await response.json() as {
      pendingJob?: {
        id: string;
        script: string;
        createdAt: string;
      };
    };
    
    if (data.pendingJob) {
      const job: TestJob = {
        id: data.pendingJob.id,
        script: data.pendingJob.script,
        status: 'pending',
        createdAt: new Date(data.pendingJob.createdAt),
      };

      // Add to local queue
      jobQueue.set(job.id, job);
      job.status = 'executing';

      // Execute with result capture
      const result = await executeScriptWithCapture(job.script);
      
      job.status = result.success ? 'completed' : 'failed';
      job.result = result;

      // Report status back to Vercel
      await reportJobStatus(job);
    }
  } catch (error) {
    // Silently ignore connection errors during polling
    // This is expected when Vercel app is not running
  }
}

/**
 * Report job status back to Vercel app
 */
async function reportJobStatus(job: TestJob): Promise<void> {
  try {
    await fetch(`${VERCEL_APP_URL}/api/ma3/jobs/${job.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: job.status,
        result: job.result,
      }),
    });
  } catch (error) {
    console.error(`Failed to report status for job ${job.id}:`, error);
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check endpoint
 * Returns bridge status and MA3 availability
 */
app.get('/health', async (req, res) => {
  // Check MA3 availability
  const ma3Health = await fullMA3HealthCheck(MA3_HOST, MA3_PORT, oscClient);
  
  const health = {
    status: ma3Health.available ? 'connected' : 'disconnected',
    bridge: 'running',
    ma3: {
      host: MA3_HOST,
      port: MA3_PORT,
      available: ma3Health.available,
      message: ma3Health.message,
    },
    vercelApp: VERCEL_APP_URL,
    resultDir: RESULT_DIR,
    uptime: process.uptime(),
  };
  
  res.json(health);
});

/**
 * Test script execution endpoint
 * Executes a script and returns full results including outputs and errors
 */
app.post('/test', async (req, res) => {
  const { script } = req.body;
  
  if (!script) {
    return res.status(400).json({ 
      success: false,
      error: 'Script is required',
      outputs: [],
      errors: ['Script is required'],
    });
  }

  console.log(`📤 Executing script (${script.length} chars)...`);

  try {
    const result = await executeScriptWithCapture(script);
    
    console.log(`${result.success ? '✅' : '❌'} Script execution ${result.success ? 'succeeded' : 'failed'} (${result.executionTime}ms)`);
    
    // Store in job queue for tracking
    const jobId = `manual-${Date.now()}`;
    const job: TestJob = {
      id: jobId,
      script,
      status: result.success ? 'completed' : 'failed',
      createdAt: new Date(),
      result,
    };
    jobQueue.set(jobId, job);

    res.json({
      success: result.success,
      outputs: result.outputs,
      errors: result.errors,
      executionTime: result.executionTime,
      testId: result.testId,
      job: {
        id: jobId,
        status: job.status,
      },
    });
  } catch (error) {
    console.error('❌ Script execution error:', error);
    res.status(500).json({
      success: false,
      outputs: [],
      errors: [error instanceof Error ? error.message : String(error)],
      executionTime: 0,
    });
  }
});

/**
 * Get job status endpoint
 */
app.get('/jobs/:id', (req, res) => {
  const job = jobQueue.get(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    result: job.result,
    createdAt: job.createdAt,
  });
});

/**
 * List all jobs endpoint (for debugging)
 */
app.get('/jobs', (req, res) => {
  const jobs = Array.from(jobQueue.values()).map(job => ({
    id: job.id,
    status: job.status,
    success: job.result?.success,
    outputCount: job.result?.outputs?.length || 0,
    errorCount: job.result?.errors?.length || 0,
    createdAt: job.createdAt,
  }));

  res.json({ jobs, total: jobs.length });
});

/**
 * MA3 health check endpoint
 */
app.get('/ma3/health', async (req, res) => {
  const health = await checkMA3Health(MA3_HOST, MA3_PORT);
  res.json(health);
});

/**
 * Test connection endpoint
 * Runs a simple test script to verify end-to-end connectivity
 */
app.post('/test-connection', async (req, res) => {
  console.log('🔍 Testing MA3 connection...');
  
  try {
    const result = await scriptRunner.testConnection();
    
    res.json({
      success: result.success,
      message: result.success 
        ? 'MA3 connection verified - script execution working!'
        : 'MA3 connection test failed',
      outputs: result.outputs,
      errors: result.errors,
      executionTime: result.executionTime,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Connection test failed: ${error}`,
      outputs: [],
      errors: [error instanceof Error ? error.message : String(error)],
    });
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           MA3 Bridge Local Service (v2.0)                  ║
║          With Full Result Capture Support                  ║
╚════════════════════════════════════════════════════════════╝

🚀 Bridge running on http://localhost:${PORT}
🎮 MA3 OSC target: ${MA3_HOST}:${MA3_PORT}
🌐 Vercel app URL: ${VERCEL_APP_URL}
📁 Result directory: ${RESULT_DIR}
⏱️  Script timeout: ${SCRIPT_TIMEOUT}ms
🧹 Cleanup temp files: ${CLEANUP_TEMP_FILES}

Endpoints:
  GET  /health          - Bridge and MA3 status
  POST /test            - Execute script with result capture
  GET  /jobs            - List all test jobs
  GET  /jobs/:id        - Get specific job status
  GET  /ma3/health      - Check MA3 availability
  POST /test-connection - Test end-to-end connection
  `);

  // Initialize OSC client
  initializeOscClient();
  scriptRunner.initializeOscClient();

  // Start polling for jobs
  console.log('📡 Starting job polling...');
  setInterval(pollForJobs, POLLING_INTERVAL);

  // Verify MA3 connection on startup
  checkMA3Health(MA3_HOST, MA3_PORT).then((health: { available: boolean; message: string }) => {
    if (health.available) {
      console.log(`✅ ${health.message}`);
    } else {
      console.warn(`⚠️  ${health.message}`);
      console.log('   Make sure MA3 onPC is running with OSC enabled on port', MA3_PORT);
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MA3 Bridge...');
  
  if (oscClient) {
    oscClient.close?.();
  }
  scriptRunner.close();
  
  process.exit(0);
});

export default app;
