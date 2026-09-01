export type EventState = 'live' | 'upcoming' | 'past' | 'draft';

const EVENT_GRACE_MINUTES = 30;

export function isEventExpired(
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined,
  now: Date = new Date(),
  graceMinutes = EVENT_GRACE_MINUTES
): boolean {
  if (!endTime) return false; // drafts with no end_time are never expired
  const end = new Date(endTime).getTime();
  const expiryTime = end + graceMinutes * 60 * 1000;
  return expiryTime < now.getTime();
}

export function isEventVisible(
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined,
  now: Date = new Date(),
  graceMinutes = EVENT_GRACE_MINUTES
): boolean {
  // Drafts (no end_time) are always "visible" in the list
  if (!endTime) return true;
  return !isEventExpired(startTime, endTime, now, graceMinutes);
}

export function getEventState(
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined,
  status?: string,
  now: Date = new Date()
): EventState {
  // Explicit draft status always wins
  if (status === 'DRAFT') return 'draft';
  // If no dates, treat as draft regardless of status field
  if (!startTime || !endTime) return 'draft';

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const referenceNow = now.getTime();

  if (isEventExpired(startTime, endTime, now)) return 'past';
  if (referenceNow < start) return 'upcoming';
  if (referenceNow >= start && referenceNow <= end) return 'live';
  return 'past';
}
