export interface MentionMember {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl?: string | null;
  colour?: string;
}

export interface MessageMention {
  user_id: string;
  username: string;
  display_name: string;
  start: number;
  end: number;
}

export interface MentionTrigger {
  start: number;
  query: string;
}

const USERNAME_BOUNDARY_RE = /[A-Za-z0-9_]/;

function isUsernameBoundaryChar(value: string | undefined): boolean {
  return Boolean(value && USERNAME_BOUNDARY_RE.test(value));
}

function normaliseUsername(value: string | null | undefined): string | null {
  const username = value?.trim();
  return username ? username : null;
}

function rangeIsAvailable(occupied: boolean[], start: number, end: number) {
  for (let index = start; index < end; index += 1) {
    if (occupied[index]) return false;
  }

  return true;
}

function occupyRange(occupied: boolean[], start: number, end: number) {
  for (let index = start; index < end; index += 1) {
    occupied[index] = true;
  }
}

export function getMentionTrigger(
  text: string,
  cursor: number,
): MentionTrigger | null {
  const clampedCursor = Math.max(0, Math.min(cursor, text.length));

  for (let index = clampedCursor - 1; index >= 0; index -= 1) {
    const char = text[index];

    if (/\s/.test(char)) return null;
    if (char !== "@") continue;

    const previous = text[index - 1];
    if (previous && isUsernameBoundaryChar(previous)) return null;

    const query = text.slice(index + 1, clampedCursor);
    if (query.includes("@")) return null;

    return {
      start: index,
      query,
    };
  }

  return null;
}

export function parseMessageMentions(
  text: string,
  members: MentionMember[],
): MessageMention[] {
  const lowerText = text.toLowerCase();
  const occupied = Array.from({ length: text.length }, () => false);
  const mentions: MessageMention[] = [];
  const candidates = members
    .map((member) => ({
      ...member,
      username: normaliseUsername(member.username),
    }))
    .filter(
      (member): member is MentionMember & { username: string } =>
        member.username !== null,
    )
    .sort((a, b) => b.username.length - a.username.length);

  for (const member of candidates) {
    const marker = `@${member.username.toLowerCase()}`;
    let start = lowerText.indexOf(marker);

    while (start !== -1) {
      const end = start + marker.length;
      const previous = text[start - 1];
      const next = text[end];
      const hasBoundaryBefore =
        start === 0 || !isUsernameBoundaryChar(previous);
      const hasBoundaryAfter =
        end === text.length || !isUsernameBoundaryChar(next);

      if (
        hasBoundaryBefore &&
        hasBoundaryAfter &&
        rangeIsAvailable(occupied, start, end)
      ) {
        mentions.push({
          user_id: member.id,
          username: member.username,
          display_name: member.displayName.trim() || member.username,
          start,
          end,
        });
        occupyRange(occupied, start, end);
      }

      start = lowerText.indexOf(marker, end);
    }
  }

  return mentions.sort((a, b) => a.start - b.start);
}

export function coerceMessageMentions(
  value: unknown,
  text?: string,
): MessageMention[] {
  if (!Array.isArray(value)) return [];

  const textLength = text?.length;
  const mentions: MessageMention[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const entity = item as Record<string, unknown>;
    const userId = entity.user_id;
    const username = entity.username;
    const displayName = entity.display_name;
    const start = entity.start;
    const end = entity.end;

    if (
      typeof userId !== "string" ||
      typeof username !== "string" ||
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end <= start ||
      (textLength !== undefined && end > textLength)
    ) {
      continue;
    }

    mentions.push({
      user_id: userId,
      username,
      display_name:
        typeof displayName === "string" && displayName.trim()
          ? displayName
          : username,
      start,
      end,
    });
  }

  return mentions.sort((a, b) => a.start - b.start);
}
