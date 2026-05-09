import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuItemsClient } from "@/components/menu/MenuItemsClient";
import { MenuItemDialog } from "@/components/menu/MenuItemDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // PRD §3 — only admin may manage the menu
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { role: string } | null;
  if (profile?.role !== "admin") redirect("/orders");

  const { data: items, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("category")
    .order("display_order")
    .order("created_at");

  if (error) console.error("[MenuPage] fetch error", error);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Menu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items?.length ?? 0} items across all categories
          </p>
        </div>
        <MenuItemDialog
          trigger={
            <Button className="gap-2 bg-sfx-red hover:bg-sfx-red/90 text-white">
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          }
        />
      </div>

      {/* Grid grouped by category */}
      <MenuItemsClient items={items ?? []} />
    </div>
  );
}
