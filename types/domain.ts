// Application-level domain types derived from database row types.
// These are what components and server actions work with directly.

import type {
  ProfileRow,
  MenuItemRow,
  OrderRow,
  OrderItemRow,
  UserRole,
  MenuCategory,
  OrderType,
  OrderStatus,
  FulfillmentType,
} from "./database.types";

// Re-export enums so consumers import from one place
export type { UserRole, MenuCategory, OrderType, OrderStatus, FulfillmentType };

// ─── User / Auth ──────────────────────────────────────────────

export type UserProfile = ProfileRow;

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile;
}

// ─── Menu ─────────────────────────────────────────────────────

export type MenuItem = MenuItemRow;

export interface MenuByCategory {
  category: MenuCategory;
  label: string;
  emoji: string;
  items: MenuItem[];
}

export const CATEGORY_META: Record<MenuCategory, { label: string; emoji: string }> = {
  burgers:  { label: "Burgers",  emoji: "🍔" },
  shawarma: { label: "Shawarma", emoji: "🌯" },
  soups:    { label: "Soups",    emoji: "🍲" },
  rice:     { label: "Rice",     emoji: "🍚" },
  other:    { label: "Other",    emoji: "🍽️" },
};

// ─── Orders ───────────────────────────────────────────────────

export interface OrderItem extends OrderItemRow {}

export interface Order extends OrderRow {
  items: OrderItem[];
  created_by_profile?: Pick<UserProfile, "id" | "full_name"> | null;
}

// The cart structure used in the new-order form (before persistence)
export interface CartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

// PRD §4 status flow labels and colors
export const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  placed:    { label: "Order Placed", color: "sfx-amber"   },
  ready:     { label: "Ready",        color: "sfx-green"   },
  delivered: { label: "Delivered",    color: "muted"       },
  cancelled: { label: "Cancelled",    color: "destructive" },
};

// PRD §8 — format a seq_number using Geist Mono (applied at render layer)
export function formatSeqNumber(seq: string): string {
  return seq; // already formatted by generate_sequence_number()
}
