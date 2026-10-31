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
  category?: "Operations & Shifts" | "Communication" | "HRMS & Payroll" | "Security";
  highlights?: string[];
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
    id: "release-2026-10-enterprise-suite",
    version: "v2.8",
    releaseDate: "October 2026",
    badge: "Enterprise Suite & Operations Suite",
    title: "Shift Extensions, Regularization, Celebrations & Unified Communications",
    subtitle: "Explore newly launched operational desks, automated attendance extensions, real-time video huddles, and transparent compensation vaults.",
    features: [
      {
        id: "shift-extensions-desk",
        title: "Shift Extensions & Overtime Desk",
        description: "Review and approve employee requests to work past standard limits with 7 rapid approval presets (+30m to +4h), department info, custom hours, and live audit slips.",
        icon: "fa-solid fa-clock-rotate-left text-amber-500",
        badge: "NEW",
        tag: "Attendance & Shifts",
        category: "Operations & Shifts",
        highlights: [
          "7 quick approval presets (+30m, +1h, +1.5h, +2h, +2.5h, +3h, +4h)",
          "Department info and shift schedule compliance",
          "Comprehensive audit slip with timestamp & reason notes",
          "Automated attendance hours & overtime sync",
        ],
        href: "/dashboard/calendar?tab=extensions",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager"],
      },
      {
        id: "attendance-regularization-desk",
        title: "Attendance Regularization Workdesk",
        description: "1-click attendance regularization workflow for missed punches and on-duty visits with full managerial audit trails.",
        icon: "fa-solid fa-business-time text-emerald-500",
        badge: "NEW",
        tag: "Attendance",
        category: "Operations & Shifts",
        highlights: [
          "Inline 1-click regularization review & approvals",
          "Missed clock-in & clock-out adjustments",
          "Dual verification for HR and Department Managers",
          "Direct synchronization with attendance calendar",
        ],
        href: "/dashboard/calendar?tab=attendance",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager", "Employee"],
      },
      {
        id: "celebrations-hub",
        title: "Celebrations & Wishes Portal",
        description: "Interactive team celebrations portal celebrating birthdays and work anniversaries with automated confetti, custom greetings, and team wish feeds.",
        icon: "fa-solid fa-cake-candles text-pink-500",
        badge: "NEW",
        tag: "Culture & Team",
        category: "Communication",
        highlights: [
          "Upcoming birthdays & tenure milestones overview",
          "Interactive celebratory animations & confetti blasts",
          "1-click congratulations and personalized wishes",
          "Team-wide social celebration board",
        ],
        href: "/dashboard/calendar?tab=celebrations",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager", "Employee"],
      },
      {
        id: "virtual-huddles",
        title: "Virtual Huddles & Instant Video Rooms",
        description: "Start or join instant team video conferences right inside Chat & Mail. Features HD video, crystal-clear audio, screen sharing, and team conference rooms.",
        icon: "fa-solid fa-video text-blue-500",
        badge: "NEW",
        tag: "Communication",
        category: "Communication",
        highlights: [
          "Instant 1-click conference room generation",
          "Native screen sharing & collaborative audio",
          "Zero third-party downloads or external plugins",
          "Seamlessly integrated into Chat & Mail navigation",
        ],
        href: "/dashboard/chat?tab=video",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager", "Employee"],
      },
      {
        id: "mail-center",
        title: "Integrated Mail Center & Unified Inbox",
        description: "Unified corporate email client embedded inside the CRM. Send, receive, search, and organize emails with attachments and rich formatting.",
        icon: "fa-solid fa-envelope text-indigo-500",
        badge: "NEW",
        tag: "Communication",
        category: "Communication",
        highlights: [
          "Unified Inbox, Sent, Drafts, and Starred mail folders",
          "Rich HTML email composer with attachment support",
          "Direct integration with client & employee directories",
          "Instant search by subject, recipient, and sender",
        ],
        href: "/dashboard/chat?tab=mail",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager"],
      },
      {
        id: "whatsapp-panel",
        title: "WhatsApp Business Web Panel",
        description: "Direct WhatsApp Business Web integration inside the CRM for instant client messaging, contractor communications, and customer support.",
        icon: "fa-brands fa-whatsapp text-emerald-500",
        badge: "NEW",
        tag: "Communication",
        category: "Communication",
        highlights: [
          "Integrated WhatsApp Web workspace panel",
          "Direct client & vendor messaging without switching tabs",
          "Secure corporate session persistence",
          "Optimized for high-velocity communications",
        ],
        href: "/dashboard/chat?tab=whatsapp",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager"],
      },
      {
        id: "salary-slips-vault",
        title: "Salary Slips & Verified Compensation Vault",
        description: "Transparent employee self-service compensation desk with 50/30/20 statutory breakdowns (Basic Pay, HRA, Allowances), automated LOP computation, and printable slips.",
        icon: "fa-solid fa-file-invoice-dollar text-emerald-500",
        badge: "ENHANCED",
        tag: "HRMS & Payroll",
        category: "HRMS & Payroll",
        highlights: [
          "Itemized Basic (50%), HRA (30%), and Allowances (20%)",
          "Automated Loss of Pay (LOP) calculations",
          "Official Form 16 / Rule 26D printable A4 format",
          "CSV export & UTR transaction tracking",
        ],
        href: "/dashboard/hr?tab=payslips",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR", "Manager", "Employee"],
      },
      {
        id: "fnf-desk",
        title: "Full & Final (F&F) Settlement Desk",
        description: "Automated end-to-end offboarding: gratuity calculation, leave encashment, asset handovers, and 1-click clearance certificate generation.",
        icon: "fa-solid fa-handshake text-teal-500",
        badge: "ENHANCED",
        tag: "HRMS & Payroll",
        category: "HRMS & Payroll",
        highlights: [
          "Automated gratuity, notice period & leave encashment",
          "Multi-department clearances & hardware asset handover",
          "1-click clearance certificate generation",
          "Disbursement ledger & bank reference recording",
        ],
        href: "/dashboard/hr?tab=fnf",
        applicableRoles: ["Admin", "HR", "Sub Admin", "OPS", "Manager"],
      },
      {
        id: "dynamic-role-permissions",
        title: "Dynamic Role & Portals Permissions",
        description: "Granular control over all CRM portals and modules: toggle Chat & Mail, Calendar & Timesheets, HR, and IT features dynamically per role.",
        icon: "fa-solid fa-shield-halved text-cyan-500",
        badge: "ENHANCED",
        tag: "Security & RBAC",
        category: "Security",
        highlights: [
          "Granular CRUD feature toggles per role",
          "Direct portal-level access control",
          "Preset role templates with 1-click apply",
          "Realtime permission enforcement across API and UI",
        ],
        href: "/dashboard/settings?tab=permissions",
        applicableRoles: ["Admin", "Sub Admin", "OPS"],
      },
      {
        id: "client-device-telemetry",
        title: "Device Telemetry & Login Geo-Tracking",
        description: "Automatic device type, browser, client OS, and IP address recording on logins and shift attendance punches.",
        icon: "fa-solid fa-mobile-screen-button text-purple-500",
        badge: "ENHANCED",
        tag: "Audit & Security",
        category: "Security",
        highlights: [
          "Real-time IP & client geo-telemetry tracking",
          "Device form factor (Desktop, Tablet, Mobile) classification",
          "Browser & Operating System detection",
          "Visual badges in Team profiles & Attendance desks",
        ],
        href: "/dashboard/team?tab=directory",
        applicableRoles: ["Admin", "Sub Admin", "OPS", "HR"],
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

