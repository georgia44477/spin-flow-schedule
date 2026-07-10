import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DaySchedule } from "@/data/classes";

interface MonthCalendarProps {
  schedule: DaySchedule[];
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const MonthCalendar = ({ schedule, selectedDate, onSelect }: MonthCalendarProps) => {
  const [cursor, setCursor] = useState(startOfMonth(selectedDate));

  const daysInGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startDay = first.getDay(); // 0 sun
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const countByDay = useMemo(() => {
    const map = new Map<string, { count: number; hasSpots: boolean }>();
    schedule.forEach((day) => {
      const key = day.date.toDateString();
      const hasSpots = day.classes.some((c) => c.spotsTotal - c.spotsTaken > 0);
      map.set(key, { count: day.classes.length, hasSpots });
    });
    return map;
  }, [schedule]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="bg-card/60 border border-border/50 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="p-2 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-display text-xl tracking-wide text-foreground uppercase">{monthLabel}</h3>
        <button
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="p-2 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 py-1"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysInGrid.map((d, i) => {
          if (!d) return <div key={i} />;
          const info = countByDay.get(d.toDateString());
          const isPast = d < today;
          const isToday = d.toDateString() === today.toDateString();
          const isSelected = d.toDateString() === selectedDate.toDateString();
          const hasClasses = info && info.count > 0;
          return (
            <button
              key={i}
              onClick={() => hasClasses && !isPast && onSelect(d)}
              disabled={!hasClasses || isPast}
              className={cn(
                "aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 relative transition-all",
                isSelected && "bg-primary/20 border border-primary",
                !isSelected && hasClasses && !isPast && "hover:bg-secondary/60 border border-transparent",
                (!hasClasses || isPast) && "opacity-30 cursor-not-allowed",
                isToday && !isSelected && "ring-1 ring-primary/40"
              )}
            >
              <span
                className={cn(
                  "font-body text-sm",
                  isSelected ? "text-primary font-semibold" : "text-foreground"
                )}
              >
                {d.getDate()}
              </span>
              {hasClasses && (
                <span
                  className={cn(
                    "font-body text-[9px] tracking-wider",
                    info!.hasSpots ? "text-primary" : "text-accent"
                  )}
                >
                  {info!.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-body tracking-wider uppercase text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent" /> Full
        </span>
      </div>
    </div>
  );
};

export default MonthCalendar;
