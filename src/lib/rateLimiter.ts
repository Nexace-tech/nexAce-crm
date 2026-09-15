import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { RateLimit } from "@/models/RateLimit";

type WindowState = { count: number; resetAt: number };

const WINDOW_MS = 5 * 60 * 1000; // 5 minute rolling window
const OTP_MAX_PER_EMAIL = 5;     // max OTP sends per address per window
const OTP_MAX_PER_IP = 10;       // max OTP sends per IP per window (anti-enumeration)
const VERIFY_MAX_PER_EMAIL = 10; // max verification attempts per email per window (allows typos)
const VERIFY_MAX_PER_IP = 20;    // max verification attempts per IP per window

const memoryStore = new Map<string, WindowState>();

/** In-memory fallback if MongoDB connection drops */
function takeMemory(prefix: string, id: string, windowMs: number): WindowState {
  const key = `${prefix}:${id}`;
  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || now > existing.resetAt) {
    const next: WindowState = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, next);
    return next;
  }
  existing.count += 1;
  return existing;
}

/**
 * Increment the counter for `id`, persisting to MongoDB with a TTL index
 * so that rate limits are shared across all Vercel serverless instances.
 * Falls back safely to memory if DB connection is unavailable.
 */
async function take(prefix: string, id: string, windowMs: number): Promise<WindowState> {
  const key = `${prefix}:${id}`;
  const now = Date.now();
  const resetAtDate = new Date(now + windowMs);

  try {
    await connectToDatabase();

    const existing = await RateLimit.findOne({ key });
    if (!existing || new Date(existing.resetAt).getTime() <= now) {
      const updated = await RateLimit.findOneAndUpdate(
        { key },
        { $set: { count: 1, resetAt: resetAtDate, createdAt: new Date() } },
        { upsert: true, new: true }
      );
      return {
        count: updated?.count ?? 1,
        resetAt: updated?.resetAt ? new Date(updated.resetAt).getTime() : resetAtDate.getTime(),
      };
    } else {
      const updated = await RateLimit.findOneAndUpdate(
        { key },
        { $inc: { count: 1 } },
        { new: true }
      );
      return {
        count: updated?.count ?? existing.count + 1,
        resetAt: new Date(existing.resetAt).getTime(),
      };
    }
  } catch {
    // Graceful fallback to in-memory store if DB is temporarily unreachable
    return takeMemory(prefix, id, windowMs);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  limit: number;
  remaining: number;
}

async function check(
  prefix: string,
  email: string,
  ip: string | undefined,
  maxEmail: number,
  maxIp: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const [emailBucket, ipBucket] = await Promise.all([
    take(`${prefix}-email`, email.toLowerCase(), windowMs),
    take(`${prefix}-ip`, ip || "unknown", windowMs),
  ]);

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
 * MongoDB TTL-backed rate limiter for OTP send requests.
 * Shared across all Vercel serverless instances.
 */
export async function rateLimitOtp(email: string, ip: string | undefined): Promise<RateLimitResult> {
  return check("otp", email, ip, OTP_MAX_PER_EMAIL, OTP_MAX_PER_IP, WINDOW_MS);
}

/**
 * Rate limit verification (code-submit) attempts to prevent brute-forcing a
 * 6-digit OTP. Slightly higher thresholds than sending to allow for typos.
 */
export async function rateLimitVerify(email: string, ip: string | undefined): Promise<RateLimitResult> {
  return check("verify", email, ip, VERIFY_MAX_PER_EMAIL, VERIFY_MAX_PER_IP, WINDOW_MS);
}

const LOGIN_MAX_PER_EMAIL = 5;   // max login attempts per email per window
const LOGIN_MAX_PER_IP = 15;      // max login attempts per IP per window

/**
 * Rate limit login attempts to prevent brute-force and password guessing attacks.
 */
export async function rateLimitLogin(email: string, ip: string | undefined): Promise<RateLimitResult> {
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
