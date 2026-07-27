"use client";

import * as React from "react";
import { useTheme } from "next-themes";
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
      className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-full relative flex items-center justify-center cursor-pointer"
      title="Toggle Theme"
    >
      {mounted && resolvedTheme === "dark" ? (
        <i className="fa-solid fa-moon text-base text-blue-400" />
      ) : (
        <i className="fa-solid fa-sun text-base text-amber-500" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
