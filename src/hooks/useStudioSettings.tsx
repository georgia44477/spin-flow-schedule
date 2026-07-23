import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StudioSettings {
  studio_name: string;
  tagline: string | null;
  timezone: string;
  logo_url: string | null;
  hero_image_url: string | null;
  primary_color: string | null;
  contact_email: string | null;
}

const DEFAULTS: StudioSettings = {
  studio_name: "Studio Roxx",
  tagline: "Pole · Dance · Strength",
  timezone: "UTC",
  logo_url: null,
  hero_image_url: null,
  primary_color: "#d4af37",
  contact_email: null,
};

export const useStudioSettings = () => {
  const [settings, setSettings] = useState<StudioSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("studio_settings").select("*").eq("id", 1).maybeSingle();
    if (data) setSettings({ ...DEFAULTS, ...(data as Partial<StudioSettings>) });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, loading, refresh: load };
};
