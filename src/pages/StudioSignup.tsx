import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import appIcon from "/app-icon-512.png";

const TIERS = [
  { id: "starter", name: "Starter", price: 49 },
  { id: "growth", name: "Growth", price: 119 },
  { id: "studio-pro", name: "Studio Pro", price: 249 },
];

export default function StudioSignup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    studio_name: "",
    owner_name: "",
    email: "",
    city: "",
    plan_tier: TIERS.find((t) => t.id === params.get("tier"))?.id ?? "growth",
    billing_cycle: "monthly",
    notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studio_name || !form.owner_name || !form.email) {
      toast.error("Please fill in the required fields.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("studio_leads").insert({
      studio_name: form.studio_name,
      owner_name: form.owner_name,
      email: form.email,
      city: form.city || null,
      plan_tier: form.plan_tier,
      billing_cycle: form.billing_cycle,
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't submit — please try again.");
      return;
    }
    navigate("/for-studios/welcome");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/for-studios" className="flex items-center gap-3">
            <img src={appIcon} alt="Studio Roxx" width={32} height={32} className="rounded-md" />
            <span className="font-display tracking-wider">STUDIO ROXX</span>
          </Link>
          <Link to="/for-studios" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <div className="mb-10">
          <p className="text-primary text-xs tracking-widest uppercase mb-3">Start your free trial</p>
          <h1 className="font-display text-4xl md:text-5xl mb-4">Tell us about your studio.</h1>
          <p className="text-muted-foreground">
            14 days on the house. No card required. We'll email your workspace login within one business day.
          </p>
        </div>

        <Card className="p-8 bg-card/60 border-border/60">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studio_name">Studio name *</Label>
                <Input id="studio_name" required value={form.studio_name} onChange={(e) => update("studio_name", e.target.value)} placeholder="Vertigo Pole Studio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Brooklyn, NY" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_name">Your name *</Label>
                <Input id="owner_name" required value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} placeholder="Roxanne Vega" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email *</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@studio.com" />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Choose your plan</Label>
              <RadioGroup value={form.plan_tier} onValueChange={(v) => update("plan_tier", v)} className="grid md:grid-cols-3 gap-3">
                {TIERS.map((t) => (
                  <label
                    key={t.id}
                    htmlFor={`tier-${t.id}`}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      form.plan_tier === t.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id={`tier-${t.id}`} value={t.id} />
                      <div>
                        <div className="font-display">{t.name}</div>
                        <div className="text-xs text-muted-foreground">${t.price}/mo</div>
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Billing</Label>
              <RadioGroup value={form.billing_cycle} onValueChange={(v) => update("billing_cycle", v)} className="grid grid-cols-2 gap-3">
                <label htmlFor="bill-monthly" className={`cursor-pointer rounded-lg border p-4 transition-colors ${form.billing_cycle === "monthly" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem id="bill-monthly" value="monthly" />
                    <div className="font-body text-sm">Monthly</div>
                  </div>
                </label>
                <label htmlFor="bill-yearly" className={`cursor-pointer rounded-lg border p-4 transition-colors ${form.billing_cycle === "yearly" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem id="bill-yearly" value="yearly" />
                    <div className="font-body text-sm">Yearly <span className="text-primary text-xs">(save 2 months)</span></div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Anything we should know?</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="How many members? Migrating from another platform?" rows={3} />
            </div>

            <Button type="submit" size="lg" className="w-full font-body h-12" disabled={submitting}>
              {submitting ? "Submitting…" : "Start my 14-day free trial"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              By continuing you agree to our terms. We'll never share your details.
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}
