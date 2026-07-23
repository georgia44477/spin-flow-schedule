import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, List } from "lucide-react";
import StudioHeader from "@/components/StudioHeader";
import DateScrubber from "@/components/DateScrubber";
import ClassCard from "@/components/ClassCard";
import ClassFilters, { type FilterState } from "@/components/ClassFilters";
import MonthCalendar from "@/components/MonthCalendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DaySchedule } from "@/data/classes";
import { buildSchedule, timeBucket, type DbClass } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const Index = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";

  const [dbClasses, setDbClasses] = useState<DbClass[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [userBookings, setUserBookings] = useState<Set<string>>(new Set());
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filters, setFilters] = useState<FilterState>({ levels: [], instructors: [], times: [] });
  const classListRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 30);

    const [{ data: classes, error: cErr }, availRes, myRes] = await Promise.all([
      supabase.from("classes").select("*").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at"),
      supabase.rpc("class_availability", { _from: from.toISOString(), _to: to.toISOString() }),
      user
        ? supabase.from("bookings").select("class_id").eq("user_id", user.id).eq("status", "confirmed")
        : Promise.resolve({ data: [] as { class_id: string }[] }),
    ]);

    if (cErr) toast.error(cErr.message);
    setDbClasses((classes as DbClass[]) ?? []);

    const counts: Record<string, number> = {};
    ((availRes.data as { class_id: string; confirmed_count: number }[]) ?? []).forEach((r) => {
      counts[r.class_id] = r.confirmed_count;
    });
    setBookingCounts(counts);

    const mine = new Set<string>();
    ((myRes.data as { class_id: string }[]) ?? []).forEach((b) => mine.add(b.class_id));
    setUserBookings(mine);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) {
      setWaiverSigned(false);
      return;
    }
    supabase.from("profiles").select("waiver_signed_at").eq("id", user.id).maybeSingle()
      .then(({ data }) => setWaiverSigned(!!data?.waiver_signed_at));
  }, [user]);

  const schedule = useMemo<DaySchedule[]>(
    () => buildSchedule(dbClasses, bookingCounts, new Date(), 30),
    [dbClasses, bookingCounts]
  );

  const { allLevels, allInstructors } = useMemo(() => {
    const l = new Set<string>();
    const i = new Set<string>();
    dbClasses.forEach((c) => { l.add(c.level); i.add(c.instructor); });
    return { allLevels: Array.from(l), allInstructors: Array.from(i) };
  }, [dbClasses]);

  const filteredSchedule = useMemo<DaySchedule[]>(() => {
    const anyActive = filters.levels.length + filters.instructors.length + filters.times.length > 0;
    if (!anyActive) return schedule;
    return schedule.map((day) => ({
      ...day,
      classes: day.classes.filter((c) => {
        if (filters.levels.length && !filters.levels.includes(c.level)) return false;
        if (filters.instructors.length && !filters.instructors.includes(c.instructor)) return false;
        if (filters.times.length && !filters.times.includes(timeBucket(c.time))) return false;
        return true;
      }),
    }));
  }, [schedule, filters]);

  useEffect(() => {
    if (filteredSchedule.length && filteredSchedule[selectedDay]?.classes.length === 0) {
      const idx = filteredSchedule.findIndex((d) => d.classes.length > 0);
      if (idx >= 0) setSelectedDay(idx);
    }
  }, [filteredSchedule, selectedDay]);

  const currentDay = filteredSchedule[selectedDay];

  const handleBooked = useCallback(() => {
    loadData();
    if (user) setWaiverSigned(true);
  }, [loadData, user]);

  useEffect(() => {
    classListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedDay]);

  const selectFromCalendar = useCallback((d: Date) => {
    const idx = filteredSchedule.findIndex((day) => day.date.toDateString() === d.toDateString());
    if (idx >= 0) { setSelectedDay(idx); setView("list"); }
  }, [filteredSchedule]);

  if (loading || !currentDay) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!embed && <StudioHeader />}
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-muted-foreground">Loading schedule…</p>
        </div>
      </div>
    );
  }

  const ViewToggle = () => (
    <div className="inline-flex p-1 bg-secondary/60 rounded-md">
      {[
        { key: "list" as const, label: "List", Icon: List },
        { key: "calendar" as const, label: "Calendar", Icon: CalendarDays },
      ].map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => setView(key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-body text-[10px] tracking-[0.15em] uppercase transition-all",
            view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!embed && <StudioHeader />}

      <div className="flex-1 flex overflow-hidden">
        {view === "list" && (
          <aside className="w-[28%] min-w-[200px] max-w-[280px] border-r border-border/50 overflow-y-auto scrollbar-hide py-4 flex-shrink-0">
            <DateScrubber schedule={filteredSchedule} selectedIndex={selectedDay} onSelect={setSelectedDay} />
          </aside>
        )}

        <main ref={classListRef} className="flex-1 overflow-y-auto scrollbar-hide pb-24">
          <div className="px-6 py-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <motion.div
                key={view === "calendar" ? "cal" : selectedDay}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="font-display text-3xl tracking-wide text-foreground">
                  {view === "calendar" ? "Browse the Month" : currentDay.dayLabel}
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {view === "calendar"
                    ? "Pick a day to see available classes"
                    : currentDay.classes.length === 0
                      ? "No classes match your filters"
                      : `${currentDay.classes.length} class${currentDay.classes.length > 1 ? "es" : ""} available`}
                </p>
              </motion.div>
              <ViewToggle />
            </div>

            <ClassFilters allLevels={allLevels} allInstructors={allInstructors} value={filters} onChange={setFilters} />

            {view === "calendar" ? (
              <MonthCalendar schedule={filteredSchedule} selectedDate={currentDay.date} onSelect={selectFromCalendar} />
            ) : (
              <div className="mt-2 flex flex-col gap-4 relative">
                {currentDay.classes.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <ClassCard
                      studioClass={c}
                      onBook={handleBooked}
                      waiverSigned={waiverSigned}
                      alreadyBooked={userBookings.has(c.id)}
                      embed={embed}
                    />
                  </motion.div>
                ))}

                {currentDay.classes.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="font-display text-xl text-muted-foreground/50">
                      {filters.levels.length + filters.instructors.length + filters.times.length > 0 ? "No classes match" : "Rest day"}
                    </p>
                    <p className="font-body text-sm text-muted-foreground/30 mt-2">
                      Try clearing filters or picking another day
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
