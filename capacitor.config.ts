import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexace.crm",
  appName: "NexAce CRM",
  webDir: "public",
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
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      // Match the onboarding/splash background so there's no dark flash
      backgroundColor: "#eefbf9",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
