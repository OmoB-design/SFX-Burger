import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { ChefBoard } from "@/components/chef/ChefBoard";
import type { Order } from "@/types/domain";
import type { OrderRow, OrderItemRow } from "@/types/database.types";

export default async function ChefPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { role: string } | null;
  // PRD §3 — chef and admin (and staff via admin access) see the kitchen
  if (!profile || !["admin", "staff", "chef"].includes(profile.role)) redirect("/orders");

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch active single orders (not yet delivered/cancelled)
  const { data: singleData, error: singleErr } = await supabase
    .from("orders")
    .select("*")
    .eq("order_type", "single")
    .in("status", ["placed", "ready"])
    .order("created_at", { ascending: true });

  if (singleErr) console.error("[ChefPage] single orders fetch error", singleErr);

  // Fetch today's active bulk orders — PRD §9, §14
  const { data: bulkData, error: bulkErr } = await supabase
    .from("orders")
    .select("*")
    .eq("order_type", "bulk")
    .eq("scheduled_date", today)
    .in("status", ["placed", "ready"])
    .order("created_at", { ascending: true });

  if (bulkErr) console.error("[ChefPage] bulk orders fetch error", bulkErr);

  const allOrderRows = [
    ...((singleData as OrderRow[]) ?? []),
    ...((bulkData   as OrderRow[]) ?? []),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Fetch items for all orders in one query
  const orderIds = allOrderRows.map((o) => o.id);
  const { data: itemsData } = orderIds.length > 0
    ? await supabase.from("order_items").select("*").in("order_id", orderIds)
    : { data: [] };

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  ((itemsData as OrderItemRow[]) ?? []).forEach((item) => {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  });

  const seedOrders: Order[] = allOrderRows.map((row) => ({
    ...row,
    items: itemsByOrder.get(row.id) ?? [],
  }));

  return <ChefBoard seedOrders={seedOrders} today={today} />;
}
