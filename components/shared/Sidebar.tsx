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
  ChevronsUpDown,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import type { UserRole } from "@/types/domain";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function AppSidebar({ role, fullName, email }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] ?? NAV_ITEMS.staff;

  const initials = fullName
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar print:hidden"
    >

      {/* ── Header — company frame ── */}
      <SidebarHeader className="p-0 border-b border-sidebar-border">

        {/* Expanded: shadcn-style size="lg" company button */}
        <div className="group-data-[collapsible=icon]:hidden flex items-center gap-1 px-2 py-1.5">
          <SidebarMenuButton
            size="lg"
            className="flex-1 hover:bg-transparent cursor-default focus-visible:ring-0 outline-none"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background border-[0.5px] border-sidebar-border overflow-hidden flex-shrink-0">
              <Image
                src="/logo-primary.svg"
                alt="SFx Burger"
                width={28}
                height={28}
                priority
              />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-semibold text-foreground">SFx Burger</span>
              <span className="truncate text-xs text-muted-foreground font-mono">OMS v2.0</span>
            </div>
          </SidebarMenuButton>
          <SidebarTrigger />
        </div>

        {/* Collapsed: small logo icon + expand trigger, centred */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1.5 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background border-[0.5px] border-sidebar-border overflow-hidden">
            <Image
              src="/logo-primary.svg"
              alt="SFx Burger"
              width={28}
              height={28}
              priority
            />
          </div>
          <SidebarTrigger />
        </div>

      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-3 py-4">
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  tooltip={item.label}
                  className={cn(
                    "rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-background text-foreground [box-shadow:0_0_0_0.2px_var(--sidebar-border)] hover:bg-background hover:text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer — profile frame with dropdown ── */}
      <SidebarFooter className="p-0 border-t border-sidebar-border">
        <div className="px-3 py-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">

          <DropdownMenu>

            {/* Trigger — adapts between expanded card and collapsed avatar */}
            <DropdownMenuTrigger
              className={cn(
                /* Expanded: framed profile card */
                "flex w-full items-center gap-3 rounded-2xl bg-background border-[0.5px] border-sidebar-border px-3 py-2.5 text-left cursor-pointer transition-opacity hover:opacity-80 focus:outline-none appearance-none",
                /* Collapsed: small avatar circle */
                "group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:bg-sfx-red/20 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
              )}
            >
              {/* Avatar — always visible */}
              <div className="h-8 w-8 rounded-full bg-sfx-red/20 flex items-center justify-center flex-shrink-0 group-data-[collapsible=icon]:bg-transparent">
                <span className="text-xs font-bold text-sfx-red">{initials}</span>
              </div>

              {/* Name + email — hidden when collapsed */}
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-foreground truncate leading-none mb-0.5">
                  {fullName}
                </p>
                <p className="text-xs text-muted-foreground truncate leading-none">
                  {email}
                </p>
              </div>

              {/* Role badge — hidden when collapsed */}
              <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex-shrink-0 group-data-[collapsible=icon]:hidden">
                {ROLE_LABEL[role]}
              </span>

              {/* Chevron — hidden when collapsed */}
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-auto group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>

            {/* Dropdown content — user info + sign out */}
            <DropdownMenuContent
              side="top"
              sideOffset={8}
              align="start"
              className="min-w-64 rounded-xl p-1.5"
            >
              {/* User info header (non-interactive) */}
              <div className="flex items-center gap-3 px-2 py-2.5 mb-0.5">
                <div className="h-9 w-9 rounded-full bg-sfx-red/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-sfx-red">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate leading-none mb-0.5">
                    {fullName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate leading-none">
                    {email}
                  </p>
                </div>
                <span className="ml-auto text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex-shrink-0">
                  {ROLE_LABEL[role]}
                </span>
              </div>

              <DropdownMenuSeparator />

              {/* Sign out */}
              <DropdownMenuItem
                className="gap-2 mt-1 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => { void logout(); }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>

          </DropdownMenu>
        </div>
      </SidebarFooter>

    </Sidebar>
  );
}
