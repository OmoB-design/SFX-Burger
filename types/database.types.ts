// Hand-crafted to match 0001_initial_schema.sql.
// Replace with `supabase gen types typescript --linked` once the project is linked.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "staff" | "chef";
export type MenuCategory = "burgers" | "shawarma" | "soups" | "rice" | "other";
export type FulfillmentType = "pickup" | "delivery";
export type OrderType = "single" | "bulk";
export type OrderStatus = "placed" | "ready" | "delivered" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string;
          created_at?: string;
        };
        Update: {
          role?: UserRole;
          full_name?: string;
        };
      };

      menu_items: {
        Row: {
          id: string;
          name: string;
          category: MenuCategory;
          price: number;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: MenuCategory;
          price: number;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: MenuCategory;
          price?: number;
          is_active?: boolean;
          display_order?: number;
          updated_at?: string;
        };
      };

      sequence_counters: {
        Row: {
          counter_type: "single" | "bulk";
          current_value: number;
        };
        Insert: never;
        Update: never;
      };

      orders: {
        Row: {
          id: string;
          seq_number: string;
          order_type: OrderType;
          status: OrderStatus;
          customer_name: string;
          customer_phone: string | null;
          fulfillment_type: FulfillmentType | null;
          delivery_address: string | null;
          scheduled_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          ready_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          total_amount: number;
        };
        Insert: {
          id?: string;
          seq_number: string;
          order_type: OrderType;
          status?: OrderStatus;
          customer_name: string;
          customer_phone?: string | null;
          fulfillment_type?: FulfillmentType | null;
          delivery_address?: string | null;
          scheduled_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          ready_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          total_amount: number;
        };
        Update: {
          status?: OrderStatus;
          notes?: string | null;
          ready_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
        };
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          menu_item_name: string;
          unit_price: number;
          quantity: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          menu_item_name: string;
          unit_price: number;
          quantity?: number;
        };
        Update: never;
      };
    };

    Functions: {
      generate_sequence_number: {
        Args: { p_order_type: "single" | "bulk" };
        Returns: string;
      };
      auth_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };

    Enums: {
      user_role: UserRole;
      menu_category: MenuCategory;
      fulfillment_type: FulfillmentType;
      order_type: OrderType;
      order_status: OrderStatus;
    };
  };
}

// Convenience row-type aliases
export type ProfileRow    = Database["public"]["Tables"]["profiles"]["Row"];
export type MenuItemRow   = Database["public"]["Tables"]["menu_items"]["Row"];
export type OrderRow      = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow  = Database["public"]["Tables"]["order_items"]["Row"];
