import { redirect } from "next/navigation";
import { startOfDay, subMinutes } from "date-fns";
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatTL } from "@/lib/format";
import type { OrderRow } from "@/types/database.types";
import { DashboardTables } from "./_components/DashboardTables";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  const profile = profileData as { role: string; full_name: string } | null;
  if (!profile || profile.role !== "admin") redirect("/orders");

  const todayStart = startOfDay(new Date()).toISOString();
  const thirtyMinAgo = subMinutes(new Date(), 30).toISOString();

  const [todayResult, recentResult, staleResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_type, status, total_amount, seq_number, customer_name, created_at")
      .gte("created_at", todayStart)
      .neq("status", "cancelled"),

    supabase
      .from("orders")
      .select("id, seq_number, customer_name, status, total_amount, created_at, order_type")
      .order("created_at", { ascending: false })
      .limit(8),

    supabase
      .from("orders")
      .select("id, seq_number, customer_name, total_amount, created_at")
      .eq("status", "placed")
      .lt("created_at", thirtyMinAgo)
      .order("created_at", { ascending: true }),
  ]);

  const todayOrders = (todayResult.data as OrderRow[]) ?? [];
  const recentOrders = (recentResult.data as OrderRow[]) ?? [];
  const staleOrders = (staleResult.data as OrderRow[]) ?? [];

  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const pendingToday = todayOrders.filter((o) => o.status === "placed").length;
  const readyToday = todayOrders.filter((o) => o.status === "ready").length;

  const singleToday = todayOrders.filter((o) => o.order_type === "single");
  const bulkToday = todayOrders.filter((o) => o.order_type === "bulk");
  const singleRevenue = singleToday.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const bulkRevenue = bulkToday.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-sidebar-border px-6 h-[60px] flex items-center">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* KPI Cards */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Today&rsquo;s Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Orders Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-bold text-foreground">{ordersToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Excludes cancelled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Revenue Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-bold text-sfx-red">{formatTL(revenueToday)}</p>
                <p className="text-xs text-muted-foreground mt-1">Non-cancelled orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("font-mono text-3xl font-bold", pendingToday > 0 ? "text-sfx-amber" : "text-foreground")}>
                  {pendingToday}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Placed today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("font-mono text-3xl font-bold", readyToday > 0 ? "text-sfx-green" : "text-foreground")}>
                  {readyToday}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting delivery</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Order Type Split */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">Order Type Split</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Single Orders Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-bold text-foreground">{singleToday.length}</p>
                <p className="font-mono text-sm font-semibold text-sfx-amber mt-1">{formatTL(singleRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">SFX-S- prefix</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bulk Orders Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-bold text-foreground">{bulkToday.length}</p>
                <p className="font-mono text-sm font-semibold text-muted-foreground mt-1">{formatTL(bulkRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">SFX-B- prefix</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Needs Attention + Recent Orders — client component (uses router.push for row clicks) */}
        <DashboardTables staleOrders={staleOrders} recentOrders={recentOrders} />
      </div>
    </div>
  );
}
