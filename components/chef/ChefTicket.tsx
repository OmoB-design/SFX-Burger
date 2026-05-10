"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types/domain";

interface ChefTicketProps {
  order: Order;
  isNew: boolean;
  onMarkReady: (id: string) => void;
  isPending: boolean;
}

export function ChefTicket({ order, isNew, onMarkReady, isPending }: ChefTicketProps) {
  const isReady  = order.status === "ready";
  const flashRef = useRef<HTMLDivElement>(null);
  const [flashed, setFlashed] = useState(false);

  useEffect(() => {
    if (isNew && !flashed && flashRef.current) {
      flashRef.current.classList.add("chef-ticket-flash");
      const timer = setTimeout(() => {
        flashRef.current?.classList.remove("chef-ticket-flash");
        setFlashed(true);
      }, 2100);
      return () => clearTimeout(timer);
    }
  }, [isNew, flashed]);

  return (
    <div ref={flashRef} className="rounded-xl">
      <Card className={cn(
        "gap-0 py-0 transition-opacity duration-300",
        isReady ? "ring-sfx-green/40 opacity-60" : "ring-sfx-amber/40"
      )}>
        {/* Status colour strip */}
        <div className={cn(
          "flex items-center justify-between gap-2 px-4 py-3 border-b rounded-t-xl",
          isReady ? "bg-sfx-green/10 border-sfx-green/20" : "bg-sfx-amber/10 border-sfx-amber/20"
        )}>
          <span className="font-mono text-base font-bold text-foreground tracking-wide">
            {order.seq_number}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full",
              order.fulfillment_type === "delivery"
                ? "bg-foreground/10 text-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {order.fulfillment_type ?? "pickup"}
            </span>
            {order.order_type === "bulk" && (
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                bulk
              </span>
            )}
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full",
              isReady
                ? "bg-sfx-green/20 text-sfx-green"
                : "bg-sfx-amber/20 text-sfx-amber"
            )}>
              {isReady ? "Ready" : "Placed"}
            </span>
          </div>
        </div>

        {/* Customer + items + notes */}
        <div className="px-4 pt-3 pb-3 space-y-3">
          <div>
            <p className="text-lg font-semibold text-foreground leading-tight">{order.customer_name}</p>
            {order.fulfillment_type === "delivery" && order.delivery_address && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{order.delivery_address}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="h-px bg-border" />
            {order.items.map((item) => (
              <div key={item.id} className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{item.menu_item_name}</span>
                <span className="font-mono text-sm font-bold text-foreground flex-shrink-0">×{item.quantity}</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="px-3 py-2 rounded-lg bg-muted/60 border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Mark Ready or Ready footer */}
        {!isReady ? (
          <Button
            onClick={() => onMarkReady(order.id)}
            disabled={isPending}
            className="w-full rounded-t-none rounded-b-xl h-12 text-sm font-bold uppercase tracking-widest gap-2"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
              : <><CheckCircle2 className="h-4 w-4" /> Mark Ready</>}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-sfx-green/20 bg-sfx-green/10 rounded-b-xl">
            <CheckCircle2 className="h-4 w-4 text-sfx-green" />
            <span className="text-sm font-semibold text-sfx-green">Ready for pickup</span>
          </div>
        )}
      </Card>
    </div>
  );
}
