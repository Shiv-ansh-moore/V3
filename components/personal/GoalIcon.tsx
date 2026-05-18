import React from "react";
import type { IconWeight } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { fallbackGoalIconName, iconMap } from "./goalIconCatalog";

export { iconMap } from "./goalIconCatalog";

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
  const IconComponent = iconMap[name] ?? iconMap[fallbackGoalIconName];
  return <IconComponent size={size} color={color} weight={weight} />;
}
