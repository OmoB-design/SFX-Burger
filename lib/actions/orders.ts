"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { singleOrderSchema } from "@/lib/schemas/order";
import type { CartItem } from "@/types/domain";

// ── Role guard — staff or admin may place orders ───────────────────────
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

export type OrderActionResult = { error: string | null; orderId?: string };

// ── Place a single order ───────────────────────────────────────────────
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
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { cart, ...fields } = parsed.data;

    // Atomically generate sequence number via Postgres function (PRD §8)
    const seqResult = await (supabase.rpc as Function)(
      "generate_sequence_number",
      { p_order_type: "single" }
    ) as { data: string | null; error: unknown };
    if (seqResult.error || !seqResult.data) throw seqResult.error ?? new Error("Sequence generation failed");
    const seqNumber = seqResult.data;

    const totalAmount = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    const insertResult = await supabase
      .from("orders")
      .insert({
        seq_number: seqNumber,
        order_type: "single",
        status: "placed",
        customer_name: fields.customer_name,
        customer_phone: fields.customer_phone || null,
        fulfillment_type: fields.fulfillment_type,
        delivery_address:
          fields.fulfillment_type === "delivery" ? (fields.delivery_address ?? null) : null,
        notes: fields.notes || null,
        created_by: userId,
        total_amount: totalAmount,
      } as never)
      .select("id")
      .single();

    const order = insertResult.data as { id: string } | null;
    if (insertResult.error) throw insertResult.error;
    if (!order) throw new Error("Order insert returned no data");

    const { error: itemsError } = await supabase.from("order_items").insert(
      cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        menu_item_name: item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      })) as never
    );

    if (itemsError) throw itemsError;

    revalidatePath("/orders");
    return { error: null, orderId: order.id };
  } catch (err) {
    console.error("[placeSingleOrderAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
