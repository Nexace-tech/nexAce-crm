import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexace.crm",
  appName: "NexAce CRM",
  webDir: "public",
  server: {
    // In mobile native app mode, point to the live cloud backend or local network IP
    url: process.env.CAPACITOR_SERVER_URL || "https://nex-ace-crm.vercel.app",
    cleartext: true,
    errorPath: "offline.html",
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: "#11161d",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
