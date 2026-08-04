import { resolveReservationRoom } from './reservations.service';

describe('resolveReservationRoom', () => {
  const eventRoomIds = ['room-1', 'room-2'];
  const primaryRoomId = 'room-1';

  it('uses a provided room when it is part of the event', () => {
    expect(resolveReservationRoom(eventRoomIds, primaryRoomId, 'room-2')).toBe('room-2');
  });

  it('falls back to the primary room when no room is provided', () => {
    expect(resolveReservationRoom(eventRoomIds, primaryRoomId, undefined)).toBe('room-1');
    expect(resolveReservationRoom(eventRoomIds, primaryRoomId, null)).toBe('room-1');
    expect(resolveReservationRoom(eventRoomIds, primaryRoomId, '')).toBe('room-1');
  });

  it('rejects a room that is not part of the event', () => {
    expect(() => resolveReservationRoom(eventRoomIds, primaryRoomId, 'room-3')).toThrow(
      'Selected room is not part of this event'
    );
  });

  it('rejects a non-member room even when it is the primary (single-room edge case)', () => {
    expect(() => resolveReservationRoom(['room-1'], 'room-1', 'room-9')).toThrow();
  });
});
