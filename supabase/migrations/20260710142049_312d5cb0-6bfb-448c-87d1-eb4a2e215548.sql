
CREATE TABLE public.studio_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT,
  plan_tier TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.studio_leads TO anon, authenticated;
GRANT ALL ON public.studio_leads TO service_role;

ALTER TABLE public.studio_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit a studio lead"
  ON public.studio_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read all studio leads"
  ON public.studio_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
