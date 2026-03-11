import { DaySchedule } from "@/data/classes";
import { cn } from "@/lib/utils";

interface DateScrubberProps {
  schedule: DaySchedule[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const DateScrubber = ({ schedule, selectedIndex, onSelect }: DateScrubberProps) => {
  return (
    <div className="flex flex-col gap-1">
      {schedule.map((day, i) => {
        const isSelected = i === selectedIndex;
        const hasClasses = day.classes.length > 0;
        const parts = day.dayLabel.split(" ");

        if (!hasClasses) {
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className="flex items-center gap-3 py-1 px-3 opacity-30 hover:opacity-50 transition-opacity"
            >
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="font-body text-xs text-muted-foreground tracking-wider">{parts[0]}</span>
            </button>
          );
        }

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              "flex items-center gap-3 py-3 px-3 rounded-sm transition-all duration-300 text-left group",
              isSelected
                ? "bg-secondary"
                : "hover:bg-secondary/50"
            )}
          >
            <div className={cn(
              "w-1.5 h-8 rounded-full transition-colors",
              isSelected ? "bg-primary" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
            )} />
            <div className="flex flex-col">
              <span className={cn(
                "font-body text-[10px] tracking-[0.2em] uppercase transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {parts[0]}
              </span>
              <span className={cn(
                "font-display text-lg leading-tight transition-colors",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {parts[1]}
              </span>
              <span className={cn(
                "font-body text-[10px] tracking-wider transition-colors",
                isSelected ? "text-foreground/70" : "text-muted-foreground/50"
              )}>
                {parts[2]}
              </span>
            </div>
            {isSelected && (
              <span className="ml-auto font-body text-xs text-muted-foreground">
                {day.classes.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DateScrubber;
