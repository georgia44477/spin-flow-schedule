import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { StudioClass } from "@/data/classes";
import { cn } from "@/lib/utils";
import { Clock, Users, ChevronDown, ShieldCheck, FileWarning, Sparkles, Ticket, CreditCard } from "lucide-react";
import WaiverModal from "@/components/WaiverModal";
import PaymentModal from "@/components/PaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEligibility } from "@/hooks/useEligibility";

interface ClassCardProps {
  studioClass: StudioClass;
  accessories?: { label: string; price: number }[];
  discount?: number;
  discountCode?: string;
  waiverSigned?: boolean;
  onBook: (classId: string, tier: string) => void;
}

const ClassCard = ({ studioClass, accessories = [], discount = 0, discountCode = "", waiverSigned = false, onBook }: ClassCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const eligibility = useEligibility();
  const [expanded, setExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isGripping, setIsGripping] = useState(false);
  const [gripComplete, setGripComplete] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const gripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spotsLeft = studioClass.spotsTotal - studioClass.spotsTaken;
  const isFull = spotsLeft <= 0;
  const isLow = spotsLeft <= 3 && spotsLeft > 0;

  const tiers = [
    { key: "drop-in", label: "Drop-in", price: studioClass.dropInPrice },
    { key: "pass", label: "Class Pass", price: studioClass.passPrice, note: "10-class pack" },
    { key: "subscription", label: "Monthly", price: studioClass.subscriptionPrice, note: "/class" },
  ];

  const defaultTier = eligibility.hasActiveSubscription
    ? "subscription"
    : eligibility.passCreditsRemaining > 0
      ? "pass"
      : null;

  // Auto-select best tier once eligibility loads and card expands
  useEffect(() => {
    if (expanded && !selectedTier && defaultTier) {
      setSelectedTier(defaultTier);
    }
  }, [expanded, selectedTier, defaultTier]);

  const selectedTierData = tiers.find((t) => t.key === selectedTier);

  const startGrip = useCallback(() => {
    if (!selectedTier || isFull) return;
    if (!user) {
      toast.info("Sign in to book a class");
      navigate("/auth");
      return;
    }
    setIsGripping(true);
    gripTimer.current = setTimeout(async () => {
      setIsGripping(false);
      // Check if user has signed the waiver before
      const { data: profile } = await supabase
        .from("profiles")
        .select("waiver_signed_at")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.waiver_signed_at) {
        setShowPayment(true);
      } else {
        setShowWaiver(true);
      }
    }, 1500);
  }, [selectedTier, isFull, user, navigate]);

  const handleWaiverSign = useCallback(() => {
    setShowWaiver(false);
    setShowPayment(true);
  }, []);

  const handleWaiverCancel = useCallback(() => {
    setShowWaiver(false);
  }, []);

  const handlePaymentConfirm = useCallback(async () => {
    if (!selectedTierData || !selectedTier) return;
    const accessoriesTotal = accessories.reduce((s, a) => s + a.price, 0);
    const total = selectedTierData.price + accessoriesTotal - accessoriesTotal * (discount / 100);

    const { error } = await supabase.rpc("book_class", {
      _class_id: studioClass.id,
      _tier: selectedTier as "drop-in" | "pass" | "subscription",
      _total_amount: total,
      _discount_code: discountCode || null,
      _discount_percent: discount || 0,
    });

    if (error) {
      toast.error(error.message);
      setShowPayment(false);
      return;
    }
    setShowPayment(false);
    setGripComplete(true);
    toast.success("Booked!", { description: `${studioClass.title} confirmed.` });
    eligibility.refresh();
    onBook(studioClass.id, selectedTier);
  }, [studioClass.id, studioClass.title, selectedTier, selectedTierData, accessories, discount, discountCode, onBook, eligibility]);

  const handlePaymentCancel = useCallback(() => {
    setShowPayment(false);
  }, []);

  const endGrip = useCallback(() => {
    if (gripTimer.current) clearTimeout(gripTimer.current);
    setIsGripping(false);
  }, []);

  return (
    <motion.div
      layout
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-300",
        isFull ? "opacity-50" : "",
        expanded ? "card-spotlight bg-card" : "bg-card/80 hover:bg-card"
      )}
    >
      {/* Main row */}
      <button
        onClick={() => !isFull && setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start gap-5"
        disabled={isFull}
      >
        <div className="flex-shrink-0 w-16 text-center">
          <span className="font-body text-xl font-semibold text-foreground">{studioClass.time}</span>
          <div className="flex items-center gap-1 mt-1 justify-center text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-body">{studioClass.duration}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg tracking-wide text-foreground">{studioClass.title}</h3>
          <p className="font-body text-sm text-muted-foreground mt-0.5">{studioClass.instructor}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn(
              "font-body text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm",
              studioClass.level === "Advanced" ? "bg-accent/20 text-accent" :
              studioClass.level === "Intro" ? "bg-primary/15 text-primary" :
              "bg-secondary text-muted-foreground"
            )}>
              {studioClass.level}
            </span>
            <span className={cn(
              "flex items-center gap-1 font-body text-xs",
              isFull ? "text-accent" : isLow ? "text-primary" : "text-muted-foreground"
            )}>
              <Users className="w-3 h-3" />
              {isFull ? "Full" : `${spotsLeft} spots`}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {user && !eligibility.loading && eligibility.hasActiveSubscription ? (
            <span className="flex items-center gap-1 font-body text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-primary/15 text-primary">
              <Sparkles className="w-3 h-3" /> Included
            </span>
          ) : user && !eligibility.loading && eligibility.passCreditsRemaining > 0 ? (
            <span className="flex items-center gap-1 font-body text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
              <Ticket className="w-3 h-3" /> Uses 1 credit
            </span>
          ) : (
            <span className="font-body text-sm text-muted-foreground">
              from <span className="text-primary font-semibold">${studioClass.subscriptionPrice}</span>
            </span>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </div>
      </button>

      {/* Expanded section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border/50">
              <p className="font-body text-sm text-muted-foreground mt-4 mb-4 leading-relaxed">
                {studioClass.description}
              </p>

              {/* Capacity bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    Capacity
                  </span>
                  <span className={cn(
                    "font-body text-xs",
                    isFull ? "text-accent" : isLow ? "text-primary" : "text-muted-foreground"
                  )}>
                    {studioClass.spotsTaken} / {studioClass.spotsTotal} booked
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      isFull ? "bg-accent" : isLow ? "bg-primary" : "bg-primary/60"
                    )}
                    style={{ width: `${Math.min(100, (studioClass.spotsTaken / studioClass.spotsTotal) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Waiver status */}
              {user && (
                <div className={cn(
                  "flex items-center gap-2 mb-4 px-3 py-2 rounded-md text-xs font-body",
                  waiverSigned
                    ? "bg-primary/10 text-primary/90 border border-primary/20"
                    : "bg-accent/10 text-accent border border-accent/20"
                )}>
                  {waiverSigned ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Waiver on file — you'll go straight to payment
                    </>
                  ) : (
                    <>
                      <FileWarning className="w-3.5 h-3.5" />
                      One-time waiver required before your first booking
                    </>
                  )}
                </div>
              )}

              {/* Eligibility banner */}
              {user && !eligibility.loading && (
                <div className={cn(
                  "flex items-center gap-2 mb-4 px-3 py-2 rounded-md text-xs font-body border",
                  eligibility.hasActiveSubscription
                    ? "bg-primary/10 text-primary/90 border-primary/20"
                    : eligibility.passCreditsRemaining > 0
                      ? "bg-primary/5 text-foreground/80 border-primary/15"
                      : "bg-secondary/40 text-muted-foreground border-border"
                )}>
                  {eligibility.hasActiveSubscription ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Monthly membership active
                      {eligibility.subscriptionExpiresAt && (
                        <span className="text-muted-foreground">
                          · renews {eligibility.subscriptionExpiresAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                      <span className="ml-auto text-primary font-semibold">This class is covered</span>
                    </>
                  ) : eligibility.passCreditsRemaining > 0 ? (
                    <>
                      <Ticket className="w-3.5 h-3.5 text-primary" />
                      {eligibility.passCreditsRemaining} of {eligibility.totalPassCredits} pass credits remaining
                      <span className="ml-auto text-primary font-semibold">Uses 1 credit</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      No active pass or membership · pay per class or buy a pack
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-5">
                {tiers.map((tier) => {
                  const covered = tier.key === "subscription" && eligibility.hasActiveSubscription;
                  const usesCredit = tier.key === "pass" && eligibility.passCreditsRemaining > 0;
                  const suggested = defaultTier === tier.key;
                  return (
                    <button
                      key={tier.key}
                      onClick={() => setSelectedTier(tier.key)}
                      className={cn(
                        "relative rounded-md p-3 text-center transition-all duration-200 border",
                        selectedTier === tier.key
                          ? "border-primary bg-primary/10"
                          : suggested
                            ? "border-primary/40 hover:border-primary/60"
                            : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      {suggested && selectedTier !== tier.key && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm bg-primary text-primary-foreground font-body text-[8px] tracking-[0.15em] uppercase">
                          Best
                        </span>
                      )}
                      <span className="font-body text-[10px] tracking-[0.15em] uppercase text-muted-foreground block">
                        {tier.label}
                      </span>
                      <span className={cn(
                        "font-body text-xl font-bold block mt-1",
                        (covered || usesCredit) && "line-through opacity-60 text-muted-foreground",
                        selectedTier === tier.key && !(covered || usesCredit) ? "text-primary" : "text-foreground"
                      )}>
                        ${tier.price}
                      </span>
                      {covered ? (
                        <span className="font-body text-[10px] text-primary block mt-0.5">Included</span>
                      ) : usesCredit ? (
                        <span className="font-body text-[10px] text-primary block mt-0.5">1 credit</span>
                      ) : tier.note ? (
                        <span className="font-body text-[10px] text-muted-foreground block">{tier.note}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <button
                  onMouseDown={startGrip}
                  onMouseUp={endGrip}
                  onMouseLeave={endGrip}
                  onTouchStart={startGrip}
                  onTouchEnd={endGrip}
                  disabled={!selectedTier || gripComplete}
                  className={cn(
                    "relative w-full py-4 rounded-md font-body text-sm tracking-[0.15em] uppercase overflow-hidden transition-all",
                    gripComplete
                      ? "bg-primary text-primary-foreground"
                      : selectedTier
                        ? "bg-secondary text-foreground border border-primary/30 cursor-grab active:cursor-grabbing"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isGripping && (
                    <motion.div
                      className="absolute inset-0 grip-fill"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  )}
                  <span className="relative z-10">
                    {gripComplete
                      ? "Booked ✓"
                      : !selectedTier
                        ? "Select a tier"
                        : selectedTier === "subscription" && eligibility.hasActiveSubscription
                          ? "Hold to book — included"
                          : selectedTier === "pass" && eligibility.passCreditsRemaining > 0
                            ? "Hold to use 1 credit"
                            : "Hold to confirm"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWaiver && (
          <WaiverModal
            isOpen={showWaiver}
            classTitle={studioClass.title}
            tier={selectedTierData?.label || ""}
            onSign={handleWaiverSign}
            onCancel={handleWaiverCancel}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPayment && selectedTierData && (
          <PaymentModal
            isOpen={showPayment}
            classTitle={studioClass.title}
            tier={selectedTierData.label}
            tierPrice={selectedTierData.price}
            accessories={accessories}
            discount={discount}
            discountCode={discountCode}
            onConfirm={handlePaymentConfirm}
            onCancel={handlePaymentCancel}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClassCard;
