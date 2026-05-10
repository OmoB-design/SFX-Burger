"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_META } from "@/types/domain";
import { formatTL } from "@/lib/format";
import type { OrderRow } from "@/types/database.types";
import type { OrderStatus } from "@/types/domain";

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap",
        status === "placed" && "bg-sfx-amber/15 text-sfx-amber",
        status === "ready" && "bg-sfx-green/15 text-sfx-green",
        status === "delivered" && "bg-muted text-muted-foreground",
        status === "cancelled" && "bg-destructive/10 text-destructive"
      )}
    >
      {STATUS_META[status].label}
    </span>
  );
}

interface DashboardTablesProps {
  staleOrders: OrderRow[];
  recentOrders: OrderRow[];
}

export function DashboardTables({ staleOrders, recentOrders }: DashboardTablesProps) {
  const router = useRouter();

  return (
    <>
      {/* Needs Attention */}
      {staleOrders.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-sfx-amber" />
              Needs Attention
            </h2>
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded-full bg-sfx-amber/15 text-sfx-amber">
              {staleOrders.length}
            </span>
          </div>
          <Card className="border-sfx-amber/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-sidebar-border hover:bg-transparent">
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Order
                  </TableHead>
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Customer
                  </TableHead>
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Waiting
                  </TableHead>
                  <TableHead className="px-6 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staleOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer border-border"
                    onClick={() => router.push(`/orders?expand=${order.id}`)}
                  >
                    <TableCell className="px-6 font-mono text-sm font-semibold text-sfx-amber">
                      {order.seq_number}
                    </TableCell>
                    <TableCell className="px-6 text-sm text-foreground max-w-[180px] truncate">
                      {order.customer_name}
                    </TableCell>
                    <TableCell className="px-6 text-xs text-sfx-amber font-medium">
                      {formatDistanceToNow(parseISO(order.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="px-6 text-right font-mono text-sm font-semibold text-foreground">
                      {formatTL(order.total_amount ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Recent Orders */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Recent Orders</h2>
        <Card className="overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-sidebar-border hover:bg-transparent">
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Order
                  </TableHead>
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Customer
                  </TableHead>
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Status
                  </TableHead>
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Total
                  </TableHead>
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground h-9">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer border-border"
                    onClick={() => router.push(`/orders?expand=${order.id}`)}
                  >
                    <TableCell className="px-6 font-mono text-sm font-semibold text-foreground">
                      {order.seq_number}
                    </TableCell>
                    <TableCell className="px-6 text-sm text-foreground max-w-[180px] truncate">
                      {order.customer_name}
                    </TableCell>
                    <TableCell className="px-6">
                      <StatusBadge status={order.status as OrderStatus} />
                    </TableCell>
                    <TableCell className="px-6 font-mono text-sm font-semibold text-foreground">
                      {formatTL(order.total_amount ?? 0)}
                    </TableCell>
                    <TableCell className="px-6 text-xs text-muted-foreground">
                      {format(parseISO(order.created_at), "dd MMM, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </>
  );
}
