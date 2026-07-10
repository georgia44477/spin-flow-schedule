
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE public.class_level AS ENUM ('Intro', 'Foundations', 'Intermediate', 'Advanced', 'All Levels');
CREATE TYPE public.booking_tier AS ENUM ('drop-in', 'pass', 'subscription');
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  waiver_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- New-user trigger: create profile + assign 'student' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  instructor TEXT NOT NULL,
  description TEXT NOT NULL,
  level public.class_level NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  spots_total INTEGER NOT NULL,
  drop_in_price NUMERIC(10,2) NOT NULL,
  pass_price NUMERIC(10,2) NOT NULL,
  subscription_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO anon, authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes public read" ON public.classes FOR SELECT USING (true);
CREATE POLICY "admins manage classes" ON public.classes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  tier public.booking_tier NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admins read all bookings" ON public.bookings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  discount_code TEXT,
  discount_percent INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'succeeded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments read" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- Booking RPC: atomically checks capacity and inserts booking + payment
CREATE OR REPLACE FUNCTION public.book_class(
  _class_id UUID,
  _tier public.booking_tier,
  _total_amount NUMERIC,
  _discount_code TEXT DEFAULT NULL,
  _discount_percent INTEGER DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

GRANT EXECUTE ON FUNCTION public.book_class(UUID, public.booking_tier, NUMERIC, TEXT, INTEGER) TO authenticated;
