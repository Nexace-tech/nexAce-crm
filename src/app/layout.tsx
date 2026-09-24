import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/providers/theme-provider";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { NativeAppGate } from "@/components/layout/NativeAppGate";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Match the onboarding background on native so first paint is never black
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eefbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#eefbf9" },
  ],
};

export const metadata: Metadata = {
  title: "NexAce CRM | The Unified Workspace",
  applicationName: "NexAce CRM",
  description: "Enterprise multi-tenant workspace for teams, sprints, projects, communications, HR, goals, clients, and referrals.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body suppressHydrationWarning className="bg-background text-foreground antialiased min-h-screen">
        <ThemeProvider defaultTheme="system">
          <OfflineBanner />
          <NativeAppGate>{children}</NativeAppGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
