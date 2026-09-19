"use client";

import React, { useEffect, useState } from "react";
import { NativeService } from "@/lib/native/nativeService";
import { OnboardingScreens } from "@/components/layout/OnboardingScreens";

interface NativeAppGateProps {
  children: React.ReactNode;
}

/**
 * Gatekeeper for Mobile Apps:
 * When loaded inside a native Capacitor shell (Android / iOS app),
 * it restricts users strictly and exclusively to the Onboarding Screens.
 * Normal web browsers on desktop or mobile browsers continue to access the full CRM web app.
 */
export function NativeAppGate({ children }: NativeAppGateProps) {
  const [isAppShell, setIsAppShell] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Determine if running inside native mobile app (Capacitor Android or iOS)
    const native = NativeService.isNative();
    setIsAppShell(native);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  // Inside the mobile apps, display only the Onboarding screens (locked in full-screen)
  if (isAppShell) {
    return (
      <div className="fixed inset-0 z-[99999] w-full h-full bg-[#eefbf9] overflow-hidden">
        <OnboardingScreens isAppLocked={true} isFullScreen={true} />
      </div>
    );
  }

  return <>{children}</>;
}
