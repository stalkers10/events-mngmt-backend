import { isEventExpired, isEventVisible, normalizeEventRecord, normalizeRoomIds } from './events.service';

describe('room id normalization', () => {
  it('falls back to the primary room when room_ids is missing', () => {
    const event = normalizeEventRecord({
      id: 'event-1',
      room_id: 'room-1',
      name: 'Launch',
      start_time: new Date('2025-01-01T10:00:00.000Z'),
      end_time: new Date('2025-01-01T12:00:00.000Z'),
      created_at: new Date('2025-01-01T09:00:00.000Z'),
    });

    expect(event.room_ids).toEqual(['room-1']);
  });

  it('parses room_ids from a JSON string payload', () => {
    expect(normalizeRoomIds('["room-1","room-2"]', 'room-3')).toEqual(['room-1', 'room-2']);
  });
});

describe('event visibility helpers', () => {
  it('considers an event visible until 30 minutes after its end time', () => {
    const now = new Date('2026-08-04T12:00:00Z');
    expect(isEventExpired('2026-08-04T11:00:00Z', now)).toBe(false);
    expect(isEventVisible('2026-08-04T11:00:00Z', now)).toBe(true);
  });

  it('considers an event expired after the grace period ends', () => {
    const now = new Date('2026-08-04T12:31:00Z');
    expect(isEventExpired('2026-08-04T11:00:00Z', now)).toBe(true);
    expect(isEventVisible('2026-08-04T11:00:00Z', now)).toBe(false);
  });
});
