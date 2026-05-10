"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <div
      className="sm:hidden sticky top-0 z-20 flex shrink-0 items-center justify-between px-4 bg-sidebar border-b border-sidebar-border print:hidden"
      style={{ height: "60px" }}
    >

      {/* Logo + wordmark */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-background border border-sidebar-border overflow-hidden flex-shrink-0">
          <Image
            src="/logo-primary.svg"
            alt="SFx Burger"
            width={20}
            height={20}
            priority
          />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight leading-none">
          SFx Burger
        </span>
        <span className="text-[10px] font-mono text-muted-foreground leading-none mt-px">
          OMS
        </span>
      </div>

      {/* Hamburger — morphs into X when drawer is open */}
      <button
        onClick={() => setOpenMobile(!openMobile)}
        aria-label={openMobile ? "Close menu" : "Open menu"}
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150",
          "text-muted-foreground hover:text-foreground hover:bg-sfx-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          openMobile && "text-sfx-red bg-sfx-red/10"
        )}
      >
        <Menu
          className={cn(
            "absolute h-[17px] w-[17px] transition-all duration-200 ease-in-out",
            openMobile
              ? "opacity-0 rotate-45 scale-50"
              : "opacity-100 rotate-0 scale-100"
          )}
        />
        <X
          className={cn(
            "absolute h-[17px] w-[17px] transition-all duration-200 ease-in-out",
            openMobile
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 -rotate-45 scale-50"
          )}
        />
      </button>

    </div>
  );
}
