"use client";

import * as React from "react";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
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
      className={cn(
        "w-9 h-9 border border-slate-200 dark:border-[#232d3b] rounded-xl bg-slate-50 dark:bg-[#1a222d] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2632] flex items-center justify-center cursor-pointer transition-colors shadow-2xs relative",
        className
      )}
      title={`Current: ${resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"} (Click to switch)`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {mounted ? (
          resolvedTheme === "dark" ? (
            <i className="fa-solid fa-moon text-xs text-cyan-400 transform transition-all duration-300 rotate-0 scale-100 group-hover:rotate-12" />
          ) : (
            <i className="fa-solid fa-sun text-xs text-amber-500 transform transition-all duration-300 rotate-0 scale-100 group-hover:rotate-45" />
          )
        ) : (
          <i className="fa-solid fa-circle-half-stroke text-xs text-muted-foreground opacity-60" />
        )}
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
