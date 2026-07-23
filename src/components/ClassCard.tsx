import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { StudioClass } from "@/data/classes";
import { cn } from "@/lib/utils";
import { Clock, Users, ChevronDown, ShieldCheck, FileWarning, CheckCircle2 } from "lucide-react";
import WaiverModal from "@/components/WaiverModal";
import PaymentModal from "@/components/PaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClassCardProps {
  studioClass: StudioClass;
  waiverSigned?: boolean;
  alreadyBooked?: boolean;
  embed?: boolean;
  onBook: () => void;
}

const ClassCard = ({ studioClass, waiverSigned = false, alreadyBooked = false, embed = false, onBook }: ClassCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"drop-in" | "pass" | "subscription">("drop-in");
  const [isGripping, setIsGripping] = useState(false);
  const [gripComplete, setGripComplete] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const gripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spotsLeft = studioClass.spotsTotal - studioClass.spotsTaken;
  const isFull = spotsLeft <= 0;
  const isLow = spotsLeft <= 3 && spotsLeft > 0;

  const tiers = [
    { key: "drop-in" as const, label: "Drop-in", price: studioClass.dropInPrice, note: "Single class" },
    { key: "pass" as const, label: "Class Pass", price: studioClass.passPrice, note: "Prepaid rate" },
    { key: "subscription" as const, label: "Monthly", price: studioClass.subscriptionPrice, note: "Member rate" },
  ];

  const selectedTierData = tiers.find((t) => t.key === selectedTier)!;

  const startGrip = useCallback(() => {
    if (isFull || alreadyBooked) return;
    if (embed) {
      toast.info("Open the full studio site to book");
      return;
    }
    if (!user) {
      toast.info("Sign in to reserve a spot");
      navigate("/auth");
      return;
    }
    setIsGripping(true);
    gripTimer.current = setTimeout(async () => {
      setIsGripping(false);
      const { data: profile } = await supabase.from("profiles").select("waiver_signed_at").eq("id", user.id).maybeSingle();
      if (profile?.waiver_signed_at) setShowPayment(true);
      else setShowWaiver(true);
    }, 1500);
  }, [isFull, alreadyBooked, embed, user, navigate]);

  const endGrip = useCallback(() => {
    if (gripTimer.current) clearTimeout(gripTimer.current);
    setIsGripping(false);
  }, []);

  const handleReservationConfirm = useCallback(
    async (discountCode: string | null) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("book_class", {
        _class_id: studioClass.id,
        _tier: selectedTier,
        _discount_code: discountCode,
      });
      if (error) {
        toast.error(error.message);
        setShowPayment(false);
        return;
      }
      setShowPayment(false);
      setGripComplete(true);
      toast.success("Reserved!", { description: `${studioClass.title} — pay at the studio.` });
      onBook();
    },
    [studioClass.id, studioClass.title, selectedTier, onBook]
  );

  return (
    <motion.div
      layout
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-300",
        (isFull || alreadyBooked) && !expanded ? "opacity-70" : "",
        expanded ? "card-spotlight bg-card" : "bg-card/80 hover:bg-card"
      )}
    >
      <button
        onClick={() => !isFull && setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start gap-5"
        disabled={isFull && !alreadyBooked}
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
          {alreadyBooked ? (
            <span className="flex items-center gap-1 font-body text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-primary/15 text-primary">
              <CheckCircle2 className="w-3 h-3" /> Reserved
            </span>
          ) : (
            <span className="font-body text-sm text-muted-foreground">
              from <span className="text-primary font-semibold">${studioClass.subscriptionPrice}</span>
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", expanded && "rotate-180")} />
        </div>
      </button>

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
              <p className="font-body text-sm text-muted-foreground mt-4 mb-4 leading-relaxed">{studioClass.description}</p>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Capacity</span>
                  <span className={cn("font-body text-xs", isFull ? "text-accent" : isLow ? "text-primary" : "text-muted-foreground")}>
                    {studioClass.spotsTaken} / {studioClass.spotsTotal} booked
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full transition-all", isFull ? "bg-accent" : isLow ? "bg-primary" : "bg-primary/60")}
                    style={{ width: `${Math.min(100, (studioClass.spotsTaken / studioClass.spotsTotal) * 100)}%` }}
                  />
                </div>
              </div>

              {user && !alreadyBooked && !embed && (
                <div className={cn(
                  "flex items-center gap-2 mb-4 px-3 py-2 rounded-md text-xs font-body",
                  waiverSigned ? "bg-primary/10 text-primary/90 border border-primary/20" : "bg-accent/10 text-accent border border-accent/20"
                )}>
                  {waiverSigned ? (
                    <><ShieldCheck className="w-3.5 h-3.5" /> Waiver on file — you'll go straight to reservation</>
                  ) : (
                    <><FileWarning className="w-3.5 h-3.5" /> One-time waiver required before your first booking</>
                  )}
                </div>
              )}

              {alreadyBooked ? (
                <div className="rounded-md bg-primary/10 border border-primary/30 p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-body text-sm text-foreground">You're reserved for this class.</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Pay at the studio when you arrive.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {tiers.map((tier) => (
                      <button
                        key={tier.key}
                        onClick={() => setSelectedTier(tier.key)}
                        className={cn(
                          "relative rounded-md p-3 text-center transition-all duration-200 border",
                          selectedTier === tier.key ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"
                        )}
                      >
                        <span className="font-body text-[10px] tracking-[0.15em] uppercase text-muted-foreground block">{tier.label}</span>
                        <span className={cn(
                          "font-body text-xl font-bold block mt-1",
                          selectedTier === tier.key ? "text-primary" : "text-foreground"
                        )}>
                          ${tier.price}
                        </span>
                        <span className="font-body text-[10px] text-muted-foreground block">{tier.note}</span>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 mb-4">
                    <p className="font-body text-[11px] text-muted-foreground text-center">
                      You'll reserve your spot now and <span className="text-foreground font-semibold">pay at the studio</span> when you arrive.
                    </p>
                  </div>

                  <div className="relative">
                    <button
                      onMouseDown={startGrip}
                      onMouseUp={endGrip}
                      onMouseLeave={endGrip}
                      onTouchStart={startGrip}
                      onTouchEnd={endGrip}
                      disabled={isFull || gripComplete}
                      className={cn(
                        "relative w-full py-4 rounded-md font-body text-sm tracking-[0.15em] uppercase overflow-hidden transition-all",
                        gripComplete
                          ? "bg-primary text-primary-foreground"
                          : isFull
                            ? "bg-secondary text-muted-foreground cursor-not-allowed"
                            : "bg-secondary text-foreground border border-primary/30 cursor-grab active:cursor-grabbing"
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
                        {gripComplete ? "Reserved ✓" : isFull ? "Full" : "Hold to reserve"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWaiver && (
          <WaiverModal
            isOpen={showWaiver}
            classTitle={studioClass.title}
            tier={selectedTierData.label}
            onSign={() => { setShowWaiver(false); setShowPayment(true); }}
            onCancel={() => setShowWaiver(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            isOpen={showPayment}
            classTitle={studioClass.title}
            tier={selectedTierData.label}
            tierPrice={selectedTierData.price}
            onConfirm={handleReservationConfirm}
            onCancel={() => setShowPayment(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClassCard;
