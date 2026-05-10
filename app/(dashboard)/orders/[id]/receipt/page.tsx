import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrinterReceipt } from "@/components/orders/PrinterReceipt";
import type { Order } from "@/types/domain";

export default async function ReceiptPage({
  params,
}: {
  params: { id: string };
}) {
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
  // PRD §3 — staff and admin can print receipts; chef cannot
  if (!profile || !["admin", "staff"].includes(profile.role)) redirect("/chef");

  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!orderData) notFound();

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", params.id);

  const order: Order = {
    ...(orderData as Order),
    items: itemsData ?? [],
  };

  return <PrinterReceipt order={order} />;
}
