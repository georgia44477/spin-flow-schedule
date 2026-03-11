import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, Zap, Crown, Star, CreditCard, ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import StudioHeader from "@/components/StudioHeader";

interface MembershipPlan {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  annualPrice: number;
  classesPerWeek: string;
  features: string[];
  highlighted?: boolean;
  color: "default" | "gold" | "crimson";
}

const plans: MembershipPlan[] = [
  {
    id: "essentials",
    name: "Essentials",
    tagline: "Start your journey",
    icon: <Zap className="w-5 h-5" />,
    monthlyPrice: 79,
    annualPrice: 69,
    classesPerWeek: "2 classes / week",
    color: "default",
    features: [
      "Access to Intro & Foundations classes",
      "Online booking priority (24h advance)",
      "Grip aid included in studio",
      "Community access",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    tagline: "Own the pole",
    icon: <Crown className="w-5 h-5" />,
    monthlyPrice: 139,
    annualPrice: 119,
    classesPerWeek: "Unlimited classes",
    highlighted: true,
    color: "gold",
    features: [
      "All class levels & styles",
      "Priority booking (48h advance)",
      "10% off all accessories",
      "Guest pass (1/month)",
      "Open practice sessions",
      "Instructor workshops",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Train like a performer",
    icon: <Star className="w-5 h-5" />,
    monthlyPrice: 199,
    annualPrice: 169,
    classesPerWeek: "Unlimited + Privates",
    color: "crimson",
    features: [
      "Everything in Unlimited",
      "2 private sessions / month",
      "Video progress tracking",
      "Performance showcase entry",
      "20% off all accessories",
      "Early access to new classes",
    ],
  },
];

const classPacks = [
  { id: "5-pack", count: 5, price: 130, perClass: 26, savings: 0 },
  { id: "10-pack", count: 10, price: 240, perClass: 24, savings: 40 },
  { id: "20-pack", count: 20, price: 440, perClass: 22, savings: 120 },
];

const Memberships = () => {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isGripping, setIsGripping] = useState(false);
  const [gripComplete, setGripComplete] = useState<string | null>(null);
  const [autoPayEnabled, setAutoPayEnabled] = useState(true);

  let gripTimer: ReturnType<typeof setTimeout> | null = null;

  const startGrip = useCallback((planId: string) => {
    setIsGripping(true);
    setSelectedPlan(planId);
    gripTimer = setTimeout(() => {
      setGripComplete(planId);
      setIsGripping(false);
      toast.success("Membership activated!", {
        description: `Auto-pay ${billing} subscription confirmed.`,
      });
    }, 1500);
  }, [billing]);

  const endGrip = useCallback(() => {
    if (gripTimer) clearTimeout(gripTimer);
    setIsGripping(false);
  }, []);

  const handlePackPurchase = useCallback((packId: string) => {
    toast.success("Class pack purchased!", {
      description: `Your ${packId} has been added to your account.`,
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudioHeader />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero */}
        <section className="relative px-6 pt-12 pb-16 text-center overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: "var(--spotlight-glow)" }}
          />
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-body text-xs tracking-wider uppercase text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to schedule
          </Link>
          <h2 className="font-display text-4xl md:text-5xl tracking-wide text-foreground">
            Memberships
          </h2>
          <p className="font-body text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
            Commit to your practice. Every membership includes auto-pay for seamless, uninterrupted access.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "font-body text-sm tracking-wider uppercase transition-colors px-4 py-2 rounded-md",
                billing === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "font-body text-sm tracking-wider uppercase transition-colors px-4 py-2 rounded-md relative",
                billing === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="absolute -top-2 -right-2 font-body text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                Save
              </span>
            </button>
          </div>
        </section>

        {/* Plans */}
        <section className="px-6 pb-12">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan, i) => {
              const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
              const isActive = gripComplete === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={cn(
                    "relative rounded-lg overflow-hidden flex flex-col",
                    plan.highlighted ? "card-spotlight" : "",
                    plan.highlighted ? "border border-primary/30" : "border border-border"
                  )}
                >
                  {plan.highlighted && (
                    <div className="bg-primary text-primary-foreground font-body text-[10px] tracking-[0.2em] uppercase text-center py-1.5">
                      Most Popular
                    </div>
                  )}

                  <div className="bg-card p-6 flex flex-col flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        "w-10 h-10 rounded-md flex items-center justify-center",
                        plan.color === "gold" ? "bg-primary/15 text-primary" :
                        plan.color === "crimson" ? "bg-accent/20 text-accent" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {plan.icon}
                      </div>
                      <div>
                        <h3 className="font-display text-xl text-foreground">{plan.name}</h3>
                        <p className="font-body text-[11px] text-muted-foreground">{plan.tagline}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className={cn(
                          "font-body text-4xl font-bold",
                          plan.color === "gold" ? "text-primary" :
                          plan.color === "crimson" ? "text-accent" :
                          "text-foreground"
                        )}>
                          ${price}
                        </span>
                        <span className="font-body text-sm text-muted-foreground">/mo</span>
                      </div>
                      {billing === "annual" && (
                        <p className="font-body text-xs text-muted-foreground mt-1">
                          <span className="line-through">${plan.monthlyPrice}/mo</span>
                          <span className="text-primary ml-2">
                            Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                          </span>
                        </p>
                      )}
                      <p className="font-body text-xs text-muted-foreground mt-1">{plan.classesPerWeek}</p>
                    </div>

                    {/* Features */}
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

                    {/* Auto-pay indicator */}
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-secondary/50">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-body text-[11px] text-muted-foreground">
                        Auto-pay {billing} · Cancel anytime
                      </span>
                      <Shield className="w-3 h-3 text-primary ml-auto" />
                    </div>

                    {/* Grip subscribe button */}
                    <button
                      onMouseDown={() => startGrip(plan.id)}
                      onMouseUp={endGrip}
                      onMouseLeave={endGrip}
                      onTouchStart={() => startGrip(plan.id)}
                      onTouchEnd={endGrip}
                      disabled={isActive}
                      className={cn(
                        "relative w-full py-4 rounded-md font-body text-sm tracking-[0.15em] uppercase overflow-hidden transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : plan.highlighted
                            ? "bg-secondary border border-primary/40 text-foreground cursor-grab active:cursor-grabbing"
                            : "bg-secondary border border-border text-foreground cursor-grab active:cursor-grabbing"
                      )}
                    >
                      {isGripping && selectedPlan === plan.id && (
                        <motion.div
                          className="absolute inset-0 grip-fill"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      )}
                      <span className="relative z-10">
                        {isActive ? "Subscribed ✓" : "Hold to subscribe"}
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Class Packs */}
        <section className="px-6 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="font-display text-2xl tracking-wide text-foreground">Class Packs</h3>
              <p className="font-body text-sm text-muted-foreground mt-2">
                No commitment. Buy classes in bulk and save.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classPacks.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                  className="bg-card border border-border rounded-lg p-5 flex flex-col"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <h4 className="font-display text-lg text-foreground">{pack.count}-Class Pack</h4>
                    {pack.savings > 0 && (
                      <span className="font-body text-[10px] tracking-wider uppercase text-primary">
                        Save ${pack.savings}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-body text-3xl font-bold text-foreground">${pack.price}</span>
                  </div>
                  <p className="font-body text-xs text-muted-foreground mb-5">${pack.perClass} per class</p>
                  <button
                    onClick={() => handlePackPurchase(pack.id)}
                    className="mt-auto w-full py-3 rounded-md font-body text-sm tracking-[0.1em] uppercase bg-secondary border border-border text-foreground hover:border-primary/40 transition-colors"
                  >
                    Purchase
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Drop-in note */}
            <p className="text-center font-body text-xs text-muted-foreground mt-8">
              Single drop-in classes available from $28. Pricing shown at booking.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Memberships;
