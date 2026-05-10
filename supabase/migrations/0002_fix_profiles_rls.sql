-- =============================================================
-- SFx Burger OMS — Security patch: prevent role self-escalation
-- =============================================================
-- The original profiles_update_own policy allows any authenticated
-- user to update their own profile row, including the `role` column.
-- This BEFORE UPDATE trigger blocks role changes by non-admins at
-- the database layer, regardless of how the update is issued.

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only block if role is actually changing
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth_role() IS DISTINCT FROM 'admin'::user_role THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();
