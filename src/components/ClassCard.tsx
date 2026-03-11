import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StudioClass } from "@/data/classes";
import { cn } from "@/lib/utils";
import { Clock, Users, ChevronDown } from "lucide-react";
import WaiverModal from "@/components/WaiverModal";

interface ClassCardProps {
  studioClass: StudioClass;
  onBook: (classId: string, tier: string) => void;
}

const ClassCard = ({ studioClass, onBook }: ClassCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isGripping, setIsGripping] = useState(false);
  const [gripComplete, setGripComplete] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const gripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spotsLeft = studioClass.spotsTotal - studioClass.spotsTaken;
  const isFull = spotsLeft <= 0;
  const isLow = spotsLeft <= 3 && spotsLeft > 0;

  const tiers = [
    { key: "drop-in", label: "Drop-in", price: studioClass.dropInPrice },
    { key: "pass", label: "Class Pass", price: studioClass.passPrice, note: "10-class pack" },
    { key: "subscription", label: "Monthly", price: studioClass.subscriptionPrice, note: "/class" },
  ];

  const startGrip = useCallback(() => {
    if (!selectedTier || isFull) return;
    setIsGripping(true);
    gripTimer.current = setTimeout(() => {
      setGripComplete(true);
      setIsGripping(false);
      onBook(studioClass.id, selectedTier);
    }, 1500);
  }, [selectedTier, isFull, studioClass.id, onBook]);

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
        {/* Time block */}
        <div className="flex-shrink-0 w-16 text-center">
          <span className="font-body text-xl font-semibold text-foreground">{studioClass.time}</span>
          <div className="flex items-center gap-1 mt-1 justify-center text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-body">{studioClass.duration}</span>
          </div>
        </div>

        {/* Details */}
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

        {/* Price hint + chevron */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="font-body text-sm text-muted-foreground">
            from <span className="text-primary font-semibold">${studioClass.subscriptionPrice}</span>
          </span>
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
              <p className="font-body text-sm text-muted-foreground mt-4 mb-5 leading-relaxed">
                {studioClass.description}
              </p>

              {/* Pricing tiers */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {tiers.map((tier) => (
                  <button
                    key={tier.key}
                    onClick={() => setSelectedTier(tier.key)}
                    className={cn(
                      "rounded-md p-3 text-center transition-all duration-200 border",
                      selectedTier === tier.key
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/40"
                    )}
                  >
                    <span className="font-body text-[10px] tracking-[0.15em] uppercase text-muted-foreground block">
                      {tier.label}
                    </span>
                    <span className={cn(
                      "font-body text-xl font-bold block mt-1",
                      selectedTier === tier.key ? "text-primary" : "text-foreground"
                    )}>
                      ${tier.price}
                    </span>
                    {tier.note && (
                      <span className="font-body text-[10px] text-muted-foreground block">{tier.note}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Grip booking button */}
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
                  {/* Fill animation */}
                  {isGripping && (
                    <motion.div
                      className="absolute inset-0 grip-fill"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  )}
                  <span className="relative z-10">
                    {gripComplete ? "Booked ✓" : selectedTier ? "Hold to confirm" : "Select a tier"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClassCard;
