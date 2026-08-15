import type { Env } from "./env.d";

const PBKDF2_ITERATIONS = 100_000;
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h
const SESSION_COOKIE = "admin_session";

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(str.length / 4) * 4, "=");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string, saltB64?: string): Promise<string> {
  const salt = saltB64 ? b64urlDecode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const hash = b64urlEncode(new Uint8Array(bits));
  return `${b64urlEncode(salt)}:${PBKDF2_ITERATIONS}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, iterationsStr, expectedHash] = stored.split(":");
  if (!saltB64 || !iterationsStr || !expectedHash) return false;
  const salt = b64urlDecode(saltB64);
  const iterations = parseInt(iterationsStr, 10);
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, 256);
  const actualHash = b64urlEncode(new Uint8Array(bits));
  return timingSafeEqual(actualHash, expectedHash);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

async function signToken(secret: string, payload: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(new TextEncoder().encode(json));
  const sig = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

async function verifyToken<T>(secret: string, token: string): Promise<T | null> {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expectedSig = await hmacSign(secret, payloadB64);
  if (!timingSafeEqual(sig, expectedSig)) return null;
  try {
    const json = new TextDecoder().decode(b64urlDecode(payloadB64));
    const payload = JSON.parse(json) as T & { exp: number };
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSessionCookie(env: Env): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signToken(env.SESSION_HMAC_SECRET, { sub: "admin", exp });
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=0`;
}

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function isAuthenticated(req: Request, env: Env): Promise<boolean> {
  const cookie = getCookie(req, SESSION_COOKIE);
  if (!cookie) return false;
  const payload = await verifyToken<{ sub: string }>(env.SESSION_HMAC_SECRET, cookie);
  return payload?.sub === "admin";
}

const PREVIEW_TTL_SECONDS = 10 * 60;

export async function createPreviewCookie(env: Env, sampleId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + PREVIEW_TTL_SECONDS;
  const token = await signToken(env.PREVIEW_HMAC_SECRET, { sampleId, exp });
  // SameSite=None (not Strict) is required here: the public site (pages.dev) and this
  // Worker (workers.dev) are different registrable domains, so the <iframe> navigation
  // into /preview/... is a cross-site request from the browser's point of view even
  // though it's "our" worker. The cookie is narrowly scoped (single sampleId, 10min TTL,
  // HttpOnly) so relaxing SameSite here doesn't expose anything beyond this one preview.
  // "Partitioned" (CHIPS) keeps this cookie working under browsers' third-party
  // cookie restrictions: it scopes the cookie to (this worker origin, top-level
  // site = the portfolio), which is exactly the one embedding relationship we
  // need — no cross-site tracking implications since the cookie never needs to
  // follow the visitor to a different top-level site.
  return `preview_tok_${sampleId}=${token}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/preview/${sampleId}/; Max-Age=${PREVIEW_TTL_SECONDS}`;
}

export async function verifyPreviewAccess(req: Request, env: Env, sampleId: string): Promise<boolean> {
  const cookie = getCookie(req, `preview_tok_${sampleId}`);
  if (!cookie) return false;
  const payload = await verifyToken<{ sampleId: string }>(env.PREVIEW_HMAC_SECRET, cookie);
  return payload?.sampleId === sampleId;
}
