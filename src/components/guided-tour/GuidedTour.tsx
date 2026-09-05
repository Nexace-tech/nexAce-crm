"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  icon: string;
  highlights: string[];
}

const adminTourSteps: TourStep[] = [
  {
    id: "welcome_admin",
    title: "Welcome Admin",
    subtitle: "Enterprise Multi-Tenant Workspace & Management Command Center",
    description:
      "As an Admin/Manager, you have full control over real-time operations, team attendance, employee registrations, HR leave approvals, document vaults, and system security.",
    route: "/dashboard",
    icon: "fa-solid fa-crown text-amber-400",
    highlights: [
      "Full role-based administrative control",
      "Real-time company metrics & team shift tracking",
      "Pending employee registration approval queue",
    ],
  },
  {
    id: "dashboard_admin",
    title: "Dashboard & Live Analytics",
    subtitle: "Revenue Analytics, Traffic Sources & KPI Cards",
    description:
      "Monitor revenue trends, live lead traffic sources, deal conversion ratios, active project deliveries, and live sync feature hub.",
    route: "/dashboard",
    icon: "fa-solid fa-gauge-high text-blue-400",
    highlights: [
      "Revenue analytics with weekly/monthly toggles",
      "Traffic sources breakdown & top active deals",
      "Clickable KPI summary shortcuts",
    ],
  },
  {
    id: "team_admin",
    title: "My Team & Organization",
    subtitle: "Directory, Hierarchy Tree & Department Roster",
    description:
      "Manage employee profiles, visual reporting hierarchy org chart, add single or bulk employees, and assign department leads.",
    route: "/dashboard/team",
    icon: "fa-solid fa-users text-cyan-400",
    highlights: [
      "Visual drag-and-drop hierarchy org chart",
      "1-Click employee onboarding & credential export",
      "Department head assignments & skill search",
    ],
  },
  {
    id: "calendar_admin",
    title: "Calendar, Timesheets & Sprints",
    subtitle: "Team Events, Weekly Timesheets & Shift Attendance",
    description:
      "Schedule workspace events, manage agile sprints, track shift attendance, and approve employee weekly timesheets with 12-hour AM/PM timestamps.",
    route: "/dashboard/calendar",
    icon: "fa-solid fa-calendar-days text-emerald-400",
    highlights: [
      "Multi-department shared calendar scheduling",
      "Weekly billable timesheet approvals",
      "Full attendance logs export (CSV)",
    ],
  },
  {
    id: "projects_admin",
    title: "Projects, Tasks, Wiki & Drive",
    subtitle: "Agile Kanban Delivery, Gantt & Cloud Drive",
    description:
      "Manage projects, agile sprints, task milestones on drag-and-drop Kanban boards, author SOPs in Markdown Wiki, and organize assets in Drive.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-amber-400",
    highlights: [
      "Visual Kanban boards with subtasks & comments",
      "Gantt timeline & employee workload heatmaps",
      "Secure cloud Drive file storage & Wiki docs",
    ],
  },
  {
    id: "chat_admin",
    title: "Communication Hub & Mail",
    subtitle: "Channels, DMs, Mail Center & WhatsApp",
    description:
      "Real-time team chat with public channels, private 1-on-1 Direct Messages with read receipts, integrated Mail Center, WhatsApp Business API, and video calls.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-pink-400",
    highlights: [
      "Real-time messaging with image attachments",
      "Integrated client Mail center & WhatsApp API",
      "WebRTC video standup meeting rooms",
    ],
  },
  {
    id: "clients_admin",
    title: "OPS Portal, Sales & Bulk Import",
    subtitle: "Client Retainers, Sales Deals & Staffing Workdesk",
    description:
      "Manage client delivery accounts, sales deal pipelines, batch CSV/paste bulk data import, staff resource bench allocation, and external contractor teams.",
    route: "/dashboard/clients",
    icon: "fa-solid fa-list-check text-teal-400",
    highlights: [
      "Multi-entity Bulk Data Importer (CSV/JSON/Paste)",
      "Sales deal pipeline with stage probabilities",
      "Staff deployment utilization & contractor tracking",
    ],
  },
  {
    id: "referrals_admin",
    title: "Candidate Referral Pipeline",
    subtitle: "Talent Referrals & Bonus Payout Approvals",
    description:
      "Review employee candidate referrals, track recruitment pipeline stages, and approve referral cash bonus disbursements upon hiring.",
    route: "/dashboard/referrals",
    icon: "fa-solid fa-link text-sky-400",
    highlights: [
      "Recruitment pipeline tracking from Submitted to Paid",
      "Referral bounty reward approvals",
      "1-Click candidate referral submission",
    ],
  },
  {
    id: "goals_admin",
    title: "Goals, OKRs & Culture",
    subtitle: "Strategic Objectives, Kudos Wall & Pulse Surveys",
    description:
      "Define company OKRs, track measurable Key Results progress, celebrate peer contributions on the Kudos wall, and run weekly anonymous pulse surveys.",
    route: "/dashboard/goals",
    icon: "fa-solid fa-bullseye text-blue-400",
    highlights: [
      "Quarterly OKR target tracking & numeric sliders",
      "Social peer Kudos recognition wall",
      "Structured 1:1 check-in meetings with rollover tasks",
    ],
  },
  {
    id: "hr_portal_admin",
    title: "HR Portal & Leave Management",
    subtitle: "Directory, Leave Approvals, Vault & Cases",
    description:
      "Manage employee directory, onboarding checklists, approve leave requests with 12-hour AM/PM audit timestamps, export leave data (CSV/TXT/JSON), and track help desk cases.",
    route: "/dashboard/hr",
    icon: "fa-solid fa-briefcase text-purple-400",
    highlights: [
      "Approve/Reject leaves with 12-hour AM/PM timestamps",
      "Confidential Document Vault with access control",
      "Performance appraisal review cycles & probation alerts",
    ],
  },
  {
    id: "it_portal_admin",
    title: "IT Portal, Assets & Invoicing",
    subtitle: "Access Matrix, SaaS Subscriptions & Invoicing",
    description:
      "Provision software tool licenses with 1-click status toggles, track hardware devices, monitor SaaS renewals, and generate itemized client invoices with PDF download.",
    route: "/dashboard/it",
    icon: "fa-solid fa-terminal text-rose-400",
    highlights: [
      "Software access matrix with 1-click Suspend/Revoke",
      "Hardware asset tag tracking & SaaS renewal alerts",
      "Itemized client invoice generator (PDF / Print)",
    ],
  },
  {
    id: "analytics_admin",
    title: "Analytics & Security Audit Logs",
    subtitle: "Billability Ratios & Enterprise Audit Trail",
    description:
      "Evaluate project billable ratios, department productivity metrics, and conduct security audits across all workspace CREATE, UPDATE, and DELETE activities.",
    route: "/dashboard/analytics",
    icon: "fa-solid fa-chart-line text-violet-400",
    highlights: [
      "Billable vs. non-billable workforce effort metrics",
      "Manager compliance & department hours charts",
      "Searchable system-wide security audit trail",
    ],
  },
  {
    id: "settings_admin",
    title: "Settings, RBAC & Security Control",
    subtitle: "Branding, Granular RBAC, File Rules & Shifts",
    description:
      "Manage company branding, configure granular role-based permissions per module, define working shift hours, and enforce file upload security policies.",
    route: "/dashboard/settings",
    icon: "fa-solid fa-gear text-slate-400",
    highlights: [
      "Granular Role & Module Permission matrix",
      "Company branding & allowed file extension rules",
      "Work shift configuration & subscription management",
    ],
  },
];

const employeeTourSteps: TourStep[] = [
  {
    id: "welcome_employee",
    title: "Welcome to your Workspace",
    subtitle: "Employee Self-Service Portal",
    description:
      "Welcome to your personal workspace! Track your daily shifts, submit time-off requests, log timesheets, chat with team members, and view company OKRs.",
    route: "/dashboard",
    icon: "fa-solid fa-id-card text-emerald-400",
    highlights: [
      "My Shift & Clock-in status",
      "Personal task dashboard & activity timeline",
      "Quick access to leave balance",
    ],
  },
  {
    id: "calendar_employee",
    title: "My Timesheets & Active Tasks",
    subtitle: "Log Hours & Track Work",
    description:
      "Log your daily working hours, view calendar task deadlines, and submit timesheets for manager review.",
    route: "/dashboard/calendar",
    icon: "fa-solid fa-clock text-indigo-400",
    highlights: [
      "Log daily project hours & task descriptions",
      "Track submission approval status",
      "View upcoming team calendar events",
    ],
  },
  {
    id: "projects_employee",
    title: "Projects & Kanban Deliverables",
    subtitle: "Task Execution & Sprint Milestones",
    description:
      "View assigned project tasks on interactive Kanban boards, update checklists, collaborate on subtasks, and access shared team files.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-amber-400",
    highlights: [
      "Drag-and-drop task status updates",
      "Task detail drawer with subtasks & comments",
      "Access department Wiki guides & Drive storage",
    ],
  },
  {
    id: "chat_employee",
    title: "Team Chat & Direct Messaging",
    subtitle: "Instant Communication & Files",
    description:
      "Collaborate in team channels and 1-on-1 Direct Messages. Share image attachments, see blue double-tick read receipts, and preview uploads.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-blue-400",
    highlights: [
      "Real-time team messaging",
      "Share image attachments up to 10MB",
      "WhatsApp-style read receipts",
    ],
  },
  {
    id: "referrals_employee",
    title: "Refer Candidates & Earn Rewards",
    subtitle: "Employee Referral Program",
    description:
      "Refer talented colleagues for open roles, track candidate hiring progress, and earn cash referral bonuses upon successful hiring.",
    route: "/dashboard/referrals",
    icon: "fa-solid fa-award text-yellow-400",
    highlights: [
      "Submit candidate referrals in 1-click",
      "Track hiring pipeline progress",
      "View referral bonus payout status",
    ],
  },
  {
    id: "goals_employee",
    title: "My Goals & Key Results",
    subtitle: "Individual Performance Alignment",
    description:
      "View your assigned goals, track quarterly Key Results progress, and review your performance appraisal feedback.",
    route: "/dashboard/goals",
    icon: "fa-solid fa-bullseye text-rose-400",
    highlights: [
      "Track individual Key Results progress",
      "View performance appraisal feedback",
      "Align work with company goals",
    ],
  },
  {
    id: "leaves_employee",
    title: "Request Time-Off & Leave History",
    subtitle: "Leave Balances & Status Tracking",
    description:
      "Check your leave balances (Casual, Sick, Earned), submit time-off requests, track real-time approval status with 12-hour AM/PM timestamps, and export your leave history.",
    route: "/dashboard/hr",
    icon: "fa-solid fa-plane-departure text-sky-400",
    highlights: [
      "Request Time-Off form with instant notifications",
      "Track approval status & approver timestamps",
      "Export personal leave details to CSV/TXT",
    ],
  },
];

const clientTourSteps: TourStep[] = [
  {
    id: "welcome_client",
    title: "Welcome to Client Portal",
    subtitle: "Project Tracking & Retainer Workspace",
    description:
      "Welcome to your dedicated client workspace! Track project deliverables, monitor active retainers, view deal pipelines, and chat directly with your account team.",
    route: "/dashboard",
    icon: "fa-solid fa-handshake text-indigo-400",
    highlights: [
      "Project progress overview",
      "Direct account manager communication",
      "Retainer & invoice visibility",
    ],
  },
  {
    id: "projects_client",
    title: "Active Projects & Kanban Deliverables",
    subtitle: "Milestone & Sprint Progress",
    description:
      "Track real-time progress on your projects, view task milestones, and monitor completed deliverables on the Kanban board.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-purple-400",
    highlights: [
      "Real-time project milestone tracking",
      "Kanban deliverable status",
      "Sprint completion indicators",
    ],
  },
  {
    id: "chat_client",
    title: "Direct Client Support Chat",
    subtitle: "Instant Communication with Account Team",
    description:
      "Message your dedicated account manager and team members in real time. Share file attachments and get quick updates.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-sky-400",
    highlights: [
      "Direct support chat channel",
      "Share documents & image attachments",
      "Instant team responses",
    ],
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  role?: string;
}

export function GuidedTour({ isOpen, onClose, role }: GuidedTourProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const userRole = (user?.role || role || "Employee").toLowerCase();
  const userName = user?.name || "User";

  const tourSteps =
    userRole.includes("admin") || userRole.includes("ceo") || userRole.includes("manager")
      ? adminTourSteps
      : userRole.includes("client")
      ? clientTourSteps
      : employeeTourSteps;

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (currentStepIndex < tourSteps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          handleComplete();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, tourSteps.length]);

  // Automatically navigate to feature route when step changes
  useEffect(() => {
    if (isOpen && tourSteps[currentStepIndex]?.route) {
      router.push(tourSteps[currentStepIndex].route);
    }
  }, [currentStepIndex, isOpen, router, tourSteps]);

  if (!isOpen) return null;

  const currentStep = tourSteps[currentStepIndex] || tourSteps[0];
  const progressPct = Math.round(((currentStepIndex + 1) / tourSteps.length) * 100);

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleGoToPage = () => {
    if (currentStep.route) {
      router.push(currentStep.route);
    }
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexace_tour_completed", "true");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center sm:justify-end p-4 sm:p-6 animate-in fade-in">
      <div
        className="pointer-events-auto w-full max-w-lg bg-card/95 backdrop-blur-xl border-2 border-primary/40 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden transition-all duration-300 ring-4 ring-primary/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5 pt-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-xs">
              <i className={cn(currentStep.icon, "text-xl")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge color="primary" variant="soft" className="text-[10px] font-mono font-bold">
                  Step {currentStepIndex + 1} of {tourSteps.length}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-semibold">{progressPct}% Complete</span>
                <span className="text-[10px] text-primary/80 font-bold ml-auto truncate max-w-[120px]">
                  • {userName} ({userRole.toUpperCase()})
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-foreground mt-0.5">{currentStep.title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer shrink-0 ml-2"
            title="Close Tour (Esc)"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {/* Progress Line */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-emerald-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="space-y-3.5">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">{currentStep.subtitle}</p>
          <p className="text-xs sm:text-sm text-foreground leading-relaxed">{currentStep.description}</p>

          {/* Key Capabilities List */}
          <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <i className="fa-solid fa-star text-amber-400 text-xs" /> Key Capabilities:
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground pl-0.5">
              {currentStep.highlights.map((h, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 text-[11px] shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Step Carousel Navigation Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {tourSteps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                title={`Jump to ${s.title}`}
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  idx === currentStepIndex
                    ? "w-6 bg-primary shadow-xs"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                )}
              />
            ))}
          </div>
        </div>

        {/* Navigation Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleComplete}
              className="text-xs text-muted-foreground hover:text-foreground underline font-medium cursor-pointer"
            >
              Skip Tour
            </button>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">(Use ← → keys)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGoToPage}
              className="text-xs font-semibold gap-1.5 cursor-pointer h-8"
            >
              <i className="fa-solid fa-location-arrow text-xs text-primary" /> Open Page
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentStepIndex === 0}
              onClick={handlePrev}
              className="text-xs font-semibold gap-1 cursor-pointer h-8"
            >
              <i className="fa-solid fa-chevron-left text-[10px]" /> Back
            </Button>

            <Button
              type="button"
              color="primary"
              size="sm"
              onClick={handleNext}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-sm h-8"
            >
              {currentStepIndex === tourSteps.length - 1 ? (
                <>
                  <i className="fa-solid fa-circle-check text-xs" /> Finish Tour
                </>
              ) : (
                <>
                  Next <i className="fa-solid fa-chevron-right text-[10px]" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
