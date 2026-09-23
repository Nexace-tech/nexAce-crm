"use client";

import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { OnboardingScreens } from "@/components/layout/OnboardingScreens";
import { NativeLoginScreen } from "@/components/layout/NativeLoginScreen";

interface NativeAppGateProps {
  children: React.ReactNode;
}

type NativeAppState = "onboarding" | "login" | "authenticated";

const ONBOARDING_DONE_KEY = "nexace_native_onboarding_done";

/**
 * Gatekeeper for Mobile Apps (Android / iOS via Capacitor).
 *
 * Full native app flow:
 *   1. First launch  → Onboarding (3-slide tour)
 *   2. "Get Started" → Login screen (embedded, full-screen)
 *   3. Successful login → AuthContext session is created on server;
 *      we detect the session via /api/auth/me and render children (App Router)
 *      which Next.js handles normally — /dashboard is rendered inside the webview.
 *
 * On subsequent launches (onboarding already done) the gate goes straight to login.
 * If the user already has a valid session it goes straight to authenticated (children).
 *
 * Web browsers bypass this gate entirely and get the full CRM web app.
 */
export function NativeAppGate({ children }: NativeAppGateProps) {
  // Synchronous native check — no flash on first render
  const [isNative] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Capacitor.isNativePlatform();
  });

  const [appState, setAppState] = useState<NativeAppState>(() => {
    if (typeof window === "undefined") return "onboarding";
    const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === "true";
    return onboardingDone ? "login" : "onboarding";
  });

  // On mount: if we might already have an active session, fast-track to authenticated
  useEffect(() => {
    if (!isNative) return;
    // Only check session if we're at the login step (no point checking during onboarding)
    if (appState !== "login") return;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (data?.user) {
          setAppState("authenticated");
        }
      })
      .catch(() => {});
  }, [isNative, appState]);

  // On web browser: render the full CRM web app normally.
  if (!isNative) {
    return <>{children}</>;
  }

  // ── Onboarding ──────────────────────────────────────────────────────────
  if (appState === "onboarding") {
    const handleOnboardingDone = () => {
      localStorage.setItem(ONBOARDING_DONE_KEY, "true");
      setAppState("login");
    };

    return (
      <div
        className="fixed inset-0 z-[99999] w-full h-full overflow-hidden"
        style={{ background: "#eefbf9" }}
      >
        <OnboardingScreens
          isAppLocked={true}
          isFullScreen={true}
          onDone={handleOnboardingDone}
        />
      </div>
    );
  }

  // ── Login ────────────────────────────────────────────────────────────────
  if (appState === "login") {
    const handleLoginSuccess = () => setAppState("authenticated");

    return (
      <div
        className="fixed inset-0 z-[99999] w-full h-full overflow-hidden"
        style={{ background: "var(--background, #ffffff)" }}
      >
        <NativeLoginScreen
          onReplayOnboarding={() => setAppState("onboarding")}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // ── Authenticated — render normal App Router children ───────────────────
  return <>{children}</>;
}
