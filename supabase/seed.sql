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
-- Create these users in Supabase Auth (dashboard or CLI), then
-- update their profiles with the correct role:
--
--   UPDATE profiles SET role = 'admin', full_name = 'Admin'
--   WHERE id = '<uuid>';
--
-- Dev credentials (change before going live):
--   admin@sfxburger.com  / SFx@dmin2024
--   staff@sfxburger.com  / SFxStaff2024
--   chef@sfxburger.com   / SFxChef2024
