import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import StudioHeader from "@/components/StudioHeader";
import DateScrubber from "@/components/DateScrubber";
import ClassCard from "@/components/ClassCard";
import AccessoriesDrawer from "@/components/AccessoriesDrawer";
import { supabase } from "@/integrations/supabase/client";
import { discountCodes, accessories as allAccessories, type DaySchedule, type StudioClass } from "@/data/classes";

interface DbClass {
  id: string;
  title: string;
  instructor: string;
  description: string;
  level: StudioClass["level"];
  starts_at: string;
  duration_minutes: number;
  spots_total: number;
  drop_in_price: number;
  pass_price: number;
  subscription_price: number;
}

const Index = () => {
  const [dbClasses, setDbClasses] = useState<DbClass[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const classListRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);

    const [{ data: classes, error: cErr }, { data: bookings }] = await Promise.all([
      supabase
        .from("classes")
        .select("*")
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString())
        .order("starts_at"),
      supabase.from("bookings").select("class_id").eq("status", "confirmed"),
    ]);

    if (cErr) toast.error(cErr.message);
    setDbClasses((classes as DbClass[]) ?? []);
    const counts: Record<string, number> = {};
    (bookings ?? []).forEach((b: { class_id: string }) => {
      counts[b.class_id] = (counts[b.class_id] ?? 0) + 1;
    });
    setBookingCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const schedule = useMemo<DaySchedule[]>(() => {
    const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const days: DaySchedule[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86400000;
      const dayClasses: StudioClass[] = dbClasses
        .filter((c) => {
          const t = new Date(c.starts_at).getTime();
          return t >= dayStart && t < dayEnd;
        })
        .map((c) => ({
          id: c.id,
          title: c.title,
          instructor: c.instructor,
          time: format(new Date(c.starts_at), "HH:mm"),
          duration: `${c.duration_minutes} min`,
          level: c.level,
          spotsTotal: c.spots_total,
          spotsTaken: bookingCounts[c.id] ?? 0,
          description: c.description,
          dropInPrice: Number(c.drop_in_price),
          passPrice: Number(c.pass_price),
          subscriptionPrice: Number(c.subscription_price),
        }));
      days.push({
        date: d,
        dayLabel: `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
        classes: dayClasses,
      });
    }
    return days;
  }, [dbClasses, bookingCounts]);

  useEffect(() => {
    if (schedule.length && schedule[selectedDay]?.classes.length === 0) {
      const idx = schedule.findIndex((d) => d.classes.length > 0);
      if (idx >= 0) setSelectedDay(idx);
    }
  }, [schedule, selectedDay]);

  const currentDay = schedule[selectedDay];

  const handleBooked = useCallback(() => {
    loadData();
  }, [loadData]);

  const toggleAccessory = useCallback((id: string) => {
    setCart((prev) => {
      if (prev[id]) {
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

  useEffect(() => {
    classListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedDay]);

  if (loading || !currentDay) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StudioHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-muted-foreground">Loading schedule…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudioHeader />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[28%] min-w-[200px] max-w-[280px] border-r border-border/50 overflow-y-auto scrollbar-hide py-4 flex-shrink-0">
          <DateScrubber schedule={schedule} selectedIndex={selectedDay} onSelect={setSelectedDay} />
        </aside>

        <main ref={classListRef} className="flex-1 overflow-y-auto scrollbar-hide pb-24">
          <div className="px-6 py-6">
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
              <div
                className="absolute top-20 right-10 w-96 h-96 rounded-full pointer-events-none opacity-30"
                style={{ background: "var(--spotlight-glow)" }}
              />
            </motion.div>

            <div className="mt-8 flex flex-col gap-4 relative">
              {currentDay.classes.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                  <ClassCard
                    studioClass={c}
                    onBook={handleBooked}
                    accessories={Object.entries(cart)
                      .filter(([, qty]) => qty > 0)
                      .map(([id]) => {
                        const acc = allAccessories.find((a) => a.id === id);
                        return acc ? { label: acc.name, price: acc.price } : null;
                      })
                      .filter(Boolean) as { label: string; price: number }[]}
                    discount={discount}
                    discountCode={discountCode}
                  />
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
