"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { menuItemSchema } from "@/lib/schemas/menu";
import type { Database } from "@/types/database.types";

type MenuInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
type MenuUpdate = Database["public"]["Tables"]["menu_items"]["Update"];

export type MenuActionState = { error: string | null; success?: boolean };

// ── Admin guard ────────────────────────────────────────────────────────
async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: string } | null;
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return supabase;
}

// ── Add or Update (id hidden field → update; absent → insert) ──────────
export async function saveMenuItemAction(
  _prevState: MenuActionState,
  formData: FormData
): Promise<MenuActionState> {
  try {
    const supabase = await getAdminClient();

    const parsed = menuItemSchema.safeParse({
      name:     formData.get("name"),
      category: formData.get("category"),
      price:    formData.get("price"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const id = (formData.get("id") as string | null) || null;

    if (id) {
      const updateData: MenuUpdate = {
        name: parsed.data.name,
        category: parsed.data.category,
        price: parsed.data.price,
      };
      const { error } = await supabase.from("menu_items").update(updateData as never).eq("id", id);
      if (error) throw error;
    } else {
      const insertData: MenuInsert = {
        name: parsed.data.name,
        category: parsed.data.category,
        price: parsed.data.price,
      };
      const { error } = await supabase.from("menu_items").insert(insertData as never);
      if (error) throw error;
    }

    revalidatePath("/menu");
    return { error: null, success: true };
  } catch (err) {
    console.error("[saveMenuItemAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Delete ─────────────────────────────────────────────────────────────
export async function deleteMenuItemAction(id: string): Promise<void> {
  try {
    const supabase = await getAdminClient();
    await supabase.from("menu_items").delete().eq("id", id);
    revalidatePath("/menu");
  } catch (err) {
    console.error("[deleteMenuItemAction]", err);
  }
}

// ── Toggle active / inactive ───────────────────────────────────────────
export async function toggleMenuItemAction(id: string, isActive: boolean): Promise<void> {
  try {
    const supabase = await getAdminClient();
    await supabase.from("menu_items").update({ is_active: isActive } as never).eq("id", id);
    revalidatePath("/menu");
  } catch (err) {
    console.error("[toggleMenuItemAction]", err);
  }
}
