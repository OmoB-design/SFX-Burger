"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, ChefHat } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { markOrderReadyAction } from "@/lib/actions/orders";
import { ChefTicket } from "@/components/chef/ChefTicket";
import { toast } from "sonner";
import type { Order } from "@/types/domain";
import type { OrderRow, OrderItemRow } from "@/types/database.types";

interface ChefBoardProps {
  seedOrders: Order[];
  today: string; // YYYY-MM-DD
}

// Brief "new order" alert tone via Web Audio API
function playNewOrderSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx  = new Ctx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* audio not available */ }
}

export function ChefBoard({ seedOrders, today }: ChefBoardProps) {
  const [orders, setOrders]         = useState<Order[]>(seedOrders);
  const [newIds, setNewIds]         = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn]       = useState(true);
  const soundRef                    = useRef(soundOn);
  soundRef.current = soundOn;

  // Supabase Realtime — subscribe to all order changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("chef-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as OrderRow;
            // Only show single orders and today's bulk orders
            const isSingle    = row.order_type === "single";
            const isTodayBulk = row.order_type === "bulk" && row.scheduled_date === today;
            if (!isSingle && !isTodayBulk) return;

            // Fetch items for this order
            const { data: items } = await supabase
              .from("order_items")
              .select("*")
              .eq("order_id", row.id);

            const fullOrder: Order = { ...row, items: (items as OrderItemRow[]) ?? [] };
            setOrders((prev) => [...prev, fullOrder].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ));
            setNewIds((prev) => new Set(Array.from(prev).concat(row.id)));
            if (soundRef.current) playNewOrderSound();
          }

          if (payload.eventType === "UPDATE") {
            const row = payload.new as OrderRow;
            if (row.status === "delivered" || row.status === "cancelled") {
              // Remove from board once delivered or cancelled
              setOrders((prev) => prev.filter((o) => o.id !== row.id));
            } else {
              // Update status in place (e.g. placed → ready)
              setOrders((prev) =>
                prev.map((o) => (o.id === row.id ? { ...o, ...row } : o))
              );
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [today]);

  const handleMarkReady = useCallback(async (orderId: string) => {
    // Optimistic update
    setPendingIds((prev) => new Set(Array.from(prev).concat(orderId)));
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "ready" as const } : o))
    );

    const result = await markOrderReadyAction(orderId);

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });

    if (result.error) {
      // Revert optimistic update on failure
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "placed" as const } : o))
      );
      toast.error(result.error);
    }
  }, []);

  const activeOrders = orders.filter((o) => o.status === "placed");
  const readyOrders  = orders.filter((o) => o.status === "ready");
  const now          = format(new Date(), "EEE dd MMM");

  return (
    <div className="flex flex-col h-full">
      {/* Kitchen header */}
      <div className="sticky top-0 z-10 bg-background border-b border-sidebar-border px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ChefHat className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">Kitchen</h1>
            <p className="text-xs text-muted-foreground font-mono">{now}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live status counts */}
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sfx-amber" />
              <span className="font-mono font-semibold text-foreground">{activeOrders.length}</span>
              <span className="text-muted-foreground">active</span>
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sfx-green" />
              <span className="font-mono font-semibold text-foreground">{readyOrders.length}</span>
              <span className="text-muted-foreground">ready</span>
            </span>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={soundOn ? "Mute new order sound" : "Enable new order sound"}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 px-6 pt-8 pb-6 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
            <span className="text-4xl">🎉</span>
            <p className="text-base font-semibold text-foreground">Kitchen is clear</p>
            <p className="text-sm text-muted-foreground">No active orders right now.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active orders */}
            {activeOrders.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-sfx-amber mb-4">
                  In Progress · {activeOrders.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOrders.map((order) => (
                    <ChefTicket
                      key={order.id}
                      order={order}
                      isNew={newIds.has(order.id)}
                      onMarkReady={handleMarkReady}
                      isPending={pendingIds.has(order.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Ready orders */}
            {readyOrders.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-sfx-green mb-4">
                  Ready · {readyOrders.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyOrders.map((order) => (
                    <ChefTicket
                      key={order.id}
                      order={order}
                      isNew={false}
                      onMarkReady={handleMarkReady}
                      isPending={pendingIds.has(order.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
