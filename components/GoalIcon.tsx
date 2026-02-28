import React from "react";
import {
  Barbell,
  MusicNote,
  BookOpen,
  Code,
  FilmSlate,
  Shower,
  Flower,
  InstagramLogo,
  TiktokLogo,
} from "phosphor-react-native";
import type { IconWeight } from "phosphor-react-native";

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string; weight?: IconWeight }>> = {
  Barbell,
  MusicNote,
  BookOpen,
  Code,
  FilmSlate,
  Shower,
  Flower,
  InstagramLogo,
  TiktokLogo,
};

interface GoalIconProps {
  name: string;
  size?: number;
  color?: string;
  weight?: IconWeight;
}

export default function GoalIcon({
  name,
  size = 24,
  color = "#b24a00",
  weight = "light",
}: GoalIconProps) {
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} weight={weight} />;
}
