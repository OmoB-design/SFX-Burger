import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/types/domain";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  staff: "Staff",
  chef:  "Chef",
};

export default async function SettingsPage() {
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

  const role = profile.role;

  return (
    <div>
      {/* Sticky header with bottom stroke */}
      <div className="sticky top-0 z-10 bg-background border-b border-sidebar-border px-6 py-5">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Your account details</p>
      </div>

      {/* Content — 100px below header */}
      <div className="px-6 pt-[100px] pb-6 max-w-xl space-y-6">

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-foreground">
              {profile.full_name || "—"}
            </span>

            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{user.email}</span>

            <span className="text-muted-foreground">Role</span>
            <Badge
              variant="outline"
              className="w-fit font-mono text-xs capitalize border-sfx-amber/50 text-sfx-amber"
            >
              {ROLE_LABEL[role]}
            </Badge>

            <span className="text-muted-foreground">Member since</span>
            <span className="font-mono text-xs text-foreground">
              {new Date(user.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        To update your name or password, contact your administrator.
      </p>
      </div>
    </div>
  );
}
