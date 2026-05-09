import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewSingleOrderForm } from "@/components/orders/NewSingleOrderForm";

export default async function NewSingleOrderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // PRD §3 — staff and admin may place orders
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { role: string } | null;
  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/orders");

  // Fetch only active menu items — the form shows what can actually be ordered
  const { data: menuItems, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("display_order")
    .order("created_at");

  if (error) console.error("[NewSingleOrderPage] menu fetch error", error);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/orders"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">New Single Order</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Walk-in or call-in — fulfilled today
          </p>
        </div>
      </div>

      <NewSingleOrderForm menuItems={menuItems ?? []} />
    </div>
  );
}
