import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type TimeOfDay = "morning" | "afternoon" | "evening";
export interface FilterState {
  levels: string[];
  instructors: string[];
  times: TimeOfDay[];
}

interface ClassFiltersProps {
  allLevels: string[];
  allInstructors: string[];
  value: FilterState;
  onChange: (next: FilterState) => void;
}

const TIME_OPTIONS: { key: TimeOfDay; label: string; hint: string }[] = [
  { key: "morning", label: "Morning", hint: "before 12" },
  { key: "afternoon", label: "Afternoon", hint: "12–5pm" },
  { key: "evening", label: "Evening", hint: "after 5" },
];

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "font-body text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full border transition-all",
      active
        ? "bg-primary/15 border-primary text-primary"
        : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
    )}
  >
    {children}
  </button>
);

const ClassFilters = ({ allLevels, allInstructors, value, onChange }: ClassFiltersProps) => {
  const toggle = <K extends keyof FilterState>(key: K, item: FilterState[K][number]) => {
    const arr = value[key] as string[];
    const next = arr.includes(item as string)
      ? arr.filter((x) => x !== item)
      : [...arr, item as string];
    onChange({ ...value, [key]: next } as FilterState);
  };

  const clearAll = () =>
    onChange({ levels: [], instructors: [], times: [] });

  const activeCount = value.levels.length + value.instructors.length + value.times.length;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Filters
        </span>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 font-body text-[10px] tracking-wider uppercase text-accent hover:text-accent/70"
          >
            <X className="w-3 h-3" /> Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-body text-[10px] tracking-wider uppercase text-muted-foreground/60 mr-1">
          Level
        </span>
        {allLevels.map((lvl) => (
          <Chip key={lvl} active={value.levels.includes(lvl)} onClick={() => toggle("levels", lvl)}>
            {lvl}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-body text-[10px] tracking-wider uppercase text-muted-foreground/60 mr-1">
          Time
        </span>
        {TIME_OPTIONS.map((t) => (
          <Chip key={t.key} active={value.times.includes(t.key)} onClick={() => toggle("times", t.key)}>
            {t.label} <span className="opacity-50 normal-case tracking-normal">· {t.hint}</span>
          </Chip>
        ))}
      </div>

      {allInstructors.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-[10px] tracking-wider uppercase text-muted-foreground/60 mr-1">
            Instructor
          </span>
          {allInstructors.map((i) => (
            <Chip key={i} active={value.instructors.includes(i)} onClick={() => toggle("instructors", i)}>
              {i}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassFilters;
