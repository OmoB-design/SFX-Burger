"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { singleOrderSchema, bulkOrderSchema } from "@/lib/schemas/order";
import type { CartItem } from "@/types/domain";

type SupabaseUserClient = Awaited<ReturnType<typeof createClient>>;

// Typed wrapper for calling RPC functions not yet present in the generated Database types.
// Uses unknown + narrowing instead of `any` or `Function`.
type UntypedRpc = (
  fn: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

// ── Role guard — staff or admin may place orders ───────────────────────────
async function getOrderingClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: string } | null;
  if (!profile || !["admin", "staff"].includes(profile.role)) {
    throw new Error("Forbidden");
  }
  return { supabase, userId: user.id };
}

// ── Fetch verified prices from DB ──────────────────────────────────────────
// Re-fetches each item's price from menu_items so the server is always
// the source of truth. Rejects carts that contain inactive/deleted items.
async function buildPriceMap(supabase: SupabaseUserClient, cart: CartItem[]) {
  const menuItemIds = cart.map((i) => i.menuItemId);
  const { data: menuRows, error } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .in("id", menuItemIds)
    .eq("is_active", true);

  if (error) throw error;

  const map = new Map(
    ((menuRows ?? []) as Array<{ id: string; name: string; price: number }>).map((m) => [
      m.id,
      { price: Number(m.price), name: m.name },
    ])
  );

  const unavailable = cart.filter((i) => !map.has(i.menuItemId));
  if (unavailable.length > 0) {
    throw new Error(
      `Some items are no longer available: ${unavailable.map((i) => i.name).join(", ")}`
    );
  }

  return map;
}

export type OrderActionResult = { error: string | null; orderId?: string };

// ── Place a single order ───────────────────────────────────────────────────
// Delegates to the atomic place_order() Postgres function (migration 0003) so
// sequence generation + order insert + items insert are one transaction.
// A failure at any step rolls everything back — no orphaned orders or wasted
// sequence numbers.
export async function placeSingleOrderAction(payload: {
  customer_name: string;
  customer_phone?: string;
  fulfillment_type: "pickup" | "delivery";
  delivery_address?: string;
  notes?: string;
  cart: CartItem[];
}): Promise<OrderActionResult> {
  try {
    const { supabase, userId } = await getOrderingClient();

    const parsed = singleOrderSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path?.join(".") ?? "unknown";
      const msg = issue?.message ?? "Validation failed";
      console.error("[placeSingleOrderAction] validation error", parsed.error.issues);
      return { error: `${msg} (field: ${field})` };
    }

    const { cart, ...fields } = parsed.data;

    // Verify prices server-side before the transaction starts
    const priceMap = await buildPriceMap(supabase, cart);
    const totalAmount = cart.reduce(
      (sum, i) => sum + priceMap.get(i.menuItemId)!.price * i.quantity,
      0
    );

    const items = cart.map((item) => ({
      menu_item_id:   item.menuItemId,
      menu_item_name: priceMap.get(item.menuItemId)!.name,
      unit_price:     priceMap.get(item.menuItemId)!.price,
      quantity:       item.quantity,
    }));

    const result = await (supabase.rpc as unknown as UntypedRpc)("place_order", {
      p_order_type:     "single",
      p_customer_name:  fields.customer_name,
      p_customer_phone: fields.customer_phone || null,
      p_fulfillment:    fields.fulfillment_type,
      p_address:        fields.fulfillment_type === "delivery" ? (fields.delivery_address ?? null) : null,
      p_scheduled_date: null,
      p_notes:          fields.notes || null,
      p_total_amount:   totalAmount,
      p_created_by:     userId,
      p_items:          items,
    });

    if (result.error) throw new Error(result.error.message);
    const orderId = result.data as string | null;
    if (!orderId) throw new Error("place_order returned no order ID");

    revalidatePath("/orders");
    return { error: null, orderId };
  } catch (err) {
    console.error("[placeSingleOrderAction]", err);
    const msg = err instanceof Error ? err.message : null;
    return { error: msg ?? "Something went wrong. Please try again." };
  }
}

// ── Place a bulk order ─────────────────────────────────────────────────────
export async function placeBulkOrderAction(payload: {
  customer_name: string;
  customer_phone?: string;
  scheduled_date: string;
  fulfillment_type: "pickup" | "delivery";
  delivery_address?: string;
  notes?: string;
  cart: CartItem[];
}): Promise<OrderActionResult> {
  try {
    const { supabase, userId } = await getOrderingClient();

    const parsed = bulkOrderSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path?.join(".") ?? "unknown";
      const msg = issue?.message ?? "Validation failed";
      console.error("[placeBulkOrderAction] validation error", parsed.error.issues);
      return { error: `${msg} (field: ${field})` };
    }

    const { cart, ...fields } = parsed.data;

    const priceMap = await buildPriceMap(supabase, cart);
    const totalAmount = cart.reduce(
      (sum, i) => sum + priceMap.get(i.menuItemId)!.price * i.quantity,
      0
    );

    const items = cart.map((item) => ({
      menu_item_id:   item.menuItemId,
      menu_item_name: priceMap.get(item.menuItemId)!.name,
      unit_price:     priceMap.get(item.menuItemId)!.price,
      quantity:       item.quantity,
    }));

    const result = await (supabase.rpc as unknown as UntypedRpc)("place_order", {
      p_order_type:     "bulk",
      p_customer_name:  fields.customer_name,
      p_customer_phone: fields.customer_phone || null,
      p_fulfillment:    fields.fulfillment_type,
      p_address:        fields.fulfillment_type === "delivery" ? (fields.delivery_address ?? null) : null,
      p_scheduled_date: fields.scheduled_date,
      p_notes:          fields.notes || null,
      p_total_amount:   totalAmount,
      p_created_by:     userId,
      p_items:          items,
    });

    if (result.error) throw new Error(result.error.message);
    const orderId = result.data as string | null;
    if (!orderId) throw new Error("place_order returned no order ID");

    revalidatePath("/orders");
    return { error: null, orderId };
  } catch (err) {
    console.error("[placeBulkOrderAction]", err);
    const msg = err instanceof Error ? err.message : null;
    return { error: msg ?? "Something went wrong. Please try again." };
  }
}

// ── Mark an order Delivered (staff or admin) ───────────────────────────────
// .maybeSingle() after the update returns null if the order was already in a
// different state — surfaces concurrent-edit conflicts instead of silently no-oping.
export async function markOrderDeliveredAction(orderId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const profile = profileData as { role: string } | null;
    if (!profile || !["admin", "staff"].includes(profile.role)) throw new Error("Forbidden");

    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() } as never)
      .eq("id", orderId)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!updated) return { error: "Order is no longer in 'ready' state — it may have been updated by someone else." };

    revalidatePath("/orders");
    return { error: null };
  } catch (err) {
    console.error("[markOrderDeliveredAction]", err);
    const msg = err instanceof Error ? err.message : null;
    return { error: msg ?? "Could not mark order as delivered." };
  }
}

// ── Cancel an order (admin only) ───────────────────────────────────────────
export async function cancelOrderAction(orderId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const profile = profileData as { role: string } | null;
    if (!profile || profile.role !== "admin") throw new Error("Forbidden");

    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
      .eq("id", orderId)
      .in("status", ["placed", "ready"])
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!updated) return { error: "Order cannot be cancelled — it may already be delivered or cancelled." };

    revalidatePath("/orders");
    return { error: null };
  } catch (err) {
    console.error("[cancelOrderAction]", err);
    const msg = err instanceof Error ? err.message : null;
    return { error: msg ?? "Could not cancel order." };
  }
}

// ── Mark an order Ready (chef, staff, or admin) ────────────────────────────
export async function markOrderReadyAction(orderId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const profile = profileData as { role: string } | null;
    // PRD §3 — chef, staff, and admin may mark Ready
    if (!profile || !["admin", "staff", "chef"].includes(profile.role)) throw new Error("Forbidden");

    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: "ready", ready_at: new Date().toISOString() } as never)
      .eq("id", orderId)
      .eq("status", "placed")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!updated) return { error: "Order is no longer in 'placed' state — it may have been updated by someone else." };

    revalidatePath("/chef");
    return { error: null };
  } catch (err) {
    console.error("[markOrderReadyAction]", err);
    const msg = err instanceof Error ? err.message : null;
    return { error: msg ?? "Could not mark order as ready." };
  }
}
