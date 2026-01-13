/**
 * MA3 Health Check Module
 * Detects if MA3 is running and reachable
 */

import * as net from 'net';
import * as dgram from 'dgram';
import { MA3HealthStatus } from './types.js';

/**
 * Check if MA3 is reachable via TCP or UDP
 * First tries TCP, then checks if UDP port is in use
 * 
 * @param host - MA3 host address
 * @param port - MA3 OSC port
 * @param timeout - Timeout in milliseconds
 * @returns Health status with availability and message
 */
export async function checkMA3Health(
  host: string = '127.0.0.1',
  port: number = 8000,
  timeout: number = 2000
): Promise<MA3HealthStatus> {
  // Try TCP port 9000 first (MA3's TCP OSC port)
  const tcpPort = 9000;
  
  const tcpResult = await tryTcpConnection(host, tcpPort, timeout);
  if (tcpResult.available) {
    return {
      available: true,
      message: `MA3 is running at ${host} (TCP port ${tcpPort} open)`,
      host,
      port,
    };
  }
  
  // Try the configured port via TCP
  if (port !== tcpPort) {
    const portTcp = await tryTcpConnection(host, port, timeout);
    if (portTcp.available) {
      return {
        available: true,
        message: `MA3 is running at ${host}:${port} (TCP open)`,
        host,
        port,
      };
    }
  }
  
  // Check if UDP port is in use (MA3 typically uses UDP for OSC)
  const udpInUse = await checkUdpPortInUse(port);
  if (udpInUse) {
    return {
      available: true,
      message: `MA3 is running at ${host}:${port} (UDP port in use)`,
      host,
      port,
    };
  }
  
  return {
    available: false,
    message: `MA3 is NOT running. No listener found on ${host} ports ${tcpPort} (TCP) or ${port} (UDP).`,
    host,
    port,
  };
}

/**
 * Check if a UDP port is in use by trying to bind to it
 * If bind fails, the port is in use (likely by MA3)
 */
async function checkUdpPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    
    socket.on('error', (err: NodeJS.ErrnoException) => {
      socket.close();
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        // Port is in use - something is listening
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    // Bind to 0.0.0.0 to detect any binding on this port
    socket.bind(port, '0.0.0.0', () => {
      // Bind succeeded - port is NOT in use
      socket.close();
      resolve(false);
    });
  });
}

/**
 * Try to establish a TCP connection to check if a port is open
 */
async function tryTcpConnection(
  host: string,
  port: number,
  timeout: number
): Promise<{ available: boolean; message: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    // Set timeout
    socket.setTimeout(timeout);

    socket.on('connect', () => {
      cleanup();
      resolve({
        available: true,
        message: `Connected to ${host}:${port}`,
      });
    });

    socket.on('timeout', () => {
      cleanup();
      resolve({
        available: false,
        message: `Timeout connecting to ${host}:${port}`,
      });
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      cleanup();
      if (err.code === 'ECONNREFUSED') {
        resolve({
          available: false,
          message: `Connection refused at ${host}:${port} - MA3 not running`,
        });
      } else {
        resolve({
          available: false,
          message: `Cannot connect to ${host}:${port}: ${err.message}`,
        });
      }
    });

    // Try to connect
    try {
      socket.connect(port, host);
    } catch (error) {
      cleanup();
      resolve({
        available: false,
        message: `Exception connecting to ${host}:${port}: ${error}`,
      });
    }
  });
}

/**
 * Send a test command to MA3 and verify it was sent
 * This is a more thorough check that actually sends an OSC message
 * 
 * @param oscClient - The OSC client to use
 * @param host - MA3 host address
 * @param port - MA3 OSC port
 * @returns Health status
 */
export async function verifyMA3Connection(
  // biome-ignore lint/suspicious/noExplicitAny: OSC client type
  oscClient: any,
  host: string,
  port: number
): Promise<MA3HealthStatus> {
  return new Promise((resolve) => {
    try {
      // Send a simple echo command
      oscClient.send('/cmd', 'Echo "MA3 Bridge Health Check"', (error: Error | undefined) => {
        if (error) {
          resolve({
            available: false,
            message: `Failed to send test command to MA3: ${error.message}`,
            host,
            port,
          });
        } else {
          resolve({
            available: true,
            message: `Connected to MA3 at ${host}:${port}`,
            host,
            port,
          });
        }
      });
    } catch (error) {
      resolve({
        available: false,
        message: `Exception verifying MA3 connection: ${error}`,
        host,
        port,
      });
    }
  });
}

/**
 * Full health check combining TCP reachability and OSC verification
 */
export async function fullMA3HealthCheck(
  host: string = '127.0.0.1',
  port: number = 8000,
  // biome-ignore lint/suspicious/noExplicitAny: OSC client type
  oscClient?: any
): Promise<MA3HealthStatus> {
  // First check TCP reachability
  const tcpCheck = await checkMA3Health(host, port);
  
  if (!tcpCheck.available) {
    return tcpCheck;
  }
  
  // If OSC client provided, also verify OSC connection
  if (oscClient) {
    return verifyMA3Connection(oscClient, host, port);
  }
  
  return tcpCheck;
}
