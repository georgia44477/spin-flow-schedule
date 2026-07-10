import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Calendar, CreditCard, ShieldCheck, Smartphone, Users, Sparkles } from "lucide-react";
import appIcon from "/app-icon-512.png";

const features = [
  { icon: Calendar, title: "Class scheduling", body: "Weekly recurring classes, capacity caps, waitlists, and instructor rosters — all in one dashboard." },
  { icon: CreditCard, title: "Memberships & passes", body: "Sell monthly memberships, 5/10-class packs, and drop-ins. Stripe handles the payments." },
  { icon: ShieldCheck, title: "Waivers built in", body: "Digital waiver collection on first booking. No paper, no chasing signatures." },
  { icon: Smartphone, title: "Member booking app", body: "A cinematic, installable app your students actually want to open." },
  { icon: Users, title: "Studio dashboard", body: "See today's classes, who booked, and revenue at a glance." },
  { icon: Sparkles, title: "Your brand, elevated", body: "Dark, chiaroscuro aesthetic tuned for pole. Custom branding on Studio Pro." },
];

const tiers = [
  {
    name: "Starter",
    price: 49,
    yearly: 490,
    tagline: "Perfect for a single studio getting started.",
    features: ["Up to 100 active members", "1 location", "Class scheduling & bookings", "Stripe payments", "Email support"],
  },
  {
    name: "Growth",
    price: 119,
    yearly: 1190,
    tagline: "For studios ready to scale their community.",
    features: ["Up to 500 active members", "Up to 3 locations", "Memberships + class passes", "Digital waivers", "Priority email support"],
    highlight: true,
  },
  {
    name: "Studio Pro",
    price: 249,
    yearly: 2490,
    tagline: "For established studios and multi-location brands.",
    features: ["Unlimited members & locations", "Custom branding", "Advanced reporting", "Dedicated onboarding", "Priority support"],
  },
];

const faqs = [
  { q: "Is there really a free trial?", a: "Yes — every plan includes a 14-day free trial. No credit card required to start." },
  { q: "Can my members download an app?", a: "Yes. The member booking experience is installable on iOS and Android straight from the browser — no App Store account or waiting on Apple review. Native store submissions are on our roadmap." },
  { q: "How do payouts work?", a: "You connect your own Stripe account. Members pay you directly and Stripe deposits into your bank." },
  { q: "Can I migrate my existing members?", a: "Yes. Studio Pro includes dedicated onboarding and CSV member import." },
];

export default function ForStudios() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-40 bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/for-studios" className="flex items-center gap-3">
            <img src={appIcon} alt="Studio Roxx" width={36} height={36} className="rounded-lg" />
            <span className="font-display text-xl tracking-wider">STUDIO ROXX</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/" className="hover:text-foreground transition-colors">Member app</Link>
          </nav>
          <Link to="/for-studios/signup">
            <Button className="font-body">Start free trial</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-70 pointer-events-none"
          style={{ background: "var(--spotlight-glow)" }}
        />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs tracking-widest uppercase mb-6">
              <Sparkles className="w-3 h-3" /> Software for pole studios
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6">
              Run your pole studio<br />
              <span className="text-primary">like the stage it is.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
              Studio Roxx gives you class scheduling, memberships, waivers, and a cinematic booking app your students will actually open. Set up in an afternoon, no credit card required.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/for-studios/signup">
                <Button size="lg" className="font-body text-base h-12 px-8">Start 14-day free trial</Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="font-body text-base h-12 px-8">See pricing</Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-6 tracking-wider uppercase">
              No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <p className="text-primary text-xs tracking-widest uppercase mb-4">Everything a studio needs</p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight">One platform. From schedule to spotlight.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="p-8 bg-card/60 border-border/60 hover:border-primary/40 transition-colors">
                <f.icon className="w-8 h-8 text-primary mb-5" />
                <h3 className="font-display text-xl mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 border-t border-border/40 relative">
        <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ background: "var(--card-glow)" }} />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <p className="text-primary text-xs tracking-widest uppercase mb-4">Pricing</p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight mb-4">Simple pricing. Free for 14 days.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Every plan includes the full platform. Upgrade or downgrade anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <Card
                key={t.name}
                className={`p-8 flex flex-col ${
                  t.highlight
                    ? "border-primary/60 bg-card ring-1 ring-primary/40 shadow-[0_0_60px_-15px_hsl(43_56%_52%/0.35)]"
                    : "border-border/60 bg-card/60"
                }`}
              >
                {t.highlight && (
                  <div className="text-xs tracking-widest uppercase text-primary mb-3">Most popular</div>
                )}
                <h3 className="font-display text-2xl mb-2">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 min-h-[2.5rem]">{t.tagline}</p>
                <div className="mb-6">
                  <span className="font-display text-5xl">${t.price}</span>
                  <span className="text-muted-foreground text-sm ml-2">/ month</span>
                  <div className="text-xs text-muted-foreground mt-1">or ${t.yearly}/yr — save 2 months</div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`/for-studios/signup?tier=${t.name.toLowerCase().replace(" ", "-")}`}>
                  <Button
                    className="w-full font-body"
                    variant={t.highlight ? "default" : "outline"}
                    size="lg"
                  >
                    Start free trial
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary text-xs tracking-widest uppercase mb-4">FAQ</p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight">Questions, answered.</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <Card key={f.q} className="p-6 bg-card/60 border-border/60">
                <h3 className="font-display text-lg mb-2">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 md:py-28 border-t border-border/40 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-4xl md:text-5xl mb-6">Step into the spotlight.</h2>
          <p className="text-muted-foreground mb-8">Start your 14-day free trial. No card required.</p>
          <Link to="/for-studios/signup">
            <Button size="lg" className="font-body text-base h-12 px-10">Start free trial</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="font-display tracking-widest">STUDIO ROXX</div>
          <div>© {new Date().getFullYear()} Studio Roxx. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
