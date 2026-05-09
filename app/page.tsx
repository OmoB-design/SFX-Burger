import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  staff: "/orders",
  chef:  "/chef",
};

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role as UserRole | undefined;
  redirect(ROLE_HOME[role ?? "staff"] ?? "/orders");
}
