import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexace.crm",
  appName: "NexAce CRM",
  webDir: "public",
  backgroundColor: "#eefbf9",
  server: {
    // In mobile native app mode, point to the live cloud backend or local network IP
    url: process.env.CAPACITOR_SERVER_URL || "https://nex-ace-crm.vercel.app",
    // Start at /dashboard — NativeAppGate intercepts unauthenticated users and shows
    // the onboarding/login screens. After successful login NativeAppGate renders
    // children which are already pointed at the dashboard URL (no /onboarding flash).
    appStartPath: "/dashboard",
    cleartext: true,
    errorPath: "offline.html",
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#eefbf9",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#eefbf9",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
