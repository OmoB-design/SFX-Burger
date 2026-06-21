"use client";

import { useMemo, useReducer, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Loader2,
  MapPin,
  Phone,
  User,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { placeSingleOrderAction } from "@/lib/actions/orders";
import type { CustomerInfoValues } from "@/lib/schemas/order";
import { CATEGORY_META, type CartItem, type MenuItem, type MenuCategory } from "@/types/domain";
import { cn } from "@/lib/utils";
import { formatTL } from "@/lib/format";

// ── Cart reducer ───────────────────────────────────────────────────────

type CartAction =
  | { type: "ADD"; item: MenuItem }
  | { type: "INCREMENT"; menuItemId: string }
  | { type: "DECREMENT"; menuItemId: string }
  | { type: "REMOVE"; menuItemId: string };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD": {
      const existing = state.find((i) => i.menuItemId === action.item.id);
      if (existing) {
        return state.map((i) =>
          i.menuItemId === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...state,
        {
          menuItemId: action.item.id,
          name: action.item.name,
          unitPrice: action.item.price,
          quantity: 1,
        },
      ];
    }
    case "INCREMENT":
      return state.map((i) =>
        i.menuItemId === action.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
      );
    case "DECREMENT":
      return state
        .map((i) =>
          i.menuItemId === action.menuItemId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0);
    case "REMOVE":
      return state.filter((i) => i.menuItemId !== action.menuItemId);
    default:
      return state;
  }
}

// ── Category tab strip ─────────────────────────────────────────────────

const CATEGORY_ORDER: MenuCategory[] = ["burgers", "shawarma", "soups", "rice", "other"];

// ── Props ──────────────────────────────────────────────────────────────

interface NewSingleOrderFormProps {
  menuItems: MenuItem[];
}

// ── Component ──────────────────────────────────────────────────────────

export function NewSingleOrderForm({ menuItems }: NewSingleOrderFormProps) {
  const router = useRouter();
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("burgers");

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<CustomerInfoValues>({
    mode: "onChange",
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      fulfillment_type: "pickup",
      delivery_address: "",
      notes: "",
    },
  });

  const fulfillmentType = watch("fulfillment_type");

  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart]
  );

  const activeItems = useMemo(
    () => menuItems.filter((m) => m.category === activeCategory && m.is_active),
    [menuItems, activeCategory]
  );

  const categoriesWithItems = useMemo(
    () => new Set(menuItems.filter((m) => m.is_active).map((m) => m.category)),
    [menuItems]
  );

  async function onSubmit(data: CustomerInfoValues) {
    if (cart.length === 0) {
      toast.error("Add at least one item to the order");
      return;
    }
    setIsSubmitting(true);
    const result = await placeSingleOrderAction({ ...data, cart });
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Order placed — opening receipt");
      router.push(`/orders/${result.orderId}/receipt`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Customer Info ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Customer</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_name" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Name <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="customer_name"
              control={control}
              rules={{
                required: "Customer name is required",
                validate: (v) => v.trim().length > 0 || "Customer name is required",
              }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="customer_name"
                    placeholder="e.g. Amara Johnson"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Phone <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="customer_phone"
              type="tel"
              placeholder="+90 5xx xxx xx xx"
              {...register("customer_phone")}
            />
          </div>
        </div>

        {/* Fulfillment toggle */}
        <div className="space-y-1.5">
          <Label>Fulfillment</Label>
          <div className="flex gap-2">
            {(["pickup", "delivery"] as const).map((type) => (
              <label
                key={type}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  fulfillmentType === type
                    ? "border-sfx-red bg-sfx-red/10 text-sfx-red"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                <input
                  type="radio"
                  value={type}
                  className="sr-only"
                  {...register("fulfillment_type")}
                />
                {type === "pickup" ? "Pickup" : "Delivery"}
              </label>
            ))}
          </div>
        </div>

        {/* Delivery address — conditional */}
        {fulfillmentType === "delivery" && (
          <div className="space-y-1.5">
            <Label htmlFor="delivery_address" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Delivery address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="delivery_address"
              placeholder="Street, neighbourhood, landmark…"
              {...register("delivery_address", {
                validate: (val, vals) =>
                  vals.fulfillment_type !== "delivery" ||
                  (val?.trim().length ?? 0) > 0 ||
                  "Delivery address is required",
              })}
              aria-invalid={!!errors.delivery_address}
            />
            {errors.delivery_address && (
              <p className="text-xs text-destructive">{errors.delivery_address.message}</p>
            )}
          </div>
        )}
      </section>

      {/* ── Menu Picker ────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Menu</h2>

        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_ORDER.map((cat) => {
            const meta = CATEGORY_META[cat];
            if (!categoriesWithItems.has(cat)) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Item grid */}
        {activeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No active items in {CATEGORY_META[activeCategory].label}.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeItems.map((item) => {
              const inCart = cart.find((c) => c.menuItemId === item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs font-mono text-sfx-amber mt-0.5">
                      {formatTL(item.price)}
                    </p>
                  </div>

                  {inCart ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "DECREMENT", menuItemId: item.id })}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-mono font-medium">
                        {inCart.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "INCREMENT", menuItemId: item.id })}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "ADD", item })}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-sfx-red/10 text-sfx-red hover:bg-sfx-red/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Cart ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Cart
          </h2>
          {cartCount > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">
              {cartCount} item{cartCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items added yet — pick from the menu above.
          </p>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {formatTL(item.unitPrice)} × {item.quantity}
                  </p>
                </div>

                <p className="text-sm font-mono font-medium text-sfx-amber flex-shrink-0">
                  {formatTL(item.unitPrice * item.quantity)}
                </p>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "DECREMENT", menuItemId: item.menuItemId })}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-mono">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "INCREMENT", menuItemId: item.menuItemId })}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "REMOVE", menuItemId: item.menuItemId })}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 mt-1">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-base font-mono font-bold text-sfx-red">
                {formatTL(cartTotal)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Notes ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <Label htmlFor="notes" className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Notes <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          placeholder="Allergies, special requests, extra sauce…"
          rows={2}
          className="resize-none"
          {...register("notes")}
        />
      </section>

      {/* ── Submit ─────────────────────────────────────────────────── */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-sfx-red hover:bg-sfx-red/90 text-white h-11 text-sm font-semibold"
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}
