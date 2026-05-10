import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/shared/Sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import type { UserRole } from "@/types/domain";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: UserRole; full_name: string } | null;
  if (!profile) redirect("/login");

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "17.5rem" } as React.CSSProperties}
      className="h-screen overflow-hidden print:block print:h-auto print:overflow-visible"
    >
      <AppSidebar
        role={profile.role}
        fullName={profile.full_name}
        email={user.email ?? ""}
      />
      <SidebarInset className="overflow-y-auto print:overflow-visible">
        {/* Mobile header — visible only on small screens; gives access to the sidebar drawer */}
        <div className="sm:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-12 border-b border-sidebar-border bg-sidebar print:hidden">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Image src="/logo-primary.svg" alt="SFx Burger" width={22} height={22} />
            <span className="font-semibold text-sm text-foreground">SFx Burger</span>
          </div>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
