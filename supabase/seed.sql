-- =============================================================
-- SFx Burger OMS v2.0 — Seed Data
-- Run after migrations. Idempotent via ON CONFLICT DO NOTHING.
-- =============================================================

-- ─── MENU ITEMS ───────────────────────────────────────────────
-- PRD §7 — five categories, prices in TL only

INSERT INTO menu_items (name, category, price, display_order) VALUES
  -- Burgers
  ('Classic Burger',     'burgers',  350.00, 1),
  ('BBQ Burger',         'burgers',  400.00, 2),
  ('Zinger Burger',      'burgers',  380.00, 3),
  ('Mix Burger',         'burgers',  450.00, 4),

  -- Shawarma
  ('Classic Shawarma',   'shawarma', 320.00, 1),
  ('Suya Shawarma',      'shawarma', 370.00, 2),
  ('Congolese Shawarma', 'shawarma', 370.00, 3),

  -- Soups
  ('Vegetable Soup (Efo Riro)', 'soups', 500.00, 1),
  ('Egusi Soup',                'soups', 500.00, 2),

  -- Rice
  ('Jollof Rice',          'rice', 400.00, 1),
  ('Native Rice (Village)', 'rice', 400.00, 2),
  ('Fried Rice',            'rice', 380.00, 3)

ON CONFLICT DO NOTHING;

-- ─── SEED USERS ───────────────────────────────────────────────
-- Step 1: Create users in Supabase Auth (Dashboard → Authentication → Users → Add user):
--
--   Email                    Password          Role
--   admin@sfxburger.com      SFx@dmin2024!     admin
--   staff@sfxburger.com      SFxStaff2024!     staff
--   chef@sfxburger.com       SFxChef2024!      chef
--
-- Step 2: After creating each user, run these SQL statements in
--         the Supabase SQL Editor to assign roles and display names.
--         Replace each UUID with the actual user ID shown in the
--         Authentication panel after creating the user.
--
--   UPDATE profiles
--   SET role = 'admin', full_name = 'SFx Admin'
--   WHERE id = 'REPLACE-WITH-ADMIN-UUID';
--
--   UPDATE profiles
--   SET role = 'staff', full_name = 'SFx Staff'
--   WHERE id = 'REPLACE-WITH-STAFF-UUID';
--
--   UPDATE profiles
--   SET role = 'chef', full_name = 'SFx Chef'
--   WHERE id = 'REPLACE-WITH-CHEF-UUID';
--
-- Note: profiles rows are auto-created by the auth trigger on signup.
-- If a profile row is missing, run:
--   INSERT INTO profiles (id, role, full_name)
--   VALUES ('<uuid>', 'admin', 'SFx Admin')
--   ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;

-- ─── SAMPLE ORDERS (DEV ONLY) ─────────────────────────────────
-- These insert realistic test orders for UI development and smoke testing.
-- Run ONLY after creating the admin user above.
-- Replace 'REPLACE-WITH-ADMIN-UUID' with the actual admin user UUID.
--
-- To run: uncomment the block below and paste into the Supabase SQL editor.

/*
DO $$
DECLARE
  v_admin_id  UUID := 'REPLACE-WITH-ADMIN-UUID';
  v_single_id UUID;
  v_bulk_id   UUID;
  v_seq       TEXT;
  v_item      RECORD;
BEGIN
  -- Verify admin user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id) THEN
    RAISE EXCEPTION 'Admin user % not found in profiles. Create it first.', v_admin_id;
  END IF;

  -- ── Sample Single Orders ──────────────────────────────────────

  -- Order 1: Pickup, delivered
  SELECT generate_sequence_number('single') INTO v_seq;
  INSERT INTO orders (seq_number, order_type, status, customer_name, customer_phone,
    fulfillment_type, created_by, total_amount, delivered_at)
  VALUES (v_seq, 'single', 'delivered', 'Amara Johnson', '+905551234567',
    'pickup', v_admin_id, 730.00, NOW() - INTERVAL '2 hours')
  RETURNING id INTO v_single_id;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_single_id, id, name, price, 1 FROM menu_items WHERE name = 'Classic Burger'
  ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_single_id, id, name, price, 1 FROM menu_items WHERE name = 'Jollof Rice'
  ON CONFLICT DO NOTHING;

  -- Order 2: Delivery, placed (active)
  SELECT generate_sequence_number('single') INTO v_seq;
  INSERT INTO orders (seq_number, order_type, status, customer_name, customer_phone,
    fulfillment_type, delivery_address, created_by, total_amount)
  VALUES (v_seq, 'single', 'placed', 'Emeka Obi', '+905559876543',
    'delivery', '14 Ataturk Caddesi, Lefkosa', v_admin_id, 1120.00)
  RETURNING id INTO v_single_id;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_single_id, id, name, price, 2 FROM menu_items WHERE name = 'BBQ Burger'
  ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_single_id, id, name, price, 1 FROM menu_items WHERE name = 'Classic Shawarma'
  ON CONFLICT DO NOTHING;

  -- Order 3: Pickup, ready
  SELECT generate_sequence_number('single') INTO v_seq;
  INSERT INTO orders (seq_number, order_type, status, customer_name,
    fulfillment_type, created_by, total_amount, ready_at)
  VALUES (v_seq, 'single', 'ready', 'Ngozi Adeyemi',
    'pickup', v_admin_id, 870.00, NOW() - INTERVAL '10 minutes')
  RETURNING id INTO v_single_id;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_single_id, id, name, price, 1 FROM menu_items WHERE name = 'Zinger Burger'
  ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_single_id, id, name, price, 1 FROM menu_items WHERE name = 'Egusi Soup'
  ON CONFLICT DO NOTHING;

  -- ── Sample Bulk Order ─────────────────────────────────────────

  -- Bulk Order 1: Scheduled for next Saturday, placed
  SELECT generate_sequence_number('bulk') INTO v_seq;
  INSERT INTO orders (seq_number, order_type, status, customer_name, customer_phone,
    fulfillment_type, scheduled_date, notes, created_by, total_amount)
  VALUES (v_seq, 'bulk', 'placed', 'SFx Corporate Event', '+905338410938',
    'delivery',
    (DATE_TRUNC('week', NOW() + INTERVAL '7 days') + INTERVAL '5 days')::DATE,
    'Catering for 20 people. Deliver by 12:00.',
    v_admin_id, 8800.00)
  RETURNING id INTO v_bulk_id;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_bulk_id, id, name, price, 8 FROM menu_items WHERE name = 'Classic Burger'
  ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_bulk_id, id, name, price, 6 FROM menu_items WHERE name = 'Jollof Rice'
  ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT v_bulk_id, id, name, price, 6 FROM menu_items WHERE name = 'Native Rice (Village)'
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed orders inserted successfully.';
END;
$$;
*/
