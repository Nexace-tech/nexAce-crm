export interface DeviceTelemetry {
  type: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  os: string;
  browser: string;
  ip: string;
  userAgent?: string;
}

type HeaderSource = Request | Headers | { get(name: string): string | null } | undefined | null;

function getHeader(source: HeaderSource, name: string): string | null {
  if (!source) return null;
  if ("headers" in source && source.headers && typeof source.headers.get === "function") {
    return source.headers.get(name);
  }
  if (typeof (source as any).get === "function") {
    return (source as any).get(name);
  }
  return null;
}

/**
 * Extracts the real client IP address from request headers across various reverse-proxies
 * (Cloudflare, AWS ALB, Nginx, Vercel, Node).
 */
export function extractClientIp(reqOrHeaders?: HeaderSource): string {
  try {
    const xForwardedFor = getHeader(reqOrHeaders, "x-forwarded-for");
    if (xForwardedFor) {
      const firstIp = xForwardedFor.split(",")[0]?.trim();
      if (firstIp && firstIp !== "::1") {
        return firstIp.replace(/^::ffff:/, ""); // Normalize IPv4-mapped IPv6
      }
    }

    const cfConnectingIp = getHeader(reqOrHeaders, "cf-connecting-ip");
    if (cfConnectingIp) return cfConnectingIp.trim();

    const xRealIp = getHeader(reqOrHeaders, "x-real-ip");
    if (xRealIp) return xRealIp.trim();

    const clientIp = getHeader(reqOrHeaders, "x-client-ip");
    if (clientIp) return clientIp.trim();

    return "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

/**
 * Parses Device Form Factor, OS, and Browser from HTTP Request headers
 * without requiring any user browser permissions.
 */
export function parseClientTelemetry(reqOrHeaders?: HeaderSource): DeviceTelemetry {
  const ip = extractClientIp(reqOrHeaders);
  const ua = getHeader(reqOrHeaders, "user-agent") || "";
  const secChMobile = getHeader(reqOrHeaders, "sec-ch-ua-mobile");
  const secChPlatform = getHeader(reqOrHeaders, "sec-ch-ua-platform")?.replace(/['"]/g, "");

  // 1. Device Form Factor Detection
  let type: "Desktop" | "Mobile" | "Tablet" | "Unknown" = "Desktop";
  const isTablet = /iPad|tablet|(android(?!.*mobile))/i.test(ua);
  const isMobile = secChMobile === "?1" || /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua);

  if (isTablet) {
    type = "Tablet";
  } else if (isMobile) {
    type = "Mobile";
  } else if (ua) {
    type = "Desktop";
  } else {
    type = "Unknown";
  }

  // 2. Operating System Detection
  let os = secChPlatform || "";
  if (!os || os === "Unknown") {
    if (/Windows NT 10.0|Windows NT 11.0/i.test(ua)) os = "Windows 11/10";
    else if (/Windows NT 6.3/i.test(ua)) os = "Windows 8.1";
    else if (/Windows NT 6.1/i.test(ua)) os = "Windows 7";
    else if (/Windows/i.test(ua)) os = "Windows";
    else if (/iPhone|iPod/i.test(ua)) os = "iOS";
    else if (/iPad/i.test(ua)) os = "iPadOS";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Linux/i.test(ua)) os = "Linux";
    else if (/CrOS/i.test(ua)) os = "ChromeOS";
    else os = "Unknown OS";
  }

  // 3. Browser Detection
  let browser = "Unknown Browser";
  if (/Edg\//i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/OPR\/|Opera\//i.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = "Apple Safari";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Mozilla Firefox";
  }

  return {
    ip,
    type,
    os,
    browser,
    userAgent: ua.slice(0, 300),
  };
}
