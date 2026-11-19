/**
 * Release-file obfuscation (shared by the content build and the document service).
 *
 * This is NOT security: everything needed to decode ships with the client. It only stops a
 * curious reader from finding withheld text in clear in the network tab or the file list.
 *
 *   file name  data/releases/<releaseFileName(key)>.json   16 hex chars, hash of salt + key
 *   file body  {"v":1,"d":"<base64>"}                      UTF-8 JSON of { rxId: html },
 *                                                          XORed with a keystream seeded by
 *                                                          salt + key
 *
 * Pure and synchronous; uses only TextEncoder/TextDecoder/btoa/atob (browser and Node).
 */

export const RELEASE_SALT = 'MERIDIAN/rx/v1';
export const RELEASE_CODEC_VERSION = 1;

export interface EncodedRelease {
  v: number;
  d: string;
}

/** cyrb53-style 53-bit string hash, split into two 32-bit halves. */
function hash2(s: string, seed = 0): [number, number] {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}

const hex8 = (n: number) => n.toString(16).padStart(8, '0');

/** Release file name (without .json) for a key: does not spell out the compartment. */
export function releaseFileName(key: string, salt = RELEASE_SALT): string {
  const [a, b] = hash2(`${salt}|name|${key}`);
  return hex8(a) + hex8(b);
}

/** sfc32 keystream seeded from salt + key. */
function keystream(key: string, salt: string): () => number {
  let [a, b] = hash2(`${salt}|ks|${key}`, 1);
  let [c, d] = hash2(`${salt}|ks|${key}`, 2);
  let buf = 0;
  let left = 0;
  const next32 = () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let i = 0; i < 12; i++) next32();
  return () => {
    if (!left) {
      buf = next32();
      left = 4;
    }
    const byte = buf & 0xff;
    buf >>>= 8;
    left--;
    return byte;
  };
}

function xor(bytes: Uint8Array, key: string, salt: string): Uint8Array {
  const ks = keystream(key, salt);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i]! ^ ks();
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function encodeRelease(key: string, body: Record<string, string>, salt = RELEASE_SALT): EncodedRelease {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  return { v: RELEASE_CODEC_VERSION, d: toBase64(xor(bytes, key, salt)) };
}

export function isEncodedRelease(x: unknown): x is EncodedRelease {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Object.keys(o).length === 2 && o.v === RELEASE_CODEC_VERSION && typeof o.d === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(o.d);
}

/** Decode a release file; throws when the payload is not an encoded release for this key. */
export function decodeRelease(key: string, payload: unknown, salt = RELEASE_SALT): Record<string, string> {
  if (!isEncodedRelease(payload)) throw new Error('release file is not encoded');
  const json = new TextDecoder('utf-8', { fatal: true }).decode(xor(fromBase64(payload.d), key, salt));
  const body = JSON.parse(json) as unknown;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('release file has no body');
  return body as Record<string, string>;
}
