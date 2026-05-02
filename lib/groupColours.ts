export const GROUP_USER_COLOURS = [
  "#FF6B6B",
  "#4ECDC4",
  "#A78BFA",
  "#F778BA",
  "#FFCA28",
  "#69F0AE",
  "#7DD3FC",
];

type GroupMember = {
  user_id: string;
  joined_at: string;
};

export function buildGroupColourMap(members: GroupMember[]) {
  const sorted = [...members].sort(
    (a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );

  return Object.fromEntries(
    sorted.map((member, index) => [
      member.user_id,
      GROUP_USER_COLOURS[index % GROUP_USER_COLOURS.length],
    ]),
  );
}
