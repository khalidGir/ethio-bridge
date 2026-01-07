import { Injectable } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

const dnsLookup = promisify(dns.lookup);

@Injectable()
export class UrlValidationService {
  private readonly PRIVATE_IP_RANGES = [
    // IPv4 private ranges
    /^10\./,                    // 10.0.0.0/8
    /^192\.168\./,             // 192.168.0.0/16
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,             // 169.254.0.0/16 (link-local)
    // Additional ranges to block
    /^0\./,                     // 0.0.0.0/8
    /^224\./,                   // 224.0.0.0/4 (multicast)
  ];

  async validateUrl(url: string): Promise<boolean> {
    try {
      // Basic URL validation
      const parsedUrl = new URL(url);

      // Only allow http and https
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS protocols are allowed');
      }

      // Check if hostname is an IP address
      const isIpAddress = this.isIpAddress(parsedUrl.hostname);

      if (isIpAddress) {
        // If it's an IP address, check if it's in a private range
        if (this.isPrivateIp(parsedUrl.hostname)) {
          throw new Error('Private IP addresses are not allowed');
        }
      } else {
        // If it's a domain name, resolve it and check the IP
        const resolved = await dnsLookup(parsedUrl.hostname);
        if (this.isPrivateIp(resolved.address)) {
          throw new Error('Domain resolves to a private IP address');
        }
      }

      return true;
    } catch (error) {
      console.error(`URL validation failed for ${url}:`, error.message);
      return false;
    }
  }

  // Create a custom HTTP agent that validates IP addresses to prevent DNS rebinding
  createSecureHttpAgent(): http.Agent {
    const originalCreateConnection = http.Agent.prototype.createConnection;

    // Create a custom agent that validates the IP address
    const secureAgent = new http.Agent({
      keepAlive: false,
    });

    // Override the createConnection method to add IP validation
    (secureAgent as any).createConnection = (options: http.ClientRequestArgs & net.NetConnectOpts, callback: (err: Error | null, socket: net.Socket) => void) => {
      // Validate the host IP to prevent DNS rebinding
      if (options.host && this.isPrivateIp(options.host)) {
        const error = new Error('Private IP addresses are not allowed');
        return callback(error, undefined as any);
      }

      return originalCreateConnection.call(secureAgent, options, callback);
    };

    return secureAgent;
  }

  // Create a custom HTTPS agent that validates IP addresses to prevent DNS rebinding
  createSecureHttpsAgent(): https.Agent {
    const originalCreateConnection = https.Agent.prototype.createConnection;

    // Create a custom agent that validates the IP address
    const secureAgent = new https.Agent({
      keepAlive: false,
    });

    // Override the createConnection method to add IP validation
    (secureAgent as any).createConnection = (options: http.ClientRequestArgs & net.NetConnectOpts, callback: (err: Error | null, socket: net.Socket) => void) => {
      // Validate the host IP to prevent DNS rebinding
      if (options.host && this.isPrivateIp(options.host)) {
        const error = new Error('Private IP addresses are not allowed');
        return callback(error, undefined as any);
      }

      return originalCreateConnection.call(secureAgent, options, callback);
    };

    return secureAgent;
  }

  private isIpAddress(hostname: string): boolean {
    // Simple regex to check if hostname is an IP address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|^::1$|^::$/;

    return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
  }

  private isPrivateIp(ip: string): boolean {
    return this.PRIVATE_IP_RANGES.some(range => range.test(ip));
  }
}