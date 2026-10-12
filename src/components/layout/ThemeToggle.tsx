"use client";

import * as React from "react";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-full relative flex items-center justify-center cursor-pointer overflow-hidden group transition-transform active:scale-90 border border-border/60 bg-card/60 hover:bg-accent/80 shadow-2xs"
      title={`Current: ${resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"} (Click to switch)`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {mounted ? (
          resolvedTheme === "dark" ? (
            <i className="fa-solid fa-moon text-base text-cyan-400 transform transition-all duration-300 rotate-0 scale-100 group-hover:rotate-12" />
          ) : (
            <i className="fa-solid fa-sun text-base text-amber-500 transform transition-all duration-300 rotate-0 scale-100 group-hover:rotate-45" />
          )
        ) : (
          <i className="fa-solid fa-circle-half-stroke text-sm text-muted-foreground opacity-60" />
        )}
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

