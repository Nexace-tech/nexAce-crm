/**
 * FCM Push Notification Sender — Firebase Cloud Messaging HTTP V1 API
 * Uses Service Account credentials (JWT → OAuth2 access token → FCM V1).
 *
 * Required env var:
 *   FCM_SERVICE_ACCOUNT_JSON = the full JSON content of your Firebase service account key file
 *   (paste the entire JSON as a single-line string in .env.local / Vercel env vars)
 */

import crypto from "crypto";

interface FcmPayload {
  title: string;
  message: string;
  linkUrl?: string;
  type?: string;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

// Cache access token to avoid re-generating on every call
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && now < tokenExpiry - 300) {
    return cachedToken;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const signingInput = `${encode(header)}.${encode(payload)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(sa.private_key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[fcm] Failed to get OAuth2 token: ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600);
  return cachedToken!;
}

/**
 * Send FCM push notifications to a list of device tokens via HTTP V1 API.
 * Sends one message per token (V1 API does not support multicast natively).
 * Never throws — errors are logged but never block the caller.
 */
export async function sendFcmPush(
  deviceTokens: string[],
  payload: FcmPayload
): Promise<void> {
  const saJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    console.warn("[fcm] FCM_SERVICE_ACCOUNT_JSON not set — skipping push");
    return;
  }

  if (!deviceTokens || deviceTokens.length === 0) return;

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(saJson);
  } catch {
    console.error("[fcm] Failed to parse FCM_SERVICE_ACCOUNT_JSON");
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch (err) {
    console.error("[fcm] Could not obtain access token:", err);
    return;
  }

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  // Send to each token (V1 is single-token per request)
  const results = await Promise.allSettled(
    deviceTokens.map(async (token) => {
      const body = {
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.message,
          },
          data: {
            title: payload.title,
            body: payload.message,
            type: payload.type || "general",
            linkUrl: payload.linkUrl || "",
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: "nexace_crm_default",
            },
          },
          apns: {
            payload: {
              aps: { sound: "default", badge: 1 },
            },
          },
        },
      };

      const res = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn(`[fcm] Push failed for token ...${token.slice(-8)}: ${text}`);
      }
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`[fcm] Push sent: ${succeeded} succeeded, ${failed} failed`);
}
