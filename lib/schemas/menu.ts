import { z } from "zod";

export const menuItemSchema = z.object({
  name:     z.string().min(1, "Name is required").max(100, "Name is too long"),
  category: z.enum(["burgers", "shawarma", "soups", "rice", "other"] as const, {
    message: "Select a category",
  }),
  price: z.coerce
    .number({ message: "Enter a valid price" })
    .positive("Price must be greater than 0")
    .max(99999, "Price seems too high"),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
