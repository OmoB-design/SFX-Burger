-- Enable Supabase Realtime for orders tables.
-- Without this, postgres_changes subscriptions connect but receive no events.
-- Both ChefBoard and OrdersTable rely on these publications for live updates.

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
