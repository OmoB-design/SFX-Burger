"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import type { UserRole } from "@/types/domain";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard",  href: "/admin",    icon: LayoutDashboard },
    { label: "Orders",     href: "/orders",   icon: ClipboardList },
    { label: "Kitchen",    href: "/chef",     icon: ChefHat },
    { label: "Menu",       href: "/menu",     icon: UtensilsCrossed },
    { label: "Reports",    href: "/reports",  icon: BarChart3 },
    { label: "Settings",   href: "/settings", icon: Settings },
  ],
  staff: [
    { label: "Orders",   href: "/orders",   icon: ClipboardList },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  chef: [
    { label: "Kitchen",  href: "/chef",     icon: ChefHat },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  staff: "Staff",
  chef:  "Chef",
};

interface SidebarProps {
  role: UserRole;
  fullName: string;
  email: string;
}

export function Sidebar({ role, fullName, email }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] ?? NAV_ITEMS.staff;

  const initials = fullName
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex h-screen w-[280px] flex-col border-r border-sidebar-border bg-sidebar">

      {/* Logo — framed card */}
      <div className="px-3 pt-3 pb-2 border-b border-sidebar-border">
        <div className="flex items-center gap-3 rounded-2xl bg-background border-[0.5px] border-sidebar-border px-4 py-3">
          <Image
            src="/logo-primary.svg"
            alt="SFx Burger"
            width={52}
            height={52}
            className="flex-shrink-0"
            priority
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              SFx Burger
            </p>
            <p className="text-xs text-muted-foreground font-mono leading-tight">
              OMS v2.0
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer — framed card + sign out */}
      <div className="px-3 pb-3 pt-2 border-t border-sidebar-border space-y-1.5">

        {/* Profile card */}
        <div className="rounded-2xl bg-background border-[0.5px] border-sidebar-border px-3 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sfx-red/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sfx-red">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
            <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex-shrink-0">
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>

        {/* Sign out */}
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 rounded-lg px-3 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>

      </div>
    </aside>
  );
}
