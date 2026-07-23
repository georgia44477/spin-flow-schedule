import { describe, it, expect } from "vitest";
import { buildSchedule, timeBucket, type DbClass } from "@/lib/schedule";

const makeClass = (over: Partial<DbClass>): DbClass => ({
  id: over.id ?? "c1",
  title: "Foundations",
  instructor: "Luna",
  description: "",
  level: "Foundations",
  starts_at: over.starts_at ?? new Date().toISOString(),
  duration_minutes: 60,
  spots_total: 8,
  drop_in_price: 30,
  pass_price: 25,
  subscription_price: 20,
  ...over,
});

describe("timeBucket", () => {
  it("classifies morning / afternoon / evening", () => {
    expect(timeBucket("07:30")).toBe("morning");
    expect(timeBucket("11:59")).toBe("morning");
    expect(timeBucket("12:00")).toBe("afternoon");
    expect(timeBucket("16:59")).toBe("afternoon");
    expect(timeBucket("17:00")).toBe("evening");
    expect(timeBucket("20:30")).toBe("evening");
  });
});

describe("buildSchedule", () => {
  it("produces `days` day entries, keyed by local date", () => {
    const s = buildSchedule([], {}, new Date("2026-01-15T10:00:00Z"), 3);
    expect(s).toHaveLength(3);
    expect(s[0].classes).toEqual([]);
  });

  it("places a class in the correct day and injects the confirmed count", () => {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const classes = [makeClass({ id: "a", starts_at: start.toISOString() })];
    const s = buildSchedule(classes, { a: 3 }, start, 2);
    expect(s[0].classes).toHaveLength(1);
    expect(s[0].classes[0].spotsTaken).toBe(3);
    expect(s[1].classes).toHaveLength(0);
  });

  it("defaults booking count to 0 when the class has no bookings", () => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const s = buildSchedule([makeClass({ id: "x", starts_at: start.toISOString() })], {}, start, 1);
    expect(s[0].classes[0].spotsTaken).toBe(0);
  });
});
