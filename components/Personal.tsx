import { StyleSheet, Text, View, ScrollView } from "react-native";
import React from "react";
import { mockGoals, Goal } from "../testData/mockGoals";
import GoalTile from "./GoalTile";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

type GoalRow =
  | { type: "pair"; items: [Goal, Goal] }
  | { type: "single"; item: Goal };

function buildRows(goals: Goal[]): GoalRow[] {
  const rows: GoalRow[] = [];
  let i = 0;
  while (i < goals.length) {
    const current = goals[i];
    if (current.size === "large") {
      rows.push({ type: "single", item: current });
      i++;
    } else {
      const next = goals[i + 1];
      if (next && next.size === "small") {
        rows.push({ type: "pair", items: [current, next] });
        i += 2;
      } else {
        rows.push({ type: "single", item: current });
        i++;
      }
    }
  }
  return rows;
}

export default function Personal() {
  const activeGoals = mockGoals.filter((g) => g.status === "active");
  const doneGoals = mockGoals.filter((g) => g.status === "done");
  const rows = buildRows(activeGoals);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      {rows.map((row, idx) => (
        <View key={idx} style={styles.row}>
          {row.type === "pair" ? (
            <>
              <GoalTile
                icon={row.items[0].icon}
                title={row.items[0].title}
                duration={row.items[0].duration}
                status={row.items[0].status}
                size={row.items[0].size}
              />
              <GoalTile
                icon={row.items[1].icon}
                title={row.items[1].title}
                duration={row.items[1].duration}
                status={row.items[1].status}
                size={row.items[1].size}
              />
            </>
          ) : (
            <GoalTile
              icon={row.item.icon}
              title={row.item.title}
              duration={row.item.duration}
              status={row.item.status}
              size={row.item.size}
            />
          )}
        </View>
      ))}

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>DONE TODAY</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.row}>
        {doneGoals.map((goal) => (
          <GoalTile
            key={goal.id}
            icon={goal.icon}
            title={goal.title}
            duration={goal.duration}
            status={goal.status}
            size={goal.size}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 19,
    paddingBottom: 24,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colours.card,
  },
  dividerText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colours.secondaryText,
  },
});
