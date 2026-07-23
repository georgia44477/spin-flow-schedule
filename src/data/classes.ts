export interface StudioClass {
  id: string;
  title: string;
  instructor: string;
  time: string;
  duration: string;
  level: "Intro" | "Foundations" | "Intermediate" | "Advanced" | "All Levels";
  spotsTotal: number;
  spotsTaken: number;
  description: string;
  dropInPrice: number;
  passPrice: number;
  subscriptionPrice: number;
}

export interface DaySchedule {
  date: Date;
  dayLabel: string;
  classes: StudioClass[];
}
