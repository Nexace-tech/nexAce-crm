"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  getLatestFeatureRelease,
  getFeaturesForRole,
  FeatureRelease,
  HighlightFeatureItem,
} from "@/lib/featureHighlights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FeatureSpotlightModal } from "@/components/layout/FeatureSpotlightModal";

const ALL_ROLES = ["Employee", "Manager", "HR", "OPS"];

interface FeatureBroadcastDeskProps {
  onBroadcastUpdated?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export function FeatureBroadcastDesk({
  onBroadcastUpdated,
  isModal = false,
  onClose,
}: FeatureBroadcastDeskProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, isOPS, isSpotlightEnabledForRole, canViewSpotlightFeature } = usePermissions();

  const [release, setRelease] = useState<FeatureRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Broadcast state
  const [isBroadcasted, setIsBroadcasted] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>(ALL_ROLES);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [sendFeedNotification, setSendFeedNotification] = useState(true);

  // Preview modal state
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const isPrivileged = isAdmin || isOPS;

  // 1. Load release & broadcast data
  useEffect(() => {
    const latest = getLatestFeatureRelease();
    if (!latest) {
      setLoading(false);
      return;
    }
    setRelease(latest);
    setSelectedFeatureIds(latest.features.map((f) => f.id));

    async function loadBroadcast() {
      try {
        setLoading(true);
        const res = await fetch(`/api/features/broadcast?releaseId=${latest?.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsBroadcasted(Boolean(data.isBroadcasted));
          if (Array.isArray(data.targetRoles) && data.targetRoles.length > 0) {
            setTargetRoles(data.targetRoles);
          }
          if (Array.isArray(data.enabledFeatures) && data.enabledFeatures.length > 0) {
            setSelectedFeatureIds(data.enabledFeatures);
          }
        }
      } catch (err) {
        console.error("Failed to load broadcast settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBroadcast();
  }, []);

  const handleToggleRole = (role: string) => {
    if (!isPrivileged) return;
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleToggleAllRoles = () => {
    if (!isPrivileged) return;
    if (targetRoles.length === ALL_ROLES.length) {
      setTargetRoles([]);
    } else {
      setTargetRoles([...ALL_ROLES]);
    }
  };

  const handleToggleFeature = (featId: string) => {
    if (!isPrivileged) return;
    setSelectedFeatureIds((prev) =>
      prev.includes(featId) ? prev.filter((id) => id !== featId) : [...prev, featId]
    );
  };

  const handleSaveBroadcast = async (broadcastAction: boolean) => {
    if (!release || !isPrivileged) return;

    try {
      setSubmitting(true);
      setStatusMessage(null);

      const res = await fetch("/api/features/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId: release.id,
          isBroadcasted: broadcastAction,
          targetRoles,
          enabledFeatures: selectedFeatureIds,
          dismissedByAdmin: !broadcastAction,
        }),
      });

      if (res.ok) {
        setIsBroadcasted(broadcastAction);

        // Optional: Also dispatch an announcement into the Notification feed
        if (broadcastAction && sendFeedNotification) {
          try {
            await fetch("/api/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `🚀 New Release: ${release.title}`,
                message: `Admin has broadcasted new CRM features for your role (${release.version}). Click to explore what's new.`,
                type: "announcement",
                linkUrl: "/dashboard?openSpotlight=true",
                broadcast: true,
                targetRoles,
              }),
            });
          } catch (feedErr) {
            console.error("Feed alert creation error:", feedErr);
          }
        }

        setStatusMessage({
          text: broadcastAction
            ? `Successfully broadcasted '${release.version}' to ${targetRoles.length} roles!`
            : `Broadcast revoked. Feature release is now hidden from team members.`,
          type: "success",
        });

        if (onBroadcastUpdated) onBroadcastUpdated();
      } else {
        const err = await res.json();
        setStatusMessage({ text: err.error || "Failed to update broadcast", type: "error" });
      }
    } catch {
      setStatusMessage({ text: "Error saving broadcast settings", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center rounded-2xl border border-border bg-card">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-primary mb-2" />
        <p className="text-xs text-muted-foreground">Loading feature release broadcast settings...</p>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="p-8 text-center rounded-2xl border border-border bg-card">
        <i className="fa-solid fa-sparkles text-2xl text-muted-foreground mb-2" />
        <p className="text-sm font-semibold text-foreground">No active feature releases found</p>
      </div>
    );
  }

  // Audience eligibility for non-admins
  const userRole = user?.role || "Employee";
  const isUserTargeted = targetRoles.includes(userRole);
  const showToUser = isPrivileged || (isBroadcasted && isUserTargeted && isSpotlightEnabledForRole());

  // Features to show for non-admin view
  const userFeatures = getFeaturesForRole(release.features, userRole).filter(
    (feat) => selectedFeatureIds.includes(feat.id) && canViewSpotlightFeature(feat.id)
  );

  return (
    <div className={cn("space-y-4", isModal ? "p-4 sm:p-6" : "")}>
      {/* ── Status Message Toast Banner ─────────────────────────────────── */}
      {statusMessage && (
        <div
          className={cn(
            "p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in",
            statusMessage.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/15 border-rose-500/30 text-rose-500"
          )}
        >
          <div className="flex items-center gap-2">
            <i className={cn("fa-solid", statusMessage.type === "success" ? "fa-circle-check" : "fa-triangle-exclamation")} />
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs hover:opacity-75 cursor-pointer"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* ── Management Header Card ─────────────────────────────────────── */}
      <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00c5a0]/15 text-[#00c5a0] border border-[#00c5a0]/30">
                <i className="fa-solid fa-sparkles text-[10px]" />
                Feature Release Desk
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                <i className="fa-solid fa-code-branch text-[9px]" />
                {release.version} ({release.releaseDate})
              </span>

              {/* Broadcast Status Pill */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                  isBroadcasted
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                )}
              >
                <i className={cn("fa-solid text-[9px]", isBroadcasted ? "fa-tower-broadcast" : "fa-shield-halved")} />
                {isBroadcasted ? `Active Broadcast (${targetRoles.length} Roles)` : "Draft (Not Broadcasted)"}
              </span>
            </div>

            <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground">
              {release.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {release.subtitle}
            </p>
          </div>

          {/* Quick Preview & Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPreviewRole(isPrivileged ? "Employee" : userRole);
                setPreviewModalOpen(true);
              }}
              className="min-h-[38px] w-full sm:w-auto justify-center text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
            >
              <i className="fa-solid fa-eye text-xs" />
              <span>Preview Spotlight Modal</span>
            </Button>

            {isModal && onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="min-h-[38px] text-xs rounded-xl"
              >
                Close
              </Button>
            )}
          </div>
        </div>

        {/* ── Admin Controls: Whom to Broadcast & Features Checklist ───── */}
        {isPrivileged ? (
          <div className="pt-4 border-t border-border/60 space-y-4">
            {/* 1. Whom to Broadcast (Role Selector) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-users text-primary text-xs" />
                  <span>Whom to Broadcast (Target Audience):</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleAllRoles}
                  className="text-xs font-bold text-[#00c5a0] hover:underline cursor-pointer"
                >
                  {targetRoles.length === ALL_ROLES.length ? "Deselect All" : "Select All Roles"}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {ALL_ROLES.map((r) => {
                  const active = targetRoles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleToggleRole(r)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px] active:scale-95",
                        active
                          ? "bg-[#00c5a0] text-slate-950 border-[#00c5a0] shadow-xs font-bold"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      )}
                    >
                      <i className={cn("fa-solid text-[10px]", active ? "fa-check" : "fa-plus")} />
                      <span>{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Features Checklist Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check text-primary text-xs" />
                  <span>Included Features in this Broadcast:</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  <strong>{selectedFeatureIds.length} of {release.features.length}</strong> selected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {release.features.map((feat) => {
                  const isChecked = selectedFeatureIds.includes(feat.id);

                  return (
                    <div
                      key={feat.id}
                      onClick={() => handleToggleFeature(feat.id)}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all duration-150 flex items-start justify-between gap-3 cursor-pointer select-none group",
                        isChecked
                          ? "bg-card border-primary/40 shadow-2xs hover:border-primary"
                          : "bg-card/40 border-border/40 opacity-70 hover:opacity-90"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 transition-colors",
                          isChecked
                            ? "bg-[#00c5a0] text-slate-950 border-[#00c5a0]"
                            : "bg-background border-border text-transparent"
                        )}>
                          <i className="fa-solid fa-check text-[10px]" />
                        </div>

                        <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                          <i className={cn(feat.icon, "text-sm")} />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-foreground">
                              {feat.title}
                            </h4>
                            {feat.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                {feat.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {feat.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Feed Notification Checkbox & Publish Bar */}
            <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={sendFeedNotification}
                  onChange={(e) => setSendFeedNotification(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span className="font-medium text-foreground">
                  Also post to Notification Center stream & trigger unread bell for target members
                </span>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
                {isBroadcasted && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleSaveBroadcast(false)}
                    className="min-h-[38px] w-full sm:w-auto justify-center text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <i className="fa-solid fa-eye-slash text-xs mr-1" />
                    <span>Revoke Broadcast</span>
                  </Button>
                )}

                <Button
                  size="sm"
                  disabled={submitting || targetRoles.length === 0 || selectedFeatureIds.length === 0}
                  onClick={() => handleSaveBroadcast(true)}
                  className="min-h-[38px] w-full sm:w-auto justify-center text-xs font-bold px-4 bg-gradient-to-r from-emerald-500 to-[#00c5a0] hover:from-emerald-600 hover:to-[#00b290] text-slate-950 shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-tower-broadcast text-xs" />
                  <span>
                    {submitting
                      ? "Publishing..."
                      : isBroadcasted
                      ? "Update Broadcast Settings"
                      : `Broadcast to ${targetRoles.length} Roles`}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Non-Admin Employee View */
          <div className="pt-4 border-t border-border/60">
            {!showToUser || userFeatures.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/20">
                <i className="fa-solid fa-eye-slash text-2xl text-muted-foreground mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  No feature broadcasts are currently active for your role.
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  When new workspace updates are broadcasted by administrators, they will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userFeatures.map((feat) => (
                  <div
                    key={feat.id}
                    className="p-4 rounded-xl border border-border bg-card shadow-2xs flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <i className={cn(feat.icon, "text-sm text-primary")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">
                              {feat.title}
                            </h4>
                            {feat.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                {feat.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{feat.tag}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feat.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(feat.href)}
                        className="min-h-[38px] px-3.5 text-xs border-[#00c5a0]/40 text-[#00c5a0] hover:bg-[#00c5a0]/15 flex items-center gap-1.5 font-medium rounded-lg"
                      >
                        <span>Explore</span>
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Preview Spotlight Modal ────────────────────────────────────── */}
      {previewModalOpen && (
        <FeatureSpotlightModal
          forceOpen={true}
          previewRole={previewRole || "Employee"}
          previewFeatures={selectedFeatureIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}
    </div>
  );
}

