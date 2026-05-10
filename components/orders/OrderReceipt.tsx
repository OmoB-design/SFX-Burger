"use client";

import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types/domain";
import { STATUS_META } from "@/types/domain";
import { formatTL } from "@/lib/format";

interface OrderReceiptProps {
  order: Order;
}

export function OrderReceipt({ order }: OrderReceiptProps) {
  const createdAt = parseISO(order.created_at);
  const statusMeta = STATUS_META[order.status];

  return (
    <div className="min-h-screen bg-muted/30 print:bg-sfx-cream print:min-h-0">
      {/* Screen-only controls bar */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b border-sidebar-border px-6 py-4 flex items-center gap-3">
        <Link
          href="/orders"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex-1 text-sm font-medium text-foreground">
          {order.seq_number}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      {/* Receipt paper — centered on screen, full-bleed on print */}
      <div className="py-8 px-4 flex justify-center print:block print:p-0">
        <div className="w-full max-w-[360px] bg-sfx-cream rounded-xl overflow-hidden shadow-sm print:shadow-none print:rounded-none print:max-w-none">

          {/* Letterhead */}
          <div className="px-6 pt-6 pb-5 text-center border-b border-sfx-charcoal/10">
            <Image
              src="/logo-primary.svg"
              alt="SFx Burger"
              width={52}
              height={52}
              className="mx-auto mb-2.5"
            />
            <p className="text-[10px] tracking-[0.25em] uppercase font-medium text-sfx-charcoal/50">
              Unique Taste Everyday
            </p>
          </div>

          {/* Receipt type + sequence number */}
          <div className="px-6 py-4 text-center border-b border-dashed border-sfx-charcoal/20">
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-sfx-charcoal/40 mb-1">
              Receipt
            </p>
            <p className="font-mono text-2xl font-bold text-sfx-charcoal">
              {order.seq_number}
            </p>
          </div>

          {/* Order metadata */}
          <div className="px-6 py-4 space-y-2.5 border-b border-dashed border-sfx-charcoal/20">
            <MetaRow label="Customer" value={order.customer_name} />
            {order.customer_phone && (
              <MetaRow label="Phone" value={order.customer_phone} />
            )}
            <MetaRow label="Date" value={format(createdAt, "dd MMM yyyy, HH:mm")} />
            <MetaRow label="Status" value={statusMeta.label} />
            {order.order_type === "bulk" && order.scheduled_date && (
              <MetaRow
                label="Scheduled"
                value={format(parseISO(order.scheduled_date), "EEE, dd MMM yyyy")}
              />
            )}
            {order.fulfillment_type === "delivery" && order.delivery_address ? (
              <MetaRow label="Deliver to" value={order.delivery_address} />
            ) : order.fulfillment_type === "pickup" ? (
              <MetaRow label="Fulfillment" value="Pickup" />
            ) : null}
          </div>

          {/* Line items */}
          <div className="px-6 py-4 border-b border-dashed border-sfx-charcoal/20 space-y-2.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="text-sfx-charcoal font-medium">{item.menu_item_name}</span>
                  <span className="font-mono text-sfx-charcoal/50 ml-1 text-xs">
                    × {item.quantity}
                  </span>
                </div>
                <span className="font-mono text-sfx-charcoal flex-shrink-0">
                  {formatTL(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-6 py-4 border-b border-dashed border-sfx-charcoal/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-sfx-charcoal">Total</span>
              <span className="font-mono text-lg font-bold text-sfx-red">
                {formatTL(order.total_amount)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="px-6 py-3 border-b border-dashed border-sfx-charcoal/20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sfx-charcoal/40 mb-1">
                Notes
              </p>
              <p className="text-sm text-sfx-charcoal">{order.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-5 text-center">
            <p className="text-xs text-sfx-charcoal/50 mb-1">Thank you for your order!</p>
            <p className="text-xs font-mono text-sfx-charcoal/60">+90 533 841 09 38</p>
          </div>

        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-sfx-charcoal/50 flex-shrink-0">{label}</span>
      <span className="text-sfx-charcoal text-right">{value}</span>
    </div>
  );
}
