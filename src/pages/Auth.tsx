import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const safeNext = (raw: string | null) => {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
};

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate(next, { replace: true });
  }, [user, authLoading, navigate, next]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const redirectUrl = window.location.origin + next;
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate(next, { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + next });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate(next, { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-8">
          <h1 className="font-display text-3xl tracking-[0.08em] text-foreground">STUDIO SCHEDULER</h1>
          <p className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-1">
            Book · Move · Belong
          </p>
        </Link>

        <div className="bg-card border border-border rounded-lg p-6 space-y-5">
          <div className="flex gap-2 p-1 bg-secondary rounded-md">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2 font-body text-xs tracking-[0.15em] uppercase rounded-sm transition-all",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full py-3 rounded-md border border-border bg-secondary hover:bg-secondary/70 font-body text-sm text-foreground transition-colors disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="font-body text-[10px] tracking-wider uppercase text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="w-full font-body text-sm bg-secondary border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full font-body text-sm bg-secondary border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full font-body text-sm bg-secondary border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-md bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase disabled:opacity-50"
            >
              {busy ? "…" : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
