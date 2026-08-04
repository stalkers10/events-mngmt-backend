/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Each event table now belongs to a specific room (for multi-room events).
  pgm.addColumn('tables', {
    room_id: { type: 'uuid', references: 'rooms', onDelete: 'RESTRICT' }
  });

  // Backfill existing tables from their event's primary room.
  pgm.sql(`
    UPDATE tables t
    SET room_id = e.room_id
    FROM events e
    WHERE t.event_id = e.id AND t.room_id IS NULL;
  `);

  pgm.alterColumn('tables', 'room_id', { notNull: true });

  // Table numbering restarts per room, so uniqueness is per (event, room, table).
  pgm.dropConstraint('tables', 'tables_event_table_number_unique');
  pgm.addConstraint('tables', 'tables_event_room_table_number_unique', {
    unique: ['event_id', 'room_id', 'table_number'],
  });

  pgm.createIndex('tables', ['room_id']);
};

exports.down = (pgm) => {
  pgm.dropIndex('tables', 'tables_room_id_idx');
  pgm.dropConstraint('tables', 'tables_event_room_table_number_unique');
  pgm.addConstraint('tables', 'tables_event_table_number_unique', {
    unique: ['event_id', 'table_number'],
  });
  pgm.dropColumn('tables', 'room_id');
};
