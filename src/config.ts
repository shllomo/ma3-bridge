// Default configuration for MA3 Bridge
// You can override these with environment variables

import * as path from 'path';
import * as os from 'os';

export const config = {
  // Bridge server port
  port: Number.parseInt(process.env.PORT || '3001', 10),
  
  // Vercel app URL
  vercelAppUrl: process.env.VERCEL_APP_URL || 'http://localhost:3000',
  
  // MA3 OSC Configuration
  ma3: {
    host: process.env.MA3_HOST || '127.0.0.1',
    port: Number.parseInt(process.env.MA3_PORT || '8000', 10),
  },
  
  // Result capture settings
  resultDir: process.env.RESULT_DIR || path.join(os.tmpdir(), 'gma3_results'),
  scriptTimeout: Number.parseInt(process.env.SCRIPT_TIMEOUT || '30000', 10),
  cleanupTempFiles: process.env.CLEANUP_TEMP_FILES !== 'false',
  
  // Polling interval in milliseconds
  pollingInterval: 1000,
  
  // Optional API secret (for future authentication)
  apiSecret: process.env.API_SECRET,
};
