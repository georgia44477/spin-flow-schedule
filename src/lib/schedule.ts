import { format } from "date-fns";
import type { DaySchedule, StudioClass } from "@/data/classes";

export interface DbClass {
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

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Build the day-by-day schedule from raw class rows and confirmed-booking counts.
 * Pure function — safe to unit-test.
 */
export function buildSchedule(
  dbClasses: DbClass[],
  bookingCounts: Record<string, number>,
  fromDate: Date,
  days: number
): DaySchedule[] {
  const out: DaySchedule[] = [];
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86_400_000;
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
    out.push({
      date: d,
      dayLabel: `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      classes: dayClasses,
    });
  }
  return out;
}

export type TimeOfDay = "morning" | "afternoon" | "evening";

export function timeBucket(time: string): TimeOfDay {
  const h = parseInt(time.split(":")[0], 10);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
