"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-[60px] right-[60px] z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-sfx-amber" />
      ) : (
        <Moon className="h-4 w-4 text-sfx-charcoal" />
      )}
    </button>
  );
}
