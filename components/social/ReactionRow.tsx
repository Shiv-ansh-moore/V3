import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { Reaction } from "../../testData/mockSocial";

const CURRENT_USER = "u1";

interface ReactionRowProps {
  reactions: Reaction[];
  centred?: boolean;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  isMine: boolean;
}

function groupReactions(reactions: Reaction[]): GroupedReaction[] {
  const map = new Map<string, { count: number; isMine: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count++;
      if (r.userId === CURRENT_USER) existing.isMine = true;
    } else {
      map.set(r.emoji, { count: 1, isMine: r.userId === CURRENT_USER });
    }
  }
  return Array.from(map, ([emoji, { count, isMine }]) => ({
    emoji,
    count,
    isMine,
  }));
}

export default function ReactionRow({ reactions, centred }: ReactionRowProps) {
  if (!reactions || reactions.length === 0) return null;

  const grouped = groupReactions(reactions);

  return (
    <View style={[styles.row, centred && styles.rowCentred]}>
      {grouped.map((g) => (
        <View key={g.emoji} style={[styles.pill, g.isMine && styles.pillMine]}>
          <Text style={styles.emoji}>{g.emoji}</Text>
          <Text style={[styles.count, g.isMine && styles.countMine]}>
            {g.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  rowCentred: {
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#262626",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  pillMine: {
    borderColor: Colours.brand,
    backgroundColor: "rgba(255, 106, 0, 0.08)",
  },
  emoji: {
    fontSize: 13,
  },
  count: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
    marginLeft: 4,
  },
  countMine: {
    color: Colours.brand,
  },
});
