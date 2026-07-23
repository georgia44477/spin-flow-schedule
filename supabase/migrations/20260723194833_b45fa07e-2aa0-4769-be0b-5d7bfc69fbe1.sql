
DROP TABLE IF EXISTS public.studio_leads CASCADE;

CREATE TABLE IF NOT EXISTS public.studio_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  studio_name TEXT NOT NULL DEFAULT 'Studio Roxx',
  tagline TEXT DEFAULT 'Pole · Dance · Strength',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  logo_url TEXT,
  hero_image_url TEXT,
  primary_color TEXT DEFAULT '#d4af37',
  contact_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.studio_settings TO anon, authenticated;
GRANT ALL ON public.studio_settings TO service_role;
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read studio settings" ON public.studio_settings;
CREATE POLICY "Anyone can read studio settings" ON public.studio_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage studio settings" ON public.studio_settings;
CREATE POLICY "Admins manage studio settings" ON public.studio_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.studio_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
DROP TRIGGER IF EXISTS studio_settings_updated_at ON public.studio_settings;
CREATE TRIGGER studio_settings_updated_at BEFORE UPDATE ON public.studio_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.instructors TO anon, authenticated;
GRANT ALL ON public.instructors TO service_role;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read instructors" ON public.instructors;
CREATE POLICY "Anyone can read instructors" ON public.instructors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage instructors" ON public.instructors;
CREATE POLICY "Admins manage instructors" ON public.instructors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS instructors_updated_at ON public.instructors;
CREATE TRIGGER instructors_updated_at BEFORE UPDATE ON public.instructors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  percent_off INT NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_redemptions INT,
  times_redeemed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage discount codes" ON public.discount_codes;
CREATE POLICY "Admins manage discount codes" ON public.discount_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS discount_codes_updated_at ON public.discount_codes;
CREATE TRIGGER discount_codes_updated_at BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_discount_code(_code TEXT)
RETURNS TABLE (percent_off INT, valid BOOLEAN, reason TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.discount_codes%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.discount_codes WHERE code = upper(trim(_code));
  IF NOT FOUND THEN RETURN QUERY SELECT 0, false, 'Code not found'::TEXT; RETURN; END IF;
  IF NOT _row.is_active THEN RETURN QUERY SELECT 0, false, 'Code inactive'::TEXT; RETURN; END IF;
  IF _row.starts_at IS NOT NULL AND _row.starts_at > now() THEN
    RETURN QUERY SELECT 0, false, 'Code not yet valid'::TEXT; RETURN; END IF;
  IF _row.ends_at IS NOT NULL AND _row.ends_at < now() THEN
    RETURN QUERY SELECT 0, false, 'Code expired'::TEXT; RETURN; END IF;
  IF _row.max_redemptions IS NOT NULL AND _row.times_redeemed >= _row.max_redemptions THEN
    RETURN QUERY SELECT 0, false, 'Code fully redeemed'::TEXT; RETURN; END IF;
  RETURN QUERY SELECT _row.percent_off, true, ''::TEXT;
END; $$;
REVOKE ALL ON FUNCTION public.check_discount_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_discount_code(TEXT) TO anon, authenticated;

DROP INDEX IF EXISTS bookings_confirmed_unique;
CREATE UNIQUE INDEX bookings_confirmed_unique
  ON public.bookings (user_id, class_id) WHERE status = 'confirmed';

CREATE OR REPLACE FUNCTION public.class_availability(_from TIMESTAMPTZ, _to TIMESTAMPTZ)
RETURNS TABLE (class_id UUID, confirmed_count INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.class_id, COUNT(*)::INT
  FROM public.bookings b
  JOIN public.classes c ON c.id = b.class_id
  WHERE b.status = 'confirmed' AND c.starts_at >= _from AND c.starts_at < _to
  GROUP BY b.class_id;
$$;
REVOKE ALL ON FUNCTION public.class_availability(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_availability(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.book_class(UUID, booking_tier, NUMERIC, TEXT, INT);

CREATE OR REPLACE FUNCTION public.book_class(
  _class_id UUID,
  _tier booking_tier,
  _discount_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _cls public.classes%ROWTYPE;
  _taken INT;
  _base NUMERIC(10,2);
  _percent INT := 0;
  _final NUMERIC(10,2);
  _booking_id UUID;
  _existing UUID;
  _code TEXT := NULLIF(trim(upper(_discount_code)), '');
  _disc public.discount_codes%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  SELECT * INTO _cls FROM public.classes WHERE id = _class_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class not found' USING ERRCODE = 'P0002'; END IF;

  SELECT id INTO _existing FROM public.bookings
    WHERE user_id = _uid AND class_id = _class_id AND status = 'cancelled'
    ORDER BY created_at DESC LIMIT 1;

  SELECT COUNT(*) INTO _taken FROM public.bookings
    WHERE class_id = _class_id AND status = 'confirmed';
  IF _taken >= _cls.spots_total THEN RAISE EXCEPTION 'Class is full' USING ERRCODE = 'P0001'; END IF;

  _base := CASE _tier
    WHEN 'drop-in' THEN _cls.drop_in_price
    WHEN 'pass' THEN _cls.pass_price
    WHEN 'subscription' THEN _cls.subscription_price
  END;

  IF _code IS NOT NULL THEN
    SELECT * INTO _disc FROM public.discount_codes WHERE code = _code FOR UPDATE;
    IF FOUND AND _disc.is_active
       AND (_disc.starts_at IS NULL OR _disc.starts_at <= now())
       AND (_disc.ends_at   IS NULL OR _disc.ends_at   >= now())
       AND (_disc.max_redemptions IS NULL OR _disc.times_redeemed < _disc.max_redemptions)
    THEN
      _percent := _disc.percent_off;
      UPDATE public.discount_codes SET times_redeemed = times_redeemed + 1 WHERE id = _disc.id;
    ELSE
      _code := NULL;
    END IF;
  END IF;

  _final := round(_base * (100 - _percent) / 100.0, 2);

  IF _existing IS NOT NULL THEN
    UPDATE public.bookings
      SET status = 'confirmed', tier = _tier, price = _final, created_at = now()
      WHERE id = _existing RETURNING id INTO _booking_id;
  ELSE
    INSERT INTO public.bookings (user_id, class_id, tier, price, status)
      VALUES (_uid, _class_id, _tier, _final, 'confirmed')
      RETURNING id INTO _booking_id;
  END IF;

  INSERT INTO public.payments (user_id, booking_id, amount, discount_code, discount_percent, status)
    VALUES (_uid, _booking_id, _final, _code, _percent, 'pending_at_studio');

  UPDATE public.profiles SET waiver_signed_at = COALESCE(waiver_signed_at, now())
    WHERE id = _uid;

  RETURN _booking_id;
END; $$;
REVOKE ALL ON FUNCTION public.book_class(UUID, booking_tier, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_class(UUID, booking_tier, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read classes" ON public.classes;
CREATE POLICY "Anyone can read classes" ON public.classes FOR SELECT USING (true);
GRANT SELECT ON public.classes TO anon;
