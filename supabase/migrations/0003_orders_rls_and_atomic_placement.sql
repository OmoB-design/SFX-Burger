-- =============================================================
-- 0003: Orders RLS WITH CHECK + Atomic placement + Chef SELECT
-- =============================================================

-- ── 1. Fix orders UPDATE: add WITH CHECK clause ───────────────────────────
-- The original policy had only USING (controls which rows can be targeted,
-- evaluated on OLD values) but no WITH CHECK (constrains the NEW values).
-- Without WITH CHECK, a staff member could set status='cancelled', or a chef
-- could set status='delivered' — bypassing app-layer role guards via direct API.

DROP POLICY IF EXISTS "orders_update" ON orders;

CREATE POLICY "orders_update"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    -- USING evaluates the OLD row: who is allowed to touch this row at all?
    auth_role() = 'admin'
    OR auth_role() = 'staff'
    OR (auth_role() = 'chef' AND status = 'placed')
  )
  WITH CHECK (
    -- WITH CHECK evaluates the NEW row: what values may be written?
    auth_role() = 'admin'
    OR (auth_role() = 'staff'  AND status IN ('ready', 'delivered'))
    OR (auth_role() = 'chef'   AND status = 'ready')
  );

-- ── 2. Widen chef SELECT for correct realtime UPDATE delivery notifications ─
-- Supabase Realtime checks the NEW row's RLS on UPDATE events. The old chef
-- policy excluded delivered/cancelled orders, so when staff marked an order
-- delivered the chef client never received the UPDATE event — tickets would
-- stay on the kitchen board indefinitely until a manual page refresh.
-- Fix: chef can read all of today's tickets regardless of terminal status, so
-- the "order delivered/cancelled" UPDATE event propagates correctly.
-- The UI still only renders placed/ready tickets on the board.

DROP POLICY IF EXISTS "orders_select" ON orders;

CREATE POLICY "orders_select"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth_role() IN ('admin', 'staff')
    OR (
      auth_role() = 'chef'
      AND (
        order_type = 'single'
        OR (order_type = 'bulk' AND scheduled_date = CURRENT_DATE)
      )
    )
  );

-- ── 3. Atomic place_order function ────────────────────────────────────────
-- Wraps sequence generation + order insert + items insert in one transaction.
-- SECURITY DEFINER so it can UPDATE sequence_counters (which has USING(false)
-- to block direct client access). auth_role() still resolves correctly via JWT.
-- The sequence increment is inlined to avoid privilege-propagation issues
-- when calling a non-SECURITY DEFINER function from within a SECURITY DEFINER one.

CREATE OR REPLACE FUNCTION place_order(
  p_order_type     text,
  p_customer_name  text,
  p_customer_phone text    DEFAULT NULL,
  p_fulfillment    text    DEFAULT NULL,
  p_address        text    DEFAULT NULL,
  p_scheduled_date date    DEFAULT NULL,
  p_notes          text    DEFAULT NULL,
  p_total_amount   numeric DEFAULT 0,
  p_created_by     uuid    DEFAULT NULL,
  p_items          jsonb   DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next       integer;
  v_prefix     text;
  v_seq_number text;
  v_order_id   uuid;
BEGIN
  -- Defence-in-depth: reject callers that aren't admin or staff even if RLS is bypassed
  IF auth_role() NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'Only admin or staff can place orders';
  END IF;

  -- Sequence number — inlined so we run with SECURITY DEFINER privileges on sequence_counters
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

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Sequence counter not found for order type: %', p_order_type;
  END IF;

  v_seq_number := v_prefix || lpad(v_next::text, 4, '0');

  -- Order row
  INSERT INTO orders (
    seq_number,       order_type,        status,
    customer_name,    customer_phone,
    fulfillment_type, delivery_address,  scheduled_date,
    notes,            created_by,        total_amount
  ) VALUES (
    v_seq_number,
    p_order_type::order_type,
    'placed',
    p_customer_name,
    NULLIF(p_customer_phone, ''),
    CASE WHEN p_fulfillment IS NOT NULL THEN p_fulfillment::fulfillment_type ELSE NULL END,
    NULLIF(p_address, ''),
    p_scheduled_date,
    NULLIF(p_notes, ''),
    p_created_by,
    p_total_amount
  )
  RETURNING id INTO v_order_id;

  -- Order items
  INSERT INTO order_items (order_id, menu_item_id, menu_item_name, unit_price, quantity)
  SELECT
    v_order_id,
    (item->>'menu_item_id')::uuid,
    item->>'menu_item_name',
    (item->>'unit_price')::numeric,
    (item->>'quantity')::integer
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_order_id;
END;
$$;
