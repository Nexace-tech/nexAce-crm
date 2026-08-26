import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const APP_TIMEZONE = "Asia/Kolkata";

/**
 * Returns formatted date string in Indian Standard Time (Asia/Kolkata).
 */
export function formatISTDate(
  date: Date | string | number = new Date(),
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { timeZone: APP_TIMEZONE, ...options });
}

/**
 * Returns formatted time string in Indian Standard Time (Asia/Kolkata).
 */
export function formatISTTime(
  date: Date | string | number = new Date(),
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true }
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("en-IN", { timeZone: APP_TIMEZONE, ...options });
}

/**
 * Returns date in YYYY-MM-DD ISO format according to Indian Standard Time (Asia/Kolkata).
 */
export function getISTDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

/**
 * Formats a number as a currency string. Defaults to Indian Rupee (INR / ₹).
 */
export function formatCurrency(
  amount: number | string = 0,
  currency: string = "INR",
  options: Intl.NumberFormatOptions = {}
): string {
  const num = typeof amount === "string" ? parseFloat(amount) || 0 : isNaN(amount) ? 0 : amount;
  const cur = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
      ...options,
    }).format(num);
  } catch {
    return `${cur === "INR" ? "₹" : "$"}${num.toLocaleString("en-IN")}`;
  }
}

/**
 * Returns the currency symbol. Defaults to ₹ (INR).
 */
export function getCurrencySymbol(currency: string = "INR"): string {
  switch ((currency || "INR").toUpperCase()) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    case "AED": return "AED";
    case "INR":
    default:
      return "₹";
  }
}

export const hexToRGB = (hex: string, alpha?: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (alpha !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export function validatePasswordPattern(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/\d/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number (0-9)." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character (e.g. !@#$%^&*)." };
  }
  return { isValid: true };
}

export function getPasswordCriteria(password: string) {
  return {
    minLength: (password || "").length >= 8,
    hasUpper: /[A-Z]/.test(password || ""),
    hasLower: /[a-z]/.test(password || ""),
    hasNumber: /\d/.test(password || ""),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password || ""),
  };
}

export function generateSecurePassword(length: number = 12): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const specials = "!@#$%^&*_-=";

  const all = uppers + lowers + numbers + specials;

  // Use rejection sampling to eliminate modulo bias in secure randomness
  const randomIndex = (max: number): number => {
    const limit = Math.floor(0x100000000 / max) * max;
    let val: number;
    do {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      val = arr[0];
    } while (val >= limit);
    return val % max;
  };

  const password = [
    uppers[randomIndex(uppers.length)],
    lowers[randomIndex(lowers.length)],
    numbers[randomIndex(numbers.length)],
    specials[randomIndex(specials.length)],
  ];

  for (let i = password.length; i < length; i++) {
    password.push(all[randomIndex(all.length)]);
  }

  // Fisher-Yates shuffle with secure random
  for (let i = password.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join("");
}

/**
 * Resolves the destination deep link for any notification.
 * Uses explicit linkUrl if present, or intelligently determines the target dashboard route from type/title/message.
 */
export function getNotificationTargetUrl(n: { type?: string; title?: string; message?: string; linkUrl?: string }): string | null {
  if (n.linkUrl && n.linkUrl.trim()) return n.linkUrl.trim();

  const title = (n.title || "").toLowerCase();
  const msg = (n.message || "").toLowerCase();
  const type = (n.type || "").toLowerCase();

  if (type === "task" || title.includes("task") || msg.includes("task") || title.includes("project")) {
    return "/dashboard/projects";
  }
  if (type === "chat" || title.includes("message") || msg.includes("message") || title.includes("chat")) {
    return "/dashboard/chat";
  }
  if (type === "announcement" || title.includes("announcement") || msg.includes("announcement")) {
    return "/dashboard/chat?tab=announcements";
  }
  if (type === "leave" || title.includes("leave") || msg.includes("leave")) {
    return "/dashboard/hr?tab=leaves";
  }
  if (type === "appraisal" || title.includes("appraisal") || msg.includes("appraisal")) {
    return "/dashboard/hr?tab=appraisals";
  }
  if (type === "kudos" || title.includes("kudos") || msg.includes("kudos")) {
    return "/dashboard/team?tab=kudos";
  }
  if (type === "referral" || title.includes("referral") || msg.includes("referral")) {
    return "/dashboard/hr?tab=referrals";
  }
  if (type === "okr" || title.includes("okr") || title.includes("goal") || msg.includes("objective")) {
    return "/dashboard/okr";
  }
  if (title.includes("subscription") || msg.includes("subscription") || title.includes("device") || title.includes("access grant") || title.includes("drive link") || title.includes("invoice")) {
    return "/dashboard/it";
  }
  if (type === "hr" || title.includes("hr") || msg.includes("payroll") || msg.includes("timesheet") || title.includes("timesheet") || title.includes("checklist")) {
    return "/dashboard/hr";
  }

  return null;
}
