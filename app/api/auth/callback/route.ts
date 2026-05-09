import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types/domain";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  staff: "/orders",
  chef: "/chef",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const role = data.user.user_metadata?.role as UserRole | undefined;
      const home = ROLE_HOME[role ?? "staff"] ?? "/orders";
      return NextResponse.redirect(new URL(home, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
