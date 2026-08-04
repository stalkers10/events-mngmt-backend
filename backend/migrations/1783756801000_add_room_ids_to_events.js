/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('events', {
    room_ids: { type: 'jsonb', notNull: false, default: null }
  });

  pgm.createIndex('events', ['room_ids'], { method: 'gin' });

  pgm.sql(`
    UPDATE events
    SET room_ids = jsonb_build_array(room_id)
    WHERE room_ids IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('events', 'events_room_ids_idx');
  pgm.dropColumn('events', 'room_ids');
};
