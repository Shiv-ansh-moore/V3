const OPEN_AGE_THRESHOLD_HOURS = 24;
const OPEN_AGE_DAY_THRESHOLD_HOURS = 72;
const MS_PER_HOUR = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;

export function getGoalOpenAgeLabel(
  createdAt: string,
  nowMs: number,
): string | null {
  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return null;

  const elapsedHours = Math.floor((nowMs - createdAtMs) / MS_PER_HOUR);
  if (elapsedHours < OPEN_AGE_THRESHOLD_HOURS) return null;

  if (elapsedHours >= OPEN_AGE_DAY_THRESHOLD_HOURS) {
    return `-${Math.floor(elapsedHours / HOURS_PER_DAY)}d`;
  }

  return `-${elapsedHours}h`;
}
