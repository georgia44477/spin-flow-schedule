import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CreditCard, Lock, ShoppingBag, Check, ChevronRight } from "lucide-react";

interface CartItem {
  label: string;
  price: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  classTitle: string;
  tier: string;
  tierPrice: number;
  accessories?: CartItem[];
  discount?: number;
  discountCode?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const PaymentModal = ({
  isOpen,
  classTitle,
  tier,
  tierPrice,
  accessories = [],
  discount = 0,
  discountCode = "",
  onConfirm,
  onCancel,
}: PaymentModalProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [isGripping, setIsGripping] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const gripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accessoriesTotal = accessories.reduce((sum, a) => sum + a.price, 0);
  const subtotal = tierPrice + accessoriesTotal;
  const discountAmount = accessoriesTotal * (discount / 100);
  const total = subtotal - discountAmount;

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 13 || digits.length > 16) errs.cardNumber = "Invalid card number";
    if (cardExpiry.length < 5) errs.cardExpiry = "Invalid expiry";
    if (cardCvc.length < 3) errs.cardCvc = "Invalid CVC";
    if (cardName.trim().length < 2) errs.cardName = "Name required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const startGrip = useCallback(() => {
    if (!validate()) return;
    setIsGripping(true);
    gripTimer.current = setTimeout(() => {
      setConfirmed(true);
      setIsGripping(false);
      setTimeout(() => onConfirm(), 800);
    }, 1500);
  }, [cardNumber, cardExpiry, cardCvc, cardName, onConfirm]);

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
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3 mb-1">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-display text-xl tracking-wide text-foreground">Payment</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            Complete your booking for <span className="text-foreground">{classTitle}</span>
          </p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Order Summary */}
          <div>
            <h4 className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Order Summary
            </h4>
            <div className="bg-secondary/50 rounded-md p-4 space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-primary" />
                  <span className="font-body text-sm text-foreground">{classTitle}</span>
                  <span className="font-body text-[10px] tracking-wider uppercase text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                    {tier}
                  </span>
                </div>
                <span className="font-body text-sm font-semibold text-foreground">${tierPrice.toFixed(2)}</span>
              </div>

              {accessories.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                    <span className="font-body text-sm text-foreground/70">{item.label}</span>
                  </div>
                  <span className="font-body text-sm text-foreground/70">${item.price.toFixed(2)}</span>
                </div>
              ))}

              {discount > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-border/30">
                  <span className="font-body text-sm text-primary">
                    Discount ({discountCode} −{discount}%)
                  </span>
                  <span className="font-body text-sm text-primary">−${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="font-body text-sm font-semibold text-foreground">Total</span>
                <span className="font-body text-xl font-bold text-primary">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Card Form */}
          <div>
            <h4 className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Card Details
            </h4>
            <div className="space-y-3">
              {/* Card Name */}
              <div>
                <input
                  value={cardName}
                  onChange={(e) => { setCardName(e.target.value); setErrors((p) => ({ ...p, cardName: "" })); }}
                  placeholder="Name on card"
                  maxLength={100}
                  className={cn(
                    "w-full font-body text-sm bg-secondary border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors",
                    errors.cardName ? "border-accent" : "border-border focus:border-primary/40"
                  )}
                />
                {errors.cardName && <p className="font-body text-xs text-accent mt-1">{errors.cardName}</p>}
              </div>

              {/* Card Number */}
              <div>
                <div className="relative">
                  <input
                    value={cardNumber}
                    onChange={(e) => { setCardNumber(formatCardNumber(e.target.value)); setErrors((p) => ({ ...p, cardNumber: "" })); }}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className={cn(
                      "w-full font-body text-sm bg-secondary border rounded-md pl-4 pr-12 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors tracking-wider",
                      errors.cardNumber ? "border-accent" : "border-border focus:border-primary/40"
                    )}
                  />
                  <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                </div>
                {errors.cardNumber && <p className="font-body text-xs text-accent mt-1">{errors.cardNumber}</p>}
              </div>

              {/* Expiry + CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    value={cardExpiry}
                    onChange={(e) => { setCardExpiry(formatExpiry(e.target.value)); setErrors((p) => ({ ...p, cardExpiry: "" })); }}
                    placeholder="MM/YY"
                    maxLength={5}
                    className={cn(
                      "w-full font-body text-sm bg-secondary border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors tracking-wider",
                      errors.cardExpiry ? "border-accent" : "border-border focus:border-primary/40"
                    )}
                  />
                  {errors.cardExpiry && <p className="font-body text-xs text-accent mt-1">{errors.cardExpiry}</p>}
                </div>
                <div>
                  <input
                    value={cardCvc}
                    onChange={(e) => { setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4)); setErrors((p) => ({ ...p, cardCvc: "" })); }}
                    placeholder="CVC"
                    maxLength={4}
                    className={cn(
                      "w-full font-body text-sm bg-secondary border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors tracking-wider",
                      errors.cardCvc ? "border-accent" : "border-border focus:border-primary/40"
                    )}
                  />
                  {errors.cardCvc && <p className="font-body text-xs text-accent mt-1">{errors.cardCvc}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50">
            <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="font-body text-[11px] text-muted-foreground">
              Encrypted & secure. Your card details are never stored.
            </span>
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
                {confirmed ? (
                  <>
                    <Check className="w-4 h-4" />
                    Payment confirmed
                  </>
                ) : (
                  `Hold to pay $${total.toFixed(2)}`
                )}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PaymentModal;
