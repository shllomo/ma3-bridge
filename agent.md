# MA3 Bridge

## Overview

MA3 Bridge is a **lightweight Node.js service** that acts as a bridge between the MA3 Copilot web application and a local GrandMA3 onPC instance. It enables Lua script testing with **full result capture**, allowing the AI-generated scripts to be validated on real MA3 hardware.

## Purpose

The bridge solves a critical problem: **GrandMA3 runs Lua scripts locally** and doesn't provide a native API for remote script execution with result capture. The bridge:

1. Receives scripts from the Copilot via HTTP
2. Wraps them with result-capture code
3. Sends them to MA3 via OSC
4. Polls for and parses result files
5. Returns structured results to the Copilot

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MA3 Copilot    │───▶│   Bridge        │───▶│ File System     │◀───│    MA3          │
│  (Web App)      │◀───│   (Node.js)     │◀───│ (Temp Files)    │    │    (onPC)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
       │                     │                      │                       │
       │   POST /test        │   Write script       │   Execute Lua         │
       │   {script}          │   to temp file       │   via LuaFile         │
       │                     │                      │                       │
       │                     │   Poll for           │   Write result        │
       │                     │   result.json        │   to JSON file        │
       │                     │                      │                       │
       │   Response:         │   Parse JSON         │                       │
       │   {success,         │   and return         │                       │
       │    outputs,         │                      │                       │
       │    errors}          │                      │                       │
```

## Key Components

### Source Files (`src/`)

| File | Purpose |
|------|---------|
| `server.ts` | Main Express server with API endpoints |
| `script-runner.ts` | Wraps and executes scripts, manages results |
| `lua-wrapper.ts` | Lua template that captures Printf/errors |
| `result-watcher.ts` | Polls for and parses result JSON files |
| `health-check.ts` | Checks MA3 availability via OSC/UDP |
| `config.ts` | Configuration management |
| `types.ts` | TypeScript interfaces |

### Flow: Script Execution

```typescript
// 1. Script received via POST /test
const { script } = req.body;

// 2. ScriptRunner wraps the script
const wrappedScript = wrapLuaScript(script, testId, resultPath);

// 3. Wrapped script written to temp file
fs.writeFileSync(scriptFile, wrappedScript);

// 4. OSC command sent to MA3
oscClient.send('/cmd', `LuaFile "${scriptFile}"`);

// 5. Wait for result file (MA3 writes this)
const result = await waitForResult(resultFile, timeout);

// 6. Return structured result
return { success, outputs, errors, executionTime };
```

## API Endpoints

### `GET /health`
Check bridge and MA3 status.

```json
{
  "status": "connected",
  "bridge": "running",
  "ma3": {
    "host": "127.0.0.1",
    "port": 8000,
    "available": true,
    "message": "MA3 reachable at 127.0.0.1:8000 (UDP)"
  },
  "resultDir": "C:\\Users\\...\\gma3_results",
  "uptime": 123.456
}
```

### `POST /test`
Execute a Lua script with full result capture.

**Request:**
```json
{
  "script": "Printf(\"Hello World!\")\nlocal x = 1 + 2\nPrintf(\"Sum: \" .. x)"
}
```

**Response (Success):**
```json
{
  "success": true,
  "outputs": ["Hello World!", "Sum: 3"],
  "errors": [],
  "executionTime": 1234,
  "testId": "abc12345"
}
```

**Response (Error):**
```json
{
  "success": false,
  "outputs": ["Starting..."],
  "errors": ["attempt to index a nil value (global 'undefined_variable')"],
  "executionTime": 567
}
```

### `GET /ma3/health`
Check only MA3 availability.

### `POST /test-connection`
Run a simple test script to verify end-to-end connectivity.

### `GET /jobs` / `GET /jobs/:id`
List or get specific test job status.

## Lua Wrapper

The magic happens in `lua-wrapper.ts`. User scripts are wrapped with code that:

1. **Overrides Printf/Echo** to capture outputs
2. **Uses pcall** for error handling
3. **Writes JSON results** to a file that the bridge can read

```lua
-- Auto-generated wrapper (simplified)
local results = { success = true, errors = {}, outputs = {} }
local original_Printf = Printf

-- Override Printf to capture
Printf = function(...)
    table.insert(captured_outputs, ...)
    original_Printf(...)
end

-- Execute user code with error handling
local success, err = pcall(function()
    -- USER CODE INSERTED HERE --
end)

-- Write results to JSON file
local file = io.open(result_path, "w")
file:write(json_encode(results))
file:close()
```

## Configuration

Environment variables (`.env`):

```env
# Bridge server port
PORT=3001

# Your Vercel/Copilot app URL
VERCEL_APP_URL=http://localhost:3000

# MA3 OSC Configuration
MA3_HOST=127.0.0.1
MA3_PORT=8000

# Result Capture Settings
RESULT_DIR=C:/Users/<username>/AppData/Local/Temp/gma3_results

# Script timeout in milliseconds
SCRIPT_TIMEOUT=30000

# Clean up temporary files after execution
CLEANUP_TEMP_FILES=true
```

## MA3 Setup Requirements

1. **Start GrandMA3 onPC**
2. **Enable OSC**: Menu → In & Out → OSC → Enable "Input" → Set Port to 8000
3. **Ensure write access** to the temp directory

## Running the Bridge

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start

# Run tests
npm test
npm run test:success   # Test successful script
npm run test:error     # Test error handling
npm run test:health    # Test MA3 detection
```

## TypeScript Interfaces

```typescript
interface ScriptResult {
  success: boolean;        // Whether script executed without errors
  outputs: string[];       // Captured Printf() outputs
  errors: string[];        // Captured error messages
  executionTime: number;   // Execution time in ms
  testId: string;          // Unique test identifier
  rawData?: object;        // Raw JSON from result file
  luaFile?: string;        // Original file path (if applicable)
}

interface BridgeConfig {
  port: number;
  vercelAppUrl: string;
  ma3Host: string;
  ma3Port: number;
  resultDir: string;
  scriptTimeout: number;
  cleanupTempFiles: boolean;
  pollingInterval: number;
}
```

## Troubleshooting

### "Timeout - no result file created"
- Verify MA3 onPC is running with OSC enabled
- Check the result directory is writable by MA3
- Look at MA3 Command Line for error messages
- Try increasing `SCRIPT_TIMEOUT`

### "MA3 not available"
- Start MA3 onPC
- Enable OSC in MA3 settings
- Check port configuration matches
- Verify no firewall is blocking UDP

### Script executes but no output captured
- Use `Printf()` not `print()` for output
- Check the result directory path is accessible
- Verify MA3 can write to the temp directory

## Security Notes

- The bridge only accepts connections from localhost by default
- No authentication is implemented (suitable for local development)
- Result files are stored in temp directory and cleaned up after execution
- **Do not expose this service to the internet**

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `cors` | Cross-origin requests |
| `node-osc` | OSC protocol for MA3 communication |
| `uuid` | Unique test identifiers |
| `dotenv` | Environment configuration |
| `typescript` | Type safety |
