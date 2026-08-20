"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, generateSecurePassword, validatePasswordPattern, getPasswordCriteria } from "@/lib/utils";

export function ProfileCompletionBanner() {
  const { user, refreshUser } = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const [pwBannerDismissed, setPwBannerDismissed] = useState(false);

  // Profile Checklist Modal state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  // First-Time Password Change Modal state (for admin-provisioned users)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Check profile completion percentage & missing fields
  const missingFields: string[] = [];
  if (!user?.phone) missingFields.push("Phone Number");
  if (!user?.bio) missingFields.push("Bio / About Me");
  if (!user?.skills || user.skills.length === 0) missingFields.push("Skills");
  if (!user?.photoUrl) missingFields.push("Avatar / Profile Photo");

  const totalChecks = 4;
  const completedCount = totalChecks - missingFields.length;
  const percent = Math.round((completedCount / totalChecks) * 100);

  const isProfileIncomplete = missingFields.length > 0;

  // Auto-trigger First-Time Password Reset Modal for admin-added users
  useEffect(() => {
    if (user?.forcePasswordReset && user._id) {
      const modalDismissed = sessionStorage.getItem(`pw_modal_dismissed_${user._id}`);
      if (!modalDismissed) {
        setIsPasswordModalOpen(true);
      }
    }
  }, [user?._id, user?.forcePasswordReset]);

  // Detect newly added user profile checklist (only if password reset is already completed)
  useEffect(() => {
    if (user && !user.forcePasswordReset && isProfileIncomplete) {
      const hasSeenModal = sessionStorage.getItem(`profile_welcome_seen_${user._id}`);
      if (!hasSeenModal) {
        setIsNewUserModalOpen(true);
        sessionStorage.setItem(`profile_welcome_seen_${user._id}`, "true");
      }
    }
  }, [user?._id, user?.forcePasswordReset, isProfileIncomplete]);

  // Restore per-session dismiss state for password banner
  useEffect(() => {
    if (user?._id) {
      const wasDismissed = sessionStorage.getItem(`pw_banner_dismissed_${user._id}`);
      if (wasDismissed) setPwBannerDismissed(true);
    }
  }, [user?._id]);

  const handleDismissPwBanner = () => {
    setPwBannerDismissed(true);
    if (user?._id) {
      sessionStorage.setItem(`pw_banner_dismissed_${user._id}`, "true");
    }
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    if (user?._id) {
      sessionStorage.setItem(`pw_modal_dismissed_${user._id}`, "true");
    }
  };

  const handleSetDirectPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    const validation = validatePasswordPattern(newPassword);
    if (!validation.isValid) {
      setPasswordError(validation.error || "Password does not meet the security criteria.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPasswordSuccess(true);
        try {
          await refreshUser();
        } catch (err) {
          console.error("refreshUser error:", err);
        }
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccess(false);
          setNewPassword("");
          setConfirmPassword("");
        }, 1200);
      } else {
        setPasswordError(data.error || "Failed to update password.");
      }
    } catch (err: any) {
      console.error("Set password error:", err);
      setPasswordError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const criteria = getPasswordCriteria(newPassword);
  const showPasswordBanner = Boolean(user?.forcePasswordReset) && !pwBannerDismissed;
  const showProfileBanner = Boolean(user && !user.forcePasswordReset && isProfileIncomplete && !dismissed);

  return (
    <>
      {/* ── Password Change Reminder Banner (admin-provisioned users only) ── */}
      {showPasswordBanner && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-500/10 via-orange-500/8 to-amber-500/10 p-4 shadow-sm backdrop-blur-md">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-red-500/20 blur-2xl pointer-events-none animate-pulse" />
          <div className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/30 shadow-xs">
                <i className="fa-solid fa-key text-lg" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground">
                    Action Required: Set Your Password
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse">
                    First-Time Setup
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your account was set up by an administrator.{" "}
                  <span className="font-semibold text-foreground">Please set your personal password</span>{" "}
                  to secure your workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismissPwBanner}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border-border/60"
              >
                Remind Later
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setPasswordError("");
                }}
                className="h-8 px-3.5 text-xs font-bold gap-1.5 shadow-sm bg-red-500 hover:bg-red-600 text-white border-transparent cursor-pointer"
              >
                <i className="fa-solid fa-lock text-xs" /> Set New Password
              </Button>
            </div>
          </div>

          <div className="mt-3 w-full bg-muted/60 rounded-full h-1 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 h-full rounded-full w-full opacity-70" />
          </div>
        </div>
      )}

      {/* ── Profile Completion Banner ── */}
      {showProfileBanner && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/10 to-indigo-500/10 p-4 shadow-sm backdrop-blur-md transition-all">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-xs">
                <i className="fa-solid fa-id-card text-lg" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    Complete Your Profile ({percent}%)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {missingFields.length} item{missingFields.length === 1 ? "" : "s"} missing
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add your <span className="font-medium text-foreground">{missingFields.slice(0, 2).join(", ")}{missingFields.length > 2 ? ` and ${missingFields.length - 2} more` : ""}</span> to help your team connect with you.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDismissed(true)}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Remind Later
              </Button>
              <Button
                color="primary"
                size="sm"
                className="h-8 px-3.5 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
                asChild
              >
                <Link
                  href="/dashboard/settings?tab=profile"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("switch-settings-tab", { detail: "profile" }));
                    }
                  }}
                >
                  <i className="fa-solid fa-pen-to-square text-xs" /> Complete Profile
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-3 w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-primary h-full rounded-full transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── First-Time Set New Password Modal Pop-up (Only New Password & Confirm Password) ── */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={handleClosePasswordModal}
        >
          <div
            className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClosePasswordModal}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Close"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>

            {/* Success State Overlay */}
            {passwordSuccess ? (
              <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <i className="fa-solid fa-circle-check text-3xl" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">Password Set Successfully!</h3>
                  <p className="text-xs text-muted-foreground">
                    Your account is now secure. Welcome aboard!
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Header with Icon */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 border border-red-500/30 shadow-md">
                    <i className="fa-solid fa-key text-xl" />
                  </div>
                  <div className="space-y-1 pr-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-foreground tracking-tight">
                        Set Your New Password
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20">
                        First-Time Setup
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Welcome, <span className="font-semibold text-foreground">{user?.name || "there"}</span>! Please create a new personal password to secure your account.
                    </p>
                  </div>
                </div>

                {/* Error Banner */}
                {passwordError && (
                  <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
                    <i className="fa-solid fa-circle-exclamation shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Password Form (Only New Password & Confirm Password) */}
                <form onSubmit={handleSetDirectPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-key text-muted-foreground text-xs" /> New Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const gen = generateSecurePassword();
                          setNewPassword(gen);
                          setConfirmPassword(gen);
                          setShowNewPassword(true);
                          setShowConfirmPassword(true);
                        }}
                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-wand-magic-sparkles text-[10px]" /> Generate Strong
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 chars, 1 uppercase, 1 number, 1 symbol"
                        className="pr-10 h-10 text-xs"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        <i className={cn("fa-solid text-xs", showNewPassword ? "fa-eye-slash" : "fa-eye")} />
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Checklist */}
                  {newPassword && (
                    <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px]">
                      <span className={cn("flex items-center gap-1.5", criteria.minLength ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                        <i className={cn("fa-solid text-[9px]", criteria.minLength ? "fa-circle-check" : "fa-circle")} /> 8+ Characters
                      </span>
                      <span className={cn("flex items-center gap-1.5", criteria.hasUpper ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                        <i className={cn("fa-solid text-[9px]", criteria.hasUpper ? "fa-circle-check" : "fa-circle")} /> Uppercase
                      </span>
                      <span className={cn("flex items-center gap-1.5", criteria.hasLower ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                        <i className={cn("fa-solid text-[9px]", criteria.hasLower ? "fa-circle-check" : "fa-circle")} /> Lowercase
                      </span>
                      <span className={cn("flex items-center gap-1.5", criteria.hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                        <i className={cn("fa-solid text-[9px]", criteria.hasNumber ? "fa-circle-check" : "fa-circle")} /> Number (0-9)
                      </span>
                      <span className={cn("flex items-center gap-1.5 col-span-2", criteria.hasSpecial ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                        <i className={cn("fa-solid text-[9px]", criteria.hasSpecial ? "fa-circle-check" : "fa-circle")} /> Special Symbol (!@#$%...)
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-lock text-muted-foreground text-xs" /> Confirm New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="pr-10 h-10 text-xs"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <i className={cn("fa-solid text-xs", showConfirmPassword ? "fa-eye-slash" : "fa-eye")} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClosePasswordModal}
                      className="text-xs"
                    >
                      I&apos;ll Do It Later
                    </Button>
                    <Button
                      type="submit"
                      color="primary"
                      size="sm"
                      disabled={updatingPassword || !newPassword || !confirmPassword}
                      className="gap-2 font-semibold text-xs shadow-md shadow-primary/20 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <i className={cn("fa-solid text-xs", updatingPassword ? "fa-spinner fa-spin" : "fa-shield-halved")} />
                      {updatingPassword ? "Saving Password..." : "Set New Password"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Profile Checklist Welcome Modal ── */}
      {isNewUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsNewUserModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
                <i className="fa-solid fa-user-astronaut text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Welcome to NexAce CRM, {user?.name?.split(" ")[0] || "there"}! 👋
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your account is ready. Let&apos;s take a quick minute to fill out your profile details so your team members can reach you seamlessly.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-list-check text-primary text-xs" /> Profile Setup Checklist
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "Profile Photo & Avatar", done: Boolean(user?.photoUrl) },
                  { label: "Contact Phone Number", done: Boolean(user?.phone) },
                  { label: "Bio / Professional Summary", done: Boolean(user?.bio) },
                  { label: "Skills & Specializations", done: Boolean(user?.skills && user.skills.length > 0) },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-background/60 border border-border/40">
                    <span className="text-foreground font-medium flex items-center gap-2">
                      <i className={cn("fa-solid text-[10px]", item.done ? "fa-circle-check text-emerald-500" : "fa-circle text-muted-foreground/40")} />
                      {item.label}
                    </span>
                    <span className={cn("text-[10px] font-semibold", item.done ? "text-emerald-500" : "text-amber-500")}>
                      {item.done ? "Done" : "Required"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-1/2"
                onClick={() => setIsNewUserModalOpen(false)}
              >
                I&apos;ll Do It Later
              </Button>
              <Button
                color="primary"
                size="sm"
                className="w-1/2 font-semibold shadow-md shadow-primary/25 cursor-pointer"
                asChild
                onClick={() => {
                  setIsNewUserModalOpen(false);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("switch-settings-tab", { detail: "profile" }));
                  }
                }}
              >
                <Link href="/dashboard/settings?tab=profile">
                  <i className="fa-solid fa-arrow-right text-xs mr-1.5" /> Go to Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

