import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import StudioHeader from "@/components/StudioHeader";
import DateScrubber from "@/components/DateScrubber";
import ClassCard from "@/components/ClassCard";
import AccessoriesDrawer from "@/components/AccessoriesDrawer";
import { generateSchedule, discountCodes } from "@/data/classes";

const Index = () => {
  const schedule = useMemo(() => generateSchedule(new Date(), 14), []);
  const [selectedDay, setSelectedDay] = useState(() => {
    // Default to first day with classes
    const idx = schedule.findIndex((d) => d.classes.length > 0);
    return idx >= 0 ? idx : 0;
  });

  const [cart, setCart] = useState<Record<string, number>>({});
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const classListRef = useRef<HTMLDivElement>(null);

  const currentDay = schedule[selectedDay];

  const handleBook = useCallback((classId: string, tier: string) => {
    toast.success(`Booked! Tier: ${tier}`, {
      description: `Class ${classId} confirmed.`,
    });
  }, []);

  const toggleAccessory = useCallback((id: string) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }, []);

  const applyCode = useCallback((code: string) => {
    const disc = discountCodes[code];
    if (disc) {
      setDiscountCode(code);
      setDiscount(disc);
      toast.success(`Code applied: ${disc}% off accessories`);
    }
  }, []);

  const clearCode = useCallback(() => {
    setDiscountCode("");
    setDiscount(0);
  }, []);

  // Scroll class list to top when changing day
  useEffect(() => {
    classListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedDay]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudioHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Date Scrubber (sticky) */}
        <aside className="w-[28%] min-w-[200px] max-w-[280px] border-r border-border/50 overflow-y-auto scrollbar-hide py-4 flex-shrink-0">
          <DateScrubber
            schedule={schedule}
            selectedIndex={selectedDay}
            onSelect={setSelectedDay}
          />
        </aside>

        {/* Right: Class cards */}
        <main ref={classListRef} className="flex-1 overflow-y-auto scrollbar-hide pb-24">
          <div className="px-6 py-6">
            {/* Day header */}
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="font-display text-3xl tracking-wide text-foreground">
                {currentDay.dayLabel}
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                {currentDay.classes.length === 0
                  ? "No classes scheduled"
                  : `${currentDay.classes.length} class${currentDay.classes.length > 1 ? "es" : ""} available`}
              </p>

              {/* Spotlight ambient glow */}
              <div
                className="absolute top-20 right-10 w-96 h-96 rounded-full pointer-events-none opacity-30"
                style={{ background: "var(--spotlight-glow)" }}
              />
            </motion.div>

            {/* Class list */}
            <div className="mt-8 flex flex-col gap-4 relative">
              {currentDay.classes.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                  <ClassCard studioClass={c} onBook={handleBook} />
                </motion.div>
              ))}

              {currentDay.classes.length === 0 && (
                <div className="py-20 text-center">
                  <p className="font-display text-xl text-muted-foreground/50">Rest day</p>
                  <p className="font-body text-sm text-muted-foreground/30 mt-2">The studio is closed today</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <AccessoriesDrawer
        cart={cart}
        onToggleItem={toggleAccessory}
        discount={discount}
        discountCode={discountCode}
        onApplyCode={applyCode}
        onClearCode={clearCode}
      />
    </div>
  );
};

export default Index;
