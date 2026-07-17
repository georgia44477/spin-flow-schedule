import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; logo_uri?: string };
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  redirect_uri?: string;
};

// Local typed wrapper for beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 space-y-3">
          <h1 className="font-display text-2xl text-foreground">Authorization error</h1>
          <p className="font-body text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-body text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const redirectHost = (() => {
    try {
      return new URL(details.redirect_uri ?? details.redirect_url ?? details.redirect_to ?? "https://x").host;
    } catch {
      return null;
    }
  })();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <p className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Authorize connection
          </p>
          <h1 className="font-display text-2xl tracking-wide text-foreground">
            Connect {clientName} to Studio Roxx
          </h1>
        </div>

        <div className="space-y-3 text-sm font-body text-muted-foreground">
          <p>
            <span className="text-foreground">{clientName}</span> will be able to call Studio Roxx
            tools while you are signed in — browsing classes, viewing your bookings, and booking
            or cancelling on your behalf.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Share your basic profile</li>
            <li>Share your email address</li>
            <li>Read and manage your bookings</li>
          </ul>
          {redirectHost && (
            <p className="text-xs">Redirect: <span className="text-foreground">{redirectHost}</span></p>
          )}
          <p className="text-xs">
            This does not bypass Studio Roxx permissions or backend policies.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-3 rounded-md border border-border bg-secondary text-foreground font-body text-sm tracking-[0.15em] uppercase disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 py-3 rounded-md bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase disabled:opacity-50"
          >
            {busy ? "…" : "Approve"}
          </button>
        </div>
      </div>
    </main>
  );
}
