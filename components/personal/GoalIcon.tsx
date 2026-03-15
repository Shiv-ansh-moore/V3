import React from "react";
import {
  BarbellIcon,
  MusicNoteIcon,
  BookOpenIcon,
  CodeIcon,
  FilmSlateIcon,
  ShowerIcon,
  FlowerIcon,
  InstagramLogoIcon,
  TiktokLogoIcon,
} from "phosphor-react-native";
import type { IconWeight } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";

export const iconMap: Record<
  string,
  React.ComponentType<{ size?: number; color?: string; weight?: IconWeight }>
> = {
  BarbellIcon,
  MusicNoteIcon,
  BookOpenIcon,
  CodeIcon,
  FilmSlateIcon,
  ShowerIcon,
  FlowerIcon,
  InstagramLogoIcon,
  TiktokLogoIcon,
};

interface GoalIconProps {
  name: string;
  size?: number;
  color?: string;
  weight?: IconWeight;
}

export default function GoalIcon({
  name,
  size = 40,
  color = Colours.fadedBrand,
  weight = "light",
}: GoalIconProps) {
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} weight={weight} />;
}
