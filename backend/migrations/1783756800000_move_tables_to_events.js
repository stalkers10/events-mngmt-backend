/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // If there are existing tables, this will fail unless we clear them out since we're adding a NOT NULL column without a default.
  // Since this is early development, let's just wipe tables and chairs.
  pgm.sql('DELETE FROM chairs');
  pgm.sql('DELETE FROM tables');

  // 1. Remove table constraints & room_id
  pgm.dropConstraint('tables', 'tables_room_table_number_unique');
  pgm.dropColumn('tables', 'room_id', { cascade: true }); // cascade drops any dependent views etc, though none should exist

  // 2. Add event_id referencing events
  pgm.addColumn('tables', {
    event_id: { type: 'uuid', notNull: true, references: 'events', onDelete: 'CASCADE' }
  });

  // 3. Add new unique constraint (table number must be unique within an event)
  pgm.addConstraint('tables', 'tables_event_table_number_unique', {
    unique: ['event_id', 'table_number'],
  });
};

exports.down = (pgm) => {
  pgm.sql('DELETE FROM chairs');
  pgm.sql('DELETE FROM tables');

  pgm.dropConstraint('tables', 'tables_event_table_number_unique');
  pgm.dropColumn('tables', 'event_id', { cascade: true });
  
  pgm.addColumn('tables', {
    room_id: { type: 'uuid', notNull: true, references: 'rooms', onDelete: 'CASCADE' }
  });
  
  pgm.addConstraint('tables', 'tables_room_table_number_unique', {
    unique: ['room_id', 'table_number'],
  });
};
