import { motion } from "framer-motion";
import { ArrowLeft, Check, Zap, Crown, Star } from "lucide-react";
import { Link } from "react-router-dom";
import StudioHeader from "@/components/StudioHeader";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "essentials",
    name: "Essentials",
    tagline: "Start your journey",
    icon: <Zap className="w-5 h-5" />,
    price: "$79",
    frequency: "/mo",
    color: "default" as const,
    features: [
      "2 classes per week",
      "Access to Intro & Foundations",
      "Online booking priority",
      "Community access",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    tagline: "Own the pole",
    icon: <Crown className="w-5 h-5" />,
    price: "$139",
    frequency: "/mo",
    highlighted: true,
    color: "gold" as const,
    features: [
      "Unlimited classes",
      "All levels and styles",
      "Guest pass (1/month)",
      "Open practice access",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Train like a performer",
    icon: <Star className="w-5 h-5" />,
    price: "$199",
    frequency: "/mo",
    color: "crimson" as const,
    features: [
      "Everything in Unlimited",
      "2 private sessions / month",
      "Performance showcase entry",
      "Early access to new classes",
    ],
  },
];

const Memberships = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <StudioHeader />

    <main className="flex-1 overflow-y-auto scrollbar-hide">
      <section className="relative px-6 pt-12 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: "var(--spotlight-glow)" }} />
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-body text-xs tracking-wider uppercase text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to schedule
        </Link>
        <h2 className="font-display text-4xl md:text-5xl tracking-wide text-foreground">Memberships & Class Packs</h2>
        <p className="font-body text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
          Sign up in-studio or reach out to the front desk. Reserve your spots online, then pay for your pack or
          membership when you arrive.
        </p>
      </section>

      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                "relative rounded-lg overflow-hidden flex flex-col border",
                plan.highlighted ? "card-spotlight border-primary/30" : "border-border"
              )}
            >
              {plan.highlighted && (
                <div className="bg-primary text-primary-foreground font-body text-[10px] tracking-[0.2em] uppercase text-center py-1.5">
                  Most Popular
                </div>
              )}
              <div className="bg-card p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-md flex items-center justify-center",
                      plan.color === "gold" ? "bg-primary/15 text-primary" :
                      plan.color === "crimson" ? "bg-accent/20 text-accent" :
                      "bg-secondary text-muted-foreground"
                    )}
                  >
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-foreground">{plan.name}</h3>
                    <p className="font-body text-[11px] text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "font-body text-4xl font-bold",
                      plan.color === "gold" ? "text-primary" :
                      plan.color === "crimson" ? "text-accent" :
                      "text-foreground"
                    )}>
                      {plan.price}
                    </span>
                    <span className="font-body text-sm text-muted-foreground">{plan.frequency}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      <Check className={cn(
                        "w-3.5 h-3.5 mt-0.5 flex-shrink-0",
                        plan.color === "gold" ? "text-primary" :
                        plan.color === "crimson" ? "text-accent" :
                        "text-muted-foreground"
                      )} />
                      <span className="font-body text-sm text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2">
                  <p className="font-body text-[11px] text-muted-foreground text-center">
                    Purchase at the front desk to activate.
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-display text-2xl tracking-wide text-foreground">Class Packs</h3>
          <p className="font-body text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Ask the front desk about our 5-, 10-, and 20-class packs — the more you buy, the lower the per-class rate.
            Passes are activated in-person and applied automatically when you check in for a reserved class.
          </p>
        </div>
      </section>
    </main>
  </div>
);

export default Memberships;
