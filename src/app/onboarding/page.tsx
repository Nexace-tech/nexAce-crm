"use client";

import React from "react";
import { OnboardingScreens } from "@/components/layout/OnboardingScreens";

export default function OnboardingPage() {
  return (
    <main className="fixed inset-0 z-[99999] w-full h-full bg-[#eefbf9] overflow-hidden">
      <OnboardingScreens isAppLocked={true} isFullScreen={true} />
    </main>
  );
}
