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
    <div>
      {/* Sticky header with bottom stroke */}
      <div className="sticky top-0 z-10 bg-background border-b border-sidebar-border px-6 h-[60px] flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Menu</h1>
        <MenuItemDialog
          trigger={
            <Button className="gap-2 bg-sfx-red hover:bg-sfx-red/90 text-white">
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          }
        />
      </div>

      {/* Content — 100px below header */}
      <div className="px-6 pt-[100px] pb-6">
        <div className="max-w-2xl mx-auto">
          <MenuItemsClient items={items ?? []} />
        </div>
      </div>
    </div>
  );
}
