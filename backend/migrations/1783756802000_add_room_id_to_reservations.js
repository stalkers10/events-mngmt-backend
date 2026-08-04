/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Room the invitee is seated in (per-reservation, for multi-room events).
  // Nullable: if unset, the ticket falls back to the event's primary room.
  pgm.addColumn('reservations', {
    room_id: {
      type: 'uuid',
      references: 'rooms',
      onDelete: 'SET NULL'
    }
  });

  pgm.createIndex('reservations', ['room_id']);
};

exports.down = (pgm) => {
  pgm.dropIndex('reservations', 'reservations_room_id_index');
  pgm.dropColumn('reservations', 'room_id');
};
