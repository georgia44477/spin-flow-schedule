
-- 1. Switch has_role to SECURITY INVOKER (authenticated can already read own user_roles via RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Switch book_class to SECURITY INVOKER (proper RLS policies below let users insert their own rows)
CREATE OR REPLACE FUNCTION public.book_class(
  _class_id uuid,
  _tier booking_tier,
  _total_amount numeric,
  _discount_code text DEFAULT NULL,
  _discount_percent integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _cls public.classes%ROWTYPE;
  _taken INTEGER;
  _price NUMERIC(10,2);
  _booking_id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _cls FROM public.classes WHERE id = _class_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;

  SELECT COUNT(*) INTO _taken FROM public.bookings
    WHERE class_id = _class_id AND status = 'confirmed';
  IF _taken >= _cls.spots_total THEN RAISE EXCEPTION 'Class is full'; END IF;

  _price := CASE _tier
    WHEN 'drop-in' THEN _cls.drop_in_price
    WHEN 'pass' THEN _cls.pass_price
    WHEN 'subscription' THEN _cls.subscription_price END;

  INSERT INTO public.bookings (user_id, class_id, tier, price)
    VALUES (_uid, _class_id, _tier, _price)
    RETURNING id INTO _booking_id;

  INSERT INTO public.payments (user_id, booking_id, amount, discount_code, discount_percent)
    VALUES (_uid, _booking_id, _total_amount, _discount_code, _discount_percent);

  UPDATE public.profiles SET waiver_signed_at = COALESCE(waiver_signed_at, now())
    WHERE id = _uid;

  RETURN _booking_id;
END; $$;

-- 3. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from the exposed API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 4. Replace overly permissive studio_leads INSERT policy with basic validation
DROP POLICY IF EXISTS "anyone can submit a studio lead" ON public.studio_leads;
CREATE POLICY "anyone can submit a studio lead"
  ON public.studio_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(studio_name)) > 0
    AND length(trim(owner_name)) > 0
    AND length(email) >= 5
    AND position('@' in email) > 1
    AND position('.' in email) > 2
    AND plan_tier IN ('starter', 'growth', 'studio-pro')
    AND billing_cycle IN ('monthly', 'yearly')
  );

-- 5. Bookings: allow authenticated users to create/cancel their own bookings
CREATE POLICY "users can insert own bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can delete own bookings"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Payments: allow authenticated users to insert their own payment records
CREATE POLICY "users can insert own payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
