import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  staff: "/orders",
  chef:  "/chef",
};

// Routes only accessible when NOT logged in
const AUTH_ROUTES = ["/login"];

// Routes that require authentication — dashboard group
const DASHBOARD_PREFIX = ["/admin", "/orders", "/chef", "/menu", "/reports", "/settings"];

// Role-based access: which prefixes each role may visit
const ROLE_ALLOWED: Record<string, string[]> = {
  admin: ["/admin", "/orders", "/chef", "/menu", "/reports", "/settings"],
  staff: ["/orders", "/settings"],
  chef:  ["/chef", "/settings"],
};

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isDashboardRoute = DASHBOARD_PREFIX.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // Unauthenticated user hitting a protected route → /login
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user on auth or dashboard routes — resolve live role from DB.
  // We do NOT trust user_metadata.role: it is set at signup and never updated when
  // an admin changes a profile's role. Reading from profiles gives the current role.
  if (user && (isAuthRoute || isDashboardRoute)) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profileData as { role: string } | null)?.role ?? "staff";

    // Authenticated user hitting /login → their home
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role] ?? "/orders";
      return NextResponse.redirect(url);
    }

    // Authenticated user on a dashboard route — check role access
    if (isDashboardRoute) {
      const allowed = ROLE_ALLOWED[role] ?? ROLE_ALLOWED.staff;
      const canAccess = allowed.some((p) => pathname.startsWith(p));

      if (!canAccess) {
        const url = request.nextUrl.clone();
        url.pathname = ROLE_HOME[role] ?? "/orders";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
