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

  return getElapsedAgeLabel(nowMs - createdAtMs);
}

export function getProofLateLabel(
  goalCreatedAt: string | null | undefined,
  submittedAt: string | null | undefined,
): string | null {
  if (!goalCreatedAt || !submittedAt) return null;

  const createdAtMs = new Date(goalCreatedAt).getTime();
  const submittedAtMs = new Date(submittedAt).getTime();
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(submittedAtMs)) {
    return null;
  }

  return getElapsedAgeLabel(submittedAtMs - createdAtMs);
}

function getElapsedAgeLabel(elapsedMs: number): string | null {
  const elapsedHours = Math.floor(elapsedMs / MS_PER_HOUR);
  if (elapsedHours < OPEN_AGE_THRESHOLD_HOURS) return null;

  if (elapsedHours >= OPEN_AGE_DAY_THRESHOLD_HOURS) {
    return `-${Math.floor(elapsedHours / HOURS_PER_DAY)}d`;
  }

  return `-${elapsedHours}h`;
}
