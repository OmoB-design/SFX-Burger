import { z } from "zod";

export const cartItemSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string(),
  unitPrice: z.number().positive(),
  quantity: z.number().int().min(1),
});

// Client-side customer info fields (used with react-hook-form)
export const customerInfoSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  fulfillment_type: z.enum(["pickup", "delivery"] as const),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
});

// Full single order schema — validated server-side before insert
export const singleOrderSchema = customerInfoSchema
  .extend({
    cart: z.array(cartItemSchema).min(1, "Add at least one item to the order"),
  })
  .refine(
    (data) => {
      if (data.fulfillment_type === "delivery") {
        return !!data.delivery_address?.trim();
      }
      return true;
    },
    { message: "Delivery address is required for delivery orders", path: ["delivery_address"] }
  );

export type CustomerInfoValues = z.infer<typeof customerInfoSchema>;
export type SingleOrderInput = z.infer<typeof singleOrderSchema>;
