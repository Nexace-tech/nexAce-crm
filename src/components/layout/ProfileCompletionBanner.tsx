"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProfileCompletionBanner() {
  const { user } = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

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

  // Detect newly added user (forcePasswordReset flag or first session flag)
  useEffect(() => {
    if (user && isProfileIncomplete) {
      const hasSeenModal = sessionStorage.getItem(`profile_welcome_seen_${user._id}`);
      if (!hasSeenModal) {
        setIsNewUserModalOpen(true);
        sessionStorage.setItem(`profile_welcome_seen_${user._id}`, "true");
      }
    }
  }, [user?._id, isProfileIncomplete]);

  if (!user || !isProfileIncomplete || dismissed) {
    return null;
  }

  return (
    <>
      {/* ── Top Floating Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/10 to-indigo-500/10 p-4 shadow-sm backdrop-blur-md transition-all">
        {/* Glow effect */}
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
              className="h-8 px-3.5 text-xs font-semibold gap-1.5 shadow-sm"
              asChild
            >
              <Link href="/dashboard/settings">
                <i className="fa-solid fa-pen-to-square text-xs" /> Complete Profile
              </Link>
            </Button>
          </div>
        </div>

        {/* Mini progress line */}
        <div className="mt-3 w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-primary h-full rounded-full transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* ── First-Time Welcome Modal ── */}
      {isNewUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsNewUserModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Icon */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
                <i className="fa-solid fa-user-astronaut text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Welcome to NexAce CRM, {user?.name?.split(" ")[0] || "there"}! 👋
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your account is ready. Let's take a quick minute to fill out your profile details so your team members can reach you seamlessly.
              </p>
            </div>

            {/* Checklist items */}
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

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-1/2"
                onClick={() => setIsNewUserModalOpen(false)}
              >
                I'll Do It Later
              </Button>
              <Button
                color="primary"
                size="sm"
                className="w-1/2 font-semibold shadow-md shadow-primary/25"
                asChild
                onClick={() => setIsNewUserModalOpen(false)}
              >
                <Link href="/dashboard/settings">
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
