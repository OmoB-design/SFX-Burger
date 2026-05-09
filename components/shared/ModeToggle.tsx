"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "light" | "dark";

const STORAGE_KEY = "sfx-mode";

export function ModeToggle() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Mode = saved ?? (prefersDark ? "dark" : "light");
    setMode(initial);
    document.documentElement.setAttribute("data-mode", initial);
  }, []);

  function toggle() {
    const next: Mode = mode === "light" ? "dark" : "light";
    setMode(next);
    document.documentElement.setAttribute("data-mode", next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
      {mode === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
