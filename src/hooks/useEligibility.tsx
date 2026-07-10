import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Eligibility {
  loading: boolean;
  hasActiveSubscription: boolean;
  subscriptionExpiresAt: Date | null;
  passCreditsRemaining: number;
  totalPassCredits: number;
  refresh: () => void;
}

const PASS_PACK_SIZE = 10;
const SUBSCRIPTION_WINDOW_DAYS = 30;

export const useEligibility = (): Eligibility => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [passCreditsRemaining, setPassCreditsRemaining] = useState(0);
  const [totalPassCredits, setTotalPassCredits] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setHasActiveSubscription(false);
      setSubscriptionExpiresAt(null);
      setPassCreditsRemaining(0);
      setTotalPassCredits(0);
      return;
    }
    const { data } = await supabase
      .from("bookings")
      .select("tier, created_at, status")
      .eq("user_id", user.id)
      .neq("status", "cancelled");

    const bookings = data ?? [];
    const now = Date.now();
    const windowMs = SUBSCRIPTION_WINDOW_DAYS * 86_400_000;

    const subs = bookings.filter((b) => b.tier === "subscription");
    const mostRecentSub = subs
      .map((b) => new Date(b.created_at).getTime())
      .sort((a, b) => b - a)[0];
    const active = !!mostRecentSub && now - mostRecentSub < windowMs;
    setHasActiveSubscription(active);
    setSubscriptionExpiresAt(active ? new Date(mostRecentSub + windowMs) : null);

    const passCount = bookings.filter((b) => b.tier === "pass").length;
    // 10-pack model: first pass booking creates a pack (10 credits, 1 used).
    // A new pack is created every PASS_PACK_SIZE bookings.
    const packs = passCount === 0 ? 0 : Math.ceil(passCount / PASS_PACK_SIZE);
    const total = packs * PASS_PACK_SIZE;
    setTotalPassCredits(total);
    setPassCreditsRemaining(Math.max(0, total - passCount));

    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return {
    loading,
    hasActiveSubscription,
    subscriptionExpiresAt,
    passCreditsRemaining,
    totalPassCredits,
    refresh: load,
  };
};
