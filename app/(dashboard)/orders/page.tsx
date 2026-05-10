import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { OrdersTable } from "@/components/orders/OrdersTable";
import type { Order } from "@/types/domain";
import type { OrderRow, OrderItemRow } from "@/types/database.types";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { expand?: string };
}) {
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
  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/chef");

  const canPlaceOrder = ["admin", "staff"].includes(profile.role);

  // Fetch the most recent 200 orders — keeps initial payload bounded at scale.
  // Real-time subscription in OrdersTable handles live inserts on top of this set.
  const PAGE_SIZE = 200;
  const { data: ordersData, count: totalCount, error } = await supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) console.error("[OrdersPage] fetch error", error);

  const orderRows = (ordersData as OrderRow[]) ?? [];

  // Batch-fetch all items in one query
  const orderIds = orderRows.map((o) => o.id);
  const { data: itemsData } = orderIds.length > 0
    ? await supabase.from("order_items").select("*").in("order_id", orderIds)
    : { data: [] };

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  ((itemsData as OrderItemRow[]) ?? []).forEach((item) => {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  });

  const seedOrders: Order[] = orderRows.map((row) => ({
    ...row,
    items: itemsByOrder.get(row.id) ?? [],
  }));

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-sidebar-border px-6 h-[60px] flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Orders</h1>

        {canPlaceOrder && (
          <div className="flex gap-2">
            <Link
              href="/orders/new-single"
              className={buttonVariants({ className: "gap-2 bg-sfx-red hover:bg-sfx-red/90 text-white" })}
            >
              <Plus className="h-4 w-4" />
              {/* Show abbreviated label at 320px to prevent header overflow */}
              <span>Single<span className="hidden sm:inline"> order</span></span>
            </Link>
            <Link
              href="/orders/new-bulk"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Plus className="h-4 w-4" />
              <span>Bulk<span className="hidden sm:inline"> order</span></span>
            </Link>
          </div>
        )}
      </div>

      <OrdersTable
        seedOrders={seedOrders}
        totalCount={totalCount ?? orderRows.length}
        userRole={profile.role}
        initialExpandId={searchParams.expand}
      />
    </div>
  );
}
