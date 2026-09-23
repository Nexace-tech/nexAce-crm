"use client";

import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { OnboardingScreens } from "@/components/layout/OnboardingScreens";
import { NativeLoginScreen } from "@/components/layout/NativeLoginScreen";

interface NativeAppGateProps {
  children: React.ReactNode;
}

type NativeAppState = "loading" | "onboarding" | "login" | "authenticated";

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
 *
 * "loading" state: shows a solid splash screen while we check an existing session
 * to avoid the black-screen → onboarding → login flash.
 */
export function NativeAppGate({ children }: NativeAppGateProps) {
  // Synchronous native check — no flash on first render
  const [isNative] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Capacitor.isNativePlatform();
  });

  // Start in "loading" so we can show a splash while checking the session.
  // This prevents the black → onboarding → login visual flicker.
  const [appState, setAppState] = useState<NativeAppState>("loading");

  // On mount: resolve the correct initial state.
  // Order of priority: existing session → authenticated; onboarding done → login; else → onboarding.
  useEffect(() => {
    if (!isNative) {
      setAppState("authenticated"); // web: skip gate entirely
      return;
    }

    const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === "true";

    if (!onboardingDone) {
      // First-ever launch — show onboarding without a network round-trip.
      setAppState("onboarding");
      return;
    }

    // Onboarding already done — check for an existing server session before
    // showing the login screen. This handles returning authenticated users.
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        setAppState(data?.user ? "authenticated" : "login");
      })
      .catch(() => setAppState("login"));
  }, [isNative]);

  // On web browser: render the full CRM web app normally.
  if (!isNative) {
    return <>{children}</>;
  }

  // ── Loading splash — matches onboarding bg to avoid any black flash ──────
  if (appState === "loading") {
    return (
      <div
        className="fixed inset-0 z-[99999] w-full h-full flex items-center justify-center"
        style={{ background: "#eefbf9" }}
      >
        {/* Minimal centered logo mark while session resolves */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg, #00c5a0 0%, #008080 100%)",
            boxShadow: "0 8px 24px rgba(0,197,160,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i className="fa-solid fa-layer-group" style={{ color: "#fff", fontSize: 24 }} />
        </div>
      </div>
    );
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
    const handleLoginSuccess = () => {
      // Show the loading splash while the page reloads to /dashboard.
      // On reload the session cookie is active → NativeAppGate will fast-track
      // to "authenticated" without ever revealing the web /login page.
      setAppState("loading");
      window.location.replace("/dashboard");
    };

    return (
      <div
        className="fixed inset-0 z-[99999] w-full h-full overflow-hidden"
        style={{ background: "linear-gradient(160deg, #ffffff 0%, #f2fbf8 50%, #eafaf6 100%)" }}
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
