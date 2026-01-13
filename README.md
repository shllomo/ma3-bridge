# MA3 Bridge Local Service (v2.0)

A lightweight Node.js service that bridges between the Vercel AI app and your local GrandMA3 onPC instance, enabling Lua script testing with **full result capture**.

## What's New in v2.0

- **Full Result Capture**: Scripts now return actual success/failure status, Printf outputs, and error messages
- **Health Check**: Detect if MA3 is running before executing scripts
- **Test Suite**: Three built-in tests to verify the implementation

## How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Vercel App │───▶│   Bridge    │───▶│ File System │◀───│    MA3      │
│             │◀───│             │◀───│             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                 │                  │                   │
       │   POST /test    │   Write script   │   Execute Lua     │
       │   {script}      │   to temp file   │   via LuaFile     │
       │                 │                  │                   │
       │                 │   Poll for       │   Write result    │
       │                 │   result.json    │   to JSON file    │
       │                 │                  │                   │
       │   Response:     │   Parse JSON     │                   │
       │   {success,     │   and return     │                   │
       │    outputs,     │                  │                   │
       │    errors}      │                  │                   │
```

## Prerequisites

- Node.js 18+ installed
- GrandMA3 onPC running with OSC enabled
- The MA3 Copilot AI app (running locally or on Vercel)

## Installation

```bash
# Clone or navigate to the ma3-bridge-local directory
cd ma3-bridge-local

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Configuration

Create a `.env` file in the root directory:

```env
# Bridge server port
PORT=3001

# Your Vercel app URL
VERCEL_APP_URL=http://localhost:3000

# MA3 OSC Configuration
MA3_HOST=127.0.0.1
MA3_PORT=8000

# Result Capture Settings
# Directory for result files (must be accessible by MA3)
# RESULT_DIR=C:/Users/<username>/AppData/Local/Temp/gma3_results

# Script timeout in milliseconds
SCRIPT_TIMEOUT=30000

# Clean up temporary files after execution
CLEANUP_TEMP_FILES=true
```

### Default Values
- Bridge Port: 3001
- Vercel App: http://localhost:3000
- MA3 Host: 127.0.0.1
- MA3 Port: 8000
- Result Dir: System temp + /gma3_results
- Script Timeout: 30000ms

## Running the Bridge

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Run Tests
```bash
# Run all tests
npm test

# Run individual tests
npm run test:success   # Test successful script execution
npm run test:error     # Test error script handling
npm run test:health    # Test MA3 availability detection
```

## MA3 onPC Setup

1. **Start GrandMA3 onPC**
   - Launch the application
   - Load or create a show file

2. **Enable OSC**
   - Go to: Menu → In & Out → OSC
   - Enable "Input" checkbox
   - Set Port to 8000 (or your configured port)
   - Apply settings

3. **Open Command Line Window** (optional, for debugging)
   - Go to: System → Command Line Feedback
   - This window will show script output and errors

## API Endpoints

### GET /health
Check bridge and MA3 status.

**Response:**
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

### POST /test
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
  "outputs": [
    "Hello World!",
    "Sum: 3"
  ],
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
  "executionTime": 567,
  "testId": "def67890"
}
```

### GET /ma3/health
Check only MA3 availability.

**Response:**
```json
{
  "available": true,
  "message": "MA3 reachable at 127.0.0.1:8000 (UDP)",
  "host": "127.0.0.1",
  "port": 8000
}
```

### POST /test-connection
Run a simple test script to verify end-to-end connectivity.

### GET /jobs
List all test jobs.

### GET /jobs/:id
Get specific job status.

## Project Structure

```
ma3-bridge-local/
├── src/
│   ├── server.ts          # Main server with API endpoints
│   ├── script-runner.ts   # Wraps & executes scripts
│   ├── result-watcher.ts  # Polls for result files
│   ├── health-check.ts    # MA3 availability detection
│   ├── lua-wrapper.ts     # Lua wrapper template
│   ├── types.ts           # TypeScript interfaces
│   ├── config.ts          # Configuration
│   └── tests/
│       ├── run-tests.ts   # Test runner
│       ├── test-success.ts
│       ├── test-error.ts
│       └── test-health.ts
├── dist/                   # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## Troubleshooting

### "Timeout - no result file created"

**Problem:** Script was sent but no result file appeared.

**Solutions:**
1. Verify MA3 onPC is running with OSC enabled
2. Check the result directory is writable by MA3
3. Look at MA3 Command Line for error messages
4. Try increasing `SCRIPT_TIMEOUT`

### "MA3 not available"

**Problem:** Health check fails.

**Solutions:**
1. Start MA3 onPC
2. Enable OSC in MA3 settings
3. Check the port configuration matches
4. Verify no firewall is blocking

### Script executes but no output captured

**Problem:** MA3 runs the script but outputs aren't captured.

**Solutions:**
1. Use `Printf()` not `print()` for output
2. Check the result directory path is accessible
3. Verify MA3 can write to the temp directory

## Security Notes

- The bridge only accepts connections from localhost by default
- No authentication is implemented (suitable for local development)
- Result files are stored in temp directory and cleaned up after execution

## License

MIT
