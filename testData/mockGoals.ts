export interface Goal {
  id: string;
  icon: string;
  title: string;
  duration?: string;
  status: "active" | "done";
}

export const mockGoals: Goal[] = [
  {
    id: "1",
    icon: "BarbellIcon",
    title: "Gym",
    status: "active",
  },
  {
    id: "2",
    icon: "MusicNoteIcon",
    title: "Guitar",
    duration: "30 min",
    status: "active",
  },
  {
    id: "3",
    icon: "BookOpenIcon",
    title: "Reading",
    duration: "30 min",
    status: "active",
  },
  {
    id: "4",
    icon: "CodeIcon",
    title: "App Dev",
    duration: "90 min",
    status: "active",
  },
  {
    id: "5",
    icon: "FilmSlateIcon",
    title: "Movie with Sarah",
    status: "active",
  },
  {
    id: "6",
    icon: "ShowerIcon",
    title: "Cold shower",
    status: "done",
  },
  { id: "7", icon: "FlowerIcon", title: "Meditate", status: "done" },
];
