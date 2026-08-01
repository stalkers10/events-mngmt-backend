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
  const start = new Date(startTime);
  const end = new Date(endTime);
  const referenceNow = now.getTime();

  const eventStartDay = new Date(start);
  const currentDay = new Date(now);
  eventStartDay.setHours(0, 0, 0, 0);
  currentDay.setHours(0, 0, 0, 0);

  if (isEventExpired(startTime, endTime, now)) return 'past';
  if (eventStartDay.getTime() < currentDay.getTime()) return 'past';
  if (eventStartDay.getTime() > currentDay.getTime()) return 'upcoming';
  if (end.getTime() < referenceNow) return 'past';
  if (start.getTime() <= referenceNow && end.getTime() >= referenceNow) return 'live';
  return 'upcoming';
}
