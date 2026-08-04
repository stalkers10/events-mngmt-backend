export type EventState = 'live' | 'upcoming' | 'past';

const EVENT_GRACE_MINUTES = 30;

export function isEventExpired(startTime: string | Date, endTime: string | Date, now: Date = new Date(), graceMinutes = EVENT_GRACE_MINUTES): boolean {
  const end = new Date(endTime).getTime();
  const expiryTime = end + graceMinutes * 60 * 1000;
  return expiryTime < now.getTime();
}

export function isEventVisible(startTime: string | Date, endTime: string | Date, now: Date = new Date(), graceMinutes = EVENT_GRACE_MINUTES): boolean {
  return !isEventExpired(startTime, endTime, now, graceMinutes);
}

export function getEventState(startTime: string | Date, endTime: string | Date, now: Date = new Date()): EventState {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const referenceNow = now.getTime();

  if (isEventExpired(startTime, endTime, now)) return 'past';
  if (referenceNow < start) return 'upcoming';
  if (referenceNow >= start && referenceNow <= end) return 'live';
  return 'past';
}
