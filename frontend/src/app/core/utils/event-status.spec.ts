import { getEventState } from './event-status';

describe('getEventState', () => {
  it('marks an event as past when its scheduled day has already passed', () => {
    const now = new Date('2026-08-01T10:00:00Z');
    expect(getEventState('2026-07-31T09:00:00Z', '2026-08-07T09:00:00Z', now)).toBe('past');
  });

  it('marks an event as live when it is currently active on its scheduled day', () => {
    const now = new Date('2026-08-01T10:00:00Z');
    expect(getEventState('2026-08-01T08:00:00Z', '2026-08-01T18:00:00Z', now)).toBe('live');
  });

  it('marks an event as upcoming when it has not started yet', () => {
    const now = new Date('2026-08-01T10:00:00Z');
    expect(getEventState('2026-08-02T08:00:00Z', '2026-08-02T18:00:00Z', now)).toBe('upcoming');
  });
});
