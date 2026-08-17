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

  // Use crypto.getRandomValues for cryptographically secure randomness
  const randomIndex = (max: number): number => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
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
