import { headers } from "next/headers";

type WindowState = { count: number; resetAt: number };

const WINDOW_MS = 5 * 60 * 1000; // 5 minute rolling window
const OTP_MAX_PER_EMAIL = 3;     // max OTP sends per address per window
const OTP_MAX_PER_IP = 10;       // max OTP sends per IP per window (anti-enumeration)
const VERIFY_MAX_PER_EMAIL = 10; // max verification attempts per email per window (allows typos)
const VERIFY_MAX_PER_IP = 20;    // max verification attempts per IP per window

const store = new Map<string, WindowState>();

/**
 * SERVERLESS WARNING: This in-memory store is NOT shared across Node.js instances.
 * In multi-instance deployments (e.g. Vercel serverless) rate-limit state is per-instance,
 * meaning an attacker can bypass limits by triggering different instances.
 * Replace with a shared store (e.g. Upstash Redis) for production-grade enforcement.
 */
if (process.env.NODE_ENV === "production") {
  console.warn(
    "[rateLimiter] WARNING: Using in-memory rate limiter in production. " +
    "This is NOT effective across serverless instances. Configure UPSTASH_REDIS_REST_URL " +
    "and replace this store with a shared Redis-backed implementation."
  );
}

/** Increment the counter for `id`, starting a fresh window if expired. */
function take(prefix: string, id: string, windowMs: number): WindowState {
  const key = `${prefix}:${id}`;
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now > existing.resetAt) {
    const next: WindowState = { count: 1, resetAt: now + windowMs };
    store.set(key, next);
    return next;
  }
  existing.count += 1;
  return existing;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  limit: number;
  remaining: number;
}

function check(
  prefix: string,
  email: string,
  ip: string | undefined,
  maxEmail: number,
  maxIp: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const emailBucket = take(`${prefix}-email`, email.toLowerCase(), windowMs);
  const ipBucket = take(`${prefix}-ip`, ip || "unknown", windowMs);

  const emailExceeded = emailBucket.count > maxEmail;
  const ipExceeded = ipBucket.count > maxIp;

  if (emailExceeded || ipExceeded) {
    const retryAfterMs = Math.max(emailBucket.resetAt, ipBucket.resetAt) - now;
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 0),
      limit: emailExceeded ? maxEmail : maxIp,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterMs: 0,
    limit: maxEmail,
    remaining: Math.max(0, maxEmail - emailBucket.count),
  };
}

/**
 * Fixed-window in-memory rate limiter for OTP send requests.
 * Effective for a single long-running Node process (next start / dev).
 * For multi-instance serverless deployments, back this with a shared store
 * (e.g. Redis / Upstash) instead.
 */
export function rateLimitOtp(email: string, ip: string | undefined): RateLimitResult {
  return check("otp", email, ip, OTP_MAX_PER_EMAIL, OTP_MAX_PER_IP, WINDOW_MS);
}

/**
 * Rate limit verification (code-submit) attempts to prevent brute-forcing a
 * 6-digit OTP. Slightly higher thresholds than sending to allow for typos.
 */
export function rateLimitVerify(email: string, ip: string | undefined): RateLimitResult {
  return check("verify", email, ip, VERIFY_MAX_PER_EMAIL, VERIFY_MAX_PER_IP, WINDOW_MS);
}

const LOGIN_MAX_PER_EMAIL = 5;   // max login attempts per email per window
const LOGIN_MAX_PER_IP = 15;      // max login attempts per IP per window

/**
 * Rate limit login attempts to prevent brute-force and password guessing attacks.
 */
export function rateLimitLogin(email: string, ip: string | undefined): RateLimitResult {
  return check("login", email, ip, LOGIN_MAX_PER_EMAIL, LOGIN_MAX_PER_IP, WINDOW_MS);
}

export async function getClientIp(): Promise<string | undefined> {
  try {
    const header = await headers();
    const xff = header.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim();
    return header.get("x-real-ip")?.trim() || undefined;
  } catch {
    return undefined;
  }
}
