/**
 * Feature Highlights & Release Announcement Registry
 *
 * Enforces the rule: When new features are added, highlight them when user logs in.
 * Register all newly added features, modules, and workflows here.
 */

export interface HighlightFeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string; // FontAwesome 6 icon class (fa-solid fa-...)
  badge?: string;
  tag: string;
  href: string;
  applicableRoles?: string[]; // If empty or undefined, applicable to all roles
}

export interface FeatureRelease {
  id: string; // Unique release identifier e.g. "release-2026-10-hrms-suite"
  version: string;
  releaseDate: string;
  badge: string;
  title: string;
  subtitle: string;
  features: HighlightFeatureItem[];
}

export const FEATURE_RELEASES: FeatureRelease[] = [
  {
    id: "release-2026-10-hrms-suite",
    version: "v2.5",
    releaseDate: "October 2026",
    badge: "Major HRMS & Security Suite",
    title: "Full & Final Settlement, Shift Controls & Dynamic Permissions",
    subtitle: "Explore newly launched HR management capabilities, dynamic controls, and automated compliance tools.",
    features: [
      {
        id: "fnf-desk",
        title: "Full & Final (F&F) Settlement Desk",
        description: "Automated end-to-end offboarding: gratuity calculation, leave encashment, asset handovers, and 1-click clearance certificate generation.",
        icon: "fa-solid fa-file-invoice-dollar text-emerald-400",
        badge: "NEW",
        tag: "HRMS Suite",
        href: "/dashboard/team?tab=fnf",
        applicableRoles: ["Admin", "HR", "Sub Admin", "OPS", "Manager"],
      },
      {
        id: "dynamic-role-permissions",
        title: "Dynamic Role & HRMS Permissions",
        description: "Granular control over HR & team features: toggle F&F settlements, roster management, telemetry view, and invoice controls directly from Settings.",
        icon: "fa-solid fa-shield-halved text-cyan-400",
        badge: "NEW",
        tag: "Security",
        href: "/dashboard/settings?tab=permissions",
        applicableRoles: ["Admin", "Sub Admin", "OPS"],
      },
      {
        id: "client-device-telemetry",
        title: "Device Telemetry & Login Geo-Tracking",
        description: "Automatic device type, browser, client OS, and IP address recording on logins and shift attendance punches.",
        icon: "fa-solid fa-mobile-screen-button text-purple-400",
        badge: "ENHANCED",
        tag: "Audit & Security",
        href: "/dashboard/team?tab=directory",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR"],
      },
      {
        id: "mobile-shift-clocking",
        title: "Web & Mobile Shift Punch Integration",
        description: "High-precision attendance punch logging supporting Web Portal, Native Mobile App, and biometric sources with real-time sync.",
        icon: "fa-solid fa-fingerprint text-amber-400",
        badge: "NEW",
        tag: "Attendance",
        href: "/dashboard/calendar",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager", "Employee"],
      },
    ],
  },
];

/**
 * Get the latest feature release
 */
export function getLatestFeatureRelease(): FeatureRelease | null {
  return FEATURE_RELEASES[0] || null;
}

/**
 * Storage key for tracking user feature acknowledgement
 */
export function getFeatureSeenStorageKey(userId: string): string {
  return `nexace_seen_feature_release_${userId}`;
}

/**
 * Check if the user has already acknowledged a specific release ID
 */
export function hasUserSeenRelease(userId: string, releaseId: string): boolean {
  if (typeof window === "undefined" || !userId) return true;
  try {
    const seen = localStorage.getItem(getFeatureSeenStorageKey(userId));
    return seen === releaseId;
  } catch {
    return false;
  }
}

/**
 * Mark release as acknowledged/seen for the user
 */
export function markReleaseAsSeen(userId: string, releaseId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(getFeatureSeenStorageKey(userId), releaseId);
  } catch (err) {
    console.error("Failed to save feature acknowledgement in storage", err);
  }
}

/**
 * Get features filtered for a specific user role
 */
export function getFeaturesForRole(features: HighlightFeatureItem[], role?: string): HighlightFeatureItem[] {
  if (!role) return features;
  return features.filter((feat) => {
    if (!feat.applicableRoles || feat.applicableRoles.length === 0) return true;
    return feat.applicableRoles.includes(role);
  });
}

