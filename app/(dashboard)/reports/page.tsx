"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subDays, startOfDay, format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, ShoppingBag, BarChart2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "today" | "7d" | "30d";

const PERIOD_OPTIONS: { label: string; shortLabel: string; value: Period }[] = [
  { label: "Today",        shortLabel: "Today", value: "today" },
  { label: "Last 7 days",  shortLabel: "7 days",  value: "7d"    },
  { label: "Last 30 days", shortLabel: "30 days", value: "30d"   },
];

interface DayStat { date: string; revenue: number; count: number }
interface TopItem  { name: string; qty: number; revenue: number }

interface ReportData {
  totalOrders:   number;
  totalRevenue:  number;
  avgOrder:      number;
  cancelled:     number;
  singleCount:   number;
  singleRevenue: number;
  bulkCount:     number;
  bulkRevenue:   number;
  byDay:         DayStat[];
  topItems:      TopItem[];
}

function getRangeStart(period: Period): Date {
  const now = new Date();
  if (period === "today") return startOfDay(now);
  if (period === "7d")    return startOfDay(subDays(now, 6));
  return startOfDay(subDays(now, 29));
}

function dayLabel(isoDate: string, period: Period): string {
  const d = parseISO(isoDate + "T00:00:00");
  if (period === "7d") return format(d, "EEE d");
  return format(d, "dd MMM");
}

export default function ReportsPage() {
  const router = useRouter();
  const [period,     setPeriod]     = useState<Period>("7d");
  const [data,       setData]       = useState<ReportData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setFetchError(null);

    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if ((profile as { role: string } | null)?.role !== "admin") {
      router.replace("/orders");
      return;
    }

    const fromISO = getRangeStart(p).toISOString();

    const [ordersRes, cancelledRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_type, total_amount, created_at")
        .gte("created_at", fromISO)
        .neq("status", "cancelled"),
      supabase
        .from("orders")
        .select("id")
        .gte("created_at", fromISO)
        .eq("status", "cancelled"),
    ]);

    if (ordersRes.error || cancelledRes.error) {
      setFetchError("Failed to load report data. Please refresh.");
      setLoading(false);
      return;
    }

    const orders    = (ordersRes.data    ?? []) as Array<{ id: string; order_type: "single" | "bulk"; total_amount: number; created_at: string }>;
    const cancelled = (cancelledRes.data ?? []) as Array<{ id: string }>;

    // Fetch items only when there are orders to avoid an empty IN clause
    let itemRows: { menu_item_name: string; quantity: number; unit_price: number }[] = [];
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("menu_item_name, quantity, unit_price")
        .in("order_id", orderIds);
      if (itemsErr) { setFetchError("Failed to load item data."); setLoading(false); return; }
      itemRows = (items ?? []) as typeof itemRows;
    }

    // KPIs
    const totalOrders  = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const singles = orders.filter((o) => o.order_type === "single");
    const bulks   = orders.filter((o) => o.order_type === "bulk");

    // Revenue by day — pre-seed all days with zeros so empty days still render on chart
    const dayMap = new Map<string, { revenue: number; count: number }>();
    const from   = getRangeStart(p);
    const today  = new Date();
    const cursor = new Date(from);
    while (cursor <= today) {
      dayMap.set(format(cursor, "yyyy-MM-dd"), { revenue: 0, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const order of orders) {
      const day = order.created_at.slice(0, 10);
      const cur = dayMap.get(day) ?? { revenue: 0, count: 0 };
      dayMap.set(day, { revenue: cur.revenue + Number(order.total_amount), count: cur.count + 1 });
    }
    const byDay: DayStat[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, vals]) => ({ date: dayLabel(iso, p), revenue: vals.revenue, count: vals.count }));

    // Top sellers
    const sellerMap = new Map<string, { qty: number; revenue: number }>();
    for (const item of itemRows) {
      const cur = sellerMap.get(item.menu_item_name) ?? { qty: 0, revenue: 0 };
      sellerMap.set(item.menu_item_name, {
        qty:     cur.qty + item.quantity,
        revenue: cur.revenue + Number(item.unit_price) * item.quantity,
      });
    }
    const topItems: TopItem[] = Array.from(sellerMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    setData({
      totalOrders, totalRevenue, avgOrder,
      cancelled: cancelled.length,
      singleCount: singles.length,
      singleRevenue: singles.reduce((s, o) => s + Number(o.total_amount), 0),
      bulkCount: bulks.length,
      bulkRevenue: bulks.reduce((s, o) => s + Number(o.total_amount), 0),
      byDay, topItems,
    });
    setLoading(false);
  }, [router]);

  useEffect(() => { load(period); }, [period, load]);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-sidebar-border px-6 h-[60px] flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                period === opt.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Shorter labels prevent header overflow at 320px */}
              <span className="sm:hidden">{opt.shortLabel}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fetchError ? (
        <div className="flex items-center justify-center py-32">
          <p className="text-sm text-destructive">{fetchError}</p>
        </div>
      ) : data ? (
        <div className="px-6 py-6 space-y-8">

          {/* KPI cards */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Total Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-3xl font-bold text-foreground">{data.totalOrders}</p>
                  <p className="text-xs text-muted-foreground mt-1">Excludes cancelled</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-3xl font-bold text-sfx-red">{formatTL(data.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Non-cancelled orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" /> Avg Order Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-3xl font-bold text-foreground">
                    {formatTL(Math.round(data.avgOrder))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Per order</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Cancelled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn(
                    "font-mono text-3xl font-bold",
                    data.cancelled > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {data.cancelled}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Excluded from revenue</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Revenue chart */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-4">Revenue by Day</h2>
            <Card>
              <CardContent className="pt-6">
                {data.byDay.every((d) => d.revenue === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No revenue in this period.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.byDay} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const revenue = payload[0]?.value as number;
                          const count   = (payload[0]?.payload as DayStat).count;
                          return (
                            <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                              <p className="font-medium text-foreground mb-1">{label}</p>
                              <p className="font-mono text-sfx-red font-semibold">{formatTL(revenue)}</p>
                              <p className="text-muted-foreground">{count} order{count !== 1 ? "s" : ""}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="revenue" fill="var(--sfx-red)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Order type split */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-4">Order Type Split</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Single Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-bold text-foreground">{data.singleCount}</p>
                  <p className="font-mono text-sm font-semibold text-sfx-amber mt-1">{formatTL(data.singleRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">SFX-S- prefix</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bulk Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-bold text-foreground">{data.bulkCount}</p>
                  <p className="font-mono text-sm font-semibold text-muted-foreground mt-1">{formatTL(data.bulkRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">SFX-B- prefix</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Top sellers */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-4">Top Sellers</h2>
            <Card className="overflow-hidden">
              {data.topItems.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No sales data in this period.</p>
                </CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-sidebar-border hover:bg-transparent">
                      <TableHead className="w-10 px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                        #
                      </TableHead>
                      <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                        Item
                      </TableHead>
                      <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9 text-right">
                        Qty
                      </TableHead>
                      <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9 text-right">
                        Revenue
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topItems.map((item, idx) => (
                      <TableRow key={item.name} className="border-border">
                        <TableCell className="px-6 font-mono text-xs text-muted-foreground w-10">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="px-6 text-sm text-foreground max-w-[220px] truncate">
                          {item.name}
                        </TableCell>
                        <TableCell className="px-6 font-mono text-xs text-muted-foreground text-right">
                          ×{item.qty}
                        </TableCell>
                        <TableCell className="px-6 font-mono text-sm font-semibold text-foreground text-right">
                          {formatTL(item.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </section>

        </div>
      ) : null}
    </div>
  );
}
