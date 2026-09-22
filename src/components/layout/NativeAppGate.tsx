"use client";

import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { OnboardingScreens } from "@/components/layout/OnboardingScreens";

interface NativeAppGateProps {
  children: React.ReactNode;
}

/**
 * Gatekeeper for Mobile Apps:
 * When loaded inside a native Capacitor shell (Android / iOS app),
 * it restricts users strictly and exclusively to the Onboarding Screens.
 * Normal web browsers on desktop or mobile browsers continue to access the full CRM web app.
 *
 * Fix: Capacitor.isNativePlatform() is synchronous — we read it in the useState
 * lazy initializer so isNative is known on the VERY FIRST render (before any effects).
 * This means children (CRM landing) are NEVER rendered on native — zero flash.
 */
export function NativeAppGate({ children }: NativeAppGateProps) {
  // Lazy initializer: runs synchronously during first render — no useEffect delay needed.
  const [isNative] = useState<boolean>(() => {
    if (typeof window === "undefined") return false; // SSR guard
    return Capacitor.isNativePlatform();
  });

  // On native: immediately show the onboarding overlay — no CRM page rendered at all.
  if (isNative) {
    return (
      <div className="fixed inset-0 z-[99999] w-full h-full overflow-hidden"
           style={{ background: "#eefbf9" }}>
        <OnboardingScreens isAppLocked={true} isFullScreen={true} />
      </div>
    );
  }

  // On web browser: render the full CRM web app normally.
  return <>{children}</>;
}

