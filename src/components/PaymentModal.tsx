import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Ticket, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  isOpen: boolean;
  classTitle: string;
  tier: string;
  tierPrice: number;
  onConfirm: (discountCode: string | null) => void | Promise<void>;
  onCancel: () => void;
}

const PaymentModal = ({ isOpen, classTitle, tier, tierPrice, onConfirm, onCancel }: PaymentModalProps) => {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; percent: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isGripping, setIsGripping] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const gripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const percentOff = applied?.percent ?? 0;
  const discountAmount = tierPrice * (percentOff / 100);
  const total = Math.max(0, tierPrice - discountAmount);

  const applyCode = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setChecking(true);
    setCodeError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("check_discount_code", { _code: trimmed });
    setChecking(false);
    if (error) { setCodeError(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.valid) {
      setApplied({ code: trimmed, percent: row.percent_off });
      setCodeError(null);
    } else {
      setApplied(null);
      setCodeError(row?.reason || "Invalid code");
    }
  }, [code]);

  const startGrip = useCallback(() => {
    setIsGripping(true);
    gripTimer.current = setTimeout(async () => {
      setIsGripping(false);
      setConfirmed(true);
      await onConfirm(applied?.code ?? null);
    }, 1500);
  }, [applied, onConfirm]);

  const endGrip = useCallback(() => {
    if (gripTimer.current) clearTimeout(gripTimer.current);
    setIsGripping(false);
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide bg-card border border-border rounded-lg"
      >
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3 mb-1">
            <Check className="w-5 h-5 text-primary" />
            <h3 className="font-display text-xl tracking-wide text-foreground">Reserve your spot</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            Confirm your reservation — you'll pay at the studio when you arrive.
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
            <p className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-1">Pay at studio</p>
            <p className="font-body text-sm text-foreground/80">
              No card required now. Bring cash, card, or an active class pass / membership when you check in.
            </p>
          </div>

          <div>
            <h4 className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Reservation</h4>
            <div className="bg-secondary/50 rounded-md p-4 space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="font-body text-sm text-foreground truncate">{classTitle}</span>
                  <span className="font-body text-[10px] tracking-wider uppercase text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                    {tier}
                  </span>
                </div>
                <span className="font-body text-sm font-semibold text-foreground">${tierPrice.toFixed(2)}</span>
              </div>

              {applied && (
                <div className="flex justify-between items-center pt-1 border-t border-border/30">
                  <span className="font-body text-sm text-primary flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5" /> {applied.code} · −{applied.percent}%
                  </span>
                  <span className="font-body text-sm text-primary">−${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="font-body text-sm font-semibold text-foreground">Due at studio</span>
                <span className="font-body text-xl font-bold text-primary">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
              Discount code (optional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeError(null); }}
                  placeholder="ENTER CODE"
                  maxLength={40}
                  disabled={!!applied}
                  className={cn(
                    "w-full font-body text-sm bg-secondary border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none tracking-widest",
                    codeError ? "border-accent" : "border-border focus:border-primary/40",
                    applied && "opacity-70"
                  )}
                />
                {applied && (
                  <button
                    onClick={() => { setApplied(null); setCode(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-accent"
                    aria-label="Remove code"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={applyCode}
                disabled={checking || !code.trim() || !!applied}
                className="px-4 py-3 rounded-md bg-primary/15 border border-primary/30 font-body text-xs tracking-[0.15em] uppercase text-primary disabled:opacity-50"
              >
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </button>
            </div>
            {codeError && <p className="font-body text-xs text-accent mt-1.5">{codeError}</p>}
          </div>

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
              disabled={confirmed}
              className={cn(
                "relative flex-1 py-4 rounded-md font-body text-sm tracking-[0.15em] uppercase overflow-hidden transition-all",
                confirmed
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary border border-primary/30 text-foreground cursor-grab active:cursor-grabbing"
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
              <span className="relative z-10 flex items-center justify-center gap-2">
                {confirmed ? (<><Check className="w-4 h-4" /> Reservation confirmed</>) : "Hold to confirm reservation"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PaymentModal;
