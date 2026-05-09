import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";

export default async function OrdersPage() {
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

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track all orders
          </p>
        </div>

        {canPlaceOrder && (
          <div className="flex gap-2">
            <Link
              href="/orders/new-single"
              className={buttonVariants({ className: "gap-2 bg-sfx-red hover:bg-sfx-red/90 text-white" })}
            >
              <Plus className="h-4 w-4" />
              Single order
            </Link>
            <Link
              href="/orders/new-bulk"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Plus className="h-4 w-4" />
              Bulk order
            </Link>
          </div>
        )}
      </div>

      {/* Placeholder — full list built in Phase 8 */}
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">Order list coming in Phase 8</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use the buttons above to place orders. Orders appear on the chef dashboard immediately.
        </p>
      </div>
    </div>
  );
}
