import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, AlertTriangle, ChevronDown } from "lucide-react";

interface WaiverModalProps {
  isOpen: boolean;
  classTitle: string;
  tier: string;
  onSign: () => void;
  onCancel: () => void;
}

const WAIVER_TEXT = `ASSUMPTION OF RISK & RELEASE OF LIABILITY WAIVER

VERTIGO POLE & DANCE STUDIO

By signing this waiver, I acknowledge and agree to the following:

1. ASSUMPTION OF RISK
I understand that pole dancing, aerial fitness, and related activities involve inherent risks including but not limited to: bruising, muscle strains, sprains, friction burns, falls, and other physical injuries. I voluntarily assume all risks associated with participation in classes, open practice sessions, and studio events.

2. PHYSICAL CONDITION
I confirm that I am in adequate physical condition to participate in the activities offered. I have disclosed any medical conditions, injuries, or limitations to my instructor prior to class. I understand it is my responsibility to stop participation if I feel pain, discomfort, or dizziness.

3. RELEASE OF LIABILITY
I hereby release, discharge, and hold harmless Vertigo Pole & Dance Studio, its owners, instructors, employees, and agents from any and all claims, damages, losses, or injuries arising from my participation in studio activities, whether caused by negligence or otherwise.

4. PHOTO & VIDEO CONSENT
I consent to being photographed or recorded during classes and events for promotional purposes. I may opt out of this at any time by notifying studio management in writing.

5. STUDIO POLICIES
- I will arrive at least 5 minutes before class start time
- I understand that late arrivals may not be admitted
- I will not use lotions, oils, or moisturizers on class days as they affect pole grip
- I will wear appropriate attire that allows skin contact with the pole
- I will treat all studio equipment with care and report any damage immediately

6. CANCELLATION POLICY
Classes must be cancelled at least 4 hours in advance. Late cancellations and no-shows will result in forfeiture of the class credit or drop-in fee.

7. MEDICAL EMERGENCY
In the event of a medical emergency, I authorize studio staff to contact emergency services and provide first aid as needed. Emergency contact information will be kept on file.

8. ACKNOWLEDGMENT
I have read and fully understand this waiver. I acknowledge that I am signing this document voluntarily and that it is binding upon myself, my heirs, and legal representatives.`;

const WaiverModal = ({ isOpen, classTitle, tier, onSign, onCancel }: WaiverModalProps) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [isGripping, setIsGripping] = useState(false);
  const [signed, setSigned] = useState(false);
  const gripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      setScrolledToBottom(true);
    }
  };

  const canSign = scrolledToBottom && agreed && signatureName.trim().length >= 2;

  const startGrip = () => {
    if (!canSign) return;
    setIsGripping(true);
    gripTimer.current = setTimeout(() => {
      setSigned(true);
      setIsGripping(false);
      setTimeout(() => onSign(), 600);
    }, 1500);
  };

  const endGrip = () => {
    if (gripTimer.current) clearTimeout(gripTimer.current);
    setIsGripping(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-lg flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-display text-xl tracking-wide text-foreground">Waiver & Release</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            <span className="text-foreground">{classTitle}</span> · {tier} booking
          </p>
        </div>

        {/* Waiver text */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-6 py-4 scrollbar-hide"
            style={{ maxHeight: "40vh" }}
          >
            <pre className="font-body text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">
              {WAIVER_TEXT}
            </pre>
          </div>

          {/* Scroll indicator */}
          {!scrolledToBottom && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent flex items-end justify-center pb-2 pointer-events-none">
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-1 text-muted-foreground"
              >
                <ChevronDown className="w-4 h-4" />
                <span className="font-body text-[10px] tracking-wider uppercase">Scroll to read</span>
              </motion.div>
            </div>
          )}
        </div>

        {/* Sign section */}
        <div className="px-6 py-5 border-t border-border/50 flex-shrink-0 space-y-4">
          {/* Important notice */}
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-accent/10 border border-accent/20">
            <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="font-body text-xs text-foreground/70 leading-relaxed">
              By signing, you acknowledge you have read and agree to all terms above. This waiver is required before your first class.
            </p>
          </div>

          {/* Agree checkbox */}
          <label className={cn(
            "flex items-center gap-3 cursor-pointer",
            !scrolledToBottom && "opacity-40 pointer-events-none"
          )}>
            <div
              onClick={() => setAgreed(!agreed)}
              className={cn(
                "w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all flex-shrink-0",
                agreed ? "bg-primary border-primary" : "border-muted-foreground/40"
              )}
            >
              {agreed && <span className="text-primary-foreground text-xs font-bold">✓</span>}
            </div>
            <span className="font-body text-sm text-foreground">
              I have read and agree to the waiver terms
            </span>
          </label>

          {/* Signature input */}
          <div className={cn(!agreed && "opacity-40 pointer-events-none")}>
            <label className="font-body text-[10px] tracking-[0.15em] uppercase text-muted-foreground block mb-1.5">
              Type your full name to sign
            </label>
            <input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Your full name"
              maxLength={100}
              disabled={!agreed}
              className="w-full font-display text-lg tracking-wide bg-secondary border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors italic"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="font-body text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors px-4 py-3"
            >
              Cancel
            </button>

            <button
              onMouseDown={startGrip}
              onMouseUp={endGrip}
              onMouseLeave={endGrip}
              onTouchStart={startGrip}
              onTouchEnd={endGrip}
              disabled={!canSign || signed}
              className={cn(
                "relative flex-1 py-4 rounded-md font-body text-sm tracking-[0.15em] uppercase overflow-hidden transition-all",
                signed
                  ? "bg-primary text-primary-foreground"
                  : canSign
                    ? "bg-secondary border border-primary/30 text-foreground cursor-grab active:cursor-grabbing"
                    : "bg-secondary text-muted-foreground/40 cursor-not-allowed border border-border"
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
                {signed ? "Signed ✓" : canSign ? "Hold to sign & proceed" : "Complete all fields"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WaiverModal;
