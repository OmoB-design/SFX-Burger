"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, CheckCircle2, X, Search, Printer, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markOrderDeliveredAction, cancelOrderAction } from "@/lib/actions/orders";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types/domain";
import type { OrderRow, OrderItemRow } from "@/types/database.types";
import { STATUS_META } from "@/types/domain";

const STATUS_FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All",       value: "all"       },
  { label: "Placed",    value: "placed"    },
  { label: "Ready",     value: "ready"     },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

interface OrdersTableProps {
  seedOrders: Order[];
  userRole: string;
}

export function OrdersTable({ seedOrders, userRole }: OrdersTableProps) {
  const [orders,      setOrders]      = useState<Order[]>(seedOrders);
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [typeFilter,  setTypeFilter]  = useState<"all" | "single" | "bulk">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pendingIds,  setPendingIds]  = useState<Set<string>>(new Set());

  const isAdmin    = userRole === "admin";
  const canDeliver = ["admin", "staff"].includes(userRole);

  // Real-time subscription — keep the list in sync across sessions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as OrderRow;
            const { data: items } = await supabase
              .from("order_items")
              .select("*")
              .eq("order_id", row.id);
            const fullOrder: Order = { ...row, items: (items as OrderItemRow[]) ?? [] };
            setOrders((prev) => [fullOrder, ...prev]);
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as OrderRow;
            setOrders((prev) => prev.map((o) => (o.id === row.id ? { ...o, ...row } : o)));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDeliver = useCallback(async (orderId: string) => {
    setPendingIds((prev) => new Set(Array.from(prev).concat(orderId)));
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" as const } : o)));

    const result = await markOrderDeliveredAction(orderId);
    setPendingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });

    if (result.error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "ready" as const } : o)));
      toast.error(result.error);
    }
  }, []);

  const handleCancel = useCallback(async (orderId: string, prevStatus: OrderStatus) => {
    setPendingIds((prev) => new Set(Array.from(prev).concat(orderId)));
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o)));

    const result = await cancelOrderAction(orderId);
    setPendingIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });

    if (result.error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: prevStatus } : o)));
      toast.error(result.error);
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Apply filters
  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (typeFilter   !== "all" && o.order_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.customer_name.toLowerCase().includes(q) && !o.seq_number.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-sidebar-border flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Name or order no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="h-4 w-px bg-border mx-0.5" />
          {(["all", "single", "bulk"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                typeFilter === t
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
          <p className="text-sm font-medium text-foreground">No orders found</p>
          <p className="text-xs text-muted-foreground">
            {search || statusFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters."
              : "No orders have been placed yet."}
          </p>
        </div>
      ) : (
        <div>
          {/* Column header — desktop only */}
          <div className="hidden sm:grid grid-cols-[16px_1fr_1fr_148px_110px_96px_148px] gap-4 px-6 py-2.5 border-b border-sidebar-border text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            <span />
            <span>Order</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Date</span>
            <span>Total</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((order) => {
              const isExpanded = expandedIds.has(order.id);
              const isPending  = pendingIds.has(order.id);
              const sm         = STATUS_META[order.status];

              return (
                <div key={order.id}>
                  {/* Row */}
                  <div
                    className="px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors sm:grid sm:grid-cols-[16px_1fr_1fr_148px_110px_96px_148px]"
                    onClick={() => toggleExpand(order.id)}
                  >
                    {/* Chevron */}
                    <span className="w-4 flex-shrink-0">
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </span>

                    {/* Seq + type badge */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-semibold text-foreground">{order.seq_number}</span>
                      {order.order_type === "bulk" && (
                        <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          bulk
                        </span>
                      )}
                    </div>

                    {/* Customer */}
                    <div className="min-w-0 hidden sm:block">
                      <p className="text-sm text-foreground truncate">{order.customer_name}</p>
                      {order.fulfillment_type === "delivery" && order.delivery_address && (
                        <p className="text-xs text-muted-foreground truncate">{order.delivery_address}</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={cn(
                      "hidden sm:inline-flex w-fit self-center items-center text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap",
                      order.status === "placed"    && "bg-sfx-amber/15 text-sfx-amber",
                      order.status === "ready"     && "bg-sfx-green/15 text-sfx-green",
                      order.status === "delivered" && "bg-muted text-muted-foreground",
                      order.status === "cancelled" && "bg-destructive/10 text-destructive",
                    )}>
                      {sm.label}
                    </span>

                    {/* Date */}
                    <span className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(order.created_at), "dd MMM, HH:mm")}
                    </span>

                    {/* Total */}
                    <span className="hidden sm:block font-mono text-sm font-semibold text-foreground whitespace-nowrap">
                      {order.total_amount.toLocaleString("tr-TR")} TL
                    </span>

                    {/* Actions — stop propagation so clicks don't toggle expand */}
                    <div
                      className="flex items-center justify-end gap-1.5 flex-shrink-0 ml-auto sm:ml-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canDeliver && order.status === "ready" && (
                        <Button
                          size="xs"
                          onClick={() => handleDeliver(order.id)}
                          disabled={isPending}
                          className="gap-1"
                        >
                          {isPending
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle2 className="h-3 w-3" />}
                          <span className="hidden sm:inline">Deliver</span>
                        </Button>
                      )}
                      {isAdmin && (order.status === "placed" || order.status === "ready") && (
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => handleCancel(order.id, order.status)}
                          disabled={isPending}
                          className="gap-1"
                        >
                          {isPending
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <X className="h-3 w-3" />}
                          <span className="hidden sm:inline">Cancel</span>
                        </Button>
                      )}
                      <Link
                        href={`/orders/${order.id}/receipt`}
                        className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="View receipt"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-muted/20 border-t border-dashed border-border">
                      <div className="pl-7 pt-3 space-y-2.5">
                        {/* Mobile: show customer + status here */}
                        <div className="sm:hidden mb-3">
                          <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                          {order.fulfillment_type === "delivery" && order.delivery_address && (
                            <p className="text-xs text-muted-foreground">{order.delivery_address}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={cn(
                              "inline-flex text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full",
                              order.status === "placed"    && "bg-sfx-amber/15 text-sfx-amber",
                              order.status === "ready"     && "bg-sfx-green/15 text-sfx-green",
                              order.status === "delivered" && "bg-muted text-muted-foreground",
                              order.status === "cancelled" && "bg-destructive/10 text-destructive",
                            )}>
                              {sm.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(order.created_at), "dd MMM, HH:mm")}
                            </span>
                          </div>
                        </div>

                        {/* Items list */}
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                            <span className="text-foreground">
                              {item.menu_item_name}
                              <span className="font-mono text-muted-foreground ml-1.5 text-xs">×{item.quantity}</span>
                            </span>
                            <span className="font-mono text-foreground flex-shrink-0">
                              {(item.unit_price * item.quantity).toLocaleString("tr-TR")} TL
                            </span>
                          </div>
                        ))}

                        {order.notes && (
                          <p className="text-xs text-muted-foreground pt-2 border-t border-dashed border-border">
                            Note: {order.notes}
                          </p>
                        )}

                        {/* Footer row: date + bulk schedule + total */}
                        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                          <span>
                            {format(parseISO(order.created_at), "EEE dd MMM yyyy · HH:mm")}
                            {order.order_type === "bulk" && order.scheduled_date && (
                              <> · Scheduled {format(parseISO(order.scheduled_date), "dd MMM yyyy")}</>
                            )}
                          </span>
                          <span className="font-mono font-semibold text-sm text-foreground">
                            {order.total_amount.toLocaleString("tr-TR")} TL
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="px-6 py-3 border-t border-sidebar-border text-xs text-muted-foreground">
            Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
