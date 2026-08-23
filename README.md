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

## Production Setup (Expose to Internet)

To allow users of your deployed Vercel app to test scripts on YOUR MA3 console, you need to expose the bridge to the internet.

### Step 1: Enable API Authentication

**IMPORTANT:** Before exposing to the internet, enable API authentication!

1. Create a strong secret key:
   ```bash
   # Generate a random 32-character key
   openssl rand -hex 16
   ```

2. Add to your `.env` file:
   ```env
   API_SECRET=your-generated-secret-key
   ```

3. Restart the bridge - you should see:
   ```
   🔒 API Authentication: ENABLED (API_SECRET set)
   ```

### Step 2: Expose with ngrok (Easiest)

1. Install ngrok: https://ngrok.com/download

2. Start the bridge:
   ```bash
   npm start
   ```

3. In a new terminal, start ngrok:
   ```bash
   ngrok http 3001
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### Step 2 (Alternative): Cloudflare Tunnel

More stable for long-term use:

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

2. Start tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```

3. Copy the generated URL

### Step 3: Configure Vercel Environment Variables

In your Vercel dashboard (Settings → Environment Variables):

```
NEXT_PUBLIC_MA3_BRIDGE_URL=https://your-ngrok-url.ngrok-free.app
NEXT_PUBLIC_MA3_BRIDGE_SECRET=your-generated-secret-key
```

> **Note:** Use `NEXT_PUBLIC_` prefix so these are available in the browser.

### Step 4: Redeploy

Redeploy your Vercel app for changes to take effect:
```bash
vercel --prod
```

### Production Checklist

- [ ] API_SECRET is set in bridge `.env`
- [ ] ngrok/tunnel is running and stable
- [ ] NEXT_PUBLIC_MA3_BRIDGE_URL is set in Vercel
- [ ] NEXT_PUBLIC_MA3_BRIDGE_SECRET matches API_SECRET
- [ ] MA3 onPC is running with OSC enabled
- [ ] Test the "Test Script" button from production app

### Keeping the Bridge Running

For persistent operation:

**Windows (Task Scheduler):**
Create a scheduled task to run `start-bridge.bat` at startup.

**Linux/Mac (systemd or pm2):**
```bash
# Using pm2
npm install -g pm2
pm2 start npm --name "ma3-bridge" -- start
pm2 startup
pm2 save
```

### Troubleshooting Production

**"Cannot connect to MA3 Bridge"**
- Verify ngrok/tunnel is running
- Check the URL in Vercel matches your tunnel URL
- ngrok free tier URLs change each restart - update Vercel env vars

**"Unauthorized: Invalid or missing API secret"**
- Verify NEXT_PUBLIC_MA3_BRIDGE_SECRET matches API_SECRET
- Redeploy Vercel app after changing env vars

**ngrok rate limits**
- Free ngrok has request limits
- Consider ngrok paid plan or Cloudflare Tunnel for production

## Security Notes

- **Always enable API_SECRET** when exposing to internet
- The bridge validates X-API-Secret header on all requests (except /health)
- Result files are stored in temp directory and cleaned up after execution
- Consider IP allowlisting in ngrok for additional security

## License

MIT
