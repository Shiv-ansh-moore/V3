import React from "react";
import {
  Dumbbell,
  Guitar,
  BookOpen,
  Code,
  Clapperboard,
  ShowerHead,
  Flower2,
  Instagram,
  Music2,
} from "lucide-react-native";
import type { LucideProps } from "lucide-react-native";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Barbell: Dumbbell,
  MusicNote: Guitar,
  BookOpen,
  Code,
  FilmSlate: Clapperboard,
  Shower: ShowerHead,
  Flower: Flower2,
  InstagramLogo: Instagram,
  TiktokLogo: Music2,
};

interface GoalIconLucideProps {
  name: string;
  size?: number;
  color?: string;
}

export default function GoalIconLucide({
  name,
  size = 24,
  color = "#b24a00",
}: GoalIconLucideProps) {
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} />;
}
