import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";
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
    <div className="flex h-screen bg-background overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar
        role={profile.role}
        fullName={profile.full_name}
        email={user.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
