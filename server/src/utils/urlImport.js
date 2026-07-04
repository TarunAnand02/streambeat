import dns from 'dns/promises';
import { ApiError } from './ApiError.js';
import { VIDEO_MIME_WHITELIST } from './filename.js';

export const MAX_URL_IMPORT_BYTES = 500 * 1024 * 1024; // 500MB, matches upload cap

function isPrivateOrReservedIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // malformed => treat as unsafe
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
  if (a === 0) return true; // "this network"
  return false;
}

function isPrivateOrReservedIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true; // link-local / unique local
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — check the embedded IPv4 address too
    return isPrivateOrReservedIPv4(lower.replace('::ffff:', ''));
  }
  return false;
}

// Fetching an arbitrary user-supplied URL from the server is a classic SSRF
// vector (e.g. pasting a cloud metadata or internal-network URL to make our
// server fetch/leak internal resources). Resolve the hostname up front and
// reject anything pointing at a private/loopback/link-local address before
// ever making the real request.
export async function validateImportUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new ApiError(400, 'Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiError(400, 'Only http(s) URLs are supported');
  }

  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new ApiError(400, 'Could not resolve that URL\'s host');
  }

  for (const { address, family } of addresses) {
    const isUnsafe = family === 6 ? isPrivateOrReservedIPv6(address) : isPrivateOrReservedIPv4(address);
    if (isUnsafe) {
      throw new ApiError(400, 'That URL points to a private or internal address, which is not allowed');
    }
  }

  return parsed;
}

const MAX_REDIRECTS = 5;

// `fetch(url, { redirect: 'follow' })` would silently chase redirects with no
// re-validation of where they actually land — a public, safe-looking URL can
// 302 to an internal/loopback/link-local address (or use DNS rebinding
// between the check and the real request), fully bypassing
// validateImportUrl's SSRF check. Follow redirects manually instead, so every
// hop is re-validated the same way the original URL was.
export async function fetchAndValidateVideoResponse(url) {
  let currentUrl = url;
  let response;

  for (let hop = 0; ; hop += 1) {
    response = await fetch(currentUrl, { redirect: 'manual' });
    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) break;

    if (hop >= MAX_REDIRECTS) {
      throw new ApiError(400, 'That URL redirected too many times');
    }
    const location = response.headers.get('location');
    if (!location) {
      throw new ApiError(400, 'That URL redirected without a destination');
    }
    currentUrl = await validateImportUrl(new URL(location, currentUrl).toString());
  }

  if (!response.ok) {
    throw new ApiError(400, `Could not fetch that URL (HTTP ${response.status})`);
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim();
  if (!VIDEO_MIME_WHITELIST.includes(contentType)) {
    throw new ApiError(400, `Unsupported content type: ${contentType || 'unknown'}`);
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (contentLength && contentLength > MAX_URL_IMPORT_BYTES) {
    throw new ApiError(413, 'That file exceeds the 500MB size limit');
  }

  return { response, contentType };
}
