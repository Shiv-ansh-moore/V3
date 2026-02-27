export interface Goal {
  id: string;
  icon: string;
  title: string;
  duration?: string;
  status: "active" | "done";
  size: "small" | "large";
}

export const mockGoals: Goal[] = [
  { id: "1", icon: "🏋️", title: "Gym", status: "active", size: "small" },
  { id: "2", icon: "🎸", title: "Guitar", duration: "30 min", status: "active", size: "small" },
  { id: "3", icon: "📖", title: "Reading", duration: "30 min", status: "active", size: "large" },
  { id: "4", icon: "💻", title: "App Dev", duration: "90 min", status: "active", size: "small" },
  { id: "5", icon: "🎬", title: "Movie with Sarah", status: "active", size: "small" },
  { id: "6", icon: "🚿", title: "Cold shower", status: "done", size: "small" },
  { id: "7", icon: "🧘", title: "Meditate", status: "done", size: "small" },
];
