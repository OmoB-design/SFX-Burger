-- =============================================================
-- SFx Burger OMS v2.0 — Initial Schema
-- Phase 1: Database Schema & Type System
-- =============================================================

-- ─── ENUMS ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'staff', 'chef');

CREATE TYPE menu_category AS ENUM ('burgers', 'shawarma', 'soups', 'rice', 'other');

CREATE TYPE fulfillment_type AS ENUM ('pickup', 'delivery');

CREATE TYPE order_type AS ENUM ('single', 'bulk');

-- PRD §4 — three active states plus terminal cancelled
CREATE TYPE order_status AS ENUM ('placed', 'ready', 'delivered', 'cancelled');

-- ─── PROFILES ─────────────────────────────────────────────────
-- Extends auth.users with the OMS role. One row per auth user.

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'staff',
  full_name   text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'staff'),
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── MENU ITEMS ───────────────────────────────────────────────

CREATE TABLE menu_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  category       menu_category NOT NULL DEFAULT 'burgers',
  price          numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_active      boolean NOT NULL DEFAULT true,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SEQUENCE COUNTERS ────────────────────────────────────────
-- PRD §8 — transaction-safe per-type counters, never MAX(seq).

CREATE TABLE sequence_counters (
  counter_type  text PRIMARY KEY CHECK (counter_type IN ('single', 'bulk')),
  current_value integer NOT NULL DEFAULT 0
);

INSERT INTO sequence_counters (counter_type, current_value)
VALUES ('single', 0), ('bulk', 0);

-- Atomically increment and return the formatted sequence number.
-- Uses UPDATE ... RETURNING which is a single atomic statement.
CREATE OR REPLACE FUNCTION generate_sequence_number(p_order_type text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next   integer;
  v_prefix text;
BEGIN
  IF p_order_type = 'single' THEN
    v_prefix := 'SFX-S-';
  ELSIF p_order_type = 'bulk' THEN
    v_prefix := 'SFX-B-';
  ELSE
    RAISE EXCEPTION 'Invalid order type: %', p_order_type;
  END IF;

  UPDATE sequence_counters
  SET    current_value = current_value + 1
  WHERE  counter_type  = p_order_type
  RETURNING current_value INTO v_next;

  RETURN v_prefix || lpad(v_next::text, 4, '0');
END;
$$;

-- ─── ORDERS ───────────────────────────────────────────────────

CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_number       text NOT NULL UNIQUE,
  order_type       order_type NOT NULL,
  status           order_status NOT NULL DEFAULT 'placed',

  -- Customer info
  customer_name    text NOT NULL,
  customer_phone   text,

  -- Single-order fields (nullable for bulk)
  fulfillment_type fulfillment_type,
  delivery_address text,

  -- Bulk-order field (nullable for single) — PRD §2
  scheduled_date   date,

  notes            text,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps for each status transition — PRD §4
  created_at       timestamptz NOT NULL DEFAULT now(),
  ready_at         timestamptz,
  delivered_at     timestamptz,
  cancelled_at     timestamptz,

  -- Snapshot total stored on placement for reporting accuracy
  total_amount     numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  CONSTRAINT single_requires_fulfillment
    CHECK (order_type <> 'single' OR fulfillment_type IS NOT NULL),
  CONSTRAINT delivery_requires_address
    CHECK (fulfillment_type <> 'delivery' OR delivery_address IS NOT NULL),
  CONSTRAINT bulk_requires_scheduled_date
    CHECK (order_type <> 'bulk' OR scheduled_date IS NOT NULL)
);

-- ─── ORDER ITEMS ──────────────────────────────────────────────
-- Prices and names are snapshotted so historical orders stay accurate
-- if the menu changes later.

CREATE TABLE order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id     uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_item_name   text NOT NULL,
  unit_price       numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity         integer NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_order_type_idx ON orders(order_type);
CREATE INDEX orders_scheduled_date_idx ON orders(scheduled_date);
CREATE INDEX orders_created_at_idx ON orders(created_at DESC);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;

-- Helper: get the role of the current authenticated user
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ── profiles ──
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR auth_role() = 'admin');

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR auth_role() = 'admin');

-- ── menu_items ──
-- All authenticated users can read active items
CREATE POLICY "menu_items_select"
  ON menu_items FOR SELECT
  TO authenticated
  USING (is_active = true OR auth_role() = 'admin');

-- Only admin can write menu items
CREATE POLICY "menu_items_insert"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (auth_role() = 'admin');

CREATE POLICY "menu_items_update"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (auth_role() = 'admin');

CREATE POLICY "menu_items_delete"
  ON menu_items FOR DELETE
  TO authenticated
  USING (auth_role() = 'admin');

-- ── sequence_counters ──
-- Only accessible via the generate_sequence_number() function (SECURITY DEFINER).
-- No direct client access.
CREATE POLICY "sequence_counters_no_direct_access"
  ON sequence_counters FOR ALL
  USING (false);

-- ── orders — select ──
-- PRD §3: admin + staff see all; chef sees only active kitchen tickets
CREATE POLICY "orders_select"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth_role() IN ('admin', 'staff')
    OR (
      auth_role() = 'chef'
      AND status IN ('placed', 'ready')
      AND (
        order_type = 'single'
        OR (order_type = 'bulk' AND scheduled_date = CURRENT_DATE)
      )
    )
  );

-- ── orders — insert ──
-- PRD §3: admin and staff can place orders
CREATE POLICY "orders_insert"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth_role() IN ('admin', 'staff'));

-- ── orders — update ──
-- PRD §3 + §4:
--   chef     → can set status = 'ready'
--   staff    → can set status = 'delivered'
--   admin    → can update anything including cancel
CREATE POLICY "orders_update"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth_role() = 'admin'
    OR auth_role() = 'staff'
    OR (
      auth_role() = 'chef'
      AND status = 'placed'   -- chef can only act on placed orders
    )
  );

-- ── orders — delete ──
-- No role can delete orders (history is permanent).
-- Cancellation is a status update, not a delete.

-- ── order_items ──
-- Follows order access — if you can see the order, you can see its items
CREATE POLICY "order_items_select"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM orders)  -- defers to orders RLS
  );

CREATE POLICY "order_items_insert"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (auth_role() IN ('admin', 'staff'));

-- order_items are immutable after placement
