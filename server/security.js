import { URL } from 'node:url';
import dns from 'node:dns/promises';

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/
];

export function normalizeUrl(inputUrl) {
  let trimmed = inputUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

export async function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(normalizeUrl(rawUrl));
  } catch (err) {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and standard loopback hostnames
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '0.0.0.0') {
    return { valid: false, reason: 'Access to localhost is restricted' };
  }

  // Resolve hostname to IP to verify against SSRF private ranges
  try {
    const lookup = await dns.lookup(hostname);
    const ip = lookup.address;

    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(ip)) {
        return { valid: false, reason: 'Access to private internal network addresses is blocked' };
      }
    }
  } catch (err) {
    // If DNS resolution fails, allow Puppeteer to attempt or reject if unreachable
    return { valid: false, reason: `Could not resolve domain: ${hostname}` };
  }

  return { valid: true, url: parsed.toString() };
}
