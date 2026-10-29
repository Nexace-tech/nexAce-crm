"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  getLatestFeatureRelease,
  hasUserSeenRelease,
  markReleaseAsSeen,
  getFeaturesForRole,
  FeatureRelease,
  HighlightFeatureItem,
} from "@/lib/featureHighlights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ALL_ROLES = ["Employee", "Manager", "HR", "OPS"];

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={cn(
          "w-full max-w-2xl max-h-[90vh] flex flex-col",
          "rounded-2xl border border-slate-200 dark:border-[#232d3b]",
          "bg-white dark:bg-[#151c24] text-slate-900 dark:text-slate-100",
          "shadow-2xl overflow-hidden"
        )}
      >
        {/* ── Fixed Header ────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-[#232d3b] bg-gradient-to-r from-emerald-500/10 via-[#00c5a0]/10 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-[#00c5a0]/20 text-[#00c5a0] border border-[#00c5a0]/30">
                  <i className="fa-solid fa-sparkles text-[10px]" />
                  What&apos;s New
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-slate-100 dark:bg-[#1a232f] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2b3544]">
                  <i className="fa-solid fa-code-branch text-[9px]" />
                  {release.version} ({release.releaseDate})
                </span>

                {/* Broadcast Status Badge */}
                {isAdmin && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border",
                      isBroadcasted
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}
                  >
                    <i className={cn("fa-solid text-[9px]", isBroadcasted ? "fa-tower-broadcast" : "fa-shield-halved")} />
                    {isBroadcasted ? "Broadcast Active" : "Broadcast Pending Approval"}
                  </span>
                )}

                {previewAsRole && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <i className="fa-solid fa-eye text-[9px]" />
                    Simulating: {previewAsRole}
                  </span>
                )}
              </div>

              <h2
                id="spotlight-title"
                className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white break-words"
              >
                {release.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                {release.subtitle}
              </p>
            </div>

            <button
              onClick={() => handleDismiss(false)}
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a222d] transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark text-sm sm:text-base" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* ADMIN BROADCAST QUESTION & CONFIGURATION GATEWAY              */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {isAdmin && (adminBroadcastMode || !isBroadcasted) && (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <i className="fa-solid fa-bullhorn text-sm" />
                    <span>Admin Broadcast Permission: Broadcast New Features to Team?</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Choose whether to announce these updates to your team on their next login, and specify <strong>whom to broadcast</strong>. Other members will <em>not</em> see this popup until you broadcast.
                  </p>
                </div>
              </div>

              {/* Whom to Broadcast (Role Pills) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-users text-amber-500" /> Whom to Broadcast:
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAllRoles}
                    className="text-[11px] font-bold text-[#00c5a0] hover:underline cursor-pointer"
                  >
                    {targetRoles.length === ALL_ROLES.length ? "Deselect All" : "Select All Roles"}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {ALL_ROLES.map((r) => {
                    const active = targetRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleToggleRole(r)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px]",
                          active
                            ? "bg-[#00c5a0] text-slate-950 border-[#00c5a0] shadow-xs"
                            : "bg-white dark:bg-[#1a222d] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-[#2b3544] hover:border-slate-400"
                        )}
                      >
                        <i className={cn("fa-solid text-[10px]", active ? "fa-check" : "fa-plus")} />
                        <span>{r}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Broadcast Now vs Keep Hidden */}
              <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewAsRole(previewAsRole ? null : "Employee")}
                    className="min-h-[38px] w-full sm:w-auto justify-center text-xs gap-1 border-slate-300 dark:border-[#2b3544] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a222d]"
                  >
                    <i className={cn("fa-solid text-[10px]", previewAsRole ? "fa-eye-slash" : "fa-eye")} />
                    <span>{previewAsRole ? "Exit Preview" : "Preview as Employee"}</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={broadcastSubmitting}
                    onClick={handleDismissWithoutBroadcast}
                    className="min-h-[38px] w-full sm:w-auto justify-center text-xs text-slate-600 dark:text-slate-400 hover:text-rose-500"
                  >
                    <i className="fa-solid fa-ban text-[10px] mr-1" />
                    <span>Don&apos;t Broadcast (Keep Hidden)</span>
                  </Button>

                  <Button
                    size="sm"
                    disabled={broadcastSubmitting || targetRoles.length === 0}
                    onClick={handleConfirmBroadcast}
                    className="min-h-[38px] w-full sm:w-auto justify-center text-xs font-bold px-3.5 bg-gradient-to-r from-emerald-500 to-[#00c5a0] hover:from-emerald-600 hover:to-[#00b290] text-slate-950 shadow-md flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-tower-broadcast text-xs" />
                    <span>{broadcastSubmitting ? "Broadcasting..." : `Broadcast to ${targetRoles.length} Roles`}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Edit Audience Bar when already broadcasted */}
          {isAdmin && isBroadcasted && !adminBroadcastMode && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <i className="fa-solid fa-circle-check text-sm" />
                <span>
                  Broadcast Active to: <strong>{targetRoles.join(", ")}</strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdminBroadcastMode(true)}
                className="min-h-[32px] text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
              >
                <i className="fa-solid fa-sliders text-[10px] mr-1" />
                <span>Adjust Broadcast</span>
              </Button>
            </div>
          )}

          {/* Feature Highlight Cards */}
          <div className="grid grid-cols-1 gap-3">
            {applicableFeatures.map((feat) => {
              const isIncludedInBroadcast = selectedFeatureIds.includes(feat.id);

              return (
                <div
                  key={feat.id}
                  className={cn(
                    "group relative p-3.5 sm:p-4 rounded-xl border transition-all duration-200",
                    "bg-slate-50/80 dark:bg-[#1a222d]/70 hover:bg-slate-100/80 dark:hover:bg-[#1a222d]",
                    "border-slate-200 dark:border-[#232d3b] hover:border-[#00c5a0]/40",
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Admin Feature Checkbox in Broadcast Setup Mode */}
                    {isAdmin && adminBroadcastMode && (
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(feat.id)}
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 border mt-2 transition-all cursor-pointer",
                          isIncludedInBroadcast
                            ? "bg-[#00c5a0] text-slate-950 border-[#00c5a0]"
                            : "bg-white dark:bg-[#11161d] border-slate-300 dark:border-[#232d3b] text-transparent"
                        )}
                        title="Include in broadcast"
                      >
                        <i className="fa-solid fa-check text-xs" />
                      </button>
                    )}

                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] flex items-center justify-center shrink-0 shadow-sm">
                      <i className={cn(feat.icon, "text-base")} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                          {feat.title}
                        </h3>
                        {feat.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {feat.badge}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-200/60 dark:bg-[#232d3b] text-slate-600 dark:text-slate-400">
                          {feat.tag}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                        {feat.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end pt-1 sm:pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNavigate(feat.href)}
                      className="min-h-[38px] w-full sm:w-auto justify-center px-3 text-xs border-[#00c5a0]/40 text-[#00c5a0] hover:bg-[#00c5a0]/15 hover:text-[#00c5a0] flex items-center gap-1.5 font-medium rounded-lg"
                    >
                      <span>Explore</span>
                      <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Fixed Footer ────────────────────────────────────────────── */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#232d3b] bg-slate-50/50 dark:bg-[#11161d]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <i className="fa-solid fa-circle-info text-[#00c5a0]" />
            <span>
              {isAdmin
                ? "As Admin, you control which features are broadcasted to your workspace."
                : "You can revisit new updates anytime from the top bar icon."}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(false)}
              className="min-h-[38px] w-full sm:w-auto justify-center text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Remind Me Later
            </Button>
            <Button
              size="sm"
              onClick={() => handleDismiss(true)}
              className="min-h-[38px] w-full sm:w-auto justify-center text-xs font-semibold px-4 rounded-lg bg-[#00c5a0] hover:bg-[#00b290] text-slate-950 flex items-center gap-1.5"
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
