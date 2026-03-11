import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { accessories, discountCodes } from "@/data/classes";
import { cn } from "@/lib/utils";
import { ShoppingBag, ChevronUp, Tag, X } from "lucide-react";

interface AccessoriesDrawerProps {
  cart: Record<string, number>;
  onToggleItem: (id: string) => void;
  discount: number;
  discountCode: string;
  onApplyCode: (code: string) => void;
  onClearCode: () => void;
}

const AccessoriesDrawer = ({ cart, onToggleItem, discount, discountCode, onApplyCode, onClearCode }: AccessoriesDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = accessories.reduce((sum, a) => sum + (cart[a.id] || 0) * a.price, 0);
  const discountedTotal = cartTotal * (1 - discount / 100);

  const handleApplyCode = () => {
    const trimmed = codeInput.trim().toUpperCase();
    if (trimmed.length === 0) return;
    if (trimmed.length > 20) {
      setCodeError("Code too long");
      return;
    }
    if (discountCodes[trimmed] !== undefined) {
      onApplyCode(trimmed);
      setCodeError("");
      setCodeInput("");
    } else {
      setCodeError("Invalid code");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-3 bg-card border-t border-border backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <span className="font-body text-sm text-foreground">Accessories & Add-ons</span>
          {cartCount > 0 && (
            <span className="font-body text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {cartCount}
            </span>
          )}
        </div>
        <ChevronUp className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* Drawer content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-card border-t border-border"
          >
            <div className="px-6 py-5">
              {/* Swipeable accessories */}
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                {accessories.map((item) => {
                  const inCart = (cart[item.id] || 0) > 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onToggleItem(item.id)}
                      className={cn(
                        "flex-shrink-0 w-36 rounded-lg p-4 text-left transition-all border",
                        inCart ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <span className="text-2xl block mb-2">{item.image}</span>
                      <span className="font-body text-sm text-foreground block leading-tight">{item.name}</span>
                      <span className="font-body text-[11px] text-muted-foreground block mt-1">{item.description}</span>
                      <span className={cn(
                        "font-body text-sm font-semibold block mt-2",
                        inCart ? "text-primary" : "text-foreground"
                      )}>
                        ${item.price}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Discount code */}
              <div className="flex items-center gap-3 mt-3">
                <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                {discountCode ? (
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm text-primary">
                      {discountCode} (−{discount}%)
                    </span>
                    <button onClick={onClearCode}>
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={codeInput}
                      onChange={(e) => {
                        setCodeInput(e.target.value);
                        setCodeError("");
                      }}
                      placeholder="Discount code"
                      maxLength={20}
                      className="font-body text-sm bg-secondary border-none outline-none text-foreground placeholder:text-muted-foreground px-3 py-2 rounded-md flex-1"
                    />
                    <button
                      onClick={handleApplyCode}
                      className="font-body text-xs tracking-wider uppercase text-primary hover:text-foreground transition-colors"
                    >
                      Apply
                    </button>
                  </>
                )}
                {codeError && <span className="font-body text-xs text-accent">{codeError}</span>}
              </div>

              {/* Cart total */}
              {cartCount > 0 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="font-body text-sm text-muted-foreground">
                    {cartCount} item{cartCount > 1 ? "s" : ""}
                  </span>
                  <div className="text-right">
                    {discount > 0 && (
                      <span className="font-body text-xs text-muted-foreground line-through mr-2">${cartTotal.toFixed(2)}</span>
                    )}
                    <span className="font-body text-lg font-bold text-primary">${discountedTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccessoriesDrawer;
