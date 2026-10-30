"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  getLatestFeatureRelease,
  hasUserSeenRelease,
  markReleaseAsSeen,
  getFeaturesForRole,
  FeatureRelease,
} from "@/lib/featureHighlights";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ALL_ROLES = ["Employee", "Manager", "HR", "OPS"];

const ROLE_ICONS: Record<string, string> = {
  Employee: "fa-solid fa-user",
  Manager: "fa-solid fa-user-tie",
  HR: "fa-solid fa-id-badge",
  OPS: "fa-solid fa-gears",
};

interface FeatureSpotlightModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  previewRole?: string;
  previewFeatures?: Record<string, boolean>;
}

export function FeatureSpotlightModal({
  forceOpen = false,
  onClose,
  previewRole,
  previewFeatures,
}: FeatureSpotlightModalProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { isAdmin, isSpotlightEnabledForRole, canViewSpotlightFeature, loading: permsLoading } = usePermissions();

  const [isOpen, setIsOpen] = useState(false);
  const [release, setRelease] = useState<FeatureRelease | null>(null);

  // Broadcast state from DB
  const [isBroadcasted, setIsBroadcasted] = useState<boolean>(false);
  const [targetRoles, setTargetRoles] = useState<string[]>(ALL_ROLES);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [broadcastLoading, setBroadcastLoading] = useState<boolean>(true);
  const [broadcastSubmitting, setBroadcastSubmitting] = useState<boolean>(false);

  // Admin broadcast configuration mode (Ask permission to broadcast)
  const [adminBroadcastMode, setAdminBroadcastMode] = useState<boolean>(false);
  const [previewAsRole, setPreviewAsRole] = useState<string | null>(null);

  // 1. Initial setup & load release
  useEffect(() => {
    const latest = getLatestFeatureRelease();
    if (!latest) return;
    setRelease(latest);
    setSelectedFeatureIds(latest.features.map((f) => f.id));
  }, []);

  // 2. Fetch broadcast status from server
  useEffect(() => {
    if (!release) return;

    async function checkBroadcast() {
      try {
        setBroadcastLoading(true);
        const res = await fetch(`/api/features/broadcast?releaseId=${release?.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsBroadcasted(Boolean(data.isBroadcasted));
          if (Array.isArray(data.targetRoles) && data.targetRoles.length > 0) {
            setTargetRoles(data.targetRoles);
          }
          if (Array.isArray(data.enabledFeatures) && data.enabledFeatures.length > 0) {
            setSelectedFeatureIds(data.enabledFeatures);
          }

          // If Admin logs in and release is NOT yet broadcasted, open in Broadcast Setup mode!
          if (isAdmin && !data.isBroadcasted && !data.dismissedByAdmin) {
            setAdminBroadcastMode(true);
          }
        }
      } catch (err) {
        console.error("Failed to load feature broadcast state:", err);
      } finally {
        setBroadcastLoading(false);
      }
    }

    checkBroadcast();
  }, [release, isAdmin]);

  // 3. Open Logic
  useEffect(() => {
    if (!release || broadcastLoading) return;

    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    if (!user?._id || permsLoading) return;

    // Check if user has already acknowledged this latest release
    const seen = hasUserSeenRelease(user._id, release.id);

    if (isAdmin) {
      // For Admin: if unacknowledged, show modal (either to configure broadcast or review)
      if (!seen) {
        const timer = setTimeout(() => setIsOpen(true), 600);
        return () => clearTimeout(timer);
      }
      return;
    }

    // FOR OTHERS (Non-Admin):
    // Strict rule: ONLY show if Admin has broadcasted this release AND user's role is in targetRoles!
    if (!isBroadcasted) {
      return; // Do NOT show to others if Admin has not broadcasted yet
    }

    const userRole = user.role || "Employee";
    const roleIncluded = targetRoles.includes(userRole);
    if (!roleIncluded) {
      return; // User's role is excluded from this broadcast
    }

    if (!isSpotlightEnabledForRole()) {
      return; // Spotlight disabled by role settings
    }

    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [forceOpen, user?._id, user?.role, isAdmin, isBroadcasted, targetRoles, release, broadcastLoading, permsLoading, isSpotlightEnabledForRole]);

  // Toggle role in targetRoles
  const handleToggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleToggleAllRoles = () => {
    if (targetRoles.length === ALL_ROLES.length) {
      setTargetRoles([]);
    } else {
      setTargetRoles([...ALL_ROLES]);
    }
  };

  // Toggle feature selection
  const handleToggleFeature = (featId: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(featId) ? prev.filter((id) => id !== featId) : [...prev, featId]
    );
  };

  // Broadcast Submission Handlers
  const handleConfirmBroadcast = async () => {
    if (!release) return;
    try {
      setBroadcastSubmitting(true);
      const res = await fetch("/api/features/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId: release.id,
          isBroadcasted: true,
          targetRoles,
          enabledFeatures: selectedFeatureIds,
          dismissedByAdmin: false,
        }),
      });

      if (res.ok) {
        setIsBroadcasted(true);
        setAdminBroadcastMode(false);
        if (user?._id) markReleaseAsSeen(user._id, release.id);
      }
    } catch (err) {
      console.error("Failed to confirm broadcast", err);
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  const handleDismissWithoutBroadcast = async () => {
    if (!release) return;
    try {
      setBroadcastSubmitting(true);
      await fetch("/api/features/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId: release.id,
          isBroadcasted: false,
          targetRoles,
          enabledFeatures: selectedFeatureIds,
          dismissedByAdmin: true,
        }),
      });

      if (user?._id) markReleaseAsSeen(user._id, release.id);
      setIsOpen(false);
      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to dismiss broadcast", err);
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  const handleDismiss = (dontShowAgain: boolean) => {
    if (dontShowAgain && user?._id && release && !previewRole) {
      markReleaseAsSeen(user._id, release.id);
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleNavigate = (href: string) => {
    if (user?._id && release && !previewRole) {
      markReleaseAsSeen(user._id, release.id);
    }
    setIsOpen(false);
    if (onClose) onClose();
    router.push(href);
  };

  if (!isOpen || !release) return null;

  // Filter features to display
  const effectiveRole = previewAsRole || previewRole || user?.role;
  const rawFeatures = getFeaturesForRole(release.features, effectiveRole);
  const applicableFeatures = rawFeatures.filter((feat) => {
    if (adminBroadcastMode) return true; // Show all when Admin is configuring
    if (selectedFeatureIds.length > 0 && !selectedFeatureIds.includes(feat.id)) {
      return false;
    }
    if (previewFeatures) {
      return previewFeatures[feat.id] !== false;
    }
    return canViewSpotlightFeature(feat.id);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={cn(
          "w-full max-w-2xl max-h-[92vh] flex flex-col",
          "rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-[#232d3b]",
          "bg-white/95 dark:bg-[#121820]/95 text-slate-900 dark:text-slate-100",
          "shadow-2xl overflow-hidden relative backdrop-blur-xl"
        )}
      >
        {/* Subtle Ambient Lighting Accents */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 rounded-full bg-gradient-to-r from-emerald-500/20 via-[#00c5a0]/15 to-amber-500/15 blur-3xl pointer-events-none" />

        {/* ── Fixed Header ────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 sm:p-6 border-b border-slate-100 dark:border-[#232d3b]/80 bg-gradient-to-b from-slate-50/80 dark:from-[#161f2b]/80 to-transparent relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0 flex-1">
              {/* Header Badges Pill Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#00c5a0]/15 text-[#00c5a0] border border-[#00c5a0]/30 shadow-2xs">
                  <i className="fa-solid fa-wand-magic-sparkles text-xs text-amber-500 dark:text-amber-400" />
                  What&apos;s New
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-[#1a232f] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2b3544] font-mono">
                  <i className="fa-solid fa-code-branch text-[10px] text-emerald-500" />
                  {release.version} • {release.releaseDate}
                </span>

                {/* Broadcast Status Badge */}
                {isAdmin && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs",
                      isBroadcasted
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}
                  >
                    <i className={cn("fa-solid text-[10px]", isBroadcasted ? "fa-tower-broadcast" : "fa-shield-halved")} />
                    {isBroadcasted ? "Broadcast Active" : "Broadcast Pending Setup"}
                  </span>
                )}

                {previewAsRole && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <i className="fa-solid fa-eye text-[10px]" />
                    Simulating: {previewAsRole}
                  </span>
                )}
              </div>

              <h2
                id="spotlight-title"
                className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white break-words mt-1 leading-snug"
              >
                {release.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                {release.subtitle}
              </p>
            </div>

            <button
              onClick={() => handleDismiss(false)}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#283342] text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2735] transition-colors cursor-pointer shadow-2xs min-h-[36px]"
              title="Close modal"
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 relative z-10">
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* ADMIN BROADCAST QUESTION & CONFIGURATION GATEWAY              */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {isAdmin && (adminBroadcastMode || !isBroadcasted) && (
            <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent dark:from-amber-950/30 dark:via-amber-950/10 space-y-4 shadow-sm relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm border border-amber-500/30 shrink-0 shadow-2xs">
                  <i className="fa-solid fa-bullhorn text-sm" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    <span>Admin Release Broadcast Gateway</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Broadcast new capabilities to your workspace team?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Choose which user roles should receive this release spotlight upon their next login. Team members in non-selected roles will not see this announcement.
                  </p>
                </div>
              </div>

              {/* Whom to Broadcast (Role Pills Matrix) */}
              <div className="space-y-2 pt-1 border-t border-amber-500/20">
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <i className="fa-solid fa-users text-amber-500" />
                    <span>Target Workspace Roles</span>
                    <span className="text-[10px] font-mono font-normal opacity-75">
                      ({targetRoles.length} of {ALL_ROLES.length} selected)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAllRoles}
                    className="text-[11px] font-bold text-[#00c5a0] hover:underline cursor-pointer"
                  >
                    {targetRoles.length === ALL_ROLES.length ? "Clear All" : "Select All Roles"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_ROLES.map((r) => {
                    const active = targetRoles.includes(r);
                    const iconClass = ROLE_ICONS[r] || "fa-solid fa-user";

                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleToggleRole(r)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between gap-1.5 cursor-pointer min-h-[38px] shadow-2xs",
                          active
                            ? "bg-gradient-to-r from-emerald-600 to-[#00c5a0] text-slate-950 border-emerald-500 font-bold shadow-xs"
                            : "bg-white dark:bg-[#161d26] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#2b3544] hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <i className={cn(iconClass, "text-xs", active ? "text-slate-950" : "text-muted-foreground")} />
                          <span className="truncate">{r}</span>
                        </span>
                        <i className={cn("fa-solid text-[10px] shrink-0", active ? "fa-check" : "fa-plus opacity-40")} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Broadcast Now vs Keep Hidden */}
              <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewAsRole(previewAsRole ? null : "Employee")}
                  className="min-h-[38px] w-full sm:w-auto justify-center text-xs gap-1.5 border-slate-300 dark:border-[#2b3544] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a222d] rounded-xl cursor-pointer"
                >
                  <i className={cn("fa-solid text-xs", previewAsRole ? "fa-eye-slash" : "fa-eye")} />
                  <span>{previewAsRole ? "Exit Employee Preview" : "Preview as Employee"}</span>
                </Button>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={broadcastSubmitting}
                    onClick={handleDismissWithoutBroadcast}
                    className="min-h-[38px] w-full sm:w-auto justify-center text-xs text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-xl cursor-pointer"
                  >
                    <i className="fa-solid fa-ban text-[11px] mr-1.5" />
                    <span>Keep Private (Don&apos;t Broadcast)</span>
                  </Button>

                  <Button
                    size="sm"
                    disabled={broadcastSubmitting || targetRoles.length === 0}
                    onClick={handleConfirmBroadcast}
                    className="min-h-[38px] w-full sm:w-auto justify-center text-xs font-bold px-4 bg-gradient-to-r from-emerald-500 to-[#00c5a0] hover:from-emerald-600 hover:to-[#00b290] text-slate-950 shadow-md flex items-center gap-1.5 rounded-xl cursor-pointer"
                  >
                    <i className="fa-solid fa-tower-broadcast text-xs" />
                    <span>{broadcastSubmitting ? "Broadcasting..." : `Broadcast to ${targetRoles.length} Roles`}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Edit Audience Ribbon when already broadcasted */}
          {isAdmin && isBroadcasted && !adminBroadcastMode && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <i className="fa-solid fa-circle-check text-sm shrink-0" />
                <span>
                  Broadcast Active to: <strong>{targetRoles.join(", ")}</strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdminBroadcastMode(true)}
                className="min-h-[34px] text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 rounded-lg cursor-pointer"
              >
                <i className="fa-solid fa-sliders text-[11px] mr-1.5" />
                <span>Adjust Audience</span>
              </Button>
            </div>
          )}

          {/* Feature Highlight Cards Grid */}
          <div className="grid grid-cols-1 gap-3">
            {applicableFeatures.map((feat) => {
              const isIncludedInBroadcast = selectedFeatureIds.includes(feat.id);

              return (
                <div
                  key={feat.id}
                  className={cn(
                    "group relative p-4 rounded-2xl border transition-all duration-200",
                    "bg-slate-50/80 dark:bg-[#161e28]/70 hover:bg-white dark:hover:bg-[#1a232f]",
                    "border-slate-200/80 dark:border-[#232d3b] hover:border-[#00c5a0]/50",
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs hover:shadow-md"
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Admin Feature Checkbox in Broadcast Setup Mode */}
                    {isAdmin && adminBroadcastMode && (
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(feat.id)}
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border mt-1.5 transition-all cursor-pointer shadow-2xs",
                          isIncludedInBroadcast
                            ? "bg-[#00c5a0] text-slate-950 border-[#00c5a0]"
                            : "bg-white dark:bg-[#11161d] border-slate-300 dark:border-[#283342] text-transparent"
                        )}
                        title="Include in broadcast"
                      >
                        <i className="fa-solid fa-check text-xs" />
                      </button>
                    )}

                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#11161d] border border-slate-200 dark:border-[#283342] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <i className={cn(feat.icon, "text-base")} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                          {feat.title}
                        </h3>
                        {feat.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {feat.badge}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-200/70 dark:bg-[#232d3b] text-slate-600 dark:text-slate-400">
                          {feat.tag}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed break-words">
                        {feat.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end pt-1 sm:pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNavigate(feat.href)}
                      className="min-h-[38px] w-full sm:w-auto justify-center px-3.5 text-xs border-[#00c5a0]/40 text-[#00c5a0] hover:bg-[#00c5a0] hover:text-slate-950 transition-all flex items-center gap-2 font-semibold rounded-xl cursor-pointer group-hover:border-[#00c5a0]"
                    >
                      <span>Explore</span>
                      <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Fixed Footer ────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-[#232d3b] bg-slate-50/80 dark:bg-[#11161d]/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <i className="fa-solid fa-circle-info text-[#00c5a0]" />
            <span>
              {isAdmin
                ? "As Admin, you control which features are broadcasted to your workspace."
                : "You can revisit new updates anytime from the What's New icon in the top header."}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(false)}
              className="min-h-[38px] w-full sm:w-auto justify-center text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
            >
              Remind Me Later
            </Button>
            <Button
              size="sm"
              onClick={() => handleDismiss(true)}
              className="min-h-[38px] w-full sm:w-auto justify-center text-xs font-bold px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00c5a0] hover:from-emerald-600 hover:to-[#00b290] text-slate-950 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <i className="fa-solid fa-check text-xs" />
              <span>Got it, All Clear!</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
