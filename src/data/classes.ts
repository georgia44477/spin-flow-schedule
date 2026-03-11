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

export interface Accessory {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export const accessories: Accessory[] = [
  { id: "grip-1", name: "Mighty Grip Powder", price: 14, image: "✋", description: "Essential grip aid for spins" },
  { id: "grip-2", name: "iTac2 Pole Grip", price: 18, image: "🧴", description: "Extra-strength adhesive grip" },
  { id: "knee-1", name: "Knee Pads (Pair)", price: 28, image: "🦵", description: "Cushioned floorwork pads" },
  { id: "shorts-1", name: "Pole Shorts", price: 32, image: "👟", description: "High-waist grip shorts" },
  { id: "cleaner-1", name: "Pole Cleaner Spray", price: 12, image: "✨", description: "Antibacterial pole cleaner" },
];

export const discountCodes: Record<string, number> = {
  "FIRST10": 10,
  "POLE20": 20,
  "STUDIO15": 15,
  "WELCOME": 25,
};

function generateClasses(date: Date): StudioClass[] {
  const day = date.getDay();
  if (day === 0) return []; // Sunday off

  const classTemplates: StudioClass[] = [
    {
      id: "", title: "Pole Foundations", instructor: "Luna Reyes",
      time: "09:00", duration: "60 min", level: "Intro",
      spotsTotal: 12, spotsTaken: Math.floor(Math.random() * 12),
      description: "Build strength and confidence with basic spins, climbs, and floor transitions.",
      dropInPrice: 28, passPrice: 22, subscriptionPrice: 18,
    },
    {
      id: "", title: "Sensual Flow", instructor: "Mia Chen",
      time: "11:00", duration: "75 min", level: "All Levels",
      spotsTotal: 10, spotsTaken: Math.floor(Math.random() * 10),
      description: "Fluid choreography blending contemporary dance with pole technique.",
      dropInPrice: 32, passPrice: 26, subscriptionPrice: 20,
    },
    {
      id: "", title: "Strength & Invert", instructor: "Kai Morales",
      time: "17:30", duration: "60 min", level: "Intermediate",
      spotsTotal: 8, spotsTaken: Math.floor(Math.random() * 8),
      description: "Inversions, holds, and conditioning for aerial tricks.",
      dropInPrice: 30, passPrice: 24, subscriptionPrice: 19,
    },
    {
      id: "", title: "Exotic Heels", instructor: "Sasha Noir",
      time: "19:00", duration: "75 min", level: "Foundations",
      spotsTotal: 10, spotsTaken: Math.floor(Math.random() * 10),
      description: "Dance in heels with sultry combos and floorwork.",
      dropInPrice: 34, passPrice: 28, subscriptionPrice: 22,
    },
    {
      id: "", title: "Advanced Combos", instructor: "Luna Reyes",
      time: "20:30", duration: "90 min", level: "Advanced",
      spotsTotal: 6, spotsTaken: Math.floor(Math.random() * 6),
      description: "Complex sequences linking aerial tricks with dynamic transitions.",
      dropInPrice: 38, passPrice: 30, subscriptionPrice: 24,
    },
  ];

  // Different classes per day
  const dayClasses: Record<number, number[]> = {
    1: [0, 1, 2, 3],    // Mon
    2: [0, 2, 4],        // Tue
    3: [1, 2, 3],        // Wed
    4: [0, 1, 3, 4],     // Thu
    5: [0, 2, 3],        // Fri
    6: [1, 3],           // Sat
  };

  const indices = dayClasses[day] || [0, 1];
  const dateStr = date.toISOString().split("T")[0];

  return indices.map((i) => ({
    ...classTemplates[i],
    id: `${dateStr}-${i}`,
    spotsTaken: Math.floor(Math.random() * classTemplates[i].spotsTotal),
  }));
}

export function generateSchedule(startDate: Date, days: number): DaySchedule[] {
  const schedule: DaySchedule[] = [];
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    schedule.push({
      date,
      dayLabel: `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`,
      classes: generateClasses(date),
    });
  }
  return schedule;
}
