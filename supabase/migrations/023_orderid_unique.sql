-- Prevent the same PayPal orderID from being used across multiple pending_upgrades rows.
-- NULL is allowed (rows without an order ID, e.g. manual upgrades).
CREATE UNIQUE INDEX IF NOT EXISTS pending_upgrades_order_id_unique
  ON pending_upgrades (ls_order_id)
  WHERE ls_order_id IS NOT NULL;
